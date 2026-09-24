import type { BodySpec, PositionProvider } from '@space/domain';
import { createBodyProvider } from '@space/astro';
import type { createPlanet } from '../bodies/PlanetFactory';
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
}
export class EntityRegistry {
  readonly entries = new Map<string, RenderEntity>();
  add(body: BodySpec, visual: ReturnType<typeof createPlanet>) {
    const entry: RenderEntity = {
      body,
      provider: createBodyProvider(body.astronomyBody!),
      physical: new Float64Array(6),
      display: new Float64Array(3),
      visual,
      boost: 1,
      screenX: 0,
      screenY: 0,
      visible: true,
    };
    this.entries.set(body.id, entry);
    return entry;
  }
  update(tdbSec: number) {
    for (const e of this.entries.values()) {
      e.visible = e.provider.stateAt(tdbSec, e.physical).ok;
      e.display[0] = e.physical[0]!;
      e.display[1] = e.physical[1]!;
      e.display[2] = e.physical[2]!;
    }
  }
}
