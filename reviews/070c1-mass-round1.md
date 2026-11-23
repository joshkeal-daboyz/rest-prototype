ticket: 070c1-mass
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Stage 3 (mass) of the city pipeline, without courts. Every block cell is built or a named open use: court parts get rings 1 and 2 built, then the apron, then green with paths. Strips get both rows built. Lanes, plazas, parks and walk-throughs are recorded as `CityOpening`s. Each built cell records its open sides, frontage, column kind and partner. M3, M4b, M5, G2, G3 and R1 hold on the named cities, with the four failing fixtures, and R-1 to R-7 hold for `mass`.

## Does the branch do it?
Reviewed `git diff 7b6ad46...10b1b41`. The gate was green as reported; I did not re-run the suite. I ran one throwaway probe outside the repo: `runCity(..., "mass")` on 6 x 6 seeds 1 to 3, 4 x 4 seed 5, 5 x 3 seed 7 and 3 x 3 seeds 11 to 40. All returned ok, with R1 between 0.912 and 0.965. On the named 3 x 3 cities R1 is 0.933 to 0.960.

1. **Court parts (criterion 1): met.**
   - `plan.ts` `planMass` lays ring < `BUILT_RINGS` as built, then `APRON_CELLS`, then green with `pathCells` (fillGreen's rule).
   - Ring-2 corners are blind. `stage.test.ts` "court parts: rings 1 and 2 are built..." asserts every ring and the four blind corners on all 13 named cities. A plaza that takes a corner cell is the only exemption.
2. **Strips (criterion 2): met.** A 2-deep part has ring 0 on both rows, so both are "outer". `stage.test.ts` "strips: both rows are built and outer..." checks each row faces its own edge with the right face kind.
3. **Openings (criterion 3): met.**
   - Lanes get two mouth cells (`laneMouth`), and each mouth's street is read from the street layer. The fixture "a lane whose mouth has no street beyond it" throws M5.
   - Plazas are 2 x 2 at a part corner with two street edges, one part in `PLAZA_ONE_IN`, and only if the row stretches survive. This is town.ts's rule moved onto cells.
   - Parks get a `parkEdge` ring and crossing paths.
   - Walk-throughs are one cell through both rings, only for a court part with no lane edge.
   - The 2-cell row stretch is `stretchProblems`, used by both the planner and M5. The fixture "M5's row stretch" covers it.
   - `stage.test.ts` "openings: ..." checks lane mouths on the building line, plazas at block corners, exactly one walk per lane-less court, and park cells.
4. **Open sides (criterion 4): met.**
   - `geometry.ts` `openSidesFrom`, `faceOfUse` and `frontageOfFace` follow rule 9: street, park edge and plaza are street frontage; lane, walk and court are quiet.
   - `columnOfSides` follows rule 3. `behindOf` and `layBlock` set the partner.
   - `stage.test.ts` "open sides, column kind and partner..." recomputes every built cell from its neighbours.
5. **Checks (criterion 5): met.** `check.ts` `massFailures` runs M3, M4b, M5, G2, G3 and R1 on the layer alone, and the test asserts it is empty on all 13 named cities. Fixtures in `fixtures.test.ts`:
   - a cell with opposite open sides (M3, at the right cell);
   - a part 3 deep (M4b, "3 deep");
   - the walk-through's record removed (M5 at that opening's first cell, plus G2);
   - a cell left with no use (G3).
   - G3 and R1 are ported onto cells. G3 is stricter (no unused cell; the old version allowed 1%). R1 keeps `TILE_CITY_R1_MIN` 0.88, the same value as `tilecity.ts:139`.
6. **R-1 to R-7 (criterion 6): partly met.**
   - R-1: the layer is frozen (test). R-2: failures throw `CityStageError` and name the check.
   - R-3: the keys are `rand("plaza", id)`, `rand("plazacorner", id)` and `rand("walk", id)` through the stage's own `rand`. There is no `Math.random` or clock, and the "same city twice / another seed" test passes.
   - R-4: four digest pins, named as re-taken in C2, plus the test-double test.
   - R-5: picture test. R-6: import-scan test. R-7: the 6 x 6 test and the no-literals scan are there.
   - **R-7 linearity is not met.** See Must fix 1.

**Thresholds.** None changed. `APRON_CELLS`, `GREEN_SPAN_MAX_CELLS`, `PARK_EDGE_CELLS`, `PLAZA_ONE_IN` and `TILE_CITY_R1_MIN` equal the old copies in `tilecity.ts` and `town.ts`.

