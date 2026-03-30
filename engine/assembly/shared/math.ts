// Fast math utilities for physics computations

@inline
export function fastInvSqrt(x: f32): f32 {
  const half = x * 0.5;
  let i = reinterpret<i32>(x);
  i = 0x5f3759df - (i >> 1);
  let y = reinterpret<f32>(i);
  y = y * (1.5 - half * y * y);
  return y;
}

@inline
export function distSq(x1: f32, y1: f32, x2: f32, y2: f32): f32 {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

@inline
export function dist(x1: f32, y1: f32, x2: f32, y2: f32): f32 {
  return Mathf.sqrt(distSq(x1, y1, x2, y2));
}

@inline
export function clamp(val: f32, min: f32, max: f32): f32 {
  return Mathf.max(min, Mathf.min(max, val));
}

@inline
export function lerp(a: f32, b: f32, t: f32): f32 {
  return a + (b - a) * t;
}
