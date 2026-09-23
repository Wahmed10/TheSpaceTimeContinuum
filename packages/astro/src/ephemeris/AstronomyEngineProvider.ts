import * as Astronomy from 'astronomy-engine';
import type {
  PositionProvider,
  StateResult,
  StateFailure,
  Certainty,
} from '@space/domain';
import { AU_KM, SEC_PER_DAY, MIN_UTC_MS, MAX_UTC_MS } from '../time/constants';
import { utcMsToTdb, tdbMinusTt } from '../time/scales';
import {getEphemerisCorrection} from './ResidualTable';
let lastTdb = NaN;
let lastTime: Astronomy.AstroTime;
// Use TT directly: converting via UTC would substitute astronomy-engine's future
// delta-T extrapolation for the canonical TT, producing multi-minute errors by 2100.
export function toAstroTime(tdbSec: number): Astronomy.AstroTime {
  if (tdbSec !== lastTdb) {
    lastTdb = tdbSec;
    lastTime = Astronomy.AstroTime.FromTerrestrialTime(
      (tdbSec - tdbMinusTt(tdbSec)) / SEC_PER_DAY,
    );
  }
  return lastTime;
}
export class AstronomyEngineProvider implements PositionProvider {
  readonly frame = 'ICRF_SSB' as const;
  readonly method = 'analytic-ephemeris' as const;
  readonly validity = {
    fromTdb: utcMsToTdb(MIN_UTC_MS),
    toTdb: utcMsToTdb(MAX_UTC_MS),
  };
  private result: StateResult = {
    ok: true,
    frame: 'ICRF_SSB',
    certainty: 'computed',
    stale: false,
  };
  private failure: StateFailure = { ok: false, reason: 'out-of-validity' };
  readonly id: string;
  constructor(readonly body: Astronomy.Body) {
    this.id = `astronomy:${body}`;
  }
  certaintyAt(_tdbSec: number): Certainty {
    return 'computed';
  }
  stateAt(
    tdbSec: number,
    out: Float64Array,
    offset = 0,
  ): StateResult | StateFailure {
    if (
      tdbSec < this.validity.fromTdb ||
      tdbSec > this.validity.toTdb ||
      !Number.isFinite(tdbSec)
    )
      return this.failure;
    const s = Astronomy.BaryState(this.body, toAstroTime(tdbSec));
    out[offset] = s.x * AU_KM;
    out[offset + 1] = s.y * AU_KM;
    out[offset + 2] = s.z * AU_KM;
    out[offset + 3] = (s.vx * AU_KM) / SEC_PER_DAY;
    out[offset + 4] = (s.vy * AU_KM) / SEC_PER_DAY;
    out[offset + 5] = (s.vz * AU_KM) / SEC_PER_DAY;
    const correction=getEphemerisCorrection(this.body);
    if(correction&&!correction.addTo(tdbSec,out,offset))return this.failure;
    return this.result;
  }
}
export function createBodyProvider(body: string): AstronomyEngineProvider {
  if (!Object.values(Astronomy.Body).includes(body as Astronomy.Body))
    throw new Error(`Unknown body ${body}`);
  return new AstronomyEngineProvider(body as Astronomy.Body);
}
