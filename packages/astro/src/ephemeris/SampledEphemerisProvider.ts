import type {
  Certainty,
  FrameId,
  PositionProvider,
  StateFailure,
  StateResult,
} from '@space/domain';

export interface EphemerisSegment {
  /** Strictly increasing TDB seconds from J2000; at least two samples. */
  times: Float64Array;
  /** Packed [x,y,z,vx,vy,vz], km and km/s, one state per sample. */
  states: Float64Array;
  certainty: Certainty;
  stale?: boolean;
}
interface StoredSegment extends EphemerisSegment {
  result: StateResult;
}

/** Piecewise cubic Hermite interpolation. Gaps fail closed; never extrapolates.
 * Data is copied at construction. stateAt reuses stored result objects and
 * caller-owned storage, with no per-call allocations. */
export class SampledEphemerisProvider implements PositionProvider {
  readonly method = 'sampled-ephemeris' as const;
  readonly validity: { fromTdb: number; toTdb: number };
  private readonly segments: StoredSegment[];
  private readonly outside: StateFailure = {
    ok: false,
    reason: 'out-of-validity',
  };
  private readonly gap: StateFailure = { ok: false, reason: 'no-data' };
  constructor(
    readonly id: string,
    readonly frame: FrameId,
    segments: readonly EphemerisSegment[],
  ) {
    if (!segments.length)
      throw new Error('At least one ephemeris segment is required');
    let previousEnd = -Infinity;
    this.segments = segments.map((segment) => {
      const times = segment.times.slice(),
        states = segment.states.slice();
      if (
        times.length < 2 ||
        states.length !== 6 * times.length ||
        !states.every(Number.isFinite)
      )
        throw new Error('Malformed ephemeris samples');
      for (let i = 0; i < times.length; i++) {
        if (!Number.isFinite(times[i]) || (i > 0 && times[i]! <= times[i - 1]!))
          throw new Error(
            'Ephemeris times must be finite and strictly increasing',
          );
      }
      if (times[0]! < previousEnd)
        throw new Error('Ephemeris segments overlap or are unordered');
      previousEnd = times[times.length - 1]!;
      return {
        times,
        states,
        certainty: segment.certainty,
        result: {
          ok: true,
          frame,
          certainty: segment.certainty,
          stale: segment.stale ?? false,
        },
      };
    });
    this.validity = Object.freeze({
      fromTdb: this.segments[0]!.times[0]!,
      toTdb: previousEnd,
    });
  }
  private segmentAt(tdbSec: number): StoredSegment | undefined {
    if (!Number.isFinite(tdbSec)) return undefined;
    let low = 0,
      high = this.segments.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.segments[mid]!.times[0]! <= tdbSec) low = mid + 1;
      else high = mid;
    }
    const segment = this.segments[low - 1];
    return segment && tdbSec <= segment.times[segment.times.length - 1]!
      ? segment
      : undefined;
  }
  certaintyAt(tdbSec: number): Certainty {
    return this.segmentAt(tdbSec)?.certainty ?? 'approximate';
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
      return this.outside;
    const segment = this.segmentAt(tdbSec);
    if (!segment) return this.gap;
    const { times, states } = segment;
    let low = 0,
      high = times.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >>> 1;
      if (times[mid]! <= tdbSec) low = mid;
      else high = mid;
    }
    const h = times[low + 1]! - times[low]!,
      u = (tdbSec - times[low]!) / h;
    const u2 = u * u,
      u3 = u2 * u,
      a = low * 6,
      b = a + 6;
    for (let i = 0; i < 3; i++) {
      const p0 = states[a + i]!,
        p1 = states[b + i]!,
        v0 = states[a + i + 3]!,
        v1 = states[b + i + 3]!;
      out[offset + i] =
        (2 * u3 - 3 * u2 + 1) * p0 +
        (u3 - 2 * u2 + u) * h * v0 +
        (-2 * u3 + 3 * u2) * p1 +
        (u3 - u2) * h * v1;
      out[offset + i + 3] =
        ((6 * u2 - 6 * u) * p0 + (-6 * u2 + 6 * u) * p1) / h +
        (3 * u2 - 4 * u + 1) * v0 +
        (3 * u2 - 2 * u) * v1;
    }
    return segment.result;
  }
}
