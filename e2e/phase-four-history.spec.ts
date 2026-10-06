import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import {
  openSettings,
  openTime,
  closeTime,
  toggleScale,
  expectScale,
} from './helpers/consumerControls';

test.use({ timezoneId: 'America/Toronto', actionTimeout: 30000 });
const query = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z';
const ready = (page: Page) =>
  expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
const actual = (page: Page) =>
  page.evaluate(() => {
    const engine = window.__spaceEngine!;
    return {
      ...engine.getMapState(),
      mode: engine.clock.mode,
      focusedId: engine.focusedId,
      selected: engine.diagnostics().selected,
    };
  });
async function choose(page: Page, name: string) {
  await page.getByRole('button', { name: 'Find a world', exact: true }).click();
  await page.getByPlaceholder('Where would you like to go?').fill(name);
  await page.locator('.search-result').click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on('pageerror', (error) => collected.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test('Back and Forward restore settings and UTC controls, flushing the previous entry before selection', async ({
  page,
}, info) => {
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  const length = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  for (const name of ['Planets', 'Moons', 'Dwarf planets', 'Orbital paths'])
    await page.getByLabel(name, { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await toggleScale(page, 'Explore');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByLabel('Reference frame', { exact: true })
    .selectOption('FIXED:earth');
  await page.getByLabel('View preset', { exact: true }).selectOption('wide');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openTime(page);
  await page.getByLabel('Simulation date in UTC').fill('2027-03-04T15:06');
  await closeTime(page);
  await choose(page, 'Mars');
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await choose(page, 'Europa');
  await expect(page).toHaveURL(/\/object\/moon\/europa\?/);
  expect(await page.evaluate(() => history.length)).toBe(length + 2);
  await page.goBack();
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await expect
    .poll(() => actual(page))
    .toMatchObject({
      focus: 'planet:mars',
      frame: 'FIXED:earth',
      scale: 'true',
      layers: [],
      camera: { preset: 'close' },
      mode: 'paused',
    });
  await page.goBack();
  await expect(page).toHaveURL(/\/object\/planet\/earth\?/);
  await expect
    .poll(() => actual(page))
    .toMatchObject({
      focus: 'planet:earth',
      frame: 'FIXED:earth',
      scale: 'true',
      layers: [],
      camera: { preset: 'wide' },
      mode: 'paused',
    });
  await openTime(page);
  await expect(page.getByLabel('Simulation date in UTC')).toHaveValue(
    '2027-03-04T15:06',
  );
  await closeTime(page);
  expect(
    Math.abs(
      Date.parse((await actual(page)).t!) - Date.parse('2027-03-04T15:06:00Z'),
    ),
  ).toBeLessThanOrEqual(1);
  await expectScale(page, 'True');
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  for (const name of ['Planets', 'Moons', 'Dwarf planets', 'Orbital paths'])
    await expect(page.getByLabel(name, { exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Layers', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Reference frame', { exact: true })).toHaveValue(
    'FIXED:earth',
  );
  await expect(page.getByLabel('View preset', { exact: true })).toHaveValue(
    'wide',
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.screenshot({
    path: info.outputPath('history-restored-empty-layers.png'),
  });
  await page.goForward();
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await expect
    .poll(() => actual(page))
    .toMatchObject({
      focus: 'planet:mars',
      layers: [],
      camera: { preset: 'close' },
    });
  await page.goForward();
  await expect(page).toHaveURL(/\/object\/moon\/europa\?/);
  await expect
    .poll(() => actual(page))
    .toMatchObject({ focus: 'moon:europa', layers: [] });
});

test('Back cancels an outstanding query replacement instead of corrupting the restored entry', async ({
  page,
}) => {
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  await choose(page, 'Mars');
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await toggleScale(page, 'Explore');
  await page.goBack();
  await expect(page).toHaveURL(/\/object\/planet\/earth\?/);
  const restored = page.url();
  // Deliberately exceed the documented debounce to exercise cancellation.
  await page.waitForTimeout(750);
  expect(page.url()).toBe(restored);
  await expect
    .poll(() => actual(page))
    .toMatchObject({ focus: 'planet:earth', scale: 'explore' });
  await expectScale(page, 'Explore');
});

test('accelerated playback and free camera gestures do not write URLs; share captures time and reloads paused', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          Object.assign(window, { __copiedView: text });
        },
      },
    }),
  );
  await page.goto('/object/planet/earth' + query + '&perf=1');
  await ready(page);
  const length = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    const writes: { mode: string; href: string; nextInternal: boolean }[] = [];
    Object.assign(window, { __timeWrites: writes });
    for (const name of ['pushState', 'replaceState'] as const) {
      const original = history[name].bind(history);
      history[name] = (data, unused, url) => {
        writes.push({
          mode: name,
          href: String(url),
          nextInternal: data?.__NA === true,
        });
        return original(data, unused, url);
      };
    }
  });
  const writes = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __timeWrites: {
              mode: string;
              href: string;
              nextInternal: boolean;
            }[];
          }
        ).__timeWrites,
    );
  await openTime(page);
  await page
    .getByRole('combobox', { name: 'Playback speed' })
    .selectOption('86400');
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  // The initial URL already contains t. Observe the command's replacement
  // rather than matching that old value or assuming a timer ran after 650 ms.
  // Pinned Next commits the same URL again with its internal history state
  // after ACTION_RESTORE. Await that bookkeeping too; it is not another command.
  await expect.poll(writes).toHaveLength(2);
  const anchored = await page.evaluate(() => location.href);
  await expect(page).toHaveURL(anchored);
  const anchor = new URL(anchored);
  expect(await writes()).toEqual([
    {
      mode: 'replaceState',
      href: anchor.pathname + anchor.search,
      nextInternal: false,
    },
    {
      mode: 'replaceState',
      href: anchor.pathname + anchor.search,
      nextInternal: true,
    },
  ]);
  const anchoredTime = Date.parse(anchor.searchParams.get('t')!);
  expect(anchoredTime).toBeGreaterThanOrEqual(
    Date.parse('2026-10-02T12:00:00Z') - 1,
  );
  expect(anchoredTime).toBeLessThanOrEqual(
    Date.parse((await actual(page)).t!) + 1,
  );
  await page.evaluate(() => {
    (window as unknown as { __timeWrites: unknown[] }).__timeWrites.length = 0;
  });
  await closeTime(page);
  const canvas = page.locator('canvas');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await canvas.hover({ position: { x: 900, y: 450 } });
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(1500);
  expect(page.url()).toBe(anchored);
  expect(await page.evaluate(() => history.length)).toBe(length);
  expect(await writes()).toEqual([]);
  const beforeShare = Date.parse((await actual(page)).t!);
  await openSettings(page);
  await page
    .getByRole('button', { name: 'Share this view', exact: true })
    .click();
  const copied = await page.evaluate(
    () => (window as unknown as { __copiedView: string }).__copiedView,
  );
  const shared = new URL(copied);
  expect(shared.pathname).toBe('/object/planet/earth');
  expect(Date.parse(shared.searchParams.get('t')!)).toBeGreaterThanOrEqual(
    beforeShare - 1,
  );
  for (const key of ['test', 'perf', 'scenario', 'renderer', 'rate', 'follow'])
    expect(shared.searchParams.has(key)).toBe(false);
  await page.goto(shared.pathname + shared.search + '&renderer=webgl&test=1');
  await ready(page);
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible();
  const restored = await actual(page);
  expect(restored.mode).toBe('paused');
  expect(
    Math.abs(
      Date.parse(restored.t!) - Date.parse(shared.searchParams.get('t')!),
    ),
  ).toBeLessThanOrEqual(1);
});

