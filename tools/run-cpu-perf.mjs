import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { cpus, platform, arch, release } from 'node:os';
import { compareCpuReports } from '../packages/engine/src/perf/compareCpu.ts';

const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--'))
    throw new Error(`Missing ${name}`);
  return args[index + 1];
}
const output = option('--output', '.tools/cpu-perf.json');
const baseline = option('--baseline', null);
const frames = Number(option('--frames', '120'));
const warmup = Number(option('--warmup', '30'));
const url = new URL(
  '/?renderer=webgl&perf=1&test=1',
  option('--url', 'http://localhost:3000'),
);
const browser = await chromium.launch({
  args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('console', (message) => {
    if (message.text().startsWith('[cpu-path]')) console.log(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url.href);
  await page.locator('canvas[data-ready="true"]').waitFor({ timeout: 60000 });
  const result = await page.evaluate(
    ({ frames, warmup }) =>
      window.__spaceEngine.measureCpuPaths(frames, warmup, (path) =>
        console.log(`[cpu-path] ${path}`),
      ),
    { frames, warmup },
  );
  if (errors.length) throw new Error(errors.join('\n'));
  const report = {
    ...result,
    environment: {
      platform: platform(),
      arch: arch(),
      cpuModel: cpus()[0]?.model ?? 'unknown',
      browserMajor: browser.version().split('.')[0],
      browserVersion: browser.version(),
      osRelease: release(),
      nodeVersion: process.version,
    },
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`CPU evidence saved to ${output}`);
  console.table(
    report.results.map(({ path, meanMs, p95Ms }) => ({ path, meanMs, p95Ms })),
  );
  if (baseline) {
    let reference;
    try {
      reference = JSON.parse(await readFile(baseline, 'utf8'));
    } catch (error) {
      throw new Error(
        `No readable approved CPU baseline at ${baseline}. Record and review a matching-environment report first. ${error}`,
      );
    }
    const comparison = compareCpuReports(reference, report);
    await writeFile(
      output.replace(/\.json$/, '') + '-comparison.json',
      JSON.stringify(comparison, null, 2) + '\n',
    );
    if (!comparison.pass)
      throw new Error(
        `CPU regression exceeds 20%: ${comparison.checks
          .filter((check) => !check.pass)
          .map((check) => check.path)
          .join(', ')}`,
      );
    console.log(
      'CPU regression comparison passed at the unchanged 20% threshold.',
    );
  }
} finally {
  await browser.close();
}
