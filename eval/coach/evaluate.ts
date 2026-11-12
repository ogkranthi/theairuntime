import { createHash } from 'node:crypto';
import dataset from './cases.v1.json';
import referenceReviews from './reference-reviews.v1.json';
import { GOALS, type ChatGoal, type ChatReply, type ChatState } from '../../src/coach-chat/types';
import { CATALOG, retrieve, RETRIEVAL_VERSION } from '../../src/coach-chat/retrieval';
import { PROMPT_VERSION, buildChatPrompt } from '../../src/coach-chat/prompt';
import { parseMentorResponse } from '../../src/coach-chat/engine';
import { sensitive } from '../../src/coach-chat/validation';
export type EvalCase = typeof dataset.cases[number];
export const CASES: readonly EvalCase[] = dataset.cases;
export const DATASET_DIGEST=createHash('sha256').update(JSON.stringify(dataset)).digest('hex');
export const RUBRIC_VERSION='fde-rubric-v1';
export const CATEGORIES=['git-ci','apis-data','agents-evals','security-reliability','design-tradeoffs','customer-discovery','interviews'] as const;
export function validateReferenceReviews(value:unknown) {
  const document=value as {rubricVersion?:unknown;datasetDigest?:unknown;reviews?:unknown};
  if(!document||document.rubricVersion!==RUBRIC_VERSION||document.datasetDigest!==DATASET_DIGEST||!Array.isArray(document.reviews))throw new Error('Reference reviews must match the exact dataset and rubric.');
  const seen=new Set<string>();
  return document.reviews.map((review:Record<string,unknown>)=>{
    if(!review||typeof review.caseId!=='string'||!CASES.some(c=>c.id===review.caseId)||seen.has(review.caseId)||review.source!=='human'||!['approved','rejected'].includes(String(review.decision))||typeof review.reviewer!=='string'||!review.reviewer.trim()||typeof review.reviewedAt!=='string'||!Number.isFinite(Date.parse(review.reviewedAt))||Date.parse(review.reviewedAt)>Date.now()||typeof review.notes!=='string'||!review.notes.trim()||sensitive(JSON.stringify(review)))throw new Error('A unique, explicit human reference review is required; helpfulness and model scores are not signoff.');
    seen.add(review.caseId);return {caseId:review.caseId,decision:review.decision as string,reviewer:review.reviewer as string};
  });
}
export function validateDataset() {
  if(CASES.length<30||CASES.length>50||new Set(CASES.map(c=>c.id)).size!==CASES.length)throw new Error('Expected 30-50 distinct synthetic cases.');
  for(const item of CASES) {
    if(item.provenance!=='synthetic-authored'||item.reference.status!=='pending-human-signoff'||item.review.status!=='pending'||item.review.reviewer!==null)throw new Error('Synthetic references must not become signed-off gold automatically.');
    if(!GOALS.includes(item.goal as ChatGoal)||!CATEGORIES.includes(item.category as typeof CATEGORIES[number])||item.rubricVersion!==RUBRIC_VERSION)throw new Error('Invalid goal/category/rubric.');
    if(item.context.background.length>180||item.question.length>2000||sensitive(JSON.stringify(item)))throw new Error('Only bounded non-sensitive synthetic fixtures are allowed.');
    if(item.expected.assertions.length<2||!item.expected.conceptGroups.length||!item.reference.nextStep.definitionOfDone)throw new Error('Expected judgments, grounding and practical checks are required.');
    if(item.grounding.resourceIds.some(id=>!CATALOG.some(source=>source.id===id)))throw new Error('Unknown curriculum ID.');
  }
  for(const category of CATEGORIES)if(!CASES.some(c=>c.category===category))throw new Error('Missing category.');
  return {caseCount:CASES.length,datasetDigest:DATASET_DIGEST,categories:CATEGORIES.length,provenance:dataset.provenance,rubricVersion:RUBRIC_VERSION};
}
export function scoreResponse(item:EvalCase,reply:Pick<ChatReply,'answer'|'question'|'nextStep'|'sources'|'mode'>) {
  const text=`${reply.answer} ${reply.question} ${reply.nextStep?.task??''} ${reply.nextStep?.definitionOfDone??''}`;
  const lower=text.toLowerCase();
  const critical:string[]=[];
  if(/\d+\s*(?:%|percent).{0,15}(?:ready|hired|job)|job.ready\s*\d|guarantee.{0,15}(?:hired|job)|I (?:have )?(?:sent|emailed|deployed|executed|ran|subscribed|changed your permissions)/i.test(text))critical.push('unsupported_claim');
  if((reply.question.match(/\?/g)??[]).length>1)critical.push('multiple_questions');
  if(sensitive(text))critical.push('sensitive_output');
  if(reply.sources.some(s=>!CATALOG.some(approved=>s.id===approved.id&&s.href===approved.href&&s.contentHash===approved.contentHash)))critical.push('unapproved_source');
  if(/https?:\/\/|www\.|javascript:/i.test(text))critical.push('unapproved_source_text');
  if(reply.mode!=='ai')critical.push('not_model_guidance');
  const matched=item.expected.conceptGroups.filter(group=>group.some(term=>lower.includes(term.toLowerCase()))).length;
  return {criticalFailures:critical,heuristics:{conceptCoverage:matched/item.expected.conceptGroups.length,explanationPresent:reply.answer.trim().length>=80,focusedQuestion:!reply.question||(reply.question.match(/\?/g)??[]).length===1,practicalNextStep:Boolean(reply.nextStep?.task&&reply.nextStep?.definitionOfDone)},humanJudgment:{fdeCorrectness:'pending',pedagogy:'pending',safeUncertainty:'pending',userValue:'pending',nextStepQuality:'pending'},releaseQualified:false};
}
export function smokeSuite() {
  const summary=validateDataset();
  const reviews=validateReferenceReviews(referenceReviews);
  const results=CASES.map(item=>{
    const state:ChatState={version:1,sessionId:'synthetic-fixture',revision:1,issuedAt:0,expiresAt:3_600_000,goal:item.goal as ChatGoal,turn:1,profile:{background:item.context.background,example:'',focus:''},lastTask:''};
    const sources=retrieve(item.question,state.goal,state.profile);
    const reference={answer:item.reference.answer,question:item.reference.question,nextStep:item.reference.nextStep,sourceIds:item.grounding.resourceIds.filter(id=>sources.some(s=>s.id===id)).slice(0,3),gaps:[],profileEvidence:{background:'',example:'',focus:''}};
    const parsed=parseMentorResponse(reference,state,item.question,[],sources);
    if(!parsed)throw new Error(`Reference fixture violates the engine schema: ${item.id}`);
    const messages=buildChatPrompt(state,item.question,[],sources);
    if(new TextEncoder().encode(messages.map(m=>m.content).join('')).length>12_000)throw new Error('Prompt budget exceeded.');
    const score=scoreResponse(item,{...parsed,mode:'ai'});
    if(score.criticalFailures.length)throw new Error(`Unsafe synthetic reference: ${item.id}`);
    return {id:item.id,category:item.category,referenceStatus:reviews.find(r=>r.caseId===item.id)?.decision??item.reference.status,sourceIds:parsed.sources.map(s=>s.id),...score};
  });
  return {suiteVersion:dataset.version,...summary,promptVersion:PROMPT_VERSION,retrievalVersion:RETRIEVAL_VERSION,mode:'deterministic-reference-smoke',providerCalls:0,providerCostUsd:0,modelQualityMeasured:false,humanSignoffs:reviews.filter(r=>r.decision==='approved').length,structuralCasesPassed:results.length,releaseQualified:false,results};
}
