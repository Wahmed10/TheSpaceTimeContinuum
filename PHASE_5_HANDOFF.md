# Phase 5 handoff: Earth satellites

Prepared October 5, 2026 for a fresh session in `C:\Users\waqar\Documents\TheSpaceTimeContinuum`.

**Phase 4 is complete and accepted. Phase 4B and Phase 5 are unimplemented.** The user completed the UX review, confirmed everything is good, and requested this handoff. No Phase 4 acceptance gate or validation job remains pending. This document prepares the next phase; it does not authorize implementation of an unapproved plan or provision external services.

The implementation plan places **Phase 4B: Data Platform Foundation before Phase 5: Earth Satellites**. The next session should expand that prerequisite and the satellite work into a concrete file-level plan, then obtain the user's approval under section 0 of [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). If the next session already has explicit approval for that concrete plan, continue within it without asking again.

## 1. Read first and preserve the accepted checkout

Read these in order:

1. [AGENTS.md](AGENTS.md), including the launch-and-handoff rule for long jobs.
2. This handoff.
3. [Final Phase 4 acceptance](docs/perf/phase-four/p4-9-final-acceptance.md) and [completed UX review](docs/PHASE_4_UX_REVIEW.md).
4. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): section 0; provider, database, API, search, route, satellite, security and testing contracts; section 30 Phase 4B and Phase 5; section 31 acceptance criteria.
5. [Implementation status](docs/IMPLEMENTATION_STATUS.md), [Phase 4 implementation handoff](PHASE_4_IMPLEMENTATION_HANDOFF.md), [progressive-loading plan](docs/PHASE_4_PROGRESSIVE_LOADING_PLAN.md), and relevant ADRs in [docs/adr](docs/adr).
6. [Deferred enhancements](docs/ENHANCEMENTS.md).

The older [PHASE_4_HANDOFF.md](PHASE_4_HANDOFF.md) is the historical Phase 3-to-4 transition. Its statement that Phase 4 is unstarted is superseded. Historical entries in the implementation handoff/checkpoint retain failures and pending states from their original dates; the latest acceptance takes precedence.

### Source identity and important worktree warning

| Item | Accepted identity |
| --- | --- |
| Last committed HEAD | `035fc967ed9ba88550773ea8f757fd5ff905d23c` — accepted P4.8 |
| Tested P4.9 source snapshot SHA-256 | `95e97a1ee10e912119162931eb0878b39a4537e9b75c9c1e6de7667912565e86` |
| Source manifest | `.tools/phase-four/p4-9/progressive-integration-5/launch.json` |
| Frozen candidate source files | 3,091 |
| Last validation job | `progressive-integration-5`, historical PID 38320, finished `2026-10-05T01:25:41.341Z` |
| Recorded user acceptance | `2026-10-05T03:51:32.760Z` |

**Accepted P4.9 is still uncommitted. HEAD alone does not contain the finished phase.** The accepted source includes tracked modifications and new source/data files, including runtime chunks. Inspect the worktree before making changes. Preserve both tracked and untracked implementation files when creating a worktree, baseline or isolated test candidate. Do not reset, clean, discard or replace the checkout with HEAD. Do not stage everything indiscriminately.

Documentation was updated after the frozen test snapshot. The documentation-follow-up audit proves that all tested runtime, data, configuration, test and tool files remain unchanged. README and implementation status are the two changed files within that original source manifest; additional acceptance/handoff documents are recorded separately. This is a source snapshot hash, not a Git commit hash.

At handoff verification, the user's development server was listening on `http://localhost:3000`, PID 3664. That PID is historical and must be checked before acting on it. Preserve the user's server. Job-owned ports 3001/3002 were stopped. Do not build into the active root `.next`; use an isolated candidate for production validation.

## 2. What Phase 4 delivered

The accepted consumer experience has canonical object links, validated shared URL state, Back/Forward restoration, local MiniSearch across all 21 bodies and aliases, object cards and physical measurements, provenance, sharing, UTC date controls, eight playback speeds, layers/settings/help, mobile sheets, keyboard access and a selectable Objects in view list. Cold route commands flow through the public `EngineApi`; React observes snapshots at no more than 4 Hz.

