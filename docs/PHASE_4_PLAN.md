# Phase 4 execution plan: Core Consumer UX

Prepared October 2, 2026 from `IMPLEMENTATION_PLAN.md`, `PHASE_4_HANDOFF.md`, the current source, and the installed Next.js 16.3.6 guides.

**Status: approved October 2, 2026; implementation started at P4.1.** The user approved this concrete plan and instructed implementation to begin. Authorization covers P4.1 through P4.9 in order, with checkpoints for long jobs and any material scope decision. It does not authorize Phase 4B. See `PHASE_4_CHECKPOINT.md` for current execution/verification state.

## 1. Baseline and constraints

- Starting revision: `3c0a304` (`docs: accept Phase 3 and prepare detailed Phase 4 handoff`). The exact revision at each implementation/run will be recorded separately.
- Phase 3 and the Phase 2 allocation/device decisions are accepted. Preserve the original science tolerances, the astronomy-engine patch/ADR 0010, the visible-mesh optimization, Saturn rings and Phobos/Deimos geometry. Io/Charon source softness remains accepted.
- All 21 static catalog bodies are in scope: star, planets, moons and dwarfs. Later satellite, asteroid, spacecraft, event and news data are unavailable.
- No database, ingestion, provider keys, deployment, external data fetching or server search is required. `packages/db` and `packages/ingest` remain outside this phase.
- Existing dependencies stay pinned. MiniSearch and Radix are already installed. One test-only accessibility integration is planned in P4.8; verify its exact version/license then, with no runtime dependency added for it.
- Root and app `AGENTS.md` apply. Long jobs must launch persistently, record provenance/logs/next review, and end the turn. Review the existing job before launching another.
- Preserve the 14 pre-existing generated performance changes listed in `PHASE_4_HANDOFF.md`, ignored user reports in `test-results/`, and prior raw failures. Use explicit staging paths.
- Environment checked now: Node `v24.12.0`, pnpm `10.32.1`; `pnpm.cmd` works. The existing server responds HTTP 200 on port 3000, owned by PID 23516 at the time of inspection. Recheck identity before any restart.
- The existing Phase 3 job is finished and reviewed; `node tools/phase-three-status.mjs` was checked once. No validation job is pending for this proposed plan.

The current Vitest configuration only discovers `packages/**/test/**/*.test.ts`. P4.1 will add `apps/web/test/**/*.test.ts` so new web contract tests actually run.

## 2. Approved product decisions

### URL contract

The pure codec is the single authority for startup, client navigation, history restoration, normalization and sharing. It returns a validated state, route resolution and nonfatal issues; it never starts a renderer.

| Input | Accepted representation and policy |
|---|---|
| `/` | LIVE solar overview, Explore scale, current available layers on, Sun target with wide preset, no selected card |
| `/object/[kind]/[slug]` | Resolve against the catalog; current route kinds are `star`, `planet`, `moon`, `dwarf`. Object route wins over a conflicting `focus` query and opens the card |
| Legacy `?focus=planet:mars` | Valid catalog ID focuses Mars and opens its card. Normalize to the object route after accepted initialization, using replace so loading does not add history |
| Future kind prefixes | Record `sb` → asteroid, `sat` → satellite and `sc` → spacecraft as future mappings, but return unavailable/not-found until a real entity exists. Never construct an unchecked ID |
| Friendly routes | Exact current catalog slugs, e.g. `/mars`, redirect to canonical object routes and preserve bounded validated query state. A one-segment alias route will not override existing literal routes such as `/about` or `/lab` |
| `t` | ISO date/time with an explicit `Z` or numeric offset, normalized to UTC milliseconds. A supplied valid date starts **paused**. Absent or rejected date means LIVE |
| Date bounds | `1900-01-01T00:00:00.000Z` through `2100-12-31T23:59:59.999Z`, matching the existing clock; reject out-of-range input instead of silently calling a clamp a successful restoration |
| Calendar validation | Validate components before conversion: reject February 30, impossible hours/offsets and nonfinite dates. Support 0–3 fractional second digits; reject leap-second `:60` because the current UI/Date adapter cannot represent it |
| `layers` | Known `LAYERS` IDs, deduplicated in definition order. Absence applies available Phase 4 defaults; `layers=` explicitly turns all requested layers off. Unknown IDs are dropped with an issue. Known future layers can remain requested but are visibly unavailable |
| `scale` | `explore` or `true`; invalid input uses Explore |
| `frame` | Optional public alias `earth`, `helio`, `earth-fixed`; maps to `ICRF_BODY:earth`, `ICRF_HELIO`, `FIXED:earth`. Absence keeps the existing SSB/inertial camera behavior |
| `view` | `close` or `wide`; omitted uses wide for the root overview and close for a selected object. It is a requested semantic preset, not a copy of arbitrary orbit/pan/zoom floats |
| Duplicate state keys | Reject that field as ambiguous and use its safe default; do not select whichever duplicate happens to be first. The canonical object route still determines focus |
| Bounds and malformed input | Maximum 4,096 characters for pathname plus query, 100 for an ID/slug, 64 for a date, 512 for a layer value; invalid percent escapes/UTF-8 are rejected before decoding. Invalid object paths use not-found; invalid query fields use defaults and an accessible summary |
| Debug flags | Validated local `renderer=webgl`, `test`, `perf` and existing lab scenario are handled separately from public state. Unknown parameters are not forwarded into commands |
| Share URL | Canonical object path plus normalized meaningful state; strip test/perf/scenario and renderer flags. A separate compatibility action adds only `renderer=webgl` to the same public state |

