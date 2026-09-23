import { mkdir, writeFile } from 'node:fs/promises';
const bodies = [
  '10',
  '199',
  '299',
  '399',
  '301',
  '499',
  '599',
  '699',
  '799',
  '899',
  '999',
];
const holdout=process.argv.includes('--holdout');
const epochs = holdout?Array.from({length:24},(_,i)=>2415021.314159+(i+0.381966)*73047/24):[2433282.5, 2451545, 2461305.5, 2469807.5, 2488069.5];
const folder=`packages/astro/test/fixtures/${holdout?'holdout':'horizons'}`;
await mkdir(folder, { recursive: true });
for (const id of bodies) {
  const query = {
    format: 'json',
    COMMAND: `'${id}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: "'500@0'",
    REF_SYSTEM: "'ICRF'",
    REF_PLANE: "'FRAME'",
    VEC_TABLE: "'2'",
    OUT_UNITS: "'KM-S'",
    TIME_TYPE: "'TDB'",
    CSV_FORMAT: "'YES'",
    TLIST: `'${epochs.join('\n')}'`,
  };
  const response = await fetch(
    `https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(query)}`,
    {
      headers: {
        'User-Agent': `SpaceTimeContinuum-fixtures/0.1${process.env.PROVIDER_CONTACT ? ` (contact: ${process.env.PROVIDER_CONTACT})` : ''}`,
      },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok)
    throw new Error(`Horizons stopped: HTTP ${response.status}`);
  const payload = (await response.json()) as {
    signature?: { version: string };
    result?: string;
    error?: string;
  };
  if (!payload.signature || !['1.2', '1.3'].includes(payload.signature.version))
    throw new Error('Review changed Horizons API version');
  const block = payload.result?.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!block) throw new Error(payload.error ?? payload.result ?? 'No vectors');
  const rows = block
    .trim()
    .split('\n')
    .map((line) => {
      const c = line.split(',');
      return {
        jdTdb: Number(c[0]),
        x: Number(c[2]),
        y: Number(c[3]),
        z: Number(c[4]),
        vx: Number(c[5]),
        vy: Number(c[6]),
        vz: Number(c[7]),
      };
    });
  if (
    rows.length !== epochs.length ||
    rows.some((r) => Object.values(r).some((n) => !Number.isFinite(n)))
  )
    throw new Error('Malformed vectors');
  await writeFile(
    `${folder}/${id}_0.json`,
    JSON.stringify(
      {
        query,
        horizonsVersion: payload.signature.version,
        generatedAt: new Date().toISOString(),
        rows,
      },
      null,
      2,
    ),
  );
  console.log(`Horizons ${id}: ${rows.length} epochs`);
  await new Promise((r) => setTimeout(r, 1500));
}
