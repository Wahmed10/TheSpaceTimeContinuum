import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const allow = JSON.parse(
  await readFile('docs/licensing/allowlist.json', 'utf8'),
) as string[];
const raw = execFileSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['licenses', 'list', '--prod', '--json'],
  { encoding: 'utf8', shell: process.platform === 'win32' },
);
const licenses = JSON.parse(raw) as Record<
  string,
  { name: string; versions: string[]; license?: string; paths?: string[] }[]
>;
const bad = Object.keys(licenses).filter(
  (x) =>
    !allow.includes(x) &&
    !/^\((MIT OR Apache-2.0|MIT AND BSD-3-Clause)\)$/.test(x),
);
if (bad.length)
  throw new Error(`Unreviewed production licenses: ${bad.join(', ')}`);
await mkdir('apps/web/public', { recursive: true });
let notices = 'Third-party dependencies — Space Time Continuum\n\n';
for (const [license, items] of Object.entries(licenses))
  for (const item of items) {
    notices += `${item.name}@${item.versions.join(', ')} — ${license}\n`;
    for (const path of item.paths ?? [])
      for (const filename of [
        'LICENSE',
        'LICENSE.txt',
        'LICENSE.md',
        'NOTICE',
        'NOTICE.txt',
      ]) {
        try {
          notices += (await readFile(`${path}/${filename}`, 'utf8')) + '\n';
        } catch {
          /* Some packages only declare SPDX identifiers. */
        }
      }
    notices += '\n';
  }
await writeFile('apps/web/public/third-party-notices.txt', notices);
console.log(
  `Checked ${Object.values(licenses).flat().length} production dependencies`,
);
