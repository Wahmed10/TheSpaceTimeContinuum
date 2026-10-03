# Space engine — application API v1

Import from `@space/engine`; `API_VERSION` is `1`. `SpaceEngine.create(canvas, options)` creates the implementation. Consumer UI stores an `EngineApi`, which excludes camera internals and lab helpers. Call `dispose()` when unmounting. Package-boundary checks reject deep imports and application access to `cameraController`.

The stable commands are `select(id|null)`, `focus(id,{transition?,wide?,select?,recordHistory?})`, `follow(id|null)`, `back()`, `applyMapState`, `getMapState`, `setFrame`, `setLayer`, `getLayerStates`, `whenLayersSettled`, `setScale`, `setQuality`, `setReducedMotion`, `resize`, and `dispose`. `clock` owns pause/play/rate/date/LIVE. `backend` and `isFollowing` are readable. `getMetrics(id)` returns physical metrics; `getEntity(id)` returns a metadata snapshot or null. Application code must treat metadata as read-only.

`suspendRendering(): () => void` holds the last 3D frame while a modal owns interaction. Leases nest; call the returned idempotent release on dismissal/unmount. Time continues from the clock's wall-time anchor, commands still accept selections, and the next submitted frame samples current simulation time. Visibility changes cannot restart submission through an active lease. Release while hidden waits for the normal visible lifecycle; disposal cannot be reversed by a later release. This cold scheduler command adds no work inside the frame loop. Consumer search releases after its accepted canonical route/card gets a paint, so shader compilation and 3D submission do not block its visible response. The renderer remains resident.

`on(event, callback)` returns an unsubscribe function. Core events are `select`, `hover`, `clock`, `perf`, `error`, and `tier`. `sourceError` additionally reports `{layerId,message}` for an external point source; it does not request a graphics-backend restart. Mouse/pen hover changes are emitted and cleared on drag/leave/zoom. Touch picking does not depend on hover.

## Camera references and restoring views

`setFrame(CameraFrame)` supports `ICRF_SSB` (default), `ICRF_HELIO`, `ICRF_BODY:earth` and `FIXED:earth`. Its `CameraFrameResult` is `{ok:true}` or `{ok:false,reason:'unsupported-frame'|'unavailable-frame'}`. A switch preserves SSB position, look center and up direction. Follow tracks the current physical target; follow-off holds a reference-relative center, which moves with that frame's origin. Earth-fixed offsets/up rotate with the scientific Earth frame as time evolves or reverses. Physics, provider output and metrics retain ICRF/SSB km. Failed transforms preserve the last valid pose.

`getMapState()` includes the actual frame and last semantic `close|wide` preset. Free zoom/orbit/pan coordinates and follow mode are not shared. Previous view also restores its frame, preset, follow state, pan and up axes. `applyMapState(state,{transition?,select?,recordHistory?})` retains the one-argument void call; restoration can disable animation, card selection and history recording. One application emits one final `mapStateChange`. Unsupported frame, secondary target and fit-both requests produce `commandError` and retain state. Event-window playback scheduling remains a later-phase contract; legacy playback rate behavior remains available.

`mapStateChange` is emitted by cold view/layer/scale/selection commands, never by rendering, clock ticks or free gestures. Direct `clock` commands still use the clock subscription; capture current time with `getMapState()` when sharing. `commandError` carries `{command:'frame'|'mapState'|'layer',message}` and does not request graphics fallback. The existing `error` event retains its graphics handling.

`getLayerStates()` returns copied, readonly status records with ID, label, category, requested, available, loaded and visible. Requests can remain on while a future layer is unavailable. `whenLayersSettled()` drains currently requested available resources, includes enables made while waiting, releases waiters on toggles off, and rejects requested load failures. It does not wait for texture-resolution upgrades. Selection/metadata remain accessible with all layers off.

## Provider-backed entities

`registerEntities(entities: readonly BodySpec[], providerFactory: ProviderFactory): void` adds renderer-managed spheres/LOD points and optional period-based orbit paths. IDs are globally unique and match the domain ID syntax. Register parent body batches first. Factories are synchronous and return `PositionProvider` objects in an already registered frame; they must not re-enter engine mutation methods. Custom entries do not set `astronomyBody`. A positive finite radius, valid optional period, finite importance, name, and six-digit hex color are required. Barycenters are frame objects, not rendered bodies.

