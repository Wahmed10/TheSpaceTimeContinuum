// Explicit live persistence gate; never skipped silently in the unit suite.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { createDatabase } from '../src/connection';
import { loadDatabaseEnvironment } from '../src/config';
import {
  createIngestionStore,
  IngestionLeaseLost,
  persistSnapshots,
} from '../src/ingestion';
import type { IngestionLease, ProviderDefinition } from '../src/ingestion';
import {
  dataSources,
  ingestionRuns,
  layerSnapshots,
  providerActions,
  providerState,
} from '../src/schema';
import { latestSnapshot } from '../src/queries';

async function main() {
  loadDatabaseEnvironment();
  if (
    process.env.DB_TEST_ALLOW_WRITES !== 'development' ||
    !process.env.TEST_DATABASE_URL
  )
    throw new Error('Live development branch not configured');
  const first = createDatabase({ DATABASE_URL: process.env.TEST_DATABASE_URL });
  const second = createDatabase({
    DATABASE_URL: process.env.TEST_DATABASE_URL,
  });
  const db = first.db,
    store = createIngestionStore(db),
    competitor = createIngestionStore(second.db);
  const token = randomUUID();
  const provider: ProviderDefinition = {
    id: `test-ingest-${token}`,
    host: `test-host-${token}`,
    minIntervalMs: 7200_000,
    source: {
      id: `test-source-${token}`,
      name: 'Integration only',
      license: 'test fixture',
      attribution: 'test',
    },
  };
  const sibling = { ...provider, id: `test-sibling-${token}` };
  const baseline = new Date();
  let clock = baseline.getTime();
  const tick = () => new Date(++clock);
  const policy = { days: 30, maxRows: 100, maxBytes: 32 * 1024 * 1024 };
  const snapshot = (hash: string, fetchedAt: Date, ingestedAt = fetchedAt) => ({
    layer: 'integration',
    groupKey: provider.id,
    sourceId: provider.source.id,
    sourceTimestamp: baseline,
    fetchedAt,
    ingestedAt,
    recordCount: 1,
    contentHash: hash,
    payload: { hash, test: true },
  });
  const checks: string[] = [];
  const passedCheck = (name: string) => {
    checks.push(name);
    console.log(JSON.stringify({ check: name, passed: true }));
  };
  async function lease() {
    const claimed = await store.claim(provider, tick(), 600_000);
    assert.ok(claimed);
    return claimed;
  }
  async function complete(
    claimed: IngestionLease,
    hash: string,
    retention = policy,
  ) {
    const time = tick();
    return store.complete(
      claimed,
      time,
      time,
      async (tx) => ({
        recordsIn: 1,
        recordsUpserted: await persistSnapshots(tx, [snapshot(hash, time)]),
        payloadBytes: 32,
      }),
      retention,
    );
  }
  try {
    await store.register(provider);
    await competitor.register(provider);
    await store.register(sibling);
    const claims = await Promise.all([
      store.claim(provider, baseline, 600_000),
      competitor.claim(provider, baseline, 600_000),
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(await store.claim(sibling, baseline, 600_000), null);
    const winner = claims.find(Boolean)!;
    const winningStore = claims[0] ? store : competitor;
    const time = tick();
    await winningStore.complete(
      winner,
      time,
      time,
      async (tx) => ({
        recordsIn: 1,
        recordsUpserted: await persistSnapshots(tx, [snapshot('A', time)]),
        payloadBytes: 32,
      }),
      policy,
    );
    passedCheck('cross-pool host lease exclusivity');
    const stateA = (
      await db
        .select()
        .from(providerState)
        .where(eq(providerState.providerId, provider.id))
    )[0]!;
    assert.equal(stateA.records, 1);
    assert.equal(stateA.consecutiveFailures, 0);
    const initialRun = (
      await db
        .select()
        .from(ingestionRuns)
        .where(eq(ingestionRuns.id, winner.runId))
    )[0]!;
    assert.equal(initialRun.ok, true);
    assert.equal(initialRun.recordsIn, 1);
    assert.equal(
      (
        await latestSnapshot(db, 'integration', provider.id)
      )?.sourceTimestamp?.getTime(),
      baseline.getTime(),
    );
    passedCheck('atomic snapshot/run/freshness persistence');

    const failed = await lease();
    const deliberate = new Error('integration rollback');
    await assert.rejects(
      store.complete(
        failed,
        tick(),
        tick(),
        async (tx) => {
          await persistSnapshots(tx, [snapshot('BAD', tick())]);
          throw deliberate;
        },
        policy,
      ),
      (error) => error === deliberate,
    );
    assert.equal(
      (await latestSnapshot(db, 'integration', provider.id))?.contentHash,
      'A',
    );
    assert.equal(
      (
        await db
          .select()
          .from(ingestionRuns)
          .where(eq(ingestionRuns.id, failed.runId))
      )[0]!.ok,
      null,
    );
    await store.fail(failed, tick(), tick(), 'PERSISTENCE');
    const stateFailed = (
      await db
        .select()
        .from(providerState)
        .where(eq(providerState.providerId, provider.id))
    )[0]!;
    assert.equal(
      stateFailed.lastSuccessAt?.getTime(),
      stateA.lastSuccessAt?.getTime(),
    );
    assert.equal(stateFailed.consecutiveFailures, 1);
    passedCheck('failed replacement rollback and last-good retention');

    await complete(await lease(), 'B');
    await complete(await lease(), 'A');
    const snapshots = await db
      .select()
      .from(layerSnapshots)
      .where(eq(layerSnapshots.sourceId, provider.source.id));
    assert.equal(snapshots.length, 2);
    assert.equal(
      (await latestSnapshot(db, 'integration', provider.id))?.contentHash,
      'A',
    );
    passedCheck('content deduplication and freshest revalidated snapshot');

    const pausedLease = await lease();
    await store.pauseHost(provider.host, 403, tick());
    await store.fail(pausedLease, tick(), tick(), 'HTTP_NON_200', 403);
    const restarted = createIngestionStore(second.db);
    await restarted.register(provider);
    assert.equal(await restarted.claim(provider, tick(), 600_000), null);
    assert.equal(await restarted.claim(sibling, tick(), 600_000), null);
    await assert.rejects(restarted.resume(provider.id, '', '', tick()));
    assert.equal(
      await restarted.resume(
        provider.id,
        'integration-test',
        'verified request configuration',
        tick(),
      ),
      2,
    );
    const actions = await db
      .select()
      .from(providerActions)
      .where(eq(providerActions.providerId, provider.id))
      .orderBy(providerActions.id);
    assert.deepEqual(
      actions.map((item) => item.action),
      ['pause', 'resume'],
    );
    passedCheck('durable host pause and audited explicit resume');

    const limited = await lease();
    await assert.rejects(
      complete(limited, 'TOO-LARGE', { ...policy, maxBytes: 1 }),
    );
    assert.equal(
      (await latestSnapshot(db, 'integration', provider.id))?.contentHash,
      'A',
    );
    await store.fail(limited, tick(), tick(), 'PERSISTENCE');
    await complete(await lease(), 'C', { ...policy, maxRows: 1 });
    assert.equal(
      (
        await db
          .select()
          .from(layerSnapshots)
          .where(eq(layerSnapshots.sourceId, provider.source.id))
      ).length,
      1,
    );
    passedCheck('bounded snapshot retention and over-budget rollback');

    const expiring = await store.claim(provider, tick(), 1);
    assert.ok(expiring);
    clock += 2;
    const replacement = await lease();
    await assert.rejects(
      store.complete(
        expiring,
        tick(),
        tick(),
        async () => ({ recordsIn: 0, recordsUpserted: 0, payloadBytes: 0 }),
        policy,
      ),
      IngestionLeaseLost,
    );
    const expiredRun = (
      await db
        .select()
        .from(ingestionRuns)
        .where(eq(ingestionRuns.id, expiring.runId))
    )[0]!;
    assert.equal(expiredRun.ok, false);
    assert.equal(expiredRun.error, 'lease-expired');
    await store.fail(
      replacement,
      tick(),
      new Date(clock + 7200_000),
      'NETWORK',
    );
    assert.equal(await store.claim(provider, tick(), 600_000), null);
    passedCheck('lease expiration recovery and future due suppression');
    console.log(
      JSON.stringify({ gate: 'P4B.2 live persistence', passed: true, checks }),
    );
  } finally {
    // Only this run's UUID-namespaced fixtures are removed, never provider/user/catalog data.
    await db.transaction(async (tx) => {
      for (const id of [provider.id, sibling.id]) {
        await tx
          .delete(providerActions)
          .where(eq(providerActions.providerId, id));
        await tx.delete(ingestionRuns).where(eq(ingestionRuns.providerId, id));
        await tx.delete(providerState).where(eq(providerState.providerId, id));
      }
      await tx
        .delete(layerSnapshots)
        .where(eq(layerSnapshots.sourceId, provider.source.id));
      await tx
        .delete(dataSources)
        .where(eq(dataSources.id, provider.source.id));
      await tx.execute(sql`select 1`);
    });
    await Promise.all([first.close(), second.close()]);
  }
}
main().catch(() => {
  console.error(
    'Live ingestion persistence gate failed or is not configured. No pass is recorded; private database errors are withheld.',
  );
  process.exitCode = 1;
});
