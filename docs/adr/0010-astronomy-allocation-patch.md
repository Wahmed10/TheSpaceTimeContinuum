# ADR 0010: reduce upstream astronomy allocation without changing ephemerides

Status: optimization implemented and verified; full zero-allocation acceptance is **not** claimed. Hosted Verify (including science, memory and browser jobs) passed in run `36292258154`. CPU comparison run `36292258142` was rejected because GitHub assigned a different CPU model. Same-runner reference/candidate run `36293066482` subsequently passed all five paths at the unchanged 20% threshold; see `docs/perf/hosted-ci.md`. The user explicitly approved the scoped exception on September 27, 2026; Phase 2 acceptance is closed under that exception. Literal zero allocation is a deferred enhancement, not an achieved property.

## Investigation

P2.2 requires zero allocations per `stateAt`, with a 100,000-call retained-growth test. These are different properties: an after-GC heap test cannot detect discarded objects. The earlier retained-growth checks passed while source inspection identified upstream temporary objects.

`tools/profile-allocations.mjs` now records separate uninstrumented 100,000-call timings/GC events and V8 statistical allocation samples over 10,000 changing epochs. Sampling includes objects collected by minor and major GC. `docs/perf/allocations-before.json` and `allocations-after.json` preserve the initial same-machine investigation. They are diagnostics, not browser frame-time acceptance or exact allocation counts. Retained-growth values in this diagnostic include profiler/observer bookkeeping and must not replace `profile-phase-two.ts`'s existing gate. GC counts and timing can vary with process heap state and JIT behavior; a single before/after run is not a statistical performance bound.

Dominant sampled sites were VSOP and Galilean coefficient destructuring loops, lunar nested scratch arrays, and the lunar `Term` calculation's objects/arrays/callbacks.

## Change

Apply a pinned pnpm patch to astronomy-engine 2.1.19, covering its exported CommonJS and ESM entrypoints. The package's MIT attribution is retained. No coefficients, dates, units, physics, public signatures or calculation order are intentionally changed.

- Read coefficient tuples with indexed loops rather than destructuring iterators.
- Replace the Moon's per-call nested scratch-array objects with two fixed private Float64Arrays, cleared before each call.
- Calculate lunar terms using scalar locals, one call-local result object and direct arithmetic instead of an array and closure per term.

Lunar scratch does not escape, and the private calculation is synchronous with no external callbacks. Each worker/module instance has its own storage. Public time/state results remain independently owned; no externally observable public object is pooled or mutated after return. The minified/browser standalone bundles are not modified because this application imports only the package's declared ESM/CommonJS exports; do not deep-import the other bundles and assume they contain the optimization.

## Evidence

| Workload | Reduction in sampled allocation | 100k-call time before / after |
|---|---|---|
| Earth provider | 84.92% | 1235.39 / 843.48 ms |
| Moon provider | 71.50% | 2653.72 / 1586.57 ms |
| Callisto/shared Galilean calculation | 82.97% | 341.44 / 234.13 ms |

The first-party Kepler control showed no observed GC during its timed workload; its nonzero allocation samples also illustrate why statistical sampling must not be described as exact proof of zero allocation.

An independent fixture captures the **unmodified** upstream implementation at 33 TT epochs over 1900-2100 for 11 barycentric bodies and four Galilean moons (495 six-component states). Tests exercise both package entrypoints, reverse chronology, intervening Moon calculations and retained public outputs. They require exact numeric equality, not a relaxed tolerance. Existing JPL holdout/science tests remain the external accuracy checks; parity alone would also preserve any upstream error.

Regenerate this fixture only with `node tools/fixtures/capture-astronomy-parity.mjs <unmodified-astronomy.js>`. The generator rejects any source except SHA256 `729c0ce37cc1a8096034a689039a5f04585ee8184177c638e8c74dec4fa3185a`, the original npm 2.1.19 CommonJS file. Never regenerate from the patched dependency to make a failure disappear. Keep the pinned patch and parity fixture when updating the lockfile; review/rebase explicitly when upgrading astronomy-engine.

## Approved scoped exception — September 27, 2026

The user explicitly approved permitting the remaining temporary state/time/intermediate objects inside the pinned, optimized astronomy-engine dependency and requested that literal zero allocation be recorded as a future improvement. Phase 2 acceptance is closed with this exception and the separately accepted device coverage.

Keep the first-party output-buffer contracts, unchanged scientific tests, existing <1 MB retained growth after 100,000 calls, and hosted 20% CPU regression limit. Reassess the exception when changing the dependency or patch. This changes the literal P2.2 requirement; it does not claim zero allocation or reinterpret retained-growth measurements as allocation counts.

Upstream StateVector, AstroTime, VSOP intermediate vectors and other return objects still allocate. A broader output-buffer API/internal rewrite, including Moon and Pluto paths, is now tracked in [future enhancements](../ENHANCEMENTS.md). It is not a prerequisite for Phase 3. Phase 3 implementation was not started in this acceptance/documentation turn.
