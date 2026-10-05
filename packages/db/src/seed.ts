import { BODIES } from '@space/domain';
import type { SpaceEntity } from '@space/domain';
import { sql } from 'drizzle-orm';
import type { Database } from './connection';
import { dataSources, objects, objectAliases } from './schema';
import { normalizeAlias } from './queries';
import spacecraft from '../../domain/data/spacecraft.json';

/** Stable topological order; invalid/cyclic parents fail before any writes. */
export function parentFirst<T extends SpaceEntity>(
  entities: readonly T[],
): T[] {
  const remaining = new Map(entities.map((entity) => [entity.id, entity]));
  if (remaining.size !== entities.length)
    throw new Error('Duplicate seed identity');
  const result: T[] = [],
    placed = new Set<string>();
  while (remaining.size) {
    const ready = [...remaining.values()].filter(
      (entity) => !entity.parentId || placed.has(entity.parentId),
    );
    if (!ready.length) throw new Error('Missing or cyclic seed parent');
    for (const entity of ready) {
      result.push(entity);
      placed.add(entity.id);
      remaining.delete(entity.id);
    }
  }
  return result;
}
export async function seedCatalog(db: Database) {
  const entities = parentFirst(BODIES);
  await db.transaction(async (tx) => {
    // Avoid concurrent seed interleavings when deployments/manual jobs overlap.
    await tx.execute(sql`select pg_advisory_xact_lock(471501)`);
    await tx
      .insert(dataSources)
      .values([
        {
          id: 'astronomy-engine',
          name: 'Astronomy Engine',
          homepage: 'https://github.com/cosinekitty/astronomy',
          license: 'MIT',
          attribution: 'Don Cross / Astronomy Engine',
        },
        {
          id: 'jpl-horizons',
          name: 'JPL Horizons',
          homepage: 'https://ssd.jpl.nasa.gov/horizons/',
          license: 'US government scientific data; see source terms',
          attribution: 'NASA/JPL-Caltech Horizons',
          termsUrl: 'https://ssd.jpl.nasa.gov/api.html',
        },
      ])
      .onConflictDoNothing();
    for (const entity of entities) {
      const value = {
        id: entity.id,
        kind: entity.kind,
        name: entity.name,
        parentId: entity.parentId ?? null,
        physical: entity.physical,
        provenance: entity.provenance,
        metadata: { ...entity.metadata, description: entity.description },
        tags: entity.tags,
        importance: entity.importance,
      };
      await tx
        .insert(objects)
        .values(value)
        .onConflictDoUpdate({
          target: objects.id,
          set: { ...value, updatedAt: new Date() },
        });
      // Keep future provider/user aliases; replace only catalog-owned aliases.
      await tx.execute(
        sql`delete from object_aliases where object_id = ${entity.id} and alias_type = 'catalog'`,
      );
      const names = [entity.name, entity.id, ...entity.aliases];
      const aliases = [
        ...new Map(
          names.map((alias) => [normalizeAlias(alias), alias]),
        ).entries(),
      ]
        .filter(([normalized]) => normalized.length > 0)
        .map(([aliasNorm, alias]) => ({
          objectId: entity.id,
          alias,
          aliasNorm,
          aliasType: 'catalog',
        }));
      await tx.insert(objectAliases).values(aliases).onConflictDoNothing();
    }
    for (const craft of spacecraft) {
      // Identity-only records: no physical provider, live status or invented coordinates.
      const value = {
        id: craft.id,
        kind: 'spacecraft' as const,
        name: craft.name,
        metadata: {
          sourceUrl: craft.sourceUrl,
          sourceVerifiedAt: craft.sourceVerifiedAt,
          positionAvailable: false,
        },
        importance: 50,
      };
      await tx
        .insert(objects)
        .values(value)
        .onConflictDoUpdate({
          target: objects.id,
          set: { ...value, updatedAt: new Date() },
        });
      await tx.execute(
        sql`delete from object_aliases where object_id = ${craft.id} and alias_type = 'catalog'`,
      );
      const aliases = [
        ...new Map(
          [craft.name, craft.id, ...craft.aliases].map((alias) => [
            normalizeAlias(alias),
            alias,
          ]),
        ).entries(),
      ].map(([aliasNorm, alias]) => ({
        objectId: craft.id,
        alias,
        aliasNorm,
        aliasType: 'catalog',
      }));
      await tx.insert(objectAliases).values(aliases).onConflictDoNothing();
    }
  });
  return { objects: entities.length + spacecraft.length };
}
