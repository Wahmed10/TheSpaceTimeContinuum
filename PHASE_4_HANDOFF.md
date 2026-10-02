# Phase 4 handoff: Core Consumer UX

Prepared October 2, 2026 for a fresh agent session in `C:\Users\waqar\Documents\TheSpaceTimeContinuum`.

## 1. Authoritative transition and immediate next action

**Phase 3 is accepted. Phase 4 is ready for planning, and its implementation has not started.**

The user completed the final appearance checks, passed Ceres/Phobos/Deimos, and reported a smudged Charon region. Investigation matched that region to the original NASA map. After receiving that explanation, the user replied:

> Perfect so we are ready for Phase 4. Can you create a very detailed phase 4 handoff docuemnt that I can give to angent in another session!

This closes the remaining Charon source-limitation decision and the Phase 3 appearance sign-off. Keep the limitation documented; it was accepted, not repaired. Do not reopen Phase 2 allocation/device acceptance or Phase 3 rendering acceptance as prerequisites for Phase 4.

This session prepared documentation only. It did not implement Phase 4, launch new tests, provision services, deploy, or push commits. The user previously instructed **not to start Phase 4**; requesting this handoff does not start its implementation.

`IMPLEMENTATION_PLAN.md` remains the scope authority. Its section 0 requires task-level later phases to be expanded into file-level steps and approved before implementation. The next agent should first prepare `docs/PHASE_4_PLAN.md`, using the proposed sequence in this handoff, and present the concrete plan for approval. The requirement comes from the plan, not an additional approval rule invented for this handoff. If the next session already supplies approval of that concrete plan, proceed within that authorization without asking again.

Read this document as the current phase-transition authority. `PHASE_3_IMPLEMENTATION_HANDOFF.md` retains the detailed completed renderer history. Older root handoffs and historical pending-gate paragraphs do not override the acceptance recorded here. The README was refreshed to point here.

## 2. First-session checklist

1. Read root `AGENTS.md`, this handoff, and `IMPLEMENTATION_PLAN.md` sections 0, 8–13, 19–20, 22–24, 28, Phase 4, Phase 4B, and section 31.
2. Read `apps/web/AGENTS.md` and relevant **installed** Next.js guides before app code edits. The dependency is Next `16.3.6`; do not assume older router, metadata, params, or Suspense behavior.
3. Inspect `git status --short`, `git log -8 --oneline`, and relevant source files. Preserve the unrelated generated performance edits listed below.
4. Check `node tools/phase-three-status.mjs` once if confirming old job state. It selects a **finished, reviewed** job; do not launch it again.
5. Check the current dev server before launching another one. It responded HTTP 200 on port 3000 during handoff preparation. Process IDs are historical identifiers that must be checked again, not permanent identities.
6. Expand and submit the Phase 4 file-level plan. Identify URL/state ownership, route lifetime, accessibility, performance evidence, and unsupported future data explicitly.
7. After plan approval, implement the first step and complete its appropriate checks. Do not silently expand into Phase 4B or Phase 5.

Useful startup commands, from the repository root:

```powershell
git status --short
git log -8 --oneline
node --version
pnpm.cmd --version
node tools/phase-three-status.mjs
```

Verified environment at handoff: Windows PowerShell, Node `v24.12.0`, pnpm `10.32.1`. Use `pnpm.cmd` when PowerShell blocks `pnpm.ps1`. Existing dependencies are installed. A fresh installation should use the committed lockfile and `pnpm.cmd install --frozen-lockfile`; do not upgrade packages as part of phase startup.

Relevant pinned runtime dependencies: Next `16.3.6`, React/React DOM `19.3.0`, Three `0.186.0`, astronomy-engine `2.1.19` with the pnpm patch, Zustand `5.0.15`, MiniSearch `7.2.0`. Radix Dialog/Popover are already installed. Dependency manifests and the lockfile are authoritative if a later session changes them.

## 3. Completed foundation and accepted evidence

### Phase 2 decisions remain closed

- Accepted Phase 2 reference: `4409ef5d8f97299d9058360c97d560493d067c1c`.
- ADR 0010 permits remaining temporary state/time/intermediate objects inside the pinned, optimized `astronomy-engine@2.1.19` dependency. Literal zero allocation is **not achieved**, and remains an accepted deferred enhancement.
- Keep the pnpm patch, exact upstream parity fixtures, first-party output-buffer contracts, retained-growth checks, and existing scientific tolerances. After-GC retained heap growth does not prove zero transient allocation.
- The user accepted documented Phase 2 device coverage. Do not request more Phase 2 device runs simply because another session begins.

### Phase 3 delivered behavior

- All **21 catalog bodies** render: Sun; Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune; Pluto and Ceres; Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Triton, Charon.
- Saturn has sourced ring dimensions, radial opacity/color, analytic planet-to-ring and ring-to-planet shadows, forward-scattering approximation and a LOW fallback. Ring geometry survives quality/LOD changes.
- Giant planets have atmosphere rims; Venus has opaque clouds; Titan has opaque haze. The original Sun/Earth/Moon/Mars materials and visual references are preserved.
- Licensed source maps include colored Galilean mosaics, New Horizons Pluto/Charon, and NASA Ceres/Triton. Phobos/Deimos use sourced irregular meshes and matching UV atlases.
- Ten missing Ceres/moon scientific attitudes were implemented and checked against independent CSPICE fixtures. Six planetary moon systems pass True/Explore interaction checks.
- The geographic audit separately corrected Ceres/Charon map offsets and Phobos/Deimos source model frames. It verifies gross pole/longitude/seam registration, not survey-grade cartography.
- Hidden or point-LOD bodies skip unnecessary detailed attitude/material/geometry work until visible. This was needed to pass the unchanged CPU regression gate. Do not remove that optimization during UI refactoring.
- A separate lab button downloads all-body Phase 3 device reports. Lab helpers remain outside the application `EngineApi`.

