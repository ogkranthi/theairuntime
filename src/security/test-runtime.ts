import { Miniflare } from "miniflare";
import { build } from "esbuild";
import type { SecurityNamespace } from "./types";

/** Test-only subclass: controlled clock and metadata inspection never ship. */
export async function securityRuntime(persist: string | boolean = false) {
  const source = `
    import { AiSecurityCoordinator } from './src/security/coordinator.ts';
    export class TestCoordinator extends AiSecurityCoordinator {
      constructor(ctx) { super(ctx); this.ctx = ctx; ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS test_clock(now INTEGER)'); }
      now() { return this.ctx.storage.sql.exec('SELECT now FROM test_clock').toArray()[0]?.now ?? Date.now(); }
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === '/__reset') {
          for (const table of ['sessions', 'operations', 'counters', 'test_clock']) this.ctx.storage.sql.exec('DELETE FROM ' + table);
          return Response.json({ok: true});
        }
        if (path === '/__counter') {
          const body = await request.json();
          this.ctx.storage.sql.exec('INSERT INTO counters VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value, expires = excluded.expires', body.id, body.value, body.expires);
          return Response.json({ok: true});
        }
        if (path === '/__clock') {
          const body = await request.json();
          this.ctx.storage.sql.exec('DELETE FROM test_clock');
          this.ctx.storage.sql.exec('INSERT INTO test_clock VALUES (?)', body.now);
          return Response.json({ok: true});
        }
        if (path === '/__inspect') {
          return Response.json(Object.fromEntries(['sessions', 'operations', 'counters'].map(table =>
            [table, this.ctx.storage.sql.exec('SELECT * FROM ' + table).toArray()])));
        }
        if (path === '/__alarm') { await this.alarm(); return Response.json({ok: true}); }
        return super.fetch(request);
      }
    }
    export default { fetch() { return new Response('test only'); } };
  `;
  const compiled = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: "js" }, bundle: true, write: false, format: "esm", platform: "neutral" });
  const mf = new Miniflare({ modules: true, script: compiled.outputFiles[0].text,
    compatibilityDate: "2025-05-01", durableObjects: { AI_SECURITY: { className: "TestCoordinator", useSQLite: true } },
    durableObjectsPersist: persist, });
  const namespace = await mf.getDurableObjectNamespace("AI_SECURITY");
  const stub = namespace.get(namespace.idFromName("coach-gym-v1"));
  return { mf, namespace: namespace as unknown as SecurityNamespace,
    async rpc(path: string, body: unknown = {}) {
      const response = await stub.fetch(`https://security/${path}`, { method: "POST", body: JSON.stringify(body) });
      return { status: response.status, body: await response.json() as Record<string, any> };
    },
  };
}
