import type {
  IngestionTransaction,
  ProviderDefinition,
  RunCounts,
} from '@space/db';
import type { PoliteFetch } from './politeFetch';
export interface FetchContext {
  fetchJson: PoliteFetch['json'];
  now: Date;
}
export interface ProviderAdapter<Raw, Normalized> {
  definition: ProviderDefinition;
  fetch(ctx: FetchContext): Promise<unknown>;
  validate(raw: unknown): Raw;
  normalize(raw: Raw, ctx: FetchContext): Normalized;
  persist(normalized: Normalized, tx: IngestionTransaction): Promise<RunCounts>;
}
export type AnyProvider = ProviderAdapter<unknown, unknown>;
