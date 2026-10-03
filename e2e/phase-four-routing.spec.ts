import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { BodySpec } from '../packages/domain/src/types';

const EXPLORABLE_BODIES = JSON.parse(
  readFileSync(
    new URL('../packages/domain/data/bodies.json', import.meta.url),
    'utf8',
  ),
) as BodySpec[];

const datedQuery = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z';
const pathFor = (body: (typeof EXPLORABLE_BODIES)[number]) =>
  `/object/${body.kind}/${body.id.split(':')[1]}`;
const ready = (page: Page) =>
  expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });

test.use({ actionTimeout: 10000 });

test('production HTTP HTML contains catalog metadata for all 21 objects', async ({
  request,
  page,
}) => {
  for (const body of EXPLORABLE_BODIES) {
    const path = pathFor(body);
    const response = await request.get(path);
    expect(response.status(), body.id).toBe(200);
    const html = await response.text();
    const metadata = await page.evaluate((markup) => {
      const doc = new DOMParser().parseFromString(markup, 'text/html');
      const content = (selector: string) =>
        doc.querySelector(selector)?.getAttribute('content');
      return {
        title: doc.querySelector('title')?.textContent,
        description: content('meta[name="description"]'),
        ogTitle: content('meta[property="og:title"]'),
        ogDescription: content('meta[property="og:description"]'),
        ogType: content('meta[property="og:type"]'),
        kind: content('meta[name="continuum:object-type"]'),
        canonical: doc
          .querySelector('link[rel="canonical"]')
          ?.getAttribute('href'),
        ogUrl: content('meta[property="og:url"]'),
      };
    }, html);
    expect(metadata).toMatchObject({
      title: `${body.name} — Continuum`,
      description: body.description,
      ogTitle: `${body.name} — Continuum`,
      ogDescription: body.description,
      ogType: 'website',
      kind: body.kind,
    });
    const origin = process.env.EXPECTED_SITE_URL;
    expect(metadata.canonical).toBe(origin ? `${origin}${path}` : undefined);
    expect(metadata.ogUrl).toBe(origin ? `${origin}${path}` : undefined);
  }
  const root = await request.get('/');
  expect(root.status()).toBe(200);
  const html = await root.text();
  expect(html).toContain(
    '<title>Continuum — Space &amp; Time, Connected</title>',
  );
  const origin = process.env.EXPECTED_SITE_URL;
  if (origin) expect(html).toContain(`href="${origin}/"`);
  else expect(html).not.toContain('rel="canonical"');
});

test('friendly HTTP redirects validate state and retain only accepted flags', async ({
  request,
}) => {
  const response = await request.get(
    '/mars?t=2026-10-02T08%3A00%3A00-04%3A00&frame=earth-fixed&layers=&view=wide&test=1&renderer=webgl&unknown=drop',
    { maxRedirects: 0 },
  );
  expect(response.status()).toBe(307);
  const location = new URL(response.headers().location!, 'http://localhost');
  expect(location.pathname).toBe('/object/planet/mars');
  expect(location.searchParams.get('t')).toBe('2026-10-02T12:00:00.000Z');
  expect(location.searchParams.get('frame')).toBe('earth-fixed');
  expect(location.searchParams.get('layers')).toBe('');
  expect(location.searchParams.get('view')).toBe('wide');
  expect(location.searchParams.get('test')).toBe('1');
  expect(location.searchParams.get('renderer')).toBe('webgl');
  expect(location.searchParams.has('unknown')).toBe(false);
  const malformed = await request.get('/mars?t=%FF&test=1', {
    maxRedirects: 0,
  });
  expect(malformed.status()).toBe(307);
  const recovered = new URL(malformed.headers().location!, 'http://localhost');
  expect(recovered.pathname + recovered.search).toBe('/object/planet/mars');
  const invalidEscape = await request.get('/mars?t=%ZZ&test=1', {
    maxRedirects: 0,
  });
  expect(invalidEscape.status()).toBe(307);
  expect(
    new URL(invalidEscape.headers().location!, 'http://localhost').pathname,
  ).toBe('/object/planet/mars');
  expect(
    new URL(invalidEscape.headers().location!, 'http://localhost').search,
  ).toBe('');
  const duplicate = await request.get(
    '/earth?scale=true&scale=explore&layers=&renderer=webgl',
    { maxRedirects: 0 },
  );
  expect(duplicate.status()).toBe(307);
  const deduplicated = new URL(
    duplicate.headers().location!,
    'http://localhost',
  );
  expect(deduplicated.pathname + deduplicated.search).toBe(
    '/object/planet/earth?layers=&renderer=webgl',
  );
});

