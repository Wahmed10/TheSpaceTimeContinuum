import { describe, expect, it } from 'vitest';
import {
  MAX_UTC_MS,
  MIN_UTC_MS,
  SimulationClock,
  utcMsToTdb,
} from '@space/astro';
import { clockUiState } from '../src/engine-bridge/clockSnapshot';

const previous = { mode: 'playing', clockClamped: false } as const;

describe('clock boundary display across throttled samples', () => {
  it.each([
    [MIN_UTC_MS, -1],
    [MAX_UTC_MS, 1],
  ])(
    'retains a clamp at %s that occurred between clock events',
    (utc, rate) => {
      let now = Date.UTC(2026, 0, 1);
      const clock = new SimulationClock(() => now);
      clock.setTime(utcMsToTdb(utc));
      let displayed = clockUiState(clock.state, previous, 'paused');
      clock.subscribe((sample) => {
        displayed = clockUiState(sample, displayed);
      });
      clock.play(rate);
      clock.tick(); // Starts the 250 ms sampling interval.
      displayed = clockUiState(clock.state, displayed, clock.mode);
      now += 50;
      clock.tick(); // Clamps without emitting a sample.
      expect(clock.state.clamped).toBe(true);
      expect(displayed.clockClamped).toBe(false);
      now += 250;
      clock.tick(); // The transient clamp flag is already false.
      expect(clock.state.clamped).toBe(false);
      expect(displayed.mode).toBe('paused');
      expect(displayed.clockClamped).toBe(true);
      now += 250;
      clock.tick();
      expect(displayed.clockClamped).toBe(true);
      // Deliberately choosing the same boundary is a valid reset, not a clamp.
      clock.setTime(utcMsToTdb(utc));
      displayed = clockUiState(clock.state, displayed, clock.mode);
      expect(displayed.clockClamped).toBe(false);
    },
  );

  it.each([
    [MIN_UTC_MS, -1],
    [MAX_UTC_MS, 1],
  ])(
    'keeps playback intent across extra route snapshot ticks at %s',
    (utc, rate) => {
      let now = Date.UTC(2026, 0, 1);
      const clock = new SimulationClock(() => now);
      clock.setTime(utcMsToTdb(utc));
      clock.play(rate);
      const intent = clock.mode;
      now += 100;
      clock.tick();
      clock.tick();
      expect(clock.state.clamped).toBe(false);
      expect(clockUiState(clock.state, previous, intent).clockClamped).toBe(
        true,
      );
    },
  );

  it('does not invent notices for deliberately paused boundary dates', () => {
    const clock = new SimulationClock();
    clock.setTime(utcMsToTdb(MIN_UTC_MS));
    expect(
      clockUiState(clock.state, { mode: 'paused', clockClamped: false })
        .clockClamped,
    ).toBe(false);
  });

  it('clears a retained notice after returning to LIVE or leaving the boundary', () => {
    const clock = new SimulationClock();
    clock.setTime(utcMsToTdb(Date.UTC(2000, 0, 1)));
    const retained = { mode: 'paused', clockClamped: true } as const;
    expect(clockUiState(clock.state, retained).clockClamped).toBe(false);
    clock.goLive({ animate: false });
    clock.tick();
    expect(clockUiState(clock.state, retained, 'live').clockClamped).toBe(
      false,
    );
  });
});
