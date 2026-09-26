# The Space Time Continuum: Phase 3 handoff

**Latest user decision:** completed device coverage and visual review are accepted as sufficient. Further device-tier/browser runs are waived as phase-transition prerequisites; untested combinations remain untested, not passed. Hosted CI has passed. The upstream allocation requirement is the remaining named Phase 2 acceptance question; no allocation exception has been approved. Phase 3 remains unstarted and requires the user's instruction.

Prepared September 26, 2026. Start here in a fresh session; this supersedes the old Phase 2 handoff for current implementation status.

**Latest CI result:** hosted Verify and independent CPU comparison both passed. Comparison run `36278590782` matches the reviewed Linux baseline; all five paths pass, maximum p95 increase 6.38% against 20%. Reports are preserved under `docs/perf/cpu-linux-repeat*.json`. Automatic CPU comparisons are now configured for main pushes and PRs. See [hosted CI status](docs/perf/hosted-ci.md). This supersedes older CI-pending statements below. Upstream allocation acceptance and remaining exact tier/browser coverage remain open. The user explicitly says not to start Phase 3; this review does not authorize implementation.

**Agent operating rule:** read the root [AGENTS.md](AGENTS.md). For long jobs, confirm launch, save the run link and next step, then end the turn. Do not spend tokens polling or waiting. Resume result review when the user returns.

**CI setup update:** the user subsequently authorized using `Wahmed10/TheSpaceTimeContinuum`. `origin` now points to that initially empty GitHub repository. See [hosted CI status](docs/perf/hosted-ci.md) for current execution evidence; older statements below that no remote exists are historical. Phase 3 remains unstarted.

**Latest evidence update:** [September 26 device review](docs/perf/device-review-2026-09-26.md) covers six new reports. Laptop WebGPU HIGH, laptop WebGL2 MEDIUM and Android Brave LOW pass their five-view thresholds and all 11 precision/depth probes. All three 10k-point reports pass. The user reports no visual issues and explicitly instructed **do not start Phase 3**. The laptop WebGL2 filename says High but the actual tier is MEDIUM. Exact WebGL2 HIGH, mobile MEDIUM, other-browser coverage, hosted CPU CI and upstream allocations remain open. This update supersedes older claims below that all device evidence predates the orbit changes; it does not grant Phase 3 implementation authorization.

## 1. Status and user intent

**Phase 2 functionality and local verification are complete. Full formal acceptance is not complete.** P2.2's upstream transient-allocation requirement, P2.10 hosted CI execution, and remaining device/backend acceptance are still open. Do not silently mark these passed.

The user has just navigated the current app and reports that everything looks good. Earlier they accepted the dotted orbit styles and moon paths appearing when zoomed in. This is qualitative usability feedback; the latest message does not identify a device/backend/tier or supply a new quantitative report.

The user requested this document to pass cleanly to a new session for Phase 3. They want continuation, not a restart. Their earlier concerns were missing Saturn rings and mostly single-color planets/moons beyond the original four hero bodies. Those are appropriate Phase 3 work. They prefer collecting cosmetic bugs after the phases, while blocking failures and verification regressions still need prompt fixes.

This turn creates a handoff; **Phase 3 implementation has not started**. The request was conditional on Phase 2 being complete, so do not interpret it as a waiver of the outstanding acceptance checks. Follow the next session's explicit instruction about starting Phase 3 with these named checks carried forward; once that instruction is given, do not repeatedly ask for permission. Preserve the user's prior strict-gate requirement and report unresolved evidence honestly.

## 2. Read in this order

1. `IMPLEMENTATION_PLAN.md`: architecture contracts, material/asset/performance requirements, and the Phase 3 section. It remains the scope authority.
2. `docs/IMPLEMENTATION_STATUS.md`: current September 26 summary; later sections are historical.
3. `docs/PHASE_2_CHECKPOINT.md`: September 26 continuation and final "Resume here" section. Earlier test counts and next-step instructions are historical.
4. `packages/engine/README.md`: stable API v1, provider/source ownership, errors and lab boundaries.
5. `docs/adr/0009-osculating-moon-models.md`, `docs/perf/device-review-2026-09-25.md`, `docs/perf/cpu-regression.md`.
6. `assets/ASSET_LICENSES.md`, `docs/licensing/DATA_SOURCES.md`, existing asset tooling and manifests before adding textures.

`PHASE_2_HANDOFF.md` is a historical document with a current banner. Its old statements that Phase 2 is unauthorized are superseded by the user's subsequent explicit authorization and completed work. Do not use those old statements to restart approval discussions for Phase 2.

## 3. Workspace and operating constraints

