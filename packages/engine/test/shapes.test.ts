import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { decodeShape } from '../src/assets/ShapeGeometry';

for (const name of ['phobos', 'deimos']) {
  it(`loads ${name} as a bounded non-spherical mesh with a valid UV atlas`, () => {
    const bytes = gunzipSync(
      readFileSync(`apps/web/public/assets/shapes/${name}.bin.gz`),
    );
    const buffer = Uint8Array.from(bytes).buffer;
    const geometry = decodeShape(buffer);
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox!;
    const widths = ['x', 'y', 'z'].map(
      (axis) => bounds.max[axis as 'x'] - bounds.min[axis as 'x'],
    );
    expect(Math.max(...widths) / Math.min(...widths)).toBeGreaterThan(1.15);
    expect(geometry.boundingSphere!.radius).toBeGreaterThan(0.9);
    expect(geometry.boundingSphere!.radius).toBeLessThan(1.5);
    expect(geometry.index!.count / 3).toBeGreaterThan(5000);
    expect(geometry.index!.count / 3).toBeLessThan(8000);
    const uv = geometry.getAttribute('uv');
    for (const value of uv.array) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    expect(() => decodeShape(buffer.slice(0, buffer.byteLength - 2))).toThrow(
      'Invalid shape counts',
    );
    const corrupt = buffer.slice(0);
    new DataView(corrupt).setUint16(corrupt.byteLength - 2, 65535, true);
    expect(() => decodeShape(corrupt)).toThrow('Shape index out of range');
    geometry.dispose();
  });
}