test('unknown objects, future kinds and unavailable events are HTTP 404 with no renderer', async ({
  page,
  request,
}, info) => {
  for (const path of [
    '/object/planet/missing',
    '/object/moon/earth',
    '/object/sat/25544',
    '/object/sb/ceres',
    '/object/moon/pluto-charon',
    '/not-a-world',
    '/event/imagined-eclipse',
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(404);
    const assets: string[] = [];
    const listener = (request: { url(): string }) => {
      if (/\/data\/corrections\/|\/textures\//.test(request.url()))
        assets.push(request.url());
    };
    page.on('request', listener);
    const navigation = await page.goto(path);
    expect(navigation?.status()).toBe(404);
    await expect(
      page.getByRole('heading', {
        name: path.startsWith('/event/')
          ? 'Events are not available yet.'
          : 'This world is not available.',
      }),
    ).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(await page.evaluate(() => window.__spaceEngine)).toBeUndefined();
    expect(assets).toEqual([]);
    page.off('request', listener);
  }
  await page.screenshot({ path: info.outputPath('events-unavailable.png') });
});

for (const id of [
  'planet:mars',
  'moon:europa',
  'dwarf:pluto',
  'star:sun',
  'moon:charon',
]) {
  test(`${id} supports direct entry and refresh`, async ({ page }) => {
    const body = EXPLORABLE_BODIES.find((body) => body.id === id)!;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathFor(body) + datedQuery);
    await ready(page);
    await expect(page).toHaveTitle(`${body.name} — Continuum`);
    await expect(
      page.getByRole('heading', { name: body.name, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => window.__spaceEngine!.getMapState().focus),
    ).toBe(id);
    await page.reload();
    await ready(page);
    await expect(page).toHaveTitle(`${body.name} — Continuum`);
    expect(
      await page.evaluate(() => window.__spaceEngine!.getMapState().focus),
    ).toBe(id);
    expect(errors).toEqual([]);
  });
}

test('legacy root focus normalizes its path and metadata without a second restoration', async ({
  page,
}) => {
  await page.goto(
    '/?focus=moon:charon&renderer=webgl&test=1&layers=&view=wide&t=2026-10-02T12:00:00Z',
  );
  await ready(page);
  await expect(page).toHaveURL(/\/object\/moon\/charon\?/);
  await expect(page).toHaveTitle('Charon — Continuum');
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMapState()),
  ).toMatchObject({
    focus: 'moon:charon',
    camera: { preset: 'wide' },
    layers: [],
  });
  const history = await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    const before = engine.getMapState();
    engine.back();
    return { before, after: engine.getMapState() };
  });
  expect(history.after).toEqual(history.before);
});

