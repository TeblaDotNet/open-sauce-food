import assert from 'node:assert/strict';
import { assertNoCache } from './hosting-headers.ts';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const origin = process.argv[2] ?? 'http://127.0.0.1:8082';
const base = origin + '/opensaucefood/';
const manifest = JSON.parse(await readFile('site-dist/site-manifest.json','utf8'));
const owned = JSON.parse(await readFile('site-dist/.site-output.json','utf8'));
const results: { path: string; status: number; bytes: number }[] = [];
const targets: string[] = [...manifest.pages, ...Object.keys(owned.hashes).filter(p=>p.startsWith('assets/')).map(p=>'/opensaucefood/'+p)];
let next=0;
await Promise.all(Array.from({length:8},async()=>{while(next<targets.length){const path=targets[next++];const r=await fetch(origin+path);const body=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200,path);assert.equal(r.url,origin+path,'Unexpected redirect');assert.equal(r.headers.get('x-powered-by'),null,'Static request hit PHP');const file=path.slice('/opensaucefood/'.length)+(path.endsWith('/')?'index.html':'');assert.equal(createHash('sha256').update(body).digest('hex'),owned.hashes[file],path);assertNoCache(r.headers.get('cache-control'),path);results.push({path,status:r.status,bytes:body.length});}}));
for(const path of ['recipe/does-not-exist/','not-a-real-page/','assets/not-a-real-file.css']) {const r=await fetch(base+path);const text=await r.text();assert.equal(r.status,404,path);assert.ok(text.includes('Page not found · Open Sauce Food'));assert.equal(r.headers.get('x-powered-by'),null);results.push({path:'/opensaucefood/'+path,status:r.status,bytes:Buffer.byteLength(text)});}
for(const path of ['','recipes','recipe/mayonnaise-or-aioli','ingredients/egg']){const r=await fetch(base.slice(0,-1)+(path?'/'+path:''),{redirect:'manual'});assert.equal(r.status,301);assert.equal(r.headers.get('location'),base+path+(path?'/':''));}
assert.equal((await fetch(base+'assets/')).status,403);
const asset = await fetch(base+'assets/style.css',{headers:{'Accept-Encoding':'identity'}});
const conditional = await fetch(base+'assets/style.css',{headers:{'If-None-Match':asset.headers.get('etag')!,'Accept-Encoding':'identity'}});assert.equal(conditional.status,304);
const report={origin,status:'passed',pages:manifest.pages.length,assets:targets.length-manifest.pages.length,missingPaths:3,slashRedirects:4,conditionalStatus:conditional.status,results};
await writeFile('hosting-work/http-rehearsal.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,results:undefined},null,2));
