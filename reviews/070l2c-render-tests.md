ticket: 070l2c-render-tests
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Outside the old-path modules' own tests, no `src/render3d/` test should build `tileCity` or read an old-path constant to check code that stays. Each such case is either re-pointed (to a typed fixture, a ladder map's town or the plan renderer) without weakening it, or sorted as kind (b) and left for L2d. On top of that, the five guide and grammar lines the L1 review left over get fixed. LR applies throughout: no check loosens.

## Does the branch do it?
Diff 72aec07...c43d4c6. The gate was green with 4278 cases (base 4276); I did not re-run the suite.

1. **The pins: met.** The new `src/render3d/oldvalues.fixture.ts` types `TILE_CITY_R7_MIN` 0.4, `TILE_CITY_R6_MIN` 0.45, `GREEN_TREE_ONE_IN` 3, `ALLEY_BIN_EVERY_M` 10, `BENCH_FROM_PATH_M` 1.0 and `TILE_M` 5, each with its source line at b42b65f. `escapepin`, `shopfrontpin` and `furnpin` change only their import line, so every comparison stays as it was. `TILE_BENCH`, `TILE_BINS` and `TILE_TREES` still come from `tileslots.ts`, as the criterion says. I checked the values with a one-off tsx script against `tilecity.ts`, which has not changed since b42b65f, and all six match.
2. **The ladder modules' tests: met.**
   - **`escapes.test.ts`.** The R7 report, the 0.4 guarantee and the re-key case now take eleven ladder towns (`LADDER_TOWNS`). They used to take 11, 31 and 6 old cities. Every per-town assertion and every aggregate threshold (>30 qualifying, >10 escapes, >150 in total, moved > 0) is unchanged. `townReport` and `realised` pack with the run's own alignment, as before.
   - **`stacks.test.ts`.**
     - The corner-chamfer case and the E2 case now run on eleven ladder towns packed `align: "wall"`.
     - The E2 call gains an explicit `"wall"` for `bandPacked`. `bandPacked` defaults to `alignOf(run)`, which was "wall" on the old city and is "back" on a ladder run. So the explicit value keeps the same seating branch (`seatOnBody`). `blocks > 200` is unchanged.
     - The back-aligned "never" case moves to 64's town.
     - The `cityApplyOptions` case (line 758) tests the old city's own options. It is kind (b) and stays, correctly.
   - **`sills.test.ts`.**
     - The applyModels sink case now runs on the three protocol maps under `TILE_APPLY` (+2 cases).
     - `liftScenes` drops from 11 old cities to four `WALL_MAPS`, which is 7 fewer parametrised cases. The thresholds (blocks > 100, lifted > 20, risen > 20, escapes > 5) are unchanged.
     - The band describe takes the four `WALL_MAPS` as its `"city"` kind (+3).
     - The new describe restores the exact-zero z check on `OLD_CITY_TOWN`. My script showed that `JSON.stringify` of `tileCity({}).town`'s terraces and lots equals the fixture: 52 runs and 98 lots. That check runs the same `bandPacked(..., "wall", "body")` the city path draws with, and asserts `sameAboveGround` and `zShift < 1e-9` on every changed block, with blocks > 50 and changed > 0. So the strict 062 B criterion 6 check still holds on a genuinely wall-aligned town.
   - **Count.** My tally gives +2 −7 +3 +1 (sills), +1 (daytoggle) and +2 (styleguide) = +2, which matches 4276 → 4278. No `it` testing kept code was deleted. The 7 are parametrised inputs that were re-pointed.
   - **Not checked.** I could not see the builder's report, so I cannot confirm it lists every case and its kind, as criteria 2 and 4 ask.
