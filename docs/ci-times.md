# CI times

One row per measurement: the whole everyday suite (`npm test`, one city) on CI, taken after every tenth pull request merges into `main` ([test-policy.md](test-policy.md), rule 5). Test CPU is vitest's summed "tests" time across CI's 4 workers; the test step is vitest's own Duration; the job is the whole CI job, install and typecheck included.

| Date | After PR | main commit | Test files | Tests | Test CPU | Test step | Job | Note |
|---|---|---|---|---|---|---|---|---|
| 2026-11-23 | #3 | bd00876 | 224 | 4,709 | 1,029 s | 390 s | 7 min | Baseline before ticket 079: all 20 named cities in `npm test` |
| 2026-11-23 | #10 | 29f1256 (PR head) | 218 | 4,186 (64 skipped) | 959 s | 372 s | 6.6 min | Ticket 079 PR 1 only; 140 s of city builds moved to untouched files through the shared cache |
| 2026-11-23 | #20 | b5f4ad3 (main, after #20 and #21) | 212 | 4,090 (64 skipped) | 441 s | 204 s | 3.7 min | After all of ticket 079, and 081 C1 and PK1; manual run `cities=one` |
