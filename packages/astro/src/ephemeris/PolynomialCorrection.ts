/** Exact cubic Hermite fits to the accepted residual model, in normalized
 * interval coordinates. These are coefficients, not downloaded positions. */
export interface EphemerisCorrection {
  contains(tdbSec: number): boolean;
  addTo(tdbSec: number, out: Float64Array, offset?: number): boolean;
}
export const CORRECTION_MAGIC = 0x31504f43; // COP1
export class PolynomialCorrection implements EphemerisCorrection {
  readonly startTdbSec: number;
  readonly stepSec: number;
  readonly firstIndex: number;
  readonly intervalCount: number;
  readonly fullCount: number;
  private readonly coefficients: Float64Array;
  constructor(buffer: ArrayBuffer) {
    const view = new DataView(buffer);
    if (
      buffer.byteLength < 48 ||
      view.getUint32(0, true) !== CORRECTION_MAGIC ||
      view.getUint32(4, true) !== 1
    )
      throw Error('Invalid correction coefficients header');
    this.startTdbSec = view.getFloat64(8, true);
    this.stepSec = view.getFloat64(16, true);
    this.firstIndex = view.getFloat64(24, true);
    this.intervalCount = view.getFloat64(32, true);
    this.fullCount = view.getFloat64(40, true);
    if (
      !Number.isFinite(this.startTdbSec) ||
      !Number.isFinite(this.stepSec) ||
      this.stepSec <= 0 ||
      !Number.isInteger(this.firstIndex) ||
      this.firstIndex < 0 ||
      !Number.isInteger(this.intervalCount) ||
      this.intervalCount < 1 ||
      this.intervalCount > 32 ||
      !Number.isInteger(this.fullCount) ||
      this.fullCount < 2 ||
      this.fullCount > 20000 ||
      this.firstIndex + this.intervalCount >= this.fullCount ||
      buffer.byteLength !== 48 + this.intervalCount * 96
    )
      throw Error('Malformed correction coefficients');
    this.coefficients = new Float64Array(this.intervalCount * 12);
    for (let i = 0; i < this.coefficients.length; i++) {
      const value = view.getFloat64(48 + i * 8, true);
      if (!Number.isFinite(value))
        throw Error('Nonfinite correction coefficient');
      this.coefficients[i] = value;
    }
  }
  contains(tdbSec: number): boolean {
    const sample = (tdbSec - this.startTdbSec) / this.stepSec;
    const index = Math.min(this.fullCount - 2, Math.floor(sample));
    return (
      Number.isFinite(sample) &&
      sample >= 0 &&
      sample <= this.fullCount - 1 &&
      index >= this.firstIndex &&
      index < this.firstIndex + this.intervalCount
    );
  }
  addTo(tdbSec: number, out: Float64Array, offset = 0): boolean {
    if (!this.contains(tdbSec)) return false;
    // Evaluate against the original global grid, never a new chunk-local epoch.
    const sample = (tdbSec - this.startTdbSec) / this.stepSec;
    const index = Math.min(this.fullCount - 2, Math.floor(sample)),
      u = sample - index;
    const base = (index - this.firstIndex) * 12,
      data = this.coefficients;
    for (let axis = 0; axis < 3; axis++) {
      const j = base + axis * 4,
        c0 = data[j]!,
        c1 = data[j + 1]!,
        c2 = data[j + 2]!,
        c3 = data[j + 3]!;
      out[offset + axis]! += ((c3 * u + c2) * u + c1) * u + c0;
      out[offset + axis + 3]! +=
        ((3 * c3 * u + 2 * c2) * u + c1) / this.stepSec;
    }
    return true;
  }
}
