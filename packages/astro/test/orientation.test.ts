import { it, expect } from 'vitest';
import { bodyOrientation } from '../src/orientation/bodyOrientation';
import { isoToTdb } from '../src/time/scales';
import { tdbMinusTt } from '../src/time/scales';
import { createBodyProvider } from '../src/ephemeris/AstronomyEngineProvider';
import mars from './fixtures/mars-orientation.json';

function rotate(q: Float64Array, v: number[]) {
  const [x, y, z, w] = Array.from(q) as [number, number, number, number];
  const [a, b, c] = v as [number, number, number];
  const tx = 2 * (y * c - z * b),
    ty = 2 * (z * a - x * c),
    tz = 2 * (x * b - y * a);
  return [
    a + w * tx + y * tz - z * ty,
    b + w * ty + z * tx - x * tz,
    c + w * tz + x * ty - y * tx,
  ];
}
function angle(a: number[], b: number[]) {
  return (
    (Math.acos(
      Math.max(
        -1,
        Math.min(
          1,
          a.reduce((sum, x, i) => sum + x * b[i]!, 0) /
            Math.hypot(...a) /
            Math.hypot(...b),
        ),
      ),
    ) *
      180) /
    Math.PI
  );
}
it('matches independent NAIF PCK Mars pole and prime-meridian references within 0.01 degrees', () => {
  const q = new Float64Array(4),
    rad = Math.PI / 180;
  for (const row of mars.records) {
    const tt = row.ttDays * 86400;
    bodyOrientation('Mars', tt + tdbMinusTt(tt), q);
    const ra = row.ra * rad,
      dec = row.dec * rad,
      w = row.w * rad;
    const pole = [
      Math.cos(dec) * Math.cos(ra),
      Math.cos(dec) * Math.sin(ra),
      Math.sin(dec),
    ];
    const prime = [
      -Math.sin(ra) * Math.cos(w) - Math.sin(dec) * Math.cos(ra) * Math.sin(w),
      Math.cos(ra) * Math.cos(w) - Math.sin(dec) * Math.sin(ra) * Math.sin(w),
      Math.cos(dec) * Math.sin(w),
    ];
    expect(angle(rotate(q, [0, 1, 0]), pole)).toBeLessThan(0.01);
    expect(angle(rotate(q, [1, 0, 0]), prime)).toBeLessThan(0.01);
  }
});
it('Greenwich faces the Sun at apparent noon near the March equinox', () => {
  // March equation of time is about -7.5 minutes: solar noon is 12:07:30 UTC.
  const t = isoToTdb('2026-03-20T12:07:30Z'),
    q = new Float64Array(4),
    earth = new Float64Array(6),
    sun = new Float64Array(6);
  createBodyProvider('Earth').stateAt(t, earth);
  createBodyProvider('Sun').stateAt(t, sun);
  bodyOrientation('Earth', t, q);
  expect(
    angle(rotate(q, [1, 0, 0]), [
      sun[0]! - earth[0]!,
      sun[1]! - earth[1]!,
      sun[2]! - earth[2]!,
    ]),
  ).toBeLessThan(1);
});
it('produces normalized finite rotations across the timeline', () => {
  const q = new Float64Array(4);
  for (const body of ['Sun', 'Earth', 'Moon', 'Mars'])
    for (const year of [1900, 2000, 2026, 2100]) {
      bodyOrientation(body, isoToTdb(`${year}-01-01T12:00:00Z`), q);
      expect(q.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...q)).toBeCloseTo(1, 12);
    }
});
it('Earth returns near its sidereal orientation after one sidereal day', () => {
  const a = new Float64Array(4),
    b = new Float64Array(4);
  const t = isoToTdb('2026-09-22T12:00:00Z');
  bodyOrientation('Earth', t, a);
  bodyOrientation('Earth', t + 86164.0905, b);
  const dot = Math.abs(
    a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]! + a[3]! * b[3]!,
  );
  expect((2 * Math.acos(Math.min(1, dot)) * 180) / Math.PI).toBeLessThan(0.01);
});
