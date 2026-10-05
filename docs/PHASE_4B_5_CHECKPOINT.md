# Phase 4B/5 checkpoint — October 5, 2026

**Current state:** P4B.1?P4B.3 accepted (`4936a47`, `063ea57`, `6eb5e71`); P4B.4 preparation reviewed and committed as `4ca543c`. No jobs running. Hosted secrets/publication/new scheduled run/API readback/notification settings remain open. Phase 5.1 research may proceed independently; P5.2 remains gated.

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

## P4B.2 closure and P4B.3 validation launch

P4B.2 was independently reviewed against all 3,178 snapshot files and 14 preserved artifacts: 502 passed tests, two expected diagnostic cases, and all seven live Neon ingestion groups passed. Commit `063ea57` closes this step; raw review and closure are in `.tools/phase-five/p4b-2-verify-1/`, with published review in `docs/perf/phase-five/p4b-2-review.md`.

P4B.3 implements validated public DTOs, bounded search/object/status routes, sanitized configuration/database errors, provenance-aware caching, and an accessible server-rendered `/status` page. Identity-only spacecraft explicitly lack positions. Private provider state and database errors are withheld. The 16 focused tests pass and web TypeScript passes. The `server-only` dependency and generated third-party notice are included. Domain index changes must be staged separately from preexisting Phase 4 exports. Preserve all accepted uncommitted Phase 4 files and evidence.

Planned isolated job: `node tools/run-phase-five-validation.mjs --prepare p4b-3-verify-1 --api-validation`, followed by hidden persistent execution using its launch manifest. It runs offline install/full verify, credential-free production build, engine/startup/assets budgets, local dummy ingestion proof setup, four configured and two unconfigured production browser cases, accessibility and desktop/mobile captures, and standalone shell attribution. Local dummy setup is not scheduled-ingestion acceptance. Owned servers use ports 3104/3105 and are cleaned up; root dev server/build remain untouched. Secrets are read only from ignored local configuration and are not snapshotted.

Resume using `node tools/phase-five-status.mjs`; review `.tools/phase-five/p4b-3-verify-1/result.json`, stage logs, browser JSON/captures and budgets against frozen source before acceptance/commit. Never rerun the same manifest or overwrite evidence. P4B.4 scheduled proof and Phase 5 remain outstanding; no push/deployment/workflow dispatch has been performed.

P4B.3 persistent runner PID: 15388. Frozen source SHA-256: d1170ec49c1d18983cc2639460fbcc6adea34b8923416c8b2c11cda8763f4afa. Status command: `node tools/phase-five-status.mjs`. Runner logs: `.tools/phase-five/p4b-3-verify-1/runner.log` and `runner-stderr.log`.

## P4B.3 first-run build failure and correction

`p4b-3-verify-1` finished with install/full verify passing (518 tests plus two expected diagnostics, 62 files) and production build failing. Turbopack attempted to resolve the ignored `.env.local` asset from the DB configuration module. API/browser/budget stages did not execute; this is not an accepted API step. Original logs/result are preserved, with `failure-review.json`.

Moved `loadDatabaseEnvironment` into `packages/db/src/cliEnvironment.ts`, exposed only through the explicit `@space/db/cli-environment` entry; server-facing config no longer imports local-file loading code. CLI, Drizzle and integration consumers were updated. The boundary checker permits this entry only in ingestion CLI configuration. No secrets were copied into the candidate. DB TypeScript, targeted lint/boundaries and 26 focused tests pass; real `pnpm.cmd db:check` succeeds after the separation.

Replacement job `p4b-3-verify-2` repeats the full frozen-candidate protocol to verify the fix in a real production build. Review its original source/result/log/browser/budget evidence before committing. The root development server and `.next` remain untouched.

Replacement persistent runner PID: 27956. Frozen source SHA-256: f8de9224604d96ecd06140c756f1857b2eb83285e65d8bedda60d626ceb47272. Status: `node tools/phase-five-status.mjs`. Raw logs/results: `.tools/phase-five/p4b-3-verify-2/`; review build first, then API/browser/budget outcomes.

