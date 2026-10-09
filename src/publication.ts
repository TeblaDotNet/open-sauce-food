/** Conversion maturity is independent of human review and corpus membership. */
export const conversionStages = ['initial', 'reworked', 'blocked'] as const;
export type ConversionStage = typeof conversionStages[number];
export function isConversionStage(value: unknown): value is ConversionStage {
  return conversionStages.some(stage => stage === value);
}
/** Missing or invalid metadata is never an implicit publication qualification. */
export function isPublished(recipe: { conversionStage?: ConversionStage }): boolean {
  return recipe.conversionStage === 'reworked';
}
