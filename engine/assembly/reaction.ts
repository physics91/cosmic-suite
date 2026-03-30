// Gray-Scott reaction-diffusion system
// Used by: reaction.html

import { rawAlloc } from "./shared/memory";

let _width: i32 = 0;
let _height: i32 = 0;
let _size: i32 = 0;

// Double-buffered grids (Float32)
let _gridA: usize = 0;   // Chemical A concentration
let _gridB: usize = 0;   // Chemical B concentration
let _nextA: usize = 0;   // Next state A
let _nextB: usize = 0;   // Next state B

// Parameters
let _feed: f32 = 0.055;
let _kill: f32 = 0.062;
let _dA: f32 = 1.0;
let _dB: f32 = 0.5;

export function reaction_init(width: i32, height: i32, feed: f32, kill: f32): void {
  _width = width;
  _height = height;
  _size = width * height;
  _feed = feed;
  _kill = kill;

  _gridA = rawAlloc(_size * 4);
  _gridB = rawAlloc(_size * 4);
  _nextA = rawAlloc(_size * 4);
  _nextB = rawAlloc(_size * 4);

  // Initialize A=1.0 everywhere
  for (let i: i32 = 0; i < _size; i++) {
    store<f32>(_gridA + <usize>(i) * 4, 1.0);
  }
}

export function reaction_set_params(feed: f32, kill: f32, dA: f32, dB: f32): void {
  _feed = feed;
  _kill = kill;
  _dA = dA;
  _dB = dB;
}

export function reaction_seed(cx: i32, cy: i32, radius: i32): void {
  const w = _width;
  const h = _height;
  for (let dy: i32 = -radius; dy <= radius; dy++) {
    for (let dx: i32 = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const x = (cx + dx + w) % w;
      const y = (cy + dy + h) % h;
      store<f32>(_gridB + <usize>(y * w + x) * 4, 1.0);
    }
  }
}

export function reaction_step(steps: i32): void {
  const w = _width;
  const h = _height;
  const feed = _feed;
  const kill = _kill;
  const dA = _dA;
  const dB = _dB;

  for (let s: i32 = 0; s < steps; s++) {
    for (let y: i32 = 0; y < h; y++) {
      for (let x: i32 = 0; x < w; x++) {
        const idx = <usize>(y * w + x) * 4;
        const a = load<f32>(_gridA + idx);
        const b = load<f32>(_gridB + idx);

        // Laplacian (5-point stencil with wrapping)
        const xm = ((x - 1 + w) % w);
        const xp = ((x + 1) % w);
        const ym = ((y - 1 + h) % h);
        const yp = ((y + 1) % h);

        const lapA = load<f32>(_gridA + <usize>(y * w + xp) * 4)
                   + load<f32>(_gridA + <usize>(y * w + xm) * 4)
                   + load<f32>(_gridA + <usize>(yp * w + x) * 4)
                   + load<f32>(_gridA + <usize>(ym * w + x) * 4)
                   - 4.0 * a;

        const lapB = load<f32>(_gridB + <usize>(y * w + xp) * 4)
                   + load<f32>(_gridB + <usize>(y * w + xm) * 4)
                   + load<f32>(_gridB + <usize>(yp * w + x) * 4)
                   + load<f32>(_gridB + <usize>(ym * w + x) * 4)
                   - 4.0 * b;

        const abb = a * b * b;
        const newA = a + dA * lapA - abb + feed * (1.0 - a);
        const newB = b + dB * lapB + abb - (kill + feed) * b;

        store<f32>(_nextA + idx, Mathf.max(0.0, Mathf.min(1.0, newA)));
        store<f32>(_nextB + idx, Mathf.max(0.0, Mathf.min(1.0, newB)));
      }
    }

    // Swap buffers (pointer swap, no copy)
    let tmpA = _gridA;
    let tmpB = _gridB;
    _gridA = _nextA;
    _gridB = _nextB;
    _nextA = tmpA;
    _nextB = tmpB;
  }
}

export function reaction_get_a_ptr(): usize { return _gridA; }
export function reaction_get_b_ptr(): usize { return _gridB; }
export function reaction_get_width(): i32 { return _width; }
export function reaction_get_height(): i32 { return _height; }
