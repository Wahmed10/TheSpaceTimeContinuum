import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('LOD follows distance, preserves layer toggles, and draws 10k points with partial uploads', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.setScale('true');
    engine.focus('planet:earth', { transition: false });
  });
  for (const [distance, level] of [
    [30000, 3],
    [500000, 2],
    [4000000, 1],
    [30000000, 0],
  ]) {
    await page.evaluate((distance) => {
      window.__spaceEngine!.cameraController.distanceKm = distance!;
    }, distance);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            window
              .__spaceEngine!.diagnostics()
              .lod.find((e) => e.id === 'planet:earth')!.level,
        ),
      )
      .toBe(level);
  }
  await page.evaluate(() => window.__spaceEngine!.setLayer('planets', false));
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          window
            .__spaceEngine!.diagnostics()
            .lod.find((e) => e.id === 'planet:earth')!.visible,
      ),
    )
    .toBe(false);
  await page.evaluate(() => window.__spaceEngine!.setLayer('planets', true));
  const report = await page.evaluate(() =>
    window.__spaceEngine!.measurePoints(120),
  );
  await writeFile(
    'docs/perf/phase-two-points-webgl.json',
    JSON.stringify(report, null, 2),
  );
  expect(report.count).toBe(10000);
  expect(report.pointDrawCalls).toBe(1);
  expect(report.partialUploadVerified).toBe(true);
  expect(report.fps).toBeGreaterThan(0); // Software rendering is not the physical 60 FPS acceptance gate.
  expect(errors).toEqual([]);
});
