import { createHash } from 'node:crypto';
import { z } from 'zod';
import { persistSnapshots } from '@space/db';
import type { AnyProvider } from '../contracts';

const proof = z
  .object({
    kind: z.literal('scheduled-ingestion-proof'),
    generatedAt: z.iso.datetime(),
    value: z.literal(1),
  })
  .strict();
/** No external requests; explicitly labeled proof data, never a scientific layer. */
export function createDummyProvider(id = 'dummy-proof'): AnyProvider {
  return {
    definition: {
      id,
      host: 'local-proof',
      minIntervalMs: 120 * 60_000,
      source: {
        id,
        name: 'Scheduled ingestion proof (test data)',
        license: 'Project test fixture',
        attribution: 'TheSpaceTimeContinuum test provider',
        notes: 'Not satellite or observational data',
      },
    },
    async fetch(ctx) {
      return {
        kind: 'scheduled-ingestion-proof',
        generatedAt: ctx.now.toISOString(),
        value: 1,
      };
    },
    validate(raw) {
      return proof.parse(raw);
    },
    normalize(raw) {
      return proof.parse(raw);
    },
    async persist(normalized, tx) {
      const payload = proof.parse(normalized);
      const serialized = JSON.stringify(payload);
      const count = await persistSnapshots(tx, [
        {
          layer: 'ingestion-proof',
          groupKey: id,
          sourceId: id,
          fetchedAt: new Date(payload.generatedAt),
          sourceTimestamp: new Date(payload.generatedAt),
          recordCount: 1,
          contentHash: createHash('sha256').update(serialized).digest('hex'),
          payload,
        },
      ]);
      return {
        recordsIn: 1,
        recordsUpserted: count,
        payloadBytes: Buffer.byteLength(serialized),
      };
    },
  };
}