### Evidence ledger

These are reviewed existing results, not tests rerun while creating this handoff.

| Evidence | Source / location | Reviewed outcome and limits |
|---|---|---|
| Final full Phase 3 regression | `f74242aa1c8971b2ffa23da51b477a057b26a1f6`; `docs/perf/phase-three/validation-final.json`, `browser-final.json`, `build-final.log` | 29 browser tests and production build pass; 77 new captures reviewed; original material references pass |
| Strict paired CPU comparison | `.tools/cpu-phase-three/retry-2`; `docs/perf/phase-three/cpu-final-comparison.json`, `cpu-regression.md` | Candidate `f74242a` vs accepted Phase 2 `4409ef5`, sequential on the same machine; all five paths below unchanged 20% mean/p95 limit; largest increases 13.33% / 10.53% |
| Lab report generation | `749a506ac1a04af91920201a4900b061fd4fcf50`; `device-validation.json`, `device-browser.json`, `device-software.json` | Six browser tests/build pass; complete 24-view report and settings restoration verified; local SwiftShader functional evidence |
| User laptop | `docs/perf/phase-three/device-laptop-webgpu-high.json`, `device-laptop-review.md`, `device-laptop-webgpu-high-review.json` | HIGH/WebGPU, 24 views, 240 samples/view, worst p95 6.20 ms; maximum 36 draws/three detailed meshes; precision 0.107680 px; 11/11 depth probes |
| Geographic corrections | `b277fce110f80ea1728f4d4d0e43f0ad64493181`; `docs/science/surface-registration-audit.md` | 131 unit tests plus two expected rejected-model diagnostics, typecheck/lint/boundaries, asset/license checks pass |
| Corrected runtime regression | `.tools/surface-audit/regression/result.json`; `docs/perf/phase-three/surface-audit-validation.json`, `surface-audit-browser.json`, `surface-audit-build.log` | 17 browser tests, zero failures/skips/flakes/report errors; production build pass; 60 new captures reviewed |
| Corrected precision/storage | `surface-audit-precision.json`, `surface-audit-texture-stability.json` | 0.134356 px against 0.5 px; all 11 depth probes; LOW compressed mip storage 16,516,088 bytes, 33 textures before/after 20 focus changes |
| Final user appearance acceptance | October 2 conversation and updated checkpoint/audit | Ceres/Phobos/Deimos pass; original-source Charon blur accepted after investigation; Phase 3 closed |

The laptop adapter name is blank. The user identifies it as their physical laptop, and the report identifies WebGPU/HIGH; **no particular GPU model is established**. Its JSON does not embed a revision. The device lab/runtime was unchanged from validated `749a506` when reviewed; the later cold-path registration changes have separate local functional evidence. Do not claim the laptop reran those later corrections.

Local browser suites use **SwiftShader WebGL2**, not a physical GPU. CPU frame timing includes engine work/render submission, not GPU execution. Compressed mip storage is not total VRAM. Device statistics cover the observed RAF sample window, not a sustained thermal test. No new mobile or physical forced-WebGL2 results are claimed.

Important revisions: `03cd6f7` is the last pre-handoff documentation commit, recording the Charon investigation. `b277fce` is the latest runtime correction. The acceptance/handoff commit follows `03cd6f7`; use `git log` for its final hash. No hosted Phase 3 validation or deployment is claimed.

## 4. Accepted limitations and user preferences to preserve

| Topic | Decision / limit |
|---|---|
| Io softness | Remaining blurry/smudged patches are accepted for now and tracked in `docs/ENHANCEMENTS.md` |
| Charon softness | The reported smudged region is already present in the original 12693 by 6347 NASA basemap, before resizing/KTX2 compression. Uneven spacecraft coverage cannot be repaired by publishing more pixels. User accepts this limitation; do not fabricate terrain or mark it fixed |
| Charon missing south | Neutral fill represents unobserved terrain; it is separate from the observed low-resolution region |
| Ceres color | Its muted/gray appearance is accepted. Do not substitute enhanced spectral false color and call it natural color |
| Other Galilean maps | The user prefers the sourced colored variants over grayscale and has accepted their appearance |
| Irregular shapes | User explicitly wants irregular meshes whenever a body's physical shape warrants them and suitable sourced data exists. Preserve Phobos/Deimos shapes and atlases |
| Surface registration | Coarse independently verified geographic mapping; finer control-network accuracy/model generation differences remain enhancements |
| Atmospheres/clouds | Illustrative atmospheric rendering; physical pole/rotation correctness does not establish measured cloud-feature tracking |
| Allocation | ADR 0010's exception remains accepted; do not broaden it or claim literal zero allocation |
| Temporary screenshots | Inspect newly supplied images, then delete the inspected temporary pictures as requested. Do not archive the user's temporary screenshots. The latest Charon screenshot was removed; `temp-pics` was empty afterward |
| Phase boundaries | Finish the authorized phase and provide durable evidence/handoffs. Do not start a gated later phase on your own |
| Long jobs | Launch persistently, record ID/logs/next step, then end the turn; do not spend turns polling or waiting |

