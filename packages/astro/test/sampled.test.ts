import { expect, it } from 'vitest';
import { SampledEphemerisProvider } from '../src/ephemeris/SampledEphemerisProvider';

function segment(times = [0, 3, 10]) {
  return {
    times: new Float64Array(times),
    states: new Float64Array(
      times.flatMap((t) => [t ** 3, 2 * t * t, -t, 3 * t * t, 4 * t, -1]),
    ),
    certainty: 'reconstructed' as const,
  };
}
it('reconstructs a known cubic and its velocity on irregular intervals and endpoints', () => {
  const provider = new SampledEphemerisProvider('test', 'ICRF_HELIO', [
    segment(),
  ]);
  const out = new Float64Array(8).fill(99);
  for (const t of [0, 0.1, 2.9, 3, 3.1, 7, 10]) {
    expect(provider.stateAt(t, out, 1)).toMatchObject({
      ok: true,
      certainty: 'reconstructed',
      frame: 'ICRF_HELIO',
    });
    const expected = [t ** 3, 2 * t * t, -t, 3 * t * t, 4 * t, -1];
    for (let i = 0; i < 6; i++)
      expect(out[i + 1]).toBeCloseTo(expected[i]!, 10);
    expect(out[0]).toBe(99);
    expect(out[7]).toBe(99);
  }
  expect(provider.stateAt(1, out)).toBe(provider.stateAt(2, out));
});
it('preserves gaps, refuses extrapolation and selects the newer segment at shared endpoints', () => {
  const provider = new SampledEphemerisProvider('test', 'ICRF_SSB', [
    segment([0, 1]),
    { ...segment([1, 2]), certainty: 'predicted', stale: true },
    segment([4, 5]),
  ]);
  const out = new Float64Array(6).fill(42);
  for (const t of [-1, 6, NaN, Infinity])
    expect(provider.stateAt(t, out)).toEqual({
      ok: false,
      reason: 'out-of-validity',
    });
  expect(provider.stateAt(3, out)).toEqual({ ok: false, reason: 'no-data' });
  expect(Array.from(out)).toEqual([42, 42, 42, 42, 42, 42]);
  expect(provider.stateAt(1, out)).toMatchObject({
    ok: true,
    certainty: 'predicted',
    stale: true,
  });
  expect(provider.certaintyAt(2)).toBe('predicted');
  expect(provider.certaintyAt(3)).toBe('approximate');
});
it('validates and owns its input data', () => {
  const input = segment(),
    provider = new SampledEphemerisProvider('test', 'ICRF_SSB', [input]);
  input.states.fill(NaN);
  input.times.fill(NaN);
  const out = new Float64Array(6);
  expect(provider.stateAt(1, out).ok).toBe(true);
  expect(out[0]).toBeCloseTo(1, 12);
  expect(() => new SampledEphemerisProvider('test', 'ICRF_SSB', [])).toThrow();
  for (const times of [[1, 1], [2, 1], [0, NaN], [1]])
    expect(
      () => new SampledEphemerisProvider('test', 'ICRF_SSB', [segment(times)]),
    ).toThrow();
  expect(
    () =>
      new SampledEphemerisProvider('test', 'ICRF_SSB', [
        segment([0, 2]),
        segment([1, 3]),
      ]),
  ).toThrow();
});
