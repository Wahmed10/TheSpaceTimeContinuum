import type { BodySpec, PositionProvider } from '@space/domain';
import {
  createCatalogProvider,
  createSolarSystemFrameTree,
} from '@space/astro';
import type { createPlanet } from '../bodies/PlanetFactory';
import type { LodLevel } from '../lod/LodSystem';
import type { PointLayer } from '../layers/PointLayer';
import type { BufferGeometry } from 'three/webgpu';
export interface RenderEntity {
  body: BodySpec;
  provider: PositionProvider;
  physical: Float64Array;
  display: Float64Array;
  visual: ReturnType<typeof createPlanet>;
  boost: number;
  screenX: number;
  screenY: number;
  visible: boolean;
  renderVisible: boolean;
  lod: LodLevel | undefined;
  pointLayer?: PointLayer;
  pointIndex: number;
  highGeometry: BufferGeometry;
  frameId: `ICRF_BODY:${string}`;
}
export class EntityRegistry {
  readonly frames = createSolarSystemFrameTree();
  readonly entries = new Map<string, RenderEntity>();
  loadCatalog(
    bodies: readonly BodySpec[],
    createVisual: (body: BodySpec) => ReturnType<typeof createPlanet>,
  ) {
    for (const body of bodies) this.add(body, createVisual(body));
  }
  add(
    body: BodySpec,
    visual: ReturnType<typeof createPlanet>,
    supplied?: PositionProvider,
  ) {
    if (this.entries.has(body.id))
      throw new Error(`Duplicate entity ${body.id}`);
    const provider = supplied ?? createCatalogProvider(body);
    const frameId = supplied
      ? (`ICRF_BODY:registered/${body.id}` as const)
      : (`ICRF_BODY:${body.id.split(':')[1]!}` as const);
    if (supplied || !body.astronomyBody)
      this.frames.register({
        id: frameId,
        parent: provider.frame,
        origin: provider,
      });
    const entry: RenderEntity = {
      body,
      provider,
      frameId,
      physical: new Float64Array(6),
      display: new Float64Array(3),
      visual,
      boost: 1,
      screenX: 0,
      screenY: 0,
      visible: true,
      renderVisible: true,
      lod: undefined,
      pointIndex: 0,
      highGeometry: visual.mesh.geometry,
    };
    this.entries.set(body.id, entry);
    return entry;
  }
  update(tdbSec: number) {
    for (const e of this.entries.values()) {
      e.visible = this.frames.resolveOrigin(e.frameId, tdbSec, e.physical);
      e.display[0] = e.physical[0]!;
      e.display[1] = e.physical[1]!;
      e.display[2] = e.physical[2]!;
    }
  }
}
