import { semanticTokens } from '../model/index.ts';
import type { Diagnostic, Group, Node, Recipe, Section, Span, Statement, Token } from '../model/index.ts';
import type { Vocabulary } from '../vocabulary/index.ts';
import { readCuration } from '../curation.ts';

export interface ParseOptions { filename?: string; vocabulary?: Vocabulary }
const standard = new Set(['recipe', 'ingredients', 'equipment', 'instructions', 'story', 'notes', 'source']);

/** Parse with recovery. Errors are returned in diagnostics; source is never discarded. */
export function parseRecipe(source: string, options: ParseOptions = {}): Recipe {
  const recipe: Recipe = { modelVersion: 1, source, filename: options.filename, preamble: [], sections: [], diagnostics: [] };
  let serial = 0;
  const id = () => `n${++serial}`;
  const report = (severity: Diagnostic['severity'], code: string, message: string, span: Span) =>
    recipe.diagnostics.push({ severity, code, message, span });
  let section: Section | undefined;
  const groups: { group: Group; parents: Statement[]; target: Node[] }[] = [];
  let parents: Statement[] = [];
  let target = recipe.preamble;
  let offset = 0;
  let pendingRepeat: Group | undefined;
  let sourceState: 'awaiting' | 'open' | undefined;

  function tokenize(text: string, span: Span): Token[] {
    const tokens: Token[] = [];
    let p = 0;
    const loc = (start: number, end: number): Span => ({ start: span.start + start, end: span.start + end, line: span.line, column: span.column + start });
    while (p < text.length) {
      const start = p;
      if (text.startsWith('?=', p)) {
        const processTokenIndex = tokens.findLastIndex(t => t.kind !== 'text' || !!t.raw.trim());
        const body = text.slice(p + 2).trim();
        if (tokens[processTokenIndex]?.kind !== 'process')
          report('error', 'UNATTACHED_JUDGEMENT', '?= must immediately follow a process on the same line.', loc(p, text.length));
        if (!body) report('error', 'EMPTY_JUDGEMENT', '?= requires a qualitative target.', loc(p, text.length));
        tokens.push({ kind: 'judgement', raw: text.slice(p), span: loc(p, text.length),
          judgement: { text: body, processSpan: tokens[processTokenIndex]?.kind === 'process' ? { ...tokens[processTokenIndex].span } : undefined } });
        p = text.length;
        continue;
      }
      const image = text.slice(p).match(/^!\[([^\]]*)\]\(([^)]*)\)/);
      if (image) {
        p += image[0].length;
        tokens.push({ kind: 'image', raw: image[0], alt: image[1], path: image[2], span: loc(start, p) });
        continue;
      }
      const close = ({ '(': ')', '{': '}', '<': '>' } as Record<string, string>)[text[p]];
      if (close) {
        // Parenthesised prose is allowed inside a process parameter.
        let depth = 1; p++;
        while (p < text.length && depth) {
          if (text[p] === text[start]) depth++;
          if (text[p] === close) depth--;
          p++;
        }
        if (depth) {
          report('error', 'UNCLOSED_TOKEN', `Expected '${close}' before the end of the line.`, loc(start, p));
          tokens.push({ kind: 'text', raw: text.slice(start, p), span: loc(start, p) });
          continue;
        }
        const raw = text.slice(start, p);
        const parts = raw.slice(1, -1).split(',').map(s => s.trim());
        const kind = text[start] === '(' ? 'thing' : text[start] === '{' ? 'result' : 'process';
        if (!parts[0]) report('error', 'EMPTY_NAME', `A ${kind} needs a name.`, loc(start, p));
        const token: Token = { kind, raw, span: loc(start, p), name: kind === 'result' ? raw.slice(1, -1).trim() : parts[0] };
        if (kind === 'thing') {
          token.qualifiers = parts.slice(1);
          const structure = parts[0].match(/^([^;:]+?)(?:\s*;\s*([^;:]+))?((?:\s*:\s*[^;:]+)*)$/);
          if (structure) {
            token.name = structure[1].trim();
            if (structure[2]) token.variant = structure[2].trim();
            token.parts = structure[3] ? structure[3].split(':').slice(1).map(p => p.trim()) : [];
          } else report('error', 'INVALID_THING_STRUCTURE', 'Expected base, optional ; variant, then nonempty : parts before comma qualifiers.', token.span);
        }
        if (kind === 'process') {
          token.parameters = parts.slice(1);
          const firstComma = raw.indexOf(',');
          if (firstComma >= 0) {
            const slices: { start: number; end: number }[] = [];
            let begin = firstComma + 1, parens = 0;
            for (let i = begin; i < raw.length - 1; i++) {
              if (raw[i] === '(') parens++;
              if (raw[i] === ')') parens = Math.max(0, parens - 1);
              if (raw[i] === ',' && parens === 0) { slices.push({ start: begin, end: i }); begin = i + 1; }
            }
            slices.push({ start: begin, end: raw.length - 1 });
            const parameterParts = slices.map(part => {
              const value = raw.slice(part.start, part.end), children: Token[] = [];
              let cursor = 0, referenceSeen = false;
              const literal = (a: number, b: number) => {
                if (b > a) children.push({ kind: 'text', raw: value.slice(a, b), span: loc(start + part.start + a, start + part.start + b) });
              };
              // Only explicit context positions opt in. Incidental parenthetical prose stays opaque.
              for (const match of value.matchAll(/\(([^(){}<>\[\]!?=]+)\)/g)) {
                const at = match.index!, before = value.slice(cursor, at);
                const positioned = /\b(?:in|into|with|using|on|onto|from|over)\s*$/.test(before) ||
                  (referenceSeen && /^\s*\+\s*$/.test(before));
                const head = match[1].split(',')[0];
                if (!positioned || /^\s*(?:!|~~|~)?\d+(?:[.\/–-]\d+)*\s*(?:s|m|h|seconds?|minutes?|hours?|mm|cm|inches?|g|kg|ml|l)\s*$/i.test(head) || !/[\p{L}]/u.test(head) || /[.!?]/.test(head) ||
                    !/^([^;:]+?)(?:\s*;\s*([^;:]+))?((?:\s*:\s*[^;:]+)*)$/.test(head)) continue;
                if (referenceSeen && /^\s*\+\s*$/.test(before)) {
                  const plus = cursor + before.indexOf('+'); literal(cursor, plus);
                  children.push({ kind: 'operator', raw: '+', span: loc(start + part.start + plus, start + part.start + plus + 1) });
                  literal(plus + 1, at);
                } else literal(cursor, at);
                children.push(...tokenize(match[0], loc(start + part.start + at, start + part.start + at + match[0].length)));
                cursor = at + match[0].length; referenceSeen = true;
              }
              literal(cursor, value.length);
              return { raw: value, span: loc(start + part.start, start + part.end), tokens: children };
            });
            if (parameterParts.some(p => p.tokens.some(t => t.kind === 'thing'))) {
              token.parameterParts = parameterParts;
              token.parameters = parameterParts.map(p => p.raw.trim());
            }
          }
        }
        tokens.push(token);
        continue;
      }
      const operator = text.slice(p).startsWith('-OR-') ? '-OR-' : text.slice(p).startsWith('~~') ? '~~' : text[p] === '!' && /\d/.test(text[p + 1] ?? '') ? '!' : '+=~'.includes(text[p]) ? text[p] :
        text[p] === '/' && !(/\d/.test(text[p - 1] ?? '') && /\d/.test(text[p + 1] ?? '')) ? '/' : undefined;
      if (operator) {
        p += operator.length;
        tokens.push({ kind: 'operator', raw: operator, span: loc(start, p) });
        continue;
      }
      if (')}>[]'.includes(text[p])) report('error', 'UNEXPECTED_DELIMITER', `Unexpected '${text[p]}'.`, loc(p, p + 1));
      p++;
      while (p < text.length && !'({<)}>[]+=~'.includes(text[p]) && !text.slice(p).startsWith('?=') && !text.slice(p).startsWith('-OR-') && !/!\d/.test(text.slice(p, p + 2)) && !text.slice(p).startsWith('![') && !(text[p] === '/' && !( /\d/.test(text[p - 1]) && /\d/.test(text[p + 1] ?? '')))) p++;
      tokens.push({ kind: 'text', raw: text.slice(start, p), span: loc(start, p) });
    }
    return tokens;
  }

  function add(node: Node): void {
    if (node.kind === 'blank' || node.kind === 'comment') {
      (parents.at(-1)?.children ?? target).push(node); return;
    }
    while (parents.length && node.indent <= parents.at(-1)!.indent) parents.pop();
    const parent = parents.at(-1);
    if (node.kind === 'statement' && parent && section?.name === 'instructions') {
      const significant = node.tokens.filter(t => t.kind !== 'text' || t.raw.trim());
      if (significant[0]?.kind === 'process' || significant[0]?.raw === '+') {
        const owner = [...parents].reverse().find(p => {
          if (p.inheritedSubjectId) return true;
          const sig = p.tokens.filter(t => t.raw.trim());
          // Assignment continuations inherit only the result on the left, never RHS ingredients.
          if (p.role === 'assignment' || p.role === 'choice')
            return sig[0]?.kind === 'result' && sig[1]?.raw === '=';
          // Preserve existing Draft 8 explicit-subject continuation semantics.
          return sig[0]?.kind === 'thing' || sig[0]?.kind === 'result';
        });
        if (owner) node.inheritedSubjectId = owner.inheritedSubjectId ?? owner.id;
        else report('warning', 'MISSING_SUBJECT', 'Indented continuation has no explicit subject to inherit.', node.span);
      }
    }
    (parent?.children ?? target).push(node);
    if (node.kind === 'statement') parents.push(node);
  }

  // split preserves offsets for CRLF, LF and CR sources, including a final newline.
  const lines = source.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g) ?? [];
  if (lines.at(-1) === '') lines.pop();
  lines.forEach((full, index) => {
    const raw = full.replace(/[\r\n]+$/, '');
    const leading = raw.match(/^\s*/)?.[0] ?? '';
    const indent = leading.replace(/\t/g, '    ').length;
    const lineSpan: Span = { start: offset, end: offset + raw.length, line: index + 1, column: 1 };
    const contentSpan: Span = { ...lineSpan, start: offset + leading.length, column: leading.length + 1 };
    offset += full.length;
    const trimmed = raw.slice(leading.length);
    if (sourceState === 'open') {
      if (raw === '>>>') { section!.originalSource!.closed = true; sourceState = undefined; }
      else { section!.originalSource!.text += full; section!.originalSource!.span.end = offset; }
      return;
    }
    if (sourceState === 'awaiting') {
      if (raw === '<<<') {
        section!.originalSource = { text: '', span: { start: offset, end: offset, line: index + 2, column: 1 }, closed: false };
        sourceState = 'open'; return;
      }
      if (!raw.trim()) return;
      report('error', 'MISSING_SOURCE_FENCE', 'Source requires an unindented <<< line.', lineSpan);
      sourceState = undefined;
    }
    // SPEC section 23: a hash begins a comment, except in literal image/URL contexts.
    let hash = -1; let imageEnd = -1;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed.startsWith('![', i)) { const end = trimmed.indexOf(')', i); if (end >= 0) imageEnd = end; }
      const url = /https?:\/\/\S*$/.test(trimmed.slice(0, i));
      if (i > imageEnd && trimmed[i] === '#' && !url) { hash = i; break; }
    }
    const comment = hash >= 0 ? trimmed.slice(hash + 1).trimStart() : undefined;
    const code = (hash >= 0 ? trimmed.slice(0, hash) : trimmed).trimEnd();
    if (!code) { add({ kind: comment === undefined ? 'blank' : 'comment', id: id(), span: lineSpan, indent, text: comment ?? '' }); return; }
    if (!/^until\b/.test(code)) pendingRepeat = undefined;
    if (code.startsWith('::')) {
      for (const g of groups) report('error', 'UNCLOSED_GROUP', 'Group must close before the next section.', g.group.span);
      groups.length = 0; parents = [];
      const name = code.slice(2).trim();
      section = { name, span: lineSpan, comment, children: [] }; recipe.sections.push(section); target = section.children;
      if (name === 'source') sourceState = 'awaiting';
      if (!standard.has(name)) report('warning', 'UNKNOWN_SECTION', `Section '${name}' is preserved as prose.`, lineSpan);
      return;
    }
    if (section?.name === 'recipe') {
      const meta = code.match(/^([^:]+):\s*(.*)$/);
      if (meta) { add({ kind: 'metadata', id: id(), span: lineSpan, indent, key: meta[1].trim(), value: meta[2], comment }); return; }
      report('warning', 'METADATA_TEXT', 'Expected key: value; retained as text.', lineSpan);
    }
    if (!section || !['ingredients', 'equipment', 'instructions'].includes(section.name)) {
      // Images in prose are recognized without treating prose punctuation as syntax.
      if (/^!\[[^\]]*\]\([^)]*\)$/.test(code)) add({ kind: 'statement', id: id(), span: lineSpan, indent, tokens: tokenize(code, contentSpan), children: [], comment });
      else add({ kind: 'prose', id: id(), span: lineSpan, indent, text: code, comment });
      return;
    }
    const opening = code.match(/^(Meanwhile|Repeat|Optional)?\s*\[/);
    if (opening) {
      const group: Group = { kind: 'group', id: id(), span: lineSpan, indent, relationship: (opening[1] as Group['relationship']) ?? 'group', children: [], comment };
      add(group);
      const rest = code.slice(opening[0].length).trim();
      if (rest.endsWith(']')) {
        const inner = rest.slice(0, -1).trim();
        if (inner) group.children.push({ kind: 'statement', id: id(), span: lineSpan, indent: indent + 4, tokens: tokenize(inner, { ...contentSpan, start: contentSpan.start + code.indexOf(inner), column: contentSpan.column + code.indexOf(inner) }), children: [], role: 'instruction' });
        if (group.relationship === 'Repeat') pendingRepeat = group;
      } else {
        groups.push({ group, parents, target }); parents = []; target = group.children;
        if (rest) add({ kind: 'statement', id: id(), span: lineSpan, indent: indent + 4, tokens: tokenize(rest, { ...contentSpan, start: contentSpan.start + code.indexOf(rest), column: contentSpan.column + code.indexOf(rest) }), children: [], role: 'instruction' });
      }
      return;
    }
    if (code === ']') {
      const context = groups.pop();
      if (context) {
        context.group.span.end = lineSpan.end; context.group.closingComment = comment;
        target = context.target; parents = context.parents;
        if (context.group.relationship === 'Repeat') pendingRepeat = context.group;
      } else { report('error', 'UNEXPECTED_GROUP_END', 'No open group for this closing bracket.', lineSpan); add({ kind: 'prose', id: id(), span: lineSpan, indent, text: code, comment }); }
      return;
    }
    const tokens = tokenize(code, contentSpan);
    const significant = tokens.filter(t => t.raw.trim());
    let role: Statement['role'] = section.name === 'instructions' ? 'instruction' : 'declaration';
    if (significant.some(t => t.raw === '=')) role = ['ingredients', 'equipment'].includes(section.name) && significant[0]?.kind === 'thing' ? 'choice' : 'assignment';
    if (code === '-OR-') role = 'alternative';
    const node: Statement = { kind: 'statement', id: id(), span: lineSpan, indent, tokens, children: [], comment, role };
    if (/^until\b/.test(code)) {
      if (pendingRepeat) { node.role = 'condition'; pendingRepeat.condition = node; pendingRepeat = undefined; return; }
      report('warning', 'UNATTACHED_CONDITION', 'Condition has no immediately preceding Repeat group.', lineSpan);
    }
    if (significant.every(t => t.kind === 'text')) report('warning', 'FREE_TEXT', 'Unstructured content retained verbatim.', lineSpan);
    add(node);
  });
  if (sourceState) report('error', sourceState === 'open' ? 'UNCLOSED_SOURCE' : 'MISSING_SOURCE_FENCE', 'Source block requires <<< and >>> on their own unindented lines.', section!.span);
  for (const g of groups) report('error', 'UNCLOSED_GROUP', 'Expected closing ] before end of file.', g.group.span);

  function validateAlternatives(nodes: Node[]): void {
    const meaningful = nodes.filter(n => n.kind !== 'blank' && n.kind !== 'comment');
    meaningful.forEach((n, i) => {
      if (n.kind === 'statement') {
        const sig = n.tokens.filter(t => t.raw.trim());
        if (n.role === 'alternative') {
          const left = meaningful[i - 1], right = meaningful[i + 1];
          if (!left || !right || (left.kind === 'statement' && left.role === 'alternative') ||
              (right.kind === 'statement' && right.role === 'alternative'))
            report('error', 'MISSING_ALTERNATIVE', '-OR- requires an alternative on both sides.', n.span);
        } else if (sig[0]?.raw === '-OR-' || sig.at(-1)?.raw === '-OR-')
          report('error', 'MISSING_ALTERNATIVE', 'Inline -OR- requires an alternative on both sides.', n.span);
      }
      if (n.kind === 'statement' || n.kind === 'group') validateAlternatives(n.children);
    });
  }
  recipe.sections.forEach(s => validateAlternatives(s.children));

  const declarations = new Map<string, { token: Token; node: Statement; kind: 'ingredient' | 'equipment' | 'choice' }[]>();
  const visit = (nodes: Node[], fn: (s: Statement) => void): void => {
    for (const n of nodes) {
      if (n.kind === 'statement') fn(n);
      if (n.kind === 'statement' || n.kind === 'group') visit(n.children, fn);
      if (n.kind === 'group' && n.condition) fn(n.condition);
    }
  };
  const key = (s: string) => s.toLowerCase().trim();
  for (const s of recipe.sections.filter(s => ['ingredients', 'equipment'].includes(s.name))) {
    visit(s.children, n => {
      for (const t of n.tokens.filter(t => t.kind === 'thing')) {
        const kind = n.role === 'choice' && t === n.tokens.find(t => t.kind === 'thing') ? 'choice' : s.name === 'ingredients' ? 'ingredient' : 'equipment';
        t.thingKind = kind;
        if (kind === 'choice') t.choiceKind = s.name === 'ingredients' ? 'ingredient' : 'equipment';
        const list = declarations.get(key(t.name!)) ?? []; list.push({ token: t, node: n, kind }); declarations.set(key(t.name!), list);
      }
    });
  }
  const results = new Set<string>();
  for (const s of recipe.sections) visit(s.children, n => {
    // Mask reference names and process names; recognize quantities without
    // evaluating units, fractions, ranges or source equivalences.
    const start = n.tokens[0]?.span.start ?? n.span.start;
    let quantityText = n.tokens.map(t => {
      if (['thing', 'result', 'image', 'judgement'].includes(t.kind)) return ' '.repeat(t.raw.length);
      if (t.kind === 'process') {
        const comma = t.raw.indexOf(',');
        let masked = comma < 0 ? ' '.repeat(t.raw.length) : ' '.repeat(comma + 1) + t.raw.slice(comma + 1);
        for (const child of (t.parameterParts ?? []).flatMap(p => p.tokens).filter(t => t.kind === 'thing')) {
          const at = child.span.start - t.span.start;
          masked = masked.slice(0, at) + ' '.repeat(child.raw.length) + masked.slice(at + child.raw.length);
        }
        return masked;
      }
      return t.raw;
    }).join('');
    n.quantities = [...quantityText.matchAll(/(?<![\w.!~])(!|~~|~)?(\d+(?:\.\d+)?(?:\/\d+)?(?:[ -]\d+(?:\.\d+)?(?:\/\d+)?)?(?:\s*(?:[a-zA-Z°%]+))?)/g)].map(m => ({
      raw: m[0], value: m[2], precision: m[1] === '!' ? 'high' : m[1] === '~~' ? 'very-approximate' : m[1] === '~' ? 'approximate' : 'unspecified',
      span: { start: start + m.index!, end: start + m.index! + m[0].length, line: n.tokens[0]?.span.line ?? n.span.line, column: (n.tokens[0]?.span.column ?? 1) + m.index! }
    }));
    for (const t of semanticTokens(n.tokens)) {
      if (t.kind === 'thing' && s.name === 'instructions') {
        let matches = declarations.get(key(t.name!)) ?? [];
        if (!matches.length && options.vocabulary) {
          matches = [...declarations.values()].flat().filter(d => {
            if (d.kind === 'choice') return false;
            const ref = options.vocabulary!.resolve(t.name!, d.kind);
            const declared = options.vocabulary!.resolve(d.token.name!, d.kind);
            return ref.length === 1 && declared.length === 1 && ref[0].id === declared[0].id;
          });
        }
        // Explicit structure can derive a deeper part from its declared base,
        // but cannot select an incompatible variant or sibling part.
        if (t.variant || t.parts?.length) matches = matches.filter(d =>
          (!t.variant || !d.token.variant || key(t.variant) === key(d.token.variant)) &&
          (d.token.parts ?? []).every((p, i) => key(p) === key(t.parts?.[i] ?? '')));
        const exact = matches.filter(d => key(d.token.variant ?? '') === key(t.variant ?? '') &&
          JSON.stringify(d.token.parts ?? []) === JSON.stringify(t.parts ?? []));
        if (exact.length) matches = exact;
        const qualified = matches.filter(d => (t.qualifiers ?? []).every(q => d.token.qualifiers?.some(v => key(v) === key(q))));
        if (qualified.length) matches = qualified; // parts may reference the base declaration
        t.declarationIds = [...new Set(matches.map(d => d.node.id))];
        t.thingKind = !matches.length ? 'unresolved' : matches.length > 1 ? 'ambiguous' : matches[0].kind;
        if (t.thingKind === 'choice') t.choiceKind = matches[0].token.choiceKind;
        if (!matches.length || matches.length > 1) report('warning', matches.length ? 'AMBIGUOUS_REFERENCE' : 'UNRESOLVED_REFERENCE', `${t.raw}: ${matches.length ? 'multiple declarations match' : 'no local declaration'}; wording retained.`, t.span);
      }
      if (t.kind === 'result') {
        const sig = n.tokens.filter(t => t.raw.trim());
        const explicit = sig[0] === t && sig[1]?.raw === '=';
        t.implicit = !results.has(key(t.name!)) && !explicit;
        results.add(key(t.name!));
      }
      const kind = t.kind === 'process' ? 'process' : t.thingKind === 'equipment' ? 'equipment' : t.thingKind === 'ingredient' ? 'ingredient' : undefined;
      if (kind && options.vocabulary) {
        const matches = options.vocabulary.resolve(t.name!, kind);
        if (matches.length === 1) {
          t.canonicalId = matches[0].id;
          if (matches[0].reference === false) t.reference = false;
          if (kind === 'ingredient' && t.parts?.length) {
            const resolved = options.vocabulary.resolvePartPath(t.canonicalId, t.parts);
            t.partResolution = { ids: resolved.ids, complete: resolved.complete };
          }
        }
        if (matches.length > 1) report('warning', 'AMBIGUOUS_VOCABULARY', `Multiple vocabulary entries match '${t.name}'.`, t.span);
      }
    }
    const sig = n.tokens.filter(t => t.raw.trim());
    const equals = sig.findIndex(t => t.raw === '=');
    if (equals >= 0 && (equals !== 1 || !['thing', 'result'].includes(sig[0].kind) || sig.filter(t => t.raw === '=').length > 1))
      report('error', 'INVALID_ASSIGNMENT', 'Assignment requires one left-hand name and one equals sign.', n.span);
    if (sig.at(-1)?.raw === '=' && !n.children.some(c => c.kind === 'statement' || c.kind === 'group')) report('error', 'MISSING_ASSIGNMENT_VALUE', 'Assignment has no value or indented body.', n.span);
  });
  if (!recipe.sections.some(s => s.name === 'recipe' && s.children.some(n => n.kind === 'metadata' && n.key === 'name' && n.value)))
    report('warning', 'MISSING_NAME', 'Recipe has no name metadata.', { start: 0, end: 0, line: 1, column: 1 });
  const fields = recipe.sections.filter(s => s.name === 'recipe').flatMap(s => s.children)
    .filter(n => n.kind === 'metadata' && (n.key === 'curation' || n.key.startsWith('curation ')));
  if (fields.length) {
    const values: Record<string, string> = {};
    for (const field of fields) if (field.kind === 'metadata') {
      const key = field.key.slice('curation '.length);
      if (Object.hasOwn(values, key)) report('warning', 'INVALID_CURATION', `Duplicate curation ${key}.`, field.span);
      values[key] = field.value;
    }
    const result = readCuration(values);
    for (const message of result.warnings) report('warning', 'INVALID_CURATION', message, fields[0].span);
    if (!recipe.diagnostics.some(d => d.code === 'INVALID_CURATION')) recipe.curation = result.curation;
  }
  return recipe;
}