The accepted renderer and science foundations remain intact: WebGPU/WebGL2, 21 sourced bodies, Saturn rings, irregular Mars moon meshes, camera inputs/focus/follow/history, Explore/True scale, float64 physical positions, camera-relative GPU coordinates and the established scientific/material tolerances.

P4.9 also delivered measured progressive loading:

- Planets are computed locally with `astronomy-engine`. To retain the accepted accuracy, compact fitted residual coefficients stream in fixed time chunks. There are no raw downloaded planetary position tables. Missing correction data produces a fresh uncorrected planet marked approximate.
- The six accepted orbital models for Ceres, Phobos, Deimos, Titan, Triton and Charon use the established streamed data and honest model provenance. Their fallback/loading behavior is per object.
- Immediate previews and small 1K textures precede sharper desktop textures. Mobile uses the approved lower-resolution 1K policy. High-resolution assets never block first paint. Optional KTX2 concurrency is capped at two.
- Fixed 28-Julian-day bundles use versioned URLs and long-lived cache headers. The client cache is bounded at 8 MiB, prioritizes/pins the current date, and prefetches in either direction during fast playback.
- A date jump keeps rendering. Freshness is checked against the requested epoch and revision; objects without valid data are marked or hidden individually. Old positions never stand in for current ones.
- Orbit ribbons are optional background work. Label work follows actual visibility, and OrbitLayer calculates/uploads each vertex once without changing validated geometry.

These choices are user-approved requirements to preserve when adding satellites.

### Final accepted evidence

The authoritative closure is [p4-9-final-acceptance.md](docs/perf/phase-four/p4-9-final-acceptance.md) and [its JSON](docs/perf/phase-four/p4-9-final-acceptance.json). The full original automatic review is [p4-9-progressive-integration-5-review.md](docs/perf/phase-four/p4-9-progressive-integration-5-review.md) and [its JSON](docs/perf/phase-four/p4-9-progressive-integration-5-review.json). The automatic report still says manual review was pending at publication; the final acceptance closes that gate without rewriting the original evidence.

| Gate | Reviewed result | Original limit |
| --- | --- | --- |
| Unit/science | 480 passes; two expected rejected-model diagnostics; 56 test files | All required checks pass |
| Production browser | 108 cases across 22 files; four performance cases; three separate profiles | No skips, retries, flakes or report errors |
| First actual painted frame, desktop | Maximum 901 ms, five cold samples | 2,500 ms |
| First actual painted frame, simulated 4G | Maximum 4,421.1 ms, five cold samples | 5,000 ms |
| Actual startup download | Maximum 929,385 bytes | 1,500,000 bytes |
| Conservative build startup cap | 1,074,869 bytes | 1,500,000 bytes; build fails above it |
| Uncached distant desktop date jumps | Maximum 112.9 ms across five jumps | 1,000 ms; current positions and continuous rendering |
| CPU regression | All three predeclared pairs pass; worst mean +3.61%, p95 +12.50% | Every original path/pair mean and p95 ≤ +20% |
| Physical desktop HIGH throughput | Worst p95 WebGL2 12.2 ms; WebGPU 12.1 ms | 16.7 ms |
| Engine lazy bundle | 380,494 gzip bytes | 450,000 bytes |
| Root/Earth/Charon shells | 196,576 / 192,943 / 192,943 gzip bytes | 200,000 bytes each |
| Built assets | 79,961,515 bytes | 80,000,000 bytes |

The first-frame tests used explicit desktop network/CPU settings and simulated 4G at 4 Mbps down, 1 Mbps up, 150 ms latency and 4× CPU slowdown. Viewport/network emulation does not establish phone thermal behavior or total GPU memory. Earlier accepted physical-device coverage remains closed within its recorded scope.

The review also covers all 2,623 derived bundles, correction and six-model boundaries, both playback directions at one year/second, camera precision/depth, material references, ring/body geometry, texture stability, 14 open-state accessibility scans, native keyboard flows and whole-Explore render-rate profiles. There are 193 hashed raw artifacts, 128 captures and two inspected contact sheets. Original failed runs and diagnostic reports remain preserved; no threshold was relaxed and no best passing CPU pair was selected.

