ticket: 070h1b-facades-shopfronts
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Port the tile city's shopfront dressing (`dressBlock`'s glass, awnings, fascia and blade signs, ATMs) onto H1's ground pieces in stage 7. It should follow the readings B1, B2, W1 with LG, X1, T1, L1, E1, C1 and A1 as Josh answered them in Q22. It also asked for a pinned dressing table, checks R4 to R6, M8, the caps, LG and attachment run by the stage, failing fixtures, points in the picture, a re-pinned facades digest with `ground` unchanged, and a report. `ground` and every earlier layer must stay as they were.

## Does the branch do it?
Reviewed `git diff bd6f438...3f1a260` (11 files, all in the ticket's list). I ran `src/city/facades/dressreport.test.ts` and `src/render3d/shopfrontpin.test.ts` with `--maxWorkers=2`: 10 passed, 2 GLB tests skipped. The gate was already green on 3f1a260, so I did not run the whole suite.

- **0 (architect's types).** Used as written. `src/core/` is untouched.
- **1. The dressing table.** `src/city/facades/dresskit.ts` has the six key lists, every chance, cap and attachment number, the R4/R5/R6/ATM floors, the 22 bounds (spot-checked against `dressing.test.ts`' fixture: Cover_01 to 05, ATM, Hotel, Shop_04_Glass, Corner_02_Glass all equal) and the nine `FLOOR_HOST` entries. `src/render3d/shopfrontpin.test.ts` pins:
  - the lists, numbers and thresholds to `dressing.ts`, `CITY_CHECK`, `CITY_ATM_BLOCKS_MIN` and `TILE_CITY_R6_MIN`;
  - the host front insets to `BODY_M`, and the widths and depths to `GROUND_KIT`;
  - empty `DRESS_NUDGE_M` and `DRESS_FRONTS`, and `BUILDING_FRONTS` naming none of the 22 keys;
  - the GLB bounds, behind `it.skipIf(!HAVE_GLB)`, with the file read lazily (CI-safe).
- **2. The dressing.** `dress.ts` `buildDressing` keeps `dressBlock`'s order:
  - glass first;
  - then the building's best-fitting flat key, found by the hashed rotation;
  - the L on a wanting corner where it fits and LG allows, else the flat key;
  - one blade sign on an awning-less street-front bay;
  - fascia signs with no key repeated;
  - an ATM beside a street door, under the per-run cap.

  `dress.test.ts` covers each bullet on the 20 named runs, with a per-rule test name for each: glass exactness, one flat key per building, the L only on `shopCorner` as a wrap, LG, sign caps, ATM per building and per run, X1, and determinism. The rand salts and `unitOf` in `hash.ts` follow R-3. The test "ground is exactly H1's" checks `digestOf({stage, ground})` against H1's four old pins. This is met.
- **3. Placements.** `bayFrame`, `onFace` and `placementOf` work in the column frame, turn by `yaw`, then raise by `y_m` (L1). `dress.test.ts` has hand-worked cases with pivots derived in comments from the bounds and insets:
  - Shop_01 glass and Cover_03 at yaw 0 and 90;
  - a fascia sign on the awning top, hosted on the first floor;
  - a blade sign on an awning-less bay;
  - an ATM on both sides of a Door_01;
  - the Corner_01 wrap and the L at all four turns;
  - Shop_02 at `y_m` -0.071;
  - plus a case where the L does not fit (style 1 corner) and falls back to the flat key.

  Met.
- **4. The checks.** `dresscheck.ts` `dressReport` covers:
  - R4 (share 1, exact glass);
  - R5 (share and the no-mixed-key rule);
  - R6 (signed share, and the ATM share over street buildings, A1);
  - M8 (street side, face is the column front, single-face only on a street front, wrap only on `shopCorner`);
  - the caps, LG, and attachment (height, back plane, centring and clamp, T1 reach, roof cap).

  `stage.ts` runs it and throws `CityStageError` naming the check and its cells. The fixtures in `dressfixtures.test.ts` cover every listed case, plus a sanity pass on the unchanged layer. Two fixtures differ slightly from the ticket's wording (Could improve 3 and 4); neither is a gap in a check. Met.
- **5. The picture.** `FACADES_LEGEND` gains "awning", "fascia sign", "blade sign" and "ATM". There is one point per non-glass piece at its `x_m, z_m`. `stage.test.ts` checks the count, positions and each point's legend. Cells are unchanged. Met.
- **6. R-1 to R-7.**
  - The grep test's rule body is unedited; only its `FILES` list gains the three new files, which the ticket needs for "covers the new files".
  - The facades pins moved. The buildings and earlier pins are unchanged in the diff.
  - The layer and its placements are frozen.
  - The default city ends `ok`.

  Met.
- **7. The numbers.** `dressreport.test.ts` prints every item listed.
  - R5 is 0.689 to 0.737 and R6 0.548 to 0.603. The ATM share is 0.249 to 0.307.
  - 1,403 L awnings are placed and LG turned away 125 (the pre-check: 1,409 of 1,534).
  - There are 2,894 mixed corners, 1,447 of them with a quiet front, the same as the pre-check.
  - **The largest same-height overlap is 0.104 m** (Cover_04 beside Cover_04), under W1's 0.11 m stop.
  - The furthest reach is Cover_03 at 4.058 m, against 4.70 m.
  - The most pieces in one run is 2,089, against `DRESS_MAX` 6,000.
  - All 79 outside cities that reach stage 7 pass it; one never reaches it.

  Met.
- **8.** Main session's screenshot. Not mine to judge.
- **9.** The listed tests exist and run.

## Rule conflicts and risks
- None found against the hard rules.
  - `src/city/facades/` imports only `core`, `../pipeline` (as H1 already did) and its own files, with no DOM or timers.
  - No file outside the ticket's list is touched, and there is no new dependency.
  - No approved number moves: every copy is pinned to the old path.
- The GDD rules on lamps, rollback, dawn and pause are not in scope for this branch.
- LG's neighbour test (`dress.ts` line 344, `dresscheck.ts` line 319) looks at any 4-neighbour cell with an L. That is a little wider than the ticket's "in its own building, or the row neighbour's column it abuts": a back-to-back corner in another row also counts. The number turned away matches the pre-check exactly (125), so on the named runs this changes nothing.

## Must fix
none

## Could improve
1. `dress.test.ts`, the LG test: its name says "a corner bay LG turned away took a flat key where it fitted", but it only checks that no two L awnings are neighbours and that `lPlaced` matches. Add an assertion for the fallback. For example: each turned-away corner whose building has a flat key that fits carries that key. Or a hand-worked two-corner scene.
2. `dress.ts`: corner bays are dressed in `buildings.buildings` order, not explicitly B2's "each row's buildings in order". It also uses the any-neighbour LG test noted above. Either say in the module comment that this is the order used, or match the ticket's wording. LG's outcome (which corner keeps the L) depends on it.
3. `dressfixtures.test.ts`, the T1 fixture: the ticket says "an awning moved 0.6 m further out fails the reach". The builder rightly found that 0.6 m stays inside 4.70 m for these awnings, so it fails `attach` instead, and 1.2 m is used to fail the reach by name. This is sound, but the architect should know the ticket's fixture was not literally possible.
4. `dressfixtures.test.ts`, the LG fixture: it copies an L onto whichever ground piece is beside one, probably a mid shop, which also trips R5. That is weaker than the ticket's typed-in pair of neighbouring style 3 corners. It passes because LG does not check the piece kind.
5. `dresscheck.ts` line 366 hardcodes `2.5` for the front cell edge. `CELL_M / 2` (as `dress.ts` does) would keep the two in step.
