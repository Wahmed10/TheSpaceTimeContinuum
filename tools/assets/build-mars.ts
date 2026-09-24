import { readFile, writeFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
const base =
  'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg004/';
for (const ext of ['lbl', 'img']) {
  try {
    await stat(`assets/source/mars_mola.${ext}`);
  } catch {
    const r = await fetch(`${base}megt90n000cb.${ext}`);
    if (!r.ok) throw new Error(`MOLA: ${r.status}`);
    await writeFile(
      `assets/source/mars_mola.${ext}`,
      Buffer.from(await r.arrayBuffer()),
    );
  }
}
const data = await readFile('assets/source/mars_mola.img');
if (data.length !== 1440 * 720 * 2)
  throw new Error('Unexpected MOLA product length');
const normal = Buffer.alloc(1440 * 720 * 3);
// PDS begins at 0 E; shift by 180 degrees to align the centered-zero albedo.
const at = (x: number, y: number) =>
  data.readInt16BE(
    (Math.max(0, Math.min(719, y)) * 1440 + ((x + 720 + 1440) % 1440)) * 2,
  ) / 1000;
for (let y = 0; y < 720; y++)
  for (let x = 0; x < 1440; x++) {
    const dx =
      (at(x + 1, y) - at(x - 1, y)) /
      ((2 *
        3396 *
        Math.max(0.01, Math.cos(Math.PI * (0.5 - (y + 0.5) / 720))) *
        2 *
        Math.PI) /
        1440);
    const dy = (at(x, y - 1) - at(x, y + 1)) / ((2 * 3396 * Math.PI) / 720);
    const length = Math.hypot(dx, dy, 1),
      i = (y * 1440 + x) * 3;
    normal[i] = Math.round((1 - dx / length) * 127.5);
    normal[i + 1] = Math.round((1 - dy / length) * 127.5);
    normal[i + 2] = Math.round((1 + 1 / length) * 127.5);
  }
const png = 'assets/source/ktx/mars_normal_1024.png';
await sharp(normal, { raw: { width: 1440, height: 720, channels: 3 } })
  .resize({ width: 1024 })
  .png()
  .toFile(png);
const file = '/assets/textures/mars_normal_1024.ktx2';
await promisify(execFile)(
  process.env.TOKTX_PATH ?? '.tools/ktx/bin/toktx.exe',
  [
    '--t2',
    '--encode',
    'uastc',
    '--uastc_quality',
    '2',
    '--uastc_rdo_l',
    '0.5',
    '--zcmp',
    '18',
    '--genmipmap',
    '--assign_oetf',
    'linear',
    `apps/web/public${file}`,
    png,
  ],
  { windowsHide: true },
);
const path = 'apps/web/public/assets/textures/manifest.json';
const manifest = JSON.parse(await readFile(path, 'utf8')) as { file: string }[];
await writeFile(
  path,
  JSON.stringify(
    [
      ...manifest.filter((m) => m.file !== file),
      {
        name: 'mars_normal',
        res: 1024,
        file,
        bytes: (await stat(`apps/web/public${file}`)).size,
        license: 'NASA-PDS',
        credit: 'NASA GSFC / MGS MOLA team',
      },
    ],
    null,
    2,
  ),
);
let credits = await readFile('assets/ASSET_LICENSES.md', 'utf8');
if (!credits.includes(file)) {
  credits += `| ${file} | ${base}megt90n000cb.lbl | NASA PDS data | NASA GSFC, MGS MOLA team | 4 pixels/degree topography; spherical finite-difference normals; longitude shift; KTX2 |\n`;
  await writeFile('assets/ASSET_LICENSES.md', credits);
}
console.log('Built Mars MOLA normal map');
