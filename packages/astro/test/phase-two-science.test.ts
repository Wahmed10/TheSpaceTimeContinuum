import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { JupiterMoonsProvider } from '../src/ephemeris/JupiterMoonsProvider';
import { KeplerProvider } from '../src/ephemeris/KeplerProvider';
import { SampledEphemerisProvider } from '../src/ephemeris/SampledEphemerisProvider';
import { jdToTdb } from '../src/time/scales';
import { registerEphemerisCorrection } from '../src/ephemeris/ResidualTable';
const correction = readFileSync(
  new URL(
    '../../../apps/web/public/data/corrections/callisto.bin',
    import.meta.url,
  ),
);
registerEphemerisCorrection(
  'callisto',
  correction.buffer.slice(
    correction.byteOffset,
    correction.byteOffset + correction.byteLength,
  ),
);
function rows(name: string): number[][] {
  const fixture = JSON.parse(
    readFileSync(
      new URL(`./fixtures/phase-two/${name}.json`, import.meta.url),
      'utf8',
    ),
  ) as { rows: string[][] };
  return fixture.rows.map((row) => row.map(Number));
}
for (const moon of ['io', 'europa', 'ganymede', 'callisto'] as const)
  it(`${moon}: independent jovicentric Horizons error <500 km`, () => {
    const provider = new JupiterMoonsProvider(moon),
      out = new Float64Array(6);
    for (const row of moon === 'callisto'
      ? [...rows(moon), ...rows('callisto-holdout')]
      : rows(moon)) {
      expect(provider.stateAt(jdToTdb(row[0]!), out).ok).toBe(true);
      expect(
        Math.hypot(out[0]! - row[2]!, out[1]! - row[3]!, out[2]! - row[4]!),
        `JD ${row[0]}`,
      ).toBeLessThan(500);
    }
  });
it('Eros: two-body propagation matches independent Horizons within 1000 km at epoch +/-30 days', () => {
  const e = rows('eros-elements')[0]!,
    rad = Math.PI / 180;
  // Horizons KM-S element columns: JD, calendar, EC, QR, IN, OM, W, Tp, N, MA, TA, A, AD, PR.
  const a = e[11]!,
    meanMotion = e[8]! * rad;
  const provider = new KeplerProvider('eros', 'ICRF_HELIO', {
    epochTdbSec: jdToTdb(e[0]!),
    semiMajorAxisKm: a,
    eccentricity: e[2]!,
    inclinationRad: e[4]! * rad,
    ascendingNodeRad: e[5]! * rad,
    argumentOfPeriapsisRad: e[6]! * rad,
    meanAnomalyRad: e[9]! * rad,
    gravitationalParameterKm3PerSec2: meanMotion ** 2 * a ** 3,
  });
  const out = new Float64Array(6);
  for (const row of rows('eros-vectors')) {
    expect(provider.stateAt(jdToTdb(row[0]!), out).ok).toBe(true);
    const distance = Math.hypot(
      out[0]! - row[2]!,
      out[1]! - row[3]!,
      out[2]! - row[4]!,
    );
    expect(distance, `JD ${row[0]}`).toBeLessThan(
      row[0] === e[0] ? 0.001 : 1000,
    );
  }
});
for (const [name, frame, limitKm] of [
  ['voyager-cruise', 'ICRF_HELIO', 1],
  ['apophis-encounter', 'ICRF_BODY:earth', 0.1],
] as const)
  it(`${name}: Hermite interpolation meets independent holdout error ${limitKm} km`, () => {
    const data = rows(name),
      samples = data.filter((_, i) => i % 2 === 0);
    const provider = new SampledEphemerisProvider(name, frame, [
      {
        times: new Float64Array(samples.map((row) => jdToTdb(row[0]!))),
        states: new Float64Array(samples.flatMap((row) => row.slice(2, 8))),
        certainty: 'predicted',
      },
    ]);
    const out = new Float64Array(6);
    for (let i = 1; i < data.length; i += 2) {
      const row = data[i]!;
      expect(provider.stateAt(jdToTdb(row[0]!), out).ok).toBe(true);
      expect(
        Math.hypot(out[0]! - row[2]!, out[1]! - row[3]!, out[2]! - row[4]!),
      ).toBeLessThan(limitKm);
    }
  });
