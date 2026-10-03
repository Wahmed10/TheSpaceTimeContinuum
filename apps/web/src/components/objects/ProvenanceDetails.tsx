import type { BodySpec } from '@space/domain';
import {
  certaintyLabel,
  formatUtc,
  methodLabel,
  positionDescription,
  provenanceDates,
} from '../../lib/formatEntity';

export default function ProvenanceDetails({
  body,
  simulationUtc,
}: {
  body: BodySpec;
  simulationUtc: string | null;
}) {
  const provenance = body.provenance;
  return (
    <div className="detail-body">
      <p>{positionDescription(body)}</p>
      {provenance.uncertaintyNote && <p>{provenance.uncertaintyNote}</p>}
      <dl className="source-details">
        <div>
          <dt>Provider</dt>
          <dd>{provenance.providerId}</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd>{methodLabel(provenance.method)}</dd>
        </div>
        <div>
          <dt>Certainty</dt>
          <dd>{certaintyLabel(provenance.certainty)}</dd>
        </div>
        <div>
          <dt>Simulation UTC</dt>
          <dd>
            <time dateTime={simulationUtc ?? undefined}>
              {formatUtc(simulationUtc)}
            </time>
          </dd>
        </div>
        {provenanceDates(provenance).map((date) => (
          <div key={date.label}>
            <dt>{date.label}</dt>
            <dd>
              <time dateTime={date.value}>{date.formatted}</time>
            </dd>
          </div>
        ))}
      </dl>
      <p>
        Simulation UTC is the time being modelled. It is not a source update or
        observation timestamp.
      </p>
      <a href={provenance.sourceUrl} target="_blank" rel="noopener noreferrer">
        {provenance.providerId === 'jpl-horizons-orbital-elements'
          ? 'NASA/JPL Horizons'
          : provenance.providerId}{' '}
        · source ↗
      </a>
      {(body.astronomyBody || body.id === 'moon:callisto') && (
        <a
          className="correction-source"
          href="https://ssd.jpl.nasa.gov/horizons/"
          target="_blank"
          rel="noopener noreferrer"
        >
          NASA/JPL Horizons · correction source ↗
        </a>
      )}
    </div>
  );
}
