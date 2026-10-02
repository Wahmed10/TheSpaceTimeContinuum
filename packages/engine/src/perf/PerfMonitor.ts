export interface PerfSample {
  fps: number;
  p95Ms: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  backend: string;
  tier: string;
}
export class PerfMonitor {
  private times = new Float64Array(240);
  private scratch = new Float64Array(240);
  private index = 0;
  private count = 0;
  add(dtMs: number) {
    if (dtMs > 0 && Number.isFinite(dtMs)) {
      this.times[this.index] = dtMs;
      this.index = (this.index + 1) % this.times.length;
      this.count = Math.min(this.count + 1, this.times.length);
    }
  }
  reset() {
    this.index = 0;
    this.count = 0;
  }
  get sampleCount() {
    return this.count;
  }
  stats() {
    let total = 0;
    for (let i = 0; i < this.count; i++) {
      const n = this.times[i]!;
      total += n;
      this.scratch[i] = n;
    }
    const sorted = this.scratch.subarray(0, this.count).sort();
    return {
      fps: this.count ? 1000 / (total / this.count) : 0,
      p95Ms: sorted[Math.floor(this.count * 0.95)] ?? 0,
      medianMs: sorted[Math.floor(this.count * 0.5)] ?? 0,
    };
  }
}
