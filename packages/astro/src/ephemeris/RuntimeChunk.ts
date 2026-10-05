import type { FrameId } from '@space/domain';
import { PolynomialCorrection } from './PolynomialCorrection';
import { OsculatingElementsProvider } from './OsculatingElementsProvider';

export const RUNTIME_CHUNK_SECONDS = 28 * 86400;
export const RUNTIME_CHUNK_MAGIC = 0x31435453; // STC1
export interface RuntimeBody {
  id: string;
  kind: 'correction' | 'orbit';
  frame: FrameId;
  startTdbSec: number;
  stepSec: number;
  count: number;
}
export interface RuntimeChunkManifest {
  format: 1;
  version: string;
  fromIndex: number;
  toIndex: number;
  bodies: readonly RuntimeBody[];
}
export interface DecodedRuntimeChunk {
  index: number;
  bytes: number;
  corrections: Map<string, PolynomialCorrection>;
  orbits: Map<string, OsculatingElementsProvider>;
}
export function runtimeChunkIndex(tdbSec: number): number {
  return Math.floor(tdbSec / RUNTIME_CHUNK_SECONDS);
}
export function decodeRuntimeChunk(
  buffer: ArrayBuffer,
  index: number,
  manifest: RuntimeChunkManifest,
): DecodedRuntimeChunk {
  const view = new DataView(buffer);
  if (
    !Number.isInteger(index) ||
    index < manifest.fromIndex ||
    index > manifest.toIndex ||
    buffer.byteLength < 16 ||
    buffer.byteLength > 16384 ||
    view.getUint32(0, true) !== RUNTIME_CHUNK_MAGIC ||
    view.getUint32(4, true) !== 1 ||
    view.getInt32(8, true) !== index ||
    view.getUint32(12, true) !== manifest.bodies.length
  )
    throw Error('Invalid time chunk header/coverage');
  const corrections = new Map<string, PolynomialCorrection>(),
    orbits = new Map<string, OsculatingElementsProvider>();
  const seen = new Set<number>();
  let cursor = 16;
  for (let n = 0; n < manifest.bodies.length; n++) {
    if (cursor + 8 > buffer.byteLength) throw Error('Truncated time chunk');
    const bodyIndex = view.getUint32(cursor, true),
      size = view.getUint32(cursor + 4, true);
    cursor += 8;
    const body = manifest.bodies[bodyIndex];
    if (
      !body ||
      seen.has(bodyIndex) ||
      size < 24 ||
      cursor + size > buffer.byteLength
    )
      throw Error('Invalid time chunk entry');
    seen.add(bodyIndex);
    const payload = buffer.slice(cursor, cursor + size);
    cursor += size;
    if (body.kind === 'correction') {
      const correction = new PolynomialCorrection(payload);
      if (
        correction.startTdbSec !== body.startTdbSec ||
        correction.stepSec !== body.stepSec ||
        correction.fullCount !== body.count
      )
        throw Error('Correction does not match versioned grid');
      corrections.set(body.id, correction);
    } else {
      const header = new DataView(payload),
        start = header.getFloat64(0, true);
      const firstIndex = Math.round((start - body.startTdbSec) / body.stepSec);
      if (
        header.getFloat64(8, true) !== body.stepSec ||
        start !== body.startTdbSec + firstIndex * body.stepSec
      )
        throw Error('Orbit does not match versioned grid');
      orbits.set(
        body.id,
        new OsculatingElementsProvider(body.id, body.frame, payload, {
          startTdbSec: body.startTdbSec,
          firstIndex,
          fullCount: body.count,
        }),
      );
    }
  }
  if (cursor !== buffer.byteLength) throw Error('Trailing time chunk data');
  return { index, bytes: buffer.byteLength, corrections, orbits };
}
