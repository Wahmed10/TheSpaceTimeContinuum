import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const query = '?test=1&renderer=webgl&t=2026-10-02T12%3A00%3A00Z';
const orbital = [
  'dwarf:ceres',
  'moon:charon',
  'moon:triton',
  'moon:titan',
  'moon:phobos',
  'moon:deimos',
];
test.use({
  channel: 'chromium',
  launchOptions: {
    args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
  },
});
async function ready(page: Page) {
  await expect(page.locator('canvas')).toHaveAttribute('data-painted', 'true', {
    timeout: 60000,
  });
}
async function corrected(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__spaceEngine!.getPositionStatus('planet:earth'),
      ),
    )
    .toBe('ready');
}
test('held current data keeps a painted scene, fresh approximate planets and truthful orbital loading', async ({
  page,
}, info) => {
  const held: Route[] = [],
    errors: string[] = [];
  let hold = true;
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/data/chunks/**', (route) => {
    if (hold) held.push(route);
    else void route.continue();
  });
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  await expect(page.locator('.position-certainty')).toHaveText(
    /Approximate position/,
  );
  const before = await page.evaluate(() => ({
    clock: window.__spaceEngine!.clock.state.tdbSec,
    diagnostics: window.__spaceEngine!.diagnostics(),
    metrics: window.__spaceEngine!.getMetrics('planet:earth'),
  }));
  expect(before.metrics?.certainty).toBe('approximate');
  for (const id of orbital) {
    expect(
      before.diagnostics.positionStatus.find((row) => row.id === id)?.status,
    ).toBe('loading');
    expect(before.diagnostics.lod.find((row) => row.id === id)?.visible).toBe(
      false,
    );
  }
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().renderedFrames),
    )
    .toBeGreaterThan(before.diagnostics.renderedFrames + 3);
  await page.screenshot({
    path: info.outputPath('approximate-while-loading.png'),
  });
  hold = false;
  await Promise.all(held.map((route) => route.continue()));
  await corrected(page);
  for (const id of orbital)
    expect(
      await page.evaluate((id) => window.__spaceEngine!.getMetrics(id), id),
    ).not.toBeNull();
  expect(
    await page.evaluate(() => window.__spaceEngine!.clock.state.tdbSec),
  ).toBe(before.clock);
  await expect(page.locator('.position-certainty')).toHaveText(
    /Computed position/,
  );
  expect(errors).toEqual([]);
});
test('late old-date data cannot restore an obsolete date or focus, and loading metrics never reuse coordinates', async ({
  page,
}, info) => {
  await page.goto('/' + query);
  await ready(page);
  await corrected(page);
  await page.evaluate(() => window.__spaceEngine!.setLayer('orbits', false));
  const held: Route[] = [];
  let hold = true;
  await page.route('**/data/chunks/**', (route) => {
    if (hold) held.push(route);
    else void route.continue();
  });
  const first = await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.applyMapState(
      { focus: 'dwarf:ceres', t: '2068-04-02T00:00:00Z' },
      { transition: false },
    );
    return {
      index: Math.floor(engine.clock.state.tdbSec / (28 * 86400)),
      metrics: engine.getMetrics('dwarf:ceres'),
    };
  });
  expect(first.metrics).toBeNull();
  await expect
    .poll(() =>
      held.some((route) =>
        route.request().url().endsWith(`/${first.index}.bin`),
      ),
    )
    .toBe(true);
  const next = await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.applyMapState(
      { focus: 'planet:earth', t: '1914-08-01T00:00:00Z' },
      { transition: false },
    );
    return {
      epoch: engine.clock.state.tdbSec,
      metrics: engine.getMetrics('planet:earth'),
      frames: engine.diagnostics().renderedFrames,
    };
  });
  expect(next.metrics?.certainty).toBe('approximate');
  await held
    .find((route) => route.request().url().endsWith(`/${first.index}.bin`))!
    .continue();
  await expect
    .poll(() =>
      page.evaluate(
        (index) =>
          window
            .__spaceEngine!.diagnostics()
            .chunks.cachedIndices.includes(index),
        first.index,
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => window.__spaceEngine!.clock.state.tdbSec),
  ).toBe(next.epoch);
  expect(await page.evaluate(() => window.__spaceEngine!.focusedId)).toBe(
    'planet:earth',
  );
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMetrics('dwarf:ceres')),
  ).toBeNull();
  expect(
    await page.evaluate(() =>
      window.__spaceEngine!.getPositionStatus('planet:earth'),
    ),
  ).toBe('approximate');
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().renderedFrames),
    )
    .toBeGreaterThan(next.frames + 3);
  await expect(page.locator('canvas')).toHaveCSS('opacity', '1');
  await page.screenshot({
    path: info.outputPath('late-response-new-date.png'),
  });
  hold = false;
  await Promise.all(
    held
      .filter((route) => !route.request().url().endsWith(`/${first.index}.bin`))
      .map((route) => route.continue()),
  );
  await corrected(page);
  expect(
    await page.evaluate(() => window.__spaceEngine!.clock.state.tdbSec),
  ).toBe(next.epoch);
});
test('offline correction failures keep newly calculated positions marked approximate', async ({
  page,
}) => {
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  await corrected(page);
  await page.evaluate(() => window.__spaceEngine!.setLayer('orbits', false));
  const previous = await page.evaluate(() =>
    window.__spaceEngine!.getMetrics('planet:earth'),
  );
  await page.route('**/data/chunks/**', (route) =>
    route.abort('internetdisconnected'),
  );
  await page.evaluate(() =>
    window.__spaceEngine!.applyMapState(
      { focus: 'planet:earth', t: '1902-06-20T00:00:00Z' },
      { transition: false },
    ),
  );
  await expect(page.locator('.position-certainty')).toHaveText(
    /Approximate position/,
  );
  const fresh = await page.evaluate(() =>
    window.__spaceEngine!.getMetrics('planet:earth'),
  );
  expect(fresh?.certainty).toBe('approximate');
  expect(fresh?.distanceSunKm).not.toBe(previous?.distanceSunKm);
  await expect(page.locator('.error-panel')).toHaveCount(0);
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMetrics('moon:charon')),
  ).toBeNull();
});
test('five uncached desktop date jumps finish within one second while rendering continues @physical-gpu', async ({
  page,
}, info) => {
  const cdp = await page.context().newCDPSession(page);
  const transfers = new Map<
    string,
    {
      url: string;
      started: number;
      response?: number;
      finished?: number;
      failed?: boolean;
    }
  >();
  const pendingTextures = new Set<string>();
  let peakTextureRequests = 0;
  cdp.on('Network.requestWillBeSent', (event) => {
    const url = new URL(event.request.url).pathname;
    if (!url.endsWith('.ktx2') && !url.startsWith('/data/chunks/')) return;
    transfers.set(event.requestId, { url, started: event.timestamp });
    if (url.endsWith('.ktx2')) {
      pendingTextures.add(event.requestId);
      peakTextureRequests = Math.max(peakTextureRequests, pendingTextures.size);
    }
  });
  cdp.on('Network.responseReceived', (event) => {
    const transfer = transfers.get(event.requestId);
    if (transfer) transfer.response = event.timestamp;
  });
  cdp.on('Network.loadingFinished', (event) => {
    const transfer = transfers.get(event.requestId);
    if (transfer) transfer.finished = event.timestamp;
    pendingTextures.delete(event.requestId);
  });
  cdp.on('Network.loadingFailed', (event) => {
    const transfer = transfers.get(event.requestId);
    if (transfer) transfer.failed = true;
    pendingTextures.delete(event.requestId);
  });
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 20,
    downloadThroughput: 100000000 / 8,
    uploadThroughput: 20000000 / 8,
  });
  await page.goto('/' + query);
  await ready(page);
  await corrected(page);
  await page.evaluate(() => window.__spaceEngine!.setLayer('orbits', false));
  const jumps = [];
  for (const date of [
    '2020-03-11',
    '2040-07-02',
    '2089-01-12',
    '1911-02-03',
    '1951-09-20',
  ]) {
    jumps.push(
      await page.evaluate(async (date) => {
        const engine = window.__spaceEngine!,
          before = engine.diagnostics().renderedFrames,
          start = performance.now();
        engine.applyMapState(
          { focus: 'dwarf:ceres', t: date + 'T00:00:00Z' },
          { transition: false },
        );
        const requested = engine.clock.state.tdbSec;
        const progress = [];
        let previous = '';
        while (performance.now() - start < 5000) {
          await new Promise<void>((done) =>
            requestAnimationFrame(() => done()),
          );
          const diagnostics = engine.diagnostics();
          const state = {
            epoch: diagnostics.renderedEpoch,
            revision: diagnostics.renderedRevision,
            sceneRevision: diagnostics.sceneRevision,
            loading: diagnostics.positionStatus
              .filter((row) => row.status === 'loading')
              .map((row) => row.id),
            earth: engine.getPositionStatus('planet:earth'),
          };
          const key = JSON.stringify(state);
          if (key !== previous) {
            previous = key;
            progress.push({
              elapsedMs: performance.now() - start,
              renderedFrames: diagnostics.renderedFrames,
              ...state,
            });
          }
          if (
            engine.getPositionStatus('planet:earth') === 'ready' &&
            engine.getPositionStatus('moon:callisto') === 'ready' &&
            diagnostics.positionStatus.every(
              (row) => row.status !== 'loading',
            ) &&
            diagnostics.renderedFrames > before &&
            diagnostics.renderedEpoch === requested &&
            diagnostics.renderedRevision === diagnostics.sceneRevision
          ) {
            return {
              date,
              durationMs: performance.now() - start,
              requested,
              actual: engine.clock.state.tdbSec,
              progress,
              diagnostics,
            };
          }
        }
        throw Error('Requested positions did not become ready: ' + date);
      }, date),
    );
  }
  await writeFile(
    info.outputPath('desktop-date-jumps.json'),
    JSON.stringify(
      {
        targetMs: 1000,
        protocol:
          '100Mbps/20Mbps/20ms, cache disabled, five distant epochs, all21 current positions required; analytics corrected, six orbital models loaded',
        peakTextureRequests,
        transfers: [...transfers.values()],
        jumps,
      },
      null,
      2,
    ),
  );
  expect(peakTextureRequests).toBeGreaterThan(0);
  expect(peakTextureRequests).toBeLessThanOrEqual(2);
  for (const jump of jumps) {
    expect(jump.durationMs).toBeLessThanOrEqual(1000);
    expect(jump.actual).toBe(jump.requested);
  }
});
test('fixed-range chunks are reused for repeated dates without more downloads', async ({
  page,
}) => {
  await page.goto('/' + query);
  await ready(page);
  await corrected(page);
  await page.evaluate(() => window.__spaceEngine!.setLayer('orbits', false));
  for (const date of ['2020-02-11', '2040-02-11']) {
    await page.evaluate(
      (date) =>
        window.__spaceEngine!.applyMapState(
          { focus: 'planet:earth', t: date + 'T00:00:00Z' },
          { transition: false },
        ),
      date,
    );
    await corrected(page);
    await expect
      .poll(() =>
        page.evaluate(() => window.__spaceEngine!.diagnostics().chunks.pending),
      )
      .toBe(0);
  }
  const requests = await page.evaluate(
    () => window.__spaceEngine!.diagnostics().chunks.requests,
  );
  await page.evaluate(() =>
    window.__spaceEngine!.applyMapState(
      { focus: 'planet:earth', t: '2020-02-11T00:00:00Z' },
      { transition: false },
    ),
  );
  await corrected(page);
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => window.__spaceEngine!.diagnostics().chunks.requests,
    ),
  ).toBe(requests);
});
test('forward and reverse one-year-per-second playback crosses prefetched boundaries without repeated loading @physical-gpu', async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await page.goto('/' + query);
  await ready(page);
  await corrected(page);
  await page.evaluate(() => {
    window.__spaceEngine!.setLayer('orbits', false);
    window.__spaceEngine!.setQuality('low');
  });
  await expect
    .poll(
      () =>
        page.evaluate(
          () => window.__spaceEngine!.diagnostics().pendingTextures,
        ),
      { timeout: 30000 },
    )
    .toBe(0);
  const runs = [];
  for (const [date, rate] of [
    ['2025-01-01', 31557600],
    ['1980-01-01', -31557600],
  ] as const) {
    await page.evaluate(
      (date) =>
        window.__spaceEngine!.applyMapState(
          { focus: 'planet:earth', t: date + 'T00:00:00Z' },
          { transition: false },
        ),
      date,
    );
    await corrected(page);
    await page.evaluate((rate) => window.__spaceEngine!.clock.play(rate), rate);
    await page.waitForTimeout(1000); // Initial lookahead acquisition is recorded separately from sustained playback.
    runs.push(
      await page.evaluate(async () => {
        const engine = window.__spaceEngine!,
          snapshots = [],
          start = performance.now();
        while (performance.now() - start < 4000) {
          await new Promise<void>((done) =>
            requestAnimationFrame(() => done()),
          );
          const epoch = engine.clock.state.tdbSec;
          snapshots.push({
            epoch,
            index: Math.floor(epoch / (28 * 86400)),
            planet: engine.getPositionStatus('planet:earth'),
            missing: [
              'dwarf:ceres',
              'moon:charon',
              'moon:triton',
              'moon:titan',
              'moon:phobos',
              'moon:deimos',
            ].filter((id) => engine.getPositionStatus(id) === 'loading'),
          });
        }
        engine.clock.pause();
        return {
          rate: engine.clock.rate,
          snapshots,
          cache: engine.diagnostics().chunks,
        };
      }),
    );
  }
  await writeFile(
    info.outputPath('fast-playback-prefetch.json'),
    JSON.stringify({ acquisitionMs: 1000, observationMs: 4000, runs }, null, 2),
  );
  for (const run of runs) {
    expect(new Set(run.snapshots.map((row) => row.index)).size).toBeGreaterThan(
      40,
    );
    expect(
      run.snapshots.every(
        (row) => row.planet === 'ready' && !row.missing.length,
      ),
    ).toBe(true);
    expect(run.cache.bytes).toBeLessThanOrEqual(8 * 1024 * 1024);
  }
});