The local `.tools/phase-four/p4-9/progressive-integration-5/review.json` has `phaseAcceptance.accepted: true` and `pendingGates: []`. Its `automated-review.json` retains the pre-user-review version; `acceptance.json` anchors both identities. [The documentation-follow-up proof](docs/perf/phase-four/p4-9-progressive-integration-5-documentation-follow-up.json) verifies unchanged runtime and preserved evidence. Do not reopen or repeat these accepted tests just to start the next session.

## 3. Phase 4B is a real prerequisite, not an existing service

The current Solar System application works without a database, accounts or provider credentials. The following files are scaffolds:

| Existing location | Actual state | Required foundation |
| --- | --- | --- |
| [packages/db/src/index.ts](packages/db/src/index.ts) | Version export only | Drizzle schema, migrations, connection and queries |
| [packages/db/package.json](packages/db/package.json) | Neon/Drizzle dependencies and script placeholders | Working configuration and migration/seed commands |
| [packages/ingest/src/index.ts](packages/ingest/src/index.ts) | Version export only | Provider contracts, validated normalization and persistence |
| [packages/ingest/src/runner.ts](packages/ingest/src/runner.ts) | Deliberately exits with failure; performs no requests/writes | Due-provider runner with state and run bookkeeping |
| [.env.example](.env.example) | Configuration template | Actual server-side configuration through ignored files/secrets |
| [.github/workflows](.github/workflows) | Verification and CPU workflows only | Proposed `ingest.yml`; real schedule/manual run |
| [apps/web/src/app](apps/web/src/app) | No `/api/v1` handlers or `/status` implementation | Read-only DTO endpoints, cache policy, provider freshness page |

The runner's message about a failed P1.12 gate is a stale placeholder, not an open architecture failure. Earlier phases are accepted. Dependency presence and template variables do not prove a Neon project, credentials or an ingestion service exists; none was provisioned or verified for this handoff.

### Proposed Phase 4B implementation order — needs a file-level plan

1. **Database and configuration:** implement the section 15 Drizzle schema and migrations, Neon development connection, `pg_trgm`/`unaccent` search setup, safe server-only configuration, and catalog/alias seeding. Retain the plan's Neon/Drizzle choice unless the user changes it. Establish how the user will configure external credentials without printing them in chat.
2. **Provider infrastructure:** implement shared `politeFetch`, provider adapters, normalized provenance, due scheduling, sequential provider execution, bounded retained payloads, and `provider_state`/`ingestion_runs` records. The plan calls for a contact User-Agent, 30-second timeout, per-host single-flight, backoff, and stopping/marking a provider paused on non-200. Define which failures may retry and how paused providers resume; do not turn a rejected response into repeated unbounded fetches.
3. **API and search:** own Zod-validated DTOs, shared response envelope/cache helpers, bounded read-only queries, `/api/v1/objects/search`, and `/status`. Do not pass provider payloads through as the application's API contract or expose database access to client components.
4. **Scheduled proof:** proposed `.github/workflows/ingest.yml` with `17 */2 * * *` and manual dispatch, Node/pnpm setup, secret wiring and failure notification. Verify notification configuration. Demonstrate a scheduled dummy-provider run that actually persists a snapshot and freshness, then check `/status`. A successful no-op does not satisfy this exit gate.

The plan's schema includes sources, objects/aliases, provider records, orbital elements, trajectories, layer snapshots, future content tables, provider state and ingestion runs. Build the approved schema foundation; future event/news/asteroid features remain outside this phase. Seed spacecraft only from the planned curated list with traceable identities, without inventing live positions or accidentally implementing Phase 7.

The existing domain envelope is `{ data, meta: { generatedAt, sources: [{ id, sourceTimestamp? }], stale } }`. Preserve the distinction between provider source time, ingestion time, element epoch, response generation time and requested simulation time.

## 4. Phase 5 scope from the implementation plan

