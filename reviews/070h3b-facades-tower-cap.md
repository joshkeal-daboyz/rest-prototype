ticket: 070h3b-facades-tower-cap
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Josh's Q25 rule ("Yes to all"): each street block keeps at most floor(n / 16) water towers, picked by a hashed rank. A freed roof gets a roof exit only when its run would otherwise have no big roof item (one ranked roof per bare run) and gets small props otherwise. R8's second number must stay equal to H3's on every run. There is a new TC check, the facades pins are re-pinned, and nothing outside H3's roof files changes.

## Does the branch do it?
Reviewed `git diff 65fa9d3...4308d88`. I ran only `roofreport.test.ts -t H3b` (passes). The gate was already green.

- **0 (no core change).** No `src/core/` file is in the diff. `CityBuilding.block` and `CityRoofPiece` are used as typed.
- **1 (the number).** `roofkit.ts` adds `WATER_TOWER_PER_BUILDINGS = 16`, and its comment quotes Josh's rule and Q25 answer 2. `roofpin.test.ts` adds exactly one test, whose name cites "Yes to all". It pins the value without comparing it to the old path. Nothing else in the pin test changed.
- **2 (H3 unchanged with no cap).** `buildRoofs` takes an optional fifth argument, `towerPer`, defaulting to the constant. `stage.ts` is not in the diff. In `roof.test.ts` "towerPer 1 gives H3's layer", the facades layer built with the `towerPer` 1 roofs digests to 85f425f5 / 40ff1675 / e1ee93b5 / 06de80d5 on seeds 1, 2, 3 and 8. That proves the four-pass reorder changes nothing except the cap. The test also asserts that the stage's own layer differs from those pins.
- **3 (TX and TS).** The "TX and TS" test covers each clause on all 20 named runs:
  - at most floor(n/16) towers per block, and none on a block under 16 buildings (counted);
  - exactly min(cap, candidates) towers per block;
  - the kept set equals the first `cap` candidates, re-ranked independently by `unitOf(rand("roof","tower",block,id))` with ties by id;
  - each kept tower is deep-equal to its uncapped piece (same column and placement);
  - the pick is exercised: more than 500 blocks have more candidates than their cap.

  In the code (`roofs.ts` pass 2), `block` is read as an opaque key, and the grep test for R-6/R-1 still stands.
- **4 (TF).** The "TF" test covers each clause:
  - every building that is not a freed roof keeps identical pieces;
  - a freed roof's big prop is either one exit or nothing;
  - a freed exit sits in a bare run, on that run's first freed roof by `rand("roof","exit",run,id)`, and is the only freed exit in that run;
  - every run with a big prop when uncapped still has one;
  - freed exits appear on both blind and mid columns, and some freed roofs take no big prop.

  The stop rule (R-2) holds: the test asserts that every bare run with a freed roof is topped up exactly once. The report agrees: 110.7 bare runs, 110.7 topped up. In the code, pass 3 tries one ranked roof per bare run through RX's tiers (`exitTries`) with RE/RK/RW/RC as merged (`exitGroup` plus `room`). A freed roof never takes a tower or a billboard. Pass 4 gives small props to every column except the current `bigN`, which is reset to -1 when a roof is freed, so the column the tower would have stood on now takes small props as the ticket says.
- **5 (TC).** `roofcheck.ts` adds TC inside `roofReport`'s failures, after the cap check. It counts over `roofs` and `buildings.buildings`, fails with the name "TC", and lists the cells of the block's towers. RX is untouched. In `rooffixtures.test.ts`:
  - the positive control (the default city has no failures) now includes TC;
  - "one over the cap" adds a tower to a block that holds its cap, on a mid column with its small props removed. It fails with TC only, naming the block, with more than one cell listed;
  - "a small block" uses the default city if it has a block under 16 buildings, otherwise the first named run that has one. It fails with TC only.
- **6 (re-pin).** `stage.test.ts` changes only the four `PINS` and their comment. The comment names H3's pins as the ones replaced: 88cc62e0, d424e8df, ea9ad368, a6511846. `WALLS_PINS`, `H2_LAYERS` and the earlier stages' pins are unedited, and the gate passes them.
- **7 (numbers).** `roofreport.test.ts` adds an "H3b" report covering every field the ticket asks for, per run and as a city mean. `RoofStats` gains `towerCandidates`, `freed`, `bareRuns`, `bareRunsToppedUp` and `freedTook`. H3's report lines and the outside cities' lines are unchanged. Against the pre-check, a city averages:

  | | Branch | Pre-check |
  |---|---|---|
  | Towers | 43.9 (36 to 52) | 44 (36 to 52) |
  | Blocks with 0 / 1 / 2 / 3+ towers | 0.5 / 26.6 / 7.5 / 0.8 | same |
  | Freed roofs | 211.5 | 212 |
  | Exits | 273.4 | 276 |
  | Roof pieces | 2,567.6 | 2,570 under H3 |

  The most towers on any block is 3. R8's second number is 0.652 at its lowest (seed 10) and equals H3's on 20 of 20 runs.
- **R8's first number.** It moves from H3's lowest 0.965 to 0.958 (seed 2; the largest drop on any run is 0.009). The ticket constrains only the second number to equal H3's. The pre-check predicted 0.959 for the option Josh chose, and the builder's report is named as the record. The 0.9 floor still holds with a wide margin. This meets the ticket; it is not a regression.
- **8.** This is the main session's screenshot, so I did not judge it.
- **9.** The builder's test scope is a process note. The gate is green.

## Rule conflicts and risks
- No GDD Decided rule is touched, no threshold moves, there is no new dependency, and nothing in `src/grid/` or `src/night/` changes.
- Every file is on the ticket's list. `stage.ts`, `index.ts` and `src/core/` are untouched. In `src/render3d/` only the one pin test was added.
- `roof.test.ts` now imports `../pipeline/digest`. That is a test-only read of a pipeline helper, not an edit to `src/city/pipeline/`.
- Pass 3 reuses `exitGroup` and `room`, so freed-roof exits that RK turns away or the cap rejects add to H3's `rkTurned.exit` and `capTurned.exit` stats. H3's report lines can therefore show slightly different turn-away counts than at 194643e. This is only a report, and the layer is unaffected.

## Must fix
none

## Could improve
1. `rooffixtures.test.ts` `withExtraTower` hard-codes the deck front as `2.2` and the column cap as `6`. Using `ROOF_EDGE_M` / `deckOf` and `DRESS_PER_BAY_MAX` would keep the fixture "placed as H3's tower is" if those constants ever move.
2. `roofs.ts` pass 3: count freed-roof turn-aways in their own `RoofStats` fields, or not at all, so H3's `rkTurned` and `capTurned` lines keep their meaning (see Risks).
3. The TF test's exercise thresholds (blind > 100, mid > 500, none > 500, exercised blocks > 500) are bare numbers. A comment tying them to the report's means would explain why they are safe.
