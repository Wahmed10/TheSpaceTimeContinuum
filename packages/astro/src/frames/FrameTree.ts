import type { FrameId, PositionProvider } from '@space/domain';

/** Row-major rotation from local axes to parent axes. */
export type FrameRotation = (tdbSec: number, out: Float64Array) => void;
export interface FrameNode {
  id: FrameId;
  parent: FrameId;
  /** Origin state expressed in the parent's axes and origin. */
  origin?: PositionProvider;
  rotation?: FrameRotation;
}
function identity() {
  return new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
}
function multiply(a: Float64Array, b: Float64Array, out: Float64Array) {
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      out[r * 3 + c] =
        a[r * 3]! * b[c]! +
        a[r * 3 + 1]! * b[3 + c]! +
        a[r * 3 + 2]! * b[6 + c]!;
    }
}
function component(
  m: Float64Array,
  row: number,
  x: number,
  y: number,
  z: number,
) {
  return m[row * 3]! * x + m[row * 3 + 1]! * y + m[row * 3 + 2]! * z;
}
class ResolvedNode {
  stamp = -1;
  orientationStamp = -1;
  valid = false;
  readonly state = new Float64Array(6);
  readonly localState = new Float64Array(6);
  readonly rotation = identity();
  readonly derivative = new Float64Array(9);
  readonly localRotation = identity();
  readonly localDerivative = new Float64Array(9);
  readonly before = new Float64Array(9);
  readonly after = new Float64Array(9);
  readonly product = new Float64Array(9);
  constructor(readonly spec?: FrameNode) {}
}

/** Float64 frame tree. Registration is cold-path; resolved nodes cache per epoch/stamp.
 * State velocity includes dR/dt * position, not just a rotation of velocity.
 * No output is written on failure. Caller arrays may alias. */
