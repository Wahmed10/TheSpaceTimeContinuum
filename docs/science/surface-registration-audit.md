# Phase 3 surface registration audit

October 1, 2026. Scientific FIXED-frame attitude and geographic registration are distinct: the former is checked against SPICE; the latter also depends on the image projection or model coordinate frame.

## Io: projection registration verified

The [USGS color-merge mosaic](https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km) supplies an [ISIS label](https://astrogeology.usgs.gov/ckan/dataset/0fc15885-24ee-4d9d-9666-11de0667c10c/resource/91c2447c-1932-48e5-b33c-c199db865805/download/io_galileo_ssi_global_mosaic_clrmerge_1km.lbl). The archived copy is `docs/licensing/io-map-projection.lbl`. It declares SimpleCylindrical, planetocentric latitude, center longitude zero, positive-west coordinates, a 1821460 m radius and a 1000 m pixel scale.

PositiveWest does **not** imply that image columns must be mirrored. The [USGS ISIS SimpleCylindrical implementation](https://github.com/DOI-USGS/ISIS3/blob/dev/isis/src/base/objs/SimpleCylindrical/SimpleCylindrical.cpp) converts west-positive longitude to east-positive angle before calculating projected X. Source image columns therefore advance eastward. The current engine image orientation is correct.

The independent projection check in `packages/engine/test/surface-mapping.test.ts` projects actual Three.js sphere vertices into the source raster using its physical radius, pixel scale and upper-left coordinates, then compares those positions with the configured texture transform. Agreement is within one source pixel, including the source's one-pixel aspect rounding. This guards against mirrored longitude, a 180-degree seam error and inverted latitude without regenerating or changing the accepted Io image. It validates map registration, not uniform image sharpness or natural-eye color.

The cold-path texture convention is centralized in `SurfaceMapping.ts`. Ordinary north-first cylindrical images retain the existing Y inversion. Phobos/Deimos atlases retain their original UV mapping. All configured transforms now explicitly reset both axes when applied.

## October 1 audit: four registration corrections

Source research and numerical checks are complete at the level of geographic pole, longitude direction and prime-meridian/seam registration. Four corrections were necessary. Browser regression and visual review of the corrected runtime are pending; this is not yet final Phase 3 acceptance.

| Body | Independent evidence | Result |
|---|---|---|
| Europa | [Tyre](https://planetarynames.wr.usgs.gov/Feature/6170), [Pwyll](https://planetarynames.wr.usgs.gov/Feature/4878) | North-first, eastward columns, center longitude zero; retain mapping |
| Ganymede | [Tros](https://planetarynames.wr.usgs.gov/Feature/6091), [Osiris](https://planetarynames.wr.usgs.gov/Feature/4509) | Same; retain mapping |
| Callisto | [Asgard](https://planetarynames.wr.usgs.gov/Feature/420), [Valhalla](https://planetarynames.wr.usgs.gov/Feature/6284) | Same; retain mapping |
| Ceres | [Occator](https://planetarynames.wr.usgs.gov/Feature/15341), [Haulani](https://planetarynames.wr.usgs.gov/Feature/15338) | Source has 180 E at center, not zero; add half-width sampling offset |
| Pluto | [Burney](https://planetarynames.wr.usgs.gov/Feature/15680), [Sputnik Planitia](https://planetarynames.wr.usgs.gov/Feature/15669) | Source has 180 E at center; existing baked half-width shift is correct |
| Charon | [Nemo](https://planetarynames.wr.usgs.gov/Feature/15743), [Nasreddin](https://planetarynames.wr.usgs.gov/Feature/15739), [USGS labelled map](https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/charon.pdf) | Source has zero at center; cancel its incorrect legacy baked half-width shift with a half-width sampling offset |
| Triton | [USGS color mosaic and projection metadata](https://astrogeology.usgs.gov/search/map/triton_voyager_2_global_color_mosaic_600m) | Center zero, PositiveEast, north-first; independent source-image comparison supports retaining mapping |
| Phobos | Explicit IAU_PHOBOS [JPL shape model](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/dsk/satellites/phobos_2014_09_22.bds) and [model comments](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/dsk/satellites/phobos_2014_09_22.cmt) | Source (x,y,z) becomes IAU (z,x,y), then texture (z,y,-x) |
| Deimos | [Thomas PDS shape grid](https://sbnarchive.psi.edu/pds4/non_mission/ast-sat.thomas.shape-models_V1_0/data/m2deimos.tab) and [label](https://sbnarchive.psi.edu/pds4/non_mission/ast-sat.thomas.shape-models_V1_0/data/m2deimos.xml) | Source becomes IAU (-x,y,-z), then texture (-x,-z,-y) |

All corrections occur on asset configuration or mesh creation. Mesh positions and normals rotate together; original UVs, indices, physical radius, shape files and texture files remain intact. These are proper rotations, not reflections. The scientific FIXED-frame quaternion is unchanged. The runtime texture frame remains +X prime meridian, +Y north and -Z east. Charon's historical conversion is kept reproducible and its builder comment now explains the compensating runtime offset.

## Image evidence and precision

`packages/engine/test/fixtures/surface-landmarks.json` records manually identified feature centers in 2048×1024 source previews, separate USGS coordinates and the published asset conversion. Twelve controls span both hemispheres and multiple longitudes. `surface-mapping.test.ts` raycasts an actual Three.js sphere in each geographic direction and checks the transformed texture UV against the observed pixel, including wrapping and KTX2's native row order. Its two-degree bound is appropriate for a gross frame/seam audit and manual centers; it is not a claim of pixel-level geodetic accuracy. Removing either Ceres or Charon's correction produces a 180-degree error.

Charon's labelled USGS map uses east-positive longitudes 180, 210, …, 330, 0, 30, …, 180 from left to right, and the same basemap features as the source. It independently disproves the earlier assumption that both New Horizons sources have 180 E at center. Pluto's northern Burney crater and Sputnik basin instead agree with the existing conversion. Black southern no-data replacement remains illustrative, not measured terrain.

Triton's source was compared with the independently published USGS 1024-pixel browse mosaic, whose ISIS label gives Equirectangular, PositiveEast, center zero, north-first projected Y and 600 m/pixel. The nominal orientation agrees visually. Across all cyclic shifts and both longitude/latitude flip possibilities, horizontal-gradient correlation peaks at the nominal orientation within one comparison pixel (0.703125°); its 0.21553 correlation is much stronger than the best flipped alternatives (0.02115–0.02892). The source's processed colors, missing coverage and low-resolution browse preclude a subdegree correction. No rotation or mirror is inferred from a single ambiguous feature. The primary label is archived as `docs/licensing/triton-map-projection.lbl`; comparison details are in `docs/licensing/surface-model-registration.json`.

## Independent model comparison

NASA's two GLBs declare no scientific cartographic frame. Bounding extents alone were not used to choose a correction. The full 16,449 Phobos and 16,649 Deimos source vertices were compared with bilinearly sampled [Thomas PDS shape grids](https://sbn.psi.edu/pds/resource/oshape.html), retaining all 48 signed axis permutations for diagnosis. Only proper rotations may be applied. The Thomas labels do not explicitly spell out longitude sign; west-positive interpretation is an inference independently supported by the companion Phobos grid's agreement with the JPL model in its explicitly declared IAU_PHOBOS frame. This inference is recorded rather than attributed to missing GLB metadata.

For Phobos, 1,029 deterministic source directions were also ray-intersected against the independent JPL DSK. The winning proper rotation has radial RMS 0.622828 km; the next proper rotation has 1.074165 km. It agrees with the independent Thomas-grid result (0.663791 km versus 0.970892 km for the next proper rotation). For Deimos, the winning proper rotation has RMS 0.358576 km versus 0.876654 km for the next proper rotation. No center translation, scale adjustment or arbitrary continuous fit was used. These errors include differing model generations and source inaccuracies; they are not angular tolerances or proof that NASA's models are survey-grade.

`surface-registration.test.ts` uses 60 independently generated reference rays per moon and the actual distributed, simplified mesh. After registration, identity must be the best fit among all 24 proper axis rotations, have at least 0.1 km separation from the next candidate and remain within 0.8 km (Phobos) / 0.5 km (Deimos) radial RMS. Original UVs must remain identical. These bounds check gross coordinate registration while acknowledging model differences. Removing either correction fails the best-fit check.

Reproduce the independent evidence with `tools/fixtures/audit-source-shape-axes.mjs`, `audit-phobos-dsk.py` and `audit-shape-registration.py`, using the cached PDS/JPL references in `.tools/surface-audit/`. Python requires numpy/spiceypy; this checkout has them under `.tools/orientation/python`. Full candidate scores and the DSK SHA256 are archived in `docs/licensing/surface-model-registration.json`; reference-ray fixtures include input SHA256 values. NASA source hashes remain in the existing asset provenance files.

## Retained limits and remaining validation

The existing Sun/Earth/Moon/Mars references and Mercury appearance are preserved. Venus/Titan cloud and haze treatments and giant-planet processed maps remain illustrative: scientific poles and rotations do not turn them into measured atmospheric feature tracking. Color enhancements, mosaic seams, missing terrain and nonuniform source resolution remain documented. Fine surface/control-network alignment and source-frame declarations for future model replacements are enhancements, not claims made by this audit.

Local verify passes **131 tests plus two expected rejected-model diagnostics**, typecheck and lint/boundaries. Asset checks pass with **79,961,515 / 80,000,000 bytes** unchanged. The next evidence is the corrected browser captures, orientation integration, moon-system behavior, original references, precision and production build. Previous accepted CPU/device reports are preserved; these changes add no per-frame work or assets. Phase 4 remains unstarted.
