// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.
/* surfaceHost.js — the surface block in and out of the CAD over
   cad.like.audio/host@1, through the vendored APKSoftapp client (ROAD-3485 /
   ROAD-3491). No DOM here: the round-trip test drives it with the real client. */

import { SurfaceModel } from './surfaceModel.js';

export const EDITOR = 'Surface Designer';
export const BLOCK_TYPE = 'surfacedesigner';

export function blockMeta(model) {
  return { filename: String(model.name || 'surface').toLowerCase().replace(/\s+/g, '_'), title: String(model.name || 'Surface') };
}

/** state.model is the live SurfaceModel; onLoaded(model, meta) redraws. Returns the host handle. */
export function connectSurfaceHost(S, state, { onLoaded, notice } = {}) {
  return S.connectHost({
    editor: EDITOR,
    blockType: BLOCK_TYPE,
    block: state.model.toJSON(),
    notice,
    onLoad: (block, meta) => {
      state.model = new SurfaceModel(block);
      if (onLoaded) onLoaded(state.model, meta);
    },
    onRequest: () => ({ block: state.model.toJSON(), meta: blockMeta(state.model) }),
  });
}
