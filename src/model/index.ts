/** Offsets are UTF-16, end exclusive; line/column are one-based. */
export interface Span { start: number; end: number; line: number; column: number }
export interface Diagnostic { severity: 'error' | 'warning'; code: string; message: string; span: Span }
export type ThingKind = 'ingredient' | 'equipment' | 'choice' | 'unresolved' | 'ambiguous';
export type Precision = 'unspecified' | 'high' | 'approximate' | 'very-approximate';
/** Unevaluated numeric quantity expression, never a computed measurement. */
export interface Quantity { raw: string; value: string; precision: Precision; span: Span }
export interface Token {
  kind: 'thing' | 'result' | 'process' | 'operator' | 'text' | 'image' | 'judgement';
  raw: string;
  span: Span;
  name?: string;
  variant?: string;
  parts?: string[];
  qualifiers?: string[];
  parameters?: string[];
  /** Additive process context: exact parameter slices, present only with structured things.
   * Children are thing, text or + operator tokens; offsets are absolute source offsets. */
  parameterParts?: { raw: string; span: Span; tokens: Token[] }[];
  /** Literal qualitative body and source span of its preceding process. */
  judgement?: { text: string; processSpan?: Span };
  /** Resolved vocabulary entry opts out of public reference pages. */
  reference?: boolean;
  thingKind?: ThingKind;
  /** Member category of a named local choice; never a canonical placeholder. */
  choiceKind?: 'ingredient' | 'equipment';
  declarationIds?: string[];
  canonicalId?: string;
  /** Optional resolved explicit or lexical part path; authored `parts` stays unchanged. */
  partResolution?: { ids: string[]; complete: boolean };
  implicit?: boolean;
  alt?: string;
  path?: string;
}
/** Ordered tokens deliberately retain free text instead of imposing a culinary grammar. */
export interface Statement {
  kind: 'statement'; id: string; span: Span; indent: number;
  tokens: Token[]; children: Node[]; comment?: string;
  inheritedSubjectId?: string;
  role?: 'declaration' | 'choice' | 'assignment' | 'instruction' | 'alternative' | 'condition';
  quantities?: Quantity[];
}
export interface Group {
  kind: 'group'; id: string; span: Span; indent: number;
  relationship: 'group' | 'Meanwhile' | 'Repeat' | 'Optional';
  children: Node[]; comment?: string; closingComment?: string;
  condition?: Statement;
}
export interface Metadata { kind: 'metadata'; id: string; span: Span; indent: number; key: string; value: string; comment?: string }
export interface Prose { kind: 'prose' | 'comment' | 'blank'; id: string; span: Span; indent: number; text: string; comment?: string }
export type Node = Statement | Group | Metadata | Prose;
/** Opaque upstream provenance, never interpreted as Open Sauce Food Code. */
export interface OriginalSourcePayload { text: string; span: Span; closed: boolean }
export interface Section { name: string; span: Span; comment?: string; children: Node[]; originalSource?: OriginalSourcePayload }
export interface Recipe {
  curation?: import('../curation.ts').Curation;
  /** Exact authored .opensauce Code, including any literal provenance section. */
  source: string;
  modelVersion: 1; filename?: string;
  preamble: Node[]; sections: Section[]; diagnostics: Diagnostic[];
}

/** Semantic traversal including process context; never use to reconstruct source text. */
export function semanticTokens(tokens: readonly Token[]): Token[] {
  return tokens.flatMap(t => [t, ...(t.parameterParts ?? []).flatMap(p => p.tokens)]);
}
