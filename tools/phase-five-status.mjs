import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const pointer = '.tools/phase-five-active-job.txt';
const folder =
  process.argv[2] ??
  (existsSync(pointer)
    ? readFileSync(pointer, 'utf8')
        .replace(/^\uFEFF/, '')
        .trim()
    : '');
if (!folder) {
  console.log('No Phase 4B/5 validation job recorded.');
  process.exit(0);
}
const file = resolve(folder, 'result.json');
if (!existsSync(file)) {
  console.log(`QUEUED — inspect ${resolve(folder, 'launch.json')}`);
  process.exit(0);
}
let result;
try {
  result = JSON.parse(readFileSync(file, 'utf8'));
} catch {
  console.log('Status is being updated. Run this command again shortly.');
  process.exit(0);
}
console.log(
  `${result.status.toUpperCase()} — ${result.activeStage ?? result.verdict ?? 'starting'}`,
);
console.log(`PID: ${result.pid ?? 'not recorded'}`);
console.log(
  `Source: ${result.candidateCommit} + snapshot ${result.sourceSha256}`,
);
for (const [name, stage] of Object.entries(result.stages ?? {}))
  console.log(`${name}: ${stage.exitCode === 0 ? 'passed' : 'failed'}`);
if (result.status === 'running') {
  try {
    process.kill(result.pid, 0);
  } catch {
    console.log(
      'The recorded process is no longer running; inspect logs. This is not a pass.',
    );
  }
}
if (result.failure) console.log(`Failure: ${result.failure}`);
let pending = result.pendingGates ?? [];
const reviewFile = resolve(folder, 'review.json');
if (result.status === 'finished' && existsSync(reviewFile)) {
  try {
    const review = JSON.parse(readFileSync(reviewFile, 'utf8'));
    const resultHash = createHash('sha256')
      .update(readFileSync(file))
      .digest('hex');
    if (
      review.resultSha256 === resultHash &&
      review.sourceSha256 === result.sourceSha256 &&
      review.candidateCommit === result.candidateCommit
    ) {
      console.log(`Review: ${review.verdict}`);
      pending = review.pendingGates ?? pending;
      const closureFile = resolve(folder, 'closure.json');
      if (existsSync(closureFile)) {
        const closure = JSON.parse(readFileSync(closureFile, 'utf8'));
        if (
          closure.resultSha256 === resultHash &&
          closure.sourceSha256 === result.sourceSha256 &&
          closure.reviewSha256 ===
            createHash('sha256').update(readFileSync(reviewFile)).digest('hex')
        ) {
          console.log(`Step committed: ${closure.commit}`);
          pending = closure.pendingGates;
        }
      }
    }
  } catch {
    /* Invalid review/closure cannot establish acceptance. */
  }
}
console.log(`Logs/results: ${resolve(folder)}`);
console.log(`Pending: ${pending.join('; ') || 'none for this scoped step'}`);
console.log('Read-only status; no tests are launched.');
