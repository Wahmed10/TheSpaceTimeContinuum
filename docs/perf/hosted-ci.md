# Hosted CI setup

The user authorized using https://github.com/Wahmed10/TheSpaceTimeContinuum for Phase 2 CI. The initially empty public repository is now configured as `origin`. Phase 3 remains explicitly unstarted.

The Phase 2 checkout was published to `main` at `200ec29bfe73186bc40e407e5e4e4347cabcf064`. Local `main` tracks `origin/main`.

## Initial hosted results

- [Verify run 36277070443](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36277070443) succeeded: 116 unit tests plus two expected rejected-model diagnostics, typecheck, lint, licences, asset manifest/budget, bundle budget and production build. All 16 browser tests passed (8.6 minutes). The hosted engine bundle is 368,185 / 450,000 gzip bytes.
- [CPU record run 36277081073](https://github.com/Wahmed10/TheSpaceTimeContinuum/actions/runs/36277081073) completed all five measurement paths and exited successfully. However, upload-artifact excluded the hidden `.tools` directory by default and uploaded no report. Its successful job status is **not** a retained/reviewed baseline or a regression-comparison pass.

The CPU uploader now explicitly includes hidden files, restricted to the two existing CPU JSON/log path patterns, and fails if no files are found. A fresh record run is required to retain the full environment and scheduling metadata. Do not reconstruct a baseline from the abbreviated console timing table. The local Windows baseline is not a Linux reference.

Next: download and review the fresh Linux artifact, preserve the candidate with its run/commit provenance, run a matching hosted comparison at the unchanged 20% threshold, then enable automatic CPU comparison. The record/compare workflow remains manual until that evidence exists.

The user requests that long jobs be launched with a link and the turn ended; do not repeatedly poll while waiting. Resume result review when they return. This preference does not authorize calling queued/running work a pass.

User originals under `test-results/`, local tools, dependencies and environment files remain ignored. Preserved device evidence copies and the implementation handoffs are part of the project.
