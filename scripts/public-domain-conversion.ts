import { actionBoundaries } from '../src/conversion-evidence.ts';
/** Conservative import helpers. This is a source adapter, not recipe grammar. */
import { parse } from 'yaml';
import type { Vocabulary } from '../src/vocabulary/index.ts';

export interface SourceBlock { heading: string; level: number; lines: string[] }
export function readMarkdown(text: string) {
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const metadata = (front ? parse(front[1]) : {}) as Record<string, unknown>;
  const blocks: SourceBlock[] = [{ heading: 'Introduction', level: 0, lines: [] }];
  for (const line of text.slice(front?.[0].length ?? 0).split(/\r?\n/)) {
    const h = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (h) blocks.push({ heading: h[2], level: h[1].length, lines: [] });
    else blocks.at(-1)!.lines.push(line);
  }
  return { metadata, blocks };
}
export function plain(text: string): string {
  return text.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 — $2')
    .replace(/\*\*|__/g, '').replace(/(?<!\w)[*_]|[*_](?!\w)/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
const unit = '(?:kilograms?|grams?|millilit(?:er|re)s?|lit(?:er|re)s?|tablespoons?|teaspoons?|dessertspoons?|cups?|ounces?|pounds?|lbs?\\.?|oz\\.?|tbsp\\.?|tsp\\.?|tbs\\.?|kg|gm|gr?|ml|cl|dl|lt|[lL]|pints?|quarts?|gallons?|sticks?|cans?|packets?|packages?|bunch(?:es)?|cloves?|slices?|pieces?|pinch(?:es)?|handfuls?|bottles?|jars?|spoons?|servings?|heads?|leaves)';
const number = '[~!]?(?:\\d+(?:[.,]\\d+)?|[.,]\\d+)(?:\\s+\\d+[\\/⁄]\\d+|[\\/⁄]\\d+|\\s*[¼½¾⅓⅔⅛⅜⅝⅞])?\\+?|[¼½¾⅓⅔⅛⅜⅝⅞]';
const quantity = new RegExp(`^((?:${number})(?:\\s*[-–]\\s*(?:${number}))?\\s*(?:${unit}(?=\\s|\\(|/|$))?(?:\\s*\\([^)]*\\))?(?:\\s*[/=]\\s*(?:${number})\\s*(?:${unit}(?=\\s|\\(|/|$))?)?)\\s+(?:of\\s+)?(.+)$`, 'i');
const punctuation = (s: string) => s.replace(/[()]/g, ', ').replace(/[<>\[\]{}#]/g, ' ').replace(/\s+/g, ' ').replace(/(?:,\s*)+/g, ', ').replace(/^,\s*|,\s*$/g, '').trim();
const preparation = /^(finely chopped|roughly chopped|freshly ground|freshly squeezed|freshly grated|thinly sliced|chopped|minced|diced|sliced|grated|shredded|crushed|melted|softened|sifted|peeled|beaten|ground|fresh|dried|large|medium|small)\s+(.+)$/i;
const parts: Record<string, string> = { 'egg yolk': 'egg: yolk', 'egg yolks': 'egg: yolk', 'egg white': 'egg: white', 'egg whites': 'egg: white', 'lemon zest': 'lemon: zest', 'lemon juice': 'lemon: juice', 'orange zest': 'orange: zest', 'orange juice': 'orange: juice', 'lime zest': 'lime: zest', 'lime juice': 'lime: juice' };
const variants: Record<string, string> = { 'plain flour': 'flour; plain', 'all purpose flour': 'flour; all purpose', 'all-purpose flour': 'flour; all-purpose', 'self-raising flour': 'flour; self-raising', 'white sugar': 'sugar; white', 'brown sugar': 'sugar; brown', 'unsalted butter': 'butter; unsalted', 'salted butter': 'butter; salted' };
export interface IngredientConversion { original: string; line: string; name: string; amount: string; qualifiers: string[]; relationship?: string; flags: string[] }
export function ingredient(original: string, vocabulary: Vocabulary, role = ''): IngredientConversion {
  let text = plain(original.replace(/^\s*[-*+]\s+/, '')), amount = '';
  const flags: string[] = [];
  const leadingOptional = text.match(/^\(optional\)\s*/i);
  if (leadingOptional) text = text.slice(leadingOptional[0].length);
  const packageAmount = /^(\d+\s+\d+(?:\.\d+)?\s*(?:oz|g|ml)\.?\s*(?:cans?|bottles?|packages?)?(?:\s*\([^)]*\))?)\s+(?:of\s+)?(.+)$/i;
  const verbalAmount = /^(a quarter of a pound|a (?:small |large |full |few |little |good )?(?:handful|bunch|pinch|spoonful|salt-spoonful|tea-spoonful|table-spoonful|cup|quart|pint|pound|glass|tablespoon|teaspoon|jar|can|kettle|bit)|a few (?:cloves|slices|dashes)|a few|a couple(?: of)?|some slices|some|a little(?: bit)?|pinch|one pound|three or four spoons)\s+(?:of\s+)?(.+)$/i;
  const suffixAmount = text.match(/^(.+?):\s*([~!]?\d.+|\d)$/);
  if (suffixAmount) { text = suffixAmount[1]; amount = suffixAmount[2]; }
  const wordMeasure = new RegExp(`^((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\s+${unit})\\s+(?:of\\s+)?(.+)$`, 'i');
  const match = amount ? null : text.match(packageAmount) ?? text.match(quantity) ?? text.match(verbalAmount) ?? text.match(wordMeasure) ?? text.match(/^(an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(.+)$/i);
  if (match) { amount = match[1].trim(); text = match[2]; }
  else if (/^\d|^[~!¼½¾⅓⅔⅛⅜⅝⅞]/.test(text)) flags.push('Quantity boundary requires review; source phrase retained');
  // A parenthesis may be a package size OR an equivalent. Never turn it into '/'.
  if (/[()]/.test(amount)) flags.push('Parenthetical quantity/package notation retained; equivalence not inferred');
  amount = amount.replace(/\(/g, '（').replace(/\)/g, '）').replace(/\s+/g, ' ').trim();
  let qualifiers: string[] = leadingOptional ? ['optional'] : [];
  // Separate explanatory sentences from the ingredient identity, without deleting them.
  const sentence = text.search(/\.\s+[A-Z]/);
  if (sentence >= 0) { qualifiers.push(text.slice(sentence + 1).trim()); text = text.slice(0, sentence); }
  const parens = [...text.matchAll(/\(([^)]*)\)/g)].map(m => m[1]);
  text = text.replace(/\([^)]*\)/g, '').trim(); qualifiers.push(...parens);
  const comma = text.indexOf(',');
  if (comma >= 0) { qualifiers.push(text.slice(comma + 1).trim()); text = text.slice(0, comma).trim(); }
  const prep = text.match(preparation);
  if (prep) { qualifiers.unshift(prep[1]); text = prep[2]; }
  text = punctuation(text).replace(/[.]$/, '').toLowerCase();
  if (/\b(or|and)\b|\//.test(text)) flags.push('Compound or alternative ingredient retained as authored; allocation not inferred');
  const relation = parts[text] ? 'strong part relationship' : variants[text] ? 'strong variant/type relationship' : undefined;
  let name = parts[text] ?? variants[text] ?? text;
  // Singularise only a transparent final plural with one existing canonical match.
  // This affects a local name, never the global vocabulary.
  if (!relation && !vocabulary.resolve(name, 'ingredient').length && name.endsWith('s') && !name.endsWith('ss')) {
    const singular = name.slice(0, -1);
    if (vocabulary.resolve(singular, 'ingredient').length === 1) name = singular;
  }
  if (role) qualifiers.push(`for ${role}`);
  qualifiers = qualifiers.map(punctuation).filter(Boolean);
  if (!name) { name = 'ingredient described in source'; flags.push('Ingredient name requires manual interpretation'); }
  if (/[;:]/.test(name) && !relation) { name = name.replace(/[;:]/g, ','); flags.push('Source punctuation retained as loose qualifiers, not inferred structure'); }
  if (!amount) flags.push('No explicit leading quantity extracted; no amount invented');
  return { original, line: `(${name}${qualifiers.length ? ', ' + qualifiers.join(', ') : ''})${amount ? ' ' + amount : ''}`, name, amount, qualifiers, relationship: relation, flags };
}

export interface MethodConversion { original: string; line: string; process?: string; mode: 'action' | 'literal'; flags: string[] }
const verbs = /^(bring to a boil|set aside|turn off|stir[- ]fry|deep[- ]fry|preheat|add|arrange|bake|beat|blend|boil|braise|break|brown|brush|butter|caramelize|caramelise|chill|chop|clean|coat|combine|cook|cover|crack|cream|crush|cut|deglaze|dice|discard|dissolve|divide|drain|dress|dry|dust|empty|enjoy|fill|filter|flip|fold|form|freeze|fry|garnish|grate|grease|grill|grind|heat|incorporate|knead|ladle|layer|leave|let|line|mash|melt|mince|mix|move|open|peel|place|plate|poach|pour|prepare|press|prick|put|refrigerate|reduce|remove|repeat|rinse|roast|roll|rub|saute|sauté|scoop|scrape|scrub|sear|season|separate|serve|shake|sieve|sift|simmer|slice|slowly add|smoke|soak|spread|sprinkle|squeeze|steam|stir|strain|stuff|take|taste|tear|toast|top|toss|transfer|trim|turn|uncover|wait|warm|wash|whip|whisk|wrap)\b\s*(.*)$/i;
export function method(original: string, ingredients: readonly IngredientConversion[] = []): MethodConversion {
  const text = plain(original.replace(/^\s*(?:\d+[.)]|[-*])\s+/, ''));
  const match = text.match(verbs) ?? text.match(/^(allow|bring|cool|hang|keep|shred|store|use|wisk)\b\s*(.*)$/i);
  const heads = verbs.source.slice(2, verbs.source.indexOf(')\\b')).split('|').filter(v => !v.includes('['));
  const boundaries = match ? actionBoundaries(text, heads) : [];
  if (match && !boundaries.length && !/[<>]/.test(text)) {
    const process = match[1].toLowerCase(), rest = match[2].replace(/^[.!]+\s*/, '').replace(/[.!]$/, '');
    const candidates = ingredients.flatMap(item => {
      const label = item.name.replace(/[:;]/g, ' ').replace(/\s+/g, ' ');
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const object = rest.match(new RegExp(`^(?:the )?${escaped}s?\\b(.*)$`, 'i'));
      // Move only a uniquely named, complete direct object. Compound objects,
      // modifiers and pronouns remain source text, not guessed recipe identities.
      if (!object || (object[1] && !/^\s+(?:in|into|on|onto|to|for|until|with|over|under|at|from|using)\b/i.test(object[1]))) return [];
      return [{ item, tail: object[1].trim() }];
    });
    const unique = candidates.length === 1 ? candidates[0] : undefined;
    // Only exact, uniquely declared source/destination names; no pronoun or allocation guesses.
    if (process === 'add') {
      const addition = rest.match(/^(.+?) to (.+)$/i);
      const resolve = (name: string) => ingredients.filter(i => i.name.toLowerCase() === name.replace(/^the /i, '').toLowerCase());
      if (addition) {
        const from = resolve(addition[1]), to = resolve(addition[2]);
        if (from.length === 1 && to.length === 1 && from[0] !== to[0])
          return { original, line: '(' + to[0].name + ') + (' + from[0].name + ')', mode: 'action', flags: [] };
      }
    }
    const token = unique ? `(${unique.item.name})` : undefined;
    const parameters = token && unique ? unique.tail : rest;
    return { original, line: `${token ? token + ' ' : ''}<${process}${parameters ? ', ' + parameters : ''}>`, process, mode: 'action', flags: parameters ? ['Free-text process arguments retain source wording; argument roles not inferred'] : [] };
  }
  // No invented process/result or guessed conditional semantics. Typographic
  // parentheses prevent prose asides becoming physical-thing references.
  const literal = text.replace(/\(/g, '（').replace(/\)/g, '）').replace(/\[/g, '［').replace(/\]/g, '］').replace(/</g, '＜').replace(/>/g, '＞').replace(/\{/g, '｛').replace(/\}/g, '｝').replace(/#/g, '＃');
  return { original, line: literal, mode: 'literal', flags: [boundaries.length ? 'Multiple action heads: split into separate actions; use + for clear additions and declare known culinary things' : 'Conditional/narrative instruction retained as free text; review structural encoding'] };
}
