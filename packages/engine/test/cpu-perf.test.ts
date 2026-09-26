import { expect, it } from 'vitest';
import { CpuTimings, CPU_PATHS } from '../src/perf/CpuTimings';
import { compareCpuReports } from '../src/perf/compareCpu';
import type { CpuComparisonReport } from '../src/perf/compareCpu';

function report(): CpuComparisonReport {
  return {
    schemaVersion: 2,
    backend: 'webgl2',
    tier: 'low',
    viewport: { width: 1440, height: 1000, dpr: 1 },
    entities: 21,
    frames: 120,
    warmupFrames: 30,
    clockRate: 1,
    startTime: '2026-09-22T00:00:00Z',
    environment: {
      platform: 'test',
      arch: 'test',
      cpuModel: 'test',
      browserMajor: '153',
    },
    results: CPU_PATHS.map(({ id }) => ({
      path: id,
      frames: 120,
      clockEvents: 8,
      uiUpdates: 8,
      meanMs: 10,
      medianMs: 10,
      p95Ms: 20,
      maxMs: 30,
    })),
  };
}
it('records CPU durations independently of RAF intervals and rejects overflow', () => {
  const times = new CpuTimings(4);
  [3, 1, 8, 4].forEach((duration) => times.add(duration));
  expect(times.report()).toEqual({
    frames: 4,
    meanMs: 4,
    medianMs: 4,
    p95Ms: 8,
    maxMs: 8,
  });
  expect(() => times.add(2)).toThrow('capacity');
  expect(() => new CpuTimings(1).add(NaN)).toThrow('duration');
});
it('enforces the 20 percent boundary for both mean and p95', () => {
  const baseline = report(),
    current = report();
  current.results[0]!.meanMs = 12;
  current.results[0]!.p95Ms = 24;
  expect(compareCpuReports(baseline, current).pass).toBe(true);
  current.results[0]!.p95Ms = 24.01;
  expect(compareCpuReports(baseline, current).pass).toBe(false);
  current.results[0]!.p95Ms = 20;
  current.results[0]!.meanMs = 12.01;
  expect(compareCpuReports(baseline, current).pass).toBe(false);
});
it('does not accept missing paths, nonfinite timings or a different environment', () => {
  const baseline = report(),
    current = report();
  current.environment.cpuModel = 'other';
  expect(() => compareCpuReports(baseline, current)).toThrow('environment');
  current.environment.cpuModel = 'test';
  current.results[0]!.meanMs = NaN;
  expect(() => compareCpuReports(baseline, current)).toThrow('samples');
  current.results.pop();
  expect(() => compareCpuReports(baseline, current)).toThrow('configuration');
});
it('rejects incompatible protocols and unequal scheduled work', () => {
  const baseline = report();
  const legacy = report();
  legacy.schemaVersion = 1;
  expect(() => compareCpuReports(legacy, report())).toThrow('configuration');
  const paused = report();
  paused.clockRate = 0;
  expect(() => compareCpuReports(paused, paused)).toThrow('configuration');
  const invalidDate = report();
  invalidDate.startTime = '';
  expect(() => compareCpuReports(invalidDate, invalidDate)).toThrow('configuration');
  const unequal = report();
  unequal.results[0]!.clockEvents--;
  expect(() => compareCpuReports(baseline, unequal)).toThrow('scheduled work');
  unequal.results[0]!.clockEvents++;
  unequal.results[0]!.uiUpdates--;
  expect(() => compareCpuReports(baseline, unequal)).toThrow('scheduled work');
});
