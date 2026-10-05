import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { FrameId } from '@space/domain';
import manifestJson from '../../engine/src/assets/runtime-chunks.json';
import {
  decodeRuntimeChunk,
  runtimeChunkIndex,
  RUNTIME_CHUNK_SECONDS,
} from '../src/ephemeris/RuntimeChunk';
import type { RuntimeChunkManifest } from '../src/ephemeris/RuntimeChunk';
import { ResidualTable } from '../src/ephemeris/ResidualTable';
import { OsculatingElementsProvider } from '../src/ephemeris/OsculatingElementsProvider';
const manifest = manifestJson as RuntimeChunkManifest;
function buffer(file: string): ArrayBuffer {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
const load = (index: number) =>
  decodeRuntimeChunk(
    buffer(`apps/web/public/data/chunks/${manifest.version}/${index}.bin`),
    index,
    manifest,
  );
const out = new Float64Array(6),
  expected = new Float64Array(6),
  neighbor = new Float64Array(6);
for (const body of manifest.bodies) {
  it(`${body.id}: every fixed time boundary preserves the original position and derivative`, () => {
    const original =
      body.kind === 'correction'
        ? new ResidualTable(
            buffer(
              `apps/web/public/data/corrections/${body.id.toLowerCase()}.bin`,
            ),
          )
        : new OsculatingElementsProvider(
            body.id,
            body.frame,
            buffer(`apps/web/public/data/orbits/${body.id.split(':')[1]}.bin`),
          );
    let comparisons = 0;
    let left = load(manifest.fromIndex);
    for (
      let index = manifest.fromIndex + 1;
      index <= manifest.toIndex;
      index++
    ) {
      const right = load(index),
        boundary = index * RUNTIME_CHUNK_SECONDS;
      const l =
        body.kind === 'correction'
          ? left.corrections.get(body.id)!
          : left.orbits.get(body.id)!;
      const r =
        body.kind === 'correction'
          ? right.corrections.get(body.id)!
          : right.orbits.get(body.id)!;
      for (const delta of [-0.001, 0, 0.001]) {
        const t = boundary + delta;
        expected.fill(0);
        out.fill(0);
        neighbor.fill(0);
        if (original instanceof ResidualTable) {
          if (!original.addTo(t, expected)) continue;
          const lc = left.corrections.get(body.id)!,
            rc = right.corrections.get(body.id)!;
          expect(lc.addTo(t, out)).toBe(true);
          expect(rc.addTo(t, neighbor)).toBe(true);
          for (let j = 0; j < 6; j++) {
            expect(Math.abs(out[j]! - expected[j]!)).toBeLessThan(
              j < 3 ? 1e-6 : 1e-10,
            );
            expect(neighbor[j]).toBe(out[j]);
          }
        } else {
          if (!original.stateAt(t, expected).ok) continue;
          // The other chunk is required exactly at the common boundary; around
          // it, choose the chunk containing the date, including both neighbors.
          const current = delta < 0 ? l : r;
          expect('stateAt' in current && current.stateAt(t, out).ok).toBe(true);
          expect(Array.from(out)).toEqual(Array.from(expected));
          if (delta === 0) {
            expect('stateAt' in l && l.stateAt(t, neighbor).ok).toBe(true);
            expect(Array.from(neighbor)).toEqual(Array.from(out));
          }
        }
        comparisons++;
      }
      left = right;
    }
    expect(comparisons).toBeGreaterThan(7800);
  }, 30000);
}
it('rejects malformed, wrong-date, truncated and duplicate entry chunks', () => {
  const index = runtimeChunkIndex(8e8),
    source = buffer(
      `apps/web/public/data/chunks/${manifest.version}/${index}.bin`,
    );
  expect(() => decodeRuntimeChunk(source, index + 1, manifest)).toThrow();
  expect(() =>
    decodeRuntimeChunk(source.slice(0, -1), index, manifest),
  ).toThrow();
  const wrong = source.slice(0);
  new DataView(wrong).setUint32(16, 1000, true);
  expect(() => decodeRuntimeChunk(wrong, index, manifest)).toThrow();
  const bad = source.slice(0);
  new DataView(bad).setFloat64(16 + 8 + 48, NaN, true);
  expect(() => decodeRuntimeChunk(bad, index, manifest)).toThrow();
});
it('does not extrapolate or overwrite failed output, including offset sentinels', () => {
  const chunk = load(runtimeChunkIndex(8e8));
  for (const correction of chunk.corrections.values()) {
    const out = new Float64Array(8).fill(19);
    expect(correction.addTo(NaN, out, 1)).toBe(false);
    expect(correction.addTo(-1e20, out, 1)).toBe(false);
    expect(Array.from(out)).toEqual(Array(8).fill(19));
  }
  for (const [id, provider] of chunk.orbits) {
    const out = new Float64Array(8).fill(19);
    expect(provider.stateAt(-1e20, out, 1).ok).toBe(false);
    expect(Array.from(out)).toEqual(Array(8).fill(19));
    expect(provider.frame).toBe(
      manifest.bodies.find((b) => b.id === id)!.frame as FrameId,
    );
  }
});