Validation of query issues must remain useful when graphics startup fails. A short nonfatal message such as “Some link settings were invalid; the default view was used” exposes details on demand. Do not announce raw unbounded input.

### Frame and view behavior

Frame support needs an actual bounded engine implementation before it can be claimed as restored:

- The canonical physical state remains ICRF/SSB float64 km. Frame selection changes camera coordinates only.
- Camera center, pan and orbit offset are represented in the chosen frame and transformed through the existing astro `FrameTree`. Keep the current SSB path as the default fast path.
- With follow enabled, the camera center tracks the focused body's position expressed in that frame. With follow disabled, its center stays in that frame, so Earth and heliocentric origins have observably different tracking behavior as time advances.
- In Earth-fixed mode the camera axes rotate with the Earth's scientific fixed frame. This is a camera reference option, not an observer/sky/location feature.
- Changing frames preserves the current world pose at the switching epoch, then evolves in the chosen frame. It must not teleport or change object-card metrics.
- Flights interpolate centers in a common inertial world frame and convert the resulting pose to the requested frame. Existing default flights and reduced-motion fades remain intact.
- `close` retains current radius-based framing, including Saturn's ring-aware radius; `wide` retains the current overview distance. Store the last requested preset so get/apply MapState can round-trip it. Free camera gestures do not update URL floats or pretend that preset shares reproduce an exact pose.
- Future `secondary`, `fit-both` and playback-window scheduling remain outside the Phase 4 URL codec. Existing domain fields remain available for later event integration, with unsupported behavior documented rather than silently exposed in production links.

This is the largest implementation risk. Its independent transform/pose tests and default-path performance checks precede route integration. If it requires provider, attitude or physical-coordinate changes, stop and present that scope change.

### Navigation and state ownership

- A shared `app/(explore)/layout.tsx` owns one client Explore shell and one engine across `/` and object routes. The group does not change public URLs. Keep the root document layout; About, lab and unavailable event pages remain separate from the Explore group.
- Server object pages validate catalog membership and generate metadata. A small client route observer under Suspense reads pathname/search state; page fragments provide route validation/content without owning a second renderer.
- Object selections use Next `router.push(..., {scroll:false})`, which adds the meaningful browser history entry and updates server route metadata. Query-only changes use native `history.replaceState` after 500 ms. This is a deliberate implementation refinement of section 20's literal `pushState` wording: a pathname-only native history update would leave the current server page/metadata stale.
- Cancel any pending replacement before selection, Back/Forward, unmount or newer URL input. Flush relevant explicit state into the old entry before pushing the next selection.
- The accepted URL state is authoritative for focus/time/layers/scale/frame/view. The bridge applies commands, then publishes the accepted control values; components do not maintain competing defaults.
- Object selection before renderer readiness stores the latest request. Async startup re-reads the latest accepted state before publishing readiness. An obsolete startup cannot overwrite a newer selection.
- Explicit date, pause/play/rate/reverse, LIVE and share commands control time snapshots. Clock ticks never replace URLs. Starting non-LIVE playback captures one anchor; sharing captures the current simulated time. Reload of a dated link starts paused; playback rate and follow state are not public URL fields in this phase.
- Clear distinction: browser Back/Forward restores route state; **Previous view / Backspace** calls `engine.back()` once and replaces the route to match the restored camera target. It never also calls browser history back. Camera history includes frame/preset.
- Closing a card clears selection without moving the camera or adding history. The object URL remains shareable; reload opens the corresponding card again. Re-selecting that object opens the card.
- A selected body's disabled layer remains disabled when loading/sharing a link. The card explains “Hidden by the Moons layer” (or equivalent) and offers an explicit Show layer action. Do not silently defeat `layers=`.
- Canvas selection and search/list selection follow the same command path, with one meaningful navigation/focus and no duplicate flight from event feedback.
- Normalization uses replacement, never an additional selection entry. Track command source/revision to prevent URL → engine → URL loops and avoid replaying state when a local replacement is observed.

### Default shell and mobile behavior

Six independently interactive controls are visible in the unselected default view:

1. Search, at top left alongside a noninteractive logo/wordmark.
2. Layers, at top right.
3. Settings, at top right.
4. Happening now, as a collapsed drawer trigger on the right.
5. Play/pause, at bottom center.
6. Time/date, at bottom center, displaying LIVE or UTC time and opening the expanded timeline controls.

