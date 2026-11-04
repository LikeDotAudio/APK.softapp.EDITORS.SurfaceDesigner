// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

import { FORM_FACTORS, CONTROL_TYPES } from './surfaceModel.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* EIA-310 rack ear, in mm (EDITORS.Device): ears of (482.6 - 440) / 2 mm, two
   fixing slots per U per ear at +-15.875 mm from the U's centre, 7.95 mm in from
   the panel edge. The slots are WIDE: 9.5 x 7 mm, horizontal. */
export const RACK_EAR = { PANEL_W: 482.6, BODY_W: 440, U: 44.45, HOLE_OFFSET: 15.875, SLOT_W: 9.5, SLOT_H: 7, SLOT_FROM_EDGE: 7.95 };

/** The ear slots of a rack faceplate, in mm: [{ x, y, w, h }] (x, y the slot centre). */
export function rackEarSlots(rackUnits) {
  const R = RACK_EAR;
  const out = [];
  for (const cx of [R.SLOT_FROM_EDGE, R.PANEL_W - R.SLOT_FROM_EDGE]) {
    for (let u = 0; u < rackUnits; u++) {
      const uc = u * R.U + R.U / 2;
      for (const cy of [uc - R.HOLE_OFFSET, uc + R.HOLE_OFFSET]) out.push({ x: cx, y: cy, w: R.SLOT_W, h: R.SLOT_H });
    }
  }
  return out;
}

