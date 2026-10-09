import type { Node, Recipe, Statement, Token } from '../model/index.ts';
import type { RenderOptions } from './index.ts';
import { thingLabeler } from './thing-label.ts';
import { amountTokens, isStructuredValue } from './syntax.ts';

/** Internal phrasing representation. Labels are plain text, never HTML. */
export interface PhrasePart { text: string; token?: Token; nodeId?: string; inheritedSubjectId?: string; value?: boolean }
export type Phrase = PhrasePart[];
const text = (value: string, structuredValue = false): Phrase => [{ text: value, ...(structuredValue ? { value: true } : {}) }];
const join = (parts: Phrase[], separator: string): Phrase => parts.flatMap((p, i) => i ? [...text(separator), ...p] : p);
/** Reusable list punctuation which retains each token-bearing phrase. */
export function humanList(items: Phrase[], conjunction = 'and'): Phrase {
  if (items.length < 2) return items.flat();
  return items.flatMap((item, i) => [...(i ? text(i === items.length - 1 ? `${items.length > 2 ? ',' : ''} ${conjunction} ` : ', ') : []), ...item]);
}
export const phraseText = (p: Phrase): string => p.map(p => p.text).join('');
const trim = (p: Phrase): Phrase => {
  const merged: Phrase = [];
  for (const part of p) {
    const last = merged.at(-1);
    if (!part.token && !part.nodeId && last && !last.token && !last.nodeId && last.value === part.value) last.text += part.text;
    else merged.push({ ...part });
  }
  const copy = merged.map(part => ({ ...part, text: part.text.replace(/\s+/g, ' ') }));
  for (let i = 1; i < copy.length; i++) {
    if (copy[i - 1].text.endsWith(' ') && copy[i].text.startsWith(' ')) copy[i].text = copy[i].text.trimStart();
  }
  if (copy.length) { copy[0].text = copy[0].text.trimStart(); copy.at(-1)!.text = copy.at(-1)!.text.trimEnd(); }
  return copy.filter(part => part.text);
};
export function sentence(p: Phrase, punctuate: boolean): Phrase {
  const result = p.map(part => ({ ...part }));
  const first = result.find(part => part.text.length);
  if (first) first.text = first.text.charAt(0).toUpperCase() + first.text.slice(1);
  const value = phraseText(result);
  if (punctuate && value && !/[.!?:]$/.test(value) && !value.startsWith('![')) result.push({ text: '.' });
  return result;
}
function duration(value: string): string {
  const m = value.match(/^(!|~~|~)?(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)([smh])$/);
  if (!m) return value;
  const unit = { s: 'second', m: 'minute', h: 'hour' }[m[3]]!;
  return `${m[1] === '!' ? 'measure closely: ' : m[1] === '~~' ? 'very approximately ' : m[1] ? 'approximately ' : ''}${m[2].replace('-', '–')} ${unit}${m[2] === '1' ? '' : 's'}`;
}

