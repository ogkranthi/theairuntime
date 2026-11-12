import catalog from './catalog.generated.json';
import type { ChatGoal, ChatSource, Profile } from './types';
export const RETRIEVAL_VERSION = catalog.version;
export const CATALOG: readonly ChatSource[] = catalog.resources;
const hints: Record<ChatGoal,string> = {
  become:'orientation runtime customer paths', interview:'interview evidence tradeoffs', skills:'evaluation reliability tools',
  design:'architecture system control tradeoffs', review:'architecture security evaluation', plan:'paths orientation build',
  story:'customer evidence interview', general:'',
};
export function retrieve(message:string,goal:ChatGoal,profile?:Profile):ChatSource[] {
  const words=[...new Set(`${message} ${hints[goal]} ${profile?.focus??''}`.toLowerCase().match(/[a-z][a-z0-9_-]{2,}/g)??[])].filter(w=>!['the','and','for','with','that','this','have','what','how','can','you','from','into','are','not','but'].includes(w));
  const ranked=CATALOG.map((source,index)=>{
    const title=`${source.id} ${source.title}`.toLowerCase(), text=source.excerpt.toLowerCase();
    return {source,index,score:words.reduce((score,word)=>score+(title.includes(word)?5:0)+(text.includes(word)?1:0),0)};
  }).sort((a,b)=>b.score-a.score||a.index-b.index);
  const selected=ranked.filter(row=>row.score>0).slice(0,3).map(row=>row.source);
  for(const id of ['asd-00','paths']) if(selected.length<2&&!selected.some(s=>s.id===id))selected.push(CATALOG.find(s=>s.id===id)!);
  if(goal==='interview'&&!selected.some(s=>s.id==='gym')) {
    const gym=CATALOG.find(s=>s.id==='gym')!;
    if(selected.length===3)selected[2]=gym;else selected.push(gym);
  }
  return selected;
}
export function approvedSources(ids:unknown,retrieved:ChatSource[]):ChatSource[]|null {
  if(!Array.isArray(ids)||ids.length>3||ids.some(id=>typeof id!=='string'||!retrieved.some(source=>source.id===id)))return null;
  return [...new Set(ids)].map(id=>retrieved.find(source=>source.id===id)!);
}
