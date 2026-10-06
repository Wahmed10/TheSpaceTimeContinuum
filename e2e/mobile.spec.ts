import { test, expect } from '@playwright/test';
import { openTime, closeTime } from './helpers/consumerControls';
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
test('touch layout, search, layers, and timeline remain operable', async ({
  page,
}) => {
  await page.goto('/?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await expect(page.locator('.error-panel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Find a world' }).tap();
  await expect(page.locator('.search-result')).toHaveCount(8);
  await page.locator('.search-result').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.search-result').last()).toBeInViewport();
  await page.getByPlaceholder('Where would you like to go?').fill('Moon');
  await page.locator('.search-result[data-entity-id="moon:moon"]').tap();
  await expect(
    page.getByRole('heading', { name: 'Moon', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(6500);
  const focused = await page.evaluate(() =>
    window.__spaceEngine?.diagnostics(),
  );
  expect(focused?.selected).toBe('moon:moon');
  expect(focused?.focusScreen?.x).toBeCloseTo(195, 0);
  expect(focused?.focusScreen?.y).toBeCloseTo(422, 0);
  await page.screenshot({ path: 'docs/perf/screens/moon-mobile-webgl.png' });
  await page.getByRole('button', { name: 'Close object card' }).tap();
  await page.getByRole('button', { name: 'Layers', exact: true }).tap();
  await page.getByLabel('Orbital paths').uncheck();
  await page.keyboard.press('Escape');
  await openTime(page);
  await page.getByRole('button', { name: 'LIVE', exact: true }).tap();
  await closeTime(page);
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.error-panel')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await expect(page.locator('canvas')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/perf/screens/mobile-webgl.png' });
});
