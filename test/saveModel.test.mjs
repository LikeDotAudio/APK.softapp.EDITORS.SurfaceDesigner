// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
// ROAD-3583: standalone, Save & Return is Save Model — the surface block .json AND its .ifc twin
// (js/surfaceIfc.js), through the vendored apk-softapp saveModel, the .ifc first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SurfaceModel } from '../js/surfaceModel.js';
import { blockMeta } from '../js/surfaceHost.js';
import { surfaceToIfc } from '../js/surfaceIfc.js';

const require = createRequire(import.meta.url);
const { world } = require('./host-world.cjs');

test('Save Model writes <name>.ifc then <name>.json; the .ifc is the station\'s twin', async () => {
  const w = world({ framed: false });
  const model = new SurfaceModel({ id: 'surf_lobby_1', name: 'Lobby Station', formFactor: 'GANG_2' });
  const meta = blockMeta(model);
  let ifc = '';
  const r = await w.S.saveModel(model.toJSON(), { name: meta.filename, toIfc: () => (ifc = surfaceToIfc(model)) });
  assert.equal(r.ok, true);
  assert.deepEqual(w.downloads.map((d) => d.name), ['lobby_station.ifc', 'lobby_station.json']);
  assert.match(ifc, /^ISO-10303-21;/);
  assert.equal(ifc, surfaceToIfc(model), 'the same station, the same bytes');
  assert.equal(JSON.parse(w.downloads.blob.text).id, 'surf_lobby_1', 'the last file written is the block .json');
});