The goal is **Earth satellites from CelesTrak orbital elements**, propagated locally with SGP4. The principal exit is an ISS that is searchable, selectable/followable and within 5 km of an independent reference at the matching element epoch, with correct source and uncertainty disclosure.

Implement:

- A server-side `CelesTrakProvider` for verified JSON OMM groups. Planned scheduling is no more frequent than every two hours. Store one JSONB snapshot per group/update, with source/ingestion timestamps, content identity and record count. Create persistent `sat:<norad>` object/alias records for curated or brightest objects; do not create a full database object for every Starlink merely to display a bulk point.
- A pure SGP4 adapter using the installed `satellite.js` version, and a `Sgp4Worker`/Comlink transport. Prepare records once per element snapshot; planned batch cadence is 2 Hz desktop and 1 Hz mobile. Transfer Earth-relative display buffers and interpolate between correctly timed batches on the main thread. Use IndexedDB for the approved cached snapshot contract.
- Earth-band point rendering, group colors, bounded populations, selection/follow, and a selected orbit covering one period behind and ahead, with the future portion dashed.
- A satellite card with NORAD ID, COSPAR ID where supplied, element epoch/age, altitude, velocity, period, source and a visible “propagated from elements N h old” explanation. Propagated positions are not observed telemetry.
- Stations as the default group, including ISS/Tiangong where the verified source supports them. Starlink, GNSS, weather, science and brightest/other groups remain opt-in. Resolve application layer IDs to actual provider groups; names such as `bright`/`visual` must not be guessed.
- Dynamic object routes/search, including the canonical planned path `/object/sat/25544`; `iss` and `25544` must resolve to the same ISS identity.

Planned counts are 10,000 desktop points, a 30,000 stretch target, and 2,000 mobile points. The 10,000-satellite propagation target of under 20 ms per batch is an assumption to measure, not an existing pass. The stretch population must not replace the mandatory target or alter first-frame budgets.

Original provider facts were recorded in the plan on September 22, 2026. Before implementation, verify current official CelesTrak group names, format, access/cache policy, licensing/attribution and the installed library's API. This documentation session did not fetch a live satellite feed or certify those facts as current. Preserve the original plan's intent while documenting any evidence-backed adjustment for approval.

**Out of scope:** observer location/pass predictions, geolocation, Doppler, an overhead planner, asteroids/NEOs, interplanetary spacecraft, events/news, accounts, new opinion-based redesign and production launch. These belong to later phases or post-MVP work.

## 5. Existing integration points and traps

All paths below exist today unless explicitly called proposed. Read [apps/web/AGENTS.md](apps/web/AGENTS.md) and relevant installed Next.js documentation before changing application code.

