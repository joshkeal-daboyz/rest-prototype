# 077 · The 3D view's tests on the shared cache, and the old tile-city tests

owner: renderer (section A only, and only if Josh takes Q1 option 2; no planner work: no new profile is needed)
status: open
branch: `ticket/077-render3d-shared-cache` (only if a section is built)

## Josh's words (23 Nov 2026, in chat)
Context: GitHub CI on `main` fails although all 223 test files pass, because vitest reports `[vitest-worker]: Timeout calling "onTaskUpdate"` (run 45197616087). He asked "Would it be better if we made this more efficient?" and was shown two options. Option 1 was "Move the 3D view's remaining city builds onto 076's shared cache, and find out whether the older tile-city tests still test anything live, since the old tile city was retired." He answered:
> "Cut tickets for options one and two"

Option 2 is ticket 078. He gives G1 before any build.

## What the architect found (read 23 Nov 2026 on `design/077-078-test-speed` at 86ee932)

**Short version: there is almost nothing left in `src/render3d/` to move onto the cache, and the old tile city has not been retired yet.** Two of option 1's premises do not hold on this head:
1. 076 B8 already moved every named-city and era build in `src/render3d/` onto `sharedCity` / `sharedEra`.
2. 070 L2d, the section that deletes the old tile path, is cut and approved but **not built**. L2a, L2b and L2c are merged. `city=tiles-old` still routes through `renderer.ts` to `createCityRenderer3d`, which builds `tileCity` (dev builds only). `plan3d.ts`, which draws the pipeline's city, still imports `createCityRig`, `interiorGroupOf`, `propInput`, `tileGroupOf` and `tileKeyOf` from `tilecity3d.ts`, plus `TILE_M`, `SIDEWALK_WALK_M` and the kit tables from `tilecity.ts` and `tileslots.ts`.

076's closing note said the older `tileCity` tests were "most of that folder's 401 s". That was an estimate, and the measurements below show it was wrong: those tests take about 43 s of the folder's 325 s.

**Measured.** The gate at fb8392a (`D:\rest-prototype-073gate\gate-fb8392a.txt`, `--maxWorkers=2`, 665.5 s wall) summed 324.9 s of test time for `src/render3d/`. The files over 5 s:

| File | Gate (s) | Alone (s) | What it spends its time on |
| --- | --- | --- | --- |
| `plan3d.test.ts` | 108.7 | 85.8 | Drawing the 20 named runs (Three.js groups, stub packs). Its cities already come from `sharedCity(o, "clean")`. Alone, the cache is cold, so the file built all 20 itself (20 builds logged through `REST_CITY_CACHE_LOG`, about 17 s at about 0.85 s each), and the other roughly 69 s is drawing. |
| `furniture.test.ts` | 42.2 | (not run) | The ladder maps' furniture, with no city build. One test takes 36.5 s (ticket 078). |
| `terracepack.test.ts` | 18.0 | | The ladder's terraces. No city build. |
| `sills.test.ts`, `escapes.test.ts`, `dressdraw.test.ts`, `stacks.test.ts` | 13.2, 12.1, 11.6, 10.1 | | The ladder's modules, on ladder towns and typed fixtures (L2c re-pointed them). No pipeline build. |
| `eraview.test.ts` | 11.1 | | Cached, except `noPassRunOf` (below) |
| `tilecity.test.ts` | 11.6 | 8.4 | The old path (below) |
| `tileintegrate.test.ts` | 10.3 | 7.9 | The old path |
| `kerbline.test.ts` | 7.7 | 6.0 | The old path |
| `packpin.test.ts` | 6.6 | | Ladder pins |
| `frontage.test.ts` | 5.8 | 4.3 | The old path |

"Alone" means one file at a time on this branch, `--maxWorkers=2`, with nothing else of the crew's running (the machine was not otherwise idle: `ruin/named.test.ts` took 165 s alone against 114.5 s in the gate, so the alone numbers can vary).

**Every city build in `src/render3d/` tests that does not go through `sharedCity` / `sharedEra`:**

