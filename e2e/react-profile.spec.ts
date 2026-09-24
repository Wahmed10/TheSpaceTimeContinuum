import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('accelerated playback keeps React commits below four per second', async ({
  page,
}) => {
  await page.goto('/lab/poc?renderer=webgl&test=1');
  await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
    timeout: 60000,
  });
  await page.evaluate(() => {
    window.__spaceEngine!.clock.play(86400);
    window.__spaceUiCommits = [];
  });
  const start = Date.now();
  await page.waitForTimeout(30000);
  const commits = await page.evaluate(() => window.__spaceUiCommits!);
  const seconds = (Date.now() - start) / 1000;
  // Permit the single commit that changes playback mode, beyond steady updates.
  expect(commits.length).toBeLessThanOrEqual(Math.ceil(seconds * 4) + 1);
  expect(commits.length).toBeGreaterThan(0);
  await writeFile(
    'docs/perf/react-profile.json',
    JSON.stringify(
      {
        seconds,
        playbackRate: 86400,
        commits: commits.length,
        commitsPerSecond: commits.length / seconds,
        method:
          'React Profiler onRender covering the complete Explore subtree in the development lab',
      },
      null,
      2,
    ),
  );
});