### The five readings the planner flagged
1. **Lane as two openings, `/lane/a` and `/lane/b`: acceptable.** `CityOpening.mouth` holds one street, so splitting the lane is the only way to record both mouths without a core type change, and the planner may not make one. It is also what D2's G4 needs ("every lane end has its cut"). It is not what rule 6 describes: there, one lane is one opening with two mouth cells. That is worth the architect retyping `mouth` as a list before D2 (Could improve 2).
2. **M5's lane exemption: acceptable for C1 only.** C1's criterion 3 itself forbids a walk-through on an interior with a lane, and C2 opens the court onto the lane. So the strict M5 cannot hold in C1 and the exemption is forced by the ticket text. But as written in `checkM5` (`Object.values(p.edges).includes("lane")` then `continue`), it is permanent. If C2 cannot fit a drive on a lane part, that interior stays walled in and nothing fails. It must be lifted in C2 (Could improve 1).
3. **The row-stretch reading and the 6 x 6 throw: correct, and forced.**
   - Ring 1 alone would allow a walk at offset 2 or 3 on a 6-long side; each leaves a 2-cell stretch with a corner at both ends.
   - The blocker is ring 2. On a 6-long side, ring 2 is 4 cells, two of which are the ring-2 corners. Any walk cell in it sits next to a ring-2 corner, which then gets an open side and stops being blind. That breaks C1 criterion 1 and grammar rule 4 ("the four cells where ring 2 turns a corner are blind").
   - For sides of 7 or more, the planner's window `3 <= t <= L-4` is exactly "keep the ring-2 corners blind, with a whole building between", so it is not over-strict there either.
   - The throw is the R-2-legal outcome, not a bug. It is latent: no named city has a 6 x 6 lane-less court part, and my probe of 35 more cities, including 6 x 6 seeds 1 to 3, met none.
   - It is a real gap in the grammar, so it belongs with Josh (see Risks), not with the builder.
4. **Partner rules: correct for mid columns and the ring-2 corners; acceptable elsewhere.**
   - Opposite the open side for a mid column, and diagonal for a corner column, are what rule 4 says. The ring-1 corner gets its blind ring-2 corner, and that blind corner picks the corner column first ("takes the ring-1 corner building it stands behind").
   - For a corner column beside a walk or plaza, the grammar is silent. The diagonal stays in the same part, and the partner links chain the cells round the opening together, so F1's M4c can still make the floors equal.
   - "First in row order" for other blind cells is arbitrary but deterministic.
5. **R1 on cells: acceptable.**
   - It is stricter than the old figure: plazas and lane mouths count as uncovered, where the old span left plazas out.
   - The floor of 0.88 is unchanged, as the grammar requires ("R1 keeps Josh's floor of 0.88"). The named cities run 0.933 to 0.960, which is the rise the grammar predicted once passages go.
   - Stricter is not a loosening, so this is within "a ported check keeps its numbers".

## Rule conflicts and risks
- **Files outside the section's list.** `src/city/stages.ts` (registers `massStage` in `BUILT_STAGES`) and `src/city/pipeline/run.test.ts` (its unbuilt-stage example moves from `"mass"` to `"edge"`) are not in C1's Files. Both are the planner's own folder and the smallest change that lets `runCity` reach `mass`, and B did the same with `stages.ts`. They still fail R-11's "diff only in the section's Files" as written. The architect recorded `planview.test.ts` in 10b1b41; these two should be recorded the same way. This is for the main session, not the builder.
- **Grammar gap, for Josh.** A 6 x 6 court part with no lane edge cannot get a walk-through without opening a ring-2 corner (rule 4) or leaving a 1-cell stretch (rule 6). Today the stage throws M5 on such a part. Josh or the architect needs to choose one:
  - land never leaves a lane-less 6 x 6 part (an M4a-style rule in B);
  - a walk-through may un-blind a ring-2 corner;
  - the stage keeps throwing.
- **M5's lane exemption** has no end date in the code (reading 2).
- No GDD Decided rule is changed. No new dependency. No `src/grid/` or `src/night/` change. `src/city/mass/` imports only `src/core/`, `./` and `../pipeline/`.

## Must fix
1. **R-7: the whole-city passes are not linear in cells.** In `src/city/mass/check.ts`:
   - `checkM4b` calls `land.parts.find(...)` for every built cell;
   - `checkM5` calls `land.parts.find(...)` for every open cell.

   In `src/city/mass/plan.ts`:
   - `planMass` filters all of `land.lanes`, `land.parks` and `land.parts` inside the per-block loop;
   - `layBlock` is passed `new Map(land.parts.map(...))` built afresh for every block.

   Together that is O(cells x parts) and O(blocks x parts), so the stage grows quadratically with city size. R-7 says "whole-city passes are linear in cells. The reviewer checks this", and Josh's scale concern is exactly this. **Fix:** build one `Map` of parts by id, and one grouping of parts, lanes and parks by block, once per call. Use those everywhere. **Expected effect:** the same layer and the same digests (the pins must not move), with each pass linear.

## Could improve
1. Make the M5 lane exemption explicit for C2. Either ask the architect to add to C2's criteria "M5's lane exemption is lifted: a lane part's interior touches a drive", or put a named constant or comment in `checkM5` that C2 must delete. Then a lane interior C2 cannot serve fails, instead of passing silently.
2. Ask the architect to type `CityOpening.mouth` as a list of `{ street, cells }` before D2, so a lane is one opening with two mouths, as rule 6 describes. The `/a` and `/b` split, and the half-and-half cell split it forces, would then go.
3. The walk-through search in `planMass` re-runs `stretchProblems` over the whole part for every candidate offset. That is quadratic in the part's perimeter. It is per-block and small today; checking only the two rows a candidate touches would be cleaner.
4. `plan.ts` and `check.ts` decide "court" with `shortSideOf(p) >= 6` / `< 6`, while land already records `part.shape`. Reading `shape`, or one named constant, would keep the two stages from drifting.
5. The report test's "old frontageCovered" column is a typed-in string ("0.897 to 0.916"), not a computed value. Either compute it or drop the column, so the report does not look measured when it is not.
