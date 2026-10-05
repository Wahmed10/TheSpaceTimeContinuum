// Initial Phase 4B scoped verification. Satellite/browser/CPU protocols will be added in P5.8.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  openSync,
  closeSync,
  renameSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const sha = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');
function git(args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error('Git source enumeration failed');
  return result.stdout;
}
function save(file, value) {
  writeFileSync(file + '.tmp', JSON.stringify(value, null, 2) + '\n');
  renameSync(file + '.tmp', file);
}
if (process.argv[2] === '--prepare') {
  const id = process.argv[3];
  if (!id || !/^[a-z0-9-]+$/.test(id))
    throw new Error('Pass a unique lowercase run ID');
  const folder = resolve(root, '.tools/phase-five', id);
  if (existsSync(folder))
    throw new Error('Run directory exists; never overwrite prior evidence');
  mkdirSync(folder, { recursive: true });
  const candidate = resolve(folder, 'candidate');
  // All current source, including accepted uncommitted/untracked runtime and public chunks.
  // Published measurement reports/captures are not copied as inputs to scoped verify.
  const paths = [
    ...new Set(
      git(['ls-files', '-c', '-o', '--exclude-standard', '-z']).split('\0'),
    ),
  ]
    .filter(
      (file) =>
        file &&
        !file.startsWith('docs/perf/') &&
        file !== 'docs/PHASE_4B_5_CHECKPOINT.md' &&
        existsSync(resolve(root, file)),
    )
    .sort();
  const source = paths.map((file) => ({
    file,
    sha256: sha(resolve(root, file)),
  }));
  for (const { file } of source) {
    const target = resolve(candidate, file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(resolve(root, file), target);
  }
  const require = createRequire(import.meta.url);
  const previous = JSON.parse(
    readFileSync(
      resolve(
        root,
        '.tools/phase-four/p4-9/progressive-integration-5/launch.json',
      ),
      'utf8',
    ),
  );
  let pnpmCli;
  try {
    pnpmCli = require.resolve('pnpm/bin/pnpm.cjs');
  } catch {
    pnpmCli = previous.pnpmCli;
  }
  if (!existsSync(pnpmCli)) throw new Error('Cannot locate installed pnpm CLI');
  const preservedEvidence = previous.preservedEvidence.map((entry) => ({
    file: entry.file,
    sha256: sha(resolve(root, entry.file)),
  }));
  const launch = {
    root,
    candidate,
    runDirectory: folder,
    node: process.execPath,
    pnpmCli,
    candidateCommit: git(['rev-parse', 'HEAD']).trim(),
    source,
    preservedEvidence,
    excludedInputs: [
      'docs/perf (published evidence, separately preserving user artifacts)',
      'docs/PHASE_4B_5_CHECKPOINT.md (mutable operational handoff)',
    ],
    sourceSha256: createHash('sha256')
      .update(JSON.stringify(source))
      .digest('hex'),
    protocol:
      'P4B.1 scoped offline install + pnpm verify; not phase acceptance or a live database test',
    pendingGates: [
      'independent raw-result/source review',
      'real Neon development-branch migration/seed/integration',
      'P4B.1 commit after live gate',
    ],
    createdAt: new Date().toISOString(),
  };
  save(resolve(folder, 'launch.json'), launch);
  writeFileSync(
    resolve(root, '.tools/phase-five-active-job.txt'),
    folder + '\n',
  );
  console.log(resolve(folder, 'launch.json'));
  process.exit(0);
}
const launchFile = process.argv[2];
if (!launchFile)
  throw new Error('Pass launch.json or --prepare <unique-run-id>');
const manifest = JSON.parse(readFileSync(resolve(launchFile), 'utf8'));
const { candidate, runDirectory: folder } = manifest;
const result = {
  status: 'running',
  pid: process.pid,
  activeStage: 'sourceIntegrity',
  startedAt: new Date().toISOString(),
  candidateCommit: manifest.candidateCommit,
  sourceSha256: manifest.sourceSha256,
  protocol: manifest.protocol,
  stages: {},
  pendingGates: manifest.pendingGates,
};
const persist = () => save(resolve(folder, 'result.json'), result);
const check = () => {
  for (const entry of manifest.preservedEvidence)
    if (sha(resolve(manifest.root, entry.file)) !== entry.sha256)
      throw new Error('Unrelated evidence changed: ' + entry.file);
  for (const entry of manifest.source) {
    // Next typegen owns candidate next-env.d.ts; source copy before checks is exact.
    if (sha(resolve(manifest.root, entry.file)) !== entry.sha256)
      throw new Error('Root source changed: ' + entry.file);
    if (
      entry.file !== 'apps/web/next-env.d.ts' &&
      sha(resolve(candidate, entry.file)) !== entry.sha256
    )
      throw new Error('Candidate source changed: ' + entry.file);
  }
};
persist();
try {
  check();
  for (const [name, args] of [
    ['install', ['install', '--offline', '--frozen-lockfile']],
    ['verify', ['verify']],
  ]) {
    result.activeStage = name;
    persist();
    const out = openSync(resolve(folder, `${name}.log`), 'w');
    const err = openSync(resolve(folder, `${name}-stderr.log`), 'w');
    let stage;
    try {
      stage = spawnSync(manifest.node, [manifest.pnpmCli, ...args], {
        cwd: candidate,
        windowsHide: true,
        stdio: ['ignore', out, err],
        timeout: 30 * 60 * 1000,
        // This job never reads/copies credentials or performs live DB writes.
        env: {
          ...process.env,
          CI: 'true',
          DATABASE_URL: '',
          TEST_DATABASE_URL: '',
          DB_TEST_ALLOW_WRITES: '',
        },
      });
    } finally {
      closeSync(out);
      closeSync(err);
    }
    result.stages[name] = {
      exitCode: stage.status,
      signal: stage.signal,
      finishedAt: new Date().toISOString(),
      log: `${name}.log`,
      stderr: `${name}-stderr.log`,
    };
    persist();
    if (stage.status !== 0)
      throw new Error(`${name} failed; inspect preserved logs`);
  }
  check();
  result.verdict = 'checks-passed-review-pending';
} catch (error) {
  result.verdict = 'failed';
  result.failure = error.message;
} finally {
  result.status = 'finished';
  result.activeStage = result.verdict;
  result.finishedAt = new Date().toISOString();
  persist();
}
process.exitCode = result.verdict === 'failed' ? 1 : 0;
