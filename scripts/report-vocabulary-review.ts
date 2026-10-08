import { readFileSync, writeFileSync } from 'node:fs';
import { loadVocabulary } from '../src/vocabulary/node.ts';
import { classifyCandidate, knownVariant, candidateCategories } from './vocabulary-candidates.ts';

const baseline = JSON.parse(readFileSync('vocabulary-review-baseline.json', 'utf8'));
const decisions = JSON.parse(readFileSync('vocabulary-review-decisions.json', 'utf8'));
const report = JSON.parse(readFileSync('public-domain-vocabulary-candidates.json', 'utf8'));
const vocabulary = await loadVocabulary('.');
const newIds = new Set(decisions.changes.filter((c: any) => c.action === 'new-concept').map((c: any) => `${c.kind}:${c.id}`));
const results = baseline.candidates.map((item: any) => {
  let outcome = 'left uncertain';
  const kind = item.category === 'new process candidates' || item.examples.some((s: string) => s.startsWith('<')) ? 'process'
    : item.category === 'new equipment candidates' || item.term === 'bowls' ? 'equipment' : 'ingredient';
  const matches = vocabulary.resolve(item.term, kind);
  const structure = item.term.match(/^([^:;]+)([:;]) (.+)$/);
  if (matches.length === 1) outcome = newIds.has(`${kind}:${matches[0].id}`) ? 'resolved by new concept' : 'resolved by alias/plural';
  else if (structure && !structure[3].includes('(review')) {
    const [,base,separator,part] = structure;
    const entries = vocabulary.resolve(base, 'ingredient');
    if (separator === ';' && knownVariant(vocabulary, base, part)) outcome = 'resolved by variant/part relationship';
    if (separator === ':' && entries.length === 1 && vocabulary.resolvePartPath(entries[0].id, part.split(': ')).complete) {
      const resolvedPart = vocabulary.resolvePartPath(entries[0].id, part.split(': ')).ids.join(': ');
      outcome = decisions.changes.some((c: any) => c.action === 'part' && c.id === entries[0].id && c.term === resolvedPart)
        ? 'resolved by variant/part relationship' : 'already supported relationship';
    }
  }
  return { ...item, kind, outcome, queue: outcome === 'left uncertain' ? classifyCandidate(item.term, kind, vocabulary).category : undefined };
});
const outcomes = Object.fromEntries([...new Set<string>(results.map((r: any) => r.outcome))].map(k => [k, results.filter((r: any) => r.outcome === k).length]));
const remaining = report.candidates.filter((c: any) => candidateCategories.includes(c.category));
const kinds = ['ingredient','equipment','process'];
const counts = Object.fromEntries(kinds.map(kind => [kind, { before: baseline.entries.filter((e: any) => e.kind === kind).length, after: vocabulary.entries.filter(e => e.kind === kind).length }]));
const summary = { originalCandidateCount: baseline.candidateCount, originalScope: baseline.scope, currentCandidateCount: report.candidateCount,
  currentRecipeCount: report.recipeCount, outcomes, canonicalEntries: counts,
  aliasesAdded: decisions.changes.filter((c: any) => c.action === 'alias').length + decisions.changes.reduce((n: number,c: any) => n + (c.aliases?.length ?? 0),0),
  pluralFormsAdded: decisions.changes.filter((c: any) => c.action === 'plural').length,
  variantsAdded: decisions.changes.filter((c: any) => c.action === 'variant').length,
  partsAdded: decisions.changes.filter((c: any) => c.action === 'part').length, partGroupsAdded: 0 };
