export const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));
export function sphericalToCartesian(
  distanceKm: number,
  azimuthRad: number,
  elevationRad: number,
  out: Float64Array,
) {
  const planar = distanceKm * Math.cos(elevationRad);
  out[0] = planar * Math.cos(azimuthRad);
  out[1] = planar * Math.sin(azimuthRad);
  out[2] = distanceKm * Math.sin(elevationRad);
}
export function exponentialZoom(
  distanceKm: number,
  delta: number,
  min: number,
  max: number,
) {
  return clamp(distanceKm * Math.exp(clamp(delta, -2, 2)), min, max);
}
export const ease = (t: number) => t * t * (3 - 2 * t);
export function transitionDistance(
  start: number,
  end: number,
  separationKm: number,
  t: number,
) {
  if (t <= 0) return start;
  if (t >= 1) return end;
  const peak = Math.max(start, end, separationKm * 0.6, 1);
  const local = t < 0.5 ? ease(t * 2) : ease((t - 0.5) * 2);
  return Math.exp(
    t < 0.5
      ? Math.log(start) + (Math.log(peak) - Math.log(start)) * local
      : Math.log(peak) + (Math.log(end) - Math.log(peak)) * local,
  );
}
export function transitionDuration(
  start: number,
  end: number,
  separationKm: number,
) {
  return clamp(
    1.2 +
      0.6 * Math.abs(Math.log10(end / start)) +
      0.4 * Math.log10(1 + separationKm / 1e6),
    1.2,
    6,
  );
}
