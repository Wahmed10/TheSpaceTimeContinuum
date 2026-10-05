# Phase 4B/5 checkpoint — October 5, 2026

**Current state:** P4B.1 is reviewed accepted and committed locally as `4936a47`. P4B.2 is implemented and awaiting isolated full verification/live-ingestion review. Latest planned job is `p4b-2-verify-1`; use `node tools/phase-five-status.mjs` and check it first on resume. Older sections below preserve their historical pending states.

The user approved `docs/PHASE_4B_5_PLAN.md` with “Yes start the plan!” Approval persists across continuation turns. Phase 4 stays accepted; its completed validation and uncommitted runtime remain preserved. Current HEAD is `035fc967ed9ba88550773ea8f757fd5ff905d23c`; it does not contain finished P4.9. Do not reset or recreate the root from HEAD.

## P4B.1 implementation

Implemented:

- `packages/db/src/schema.ts`: every section 15 table plus provider-action audit history, persisted pause/resume/lease state, snapshot-content uniqueness, provenance and explicit source/fetch/ingestion timestamps. Future tables are schema only.
- `packages/db/migrations/0000_bizarre_loki.sql` and generated `meta/`: journaled 17-table SQL with `pg_trgm`/`unaccent` before indexes.
- `packages/db/src/config.ts`, `connection.ts`, `queries.ts`, `seed.ts`, `cli.ts`, `index.ts` and `packages/db/drizzle.config.ts`/`package.json`: lazy Neon transaction-capable connection, secret-safe CLI configuration, bounded parameterized ranked search, real migration/seed/check commands and lifecycle ownership.
- `packages/domain/data/spacecraft.json`: eleven identity-only NASA/ESA sourced spacecraft seeds. No Horizons IDs, position providers, trajectories or inferred live status. NASA/ESA mission pages were checked October 5.
- `packages/db/test/queries.test.ts`, `schema.test.ts`, `integration.ts`: focused offline invariants and an explicit live Neon gate outside the default unit glob, refusing unconfigured writes rather than silently skipping.
- Root `package.json` adds five db commands, preserving its existing P4.9 build changes; `.env.example` documents test branch configuration.
- `docs/DATA_PLATFORM_SETUP.md` explains Neon development branches, local secret configuration and commands. Plan is marked approved.
- `tools/run-phase-five-validation.mjs` and `tools/phase-five-status.mjs`: initial scoped isolated verification, source/preserved-artifact manifest and read-only status. These do not yet implement the future satellite/browser/CPU acceptance protocol.

## Short verification reviewed

Seven tests in two database test files pass. Database package typecheck and targeted ESLint pass. Migration generation succeeds and repeat generation reports no schema changes. Drizzle 0.31.11 required relative output paths on Windows: absolute output paths caused a doubled drive-path ENOENT on repeat generation. Generated SQL was retained and configuration corrected; no migrations were discarded.

`pnpm.cmd db:test:integration` was invoked without secrets and correctly failed without writes. This is proof of the missing-configuration guard, not a passing live test. No Neon connection/branch/persistence has been verified; no commit has been made because the P4B.1 exit is not yet satisfied.

## User configuration in progress

The user requested an explanation of Neon branches and setup instructions. Guidance was provided and saved in `docs/DATA_PLATFORM_SETUP.md`. They should create an empty free Neon project, create/select a `development` branch, copy its PostgreSQL URL into ignored `apps/web/.env.local` as `DATABASE_URL` and `TEST_DATABASE_URL`, and set `DB_TEST_ALLOW_WRITES=development`. Never request or print their connection string in chat.

Once configured, run the explicit live integration gate on that disposable branch. Preserve output with source identity. Check real migration, idempotent seed, search, rollback, foreign-key and deduplication results before declaring P4B.1 accepted. Review intended file diff and commit only P4B.1-owned changes, carefully separating the preexisting root package.json hunk; never indiscriminately stage accepted uncommitted Phase 4 or the unrelated evidence.

## Full isolated verification job

Run directory: `.tools/phase-five/p4b-1-verify-1/`.