No default quick-destination buttons, standalone help/back/share buttons, brand link or permanent secondary navigation. Help, Objects in view, About the data, scale/frame/view options and share are reachable from the appropriate open panel or selected card. Keyboard shortcuts remain discoverable in Settings → Field guide. The selected card and user-opened panels are additional contextual controls; the six-control count is recorded with a default-view screenshot and DOM inventory, not counted as arbitrary toolbar groups. Scene labels are text, not extra persistent buttons.

- Expanded time panel contains LIVE, reverse, the eight speed magnitudes, and a labelled UTC date/time picker. Desktop and mobile use the same state/commands. The closed mobile bar contains date/time and play; speed remains one tap away.
- Desktop card is compact; mobile card has explicit peek, summary and details snap states, with a labelled Expand/Collapse button. Dragging the handle may supplement those buttons. A handle drag must not orbit the canvas; scrolling card details must not zoom it.
- On mobile the time bar sits above the sheet with safe-area offsets. The details sheet has an internal scroll area and a maximum height based on the visual viewport. Search fits an open keyboard; essential dismissal/selection controls stay reachable.
- Happening now is closed by default. Empty copy: **“Events are not available yet. Explore the catalog or choose a date to travel through time.”** No fake events, counts, countdowns or news cards.
- Use the current Continuum identity/English copy, km default, optional mi/AU. Persist units, requested quality and reduced-motion override in versioned local settings. URL state wins for its own fields. Storage failure falls back to in-memory settings.
- Reduced motion defaults to System, with explicit On/Off overrides. System preference changes affect the engine when System is selected. Show requested quality and actual adaptive tier separately.
- Speed is labelled “Speed relative to the solar-system barycenter”; display km/s for km and AU distance modes, mi/s for miles. AU changes distance units, not the velocity reference frame. Use the existing astro constants via a formatter outside UI components.

### Accessibility and objects list

- Search uses an input combobox with a labelled listbox, active descendant, selected option, arrows/Home/End, Enter, Escape and stable option IDs. Focus remains in the input during result navigation; closing returns focus to the trigger. Results support touch without hover.
- Objects in view means **layer-enabled catalog bodies whose projected centers are inside the camera viewport**, regardless of label collision or occlusion. Describe that limitation in the list. It is not a list of every catalog body or a claim of line-of-sight visibility.
- A public engine snapshot query supplies this list; update it on the existing UI cadence, with no RAF subscription in React and only while the panel is open. Publish only changed IDs/order. Search remains the alternative for other bodies.
- Add `O` for the list and `?` for help. Canvas owns arrows and zoom keys; search owns its navigation keys. Global shortcuts ignore modifiers, composition, contenteditable/text inputs, interactive controls and modal ownership. Space on a button must activate that button without toggling the simulation.
- Keep visible focus, touch targets, semantic headings/labels, selection announcements and Radix focus return. Scan default and open-panel states; combine automated checks with a manual keyboard walkthrough.

## 3. Execution steps

Each step introduces focused tests before behavior changes where appropriate, runs `pnpm.cmd verify`, records evidence, and receives a local commit with explicit paths. Browser/build stages that become long run persistently and hand off; do not start the next step while required verification is unreviewed or red. No push or deployment is part of these steps.

### P4.1 — Validated state contract and URL codec

**Purpose:** make every external URL a bounded, deterministic command input before renderer startup.

**Files:**

- New `apps/web/src/lib/routeState.ts`: route resolution, normalized public state, parse/serialize/compatibility helpers and issues.
- New `apps/web/src/lib/utcInput.ts`: strict UTC/offset calendar parsing and date-input formatting; no renderer/React imports.
- New `apps/web/test/routeState.test.ts` and `utcInput.test.ts`.
- Modify `vitest.config.ts` to include web pure tests.
- Modify `packages/domain/src/schemas.ts` and domain schema tests: validate FrameId syntax rather than any bounded string; keep general registered-frame support and the existing event contracts. Do not restrict every domain MapState to the static web catalog.
- Modify `apps/web/src/engine-bridge/EngineCanvas.tsx` to validate legacy startup time/focus/layers/scale through the codec, preserving test/lab deterministic startup. Frame application arrives in P4.2; do not claim it implemented in P4.1.
- Wire nonfatal validation issues through the bridge store and a small accessible notice in Explore/styles; include the new web tests in `apps/web/tsconfig.json` as well as Vitest discovery.
- Update `docs/PHASE_4_CHECKPOINT.md` and `docs/adr/0011-consumer-route-state.md` with the approved policy and partial-step limits.

**Proposed pure surface:** `resolveObjectRoute(kind, slug)`, `parseExploreLocation(pathname, search)`, `serializeExploreState(state, options?)`, `buildCompatibilityHref(state)`. `parseExploreLocation` returns a discriminated route result plus validated MapState/initial selection and an issue list. Public serialization accepts validated state, uses known catalog mappings, and emits same-origin relative URLs.

