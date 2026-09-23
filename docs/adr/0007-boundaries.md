# 0007 — Enforced package boundaries

Context: A monorepo alone does not isolate frame-loop math or protect server credentials.

Decision: domain owns types/catalogs; astro owns pure scientific code; engine owns Three and the frame loop; db/ingest are server package skeletons; web owns the UI and the bridge. A boundary checker runs with ESLint. Deep workspace imports, renderer imports outside engine, astro imports from UI components, and direct client database imports are rejected.

Consequences: The bridge can import clock conversion functions for user commands, never for per-frame React updates. The checker is deliberately supplemented by TypeScript and code review; it is not a complete information-flow security analysis.
