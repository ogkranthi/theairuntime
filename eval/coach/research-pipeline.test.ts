import {it,expect} from 'vitest';
import {mkdtemp,rm,stat,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {Miniflare} from 'miniflare';
import {digest,makeDataset,compareRuns,reviewSql,redactionSql,privatePath,writePrivate,checkReview,purgePrivateArtifacts,membershipSql,snapshotRows,SNAPSHOT_SQL} from '../../scripts/lib/research-dataset.mjs';
const now=1_800_000_000_000,day=86_400_000;
const review=()=>({privacyApproved:true,promotionApproved:true,reviewedAt:now-500,reviewerRef:'reviewer-synthetic',evaluationVersion:'synthetic-eval-v1',correction:'Clarify the operation boundary.',referenceAnswer:'Keep a stable operation key across delivery attempts.',expectedAssertions:['stable operation key'],teachingCriteria:['One focused question','A practical duplicate-request test'],errorCategories:['vague_next_step'],technicalAccuracy:3,coachingQuality:3});
const row=()=>({id:'a'.repeat(64),participant:'00000000-0000-4000-8000-000000000001',payload:{question:'How do safe retries work in a fictional API?',context:[],learningGoal:'Explain system design',skillCategory:'skills',sourceIds:['asd-03'],model:'synthetic-model',promptVersion:'synthetic-prompt',retrievalVersion:'synthetic-retrieval',redactionVersion:'research-redaction-v1',feedback:'helpful',explicitlyReportedOutcome:null},originalResponse:'The original fictional model response is kept separately.',createdAt:now-day,expiresAt:now+day,state:'reviewed',consentActive:true,review:review()});
const snapshot=()=>({schema:'private-coach-snapshot-v1',snapshotAt:now,validUntil:now+15*60_000,records:[row()]});
it('promotes only fresh, consented human-reviewed examples with originals and corrections separate',()=>{
 const s=snapshot(),data=makeDataset(s,'synthetic-private-v1','synthetic-digest',now);
 expect(data.examples[0].originalResponse).not.toBe(data.examples[0].referenceAnswer);expect(data.examples[0].reviewerCorrection).toBe(s.records[0].review.correction);
 expect(data).toMatchObject({publicationAllowed:false,trainingAllowed:false,scientificallyValidated:false,automatedGrading:'provisional-until-human-reviewed'});expect(data.syntheticBaseline.count).toBe(40);
 for(const mutate of [(v:any)=>v.records[0].state='pending',(v:any)=>v.records[0].review.privacyApproved=false,(v:any)=>v.records[0].consentActive=false,(v:any)=>v.records[0].expiresAt=now-1,(v:any)=>v.validUntil=now]){const bad=snapshot();mutate(bad);expect(()=>makeDataset(bad,'test','digest',now)).toThrow();}
});
it('rejects identifiers in original/reference content and incomplete human reviews',()=>{
 const s=snapshot();s.records[0].review.referenceAnswer='Contact alice@example.invalid';expect(()=>makeDataset(s,'test','digest',now)).toThrow(/identifiers/);
 expect(()=>checkReview({...review(),expectedAssertions:[]})).toThrow();
});
it('compares model/prompt variants against the same cases and labels automated scores provisional',()=>{
 const s=snapshot(),data=makeDataset(s,'synthetic-private-v1','digest',now);
 const run=(model:string,answer:string)=>({schema:'private-coach-run-v1',expiresAt:data.expiresAt,datasetDigest:data.digest,model,promptVersion:model+'-prompt',retrievalVersion:'synthetic-retrieval',results:[{id:data.examples[0].id,answer,sourceIds:['asd-03'],latencyMs:120,tokens:40,costUsd:.0001}]});
 const result=compareRuns(data,[run('synthetic-A','Use a stable operation key'),run('synthetic-B','Repeat every write')],now,s);
 expect(result.runs[0].results[0].assertions[0].matched).toBe(true);expect(result.runs[1].results[0].assertions[0].matched).toBe(false);
 expect(result.runs[0].results[0].grounding.matched).toEqual(['asd-03']);expect(result.runs[0].results[0].teachingEffectiveness).toBe('requires-human-review');expect(result.automatedGrading).toContain('provisional');
 expect(()=>compareRuns({...data,version:'tampered'},[run('synthetic-A','answer')],now,s)).toThrow();
 expect(()=>compareRuns(data,[{...run('synthetic-A','answer'),datasetDigest:'wrong'}],now,s)).toThrow();
 expect(()=>compareRuns(data,[run('synthetic-A','answer')],now,{...s,records:[]})).toThrow();
});
it('generates one guarded D1 statement with escaped human text, preserving original responses',()=>{
 const s=snapshot(),r={...review(),correction:"Do not confuse a transport's retry with a new operation."};
 const sql=reviewSql(s.records[0],r,s,now);expect(sql).toContain("transport''s");expect(sql).toContain('c.enabled=1');expect(sql).toContain('c.epoch=l.epoch');expect(sql).not.toContain('BEGIN TRANSACTION');expect(sql).not.toContain('original_response=');
});
it('refuses Git worktrees and writes private files without clobbering or broad permissions',async()=>{
 await expect(privatePath(join(process.cwd(),'private-test.json'))).rejects.toThrow(/Git worktree/);
 const folder=await mkdtemp(join(tmpdir(),'private-coach-test-'));
 try{const path=join(folder,'example.json');await writePrivate(path,{fixture:'synthetic-only'});expect((await stat(path)).mode&0o777).toBe(0o600);await expect(writePrivate(path,{})).rejects.toThrow();expect(JSON.parse(await readFile(path,'utf8')).fixture).toBe('synthetic-only');await writePrivate(join(folder,'expired.json'),{schema:'private-coach-evaluation-v1',expiresAt:now-1});await writePrivate(join(folder,'expired.sql'),`-- private-coach-artifact expires=${now-1}\nSELECT 1;`);expect((await purgePrivateArtifacts(folder,now)).removed).toBe(2);expect(JSON.parse(await readFile(path,'utf8')).fixture).toBe('synthetic-only');}finally{await rm(folder,{recursive:true,force:true});}
});
it('preserves the existing forty synthetic cases as a separate baseline',async()=>{
 const corpus=JSON.parse(await readFile('eval/coach/cases.v1.json','utf8'));expect(corpus.cases).toHaveLength(40);expect(corpus.provenance).toBe('synthetic-authored-only');
 const data=makeDataset(snapshot(),'synthetic-private-v1',digest(await readFile('eval/coach/cases.v1.json','utf8')),now);expect(data.syntheticBaseline.digest).toHaveLength(64);
});
it('executes human review and promotion SQL on D1, then withdraws all private derivatives',async()=>{
 const runtime=new Miniflare({modules:true,script:'export default {fetch(){return new Response("synthetic")}}',d1Databases:['DB'],compatibilityDate:'2025-05-01'});
 try{
  const db=await runtime.getD1Database('DB'),at=Date.now(),example={...row(),createdAt:at-day,expiresAt:at+day,state:'pending'},owner='b'.repeat(64);
  for(const migration of ['0001_accounts.sql','0002_observability.sql','0003_research.sql'])await db.exec((await readFile(`migrations/coach/${migration}`,'utf8')).replace(/\n/g,' '));
  await db.prepare('INSERT INTO coach_accounts(id,generation,created,updated) VALUES(?,?,?,?)').bind(owner,'synthetic-generation',at,at).run();
  await db.prepare('INSERT INTO coach_research_consent VALUES(?,?,?,?,?,?)').bind(owner,1,example.participant,'epoch','coach-private-research-v1',at).run();
  await db.prepare('INSERT INTO coach_research_examples VALUES(?,?,?,?,?,?,?)').bind(example.id,example.participant,JSON.stringify(example.payload),example.originalResponse,example.createdAt,example.expiresAt,'pending').run();
  await db.prepare('INSERT INTO coach_research_links VALUES(?,?,?,?)').bind(example.id,owner,'synthetic-operation','epoch').run();
  const snap={schema:'private-coach-snapshot-v1',snapshotAt:at,validUntil:at+15*60_000,records:[example]};
  await db.exec(reviewSql(example,review(),snap,at).replace(/^--[^\n]*\n/gm,'').replace(/\n/g,' '));
  const rows=(await db.prepare(SNAPSHOT_SQL).all()).results,fresh=snapshotRows(rows,at);
  expect(fresh.records[0].state).toBe('reviewed');expect(fresh.records[0].originalResponse).toBe(example.originalResponse);
  const data=makeDataset(fresh,'synthetic-d1-v1','synthetic-digest',at);await db.exec(membershipSql(data).replace(/^--[^\n]*\n/gm,''));
  expect((await db.prepare('SELECT COUNT(*) AS n FROM coach_research_dataset_versions').first<any>()).n).toBe(1);
  const redaction={privacyOnly:true,reviewerRef:'reviewer-synthetic',question:example.payload.question,context:[],learningGoal:example.payload.learningGoal,originalResponse:'Original model response with [redacted-name].'};
  await db.exec(redactionSql(fresh.records[0],redaction,fresh,at).replace(/^--[^\n]*\n/gm,'').replace(/\n/g,' '));
  expect((await db.prepare('SELECT count(*) AS n FROM coach_research_reviews').first<any>()).n).toBe(0);
  expect((await db.prepare('SELECT count(*) AS n FROM coach_research_dataset_versions').first<any>()).n).toBe(0);
  const revised=snapshotRows((await db.prepare(SNAPSHOT_SQL).all()).results,at);
  expect(revised.records[0].state).toBe('pending');expect(revised.records[0].originalResponse).toContain('[redacted-name]');
  await db.exec(reviewSql(revised.records[0],review(),revised,at).replace(/^--[^\n]*\n/gm,'').replace(/\n/g,' '));
  const approved=snapshotRows((await db.prepare(SNAPSHOT_SQL).all()).results,at);await db.exec(membershipSql(makeDataset(approved,'synthetic-redacted-v1','digest',at)).replace(/^--[^\n]*\n/gm,''));
  await db.prepare('UPDATE coach_research_consent SET enabled=0 WHERE owner=?').bind(owner).run();
  for(const table of ['coach_research_examples','coach_research_reviews','coach_research_dataset_versions'])expect((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first<any>()).n).toBe(0);
 }finally{await runtime.dispose();}
});
it('runs the private CLI end to end with synthetic files and no provider calls',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'private-coach-cli-')),at=Date.now(),s=snapshot();
 s.snapshotAt=at;s.validUntil=at+15*60_000;s.records[0].createdAt=at-day;s.records[0].expiresAt=at+day;s.records[0].review.reviewedAt=at;
 try{
  await writePrivate(join(folder,'snapshot.json'),s);await writePrivate(join(folder,'review.json'),{...review(),schema:'private-coach-human-review-v1',expiresAt:s.validUntil});
  const run=(...args:string[])=>execFileSync(process.execPath,['scripts/coach-research.mjs',...args],{encoding:'utf8',cwd:process.cwd()});
  expect(run('review','--input',join(folder,'snapshot.json'),'--review',join(folder,'review.json'),'--id',s.records[0].id,'--out',join(folder,'review.sql'))).not.toContain(s.records[0].payload.question);
  run('promote','--input',join(folder,'snapshot.json'),'--version','synthetic-cli-v1','--membership-sql',join(folder,'memberships.sql'),'--out',join(folder,'dataset.json'));
  const data=JSON.parse(await readFile(join(folder,'dataset.json'),'utf8'));
  await writePrivate(join(folder,'run.json'),{schema:'private-coach-run-v1',expiresAt:data.expiresAt,datasetDigest:data.digest,model:'synthetic-model',promptVersion:'synthetic-prompt',retrievalVersion:'synthetic-retrieval',results:[{id:data.examples[0].id,answer:'Use a stable operation key',sourceIds:['asd-03'],latencyMs:120,tokens:40,costUsd:.0001}]});
  run('compare','--dataset',join(folder,'dataset.json'),'--run',join(folder,'run.json'),'--consent-snapshot',join(folder,'snapshot.json'),'--out',join(folder,'comparison.json'));
  expect(JSON.parse(await readFile(join(folder,'comparison.json'),'utf8')).automatedGrading).toContain('provisional');
 }finally{await rm(folder,{recursive:true,force:true});}
});
