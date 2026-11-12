import { readFile } from 'node:fs/promises';
const path=process.argv[2]||'preview/coach-chat.wrangler.toml';
const config=await readFile(path,'utf8');
if(!/^name\s*=\s*"theairuntime-coach-review"$/m.test(config)||!/^routes\s*=\s*\[\s*\]$/m.test(config)||!/^main\s*=\s*"\.\/coach-entry.ts"$/m.test(config))throw Error('Preview must use its isolated name, entry, and no routes.');
const ids=Array.from(config.matchAll(/^id\s*=\s*"([a-f0-9]{32})"$/gm),m=>m[1]);
if(ids.length!==1||/^0+$/.test(ids[0])||ids[0]==='8cb02842b8d44f07886395524b17128a')throw Error('A real, separately created nonproduction KV namespace is required. Production and placeholder IDs are forbidden.');
if(/script_name\s*=|\[\[services\]\]|RESEND|WEBHOOK|AIRTABLE|\[\[d1_databases\]\]/i.test(config))throw Error('External bindings, D1, and integrations are not permitted in this preview.');
console.log('Preview static guards passed. Owner must still verify account, namespace ownership, access gate, secrets isolation, and approval before deployment.');
