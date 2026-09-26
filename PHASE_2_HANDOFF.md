# The Space Time Continuum: fresh-chat handoff

Prepared September 23, 2026 (America/Toronto). This file is a historical continuation guide.

**September 24 update:** the user has since explicitly authorized Phase 2. P2.1 and P2.3 catalog positioning are implemented; all 21 bodies render and appear in search. P2.2 retains an allocation caveat. P2.4 LOD and point layers are integrated, with physical-device acceptance pending; P2.5 pooled labels are implemented. September 25: P2.6 layer registry is integrated and tested; new WebGPU device reports are preserved. P2.7 adaptive orbit rendering and P2.8 mesh/point picking are now implemented with local regression evidence; Samsung Brave mobile reports are preserved. September 26: P2.9 application API v1, provider registration and bulk point sources are implemented; P2.10 CPU tooling exists and hosted calibration remains pending because no Git remote is configured. Continue from the latest checkpoint verification and acceptance notes. Resume from [docs/PHASE_2_CHECKPOINT.md](docs/PHASE_2_CHECKPOINT.md). Approval statements below are historical; outstanding physical-device evidence remains pending.

## 1. Read this first: scope and authorization

The user originally requested implementing the project according to `IMPLEMENTATION_PLAN.md`. They prefer direct implementation, minimal overthinking, efficient token use, and a working result they can review. Usage limits interrupted several sessions; preserve the existing work rather than restarting.

The latest relevant instructions are:

1. **"Keep the gate strict"**: do not bypass the Phase 1 architecture acceptance gate merely because this agent environment lacks a physical GPU.
2. **"No, continue with phase 1 and complete it properly."** Phase 1 implementation and local validation were subsequently completed for review.
3. The user supplied two desktop lab reports and explicitly said: **"Do not start phase 2 without my approval."**
4. The current request is to write this handoff so a fresh chat can take over. **Creating this document does not grant Phase 2 approval.**

**Phase 2 has not started. Its approval is outstanding.** Read the new chat's instructions for any subsequent authorization. If approval is given but the strict gate's remaining conditions are not addressed, clearly identify those conditions; do not silently mark the gate passed. Do not repeatedly request permission for already-authorized Phase 1 review or routine verification.

## 2. Workspace and checkpoints

- Repository: `C:\Users\waqar\Documents\TheSpaceTimeContinuum`
- Shell: PowerShell on Windows.
- Current branch at handoff: `master`.
- Node used for validation: 24.12.0. Package manager: pnpm 10.32.1.
- Main plan: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Read the full relevant architecture sections and Phase 2 tasks; this handoff summarizes them but does not replace them.
- Implementation status: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).
- Gate evidence: [docs/perf/gate-report.md](docs/perf/gate-report.md).
- Remaining device procedure: [docs/perf/device-matrix.md](docs/perf/device-matrix.md).

Recent commits:

| Commit | Contents |
|---|---|
| `3de808f` | Verified four-body renderer foundation and strict gate status |
| `978291e` | Completed Phase 1 renderer checks and device validation workflow |
| `997f0bb` | Preserved user LOW/ULTRA WebGPU reports and explicit approval gate |

The working tree was clean before this handoff was created. Check `git status --short` before changing anything. No remote, hosted CI execution, deployment, or database provisioning has been claimed. Do not infer these from the presence of workflow/configuration files.

## 3. Run and verify

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. No credentials or database are needed for the preview. Ctrl+C stops the dev server. A prior dev process may still be running; verify the port before launching another. Do not stop unrelated Node processes.

| Command | Purpose |
|---|---|
| `pnpm verify` | Typecheck, ESLint, package boundaries, unit/science tests |
| `pnpm build` | Next.js production build |
| `pnpm test:e2e` | Six Playwright tests, including eight material image comparisons |
| `pnpm licenses:check` | Runtime dependency license audit and notices |
| `pnpm exec tsx tools/check-assets.ts` | Asset manifest, byte sizes, credit coverage and 80 MB budget |
| `node tools/measure-engine.mjs` | Complete engine bundle attribution and 450 KB gzip check |
| `pnpm exec tsx tools/profile-ephemeris.ts` | Four-body CPU benchmark |
| `pnpm exec tsx tools/fixtures/validate-horizons.ts` | Original and off-grid scientific error report |
| `pnpm exec vitest run --coverage --coverage.include=packages/astro/src/clock/SimulationClock.ts` | Clock branch coverage |

Avoid rerunning all expensive checks just to reconfirm this document. Run appropriate checks after actual changes. Playwright uses one worker and a running dev server when available; its last full run took about 2.6 minutes.

