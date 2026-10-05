import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
console.log(`Logs/results: ${resolve(folder)}`);
console.log(
  `Pending: ${(result.pendingGates ?? []).join('; ') || 'independent review'}`,
);
console.log('Read-only status; no tests are launched.');
