# P4.7 reviewed acceptance

Immutable retry-2 passed three prior-failure regressions, all 20 focused cases and all 64 production cases, with zero skipped, flaky, unexpected or report errors. Local verification passed 396 tests plus two expected rejected-model diagnostics in 44 files. Install, build, assets, licenses, engine budget and clean server logs passed.

Independent hashes match all 317 source files in root and candidate and all fourteen unrelated evidence files. Base: `36f7a9852acf2e2a62be39fab4d24b5533572767`; tested source SHA256: `99ec507821146caba9ef7a06055214e3e6bd6dd53a9ccc994044988602489a51`. Raw artifacts and the separately hashed [review](p4-7-final-review.json) are adjacent. Earlier failed runs remain preserved.

All 27 captures were inspected and published under `docs/perf/screens/p4-7-*`. The six controls, honest empty events drawer, requested versus actual settings, unavailable layers, UTC controls, search results, link recovery, card provenance and mobile snaps remain readable and reachable. Short-height cards require internal scrolling. Mobile time sits above the sheet. UTC input focus-outline spacing is included in the P4.8 accessibility audit.

Warm lookup maximum is 0.6029 ms across 1000 samples. Actual Radeon 780M scene adapters pass every 300 ms response: desktop input/selection maxima 147/45.5 ms and phone viewport 17.2/42 ms. Phone is desktop-GPU emulation; functional cases use SwiftShader. This does not establish physical phone throughput. Precision maximum is 0.134356 px across 600 samples with all eleven depth probes passing. Twenty focus changes leave 33 textures, 16,516,088 compressed mip bytes and no pending textures. Engine gzip is 374,840 bytes; assets 79,961,515 bytes; 72 dependency licenses pass.

This accepts P4.7 controls and responsive shell. Desktop navigation long task maximum 265 ms exceeds the final 50 ms target. Complete-subtree React, shell attribution, cold startup, settled navigation and physical-device gates remain P4.9. The accepted P4.2 CPU pair remains separate; P4.7 introduced no engine/frame/provider/physics/asset changes. P4.8 and P4.9 are authorized. No Phase 4B, push or deployment.
