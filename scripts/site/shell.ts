import { escapeHtml as e } from '../../src/renderer/html.ts';
import type { Routes, SiteConfig } from './routes.ts';
export const provisional = '<aside class="metadata-notice"><strong>Provisional / uncurated</strong><p>This browse data is still being reviewed and may contain duplicates, gaps and inconsistent labels.</p></aside>';
export const appearanceControls = '<div class="display-controls" data-enhancement hidden><button id="dark-mode-toggle" type="button">Light</button><label><input id="syntax-colour" type="checkbox" checked> Syntax colour</label></div>';
export function developmentNotice(github: string): string { return `<aside class="development-notice"><strong>Open Sauce Food is in early development.</strong><p>The language, recipe metadata and culinary knowledge are still evolving. Much of the imported corpus is generated and unchecked. Development and source are available on <a href="${e(github)}">GitHub</a>.</p></aside>`; }
export function shell(config: SiteConfig, urls: Routes, title: string, route: string, body: string, noindex = false): string {
  const recipePage = route.startsWith(config.basePath + 'recipe/');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<title>${e(title)} · Open Sauce Food</title><link rel="canonical" href="${e(urls.canonical(route))}">
<script src="${urls.asset('theme-init.js')}"></script><link rel="stylesheet" href="${urls.asset('style.css')}">
<script src="${urls.asset('dark-mode.js')}" defer></script><script src="${urls.asset('enhance.js')}" defer></script></head>
<body data-colour="on"${recipePage ? ' class="recipe-page"' : ''}><a class="skip-link" href="#content">Skip to content</a>
<header class="site-header"><a class="back-to-tebla" href="https://tebla.net/">← tebla.net</a><a class="brand" href="${urls.home()}" aria-label="Open Sauce Food"><img class="wordmark wordmark-light" src="${urls.asset('brand/open-sauce-food-wordmark-light.svg')}" alt="" aria-hidden="true" width="1698" height="230"><img class="wordmark wordmark-dark" src="${urls.asset('brand/open-sauce-food-wordmark-dark.svg')}" alt="" aria-hidden="true" width="1698" height="230"></a>
<nav aria-label="Open Sauce Food"><a href="${urls.recipes()}">Recipes</a>${(['ingredient','process','equipment'] as const).map(k => `<a href="${urls.index(k)}">${k === 'ingredient' ? 'Ingredients' : k === 'process' ? 'Processes' : 'Equipment'}</a>`).join('')}<a href="${urls.page('spec')}">Spec</a><a href="${urls.page('about')}">About</a></nav>
${recipePage ? '' : appearanceControls}</header>
${recipePage ? '' : developmentNotice(config.github)}
<main id="content" tabindex="-1">${body}</main><footer><p>Open Sauce Food · A human-readable recipe language and shared culinary knowledge base.</p><a href="${e(config.github)}">Project on GitHub</a> · <a href="${urls.asset('notices.txt')}">Licences and notices</a></footer></body></html>`;
}
