# Space engine — preview API

`SpaceEngine.create(canvas, options)` initializes one WebGPU/WebGL2 scene. Always call `dispose()` when unmounting. Options include `forceWebGL`, the label container, a deterministic `test` clock, and initial `tdbSec`.

Current commands: `select`, `focus`, `follow`, `back`, `setLayer`, `setScale`, `setQuality`, `setReducedMotion`, `getMapState`, `applyMapState`, `getMetrics`, `resize`, and `dispose`. `clock` exposes play/pause/rate/date/LIVE commands. `on` returns an unsubscribe function for typed `select`, `clock`, `perf`, `error`, and `tier` events. Hover is reserved but not emitted yet.

The engine renders Sun, Earth, Moon, and Mars. Its camera remains at render-space zero; physical camera and body positions are float64 kilometers. CPU/GPU updates stay outside React. Visibility changes suspend rendering.

Lab diagnostics: `benchmark(onView)` measures five fixed views at the selected tier and restores clock/quality/map state; `measurePrecision(600)` performs rendered marker readback and opaque depth checks. `/lab/poc` combines both into a downloadable device report. `referenceView` and `setRendering` support deterministic material snapshots. These lab helpers are not application state APIs. Texture memory is compressed asset mip storage, not total VRAM.

This is **not the frozen Phase 2 API**: provider registration, point layers, frame-tree transforms, advanced LOD, and complete orbit styling are outstanding. Quality controls progressive KTX2 replacement, geometry, bloom, atmosphere visibility and adaptive DPR. Real-device budgets remain unverified.
