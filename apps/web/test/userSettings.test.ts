import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadUserSettings,
  parseUserSettings,
  prefersReducedMotion,
  saveUserSettings,
} from '../src/lib/userSettings';
describe('versioned consumer preferences', () => {
  it.each([
    null,
    '',
    '{',
    'null',
    '[]',
    '3',
    '{}',
    '{"version":2}',
    ' '.repeat(2049),
  ])('recovers from invalid storage %s', (raw) => {
    expect(parseUserSettings(raw)).toEqual(DEFAULT_SETTINGS);
  });
  it('restores only validated preference fields and excludes semantic URL state', () => {
    expect(
      parseUserSettings(
        JSON.stringify({
          version: 1,
          distanceUnit: 'mi',
          quality: 'low',
          reducedMotion: 'on',
          layers: [],
          frame: 'FIXED:earth',
          scale: 'true',
          t: '1999',
        }),
      ),
    ).toEqual({
      version: 1,
      distanceUnit: 'mi',
      quality: 'low',
      reducedMotion: 'on',
    });
    expect(
      parseUserSettings(
        '{"version":1,"distanceUnit":"AU","quality":"bad","reducedMotion":true}',
      ),
    ).toEqual({ ...DEFAULT_SETTINGS, distanceUnit: 'AU' });
  });
  it('keeps defaults isolated and recovers when reads are blocked', () => {
    const a = parseUserSettings(null);
    a.distanceUnit = 'mi';
    expect(
      loadUserSettings({
        getItem() {
          throw Error('blocked');
        },
      }),
    ).toEqual(DEFAULT_SETTINGS);
  });
  it('writes the known schema and reports quota failures without throwing', () => {
    const calls: string[][] = [];
    expect(
      saveUserSettings(
        {
          setItem(k, v) {
            calls.push([k, v]);
          },
        },
        { ...DEFAULT_SETTINGS, distanceUnit: 'AU', reducedMotion: 'off' },
      ),
    ).toBe(true);
    expect(calls).toEqual([
      [
        SETTINGS_KEY,
        '{"version":1,"distanceUnit":"AU","quality":"auto","reducedMotion":"off"}',
      ],
    ]);
    expect(
      saveUserSettings(
        {
          setItem() {
            throw Error('quota');
          },
        },
        { ...DEFAULT_SETTINGS },
      ),
    ).toBe(false);
  });
  it.each([
    ['system', false, false],
    ['system', true, true],
    ['on', false, true],
    ['on', true, true],
    ['off', true, false],
    ['off', false, false],
  ] as const)('resolves %s with system=%s', (setting, system, resolved) => {
    expect(prefersReducedMotion(setting, system)).toBe(resolved);
  });
});
