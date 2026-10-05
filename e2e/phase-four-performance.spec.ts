import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const query = '?test=1&renderer=webgl&t=2026-10-02T12%3A00%3A00Z';
test.use({
  channel: 'chromium',
  trace: 'off',
  video: 'off',
  screenshot: 'off',
  launchOptions: {
    args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
  },
});
const ready = (page: Page) =>
  expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
const browserProtocol = {
  channel: 'chromium',
  headless: true,
  args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
  method:
    'Packaged full Chromium in new headless mode, including its DirectX shader libraries. Default frame scheduling; no disable-frame-rate-limit or unsafe WebGPU flags. Actual scene adapter/backend are required. Original headless-shell failures remain separate.',
};
async function actualAdapter(page: Page) {
  return page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2')!;
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return debug
      ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL))
      : 'unknown';
  });
}
async function settled(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__spaceEngine!.diagnostics().pendingTextures,
        ),
      { timeout: 30000 },
    )
    .toBe(0);
  await page.evaluate(async () => {
    let previous = '',
      identical = 0;
    const deadline = performance.now() + 15000;
    while (performance.now() < deadline) {
      const current = JSON.stringify(
        window.__spaceEngine!.diagnostics().cameraWorld,
      );
      identical = current === previous ? identical + 1 : 0;
      if (identical >= 3) return;
      previous = current;
      await new Promise((done) => setTimeout(done, 100));
    }
    throw Error('Public camera snapshots did not settle');
  });
}
async function choose(page: Page, name: string) {
  await page.getByRole('button', { name: 'Find a world', exact: true }).click();
  const input = page.getByRole('combobox', {
    name: 'Find a world',
    exact: true,
  });
  await input.fill(name);
  await expect(page.getByRole('option').first()).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await input.press('Enter');
  await expect(page.locator('.object-card')).toHaveAttribute(
    'aria-label',
    name + ' details',
  );
  await settled(page);
}
declare global {
  interface Window {
    __p4FirstFrame?: { at: number; engineReportedMs: number };
    __p4LongTasks: { start: number; duration: number }[];
    __p4Observer: PerformanceObserver;
    __p4Draws: number[];
    __p4Unsubscribe: () => void;
  }
}
for (const profile of ['desktop', 'phone-viewport'] as const) {
  test.describe(profile, () => {
    test.use(
      profile === 'desktop'
        ? { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 }
        : {
            viewport: { width: 390, height: 844 },
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true,
          },
    );
    test('cold first-frame distribution and warmed actual navigation meet unchanged targets', async ({
      browser,
      page,
    }, info) => {
      test.setTimeout(600000);
      const phone = profile === 'phone-viewport',
        cold = [];
      // Explicit desktop broadband / mobile4G protocol. Fresh context, HTTP
      // cache disabled and cleared, service workers blocked; no warm substitution.
      const network = {
        latency: phone ? 150 : 20,
        downloadThroughput: ((phone ? 4 : 100) * 1000000) / 8,
        uploadThroughput: ((phone ? 1 : 20) * 1000000) / 8,
      };
      for (let sample = 0; sample < 5; sample++) {
        const context = await browser.newContext({
          baseURL: info.project.use.baseURL,
          viewport: phone
            ? { width: 390, height: 844 }
            : { width: 1440, height: 1000 },
          deviceScaleFactor: phone ? 2 : 1,
          isMobile: phone,
          hasTouch: phone,
          serviceWorkers: 'block',
        });
        const coldPage = await context.newPage(),
          cdp = await context.newCDPSession(coldPage),
          errors: string[] = [];
        const transfers = new Map<
          string,
          {
            url: string;
            startEpochMs: number;
            completed?: number;
            failed?: boolean;
            headers: number;
            parts: { at: number; bytes: number }[];
          }
        >();
        let epochOffset = 0;
        cdp.on('Network.requestWillBeSent', (event) => {
          epochOffset ||= (event.wallTime - event.timestamp) * 1000;
          transfers.set(event.requestId, {
            url: event.request.url,
            startEpochMs: event.wallTime * 1000,
            headers: 0,
            parts: [],
          });
        });
        cdp.on('Network.responseReceived', (event) => {
          const entry = transfers.get(event.requestId);
          if (entry) entry.headers = event.response.encodedDataLength;
        });
        cdp.on('Network.dataReceived', (event) => {
          transfers.get(event.requestId)?.parts.push({
            at: event.timestamp * 1000 + epochOffset,
            bytes: event.encodedDataLength,
          });
        });
        cdp.on('Network.loadingFinished', (event) => {
          const entry = transfers.get(event.requestId);
          if (entry) entry.completed = event.encodedDataLength;
        });
        cdp.on('Network.loadingFailed', (event) => {
          const entry = transfers.get(event.requestId);
          if (entry) entry.failed = true;
        });
        coldPage.on('pageerror', (error) => errors.push(error.message));
        await cdp.send('Network.enable');
        await cdp.send('Network.clearBrowserCache');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          ...network,
        });
        await cdp.send('Emulation.setCPUThrottlingRate', {
          rate: phone ? 4 : 1,
        });
        await coldPage.addInitScript(() => {
          const observer = new MutationObserver(() => {
            const canvas = document.querySelector<HTMLCanvasElement>(
              'canvas[data-painted=true]',
            );
            if (canvas && !window.__p4FirstFrame) {
              window.__p4FirstFrame = {
                at: Number(canvas.dataset.firstPaintAt),
                engineReportedMs: Number(canvas.dataset.firstFrameMs),
              };
              observer.disconnect();
            }
          });
          observer.observe(document, {
            subtree: true,
            attributes: true,
            childList: true,
            attributeFilter: ['data-painted'],
          });
        });
        await coldPage.goto('/' + query);
        await ready(coldPage);
        await expect(coldPage.locator('canvas')).toHaveAttribute(
          'data-painted',
          'true',
        );
        const frame = await coldPage.evaluate(() => ({
          firstFrame: window.__p4FirstFrame!,
          timeOrigin: performance.timeOrigin,
          navigation: performance.getEntriesByType('navigation')[0].toJSON(),
          userAgent: navigator.userAgent,
          backend: window.__spaceEngine!.backend,
        }));
        const cutoff = frame.timeOrigin + frame.firstFrame.at;
        const startupEntries = () =>
          Array.from(transfers.values()).filter(
            (entry) =>
              /^https?:/.test(entry.url) && entry.startEpochMs <= cutoff,
          );
        // Count complete transfers for every pre-paint request, including a
        // late current-date chunk. This is conservative about partial transfers.
        await expect
          .poll(
            () =>
              startupEntries().every(
                (entry) => entry.completed !== undefined || entry.failed,
              ),
            { timeout: 15000 },
          )
          .toBe(true);
        const startup = startupEntries().map((entry) => ({
          ...entry,
          bytes:
            entry.completed ??
            entry.headers + entry.parts.reduce((n, part) => n + part.bytes, 0),
        }));
        const startupBytes = startup.reduce((n, entry) => n + entry.bytes, 0);
        cold.push({
          sample,
          ...frame,
          adapter: await actualAdapter(coldPage),
          errors,
          startup,
          startupBytes,
        });
        await context.close();
      }
      await page.goto('/' + query);
      await ready(page);
      const adapter = await actualAdapter(page);
      await page.evaluate(async () => {
        window.__spaceEngine!.setQuality('low');
        await window.__spaceEngine!.whenLayersSettled();
      });
      const targets = [
        'Earth',
        'Mars',
        'Europa',
        'Jupiter',
        'Saturn',
        'Charon',
      ];
      for (const name of targets) {
        await choose(page, name);
        await page.waitForTimeout(750);
      }
      // Warm every measured route, texture and shader with actual rendering/UI.
      // All camera flights remain enabled; their duration is reported separately.
      await page.evaluate(() => {
        window.__p4LongTasks = [];
        window.__p4Draws = [];
        window.__p4Unsubscribe = window.__spaceEngine!.on('perf', (sample) =>
          window.__p4Draws.push(sample.drawCalls),
        );
        window.__p4Observer = new PerformanceObserver((list) => {
          for (const row of list.getEntries())
            window.__p4LongTasks.push({
              start: row.startTime,
              duration: row.duration,
            });
        });
        window.__p4Observer.observe({ type: 'longtask' });
      });
      const navigation = [];
      for (let round = 0; round < 2; round++)
        for (const name of targets) {
          const start = await page.evaluate(() => performance.now());
          await choose(page, name);
          const data = await page.evaluate(() => {
            const engine = window.__spaceEngine!;
            return {
              end: performance.now(),
              diagnostics: engine.diagnostics(),
            };
          });
          navigation.push({ name, round, start, ...data });
        }
      await page.waitForTimeout(100);
      const { longTasks, drawCalls } = await page.evaluate(() => {
        window.__p4Observer.disconnect();
        window.__p4Unsubscribe();
        return { longTasks: window.__p4LongTasks, drawCalls: window.__p4Draws };
      });
      const firstFrames = cold.map((row) => row.firstFrame.at),
        coldTargetMs = phone ? 5000 : 2500,
        longTaskTargetMs = phone ? 100 : 50;
      const report = {
        generatedAt: new Date().toISOString(),
        profile,
        adapter,
        candidateCommit: process.env.SPACE_CANDIDATE_COMMIT,
        sourceSha256: process.env.SPACE_SOURCE_SHA256,
        method:
          'Five fresh-context navigationStart-to-post-paint-marker samples following first scene submission; MutationObserver installed before navigation. All pre-paint requests count full encoded transfers, including late completion. Cleared/disabled browser cache and blocked service workers. Explicit CDP network/CPU below. Phone viewport/touch/CPU emulation is not physical phone throughput. Warm actual search/route/card/texture/shader views, then two six-target navigation rounds with motion enabled. Flight-plus-automation duration uses public camera snapshots stable for three100ms observations and is distinct from command response. Longtask observer begins after warmup. Recorder off.',
        network,
        cpuSlowdown: phone ? 4 : 1,
        coldTargetMs,
        startupCapBytes: 1_500_000,
        longTaskTargetMs,
        cold,
        firstFrames,
        coldMaxMs: Math.max(...firstFrames),
        coldMedianMs: [...firstFrames].sort((a, b) => a - b)[2],
        navigation,
        longTasks,
        drawCalls,
        maxDrawCalls: Math.max(0, ...drawCalls),
        maxLongTaskMs: Math.max(0, ...longTasks.map((row) => row.duration)),
        browserProtocol,
        compressedMipBudgetBytes: phone ? 128000000 : 350000000,
        limits: {
          detailedMeshes: phone ? 6 : 12,
          drawCalls: phone ? 150 : 300,
        },
        limitations: [
          'GPU texture bytes are compressed asset mip storage, not measured total VRAM.',
          'Physical phone throughput/thermal assessment remains pending; this protocol uses the desktop GPU.',
        ],
      };
      await writeFile(
        info.outputPath('performance-' + profile + '.json'),
        JSON.stringify(report, null, 2),
      );
      expect(cold.every((row) => !row.errors.length)).toBe(true);
      expect(
        cold.every(
          (row) =>
            row.adapter !== 'unknown' &&
            !/swiftshader|llvmpipe|software/i.test(row.adapter),
        ),
      ).toBe(true);
      expect(adapter).not.toBe('unknown');
      expect(adapter).not.toMatch(/swiftshader|llvmpipe|software/i);
      expect(cold).toHaveLength(5);
      for (const row of cold) {
        expect(row.startup.length).toBeGreaterThan(5);
        expect(row.startup.some((entry) => entry.failed)).toBe(false);
        expect(row.startupBytes).toBeGreaterThan(200000);
        expect(row.startupBytes).toBeLessThanOrEqual(1_500_000);
        expect(
          row.startup.some((entry) =>
            /\/data\/(corrections|orbits)\//.test(entry.url),
          ),
        ).toBe(false);
      }
      expect(Math.max(...firstFrames)).toBeLessThanOrEqual(coldTargetMs);
      expect(report.maxLongTaskMs).toBeLessThanOrEqual(longTaskTargetMs);
      expect(drawCalls.length).toBeGreaterThan(0);
      expect(report.maxDrawCalls).toBeLessThanOrEqual(report.limits.drawCalls);
      for (const row of navigation) {
        expect(row.diagnostics.pendingTextures).toBe(0);
        expect(
          row.diagnostics.orientations.filter((body) => body.rendered).length,
        ).toBeLessThanOrEqual(report.limits.detailedMeshes);
        expect(row.diagnostics.gpuBytes).toBeLessThanOrEqual(
          report.compressedMipBudgetBytes,
        );
      }
    });
  });
}
for (const backend of ['webgl', 'webgpu'] as const) {
  test(`physical desktop HIGH five-view ${backend} throughput and geometry retain strict targets`, async ({
    page,
  }, info) => {
    test.setTimeout(240000);
    const consoleWarnings: string[] = [],
      errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'warning') consoleWarnings.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(
      '/?test=1' + (backend === 'webgl' ? '&renderer=webgl' : ''),
    );
    await ready(page);
    const report = await page.evaluate(async () => {
      window.__spaceEngine!.setQuality('high');
      return window.__spaceEngine!.benchmark();
    });
    await writeFile(
      info.outputPath('desktop-high-' + backend + '.json'),
      JSON.stringify(
        {
          ...report,
          candidateCommit: process.env.SPACE_CANDIDATE_COMMIT,
          sourceSha256: process.env.SPACE_SOURCE_SHA256,
          thresholdP95Ms: 16.7,
          limits: {
            detailedMeshes: 12,
            drawCalls: 300,
            compressedMipsBytes: 350000000,
          },
          physicalPhone: 'pending; no emulation substitution',
          browserProtocol,
          consoleWarnings,
          errors,
        },
        null,
        2,
      ),
    );
    expect(report.softwareRenderer).toBe(false);
    expect(errors).toEqual([]);
    expect(
      consoleWarnings.filter((warning) =>
        /Failed to create device|WebGPU is not available/.test(warning),
      ),
    ).toEqual([]);
    expect(report.adapter).not.toBe('unknown');
    expect(report.results).toHaveLength(5);
    for (const row of report.results) {
      expect(row.samples).toBeGreaterThanOrEqual(30);
      expect(row.tier).toBe('high');
      expect(row.backend).toBe(backend === 'webgl' ? 'webgl2' : 'webgpu');
      expect(row.pendingTextures).toBe(0);
      expect(row.p95Ms).toBeLessThanOrEqual(16.7);
      expect(row.detailedMeshes).toBeLessThanOrEqual(12);
      expect(row.drawCalls).toBeLessThanOrEqual(300);
      expect(row.gpuBytes).toBeLessThanOrEqual(350000000);
    }
  });
}
