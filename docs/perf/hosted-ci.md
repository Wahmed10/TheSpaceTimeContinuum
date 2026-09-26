# Hosted CI setup

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

Next run must use mode `compare` against this reference at the unchanged 20% mean/p95 threshold. Automatic triggers remain pending its result. Do not re-record the baseline merely because a comparison fails or GitHub assigns a different CPU model.

User originals under `test-results/`, local tools, dependencies and environment files remain ignored. Preserved device evidence copies and the implementation handoffs are part of the project.
