import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
test('GPU readback keeps a LEO surface marker below half a pixel', async ({
  page,
}) => {
  await page.goto('/lab/precision?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  const result = await page.evaluate(() =>
    window.__spaceEngine!.measurePrecision(600),
  );
  await writeFile(
    'docs/perf/precision-webgl.json',
    JSON.stringify(result, null, 2),
  );
  expect(result.maxErrorPx).toBeLessThan(0.5);
  expect(result.depthResults.every((result) => result.pass)).toBe(true);
});
test('LOW stays below the texture budget after twenty focus changes', async ({
  page,
}) => {
  await page.goto('/lab/poc?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => window.__spaceEngine!.setQuality('low'));
  await expect
    .poll(() =>
      page.evaluate(() => window.__spaceEngine!.diagnostics().pendingTextures),
    )
    .toBe(0);
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() => window.__spaceEngine!.diagnostics());
  for (let i = 0; i < 20; i++) {
    await page.evaluate(
      (id) => window.__spaceEngine!.focus(id, { transition: false }),
      ['planet:earth', 'moon:moon', 'planet:mars', 'star:sun'][i % 4]!,
    );
    await page.waitForTimeout(50);
  }
  const after = await page.evaluate(() => window.__spaceEngine!.diagnostics());
  expect(after.textureCount).toBe(before.textureCount);
  expect(after.gpuBytes).toBeLessThanOrEqual(128 * 1024 * 1024);
  await writeFile(
    'docs/perf/texture-stability.json',
    JSON.stringify({ focusChanges: 20, before, after }, null, 2),
  );
});
