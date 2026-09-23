import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const source =
  'https://heasarc.gsfc.nasa.gov/FTP/heasarc/dbase/tdat_files/heasarc_bsc5p.tdat.gz';
await mkdir('assets/source', { recursive: true });
let raw: string;
try {
  raw = await readFile('assets/source/bsc5p.tdat', 'utf8');
} catch {
  const response = await fetch(source, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`BSC5: HTTP ${response.status}`);
  raw = gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8');
  await writeFile('assets/source/bsc5p.tdat', raw);
}
const fields = raw
  .match(/^line\[1\] = (.+)$/m)?.[1]
  ?.trim()
  .split(/\s+/);
if (!fields) throw new Error('Missing BSC5 column definitions');
const values: number[] = [];
for (const line of raw.split('<DATA>')[1]!.split('\n')) {
  if (!line.includes('|')) continue;
  const row = line.split('|');
  const value = (key: string) => row[fields.indexOf(key)]?.trim();
  if (!value('vmag') || !value('ra') || !value('dec')) continue;
  const ra = (Number(value('ra')) * Math.PI) / 180;
  const dec = (Number(value('dec')) * Math.PI) / 180;
  const mag = Number(value('vmag'));
  const bv = value('bv_color') ? Number(value('bv_color')) : 0.65;
  if (![ra, dec, mag, bv].every(Number.isFinite))
    throw new Error('Invalid star');
  values.push(
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
    mag,
    bv,
  );
}
if (values.length / 5 < 9000) throw new Error('Incomplete catalog');
const buffer = Buffer.alloc(values.length * 4);
values.forEach((value, i) => buffer.writeFloatLE(value, i * 4));
await mkdir('apps/web/public/data', { recursive: true });
await writeFile('apps/web/public/data/stars.bin', buffer);
await writeFile(
  'apps/web/public/data/stars.provenance.json',
  JSON.stringify(
    {
      source,
      reference:
        'Hoffleit and Warren, Bright Star Catalog, fifth revised edition (preliminary), 1991; HEASARC BSC5P',
      documentation:
        'https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html',
      frame: 'J2000 equatorial (FK5, approximated as ICRF)',
      format: 'little-endian float32: unit x,y,z,visual magnitude,B-V',
      count: values.length / 5,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      limitations:
        'Fixed J2000 directions; no proper motion, parallax or variability. Missing B-V defaults to 0.65. Non-stellar records without magnitude omitted. Colors and displayed sizes are illustrative.',
    },
    null,
    2,
  ),
);
console.log(
  `Built ${values.length / 5} catalog stars (${buffer.length} bytes)`,
);