- Checkout: `C:\Users\waqar\Documents\TheSpaceTimeContinuum`.
- Windows PowerShell; use `pnpm.cmd` if PowerShell blocks `pnpm.ps1`. Last recorded runtime: Node 24.12.0, pnpm 10.32.1, Next 16.3.6, Three 0.186.0. Recheck installed versions before changing dependencies.
- There are many intentional modified and untracked files from the implementation. **They are the current product**, not disposable clutter. Inspect `git status`; do not reset, clean, overwrite, or assume the committed tree contains this work. No commits or push were made for this handoff.
- No Git remote is configured as of this handoff. Do not invent a repository destination or claim hosted CI ran.
- **Preserve `test-results/`**: it contains the user's original downloaded reports. Playwright clears its default output directory. Always supply `--output=.tools/<descriptive-name>`.
- Development URL is `http://localhost:3000`. The earlier LAN address was `http://192.168.40.171:3000`; recheck interfaces because addresses can change. Start with `pnpm.cmd dev` only if the server is not already running.
- `apps/web/AGENTS.md` requires reading relevant installed Next documentation before editing app code. Locate it under `apps/web/node_modules/next/dist/docs/`.
- No new keys, database, ingestion service or deployment is needed for local Phase 3 rendering work. Do not pull Phase 4B infrastructure into this scope.

## 4. What already exists

| Area | Current implementation |
|---|---|
| Catalog | 21 searchable/rendered bodies: Sun, eight planets, Pluto, Ceres and ten moons |
| P2.1 | Integrated FrameTree, hierarchical origins and state transforms |
| P2.2/P2.3 | Provider-backed catalog, corrected analytic ephemerides, sampled/Kepler/osculating providers; scientific fixtures retained |
| P2.4 | Angular LOD at 2/12/200 CSS pixels with 15% hysteresis; instanced PointLayer and partial uploads |
| P2.5 | 64-slot DOM label pool, priority/grid decluttering and semantic-band rules |
| P2.6 | All 12 MVP layer IDs, requested/effective visibility, resident resources and load/reuse semantics |
| P2.7 | Adaptive float64 parent-frame orbits rendered with custom TSL screen-space ribbons |
| P2.8 | Float64 sphere picking; 12 px desktop / 24 px touch point picking; hover and multi-touch handling |
| P2.9 | `EngineApi`, `API_VERSION=1`, typed events, provider entity registration and external bulk point sources |
| P2.10 | Five-path CPU recorder, CLI, schema 2 comparator and manual hosted bootstrap workflow |

Original hero rendering already exists for Sun/Earth/Moon/Mars. Other bodies use generic lit colors and capped geometry. Do not call the missing Phase 3 surfaces/rings a regression in Phase 2.

### Scientific and rendering contracts to preserve

- Physics stays float64. Subtract the physical camera before float32 GPU uploads. The GPU camera stays at the origin; logarithmic depth must remain consistent across bodies, points, rings and orbits.
- Physical positions are not mutated for Explore scale. Display transforms and moon-system boosts remain separate.
- Scientific fixed frames use Z north; the texture convention converts to Y-up. Inspect existing orientation code before applying a new tilt or texture rotation; avoid applying either twice.
- Runtime catalog providers are in `packages/astro/src/ephemeris/`. Phobos, Deimos, Titan, Triton, Charon and Ceres use JPL osculating tables under `apps/web/public/data/orbits/`, always marked approximate. This replaced the rejected mean-element route; see ADR 0009.
- Keep all correction binaries, osculating binaries, provenance files and holdout fixtures. Callisto also has a residual correction file. Do not regenerate scientific data merely to change visual materials.
- Six osculating models have 300 independent off-grid holdouts. Existing planet/Galilean, Callisto, Eros, Voyager and Apophis tests remain relevant. Sampled accuracy is not a continuous error bound.
- The two expected-failure tests describe the rejected Titan/Triton mean-element model, not failures of the production provider. Do not remove them to make the count look cleaner.
- Upstream astronomy-engine still creates transient objects. Under-1-MB retained heap growth after GC is a leak check, not evidence of zero transient allocations.

### Orbits and interaction

Computed/reconstructed paths are solid, predicted paths dashed, approximate paths dotted and faded. Selected paths widen and brighten. Minor/dwarf paths appear for selection/hover; moon paths appear in local planetary views. The user has accepted this behavior.

`OrbitMaterial.ts` clips true view-space segments to the near plane and a viewport guard band before widening. Keep true clip W and logarithmic fragment depth consistent. Earlier Line2 and fragment-only approaches failed on long oblique segments; do not revert the fix casually. The 11-scenario depth probe includes oblique ray/sphere comparisons with explicit boundary exclusions.