| Area | Existing files | What to preserve or extend |
| --- | --- | --- |
| Entity/source contracts | [domain types](packages/domain/src/types.ts), [catalog](packages/domain/src/catalog.ts), [bodies.json](packages/domain/data/bodies.json) | Satellite, SGP4, propagated certainty and Earth/TEME frame concepts exist. The body catalog is still the accepted 21-body set. |
| Time and frames | [scales.ts](packages/astro/src/time/scales.ts), [FrameTree.ts](packages/astro/src/frames/FrameTree.ts), [solarSystemFrames.ts](packages/astro/src/frames/solarSystemFrames.ts), [AstronomyEngineProvider.ts](packages/astro/src/ephemeris/AstronomyEngineProvider.ts) | Reuse the tested physical time/frame adapters and Earth origin. |
| Public engine boundary | [EngineApi.ts](packages/engine/src/EngineApi.ts), [SpaceEngine.ts](packages/engine/src/SpaceEngine.ts), [EntityRegistry.ts](packages/engine/src/scene/EntityRegistry.ts) | Cold dynamic entity and point registration are available. Review parent registration, picking/follow and removal ownership. |
| Bulk rendering | [PointSource.ts](packages/engine/src/layers/PointSource.ts), [SourcePointLayer.ts](packages/engine/src/layers/SourcePointLayer.ts), [PointLayer.ts](packages/engine/src/layers/PointLayer.ts), [LayerRegistry.ts](packages/engine/src/layers/LayerRegistry.ts) | Reuse instanced points and requested/available/loaded/visible state. Domain layer declarations alone do not activate a source. |
| Engine/UI lifecycle | [EngineCanvas.tsx](apps/web/src/engine-bridge/EngineCanvas.tsx), [useEngineStore.ts](apps/web/src/engine-bridge/useEngineStore.ts), [RouteStateBridge.tsx](apps/web/src/engine-bridge/RouteStateBridge.tsx), [routeStateController.ts](apps/web/src/engine-bridge/routeStateController.ts) | Preserve latest-state startup guards, asynchronous teardown, URL authority and throttled observers. |
| Routes | [routeState.ts](apps/web/src/lib/routeState.ts), [object page](apps/web/src/app/(explore)/object/[kind]/[slug]/page.tsx) | Future `sat` vocabulary exists, but resolution/static metadata still use current catalog bodies. Satellite links currently have no implementation. |
| Search | [catalogSearch.ts](apps/web/src/lib/catalogSearch.ts), [EntitySearch.tsx](apps/web/src/components/search/EntitySearch.tsx) | Preserve local fast search/keyboard access. Extend server-result merging, cancellation, deduplication and stable canonical identity. |
| Cards/provenance | [ObjectCard.tsx](apps/web/src/components/objects/ObjectCard.tsx), [ObjectMetrics.tsx](apps/web/src/components/objects/ObjectMetrics.tsx), [ProvenanceDetails.tsx](apps/web/src/components/objects/ProvenanceDetails.tsx), [MobileObjectSheet.tsx](apps/web/src/components/objects/MobileObjectSheet.tsx), [formatEntity.ts](apps/web/src/lib/formatEntity.ts) | Current body-based assumptions need an explicit dynamic entity model. Some satellite formatter labels already exist; live satellite support does not. |
| Source explanation | [about/data/page.tsx](apps/web/src/app/about/data/page.tsx) | Currently explains the lack of live feeds. Update only when a real satellite source exists. |

Specific implementation constraints:

- `PointSource.update(tdbSec, buffers)` is synchronous. It receives engine-owned `Float64Array` six-component states, RGB and sizes, and returns an active prefix count. No fetch/promises, retained buffer references or worker transfer of engine-owned arrays. Zero point size hides an individual record; invalid state must not place a satellite at the origin. Membership/order/capacity are fixed per registration; replacing a group must remove/register with defined ownership.
- Existing transfer/double-buffer design must be planned explicitly: epoch bounds, request generation, element snapshot version, point ordering, validity flags and position/velocity units. Worker-owned transferable buffers are separate from engine-owned render outputs. Late replies after date/group/source changes must be discarded. Dispose workers, registrations and buffers on unmount/removal.
- Current Objects in view construction uses the static explorable catalog. Audit dynamic selection/list/picking/follow as one feature; registering a point source alone does not make a satellite searchable or selectable everywhere.
- Current generic search-link formatting uses the entity kind; merely adding a satellite could generate `/object/satellite/25544`. Unify canonical formatting with the planned `/object/sat/25544` route, and preserve existing planet/moon/dwarf URLs, metadata and genuine 404 behavior.
- Server search should enrich the existing local results, not delay the current keyboard experience. Cancel stale queries and use stable IDs to deduplicate local/cache/server identities. A selected curated satellite must remain addressable even when its group is currently off.
- `satellite.js@7.1.0` is installed in `packages/astro`; it has no implemented satellite provider yet. Comlink is not currently declared. Choose the worker entry point during file-level planning. Keep pure propagation/math in astro and browser transport at an allowed boundary; astro's architecture checks forbid DOM coupling.

### Scientific and freshness requirements

Physical state is float64, TDB seconds from J2000, kilometers/kilometers per second, and ICRF with explicit origins. Display scaling is separate. Subtract camera/origin in double precision before GPU float32 conversion. Plan bulk Earth-relative transfer precision separately from the selected satellite's canonical physical state; accuracy tests must validate the entire conversion/render path, not only the library call.

