import type { BodySpec, FrameId } from '@space/domain';

export interface PointSourceBuffers {
  /** Six float64 values per entity: x/y/z km and vx/vy/vz km/s in source.frame. */
  readonly states: Float64Array;
  /** Linear RGB triples, initially populated from entity colors. */
  readonly colors: Float32Array;
  /** CSS-pixel diameters. Zero hides an individual point. Initially 3. */
  readonly sizes: Float32Array;
}
export interface PointSource {
  readonly frame: FrameId;
  /** Fixed metadata/order/capacity. Register a new source to change membership. */
  readonly entities: readonly BodySpec[];
  /** Synchronous latest-data copy/propagation; return the active prefix count.
   * No fetch, promises, or retained references to engine-owned arrays.
   * Unwritten state starts NaN. Invalid records are hidden, never put at origin.
   */
  update(tdbSec: number, buffers: PointSourceBuffers): number;
  /** Called once on successful registration's removal or engine disposal. */
  dispose?(): void;
}
