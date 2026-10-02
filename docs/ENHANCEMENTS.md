# Future enhancements

## Fine cartographic registration and controlled model upgrades

October 1, 2026: the Phase 3 surface audit resolves gross poles, longitude direction and seam offsets, including Ceres/Charon and the two Mars moon model frames. It does not certify survey accuracy. NASA visualization GLBs lack scientific frame declarations; Mars moon registration is inferred against independent PDS/JPL shapes from different generations, and Triton's processed visualization agrees with its independent browse mosaic only at coarse angular scale. Future upgrades should use explicit source-frame metadata, controlled image networks and matched shape/texture versions. Preserve the independent landmark/ray tests and source hashes, and re-audit replacement models instead of assuming a common glTF axis convention. See `docs/science/surface-registration-audit.md` for evidence and accuracy limits.

## Io surface mosaic detail

September 27, 2026: user accepts the improved USGS color-merge Io map for now, but reports remaining blurry/smudged regions. Preserve this as a known visual limitation. Uneven spacecraft image resolution and mosaic processing leave some regions softer than others, especially near poles. Future work should evaluate improved licensed source coverage and seam/pole treatment, without inventing measured terrain or merely upsampling. This accepted limitation does not block the rest of Phase 3.

## Allocation-free upstream ephemeris calculation

Status: deferred enhancement, explicitly approved by the user on September 27, 2026. **Not a Phase 2 acceptance blocker or a prerequisite for Phase 3.**

ADR 0010 permits the remaining temporary state/time/intermediate objects inside the pinned, optimized astronomy-engine dependency. The implemented patch reduced sampled allocation by 71-85% in the investigated workloads and passed science, memory, browser and hosted CPU regression checks. This is not a claim of literal zero allocation.

Future work may introduce an upstream output-buffer API or equivalent internal implementation for planet, Moon, Galilean and Pluto calculations. Preserve independent public return-object ownership, frame/time conventions, exact upstream parity where applicable, and all external scientific tolerances. Measure transient allocation directly as well as retained growth; post-GC heap growth alone is not proof of zero allocation.

Until then, retain the existing first-party output-buffer contracts, <1 MB retained growth after 100,000 calls, and the 20% hosted CPU regression threshold. Reassess the exception when upgrading astronomy-engine or changing its patch. Do not reopen this enhancement as a phase-transition gate without a new user decision.
