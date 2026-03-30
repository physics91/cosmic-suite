// N-body gravity simulation with spatial hash optimization
// Used by: index.html, gravity-well.html

import { soaAlloc, rawAlloc, pxOffset, pyOffset, vxOffset, vyOffset, massOffset, stateOffset } from "./shared/memory";
import { spatial_init, spatial_build, spatial_query, spatial_get_results_ptr } from "./shared/spatial";
import { clamp } from "./shared/math";

// SoA base pointer and particle count
let _base: usize = 0;
let _maxN: i32 = 0;
let _count: i32 = 0;

// Pointers into SoA
let _px: usize = 0;
let _py: usize = 0;
let _vx: usize = 0;
let _vy: usize = 0;
let _mass: usize = 0;
let _state: usize = 0;

// Simulation params
let _G: f32 = 1.0;
let _softening: f32 = 10.0;
let _damping: f32 = 0.999;
let _worldW: f32 = 0;
let _worldH: f32 = 0;
let _interactionRadius: f32 = 300.0;

// State flags
const STATE_ALIVE: u8 = 1;
const STATE_DEAD: u8 = 0;

// Attractors (fixed-position massive objects, e.g. gravity wells)
const MAX_ATTRACTORS: i32 = 32;
let _attrX: usize = 0;
let _attrY: usize = 0;
let _attrMass: usize = 0;
let _attrCount: i32 = 0;
let _attrSoftening: f32 = 500.0;

// Speed normalization (for photon/light-speed clamping)
let _speedClamp: f32 = 0;  // 0 = disabled

export function nbody_init(maxN: i32, worldW: f32, worldH: f32): void {
  _maxN = maxN;
  _count = 0;
  _worldW = worldW;
  _worldH = worldH;

  _base = soaAlloc(maxN);
  _px = pxOffset(_base, maxN);
  _py = pyOffset(_base, maxN);
  _vx = vxOffset(_base, maxN);
  _vy = vyOffset(_base, maxN);
  _mass = massOffset(_base, maxN);
  _state = stateOffset(_base, maxN);

  // Cell size ~ interaction radius for optimal spatial hash
  spatial_init(worldW, worldH, _interactionRadius, maxN);

  // Allocate attractor arrays
  _attrX = rawAlloc(MAX_ATTRACTORS * 4);
  _attrY = rawAlloc(MAX_ATTRACTORS * 4);
  _attrMass = rawAlloc(MAX_ATTRACTORS * 4);
  _attrCount = 0;
  _speedClamp = 0;
}

export function nbody_set_params(G: f32, softening: f32, damping: f32, radius: f32): void {
  _G = G;
  _softening = softening;
  _damping = damping;
  _interactionRadius = radius;
}

export function nbody_set_speed_clamp(speed: f32): void {
  _speedClamp = speed;
}

export function nbody_set_attractor_softening(s: f32): void {
  _attrSoftening = s;
}

export function nbody_add_attractor(x: f32, y: f32, mass: f32): i32 {
  if (_attrCount >= MAX_ATTRACTORS) return -1;
  const i = _attrCount;
  store<f32>(_attrX + <usize>(i) * 4, x);
  store<f32>(_attrY + <usize>(i) * 4, y);
  store<f32>(_attrMass + <usize>(i) * 4, mass);
  _attrCount++;
  return i;
}

export function nbody_update_attractor(index: i32, x: f32, y: f32, mass: f32): void {
  if (index < 0 || index >= _attrCount) return;
  store<f32>(_attrX + <usize>(index) * 4, x);
  store<f32>(_attrY + <usize>(index) * 4, y);
  store<f32>(_attrMass + <usize>(index) * 4, mass);
}

export function nbody_remove_attractor(index: i32): void {
  if (index < 0 || index >= _attrCount) return;
  const last = _attrCount - 1;
  if (index != last) {
    store<f32>(_attrX + <usize>(index) * 4, load<f32>(_attrX + <usize>(last) * 4));
    store<f32>(_attrY + <usize>(index) * 4, load<f32>(_attrY + <usize>(last) * 4));
    store<f32>(_attrMass + <usize>(index) * 4, load<f32>(_attrMass + <usize>(last) * 4));
  }
  _attrCount--;
}

export function nbody_clear_attractors(): void {
  _attrCount = 0;
}

export function nbody_get_attractor_count(): i32 {
  return _attrCount;
}

export function nbody_add(x: f32, y: f32, vx: f32, vy: f32, mass: f32): i32 {
  if (_count >= _maxN) return -1;
  const i = _count;
  store<f32>(_px + <usize>(i) * 4, x);
  store<f32>(_py + <usize>(i) * 4, y);
  store<f32>(_vx + <usize>(i) * 4, vx);
  store<f32>(_vy + <usize>(i) * 4, vy);
  store<f32>(_mass + <usize>(i) * 4, mass);
  store<u8>(_state + <usize>(i), STATE_ALIVE);
  _count++;
  return i;
}

