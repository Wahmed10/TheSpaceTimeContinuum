import { it, expect } from 'vitest';
import { buildCatalog } from '../src/catalog';
it('validates the complete curated catalog and references', () => {
  const bodies = buildCatalog();
  expect(bodies).toHaveLength(21);
  const ids = new Set(bodies.map((b) => b.id));
  expect(ids.size).toBe(bodies.length);
  for (const b of bodies)
    if (b.parentId) expect(ids.has(b.parentId)).toBe(true);
});
