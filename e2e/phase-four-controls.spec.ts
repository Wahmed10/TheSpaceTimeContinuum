import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  openSettings,
  closeSettings,
  openTime,
} from './helpers/consumerControls';
const query = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z';
const ready = (page: Page) =>
  expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
const settingsKey = 'continuum.settings.v1';
test.use({ actionTimeout: 30000 });
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const found: string[] = [];
  errors.set(page, found);
  page.on('pageerror', (e) => found.push(e.message));
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));

test('the default shell has exactly six controls and an honest closed events drawer', async ({
  page,
}, info) => {
  await page.goto('/' + query);
  await ready(page);
  const names = await page
    .getByRole('button')
    .evaluateAll((elements) =>
      elements.map(
        (e) => e.getAttribute('aria-label') ?? e.textContent?.trim(),
      ),
    );
  expect(names.sort()).toEqual(
    [
      'Choose simulation date',
      'Find a world',
      'Happening now',
      'Layers',
      'Play',
      'Settings',
    ].sort(),
  );
  await expect(page.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('six-control-default.png') });
  const trigger = page.getByRole('button', {
    name: 'Happening now',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Space');
  const drawer = page.getByRole('dialog', {
    name: 'Happening now',
    exact: true,
  });
  await expect(drawer).toContainText(
    'Events are not available yet. Explore the catalog or choose a date to travel through time.',
  );
  expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
    'paused',
  );
  await expect(drawer.locator('a')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('honest-happening-now.png') });
  await drawer.getByRole('button', { name: 'Close happening now' }).click();
  await expect(trigger).toBeFocused();
  await openSettings(page);
  await page.getByRole('button', { name: 'Field guide', exact: true }).click();
  const guide = page.getByRole('dialog', {
    name: 'Your field guide',
    exact: true,
  });
  await expect(guide).toContainText('21-world catalog');
  await guide.getByRole('button', { name: 'Ready to explore' }).focus();
  await page.keyboard.press('Space');
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
    'paused',
  );
});

test('all layer controls distinguish requested, loaded, visible and unavailable states and restore URL requests', async ({
  page,
}, info) => {
  await page.goto('/' + query + '&view=wide');
  await ready(page);
  const length = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  const states = await page.evaluate(() =>
    window.__spaceEngine!.getLayerStates(),
  );
  expect(states).toHaveLength(12);
  for (const state of states) {
    const input = page.getByRole('checkbox', {
      name: state.label,
      exact: true,
    });
    await expect(input).toBeChecked({ checked: state.requested });
    if (state.available) await expect(input).toBeEnabled();
    else await expect(input).toBeDisabled();
    const status = !state.available
      ? 'Unavailable'
      : !state.requested
        ? 'Hidden'
        : !state.loaded
          ? 'Loading'
          : state.visible
            ? 'Visible'
            : 'Enabled; hidden at this distance';
    await expect(
      input.locator('..').locator('..').locator('.layer-state'),
    ).toHaveText(status);
  }
  await page.getByRole('checkbox', { name: 'Planets', exact: true }).uncheck();
  await expect
    .poll(() =>
      new URL(page.url()).searchParams
        .get('layers')
        ?.split(',')
        .includes('planets'),
    )
    .toBe(false);
  expect(await page.evaluate(() => history.length)).toBe(length);
  await page.screenshot({
    path: info.outputPath('requested-and-unavailable-layers.png'),
  });
  await page.reload();
  await ready(page);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Planets', exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'Space stations', exact: true }),
  ).toBeDisabled();
});

