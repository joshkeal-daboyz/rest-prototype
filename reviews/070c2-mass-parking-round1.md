ticket: 070c2-mass-parking
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section C2 as re-cut on 19 Nov 2026. Stage 3 fixes each block's nominal units and lays lots: courts behind a drive, the new yard court for parts 6 deep, and capped frontage lots. P2 is ported and holds at `PARK_PER_HOME` 0.075, with every other threshold unchanged. A lane is one opening with two mouths. Every court part with no drive gets a walk-through, even beside a lane, and M5 becomes strict. The four mass digest pins are re-taken and named as moved by C2.

## Does the branch do it?
I diffed against goal/city-style 77ccde0, in three commits: 0bdff20 WIP, 960ebf5 architect, cdfb84f planner. The gate is green: 132 files, 3043 passed against 2961 before. The report table in `gate-out.txt` matches the options note's recommended row on all 13 cities: homes, wanted, floor, laid, R1 and drives on a street. As told, I did not re-run the suite.

- **0. `mouth` becomes a list.** Met. In `src/core/cityplan.ts`, `CityOpening.mouth` is now `readonly CityMouth[]`, and `CityMouth` is `{ street; cells }`. That matches the ticket's type, given a name. It came in its own commit, 960ebf5. `plan.ts` lays one `${b.id}/lane` opening with two mouths. Plaza, park and walk get `[]`. A drive onto a lane gets `[]`. M5 (`check.ts`) now counts mouths: 2 for a lane, 1 for a street drive or frontage lot, 0 otherwise. Tests: the "lane block" fixture in `fixtures.test.ts`, and the named-city openings test, which expects `toHaveLength(2)` with each mouth's street checked.
- **1. Nominal units.** Met. `unitsOf` (`lots.ts`) counts columns from built cells. Shops are the outer street-frontage columns less `ceil(run / TERRACE_BAYS_MAX)` door columns per run. Homes are `floor(columns x 3 / 2)`. Tests: the 10 x 2 strip fixture in `lots.test.ts`, and the named-city "units" test, which recounts the units from the layer and checks `lotsWanted`, `lots` and `stallsShort`.
- **2. Lots.** Met in the planner. `lotQuota`, `planLots` with its quota rounds and the dearer-layout rule are in `buildMass`. The pick order is court, then yard, then frontage lot. The frontage-lot cap uses `frontMax = ceil(blocks x 1/9)`. `LOTS_PER_BLOCK_MAX` is still 2, and the per-block host cap is checked in `pick` and in the neighbour loop. A drive removes the part's walk-through (`mine.length === 0`). That rule also covers frontage lots, which is Must fix 1 below.
- **3. The yard court.** Met. In `sites.ts`, `siteCells(kind "yard")` makes the aisle the near yard row and the stalls the far row: two cells across the drive's line, `LOT_STALLS` 6. `siteFits` needs `depthOf - 4 === YARD_DEPTH_CELLS (2)`, `len >= YARD_SIDE_MIN_CELLS (8)` and the court inside the part. A yard court's opening kind is `drive`, so it never enters `frontBlocks`. Tests in `lots.test.ts`:
  - it fits a 6 by 8 part, at offset `[3]`, and not a 6 by 7;
  - its stall cells are on the far side and its aisle on the near side;
  - a part 7 deep takes a court and no yard court.

  The named-city "yard courts" test checks near and far and that the kind is `drive`. Every named city lays 2 to 9 yard courts, so that test is not vacuous.