The current astronomy adapter uses `AstroTime.FromTerrestrialTime`, and the current TEME-to-Earth-ICRF frame includes the equation of equinoxes as well as the equator-of-date rotation. Older simplified UTC adapter/TEME formulas in the original plan must not overwrite these accepted implementations. Test rotation direction, origin, velocity and time conversion with independent fixtures.

Worker batches must cover the requested simulation epoch. Wall-clock 2 Hz/1 Hz does not permit rendering a stale batch as current during fast playback or a date jump. Define interpolation bounds and any bounded prediction policy in the plan; invalidate obsolete work, prioritize the current date, and keep the rest of the scene rendering.

The plan proposes warnings beyond three days from the element epoch and hiding beyond 30 days; these are assumptions to validate/document, including past dates. The app's 1900–2100 date UI is not permission to treat today's elements as accurate throughout that range. Missing, expired, decayed or invalid propagation must be per-object failures with truthful provenance, not coordinates carried forward from the last good frame. Define offline cached-element behavior and distinguish a stale feed from a failed propagation.

## 6. Suggested Phase 5 steps for the next approved plan

These are planning inputs, not approved implementation steps or preselected filenames for every new module.

| Step | Concrete result and review gate |
| --- | --- |
| P5.1 — Contracts and fixtures | Verify provider/library facts; define normalized OMM/group/snapshot DTOs, identities, provenance, staleness and point/selected-state contracts. Capture licensed, timestamped, independent test fixtures. |
| P5.2 — Provider and API | Implement group ingestion on the accepted Phase 4B foundation, snapshot deduplication/history, curated aliases, cached bounded `/api/v1/layers/satellites?group=stations`, and visible provider freshness/failure state. Test real persistence and DTO validation. |
| P5.3 — Pure propagation and frames | Build SGP4 record preparation/state evaluation and TEME/Earth-ICRF conversion. Establish independent scientific tolerances before UI work. No network, React, Three.js or DOM in pure math. |
| P5.4 — Worker and cache | Add approved Comlink transport, reusable transferable buffers, snapshot-version/epoch cancellation, 2 Hz desktop/1 Hz mobile scheduling, IndexedDB migration/validation and bounded cache behavior. Measure raw worker cost and main-thread copy/interpolation cost. |
| P5.5 — Engine satellite layer | Connect instanced points, group colors/band visibility, dynamic metadata, picking/focus/follow, cleanup and the selected past/future orbit. Avoid one mesh, card subscription or per-frame network request per satellite. |
| P5.6 — Consumer integration | Implement canonical satellite routes, server/local search, ISS aliases, meaningful source/card metrics, layer states/mobile access and dynamic Objects in view without exceeding the existing React cadence. |
| P5.7 — Failure and race coverage | Verify date/group/source changes, late worker/API replies, cache corruption/expiration, offline mode, provider pause, decayed satellites, unavailable references and honest out-of-range behavior. |
| P5.8 — Acceptance | Freeze a complete candidate, run independent science/worker/browser/performance checks, preserve original gates, inspect raw evidence and captures, then obtain the user review required by the approved plan. Record source/evidence and write the next handoff. |

Select proposed new module paths after inspecting package exports and boundary rules; record every created/modified file in the approved plan. Complete Phase 4B's real scheduled-ingestion exit before relying on its services for P5.2. Keep new work isolated from accepted generated planet chunks, scientific fixtures, materials and reference images unless a specific approved change requires them.

## 7. Required validation and measurable completion

### Satellite-specific gates

- Vallado SGP4 verification vectors within `1e-3 km`, with pinned library/data provenance and matching time conventions.
- An independent TEME-to-ICRF reference within `0.1 km` in LEO, including direction/origin and velocity checks.
- ISS within `5 km` of an independent reference at the matching element epoch. Establish availability and provenance first. A second call to the same implementation is not an independent oracle; the original plan's example reference IDs/services must be verified before use.
- Correct snapshots and source freshness through database, API, IndexedDB, worker and card, with no stale state on a date/group/source change. Test interpolation at adjacent batch boundaries as well as jumps, element-snapshot changes and validity cutoffs.
- Measured 10,000-satellite desktop batches below the approved target (proposed `<20 ms`), mobile 2,000-point behavior at its planned cadence, bounded buffer/cache memory and correct cleanup. Publish population, device, library, simulation date, update cadence, sample count, timing window, raw measurements and propagation failures. Distinguish propagation time from transport/frame costs.
- ISS aliases/search/direct refresh/Back/Forward/share/select/follow and selected-orbit provenance work on desktop/mobile. Layer-off selection and provider-offline cases have an explicit supported behavior. Add meaningful accessibility/keyboard checks for changed flows.

