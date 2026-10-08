import type { Token } from '../model/index.ts';

// Bounded presentation of value slots, never a search through arbitrary prose.
// Unknown units/compound clauses stay literal and neutral; nothing is evaluated.
const number = String.raw`(?:\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞])`;
const unit = String.raw`(?:kg|g|mg|ml|cl|dl|l|oz|lb|lbs|tsp|tbsp|cups?|grams?|kilograms?|millilitres?|milliliters?|litres?|liters?|teaspoons?|tablespoons?|pounds?|ounces?|s|m|h|sec|secs|min|mins|seconds?|minutes?|hours?|days?|mm|cm|in|inches|°\s*[CF]|[cf]|%)`;
const amount = String.raw`(?:!|~~|~)?\s*${number}(?:\s*[-–]\s*${number})?\s*(?:${unit})?`;
const values = new RegExp(String.raw`^${amount}(?:\s*\/\s*${amount})*$`, 'i');
export function isStructuredValue(value: string): boolean {
  const text = value.trim();
  return values.test(text) || /^(?:gas\s*(?:mark\s*)?|speed\s*)\d+(?:[./]\d+)?$/i.test(text) ||
    /^(?:low|medium|high|medium-low|medium-high)(?: heat| speed)?$/i.test(text);
}

/** Complete value runs immediately after a thing/result, not incidental numbers. */
export function amountTokens(tokens: readonly Token[]): Set<Token> {
  const result = new Set<Token>();
  for (let i = 0; i < tokens.length; i++) {
    if (!['thing', 'result'].includes(tokens[i].kind)) continue;
    const run: Token[] = [];
    for (let j = i + 1; j < tokens.length && (tokens[j].kind === 'text' ||
      (tokens[j].kind === 'operator' && ['!', '~', '~~', '/'].includes(tokens[j].raw))); j++) run.push(tokens[j]);
    if (run.length && isStructuredValue(run.map(t => t.raw).join(''))) run.forEach(t => result.add(t));
  }
  return result;
}

interface Range { start: number; end: number; role: string }
export function syntaxLabel(t: Token, label: string | undefined, escape: (s: string) => string): string {
  const value = label ?? t.raw;
  const ranges: Range[] = [];
  const add = (start: number, end: number, role: string) => {
    if (start >= 0 && end > start && !ranges.some(r => start < r.end && end > r.start)) ranges.push({ start, end, role });
  };
  if (t.kind === 'result') add(0, value.length, 'result');
  if (t.kind === 'thing' && ['ingredient', 'equipment'].includes(t.thingKind ?? '')) {
    if (label === undefined) {
      const start = value.indexOf(t.name!, 1); add(start, start + t.name!.length, t.thingKind!);
      // Only explicit ; and : fields, stopping before loose comma qualifiers.
      const headEnd = value.indexOf(',') < 0 ? value.lastIndexOf(')') : value.indexOf(',');
      for (const m of value.slice(0, headEnd).matchAll(/[;:]\s*([^;:]+?)(?=\s*[;:]|$)/g)) {
        const word = m[1].trim(), offset = m.index! + m[0].indexOf(word);
        add(offset, offset + word.length, 'specificity');
      }
    } else {
      // English labels reorder known fields; only exact field words in the
      // identity portion are styled. Parenthesised loose qualifiers stay neutral.
      const identity = value.split(' (')[0];
      for (const [word, role] of [...(t.variant ? [[t.variant, 'specificity']] : []),
        ...(t.parts ?? []).map(p => [p, 'specificity']), [t.name!, t.thingKind!]]) {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}s?(?![\\p{L}\\p{N}])`, 'giu');
        for (const m of identity.matchAll(pattern)) {
          if (!ranges.some(r => m.index! < r.end && m.index! + m[0].length > r.start)) { add(m.index!, m.index! + m[0].length, role); break; }
        }
      }
    }
  }
  if (t.kind === 'process') {
    const start = label === undefined ? value.indexOf(t.name!, 1) : value.toLowerCase().indexOf(t.name!.toLowerCase());
    add(start, start + t.name!.length, 'process');
    if (label === undefined) {
      let offset = start + t.name!.length;
      for (const parameter of t.parameters ?? []) {
        const position = value.indexOf(parameter, offset);
        if (position < 0) continue;
        if (isStructuredValue(parameter)) add(position, position + parameter.length, 'value');
        offset = position + parameter.length;
      }
    }
  }
  let output = '', offset = 0;
  for (const range of ranges.sort((a,b) => a.start - b.start)) {
    output += escape(value.slice(offset, range.start)) + `<span class="os-syntax-${range.role}">${escape(value.slice(range.start, range.end))}</span>`;
    offset = range.end;
  }
  return output + escape(value.slice(offset));
}