export function renderSurfaceFaceplateSvg(model, options = {}) {
  const { selectedElementId = null } = options;
  const ff = FORM_FACTORS[model.formFactor] || FORM_FACTORS.GANG_2;

  // Scale: 3.5 px per mm for realistic wall plate rendering
  const scale = 3.5;
  const plateWidthPx = ff.width_mm * scale;
  const plateHeightPx = ff.height_mm * scale;

  const isRack = !!ff.rackUnits;
  // A rack faceplate's controls sit on the body between the ears.
  const marginX = isRack ? ((RACK_EAR.PANEL_W - RACK_EAR.BODY_W) / 2) * scale + 6 : 24;
  const marginY = isRack ? 8 : 24;
  const innerW = plateWidthPx - marginX * 2;
  const innerH = plateHeightPx - marginY * 2;

  const cellW = innerW / model.cols;
  const cellH = innerH / model.rows;

  // Faceplate mounting: a wall plate's two screws, or a rack panel's ear slots (9.5 x 7 mm, horizontal).
  const screwsSvg = isRack
    ? rackEarSlots(ff.rackUnits).map((h) => `
    <rect class="rack-ear-slot" x="${(h.x - h.w / 2) * scale}" y="${(h.y - h.h / 2) * scale}" width="${h.w * scale}" height="${h.h * scale}" rx="${(h.h / 2) * scale}" fill="#09090b" stroke="#52525b" stroke-width="1"/>`).join('')
    : `
    <!-- Top & Bottom Wall Plate Screws -->
    <circle cx="${plateWidthPx / 2}" cy="12" r="4.5" fill="#3f3f46" stroke="#121212" stroke-width="1"/>
    <line x1="${plateWidthPx / 2 - 3}" y1="12" x2="${plateWidthPx / 2 + 3}" y2="12" stroke="#121212" stroke-width="1"/>
    
    <circle cx="${plateWidthPx / 2}" cy="${plateHeightPx - 12}" r="4.5" fill="#3f3f46" stroke="#121212" stroke-width="1"/>
    <line x1="${plateWidthPx / 2 - 3}" y1="${plateHeightPx - 12}" x2="${plateWidthPx / 2 + 3}" y2="${plateHeightPx - 12}" stroke="#121212" stroke-width="1"/>
  `;

  // Grid guides
  let gridSvg = '';
  for (let c = 0; c <= model.cols; c++) {
    const gx = marginX + c * cellW;
    gridSvg += `<line x1="${gx}" y1="${marginY}" x2="${gx}" y2="${marginY + innerH}" stroke="#2c2c2c" stroke-dasharray="2,3" stroke-width="0.75"/>`;
  }
  for (let r = 0; r <= model.rows; r++) {
    const gy = marginY + r * cellH;
    gridSvg += `<line x1="${marginX}" y1="${gy}" x2="${marginX + innerW}" y2="${gy}" stroke="#2c2c2c" stroke-dasharray="2,3" stroke-width="0.75"/>`;
  }

  // Controls
  const controlsSvg = model.elements.map((el) => {
    const isSelected = el.id === selectedElementId;
    const x = marginX + el.col * cellW;
    const y = marginY + el.row * cellH;
    const w = el.w * cellW;
    const h = el.h * cellH;
    const pad = 6;

    let shapeMarkup = '';

    if (el.kind === 'BUTTON') {
      shapeMarkup = `
        <rect x="${x + pad}" y="${y + pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="6"
          fill="#2c2c2c" stroke="${isSelected ? '#F4902C' : el.color || '#4A9EFF'}" stroke-width="${isSelected ? 2.5 : 1.5}"
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
        />
        <!-- LED halo ring inside button -->
        <circle cx="${x + w / 2}" cy="${y + h / 2 - 6}" r="7" fill="none" stroke="${esc(el.color || '#4A9EFF')}" stroke-width="1.5"/>
        <text x="${x + w / 2}" y="${y + h / 2 + 14}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#f4f4f5">${esc(el.label)}</text>
      `;
    } else if (el.kind === 'ENCODER') {
      const cx = x + w / 2;
      const cy = y + h / 2 - 4;
      const r = Math.min(w, h) / 2 - 12;
      shapeMarkup = `
        <!-- Outer tick markings -->
        <circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="none" stroke="#3f3f46" stroke-width="2" stroke-dasharray="2,4"/>
        <!-- Knob Body -->
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="#0f0f11" stroke="${isSelected ? '#F4902C' : el.color || '#F4902C'}" stroke-width="${isSelected ? 2.5 : 2}"/>
        <!-- Indicator Notch -->
        <line x1="${cx}" y1="${cy - r + 3}" x2="${cx}" y2="${cy - r + 9}" stroke="#f4f4f5" stroke-width="2.5" stroke-linecap="round"/>
        <text x="${cx}" y="${y + h - 6}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" font-weight="700" fill="#f4f4f5">${esc(el.label)}</text>
      `;
    } else if (el.kind === 'OLED') {
      shapeMarkup = `
        <rect x="${x + pad}" y="${y + pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="4"
          fill="#000000" stroke="${isSelected ? '#F4902C' : '#38BDF8'}" stroke-width="${isSelected ? 2 : 1.5}"
        />
        <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="600" fill="#38BDF8">${esc(el.label)}</text>
      `;
    } else if (el.kind === 'FADER') {
      const cx = x + w / 2;
      shapeMarkup = `
        <!-- Fader slot -->
        <line x1="${cx}" y1="${y + pad + 10}" x2="${cx}" y2="${y + h - pad - 10}" stroke="#121212" stroke-width="5" stroke-linecap="round"/>
        <!-- Fader cap -->
        <rect x="${cx - 12}" y="${y + h / 2 - 8}" width="24" height="16" rx="2" fill="#3f3f46" stroke="${isSelected ? '#F4902C' : el.color || '#10B981'}" stroke-width="${isSelected ? 2 : 1.5}"/>
        <line x1="${cx - 9}" y1="${y + h / 2}" x2="${cx + 9}" y2="${y + h / 2}" stroke="#f4f4f5" stroke-width="1"/>
        <text x="${cx}" y="${y + h - 2}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="8" font-weight="600" fill="#888888">${esc(el.label)}</text>
      `;
    } else {
      shapeMarkup = `
        <circle cx="${x + w / 2}" cy="${y + h / 2}" r="10" fill="${esc(el.color || '#EF4444')}" stroke="#121212" stroke-width="2"/>
        <text x="${x + w / 2}" y="${y + h / 2 + 18}" text-anchor="middle" font-family="-apple-system, sans-serif" font-size="9" fill="#f4f4f5">${esc(el.label)}</text>
      `;
    }

    return `
      <g class="surface-element" data-element-id="${esc(el.id)}" style="cursor: pointer;">
        ${shapeMarkup}
      </g>
    `;
  }).join('');

  return `
    <svg id="surface-canvas-svg" width="${plateWidthPx}" height="${plateHeightPx}" xmlns="http://www.w3.org/2000/svg">
      <!-- Beveled Wall Plate Body -->
      <rect width="${plateWidthPx}" height="${plateHeightPx}" rx="10" fill="${esc(model.plateColor)}" stroke="#2c2c2c" stroke-width="2" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.7))"/>
      <rect x="4" y="4" width="${plateWidthPx - 8}" height="${plateHeightPx - 8}" rx="8" fill="none" stroke="#3f3f46" stroke-width="1" opacity="0.6"/>
      ${screwsSvg}
      ${gridSvg}
      ${controlsSvg}
    </svg>
  `;
}
