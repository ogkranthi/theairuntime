import { account } from './store';
import { AdmissionError } from '../security/types';
import type { AccountEnv } from './types';
import { emitMetric } from './metrics';
/** Stream bounded D1 pages, rather than materializing a learner archive in Worker memory. */
export async function streamAccountExport(env:AccountEnv,owner:string):Promise<Response>{
  const profile=await account(env,owner),db=env.COACH_DB!,at=Date.now();
  async function* rows(sql:string,bindings:(string|number)[],size=50){
    let offset=0,first=true;
    yield '[';
    while(true){
      const current=await account(env,owner);
      if(current.generation!==profile.generation)throw new AdmissionError(410,'Account changed.');
      const page=await db.prepare(`${sql} LIMIT ? OFFSET ?`).bind(...bindings,size,offset).all();
      for(const row of page.results){yield `${first?'':','}${JSON.stringify(row)}`;first=false;}
      if(page.results.length<size)break;offset+=size;
    }
    yield ']';
  }
  async function* document(){
    yield `{"schemaVersion":1,"exportedAt":${JSON.stringify(new Date(at).toISOString())},"profile":${JSON.stringify({background:profile.background,goal:profile.goal,created:profile.created})},"retentionDays":90,"conversations":`;
    yield* rows('SELECT id,goal,revision,created,updated,expires FROM coach_conversations WHERE owner=? AND expires>? ORDER BY id',[owner,at],100);
    yield ',"messages":';
    yield* rows('SELECT m.conversation,m.revision,m.question,m.response,m.metadata,m.created FROM coach_messages m JOIN coach_conversations c ON c.id=m.conversation WHERE m.owner=? AND c.owner=? AND c.expires>? ORDER BY m.operation',[owner,owner,at],100);
    yield ',"feedback":';
    yield* rows('SELECT operation,rating,completed,updated FROM coach_feedback WHERE owner=? ORDER BY operation',[owner],100);
    const consent=await db.prepare('SELECT enabled,version,updated FROM coach_research_consent WHERE owner=?').bind(owner).first<any>();
    yield `,"research":{"consent":${JSON.stringify({enabled:Boolean(consent?.enabled),version:consent?.version??'coach-private-research-v1',updated:consent?.updated??null})},"contributions":`;
    yield* rows(`SELECT e.id,e.participant,e.payload,e.original_response,e.created,e.expires,e.state,r.correction,r.reference_answer,r.assertions,r.teaching_criteria,r.categories,r.accuracy,r.coaching_quality,r.evaluation_version,r.reviewed FROM coach_research_examples e JOIN coach_research_links l ON l.contribution=e.id JOIN coach_research_consent c ON c.owner=l.owner AND c.enabled=1 AND c.epoch=l.epoch LEFT JOIN coach_research_reviews r ON r.contribution=e.id WHERE l.owner=? AND e.expires>? ORDER BY e.id`,[owner,at],25);
    yield '}}';
  }
  const iterator=document(),encoder=new TextEncoder();
  const stream=new ReadableStream<Uint8Array>({async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(encoder.encode(next.value));}catch{emitMetric(env,'error',undefined,{category:'storage_or_security'});controller.error(new Error('The private export was interrupted. Retry the export.'));}},async cancel(){await iterator.return(undefined);}});
  return new Response(stream,{headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff','content-disposition':'attachment; filename="fde-coach-data.json"'}});
}
