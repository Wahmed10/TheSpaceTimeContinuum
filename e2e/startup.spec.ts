import { test, expect } from '@playwright/test';
import { networkInterfaces } from 'node:os';
import type { Route } from '@playwright/test';

test('phone-sized LAN HTTP origin hydrates and starts the compatibility renderer', async ({
  page,
  baseURL,
}) => {
  const address = Object.values(networkInterfaces())
    .flat()
    .find((entry) => entry?.family === 'IPv4' && !entry.internal)?.address;
  test.skip(!address, 'No LAN interface available');
  const url = new URL(baseURL!);
  url.hostname = address!;
  url.search = '?renderer=webgl&test=1';
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /WebSocket|cross-origin/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url.href);
  expect(await page.evaluate(() => isSecureContext)).toBe(false);
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await page.getByRole('button', { name: 'Find a world' }).click();
  await expect(page.locator('.search-result')).toHaveCount(21);
  expect(errors).toEqual([]);
});

test('a stalled startup shows a recoverable error instead of an endless loader', async ({
  page,
}) => {
  const held: Route[] = [];
  await page.clock.install();
  await page.route('**/data/corrections/**', (route) => {
    held.push(route);
  });
  await page.goto('/?renderer=webgl&test=1');
  await expect.poll(() => held.length).toBeGreaterThan(0);
  await page.clock.fastForward(60001);
  await expect(page.locator('.error-panel[role="alert"]')).toContainText(
    'took too long',
  );
  await expect(page.locator('.loading-screen')).toHaveCount(0);
  await Promise.all(held.map((route) => route.abort()));
  await expect(page.locator('.error-panel[role="alert"]')).toContainText(
    'took too long',
  );
  expect(await page.evaluate(() => window.__spaceEngine)).toBeUndefined();
});
