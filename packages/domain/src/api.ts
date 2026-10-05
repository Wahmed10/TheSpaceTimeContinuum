import { z } from 'zod';
import { idSchema } from './schemas';

export const entityKindSchema = z.enum([
  'star',
  'planet',
  'moon',
  'dwarf',
  'asteroid',
  'satellite',
  'spacecraft',
  'barycenter',
]);
export const objectSearchQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[^\u0000-\u001f\u007f]+$/),
    kinds: z.array(entityKindSchema).max(8).default([]),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export const apiProvenanceSchema = z.object({
  providerId: z.string().min(1).max(120),
  providerObjectId: z.string().max(120).optional(),
  sourceUrl: z.url(),
  sourceTimestamp: z.iso.datetime({ offset: true }).optional(),
  ingestedAt: z.iso.datetime({ offset: true }).optional(),
  epoch: z.string().max(80).optional(),
  method: z.enum([
    'analytic-ephemeris',
    'sampled-ephemeris',
    'kepler-2body',
    'mean-elements',
    'sgp4',
    'static',
  ]),
  certainty: z.enum([
    'computed',
    'propagated',
    'reconstructed',
    'observed',
    'predicted',
    'planned',
    'approximate',
  ]),
  validFrom: z.iso.datetime({ offset: true }).optional(),
  validTo: z.iso.datetime({ offset: true }).optional(),
  uncertaintyNote: z.string().max(1200).optional(),
  reference: z.string().max(400).optional(),
});
export const apiEntitySchema = z.object({
  id: idSchema,
  kind: entityKindSchema,
  name: z.string().min(1).max(240),
  parentId: idSchema.optional(),
  aliases: z.array(z.string().max(240)).max(100),
  physical: z.object({
    meanRadiusKm: z.number().finite().positive().optional(),
    massKg: z.number().finite().positive().optional(),
    periodDays: z.number().finite().positive().optional(),
  }),
  provenance: apiProvenanceSchema.nullable(),
  tags: z.array(z.string().max(80)).max(100),
  // Only owned fields are public. Raw/provider metadata and database columns are stripped.
  metadata: z.object({
    description: z.string().max(2000).optional(),
    sourceUrl: z.url().optional(),
    sourceVerifiedAt: z.iso.date().optional(),
    positionAvailable: z.boolean().optional(),
  }),
});
export const apiSearchItemSchema = apiEntitySchema
  .pick({ id: true, kind: true, name: true, provenance: true })
  .extend({
    positionAvailable: z.boolean(),
  });
export const publicProviderSchema = z.object({
  providerId: z.string().min(1).max(120),
  lastRunAt: z.iso.datetime().nullable(),
  lastSuccessAt: z.iso.datetime().nullable(),
  nextRunAt: z.iso.datetime().nullable(),
  records: z.number().int().nonnegative(),
  consecutiveFailures: z.number().int().nonnegative(),
  paused: z.boolean(),
  lastHttpStatus: z.number().int().min(100).max(599).nullable(),
  lastErrorCode: z.string().max(40).nullable(),
  freshness: z.enum(['fresh', 'stale', 'paused', 'never-successful']),
});
export const apiMetaSchema = z.object({
  generatedAt: z.iso.datetime(),
  stale: z.boolean(),
  sources: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        sourceTimestamp: z.iso.datetime({ offset: true }).optional(),
      }),
    )
    .max(100),
});
export const searchResponseSchema = z.object({
  data: z.array(apiSearchItemSchema).max(50),
  meta: apiMetaSchema,
});
export const objectResponseSchema = z.object({
  data: apiEntitySchema,
  meta: apiMetaSchema,
});
export const statusResponseSchema = z.object({
  data: z.object({ providers: z.array(publicProviderSchema).max(100) }),
  meta: apiMetaSchema,
});
export type ApiEntity = z.infer<typeof apiEntitySchema>;
export type ApiSearchItem = z.infer<typeof apiSearchItemSchema>;
export type PublicProvider = z.infer<typeof publicProviderSchema>;
export type ApiMeta = z.infer<typeof apiMetaSchema>;