test('20 client selections keep one engine/canvas and one restoration per navigation, then dispose on exit', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/object/planet/earth' + datedQuery);
  await ready(page);
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.setReducedMotion(true);
    const canvas = document.querySelector('canvas');
    const metrics = {
      engine,
      canvas,
      restores: 0,
      subscriptions: 0,
      disposals: 0,
    };
    Object.assign(window, { __routeLifetime: metrics });
    const apply = engine.applyMapState.bind(engine),
      on = engine.on.bind(engine),
      dispose = engine.dispose.bind(engine);
    engine.applyMapState = (...args) => {
      metrics.restores++;
      return apply(...args);
    };
    engine.on = (...args) => {
      metrics.subscriptions++;
      return on(...args);
    };
    engine.dispose = () => {
      metrics.disposals++;
      dispose();
    };
  });
  let selections = 0;
  for (const body of EXPLORABLE_BODIES.filter(
    (body) => body.id !== 'planet:earth',
  )) {
    await page
      .getByRole('button', { name: 'Find a world', exact: true })
      .click();
    await page.getByPlaceholder('Where would you like to go?').fill(body.name);
    await page
      .getByRole('button', {
        name: `${body.name} ${body.kind} · Solar system`,
        exact: true,
      })
      .click();
    selections++;
    await expect(page).toHaveURL(new RegExp(pathFor(body) + '\\?'));
    await expect(page).toHaveTitle(`${body.name} — Continuum`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      `${body.name} — Continuum`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      body.description,
    );
    await expect
      .poll(() =>
        page.evaluate(() => window.__spaceEngine!.getMapState().focus),
      )
      .toBe(body.id);
    expect(
      await page.evaluate(() => {
        const metrics = (
          window as unknown as {
            __routeLifetime: {
              engine: unknown;
              canvas: unknown;
              restores: number;
              subscriptions: number;
              disposals: number;
            };
          }
        ).__routeLifetime;
        return {
          sameEngine: metrics.engine === window.__spaceEngine,
          sameCanvas: metrics.canvas === document.querySelector('canvas'),
          restores: metrics.restores,
          subscriptions: metrics.subscriptions,
          disposals: metrics.disposals,
        };
      }),
    ).toEqual({
      sameEngine: true,
      sameCanvas: true,
      restores: selections,
      subscriptions: 0,
      disposals: 0,
    });
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  expect(selections).toBe(20);
  await page.screenshot({
    path: info.outputPath('charon-canonical-navigation.png'),
  });
  await page.getByRole('link', { name: 'About the data' }).click();
  await expect(page).toHaveURL(/\/about\/data$/);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(
    await page.evaluate(() => {
      const metrics = (
        window as unknown as { __routeLifetime: { disposals: number } }
      ).__routeLifetime;
      return {
        disposals: metrics.disposals,
        exposed: Boolean(window.__spaceEngine),
      };
    }),
  ).toEqual({ disposals: 1, exposed: false });
  expect(errors).toEqual([]);
});

test('a selection during startup restores the latest route, and the standalone lab still works', async ({
  page,
}) => {
  const held: Route[] = [];
  await page.route('**/data/corrections/**', (route) => {
    held.push(route);
  });
  await page.goto('/object/planet/earth' + datedQuery);
  await expect.poll(() => held.length).toBeGreaterThan(0);
  // The graphics loading overlay covers header pointer targets. The existing
  // search shortcut remains available and its dialog is above that overlay.
  await page.keyboard.press('/');
  await page.getByPlaceholder('Where would you like to go?').fill('Mars');
  await page.locator('.search-result').click();
  await expect(page).toHaveURL(/\/object\/planet\/mars\?/);
  await page.unroute('**/data/corrections/**');
  await Promise.all(held.map((route) => route.continue().catch(() => {})));
  await ready(page);
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMapState().focus),
  ).toBe('planet:mars');
  await expect(
    page.getByRole('heading', { name: 'Mars', exact: true }),
  ).toBeVisible();
  await page.goto('/lab/poc?renderer=webgl&test=1');
  await ready(page);
  await expect(
    page.getByRole('button', { name: 'Run Phase 3 device checks' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Mars', exact: false })
    .first()
    .click();
  expect(
    await page.evaluate(() => window.__spaceEngine!.getMapState().focus),
  ).toBe('planet:mars');
  await expect(page).toHaveURL(/\/lab\/poc\?/);
});
