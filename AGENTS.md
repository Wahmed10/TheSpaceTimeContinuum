# Repository agent instructions

## Long-running jobs: launch, hand off, and end the turn

The user explicitly wants to avoid spending conversation tokens waiting for long jobs. This rule applies to all agent sessions in this repository.

- For jobs expected to take several minutes, such as hosted CI, browser suites or CPU benchmarks, launch the job and confirm that it was accepted or started. Use a background execution method that survives the end of the turn.
- Do not remain active solely to wait for completion. Do not repeatedly poll status, run sleep/wait loops, or send repetitive progress updates while the job runs.
- Before ending the turn, record enough information to resume: the run URL/ID or local process/session identifier, command, log/output location, tested commit where relevant, and the next review step. Use the relevant checkpoint or handoff for durable state.
- Every running-job handoff must also give the user an exact command to check status. For Phase 4 local runs, update `.tools/phase-four-active-job.txt` and provide `node tools/phase-four-status.mjs`; provide the raw result/log location too. For other jobs, give the equivalent command or hosted run URL. The user requested this on October 2, 2026.
- End with a concise final response linking the run or naming the output location. State that it is queued/running and what remains to be reviewed. Never report unreviewed work as passed.
- When the user returns, check the existing job first and review its results. Do not launch a duplicate job just because a new session began. If a fix requires another long run, launch it and end the turn again.
- Short commands and brief startup/status checks are fine. If a job unexpectedly becomes long-running, apply this rule once that is clear. If it cannot survive the end of the turn, arrange persistent execution before handing it off; do not silently terminate it.
- A later explicit user request to wait or monitor a particular run overrides this preference for that run.

Ending the turn under this rule is a handoff, not cancellation or completion of the underlying task. Do not promise to notify the user automatically when no notification mechanism has been configured.
