import { compactPhrasing, phraseText } from './compact.ts';
import type { Node, Recipe, Token } from '../model/index.ts';
import type { Vocabulary } from '../vocabulary/index.ts';

export interface RenderOptions {
  comments?: boolean;
  story?: boolean;
  notes?: boolean;
  /** Optional culinary knowledge for the condensed human-readable Compact rendering. */
  vocabulary?: Vocabulary;
  images?: boolean;
  /** Compact display hooks; Code output deliberately retains authored token spelling. */
  formatTerm?: (token: Token) => string;
  formatValue?: (value: string, context: 'parameter' | 'metadata') => string;
}
const visibleText = (s: string, o: RenderOptions) => o.images === false ? s.replace(/!\[[^\]]*\]\([^)]*\)/g, '') : s;
const note = (comment: string | undefined, o: RenderOptions) => o.comments && comment !== undefined ? ` # ${comment}` : '';

/** Normalized Code built from the AST. Recipe.source retains the exact authored bytes. */
export function renderCode(recipe: Recipe, options: RenderOptions = {}): string {
  const lines: string[] = [];
  const payloads: string[] = [];
  let marker = '\u0000source';
  while (recipe.source.includes(marker)) marker += '_';
  const visit = (nodes: Node[], depth: number): void => {
    const pad = '    '.repeat(depth);
    for (const n of nodes) {
      if (n.kind === 'blank') { lines.push(''); continue; }
      if (n.kind === 'comment') { if (options.comments) lines.push(`${pad}# ${n.text}`); continue; }
      if (n.kind === 'metadata') {
        if (n.key === 'image' && options.images === false) continue;
        lines.push(`${pad}${n.key}: ${n.value}${note(n.comment, options)}`); continue;
      }
      if (n.kind === 'group') {
        lines.push(`${pad}${n.relationship === 'group' ? '' : n.relationship + ' '}[${note(n.comment, options)}`);
        visit(n.children, depth + 1);
        lines.push(`${pad}]${note(n.closingComment, options)}`);
        if (n.condition) visit([n.condition], depth);
      } else if (n.kind === 'statement') {
        const text = n.tokens.filter(t => options.images !== false || t.kind !== 'image').map(t => t.raw).join('').trim();
        if (text || (options.comments && n.comment !== undefined)) lines.push(pad + text + note(n.comment, options));
        visit(n.children, depth + 1);
      } else lines.push(pad + visibleText(n.text, options) + note(n.comment, options));
    }
  };
  visit(recipe.preamble, 0);
  for (const section of recipe.sections) {
    if (section.name === 'story' && options.story === false) continue;
    if (section.name === 'notes' && options.notes === false) continue;
    if (section.originalSource) {
      const payload = section.originalSource;
      lines.push(`::source${note(section.comment, options)}`, '<<<', `${marker}${payloads.length}\u0000`);
      payloads.push(payload.text + (payload.closed ? '>>>' : ''));
      visit(section.children, 0);
      continue;
    }
    lines.push(`::${section.name}${note(section.comment, options)}`); visit(section.children, 0);
  }
  const normalized = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  return normalized.replace(new RegExp(`${marker}(\\d+)\u0000`, 'g'), (_, i: string) => payloads[Number(i)]);
}

/** Original upstream payloads only; no interpretation, trimming or visibility filtering. */
export function renderOriginalSource(recipe: Recipe): string {
  return recipe.sections.filter(s => s.originalSource).map(s => s.originalSource!.text).join('');
}

/** Plain text with Markdown image syntax. Unknown language remains literal. */
export function renderCompact(recipe: Recipe, options: RenderOptions = {}): string {
  const lines: string[] = [];
  const phrasing = compactPhrasing(recipe, options);
  const visit = (nodes: Node[], depth: number, section: string): void => {
    const pad = '  '.repeat(depth);
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const merged = phrasing.separation(n, nodes[i + 1], section);
      if (merged) { lines.push(pad + phraseText(merged)); i++; continue; }
      if (n.kind === 'blank') continue;
      if (n.kind === 'comment') { if (options.comments) lines.push(`${pad}# ${n.text}`); continue; }
      if (n.kind === 'metadata') {
        if (n.key === 'image') { if (options.images !== false) lines.push(`![Recipe image](${n.value})`); }
        else lines.push(`${n.key}: ${options.formatValue?.(n.value, 'metadata') ?? n.value}`);
      } else if (n.kind === 'group') {
        lines.push(`${pad}${n.relationship === 'group' ? 'Together' : n.relationship}:`);
        visit(n.children, depth + 1, section);
        if (n.condition) visit([n.condition], depth, section);
        if (options.comments && n.closingComment) lines.push(`${pad}# ${n.closingComment}`);
      } else if (n.kind === 'statement') {
        const { parts, children } = phrasing.statement(n, section);
        const value = phraseText(parts);
        if (value) lines.push(pad + value);
        visit(children, depth + 1, section);
      } else { const text = visibleText(n.text, options); if (text) lines.push(pad + text); }
      if (options.comments && n.comment !== undefined) lines.push(`${pad}# ${n.comment}`);
    }
  };
  visit(recipe.preamble, 0, '');
  for (const section of recipe.sections) {
    if (section.name === 'source') continue;
    if (section.name === 'story' && options.story === false) continue;
    if (section.name === 'notes' && options.notes === false) continue;
    if (section.name !== 'recipe') lines.push('', section.name.charAt(0).toUpperCase() + section.name.slice(1) + ':');
    if (options.comments && section.comment) lines.push(`# ${section.comment}`);
    visit(section.children, 0, section.name);
  }
  return lines.join('\n').trim() + '\n';
}
