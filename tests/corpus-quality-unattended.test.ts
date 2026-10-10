import assert from 'node:assert/strict';import test from 'node:test';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
import {parseRecipe,renderCompact,renderHtml,semanticTokens,type Node} from '../src/index.ts';import {loadVocabulary} from '../src/vocabulary/node.ts';import {auditConversion} from '../src/conversion-quality.ts';import {corpusRepairs,restoreCorpusRepairs} from './helpers/corpus-quality-unattended.ts';
const vocabulary=await loadVocabulary('.');
for(const [slug,record] of Object.entries(corpusRepairs.recipes))test('reviewed corpus repair preserves source and protected metadata: '+slug,async()=>{
 const source=await readFile('examples/public-domain-recipes/'+slug+'/'+slug+'.opensauce','utf8');
 assert.equal(createHash('sha256').update(source).digest('hex'),record.afterSha256);
 assert.equal(restoreCorpusRepairs(source,slug),record.beforeSource);
 assert.throws(()=>restoreCorpusRepairs(source+'\n',slug),/Unrecorded/);
 assert.equal(source.slice(source.indexOf('::source')),record.beforeSource.slice(record.beforeSource.indexOf('::source')));
 const r=parseRecipe(source,{vocabulary}),b=parseRecipe(record.beforeSource,{vocabulary});
 assert.equal(b.conversionStage,'initial');assert.equal(r.conversionStage,'reworked');
 for(const field of ['category','dietary','cuisine','region','curation'] as const)assert.deepEqual(r[field],b[field]);
 assert.equal(r.diagnostics.filter(d=>d.severity==='error').length,0);
 assert.ok(renderCompact(r).includes('Instructions:'));
 assert.ok(auditConversion(r,vocabulary).score>=auditConversion(b,vocabulary).score);
});

const acceptedSlugs = ['baked-salmon','crab-salad','honey-vanilla-ice-cream','indian-tea','orange-jam','pizza-dough','pizza-sauce','ravioli','yogurt'];
const flatten = (nodes: readonly Node[]): Node[] => nodes.flatMap(n => [n, ...((n.kind === 'group' || n.kind === 'statement') ? flatten(n.children) : [])]);
const reviewed = async (slug: string) => parseRecipe(await readFile(`examples/public-domain-recipes/${slug}/${slug}.opensauce`, 'utf8'), {vocabulary});
test('review tranche distinguishes 47 Codex repairs from nine user-accepted ChatGPT rewrites', () => {
 assert.deepEqual(Object.entries(corpusRepairs.recipes).filter(([,r]) => r.authorship === 'chatgpt-user-accepted').map(([slug]) => slug).sort(), acceptedSlugs);
 assert.equal(Object.values(corpusRepairs.recipes).filter(r => r.authorship === 'codex').length,47);
 assert.ok(!Object.hasOwn(corpusRepairs.recipes,'taco-meat'));
});
test('Ravioli keeps alternative assembly bindings, attached judgements and genuine parallel filling work',async()=>{
 const r=await reviewed('ravioli'),sections=r.sections.filter(s=>s.name==='instructions');assert.equal(sections.length,1);
 const nodes=flatten(sections[0].children),statements=nodes.filter(n=>n.kind==='statement');
 const assignments=statements.filter(n=>n.role==='assignment' && n.tokens.find(t=>t.kind==='result')?.name==='ravioli sheet');
 assert.equal(assignments.length,2);
 const firstUse=statements.find(n=>n.tokens.some(t=>t.kind==='process' && t.name==='press' ) && n.tokens.some(t=>t.kind==='result' && t.name==='ravioli sheet'))!;
 assert.ok(assignments.every(n=>n.span.start<firstUse.span.start));
 const meanwhile=sections[0].children.findIndex(n=>n.kind==='group' && n.relationship==='Meanwhile');
 const prior=sections[0].children.slice(0,meanwhile).filter(n=>n.kind==='statement').at(-1)!;
 assert.ok(prior.tokens.some(t=>t.kind==='process' && t.name==='refrigerate'));
 const tokens=statements.flatMap(n=>semanticTokens(n.tokens));
 assert.ok(tokens.filter(t=>t.kind==='judgement').every(t=>t.judgement?.processSpan));
 const cutters=tokens.filter(t=>t.kind==='thing' && ['pasta cutter','knife','pizza cutter'].includes(t.name??''));
 assert.deepEqual([...new Set(cutters.map(t=>t.name))].sort(),['knife','pasta cutter','pizza cutter']);
 assert.ok(nodes.some(n=>n.kind==='group' && n.relationship==='Optional' && flatten(n.children).some(x=>x.kind==='statement' && x.tokens.some(t=>t.name==='seafood choice'))));
 const compact=renderCompact(r);assert.equal(compact.match(/Instructions:/g)?.length,1);assert.doesNotMatch(compact,/\{(?:bottom sheet|dough sheet)\}|\?=/);
 for(const label of ['Well method','Stand-mixer method','Two-sheet method','Fold-over method'])assert.ok(compact.includes(label));
});
test('tea alternatives are both optional and salmon uses the correct action subjects',async()=>{
 const tea=await reviewed('indian-tea'),body=tea.sections.find(s=>s.name==='instructions')!.children;
 const optional=body.find(n=>n.kind==='group' && n.relationship==='Optional');assert.ok(optional?.kind==='group');
 assert.equal(optional.children.filter(n=>n.kind==='group').length,2);
 assert.equal(optional.children.filter(n=>n.kind==='statement' && n.role==='alternative').length,1);
 const salmon=renderCompact(await reviewed('baked-salmon'));assert.match(salmon,/Squeeze the lemon juice onto salmon/);assert.match(salmon,/Top the salmon with butter/);assert.doesNotMatch(salmon,/squeeze the salmon/i);
});
test('reviewed local choices stay unlinked while canonical references retain targets',async()=>{
 const r=await reviewed('baked-salmon');
 const html=renderHtml(r,{view:'code',referenceUrl:ref=>`/references/${ref.kind}/${ref.canonicalId}`});
 assert.match(html,/href="\/references\/ingredient\/salmon"/);
 assert.doesNotMatch(html,/href="[^"]*(?:cooking-fat|baking-vessel)/);
 assert.match(html,/cooking fat/);assert.match(html,/baking vessel/);
});