### Existing gates that stay in force

Retain the accepted first-frame, startup byte, date-jump, bundle/asset, accuracy, material, geometry, frame/memory, React cadence, accessibility and paired CPU thresholds. Keep satellites and their optional library/data loading off the critical first-paint path. Count anything actually loaded at startup in the automated byte cap, including any default station snapshot.

Relevant commands are `pnpm.cmd verify`, `pnpm.cmd build`, `pnpm.cmd test:e2e` and `pnpm.cmd perf:cpu`; inspect their current scripts before choosing a phase-specific isolated run. The build already validates catalog/chunks and fails an exceeded startup cap. [check-boundaries.ts](tools/check-boundaries.ts) enforces package/client boundaries. Existing scientific tests are under [packages/astro/test](packages/astro/test), engine tests under [packages/engine/test](packages/engine/test), and browser cases under [e2e](e2e).

The accepted local CPU reference is immutable Phase 2 commit `4409ef5d8f97299d9058360c97d560493d067c1c`, with 220 frozen source files in `.tools/cpu-phase-three/reference`. The three accepted Phase 4 pairs used ordinary development builds, fresh sequential reference/candidate browsers on the same machine, SwiftShader WebGL2 LOW, 1440×1000/DPR 1, 21 bodies, fixed September 22, 2026, rate 1, five paths and 120 measured + 30 warmup samples per path. Every pair/path must satisfy its original mean/p95 cap; no outlier removal, cross-pair averaging or selecting the best pair.

That core workload does not measure 10,000 satellite propagation/rendering. Preserve the core regression comparison and add a separately specified satellite workload. The existing harness assumes 21 bodies; do not quietly change that assumption or use an incomparable baseline to make the satellite gate pass. Likewise, hosted CPU validation uses the separate reference and environment recorded in [.github/workflows/cpu-perf.yml](.github/workflows/cpu-perf.yml); do not replace it with the local reference without an approved reason.

Do not repeatedly run full suites after documentation-only changes or an unchanged accepted source. When a real failure occurs, inspect the raw report and failing stage, retain the failure, investigate its cause, then run checks justified by the fix. Read [run-phase-four-validation.mjs](tools/run-phase-four-validation.mjs), [cpu-validation-plan.mjs](tools/cpu-validation-plan.mjs) and [validation-stage.mjs](tools/validation-stage.mjs) for the existing failure-preserving orchestration; a future Phase 5 runner needs its own frozen source/workload manifest.

## 8. Long jobs, status and durable evidence

The user explicitly prefers launching long jobs and returning when they finish. Follow repository AGENTS.md:

1. For multi-minute browser/CPU/hosted jobs, launch a persistent background process or hosted run and confirm startup. On Windows use `Start-Process -WindowStyle Hidden` for background helpers. Use checkout-local compatible Node if needed; accepted runs used Node 24.12.0/pnpm 10.32.1. Prefer `pnpm.cmd` when PowerShell blocks `pnpm.ps1`.
2. Record run URL/ID or PID, exact command, candidate commit plus uncommitted snapshot identity, source manifest, isolated paths/ports, log/result locations, original thresholds and the next independent review step in a checkpoint/handoff.
3. Give the user a command to check the active job and name the raw output location. End the turn while it runs; do not poll solely to wait, launch duplicates or promise automatic notification.
4. On the user's next “Done”, check that existing job first. Independently review source identities, all required stages, raw measurements/captures and preserved evidence before declaring success. If another long run is justified by a fix, launch it and hand off again.

