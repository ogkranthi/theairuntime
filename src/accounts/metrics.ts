import type { AccountEnv, Account } from './types';
import type { ChatMetadata } from '../coach-chat/types';
import { PROMPT_VERSION } from '../coach-chat/prompt';
import { RETRIEVAL_VERSION } from '../coach-chat/retrieval';
const EVENTS = ['active_day','active_month','new_user','returning_learner','conversation_start','interaction','model_attempt','retry','limit','error','feedback','step_completed'] as const;
type Event = typeof EVENTS[number];
const CATEGORIES = ['none','auth','invalid_request','conflict','usage_limit','storage_or_security','timeout','provider_failure','model_output_invalid','admission_unavailable','unsafe_instruction','ai_unavailable','input_budget'] as const;
export function costEstimate(env: AccountEnv, metadata?: ChatMetadata): number | null {
  if (!metadata?.usageComplete || !metadata.attemptDetails?.length || !env.COACH_MODEL_PRICES_JSON) return null;
  try {
    const prices = JSON.parse(env.COACH_MODEL_PRICES_JSON);
    let cost = 0;
    for (const a of metadata.attemptDetails.filter(a=>a.executed)) {
      const price = prices[a.model];
      if (!price || ![price.inputPerMillion,price.outputPerMillion].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<10000) || a.tokens === null) return null;
      cost += a.inputTokens !== null && a.outputTokens !== null ? (a.inputTokens*price.inputPerMillion + a.outputTokens*price.outputPerMillion)/1e6 : a.tokens*Math.max(price.inputPerMillion,price.outputPerMillion)/1e6;
    }
    return cost;
  } catch { return null; }
}
/** Fixed schema and allowlists. No subject, account ID, email, credential or text field. */
export function metricPoint(env: AccountEnv, event: Event, metadata?: ChatMetadata, detail: { category?: string; rating?: string; used?: number; remaining?: number; count?: number } = {}) {
  const category = CATEGORIES.includes(detail.category as any) ? detail.category! : detail.category ? 'storage_or_security' : 'none';
  const model = metadata?.model && /^@cf\/[a-z0-9_./-]{1,120}$/i.test(metadata.model) ? metadata.model : 'unknown';
  const rating = ['helpful','unhelpful','incorrect'].includes(detail.rating ?? '') ? detail.rating! : 'none';
  const number = (v: unknown, missing = 0) => typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1e9 ? v : missing;
  return { indexes: ['fde-coach-v1'], blobs: [EVENTS.includes(event) ? event : 'error', PROMPT_VERSION, RETRIEVAL_VERSION, model, category, rating, ['ai','fallback','intake'].includes(metadata?.outcome??'') ? metadata!.outcome : 'none'], doubles: [number(detail.count,1), number(metadata?.latencyMs), number(metadata?.tokens,-1), costEstimate(env,metadata) ?? -1, number(metadata?.attempts), number(metadata?.attemptDetails?.filter(a=>a.slot===0&&a.executed).length), number(metadata?.attemptDetails?.filter(a=>a.slot===1&&a.executed).length), number(detail.used), number(detail.remaining), metadata?.usageComplete ? 1 : 0] };
}
export function emitMetric(env: AccountEnv, event: Event, metadata?: ChatMetadata, detail?: Parameters<typeof metricPoint>[3]) {
  if (env.FDE_COACH_METRICS_ENABLED !== 'true') return;
  try { env.COACH_METRICS?.writeDataPoint(metricPoint(env,event,metadata,detail)); } catch { /* Best effort telemetry must not change admission or expose an exception. */ }
}
export async function recordActivity(env: AccountEnv, profile: Account) {
  if (env.FDE_COACH_METRICS_ENABLED !== 'true') return;
  try {
    const date = new Date().toISOString(), day=date.slice(0,10), month=date.slice(0,7);
    const result = await env.COACH_DB!.batch([
      env.COACH_DB!.prepare('INSERT OR IGNORE INTO coach_activity SELECT id,? FROM coach_accounts WHERE id=? AND generation=? AND deleted=0').bind(day,profile.id,profile.generation),
      env.COACH_DB!.prepare('INSERT OR IGNORE INTO coach_monthly_activity SELECT id,? FROM coach_accounts WHERE id=? AND generation=? AND deleted=0').bind(month,profile.id,profile.generation),
    ]);
    if (result[0].meta.changes) { emitMetric(env,'active_day'); emitMetric(env,new Date(profile.created).toISOString().slice(0,10)===day?'new_user':'returning_learner'); }
    if (result[1].meta.changes) emitMetric(env,'active_month');
  } catch { /* Metrics storage is independent from the learner's response. */ }
}
