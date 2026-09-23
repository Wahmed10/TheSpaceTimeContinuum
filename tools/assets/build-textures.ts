import { mkdir, writeFile, readFile } from 'node:fs/promises';
import sharp from 'sharp';
const names = [
  'sun',
  'earth_daymap',
  'earth_nightmap',
  'earth_clouds',
  'earth_normal_map',
  'earth_specular_map',
  'moon',
  'mars',
  'mercury',
  'venus_atmosphere',
  'jupiter',
  'saturn',
  'saturn_ring_alpha',
  'uranus',
  'neptune',
  'stars_milky_way',
];
await mkdir('assets/source', { recursive: true });
await mkdir('apps/web/public/assets/textures', { recursive: true });
let credits = await readFile('assets/ASSET_LICENSES.md', 'utf8').catch(
  () =>
    '# Asset licenses\n\nSolar System Scope textures: CC BY 4.0. No endorsement implied.\n\n| File | Source | License | Credit | Modification |\n|---|---|---|---|---|\n',
);
const manifest: {
  name: string;
  res: number;
  file: string;
  bytes: number;
  license: string;
  credit: string;
}[] = JSON.parse(
  await readFile('apps/web/public/assets/textures/manifest.json', 'utf8').catch(
    () => '[]',
  ),
);
for (const name of names) {
  const ext = name.includes('ring')
    ? 'png'
    : name.endsWith('_map')
      ? 'tif'
      : 'jpg';
  const url = `https://www.solarsystemscope.com/textures/download/2k_${name}.${ext}`;
  const source = `assets/source/${name}.${ext}`;
  let bytes: Buffer;
  try {
    bytes = await readFile(source);
  } catch {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    bytes = Buffer.from(await r.arrayBuffer());
    await writeFile(source, bytes);
  }
  for (const res of [1024, 2048]) {
    const file = `/assets/textures/${name}_${res}.webp`;
    const data = await sharp(bytes)
      .resize({ width: res })
      .webp({ quality: 90 })
      .toBuffer();
    await writeFile(`apps/web/public${file}`, data);
    const item = {
      name,
      res,
      file,
      bytes: data.length,
      license: 'CC-BY-4.0',
      credit: 'Solar System Scope',
    };
    const index = manifest.findIndex((m) => m.file === file);
    if (index >= 0) manifest[index] = item;
    else manifest.push(item);
    if (!credits.includes(file))
      credits += `| ${file} | ${url} | CC BY 4.0 | Solar System Scope | Resize, WebP |\n`;
  }
  console.log(`Built ${name}`);
}
await mkdir('assets', { recursive: true });
await writeFile('assets/ASSET_LICENSES.md', credits);
await writeFile(
  'apps/web/public/assets/textures/manifest.json',
  JSON.stringify(manifest, null, 2),
);
