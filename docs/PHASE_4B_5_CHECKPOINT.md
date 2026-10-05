# Phase 4B/5 checkpoint — October 5, 2026

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

## Live Neon gate � passed October 5, 2026

The user created the Neon development branch and authorized local setup. Connection information was saved only in ignored `apps/web/.env.local`; `git check-ignore` confirmed exclusion. Do not copy this file into candidates, log its contents or stage it.

`pnpm.cmd db:check` succeeded. `pnpm.cmd db:test:integration` exited 0 and its raw output reports live migration, repeat seed, parameterized search, rollback, foreign-key and snapshot-deduplication checks passed, with 32 seeded identities. The live run used the current frozen source snapshot c02841c07e07eeb87528ff283b05083edea4c82820ebaa93d61a0d6001c5fb6a. Evidence: `.tools/phase-five/p4b-1-verify-1/neon-integration-result.json`, `neon-integration.log`, `neon-integration-stderr.log`. This satisfies the live development-branch gate; no scheduled-ingestion or API claim is made.

At the latest startup/status check PID 17004 had completed offline installation and was running full `verify`. Do not poll solely to wait. On resume review that existing result first; live database configuration is now complete. The immutable launch/result pending-gate list retains its initial prerequisites; this checkpoint and separate live evidence close the Neon prerequisite without rewriting the original manifest.

Remaining P4B.1 work: independently review completed full verification/source evidence, then make a scoped commit separating preexisting package.json changes. If verification fails, inspect preserved reports and fix only the failing stage before launching another isolated run. Continue P4B.2 after the P4B.1 exit is satisfied. No duplicate verification, push, workflow dispatch, deployment or notification was performed.
