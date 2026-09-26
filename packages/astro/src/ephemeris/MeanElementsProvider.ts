import type {
  Certainty,
  FrameId,
  PositionProvider,
  StateFailure,
  StateResult,
} from '@space/domain';
import { solveKepler } from './KeplerProvider';
export interface MeanElements {
  epochTdbSec: number;
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationRad: number;
  ascendingNodeRad: number;
  argumentOfPeriapsisRad: number;
  meanAnomalyRad: number;
  meanMotionRadPerSec: number;
  nodeRateRadPerSec: number;
  periapsisRateRadPerSec: number;
  poleRaRad: number;
  poleDecRad: number;
}
/** Approximate precessing ellipse. Pole is the reference-plane pole in ICRF;
 * zero longitude is that plane's ascending node on the ICRF equator.
 * Signed rates and anomalistic mean motion are explicit, not inferred here. */
export class MeanElementsProvider implements PositionProvider {
  readonly method = 'mean-elements' as const;
  private readonly elements: Readonly<MeanElements>;
  private readonly basis = new Float64Array(9);
  private readonly result: StateResult;
  private readonly failure: StateFailure = {
    ok: false,
    reason: 'out-of-validity',
  };
  readonly validity: { fromTdb: number; toTdb: number };
  constructor(
    readonly id: string,
    readonly frame: FrameId,
    elements: MeanElements,
    validity: { fromTdb: number; toTdb: number },
  ) {
    if (
      !Object.values(elements).every(Number.isFinite) ||
      elements.semiMajorAxisKm <= 0 ||
      elements.eccentricity < 0 ||
      elements.eccentricity >= 1 ||
      elements.meanMotionRadPerSec <= 0
    )
      throw new Error('Invalid mean elements');
    if (
      !Number.isFinite(validity.fromTdb) ||
      !Number.isFinite(validity.toTdb) ||
      validity.fromTdb > validity.toTdb
    )
      throw new Error('Invalid mean-element validity');
    this.elements = Object.freeze({ ...elements });
    this.validity = Object.freeze({ ...validity });
    this.result = { ok: true, frame, certainty: 'approximate', stale: false };
    const ra = elements.poleRaRad,
      dec = elements.poleDecRad,
      sr = Math.sin(ra),
      cr = Math.cos(ra),
      sd = Math.sin(dec),
      cd = Math.cos(dec);
    this.basis.set([-sr, -sd * cr, cd * cr, cr, -sd * sr, cd * sr, 0, cd, sd]);
  }
  certaintyAt(_tdbSec: number): Certainty {
    return 'approximate';
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
    const e = this.elements,
      dt = tdbSec - e.epochTdbSec;
    const anomaly = solveKepler(
      e.meanAnomalyRad + dt * e.meanMotionRadPerSec,
      e.eccentricity,
    );
    const ca = Math.cos(anomaly),
      sa = Math.sin(anomaly),
      b = Math.sqrt(1 - e.eccentricity ** 2),
      rate = e.meanMotionRadPerSec / (1 - e.eccentricity * ca);
    const x = e.semiMajorAxisKm * (ca - e.eccentricity),
      y = e.semiMajorAxisKm * b * sa;
    const vx = -e.semiMajorAxisKm * sa * rate,
      vy = e.semiMajorAxisKm * b * ca * rate;
    const w = e.argumentOfPeriapsisRad + dt * e.periapsisRateRadPerSec,
      node = e.ascendingNodeRad + dt * e.nodeRateRadPerSec;
    const cw = Math.cos(w),
      sw = Math.sin(w),
      cn = Math.cos(node),
      sn = Math.sin(node),
      ci = Math.cos(e.inclinationRad),
      si = Math.sin(e.inclinationRad);
    const u = cw * x - sw * y,
      v = sw * x + cw * y;
    const du = cw * vx - sw * vy - e.periapsisRateRadPerSec * v,
      dv = sw * vx + cw * vy + e.periapsisRateRadPerSec * u;
    const px = cn * u - sn * ci * v,
      py = sn * u + cn * ci * v,
      pz = si * v;
    const dx = cn * du - sn * ci * dv - e.nodeRateRadPerSec * py;
    const dy = sn * du + cn * ci * dv + e.nodeRateRadPerSec * px,
      dz = si * dv;
    for (let i = 0; i < 3; i++) {
      const j = i * 3;
      out[offset + i] =
        this.basis[j]! * px + this.basis[j + 1]! * py + this.basis[j + 2]! * pz;
      out[offset + i + 3] =
        this.basis[j]! * dx + this.basis[j + 1]! * dy + this.basis[j + 2]! * dz;
    }
    return this.result;
  }
}
