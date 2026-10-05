import { MAX_UTC_MS, MIN_UTC_MS } from '@space/domain';

type TimeFunctions = Pick<
  typeof import('@space/astro'),
  'isoToTdb' | 'tdbToIso' | 'utcMsToTdb'
>;
interface UiTime extends TimeFunctions {
  minTdb: number;
  maxTdb: number;
}
let ready: UiTime | null = null;
let pending: Promise<UiTime> | null = null;

/** Load the exact scientific converters before publishing any engine to the UI. */
export function loadUiTime(): Promise<UiTime> {
  if (ready) return Promise.resolve(ready);
  if (!pending)
    pending = import('@space/astro')
      .then(({ isoToTdb, tdbToIso, utcMsToTdb }) => {
        ready = {
          isoToTdb,
          tdbToIso,
          utcMsToTdb,
          minTdb: utcMsToTdb(MIN_UTC_MS),
          maxTdb: utcMsToTdb(MAX_UTC_MS),
        };
        return ready;
      })
      .catch((error: unknown) => {
        pending = null;
        throw error;
      });
  return pending;
}

export function uiTime(): UiTime {
  if (!ready)
    throw new Error('UI time adapter must load before engine publication');
  return ready;
}
export const tdbToIso = (tdbSec: number): string => uiTime().tdbToIso(tdbSec);
export const utcMsToTdb = (utcMs: number): number => uiTime().utcMsToTdb(utcMs);
