import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse } from 'yaml';
import { Vocabulary } from './index.ts';
import type { VocabularyEntry } from './index.ts';

/** Node-only adapter; observed forms/qualifiers are evidence, never aliases. */
export async function loadVocabulary(root: string): Promise<Vocabulary> {
  const entries: VocabularyEntry[] = [];
  for (const [folder, kind] of [['ingredients', 'ingredient'], ['equipment', 'equipment'], ['processes', 'process']] as const) {
    const index = parse(await readFile(join(root, folder, 'index.yaml'), 'utf8'));
    // Canonical indexes exclude stale pre-merge files left by an in-place extraction.
    const files: string[] = index.schema_version === '0.3'
      ? index.entries.map((entry: { file: string }) => entry.file)
      : await readdir(join(root, folder));
    for (const file of files.sort()) {
      if (typeof file !== 'string' || /[/\\]/.test(file) || file === '..') throw new Error(`Invalid vocabulary filename in ${folder}/index.yaml`);
      if (!file.endsWith('.yaml') || file === 'index.yaml') continue;
      const data = parse(await readFile(join(root, folder, file), 'utf8'));
      if (!data || typeof data.id !== 'string' || data.kind !== kind || !data.names ||
          Object.values(data.names).some(n => typeof n !== 'string') ||
          (data.aliases !== undefined && (!Array.isArray(data.aliases) || data.aliases.some((a: unknown) =>
            typeof a !== 'string' && (!a || typeof a !== 'object' || !('name' in a) || typeof a.name !== 'string')))))
        throw new Error(`Unsupported vocabulary entry: ${folder}/${file}`);
      const entry: VocabularyEntry = { id: data.id, kind, canonical_name: data.canonical_name, names: data.names, aliases: data.aliases };
      for (const field of ['type_of', 'plural_names', 'variants', 'parts', 'part_groups', 'typical_mass', 'reference_density', 'nutrition',
        'reference', 'curation', 'status', 'evidence', 'observed_parameters', 'observed_qualifiers'] as const)
        if (data[field] !== undefined) Object.assign(entry, { [field]: data[field] });
      entries.push(entry);
    }
  }
  return new Vocabulary(entries);
}