test('validated preferences persist while semantic URL settings retain ownership', async ({
  page,
}, info) => {
  await page.addInitScript(
    ({ key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            distanceUnit: 'mi',
            quality: 'low',
            reducedMotion: 'on',
            layers: [],
            scale: 'explore',
            frame: 'FIXED:earth',
          }),
        );
    },
    { key: settingsKey },
  );
  await page.goto(
    '/object/planet/mars' + query + '&scale=true&layers=moons&frame=helio',
  );
  await ready(page);
  await openSettings(page);
  await expect(
    page.getByRole('combobox', { name: 'Distances', exact: true }),
  ).toHaveValue('mi');
  await expect(
    page.getByRole('combobox', { name: 'Graphics', exact: true }),
  ).toHaveValue('low');
  await expect(
    page.getByRole('combobox', { name: 'Reduced motion', exact: true }),
  ).toHaveValue('on');
  await expect(page.locator('.quality-state')).toContainText(
    'Requested: low. Active tier: low.',
  );
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMapState()),
  ).toMatchObject({ scale: 'true', layers: ['moons'], frame: 'ICRF_HELIO' });
  await page
    .getByRole('combobox', { name: 'Distances', exact: true })
    .selectOption('AU');
  await page
    .getByRole('combobox', { name: 'Graphics', exact: true })
    .selectOption('auto');
  await page
    .getByRole('combobox', { name: 'Reduced motion', exact: true })
    .selectOption('off');
  await expect(page.locator('.quality-state')).toContainText(
    /Requested: auto\. Active tier: (low|medium|high|ultra)\./,
  );
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      settingsKey,
    ),
  ).toEqual({
    version: 1,
    distanceUnit: 'AU',
    quality: 'auto',
    reducedMotion: 'off',
  });
  await page.screenshot({
    path: info.outputPath('persisted-settings-and-active-tier.png'),
  });
  await page.reload();
  await ready(page);
  await openSettings(page);
  await expect(
    page.getByRole('combobox', { name: 'Distances', exact: true }),
  ).toHaveValue('AU');
  await expect(
    page.getByRole('combobox', { name: 'Reduced motion', exact: true }),
  ).toHaveValue('off');
  await expect(
    page.getByRole('combobox', { name: 'Reference frame', exact: true }),
  ).toHaveValue('ICRF_HELIO');
});

test('blocked storage leaves controls usable in memory and reload uses defaults', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    }),
  );
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  await openSettings(page);
  await expect(
    page.getByRole('combobox', { name: 'Distances', exact: true }),
  ).toHaveValue('km');
  await page
    .getByRole('combobox', { name: 'Distances', exact: true })
    .selectOption('mi');
  await closeSettings(page);
  await expect(page.getByTestId('metric-diameter')).toContainText('mi');
  await page.reload();
  await ready(page);
  await openSettings(page);
  await expect(
    page.getByRole('combobox', { name: 'Distances', exact: true }),
  ).toHaveValue('km');
});

test('corrupt stored preferences recover to the validated defaults', async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, '{invalid'),
    settingsKey,
  );
  await page.goto('/' + query);
  await ready(page);
  await openSettings(page);
  for (const [name, value] of [
    ['Distances', 'km'],
    ['Graphics', 'auto'],
    ['Reduced motion', 'system'],
  ])
    await expect(page.getByRole('combobox', { name, exact: true })).toHaveValue(
      value!,
    );
});

