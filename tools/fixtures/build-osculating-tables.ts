import { mkdir, readFile, writeFile } from 'node:fs/promises';
const bodies = [
  { name: 'phobos', id: '401', center: '499', stepDays: 1 },
  { name: 'deimos', id: '402', center: '499', stepDays: 4 },
  { name: 'titan', id: '606', center: '699', stepDays: 4 },
  { name: 'triton', id: '801', center: '899', stepDays: 4 },
  { name: 'charon', id: '901', center: '999', stepDays: 16 },
  { name: 'ceres', id: '1;', center: '10', stepDays: 16 },
];
const cacheDir = 'assets/source/osculating',
  outputDir = 'apps/web/public/data/orbits';
await mkdir(cacheDir, { recursive: true });
await mkdir(outputDir, { recursive: true });
for (const body of bodies) {
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice(7);
  if (only && body.name !== only) continue;
  const startJd = 2415020.5 - body.stepDays,
    count = Math.ceil((2488436.5 - startJd) / body.stepDays) + 1;
  const buffer = Buffer.alloc(24 + count * 7 * 8),
    provenance: unknown[] = [];
  buffer.writeDoubleLE((startJd - 2451545) * 86400, 0);
  buffer.writeDoubleLE(body.stepDays * 86400, 8);
  buffer.writeDoubleLE(count, 16);
  for (let offset = 0; offset < count; offset += 5000) {
    const size = Math.min(5000, count - offset),
      first = startJd + offset * body.stepDays;
    const query = {
      format: 'json',
      COMMAND: `'${body.id}'`,
      CENTER: `'500@${body.center}'`,
      OBJ_DATA: "'NO'",
      MAKE_EPHEM: "'YES'",
      EPHEM_TYPE: "'ELEMENTS'",
      REF_SYSTEM: "'ICRF'",
      REF_PLANE: "'FRAME'",
      OUT_UNITS: "'KM-S'",
      TIME_TYPE: "'TDB'",
      CSV_FORMAT: "'YES'",
      START_TIME: `'JD${first}'`,
      STOP_TIME: `'JD${first + (size - 1) * body.stepDays + 0.01}'`,
      STEP_SIZE: `'${body.stepDays} d'`,
    };
    const cachePath = `${cacheDir}/${body.name}-${offset}.json`;
    let payload: {
      signature?: { version: string };
      result?: string;
      error?: string;
    };
    try {
      payload = JSON.parse(await readFile(cachePath, 'utf8'));
    } catch {
      const response = await fetch(
        `https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(query)}`,
        {
          headers: { 'User-Agent': 'SpaceTimeContinuum-orbit-table-build/0.1' },
          signal: AbortSignal.timeout(120000),
        },
      );
      if (!response.ok) throw new Error(`Stopped on HTTP ${response.status}`);
      payload = (await response.json()) as typeof payload;
      if (payload.error) throw new Error(payload.error);
      await writeFile(cachePath, JSON.stringify(payload));
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    if (
      !payload.signature ||
      !['1.2', '1.3'].includes(payload.signature.version)
    )
      throw new Error('Review Horizons version');
    const block = payload.result?.split('$$SOE')[1]?.split('$$EOE')[0];
    if (!block)
      throw new Error(payload.error ?? payload.result ?? 'No elements');
    const rows = block
      .trim()
      .split('\n')
      .map((line) => line.split(',').map(Number));
    if (rows.length !== size)
      throw new Error(`Wrong sample count for ${body.name}`);
    for (let i = 0; i < size; i++) {
      const row = rows[i]!,
        rad = Math.PI / 180;
      // Store a, e, inclination, ascending node, argument of periapsis, M, n.
      const record = [
        row[11]!,
        row[2]!,
        row[4]! * rad,
        row[5]! * rad,
        row[6]! * rad,
        row[9]! * rad,
        row[8]! * rad,
      ];
      if (
        Math.abs(row[0]! - (first + i * body.stepDays)) > 1e-7 ||
        !record.every(Number.isFinite) ||
        record[0]! <= 0 ||
        record[1]! < 0 ||
        record[1]! >= 1 ||
        record[6]! <= 0
      )
        throw new Error('Invalid elements');
      record.forEach((value, j) =>
        buffer.writeDoubleLE(value, 24 + ((offset + i) * 7 + j) * 8),
      );
    }
    provenance.push({ query, version: payload.signature.version });
    console.log(`${body.name}: ${offset + size}/${count}`);
  }
  await writeFile(`${outputDir}/${body.name}.bin`, buffer);
  await writeFile(
    `${outputDir}/${body.name}.provenance.json`,
    JSON.stringify(
      {
        body: body.name,
        source: 'NASA/JPL Horizons',
        sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
        generatedAt: new Date().toISOString(),
        frame:
          body.center === '10'
            ? 'ICRF_HELIO'
            : `ICRF_BODY:${body.center === '499' ? 'mars' : body.center === '699' ? 'saturn' : body.center === '899' ? 'neptune' : 'pluto'}`,
        startJd,
        stepDays: body.stepDays,
        count,
        bytes: buffer.length,
        format:
          'f64le:startTdb,stepSec,count; then 7 f64le per sample: aKm,e,iRad,nodeRad,periRad,meanAnomalyRad,meanMotionRadPerSec',
        provenance,
        note: 'Adjacent osculating Kepler solutions are propagated and smoothly blended. Approximate; validation uses separate off-grid Horizons vectors. No extrapolation.',
      },
      null,
      2,
    ),
  );
}
