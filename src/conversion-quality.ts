import { actionBoundaries, vocabularyActionHeads, undeclaredUses } from './conversion-evidence.ts';
import type { Recipe, Node, Statement, Token, Span } from './model/index.ts';
import type { Vocabulary } from './vocabulary/index.ts';

export const qualityModel = {
  version: 2,
  weights: { ingredients: 25, equipment: 15, leakage: 15, prose: 15, processes: 10, density: 20 },
  thresholds: { longWords: 30, longChars: 180, longMaxTokens: 1, longMaxDensity: 0.15, processWords: 16, processChars: 100, densityTarget: 0.5, lowDensity: 0.2, repeatedIntermediate: 2 },
  bands: { strong: 85, acceptable: 70, partial: 45, poor: 0 },
  rules: {
    CQ001: 'Declared ingredient has no unambiguous structural use (choice alternatives may be legitimate).',
    CQ002: 'Declared equipment has no unambiguous structural use.',
    CQ003: 'Unambiguous known declared/resolved ingredient or equipment name occurs in instruction prose.',
    CQ004: 'Instruction line has >=30 words or >=180 characters, with <=1 token or <15% structural character coverage.',
    CQ005: 'Likely additional action head at a clause boundary or subordinate participle; length remains a low-confidence fallback.',
    CQ006: 'Instruction structural character coverage is below 20%.',
    CQ007: 'Repeated the dough/mixture/batter/sauce/filling without a matching named result; low confidence, no score penalty.',
    CQ008: 'Confidently recognised ingredient/equipment used culinarily in instructions but not declared; advisory, no score penalty.'
  }
} as const;
export interface QualityDiagnostic { rule: keyof typeof qualityModel.rules; severity: 'warning'; confidence: 'high' | 'medium' | 'low'; message: string; span: Span; evidence: Record<string, unknown> }
const words = (s: string) => s.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
const norm = (s: string) => s.trim().toLowerCase();
const round = (n: number) => Math.round(n * 100) / 100;
function flatten(nodes: Node[]): Node[] { return nodes.flatMap(n => [n, ...((n.kind === 'statement' || n.kind === 'group') ? flatten(n.children) : []), ...(n.kind === 'group' && n.condition ? [n.condition] : [])]); }
const statements = (nodes: Node[]) => flatten(nodes).filter((n): n is Statement => n.kind === 'statement');
const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function matches(text: string, term: string) { return [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped(term)}(?![\\p{L}\\p{N}_])`, 'giu'))]; }
function location(source: string, start: number, end: number): Span { const before = source.slice(0, start); return { start, end, line: before.split('\n').length, column: start - before.lastIndexOf('\n') }; }
function unionLength(ranges: [number, number][]) { let end = -1, total = 0; for (const [a,b] of ranges.sort((x,y)=>x[0]-y[0])) { total += Math.max(0,b-Math.max(a,end)); end=Math.max(end,b); } return total; }

/** Pure, deterministic per-recipe quality audit. Never mutates the AST or parser diagnostics. */
export function auditConversion(recipe: Recipe, vocabulary: Vocabulary) {
  const diagnostics: QualityDiagnostic[] = [];
  const add = (rule: QualityDiagnostic['rule'], span: Span, message: string, evidence: Record<string, unknown>, confidence: 'high' | 'medium' | 'low' = 'medium') => diagnostics.push({rule,severity:'warning',confidence,message,span,evidence});
  const instructionSections = recipe.sections.filter(s=>s.name==='instructions');
  const nodes = instructionSections.flatMap(s=>flatten(s.children));
  const lines = nodes.filter(n=>n.kind==='statement' || n.kind==='prose');
  const sts = nodes.filter((n): n is Statement=>n.kind==='statement');
  const tokens = sts.flatMap(s=>s.tokens);
  const structural = tokens.filter(t=>['thing','result','process'].includes(t.kind));
  const uses = tokens.filter(t=>t.kind==='thing' && t.thingKind!=='ambiguous' && t.thingKind!=='unresolved');
  function coverage(section: string, rule: 'CQ001'|'CQ002') {
    const declarations = recipe.sections.filter(s=>s.name===section).flatMap(s=>statements(s.children)).flatMap(s=>s.tokens.filter(t=>t.kind==='thing').map(t=>({statementId:s.id, token:t})));
    const items = declarations.map(({statementId,token:t})=>{
      // Declaration IDs identify statements, not individual alternatives: also require token identity.
      const referenced = uses.some(u=>u.declarationIds?.length===1 && u.declarationIds[0]===statementId &&
        (norm(u.name??'')===norm(t.name??'') || !!u.canonicalId && u.canonicalId===t.canonicalId) &&
        (!t.variant || !u.variant || norm(t.variant)===norm(u.variant)) &&
        (t.parts??[]).every((p,i)=>norm(p)===norm(u.parts?.[i]??'')));
      const item={name:t.name??t.raw,raw:t.raw,canonicalId:t.canonicalId??null,thingKind:t.thingKind,span:t.span,referenced};
      if(!referenced)add(rule,t.span,`${t.raw} has no unambiguous structural instruction reference.`,{declaration:item});
      return item;
    });
    const referenced=items.filter(i=>i.referenced).length;
    return {total:items.length,referenced,unreferenced:items.filter(i=>!i.referenced),percentage:items.length?round(100*referenced/items.length):null,items};
  }
  const ingredients=coverage('ingredients','CQ001'), equipment=coverage('equipment','CQ002');
  const conceptTokens = [...ingredients.items,...equipment.items].filter(t=>t.canonicalId).map(t=>({id:t.canonicalId!,kind:t.thingKind}));
  for(const t of uses)if(t.canonicalId)conceptTokens.push({id:t.canonicalId,kind:t.thingKind});
  const termMap=new Map<string,{id:string;kind:string}[]>();
  for(const e of vocabulary.entries.filter(e=>conceptTokens.some(c=>c.id===e.id&&c.kind===e.kind))){
    for(const term of new Set([e.canonical_name??'',...Object.values(e.names),...Object.values(e.plural_names??{}),...(e.aliases??[]).map(a=>typeof a==='string'?a:a.name)].map(norm).filter(t=>t.length>=3))){
      const globally=[...vocabulary.resolve(term,'ingredient'),...vocabulary.resolve(term,'equipment')];
      if(globally.length!==1)continue;
      termMap.set(term,[{id:e.id,kind:e.kind}]);
    }
  }
  const prose: {text:string;start:number}[]=[];
  for(const n of lines)if(n.kind==='prose')prose.push({text:n.text,start:n.span.start});else if(n.kind==='statement')for(const t of n.tokens)if(t.kind==='text')prose.push({text:t.raw,start:t.span.start});
  const rawMatches: {concept:string;kind:string;text:string;span:Span}[]=[];
  for(const p of prose){const found=[...termMap].flatMap(([term,cs])=>matches(p.text,term).map(m=>({concept:cs[0].id,kind:cs[0].kind,text:m[0],span:location(recipe.source,p.start+m.index!,p.start+m.index!+m[0].length)}))).sort((a,b)=>a.span.start-b.span.start||b.text.length-a.text.length);let end=-1;for(const f of found)if(f.span.start>=end){rawMatches.push(f);end=f.span.end;add('CQ003',f.span,`Raw ${f.kind} term: ${f.text}`,f);}}
  let chars=0,wordCount=0,represented=0;
  const longSpans: Record<string,unknown>[]=[];
  for(const n of lines){const ts=n.kind==='statement'?n.tokens:[];const text=n.kind==='statement'?ts.map(t=>t.raw).join(''):n.kind==='prose'?n.text:'';const st=ts.filter(t=>['thing','result','process'].includes(t.kind));const length=text.length;const count=words(text);const occupied=unionLength([...st.map(t=>[t.span.start,t.span.end] as [number,number]),...(n.kind==='statement'?(n.quantities??[]).map(q=>[q.span.start,q.span.end] as [number,number]):[])]);chars+=length;wordCount+=count;represented+=Math.min(length,occupied);const density=length?occupied/length:0;if((count>=30||length>=180)&&(st.length<=1||density<0.15)){const evidence={text,words:count,characters:length,structuredTokens:st.length,density:round(density)};longSpans.push(evidence);add('CQ004',n.span,'Long instruction span with little structural syntax.',evidence);}}
  const processTokens=tokens.filter(t=>t.kind==='process');
  const heads=vocabularyActionHeads(vocabulary);
  for(const t of processTokens) {
    const body=t.raw.slice(1,-1), boundaries=actionBoundaries(body,heads);
    const reasons=[...(boundaries.length?['additional action-head evidence']:[]),...(words(body)>=16?['word count >=16']:[]),...(body.length>=100?['body >=100 characters']:[])];
    if(reasons.length)add('CQ005',t.span,'Possibly overlong or multi-action process token.',{raw:t.raw,words:words(body),characters:body.length,boundaries,reasons},boundaries.length?'medium':'low');
  }
  const declarationTokens=recipe.sections.filter(s=>['ingredients','equipment'].includes(s.name)).flatMap(s=>statements(s.children)).flatMap(s=>s.tokens.filter(t=>t.kind==='thing'));
  const undeclared=undeclaredUses(recipe,vocabulary,sts,declarationTokens);
  for(const finding of undeclared)add('CQ008',finding.span,'Undeclared '+finding.kind+': '+finding.matchedText,finding as unknown as Record<string,unknown>,'high');
  const density=chars?represented/chars:0;
  if(density<0.2)add('CQ006',instructionSections[0]?.span??location(recipe.source,0,0),'Low instruction structural character coverage.',{density:round(density),characters:chars});
  for(const term of ['dough','mixture','batter','sauce','filling']){const hits=prose.flatMap(p=>matches(p.text,`the ${term}`).map(m=>location(recipe.source,p.start+m.index!,p.start+m.index!+m[0].length)));if(hits.length>=2&&!tokens.some(t=>t.kind==='result'&&matches(t.name??'',term).length))add('CQ007',hits[0],`Repeated prose intermediate: the ${term}`,{term,count:hits.length,spans:hits},'low');}
  const countRule=(id:QualityDiagnostic['rule'])=>diagnostics.filter(d=>d.rule===id).length;
  const ratios={ingredients:ingredients.total?ingredients.referenced/ingredients.total:null,equipment:equipment.total?equipment.referenced/equipment.total:null,leakage:Math.max(0,1-rawMatches.length/Math.max(1,uses.length+rawMatches.length)),prose:1-longSpans.length/Math.max(1,lines.length),processes:processTokens.length?1-countRule('CQ005')/processTokens.length:null,density:Math.min(1,density/0.5)};
  let sum=0,weight=0;for(const k of Object.keys(ratios) as (keyof typeof ratios)[]){if(ratios[k]!==null){sum+=ratios[k]!*qualityModel.weights[k];weight+=qualityModel.weights[k];}}
  const score=round(weight?100*sum/weight:0);const band=score>=85?'strong':score>=70?'acceptable':score>=45?'partial':'poor';
  diagnostics.sort((a,b)=>a.span.start-b.span.start||a.rule.localeCompare(b.rule));
  return {undeclared,score,band,scoreComponents:ratios,ingredients,equipment,rawMatches,metrics:{instructionCharacters:chars,instructionWords:wordCount,instructionLines:lines.length,thingReferences:tokens.filter(t=>t.kind==='thing').length,ingredientReferences:uses.filter(t=>t.thingKind==='ingredient').length,equipmentReferences:uses.filter(t=>t.thingKind==='equipment').length,processReferences:processTokens.length,resultReferences:tokens.filter(t=>t.kind==='result').length,values:sts.reduce((n,s)=>n+(s.quantities?.length??0),0),structuredTokenCount:structural.length,structuredCharacters:represented,structuralCharacterPercentage:round(density*100),tokensPer100Words:round(100*structural.length/Math.max(1,wordCount))},ruleCounts:Object.fromEntries(Object.keys(qualityModel.rules).map(k=>[k,countRule(k as QualityDiagnostic['rule'])])),diagnostics,parser:{errors:recipe.diagnostics.filter(d=>d.severity==='error').length,warnings:recipe.diagnostics.filter(d=>d.severity==='warning').length,diagnostics:recipe.diagnostics}};
}
