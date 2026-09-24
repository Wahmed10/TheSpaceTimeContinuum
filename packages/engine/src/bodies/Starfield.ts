import {
  Mesh,
  SphereGeometry,
  MeshBasicNodeMaterial,
  BackSide,
  Group,
  Sprite,
  PointsNodeMaterial,
  InstancedBufferAttribute,
  Color,
} from 'three/webgpu';
import { instancedBufferAttribute, uv, smoothstep } from 'three/tsl';
import type { AssetManager } from '../assets/AssetManager';
export function createStarfield(assets: AssetManager, catalog: Float32Array) {
  if (catalog.length % 5 !== 0) throw new Error('Invalid star catalog');
  const group = new Group();
  const sky = new Mesh(
    new SphereGeometry(1e11, 32, 16),
    new MeshBasicNodeMaterial({
      map: assets.load('stars_milky_way', 2048),
      side: BackSide,
      depthWrite: false,
      color: 0x181820,
    }),
  );
  sky.rotation.x = Math.PI / 2;
  // NASA's celestial map is centered at RA=0 with RA increasing leftward.
  // Reflect local Z so the texture agrees with the ICRF catalog directions.
  sky.scale.z = -1;
  sky.renderOrder = -100;
  sky.frustumCulled = false;
  group.add(sky);
  const count = catalog.length / 5;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const color = new Color();
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < 3; j++)
      positions[i * 3 + j] = catalog[i * 5 + j]! * 9e10;
    const bv = Math.max(-0.4, Math.min(2, catalog[i * 5 + 4]!));
    // Display palette, not a spectral measurement. B-V controls warm/cool tint.
    const warm = (bv + 0.4) / 2.4;
    color.setRGB(0.65 + 0.35 * warm, 0.76 - 0.18 * warm, 1 - 0.62 * warm);
    color.multiplyScalar(
      Math.max(0.12, Math.min(1.5, Math.pow(10, -0.15 * catalog[i * 5 + 3]!))),
    );
    color.toArray(colors, i * 3);
    sizes[i] = Math.max(1.2, Math.min(5, 4.2 - 0.45 * catalog[i * 5 + 3]!));
  }
  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    sizeAttenuation: false,
  });
  material.positionNode = instancedBufferAttribute(
    new InstancedBufferAttribute(positions, 3),
    'vec3',
  );
  material.colorNode = instancedBufferAttribute(
    new InstancedBufferAttribute(colors, 3),
    'vec3',
  );
  material.sizeNode = instancedBufferAttribute(
    new InstancedBufferAttribute(sizes, 1),
    'float',
  );
  material.opacityNode = smoothstep(0.5, 0.15, uv().sub(0.5).length());
  const stars = new Sprite(material);
  // Sprite.count was added in r186; the pinned upstream types predate it.
  (stars as Sprite & { count: number }).count = count;
  stars.frustumCulled = false;
  stars.renderOrder = -90;
  group.add(stars);
  return group;
}