Useful routes/query parameters:

- `/`: explorer.
- `/about/data`: attribution and sources.
- `/lab/probe`: graphics capabilities/backend information.
- `/lab/poc?perf=1`: five-view benchmark and downloadable precision/depth report.
- `/lab/precision?renderer=webgl&test=1`: deterministic precision setup.
- `renderer=webgl`: force WebGL2; `test=1`: deterministic time; `perf=1`: diagnostics.
- `scenario=leo`: Earth camera at approximately 400 km altitude.

`node tools/run-device-checks.mjs --software` exercises the actual lab download button against a running server. It intentionally uses SwiftShader. Without that flag it requests HIGH on the available adapter; inspect the report before claiming physical GPU evidence.

## 4. What exists now

This is a pnpm monorepo with Next.js 16.3.6, React 19.3, Three.js 0.186, TypeScript, Vitest and Playwright. The renderer uses `WebGPURenderer` and TSL node materials, with WebGL2 fallback. React owns the UI; simulation/rendering run outside React.

| Location | Responsibility and current scope |
|---|---|
| `apps/web/src/components/Explore.tsx` | Responsive explorer, focus/search, timeline, settings/layers and object details |
| `apps/web/src/engine-bridge/` | Engine lifecycle and throttled Zustand bridge |
| `apps/web/src/components/PhaseOneLab.tsx` | Device-report button and lab-only React Profiler |
| `packages/domain/src/` | Entity/provider/frame/provenance/map-state contracts and curated catalog |
| `packages/astro/src/` | Time scales, clock, corrected ephemerides and body orientation |
| `packages/engine/src/SpaceEngine.ts` | Renderer orchestration and current public commands |
| `packages/engine/src/scene/` | Four-body registry and physical-to-display mapping |
| `packages/engine/src/camera/` | Orbit/zoom/pan/focus/follow/history and input |
| `packages/engine/src/bodies/` | Hero materials and catalog/background stars |
| `packages/engine/src/assets/`, `quality/`, `render/` | Progressive textures, adaptive tiers, backend and bloom lifecycle |
| `packages/engine/src/perf/` | Frame statistics and actual rendered precision/depth probe |
| `packages/db`, `packages/ingest` | Explicit skeletons; not working data services |

There are 21 curated catalog entries, but **only Sun, Earth, Moon and Mars are rendered**. Search/focus UI is currently limited to those four. A catalog entry or layer ID does not mean its renderer/provider is implemented. No satellite, NEO, spacecraft, news, event or live ingestion system exists yet.

Implemented visual foundations:

- Sun granulation, limb darkening, corona and bloom.
- Earth day/night/ocean/cloud shading, uniform-density spherical-shell Rayleigh/Mie scattering approximation and HIGH cloud shadows.
- NASA LROC Moon color, LOLA-derived normals/displacement, Lommel-Seeliger blend; displacement on HIGH and above.
- Mars MOLA-derived normals.
- NASA Deep Star Maps faint background and 9,096 BSC5 foreground stars, with corrected sky-map handedness.
- KTX2 progressive tiers, Earth day/night up to 8k, reference-counted assets, geometry/detail tiers and adaptive DPR/recovery. LOW releases bloom resources.

## 5. Scientific and architectural invariants

Read `docs/adr/0001-renderer.md` through `0008-ephemeris-corrections.md`, especially time, frames, precision, licensing and package boundaries.

- Physics uses float64 kilometers and velocities in km/s. Time is TDB seconds from J2000. Preserve the domain's frame identifiers and provider contracts.
- The Three camera stays at render-space zero. Subtract the physical camera position on the CPU before float32 submission. Do not reintroduce absolute AU-scale float32 coordinates.
- Explore Scale changes display coordinates/radii only. Physical state and scientific metrics must remain unchanged. Preserve the fix that keeps the Moon outside boosted Earth near camera transitions.
- `PositionProvider.stateAt(tdbSec, out, offset?)` writes state into caller-owned storage and returns status/provenance information. Existing astronomy-engine internals still allocate; Phase 2's allocation acceptance has not been met or claimed.
- Weekly JPL Horizons residual tables correct the pinned astronomy-engine implementation over 1900-2100. Cubic Hermite interpolation supplies position and velocity corrections. Keep validity guards and correction loading intact.
- Original five-epoch tests and 24 independent off-grid epochs per body pass for 11 bodies. Geocentric Moon errors have separate thresholds: <20 km and <60 arcsec. **Do not loosen tolerances or derive independent expected values from the same implementation.** Sampled acceptance is not a continuous error bound.
- Earth orientation uses apparent sidereal time plus date-to-J2000 conversion. Generic Earth `RotationAxis` spin alone was insufficient. Mars orientation is independently checked against NAIF PCK fixtures.
- `MapState.playback` requires `{ from, to, rate }`; `{ rate }` alone is invalid. The benchmark separately saves/restores running clock mode and rate.
- The engine API is a preview, not frozen v1. Do not let application code rely on new deep engine imports. Preserve existing package-boundary checks.