Preparation: `node tools/run-phase-five-validation.mjs --prepare p4b-1-verify-1`.

Execution: `node tools/run-phase-five-validation.mjs .tools/phase-five/p4b-1-verify-1/launch.json` launched as a hidden persistent Windows process.

Status command:

```powershell
node tools/phase-five-status.mjs
```

Raw result: `.tools/phase-five/p4b-1-verify-1/result.json`. Install/verify stdout and stderr are separate files in that directory; wrapper logs are `wrapper.log`/`wrapper-stderr.log`. `launch.json` records frozen source hashes, complete candidate copy, HEAD, Node/pnpm and preserved evidence hashes. Mutable checkpoint and published performance outputs are excluded from verification inputs explicitly; user artifacts remain separately hashed. Candidate `.next` is isolated; root development server is untouched. Preexisting worktree patch/status are retained in `.tools/phase-five/p4b-1/`.

The job runs offline frozen-lockfile installation then `pnpm verify` (all workspace typechecks, lint/boundaries, unit/science tests). It performs no database writes and is not Phase 4B or Phase 5 acceptance. Review result/raw logs, test counts, failures and source hashes first on resume; do not start a duplicate. Preserve an original failure and investigate it before launching a justified new candidate.

After reviewed full verification and the live Neon gate pass, commit P4B.1, then implement P4B.2. Later P4B.4 requires actual scheduled ingestion persistence and status readback; manual or mocked runs cannot replace that exit.

Launch confirmed: PID 17004; source snapshot SHA-256 c02841c07e07eeb87528ff283b05083edea4c82820ebaa93d61a0d6001c5fb6a; 3169 source files. Check the existing run first on resume.

## Live Neon gate - passed October 5, 2026

The user created the Neon development branch and authorized local setup. Connection information was saved only in ignored `apps/web/.env.local`; `git check-ignore` confirmed exclusion. Do not copy this file into candidates, log its contents or stage it.

`pnpm.cmd db:check` succeeded. `pnpm.cmd db:test:integration` exited 0 and its raw output reports live migration, repeat seed, parameterized search, rollback, foreign-key and snapshot-deduplication checks passed, with 32 seeded identities. The live run used the current frozen source snapshot c02841c07e07eeb87528ff283b05083edea4c82820ebaa93d61a0d6001c5fb6a. Evidence: `.tools/phase-five/p4b-1-verify-1/neon-integration-result.json`, `neon-integration.log`, `neon-integration-stderr.log`. This satisfies the live development-branch gate; no scheduled-ingestion or API claim is made.

At the latest startup/status check PID 17004 had completed offline installation and was running full `verify`. Do not poll solely to wait. On resume review that existing result first; live database configuration is now complete. The immutable launch/result pending-gate list retains its initial prerequisites; this checkpoint and separate live evidence close the Neon prerequisite without rewriting the original manifest.

Remaining P4B.1 work: independently review completed full verification/source evidence, then make a scoped commit separating preexisting package.json changes. If verification fails, inspect preserved reports and fix only the failing stage before launching another isolated run. Continue P4B.2 after the P4B.1 exit is satisfied. No duplicate verification, push, workflow dispatch, deployment or notification was performed.

## P4B.1 closure and P4B.2 implementation

Independent October 5 review matched all 3,169 original root/candidate source hashes and 14 preserved artifacts, checked clean verify stderr, all workspace typecheck/lint/boundary stages and 487 passing tests/two expected diagnostics in 58 files, plus the six live Neon checks. `review.json` and `closure.json` in the original run directory anchor original result hashes and scoped commit `4936a47`. Published summary: `docs/perf/phase-five/p4b-1-review.md`. Only enumerated database foundation files were committed. The root package.json's preexisting P4.9 build hunk was kept out of that commit; accepted uncommitted Phase 4 and user artifacts remain untouched. No push/deployment occurred.

P4B.2 creates:

