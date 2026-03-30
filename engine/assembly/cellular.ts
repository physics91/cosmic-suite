// Cellular automata engine — Conway's Game of Life, Langton's Ant, falling sand
// Used by: conway.html, gravity-life.html, sandbox.html, ant.html

import { rawAlloc } from "./shared/memory";

let _width: i32 = 0;
let _height: i32 = 0;
let _size: i32 = 0;
let _ruleSet: i32 = 0;  // 0=conway, 1=gravity-life, 2=sandbox, 3=ant

// Double-buffered grids
let _gridA: usize = 0;
let _gridB: usize = 0;
let _current: usize = 0;  // pointer to current grid

// Extra data (glow for conway, fallen for gravity-life, element type for sandbox)
let _extra: usize = 0;    // Float32Array or Uint8Array depending on ruleset
let _age: usize = 0;      // Uint16Array — cell age

// Ant state (for ruleset 3)
let _antX: usize = 0;     // i32 array of ant x positions
let _antY: usize = 0;     // i32 array of ant y positions
let _antDir: usize = 0;   // u8 array of ant directions (0=N,1=E,2=S,3=W)
let _antCount: i32 = 0;
let _maxAnts: i32 = 0;

export function cellular_init(width: i32, height: i32, ruleSet: i32): void {
  _width = width;
  _height = height;
  _size = width * height;
  _ruleSet = ruleSet;

  _gridA = rawAlloc(_size);      // Uint8Array
  _gridB = rawAlloc(_size);      // Uint8Array
  _current = _gridA;

  if (ruleSet == 0 || ruleSet == 1) {
    // Glow buffer (Float32)
    _extra = rawAlloc(_size * 4);
    _age = rawAlloc(_size * 2);  // Uint16
  } else if (ruleSet == 2) {
    // Sandbox: element types in grid, extra for updated flags
    _extra = rawAlloc(_size);    // Uint8 updated flags
  } else if (ruleSet == 3) {
    // Ant
    _maxAnts = 64;
    _antX = rawAlloc(_maxAnts * 4);
    _antY = rawAlloc(_maxAnts * 4);
    _antDir = rawAlloc(_maxAnts);
    _antCount = 0;
  }
}

export function cellular_set(x: i32, y: i32, state: i32): void {
  if (x < 0 || x >= _width || y < 0 || y >= _height) return;
  store<u8>(_current + <usize>(y * _width + x), <u8>(state));
}

export function cellular_get(x: i32, y: i32): i32 {
  if (x < 0 || x >= _width || y < 0 || y >= _height) return 0;
  return <i32>(load<u8>(_current + <usize>(y * _width + x)));
}

// Conway's Game of Life step
function stepConway(): void {
  const w = _width;
  const h = _height;
  const src = _current;
  const dst = _current == _gridA ? _gridB : _gridA;

  for (let y: i32 = 0; y < h; y++) {
    for (let x: i32 = 0; x < w; x++) {
      let neighbors: i32 = 0;
      for (let dy: i32 = -1; dy <= 1; dy++) {
        for (let dx: i32 = -1; dx <= 1; dx++) {
          if (dx == 0 && dy == 0) continue;
          const nx = (x + dx + w) % w;
          const ny = (y + dy + h) % h;
          if (load<u8>(src + <usize>(ny * w + nx)) > 0) neighbors++;
        }
      }
      const idx = y * w + x;
      const alive = load<u8>(src + <usize>(idx)) > 0;
      let newState: u8 = 0;
      if (alive) {
        newState = (neighbors == 2 || neighbors == 3) ? 1 : 0;
      } else {
        newState = neighbors == 3 ? 1 : 0;
      }
      store<u8>(dst + <usize>(idx), newState);

      // Update age
      const ageIdx = <usize>(idx) * 2;
      if (newState > 0) {
        const curAge = load<u16>(_age + ageIdx);
        store<u16>(_age + ageIdx, curAge < 65535 ? curAge + 1 : 65535);
      } else {
        store<u16>(_age + ageIdx, 0);
      }

      // Update glow (decay)
      const glowIdx = <usize>(idx) * 4;
      let glow = load<f32>(_extra + glowIdx);
      if (newState > 0) {
        glow = 1.0;
      } else {
        glow *= 0.95;
        if (glow < 0.01) glow = 0;
      }
      store<f32>(_extra + glowIdx, glow);
    }
  }
  _current = dst;
}

// Gravity-life step: Conway + gravity (cells fall)
function stepGravityLife(): void {
  // First do Conway rules
  stepConway();

  // Then apply gravity: alive cells fall down
  const w = _width;
  const h = _height;
  for (let y: i32 = h - 2; y >= 0; y--) {
    for (let x: i32 = 0; x < w; x++) {
      const idx = y * w + x;
      const below = (y + 1) * w + x;
      if (load<u8>(_current + <usize>(idx)) > 0 && load<u8>(_current + <usize>(below)) == 0) {
        store<u8>(_current + <usize>(below), load<u8>(_current + <usize>(idx)));
        store<u8>(_current + <usize>(idx), 0);
      }
    }
  }
}

