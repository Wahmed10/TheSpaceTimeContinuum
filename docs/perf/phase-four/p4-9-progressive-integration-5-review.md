# Progressive integration5 reviewed automated acceptance - October5,2026 UTC

**All P4.9 automated gates pass independent review. Final Phase4 acceptance awaits the user changed-UX walkthrough required by the approved plan.** No validation job remains running. This record preserves prior failed reports and does not alter their verdicts.

Full verify:480 passed unit/science checks plus2 expected rejected-model diagnostics across56files; typecheck/lint/package boundaries pass. Five driver default/identity/failure-collection checks pass. All108 normal-production browser cases/22files,4 performance cases and3 separate production profiles pass, with zero skips/retries/flakes/report errors. Builds, assets79961515/80000000 bytes, licenses, original material references, source/provenance and preserved-evidence checks pass.

| Measured gate | Worst measured result | Original limit |
|---|---:|---:|
| First actual painted desktop frame,5cold samples | 901.0ms | 2500ms |
| First actual painted simulated4G frame,5cold samples | 4421.1ms | 5000ms |
| Actual startup transfer | 929385bytes | 1500000bytes |
| Conservative build startup budget | 1074869bytes | 1500000bytes |
| Five uncached desktop date jumps | 112.9ms | 1000ms |
| CPU mean increase,all3pairs/all5paths | 3.61% | 20% |
| CPU p95 increase,all3pairs/all5paths | 12.50% | 20% |
| Physical desktop HIGH WebGL2 p95,5views | 12.2ms | 16.7ms |
| Physical desktop HIGH WebGPU p95,5views | 12.1ms | 16.7ms |
| Lazy engine gzip | 380494bytes | 450000bytes |
| Route shell,root/Earth/Charon | 196576/192943/192943gzipbytes | 200000bytes/route |

The first-frame markers follow actual paint. Startup request accounting includes late completion of pre-paint requests. Desktop protocol100Mbps/20Mbps/20ms/CPU1; simulated4G4Mbps/1Mbps/150ms/CPU4. Viewport/CPU/network emulation is not new physical-phone thermal/throughput or total-VRAM proof; accepted prior device coverage remains closed.

All five date jumps (112.9, 43.9, 47.7, 41.4, 36.2ms) continue rendering and reach the exact requested epoch/rendered cache revision with all21 current positions. Six sourced orbital models retain honest approximate certainty; corrected analytic positions become ready. First progress records show fresh approximate Earth while the six models load, not stale positions. Optional KTX concurrency stays<=2; no texture-settle wait or global scene freeze is counted as readiness. Forward/reverse1year/sec runs each record480 actual RAF snapshots over4s after1s initial acquisition, cross53 fixed time indices and show no missing current data; cache stays<=8MiB. Existing4s/>40-boundary protocol is unchanged.

All2623 fixed28Julian-day bundles are byte-verified against the accepted source model; maximum correction6624/8192bytes, combined10568/16384bytes. All correction and sixmodel boundary tests plus independent Horizons/off-grid/geocentric tolerances pass. The raw astronomy precision audit and compact exact polynomial correction rationale remain unchanged. Missing corrections retain fresh approximate positions. Desktop/mobile preview→1K→sharp/mobile1K and immutable fixed-range headers pass.

## CPU comparisons

Three pairs were declared before launch and measured sequentially reference→candidate, on the same Ryzen7 8845HS/Windows/Node24.12.0/Chromium153 runner. Both sides use ordinary dev builds with SwiftShader WebGL2 LOW1440x1000/DPR1/21bodies/fixed2026-09-22/rate1/120samples+30warmup/path,8clock+8perf updates. Reference remains4409ef5d8f97299d9058360c97d560493d067c1c. Each of the15 paths passes both mean and p95 independently; no pair selection, outlier filtering, cross-pair averaging, instrumentation or substituted reference.

