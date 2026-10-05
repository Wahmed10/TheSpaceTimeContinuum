# Phase 4B and Phase 5 file-level implementation plan

Prepared October 5, 2026. Approved October 5, 2026 by the user: "Yes start the plan!" P4B.1 implementation is underway. External services are not provisioned by this approval.

## Baseline and scope

Phase 4 is accepted. The read-only status command confirms its last job finished successfully; do not rerun its acceptance simply to begin these phases. Preserve HEAD `035fc967ed9ba88550773ea8f757fd5ff905d23c` plus accepted uncommitted P4.9 runtime, generated chunks, ignored manifests and all 14 unrelated artifacts listed in the handoff. Never construct a candidate from HEAD alone. Keep the user's development server and root `.next` intact.

Implement Neon/Drizzle persistence, scheduled ingestion, read-only API/search/status, then CelesTrak Earth satellites with independent science validation, worker/cache transport, dynamic engine/UI integration and measured acceptance. Future content tables are schema only. No asteroid, spacecraft trajectory, event/news feature, observer mode, account, redesign or production launch.

## Verified facts and unresolved prerequisites

- [V, October 5] CelesTrak requires one download per GP update (two hours) and immediate cessation on any non-200, including redirects and 50x. Use canonical `https://celestrak.org`, manual redirect handling and a persisted pause across invocations: https://celestrak.org/usage-policy.php . A cron must not retry a paused provider automatically.
- [V] JSON uses OMM field names; redundant EARTH/TEME/UTC/SGP4 fields may be omitted: https://celestrak.org/NORAD/documentation/gp-data-formats.php . Validate supplied values and normalize omitted defaults explicitly. Support six-digit and larger safe integer NORAD identifiers; never parse identity through five-digit TLE fields.
- [V, local] satellite.js 7.1.0, astronomy-engine 2.1.19, Drizzle 0.45.3 and Next 16.3.6 are declared. Pin existing science dependencies. Inspect installed typings/source for json2satrec and propagation errors before implementation; do not use APIs from upstream develop as proof of 7.1.0 behavior.
- [V] Official Drizzle Neon integration/migration guidance: https://orm.drizzle.team/docs/connect-neon and https://orm.drizzle.team/docs/migrations . Select a transaction-capable connection for ingestion and explicit migrations; do not assume separate HTTP queries form a transaction.
- Current group index retrieval timed out. Exact provider group mappings, redistribution/attribution terms, independently licensed reference fixtures and ISS independent reference availability remain explicit P5.1 gates. Do not guess `bright` versus `visual`, GNSS composition or Horizons ISS identifiers.
- Neon connection, GitHub secret access and notification configuration have not been established. Use ignored configuration and redacted diagnostics, never chat credentials. Repository code can be completed without secrets; real persistence/scheduled acceptance cannot be replaced with mocks. External account/resource creation or notification setup requires the user's selected account/configuration.

## Implementation sequence

Every completed step runs `pnpm.cmd verify`; commit only explicitly enumerated intended files after checks pass. Keep accepted uncommitted Phase 4 source separate from newly intended commit contents. Multi-minute checks use persistent isolated candidates and the handoff protocol below.

### P4B.1 — Database foundation

Create `packages/db/src/schema.ts`, `connection.ts`, `config.ts`, `queries.ts`, `seed.ts`, `packages/db/drizzle.config.ts`, and generated `packages/db/migrations/`. Modify `packages/db/src/index.ts`, `package.json`, root `package.json` and `.env.example` for real generate/migrate/seed commands and safe configuration.

Implement every section 15 table, foreign key and index, including pg_trgm/unaccent extension migration. Future tables have no consumers yet. Add explicit provider pause state/reason/resume audit and lease fields, unique snapshot content identity, and query indices. Timestamp columns must preserve source time, ingestion time and element epoch separately. Seed catalog bodies/aliases idempotently in parent-first order. Add `packages/domain/data/spacecraft.json` with traceable curated identities only after source verification; no guessed Horizons IDs or positions.

Create `packages/db/test/schema.test.ts`, `queries.test.ts` and an explicit real-database integration entry point. Exit: clean migration and repeat seed on a disposable Neon development branch; parameterized prefix/trigram queries; transactional rollback and foreign-key tests. Missing credentials are an unmet integration gate, never a passing skip.