// Sandbox step: falling sand, water, fire physics
function stepSandbox(): void {
  const w = _width;
  const h = _height;
  // Clear updated flags
  memory.fill(_extra, 0, _size);

  // Bottom to top for falling, top to bottom for rising
  for (let y: i32 = h - 2; y >= 0; y--) {
    for (let x: i32 = 0; x < w; x++) {
      const idx = y * w + x;
      const cell = load<u8>(_current + <usize>(idx));
      if (cell == 0) continue;
      if (load<u8>(_extra + <usize>(idx)) > 0) continue; // already updated

      if (cell == 1) {
        // Sand: fall down, or diagonally
        const below = (y + 1) * w + x;
        if (load<u8>(_current + <usize>(below)) == 0) {
          store<u8>(_current + <usize>(below), 1);
          store<u8>(_current + <usize>(idx), 0);
          store<u8>(_extra + <usize>(below), 1);
        } else if (x > 0 && load<u8>(_current + <usize>((y+1)*w+x-1)) == 0) {
          store<u8>(_current + <usize>((y+1)*w+x-1), 1);
          store<u8>(_current + <usize>(idx), 0);
          store<u8>(_extra + <usize>((y+1)*w+x-1), 1);
        } else if (x < w-1 && load<u8>(_current + <usize>((y+1)*w+x+1)) == 0) {
          store<u8>(_current + <usize>((y+1)*w+x+1), 1);
          store<u8>(_current + <usize>(idx), 0);
          store<u8>(_extra + <usize>((y+1)*w+x+1), 1);
        }
      } else if (cell == 2) {
        // Water: fall, then flow sideways
        const below = (y + 1) * w + x;
        if (load<u8>(_current + <usize>(below)) == 0) {
          store<u8>(_current + <usize>(below), 2);
          store<u8>(_current + <usize>(idx), 0);
          store<u8>(_extra + <usize>(below), 1);
        } else if (x > 0 && load<u8>(_current + <usize>(y*w+x-1)) == 0) {
          store<u8>(_current + <usize>(y*w+x-1), 2);
          store<u8>(_current + <usize>(idx), 0);
          store<u8>(_extra + <usize>(y*w+x-1), 1);
        } else if (x < w-1 && load<u8>(_current + <usize>(y*w+x+1)) == 0) {
          store<u8>(_current + <usize>(y*w+x+1), 2);
          store<u8>(_current + <usize>(idx), 0);
          store<u8>(_extra + <usize>(y*w+x+1), 1);
        }
      } else if (cell == 3) {
        // Fire: rise up, spread randomly, decay
        if (y > 0 && load<u8>(_current + <usize>((y-1)*w+x)) == 0) {
          store<u8>(_current + <usize>((y-1)*w+x), 3);
          store<u8>(_extra + <usize>((y-1)*w+x), 1);
        }
        // Decay (pseudo-random using position)
        if (((x * 7 + y * 13 + idx) & 3) == 0) {
          store<u8>(_current + <usize>(idx), 0);
        }
      }
    }
  }
}

// Langton's Ant step
function stepAnt(): void {
  const w = _width;
  for (let a: i32 = 0; a < _antCount; a++) {
    const ax = load<i32>(_antX + <usize>(a) * 4);
    const ay = load<i32>(_antY + <usize>(a) * 4);
    let dir = <i32>(load<u8>(_antDir + <usize>(a)));
    const idx = ay * w + ax;
    const cell = load<u8>(_current + <usize>(idx));

    if (cell == 0) {
      // White: turn right, color, move
      dir = (dir + 1) & 3;
      store<u8>(_current + <usize>(idx), 1);
    } else {
      // Black: turn left, uncolor, move
      dir = (dir + 3) & 3;
      store<u8>(_current + <usize>(idx), 0);
    }

    store<u8>(_antDir + <usize>(a), <u8>(dir));

    // Move
    let nx = ax;
    let ny = ay;
    if (dir == 0) ny--;
    else if (dir == 1) nx++;
    else if (dir == 2) ny++;
    else nx--;

    // Wrap
    if (nx < 0) nx += _width;
    if (nx >= _width) nx -= _width;
    if (ny < 0) ny += _height;
    if (ny >= _height) ny -= _height;

    store<i32>(_antX + <usize>(a) * 4, nx);
    store<i32>(_antY + <usize>(a) * 4, ny);
  }
}

export function cellular_step(steps: i32): void {
  for (let s: i32 = 0; s < steps; s++) {
    if (_ruleSet == 0) stepConway();
    else if (_ruleSet == 1) stepGravityLife();
    else if (_ruleSet == 2) stepSandbox();
    else if (_ruleSet == 3) stepAnt();
  }
}

export function cellular_add_ant(x: i32, y: i32, dir: i32): i32 {
  if (_antCount >= _maxAnts) return -1;
  const i = _antCount;
  store<i32>(_antX + <usize>(i) * 4, x);
  store<i32>(_antY + <usize>(i) * 4, y);
  store<u8>(_antDir + <usize>(i), <u8>(dir));
  _antCount++;
  return i;
}

export function cellular_get_grid_ptr(): usize { return _current; }
export function cellular_get_glow_ptr(): usize { return _extra; }
export function cellular_get_age_ptr(): usize { return _age; }
export function cellular_get_width(): i32 { return _width; }
export function cellular_get_height(): i32 { return _height; }
export function cellular_clear(): void {
  memory.fill(_gridA, 0, _size);
  memory.fill(_gridB, 0, _size);
  _current = _gridA;
}
