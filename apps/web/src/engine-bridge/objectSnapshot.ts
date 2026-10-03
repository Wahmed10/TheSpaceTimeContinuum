import type { EngineApi } from '@space/engine';
import { tdbToIso } from '@space/astro';

/** Cold public getters sampled by the existing throttled UI bridge. */
export function readObjectSnapshot(engine: EngineApi | null, id: string) {
  return {
    metrics: engine?.getMetrics(id) ?? null,
    simulationUtc: engine ? tdbToIso(engine.clock.state.tdbSec) : null,
  };
}