| Pair | Path | Mean reference/candidate ms | Mean change | p95 reference/candidate ms | p95 change |
|---|---|---:|---:|---:|---:|
| 1 | solar-orbit | 1.712 / 1.643 | -4.04% | 2.800 / 2.900 | 3.57% |
| 1 | earth-leo | 1.696 / 1.575 | -7.13% | 2.700 / 2.600 | -3.70% |
| 1 | moon-orbit | 1.517 / 1.462 | -3.63% | 2.800 / 2.400 | -14.29% |
| 1 | mars-orbit | 1.454 / 1.429 | -1.72% | 2.400 / 2.200 | -8.33% |
| 1 | earth-moon-zoom | 1.471 / 1.394 | -5.21% | 2.300 / 2.100 | -8.70% |
| 2 | solar-orbit | 1.645 / 1.601 | -2.68% | 2.400 / 2.700 | 12.50% |
| 2 | earth-leo | 1.616 / 1.674 | 3.61% | 2.500 / 2.700 | 8.00% |
| 2 | moon-orbit | 1.523 / 1.392 | -8.59% | 2.500 / 2.300 | -8.00% |
| 2 | mars-orbit | 1.526 / 1.402 | -8.08% | 2.500 / 2.200 | -12.00% |
| 2 | earth-moon-zoom | 1.452 / 1.325 | -8.78% | 2.400 / 2.100 | -12.50% |
| 3 | solar-orbit | 1.633 / 1.595 | -2.35% | 2.600 / 2.500 | -3.85% |
| 3 | earth-leo | 1.638 / 1.604 | -2.04% | 2.600 / 2.400 | -7.69% |
| 3 | moon-orbit | 1.428 / 1.463 | 2.45% | 2.400 / 2.200 | -8.33% |
| 3 | mars-orbit | 1.482 / 1.408 | -5.00% | 2.400 / 2.100 | -12.50% |
| 3 | earth-moon-zoom | 1.380 / 1.412 | 2.29% | 2.100 / 2.300 | 9.52% |

The production change calculates each orbit vertex once and writes the same shared endpoint buffer directly. Byte-exact tests preserve Float64 rebase/multiply/add order before Float32 upload, geometry/styles/data and one dirty revision. Isolated diagnostic upload work falls, but prior intermittent10-29ms spikes were not reproduced or conclusively attributed. This acceptance establishes compliance at the tested source/protocol, not the sole cause of all historical spikes. The original acceptance harness retains aggregate statistics; it does not save per-frame raw samples. Prior failed gates and three diagnostic reviews remain available.

## Capture, accessibility and profile review

All8 original material reference comparisons retain1.5% tolerance. All67 readiness records (8material+11ring+48body) require2new centered detailed submitted frames/current epoch+revision/29settled maps. All128 captures are accounted:98 byte-identical to independently rehashed previously inspected integration4 images,30 newly inspected in2contact sheets. Consumer controls/modals/cards/list/UTC/keyboard/mobile/history, physical True/Explore systems and temporary preview/approximate states remain coherent. Scientific precision600samples<0.5px/all11depth,texture stability,14axe scans plus resolved contrast/native-keyboard supplements pass.

Separate production profiles: overview74commits/30s and card/list81commits/30s; every30 one-second bin<=4, actual playing86400 rate and29+days advance, expected open subtree and no measured history writes. Original lab68commits/30.027s. Profile build is separate from normal-production performance and from ordinary-dev CPU comparisons.

## Source and remaining review

HEAD035fc967ed9ba88550773ea8f757fd5ff905d23c plus snapshotSHA95e97a1ee10e912119162931eb0878b39a4537e9b75c9c1e6de7667912565e86; all3091root/candidate files,220 immutable reference files,14 preserved user artifacts and13 frozen provenance inputs independently matched before documentation follow-up. Exactly6 changes from integration4,3085 other files unchanged; science/providers/chunks/clock/FrameTree/material assets/original references/CPU thresholds are identical. Root user dev3000/PID3664 stays running; job-owned3001/3002 are stopped. No root production build, push/deploy, Phase4B/5 or memory update.

The approved Phase4 plan requires final changed-UX review: refresh an object link; select another body and use Back/Forward; keyboard search/card/UTC time; narrow/mobile sheet/search keyboard/layers; settings and reduced motion. No repeat science/source/Charon/device acceptance is required. Detailed walkthrough and durable continuation are in PHASE_4_IMPLEMENTATION_HANDOFF.md. Final phase acceptance remains pending this user review.

AdjacentJSON inventories193 hashed raw reports/logs/manifests/scripts and128 captures. Complete originals: .tools/phase-four/p4-9/progressive-integration-5. Status: node tools/phase-four-status.mjs.
