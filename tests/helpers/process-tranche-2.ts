import {restoreCorpusRepairs} from './corpus-quality-unattended.ts';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const processTranche2 = JSON.parse(readFileSync('tests/fixtures/process-tranche-2.json','utf8')) as {
  baselineCommit: string; recipeHashes: Record<string,string>;
  migrations: Record<string,{line:number;beforeLine:string;afterLine:string;beforeSha256:string;afterSha256:string}>;
};
const sha = (s:string) => createHash('sha256').update(s).digest('hex');
/** Undo only the three approved action-head edits for historical fidelity checks. */
export function restoreProcessTranche2(source:string,pathOrSlug:string):string {
  source=restoreCorpusRepairs(source,pathOrSlug);
  const slug=pathOrSlug.replaceAll('\\','/').split('/').at(-1)!.replace(/\.opensauce$/,'');
  const record=processTranche2.migrations[slug];
  if (!record || !source.includes(record.afterLine)) return source;
  assert.equal(sha(source),record.afterSha256,slug+': unapproved Tranche 2 bytes');
  assert.equal(source.split(record.afterLine).length,2);
  const restored=source.replace(record.afterLine,record.beforeLine);
  assert.equal(sha(restored),record.beforeSha256,slug+': Tranche 2 baseline mismatch');
  return restored;
}