export class FrameTree {
  private readonly nodes = new Map<FrameId, ResolvedNode>([
    ['ICRF_SSB', new ResolvedNode()],
  ]);
  private epoch = NaN;
  private stamp = 0;
  private readonly scratch = new Float64Array(6);
  beginFrame(tdbSec: number, frameStamp?: number): void {
    if (
      tdbSec !== this.epoch ||
      (frameStamp !== undefined && frameStamp !== this.externalStamp)
    ) {
      this.epoch = tdbSec;
      this.stamp++;
    }
    if (frameStamp !== undefined) this.externalStamp = frameStamp;
  }
  private externalStamp: number | undefined;
  /** Async coefficients may arrive while paused at an unchanged epoch. */
  private revision = 0;
  get cacheRevision(): number {
    return this.revision;
  }
  invalidate(): void {
    this.stamp++;
    this.revision++;
  }
  has(id: FrameId): boolean {
    return this.nodes.has(id);
  }
  register(node: FrameNode): void {
    if (this.nodes.has(node.id)) throw new Error(`Duplicate frame ${node.id}`);
    if (!this.nodes.has(node.parent))
      throw new Error(`Register parent ${node.parent} first`);
    if (node.origin && node.origin.frame !== node.parent)
      throw new Error(`Origin frame mismatch for ${node.id}`);
    this.nodes.set(node.id, new ResolvedNode({ ...node }));
    this.stamp++;
  }
  private resolve(id: FrameId): ResolvedNode | undefined {
    const node = this.nodes.get(id);
    if (!node || !Number.isFinite(this.epoch)) return undefined;
    if (node.stamp === this.stamp) return node.valid ? node : undefined;
    node.stamp = this.stamp;
    node.valid = false;
    const spec = node.spec;
    if (!spec) {
      node.valid = true;
      return node;
    }
    const parent = this.resolve(spec.parent);
    if (!parent) return undefined;
    if (spec.origin && !spec.origin.stateAt(this.epoch, node.localState).ok)
      return undefined;
    if (spec.rotation) {
      if (node.orientationStamp !== this.stamp)
        spec.rotation(this.epoch, node.localRotation);
      // Symmetric one-second derivative; Earth rotation truncation <1e-9 relative.
      spec.rotation(this.epoch - 0.5, node.before);
      spec.rotation(this.epoch + 0.5, node.after);
      for (let i = 0; i < 9; i++)
        node.localDerivative[i] = node.after[i]! - node.before[i]!;
    }
    multiply(parent.rotation, node.localRotation, node.rotation);
    node.orientationStamp = this.stamp;
    multiply(parent.derivative, node.localRotation, node.derivative);
    multiply(parent.rotation, node.localDerivative, node.product);
    for (let i = 0; i < 9; i++)
      node.derivative[i] = node.derivative[i]! + node.product[i]!;
    const s = node.localState;
    for (let i = 0; i < 3; i++) {
      node.state[i] =
        parent.state[i]! + component(parent.rotation, i, s[0]!, s[1]!, s[2]!);
      node.state[i + 3] =
        parent.state[i + 3]! +
        component(parent.rotation, i, s[3]!, s[4]!, s[5]!) +
        component(parent.derivative, i, s[0]!, s[1]!, s[2]!);
    }
    node.valid = true;
    return node;
  }
  /** A zero-origin frame needs only one attitude sample for rendering.
   * Resolve its parent normally to preserve provider coverage/failure semantics.
   * State transforms still compute the full derivative lazily on first demand.
   */
  private resolveOrientation(id: FrameId): ResolvedNode | undefined {
    const node = this.nodes.get(id);
    if (!node || !Number.isFinite(this.epoch)) return undefined;
    if (node.stamp === this.stamp) return node.valid ? node : undefined;
    const spec = node.spec;
    if (!spec || spec.origin) return this.resolve(id);
    const parent = this.resolve(spec.parent);
    if (!parent) return undefined;
    if (node.orientationStamp !== this.stamp) {
      if (spec.rotation) spec.rotation(this.epoch, node.localRotation);
      multiply(parent.rotation, node.localRotation, node.rotation);
      node.orientationStamp = this.stamp;
    }
    return node;
  }
  resolveOrigin(id: FrameId, tdbSec: number, out: Float64Array): boolean {
    this.beginFrame(tdbSec);
    const node = this.resolve(id);
    if (!node) return false;
    for (let i = 0; i < Math.min(6, out.length); i++) out[i] = node.state[i]!;
    return true;
  }
  /** Quaternion mapping a Y-up texture sphere (X prime meridian) into ICRF. */
  resolveTextureOrientation(
    id: `FIXED:${string}`,
    tdbSec: number,
    out: Float64Array,
  ): boolean {
    this.beginFrame(tdbSec);
    const node = this.resolveOrientation(id);
    if (!node) return false;
    const r = node.rotation;
    const m00 = r[0]!,
      m01 = r[2]!,
      m02 = -r[1]!;
    const m10 = r[3]!,
      m11 = r[5]!,
      m12 = -r[4]!;
    const m20 = r[6]!,
      m21 = r[8]!,
      m22 = -r[7]!;
    const trace = m00 + m11 + m22;
    if (trace > 0) {
      const s = 2 * Math.sqrt(1 + trace);
      out[0] = (m21 - m12) / s;
      out[1] = (m02 - m20) / s;
      out[2] = (m10 - m01) / s;
      out[3] = s / 4;
    } else if (m00 > m11 && m00 > m22) {
      const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
      out[0] = s / 4;
      out[1] = (m01 + m10) / s;
      out[2] = (m02 + m20) / s;
      out[3] = (m21 - m12) / s;
    } else if (m11 > m22) {
      const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
      out[0] = (m01 + m10) / s;
      out[1] = s / 4;
      out[2] = (m12 + m21) / s;
      out[3] = (m02 - m20) / s;
    } else {
      const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
      out[0] = (m02 + m20) / s;
      out[1] = (m12 + m21) / s;
      out[2] = s / 4;
      out[3] = (m10 - m01) / s;
    }
    return true;
  }
  transformPosition(
    from: FrameId,
    to: FrameId,
    tdbSec: number,
    input: Float64Array,
    out: Float64Array,
  ): boolean {
    return this.transform(from, to, tdbSec, input, out, false);
  }
  transformState(
    from: FrameId,
    to: FrameId,
    tdbSec: number,
    input: Float64Array,
    out: Float64Array,
  ): boolean {
    return this.transform(from, to, tdbSec, input, out, true);
  }
  private transform(
    from: FrameId,
    to: FrameId,
    tdbSec: number,
    input: Float64Array,
    out: Float64Array,
    velocity: boolean,
  ): boolean {
    this.beginFrame(tdbSec);
    const a = this.resolve(from),
      b = this.resolve(to);
    if (!a || !b) return false;
    const s = this.scratch;
    // Subtract origins first to preserve body-relative precision.
    for (let i = 0; i < 3; i++) {
      s[i] =
        a.state[i]! -
        b.state[i]! +
        component(a.rotation, i, input[0]!, input[1]!, input[2]!);
      if (velocity)
        s[i + 3] =
          a.state[i + 3]! -
          b.state[i + 3]! +
          component(a.rotation, i, input[3]!, input[4]!, input[5]!) +
          component(a.derivative, i, input[0]!, input[1]!, input[2]!);
    }
    for (let i = 0; i < 3; i++)
      out[i] =
        b.rotation[i]! * s[0]! +
        b.rotation[3 + i]! * s[1]! +
        b.rotation[6 + i]! * s[2]!;
    if (velocity) {
      for (let i = 0; i < 3; i++)
        s[i + 3] =
          s[i + 3]! - component(b.derivative, i, out[0]!, out[1]!, out[2]!);
      for (let i = 0; i < 3; i++)
        out[i + 3] =
          b.rotation[i]! * s[3]! +
          b.rotation[3 + i]! * s[4]! +
          b.rotation[6 + i]! * s[5]!;
    }
    return true;
  }
}
