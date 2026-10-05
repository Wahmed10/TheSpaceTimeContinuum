import * as Astronomy from 'astronomy-engine';
import type {
  Certainty,
  PositionProvider,
  StateFailure,
  StateResult,
} from '@space/domain';
import { toAstroTime } from './AstronomyEngineProvider';
import type { CorrectionResolver } from './AstronomyEngineProvider';
import { AU_KM, SEC_PER_DAY, MIN_UTC_MS, MAX_UTC_MS } from '../time/constants';
import { utcMsToTdb } from '../time/scales';
import { getEphemerisCorrection } from './ResidualTable';

export type GalileanMoon = 'io' | 'europa' | 'ganymede' | 'callisto';
/** One upstream evaluation for all four moons per epoch. Upstream still allocates. */
export class JupiterMoonsCache {
  private tdbSec = NaN;
  private states: Astronomy.JupiterMoonsInfo | undefined;
  at(tdbSec: number): Astronomy.JupiterMoonsInfo {
    if (tdbSec !== this.tdbSec || !this.states) {
      this.states = Astronomy.JupiterMoons(toAstroTime(tdbSec));
      this.tdbSec = tdbSec;
    }
    return this.states;
  }
}
const defaultCache = new JupiterMoonsCache();
export class JupiterMoonsProvider implements PositionProvider {
  readonly frame = 'ICRF_BODY:jupiter' as const;
  readonly method = 'analytic-ephemeris' as const;
  readonly validity = Object.freeze({
    fromTdb: utcMsToTdb(MIN_UTC_MS),
    toTdb: utcMsToTdb(MAX_UTC_MS),
  });
  readonly id: string;
  private readonly result: StateResult = {
    ok: true,
    frame: this.frame,
    certainty: 'computed',
    stale: false,
  };
  private readonly failure: StateFailure = {
    ok: false,
    reason: 'out-of-validity',
  };
  private readonly approximate: StateResult = {
    ok: true,
    frame: this.frame,
    certainty: 'approximate',
    stale: false,
  };
  constructor(
    readonly moon: GalileanMoon,
    private readonly cache = defaultCache,
    private readonly correctionAt: CorrectionResolver = () =>
      getEphemerisCorrection(moon),
  ) {
    if (!['io', 'europa', 'ganymede', 'callisto'].includes(moon))
      throw new Error(`Unknown Galilean moon ${moon}`);
    this.id = `astronomy:${moon}`;
  }
  certaintyAt(tdbSec: number): Certainty {
    return this.moon !== 'callisto' ||
      this.correctionAt(tdbSec)?.contains(tdbSec)
      ? 'computed'
      : 'approximate';
  }
  stateAt(
    tdbSec: number,
    out: Float64Array,
    offset = 0,
  ): StateResult | StateFailure {
    if (
      !Number.isFinite(tdbSec) ||
      tdbSec < this.validity.fromTdb ||
      tdbSec > this.validity.toTdb
    )
      return this.failure;
    const state = this.cache.at(tdbSec)[this.moon];
    out[offset] = state.x * AU_KM;
    out[offset + 1] = state.y * AU_KM;
    out[offset + 2] = state.z * AU_KM;
    out[offset + 3] = (state.vx * AU_KM) / SEC_PER_DAY;
    out[offset + 4] = (state.vy * AU_KM) / SEC_PER_DAY;
    out[offset + 5] = (state.vz * AU_KM) / SEC_PER_DAY;
    const correction = this.correctionAt(tdbSec);
    return this.moon !== 'callisto' || correction?.addTo(tdbSec, out, offset)
      ? this.result
      : this.approximate;
  }
}