| Where | Build | Recommendation | Reason |
| --- | --- | --- | --- |
| `eraview.test.ts` `noPassRunOf` | `runCityEra(OPTS, era, HISTORY_ONLY)`, three times (one clean build and history each) | **Keep as is** | 076's rule 5: a `HISTORY_ONLY` run tests the runner with a swapped stage list and stays uncached. The one test that uses it, "with no pass built, every era above clean draws the clean city" (4.5 s), is the test open PR #3 gives a 30 s timeout. Touching the file now would collide with #3. If it were moved, the saving would be about 2.5 s (three clean builds). |
| `plan3d.test.ts` line 175 | `tileCity({ blocksX: 3, blocksZ: 3, seed: 1 })`, once, while the file is collected | **Keep as is** | It pins `tileGroup` / `interiorGroup` draw hashes. Those are the helpers `plan3d.ts` draws with, and L2d keeps them. It costs well under 1 s, and the pipeline cache holds no `tileCity`. |
| `stacks.test.ts` line 759 | `cityApplyOptions(tileCity())` | **Keep for L2d** | L2c sorted it as kind (b), a test of the old city's own use, left for L2d to delete. |
| The 9 old-path test files (next table) | `tileCity(...)` in most cases | **Keep for L2d** | See the next table |

**The old-path test files.** Each still tests code that runs, at least in a dev build at `city=tiles-old`. None is dead on its own. Deleting a test while its code stays would loosen a check (070's LR rule). L2d deletes each file, or part of a file, together with its code, and keeps the tests of what `plan3d.ts` reads.

| File | Gate (s) | Alone (s) | Code it tests | Live where | Recommendation |
| --- | --- | --- | --- | --- | --- |
| `tilecity.test.ts` | 11.6 | 8.4 | `tileCity`, its blocks, units, parking | `city=tiles-old` only | L2d deletes it with `tileCity` |
| `tileintegrate.test.ts` | 10.3 | 7.9 | the old city integrated with the ladder's dressing, furniture and stacks | `city=tiles-old` only | L2d deletes it |
| `kerbline.test.ts` | 7.7 | 6.0 | `tileKerbPlan`, `kerbLine`; the `KerbPlan` / `KerbFace` / `Mp` types | `city=tiles-old`; `plan3d.ts` uses the types only | L2d deletes the old cases and keeps the types |
| `frontage.test.ts` | 5.8 | 4.3 | `frontage.ts` (read only by `tilecity3d.ts`) | `city=tiles-old` only | L2d deletes it with `frontage.ts` |
| `alleys.test.ts` | 4.1 | 3.3 | packed old cities: alleys, block sizes | `city=tiles-old` only | L2d deletes it |
| `tilecity3d.test.ts` | 2.0 | 1.5 | `buildCityScene` (old) **and** `createCityRig`, `tileGroup`, `tileKeyOf` (read by `plan3d.ts`), the tile sheet (kept, Q47) | mixed: old view, pipeline view, sheet | L2d keeps the cases on code that stays |
| `tileinterior.test.ts` | 0.7 | 0.5 | `interiorItems`, `interiorGroup`, `propInput` (read by `plan3d.ts`), gates and passages (old) | mixed | L2d keeps the cases on code that stays |
| `tileslots.test.ts` | (under 0.5) | 0.2 | the kit tables `plan3d.ts` imports; `oldTilesRequested` | mixed | L2d keeps the cases on code that stays |
| `parkmetrics.test.ts` | (under 0.5) | 0.1 | `parkmetrics.ts`, which only tests read (070 L2's own note) | nowhere: the code is dead apart from its tests | L2d deletes both. It is the one file that is dead now, and it costs 0.1 s |

Together these 9 files take about 43 s of the gate's summed time (about 32 s alone), and none of them builds a pipeline city. Running L2d is what takes this time out of the gate. Moving builds onto the cache does not.

**Target for `src/render3d/`.** Moving builds onto the cache: **0 s**, because nothing is left to move without breaking 076's rule 5 or colliding with #3. With L2d built: the folder's summed time in a full gate at `--maxWorkers=2` drops from 324.9 s to **about 290 s or less**. That is about 35 s from the deleted old-only files (tilecity, tileintegrate, frontage, alleys, parkmetrics, most of kerbline) and nothing from the mixed files' kept cases. Beyond that, most of the folder's time is `plan3d.test.ts`'s drawing, about 69 s, and the ladder modules' own checks. Neither is a city build, and neither fits under option 1.

## Goal
Josh knows exactly which 3D-view tests still build a city outside the shared cache, which old tile-city tests guard live code, and what each would save, so he can decide whether anything here is worth building. With Q1's recommended answer nothing is built under 077. The old path's tests go with their code when 070 L2d runs.

## Sections

### A · (only if Josh takes Q1 option 2) The era view's no-pass runs over the shared clean plan (renderer)
Start this only after PR #3 has merged into `main`. Branch from `main` after that merge.

Acceptance criteria:
- [ ] (Reviewer, from the diff) In `src/render3d/eraview.test.ts`, only `noPassRunOf`'s body and the imports change. It becomes `runEraStages(<the shared clean plan>, era, HISTORY_ONLY)`, which is what `runCityEra` runs after its own `runCity`. No `expect`, `it`, `describe`, timeout (PR #3's included) or city changes, and the count of `expect(` is unchanged.
- [ ] (Vitest) The test "with no pass built, every era above clean draws the clean city" still passes, and so do the file's other 12. `npx vitest run --maxWorkers=2 src/render3d/eraview.test.ts`, run once.
- [ ] (Builder report) The file's time before and after, alone. The expected saving is about 2.5 s.

Files: `src/render3d/eraview.test.ts` only.

### B · Measure (main session; applies whichever answer Josh gives)
- [ ] The full local gate (`npm run gate`) passes with the same test count, before and after any 077 or L2d change. Each run happens alone on the machine at `--maxWorkers=2`.
- [ ] The `src/render3d/` summed time is reported from the gate before and after. If L2d runs, the target is 290 s or less from 324.9 s. If it is missed, the per-file numbers go to Josh and no check is loosened.
- [ ] Nothing global is loosened: no `testTimeout`, `hookTimeout`, pool or worker setting changes in `vite.config.ts`.

## Files
- Section A: `src/render3d/eraview.test.ts` only.
- Nothing else. The old-path files and their tests are 070 L2d's (its own Files list). `src/city/testing/` needs no new profile: every render3d build that could be cached already is.

## Interfaces
None. No new type, event or dependency. Section A would use `runEraStages`, which already exists in `src/city/pipeline/eras.ts`.

## Open questions (for Josh)
- **Q1, what to build under 077.**
  - **Option 1 (recommended): build nothing under 077.** Close it as answered by the measurements above, and start 070 L2d (already cut, and approved to start once L2a to L2c merged, which they have). L2d deletes the old tile path and the 9 files' old-only cases with it, about 35 s of the gate's summed time. This needs Josh's word on when L2d runs, because he has not yet been asked to schedule it.
  - **Option 2: build section A as well**, after PR #3 merges. It saves about 2.5 s and moves one deliberately uncached `HISTORY_ONLY` run onto the shared clean plan. That relaxes 076's rule 5 for this one file, so it needs Josh's word.
  - **Option 3: delete only `parkmetrics.test.ts` with `parkmetrics.ts` now**, ahead of L2d. These are the only test and code that nothing live uses. It saves 0.1 s. Not worth a branch. Listed for completeness, because deleting a test is Josh's word.
- **Q2, the drawing time in `plan3d.test.ts` (about 69 s alone).** Recommended: no ticket now. The file draws all 20 named runs again in several tests. A per-file memo of the drawn groups could share one drawing between tests, but the tests then share Three.js objects that a test could mutate. That is a riskier change than 076's frozen plans and it is not a city build. Ticket 078 already keeps this file's long tests from holding the worker. If Josh wants the folder faster still, a renderer ticket should measure how many draws repeat first.

## Not in this ticket
- Ticket 078: no long uninterrupted test. It is independent of 077, and either may go first. 078 fixes the CI error and 077 does not.
- 070 L2d itself (its own criteria, Files and review).

## Within approved scope?
Yes. It measures and recommends. Section A, if taken, is one test helper's body. No stage, pass, pin, schema, Decided rule or dependency changes, and `tickets/rules-coverage.md` is unchanged.