The Charon investigation and original-source SHA256 are in `docs/science/surface-registration-audit.md`. Source provenance is retained in `docs/licensing/`; asset credits are in `assets/ASSET_LICENSES.md`. Source replacement is future work, not a Phase 4 prerequisite.

## 5. Phase 4 scope and explicit boundaries

The exact Phase 4 heading is **Core Consumer UX**. Its tasks in `IMPLEMENTATION_PLAN.md` are:

1. Routing (`/object/...`, `/event/...`), query-state synchronization and OpenGraph metadata.
2. Universal search UI: `/` shortcut, combobox, keyboard navigation; client MiniSearch now, server search in Phase 4B.
3. Compact object card, mobile bottom sheet, progressive More details and provenance.
4. Layers popover; quality/reduced-motion/distance-unit settings; shortcuts help; accessible Objects in view list.
5. Nearly full-screen Explore shell: logo/search at top left, layers/settings at top right, bottom-center time bar, and a Happening now drawer placeholder until Phase 8.
6. Deep-link restoration, browser back/forward and mobile emulation tests.

The phase exit is section 31 acceptance items **1–8 and 16–19 demonstrable with planets only**. The existing catalog includes moons/dwarfs; preserve and test them too. This scoped exit does not mean later satellite, spacecraft, asteroid, event or news datasets suddenly exist.

**Phase 4B is a separate later phase:** Neon/Drizzle schema/migrations, environment/secrets, scheduled ingestion, polite provider fetching, API scaffolding/status, server search. `packages/db` and `packages/ingest` remain skeletons. Phase 4 requires no database, external provider keys or ingestion job.

Phase 5 supplies satellite ingestion/SGP4; Phases 6/7 add asteroids/spacecraft; Phase 8 supplies events; Phase 9 supplies news/discoveries. Do not create fake live objects, fabricated events, mock news presented as real content, or direct browser requests to NASA/JPL/CelesTrak to make Phase 4 appear complete.

For `/event/[id]`, prepare a route/state integration boundary with honest unavailable/not-found behavior until actual event records exist. Do not build the Phase 8 event pipeline. Test fixture events may be used within tests only, clearly isolated from production content.

The plan's Happening now placeholder must be visibly honest and lightweight. Its exact empty-state copy/layout belongs in the approved Phase 4 plan. Avoid an always-open empty drawer obstructing the map, especially on mobile.

## 6. Current source map and concrete UX gaps

### Existing source files

| File | Current responsibility |
|---|---|
| `apps/web/src/components/Explore.tsx` | Large client component containing shell, substring search dialog, object card, settings/layers, timeline, help, metrics and share action |
| `apps/web/src/engine-bridge/EngineCanvas.tsx` | Lazy engine startup, per-mount canvas ownership, URL initialization, subscriptions, resize/lifecycle and one compatibility retry |
| `apps/web/src/engine-bridge/useEngineStore.ts` | Zustand engine reference and selected ID/clock/perf/quality/scale/following/error/ready state |
| `apps/web/src/engine-bridge/timeCommands.ts` | UTC-to-TDB command adapter; keeps astro math out of UI components |
| `apps/web/src/app/page.tsx` | Root Explore page |
| `apps/web/src/app/layout.tsx` | Root document and static metadata |
| `apps/web/src/app/globals.css` | Existing shell/dialog/card/timeline/mobile styling |
| `apps/web/src/app/about/data/page.tsx` | Existing source/attribution page |
| `apps/web/src/components/PhaseOneLab.tsx`, `apps/web/src/app/lab/*` | Existing diagnostics and React profiling wrapper; preserve their operation |
| `packages/domain/src/types.ts`, `schemas.ts` | `MapState`, entities, provenance, Zod contracts; current frame validation is only a bounded string |
| `packages/domain/src/catalog.ts`, `data/bodies.json` | Validated static 21-body catalog and aliases |
| `packages/engine/src/EngineApi.ts`, `index.ts` | Public v1 application API and exports |
| `packages/engine/src/SpaceEngine.ts` | Engine creation, commands/events, physical metrics and partial MapState support |
| `packages/engine/src/layers/LayerRegistry.ts` | Available/requested/loaded/visible layer state and asynchronous restoration |
| `packages/engine/src/scene/EntityRegistry.ts` | Runtime entities/physical state; do not import into UI |
| `tools/check-boundaries.ts` | Enforced package and UI/engine import boundaries |
| `e2e/catalog.spec.ts`, `mobile.spec.ts`, `poc.spec.ts`, `react-profile.spec.ts` | Existing UI/catalog/mobile/React regression coverage |
| `playwright.config.ts` | Single-worker local browser harness, SwiftShader flags, dev-server reuse |

### Gaps verified during handoff preparation

