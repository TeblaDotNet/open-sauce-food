import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseRecipe} from '../../src/parser/index.ts';
interface Replacement {name:string; historicalRaw:string; historicalSha256:string; generatedSha256:string}
interface Record {status: 'gold-control' | 'unchanged' | 'generated-v2' | 'rejected' | 'blocked';baselineSha256:string;generatedSha256:string;originalSha256:string;originalLocation:string;sections:Replacement[]}
export const generatedReconversion = JSON.parse(readFileSync('generated-reconversion-v2.json','utf8')) as {schemaVersion:number;pass:string;baselineCommit:string;recipes:{[slug:string]:Record}};
assert.equal(generatedReconversion.schemaVersion,1);
assert.match(generatedReconversion.baselineCommit,/^[a-f0-9]{40}$/);
assert.equal(generatedReconversion.pass,'conversion-v2-2026-10');
for (const record of Object.values(generatedReconversion.recipes)) {
 assert.ok(['gold-control','unchanged','generated-v2','rejected','blocked'].includes(record.status));
 for (const hash of [record.baselineSha256,record.generatedSha256,record.originalSha256]) assert.match(hash,/^[a-f0-9]{64}$/);
}
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Generated pass provenance is separate from deliberately reviewed repairs. */
export function restoreGeneratedReconversion(source:string,pathOrSlug:string):string {
 const slug=pathOrSlug.replaceAll('\\','/').split('/').at(-1)!.replace(/\.opensauce$/,'');
 if(!Object.hasOwn(generatedReconversion.recipes,slug))return source;
 const record=generatedReconversion.recipes[slug];
 assert.equal(sha(source),record.generatedSha256,slug+': generated pass bytes changed');
 if(record.status!=='generated-v2'){assert.equal(record.sections.length,0);assert.equal(sha(source),record.baselineSha256);return source;}
 const parsed=parseRecipe(source),edits: {start:number;end:number;raw:string}[]=[];
 const seen=new Set<string>();
 for(const replacement of record.sections){
  assert.ok(['ingredients','equipment','instructions','notes'].includes(replacement.name));assert.ok(!seen.has(replacement.name));seen.add(replacement.name);
  const matches=parsed.sections.filter(s=>s.name===replacement.name);assert.equal(matches.length,1);
  const at=parsed.sections.indexOf(matches[0]),start=matches[0].span.start,end=parsed.sections[at+1]?.span.start??source.length;
  assert.equal(sha(source.slice(start,end)),replacement.generatedSha256);assert.equal(sha(replacement.historicalRaw),replacement.historicalSha256);
  edits.push({start,end,raw:replacement.historicalRaw});
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.raw+source.slice(edit.end);
 assert.equal(sha(source),record.baselineSha256,slug+': historical reconstruction changed');return source;
}
