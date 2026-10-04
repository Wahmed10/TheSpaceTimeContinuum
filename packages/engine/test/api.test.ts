import { expectTypeOf, it } from 'vitest';
import type {
  EngineApi,
  EngineEvents,
  PointSource,
  PointSourceBuffers,
  FocusOptions,
  ApplyMapStateOptions,
  CameraFrame,
  CameraFrameResult,
  EngineLayerState,
  ObjectInView,
} from '../src';
import type { MapState } from '@space/domain';

it('keeps consumer commands and source contracts independent of renderer internals', () => {
  expectTypeOf<EngineApi>().not.toHaveProperty('cameraController');
  expectTypeOf<EngineApi>().not.toHaveProperty('scene');
  expectTypeOf<EngineApi['select']>().toEqualTypeOf<
    (id: string | null) => void
  >();
  expectTypeOf<EngineApi['follow']>().toEqualTypeOf<
    (id: string | null) => void
  >();
  expectTypeOf<EngineApi['focus']>().toEqualTypeOf<
    (id: string, options?: FocusOptions) => void
  >();
  expectTypeOf<EngineApi['applyMapState']>().toEqualTypeOf<
    (state: MapState, options?: ApplyMapStateOptions) => void
  >();
  expectTypeOf<EngineApi['applyMapState']>().toExtend<
    (state: MapState) => void
  >();
  expectTypeOf<EngineApi['setFrame']>().toEqualTypeOf<
    (frame: CameraFrame) => CameraFrameResult
  >();
  expectTypeOf<EngineApi['getLayerStates']>().returns.toEqualTypeOf<
    readonly EngineLayerState[]
  >();
  expectTypeOf<EngineApi['whenLayersSettled']>().returns.toEqualTypeOf<
    Promise<void>
  >();
  expectTypeOf<EngineApi['getObjectsInView']>().returns.toEqualTypeOf<
    readonly ObjectInView[]
  >();
  expectTypeOf<EngineApi['suspendRendering']>().toEqualTypeOf<
    () => () => void
  >();
  expectTypeOf<EngineEvents['mapStateChange']>().toEqualTypeOf<MapState>();
  expectTypeOf<EngineApi['getMapState']>().returns.toEqualTypeOf<MapState>();
  expectTypeOf<EngineApi['registerPointLayer']>().toEqualTypeOf<
    (id: string, source: PointSource) => () => void
  >();
  expectTypeOf<PointSource['update']>().toEqualTypeOf<
    (tdbSec: number, buffers: PointSourceBuffers) => number
  >();
  expectTypeOf<EngineEvents['select']>().toEqualTypeOf<string | null>();
  expectTypeOf<EngineEvents['hover']>().toEqualTypeOf<string | null>();
  expectTypeOf<EngineEvents['sourceError']>().toEqualTypeOf<{
    layerId: string;
    message: string;
  }>();
});

// Compile-time rejection checks; this function is never executed.
function invalidConsumerCalls(api: EngineApi) {
  const objects = api.getObjectsInView();
  // @ts-expect-error snapshots are read-only, not mutable renderer buffers
  objects.push({ id: 'planet:mars', name: 'Mars', kind: 'planet' });
  // @ts-expect-error provider frames are not all supported camera references
  api.setFrame('TEME:earth');
  // @ts-expect-error unknown event names are not part of the v1 contract
  api.on('unknown', () => {});
  // @ts-expect-error selection payload is an ID or null, never a numeric index
  api.on('select', (id: number) => id);
  // @ts-expect-error camera internals are not consumer API
  api.cameraController.distanceKm = 1;
}
it('typechecks invalid consumer usage without executing it', () => {
  expectTypeOf(invalidConsumerCalls).parameter(0).toEqualTypeOf<EngineApi>();
});
