import { readFile, writeFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
const run = promisify(execFile);
const base = 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/';
for (const file of ['ldem_4.tif', 'lroc_color_poles_4k.tif']) {
  try {
    await stat(`assets/source/${file}`);
  } catch {
    const response = await fetch(base + file, {
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`Moon source: HTTP ${response.status}`);
    await writeFile(
      `assets/source/${file}`,
      Buffer.from(await response.arrayBuffer()),
    );
  }
}
const { data, info } = await sharp('assets/source/ldem_4.tif')
  .resize({ width: 1024 })
  .raw({ depth: 'float' })
  .toBuffer({ resolveWithObject: true });
const elevations = new Float32Array(
  data.buffer,
  data.byteOffset,
  data.byteLength / 4,
);
const height = Buffer.alloc(info.width * info.height);
const normal = Buffer.alloc(info.width * info.height * 3);
const at = (x: number, y: number) =>
  elevations[
    (Math.max(0, Math.min(info.height - 1, y)) * info.width +
      ((x + info.width) % info.width)) *
      info.channels
  ]!;
for (let y = 0; y < info.height; y++)
  for (let x = 0; x < info.width; x++) {
    const p = y * info.width + x;
    height[p] = Math.round(
      Math.max(0, Math.min(1, (at(x, y) + 12) / 24)) * 255,
    );
    const latitude = Math.PI * (0.5 - (y + 0.5) / info.height);
    const dx =
      (at(x + 1, y) - at(x - 1, y)) /
      ((2 * 1737.4 * Math.max(0.01, Math.cos(latitude)) * 2 * Math.PI) /
        info.width);
    const dy =
      (at(x, y - 1) - at(x, y + 1)) / ((2 * 1737.4 * Math.PI) / info.height);
    const length = Math.hypot(dx, dy, 1);
    normal[p * 3] = Math.round((1 - dx / length) * 127.5);
    normal[p * 3 + 1] = Math.round((1 - dy / length) * 127.5);
    normal[p * 3 + 2] = Math.round((1 + 1 / length) * 127.5);
  }
await sharp(height, {
  raw: { width: info.width, height: info.height, channels: 1 },
})
  .png()
  .toFile('assets/source/ktx/moon_height_1024.png');
await sharp(normal, {
  raw: { width: info.width, height: info.height, channels: 3 },
})
  .png()
  .toFile('assets/source/ktx/moon_normal_1024.png');
const manifest = JSON.parse(
  await readFile('apps/web/public/assets/textures/manifest.json', 'utf8'),
) as {
  name: string;
  res: number;
  file: string;
  bytes: number;
  license: string;
  credit: string;
}[];
let credits = await readFile('assets/ASSET_LICENSES.md', 'utf8');
for (const name of ['moon', 'moon_height', 'moon_normal'])
  for (const res of name === 'moon' ? [1024, 2048, 4096] : [1024]) {
    const file = `/assets/textures/${name}_${res}.ktx2`;
    const png = `assets/source/ktx/${name}_${res}.png`;
    if (name === 'moon')
      await sharp('assets/source/lroc_color_poles_4k.tif')
        .resize({ width: res })
        .png()
        .toFile(png);
    await run(
      process.env.TOKTX_PATH ?? '.tools/ktx/bin/toktx.exe',
      [
        '--t2',
        '--encode',
        'uastc',
        '--uastc_quality',
        '2',
        '--uastc_rdo_l',
        name === 'moon' ? '2' : '0.5',
        '--zcmp',
        '18',
        '--genmipmap',
        '--assign_oetf',
        name === 'moon' ? 'srgb' : 'linear',
        `apps/web/public${file}`,
        png,
      ],
      { windowsHide: true },
    );
    const item = {
      name,
      res,
      file,
      bytes: (await stat(`apps/web/public${file}`)).size,
      license: 'NASA-media-guidelines',
      credit: 'NASA SVS / LRO / LROC / LOLA',
    };
    const i = manifest.findIndex((m) => m.file === file);
    if (i >= 0) manifest[i] = item;
    else manifest.push(item);
    credits = credits
      .split('\n')
      .filter((line) => !line.includes(`| ${file} |`))
      .join('\n');
    credits += `| ${file} | https://svs.gsfc.nasa.gov/4720/ | NASA media guidelines | NASA SVS, LRO/LROC/LOLA; Ernie Wright | ${name === 'moon' ? '2019 LROC color, resized' : 'LOLA 4 pixels/degree; derived normal or 8-bit height (-12 to +12 km)'}; KTX2 |\n`;
    console.log(`${name} ${res}: ${item.bytes} bytes`);
  }
await writeFile(
  'apps/web/public/assets/textures/manifest.json',
  JSON.stringify(manifest, null, 2),
);
await writeFile('assets/ASSET_LICENSES.md', credits);
