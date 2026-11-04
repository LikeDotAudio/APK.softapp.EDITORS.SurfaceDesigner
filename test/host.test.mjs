// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// The surface block round trip over cad.like.audio/host@1 (ROAD-3491), with the
// app's vendored APKSoftapp client in a stub window; the rack ear slots in mm.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SurfaceModel } from '../js/surfaceModel.js';
import { renderSurfaceFaceplateSvg, rackEarSlots, RACK_EAR } from '../js/surfaceSvg.js';
import { connectSurfaceHost, EDITOR, BLOCK_TYPE } from '../js/surfaceHost.js';

const require = createRequire(import.meta.url);
const { world, hostContract } = require('./host-world.cjs');

test('load → edit → request: the CAD gets the edited block back, at our origin, on host@1', async () => {
  const w = world();
  const state = { model: new SurfaceModel() };
  const loaded = [];
  const host = connectSurfaceHost(w.S, state, { onLoaded: (m, meta) => loaded.push([m, meta]), notice: false });
  assert.ok(host.embedded);
  assert.deepEqual(w.toParent[0], { m: { protocol: 'cad.like.audio/host@1', type: 'editorReady', editor: EDITOR, blockType: BLOCK_TYPE }, o: w.ORIGIN });

  const block = new SurfaceModel({ name: 'Lectern', formFactor: 'GANG_1', elements: [{ id: 'ctrl_1', kind: 'BUTTON', label: 'GO', col: 0, row: 0, w: 1, h: 1, color: '#4A9EFF' }] }).toJSON();
  w.fire({ protocol: w.S.PROTOCOL, type: 'load', block, meta: { blockName: 'SURF_1' } });
  assert.equal(loaded.length, 1);
  assert.equal(state.model.name, 'Lectern');

  state.model.addElement('TALLY', 1, 1);
  state.model.bindDevice({ serial: 'XD-123', name: 'Lectern', ips: ['10.1.1.1'] });
  w.fire({ protocol: w.S.PROTOCOL, type: 'request' });
  const save = w.toParent.at(-1);
  assert.equal(save.o, w.ORIGIN, 'never "*"');
  assert.equal(save.m.type, 'blockSave');
  assert.equal(save.m.meta.blockName, 'SURF_1');
  assert.deepEqual(save.m.block.elements.map((e) => e.kind), ['BUTTON', 'TALLY']);
  assert.equal(save.m.block.deviceId, 'XD-123', 'bound by serial, not IP');
  assert.deepEqual(new SurfaceModel(save.m.block).toJSON(), save.m.block, 'the block survives a reload');

  const c = await hostContract();
  if (c) for (const { m } of w.toParent) assert.deepEqual(c.validateMessage(c.schema, 'toCad', m), [], m.type);
});

test('a message from another window is dropped', () => {
  const w = world();
  const state = { model: new SurfaceModel() };
  connectSurfaceHost(w.S, state, { notice: false });
  w.fire({ protocol: w.S.PROTOCOL, type: 'load', block: { name: 'EVIL' } }, { source: {} });
  assert.equal(state.model.name, 'Wall Station Controller');
});

test('standalone, save downloads one .json', () => {
  const w = world({ framed: false });
  const state = { model: new SurfaceModel() };
  const host = connectSurfaceHost(w.S, state, { notice: false });
  assert.equal(host.save(state.model.toJSON(), { filename: 'wall_station' }), 'download');
  assert.deepEqual(w.downloads.map((d) => d.name), ['wall_station.json']);
});

test('a 1U rack faceplate draws four horizontal 9.5 x 7 mm ear slots (EIA-310)', () => {
  const slots = rackEarSlots(1);
  assert.equal(slots.length, 4);
  for (const s of slots) { assert.equal(s.w, 9.5); assert.equal(s.h, 7); assert.ok(s.w > s.h, 'wide, never tall'); }
  assert.deepEqual([...new Set(slots.map((s) => s.x))], [RACK_EAR.SLOT_FROM_EDGE, RACK_EAR.PANEL_W - RACK_EAR.SLOT_FROM_EDGE]);
  const m = new SurfaceModel();
  m.setFormFactor('RACK_1U');
  const svg = renderSurfaceFaceplateSvg(m);
  assert.equal((svg.match(/class="rack-ear-slot"/g) || []).length, 4);
});

test('the SVG escapes labels', () => {
  const m = new SurfaceModel();
  m.elements[0].label = '<script>x</script>';
  const svg = renderSurfaceFaceplateSvg(m);
  assert.ok(!svg.includes('<script>'));
});