- **4. Lane parts.** Met. The lane loop in `planLots` tries court, then yard, only on lane sides, and adds nothing if neither fits. The WIP's "no place for a drive" throw is gone. A drive onto a lane gets no mouth. Tests are in `lots.test.ts`'s lane-part describe. A 7 x 12 lane part opens a court on its lane with no mouth. A 6 x 6 lane part throws the honest M5 walk-through failure (Q7).
- **5. Walk-throughs and strict M5.** The lane exemption is gone from `checkM5`, since the `Object.values(p.edges).includes("lane")` skip was removed. `plan.ts` lays a walk-through on the lane side where one fits (the `lanes` list wins), else on any side. The failing fixture asked for is present twice: "M5 strict" in `fixtures.test.ts`, and the lane-part fixture in `lots.test.ts`. Each names "the interior of part ... touches no opening". **Not met in one case:** a court part whose only lot is a frontage lot ends with no drive, and the branch gives it no walk-through (Must fix 1). That case occurs on 3 x 3 seed 4, which shows 1 frontage lot and 0 walks.
- **6. P2.** Met, and the port is faithful. `parkingNumbers` and `p2Value` keep `evaluateParking`'s P2 terms and thresholds term for term: the band, over-lots, served-far, short beyond `ceil(blocks/9)`, and front-lot blocks beyond `ceil(blocks x 1/9)`. One difference: the old code counts lots as stalls / `LOT_STALLS`, rounded, and the new code counts one per court. They agree because every court is recorded with `stalls: LOT_STALLS` (`lots.ts`), and the named-city court test asserts `c.stalls === LOT_STALLS`. On thresholds:
  - Only `PARK_PER_HOME` changed. The constants test in `lots.test.ts` pins it to 0.075, names Josh's ruling, and pins `OLD_PPH` to 0.15.
  - The test still checks `LOTS_PER_BLOCK_MAX`, `LOT_STALLS`, `PARK_SUPPLY_BAND`, `CITY_FRONT_LOT_BLOCKS_MAX`, `HOME_COLUMN_FLOORS`, `UNIT_FLOORS_NOMINAL`, `DRIVE_CELLS` and `COURT_CELLS` against `tilecity.ts`, and `TERRACE_BAYS_MAX` against `town.ts`.
  - `TILE_CITY_R1_MIN` (0.88) and `ROW_STRETCH_MIN_CELLS` are untouched in `constants.ts`.
  - P2's fixtures in `lots.test.ts` were rescaled to 0.075 by doubling the homes. The arithmetic in their comments still holds: demand 135, floor 101.25, laid 108.
  - The numbers report is in the stage test and was printed in the gate run.
- **7. C1's checks.** Met. `massFailures` runs M3, M4b, M5, G2, G3, R1 and P2. The per-city test expects `[]` and R1 ≥ 0.88. Every city passes.
- **8. R-1 to R-7.**
  - **R-1:** the frozen test now runs on `NAMED[0]` with no guard.
  - **R-3:** randomness comes only from `rand`. The new keys are `("lot", part, side, kind)` in the lane loop and `("lot", part, side, kind, existingCount)` in `pick`. They differ in length, and each is used on a different kind of side, so they cannot collide. `plazaOf` keeps the C1 keys `"plaza"` and `"plazacorner"`, and the walk keeps `"walk"`. No `Math.random` and no clock.
  - **R-4:** the four pins are re-taken in a test whose name says "re-taken, MOVED BY C2", and the old values are kept in a comment. The test double for the stage is unchanged.
  - **R-5:** the legend already had drive, frontage lot, stalls and aisle.
  - **R-6:** `lots.ts` and `sites.ts` import only core, pipeline and their own folder. `lots.test.ts` imports `render3d/tilecity` and `render3d/town` in the test only, to pin the constants, as `streets/equal.test.ts` and `land/stage.test.ts` already do.
  - **R-7:** the 6 x 6 test accepts P2 as a named failure.
- **Guards removed, no weakening found.** Every `it.skipIf(!isOk(o))` is gone. The red-by-design header is gone. The `it.todo` is now real pins. Assertions that changed in a necessary way:
  - the lane count halves, since a lane is one opening;
  - `mouth` null becomes `[]`;
  - rings 1 and 2 may hold drive and frontage-lot cells, and the ring 3+ list gains stalls, aisle and apron;
  - the walk-through rule drops `!lane`, as ruling 4 says;
  - `courts`/`units` `toEqual([])` is gone.

  One assertion was dropped outright and not replaced: C1's "not vacuous" check that the named cities lay lane, plaza, walk and park (Could improve 1).

