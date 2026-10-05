import 'server-only';
import {
  apiEntitySchema,
  apiSearchItemSchema,
  publicProviderSchema,
} from '@space/domain';
import type {
  ApiEntity,
  ApiSearchItem,
  PublicProvider,
  EntityKind,
} from '@space/domain';
import {
  createDatabase,
  searchObjects,
  getObject,
  getObjectAliases,
  providerStatuses,
  DatabaseConfigurationError,
} from '@space/db';

let connection: ReturnType<typeof createDatabase> | undefined;
const database = () => (connection ??= createDatabase()).db;
export class PublicDataError extends Error {
  constructor(readonly code: 'DATABASE_NOT_CONFIGURED' | 'DATA_UNAVAILABLE') {
    super(code);
  }
}
async function guarded<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new PublicDataError(
      error instanceof DatabaseConfigurationError
        ? 'DATABASE_NOT_CONFIGURED'
        : 'DATA_UNAVAILABLE',
    );
  }
}
export async function readSearch(input: {
  q: string;
  kinds: EntityKind[];
  limit: number;
}): Promise<ApiSearchItem[]> {
  return guarded(async () => {
    const rows = await searchObjects(database(), input);
    return rows.map((row) =>
      apiSearchItemSchema.parse({
        id: row.id,
        kind: row.kind,
        name: row.name,
        provenance: row.provenance,
        positionAvailable:
          row.provenance !== null &&
          (row.metadata as Record<string, unknown>).positionAvailable !== false,
      }),
    );
  });
}
export async function readObject(id: string): Promise<ApiEntity | null> {
  return guarded(async () => {
    const db = database();
    const row = await getObject(db, id);
    if (!row) return null;
    return apiEntitySchema.parse({
      ...row,
      parentId: row.parentId ?? undefined,
      aliases: await getObjectAliases(db, id),
    });
  });
}
const knownErrors = new Set([
  'HTTP_NON_200',
  'HOST_PAUSED',
  'NETWORK',
  'TIMEOUT',
  'RESPONSE_TOO_LARGE',
  'INVALID_PAYLOAD',
  'PERSISTENCE',
]);
export function publicProvider(
  row: Awaited<ReturnType<typeof providerStatuses>>[number],
  now: Date,
): PublicProvider {
  const paused = row.pausedAt !== null;
  // Current registered providers update at two-hour intervals. Backoff never extends freshness.
  const freshness = paused
    ? 'paused'
    : !row.lastSuccessAt
      ? 'never-successful'
      : now.getTime() - row.lastSuccessAt.getTime() > 7200_000
        ? 'stale'
        : 'fresh';
  return publicProviderSchema.parse({
    providerId: row.providerId,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    records: row.records,
    consecutiveFailures: row.consecutiveFailures,
    paused,
    freshness,
    lastHttpStatus: row.lastHttpStatus,
    lastErrorCode:
      row.lastError === null
        ? null
        : knownErrors.has(row.lastError)
          ? row.lastError
          : row.lastError === 'lease-expired'
            ? 'LEASE_EXPIRED'
            : 'INGESTION_FAILED',
  });
}
export async function readStatus(now = new Date()): Promise<PublicProvider[]> {
  return guarded(async () =>
    (await providerStatuses(database())).map((row) => publicProvider(row, now)),
  );
}
