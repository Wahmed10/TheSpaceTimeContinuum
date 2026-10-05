import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { databaseUrl } from './config';
import * as schema from './schema';

/** Explicit lifecycle: callers close CLI pools; servers lazily own their pool. */
export function createDatabase(env: NodeJS.ProcessEnv = process.env) {
  const connectionString = databaseUrl(env);
  // Node 22+ supplies a standards-compatible WebSocket; no browser connection is used.
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  // Idle server pools can emit errors outside a request's guarded query path.
  pool.on('error', () =>
    console.error('Database pool connection error; private details withheld.'),
  );
  const db = drizzle({ client: pool, schema });
  return { db, close: () => pool.end() };
}
export type Database = ReturnType<typeof createDatabase>['db'];