test('LIVE clears dated anchors through its transition; explicit pause/play and reverse record one anchor', async ({
  page,
}) => {
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  await openTime(page);
  await page.getByRole('button', { name: 'LIVE', exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.has('t'))
    .toBe(false);
  await expect.poll(() => actual(page)).toMatchObject({ mode: 'live' });
  const live = page.url(),
    length = await page.evaluate(() => history.length);
  await page.waitForTimeout(750);
  expect(page.url()).toBe(live);
  await closeTime(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.has('t')).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await openTime(page);
  await page.evaluate(() => {
    const writes: { href: string; nextInternal: boolean }[] = [];
    Object.assign(window, { __reverseWrites: writes });
    const original = history.replaceState.bind(history);
    history.replaceState = (data, unused, url) => {
      writes.push({ href: String(url), nextInternal: data?.__NA === true });
      return original(data, unused, url);
    };
    // Clear at the real click's capture phase, so any preceding Play anchor
    // cannot be mistaken for the Reverse command's delayed replacement.
    document.addEventListener(
      'click',
      (event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('[aria-label="Reverse time"]')
        )
          writes.length = 0;
      },
      true,
    );
  });
  const reverseWrites = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __reverseWrites: { href: string; nextInternal: boolean }[];
          }
        ).__reverseWrites,
    );
  await page.getByRole('button', { name: 'Reverse time', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__spaceEngine!.clock.rate))
    .toBe(-1);
  await expect.poll(reverseWrites).toHaveLength(2);
  const playing = await page.evaluate(() => location.href);
  const anchor = new URL(playing);
  expect(await reverseWrites()).toEqual([
    { href: anchor.pathname + anchor.search, nextInternal: false },
    { href: anchor.pathname + anchor.search, nextInternal: true },
  ]);
  await page.evaluate(() => {
    (
      window as unknown as { __reverseWrites: unknown[] }
    ).__reverseWrites.length = 0;
  });
  await page.waitForTimeout(750);
  expect(page.url()).toBe(playing);
  expect(await reverseWrites()).toEqual([]);
  expect(await page.evaluate(() => history.length)).toBe(length);
});

