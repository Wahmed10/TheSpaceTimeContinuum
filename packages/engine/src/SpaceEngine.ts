import {
  Scene,
  PerspectiveCamera,
  Vector3,
  PointLight,
  AmbientLight,
  BufferGeometry,
  Mesh,
  SphereGeometry,
  Quaternion,
  Color,
} from 'three/webgpu';
import type { WebGPURenderer } from 'three/webgpu';
import { EXPLORABLE_BODIES, LAYERS, SATURN_RINGS } from '@space/domain';
import type {
  MapState,
  BodySpec,
  PositionProvider,
  FrameId,
} from '@space/domain';
import {
  SimulationClock,
  SEC_PER_DAY,
  tdbToIso,
  isoToTdb,
  registerEphemerisCorrection,
  registerOsculatingTable,
} from '@space/astro';
import type { ClockSnapshot } from '@space/astro';
import { createRenderer } from './render/RendererFactory';
import { PostFX } from './render/PostFX';
import { AssetManager } from './assets/AssetManager';
import { createPlanet } from './bodies/PlanetFactory';
import { createStarfield } from './bodies/Starfield';
import { EntityRegistry } from './scene/EntityRegistry';
import { prepareBodies, prepareEntities } from './scene/prepareEntities';
import type { ProviderFactory } from './scene/prepareEntities';
import { radiusBoost, childDisplayPosition } from './scene/DisplayTransform';
import { CameraController } from './camera/CameraController';
import { Input } from './camera/Input';
import { LabelSystem } from './labels/LabelSystem';
import { PointLayer } from './layers/PointLayer';
import { SourcePointLayer } from './layers/SourcePointLayer';
import type { SourcePoint } from './layers/SourcePointLayer';
import type { PointSource } from './layers/PointSource';
import { LayerRegistry } from './layers/LayerRegistry';
import { OrbitLayer } from './layers/OrbitLayer';
import { sampleOrbit } from './layers/sampleOrbit';
import { Picker } from './picking/Picker';
import { projectedDiameter, selectLod } from './lod/LodSystem';
import { PerfMonitor } from './perf/PerfMonitor';
import { CpuTimings, CPU_PATHS } from './perf/CpuTimings';
import type { PerfSample } from './perf/PerfMonitor';
import { QualityManager, QUALITY } from './quality/QualityManager';
import type { QualitySetting } from './quality/QualityManager';
export interface EngineEvents {
  select: string | null;
  hover: string | null;
  clock: ClockSnapshot;
  perf: PerfSample;
  error: string;
  sourceError: { layerId: string; message: string };
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
  'planet:jupiter',
  'planet:saturn',
]);
function entityLayer(kind: BodySpec['kind']) {
  return kind === 'moon'
    ? 'moons'
    : kind === 'dwarf'
      ? 'dwarfs'
      : kind === 'asteroid'
        ? 'neo'
        : kind === 'satellite'
          ? 'sat.brightest'
          : kind === 'spacecraft'
            ? 'spacecraft'
            : 'planets';
}
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
  private cpuTimings: CpuTimings | null = null;
  private cpuRun = false;
  private cpuClockMs: number | undefined;
  private cpuClockEvents = 0;
  private cpuUiUpdates = 0;
  private cpuInterrupted = false;
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
  private hovered: string | null = null;
  private picker = new Picker();
  private scale: 'true' | 'explore' = 'explore';
  private layers = new LayerRegistry();
  private sunLight = new PointLight(0xfff5e4, 3, 0, 0);
  private scratch = new Vector3();
  private projected = new Vector3();
  private quat = new Float64Array(4);
  private inverseOrientation = new Quaternion();
  private pointLayers = new Map<string, PointLayer>();
  private sourceLayers = new Map<string, SourcePointLayer>();
  private sourcePoints = new Map<string, SourcePoint>();
  private sourceOwners = new Map<string, string>();
  private mediumGeometry = new SphereGeometry(1, 64, 32);
  private orbits: {
    layer: OrbitLayer;
    bodyId: string;
    parentId: string;
    epoch: number;
    period: number;
    wanted: boolean;
  }[] = [];
  private orbitRefreshQueued = false;
  private lastOrbitRefresh = 0;
  private orbitRefreshCursor = 0;
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
      [
        ...EXPLORABLE_BODIES.flatMap((body) =>
          body.astronomyBody ? [body.astronomyBody] : [],
        ),
        'callisto',
      ].map(async (body) => {
        const response = await fetch(
          `/data/corrections/${body.toLowerCase()}.bin`,
        );
        if (!response.ok) throw new Error(`Ephemeris unavailable for ${body}`);
        registerEphemerisCorrection(body, await response.arrayBuffer());
      }),
    );
    await Promise.all(
      EXPLORABLE_BODIES.filter(
        (body) =>
          body.provenance.providerId === 'jpl-horizons-orbital-elements',
      ).map(async (body) => {
        const response = await fetch(
          `/data/orbits/${body.id.split(':')[1]}.bin`,
        );
        if (!response.ok)
          throw new Error(`Orbital data unavailable for ${body.name}`);
        registerOsculatingTable(body.id, await response.arrayBuffer());
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
    this.registry.loadCatalog(EXPLORABLE_BODIES, (body) => {
      const hero = HERO_IDS.has(body.id);
      const visual = createPlanet(
        body,
        this.assets,
        hero ? q.segments : Math.min(64, q.segments),
        q.texture,
        true,
      );
      this.scene.add(visual.group);
      // The procedural Sun glow is a local canvas map outside AssetManager.
      visual.group.traverse((object) => {
        const map = (object as Mesh).material as
          { map?: import('three/webgpu').Texture } | undefined;
        if (map?.map) this.renderer.initTexture(map.map);
      });
      this.labels?.add(body.id, body.name, body.color, body.importance);
      return visual;
    });
    const palette = new Color();
    for (const e of this.registry.entries.values()) {
      const parent = e.body.parentId ?? e.body.id;
      let layer = this.pointLayers.get(parent);
      if (!layer) {
        layer = new PointLayer(
          EXPLORABLE_BODIES.filter(
            (body) => (body.parentId ?? body.id) === parent,
          ).length,
        );
        this.pointLayers.set(parent, layer);
        this.scene.add(layer.object);
      }
      e.pointLayer = layer;
      e.pointIndex = Number(layer.object.userData.used ?? 0);
      layer.object.userData.used = e.pointIndex + 1;
      palette.set(e.body.color).toArray(layer.colors.array, e.pointIndex * 3);
    }
    this.applyQuality();
    for (const definition of LAYERS) {
      const catalog = ['planets', 'moons', 'dwarfs', 'orbits'].includes(
        definition.id,
      );
      this.layers.register(
        {
          ...definition,
          available: catalog,
          category: definition.id.startsWith('sat.')
            ? 'satellites'
            : definition.id === 'neo'
              ? 'small-bodies'
              : definition.id === 'spacecraft'
                ? 'spacecraft'
                : definition.id === 'orbits'
                  ? 'orbits'
                  : 'bodies',
          bands:
            definition.id === 'moons' || definition.id.startsWith('sat.')
              ? ['local', 'planetary']
              : ['local', 'planetary', 'solar'],
          load: () => {
            if (!catalog)
              throw new Error(
                `Data source not registered for ${definition.id}`,
              );
          },
          setVisible: () => {}, // Render passes read registry visibility; resources remain resident.
        },
        catalog,
      );
    }
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
      (x, y) =>
        this.setHover(
          x === null || y === null ? null : this.hitTest(x, y, false),
        ),
    );
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          if (this.cpuRun) this.cpuInterrupted = true;
          this.renderer.setAnimationLoop(null);
        } else {
          this.last = 0;
          this.lastUI = 0;
          if (!this.cpuRun) this.start();
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
    this.clock.subscribe((s) => {
      if (this.cpuTimings) this.cpuClockEvents++;
      this.emit('clock', { ...s });
    });
  }
  private start() {
    this.renderer.setAnimationLoop(this.frame);
  }
  private frame = (now: number) => {
    if (this.disposed) return;
    const cpuStart = this.cpuTimings ? performance.now() : 0;
    const dt = this.last ? now - this.last : 16.7;
    this.last = now;
    this.perf.add(dt);
    const tdbSec = this.clock.tick(this.cpuClockMs);
    this.registry.update(tdbSec);
    for (const [id, layer] of this.sourceLayers) {
      const priorError = layer.error;
      layer.sample(
        tdbSec,
        this.registry.frames,
        this.layers.has(id) ||
          this.sourceOwners.get(this.cameraController.targetId) === id,
      );
      if (layer.error && !priorError)
        this.emit('sourceError', { layerId: id, message: layer.error });
    }
    const target = this.target(this.cameraController.targetId)!;
    this.cameraController.update(
      target.physical,
      now,
      target.body.physical.meanRadiusKm!,
    );
    this.canvas.style.opacity = String(
      1 - Math.max(this.clock.state.fade, this.cameraController.fade),
    );
    const world = this.cameraController.world;
    this.layers.setBand(
      this.cameraController.distanceKm < 2e6
        ? 'local'
        : this.cameraController.distanceKm < 2e8
          ? 'planetary'
          : 'solar',
    );
    const sun = this.registry.entries.get('star:sun')!;
    for (const [id, layer] of this.sourceLayers)
      layer.render(world, this.layers.has(id));
    for (const layer of this.pointLayers.values()) layer.object.visible = false;
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
      if (
        !e.body.astronomyBody ||
        !this.registry.frames.resolveTextureOrientation(
          `FIXED:${e.body.astronomyBody.toLowerCase()}`,
          tdbSec,
          this.quat,
        )
      ) {
        this.quat[0] = this.quat[1] = this.quat[2] = 0;
        this.quat[3] = 1;
      }
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
      if (e.visual.rings) {
        e.visual.rings.localSunDirection.value.copy(e.visual.localSunDirection.value);
        e.visual.rings.sunDirection.value.copy(e.visual.sunDirection.value);
        e.visual.rings.scattering.value = this.quality.tier === 'low' ? 0 : 1;
      }
      e.renderVisible =
        e.visible &&
        (e.body.kind === 'star' || this.layers.has(entityLayer(e.body.kind)));
      const diameter = projectedDiameter(
        radius,
        group.position.length(),
        (this.camera.fov * Math.PI) / 180,
        this.height,
      );
      e.lod = selectLod(diameter, e.lod);
      group.visible = e.renderVisible && e.lod >= 2;
      const geometry =
        e.lod === 2 && e.highGeometry.parameters.widthSegments > 64
          ? this.mediumGeometry
          : e.highGeometry;
      for (const child of group.children) {
        // Only sphere shells share LOD geometry; rings retain their annulus.
        if (child instanceof Mesh && child.geometry instanceof SphereGeometry)
          child.geometry = geometry;
        if (child.name === 'atmosphere')
          child.visible = e.lod === 3 && this.quality.tier !== 'low';
      }
      if (e.visual.clouds) e.visual.clouds.visible = e.lod === 3;
      e.visual.detailStrength.value =
        e.lod === 3 && QUALITY[this.quality.tier].texture >= 4096 ? 1 : 0;
      const layer = e.pointLayer!;
      const parent = this.registry.entries.get(e.body.parentId ?? e.body.id)!;
      const i = e.pointIndex;
      layer.positions.setXYZ(
        i,
        e.display[0]! - parent.display[0]!,
        e.display[1]! - parent.display[1]!,
        e.display[2]! - parent.display[2]!,
      );
      layer.sizes.setX(
        i,
        e.renderVisible && e.lod < 2 ? Math.max(1.5, diameter) : 0,
      );
      if (e.renderVisible && e.lod < 2) layer.object.visible = true;
    }
    for (const [parentId, layer] of this.pointLayers) {
      const parent = this.registry.entries.get(parentId)!;
      layer.object.position.set(
        parent.display[0]! - world[0]!,
        parent.display[1]! - world[1]!,
        parent.display[2]! - world[2]!,
      );
      layer.upload(0, layer.capacity, false);
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
    this.updateOrbits(tdbSec, now);
    this.updateLabels(now);
    this.postFX.render();
    if (!this.initialReady) {
      this.initialReady = true;
      this.canvas.dataset.ready = 'true';
      this.canvas.dataset.firstFrameMs = String(
        Math.round(performance.now() - this.started),
      );
    }
    if (now - this.lastUI >= 250) {
      if (this.cpuTimings) this.cpuUiUpdates++;
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
    this.cpuTimings?.add(performance.now() - cpuStart);
  };
  private focusRadius() {
    const e = this.target(this.cameraController.targetId)!;
    return e.body.physical.meanRadiusKm!;
  }
  private updateLabels(now: number) {
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
        (!local && e.body.kind !== 'moon') ||
        e.body.id === this.cameraController.targetId ||
        e.body.parentId === this.cameraController.targetId;
      this.labels?.update(
        e.body.id,
        e.screenX,
        e.screenY,
        inView && relevant && e.renderVisible,
        e.body.id === this.selected,
        e.body.id === this.hovered,
      );
    }
    for (let pass = 0; pass < 2; pass++) {
      const id = pass === 0 ? this.selected : this.hovered;
      const point = id ? this.sourcePoints.get(id) : undefined;
      if (!point || !point.labeled) continue;
      this.projected
        .set(
          point.physical[0]! - this.cameraController.world[0]!,
          point.physical[1]! - this.cameraController.world[1]!,
          point.physical[2]! - this.cameraController.world[2]!,
        )
        .project(this.camera);
      point.screenX = ((this.projected.x + 1) * this.width) / 2;
      point.screenY = ((1 - this.projected.y) * this.height) / 2;
      const relevant = point.body.kind !== 'satellite' || id === this.selected;
      this.labels?.update(
        point.body.id,
        point.screenX,
        point.screenY,
        relevant &&
          point.renderVisible &&
          this.projected.z > -1 &&
          this.projected.z < 1,
        id === this.selected,
        id === this.hovered,
      );
    }
    this.labels?.end(now);
  }
  private pick(clientX: number, clientY: number, touch: boolean) {
    this.select(this.hitTest(clientX, clientY, touch));
  }
  private setHover(id: string | null) {
    if (this.hovered === id) return;
    this.hovered = id;
    this.ensurePointLabel(id);
    this.canvas.style.cursor = id ? 'pointer' : '';
    this.emit('hover', id);
  }
  private hitTest(clientX: number, clientY: number, touch: boolean) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left,
      y = clientY - rect.top;
    this.picker.begin(
      this.camera,
      this.cameraController.world,
      this.width,
      this.height,
      x,
      y,
      touch,
    );
    for (const point of [false, true]) {
      for (const e of this.registry.entries.values()) {
        if (!e.renderVisible || (e.lod ?? 0) < 2 !== point) continue;
        this.picker.consider(
          e.body.id,
          e.display,
          e.body.physical.meanRadiusKm! * e.boost,
          point,
        );
      }
    }
    for (const point of this.sourcePoints.values()) {
      if (point.renderVisible)
        this.picker.consider(
          point.body.id,
          point.physical,
          point.body.physical.meanRadiusKm!,
          true,
        );
    }
    return this.picker.result;
  }
  private createOrbits(tdb: number) {
    for (const e of this.registry.entries.values()) {
      if (!e.body.parentId) continue;
      const layer = this.buildOrbit(e.body.id, tdb);
      this.scene.add(layer.line);
      this.orbits.push({
        layer,
        bodyId: e.body.id,
        parentId: e.body.parentId,
        epoch: tdb,
        period: e.body.physical.periodDays! * SEC_PER_DAY,
        wanted: false,
      });
    }
  }
  private buildOrbit(id: string, tdb: number) {
    const e = this.registry.entries.get(id)!;
    const p = this.registry.entries.get(e.body.parentId!)!;
    return this.buildProviderOrbit(e.body, e.provider, p.frameId, tdb);
  }
  private buildProviderOrbit(
    body: BodySpec,
    provider: PositionProvider,
    parentFrame: FrameId,
    tdb: number,
  ) {
    const a = new Float64Array(6);
    const period = body.physical.periodDays! * SEC_PER_DAY;
    const from = Math.max(
      tdb - period / 2,
      provider.validity === 'unbounded' ? -Infinity : provider.validity.fromTdb,
    );
    const to = Math.min(
      tdb + period / 2,
      provider.validity === 'unbounded' ? Infinity : provider.validity.toTdb,
    );
    const points = sampleOrbit(
      (t, out) => {
        if (
          !provider.stateAt(t, a).ok ||
          !this.registry.frames.transformState(
            provider.frame,
            parentFrame,
            t,
            a,
            a,
          )
        )
          throw new Error(`Orbit outside ephemeris validity: ${body.id}`);
        for (let j = 0; j < 3; j++) out[j] = a[j]!;
      },
      from,
      to,
      tdb,
    );
    return new OrbitLayer(points, body.color, provider.certaintyAt(tdb));
  }
  private refreshOrbit = () => {
    this.orbitRefreshQueued = false;
    if (this.disposed) return;
    const tdb = this.clock.state.tdbSec;
    // One rebuild per scheduled task; round-robin prevents a rapidly moving
    // moon from starving the other visible trajectories during fast playback.
    for (let i = 0; i < this.orbits.length; i++) {
      const orbit =
        this.orbits[this.orbitRefreshCursor++ % this.orbits.length]!;
      if (!orbit.wanted || Math.abs(tdb - orbit.epoch) < orbit.period / 4)
        continue;
      try {
        const layer = this.buildOrbit(orbit.bodyId, tdb);
        layer.line.visible = false; // Rebased by the next render frame.
        orbit.layer.dispose();
        orbit.layer = layer;
        orbit.epoch = tdb;
        this.scene.add(layer.line);
      } catch (error) {
        this.emit('error', `Orbit update failed: ${String(error)}`);
      }
      break;
    }
  };
  private updateOrbits(tdb: number, now: number) {
    const world = this.cameraController.world;
    const target = this.target(this.cameraController.targetId)!;
    for (const orbit of this.orbits) {
      const p = this.registry.entries.get(orbit.parentId)!;
      const body = this.registry.entries.get(orbit.bodyId)!;
      const selected = orbit.bodyId === this.selected;
      orbit.wanted =
        this.layers.has('orbits') &&
        (!['dwarf', 'asteroid', 'satellite', 'spacecraft'].includes(
          body.body.kind,
        ) ||
          selected ||
          orbit.bodyId === this.hovered) &&
        (orbit.parentId === 'star:sun' ||
          (this.cameraController.distanceKm < 2e7 &&
            (orbit.parentId === target.body.id ||
              orbit.parentId === target.body.parentId)));
      orbit.layer.line.visible =
        orbit.wanted && Math.abs(tdb - orbit.epoch) <= orbit.period / 2;
      if (orbit.layer.line.visible)
        orbit.layer.update(
          p.display,
          world,
          body.body.kind === 'moon' ? p.boost : 1,
          selected,
        );
    }
    if (!this.orbitRefreshQueued && now - this.lastOrbitRefresh >= 250) {
      this.lastOrbitRefresh = now;
      this.orbitRefreshQueued = true;
      queueMicrotask(this.refreshOrbit);
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
    if (id && !this.target(id)) return;
    this.selected = id;
    this.ensurePointLabel(id);
    this.emit('select', id);
  }
  get isFollowing(): boolean {
    return this.cameraController.following;
  }
  getEntity(id: string): Readonly<BodySpec> | null {
    const body = this.target(id)?.body;
    return body
      ? {
          ...body,
          physical: { ...body.physical },
          provenance: { ...body.provenance },
          aliases: [...body.aliases],
          tags: [...body.tags],
        }
      : null;
  }
  /** Lab-only deterministic camera setup; distance is measured from the center. */
  setReferenceDistance(distanceKm: number) {
    if (!Number.isFinite(distanceKm) || distanceKm < this.focusRadius() * 1.05)
      throw new Error('Reference camera distance must be above the surface');
    this.cameraController.distanceKm = distanceKm;
  }
  private target(id: string) {
    return this.registry.entries.get(id) ?? this.sourcePoints.get(id);
  }
  private ensurePointLabel(id: string | null) {
    const point = id ? this.sourcePoints.get(id) : undefined;
    if (!point || point.labeled) return;
    this.labels?.add(
      point.body.id,
      point.body.name,
      point.body.color,
      point.body.importance,
    );
    point.labeled = true;
  }
  /** Register one resident source for an MVP small-body/satellite/spacecraft
   * layer. Return an idempotent detach function; ownership transfers on success.
   */
  registerPointLayer(id: string, source: PointSource): () => void {
    if (this.disposed) throw new Error('Engine disposed');
    if (
      !LAYERS.some((layer) => layer.id === id) ||
      (!['neo', 'spacecraft'].includes(id) && !id.startsWith('sat.'))
    )
      throw new Error(`Unsupported point layer ${id}`);
    if (this.sourceLayers.has(id))
      throw new Error(`Point source already registered for ${id}`);
    if (!source.entities.length || !this.registry.frames.has(source.frame))
      throw new Error('Point source requires entities and a known frame');
    const bodies = prepareBodies(
      {
        entries: { has: (entityId) => !!this.target(entityId) },
        frames: this.registry.frames,
      },
      source.entities,
    );
    for (const body of bodies) {
      if (!this.registry.entries.has(body.parentId!))
        throw new Error(`Point parent must be a registered body: ${body.id}`);
      const kind =
        id === 'neo'
          ? 'asteroid'
          : id === 'spacecraft'
            ? 'spacecraft'
            : 'satellite';
      if (body.kind !== kind)
        throw new Error(`Entity kind does not match ${id}: ${body.id}`);
    }
    const layer = new SourcePointLayer(source, bodies);
    layer.sample(this.clock.state.tdbSec, this.registry.frames, true);
    if (layer.error) {
      layer.dispose(false);
      throw new Error(`Point source failed: ${layer.error}`);
    }
    this.sourceLayers.set(id, layer);
    for (const point of layer.points) {
      this.sourcePoints.set(point.body.id, point);
      this.sourceOwners.set(point.body.id, id);
    }
    this.scene.add(layer.layer.object);
    this.layers.activate(id);
    return () => {
      if (this.sourceLayers.get(id) !== layer) return;
      if (this.sourceOwners.get(this.cameraController.targetId) === id)
        this.focus('planet:earth', { transition: false });
      if (this.selected && this.sourceOwners.get(this.selected) === id)
        this.select(null);
      if (this.hovered && this.sourceOwners.get(this.hovered) === id)
        this.setHover(null);
      for (const point of layer.points) {
        this.sourcePoints.delete(point.body.id);
        this.sourceOwners.delete(point.body.id);
        if (point.labeled) this.labels?.remove(point.body.id);
      }
      this.sourceLayers.delete(id);
      layer.dispose();
      let resident = false;
      for (const entry of this.registry.entries.values())
        resident ||= entityLayer(entry.body.kind) === id;
      if (!resident) this.layers.deactivate(id);
    };
  }
  /** Cold-path extension. Parent entities/frames must already be registered.
   * Optional periods require provider coverage of the sampled orbit window.
   */
  registerEntities(
    entities: readonly BodySpec[],
    providerFactory: ProviderFactory,
  ): void {
    if (this.disposed) throw new Error('Engine disposed');
    const prepared = prepareEntities(
      {
        entries: { has: (id) => !!this.target(id) },
        frames: this.registry.frames,
      },
      entities,
      providerFactory,
    );
    for (const { body } of prepared)
      if (!this.registry.entries.has(body.parentId!))
        throw new Error(`Register a body parent before ${body.id}`);
    if (!prepared.length) return;
    const tdb = this.clock.state.tdbSec;
    const staged: {
      body: BodySpec;
      provider: PositionProvider;
      visual: ReturnType<typeof createPlanet>;
      orbit: OrbitLayer | null;
    }[] = [];
    const pointGroups = new Map<string, PointLayer>();
    try {
      for (const { body, provider } of prepared) {
        const visual = createPlanet(
          body,
          this.assets,
          Math.min(64, QUALITY[this.quality.tier].segments),
          QUALITY[this.quality.tier].texture,
          false,
        );
        const entry = {
          body,
          provider,
          visual,
          orbit: null as OrbitLayer | null,
        };
        staged.push(entry);
        if (body.physical.periodDays)
          entry.orbit = this.buildProviderOrbit(
            body,
            provider,
            this.registry.entries.get(body.parentId!)!.frameId,
            tdb,
          );
      }
      for (const { body } of staged) {
        const parent = body.parentId!;
        if (pointGroups.has(parent)) continue;
        let count = staged.filter(
          (entry) => entry.body.parentId === parent,
        ).length;
        for (const e of this.registry.entries.values())
          if ((e.body.parentId ?? e.body.id) === parent) count++;
        pointGroups.set(parent, new PointLayer(count));
      }
    } catch (error) {
      for (const entry of staged) {
        entry.orbit?.dispose();
        entry.visual.group.traverse((object) => {
          if (object instanceof Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            for (const material of materials) material.dispose();
          }
        });
      }
      for (const layer of pointGroups.values()) layer.dispose();
      throw error;
    }
    for (const entry of staged) {
      const { body, provider, visual, orbit } = entry;
      this.registry.add(body, visual, provider);
      this.scene.add(visual.group);
      this.labels?.add(body.id, body.name, body.color, body.importance);
      this.layers.activate(entityLayer(body.kind));
      if (orbit) {
        this.scene.add(orbit.line);
        this.orbits.push({
          layer: orbit,
          bodyId: body.id,
          parentId: body.parentId!,
          epoch: tdb,
          period: body.physical.periodDays! * SEC_PER_DAY,
          wanted: false,
        });
      }
    }
    const color = new Color();
    for (const [parent, layer] of pointGroups) {
      let index = 0;
      for (const e of this.registry.entries.values()) {
        if ((e.body.parentId ?? e.body.id) !== parent) continue;
        e.pointLayer = layer;
        e.pointIndex = index;
        color.set(e.body.color).toArray(layer.colors.array, index++ * 3);
      }
      this.pointLayers.get(parent)?.dispose();
      this.pointLayers.set(parent, layer);
      this.scene.add(layer.object);
    }
    this.registry.update(tdb);
  }
  focus(id: string, opts: { transition?: boolean; wide?: boolean } = {}) {
    const e = this.target(id);
    if (!e || !e.visible) return;
    this.cameraController.focus(
      id,
      e.physical,
      id === 'planet:saturn' ? SATURN_RINGS.outerRadiusKm : e.body.physical.meanRadiusKm!,
      performance.now(),
      opts.transition ?? true,
      opts.wide ?? false,
    );
    this.select(id);
  }
  follow(id: string | null) {
    if (id && id !== this.cameraController.targetId) this.focus(id);
    this.cameraController.following = id !== null;
  }
  back() {
    const view = this.cameraController.back();
    if (view) {
      const e = this.target(view.targetId);
      if (!e || !e.visible) return;
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
    void this.layers
      .setVisible(id, on)
      .catch((error) => this.emit('error', String(error)));
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
      const old = e.highGeometry;
      const segments = HERO_IDS.has(e.body.id)
        ? tier.segments
        : Math.min(64, tier.segments);
      e.visual.detailStrength.value = tier.texture >= 4096 ? 1 : 0;
      if (old.parameters.widthSegments !== segments) {
        const geometry = new SphereGeometry(1, segments, segments / 2);
        e.highGeometry = geometry;
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
      layers: this.layers.enabledIds(),
    };
  }
  applyMapState(state: MapState) {
    if (state.t) this.clock.setTime(isoToTdb(state.t));
    else this.clock.goLive({ animate: false });
    if (state.scale) this.setScale(state.scale);
    if (state.layers)
      void this.layers
        .restore(state.layers)
        .catch((error) => this.emit('error', String(error)));
    this.registry.update(this.clock.tick());
    this.focus(state.focus, { wide: state.camera?.preset === 'wide' });
    if (state.playback) this.clock.play(state.playback.rate);
  }
  getMetrics(id: string): ObjectMetrics | null {
    const e = this.target(id),
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
      certainty: e.body.provenance.certainty,
    };
  }
  diagnostics() {
    const focus = this.target(this.cameraController.targetId);
    return {
      ...this.perf.stats(),
      backend: this.backend,
      tier: this.quality.tier,
      gpuBytes: this.assets.gpuBytes,
      pendingTextures: this.assets.pending,
      textureCount: this.renderer.info.memory.textures,
      entities: this.registry.entries.size,
      sourcePoints: this.sourcePoints.size,
      sources: Array.from(this.sourceLayers, ([id, layer]) => ({
        id,
        count: layer.points.length,
        error: layer.error,
      })),
      layers: this.layers.snapshot(),
      geometries: this.renderer.info.memory.geometries,
      gpuAttributes: (this.renderer.info.memory as { attributes?: number })
        .attributes,
      lod: Array.from(this.registry.entries.values(), (e) => ({
        id: e.body.id,
        level: e.lod,
        visible: e.renderVisible,
      })),
      pointLayers: this.pointLayers.size,
      rings: Array.from(this.registry.entries.values()).filter(e => e.visual.rings).map(e => ({
        id: e.body.id,
        visible: e.visual.group.visible && e.visual.rings!.mesh.visible,
        geometry: e.visual.rings!.mesh.geometry.type,
        vertices: e.visual.rings!.mesh.geometry.getAttribute('position').count,
        innerRadius: e.visual.rings!.mesh.geometry.parameters.innerRadius,
        outerRadius: e.visual.rings!.mesh.geometry.parameters.outerRadius,
      })),
      orbits: this.orbits.map((orbit) => ({
        id: orbit.bodyId,
        epoch: orbit.epoch,
        vertices: orbit.layer.points.length / 3,
        visible: orbit.layer.line.visible,
        dashed: orbit.layer.line.material.dashed,
        width: orbit.layer.line.material.linewidth,
      })),
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
  /** Lab-only ring views, in Saturn's equatorial frame; no API v1 addition. */
  ringReferenceView(side: 'north' | 'south' | 'edge', planetShadow = true, ringShadow = true) {
    this.focus('planet:saturn', { transition: false });
    const body = this.registry.entries.get('planet:saturn')!;
    this.registry.frames.resolveTextureOrientation('FIXED:saturn', this.clock.state.tdbSec, this.quat);
    this.inverseOrientation.set(this.quat[0]!, this.quat[1]!, this.quat[2]!, this.quat[3]!);
    // Aim from the sunward azimuth so shadow tests inspect the illuminated
    // hemisphere rather than a fixed longitude that can face the night side.
    const sun = this.registry.entries.get('star:sun')!;
    const localSun = new Vector3(
      sun.physical[0]! - body.physical[0]!,
      sun.physical[1]! - body.physical[1]!,
      sun.physical[2]! - body.physical[2]!,
    ).applyQuaternion(this.inverseOrientation.clone().invert());
    const horizontal = Math.hypot(localSun.x, localSun.z) || 1;
    this.projected.set(localSun.x / horizontal, side === 'edge' ? 0 : side === 'north' ? 0.6 : -0.6, localSun.z / horizontal)
      .normalize().applyQuaternion(this.inverseOrientation);
    this.cameraController.azimuthRad = Math.atan2(this.projected.y, this.projected.x);
    this.cameraController.elevationRad = Math.asin(this.projected.z);
    this.cameraController.distanceKm = body.body.physical.meanRadiusKm! * 9;
    body.visual.rings!.shadows.value = planetShadow ? 1 : 0;
    body.visual.rings!.surfaceShadows.value = ringShadow ? 1 : 0;
  }
  setRendering(active: boolean) {
    if (this.disposed) return;
    if (active) {
      this.last = 0;
      this.start();
    } else this.renderer.setAnimationLoop(null);
  }
  /** Lab-only five-path CPU timing, including renderer submission, not GPU time.
   * Run in a dedicated deterministic test page with no concurrent interactions.
   */
  async measureCpuPaths(
    frames = 120,
    warmupFrames = 30,
    onPath: (name: string) => void = () => {},
  ) {
    if (!this.deterministic || this.cpuRun || this.disposed || document.hidden)
      throw new Error(
        'CPU paths require an active, visible test page and no concurrent run',
      );
    if (
      !Number.isInteger(frames) ||
      frames < 30 ||
      frames > 1000 ||
      !Number.isInteger(warmupFrames) ||
      warmupFrames < 10 ||
      warmupFrames > 300
    )
      throw new Error('Invalid CPU sample counts');
    if (
      this.registry.entries.size !== EXPLORABLE_BODIES.length ||
      this.sourceLayers.size
    )
      throw new Error('CPU baseline requires the unextended catalog');
    const saved = this.getMapState();
    const setting = this.quality.setting;
    const mode = this.clock.mode;
    const rate = this.clock.rate;
    const selected = this.selected;
    const following = this.isFollowing;
    this.cpuRun = true;
    this.cpuInterrupted = false;
    this.setRendering(false);
    const nextFrame = () =>
      new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => {
          cancelAnimationFrame(raf);
          reject(new Error('CPU run stalled or page hidden'));
        }, 5000);
        const raf = requestAnimationFrame((time) => {
          clearTimeout(timer);
          resolve(time);
        });
      });
    const results = [];
    try {
      this.clock.pause();
      this.clock.setTime(isoToTdb('2026-09-22T00:00:00Z'));
      this.setQuality('low');
      this.setScale('true');
      await this.layers.restore(['planets', 'moons', 'dwarfs', 'orbits']);
      const deadline = performance.now() + 60000;
      while (this.assets.pending) {
        if (this.disposed || document.hidden || performance.now() > deadline)
          throw new Error('CPU run could not settle textures');
        await nextFrame();
      }
      // The amount of clock/UI/orbit scheduling work must not depend on
      // SwiftShader's variable RAF cadence. CPU duration still uses real time.
      this.clock.play(1);
      const virtualStart = Math.round(performance.now());
      const virtualEpoch = Date.now();
      let virtualFrame = 0;
      this.last = 0;
      this.lastUI = this.lastOrbitRefresh = virtualStart;
      for (const path of CPU_PATHS) {
        onPath(path.id);
        this.focus(path.focus, { transition: false });
        const timings = new CpuTimings(frames);
        this.cpuClockEvents = this.cpuUiUpdates = 0;
        for (let index = -warmupFrames; index < frames; index++) {
          await nextFrame();
          if (this.disposed || document.hidden || this.cpuInterrupted)
            throw new Error('CPU run interrupted');
          const progress = Math.max(0, index) / (frames - 1);
          this.cameraController.distanceKm =
            path.distance * path.zoom ** progress;
          this.cameraController.azimuthRad = -1.3 + (progress * Math.PI) / 2;
          this.cameraController.elevationRad =
            path.focus === 'star:sun' ? 1.05 : 0.45;
          this.cpuTimings = index >= 0 ? timings : null;
          const elapsed = Math.round((++virtualFrame * 1000) / 60);
          this.cpuClockMs = virtualEpoch + elapsed;
          this.frame(virtualStart + elapsed);
        }
        this.cpuTimings = null;
        results.push({
          path: path.id,
          ...timings.report(),
          clockEvents: this.cpuClockEvents,
          uiUpdates: this.cpuUiUpdates,
        });
      }
      return {
        schemaVersion: 2 as const,
        measuredAt: new Date().toISOString(),
        backend: this.backend,
        adapter: this.adapterDescription,
        softwareRenderer: /swiftshader|llvmpipe|software/i.test(
          this.adapterDescription,
        ),
        userAgent: navigator.userAgent,
        tier: this.quality.tier,
        viewport: {
          width: this.width,
          height: this.height,
          dpr: this.quality.dpr,
        },
        entities: this.registry.entries.size,
        clockRate: 1,
        startTime: '2026-09-22T00:00:00Z',
        frames,
        warmupFrames,
        method:
          'performance.now around complete engine frame, including ephemeris updates and render submission; fixed 60 Hz scheduling at 1x simulation time; RAF waits excluded; not GPU timing',
        results,
      };
    } finally {
      this.cpuTimings = null;
      this.cpuRun = false;
      this.cpuClockMs = undefined;
      if (!this.disposed) {
        this.setQuality(setting);
        this.applyMapState(saved);
        this.select(selected);
        this.follow(following ? this.cameraController.targetId : null);
        if (mode === 'live') this.clock.goLive({ animate: false });
        else if (mode === 'playing') this.clock.play(rate);
        this.setRendering(true);
      }
    }
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
  async measurePoints(frames = 240) {
    this.renderer.setAnimationLoop(null);
    try {
      const { measurePoints } = await import('./perf/PointProbe');
      const result = await measurePoints(
        this.renderer,
        frames,
        () => this.disposed,
      );
      return {
        ...result,
        backend: this.backend,
        adapter: this.adapterDescription,
        softwareRenderer: /swiftshader|llvmpipe|software/i.test(
          this.adapterDescription,
        ),
        measuredAt: new Date().toISOString(),
      };
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
    this.layers.dispose();
    this.labels?.dispose();
    this.assets.dispose();
    this.postFX.dispose();
    for (const orbit of this.orbits) orbit.layer.dispose();
    for (const layer of this.pointLayers.values()) layer.dispose();
    for (const layer of this.sourceLayers.values()) layer.dispose();
    this.sourceLayers.clear();
    this.sourcePoints.clear();
    this.sourceOwners.clear();
    this.pointLayers.clear();
    const geometries = new Set<BufferGeometry>();
    geometries.add(this.mediumGeometry);
    for (const e of this.registry.entries.values())
      geometries.add(e.highGeometry);
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
