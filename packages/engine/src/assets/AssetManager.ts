import { RepeatWrapping, SRGBColorSpace, NoColorSpace } from 'three/webgpu';
import type { Texture, WebGPURenderer } from 'three/webgpu';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
interface AssetRecord {
  texture: Texture;
  resolution: number;
  desired: number;
  loading: boolean;
  data: boolean;
  references: number;
}
interface ManifestEntry {
  name: string;
  res: number;
  file: string;
}
export class AssetManager {
  private records = new Map<string, AssetRecord>();
  private loader: KTX2Loader;
  private disposed = false;
  constructor(
    private renderer: WebGPURenderer,
    private manifest: ManifestEntry[],
  ) {
    this.loader = new KTX2Loader()
      .setTranscoderPath('/basis/')
      .setWorkerLimit(2)
      .detectSupport(renderer);
  }
  static async create(renderer: WebGPURenderer) {
    const response = await fetch('/assets/textures/manifest.json');
    if (!response.ok) throw new Error('Texture manifest unavailable');
    const manager = new AssetManager(
      renderer,
      (await response.json()) as ManifestEntry[],
    );
    try {
      await manager.preload([
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
  private configure(texture: Texture, data: boolean) {
    texture.colorSpace = data ? NoColorSpace : SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.anisotropy = 4;
    texture.repeat.y = -1;
    texture.offset.y = 1;
    texture.needsUpdate = true;
  }
  async preload(names: string[]) {
    await Promise.all(
      names.map(async (name) => {
        const entry = this.url(name, 1024);
        if (!entry) throw new Error(`Missing texture ${name}`);
        const texture = await this.loader.loadAsync(entry.file);
        if (this.disposed) {
          texture.dispose();
          return;
        }
        const data = /normal|specular|cloud|height/.test(name);
        this.configure(texture, data);
        // Catalog LOD may hide every sphere at startup. Keep the small hero
        // texture set resident so first focus does not allocate new textures.
        this.renderer.initTexture(texture);
        this.records.set(name, {
          texture,
          resolution: 1024,
          desired: 1024,
          loading: false,
          data,
          references: 0,
        });
      }),
    );
  }
  load(name: string, res = 2048, data = false): Texture {
    const record = this.records.get(name);
    if (!record) throw new Error(`Texture not preloaded: ${name}`);
    record.data = data;
    record.references++;
    record.desired = res;
    void this.upgrade(name, record);
    return record.texture;
  }
  private async upgrade(name: string, record: AssetRecord) {
    if (this.disposed || record.loading || this.records.get(name)!==record) return;
    const entry = this.url(name, record.desired);
    if (!entry || entry.res === record.resolution) return;
    record.loading = true;
    try {
      const loaded = await this.loader.loadAsync(entry.file);
      if (this.disposed || this.records.get(name) !== record) {
        loaded.dispose();
        return;
      }
      record.texture.dispose();
      record.texture.copy(loaded);
      this.configure(record.texture, record.data);
      this.renderer.initTexture(record.texture);
      record.resolution = entry.res;
      loaded.dispose();
    } catch (error) {
      console.warn(
        `Texture upgrade failed for ${name}; retaining loaded map`,
        error,
      );
    } finally {
      record.loading = false;
      if (
        !this.disposed &&
        this.url(name, record.desired)?.res !== record.resolution &&
        entry.res !== this.url(name, record.desired)?.res
      )
        void this.upgrade(name, record);
    }
  }
  setResolution(res: number) {
    for (const [name, record] of this.records) {
      record.desired = name === 'stars_milky_way' ? Math.min(res, 4096) : res;
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
    this.loader.dispose();
    for (const r of this.records.values()) r.texture.dispose();
    this.records.clear();
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
    for (const r of this.records.values()) if (r.loading) count++;
    return count;
  }
}