### P4B.2 — Provider runner and persistence

Create `packages/ingest/src/config.ts`, `contracts.ts`, `politeFetch.ts`, `scheduler.ts`, `providers/DummyProvider.ts`, and `test/politeFetch.test.ts`, `scheduler.test.ts`. Replace `runner.ts` and extend `index.ts`.

Fetch uses configured contact UA, 30-second timeout, bounded response bytes, single-flight host queue and manual redirects. Any HTTP status other than 200 pauses that host/provider persistently and aborts remaining host requests. Network failures schedule capped exponential backoff without immediate retry; malformed payloads fail without replacing last good data. An explicit operator resume command records acknowledgement. Lease/claim prevents overlapping manual/cron processes; final persistence updates snapshot, run and freshness atomically. Bound raw history to 30 days with a configurable byte/row cap. Dummy provider writes a clearly labeled test snapshot, never satellite data.

Exit: fake-clock/status/timeout/overlap tests and real persistence success/failure/rollback tests prove last-good retention, due scheduling and pause across processes.

### P4B.3 — API, search and status

Create `packages/domain/src/api.ts` for owned Zod DTOs (add Zod to domain), export via `index.ts`; create `apps/web/src/server/apiResponse.ts`, `dataQueries.ts`, `apps/web/src/app/api/v1/objects/search/route.ts`, `objects/[id]/route.ts`, `status/route.ts`, and `apps/web/src/app/status/page.tsx`. Add direct handler tests under `apps/web/test/` and `e2e/data-status.spec.ts`.

Preserve the domain envelope. Validate query length (1–120 characters), supported kinds and limit (1–50), with parameterized SQL and deterministic identity/ranking. Success TTL: search 300s, object 3600s, status 60s; SWR twice TTL. Errors/configuration failures use no-store and sanitized codes. Lazy server-only connections keep planet routes/build usable without credentials. Never show raw database/provider errors publicly. Read installed Next routing/env/cache guides before edits; explicit CDN headers do not imply Next GET handlers are cached by default.

Exit: DTO/header/error tests, genuine 404s, configured real search and `/status` freshness. Planet-only app remains operational without a configured backend.

### P4B.4 — Scheduled end-to-end proof

Create `.github/workflows/ingest.yml`, `docs/DATA_PLATFORM_SETUP.md` and `docs/PHASE_4B_5_CHECKPOINT.md`. Workflow uses `17 */2 * * *`, manual dispatch, least privilege, concurrency, compatible Node/pnpm, secret contact/DB configuration and due runner. No migrations on every cron. Use GitHub workflow failure notifications; verify the account's email configuration rather than claim email delivery from workflow YAML. Do not send a separate email without explicit authorization.

Exit: a real scheduled dummy-provider run persists a snapshot and run, and the configured API/status displays matching freshness. Record run URL, source commit and readback evidence. Manual dispatch is useful verification but does not substitute for the scheduled exit. P5.2 must wait for this exit; independent P5.1 fixture research may proceed meanwhile.

### P5.1 — Satellite contracts, provider mapping and independent fixtures

Create `packages/domain/src/satellites.ts`, `packages/domain/data/satellite-groups.json`, `satellite-curated.json`, `packages/astro/test/fixtures/satellites/`, and `docs/science/SATELLITE_REFERENCES.md`; export contracts via domain index. Verify mappings against current official CelesTrak index before fetching groups; map application layers to one or more verified queries, deduplicate NORAD membership. Stations default; other groups opt-in.

Normalized snapshot: schema version, source ID/URL, optional actual provider source timestamp, fetched/ingested times, group, hash, ordered records and count. Each record preserves identity, UTC epoch, SGP4 elements and metadata. Do not fabricate a feed source timestamp from fetch time or the newest element epoch.

Capture hash/version/license/source URL and generation procedure for Vallado TEME verification states, independently computed frame/velocity states and an ISS epoch reference. Reference cannot be a second call to satellite.js. If no acceptable independent ISS reference exists, record the gap and resolve it before acceptance; do not substitute an unverified Horizons ID.

### P5.2 — CelesTrak persistence/API

