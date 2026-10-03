import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { BodySpec } from '../packages/domain/src/types';

const bodies = JSON.parse(
  readFileSync(
    new URL('../packages/domain/data/bodies.json', import.meta.url),
    'utf8',
  ),
) as BodySpec[];
const query = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z';
const ready = (page: Page) =>
  expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
async function open(page: Page) {
  await page.getByRole('button', { name: 'Find a world', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Find a world', exact: true }),
  ).toBeFocused();
}
const input = (page: Page) =>
  page.getByRole('combobox', { name: 'Find a world', exact: true });
const errors = new WeakMap<Page, string[]>();
test.use({ actionTimeout: 10000 });
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on('pageerror', (error) => collected.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

test('all 21 names, IDs and catalog aliases are locally searchable with bounded deduplicated options', async ({
  page,
}) => {
  await page.goto('/' + query);
  await ready(page);
  await open(page);
  const api: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/|supabase|\/search(?:\?|$)/i.test(request.url()))
      api.push(request.url());
  });
  for (const body of bodies)
    for (const text of [body.name, body.id, ...body.aliases]) {
      await input(page).fill(text);
      const option = page.getByRole('option').first();
      await expect(option).toHaveAttribute('data-entity-id', body.id);
      await expect(option).toHaveAttribute('aria-selected', 'true');
      expect(await page.getByRole('option').count()).toBeLessThanOrEqual(8);
      const ids = await page
        .getByRole('option')
        .evaluateAll((options) =>
          options.map((option) => option.getAttribute('data-entity-id')),
        );
      expect(new Set(ids).size).toBe(ids.length);
    }
  expect(api).toEqual([]);
});

test('combobox arrows, Home and End keep input focus and Enter selects the active option rather than the first', async ({
  page,
}, info) => {
  await page.goto('/' + query);
  await ready(page);
  await open(page);
  const combo = input(page),
    list = page.getByRole('listbox', { name: 'Worlds to explore' });
  await expect(combo).toHaveAttribute('aria-expanded', 'true');
  await expect(combo).toHaveAttribute('aria-autocomplete', 'list');
  expect(await combo.getAttribute('aria-controls')).toBe(
    await list.getAttribute('id'),
  );
  const ids = await page
    .getByRole('option')
    .evaluateAll((options) => options.map((option) => option.id));
  async function active(index: number) {
    await expect(combo).toBeFocused();
    await expect(combo).toHaveAttribute('aria-activedescendant', ids[index]!);
    await expect(page.getByRole('option', { selected: true })).toHaveAttribute(
      'id',
      ids[index]!,
    );
  }
  await active(0);
  await combo.press('ArrowDown');
  await active(1);
  await combo.press('ArrowUp');
  await active(0);
  await combo.press('ArrowUp');
  await active(ids.length - 1);
  await combo.press('Home');
  await active(0);
  await combo.press('End');
  await active(ids.length - 1);
  const selectedId = await page
    .getByRole('option', { selected: true })
    .getAttribute('data-entity-id');
  const selectedName = bodies.find((body) => body.id === selectedId)!.name;
  await page.screenshot({
    path: info.outputPath('keyboard-active-result.png'),
  });
  const length = await page.evaluate(() => history.length);
  await combo.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Find a world' })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('heading', { name: selectedName, exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__spaceEngine!.focusedId))
    .toBe(selectedId);
  const [kind, slug] = selectedId!.split(':');
  await expect(page).toHaveURL(new RegExp(`/object/${kind}/${slug}\\?`));
  await expect.poll(() => page.evaluate(() => history.length)).toBe(length + 1);
  await expect(
    page.getByRole('button', { name: 'Find a world', exact: true }),
  ).toBeFocused();
});

