import { RepeatWrapping, SRGBColorSpace, NoColorSpace } from 'three/webgpu';
import type { Texture, WebGPURenderer } from 'three/webgpu';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { decodeShape, registerShapeGeometry } from './ShapeGeometry';
import { configureSurfaceMapping } from './SurfaceMapping';
import {
  adoptTextureContent,
  createTexturePlaceholder,
} from './TexturePlaceholder';
interface AssetRecord {
  texture: Texture;
  resolution: number;
  desired: number;
  loading: boolean;
  data: boolean;
  references: number;
  failedResolution: number | null;
}
interface ManifestEntry {
  name: string;
  res: number;
  file: string;
}
export class AssetManager {
  private shapes = new Map<string, ArrayBuffer>();
  private records = new Map<string, AssetRecord>();
  private loader: KTX2Loader;
  private disposed = false;
  private streaming = false;
  private textureQueue: { name: string; record: AssetRecord }[] = [];
  private activeTextureLoads = 0;
  constructor(
    private renderer: WebGPURenderer,
    private manifest: ManifestEntry[],
    private maxResolution = Infinity,
  ) {
    this.loader = new KTX2Loader()
      .setTranscoderPath('/basis/')
      .setWorkerLimit(2)
      .detectSupport(renderer);
  }
  static async create(renderer: WebGPURenderer, maxResolution = Infinity) {
    const response = await fetch('/assets/textures/manifest.json');
    if (!response.ok) throw new Error('Texture manifest unavailable');
    const manager = new AssetManager(
      renderer,
      (await response.json()) as ManifestEntry[],
      maxResolution,
    );
    try {
      await Promise.all(
        ['phobos', 'deimos'].map(async (name) => {
          const response = await fetch(`/assets/shapes/${name}.bin.gz`);
          if (!response.ok || !response.body)
            throw new Error(`Missing shape ${name}`);
          const buffer = await new Response(
            response.body.pipeThrough(new DecompressionStream('gzip')),
          ).arrayBuffer();
          // Reject invalid assets during startup, not on first focus.
          decodeShape(buffer).dispose();
          manager.shapes.set(name, buffer);
        }),
      );
      manager.prepare([
        'sun',
        'earth_daymap',
        'earth_nightmap',
        'earth_clouds',
        'earth_normal_map',
        'earth_specular_map',
        'moon',
        'moon_normal',
        'moon_height',
        'mars',
        'mars_normal',
        'mercury',
        'venus_atmosphere',
        'jupiter',
        'saturn',
        'saturn_ring_alpha',
        'uranus',
        'neptune',
        'pluto',
        'charon',
        'io',
        'europa',
        'ganymede',
        'callisto',
        'ceres',
        'triton',
        'phobos',
        'deimos',
        'stars_milky_way',
      ]);
      return manager;
    } catch (error) {
      manager.dispose();
      throw error;
    }
  }
  private url(name: string, res: number) {
    return this.manifest
      .filter(
        (m) => m.name === name && m.file.endsWith('.ktx2') && m.res <= res,
      )
      .sort((a, b) => b.res - a.res)[0];
  }
  createShape(name: string) {
    const buffer = this.shapes.get(name);
    if (!buffer) throw new Error(`Shape not preloaded: ${name}`);
    return registerShapeGeometry(decodeShape(buffer), name);
  }
  private configure(texture: Texture, data: boolean, name: string) {
    texture.colorSpace = data ? NoColorSpace : SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.anisotropy = 4;
    configureSurfaceMapping(texture, name);
    texture.needsUpdate = true;
  }
  private prepare(names: string[]) {
    for (const name of names) {
      const entry = this.url(name, 1024);
      if (!entry) throw new Error(`Missing texture ${name}`);
      const texture = createTexturePlaceholder(name);
      const data = /normal|specular|cloud|height/.test(name);
      this.configure(texture, data, name);
      this.records.set(name, {
        texture,
        resolution: 0,
        desired: 1024,
        loading: false,
        data,
        references: 0,
        failedResolution: null,
      });
    }
  }
  /** Called only after the first scene submission. No KTX/basis download can
   * hold that first frame; mobile first receives and retains real 1K maps. */
  startStreaming() {
    if (this.disposed || this.streaming) return;
    this.streaming = true;
    for (const [name, record] of this.records) void this.upgrade(name, record);
  }
  load(name: string, res = 2048, data = false): Texture {
    const record = this.records.get(name);
    if (!record) throw new Error(`Texture not preloaded: ${name}`);
    record.data = data;
    record.references++;
    record.desired = Math.min(res, this.maxResolution);
    void this.upgrade(name, record);
    return record.texture;
  }
  private upgrade(name: string, record: AssetRecord) {
    if (
      !this.streaming ||
      this.disposed ||
      record.loading ||
      this.records.get(name) !== record
    )
      return;
    // First real map is always the small baseline, even if HIGH was selected.
    const entry = this.url(
      name,
      record.resolution === 0 ? 1024 : record.desired,
    );
    if (
      !entry ||
      entry.res === record.resolution ||
      entry.res === record.failedResolution
    )
      return;
    record.loading = true;
    this.textureQueue.push({ name, record });
    this.pumpTextures();
  }
  private pumpTextures() {
    // KTX fetches share the browser's per-origin connections with date data.
    // Two loads also match our transcoder workers, leaving room for chunks.
    while (
      !this.disposed &&
      this.activeTextureLoads < 2 &&
      this.textureQueue.length
    ) {
      // Give every small baseline a turn before optional sharper maps.
      this.textureQueue.sort(
        (a, b) =>
          Number(a.record.resolution > 0) - Number(b.record.resolution > 0),
      );
      const { name, record } = this.textureQueue.shift()!;
      if (this.records.get(name) !== record) continue;
      this.activeTextureLoads++;
      void this.upgradeNow(name, record).finally(() => {
        record.loading = false;
        this.activeTextureLoads--;
        if (
          !this.disposed &&
          this.records.get(name) === record &&
          record.failedResolution === null
        )
          this.upgrade(name, record);
        this.pumpTextures();
      });
    }
  }
  private async upgradeNow(name: string, record: AssetRecord) {
    // Quality can change while queued. Choose the current request when it starts.
    const entry = this.url(
      name,
      record.resolution === 0 ? 1024 : record.desired,
    );
    if (
      !entry ||
      entry.res === record.resolution ||
      entry.res === record.failedResolution
    )
      return;
    try {
      const loaded = await this.loader.loadAsync(entry.file);
      if (this.disposed || this.records.get(name) !== record) {
        loaded.dispose();
        return;
      }
      adoptTextureContent(record.texture, loaded);
      this.configure(record.texture, record.data, name);
      this.renderer.initTexture(record.texture);
      record.resolution = entry.res;
      record.failedResolution = null;
      loaded.dispose();
    } catch (error) {
      if (this.disposed || this.records.get(name) !== record) return;
      record.failedResolution = entry.res;
      console.warn(
        `Texture upgrade failed for ${name}; retaining loaded map`,
        error,
      );
    }
  }
  setResolution(res: number) {
    for (const [name, record] of this.records) {
      record.desired = Math.min(
        name === 'stars_milky_way' ? Math.min(res, 4096) : res,
        this.maxResolution,
      );
      // An explicit quality command can retry a previous failure once.
      record.failedResolution = null;
      void this.upgrade(name, record);
    }
  }
  release(name: string) {
    const record = this.records.get(name);
    if (!record) return;
    if (record.references > 0) record.references--;
    if (record.references === 0) {
      record.texture.dispose();
      this.records.delete(name);
    }
  }
  dispose() {
    this.disposed = true;
    this.textureQueue.length = 0;
    this.loader.dispose();
    for (const r of this.records.values()) r.texture.dispose();
    this.records.clear();
    this.shapes.clear();
  }
  get gpuBytes() {
    let bytes = 0;
    for (const r of this.records.values()) {
      const maps = r.texture.mipmaps as { data?: ArrayBufferView }[];
      for (const m of maps) bytes += m.data?.byteLength ?? 0;
    }
    return bytes;
  }
  get pending() {
    let count = 0;
    for (const [name, r] of this.records) {
      if (
        r.loading ||
        (r.failedResolution === null &&
          this.url(name, r.resolution === 0 ? 1024 : r.desired)?.res !==
            r.resolution)
      )
        count++;
    }
    return count;
  }
  get textureState() {
    return Array.from(this.records, ([name, r]) => ({
      name,
      resolution: r.resolution,
      desired: r.desired,
      placeholder: r.resolution === 0,
      loading: r.loading,
      failed: r.failedResolution !== null,
    }));
  }
}
