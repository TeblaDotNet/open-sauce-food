import { parseRecipe, renderHtml, renderReferenceHtml, recipeReferenceUrl, recipePath, Vocabulary } from '/dist/index.js';

const select = document.querySelector('#recipe-select');
const controls = document.querySelector('#controls');
const output = document.querySelector('#recipe-output');
const status = document.querySelector('#status');
const codeLink = document.querySelector('#code-link');
const backLink = document.querySelector('#back-link');
const colour = document.querySelector('#syntax-colour');
const view = () => document.querySelector('input[name="view"]:checked').value;
let recipes = [], vocabulary, current, reference, selectedId = 'butter-cake', requestId = 0;
const cache = new Map();

async function fetchOk(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`);
  return response;
}
function returnPath() { return recipePath(selectedId) + `&view=${view()}`; }
function render() {
  colour.disabled = !reference && view() !== 'code';
  document.body.dataset.colour = colour.checked ? 'on' : 'off';
  if (reference) output.innerHTML = renderReferenceHtml(reference, { colour: colour.checked });
  else if (current) {
    for (const id of ['images', 'comments', 'story', 'notes']) document.querySelector('#' + id).disabled = view() === 'originalSource';
    output.innerHTML = renderHtml(current, {
      vocabulary, view: view(), syntaxSpans: true,
      ...Object.fromEntries(['images', 'comments', 'story', 'notes'].map(id => [id, document.querySelector('#' + id).checked])),
      idPrefix: 'reader', assetBaseUrl: `/examples/public-domain-recipes/${selectedId}/`,
      referenceUrl: target => {
        const url = new URL(recipeReferenceUrl(target), location.origin);
        url.searchParams.set('recipe', selectedId); url.searchParams.set('view', view());
        return url.pathname + url.search + url.hash;
      }
    });
  }

  output.setAttribute('aria-busy', 'false');
}
function focusDestination() {
  const anchor = location.hash.slice(1);
  const destination = (anchor && document.getElementById(anchor)) || output;
  destination.focus({ preventScroll: true });
  if (anchor) destination.scrollIntoView({ block: 'start' });
}
async function route(focus = false) {
  const ticket = ++requestId;
  const url = new URL(location.href);
  const isReference = url.pathname.startsWith('/reference/');
  document.querySelectorAll('[data-nav]').forEach(link => {
    const active = link.dataset.nav === (isReference ? url.pathname.split('/')[2] : 'recipes');
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  current = undefined; reference = undefined;
  controls.disabled = true; codeLink.hidden = true;
  document.querySelector('#recipe-controls').hidden = isReference;
  backLink.hidden = !isReference;
  output.setAttribute('aria-busy', 'true'); output.textContent = 'Loading…'; status.textContent = 'Loading…';
  const requestedId = url.searchParams.get('recipe');
  if (requestedId && recipes.some(r => r.id === requestedId)) selectedId = requestedId;
  const requestedView = url.searchParams.get('view');
  const nextView = ['code', 'compact', 'originalSource'].includes(requestedView) ? requestedView : 'code';
  document.querySelector(`input[value="${nextView}"]`).checked = true;
  backLink.href = returnPath();
  try {
    if (isReference) {
      const page = await (await fetchOk('/api' + url.pathname)).json();
      if (ticket !== requestId) return;
      reference = page;
      document.title = `${page.name} · ${page.kind} · Open Sauce Food`;
      status.textContent = 'Reference ready. Usage reflects the corpus at server startup.';
    } else {
      if (requestedId && !recipes.some(r => r.id === requestedId)) throw new Error('Unknown recipe. Choose a recipe from the list.');
      const item = recipes.find(r => r.id === selectedId);
      let recipe = cache.get(item.id);
      if (!recipe) {
        recipe = parseRecipe(await (await fetchOk(item.path)).text(), { filename: item.path, vocabulary });
        cache.set(item.id, recipe);
      }
      if (ticket !== requestId) return;
      current = recipe; select.value = item.id;
      const originalSourceView = document.querySelector('input[value="originalSource"]');
      originalSourceView.disabled = !current.sections.some(s => s.originalSource?.text.length);
      if (originalSourceView.disabled && originalSourceView.checked) document.querySelector('input[value="code"]').checked = true;
      if (requestedView && requestedView !== view()) history.replaceState(null, '', returnPath());
      document.querySelector('#recipe-note').textContent = item.note ?? 'Promoted public-domain recipe';
      codeLink.href = item.path; codeLink.hidden = false; controls.disabled = false;
      document.title = `${item.name} · Open Sauce Food`;
      status.textContent = current.diagnostics.some(d => d.severity === 'error') ? 'Recipe has syntax errors.' : 'Recipe ready. Select a linked ingredient or process to explore its reference.';
    }
    render();
    if (focus || location.hash) focusDestination();
  } catch (error) {
    if (ticket !== requestId) return;
    output.textContent = 'This page could not be loaded. Use the navigation above to choose another page.';
    output.setAttribute('aria-busy', 'false'); status.textContent = error.message;
  }
}
async function navigate(url) {
  history.pushState(null, '', url); await route(true);
  if (!location.hash) window.scrollTo(0, 0);
}
document.addEventListener('click', event => {
  const anchor = event.target.closest('a');
  if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target || anchor.hasAttribute('download')) return;
  const url = new URL(anchor.href);
  if (url.origin !== location.origin || !(url.pathname === '/' || url.pathname.startsWith('/reference/'))) return;
  // Same-page part anchors use the browser's native fragment navigation.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
  if (url.hash === '#about') return;
  if (url.pathname.startsWith('/reference/') && !url.searchParams.has('recipe')) {
    url.searchParams.set('recipe', selectedId); url.searchParams.set('view', view());
  }
  event.preventDefault(); navigate(url);
});
window.addEventListener('popstate', () => route(true));
select.addEventListener('change', () => navigate(recipePath(select.value) + `&view=${view()}`));
controls.addEventListener('change', () => {
  history.replaceState(null, '', returnPath()); render(); status.textContent = 'Display updated.';
});
colour.addEventListener('change', () => { render(); status.textContent = `Syntax colour ${colour.checked ? 'on' : 'off'}.`; });
try {
  const responses = await Promise.all(['/api/corpus', '/api/recipes', '/api/vocabulary'].map(fetchOk));
  recipes = await responses[0].json();
  const featured = await responses[1].json(); vocabulary = new Vocabulary(await responses[2].json());
  const rank = id => { const i = featured.findIndex(r => r.id === id); return i < 0 ? Infinity : i; };
  recipes.sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
  for (const r of recipes) r.note = featured.find(f => f.id === r.id)?.note;
  select.replaceChildren(...recipes.map(r => new Option(r.name, r.id))); select.disabled = false;
  await route();
} catch (error) {
  output.textContent = 'Unable to start. Check the local demo server, then reload.';
  output.setAttribute('aria-busy', 'false'); status.textContent = error.message;
}
