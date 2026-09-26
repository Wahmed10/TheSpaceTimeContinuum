import { expect, it } from 'vitest';
import { createSolarSystemFrameTree } from '../src/frames/solarSystemFrames';
import { FrameTree } from '../src/frames/FrameTree';
import { bodyOrientation } from '../src/orientation/bodyOrientation';
import { isoToTdb, utcMsToTdb } from '../src/time/scales';

it('memoizes origins, invalidates on frame stamps and composes nested rotating origins', () => {
  const tree = new FrameTree();
  let calls = 0;
  tree.register({
    id: 'ICRF_BODY:test',
    parent: 'ICRF_SSB',
    origin: {
      id: 'test',
      frame: 'ICRF_SSB',
      method: 'static',
      validity: 'unbounded',
      certaintyAt: () => 'computed',
      stateAt: (t, out) => {
        calls++;
        out.set([100 + 2 * t, 200, 300, 2, 0, 0]);
        return {
          ok: true,
          frame: 'ICRF_SSB',
          certainty: 'computed',
          stale: false,
        };
      },
    },
  });
  tree.register({
    id: 'FIXED:test',
    parent: 'ICRF_BODY:test',
    rotation: (t, out) => {
      const c = Math.cos(t * 0.001),
        s = Math.sin(t * 0.001);
      out.set([c, -s, 0, s, c, 0, 0, 0, 1]);
    },
  });
  tree.register({
    id: 'ICRF_BODY:child',
    parent: 'FIXED:test',
    origin: {
      id: 'child',
      frame: 'FIXED:test',
      method: 'static',
      validity: 'unbounded',
      certaintyAt: () => 'computed',
      stateAt: (_t, out) => {
        out.set([10, 0, 0, 0, 0, 0]);
        return {
          ok: true,
          frame: 'FIXED:test',
          certainty: 'computed',
          stale: false,
        };
      },
    },
  });
  const out = new Float64Array(6);
  tree.beginFrame(0, 1);
  tree.resolveOrigin('ICRF_BODY:child', 0, out);
  expect(Array.from(out.slice(0, 3))).toEqual([110, 200, 300]);
  expect(out[3]).toBe(2);
  expect(out[4]).toBeCloseTo(0.01, 8);
  tree.resolveOrigin('ICRF_BODY:test', 0, out);
  tree.beginFrame(0, 1);
  tree.resolveOrigin('ICRF_BODY:child', 0, out);
  expect(calls).toBe(1);
  tree.beginFrame(0, 2);
  tree.resolveOrigin('ICRF_BODY:child', 0, out);
  expect(calls).toBe(2);
  tree.resolveOrigin('ICRF_BODY:child', 10, out);
  expect(calls).toBe(3);
  expect(out[0]).toBeCloseTo(120 + 10 * Math.cos(0.01), 10);
  expect(() => tree.register({ id: 'FIXED:test', parent: 'ICRF_SSB' })).toThrow(
    'Duplicate',
  );
  expect(() =>
    tree.register({ id: 'FIXED:missing', parent: 'ICRF_BODY:missing' }),
  ).toThrow('parent');
});

it('preserves existing hero texture orientations across all quaternion branches', () => {
  const tree = createSolarSystemFrameTree();
  const expected = new Float64Array(4),
    actual = new Float64Array(4);
  for (const body of ['Sun', 'Earth', 'Moon', 'Mars'])
    for (let day = 0; day < 30; day++) {
      bodyOrientation(body, day * 86400, expected);
      expect(
        tree.resolveTextureOrientation(
          `FIXED:${body.toLowerCase()}`,
          day * 86400,
          actual,
        ),
      ).toBe(true);
      const dot = actual.reduce(
        (sum, value, i) => sum + value * expected[i]!,
        0,
      );
      expect(Math.abs(dot)).toBeCloseTo(1, 12);
    }
});

