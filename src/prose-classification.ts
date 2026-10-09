import type { Group, Node, Recipe, Span } from './model/index.ts';

/** Review evidence only: never permission to move, hide or delete source text. */
export interface ProseEvidence {
  rule: 'CQ009' | 'CQ010';
  text: string;
  span: Span;
  classification: 'author-commentary' | 'serving-advice' | 'storage-advice' | 'variation-advice' | 'make-ahead-advice' | 'redundant-narration' | 'source-navigation';
  confidence: 'high' | 'medium';
  suggestedDestination: 'notes' | 'comment' | 'remove' | 'instructions';
  reason: string;
  relatedSpans?: Span[];
}
const subspan = (span: Span, start: number, length: number): Span => ({
  start: span.start + start, end: span.start + start + length,
  line: span.line, column: span.column + start
});

/** Classify one literal source line without guessing execution relationships.
 * Unmatched prose remains an instruction; callers retain the original text. */
export function classifyProse(text: string, span: Span): ProseEvidence[] {
  const evidence: ProseEvidence[] = [];
  const add = (classification: ProseEvidence['classification'], suggestedDestination: ProseEvidence['suggestedDestination'], reason: string, confidence: ProseEvidence['confidence'] = 'medium') =>
    evidence.push({rule: 'CQ009', text, span, classification, suggestedDestination, reason, confidence});
  // Navigation is a fragment, not permission to discard its containing cooking instruction.
  for (const m of text.matchAll(/\b(?:skip to|as stated in|continue (?:with|at)|return to|go (?:back )?to) step\s+\d+\b|\buse the method (?:above|below)\b/gi)) {
    evidence.push({rule:'CQ010',text:m[0],span:subspan(span,m.index!,m[0].length),classification:'source-navigation',confidence:'medium',suggestedDestination:'instructions',reason:'Source navigation needs review: retain it until its target and meaning are represented by groups, alternatives, continuations or results.'});
  }
  // High confidence only for explicit personal commentary, never generic cook-facing warnings.
  if (/^\s*(?:the (?:basic )?)?rule of thumb I (?:use|follow)\b/i.test(text) && !/\b(?:must|never|warning|do not|then)\b/i.test(text) && !/[.!?]\s+\p{Lu}/u.test(text))
    add('author-commentary','comment','Explicit personal rule-of-thumb commentary; preserve as a comment after checking it is not the sole required cooking instruction.','high');
  else if (/^\s*(?:for (?:the |a )?[^.!?:]+ version,?\s*serve\b|serving suggestion\s*:|I (?:like|prefer) to serve\b)/i.test(text) && !/\b(?:then|must|immediately|before|until)\b/i.test(text))
    add('serving-advice','notes','Explicit serving suggestion or version-specific serving advice, rather than a bare serving action.');
  else if (/^\s*(?:or spice it up a bit\s*:|for (?:a|an) [^.!?:]+ variation\s*[:,]|(?:as an alternative|if you prefer),?\s+(?:use|substitute)\b)/i.test(text))
    add('variation-advice','notes','Explicit variation or substitution framing; review whether it is side advice or an active recipe branch.');
  else if (/^\s*(?:storage (?:advice|tip)\s*:|leftovers? (?:can|may) be (?:stored|refrigerated|frozen)\b|for (?:longer|long-term) storage,?\s)/i.test(text))
    add('storage-advice','notes','Explicit leftover/long-term storage advice; ordinary procedural store/freeze instructions are not classified.');
  else if (/^\s*(?:make-ahead (?:advice|tip)\s*:|(?:this|the [\p{L} -]+) can be (?:made|prepared) (?:a day |the day |\d+ days? )?(?:ahead|in advance)\b)/iu.test(text))
    add('make-ahead-advice','notes','Explicit make-ahead capability or advice, not a required preparation action.');
  return evidence;
}

