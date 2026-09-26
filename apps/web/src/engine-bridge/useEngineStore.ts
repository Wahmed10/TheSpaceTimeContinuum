import { create } from 'zustand';
import type { EngineApi, PerfSample, QualitySetting } from '@space/engine';
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
  perf: PerfSample | null;
  error: string | null;
  ready: boolean;
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
  perf: null,
  error: null,
  ready: false,
}));
