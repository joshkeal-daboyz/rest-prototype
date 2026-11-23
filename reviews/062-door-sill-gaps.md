ticket: 062-door-sill-gaps
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A: every building the town can place has a measured door sill, a typed one with a reason, or a reason it has none (`NO_STREET_DOOR`). Windows and front steps are never buried. B: in a mixed-sill stack each ground piece is lifted so every door meets the walk. Where a lift would reach the first floor's window, the stack keeps to one sill band. Dressing follows the lifted pieces, and the ladder maps change only in heights, plus the band where it is needed.

## Does the branch do it?
Round 2. I reviewed `git diff 8728bd4 6e6d1ae` and re-checked the whole branch against `fee26bf`.
- Gate (main session): tsc clean, 2597 passed, 14 skipped.
- `npx vitest run --maxWorkers=2 src/render3d/sills.test.ts` in `D:\rest-prototype-062`, which has the GLBs: 83 passed, including the real-geometry re-measures.
- I also ran two throwaway checks there, since deleted (`git status` clean). One ran `cityMetrics` on the maps' plan. The other compared the banded and unbanded packing on the maps and on all 13 tile cities that `frontage.test.ts` uses. Their numbers are used below.

**Criteria A1 to A4, B5 to B8, B10:** as in round 1, still met. The round-2 changes touch only the band and the plan.
- Could improve 3 is done: the GLB test now shows each per-key depth is needed, since at `SILL_DEPTH_M` the key reads nothing or another sill.
- Could improve 4 is done: the A4 fixture and the table-wide check now share `stepBuried`, and the fixture also goes through `houseSill`.

**Round-1 must-fix 1: the checked plan is the drawn town. Fixed.**
- `bandPacked` (`models3d.ts`) is a pure function. `applyModels` calls it once, and its result is all of these:
  - what is drawn (`packed.get(run.id).blocks` in the terrace loop);
  - what the furniture is laid by (`furnitureInput(bundle, packedRuns, …)`);
  - what `applied.packed` hands back.
- `tilecity3d.ts` builds its passage floors from `tilePassages(city, applied.packed)`, so the tile city's own path also sees the banded packing.
- `planOf` in `citymetrics.test.ts` and in `tileintegrate.test.ts` now applies `bandPacked`.
- `tileintegrate.test.ts` asserts `applied.packed` deep-equals `bandPacked(packTown(...))` on the tile city (wall and back) and on the three maps. So plan and drawn packing are tied by a deep-equal, not only by a count.

**Old and new metrics: honest.**
- My run of `cityMetrics` on the banded plan gives exactly the guide's "after" numbers:

  | Map | `shopsGlassed` | `dressPieces` |
  | --- | --- | --- |
  | `01-first-light` | 179 | 1052 |
  | `09-shrine-circuit` | 189 | 1121 |
  | `64-the-whole-chain` | 247 | 1472 |

  No R item fails on any of them.
- The "before" numbers match round 1's unbanded plan.
- Taking `Shop_06` out of the bands is why the numbers now go up rather than down. The new test `gained blank fronts` holds every banded block to no more `Shop_06` than it had.

**R12 strict: restored.**
- The line is again `expect(applied.dress.length).toBe(plan.dressing.reduce((s, d) => s + d.length, 0))`, the same as at `ab9d01f`.
- Against `ab9d01f`, the only other change in `citymetrics.test.ts` is the `bandPacked` call in `planOf`.
- I found no other loosening. `sameAboveGround` is now stricter than in round 1: it also compares the reach past the columns at both ends. The test copy is gone and the tests import the exported function.

**The z shift (your question 2): sound to accept.** My comparison of the banded and unbanded blocks on the three maps found:
- **Front edge:** the frontmost face of every banded block stays on the lot's front line (the most it moves is 0). In back alignment the frontmost face is always put at z = 0, so no gap opens toward the walk.
- **Neighbours:** lot x, width and reach are unchanged on every banded block (0 differ), so no gap or overlap opens with the next block.
- **Depth:** every banded block stays within the 6 m terrace lot depth (0 over). The deepest increase is 0.309 m on `01`, at the back.
- **Street-level recess (the ground pieces behind the frontmost face):**
  - on banded blocks, the largest is 0.771 m before and 0.509 m after;
  - one block on `01-first-light` gets 0.108 m more recess on one ground piece;
  - nothing grows on `09` or `64`.
