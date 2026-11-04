// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import test from 'node:test';
import assert from 'node:assert/strict';
import { SurfaceModel, FORM_FACTORS } from '../js/surfaceModel.js';
import { renderSurfaceFaceplateSvg } from '../js/surfaceSvg.js';

test('SurfaceModel initializes with standard 2-Gang wall plate presets', () => {
  const model = new SurfaceModel();
  assert.equal(model.formFactor, 'GANG_2');
  assert.equal(model.cols, 4);
  assert.equal(model.rows, 4);
  assert.ok(model.elements.length >= 5);
});

test('SurfaceModel changes form factors and adjusts grid bounds', () => {
  const model = new SurfaceModel();
  const changed = model.setFormFactor('GANG_1');
  assert.equal(changed, true);
  assert.equal(model.cols, 2);
  assert.equal(model.rows, 4);
});

test('SurfaceModel adds, updates, and deletes control elements', () => {
  const model = new SurfaceModel();
  const initialCount = model.elements.length;

  const newEl = model.addElement('ENCODER', 0, 0);
  assert.equal(model.elements.length, initialCount + 1);
  assert.equal(newEl.kind, 'ENCODER');

  model.updateElement(newEl.id, { label: 'ZONE VOLUME' });
  const updated = model.elements.find((e) => e.id === newEl.id);
  assert.equal(updated.label, 'ZONE VOLUME');

  const deleted = model.deleteElement(newEl.id);
  assert.equal(deleted, true);
  assert.equal(model.elements.length, initialCount);
});

test('renderSurfaceFaceplateSvg generates complete SVG markup with faceplate and mounting screws', () => {
  const model = new SurfaceModel();
  const svg = renderSurfaceFaceplateSvg(model);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('surface-element'));
  assert.ok(svg.includes('PRESET 1'));
  assert.ok(svg.includes('Wall Plate Screws'));
});
