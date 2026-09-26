import { Color } from 'three/webgpu';
import type { FrameTree } from '@space/astro';
import type { BodySpec } from '@space/domain';
import { PointLayer } from './PointLayer';
import type { PointSource, PointSourceBuffers } from './PointSource';

export interface SourcePoint {
  body: BodySpec;
  physical: Float64Array;
  display: Float64Array;
  visible: boolean;
  renderVisible: boolean;
  screenX: number;
  screenY: number;
  labeled: boolean;
}

/** One instanced draw and no mesh allocation per point. Frames and camera
 * subtraction stay float64; only final GPU attributes are float32.
 */
export class SourcePointLayer {
  readonly layer: PointLayer;
  readonly points: SourcePoint[];
  readonly buffers: PointSourceBuffers;
  error: string | null = null;
  private count = 0;
  private sampled = false;
  private input = new Float64Array(6);
  private disposed = false;
  constructor(
    readonly source: PointSource,
    bodies: readonly BodySpec[],
  ) {
    this.layer = new PointLayer(bodies.length);
    this.layer.object.visible = false;
    this.buffers = {
      states: new Float64Array(bodies.length * 6).fill(NaN),
      colors: new Float32Array(bodies.length * 3),
      sizes: new Float32Array(bodies.length).fill(3),
    };
    const color = new Color();
    this.points = bodies.map((body, index) => {
      color.set(body.color).toArray(this.buffers.colors, index * 3);
      const physical = new Float64Array(6);
      return {
        body,
        physical,
        display: physical,
        visible: false,
        renderVisible: false,
        screenX: 0,
        screenY: 0,
        labeled: false,
      };
    });
  }
  sample(tdb: number, frames: FrameTree, active: boolean) {
    if (this.disposed) return;
    for (const point of this.points) point.renderVisible = false;
    this.layer.object.visible = false;
    this.sampled = false;
    if (!active || this.error) return;
    try {
      const count = this.source.update(tdb, this.buffers);
      if (!Number.isInteger(count) || count < 0 || count > this.points.length)
        throw new Error('Invalid active point count');
      this.count = count;
      this.sampled = true;
      for (let i = 0; i < this.points.length; i++) {
        const point = this.points[i]!;
        point.visible = false;
        if (i >= count) continue;
        let valid =
          Number.isFinite(this.buffers.sizes[i]) && this.buffers.sizes[i]! > 0;
        for (let j = 0; j < 6; j++) {
          const value = this.buffers.states[i * 6 + j]!;
          this.input[j] = value;
          valid &&= Number.isFinite(value);
        }
        for (let j = 0; j < 3; j++)
          valid &&= Number.isFinite(this.buffers.colors[i * 3 + j]);
        if (
          valid &&
          frames.transformState(
            this.source.frame,
            'ICRF_SSB',
            tdb,
            this.input,
            point.physical,
          )
        )
          point.visible = point.physical.every(Number.isFinite);
      }
    } catch (error) {
      this.error = String(error);
      for (const point of this.points) point.visible = false;
      this.count = 0;
    }
  }
  render(camera: Float64Array, enabled: boolean) {
    if (this.disposed || this.error || !enabled || !this.sampled) {
      this.layer.object.visible = false;
      return;
    }
    let visible = false;
    for (let i = 0; i < this.count; i++) {
      const point = this.points[i]!;
      point.renderVisible = point.visible;
      if (point.visible) {
        this.layer.positions.setXYZ(
          i,
          point.physical[0]! - camera[0]!,
          point.physical[1]! - camera[1]!,
          point.physical[2]! - camera[2]!,
        );
        visible = true;
      }
      this.layer.sizes.setX(i, point.visible ? this.buffers.sizes[i]! : 0);
      this.layer.colors.setXYZ(
        i,
        this.buffers.colors[i * 3]!,
        this.buffers.colors[i * 3 + 1]!,
        this.buffers.colors[i * 3 + 2]!,
      );
    }
    this.layer.setCount(this.count);
    this.layer.object.visible = visible;
    this.layer.upload(0, this.count);
  }
  dispose(releaseSource = true) {
    if (this.disposed) return;
    this.disposed = true;
    this.layer.dispose();
    if (releaseSource) {
      try {
        this.source.dispose?.();
      } catch (error) {
        this.error = String(error);
      }
    }
  }
}
