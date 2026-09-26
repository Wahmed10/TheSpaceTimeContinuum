import raw from '../data/bodies.json';
import type { BodySpec } from './types';
// Checked-in data is validated by buildCatalog during build and verification.
// Keep schema construction out of the renderer's runtime dependency graph.
export const BODIES = raw as BodySpec[];
export const BODY_BY_ID = new Map(BODIES.map((body) => [body.id, body]));
/** Catalog subset backed by scientifically validated providers in this release. */
export const EXPLORABLE_BODIES = BODIES;
