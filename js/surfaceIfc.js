// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* A WALL STATION IS A PHYSICAL ELEMENT ON THE WALL; ITS LAYOUT STAYS APK-NATIVE (IFC-CORE-DELTAS instruments-7).

   The SurfaceModel (buttons, encoders, faders on a GANG_1..3 / TABLETOP_8 / RACK_1U plate) is the
   native, stored form. In an IFC4X3_ADD2 room it is:

     IfcUnitaryControlElementType  PredefinedType CONTROLPANEL (verified in IfcUnitaryControlElementTypeEnum),
                                   one per form factor, Name = the form factor's label
     IfcUnitaryControlElement      the station: typed by it, Tag = surface id, its placement on the wall
                                   (x along the wall, mounting height, mm), its Body an IfcBoundingBox of
                                   width_mm x depth x height_mm when the plate depth is known
       contained in the IfcSpace   (IfcRelContainedInSpatialStructure) — never in the wall
       IfcRelConnectsElements      RelatingElement = the IfcWall it is mounted on, RelatedElement = it
       APK_SurfaceLayout           {SurfaceId, FormFactor, LayoutHash, DeviceId, Columns, Rows, PlateColour}
       IfcDocumentReference        to the layout JSON (IfcRelAssociatesDocument): the layout itself never
                                   becomes IFC; the hash says which layout the station presents
       Qto_UnitaryControlElementBaseQuantities.GrossWeight  when the weight is known (kg)

   Touch-panel frames (EDITORS.TouchPanelBuilder) are software on a screen and never become IFC elements.
   `stationEntities()` is the hook a room export (the CAD's) calls with its own space and wall;
   `surfaceToIfc()` writes the station alone on one wall of one room, as a file. Every dimension mm, weight kg;
   identity is the MAC / serial in DeviceId, never an IP. GlobalIds are the contracts' uuid5 (ifcGuid). */

import { ifcGuid, sha1, writeStep, ref, enumv, real, typed } from '../vendor/apk-contracts/apk-ifc.js';
import { FORM_FACTORS } from './surfaceModel.js';

const KEYS = ['id', 'kind', 'label', 'col', 'row', 'w', 'h', 'color'];

/** The content hash of a surface's elements[] (sorted by id, fixed key order): which layout it presents. */
export function layoutHash(surface) {
  const els = [...(surface?.elements || [])]
    .map((e) => Object.fromEntries(KEYS.filter((k) => e[k] !== undefined).map((k) => [k, e[k]])))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const bytes = new TextEncoder().encode(JSON.stringify(els));
  return 'sha1:' + [...sha1(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const lbl = (v) => typed('IFCLABEL', v);
const ident = (v) => typed('IFCIDENTIFIER', v);
const int = (v) => typed('IFCINTEGER', v);

/** A small STEP builder: add() returns the instance reference. */
export class StepWriter {
  constructor() { this.entities = []; }
  add(type, args) {
    const id = this.entities.length + 1;
    this.entities.push({ id, type, args });
    return ref(id);
  }
  point(x, y, z) { return this.add('IFCCARTESIANPOINT', [[real(x), real(y), real(z)]]); }
  dir(x, y, z) { return this.add('IFCDIRECTION', [[real(x), real(y), real(z)]]); }
  placement(rel, [x, y, z], axis = null, refDir = null) {
    return this.add('IFCLOCALPLACEMENT', [rel, this.add('IFCAXIS2PLACEMENT3D', [this.point(x, y, z), axis, refDir])]);
  }
  pset(gid, name, objects, props) {
    const items = props.filter(([, v]) => v != null && v !== '' && v.value !== '' && v.value != null)
      .map(([n, v]) => this.add('IFCPROPERTYSINGLEVALUE', [n, null, v, null]));
    if (!items.length || !objects.length) return null;
    const set = this.add('IFCPROPERTYSET', [gid(name), null, name, null, items]);
    this.add('IFCRELDEFINESBYPROPERTIES', [gid(name, 'rel'), null, null, null, objects, set]);
    return set;
  }
  text(name) {
    return writeStep({
      header: [
        { type: 'FILE_DESCRIPTION', args: [['ViewDefinition [ReferenceView]'], '2;1'] },
        { type: 'FILE_NAME', args: [name, '1970-01-01T00:00:00', ['APK.audio'], ['APK.audio'], 'EDITORS.SurfaceDesigner', 'APK.audio surfaceIfc', ''] },
        { type: 'FILE_SCHEMA', args: [['IFC4X3_ADD2']] },
      ],
      entities: this.entities,
    });
  }
}

/** The station's entities in a model W already holds a space and a wall for.
    ctx = {space, wall, wallPlacement, body (the 'Body' subcontext), key (GlobalId namespace)}
    at  = {alongMm, heightMm, depthMm?, weightKg?, layoutUrl?}. Answers the station's reference. */
export function stationEntities(W, surface, ctx, at = {}) {
  const ff = FORM_FACTORS[surface.formFactor] || FORM_FACTORS.GANG_2;
  const key = ctx.key || 'surface';
  const g = (...roles) => ifcGuid(key, 'surface', surface.id, ...roles);
  const type = W.add('IFCUNITARYCONTROLELEMENTTYPE', [
    ifcGuid(key, 'surface-type', surface.formFactor), null, ff.label, null, null, null, null, surface.formFactor, null, enumv('CONTROLPANEL'),
  ]);
  // the plate sits on the wall's face: its x along the wall, its bottom at the mounting height (mm)
  const place = W.placement(ctx.wallPlacement, [Number(at.alongMm) || 0, 0, Number(at.heightMm) || 0]);
  let shape = null;
  const depth = Number(at.depthMm);
  if (depth > 0 && ctx.body) {
    const box = W.add('IFCBOUNDINGBOX', [W.point(0, -depth, 0), real(ff.width_mm), real(depth), real(ff.height_mm)]);
    const rep = W.add('IFCSHAPEREPRESENTATION', [ctx.body, 'Box', 'BoundingBox', [box]]);
    shape = W.add('IFCPRODUCTDEFINITIONSHAPE', [null, null, [rep]]);
  }
  const station = W.add('IFCUNITARYCONTROLELEMENT', [g(), null, surface.name || ff.label, null, null, place, shape, surface.id, null]);
  W.add('IFCRELDEFINESBYTYPE', [g('typed'), null, null, null, [station], type]);
  W.add('IFCRELCONNECTSELEMENTS', [g('mounted'), null, 'Mounted on', null, null, ctx.wall, station]);
  W.pset(g, 'APK_SurfaceLayout', [station], [
    ['SurfaceId', ident(surface.id)], ['FormFactor', lbl(surface.formFactor)], ['LayoutHash', ident(layoutHash(surface))],
    ['DeviceId', surface.deviceId ? ident(surface.deviceId) : null],
    ['Columns', int(surface.cols)], ['Rows', int(surface.rows)], ['PlateColour', surface.plateColor ? lbl(surface.plateColor) : null],
  ]);
  const weight = Number(at.weightKg);
  if (weight > 0) {
    const q = W.add('IFCQUANTITYWEIGHT', ['GrossWeight', null, null, real(weight), null]);
    const qto = W.add('IFCELEMENTQUANTITY', [g('qto'), null, 'Qto_UnitaryControlElementBaseQuantities', null, null, [q]]);
    W.add('IFCRELDEFINESBYPROPERTIES', [g('qto', 'rel'), null, null, null, [station], qto]);
  }
  const doc = W.add('IFCDOCUMENTREFERENCE', [at.layoutUrl || `${surface.id}.surface.json`, surface.id, 'Surface layout',
    'The SurfaceDesigner layout (APK-native JSON) this station presents; APK_SurfaceLayout.LayoutHash names its content', null]);
  W.add('IFCRELASSOCIATESDOCUMENT', [g('layout'), null, null, null, [station], doc]);
  return station;
}

/** The station alone on one wall of one room, as an IFC4X3_ADD2 file.
    room = {name, heightMm}; wall = {name, lengthMm, thicknessMm}; at = stationEntities' at. */
export function surfaceToIfc(surface, { room = {}, wall = {}, at = {}, key = 'surface' } = {}) {
  const W = new StepWriter();
  const g = (...roles) => ifcGuid(key, 'room', ...roles);
  const origin = W.add('IFCAXIS2PLACEMENT3D', [W.point(0, 0, 0), null, null]);
  const model = W.add('IFCGEOMETRICREPRESENTATIONCONTEXT', [null, 'Model', 3, real(1e-5), origin, null]);
  const body = W.add('IFCGEOMETRICREPRESENTATIONSUBCONTEXT', ['Body', 'Model', { kind: 'derived' }, { kind: 'derived' }, { kind: 'derived' }, { kind: 'derived' }, model, null, enumv('MODEL_VIEW'), null]);
  const units = W.add('IFCUNITASSIGNMENT', [[
    W.add('IFCSIUNIT', [{ kind: 'derived' }, enumv('LENGTHUNIT'), enumv('MILLI'), enumv('METRE')]),
    W.add('IFCSIUNIT', [{ kind: 'derived' }, enumv('MASSUNIT'), enumv('KILO'), enumv('GRAM')]),
    W.add('IFCSIUNIT', [{ kind: 'derived' }, enumv('PLANEANGLEUNIT'), null, enumv('RADIAN')]),
  ]]);
  const project = W.add('IFCPROJECT', [g('project'), null, room.name || 'Room', null, null, null, null, [model], units]);
  let parent = project;
  let place = null;
  const spine = {};
  for (const [k, type, name, extra] of [
    ['site', 'IFCSITE', 'Site', [null, null, null, null, null]],
    ['building', 'IFCBUILDING', 'Building', [null, null, null]],
    ['storey', 'IFCBUILDINGSTOREY', 'Level 0', [null]],
    ['space', 'IFCSPACE', room.name || 'Room', [enumv('SPACE'), null]],
  ]) {
    place = W.placement(place, [0, 0, 0]);
    spine[k] = { ref: W.add(type, [g(k), null, name, null, null, place, null, null, enumv('ELEMENT'), ...extra]), place };
    W.add('IFCRELAGGREGATES', [g(k, 'aggregates'), null, null, null, parent, [spine[k].ref]]);
    parent = spine[k].ref;
  }
  const wallPlace = W.placement(spine.storey.place, [0, 0, 0]);
  const wallRef = W.add('IFCWALL', [g('wall'), null, wall.name || 'Wall', null, null, wallPlace, null, null, enumv('SOLIDWALL')]);
  if (Number(wall.lengthMm) > 0 || Number(wall.thicknessMm) > 0 || Number(room.heightMm) > 0) {
    const q = [['Length', wall.lengthMm], ['Width', wall.thicknessMm], ['Height', room.heightMm]]
      .filter(([, v]) => Number(v) > 0).map(([n, v]) => W.add('IFCQUANTITYLENGTH', [n, null, null, real(Number(v)), null]));
    const qto = W.add('IFCELEMENTQUANTITY', [g('wall', 'qto'), null, 'Qto_WallBaseQuantities', null, null, q]);
    W.add('IFCRELDEFINESBYPROPERTIES', [g('wall', 'qto', 'rel'), null, null, null, [wallRef], qto]);
  }
  W.add('IFCRELCONTAINEDINSPATIALSTRUCTURE', [g('storey', 'contained'), null, null, null, [wallRef], spine.storey.ref]);
  const station = stationEntities(W, surface, { space: spine.space.ref, wall: wallRef, wallPlacement: wallPlace, body, key }, at);
  W.add('IFCRELCONTAINEDINSPATIALSTRUCTURE', [g('space', 'contained'), null, null, null, [station], spine.space.ref]);
  return W.text(`${surface.id}.ifc`);
}
