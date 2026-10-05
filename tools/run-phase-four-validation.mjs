import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  readFileSync,
  writeFileSync,
  openSync,
  closeSync,
  existsSync,
  cpSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { collectValidationStage } from './validation-stage.mjs';
import { cpuValidationPlan } from './cpu-validation-plan.mjs';

const manifestPath = process.argv[2];
if (!manifestPath)
  throw Error(
    'Pass the prepared launch.json path; this runner never snapshots changing source implicitly.',
  );
const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
const { root, candidate, node, pnpmCli, port, runDirectory: dir } = manifest;
const origin = `http://localhost:${port}`;
const hash = (file) =>
  createHash('sha256').update(readFileSync(file)).digest('hex');
const result = {
  status: 'running',
  activeStage: 'sourceIntegrity',
  pid: process.pid,
  startedAt: new Date().toISOString(),
  candidateCommit: manifest.candidateCommit,
  candidateSource: manifest.candidateSource,
  sourceSha256: manifest.sourceSha256,
  referenceCommit: manifest.cpuReference?.commit,
  localVerify: manifest.localVerify,
  protocol: manifest.protocol,
  pendingGates: manifest.pendingGates,
  method:
    manifest.method ??
    'P4.9 first measurement pass: isolated audited normal-production build, emitted source-map/actual-request shell attribution, five cold samples per explicit desktop/4G-phone protocol, warmed actual navigation with motion, physical desktop HIGH five-view WebGL2/WebGPU throughput and geometry/storage. All measurements run even when a target fails, preserving complete raw failure evidence. This is not final phase acceptance. Accepted P4.8 regression/profile evidence remains separate; full final regression and changed-UX user review follow target diagnosis. Phone throughput remains pending physical hardware.',
};
const save = () =>
  writeFileSync(
    resolve(dir, 'result.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
let server;
let serverName;
function checkSource() {
  for (const location of [root, candidate]) {
    for (const entry of manifest.source)
      if (hash(resolve(location, entry.file)) !== entry.sha256)
        throw Error('Source changed: ' + location + '/' + entry.file);
    for (const file of manifest.deleted)
      if (existsSync(resolve(location, file)))
        throw Error('Deleted source reappeared: ' + file);
  }
  for (const entry of manifest.preservedEvidence)
    if (hash(resolve(root, entry.file)) !== entry.sha256)
      throw Error('Unrelated evidence changed: ' + entry.file);
  if (manifest.cpuReference) {
    const reference = manifest.cpuReference;
    const head = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: reference.checkout,
      encoding: 'utf8',
      windowsHide: true,
    });
    if (
      reference.commit !== '4409ef5d8f97299d9058360c97d560493d067c1c' ||
      head.status !== 0 ||
      head.stdout.trim() !== reference.commit ||
      !reference.source?.length
    )
      throw Error(
        'CPU reference must be the immutable accepted Phase 2 source',
      );
    for (const entry of reference.source)
      if (hash(resolve(reference.checkout, entry.file)) !== entry.sha256)
        throw Error('CPU reference changed: ' + entry.file);
  }
}
function run(
  args,
  name,
  { expected = 0, measurement = false, checkout = candidate } = {},
) {
  result.activeStage = name;
  save();
  const report = expected > 0,
    output = name + (report ? '.json' : '.log'),
    stderr = name + '-stderr.log';
  const out = openSync(resolve(dir, output), 'w'),
    err = openSync(resolve(dir, stderr), 'w');
  let response;
  try {
    response = spawnSync(node, [pnpmCli, ...args], {
      cwd: checkout,
      windowsHide: true,
      stdio: ['ignore', out, err],
      timeout: 45 * 60 * 1000,
      env: {
        ...process.env,
        SITE_URL: '',
        EXPECTED_SITE_URL: '',
        SPACE_BUILD_AUDIT: '1',
        SPACE_VALIDATION_URL: origin,
        SPACE_CANDIDATE_COMMIT: manifest.candidateCommit,
        SPACE_SOURCE_SHA256: manifest.sourceSha256,
        SPACE_PRODUCTION_PROFILING: name === 'reactProfile' ? '1' : '',
      },
    });
  } finally {
    closeSync(out);
    closeSync(err);
  }
  result[name] = {
    exitCode: response.status ?? 1,
    error: response.error?.message,
    command: [node, pnpmCli, ...args],
    cwd: checkout,
    output,
    stderr,
  };
  if (report) {
    try {
      const raw = JSON.parse(readFileSync(resolve(dir, output), 'utf8'));
      result[name].stats = raw.stats;
      result[name].reportErrors = raw.errors.length;
      result[name].completeCaseCount =
        raw.stats.expected +
        raw.stats.unexpected +
        raw.stats.skipped +
        raw.stats.flaky;
      if (
        raw.stats.expected !== expected ||
        raw.stats.unexpected ||
        raw.stats.skipped ||
        raw.stats.flaky ||
        raw.errors.length
      )
        result[name].exitCode = 1;
    } catch (error) {
      result[name].exitCode = 1;
      result[name].reportParseError = error.message;
    }
  }
  save();
  if (result[name].exitCode) {
    if (measurement) {
      result.failedMeasurements ??= [];
      result.failedMeasurements.push(name);
      save();
    } else throw Error(name + ' failed; inspect ' + output + '/' + stderr);
  }
}
async function startServer(
  name = 'production',
  { checkout = candidate, serverPort = port, mode = 'start' } = {},
) {
  result.activeStage = name + 'Startup';
  save();
  await new Promise((done, fail) => {
    const probe = createServer();
    probe.once('error', fail);
    probe.listen(serverPort, '0.0.0.0', () => probe.close(done));
  });
  const log = openSync(resolve(dir, name + '-server.log'), 'w');
  server = spawn(
    node,
    [
      resolve(checkout, 'apps/web/node_modules/next/dist/bin/next'),
      mode,
      '--port',
      String(serverPort),
      '--hostname',
      '0.0.0.0',
    ],
    {
      cwd: resolve(checkout, 'apps/web'),
      windowsHide: true,
      stdio: ['ignore', log, log],
      env: { ...process.env, SITE_URL: '', SPACE_PRODUCTION_PROFILING: '' },
    },
  );
  closeSync(log);
  serverName = name;
  result[name + 'Server'] = {
    pid: server.pid,
    port: serverPort,
    cwd: checkout,
    mode,
    log: name + '-server.log',
    startedAt: new Date().toISOString(),
  };
  save();
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw Error('Owned ' + name + ' server exited during startup');
    try {
      if (
        (
          await fetch(`http://localhost:${serverPort}`, {
            signal: AbortSignal.timeout(3000),
          })
        ).ok
      )
        return;
    } catch {
      /* brief startup check */
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw Error(name + ' startup timed out');
}
function checkServerLog(name) {
  const output = name + '-server.log';
  const errors = readFileSync(resolve(dir, output), 'utf8')
    .split(/\r?\n/)
    .filter((line) =>
      /^(?:Error:|Unhandled|uncaughtException)|Internal: NoFallbackError/i.test(
        line,
      ),
    );
  result[name + 'ServerLog'] = {
    exitCode: errors.length ? 1 : 0,
    errors,
    output,
  };
  save();
  if (errors.length) throw Error(name + ' server logged errors');
}
function stopServer() {
  if (server?.exitCode === null)
    spawnSync('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
  server = undefined;
  serverName = undefined;
}
function browserCases(specs, name, expected) {
  run(
    [
      'exec',
      'playwright',
      'test',
      '--config=phase-four.playwright.config.ts',
      ...specs,
      `--output=${resolve(dir, name === 'reactProfile' ? 'react-profile' : name)}`,
      '--reporter=json',
    ],
    name,
    { expected },
  );
}
async function collectIndependent(name, work) {
  // Integrity is a prerequisite, never an error to collect and continue past.
  checkSource();
  await collectValidationStage(
    result,
    name,
    async () => {
      try {
        await work();
      } finally {
        if (server) {
          try {
            checkServerLog(serverName);
          } finally {
            stopServer();
          }
        }
      }
    },
    save,
  );
  checkSource();
}
save();
try {
  checkSource();
  run(['install', '--offline', '--frozen-lockfile'], 'install');
  if (manifest.validateDriver)
    run(
      [
        'exec',
        'node',
        '--test',
        'tools/validation-stage.test.mjs',
        'tools/cpu-validation-plan.test.mjs',
      ],
      'validationDriver',
    );
  if (manifest.verifyFirst) run(['verify'], 'verify');
  if (manifest.protocol.localLookupSamples)
    run(
      [
        'exec',
        'tsx',
        'tools/phase-four-search-perf.ts',
        resolve(dir, 'local-search.json'),
      ],
      'localSearch',
    );
  run(['build'], 'build');
  if (existsSync(resolve(candidate, 'apps/web/.next/startup-budget.json')))
    cpSync(
      resolve(candidate, 'apps/web/.next/startup-budget.json'),
      resolve(dir, 'startup-budget.json'),
    );
  run(['exec', 'node', 'tools/measure-engine.mjs'], 'engineBundle');
  cpSync(
    resolve(candidate, 'docs/perf/engine-bundle.json'),
    resolve(dir, 'engine-bundle.json'),
  );
  run(['exec', 'tsx', 'tools/check-assets.ts'], 'assets');
  run(['licenses:check'], 'licenses');
  writeFileSync(
    resolve(candidate, 'phase-four.playwright.config.ts'),
    `import { defineConfig } from '@playwright/test';\nimport base from './playwright.config';\nexport default defineConfig({ ...base, use: { ...base.use, baseURL: '${origin}' }, webServer: undefined });\n`,
  );
  await startServer();
  run(
    ['exec', 'node', 'tools/measure-shell.mjs', resolve(dir, 'shell.json')],
    'shellAttribution',
    { measurement: !manifest.shellPrerequisite },
  );
  run(
    [
      'exec',
      'playwright',
      'test',
      '--config=phase-four.playwright.config.ts',
      'e2e/phase-four-performance.spec.ts',
      ...(manifest.performanceGrep ? ['--grep', manifest.performanceGrep] : []),
      `--output=${resolve(dir, 'performance')}`,
      '--reporter=json',
    ],
    'performance',
    { expected: manifest.protocol.performanceCases ?? 4, measurement: true },
  );
  if (manifest.browserSpecs) {
    await collectIndependent('browserRegression', async () => {
      browserCases(
        manifest.browserSpecs,
        'browser',
        manifest.protocol.browserCases,
      );
      for (const file of ['precision-webgl.json', 'texture-stability.json'])
        cpSync(resolve(candidate, 'docs/perf', file), resolve(dir, file));
      for (const profile of ['desktop', 'phone'])
        cpSync(
          resolve(
            candidate,
            'docs/perf/phase-four',
            `search-response-${profile}.json`,
          ),
          resolve(dir, `search-response-${profile}.json`),
        );
      checkServerLog('production');
      stopServer();
    });
  }
  if (manifest.profileSpecs) {
    await collectIndependent('profileRegression', async () => {
      if (server) {
        checkServerLog(serverName);
        stopServer();
      }
      run(
        ['--filter', 'web', 'exec', 'next', 'build', '--profile'],
        'profileBuild',
      );
      await startServer('profiling');
      browserCases(
        manifest.profileSpecs,
        'reactProfile',
        manifest.protocol.reactProfileCases,
      );
      cpSync(
        resolve(candidate, 'docs/perf/react-profile.json'),
        resolve(dir, 'lab-react-profile.json'),
      );
      checkServerLog('profiling');
      stopServer();
    });
  }
  if (manifest.cpuReference) {
    // Both use ordinary dev builds and the same SwiftShader protocol as P4.2.
    // The production profiling output is never used as the CPU candidate.
    for (const pair of cpuValidationPlan(manifest.cpuRepetitions)) {
      await collectIndependent('cpuRegression' + pair.suffix, async () => {
        const reference = manifest.cpuReference;
        const referenceName = 'cpuReference' + pair.suffix;
        const candidateName = 'cpuCandidate' + pair.suffix;
        const referenceOutput = resolve(
          dir,
          'cpu-reference' + pair.fileSuffix + '.json',
        );
        const candidateOutput = resolve(
          dir,
          'cpu-current' + pair.fileSuffix + '.json',
        );
        await startServer(referenceName, {
          checkout: reference.checkout,
          serverPort: reference.port,
          mode: 'dev',
        });
        run(
          [
            'perf:cpu',
            '--url',
            `http://localhost:${reference.port}`,
            '--output',
            referenceOutput,
          ],
          'referenceCpu' + pair.suffix,
          { checkout: reference.checkout },
        );
        checkServerLog(referenceName);
        stopServer();
        checkSource();
        await startServer(candidateName, { mode: 'dev' });
        run(
          [
            'perf:cpu',
            '--url',
            origin,
            '--output',
            candidateOutput,
            '--baseline',
            referenceOutput,
          ],
          'candidateCpu' + pair.suffix,
        );
        checkServerLog(candidateName);
        stopServer();
      });
    }
  }
  result.verdict = result.failedMeasurements?.length
    ? 'failed'
    : 'automated-measurements-pass-review-pending';
  if (result.failedMeasurements?.length) {
    result.failure = {
      message:
        'Validation gates failed: ' +
        result.failedMeasurements.join(', ') +
        '; inspect all retained raw results before fixing. Independent checks were collected at this frozen source; no failed gate was waived.',
    };
    process.exitCode = 1;
  }
} catch (error) {
  result.failure = { message: error.message };
  result.verdict = 'failed';
  process.exitCode = 1;
} finally {
  if (server) {
    try {
      checkServerLog(serverName);
    } catch (error) {
      result.verdict = 'failed';
      result.failure ??= { message: error.message };
      process.exitCode = 1;
    }
    stopServer();
  }
  try {
    checkSource();
    result.sourceIntegrity = {
      exitCode: 0,
      files: manifest.source.length,
      preservedEvidence: manifest.preservedEvidence.length,
    };
    result.sourceUnchanged = true;
    result.preservedEvidenceUnchanged = true;
  } catch (error) {
    result.sourceIntegrity = { exitCode: 1, error: error.message };
    result.verdict = 'failed';
    result.failure ??= { message: error.message };
    process.exitCode = 1;
  }
  result.status = 'finished';
  result.activeStage = null;
  result.finishedAt = new Date().toISOString();
  save();
}
