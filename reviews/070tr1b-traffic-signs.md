ticket: 070tr1b-traffic-signs
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 9 also places one `SM_Prop_Sign_Parking_01` at the low end of each unbroken stretch of `CityBayTile`s along a block side. It stands on the kerb line, faces the walk, and is skipped and counted (never moved, never a failure) where CL refuses it (PK, Josh's Q44). The kit, checks, picture, digest pins and report are extended to match.

## Does the branch do it?
1. **Kit and pin.** `kit.ts` adds `PARKING_SIGN_KEY` with bound 0.443 x 1.717 x 0.119 and `KEY_OF_KIND.parkingSign`. In `trafficpin.test.ts`, the always-run tests pin the bound in `SIZES` (7 keys now) and check that the key is not never-used and not in `TRAFFIC_ALLOWED`, which still holds exactly Q33's five. The existing `it.skipIf(!HAVE_GLB)` bounds test loops over `TRAFFIC_KEYS`, so the new key is checked against the GLB within 0.005 m. A new skipIf test also checks that the pivot is on the post axis and the plate is on the +z side. The GLB is read lazily inside the test. Met.
2. **Named runs.** `signs.test.ts` "parking signs on the named runs" works out the stretches on its own from the tiles, without calling `bayStretches`, and compares the count with the stage's. For each stretch it checks one of two outcomes:
   - one sign at the hand-computed pivot and yaw (0.5 m in from the kerb-side edge, 1.0 m from the low end, facing the walk);
   - a skip that CL or the missing walk cell explains.

   It also checks that no stretch has two signs and that no sign is hosted off a stretch. Hand-worked: an x street (51, 24.5, yaw 180), a z street (20.5, 51, yaw 90), and a gap that splits a row with a `noWalk` skip. Met.
3. **TC3 and TC5 fixtures** (`fixtures.test.ts`): a second sign on one stretch (TC3), a sign moved to the high end (TC3), and a sign moved onto a meter. The meter case fails TC3 and TC5, and its test name says so, which the "unless it says so" clause allows. There are extras too: a missing sign where nothing refuses one, a sign turned away from the walk, a meter put at a sign, and a parking sign given the stop key. The matching checks are in `trafficcheck.ts` (the TC3 parking block, plus the existing TC4 and TC5 that apply to every grounded piece). Met.
4. **Picture and digests.** Legend entry 8 "parking sign" is added, `legendOf` maps to it, and the R-5 test expects points {5, 6, 7, 8}. The traffic `PINS` re-pin on seeds 1, 2, 3 and 8. `GROUND_PINS` and the "streets to ground digests equal" test are unchanged in the diff, so digests 1 to 8 do not move. Met.
5. **Report.** `report.test.ts` adds per-run `parking: { stretches, signs, skipped, reasons }`, a total and a min/max range. Met.

Files: only `src/city/traffic/` and `src/render3d/trafficpin.test.ts`, as listed. Gate green (main session).

## Rule conflicts and risks
- No purity break. `signs.ts` imports only `../../core` and files in its own folder. No DOM, timer or new dependency.
- PK is implemented as Josh worded it: the sign is skipped, never moved; a skip never fails the stage (`buildTraffic` keeps only `.pieces`); TC3 rejects a missing sign that CL would have allowed.
- Interpretation: the builder added a `noWalk` skip for a stretch where the cell across from its first band cell is not exactly one plain `pavement` cell (kerb cut, dip, corner). The ticket names only CL as a reason to skip. This reads as "no room" under Q44 and is counted separately in the report, so Josh can see it. Not a blocker.
- `bayStretches` assumes each tile's `cells[0]` is its low cell. The independent test makes the same assumption, so a tile stored high-first would go unnoticed by both.

## Must fix
none

## Could improve
1. `src/city/traffic/signs.ts` `bayStretches`: sort each tile's two cells (or assert `cells[0]` is lower) so that "low end" does not depend on the order edge stores them in.
2. `src/city/traffic/stage.ts`: `buildTraffic` builds `clearOf(layers)` and `trafficFailures` builds it again. The two could share one context if the report's time per city matters.
3. The report could show the `noWalk` skips beside the CL reasons in its summary, so Josh can see how many skips the ticket's CL rule does not explain (the pre-check's 130 had CL reasons only).
