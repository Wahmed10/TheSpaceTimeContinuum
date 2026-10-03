import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import bodies from '../packages/domain/data/bodies.json' with { type: 'json' };

test.use({ actionTimeout: 10000, timezoneId: 'America/Toronto' });
const query = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z&layers=';
const ready = (page: Page) =>
  expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
const card = (page: Page, name: string) =>
  page.getByRole('complementary', { name: `${name} details`, exact: true });
async function select(page: Page, id: string) {
  await page.evaluate((selected) => window.__spaceEngine!.select(selected), id);
  await expect(page).toHaveURL(
    new RegExp(`/object/${id.replace(':', '/')}\\?`),
  );
}
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const found: string[] = [];
  errors.set(page, found);
  page.on('pageerror', (error) => found.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test('all 21 catalog cards show correct classifications, certainty, periods and provider provenance', async ({
  page,
}, info) => {
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  for (const body of bodies) {
    await select(page, body.id);
    const details = card(page, body.name);
    await expect(
      details.getByRole('heading', { name: body.name, exact: true }),
    ).toBeVisible();
    const type =
      body.kind === 'star'
        ? 'Star'
        : body.kind === 'moon'
          ? 'Moon'
          : body.kind === 'dwarf'
            ? 'Dwarf planet'
            : ['planet:jupiter', 'planet:saturn'].includes(body.id)
              ? 'Gas giant'
              : ['planet:uranus', 'planet:neptune'].includes(body.id)
                ? 'Ice giant'
                : 'Rocky planet';
    await expect(details.getByTestId('entity-type')).toHaveText(type);
    await expect(details.locator('.position-certainty')).toHaveText(
      body.provenance.certainty === 'approximate'
        ? 'Approximate position'
        : 'Computed position',
    );
    await expect(details.getByTestId('metric-period')).toContainText(
      'periodDays' in body.physical ? 'Earth days' : 'Unavailable',
    );
    const disclosure = details.getByRole('button', {
      name: /More about this world/,
    });
    await disclosure.click();
    await expect(disclosure).toBeFocused();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await expect(details.locator('.source-details')).toContainText(
      body.provenance.providerId,
    );
    await expect(details.locator('.detail-body a').first()).toHaveAttribute(
      'href',
      body.provenance.sourceUrl,
    );
    await expect(details.locator('.source-details')).not.toContainText(
      /Source timestamp|Ingested at|Model epoch/,
    );
    if (body.provenance.certainty === 'approximate')
      await expect(details.locator('.detail-body')).toContainText(
        'accuracy is not continuously bounded',
      );
  }
  await page.screenshot({
    path: info.outputPath('charon-provenance-card.png'),
  });
});

test('physical measurements stay identical in True and Explore scale and convert km, mi and AU', async ({
  page,
}) => {
  await page.goto('/object/planet/mars' + query);
  await ready(page);
  const details = card(page, 'Mars');
  await expect(details.getByTestId('metric-diameter')).toHaveText('6,779 km');
  const before = await details.locator('.metrics dd').allTextContents();
  const raw = await page.evaluate(() =>
    window.__spaceEngine!.getMetrics('planet:mars'),
  );
  await page
    .getByRole('button', { name: 'Explore scale', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'True scale', exact: true }),
  ).toBeVisible();
  expect(await details.locator('.metrics dd').allTextContents()).toEqual(
    before,
  );
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMetrics('planet:mars')),
  ).toEqual(raw);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Distances', { exact: true }).selectOption('mi');
  await expect(details.getByTestId('metric-diameter')).toHaveText(
    '4,212.28 mi',
  );
  await expect(details.getByTestId('metric-speed')).toContainText('mi/s');
  await page.getByLabel('Distances', { exact: true }).selectOption('AU');
  await expect(details.getByTestId('metric-diameter')).toHaveText(
    '4.531e-5 AU',
  );
  await expect(details.getByTestId('metric-speed')).toContainText('km/s');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await select(page, 'planet:earth');
  await expect(card(page, 'Earth').getByTestId('metric-earth')).toHaveText(
    '0 AU',
  );
});

test('simulation UTC changes across past and future dates without inventing source timestamps', async ({
  page,
}) => {
  await page.goto('/object/dwarf/ceres' + query);
  await ready(page);
  const details = card(page, 'Ceres');
  await details.getByRole('button', { name: /More about this world/ }).click();
  await expect(details.locator('.source-details')).toContainText(
    'Two-body orbital propagation',
  );
  for (const value of ['1901-02-03T04:05', '2099-11-12T13:14']) {
    await page.getByLabel('Simulation date in UTC').fill(value);
    await expect(
      details.locator('.source-details time').first(),
    ).toHaveAttribute('datetime', value + ':00.000Z');
    await expect(details.locator('.source-details')).not.toContainText(
      /Source timestamp|Ingested at|Model epoch/,
    );
    await expect(details.locator('.detail-body')).toContainText(
      'not spacecraft telemetry',
    );
  }
});