/** Shared by text and HTML; token identity survives phrasing and inherited subjects. */
export function compactPhrasing(recipe: Recipe, options: RenderOptions) {
  const labelThing = thingLabeler(recipe);
  let instructionContext = false;
  const byId = new Map<string, Statement>();
  const index = (nodes: Node[]): void => {
    for (const n of nodes) if (n.kind === 'statement' || n.kind === 'group') {
      if (n.kind === 'statement') byId.set(n.id, n);
      index(n.children);
    }
  };
  index(recipe.preamble); recipe.sections.forEach(s => index(s.children));
  const term = (t: Token, label?: string): Phrase => [{ token: t, text: label ?? options.formatTerm?.(t) ?? labelThing(t, instructionContext) }];
  const expression = (tokens: Token[]): Phrase => {
    const amounts = amountTokens(tokens);
    // A plus only becomes a list boundary when every operand contains a reference.
    // Free text such as "~35g + extra for serving" must remain attached to its amount.
    const operands: Token[][] = [[]];
    for (const t of tokens) { if (t.raw === '+') operands.push([]); else operands.at(-1)!.push(t); }
    if (operands.length > 1 && !tokens.some(t => ['=', '-OR-'].includes(t.raw)) &&
      operands.every(ts => ts.some(t => t.kind === 'thing' || t.kind === 'result')))
      return humanList(operands.map(ts => expression(ts)));
    return trim(tokens.flatMap(t => {
    if (t.kind === 'thing' || t.kind === 'result') return term(t);
    if (t.kind === 'image') return options.images === false ? [] : [{ token: t, text: t.raw }];
    if (t.kind === 'operator') return text(({ '+': ' and ', '-OR-': ' or ', '!': 'measure closely: ', '~~': 'very approximately ', '~': 'approximately ', '/': ' / ', '=': ' = ' } as Record<string, string>)[t.raw] ?? t.raw, amounts.has(t));
    return text(t.raw, amounts.has(t));
    }));
  };
  const withoutTrailingPlus = (tokens: Token[]) => {
    const copy = [...tokens];
    while (copy.length && !copy.at(-1)!.raw.trim()) copy.pop();
    if (copy.at(-1)?.raw === '+') copy.pop();
    return copy;
  };
  const subject = (n: Statement): Phrase => {
    if (n.inheritedSubjectId) {
      const parent = byId.get(n.inheritedSubjectId);
      return parent ? subject(parent) : [];
    }
    const stop = n.tokens.findIndex(t => t.kind === 'process' || t.raw === '=');
    return expression(withoutTrailingPlus(stop < 0 ? n.tokens : n.tokens.slice(0, stop)));
  };
  const action = (t: Token, object: Phrase): Phrase => {
    const name = options.formatTerm?.(t) ?? t.name!;
    const params = (t.parameters ?? []).map(p => options.formatValue?.(p, 'parameter') ?? duration(p));
    const namedObject = object.length ? [...text('the '), ...object] : text('it');
    if (name === 'level surface' && !params.length) return term(t, 'level the surface');
    if (name === 'spoon' && params.length === 1 && /\b(tin|pan|bowl|dish|mould|mold|glass|ramekin)\b/.test(params[0]))
      return [...term(t, 'spoon'), ...(object.length ? [...text(' '), ...namedObject] : []), ...text(` into the ${params[0]}`)];
    if (name === 'cool' && params.length === 1 && params[0] === 'slightly')
      return object.length ? [...text('allow '), ...namedObject, ...text(' to '), ...term(t, 'cool'), ...text(' slightly')]
        : [...term(t, 'cool'), ...text(' slightly')];
    if (name === 'pierce' && params.length === 1 && params[0] === 'top') return [...term(t, 'pierce'), ...text(' the top')];
    const equipment = [...byId.values()].flatMap(n => n.tokens).filter(t => t.kind === 'thing' && t.thingKind === 'equipment').map(t => t.name);
    const cooking = /^(bake|boil|bring to boil|simmer|fry|reduce|cook|heat|roast|sauté|saute)$/;
    const suffixes = params.map((p, i) => {
      // User formatting hooks are opaque text, not input to heuristic classifiers.
      if (options.formatValue) return ` (${p})`;
      if (/^\d+(?:\.\d+)?\s*°?[CF]$/i.test(p)) return ` at ${p.replace(/\s*°?([CF])$/i, (_, unit: string) => '°' + unit.toUpperCase())}`;
      if (/^(approximately )?\d+(?:[.\d–]*) (seconds?|minutes?|hours?|mins?|secs?)$/.test(p)) return ` for ${p}`;
      if (/^until\b/.test(p)) return ` ${p}`;
      if (/^(gently|slightly|finely|gradually|continuously|thoroughly)$/.test(p)) return ` ${p}`;
      if (/^stirring\b/.test(p)) return `, ${p}`;
      if (cooking.test(name) && /^(?:low|medium|high|medium-low|medium-high)(?: heat)?$/.test(p)) return ` over ${p.endsWith('heat') ? p : p + ' heat'}`;
      if (name === 'cut' && /^(?:~?\d+(?:-\d+)?(?:\/\d+)?\s*(?:in|cm|mm) )?(?:small )?(?:strips|cubes|chunks|slices|pieces)$/.test(p))
        return ` into ${p.replace(/(\d)-(\d)/g, '$1–$2').replace(/(\d)(in|cm|mm)\b/g, '$1 $2')}`;
      if (equipment.includes(p)) {
        if (/^(mix|beat|stir|whisk|mash|cut|chop|process|blend|pulse)$/.test(name) && /^(food processor|mixer|whisk|fork|knife|blender|immersion blender)$/.test(p)) return ` using the ${p}`;
        if (/^(mix|beat|stir|whisk|bake|boil|simmer|fry|reduce|cook|heat|roast|cool|rest|spoon|pour|ladle|transfer|place)$/.test(name) && /\b(bowl|pan|saucepan|pot|oven|tin|tray|dish|maker)$/.test(p))
          return ` ${/^(spoon|pour|ladle|transfer|place)$/.test(name) ? 'into' : 'in'} the ${p}`;
      }
      return ` (${params[i]})`;
    });
    return [...term(t, name), ...(object.length ? [...text(' the '), ...object] : []),
      ...suffixes.flatMap((suffix, i) => {
        const position = suffix.indexOf(params[i]);
        return !options.formatValue && position >= 0 && isStructuredValue(t.parameters![i])
          ? [...text(suffix.slice(0, position)), ...text(params[i], true), ...text(suffix.slice(position + params[i].length))]
          : text(suffix);
      })];
  };
  const instruction = (n: Statement, omitSubject = false): Phrase => {
    const tokens = n.tokens;
    if (tokens.some(t => t.raw === '-OR-')) {
      const branches: Token[][] = [[]];
      for (const t of tokens) { if (t.raw === '-OR-') branches.push([]); else branches.at(-1)!.push(t); }
      return join(branches.map(tokens => instruction({ ...n, tokens })), ' OR ');
    }
    const firstProcess = tokens.findIndex(t => t.kind === 'process');
    const prefix = firstProcess < 0 ? tokens : tokens.slice(0, firstProcess);
    const equal = prefix.findIndex(t => t.raw === '=');
    const parts: Phrase[] = [];
    if (equal >= 0) {
      const rhs = expression(prefix.slice(equal + 1));
      parts.push(rhs.length ? [...text('Combine '), ...rhs, ...text(' to make '), ...expression(prefix.slice(0, equal))]
        : [...text('Prepare '), ...expression(prefix.slice(0, equal)), ...text(' from the following')]);
    } else if (prefix.some(t => t.raw === '+')) {
      const operands = withoutTrailingPlus(prefix).filter((t, i) => !(i === 0 && t.raw === '+'));
      const sig = operands.filter(t => t.raw.trim());
      if (n.inheritedSubjectId && sig[0]?.kind === 'thing' && sig.slice(1).every(t => t.kind === 'text')) {
        const thing = sig[0], tail = sig.slice(1).map(t => t.raw).join('').trim();
        const destination = subject(n);
        const enough = tail.match(/^enough to (.+)$/);
        if (enough) {
          // Preserve source state (e.g. ice-cold); a role repeated by the explicit
          // destination can be omitted only on an already resolved reference.
          const role = `for ${phraseText(destination)}`;
          const qs = (thing.qualifiers ?? []).filter(q => !(thing.thingKind === 'ingredient' && thing.declarationIds?.length === 1 && q === role));
          const temperatures = qs.filter(q => /^(cold|warm|hot|ice-cold|boiling)$/.test(q));
          const label = options.formatTerm?.(thing) ?? [...temperatures, labelThing({ ...thing, qualifiers: qs.filter(q => !temperatures.includes(q)) }, false)].join(' ');
          // One bounded grammatical idiom, not a general purpose-clause parser.
          const purpose = enough[1].replace(/^make dough hold together$/, 'make the dough hold together');
          parts.push([...text('Add enough '), ...term(thing, label), ...text(' to the '), ...destination, ...text(` to ${purpose}`)]);
        } else parts.push([...text('Add '), ...term(thing), ...text(' to the '), ...destination, ...(tail ? text(` (${tail})`) : [])]);
      } else parts.push(n.inheritedSubjectId ? [...text('Add '), ...expression(operands), ...text(' to the '), ...subject(n)]
        : [...text('Combine '), ...expression(operands)]);
    } else if (firstProcess < 0) return expression(tokens);
    let currentSubject = omitSubject ? [] : subject(n);
    for (let i = firstProcess; i >= 0 && i < tokens.length; i++) {
      const t = tokens[i];
      if (t.kind === 'process') { parts.push(action(t, currentSubject)); currentSubject = []; }
      else if (t.kind === 'judgement' && t.judgement && tokens.some(p => p.kind === 'process' && p.span.start === t.judgement!.processSpan?.start) && parts.length) {
        parts.at(-1)!.push(...text(', until '), { token: t, text: t.judgement.text });
      }
      else if (t.raw.trim()) {
        let end = i + 1; while (end < tokens.length && tokens[end].kind !== 'process') end++;
        parts.push(expression(tokens.slice(i, end))); i = end - 1;
      }
    }
    return join(parts, ', then ');
  };
  function statement(n: Statement, section: string): { parts: Phrase; children: Node[] } {
    instructionContext = section === 'instructions';
    const body = n.children.filter(c => c.kind === 'statement') as Statement[];
    const multiline = section === 'instructions' && n.role === 'assignment' && n.tokens.at(-1)?.raw === '=' && body.length > 0 &&
      n.children.every(c => ['statement', 'comment', 'blank'].includes(c.kind)) &&
      body.every(c => c.tokens.some(t => ['thing', 'result'].includes(t.kind)) &&
        c.tokens.every(t => t.kind !== 'process' && !['=', '-OR-'].includes(t.raw)) &&
        c.children.every(child => child.kind === 'comment' || child.kind === 'blank'));
    const equal = n.tokens.findIndex(t => t.raw === '=');
    let parts = multiline
      ? [...text('Combine '), ...humanList(body.map(c => expression(withoutTrailingPlus(c.tokens)))), ...text(' to make '), ...subject(n)]
      : n.role === 'choice'
        ? [...text('Choose '), ...expression(n.tokens.slice(0, equal)), ...text(' from: '), ...expression(n.tokens.slice(equal + 1))]
        : section === 'instructions' ? instruction(n) : expression(n.tokens);
    let children = multiline ? n.children.flatMap(c => c.kind !== 'statement' ? [c] : [
      ...(c.comment === undefined ? [] : [{ kind: 'comment' as const, id: c.id, span: c.span, indent: c.indent, text: c.comment }]), ...c.children
    ]) : n.children;
    // Consume only a contiguous run of pure inherited actions. Comments, images,
    // additions, explicit subjects, alternatives and groups remain hard boundaries.
    if (section === 'instructions' && !multiline && !(options.comments && n.comment !== undefined) &&
        n.tokens.some(t => t.kind === 'process') && !n.tokens.some(t => t.kind === 'operator') &&
        n.tokens.filter(t => t.kind === 'thing' || t.kind === 'result').length <= 1) {
      const actions: Phrase[] = [parts];
      let consumed = 0;
      for (const child of children) {
        if (child.kind === 'blank') { consumed++; continue; }
        if (child.kind !== 'statement' || child.inheritedSubjectId !== (n.inheritedSubjectId ?? n.id) ||
            (options.comments && child.comment !== undefined) ||
            !child.tokens.some(t => t.kind === 'process') ||
            !child.tokens.every(t => t.kind === 'process' || (t.kind === 'text' && !t.raw.trim())) ||
            child.children.some(c => c.kind !== 'blank')) break;
        const continuation = instruction(child, true);
        if (continuation.length) continuation[0] = { ...continuation[0], nodeId: child.id, inheritedSubjectId: child.inheritedSubjectId };
        actions.push(continuation); consumed++;
      }
      if (actions.length > 1) {
        parts = actions.length === 2 ? join(actions, ', then ') : humanList(actions, 'then');
        children = children.slice(consumed);
      }
    }
    return { parts: sentence(trim(parts), section === 'instructions'), children };
  }
  /** Pair only identical simple actions on a documented complementary part group. */
  function separation(a: Node, b: Node | undefined, section: string): Phrase | undefined {
    const vocabulary = options.vocabulary;
    if (!vocabulary || options.formatTerm || options.formatValue || section !== 'instructions' ||
        a.kind !== 'statement' || b?.kind !== 'statement' || a.indent !== b.indent ||
        a.comment !== undefined || b.comment !== undefined || a.children.length || b.children.some(n => n.kind !== 'blank') ||
        a.inheritedSubjectId || b.inheritedSubjectId) return;
    const left = a.tokens.filter(t => t.raw.trim()), right = b.tokens.filter(t => t.raw.trim());
    if (![left, right].every(ts => ts.length === 2 && ts[0].kind === 'thing' && ts[0].thingKind === 'ingredient' &&
      !ts[0].variant && !ts[0].qualifiers?.length && ts[0].parts?.length === 1 &&
      ts[0].partResolution?.complete && ts[0].declarationIds?.length === 1 &&
      ts[1].kind === 'process' && ts[1].name === 'separate' && !ts[1].parameters?.length)) return;
    const x = left[0], y = right[0];
    if (!x.canonicalId || x.canonicalId !== y.canonicalId || x.declarationIds![0] !== y.declarationIds![0]) return;
    const declaration = byId.get(x.declarationIds![0]);
    const declared = declaration?.tokens.filter(t => t.raw.trim());
    // No unknown amounts, part-only declarations, choices, variants or roles.
    if (declaration?.role !== 'declaration' || declared?.length !== 2 || declared[0].kind !== 'thing' ||
        declared[0].parts?.length || declared[0].variant || declared[0].qualifiers?.length ||
        declared[1].kind !== 'text' || !/^[1-9]\d*$/.test(declared[1].raw.trim())) return;
    const pair = [x.partResolution!.ids[0], y.partResolution!.ids[0]];
    const groups = vocabulary.partGroups(x.canonicalId).filter(({ group }) => group.process === 'separate' &&
      group.parts.length === 2 && new Set(pair).size === 2 && pair.every(id => group.parts.includes(id)));
    if (groups.length !== 1) return;
    const base = vocabulary.entries.filter(e => e.kind === 'ingredient' && e.id === x.canonicalId);
    if (base.length !== 1) return;
    const plural = declared[1].raw.trim() !== '1';
    const english = (names?: Record<string, string>) => names?.en ?? names?.['en-GB'] ?? names?.['en-US'];
    const baseLabel = english(plural ? base[0].plural_names : base[0].names);
    const resolved = pair.map(id => base[0].parts?.[id]);
    const labels = resolved.map(p => english(plural ? p?.plural_names : p?.names));
    if (!baseLabel || labels.some(l => !l)) return;
    const baseToken = { ...declared[0], declarationIds: x.declarationIds };
    return sentence([...term(left[1], 'separate'), ...text(' the '), ...term(baseToken, baseLabel), ...text(' into '),
      ...term(x, labels[0]!), ...text(' and '), { ...term(y, labels[1]!)[0], nodeId: b.id }], true);
  }
  return { statement, separation };
}
