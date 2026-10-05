import type { IngestionStore } from '@space/db';
import type { AnyProvider } from './contracts';
import type { IngestConfig } from './config';
import { IngestError, PoliteFetch } from './politeFetch';

export function backoffMs(priorFailures: number, minimumMs: number): number {
  return Math.max(
    minimumMs,
    Math.min(
      24 * 60 * 60_000,
      Math.max(minimumMs, 5 * 60_000) * 2 ** Math.min(priorFailures, 10),
    ),
  );
}
export async function runDue(
  providers: readonly AnyProvider[],
  store: IngestionStore,
  config: IngestConfig,
  options: { now?: () => Date; fetchImpl?: typeof fetch } = {},
) {
  const now = options.now ?? (() => new Date());
  const polite = new PoliteFetch({
    ...config,
    ...options,
    onHttpError: (host, status) => store.pauseHost(host, status, now()),
  });
  const report: {
    providerId: string;
    outcome: 'passed' | 'failed' | 'not-due-or-blocked';
    code?: string;
    records?: number;
  }[] = [];
  for (const provider of providers) await store.register(provider.definition);
  for (const provider of providers) {
    const lease = await store.claim(provider.definition, now(), config.leaseMs);
    if (!lease) {
      report.push({
        providerId: provider.definition.id,
        outcome: 'not-due-or-blocked',
      });
      continue;
    }
    const ctx = {
      fetchJson: (url: string, host: string) => {
        if (host !== provider.definition.host)
          throw new IngestError('INVALID_PAYLOAD');
        return polite.json(url, host);
      },
      now: now(),
    };
    let stage: 'fetch' | 'validation' | 'persistence' = 'fetch';
    try {
      const raw = await provider.fetch(ctx);
      stage = 'validation';
      const normalized = provider.normalize(provider.validate(raw), ctx);
      stage = 'persistence';
      const finished = now();
      const counts = await store.complete(
        lease,
        finished,
        new Date(finished.getTime() + provider.definition.minIntervalMs),
        (tx) => provider.persist(normalized, tx),
        config.retention,
      );
      report.push({
        providerId: provider.definition.id,
        outcome: 'passed',
        records: counts.recordsIn,
      });
    } catch (error) {
      const code =
        error instanceof IngestError
          ? error.code
          : stage === 'validation'
            ? 'INVALID_PAYLOAD'
            : stage === 'persistence'
              ? 'PERSISTENCE'
              : 'NETWORK';
      const finished = now();
      await store.fail(
        lease,
        finished,
        new Date(
          finished.getTime() +
            backoffMs(lease.priorFailures, provider.definition.minIntervalMs),
        ),
        code,
        error instanceof IngestError ? error.httpStatus : undefined,
      );
      report.push({
        providerId: provider.definition.id,
        outcome: 'failed',
        code,
      });
    }
  }
  return report;
}
