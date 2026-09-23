import { AU_KM } from '@space/astro';
import {
  clamp,
  ease,
  exponentialZoom,
  sphericalToCartesian,
  transitionDistance,
  transitionDuration,
} from './math';
interface View {
  targetId: string;
  distanceKm: number;
  azimuthRad: number;
  elevationRad: number;
}
export class CameraController {
  targetId = 'star:sun';
  distanceKm = AU_KM * 4.2;
  azimuthRad = -1.3;
  elevationRad = 1.05;
  following = true;
  reducedMotion = false;
  fade = 0;
  readonly world = new Float64Array(3);
  readonly center = new Float64Array(3);
  private offset = new Float64Array(3);
  private panOffset = new Float64Array(3);
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
  orbit(dx: number, dy: number) {
    this.azimuthRad -= dx * 0.006;
    this.elevationRad = clamp(this.elevationRad + dy * 0.006, -1.562, 1.562);
  }
  zoom(delta: number, radiusKm: number) {
    this.flight = null;
    this.distanceKm = exponentialZoom(
      this.distanceKm,
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
    if (record)
      this.history.push({
        targetId: this.targetId,
        distanceKm: this.distanceKm,
        azimuthRad: this.azimuthRad,
        elevationRad: this.elevationRad,
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
  restore(view: View, target: Float64Array, radiusKm: number, now: number) {
    this.focus(view.targetId, target, radiusKm, now, true, false, false);
    if (this.flight) this.flight.endDistance = view.distanceKm;
    this.azimuthRad = view.azimuthRad;
    this.elevationRad = view.elevationRad;
  }
  update(target: Float64Array, now: number, minRadiusKm: number) {
    this.fade = 0;
    if (this.flight) {
      const f = this.flight;
      const t = clamp((now - f.startMs) / f.durationMs, 0, 1);
      const e = f.crossFade ? (t < 0.5 ? 0 : 1) : ease(t);
      this.fade = f.crossFade ? Math.sin(t * Math.PI) : 0;
      for (let i = 0; i < 3; i++)
        this.center[i] =
          f.startCenter[i]! + (target[i]! - f.startCenter[i]!) * e;
      this.distanceKm = f.crossFade
        ? t < 0.5
          ? f.startDistance
          : f.endDistance
        : transitionDistance(f.startDistance, f.endDistance, f.separationKm, t);
      if (t === 1) this.flight = null;
    } else if (this.following) this.center.set(target.subarray(0, 3));
    this.distanceKm = Math.max(minRadiusKm * 1.05, this.distanceKm);
    sphericalToCartesian(
      this.distanceKm,
      this.azimuthRad,
      this.elevationRad,
      this.offset,
    );
    for (let i = 0; i < 3; i++)
      this.world[i] = this.center[i]! + this.offset[i]! + this.panOffset[i]!;
  }
  get transitioning() {
    return this.flight !== null;
  }
}
