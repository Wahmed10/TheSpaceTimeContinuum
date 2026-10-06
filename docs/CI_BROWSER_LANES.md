# Browser validation lanes

Hosted Verify runs production builds, not Next development/HMR servers. Functional compatibility rendering uses SwiftShader, one worker per shard and three separately hosted shards, with no retries. Each shard has a 25-minute browser limit and a 35-minute job limit. These checks validate behavior rather than physical GPU throughput.

The explicit lists partition all 128 cases: 112 hosted functional cases, three production React profiling cases and 13 physical device/timing cases. Profiling uses its own next build --profile. Physical tests keep their numerical targets and adapter assertions unchanged. Hosted CI does not claim those device gates passed; accepted Phase 4 physical evidence remains applicable, and later runtime changes still require the device protocol.

After frozen install, run pnpm build and pnpm exec playwright test --config=hosted.playwright.config.ts. Profiling requires pnpm --filter web exec next build --profile, then profile.playwright.config.ts with SPACE_PRODUCTION_PROFILING=1. Physical measurements use a normal production build and physical.playwright.config.ts on actual compatible hardware. Software adapters cannot establish physical results.

Archived docs/perf evidence is excluded from source lint to preserve its hashes; active packages/apps/tools/tests remain linted. Legacy functional checks use the eight-result default search and current lab controls. Resource-reuse tests wait for progressive curve/texture readiness before their baseline, preserving exact no-growth assertions.
