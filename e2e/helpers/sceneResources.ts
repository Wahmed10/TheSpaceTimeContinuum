import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Wait for actual focus-relevant curves and their GPU submission before measuring reuse. */
export async function settledSceneResources(page: Page) {
  await page.evaluate(async () => {
    const engine = window.__spaceEngine!;
    // Automatic quality may replace/dispose geometry during a reuse comparison.
    // Keep the current workload fixed rather than measuring that adaptation.
    engine.setQuality(engine.diagnostics().tier);
    engine.clock.pause();
    await engine.whenOrbitsSettled();
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const state = window.__spaceEngine!.diagnostics();
          return state.pendingTextures === 0 && state.chunks.pending === 0;
        }),
      { timeout: 60000 },
    )
    .toBe(true);
  await page.evaluate(async () => {
    await window.__spaceEngine!.whenOrbitsSettled();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}
