export type EntityKind =
  | 'star'
  | 'planet'
  | 'moon'
  | 'dwarf'
  | 'asteroid'
  | 'satellite'
  | 'spacecraft'
  | 'barycenter';
export type Certainty =
  | 'computed'
  | 'propagated'
  | 'reconstructed'
  | 'observed'
  | 'predicted'
  | 'planned'
  | 'approximate';
export type PositionMethod =
  | 'analytic-ephemeris'
  | 'sampled-ephemeris'
  | 'kepler-2body'
  | 'mean-elements'
  | 'sgp4'
  | 'static';
export type FrameId =
  | 'ICRF_SSB'
  | 'ICRF_HELIO'
  | 'ICRF_EMB'
  | `ICRF_BODY:${string}`
  | `FIXED:${string}`
  | 'TEME_EARTH';
export interface Provenance {
  providerId: string;
  providerObjectId?: string;
  sourceUrl: string;
  sourceTimestamp?: string;
  ingestedAt?: string;
  epoch?: string;
  method: PositionMethod;
  certainty: Certainty;
  validFrom?: string;
  validTo?: string;
  uncertaintyNote?: string;
  reference?: string;
}
export interface PhysicalProps {
  meanRadiusKm?: number;
  massKg?: number;
  periodDays?: number;
}
export interface SpaceEntity {
  id: string;
  kind: EntityKind;
  name: string;
  aliases: string[];
  parentId?: string;
  physical: PhysicalProps;
  provenance: Provenance;
  tags: string[];
  metadata?: Record<string, unknown>;
}
export interface BodySpec extends SpaceEntity {
  astronomyBody?: string;
  color: string;
  texture?: string;
  importance: number;
  description: string;
}
export interface StateResult {
  ok: true;
  frame: FrameId;
  certainty: Certainty;
  stale: boolean;
}
export interface StateFailure {
  ok: false;
  reason: 'out-of-validity' | 'no-data' | 'loading';
}
export interface PositionProvider {
  readonly id: string;
  readonly frame: FrameId;
  readonly validity: { fromTdb: number; toTdb: number } | 'unbounded';
  readonly method: PositionMethod;
  stateAt(
    tdbSec: number,
    out: Float64Array,
    offset?: number,
  ): StateResult | StateFailure;
  certaintyAt(tdbSec: number): Certainty;
}
export interface MapState {
  t?: string;
  focus: string;
  secondary?: string;
  frame?: FrameId;
  layers?: string[];
  scale?: 'true' | 'explore';
  playback?: { from: string; to: string; rate: number };
  camera?: { preset: 'fit-both' | 'close' | 'wide' };
}
export interface SpaceEvent {
  id: string;
  type:
    | 'close-approach'
    | 'launch'
    | 'conjunction'
    | 'arrival'
    | 'flyby'
    | 'discovery'
    | 'eclipse'
    | 'milestone'
    | 'planetary';
  title: string;
  summary: string;
  startTime: string;
  peakTime?: string;
  endTime?: string;
  status: 'scheduled' | 'occurred' | 'estimated' | 'cancelled';
  confidence: Certainty;
  source: { id: string; url: string };
  objects: { id: string; role: string }[];
  mapState: MapState;
  importance: number;
}
export interface NewsItem {
  id: string;
  sourceId: string;
  url: string;
  title: string;
  summary: string;
  publishedAt: string;
  objectIds: string[];
}
export interface ProviderStatus {
  providerId: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  nextRunAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  records: number;
}
export interface Envelope<T> {
  data: T;
  meta: {
    generatedAt: string;
    sources: { id: string; sourceTimestamp?: string }[];
    stale: boolean;
  };
}
export const LAYERS = [
  { id: 'planets', label: 'Planets', defaultOn: true },
  { id: 'moons', label: 'Moons', defaultOn: true },
  { id: 'dwarfs', label: 'Dwarf planets', defaultOn: true },
  { id: 'orbits', label: 'Orbital paths', defaultOn: true },
  { id: 'neo', label: 'Near-Earth asteroids', defaultOn: false },
  { id: 'sat.stations', label: 'Space stations', defaultOn: true },
  { id: 'sat.starlink', label: 'Starlink', defaultOn: false },
  { id: 'sat.gnss', label: 'Navigation satellites', defaultOn: false },
  { id: 'sat.weather', label: 'Weather satellites', defaultOn: false },
  { id: 'sat.science', label: 'Science satellites', defaultOn: false },
  { id: 'sat.brightest', label: 'Brightest satellites', defaultOn: false },
  { id: 'spacecraft', label: 'Spacecraft', defaultOn: false },
] as const;
