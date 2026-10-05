import { expect, it } from 'vitest';
import { sampleOrbit } from '../src/layers/sampleOrbit';
import { OrbitLayer } from '../src/layers/OrbitLayer';
import type { InterleavedBufferAttribute } from 'three/webgpu';

function endpoints(layer: OrbitLayer, name: 'instanceStart' | 'instanceEnd') {
  return layer.line.geometry.getAttribute(name) as InterleavedBufferAttribute;
}

/** Independent previous accessor-based upload; compare actual bytes, not epsilon. */
function originalUpload(
  layer: OrbitLayer,
  parent: Float64Array,
  camera: Float64Array,
  scale: number,
) {
  const start = endpoints(layer, 'instanceStart'),
    end = endpoints(layer, 'instanceEnd');
  const x = parent[0]! - camera[0]!,
    y = parent[1]! - camera[1]!,
    z = parent[2]! - camera[2]!;
  for (let i = 0; i < start.count; i++) {
    const a = i * 3,
      b = a + 3;
    start.setXYZ(
      i,
      x + layer.points[a]! * scale,
      y + layer.points[a + 1]! * scale,
      z + layer.points[a + 2]! * scale,
    );
    end.setXYZ(
      i,
      x + layer.points[b]! * scale,
      y + layer.points[b + 1]! * scale,
      z + layer.points[b + 2]! * scale,
    );
  }
}

function bytes(layer: OrbitLayer) {
  const array = endpoints(layer, 'instanceStart').data.array;
  return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
}

it('uploads byte-identical shared endpoints at solar and near-surface camera origins', () => {
  const points = new Float64Array(3 * 2113);
  for (let i = 0; i < points.length; i++)
    points[i] = Math.sin(i * 0.137) * 149597870.7 + i * 0.000013;
  const actual = new OrbitLayer(points, '#ffffff', 'computed'),
    original = new OrbitLayer(points, '#ffffff', 'computed');
  const origins = [
    [0, 0, 0, 149597870.69, -2e8, 3e8],
    [
      149597870.7, -3900000, 1700000, 149604641.7084, -3900000.0001,
      1700000.000001,
    ],
    [-4e9, 1e9, -5e9, -4e9 + 0.00001, 1e9 - 0.00001, -5e9 + 0.00001],
  ];
  try {
    for (const origin of origins)
      for (const scale of [0, 1, 1.0000001, 50]) {
        const parent = new Float64Array(origin.slice(0, 3)),
          camera = new Float64Array(origin.slice(3));
        originalUpload(original, parent, camera, scale);
        actual.update(parent, camera, scale, false);
        expect(bytes(actual)).toEqual(bytes(original));
      }
    expect(endpoints(actual, 'instanceStart').data).toBe(
      endpoints(actual, 'instanceEnd').data,
    );
  } finally {
    actual.dispose();
    original.dispose();
  }
});

it('reuploads changed points and camera/parent/scale with one dirty revision and unchanged styles', () => {
  const points = new Float64Array([0.000001, -0, 1, 1, 2, 3, 4, 5, 6]),
    copy = points.slice(),
    actual = new OrbitLayer(points, '#ffffff', 'approximate'),
    original = new OrbitLayer(points, '#ffffff', 'approximate');
  try {
    for (let n = 0; n < 5; n++) {
      const parent = new Float64Array([149597870.7 + n, n, 2 * n]),
        camera = new Float64Array([149597870.69, -n, 3 * n]);
      points[3] = copy[3]! + n * 0.0001;
      const version = endpoints(actual, 'instanceStart').data.version;
      originalUpload(original, parent, camera, 1 + n);
      actual.update(parent, camera, 1 + n, n % 2 === 0);
      expect(bytes(actual)).toEqual(bytes(original));
      expect(endpoints(actual, 'instanceStart').data.version).toBe(version + 1);
      expect(actual.line.material.linewidth).toBe(n % 2 === 0 ? 2 : 1);
      expect(actual.line.material.opacity).toBe(n % 2 === 0 ? 0.38 : 0.12);
      expect(actual.line.material.dashed).toBe(true);
    }
  } finally {
    actual.dispose();
    original.dispose();
  }
});

it('retains minimum-segment, closed-loop and signed-zero inputs without mutating physical points', () => {
  for (const points of [
    new Float64Array([-0, 0, -0, 1, -1, 1]),
    new Float64Array([1, 2, 3, 4, 5, 6, 1, 2, 3]),
  ]) {
    const originalPoints = points.slice(),
      actual = new OrbitLayer(points, '#ffffff', 'predicted'),
      original = new OrbitLayer(points, '#ffffff', 'predicted');
    try {
      for (const scale of [-1, 0, 1]) {
        const parent = new Float64Array([-0, 0, -0]),
          camera = new Float64Array([0, -0, 0]);
        originalUpload(original, parent, camera, scale);
        actual.update(parent, camera, scale, true);
        expect(bytes(actual)).toEqual(bytes(original));
        expect(points).toEqual(originalPoints);
      }
    } finally {
      actual.dispose();
      original.dispose();
    }
  }
});

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
