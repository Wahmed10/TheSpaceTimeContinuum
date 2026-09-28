# Phase 3 execution plan

September 27, 2026. Scope authority: IMPLEMENTATION_PLAN.md, Phase 3 and sections 7, 10-13, 22 and 28. The user's instruction to start Phase 3 authorizes this expansion and implementation within that scope. Phase 2 acceptance, ADR 0010 and accepted device coverage remain in force.

## P3.1 — Existing asset and geometry foundation

Files: `packages/engine/src/assets/AssetManager.ts`, `packages/engine/src/SpaceEngine.ts`, `e2e/phase-three-materials.spec.ts`.

Enable the already licensed, manifest-listed Mercury, Venus, Jupiter, Saturn, Uranus and Neptune KTX2 maps. Keep original hero shading unchanged. Give Jupiter/Saturn tier-dependent close-up sphere geometry. Ensure sphere LOD replacement cannot overwrite future ring geometry. Retain the 1k startup / 2k available-source ceiling for these existing maps; do not call upsampling extra detail.

Checks: verify, asset/license checks, original visual references, deterministic new-body captures and startup/resource checks. Review captures before accepting references. Record startup/memory cost of six additional resident maps; streaming optimization is required if budgets fail.

## P3.2 — Saturn rings and gas giants

Files: new `packages/engine/src/bodies/SaturnRings.ts` and ring math tests; `PlanetFactory.ts`, `SpaceEngine.ts`; sourced ring constants in domain data; asset manifest/licenses if changed; new ring browser tests.

Build a Y-up equatorial annulus inheriting Saturn's existing frame orientation, physical inner/outer dimensions, radial color/opacity, analytic planet-to-ring and ring-to-planet shadows, and HG Mie forward-scattering approximation. Use TSL on both backends, consistent logarithmic depth, finite grazing-light math and LOW fallback. Preserve annulus geometry through LOD/quality switches and dispose it correctly. Add gas-giant atmosphere rims and improve Jupiter/Saturn bands with sourced assets as needed.

Accept: front/back/edge-on and lit/unlit captures, both shadow directions, ring/planet/orbit occlusion, quality transitions and disposal tests; verify plus unchanged precision/science tests. First visible milestone is complete only after rings are rendered and reviewed.

## P3.3 — Remaining body appearance and assets

Files: `PlanetFactory.ts`, extracted material helpers as appropriate, `tools/assets/`, catalog texture metadata, `AssetManager.ts`, manifest, asset licenses and data sources.

Finish Venus clouds, Uranus/Neptune atmospheres, Mercury, Pluto, Charon, Ceres and all non-hero moons. Use reproducible, licensed KTX2 derivatives with source resolution limits and explicit illustrative/observed provenance. No new imagery is required for the original four heroes. Verify source terms before acquisition; retain originals and conversion provenance.

User visual direction (September 28): use irregular meshes for bodies whose physical shapes warrant them, including future catalog additions. Prefer sourced shape models with matching UV atlases, preserve physical scale, and simplify for display budgets. Do not default such bodies to textured spheres or invent shape detail when suitable data is unavailable; document any necessary approximation.

Accept: recognizable, reviewed close-ups for every body, coherent LOW/MEDIUM/HIGH fallback and asset-budget/license checks. Missing or unobserved terrain must not be presented as measured imagery.

## P3.4 — Orientation and moon-system behavior

Files: `packages/astro/src/orientation/`, `frames/solarSystemFrames.ts`, sourced domain rotation data, orientation fixtures/tests; `EntityRegistry.ts`, `SpaceEngine.ts`, display/LOD/label/orbit modules only where needed.

Audit all 21 axes and rotations against authoritative IAU/NAIF sources. Preserve existing fixed-Z-north to texture-Y-north conversion. Implement missing moon/Ceres orientations and verify synchronous/retrograde cases without double tilt. Tune planetary moon visibility and True/Explore transitions, physical-state immutability, touch focus and picking. Reuse existing providers/orbits.

Accept: independent orientation fixtures, all existing Horizons checks, moon-system browser views and scale/label interaction tests; unchanged scientific tolerances.

## P3.5 — Full Phase 3 evidence

Files: per-body browser screenshots/tests, science/performance reports and `docs/PHASE_3_CHECKPOINT.md`.

Run verify, production build, assets/licenses, engine bundle and full browser regression with output under `.tools/`. Capture all 21 bodies deterministically. Preserve the original eight references and their 1.5% tolerance. Run the unchanged five-path same-runner CPU comparison after edits/builds stop. Record real-device Phase 3 rendering evidence separately from SwiftShader. Compare against section 22 budgets; do not imply Phase 2 device acceptance verifies new ring shaders.

Accept: all 21 rendered bodies, position checks, reviewed visual evidence and performance budgets. No Phase 4 work. For any multi-minute job, launch persistently, record PID/run URL, command, source revision and logs, then hand off without polling.

## Per-body audit at start

| Bodies | Existing appearance | Orientation / Phase 3 work |
|---|---|---|
| Sun, Earth, Moon, Mars | Existing hero materials | Preserve existing frame rotations and references |
| Mercury | Existing unused map | Existing frame; activate and review surface |
| Venus | Existing unused cloud map | Existing frame; cloud/atmosphere treatment |
| Jupiter, Saturn | Existing unused band maps | Existing frames; hero detail, rims; Saturn rings |
| Uranus, Neptune | Existing unused maps | Existing frames; atmosphere rims |
| Pluto | Flat color | Existing frame; sourced surface |
| Ceres | Flat color | Missing renderer orientation; surface |
| Phobos, Deimos | Flat spheres | Missing renderer orientation; sourced appearance/shape assessment |
| Io, Europa, Ganymede, Callisto | Flat spheres | Missing renderer orientation; sourced surfaces |
| Titan | Flat sphere | Missing renderer orientation; opaque haze treatment |
| Triton, Charon | Flat spheres | Missing renderer orientation; sourced surfaces |

The ten non-Moon entries without `astronomyBody` currently receive identity renderer orientation (Ceres plus nine moons). Physics and provider fixtures already exist; do not regenerate orbit data for visual work.