Validation/factory failures occur before scene mutation. Visuals, optional sampled orbits and replacement parent point buffers are staged before committing. An optional period requires provider coverage for the current sampled window (clipped to provider validity). Failed staging disposes staged GPU resources. Adding to a parent rebuilds its point buffer once on this cold path; subsequent layer toggles reuse it. Existing catalog body geometry is retained. Caller rendering metadata is copied. Providers remain caller-owned; they have no disposal method in the domain contract.

New asteroid entities use `neo`, satellites use `sat.brightest`, and spacecraft use `spacecraft`; other kinds use their normal body layer. Registration makes the layer available while preserving its requested visibility. New entity frames use `ICRF_BODY:registered/<full-entity-id>`; provider coordinates may instead use existing solar-system/SSB frames. Engine selection/focus/metrics work for registered objects; application search/catalog ingestion is a later-phase concern.

## External point sources

`registerPointLayer(id: string, source: PointSource): () => void` installs one source on an MVP `neo`, `sat.*`, or `spacecraft` layer. Its fixed entity list determines capacity and IDs. IDs cannot overlap catalog entities, registered entities or other sources. Metadata uses `BodySpec` with existing body parents; entity kind must match the layer. Source membership changes require detach and re-registration. These objects allocate no individual spheres.

The source specifies a known `frame` and implements `update(tdbSec, buffers): number`. The callback writes into reusable engine-owned arrays:

- `states`: six float64 values per entity, position in km and velocity in km/s, in `source.frame`.
- `colors`: linear RGB float32 triples, initially derived from metadata colors.
- `sizes`: float32 CSS-pixel diameters, initially 3; zero hides an individual point.

Return the active prefix count. Invalid/nonfinite states or sizes are hidden, never rendered at the origin. Copy the latest worker snapshot or propagate synchronously; do not fetch, return a Promise, retain these buffers, or transfer their backing storage. Metadata/order/frame remain fixed. The engine transforms states through FrameTree and subtracts the camera in float64 before GPU upload. Sources currently upload their active prefix each visible frame; the internal PointLayer also supports partial uploads, but the v1 source callback does not expose a dirty-range contract.

Point IDs support select, focus, follow, metrics, mouse/pen hover and 12 px desktop / 24 px touch picking. Mesh surfaces occlude points. Only selected/hovered source labels are created; satellite labels remain selection-only. Sources do not yet supply independent orbit-arc data. Future satellite/spacecraft phases will add their trajectory-specific presentation.

Ownership transfers only when registration succeeds. The returned detach function is idempotent and calls `source.dispose()` once; engine disposal does the same for attached sources. Detaching a focused source returns focus to Earth, removes its labels and IDs, and preserves layer visibility requests. Source errors latch, hide that source and emit `sourceError` once; detach and register a recovered source to retry. Failed registration leaves source cleanup to the caller. Cleanup exceptions cannot interrupt engine GPU disposal.

## Rendering and lab evidence

The built-in catalog still contains 21 bodies. Float64 physics and camera-relative rendering remain independent of React. Angular LOD uses 2/12/200 CSS pixels with ±15% hysteresis. Labels use a 64-element pool. Orbits use adaptive parent-frame TSL ribbons, certainty styles and viewport clipping before widening to preserve depth interpolation. The layer registry owns all 12 MVP layer definitions. Registration does not fabricate missing ingest data.

Lab-only helpers include `benchmark`, `measurePrecision`, `measurePoints`, `measureCpuPaths`, `referenceView`, `setReferenceDistance`, `setRendering`, and `diagnostics`. They are excluded from `EngineApi`. Run CPU paths on a dedicated `?perf=1&test=1` page without concurrent interaction. They measure CPU frame work including render submission, excluding RAF waits; they are not GPU timings. See `docs/perf/cpu-regression.md`.

Detailed non-hero materials and Saturn rings remain Phase 3. Full device acceptance, upstream astronomy-engine allocation limits and hosted CI calibration remain explicit in `docs/PHASE_2_CHECKPOINT.md`.
