# CI repair validation

The published Verify workflow mixed functional checks, React profiling and physical GPU measurements in one development-server job. It ran for about 73 minutes and failed. Source lint also scanned an archived report. The repair uses a production server, three independent bounded compatibility shards and a separate profiling build. The 13 physical tests remain available through their dedicated configuration with their original thresholds; software rendering does not establish those gates.

Local validation on the isolated repair candidate passed all 112 functional browser cases in 18.2 minutes with no retries or skips, alongside type checks, source lint, boundaries, 518 unit tests and two expected diagnostics, and the production build. All three unchanged production profiling cases passed in the earlier repair run. Dependency credits cover 73 production dependencies; distributed textures use 79.96/80 MB and the engine bundle uses 380,494/450,000 gzip bytes.

Legacy tests now use current search, card, layer and playback controls. GPU reuse baselines pause the test clock, await the engine's existing focus-relevant orbit settlement and GPU submission, then retain exact before/after resource comparisons. Moon focus rejects loading positions while preserving truthful approximate results, screen centering and physical-metric assertions. Runtime chunk checking canonicalizes textual line endings; all 2,623 existing binary chunks verify unchanged on Windows.

Raw results and exact source manifests remain in `.tools/phase-five/ci-repair-20261005-run4/`; earlier failed runs are retained separately. The review checks frozen source identity, 321 immutable Phase 4 artifacts/captures and 14 unrelated root evidence files. Generated browser evidence is excluded from this repair commit. Root user work remains untouched.

Hosted revalidation remains required. Phase 4B.4 still requires an actual scheduled ingestion that creates a new successful write, followed by matching API/status readback. The earlier successful manual smoke was due-suppressed and does not complete that gate. Phase 5 has not been accepted by these CI repairs.
