import { z } from 'zod';
export const idSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z]+:[a-z0-9-]+$/);
export const mapStateSchema = z.object({
  focus: idSchema,
  t: z.iso.datetime({ offset: true }).optional(),
  scale: z.enum(['true', 'explore']).optional(),
  layers: z.array(z.string().max(40)).max(20).optional(),
  frame: z.string().max(80).optional(),
  secondary: idSchema.optional(),
  camera: z
    .object({ preset: z.enum(['close', 'wide', 'fit-both']) })
    .optional(),
  playback: z
    .object({
      from: z.iso.datetime(),
      to: z.iso.datetime(),
      rate: z.number().finite().min(-31557600).max(31557600),
    })
    .optional(),
});
export const searchSchema = z.object({
  q: z.string().trim().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  kinds: z.string().max(200).optional(),
});
export const bodySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  kind: z.enum(['star', 'planet', 'moon', 'dwarf']),
  aliases: z.array(z.string()),
  parentId: idSchema.optional(),
  astronomyBody: z.string().optional(),
  physical: z.object({
    meanRadiusKm: z.number().positive(),
    periodDays: z.number().positive().optional(),
  }),
  color: z.string(),
  texture: z.string().optional(),
  importance: z.number(),
  description: z.string(),
  provenance: z.object({
    providerId: z.string(),
    sourceUrl: z.url(),
    method: z.enum(['analytic-ephemeris', 'mean-elements', 'kepler-2body']),
    certainty: z.enum(['computed', 'approximate']),
    uncertaintyNote: z.string().optional(),
  }),
  tags: z.array(z.string()),
});
