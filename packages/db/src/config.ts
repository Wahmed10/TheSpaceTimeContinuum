export class DatabaseConfigurationError extends Error {
  constructor() {
    super(
      'Configure DATABASE_URL for a disposable Neon development branch in apps/web/.env.local or the process environment.',
    );
  }
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
