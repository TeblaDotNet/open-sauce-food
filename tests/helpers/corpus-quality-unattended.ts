import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const corpusRepairs=JSON.parse(readFileSync('tests/fixtures/corpus-quality-unattended.json','utf8')) as {baselineCommit:string;recipes:Record<string,{beforeSource:string;beforeSha256:string;afterSha256:string;authorship?:'codex'|'chatgpt-user-accepted';acceptedSha256?:string}>};
export const repairedRecipeCount=Object.keys(corpusRepairs.recipes).length;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Historical test projection only. Publication/runtime truth stays in each recipe. */
export function restoreCorpusRepairs(source:string,pathOrSlug:string):string {
 const slug=pathOrSlug.replaceAll('\\','/').split('/').at(-1)!.replace(/\.opensauce$/,'');
 if(!Object.hasOwn(corpusRepairs.recipes,slug))return source;
 const record=corpusRepairs.recipes[slug];
 assert.equal(sha(record.beforeSource),record.beforeSha256,'Repair baseline '+slug);
 if(source===record.beforeSource)return source;
 assert.equal(sha(source),record.afterSha256,'Unrecorded corpus repair bytes: '+slug);
 return record.beforeSource;
}
