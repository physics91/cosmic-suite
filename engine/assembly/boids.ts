// Boid flocking simulation with spatial hash
// Used by: flocking.html, swarm-gravity.html

import { soaAlloc, rawAlloc, pxOffset, pyOffset, vxOffset, vyOffset, massOffset, stateOffset } from "./shared/memory";
import { spatial_init, spatial_build, spatial_query, spatial_get_results_ptr } from "./shared/spatial";
import { clamp } from "./shared/math";

let _base: usize = 0;
let _maxN: i32 = 0;
let _count: i32 = 0;

let _px: usize = 0;
let _py: usize = 0;
let _vx: usize = 0;
let _vy: usize = 0;
let _mass: usize = 0;  // reused as "type": 0=boid, 1=predator
let _state: usize = 0;

// Flocking parameters
let _separation: f32 = 25.0;
let _alignment: f32 = 0.05;
let _cohesion: f32 = 0.005;
let _maxSpeed: f32 = 4.0;
let _maxForce: f32 = 0.3;
let _perceptionRadius: f32 = 50.0;
let _separationRadius: f32 = 25.0;

// Attractor (gravity well / mouse)
let _attractorX: f32 = 0;
let _attractorY: f32 = 0;
let _attractorStrength: f32 = 0;

// World bounds
let _worldW: f32 = 0;
let _worldH: f32 = 0;

// Temp force accumulators (pre-allocated)
let _axBuf: usize = 0;
let _ayBuf: usize = 0;

export function boids_init(maxN: i32, worldW: f32, worldH: f32): void {
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

  // Force accumulator buffers (use rawAlloc to avoid aliasing with spatial hash)
  _axBuf = rawAlloc(maxN * 4);
  _ayBuf = rawAlloc(maxN * 4);

  spatial_init(worldW, worldH, _perceptionRadius, maxN);
}

export function boids_set_params(
  separation: f32, alignment: f32, cohesion: f32,
  maxSpeed: f32, maxForce: f32,
  perceptionRadius: f32, separationRadius: f32
): void {
  _separation = separation;
  _alignment = alignment;
  _cohesion = cohesion;
  _maxSpeed = maxSpeed;
  _maxForce = maxForce;
  _perceptionRadius = perceptionRadius;
  _separationRadius = separationRadius;
}

export function boids_add(x: f32, y: f32, vx: f32, vy: f32, type: f32): i32 {
  if (_count >= _maxN) return -1;
  const i = _count;
  store<f32>(_px + <usize>(i) * 4, x);
  store<f32>(_py + <usize>(i) * 4, y);
  store<f32>(_vx + <usize>(i) * 4, vx);
  store<f32>(_vy + <usize>(i) * 4, vy);
  store<f32>(_mass + <usize>(i) * 4, type);
  store<u8>(_state + <usize>(i), 1);
  _count++;
  return i;
}

export function boids_set_attractor(x: f32, y: f32, strength: f32): void {
  _attractorX = x;
  _attractorY = y;
  _attractorStrength = strength;
}

