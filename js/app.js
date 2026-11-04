// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import { SurfaceModel, FORM_FACTORS, CONTROL_TYPES } from './surfaceModel.js';
import { renderSurfaceFaceplateSvg } from './surfaceSvg.js';
import { connectSurfaceHost, blockMeta } from './surfaceHost.js';
import { showDiscovered, loadDiscoveredConfig } from './discoveredPanel.js';

const S = window.APKSoftapp;
const esc = S ? S.esc : (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { model: new SurfaceModel() };
let model = state.model;

const host = S ? connectSurfaceHost(S, state, {
  onLoaded: (m, meta) => {
    model = m;
    const tag = document.getElementById('block-tag');
    if (tag && (meta.title || meta.blockName)) tag.textContent = meta.title || meta.blockName;
    renderAll();
  },
}) : null;

/** Replace the model from a local file (not from the CAD). */
function loadLocal(next) {
  model = state.model = next;
  changed();
  renderAll();
}

function changed() {
  if (host) host.changed(model.toJSON());
}

function renderPalette() {
  const container = document.getElementById('palette-controls');
  if (!container) return;

  container.innerHTML = Object.entries(CONTROL_TYPES).map(([key, def]) => `
    <button class="btn btn-secondary btn-control-add" data-control-kind="${esc(key)}" style="justify-content: flex-start; text-align: left; padding: 7px 10px;">
      <span style="font-size: 15px; margin-right: 6px;">${def.icon}</span>
      <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <div style="font-weight: 600; font-size: 11px;">${esc(def.label)}</div>
        <div style="font-size: 9px; opacity: 0.7; font-family: var(--font-mono);">${def.widthCols}x${def.heightRows} grid</div>
      </div>
    </button>
  `).join('');

  container.querySelectorAll('.btn-control-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-control-kind');
      const newEl = model.addElement(kind);
      model.selectedElementId = newEl.id;
      changed();
      renderAll();
    });
  });
}

function renderInspector() {
  const container = document.getElementById('inspector-content');
  if (!container) return;

  if (model.selectedElementId) {
    const el = model.elements.find((e) => e.id === model.selectedElementId);
    if (!el) {
      model.selectedElementId = null;
      renderInspector();
      return;
    }
    const def = CONTROL_TYPES[el.kind] || CONTROL_TYPES.BUTTON;

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid var(--osc-border-default); padding-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">${def.icon}</span>
          <span style="font-weight: 700; color: var(--osc-text-primary); font-size: 13px;">${esc(el.label)}</span>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-delete-element" style="color: var(--osc-status-danger);">🗑️ Delete</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div>
          <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">CONTROL LABEL / CAPTION</label>
          <input type="text" class="input" id="inp-label" value="${esc(el.label)}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">COLUMN (0..${model.cols - 1})</label>
            <input type="number" min="0" max="${model.cols - 1}" class="input" id="inp-col" value="${el.col}">
          </div>
          <div>
            <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">ROW (0..${model.rows - 1})</label>
            <input type="number" min="0" max="${model.rows - 1}" class="input" id="inp-row" value="${el.row}">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">SPAN WIDTH</label>
            <input type="number" min="1" max="${model.cols}" class="input" id="inp-w" value="${el.w}">
          </div>
          <div>
            <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">SPAN HEIGHT</label>
            <input type="number" min="1" max="${model.rows}" class="input" id="inp-h" value="${el.h}">
          </div>
        </div>

        <div>
          <label style="display: block; font-size: 10px; color: var(--osc-text-muted); margin-bottom: 3px;">LED / ACCENT COLOR</label>
          <input type="color" class="input" id="inp-color" value="${esc(el.color || '#4A9EFF')}" style="height: 36px; padding: 2px;">
        </div>
      </div>
    `;

    document.getElementById('btn-delete-element')?.addEventListener('click', () => {
      model.deleteElement(el.id);
      changed();
      renderAll();
    });

    const bindField = (id, prop, isNum = false) => {
      document.getElementById(id)?.addEventListener('input', (e) => {
        const val = isNum ? parseInt(e.target.value, 10) || 0 : e.target.value;
        model.updateElement(el.id, { [prop]: val });
        changed();
        renderSvg();
      });
    };

    bindField('inp-label', 'label');
    bindField('inp-col', 'col', true);
    bindField('inp-row', 'row', true);
    bindField('inp-w', 'w', true);
    bindField('inp-h', 'h', true);
    bindField('inp-color', 'color');

  } else {
    container.innerHTML = `
      <div style="padding: 20px 10px; text-align: center; color: var(--osc-text-muted);">
        <div style="font-size: 28px; margin-bottom: 8px; opacity: 0.5;">🎛️</div>
        <div>Select a control element on the faceplate surface to inspect and position it.</div>
      </div>
    `;
  }
}

function renderSvg() {
  const container = document.getElementById('canvas-wrapper');
  if (!container) return;

  container.innerHTML = renderSurfaceFaceplateSvg(model, {
    selectedElementId: model.selectedElementId,
  });

  const svg = container.querySelector('#surface-canvas-svg');
  if (!svg) return;

  svg.querySelectorAll('.surface-element').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.getAttribute('data-element-id');
      model.selectedElementId = id;
      renderAll();
    });
  });

  svg.addEventListener('click', () => {
    model.selectedElementId = null;
    renderAll();
  });
}

function renderAll() {
  renderSvg();
  renderPalette();
  renderInspector();
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();

  // Form factor selector
  const selFF = document.getElementById('sel-form-factor');
  if (selFF) {
    selFF.innerHTML = Object.entries(FORM_FACTORS).map(([key, def]) => `
      <option value="${esc(key)}" ${model.formFactor === key ? 'selected' : ''}>${esc(def.label)}</option>
    `).join('');

    selFF.addEventListener('change', (e) => {
      model.setFormFactor(e.target.value);
      changed();
      renderAll();
    });
  }

  document.getElementById('btn-open-block')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          loadLocal(new SurfaceModel(parsed));
        } catch (err) {
          alert('Failed to parse surface file: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  document.getElementById('btn-discovered')?.addEventListener('click', async () => {
    const panel = document.getElementById('discovered-panel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (panel.hidden || panel.dataset.started) return;
    panel.dataset.started = '1';
    const cfg = await loadDiscoveredConfig();
    await showDiscovered(document.getElementById('discovered-table'), {
      S, T: window.APKTable,
      statusEl: document.getElementById('discovered-status'),
      kinds: Array.isArray(cfg.kinds) ? cfg.kinds : [],
      tableId: 'surface-discovered',
      pickLabel: 'Bind',
      onPick: (thing) => {
        if (model.bindDevice(thing)) { changed(); renderAll(); }
      },
    });
  });

  document.getElementById('btn-save-block')?.addEventListener('click', () => {
    const how = host ? host.save(model.toJSON(), blockMeta(model)) : '';
    const tag = document.getElementById('block-tag');
    if (tag && how) tag.textContent = how === 'host' ? 'SAVED TO THE CAD' : 'DOWNLOADED .JSON';
  });

  document.getElementById('btn-close')?.addEventListener('click', () => {
    if (host) host.close();
  });
});
