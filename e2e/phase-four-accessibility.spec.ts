import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { incompleteContrast } from './helpers/consumerContrast';
import {
  closeSettings,
  closeTime,
  openSettings,
  openTime,
} from './helpers/consumerControls';

const query = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z';
const ready = (page: Page) =>
  expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
const issues = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  issues.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(issues.get(page)).toEqual([]);
});

for (const profile of ['desktop', 'phone'] as const) {
  test.describe(profile, () => {
    test.use(
      profile === 'phone'
        ? {
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
          }
        : { viewport: { width: 1440, height: 1000 } },
    );
    for (const state of [
      'default',
      'search',
      'card',
      'time',
      'settings',
      'layers',
      'list',
    ] as const) {
      test(`axe ${state}: complete actual open page has no serious or WCAG A/AA violations`, async ({
        page,
      }, info) => {
        test.setTimeout(150000);
        await page.goto(
          (state === 'card' ? '/object/moon/charon' : '/') + query,
        );
        await ready(page);
        if (state === 'search') {
          await page
            .getByRole('button', { name: 'Find a world', exact: true })
            .click();
          const input = page.getByRole('combobox', { name: 'Find a world' });
          await input.fill('Earth');
          const active = await input.getAttribute('aria-activedescendant');
          expect(active).toBeTruthy();
          await expect(page.locator(`[id="${active}"]`)).toHaveAttribute(
            'aria-selected',
            'true',
          );
        } else if (state === 'card') {
          if (profile === 'phone')
            await page
              .getByRole('button', { name: 'Full', exact: true })
              .click();
          await page
            .getByRole('button', { name: 'More about this world' })
            .click();
          await expect(page.locator('.source-details')).toBeVisible();
        } else if (state === 'time') await openTime(page);
        else if (state === 'settings') await openSettings(page);
        else if (state === 'layers')
          await page
            .getByRole('button', { name: 'Layers', exact: true })
            .click();
        else if (state === 'list') {
          await openSettings(page);
          await page
            .getByRole('button', { name: 'Objects in view', exact: true })
            .click();
          await expect(
            page.getByRole('dialog', { name: 'Objects in view' }),
          ).toBeVisible();
          await expect(
            page.locator('.object-list-choice').first(),
          ).toBeVisible();
        }
        const controlTargets = [];
        for (const trigger of await page
          .locator('[aria-haspopup="dialog"][aria-expanded="true"]')
          .all()) {
          const id = await trigger.getAttribute('aria-controls');
          expect(id).toBeTruthy();
          const content = page.locator(`[id="${id}"]`);
          await expect(content).toHaveCount(1);
          await expect(content).toHaveAttribute('role', 'dialog');
          await expect(content).toBeVisible();
          expect(
            (await content.getAttribute('aria-label')) ||
              (await content.getAttribute('aria-labelledby')),
          ).toBeTruthy();
          controlTargets.push({ id, role: 'dialog', visible: true });
        }
        // Whole page, all rules, no blanket exclusions. Keep incomplete checks too.
        const scan = await new AxeBuilder({ page }).analyze();
        const contrastTargets = scan.incomplete
          .filter((v) => v.id === 'color-contrast')
          .flatMap((v) =>
            v.nodes.map((node) => {
              expect(node.target).toHaveLength(1);
              expect(typeof node.target[0]).toBe('string');
              return node.target[0] as string;
            }),
          );
        const contrast = await incompleteContrast(page, contrastTargets);
        const file = info.outputPath(`axe-${profile}-${state}.json`);
        await writeFile(
          file,
          JSON.stringify(
            { profile, state, url: page.url(), scan, controlTargets, contrast },
            null,
            2,
          ),
        );
        await info.attach('axe-full-result', {
          path: file,
          contentType: 'application/json',
        });
        const blocking = scan.violations.filter(
          (v) =>
            v.impact === 'critical' ||
            v.impact === 'serious' ||
            v.tags.some((tag) => /^wcag(?:2|21|22)(?:a|aa)$/.test(tag)),
        );
        expect(
          blocking.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              failure: n.failureSummary,
            })),
          })),
        ).toEqual([]);
        expect(
          contrast.filter(
            (item) => !item.resolved || item.ratio < item.minimum,
          ),
        ).toEqual([]);
        expect(scan.violations.filter((v) => v.id === 'heading-order')).toEqual(
          [],
        );
        await page.screenshot({
          path: info.outputPath(`accessible-${profile}-${state}.png`),
        });
      });
    }

    test('keyboard-only search, selection, card, time, layers, settings and list retain native keys and focus', async ({
      page,
    }, info) => {
      test.setTimeout(150000);
      await page.goto('/' + query);
      await ready(page);
      const canvas = page.locator('canvas');
      await canvas.focus();
      await page.keyboard.press('/');
      const input = page.getByRole('combobox', { name: 'Find a world' });
      await expect(input).toBeFocused();
      await input.fill('Ea');
      // Axe marks background focus guards as needing review. Native forward and
      // reverse traversal must stay inside the actual modal, never on the map.
      const traversal = [];
      for (const key of [
        ...Array<string>(8).fill('Tab'),
        ...Array<string>(8).fill('Shift+Tab'),
      ]) {
        await page.keyboard.press(key);
        const focus = await page.locator('.search-dialog').evaluate((el) => ({
          inside: el.contains(document.activeElement),
          tag: document.activeElement?.tagName,
          label: document.activeElement?.getAttribute('aria-label'),
        }));
        expect(focus.inside).toBe(true);
        traversal.push({ key, ...focus });
      }
      await expect(input).toBeFocused();
      await expect(input).toHaveValue('Ea');
      const selectedOnReturn = await input.evaluate((el: HTMLInputElement) => [
        el.selectionStart,
        el.selectionEnd,
      ]);
      // Radix loops back with select:true. Collapse that normal input selection
      // using a native caret key before checking that Space appends to the query.
      await page.keyboard.press('ArrowRight');
      const caret = await input.evaluate((el: HTMLInputElement) => [
        el.selectionStart,
        el.selectionEnd,
      ]);
      expect(caret).toEqual([2, 2]);
      await writeFile(
        info.outputPath('modal-keyboard-review.json'),
        JSON.stringify(
          {
            profile,
            traversal,
            selectedOnReturn,
            nativeCaretKey: 'ArrowRight',
            caret,
          },
          null,
          2,
        ),
      );
      await page.keyboard.press('Space');
      await expect(input).toHaveValue('Ea ');
      await page.keyboard.press('Backspace');
      await expect(input).toHaveValue('Ea');
      expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
        'paused',
      );
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/object\/planet\/earth/);
      await expect(page.locator('span[aria-live="polite"]')).toContainText(
        'Selected Earth',
      );
      const card = page.getByRole('complementary', { name: 'Earth details' });
      const more = card.getByRole('button', { name: 'More about this world' });
      // Tab to the disclosure, using the actual browser order, including mobile snaps.
      for (
        let i = 0;
        i < 30 && !(await more.evaluate((el) => el === document.activeElement));
        i++
      )
        await page.keyboard.press('Tab');
      await expect(more).toBeFocused();
      await page.keyboard.press('Space');
      await expect(
        card.getByRole('button', { name: 'Less about this world' }),
      ).toBeFocused();
      expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
        'paused',
      );
      await page.keyboard.press('Escape');
      await expect(card).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Find a world', exact: true }),
      ).toBeFocused();
      const date = page.getByRole('button', {
        name: 'Choose simulation date',
        exact: true,
      });
      for (
        let i = 0;
        i < 12 && !(await date.evaluate((el) => el === document.activeElement));
        i++
      )
        await page.keyboard.press('Tab');
      await expect(date).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('.time-panel')).toBeVisible();
      const utc = page.getByLabel('Simulation date in UTC');
      for (
        let i = 0;
        i < 8 && !(await utc.evaluate((el) => el === document.activeElement));
        i++
      )
        await page.keyboard.press('Tab');
      await expect(utc).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(date).toBeFocused();
      await page.keyboard.press('Tab'); // Wrap to the map, then Search / Layers.
      const layers = page.getByRole('button', { name: 'Layers', exact: true });
      for (
        let i = 0;
        i < 12 &&
        !(await layers.evaluate((el) => el === document.activeElement));
        i++
      )
        await page.keyboard.press('Tab');
      await expect(layers).toBeFocused();
      await page.keyboard.press('Space');
      await expect(page.locator('.layers-popover')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(layers).toBeFocused();
      await page.keyboard.press('Tab');
      const settings = page.getByRole('button', {
        name: 'Settings',
        exact: true,
      });
      await expect(settings).toBeFocused();
      await page.keyboard.press('Enter');
      const objects = page.getByRole('button', {
        name: 'Objects in view',
        exact: true,
      });
      for (
        let i = 0;
        i < 20 &&
        !(await objects.evaluate((el) => el === document.activeElement));
        i++
      )
        await page.keyboard.press('Tab');
      await expect(objects).toBeFocused();
      await page.keyboard.press('Space');
      await expect(
        page.getByRole('dialog', { name: 'Objects in view' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(settings).toBeFocused();
      const play = page.getByRole('button', { name: 'Play', exact: true });
      await play.focus();
      await page.keyboard.press('Space');
      await expect(
        page.getByRole('button', { name: 'Pause', exact: true }),
      ).toBeFocused();
      expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
        'playing',
      );
      await page.keyboard.press('Enter');
      expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
        'paused',
      );
    });
  });
}

