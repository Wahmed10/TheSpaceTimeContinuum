import { mkdir, writeFile } from 'node:fs/promises';
// Offline science fixtures only. Requests are strictly sequential; stop on any error.
const folder = 'packages/astro/test/fixtures/phase-two';
await mkdir(folder, { recursive: true });
async function request(
  name: string,
  command: string,
  center: string,
  epochs: number[],
  type = 'VECTORS',
) {
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice(7);
  if (
    only &&
    only !== name &&
    !(only === 'osculating-holdouts' && name.endsWith('-osculating-holdout')) &&
    !(
      only === 'mean-moons' &&
      ['phobos', 'deimos', 'titan', 'triton', 'charon'].includes(name)
    )
  )
    return;
  const query: Record<string, string> = {
    format: 'json',
    COMMAND: `'${command}'`,
    CENTER: `'500@${center}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: `'${type}'`,
    REF_SYSTEM: "'ICRF'",
    REF_PLANE: "'FRAME'",
    VEC_TABLE: "'2'",
    VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'",
    TIME_TYPE: "'TDB'",
    CSV_FORMAT: "'YES'",
    TLIST: `'${epochs.join('\n')}'`,
  };
  if (name === 'apophis-encounter') {
    delete query.TLIST;
    query.START_TIME = "'2029-04-13 20:00'";
    query.STOP_TIME = "'2029-04-13 22:00'";
    query.STEP_SIZE = "'1 m'";
  }
  const response = await fetch(
    `https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(query)}`,
    {
      headers: { 'User-Agent': 'SpaceTimeContinuum-science-fixtures/0.1' },
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
    throw new Error('Review Horizons version');
  const block = payload.result?.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!block || payload.error)
    throw new Error(payload.error ?? payload.result ?? 'No data');
  const rows = block
    .trim()
    .split('\n')
    .map((line) => line.split(',').map((c) => c.trim()));
  if (
    rows.length !== epochs.length ||
    rows.some((row) => !Number.isFinite(Number(row[0])))
  )
    throw new Error('Malformed rows');
  await writeFile(
    `${folder}/${name}.json`,
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
  console.log(`${name}: ${rows.length} samples`);
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
const epochs = [2433282.5, 2451545, 2461305.5, 2469807.5, 2488069.5];
for (const [id, name] of [
  ['501', 'io'],
  ['502', 'europa'],
  ['503', 'ganymede'],
  ['504', 'callisto'],
])
  await request(name!, id!, '599', epochs);
const epoch = 2461307.5;
if (process.argv.includes('--only=osculating-holdouts')) {
  const holdouts = [
    2415020.501,
    2488434.499,
    ...Array.from(
      { length: 48 },
      (_, i) => 2415021.314159 + ((i + 0.381966) * 73400) / 48,
    ),
  ];
  for (const [name, id, center] of [
    ['phobos', '401', '499'],
    ['deimos', '402', '499'],
    ['titan', '606', '699'],
    ['triton', '801', '899'],
    ['charon', '901', '999'],
    ['ceres', '1;', '10'],
  ])
    await request(`${name}-osculating-holdout`, id!, center!, holdouts);
}
await request('ceres-elements', '1;', '10', [epoch], 'ELEMENTS');
await request('ceres-vectors', '1;', '10', [epoch - 30, epoch, epoch + 30]);
for (const [name, id, parent] of [
  ['phobos', '401', '499'],
  ['deimos', '402', '499'],
  ['titan', '606', '699'],
  ['triton', '801', '899'],
  ['charon', '901', '999'],
])
  if (process.argv.includes('--only=mean-moons'))
    await request(name!, id!, parent!, [2451545, 2451545.5, 2451546, epoch]);
if (process.argv.includes('--only=callisto-holdout'))
  await request(
    'callisto-holdout',
    '504',
    '599',
    Array.from(
      { length: 24 },
      (_, i) => 2415021.314159 + ((i + 0.381966) * 73047) / 24,
    ),
  );
await request('eros-elements', '433;', '10', [epoch], 'ELEMENTS');
await request(
  'eros-vectors',
  '433;',
  '10',
  [-30, -15, 0, 15, 30].map((d) => epoch + d),
);
await request(
  'voyager-cruise',
  '-31',
  '10',
  Array.from({ length: 49 }, (_, i) => epoch + i / 24),
);
// Apophis Earth encounter, 2029-04-13 20:00 through 22:00 TDB, one-minute holdouts.
await request(
  'apophis-encounter',
  '99942;',
  '399',
  Array.from({ length: 121 }, (_, i) => 2462239.5 + (20 * 60 + i) / 1440),
);
