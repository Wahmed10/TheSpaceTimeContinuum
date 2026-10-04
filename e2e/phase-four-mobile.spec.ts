import { expect, test } from '@playwright/test';
import { openTime, closeTime, openSettings } from './helpers/consumerControls';
const query = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z&layers=';
for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
])
  test.describe(`consumer mobile ${viewport.width}x${viewport.height}`, () => {
    test.use({
      viewport,
      isMobile: true,
      hasTouch: true,
      actionTimeout: 10000,
    });
    test('six controls, search viewport resize and card snaps preserve reachable time and focus', async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/' + query);
      await expect(page.locator('canvas')).toHaveAttribute(
        'data-ready',
        'true',
        { timeout: 60000 },
      );
      await expect(page.getByRole('button')).toHaveCount(6);
      for (const button of await page.getByRole('button').all()) {
        const box = await button.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      await page
        .getByRole('button', { name: 'Find a world', exact: true })
        .tap();
      const search = page.getByRole('dialog', {
        name: 'Find a world',
        exact: true,
      });
      await page.getByPlaceholder('Where would you like to go?').fill('Earth');
      await page.setViewportSize({ width: viewport.width, height: 350 });
      const searchBox = await search.boundingBox();
      expect(searchBox!.y).toBeGreaterThanOrEqual(0);
      expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(350);
      await search
        .getByRole('button', { name: 'Close search', exact: true })
        .tap();
      await expect(
        page.getByRole('button', { name: 'Find a world', exact: true }),
      ).toBeFocused();
      await page.setViewportSize(viewport);
      await page
        .getByRole('button', { name: 'Find a world', exact: true })
        .tap();
      await page.getByPlaceholder('Where would you like to go?').fill('Earth');
      await page.getByRole('option').first().tap();
      const card = page.getByRole('complementary', {
        name: 'Earth details',
        exact: true,
      });
      await expect(card).toBeVisible();
      for (const snap of ['Full', 'Peek', 'Half']) {
        await card.getByRole('button', { name: snap, exact: true }).tap();
        await expect(card).toHaveAttribute('data-snap', snap.toLowerCase());
        await expect
          .poll(async () => {
            const sheet = await card.boundingBox(),
              bar = await page.locator('.time-bar').boundingBox();
            return (
              bar!.y + bar!.height < sheet!.y &&
              bar!.y >= 72 &&
              sheet!.y + sheet!.height <= viewport.height
            );
          })
          .toBe(true);
        await page
          .getByRole('button', { name: 'Choose simulation date', exact: true })
          .tap();
        await expect(page.locator('.time-panel')).toBeVisible();
        await closeTime(page);
      }
      await page.screenshot({
        path: info.outputPath('mobile-time-above-sheet.png'),
      });
      await page.setViewportSize({
        width: viewport.height,
        height: viewport.width,
      });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await card.getByRole('button', { name: 'Close object card' }).tap();
      await expect(
        page.getByRole('button', { name: 'Find a world', exact: true }),
      ).toBeFocused();
      await openSettings(page);
      const settings = page.locator('.settings-popover');
      const settingsBox = await settings.boundingBox();
      expect(settingsBox!.x).toBeGreaterThanOrEqual(0);
      expect(settingsBox!.y).toBeGreaterThanOrEqual(0);
      expect(settingsBox!.x + settingsBox!.width).toBeLessThanOrEqual(
        viewport.height,
      );
      await settings
        .getByRole('button', { name: 'Close settings', exact: true })
        .tap();
      await expect(
        page.getByRole('button', { name: 'Settings', exact: true }),
      ).toBeFocused();
      await openTime(page);
      await expect(page.getByLabel('Simulation date in UTC')).toHaveValue(
        '2026-10-02T12:00',
      );
      await closeTime(page);
      expect(errors).toEqual([]);
    });
  });
