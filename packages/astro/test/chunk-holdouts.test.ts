import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { EXPLORABLE_BODIES } from '@space/domain';
import { StreamedEphemeris } from '../src/ephemeris/StreamedEphemeris';
import {
  decodeRuntimeChunk,
  runtimeChunkIndex,
} from '../src/ephemeris/RuntimeChunk';
import type {
  RuntimeChunkManifest,
  DecodedRuntimeChunk,
} from '../src/ephemeris/RuntimeChunk';
import { jdToTdb } from '../src/time/scales';
import manifestJson from '../../engine/src/assets/runtime-chunks.json';
const manifest = manifestJson as RuntimeChunkManifest,
  cache = new Map<number, DecodedRuntimeChunk>();
const stream = new StreamedEphemeris(manifest, (t) => {
  const i = runtimeChunkIndex(t);
  if (!cache.has(i)) {
    const b = readFileSync(
      `apps/web/public/data/chunks/${manifest.version}/${i}.bin`,
    );
    cache.set(
      i,
      decodeRuntimeChunk(
        b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
        i,
        manifest,
      ),
    );
  }
  return cache.get(i);
});
const mapping: Record<string, string> = {
  Sun: '10',
  Mercury: '199',
  Venus: '299',
  Earth: '399',
  Moon: '301',
  Mars: '499',
  Jupiter: '599',
  Saturn: '699',
  Uranus: '799',
  Neptune: '899',
  Pluto: '999',
};
type Row = { jdTdb: number; x: number; y: number; z: number };
function fixture(set: string, id: string): Row[] {
  return JSON.parse(
    readFileSync(`packages/astro/test/fixtures/${set}/${id}_0.json`, 'utf8'),
  ).rows;
}
for (const [body, id] of Object.entries(mapping))
  it(`${body}: fitted chunk coefficients retain all original independent references/holdouts`, () => {
    const provider = stream.analytic(body),
      out = new Float64Array(6);
    for (const set of ['horizons', 'holdout'])
      for (const row of fixture(set, id)) {
        expect(provider.stateAt(jdToTdb(row.jdTdb), out)).toMatchObject({
          ok: true,
          certainty: 'computed',
        });
        const norm = Math.hypot(row.x, row.y, row.z);
        expect(
          Math.abs(Math.hypot(out[0]!, out[1]!, out[2]!) - norm) / norm,
        ).toBeLessThan(1e-5);
        const cross = Math.hypot(
            out[1]! * row.z - out[2]! * row.y,
            out[2]! * row.x - out[0]! * row.z,
            out[0]! * row.y - out[1]! * row.x,
          ),
          dot = out[0]! * row.x + out[1]! * row.y + out[2]! * row.z;
        expect(Math.atan2(cross, dot) * 206264.806).toBeLessThan(30);
      }
  });
it('fitted Moon/Earth correction chunks retain independent 20km/60arcsecond geocentric limits', () => {
  const moon = fixture('holdout', '301'),
    earth = fixture('holdout', '399'),
    mp = stream.analytic('Moon'),
    ep = stream.analytic('Earth'),
    m = new Float64Array(6),
    e = new Float64Array(6);
  for (let i = 0; i < moon.length; i++) {
    const row = moon[i]!,
      er = earth[i]!,
      t = jdToTdb(row.jdTdb);
    expect(mp.stateAt(t, m).ok).toBe(true);
    expect(ep.stateAt(t, e).ok).toBe(true);
    const x = m[0]! - e[0]!,
      y = m[1]! - e[1]!,
      z = m[2]! - e[2]!,
      rx = row.x - er.x,
      ry = row.y - er.y,
      rz = row.z - er.z;
    expect(Math.hypot(x - rx, y - ry, z - rz)).toBeLessThan(20);
    expect(
      Math.atan2(
        Math.hypot(y * rz - z * ry, z * rx - x * rz, x * ry - y * rx),
        x * rx + y * ry + z * rz,
      ) * 206264.806,
    ).toBeLessThan(60);
  }
});
for (const [name, limit] of [
  ['phobos', 100],
  ['deimos', 100],
  ['titan', 1000],
  ['triton', 500],
  ['charon', 100],
  ['ceres', 1000],
] as const)
  it(`${name}: sliced orbital models retain all independent holdouts below ${limit}km`, () => {
    const body = EXPLORABLE_BODIES.find((b) => b.id.split(':')[1] === name)!,
      p = stream.catalog(body),
      out = new Float64Array(6);
    const rows = JSON.parse(
      readFileSync(
        `packages/astro/test/fixtures/phase-two/${name}-osculating-holdout.json`,
        'utf8',
      ),
    ).rows as string[][];
    for (const raw of rows) {
      const row = raw.map(Number);
      expect(p.stateAt(jdToTdb(row[0]!), out).ok).toBe(true);
      expect(
        Math.hypot(out[0]! - row[2]!, out[1]! - row[3]!, out[2]! - row[4]!),
      ).toBeLessThan(limit);
    }
  });
