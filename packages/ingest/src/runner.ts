import {
  createDatabase,
  createIngestionStore,
  DatabaseConfigurationError,
} from '@space/db';
import {
  ingestConfig,
  loadDatabaseEnvironment,
  IngestionConfigurationError,
} from './config';
import { createDummyProvider } from './providers/DummyProvider';
import { runDue } from './scheduler';

async function main() {
  loadDatabaseEnvironment();
  const resume = process.argv[2] === 'resume';
  const config = ingestConfig();
  if (!resume && process.env.INGEST_PROVIDERS !== 'dummy')
    throw new IngestionConfigurationError(
      'Set INGEST_PROVIDERS=dummy for the scheduled proof. No live providers are implemented yet.',
    );
  const connection = createDatabase();
  try {
    const store = createIngestionStore(connection.db);
    if (resume) {
      const [, , , provider, actor, note] = process.argv;
      if (!provider || !actor || !note)
        throw new IngestionConfigurationError(
          'Usage: ingest:due resume <provider-id> <operator> <acknowledgement>',
        );
      console.log(
        JSON.stringify({
          resumed: await store.resume(provider, actor, note, new Date()),
        }),
      );
    } else {
      const report = await runDue([createDummyProvider()], store, config);
      console.log(JSON.stringify({ providers: report }));
      if (report.some((item) => item.outcome === 'failed'))
        process.exitCode = 1;
    }
  } finally {
    await connection.close();
  }
}
main().catch((error: unknown) => {
  console.error(
    error instanceof DatabaseConfigurationError ||
      error instanceof IngestionConfigurationError
      ? error.message
      : 'Ingestion failed. Inspect sanitized provider status/run codes; credentials and raw driver errors are withheld.',
  );
  process.exitCode = 1;
});
