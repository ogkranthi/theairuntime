import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const hash = text => createHash('sha256').update(text).digest('hex');
const entries=[];
for (const file of (await readdir('learn/src/content/asd-modules')).filter(f=>f.endsWith('.md')).sort()) {
  const path=`learn/src/content/asd-modules/${file}`, raw=await readFile(path,'utf8');
  const slug=raw.match(/^slug: "?([^"\n]+)"?$/m)?.[1];
  const title=raw.match(/^title: "?([^"\n]+)"?$/m)?.[1];
  entries.push({id:`asd-${file.slice(0,2)}`,path,raw,title,href:`/learn/courses/agentic-system-design/modules/${slug}/`});
}
for (const slug of ['incident-response-agent','customer-account-agent']) {
  const path=`learn/src/content/case-studies/${slug}.md`,raw=await readFile(path,'utf8');
  entries.push({id:slug,path,raw,title:raw.match(/^title: (.+)$/m)[1],href:`/learn/case-studies/${slug}/`});
}
for (const [id,path,href,title] of [
  ['gym','learn/src/pages/fde-gym/index.astro','/fde-gym/','FDE Gym practice interviews'],
  ['interviews','learn/src/pages/career/interviews.astro','/career/interviews/','FDE interview preparation'],
  ['paths','learn/src/pages/paths/index.astro','/paths/','FDE learning paths'],
]) { entries.push({id,path,raw:await readFile(path,'utf8'),title,href}); }
const resources=entries.map(({id,path,raw,title,href})=>{
  if(!/^\/[a-z0-9/-]+\/$/.test(href) || href.includes('undefined')) throw Error('Invalid canonical URL');
  let body=raw.replace(/^---[\s\S]*?---\s*/,'');
  if(path.endsWith('.astro')) body=Array.from(body.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g),m=>m[1]).join(' ');
  const excerpt=body.replace(/```[\s\S]*?```/g,'').split(/\n\s*\n/).filter(p=>!p.trim().startsWith('#')).join(' ')
    .replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*`#{}]/g,'').replace(/[\u2013\u2014]/g,',').replace(/\s+/g,' ').trim().slice(0,550);
  if(excerpt.length<60)throw Error(`Missing excerpt: ${id}`);
  return {id,title,href,excerpt,source:path,contentHash:hash(raw)};
});
const catalog={version:hash(JSON.stringify(resources)).slice(0,16),resources};
const output=JSON.stringify(catalog,null,2)+'\n',target='src/coach-chat/catalog.generated.json';
if(process.argv.includes('--check')) { if(await readFile(target,'utf8')!==output)throw Error('Coach catalog is stale. Run node scripts/build-coach-catalog.mjs'); }
else await writeFile(target,output);
console.log(`Coach catalog: ${resources.length} canonical resources, ${catalog.version}`);
