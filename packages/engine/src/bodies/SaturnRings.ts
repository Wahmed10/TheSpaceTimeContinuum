import {
  DoubleSide,
  Mesh,
  MeshBasicNodeMaterial,
  RingGeometry,
  Vector3,
} from 'three/webgpu';
import {
  cameraPosition,
  float,
  mix,
  positionLocal,
  positionWorld,
  smoothstep,
  texture,
  uniform,
  vec2,
} from 'three/tsl';
import { SATURN_RINGS } from '@space/domain';
import type { AssetManager } from '../assets/AssetManager';

/** Main rings in the parent's unit-radius, Y-north texture frame.
 * Standard node-material transforms retain camera-relative/logarithmic depth.
 * HG scattering and texture alpha are display approximations, not photometry.
 */
export class SaturnRings {
  readonly localSunDirection = uniform(new Vector3(1, 0, 0));
  readonly sunDirection = uniform(new Vector3(1, 0, 0));
  readonly shadows = uniform(1);
  readonly surfaceShadows = uniform(1);
  readonly scattering = uniform(1);
  readonly mesh;
  readonly surfaceTransmission;

  constructor(assets: AssetManager, radiusKm: number, res: number) {
    const inner = SATURN_RINGS.innerRadiusKm / radiusKm;
    const outer = SATURN_RINGS.outerRadiusKm / radiusKm;
    const ringMap = assets.load('saturn_ring_alpha', Math.min(res, 2048));
    const s = this.localSunDirection;
    // The same radial sample drives ring opacity and its shadow on the planet.
    const sample = (radius: ReturnType<typeof float>) =>
      texture(
        ringMap,
        vec2(
          radius
            .sub(inner)
            .div(outer - inner)
            .clamp(0.001, 0.999),
          0.5,
        ),
      );
    const coverage = (radius: ReturnType<typeof float>) => {
      const edges = smoothstep(inner, inner + 0.005, radius).mul(
        smoothstep(outer - 0.005, outer, radius).oneMinus(),
      );
      const gap = smoothstep(
        SATURN_RINGS.cassiniInnerRadiusKm / radiusKm,
        SATURN_RINGS.cassiniInnerRadiusKm / radiusKm + 0.005,
        radius,
      ).mul(
        smoothstep(
          SATURN_RINGS.cassiniOuterRadiusKm / radiusKm - 0.005,
          SATURN_RINGS.cassiniOuterRadiusKm / radiusKm,
          radius,
        ).oneMinus(),
      );
      return sample(radius).a.mul(edges).mul(gap.mul(0.92).oneMinus());
    };

    // Surface -> Sun ray intersects the equatorial ring plane only in front
    // of the surface. Signed safe divisor avoids NaNs at equinox/grazing light.
    const sy = s.y
      .abs()
      .max(0.00001)
      .mul(mix(float(-1), float(1), float(s.y.greaterThanEqual(0))));
    const t = positionLocal.y.negate().div(sy);
    const hit = positionLocal.add(s.mul(t));
    const hitRadius = hit.xz.length();
    const surfaceShadow = coverage(hitRadius)
      .mul(float(t.greaterThan(0)))
      .mul(smoothstep(0.00001, 0.0001, s.y.abs()))
      .mul(this.surfaceShadows);
    this.surfaceTransmission = surfaceShadow.mul(0.85).oneMinus();

    const geometry = new RingGeometry(inner, outer, 256, 1);
    geometry.rotateX(-Math.PI / 2);
    const material = new MeshBasicNodeMaterial({
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    material.forceSinglePass = true;
    const radius = positionLocal.xz.length();
    // Ring -> Sun ray: closest point on the forward ray to the unit planet.
    const closestT = positionLocal.dot(s).negate().max(0);
    const closest = positionLocal.add(s.mul(closestT)).length();
    const planetShadow = smoothstep(0.99, 1.01, closest)
      .oneMinus()
      .mul(this.shadows);
    const outgoing = cameraPosition.sub(positionWorld).normalize();
    // Incoming light travels -sunDirection: forward scattering peaks when
    // viewing the rings toward the Sun, not when the Sun is behind the viewer.
    const cosine = outgoing.dot(this.sunDirection).negate().clamp(-1, 1);
    const g = 0.65;
    const mie = float(1 - g * g).div(
      float(1 + g * g)
        .sub(cosine.mul(2 * g))
        .pow(1.5),
    );
    const illumination = s.y
      .abs()
      .mul(0.8)
      .add(0.12)
      .add(mie.mul(0.12).mul(this.scattering));
    material.colorNode = sample(radius)
      .rgb.mul(2.5)
      .mul(illumination)
      .mul(planetShadow.mul(0.96).oneMinus());
    material.opacityNode = coverage(radius);
    this.mesh = new Mesh(geometry, material);
    this.mesh.name = 'saturn-rings';
    // Blend over previously drawn transparent orbit ribbons; opaque planet
    // depth still occludes the rear half. No false opaque depth in ring gaps.
    this.mesh.renderOrder = 2;
  }
}
