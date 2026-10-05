import { CORRECTION_MAGIC } from '../../packages/astro/src/ephemeris/PolynomialCorrection';
import {
  RUNTIME_CHUNK_SECONDS,
  RUNTIME_CHUNK_MAGIC,
} from '../../packages/astro/src/ephemeris/RuntimeChunk';
import type { RuntimeBody } from '../../packages/astro/src/ephemeris/RuntimeChunk';

export interface ChunkInput {
  body: RuntimeBody;
  buffer: ArrayBuffer;
}
export function encodeRuntimeChunk(
  index: number,
  inputs: readonly ChunkInput[],
): ArrayBuffer {
  const from = index * RUNTIME_CHUNK_SECONDS,
    to = from + RUNTIME_CHUNK_SECONDS;
  const payloads = inputs.map(({ body, buffer }) => {
    const original = new DataView(buffer),
      { startTdbSec, stepSec, count } = body;
    const first = Math.max(
      0,
      Math.min(count - 2, Math.floor((from - startTdbSec) / stepSec)),
    );
    const lastInterval = Math.max(
      first,
      Math.min(count - 2, Math.floor((to - startTdbSec) / stepSec)),
    );
    if (body.kind === 'correction') {
      const intervals = lastInterval - first + 1,
        result = new ArrayBuffer(48 + intervals * 96),
        view = new DataView(result);
      view.setUint32(0, CORRECTION_MAGIC, true);
      view.setUint32(4, 1, true);
      [startTdbSec, stepSec, first, intervals, count].forEach((v, i) =>
        view.setFloat64(8 + i * 8, v, true),
      );
      for (let n = 0; n < intervals; n++)
        for (let axis = 0; axis < 3; axis++) {
          const a = 24 + (first + n) * 24 + axis * 4,
            b = a + 24;
          const p0 = original.getFloat32(a, true),
            p1 = original.getFloat32(b, true),
            d0 = stepSec * original.getFloat32(a + 12, true),
            d1 = stepSec * original.getFloat32(b + 12, true);
          // The exact polynomial fitted to both endpoint positions and derivatives.
          const coefficients = [
            p0,
            d0,
            3 * (p1 - p0) - 2 * d0 - d1,
            2 * (p0 - p1) + d0 + d1,
          ];
          coefficients.forEach((v, j) =>
            view.setFloat64(48 + (n * 12 + axis * 4 + j) * 8, v, true),
          );
        }
      return result;
    }
    const rows = lastInterval - first + 2,
      result = new ArrayBuffer(24 + rows * 56),
      view = new DataView(result);
    [startTdbSec + first * stepSec, stepSec, rows].forEach((v, i) =>
      view.setFloat64(i * 8, v, true),
    );
    new Uint8Array(result, 24).set(
      new Uint8Array(buffer, 24 + first * 56, rows * 56),
    );
    return result;
  });
  const result = new ArrayBuffer(
      16 + payloads.reduce((sum, p) => sum + 8 + p.byteLength, 0),
    ),
    view = new DataView(result);
  view.setUint32(0, RUNTIME_CHUNK_MAGIC, true);
  view.setUint32(4, 1, true);
  view.setInt32(8, index, true);
  view.setUint32(12, inputs.length, true);
  let cursor = 16;
  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i]!;
    view.setUint32(cursor, i, true);
    view.setUint32(cursor + 4, payload.byteLength, true);
    cursor += 8;
    new Uint8Array(result, cursor, payload.byteLength).set(
      new Uint8Array(payload),
    );
    cursor += payload.byteLength;
  }
  return result;
}
