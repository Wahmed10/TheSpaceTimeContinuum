import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { createDatabase } from './connection';
import { DatabaseConfigurationError, loadDatabaseEnvironment } from './config';
import { seedCatalog } from './seed';

async function main() {
  const action = process.argv[2];
  if (!['migrate', 'seed', 'check'].includes(action ?? ''))
    throw new Error('Usage: db migrate|seed|check');
  loadDatabaseEnvironment();
  const connection = createDatabase();
  try {
    if (action === 'migrate') {
      await migrate(connection.db, {
        migrationsFolder: fileURLToPath(
          new URL('../migrations', import.meta.url),
        ),
      });
      console.log('Database migrations applied.');
    } else if (action === 'seed') {
      const result = await seedCatalog(connection.db);
      console.log(
        `Catalog seeded: ${result.objects} identities. Spacecraft have no position provider.`,
      );
    } else {
      const { sql } = await import('drizzle-orm');
      await connection.db.execute(sql`select 1`);
      console.log('Database connection succeeded.');
    }
  } finally {
    await connection.close();
  }
}
main().catch((error: unknown) => {
  // Driver errors may contain URLs, credentials or private query data. Never print them.
  console.error(
    error instanceof DatabaseConfigurationError
      ? error.message
      : 'Database command failed. Check branch configuration, permissions and migrations; connection details are withheld.',
  );
  process.exitCode = 1;
});
