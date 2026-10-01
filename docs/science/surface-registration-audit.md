# Phase 3 surface registration audit

October 1, 2026. Scientific FIXED-frame attitude and geographic registration are distinct: the former is checked against SPICE; the latter also depends on the image projection or model coordinate frame.

## Io: projection registration verified

The [USGS color-merge mosaic](https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km) supplies an [ISIS label](https://astrogeology.usgs.gov/ckan/dataset/0fc15885-24ee-4d9d-9666-11de0667c10c/resource/91c2447c-1932-48e5-b33c-c199db865805/download/io_galileo_ssi_global_mosaic_clrmerge_1km.lbl). The archived copy is `docs/licensing/io-map-projection.lbl`. It declares SimpleCylindrical, planetocentric latitude, center longitude zero, positive-west coordinates, a 1821460 m radius and a 1000 m pixel scale.

PositiveWest does **not** imply that image columns must be mirrored. The [USGS ISIS SimpleCylindrical implementation](https://github.com/DOI-USGS/ISIS3/blob/dev/isis/src/base/objs/SimpleCylindrical/SimpleCylindrical.cpp) converts west-positive longitude to east-positive angle before calculating projected X. Source image columns therefore advance eastward. The current engine image orientation is correct.

The independent projection check in `packages/engine/test/surface-mapping.test.ts` projects actual Three.js sphere vertices into the source raster using its physical radius, pixel scale and upper-left coordinates, then compares those positions with the configured texture transform. Agreement is within one source pixel, including the source's one-pixel aspect rounding. This guards against mirrored longitude, a 180-degree seam error and inverted latitude without regenerating or changing the accepted Io image. It validates map registration, not uniform image sharpness or natural-eye color.

The cold-path texture convention is centralized in `SurfaceMapping.ts`. Ordinary north-first cylindrical images retain the existing Y inversion. Phobos/Deimos atlases retain their original UV mapping. All configured transforms now explicitly reset both axes when applied.

## Remaining source limitations

The NASA VTAD Europa/Ganymede/Callisto/Ceres/Triton GLBs contain a single `cylindrically_mapped_sphere` node with no node transform. Their images and visual orientation are reviewed, but their metadata does not identify a scientific prime meridian. A NASA visualization download alone is insufficient to certify individual feature longitude; named-feature registration remains to be completed for these sources.

The NASA Phobos/Deimos GLBs similarly contain one mesh node without a declared cartographic frame. Phobos's longest source extent is Z and shortest is Y; Deimos's longest is X and shortest is Z. Thus a shared Y-north convention cannot independently certify both meshes' principal-axis registration. Source axes have been retained; no guessed 90-degree rotation has been applied. Exact geographic pole/prime-meridian and subplanet-facing mesh alignment remain open. A controlled shape model or multiple identified landmarks are required to resolve signs and axis permutations. [USGS Stickney coordinates](https://planetarynames.wr.usgs.gov/Feature/5707) can anchor Phobos once its mesh feature is identified, but one assumed principal axis is insufficient.

Pluto/Charon map conversion already records a 180-degree seam shift. Per-feature verification against the source coordinate convention remains open. Giant/cloud maps are illustrative; scientific poles and rotations do not turn their processed imagery into measured atmospheric feature tracking.

These limitations are retained explicitly in the Phase 3 checkpoint. Passing rendering, orbit or attitude tests must not be reported as completed geographic registration for the remaining sources.
