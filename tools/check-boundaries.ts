import { readdir, readFile } from 'node:fs/promises';
const allowed: Record<string, string[]> = {
  domain: [],
  astro: ['domain'],
  engine: ['astro', 'domain'],
  db: ['domain'],
  ingest: ['domain', 'astro', 'db'],
};
async function scan(dir: string): Promise<string[]> {
  const result: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'public', 'test'].includes(e.name))
      continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) result.push(...(await scan(p)));
    else if (/\.[jt]sx?$/.test(p)) result.push(p);
  }
  return result;
}
const errors: string[] = [];
for (const file of [
  ...(await scan('packages')),
  ...(await scan('apps/web/src')),
]) {
  const text = await readFile(file, 'utf8');
  const pkg = file.split('/')[1];
  for (const match of text.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)/g)) {
    const imp = match[1]!;
    if (imp.startsWith('@space/')) {
      const dep = imp.slice(7).split('/')[0]!;
      if (pkg && allowed[pkg] && !allowed[pkg]!.includes(dep))
        errors.push(`${file}: forbidden ${imp}`);
      if (imp.slice(7).includes('/'))
        errors.push(`${file}: deep import ${imp}`);
    }
    if (imp.startsWith('three') && !file.startsWith('packages/engine/'))
      errors.push(`${file}: renderer outside engine`);
    if (
      file.startsWith('packages/astro/') &&
      /\b(document|window|HTMLElement)\b/.test(text)
    )
      errors.push(`${file}: DOM in astro`);
    if (file.includes('/components/') && imp === '@space/astro')
      errors.push(`${file}: astro imported by UI`);
    if (text.startsWith("'use client'") && imp === '@space/db')
      errors.push(`${file}: database in client`);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log('Package boundaries passed');
