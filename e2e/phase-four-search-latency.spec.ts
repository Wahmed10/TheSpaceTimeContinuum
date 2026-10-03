import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

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
// Measure UI presentation on a physical GPU. Functional suites retain their
// SwiftShader configuration; its frame pacing cannot establish device timing.
// Fail closed below if the browser silently falls back to software rendering.
test.use({
  actionTimeout: 10000,
  trace: 'off',
  video: 'off',
  screenshot: 'off',
  launchOptions: {
    args: process.platform === 'win32' ? ['--use-angle=d3d11'] : [],
  },
});
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on('pageerror', (error) => collected.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

for (const profile of ['desktop', 'phone'] as const)
  test.describe(`${profile} search latency`, () => {
    test.use(
      profile === 'phone'
        ? {
            viewport: { width: 390, height: 844 },
            isMobile: true,
            hasTouch: true,
          }
        : { viewport: { width: 1440, height: 1000 } },
    );
    test('settled production input/results and semantic selection respond within 300 ms', async ({
      page,
    }, info) => {
      await page.goto('/' + query);
      await ready(page);
      await page.evaluate(async () => {
        const engine = window.__spaceEngine!;
        engine.setQuality('low');
        engine.setReducedMotion(true);
        await engine.whenLayersSettled();
      });
      await expect
        .poll(() =>
          page.evaluate(
            () => window.__spaceEngine!.diagnostics().pendingTextures,
          ),
        )
        .toBe(0);
      await page.waitForTimeout(750);
      await open(page);
      await page.evaluate(() => {
        const samples = {
          input: [] as {
            query: string;
            milliseconds: number;
            domCommitMs: number;
            frameWaitMs: number;
          }[],
          selection: [] as {
            id: string;
            milliseconds: number;
            semanticCommitMs: number;
            frameWaitMs: number;
          }[],
        };
        Object.assign(window, { __searchSamples: samples });
        const longTasks: { start: number; duration: number }[] = [];
        Object.assign(window, { __searchLongTasks: longTasks });
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            longTasks.push({
              start: entry.startTime,
              duration: entry.duration,
            });
        });
        observer.observe({ type: 'longtask' });
        let pendingInput: { query: string; start: number } | null = null,
          pendingSelection: { id: string; name: string; start: number } | null =
            null;
        let inputCommitted: number | null = null,
          selectionCommitted: number | null = null;
        let frame = false;
        function check() {
          const list = document.querySelector<HTMLElement>('[role=listbox]');
          if (pendingInput && list?.dataset.query === pendingInput.query)
            inputCommitted ??= performance.now();
          if (pendingSelection) {
            const [kind, slug] = pendingSelection.id.split(':');
            const card = document.querySelector('.object-card');
            if (
              location.pathname === `/object/${kind}/${slug}` &&
              card?.getAttribute('aria-label') ===
                `${pendingSelection.name} details` &&
              window.__spaceEngine!.focusedId === pendingSelection.id
            )
              selectionCommitted ??= performance.now();
          }
          if (frame) return;
          frame = true;
          requestAnimationFrame(() => {
            frame = false;
            const list = document.querySelector<HTMLElement>('[role=listbox]');
            if (pendingInput && list?.dataset.query === pendingInput.query) {
              samples.input.push({
                query: pendingInput.query,
                milliseconds: performance.now() - pendingInput.start,
                domCommitMs:
                  (inputCommitted ?? performance.now()) - pendingInput.start,
                frameWaitMs:
                  performance.now() - (inputCommitted ?? performance.now()),
              });
              pendingInput = null;
              inputCommitted = null;
            }
            if (pendingSelection) {
              const [kind, slug] = pendingSelection.id.split(':');
              const card = document.querySelector('.object-card');
              if (
                location.pathname === `/object/${kind}/${slug}` &&
                card?.getAttribute('aria-label') ===
                  `${pendingSelection.name} details` &&
                window.__spaceEngine!.focusedId === pendingSelection.id
              ) {
                samples.selection.push({
                  id: pendingSelection.id,
                  milliseconds: performance.now() - pendingSelection.start,
                  semanticCommitMs:
                    (selectionCommitted ?? performance.now()) -
                    pendingSelection.start,
                  frameWaitMs:
                    performance.now() -
                    (selectionCommitted ?? performance.now()),
                });
                pendingSelection = null;
                selectionCommitted = null;
              }
            }
          });
        }
        document.addEventListener(
          'input',
          (event) => {
            const target = event.target as HTMLInputElement;
            if (target.getAttribute('role') === 'combobox') {
              pendingInput = { query: target.value, start: performance.now() };
              inputCommitted = null;
            }
          },
          true,
        );
        document.addEventListener(
          'keydown',
          (event) => {
            const target = event.target as HTMLElement;
            if (
              event.key === 'Enter' &&
              target.getAttribute('role') === 'combobox'
            ) {
              const id = document
                .getElementById(
                  target.getAttribute('aria-activedescendant') ?? '',
                )
                ?.getAttribute('data-entity-id');
              const name = id
                ? window.__spaceEngine!.getEntity(id)?.name
                : undefined;
              if (id && name) {
                pendingSelection = { id, name, start: performance.now() };
                selectionCommitted = null;
              }
            }
          },
          true,
        );
        new MutationObserver(check).observe(document.documentElement, {
          subtree: true,
          attributes: true,
          childList: true,
          characterData: true,
        });
        const push = history.pushState.bind(history);
        history.pushState = (data, unused, url) => {
          const result = push(data, unused, url);
          check();
          return result;
        };
      });
      const texts = [
        'Mars',
        'Europa',
        'Pluto',
        'Charon',
        'Earth',
        'Mercury',
        'planet:jupiter',
        'Luna',
        'Terra',
        'Chraon',
        'Euorpa',
        'not available',
      ];
      for (let i = 0; i < 24; i++) {
        await input(page).fill(texts[i % texts.length]!);
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                (window as unknown as { __searchSamples: { input: unknown[] } })
                  .__searchSamples.input.length,
            ),
          )
          .toBe(i + 1);
      }
      const choices = ['Mars', 'Europa', 'Pluto', 'Charon', 'Earth', 'Mercury'];
      for (let i = 0; i < choices.length; i++) {
        if (i) await open(page);
        await input(page).fill(choices[i]!);
        await expect(page.getByRole('option').first()).toHaveAttribute(
          'aria-selected',
          'true',
        );
        await input(page).press('Enter');
        await expect
          .poll(() =>
            page.evaluate(
              () =>
                (
                  window as unknown as {
                    __searchSamples: { selection: unknown[] };
                  }
                ).__searchSamples.selection.length,
            ),
          )
          .toBe(i + 1);
      }
      const measured = await page.evaluate(() => {
        const gl = document
          .querySelector<HTMLCanvasElement>('canvas')!
          .getContext('webgl2');
        const extension = gl?.getExtension('WEBGL_debug_renderer_info');
        const adapter = extension
          ? String(gl!.getParameter(extension.UNMASKED_RENDERER_WEBGL))
          : '';
        return {
          samples: (
            window as unknown as {
              __searchSamples: {
                input: { query: string; milliseconds: number }[];
                selection: { id: string; milliseconds: number }[];
              };
            }
          ).__searchSamples,
          userAgent: navigator.userAgent,
          hardwareConcurrency: navigator.hardwareConcurrency,
          viewport: {
            width: innerWidth,
            height: innerHeight,
            devicePixelRatio,
          },
          renderer: window.__spaceEngine!.backend,
          adapter,
          softwareRenderer: /swiftshader|llvmpipe|software/i.test(adapter),
          tier: window.__spaceEngine!.diagnostics().tier,
          visibility: document.visibilityState,
          longTasks: (
            window as unknown as {
              __searchLongTasks: { start: number; duration: number }[];
            }
          ).__searchLongTasks,
        };
      });
      const report = {
        generatedAt: new Date().toISOString(),
        profile,
        method:
          'Warm production page on a verified physical WebGL2 GPU, no network/CPU throttling or trace/video/screenshot recorder. Windows selects ANGLE/D3D11; other platforms use the default adapter. Missing/known software adapters fail the gate. Phone is viewport/touch emulation on the recorded desktop GPU, not physical phone throughput. One cached local index. Renderer layers/textures settled, LOW/reduced-motion. Production search holds the last 3D frame during modal interaction, then resumes submission after canonical route/card paint; simulation time continues. No test-only rendering suspension. Input event to first animation-frame opportunity after result DOM commit; Enter to canonical route/card/engine target at a frame opportunity. Browser automation transport and flight completion excluded. DOM/semantic commit and subsequent frame wait diagnose the same total-response gate. Separate SwiftShader functional/failure evidence is retained.',
        instrumentation: { trace: 'off', video: 'off', screenshot: 'off' },
        thresholdMs: 300,
        ...measured,
      };
      writeFileSync(
        info.outputPath('search-response.json'),
        JSON.stringify(report, null, 2) + '\n',
      );
      writeFileSync(
        `docs/perf/phase-four/search-response-${profile}.json`,
        JSON.stringify(report, null, 2) + '\n',
      );
      expect(measured.samples.input.length).toBeGreaterThanOrEqual(24);
      expect(measured.samples.selection).toHaveLength(6);
      expect(measured.visibility).toBe('visible');
      expect(measured.adapter).not.toBe('');
      expect(measured.softwareRenderer).toBe(false);
      expect(
        Math.max(
          ...measured.samples.input.map((sample) => sample.milliseconds),
        ),
      ).toBeLessThanOrEqual(300);
      expect(
        Math.max(
          ...measured.samples.selection.map((sample) => sample.milliseconds),
        ),
      ).toBeLessThanOrEqual(300);
    });
  });
