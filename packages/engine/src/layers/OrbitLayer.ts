import {
  DynamicDrawUsage,
  Mesh,
  InstancedInterleavedBuffer,
  InterleavedBufferAttribute,
} from 'three/webgpu';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import type { Certainty } from '@space/domain';
import { attribute, float } from 'three/tsl';
import { OrbitMaterial } from './OrbitMaterial';

/** Physical parent-relative samples stay float64. Rebase each vertex on the CPU
 * before float32 upload to avoid cancellation at a nearby orbit segment.
 */
export class OrbitLayer {
  readonly line: Mesh<LineGeometry, OrbitMaterial>;
  private readonly start: InterleavedBufferAttribute;
  private readonly end: InterleavedBufferAttribute;
  private readonly approximate: boolean;
  constructor(
    readonly points: Float64Array,
    color: string,
    certainty: Certainty,
  ) {
    if (points.length < 6 || points.length % 3)
      throw new Error('Invalid orbit points');
    this.approximate = certainty === 'approximate' || certainty === 'planned';
    const dashed = this.approximate || certainty === 'predicted';
    const material = new OrbitMaterial(color, dashed);
    const geometry = new LineGeometry().setPositions(new Float32Array(points));
    const distances = new Float32Array((points.length / 3 - 1) * 2);
    let length = 0;
    for (let i = 3; i < points.length; i += 3) {
      const index = (i / 3 - 1) * 2;
      distances[index] = length;
      length += Math.hypot(
        points[i]! - points[i - 3]!,
        points[i + 1]! - points[i - 2]!,
        points[i + 2]! - points[i - 1]!,
      );
      distances[index + 1] = length;
    }
    const distanceBuffer = new InstancedInterleavedBuffer(distances, 2);
    geometry.setAttribute(
      'instanceDistanceStart',
      new InterleavedBufferAttribute(distanceBuffer, 1, 0),
    );
    geometry.setAttribute(
      'instanceDistanceEnd',
      new InterleavedBufferAttribute(distanceBuffer, 1, 1),
    );
    this.line = new Mesh(geometry, material);
    this.line.frustumCulled = false;
    this.start = geometry.getAttribute(
      'instanceStart',
    ) as InterleavedBufferAttribute;
    this.end = geometry.getAttribute(
      'instanceEnd',
    ) as InterleavedBufferAttribute;
    this.start.data.setUsage(DynamicDrawUsage);
    material.dashSize = length / (this.approximate ? 1600 : 160);
    material.gapSize = length / (this.approximate ? 160 : 240);
    if (this.approximate && length > 0) {
      // Fade toward the uncertain window ends, retaining a visible central arc.
      material.opacityNode = float(material.opacityNode!).mul(
        float(attribute('instanceDistanceStart', 'float'))
          .div(length)
          .mul(2)
          .sub(1)
          .abs()
          .oneMinus()
          .mul(0.6)
          .add(0.4),
      );
    }
  }
  update(
    parent: Float64Array,
    camera: Float64Array,
    scale: number,
    selected: boolean,
  ) {
    const x = parent[0]! - camera[0]!,
      y = parent[1]! - camera[1]!,
      z = parent[2]! - camera[2]!;
    for (let i = 0; i < this.start.count; i++) {
      const a = i * 3,
        b = a + 3;
      this.start.setXYZ(
        i,
        x + this.points[a]! * scale,
        y + this.points[a + 1]! * scale,
        z + this.points[a + 2]! * scale,
      );
      this.end.setXYZ(
        i,
        x + this.points[b]! * scale,
        y + this.points[b + 1]! * scale,
        z + this.points[b + 2]! * scale,
      );
    }
    this.start.data.needsUpdate = true;
    this.line.material.linewidth = selected ? 2 : 1;
    this.line.material.opacity = this.approximate
      ? selected
        ? 0.38
        : 0.12
      : selected
        ? 0.65
        : 0.25;
  }
  dispose() {
    this.line.removeFromParent();
    this.line.geometry.dispose();
    this.line.material.dispose();
  }
}
