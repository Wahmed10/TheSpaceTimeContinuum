import {
  Scene,
  PerspectiveCamera,
  Mesh,
  PlaneGeometry,
  SphereGeometry,
  MeshBasicNodeMaterial,
  RenderTarget,
  Vector3,
  Color,
  NoToneMapping,
} from 'three/webgpu';
import type { WebGPURenderer } from 'three/webgpu';

/** Actual render/readback of a surface marker while a LEO camera orbits at 1 AU. */
export async function measurePrecision(
  renderer: WebGPURenderer,
  samples = 600,
) {
  const size = 512,
    scene = new Scene(),
    camera = new PerspectiveCamera(45, 1, 0.1, 1e12);
  const geometry = new PlaneGeometry(4, 4),
    material = new MeshBasicNodeMaterial({ color: 0xffffff });
  const marker = new Mesh(geometry, material);
  scene.add(marker);
  scene.background = new Color(0);
  const target = new RenderTarget(size, size, { samples: 4 });
  const previousTarget = renderer.getRenderTarget(),
    previousTone = renderer.toneMapping;
  const relative = new Vector3(),
    expected = new Vector3(),
    look = new Vector3();
  const earth = [149597870.7, 12345678.1, -3456789.9];
  let maxErrorPx = 0;
  try {
    renderer.toneMapping = NoToneMapping;
    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI * 2,
        c = Math.cos(angle),
        s = Math.sin(angle);
      const cameraWorld = [
        earth[0]! + 6771 * c,
        earth[1]! + 6771 * s,
        earth[2]!,
      ];
      const tangent = 10 + Math.sin(i * 0.71) * 3;
      const markerWorld = [
        earth[0]! + 6371 * c - tangent * s,
        earth[1]! + 6371 * s + tangent * c,
        earth[2]!,
      ];
      camera.up.set(0, 0, 1);
      camera.lookAt(look.set(-c, -s, 0));
      camera.updateMatrixWorld();
      relative.set(
        markerWorld[0]! - cameraWorld[0]!,
        markerWorld[1]! - cameraWorld[1]!,
        markerWorld[2]! - cameraWorld[2]!,
      );
      expected.copy(relative).project(camera);
      const expectedX = ((expected.x + 1) * size) / 2,
        expectedY = ((expected.y + 1) * size) / 2;
      marker.position.set(
        Math.fround(relative.x),
        Math.fround(relative.y),
        Math.fround(relative.z),
      );
      marker.quaternion.copy(camera.quaternion);
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      const pixels = await renderer.readRenderTargetPixelsAsync(
        target,
        0,
        0,
        size,
        size,
      );
      let weight = 0,
        xSum = 0,
        ySum = 0;
      for (let p = 0; p < size * size; p++) {
        const value = Number(pixels[p * 4]);
        weight += value;
        xSum += ((p % size) + 0.5) * value;
        ySum += (Math.floor(p / size) + 0.5) * value;
      }
      if (!weight)
        throw new Error('Precision marker missing from GPU readback');
      maxErrorPx = Math.max(
        maxErrorPx,
        Math.abs(xSum / weight - expectedX),
        Math.abs(ySum / weight - expectedY),
      );
    }
    scene.remove(marker);
    const sphere = new SphereGeometry(1, 64, 32),
      red = new MeshBasicNodeMaterial({ color: 0xff0000 }),
      blue = new MeshBasicNodeMaterial({ color: 0x0000ff });
    const earthMesh = new Mesh(sphere, red),
      cloudMesh = new Mesh(sphere, blue),
      moonMesh = new Mesh(sphere, blue);
    earthMesh.scale.setScalar(6371);
    cloudMesh.scale.setScalar(6381);
    moonMesh.scale.setScalar(1737.4);
    cloudMesh.renderOrder = -1;
    scene.add(earthMesh, cloudMesh, moonMesh);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, -1);
    camera.updateMatrixWorld();
    const depthResults = [];
    try {
      for (const altitude of [400, 1e6]) {
        let pass = true;
        for (let step = 0; step < 8; step++) {
          earthMesh.position.set(0, 0, -6371 - altitude - step * 0.13);
          cloudMesh.position.copy(earthMesh.position);
          moonMesh.visible = false;
          renderer.render(scene, camera);
          const pixel = await renderer.readRenderTargetPixelsAsync(
            target,
            size / 2,
            size / 2,
            1,
            1,
          );
          pass = pass && Number(pixel[2]) > 200 && Number(pixel[0]) < 20;
        }
        depthResults.push({
          scenario: `10 km cloud shell, altitude ${altitude} km`,
          pass,
        });
      }
      cloudMesh.visible = false;
      earthMesh.position.set(0, 0, -30000);
      moonMesh.visible = true;
      moonMesh.position.set(0, 0, -414400);
      renderer.render(scene, camera);
      const pixel = await renderer.readRenderTargetPixelsAsync(
        target,
        size / 2,
        size / 2,
        1,
        1,
      );
      depthResults.push({
        scenario: 'Moon behind Earth',
        pass: Number(pixel[0]) > 200 && Number(pixel[2]) < 20,
      });
    } finally {
      sphere.dispose();
      red.dispose();
      blue.dispose();
    }
    return {
      samples,
      maxErrorPx,
      thresholdPx: 0.5,
      depthResults,
      pass: maxErrorPx < 0.5 && depthResults.every((r) => r.pass),
      method:
        'GPU MSAA marker centroid versus float64 perspective projection; opaque depth probes with logarithmic depth',
      altitudeKm: 400,
    };
  } finally {
    renderer.setRenderTarget(previousTarget);
    renderer.toneMapping = previousTone;
    target.dispose();
    geometry.dispose();
    material.dispose();
  }
}
