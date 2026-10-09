import { readCuration, curationLabel } from '../curation.ts';
import { escapeHtml as escape, safeUrl } from '../renderer/html.ts';
import type { Provenance, SourcedQuantity } from '../vocabulary/index.ts';
import { recipePath } from './index.ts';
import type { ReferencePage, ReferenceKnowledge, ReferencePart } from './index.ts';

export interface ReferenceHtmlOptions {
  colour?: boolean;
  recipeUrl?: (id: string) => string | undefined;
  recipeLabel?: (id: string, name: string) => string;
  nutrition?: boolean;
}
const link = (url: string | undefined, label: string) => url && safeUrl(url)
  ? `<a href="${escape(url)}">${escape(label)}</a>` : escape(label);
const section = (title: string, body: string) => body ? `<section><h2>${escape(title)}</h2>${body}</section>` : '';
const list = (items: string[]) => items.length ? `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>` : '';
function names(names: Record<string, string>, plurals?: Record<string, string>): string {
  return `<dl class="ref-names">${Object.entries(names).map(([locale, name]) => `<dt>${escape(locale)}</dt><dd>${escape(name)}</dd>`).join('')}${Object.entries(plurals ?? {}).map(([locale, name]) => `<dt>${escape(locale)} plural</dt><dd>${escape(name)}</dd>`).join('')}</dl>`;
}
function source(source: Provenance): string {
  // Citation text can be a repository path; only an explicit, safe URL becomes a link.
  return `<p class="ref-source">Source: ${link(source.url, source.citation)}${source.accessed ? ` · accessed ${escape(source.accessed)}` : ''}${source.note ? ` · ${escape(source.note)}` : ''}</p>`;
}
function quantity(q: SourcedQuantity): string {
  return `<span class="ref-quantity">${q.approximate ? '~' : ''}${escape(String(q.value))} ${escape(q.unit)}</span>${q.state ? ` · state: ${escape(q.state)}` : ''}${q.locale ? ` · locale: ${escape(q.locale)}` : ''}${source(q.source)}`;
}
function knowledge(data: ReferenceKnowledge, options: ReferenceHtmlOptions): string {
  return section('Culinary groups', list(data.groups.map(g => `<strong>${escape(g.id)}</strong> · process: ${link(g.processUrl, g.process)}<p>${g.members.map(p => link('#' + p.anchor, p.id)).join(' + ')}</p>${g.description ? `<p>${escape(g.description)}</p>` : ''}${(g.sources ?? []).map(source).join('')}`))) +
    section('Typical mass', list((data.typical_mass ?? []).map(quantity))) +
    section('Reference density', list((data.reference_density ?? []).map(quantity))) +
    (options.nutrition === false ? '' : section('Nutrition per 100 g', list(Object.entries(data.nutrition?.per_100g ?? {}).map(([nutrient, q]) => `${escape(nutrient)}: ${quantity(q)}`))));
}
function renderPart(part: ReferencePart, parents: string[], options: ReferenceHtmlOptions): string {
  const usage = part.usage === undefined ? '' :
    `<h4>Used in ${part.usage.length} recipe${part.usage.length === 1 ? '' : 's'}</h4>` +
    (list(part.usage.map(r => link((options.recipeUrl ?? recipePath)(r.id), options.recipeLabel?.(r.id, r.name) ?? r.name))) ||
      '<p>No resolved uses of this part in this corpus.</p>');
  const context = [...parents, part.name];
  const heading = context.map((name, i) => `<span class="os-syntax-${i ? 'specificity' : 'ingredient'}">${escape(name)}</span>`).join(' › ');
  return `<section class="ref-part" id="${escape(part.anchor)}" tabindex="-1"><h3>${heading}</h3><p>Local part path: <code>${escape(part.path.join(' / '))}</code></p>${names(part.names, part.pluralNames)}${part.aliases.length ? `<p>Aliases: ${part.aliases.map(escape).join(', ')}</p>` : ''}${knowledge(part, options)}${usage}${part.parts.map(p => renderPart(p, context, options)).join('')}</section>`;
}

/** Safe document fragment; colour is presentation only, never the source of meaning. */
export function renderReferenceHtml(page: ReferencePage, options: ReferenceHtmlOptions = {}): string {
  const evidence = { ...(page.evidence ? { evidence: page.evidence } : {}),
    ...(page.observations.parameters?.length ? { observed_parameters: page.observations.parameters } : {}),
    ...(page.observations.qualifiers?.length ? { observed_qualifiers: page.observations.qualifiers } : {}) };
  const usage = page.usage === undefined ? '' : section(`Used in ${page.usage.length} recipe${page.usage.length === 1 ? '' : 's'}`,
    `<p>Resolved references across ${page.corpusSize} indexed recipes. Counts include declarations and explicit actions; each recipe counts once.</p>` +
    (list(page.usage.map(r => `${link((options.recipeUrl ?? recipePath)(r.id), options.recipeLabel?.(r.id, r.name) ?? r.name)}${page.kind === 'ingredient' ? `<div class="ref-forms">${r.forms.map(f => escape([
      (f.canonicalParts ?? f.parts).length ? `part: ${(f.canonicalParts ?? f.parts).join(' › ')}` : 'base reference', f.variant ? `variant: ${f.variant}` : ''
    ].filter(Boolean).join(' · '))).join('; ')}</div>` : ''}`)) || '<p>No resolved uses in this corpus.</p>'));
  return `<article class="os-reference" data-kind="${escape(page.kind)}" data-colour="${options.colour === false ? 'off' : 'on'}"><header><h1>${escape(page.name)}</h1><p>${escape(page.kind)} · canonical ID: <code>${escape(page.id)}</code>${page.status ? ` · ${escape(page.status)}` : ''}</p>${readCuration(page.curation).curation ? `<p class="os-curation"><small>Curation: ${escape(curationLabel(page.curation!))}</small></p>` : ''}${page.canonicalName && page.canonicalName !== page.name ? `<p>Canonical name: ${escape(page.canonicalName)}</p>` : ''}</header>` +
    (page.typeOf ? `<p>Type of: ${link(page.typeOf.url, page.typeOf.name)}</p>` : '') +
    section('Types', list((page.types ?? []).map(t => link(t.url, t.name)))) +
    section('Names', names(page.names, page.pluralNames)) +
    section('Variants', list(Object.values(page.variants ?? {}).map(v => `<span class="os-syntax-specificity">${Object.values(v.names).map(escape).join(' / ')}</span>`))) +
    section('Aliases', list(page.aliases.map(a => `${escape(a.name)}${a.type ? ` · ${escape(a.type)}` : ''}${a.observed_count !== undefined ? ` · recorded observations: ${escape(String(a.observed_count))}` : ''}`))) +
    section('Parts / Products', page.parts.length ? `<nav aria-label="Ingredient parts">${page.parts.map(p => link('#' + p.anchor, `${page.name} › ${p.name}`)).join(' · ')}</nav>${page.parts.map(p => renderPart(p, [page.name], options)).join('')}` : '') +
    knowledge(page, options) + usage +
    (Object.keys(evidence).length ? `<details class="ref-evidence"><summary>Recorded vocabulary evidence</summary><p>Historical observations from YAML, not the live usage count above. Observed parameters and qualifiers are examples, not semantic signatures.</p><pre>${escape(JSON.stringify(evidence, null, 2))}</pre></details>` : '') + '</article>';
}
