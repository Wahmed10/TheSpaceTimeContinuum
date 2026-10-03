import type { BodySpec } from '@space/domain';
import type { ObjectMetrics as EngineMetrics } from '@space/engine';
import {
  formatDistance,
  formatPeriod,
  formatSpeed,
} from '../../lib/formatEntity';
import type { DistanceUnit } from '../../lib/formatEntity';

export default function ObjectMetrics({
  body,
  metrics,
  unit,
}: {
  body: BodySpec;
  metrics: EngineMetrics | null;
  unit: DistanceUnit;
}) {
  const rows = [
    ['From the Sun', 'sun', formatDistance(metrics?.distanceSunKm, unit)],
    ['From Earth', 'earth', formatDistance(metrics?.distanceEarthKm, unit)],
    ['Speed · SSB', 'speed', formatSpeed(metrics?.speedKmPerSec, unit)],
    [
      'Mean diameter',
      'diameter',
      formatDistance(
        body.physical.meanRadiusKm === undefined
          ? undefined
          : body.physical.meanRadiusKm * 2,
        unit,
      ),
    ],
    ['Orbital period', 'period', formatPeriod(body.physical.periodDays)],
  ];
  return (
    <dl className="metrics" aria-label="Physical measurements">
      {rows.map(([label, id, value]) => (
        <div key={id}>
          <dt>{label}</dt>
          <dd data-testid={`metric-${id}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
