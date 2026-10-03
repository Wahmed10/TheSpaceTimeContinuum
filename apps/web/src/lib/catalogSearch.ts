import MiniSearch from 'minisearch';
import { EXPLORABLE_BODIES } from '@space/domain';
import type { BodySpec, EntityKind } from '@space/domain';

export const SEARCH_QUERY_LIMIT = 128;
export const SEARCH_RESULT_LIMIT = 8;
export type SearchMatch = 'exact' | 'prefix' | 'fuzzy' | 'suggested';
export interface EntitySearchResult {
  readonly id: string;
  readonly name: string;
  readonly kind: EntityKind;
  readonly color: string;
  readonly href: string;
  readonly importance: number;
  readonly score: number;
  readonly match: SearchMatch;
}
type SearchableEntity = Pick<
  BodySpec,
  'id' | 'name' | 'kind' | 'color' | 'importance'
> & { readonly aliases: readonly string[] };
const priority: Record<SearchMatch, number> = {
  exact: 3,
  prefix: 2,
  fuzzy: 1,
  suggested: 0,
};

export function normalizeSearchQuery(query: string): string {
  return query
    .slice(0, SEARCH_QUERY_LIMIT)
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, SEARCH_QUERY_LIMIT);
}
function compare(a: EntitySearchResult, b: EntitySearchResult): number {
  return (
    priority[b.match] - priority[a.match] ||
    b.score - a.score ||
    b.importance - a.importance ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}
/** Typed future merge boundary. There are no network/provider calls here. */
export function mergeEntityResults(
  ...sources: readonly (readonly EntitySearchResult[])[]
): EntitySearchResult[] {
  const unique = new Map<string, EntitySearchResult>();
  for (const source of sources)
    for (const result of source) {
      const previous = unique.get(result.id);
      if (!previous || compare(result, previous) < 0)
        unique.set(result.id, result);
    }
  return [...unique.values()].sort(compare).slice(0, SEARCH_RESULT_LIMIT);
}
export function createCatalogSearch(
  bodies: readonly SearchableEntity[] = EXPLORABLE_BODIES,
) {
  const records = new Map<
    string,
    { body: SearchableEntity; terms: string[] }
  >();
  const exact = new Map<string, Set<string>>();
  for (const body of bodies) {
    if (records.has(body.id)) continue;
    const terms = [
      ...new Set(
        [body.name, body.id, ...body.aliases].map(normalizeSearchQuery),
      ),
    ];
    records.set(body.id, { body, terms });
    for (const term of terms) {
      const ids = exact.get(term) ?? new Set<string>();
      ids.add(body.id);
      exact.set(term, ids);
    }
  }
  const index = new MiniSearch({
    fields: ['name', 'aliases', 'entityId'],
    searchOptions: {
      combineWith: 'AND',
      prefix: true,
      fuzzy: (term) =>
        term.length < 4 ? false : Math.min(2, Math.round(term.length * 0.3)),
      maxFuzzy: 2,
      boost: { name: 3, aliases: 2, entityId: 1 },
    },
  });
  index.addAll(
    [...records.values()].map(({ body }) => ({
      id: body.id,
      name: normalizeSearchQuery(body.name),
      aliases: body.aliases.map(normalizeSearchQuery).join(' '),
      entityId: normalizeSearchQuery(body.id),
    })),
  );
  function result(
    id: string,
    match: SearchMatch,
    score: number,
  ): EntitySearchResult {
    const body = records.get(id)!.body;
    return {
      id,
      name: body.name,
      kind: body.kind,
      color: body.color,
      importance: body.importance,
      href: `/object/${body.kind}/${body.id.split(':')[1]}`,
      match,
      score: match === 'exact' ? 1 : score,
    };
  }
  return (input: string): EntitySearchResult[] => {
    const query = normalizeSearchQuery(input);
    if (!query)
      return mergeEntityResults(
        [...records.keys()].map((id) => result(id, 'suggested', 0)),
      );
    const candidates = new Map<string, EntitySearchResult>();
    for (const hit of index.search(query)) {
      const id = String(hit.id),
        record = records.get(id);
      if (!record) continue;
      const match = record.terms.includes(query)
        ? 'exact'
        : record.terms.some((term) => term.startsWith(query))
          ? 'prefix'
          : 'fuzzy';
      candidates.set(id, result(id, match, hit.score));
    }
    for (const id of exact.get(query) ?? [])
      candidates.set(id, result(id, 'exact', 1));
    return mergeEntityResults([...candidates.values()]);
  };
}
let catalogSearch: ReturnType<typeof createCatalogSearch> | undefined;
/** One local catalog index per loaded module, created on its first query. */
export function searchEntities(query: string): EntitySearchResult[] {
  return (catalogSearch ??= createCatalogSearch())(query);
}
