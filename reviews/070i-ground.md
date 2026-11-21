ticket: 070i-ground
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 8 of the city pipeline, pure, in `src/city/ground/`. It ports the tile city's ground dressing onto the pipeline's cells: pavement furniture on terrace runs, lane bins against the lane walls, trees and benches on greens, and plazas and frontage lots dressed. It adds Josh's Q28 rulings (EL, DK, LB with the half-cell walk, GS, KO limited to pavement props and lane bins, AV on plaza and lot groups), runs its own `groundcheck.ts` before it returns, and adds the stage to `BUILT_STAGES`. Outside the folder it may only change the named stage-list lines and add `furnpin.test.ts`.

## Does the branch do it?
I read the diff ff47cce...4ae2a41. The gate was already green on 4ae2a41 (tsc clean, 4147 passed), so I did not rerun the suite.

- **0 (architect's types).** These were already in `src/core/` at ff47cce, and the branch does not touch `src/core/`.
- **1 (kit).** `kit.ts` has 24 keys with bounds and kinds, and `GREEN_TREES`/`GREEN_BENCH`/`LANE_BINS` alias the pavement lists. `constants.ts` has every ported number with a one-line source comment, plus `HALF_CELL_M` and `LANE_BIN_FIRST_M`, which are marked as Q28's and not ported. `facadebounds.ts` has 15 dressing, 8 wall and 17 novelty keys plus the code-escape footprint. `src/render3d/furnpin.test.ts` pins:
  - the key list against `furnitureKeys()` less the panel;
  - each bound against the typed fixture;
  - the tile lists, every constant and the facade bounds key by key;
  - the code escape against wallkit;
  - `CITY_NEVER_USED`;
  - the GLB bounds inside `skipIf(!HAVE_GLB)`.
- **2 (RN).** `runs.ts` works the runs out from `buildings.rows`/`buildings`/`mass.built` and `edge.cells`. Missing pavement fails the stage naming RN (R-2). `runs.test.ts` checks every named run's chain, front, pavement cell and role, frame edges and run-of-one; it also checks that every street-front outer cell is in exactly one run. The hand-worked fixture (three buildings broken by a drive) gives runs 10-30 m and 35-45 m. The replaced `across` assertion now checks that each run's street is its block's own street on that side (`streets.blocks[].sides`). That is a fair test of "no run on an edge street's outer side".
- **3 (pavements).** `pavement.ts`' `layoutRun` matches `furnitureLayout`'s loop line for line: caps, corners, the walk's t-check, pitch, tree pitch, footprint gap, bollards, first/fill/gap/item/key. It replaces `clearOfBuildings` with AV/EL, and adds KO and DK (wall line only). MT is in `layoutPavements`. `pavement.test.ts` covers:
  - every check on the 20 runs;
  - the caps per run;
  - every meter beside a bay;
  - all wall and kerb groups, bollards and a bus stop found;
  - MT taking meters out on every run;
  - the hand-worked bench t, hydrant t, bollard s, and the awning case (tree refused, bench placed).
- **4 (lanes).** `lanes.ts` puts each bin in the lane cell with its back `FURN_WALL_M` off the wall, at 12.5 + 10n, alternating + and - sides, while `s <= length - 5.5`. It skips places that are not built, a mouth, not a lane, KO, DK, or AV/EL. `lanes.test.ts` checks LB/DK/EL/AV, never in a mouth or beside a drive, bins on every named run, and refusals for not built, DK and escape across the runs. The hand-worked + side bin at 12.5 m has its pivot and yaw worked by hand, with separate cases for drive, mouth, door and escape.
- **5 (greens).** `greens.ts` builds maximal straight paths of two or more cells. The bench goes beside the middle cell, higher side first, `BENCH_FROM_PATH_M` from the edge, facing the path, one per cell. Trees go on `rand("green","tree",i,j) % 3 === 0` cells less bench cells. `greens.test.ts` covers the named runs, court and park presence, and a 3x5 green worked by hand.
- **6 (plazas and lots).** `lots.ts` follows the open-lot branch of `furniture.ts` piece by piece: the same p/q, hash keys and `accept` rule, at lift 0 and without the panels. AV is checked per group, and a group under a box is left out whole. The billboard goes under the lowest eave (3 x storeys of the neighbours). `lots.test.ts` covers the named runs, the hand-worked plaza tree and bench pivots, a tree under an awning left out alone, the two lines tiles at z 17.5 and 22.5, and the 9 m vs 6 m eave case.
- **7 (checks).** `groundcheck.ts` implements every listed check, judging from the layer and the earlier layers only. `fixtures.test.ts` has the positive control and every fixture in the list. Each one searches the default city for a place that gives exactly the expected check list.
- **8 (picture).** The legend is exactly the ticket's 13 entries. The stage test checks the lattice size, the legend, each cell against the run pavements, and one point per prop with its legend index.
- **9 (R-1 to R-7, stage list).** `stages.ts` gets one entry plus its import. `stage.test.ts` covers:
  - the stage list, with circuit still not built;
  - frozen layers;
  - the test double built by replacing the stage named "ground", with digests of streets through facades equal;
  - a facades writer failing naming ground;
  - the four digest pins (with the facades pins unchanged);
  - R-3 determinism;
  - a layer-read proxy (exactly the six layers);
  - import and purity greps;
  - the `bi`/`bj`/street-`line`/circuit grep;
  - the NL key grep.

  The three outside edits are exactly the lines named: the facades stage-list assertion, facades `stagesOf` cut at facades, and the deleted "ground" not-built line in `run.test.ts`.
- **10 (numbers).** `report.test.ts` logs per-run and lowest/highest numbers covering everything the criterion lists, plus the outside cities (3x3 and 6x4, seeds 1-20, both ways), with no assertion on them.
- **11.** This is the main session's screenshot, and I can't judge it here.
- **12.** The test commands are as the ticket gives them.

**Rules.**
- **Purity.** `src/city/ground/` imports only `./`, `../../core` and `../pipeline/`, and the grep test enforces it. There is no DOM, timer or random in the stage files. (`performance.now` appears only in `report.test.ts`.)
- **NL.** No lamp key, and the keep-point list is passed empty and proven by a fixture.
- **Scope.** No new dependency, and no file outside the ticket's list.
- **The builder's four calls are sound:**
  - The hash keys are not fixed by the ticket except `green/tree`, which matches.
  - Ignoring `rz_rad` touches only code-escape stringers. Their plan footprint is the whole code escape anyway, and the drop ladder (rz 0) sets `low`. The `y_m - h_m/2` reading of a box without `scaleY` is the one stage 7's own check uses (`facades/escape.ts`).
  - `testcities.ts` skipping the grep follows facades' precedent, and the ticket lists it as test support.
  - The `across` replacement tests the same rule.

## Rule conflicts and risks
- `runs.ts` adds an RN failure the ticket does not name: a building with only some of its cells fronting a street. It is an R-2 stop, not a loosening, and the named runs pass, but a future city could stop on it.
- The plaza front uses `rand(...) % streetSides.length`, where the ticket says `% 2`. The two are the same while every plaza has two street sides. If a plaza ever has one or three, the digest moves silently instead of failing.
- The heavy tests run 20 cities through stage 8, and the report test runs 80 more with a 600 s timeout. That is fine on CI per the ticket, but heavy on Josh's PC if run together.

## Must fix
none

## Could improve
1. `src/city/ground/fixtures.test.ts`: the aisle-bench fixture accepts either `["R10 place"]` or `["R10 place","greens"]`. The ticket wants R10 place alone for that fixture, so prefer the alone case, or state why greens fires.
2. `src/city/ground/lots.ts`: make the plaza front `% 2`, as cut, or fail (R-2) when a plaza does not have exactly two street sides. Either way the reading can't drift unnoticed.
3. `src/city/ground/stage.test.ts`: add a grep that no non-test file of the folder imports `./testcities`, so the grep exemption stays test-only.
4. `src/city/ground/keepout.ts`: a comment that the `low` of a code escape's stringer ignores `rz_rad`, and why that does not matter (the ladder or deck is lower).
