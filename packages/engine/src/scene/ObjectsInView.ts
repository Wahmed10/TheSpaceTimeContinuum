import type { BodySpec, EntityKind } from '@space/domain';

export interface ObjectInView {
  readonly id: string;
  readonly name: string;
  readonly kind: EntityKind;
}

/** Homogeneous clip bounds include edges, reject behind-camera/nonfinite centers.
 * Label placement and occlusion deliberately have no bearing on membership.
 */
export function centerInView(
  rendered: boolean,
  x: number,
  y: number,
  z: number,
  w: number,
): boolean {
  return (
    rendered &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(z) &&
    Number.isFinite(w) &&
    w > 0 &&
    Math.abs(x) <= w &&
    Math.abs(y) <= w &&
    Math.abs(z) <= w
  );
}

/** Reusable cold-query buffer. Retained results never change under callers;
 * allocate an immutable array only when catalog membership changes.
 */
export class ObjectsInViewSnapshot {
  private records: ReadonlyMap<string, ObjectInView>;
  private buffer: ObjectInView[] = [];
  private snapshot: readonly ObjectInView[] = Object.freeze([]);
  constructor(bodies: readonly BodySpec[]) {
    this.records = new Map(
      bodies.map(({ id, name, kind }) => [
        id,
        Object.freeze({ id, name, kind }),
      ]),
    );
  }
  begin() {
    this.buffer.length = 0;
  }
  include(id: string) {
    const record = this.records.get(id);
    if (record) this.buffer.push(record);
  }
  finish(): readonly ObjectInView[] {
    if (
      this.buffer.length !== this.snapshot.length ||
      this.buffer.some((record, index) => record !== this.snapshot[index])
    )
      this.snapshot = Object.freeze(this.buffer.slice());
    return this.snapshot;
  }
}
