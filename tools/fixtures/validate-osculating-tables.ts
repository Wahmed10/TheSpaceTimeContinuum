import { readFile, writeFile } from 'node:fs/promises';
import { OsculatingElementsProvider } from '../../packages/astro/src/ephemeris/OsculatingElementsProvider';
import { jdToTdb } from '../../packages/astro/src/time/scales';
import type { FrameId } from '../../packages/domain/src/types';
const results = [];
for (const [name, limitKm] of [
  ['phobos', 100],
  ['deimos', 100],
  ['titan', 1000],
  ['triton', 500],
  ['charon', 100],
  ['ceres', 1000],
] as const) {
  const buffer = await readFile(`apps/web/public/data/orbits/${name}.bin`);
  const metadata = JSON.parse(
    await readFile(
      `apps/web/public/data/orbits/${name}.provenance.json`,
      'utf8',
    ),
  ) as { frame: FrameId; stepDays: number };
  const provider = new OsculatingElementsProvider(
    name,
    metadata.frame,
    buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ),
  );
  const fixture = JSON.parse(
    await readFile(
      `packages/astro/test/fixtures/phase-two/${name}-osculating-holdout.json`,
      'utf8',
    ),
  ) as { rows: string[][] };
  const out = new Float64Array(6);
  let maxErrorKm = 0,
    sumSquares = 0,
    maxVelocityErrorKmPerSec = 0;
  for (const raw of fixture.rows) {
    const row = raw.map(Number);
    if (!provider.stateAt(jdToTdb(row[0]!), out).ok)
      throw new Error(`${name}: outside validity`);
    const errorKm = Math.hypot(
      out[0]! - row[2]!,
      out[1]! - row[3]!,
      out[2]! - row[4]!,
    );
    sumSquares += errorKm ** 2;
    maxErrorKm = Math.max(maxErrorKm, errorKm);
    maxVelocityErrorKmPerSec = Math.max(
      maxVelocityErrorKmPerSec,
      Math.hypot(out[3]! - row[5]!, out[4]! - row[6]!, out[5]! - row[7]!),
    );
  }
  results.push({
    name,
    samples: fixture.rows.length,
    bytes: buffer.length,
    stepDays: metadata.stepDays,
    maxErrorKm,
    rmsErrorKm: Math.sqrt(sumSquares / fixture.rows.length),
    limitKm,
    pass: maxErrorKm < limitKm,
    maxVelocityErrorKmPerSec,
  });
}
const report = {
  generatedAt: new Date().toISOString(),
  method:
    'Independent off-grid Horizons vectors, including both ends of the 1900-2100 timeline. These samples were not used to generate element tables.',
  certainty: 'approximate',
  continuousBound: false,
  results,
};
await writeFile(
  'docs/science/osculating-validation.json',
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (results.some((result) => !result.pass)) process.exitCode = 1;
