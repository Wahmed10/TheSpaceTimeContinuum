/** Build-time adaptive sampling; never called merely because the camera moves.
 * Midpoint-to-chord error is relative to the local orbital radius. Seed intervals
 * prevent whole revolutions from aliasing to a straight chord. No end closure is
 * added: a validity-clipped trajectory remains open.
 */
export function sampleOrbit(
  evaluate: (tdb: number, out: Float64Array) => void,
  from: number,
  to: number,
  epoch: number,
  tolerance = 0.0002,
): Float64Array {
  if (
    !Number.isFinite(from) ||
    !Number.isFinite(to) ||
    !(to > from) ||
    !(tolerance > 0)
  )
    throw new Error('Invalid orbit interval');
  const times = Array.from(
    { length: 33 },
    (_, i) => from + ((to - from) * i) / 32,
  );
  if (epoch > from && epoch < to && !times.includes(epoch)) times.push(epoch);
  times.sort((a, b) => a - b);
  const values: number[] = [];
  function position(t: number) {
    const out = new Float64Array(3);
    evaluate(t, out);
    if (!out.every(Number.isFinite)) throw new Error('Non-finite orbit sample');
    return out;
  }
  function append(
    aTime: number,
    a: Float64Array,
    bTime: number,
    b: Float64Array,
    depth: number,
  ) {
    const midTime = (aTime + bTime) / 2;
    const mid = position(midTime);
    const error = Math.hypot(
      mid[0]! - (a[0]! + b[0]!) / 2,
      mid[1]! - (a[1]! + b[1]!) / 2,
      mid[2]! - (a[2]! + b[2]!) / 2,
    );
    if (depth < 6 && error > tolerance * Math.max(1, Math.hypot(...mid))) {
      append(aTime, a, midTime, mid, depth + 1);
      append(midTime, mid, bTime, b, depth + 1);
    } else values.push(b[0]!, b[1]!, b[2]!);
  }
  let previous = position(from);
  values.push(...previous);
  for (let i = 1; i < times.length; i++) {
    const next = position(times[i]!);
    append(times[i - 1]!, previous, times[i]!, next, 0);
    previous = next;
  }
  return new Float64Array(values);
}
