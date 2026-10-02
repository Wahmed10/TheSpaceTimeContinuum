# 0011 — Validated consumer route state and camera references

October 2, 2026. Phase 4 plan approved by the user before P4.1 implementation.

## Context

Renderer startup previously read raw focus/date/scale/layer values, separately from sharing. A malformed date could fail graphics initialization. Core consumer routes need one bounded state contract before navigation/history integration. The general domain MapState also accepts fields intended for later event data; the consumer URL must not promise unsupported restoration.

## Decision

`apps/web/src/lib/routeState.ts` owns pure public parsing/normalization/serialization. It resolves only catalog members, gives canonical object routes precedence over legacy focus queries, distinguishes absent/default layers from an explicitly empty list, rejects duplicate state fields, orders known layers deterministically and rejects malformed percent encoding/UTF-8 before URLSearchParams can replace it. Unknown bounded query keys are ignored. A malformed query uses defaults for all its fields while retaining a valid object path. Overlong query state likewise falls back without discarding a bounded valid path.

External dates require explicit offsets and valid calendar components within the existing 1900–2100 clock range. Normalize to UTC milliseconds. Dated links start paused; absent/rejected time stays LIVE, except an explicit existing test flag preserves deterministic diagnostics. UTC-labelled picker adapters do not use the browser's timezone. Invalid input produces bounded accessible explanations and cannot reach astronomy conversion unchecked.

Public URL state is focus/time/layers/scale, plus `earth|helio|earth-fixed` frame aliases and `close|wide` semantic presets. Exact camera floats, follow/playback rate, secondary targets, fit-both and event-window scheduling are excluded. The serializer rejects unsupported states; diagnostic flags are separate. Compatibility links add `renderer=webgl` while retaining the same public state.

The domain frame schema validates FrameId syntax, including registered namespaces such as `ICRF_BODY:registered/sat:25544`, independently of static catalog membership. General event MapState contracts remain available for later phases.

The approved P4.2 frame design uses camera-only reference transforms through the existing scientific FrameTree. Physical states and metrics remain ICRF/SSB float64 km. Frame switching preserves the world pose; follow tracks the target in that reference, and follow-off retains a frame-relative center. Earth-fixed axes evolve with the scientific Earth attitude. Preserve the existing SSB default fast path. See the approved plan for tests/performance gates; these behaviors are not yet implemented in P4.1.

P4.3/P4.4 retain the renderer in a shared route layout. Object selection uses router.push for browser history and metadata; query-only replacement is debounced 500 ms. Clock ticks and free camera gestures do not write URLs. The bridge will own accepted state and prevent restoration feedback. These navigation behaviors are not yet implemented in P4.1.

## P4.1 consequences and current limits

Safe legacy startup now consumes the codec for time/focus/layers/scale/view and diagnostic flags, preserving canvas ownership, obsolete-startup cleanup and one compatibility retry. Two small UI/store additions expose nonfatal link issues even when graphics fail. Known future layers can be requested but remain unavailable; current defaults include only the four available catalog layers.

The codec supports canonical/friendly resolution for future route integration, but Next object/alias/event pages are not installed until P4.3. Parsed frame settings are currently reported as unrestored instead of silently claimed applied; P4.2 supplies that implementation. Continuous URL synchronization/sharing replacement arrives in P4.4. No providers, physical models, assets or scientific tolerances change.
