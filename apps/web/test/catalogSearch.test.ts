import { expect, it } from 'vitest';
import { EXPLORABLE_BODIES } from '@space/domain';
import {
  createCatalogSearch,
  mergeEntityResults,
  normalizeSearchQuery,
  searchEntities,
  SEARCH_QUERY_LIMIT,
  SEARCH_RESULT_LIMIT,
} from '../src/lib/catalogSearch';

for (const body of EXPLORABLE_BODIES) {
  it(`finds ${body.id} first by exact name, ID and each catalog alias`, () => {
    for (const query of [body.name, body.id, ...body.aliases]) {
      const results = searchEntities(query);
      expect(results[0]).toMatchObject({
        id: body.id,
        match: 'exact',
        href: `/object/${body.kind}/${body.id.split(':')[1]}`,
      });
      expect(new Set(results.map((result) => result.id)).size).toBe(
        results.length,
      );
    }
  });
}
it('normalizes whitespace, mixed case and compatibility Unicode', () => {
  expect(searchEntities('  oUr   PLANET ')[0]?.id).toBe('planet:earth');
  expect(searchEntities('ＥＡＲＴＨ')[0]?.id).toBe('planet:earth');
  expect(searchEntities('MOON:CHARON')[0]?.id).toBe('moon:charon');
});
it('matches prefixes and bounded typos without fuzzy expansion of short terms', () => {
  for (const [query, id] of [
    ['Eur', 'moon:europa'],
    ['planet:mar', 'planet:mars'],
    ['Jupitr', 'planet:jupiter'],
    ['Chraon', 'moon:charon'],
    ['Euorpa', 'moon:europa'],
    ['Plto', 'dwarf:pluto'],
  ] as const)
    expect(searchEntities(query)[0]?.id).toBe(id);
  expect(searchEntities('Io')[0]?.id).toBe('moon:io');
  expect(searchEntities('zz')).toEqual([]);
});
it('ranks exact ahead of prefix and fuzzy even when other bodies have greater importance', () => {
  const mars = EXPLORABLE_BODIES.find((body) => body.id === 'planet:mars')!;
  const search = createCatalogSearch([
    mars,
    { ...mars, id: 'moon:prefix', name: 'Marsfield', importance: 1000 },
    { ...mars, id: 'moon:fuzzy', name: 'Marz', importance: 2000 },
  ]);
  expect(search('Mars').map((result) => [result.id, result.match])).toEqual([
    ['planet:mars', 'exact'],
    ['moon:prefix', 'prefix'],
    ['moon:fuzzy', 'fuzzy'],
  ]);
});
it('deduplicates aliases and IDs when constructing an index', () => {
  const earth = EXPLORABLE_BODIES.find((body) => body.id === 'planet:earth')!;
  const search = createCatalogSearch([
    { ...earth, aliases: ['Terra', 'terra', 'Terra', 'our planet'] },
    earth,
  ]);
  expect(search('terra').map((result) => result.id)).toEqual(['planet:earth']);
  expect(search('planet:earth')).toHaveLength(1);
});
it('empty input shows a short deterministic list ranked by importance', () => {
  const results = searchEntities('   ');
  expect(results).toHaveLength(SEARCH_RESULT_LIMIT);
  expect(results[0]?.id).toBe('star:sun');
  expect(results.map((result) => result.importance)).toEqual(
    [...results.map((result) => result.importance)].sort((a, b) => b - a),
  );
  expect(searchEntities('')).toEqual(results);
});
it('bounds queries and results, including long and punctuation-only input', () => {
  expect(normalizeSearchQuery('x'.repeat(10000))).toHaveLength(
    SEARCH_QUERY_LIMIT,
  );
  expect(searchEntities('moon').length).toBeLessThanOrEqual(
    SEARCH_RESULT_LIMIT,
  );
  expect(searchEntities('x'.repeat(10000))).toEqual([]);
  expect(searchEntities(':::')).toEqual([]);
  expect(searchEntities('an unavailable spacecraft')).toEqual([]);
});
it('supports a deterministic typed merge boundary without introducing remote search', () => {
  const results = searchEntities('moon');
  const duplicate = { ...results[0]!, match: 'fuzzy' as const, score: 900 };
  const merged = mergeEntityResults([duplicate], results, results);
  expect(merged).toEqual(results);
  expect(new Set(merged.map((result) => result.id)).size).toBe(merged.length);
});
it('uses importance then stable ID to break otherwise equal ranks', () => {
  const sun = EXPLORABLE_BODIES[0]!;
  const search = createCatalogSearch([
    { ...sun, id: 'moon:z', name: 'Twin', importance: 10 },
    { ...sun, id: 'moon:a', name: 'Twin', importance: 10 },
    { ...sun, id: 'moon:important', name: 'Twin', importance: 20 },
  ]);
  expect(search('Twin').map((result) => result.id)).toEqual([
    'moon:important',
    'moon:a',
    'moon:z',
  ]);
});
