import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { build } from "esbuild";

// Browser regression against built Astro pages and the actual local guided
// lesson handler, with no AI binding, production secrets, or external traffic.
const temporary = await mkdtemp(join(tmpdir(), "air-coach-ui-"));
const artifactDir = resolve("docs/ui/151");
const site = resolve("learn/dist");
const checks = [];
const apiCalls = [];
let apiMode = "normal";
let held;
let browser;
let socket;
const compiled = await build({entryPoints: ["src/coach/routes.ts"], bundle: true, format: "esm", platform: "node", write: false});
await writeFile(join(temporary, "lesson.mjs"), compiled.outputFiles[0].text);
const { handleCoachRequest } = await import(pathToFileURL(join(temporary, "lesson.mjs")).href);
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname.startsWith("/api/coach/")) {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    apiCalls.push({ path: url.pathname, body });
    if (apiMode === "failure" && url.pathname.endsWith("message")) {
      response.writeHead(503, {"content-type":"application/json"}); response.end(JSON.stringify({error:"Local connection interruption. Retry your last request."})); return;
    }
    if (apiMode === "hold" && url.pathname.endsWith("message")) await new Promise(resolve => { held = resolve; });
    const result = await handleCoachRequest(new Request(url.href, {method: request.method, ...(body ? {body} : {})}), {COACH_TOKEN_SECRET: "local-browser-test-only-not-a-production-secret"});
    response.writeHead(result.status, {"content-type":"application/json"}); response.end(await result.text()); return;
  }
  const path = resolve(site, `.${decodeURIComponent(url.pathname)}`);
  if (!path.startsWith(site + "/") && path !== site) { response.writeHead(403); response.end(); return; }
  try {
    const file = extname(path) ? path : join(path, "index.html");
    const data = await readFile(file);
    const types = { ".html":"text/html", ".js":"application/javascript", ".css":"text/css", ".svg":"image/svg+xml", ".woff2":"font/woff2", ".png":"image/png" };
    response.writeHead(200, {"content-type":types[extname(file)] ?? "application/octet-stream", "cache-control":"no-store"}); response.end(data);
  } catch { response.writeHead(404); response.end("Not found"); }
});
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let cmd;
let evaluate;
const browserErrors = [];
const externalRequests = [];
try {
  await mkdir(artifactDir, {recursive:true});
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const profile = join(temporary, "profile");
  let diagnostic = "";
  browser = spawn(process.env.CHROMIUM_BIN || "chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--disable-background-networking", "--disable-extensions", "--disable-sync", "--no-first-run", "--disable-component-update", "--host-resolver-rules=EXCLUDE localhost, EXCLUDE 127.0.0.1, MAP * ~NOTFOUND", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank"], {detached:true,stdio:["ignore","ignore","pipe"]});
  browser.stderr.on("data", value => {diagnostic = (diagnostic + value).slice(-2000);});
  let port;
  for (let i = 0; i < 160 && !port; i++) { try {port = Number((await readFile(join(profile,"DevToolsActivePort"),"utf8")).split("\n")[0]);} catch {await wait(50);} }
  assert.ok(port, diagnostic);
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method:"PUT"}).then(r=>r.json());
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  const pending = new Map(); let next = 0;
  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === "Network.requestWillBeSent") {
      const url = message.params.request.url;
      if (!url.startsWith(origin) && !url.startsWith("data:")) externalRequests.push(url);
    }
    if (message.method === "Page.javascriptDialogOpening") void cmd("Page.handleJavascriptDialog",{accept:true});
    if (!pending.has(message.id)) return;
    const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timeout);
    if(message.error) item.reject(new Error(JSON.stringify(message.error))); else item.resolve(message.result);
  });
  cmd = (method,params={}) => new Promise((resolve,reject)=>{const id=++next;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},20000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
  evaluate = async expression => {const result=await cmd("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true}); if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);return result.result.value;};
  await cmd("Runtime.enable"); await cmd("Page.enable"); await cmd("Network.enable");
  async function until(expression, label) {for(let i=0;i<100;i++){if(await evaluate(expression))return;await wait(50);}throw new Error(`Timed out: ${label}`);}
  let expectedWidth;
  async function viewport(width,height) {await cmd("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<620});expectedWidth=width;await wait(150);}
  async function visit(path="/") {await cmd("Page.navigate",{url:origin+path});await until("document.querySelector('astro-island')?.hasAttribute('ssr') === false && Boolean(document.querySelector('.fde-coach'))","React hydration");await evaluate("document.fonts.ready.then(()=>true)");await wait(100);}
  async function click(selector) {await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.focus();el.click();})()`);await wait(120);}
  async function type(text) {await evaluate(`(()=>{const el=document.querySelector('#fde-message');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(text)});el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();})()`);await wait(50);}
  async function overflow(label) {assert.equal(await evaluate("innerWidth"),expectedWidth,`${label}: exact viewport width`);assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),`${label}: horizontal overflow`);checks.push(`${label}: no horizontal overflow`);}
  async function resourceLinks() {
    for (const href of await evaluate("Array.from(document.querySelectorAll('.fde-resource-list a'),a=>a.getAttribute('href'))")) {
      assert.equal((await fetch(origin+href)).status,200,`Existing resource must resolve: ${href}`);
    }
  }
  async function capture(name) {const image=await cmd("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(join(artifactDir,name),Buffer.from(image.data,"base64"));}
  for (const [width,height] of [[360,800],[390,844],[768,1024],[1440,1000]]) {
    await viewport(width,height);await visit();await overflow(`welcome ${width}`);
    assert.equal(await evaluate("document.querySelectorAll('.fde-starter').length"),3);
    assert.ok(await evaluate("document.querySelector('#fde-message').getBoundingClientRect().top < innerHeight"),`composer visible at ${width}`);
    if(width===390||width===1440) await capture(`${width===390?'mobile':'desktop'}-welcome.png`);
    const before = apiCalls.length;
    await click('.fde-starter--orange');
    await until("Boolean(document.querySelector('.fde-coach--active'))","active chat");await overflow(`conversation ${width}`);
    assert.equal(apiCalls.length,before,"Curated chat must not call an AI endpoint");
    assert.ok(await evaluate("document.querySelector('.fde-transcript').textContent.includes('Curated guidance')"));
    assert.ok(await evaluate("document.querySelector('.fde-starters') === null"),"Welcome cards stay out of active chat");
    if(width===390||width===1440) await capture(`${width===390?'mobile':'desktop'}-conversation.png`);
  }
  checks.push("Four responsive widths, exactly three starters, visible composer, honest resource chat, no new AI requests");
  await viewport(390,844);await visit();
  await click('.coach-resources summary');assert.ok(await evaluate("document.querySelector('.coach-resources').open"));
  await cmd("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape"});await cmd("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape"});
  assert.equal(await evaluate("document.querySelector('.coach-resources').open"),false);
  assert.ok(await evaluate("document.activeElement.matches('.coach-resources summary')"));
  checks.push("Resource menu supports Escape and returns focus");
  for (let i=0;i<3;i++){await visit();const before=apiCalls.length;await click(`.fde-starter:nth-child(${i+1})`);assert.ok(await evaluate("document.querySelectorAll('.fde-resource-list a').length > 0"));assert.equal(apiCalls.length,before);await resourceLinks();}
  for (let i=0;i<4;i++){await visit();const before=apiCalls.length;await click(`.fde-prompts button:nth-child(${i+1})`);assert.ok(await evaluate("document.querySelectorAll('.fde-resource-list a').length > 0"));assert.equal(apiCalls.length,before);await resourceLinks();}
  checks.push("All three starters and four quick prompts respond without API calls; every suggested resource resolves");
  await visit();await type("My local question");
  await evaluate("document.querySelector('#fde-message').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:229,isComposing:true,bubbles:true}))");
  assert.equal(await evaluate("document.querySelectorAll('.fde-turn').length"),0,"IME composition must not submit");
  await cmd("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",modifiers:8});await cmd("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",modifiers:8});
  assert.equal(await evaluate("document.querySelectorAll('.fde-turn').length"),0,"Shift+Enter must not submit");
  await cmd("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter"});await cmd("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter"});
  await until("document.querySelectorAll('.fde-turn').length === 2","Enter submission");
  checks.push("IME-safe Enter, Shift+Enter newline, and real Enter submission");
  await type("A very long but non-sensitive example. ".repeat(45));
  assert.ok(await evaluate("document.querySelector('#fde-message').offsetHeight <= 160"));
  await viewport(390,440);await wait(200);
  assert.ok(await evaluate("document.querySelector('.fde-send').getBoundingClientRect().bottom <= visualViewport.height + 1"),"composer follows a resized viewport");
  await overflow("virtual-keyboard-height simulation");
  checks.push("Textarea grows within its cap; anchored composer survives a 440px visual viewport");
  await viewport(390,844);await visit('/coach/?lesson=agent-system-design');
  await until("Boolean(document.querySelector('.fde-lesson-part--ask'))","actual local guided lesson");
  assert.ok(apiCalls.some(item=>item.path.endsWith('/start')));
  apiMode="failure";await type("A useful customer outcome with clear evidence.");await click('.fde-send');
  await until("Boolean(document.querySelector('.fde-error'))","retry state");
  const beforeRetry=await evaluate("document.querySelectorAll('.fde-turn--learner').length");
  const failedBody=apiCalls.at(-1).body;
  apiMode="hold";await click('.fde-error button');
  await until("Boolean(document.querySelector('.fde-status'))","loading state");
  assert.equal(apiCalls.at(-1).body,failedBody,"Retry must use the original answer and context");
  assert.equal(await evaluate("document.querySelectorAll('.fde-turn--learner').length"),beforeRetry,"Retry cannot duplicate a learner turn");
  apiMode="normal";held?.();
  await until("document.querySelector('.fde-error') === null && document.querySelector('.fde-status') === null","retry recovery");
  assert.ok(await evaluate("document.querySelector('.fde-disclosure').textContent.includes('written lesson')"));
  checks.push("Actual existing lesson protocol, written fallback, loading, failed network response, exact retry, no duplicate turns");
  for (let i=0;i<8 && !await evaluate("Boolean(document.querySelector('.fde-summary'))");i++) {
    await type("A fictional customer outcome, with evidence and a human approval boundary.");await click('.fde-send');
    await until("document.querySelector('.fde-status') === null","next lesson step");
  }
  assert.ok(await evaluate("Boolean(document.querySelector('.fde-summary'))"),"Original lesson can complete");
  assert.equal(await evaluate("document.querySelectorAll('.fde-summary dl > div').length"),12,"All recap and design items remain available");
  assert.equal(await evaluate("document.querySelector('.fde-summary a').getAttribute('href')"),"/coach/next/");
  checks.push("Full authored lesson completes with all six recap and six design entries and the existing continuation URL");
  await cmd("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.fde-turn')).animationName"),"none");
  checks.push("Reduced motion disables entry animations");
  await cmd("Emulation.setScriptExecutionDisabled",{value:true});await cmd("Page.navigate",{url:origin+'/'});await wait(250);
  const tree=await cmd("DOM.getDocument",{depth:-1});const html=await cmd("DOM.getOuterHTML",{nodeId:tree.root.nodeId});
  assert.ok(html.outerHTML.includes("Learning is still open."));
  assert.ok(html.outerHTML.includes('/career/interviews/'));
  checks.push("No-JavaScript page contains meaningful learning links and an explicit explanation");
  assert.deepEqual(browserErrors,[]);
  assert.deepEqual(externalRequests,[]);
  await writeFile(join(artifactDir,"browser-checks.json"),JSON.stringify({checks,screenshots:["mobile-welcome.png","mobile-conversation.png","desktop-welcome.png","desktop-conversation.png"],api:"Existing local Coach handler, AI absent; no production calls",physicalKeyboard:"Not tested on physical Android/iOS devices; CDP viewport resize only",mockup:"Attachment unavailable; issue #151 visual specification used"},null,2)+'\n');
  console.log(`Passed ${checks.length} browser checks. Four screenshots saved under docs/ui/151. No external requests.`);
} finally {
  held?.();socket?.close();
  if(browser?.pid){const exited=browser.exitCode!==null?Promise.resolve():new Promise(resolve=>browser.once('exit',resolve));try{process.kill(-browser.pid,'SIGTERM');}catch{}let timer;await Promise.race([exited,new Promise(resolve=>{timer=setTimeout(resolve,2000);})]);clearTimeout(timer);}
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