## P4B.3 acceptance

Commit `6eb5e71` closes P4B.3 after independent raw/source review: all 3,190 source files and 14 preserved artifacts matched. Full verify passed 518 tests plus two expected diagnostics; build, 4 configured/2 unconfigured browser cases and budgets passed. Desktop/mobile status captures reviewed. Engine gzip 380,494 / 450,000; startup estimate 1,086,033 / 1,500,000; root shell 196,599 / 200,000; Earth/Charon 192,964 / 200,000. Original acceptance and closure remain in `.tools/phase-five/p4b-3-verify-2/`; published review `docs/perf/phase-five/p4b-3-review.md`. Preexisting Phase 4 changes remain unstaged.

## P4B.4 preparation

Prepared `.github/workflows/ingest.yml` and `packages/db/src/recordIngestionProof.ts`; operational instructions are in `docs/DATA_PLATFORM_SETUP.md`. Cron 17 every two hours UTC, serialized/non-cancelling concurrency, read-only contents, secrets limited to runtime step, no migration/seeding/resume, Node 24 and pinned pnpm. Evidence distinguishes a new success from a due-suppressed invocation and associates GitHub run/event/source with narrow state/run/snapshot readback. No raw payload/private state/credentials are emitted. DB TypeScript and targeted lint pass; real local readback succeeds for the existing dummy snapshot.

Planned `p4b-4-verify-1 --workflow-validation` checks full verify, YAML syntax and live readback. This cannot establish scheduled acceptance. GitHub connector confirms admin access and default `main`, but repository secrets/notification settings have not been checked and no push/dispatch was performed. GitHub CLI is unavailable; the connector remains usable for repository inspection. Publication needs the accepted Phase 4 baseline too, since much of it remains uncommitted. Preserve it and obtain a concrete publication decision after preparation review. P5.1 independent fixture research may proceed while hosted prerequisites are pending; P5.2 must wait for the scheduled gate.

P4B.4 preparation runner PID: 28480. Frozen source SHA-256: 0407571d1c94f377a79c5617605a05430e6fd3f2c9961df5493f7f39d959a2c5. Status: `node tools/phase-five-status.mjs`. Logs/results: `.tools/phase-five/p4b-4-verify-1/`. Review preparation evidence first; hosted scheduled acceptance remains outstanding.

## P4B.4 first preparation review and artifact correction

`p4b-4-verify-1` passes all local stages: 518 tests plus two expected diagnostics, YAML syntax and real proof readback. Independent review matches candidate source and 14 preserved artifacts. Readback explicitly shows `event=local` and `newSuccessDuringInvocation=false`, so no scheduled success is claimed. Review identified that `actions/upload-artifact@v4` excludes hidden files by default; the exact `.tools/ingestion-proof.json` artifact now sets `include-hidden-files: true`. Only that workflow source changed after the run. Revised frozen job `p4b-4-verify-2` will verify preparation; prior evidence remains intact. Hosted secrets, publication, new scheduled run/API readback and notifications remain pending.

Corrected P4B.4 preparation runner PID: 28096. Frozen source SHA-256: 0ef857c2fa47b37dd5adbacd0c0efcd57c12804419cd3a4e69878415e29cb006. Status: `node tools/phase-five-status.mjs`. Raw logs/results: `.tools/phase-five/p4b-4-verify-2/`. Resume by reviewing this run first; no duplicate runs or hosted publication yet.

## P4B.4 preparation closure

`p4b-4-verify-2` independently reviewed: all 3,192 source files, 14 preserved artifacts and stage outputs match. 518 tests plus two expected diagnostics, YAML syntax, safe live proof readback pass. The hidden-artifact correction is included. Commit `4ca543c` records preparation, not completed scheduled acceptance. Remote `main` is `4409ef5d8f97299d9058360c97d560493d067c1c`, an ancestor of the current local commits; 33 local commits are ahead before the publication snapshot. No remote divergence or push is present.
