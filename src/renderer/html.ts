import { curationLabel } from '../curation.ts';
import type { Node, Recipe, Token } from '../model/index.ts';
import type { RenderOptions } from './index.ts';
import { compactPhrasing } from './compact.ts';
import type { Phrase } from './compact.ts';
import { amountTokens, syntaxLabel } from './syntax.ts';

export interface ReferenceTarget {
  kind: 'ingredient' | 'equipment' | 'process';
  canonicalId: string;
  token: Token;
}
export type RecipeView = 'code' | 'compact' | 'originalSource';
export interface HtmlRenderOptions extends RenderOptions {
  /** Optional syntax spans in Code only; never changes text or the model. */
  syntaxSpans?: boolean;
  /** Page shells can provide a persistent title/curation header. */
  header?: boolean;
  /** Code is the default. Original recipe source is literal provenance, not rendered Code. */
  view?: RecipeView;
  /** Give each recipe a distinct prefix when embedding several in one document. */
  idPrefix?: string;
  /** Directory URL for recipe-relative media, e.g. /recipes/apple-pie/. */
  assetBaseUrl?: string;
  /** Descriptive fallback for the recipe metadata image. */
  imageAlt?: string;
  referenceUrl?: (target: ReferenceTarget) => string | undefined;
  /** Plain-text display hooks are inherited; returning HTML never bypasses escaping. */
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Only web URLs and relative references; reject active schemes, controls, and UNC URLs. */
export function safeUrl(value: string): string | undefined {
  const url = value.trim();
  if (!url || /[\u0000-\u0020\u007f\\]/.test(url) || url.startsWith('//')) return undefined;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) {
    if (!/^https?:\/\//i.test(url)) return undefined;
    try { new URL(url); } catch { return undefined; }
  }
  return url;
}

/** Safe HTML fragment, with no DOM, filesystem, or vocabulary dependency. */
export function renderHtml(recipe: Recipe, options: HtmlRenderOptions = {}): string {
  const e = escapeHtml;
  const code = options.view === undefined || options.view === 'code';
  const syntaxSpans = code && options.syntaxSpans;
  const prefix = encodeURIComponent(options.idPrefix ?? 'os');
  const nodeId = (id: string) => `${prefix}-${encodeURIComponent(id)}`;
  if (options.view === 'originalSource') return recipe.sections.filter(s => s.originalSource).map(s =>
    `<pre class="os-original-source" aria-label="Original recipe source"><code>${e(s.originalSource!.text)}</code></pre>`).join('');
  const phrasing = compactPhrasing(recipe, options);
  const comment = (value?: string) => options.comments && value !== undefined
    ? `<aside class="os-comment" aria-label="Author comment"># ${e(value)}</aside>` : '';
  function image(path: string, alt: string): string {
    if (options.images === false) return '';
    let url = safeUrl(path);
    if (url && options.assetBaseUrl) {
      const base = safeUrl(options.assetBaseUrl);
      if (!base) url = undefined;
      else {
        try {
          const resolved = new URL(url, new URL(base, 'https://open-sauce.invalid/'));
          url = /^https?:\/\//i.test(base) || /^https?:\/\//i.test(url)
            ? resolved.href : resolved.pathname + resolved.search + resolved.hash;
        } catch { url = undefined; }
      }
    }
    return url ? `<img class="os-image" src="${e(url)}" alt="${e(alt)}" loading="lazy" decoding="async">`
      : `<span class="os-image-unavailable">${e(alt || 'Image unavailable')}</span>`;
  }
  // Only the recipe's documented image notation is recognized. No general Markdown/HTML execution.
  function prose(value: string): string {
    const pattern = /!\[([^\]]*)\]\(([^)]*)\)/g;
    let out = '', offset = 0;
    for (const match of value.matchAll(pattern)) {
      out += e(value.slice(offset, match.index)) + image(match[2], match[1]);
      offset = match.index + match[0].length;
    }
    return out + e(value.slice(offset));
  }
  function token(t: Token, label?: string): string {
    if (t.kind === 'image') return image(t.path ?? '', t.alt ?? '');
    if (t.kind === 'text') return e(label ?? t.raw);
    if (t.kind === 'operator') return `<span class="os-operator">${e(label ?? t.raw)}</span>`;
    const kind = t.kind === 'thing' ? t.thingKind ?? 'unresolved' : t.kind;
    const canonical = t.canonicalId ? ` data-canonical-id="${e(t.canonicalId)}"` : '';
    const declarations = t.declarationIds?.length ? ` data-declaration-ids="${e(t.declarationIds.map(nodeId).join(' '))}"` : '';
    const structure = t.kind === 'thing' ? `${t.variant ? ` data-variant="${e(t.variant)}"` : ''}${t.parts?.length ? ` data-parts="${e(JSON.stringify(t.parts))}"` : ''}${t.partResolution ? ` data-known-part-path="${e(JSON.stringify(t.partResolution.ids))}" data-parts-complete="${t.partResolution.complete}"` : ''}` : '';
    const attributes = `class="os-token os-${e(kind)}" data-kind="${e(kind)}"${canonical}${declarations}${structure}`;
    const href = t.canonicalId && (kind === 'ingredient' || kind === 'equipment' || kind === 'process')
      ? options.referenceUrl?.({ kind, canonicalId: t.canonicalId, token: t }) : undefined;
    const safe = href === undefined ? undefined : safeUrl(href);
    const content = syntaxSpans && !options.formatTerm ? syntaxLabel(t, label, e) : e(label ?? t.raw);
    return safe ? `<a ${attributes} href="${e(safe)}">${content}</a>` : `<span ${attributes}>${content}</span>`;
  }
  function node(n: Node, section: string, merged?: Phrase): string {
    if (n.kind === 'blank') return '';
    if (n.kind === 'comment') return comment(n.text);
    if (n.kind === 'metadata') {
      if (recipe.curation && (n.key === 'curation origin' || n.key === 'curation review')) return comment(n.comment);
      if (n.key === 'image') return image(n.value, options.imageAlt ?? 'Recipe image') + comment(n.comment);
      const value = options.formatValue?.(n.value, 'metadata') ?? n.value;
      const url = n.key === 'source' ? safeUrl(n.value) : undefined;
      return `<dl class="os-metadata"><dt>${e(n.key)}</dt><dd>${url ? `<a href="${e(url)}">${e(value)}</a>` : e(value)}</dd></dl>` + comment(n.comment);
    }
    if (n.kind === 'group') {
      const label = code ? (n.relationship === 'group' ? '[' : `${n.relationship} [`) : (n.relationship === 'group' ? 'Together' : n.relationship);
      return `<div class="os-group" id="${e(nodeId(n.id))}" data-relationship="${e(n.relationship)}"><p class="os-group-label">${e(label)}</p>${comment(n.comment)}${nodes(n.children, section)}${code ? '<p class="os-group-label">]</p>' : ''}${comment(n.closingComment)}${n.condition ? node(n.condition, section) : ''}</div>`;
    }
    if (n.kind === 'statement') {
      const phrase = code ? undefined : merged ? { parts: merged, children: [] } : phrasing.statement(n, section);
      const content = phrase ? phrase.parts.map(p => {
        const content = p.token ? token(p.token, p.text) : syntaxSpans && p.value ? `<span class="os-syntax-value">${e(p.text)}</span>` : e(p.text);
        return p.nodeId ? `<span id="${e(nodeId(p.nodeId))}"${p.inheritedSubjectId ? ` data-inherited-subject="${e(nodeId(p.inheritedSubjectId))}"` : ''}>${content}</span>` : content;
      }).join('')
        : (() => {
          const amounts = syntaxSpans ? amountTokens(n.tokens) : new Set<Token>();
          return n.tokens.map(t => amounts.has(t) ? `<span class="os-syntax-value">${e(t.raw)}</span>` : token(t)).join('');
        })();
      const children = nodes(phrase?.children ?? n.children, section, true);
      const note = comment(n.comment);
      if (!content.trim() && !children && !note) return '';
      const inherited = n.inheritedSubjectId ? ` data-inherited-subject="${e(nodeId(n.inheritedSubjectId))}"` : '';
      return `<div class="os-statement" id="${e(nodeId(n.id))}" data-role="${e(n.role ?? 'text')}"${inherited}>${content.trim() ? `<div class="os-line">${content}</div>` : ''}${note}${children}</div>`;
    }
    return `<p class="os-prose">${prose(n.text)}</p>${comment(n.comment)}`;
  }
  function nodes(items: Node[], section: string, nested = false): string {
    const rendered: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const merged = code ? undefined : phrasing.separation(items[i], items[i + 1], section);
      const html = node(items[i], section, merged);
      if (html) rendered.push(html);
      if (merged) i++;
    }
    if (!rendered.length) return '';
    // Groups/alternatives are explicit nodes; ordering does not infer execution semantics.
    const tag = section === 'instructions' ? 'ol' : 'ul';
    if (!['ingredients', 'equipment', 'instructions'].includes(section)) return rendered.join('');
    return `<${tag} class="os-list${nested ? ' os-continuation' : ''}">${rendered.map(s => `<li>${s}</li>`).join('')}</${tag}>`;
  }
  const title = recipe.sections.flatMap(s => s.children).find(n => n.kind === 'metadata' && n.key === 'name');
  const name = title?.kind === 'metadata' ? title.value : 'Untitled recipe';
  return `<article class="os-recipe os-view-${code ? 'code' : 'compact'}" aria-labelledby="${prefix}-title">${options.header === false ? '' : `<header><p class="os-eyebrow">Open Sauce Food recipe</p><h1 id="${prefix}-title">${e(name)}</h1>${recipe.curation ? `<p class="os-curation"><small>Encoding curation: ${e(curationLabel(recipe.curation))}</small></p>` : ''}</header>`}${nodes(recipe.preamble, '')}${recipe.sections.map((s, i) => {
    if (s.name === 'story' && options.story === false) return '';
    if (s.name === 'notes' && options.notes === false) return '';
    if (s.name === 'source') return code && s.originalSource ? `<section class="os-section" data-section="source"><h2>::source</h2><pre class="os-original-source">${e('<<<\n' + s.originalSource.text + (s.originalSource.closed ? '>>>' : ''))}</pre></section>` : '';
    const heading = s.name === 'recipe' ? 'Recipe details' : s.name.charAt(0).toUpperCase() + s.name.slice(1);
    return `<section class="os-section" data-section="${e(s.name)}" aria-labelledby="${prefix}-section-${i}"><h2 id="${prefix}-section-${i}">${e(code ? '::' + s.name : heading)}</h2>${comment(s.comment)}${nodes(s.children, s.name)}</section>`;
  }).join('')}</article>`;
}
