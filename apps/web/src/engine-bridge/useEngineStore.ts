import { create } from 'zustand';
import type { EngineApi, PerfSample, QualitySetting } from '@space/engine';
import type { ExploreMapState, RouteIssue } from '../lib/routeState';
import type { RouteStateController } from './routeStateController';
import type { MapState } from '@space/domain';
import type { DistanceUnit } from '../lib/formatEntity';
interface Store {
  engine: EngineApi | null;
  selectedId: string | null;
  mode: 'live' | 'playing' | 'paused';
  rate: number;
  backend: string;
  tier: string;
  quality: QualitySetting;
  scale: 'true' | 'explore';
  following: boolean;
  distanceUnit: DistanceUnit;
  perf: PerfSample | null;
  error: string | null;
  ready: boolean;
  linkIssues: readonly RouteIssue[];
  mapState: MapState | null;
  appliedLocation: string | null;
  routeState: ExploreMapState | null;
  routeController: RouteStateController | null;
  utcDate: string;
}
export const useEngineStore = create<Store>(() => ({
  engine: null,
  selectedId: null,
  mode: 'live',
  rate: 1,
  backend: 'Connecting',
  tier: 'auto',
  quality: 'auto',
  scale: 'explore',
  following: true,
  distanceUnit: 'km',
  perf: null,
  error: null,
  ready: false,
  linkIssues: [],
  mapState: null,
  appliedLocation: null,
  routeState: null,
  routeController: null,
  utcDate: '',
}));
