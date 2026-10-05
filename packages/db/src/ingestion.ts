import { randomUUID } from 'node:crypto';
import { and, eq, sql, isNotNull, gt, lte, or, isNull } from 'drizzle-orm';
import type { Database } from './connection';
import {
  dataSources,
  ingestionRuns,
  layerSnapshots,
  providerActions,
  providerState,
} from './schema';

export type IngestionTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];
export interface ProviderDefinition {
  id: string;
  host: string;
  minIntervalMs: number;
  source: typeof dataSources.$inferInsert;
}
export interface IngestionLease {
  providerId: string;
  owner: string;
  runId: number;
  priorFailures: number;
}
export interface RunCounts {
  recordsIn: number;
  recordsUpserted: number;
  payloadBytes: number;
}
export interface RetentionPolicy {
  days: number;
  maxRows: number;
  maxBytes: number;
}
export interface IngestionStore {
  register(provider: ProviderDefinition): Promise<void>;
  claim(
    provider: ProviderDefinition,
    now: Date,
    leaseMs: number,
  ): Promise<IngestionLease | null>;
  pauseHost(host: string, status: number, now: Date): Promise<void>;
  complete(
    lease: IngestionLease,
    now: Date,
    nextRun: Date,
    persist: (tx: IngestionTransaction) => Promise<RunCounts>,
    retention: RetentionPolicy,
  ): Promise<RunCounts>;
  fail(
    lease: IngestionLease,
    now: Date,
    nextRun: Date,
    errorCode: string,
    httpStatus?: number,
  ): Promise<void>;
  resume(
    providerId: string,
    actor: string,
    note: string,
    now: Date,
  ): Promise<number>;
}
export class IngestionLeaseLost extends Error {
  constructor() {
    super('Ingestion lease no longer owned');
  }
}
const lockHost = (tx: IngestionTransaction, host: string) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`ingest:${host}`}))`);

export async function persistSnapshots(
  tx: IngestionTransaction,
  snapshots: readonly (typeof layerSnapshots.$inferInsert)[],
): Promise<number> {
  let inserted = 0;
  for (const snapshot of snapshots) {
    const rows = await tx
      .insert(layerSnapshots)
      .values(snapshot)
      .onConflictDoNothing({
        target: [
          layerSnapshots.layer,
          layerSnapshots.groupKey,
          layerSnapshots.sourceId,
          layerSnapshots.contentHash,
        ],
      })
      .returning({ hash: layerSnapshots.contentHash });
    inserted += rows.length;
    if (!rows.length) {
      // Same content is not a second snapshot. A successful revalidation refreshes fetch time only.
      await tx
        .update(layerSnapshots)
        .set({ fetchedAt: snapshot.fetchedAt })
        .where(
          and(
            eq(layerSnapshots.layer, snapshot.layer),
            eq(layerSnapshots.groupKey, snapshot.groupKey),
            eq(layerSnapshots.sourceId, snapshot.sourceId),
            eq(layerSnapshots.contentHash, snapshot.contentHash),
          ),
        );
    }
  }
  return inserted;
}
async function prune(
  tx: IngestionTransaction,
  source: string,
  now: Date,
  policy: RetentionPolicy,
) {
  const cutoff = new Date(now.getTime() - policy.days * 86400_000);
  // Preserve newest last-good per group. Evict older snapshots by age, rows AND byte budget.
  await tx.execute(sql`with ranked as (
    select layer, group_key, ingested_at,
      row_number() over (partition by layer, group_key order by fetched_at desc, ingested_at desc) as group_rank,
      row_number() over (order by fetched_at desc, ingested_at desc, layer, group_key) as total_rank,
      sum(pg_column_size(payload)) over (order by fetched_at desc, ingested_at desc, layer, group_key) as retained_bytes
    from layer_snapshots where source_id = ${source}
  ) delete from layer_snapshots s using ranked r
    where s.source_id = ${source} and s.layer = r.layer and s.group_key = r.group_key and s.ingested_at = r.ingested_at
      and r.group_rank > 1 and (s.ingested_at < ${cutoff} or r.total_rank > ${policy.maxRows} or r.retained_bytes > ${policy.maxBytes})`);
  await tx.execute(sql`with ranked as (
    select id, ingested_at, row_number() over (order by ingested_at desc, id desc) as rank,
      sum(coalesce(pg_column_size(raw), 0)) over (order by ingested_at desc, id desc) as retained_bytes
    from provider_records where source_id = ${source}
  ) delete from provider_records p using ranked r where p.id = r.id
    and (r.ingested_at < ${cutoff} or r.rank > ${policy.maxRows} or r.retained_bytes > ${policy.maxBytes})`);
}
export function createIngestionStore(db: Database): IngestionStore {
  const sourceByProvider = new Map<string, string>();
  async function owned(
    tx: IngestionTransaction,
    lease: IngestionLease,
    now: Date,
  ) {
    const [state] = await tx
      .select()
      .from(providerState)
      .where(eq(providerState.providerId, lease.providerId))
      .for('update');
    if (
      !state ||
      state.leaseOwner !== lease.owner ||
      !state.leaseUntil ||
      state.leaseUntil <= now
    )
      throw new IngestionLeaseLost();
    return state;
  }
  return {
    async register(provider) {
      sourceByProvider.set(provider.id, provider.source.id);
      await db.transaction(async (tx) => {
        await tx
          .insert(dataSources)
          .values(provider.source)
          .onConflictDoNothing();
        await tx
          .insert(providerState)
          .values({ providerId: provider.id, host: provider.host })
          .onConflictDoNothing();
        const [state] = await tx
          .select()
          .from(providerState)
          .where(eq(providerState.providerId, provider.id));
        if (state?.host !== provider.host)
          throw new Error('Provider host changed; operator migration required');
      });
    },
    async claim(provider, now, leaseMs) {
      return db.transaction(async (tx) => {
        await lockHost(tx, provider.host);
        const blocked = await tx
          .select({ id: providerState.providerId })
          .from(providerState)
          .where(
            and(
              eq(providerState.host, provider.host),
              or(
                isNotNull(providerState.pausedAt),
                gt(providerState.leaseUntil, now),
              ),
            ),
          )
          .limit(1);
        if (blocked.length) return null;
        const [state] = await tx
          .select()
          .from(providerState)
          .where(
            and(
              eq(providerState.providerId, provider.id),
              or(
                isNull(providerState.nextRunAt),
                lte(providerState.nextRunAt, now),
              ),
            ),
          )
          .for('update');
        if (!state) return null;
        // Interrupted runs remain explicit failures rather than disappearing from bookkeeping.
        await tx
          .update(ingestionRuns)
          .set({ finishedAt: now, ok: false, error: 'lease-expired' })
          .where(
            and(
              eq(ingestionRuns.providerId, provider.id),
              isNull(ingestionRuns.finishedAt),
            ),
          );
        const owner = randomUUID();
        await tx
          .update(providerState)
          .set({
            leaseOwner: owner,
            leaseUntil: new Date(now.getTime() + leaseMs),
            lastRunAt: now,
          })
          .where(eq(providerState.providerId, provider.id));
        const [run] = await tx
          .insert(ingestionRuns)
          .values({ providerId: provider.id, startedAt: now })
          .returning({ id: ingestionRuns.id });
        return {
          providerId: provider.id,
          owner,
          runId: run!.id,
          priorFailures: state.consecutiveFailures,
        };
      });
    },
    async pauseHost(host, status, now) {
      await db.transaction(async (tx) => {
        await lockHost(tx, host);
        const states = await tx
          .update(providerState)
          .set({
            pausedAt: now,
            pauseReason: 'HTTP_NON_200',
            lastHttpStatus: status,
          })
          .where(eq(providerState.host, host))
          .returning({ id: providerState.providerId });
        for (const state of states)
          await tx.insert(providerActions).values({
            providerId: state.id,
            action: 'pause',
            actor: 'runner',
            note: `HTTP ${status}`,
            createdAt: now,
          });
      });
    },
    async complete(lease, now, nextRun, persist, retention) {
      return db.transaction(async (tx) => {
        const [hostState] = await tx
          .select({ host: providerState.host })
          .from(providerState)
          .where(eq(providerState.providerId, lease.providerId));
        if (!hostState) throw new IngestionLeaseLost();
        await lockHost(tx, hostState.host);
        const state = await owned(tx, lease, now);
        if (state.pausedAt) throw new IngestionLeaseLost();
        const counts = await persist(tx);
        if (
          ![
            counts.recordsIn,
            counts.recordsUpserted,
            counts.payloadBytes,
          ].every((value) => Number.isSafeInteger(value) && value >= 0)
        )
          throw new Error('Invalid ingestion counts');
        const source = sourceByProvider.get(lease.providerId);
        if (!source) throw new Error('Provider not registered');
        // Current last-good data itself must fit the configured budget; rollback replacement if not.
        const budget = await tx.execute<{
          bytes: number;
          rows: number;
        }>(sql`select coalesce(sum(size), 0)::float8 as bytes, count(*)::int as rows from (
          select distinct on (layer, group_key) pg_column_size(payload) as size from layer_snapshots
          where source_id = ${source} order by layer, group_key, fetched_at desc, ingested_at desc
        ) current_groups`);
        if (
          budget.rows[0]!.bytes > retention.maxBytes ||
          budget.rows[0]!.rows > retention.maxRows
        )
          throw new Error('Last-good snapshots exceed retention budget');
        await prune(tx, source, now, retention);
        await tx
          .update(ingestionRuns)
          .set({
            finishedAt: now,
            ok: true,
            recordsIn: counts.recordsIn,
            recordsUpserted: counts.recordsUpserted,
            payloadBytes: counts.payloadBytes,
          })
          .where(eq(ingestionRuns.id, lease.runId));
        await tx
          .update(providerState)
          .set({
            lastSuccessAt: now,
            nextRunAt: nextRun,
            consecutiveFailures: 0,
            lastError: null,
            lastHttpStatus: null,
            records: counts.recordsIn,
            leaseOwner: null,
            leaseUntil: null,
          })
          .where(eq(providerState.providerId, lease.providerId));
        return counts;
      });
    },
    async fail(lease, now, nextRun, errorCode, httpStatus) {
      await db.transaction(async (tx) => {
        const [hostState] = await tx
          .select({ host: providerState.host })
          .from(providerState)
          .where(eq(providerState.providerId, lease.providerId));
        if (!hostState) throw new IngestionLeaseLost();
        await lockHost(tx, hostState.host);
        const state = await owned(tx, lease, now);
        if (errorCode === 'HTTP_NON_200' && httpStatus !== undefined) {
          // A second atomic persistence path protects the pause if the fetch callback's DB write failed.
          const paused = await tx
            .update(providerState)
            .set({
              pausedAt: now,
              pauseReason: errorCode,
              lastHttpStatus: httpStatus,
            })
            .where(
              and(
                eq(providerState.host, state.host),
                isNull(providerState.pausedAt),
              ),
            )
            .returning({ id: providerState.providerId });
          for (const item of paused)
            await tx
              .insert(providerActions)
              .values({
                providerId: item.id,
                action: 'pause',
                actor: 'runner',
                note: `HTTP ${httpStatus}`,
                createdAt: now,
              });
        }
        await tx
          .update(ingestionRuns)
          .set({
            finishedAt: now,
            ok: false,
            error: errorCode,
            httpStatus: httpStatus ?? null,
          })
          .where(eq(ingestionRuns.id, lease.runId));
        await tx
          .update(providerState)
          .set({
            nextRunAt: nextRun,
            consecutiveFailures: state.consecutiveFailures + 1,
            lastError: errorCode,
            lastHttpStatus: httpStatus ?? null,
            leaseOwner: null,
            leaseUntil: null,
          })
          .where(eq(providerState.providerId, lease.providerId));
      });
    },
    async resume(providerId, actor, note, now) {
      if (
        !actor.trim() ||
        !note.trim() ||
        actor.length > 120 ||
        note.length > 400
      )
        throw new Error(
          'Resume requires bounded operator identity and acknowledgement',
        );
      return db.transaction(async (tx) => {
        const [state] = await tx
          .select()
          .from(providerState)
          .where(eq(providerState.providerId, providerId));
        if (!state) throw new Error('Unknown provider');
        await lockHost(tx, state.host);
        const resumed = await tx
          .update(providerState)
          .set({
            pausedAt: null,
            pauseReason: null,
            resumedAt: now,
            resumedBy: actor,
            resumeNote: note,
            nextRunAt: now,
          })
          .where(
            and(
              eq(providerState.host, state.host),
              isNotNull(providerState.pausedAt),
            ),
          )
          .returning({ id: providerState.providerId });
        for (const item of resumed)
          await tx.insert(providerActions).values({
            providerId: item.id,
            action: 'resume',
            actor,
            note,
            createdAt: now,
          });
        return resumed.length;
      });
    },
  };
}
