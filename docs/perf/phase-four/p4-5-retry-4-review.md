# P4.5 retry-4 reviewed failure

43/44 cases pass; no skips/flakes/report errors. All prerequisite stages, server logs and independent source/root/candidate/preserved hashes pass. Both actual Radeon 780M response profiles pass every 300 ms sample.

The strengthened history precondition incorrectly expects one low-level replaceState call. It observes two identical command-anchor URLs. Pinned Next app-router.js dispatches ACTION_RESTORE from its native-history patch, then HistoryUpdater replaces the same URL using internal __NA state. Distinguish the external command from that framework commit; retain all zero-extra-write and history/share/reload assertions after both settle. This is an instrumentation correction, not permission to allow playback URL writes. No runtime change is justified by this result.

Run the corrected focused test before another full validation. P4.5 remains unaccepted. Original logs/trace remain in .tools/phase-four/p4-5/retry-4/.
