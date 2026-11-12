export interface CoachPart {
  kind: "say" | "principle" | "ask";
  text: string;
}

export interface StageMeta {
  number: number;
  total: number;
  title: string;
}

export interface SummaryLine {
  label: string;
  body: string;
}

export interface CoachSummary {
  recap: SummaryLine[];
  design: SummaryLine[];
  takeaway: string;
}

export interface CoachReply {
  token: string;
  parts: CoachPart[];
  stage: StageMeta;
  done: boolean;
  degraded: boolean;
  aiAvailable: boolean;
  summary?: CoachSummary;
  lesson?: { id: string; title: string; subtitle: string };
}

export interface StageTurn {
  role: "coach" | "learner";
  text: string;
}

export interface CoachHealth {
  ok: boolean;
  aiConfigured: boolean;
  tokenConfigured: boolean;
  countersConfigured: boolean;
  securityConfigured: boolean;
}

export class CoachRequestError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
  get retryable() { return ![400, 403, 413, 429].includes(this.status ?? 0); }
}

const TIMEOUT_MS = 20_000;
const unreadable = () => new CoachRequestError("The lesson response could not be read. Retry the original request or start a new conversation.");
function record(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function lines(value: unknown): value is SummaryLine[] {
  return Array.isArray(value) && value.length > 0 && value.every(line => record(line) && typeof line.label === "string" && typeof line.body === "string");
}
export function validateCoachReply(value: unknown): CoachReply {
  if (!record(value) || typeof value.token !== "string" || !value.token || !record(value.stage)
    || !Number.isInteger(value.stage.number) || !Number.isInteger(value.stage.total)
    || value.stage.number < 1 || value.stage.number > value.stage.total || (typeof value.stage.title !== "string" || !value.stage.title.trim())
    || !Array.isArray(value.parts) || !value.parts.every(part => record(part) && ["say", "principle", "ask"].includes(part.kind) && typeof part.text === "string")
    || (!value.done && value.parts.length === 0) || typeof value.done !== "boolean" || typeof value.degraded !== "boolean" || typeof value.aiAvailable !== "boolean") throw unreadable();
  if (value.done || value.summary !== undefined) {
    if (!record(value.summary) || !lines(value.summary.recap) || !lines(value.summary.design) || typeof value.summary.takeaway !== "string") throw unreadable();
  }
  return value as CoachReply;
}

/** Bound headers, body consumption, and validation, even if fetch ignores abort. */
async function request<T>(path: string, options: RequestInit, validate: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let interrupt!: (reason: unknown) => void;
  const interrupted = new Promise<never>((_resolve, reject) => { interrupt = reject; });
  const abort = () => { controller.abort(); interrupt(new DOMException("Request canceled", "AbortError")); };
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => {
    controller.abort();
    interrupt(new CoachRequestError("The connection timed out. The outcome is unknown. Retry the original request or start a new conversation."));
  }, TIMEOUT_MS);
  if (signal?.aborted) abort();
  try {
    return await Promise.race([interrupted, (async () => {
      if (controller.signal.aborted) throw new DOMException("Request canceled", "AbortError");
      const response = await fetch(path, { ...options, signal: controller.signal });
      const data: unknown = await response.json().catch(() => undefined);
      if (!response.ok) throw new CoachRequestError(record(data) && typeof data.error === "string" ? data.error : "The lesson could not continue safely. Retry the original request or restart.", response.status);
      return validate(data);
    })()]);
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}

/** One in-memory conversation. No eviction, shared credentials, or automatic retries. */
export function createCoachClient() {
  let clientScope: string | undefined;
  let pending: Readonly<{ path: string; payload: string; key: string; scope?: string }> | undefined;
  let accepted: CoachReply | undefined;
  let busy = false;
  let abandoned = false;
  async function post(path: string, body: unknown, signal?: AbortSignal) {
    if (abandoned) throw new DOMException("Conversation abandoned", "AbortError");
    if (busy) throw new CoachRequestError("A request is already in progress. Retry the original request shortly.", 409);
    const payload = JSON.stringify(body);
    if (pending && (pending.path !== path || pending.payload !== payload)) throw new CoachRequestError("Resolve the original request or explicitly start a new conversation.", 409);
    if (!pending) {
      if (path.endsWith("/start")) clientScope ??= crypto.randomUUID() + crypto.randomUUID();
      pending = Object.freeze({ path, payload, key: crypto.randomUUID(), ...(path.endsWith("/start") ? { scope: clientScope } : {}) });
    }
    const operation = pending;
    busy = true;
    try {
      const reply = await request(operation.path, {
        method: "POST", body: operation.payload,
        headers: { "content-type": "application/json", "idempotency-key": operation.key, ...(operation.scope ? { "x-session-client": operation.scope } : {}) },
      }, validateCoachReply, signal);
      if (abandoned || signal?.aborted) throw new DOMException("Conversation abandoned", "AbortError");
      accepted = reply;
      return reply;
    } finally { busy = false; }
  }
  return {
    startLesson: (signal?: AbortSignal) => post("/api/coach/start", {}, signal),
    sendMessage: (token: string, message: string, stageTurns: StageTurn[], signal?: AbortSignal) => post("/api/coach/message", { token, message, stageTurns }, signal),
    acknowledge(reply: CoachReply) {
      if (abandoned || accepted !== reply) throw new Error("This reply does not belong to the current operation.");
      pending = undefined; accepted = undefined;
    },
    abandon() { abandoned = true; pending = undefined; accepted = undefined; clientScope = undefined; },
  };
}

// Compatibility for the original component and external callers. The chat-first
// component owns a separate client and acknowledges only after applying a reply.
const defaultClient = createCoachClient();
export async function startLesson(signal?: AbortSignal) {
  const reply = await defaultClient.startLesson(signal); defaultClient.acknowledge(reply); return reply;
}
export async function sendMessage(token: string, message: string, stageTurns: StageTurn[], signal?: AbortSignal) {
  const reply = await defaultClient.sendMessage(token, message, stageTurns, signal); defaultClient.acknowledge(reply); return reply;
}
export async function readHealth(signal?: AbortSignal): Promise<CoachHealth | null> {
  try {
    return await request("/api/coach/health", {}, value => {
      if (!record(value) || !["ok", "aiConfigured", "tokenConfigured", "countersConfigured", "securityConfigured"].every(key => typeof value[key] === "boolean")) throw unreadable();
      return value as CoachHealth;
    }, signal);
  } catch { return null; }
}
