// Part of the APK.audio project — http://APK.audio — made by Anthony Kuzub
// MIT Licence. Free, for everyone, for ever. Full text in LICENSE at the root.

export const FORM_FACTORS = {
  GANG_1: { label: '1-Gang Decora Wall Plate', width_mm: 70, height_mm: 115, cols: 2, rows: 4 },
  GANG_2: { label: '2-Gang Wall Plate', width_mm: 115, height_mm: 115, cols: 4, rows: 4 },
  GANG_3: { label: '3-Gang Wall Plate', width_mm: 160, height_mm: 115, cols: 6, rows: 4 },
  TABLETOP_8: { label: 'Tabletop 8-Button Station', width_mm: 140, height_mm: 90, cols: 4, rows: 2 },
  RACK_1U: { label: '1U Rack Faceplate', width_mm: 483, height_mm: 44, cols: 16, rows: 2 },
};

export const CONTROL_TYPES = {
  BUTTON: { label: 'Backlit Pushbutton', icon: '🔘', defaultColor: '#4A9EFF', widthCols: 1, heightRows: 1 },
  ENCODER: { label: 'Rotary Knob / Encoder', icon: '🎛️', defaultColor: '#F4902C', widthCols: 2, heightRows: 2 },
  FADER: { label: 'Linear Slider / Fader', icon: '🎚️', defaultColor: '#10B981', widthCols: 1, heightRows: 3 },
  OLED: { label: 'Graphic OLED Display', icon: '🖥️', defaultColor: '#38BDF8', widthCols: 2, heightRows: 1 },
  TALLY: { label: 'Status LED / Tally', icon: '💡', defaultColor: '#EF4444', widthCols: 1, heightRows: 1 },
};

export class SurfaceModel {
  constructor(initialData = null) {
    this.id = initialData?.id || `surf_${Date.now()}`;
    this.name = initialData?.name || 'Wall Station Controller';
    this.formFactor = initialData?.formFactor || 'GANG_2';
    this.plateColor = initialData?.plateColor || '#18181b'; // Black / Dark anodized aluminum

    const ff = FORM_FACTORS[this.formFactor] || FORM_FACTORS.GANG_2;
    this.cols = initialData?.cols || ff.cols;
    this.rows = initialData?.rows || ff.rows;

    this.elements = initialData?.elements || [
      { id: 'ctrl_1', kind: 'OLED', label: 'ROOM PRESET', col: 1, row: 0, w: 2, h: 1, color: '#38BDF8' },
      { id: 'ctrl_2', kind: 'BUTTON', label: 'PRESET 1', col: 0, row: 1, w: 1, h: 1, color: '#4A9EFF' },
      { id: 'ctrl_3', kind: 'BUTTON', label: 'PRESET 2', col: 1, row: 1, w: 1, h: 1, color: '#4A9EFF' },
      { id: 'ctrl_4', kind: 'BUTTON', label: 'PRESET 3', col: 2, row: 1, w: 1, h: 1, color: '#4A9EFF' },
      { id: 'ctrl_5', kind: 'BUTTON', label: 'MUTE ALL', col: 3, row: 1, w: 1, h: 1, color: '#EF4444' },
      { id: 'ctrl_6', kind: 'ENCODER', label: 'MASTER VOL', col: 1, row: 2, w: 2, h: 2, color: '#F4902C' },
    ];

    this.selectedElementId = null;
    this._elementCounter = this.elements.length + 1;
  }

  setFormFactor(key) {
    if (!FORM_FACTORS[key]) return false;
    this.formFactor = key;
    const ff = FORM_FACTORS[key];
    this.cols = ff.cols;
    this.rows = ff.rows;
    // Fit elements inside bounds
    this.elements = this.elements.filter((el) => el.col < this.cols && el.row < this.rows);
    return true;
  }

  addElement(kind, col = 0, row = 0) {
    const cDef = CONTROL_TYPES[kind] || CONTROL_TYPES.BUTTON;
    const id = `ctrl_${this._elementCounter++}`;
    const newEl = {
      id,
      kind,
      label: cDef.label,
      col: Math.max(0, Math.min(this.cols - cDef.widthCols, col)),
      row: Math.max(0, Math.min(this.rows - cDef.heightRows, row)),
      w: cDef.widthCols,
      h: cDef.heightRows,
      color: cDef.defaultColor,
    };
    this.elements.push(newEl);
    return newEl;
  }

  updateElement(id, updates) {
    const el = this.elements.find((e) => e.id === id);
    if (!el) return null;
    Object.assign(el, updates);
    return el;
  }

  deleteElement(id) {
    const idx = this.elements.findIndex((e) => e.id === id);
    if (idx !== -1) {
      this.elements.splice(idx, 1);
      if (this.selectedElementId === id) this.selectedElementId = null;
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      type: 'surfacedesigner',
      id: this.id,
      name: this.name,
      formFactor: this.formFactor,
      plateColor: this.plateColor,
      cols: this.cols,
      rows: this.rows,
      elements: this.elements,
    };
  }
}
