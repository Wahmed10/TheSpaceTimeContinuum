# Future enhancements

## Orbit loading and truncated-path explanation

October 5, 2026: the user completed the Phase4 UX walkthrough and explicitly deferred opinion-based design refinements. Planet orbit curves appear after the first scene frame because their adaptive sampling and correction-chunk requests run in the background. Preserve immediate rendering and current object positions. Future polish can add a subtle per-curve loading cue and improve scheduling without blocking the first frame or lowering accuracy.

The user also reported an open section in Neptune's orbit. The current curve interval is one period centered on the simulation date, clipped to the position provider's validated dates. The checked-in Neptune period is 60182 days, about 164.77 years. At October 5, 2026, that interval would end in February 2109, beyond the validated December 31, 2100 endpoint; the code deliberately leaves the arc open. This calculation is consistent with the report, but the exact reported screenshot was not reproduced. Future presentation can explain that truncation or distinguish a validated trajectory from any illustrative orbit. Do not connect unsupported endpoints or extend scientific validity just to make a closed curve. A different interior gap should still be investigated as a defect.

These refinements do not block Phase4 acceptance. The user plans to revisit design after the remaining implementation phases; this does not authorize starting a later phase now.

## Fine cartographic registration and controlled model upgrades

October 1, 2026: the Phase 3 surface audit resolves gross poles, longitude direction and seam offsets, including Ceres/Charon and the two Mars moon model frames. It does not certify survey accuracy. NASA visualization GLBs lack scientific frame declarations; Mars moon registration is inferred against independent PDS/JPL shapes from different generations, and Triton's processed visualization agrees with its independent browse mosaic only at coarse angular scale. Future upgrades should use explicit source-frame metadata, controlled image networks and matched shape/texture versions. Preserve the independent landmark/ray tests and source hashes, and re-audit replacement models instead of assuming a common glTF axis convention. See `docs/science/surface-registration-audit.md` for evidence and accuracy limits.

## Charon surface mosaic detail

October 2, 2026: user reports a blurry/smudged region beside sharper terrain. Inspection reproduces the region in the original 12693 by 6347 NASA New Horizons basemap before resizing/compression. Spacecraft coverage has uneven resolution; a larger texture cannot recover absent detail. Preserve the corrected geographic registration and observed imagery. Future source replacement must provide demonstrably better licensed coverage rather than upsampling or invented terrain. See [the investigation](science/surface-registration-audit.md#october-2-user-report-charons-blurry-region). The user subsequently accepted the explained limitation and confirmed Phase 4 readiness. Phase 3 is closed; preserve this source-imagery enhancement without claiming the blur was repaired.

## Io surface mosaic detail

September 27, 2026: user accepts the improved USGS color-merge Io map for now, but reports remaining blurry/smudged regions. Preserve this as a known visual limitation. Uneven spacecraft image resolution and mosaic processing leave some regions softer than others, especially near poles. Future work should evaluate improved licensed source coverage and seam/pole treatment, without inventing measured terrain or merely upsampling. This accepted limitation does not block the rest of Phase 3.

## Allocation-free upstream ephemeris calculation

Status: deferred enhancement, explicitly approved by the user on September 27, 2026. **Not a Phase 2 acceptance blocker or a prerequisite for Phase 3.**

ADR 0010 permits the remaining temporary state/time/intermediate objects inside the pinned, optimized astronomy-engine dependency. The implemented patch reduced sampled allocation by 71-85% in the investigated workloads and passed science, memory, browser and hosted CPU regression checks. This is not a claim of literal zero allocation.

Future work may introduce an upstream output-buffer API or equivalent internal implementation for planet, Moon, Galilean and Pluto calculations. Preserve independent public return-object ownership, frame/time conventions, exact upstream parity where applicable, and all external scientific tolerances. Measure transient allocation directly as well as retained growth; post-GC heap growth alone is not proof of zero allocation.

Until then, retain the existing first-party output-buffer contracts, <1 MB retained growth after 100,000 calls, and the 20% hosted CPU regression threshold. Reassess the exception when upgrading astronomy-engine or changing its patch. Do not reopen this enhancement as a phase-transition gate without a new user decision.
