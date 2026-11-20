ticket: 070b3-land-split
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B3 of ticket 070: stage 2 (Land) on the split plan. Lane mouths keep off every junction-facing stretch, widened by `BAY_JUNCTION_CLEAR` (S6). A whole park goes only on a small block with a parking band across one of its streets (the served park). Land reads neighbours only from `CityPlanBlock.sides`, never `bi`, `bj` or a street's `line`. V3, V4 and M4a hold on the named cities with one-way on and off. Land's four digest pins are re-taken. Only `src/city/land/` is touched.

## Does the branch do it?
Diff checked: `git diff ec891f7...a08d005`. It touches 8 files, all in `src/city/land/`. Gate: the main session reported tsc clean and the land, streets, pipeline and planview tests passing (300). I re-ran only `src/city/land/reach.test.ts`, which passed (12 of 12).

1. **S6 for lanes.** Met.
   - `reach.ts` `facesJunction` tests `c >= lo - BAY_JUNCTION_CLEAR && c < hi + BAY_JUNCTION_CLEAR` on the side's `junctions` spans. That is a half-open span widened one cell each side, and it is right because `ALLEY_CELLS` is 1, so a mouth is one cell.
   - `plan.ts` `lanePlaces` filters `lanePositions` on the two sides the lane opens on. It uses the same axis choice as `planLand` (`w >= d`: a lane along z, judged on -z/+z by i; otherwise along x, judged on -x/+x by j).
   - B2's `hasPlace` and `planLand`'s `options` both use `lanePlaces`, so "no place, no alley" counts S6.
   - `constants.ts` has `BAY_JUNCTION_CLEAR = 1`, pinned against `tilecity.ts`'s copy in `reach.test.ts` (a test-only import).
   - Fixtures: "fixture: a block whose one lane place opens onto a junction-facing span has no place, so it takes no alley", plus the boundary cases for the widening and the exclusive high end, a tall block judged by j, and a junction on a side the lane doesn't open onto.
   - On the named cities: `stage.test.ts` "B3: one-way on/off ..." re-derives the mouth test with its own arithmetic and also asserts `laneMouthsAtJunctions` is empty. `stage.ts` throws `S6:` if a mouth ever does face a junction.
2. **Served park.** Met.
   - `reach.ts` `farParking` uses the same band rows as stage 1's `farBand` in `streets/check.ts` (row n-2 for +z/-x, row 1 for -z/+x). It is written in Land's own folder, as the criterion asks.
   - `isServed` needs a side that has a block across it and parks on the far side.
   - `planBlocks` filters `smalls` by `isServed`, so the quota goes on to the next small block and then to the large ones.
   - Failing fixture: "failing fixture: a small block whose four streets all park on its side takes no whole park, and the quota goes down the list". Other fixtures cover a block whose streets all face out, and one served side being enough.
   - `stage.ts` throws `served park:` on a violation, and the named-city test asserts `unservedWholeParks` is empty.
3. **Grid lookups go.** Met. The "B3 criterion 3" grep test strips comments and rejects `.bi`, `.bj`, `.line`, `bi:`/`bj =` and bracket access in non-test files. `PlanBlock` is now `CityBlock`'s rectangle fields plus `SidedBlock`, and neighbours come from `sides` and the street map.
4. **V3, V4, M4a with one-way on and off.** Met. The named-city loop runs both ways, the off way through `streetsStageWith(0)`, and asserts V3, V4 and M4a are all 0. The "B3 report" test logs alleys, strips and parks against what each city needs, plus how many lanes S6 moved and how many parks serving moved. No threshold or constant changed.
5. **R-4.** Met. The four land pins are re-taken, and the test name says "all four pins moved by B3: the split plan, S6 for lanes, the served park". Mass's and Edge's pins are not touched here, as the ticket says.
6. **R-1 to R-7.**
   - R-6: `src/city/land/` imports only `core`, `pipeline`, and its own folder; the `render3d` import is in tests only.
   - R-7, per-block work: `isServed` and `lanePlaces` read only the block's own sides and a street map, and the checks are linear in lanes and parks.
   - R-7, 6 x 6 run: the test now accepts `S6` and `served park` as failure reasons, and it compares the land block count with stage 1's count instead of a hard-coded 36, which fits Q10.

## Rule conflicts and risks
- No new dependency, nothing outside `src/city/land/`, and `src/grid/` and `src/night/` are untouched.
- The served-park band rule now lives in two places, `streets/check.ts` `farBand` and `land/reach.ts` `farParking`. The ticket asks for this. If stage 1's band order changes, both copies must change, and no test pins them against each other.

## Must fix
none

## Could improve
1. `src/city/land/reach.test.ts`: add a test-only check that `farParking` agrees with `streets/check.ts` `farBand` for every side and the band sets, as `BAY_JUNCTION_CLEAR` is pinned. Then the two copies cannot drift apart.
2. `src/city/land/stage.ts`: the `S6` and `served park` throws can't fire while the planner filters on the same predicates. They are fine as guards. A one-line comment saying they are postconditions would stop a later reader from treating them as a separate rule.
3. `src/city/land/stage.test.ts` "B3 report": the report goes out through `console.log` inside a test, and its only assertion is the row count. That is fine as a report, but it is not coverage.
