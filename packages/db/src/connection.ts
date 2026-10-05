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
  });
  const db = drizzle({ client: pool, schema });
  return { db, close: () => pool.end() };
}
export type Database = ReturnType<typeof createDatabase>['db'];
