import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BODIES, EXPLORABLE_BODIES } from '@space/domain';
import { createCatalogProvider } from '../src/ephemeris/catalogProviders';
import { createSolarSystemFrameTree } from '../src/frames/solarSystemFrames';
import { registerOsculatingTable } from '../src/ephemeris/OsculatingElementsProvider';
for (const body of BODIES.filter(
  (body) => body.provenance.providerId === 'jpl-horizons-orbital-elements',
)) {
  const bytes = readFileSync(
    new URL(
      `../../../apps/web/public/data/orbits/${body.id.split(':')[1]}.bin`,
      import.meta.url,
    ),
  );
  registerOsculatingTable(
    body.id,
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
}
it('resolves all 21 supported bodies into physical SSB states with parent-relative moons', () => {
  expect(EXPLORABLE_BODIES).toHaveLength(21);
  const tree = createSolarSystemFrameTree(),
    out = new Float64Array(6),
    parent = new Float64Array(6);
  for (const body of EXPLORABLE_BODIES) {
    const provider = createCatalogProvider(body);
    expect(provider.stateAt(8e8, out).ok).toBe(true);
    expect(tree.transformState(provider.frame, 'ICRF_SSB', 8e8, out, out)).toBe(
      true,
    );
    expect(out.every(Number.isFinite)).toBe(true);
    if (provider.frame === 'ICRF_BODY:jupiter') {
      tree.resolveOrigin('ICRF_BODY:jupiter', 8e8, parent);
      const distance = Math.hypot(
        out[0]! - parent[0]!,
        out[1]! - parent[1]!,
        out[2]! - parent[2]!,
      );
      expect(distance).toBeGreaterThan(400000);
      expect(distance).toBeLessThan(2000000);
    }
  }
});
it('refuses unvalidated catalog models instead of silently placing them at the origin', () => {
  expect(() =>
    createCatalogProvider({
        ...BODIES.find(body => !body.astronomyBody)!,
      id: 'moon:unknown',
      provenance: { ...BODIES[0]!.provenance, providerId: 'unknown' },
      }),
  ).toThrow('No validated');
});
