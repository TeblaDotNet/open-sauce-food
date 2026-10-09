import type { Vocabulary, VocabularyEntry } from './vocabulary/index.ts';
import type { Recipe, Statement, Span, Token } from './model/index.ts';
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s: string) => s.trim().toLowerCase();
const participles: Record<string, string> = { stirring: 'stir', turning: 'turn', whisking: 'whisk', mixing: 'mix', flipping: 'flip', basting: 'baste' };
/** Evidence of another action head, not a general English parser. */
export function actionBoundaries(body: string, knownHeads: readonly string[]): { head: string; offset: number; reason: string }[] {
  const heads = [...new Set(knownHeads.map(norm))].filter(h => /^[a-z]+(?:[ -][a-z]+)*$/.test(h)).sort((a,b) => b.length-a.length);
  const findings: { head: string; offset: number; reason: string }[] = [];
  if (!heads.length) return findings;
  const pattern = new RegExp('([.;]\\s+|\\bthen\\s+|\\band\\s+)(' + heads.map(escape).join('|') + ')(?=\\s|[.,;]|$)', 'gi');
  for (const m of body.matchAll(pattern)) {
    const after = body.slice(m.index! + m[0].length);
    // Conjunctions also join nouns. Require a following object/adverb, and reject
    // the common seasoning idiom rather than treating "taste" as an action.
    if (/^and/i.test(m[1]) && (!/^\s+[a-z0-9]/i.test(after) || /^\s+(?:to taste|and|or)\b/i.test(after))) continue;
    findings.push({ head: m[2].toLowerCase(), offset: m.index! + m[1].length, reason: 'action after sentence/sequential/conjunction boundary' });
  }
  for (const m of body.matchAll(/(?:,\s*|\bwhile\s+)(stirring|turning|whisking|mixing|flipping|basting)\b/gi)) {
    const head = participles[m[1].toLowerCase()];
    if (heads.includes(head)) findings.push({ head, offset: m.index! + m[0].toLowerCase().indexOf(m[1].toLowerCase()), reason: 'separate subordinate action in parameters' });
  }
  return findings.sort((a,b) => a.offset-b.offset);
}
export function vocabularyActionHeads(vocabulary: Vocabulary): string[] {
  return vocabulary.entries.filter(e => e.kind === 'process').flatMap(e => [e.id, ...Object.values(e.names), ...(e.aliases ?? []).map(a => typeof a === 'string' ? a : a.name)]);
}
export interface UndeclaredUse {
  canonicalId: string; kind: 'ingredient' | 'equipment'; matchedText: string;
  span: Span; confidence: 'high'; reason: string; explicitQuantity: boolean;
  quantity?: { raw: string; span: Span }; context: string; suggestedSection: 'ingredients' | 'equipment';
}
function span(source: string, start: number, end: number): Span {
  const before = source.slice(0,start), lines = before.split(/\r\n|\r|\n/);
  return { start, end, line: lines.length, column: lines.at(-1)!.length+1 };
}
const number = String.raw`(?:!|~~|~)?(?:\d+(?:\.\d+)?(?:\s+\d+\/\d+|\/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])`;
const units = String.raw`(?:cups?|tbsps?|tsps?|tablespoons?|teaspoons?|g|kg|mg|ml|l|oz|lbs?|pounds?|ounces?|grams?|pinch(?:es)?)`;
const measureBefore = new RegExp('(' + number + '\\s*' + units + ')(?:\\s+of)?\\s+(?:(?:cold|hot|warm|boiling|chopped|minced|ground)\\s+)?$', 'i');
const measureAfter = new RegExp('^\\s*(' + number + '(?:\\s*' + units + '\\b)?)', 'i');
/** Deliberately bounded culinary-use evidence. No writes or inferred quantities. */
export function undeclaredUses(recipe: Recipe, vocabulary: Vocabulary, instructions: readonly Statement[], declarations: readonly Token[]): UndeclaredUse[] {
  const declared = new Set<string>();
  const localNames = new Set(declarations.filter(t => t.thingKind === 'choice').map(t => norm(t.name ?? '')));
  for (const t of declarations) {
    const kind = t.thingKind === 'ingredient' || t.thingKind === 'equipment' ? t.thingKind : undefined;
    if (kind) for (const e of vocabulary.resolve(t.name ?? '',kind)) declared.add(e.kind+':'+e.id);
  }
  const terms = new Map<string,VocabularyEntry[]>();
  for (const e of vocabulary.entries.filter(e => e.kind !== 'process')) for (const name of [e.id, ...Object.values(e.names), ...Object.values(e.plural_names ?? {}), ...(e.aliases ?? []).map(a => typeof a === 'string' ? a : a.name)]) {
    const key=norm(name); if(key.length<3)continue;
    const list=terms.get(key)??[]; if(!list.some(x=>x.kind===e.kind&&x.id===e.id))list.push(e);terms.set(key,list);
  }
  const result: UndeclaredUse[]=[];
  function record(entry: VocabularyEntry, text: string, start: number, reason: string, context: string, quantity?: { raw: string; span: Span }) {
    if(entry.kind==='process'||declared.has(entry.kind+':'+entry.id))return;
    result.push({canonicalId:entry.id,kind:entry.kind,matchedText:text,span:span(recipe.source,start,start+text.length),confidence:'high',reason,explicitQuantity:!!quantity,quantity,context,suggestedSection:entry.kind==='ingredient'?'ingredients':'equipment'});
  }
  for (const n of instructions) {
    for(let i=0;i<n.tokens.length;i++) {
      const t=n.tokens[i];
      if(t.kind==='thing') {
        if(t.thingKind==='choice'||localNames.has(norm(t.name??'')))continue;
        const entries=[...vocabulary.resolve(t.name??'','ingredient'),...vocabulary.resolve(t.name??'','equipment')];
        if(entries.length!==1)continue;
        const tail=recipe.source.slice(t.span.end,n.tokens.slice(i+1).find(t => ['thing','result','process','judgement'].includes(t.kind))?.span.start ?? n.span.end);
        const q=measureAfter.exec(tail); const quantity=q?{raw:q[1],span:span(recipe.source,t.span.end+q.index+q[0].indexOf(q[1]),t.span.end+q.index+q[0].indexOf(q[1])+q[1].length)}:undefined;
        record(entries[0],t.raw,t.span.start,'explicit structured thing with a unique vocabulary identity',recipe.source.slice(n.span.start,n.span.end),quantity);
        continue;
      }
      if(t.kind!=='text'&&t.kind!=='process')continue;
      const text=t.kind==='process'?t.raw.slice(1,-1):t.raw,start=t.span.start+(t.kind==='process'?1:0);
      const found=[...terms].flatMap(([name,entries])=>[...text.matchAll(new RegExp('(?<![\\p{L}\\p{N}_])'+escape(name)+'(?![\\p{L}\\p{N}_])','giu'))].map(m=>({m,entries}))).sort((a,b)=>a.m.index!-b.m.index!||b.m[0].length-a.m[0].length);
      let end=-1;
      for(const {m,entries}of found) {
        if(m.index!<end)continue;end=m.index!+m[0].length;
        // Reserve ambiguous/declared longer phrases too: do not fall back to a nested word.
        if(entries.length!==1)continue; const entry=entries[0];
        if(declared.has(entry.kind+':'+entry.id)||localNames.has(norm(m[0])))continue;
        // A generic name may refer back to a more specific declaration (or vice versa).
        // Do not propose duplicate declarations without a proven relationship.
        if(declarations.some(d => d.thingKind === entry.kind && d.name && (new RegExp('(?:^|\\s)'+escape(norm(m[0]))+'(?:$|\\s)').test(norm(d.name)) || new RegExp('(?:^|\\s)'+escape(norm(d.name))+'(?:$|\\s)').test(norm(m[0])))))continue;
        const before=text.slice(0,m.index!); const clause=before.split(/[.;!?]/).at(-1)!;
        if(/\b(?:without|not|never|avoid|if|unless|like|resembles?|resembling|remember|example|imagine|discuss)\b/i.test(clause))continue;
        // Raw homographs need review; explicit (thing) notation above is stronger evidence.
        if(vocabulary.resolve(m[0],'process').length)continue;
        const q=measureBefore.exec(before);
        const quantity=q?{raw:q[1],span:span(recipe.source,start+q.index,start+q.index+q[1].length)}:undefined;
        const ingredientObject=/^\s*(?:add|combine|mix|chop|slice|dice|peel|grate|melt|stir in|fold in|season,? with)[, ]\s*(?:(?:the|some|together|chopped|minced|ground)\s+)*$/i.test(clause);
        const equipmentUse=/(?:\b(?:in|into|using)\s+|^\s*(?:heat|preheat|grease|line|cover)[, ]\s*)(?:(?:a|an|the|small|medium|large|clean|dry|non-stick|nonstick|heavy|deep)\s+)*$/i.test(clause);
        if(entry.kind==='ingredient'&&(quantity||ingredientObject))record(entry,m[0],start+m.index!,quantity?'measured ingredient in an active instruction':'direct object of an explicit culinary action',text,quantity);
        const destinationUse = /\bto\s+(?:(?:a|an|the|small|medium|large|clean|dry|non-stick|nonstick|heavy|deep)\s+)*$/i.test(clause) && /\b(?:add|pour|transfer|put|place)\b/i.test(clause);
        const subjectUse = n.tokens[i+1]?.kind === 'process' && /^(heat|preheat|grease|line|cover)$/.test(n.tokens[i+1].name ?? '') && /^(?:(?:a|an|the|small|medium|large|clean|dry|non-stick|nonstick|heavy|deep)\s+)*$/i.test(before) && !text.slice(m.index!+m[0].length).trim();
        if(entry.kind==='equipment'&&(equipmentUse||subjectUse||destinationUse))record(entry,m[0],start+m.index!,'explicit cooking-vessel/tool context',text);
      }
    }
  }
  return result;
}
