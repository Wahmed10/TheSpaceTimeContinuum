import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import bodies from '../packages/domain/data/bodies.json' with { type: 'json' };

test('the original device benchmark retains its five views', async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto('/lab/poc?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  const report = await page.evaluate(async () => {
    window.__spaceEngine!.setQuality('low');
    return window.__spaceEngine!.benchmark();
  });
  expect(report.phase).toBe('phase-one');
  expect(report.results.map((row) => row.view)).toEqual([
    'Solar System',
    'Earth close',
    'Earth LEO',
    'Moon close',
    'Mars close',
  ]);
  expect(
    report.results.every((row) => row.samples > 0 && row.pendingTextures === 0),
  ).toBe(true);
});

test('Phase 3 device report measures all bodies and ring views and restores settings', async ({
  page,
}, testInfo) => {
  test.setTimeout(660000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
    if (
      /GPUValidationError|Invalid Texture|multiple-of-four/.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto('/lab/poc?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  const saved = await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.setQuality('low');
    engine.setLayer('moons', false);
    engine.focus('planet:earth', { transition: false });
    engine.clock.play(10);
    return engine.getMapState();
  });
  const downloadPromise = page.waitForEvent('download', { timeout: 600000 });
  await page.getByRole('button', { name: 'Run Phase 3 device checks' }).click();
  await expect(
    page.getByRole('button', { name: 'Run Phase 3 device checks' }),
  ).toBeDisabled();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^phase-three-webgl2-\d+\.json$/,
  );
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
  await writeFile(
    testInfo.outputPath('device-software.json'),
    JSON.stringify(report, null, 2),
  );
  const { benchmark, precision } = report;
  expect(benchmark.phase).toBe('phase-three');
  expect(benchmark.softwareRenderer).toBe(true);
  expect(benchmark.results).toHaveLength(24);
  expect(
    benchmark.results
      .filter((row: { ringSide: string | null }) => !row.ringSide)
      .map((row: { bodyId: string }) => row.bodyId)
      .sort(),
  ).toEqual(bodies.map((body) => body.id).sort());
  expect(
    benchmark.results
      .filter((row: { ringSide: string | null }) => row.ringSide)
      .map((row: { ringSide: string }) => row.ringSide),
  ).toEqual(['north', 'south', 'edge']);
  for (const row of benchmark.results) {
    expect(row.samples, row.view).toBeGreaterThanOrEqual(30);
    expect(row.pendingTextures, row.view).toBe(0);
    expect(row.tier, row.view).toBe('low');
    expect(row.fps, row.view).toBeGreaterThan(0);
    expect(row.drawCalls, row.view).toBeGreaterThan(0);
    expect(
      row.orientations.find((body: { id: string }) => body.id === row.bodyId)
        .rendered,
      row.view,
    ).toBe(true);
    if (row.ringSide) expect(row.rings[0].visible, row.view).toBe(true);
  }
  expect(precision.samples).toBe(600);
  expect(precision.pass).toBe(true);
  await expect(page.locator('aside [role="status"]')).toContainText(
    'Report downloaded',
  );
  await expect(
    page.getByRole('button', { name: 'Run Phase 3 device checks' }),
  ).toBeEnabled();
  const restored = await page.evaluate(() => ({
    state: window.__spaceEngine!.getMapState(),
    mode: window.__spaceEngine!.clock.mode,
    rate: window.__spaceEngine!.clock.rate,
    tier: window.__spaceEngine!.diagnostics().tier,
  }));
  expect(restored.state.focus).toBe(saved.focus);
  expect(restored.state.scale).toBe(saved.scale);
  expect(restored.state.layers).toEqual(saved.layers);
  expect(restored.mode).toBe('playing');
  expect(restored.rate).toBe(10);
  expect(restored.tier).toBe('low');
  expect(errors).toEqual([]);
});
