# Ceres and moon orientations

September 28, 2026. Ten formerly identity renderer orientations now use the shared scientific FIXED frames: Ceres, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Triton and Charon. Existing Sun/planet/Moon rotations remain unchanged. Catalog origin frames are registered after ephemeris assets load; externally supplied providers do not inherit a catalog orientation accidentally.

Coefficients derive from [NAIF PCK00011](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc), SHA-256 `3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1`. The offline generator `tools/fixtures/build-pck-orientations.py` uses SpiceyPy 6.0.0 / CSPICE N0067 to load the active kernel pool and export coefficients plus 60 independent `pxform(IAU_BODY, J2000, et)` matrices over 1900–2100. Source metadata accompanies both JSON files. SPICE is a development fixture tool only, not a runtime dependency.

Reproduce from the repository root (PowerShell):

```powershell
python -m pip install --target .tools/orientation/python spiceypy==6.0.0
$env:PYTHONPATH='.tools/orientation/python'
python tools/fixtures/build-pck-orientations.py
pnpm.cmd exec vitest run packages/astro/test/pck-orientation.test.ts
```

Download the linked kernel to `.tools/orientation/pck00011.tpc` first; the generator rejects a changed hash. It clears SPICE's pool before loading, avoiding contamination by another kernel. CSPICE parses active data sections, ignoring examples and superseded constants in comments.

The TypeScript evaluator follows [NAIF PCK conventions](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/pck.html): TDB seconds since J2000; polynomial pole and phase angles use Julian centuries, prime meridian uses days. Periodic pole RA/meridian sine and declination cosine terms, quadratic Mars phases, Phobos acceleration and Triton's negative spin are retained. Evaluation writes a caller-owned matrix without hot-path allocation. FIXED axes are Z north; the existing FrameTree adapter converts them to Y-north texture axes exactly once.

The 60 matrix comparisons pass at absolute component error below 1e-9. Additional tests check orthogonality and frame-to-texture basis conversion. This establishes agreement with the text-PCK model, not mission-grade real attitude accuracy. Position/orbit providers, physical radii and display boosts are unchanged.

## Remaining registration work

Scientific pole/prime-meridian orientation does not establish geographic registration of a source texture or mesh. The renderer currently applies the common Y-north texture convention to the retained NASA display-model axes. Phobos/Deimos principal axes and atlas landmarks still require a source-based registration audit; do not claim validated subplanet-facing mesh axes yet. Cylindrical map seam/longitude conventions also need a per-source landmark audit. No guessed mesh correction or baked-in longitude offset has been introduced.

Browser validation checks that these ten rotations actually reach rendered groups at a fixture epoch and change after six simulation hours, alongside LOW/HIGH appearance captures, original hero references, picking, startup and precision. Results are recorded in the Phase 3 checkpoint after review. Full Phase 3 performance and visual/scientific registration acceptance remain outstanding.