Material screenshots disable orbit paths to isolate materials. Dedicated orbit tests cover their behavior. Existing eight reference images and 1.5% threshold were not changed.

### API/source contracts

Application code uses `EngineApi`; deep engine imports and direct `.cameraController` access are rejected by boundary checks. Lab instrumentation remains on `SpaceEngine`, outside the stable consumer contract.

`registerEntities` validates and stages providers, visuals, optional period-based orbits and replacement point buffers before committing. `registerPointLayer` owns one fixed-capacity source and reusable buffers, with float64 frame transforms and one instanced draw. Source disposal transfers only on successful registration. Detach is idempotent, removes labels/IDs and returns focus to Earth if needed. `sourceError` isolates source failure from renderer fallback. Sources do not yet populate app search automatically or provide independent trajectory arcs.

## 5. Phase 3 scope from the implementation plan

The plan calls for:

- Hero-grade Jupiter and Saturn materials, including bands; subtle animated flow is optional.
- Saturn rings with Mie forward scattering and planet-to-ring / ring-to-planet shadows.
- Uranus/Neptune atmospheres, Venus clouds, and Mercury, Pluto/Charon and Ceres surfaces.
- Axial tilts and rotations for all bodies; moon systems visible at planetary band.
- Planet/moon orbit visualization and tuned True/Explore scale behavior for all bodies.
- Position fixtures and screenshots per body.

**Exit:** all 21 bodies render within the performance budget and pass their position tests. Reuse Phase 2 positioning, orbit, LOD and label work; audit and extend it where Phase 3 needs it. Do not rebuild these systems from scratch or add Phase 4-8 routing/data/spacecraft features.

### Suggested implementation order once Phase 3 starts

This is an execution suggestion, not a replacement for the plan:

1. Audit current `PlanetFactory`, quality presets, asset lifecycle and rotation/frame conventions. Make a per-body material/orientation checklist for all 21 bodies, including non-hero moons the user flagged.
2. Establish sourced, licensed, quality-tiered assets and reproducible conversion. Preserve attribution and distinguish actual imagery from illustrative/procedural appearance. Reuse compressed textures, reference counting and tier budgets.
3. Implement Jupiter/Saturn appearance and Saturn's rings as the first visible milestone. Include ring orientation, physical inner/outer extents, both required shadow directions, scattering and quality fallbacks. Check front/back viewing and ring/planet/orbit depth interactions.
4. Extend remaining planetary/dwarf/moon detail and verify orientation, rotation and tidally locked presentation against authoritative sources where applicable. Do not infer scientific constants from an attractive screenshot.
5. Tune planetary-band moon systems, labels, LOD and True/Explore transitions without mutating physical states or breaking touch/focus behavior.
6. Add deterministic screenshots and meaningful tests for new features. Preserve established references for unaffected hero bodies; review intended visual changes before replacing a reference. Run performance and scientific regressions at coherent milestones.

### Useful code entry points

| Concern | Entry point |
|---|---|
| Body materials/geometry | `packages/engine/src/bodies/PlanetFactory.ts` |
| Asset loading/lifetime | `packages/engine/src/assets/AssetManager.ts` |
| Existing conversion pipeline | `tools/assets/build-ktx.ts`, `build-textures.ts`, `build-moon.ts`, `build-mars.ts` |
| Catalog metadata | `packages/domain/data/bodies.json`, `packages/domain/src/catalog.ts` |
| Registry/orientation integration | `packages/engine/src/scene/EntityRegistry.ts`, `packages/engine/src/SpaceEngine.ts` |
| Frame conventions | `packages/astro/src/frames/`, `docs/adr/0004-frames.md` |
| Orbits | `packages/engine/src/layers/OrbitLayer.ts`, `OrbitMaterial.ts` and `sampleOrbit.ts` |
| LOD/labels | `packages/engine/src/lod/`, `packages/engine/src/labels/` |
| Precision/depth | `packages/engine/src/perf/PrecisionProbe.ts`, `e2e/precision.spec.ts` |
| Existing material references | `e2e/visual.spec.ts`, `e2e/visual-reference/` |
| App/engine bridge | `apps/web/src/engine-bridge/EngineCanvas.tsx`, `useEngineStore.ts` |

## 6. Verified checkpoint and reproducible commands

These results were obtained in the preceding implementation turn and preserved in workspace evidence. This documentation-only handoff does not claim a new full test run.

