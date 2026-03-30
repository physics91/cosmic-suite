// Discrete Fourier Transform
// Used by: fourier.html

import { rawAlloc } from "./shared/memory";

let _buffer: usize = 0;
let _bufferSize: i32 = 0;

export function dft_init(maxSamples: i32): void {
  _bufferSize = maxSamples;
  _buffer = rawAlloc(maxSamples * 4 * 2); // real + imag
}

/**
 * Forward DFT: time domain → frequency domain
 * samplesPtr: Float32Array of N real samples
 * outMagPtr: Float32Array output of K magnitudes
 * outPhasePtr: Float32Array output of K phases
 */
export function dft_forward(samplesPtr: usize, n: i32, outMagPtr: usize, outPhasePtr: usize, k: i32): void {
  const invN = 1.0 / <f32>(n);

  for (let freq: i32 = 0; freq < k; freq++) {
    let real: f32 = 0;
    let imag: f32 = 0;
    const omega = 2.0 * Mathf.PI * <f32>(freq) * invN;

    for (let t: i32 = 0; t < n; t++) {
      const sample = load<f32>(samplesPtr + <usize>(t) * 4);
      const angle: f32 = <f32>(omega * <f32>(t));
      real += sample * Mathf.cos(angle);
      imag -= sample * Mathf.sin(angle);
    }

    const mag: f32 = <f32>(Mathf.sqrt(real * real + imag * imag) * invN);
    const phase = Mathf.atan2(imag, real);
    store<f32>(outMagPtr + <usize>(freq) * 4, mag);
    store<f32>(outPhasePtr + <usize>(freq) * 4, phase);
  }
}

/**
 * Inverse DFT: frequency domain → time domain
 * magPtr: Float32Array of K magnitudes
 * phasePtr: Float32Array of K phases
 * outPtr: Float32Array output of N samples
 */
export function dft_inverse(magPtr: usize, phasePtr: usize, k: i32, outPtr: usize, n: i32): void {
  for (let t: i32 = 0; t < n; t++) {
    let sum: f32 = 0;
    for (let freq: i32 = 0; freq < k; freq++) {
      const mag = load<f32>(magPtr + <usize>(freq) * 4);
      const phase = load<f32>(phasePtr + <usize>(freq) * 4);
      const angle: f32 = 2.0 * Mathf.PI * <f32>(freq) * <f32>(t) / <f32>(n) + phase;
      sum += mag * Mathf.cos(angle);
    }
    store<f32>(outPtr + <usize>(t) * 4, sum);
  }
}

export function dft_get_buffer_ptr(): usize { return _buffer; }
