import { highlightSauceCode } from './sauce-code.ts';
import { Marked, Renderer } from 'marked';
import { posix } from 'node:path';
import { escapeHtml as e, safeUrl } from '../../src/renderer/html.ts';
import type { Routes, SiteConfig } from './routes.ts';

/** Render the authoritative file at build time. Raw HTML is text, never executable. */
export function renderSpec(markdown: string, urls: Routes) {
  const renderer = new Renderer(), headings: { id: string; title: string; depth: number }[] = [];
  const used = new Map<string, number>();
  renderer.html = ({ text }) => e(text);
  renderer.code = ({ text, lang }) => {
    const [language = '', context = 'instructions'] = (lang ?? '').split(/\s+/);
    const sauce = language === 'opensauce';
    const highlighted = sauce ? highlightSauceCode(text, ['ingredients', 'equipment', 'instructions', 'recipe'].includes(context) ? context : 'instructions') : e(text);
    return `<pre><code${language ? ` class="language-${e(language)}"` : ''}>${highlighted}\n</code></pre>\n`;
  };
  renderer.heading = function ({ tokens, depth, text }) {
    const base = 'spec-' + text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
    const n = used.get(base) ?? 0; used.set(base, n + 1);
    const id = base + (n ? '-' + n : '');
    headings.push({ id, title: text.replace(/`/g, ''), depth });
    return `<h${depth} id="${e(id)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
  };
  renderer.link = function ({ href, title, tokens }) {
    const label = this.parser.parseInline(tokens);
    let url = safeUrl(href);
    if (!url) return label;
    if (!/^(?:https?:|#)/i.test(url)) {
      const [path, fragment] = url.split('#');
      const normalized = posix.normalize(path);
      if (normalized.startsWith('../') || normalized.startsWith('/')) throw new Error(`Unsupported spec link: ${href}`);
      url = normalized === 'SPEC.md' ? urls.page('spec') + (fragment ? '#' + fragment : '') : urls.source(normalized) + (fragment ? '#' + fragment : '');
    }
    return `<a href="${e(url)}"${title ? ` title="${e(title)}"` : ''}>${label}</a>`;
  };
  renderer.image = ({ text }) => e(text); // The current spec has image syntax only inside code examples.
  const body = new Marked({ renderer, gfm: true, async: false }).parse(markdown) as string;
  const contents = `<details class="spec-contents"><summary>Contents</summary><ol>${headings.filter(h => h.depth === 2).map(h => `<li><a href="#${e(h.id)}">${e(h.title)}</a></li>`).join('')}</ol></details>`;
  return `<p><a href="${urls.source('SPEC.md')}">View SPEC.md on GitHub</a></p>${contents}<article class="spec-document">${body}</article>`;
}
export function aboutPage(config: SiteConfig, urls: Routes) {
  return `<h1>About Open Sauce Food</h1>
<p>Open Sauce Food is a human-readable recipe language and shared culinary knowledge base, designed for personal recipe collection, versioning, remixing and collaboration.</p>
<p>A <code>.opensauce</code> recipe is an ordinary text file. It is intended to remain readable by a person while containing enough structure for software to understand useful things about ingredients, equipment, cooking processes, quantities, alternatives and results.</p>
<p>Recipes can be viewed in three ways:</p>
<dl><dt><strong>Sauce Code</strong></dt><dd>The authored <code>.opensauce</code> recipe and the primary representation.</dd>
<dt><strong>Compact</strong></dt><dd>A more conventional human-readable recipe generated from the Sauce Code.</dd>
<dt><strong>Original Source</strong></dt><dd>Where available, preserves the upstream recipe text used during conversion. It is provenance, not another rendering of Sauce Code.</dd></dl>
<p>Open Sauce Food also maintains a shared culinary knowledge base covering <a href="${urls.index('ingredient')}">ingredients</a>, <a href="${urls.index('process')}">processes</a> and <a href="${urls.index('equipment')}">equipment</a>.</p>
<p>These concepts can record things such as aliases and regional names, ingredient families and parts, preparation states, equipment subtypes and cooking techniques. Reference pages connect that knowledge back to recipes that use each concept.</p>
<p>Sauce Code adds structure where structure is useful, while still allowing ordinary cooking language where rigid formalisation would add little.</p>
<p>The project uses Git for versioning and collaboration. Recipes and culinary knowledge can be diffed, corrected, forked and contributed using ordinary development tools rather than Open Sauce Food inventing its own version-control system for recipes.</p>
<h2>Early development</h2>
<p>The language, metadata, rendering and knowledge base are evolving, with real recipes driving changes. Converted historical recipes exist at different review stages; repository inclusion does not imply a recipe is fully tested or curated. Normal browsing focuses on reworked recipes.</p>
<p><a href="${urls.recipes()}">Browse recipes</a> &middot; <a href="${urls.page('spec')}">Read the current specification</a> &middot; <a href="${e(config.github)}">View the project on GitHub</a></p>
<p><a href="${urls.source('README.md')}">Project explanation on GitHub</a> &middot; <a href="${urls.source('scripts/site/documents.ts')}">Source for this page</a></p>`;
}