**Tests:** all 21 canonical IDs; legacy focus and route precedence; defaults versus empty layers; future/unknown IDs; deduplication; all supported enum combinations; malformed escaping; duplicate keys; length limits; leap years and invalid dates; offset dates crossing range boundaries; parse/serialize semantic equality and stable ordering. Verify tests are discovered in ordinary `pnpm test`.

**Commands:** focused `pnpm.cmd exec vitest run apps/web/test/routeState.test.ts apps/web/test/utcInput.test.ts`, then `pnpm.cmd verify`. Startup browser smoke is included with the P4.2 persistent run if needed; unit success alone does not validate a running renderer.

**Exit:** invalid date/ID input cannot reach `SpaceEngine.create` unchecked; absent `t` remains LIVE outside the existing explicit lab test mode. No provider/assets/science changes. Commit `P4.1: validate consumer route state and UTC input`.

### P4.2 — Public camera frame and MapState restoration

**Purpose:** make frame/view fields real supported behavior without exposing renderer internals.

**Files:**

- New `packages/engine/src/camera/CameraReference.ts`: frame-relative pose adapter using caller-owned float64 buffers and an injected frame-transform surface.
- Modify `packages/engine/src/camera/CameraController.ts`: frame/preset/history integration, world-pose-preserving switching and default-path preservation.
- Modify `packages/engine/src/SpaceEngine.ts`, `EngineApi.ts`, `index.ts`, `packages/engine/README.md`: supported frame commands, MapState round-trip, layer snapshot/settling boundary.
- New `packages/engine/test/camera-reference.test.ts`; extend `api.test.ts` and camera/history tests.
- New `e2e/phase-four-state.spec.ts`; update startup coverage for malformed links.
- Update `apps/web/src/engine-bridge/EngineCanvas.tsx`, `useEngineStore.ts` to apply all validated initial fields and publish agreed state.
- Record the camera semantics in ADR 0011 and `docs/adr/0004-frames.md` without changing science conventions.

**Public additions:** `setFrame(frame: 'ICRF_SSB' | 'ICRF_HELIO' | 'ICRF_BODY:earth' | 'FIXED:earth')`, `getLayerStates(): readonly EngineLayerState[]`, and `whenLayersSettled(): Promise<void>`. Add optional `{transition?, select?, recordHistory?}` to `applyMapState`; retain the existing one-argument void contract. Extend focus options only as needed to suppress restoration history. Add a cold `mapStateChange` event for relevant public commands; no event every frame/tick. Emit errors for unavailable public frame requests instead of silently retaining a different frame. Export public types from the package root.

**Implementation order:** independent adapter/pose tests → camera integration with SSB fast path → get/apply state semantics → startup application. Settling waits for requested layer resources and honors the most recent toggle. Layers off must not prevent semantic selection/card access. Do not use diagnostics/reference helpers in production code.

**Tests:** switch frames without a world-position/orientation jump; Earth-fixed evolution against the existing independent attitude fixtures; different Earth/heliocentric origin evolution with follow off; follow on keeps focus; reversed time; all fixed-time boundaries; frame/preset/back round-trip; unchanged default flight and reduced-motion fade; no physical state mutation; output-buffer reuse; failed frame transform produces a typed/controlled failure. Browser assertions cover actual restored state and projected behavior rather than only URL strings.

**Commands:** focused camera/API tests, `pnpm.cmd verify`, then persistent state/startup/precision/original-reference browser checks. Measure engine gzip and paired CPU evidence when the adapter changes the frame loop; preserve thresholds and comparison protocol below.

**Exit:** every public frame alias applies and is returned, semantic preset round-trips, default camera behavior remains validated, and v1 existing callers still compile. Commit `P4.2: support consumer camera frames and MapState restoration` after required results are reviewed.

### P4.3 — Object routes, metadata and persistent renderer lifetime

**Files:**

- Move `apps/web/src/app/page.tsx` to `apps/web/src/app/(explore)/page.tsx`; remove the old conflicting root page.
- New `apps/web/src/app/(explore)/layout.tsx` and `components/ExploreRouteShell.tsx` for stable shell/engine ownership.
- New `apps/web/src/app/(explore)/object/[kind]/[slug]/page.tsx` and route not-found UI.
- New `apps/web/src/app/[alias]/page.tsx` for checked catalog aliases.
- New `apps/web/src/app/event/[id]/page.tsx`/not-found boundary: unavailable event content with a useful return-to-Explore action and no invented event.
- New `apps/web/src/lib/objectMetadata.ts`; modify `app/layout.tsx` for optional validated site origin configuration.
- Modify `components/Explore.tsx`, `engine-bridge/EngineCanvas.tsx` to accept/observe validated state while preserving the lab wrapper's standalone Explore use.
- New route/metadata tests in `apps/web/test/` and `e2e/phase-four-routing.spec.ts`.

