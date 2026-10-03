import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const pointer = '.tools/phase-four-active-job.txt';
const folder =
  process.argv[2] ??
  (existsSync(pointer)
    ? readFileSync(pointer, 'utf8')
        .replace(/^\uFEFF/, '')
        .trim()
    : undefined);
if (!folder) {
  console.log(
    'No Phase 4 job recorded yet. You can also pass a run directory.',
  );
  process.exit(0);
}
const file = resolve(folder, 'result.json');
if (!existsSync(file)) {
  console.log(`QUEUED — no result file yet: ${file}`);
  process.exit(0);
}
const raw = readFileSync(file, 'utf8');
let result;
try {
  result = JSON.parse(raw.replace(/^\uFEFF/, ''));
} catch {
  console.log(
    'The status file is being updated. Run the command again shortly.',
  );
  process.exit(0);
}
const stages = Object.entries(result).filter(
  ([, value]) => value && typeof value === 'object' && 'exitCode' in value,
);
const failed =
  Boolean(result.failure) ||
  result.verdict === 'failed' ||
  stages.some(([, value]) => value.exitCode !== 0);
const finished = result.status === 'finished';
let reviewed = false;
const reviewFile = resolve(folder, 'review.json');
if (finished && !failed && existsSync(reviewFile)) {
  try {
    const review = JSON.parse(
      readFileSync(reviewFile, 'utf8').replace(/^\uFEFF/, ''),
    );
    reviewed =
      review.resultSha256 === createHash('sha256').update(raw).digest('hex') &&
      review.candidateCommit === result.candidateCommit &&
      review.verdict === 'reviewed-pass';
  } catch {
    /* A partial or mismatched review never establishes acceptance. */
  }
}
console.log(
  finished
    ? failed
      ? 'FINISHED — a check failed'
      : stages.length
        ? `FINISHED — recorded checks passed; ${reviewed ? 'review recorded' : 'review pending'}`
        : 'FINISHED — no check results recorded; inspect the logs'
    : `RUNNING — ${result.activeStage ?? 'starting'}; results are not final`,
);
if (result.candidateSource ?? result.candidateCommit)
  console.log(`Source: ${result.candidateSource ?? result.candidateCommit}`);
if (result.pid) console.log(`Wrapper PID: ${result.pid}`);
for (const [name, value] of stages) {
  const stats = value.stats;
  console.log(
    `${name}: ${value.exitCode === 0 ? 'passed' : `failed (exit ${value.exitCode})`}${stats ? ` (${stats.expected} passed, ${stats.unexpected} failed, ${stats.skipped} skipped, ${stats.flaky} flaky)` : ''}`,
  );
}
if (result.failure)
  console.log(
    `Failure: ${result.failure.message ?? result.failure.error ?? 'Inspect logs'}`,
  );
if (result.finishedAt) console.log(`Finished: ${result.finishedAt}`);
console.log(`Results and logs: ${resolve(folder)}`);
console.log(
  'This command only reads the recorded run; it does not launch tests.',
);
