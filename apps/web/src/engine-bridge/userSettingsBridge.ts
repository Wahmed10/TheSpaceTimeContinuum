import {
  DEFAULT_SETTINGS,
  loadUserSettings,
  prefersReducedMotion,
  saveUserSettings,
} from '../lib/userSettings';
import type { UserSettings } from '../lib/userSettings';
import { useEngineStore } from './useEngineStore';

export function initializeUserSettings(): () => void {
  let settings = { ...DEFAULT_SETTINGS };
  try {
    settings = loadUserSettings(window.localStorage);
  } catch {
    /* Storage access itself can be blocked. */
  }
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  useEngineStore.setState({
    distanceUnit: settings.distanceUnit,
    quality: settings.quality,
    reducedMotion: settings.reducedMotion,
    systemReducedMotion: media.matches,
  });
  document.documentElement.dataset.reducedMotion = String(
    prefersReducedMotion(settings.reducedMotion, media.matches),
  );
  function changed() {
    useEngineStore.setState({ systemReducedMotion: media.matches });
    const state = useEngineStore.getState();
    document.documentElement.dataset.reducedMotion = String(
      prefersReducedMotion(state.reducedMotion, media.matches),
    );
    state.engine?.setReducedMotion(
      prefersReducedMotion(state.reducedMotion, media.matches),
    );
  }
  media.addEventListener('change', changed);
  return () => {
    media.removeEventListener('change', changed);
    delete document.documentElement.dataset.reducedMotion;
  };
}
export function updateUserSettings(
  patch: Partial<Omit<UserSettings, 'version'>>,
) {
  useEngineStore.setState(patch);
  const state = useEngineStore.getState();
  document.documentElement.dataset.reducedMotion = String(
    prefersReducedMotion(state.reducedMotion, state.systemReducedMotion),
  );
  const settings: UserSettings = {
    version: 1,
    distanceUnit: state.distanceUnit,
    quality: state.quality,
    reducedMotion: state.reducedMotion,
  };
  try {
    saveUserSettings(window.localStorage, settings);
  } catch {
    /* Preferences remain usable in memory. */
  }
  if (patch.quality !== undefined) state.engine?.setQuality(state.quality);
  if (patch.reducedMotion !== undefined)
    state.engine?.setReducedMotion(
      prefersReducedMotion(state.reducedMotion, state.systemReducedMotion),
    );
}