export function boids_step(dt: f32): void {
  spatial_build(_px, _py, _count);

  const maxSpeed = _maxSpeed;
  const maxForce = _maxForce;
  const sepRadius = _separationRadius;
  const sepRadiusSq = sepRadius * sepRadius;

  // Accumulate forces
  for (let i: i32 = 0; i < _count; i++) {
    const xi = load<f32>(_px + <usize>(i) * 4);
    const yi = load<f32>(_py + <usize>(i) * 4);
    const vxi = load<f32>(_vx + <usize>(i) * 4);
    const vyi = load<f32>(_vy + <usize>(i) * 4);

    let sepX: f32 = 0, sepY: f32 = 0, sepCount: i32 = 0;
    let aliX: f32 = 0, aliY: f32 = 0, aliCount: i32 = 0;
    let cohX: f32 = 0, cohY: f32 = 0, cohCount: i32 = 0;

    const nCount = spatial_query(xi, yi, _perceptionRadius, _px, _py);
    const resultsPtr = spatial_get_results_ptr();

    for (let n: i32 = 0; n < nCount; n++) {
      const j = load<i32>(resultsPtr + <usize>(n) * 4);
      if (j == i) continue;

      const xj = load<f32>(_px + <usize>(j) * 4);
      const yj = load<f32>(_py + <usize>(j) * 4);
      const dx = xj - xi;
      const dy = yj - yi;
      const dSq = dx * dx + dy * dy;

      // Separation
      if (dSq < sepRadiusSq && dSq > 0) {
        const invD: f32 = 1.0 / Mathf.sqrt(dSq);
        sepX -= <f32>(dx * invD);
        sepY -= <f32>(dy * invD);
        sepCount++;
      }

      // Alignment
      aliX += load<f32>(_vx + <usize>(j) * 4);
      aliY += load<f32>(_vy + <usize>(j) * 4);
      aliCount++;

      // Cohesion
      cohX += xj;
      cohY += yj;
      cohCount++;
    }

    let ax: f32 = 0, ay: f32 = 0;

    // Separation force
    if (sepCount > 0) {
      ax += sepX / <f32>(sepCount) * _separation;
      ay += sepY / <f32>(sepCount) * _separation;
    }

    // Alignment force
    if (aliCount > 0) {
      ax += (aliX / <f32>(aliCount) - vxi) * _alignment;
      ay += (aliY / <f32>(aliCount) - vyi) * _alignment;
    }

    // Cohesion force
    if (cohCount > 0) {
      ax += (cohX / <f32>(cohCount) - xi) * _cohesion;
      ay += (cohY / <f32>(cohCount) - yi) * _cohesion;
    }

    // Attractor force
    if (_attractorStrength != 0) {
      const adx = _attractorX - xi;
      const ady = _attractorY - yi;
      const aDist = Mathf.sqrt(adx * adx + ady * ady) + 1.0;
      ax += adx / aDist * _attractorStrength;
      ay += ady / aDist * _attractorStrength;
    }

    // Clamp force
    const fMag = Mathf.sqrt(ax * ax + ay * ay);
    if (fMag > maxForce) {
      const scale = maxForce / fMag;
      ax *= scale;
      ay *= scale;
    }

    store<f32>(_axBuf + <usize>(i) * 4, ax);
    store<f32>(_ayBuf + <usize>(i) * 4, ay);
  }

  // Apply forces + update positions
  for (let i: i32 = 0; i < _count; i++) {
    let vx = load<f32>(_vx + <usize>(i) * 4) + load<f32>(_axBuf + <usize>(i) * 4) * dt;
    let vy = load<f32>(_vy + <usize>(i) * 4) + load<f32>(_ayBuf + <usize>(i) * 4) * dt;

    // Clamp speed
    const speed = Mathf.sqrt(vx * vx + vy * vy);
    if (speed > maxSpeed) {
      const scale = maxSpeed / speed;
      vx *= scale;
      vy *= scale;
    }

    store<f32>(_vx + <usize>(i) * 4, vx);
    store<f32>(_vy + <usize>(i) * 4, vy);

    let x = load<f32>(_px + <usize>(i) * 4) + vx * dt;
    let y = load<f32>(_py + <usize>(i) * 4) + vy * dt;

    // Wrap around
    if (x < 0) x += _worldW;
    if (x >= _worldW) x -= _worldW;
    if (y < 0) y += _worldH;
    if (y >= _worldH) y -= _worldH;

    store<f32>(_px + <usize>(i) * 4, x);
    store<f32>(_py + <usize>(i) * 4, y);
  }
}

export function boids_get_count(): i32 { return _count; }
export function boids_get_px_ptr(): usize { return _px; }
export function boids_get_py_ptr(): usize { return _py; }
export function boids_get_vx_ptr(): usize { return _vx; }
export function boids_get_vy_ptr(): usize { return _vy; }
export function boids_get_type_ptr(): usize { return _mass; }
export function boids_get_max(): i32 { return _maxN; }
