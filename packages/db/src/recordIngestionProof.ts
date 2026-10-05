import { mkdirSync, writeFileSync } from 'node:fs';
import { and, desc, eq } from 'drizzle-orm';
import { createDatabase } from './connection';
import { ingestionRuns, providerState } from './schema';
import { latestSnapshot } from './queries';
import { loadDatabaseEnvironment } from './cliEnvironment';

async function main() {
  loadDatabaseEnvironment();
  const start = new Date(process.env.INGEST_INVOCATION_STARTED_AT ?? '');
  if (!Number.isFinite(start.getTime()))
    throw new Error('Missing invocation start');
  const connection = createDatabase();
  try {
    const [state] = await connection.db
      .select({
        lastSuccessAt: providerState.lastSuccessAt,
        records: providerState.records,
      })
      .from(providerState)
      .where(eq(providerState.providerId, 'dummy-proof'))
      .limit(1);
    const [run] = await connection.db
      .select({
        id: ingestionRuns.id,
        startedAt: ingestionRuns.startedAt,
        finishedAt: ingestionRuns.finishedAt,
        recordsIn: ingestionRuns.recordsIn,
      })
      .from(ingestionRuns)
      .where(
        and(
          eq(ingestionRuns.providerId, 'dummy-proof'),
          eq(ingestionRuns.ok, true),
        ),
      )
      .orderBy(desc(ingestionRuns.startedAt))
      .limit(1);
    const snapshot = await latestSnapshot(
      connection.db,
      'ingestion-proof',
      'dummy-proof',
    );
    if (
      !state?.lastSuccessAt ||
      !run?.finishedAt ||
      !snapshot ||
      run.finishedAt.getTime() !== state.lastSuccessAt.getTime() ||
      snapshot.recordCount !== 1 ||
      state.records !== 1 ||
      run.recordsIn !== 1
    )
      throw new Error('Incomplete proof');
    const proof = {
      kind: 'ingestion-proof-readback',
      providerId: 'dummy-proof',
      workflow: {
        runId: process.env.GITHUB_RUN_ID ?? null,
        attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
        event: process.env.GITHUB_EVENT_NAME ?? 'local',
        commit: process.env.GITHUB_SHA ?? null,
      },
      invocationStartedAt: start.toISOString(),
      recordedAt: new Date().toISOString(),
      newSuccessDuringInvocation: run.startedAt.getTime() >= start.getTime(),
      ingestionRun: {
        id: run.id,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
      },
      status: { lastSuccessAt: state.lastSuccessAt, records: state.records },
      snapshot: {
        contentHash: snapshot.contentHash,
        sourceTimestamp: snapshot.sourceTimestamp,
        fetchedAt: snapshot.fetchedAt,
        ingestedAt: snapshot.ingestedAt,
        recordCount: snapshot.recordCount,
      },
      scheduledAcceptance:
        'Requires event=schedule, new success, reviewed run/source and matching API/status readback; this artifact alone is insufficient.',
    };
    mkdirSync('.tools', { recursive: true });
    writeFileSync(
      '.tools/ingestion-proof.json',
      JSON.stringify(proof, null, 2) + '\n',
    );
    console.log(
      'Sanitized ingestion readback saved to .tools/ingestion-proof.json.',
    );
  } finally {
    await connection.close();
  }
}
main().catch(() => {
  console.error(
    'Ingestion proof readback failed; private configuration and database details withheld.',
  );
  process.exitCode = 1;
});
