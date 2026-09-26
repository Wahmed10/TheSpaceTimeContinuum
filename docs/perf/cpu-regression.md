# CPU regression harness

P2.10 has a five-path Playwright runner and a fail-closed comparator. It measures `performance.now()` around complete engine frames, including render submission and synchronous bridge events, excluding the RAF wait. It does not measure GPU execution or establish physical-device FPS acceptance.

Run against a started dev server:

```powershell
pnpm.cmd perf:cpu --output .tools/cpu-current.json
pnpm.cmd perf:cpu --output .tools/cpu-current.json --baseline docs/perf/cpu-fixed-initial.json
```

Defaults: forced WebGL2/SwiftShader, 1440x1000 CSS viewport, DPR 1, LOW, True scale, September 22 2026 starting date advancing at 1x, original 21-body catalog, 30 warmup + 120 recorded frames per path. Schema 2 drives simulation and UI scheduling with integer timestamps on a fixed 60 Hz schedule, while measuring CPU duration using the real performance clock. Paths are Solar System orbit, Earth LEO, Moon orbit, Mars orbit, and Earth–Moon zoom across semantic/LOD boundaries. RAF timing remains a separate existing measurement. The dedicated test page restores map/clock/quality settings afterward; it is not intended for concurrent user interaction. Keep builds, other benchmarks and source edits out of measurement runs.

Comparison requires schema 2, all five paths, finite positive mean/p95, matching sample counts, clock/UI update counts, start time, clock rate, viewport, backend, tier, entity count, platform, architecture, CPU model and Chromium major version. Either mean or p95 more than 20% above its matching baseline fails. Missing baselines, malformed reports and environment mismatches also fail; they never count as a pass. The runner always writes the current evidence before comparison. Baselines are reviewed evidence, not automatically overwritten after failures.

The original schema 1 reports (`cpu-local-initial.json`, `cpu-local-repeat.json`, and their comparison) remain preserved: Earth–Moon zoom p95 increased 26.32%, failing the unchanged 20% threshold. That protocol paused simulation and scheduled UI work against variable software-renderer RAF timing. It therefore omitted repeated ephemeris work and did not keep scheduled work constant. Schema 2 corrects those issues; its reports cannot be compared against schema 1 or used to relabel that failure as a pass.

## September 26 local repeatability evidence

`cpu-fixed-initial.json` and `cpu-fixed-repeat.json` use schema 2 on Windows x64, Ryzen 7 8845HS, Chromium 153, WebGL2/SwiftShader. Every path records eight clock events and eight UI updates in both runs. `cpu-fixed-repeat-comparison.json` passes all five paths at the unchanged 20% threshold. The largest p95 increase is 10.34% (Solar System); no mean increased. Initial means are 1.72–2.08 ms and p95 values 2.7–3.3 ms; repeat means are 1.27–2.00 ms and p95 values 2.0–3.2 ms.

This pair checks the runner and local comparison, not long-term variance or hardware rendering performance. The larger decreases on later paths still show ordinary runtime variation. The initial report is a local reference candidate, not an approved hosted baseline.

## Hosted CI status

This checkout has no Git remote. No hosted run or approved Linux baseline is claimed. `.github/workflows/cpu-perf.yml` is a manually dispatched bootstrap workflow on Ubuntu 24.04. Record mode uploads candidate evidence. Review it, preserve a matching `docs/perf/cpu-baseline-linux-x64.json`, and use compare mode to enforce the unchanged 20% threshold. Then enable push/pull-request triggers. Hosted runners can change CPU model; the comparator will reject a mismatched machine rather than silently compare unrelated hardware. A stable runner is preferable for an enforced gate.

The existing Verify workflow remains unchanged. P2.10 hosted/automatic acceptance stays pending until this bootstrap is actually performed. A Windows SwiftShader report is local evidence and must not be renamed as a Linux CI baseline or physical GPU evidence.
