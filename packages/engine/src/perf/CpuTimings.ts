export interface CpuStatistics {
  frames: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}
/** Fixed allocation during measurement; sorting happens only at report time. */
export class CpuTimings {
  private values: Float64Array;
  private count = 0;
  constructor(capacity: number) {
    this.values = new Float64Array(capacity);
  }
  add(ms: number) {
    if (!Number.isFinite(ms) || ms < 0)
      throw new Error('Invalid CPU frame duration');
    if (this.count >= this.values.length)
      throw new Error('CPU recorder capacity exceeded');
    this.values[this.count++] = ms;
  }
  report(): CpuStatistics {
    if (!this.count) throw new Error('No CPU frames recorded');
    const sorted = this.values.slice(0, this.count).sort();
    let total = 0;
    for (const value of sorted) total += value;
    return {
      frames: this.count,
      meanMs: total / this.count,
      medianMs: sorted[Math.floor(this.count / 2)]!,
      p95Ms: sorted[Math.floor(this.count * 0.95)]!,
      maxMs: sorted[this.count - 1]!,
    };
  }
}

export const CPU_PATHS = [
  {
    id: 'solar-orbit',
    focus: 'star:sun',
    distance: 149597870.7 * 4.2,
    zoom: 1,
  },
  { id: 'earth-leo', focus: 'planet:earth', distance: 6771.0084, zoom: 1 },
  { id: 'moon-orbit', focus: 'moon:moon', distance: 1737.4 * 6, zoom: 1 },
  { id: 'mars-orbit', focus: 'planet:mars', distance: 3389.5 * 6, zoom: 1 },
  { id: 'earth-moon-zoom', focus: 'planet:earth', distance: 450000, zoom: 5 },
] as const;
