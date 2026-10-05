import type {
  Certainty,
  FrameId,
  PositionProvider,
  StateFailure,
  StateResult,
} from '@space/domain';
import { solveKepler } from './KeplerProvider';
export interface OsculatingGrid {
  startTdbSec: number;
  firstIndex: number;
  fullCount: number;
}
/** Locally propagated Horizons osculating ellipses, blended with smoothstep.
 * This avoids angular unwrapping and preserves endpoint states and velocities.
 * Blended velocity includes the time derivative of the blend weight. */
export class OsculatingElementsProvider implements PositionProvider {
  readonly method = 'kepler-2body' as const;
  readonly validity: { fromTdb: number; toTdb: number };
  private readonly elements: Float64Array;
  private readonly stepSec: number;
  private readonly count: number;
  private readonly grid: OsculatingGrid;
  private readonly a = new Float64Array(6);
  private readonly b = new Float64Array(6);
  private readonly result: StateResult;
  private readonly failure: StateFailure = {
    ok: false,
    reason: 'out-of-validity',
  };
  constructor(
    readonly id: string,
    readonly frame: FrameId,
    buffer: ArrayBuffer,
    grid?: OsculatingGrid,
  ) {
    if (buffer.byteLength < 24) throw new Error('Truncated orbit table');
    const view = new DataView(buffer),
      start = view.getFloat64(0, true);
    this.stepSec = view.getFloat64(8, true);
    this.count = view.getFloat64(16, true);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(this.stepSec) ||
      this.stepSec <= 0 ||
      !Number.isInteger(this.count) ||
      this.count < 2 ||
      this.count > 100000 ||
      buffer.byteLength !== 24 + this.count * 56
    )
      throw new Error('Invalid orbit table');
    this.grid = grid ?? {
      startTdbSec: start,
      firstIndex: 0,
      fullCount: this.count,
    };
    if (
      !Number.isFinite(this.grid.startTdbSec) ||
      !Number.isInteger(this.grid.firstIndex) ||
      this.grid.firstIndex < 0 ||
      !Number.isInteger(this.grid.fullCount) ||
      this.grid.fullCount < 2 ||
      this.grid.fullCount > 100000 ||
      this.grid.firstIndex + this.count > this.grid.fullCount ||
      start !== this.grid.startTdbSec + this.grid.firstIndex * this.stepSec
    )
      throw Error('Invalid original orbit grid');
    this.elements = new Float64Array(this.count * 7);
    for (let i = 0; i < this.elements.length; i++) {
      const value = view.getFloat64(24 + i * 8, true);
      if (!Number.isFinite(value)) throw new Error('Nonfinite orbit element');
      this.elements[i] = value;
    }
    for (let i = 0; i < this.count; i++)
      if (
        this.elements[i * 7]! <= 0 ||
        this.elements[i * 7 + 1]! < 0 ||
        this.elements[i * 7 + 1]! >= 1 ||
        this.elements[i * 7 + 6]! <= 0
      )
        throw new Error('Invalid elliptical elements');
    this.validity = Object.freeze({
      fromTdb: start,
      toTdb: start + (this.count - 1) * this.stepSec,
    });
    this.result = { ok: true, frame, certainty: 'approximate', stale: false };
  }
  certaintyAt(_tdbSec: number): Certainty {
    return 'approximate';
  }
  private propagate(index: number, tdbSec: number, out: Float64Array): void {
    const data = this.elements,
      j = index * 7,
      axis = data[j]!,
      e = data[j + 1]!;
    const anomaly = solveKepler(
      data[j + 5]! +
        data[j + 6]! *
          (tdbSec -
            (this.grid.startTdbSec +
              (this.grid.firstIndex + index) * this.stepSec)),
      e,
    );
    const ca = Math.cos(anomaly),
      sa = Math.sin(anomaly),
      minor = Math.sqrt(1 - e * e),
      rate = data[j + 6]! / (1 - e * ca);
    const x = axis * (ca - e),
      y = axis * minor * sa,
      vx = -axis * sa * rate,
      vy = axis * minor * ca * rate;
    const ci = Math.cos(data[j + 2]!),
      si = Math.sin(data[j + 2]!),
      cn = Math.cos(data[j + 3]!),
      sn = Math.sin(data[j + 3]!),
      cw = Math.cos(data[j + 4]!),
      sw = Math.sin(data[j + 4]!);
    const u = cw * x - sw * y,
      v = sw * x + cw * y,
      du = cw * vx - sw * vy,
      dv = sw * vx + cw * vy;
    out[0] = cn * u - sn * ci * v;
    out[1] = sn * u + cn * ci * v;
    out[2] = si * v;
    out[3] = cn * du - sn * ci * dv;
    out[4] = sn * du + cn * ci * dv;
    out[5] = si * dv;
  }
  stateAt(
    tdbSec: number,
    out: Float64Array,
    offset = 0,
  ): StateResult | StateFailure {
    const sample = (tdbSec - this.grid.startTdbSec) / this.stepSec;
    const globalIndex = Math.min(this.grid.fullCount - 2, Math.floor(sample));
    const index = globalIndex - this.grid.firstIndex;
    if (
      !Number.isFinite(sample) ||
      sample < 0 ||
      sample > this.grid.fullCount - 1 ||
      index < 0 ||
      index + 1 >= this.count
    )
      return this.failure;
    const u = sample - globalIndex;
    this.propagate(index, tdbSec, this.a);
    this.propagate(index + 1, tdbSec, this.b);
    const weight = u * u * (3 - 2 * u),
      derivative = (6 * u * (1 - u)) / this.stepSec;
    for (let i = 0; i < 3; i++) {
      const delta = this.b[i]! - this.a[i]!;
      out[offset + i] = this.a[i]! + weight * delta;
      out[offset + i + 3] =
        this.a[i + 3]! +
        weight * (this.b[i + 3]! - this.a[i + 3]!) +
        derivative * delta;
    }
    return this.result;
  }
}
const tables = new Map<string, ArrayBuffer>();
export function registerOsculatingTable(id: string, buffer: ArrayBuffer): void {
  tables.set(id, buffer);
}
export function createOsculatingProvider(
  id: string,
  frame: FrameId,
): OsculatingElementsProvider {
  const buffer = tables.get(id);
  if (!buffer) throw new Error(`Orbit table not loaded: ${id}`);
  return new OsculatingElementsProvider(id, frame, buffer);
}
