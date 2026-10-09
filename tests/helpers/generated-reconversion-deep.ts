import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseRecipe} from '../../src/parser/index.ts';
interface Replacement {name:string; historicalRaw:string; historicalSha256:string; generatedSha256:string}
interface DeepRecord {
 status:'protected-gold'|'protected-v2'|'generated-v2-deep'|'unchanged'|'rejected'|'blocked'|'pending';
 baselineSha256:string; generatedSha256:string; originalSha256:string; originalLocation:string;
 startingSource:'committed'|'previous-v2-candidate'|'previous-deep-candidate'|null; previousCandidateHash:string|null;
 bestSafeHash:string; sections:Replacement[];
 attempts:{attempt:number;startingHash:string;candidateHash:string;decision:string;bestSafeHashAfter:string;extendedBudgetReason:string|null}[];
}
export const generatedReconversionDeep=JSON.parse(readFileSync('generated-reconversion-v2-deep.json','utf8')) as {
 schemaVersion:number;pass:string;baselineCommit:string;previousPass:string;previousProvenanceSha256:string;
 phaseStatus:'in-progress'|'complete'|'stopped-systemic-blocker'|'paused-user-scope';recipes:{[slug:string]:DeepRecord};
};
const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
assert.equal(generatedReconversionDeep.schemaVersion,1);
assert.equal(generatedReconversionDeep.pass,'conversion-v2-deep-2026-10');
assert.equal(generatedReconversionDeep.baselineCommit,'2ae65d9fdd4bdf683e39a5edbd432c90fdc7c3f0');
assert.equal(generatedReconversionDeep.previousPass,'conversion-v2-2026-10');
assert.equal(sha(readFileSync('generated-reconversion-v2.json')),generatedReconversionDeep.previousProvenanceSha256);
/** Undo only this generated phase, then let the previous provenance layer restore its baseline. */
export function restoreGeneratedReconversionDeep(source:string,pathOrSlug:string):string {
 const slug=pathOrSlug.replaceAll('\\','/').split('/').at(-1)!.replace(/\.opensauce$/,'');
 if(!Object.hasOwn(generatedReconversionDeep.recipes,slug))return source;
 const record=generatedReconversionDeep.recipes[slug];
 assert.equal(sha(source),record.generatedSha256,slug+': deep generated pass bytes changed');
 if(record.status!=='generated-v2-deep'){
  assert.equal(record.sections.length,0);assert.equal(record.generatedSha256,record.baselineSha256);return source;
 }
 const parsed=parseRecipe(source),seen=new Set<string>(),edits:{start:number;end:number;raw:string}[]=[];
 for(const replacement of record.sections){
  assert.ok(['ingredients','equipment','instructions','notes'].includes(replacement.name));
  assert.ok(!seen.has(replacement.name));seen.add(replacement.name);
  const matches=parsed.sections.filter(s=>s.name===replacement.name);assert.equal(matches.length,1);
  const at=parsed.sections.indexOf(matches[0]),start=matches[0].span.start,end=parsed.sections[at+1]?.span.start??source.length;
  assert.equal(sha(source.slice(start,end)),replacement.generatedSha256);
  assert.equal(sha(replacement.historicalRaw),replacement.historicalSha256);
  edits.push({start,end,raw:replacement.historicalRaw});
 }
 for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.raw+source.slice(edit.end);
 assert.equal(sha(source),record.baselineSha256,slug+': deep historical reconstruction changed');
 return source;
}
