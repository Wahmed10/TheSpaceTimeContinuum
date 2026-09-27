# Hosted CI setup

## September 27: allocation patch comparison verified

[Same-runner comparison 36293066482](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36293066482) succeeded. Artifact `10922613287` is preserved in `cpu-allocation-paired-{reference,current,current-comparison,provenance}.json`. Reference commit is `1a77315050f0407220cda1237f1284a30afeede1`; candidate is `7603decd244c66d87053d778fbc247005f000c2f`. Both ran on the same Intel Xeon Platinum 8573C, Linux x64, Chromium 153. Recomputing the comparison locally exactly matches the hosted artifact. All five paths pass at 20%; all means decreased (0.53-19.44%), and the largest p95 increase was 8.33% (Earth LEO). These sampled timings do not establish zero allocation or a continuous performance bound.

No jobs remain pending from this investigation. The prior CPU-model mismatch remains preserved as an incomparable run, not relabeled as a pass. The allocation optimization has passed hosted Verify and paired CPU comparison. ADR 0010 proposes a scoped exception to literal zero allocation for the remaining upstream objects; it is not approved. Phase 3 remains unstarted. This section supersedes the historical pending-run descriptions below.

## Pending allocation-patch verification

Commit `134a6fa903db205ceab7e87da8f496128cbe200d` contains the allocation optimization described in ADR 0010. [Verify run 36292258154](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36292258154) passed its verification, memory-growth, build and browser jobs. [CPU comparison run 36292258142](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36292258142) failed with `Incomparable CPU environment: cpuModel`: the saved reference used AMD EPYC 7763, while GitHub assigned AMD EPYC 9V45. This is an environment mismatch, not a measured >20% regression or a comparison pass. Artifact `10922428434` is preserved as `cpu-allocation-patch-mismatched-runner.json`; the original baseline is unchanged.

The hosted workflow now measures the immutable reference commit `1a77315050f0407220cda1237f1284a30afeede1` and candidate sequentially on the **same runner**, using separate checkouts and ports. Both raw reports, comparison, server logs and commit provenance are uploaded. Reference server/browser processes stop before the candidate is measured. The same schema/configuration/environment checks and 20% mean/p95 threshold apply. This avoids retrying for a lucky CPU assignment, comparing unlike hardware or silently accepting the new implementation as its own baseline. The historical Linux baseline remains preserved as evidence. A fresh hosted run must verify this orchestration.

Remaining literal zero-allocation work/decision is documented in ADR 0010; no exception or Phase 3 implementation is authorized.

Pending review: [same-runner comparison 36293066482](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36293066482), dispatched for `7603decd244c66d87053d778fbc247005f000c2f` in compare mode and confirmed queued. It will run the reference and candidate sequentially and therefore takes longer than a single capture. End the turn while it runs. On return, review this run's artifact and provenance before starting anything else; no pass is yet claimed.

The user authorized using https://github.com/Wahmed10/TheSpaceTimeContinuum for Phase 2 CI. The initially empty public repository is now configured as `origin`. Phase 3 remains explicitly unstarted.

The Phase 2 checkout was published to `main` at `200ec29bfe73186bc40e407e5e4e4347cabcf064`. Local `main` tracks `origin/main`.

## Initial hosted results

- [Verify run 36277070443](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36277070443) succeeded: 116 unit tests plus two expected rejected-model diagnostics, typecheck, lint, licences, asset manifest/budget, bundle budget and production build. All 16 browser tests passed (8.6 minutes). The hosted engine bundle is 368,185 / 450,000 gzip bytes.
- [CPU record run 36277081073](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36277081073) completed all five measurement paths and exited successfully. However, upload-artifact excluded the hidden `.tools` directory by default and uploaded no report. Its successful job status is **not** a retained/reviewed baseline or a regression-comparison pass.

The CPU uploader now explicitly includes hidden files, restricted to the two existing CPU JSON/log path patterns, and fails if no files are found. A fresh record run is required to retain the full environment and scheduling metadata. Do not reconstruct a baseline from the abbreviated console timing table. The local Windows baseline is not a Linux reference.

Next: download and review the fresh Linux artifact, preserve the candidate with its run/commit provenance, run a matching hosted comparison at the unchanged 20% threshold, then enable automatic CPU comparison. The record/compare workflow remains manual until that evidence exists.

The root `AGENTS.md` makes the user's long-job preference a repository-wide instruction: launch, record the run link, end the turn, and review results when they return. Do not repeatedly poll while waiting or call queued/running work a pass.

## Reviewed Linux baseline

[CPU record run 36277869074](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36277869074), for `1a77315050f0407220cda1237f1284a30afeede1`, succeeded and retained artifact `10917702875` (`cpu-performance-evidence`). Its report is preserved byte-for-byte as `docs/perf/cpu-baseline-linux-x64.json`, SHA256 `1691E9CE887C2FCE900CB1BF4D305A1CAD4B09BF3858D7A29A3572519F4349BA`.

Reviewed configuration: schema 2, Linux x64, AMD EPYC 7763, Chromium 153.0.8010.12, Node 24.21.0, WebGL2/SwiftShader LOW, 1440x1000 DPR 1, 21 entities, 120 measured plus 30 warmup frames per path. All five paths have eight clock events and eight UI updates. Mean CPU durations range 2.204-2.8025 ms; p95 ranges 4.5-6.0 ms. The report passes structural/configuration validation and is accepted as the initial hosted reference for a repeatability check, not as proof of an independent comparison pass.

## Independent hosted comparison: passed

[Comparison run 36278590782](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36278590782) succeeded in `compare` mode for `a399d63f49a019c966f3f84d77955c7c395fdbef`. Artifact `10917843065` contains the full report and passing comparison, preserved as `cpu-linux-repeat.json` and `cpu-linux-repeat-comparison.json`. Recomputing the comparison locally matches the hosted artifact exactly. CPU model, browser, configuration and scheduled work match the baseline.

All five mean/p95 checks pass the unchanged 20% threshold. Maximum mean increase: 1.12% (Solar System); maximum p95 increase: 6.38% (Earth-Moon zoom). This is hosted CPU regression evidence, not physical GPU performance evidence.

The CPU workflow now runs in compare mode on pushes to `main` and pull requests, with explicit manual record/compare retained. The trigger-only change does not alter the already-tested measurement/comparison commands; its publication uses `[skip ci]` to avoid an unnecessary repeat of the same workload. Future eligible pushes/PRs will exercise automatic dispatch. No further long run is currently pending from this review.

P2.10 hosted execution, saved baseline and independent comparison are verified. Do not re-record the baseline merely because a later comparison fails or GitHub assigns a different CPU model. Remaining Phase 2 allocation/device requirements are unchanged; Phase 3 remains unstarted.

User originals under `test-results/`, local tools, dependencies and environment files remain ignored. Preserved device evidence copies and the implementation handoffs are part of the project.
