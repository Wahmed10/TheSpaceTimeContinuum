import {
  Mesh,
  Group,
  SphereGeometry,
  MeshStandardNodeMaterial,
  MeshBasicNodeMaterial,
  Vector3,
  BackSide,
  AdditiveBlending,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
} from 'three/webgpu';
import {
  texture,
  normalWorld,
  normalView,
  positionView,
  uniform,
  vec3,
  vec2,
  float,
  mix,
  smoothstep,
  color,
  normalMap,
  positionLocal,
  mx_noise_float,
  normalLocal,
  transformedNormalView,
  transformedNormalWorld,
  cameraPosition,
  positionWorld,
} from 'three/tsl';
import type { BodySpec } from '@space/domain';
import type { AssetManager } from '../assets/AssetManager';
import { SaturnRings } from './SaturnRings';
const GIANT_RIMS: Record<string, string> = {
  'planet:jupiter': '#c9b59d',
  'planet:saturn': '#e1cd9a',
  'planet:uranus': '#9ddddd',
  'planet:neptune': '#608ddd',
  'planet:venus': '#eee0b4',
  'moon:titan': '#dba665',
};
export function createPlanet(
  body: BodySpec,
  assets: AssetManager,
  segments: number,
  res: number,
  useTexture = true,
) {
  const group = new Group();
  const geometry = new SphereGeometry(1, segments, segments / 2);
  const sunDirection = uniform(new Vector3(1, 0, 0));
  const localSunDirection = uniform(new Vector3(1, 0, 0));
  const cloudPhase = uniform(0);
  const detailStrength = uniform(res >= 4096 ? 1 : 0);
  const animationTime = uniform(0);
  const albedo =
    body.texture && useTexture
      ? texture(assets.load(body.texture, res))
      : color(body.color);
  const light = normalWorld.dot(sunDirection).clamp(-1, 1);
  const day = smoothstep(-0.08, 0.2, light);
  const material = new MeshStandardNodeMaterial({
    roughness: 0.92,
    metalness: 0,
  });
  material.colorNode = albedo.rgb;
  if (body.id === 'planet:venus') {
    // An opaque cloud deck: no radar surface is exposed through the clouds.
    // The source map's contrast/color is illustrative, softened for visible light.
    material.colorNode = mix(albedo.rgb, color('#eee3c3'), float(0.38));
    material.roughness = 1;
  }
  if (body.id === 'moon:titan') {
    // Visible-light haze obscures Titan's terrain. Broad, low-contrast haze
    // variations are procedural illustration, not a measured surface map.
    const haze = mx_noise_float(positionLocal.mul(vec3(3, 9, 3)))
      .mul(0.025)
      .add(0.975);
    const polar = smoothstep(0.35, 0.95, normalLocal.y.abs()).mul(0.16);
    material.colorNode = mix(color('#d5ad6d'), color('#987b57'), polar).mul(
      haze,
    );
    material.roughness = 1;
  }
  if (body.id === 'planet:mars')
    material.normalNode = normalMap(
      texture(assets.load('mars_normal', 1024, true)),
    );
  if (body.id === 'star:sun') {
    const mu = normalView.dot(positionView.normalize().negate()).clamp(0, 1);
    const limb = mu.mul(0.6).add(0.4);
    const granulation = mx_noise_float(
      positionLocal.mul(85).add(animationTime.mul(0.025)),
    )
      .mul(0.13)
      .add(0.9);
    material.colorNode = vec3(0);
    material.emissiveNode = albedo.rgb.mul(limb).mul(granulation).mul(4);
  }
  if (body.id === 'planet:earth') {
    material.emissiveNode = texture(assets.load('earth_nightmap', res))
      .rgb.mul(day.oneMinus())
      .mul(1.8);
    material.roughnessNode = mix(
      float(0.82),
      float(0.24),
      texture(assets.load('earth_specular_map', res, true)).r,
    );
    material.normalNode = normalMap(
      texture(assets.load('earth_normal_map', res, true)),
      vec2(0.5),
    );
  }
  const mesh = new Mesh<
    SphereGeometry,
    MeshStandardNodeMaterial | MeshBasicNodeMaterial
  >(geometry, material);
  if (body.id === 'planet:venus' || body.id === 'moon:titan')
    mesh.name = 'opaque-cloud-deck';
  if (body.id === 'moon:moon') {
    const lunar = new MeshBasicNodeMaterial();
    lunar.normalNode = normalMap(
      texture(assets.load('moon_normal', 1024, true)),
    );
    lunar.positionNode = positionLocal.add(
      normalLocal.mul(
        texture(assets.load('moon_height', 1024, true))
          .r.mul(24)
          .sub(12)
          .mul(detailStrength)
          .div(1737.4),
      ),
    );
    const mu = transformedNormalView
      .dot(positionView.normalize().negate())
      .clamp(0.001, 1);
    const mu0 = transformedNormalWorld.dot(sunDirection).clamp(0, 1);
    lunar.colorNode = albedo.rgb
      .mul(mu0.div(mu.add(mu0).max(0.001)).mul(0.7).add(mu0.mul(0.3)))
      .mul(1.8);
    mesh.material = lunar;
    material.dispose();
  }
  group.add(mesh);
  const rings =
    body.id === 'planet:saturn'
      ? new SaturnRings(assets, body.physical.meanRadiusKm!, res)
      : null;
  if (rings) {
    material.colorNode = albedo.rgb.mul(rings.surfaceTransmission);
    group.add(rings.mesh);
  }
  let clouds: Mesh | null = null;
  if (body.id === 'planet:earth') {
    const cm = new MeshStandardNodeMaterial({
      transparent: true,
      depthWrite: false,
      roughness: 1,
    });
    cm.colorNode = vec3(1);
    const cloudsMap = assets.load('earth_clouds', res, true);
    cm.opacityNode = texture(cloudsMap).r.mul(0.8);
    {
      // Intersect the sunlight ray from the unit surface with the cloud shell.
      const n = normalLocal.normalize();
      const incidence = n.dot(localSunDirection);
      const distance = incidence.negate().add(
        incidence
          .mul(incidence)
          .add(1.003 * 1.003 - 1)
          .sqrt(),
      );
      const hit = n.add(localSunDirection.mul(distance)).normalize();
      const shadowUv = vec2(
        hit.z
          .atan(hit.x)
          .div(2 * Math.PI)
          .negate()
          .add(0.5)
          .sub(cloudPhase.div(2 * Math.PI)),
        hit.y.asin().div(Math.PI).negate().add(0.5),
      );
      const shadow = texture(cloudsMap, shadowUv)
        .r.mul(day)
        .mul(0.25)
        .mul(detailStrength)
        .oneMinus();
      material.colorNode = albedo.rgb.mul(shadow);
    }
    clouds = new Mesh(geometry, cm);
    clouds.scale.setScalar(1.003);
    group.add(clouds);
  }
  if (
    body.id === 'planet:earth' ||
    body.id === 'planet:mars' ||
    GIANT_RIMS[body.id]
  ) {
    const atmosphere = new MeshBasicNodeMaterial({
      transparent: true,
      side: BackSide,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const fresnel = normalView
      .dot(positionView.normalize().negate())
      .abs()
      .oneMinus()
      .pow(3);
    atmosphere.colorNode = color(
      GIANT_RIMS[body.id] ??
        (body.id === 'planet:earth' ? '#438ce8' : '#d49c77'),
    ).mul(1.2);
    atmosphere.opacityNode = fresnel
      .mul(smoothstep(-0.25, 0.6, light.negate()))
      .mul(0.3);
    if (body.id === 'planet:earth') {
      // Analytic spherical-shell path length with Rayleigh and HG Mie phases.
      // Uniform-density single scattering is a display approximation; it omits
      // multiple scattering and altitude-dependent weather/aerosols.
      const mu = normalView.dot(positionView.normalize()).abs().clamp(0, 1);
      const inner = 1 / 1.012;
      const discriminant = mu.mul(mu).sub(1 - inner * inner);
      const chord = mu.sub(discriminant.max(0).sqrt()).mul(1.012);
      const thickness = mix(
        mu.mul(2 * 1.012),
        chord,
        smoothstep(-0.0001, 0.0001, discriminant),
      );
      const cosine = cameraPosition
        .sub(positionWorld)
        .normalize()
        .dot(sunDirection)
        .clamp(-1, 1);
      const rayleigh = cosine
        .mul(cosine)
        .add(1)
        .mul(3 / (16 * Math.PI));
      const mie = float(1 - 0.76 * 0.76).div(
        float(1 + 0.76 * 0.76)
          .sub(cosine.mul(2 * 0.76))
          .pow(1.5)
          .mul(4 * Math.PI),
      );
      const daylight = smoothstep(-0.15, 0.2, light.negate());
      const twilight = float(1).sub(light.abs().div(0.2).clamp(0, 1));
      atmosphere.colorNode = vec3(5.8 / 33.1, 13.5 / 33.1, 1)
        .mul(rayleigh.mul(12))
        .add(vec3(1, 0.85, 0.65).mul(mie.mul(0.12)))
        .add(vec3(0.5, 0.12, 0.025).mul(twilight));
      atmosphere.opacityNode = thickness
        .mul(-12)
        .exp()
        .oneMinus()
        .mul(daylight)
        .mul(0.6)
        .add(fresnel.mul(daylight).mul(0.06))
        .clamp(0, 0.8);
    }
    const shell = new Mesh(geometry, atmosphere);
    shell.name = 'atmosphere';
    shell.scale.setScalar(
      body.id === 'planet:earth'
        ? 1.012
        : body.id === 'moon:titan' || body.id === 'planet:venus'
          ? 1.015
          : 1.008,
    );
    group.add(shell);
  }
  if (body.id === 'star:sun') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 128, 30, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255,222,149,0.65)');
    gradient.addColorStop(0.3, 'rgba(255,170,65,0.18)');
    gradient.addColorStop(1, 'rgba(255,110,20,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    const glow = new Sprite(
      new SpriteMaterial({
        map: new CanvasTexture(canvas),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(6, 6, 1);
    group.add(glow);
  }
  return {
    group,
    mesh,
    clouds,
    rings,
    sunDirection,
    localSunDirection,
    cloudPhase,
    detailStrength,
    animationTime,
  };
}
