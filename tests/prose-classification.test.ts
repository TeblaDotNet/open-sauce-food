import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecipe,renderCode,Vocabulary} from '../src/index.ts';
import {classifyProse,proseEvidence} from '../src/prose-classification.ts';
import {auditConversion,qualityModel} from '../src/conversion-quality.ts';
import {method} from '../scripts/public-domain-conversion.ts';
const vocabulary=new Vocabulary([]);
const source=(body:string)=>'::recipe\nname: Prose\n::instructions\n'+body+'\n';
const findings=(body:string)=>proseEvidence(parseRecipe(source(body)));
const span=(text:string)=>({start:0,end:text.length,line:1,column:1});
for(const [text,classification,destination] of [
 ['The basic rule of thumb I use for pasta is 100g, 1 egg per person.','author-commentary','comment'],
 ['For the seafood version, serve with a simple fresh red sauce and basil.','serving-advice','notes'],
 ['Or spice it up a bit: use red sauce with cream.','variation-advice','notes'],
 ['If you prefer, substitute milk for cream.','variation-advice','notes'],
 ['Leftovers can be refrigerated for two days.','storage-advice','notes'],
 ['Storage tip: freeze leftovers in individual portions.','storage-advice','notes'],
 ['This can be prepared a day ahead.','make-ahead-advice','notes']
])test('CQ009 explicit framing: '+classification+' / '+text,()=>{
 const f=findings(text);assert.equal(f.length,1);assert.equal(f[0].rule,'CQ009');assert.equal(f[0].classification,classification);assert.equal(f[0].suggestedDestination,destination);
 assert.ok(f[0].reason.length>20);assert.ok(['high','medium'].includes(f[0].confidence));
});
const alternative='[\n# Well method\n{dough} <knead>\n]\n-OR-\n[\n# Stand-mixer method\n{dough} <mix>\n]';
test('CQ010 choice narration requires populated alternatives and matching branch labels',()=>{
 for(const introduction of ['Choose one of these methods:','Choose the old-school well method or the stand-mixer method:']){
  const f=findings(introduction+'\n'+alternative);assert.equal(f.length,1);assert.equal(f[0].suggestedDestination,'remove');assert.equal(f[0].confidence,'high');assert.equal(f[0].relatedSpans!.length,3);
 }
 for(const introduction of ['Choose the oven or the grill:','Use the well method if the mixer is broken:','This dough needs careful handling:'])assert.deepEqual(findings(introduction+'\n'+alternative),[]);
 assert.deepEqual(findings('Choose one of these methods:\n[\n]\n-OR-\n[\n]'),[]);
 assert.deepEqual(findings('Choose one of these methods:\n[\n{dough} <mix>\n]'),[]);
});
test('CQ010 Meanwhile checks its preceding action and preserves extra procedural details',()=>{
 const body=(line:string,previous='{dough} <rest>')=>previous+'\nMeanwhile [\n'+line+'\n{cheese filling} <mix>\n]';
 for(const line of ['While the dough rests:','While the dough rests, make the filling:'])assert.equal(findings(body(line))[0]?.classification,'redundant-narration');
 for(const line of ['While the dough rests for 30 minutes:','While the dough rests, make the sauce:','While the oven heats:','Keep the dough covered:'])assert.deepEqual(findings(body(line)),[]);
 assert.deepEqual(findings(body('While the dough rests:','{dough} <rest> <cook>')),[]);
 assert.deepEqual(findings(body('While the dough rests:','{sauce} <rest>')),[]);
 assert.deepEqual(findings('While the dough rests:\n{filling} <mix>'),[]);
});
test('CQ010 Optional narration requires the identical simple addition',()=>{
 const body=(line:string)=>line+'\nOptional [\n+ (seafood)\n]';
 assert.equal(findings(body('Optionally add seafood:'))[0]?.suggestedDestination,'remove');
 assert.deepEqual(findings(body('Optionally add salt:')),[]);
 assert.deepEqual(findings(body('Optionally add seafood after cooling:')),[]);
 assert.deepEqual(findings('Optionally add seafood:\nOptional [\n+ (seafood) + (salt)\n]'),[]);
});
test('CQ010 navigation reports exact fragments and requires target review before removal',()=>{
 const text='Skip to step 7; as stated in step 16, continue with step 10, use the method above, then return to step 4.';
 const fs=findings(text);assert.equal(fs.length,5);
 for(const f of fs){assert.equal(f.classification,'source-navigation');assert.equal(f.suggestedDestination,'instructions');assert.equal(f.confidence,'medium');assert.equal(source(text).slice(f.span.start,f.span.end),f.text);assert.ok(f.reason.includes('retain'));}
 assert.deepEqual(findings('Take 7 steps back from the counter.'),[]);
});
test('procedural prose, ordinary serve/store/freeze, labels and cook-facing warnings remain instructions',()=>{
 for(const text of ['Keep the pieces not currently being worked on covered so they do not dry out.','Store the ravioli on floured wax paper or freeze them for later.','Serve immediately with the sauce.','Optionally add seafood.','Freeze the mixture until firm.','Do not leave raw chicken at room temperature.','Or else they will explode when cooked.','Well method:','The basic rule of thumb I use is never leave food uncovered.','The rule of thumb I use is 100g per person. Cook for 10 minutes.'])assert.deepEqual(findings(text),[],text);
});
test('notes, story, comments, source and process parameters are not reclassified',()=>{
 const text='The basic rule of thumb I use is 100g per person.';
 const r=parseRecipe(source('# '+text+'\n{x} <cook, '+text+'>\n::notes\n'+text+'\n::story\n'+text+'\n::source\n<<<\n'+text+'\n>>>'));
 assert.deepEqual(proseEvidence(r),[]);
});
test('evidence preserves exact Unicode/CRLF source spans and never changes the AST',()=>{
 const s=source('{dough} <rest>\nMeanwhile [\n    While the dough rests:\n    {filling} <mix>\n]\nFor the seafood version, serve with (crème fraîche).').replaceAll('\n','\r\n');
 const r=parseRecipe(s),before=JSON.stringify(r),code=renderCode(r);const fs=proseEvidence(r);assert.equal(fs.length,2);
 for(const f of fs){assert.equal(s.slice(f.span.start,f.span.end),f.text);const lines=s.slice(0,f.span.start).split('\r\n');assert.equal(f.span.line,lines.length);assert.equal(f.span.column,lines.at(-1)!.length+1);}
 assert.deepEqual(proseEvidence(r),fs);assert.equal(JSON.stringify(r),before);assert.equal(renderCode(r),code);
});
test('audit exposes stable CQ009/CQ010 evidence without adding score components',()=>{
 const r=parseRecipe(source('The basic rule of thumb I use is 100g per person.\nContinue with step 10.'));
 const a=auditConversion(r,vocabulary);assert.equal(a.ruleCounts.CQ009,1);assert.equal(a.ruleCounts.CQ010,1);
 assert.deepEqual(a.proseCandidates,proseEvidence(r));
 for(const d of a.diagnostics.filter(d=>['CQ009','CQ010'].includes(d.rule))){assert.equal(d.severity,'warning');assert.equal(d.evidence.text,r.source.slice(d.span.start,d.span.end));}
 let sum=0,weight=0;for(const k of Object.keys(qualityModel.weights) as (keyof typeof qualityModel.weights)[]){const ratio=a.scoreComponents[k];if(ratio!==null){sum+=ratio*qualityModel.weights[k];weight+=qualityModel.weights[k];}}
 assert.equal(a.score,Math.round(10000*sum/weight)/100);
});
test('conversion helper returns source-relative evidence but keeps its existing output',()=>{
 const original='12. For the seafood version, serve with red sauce.';
 const converted=method(original);assert.equal(converted.mode,'literal');assert.equal(converted.line,original.slice(4));assert.equal(converted.original,original);
 const f=converted.proseEvidence![0];assert.equal(f.suggestedDestination,'notes');assert.equal(original.slice(f.span.start,f.span.end),f.text);assert.equal(f.span.column,5);
 assert.equal(method('Serve immediately.').proseEvidence,undefined);
 const plain='Choose one of these methods:';assert.deepEqual(classifyProse(plain,span(plain)),[]);
});
