// Spatial hash grid for O(n) neighbor queries
// Replaces O(n²) brute-force in nbody and boids

import { rawAlloc } from "./memory";

// Grid config
let _cellSize: f32 = 0;
let _invCellSize: f32 = 0;
let _gridW: i32 = 0;
let _gridH: i32 = 0;
let _gridSize: i32 = 0;

// Grid storage: cell counts + cell start indices + sorted particle indices
let _counts: usize = 0;     // i32[gridSize] — count per cell
let _starts: usize = 0;     // i32[gridSize] — prefix sum (start index per cell)
let _sorted: usize = 0;     // i32[maxN] — particle indices sorted by cell
let _maxN: i32 = 0;

// Query results buffer
let _results: usize = 0;    // i32[maxN]
let _resultCount: i32 = 0;

export function spatial_init(worldW: f32, worldH: f32, cellSize: f32, maxN: i32): void {
  _cellSize = cellSize;
  _invCellSize = 1.0 / cellSize;
  _gridW = <i32>(Mathf.ceil(worldW / cellSize)) + 1;
  _gridH = <i32>(Mathf.ceil(worldH / cellSize)) + 1;
  _gridSize = _gridW * _gridH;
  _maxN = maxN;

  _counts = rawAlloc(_gridSize * 4);
  _starts = rawAlloc(_gridSize * 4);
  _sorted = rawAlloc(maxN * 4);
  _results = rawAlloc(maxN * 4);
}

@inline
function cellKey(x: f32, y: f32): i32 {
  let cx = <i32>(x * _invCellSize);
  let cy = <i32>(y * _invCellSize);
  if (cx < 0) cx = 0;
  if (cy < 0) cy = 0;
  if (cx >= _gridW) cx = _gridW - 1;
  if (cy >= _gridH) cy = _gridH - 1;
  return cy * _gridW + cx;
}

/**
 * Build spatial hash from position arrays.
 * Call once per frame before any queries.
 */
export function spatial_build(pxPtr: usize, pyPtr: usize, count: i32): void {
  // Clear counts
  memory.fill(_counts, 0, _gridSize * 4);

  // Count particles per cell
  for (let i: i32 = 0; i < count; i++) {
    const x = load<f32>(pxPtr + <usize>(i) * 4);
    const y = load<f32>(pyPtr + <usize>(i) * 4);
    const key = cellKey(x, y);
    const c = load<i32>(_counts + <usize>(key) * 4);
    store<i32>(_counts + <usize>(key) * 4, c + 1);
  }

  // Prefix sum → start indices
  let sum: i32 = 0;
  for (let i: i32 = 0; i < _gridSize; i++) {
    store<i32>(_starts + <usize>(i) * 4, sum);
    sum += load<i32>(_counts + <usize>(i) * 4);
  }

  // Reset counts for scatter pass
  memory.fill(_counts, 0, _gridSize * 4);

  // Scatter particles into sorted array
  for (let i: i32 = 0; i < count; i++) {
    const x = load<f32>(pxPtr + <usize>(i) * 4);
    const y = load<f32>(pyPtr + <usize>(i) * 4);
    const key = cellKey(x, y);
    const start = load<i32>(_starts + <usize>(key) * 4);
    const offset = load<i32>(_counts + <usize>(key) * 4);
    store<i32>(_sorted + <usize>(start + offset) * 4, i);
    store<i32>(_counts + <usize>(key) * 4, offset + 1);
  }
}

/**
 * Query all particles within radius of (qx, qy).
 * Returns count. Results accessible via spatial_get_results_ptr().
 */
export function spatial_query(qx: f32, qy: f32, radius: f32, pxPtr: usize, pyPtr: usize): i32 {
  _resultCount = 0;
  const rSq = radius * radius;
  const minCx = <i32>((qx - radius) * _invCellSize);
  const maxCx = <i32>((qx + radius) * _invCellSize);
  const minCy = <i32>((qy - radius) * _invCellSize);
  const maxCy = <i32>((qy + radius) * _invCellSize);

  const cxStart = minCx < 0 ? 0 : minCx;
  const cxEnd = maxCx >= _gridW ? _gridW - 1 : maxCx;
  const cyStart = minCy < 0 ? 0 : minCy;
  const cyEnd = maxCy >= _gridH ? _gridH - 1 : maxCy;

  for (let cy = cyStart; cy <= cyEnd; cy++) {
    for (let cx = cxStart; cx <= cxEnd; cx++) {
      const key = cy * _gridW + cx;
      const start = load<i32>(_starts + <usize>(key) * 4);
      const count = load<i32>(_counts + <usize>(key) * 4);
      for (let j: i32 = 0; j < count; j++) {
        const idx = load<i32>(_sorted + <usize>(start + j) * 4);
        const px = load<f32>(pxPtr + <usize>(idx) * 4);
        const py = load<f32>(pyPtr + <usize>(idx) * 4);
        const dx = px - qx;
        const dy = py - qy;
        if (dx * dx + dy * dy <= rSq && _resultCount < _maxN) {
          store<i32>(_results + <usize>(_resultCount) * 4, idx);
          _resultCount++;
        }
      }
    }
  }
  return _resultCount;
}

export function spatial_get_results_ptr(): usize {
  return _results;
}

export function spatial_get_result_count(): i32 {
  return _resultCount;
}
