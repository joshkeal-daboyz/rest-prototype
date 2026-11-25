# CI times

One row per measurement: the whole everyday suite (`npm test`, one city) on CI, taken after every tenth pull request merges into `main` ([test-policy.md](test-policy.md), rule 5). Test CPU is vitest's summed "tests" time across CI's 4 workers; the test step is vitest's own Duration; the job is the whole CI job, install and typecheck included.

| Date | After PR | main commit | Test files | Tests | Test CPU | Test step | Job | Note |
|---|---|---|---|---|---|---|---|---|
| 2026-11-23 | #3 | bd00876 | 224 | 4,709 | 1,029 s | 390 s | 7 min | Baseline before ticket 079: all 20 named cities in `npm test` |
| 2026-11-23 | #10 | 29f1256 (PR head) | 218 | 4,186 (64 skipped) | 959 s | 372 s | 6.6 min | Ticket 079 PR 1 only; 140 s of city builds moved to untouched files through the shared cache |
| 2026-11-23 | #20 | b5f4ad3 (main, after #20 and #21) | 212 | 4,090 (64 skipped) | 441 s | 204 s | 3.7 min | After all of ticket 079, and 081 C1 and PK1; manual run `cities=one` |
| 2026-11-24 | #30 | 6443518 (main, after #30) | 209 | 3,836 (63 skipped) | 395 s | 213 s | 3.8 min | After 081 A1, K2a, K2a2 (stage 6 on), A2a, A2d, E1; before A2c deletes the ladder's tests |
| 2026-11-24 | #40 | 66beba9 (main, after #40) | 189 | 3,220 (56 skipped) | 588 s | 302 s | 5.4 min | After 081 K2b, D2, D3, K2c (convert), I2; up 89 s on the step since #30 |
| 2026-11-24 | #50 | 479c0fe (main, after #49 and #50) | 194 | 3,264 (56 skipped) | 627 s | 322 s | 5.8 min | After 081 K2d1, K2d2, P0, K3, U1, E2, U2 and 082 A, B; up 20 s on the step since #40 |
| 2026-11-24 | #60 | 4dacc93 (main, after #60) | 196 | 3,280 (56 skipped) | 752 s | 339 s | 6.0 min | After 081 K2c to L2 (city puzzle, circuit, play on the city, lights, section F); collect alone is 185 s. The push run on 4dacc93 hit the 5 s timeout in `overlay.test.ts` (`loadCityView`, 6.1 s) and passed on re-run: noise, not logged |

## Failure log

Every real failure of CI's `test` check, or of a test run that stood in for it ([test-policy.md](test-policy.md), rule 8). A timeout that passes on a re-run is load, not a failure, and is not logged. After 10 more PRs (from #28) the main session reports which test files never appear here.

| Date | PR / branch | Where | Test file and case | Cause | Typecheck alone? |
|---|---|---|---|---|---|
| 2026-11-23 | #23, 081 K2a | CI | `npm run typecheck`, `src/city/circuit/stage.ts` | PK1 (#21) merged first and made `CityCircuitLayer.poleModels` required | Yes |
| 2026-11-24 | #30, 081 K2a2 | CI | `src/city/holdout/named.test.ts` (power and settle digest); `holdout/stage.test.ts` (2 barricade cases: T-2 pole seal, "expected 38 to be less than 33"); `ruin/named.test.ts` ("no circuit ... until K2", under-span 19; growth digest) | Switching stage 6 on gives the era passes real poles and wires; their tests assumed none. The builder had not run these files | No |
| 2026-11-24 | #37, 081 D2 | CI | `src/ui/view3d.test.ts`, "leaves ?assets= as it was" | D2 added `component` to the gallery's options; A2d's case pinned the whole object | No |
| 2026-11-24 | #34, 081 K2b | CI | digest pins only: `holdout/named.test.ts` (settle), `ruin/named.test.ts` (growth), `tech/named.test.ts` (criterion 9) | Intended: lights and drops now reach the era passes; three tripwire pins re-taken | No |
| 2026-11-24 | #39, 081 I2 | CI | digest pins only: `tech/named.test.ts` (criterion 9), `holdout/named.test.ts` (settle), `ruin/named.test.ts` (growth) | Intended: stage 8 keeps clear of the circuit, which reaches the era passes; the ticket listed ground and traffic pins but not these | No |
| 2026-11-24 | #44, 081 K3 | CI | `src/render3d/powerkit.test.ts`, "purity > powerkit.ts imports only ..." | An optional tidy-up (FEED_POLE_KEY read from COMPONENT_MODELS) added an import; undone | No |
| 2026-11-24 | #64, 081 H4 | CI | digest pins only: `ground/stage.test.ts` (R-4), `traffic/stage.test.ts` (R-4), `ruin/named.test.ts` (growth) | Intended: roof props turned away from corner keep squares move the facades digest, which reaches stage 8, stage 9 and the ruin growth; the builder ran only its folder | No |
| 2026-11-23 | 081 E1 | local gate (before this log) | `src/render3d/captions.test.ts`, "ON/OFF > matches the literal 2D draws (drift guard)" | The guard read `map-renderer.ts` as text; E1 moved the draw to `glyphs.ts` | No |
