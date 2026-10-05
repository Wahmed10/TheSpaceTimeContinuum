import { sql, eq, and, desc } from 'drizzle-orm';
import type { EntityKind } from '@space/domain';
import type { Database } from './connection';
import {
  objects,
  objectAliases,
  layerSnapshots,
  providerState,
} from './schema';

const kinds: readonly EntityKind[] = [
  'star',
  'planet',
  'moon',
  'dwarf',
  'asteroid',
  'satellite',
  'spacecraft',
  'barycenter',
];
export interface SearchInput {
  q: string;
  kinds?: readonly EntityKind[];
  limit?: number;
}
export function normalizeAlias(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
export function validateSearch(input: SearchInput) {
  const q = normalizeAlias(input.q);
  const limit = input.limit ?? 20;
  if (
    q.length < 1 ||
    q.length > 120 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    input.kinds?.some((kind) => !kinds.includes(kind))
  )
    throw new Error('Invalid search query');
  return { q, limit, kinds: input.kinds ?? [] };
}
export function buildSearchQuery(input: SearchInput) {
  const { q, limit, kinds } = validateSearch(input);
  // Escape LIKE wildcards so a user's percent/underscore is literal, not a full-table request.
  const prefix = q.replace(/[\\%_]/g, '\\$&') + '%';
  const kindFilter = kinds.length
    ? sql`and o.kind in (${sql.join(
        kinds.map((kind) => sql`${kind}`),
        sql`, `,
      )})`
    : sql``;
  return sql`
    select o.id, o.kind, o.name, o.parent_id as "parentId", o.physical,
      o.metadata, o.provenance, o.tags, o.importance,
      max(case when a.alias_norm = ${q} then 2.0
        when a.alias_norm like ${prefix} escape '\\' then 1.0
        else similarity(a.alias_norm, ${q}) end) as score
    from objects o join object_aliases a on a.object_id = o.id
    where (a.alias_norm = ${q} or a.alias_norm like ${prefix} escape '\\'
      or a.alias_norm % ${q}) ${kindFilter}
    group by o.id order by score desc, o.importance desc, o.id asc limit ${limit}`;
}
export async function searchObjects(db: Database, input: SearchInput) {
  return (await db.execute(buildSearchQuery(input))).rows;
}
export async function getObject(db: Database, id: string) {
  return (
    (await db.select().from(objects).where(eq(objects.id, id)).limit(1))[0] ??
    null
  );
}
export async function getObjectAliases(db: Database, id: string) {
  return (
    await db
      .select({ alias: objectAliases.alias })
      .from(objectAliases)
      .where(eq(objectAliases.objectId, id))
      .orderBy(objectAliases.aliasNorm)
      .limit(100)
  ).map((row) => row.alias);
}
export async function latestSnapshot(
  db: Database,
  layer: string,
  group: string,
) {
  return (
    (
      await db
        .select()
        .from(layerSnapshots)
        .where(
          and(
            eq(layerSnapshots.layer, layer),
            eq(layerSnapshots.groupKey, group),
          ),
        )
        .orderBy(
          desc(layerSnapshots.fetchedAt),
          desc(layerSnapshots.ingestedAt),
        )
        .limit(1)
    )[0] ?? null
  );
}
export async function providerStatuses(db: Database) {
  return db
    .select()
    .from(providerState)
    .orderBy(providerState.providerId)
    .limit(100);
}
