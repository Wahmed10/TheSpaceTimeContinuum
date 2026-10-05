// Explicit live gate, deliberately outside *.test.ts: no silent credential-based skips.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { createDatabase } from '../src/connection';
import { DatabaseConfigurationError } from '../src/config';
import { loadDatabaseEnvironment } from '../src/cliEnvironment';
import { seedCatalog } from '../src/seed';
import {
  objects,
  objectAliases,
  dataSources,
  layerSnapshots,
} from '../src/schema';
import { searchObjects, getObject } from '../src/queries';

async function run() {
  loadDatabaseEnvironment();
  if (
    process.env.DB_TEST_ALLOW_WRITES !== 'development' ||
    !process.env.TEST_DATABASE_URL
  )
    throw new Error(
      'Live gate requires TEST_DATABASE_URL for a disposable development branch and DB_TEST_ALLOW_WRITES=development. No writes performed.',
    );
  const connection = createDatabase({
    DATABASE_URL: process.env.TEST_DATABASE_URL,
  });
  const { db } = connection;
  try {
    await migrate(db, {
      migrationsFolder: fileURLToPath(
        new URL('../migrations', import.meta.url),
      ),
    });
    const first = await seedCatalog(db);
    const before = await db.select().from(objectAliases);
    assert.deepEqual(await seedCatalog(db), first);
    assert.equal((await db.select().from(objectAliases)).length, before.length);
    assert.equal(
      (await searchObjects(db, { q: 'Europa', kinds: ['moon'] }))[0]?.id,
      'moon:europa',
    );
    assert.equal(
      (await searchObjects(db, { q: 'jwst' }))[0]?.id,
      'spacecraft:jwst',
    );
    assert.equal(
      (await searchObjects(db, { q: "%'_\\; drop table objects; --" })).length,
      0,
    );
    const id = `spacecraft:test-${randomUUID()}`;
    const sentinel = new Error('expected rollback');
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx
          .insert(objects)
          .values({ id, name: 'Temporary test', kind: 'spacecraft' });
        throw sentinel;
      }),
      (error) => error === sentinel,
    );
    assert.equal(await getObject(db, id), null);
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.insert(objectAliases).values({
          objectId: id,
          alias: 'orphan',
          aliasNorm: 'orphan',
          aliasType: 'test',
        });
      }),
    );
    // Duplicate snapshot identity must fail and roll back both inserts, even at different ingestion times.
    const source = `test-${randomUUID()}`;
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.insert(dataSources).values({
          id: source,
          name: 'Integration only',
          license: 'test',
          attribution: 'test',
        });
        const snapshot = {
          layer: 'test',
          groupKey: source,
          sourceId: source,
          fetchedAt: new Date(),
          recordCount: 1,
          contentHash: 'same-hash',
          payload: { test: true },
        };
        await tx
          .insert(layerSnapshots)
          .values({ ...snapshot, ingestedAt: new Date(0) });
        await tx
          .insert(layerSnapshots)
          .values({ ...snapshot, ingestedAt: new Date(1000) });
      }),
    );
    assert.equal(
      (await db.select().from(dataSources).where(eq(dataSources.id, source)))
        .length,
      0,
    );
    await db.execute(sql`select 1`);
    console.log(
      JSON.stringify({
        gate: 'P4B.1 live Neon',
        passed: true,
        seededIdentities: first.objects,
        checks: [
          'migrations',
          'repeat seed',
          'parameterized search',
          'rollback',
          'foreign key',
          'snapshot deduplication',
        ],
      }),
    );
  } finally {
    await connection.close();
  }
}
run().catch((error: unknown) => {
  console.error(
    error instanceof DatabaseConfigurationError
      ? error.message
      : 'Live database gate failed or is not configured. Connection details withheld; no pass is recorded.',
  );
  process.exitCode = 1;
});
