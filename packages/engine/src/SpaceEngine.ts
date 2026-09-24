import {
  Scene,
  PerspectiveCamera,
  Vector3,
  PointLight,
  AmbientLight,
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicNodeMaterial,
  Mesh,
  SphereGeometry,
  Quaternion,
} from 'three/webgpu';
import type { WebGPURenderer } from 'three/webgpu';
import { BODIES, LAYERS } from '@space/domain';
import type { MapState } from '@space/domain';
import {
  SimulationClock,
  SEC_PER_DAY,
  createBodyProvider,
  bodyOrientation,
  tdbToIso,
  isoToTdb,
  registerEphemerisCorrection,
} from '@space/astro';
import type { ClockSnapshot } from '@space/astro';
import { createRenderer } from './render/RendererFactory';
import { PostFX } from './render/PostFX';
import { AssetManager } from './assets/AssetManager';
import { createPlanet } from './bodies/PlanetFactory';
import { createStarfield } from './bodies/Starfield';
import { EntityRegistry } from './scene/EntityRegistry';
import { radiusBoost, childDisplayPosition } from './scene/DisplayTransform';
import { CameraController } from './camera/CameraController';
import { Input } from './camera/Input';
import { LabelSystem } from './labels/LabelSystem';
import { PerfMonitor } from './perf/PerfMonitor';
import type { PerfSample } from './perf/PerfMonitor';
import { QualityManager, QUALITY } from './quality/QualityManager';
import type { QualitySetting } from './quality/QualityManager';
export interface EngineEvents {
  select: string | null;
  hover: string | null;
  clock: ClockSnapshot;
  perf: PerfSample;
  error: string;
  tier: string;
}
export interface EngineOptions {
  forceWebGL?: boolean;
  labels?: HTMLElement;
  test?: boolean;
  focus?: string;
  tdbSec?: number;
}
export interface ObjectMetrics {
  distanceSunKm: number;
  distanceEarthKm: number;
  speedKmPerSec: number;
  radiusKm: number;
  certainty: string;
}
const HERO_IDS = new Set([
  'star:sun',
  'planet:earth',
  'moon:moon',
  'planet:mars',
]);
export class SpaceEngine {
  readonly clock = new SimulationClock();
  readonly cameraController = new CameraController();
  readonly backend: string;
  private adapterDescription = 'unknown';
  private scene = new Scene();
  private camera = new PerspectiveCamera(45, 1, 0.1, 1e12);
  private assets: AssetManager;
  private registry = new EntityRegistry();
  private perf = new PerfMonitor();
  private labels: LabelSystem | null;
  private quality: QualityManager;
  private input: Input;
  private resizeObserver: ResizeObserver;
  private lifecycle = new AbortController();
  private listeners = new Map<
    keyof EngineEvents,
    Set<(payload: never) => void>
  >();
  private selected: string | null = null;
  private scale: 'true' | 'explore' = 'explore';
  private layers = new Set<string>(
    LAYERS.filter((l) => l.defaultOn).map((l) => l.id),
  );
  private sunLight = new PointLight(0xfff5e4, 3, 0, 0);
  private scratch = new Vector3();
  private projected = new Vector3();
  private quat = new Float64Array(4);
  private inverseOrientation = new Quaternion();
  private orbits: {
    line: Line;
    bodyId: string;
    parentId: string;
    points: Float64Array;
    buffer: Float32Array;
  }[] = [];
  private last = 0;
  private lastUI = 0;
  private disposed = false;
  private width = 1;
  private height = 1;
  private started = performance.now();
  private initialReady = false;
  private deterministic = false;
  private postFX: PostFX;
  static async create(canvas: HTMLCanvasElement, options: EngineOptions = {}) {
    const started = performance.now();
    await Promise.all(
      ['Sun', 'Earth', 'Moon', 'Mars'].map(async (body) => {
        const response = await fetch(
          `/data/corrections/${body.toLowerCase()}.bin`,
        );
        if (!response.ok) throw new Error(`Ephemeris unavailable for ${body}`);
        registerEphemerisCorrection(body, await response.arrayBuffer());
      }),
    );
    const { renderer, backend } = await createRenderer(canvas, {
      forceWebGL: options.forceWebGL ?? false,
      dpr: Math.min(devicePixelRatio, 2),
    });
    let assets: AssetManager | undefined;
    try {
      assets = await AssetManager.create(renderer);
      const starsResponse = await fetch('/data/stars.bin');
      if (!starsResponse.ok) throw new Error('Star catalog unavailable');
      const stars = new Float32Array(await starsResponse.arrayBuffer());
      const engine = new SpaceEngine(
        canvas,
        renderer,
        backend,
        options,
        assets,
        stars,
      );
      engine.started = started;
      engine.start();
      return engine;
    } catch (error) {
      assets?.dispose();
      renderer.dispose();
      throw error;
    }
  }
  private constructor(
    private canvas: HTMLCanvasElement,
    private renderer: WebGPURenderer,
    backend: string,
    options: EngineOptions,
    assets: AssetManager,
    stars: Float32Array,
  ) {
    this.assets = assets;
    this.deterministic = options.test ?? false;
    this.backend = backend;
    const hardware = renderer.backend as unknown as {
      device?: {
        limits: { maxTextureDimension2D: number };
        adapterInfo?: {
          vendor: string;
          architecture: string;
          description: string;
        };
      };
      gl?: WebGL2RenderingContext;
    };
    const maxTextureSize =
      hardware.device?.limits.maxTextureDimension2D ??
      (hardware.gl
        ? Number(hardware.gl.getParameter(hardware.gl.MAX_TEXTURE_SIZE))
        : 8192);
    const memoryGB =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const info = hardware.device?.adapterInfo;
    if (info)
      this.adapterDescription = [
        info.vendor,
        info.architecture,
        info.description,
      ]
        .filter(Boolean)
        .join(' / ');
    if (hardware.gl) {
      const extension = hardware.gl.getExtension('WEBGL_debug_renderer_info');
      if (extension)
        this.adapterDescription = String(
          hardware.gl.getParameter(extension.UNMASKED_RENDERER_WEBGL),
        );
    }
    this.quality = new QualityManager(
      /Mobi|Android/i.test(navigator.userAgent) ||
        matchMedia('(max-width: 700px)').matches,
      backend,
      { maxTextureSize, memoryGB },
    );
    this.renderer.setPixelRatio(this.quality.dpr);
    this.postFX = new PostFX(renderer, this.scene, this.camera);
    this.postFX.setEnabled(QUALITY[this.quality.tier].bloom);
    this.labels = options.labels ? new LabelSystem(options.labels) : null;
    this.camera.up.set(0, 0, 1);
    this.scene.add(
      this.sunLight,
      new AmbientLight(0x6688aa, 0.025),
      createStarfield(this.assets, stars),
    );
    const q = QUALITY[this.quality.tier];
    for (const body of BODIES) {
      if (!HERO_IDS.has(body.id)) continue;
      const visual = createPlanet(body, this.assets, q.segments, q.texture);
      this.scene.add(visual.group);
      this.registry.add(body, visual);
      this.labels?.add(body.id, body.name, body.color);
    }
    this.applyQuality();
    if (options.test) this.clock.setTime(isoToTdb('2026-09-22T00:00:00Z'));
    if (options.tdbSec !== undefined) this.clock.setTime(options.tdbSec);
    const tdb = this.clock.tick();
    this.registry.update(tdb);
    this.createOrbits(tdb);
    const focus = options.focus ?? 'star:sun';
    const e = this.registry.entries.get(focus)!;
    this.cameraController.focus(
      focus,
      e.physical,
      e.body.physical.meanRadiusKm!,
      performance.now(),
      false,
      focus === 'star:sun',
    );
    this.cameraController.reducedMotion = matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    this.input = new Input(
      canvas,
      this.cameraController,
      () => this.focusRadius(),
      (x, y, touch) => this.pick(x, y, touch),
      () => {
        if (this.selected) this.focus(this.selected);
      },
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          this.renderer.setAnimationLoop(null);
        } else {
          this.last = 0;
          this.lastUI = 0;
          this.start();
        }
      },
      { signal: this.lifecycle.signal },
    );
    const onDeviceLost = this.renderer.onDeviceLost.bind(this.renderer);
    this.renderer.onDeviceLost = (info) => {
      onDeviceLost(info);
      if (!this.disposed) {
        this.renderer.setAnimationLoop(null);
        this.emit('error', 'Graphics device lost. Retrying with WebGL2.');
      }
    };
    canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        this.emit(
          'error',
          'Graphics context lost. Reload in compatibility mode.',
        );
      },
      { signal: this.lifecycle.signal },
    );
    this.clock.subscribe((s) => this.emit('clock', { ...s }));
  }
  private start() {
    this.renderer.setAnimationLoop(this.frame);
  }
  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = this.last ? now - this.last : 16.7;
    this.last = now;
    this.perf.add(dt);
    const tdbSec = this.clock.tick();
    this.registry.update(tdbSec);
    const target = this.registry.entries.get(this.cameraController.targetId)!;
    this.cameraController.update(
      target.physical,
      now,
      target.body.physical.meanRadiusKm!,
    );
    this.canvas.style.opacity = String(
      1 - Math.max(this.clock.state.fade, this.cameraController.fade),
    );
    const world = this.cameraController.world;
    const sun = this.registry.entries.get('star:sun')!;
    for (const e of this.registry.entries.values()) {
      const d = Math.hypot(
        e.physical[0]! - world[0]!,
        e.physical[1]! - world[1]!,
        e.physical[2]! - world[2]!,
      );
      e.visual.animationTime.value = this.deterministic ? 0 : now / 1000;
      e.boost = radiusBoost(
        e.body.physical.meanRadiusKm!,
        d,
        e.body.kind === 'moon',
        this.scale,
      );
      // A nearby child must share the camera's physical frame. Fade its parent's
      // display enlargement out as the camera approaches the selected child.
      if (target.body.parentId === e.body.id) {
        const fade = Math.max(
          0,
          Math.min(
            1,
            (this.cameraController.distanceKm /
              target.body.physical.meanRadiusKm! -
              50) /
              50,
          ),
        );
        e.boost = 1 + (e.boost - 1) * fade;
      }
      if (e.body.kind === 'moon' && e.body.parentId) {
        const p = this.registry.entries.get(e.body.parentId);
        if (p)
          childDisplayPosition(
            e.physical,
            p.physical,
            p.display,
            p.boost,
            e.display,
          );
      }
      const radius = e.body.physical.meanRadiusKm! * e.boost;
      const group = e.visual.group;
      group.position.set(
        e.display[0]! - world[0]!,
        e.display[1]! - world[1]!,
        e.display[2]! - world[2]!,
      );
      group.scale.setScalar(radius);
      bodyOrientation(e.body.astronomyBody!, tdbSec, this.quat);
      group.quaternion.set(
        this.quat[0]!,
        this.quat[1]!,
        this.quat[2]!,
        this.quat[3]!,
      );
      if (e.visual.clouds)
        e.visual.clouds.rotation.y = ((tdbSec / 86400) * 0.015) % (2 * Math.PI);
      e.visual.cloudPhase.value = e.visual.clouds?.rotation.y ?? 0;
      e.visual.sunDirection.value
        .set(
          sun.physical[0]! - e.physical[0]!,
          sun.physical[1]! - e.physical[1]!,
          sun.physical[2]! - e.physical[2]!,
        )
        .normalize();
      this.inverseOrientation.copy(group.quaternion).invert();
      e.visual.localSunDirection.value
        .copy(e.visual.sunDirection.value)
        .applyQuaternion(this.inverseOrientation);
      group.visible =
        e.visible &&
        (e.body.kind === 'star' ||
          this.layers.has(e.body.kind === 'moon' ? 'moons' : 'planets'));
    }
    this.sunLight.position.copy(sun.visual.group.position);
    const c = this.cameraController.center;
    this.scratch.set(c[0]! - world[0]!, c[1]! - world[1]!, c[2]! - world[2]!);
    this.camera.lookAt(this.scratch);
    this.camera.near = Math.max(
      0.001,
      Math.min(
        1000,
        (this.cameraController.distanceKm - this.focusRadius()) * 0.001,
      ),
    );
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    this.updateOrbits();
    this.updateLabels();
    this.postFX.render();
    if (!this.initialReady) {
      this.initialReady = true;
      this.canvas.dataset.ready = 'true';
      this.canvas.dataset.firstFrameMs = String(
        Math.round(performance.now() - this.started),
      );
    }
    if (now - this.lastUI >= 250) {
      const elapsedSec = this.lastUI ? (now - this.lastUI) / 1000 : 0;
      this.lastUI = now;
      const stats = this.perf.stats();
      if (
        now - this.started > 3000 &&
        this.quality.sample(stats.p95Ms, elapsedSec)
      ) {
        this.renderer.setPixelRatio(this.quality.dpr);
        this.postFX.setEnabled(QUALITY[this.quality.tier].bloom);
        this.applyQuality();
        this.resize();
        this.emit('tier', this.quality.tier);
      }
      this.emit('perf', {
        ...stats,
        drawCalls: this.renderer.info.render.drawCalls,
        triangles: this.renderer.info.render.triangles,
        textures: this.renderer.info.memory.textures,
        backend: this.backend,
        tier: this.quality.tier,
      });
    }
  };
  private focusRadius() {
    const e = this.registry.entries.get(this.cameraController.targetId)!;
    return e.body.physical.meanRadiusKm!;
  }
  private updateLabels() {
    this.labels?.begin();
    for (const e of this.registry.entries.values()) {
      this.projected.copy(e.visual.group.position).project(this.camera);
      e.screenX = ((this.projected.x + 1) * this.width) / 2;
      e.screenY = ((1 - this.projected.y) * this.height) / 2;
      const inView =
        this.projected.z < 1 &&
        this.projected.z > -1 &&
        e.screenX > 0 &&
        e.screenX < this.width &&
        e.screenY > 0 &&
        e.screenY < this.height;
      const local = this.cameraController.distanceKm < 2e6;
      const relevant =
        !local ||
        e.body.id === this.cameraController.targetId ||
        e.body.parentId === this.cameraController.targetId;
      this.labels?.update(
        e.body.id,
        e.screenX,
        e.screenY,
        inView && relevant && e.visual.group.visible,
        e.body.id === this.selected,
      );
    }
  }
  private pick(clientX: number, clientY: number, touch: boolean) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left,
      y = clientY - rect.top;
    let best: string | null = null;
    let nearest = Infinity;
    for (const e of this.registry.entries.values()) {
      if (!e.visual.group.visible) continue;
      this.projected.copy(e.visual.group.position).project(this.camera);
      if (this.projected.z > 1 || this.projected.z < -1) continue;
      const distance = e.visual.group.position.length();
      const px =
        (((e.body.physical.meanRadiusKm! * e.boost) / distance) * this.height) /
        (2 * Math.tan(Math.PI / 8));
      const d = Math.hypot(e.screenX - x, e.screenY - y);
      if (d < Math.max(touch ? 24 : 12, px) && d < nearest) {
        best = e.body.id;
        nearest = d;
      }
    }
    this.select(best);
  }
  private createOrbits(tdb: number) {
    const a = new Float64Array(6),
      parent = new Float64Array(6);
    for (const e of this.registry.entries.values()) {
      if (!e.body.parentId) continue;
      const p = this.registry.entries.get(e.body.parentId);
      if (!p) continue;
      const parentProvider = createBodyProvider(p.body.astronomyBody!);
      const n = 256;
      const points = new Float64Array((n + 1) * 3);
      for (let i = 0; i <= n; i++) {
        let t = tdb + (i / n - 0.5) * e.body.physical.periodDays! * SEC_PER_DAY;
        if (e.provider.validity !== 'unbounded')
          t = Math.max(
            e.provider.validity.fromTdb,
            Math.min(e.provider.validity.toTdb, t),
          );
        if (
          !e.provider.stateAt(t, a).ok ||
          !parentProvider.stateAt(t, parent).ok
        )
          throw new Error(`Orbit outside ephemeris validity: ${e.body.id}`);
        for (let j = 0; j < 3; j++) points[i * 3 + j] = a[j]! - parent[j]!;
      }
      const buffer = new Float32Array(points);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(buffer, 3));
      const line = new Line(
        geometry,
        new LineBasicNodeMaterial({
          color: e.body.color,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        }),
      );
      line.frustumCulled = false;
      this.scene.add(line);
      this.orbits.push({
        line,
        bodyId: e.body.id,
        parentId: e.body.parentId,
        points,
        buffer: geometry.getAttribute('position').array as Float32Array,
      });
    }
  }
  private updateOrbits() {
    const world = this.cameraController.world;
    for (const orbit of this.orbits) {
      const p = this.registry.entries.get(orbit.parentId)!;
      orbit.line.visible =
        this.layers.has('orbits') &&
        (orbit.parentId === 'star:sun' ||
          this.cameraController.distanceKm < 2e7);
      orbit.line.position.set(
        p.physical[0]! - world[0]!,
        p.physical[1]! - world[1]!,
        p.physical[2]! - world[2]!,
      );
    }
  }
  resize() {
    this.width = Math.max(1, this.canvas.clientWidth);
    this.height = Math.max(1, this.canvas.clientHeight);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }
  on<K extends keyof EngineEvents>(
    name: K,
    cb: (value: EngineEvents[K]) => void,
  ) {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(cb as (value: never) => void);
    return () => {
      set.delete(cb as (value: never) => void);
    };
  }
  private emit<K extends keyof EngineEvents>(name: K, value: EngineEvents[K]) {
    for (const cb of this.listeners.get(name) ?? []) cb(value as never);
  }
  select(id: string | null) {
    if (id && !this.registry.entries.has(id)) return;
    this.selected = id;
    this.emit('select', id);
  }
  focus(id: string, opts: { transition?: boolean; wide?: boolean } = {}) {
    const e = this.registry.entries.get(id);
    if (!e) return;
    this.select(id);
    this.cameraController.focus(
      id,
      e.physical,
      e.body.physical.meanRadiusKm!,
      performance.now(),
      opts.transition ?? true,
      opts.wide ?? false,
    );
  }
  follow(id: string | null) {
    if (id && id !== this.cameraController.targetId) this.focus(id);
    this.cameraController.following = id !== null;
  }
  back() {
    const view = this.cameraController.back();
    if (view) {
      const e = this.registry.entries.get(view.targetId)!;
      this.cameraController.restore(
        view,
        e.physical,
        e.body.physical.meanRadiusKm!,
        performance.now(),
      );
      this.select(view.targetId);
    }
  }
  setLayer(id: string, on: boolean) {
    if (on) this.layers.add(id);
    else this.layers.delete(id);
  }
  setScale(scale: 'true' | 'explore') {
    this.scale = scale;
  }
  setQuality(setting: QualitySetting) {
    this.quality.set(setting);
    this.renderer.setPixelRatio(this.quality.dpr);
    this.postFX.setEnabled(QUALITY[this.quality.tier].bloom);
    this.applyQuality();
    this.resize();
    this.emit('tier', this.quality.tier);
  }
  private applyQuality() {
    const tier = QUALITY[this.quality.tier];
    this.assets.setResolution(
      Math.min(tier.texture, this.quality.limits.maxTextureSize ?? 8192),
    );
    for (const e of this.registry.entries.values()) {
      const old = e.visual.mesh.geometry;
      e.visual.detailStrength.value = tier.texture >= 4096 ? 1 : 0;
      if (old.parameters.widthSegments !== tier.segments) {
        const geometry = new SphereGeometry(
          1,
          tier.segments,
          tier.segments / 2,
        );
        e.visual.group.traverse((object) => {
          if (object instanceof Mesh && object.geometry === old)
            object.geometry = geometry;
        });
        old.dispose();
      }
      e.visual.group.traverse((object) => {
        if (object.name === 'atmosphere')
          object.visible = this.quality.tier !== 'low';
      });
    }
  }
  setReducedMotion(on: boolean) {
    this.cameraController.reducedMotion = on;
  }
  getMapState(): MapState {
    return {
      focus: this.selected ?? this.cameraController.targetId,
      ...(this.clock.mode !== 'live'
        ? { t: tdbToIso(this.clock.state.tdbSec) }
        : {}),
      scale: this.scale,
      layers: [...this.layers],
    };
  }
  applyMapState(state: MapState) {
    if (state.t) this.clock.setTime(isoToTdb(state.t));
    else this.clock.goLive({ animate: false });
    if (state.scale) this.setScale(state.scale);
    if (state.layers) this.layers = new Set(state.layers);
    this.registry.update(this.clock.tick());
    this.focus(state.focus, { wide: state.camera?.preset === 'wide' });
    if (state.playback) this.clock.play(state.playback.rate);
  }
  getMetrics(id: string): ObjectMetrics | null {
    const e = this.registry.entries.get(id),
      sun = this.registry.entries.get('star:sun'),
      earth = this.registry.entries.get('planet:earth');
    if (!e || !sun || !earth) return null;
    const p = e.physical;
    return {
      distanceSunKm: Math.hypot(
        p[0]! - sun.physical[0]!,
        p[1]! - sun.physical[1]!,
        p[2]! - sun.physical[2]!,
      ),
      distanceEarthKm: Math.hypot(
        p[0]! - earth.physical[0]!,
        p[1]! - earth.physical[1]!,
        p[2]! - earth.physical[2]!,
      ),
      speedKmPerSec: Math.hypot(p[3]!, p[4]!, p[5]!),
      radiusKm: e.body.physical.meanRadiusKm!,
      certainty: 'computed',
    };
  }
  diagnostics() {
    const focus = this.registry.entries.get(this.cameraController.targetId);
    return {
      ...this.perf.stats(),
      backend: this.backend,
      tier: this.quality.tier,
      gpuBytes: this.assets.gpuBytes,
      pendingTextures: this.assets.pending,
      textureCount: this.renderer.info.memory.textures,
      entities: this.registry.entries.size,
      cameraWorld: Array.from(this.cameraController.world),
      cameraLocal: this.camera.position.toArray(),
      selected: this.selected,
      focusScreen: focus ? { x: focus.screenX, y: focus.screenY } : null,
      ready: this.initialReady,
    };
  }
  referenceView(bodyId: string, phase: 'day' | 'night' | 'quarter' | 'limb') {
    this.focus(bodyId, { transition: false });
    const body = this.registry.entries.get(bodyId),
      sun = this.registry.entries.get('star:sun');
    if (!body || !sun) return;
    const x = sun.physical[0]! - body.physical[0]!,
      y = sun.physical[1]! - body.physical[1]!,
      z = sun.physical[2]! - body.physical[2]!;
    this.cameraController.azimuthRad =
      Math.atan2(y, x) +
      (phase === 'night' ? Math.PI : phase === 'quarter' ? Math.PI / 2 : 0);
    this.cameraController.elevationRad =
      Math.atan2(z, Math.hypot(x, y)) * (phase === 'night' ? -1 : 1);
    if (phase === 'limb')
      this.cameraController.distanceKm = body.body.physical.meanRadiusKm! * 2.8;
  }
  setRendering(active: boolean) {
    if (this.disposed) return;
    if (active) {
      this.last = 0;
      this.start();
    } else this.renderer.setAnimationLoop(null);
  }
  async measurePrecision(samples = 600) {
    this.renderer.setAnimationLoop(null);
    try {
      const { measurePrecision } = await import('./perf/PrecisionProbe');
      return await measurePrecision(this.renderer, samples);
    } finally {
      this.last = 0;
      if (!this.disposed) this.start();
    }
  }
  async benchmark(onView: (name: string) => void = () => {}) {
    let wasHidden = document.hidden;
    const visibility = () => {
      wasHidden ||= document.hidden;
    };
    document.addEventListener('visibilitychange', visibility);
    const views = [
      { name: 'Solar System', id: 'star:sun', wide: true },
      { name: 'Earth close', id: 'planet:earth' },
      { name: 'Earth LEO', id: 'planet:earth', distance: 6771.0084 },
      { name: 'Moon close', id: 'moon:moon' },
      { name: 'Mars close', id: 'planet:mars' },
    ];
    const results = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));
    const saved = this.getMapState(),
      savedMode = this.clock.mode,
      savedRate = this.clock.rate,
      setting = this.quality.setting;
    try {
      this.clock.setTime(isoToTdb('2026-09-22T00:00:00Z'));
      this.setScale('true');
      this.setQuality(setting === 'auto' ? this.quality.tier : setting);
      for (const view of views) {
        if (this.disposed)
          throw new Error('Renderer was disposed during benchmark');
        onView(view.name);
        this.focus(view.id, { transition: false, wide: view.wide ?? false });
        if (view.distance) {
          this.referenceView(view.id, 'quarter');
          this.cameraController.distanceKm = view.distance;
        }
        const deadline = performance.now() + 30000;
        while (this.assets.pending && performance.now() < deadline)
          await wait(100);
        if (this.assets.pending)
          throw new Error(
            'Textures did not settle. Wait for loading and run again.',
          );
        await wait(3000);
        this.perf.reset();
        await wait(10000);
        if (wasHidden)
          throw new Error(
            'Benchmark invalid: the tab was hidden. Run again with this tab visible.',
          );
        results.push({
          view: view.name,
          ...this.diagnostics(),
          pendingTextures: this.assets.pending,
        });
      }
      return {
        measuredAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        viewport: {
          width: this.width,
          height: this.height,
          dpr: this.quality.dpr,
        },
        firstFrameMs: Number(this.canvas.dataset.firstFrameMs),
        backend: this.backend,
        adapter: this.adapterDescription,
        softwareRenderer: /swiftshader|llvmpipe|software/i.test(
          this.adapterDescription,
        ),
        results,
      };
    } finally {
      document.removeEventListener('visibilitychange', visibility);
      if (!this.disposed) {
        this.setQuality(setting);
        this.applyMapState(saved);
        if (savedMode === 'playing') this.clock.play(savedRate);
      }
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.lifecycle.abort();
    this.resizeObserver.disconnect();
    this.input.dispose();
    this.labels?.dispose();
    this.assets.dispose();
    this.postFX.dispose();
    const geometries = new Set<BufferGeometry>();
    this.scene.traverse((o) => {
      const mesh = o as unknown as {
        geometry?: BufferGeometry;
        material?: { dispose: () => void; map?: { dispose: () => void } };
      };
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) {
        mesh.material.map?.dispose();
        mesh.material.dispose();
      }
    });
    for (const g of geometries) g.dispose();
    this.renderer.dispose();
    this.listeners.clear();
  }
}
