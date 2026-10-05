import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CompressedTexture, RGBA_S3TC_DXT5_Format } from 'three/webgpu';
import type { WebGPURenderer } from 'three/webgpu';
import { AssetManager } from '../src/assets/AssetManager';
const loader = vi.hoisted(() => ({ loadAsync: vi.fn(), dispose: vi.fn() }));
vi.mock('three/addons/loaders/KTX2Loader.js', () => ({
  KTX2Loader: class {
    setTranscoderPath() {
      return this;
    }
    setWorkerLimit() {
      return this;
    }
    detectSupport() {
      return this;
    }
    loadAsync = loader.loadAsync;
    dispose = loader.dispose;
  },
}));
const manifest = JSON.parse(
  readFileSync('apps/web/public/assets/textures/manifest.json', 'utf8'),
) as { file: string; name: string; res: number }[];
const managers: AssetManager[] = [];
const tasks = new Map<
  string,
  { resolve(t: CompressedTexture): void; reject(error: Error): void }
>();
const renderer = { initTexture: vi.fn() } as unknown as WebGPURenderer;
function compressed() {
  return new CompressedTexture(
    [{ data: new Uint8Array(16), width: 4, height: 4 }],
    4,
    4,
    RGBA_S3TC_DXT5_Format,
  );
}
async function flush() {
  for (let n = 0; n < 6; n++) await Promise.resolve();
}
async function create(cap = Infinity) {
  const manager = await AssetManager.create(renderer, cap);
  managers.push(manager);
  return manager;
}
beforeEach(() => {
  vi.clearAllMocks();
  tasks.clear();
  loader.loadAsync.mockImplementation(
    (url: string) =>
      new Promise<CompressedTexture>((resolve, reject) =>
        tasks.set(url, { resolve, reject }),
      ),
  );
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('manifest.json')) return Response.json(manifest);
      if (url.startsWith('/assets/shapes/'))
        return new Response(readFileSync(`apps/web/public${url}`));
      throw Error(`Unexpected blocking startup request: ${url}`);
    }),
  );
});
afterEach(() => {
  for (const manager of managers.splice(0)) manager.dispose();
  vi.unstubAllGlobals();
});
function url(name: string, res: number) {
  return manifest.find(
    (m) => m.name === name && m.res === res && m.file.endsWith('.ktx2'),
  )!.file;
}
function complete(file: string) {
  const task = tasks.get(file)!;
  tasks.delete(file);
  task.resolve(compressed());
}
async function finishBaselines() {
  for (;;) {
    const baseline = [...tasks.keys()].filter(
      (file) => manifest.find((m) => m.file === file)!.res === 1024,
    );
    if (!baseline.length) return;
    expect(tasks.size).toBeLessThanOrEqual(2);
    baseline.forEach(complete);
    await flush();
  }
}
it('initializes renderable previews without any KTX/basis requests, then loads 1K before desktop detail', async () => {
  const manager = await create(),
    map = manager.load('earth_daymap', 8192);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(loader.loadAsync).not.toHaveBeenCalled();
  expect(manager.textureState.every((t) => t.placeholder)).toBe(true);
  manager.startStreaming();
  expect(loader.loadAsync).toHaveBeenCalledTimes(2);
  expect(loader.loadAsync).toHaveBeenCalledWith(url('earth_daymap', 1024));
  expect(loader.loadAsync).not.toHaveBeenCalledWith(url('earth_daymap', 8192));
  complete(url('earth_daymap', 1024));
  await flush();
  expect(
    manager.textureState.find((t) => t.name === 'earth_daymap')!.resolution,
  ).toBe(1024);
  // Other worlds get their small maps before the first optional detail.
  expect(loader.loadAsync).not.toHaveBeenCalledWith(url('earth_daymap', 8192));
  await finishBaselines();
  expect(loader.loadAsync).toHaveBeenCalledWith(url('earth_daymap', 8192));
  const firstDetail = loader.loadAsync.mock.calls.findIndex(
    ([file]) => manifest.find((m) => m.file === file)!.res > 1024,
  );
  expect(firstDetail).toBe(29);
  complete(url('earth_daymap', 8192));
  await flush();
  expect(manager.load('earth_daymap', 8192)).toBe(map);
  expect(
    manager.textureState.find((t) => t.name === 'earth_daymap')!.resolution,
  ).toBe(8192);
});
it('caps all mobile requests at 1K even when HIGH is requested', async () => {
  const manager = await create(1024);
  manager.load('earth_daymap', 8192);
  manager.setResolution(8192);
  manager.startStreaming();
  await finishBaselines();
  expect(manager.textureState.every((t) => t.desired === 1024)).toBe(true);
  expect(
    loader.loadAsync.mock.calls.every(
      ([file]) => manifest.find((m) => m.file === file)!.res === 1024,
    ),
  ).toBe(true);
});
it('a failed baseline retains the preview and retries only on an explicit command', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const manager = await create();
    manager.startStreaming();
    const baseline = url('earth_daymap', 1024);
    tasks.get(baseline)!.reject(Error('Offline'));
    tasks.delete(baseline);
    await flush();
    await finishBaselines();
    const attempts = () =>
      loader.loadAsync.mock.calls.filter(([file]) => file === baseline).length;
    expect(attempts()).toBe(1);
    expect(
      manager.textureState.find((t) => t.name === 'earth_daymap'),
    ).toMatchObject({ placeholder: true, failed: true });
    manager.load('earth_daymap', 2048);
    await flush();
    expect(attempts()).toBe(1);
    manager.setResolution(2048);
    expect(attempts()).toBe(2);
    complete(baseline);
    await flush();
    expect(
      manager.textureState.find((t) => t.name === 'earth_daymap'),
    ).toMatchObject({ resolution: 1024, placeholder: false, failed: false });
  } finally {
    warn.mockRestore();
  }
});
it('uses the latest quality when queued loads start and never fills the date-data connections', async () => {
  const manager = await create();
  manager.setResolution(8192);
  manager.startStreaming();
  expect(tasks.size).toBe(2);
  manager.setResolution(1024);
  await finishBaselines();
  expect(loader.loadAsync).toHaveBeenCalledTimes(29);
  expect(
    loader.loadAsync.mock.calls.every(
      ([file]) => manifest.find((m) => m.file === file)!.res === 1024,
    ),
  ).toBe(true);
  expect(manager.pending).toBe(0);
});
it('drops a released queued texture without downloading it', async () => {
  const manager = await create();
  manager.load('ceres', 1024);
  manager.startStreaming();
  manager.release('ceres');
  await finishBaselines();
  expect(loader.loadAsync).not.toHaveBeenCalledWith(url('ceres', 1024));
  expect(manager.textureState).toHaveLength(28);
  expect(manager.pending).toBe(0);
});
it('a late texture after disposal is disposed without GPU upload or recreating its record', async () => {
  const manager = await create();
  manager.startStreaming();
  const calls = loader.loadAsync.mock.calls.length;
  const loaded = compressed(),
    dispose = vi.spyOn(loaded, 'dispose');
  manager.dispose();
  tasks.get(url('earth_daymap', 1024))!.resolve(loaded);
  await flush();
  expect(dispose).toHaveBeenCalledOnce();
  expect(renderer.initTexture).not.toHaveBeenCalled();
  expect(loader.loadAsync).toHaveBeenCalledTimes(calls);
  expect(manager.textureState).toEqual([]);
});
