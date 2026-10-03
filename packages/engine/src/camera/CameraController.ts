import { AU_KM } from '@space/astro';
import {
  CameraReference,
  type CameraFrame,
  type CameraFrameTransforms,
  type CameraFrameResult,
} from './CameraReference';
import {
  clamp,
  ease,
  exponentialZoom,
  sphericalToCartesian,
  transitionDistance,
  transitionDuration,
  criticalDamping,
} from './math';
interface View {
  targetId: string;
  distanceKm: number;
  azimuthRad: number;
  elevationRad: number;
  frame: CameraFrame;
  preset: 'close' | 'wide';
  following: boolean;
  localCenter: Float64Array;
  localUp: Float64Array;
  pan: Float64Array;
}
export class CameraController {
  targetId = 'star:sun';
  distanceKm = AU_KM * 4.2;
  azimuthRad = -1.3;
  elevationRad = 1.05;
  following = true;
  reducedMotion = false;
  fade = 0;
  preset: 'close' | 'wide' = 'wide';
  private reference: CameraReference;
  readonly up: Float64Array;
  readonly world = new Float64Array(3);
  readonly center = new Float64Array(3);
  private offset = new Float64Array(3);
  private panOffset = new Float64Array(3);
  private stagedCenter = new Float64Array(3);
  private zoomTarget: number | null = null;
  private zoomVelocity = 0;
  private previousTime = 0;
  private damping = new Float64Array(2);
  private flight: {
    startMs: number;
    durationMs: number;
    startDistance: number;
    endDistance: number;
    startCenter: Float64Array;
    separationKm: number;
    crossFade: boolean;
  } | null = null;
  private history: View[] = [];
  constructor(transforms?: CameraFrameTransforms) {
    this.reference = new CameraReference(transforms);
    this.up = this.reference.upWorld;
  }
  get frameId() {
    return this.reference.frameId;
  }
  setFrame(frame: string, tdbSec: number): CameraFrameResult {
    for (let i = 0; i < 3; i++)
      this.offset[i] = this.world[i]! - this.center[i]!;
    const result = this.reference.setFrame(
      frame,
      tdbSec,
      this.center,
      this.offset,
      this.offset,
    );
    if (!result.ok) return result;
    this.distanceKm = Math.hypot(
      this.offset[0]!,
      this.offset[1]!,
      this.offset[2]!,
    );
    this.azimuthRad = Math.atan2(this.offset[1]!, this.offset[0]!);
    this.elevationRad = Math.atan2(
      this.offset[2]!,
      Math.hypot(this.offset[0]!, this.offset[1]!),
    );
    this.panOffset.fill(0);
    this.zoomTarget = null;
    this.zoomVelocity = 0;
    // A frame change is a cold command; retain the current pose rather than
    // allowing an old flight to overwrite it on the next frame.
    this.flight = null;
    return result;
  }
  orbit(dx: number, dy: number) {
    this.azimuthRad -= dx * 0.006;
    this.elevationRad = clamp(this.elevationRad + dy * 0.006, -1.562, 1.562);
  }
  zoom(delta: number, radiusKm: number) {
    this.flight = null;
    this.zoomTarget = exponentialZoom(
      this.zoomTarget ?? this.distanceKm,
      delta,
      radiusKm * 1.05,
      200 * AU_KM,
    );
  }
  pan(dx: number, dy: number) {
    const limit = this.distanceKm * 0.5;
    this.panOffset[0] = clamp(
      this.panOffset[0]! + dx * this.distanceKm * 0.001,
      -limit,
      limit,
    );
    this.panOffset[2] = clamp(
      this.panOffset[2]! - dy * this.distanceKm * 0.001,
      -limit,
      limit,
    );
  }
  focus(
    id: string,
    target: Float64Array,
    radiusKm: number,
    now: number,
    transition = true,
    wide = false,
    record = true,
  ) {
    this.zoomTarget = null;
    this.zoomVelocity = 0;
    if (record)
      this.history.push({
        targetId: this.targetId,
        distanceKm: this.distanceKm,
        azimuthRad: this.azimuthRad,
        elevationRad: this.elevationRad,
        frame: this.frameId,
        preset: this.preset,
        following: this.following,
        localCenter: this.reference.localCenter.slice(),
        localUp: this.reference.localUp.slice(),
        pan: this.panOffset.slice(),
      });
    const sep = Math.hypot(
      target[0]! - this.center[0]!,
      target[1]! - this.center[1]!,
      target[2]! - this.center[2]!,
    );
    const end = wide ? AU_KM * 4.2 : radiusKm * (id === 'star:sun' ? 6 : 4);
    this.flight = transition
      ? {
          startMs: now,
          durationMs: this.reducedMotion
            ? 300
            : transitionDuration(this.distanceKm, end, sep) * 1000,
          startDistance: this.distanceKm,
          endDistance: end,
          startCenter: this.center.slice(),
          separationKm: sep,
          crossFade: this.reducedMotion,
        }
      : null;
    this.targetId = id;
    this.preset = wide ? 'wide' : 'close';
    this.following = true;
    this.panOffset.fill(0);
    if (!transition) {
      this.distanceKm = end;
      this.center.set(target.subarray(0, 3));
    }
  }
  back() {
    return this.history.pop();
  }
  restore(
    view: View,
    target: Float64Array,
    radiusKm: number,
    now: number,
    tdbSec = 0,
  ) {
    const result = this.setFrame(view.frame, tdbSec);
    if (!result.ok) return result;
    this.focus(
      view.targetId,
      target,
      radiusKm,
      now,
      view.following,
      view.preset === 'wide',
      false,
    );
    if (this.flight) this.flight.endDistance = view.distanceKm;
    else this.distanceKm = view.distanceKm;
    this.azimuthRad = view.azimuthRad;
    this.elevationRad = view.elevationRad;
    this.following = view.following;
    this.panOffset.set(view.pan);
    this.reference.localCenter.set(view.localCenter);
    this.reference.localUp.set(view.localUp);
    if (!view.following && view.frame === 'ICRF_SSB')
      this.center.set(view.localCenter);
    return result;
  }
  update(target: Float64Array, now: number, minRadiusKm: number, tdbSec = 0) {
    const active = this.frameId !== 'ICRF_SSB';
    const center = active ? this.stagedCenter : this.center;
    if (active) center.set(this.center);
    const tracking = this.following || this.flight !== null;
    const dt = this.previousTime
      ? Math.min(0.1, Math.max(0, (now - this.previousTime) / 1000))
      : 1 / 60;
    this.previousTime = now;
    if (this.zoomTarget !== null) {
      criticalDamping(
        Math.log(this.distanceKm),
        Math.log(this.zoomTarget),
        this.zoomVelocity,
        dt,
        this.damping,
      );
      this.distanceKm = Math.exp(this.damping[0]!);
      this.zoomVelocity = this.damping[1]!;
      if (Math.abs(this.distanceKm / this.zoomTarget - 1) < 1e-7) {
        this.distanceKm = this.zoomTarget;
        this.zoomTarget = null;
        this.zoomVelocity = 0;
      }
    }
    this.fade = 0;
    if (this.flight) {
      const f = this.flight;
      const t = clamp((now - f.startMs) / f.durationMs, 0, 1);
      const e = f.crossFade ? (t < 0.5 ? 0 : 1) : ease(t);
      this.fade = f.crossFade ? Math.sin(t * Math.PI) : 0;
      for (let i = 0; i < 3; i++)
        center[i] = f.startCenter[i]! + (target[i]! - f.startCenter[i]!) * e;
      this.distanceKm = f.crossFade
        ? t < 0.5
          ? f.startDistance
          : f.endDistance
        : transitionDistance(f.startDistance, f.endDistance, f.separationKm, t);
      if (t === 1) this.flight = null;
    } else if (this.following)
      for (let i = 0; i < 3; i++) center[i] = target[i]!;
    this.distanceKm = Math.max(minRadiusKm * 1.05, this.distanceKm);
    sphericalToCartesian(
      this.distanceKm,
      this.azimuthRad,
      this.elevationRad,
      this.offset,
    );
    if (active) {
      const result = this.reference.compose(
        tdbSec,
        center,
        this.offset,
        this.panOffset,
        this.world,
        tracking,
      );
      if (result.ok) this.center.set(center);
      return result;
    }
    // Preserve the original arithmetic and avoid FrameTree work on the SSB path.
    for (let i = 0; i < 3; i++) {
      this.world[i] = this.center[i]! + this.offset[i]! + this.panOffset[i]!;
      this.reference.localCenter[i] = this.center[i]!;
      this.up[i] = this.reference.localUp[i]!;
    }
    return undefined;
  }
  get transitioning() {
    return this.flight !== null;
  }
}
