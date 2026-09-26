import { Vector3 } from 'three/webgpu';
import type { PerspectiveCamera } from 'three/webgpu';

/** Reusable float64 CPU picker. Positions are display-space doubles, not GPU
 * attributes. Call begin, consider visible meshes then points, then read result.
 */
export class Picker {
  private ray = new Vector3();
  private projected = new Vector3();
  private camera!: PerspectiveCamera;
  private world!: Float64Array;
  private width = 1;
  private height = 1;
  private x = 0;
  private y = 0;
  private radius = 12;
  private mesh: string | null = null;
  private meshDepth = Infinity;
  private point: string | null = null;
  private pointDepth = Infinity;
  private pointDistance = Infinity;

  begin(
    camera: PerspectiveCamera,
    world: Float64Array,
    width: number,
    height: number,
    x: number,
    y: number,
    touch: boolean,
  ) {
    this.camera = camera;
    this.world = world;
    this.width = width;
    this.height = height;
    this.x = x;
    this.y = y;
    this.radius = touch ? 24 : 12;
    this.mesh = this.point = null;
    this.meshDepth = this.pointDepth = this.pointDistance = Infinity;
    this.ray
      .set((x / width) * 2 - 1, 1 - (y / height) * 2, 0.5)
      .unproject(camera)
      .sub(camera.position)
      .normalize();
  }

  consider(id: string, position: Float64Array, radius: number, point: boolean) {
    const x = position[0]! - this.world[0]!,
      y = position[1]! - this.world[1]!,
      z = position[2]! - this.world[2]!;
    const along = x * this.ray.x + y * this.ray.y + z * this.ray.z;
    if (point) {
      this.projected
        .set(x, y, z)
        .add(this.camera.position)
        .project(this.camera);
      if (
        along <= 0 ||
        along >= this.meshDepth ||
        this.projected.z < -1 ||
        this.projected.z > 1
      )
        return;
      const distance = Math.hypot(
        ((this.projected.x + 1) * this.width) / 2 - this.x,
        ((1 - this.projected.y) * this.height) / 2 - this.y,
      );
      if (
        distance <= this.radius &&
        (distance < this.pointDistance ||
          (distance === this.pointDistance && along < this.pointDepth))
      ) {
        this.point = id;
        this.pointDistance = distance;
        this.pointDepth = along;
      }
      return;
    }
    // Perpendicular separation avoids subtracting two huge squared distances.
    const separation = Math.hypot(
      x - this.ray.x * along,
      y - this.ray.y * along,
      z - this.ray.z * along,
    );
    if (!(radius > 0) || separation > radius) return;
    const halfChord = Math.sqrt(
      Math.max(0, radius * radius - separation * separation),
    );
    const near = along - halfChord;
    const distance = near >= 0 ? near : along + halfChord;
    if (distance >= 0 && distance < this.meshDepth) {
      this.mesh = id;
      this.meshDepth = distance;
    }
  }

  get result() {
    return this.point && this.pointDepth < this.meshDepth
      ? this.point
      : this.mesh;
  }
}
