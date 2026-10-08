import type { Node, Recipe, Token } from '../model/index.ts';

// Deliberately small display rules, reviewed against Draft 7 observed qualifiers.
// These are English labels, not new parser relationships or vocabulary aliases.
export const partQualifiers: Record<string, readonly string[]> = {
  egg: ['yolk', 'white'], lemon: ['juice', 'zest', 'peel'], lime: ['juice', 'zest', 'peel'],
  orange: ['juice', 'zest', 'peel'], coriander: ['leaves', 'stems'], chicken: ['thigh', 'skin']
};
export const typeQualifiers: Record<string, readonly string[]> = {
  sugar: ['white', 'brown', 'light brown', 'caster', 'golden caster', 'demerara', 'granulated', 'icing', 'powdered'],
  flour: ['plain', 'all-purpose', 'all purpose', 'bread', 'wheat', 'rye', 'self-raising'],
  onion: ['red', 'white', 'yellow'], butter: ['salted', 'unsalted'], chocolate: ['dark', 'milk', 'white']
};
const preparation = /^(?:(?:finely|roughly|freshly|lightly) )?(?:chopped|minced|grated|sliced|diced|beaten|whisked|sifted|melted|peeled)$/;
const contextual = /^(?:for .+|small|medium|large|cold|warm|ice-cold|boiling)$/;
const key = (s: string) => s.toLowerCase();

export function naturalThingLabel(name: string, qualifiers: readonly string[]): string {
  const parts = qualifiers.filter(q => partQualifiers[key(name)]?.includes(key(q)));
  const types = qualifiers.filter(q => typeQualifiers[key(name)]?.includes(key(q)));
  const prep = qualifiers.filter(q => preparation.test(q));
  const rest = qualifiers.filter(q => !parts.includes(q) && !types.includes(q) && !prep.includes(q));
  const label = [...prep, ...types, name, ...parts].join(' ');
  return label + (rest.length ? ` (${rest.join('; ')})` : '');
}

export function thingLabeler(recipe: Recipe): (t: Token, instruction: boolean) => string {
  const declarations: { id: string; token: Token }[] = [];
  const visit = (nodes: Node[]): void => {
    for (const n of nodes) if (n.kind === 'statement' || n.kind === 'group') {
      if (n.kind === 'statement') for (const token of n.tokens.filter(t => t.kind === 'thing')) declarations.push({ id: n.id, token });
      visit(n.children);
    }
  };
  recipe.sections.filter(s => ['ingredients', 'equipment'].includes(s.name)).forEach(s => visit(s.children));
  return (t, instruction) => {
    const name = t.name ?? '';
    const qs = t.qualifiers ?? [];
    const label = (qualifiers: readonly string[]) => {
      if (!t.variant && !t.parts?.length) return naturalThingLabel(name, qualifiers);
      // Explicit syntax is language-neutral. This renderer supplies English order.
      const prep = qualifiers.filter(q => preparation.test(q));
      const rest = qualifiers.filter(q => !prep.includes(q));
      return [...prep, ...(t.variant ? [t.variant] : []), name, ...(t.parts ?? [])].join(' ') +
        (rest.length ? ` (${rest.join('; ')})` : '');
    };
    if (!instruction || t.kind !== 'thing' || t.thingKind === 'ambiguous' || !t.declarationIds?.length)
      return label(qs);
    const peers = declarations.filter(d => (key(d.token.name!) === key(name) ||
      (t.canonicalId && d.token.canonicalId === t.canonicalId)) &&
      (d.token.variant ?? '') === (t.variant ?? '') && JSON.stringify(d.token.parts ?? []) === JSON.stringify(t.parts ?? []));
    const targets = peers.filter(d => t.declarationIds!.includes(d.id) && qs.every(q => d.token.qualifiers?.includes(q)));
    if (targets.length !== 1) return label(qs);
    // Keep identity/part semantics and all unknown qualifiers. Only known repeated
    // context (roles, size, temperature, preparation) is eligible for abbreviation.
    const mandatory = qs.filter(q => !contextual.test(q) && !preparation.test(q));
    const candidates = qs.filter(q => !mandatory.includes(q));
    const unique = (selected: string[]) => peers.filter(d => selected.every(q => d.token.qualifiers?.includes(q))).length === 1;
    if (unique(mandatory)) return label(mandatory);
    // A bare reference may identify one declaration via aliases/parts. Never invent
    // a discriminator that was not present in the reference itself.
    if (candidates.length <= 12) {
      for (let size = 1; size <= candidates.length; size++) {
        const choose = (start: number, selected: string[]): string[] | undefined => {
          if (selected.length === size) return unique([...mandatory, ...selected]) ? selected : undefined;
          for (let i = start; i < candidates.length; i++) { const result = choose(i + 1, [...selected, candidates[i]]); if (result) return result; }
        };
        const selected = choose(0, []);
        if (selected) return label([...mandatory, ...selected]);
      }
    }
    return label(qs);
  };
}
