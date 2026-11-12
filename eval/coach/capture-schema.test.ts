import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFileSync } from 'node:fs';
let runtime:Miniflare,db:Awaited<ReturnType<Miniflare['getD1Database']>>;
async function execute(sql:string){for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();}
beforeAll(async()=>{runtime=new Miniflare({modules:true,script:'export default {fetch(){return new Response("local schema only")}}',compatibilityDate:'2025-05-01',d1Databases:{COACH_EVAL:'local-synthetic-schema-only'}});db=await runtime.getD1Database('COACH_EVAL');await execute(readFileSync('eval/coach/capture-proposal.sql','utf8').replace(/^--.*$/gm,''));},30_000);
afterAll(async()=>{await runtime?.dispose();});beforeEach(async()=>{await execute('DELETE FROM reviews; DELETE FROM contributed_examples; DELETE FROM evaluation_runs;');});
async function insert(id='chosen',consent=1,expires=100+604800,question='One chosen synthetic question',answer='One chosen synthetic answer') {
  return db.prepare('INSERT INTO contributed_examples(id,exchange_hash,deletion_receipt_hash,question_redacted,answer_redacted,source_ids_json,consent_accepted,consent_version,consented_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,id.padEnd(64,'a'),id.padEnd(64,'b'),question,answer,'["asd-03"]',consent,'fde-exchange-consent-v1',100,expires).run();
}
it('proposed schema rejects missing consent and overlong retention',async()=>{await expect(insert('no-consent',0)).rejects.toThrow();await expect(insert('over-retained',1,100+604801)).rejects.toThrow();expect((await db.prepare('SELECT * FROM contributed_examples').all()).results).toHaveLength(0);});
it('stores only the explicitly chosen synthetic Q/A fields, not profile or full history',async()=>{
  await insert();const row=await db.prepare('SELECT * FROM contributed_examples').first();expect(row).toMatchObject({question_redacted:'One chosen synthetic question',answer_redacted:'One chosen synthetic answer',review_state:'pending'});expect(row).not.toHaveProperty('profile');expect(row).not.toHaveProperty('transcript');expect(row).not.toHaveProperty('newsletter_consent');
});
it('deletion by a private receipt hash cascades reviews and does not delete another exchange',async()=>{
  await insert('chosen');await insert('other');await db.prepare('INSERT INTO reviews VALUES(?,?,?,?,?,?,?)').bind('r','chosen','owner','fde-rubric-v1','accepted','Synthetic redaction review',200).run();
  expect((await db.prepare('DELETE FROM contributed_examples WHERE deletion_receipt_hash=?').bind('wrong'.padEnd(64,'b')).run()).meta.changes).toBe(0);
  await db.prepare('DELETE FROM contributed_examples WHERE deletion_receipt_hash=?').bind('chosen'.padEnd(64,'b')).run();expect((await db.prepare('SELECT * FROM reviews').all()).results).toHaveLength(0);expect((await db.prepare('SELECT * FROM contributed_examples').all()).results).toHaveLength(1);
});
it('a retention sweep removes expired chosen exchanges',async()=>{await insert('expired',1,101);await insert('retained',1,500);await db.prepare('DELETE FROM contributed_examples WHERE expires_at<=?').bind(101).run();expect((await db.prepare('SELECT id FROM contributed_examples').all()).results).toEqual([{id:'retained'}]);});
it('helpfulness is not a gold review or permission to publish',async()=>{await insert();await db.prepare("UPDATE contributed_examples SET feedback_label='helpful'").run();expect(await db.prepare('SELECT review_state FROM contributed_examples').first()).toEqual({review_state:'pending'});expect((await db.prepare('SELECT * FROM reviews').all()).results).toHaveLength(0);});
