import { it, expect } from 'vitest';
import { buildCatalog } from '../src/buildCatalog';
import { BODIES } from '../src/catalog';
it('validates the complete curated catalog and references', () => {
  const bodies = buildCatalog();
  expect(BODIES).toEqual(bodies);
  expect(bodies).toHaveLength(21);
  const ids = new Set(bodies.map((b) => b.id));
  expect(ids.size).toBe(bodies.length);
  for (const b of bodies)
    if (b.parentId) expect(ids.has(b.parentId)).toBe(true);
});
