import {
  WebGPURenderer,
  ACESFilmicToneMapping,
  SRGBColorSpace,
} from 'three/webgpu';
export async function createRenderer(
  canvas: HTMLCanvasElement,
  opts: { forceWebGL: boolean; dpr: number },
) {
  const renderer = new WebGPURenderer({
    canvas,
    antialias: true,
    forceWebGL: opts.forceWebGL,
    logarithmicDepthBuffer: true,
  });
  await renderer.init();
  renderer.setPixelRatio(opts.dpr);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = SRGBColorSpace;
  const backend = (renderer.backend as unknown as { isWebGPUBackend?: boolean })
    .isWebGPUBackend
    ? 'webgpu'
    : 'webgl2';
  return { renderer, backend };
}
