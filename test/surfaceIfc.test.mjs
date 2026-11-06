// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FORM_FACTORS, SurfaceModel } from '../js/surfaceModel.js';
import { surfaceToIfc, layoutHash, stationEntities, StepWriter } from '../js/surfaceIfc.js';
import { parseStep, getPsets, schemaOf, ifcGuid } from '../vendor/apk-contracts/apk-ifc.js';
import { buildBundle, BUNDLE } from '../scripts/vendor-ifc.mjs';

// A wall station is a physical element on the wall; its layout stays APK-native (IFC-CORE-DELTAS instruments-7).
// The file this writes is held to IfcOpenShell (schema + EXPRESS rules, 0 statements) in DATABASE.server.BIM's
// lane; here the STEP is read back with the contracts codec.

const station = () => new SurfaceModel({ id: 'surf_lobby_1', name: 'Lobby Station', formFactor: 'GANG_2', deviceId: '00:1d:c1:12:34:56' });
const file = (s = station()) => surfaceToIfc(s, {
  room: { name: 'Lobby', heightMm: 2700 }, wall: { name: 'North wall', lengthMm: 4200, thicknessMm: 150 },
  at: { alongMm: 600, heightMm: 1200, depthMm: 8, weightKg: 0.25 },
});
const of = (f, type) => f.entities.filter((e) => e.type === type);

test('the vendored STEP codec is what contracts/src/ifc builds to today', async () => {
  const now = await buildBundle();
  if (now == null) return;
  assert.equal(readFileSync(BUNDLE, 'utf8'), now, 'run node scripts/vendor-ifc.mjs');
});

test('a GANG_2 station on a wall: an IfcUnitaryControlElement CONTROLPANEL, in the space, mounted on the wall', () => {
  const f = parseStep(file());
  assert.equal(schemaOf(f), 'IFC4X3_ADD2');
  const [st] = of(f, 'IFCUNITARYCONTROLELEMENT');
  const [ty] = of(f, 'IFCUNITARYCONTROLELEMENTTYPE');
  assert.equal(ty.args[9].value, 'CONTROLPANEL');
  assert.equal(st.args[0], ifcGuid('surface', 'surface', 'surf_lobby_1'));
  assert.equal(st.args[7], 'surf_lobby_1');
  const mounted = of(f, 'IFCRELCONNECTSELEMENTS');
  assert.equal(mounted.length, 1);
  assert.equal(f.byId.get(mounted[0].args[5].id).type, 'IFCWALL');
  assert.equal(mounted[0].args[6].id, st.id);
  const inSpace = of(f, 'IFCRELCONTAINEDINSPATIALSTRUCTURE').filter((r) => r.args[4].some((o) => o.id === st.id));
  assert.equal(inSpace.length, 1);
  assert.equal(f.byId.get(inSpace[0].args[5].id).type, 'IFCSPACE');
  const ps = getPsets(f, st);
  assert.deepEqual(ps.APK_SurfaceLayout, { SurfaceId: 'surf_lobby_1', FormFactor: 'GANG_2', LayoutHash: layoutHash(station()),
    DeviceId: '00:1d:c1:12:34:56', Columns: 4, Rows: 4, PlateColour: '#18181b' });
  assert.equal(ps.Qto_UnitaryControlElementBaseQuantities.GrossWeight, 0.25);
  const [box] = of(f, 'IFCBOUNDINGBOX');
  assert.deepEqual(box.args.slice(1).map((v) => v.value), [115, 8, 115]);   // mm, from FORM_FACTORS.GANG_2
  const [doc] = of(f, 'IFCDOCUMENTREFERENCE');
  assert.equal(doc.args[0], 'surf_lobby_1.surface.json');
  assert.equal(of(f, 'IFCRELASSOCIATESDOCUMENT')[0].args[4][0].id, st.id);
});

test('the layout hash follows the elements, not the selection or the order', () => {
  const a = station();
  const h = layoutHash(a);
  a.selectedElementId = 'ctrl_2';
  assert.equal(layoutHash(a), h);
  const b = station();
  b.elements = [...b.elements].reverse();
  assert.equal(layoutHash(b), h);
  b.updateElement('ctrl_2', { label: 'PRESET A' });
  assert.notEqual(layoutHash(b), h);
  assert.match(h, /^sha1:[0-9a-f]{40}$/);
});

test('the same station writes the same bytes; no address is in it', () => {
  assert.equal(file(), file());
  assert.doesNotMatch(file(), /\d{1,3}(\.\d{1,3}){3}/);
});

test('an unknown plate depth writes no body rather than inventing one', () => {
  const text = surfaceToIfc(station(), { at: { alongMm: 100, heightMm: 1200 } });
  assert.equal(of(parseStep(text), 'IFCBOUNDINGBOX').length, 0);
});

test('the station is typed by its BIM part (ROAD-3598 answer 7): GlobalId part/<id>, Tag the part id, APK_Part.PartId', () => {
  const f = parseStep(file());
  const [ty] = of(f, 'IFCUNITARYCONTROLELEMENTTYPE');
  const pid = FORM_FACTORS.GANG_2.part;
  assert.equal(pid, 'generic/wall-station-gang-2');
  assert.deepEqual([ty.args[0], ty.args[2], ty.args[7], ty.args[8]], [ifcGuid('part', pid), '2-Gang Wall Plate', pid, 'GANG_2']);
  const [set] = ty.args[5].map((r) => f.byId.get(r.id));
  assert.equal(set.args[2], 'APK_Part');
  assert.equal(f.byId.get(set.args[4][0].id).args[2].value, pid);
  // every form factor names a part
  for (const [k, ff] of Object.entries(FORM_FACTORS)) assert.match(ff.part ?? '', /^generic\/[a-z0-9-]+$/, k);
});

test('two stations of one form factor in one model share its one part type', () => {
  const W = new StepWriter();
  const ctx = { space: null, wall: W.add('IFCWALL', []), wallPlacement: null, key: 'room' };
  const a = stationEntities(W, new SurfaceModel({ id: 'a', formFactor: 'GANG_1' }), ctx);
  const b = stationEntities(W, new SurfaceModel({ id: 'b', formFactor: 'GANG_1' }), ctx);
  assert.notEqual(a.id, b.id);
  assert.equal(W.entities.filter((e) => e.type === 'IFCUNITARYCONTROLELEMENTTYPE').length, 1);
});
