# 0004 — Canonical ICRF and SSB

Context: Rendering, provider units, and coordinate frames must not become conflated.

Decision: Store ICRF-aligned, solar-system-barycentric states in km and km/s. Convert astronomy-engine AU/AU-day output at the provider boundary. Body orientations map a local Y-up texture sphere into the inertial scene.

Consequences: Physical values are never overwritten by Explore Scale. Phase 2 now implements the frame tree and fixed/TEME state transforms; fixed-frame camera modes remain future work. Barycentric providers attach directly to SSB, while parent-relative registered nodes compose rotations and velocities through the tree. Scientific FIXED uses Z north; texture orientation converts to the existing Y-up sphere convention. TEME includes the equation of equinoxes and passes the independent Vallado Appendix C reference at <0.1 km. The hybrid Horizons-corrected provider passes the original independent position tolerances (ADR 0008). Earth orientation uses GAST and the equator-of-date to J2000 rotation explicitly; Mars orientation passes independent NAIF PCK00011 references.
