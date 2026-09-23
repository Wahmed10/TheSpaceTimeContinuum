import { it, expect } from 'vitest';
import {
  relativePosition,
  radiusBoost,
  childDisplayPosition,
} from '../src/scene/DisplayTransform';
import {
  sphericalToCartesian,
  transitionDistance,
  exponentialZoom,
} from '../src/camera/math';
it('subtracts float64 before float32 conversion at LEO', () => {
  const earth = new Float64Array([149597870.7, 12345678.1, -3456789.9]);
  const out = new Float64Array(3);
  let maxPixelError = 0;
  for (let i = 0; i < 600; i++) {
    const camera = earth.slice();
    camera[0]! += 6771 * Math.cos(i / 600);
    camera[1]! += 6771 * Math.sin(i / 600);
    relativePosition(earth, camera, out);
    for (let j = 0; j < 3; j++)
      maxPixelError = Math.max(
        maxPixelError,
        (Math.abs(Math.fround(out[j]!) - out[j]!) / 400) * 1080,
      );
  }
  expect(maxPixelError).toBeLessThan(0.5);
});
it('preserves physics and keeps boosted children outside the parent', () => {
  const parent = new Float64Array([1.5e8, 0, 0]);
  const moon = new Float64Array([1.5e8 + 384400, 0, 0]);
  const copy = moon.slice();
  const out = new Float64Array(3);
  for (const d of [7000, 1e6, 1e8, 1e10]) {
    const b = radiusBoost(6371, d, false, 'explore');
    childDisplayPosition(moon, parent, parent, b, out);
    expect(out[0]! - parent[0]!).toBeGreaterThan(6371 * b);
    expect(moon).toEqual(copy);
  }
  expect(radiusBoost(6371, 1e10, false, 'true')).toBe(1);
});
it('camera transitions have exact endpoints and finite polar coordinates', () => {
  expect(transitionDistance(7000, 10000, 1e8, 0)).toBe(7000);
  expect(transitionDistance(7000, 10000, 1e8, 1)).toBe(10000);
  expect(transitionDistance(7000, 10000, 1e8, 0.5)).toBeCloseTo(6e7, 2);
  const out = new Float64Array(3);
  sphericalToCartesian(1000, 0, Math.PI / 2, out);
  expect(out.every(Number.isFinite)).toBe(true);
  expect(exponentialZoom(7000, -100, 6700, 1e10)).toBe(6700);
});
