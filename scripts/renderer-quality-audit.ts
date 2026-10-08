/** Reproducible review queue, not a culinary validator. No recipe writes. */
import { readFile, writeFile } from 'node:fs/promises';
import { recipeFiles } from './corpus.ts';
import { parseRecipe, renderCompact, renderHtml } from '../src/index.ts';
import type { Node, Statement } from '../src/index.ts';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { naturalThingLabel, partQualifiers, typeQualifiers } from '../src/renderer/thing-label.ts';

const rules = {
  lists: ['renderer-only', 'Three or more reference operands; Oxford-comma presentation'],
  inheritance: ['renderer-only', 'Inherited actions; fuse only contiguous pure actions, respecting boundaries'],
  ordering: ['renderer-only', 'Known preparation qualifier; natural word order'],
  parameters: ['renderer-only', 'Duration, terminal condition, manner or cut-shape display opportunity'],
  vessel: ['corpus-encoding', 'Shortened/plural vessel differs from its explicit declaration; leave unchanged for review'],
  parts: ['draft8-proposal', 'Known part encoded as generic qualifier; label improved, relation still untyped'],
  types: ['draft8-proposal', 'Known type encoded as generic qualifier; label improved, relation still untyped'],
  roles: ['draft8-proposal', 'Repeated base declarations need local identity and role disambiguation'],
  diagnostics: ['human-review', 'Remaining parser warning; do not guess missing identity or repeat condition'],
  choices: ['human-review', 'Named choice wording and scope require review'],
  results: ['human-review', 'Implicit result name; verify transformation/output relationship against source'],
  opaque: ['human-review', 'Parameter retained in parentheses; role intentionally not inferred'],
  qualifiers: ['human-review', 'Qualifier outside the small naturalisation rules; wording retained'],
  quantities: ['human-review', 'Unusual quantity spelling or source caveat; no automatic correction']
} as const;
type Rule = keyof typeof rules;
const knownVessels: Record<string, string[]> = {
  'creme-brulee': ['ramekins'], kombucha: ['bottles'], kvass: ['jar'], limoncello: ['jar'], sauerkraut: ['jar']
};
const vocabulary = await loadVocabulary('.');
const findings: { file: string; rule: Rule; category: string; evidence: { line: number; source: string }[] }[] = [];
const coverage: { file: string; errors: number; warnings: number; findings: number }[] = [];
for (const path of await recipeFiles('examples/public-domain-recipes')) {
  const file = path.replaceAll('\\', '/'), slug = file.split('/').at(-2)!;
  const source = await readFile(path, 'utf8'), lines = source.split(/\r?\n/);
  const recipe = parseRecipe(source, { filename: file, vocabulary });
  const hits = new Map<Rule, Set<number>>();
  const hit = (rule: Rule, line: number) => { if (!hits.has(rule)) hits.set(rule, new Set()); hits.get(rule)!.add(line); };
  const nodes: { node: Statement; section: string }[] = [];
  function walk(children: Node[], section: string) {
    for (const node of children) if (node.kind === 'statement' || node.kind === 'group') {
      if (node.kind === 'statement') nodes.push({ node, section });
      walk(node.children, section);
      if (node.kind === 'group' && node.condition) nodes.push({ node: node.condition, section });
    }
  }
  recipe.sections.forEach(s => walk(s.children, s.name));
  const declarations = new Map<string, number[]>();
  for (const { node: n, section } of nodes) {
    if (n.role === 'choice') hit('choices', n.span.line);
    if (n.inheritedSubjectId) hit('inheritance', n.span.line);
    if (n.tokens.filter(t => t.raw === '+').length >= 2 || (n.role === 'assignment' && n.children.filter(c => c.kind === 'statement').length >= 3)) hit('lists', n.span.line);
    for (const t of n.tokens) {
      if (t.kind === 'result' && t.implicit) hit('results', t.span.line);
      if (t.kind === 'thing') {
        if (section === 'ingredients' || section === 'equipment') {
          const key = `${section}:${t.name}`;
          declarations.set(key, [...(declarations.get(key) ?? []), t.span.line]);
        }
        if (section === 'instructions' && knownVessels[slug]?.includes(t.name!)) hit('vessel', t.span.line);
        for (const q of t.qualifiers ?? []) {
          if (partQualifiers[t.name!]?.includes(q)) hit('parts', t.span.line);
          else if (typeQualifiers[t.name!]?.includes(q)) hit('types', t.span.line);
          else if (naturalThingLabel(t.name!, [q]).startsWith(q + ' ')) hit('ordering', t.span.line);
          else if (!/^(for .+|small|medium|large|cold|warm|ice-cold|boiling)$/.test(q)) hit('qualifiers', t.span.line);
        }
      }
      for (const p of t.parameters ?? []) {
        if (/^(~?\d[\d.-]*[smh]|until\b|gently$|slightly$|stirring\b)/.test(p) || (t.name === 'cut' && /strips|cubes|chunks|slices|pieces/.test(p))) hit('parameters', t.span.line);
      }
    }
    const line = lines[n.span.line - 1];
    if (/\d+\.\d+\/\d+\s*(?:tsp|tbsp|g|ml)/.test(line) || /\d.*as source states|amounts not supplied|quantity not supplied/.test(line)) hit('quantities', n.span.line);
  }
  for (const locations of declarations.values()) if (locations.length > 1) locations.forEach(line => hit('roles', line));
  const compact = renderCompact(recipe);
  renderHtml(recipe); renderHtml(recipe, { view: 'code' });
  // Exact fallback text is a review signal, not proof of an incorrect sentence.
  for (const { node } of nodes) for (const t of node.tokens) for (const p of t.parameters ?? []) if (compact.includes(`(${p})`)) hit('opaque', t.span.line);
  for (const d of recipe.diagnostics) if (!(d.code === 'UNRESOLVED_REFERENCE' && knownVessels[slug]?.some(name => d.message.startsWith(`(${name})`)))) hit('diagnostics', d.span.line);
  for (const [rule, locations] of hits) findings.push({ file, rule, category: rules[rule][0], evidence: [...locations].sort((a,b) => a-b).map(line => ({ line, source: lines[line - 1] })) });
  coverage.push({ file, errors: recipe.diagnostics.filter(d => d.severity === 'error').length, warnings: recipe.diagnostics.filter(d => d.severity === 'warning').length, findings: hits.size });
}
const categories = Object.fromEntries([...new Set(Object.values(rules).map(r => r[0]))].map(c => [c, findings.filter(f => f.category === c).length]));
await writeFile('renderer-quality-audit.json', JSON.stringify({ counting: 'One finding per recipe per rule; evidence lists every matching line. Overlapping review signals are not confirmed errors.', categories, rules, coverage, findings }, null, 2) + '\n');
console.log(JSON.stringify({ recipes: coverage.length, categories, rules: Object.fromEntries(Object.keys(rules).map(r => [r, findings.filter(f => f.rule === r).length])) }, null, 2));
