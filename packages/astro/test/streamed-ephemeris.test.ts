import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { EXPLORABLE_BODIES } from '@space/domain';
import {
  decodeRuntimeChunk,
  runtimeChunkIndex,
} from '../src/ephemeris/RuntimeChunk';
import type {
  RuntimeChunkManifest,
  DecodedRuntimeChunk,
} from '../src/ephemeris/RuntimeChunk';
import manifestJson from '../../engine/src/assets/runtime-chunks.json';
import { StreamedEphemeris } from '../src/ephemeris/StreamedEphemeris';
import { createBodyProvider } from '../src/ephemeris/AstronomyEngineProvider';
const manifest = manifestJson as RuntimeChunkManifest;
function chunk(t: number) {
  const i = runtimeChunkIndex(t),
    b = readFileSync(
      `apps/web/public/data/chunks/${manifest.version}/${i}.bin`,
    );
  return decodeRuntimeChunk(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    i,
    manifest,
  );
}
it('missing corrections yield freshly computed approximate states at each requested date, not stale output', () => {
  const stream = new StreamedEphemeris(manifest, () => undefined),
    p = stream.analytic('Earth'),
    pure = createBodyProvider('Earth', () => undefined),
    out = new Float64Array(8).fill(19),
    reference = new Float64Array(6);
  for (const t of [0, 8e8, 2e9]) {
    expect(p.stateAt(t, out, 1)).toMatchObject({
      ok: true,
      certainty: 'approximate',
      stale: false,
    });
    pure.stateAt(t, reference);
    expect(Array.from(out.slice(1, 7))).toEqual(Array.from(reference));
    expect(p.certaintyAt(t)).toBe('approximate');
  }
  expect(out[0]).toBe(19);
  expect(out[7]).toBe(19);
});
it('a correction can arrive at a paused epoch and missing data on a later date falls back honestly', () => {
  let available: DecodedRuntimeChunk | undefined = undefined;
  const stream = new StreamedEphemeris(manifest, (t) =>
      available?.index === runtimeChunkIndex(t) ? available : undefined,
    ),
    p = stream.analytic('Earth'),
    out = new Float64Array(6);
  expect(p.stateAt(8e8, out)).toMatchObject({ certainty: 'approximate' });
  available = chunk(8e8);
  expect(p.stateAt(8e8, out)).toMatchObject({ certainty: 'computed' });
  expect(p.certaintyAt(8e8)).toBe('computed');
  expect(p.stateAt(2e9, out)).toMatchObject({
    certainty: 'approximate',
    stale: false,
  });
});
it('six missing orbital models report loading and never write previous-date positions', () => {
  let available: DecodedRuntimeChunk | undefined;
  const stream = new StreamedEphemeris(manifest, (t) =>
    available?.index === runtimeChunkIndex(t) ? available : undefined,
  );
  const models = EXPLORABLE_BODIES.filter(
    (b) => b.provenance.providerId === 'jpl-horizons-orbital-elements',
  );
  expect(models).toHaveLength(6);
  for (const body of models) {
    const p = stream.catalog(body),
      out = new Float64Array(8).fill(19);
    available = undefined;
    expect(p.stateAt(8e8, out, 1)).toEqual({ ok: false, reason: 'loading' });
    expect(Array.from(out)).toEqual(Array(8).fill(19));
    available = chunk(8e8);
    expect(p.stateAt(8e8, out, 1).ok).toBe(true);
    const previous = Array.from(out);
    expect(p.stateAt(2e9, out, 1)).toEqual({ ok: false, reason: 'loading' });
    expect(Array.from(out)).toEqual(previous);
  }
});
it('separate streamed engines do not share correction registration or availability', () => {
  const data = chunk(8e8),
    a = new StreamedEphemeris(manifest, () => data),
    b = new StreamedEphemeris(manifest, () => undefined),
    out = new Float64Array(6);
  expect(a.analytic('Mars').stateAt(8e8, out)).toMatchObject({
    certainty: 'computed',
  });
  expect(b.analytic('Mars').stateAt(8e8, out)).toMatchObject({
    certainty: 'approximate',
  });
});
