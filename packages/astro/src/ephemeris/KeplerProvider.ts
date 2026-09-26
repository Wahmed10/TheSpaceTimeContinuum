import type {
  Certainty,
  FrameId,
  PositionProvider,
  StateFailure,
  StateResult,
} from '@space/domain';

export interface KeplerElements {
  epochTdbSec: number;
  /** Positive for an ellipse; negative for a hyperbola. Parabolas unsupported. */
  semiMajorAxisKm: number;
  eccentricity: number;
  inclinationRad: number;
  ascendingNodeRad: number;
  argumentOfPeriapsisRad: number;
  meanAnomalyRad: number;
  gravitationalParameterKm3PerSec2: number;
}

/** Safeguarded Newton iteration with a Danby-style eccentricity starter.
 * Bracketing prevents high-eccentricity iterations from diverging. */
export function solveKepler(
  meanAnomalyRad: number,
  eccentricity: number,
): number {
  const e = eccentricity;
  if (
    !Number.isFinite(meanAnomalyRad) ||
    !Number.isFinite(e) ||
    e < 0 ||
    e === 1
  )
    return NaN;
  const hyperbolic = e > 1;
  const m = hyperbolic
    ? Math.abs(meanAnomalyRad)
    : ((((meanAnomalyRad + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
        (2 * Math.PI)) -
      Math.PI;
  let low = hyperbolic ? 0 : -Math.PI;
  let high = hyperbolic ? Math.asinh(m / e) + 2 : Math.PI;
  let anomaly = hyperbolic
    ? Math.asinh(m / e)
    : m + 0.85 * e * Math.sign(Math.sin(m));
  for (let iteration = 0; iteration < 80; iteration++) {
    const f = hyperbolic
      ? e * Math.sinh(anomaly) - anomaly - m
      : anomaly - e * Math.sin(anomaly) - m;
    if (Math.abs(f) < 2e-14 * Math.max(1, Math.abs(m)))
      return hyperbolic ? Math.sign(meanAnomalyRad) * anomaly : anomaly;
    if (f > 0) high = anomaly;
    else low = anomaly;
    const derivative = hyperbolic
      ? e * Math.cosh(anomaly) - 1
      : 1 - e * Math.cos(anomaly);
    const next = anomaly - f / derivative;
    anomaly = next > low && next < high ? next : (low + high) / 2;
  }
  return NaN;
}

/** Two-body osculating elements in the specified frame's reference plane.
 * Ecliptic elements must be converted to ICRF before use. No perturbations.
 * Default validity is epoch +/-30 days; callers must deliberately override it. */
export class KeplerProvider implements PositionProvider {
  readonly method = 'kepler-2body' as const;
  readonly validity: { fromTdb: number; toTdb: number };
  private readonly elements: Readonly<KeplerElements>;
  private readonly basis = new Float64Array(6);
  private readonly meanMotionRadPerSec: number;
  private readonly result: StateResult;
  private readonly failure: StateFailure = {
    ok: false,
    reason: 'out-of-validity',
  };
  private readonly noData: StateFailure = { ok: false, reason: 'no-data' };
  constructor(
    readonly id: string,
    readonly frame: FrameId,
    elements: KeplerElements,
    validity = {
      fromTdb: elements.epochTdbSec - 30 * 86400,
      toTdb: elements.epochTdbSec + 30 * 86400,
    },
  ) {
    if (
      !Object.values(elements).every(Number.isFinite) ||
      elements.eccentricity < 0 ||
      elements.eccentricity === 1 ||
      elements.semiMajorAxisKm === 0 ||
      elements.eccentricity < 1 !== elements.semiMajorAxisKm > 0 ||
      elements.gravitationalParameterKm3PerSec2 <= 0
    )
      throw new Error('Invalid Kepler elements');
    if (
      !Number.isFinite(validity.fromTdb) ||
      !Number.isFinite(validity.toTdb) ||
      validity.fromTdb > validity.toTdb
    )
      throw new Error('Invalid Kepler validity');
    this.elements = Object.freeze({ ...elements });
    this.validity = Object.freeze({ ...validity });
    this.result = { ok: true, frame, certainty: 'propagated', stale: false };
    const {
      ascendingNodeRad: node,
      inclinationRad: inc,
      argumentOfPeriapsisRad: peri,
    } = elements;
    const cn = Math.cos(node),
      sn = Math.sin(node),
      ci = Math.cos(inc),
      si = Math.sin(inc),
      cp = Math.cos(peri),
      sp = Math.sin(peri);
    this.basis.set([
      cn * cp - sn * sp * ci,
      sn * cp + cn * sp * ci,
      sp * si,
      -cn * sp - sn * cp * ci,
      -sn * sp + cn * cp * ci,
      cp * si,
    ]);
    this.meanMotionRadPerSec = Math.sqrt(
      elements.gravitationalParameterKm3PerSec2 /
        Math.abs(elements.semiMajorAxisKm) ** 3,
    );
  }
  certaintyAt(_tdbSec: number): Certainty {
    return 'propagated';
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
    const { eccentricity: e, semiMajorAxisKm: a } = this.elements;
    const anomaly = solveKepler(
      this.elements.meanAnomalyRad +
        this.meanMotionRadPerSec * (tdbSec - this.elements.epochTdbSec),
      e,
    );
    if (!Number.isFinite(anomaly)) return this.noData;
    let x: number, y: number, vx: number, vy: number;
    if (e < 1) {
      const c = Math.cos(anomaly),
        s = Math.sin(anomaly),
        b = Math.sqrt(1 - e * e),
        rate = this.meanMotionRadPerSec / (1 - e * c);
      x = a * (c - e);
      y = a * b * s;
      vx = -a * s * rate;
      vy = a * b * c * rate;
    } else {
      const c = Math.cosh(anomaly),
        s = Math.sinh(anomaly),
        b = Math.sqrt(e * e - 1),
        rate = this.meanMotionRadPerSec / (e * c - 1);
      x = a * (c - e);
      y = -a * b * s;
      vx = a * s * rate;
      vy = -a * b * c * rate;
    }
    for (let i = 0; i < 3; i++) {
      out[offset + i] = this.basis[i]! * x + this.basis[i + 3]! * y;
      out[offset + i + 3] = this.basis[i]! * vx + this.basis[i + 3]! * vy;
    }
    return this.result;
  }
}
