export function radiusBoost(
  radiusKm: number,
  distanceKm: number,
  isMoon: boolean,
  scale: 'true' | 'explore',
): number {
  return scale === 'true'
    ? 1
    : Math.max(
        1,
        Math.min(
          isMoon ? 200 : 1000,
          Math.pow(Math.max(1, distanceKm) / (radiusKm * 50), 0.6),
        ),
      );
}
export function relativePosition(
  world: Float64Array,
  camera: Float64Array,
  out: Float64Array,
) {
  out[0] = world[0]! - camera[0]!;
  out[1] = world[1]! - camera[1]!;
  out[2] = world[2]! - camera[2]!;
}
export function childDisplayPosition(
  child: Float64Array,
  parent: Float64Array,
  parentDisplay: Float64Array,
  boost: number,
  out: Float64Array,
) {
  for (let i = 0; i < 3; i++)
    out[i] = parentDisplay[i]! + (child[i]! - parent[i]!) * boost;
}
