# 0005 — Server-side ingestion (planned)

Context: JPL and CelesTrak data access must be polite, cached, and server-only.

Decision: Retain the plan's future Neon/Drizzle database and sequential GitHub Actions ingestion architecture. Keep db and ingest package boundaries now. Do not provision external accounts or claim an ingestion service exists.

Consequences: The current preview runs without credentials or a backend. Only the fixture tool contacts JPL, sequentially. Phase 4B migrations, provider adapters, API DTOs, schedules, secrets, and outage behavior are outstanding. The empty packages are explicit skeletons.
