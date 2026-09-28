# Missing orientation implementation preparation

September 28, 2026. Prepared independently while the Mars-moon browser/build job runs; no runtime rotation change yet.

Primary source: [NAIF pck00011.tpc](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc), dated December 27, 2022. Cached under `.tools/orientation/pck00011.tpc`, SHA-256 `3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1`. This supplies IAU-style pole and prime-meridian models for the ten currently missing bodies: Phobos 401, Deimos 402, Io 501, Europa 502, Ganymede 503, Callisto 504, Titan 606, Triton 801, Charon 901, Ceres 2000001.

Implementation requirements:

- Parse only active `\begindata` sections. The kernel also quotes superseded values and examples inside comments; broad text matching is insufficient.
- Preserve polynomial pole terms, prime-meridian terms and periodic nutation/precession corrections. The Mars system declares `BODY4_MAX_PHASE_DEGREE = 2`; do not assume all system phase angles are linear pairs. Phobos has quadratic terms.
- Check time units against NAIF PCK Required Reading: TDB seconds from J2000, with days versus Julian centuries used in different terms. Preserve negative/retrograde rotation, especially Triton.
- Compare against independent SPICE `pxform('IAU_<BODY>', 'J2000', et)` fixtures at multiple epochs. Use toolkit N0067 or newer for this kernel's Mars system; NAIF explicitly warns against older versions.
- Keep existing Earth/Moon/planet orientation behavior and hero references unchanged. Extend the shared scientific FIXED frame path for missing bodies, rather than adding a second renderer-only spin.
- Preserve scientific Z-north to texture Y-north conversion. Verify NASA mesh/model axes and texture landmark registration separately: a valid rotation matrix alone does not establish UV geographic alignment or Phobos's long-axis direction.
- Recheck moon picking, camera clearance, True/Explore transitions and quality/LOD identity. Keep scientific tolerances and first-party output-buffer contracts unchanged.

The source model is an approximation, not a claim of mission-grade attitude accuracy at all dates. NAIF notes that satellite/asteroid models may change as observations improve. The next implementation step follows completion/review of `.tools/mars-moons/` validation; no duplicate long run is needed.