Create `packages/ingest/src/providers/CelesTrakProvider.ts`, `test/celestrak.test.ts`, `apps/web/src/app/api/v1/layers/satellites/route.ts`, `objects/[id]/position-source/route.ts`, and satellite API tests. Extend registry, DB queries and seeds. One bounded JSONB snapshot per group/content update; repeated identical downloads update fetch/run bookkeeping without redundant snapshots. Curated/brightest persistent objects and aliases only; bulk populations remain snapshot records.

Exit: ≥2h schedule/host pause, validation, stable hashes/order, atomic update, bounded history and real API readback. Satellite TTL 1800s with stale envelope and ETag; missing snapshot returns an honest unavailable response. No browser provider requests.

### P5.3 — Pure SGP4 and physical frames

Create `packages/astro/src/satellites/Sgp4Provider.ts`, `prepareRecords.ts`, `batch.ts` and tests `sgp4.test.ts`, `satellite-frames.test.ts`; export through astro index. Reuse accepted UTC/TDB conversions and existing TEME_EARTH frame including equation of equinoxes. Pure modules contain no DOM/network/React/Three.

Prepare satrecs once per snapshot. Evaluate requested UTC corresponding to TDB; output float64 km/km/s, explicit frame, status and element age. Document velocity frame transform, including time-varying rotation where required. Selected provider returns canonical state through the accepted frame tree. Fail each object independently for malformed/decayed/nonfinite/out-of-range output, with no carried-forward state.

Proposed policy: warn at absolute element age >3 days; hide at >30 days, symmetric past/future. These are product validity limits, not guaranteed physical error bounds. Exit: Vallado ≤1e-3km, independent LEO frame ≤0.1km and ISS ≤5km at matching epoch, plus direction/origin/velocity/time checks.

### P5.4 — Worker, ownership and client cache

Create `apps/web/src/engine-bridge/satellites/Sgp4Worker.ts`, `workerClient.ts`, `snapshotCache.ts`, `batchWindow.ts`, and tests for cancellation/cache/interpolation. Add pinned Comlink to web only and update lockfile. Lazy-load worker/astro satellite path after first scene paint.

Worker owns separate transferable buffers: Earth-relative float32 six-state display values plus validity flags; selected state remains float64. Requests/replies carry generation, snapshot hash, ordered identity version and t0/t1. Keep at most one active request and one latest desired request, two recyclable windows, and no retained/transferred engine-owned buffers. Discard superseded date/group/source replies. Maximum 10,000 desktop / 2,000 mobile points, deterministic importance/NORAD truncation and selected-object retention.

Schedule 2Hz desktop/1Hz mobile, paused when hidden. Simulation windows cannot exceed one simulated second until independent interpolation error tests justify another bound. Interpolate only within valid bracketing epochs with both endpoints valid; never extrapolate stale windows. Fast playback/jumps request the latest window and hide missing satellite states while planets continue. Two-hour IndexedDB cache expires by fetch time; proposed total cap 16MiB with version validation/LRU and corrupt-entry removal. Expired offline cache yields unavailable satellites, not fresh claims.

Exit: endpoint/midpoint accuracy, large date/rate/source/group races, invalid flags, transfer recycling, bounded allocations, disposal, migration/corruption/offline tests. Measure propagation and both-window cost separately; two epochs are not a single-epoch benchmark.

### P5.5 — Engine point/selection/orbit integration

Create `packages/engine/src/layers/SatellitePointSource.ts`, `SatelliteOrbit.ts`, `test/satellites.test.ts`; modify `EngineApi.ts`, `SpaceEngine.ts`, `scene/EntityRegistry.ts`, `layers/LayerRegistry.ts`, `layers/SourcePointLayer.ts` and public exports only as needed for tested dynamic metadata/list/picking/follow support.

PointSource.update remains synchronous, copies only current valid data into engine-owned float64 outputs, returns active prefix and sets invalid point sizes to zero. Registration membership/order are fixed: remove/re-register on replacement. Reuse camera-relative point rendering, Earth band visibility/group colors and public selection APIs. Selected object remains available when its bulk group is off, with documented selected-only registration. Orbit samples one period behind/ahead within validity; future dashed, no fabricated closure. Dispose sources/workers/buffers/orbits on removal/unmount.