const literal = (n: Node): {text: string; span: Span} | undefined => {
  if (n.kind === 'prose') return {text:n.text,span:{...n.span,start:n.span.start+n.indent,column:n.indent+1}};
  if (n.kind !== 'statement' || n.tokens.some(t => ['process','operator','judgement','image'].includes(t.kind)) || !n.tokens.length) return;
  return {text:n.tokens.map(t=>t.raw).join(''),span:{...n.tokens[0].span,end:n.tokens.at(-1)!.span.end}};
};
const meaningful = (nodes: Node[]) => nodes.filter(n => n.kind !== 'blank' && n.kind !== 'comment');
const norm = (s: string) => s.toLowerCase().replace(/[(){}<>]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const contents = (n: Node): string => n.kind === 'statement' ? n.tokens.map(t=>t.kind==='thing'||t.kind==='result'?t.name:t.raw).join('')+' '+n.children.map(contents).join(' ') : n.kind==='group'?n.children.map(contents).join(' '):n.kind==='prose'||n.kind==='comment'?n.text:'';
const has = (n: Node, phrase: string) => (' '+norm(contents(n))+' ').includes(' '+norm(phrase)+' ');
const groupsHaveContent = (g: Group) => meaningful(g.children).some(n => n.kind==='statement' || n.kind==='group');

/** Instruction-only, structure-aware candidates. Notes/story/comments/source are excluded. */
export function proseEvidence(recipe: Recipe): ProseEvidence[] {
  const result: ProseEvidence[] = [];
  function walk(nodes: Node[], parent?: Group, preceding?: Node) {
    const items=meaningful(nodes);
    items.forEach((n,i)=>{
      const p=literal(n);
      if(p){
        const next=items[i+1], or=items[i+2], right=items[i+3];
        let reason: string|undefined, relatedSpans: Span[]=[];
        const choose=p.text.match(/^Choose (.+?) or (.+?):\s*$/i);
        if(next?.kind==='group' && next.relationship==='group' && right?.kind==='group' && right.relationship==='group' && or?.kind==='statement' && or.role==='alternative' && groupsHaveContent(next) && groupsHaveContent(right)) {
          const label=(s:string)=>s.replace(/^(?:the |old-school )+/gi,'').replace(/ method$/i,'');
          if(/^Choose (?:one of these|one of the following) methods:\s*$/i.test(p.text) || choose && has(next,label(choose[1])) && has(right,label(choose[2]))) {
            reason='Immediate populated blocks joined by -OR- already express this choice; named methods must match branch content.';relatedSpans=[next.span,or.span,right.span];
          }
        }
        if(!reason && i===0 && parent?.relationship==='Meanwhile' && preceding?.kind==='statement') {
          const m=p.text.match(/^While (?:the )?([\p{L} -]+?) (rests|cooks|simmers|bakes)(?:, (?:make|prepare) (?:the )?([\p{L} -]+))?:\s*$/iu);
          const action=m?.[2].slice(0,-1);
          if(m && preceding.tokens.some(t=>(t.kind==='thing'||t.kind==='result')&&norm(t.name??'')===norm(m[1])) && preceding.tokens.filter(t=>t.kind==='process').at(-1)?.name===action && items.slice(1).some(n=>n.kind==='statement') && (!m[3]||items.slice(1).some(n=>has(n,m[3])))) {
            reason='Meanwhile already relates this group to the matching preceding action; the named preparation is present in the group.';relatedSpans=[preceding.span,parent.span];
          }
        }
        if(!reason && next?.kind==='group' && next.relationship==='Optional') {
          const m=p.text.match(/^Optionally add (?:the )?([\p{L} -]+):\s*$/iu);
          const body=meaningful(next.children);
          if(m && body.length===1 && body[0].kind==='statement' && !body[0].children.length) {
            const ts=body[0].tokens.filter(t=>t.raw.trim());
            if(ts.length===2 && ts[0].raw==='+' && ts[1].kind==='thing' && norm(ts[1].name??'')===norm(m[1])) {
              reason='The immediately following Optional group contains exactly the same ingredient addition.';relatedSpans=[next.span];
            }
          }
        }
        if(reason)result.push({rule:'CQ010',text:p.text,span:p.span,classification:'redundant-narration',confidence:'high',suggestedDestination:'remove',reason,relatedSpans});
        else result.push(...classifyProse(p.text,p.span));
      }
      if(n.kind==='group')walk(n.children,n,items[i-1]);
      else if(n.kind==='statement')walk(n.children);
    });
  }
  for(const section of recipe.sections.filter(s=>s.name==='instructions'))walk(section.children);
  return result;
}
