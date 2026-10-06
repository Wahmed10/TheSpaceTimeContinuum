import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Wait for actual focus-relevant curves and their GPU submission before measuring reuse. */
export async function settledSceneResources(page: Page) {
  await page.evaluate(async () => {
    const engine = window.__spaceEngine!;
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
