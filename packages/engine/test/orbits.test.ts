import { expect, it } from 'vitest';
import { sampleOrbit } from '../src/layers/sampleOrbit';
import { OrbitLayer } from '../src/layers/OrbitLayer';

it('adapts a curved path more finely than a straight path and includes the current epoch', () => {
  const curve = sampleOrbit(
    (t, out) => {
      out[0] = 100 * Math.cos(t);
      out[1] = 100 * Math.sin(t);
    },
    0,
    2 * Math.PI,
    0.123,
  );
  const line = sampleOrbit(
    (t, out) => {
      out[0] = t;
    },
    0,
    2 * Math.PI,
    0.123,
  );
  expect(curve.length).toBeGreaterThan(line.length);
  expect(curve.length).toBeLessThanOrEqual(3 * 2113);
  let epochFound = false;
  for (let i = 0; i < curve.length; i += 3) {
    if (
      Math.abs(curve[i]! - 100 * Math.cos(0.123)) < 1e-10 &&
      Math.abs(curve[i + 1]! - 100 * Math.sin(0.123)) < 1e-10
    )
      epochFound = true;
    if (i + 3 < curve.length) {
      const radius = Math.hypot(
        (curve[i]! + curve[i + 3]!) / 2,
        (curve[i + 1]! + curve[i + 4]!) / 2,
      );
      expect(100 - radius).toBeLessThanOrEqual(0.020001);
    }
  }
  expect(epochFound).toBe(true);
});

it('keeps validity-clipped arcs open and does not evaluate beyond their endpoints', () => {
  const points = sampleOrbit(
    (t, out) => {
      expect(t).toBeGreaterThanOrEqual(3);
      expect(t).toBeLessThanOrEqual(4);
      out[0] = t;
    },
    3,
    4,
    3.5,
  );
  expect(points[0]).toBe(3);
  expect(points[points.length - 3]).toBe(4);
  expect(() => sampleOrbit(() => {}, 1, 1, 1)).toThrow();
});

it('retains exact fractional endpoints across a large clipped interval', () => {
  // A LIVE Neptune orbit at 2026-10-02T22:35:20.002Z previously rounded
  // its final seed 0.477 microseconds beyond the 2100 provider boundary.
  const from = -1755609810.8156552,
    to = 3187252869.1828775;
  const points = sampleOrbit(
    (t, out) => {
      expect(t).toBeGreaterThanOrEqual(from);
      expect(t).toBeLessThanOrEqual(to);
      out[0] = t;
    },
    from,
    to,
    844856120.002,
  );
  expect(points[0]).toBe(from);
  expect(points[points.length - 3]).toBe(to);
});

it('subtracts camera coordinates in float64 before uploading nearby line endpoints', () => {
  const points = new Float64Array([149597870.7, 0, 0, 149597871.7, 0, 0]);
  const layer = new OrbitLayer(points, '#ffffff', 'computed');
  layer.update(
    new Float64Array([0, 0, 0]),
    new Float64Array([149597870.69, 0, 0]),
    1,
    true,
  );
  expect(layer.line.geometry.getAttribute('instanceStart').getX(0)).toBeCloseTo(
    0.01,
    6,
  );
  expect(layer.line.geometry.getAttribute('instanceEnd').getX(0)).toBeCloseTo(
    1.01,
    6,
  );
  expect(layer.line.material.linewidth).toBe(2);
  expect(layer.line.material.dashed).toBe(false);
  expect(points[0]).toBe(149597870.7);
  layer.dispose();
});

it('uses dotted fading approximations and dashed predictions', () => {
  const points = new Float64Array([0, 0, 0, 100, 0, 0]);
  const approximate = new OrbitLayer(points, '#ffffff', 'approximate');
  const predicted = new OrbitLayer(points, '#ffffff', 'predicted');
  expect(approximate.line.material.dashed).toBe(true);
  expect(approximate.line.material.opacityNode).not.toBeNull();
  expect(approximate.line.material.dashSize).toBeLessThan(
    predicted.line.material.dashSize,
  );
  approximate.dispose();
  predicted.dispose();
});