- `packages/db/src/ingestion.ts`: database-owned registration, host advisory-lock/lease claims, expiry bookkeeping, atomic snapshots/run/freshness, failure backoff bookkeeping, durable pause and audited host-wide operator resume, bounded payload history and over-budget replacement rollback. DB/ingest boundaries remain intact.
- `packages/ingest/src/config.ts`, `contracts.ts`, `politeFetch.ts`, `scheduler.ts`, `providers/DummyProvider.ts`: contact/limit configuration, adapter contract, per-host single-flight, manual redirects, immediate non-200 pause/no HTTP retry, 30-second request/body deadline, streamed byte cap, sequential due execution, normalized validation and local proof provider. `runner.ts` replaces the stale Phase 1 failure placeholder; `index.ts` exports the infrastructure.
- `packages/ingest/test/politeFetch.test.ts` and `scheduler.test.ts`: fifteen focused tests covering statuses 301/403/404/429/500, queued/repeated host rejection, body-lifetime exclusivity, byte cap, timeout/no secret leakage, payload/origin rejection, pause-write failure identity, due skip, sequential lifecycle, validation/persistence failure and delayed capped backoff.
- `packages/db/test/ingestion-integration.ts`: explicit live gate on the disposable development branch, using two pools to test cross-process-equivalent host exclusion. Tests atomic bookkeeping, last-good rollback, A→B→A revalidation dedup/freshness, persisted pause across store instances, acknowledged resume/audit, retention budgets and lease expiry/recovery. Only UUID-namespaced test fixtures are cleaned up. `packages/db/package.json` adds `test:ingestion`.

Additional intended changes: `packages/db/src/index.ts` exports ingestion; `queries.ts` chooses latest snapshot by actual revalidation fetch time before ingestion time (older content hashes can become current again); `connection.ts` adds a 30-second statement timeout; `.env.example` documents dummy provider selection. Setup guide documents contact purpose, runner, limits/resume and distinctions from real scheduled acceptance. Validation tooling adds opt-in live-ingestion stage and refuses duplicate execution of an existing run; read-only status recognizes hash-matched review/commit closure.

The user approved the GitHub issues URL as provider contact after receiving an explanation. Ignored `apps/web/.env.local` now contains that contact and `INGEST_PROVIDERS=dummy`; no secret is copied or printed. The only implemented provider is explicit local test data. No external scientific provider is queried by this phase's tests. GitHub workflow, API/status and actual scheduled persistence remain P4B.3/P4B.4 gates.

Short P4B.2 checks: database and ingest typecheck, targeted lint and 22 focused DB/ingest tests in four files pass. An initial timeout-test mock returned `Promise<unknown>` and failed typecheck; it was fixed to `Promise<Response>` before the passing check. No production behavior or threshold was relaxed.

## P4B.2 full verification job

Preparation: `node tools/run-phase-five-validation.mjs --prepare p4b-2-verify-1 --live-ingestion`.

Persistent execution: `node tools/run-phase-five-validation.mjs .tools/phase-five/p4b-2-verify-1/launch.json`.

Run/result location: `.tools/phase-five/p4b-2-verify-1/result.json`. Frozen sources/candidate/HEAD/Node/pnpm and preserved evidence are in `launch.json`. Stage logs: `install.log`, `verify.log`, `liveIngestion.log`, with matching `-stderr.log` files. Wrapper logs and `process.json` record background process/startup identity. Status: `node tools/phase-five-status.mjs`.

The job performs offline frozen-lockfile install and full verify in the isolated candidate, then the opt-in live persistence gate from the frozen root source with ignored local credentials. Root .next/dev server is preserved. This job does not dispatch a workflow or prove scheduled ingestion. No P4B.2 pass is claimed until independent review of all original stage outputs and source hashes.

On resume: inspect this existing job first, preserve failures and review exact source/raw logs/live gate. If passed, commit only the intended P4B.2 changes, preserving unrelated root package.json/P4.9 changes, then implement P4B.3 API/search/status. A real scheduled run that persists proof data and is visible on status is still required before P5.2. Do not reuse P4B.1's seven tests/live results as evidence for changed ingestion behavior.

P4B.2 launch confirmed: PID 8284, snapshot SHA-256 26074ee2aeaa155d8909854250883078783c409531f26337094ae276a37c873c, 3178 frozen source files. Resume by reviewing this existing run.