## 6. Verification evidence

The last code checkpoint passed strict typecheck, lint/boundaries, 46 unit tests, six browser tests, production build and the 72-package runtime license audit.

| Measurement | Recorded result | Evidence |
|---|---|---|
| Clock coverage | 100% branches, 36/36 | Clock coverage command above |
| Time conversions | Sampled round trips <1 microsecond | `packages/astro/test/time.test.ts` |
| Four-body computation | ~0.116 ms/frame, budget 0.2 ms | `docs/perf/ephemeris-benchmark.json` |
| SwiftShader rendered precision | 600 samples; max 0.1344 px, limit 0.5 px | `docs/perf/precision-webgl.json` |
| Depth | Near/far 10 km cloud shell and Moon-behind-Earth pass | Same report |
| LOW asset memory/stability | 8,039,512 bytes; 15 textures stable across 20 focus changes | `docs/perf/texture-stability.json` |
| React playback | 82 commits in 30.031 s, 2.73 Hz at 1 day/s | `docs/perf/react-profile.json` |
| Complete engine gzip | 443,741 bytes, limit 450,000 | `docs/perf/engine-bundle.json` |
| Distributed texture assets | 77.17 MB, limit 80 MB | Asset checker / manifest |

Visual references: `e2e/visual-reference/visual.spec.ts/` contains Earth day/night/limb/terminator, Moon quarter/full, Mars close and Sun bloom. Tests freeze simulation, wait for textures and pause rendering for stable captures. Do not blindly regenerate reference images to hide regressions. Additional desktop/mobile screenshots are in `docs/perf/screens/`.

### User-supplied desktop reports

The user ran two tests and placed downloads in `test-results/`. Copies were preserved outside that ignored/generated directory:

| Original file | Preserved evidence | Recorded tier |
|---|---|---|
| `phase-one-webgpu-1790215983007.json` | `docs/perf/device-user-webgpu-low.json` | LOW in all five views |
| `phase-one-webgpu-1790216083051.json` | `docs/perf/device-user-webgpu-ultra.json` | ULTRA in all five views |

The user expected LOW and HIGH, but the second file actually says **ULTRA**. Do not relabel it HIGH. Both are Windows Chrome 153, WebGPU, 1707 x 904 viewport; DPR 1 on LOW and 1.5 on ULTRA.

Both record approximately 165 average FPS and 6.2 ms p95 frame time in every view, equivalent to approximately 161.3 FPS at p95. Precision is 0.10768 px over 600 samples, with all three depth checks passing and zero pending textures. Asset mip storage is 8,389,056 bytes on LOW and 153,092,544 bytes on ULTRA.

Both reports have an empty adapter identity and `softwareRenderer: false`; the GPU model is not established by the files. Both contain the same 484 ms initial frame value, so they are not independent cold-load measurements. ULTRA is encouraging performance evidence, but an exact HIGH run, forced-WebGL2 desktop run, mobile runs and backend visual comparisons are not recorded.

### Measurement limits

- Agent-driven local Chromium exposes SwiftShader, not a real WebGPU adapter. User-supplied WebGPU evidence is separate and must be retained.
- GPU memory fields count compressed texture mip storage, not total VRAM/driver overhead/render targets.
- The benchmark warms each view for three seconds, measures for ten seconds and reports the last 240 frame intervals. Use `1000 / p95Ms` for the p95 FPS criterion, not average FPS alone.
- First-frame timing covers engine construction to first render submission; it excludes navigation and is not a GPU-present timestamp.
- Hosted CI is configured but has not been run/verified through a remote in this session.
- The user's earlier localhost visual review was positive. Full P1.12 acceptance and explicit Phase 2 approval remain pending.

## 7. Phase 2 work, after authorization and gate resolution

Follow P2.1-P2.10 in the main plan in order, reusing the existing foundations. Do not implement later-phase services just because their interfaces appear here.

