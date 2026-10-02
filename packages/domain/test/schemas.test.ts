import { expect, it } from 'vitest';
import { frameIdSchema, mapStateSchema } from '../src/schemas';

it.each([
  'ICRF_SSB',
  'ICRF_HELIO',
  'ICRF_EMB',
  'TEME_EARTH',
  'ICRF_BODY:earth',
  'FIXED:mars',
  'ICRF_BODY:registered/sat:25544',
])(
  'accepts typed frame syntax %s independently of catalog membership',
  (frame) => {
    expect(frameIdSchema.safeParse(frame).success).toBe(true);
    expect(mapStateSchema.parse({ focus: 'sat:25544', frame }).frame).toBe(
      frame,
    );
  },
);
it.each([
  'earth',
  'arbitrary',
  'FIXED:',
  'ICRF_BODY:',
  'FIXED:../earth',
  'FIXED:earth ',
  'ICRF_BODY:Earth',
  'ICRF_BODY:a//b',
  'FIXED:' + 'a'.repeat(80),
])('rejects invalid frame syntax %s', (frame) => {
  expect(frameIdSchema.safeParse(frame).success).toBe(false);
});
it('retains future event MapState contracts', () => {
  expect(
    mapStateSchema.safeParse({
      focus: 'sb:433-eros',
      secondary: 'planet:earth',
      frame: 'ICRF_BODY:earth',
      camera: { preset: 'fit-both' },
      playback: {
        from: '2026-10-02T00:00:00Z',
        to: '2026-10-03T00:00:00Z',
        rate: 86400,
      },
    }).success,
  ).toBe(true);
});
