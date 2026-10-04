import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import {
  closeSettings,
  closeTime,
  openSettings,
  openTime,
} from './helpers/consumerControls';
const query = '?renderer=webgl&test=1&t=2026-10-02T12%3A00%3A00Z';
type HistoryWrite = { at: number; href: string; nextInternal: boolean };
declare global {
  interface Window {
    __spaceProfileHistoryWrites: HistoryWrite[];
  }
}

for (const state of ['overview', 'card-and-list'] as const) {
  test(`complete Explore subtree stays at most four commits/sec during 30s accelerated ${state}`, async ({
    page,
  }, info) => {
    test.setTimeout(150000);
    await page.goto(
      (state === 'overview' ? '/' : '/object/planet/jupiter') + query,
    );
    await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true', {
      timeout: 60000,
    });
    // Profiler must demonstrably be active: a standard production build cannot pass
    // using an empty callback array. Runner uses isolated next build --profile.
    await page.evaluate(() => {
      window.__spaceConsumerCommits = [];
    });
    await openSettings(page);
    await closeSettings(page);
    await expect
      .poll(() => page.evaluate(() => window.__spaceConsumerCommits!.length))
      .toBeGreaterThan(0);
    await page.evaluate(() => {
      const writes: HistoryWrite[] = [];
      window.__spaceProfileHistoryWrites = writes;
      const original = history.replaceState.bind(history);
      history.replaceState = (data, unused, url) => {
        const target = new URL(url?.toString() ?? location.href, location.href);
        writes.push({
          at: performance.now(),
          href: target.pathname + target.search,
          nextInternal: data?.__NA === true,
        });
        return original(data, unused, url);
      };
    });
    await openTime(page);
    await page
      .getByRole('combobox', { name: 'Playback speed', exact: true })
      .selectOption('86400');
    await closeTime(page);
    if (state === 'card-and-list') {
      await page.evaluate(() => {
        window.__spaceEngine!.setScale('true');
        window.__spaceEngine!.setReferenceDistance(1e7);
      });
      await openSettings(page);
      await page
        .getByRole('button', { name: 'Objects in view', exact: true })
        .click();
      await expect(page.locator('.object-list-choice').first()).toBeVisible();
    }
    // Rate changes capture the current paused date, so playback need not change
    // the URL timestamp. Wait for the real explicit-command replacement AND
    // Next's matching internal replacement before measuring recurring work.
    await expect
      .poll(() => page.evaluate(() => window.__spaceEngine!.clock.rate))
      .toBe(86400);
    await expect
      .poll(() => page.evaluate(() => window.__spaceEngine!.clock.mode))
      .toBe('playing');
    if (state === 'card-and-list') {
      await expect
        .poll(() => new URL(page.url()).searchParams.get('scale'))
        .toBe('true');
    }
    await expect
      .poll(() =>
        page.evaluate(() => {
          const href = location.pathname + location.search;
          const writes = window.__spaceProfileHistoryWrites;
          const external = writes.findLastIndex(
            (write) => !write.nextInternal && write.href === href,
          );
          return (
            external >= 0 &&
            writes
              .slice(external + 1)
              .some((write) => write.nextInternal && write.href === href)
          );
        }),
      )
      .toBe(true);
    await page.evaluate(
      () =>
        new Promise<void>((done) =>
          requestAnimationFrame(() => requestAnimationFrame(() => done())),
        ),
    );
    const start = await page.evaluate(() => {
      window.__spaceConsumerCommits = [];
      const clock = window.__spaceEngine!.clock;
      return {
        at: performance.now(),
        mode: clock.mode,
        rate: clock.rate,
        tdbSec: clock.tick(),
        cardCount: document.querySelectorAll('.object-card').length,
        listCount: document.querySelectorAll('.object-list-choice').length,
        setupWrites: [...window.__spaceProfileHistoryWrites],
        historyWriteCount: window.__spaceProfileHistoryWrites.length,
      };
    });
    await page.waitForTimeout(30000);
    const measurement = await page.evaluate((initial) => {
      const startTime = initial.at;
      const end = performance.now(),
        timestamps = window.__spaceConsumerCommits!.filter(
          (t) => t >= startTime && t < startTime + 30000,
        );
      const bins = Array.from(
        { length: 30 },
        (_, i) =>
          timestamps.filter(
            (t) => t >= startTime + i * 1000 && t < startTime + (i + 1) * 1000,
          ).length,
      );
      return {
        start: startTime,
        end,
        observedSeconds: (end - startTime) / 1000,
        windowSeconds: 30,
        timestamps,
        bins,
        commits: timestamps.length,
        commitsPerSecond: timestamps.length / 30,
        maxPerSecond: Math.max(...bins),
        initial,
        final: {
          mode: window.__spaceEngine!.clock.mode,
          rate: window.__spaceEngine!.clock.rate,
          tdbSec: window.__spaceEngine!.clock.tick(),
          cardCount: document.querySelectorAll('.object-card').length,
          listCount: document.querySelectorAll('.object-list-choice').length,
        },
        measuredHistoryWrites: window.__spaceProfileHistoryWrites.slice(
          initial.historyWriteCount,
        ),
      };
    }, start);
    const output = {
      state,
      playbackRate: 86400,
      build:
        'isolated Next production --profile; separate from normal production timing/bundle gates',
      method:
        'React Profiler wraps complete Explore subtree, including portal children/card/list; active callback health check, actual external/Next-internal setup replacements and two paint callbacks, fixed 30sec window and thirty one-second bins. Public clock proves playing86400 and time advancement at both boundaries; no history writes during measurement.',
      ...measurement,
    };
    const file = info.outputPath(`react-${state}.json`);
    await writeFile(file, JSON.stringify(output, null, 2));
    await info.attach('complete-subtree-react-profile', {
      path: file,
      contentType: 'application/json',
    });
    expect(measurement.observedSeconds).toBeGreaterThanOrEqual(30);
    expect(measurement.commitsPerSecond).toBeLessThanOrEqual(4);
    expect(measurement.maxPerSecond).toBeLessThanOrEqual(4);
    expect(measurement.commits).toBeGreaterThan(0);
    expect(measurement.initial.mode).toBe('playing');
    expect(measurement.final.mode).toBe('playing');
    expect(measurement.initial.rate).toBe(86400);
    expect(measurement.final.rate).toBe(86400);
    expect(
      measurement.final.tdbSec - measurement.initial.tdbSec,
    ).toBeGreaterThanOrEqual(29 * 86400);
    expect(measurement.measuredHistoryWrites).toEqual([]);
    if (state === 'card-and-list') {
      expect(measurement.initial.cardCount).toBe(1);
      expect(measurement.final.cardCount).toBe(1);
      expect(measurement.initial.listCount).toBeGreaterThan(0);
      expect(measurement.final.listCount).toBeGreaterThan(0);
    }
  });
}