writeFileSync('vocabulary-review-results.json', JSON.stringify({ summary, decisions: decisions.changes, baselineOutcomes: results, remaining }, null, 2) + '\n');
const rows = Object.entries(counts).map(([kind,c]) => `| ${kind} | ${c.before} | ${c.after} |`);
const text = ['# Canonical vocabulary review — pass 1', '',
  'This generated review is not deliberate human culinary checking. No entry is marked checked. Recipes and source payloads are unchanged.', '',
  '## Measured results', '', '| Kind | Before | After |', '|---|---:|---:|', ...rows, '',
  `Added ${summary.aliasesAdded} lexical aliases, ${summary.pluralFormsAdded} explicit plural forms, ${summary.variantsAdded} local variants and ${summary.partsAdded} local parts. No new part groups or numerical knowledge.`, '',
  `Original report: **${baseline.candidateCount}** candidate term/category pairs from **293** recipes. Current report: **${report.candidateCount}** pairs from **${report.recipeCount}** recipes. These totals have different coverage and classification; their difference is not a resolved-item count.`, '',
  'The original baseline is reconciled individually below; none disappears merely because a heuristic relabelled it:', '',
  ...Object.entries(outcomes).map(([key,value]) => `- ${key}: **${value}**`), '',
  'Current remaining counts retain preparation phrases, malformed amounts, compounds and cross-kind confusion as review work, not new canonical concepts. Known explicit parts/variants remain observations but leave the candidate queue.', '',
  '## Accepted changes', '',
  ...kinds.map(kind => `- New ${kind} concepts: ${decisions.changes.filter((c: any) => c.kind === kind && c.action === 'new-concept').map((c: any) => c.id).join(', ')}.`),
  '- Existing aliases/plurals and every local relationship are listed in `vocabulary-review-decisions.json`, including Parmesan → parmesan-cheese, potatoes → potato, bay leaves → bay-leaf, and wisk → whisk.',
  '- New files are generated/unchecked. Existing curation is retained; checked content would be reset if edited. Old evidence counts remain historical; indexes now identify the 410-recipe review scope.',
  '- Local variants are names/aliases only, with no inheritance or automatic flattening of compound names. Existing standalone ingredient IDs remain valid. Parts do not become whole-ingredient aliases.', '',
  '## Remaining human-review queue', '',
  'Examples below are deliberately unresolved. The complete queue, recipes and source examples are in `vocabulary-review-results.json` and `public-domain-vocabulary-candidates.json`.', '',
  ...[...new Set<string>(remaining.map((c: any) => c.category))].flatMap(category => {
    const items = remaining.filter((c: any) => c.category === category);
    return [`### ${category} (${items.length})`, '', ...items.slice(0, 6).map((c: any) => `- ${c.term}: ${c.recipes.slice(0,3).join(', ')}.`), ''];
  }),
  '## Deliberate limits and future questions', '',
  '- Garlic cloves should refer to the garlic clove part, not a new ingredient or a whole-garlic synonym. The local part is recorded; compound-to-part alias resolution remains future model work. The same issue applies to broccoli florets and existing chicken-breast compound entries.',
  '- Thermometer and cheesecloth remain equipment. Thermos is new equipment. References classified through equipment declarations no longer become ingredient candidates; genuinely misplaced/undeclared terms stay in the cross-kind queue.',
  '- Feta is a distinct ingredient; feta cheese is its alias, never an alias for generic cheese. Chop, dice and mince remain distinct.',
  '- “slowly add” retains manner; “sieve” may mean sift or strain; “let”, “bring”, “take” and “enjoy” are not blindly promoted or equated to cooking operations.',
  '- “whatever you like”, package text, unspecified cheeses and compound alternatives are not concepts. Preparation adjectives are review hints, never automatic aliases.',
  '- Variant versus standalone-concept migration and scope-aware compound-to-part references need a separate design; no grammar change is required or made here.', '',
  '## Reproduction and verification', '',
  'Run `node scripts/report-public-domain-import.ts` then `node scripts/report-vocabulary-review.ts`. These rebuild reports without editing YAML. The baseline and decision files preserve this pass independently of later reports.',
  'Run `pnpm check`, `pnpm build`, `pnpm test` and `pnpm corpus`. Tests generate every canonical reference model/page, check aliases and local structures, reject malformed variants, and compare all 410 recipe hashes with the pre-review baseline.', '',
  'This is a public-subset regeneration of the historical review; see RELEASE-VALIDATION.md for release checks.', ''
];
writeFileSync('VOCABULARY-REVIEW.md', text.join('\n'));
console.log(JSON.stringify(summary,null,2));
