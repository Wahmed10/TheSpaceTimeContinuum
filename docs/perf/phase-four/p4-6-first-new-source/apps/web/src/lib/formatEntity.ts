import type { BodySpec, Certainty, Provenance } from '@space/domain';

export type DistanceUnit = 'km' | 'mi' | 'AU';
export const AU_KM = 149597870.7;
const KM_PER_MILE = 1.609344;
export const UNAVAILABLE = 'Unavailable';

export function entityType(
  body: Pick<BodySpec, 'id' | 'kind' | 'tags'>,
): string {
  if (body.kind === 'planet') {
    if (
      body.tags.includes('gas-giant') ||
      ['planet:jupiter', 'planet:saturn'].includes(body.id)
    )
      return 'Gas giant';
    if (
      body.tags.includes('ice-giant') ||
      ['planet:uranus', 'planet:neptune'].includes(body.id)
    )
      return 'Ice giant';
    if (
      body.tags.includes('rocky') ||
      [
        'planet:mercury',
        'planet:venus',
        'planet:earth',
        'planet:mars',
      ].includes(body.id)
    )
      return 'Rocky planet';
    return 'Planet';
  }
  return {
    star: 'Star',
    moon: 'Moon',
    dwarf: 'Dwarf planet',
    asteroid: 'Asteroid',
    satellite: 'Satellite',
    spacecraft: 'Spacecraft',
    barycenter: 'Barycentre',
  }[body.kind];
}
function available(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
export function formatDistance(
  km: number | null | undefined,
  unit: DistanceUnit,
): string {
  if (!available(km)) return UNAVAILABLE;
  const value =
    unit === 'mi' ? km / KM_PER_MILE : unit === 'AU' ? km / AU_KM : km;
  if (value > 0 && value < 0.001) return `${value.toExponential(3)} ${unit}`;
  const millions = value >= 1e6;
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: unit === 'AU' ? 6 : 2 }).format(millions ? value / 1e6 : value)}${millions ? ' M' : ''} ${unit}`;
}
export function formatSpeed(
  kmPerSecond: number | null | undefined,
  unit: DistanceUnit,
): string {
  if (!available(kmPerSecond)) return UNAVAILABLE;
  return `${(unit === 'mi' ? kmPerSecond / KM_PER_MILE : kmPerSecond).toFixed(2)} ${unit === 'mi' ? 'mi/s' : 'km/s'}`;
}
export function formatPeriod(days: number | null | undefined): string {
  return available(days) && days > 0
    ? `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 5 }).format(days)} Earth days`
    : UNAVAILABLE;
}
export function formatUtc(value: string | null | undefined): string {
  const milliseconds = value ? Date.parse(value) : NaN;
  return Number.isFinite(milliseconds)
    ? new Date(milliseconds)
        .toISOString()
        .replace('T', ' ')
        .replace('Z', ' UTC')
    : UNAVAILABLE;
}
const certaintyNames: Record<Certainty, string> = {
  computed: 'Computed',
  propagated: 'Propagated',
  reconstructed: 'Reconstructed',
  observed: 'Observed',
  predicted: 'Predicted',
  planned: 'Planned',
  approximate: 'Approximate',
};
export function certaintyLabel(certainty: string): string {
  return certaintyNames[certainty as Certainty] ?? UNAVAILABLE;
}
export function positionDescription(body: BodySpec): string {
  if (body.provenance.providerId === 'jpl-horizons-orbital-elements')
    return 'Locally propagated two-body orbits, blended between JPL Horizons snapshots. These are calculated positions, not spacecraft telemetry.';
  if (body.astronomyBody || body.id === 'moon:callisto')
    return 'Local analytic ephemeris with JPL Horizons residual corrections. These are calculated positions, not spacecraft telemetry.';
  return 'Local analytic ephemeris. These are calculated positions, not spacecraft telemetry.';
}
export function methodLabel(method: Provenance['method']): string {
  return {
    'analytic-ephemeris': 'Analytic ephemeris',
    'sampled-ephemeris': 'Sampled ephemeris',
    'kepler-2body': 'Two-body orbital propagation',
    'mean-elements': 'Mean orbital elements',
    sgp4: 'SGP4 propagation',
    static: 'Static position',
  }[method];
}
/** Simulation time is deliberately separate from these optional source dates. */
export function provenanceDates(provenance: Provenance) {
  return (
    [
      ['Source timestamp', provenance.sourceTimestamp],
      ['Ingested at', provenance.ingestedAt],
      ['Model epoch', provenance.epoch],
    ] as const
  )
    .filter(
      (entry): entry is readonly [(typeof entry)[0], string] =>
        entry[1] !== undefined,
    )
    .map(([label, value]) => ({ label, value, formatted: formatUtc(value) }));
}
export function entityLayer(kind: BodySpec['kind']): string {
  return kind === 'moon'
    ? 'moons'
    : kind === 'dwarf'
      ? 'dwarfs'
      : kind === 'asteroid'
        ? 'neo'
        : kind === 'satellite'
          ? 'sat.brightest'
          : kind === 'spacecraft'
            ? 'spacecraft'
            : 'planets';
}
