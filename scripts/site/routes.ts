import type { ReferenceKind } from '../../src/reference/index.ts';

export interface SiteConfig { outDir: string; basePath: string; origin: string; github: string; sourceBase: string }
export function siteConfig(values: Partial<SiteConfig> = {}): SiteConfig {
  const github = (values.github ?? 'https://github.com/TeblaDotNet/open-sauce-food').replace(/\/$/, '');
  const basePath = values.basePath ?? '/opensaucefood/';
  if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(basePath)) throw new Error('Base path must be an absolute directory path with a trailing slash.');
  const origin = new URL(values.origin ?? 'https://tebla.net').origin;
  for (const url of [origin, github, values.sourceBase ?? github + '/blob/main']) {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Expected a public HTTP(S) URL without credentials, query or fragment.');
  }
  return { outDir: values.outDir ?? 'site-dist', basePath, origin, github, sourceBase: (values.sourceBase ?? github + '/blob/main').replace(/\/$/, '') };
}
export const sections = { ingredient: 'ingredients', process: 'processes', equipment: 'equipment' } as const;
export function routes(config: SiteConfig) {
  const segment = (s: string) => {
    if (!s || s === '.' || s === '..' || /[/\\\x00-\x1f]/.test(s)) throw new Error(`Invalid route segment: ${s}`);
    return encodeURIComponent(s);
  };
  const page = (...parts: string[]) => config.basePath + parts.map(segment).join('/') + (parts.length ? '/' : '');
  return {
    page,
    home: () => page(), recipes: () => page('recipes'),
    recipe: (slug: string) => page('recipe', slug),
    facet: (kind: 'tag' | 'category', slug: string) => page('recipes', kind, slug),
    reference: (kind: ReferenceKind, id: string) => page(sections[kind], id),
    index: (kind: ReferenceKind) => page(sections[kind]),
    asset: (path: string) => config.basePath + 'assets/' + path.split('/').map(segment).join('/'),
    source: (path: string) => config.sourceBase + '/' + path.split('/').map(segment).join('/'),
    canonical: (path: string) => new URL(path, config.origin).href,
    output: (url: string) => {
      if (!url.startsWith(config.basePath) || /[?#]/.test(url)) throw new Error(`URL outside site: ${url}`);
      const relative = decodeURIComponent(url.slice(config.basePath.length));
      if (relative.split('/').some(p => p === '..' || p === '.') || relative.includes('\\')) throw new Error('Unsafe output path');
      return relative + (url.endsWith('/') ? 'index.html' : '');
    }
  };
}
export type Routes = ReturnType<typeof routes>;
