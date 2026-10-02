import { expect, it } from 'vitest';
import {
  SphereGeometry,
  Texture,
  Vector2,
  Vector3,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  RepeatWrapping,
} from 'three/webgpu';
import { configureSurfaceMapping } from '../src/assets/SurfaceMapping';
import landmarks from './fixtures/surface-landmarks.json';

it('registers Io raster coordinates against actual sphere vertices and ISIS projection units', () => {
  const geometry = new SphereGeometry(1, 32, 24);
  const texture = new Texture();
  configureSurfaceMapping(texture, 'io');
  texture.updateMatrix();
  const positions = geometry.getAttribute('position');
  const uvs = geometry.getAttribute('uv');
  const pixel = new Vector2();
  // Source ISIS label: R=1821460m, 11445x5723, 1000m/px,
  // upper-left (-5723000m,2862000m), center longitude zero.
  // ISIS projects x=R*(-west longitude), y=R*planetocentric latitude.
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      north = positions.getY(i),
      z = positions.getZ(i);
    if (Math.abs(north) > 0.999 || uvs.getX(i) === 0 || uvs.getX(i) === 1)
      continue;
    const west = Math.atan2(z, x); // texture -Z is scientific east.
    const latitude = Math.asin(north);
    const sourceU = (-1821460 * west + 5723000) / (1000 * 11445);
    const sourceV = (2862000 - 1821460 * latitude) / (1000 * 5723);
    pixel.set(uvs.getX(i), uvs.getY(i)).applyMatrix3(texture.matrix);
    // One-pixel bounds/aspect rounding in the published raster is retained.
    expect(Math.abs(pixel.x - sourceU)).toBeLessThan(1 / 11445);
    expect(Math.abs(pixel.y - sourceV)).toBeLessThan(1 / 5723);
  }
  geometry.dispose();
  texture.dispose();
});

it('preserves source atlas coordinates for both irregular moons', () => {
  const texture = new Texture(),
    uv = new Vector2(0.23, 0.71);
  for (const name of ['phobos', 'deimos']) {
    configureSurfaceMapping(texture, 'io');
    configureSurfaceMapping(texture, name);
    texture.updateMatrix();
    expect(uv.clone().applyMatrix3(texture.matrix).toArray()).toEqual(
      uv.toArray(),
    );
  }
  texture.dispose();
});

it('places independently identified landmarks at their USGS geographic directions', () => {
  const geometry = new SphereGeometry(1, 128, 64),
    material = new MeshBasicMaterial();
  const mesh = new Mesh(geometry, material),
    texture = new Texture();
  texture.wrapS = RepeatWrapping;
  texture.flipY = false; // KTX2Loader's compressed textures have native row order.
  const direction = new Vector3(),
    origin = new Vector3(),
    raycaster = new Raycaster();
  for (const landmark of landmarks.records) {
    const lat = (landmark.latitude * Math.PI) / 180,
      lon = (landmark.east * Math.PI) / 180;
    direction.set(
      Math.cos(lat) * Math.cos(lon),
      Math.sin(lat),
      -Math.cos(lat) * Math.sin(lon),
    );
    origin.copy(direction).multiplyScalar(2);
    raycaster.set(origin, direction.negate());
    const uv = raycaster.intersectObject(mesh)[0]!.uv!;
    configureSurfaceMapping(texture, landmark.body);
    texture.updateMatrix();
    texture.transformUv(uv);
    const observedU =
      (landmark.pixel[0]! / 2048 + (landmark.preparedHalfShift ? 0.5 : 0)) % 1;
    const delta = Math.abs(uv.x - observedU);
    expect(
      Math.min(delta, 1 - delta) * 360,
      `${landmark.body}/${landmark.feature} longitude`,
    ).toBeLessThan(2);
    expect(
      Math.abs(uv.y - landmark.pixel[1]! / 1024) * 180,
      `${landmark.body}/${landmark.feature} latitude`,
    ).toBeLessThan(2);
  }
  geometry.dispose();
  material.dispose();
  texture.dispose();
});