- There are no `/object/[kind]/[slug]` or `/event/[id]` app routes yet. The current page is `/`; root metadata is static.
- The share button copies a root query URL with `focus`, `scale`, `t` and `layers`. It does not provide ongoing query synchronization, canonical object routes, frame/view state, or browser popstate restoration.
- Startup reads `focus`, optional `t`, `scale=true`, and only four body/orbit layer IDs. It also reads `renderer`, `test`, `perf` and lab `scenario`. Invalid `t` currently reaches engine startup conversion; Phase 4 should validate external state before that stage.
- Search uses substring filtering of names/aliases and a dialog of buttons. MiniSearch `7.2.0` is installed but is not used here. The input's ArrowDown focuses the first result; a complete active-option combobox contract is missing. Search assistance still incorrectly says four worlds.
- The card incorrectly labels most non-star/non-moon bodies TERRESTRIAL PLANET, including giants and dwarfs. More details and basic provenance exist, but need consistent type, source/method/certainty and time wording.
- Local UI layer state is initialized from the engine once. Selection/quality/scale/URL changes need a consistent source of truth rather than independent optimistic values drifting apart.
- Quality is displayed with an uncontrolled `defaultValue="auto"` select; reduced-motion and units are component-local. System reduced-motion preference is not initialized here.
- Distance metrics honor units, but speed is always shown in km/s and detailed radius text stays km. Decide a consistent, explicitly labelled unit presentation.
- A help dialog and polite selected-object announcement already exist. An Objects in view accessible list is absent. Do not assume the engine's DOM label pool is that list; those visual labels are aria-hidden.
- The shell still includes a large intro, destination shortcuts and architecture-preview copy. Refine it to the Phase 4 layout while preserving the user's accepted visual scene.
- The current date picker starts with a hard-coded date string while the actual clock may be LIVE or a shared date. Synchronize its edit/display behavior without pushing per-frame React updates.
- Compatibility links use bare `?renderer=webgl`, which drops shared state. Preserve the meaningful map state when offering a fallback.

These are findings for the next execution plan, not changes already made.

## 7. Architecture contracts the next implementation must preserve

### Engine/UI separation

- React owns UI state and the routing shell. The framework-free engine owns its frame loop, camera, physics, GPU objects and rendering.
- UI consumes public `EngineApi` from `@space/engine`. No deep imports, `.cameraController` access, Three imports outside the engine, or astro calculations inside `apps/web/src/components`.
- `EngineApi` includes select/focus/follow/back, get/apply MapState, layers/scale/quality/reduced motion, getMetrics/getEntity, clock, subscriptions and lifecycle. Keep API v1 compatibility.
- Lab-only `diagnostics`, reference camera helpers and benchmarks must not become application dependencies. If the accessible list or route synchronization needs missing state, add a small public, documented cold/throttled query or event contract with tests.
- Subscribe once, unsubscribe on cleanup, and guard asynchronous initialization against disposed/obsolete mounts. Preserve per-mount canvas ownership, late-startup cleanup and the existing single fallback retry.
- Components must never subscribe to RAF for metrics, routing or list updates. UI/clock/perf updates stay throttled. React profiling remains at or below the existing four commits/second gate during accelerated playback.

### Physical and display state

- Physics: float64 km/km/s, ICRF-aligned SSB state, TDB seconds since J2000. UTC is the user-facing date/time representation.
- Camera-relative conversion happens after float64 subtraction; display scale never changes physical coordinates or object-card measurements.
- Keep the 1900–2100 clock range, reverse and all eight existing speed magnitudes: 1, 10, 60, 100, 3600, 86400, 2629800, 31557600.
- `getMetrics` currently provides Sun/Earth distances, SSB speed, radius and catalog certainty. Do not imply the speed is heliocentric if the calculation remains SSB.
- Body source dates, texture acquisition dates, simulation time and provider freshness are different concepts. Do not invent an updated-at timestamp for a bundled analytic ephemeris.

### MapState support is currently partial

The domain type permits `t`, `focus`, `secondary`, `frame`, `layers`, `scale`, playback and camera presets. The current engine behavior is narrower:

- `getMapState()` returns focus, optional non-LIVE time, scale and requested layers. It does **not** return frame, view preset, secondary, follow mode or full playback state.
- `applyMapState()` applies time/LIVE, scale, layer restoration, focus and playback rate. It only distinguishes a `wide` camera preset. It does **not** apply frame, secondary, fit-both or playback endpoint scheduling.
- `applyMapState()` focuses with the default transition; it has no explicit startup transition option. The present startup code separately uses `focus(..., {transition:false})`.
- Layer restoration is asynchronous internally. Do not treat a returned void call as proof all requested resources have settled.
- `LayerRegistry.enabledIds()` means requested on, including currently unavailable definitions; it does not mean visible or loaded. Unknown restored IDs are ignored by the registry.

The Phase 4 plan must resolve the frame/view URL requirements honestly through supported public commands or a bounded extension. Do not serialize a field, ignore it on load, and claim round-trip restoration. Future event-only secondary/fit-both/playback-window features can remain deferred with a documented contract; do not broaden Phase 4 to implement all Phase 8 behavior.

## 8. URL, routing and persistence decisions to make explicit

The following are proposed implementation requirements derived from section 20. Final filenames and policy details should be set in the approved plan.

### Canonical representation

- Use `/object/[kind]/[slug]`, e.g. `/object/planet/mars`, `/object/moon/europa`, `/object/moon/charon` and `/object/dwarf/pluto`. Charon's catalog ID is `moon:charon`.
- Resolve the route to a validated catalog ID; route labels and domain ID prefixes need an explicit mapping for future kinds (`sb`, `sat`, `sc`). Do not infer arbitrary IDs from unchecked URL strings.
- Keep legacy root `?focus=planet:mars` links working. Define route-versus-query focus precedence, ideally canonical route focus wins, and test it.
- `t` is ISO UTC with explicit offset. **Absent means LIVE.** A supplied valid fixed date restores that date; define its initial paused/playing policy instead of silently starting time travel.
- `layers` is a bounded comma-separated list of known IDs. Preserve the distinction between absent (defaults) and empty (all off). Define deterministic ordering/deduplication.
- `scale` is `explore|true`. Public frame aliases are `earth|helio|earth-fixed`; map them to actual supported engine frame behavior, not just arbitrary strings.
- `view` is a semantic preset (`close|wide`), not exact camera floats. Do not put azimuth/elevation/distance on every orbit movement into the URL.
- Friendly aliases such as `/mars` are a convenience task; define whether supported aliases are included in Phase 4 and use known catalog mappings.
- Preserve lab flags for local tests as needed. Public share links should not accidentally retain test/scenario/perf debug flags. A deliberate compatibility link may retain `renderer=webgl` without losing object/time/layers/scale.

