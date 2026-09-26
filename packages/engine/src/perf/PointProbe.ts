import {
  Color,
  Mesh,
  MeshBasicNodeMaterial,
  PerspectiveCamera,
  RenderTarget,
  Scene,
  SphereGeometry,
} from 'three/webgpu';
import type { WebGPURenderer } from 'three/webgpu';
import { PointLayer } from '../layers/PointLayer';
import { PerfMonitor } from './PerfMonitor';

/** Synthetic Earth-local workload, not a full-scene or physical-device gate. */
export async function measurePoints(
  renderer: WebGPURenderer,
  frames: number,
  stopped: () => boolean,
) {
  if (!Number.isInteger(frames) || frames < 1 || frames > 3600)
    throw new Error('Invalid sample count');
  const scene = new Scene();
  scene.background = new Color(0);
  const camera = new PerspectiveCamera(45, 1, 1, 100000);
  camera.position.z = 24000;
  const earth = new Mesh(
    new SphereGeometry(6371, 32, 16),
    new MeshBasicNodeMaterial({ color: 0x123377 }),
  );
  scene.add(earth);
  const layer = new PointLayer(10000);
  scene.add(layer.object);
  for (let i = 0; i < layer.capacity; i++) {
    const z = 1 - (2 * (i + 0.5)) / layer.capacity;
    const longitude = i * 2.399963229728653;
    const r = 7200 + (i % 31) * 30;
    const xy = Math.sqrt(1 - z * z) * r;
    layer.positions.setXYZ(
      i,
      xy * Math.cos(longitude),
      xy * Math.sin(longitude),
      z * r,
    );
    layer.colors.setXYZ(i, 0.4, 0.8, 1);
    layer.sizes.setX(i, 2);
  }
  layer.positions.setXYZ(0, 0, 0, 8000);
  layer.colors.setXYZ(0, 1, 0, 0);
  layer.sizes.setX(0, 16);
  layer.upload();
  const target = new RenderTarget(128, 128);
  const previous = renderer.getRenderTarget();
  const timing = new PerfMonitor();
  let hidden = document.hidden;
  const visibility = () => {
    hidden ||= document.hidden;
  };
  document.addEventListener('visibilitychange', visibility);
  try {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const red = await renderer.readRenderTargetPixelsAsync(
      target,
      64,
      64,
      1,
      1,
    );
    layer.colors.setXYZ(0, 0, 1, 0);
    layer.upload(0, 1);
    renderer.render(scene, camera);
    const green = await renderer.readRenderTargetPixelsAsync(
      target,
      64,
      64,
      1,
      1,
    );
    const partialUploadVerified =
      red[0]! > red[1]! * 2 && green[1]! > green[0]! * 2;
    renderer.setRenderTarget(previous);
    const size = renderer.domElement;
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    // The renderer may add a tone-mapping/output pass. Measure the layer's
    // incremental draw count instead of assuming the entire scene has two.
    layer.object.visible = false;
    renderer.info.reset();
    renderer.render(scene, camera);
    const baselineDrawCalls = renderer.info.render.drawCalls;
    layer.object.visible = true;
    let last = 0,
      drawCalls = 0;
    for (let frame = 0; frame < frames + 30; frame++) {
      const now = await new Promise<number>((resolve) =>
        requestAnimationFrame(resolve),
      );
      if (stopped())
        throw new Error('Renderer disposed during point benchmark');
      if (hidden) throw new Error('Point benchmark invalid: tab was hidden');
      if (frame >= 30) timing.add(now - last);
      last = now;
      layer.object.rotation.z += 0.001;
      for (let i = 1; i <= 64; i++)
        layer.positions.setZ(
          i,
          layer.positions.getZ(i) + Math.sin(frame * 0.01),
        );
      layer.upload(1, 64, false);
      renderer.info.reset();
      renderer.render(scene, camera);
      drawCalls = Math.max(drawCalls, renderer.info.render.drawCalls);
    }
    return {
      count: layer.capacity,
      frames,
      warmupFrames: 30,
      drawCalls,
      pointDrawCalls: drawCalls - baselineDrawCalls,
      partialUploadVerified,
      ...timing.stats(),
      viewport: { width: size.width, height: size.height },
      method:
        '10k Earth-local sprites plus a sphere; 64 position/size updates per frame; requestAnimationFrame timing. Readback verifies a partial color upload.',
    };
  } finally {
    document.removeEventListener('visibilitychange', visibility);
    renderer.setRenderTarget(previous);
    layer.dispose();
    earth.geometry.dispose();
    earth.material.dispose();
    target.dispose();
  }
}