**Details:** keep server metadata catalog-only and engine-free. Await the installed Next version's Promise route params. Generate static params for the current 21 objects where supported; unknown objects must use genuine not-found handling. Validate `SITE_URL` as an optional origin; omit absolute canonical/OG URL fields if unconfigured, while still generating title, description and object type. Do not use invented current distances or timestamps. No new raster OG asset is required.

The route observer lives in a small Suspense boundary so a static production build succeeds and the shell stays useful. Invalid routes do not initialize a background engine behind a not-found screen. About/lab navigation leaves the group and disposes it; object-to-object navigation retains the same live engine/canvas.

**Tests:** direct entry/refresh for planet/moon/dwarf/star; unknown route and future kind; correct Charon ID; legacy root and friendly redirects; actual HTTP status/HTML title/description/OG tags; metadata after client navigation; 20 selections with one engine/canvas, stable identity and no stale cleanup/subscriptions; leaving Explore cleans up; lab still functions. Production-server HTML checks are necessary in addition to dev DOM checks.

**Commands:** unit tests and verify; persistent production build plus route/browser checks, with isolated build output and server port.

**Exit:** validated object routes and metadata work with a single renderer across ordinary navigation. Commit `P4.3: add object routes and persistent Explore shell`.

### P4.4 — Query synchronization, sharing and browser history

**Files:**

- New `apps/web/src/engine-bridge/RouteStateBridge.tsx` and pure `routeStateController.ts`.
- Modify `useEngineStore.ts`, `EngineCanvas.tsx`, `timeCommands.ts`, `ExploreRouteShell.tsx`, `Explore.tsx` to centralize accepted state and user commands.
- New controller tests in `apps/web/test/routeStateController.test.ts`; extend routing/state browser tests.
- Add `components/ShareViewDialog.tsx` for a selectable/copyable URL if clipboard is unavailable.

**Details:** implement the ownership/history policy in section 2 with a latest-request revision, a restoration guard, and cancellable 500 ms replacements. Bridge subscribes once to cold engine commands and selection; clock subscriptions update display only. A focused object selection produces exactly one push; settings, normalization and Previous view produce replacement. Share flushes pending meaningful state and captures the current simulated time only when non-LIVE. Compatibility links preserve public state. Safe clipboard fallback has labelled text and focus management.

**Tests:** Back/Forward across multiple selections plus layers/scale/frame/view/date; rapid startup selection; stale async create; cancelling a pending replacement on popstate; empty layers; paused reload of a playing snapshot; LIVE does not gain `t`; no clock tick or gesture history writes during accelerated playback; Previous view does not pop browser history; card controls reflect accepted state; clipboard denial remains usable. Use non-UTC browser contexts.

**Commands:** focused controller tests, verify, persistent routing/state browser checks.

**Exit:** shared URLs reproduce the promised semantic state; history restores controls and engine together; no feedback or history flood. Commit `P4.4: synchronize shareable state and navigation history`.

### P4.5 — MiniSearch and accessible combobox

**Files:**

- New `apps/web/src/lib/catalogSearch.ts` with typed local `searchEntities` results and a future merge boundary.
- New `apps/web/src/components/search/EntitySearch.tsx`; extract shared SVG icons to `components/ui/Icon.tsx` if useful.
- Modify `Explore.tsx` and `app/globals.css`; remove the old substring dialog implementation.
- New `apps/web/test/catalogSearch.test.ts`, `e2e/phase-four-search.spec.ts`.

**Details:** build one MiniSearch index from the current catalog names/aliases/IDs. Rank exact name/alias/ID first, then prefix, fuzzy match and importance with deterministic tie-breaking. Deduplicate by ID; cap visible results and bound/trim the query. Empty input shows a short ranked catalog list; no results gives helpful real examples. Do not make production server/provider calls. The future boundary can merge typed result arrays by ID when Phase 4B arrives.

**Tests:** all bodies and aliases, Mars/Europa/Pluto/Charon, exact rank, mixed case, typo/prefix, duplicate alias, empty/no match and long input. Combobox ARIA state, ArrowUp/Down/Home/End, Enter selects active rather than first option, Escape/focus return, touch selection and keyboard composition. Measure warm local index lookup separately from end-to-end input-to-results/selection latency; targets are <16 ms and ≤300 ms respectively, with environment and samples recorded.

**Commands:** focused search tests, verify, persistent search browser checks.

**Exit:** every available body is searchable through keyboard/touch with coherent route/card state. Commit `P4.5: add indexed accessible catalog search`.

### P4.6 — Object card, provenance and mobile sheet

**Files:**

- New `components/objects/ObjectCard.tsx`, `ObjectMetrics.tsx`, `ProvenanceDetails.tsx`, `MobileObjectSheet.tsx`.
- New `apps/web/src/lib/formatEntity.ts`, formatting tests and `e2e/phase-four-cards.spec.ts`.
- Modify `Explore.tsx`, `useEngineStore.ts`, `app/globals.css`.

