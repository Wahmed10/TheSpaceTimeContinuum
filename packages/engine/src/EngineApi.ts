import type { SpaceEngine } from './SpaceEngine';

/** Stable v1 application surface. Lab instrumentation is intentionally separate. */
export type EngineApi = Pick<
  SpaceEngine,
  | 'clock'
  | 'backend'
  | 'isFollowing'
  | 'focusedId'
  | 'select'
  | 'focus'
  | 'follow'
  | 'back'
  | 'applyMapState'
  | 'getMapState'
  | 'setLayer'
  | 'getLayerStates'
  | 'getObjectsInView'
  | 'whenLayersSettled'
  | 'setFrame'
  | 'setScale'
  | 'setQuality'
  | 'setReducedMotion'
  | 'suspendRendering'
  | 'getMetrics'
  | 'getEntity'
  | 'on'
  | 'registerEntities'
  | 'registerPointLayer'
  | 'resize'
  | 'dispose'
>;
