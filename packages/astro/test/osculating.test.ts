import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { OsculatingElementsProvider } from '../src/ephemeris/OsculatingElementsProvider';
import { jdToTdb } from '../src/time/scales';
import type { FrameId } from '@space/domain';
function load(name: string) {
  const metadata = JSON.parse(
    readFileSync(
      new URL(
        `../../../apps/web/public/data/orbits/${name}.provenance.json`,
        import.meta.url,
      ),
      'utf8',
    ),
  ) as { frame: FrameId };
  const bytes = readFileSync(
    new URL(
      `../../../apps/web/public/data/orbits/${name}.bin`,
      import.meta.url,
    ),
  );
  return new OsculatingElementsProvider(
    name,
    metadata.frame,
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}
for (const [name, maxErrorKm] of [
  ['phobos', 100],
  ['deimos', 100],
  ['titan', 1000],
  ['triton', 500],
  ['charon', 100],
  ['ceres', 1000],
] as const) {
  it(`${name}: independent off-grid Horizons comparison below ${maxErrorKm} km`, () => {
    const provider = load(name),
      out = new Float64Array(6);
    const fixture = JSON.parse(
      readFileSync(
        new URL(
          `./fixtures/phase-two/${name}-osculating-holdout.json`,
          import.meta.url,
        ),
        'utf8',
      ),
    ) as { rows: string[][] };
    for (const raw of fixture.rows) {
      const row = raw.map(Number);
      expect(provider.stateAt(jdToTdb(row[0]!), out).ok).toBe(true);
      const error = Math.hypot(
        out[0]! - row[2]!,
        out[1]! - row[3]!,
        out[2]! - row[4]!,
      );
      expect(error, `${name} JD ${row[0]}`).toBeLessThan(maxErrorKm);
    }
  });
}
it('blended velocities equal position derivatives and knots have continuous states', () => {
  const provider = load('phobos'),
    a = new Float64Array(6),
    b = new Float64Array(6),
    state = new Float64Array(6);
  for (const t of [
    0,
    1234.5,
    8e8,
    provider.validity.fromTdb + 86400,
    provider.validity.fromTdb + 86400 + 0.01,
  ]) {
    provider.stateAt(t, state);
    provider.stateAt(t - 0.01, a);
    provider.stateAt(t + 0.01, b);
    for (let i = 0; i < 3; i++)
      expect((b[i]! - a[i]!) / 0.02).toBeCloseTo(state[i + 3]!, 4);
  }
});
it('refuses extrapolation and malformed tables without writing failed output', () => {
  const provider = load('ceres'),
    out = new Float64Array(8).fill(99);
  for (const t of [
    NaN,
    Infinity,
    provider.validity.fromTdb - 1,
    provider.validity.toTdb + 1,
  ])
    expect(provider.stateAt(t, out).ok).toBe(false);
  expect(Array.from(out)).toEqual(Array(8).fill(99));
  expect(provider.stateAt(0, out, 1)).toBe(provider.stateAt(1, out, 1));
  expect(out[0]).toBe(99);
  expect(out[7]).toBe(99);
  expect(
    () => new OsculatingElementsProvider('bad', 'ICRF_SSB', new ArrayBuffer(0)),
  ).toThrow();
});