Exit: dynamic list/picking/focus/follow/parent transforms and removal tests, float32 transfer-to-render accuracy, no origins/ghost points, no mesh per satellite.

### P5.6 — Consumer integration

Create `apps/web/src/engine-bridge/satellites/SatelliteController.ts`, `apps/web/src/lib/entityRoutes.ts`, `satelliteSearch.ts`; modify `EngineCanvas.tsx`, `useEngineStore.ts`, `RouteStateBridge.tsx`, `routeStateController.ts`, `objectSnapshot.ts`, `lib/routeState.ts`, `catalogSearch.ts`, `formatEntity.ts`, `components/search/EntitySearch.tsx`, object card/metrics/provenance/mobile components, Objects in view and layer controls, object dynamic page and about/data page. Determine the existing list/control filenames during this step before editing and record them in the checkpoint.

Canonical route is `/object/sat/25544`; iss and 25544 share stable identity. Resolve dynamic SSR metadata/404s without converting the static 21-body catalog into a fake satellite catalog. Local results remain immediate; debounced/cancellable server results merge by ID and preserve active keyboard option. Selection retains a curated object with group off. Cards distinguish feed freshness, element age and requested date; show NORAD/COSPAR, altitude, speed, period, source and propagated wording. Do not call propagation from React render. Maintain ≤4Hz whole-Explore observation and existing URL/history ownership.

Exit: refreshed deep links, Back/Forward/share, ISS search, mobile sheet/keyboard, selected-only group-off behavior, provider pause/offline and genuine unknown satellite 404.

### P5.7 — Failure coverage

Create `e2e/satellites.spec.ts`, `satellite-failures.spec.ts`, `satellite-accessibility.spec.ts` and focused race tests. Prove worker/API late replies, source changes, expired/corrupt cache, provider pause, decayed objects, date validity and interpolation-boundary behavior. Fixture-driven browser tests are reproducible and labeled; real source integration evidence remains separate. Preserve failures and inspect raw reports before reruns.

### P5.8 — Frozen acceptance and handoff

Create `tools/run-phase-five-validation.mjs`, `phase-five-status.mjs`, `benchmark-satellites.ts`, `docs/perf/phase-five/` reviewed evidence and final handoff. Adapt existing failure-preserving validation orchestration; freeze complete working source and provenance manifest, isolate build output/ports, preserve all original gates.

Run `pnpm.cmd verify`, build, targeted/full browser suites and three predeclared sequential same-machine core CPU pairs against immutable Phase 2 reference `4409ef5d8f97299d9058360c97d560493d067c1c`. Retain each path/pair mean and p95 ≤+20%, 21-body core workload; add satellite workload separately. First painted frame ≤2500ms desktop/5000ms simulated 4G; startup ≤1.5MB, engine gzip ≤450KB, shells ≤200KB, assets ≤80MB, uncached desktop date jump ≤1000ms, HIGH p95 ≤16.7ms, UI ≤4Hz, existing science/material/memory/accessibility thresholds unchanged.

Satellite benchmark: 10,000 desktop single-epoch propagation <20ms proposed target, 2Hz end-to-end batches measured separately; 2,000 mobile at 1Hz with actual device/thermal limits stated. Publish population, element/source identity, date, device/library, warmup/sample count, mean/p95/max, failures, transport/copy/interpolation/frame costs and memory. Do not pass the assumed throughput target by relabeling samples or dropping failures. User review covers changed satellite UX; Phase 4 review stays closed.

## Long jobs and status

Use hidden persistent background processes or hosted runs; launch and confirm startup, record command/PID or URL, commit plus full snapshot hash, log/result path and next independent review in `docs/PHASE_4B_5_CHECKPOINT.md`, then end the turn. New local pointer `.tools/phase-five-active-job.txt`; read-only status `node tools/phase-five-status.mjs`. Existing Phase 4 pointer remains historical. No duplicate job on resume, no polling solely to wait, no unreviewed pass claims.

## Authorization

The user approved this file-level plan on October 5, 2026: "Yes start the plan!" Continue P4B.1 and subsequent steps within the recorded gates without asking for the same approval again. Provider mappings/reference availability and credentials will be resolved explicitly; unmet real-service/science gates cannot be declared passed. This approval does not authorize production deployment or messages to third parties.