Current accepted Phase 4 status command:

```powershell
node tools/phase-four-status.mjs
```

This is read-only and starts no tests. Raw accepted output is `.tools/phase-four/p4-9/progressive-integration-5/result.json`; logs and per-stage reports are in that directory. The current active pointer refers to this finished run, not a new Phase 5 job. Add/update a phase-appropriate status command or active pointer when new validation starts, and tell the user exactly how to check it.

The short existing documentation audit is:

```powershell
node .tools/phase-four/p4-9/progressive-integration-5/audit-documentation-follow-up.mjs
```

It verifies the accepted runtime/evidence and writes a dated documentation-follow-up report. It is valid for this documentation-only transition, not after Phase 5 changes the runtime. Do not rerun the original full-source review/publishing scripts against post-review documentation; their original exact-source checks intentionally reject a changed snapshot.

Preserve `.tools` manifests/candidates/reference checkouts/raw reports and published `docs/perf/phase-four` evidence. Ignored files can still be critical validation provenance. Preserve these 14 unrelated user-modified artifacts; do not overwrite, stage, reset or silently adopt them as new references:

```text
docs/perf/phase-two-points-webgl.json
docs/perf/react-profile.json
docs/perf/texture-stability.json
docs/perf/screens/earth-webgl.png
docs/perf/screens/mars-webgl.png
docs/perf/screens/mobile-webgl.png
docs/perf/screens/phase-two-ceres.png
docs/perf/screens/phase-two-europa.png
docs/perf/screens/phase-two-jupiter.png
docs/perf/screens/phase-two-orbits-ceres.png
docs/perf/screens/phase-two-orbits-earth.png
docs/perf/screens/phase-two-pluto.png
docs/perf/screens/phase-two-titan.png
docs/perf/screens/solar-system-webgl.png
```

Local commits should contain only the intended reviewed files and follow the approved plan. This handoff session makes no commit, push, deployment, external provisioning or memory update.

## 9. Accepted limitations and deferred design polish

The user deliberately deferred opinion-based UX design until later implementation. These are recorded in [ENHANCEMENTS.md](docs/ENHANCEMENTS.md), not unfinished Phase 4 gates:

- Orbit lines appear after the initial scene because many-date curve calculations and optional correction requests are background work. A future loading cue/scheduling refinement must preserve fast first paint.
- Neptune's approximately 164.77-year, one-period curve around October 2026 extends past the validated 2100 endpoint. Clipping leaves an open arc. The source interval explains the reported gap, though the exact user screenshot was not reproduced; an unrelated interior gap still merits investigation. Never fabricate a closure or extend scientific validity for appearance.
- Reduced motion changes camera navigation to a short 300 ms fade, suppresses interface transitions and makes Return to LIVE immediate. A stationary planet view need not change; scientific playback and planet rotation continue. System mode follows the OS preference.
- Charon/Io source softness or uneven detail is accepted NASA/USGS source coverage, not permission to synthesize missing detail.
- ADR 0010's scoped upstream astronomy temporary-allocation exception remains accepted. Literal zero allocation is deferred; existing parity, memory and CPU gates still apply.

## 10. Copy-paste prompt for the next session

> Continue TheSpaceTimeContinuum from PHASE_5_HANDOFF.md. Phase 4 is complete and accepted; do not redo its UX sign-off or validations without a new change or defect. Preserve the accepted uncommitted P4.9 source, generated chunks, user artifacts and validation evidence. Read AGENTS.md and IMPLEMENTATION_PLAN.md. Phase 4B's database/ingestion/API foundation is unimplemented and precedes Phase 5 Earth satellites. Inspect the current scaffolds and extendable engine/UI contracts, verify current official provider/library facts, and write a concrete file-level Phase 4B/Phase 5 implementation plan with independent science fixtures, per-object freshness, worker/cache ownership, startup/performance budgets and evidence gates. Ask me focused questions where needed, and obtain my approval of that plan before implementation. For long jobs, launch persistently, record the source/run/log identities and status command, then end the turn so I can return when they finish. Keep later phases and deferred visual polish outside this scope.
