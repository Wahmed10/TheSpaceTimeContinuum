import { utcMsToTdb } from '@space/astro';
import { useEngineStore } from './useEngineStore';
export function setDateUtc(ms: number) {
  useEngineStore.getState().engine?.clock.setTime(utcMsToTdb(ms));
}
