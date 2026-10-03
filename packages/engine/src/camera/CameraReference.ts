import type { FrameId } from '@space/domain';

export type CameraFrame =
  'ICRF_SSB' | 'ICRF_HELIO' | 'ICRF_BODY:earth' | 'FIXED:earth';
export type CameraFrameResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: 'unsupported-frame' | 'unavailable-frame';
    };
export interface CameraFrameTransforms {
  transformPosition(
    from: FrameId,
    to: FrameId,
    tdbSec: number,
    input: Float64Array,
    out: Float64Array,
  ): boolean;
}
const OK: CameraFrameResult = Object.freeze({ ok: true });
const UNAVAILABLE: CameraFrameResult = Object.freeze({
  ok: false,
  reason: 'unavailable-frame',
});
const UNSUPPORTED: CameraFrameResult = Object.freeze({
  ok: false,
  reason: 'unsupported-frame',
});
export function isCameraFrame(frame: string): frame is CameraFrame {
  return (
    frame === 'ICRF_SSB' ||
    frame === 'ICRF_HELIO' ||
    frame === 'ICRF_BODY:earth' ||
    frame === 'FIXED:earth'
  );
}

/** Camera-only reference. Positions remain SSB km outside this adapter.
 * All hot outputs are reused; failed transforms commit no caller pose changes.
 */
export class CameraReference {
  frameId: CameraFrame = 'ICRF_SSB';
  readonly localCenter = new Float64Array(3);
  readonly localUp = new Float64Array([0, 0, 1]);
  readonly upWorld = new Float64Array([0, 0, 1]);
  private zero = new Float64Array(3);
  private vector = new Float64Array(3);
  private origin = new Float64Array(3);
  private nextCenter = new Float64Array(3);
  private nextWorldCenter = new Float64Array(3);
  private nextWorld = new Float64Array(3);
  private nextOffset = new Float64Array(3);
  private nextUp = new Float64Array(3);
  constructor(private transforms?: CameraFrameTransforms) {}

  private position(
    from: CameraFrame,
    to: CameraFrame,
    t: number,
    input: Float64Array,
    out: Float64Array,
  ): boolean {
    if (!Number.isFinite(t)) return false;
    if (from === to) {
      out.set(input);
      return true;
    }
    try {
      if (!this.transforms?.transformPosition(from, to, t, input, out))
        return false;
    } catch {
      return false;
    }
    return (
      Number.isFinite(out[0]) &&
      Number.isFinite(out[1]) &&
      Number.isFinite(out[2])
    );
  }
  private direction(
    from: CameraFrame,
    to: CameraFrame,
    t: number,
    input: Float64Array,
    out: Float64Array,
    unit = false,
  ): boolean {
    // Scale unit axes before subtracting large origins to retain orientation precision.
    const scale = unit ? 1e6 : 1;
    for (let i = 0; i < 3; i++) this.vector[i] = input[i]! * scale;
    if (
      !this.position(from, to, t, this.zero, this.origin) ||
      !this.position(from, to, t, this.vector, out)
    )
      return false;
    for (let i = 0; i < 3; i++) out[i] = (out[i]! - this.origin[i]!) / scale;
    if (unit) {
      const length = Math.hypot(out[0]!, out[1]!, out[2]!);
      if (!Number.isFinite(length) || length === 0) return false;
      for (let i = 0; i < 3; i++) out[i] = out[i]! / length;
    }
    return true;
  }
  setFrame(
    frame: string,
    tdbSec: number,
    centerWorld: Float64Array,
    worldOffset: Float64Array,
    outLocalOffset: Float64Array,
  ): CameraFrameResult {
    if (!isCameraFrame(frame)) return UNSUPPORTED;
    if (
      !this.position('ICRF_SSB', frame, tdbSec, centerWorld, this.nextCenter) ||
      !this.direction(
        'ICRF_SSB',
        frame,
        tdbSec,
        worldOffset,
        this.nextOffset,
      ) ||
      !this.direction(
        'ICRF_SSB',
        frame,
        tdbSec,
        this.upWorld,
        this.nextUp,
        true,
      )
    )
      return UNAVAILABLE;
    this.frameId = frame;
    this.localCenter.set(this.nextCenter);
    this.localUp.set(this.nextUp);
    outLocalOffset.set(this.nextOffset);
    return OK;
  }
  compose(
    tdbSec: number,
    centerWorld: Float64Array,
    offset: Float64Array,
    pan: Float64Array,
    outWorld: Float64Array,
    trackCenter: boolean,
  ): CameraFrameResult {
    const frame = this.frameId;
    if (trackCenter) {
      if (
        !this.position('ICRF_SSB', frame, tdbSec, centerWorld, this.nextCenter)
      )
        return UNAVAILABLE;
    } else this.nextCenter.set(this.localCenter);
    if (
      !this.position(
        frame,
        'ICRF_SSB',
        tdbSec,
        this.nextCenter,
        this.nextWorldCenter,
      )
    )
      return UNAVAILABLE;
    for (let i = 0; i < 3; i++)
      this.nextOffset[i] = this.nextCenter[i]! + offset[i]! + pan[i]!;
    if (
      !this.position(
        frame,
        'ICRF_SSB',
        tdbSec,
        this.nextOffset,
        this.nextWorld,
      ) ||
      !this.direction(
        frame,
        'ICRF_SSB',
        tdbSec,
        this.localUp,
        this.nextUp,
        true,
      )
    )
      return UNAVAILABLE;
    this.localCenter.set(this.nextCenter);
    centerWorld.set(this.nextWorldCenter);
    outWorld.set(this.nextWorld);
    this.upWorld.set(this.nextUp);
    return OK;
  }
}
