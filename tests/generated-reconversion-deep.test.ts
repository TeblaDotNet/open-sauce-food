import { restoreRecipePublication } from './helpers/recipe-publication.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseRecipe} from '../src/parser/index.ts';
import {loadVocabulary} from '../src/vocabulary/node.ts';
import {generatedReconversion} from './helpers/generated-reconversion.ts';
import {generatedReconversionDeep as deep,restoreGeneratedReconversionDeep as restore} from './helpers/generated-reconversion-deep.ts';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const sections=(s:string)=>{const p=parseRecipe(s);return p.sections.map((x,i)=>({name:x.name,raw:s.slice(x.span.start,p.sections[i+1]?.span.start??s.length)}));};
const vocabulary=await loadVocabulary('.');
test('deep generated provenance restores the prior committed corpus and preserves Originals and protected sections',()=>{
 assert.equal(Object.keys(deep.recipes).length,410);
 assert.equal(Object.values(deep.recipes).filter(r=>r.status==='protected-gold').length,6);
 assert.equal(Object.values(deep.recipes).filter(r=>r.status==='protected-v2').length,34);
 for(const [slug,r] of Object.entries(deep.recipes)){
  assert.ok(['protected-gold','protected-v2','generated-v2-deep','unchanged','rejected','blocked','pending'].includes(r.status),slug);
  if(deep.phaseStatus==='complete')assert.notEqual(r.status,'pending',slug);
  const source=readFileSync(`examples/public-domain-recipes/${slug}/${slug}.opensauce`,'utf8'),baseline=restore(source,slug);
  assert.equal(sha(baseline),generatedReconversion.recipes[slug].generatedSha256,slug);
  const protectedParts=(s:string)=>sections(s).filter(x=>!['ingredients','equipment','instructions','notes'].includes(x.name));
  assert.deepEqual(protectedParts(restoreRecipePublication(source,slug)),protectedParts(baseline),slug);
  const original=parseRecipe(source).sections.find(s=>s.originalSource)?.originalSource?.text??readFileSync(r.originalLocation,'utf8');
  assert.equal(sha(original),r.originalSha256,slug+' Original');
  if(['gold-control','generated-v2'].includes(generatedReconversion.recipes[slug].status)){
   assert.equal(restoreRecipePublication(source,slug),baseline,slug);assert.ok(r.status.startsWith('protected'));assert.equal(r.attempts.length,0);
  }
  if(r.status==='generated-v2-deep'){
   assert.ok(r.sections.length>0);assert.equal(r.generatedSha256,r.bestSafeHash);
   const equipment=parseRecipe(source).sections.filter(s=>s.name==='equipment').flatMap(s=>s.children);
   for(const n of equipment)if(n.kind==='statement'&&n.role==='choice'){
    const local=n.tokens.find(t=>t.kind==='thing')!;assert.equal(local.thingKind,'choice');assert.equal(local.choiceKind,'equipment');assert.equal(local.canonicalId,undefined);
   }
   assert.ok(r.attempts.some(a=>a.decision==='safe'&&a.candidateHash===r.bestSafeHash));
   assert.equal(parseRecipe(source,{vocabulary}).diagnostics.filter(d=>d.severity==='error'||/UNRESOLVED|AMBIGUOUS|MISSING_SUBJECT/.test(d.code)).length,0,slug);
  }
  if(r.startingSource==='previous-v2-candidate')assert.match(r.previousCandidateHash!,/^[a-f0-9]{64}$/);
  assert.ok(r.attempts.length<=5);
  for(const a of r.attempts){
   if(a.attempt>3)assert.ok(a.extendedBudgetReason);
   if(a.decision==='safe')assert.equal(a.bestSafeHashAfter,a.candidateHash);
  }
 }
});
test('deep provenance rejects current-byte and historical-section tampering',()=>{
 const [slug,r]=Object.entries(deep.recipes).find(([,r])=>r.status==='generated-v2-deep')!;
 const source=readFileSync(`examples/public-domain-recipes/${slug}/${slug}.opensauce`,'utf8');
 assert.throws(()=>restore(source+'\n',slug),/generated pass bytes/);
 const saved=r.sections[0].historicalRaw;
 try{r.sections[0].historicalRaw+='invented';assert.throws(()=>restore(source,slug));}
 finally{r.sections[0].historicalRaw=saved;}
 assert.equal(restore('untouched','not-in-registry'),'untouched');
 assert.equal(restore('untouched','toString'),'untouched');
});
