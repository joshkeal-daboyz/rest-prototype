ticket: 070f2-building-pieces
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section F2 of ticket 070: stage 5 turns every built cell into a column with a kind, a forced turn, a ground slot (kind and turn, no key), floors (`floor3` runs, then mid floors, or corner floors) and one roof of the building's own style. Each piece is placed from a typed-in kit table so that its body sits on the cell, and M1, M6/R9, M9a and G1 run inside the stage, with failing fixtures and a report of the numbers. F1's rows and buildings stay as they were.

## Does the branch do it?
- **0 (architect's types).** These were already on the base. The branch does not touch `src/core/`.
- **1, the kit table.** `src/city/buildings/kit.ts` has 15 entries: bounds, `BODY_M` insets, and the `-x` face on the corner keys. `constants.ts` gives `BuildingStyle.floor` a `stack3` field. This is the ticket's "the style table gains each style's three-storey key", and it is inside the folder. `src/render3d/kitpin.test.ts` checks, without the GLB, that the insets equal `BODY_M`, the faces equal `OPEN_SIDE_MEASURED`, every role key (stack3 included) equals `STACK_STYLES`, and the four thresholds equal those in `stacks.ts` and `frontage.ts`, with `WALL_JOINT_TOL_M` 0.02. It also checks M2 on every floor key, within 0.02. A second test, under `it.skipIf(!HAVE_GLB)`, reads the GLB lazily inside the test and compares bounds within 0.005 m. I hand-checked the floor bodies: each comes to 5.00 x 5.00 (for example Corner_03: 5.491 - 0.351 - 0.14).
- **2, columns, kinds and turns.** `columns.ts` `buildColumns` and `CORNER_TURN` do this. I checked the four forced turns against `place.ts`'s `rotate` (three.js convention: at 90, own +z goes to +x and own -x to +z). All four are correct. The L's `rowId` takes `bend` on `cells[2]`, which matches the cityplan comment. Tests in `columns.test.ts` "columns, kinds and turns" cover all 20 named runs. They require all four corner turns to appear, and they count the 8 L bend cells, whose corner columns are blind and front the building's front. The ground slot test checks that it has exactly the keys kind, yaw, y_m and top_m, so it names no piece key.
- **3, pieces and roofs.** `floorPlan` gives 3 storeys as floor + floor, 4 as floor3, and 5 as floor3 + floor, with corner columns getting all floors. Storey k stands at 3k and the roof at 3 x storeys, once and last. The tests cover all 9 combinations of kind and storey count, and they check that every key comes from the building's own style and is a kit key.
- **4, placements.** `placeFloor` puts the body centre on the cell centre. `placeRoof` puts the back plane on the back edge, centres a mid roof, and puts a corner roof's outer flank on the `side` edge. There is no scale, and the "no placement carries a scale" test pins the placement's keys. The hand-worked cases (mid floor, floor3, mid roof, corner roof, and `Apartment_Corner_03` at all four turns) match my own arithmetic. For example, the corner floor's body offset is (+0.1055, -0.1025), and at 90 the pivot is (2.6025, 2.6055).
- **5, the checks.** `columncheck.ts` runs M1, M6 (ground slot and every piece, plus the forced-turn match), R9, M9a (roof count and yaw, plus `storeyAlignment`'s planes against the first floor body) and G1 on the open sides. `stage.ts` runs them before it returns, and a failure names the check and the cells. All five failing fixtures are in place, built from the default run with one change each, and each asserts its check by name. I ran `columns.test.ts`: 20 tests passed.
- **6, the numbers.** `columnreport.test.ts` prints, per run: columns by kind, pieces by role and in total, the L columns, the overhang of each roof key, and the worst M1, G1 and M9a values. It also prints the outside cities' stage-5 results without asserting them.
- **7, R-1 to R-7.** In `stage.test.ts`, the buildings pins are re-taken with `columns`. The F1 pins hold on the same layer with `columns` removed. The other digests are unchanged. The grep test's file list now includes the four new files. Seed 1 is still `ok`. The picture code is untouched.
- **9.** The main session's gate is green (3707 passed). I did not rerun it.

## Rule conflicts and risks
- None found against the hard rules. The edits are inside `src/city/buildings/` plus the one allowed new file, `src/render3d/kitpin.test.ts`, which is read-only towards render3d. There is no `src/core/` change and no new dependency. The stage code imports only `core`, `pipeline` and its own folder.
- Risk: the kit table copies the numbers by design (R-6). Drift is caught only by kitpin.test.ts, which imports `facade.ts`, `stacks.ts` and `frontage.ts`. If G or H retires those files, the pin has to move with them.
- M9a measures against the column's first floor body, not the cell. That is the same thing only because M1 holds as well. The stage runs both, so this is fine.

## Must fix
none

## Could improve
1. `columns.test.ts`, M1 fixture: the ticket says "a three-column `Apartment_02` building". The test takes any three-column building and shifts it by 0.17 m per column. It still proves M1, but filtering on `style === "apartment-02"` would make it the case the ticket names.
2. `columnreport.test.ts`: the U1 to U3 counts for the pre-check's open questions are beyond criterion 6. The caller says this was as instructed and they are not checks, so I am only noting it. Remove them once Josh has answered.
3. `columns.test.ts`, the Corner_03 test: the last two assertions (`ownBody(...).x0` and `SIDE_VEC["-x"]`) do not test the stated "open face on the forced side". M6's fixture covers that, so these two lines could be dropped or replaced with a `sideOf(rotate(yaw, -1, 0))` check per turn.
