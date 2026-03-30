// SoA memory layout manager for WASM linear memory
// All particle data stored as parallel arrays for cache-friendly access

// Global memory region pointers
let _baseOffset: usize = 0;
let _maxN: i32 = 0;

// Standard SoA layout: px, py, vx, vy, mass, state
// Each f32 array = maxN * 4 bytes
// State array (u8) = maxN bytes

export function getMaxN(): i32 {
  return _maxN;
}

/**
 * Allocate a contiguous SoA block for particle data.
 * Returns the base pointer. Layout:
 *   [0]            px    Float32[maxN]
 *   [maxN*4]       py    Float32[maxN]
 *   [maxN*8]       vx    Float32[maxN]
 *   [maxN*12]      vy    Float32[maxN]
 *   [maxN*16]      mass  Float32[maxN]
 *   [maxN*20]      state Uint8[maxN]
 * Total: maxN * 21 bytes
 */
export function soaAlloc(maxN: i32): usize {
  _maxN = maxN;
  // Align to 4-byte boundary for f32 access
  _baseOffset = (_baseOffset + 3) & ~3;
  const totalBytes = maxN * 21;
  // Grow memory if needed
  const currentPages = memory.size();
  const neededPages = <i32>((_baseOffset + totalBytes + 65535) >> 16);
  if (neededPages > currentPages) {
    memory.grow(neededPages - currentPages);
  }
  const base = _baseOffset;
  _baseOffset += totalBytes;
  // Zero-initialize
  memory.fill(base, 0, totalBytes);
  return base;
}

/**
 * Allocate a raw block of bytes, returns pointer.
 */
export function rawAlloc(bytes: i32): usize {
  // Align to 4-byte boundary
  _baseOffset = (_baseOffset + 3) & ~3;
  const currentPages = memory.size();
  const neededPages = <i32>((_baseOffset + bytes + 65535) >> 16);
  if (neededPages > currentPages) {
    memory.grow(neededPages - currentPages);
  }
  const ptr = _baseOffset;
  _baseOffset += bytes;
  memory.fill(ptr, 0, bytes);
  return ptr;
}

/**
 * Reset all allocations (use with caution).
 */
export function resetAlloc(): void {
  _baseOffset = 0;
  _maxN = 0;
}

// Offset helpers for standard SoA layout
@inline export function pxOffset(base: usize, maxN: i32): usize { return base; }
@inline export function pyOffset(base: usize, maxN: i32): usize { return base + <usize>(maxN) * 4; }
@inline export function vxOffset(base: usize, maxN: i32): usize { return base + <usize>(maxN) * 8; }
@inline export function vyOffset(base: usize, maxN: i32): usize { return base + <usize>(maxN) * 12; }
@inline export function massOffset(base: usize, maxN: i32): usize { return base + <usize>(maxN) * 16; }
@inline export function stateOffset(base: usize, maxN: i32): usize { return base + <usize>(maxN) * 20; }
