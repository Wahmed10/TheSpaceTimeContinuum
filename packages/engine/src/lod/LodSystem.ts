/** Representations ordered by increasing apparent diameter (§12.3). */
export type LodLevel = 0 | 1 | 2 | 3;
const THRESHOLDS = [2, 12, 200] as const;

/** Perspective projected diameter in CSS pixels, using display-space units.
 * A camera inside the sphere always requests the highest detail.
 */
export function projectedDiameter(
  radius: number,
  distance: number,
  verticalFovRadians: number,
  viewportHeight: number,
): number {
  if (!(radius > 0) || !(viewportHeight > 0)) return 0;
  if (distance <= radius) return Infinity;
  return (
    (radius * viewportHeight) /
    (Math.sqrt(distance * distance - radius * radius) *
      Math.tan(verticalFovRadians / 2))
  );
}

/** Caller owns one level per entity; selection allocates no per-frame objects.
 * Initial selection uses nominal thresholds. Subsequent changes cross the
 * ±15% dead band, including multi-level jumps after focus/scale changes.
 */
export function selectLod(diameterPx: number, previous?: LodLevel): LodLevel {
  if (Number.isNaN(diameterPx) || diameterPx < 0) return previous ?? 0;
  let level: LodLevel = previous ?? 0;
  const up = previous === undefined ? 1 : 1.15;
  while (level < 3 && diameterPx >= THRESHOLDS[level as 0 | 1 | 2] * up) {
    level = (level + 1) as LodLevel;
  }
  while (
    level > 0 &&
    diameterPx < THRESHOLDS[(level - 1) as 0 | 1 | 2] * 0.85
  ) {
    level = (level - 1) as LodLevel;
  }
  return level;
}