### Validation and normalization

- Validate bounded query length, ISO dates, actual calendar values, supported date range, ID syntax/catalog membership, enum values and layer IDs before engine startup.
- Define handling of repeated keys, malformed percent encoding, unknown IDs, conflicting route/query focus, duplicate/unknown layers and unsupported future kinds. Use a safe fallback or useful not-found state; do not crash renderer initialization.
- Use a shared pure parse/serialize/normalize module with semantic round-trip tests. Prefer one source of parsing rules over separate startup/share/popstate implementations.
- Protect the displayed UTC interpretation from the browser's local timezone. Test non-UTC browser contexts and range boundaries.

### State synchronization and history

- User selection creates a meaningful history entry; debounced meaningful state changes use replace, following the plan's 500 ms guidance.
- Do not write URLs on every clock tick or every camera frame. Capture fixed time on explicit date/share actions with a clear policy for playing time; LIVE must not acquire a frozen timestamp accidentally.
- Handle direct entry, reload, client navigation, Back and Forward. Prevent URL-to-engine-to-URL feedback loops and stale engine initialization overwriting the requested route.
- Restore UI controls and card state from the same accepted state used by the engine. Test rapid selections while the renderer is still starting.
- Browser history and `engine.back()` are different mechanisms. Specify how Previous view/Backspace behaves once route history exists; prevent double pops or unexpected browser navigation.
- Retain one canvas/engine across ordinary object navigation where practical. If choosing remounting, justify it and test cleanup, stale subscriptions and repeated resource loads. Persistent rendering is preferable to expensive teardown on each object click.
- Search/dropdown/card interactions must remain operable when a focused body's layer is off. Define whether focus enables that layer or explains its hidden state.

### Server metadata

- Server pages can read the static catalog and produce object-specific title/description/OpenGraph metadata without starting the engine or importing WebGPU code.
- Metadata must match the resolved object; unknown slugs return useful not-found behavior. Do not publish invented live distances or provider timestamps.
- Use installed Next.js metadata/dynamic-route docs. Test route HTML/metadata in a production build, not only hydrated client DOM.
- A deployed canonical origin is not provisioned by this phase. Make any metadata base configurable rather than asserting a deployment URL that does not exist.

## 9. Proposed file-level sequence for the Phase 4 execution plan

This is a detailed starting outline, **not an approved implementation plan**. Existing files above are real; names below labelled new/proposed do not exist yet. Adjust them after reading current code and installed Next docs.

### P4.1 — State contract and URL codec

Existing: domain `types.ts`/`schemas.ts`; engine `EngineApi.ts`/`SpaceEngine.ts`; bridge store/startup. New/proposed: a pure web route-state module under `apps/web/src/lib/`, plus focused unit tests.

Define normalized URL state, route IDs, UTC validation, precedence, defaults, empty layers, semantic presets and compatibility flags. Document actual frame support and any minimal public engine additions. Keep parser/serializer independent from rendering. Test invalid input and semantic round trips before connecting it to initialization.

Acceptance: valid 21-body links normalize deterministically; malformed inputs do not reach startup as unchecked data; absent date stays LIVE; no physics/provider/asset changes.

### P4.2 — Object routes, metadata and navigation lifetime

Existing: root `page.tsx`, `layout.tsx`, `Explore.tsx`, `EngineCanvas.tsx`. New/proposed: `app/object/[kind]/[slug]/page.tsx`, route-level not-found handling, `/event/[id]` boundary and a shared Explore shell/layout if needed.

Implement known-object resolution, legacy root links, honest unsupported-event behavior, object metadata and stable renderer ownership during navigation. Consult Next docs before choosing layouts/navigation APIs. Keep server metadata free of engine imports.

Acceptance: direct object entry and refresh restore the correct body; unknown route gives a useful response; metadata matches object; navigating multiple bodies does not leave multiple canvases or old engines alive.

### P4.3 — Query synchronization, sharing and history

Existing: bridge initialization/store and share handler. New/proposed: route-state bridge/hook under `engine-bridge/`.

Use the codec for initial load, share, state changes and popstate. Apply bounded state after engine readiness, synchronize controls, prevent loops, debounce meaningful replacements and push selection changes. Preserve fallback URLs. Define the relationship between browser Back/Forward and the existing camera history.

Acceptance: target/time/layers/scale and implemented frame/view choices survive share/reload/Back/Forward; no clock-tick history flood; rapid startup navigation respects the latest route; clipboard failure shows an accessible usable URL.

### P4.4 — Search combobox

Existing: MiniSearch dependency, static catalog, search UI. New/proposed: `components/search/EntitySearch.tsx` and pure catalog index helper.

