import {
  DynamicDrawUsage,
  InstancedBufferAttribute,
  PointsNodeMaterial,
  Sprite,
} from 'three/webgpu';
import { instancedBufferAttribute, smoothstep, uv } from 'three/tsl';

/** One instanced billboard draw. Positions are local to the layer's parent
 * frame; rebase the group in float64 before uploading its camera-relative origin.
 * Sizes are CSS pixels, independent of device pixel ratio.
 */
export class PointLayer {
  readonly positions: InstancedBufferAttribute;
  readonly colors: InstancedBufferAttribute;
  readonly sizes: InstancedBufferAttribute;
  readonly object: Sprite;
  private readonly ranges = Array.from({ length: 3 }, () => ({
    start: 0,
    count: 0,
  }));

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1)
      throw new Error('Invalid point capacity');
    this.positions = new InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(DynamicDrawUsage);
    this.colors = new InstancedBufferAttribute(
      new Float32Array(capacity * 3),
      3,
    ).setUsage(DynamicDrawUsage);
    this.sizes = new InstancedBufferAttribute(
      new Float32Array(capacity),
      1,
    ).setUsage(DynamicDrawUsage);
    const material = new PointsNodeMaterial({
      transparent: true,
      depthWrite: false,
      sizeAttenuation: false,
    });
    material.positionNode = instancedBufferAttribute(this.positions, 'vec3');
    material.colorNode = instancedBufferAttribute(this.colors, 'vec3');
    material.sizeNode = instancedBufferAttribute(this.sizes, 'float');
    material.opacityNode = smoothstep(0.5, 0.15, uv().sub(0.5).length());
    this.object = new Sprite(material);
    // Sprite geometry is shared by three.js; own a copy for independent disposal.
    this.object.geometry = this.object.geometry.clone();
    this.object.geometry.setAttribute('pointPosition', this.positions);
    this.object.geometry.setAttribute('pointColor', this.colors);
    this.object.geometry.setAttribute('pointSize', this.sizes);
    this.object.frustumCulled = false;
    this.setCount(capacity);
  }

  setCount(count: number) {
    if (!Number.isInteger(count) || count < 0 || count > this.capacity)
      throw new Error('Invalid point count');
    (this.object as Sprite & { count: number }).count = count;
    this.object.visible = count > 0;
  }

  /** Merge pending writes, including writes queued while the layer is hidden.
   * Reuse range records instead of allocating one for every frame upload.
   */
  upload(first = 0, count = this.capacity, colors = true) {
    if (
      !Number.isInteger(first) ||
      !Number.isInteger(count) ||
      first < 0 ||
      count < 0 ||
      first + count > this.capacity
    )
      throw new Error('Invalid point update range');
    if (!count) return;
    this.mark(this.positions, 0, first * 3, count * 3);
    if (colors) this.mark(this.colors, 1, first * 3, count * 3);
    this.mark(this.sizes, 2, first, count);
  }

  private mark(
    attribute: InstancedBufferAttribute,
    index: number,
    start: number,
    count: number,
  ) {
    const range = this.ranges[index]!;
    if (attribute.updateRanges.length) {
      const end = Math.max(range.start + range.count, start + count);
      range.start = Math.min(range.start, start);
      range.count = end - range.start;
    } else {
      range.start = start;
      range.count = count;
      attribute.updateRanges.push(range);
    }
    attribute.needsUpdate = true;
  }

  dispose() {
    this.object.removeFromParent();
    this.object.geometry.dispose();
    this.object.material.dispose();
  }
}