test('Previous view and Backspace restore camera history by replacement, including a hidden target', async ({
  page,
}) => {
  await page.goto(
    '/object/planet/earth' + query + '&frame=earth-fixed&view=wide&layers=',
  );
  await ready(page);
  await choose(page, 'Mars');
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await choose(page, 'Europa');
  await expect(page).toHaveURL(/\/object\/moon\/europa\?/);
  const length = await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    const counts = { backs: 0, pops: 0 };
    Object.assign(window, { __previousCounts: counts });
    const back = engine.back.bind(engine);
    engine.back = () => {
      counts.backs++;
      back();
    };
    window.addEventListener('popstate', () => counts.pops++);
    return history.length;
  });
  await openSettings(page);
  await page
    .getByRole('button', { name: 'Previous view', exact: true })
    .click();
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await expect
    .poll(() => actual(page))
    .toMatchObject({
      focusedId: 'planet:mars',
      frame: 'FIXED:earth',
      camera: { preset: 'close' },
      layers: [],
    });
  await page.locator('canvas').focus();
  await page.keyboard.press('Backspace');
  await expect(page).toHaveURL(/\/object\/planet\/earth\?/);
  await expect
    .poll(() => actual(page))
    .toMatchObject({
      focusedId: 'planet:earth',
      frame: 'FIXED:earth',
      camera: { preset: 'wide' },
      layers: [],
    });
  expect(await page.evaluate(() => history.length)).toBe(length);
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            __previousCounts: { backs: number; pops: number };
          }
        ).__previousCounts,
    ),
  ).toEqual({ backs: 2, pops: 0 });
});

test('closing and reselecting a card keeps the route and camera; canvas selection takes the shared command path', async ({
  page,
}) => {
  await page.goto('/object/planet/earth' + query + '&layers=');
  await ready(page);
  const href = page.url(),
    length = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: 'Close object card' }).click();
  await expect(
    page.getByRole('complementary', { name: 'Earth details' }),
  ).toHaveCount(0);
  await expect
    .poll(() => actual(page))
    .toMatchObject({ focusedId: 'planet:earth', selected: null, layers: [] });
  expect(page.url()).toBe(href);
  await choose(page, 'Earth');
  expect(page.url()).toBe(href);
  expect(await page.evaluate(() => history.length)).toBe(length);
  // The pick handler calls public select; this verifies its consumer event path.
  await page.evaluate(() => window.__spaceEngine!.select('planet:mars'));
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await expect
    .poll(() => actual(page))
    .toMatchObject({
      focusedId: 'planet:mars',
      focus: 'planet:mars',
      layers: [],
    });
  expect(await page.evaluate(() => history.length)).toBe(length + 1);
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole('heading', { name: 'Mars', exact: true }),
  ).toBeVisible();
});