Index all current IDs/names/aliases, deduplicate by ID and rank exact/prefix matches predictably. Keep a typed local search boundary that can merge server results in Phase 4B later. Implement a proper labelled combobox/listbox active-option model, keyboard navigation, Enter/Escape, empty results, touch selection and focus restoration. Maintain the existing `/` shortcut without interfering with text editing.

Acceptance: Mars/Europa/Pluto/Charon/aliases are found quickly; local target is under 16 ms where measured; interaction stays under the section 31 300 ms requirement. No fictional ISS/Voyager results before those datasets exist. Test keyboard and touch behavior, rather than only result counts.

### P4.5 — Compact object card and provenance

Existing: card/metrics in Explore, public `getMetrics`/`getEntity`, catalog provenance. New/proposed: `components/objects/ObjectCard.tsx`, formatting/type-label helpers.

Correct classifications; show actual physical distances, speed reference, size and period where available. Add progressively disclosed details and consistent source/method/certainty/simulation-time wording. Use a compact desktop card and operable mobile bottom sheet with documented snap/collapse behavior. Keep dynamic metrics throttled and read-only.

Acceptance: cards work for star/planet/moon/dwarf, computed/approximate sources, unavailable metrics and units. Details do not claim live telemetry, invented freshness or measured missing terrain. Closing/following/refocusing works through public commands, with correct focus behavior and no stale card after history restoration.

### P4.6 — Shell, layers, settings, help and timeline

Existing: Explore, global styles, timeCommands/store; new/proposed extracted shell/control components as useful.

Apply the specified full-screen layout and reduce default clutter. Source layer names from known definitions, showing unavailable future layers honestly. Keep quality request and actual adaptive tier distinct. Initialize reduced motion from the system preference and allow an explicit override; decide local settings persistence and tolerate unavailable storage. Normalize distance/speed unit labels and expose timeline state accessibly. Add an honest Happening now empty state.

Acceptance: settings agree with engine/URL state; compatibility links retain shared state; all eight rates/reverse/pause/LIVE/date bounds work; no hover-only actions; narrow screens, safe areas and open keyboard do not hide essential controls. Define and evidence the plan's maximum six persistent controls rather than hiding the count inside arbitrary groups.

### P4.7 — Objects in view and accessibility integration

Existing: selection live region, canvas instructions, label pooling, input/help components. New/proposed: an accessible object-list panel and a minimal public visibility snapshot/event if needed.

Define whether Objects in view means on-screen and unoccluded, frustum-visible, or a bounded available list; label it honestly. Current public API does not provide that list. Do not import EntityRegistry or call lab diagnostics from production UI. Update the list at a bounded cadence and offer normal select/focus actions.

Audit shortcut ownership: text inputs, selects, buttons, dialogs, contenteditable regions and canvas must not fight over Space, arrows, Enter, Escape, `/`, Backspace or speed keys. Do not let global playback shortcuts override typing or a dialog's focused control. Preserve visible focus, dialog focus return, semantic labels, selection announcements, contrast and system reduced motion.

Acceptance: keyboard-only search → select → card → time → layers/settings works; accessible list has useful selectable text; reduced motion changes actual transition behavior; automated accessibility checks have no critical issues, with manual checks recorded separately.

### P4.8 — Integrated regression and phase evidence

Existing: `e2e/*`, profiler/lab and budget tools. New/proposed: routing/history/search/accessibility tests, `docs/PHASE_4_CHECKPOINT.md`, `docs/perf/phase-four/` reviewed artifacts.

Run verify/build and the necessary UI/browser/visual/budget checks. Preserve original reference image tolerances and scientific fixtures. Profile the complete Explore subtree at accelerated playback after URL/list/card additions. Review captures and console errors; do not treat a test report alone as visual sign-off.

Acceptance: the approved Phase 4 exit matrix passes within its stated scope. Record source revisions, limitations, local versus physical evidence, missing future data, user review instructions and any jobs still pending. Do not start Phase 4B while closing Phase 4.

Each approved implementation step follows the plan's verify-then-commit discipline. If a check is multi-minute, follow the long-job handoff policy rather than remaining active to wait.

Candidate new browser files for the approved plan: `e2e/phase-four-routing.spec.ts`, `phase-four-search.spec.ts`, `phase-four-cards.spec.ts`, `phase-four-accessibility.spec.ts` and `phase-four-mobile.spec.ts`. These are proposed names only. Locate the existing Vitest configuration before choosing new unit-test directories so the URL/search/formatting tests are actually discovered. Prefer public user interactions and semantic assertions; lab probes are appropriate only for renderer state or resource evidence that the user-facing DOM cannot establish.

## 10. Validation matrix and measurement limits