test('prefix, typo and mixed-case results select coherent canonical routes', async ({
  page,
}) => {
  await page.goto('/' + query);
  await ready(page);
  for (const [text, name, id, path] of [
    ['Eur', 'Europa', 'moon:europa', '/object/moon/europa'],
    ['Chraon', 'Charon', 'moon:charon', '/object/moon/charon'],
    [' pLuTo ', 'Pluto', 'dwarf:pluto', '/object/dwarf/pluto'],
    ['planet:mar', 'Mars', 'planet:mars', '/object/planet/mars'],
  ]) {
    await open(page);
    await input(page).fill(text!);
    await expect(page.getByRole('option').first()).toHaveAttribute(
      'data-entity-id',
      id!,
    );
    await input(page).press('Enter');
    await expect(page).toHaveURL(new RegExp(path! + '\\?'));
    await expect(
      page.getByRole('heading', { name: name!, exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.__spaceEngine!.focusedId))
      .toBe(id);
  }
});

test('empty, unavailable and long input remain bounded and no-result Enter adds no history', async ({
  page,
}, info) => {
  await page.goto('/' + query);
  await ready(page);
  await open(page);
  await expect(page.getByRole('option')).toHaveCount(8);
  const href = page.url(),
    length = await page.evaluate(() => history.length);
  await input(page).fill('ISS Voyager unvalidated');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(
    page.getByText('No worlds found. Try Earth, Europa, Pluto or Charon.'),
  ).toBeVisible();
  await expect(input(page)).not.toHaveAttribute('aria-activedescendant');
  await input(page).press('ArrowDown');
  await input(page).press('Enter');
  await expect(
    page.getByRole('dialog', { name: 'Find a world' }),
  ).toBeVisible();
  expect(page.url()).toBe(href);
  expect(await page.evaluate(() => history.length)).toBe(length);
  await input(page).fill('x'.repeat(512));
  expect((await input(page).inputValue()).length).toBeLessThanOrEqual(128);
  await expect(page.getByRole('option')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('search-no-results.png') });
  await input(page).fill('');
  await expect(page.getByRole('option')).toHaveCount(8);
  await expect(page.getByRole('option').first()).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('IME composition does not select or dismiss; composition end commits the final query', async ({
  page,
}) => {
  await page.goto('/' + query);
  await ready(page);
  await open(page);
  const href = page.url(),
    length = await page.evaluate(() => history.length);
  await input(page).evaluate((element) => {
    const node = element as HTMLInputElement;
    node.dispatchEvent(
      new CompositionEvent('compositionstart', {
        bubbles: true,
        data: 'Euorpa',
      }),
    );
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )!.set!.call(node, 'Euorpa');
    node.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertCompositionText',
        data: 'Euorpa',
        isComposing: true,
      }),
    );
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        keyCode: 229,
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  expect(page.url()).toBe(href);
  expect(await page.evaluate(() => history.length)).toBe(length);
  await expect(
    page.getByRole('dialog', { name: 'Find a world' }),
  ).toBeVisible();
  await expect(page.getByRole('listbox')).toHaveAttribute('data-query', '');
  await input(page).evaluate((element) =>
    element.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: 'Euorpa' }),
    ),
  );
  await expect(page.getByRole('option').first()).toHaveAttribute(
    'data-entity-id',
    'moon:europa',
  );
  await input(page).press('Enter');
  await expect(page).toHaveURL(/\/object\/moon\/europa\?/);
});

test('Escape and keyboard dismissal return to the trigger without changing selection or clock', async ({
  page,
}) => {
  await page.goto('/object/planet/earth' + query);
  await ready(page);
  const href = page.url();
  await page.locator('canvas').focus();
  await page.keyboard.press('/');
  await expect(input(page)).toBeFocused();
  await input(page).fill('Charon');
  await input(page).press('Escape');
  const trigger = page.getByRole('button', {
    name: 'Find a world',
    exact: true,
  });
  await expect(trigger).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'Earth', exact: true }),
  ).toBeVisible();
  expect(page.url()).toBe(href);
  await open(page);
  await input(page).press('Tab');
  await expect(
    page.getByRole('button', { name: 'Close search' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => window.__spaceEngine!.clock.mode)).toBe(
    'paused',
  );
});

