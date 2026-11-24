ticket: 081-K2d1-roof-places
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 6 names every pole's model by `poleAt`'s rule, checks CK7 (4.2 m) on the real model heights, and writes and checks the roof structure places (`roofs`, corner and mid-row), the offered roof span places (`roofSpans`) and the corner keep squares (`roofKeep`) by CK17a to d. It does this without moving any ground-layer output or any pin other than stage 6's digest. The cap is 9 cases added and 1 rewritten.

## Does the branch do it?
Reviewed against `origin/main` (merge base 66beba9). The builder's own commit, 890fbd6, touches only `src/city/circuit/`. The `src/core/`, ticket, review and `.claude/launch.json` lines in the diff come from the goal branch's commits (f394e7b, 24ca9ef, bab3cc5), not from the builder. Test count: 9 `it(` added and 1 rewritten (R-1 to R-7), which is 10 and matches the ticket. I ran `npx vitest run --maxWorkers=2 src/city/circuit/circuit.test.ts`: 25 passed, 17.9 s.

1. **Pole pick.** Met. `polemodel.ts` `poleModelFor` uses `stableHash` from `../pipeline/hash` and handles the `<run>#<n>` stepping. `stage.ts` writes `poleModels` for every pole. The test "PK2 criterion 2" compares it with `poleAt(POWER_MIX, id)` on 10 pole ids and 10 `#n` ids. Only the test imports `src/render3d/powerkit`. That every pole is named is asserted in the rewritten R-1 to R-7 case.
2. **CK7.** Met. `checkroofs.ts` takes each pole span's ends at `poleEndHeight` (the lowest of the three `GROUND_POLE_ATTACH_UP_M` values) and finds the low point of the kit's parabola with `lowestOver`. It reports "CK7". The test stretches seed 1's lowest crossing to 50 m and sees CK7 fail on it. The name says "on Apocalypse poles", but the test doesn't fix the models. It still fails if the rule breaks.
3. **CK17a corner places.** Met. `roofplaces.ts` has `layRoofs` and `roofPoint` (0.6 m inset from both street walls). `deck_y_m` is the piece's base plus `ROOF_DECK_M`, copied with its source line (`roofkit.ts` line 51; I checked it is 0.5). The keep squares are the corner places only. All three Fails are covered by the test: a missing structure, a bogus place on a corner with a non-street side, and a place moved 0.3 m off its inset.
4. **CK17a mid-row places.** Met. One place per `mid` column with a street front, at mid-front and 0.6 m in. The test checks the full set against `mass.built` and checks one point (`+z`: j*5 + 4.4). A bogus place on a mid column facing a lane or park fails.
5. **CK17b ends and kind.** Met. Ids are sorted `span:<a>~<b>`. `over` must agree with `street`/`junction`, a mid-row place gets no junction span, and a roof span placed in `spans` fails. The test covers both Fails: a pole-to-pole diagonal in `roofSpans`, and a roof span listed in `spans`.
6. **CK17b where it passes.** Met. `judgeSpan` traverses the cells exactly (`traverse`), skips the cells of the span's own roof ends, refuses a block cell, refuses two junctions, and refuses two streets when there is no junction. The 40 m limit is on plan length. The test covers all three Fails: 45 m, two streets, over a block. Q45 for pole spans is held by K2a's existing CK6 case, as the ticket says.
7. **CK17c offers.** Met as worded. The pavement offers are the two nearest non-crossing poles of each own-block line on the place's street sides. Street offers go to the facing blocks' roofs and fixed (non-slot) poles within 40 m, on the facing pavement. Junction offers go to the diagonal block. Every offer goes through `judgeSpan`. The test checks that `roof:54:47`'s pavement set is exactly its 4, that no junction place touches a mid-row place, and that removing one of the 4 is reported as CK17c.
8. **CK17d heights.** Met. The 4.2 m floor applies to every roof span. The 7.5 m floor applies over the zone: junction cells plus carriageway and crossing cells next to them (`roofContext`, `CARRIAGE`), with pavement excluded. The test finds a seed-1 junction span from a roof to a pole and checks it:
   - it passes on its own model, which must be Palm, because both non-Apocalypse keys in `GROUND_POLE_MIX` are Palm and B1 says no Apocalypse span passes;
   - it fails as "junction zone" once that pole is switched to Apocalypse;
   - the zone holds no pavement cell, which is how this test covers the ticket's "Passes: a pavement place beside a junction".
