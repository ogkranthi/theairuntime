import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join, extname } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

// Browser regression against built Astro pages and the actual local guided
// lesson handler, with no AI binding, production secrets, or external traffic.
const temporary = await mkdtemp(join(tmpdir(), "air-coach-ui-"));
const artifactDir = resolve(process.env.AIR_COACH_ARTIFACT_DIR || "docs/ui/151");
const site = resolve(process.env.AIR_COACH_SITE || "learn/dist");
const isBeta = process.env.AIR_COACH_BETA === "1";
let modelCalls = 0;
let providerFails = false;
const checks = [];
const apiCalls = [];
let apiMode = "normal";
let held;
let browser;
let socket;
const compiled = await build({entryPoints: ["src/coach/routes.ts"], bundle: true, format: "esm", platform: "node", write: false});
await writeFile(join(temporary, "lesson.mjs"), compiled.outputFiles[0].text);
const { handleCoachRequest } = await import(pathToFileURL(join(temporary, "lesson.mjs")).href);
const coordinator = await build({stdin:{contents:"export { AiSecurityCoordinator } from './src/security/coordinator.ts'; export default {fetch(){return new Response('local only')}};",resolveDir:process.cwd()},bundle:true,write:false,format:"esm",platform:"neutral"});
const runtime = new Miniflare({modules:true,script:coordinator.outputFiles[0].text,compatibilityDate:"2025-05-01",durableObjects:{AI_SECURITY:{className:"AiSecurityCoordinator",useSQLite:true}}});
const namespace = await runtime.getDurableObjectNamespace("AI_SECURITY");
const kv = new Map();
const lessonEnv = {COACH_TOKEN_SECRET:"local-browser-test-only-not-a-production-secret",AI_SECURITY:namespace,FDE_GYM_SESSIONS:{get:async key=>kv.get(key)??null,put:async(key,value)=>{kv.set(key,value);}}};
const chatCompiled = await build({entryPoints:["src/coach-chat/routes.ts"],bundle:true,format:"esm",platform:"node",write:false});
await writeFile(join(temporary,"chat.mjs"),chatCompiled.outputFiles[0].text);
const {handleChatRequest}=await import(pathToFileURL(join(temporary,"chat.mjs")).href);
if(isBeta) {
  lessonEnv.FDE_COACH_CHAT_ENABLED="true";
  lessonEnv.AI={run:async(_model,input)=>{
    modelCalls++;
    if(providerFails)throw new Error('synthetic provider outage');
    const data=JSON.parse(input.messages[1].content),message=data.learnerMessage;
    const background=message.includes('I build .NET APIs')?'I build .NET APIs':'';
    const gap=message.includes('do not keep a stable key');
    return {response:JSON.stringify({answer:gap?'Retrying every 500 can repeat an order write after the first attempt committed. Preserve one stable operation key and reconcile an uncertain result before creating another operation.':`Your ${data.profileEvidence.background||background||'engineering example'} gives us a concrete starting point. Idempotency separates a logical order operation from its delivery attempts. A stable key can recover the original outcome after response loss.`,question:'How would you prove two delivery attempts created only one order?',sourceIds:[data.untrustedCurriculum[0].id],gaps:gap?[{gap:'Recovery after an uncertain write',evidence:'do not keep a stable key'}]:[],nextStep:{task:'Add a duplicate-request test to a fictional order API.',definitionOfDone:'Two identical requests with one key produce one order and the same saved response.'},profileEvidence:{background,example:'',focus:''}}),usage:{total_tokens:240}};
  }};
}
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  if ((url.pathname.startsWith("/api/coach/") || url.pathname.startsWith("/api/coach-chat/"))) {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString();
    apiCalls.push({ path: url.pathname, body, key:request.headers["idempotency-key"], scope:request.headers["x-session-client"] });
    if (apiMode.startsWith("terminal-") && url.pathname.endsWith("message")) {
      const status=Number(apiMode.slice(9));response.writeHead(status,{"content-type":"application/json"});response.end(JSON.stringify({error:status===403?"This session has expired. Start again.":"Usage limit reached. Try again later."}));return;
    }
    if (apiMode === "failure" && url.pathname.endsWith("message")) {
      response.writeHead(503, {"content-type":"application/json"}); response.end(JSON.stringify({error:"Local connection interruption. Retry your last request."})); return;
    }
    const result = await (url.pathname.startsWith("/api/coach-chat/") ? handleChatRequest : handleCoachRequest)(new Request(url.href, {method: request.method, headers:{"content-type":"application/json","idempotency-key":request.headers["idempotency-key"]??"","x-session-client":request.headers["x-session-client"]??""}, ...(body ? {body} : {})}), apiMode==="unavailable" ? {...lessonEnv,AI_SECURITY:undefined} : apiMode==="beta-disabled" ? {...lessonEnv,FDE_COACH_CHAT_ENABLED:"false"} : lessonEnv);
    if (apiMode === "slow-body" && url.pathname.endsWith("message")) {
      response.writeHead(result.status,{"content-type":"application/json"});response.write('{"partial":');
      await new Promise(resolve=>{held=resolve;});response.end('true}');return;
    }
    if ((apiMode === "hold" && url.pathname.endsWith("message")) || (apiMode === "hold-start" && url.pathname.endsWith("start")) || (apiMode === "hold-health" && url.pathname.endsWith("health"))) await new Promise(resolve=>{held=resolve;});
    if (apiMode === "malformed" && url.pathname.endsWith("message")) { apiMode="normal";response.writeHead(200,{"content-type":"application/json"});response.end('{}');return; }
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
    if (!pending.has(message.id)) return;
    const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timeout);
    if(message.error) item.reject(new Error(JSON.stringify(message.error))); else item.resolve(message.result);
  });
  cmd = (method,params={}) => new Promise((resolve,reject)=>{const id=++next;const timeout=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},20000);pending.set(id,{resolve,reject,timeout});socket.send(JSON.stringify({id,method,params}));});
  evaluate = async expression => {const result=await cmd("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true}); if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);return result.result.value;};
  await cmd("Runtime.enable"); await cmd("Page.enable"); await cmd("Network.enable");
  async function until(expression, label, attempts=100) {for(let i=0;i<attempts;i++){if(await evaluate(expression))return;await wait(50);}throw new Error(`Timed out: ${label}`);}
  async function heldRequest(){for(let i=0;i<100;i++){if(held)return;await wait(25);}throw new Error("No held request reached the hardened handler");}
  let expectedWidth;
  async function viewport(width,height) {await cmd("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<620});expectedWidth=width;await wait(150);}
  async function visit(path="/") {await cmd("Page.navigate",{url:origin+path});await until("document.querySelector('astro-island')?.hasAttribute('ssr') === false && Boolean(document.querySelector('.fde-coach'))","React hydration");await evaluate("document.fonts.ready.then(()=>true)");await evaluate("window.confirm=message=>{window.lastCoachConfirmation=message;return window.acceptCoachReset!==false}");await wait(100);}
  async function click(selector) {await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.focus();el.click();})()`);await wait(120);}
  async function type(text) {await evaluate(`(()=>{const el=document.querySelector('#fde-message');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(text)});el.dispatchEvent(new Event('input',{bubbles:true}));el.focus();})()`);await wait(50);}
  async function overflow(label) {assert.equal(await evaluate("innerWidth"),expectedWidth,`${label}: exact viewport width`);assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),`${label}: horizontal overflow`);checks.push(`${label}: no horizontal overflow`);}
  async function resourceLinks() {
    for (const href of await evaluate("Array.from(document.querySelectorAll('.fde-resource-list a'),a=>a.getAttribute('href'))")) {
      assert.equal((await fetch(origin+href)).status,200,`Existing resource must resolve: ${href}`);
    }
  }
  async function capture(name) {if(process.env.AIR_COACH_SKIP_SCREENSHOTS)return;const image=await cmd("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(join(artifactDir,name),Buffer.from(image.data,"base64"));}
  if(isBeta) {
    const catalog=JSON.parse(await readFile(resolve('src/coach-chat/catalog.generated.json'),'utf8'));
    for(const source of catalog.resources) assert.equal((await fetch(origin+source.href)).status,200,`Canonical source must resolve: ${source.href}`);
    checks.push('All 22 versioned canonical curriculum URLs resolve against the built site');
    for(const [width,height] of [[360,800],[390,844],[768,1024],[1440,1000]]) {
      await viewport(width,height);await visit();await overflow(`beta welcome ${width}`);
      assert.equal(await evaluate("document.querySelectorAll('.fde-starter').length"),3);
      assert.ok(await evaluate("document.querySelector('.fde-mode-notice').textContent.includes('AI coaching beta')"));
      if(width===390||width===1440)await capture(`${width===390?'mobile':'desktop'}-welcome.png`);
      const before=modelCalls;await click('.fde-starter--orange');await until("Boolean(document.querySelector('.fde-turn__who span')) && document.querySelector('.fde-turn__who span').textContent==='Coach intake'","real intake");
      assert.equal(modelCalls,before,"Intake does not fake a model call");
      await type('I build .NET APIs and deployed an order service. I want to learn safe retries.');await click('.fde-send');await until("document.querySelector('.fde-status') === null && document.querySelector('.fde-transcript').textContent.includes('AI guidance')","AI turn");
      await type('We retry on every 500 and do not keep a stable key.');await click('.fde-send');await until("document.querySelector('.fde-status') === null && document.querySelector('.fde-transcript').textContent.includes('Definition of done')","evidence next task");
      assert.ok(await evaluate("document.querySelector('.fde-transcript').textContent.includes('do not keep a stable key') && !document.querySelector('.fde-error')"));
      assert.equal(modelCalls,before+2);await overflow(`beta chat ${width}`);await resourceLinks();
      assert.ok(await evaluate("Boolean(document.querySelector('.fde-compose-area details summary')) && !document.querySelector('[data-share-exchange]')"));
      if(width===390||width===1440) {
        await evaluate("(()=>{const stamp=document.createElement('div');stamp.textContent='LOCAL TEST · SYNTHETIC PROVIDER';stamp.style.cssText='position:fixed;bottom:0;right:0;z-index:9999;background:#fff0df;color:#7d300a;font:10px sans-serif;padding:3px 6px';document.body.append(stamp)})()");
        await capture(`${width===390?'mobile':'desktop'}-chat.png`);
      }
    }
    await viewport(390,844);await click('.fde-compose-area details summary');assert.ok(await evaluate("document.querySelector('.fde-compose-area details').open && document.querySelector('.fde-send').getBoundingClientRect().bottom <= innerHeight"));await click('.fde-compose-area details summary');await viewport(390,440);await wait(150);assert.ok(await evaluate("document.querySelector('.fde-send').getBoundingClientRect().bottom <= visualViewport.height + 1"));await viewport(390,844);
    checks.push('Beta privacy expands accessibly; collapsed composer remains reachable under a resized mobile keyboard viewport');
    checks.push('Four responsive beta viewports; real scoped intake, two personalized fixture turns, evidence-backed gap, next task, canonical references, visible privacy, no share capture');
    for(const selector of ['.fde-starter--blue','.fde-starter--green']) {
      await visit();await click(selector);await until("Boolean(document.querySelector('.fde-turn--coach'))","goal intake");
      assert.ok(await evaluate("!document.querySelector('.fde-resource-list') && document.querySelector('.fde-turn__who span').textContent==='Coach intake'"));
    }
    assert.equal(apiCalls.filter(call=>call.path.startsWith('/api/fde-gym/')).length,0);
    checks.push('All three starters open contextual coaching; interview does not start Gym or ask research consent');
    await visit();apiMode='failure';await type('I build .NET APIs. Explain safe retries for my order API.');await click('.fde-send');await until("Boolean(document.querySelector('.fde-error'))","free question failure");
    const startCount=apiCalls.filter(call=>call.path==='/api/coach-chat/start').length,failed=apiCalls.at(-1),turns=await evaluate("document.querySelectorAll('.fde-turn--learner').length"),beforeRecovery=modelCalls;
    apiMode='normal';await click('.fde-error button');await until("document.querySelector('.fde-status')===null && document.querySelector('.fde-error')===null","free question recovery");
    assert.equal(apiCalls.at(-1).key,failed.key);assert.equal(apiCalls.at(-1).body,failed.body);assert.equal(modelCalls,beforeRecovery+1);assert.equal(apiCalls.filter(call=>call.path==='/api/coach-chat/start').length,startCount);assert.equal(await evaluate("document.querySelectorAll('.fde-turn--learner').length"),turns);
    checks.push('Free-form first question uses a separate chat start and inference; retry preserves the failed message identity without repeating start or learner bubble');
    held=undefined;apiMode='hold';await type('Explain idempotency using my API.');await click('.fde-send');await heldRequest();apiMode='normal';await click('.fde-reset');held();await wait(100);assert.equal(await evaluate("document.querySelectorAll('.fde-turn').length"),0);
    checks.push('Reset fences an interrupted beta reply and discards its private profile');
    providerFails=true;await click('.fde-starter--orange');await until("Boolean(document.querySelector('.fde-turn--coach'))","fallback intake");const failedCalls=modelCalls;
    await type('I build .NET APIs. Help with reliability.');await click('.fde-send');await until("document.querySelector('.fde-status')===null","provider fallback");assert.equal(modelCalls,failedCalls+2);assert.ok(await evaluate("document.querySelector('.fde-transcript').textContent.includes('Authored fallback')"));providerFails=false;
    checks.push('Both separately metered provider failures produce an explicitly authored fallback with useful resources');
    await click('.fde-reset');apiMode='beta-disabled';await click('.fde-starter--orange');await until("document.querySelector('.fde-status')===null","disabled beta fallback");assert.ok(await evaluate("document.querySelector('.fde-transcript').textContent.includes('not a personalized model answer')"));apiMode='normal';
    checks.push('Disabled beta retains honest curated learning without calling the model');
    await visit();await type('A synthetic first message');await evaluate("document.querySelector('#fde-message').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}))");assert.equal(await evaluate("document.querySelectorAll('.fde-turn').length"),0);
    await cmd('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await click('.fde-starter--orange');await until("Boolean(document.querySelector('.fde-turn--coach'))","reduced motion intake");assert.equal(await evaluate("getComputedStyle(document.querySelector('.fde-turn')).animationName"),'none');
    checks.push('Beta preserves IME safety and reduced motion');
  } else {
  for (const [width,height] of [[360,800],[390,844],[768,1024],[1440,1000]]) {
    await viewport(width,height);await visit();await overflow(`welcome ${width}`);
    assert.equal(await evaluate("document.querySelectorAll('.fde-starter').length"),3);
    assert.ok(await evaluate("document.querySelector('#fde-message').getBoundingClientRect().top < innerHeight"),`composer visible at ${width}`);
    assert.ok(await evaluate("(()=>{const n=document.querySelector('.fde-mode-notice');const r=n.getBoundingClientRect();return n.textContent.includes('not personalized AI') && r.top >= 0 && r.bottom < innerHeight})()"),`Capability notice visible before starting at ${width}`);
    assert.ok(await evaluate("document.querySelector('#fde-message').getAttribute('aria-describedby').includes('fde-guidance-notice')"));
    if(width<620) {
      assert.ok(await evaluate("parseFloat(getComputedStyle(document.querySelector('.fde-intro')).fontSize) >= 15"));
      assert.ok(await evaluate("parseFloat(getComputedStyle(document.querySelector('.fde-starter__description')).fontSize) >= 12.5"));
      assert.equal(await evaluate("getComputedStyle(document.querySelector('.fde-illustration')).display"),"none");
    } else if(width===1440) assert.ok(await evaluate("document.querySelector('.fde-illustration').getBoundingClientRect().width >= 340"));
    if(width===390||width===1440) await capture(`${width===390?'mobile':'desktop'}-welcome.png`);
    const before = apiCalls.length;
    await click('.fde-starter--orange');
    await until("Boolean(document.querySelector('.fde-coach--active'))","active chat");await overflow(`conversation ${width}`);
    assert.equal(apiCalls.length,before,"Curated chat must not call an AI endpoint");
    assert.ok(await evaluate("document.querySelector('.fde-transcript').textContent.includes('Curated guidance')"));
    assert.ok(await evaluate("document.querySelector('.fde-starters') === null"),"Welcome cards stay out of active chat");
    if(width<620) {
      assert.ok(await evaluate("parseFloat(getComputedStyle(document.querySelector('.fde-turn__body > p:not(.fde-turn__who)')).fontSize) >= 15"));
      assert.ok(await evaluate("parseFloat(getComputedStyle(document.querySelector('.fde-help')).fontSize) >= 13"));
      const targets=await evaluate("Array.from(document.querySelectorAll('.fde-send,.fde-reset,.fde-followups button'),n=>({class:n.className,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width}))");
      assert.ok(targets.every(n=>n.height>=43.99 && n.width>=43.99),JSON.stringify({width,targets}));
    }
    if(width===390||width===1440) await capture(`${width===390?'mobile':'desktop'}-conversation.png`);
  }
  checks.push("Four responsive widths, exactly three starters, visible composer, honest resource chat, no new AI requests");
  checks.push("Curated-only capability notice appears above actions at every width and describes the textbox");
  checks.push("Readable mobile introduction, card descriptions, conversation body and persistent disclosure; 44px chat controls");
  checks.push("Original desktop illustration is at least 340px wide and remains hidden on mobile");
  await viewport(720,500);await visit();await overflow("desktop 200-percent zoom equivalent");
  await click('.fde-starter--orange');await overflow("conversation 200-percent zoom equivalent");
  assert.ok(await evaluate("document.querySelector('.fde-send').getBoundingClientRect().bottom <= innerHeight + 1"));
  checks.push("Desktop reflow at a 720px CSS viewport, equivalent to 200-percent zoom on 1440px, keeps composer reachable");
  await viewport(390,844);await visit();
  await click('.coach-resources summary');assert.ok(await evaluate("document.querySelector('.coach-resources').open"));
  await cmd("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape"});await cmd("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape"});
  assert.equal(await evaluate("document.querySelector('.coach-resources').open"),false);
  assert.ok(await evaluate("document.activeElement.matches('.coach-resources summary')"));
  checks.push("Resource menu supports Escape and returns focus");
  const ax = await cmd("Accessibility.getFullAXTree");
  const textbox = ax.nodes.find(node=>node.role?.value==='textbox');
  assert.equal(textbox?.name?.value,"Ask your FDE Coach");
  assert.ok(textbox?.description?.value.includes("not personalized AI"),"Screen reader receives the capability disclosure");
  await cmd("Input.dispatchKeyEvent",{type:"keyDown",key:"Tab",code:"Tab"});await cmd("Input.dispatchKeyEvent",{type:"keyUp",key:"Tab",code:"Tab"});
  assert.ok(await evaluate("document.activeElement.matches('.fde-starter')"));
  await cmd("Input.dispatchKeyEvent",{type:"keyDown",key:"Enter",code:"Enter",windowsVirtualKeyCode:13,text:"\r"});await cmd("Input.dispatchKeyEvent",{type:"keyUp",key:"Enter",code:"Enter",windowsVirtualKeyCode:13});
  await until("Boolean(document.querySelector('.fde-coach--active'))","keyboard starter");
  await evaluate("document.querySelector('.fde-transcript').focus()");
  assert.ok(await evaluate("document.activeElement.matches('.fde-transcript') && getComputedStyle(document.activeElement).outlineStyle !== 'none'"));
  checks.push("Accessible textbox name and capability description; keyboard-only starter and visible transcript focus");
  const contrastRatios = await evaluate(`(() => {
    const luminance = color => {
      const rgb=color.match(/[0-9.]+/g).slice(0,3).map(Number).map(n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4});
      return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
    };
    const body=getComputedStyle(document.body).backgroundColor;
    return ['.fde-help','.fde-turn__body > p:not(.fde-turn__who)'].map(selector=>{
      const foreground=luminance(getComputedStyle(document.querySelector(selector)).color), background=luminance(body);
      return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
    });
  })()`);
  assert.ok(contrastRatios.every(ratio=>ratio>=4.5),"Main mobile text and capability disclosure meet AA contrast");
  checks.push("Mobile conversation body and persistent capability disclosure meet 4.5:1 text contrast");
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
  assert.equal(apiCalls.at(-1).key,apiCalls.at(-2).key,"Manual retry retains the idempotency key");
  checks.push("Actual hardened lesson protocol and SQLite admission, written fallback, loading, exact retry key/body, no duplicate turns");
  const coachBeforeMalformed=await evaluate("document.querySelectorAll('.fde-turn--coach').length");
  apiMode="malformed";await type("A second fictional outcome.");await click('.fde-send');await until("Boolean(document.querySelector('.fde-error'))","malformed success error");
  const malformed=apiCalls.at(-1);await click('.fde-error button');await until("document.querySelector('.fde-error') === null && document.querySelector('.fde-status') === null","saved response recovery");
  assert.equal(apiCalls.at(-1).key,malformed.key);assert.equal(apiCalls.at(-1).body,malformed.body);
  assert.equal(await evaluate("document.querySelectorAll('.fde-turn--coach').length"),coachBeforeMalformed+1);
  checks.push("Malformed HTTP success preserves identity and recovers the actual saved SQLite/KV result");
  held=undefined;apiMode="slow-body";await type("A fictional answer with a stalled response body.");await click('.fde-send');await heldRequest();
  const stalled=apiCalls.at(-1), beforeTimeout=apiCalls.length;
  await until("Boolean(document.querySelector('.fde-error'))","whole-body timeout",500);
  assert.ok(await evaluate("document.querySelector('.fde-error').textContent.includes('timed out') && document.querySelector('#fde-message').readOnly && document.querySelector('.fde-send').disabled"));
  assert.equal(apiCalls.length,beforeTimeout,"No automatic retry after timeout");
  apiMode="normal";held();await click('.fde-error button');await until("document.querySelector('.fde-error') === null && document.querySelector('.fde-status') === null","timeout recovery");
  assert.equal(apiCalls.at(-1).key,stalled.key);assert.equal(apiCalls.at(-1).body,stalled.body);
  checks.push("Real 20-second response-body timeout preserves identity, blocks new answers, makes no automatic retry, and recovers saved result");
  for (let i=0;i<8 && !await evaluate("Boolean(document.querySelector('.fde-summary'))");i++) {
    await type("A fictional customer outcome, with evidence and a human approval boundary.");await click('.fde-send');
    await until("document.querySelector('.fde-status') === null","next lesson step");
  }
  assert.ok(await evaluate("Boolean(document.querySelector('.fde-summary'))"),"Original lesson can complete");
  assert.equal(await evaluate("document.querySelectorAll('.fde-summary dl > div').length"),12,"All recap and design items remain available");
  assert.equal(await evaluate("document.querySelector('.fde-summary a').getAttribute('href')"),"/coach/next/");
  checks.push("Full authored lesson completes with all six recap and six design entries and the existing continuation URL");
  held=undefined;apiMode="hold-start";await visit('/coach/?lesson=agent-system-design');await until("Boolean(document.querySelector('.fde-status')) && Boolean(document.querySelector('.fde-reset'))","pending start");
  await until("document.querySelector('.fde-status') !== null","held start");await heldRequest();
  const oldStart=apiCalls.findLast(call=>call.path.endsWith('/start'));
  assert.ok(held,"Start response held after actual admission");
  await evaluate("window.acceptCoachReset=false");await click('.fde-reset');
  assert.ok(await evaluate("Boolean(document.querySelector('.fde-status')) && window.lastCoachConfirmation.includes('reserved usage remains spent')"));
  await evaluate("window.acceptCoachReset=true");apiMode="normal";await click('.fde-reset');held();await wait(150);
  assert.equal(await evaluate("document.querySelectorAll('.fde-turn').length"),0,"Late start cannot change new chat");
  await click('.fde-starter--orange');const startsBeforeDouble=apiCalls.filter(call=>call.path.endsWith('/start')).length;await evaluate("(()=>{const button=document.querySelector('.fde-lesson-link');button.click();button.click();})()");await until("Boolean(document.querySelector('.fde-lesson-part--ask'))","new session after reset");
  const newStart=apiCalls.findLast(call=>call.path.endsWith('/start'));
  assert.notEqual(newStart.key,oldStart.key);assert.notEqual(newStart.scope,oldStart.scope);
  assert.equal(apiCalls.filter(call=>call.path.endsWith('/start')).length,startsBeforeDouble+1,"Simultaneous starter clicks send one start");
  checks.push("New chat abandons a committed but interrupted start; late reply is ignored and the next start has fresh key/scope");
  held=undefined;apiMode="hold";await type("An interrupted fictional answer.");await click('.fde-send');await until("Boolean(document.querySelector('.fde-status'))","pending answer");await heldRequest();
  apiMode="normal";await click('.fde-reset');held();await wait(150);assert.equal(await evaluate("document.querySelectorAll('.fde-turn').length"),0);
  checks.push("New chat during an interrupted committed answer ignores its late response");
  held=undefined;apiMode="hold-health";const startsBeforeHealth=apiCalls.filter(call=>call.path.endsWith('/start')).length;
  await visit('/coach/?lesson=agent-system-design');await heldRequest();apiMode="normal";await click('.fde-reset');held();await wait(150);
  assert.equal(apiCalls.filter(call=>call.path.endsWith('/start')).length,startsBeforeHealth);
  checks.push("Reset during health preflight cannot start an abandoned session");
  apiMode="unavailable";const startsBeforeUnavailable=apiCalls.filter(call=>call.path.endsWith('/start')).length;
  await visit('/coach/?lesson=agent-system-design');await until("Boolean(document.querySelector('.fde-error'))","unavailable enforcement");
  assert.equal(apiCalls.filter(call=>call.path.endsWith('/start')).length,startsBeforeUnavailable);
  assert.ok(await evaluate("Boolean(document.querySelector('.fde-error a[href=\"/learn/courses/agentic-system-design/\"]'))"));
  checks.push("Missing atomic enforcement stops before start admission and retains the written course link");
  for (const status of [403,429]) {
    apiMode="normal";await visit('/coach/?lesson=agent-system-design');await until("Boolean(document.querySelector('.fde-lesson-part--ask'))","terminal test lesson");
    apiMode=`terminal-${status}`;await type("A fictional response.");await click('.fde-send');await until("Boolean(document.querySelector('.fde-error'))","terminal error");
    assert.ok(await evaluate("!document.querySelector('.fde-error button') && document.querySelector('#fde-message').readOnly && document.querySelector('.fde-send').disabled && Boolean(document.querySelector('.fde-error a')) && Boolean(document.querySelector('.fde-reset'))"));
    const count=apiCalls.length;await wait(100);assert.equal(apiCalls.length,count);
  }
  checks.push("Terminal 403/429 UI fixtures block retry and new answers, retain course/restart, and make no automatic request");
  apiMode="normal";await visit();await click('.fde-starter--orange');
  await cmd("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.fde-turn')).animationName"),"none");
  checks.push("Reduced motion disables entry animations");
  await cmd("Emulation.setScriptExecutionDisabled",{value:true});await cmd("Page.navigate",{url:origin+'/'});await wait(250);
  const tree=await cmd("DOM.getDocument",{depth:-1});const html=await cmd("DOM.getOuterHTML",{nodeId:tree.root.nodeId});
  assert.ok(html.outerHTML.includes("Learning is still open."));
  assert.ok(html.outerHTML.includes('/career/interviews/'));
  checks.push("No-JavaScript page contains meaningful learning links and an explicit explanation");
  }
  assert.deepEqual(browserErrors,[]);
  assert.deepEqual(externalRequests,[]);
  await writeFile(join(artifactDir,"browser-checks.json"),JSON.stringify({checks,screenshots:process.env.AIR_COACH_SKIP_SCREENSHOTS?[]:isBeta?["mobile-welcome.png","mobile-chat.png","desktop-welcome.png","desktop-chat.png"]:["mobile-welcome.png","mobile-conversation.png","desktop-welcome.png","desktop-conversation.png"],api:isBeta?"Actual coaching engine, local SQLite admission, synthetic contextual provider fixture; no real model inference or production calls":"Actual hardened Coach handler with local SQLite Durable Object and in-memory KV; AI absent; no production calls",physicalKeyboard:"Not tested on physical Android/iOS devices; CDP viewport resize only",mockup:"Attachment unavailable; issue #151 visual specification used"},null,2)+'\n');
  console.log(`Passed ${checks.length} browser checks. Browser evidence saved under ${artifactDir}. No external requests.`);
} finally {
  held?.();socket?.close();
  if(browser?.pid){const exited=browser.exitCode!==null?Promise.resolve():new Promise(resolve=>browser.once('exit',resolve));try{process.kill(-browser.pid,'SIGTERM');}catch{}let timer;await Promise.race([exited,new Promise(resolve=>{timer=setTimeout(resolve,2000);})]);clearTimeout(timer);}
  await runtime.dispose();
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  await rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
