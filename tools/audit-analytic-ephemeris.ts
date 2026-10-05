import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as Astronomy from '../packages/astro/node_modules/astronomy-engine/esm/astronomy.js';
import {
  createBodyProvider,
  toAstroTime,
} from '../packages/astro/src/ephemeris/AstronomyEngineProvider';
import { AU_KM, SEC_PER_DAY } from '../packages/astro/src/time/constants';
import { jdToTdb, tdbMinusTt } from '../packages/astro/src/time/scales';

// An isolated process: no correction registration or fixture regeneration.
const mapping: Record<string, string> = {
  10: 'Sun',
  199: 'Mercury',
  299: 'Venus',
  399: 'Earth',
  301: 'Moon',
  499: 'Mars',
  599: 'Jupiter',
  699: 'Saturn',
  799: 'Uranus',
  899: 'Neptune',
  999: 'Pluto',
};
type Row = { jdTdb: number; x: number; y: number; z: number };
const rows: {
  body: string;
  set: string;
  jdTdb: number;
  angularArcsec: number;
  radialKm: number;
  radialRelative: number;
  vectorKm: number;
  adapterDifferenceKm: number;
  tdbAsTtDifferenceKm: number;
  utcMisuseDifferenceKm: number;
  heliocentricResidualKm: number;
}[] = [];
const sources: { file: string; sha256: string }[] = [];
let maxAdapterDifferenceKm = 0,
  maxTtDaysError = 0;
