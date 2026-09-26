import { expect, it } from 'vitest';
import { KeplerProvider, solveKepler } from '../src/ephemeris/KeplerProvider';
const base = {
  epochTdbSec: 0,
  semiMajorAxisKm: 7000,
  eccentricity: 0,
  inclinationRad: 0.3,
  ascendingNodeRad: 1,
  argumentOfPeriapsisRad: 0.7,
  meanAnomalyRad: 0,
  gravitationalParameterKm3PerSec2: 398600.4418,
};
it('solves elliptic and hyperbolic equations including near-parabolic periapsis', () => {
  for (const e of [0, 0.5, 0.9, 0.99, 0.9999, 1.0001, 1.1, 2, 10])
    for (const m of [-3, -0.01, -1e-6, 0, 1e-6, 0.01, 3]) {
      const a = solveKepler(m, e);
      const actual = e < 1 ? a - e * Math.sin(a) : e * Math.sinh(a) - a;
      expect(actual).toBeCloseTo(m, 12);
    }
  expect(solveKepler(1, 1)).toBeNaN();
  expect(solveKepler(NaN, 0.5)).toBeNaN();
});
it('conserves energy and angular momentum, with velocity equal to the position derivative', () => {
  for (const e of [0, 0.6, 0.99, 1.5]) {
    const a = e < 1 ? 7000 : -7000,
      provider = new KeplerProvider('test', 'ICRF_BODY:earth', {
        ...base,
        eccentricity: e,
        semiMajorAxisKm: a,
      });
    const state = new Float64Array(6),
      before = new Float64Array(6),
      after = new Float64Array(6);
    for (const t of [-1000, 0, 1000]) {
      expect(provider.stateAt(t, state).ok).toBe(true);
      const [x, y, z, vx, vy, vz] = Array.from(state) as [
        number,
        number,
        number,
        number,
        number,
        number,
      ];
      const radius = Math.hypot(x, y, z),
        speed = Math.hypot(vx, vy, vz);
      expect(
        speed ** 2 / 2 - base.gravitationalParameterKm3PerSec2 / radius,
      ).toBeCloseTo(-base.gravitationalParameterKm3PerSec2 / (2 * a), 8);
      expect(
        Math.hypot(y * vz - z * vy, z * vx - x * vz, x * vy - y * vx),
      ).toBeCloseTo(
        Math.sqrt(base.gravitationalParameterKm3PerSec2 * a * (1 - e * e)),
        7,
      );
      provider.stateAt(t - 0.0001, before);
      provider.stateAt(t + 0.0001, after);
      for (let i = 0; i < 3; i++)
        expect((after[i]! - before[i]!) / 0.0002).toBeCloseTo(state[i + 3]!, 4);
    }
  }
});
it('validates conics and preserves output on invalid epochs', () => {
  for (const change of [
    { eccentricity: 1 },
    { eccentricity: -1 },
    { semiMajorAxisKm: -1 },
    { gravitationalParameterKm3PerSec2: 0 },
  ])
    expect(
      () => new KeplerProvider('test', 'ICRF_SSB', { ...base, ...change }),
    ).toThrow();
  const provider = new KeplerProvider('test', 'ICRF_SSB', base),
    out = new Float64Array(8).fill(99);
  expect(provider.stateAt(NaN, out).ok).toBe(false);
  expect(provider.stateAt(31 * 86400, out).ok).toBe(false);
  expect(Array.from(out)).toEqual(Array(8).fill(99));
  expect(provider.stateAt(0, out, 1)).toBe(provider.stateAt(1, out, 1));
  expect(out[0]).toBe(99);
  expect(out[7]).toBe(99);
});