export function nbody_remove(index: i32): void {
  if (index < 0 || index >= _count) return;
  const last = _count - 1;
  if (index != last) {
    // Swap with last
    store<f32>(_px + <usize>(index) * 4, load<f32>(_px + <usize>(last) * 4));
    store<f32>(_py + <usize>(index) * 4, load<f32>(_py + <usize>(last) * 4));
    store<f32>(_vx + <usize>(index) * 4, load<f32>(_vx + <usize>(last) * 4));
    store<f32>(_vy + <usize>(index) * 4, load<f32>(_vy + <usize>(last) * 4));
    store<f32>(_mass + <usize>(index) * 4, load<f32>(_mass + <usize>(last) * 4));
    store<u8>(_state + <usize>(index), load<u8>(_state + <usize>(last)));
  }
  _count--;
}

export function nbody_step(dt: f32): void {
  // Build spatial hash
  spatial_build(_px, _py, _count);

  const softeningSq = _softening * _softening;
  const G = _G;
  const damping = _damping;
  const radius = _interactionRadius;

  // For each particle, accumulate forces from neighbors
  for (let i: i32 = 0; i < _count; i++) {
    const xi = load<f32>(_px + <usize>(i) * 4);
    const yi = load<f32>(_py + <usize>(i) * 4);
    const mi = load<f32>(_mass + <usize>(i) * 4);

    let ax: f32 = 0;
    let ay: f32 = 0;

    // Query spatial hash for neighbors
    const nCount = spatial_query(xi, yi, radius, _px, _py);
    const resultsPtr = spatial_get_results_ptr();

    for (let n: i32 = 0; n < nCount; n++) {
      const j = load<i32>(resultsPtr + <usize>(n) * 4);
      if (j == i) continue;

      const xj = load<f32>(_px + <usize>(j) * 4);
      const yj = load<f32>(_py + <usize>(j) * 4);
      const mj = load<f32>(_mass + <usize>(j) * 4);

      const dx = xj - xi;
      const dy = yj - yi;
      const distSq = dx * dx + dy * dy + softeningSq;
      const invDist = 1.0 / Mathf.sqrt(distSq);
      const force: f32 = <f32>(G * mj * invDist * invDist * invDist);

      ax += <f32>(dx * force);
      ay += <f32>(dy * force);
    }

    // Apply attractor forces (fixed-position gravity wells)
    for (let a: i32 = 0; a < _attrCount; a++) {
      const attrX = load<f32>(_attrX + <usize>(a) * 4);
      const attrY = load<f32>(_attrY + <usize>(a) * 4);
      const attrM = load<f32>(_attrMass + <usize>(a) * 4);

      const adx = attrX - xi;
      const ady = attrY - yi;
      const ad2 = adx * adx + ady * ady;
      const ad: f32 = Mathf.sqrt(ad2) + 1e-6;
      const af: f32 = <f32>(attrM * 30.0 / (ad2 + _attrSoftening));

      ax += <f32>(adx / ad * af);
      ay += <f32>(ady / ad * af);
    }

    // Update velocity
    let vxi = load<f32>(_vx + <usize>(i) * 4);
    let vyi = load<f32>(_vy + <usize>(i) * 4);
    vxi = (vxi + ax * dt) * damping;
    vyi = (vyi + ay * dt) * damping;

    // Speed clamp (e.g., light speed for photons)
    if (_speedClamp > 0) {
      const spd = Mathf.sqrt(vxi * vxi + vyi * vyi);
      if (spd > 0) {
        vxi = vxi / spd * _speedClamp;
        vyi = vyi / spd * _speedClamp;
      }
    }

    store<f32>(_vx + <usize>(i) * 4, vxi);
    store<f32>(_vy + <usize>(i) * 4, vyi);
  }

  // Update positions (separate pass for consistency)
  for (let i: i32 = 0; i < _count; i++) {
    let x = load<f32>(_px + <usize>(i) * 4);
    let y = load<f32>(_py + <usize>(i) * 4);
    const vx = load<f32>(_vx + <usize>(i) * 4);
    const vy = load<f32>(_vy + <usize>(i) * 4);

    x += vx * dt;
    y += vy * dt;

    store<f32>(_px + <usize>(i) * 4, x);
    store<f32>(_py + <usize>(i) * 4, y);
  }
}

export function nbody_get_count(): i32 {
  return _count;
}

export function nbody_get_px_ptr(): usize { return _px; }
export function nbody_get_py_ptr(): usize { return _py; }
export function nbody_get_vx_ptr(): usize { return _vx; }
export function nbody_get_vy_ptr(): usize { return _vy; }
export function nbody_get_mass_ptr(): usize { return _mass; }
export function nbody_get_state_ptr(): usize { return _state; }

export function nbody_get_max(): i32 { return _maxN; }
