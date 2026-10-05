import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

export class DatabaseConfigurationError extends Error {
  constructor() {
    super(
      'Configure DATABASE_URL for a disposable Neon development branch in apps/web/.env.local or the process environment.',
    );
  }
}
/** CLI-only; importing the DB package never reads local secrets or opens a connection. */
export function loadDatabaseEnvironment(): void {
  const env = fileURLToPath(
    new URL('../../../apps/web/.env.local', import.meta.url),
  );
  if (existsSync(env)) loadEnvFile(env);
}
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.DATABASE_URL?.trim();
  if (!value) throw new DatabaseConfigurationError();
  try {
    const url = new URL(value);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      !url.password ||
      url.pathname.length < 2
    )
      throw new DatabaseConfigurationError();
    if (!url.hostname.endsWith('.neon.tech'))
      throw new DatabaseConfigurationError();
    return value;
  } catch {
    throw new DatabaseConfigurationError();
  }
}
