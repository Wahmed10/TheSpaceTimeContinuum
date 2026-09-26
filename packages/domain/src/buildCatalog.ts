import raw from '../data/bodies.json';
import { bodySchema } from './schemas';
import type { BodySpec } from './types';

export function buildCatalog(): BodySpec[] {
  return raw.map((row) => bodySchema.parse(row) as BodySpec);
}
