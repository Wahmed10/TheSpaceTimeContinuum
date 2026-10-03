# P4.3 first production run: reviewed failure

October 3, 2026. Base `0b4b9f4`; uncommitted source SHA256 `a055da1a670a6e7fbc803c769f7d5337434250a0766e9149c88b78bb96effb9d`. Original candidate and all fourteen pre-existing generated evidence hashes remain unchanged. Raw snapshot/logs/traces remain in `.tools/phase-four/p4-3/`; adjacent `p4-3-first-{source,validation,browser,review}.json` preserve the result and hashed review.

**P4.3 is not accepted.** Production build, engine gzip (374,760 / 450,000 bytes), asset and license checks pass. Browser suite: 22 passed, three failed, no skips/flakes/report errors. Configured-origin build/metadata did not run after the browser gate failed.

All 21 unconfigured-origin HTTP metadata pages, genuine unknown/future/event 404s without a renderer, five direct-entry/refresh routes (including actual `moon:charon`), legacy-root normalization, six camera-state checks, URL/startup regressions, GPU precision/depth, LOW storage stability and original material references pass. Precision remains 0.134356 px against 0.5 px, with eleven depth probes. SwiftShader supplies functional evidence; no physical GPU or new CPU throughput claim is made.

Three failures require correction:

- The malformed friendly query `t=%FF&test=1` redirects with `test=1` retained. Next reconstructs decoded query parameters before Proxy by default, so malformed UTF-8 is replaced before validation. Installed Next docs/source identify `skipProxyUrlNormalize`; enabling it retains the original request for the existing strict codec. The expectation remains unchanged.
- The 20-selection test stalls before its first Sun selection because a textContent regexp assumes whitespace between nested name/kind labels. The actual accessible name is `Sun star · Solar system`. Use the exact accessible button name. All 20 engine/canvas identity, restoration count, subscription count and disposal assertions remain required.
- The startup test's header click is intercepted by the loading overlay. The trace shows requests held for 60 seconds, then navigation only after startup expires. Use the existing `/` keyboard shortcut to open the higher search dialog while startup is pending; release requests promptly and retain latest-route/lab checks. This corrects the test setup rather than lengthening the application deadline.

The pinned Next server also logs internal `NoFallbackError` for unknown object paths with `dynamicParams=false`, despite those requests passing strict HTTP 404 checks. Keep all 21 static params and the catalog notFound checks, use the default fallback, and require the next production run to prove genuine 404 responses with clean server logs. No framework patch or status-threshold relaxation is introduced.

The corrected source passes short verify (290 tests plus two existing expected rejections, 37 files). Its production/browser/configured-origin checks remain pending in a separate isolated retry; do not overwrite this first failure or publish P4.3 as complete.