| Task | Deliverable and acceptance |
|---|---|
| P2.1 Frame tree | Memoized frame origins and position/state transforms, including FIXED and TEME_EARTH. Round trips <1e-9 relative, Earth rotation 360.9856 degrees/day, independent TEME reference. Engine uses frame APIs. |
| P2.2 Providers | AstronomyEngine planets/Pluto, Jupiter moons, sourced mean-element moons, elliptic/hyperbolic Kepler, sampled Hermite ephemerides. Extend independent Horizons fixtures. Meet section 28 tolerances and planned 100,000-call heap-growth check (<1 MB). Investigate upstream allocations honestly. |
| P2.3 Catalog/registry | Validated body data and provider-backed `loadCatalog`; render/position all 21 entries. Existing TypeScript catalog is a starting point, not task completion. |
| P2.4 LOD/points | Angular hysteresis, instanced point layer with parent-relative buffers and partial updates, generic non-hero materials. 10,000 synthetic points at >=60 FPS desktop; no visible LOD popping. |
| P2.5 Labels | Pool of at most 64, priorities, 96 x 32 px declutter grid, 150 ms fades and semantic bands. Extend existing labels; check planet and Earth/Moon views. |
| P2.6 Layers | Registry with metadata, lazy load/visibility and complete planned IDs. Reuse buffers when toggled. IDs do not imply later-phase live providers exist. |
| P2.7 Orbits | Parent-frame camera-relative adaptive fat lines and certainty styling. Verify r186 WebGPU node support before choosing Line2; use TSL ribbons if needed. Selected orbit highlighting and no LEO jitter. |
| P2.8 Picking | Mesh/point selection and hover, 24 px touch radius, no touch-hover dependency. |
| P2.9 API v1 | Freeze/document public selection/focus/follow/map/layer/quality/events and entity/point registration API, with type tests. UI uses only public exports. See exact signature list in plan. |
| P2.10 Performance regression | Five scripted camera paths, CPU frame-time JSON baseline, CI failure if >20% worse, updated manual GPU evidence. Existing five static view report is not this completed harness. |

Read plan sections 10, 11, 12, 28 and P1.12 alongside these tasks. Phase 3 adds full hero materials; Phase 4B adds the actual data platform. Those are not implicitly included in Phase 2.

## 8. Practical pitfalls and assets

- `apps/web/AGENTS.md` requires reading relevant installed Next.js documentation before application code changes. Docs live under that app's `node_modules/next/dist/docs/`. This Next version may differ from remembered APIs.
- `assets/source/`, `.tools/`, `.next/`, `node_modules/`, `.data/`, coverage and test-results are ignored. Preserve important reports in `docs/perf/` before another test run clears generated output.
- `pnpm assets:build` requires `toktx`; this checkout previously used `.tools/ktx/bin/toktx.exe`. Source downloads and tool installations are not guaranteed to exist in a fresh clone. Built runtime assets are committed.
- NASA sky maps use ETC1S compression to fit the 80 MB budget. Switching all sky tiers to UASTC exceeded that budget. Do not rebuild all assets unnecessarily.
- Preserve credits in `assets/ASSET_LICENSES.md`, the texture manifest, `docs/licensing/DATA_SOURCES.md` and `/about/data`. Basis transcoder licensing is included. Sharp is build tooling, not a permitted assumption about runtime dependency licensing.
- Moon displacement is quantized display terrain, not scientific topography. The atmosphere is an analytic approximation; describe it accurately.
- Bundle headroom is small: about 6 KB gzip at this checkpoint. Track new engine dependencies and avoid assuming an individual Next chunk represents total engine cost.
- Do not infer a renderer architecture failure from SwiftShader FPS. Use the plan's fallback decision tree only with appropriate evidence.
- No secrets are needed for the preview; do not invent credentials, fake live feeds, deployment URLs or completed infrastructure.

## 9. Suggested first actions in a fresh chat

1. Read this document and the new user instruction, then inspect git status and the current gate report.
2. Resolve whether Phase 2 has now been explicitly authorized and how outstanding strict gate conditions are to be handled. Until then, remain within review/Phase 1 scope.
3. Once authorized to proceed under resolved gate conditions, read the referenced plan/ADRs and inspect the existing types/providers/registry before editing.
4. Start with P2.1. Keep changes and meaningful tests incremental; preserve the passing four-body behavior and scientific evidence.
5. Update implementation status and evidence at checkpoints so another usage-limit interruption does not lose the continuation state.

Suggested message to open the fresh chat:

> Read PHASE_2_HANDOFF.md and IMPLEMENTATION_PLAN.md in this repository. Resume from the existing implementation, preserve the recorded results, and follow my explicit instructions about the Phase 1 gate and Phase 2 approval. Keep token use efficient and do not redo completed work unnecessarily.

If the user intends to authorize Phase 2, that fresh message should explicitly say so and address any outstanding gate conditions. The suggested message above intentionally does not invent that approval.
