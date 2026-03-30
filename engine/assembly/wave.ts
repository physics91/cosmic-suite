// Wave equation simulation (2D)
// Used by: interference.html

import { rawAlloc } from "./shared/memory";

let _cols: i32 = 0;
let _rows: i32 = 0;
let _size: i32 = 0;
let _damping: f32 = 0.999;

// Triple-buffered field (current, previous, next)
let _field: usize = 0;      // Float32
let _fieldPrev: usize = 0;  // Float32
let _fieldNext: usize = 0;  // Float32
let _walls: usize = 0;      // Uint8 — wall mask

// Wave sources
const MAX_SOURCES: i32 = 32;
let _srcX: usize = 0;       // i32[MAX_SOURCES]
let _srcY: usize = 0;       // i32[MAX_SOURCES]
let _srcFreq: usize = 0;    // f32[MAX_SOURCES]
let _srcAmp: usize = 0;     // f32[MAX_SOURCES]
let _srcCount: i32 = 0;
let _time: f32 = 0;

export function wave_init(cols: i32, rows: i32, damping: f32): void {
  _cols = cols;
  _rows = rows;
  _size = cols * rows;
  _damping = damping;
  _time = 0;
  _srcCount = 0;

  _field = rawAlloc(_size * 4);
  _fieldPrev = rawAlloc(_size * 4);
  _fieldNext = rawAlloc(_size * 4);
  _walls = rawAlloc(_size);

  _srcX = rawAlloc(MAX_SOURCES * 4);
  _srcY = rawAlloc(MAX_SOURCES * 4);
  _srcFreq = rawAlloc(MAX_SOURCES * 4);
  _srcAmp = rawAlloc(MAX_SOURCES * 4);
}

export function wave_add_source(x: i32, y: i32, freq: f32, amp: f32): i32 {
  if (_srcCount >= MAX_SOURCES) return -1;
  const i = _srcCount;
  store<i32>(_srcX + <usize>(i) * 4, x);
  store<i32>(_srcY + <usize>(i) * 4, y);
  store<f32>(_srcFreq + <usize>(i) * 4, freq);
  store<f32>(_srcAmp + <usize>(i) * 4, amp);
  _srcCount++;
  return i;
}

export function wave_remove_source(index: i32): void {
  if (index < 0 || index >= _srcCount) return;
  const last = _srcCount - 1;
  if (index != last) {
    store<i32>(_srcX + <usize>(index) * 4, load<i32>(_srcX + <usize>(last) * 4));
    store<i32>(_srcY + <usize>(index) * 4, load<i32>(_srcY + <usize>(last) * 4));
    store<f32>(_srcFreq + <usize>(index) * 4, load<f32>(_srcFreq + <usize>(last) * 4));
    store<f32>(_srcAmp + <usize>(index) * 4, load<f32>(_srcAmp + <usize>(last) * 4));
  }
  _srcCount--;
}

export function wave_set_wall(x: i32, y: i32, isWall: i32): void {
  if (x < 0 || x >= _cols || y < 0 || y >= _rows) return;
  store<u8>(_walls + <usize>(y * _cols + x), <u8>(isWall));
}

export function wave_step(steps: i32): void {
  const cols = _cols;
  const rows = _rows;
  const damping = _damping;

  for (let s: i32 = 0; s < steps; s++) {
    // Inject sources
    for (let i: i32 = 0; i < _srcCount; i++) {
      const sx = load<i32>(_srcX + <usize>(i) * 4);
      const sy = load<i32>(_srcY + <usize>(i) * 4);
      const freq = load<f32>(_srcFreq + <usize>(i) * 4);
      const amp = load<f32>(_srcAmp + <usize>(i) * 4);
      const idx = <usize>(sy * cols + sx) * 4;
      store<f32>(_field + idx, amp * Mathf.sin(_time * freq));
    }

    // Wave equation: next = 2*current - prev + c²*(laplacian)
    const c2: f32 = 0.25; // wave speed squared
    for (let y: i32 = 1; y < rows - 1; y++) {
      for (let x: i32 = 1; x < cols - 1; x++) {
        const idx = y * cols + x;
        if (load<u8>(_walls + <usize>(idx)) > 0) continue;

        const fidx = <usize>(idx) * 4;
        const cur = load<f32>(_field + fidx);
        const prev = load<f32>(_fieldPrev + fidx);

        const lap = load<f32>(_field + <usize>((y) * cols + x + 1) * 4)
                  + load<f32>(_field + <usize>((y) * cols + x - 1) * 4)
                  + load<f32>(_field + <usize>((y + 1) * cols + x) * 4)
                  + load<f32>(_field + <usize>((y - 1) * cols + x) * 4)
                  - 4.0 * cur;

        store<f32>(_fieldNext + fidx, (2.0 * cur - prev + c2 * lap) * damping);
      }
    }

    // Rotate buffers
    const tmp = _fieldPrev;
    _fieldPrev = _field;
    _field = _fieldNext;
    _fieldNext = tmp;

    _time += 1.0;
  }
}

export function wave_get_field_ptr(): usize { return _field; }
export function wave_get_walls_ptr(): usize { return _walls; }
export function wave_get_cols(): i32 { return _cols; }
export function wave_get_rows(): i32 { return _rows; }
export function wave_clear(): void {
  memory.fill(_field, 0, _size * 4);
  memory.fill(_fieldPrev, 0, _size * 4);
  memory.fill(_fieldNext, 0, _size * 4);
  _time = 0;
}
