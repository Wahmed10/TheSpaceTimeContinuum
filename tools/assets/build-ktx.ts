import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
const exec = promisify(execFile),
  toktx = process.env.TOKTX_PATH ?? '.tools/ktx/bin/toktx.exe';
const maps = [
  'sun',
  'earth_daymap',
  'earth_nightmap',
  'earth_clouds',
  'earth_normal_map',
  'earth_specular_map',
  'mars',
  'mercury',
  'venus_atmosphere',
  'jupiter',
  'saturn',
  'saturn_ring_alpha',
  'uranus',
  'neptune',
];
const manifest: {
  name: string;
  res: number;
  file: string;
  bytes: number;
  license: string;
  credit: string;
}[] = JSON.parse(
  await readFile('apps/web/public/assets/textures/manifest.json', 'utf8'),
);
let credits = await readFile('assets/ASSET_LICENSES.md', 'utf8');
await mkdir('apps/web/public/basis', { recursive: true });
await mkdir('assets/source/ktx', { recursive: true });
for (const name of maps) {
  const high = [
    'sun',
    'earth_daymap',
    'earth_nightmap',
    'earth_clouds',
    'mars',
  ].includes(name);
  const ext = name.includes('ring')
    ? 'png'
    : name.endsWith('_map')
      ? 'tif'
      : 'jpg';
  const source = `assets/source/${high ? '8k_' : ''}${name}.${ext}`,
    url = `https://www.solarsystemscope.com/textures/download/${high ? '8k' : '2k'}_${name}.${ext}`;
  let data: Buffer;
  try {
    data = await readFile(source);
  } catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    data = Buffer.from(await response.arrayBuffer());
    await writeFile(source, data);
  }
  const resolutions = high
    ? [
        1024,
        2048,
        4096,
        ...(name === 'earth_daymap' || name === 'earth_nightmap' ? [8192] : []),
      ]
    : [1024, 2048];
  for (const res of resolutions) {
    const file = `/assets/textures/${name}_${res}.ktx2`;
    const output = `apps/web/public${file}`;
    let exists = false;
    try {
      await stat(output);
      exists = true;
    } catch {
      /* Build missing files only. */
    }
    if (!exists || (process.argv.includes('--recompress') && res >= 4096)) {
      const png = `assets/source/ktx/${name}_${res}.png`;
      await sharp(data).resize({ width: res }).png().toFile(png);
      await exec(
        toktx,
        [
          '--t2',
          '--encode',
          'uastc',
          '--uastc_quality',
          '2',
          '--uastc_rdo_l',
          '2',
          '--zcmp',
          '18',
          '--genmipmap',
          '--assign_oetf',
          /normal|specular|cloud/.test(name) ? 'linear' : 'srgb',
          output,
          png,
        ],
        { windowsHide: true, maxBuffer: 2e6 },
      );
    }
    const bytes = (await stat(output)).size;
    const previous = manifest.findIndex((m) => m.file === file);
    const item = {
      name,
      res,
      file,
      bytes,
      license: 'CC-BY-4.0',
      credit: 'Solar System Scope',
    };
    if (previous >= 0) manifest[previous] = item;
    else manifest.push(item);
    if (!credits.includes(file))
      credits += `| ${file} | ${url} | CC BY 4.0 | Solar System Scope | Resize; UASTC KTX2; mipmaps |\n`;
    await writeFile(
      'apps/web/public/assets/textures/manifest.json',
      JSON.stringify(manifest, null, 2),
    );
    await writeFile('assets/ASSET_LICENSES.md', credits);
    console.log(`${name} ${res}: ${(bytes / 1024).toFixed(0)} KB`);
  }
}
for (const file of ['basis_transcoder.js', 'basis_transcoder.wasm'])
  await copyFile(
    `packages/engine/node_modules/three/examples/jsm/libs/basis/${file}`,
    `apps/web/public/basis/${file}`,
  );
await writeFile(
  'apps/web/public/basis/NOTICE.txt',
  'Basis Universal transcoder, Binomial LLC, Apache-2.0. Distributed with Three.js 0.186.0. https://github.com/BinomialLLC/basis_universal\n',
);
