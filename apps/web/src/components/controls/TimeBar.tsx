'use client';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useEngineStore } from '../../engine-bridge/useEngineStore';
import {
  goLive,
  PLAYBACK_RATES,
  reversePlayback,
  setDateInput,
  setPlaybackRate,
  togglePlayback,
  UTC_DATE_MAX,
  UTC_DATE_MIN,
} from '../../engine-bridge/timeCommands';
import { preserveActiveFocus } from './popoverFocus';
const labels = [
  '1×',
  '10×',
  '1 min / s',
  '100×',
  '1 hour / s',
  '1 day / s',
  '1 month / s',
  '1 year / s',
];
export default function TimeBar() {
  const mode = useEngineStore((s) => s.mode),
    rate = useEngineStore((s) => s.rate),
    utcDate = useEngineStore((s) => s.utcDate),
    ready = useEngineStore((s) => s.ready),
    clamped = useEngineStore((s) => s.clockClamped);
  const [draft, setDraft] = useState<string | null>(null),
    [invalid, setInvalid] = useState(false);
  return (
    <section className="time-bar timeline" aria-label="Simulation time">
      <button
        className="play-toggle"
        aria-label={mode === 'paused' ? 'Play' : 'Pause'}
        disabled={!ready}
        onClick={togglePlayback}
      >
        {mode === 'paused' ? '▶' : 'Ⅱ'}
      </button>
      <Popover.Root>
        <Popover.Trigger
          className="time-trigger"
          aria-label="Choose simulation date"
          disabled={!ready}
        >
          <span className="time-mode">{mode.toUpperCase()}</span>
          <span id="clock-readout">
            {utcDate
              ? utcDate.replace('T', ' · ') + ' UTC'
              : 'Connecting to time'}
          </span>
          <span aria-hidden="true">⌃</span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="popover time-panel"
            aria-label="Time controls"
            side="top"
            sideOffset={12}
            align="center"
            collisionPadding={12}
            onCloseAutoFocus={preserveActiveFocus}
          >
            <h3>Travel through time</h3>
            <p>
              All dates and times are UTC, independent of your device timezone.
            </p>
            <div className="time-actions">
              <button
                className="secondary-button"
                aria-label="LIVE"
                aria-pressed={mode === 'live'}
                onClick={goLive}
              >
                LIVE
              </button>
              <button
                className="secondary-button"
                aria-label="Reverse time"
                aria-pressed={rate < 0}
                onClick={reversePlayback}
              >
                Reverse time
              </button>
            </div>
            <label className="setting-row">
              Playback speed
              <select
                aria-label="Playback speed"
                value={Math.abs(rate)}
                onChange={(e) =>
                  setPlaybackRate(Number(e.target.value) * Math.sign(rate || 1))
                }
              >
                {PLAYBACK_RATES.map((speed, i) => (
                  <option key={speed} value={speed}>
                    {rate < 0 ? '−' : ''}
                    {labels[i]}
                  </option>
                ))}
              </select>
            </label>
            <label className="utc-date-field">
              Simulation date in UTC
              <input
                aria-label="Simulation date in UTC"
                type="datetime-local"
                min={UTC_DATE_MIN}
                max={UTC_DATE_MAX}
                step="60"
                value={draft ?? utcDate}
                aria-invalid={invalid}
                aria-describedby="utc-date-guidance"
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft(value);
                  const accepted = setDateInput(value);
                  setInvalid(!accepted);
                  if (accepted) setDraft(null);
                }}
              />
            </label>
            <p id="utc-date-guidance">
              {invalid
                ? 'Choose a valid UTC date from 1900 through 2100. The current simulation time was kept.'
                : 'Supported dates: 1900 through 2100.'}
            </p>
            {clamped && (
              <p role="status">
                Playback reached the supported date boundary and paused. Choose
                another date or return to LIVE.
              </p>
            )}
            <Popover.Close className="secondary-button panel-close">
              Close time controls
            </Popover.Close>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {clamped && (
        <span className="sr-only" role="status">
          Playback paused at the supported date boundary.
        </span>
      )}
    </section>
  );
}
