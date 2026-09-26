import { CPU_PATHS } from './CpuTimings';
import type { CpuStatistics } from './CpuTimings';

export interface CpuComparisonReport {
  schemaVersion: number;
  backend: string;
  tier: string;
  viewport: { width: number; height: number; dpr: number };
  entities: number;
  frames: number;
  warmupFrames: number;
  clockRate: number;
  startTime: string;
  environment: {
    platform: string;
    arch: string;
    cpuModel: string;
    browserMajor: string;
  };
  results: (CpuStatistics & {
    path: string;
    clockEvents: number;
    uiUpdates: number;
  })[];
}

/** Fail closed on missing, invalid or incomparable measurements. A baseline
 * from another CPU/browser/platform must be reviewed separately, not relabeled.
 */
export function compareCpuReports(
  baseline: CpuComparisonReport,
  current: CpuComparisonReport,
) {
  for (const report of [baseline, current]) {
    if (
      report.schemaVersion !== 2 ||
      report.results?.length !== CPU_PATHS.length ||
      !Number.isInteger(report.frames) ||
      !Number.isInteger(report.warmupFrames) ||
      report.frames < 30 ||
      report.frames > 1000 ||
      report.warmupFrames < 10 ||
      report.warmupFrames > 300 ||
      report.clockRate !== 1 ||
      report.startTime !== '2026-09-22T00:00:00Z' ||
      !['webgl2', 'webgpu'].includes(report.backend) ||
      report.tier !== 'low'
    )
      throw new Error('Invalid CPU report configuration');
    if (
      !Number.isInteger(report.entities) ||
      report.entities < 1 ||
      !Number.isFinite(report.viewport?.width) ||
      report.viewport.width <= 0 ||
      !Number.isFinite(report.viewport?.height) ||
      report.viewport.height <= 0 ||
      !Number.isFinite(report.viewport?.dpr) ||
      report.viewport.dpr <= 0
    )
      throw new Error('Invalid CPU scene configuration');
    const ids = new Set(report.results.map((row) => row.path));
    if (
      ids.size !== CPU_PATHS.length ||
      CPU_PATHS.some((path) => !ids.has(path.id))
    )
      throw new Error('Missing or duplicate CPU paths');
    for (const row of report.results) {
      if (
        !Number.isInteger(row.clockEvents) ||
        row.clockEvents < 0 ||
        !Number.isInteger(row.uiUpdates) ||
        row.uiUpdates < 0
      )
        throw new Error(`Invalid CPU scheduling counts for ${row.path}`);
      if (
        row.frames !== report.frames ||
        !Number.isFinite(row.meanMs) ||
        row.meanMs <= 0 ||
        !Number.isFinite(row.p95Ms) ||
        row.p95Ms <= 0 ||
        !Number.isFinite(row.medianMs) ||
        row.medianMs < 0 ||
        !Number.isFinite(row.maxMs) ||
        row.maxMs < row.meanMs ||
        row.maxMs < row.medianMs ||
        row.p95Ms < row.medianMs ||
        row.maxMs < row.p95Ms
      )
        throw new Error(`Invalid CPU samples for ${row.path}`);
    }
  }
  for (const key of [
    'backend',
    'tier',
    'entities',
    'frames',
    'warmupFrames',
    'clockRate',
    'startTime',
  ] as const)
    if (baseline[key] !== current[key])
      throw new Error(`Incomparable CPU reports: ${key}`);
  for (const key of ['width', 'height', 'dpr'] as const)
    if (baseline.viewport[key] !== current.viewport[key])
      throw new Error(`Incomparable CPU viewport: ${key}`);
  for (const key of ['platform', 'arch', 'cpuModel', 'browserMajor'] as const)
    if (
      !baseline.environment?.[key] ||
      baseline.environment[key] === 'unknown' ||
      baseline.environment[key] !== current.environment?.[key]
    )
      throw new Error(
        `Incomparable CPU environment: ${key}; collect a matching baseline`,
      );
  const checks = current.results.map((row) => {
    const reference = baseline.results.find(
      (entry) => entry.path === row.path,
    )!;
    if (
      row.clockEvents !== reference.clockEvents ||
      row.uiUpdates !== reference.uiUpdates
    )
      throw new Error(`Incomparable CPU scheduled work: ${row.path}`);
    return {
      path: row.path,
      meanRatio: row.meanMs / reference.meanMs,
      p95Ratio: row.p95Ms / reference.p95Ms,
      pass:
        row.meanMs <= reference.meanMs * 1.2 + 1e-9 &&
        row.p95Ms <= reference.p95Ms * 1.2 + 1e-9,
    };
  });
  return { threshold: 1.2, pass: checks.every((check) => check.pass), checks };
}
