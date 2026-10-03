# P4.3 production routes and renderer lifetime: accepted

October 3, 2026. Corrected isolated source based on `0b4b9f4`, SHA256 `b1f595fb4db7577e164d39ec705c184618e3a6adc3a10830720abd261dd7d41c`. The retry finished `2026-10-03T06:19:16.758Z`. Source and all fourteen prior generated-evidence hashes match; the original failed run remains preserved. Adjacent source/validation/browser/configured-metadata/review JSONs record the protocol and hashed review. Raw logs/captures remain in `.tools/phase-four/p4-3/retry-1/`.

All required checks pass review:

- Short verify: 290 tests plus two existing expected rejected-model diagnostics, 37 files; typecheck/lint/boundaries pass.
- Both isolated production builds, one without a site origin and one with explicit `https://continuum.example`, pass. Both server logs are clean. All 21 actual HTTP object pages contain catalog title/description/kind/OG metadata; canonical/OG absolute URLs are omitted when unconfigured and correct when configured.
- Main browser suite: 25 passed, zero failures/skips/flakes/report errors. Configured metadata check: one passed (all 21 objects and root), zero errors. Malformed friendly query flags are rejected; genuine unknown/cross-kind/future/event 404s have no renderer. Planet/moon/dwarf/star/Charon direct entry and refresh, legacy root normalization and latest startup selection pass.
- Twenty real client selections retain the same engine and canvas, issue one restoration per route, add no engine subscriptions and dispose once on About exit. Standalone lab still works. Canonical Charon and unavailable-event captures were inspected. Charon's existing source-resolution limitation is unchanged; current card/clutter improvements remain later UX work.
- Prior fourteen state/startup/URL/precision/visual checks pass. Eight original material references remain within their unchanged thresholds. GPU precision is 0.134356 px against 0.5 px with eleven passing depth probes. LOW textures remain 33 and compressed mip storage 16,516,088 bytes after twenty focus changes, with no pending textures.
- Engine gzip is 374,760 / 450,000 bytes; distributed assets remain 79,961,515 / 80,000,000 bytes; 72 production dependency licenses pass. Stage stderr is empty except the existing license checker's Node shell deprecation notice; wrapper/browser/build/server errors are absent.

This is SwiftShader functional evidence. P4.3 changes no engine frame-loop/scientific code, provider or asset, so the accepted P4.2 CPU pair remains the separate performance evidence. No new physical-device throughput is inferred. Full history/state synchronization and clipboard sharing are P4.4, not part of this acceptance.

Commit the scoped P4.3 runtime/docs/evidence locally, then continue approved P4.4. Do not stage the fourteen earlier generated diffs or rerun accepted P4.2/3 device gates.
