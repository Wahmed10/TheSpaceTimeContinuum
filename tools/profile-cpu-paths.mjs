// Diagnostic only. Profiler overhead makes these timings unsuitable for the regression gate.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = process.argv[2],
  directory = process.argv[3];
if (!base || !directory)
  throw new Error(
    'Usage: node tools/profile-cpu-paths.mjs URL OUTPUT_DIRECTORY',
  );
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.text().startsWith('[profile-path]'))
      console.log(message.text());
  });
  await page.goto(new URL('/?renderer=webgl&perf=1&test=1', base).href);
  await page.locator('canvas[data-ready="true"]').waitFor({ timeout: 60000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const navigationStart = metrics.find(
    (metric) => metric.name === 'NavigationStart',
  )?.value;
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  const { report, markers } = await page.evaluate(async () => {
    const markers = [];
    const report = await window.__spaceEngine.measureCpuPaths(
      120,
      30,
      (path) => {
        markers.push({ path, startMs: performance.now() });
        console.log(`[profile-path] ${path}`);
      },
    );
    markers.push({ path: 'finished', startMs: performance.now() });
    return { report, markers };
  });
  const { profile } = await cdp.send('Profiler.stop');
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(
    resolve(directory, 'browser.cpuprofile'),
    JSON.stringify(profile),
  );
  // Keep profiled durations explicitly distinct from schema-2 gate reports.
  await writeFile(
    resolve(directory, 'diagnostic-paths.json'),
    JSON.stringify(
      {
        diagnosticOnly: true,
        profiling: 'Chrome CPU sampling at 100 microseconds',
        warning:
          'Profiler overhead included. Do not use these durations as acceptance evidence.',
        report,
        markers,
        navigationStart,
        browserVersion: browser.version(),
      },
      null,
      2,
    ),
  );
  const parents = new Map();
  for (const node of profile.nodes)
    for (const child of node.children ?? []) parents.set(child, node.id);
  const samples = new Map(),
    inclusive = new Map();
  const pathSamples = markers
    .slice(0, -1)
    .map((marker) => ({ path: marker.path, self: new Map() }));
  let timestamp = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) {
    const id = profile.samples[i],
      duration = profile.timeDeltas[i];
    timestamp += duration;
    if (navigationStart !== undefined) {
      for (let path = 0; path < pathSamples.length; path++) {
        if (
          timestamp >= navigationStart * 1e6 + markers[path].startMs * 1000 &&
          timestamp < navigationStart * 1e6 + markers[path + 1].startMs * 1000
        ) {
          const self = pathSamples[path].self;
          self.set(id, (self.get(id) ?? 0) + duration);
          break;
        }
      }
    }
    samples.set(id, (samples.get(id) ?? 0) + duration);
    for (
      let ancestor = id;
      ancestor !== undefined;
      ancestor = parents.get(ancestor)
    )
      inclusive.set(ancestor, (inclusive.get(ancestor) ?? 0) + duration);
  }
  const functions = profile.nodes.map((node) => ({
    id: node.id,
    name: node.callFrame.functionName || '(anonymous)',
    url: node.callFrame.url,
    line: node.callFrame.lineNumber + 1,
    selfMs: (samples.get(node.id) ?? 0) / 1000,
    inclusiveMs: (inclusive.get(node.id) ?? 0) / 1000,
  }));
  await writeFile(
    resolve(directory, 'summary.json'),
    JSON.stringify(
      {
        diagnosticOnly: true,
        topSelf: functions
          .filter((row) => row.selfMs > 0)
          .sort((a, b) => b.selfMs - a.selfMs)
          .slice(0, 100),
        topInclusive: functions
          .filter((row) => row.url.includes('/_next/') && row.inclusiveMs > 0)
          .sort((a, b) => b.inclusiveMs - a.inclusiveMs)
          .slice(0, 100),
        perPathSelf: pathSamples.map((path) => ({
          path: path.path,
          functions: functions
            .map((row) => ({
              ...row,
              selfMs: (path.self.get(row.id) ?? 0) / 1000,
            }))
            .filter((row) => row.selfMs > 0)
            .sort((a, b) => b.selfMs - a.selfMs)
            .slice(0, 100),
        })),
      },
      null,
      2,
    ),
  );
  console.log(`Diagnostic profile saved to ${resolve(directory)}`);
} finally {
  await browser.close();
}