it('round trips positions and velocities, including in-place rotating states', () => {
  const tree = createSolarSystemFrameTree();
  const input = new Float64Array([7000, -2400, 800, 1, 7, -2]);
  const out = new Float64Array(6);
  for (const date of ['1950-01-01', '2000-01-01', '2026-09-23', '2099-01-01']) {
    const t = isoToTdb(`${date}T12:00:00Z`);
    for (const frame of [
      'ICRF_SSB',
      'ICRF_HELIO',
      'ICRF_EMB',
      'FIXED:earth',
      'FIXED:mars',
      'TEME_EARTH',
    ] as const) {
      expect(tree.transformState('ICRF_BODY:earth', frame, t, input, out)).toBe(
        true,
      );
      expect(tree.transformState(frame, 'ICRF_BODY:earth', t, out, out)).toBe(
        true,
      );
      expect(
        Math.hypot(...out.map((v, i) => v - input[i]!)) / Math.hypot(...input),
      ).toBeLessThan(1e-9);
    }
  }
});

it('rotates the Earth equator by 360.9856 degrees per day with transport velocity', () => {
  const tree = createSolarSystemFrameTree();
  const t = isoToTdb('2026-09-23T12:00:00Z');
  const input = new Float64Array([6378.137, 0, 0, 0, 0, 0]);
  const a = new Float64Array(6),
    b = new Float64Array(6);
  tree.transformState('FIXED:earth', 'ICRF_BODY:earth', t, input, a);
  tree.transformState('FIXED:earth', 'ICRF_BODY:earth', t + 86400, input, b);
  const angle =
    (Math.acos(
      (a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!) / 6378.137 ** 2,
    ) *
      180) /
    Math.PI;
  expect(angle).toBeCloseTo(0.9856, 3);
  expect(Math.hypot(a[3]!, a[4]!, a[5]!)).toBeCloseTo(0.4651, 4);
  tree.transformPosition('FIXED:earth', 'ICRF_BODY:earth', t + 0.5, input, b);
  const c = new Float64Array(3);
  tree.transformPosition('FIXED:earth', 'ICRF_BODY:earth', t - 0.5, input, c);
  for (let i = 0; i < 3; i++) expect(b[i]! - c[i]!).toBeCloseTo(a[i + 3]!, 6);
});

it('matches independent Vallado 2006 Appendix C TEME of date reference', () => {
  // https://celestrak.org/publications/AIAA/2006-6753/AIAA-2006-6753.pdf p33
  const t = utcMsToTdb(Date.UTC(2000, 0, 1) + (182.78495062 - 1) * 86400000);
  const tree = createSolarSystemFrameTree();
  const out = new Float64Array(6);
  tree.transformState(
    'TEME_EARTH',
    'ICRF_BODY:earth',
    t,
    new Float64Array([
      -9060.47373569, 4658.70952502, 813.68673153, -2.232832783, -4.11045349,
      -3.157345433,
    ]),
    out,
  );
  expect(
    Math.hypot(
      out[0]! + 9059.9413786,
      out[1]! - 4659.6972,
      out[2]! - 813.9588875,
    ),
  ).toBeLessThan(0.1);
  expect(
    Math.hypot(
      out[3]! + 2.233348094,
      out[4]! + 4.110136162,
      out[5]! + 3.157394074,
    ),
  ).toBeLessThan(0.0001);
});

it('rejects unknown frames and invalid epochs without overwriting output', () => {
  const tree = createSolarSystemFrameTree(),
    out = new Float64Array([1, 2, 3]);
  expect(tree.resolveOrigin('FIXED:unknown', 0, out)).toBe(false);
  expect(tree.resolveOrigin('ICRF_BODY:earth', NaN, out)).toBe(false);
  expect(tree.resolveOrigin('ICRF_BODY:earth', 1e14, out)).toBe(false);
  expect(Array.from(out)).toEqual([1, 2, 3]);
});
