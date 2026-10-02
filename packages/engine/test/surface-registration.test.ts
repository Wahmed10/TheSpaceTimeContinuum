import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, it } from 'vitest';
import {
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three/webgpu';
import {
  decodeShape,
  registerShapeGeometry,
} from '../src/assets/ShapeGeometry';
import fixtures from './fixtures/surface-shapes.json';

for (const record of fixtures.records) {
  it(`registers the published ${record.body} mesh against independent scientific shape rays`, () => {
    const bytes = gunzipSync(
      readFileSync(`apps/web/public/assets/shapes/${record.body}.bin.gz`),
    );
    const geometry = decodeShape(Uint8Array.from(bytes).buffer);
    const originalUV = Array.from(geometry.getAttribute('uv').array);
    registerShapeGeometry(geometry, record.body);
    expect(Array.from(geometry.getAttribute('uv').array)).toEqual(originalUV);
    const material = new MeshBasicMaterial(),
      mesh = new Mesh(geometry, material);
    const radiusKm = record.body === 'phobos' ? 11.267 : 6.2;
    const raycaster = new Raycaster(),
      origin = new Vector3(),
      direction = new Vector3();
    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    const scores: { identity: boolean; rms: number }[] = [];
    // All 24 proper axis rotations, with no fit translation or scale adjustment.
    // Identity must be the best fit after registration, not merely plausible.
    for (const permutation of permutations) {
      for (const x of [-1, 1])
        for (const y of [-1, 1])
          for (const z of [-1, 1]) {
            const signs = [x, y, z],
              elements = Array<number>(16).fill(0);
            for (let i = 0; i < 3; i++)
              elements[i * 4 + permutation[i]!] = signs[i]!;
            elements[15] = 1;
            const matrix = new Matrix4().set(
              ...(elements as Parameters<Matrix4['set']>),
            );
            if (matrix.determinant() < 0) continue;
            mesh.matrix.copy(matrix);
            mesh.matrixAutoUpdate = false;
            mesh.updateMatrixWorld(true);
            let squaredError = 0;
            for (const ray of record.rays) {
              const lat = (ray.latitude * Math.PI) / 180,
                lon = (ray.east * Math.PI) / 180;
              direction.set(
                Math.cos(lat) * Math.cos(lon),
                Math.sin(lat),
                -Math.cos(lat) * Math.sin(lon),
              );
              origin.copy(direction).multiplyScalar(4);
              raycaster.set(origin, direction.negate());
              const hit = raycaster.intersectObject(mesh)[0];
              expect(
                hit,
                `${record.body} missing ray ${ray.latitude}/${ray.east}`,
              ).toBeDefined();
              squaredError +=
                (hit!.point.length() * radiusKm - ray.radiusKm) ** 2;
            }
            scores.push({
              identity: matrix.equals(new Matrix4()),
              rms: Math.sqrt(squaredError / record.rays.length),
            });
          }
    }
    scores.sort((a, b) => a.rms - b.rms);
    expect(scores).toHaveLength(24);
    expect(scores[0]!.identity).toBe(true);
    // Different scientific/source model generations are not identical terrain.
    expect(scores[0]!.rms).toBeLessThan(record.body === 'phobos' ? 0.8 : 0.5);
    expect(scores[1]!.rms - scores[0]!.rms).toBeGreaterThan(0.1);
    geometry.dispose();
    material.dispose();
  });
}