| Area | Required behavior / useful cases |
|---|---|
| URL codec | Route/query precedence, legacy focus, empty/absent layers, invalid dates, non-UTC timezone, range boundaries, unknown IDs/enums, deduplication and round trips |
| Startup | LIVE root; deep-linked fixed time; high/low compatibility; navigate before ready; invalid input does not turn into fatal graphics error |
| Routing | Object refresh/direct entry; SSR metadata; unknown object/event; client selection; repeated navigation; one active engine/canvas and cleanup |
| History | Selection entries; debounced settings; Back/Forward; no URL writes every frame; explicit camera-history behavior |
| Search | Exact/prefix/aliases; all 21 bodies; correct rank/dedup; combobox aria state; arrows/Enter/Escape; no-result; mobile touch; focus return |
| Cards | Type labels; physical values; SSB speed label; units; optional period; computed/approximate wording; source links; progressive details; follow/close |
| Controls | Four current body/orbit layers; unavailable future layers; settings state restoration; reduced-motion preference/override; reverse/eight speeds/date/LIVE |
| Mobile | Narrow viewport and touch; bottom-sheet states; search keyboard; timeline/layers; orientation/resize; no horizontal overflow; canvas remains usable |
| Accessibility | Keyboard-only complete path; shortcut collisions; visible focus; announcements; labelled controls; Objects in view; automated scan plus manual checks |
| Performance | Initial shell gzip ≤200 KB; lazy engine gzip ≤450,000 bytes; no new React/frame loop; profiler ≤4 commits/sec; navigation long tasks and startup measured with stated protocol |
| Renderer preservation | Original eight references at existing 1.5% tolerance; precision <0.5 px and all depth probes; texture stability, rings/irregular geometry retained |
| Evidence integrity | New output folder, source commit and environment, raw failures preserved, actual capture review, no claim of physical GPU speed from SwiftShader |

Relevant section 22 targets: desktop HIGH ≥60 FPS / p95 ≤16.7 ms; mobile LOW/MEDIUM ≥30 FPS / p95 ≤33 ms; cold first frame ≤2.5 s desktop / ≤5 s mobile; draw calls ≤300 desktop / ≤150 mobile; detailed meshes ≤12 / ≤6. HIGH texture budget is 350 MB, ULTRA 600 MB, mobile 128 MB. Existing memory reports count compressed mip storage only; do not rename that metric total VRAM.

**Current measured engine budget:** 373,142 / 450,000 gzip bytes, leaving 76,858 bytes. **Distributed asset budget:** 79,961,515 / 80,000,000 bytes, leaving only 38,485 bytes. Phase 4 should not need new planetary texture/model assets. Shell JS has its own ≤200 KB gzip target; the existing standalone engine measurement does not establish that shell target. Record a reproducible shell measurement in the execution plan.

For CPU comparison, retain the fail-closed schema/environment checks and unchanged 20% mean/p95 threshold. Last Phase 3 local acceptance compares against `4409ef5`; the current hosted workflow separately measures immutable `1a77315050f0407220cda1237f1284a30afeede1` and candidate sequentially on one runner. Do not silently change a workflow reference, compare incompatible reports or replace a baseline after a failure. Document the required reference/protocol in the approved Phase 4 validation plan.

Section 31 item 4's ISS, Voyager, JWST, asteroid and event searches belong to later dataset phases; Phase 4 demonstrates the mechanism with the current bodies. Item 18 includes news and physical mobile throughput that do not become established by emulated tests. Record the Phase 4 subset precisely. Existing accepted device coverage remains accepted; any new manual request should address changed UX or new evidence, not re-open old gates.

### Commands available now

```powershell
pnpm.cmd verify
pnpm.cmd build
pnpm.cmd exec tsx tools/check-assets.ts
pnpm.cmd licenses:check
node tools/measure-engine.mjs
```

Example browser invocation after the new tests exist:

```powershell
pnpm.cmd exec playwright test --output=.tools/phase-four/regression-1/browser --reporter=json
```

Do not run that multi-minute suite interactively and wait. Put it in a persistent wrapper as described below. It also needs captured stdout/stderr and a result manifest. A unique `--output` protects user downloads in `test-results/`, but **does not redirect hard-coded `docs/perf` screenshot/report writes inside older tests**. Preserve those paths separately before launching or deliberately adapt the tests without discarding old evidence.

Asset/license/bundle tools can regenerate reports/notices. Inspect their diffs and commit only intended, reviewed outputs. A documentation-only handoff does not need to rerun runtime tests; no tests were rerun to create this document.

## 11. Workspace, services and long-job handling

### Working tree at handoff

The following pre-existing generated files are modified outside implementation commits. They were not reset or included in this handoff commit:

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

Older pre-suite backups exist in `.tools/phase-three-full/perf-before/`; the geographic suite has its own `.tools/surface-audit/regression/perf-before/`. Preserve `test-results/` user downloads. Use explicit git paths; do not stage everything, hard-reset, clean the repo or overwrite unrelated evidence.

`.tools/`, `test-results/`, source images under `assets/source/`, logs and `.env*` are ignored. Another session in this same checkout can use them; another machine needs the committed evidence under `docs/perf/` and may need to reacquire ignored tooling/source assets. Do not assume every cached `.tools` file exists after cloning.

### Dev and reference servers

- User dev site: `http://localhost:3000/`; handoff preparation verified HTTP 200.
- Historical root launcher: cmd PID **3640**, started September 27. Its files are `.tools/saturn-fix/dev.pid`, `dev.cmd`, `dev-server.log`. PID 3640 was still a cmd process during handoff preparation.
- Confirm command line/descendants/port ownership before any stop or restart; do not terminate all Node processes.
- CPU reference checkout/server is separate at `.tools/cpu-phase-three/reference`, port 3001, currently stopped according to the reviewed handoff. Recheck before reusing it.
- Lab: `http://localhost:3000/lab/poc?perf=1`; forced compatibility adds `&renderer=webgl`; deterministic tests use `?test=1`.
- Next production build and active dev output can share `.next`; avoid overlapping builds, CPU measurement and user interaction. Arrange isolated outputs/worktrees or documented serial execution when needed.

### No pending jobs

`.tools/phase-three-active-job.txt` points at `.tools/surface-audit/regression`. Its result says finished October 2 at `04:02:37.667Z` for source `b277fce`; browser/build and other recorded checks pass. It has already been reviewed. The status helper's generic sentence separating automated completion from acceptance is not a new blocker: user acceptance is now recorded here.

