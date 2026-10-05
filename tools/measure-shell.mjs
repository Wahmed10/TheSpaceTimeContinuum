import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const origin = process.env.SPACE_VALIDATION_URL ?? 'http://localhost:3002';
const output = resolve(process.argv[2] ?? 'docs/perf/phase-four/shell.json');
const buildRoot = resolve('apps/web/.next');
const browser = await chromium.launch({
  channel: 'chromium',
  args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
});
const reports = [],
  errors = [];
function moduleSources(map) {
  return [
    ...(map.sources ?? []),
    ...(map.sections ?? []).flatMap((section) => moduleSources(section.map)),
  ];
}
function generatedLoaderAttribution(code, map) {
  if (moduleSources(map).length || map.names?.length || map.mappings !== '')
    return null;
  // Turbopack's source-free split-loader chunks contain only registrations of
  // literal dynamic chunk/module references. Match the entire emitted code;
  // arbitrary source-free code stays unattributed and fails the audit.
  const body = code.match(
    /^\(globalThis\.TURBOPACK\|\|\(globalThis\.TURBOPACK=\[\]\)\)\.push\(\["object"==typeof document\?document\.currentScript:void 0,(.*)\]\);$/s,
  )?.[1];
  if (!body) return null;
  const registrations = [
    ...body.matchAll(
      /(?:^|,)(\d+),(\w+)=>\{\2\.v\((\w+)=>Promise\.all\(\[((?:"static\/chunks\/[\w-]+\.js"(?:,)?)*)\]\.map\((\w+)=>\2\.l\(\5\)\)\)\.then\(\(\)=>\3\((\d+)\)\)\)\}/g,
    ),
  ];
  if (
    !registrations.length ||
    registrations.map((match) => match[0]).join('') !== body
  )
    return null;
  return {
    kind: 'exact-code Turbopack dynamic-import registrations',
    emittedCode: code,
    registrations: registrations.map((match) => ({
      id: Number(match[1]),
      chunkPaths: JSON.parse('[' + match[4] + ']'),
      targetModuleId: Number(match[6]),
    })),
  };
}
async function artifact(url) {
  const pathname = new URL(url).pathname;
  const file = pathname.startsWith('/_next/')
    ? resolve(buildRoot, pathname.slice(7))
    : resolve('apps/web/public', pathname.slice(1));
  const allowedRoot = pathname.startsWith('/_next/')
    ? buildRoot
    : resolve('apps/web/public');
  if (
    !file.startsWith(allowedRoot + '\\') &&
    !file.startsWith(allowedRoot + '/')
  )
    throw Error('Asset path escaped build');
  const bytes = await readFile(file);
  let sources = [],
    mapError = null,
    sourceMapFile = null,
    generatedLoader = null,
    sourceMapSha256 = null;
  try {
    const code = bytes.toString('utf8');
    const reference = [
      ...code.matchAll(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/g),
    ].at(-1)?.[1];
    if (!reference || !/^[\w.-]+\.map$/.test(reference))
      throw Error('Missing or unsupported emitted sourceMappingURL');
    sourceMapFile = resolve(dirname(file), reference);
    const mapBytes = await readFile(sourceMapFile);
    sourceMapSha256 = createHash('sha256').update(mapBytes).digest('hex');
    const map = JSON.parse(mapBytes.toString('utf8'));
    sources = moduleSources(map).map((source) => source.replaceAll('\\', '/'));
    generatedLoader = generatedLoaderAttribution(
      code.replace(/\/\/[#@]\s*sourceMappingURL=[^\s]+\s*$/, '').trim(),
      map,
    );
    if (!sources.length && !generatedLoader)
      throw Error(
        'Empty source map without exact generated-loader attribution',
      );
  } catch (error) {
    mapError = error.message;
  }
  const engineSources = sources.filter((source) =>
    /packages\/engine\/|(?:^|\/)three\/(?:src|build|examples)\//.test(source),
  );
  const transcoder = pathname.startsWith('/basis/');
  return {
    url,
    pathname,
    file,
    bytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sources,
    sourceMapFile,
    sourceMapSha256,
    generatedLoader,
    engineSources,
    mapError,
    classification: transcoder
      ? 'separately loaded Basis transcoder'
      : engineSources.length
        ? 'audited lazy engine/Three module closure'
        : generatedLoader
          ? 'exact-code generated Turbopack split-loader registrations'
          : sources.length
            ? 'Next/React/shared/catalog/UI module closure'
            : 'unattributed; fails closed',
  };
}
try {
  const routeStats = JSON.parse(
    await readFile(
      resolve(buildRoot, 'diagnostics/route-bundle-stats.json'),
      'utf8',
    ),
  );
  for (const route of ['/', '/object/planet/earth', '/object/moon/charon']) {
    const context = await browser.newContext({
      serviceWorkers: 'block',
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage(),
      requests = new Set();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      if (/\.js(?:\?|$)/.test(response.url())) {
        requests.add(response.url());
        if (!response.ok())
          errors.push(
            'JS response ' + response.status() + ': ' + response.url(),
          );
      }
    });
    await page.addInitScript(() => {
      Object.assign(window, {
        __spaceEngineStartGate: new Promise((done) =>
          Object.assign(window, { __releaseSpaceEngine: done }),
        ),
      });
    });
    await page.goto(
      origin + route + '?test=1&renderer=webgl&t=2026-10-02T12%3A00%3A00Z',
    );
    await page.locator('canvas').waitFor();
    // The diagnostic gate keeps the real loading overlay mounted. Include the
    // search/catalog closure through native keyboard activation without changing
    // the product overlay or forcing a pointer through it.
    const trigger = page.getByRole('button', {
      name: 'Find a world',
      exact: true,
    });
    await trigger.focus();
    await trigger.press('Enter');
    const input = page.getByRole('combobox', {
      name: 'Find a world',
      exact: true,
    });
    await input.fill('Europa');
    await page.getByRole('option').first().waitFor();
    await input.press('Escape');
    await page.waitForLoadState('networkidle');
    const blocked = await page.evaluate(
      () =>
        !window.__spaceEngine &&
        !document.querySelector('canvas')?.hasAttribute('data-ready'),
    );
    if (!blocked) throw Error('Engine-start gate failed');
    const diagnosticLoadingOverlayVisible = await page
      .locator('.loading-screen')
      .isVisible();
    const shellRequests = [...requests];
    const shell = await Promise.all(shellRequests.map(artifact));
    await page.evaluate(() => window.__releaseSpaceEngine());
    await page.locator('canvas[data-ready=true]').waitFor({ timeout: 60000 });
    await page.waitForLoadState('networkidle');
    const all = await Promise.all([...requests].map(artifact));
    const afterGate = all.filter((row) => !shellRequests.includes(row.url));
    const canonicalPaths = (rows) => [
      ...new Map(rows.map((row) => [row.file, row])).values(),
    ];
    const uniqueShell = canonicalPaths(shell),
      uniqueAll = canonicalPaths(all);
    const gzipBytes = uniqueShell.reduce((sum, row) => sum + row.gzipBytes, 0);
    const failures = [];
    if (gzipBytes > 200000) failures.push('Shell exceeds200000 gzip bytes');
    if (shell.some((row) => row.engineSources.length))
      failures.push('Renderer/Three modules present before engine startup');
    if (all.some((row) => row.mapError && !row.pathname.startsWith('/basis/')))
      failures.push('Missing emitted source-map attribution');
    if (!afterGate.some((row) => row.engineSources.length))
      failures.push('No audited lazy engine closure observed after release');
    reports.push({
      route,
      engineGateVerified: blocked,
      searchActivation: 'native focus/Enter during diagnostic engine gate',
      diagnosticLoadingOverlayVisible,
      shellGzipBytes: gzipBytes,
      budgetBytes: 200000,
      shell: uniqueShell,
      firstFrameAndSettledJs: uniqueAll,
      lazyAfterGate: afterGate,
      firstFrameAndSettledGzipBytes: uniqueAll.reduce(
        (sum, row) => sum + row.gzipBytes,
        0,
      ),
      failures,
      officialRouteStats: routeStats.find(
        (row) => row.route === (route === '/' ? '/' : '/object/[kind]/[slug]'),
      ),
    });
    await context.close();
  }
} catch (error) {
  errors.push(error.stack ?? error.message);
} finally {
  await browser.close();
}
const report = {
  generatedAt: new Date().toISOString(),
  candidateCommit: process.env.SPACE_CANDIDATE_COMMIT,
  sourceSha256: process.env.SPACE_SOURCE_SHA256,
  buildRoot,
  buildId: (await readFile(resolve(buildRoot, 'BUILD_ID'), 'utf8')).trim(),
  method:
    'Fresh contexts/service workers blocked. Real test-only engine-start gate before dynamic engine import; hydrated default shell plus actual local search/catalog UI. Native focus/Enter opens actual search while the diagnostic gate keeps the product loading overlay mounted; this is dependency attribution, not a claim of product readiness. Deduplicate emitted JS files and sum gzip level9. All Next/React/UI/shared/catalog JS retained. Resolve and hash source maps from actual emitted sourceMappingURL references, including content-hashed filenames. Empty maps require a whole-code match of generated Turbopack literal dynamic-import registrations; retain the exact code/references and count every byte. Unknown code fails closed. Module maps and official route stats audit attribution; any renderer/Three module in shell fails. Release gate and record every JS request through first frame and subsequent network idle, including Basis separately. No ten-largest-chunk heuristic. Uncaught route failures are retained in partial reports with pass=false.',
  sourceMaps: 'SPACE_BUILD_AUDIT=1; isolated validation build only',
  browserProtocol: {
    channel: 'chromium',
    version: browser.version(),
    args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
    headless: true,
  },
  reports,
  errors,
  pass:
    !errors.length &&
    reports.length === 3 &&
    reports.every((row) => !row.failures.length),
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(report, null, 2));
console.log({
  output,
  pass: report.pass,
  routes: reports.map((row) => ({
    route: row.route,
    shellGzipBytes: row.shellGzipBytes,
    failures: row.failures,
  })),
  errors,
});
if (!report.pass) process.exitCode = 1;