3. **`daytoggle.test.ts` and `plan3d.test.ts`: met.**
   - **`daytoggle.test.ts`.** `open()` now routes `city=tiles` to `createPlanAssembleRenderer3d`, with the pipeline's 6 x 6 seed 1 city cached once per file. The sheet (`sheet=1`) still uses `createCityRenderer3d`. Every assertion is unchanged, including the `tile:code-road` colours. A source check for `plan3d.ts`'s DEV-only toggle is added, and the `tilecity3d.ts` source check stays as kind (b).
   - **`plan3d.test.ts`.** It is untouched. Its only `tileCity` use (line 182) hashes the old `tileGroup` and `interiorGroup` on the old city, which is kind (b). Its `TILE_M` and `TileCell` imports are items L2d keeps in place.
4. **`styleguide.test.ts`: met.** The builder sorts every check that reads `tilecity`, `tileslots`, `frontage` or `parkmetrics` as kind (b), and says so in a comment at line 1026. I spot-checked lines 596 to 933. Each one checks a Numbers row whose File cell is still an old-path file, or old-path table text, and L2c may not edit those rows. So the sort is consistent with what this section is allowed to change.
5. **The leftovers: met.**
   - **18.2.** The homes bullet now reads 2 x 5.0 m x 5.0 m = 50 m2 from grammar rule 5's cell, and the old 62 m2 is marked `city=tiles-old`, until L2d. A new check pins both texts and reads `CELL_M` from `src/city/ground/constants`.
   - **19.2.** A seam and a gated passage are marked as the old path's only, and a new check pins that text.
   - **Grammar M1.** The "Fails today" sub-bullet is marked as the old path's history and points to F2's M1 check.
   - **Rule 8's pipe row.** The size cell is now 2.83 m wide by 4.24 m high. That matches `PARTY_BOUNDS[PARTY_PIPES[1]]` = `b(2.828, 4.243, ...)`, with `PARTY_PIPES[1]` being `_03`, read in (w, h, d) order.
   - **Rule 5.** The parking paragraph now points to P2 in `src/city/mass/` on the 6 x 6 named cities (`stage.test.ts` line 243). 0.075 and `LOTS_PER_BLOCK_MAX` are unchanged.
6. **R-8.** This is the playtester's. No ladder source file is touched: the diff is test files, one test-only fixture and the two docs.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change, no non-test `.ts` change, no file outside the ticket's list (the fixture is the allowed test-only fixture), no new dependency, no Decided rule or approved number moved.
- `WALL_MAPS` was chosen as the four maps where drawing wall-aligned does not move a banded block's z. On 35, 50, 55 and 56 it moves 0.26 m, according to the builder's comment in `sills.test.ts`. The strict rule is still checked on the real old town through `OLD_CITY_TOWN`, so nothing loosens. But picking the inputs that pass is a smell, and nothing explains the 0.26 m move.
- Coverage is narrower: 11 old cities become 4 maps in `liftScenes`, and 31 old cities become 11 towns in the escape guarantee. Each assertion and threshold keeps its strength, so this is within LR as written.

## Must fix
none

## Could improve
1. In `src/render3d/sills.test.ts`, also run the band loop's other per-block checks on `OLD_CITY_TOWN`'s blocks, alongside the z check: "no problem kept its ground", "banded for a reason", one band, `stackLift(...).problems` empty, no extra `Shop_06`. Today the genuinely wall-aligned town carries only the `sameAboveGround` and z assertions.
2. In the `WALL_MAPS` comment, say why a ladder run drawn wall-aligned moves z by 0.26 m, or open a note for the renderer. If it is a real effect of the band on wall-aligned stacks, the guide's "unchanged on the tile city" rests on one fixture.
3. In `escapes.test.ts`, the re-key case still labels its towns `seed ${seed}` (1 to 6) when they are map files. Label them by file.
4. In `oldvalues.fixture.ts`, move `import type { packTown }` to the top of the file.
5. For L2d: the only pin of `tileGroupOf` and `interiorGroupOf` is `plan3d.test.ts` line 182, which goes through the old `tileGroup` on `tileCity`. L2d keeps those functions, so it should re-point that pin rather than delete it. The Numbers rows `DRIVE_CELLS`, `COURT_CELLS`, `LOT_STALLS` and `TILE_ROW_INSET_M` have pipeline twins in `src/city/mass/constants.ts` and should move there rather than go.