### Required long-job protocol

Root `AGENTS.md` applies to every session. For jobs expected to take several minutes:

1. Prepare a unique `.tools/phase-four/<step-or-run>/` directory and persistent wrapper. The completed `.tools/surface-audit/regression/run.mjs` is a local example to inspect, not a job to relaunch.
2. Make the wrapper execute dependent stages serially, save raw stdout/stderr, and write a `result.json` with status, source revision, commands, start/end timestamps and each exit code. Record whether the working tree had relevant uncommitted changes.
3. Launch a hidden persistent process. On Windows, `Start-Process` helpers must use `-WindowStyle Hidden`. Capture the launcher PID plus relevant child/server ownership.
4. Briefly verify startup was accepted; do not stay active waiting for completion.
5. Record PID/run URL, command, source, result/log paths and next review step in `docs/PHASE_4_CHECKPOINT.md` before ending the turn.
6. Return a concise queued/running handoff. Do not report an unreviewed run as passed or promise automatic notification.
7. On return, inspect that same job first. Review result JSON, raw logs, failures, images, performance provenance and source changes. Do not launch duplicate suites because another session began.

For hosted runs, use the same rule with run URL/ID and tested revision. Preserve same-runner sequential CPU comparisons. New code changes after launch require clear source attribution; a passing older run does not validate later edits.

## 12. Installed documentation and supporting files

Read the relevant App Router guides from:

```text
apps/web/node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md
apps/web/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
apps/web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
apps/web/node_modules/next/dist/docs/01-app/01-getting-started/14-metadata-and-og-images.md
apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md
apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md
apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md
apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md
```

These paths were located in this checkout. They may resolve through pnpm links. Prefer installed docs for the pinned version and use current primary documentation if installation differs; do not upgrade to resolve a documentation mismatch.

Read as needed:

- `docs/PHASE_3_CHECKPOINT.md`, `PHASE_3_IMPLEMENTATION_HANDOFF.md`: accepted completed renderer history.
- `docs/science/surface-registration-audit.md`: geographic evidence and source-resolution limitations.
- `docs/science/surface-registration-manual-review.md`: completed user appearance review.
- `docs/ENHANCEMENTS.md`: accepted Io/Charon blur, fine cartography and allocation deferrals.
- `docs/adr/0002-precision.md`, `0003-time.md`, `0004-frames.md`, `0007-boundaries.md`, `0008-ephemeris-corrections.md`, `0009-osculating-moon-models.md`, `0010-astronomy-allocation-patch.md`.
- `packages/engine/README.md`: public application API; its final Phase 3/device-status paragraph is historical and superseded by this handoff.
- `docs/perf/phase-three/cpu-regression.md`, `docs/perf/cpu-regression.md`, `docs/perf/hosted-ci.md`: protocols and prior results; distinguish historical bootstrap paragraphs from current evidence.
- `docs/perf/phase-three/device-laptop-review.md`: accepted laptop result and exact limitations.
- `.github/workflows/verify.yml`, `cpu-perf.yml`: actual current CI contracts; no workflow modification is needed merely to begin UX work.

## 13. What the next agent should deliver at Phase 4 completion

- Approved file-level execution plan, with scope and unsupported later features explicit.
- Working object routes, meaningful share/restore/history behavior, metadata and robust URL validation.
- Fast accessible local search, compact accurate cards/provenance, usable mobile sheet, synchronized layers/settings/time, help and accessible object list.
- Clear, uncluttered full-screen shell with an honest future-events placeholder.
- Reviewed verification/build/browser/accessibility/visual/performance evidence for the actual changed code; original science/material/budget thresholds preserved.
- A short user manual review focused on changed UX: direct link/reload, Back/Forward, keyboard search/card/time, mobile controls and settings. Do not ask the user to judge orbital coordinates or repeat already accepted device measurements without a concrete new need.
- `docs/PHASE_4_CHECKPOINT.md` and a final detailed handoff recording source revisions, implementation, tests, raw artifact locations, limitations, user acceptance status and next-phase boundary.
- No surprise Phase 4B provisioning, provider calls, deployment, push or Phase 5 implementation. Readiness for Phase 4B is a separate transition decision.

## 14. Copy-paste prompt for the fresh session

```text
Read AGENTS.md and PHASE_4_HANDOFF.md, then the Phase 4 section and relevant
architecture/acceptance sections of IMPLEMENTATION_PLAN.md. Phase 3 is accepted,
including Charon's original-source resolution limitation. Phase 2 remains accepted
with ADR 0010 and the documented device coverage. Do not reopen those gates.

Prepare docs/PHASE_4_PLAN.md as a detailed file-level Core Consumer UX execution
plan and present it for approval before implementing, as required by section 0
of IMPLEMENTATION_PLAN.md. Build on the existing renderer and UI. Keep Phase 4B
database/ingestion/server search and later satellite/event/news work out of scope.
Preserve unrelated working-tree edits and user test reports. Follow AGENTS.md's
launch-and-handoff rule for long jobs. Do not start Phase 4B or deploy.
```

After reviewing the concrete execution plan, the user can authorize implementation with:

```text
I approve docs/PHASE_4_PLAN.md. Start its first step and continue within Phase 4.
Keep all accepted exceptions and thresholds. Hand off long jobs as instructed,
and do not start Phase 4B.
```
