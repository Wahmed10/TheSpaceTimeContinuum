import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { openSettings } from './helpers/consumerControls';
const query = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z';
const ready = (page: Page) =>
  expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
const ids = (page: Page) =>
  page
    .locator('.object-list-choice')
    .evaluateAll((elements) =>
      elements.map((el) => (el as HTMLElement).dataset.entityId!),
    );
async function open(page: Page) {
  await page.locator('canvas').focus();
  await page.keyboard.press('o');
  await expect(
    page.getByRole('dialog', { name: 'Objects in view' }),
  ).toBeVisible();
}

test('camera orbit, zoom and disabled layers change the real rendered catalog membership', async ({
  page,
}, info) => {
  test.setTimeout(150000);
  await page.goto('/' + query);
  await ready(page);
  await open(page);
  await expect(page.locator('.object-list-choice').first()).toBeVisible();
  const initial = await ids(page);
  expect(initial).toContain('star:sun');
  expect(initial).toContain('planet:earth');
  await page.locator('canvas').focus();
  for (let i = 0; i < 25; i++) await page.keyboard.press('ArrowRight');
  // Native Shift-drag pans the camera while the nonmodal text list stays open.
  await page.mouse.move(750, 400);
  await page.keyboard.down('Shift');
  await page.mouse.down();
  await page.mouse.move(1100, 700, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect.poll(() => ids(page)).not.toEqual(initial);
  const orbit = await ids(page);
  await page
    .locator('canvas')
    .dispatchEvent('wheel', { deltaY: -2500, deltaMode: 0 });
  await expect.poll(() => ids(page)).not.toEqual(orbit);
  await expect(
    page.getByRole('dialog', { name: 'Objects in view' }),
  ).toBeVisible();
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.focus('star:sun', {
      transition: false,
      wide: true,
      select: false,
      recordHistory: false,
    });
  });
  await expect.poll(() => ids(page)).toContain('planet:earth');
  const beforeDisablingPlanets = await ids(page);
  const nonPlanets = beforeDisablingPlanets.filter(
    (id) => !id.startsWith('planet:'),
  );
  expect(nonPlanets).toContain('star:sun');
  await page.evaluate(() => window.__spaceEngine!.setLayer('planets', false));
  await expect.poll(() => ids(page)).toEqual(nonPlanets);
  await page.evaluate(() => window.__spaceEngine!.setLayer('planets', true));
  await expect.poll(() => ids(page)).toContain('planet:earth');
  await page.screenshot({
    path: info.outputPath('objects-in-view-moving-map.png'),
  });
});

test('all qualifying Jupiter moons remain selectable when actual labels collide', async ({
  page,
}, info) => {
  await page.goto('/object/planet/jupiter' + query);
  await ready(page);
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    engine.setScale('true');
    engine.setReferenceDistance(1e7);
  });
  await open(page);
  const expected = [
    'planet:jupiter',
    'moon:io',
    'moon:europa',
    'moon:ganymede',
    'moon:callisto',
  ];
  for (const id of expected) await expect.poll(() => ids(page)).toContain(id);
  const visible = await page
    .locator('.space-label[data-visible="true"]')
    .allTextContents();
  expect(
    visible.filter((name) =>
      ['Jupiter', 'Io', 'Europa', 'Ganymede', 'Callisto'].includes(name),
    ).length,
  ).toBeLessThan(5);
  await expect(
    page.getByRole('dialog', { name: 'Objects in view' }),
  ).toContainText('some may be behind another body');
  await writeFile(
    info.outputPath('collision-membership.json'),
    JSON.stringify(
      {
        list: await ids(page),
        visibleLabels: visible,
        expectedCenters: expected,
      },
      null,
      2,
    ),
  );
  await expect(
    page.getByRole('button', { name: 'Get closer', exact: true }),
  ).toBeVisible();
  // Preserve real scene membership, then let the DOM/card compositor paint
  // before recording the review capture on the functional software renderer.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
  await page.screenshot({
    path: info.outputPath('collision-independent-list.png'),
  });
});

test('list selection uses one shared navigation/focus and returns focus to Settings', async ({
  page,
}) => {
  await page.goto('/' + query);
  await ready(page);
  const before = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    const original = engine.focus.bind(engine);
    const w = window as Window & { p4FocusCount?: number };
    w.p4FocusCount = 0;
    engine.focus = (...args) => {
      w.p4FocusCount!++;
      return original(...args);
    };
  });
  await openSettings(page);
  await page
    .getByRole('button', { name: 'Objects in view', exact: true })
    .click();
  const earth = page.locator(
    '.object-list-choice[data-entity-id="planet:earth"]',
  );
  await expect(earth).toBeVisible();
  await earth.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/object\/planet\/earth/);
  await expect(
    page.getByRole('complementary', { name: 'Earth details' }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Objects in view' }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
  expect(await page.evaluate(() => history.length)).toBe(before + 1);
  expect(
    await page.evaluate(
      () => (window as Window & { p4FocusCount: number }).p4FocusCount,
    ),
  ).toBe(1);
});

test('empty list is honest and closing or leaving Explore stops cold queries', async ({
  page,
}) => {
  await page.goto('/' + query);
  await ready(page);
  await page.evaluate(() => {
    const engine = window.__spaceEngine!,
      original = engine.getObjectsInView.bind(engine);
    const w = window as Window & { p4Queries?: number; p4Perf?: number };
    w.p4Queries = 0;
    w.p4Perf = 0;
    engine.getObjectsInView = () => {
      w.p4Queries!++;
      return original();
    };
    engine.on('perf', () => {
      w.p4Perf!++;
    });
    // A genuine close Earth view with every non-star layer disabled. Pan only
    // offsets the camera eye; it still looks at the Sun and cannot ensure emptiness.
    engine.setScale('true');
    engine.setLayer('planets', false);
    engine.setLayer('moons', false);
    engine.setLayer('dwarfs', false);
    engine.focus('planet:earth', {
      transition: false,
      select: false,
      recordHistory: false,
    });
  });
  await open(page);
  await expect(
    page.getByRole('dialog', { name: 'Objects in view' }),
  ).toContainText('No catalog centers are in this view');
  await page.getByRole('button', { name: 'Close list', exact: true }).click();
  await expect(page.locator('.objects-in-view')).toHaveCount(0);
  const baseline = await page.evaluate(() => ({
    queries: (window as Window & { p4Queries: number }).p4Queries,
    perf: (window as Window & { p4Perf: number }).p4Perf,
  }));
  await expect
    .poll(() =>
      page.evaluate(() => (window as Window & { p4Perf: number }).p4Perf),
    )
    .toBeGreaterThan(baseline.perf + 1);
  expect(
    await page.evaluate(
      () => (window as Window & { p4Queries: number }).p4Queries,
    ),
  ).toBe(baseline.queries);
  await open(page);
  await page.goto('/about/data');
  await expect(page.locator('.objects-in-view')).toHaveCount(0);
  expect(await page.evaluate(() => !!window.__spaceEngine)).toBe(false);
});