## Rule conflicts and risks
- **Ruling 4 and grammar rule 6 against the code, for frontage-lot parts.** The ticket's text, and the Decided line of the grammar (`docs/city-grammar.md`:161, "laid only for an interior with no drive and no lane"), treat only a drive as replacing the walk-through. The code and the stage test also let a frontage lot replace it: `wants = court && !hasLot`, where `hasLot` includes `frontLot`. Josh's original words, "only where an interior has no other way in", could be read to allow that. The ticket did not rule on it, and the builder decided it alone. This is Must fix 1.
- **R-7.** I checked the new code.
  - `planLots` loops over blocks inside bounded guards (16, with an exit when nothing moves). Each block reads only its own parts and the four blocks across its streets (`blockAt`).
  - `buildMass` calls `planMass` at most 6 times, a constant number of passes, each linear in cells.
  - `siteFits` costs part perimeter times offsets, which is local to a block and does not grow with the block count.
  - `parkingNumbers`, `checkP2` and M5's `onLane` scan are linear.
  - `frontMax` is the cap's own share of `blocks.length`, not a hard-coded count.
  - No block count, block id or lattice size is hard-coded.
- **Files.** The diff touches only `src/city/mass/` and `src/core/cityplan.ts`, and the core change is in the architect's commit 960ebf5. No new dependency. `src/grid/` and `src/night/` are untouched.
- **The gate worktree is dirty.** `D:\rest-prototype-gate` has a changed `src/audio/__snapshots__/notSoftened.test.ts.snap` and an untracked `gate-out.txt` from the gate run. Neither is on the branch, but neither should be committed by accident.

## Must fix
1. **A court part whose only lot is a frontage lot gets no walk-through (criterion 5; grammar rule 6's Decided line).**
   - **Where:** `src/city/mass/plan.ts` (`if (court && mine.length === 0)`), and the named-city walk test in `src/city/mass/stage.test.ts` (`hasLot` counts `frontLot`).
   - **Expected effect:** lay the walk-through unless the part has a drive (`kind !== "frontLot"`). Then the test's `hasLot` counts only `drive` openings, and a fixture covers a part whose only lot is a frontage lot: it gets a walk-through, and fails M5 without one. If no walk-through fits next to the frontage lot on 3 x 3 seed 4, that is the stop rule (R-2), reported with the cell.
   - **Alternative:** if the main session reads a frontage lot through both rings as "another way in" under Josh's words, the builder should not settle that alone. The architect records the reading in the ticket, or the main session puts it to Josh, and the test names the ruling.

## Could improve
1. **Restore C1's not-vacuous check, without walks.** `src/city/mass/stage.test.ts`'s report test lost the check that the named cities between them lay at least one lane, plaza and park. Add drive and yard court to it. Walk can only join if Must fix 1 or a fixture provides one, since the named cities now lay 0 walks.
2. **Tighten the ring 3+ use check.** `stage.test.ts` now accepts `apron` anywhere beyond ring 2. It could accept it there only on a court's pad cells or in a yard court's yard, so a stray apron cell deep in the green would be caught.
3. **Drop the unused `LOT_STALLS` import in `src/city/mass/check.ts`.**
4. **Name a different constant in `courtInside`.** `sites.ts` uses `ringOf(...) >= DRIVE_CELLS` as its test for "ring 3 or deeper". It is correct only because both values are 2. `BUILT_RINGS` is the constant it means.
5. **Fix stale wording.** The `lots.test.ts` header still lists "a lane part with no place for a drive", and the constants test's name still says `PARK_PER_HOME` equals `tilecity.ts`'s. Both are out of date since the re-cut.
