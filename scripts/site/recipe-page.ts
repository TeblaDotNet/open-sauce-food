import type { Recipe } from '../../src/model/index.ts';
import type { RecipeView } from '../../src/renderer/html.ts';
import { escapeHtml as e, safeUrl } from '../../src/renderer/html.ts';
import { curationLabel } from '../../src/curation.ts';
import { dietaryDisclaimer } from '../../src/classification.ts';
import type { RecipeRecord } from './corpus.ts';
import { appearanceControls } from './shell.ts';

/** Project existing metadata into page roles without mutating the recipe or its raw view. */
export function recipePageBody(recipe: Recipe, record: Pick<RecipeRecord, 'name' | 'provenance' | 'githubUrl' | 'curation'>, views: RecipeView[], labels: Record<RecipeView, string>, notice: string, render: (view: RecipeView) => string, development = ''): string {
  const primaryKeys = ['category', 'serves', 'tags', 'dietary', 'dietary options', 'cuisine', 'region'];
  const metadata = recipe.sections.filter(s => s.name === 'recipe').flatMap(s => s.children)
    .filter(n => n.kind === 'metadata' && primaryKeys.includes(n.key) && n.value.trim());
  const primary = primaryKeys.flatMap(key => metadata.filter(n => n.kind === 'metadata' && n.key === key))
    .map(n => n.kind === 'metadata' ? `<div><dt>${e(n.key)}</dt><dd>${e(n.value)}</dd></div>` : '').join('');
  const dietary = metadata.some(n => n.kind === 'metadata' && ['dietary', 'dietary options'].includes(n.key));
  const provenance = Object.entries(record.provenance).filter(([, value]) => value.trim()).map(([key, value]) => `<dt>${e(key === 'source license' ? 'source licence' : key)}</dt><dd>${key === 'source' && safeUrl(value) ? `<a href="${e(value)}">${e(value)}</a>` : e(value)}</dd>`).join('');
  const controls = `<fieldset class="controls view-controls" data-enhancement hidden><legend class="sr-only">Recipe representation</legend>${views.map(view => `<label><input type="radio" name="view" value="${view}" aria-controls="view-${view}" data-label="${labels[view]}"${view === 'code' ? ' checked' : ''}><span>${labels[view]}</span></label>`).join('')}</fieldset><p id="view-status" class="sr-only" role="status" aria-live="polite"></p>`;
  const visibility = ['story', 'notes'].filter(name => recipe.sections.some(s => s.name === name)).map(name => `<label><input type="checkbox" data-section-toggle="${name}" checked> ${name === 'story' ? 'Story' : 'Notes'}</label>`).join('');
  return `<div class="recipe-layout"><div class="recipe-main"><header class="recipe-header"><h1>${e(record.name)}</h1>${primary ? `<dl class="recipe-primary">${primary}</dl>` : ''}${dietary ? `<p class="os-dietary-notice">${e(dietaryDisclaimer)}</p>` : ''}${notice}${controls}</header><noscript><p>Sauce Code is shown below. Display controls are available when JavaScript is enabled.</p></noscript>${views.map(view => `<div id="view-${view}" class="view-panel" data-view-panel="${view}"${view === 'code' ? '' : ' hidden'}><h2 class="sr-only" id="${view}-title">${labels[view]}</h2>${render(view)}</div>`).join('')}</div><aside class="recipe-sidebar" aria-label="Recipe information"><div class="provenance"><h2>Source &amp; provenance</h2>${provenance ? `<dl class="os-metadata">${provenance}</dl>` : ''}<p><a id="github-source" href="${e(record.githubUrl)}">View .opensauce on GitHub</a></p><p>Encoding curation: ${record.curation ? e(curationLabel(record.curation)) : 'not recorded (legacy / unknown)'}</p></div><section class="recipe-appearance" data-enhancement hidden><h2>Appearance</h2>${appearanceControls}<div class="section-controls">${visibility}</div></section>${development}</aside></div>`;
}
