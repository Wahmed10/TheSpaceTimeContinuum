import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const pointer = '.tools/phase-three-active-job.txt';
const folder = process.argv[2] ?? (existsSync(pointer)
  ? readFileSync(pointer, 'utf8').trim() : '.tools/orientation/retry-1');
const file = resolve(folder, 'result.json');
if (!existsSync(file)) {
  console.log(`No result file yet: ${file}`);
  process.exit(0);
}
let result;
try { result = JSON.parse(readFileSync(file, 'utf8')); }
catch { console.log('Status is being updated. Run this command again shortly.'); process.exit(0); }
const stages = Object.entries(result).filter(([, value]) => value && typeof value === 'object' && 'exitCode' in value);
const failed = stages.some(([, value]) => value.exitCode !== 0);
console.log(result.finishedAt ? (failed ? 'FINISHED — a check failed' : 'FINISHED — recorded checks passed') : 'RUNNING — results are not final');
for (const [name, value] of stages) console.log(`${name}: ${value.exitCode === 0 ? 'passed' : `failed (exit ${value.exitCode})`}`);
if (typeof result.build === 'string') console.log(`build: ${result.build}`);
if (result.finishedAt) console.log(`Finished: ${new Date(result.finishedAt).toLocaleString()}`);
console.log(`Logs: ${resolve(folder)}`);
console.log('Automated completion is separate from visual review and Phase 3 acceptance.');
