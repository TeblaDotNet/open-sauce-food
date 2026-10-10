import { Marked, Renderer } from 'marked';
import { posix } from 'node:path';
import { escapeHtml as e, safeUrl } from '../../src/renderer/html.ts';
import type { Routes, SiteConfig } from './routes.ts';

/** Render the authoritative file at build time. Raw HTML is text, never executable. */
export function renderSpec(markdown: string, urls: Routes) {
  const renderer = new Renderer(), headings: { id: string; title: string; depth: number }[] = [];
  const used = new Map<string, number>();
  renderer.html = ({ text }) => e(text);
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
<p>Open Sauce Food is a human-readable recipe language and shared culinary knowledge base for personal recipe collection, versioning, remixing and collaboration.</p>
<p>A <code>.opensauce</code> recipe is a text file. The parser turns that text into structured recipe data while retaining its authored content.</p>
<p><strong>Sauce Code</strong> shows the authored recipe notation and is the default view. <strong>Compact</strong> is a condensed, human-readable rendering of the same recipe. <strong>Original Source</strong>, where available, preserves upstream text as provenance.</p>
<p>The shared vocabulary connects recipes to <a href="${urls.index('ingredient')}">ingredients</a>, <a href="${urls.index('process')}">processes</a> and <a href="${urls.index('equipment')}">equipment</a>. Reference pages show the knowledge currently recorded and the recipes that use each concept.</p>
<p>The development corpus retains every recipe. Normal browsing and reference backlinks include only recipes explicitly marked reworked; initial and source-blocked recipes retain direct noindex development pages. Conversion stage is independent of human review.</p>
<p>The project is in early development. The language, metadata and culinary knowledge are evolving; much of the imported corpus is generated and unchecked. Curation labels describe recorded review status, and missing labels do not imply review.</p>
<p><a href="${config.github}">GitHub is the development and source home</a>. Read the <a href="${urls.page('spec')}">current specification</a> or <a href="${urls.recipes()}">browse recipes</a>.</p>
<p><a href="${urls.source('README.md')}">Project explanation on GitHub</a> · <a href="${urls.source('scripts/site/documents.ts')}">Source for this page</a></p>`;
}
