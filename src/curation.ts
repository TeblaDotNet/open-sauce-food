/** Artifact creation and deliberate human review are independent. */
export const curationOrigins = ['generated', 'human', 'imported', 'mixed'] as const;
export const curationReviews = ['unchecked', 'checked'] as const;
export interface Curation {
  origin: typeof curationOrigins[number];
  review: typeof curationReviews[number];
}
/** Missing is legacy/unknown; malformed data is retained by its caller. */
export function readCuration(value: unknown): { curation?: Curation; warnings: string[] } {
  if (value === undefined) return { warnings: [] };
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return { warnings: ['Curation must be a mapping with origin and review.'] };
  const data = value as Record<string, unknown>;
  const warnings: string[] = [];
  if (!curationOrigins.some(v => v === data.origin)) warnings.push('Unknown or missing curation origin.');
  if (!curationReviews.some(v => v === data.review)) warnings.push('Unknown or missing curation review.');
  if (Object.keys(data).some(k => k !== 'origin' && k !== 'review')) warnings.push('Unknown curation field.');
  return warnings.length ? { warnings } : { curation: { origin: data.origin as Curation['origin'], review: data.review as Curation['review'] }, warnings };
}
export function curationLabel(curation: Curation): string {
  return `${curation.origin} · ${curation.review === 'checked' ? 'human checked' : 'unchecked'}`;
}
