# 0011 — Validated consumer route state and camera references

October 2, 2026. Phase 4 plan approved by the user before P4.1 implementation.

## Context

Renderer startup previously read raw focus/date/scale/layer values, separately from sharing. A malformed date could fail graphics initialization. Core consumer routes need one bounded state contract before navigation/history integration. The general domain MapState also accepts fields intended for later event data; the consumer URL must not promise unsupported restoration.

## Decision

`apps/web/src/lib/routeState.ts` owns pure public parsing/normalization/serialization. It resolves only catalog members, gives canonical object routes precedence over legacy focus queries, distinguishes absent/default layers from an explicitly empty list, rejects duplicate state fields, orders known layers deterministically and rejects malformed percent encoding/UTF-8 before URLSearchParams can replace it. Unknown bounded query keys are ignored. A malformed query uses defaults for all its fields while retaining a valid object path. Overlong query state likewise falls back without discarding a bounded valid path.

External dates require explicit offsets and valid calendar components within the existing 1900–2100 clock range. Normalize to UTC milliseconds. Dated links start paused; absent/rejected time stays LIVE, except an explicit existing test flag preserves deterministic diagnostics. UTC-labelled picker adapters do not use the browser's timezone. Invalid input produces bounded accessible explanations and cannot reach astronomy conversion unchecked.

Public URL state is focus/time/layers/scale, plus `earth|helio|earth-fixed` frame aliases and `close|wide` semantic presets. Exact camera floats, follow/playback rate, secondary targets, fit-both and event-window scheduling are excluded. The serializer rejects unsupported states; diagnostic flags are separate. Compatibility links add `renderer=webgl` while retaining the same public state.

The domain frame schema validates FrameId syntax, including registered namespaces such as `ICRF_BODY:registered/sat:25544`, independently of static catalog membership. General event MapState contracts remain available for later phases.

P4.2 implements camera-only reference transforms through the existing scientific FrameTree. Physical states and metrics remain ICRF/SSB float64 km. Frame switching preserves world position, look center and up direction; follow tracks the target in that reference, and follow-off retains a frame-relative center. Earth-fixed axes evolve with scientific Earth attitude. Flights interpolate centers in SSB. The default SSB path skips transforms. History stores reference, preset, follow state, pan and local up. Browser/build/CPU acceptance was reviewed green October 3; see `docs/perf/phase-four/p4-2-final-review.md`.

The additive v1 API exports `CameraFrame`, `CameraFrameResult`, layer snapshots/settling, restoration flags, a cold `mapStateChange` and non-graphics `commandError`. Composite restoration emits one state event; rendering/clock ticks do not emit it. Failed transforms retain the valid pose. Unsupported two-object/frame requests are diagnosed. Startup applies validated fields with animation/history suppressed and preserves the established explicit diagnostic epoch. Command failures do not trigger graphics retry.

Pose tests use independent analytic rotation/translation fixtures and the actual Earth/heliocentric frame tree at timeline boundaries. The planned existing independent Earth attitude fixture does not exist: this checkout has independent NAIF fixtures for Mars and Phase 3 bodies, plus Earth's Greenwich-noon/sidereal-day checks. Those science tests remain unchanged. This step makes no new independent Earth SPICE accuracy claim and introduces no science/provider change.

P4.3 installs the shared `(explore)` layout, catalog object pages/static params, checked friendly redirects and honest not-found/event pages. A pathname gate prevents hidden engines behind a 404. The Suspense route observer applies cold location commands; selection uses router.push for browser history and server metadata. Legacy root focus normalizes with router.replace without reapplying startup. Asynchronous creation/layer settling rereads the latest location before publishing the engine. Standalone lab Explore remains supported. Both production builds, 25 browser checks and configured all-21 metadata check are reviewed accepted October 3; see the P4.3 final review.

Server metadata contains only catalog names, descriptions and object kind. Optional SITE_URL accepts an explicit HTTP(S) origin without credentials/path/query/fragment. Canonical and OG absolute URLs are omitted if it is absent/invalid; request headers never supply a guessed deployment origin. The root canonical belongs to the overview page, rather than the global layout, so it cannot leak into unrelated routes. Charon retains the actual catalog ID `moon:charon`.

Next supplies decoded searchParams to pages, losing malformed-percent evidence. A small Proxy checks only one-segment friendly paths against the raw request query and the same codec before redirecting; the checked alias page remains a fallback. The first production run showed that Next also reconstructs decoded query parameters before Proxy by default. The installed `skipProxyUrlNormalize` option is now enabled to retain the original query, including malformed escaping, before codec validation. Object/static asset paths bypass that Proxy matcher. Web typechecking runs the installed `next typegen` first so moving pages cannot leave stale route validators.

All 21 catalog routes remain statically generated. Unknown parameter paths use the default dynamic fallback and the existing catalog checks call notFound in both page and metadata, with no hidden engine. This replaces `dynamicParams=false`, which returned correct 404 responses but logged internal NoFallbackError exceptions in the first pinned Next production run. The corrected production run verifies genuine HTTP 404 with clean server logs.

P4.4 still owns the 500 ms query-only replacement, complete selection/history/clipboard integration and restoration feedback guards. Clock ticks/free camera gestures do not write URLs in P4.3.

## P4.1 consequences and current limits

Safe legacy startup now consumes the codec for time/focus/layers/scale/view and diagnostic flags, preserving canvas ownership, obsolete-startup cleanup and one compatibility retry. Two small UI/store additions expose nonfatal link issues even when graphics fail. Known future layers can be requested but remain unavailable; current defaults include only the four available catalog layers.

P4.2 applies parsed frame settings and is reviewed accepted. P4.3 routes/metadata/lifetime are reviewed accepted. Continuous URL synchronization/sharing replacement arrives in P4.4. No providers, physical models, assets or scientific tolerances change. P4.2's exact orbit sampling endpoint correction preserves strict provider validity without changing those bounds or model output.
