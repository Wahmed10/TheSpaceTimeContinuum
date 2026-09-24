# 0004 — Canonical ICRF and SSB

Context: Rendering, provider units, and coordinate frames must not become conflated.

Decision: Store ICRF-aligned, solar-system-barycentric states in km and km/s. Convert astronomy-engine AU/AU-day output at the provider boundary. Body orientations map a local Y-up texture sphere into the inertial scene.

Consequences: Physical values are never overwritten by Explore Scale. The complete frame tree, fixed-frame camera modes, and TEME transforms belong to Phase 2 onward and are not implemented in this preview. The hybrid Horizons-corrected provider passes the original independent position tolerances (ADR 0008). Earth orientation uses GAST and the equator-of-date to J2000 rotation explicitly; Mars orientation passes independent NAIF PCK00011 references.
