import type { DurableObjectState, SqlStorage } from "@cloudflare/workers-types";
import { LIMITS } from "./types";

type Row = Record<string, string | number | null>;
type Command = {
  operationId: string; sessionId: string; capability: string; fingerprint: string;
  actor: string; kind: "coach" | "gym" | "chat"; ttlMs: number; duration: number;
  action: "message" | "finish" | "report" | "feedback"; revision: number;
  expectedHead?: string | null; nonce: string; slot: number; result: string;
  success: boolean; completed: boolean;
};
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Only metadata crosses this boundary. No model bindings or external fetches. */
export class AiSecurityCoordinator {
  private sql: SqlStorage;
  constructor(private state: DurableObjectState) {
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, capability TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0, turns INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0, operations INTEGER NOT NULL DEFAULT 0,
      expires INTEGER NOT NULL, deadline INTEGER NOT NULL, head TEXT,
      pending TEXT, blocked INTEGER NOT NULL DEFAULT 0, completed INTEGER NOT NULL DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY, session TEXT NOT NULL, fingerprint TEXT NOT NULL,
      action TEXT NOT NULL, nonce TEXT NOT NULL, deadline INTEGER NOT NULL,
      expires INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      result TEXT, slots INTEGER NOT NULL DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS counters (id TEXT PRIMARY KEY, value INTEGER NOT NULL, expires INTEGER NOT NULL)`);
    this.sql.exec("CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires)");
    this.sql.exec("CREATE INDEX IF NOT EXISTS operation_expiry ON operations(expires)");
    this.sql.exec("CREATE INDEX IF NOT EXISTS operation_deadline ON operations(status, deadline)");
    this.sql.exec("CREATE INDEX IF NOT EXISTS session_pending ON sessions(pending)");
    this.sql.exec("CREATE INDEX IF NOT EXISTS counter_expiry ON counters(expires)");
  }
  private row(query: string, ...args: (string | number | null)[]): Row | undefined {
    return this.sql.exec<Row>(query, ...args).toArray()[0];
  }
  private deny(status: number, error: string): never {
    throw Object.assign(new Error(error), { status });
  }
  private counter(id: string, limit: number, expires: number): void {
    const value = Number(this.row("SELECT value FROM counters WHERE id = ?", id)?.value ?? 0);
    if (value >= limit) this.deny(429, "Usage limit reached. Try again later.");
    this.sql.exec("INSERT INTO counters VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET value = value + 1", id, expires);
  }
  private session(id: string, capability: string, now: number): Row {
    const row = this.row("SELECT * FROM sessions WHERE id = ?", id);
    if (!row || row.capability !== capability || Number(row.expires) <= now) {
      this.deny(403, "This session is unavailable. Start again.");
    }
    return row;
  }
  private uncertain(session: Row, now: number): void {
    if (session.pending) {
      const op = this.row("SELECT * FROM operations WHERE id = ?", session.pending);
      if (op && Number(op.deadline) <= now) {
        this.sql.exec("UPDATE operations SET status = 'uncertain' WHERE id = ?", op.id);
        this.sql.exec("UPDATE sessions SET blocked = 1 WHERE id = ?", session.id);
        session.blocked = 1;
      }
    }
  }
  protected now(): number { return Date.now(); }
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
      const body = await request.json() as Command;
      const action = new URL(request.url).pathname.slice(1);
      const now = this.now();
      // Every read/check/write admission sequence is one synchronous SQLite transaction.
      const result = this.state.storage.transactionSync(() => this.dispatch(action, body, now));
      // Output gates ensure the transaction is durable before this response permits work.
      if (await this.state.storage.getAlarm() === null) await this.state.storage.setAlarm(now + HOUR);
      return Response.json(result);
    } catch (error) {
      const status = Number((error as { status?: number }).status) || 503;
      return Response.json({ error: status === 503 ? "Security admission is unavailable." : (error as Error).message }, { status });
    }
  }
  private dispatch(action: string, b: Command, now: number): Row {
    if (action === "start") {
      if (!["coach", "gym", "chat"].includes(b.kind)) this.deny(400, "Invalid session kind.");
      const prior = this.row("SELECT * FROM operations WHERE id = ?", b.operationId);
      if (prior && Number(prior.expires) > now) return this.retry(prior, b.fingerprint, now);
      if (prior) this.deny(409, "This start key expired. Use a new key.");
      this.counter(`starts:hour:${Math.floor(now / HOUR)}:${b.actor}`, LIMITS.startsPerHour, now + HOUR);
      this.counter(`starts:day:${Math.floor(now / DAY)}`, LIMITS.startsPerDay, (Math.floor(now / DAY) + 1) * DAY);
      const coach = b.kind === "coach";
      const chat = b.kind === "chat";
      const expires = now + (coach ? 3 * HOUR : chat ? HOUR : Math.min(90 * DAY, Math.max(60_000, Number(b.ttlMs))));
      const deadline = coach || chat ? expires : now + (b.duration === 15 ? 15 : 30) * 60_000;
      this.sql.exec("INSERT INTO sessions(id, kind, capability, expires, deadline, pending, operations) VALUES (?, ?, ?, ?, ?, ?, 1)",
        b.sessionId, b.kind, b.capability, expires, deadline, b.operationId);
      return this.reserve(b, b.sessionId, expires, 0, null, now, "start");
    }
    const s = this.session(b.sessionId, b.capability, now);
    if (b.kind && b.kind !== s.kind) this.deny(403, "This session is unavailable. Start again.");
    this.uncertain(s, now);
    if (action === "head") return { revision: s.revision, head: s.head, expiresAt: s.expires, completed: s.completed, attempts: s.attempts };
    if (action === "admit") {
      const prior = this.row("SELECT * FROM operations WHERE id = ?", b.operationId);
      if (prior) return this.retry(prior, b.fingerprint, now);
      if (s.blocked) this.deny(409, "The previous operation has an uncertain outcome. Start a new session.");
      if (s.pending) this.deny(409, "A request is already in progress. Retry the same request shortly.");
      if (b.expectedHead !== undefined && b.expectedHead !== s.head) this.deny(409, "Session state changed. Retry the original request.");
      if (b.revision !== s.revision) this.deny(409, "This session has advanced. Retry the original request or restart.");
      if (Number(s.operations) >= LIMITS.operationsPerSession) this.deny(429, "This session has reached its request limit.");
      if (b.action === "message") {
        if (s.completed || Number(s.deadline) <= now || Number(s.turns) >= (s.kind === "coach" ? LIMITS.coachTurns : s.kind === "chat" ? LIMITS.chatTurns : LIMITS.gymTurns)) {
          this.deny(409, "This session has reached its turn or time limit. Finish or restart.");
        }
      }
      if ((b.action === "report" || b.action === "finish") && s.kind !== "gym") this.deny(409, "Invalid operation.");
      if (b.action === "report" && !s.completed) this.deny(409, "Complete the interview first.");
      this.sql.exec("UPDATE sessions SET pending = ?, operations = operations + 1 WHERE id = ?", b.operationId, s.id);
      return this.reserve(b, String(s.id), Number(s.expires), Number(s.revision), s.head, now, b.action);
    }
    const op = this.row("SELECT * FROM operations WHERE id = ? AND session = ?", b.operationId, s.id);
    if (!op || op.nonce !== b.nonce) this.deny(409, "Invalid reservation.");
    if (action === "commit" && op.status === "done") {
      if (op.result !== b.result) this.deny(409, "Reservation result conflict.");
      return { ok: 1 };
    }
    if (op.status !== "pending" || Number(op.deadline) <= now || s.blocked || s.pending !== op.id) {
      this.deny(409, "This reservation has expired or is no longer active. Start again.");
    }
    if (action === "attempt") {
      // A slot is never reissued, even if the response permitting it was lost.
      if (!Number.isInteger(b.slot) || b.slot < 0 || b.slot > 1 || (Number(op.slots) & (1 << b.slot))) {
        this.deny(409, "This model attempt was already reserved.");
      }
      if (op.action !== "message" && op.action !== "finish") this.deny(409, "No AI is permitted for this operation.");
      if (Number(s.attempts) >= (s.kind === "coach" ? LIMITS.coachAttempts : s.kind === "chat" ? LIMITS.chatAttempts : LIMITS.gymAttempts)) this.deny(429, "Session AI limit reached.");
      this.counter(`ai:day:${Math.floor(now / DAY)}`, LIMITS.dailyAttempts, (Math.floor(now / DAY) + 1) * DAY);
      this.sql.exec("UPDATE sessions SET attempts = attempts + 1 WHERE id = ?", s.id);
      this.sql.exec("UPDATE operations SET slots = slots | ? WHERE id = ?", 1 << b.slot, op.id);
      return { allowed: 1 };
    }
    if (action === "commit") {
      this.sql.exec("UPDATE operations SET status = 'done', result = ? WHERE id = ?", b.result, op.id);
      const advance = b.success && (op.action === "message" || op.action === "finish") ? 1 : 0;
      this.sql.exec(`UPDATE sessions SET pending = NULL, revision = revision + ?, turns = turns + ?,
        head = COALESCE(?, head), completed = MAX(completed, ?) WHERE id = ?`,
        advance, b.success && op.action === "message" ? 1 : 0, b.success ? b.result : null, b.success && b.completed ? 1 : 0, s.id);
      return { ok: 1 };
    }
    this.deny(404, "Unknown admission operation.");
  }
  private reserve(b: Command, sessionId: string, expires: number, revision: number, head: string | number | null, now: number, action: string): Row {
    const nonce = crypto.randomUUID();
    this.sql.exec("INSERT INTO operations(id, session, fingerprint, action, nonce, deadline, expires) VALUES (?, ?, ?, ?, ?, ?, ?)",
      b.operationId, sessionId, b.fingerprint, action, nonce, now + LIMITS.reservationMs, expires);
    return { sessionId, operationId: b.operationId, nonce, revision, head, expiresAt: expires };
  }
  private retry(op: Row, fingerprint: string, now: number): Row {
    if (op.fingerprint !== fingerprint) this.deny(409, "Idempotency key reused with a different request.");
    if (Number(op.expires) <= now) this.deny(403, "This session has expired.");
    if (op.status === "done") return { replay: op.result };
    if (Number(op.deadline) <= now || op.status === "uncertain") {
      this.deny(409, "The previous request has an uncertain outcome. Start a new session.");
    }
    const session = this.row("SELECT * FROM sessions WHERE id = ?", op.session)!;
    return { pending: 1, sessionId: op.session, operationId: op.id, nonce: op.nonce,
      revision: session.revision, head: session.head, expiresAt: session.expires };
  }
  async alarm(): Promise<void> {
    const now = this.now();
    this.state.storage.transactionSync(() => {
      this.sql.exec("UPDATE sessions SET blocked = 1 WHERE pending IN (SELECT id FROM operations WHERE status = 'pending' AND deadline <= ?)", now);
      this.sql.exec("UPDATE operations SET status = 'uncertain' WHERE status = 'pending' AND deadline <= ?", now);
      this.sql.exec("DELETE FROM operations WHERE expires <= ?", now);
      this.sql.exec("DELETE FROM sessions WHERE expires <= ?", now);
      this.sql.exec("DELETE FROM counters WHERE expires <= ?", now);
    });
    if (this.row("SELECT id FROM sessions LIMIT 1") || this.row("SELECT id FROM counters LIMIT 1")) {
      await this.state.storage.setAlarm(now + HOUR);
    }
  }
}
