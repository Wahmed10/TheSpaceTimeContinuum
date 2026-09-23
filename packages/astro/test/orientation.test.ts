import { it, expect } from 'vitest';
import { bodyOrientation } from '../src/orientation/bodyOrientation';
import { isoToTdb } from '../src/time/scales';
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
