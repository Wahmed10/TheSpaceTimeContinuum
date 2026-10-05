// Initial Phase 4B scoped verification. Satellite/browser/CPU protocols will be added in P5.8.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { parseEnv } from 'node:util';
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
    protocol: process.argv.includes('--api-validation')
      ? 'P4B.3 full verify + credential-free build/budgets + real API proof setup + configured/unconfigured production browsers; not scheduled ingestion acceptance'
      : process.argv.includes('--live-ingestion')
        ? 'P4B.2 scoped offline install + pnpm verify + live Neon ingestion persistence; not scheduled ingestion or phase acceptance'
        : 'P4B.1 scoped offline install + pnpm verify; not phase acceptance or a live database test',
    liveIngestion: process.argv.includes('--live-ingestion'),
    apiValidation: process.argv.includes('--api-validation'),
    apiPorts: process.argv.includes('--api-validation') ? [3104, 3105] : [],
    pendingGates: process.argv.includes('--api-validation')
      ? [
          'independent raw/source/budget/browser/capture review',
          'P4B.3 scoped commit',
        ]
      : process.argv.includes('--live-ingestion')
        ? [
            'independent raw-result/source review',
            'P4B.2 scoped commit after reviewed live persistence',
          ]
        : [
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
if (existsSync(resolve(folder, 'result.json')))
  throw new Error(
    'This job already has results; preserve them and do not launch a duplicate',
  );
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
let server;
const stopServer = () => {
  if (server?.exitCode === null) {
    if (process.platform === 'win32')
      spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    else server.kill('SIGTERM');
  }
  server = undefined;
};
function runStage(
  name,
  args,
  checkout = candidate,
  extraEnv = {},
  live = false,
) {
  result.activeStage = name;
  persist();
  const out = openSync(resolve(folder, `${name}.log`), 'w');
  const err = openSync(resolve(folder, `${name}-stderr.log`), 'w');
  let stage;
  try {
    stage = spawnSync(manifest.node, [manifest.pnpmCli, ...args], {
      cwd: checkout,
      windowsHide: true,
      stdio: ['ignore', out, err],
      timeout: 30 * 60 * 1000,
      env: {
        ...process.env,
        CI: 'true',
        SITE_URL: '',
        EXPECTED_SITE_URL: '',
        SPACE_BUILD_AUDIT: '1',
        ...(live
          ? {}
          : {
              DATABASE_URL: '',
              TEST_DATABASE_URL: '',
              DB_TEST_ALLOW_WRITES: '',
            }),
        ...extraEnv,
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
async function startApiServer(name, port, configured) {
  result.activeStage = name + 'Startup';
  persist();
  await new Promise((done, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', () => probe.close(done));
  });
  let secrets = {};
  if (configured) {
    const local = resolve(manifest.root, 'apps/web/.env.local');
    secrets = existsSync(local) ? parseEnv(readFileSync(local, 'utf8')) : {};
    if (!secrets.DATABASE_URL && !process.env.DATABASE_URL)
      throw new Error(
        'Configured API profile needs root ignored database configuration',
      );
  }
  const log = openSync(resolve(folder, `${name}-server.log`), 'w');
  try {
    server = spawn(
      manifest.node,
      [
        resolve(candidate, 'apps/web/node_modules/next/dist/bin/next'),
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(port),
      ],
      {
        cwd: resolve(candidate, 'apps/web'),
        windowsHide: true,
        stdio: ['ignore', log, log],
        env: {
          ...process.env,
          ...secrets,
          NODE_ENV: 'production',
          SITE_URL: '',
          TEST_DATABASE_URL: '',
          DB_TEST_ALLOW_WRITES: '',
          ...(configured ? {} : { DATABASE_URL: '' }),
        },
      },
    );
  } finally {
    closeSync(log);
  }
  result[name + 'Server'] = {
    pid: server.pid,
    port,
    configured,
    log: `${name}-server.log`,
    startedAt: new Date().toISOString(),
  };
  persist();
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(name + ' owned server exited during startup');
    try {
      if (
        (
          await fetch(`http://127.0.0.1:${port}/status`, {
            signal: AbortSignal.timeout(3000),
          })
        ).ok
      )
        return;
    } catch {
      /* bounded service startup check, not long-job result polling */
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error(name + ' owned server startup timed out');
}
function reviewBrowserReport(name, count) {
  const report = JSON.parse(
    readFileSync(resolve(folder, `${name}.json`), 'utf8'),
  );
  const cases = [];
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) cases.push(...spec.tests);
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  if (
    cases.length !== count ||
    (report.errors ?? []).length ||
    cases.some(
      (test) =>
        test.status !== 'expected' ||
        test.expectedStatus !== 'passed' ||
        test.results.length !== 1 ||
        test.results[0].status !== 'passed',
    )
  )
    throw new Error(
      `${name} browser count/outcome failed; no skip/retry/flake is accepted`,
    );
  result.stages[name].cases = count;
  persist();
  const errors = readFileSync(resolve(folder, `${name}-server.log`), 'utf8')
    .split(/\r?\n/)
    .filter((line) =>
      /^(?:Error:|Unhandled|uncaughtException|Database pool connection error)|Internal: NoFallbackError/i.test(
        line,
      ),
    );
  result.stages[name + 'ServerLog'] = {
    exitCode: errors.length ? 1 : 0,
    errorCount: errors.length,
    log: `${name}-server.log`,
  };
  persist();
  if (errors.length) throw new Error(name + ' server logged errors');
}
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
  const stages = [
    ['install', ['install', '--offline', '--frozen-lockfile'], candidate],
    ['verify', ['verify'], candidate],
    ...(manifest.liveIngestion
      ? [
          [
            'liveIngestion',
            ['--filter', '@space/db', 'test:ingestion'],
            manifest.root,
          ],
        ]
      : []),
  ];
  for (const [name, args, checkout] of stages) {
    runStage(name, args, checkout, {}, name === 'liveIngestion');
  }
  if (manifest.apiValidation) {
    runStage('build', ['build']);
    mkdirSync(resolve(candidate, 'docs/perf'), { recursive: true });
    runStage('engineBundle', ['exec', 'node', 'tools/measure-engine.mjs']);
    copyFileSync(
      resolve(candidate, 'docs/perf/engine-bundle.json'),
      resolve(folder, 'engine-bundle.json'),
    );
    copyFileSync(
      resolve(candidate, 'apps/web/.next/startup-budget.json'),
      resolve(folder, 'startup-budget.json'),
    );
    runStage('assets', ['exec', 'tsx', 'tools/check-assets.ts']);
    // This is local proof setup for real API readback, not a scheduled-ingestion exit.
    runStage('apiSetup', ['ingest:due'], manifest.root, {}, true);
    for (const [index, configured] of [true, false].entries()) {
      const name = configured ? 'configuredApi' : 'unconfiguredApi';
      const port = manifest.apiPorts[index];
      await startApiServer(name, port, configured);
      try {
        runStage(
          name,
          [
            'exec',
            'playwright',
            'test',
            '--config=tools/phase-five-api.playwright.config.ts',
          ],
          candidate,
          {
            SPACE_API_ORIGIN: `http://127.0.0.1:${port}`,
            SPACE_API_CONFIGURED: configured ? '1' : '0',
            SPACE_API_RUN_DIRECTORY: folder,
            SPACE_API_REPORT: resolve(folder, `${name}.json`),
          },
        );
        reviewBrowserReport(name, configured ? 4 : 2);
        if (!configured)
          runStage(
            'shellAttribution',
            [
              'exec',
              'node',
              'tools/measure-shell.mjs',
              resolve(folder, 'shell.json'),
            ],
            candidate,
            { SPACE_VALIDATION_URL: `http://127.0.0.1:${port}` },
          );
      } finally {
        stopServer();
      }
    }
  }
  check();
  result.verdict = 'checks-passed-review-pending';
} catch (error) {
  result.verdict = 'failed';
  result.failure = error.message;
} finally {
  stopServer();
  result.status = 'finished';
  result.activeStage = result.verdict;
  result.finishedAt = new Date().toISOString();
  persist();
}
process.exitCode = result.verdict === 'failed' ? 1 : 0;
