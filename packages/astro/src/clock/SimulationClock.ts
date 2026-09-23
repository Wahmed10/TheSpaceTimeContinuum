import { MAX_UTC_MS, MIN_UTC_MS } from '../time/constants';
import { utcMsToTdb } from '../time/scales';
export type ClockMode = 'live' | 'playing' | 'paused';
export interface ClockSnapshot {
  tdbSec: number;
  mode: ClockMode;
  rate: number;
  clamped: boolean;
  fade: number;
}
export const SPEEDS = [1, 10, 60, 100, 3600, 86400, 2629800, 31557600] as const;
export class SimulationClock {
  mode: ClockMode = 'live';
  rate = 1;
  private anchorRealMs: number;
  private anchorTdb: number;
  private current: number;
  private listeners = new Set<{
    cb: (s: ClockSnapshot) => void;
    interval: number;
    last: number;
  }>();
  private transition: { start: number; from: number; duration: number } | null =
    null;
  private readonly min = utcMsToTdb(MIN_UTC_MS);
  private readonly max = utcMsToTdb(MAX_UTC_MS);
  private snapshot: ClockSnapshot = {
    tdbSec: 0,
    mode: 'live',
    rate: 1,
    clamped: false,
    fade: 0,
  };
  constructor(private nowMs: () => number = () => Date.now()) {
    this.anchorRealMs = nowMs();
    this.current = this.anchorTdb = utcMsToTdb(this.anchorRealMs);
  }
  get state(): Readonly<ClockSnapshot> {
    return this.snapshot;
  }
  tick(realMs = this.nowMs()): number {
    let t =
      this.mode === 'paused'
        ? this.anchorTdb
        : this.mode === 'live'
          ? utcMsToTdb(realMs)
          : this.anchorTdb + (this.rate * (realMs - this.anchorRealMs)) / 1000;
    this.snapshot.fade = 0;
    if (this.transition) {
      const tr = this.transition;
      const p = Math.min(1, Math.max(0, (realMs - tr.start) / tr.duration));
      const e = p * p * (3 - 2 * p);
      t =
        tr.duration === 1200
          ? tr.from + (utcMsToTdb(realMs) - tr.from) * e
          : p < 0.5
            ? tr.from
            : utcMsToTdb(realMs);
      this.snapshot.fade = tr.duration === 400 ? Math.sin(p * Math.PI) : 0;
      if (p === 1) {
        this.transition = null;
        this.mode = 'live';
        this.rate = 1;
      }
    }
    const bounded = Math.max(this.min, Math.min(this.max, t));
    this.snapshot.clamped = bounded !== t;
    if (bounded !== t) {
      this.mode = 'paused';
      this.anchorTdb = bounded;
      this.transition = null;
    }
    this.current = bounded;
    this.snapshot.tdbSec=bounded;this.snapshot.mode=this.mode;this.snapshot.rate=this.rate;
    for (const l of this.listeners)
      if (realMs - l.last >= l.interval) {
        l.last = realMs;
        l.cb(this.snapshot);
      }
    return bounded;
  }
  private anchor() {
    const now = this.nowMs();
    this.anchorTdb = this.tick(now);
    this.anchorRealMs = now;
    this.transition = null;
  }
  play(rate = this.rate) {
    this.setRate(rate);
  }
  pause() {
    this.anchor();
    this.mode = 'paused';
  }
  setTime(tdbSec: number) {
    if (!Number.isFinite(tdbSec)) throw new RangeError('Time must be finite');
    this.anchorRealMs = this.nowMs();
    this.anchorTdb = Math.max(this.min, Math.min(this.max, tdbSec));
    this.mode = 'paused';
    this.transition = null;
    this.tick();
  }
  setRate(rate: number) {
    if (!Number.isFinite(rate) || Math.abs(rate) > 31557600)
      throw new RangeError('Unsupported playback speed');
    this.anchor();
    this.rate = rate;
    this.mode = rate === 0 ? 'paused' : 'playing';
  }
  goLive(opts: { animate?: boolean } = { animate: true }) {
    this.anchor();
    if (opts.animate) {
      this.transition = {
        start: this.nowMs(),
        from: this.current,
        duration:
          Math.abs(this.current - utcMsToTdb(this.nowMs())) < 86400
            ? 1200
            : 400,
      };
      this.mode = 'playing';
    } else {
      this.mode = 'live';
      this.rate = 1;
    }
  }
  subscribe(cb: (s: ClockSnapshot) => void, { hz = 4 }: { hz?: number } = {}) {
    const l = {
      cb,
      interval: 1000 / Math.max(0.1, Math.min(4, hz)),
      last: -Infinity,
    };
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
}