**Details:** correct type labels: star, rocky planet, gas giant, ice giant, moon and dwarf planet based on validated kind/tags/catalog data; avoid blanket terrestrial classification. Show name/type/certainty, physical Sun/Earth distances, SSB speed, mean diameter, and catalog orbital period where available. Optional fields show unavailable rather than fabricated values. Detail disclosure includes actual source URL/provider, method, uncertainty note and simulation UTC; source/ingestion/epoch timestamps appear only if present and labelled correctly.

Metrics use existing throttled bridge state and public getters; no new frame callback. Source truth remains the catalog/provider, with computed/approximate copy matching it. Mobile snap controls are keyboard reachable, focus remains stable after disclosure/closing, and card gestures stop at the card boundary. Follow/refocus/show-layer/share commands go through the public bridge.

**Tests:** all four entity kinds plus giant/rocky labels; computed/approximate source wording; period available/unavailable; km/mi/AU and speed units; simulated past/future vs source dates; history changes card; hide/show layer; details disclosure; snap/collapse and internal scroll; follow/close focus behavior. Confirm values remain identical in True/Explore scale.

**Commands:** formatter tests, verify, persistent card/mobile browser checks.

**Exit:** card measurements and provenance are accurate and the mobile sheet is operable without obstructing time controls. Commit `P4.6: add accurate object cards and mobile sheet`.

### P4.7 — Six-control shell, layers, settings and time

**Files:**

- New `components/controls/LayersPopover.tsx`, `SettingsPopover.tsx`, `TimeBar.tsx`, `FieldGuide.tsx`, `components/HappeningNow.tsx`.
- New `apps/web/src/lib/userSettings.ts` and tests.
- Modify `Explore.tsx`, `app/globals.css`, `useEngineStore.ts`, `timeCommands.ts`.
- New `e2e/phase-four-controls.spec.ts`, `phase-four-mobile.spec.ts`.

**Details:** apply the six-control default layout exactly. Layers consume public requested/available/loaded/visible state and known labels; current 21-body copy replaces stale four-world/future-moon text. Future datasets are disabled/unavailable, with requested state distinguished from visibility. Settings use versioned validated local persistence and show requested quality/actual tier, System/On/Off reduced motion, distance units, scale, frames/presets, list/help/about actions.

Date input is labelled UTC and does not parse a `datetime-local` value in the user's timezone. Timeline exposes LIVE/paused/playing, reverse, all eight existing speeds, date bounds and a useful clamp notice. Return-to-LIVE keeps the accepted animation/fade and respects reduced motion. Remove the hard-coded September 22 date. All sheet/dialog/popover widths, safe areas, focus and visual viewport behavior are verified at narrow/tall/landscape sizes.

**Tests:** restored settings/layers; failed or corrupt local storage; system reduced-motion changes and explicit override; real transition behavior; requested vs adaptive quality; all speed signs and bounds; UTC picker in Toronto and another timezone; LIVE/date snapshots; exactly six default interactive controls; placeholder is closed and honest; mobile search keyboard, resize/orientation, no horizontal overflow and reachable timeline/card controls.

**Commands:** settings/time tests, verify, persistent controls/mobile browser checks and reviewed captures.

**Exit:** full-screen shell meets the clutter policy and all controls agree with accepted engine/URL state. Commit `P4.7: finish Explore controls and responsive shell`.

### P4.8 — Objects in view and integrated accessibility

**Files:**

- Add `getObjectsInView(): readonly ObjectInView[]` to public `EngineApi`/exports, implemented in `SpaceEngine.ts` using enabled rendered catalog entities and camera projection, independently of label collision visibility.
- New pure projection/list policy helper and meaningful engine unit tests; extend API boundary tests.
- New `components/objects/ObjectsInView.tsx`, `engine-bridge/useObjectsInView.ts`, `lib/shortcutPolicy.ts` and tests.
- Modify shell/help/input ownership as needed; canvas-specific keys stay in `packages/engine/src/camera/Input.ts`.
- Add test-only `@axe-core/playwright` to root dev dependencies with exact version/lockfile/license review; new `e2e/phase-four-accessibility.spec.ts`.

**Details:** calculate snapshots on a cold/throttled query, with reusable engine buffers and no new per-frame allocations/list objects. The list includes every qualifying current catalog body even if its visual label lost a collision or its center is occluded. Explain “Objects with centers in the view; some may be behind another body.” Selection uses the shared command path. Subscribe at ≤4 Hz only while open, and update React only when semantic contents change. Align the query with an existing UI notification to avoid a second independent recurring commit cadence.

Unify shortcut guards for modal/popover/text/interactive ownership, modifiers and IME. Preserve the canvas application instructions while offering a complete text alternative. Audit label contrast/focus/touch-target treatment, active descendant correctness, live announcements and Radix dismissal/focus return.

