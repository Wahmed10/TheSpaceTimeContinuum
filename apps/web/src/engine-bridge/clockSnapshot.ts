import type { ClockMode, ClockSnapshot } from '@space/astro';
import { uiTime } from './uiTimeAdapter';

/** Adapt the existing throttled clock sample without another subscription. */
export function clockUiState(
  snapshot: Readonly<ClockSnapshot>,
  previous: { mode: ClockMode; clockClamped: boolean },
  commandedMode?: ClockMode,
) {
  const { minTdb, maxTdb, tdbToIso } = uiTime();
  // A clamp may happen between 4 Hz samples. Its one-tick flag can already be
  // cleared when the next sample arrives, but the paused outward boundary and
  // preceding playback intent still identify it. Explicit commands reset it.
  const outwardBoundary =
    (snapshot.tdbSec === minTdb && snapshot.rate < 0) ||
    (snapshot.tdbSec === maxTdb && snapshot.rate > 0);
  return {
    mode: snapshot.mode,
    rate: snapshot.rate,
    utcDate: tdbToIso(snapshot.tdbSec).slice(0, 16),
    clockClamped:
      snapshot.clamped ||
      (snapshot.mode === 'paused' &&
        outwardBoundary &&
        ((commandedMode ?? previous.mode) === 'playing' ||
          (commandedMode === undefined && previous.clockClamped))),
  };
}