9. **CK17d in plan.** Met. One case covers both halves: a Palm pole span across a pavement roof span with less than 1 m between them fails, and a street light 0.4 m off the span fails.
10. **Seed 1 and the pin.** Met. The digest is re-taken once, from `a6b0af56` to `9ff1b134`. `poleModels` names every pole, and `circuitProblems(layer, input)` is empty on 6 x 6 seed 1, so CK1 to CK11, CK7 and CK17a to d all hold.
11. **Counts.** Can't tell from the branch: they belong in the builder's reply, which I was not given. There is no test, correctly.
12. **What does not change.** Met as far as the branch shows. `poles`, `spans`, `drops`, `lights`, `posts`, `keep` and `circuitPoints` are built as before: `keep` is still poles plus lights, and the roofs aren't in it. No other test file was edited. CI's reached set (ground, traffic, facades and the era pins) was green on this PR.
13. **Picture.** Skipped as instructed. For the record, the code does it: `CIRCUIT_LEGEND` gains "corner roof structure", and `picture` draws only `row: "corner"` places.

**The builder's four readings:**
- **The sag on the 3D chord; `len_m` and the 40 m limit on plan.** Right. The kit's `fitLine` (`powerkit.ts` line 349) sags on `Math.hypot(dx, dy, dz)`, so the check judges the wire the renderer draws, which is what the ticket's "follows the kit's parabola" asks. B1's lengths are plan distances measured by hand (21.35 m square across a two-way street, and so on), and criterion 6 is worded in plan. The constant's comment says "in plan".
- **The junction zone includes diagonal neighbours.** Right. "Within `CELL_M` of the junction square" includes a cell that touches the square at a corner. In practice those diagonal cells are almost always `pavementCorner`, which the carriageway filter drops, so the reading changes little.
- **The diagonal block is the nearest block in the corner's opposite quadrant of its junction.** Right. It is "the diagonally opposite block across the junction it faces" (B1 section 4b and c), made exact for an irregular grid. The junction is the one the corner's two streets share, which is the junction the corner faces.
- **`over` must match the offered class.** Right, and the safer reading. B1 defines the three kinds by what a span passes over and where it goes: pavement only; one street to the facing block; the faced junction to the diagonal block. A candidate to the facing block that clips a junction cell is therefore neither kind and is not offered. That keeps the 7.5 m floor and "one junction" tied to the kind. Both the layer (`offer`) and the check (`offeredTo`) use the same reading.

**The time.** Not a test-policy break. Rule 5's 2 s budget is for a new file. `circuit.test.ts` already existed, and the ticket explicitly allowed the cases to go there ("in `circuit.test.ts` ... or in a new `roofs.test.ts` that runs under 2 s"). Most of the 17.9 s is the eleven older K2a and K2b cases. Each calls `circuitProblems` on a layer that now has `poleModels`, so each now also runs `roofProblems` (CK1 went to about 0.44 s). The wider cost matters more: `stage.ts` line 35 runs `circuitProblems` on every stage-6 build, so every test that builds a city pays this cost and the extra `layRoofSpans`. This PR does not measure that (it is #41; the next measurement is after #50). See could-improve 1.

## Rule conflicts and risks
- None found against the hard rules. `src/city/circuit/` is not one of the pure folders. Its only new cross-folder import is `stableHash` from `src/city/pipeline`, which the ticket names. `src/render3d/` is imported only by the test, as criterion 1 asks. No new dependency, no GDD Decided rule touched, no file outside `src/city/circuit/` in the builder's commit.
- Risk to the whole-suite budget, not measured: every city build now runs `roofProblems` in stage 6.

## Must fix
none

## Could improve
1. **Make `roofProblems` cheaper** (`src/city/circuit/checkroofs.ts`, `roofplaces.ts`). I have not profiled it. The likely costs are these:
   - `offeredTo` calls `candidatesOf` once per roof span. That means a linear `blocks.find`, a filter of every pole per side, and a scan of junctions and blocks for `diagonalBlock`.
   - `judgeSpan` runs again for every pavement candidate in the completeness loop.

   Computing `candidatesOf` once per roof and keeping blocks in a `Map` should bring stage 6 and `circuit.test.ts` most of the way back. It is worth doing before the #50 measurement.
2. **Check the mid-row "either side" wording** (`roofplaces.ts` `nearestTwo`). Criterion 7 says a mid-row place gets "the nearest pole either side along its one side". `nearestTwo` takes the two nearest by distance. Where a line's gaps are uneven, those two can both fall on one side of the point. This may occur, not checked. As built it follows the criterion's main wording ("exactly the two nearest poles"), so it is not a blocker. If the sub-bullet is meant strictly, pick the nearest pole on each side of the point's position along the line.
3. **Rename or pin the CK7 case.** It says "on Apocalypse poles" but doesn't set the models. Either drop the phrase or set the two ends' `poleModels` to Apocalypse, so that the name is what is tested.
4. **Tighten the check's street-pole side** (`checkroofs.ts` `offeredTo`). The check accepts a street pole whose side is opposite any of the roof's sides. The layer ties the side to the block across that side. The check is a little looser than the builder; ideally the two would match.