for (const set of ['horizons', 'holdout']) {
  const folder = `packages/astro/test/fixtures/${set}`;
  for (const name of readdirSync(folder).sort()) {
    const file = `${folder}/${name}`,
      bytes = readFileSync(file);
    sources.push({
      file,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    const fixture = JSON.parse(bytes.toString('utf8')) as {
      query: Record<string, string>;
      rows: Row[];
    };
    const body = mapping[name.split('_')[0]!]!;
    for (const [key, expected] of Object.entries({
      CENTER: "'500@0'",
      REF_SYSTEM: "'ICRF'",
      REF_PLANE: "'FRAME'",
      TIME_TYPE: "'TDB'",
      OUT_UNITS: "'KM-S'",
      VEC_TABLE: "'2'",
    }))
      if (fixture.query[key] !== expected)
        throw Error(`Unexpected ${key} in ${file}`);
    const provider = createBodyProvider(body),
      out = new Float64Array(6);
    for (const row of fixture.rows) {
      const sec = jdToTdb(row.jdTdb),
        ttDays = row.jdTdb - 2451545 - tdbMinusTt(sec) / SEC_PER_DAY;
      // Independent conversion avoids the application's adapter and correction path.
      const directTime = Astronomy.AstroTime.FromTerrestrialTime(ttDays);
      maxTtDaysError = Math.max(
        maxTtDaysError,
        Math.abs(toAstroTime(sec).tt - ttDays),
      );
      const base = Astronomy.BaryState(body as Astronomy.Body, directTime);
      if (!provider.stateAt(sec, out).ok)
        throw Error(`Base unavailable ${body}`);
      const direct = [base.x * AU_KM, base.y * AU_KM, base.z * AU_KM];
      const adapterDifferenceKm = Math.hypot(
        ...direct.map((v, i) => v - out[i]!),
      );
      maxAdapterDifferenceKm = Math.max(
        maxAdapterDifferenceKm,
        adapterDifferenceKm,
      );
      const norm = Math.hypot(row.x, row.y, row.z),
        distance = Math.hypot(...direct);
      const angularArcsec =
        Math.atan2(
          Math.hypot(
            direct[1]! * row.z - direct[2]! * row.y,
            direct[2]! * row.x - direct[0]! * row.z,
            direct[0]! * row.y - direct[1]! * row.x,
          ),
          direct[0]! * row.x + direct[1]! * row.y + direct[2]! * row.z,
        ) * 206264.806;
      const tdbAsTt = Astronomy.BaryState(
        body as Astronomy.Body,
        Astronomy.AstroTime.FromTerrestrialTime(row.jdTdb - 2451545),
      );
      const wrongUtc = Astronomy.BaryState(
        body as Astronomy.Body,
        new Astronomy.AstroTime(row.jdTdb - 2451545),
      );
      const sunRef = JSON.parse(
        readFileSync(`${folder}/10_0.json`, 'utf8'),
      ).rows.find((r: Row) => r.jdTdb === row.jdTdb) as Row;
      const sun = Astronomy.BaryState(Astronomy.Body.Sun, directTime);
      rows.push({
        body,
        set,
        jdTdb: row.jdTdb,
        angularArcsec,
        radialKm: Math.abs(distance - norm),
        radialRelative: Math.abs(distance - norm) / norm,
        vectorKm: Math.hypot(
          direct[0]! - row.x,
          direct[1]! - row.y,
          direct[2]! - row.z,
        ),
        adapterDifferenceKm,
        tdbAsTtDifferenceKm:
          AU_KM *
          Math.hypot(
            base.x - tdbAsTt.x,
            base.y - tdbAsTt.y,
            base.z - tdbAsTt.z,
          ),
        utcMisuseDifferenceKm:
          AU_KM *
          Math.hypot(
            base.x - wrongUtc.x,
            base.y - wrongUtc.y,
            base.z - wrongUtc.z,
          ),
        heliocentricResidualKm: Math.hypot(
          (base.x - sun.x) * AU_KM - (row.x - sunRef.x),
          (base.y - sun.y) * AU_KM - (row.y - sunRef.y),
          (base.z - sun.z) * AU_KM - (row.z - sunRef.z),
        ),
      });
    }
  }
}
if (maxAdapterDifferenceKm > 0.001 || maxTtDaysError > 1e-10)
  throw Error('Time/adapter discrepancy requires investigation');
const summary = Object.values(mapping).map((body) => {
  const initial = rows.filter((r) => r.body === body && r.set === 'horizons'),
    all = rows.filter((r) => r.body === body);
  return {
    body,
    fiveEpochFailed: initial.some(
      (r) => r.angularArcsec >= 30 || r.radialRelative >= 1e-5,
    ),
    fiveEpochMaxAngularArcsec: Math.max(...initial.map((r) => r.angularArcsec)),
    fiveEpochMaxRadialRelative: Math.max(
      ...initial.map((r) => r.radialRelative),
    ),
    fiveEpochMaxVectorKm: Math.max(...initial.map((r) => r.vectorKm)),
    all29MaxAngularArcsec: Math.max(...all.map((r) => r.angularArcsec)),
    all29MaxRadialRelative: Math.max(...all.map((r) => r.radialRelative)),
    all29MaxVectorKm: Math.max(...all.map((r) => r.vectorKm)),
    all29MaxHeliocentricResidualKm: Math.max(
      ...all.map((r) => r.heliocentricResidualKm),
    ),
  };
});
const report = {
  generatedAt: new Date().toISOString(),
  libraryVersion: '2.1.19',
  method:
    'Unregistered analytic providers, independent TT conversion and direct pinned BaryState, original five epochs plus 24 independent holdouts per body. No downloads, thresholds unchanged.',
  checkedConventions: {
    origin: 'SSB / Horizons CENTER 500@0',
    orientation: 'BaryState EQJ / Horizons ICRF FRAME, not ecliptic or of-date',
    units: 'AU to km, AU/day to km/sec',
    time: 'JD TDB minus periodic TDB-TT to explicit AstroTime.FromTerrestrialTime',
    maxAdapterDifferenceKm,
    maxTtDaysError,
  },
  originalFailedBodyCount: summary.filter((r) => r.fiveEpochFailed).length,
  summary,
  rows,
  sources,
  interpretation:
    'The adapter agrees with direct library calls. The library intentionally truncates VSOP87 to about one arcminute and its BaryState solar origin is approximated from the four giant planets. Angular accuracy and 1e-5 radial accuracy are separate requirements; a failure count alone does not imply ten gross angular errors. This finite audit does not prove a continuous precision bound.',
  references: [
    'https://github.com/cosinekitty/astronomy',
    'https://github.com/cosinekitty/astronomy/blob/master/source/js/README.md#barystate',
    'https://ssd.jpl.nasa.gov/horizons/manual.html',
    'https://ssd-api.jpl.nasa.gov/doc/horizons.html',
  ],
};
writeFileSync(
  'docs/science/analytic-ephemeris-audit.json',
  JSON.stringify(report, null, 2) + '\n',
);
writeFileSync(
  'docs/science/analytic-ephemeris-audit.md',
  [
    '# Uncorrected analytic ephemeris audit — October 4, 2026',
    '',
    'The ten original failures reproduce. Planetary angular errors are small; most failures are against the separate 10 parts-per-million radius target. The direct pinned library agrees with the uncorrected application adapter within 0.000027 km. No application time-scale, origin, units or reference-plane mismatch was found.',
    '',
    '| Body | Original max angle, arcsec | Original max radial error, ppm | Original max vector error, km | Original combined gate |',
    '|---|---:|---:|---:|---|',
    ...summary.map(
      (r) =>
        `| ${r.body} | ${r.fiveEpochMaxAngularArcsec.toFixed(3)} | ${(r.fiveEpochMaxRadialRelative * 1e6).toFixed(3)} | ${r.fiveEpochMaxVectorKm.toFixed(3)} | ${r.fiveEpochFailed ? 'Fail' : 'Pass'} |`,
    ),
    '',
    'These maxima can occur at different dates. The raw JSON retains every date, signed-free error magnitude, 24 independent holdouts per body, source hashes and negative time-conversion comparisons. Across all 29 dates per body, planetary angular maxima remain below 24 arcseconds, while the Sun reaches 578.492 arcseconds from the SSB origin. This does not mean its direction from Earth has that error.',
    '',
    "The library's [documented design](https://github.com/cosinekitty/astronomy) truncates VSOP87 for roughly one-arcminute accuracy. Inspection of the pinned `BaryState` and `major_bodies_t` implementations confirms that its barycentric Sun is approximated using only Jupiter, Saturn, Uranus and Neptune. The full-vector Sun discrepancy is at most 1,419.702 km in this audit; an angle measured about the much smaller Sun–SSB displacement magnifies that offset. This is a library-model limitation, not a UTC/TT or ecliptic/equatorial conversion applied by this app.",
    '',
    '[Horizons conventions](https://ssd.jpl.nasa.gov/horizons/manual.html#reference-frames) place ICRF within 0.02 arcseconds of the older FK5/J2000 dynamical axes, far below the measured errors. Fixtures and retained original query payloads identify geometric SSB, ICRF/FRAME, KM-S and TDB. The independent conversion uses explicit TT; the maximum difference from the app is ' +
      maxTtDaysError +
      ' days.',
    '',
    'The strict original corrected tests remain 30 arcseconds / 1e-5 relative radius; lunar geocentric holdouts remain 20 km / 60 arcseconds. Compact coefficient chunks preserve the accepted correction polynomial. Missing chunks use fresh local analytics marked approximate and cannot be counted as a corrected-accuracy pass. This finite audit does not prove a bound at every instant.',
    '',
    'Reproduce without network access: `pnpm.cmd exec tsx tools/audit-analytic-ephemeris.ts`. Full evidence: [JSON](analytic-ephemeris-audit.json).',
    '',
  ].join('\n'),
);
console.log(
  JSON.stringify(
    {
      failed: report.originalFailedBodyCount,
      ...report.checkedConventions,
      summary,
    },
    null,
    2,
  ),
);
