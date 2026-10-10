import { parseRecipe } from '../../src/parser/index.ts';
import type { Node, Token } from '../../src/model/index.ts';
import { escapeHtml as e } from '../../src/renderer/html.ts';
import { amountTokens, isStructuredValue, syntaxLabel } from '../../src/renderer/syntax.ts';

/** Source-preserving examples: use parser roles and the recipe renderer's semantic spans. */
export function highlightSauceCode(source: string, context = 'instructions'): string {
  const prefix = /^::[a-z]/m.test(source) ? '' : `::${context}\n`;
  const recipe = parseRecipe(prefix + source);
  const replacements: { start: number; end: number; html: string }[] = [];
  const value = (raw: string) => `<span class="os-syntax-value">${e(raw)}</span>`;
  function token(t: Token): string {
    if (t.kind === 'process' && t.parameterParts) {
      const head = t.raw.slice(0, t.raw.indexOf(','));
      return syntaxLabel({ ...t, raw: head, parameters: [] }, undefined, e) +
        t.parameterParts.map(p => ',' + (isStructuredValue(p.raw) ? value(p.raw) : p.tokens.map(token).join(''))).join('') + '&gt;';
    }
    return syntaxLabel(t, undefined, e);
  }
  function visit(nodes: Node[]) {
    for (const n of nodes) {
      if (n.kind === 'statement') {
        const amounts = amountTokens(n.tokens);
        for (const t of n.tokens) replacements.push({ start: t.span.start - prefix.length, end: t.span.end - prefix.length, html: amounts.has(t) ? value(t.raw) : token(t) });
        visit(n.children);
      } else if (n.kind === 'group') {
        if (n.condition) visit([n.condition]);
        visit(n.children);
      }
    }
  }
  visit(recipe.preamble);
  for (const section of recipe.sections) visit(section.children);
  let output = '', offset = 0;
  for (const item of replacements.sort((a, b) => a.start - b.start)) {
    if (item.start < offset) continue;
    output += e(source.slice(offset, item.start)) + item.html; offset = item.end;
  }
  return output + e(source.slice(offset));
}
