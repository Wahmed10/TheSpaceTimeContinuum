import { performance } from 'node:perf_hooks';
import { arch, cpus, platform, release } from 'node:os';
import { writeFileSync } from 'node:fs';
import { EXPLORABLE_BODIES } from '../packages/domain/src/catalog';
import { searchEntities } from '../apps/web/src/lib/catalogSearch';

const queries = [
  ...EXPLORABLE_BODIES.flatMap((body) => [body.name, body.id, ...body.aliases]),
  '',
  'Eur',
  'Chraon',
  'Euorpa',
  'Jupitr',
  'moon',
  'not a catalog body',
];
// Index creation, module loading and warm-up are outside measured lookup time.
for (let i = 0; i < 250; i++) searchEntities(queries[i % queries.length]!);
const samples = Array.from({ length: 1000 }, (_, i) => {
  const query = queries[i % queries.length]!;
  const before = performance.now();
  const results = searchEntities(query);
  return {
    query,
    milliseconds: performance.now() - before,
    results: results.length,
  };
});
const sorted = samples
  .map((sample) => sample.milliseconds)
  .sort((a, b) => a - b);
const report = {
  generatedAt: new Date().toISOString(),
  method:
    'Warm synchronous catalog lookup only. One cached MiniSearch index; 250 warm-up queries then 1000 samples across every body name/ID/alias plus prefix/typo/empty/no-match inputs. Excludes module load, index creation, DOM, navigation and renderer.',
  environment: {
    node: process.version,
    platform: platform(),
    osRelease: release(),
    arch: arch(),
    cpuModel: cpus()[0]?.model,
    miniSearch: '7.2.0',
    catalogBodies: EXPLORABLE_BODIES.length,
  },
  thresholdMs: 16,
  samples,
  medianMs: sorted[Math.floor(sorted.length * 0.5)]!,
  p95Ms: sorted[Math.floor(sorted.length * 0.95)]!,
  maxMs: sorted.at(-1)!,
};
const output = process.argv[2];
if (!output) throw new Error('Provide a JSON output path');
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log({
  output,
  samples: samples.length,
  medianMs: report.medianMs,
  p95Ms: report.p95Ms,
  maxMs: report.maxMs,
  thresholdMs: 16,
});
if (report.maxMs >= 16)
  throw new Error(
    'Warm local lookup must remain below 16 ms; inspect the recorded samples',
  );
