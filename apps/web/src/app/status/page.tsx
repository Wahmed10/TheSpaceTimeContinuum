import type { Metadata } from 'next';
import { readStatus, PublicDataError } from '../../server/dataQueries';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata: Metadata = {
  title: 'Data status — Continuum',
  description: 'Provider freshness and ingestion availability.',
};
const time = (value: string | null) =>
  value
    ? new Date(value)
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, ' UTC')
    : 'Not recorded';
export default async function StatusPage() {
  let providers: Awaited<ReturnType<typeof readStatus>> = [];
  let failure: string | null = null;
  try {
    providers = await readStatus();
  } catch (error) {
    failure =
      error instanceof PublicDataError &&
      error.code === 'DATABASE_NOT_CONFIGURED'
        ? 'The data platform is not configured.'
        : 'Provider status is temporarily unavailable.';
  }
  return (
    <main className="document-page">
      <a href="/">← Back to the universe</a>
      <p className="eyebrow">THE SPACE TIME CONTINUUM</p>
      <h1>Data status</h1>
      <p>
        Planetary motion is calculated locally. This page reports provider
        ingestion, not spacecraft telemetry.
      </p>
      {failure ? (
        <p role="status">{failure} The Solar System remains available.</p>
      ) : providers.length === 0 ? (
        <p role="status">
          No providers have run yet. No live satellite feed is available.
        </p>
      ) : (
        providers.map((provider) => (
          <section
            key={provider.providerId}
            aria-labelledby={`provider-${provider.providerId}`}
          >
            <h2 id={`provider-${provider.providerId}`}>
              {provider.providerId === 'dummy-proof'
                ? 'Scheduled ingestion proof (test data)'
                : provider.providerId}
            </h2>
            {provider.providerId === 'dummy-proof' && (
              <p>This is a local test provider, not a scientific feed.</p>
            )}
            <dl>
              <dt>Freshness</dt>
              <dd>
                {provider.freshness === 'never-successful'
                  ? 'No successful ingestion'
                  : provider.freshness}
              </dd>
              <dt>Last successful ingestion (UTC)</dt>
              <dd>{time(provider.lastSuccessAt)}</dd>
              <dt>Last attempt (UTC)</dt>
              <dd>{time(provider.lastRunAt)}</dd>
              <dt>Next due (UTC)</dt>
              <dd>
                {provider.paused
                  ? 'Paused until operator review'
                  : time(provider.nextRunAt)}
              </dd>
              <dt>Records</dt>
              <dd>{provider.records}</dd>
              <dt>Consecutive failures</dt>
              <dd>{provider.consecutiveFailures}</dd>
              {provider.lastErrorCode && (
                <>
                  <dt>Last error</dt>
                  <dd>
                    {provider.lastErrorCode}
                    {provider.lastHttpStatus
                      ? ` (HTTP ${provider.lastHttpStatus})`
                      : ''}
                  </dd>
                </>
              )}
            </dl>
          </section>
        ))
      )}
      <p>
        Ingestion timestamps describe when data was stored. They are separate
        from provider source timestamps and orbital-element epochs.
      </p>
      <a href="/about/data">Sources and calculations</a>
    </main>
  );
}
