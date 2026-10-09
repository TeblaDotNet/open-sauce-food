import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseRecipe} from '../src/parser/index.ts';
import {loadVocabulary} from '../src/vocabulary/node.ts';
import {generatedReconversion,restoreGeneratedReconversion} from './helpers/generated-reconversion.ts';
import {reviewedInstructionSlugs} from './helpers/reviewed-instructions.ts';
const vocabulary=await loadVocabulary('.');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const sections=(s:string)=>{const r=parseRecipe(s);return r.sections.map((x,i)=>({name:x.name,raw:s.slice(x.span.start,r.sections[i+1]?.span.start??s.length)}));};
test('generated reconversion restores historical bytes without changing protected sections or curation',()=>{
 for(const [slug,record] of Object.entries(generatedReconversion.recipes)){
  const source=readFileSync(`examples/public-domain-recipes/${slug}/${slug}.opensauce`,'utf8');
  const baseline=restoreGeneratedReconversion(source,slug);
  assert.equal(sha(baseline),record.baselineSha256,slug);
  const before=sections(baseline),after=sections(source);
  assert.deepEqual(after.filter(s=>!['ingredients','equipment','instructions','notes'].includes(s.name)),before.filter(s=>!['ingredients','equipment','instructions','notes'].includes(s.name)),slug);
  if(record.status==='generated-v2'){
   assert.ok(!reviewedInstructionSlugs.includes(slug),slug);
   assert.ok(record.sections.length>0,slug);
   const parsed=parseRecipe(source,{vocabulary});
   assert.equal(parsed.diagnostics.filter(d=>d.severity==='error'||/UNRESOLVED|AMBIGUOUS|MISSING_SUBJECT/.test(d.code)).length,0,slug);
  }
  const embedded=parseRecipe(source).sections.find(s=>s.originalSource)?.originalSource?.text;
  assert.equal(sha(embedded??readFileSync(record.originalLocation,'utf8')),record.originalSha256,slug+' Original');
 }
});
test('generated provenance rejects later recipe or historical-section tampering',()=>{
 const [slug,record]=Object.entries(generatedReconversion.recipes).find(([,r])=>r.status==='generated-v2')!;
 const source=readFileSync(`examples/public-domain-recipes/${slug}/${slug}.opensauce`,'utf8');
 assert.throws(()=>restoreGeneratedReconversion(source+'\n',slug),/generated pass bytes/);
 const saved=record.sections[0].historicalRaw;
 try{record.sections[0].historicalRaw+='invented';assert.throws(()=>restoreGeneratedReconversion(source,slug));}
 finally{record.sections[0].historicalRaw=saved;}
});
test('gold controls remain byte-identical and separate from generated replacements',()=>{
 assert.equal(Object.keys(generatedReconversion.recipes).length,410);
 assert.equal(Object.values(generatedReconversion.recipes).filter(r=>r.status==='gold-control').length,6);
 for(const slug of reviewedInstructionSlugs){const r=generatedReconversion.recipes[slug];assert.ok(r,slug);assert.equal(r.status,'gold-control');assert.equal(r.baselineSha256,r.generatedSha256);assert.equal(r.sections.length,0);}
 assert.equal(restoreGeneratedReconversion('unchanged','not-in-registry'),'unchanged');
 assert.equal(restoreGeneratedReconversion('unchanged','toString'),'unchanged');
});