test('search yields background rendering without pausing simulation time, then resumes after dismissal and canonical selection', async ({
  page,
}) => {
  await page.goto('/' + query);
  await ready(page);
  await page.evaluate(() => {
    const engine = window.__spaceEngine!;
    const sample = {
      holds: 0,
      active: 0,
      perf: 0,
      releasedRoutes: [] as string[],
    };
    Object.assign(window, {
      __searchRendering: sample,
      __originalSearchEngine: engine,
    });
    const suspend = engine.suspendRendering.bind(engine);
    engine.suspendRendering = () => {
      sample.holds++;
      sample.active++;
      const release = suspend();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        sample.active--;
        sample.releasedRoutes.push(location.pathname);
        release();
      };
    };
    engine.on('perf', () => sample.perf++);
    engine.clock.play();
  });
  await open(page);
  const before = await page.evaluate(() => ({
    state: (
      window as unknown as {
        __searchRendering: { active: number; perf: number };
      }
    ).__searchRendering,
    t: window.__spaceEngine!.clock.tick(),
  }));
  expect(before.state.active).toBe(1);
  await page.waitForTimeout(650);
  const during = await page.evaluate(() => ({
    state: (
      window as unknown as {
        __searchRendering: { active: number; perf: number };
      }
    ).__searchRendering,
    t: window.__spaceEngine!.clock.tick(),
    mode: window.__spaceEngine!.clock.mode,
  }));
  expect(during.state.perf).toBe(before.state.perf);
  expect(during.mode).toBe('playing');
  expect(during.t - before.t).toBeGreaterThan(0.5);
  await input(page).press('Escape');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __searchRendering: { active: number } })
            .__searchRendering.active,
      ),
    )
    .toBe(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __searchRendering: { perf: number } })
            .__searchRendering.perf,
      ),
    )
    .toBeGreaterThan(before.state.perf);
  await open(page);
  await input(page).fill('Charon');
  await input(page).press('Enter');
  await expect(page).toHaveURL(/\/object\/moon\/charon\?/);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __searchRendering: { active: number } })
            .__searchRendering.active,
      ),
    )
    .toBe(0);
  const after = await page.evaluate(() => ({
    state: (
      window as unknown as {
        __searchRendering: { holds: number; releasedRoutes: string[] };
      }
    ).__searchRendering,
    same:
      window.__spaceEngine ===
      (window as unknown as { __originalSearchEngine: unknown })
        .__originalSearchEngine,
    focus: window.__spaceEngine!.focusedId,
    mode: window.__spaceEngine!.clock.mode,
  }));
  expect(after.state.holds).toBe(2);
  expect(after.state.releasedRoutes).toEqual(['/', '/object/moon/charon']);
  expect(after.same).toBe(true);
  expect(after.focus).toBe('moon:charon');
  expect(after.mode).toBe('playing');
});

test.describe('phone touch search', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  test('touch selects without hover and search stays usable in a shorter viewport', async ({
    page,
  }, info) => {
    await page.goto('/' + query);
    await ready(page);
    await page.getByRole('button', { name: 'Find a world', exact: true }).tap();
    await expect(input(page)).toBeFocused();
    await page.setViewportSize({ width: 390, height: 430 });
    await input(page).fill('moon:charon');
    const option = page.getByRole('option', {
      name: 'Charon, Moon',
      exact: true,
    });
    await expect(option).toBeVisible();
    const box = await page
      .getByRole('dialog', { name: 'Find a world' })
      .boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.y + box!.height).toBeLessThanOrEqual(430);
    await page.screenshot({
      path: info.outputPath('phone-short-viewport-search.png'),
    });
    await option.tap();
    await expect(page).toHaveURL(/\/object\/moon\/charon\?/);
    await expect(
      page.getByRole('heading', { name: 'Charon', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.__spaceEngine!.focusedId))
      .toBe('moon:charon');
  });
});
