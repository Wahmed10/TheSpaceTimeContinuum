import { loadDatabaseEnvironment } from '@space/db';
export interface IngestConfig {
  contact: string;
  timeoutMs: number;
  maxResponseBytes: number;
  leaseMs: number;
  retention: { days: number; maxRows: number; maxBytes: number };
}
export class IngestionConfigurationError extends Error {}
export function ingestConfig(
  env: NodeJS.ProcessEnv = process.env,
): IngestConfig {
  const contact = env.PROVIDER_CONTACT?.trim() ?? '';
  if (
    !contact ||
    contact.length > 200 ||
    /[\r\n]/.test(contact) ||
    !(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) ||
      /^https:\/\/[^\s]+$/.test(contact)
    )
  )
    throw new IngestionConfigurationError(
      'Set PROVIDER_CONTACT to a contact email or HTTPS project contact URL in ignored local configuration.',
    );
  return {
    contact,
    timeoutMs: 30_000,
    maxResponseBytes: 16 * 1024 * 1024,
    leaseMs: 10 * 60_000,
    retention: { days: 30, maxRows: 100, maxBytes: 32 * 1024 * 1024 },
  };
}
export { loadDatabaseEnvironment };
