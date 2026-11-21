ticket: 070h1-facades-ground
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 7 (facades), first part: fill every ground slot stage 5 left with one keyed ground piece, placed front-aligned on its cell at its own S1 level. Josh's three Q21 answers have to be built in: the 0.01 m gap, the deep keys' back allowance, and no door on ring 2 where there is no door place. The ground checks (M1, M2, M6/R9, G1, M8, R3, sills, stall rule) run in the stage, with failing fixtures. The kit table is pinned in `src/render3d/groundpin.test.ts`, and `facades` is added to `BUILT_STAGES`. Reviewed: H1's own commit 5318f5c. F3's merged files are out of scope.

## Does the branch do it?
- **Criterion 0 (architect's types).** The branch does not touch `src/core/`. The stage uses the existing `CityGroundPiece`, `CityGroundPieceKind` and `CityFacadesLayer`.
- **Criterion 1 (ground kit table).** `src/city/facades/kit.ts` holds:
  - all 18 keys (six shops, two doors, two shop corners, two corner doors, three mid floors and three corner floors);
  - each key's bounds, insets, second face, sill and window sill;
  - `DEEP_KEYS` with exactly D5's six;
  - `FIRST_FLOOR_SILL_M`.

  `constants.ts` holds `GROUND_GAP_MAX_M` 0.01. I checked the arithmetic by hand: Door_01 and Door_Corner_01 come to 5.000 x 5.000, Shop_01's depth to 5.317, and the corner doors match D4's insets. `src/render3d/groundpin.test.ts` covers every "always" bullet: BODY_M, DOOR_SILLS, OPEN_SIDE_MEASURED, WINDOW_SILL_M, the kind lists against STACK_STYLES, the thresholds against sills.ts and frontage.ts, D4's table, and M2 with D5's allowance (the deep list is exactly the keys over 5.02). It also has two `it.skipIf(!HAVE_GLB)` tests that read the GLB lazily. I ran this file and all 11 tests passed, so the GLB tests ran on this machine.
- **Criterion 2 (frontage, kinds, keys).**
  - `facts.ts` (`factsOf`) implements D3, including the stage failure when a building's columns disagree.
  - It also implements D1's door places: quiet corners with no stalls, and mid columns with no stalls.
  - `stage.ts` (`buildGround`) picks the door in D1's order and throws when a doorless quiet building is on an outer row (the stop rule).
  - A `shopDouble` needs two consecutive mid columns with one turn, neither being the door.
  - All keys are chosen through `rand` and `indexOf`.

  `stage.test.ts` "kinds, doors and keys" covers every bullet on the 20 named runs. It works the expectations out from the mass layer itself, not from the stage's helpers. That includes `doorless >= 1` (the no-door case actually happens), floors in the building's own style, and the four never-placed keys.
- **Criterion 3 (placements).**
  - `place.ts` (`placeGround`) puts the body's front plane on the front cell edge and centres it across the row; a double is centred on its two cells.
  - `levelOf` implements S1's three-sided window, and puts a key with no door at 0.

  `place.test.ts` has the hand-worked pivots the ticket names:
  - one placement per kind;
  - `shopDouble` at yaw 0 and 90;
  - `doorCorner` at all four turns;
  - `Shop_01` at two turns, 0.317 m past the back edge.

  It also has the three named S1 levels: Shop_Corner_01 at -0.010 with the door at 0.149, Shop_02 at -0.071, and Shop_06 at 0. I re-derived those three numbers from the window and they are right.
- **Criterion 4 (checks and fixtures).** `check.ts` (`groundReport`) runs inside `run()` before the layer is returned. It covers:
  - M1 with the deep-key back allowance and the built-partner hold;
  - M6/R9 (the +z and -x faces on the open sides);
  - G1 against RECESS + TOL and OVERLAP + TOL;
  - M8, reading door places from the mass;
  - R3, the sills including the gap, and the stall rule.

  `fixtures.test.ts` has every listed fixture plus a sanity pass. The `Shop_Corner_01` at -0.020 fixture fails S1 alone, and the same piece at -0.010 passes. All three no-door fixtures are there: door replaced by a floor, stalls set to aisle, row set to outer.
- **Criterion 5 (picture).** `FACADES_LEGEND` has 8 entries: none plus the 7 kinds. `stage.test.ts` checks `pictureProblems`, that there are no points, and the legend of every cell against the layer, with the non-zero count equal to the number of built cells.
- **Criterion 6 (R-1 to R-7).** `stage.test.ts` covers:
  - frozen layers;
  - a writer double that fails naming `facades`;
  - the R-4 test double leaving the earlier digests unchanged;
  - digest pins on seeds 1, 2, 3 and 8, with the buildings digests unchanged;
  - determinism;
  - R-7 on the default city;
  - an R-6 import and clock grep;
  - the "reads only mass, buildings, streets.w/h" grep;
  - `circuit` still not built.

  `src/city/stages.ts` changes by the one array entry and its import.
- **Criterion 7 (numbers).** `report.test.ts` prints the listed tallies for the named runs, and ok or failure for the outside cities, without asserting them.
- **Criterion 8.** The main session's screenshot; not judged here.
- **Criterion 9.** The gate is green on 80bc0e9, per the main session.
- **Files.** The commit touches only `src/city/facades/`, the one change in `src/city/stages.ts`, and the new `src/render3d/groundpin.test.ts`. It changes nothing in `src/core/`, other city folders, `src/city/pipeline/` or other render3d files, and adds no new dependency.
- **R-7 (linear work).** The stage works building by building through Maps. Nothing in it is quadratic over the city; only the tests use `find` inside loops.

## Rule conflicts and risks
- **No hard-rule break found.** `src/grid/` and `src/night/` are untouched. Facades imports only `../../core`, `../pipeline/*` and its own files, which the grep test enforces. No GDD Decided rule changes. Q21's three answers are built in as the ticket words them.
- **`src/city/facades/testcities.ts` imports another stage folder.** It is a non-test module in the stage folder that imports `../streets/stage` (`streetsStageWith`) and `../stages`. Only tests import it, and `index.ts` does not export it. Still, it is outside the R-6 grep's `FILES` list, so the folder holds a file that reaches into another stage folder without the test seeing it. Other folders keep the same imports inside `*.test.ts` files.
- **S1's level is computed on the first column only.** For a `shopDouble`, `pick` checks the window on both columns but takes the level from the first. This is fine while every `top_m` is 3 and both columns share a style. The check does test every column, so a future mismatch would fail loudly, not silently.

## Must fix
none

## Could improve
1. `src/city/facades/testcities.ts`: rename it to a test-only name (for example `testcities.test-support.ts`), or add it to the R-6 test with a named exception. Either way, the folder's one import of another stage folder becomes visible to the purity test, and nothing reading `src/city/facades/` mistakes it for stage code.
2. `stage.ts` (`pick`): take the level only after checking that all columns give the same one, or fail naming the cells. That makes the double's one-level assumption explicit, not something only the check catches.
