ticket: 070c1-mass
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 3 (mass) of the city pipeline, without courts. Every block cell is built or a named open use: court parts get rings 1 and 2 built, then the apron, then green with paths. Strips get both rows built. Lanes, plazas, parks and walk-throughs are recorded as `CityOpening`s. Each built cell records its open sides, frontage, column kind and partner. M3, M4b, M5, G2, G3 and R1 hold on the named cities, with the four failing fixtures, and R-1 to R-7 hold for `mass`. This is round 2. Round 1 (`reviews/070c1-mass-round1.md`) had one must-fix: R-7 linearity.

## Does the branch do it?
I reviewed `git diff 10b1b41 c53a2a7`, which touches only `src/city/mass/check.ts` and `src/city/mass/plan.ts`. The gate was reported green (tsc clean, 2957 passed, 20 skipped). As asked, I did not re-run it.

**Round 1 Must fix 1 (R-7 linearity): fixed.**
- `check.ts` `checkM4b`: `land.parts.find` per built cell is replaced by one `partById` Map, built once per call.
- `check.ts` `checkM5`: `land.parts.find` per open cell is replaced the same way.
- `plan.ts` `planMass`: `lanesOf`, `parksOf` and `partsOf` group lanes, parks and parts by block once, before the block loop. The per-block `.filter` calls are gone.
- `plan.ts`: the one `partById` Map is passed to `layBlock`. It is no longer rebuilt for every block.
- **Expected effect, "same layer, same digests": met.** The change only swaps lookups. Iteration order is kept: grouping preserves the order of `land.*`, so each block sees its items in the same order the old `.filter` gave. The four R-4 digest pins are unchanged in the diff, and the gate passes with them.

**The whole stage is now linear in cells.** I re-read every pass in `src/city/mass/`.
- `check.ts`:
  - `indexOf`, M3, M4b, G2, G3 and `frontageShare`/R1 are each one pass over cells, built cells or block cells, with Map/Set lookups.
  - M5 is one pass over the openings' cells, one pass over cells, and per court part one pass over its own cells (stretch rows plus interior).
- `plan.ts`:
  - `planMass` does per-block work over that block's own cells and items.
  - `layBlock` is one pass over the block's cells. Its `pointers` lists hold at most 4 entries per cell.
  - `stage.ts` `picture` is one pass over cells.
- What remains super-linear is local to one part or one block, and bounded by that part's or block's size. It does not grow with the city:
  - the walk-through search: round 1's could-improve 3, carried forward;
  - the `group` helper's array spread: see Could improve 6.

**The other criteria are carried forward from round 1 unchanged.** The round-2 diff touches none of the code they rest on.
1. Court parts: met.
2. Strips: met.
3. Openings: met.
4. Open sides, column kind and partner: met.
5. Checks M3, M4b, M5, G2, G3 and R1, with the fixtures: met.
6. R-1 to R-7: now met. R-7 linearity was the one gap.

**The five readings the planner flagged: round 1's verdicts stand.**
1. The lane as two openings (`/lane/a` and `/lane/b`): acceptable.
2. M5's lane exemption: acceptable for C1 only. It must be lifted in C2.
3. The row-stretch reading and the 6 x 6 throw: correct, and forced by the ticket.
4. The partner rules: correct for mid columns and the ring-2 corners, acceptable elsewhere.
5. R1 on cells: acceptable. It is stricter than before, and the 0.88 floor is unchanged.

## Rule conflicts and risks
- **Files outside C1's list (carried from round 1).** `src/city/stages.ts` and `src/city/pipeline/run.test.ts` are not in C1's Files. The architect should record them, as was done for `planview.test.ts` in 10b1b41. This is for the main session, not the builder.
- **Grammar gap, for Josh (carried from round 1).** A lane-less 6 x 6 court part cannot get a walk-through without un-blinding a ring-2 corner (rule 4) or leaving a 1-cell stretch (rule 6). Today the stage throws M5 on such a part. No named city has one. Josh or the architect needs to choose one:
  - land never leaves such a part;
  - a walk-through may un-blind a ring-2 corner;
  - the stage keeps throwing.
- **M5's lane exemption** has no end date in the code (carried from round 1).
- The round-2 diff stays inside `src/city/mass/`. It adds no dependency, changes no GDD Decided rule, and does not touch `src/grid/` or `src/night/`.

## Must fix
none

## Could improve
1. Make the M5 lane exemption explicit for C2. Either add a C2 criterion ("a lane part's interior touches a drive"), or put a named constant or comment in `checkM5` that C2 must delete. (Carried from round 1.)
2. Ask the architect to type `CityOpening.mouth` as a list of `{ street, cells }` before D2, so a lane is one opening with two mouths, as rule 6 describes. (Carried from round 1.)
3. The walk-through search in `planMass` re-runs `stretchProblems` over the whole part for every candidate offset, which is quadratic in the part's perimeter. Checking only the rows a candidate touches would be cleaner. (Carried from round 1.)
4. `plan.ts` and `check.ts` decide "court" with `shortSideOf(p) >= 6`. Reading land's `part.shape`, or one named constant, would keep the two stages from drifting. (Carried from round 1.)
5. The report test's "old frontageCovered" column is a typed-in string, not a computed value. Either compute it or drop the column. (Carried from round 1.)
6. New in round 2, minor. `plan.ts`'s `group` helper (`m.set(x.block, [...(m.get(x.block) ?? []), x])`) copies the block's list on every insert, so it is quadratic in the number of items per block. `layBlock`'s `pointers` uses the same pattern. Both are bounded by block size, so this does not break R-7. Getting the list and calling `push` would be linear and would leave the digests unchanged.
