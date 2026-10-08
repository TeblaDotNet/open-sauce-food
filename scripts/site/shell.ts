import { escapeHtml as e } from '../../src/renderer/html.ts';
import type { Routes, SiteConfig } from './routes.ts';
export const provisional = '<aside class="metadata-notice"><strong>Provisional / uncurated</strong><p>This browse data is still being reviewed and may contain duplicates, gaps and inconsistent labels.</p></aside>';
export function shell(config: SiteConfig, urls: Routes, title: string, route: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)} · Open Sauce Food</title><link rel="canonical" href="${e(urls.canonical(route))}">
<script src="${urls.asset('theme-init.js')}"></script><link rel="stylesheet" href="${urls.asset('style.css')}">
<script src="${urls.asset('dark-mode.js')}" defer></script><script src="${urls.asset('enhance.js')}" defer></script></head>
<body data-colour="on"><a class="skip-link" href="#content">Skip to content</a>
<header class="site-header"><a class="back-to-tebla" href="https://tebla.net/">← tebla.net</a><a class="brand" href="${urls.home()}">Open Sauce Food</a>
<nav aria-label="Open Sauce Food"><a href="${urls.recipes()}">Recipes</a>${(['ingredient','process','equipment'] as const).map(k => `<a href="${urls.index(k)}">${k === 'ingredient' ? 'Ingredients' : k === 'process' ? 'Processes' : 'Equipment'}</a>`).join('')}<a href="${urls.page('spec')}">Spec</a><a href="${urls.page('about')}">About</a></nav>
<div class="display-controls" data-enhancement hidden><button id="dark-mode-toggle" type="button">Light</button><label><input id="syntax-colour" type="checkbox" checked> Syntax colour</label></div></header>
<aside class="development-notice"><strong>Open Sauce Food is in early development.</strong><p>The language, recipe metadata and culinary knowledge are still evolving. Much of the imported corpus is generated and unchecked. Development and source are available on <a href="${e(config.github)}">GitHub</a>.</p></aside>
<main id="content" tabindex="-1">${body}</main><footer><p>Open Sauce Food · A human-readable recipe language and shared culinary knowledge base.</p><a href="${e(config.github)}">Project on GitHub</a> · <a href="${urls.asset('notices.txt')}">Licences and notices</a></footer></body></html>`;
}
