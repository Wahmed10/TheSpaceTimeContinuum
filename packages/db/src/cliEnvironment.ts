import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

/** CLI-only; importing the DB package never reads local secrets or opens a connection. */
export function loadDatabaseEnvironment(): void {
  const env = fileURLToPath(
    new URL('../../../apps/web/.env.local', import.meta.url),
  );
  if (existsSync(env)) loadEnvFile(env);
}
