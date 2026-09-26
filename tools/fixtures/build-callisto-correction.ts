import { mkdir, writeFile } from 'node:fs/promises';
import {
  JupiterMoonsCache,
  jdToTdb,
  AU_KM,
  SEC_PER_DAY,
} from '../../packages/astro/src/index';
// Same residual format as Phase 1, with 4-day knots for Callisto's 16.7-day orbit.
const firstJd = 2415006.5,
  stepDays = 4,
  count = Math.ceil((2488448.5 - firstJd) / stepDays) + 1;
const buffer = Buffer.alloc(24 + count * 24),
  cache = new JupiterMoonsCache();
buffer.writeDoubleLE(jdToTdb(firstJd), 0);
buffer.writeDoubleLE(stepDays * SEC_PER_DAY, 8);
buffer.writeDoubleLE(count, 16);
const queries: Record<string, string>[] = [];
for (let offset = 0; offset < count; offset += 5000) {
  const n = Math.min(5000, count - offset),
    startJd = firstJd + offset * stepDays;
  const query = {
    format: 'json',
    COMMAND: "'504'",
    CENTER: "'500@599'",
    OBJ_DATA: "'NO'",
    EPHEM_TYPE: "'VECTORS'",
    REF_SYSTEM: "'ICRF'",
    REF_PLANE: "'FRAME'",
    VEC_TABLE: "'2'",
    VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'",
    TIME_TYPE: "'TDB'",
    CSV_FORMAT: "'YES'",
    START_TIME: `'JD${startJd}'`,
    STOP_TIME: `'JD${startJd + (n - 1) * stepDays + 0.1}'`,
    STEP_SIZE: "'4 d'",
  };
  const response = await fetch(
    `https://ssd.jpl.nasa.gov/api/horizons.api?${new URLSearchParams(query)}`,
    {
      headers: { 'User-Agent': 'SpaceTimeContinuum-ephemeris-build/0.1' },
      signal: AbortSignal.timeout(120000),
    },
  );
  if (!response.ok) throw new Error(`Stopped on HTTP ${response.status}`);
  const payload = (await response.json()) as {
    signature?: { version: string };
    result?: string;
    error?: string;
  };
  if (!payload.signature || !['1.2', '1.3'].includes(payload.signature.version))
    throw new Error('Review Horizons version');
  const block = payload.result?.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!block || payload.error)
    throw new Error(payload.error ?? payload.result ?? 'No vectors');
  const rows = block
    .trim()
    .split('\n')
    .map((line) => {
      const c = line.split(',');
      return [Number(c[0]), ...c.slice(2, 8).map(Number)];
    });
  if (rows.length !== n) throw new Error('Wrong sample count');
  for (let i = 0; i < n; i++) {
    const row = rows[i]!,
      jd = startJd + i * stepDays;
    if (Math.abs(row[0]! - jd) > 1e-7 || !row.every(Number.isFinite))
      throw new Error('Invalid reference row');
    const s = cache.at(jdToTdb(jd)).callisto;
    const base = [
      s.x * AU_KM,
      s.y * AU_KM,
      s.z * AU_KM,
      (s.vx * AU_KM) / SEC_PER_DAY,
      (s.vy * AU_KM) / SEC_PER_DAY,
      (s.vz * AU_KM) / SEC_PER_DAY,
    ];
    for (let j = 0; j < 6; j++)
      buffer.writeFloatLE(
        row[j + 1]! - base[j]!,
        24 + ((offset + i) * 6 + j) * 4,
      );
  }
  queries.push(query);
  console.log(`Callisto: ${offset + n}/${count} samples`);
  await new Promise((resolve) => setTimeout(resolve, 1500));
}
const folder = 'apps/web/public/data/corrections';
await mkdir(folder, { recursive: true });
await writeFile(`${folder}/callisto.bin`, buffer);
await writeFile(
  `${folder}/callisto.provenance.json`,
  JSON.stringify(
    {
      body: 'Callisto',
      center: 'Jupiter',
      source: 'NASA/JPL Horizons',
      sourceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
      generatedAt: new Date().toISOString(),
      format: 'f64le:t0,step,count;f32le:dx,dy,dz,dvx,dvy,dvz',
      firstJd,
      stepDays,
      count,
      bytes: buffer.length,
      queries,
      note: 'Hermite residuals against pinned astronomy-engine 2.1.19 JupiterMoons. Independent five-epoch and off-grid tests validate sampled accuracy, not a continuous bound.',
    },
    null,
    2,
  ),
);
