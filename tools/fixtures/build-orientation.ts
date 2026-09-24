import { readFile, writeFile, mkdir } from 'node:fs/promises';
const source =
  'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc';
await mkdir('assets/source', { recursive: true });
let text: string;
try {
  text = await readFile('assets/source/pck00011.tpc', 'utf8');
} catch {
  const r = await fetch(source);
  if (!r.ok) throw new Error(`NAIF: ${r.status}`);
  text = await r.text();
  await writeFile('assets/source/pck00011.tpc', text);
}
const get = (key: string) => {
  const match = text.match(new RegExp('\\b' + key + '\\s*=\\s*\\(([^)]*)\\)'));
  if (!match) throw new Error(key);
  return match[1]!.trim().split(/\s+/).map(Number);
};
const angles = get('BODY4_NUT_PREC_ANGLES'),
  records = [];
for (const d of [-18262.5, 0, 9760, 18262.5, 36524.5]) {
  const T = d / 36525,
    result: Record<string, number> = { ttDays: d };
  for (const [field, key, sine] of [
    ['ra', 'POLE_RA', true],
    ['dec', 'POLE_DEC', false],
    ['w', 'PM', true],
  ] as const) {
    const a = get('BODY499_' + key),
      b = get(
        'BODY499_NUT_PREC_' + (field === 'w' ? 'PM' : field.toUpperCase()),
      ),
      t = field === 'w' ? d : T;
    let value = a[0]! + a[1]! * t + a[2]! * t * t;
    for (let i = 0; i < b.length; i++) {
      const theta =
        ((angles[i * 3]! +
          angles[i * 3 + 1]! * T +
          angles[i * 3 + 2]! * T * T) *
          Math.PI) /
        180;
      value += b[i]! * (sine ? Math.sin(theta) : Math.cos(theta));
    }
    result[field] = value;
  }
  records.push(result);
}
await writeFile(
  'packages/astro/test/fixtures/mars-orientation.json',
  JSON.stringify(
    { source, model: 'IAU 2015, NAIF PCK00011', records },
    null,
    2,
  ),
);
