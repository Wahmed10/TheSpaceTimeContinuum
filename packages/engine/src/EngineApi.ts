import type { SpaceEngine } from './SpaceEngine';

/** Stable v1 application surface. Lab instrumentation is intentionally separate. */
export type EngineApi = Pick<
  SpaceEngine,
  | 'clock'
  | 'backend'
  | 'isFollowing'
  | 'select'
  | 'focus'
  | 'follow'
  | 'back'
  | 'applyMapState'
  | 'getMapState'
  | 'setLayer'
  | 'setScale'
  | 'setQuality'
  | 'setReducedMotion'
  | 'getMetrics'
  | 'getEntity'
  | 'on'
  | 'registerEntities'
  | 'registerPointLayer'
  | 'resize'
  | 'dispose'
>;