- **What moves:** the z shift is the upper floors and roof sitting 0 to 0.4 m further back or forward behind a street front that stays put. That is a setback above street level, not a recess at the sidewalk.
- **Josh's ruling:** his "recessed from the sidewalk ... gap of nothing" ruling is enforced by G1 on the wall-aligned tile city. There `zShift` is asserted to be 0.
- **G1 to G4 on the banded tile city:** I ran them with the independent `GROUND_FACE_M` pin on all 13 tile cities. They pass on the banded packing (9 to 39 banded blocks per city), and the gated passages are identical to the unbanded ones.
- **Verdict:** keeping these blocks unbanded would put doors up to 0.22 m under the walk, which fails criterion 5. Accepting the shift is the right call, and the guide now says it.

**B9. Ladder maps: met, with the band as the stated exception.**
- Layout, lots and furniture are deep-equal (`sills.test.ts`, and `tileintegrate` furniture vs pure).
- `evaluateCity` verdicts are unchanged.
- The metrics change only by the banded ground rows, and the guide records the numbers.

**B11 and B12:** these are for the main session. `git ls-files assets/private` is empty.

## Rule conflicts and risks
- **Out-of-list test files.**
  - `citymetrics.test.ts`: the `planOf` band and strict R12, which is what round 1 asked for.
  - `tileintegrate.test.ts`, your question 4: legitimate. Its three `applied.packed` assertions would fail without the change, and its `planOf` must match the game. Nothing in it is loosened: each `toEqual` is still a deep-equal, now against the banded packing.
  - `facing.test.ts` and `terracetown.test.ts`: as accepted in round 1.
  - None of the four is in the ticket's Files list. The merge note or the ticket should record them, as 055 F's were.
- **Must-not-touch files:** against `fee26bf`, the 062 diff touches only `sills.ts`, `stacks.ts`, `models3d.ts`, the guide and the test files above. There is no change in `src/grid/`, `src/night/`, `src/core/`, `tests/`, `puzzles/` or `package.json`, and no new dependency.
- **CI-safe:** `bandPacked` is pure. The new tests use stub sets. GLB reads stay inside `it.skipIf(!have)`, and there are no new paths or timers.
- **Guide wording:** the guide says "the pure plan (the metrics, the frontage, the passage floors) is made from them". The metrics and passages are. `frontage.test.ts` and `alleys.test.ts` still run G1 to G4 on the unbanded `packTown`. They pass on the banded packing too (my check), but no committed test shows it.
- **One block on `01-first-light`:** one ground piece now stands 0.108 m further behind its block's front than before banding. This is within the back-aligned recesses the ladder maps already have, and worth a glance in the criterion 11 screenshots.

## Must fix
none

## Could improve
1. Run G1 to G4 on the banded packing in a committed test. For example, apply `bandPacked` to `wall` in `frontage.test.ts`'s `cityOf`, or add one assertion in `tileintegrate.test.ts` on `applied.packed`. That makes the guide's "the frontage is made from them" true by test.
2. `tileintegrate.test.ts`, the furniture test near line 350, still builds its pure furniture from the unbanded `packTown`. It passes because furniture does not read the ground keys. Using `bandPacked` there would match what the game does.
3. `terracetown.test.ts` takes the drawn piece count from `applied.terrace`, which compares the game with itself. Comparing against `bandPacked(packed, …)` would make it an independent check.
4. Carried from round 1 (Could improve 5): a sign lifted with its piece can rise above the `roofTopOf` bound `dressing.ts` placed it under, by up to the lift. Josh's criterion 11 look covers it for now.
