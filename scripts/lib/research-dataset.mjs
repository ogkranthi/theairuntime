import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, realpath, stat, lstat, readdir, unlink } from 'node:fs/promises';
import { dirname, resolve, parse } from 'node:path';
import { execFileSync } from 'node:child_process';
const DAY=86_400_000;
export const ERROR_CATEGORIES=['technical_error','unsupported_claim','hallucinated_source','ungrounded_advice','poor_question','vague_next_step','privacy_failure','unsafe_advice','provider_failure','timeout','invalid_output','none','unknown'];
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const fail=message=>{throw new Error(message);};
const bounded=(v,max)=>typeof v==='string'&&v.length<=max;
const list=(v,max=20)=>Array.isArray(v)&&v.length>0&&v.length<=max&&v.every(s=>bounded(s,500)&&s.trim());
export function checkSnapshot(snapshot,now=Date.now()){
  if(snapshot.schema!=='private-coach-snapshot-v1'||!Array.isArray(snapshot.records)||snapshot.records.length>200||!Number.isFinite(snapshot.snapshotAt)||!Number.isFinite(snapshot.validUntil)||snapshot.snapshotAt>now||now>=snapshot.validUntil||snapshot.validUntil-snapshot.snapshotAt>15*60_000)fail('Use a fresh private consent-filtered snapshot.');
}
export function checkReview(review){
  if(!review||review.privacyApproved!==true||review.promotionApproved!==true||!/^reviewer-[a-zA-Z0-9_-]{1,60}$/.test(review.reviewerRef)||!/^[-a-zA-Z0-9_.]{1,80}$/.test(review.evaluationVersion)||!bounded(review.correction,4000)||!bounded(review.referenceAnswer,4000)||!review.referenceAnswer.trim()||!list(review.expectedAssertions)||!list(review.teachingCriteria)||!Array.isArray(review.errorCategories)||review.errorCategories.some(c=>!ERROR_CATEGORIES.includes(c))||![review.technicalAccuracy,review.coachingQuality].every(n=>Number.isInteger(n)&&n>=0&&n<=4))fail('An explicit human privacy, technical and coaching review is required.');
  return review;
}
export function checkExample(row,now=Date.now()){
  if(!row||!/^[a-f0-9]{64}$/.test(row.id)||row.consentActive!==true||!Number.isFinite(row.createdAt)||!Number.isFinite(row.expiresAt)||row.createdAt>now||row.expiresAt<=now||row.expiresAt>row.createdAt+180*DAY||!row.payload||row.payload.redactionVersion!=='research-redaction-v1'||!bounded(row.payload.question,2000)||!Array.isArray(row.payload.context)||row.payload.context.length>4||row.payload.context.some(t=>!['learner','coach'].includes(t.role)||!bounded(t.text,700))||!bounded(row.payload.learningGoal,400)||!bounded(row.originalResponse,2400)||!Array.isArray(row.payload.sourceIds))fail('Invalid, expired or nonconsented private example.');
  // Human review is still needed for names, organizations and contextual identifiers.
  const material=JSON.stringify([row.payload.question,row.payload.context,row.payload.learningGoal,row.originalResponse,row.review?.referenceAnswer,row.review?.correction,row.review?.expectedAssertions,row.review?.teachingCriteria]);
  if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|https?:\/\/|\b(?:sk-|ghp_)[a-zA-Z0-9_-]{12,}|PRIVATE KEY|\beyJ[a-zA-Z0-9_-]+\./i.test(material))fail('Private identifiers require further review/redaction.');
}
export function makeDataset(snapshot,version,syntheticDigest,now=Date.now()){
  checkSnapshot(snapshot,now);
  if(!/^[-a-zA-Z0-9_.]{1,80}$/.test(version)||!snapshot.records.length||new Set(snapshot.records.map(r=>r.id)).size!==snapshot.records.length)fail('Choose a version and distinct reviewed cases.');
  const examples=snapshot.records.map(row=>{
    checkExample(row,now);const review=checkReview(row.review);
    if(!Number.isInteger(review.reviewedAt)||review.reviewedAt>now||review.reviewedAt<row.createdAt)fail('Use the current D1 human review timestamp.');
    if(row.state!=='reviewed')fail('Unreviewed examples cannot be promoted.');
    return {id:row.id,participant:row.participant,question:row.payload.question,context:row.payload.context,learningGoal:row.payload.learningGoal,skillCategory:row.payload.skillCategory,originalResponse:row.originalResponse,originalModel:row.payload.model,originalPromptVersion:row.payload.promptVersion,retrievalVersion:row.payload.retrievalVersion,sourceIds:row.payload.sourceIds,feedback:row.payload.feedback,explicitlyReportedOutcome:row.payload.explicitlyReportedOutcome,createdAt:row.createdAt,responseCreatedAt:row.payload.responseCreatedAt??null,reviewedAt:review.reviewedAt,expiresAt:row.expiresAt,referenceAnswer:review.referenceAnswer,reviewerCorrection:review.correction,expectedAssertions:review.expectedAssertions,teachingCriteria:review.teachingCriteria,errorCategories:review.errorCategories,technicalAccuracy:review.technicalAccuracy,coachingQuality:review.coachingQuality,reviewerRef:review.reviewerRef,evaluationVersion:review.evaluationVersion,reviewDigest:digest(review)};
  });
  const value={schema:'private-coach-evaluation-v1',manifestId:randomUUID(),version,createdAt:now,expiresAt:Math.min(snapshot.validUntil,...examples.map(e=>e.expiresAt)),provenance:'consented-private-human-reviewed',publicationAllowed:false,trainingAllowed:false,scientificallyValidated:false,automatedGrading:'provisional-until-human-reviewed',syntheticBaseline:{version:'fde-cases-v1',count:40,digest:syntheticDigest},examples};
  return {...value,digest:digest(value)};
}
export function compareRuns(dataset,runs,now=Date.now(),consentSnapshot){
  checkSnapshot(consentSnapshot,now);
  const {digest:expected,...content}=dataset;
  if(!Number.isFinite(dataset.expiresAt)||!Number.isFinite(dataset.createdAt)||dataset.createdAt>now||dataset.expiresAt>dataset.createdAt+15*60_000||dataset.schema!=='private-coach-evaluation-v1'||expected!==digest(content)||dataset.expiresAt<=now||dataset.publicationAllowed!==false||dataset.trainingAllowed!==false||!Array.isArray(runs)||runs.length<1)fail('Use a fresh private dataset and matching evaluation runs.');
  for(const example of dataset.examples){const row=consentSnapshot.records.find(r=>r.id===example.id);checkExample(row,now);if(row.state!=='reviewed'||digest(checkReview(row.review))!==example.reviewDigest)fail('Research consent or review changed. Rebuild the private dataset.');}
  return {schema:'private-coach-comparison-v1',datasetDigest:expected,version:dataset.version,expiresAt:dataset.expiresAt,automatedGrading:'provisional-until-human-reviewed',scientificallyValidated:false,runs:runs.map(run=>{
    if(!Number.isFinite(run.expiresAt)||run.schema!=='private-coach-run-v1'||run.expiresAt<=now||run.expiresAt>dataset.expiresAt||run.datasetDigest!==expected||!bounded(run.model,200)||!bounded(run.promptVersion,100)||!bounded(run.retrievalVersion,100)||!Array.isArray(run.results)||run.results.length!==dataset.examples.length||new Set(run.results.map(r=>r.id)).size!==run.results.length)fail('All comparisons must use the same dataset, with one result per case.');
    const rows=dataset.examples.map(example=>{
      const actual=run.results.find(r=>r.id===example.id);
      if(!actual||!bounded(actual.answer,10000)||!Array.isArray(actual.sourceIds))fail('Invalid comparison result.');
      const known=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
      let humanReview=null;
      if(actual.humanReview){const h=actual.humanReview;if(!/^reviewer-[a-zA-Z0-9_-]{1,60}$/.test(h.reviewerRef)||![h.technicalAccuracy,h.teachingEffectiveness,h.groundingAccuracy].every(n=>Number.isInteger(n)&&n>=0&&n<=4))fail('Invalid human run review.');humanReview={reviewerRef:h.reviewerRef,technicalAccuracy:h.technicalAccuracy,teachingEffectiveness:h.teachingEffectiveness,groundingAccuracy:h.groundingAccuracy};}
      return {id:example.id,assertions:example.expectedAssertions.map(assertion=>({assertion,matched:actual.answer.toLowerCase().includes(assertion.toLowerCase())})),grounding:{expected:example.sourceIds,matched:example.sourceIds.filter(id=>actual.sourceIds.includes(id)),unexpected:actual.sourceIds.filter(id=>!example.sourceIds.includes(id))},teachingEffectiveness:'requires-human-review',humanReview,errorCategory:ERROR_CATEGORIES.includes(actual.errorCategory)?actual.errorCategory:'unknown',latencyMs:known(actual.latencyMs)?actual.latencyMs:null,tokens:known(actual.tokens)?actual.tokens:null,costUsd:known(actual.costUsd)?actual.costUsd:null};
    });
    return {model:run.model,promptVersion:run.promptVersion,retrievalVersion:run.retrievalVersion,results:rows,meanLatencyMs:rows.every(r=>r.latencyMs!==null)?rows.reduce((s,r)=>s+r.latencyMs,0)/rows.length:null,knownCostUsd:rows.reduce((s,r)=>s+(r.costUsd??0),0),costComplete:rows.every(r=>r.costUsd!==null)};
  })};
}
const quote=value=>`'${String(value).replaceAll("'","''")}'`;
export function redactionSql(row,redaction,snapshot,now=Date.now()){
  checkSnapshot(snapshot,now);
  if(redaction.privacyOnly!==true||!/^reviewer-[a-zA-Z0-9_-]{1,60}$/.test(redaction.reviewerRef))fail('An explicit human privacy-only redaction is required.');
  const payload={...row.payload,question:redaction.question,context:redaction.context,learningGoal:redaction.learningGoal,humanRedactionVersion:'human-privacy-v1',humanRedactionReviewer:redaction.reviewerRef,humanRedactedAt:now};
  checkExample({...row,payload,originalResponse:redaction.originalResponse,review:null},now);
  // The trigger invalidates prior reviews/memberships; technical corrections still belong in review fields.
  return `-- private-coach-artifact expires=${snapshot.validUntil}\nUPDATE coach_research_examples SET payload=${quote(JSON.stringify(payload))},original_response=${quote(redaction.originalResponse)} WHERE id=${quote(row.id)} AND expires>unixepoch()*1000 AND unixepoch()*1000<${snapshot.validUntil} AND EXISTS(SELECT 1 FROM coach_research_links l JOIN coach_research_consent c ON c.owner=l.owner JOIN coach_accounts a ON a.id=l.owner WHERE l.contribution=coach_research_examples.id AND c.enabled=1 AND c.epoch=l.epoch AND a.deleted=0);\n`;
}
export function reviewSql(row,review,snapshot,now=Date.now()){
  checkSnapshot(snapshot,now);checkReview(review);checkExample({...row,review},now);
  const active=`SELECT e.id FROM coach_research_examples e JOIN coach_research_links l ON l.contribution=e.id JOIN coach_research_consent c ON c.owner=l.owner JOIN coach_accounts a ON a.id=l.owner WHERE e.id=${quote(row.id)} AND c.enabled=1 AND c.epoch=l.epoch AND a.deleted=0 AND e.expires>unixepoch()*1000 AND unixepoch()*1000<${snapshot.validUntil}`;
  return `-- private-coach-artifact expires=${snapshot.validUntil}\nINSERT INTO coach_research_reviews SELECT id,${[review.correction,review.referenceAnswer,JSON.stringify(review.expectedAssertions),JSON.stringify(review.teachingCriteria),JSON.stringify(review.errorCategories)].map(quote).join(',')},${review.technicalAccuracy},${review.coachingQuality},${quote(review.reviewerRef)},${quote(review.evaluationVersion)},1,1,${now} FROM (${active}) WHERE 1 ON CONFLICT(contribution) DO UPDATE SET correction=excluded.correction,reference_answer=excluded.reference_answer,assertions=excluded.assertions,teaching_criteria=excluded.teaching_criteria,categories=excluded.categories,accuracy=excluded.accuracy,coaching_quality=excluded.coaching_quality,reviewer_ref=excluded.reviewer_ref,evaluation_version=excluded.evaluation_version,reviewed=excluded.reviewed;\n`;
}
export function membershipSql(dataset){
  return `-- private-coach-artifact expires=${dataset.expiresAt}\n`+dataset.examples.map(e=>`INSERT OR IGNORE INTO coach_research_dataset_versions SELECT ${quote(dataset.version)},e.id,${quote(e.reviewDigest)},${dataset.createdAt} FROM coach_research_examples e JOIN coach_research_reviews r ON r.contribution=e.id JOIN coach_research_links l ON l.contribution=e.id JOIN coach_research_consent c ON c.owner=l.owner WHERE e.id=${quote(e.id)} AND e.state='reviewed' AND r.privacy_approved=1 AND r.promotion_approved=1 AND r.evaluation_version=${quote(e.evaluationVersion)} AND r.reviewed=${e.reviewedAt} AND unixepoch()*1000<${dataset.expiresAt} AND c.enabled=1 AND c.epoch=l.epoch AND e.expires>unixepoch()*1000;`).join('\n');
}
export async function privatePath(path){
  if(typeof path!=='string'||!path)fail('Specify a private path.');
  const target=resolve(path),parent=await realpath(dirname(target));
  try{if((await lstat(target)).isSymbolicLink())fail('Use direct private files, not symlinks.');}catch(e){if(e.code!=='ENOENT')throw e;}
  if(parent!==dirname(target))fail('Use a direct private directory without symlink parents.');
  let cursor=parent;
  while(true){try{await stat(resolve(cursor,'.git'));fail('Private data must never enter a Git worktree.');}catch(e){if(e.code!=='ENOENT')throw e;}
    if(cursor===parse(cursor).root)break;cursor=dirname(cursor);
  }
  return target;
}
export async function readPrivate(path){return JSON.parse(await readFile(await privatePath(path),'utf8'));}
export async function writePrivate(path,value){await writeFile(await privatePath(path),typeof value==='string'?value:JSON.stringify(value,null,2),{encoding:'utf8',mode:0o600,flag:'wx'});}
export async function purgePrivateArtifacts(directory,now=Date.now()){
  // Only generated artifacts in an explicitly chosen private directory; never recursive.
  await privatePath(resolve(directory,'.private-artifact-check'));
  let removed=0;
  for(const entry of (await readdir(directory,{withFileTypes:true})).slice(0,1000)){
    if(!entry.isFile()||!(/\.(json|sql)$/.test(entry.name)))continue;
    const path=await privatePath(resolve(directory,entry.name));if((await stat(path)).size>16*1024*1024)continue;
    const value=await readFile(path,'utf8');let expires;
    if(entry.name.endsWith('.sql'))expires=Number(value.match(/^-- private-coach-artifact expires=(\d+)\n/)?.[1]);
    else try{const data=JSON.parse(value);if(['private-coach-snapshot-v1','private-coach-evaluation-v1','private-coach-comparison-v1','private-coach-human-review-v1','private-coach-redaction-v1','private-coach-run-v1'].includes(data.schema))expires=data.expiresAt??data.validUntil;}catch{}
    if(typeof expires==='number'&&Number.isFinite(expires)&&expires<=now){await unlink(path);removed++;}
  }
  return {removed};
}
export const SNAPSHOT_SQL=`SELECT e.*,r.correction,r.reference_answer,r.assertions,r.teaching_criteria,r.categories,r.accuracy,r.coaching_quality,r.reviewer_ref,r.evaluation_version,r.privacy_approved,r.promotion_approved,r.reviewed FROM coach_research_examples e JOIN coach_research_links l ON l.contribution=e.id JOIN coach_research_consent c ON c.owner=l.owner JOIN coach_accounts a ON a.id=l.owner LEFT JOIN coach_research_reviews r ON r.contribution=e.id WHERE c.enabled=1 AND c.epoch=l.epoch AND a.deleted=0 AND e.expires>unixepoch()*1000 ORDER BY e.id LIMIT 200`;
export function snapshotRows(rows,now=Date.now()){
  return {schema:'private-coach-snapshot-v1',snapshotAt:now,validUntil:now+15*60_000,records:rows.map(r=>({id:r.id,participant:r.participant,payload:JSON.parse(r.payload),originalResponse:r.original_response,createdAt:r.created,expiresAt:r.expires,state:r.state,consentActive:true,review:r.reviewed?{correction:r.correction,referenceAnswer:r.reference_answer,expectedAssertions:JSON.parse(r.assertions),teachingCriteria:JSON.parse(r.teaching_criteria),errorCategories:JSON.parse(r.categories),technicalAccuracy:r.accuracy,coachingQuality:r.coaching_quality,reviewerRef:r.reviewer_ref,evaluationVersion:r.evaluation_version,privacyApproved:r.privacy_approved===1,promotionApproved:r.promotion_approved===1,reviewedAt:r.reviewed}:null}))};
}
export async function snapshotFromD1(config,remote,confirmed,after){
  if(remote&&!confirmed)fail('Explicit private D1 access confirmation is required.');
  if(after&&!/^[a-f0-9]{64}$/.test(after))fail('Choose a valid private cursor.');
  const sql=after?SNAPSHOT_SQL.replace('ORDER BY e.id',`AND e.id>${quote(after)} ORDER BY e.id`):SNAPSHOT_SQL;
  const result=execFileSync('npx',['--yes','wrangler@4.160.1','d1','execute','COACH_DB','--config',resolve(config),remote?'--remote':'--local','--command',sql,'--json'],{encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
  const data=JSON.parse(result);return snapshotRows(data[0]?.results??[]);
}