test('system motion changes and explicit overrides govern the real LIVE transition', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute(
    'data-reduced-motion',
    'false',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute(
    'data-reduced-motion',
    'true',
  );
  await openSettings(page);
  await page
    .getByRole('combobox', { name: 'Reduced motion', exact: true })
    .selectOption('off');
  await expect(page.locator('html')).toHaveAttribute(
    'data-reduced-motion',
    'false',
  );
  await closeSettings(page);
  await openTime(page);
  await page.getByLabel('Simulation date in UTC').fill('2000-01-01T00:00');
  const fade = await page
    .getByRole('button', { name: 'LIVE', exact: true })
    .evaluate((element) => {
      (element as HTMLButtonElement).click();
      const clock = window.__spaceEngine!.clock;
      clock.tick(Date.now() + 200);
      return { ...clock.state };
    });
  expect(fade.mode).toBe('playing');
  expect(fade.fade).toBeGreaterThan(0.9);
  await page.evaluate(() =>
    window.__spaceEngine!.clock.tick(Date.now() + 1200),
  );
  await expect
    .poll(() => page.evaluate(() => window.__spaceEngine!.clock.mode))
    .toBe('live');
  await openSettings(page);
  await page
    .getByRole('combobox', { name: 'Reduced motion', exact: true })
    .selectOption('on');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute(
    'data-reduced-motion',
    'true',
  );
  await closeSettings(page);
  await openTime(page);
  await page.getByLabel('Simulation date in UTC').fill('2000-01-01T00:00');
  const instant = await page
    .getByRole('button', { name: 'LIVE', exact: true })
    .evaluate((element) => {
      (element as HTMLButtonElement).click();
      return { ...window.__spaceEngine!.clock.state };
    });
  expect(instant.mode).toBe('live');
  expect(instant.fade).toBe(0);
  await expect
    .poll(() => new URL(page.url()).searchParams.has('t'))
    .toBe(false);
});

for (const timezoneId of ['America/Toronto', 'Asia/Tokyo'])
  test.describe(`UTC controls in ${timezoneId}`, () => {
    test.use({ timezoneId });
    test('all speed signs, UTC date bounds and a retained clamp notice are coherent', async ({
      page,
    }, info) => {
      await page.goto('/object/planet/earth' + query);
      await ready(page);
      await openTime(page);
      const date = page.getByLabel('Simulation date in UTC');
      await date.fill('2000-01-02T03:04');
      expect(
        await page.evaluate(() => window.__spaceEngine!.getMapState().t),
      ).toBe('2000-01-02T03:04:00.000Z');
      await expect(date).toHaveAttribute('min', '1900-01-01T00:00');
      await expect(date).toHaveAttribute('max', '2100-12-31T23:59');
      for (const sign of [1, -1]) {
        if (sign < 0)
          await page
            .getByRole('button', { name: 'Reverse time', exact: true })
            .click();
        for (const speed of [1, 10, 60, 100, 3600, 86400, 2629800, 31557600]) {
          await page
            .getByRole('combobox', { name: 'Playback speed', exact: true })
            .selectOption(String(speed));
          expect(
            await page.evaluate(() => window.__spaceEngine!.clock.rate),
          ).toBe(sign * speed);
        }
      }
      await date.fill('1900-01-01T00:00');
      await expect(page.locator('.time-panel').getByRole('status')).toHaveCount(
        0,
      );
      await page
        .getByRole('combobox', { name: 'Playback speed', exact: true })
        .selectOption('31557600');
      await page.evaluate(() =>
        window.__spaceEngine!.clock.tick(Date.now() + 1000),
      );
      await expect(
        page.locator('.time-panel').getByRole('status'),
      ).toContainText('supported date boundary and paused');
      await page.evaluate(() => window.__spaceEngine!.clock.tick());
      await expect
        .poll(() =>
          page.evaluate(() => window.__spaceEngine!.clock.state.clamped),
        )
        .toBe(false);
      await expect(
        page.locator('.time-panel').getByRole('status'),
      ).toContainText('supported date boundary and paused');
      expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
        'paused',
      );
      const bounded = await page.evaluate(
        () => window.__spaceEngine!.getMapState().t,
      );
      await date.fill('1899-12-31T23:59');
      await expect(date).toHaveAttribute('aria-invalid', 'true');
      expect(
        await page.evaluate(() => window.__spaceEngine!.getMapState().t),
      ).toBe(bounded);
      await date.fill('2100-12-31T23:59');
      await expect(date).toHaveAttribute('aria-invalid', 'false');
      expect(
        await page.evaluate(() => window.__spaceEngine!.getMapState().t),
      ).toBe('2100-12-31T23:59:00.000Z');
      await expect(page.locator('.time-panel').getByRole('status')).toHaveCount(
        0,
      );
      await page.screenshot({ path: info.outputPath('utc-time-controls.png') });
    });
  });