| Check | Latest result |
|---|---|
| Typecheck, lint/boundaries, unit tests | PASS; 116 passed, 2 expected rejected-model diagnostics |
| Production build | PASS; 21 catalog records validated |
| Final browser regression subset | 10 tests passed; output `.tools/phase-two-api-final` |
| Material references | All eight passed at unchanged 1.5% tolerance |
| GPU readback precision | 600 samples, max 0.134355961 px against 0.5 px |
| Depth | All 11 scenarios passed on local SwiftShader WebGL2 |
| Standalone engine bundle | 368,185 / 450,000 gzip bytes, including lab code and dependencies |
| CPU schema 2 repeat | All five paths passed unchanged 20% mean/p95 threshold; maximum p95 increase 10.34% |
| User report integrity | All four original report hashes match preserved copies |

```powershell
pnpm.cmd verify
pnpm.cmd build
pnpm.cmd exec playwright test e2e/startup.spec.ts e2e/mobile.spec.ts e2e/picking.spec.ts e2e/point-source.spec.ts e2e/registration.spec.ts e2e/orbits.spec.ts e2e/precision.spec.ts e2e/visual.spec.ts --output=.tools/phase-three-regression
node tools/measure-engine.mjs
```

The ten-test command is the final regression subset, not a claim that every browser file was rerun then. Additional relevant tests include `catalog`, `lod`, `labels`, `layers`, `poc` and `react-profile`. Choose tests appropriate to changes. Build separately from browser/performance measurements.

Asset changes also need licensing/manifest checks:

```powershell
pnpm.cmd licenses:check
pnpm.cmd exec tsx tools/check-assets.ts
```

CPU measurements require a started dev server, a dedicated visible test page, and no concurrent builds, source edits or other benchmarks:

```powershell
pnpm.cmd perf:cpu --output .tools/cpu-phase-three.json --baseline docs/perf/cpu-fixed-initial.json
```

Read `docs/perf/cpu-regression.md` first. Schema 2 uses LOW/True, the unextended 21-body catalog, fixed 60 Hz scheduling at 1x simulation, 30 warmup and 120 measured frames per path. Reports must match CPU/platform/browser/configuration and scheduled-work counts. It measures synchronous CPU work including renderer submission, not GPU execution or FPS. The Windows reference is a local candidate, not an approved Linux hosted baseline.

Keep `cpu-local-*` schema 1 evidence: its repeat failed Earth-Moon zoom p95 by 26.32%. Schema 1 paused simulation and varied scheduled work with RAF cadence; schema 2 corrects that protocol. Never compare the schemas or relabel the earlier failure as a pass. Do not raise the 20% threshold or overwrite a baseline merely because a later run fails.

## 7. Outstanding acceptance ledger

| Open item | What is known / what is still required |
|---|---|
| P2.2 allocations | Provider functionality and retained-growth checks pass; upstream transient allocations remain. Resolve the requirement explicitly without calling a post-GC heap test proof of zero allocations. |
| P2.10 hosted CI | Manual `.github/workflows/cpu-perf.yml` exists. No remote, hosted run or reviewed Linux baseline exists. Record/review a matching hosted baseline, then enforce comparison and enable automatic triggers. |
| Device tiers | Submitted desktop WebGPU and Samsung S23 Ultra/Brave runs were ULTRA. Do not relabel them HIGH or LOW/MEDIUM. Exact remaining matrix rows remain open. |
| Backend/visual parity | New orbit and future Phase 3 visual parity on actual WebGPU/WebGL2 hardware, plus LEO orbit jitter signoff, need evidence. Software readback does not establish every physical-device result. |

Physical reports are summarized in `docs/perf/device-review-2026-09-25.md`. Desktop WebGPU points reached 164.71 average FPS; Samsung Brave WebGL2 points reached 60.003 FPS. Phone Phase 1 five-view p95 was 16.7-16.8 ms; precision was 0.104706333 px with the three original depth probes passing. These reports predate the new orbit/API changes. The latest navigation feedback does not expand their quantitative scope.

The former Samsung/Brave infinite loader was reproduced at the LAN HTTP origin and fixed with exact development `allowedDevOrigins` plus startup timeout/retry handling. Do not replace it with a wildcard or assume viewport emulation alone verifies LAN startup.

## 8. Fresh-session starting prompt

Paste this if you want the next session to begin by reviewing the handoff:

> Read PHASE_3_HANDOFF.md, the current September 26 sections of docs/PHASE_2_CHECKPOINT.md and docs/IMPLEMENTATION_STATUS.md, and the Phase 3 scope in IMPLEMENTATION_PLAN.md. Preserve the existing workspace and my test-results files. Phase 2 functionality and local checks are complete, but the handoff names outstanding formal acceptance items. Start by confirming that status and the Phase 3 implementation sequence; do not restart Phase 2 or silently mark pending gates passed.

If authorizing Phase 3 implementation in that session, say explicitly that it may proceed while the named acceptance items remain tracked. No implementation changes were made by this handoff task.
