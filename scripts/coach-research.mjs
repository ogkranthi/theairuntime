import { readFile } from 'node:fs/promises';
import { readPrivate,writePrivate,digest,makeDataset,compareRuns,reviewSql,redactionSql,membershipSql,snapshotFromD1,purgePrivateArtifacts } from './lib/research-dataset.mjs';
const [command,...args]=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
try{
  if(command==='purge-files'){
    if(!option('--dir'))throw new Error('Specify an approved private artifact directory.');
    const result=await purgePrivateArtifacts(option('--dir'));console.log(`Expired private artifacts removed: ${result.removed}`);
  }else if(command==='snapshot'){
    if(!option('--config')||!option('--out'))throw new Error('Specify approved configuration and a private output path.');
    const value=await snapshotFromD1(option('--config'),args.includes('--remote'),args.includes('--confirm-private-access'),option('--after'));await writePrivate(option('--out'),value);
  }else if(command==='redact'){
    const snapshot=await readPrivate(option('--input')),redaction=await readPrivate(option('--redaction')),row=snapshot.records.find(r=>r.id===option('--id'));
    if(!Number.isFinite(redaction.expiresAt)||!row||redaction.schema!=='private-coach-redaction-v1'||redaction.expiresAt<=Date.now()||redaction.expiresAt>snapshot.validUntil)throw new Error('Use a fresh private privacy-redaction input.');
    await writePrivate(option('--out'),redactionSql(row,redaction,snapshot));
  }else if(command==='review'){
    const snapshot=await readPrivate(option('--input')),review=await readPrivate(option('--review')),row=snapshot.records.find(r=>r.id===option('--id'));
    if(!Number.isFinite(review.expiresAt)||review.schema!=='private-coach-human-review-v1'||review.expiresAt<=Date.now()||review.expiresAt>snapshot.validUntil)throw new Error('Use a timestamped private human review.');
    if(!row)throw new Error('Choose a case in the private snapshot.');await writePrivate(option('--out'),reviewSql(row,review,snapshot));
  }else if(command==='promote'){
    if(!option('--membership-sql'))throw new Error('Private membership registration SQL is required.');
    const snapshot=await readPrivate(option('--input')),baseline=await readFile(new URL('../eval/coach/cases.v1.json',import.meta.url),'utf8');
    const dataset=makeDataset(snapshot,option('--version'),digest(baseline));
    await writePrivate(option('--membership-sql'),membershipSql(dataset));await writePrivate(option('--out'),dataset);
  }else if(command==='compare'){
    const dataset=await readPrivate(option('--dataset')),runPaths=args.filter((_,i)=>args[i-1]==='--run'),runs=await Promise.all(runPaths.map(readPrivate));
    const fresh=await readPrivate(option('--consent-snapshot'));
    await writePrivate(option('--out'),compareRuns(dataset,runs,Date.now(),fresh));
  }else throw new Error('Use snapshot, review, promote, compare or purge-files. All learner-data paths must be private and outside Git.');
  console.log('Private artifact prepared. No learner content printed. No publication or training permission granted.');
}catch(error){console.error(error instanceof Error&&/^(Use |Specify |Choose |Private |An explicit |All comparisons|Invalid,|Unreviewed |Explicit private|Research |A valid)/.test(error.message)?error.message:'Private research operation could not complete safely. Check configuration and private paths.');process.exitCode=1;}
