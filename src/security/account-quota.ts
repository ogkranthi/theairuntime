import type { SqlStorage } from '@cloudflare/workers-types';
import { LIMITS } from './types';
type Row = Record<string, string | number | null>;
type Input = { user: string; generation: string; conversation: string; operation: string; fingerprint: string; revision: number; start: boolean; limit: number; requestLimit: number; nonce: string; ai: boolean; slot: number; actor: string };
const DAY = 86_400_000;
/** Synchronous helper inside the existing DO transaction, never a separate object. */
export class AccountQuota {
  constructor(private sql: SqlStorage, private deny: (status: number, error: string) => never, private counter: (id: string, limit: number, expires: number) => void) {
    sql.exec(`CREATE TABLE IF NOT EXISTS account_heads (id TEXT PRIMARY KEY, user TEXT NOT NULL, generation TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, pending TEXT, turns INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, deadline INTEGER NOT NULL, expires INTEGER NOT NULL)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS account_operations (id TEXT PRIMARY KEY, user TEXT NOT NULL, generation TEXT NOT NULL, conversation TEXT NOT NULL, fingerprint TEXT NOT NULL, nonce TEXT NOT NULL, day INTEGER NOT NULL, start INTEGER NOT NULL, status TEXT NOT NULL, charged INTEGER NOT NULL DEFAULT 0, slots INTEGER NOT NULL DEFAULT 0, deadline INTEGER NOT NULL, expires INTEGER NOT NULL)`);
    sql.exec('CREATE INDEX IF NOT EXISTS account_usage ON account_operations(user, day, status)');
  }
  private row(query: string, ...args: (string | number | null)[]) { return this.sql.exec<Row>(query, ...args).toArray()[0]; }
  private usage(b: Input, now: number) {
    const day = Math.floor(now / DAY);
    const row = this.row(`SELECT COALESCE(SUM(charged),0) AS used, COALESCE(SUM(CASE WHEN start=0 AND status!='done' THEN 1 ELSE 0 END),0) AS reserved FROM account_operations WHERE user=? AND day=?`, b.user, day)!;
    return { used: Number(row.used), reserved: Number(row.reserved), limit: b.limit, remaining: Math.max(0, b.limit - Number(row.used) - Number(row.reserved)), resetsAt: (day + 1) * DAY };
  }
  dispatch(action: string, b: Input, now: number): Record<string, unknown> {
    if (!/^[a-f0-9]{64}$/.test(b.user) || !Number.isInteger(b.limit) || b.limit < 0 || b.limit > 100 || !Number.isInteger(b.requestLimit) || b.requestLimit < 0 || b.requestLimit > 200) this.deny(503, 'Account admission is unavailable.');
    if (action === 'user-status') return this.usage(b, now);
    if (action === 'user-delete') {
      this.sql.exec(`UPDATE account_heads SET expires=? WHERE user=? AND generation=?`, now, b.user, b.generation);
      // Keep spent/reserved accounting until its UTC bucket expires; deletion cannot reset quotas.
      return { ok: true };
    }
    const op = this.row('SELECT * FROM account_operations WHERE id=?', b.operation);
    if (op && (op.user !== b.user || op.generation !== b.generation || op.conversation !== b.conversation || op.fingerprint !== b.fingerprint)) this.deny(409, 'Request key conflict.');
    if (action === 'user-reserve') {
      if (op) return { nonce: op.nonce, state: op.status, deadline: op.deadline, ...this.usage(b, now) };
      let head = this.row('SELECT * FROM account_heads WHERE id=?', b.conversation);
      if (b.start) {
        if (head) this.deny(409, 'Conversation already exists.');
        this.counter(`starts:hour:${Math.floor(now / 3_600_000)}:${b.actor}`, LIMITS.startsPerHour, now + 3_600_000);
        this.counter(`starts:day:${Math.floor(now / DAY)}`, LIMITS.startsPerDay, (Math.floor(now / DAY) + 1) * DAY);
        this.sql.exec('INSERT INTO account_heads(id,user,generation,deadline,expires) VALUES(?,?,?,?,?)', b.conversation, b.user, b.generation, now + 3_600_000, now + 90 * DAY);
        head = this.row('SELECT * FROM account_heads WHERE id=?', b.conversation);
      }
      if (!head || head.user !== b.user || head.generation !== b.generation || Number(head.expires) <= now) this.deny(404, 'Conversation unavailable.');
      if (head.pending) this.deny(409, 'A request is pending. Retry its original key.');
      if (head.revision !== b.revision) this.deny(409, 'Conversation changed. Reload it before continuing.');
      if (!b.start) {
        if (Number(head.deadline) <= now) {
          this.sql.exec('UPDATE account_heads SET deadline=?,turns=0,attempts=0 WHERE id=?', now + 3_600_000, b.conversation);
        } else if (Number(head.turns) >= LIMITS.chatTurns) this.deny(409, 'This bounded session is complete. Start a new conversation or return later.');
        if (this.usage(b, now).remaining <= 0) this.deny(429, 'Your free coaching allowance is reserved or used. Try after the UTC reset.');
        this.counter(`account:requests:${Math.floor(now / DAY)}:${b.user}`, b.requestLimit, (Math.floor(now / DAY) + 1) * DAY);
      }
      const nonce = crypto.randomUUID();
      this.sql.exec(`INSERT INTO account_operations(id,user,generation,conversation,fingerprint,nonce,day,start,status,deadline,expires) VALUES(?,?,?,?,?,?,?,?,'pending',?,?)`, b.operation, b.user, b.generation, b.conversation, b.fingerprint, nonce, Math.floor(now / DAY), b.start ? 1 : 0, now + LIMITS.reservationMs, now + 90 * DAY);
      this.sql.exec('UPDATE account_heads SET pending=? WHERE id=?', b.operation, b.conversation);
      return { nonce, state: 'new', deadline: now + LIMITS.reservationMs, ...this.usage(b, now) };
    }
    if (!op || op.nonce !== b.nonce) this.deny(409, 'Invalid account reservation.');
    const head = this.row('SELECT * FROM account_heads WHERE id=?', b.conversation);
    if (!head || Number(head.expires) <= now || head.user !== b.user || head.generation !== b.generation) this.deny(409, 'Conversation unavailable.');
    if (action === 'user-commit') {
      if (op.status === 'done') {
        if (Boolean(op.charged) !== b.ai) this.deny(409, 'Result conflict.');
        return this.usage(b, now);
      }
      if (head.pending !== op.id) this.deny(409, 'Reservation conflict.');
      const day = Math.floor(now / DAY);
      if (b.ai && Number(op.day) !== day && this.usage(b, now).remaining <= 0) this.deny(429, 'Your free allowance is used. Retry after the UTC reset.');
      this.sql.exec(`UPDATE account_operations SET status='done', charged=?, day=? WHERE id=?`, b.ai && !op.start ? 1 : 0, b.ai ? day : op.day, op.id);
      this.sql.exec('UPDATE account_heads SET pending=NULL, revision=revision+?, turns=turns+? WHERE id=?', op.start ? 0 : 1, op.start ? 0 : 1, b.conversation);
      return this.usage(b, now);
    }
    if (action === 'user-attempt') {
      if (op.status !== 'pending' || Number(op.deadline) <= now || Number(head.deadline) <= now || head.pending !== op.id || op.start) this.deny(409, 'Reservation expired. Retry the original request.');
      if (!Number.isInteger(b.slot) || b.slot < 0 || b.slot > 1 || (Number(op.slots) & (1 << b.slot))) this.deny(409, 'Attempt already reserved.');
      if (Number(head.attempts) >= LIMITS.chatAttempts) this.deny(429, 'Session attempt limit reached.');
      this.counter(`ai:day:${Math.floor(now / DAY)}`, LIMITS.dailyAttempts, (Math.floor(now / DAY) + 1) * DAY);
      this.sql.exec('UPDATE account_operations SET slots=slots|? WHERE id=?', 1 << b.slot, op.id);
      this.sql.exec('UPDATE account_heads SET attempts=attempts+1 WHERE id=?', b.conversation);
      return { allowed: true };
    }
    this.deny(404, 'Unknown account operation.');
  }
  cleanup(now: number) {
    this.sql.exec(`UPDATE account_operations SET status='uncertain' WHERE status='pending' AND deadline<=?`, now);
    this.sql.exec('DELETE FROM account_operations WHERE expires<=?', now);
    this.sql.exec('DELETE FROM account_heads WHERE expires<=?', now);
  }
}