test('follow, refocus, closing and Back keep card and route ownership coherent', async ({
  page,
}) => {
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  const earth = card(page, 'Earth'),
    href = page.url(),
    length = await page.evaluate(() => history.length);
  await earth.getByRole('button', { name: 'Following', exact: true }).click();
  await expect(
    earth.getByRole('button', { name: 'Follow', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => window.__spaceEngine!.isFollowing)).toBe(
    false,
  );
  await earth.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(
    earth.getByRole('button', { name: 'Following', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await earth.getByRole('button', { name: 'Get closer', exact: true }).click();
  expect(await page.evaluate(() => history.length)).toBe(length);
  expect(page.url()).toBe(href);
  await earth.getByRole('button', { name: 'Close object card' }).click();
  await expect(earth).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Find a world', exact: true }),
  ).toBeFocused();
  expect(page.url()).toBe(href);
  expect(await page.evaluate(() => window.__spaceEngine!.focusedId)).toBe(
    'planet:earth',
  );
  await select(page, 'planet:mars');
  await select(page, 'moon:europa');
  await page.goBack();
  await expect(card(page, 'Mars')).toBeVisible();
  await page.goForward();
  await expect(card(page, 'Europa')).toBeVisible();
});

test('card layer controls retain focus, requested state and URL without another history entry', async ({
  page,
}) => {
  await page.goto('/object/moon/europa' + query);
  await ready(page);
  const details = card(page, 'Europa'),
    length = await page.evaluate(() => history.length);
  await expect(details.locator('.object-layer-status')).toContainText(
    'Moons: hidden',
  );
  await details.getByRole('button', { name: 'Show Moons layer' }).click();
  const hide = details.getByRole('button', { name: 'Hide Moons layer' });
  await expect(hide).toBeFocused();
  await expect(hide).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('layers'))
    .toBe('moons');
  await page.evaluate(() => window.__spaceEngine!.whenLayersSettled());
  await hide.click();
  await expect(
    details.getByRole('button', { name: 'Show Moons layer' }),
  ).toBeFocused();
  await expect
    .poll(() => new URL(page.url()).searchParams.get('layers'))
    .toBe('');
  expect(await page.evaluate(() => history.length)).toBe(length);
  await expect(details).toBeVisible();
});

test('card sharing uses the public semantic link and the existing clipboard fallback', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error('Denied');
        },
      },
    }),
  );
  await page.goto('/object/moon/charon' + query);
  await ready(page);
  await card(page, 'Charon')
    .getByRole('button', { name: 'Share Charon view' })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Share this view',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  const field = dialog.getByLabel('View link');
  await expect(field).toBeFocused();
  const url = new URL(await field.inputValue());
  expect(url.pathname).toBe('/object/moon/charon');
  expect(url.searchParams.get('layers')).toBe('');
  expect(url.searchParams.get('t')).toBe('2026-10-02T12:00:00.000Z');
  expect(url.searchParams.has('test')).toBe(false);
  expect(url.searchParams.has('renderer')).toBe(false);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Share this view', exact: true }),
  ).toBeFocused();
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 390, height: 430 },
  { width: 844, height: 390 },
])
  test.describe(`mobile card ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, isMobile: true, hasTouch: true });
    test('keyboard snap controls, disclosure and internal scroll leave the timeline and camera usable', async ({
      page,
    }, info) => {
      await page.goto('/object/moon/charon' + query);
      await ready(page);
      const details = card(page, 'Charon'),
        group = details.getByRole('group', { name: 'Object card size' });
      await expect(details).toHaveAttribute('data-snap', 'half');
      await group.getByRole('button', { name: 'Peek', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(details).toHaveAttribute('data-snap', 'peek');
      await expect(details.getByTestId('metric-sun')).not.toBeVisible();
      await expect(
        group.getByRole('button', { name: 'Peek', exact: true }),
      ).toBeFocused();
      await group.getByRole('button', { name: 'Full', exact: true }).focus();
      await page.keyboard.press('Space');
      await expect(details).toHaveAttribute('data-snap', 'full');
      expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
        'paused',
      );
      const disclosure = details.getByRole('button', {
        name: /More about this world/,
      });
      await disclosure.click();
      await expect(disclosure).toBeFocused();
      const region = details.getByRole('region');
      await region.evaluate((element) => {
        element.scrollTop = 0;
      });
      await page.evaluate(() => {
        Object.assign(window, { __cardCanvasEvents: 0 });
        for (const name of ['pointerdown', 'pointermove', 'pointerup', 'wheel'])
          document.querySelector('canvas')!.addEventListener(name, () => {
            const observed = window as unknown as {
              __cardCanvasEvents: number;
            };
            observed.__cardCanvasEvents++;
          });
      });
      await region.hover();
      await page.mouse.wheel(0, 220);
      await expect
        .poll(() => region.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () =>
            (window as unknown as { __cardCanvasEvents: number })
              .__cardCanvasEvents,
        ),
      ).toBe(0);
      const box = await details.boundingBox(),
        timeline = await page.locator('.timeline').boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(70);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThan(timeline!.y);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath('mobile-full-card.png') });
      await group.getByRole('button', { name: 'Peek', exact: true }).tap();
      await page.screenshot({ path: info.outputPath('mobile-peek-card.png') });
      await details.getByRole('button', { name: 'Close object card' }).tap();
      await expect(
        page.getByRole('button', { name: 'Find a world', exact: true }),
      ).toBeFocused();
      await expect(page.locator('.timeline')).toBeVisible();
    });
  });
