import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Screenshot-only readiness. Consumer startup keeps rendering progressively. */
export async function freezeRenderedView(
  page: Page,
  id: string,
  command: () => Promise<unknown>,
  requireComputed = false,
) {
  // A phase/reference pose needs fresh physical coordinates before it is set.
  const position = expect.poll(
    () =>
      page.evaluate((id) => window.__spaceEngine!.getPositionStatus(id), id),
    { timeout: 30000 },
  );
  if (requireComputed) await position.toBe('ready');
  else await position.not.toBe('loading');
  const beforeFrames = await page.evaluate(
    () => window.__spaceEngine!.diagnostics().renderedFrames,
  );
  await command();
  return page.evaluate(
    async ({ id, beforeFrames, requireComputed }) => {
      const engine = window.__spaceEngine!;
      const deadline = performance.now() + 30000;
      let previousFrame = -1,
        previousPose = '',
        stableFrames = 0;
      while (performance.now() < deadline) {
        await new Promise<void>((done) => requestAnimationFrame(() => done()));
        const current = engine.diagnostics();
        if (current.renderedFrames === previousFrame) continue;
        previousFrame = current.renderedFrames;
        const pose = JSON.stringify(current.cameraWorld);
        stableFrames = pose === previousPose ? stableFrames + 1 : 0;
        previousPose = pose;
        const target = current.lod.find((row) => row.id === id);
        const canvas = document.querySelector('canvas')!;
        const center = current.focusScreen;
        if (
          stableFrames >= 1 &&
          current.renderedFrames >= beforeFrames + 2 &&
          engine.focusedId === id &&
          (requireComputed
            ? engine.getPositionStatus(id) === 'ready'
            : engine.getPositionStatus(id) !== 'loading') &&
          current.renderedEpoch === engine.clock.state.tdbSec &&
          current.renderedRevision === current.sceneRevision &&
          target?.visible &&
          target.level >= 2 &&
          center &&
          Math.hypot(
            center.x - canvas.clientWidth / 2,
            center.y - canvas.clientHeight / 2,
          ) <= 1 &&
          current.pendingTextures === 0
        ) {
          engine.setRendering(false);
          return {
            id,
            beforeFrames,
            renderedFrames: current.renderedFrames,
            renderedEpoch: current.renderedEpoch,
            renderedRevision: current.renderedRevision,
            sceneRevision: current.sceneRevision,
            cameraWorld: current.cameraWorld,
            center,
            target,
            textureState: current.textureState,
          };
        }
      }
      throw Error(
        'Requested view did not render: ' +
          JSON.stringify({
            id,
            focus: engine.focusedId,
            diagnostics: engine.diagnostics(),
          }),
      );
    },
    { id, beforeFrames, requireComputed },
  );
}
