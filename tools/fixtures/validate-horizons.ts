import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createBodyProvider, jdToTdb,registerEphemerisCorrection } from '../../packages/astro/src/index';
const names: Record<string, string> = {
  '10': 'Sun',
  '199': 'Mercury',
  '299': 'Venus',
  '399': 'Earth',
  '301': 'Moon',
  '499': 'Mars',
  '599': 'Jupiter',
  '699': 'Saturn',
  '799': 'Uranus',
  '899': 'Neptune',
  '999': 'Pluto',
};
const records = [];
for (const file of await readdir('packages/astro/test/fixtures/horizons')) {
  const body = names[file.split('_')[0]!]!;
  const data=await readFile(`apps/web/public/data/corrections/${body.toLowerCase()}.bin`);
  registerEphemerisCorrection(body,data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
  const fixture = JSON.parse(
    await readFile(`packages/astro/test/fixtures/horizons/${file}`, 'utf8'),
  ) as { rows: { jdTdb: number; x: number; y: number; z: number }[] };
  const provider = createBodyProvider(body);
  const out = new Float64Array(6);
  let maxAngleArcsec = 0,
    maxRelativeDistance = 0,
    maxPositionErrorKm = 0;
  for (const r of fixture.rows) {
    provider.stateAt(jdToTdb(r.jdTdb), out);
    const norm = Math.hypot(r.x, r.y, r.z);
    const angle =
      Math.atan2(
        Math.hypot(
          out[1]! * r.z - out[2]! * r.y,
          out[2]! * r.x - out[0]! * r.z,
          out[0]! * r.y - out[1]! * r.x,
        ),
        out[0]! * r.x + out[1]! * r.y + out[2]! * r.z,
      ) * 206264.806;
    maxAngleArcsec = Math.max(maxAngleArcsec, angle);
    maxRelativeDistance = Math.max(
      maxRelativeDistance,
      Math.abs(Math.hypot(out[0]!, out[1]!, out[2]!) - norm) / norm,
    );
    maxPositionErrorKm = Math.max(
      maxPositionErrorKm,
      Math.hypot(out[0]! - r.x, out[1]! - r.y, out[2]! - r.z),
    );
  }
  records.push({
    body,
    maxAngleArcsec,
    maxRelativeDistance,
    maxPositionErrorKm,
    pass: maxAngleArcsec < 30 && maxRelativeDistance < 1e-5,
  });
}
await mkdir('docs/science', { recursive: true });
await writeFile(
  'docs/science/horizons-validation.json',
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      thresholds: { maxAngleArcsec: 30, maxRelativeDistance: 1e-5 },
      records,
    },
    null,
    2,
  ),
);
console.table(records);
if (records.some((r) => !r.pass)) process.exitCode = 1;
