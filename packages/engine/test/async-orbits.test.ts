import { expect, it } from 'vitest';
import { sampleOrbit, sampleOrbitAsync } from '../src/layers/sampleOrbit';

it('matches the accepted adaptive curve exactly despite asynchronous chunk arrivals', async () => {
  const visited: number[] = [];
  const evaluate = (t: number, out: Float64Array) => {
    out[0] = 149597870 * Math.cos(t);
    out[1] = 0.6 * 149597870 * Math.sin(t);
    out[2] = 1200 * Math.cos(2 * t);
  };
  const expected = sampleOrbit(evaluate, -Math.PI, Math.PI, 0.123);
  const actual = await sampleOrbitAsync(
    async (t, out) => {
      await Promise.resolve();
      visited.push(t);
      evaluate(t, out);
    },
    -Math.PI,
    Math.PI,
    0.123,
  );
  expect(actual).toEqual(expected);
  expect(visited).toContain(0.123);
});
it('preserves exact validity endpoints and propagates unavailable positions without publishing a partial curve', async () => {
  const from = -1755609810.8156552,
    to = 3187252869.1828775;
  const actual = await sampleOrbitAsync(
    async (t, out) => {
      expect(t).toBeGreaterThanOrEqual(from);
      expect(t).toBeLessThanOrEqual(to);
      out[0] = t;
    },
    from,
    to,
    844856120.002,
  );
  expect(actual[0]).toBe(from);
  expect(actual[actual.length - 3]).toBe(to);
  await expect(
    sampleOrbitAsync(
      async () => {
        throw Error('missing chunk');
      },
      from,
      to,
      0,
    ),
  ).rejects.toThrow('missing chunk');
  await expect(
    sampleOrbitAsync(
      async (_, out) => {
        out[0] = NaN;
      },
      from,
      to,
      0,
    ),
  ).rejects.toThrow('Non-finite');
});
