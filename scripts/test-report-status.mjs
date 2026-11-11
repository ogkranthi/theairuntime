import { build } from "esbuild";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

// Real React/Chromium regression, with every API response stubbed locally.
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import ResultScreen from './learn/src/components/fde-gym/ResultScreen.tsx';
document.body.innerHTML = '<div id=app></div>';
const root = createRoot(document.getElementById('app'));
const summary = { verdict: 'PASS', score: 70, targetLevel: 'fde',
  strongest: {label: 'Evidence', reason: 'Practice'}, biggestGap: {label: 'Testing', reason: 'Practice'},
  barRelative: {foundations: 'pass', fde: 'pass', senior: 'gap'},
  criticalCoverage: {sufficient: true, coveredGroups: [], missingGroups: []}, degraded: false };
const cases = [
  {name: 'uncertain HTTP 503', status: 503, body: {error: 'Delivery outcome unknown'}},
  {name: 'pending HTTP 409', status: 409, body: {error: 'Request pending'}},
  {name: 'lost response', lost: true},
  {name: 'empty HTTP success', body: {}},
  {name: 'negative acknowledgement', body: {ok: true, emailed: false, webhookDelivered: false}},
  {name: 'subscription only', body: {ok: true, subscribed: true}},
  {name: 'malformed success', malformed: true},
  {name: 'email acknowledgement', body: {ok: true, emailed: true}, accepted: true},
  {name: 'webhook acknowledgement', body: {ok: true, emailed: false, webhookDelivered: true}, accepted: true},
];
const results = {passed: 0, failed: []};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
globalThis.reportTests = (async () => {
  for (const test of cases) {
    try {
      let calls = 0;
      window.fetch = async path => {
        if (path !== '/api/fde-gym/report') throw new Error('Unexpected API call');
        calls++;
        if (test.lost) throw new Error('Response lost; delivery unconfirmed');
        return test.malformed ? new Response('unreadable') : Response.json(test.body, {status: test.status ?? 200});
      };
      root.render(<ResultScreen key={test.name} session={{id: 'local-session', accessToken: 'local-only'}} summary={summary} onRestart={() => {}} />);
      await delay(80);
      const email = document.querySelector('input[type=email]');
      if (!email) throw new Error('Report form missing');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(email, 'person@test.invalid');
      email.dispatchEvent(new Event('input', {bubbles: true}));
      await delay(30);
      const button = document.querySelector('.fg-report-gate button');
      if (!button || button.disabled) throw new Error('Report button is not available');
      button.click();
      await delay(80);
      const gate = document.querySelector('.fg-report-gate');
      const accepted = Boolean(gate.querySelector('.fg-report-sent'));
      if (calls !== 1) throw new Error('Expected one stubbed request, got ' + calls);
      if (accepted !== Boolean(test.accepted)) throw new Error('Incorrect acceptance display: ' + gate.textContent);
      if (!test.accepted && !gate.querySelector('[role=alert]')) throw new Error('Missing uncertainty/error message');
      if (/REPORT SENT|Check your inbox/.test(gate.textContent)) throw new Error('False delivery claim');
      if (test.accepted && !/not\\s+yet confirmed/.test(gate.textContent)) throw new Error('Missing inbox uncertainty qualification');
      results.passed++;
    } catch (error) { results.failed.push({name: test.name, error: String(error)}); }
  }
  return results;
})();
`;
const directory = await mkdtemp(join(tmpdir(), "air-report-browser-"));
let browser;
let socket;
const server = createServer((_request, response) => {
  response.setHeader("content-type", "text/html");
  response.end("<!doctype html><div id=app></div>");
});
try {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const fixtureUrl = `http://127.0.0.1:${server.address().port}/`;
  const compiled = await build({ stdin: { contents: fixture, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, format: "iife", platform: "browser", jsx: "automatic", write: false,
    alias: { react: join(process.cwd(), "node_modules/react"), "react-dom": join(process.cwd(), "node_modules/react-dom") },
    define: { "process.env.NODE_ENV": '\"production\"' } });
  const profile = join(directory, "profile");
  let diagnostic = "";
  browser = spawn(process.env.CHROMIUM_BIN || "chromium", [
    "--headless", "--no-sandbox", "--disable-gpu", "--disable-background-networking",
    "--disable-component-update", "--disable-extensions", "--disable-sync", "--no-first-run",
    "--no-default-browser-check", "--host-resolver-rules=EXCLUDE localhost, EXCLUDE 127.0.0.1, MAP * ~NOTFOUND",
    `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank",
  ], { detached: true, stdio: ["ignore", "ignore", "pipe"] });
  browser.stderr.on("data", value => { diagnostic = (diagnostic + value).slice(-3000); });
  let port;
  const started = Date.now();
  while (!port && Date.now() - started < 10_000) {
    try { port = Number((await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); }
    catch { await new Promise(resolve => setTimeout(resolve, 50)); }
  }
  assert.ok(port, `Chromium did not become ready: ${diagnostic}`);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then(response => response.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, {once: true}); socket.addEventListener("error", reject, {once: true}); });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data));
    if (!pending.has(message.id)) return;
    const { resolve, reject, timeout } = pending.get(message.id);
    clearTimeout(timeout); pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  });
  function command(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Browser command timed out: ${method}`)); }, 15_000);
      pending.set(id, {resolve, reject, timeout});
      socket.send(JSON.stringify({id, method, params}));
    });
  }
  const navigation = await command("Page.navigate", {url: fixtureUrl});
  assert.ok(!navigation.errorText, navigation.errorText);
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) {
    const state = await command("Runtime.evaluate", { expression: `location.href === ${JSON.stringify(fixtureUrl)} && document.readyState === 'complete'`, returnByValue: true });
    ready = state.result.value === true;
    if (!ready) await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert.ok(ready, "The local browser fixture did not load");
  const loaded = await command("Runtime.evaluate", {expression: compiled.outputFiles[0].text});
  assert.ok(!loaded.exceptionDetails, JSON.stringify(loaded.exceptionDetails));
  const evaluated = await command("Runtime.evaluate", {expression: "globalThis.reportTests", awaitPromise: true, returnByValue: true});
  assert.ok(!evaluated.exceptionDetails, JSON.stringify(evaluated.exceptionDetails));
  const results = evaluated.result.value;
  assert.deepEqual(results.failed, []);
  assert.equal(results.passed, 9);
  console.log("Passed: 9 rendered report-status scenarios in Chromium; all providers stubbed.");
} finally {
  socket?.close();
  if (browser?.pid) {
    const exited = browser.exitCode !== null ? Promise.resolve() : new Promise(resolve => browser.once("exit", resolve));
    try { process.kill(-browser.pid, "SIGTERM"); } catch {}
    let timer;
    await Promise.race([exited, new Promise(resolve => { timer = setTimeout(resolve, 2000); })]);
    clearTimeout(timer);
  }
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
