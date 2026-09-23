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
  time,
  mx_noise_float,
  uv,
  normalLocal,
  transformedNormalView,
  transformedNormalWorld,
} from 'three/tsl';
import type { BodySpec } from '@space/domain';
import type { AssetManager } from '../assets/AssetManager';
export function createPlanet(
  body: BodySpec,
  assets: AssetManager,
  segments: number,
  res: number,
) {
  const group = new Group();
  const geometry = new SphereGeometry(1, segments, segments / 2);
  const sunDirection = uniform(new Vector3(1, 0, 0));
  const albedo = body.texture
    ? texture(assets.load(body.texture, res))
    : color(body.color);
  const light = normalWorld.dot(sunDirection).clamp(-1, 1);
  const day = smoothstep(-0.08, 0.2, light);
  const material = new MeshStandardNodeMaterial({
    roughness: 0.92,
    metalness: 0,
  });
  material.colorNode = albedo.rgb;
  if (body.id === 'star:sun') {
    const mu = normalView.dot(positionView.normalize().negate()).clamp(0, 1);
    const limb = mu.mul(0.6).add(0.4);
    const granulation = mx_noise_float(
      positionLocal.mul(85).add(time.mul(0.025)),
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
    if (res >= 4096) {
      const shadow = texture(
        cloudsMap,
        vec2(uv().x, uv().y.oneMinus()).add(vec2(0.001, 0.001)),
      )
        .r.mul(day)
        .mul(0.25)
        .oneMinus();
      material.colorNode = albedo.rgb.mul(shadow);
    }
    clouds = new Mesh(geometry, cm);
    clouds.scale.setScalar(1.003);
    group.add(clouds);
  }
  if (body.id === 'planet:earth' || body.id === 'planet:mars') {
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
      body.id === 'planet:earth' ? '#438ce8' : '#d49c77',
    ).mul(1.2);
    atmosphere.opacityNode = fresnel
      .mul(smoothstep(-0.25, 0.6, light.negate()))
      .mul(0.3);
    const shell = new Mesh(geometry, atmosphere);
    shell.name = 'atmosphere';
    shell.scale.setScalar(body.id === 'planet:earth' ? 1.012 : 1.008);
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
  return { group, mesh, clouds, sunDirection };
}