test('clipboard denial exposes a labelled selectable link and returns focus on mobile', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Clipboard denied');
        },
      },
    }),
  );
  await page.goto(
    '/object/moon/europa' +
      query +
      '&layers=moons&frame=helio&view=wide&scale=true',
  );
  await ready(page);
  await openSettings(page);
  const share = page.getByRole('button', {
    name: 'Share this view',
    exact: true,
  });
  await share.click();
  const dialog = page.getByRole('dialog', {
    name: 'Share this view',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const field = dialog.getByLabel('View link');
  await expect(field).toBeFocused();
  const url = new URL(await field.inputValue());
  expect(url.pathname).toBe('/object/moon/europa');
  expect(url.searchParams.get('layers')).toBe('moons');
  expect(url.searchParams.get('frame')).toBe('helio');
  expect(url.searchParams.get('view')).toBe('wide');
  expect(url.searchParams.get('scale')).toBe('true');
  for (const key of ['renderer', 'test', 'perf', 'scenario'])
    expect(url.searchParams.has(key)).toBe(false);
  expect(
    await field.evaluate((element) => {
      const input = element as HTMLTextAreaElement;
      return input.selectionEnd - input.selectionStart === input.value.length;
    }),
  ).toBe(true);
  await dialog.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText(
    'Use your device’s Copy command',
  );
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath('mobile-share-fallback.png') });
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
});

test('compatibility navigation preserves semantic state and strips other diagnostics', async ({
  page,
}) => {
  await page.goto(
    '/object/dwarf/pluto' +
      query +
      '&layers=dwarfs&scale=true&frame=earth&view=wide&perf=1',
  );
  await ready(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('link', { name: 'Use WebGL2 compatibility mode' })
    .click();
  await ready(page);
  const url = new URL(page.url());
  expect(url.pathname).toBe('/object/dwarf/pluto');
  expect(url.searchParams.get('renderer')).toBe('webgl');
  for (const key of ['test', 'perf', 'scenario', 'focus'])
    expect(url.searchParams.has(key)).toBe(false);
  expect(url.searchParams.get('layers')).toBe('dwarfs');
  expect(url.searchParams.get('scale')).toBe('true');
  expect(url.searchParams.get('frame')).toBe('earth');
  expect(url.searchParams.get('view')).toBe('wide');
  expect(url.searchParams.has('t')).toBe(true);
  await expect(
    page.getByRole('button', { name: 'Play', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Pluto', exact: true }),
  ).toBeVisible();
  await openTime(page);
  await expect(page.getByLabel('Simulation date in UTC')).toHaveValue(
    '2026-10-02T12:00',
  );
});

test('obsolete asynchronous startup cannot replace a newer canvas after leaving and returning', async ({
  page,
}) => {
  const held: Route[] = [];
  await page.route('**/data/stars.bin', (route) => {
    held.push(route);
  });
  await page.goto('/object/planet/earth' + query);
  await expect.poll(() => held.length).toBeGreaterThan(0);
  const firstRequests = held.length;
  // Keyboard activation is available while the graphics overlay blocks pointers.
  await openSettings(page);
  await page.getByRole('link', { name: 'About the data' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/about\/data$/);
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/object\/planet\/earth\?/);
  await expect.poll(() => held.length).toBeGreaterThan(firstRequests);
  await page.locator('canvas').focus();
  await page.keyboard.press('/');
  await page.getByPlaceholder('Where would you like to go?').fill('Mars');
  await page.locator('.search-result').click();
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await page.locator('canvas').focus();
  await page.keyboard.press('/');
  await page.getByPlaceholder('Where would you like to go?').fill('Europa');
  await page.locator('.search-result').click();
  await expect(page).toHaveURL(/\/object\/moon\/europa\?/);
  await page.unroute('**/data/stars.bin');
  await Promise.all(held.map((route) => route.continue().catch(() => {})));
  await ready(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect
    .poll(() => actual(page))
    .toMatchObject({ focusedId: 'moon:europa', focus: 'moon:europa' });
  await expect(
    page.getByRole('heading', { name: 'Europa', exact: true }),
  ).toBeVisible();
});
