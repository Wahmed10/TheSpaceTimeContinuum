import type { EngineApi } from '@space/engine';
import { tdbToIso } from './uiTimeAdapter';

/** Cold public getters sampled by the existing throttled UI bridge. */
export function readObjectSnapshot(engine: EngineApi | null, id: string) {
  return {
    metrics: engine?.getMetrics(id) ?? null,
    positionStatus: engine?.getPositionStatus(id) ?? 'loading',
    simulationUtc: engine ? tdbToIso(engine.clock.state.tdbSec) : null,
  };
}
