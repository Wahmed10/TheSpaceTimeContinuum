import { expect, it, vi } from 'vitest';
import { Texture, DoubleSide } from 'three/webgpu';
import { BODY_BY_ID, SATURN_RINGS } from '@space/domain';
import { SaturnRings } from '../src/bodies/SaturnRings';
import { createPlanet } from '../src/bodies/PlanetFactory';
import type { AssetManager } from '../src/assets/AssetManager';

it('places the physical main rings in Saturn texture equator with one shared asset', () => {
  const load = vi.fn(() => new Texture());
  const assets = { load } as unknown as AssetManager;
  const body = BODY_BY_ID.get('planet:saturn')!;
  const rings = new SaturnRings(assets, body.physical.meanRadiusKm!, 8192);
  expect(load).toHaveBeenCalledExactlyOnceWith('saturn_ring_alpha', 2048);
  const geometry = rings.mesh.geometry;
  const position = geometry.getAttribute('position');
  let min = Infinity,
    max = 0;
  for (let i = 0; i < position.count; i++) {
    expect(Math.abs(position.getY(i))).toBeLessThan(1e-6);
    const radiusKm =
      Math.hypot(position.getX(i), position.getZ(i)) *
      body.physical.meanRadiusKm!;
    min = Math.min(min, radiusKm);
    max = Math.max(max, radiusKm);
  }
  expect(min).toBeCloseTo(SATURN_RINGS.innerRadiusKm, 1);
  expect(max).toBeCloseTo(SATURN_RINGS.outerRadiusKm, 1);
  expect(rings.mesh.material.side).toBe(DoubleSide);
  expect(rings.mesh.material.depthTest).toBe(true);
  expect(rings.mesh.material.depthWrite).toBe(false);
  const disposed = vi.fn();
  geometry.addEventListener('dispose', disposed);
  geometry.dispose();
  rings.mesh.material.dispose();
  expect(disposed).toHaveBeenCalledOnce();
});

it('attaches rings to the same body frame without a second axial tilt', () => {
  const assets = { load: () => new Texture() } as unknown as AssetManager;
  const visual = createPlanet(
    BODY_BY_ID.get('planet:saturn')!,
    assets,
    48,
    1024,
  );
  expect(visual.rings!.mesh.parent).toBe(visual.group);
  expect(visual.rings!.mesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  expect(visual.rings!.mesh.geometry).not.toBe(visual.mesh.geometry);
  expect(visual.mesh.material.colorNode).toBeTruthy();
  visual.rings!.mesh.geometry.dispose();
  visual.rings!.mesh.material.dispose();
  visual.mesh.geometry.dispose();
  visual.mesh.material.dispose();
});
