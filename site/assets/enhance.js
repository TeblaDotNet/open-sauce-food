/* SPDX-License-Identifier: GPL-2.0-or-later */
const colour = document.querySelector('#syntax-colour');
if (colour) {
  colour.addEventListener('change', () => { document.body.dataset.colour = colour.checked ? 'on' : 'off'; });
}
const panels = [...document.querySelectorAll('[data-view-panel]')];
for (const radio of document.querySelectorAll('input[name="view"]')) {
  radio.addEventListener('change', () => {
    for (const panel of panels) panel.hidden = panel.dataset.viewPanel !== radio.value;
    for (const input of document.querySelectorAll('[data-section-toggle]')) input.disabled = radio.value === 'originalSource';
    document.querySelector('#view-status').textContent = `${radio.dataset.label} view selected.`;
  });
}
for (const input of document.querySelectorAll('[data-section-toggle]')) {
  input.addEventListener('change', () => {
    for (const section of document.querySelectorAll(`[data-section="${input.dataset.sectionToggle}"]`)) section.hidden = !input.checked;
  });
}
for (const control of document.querySelectorAll('[data-enhancement]')) control.hidden = false;
