import type { QualitySetting } from '@space/engine';
import type { DistanceUnit } from './formatEntity';

export type ReducedMotionSetting = 'system' | 'on' | 'off';
export interface UserSettings {
  version: 1;
  distanceUnit: DistanceUnit;
  quality: QualitySetting;
  reducedMotion: ReducedMotionSetting;
}
export const SETTINGS_KEY = 'continuum.settings.v1';
export const DEFAULT_SETTINGS: Readonly<UserSettings> = {
  version: 1,
  distanceUnit: 'km',
  quality: 'auto',
  reducedMotion: 'system',
};
export function parseUserSettings(raw: string | null): UserSettings {
  const defaults = { ...DEFAULT_SETTINGS };
  if (!raw || raw.length > 2048) return defaults;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return defaults;
    const record = value as Record<string, unknown>;
    if (record.version !== 1) return defaults;
    return {
      version: 1,
      distanceUnit: ['km', 'mi', 'AU'].includes(record.distanceUnit as string)
        ? (record.distanceUnit as DistanceUnit)
        : defaults.distanceUnit,
      quality: ['auto', 'low', 'medium', 'high', 'ultra'].includes(
        record.quality as string,
      )
        ? (record.quality as QualitySetting)
        : defaults.quality,
      reducedMotion: ['system', 'on', 'off'].includes(
        record.reducedMotion as string,
      )
        ? (record.reducedMotion as ReducedMotionSetting)
        : defaults.reducedMotion,
    };
  } catch {
    return defaults;
  }
}
export function loadUserSettings(
  storage: Pick<Storage, 'getItem'>,
): UserSettings {
  try {
    return parseUserSettings(storage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
export function saveUserSettings(
  storage: Pick<Storage, 'setItem'>,
  settings: UserSettings,
): boolean {
  try {
    // Revalidate and emit only known preference fields. Map/URL state is separate.
    storage.setItem(
      SETTINGS_KEY,
      JSON.stringify(parseUserSettings(JSON.stringify(settings))),
    );
    return true;
  } catch {
    return false;
  }
}
export function prefersReducedMotion(
  setting: ReducedMotionSetting,
  system: boolean,
): boolean {
  return setting === 'on' || (setting === 'system' && system);
}
