# Development database setup

Phase 4's Solar System works without a database. Phase 4B adds server-side storage for provider snapshots, aliases and ingestion status. The selected service is Neon PostgreSQL; no account system is being added to the app.

## What a development branch is

A Neon branch is an isolated database environment inside a Neon project. A development branch lets us run migrations, seed data and test transactions independently of a future production database. It is a database branch, separate from a Git branch. Branching copies the parent's existing state; use a new empty project for these first foundation tests.

Official instructions: [Neon branches](https://neon.com/docs/manage/branches) and [Connect to Neon](https://neon.com/docs/get-started/connect-neon).

## Create and configure

1. Sign in at [Neon Console](https://console.neon.tech/) and create a project named `TheSpaceTimeContinuum`. Choose the free plan if offered and a region near the eventual app deployment; do not enable a paid plan for this work.
2. Open **Branches**, create a branch named `development` from the project's initial empty branch, and select it. Console wording may vary slightly.
3. Click **Connect**, choose the `development` branch, its database and role, then copy the PostgreSQL connection string. Keep the supplied SSL options. Do not use a future production branch.
4. Create `apps/web/.env.local` (already ignored by Git). Set the variables below locally. Replace the placeholder with the copied URL; never paste it into chat, issues, logs or a commit.

```dotenv
DATABASE_URL="<development branch connection string>"
TEST_DATABASE_URL="<same disposable development branch connection string>"
DB_TEST_ALLOW_WRITES=development
```

The URL contains a password. `TEST_DATABASE_URL` deliberately makes the live test target explicit, and `DB_TEST_ALLOW_WRITES` allows migrations and seeding on that disposable branch. The live integration command refuses to run without both. The process environment takes precedence over local configuration. Do not configure secrets in `NEXT_PUBLIC_*` variables.

The CLI resolves this file from its module location, so commands work from the repository root or through pnpm's package filter. Generation needs no database or network; migrations and seeding connect only when invoked. Importing `@space/db` does not open a connection.

## Commands from the repository root

```powershell
pnpm.cmd db:generate
pnpm.cmd db:check
pnpm.cmd db:migrate
pnpm.cmd db:seed
pnpm.cmd db:test:integration
```

`db:generate` derives SQL from the schema. Checked-in initial SQL also installs `pg_trgm` and `unaccent` before the search index; the extensions are not automatically modeled by Drizzle's table snapshot. Existing migrations must never be regenerated/replaced after deployment.

`db:check` checks connectivity without migrating. `db:migrate` applies the checked-in journaled migration. `db:seed` idempotently stores 21 accepted body identities plus 11 curated spacecraft identities/aliases. Spacecraft seeds have no position provider, telemetry, trajectory or inferred live status.

`db:test:integration` applies migrations and runs seeding twice, tests real ranked/parameterized search, transaction rollback, foreign-key rejection and snapshot uniqueness. Temporary failure-test writes are rolled back; catalog seeds and schema remain. A successful log is live evidence only for this branch; it does not establish the later scheduled-ingestion gate. With missing credentials the command fails explicitly, rather than skipping tests and reporting success.

Commands redact driver errors because driver messages can contain connection details. For a failure, check the branch selected in the console, whether its compute is available, copied connection string and role permissions. Do not share the password while reporting the command/stage that failed.

## Later scheduled setup

The ingestion workflow and API/status will be implemented after the database gate passes. GitHub will need separately configured `DATABASE_URL` and `PROVIDER_CONTACT` secrets. The contact value must identify the project to data providers. No secret has been configured, no workflow has been dispatched and no notification delivery has been verified by this guide.

## P4B.2 ingestion runner

The database foundation is reviewed accepted and committed as `4936a47`. Provider runner code is implemented and undergoing its own verification. The approved contact is `https://github.com/Wahmed10/TheSpaceTimeContinuum/issues`. A User-Agent identifies our app to the provider and supplies a contact route; it grants no access and sends no message. Local configuration now includes this contact and `INGEST_PROVIDERS=dummy`.

```powershell
pnpm.cmd ingest:due
pnpm.cmd --filter @space/db test:ingestion
```

The first command runs only due providers, sequentially. Currently the only provider is an explicitly labeled local scheduled-ingestion proof; it writes a real snapshot and records but makes no external scientific requests. It returns `not-due-or-blocked` when a prior run is not yet due, a lease is owned elsewhere, or the host is paused. A successful skipped invocation is not evidence that a scheduled run persisted data.

Any non-200 provider response—including a redirect—pauses the host across runner invocations and records a failure. No automatic HTTP retry/resume occurs. Network/payload failures use delayed capped backoff, retaining the last good snapshot. After investigating the actual request/status, an operator can explicitly acknowledge a resume:

```powershell
pnpm.cmd ingest:due resume <provider-id> <operator-name> "Investigated and corrected the request"
```

The resume is host-wide and audited. Never run it blindly just to clear a warning. CLI failure output uses bounded codes and withholds raw responses/driver messages. The separate live test checks host exclusivity across two connection pools, atomic bookkeeping, failed replacement rollback, revalidation deduplication, persistent pause/operator resume, retention limits and lease-expiration recovery. Its UUID-namespaced fixtures are removed afterward; catalog/provider data is not removed.

Response bodies are capped at 16MiB with a 30-second request/body deadline. Database statements also have a 30-second timeout. Source snapshots/raw records are retained for at most 30 days with 100-row/32MiB budgets per source, preserving newest last-good groups only when that current set itself fits the budget. An over-budget replacement rolls back. Ingestion claims expire after ten minutes; overlapping processes cannot fetch the same host concurrently under an active lease. A worker whose lease expires cannot publish late results.

GitHub workflow/secrets, API/status and actual scheduled persistence remain later gates; local runner code is not proof of those services.
