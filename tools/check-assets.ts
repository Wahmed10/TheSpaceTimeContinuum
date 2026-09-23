import { readFile, readdir, stat } from 'node:fs/promises';
const license = await readFile('assets/ASSET_LICENSES.md', 'utf8');
async function walk(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) files.push(...(await walk(p)));
    else files.push(p);
  }
  return files;
}
let bytes = 0;
const files = await walk('apps/web/public/assets');
const manifest = JSON.parse(await readFile('apps/web/public/assets/textures/manifest.json','utf8')) as {file:string;bytes:number}[];
for (const file of files) {
  if (file.endsWith('manifest.json')) continue;
  if (!license.includes(file.replace('apps/web/public', '')))
    throw new Error(`Missing asset credit: ${file}`);
  const size = (await stat(file)).size;
  bytes += size;
  const entry = manifest.find(m=>m.file===file.replace('apps/web/public',''));
  if (!entry || entry.bytes !== size) throw new Error(`Stale asset manifest: ${file}`);
}
for (const entry of manifest) if(!files.includes(`apps/web/public${entry.file}`))throw new Error(`Missing manifest asset: ${entry.file}`);
if(bytes>80_000_000)throw new Error(`Texture budget exceeded: ${bytes} > 80 MB`);
console.log(`Every distributed texture has a credit and matching manifest; ${(bytes/1e6).toFixed(2)} MB / 80 MB`);