Accessibility workflow follows [Playwright's primary guide](https://playwright.dev/docs/accessibility-testing): use automated scans of actual open states plus manual assessment. Retain raw results including incomplete checks. Require zero critical/serious violations and fix identified WCAG A/AA issues in the changed UI; do not hide them with blanket exclusions. A clean scan does not establish complete WCAG conformance.

**Tests:** pan/zoom/disable layer changes actual list membership; label collisions do not remove qualifying objects; empty list and cleanup; list shortcut and focus; keyboard-only search → select → card → time → layers/settings/list; Space/Enter/Backspace in buttons/inputs/dialogs; reduced-motion transition; axe for default/search/card/time/settings/layers/list states at desktop/mobile widths.

**Commands:** policy/API tests, verify, licenses check, persistent accessibility/list/browser checks and a complete-subtree accelerated React profile.

**Exit:** an honest selectable text list and usable keyboard flow, no critical accessibility issues, and ≤4 React commits/sec. Commit `P4.8: integrate objects list and accessibility`.

### P4.9 — Reviewed phase regression and acceptance evidence

**Files:**

- New `tools/run-phase-four-validation.mjs`, `tools/phase-four-status.mjs`, `tools/measure-shell.mjs`, `e2e/phase-four-performance.spec.ts` as needed.
- Add evidence output configuration/helper to older browser tests only where necessary to redirect hard-coded report/capture writes without changing their tolerances or behavior.
- Keep existing profiler/lab working and extend its open-card/open-list test scenario.
- Update `docs/PHASE_4_CHECKPOINT.md`, `docs/IMPLEMENTATION_STATUS.md`, `README.md`; publish reviewed raw reports/summary/captures under `docs/perf/phase-four/` and prepare root `PHASE_4_IMPLEMENTATION_HANDOFF.md` at completion.

**Stages:** verify → assets/licenses/engine measurement → isolated production build → production route HTML/bundle/startup checks → browser regression and accessibility → sequential CPU comparison when required → agent capture/log review → user changed-UX review. Save each command, timestamp and exit status. No claim passes based on a missing/truncated report, skipped tests, unreviewed captures or a different source revision.

**Required regression:** existing scientific/unit suite; all eight original references at 1.5% tolerance; precision <0.5 px with all depth probes; rings/irregular shape/quality transitions; texture stability; route/startup/history/search/cards/controls/mobile/accessibility; accelerated complete-subtree React profile with and without the object list/card.

**Exit:** the scoped acceptance matrix below is evidenced; new manual UX review and any limitations are recorded. Phase 4B remains unstarted. Commit `P4.9: record reviewed consumer UX validation` after results are reviewed; document pending user sign-off if necessary rather than marking it accepted prematurely.

## 4. Performance and evidence protocol

### Preserved thresholds

| Check | Threshold / method |
|---|---|
| Route shell JavaScript | ≤200,000 gzip bytes; measure production shell attribution, not the ten largest chunks |
| Lazy engine | ≤450,000 gzip bytes using existing standalone engine entry measurement; latest reviewed report is 373,142 bytes |
| Distributed assets | ≤80,000,000 bytes; latest reviewed report is 79,961,515 bytes. No new planetary assets planned |
| React updates | ≤4 commits/sec over 30 sec at 1 day/sec; complete Explore subtree, include open list/card workload |
| Local search | Warm local lookup <16 ms; visible input/results/selection response ≤300 ms, recorded separately |
| CPU regression | Every existing path mean and p95 ≤1.20× a fresh matching-environment reference, fail closed on incomparable schema/environment |
| Navigation long tasks | Desktop none >50 ms, mobile none >100 ms under recorded measurement conditions |
| Physical throughput | Desktop HIGH p95 ≤16.7 ms and mobile LOW/MEDIUM ≤33 ms; emulation/SwiftShader cannot establish hardware GPU speed |
| Cold first frame | Desktop ≤2.5 sec and mobile 4G ≤5 sec under explicit cold-cache/network/CPU protocol; record sample distribution and limitations |
| Geometry/draws | Desktop ≤12 detailed meshes /300 draws; mobile ≤6 /150 |
| Texture storage | Preserve HIGH 350 MB, ULTRA 600 MB, mobile 128 MB policy; existing compressed mip report is not total VRAM |

For shell attribution, use an isolated production build/server. The helper enumerates production JS requests before renderer startup, using a test-only engine-start gate, deduplicates emitted files and sums gzip level-9 bytes. Include the route's Next/React/shared/catalog/UI runtime; exclude only the audited lazy engine dependency closure and separately loaded assets/transcoder. Also record all JS loaded for the ungated first-frame path so automatic lazy startup is visible. Fail if any renderer/Three dependency is already on the shell path. The report includes URLs, file sizes, classification rationale, build/revision and cache/protocol details; individual-chunk listing is supplemental. Use official installed build output/manifests and request capture together rather than assuming one filename equals the engine.

Measure navigation only after assets/shaders settle; record observed engine flights separately from command-response latency. Cold startup uses production, cleared cache and service workers, with declared latency/bandwidth/CPU emulation and multiple fresh contexts. These measurements describe that machine/protocol. Document a failed target as failed; do not relax the target or substitute a warm run. Keep accepted physical evidence distinct from new changed-UX emulation.

If camera frame/list changes touch frame-loop work, make a fresh local sequential comparison against accepted Phase 2 `4409ef5d8f97299d9058360c97d560493d067c1c`, using its separate checkout and candidate on the same machine/browser/configuration. Save both new captures and raw failures; keep the original threshold and reference. The current hosted workflow's independent reference remains `1a77315050f0407220cda1237f1284a30afeede1`; do not change that workflow merely for Phase 4. A hosted run would require its own exact source/protocol record and does not automatically replace the local comparison.

### Persistent jobs and source isolation

1. Select a unique `.tools/phase-four/<step>-<run>/`; snapshot source revision, relevant diff/hash, package versions and pre-existing report hashes.
2. Use a persistent wrapper with serial dependent stages, separate stdout/stderr, and an incrementally written `result.json`. Its overall verdict derives from every required stage, not just `status: finished`.
3. Prefer an immutable candidate worktree for multi-minute validation. Keep the user's port-3000 server running. An isolated candidate build/server uses another port and build output; parameterize Playwright base URL/server behavior for it. Never build into the active dev server's `.next` concurrently.
4. Older tests write fixed `docs/perf` paths. Redirect outputs deliberately or run in the isolated worktree; a unique Playwright `--output` alone does not protect these paths. Preserve user `test-results/` downloads and historical references.
5. Launch through `Start-Process -WindowStyle Hidden`, record PID, actual child/server ownership, command, revision/worktree and output locations. Briefly confirm startup.
6. Write the checkpoint and end the turn with running/queued status and next review. Do not poll or promise automatic notification.
7. On return, inspect that exact result/logs first. Review captures and errors. Publish only intended reviewed evidence and remove only verified task-owned temporary resources.

Short focused unit/type/lint commands can run interactively. If verify or any check unexpectedly becomes long, arrange persistent execution before handing off. A source change after launch needs a new clearly attributed run where it invalidates the previous evidence.

## 5. Phase exit matrix

| Implementation-plan item | Phase 4 demonstration | Evidence / remaining boundary |
|---|---|---|
| 1: load/first frame | Account-free root, startup and production cold-load protocol | New measured startup; accepted physical evidence remains distinct |
| 2: solar view/quality | Default lit 21-body solar overview, Explore scale | Original references/renderer budgets preserved; no invented new physical FPS result |
| 3: camera inputs | Orbit/zoom/pan/focus/follow/Previous view across mouse/touch/keyboard | Existing regressions plus new frames/shortcut checks |
| 4: search | All current catalog objects and aliases, ≤300 ms mechanism | ISS/Voyager/JWST/asteroid/event results deferred to their data phases |
| 5: selection | One smooth focus/card/navigation operation, reduced-motion option | Search/list/canvas and startup/history tests |
| 6: measurements | Physical distances, SSB speed, diameter and available period | Cards for star/planet/moon/dwarf; unavailable fields labelled |
| 7: provenance | Actual source/method/certainty and simulation time | No fabricated telemetry freshness; source dates only when present |
| 8: time | LIVE/pause/reverse/eight speeds/UTC picker/1900–2100 | Bounds, non-UTC contexts and return-to-LIVE checks |
| 16: sharing | Canonical/legacy links, time/layers/scale/frame/view restored | Reload/Back/Forward/compatibility/clipboard tests |
| 17: visual quality | Original gate references and Phase 3 geometry preserved | Review new captures with unchanged tolerances |
| 18: mobile | Load/navigation/search/card/time/layers changed UX | Emulation plus user UX review; news and new hardware thermal/throughput claims excluded |
| 19: clutter | Six default independent controls, unobscured map/labels | Default DOM inventory and reviewed desktop/mobile captures |
| 21: accessibility | Keyboard path, reduced motion and actual open-state scans | Included as a necessary UX requirement even though Phase 4's summary exit names 1–8/16–19 |

Before claiming Phase 4 complete, provide a short user review focused on changed UX: open/refresh an object link, Back/Forward, keyboard search/card/time, mobile sheet/keyboard/layers, and settings/reduced motion. Do not reopen orbital correctness, texture-source acceptance or previously accepted device coverage.

## 6. Approval and continuation

Approved defaults are Continuum branding, English, km, System reduced motion, paused dated links, persistent renderer, the six-control shell, and an honest closed events placeholder. No additional preference is required to implement P4.1.

Approval is recorded. Start **P4.1**, run its checks, and commit only its reviewed paths. Continue Phase 4 in order within that authorization, subject to required verification and long-job handoffs. Ask for input if implementation reveals a material product choice, unsupported frame behavior, an unavoidable budget failure, or a scope change. Phase 4B/5 remain separate decisions.
