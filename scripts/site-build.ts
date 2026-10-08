import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cliConfig, generateSite, writeSite } from './site/build.ts';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const config = cliConfig();
const result = await generateSite(root, config);
const output = await writeSite(root, config, result.files);
console.log(JSON.stringify({ output, ...result.validation, recipes: result.manifest.recipes.length, tags: result.audit.distinctTags, tagCoverage: result.audit.recipesWithTags, categoryCoverage: result.audit.recipesWithCategory, references: result.manifest.references.length }, null, 2));