test('open panels, IME and browser modifiers protect page and canvas shortcuts; help returns focus', async ({
  page,
}) => {
  await page.goto('/' + query);
  await ready(page);
  const canvas = page.locator('canvas');
  await canvas.focus();
  const pose = await page.evaluate(
    () => window.__spaceEngine!.cameraController.azimuthRad,
  );
  await page.keyboard.press('Control+ArrowRight');
  expect(
    await page.evaluate(
      () => window.__spaceEngine!.cameraController.azimuthRad,
    ),
  ).toBe(pose);
  await canvas.dispatchEvent('keydown', {
    key: 'ArrowRight',
    isComposing: true,
  });
  expect(
    await page.evaluate(
      () => window.__spaceEngine!.cameraController.azimuthRad,
    ),
  ).toBe(pose);
  await canvas.dispatchEvent('keydown', { key: ' ', isComposing: true });
  expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
    'paused',
  );
  await page.keyboard.press('?');
  await expect(
    page.getByRole('dialog', { name: 'Your field guide' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Objects in view');
  await page.keyboard.press('Escape');
  await expect(canvas).toBeFocused();
  await openTime(page);
  // Deliberately target the page listener without moving focus outside Radix's
  // popover (which normally dismisses it). Native panel traversal is tested above.
  for (const key of [' ', 'o', '/', 'l', 'Backspace']) {
    await page.locator('body').dispatchEvent('keydown', { key });
    await expect(page.locator('.time-panel')).toBeVisible();
  }
  expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
    'paused',
  );
  await expect(page.locator('.objects-in-view')).toHaveCount(0);
  await expect(page.locator('.search-dialog')).toHaveCount(0);
  await closeTime(page);
  await openSettings(page);
  const reduced = page.getByRole('combobox', {
    name: 'Reduced motion',
    exact: true,
  });
  await reduced.selectOption('on');
  await closeSettings(page);
  await canvas.focus();
  await page.keyboard.press('o');
  await expect(
    page.getByRole('dialog', { name: 'Objects in view' }),
  ).toBeVisible();
  expect(
    await page
      .locator('.object-list-choice')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toMatch(/^0s(?:, 0s)*$/);
  await page.keyboard.press('Escape');
  await expect(canvas).toBeFocused();
});
