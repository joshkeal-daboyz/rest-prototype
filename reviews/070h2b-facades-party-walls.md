ticket: 070h2b-facades-party-walls
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 7 section H2b: wherever a building stands taller than the building beside or behind it, put a painted board, two windows or a pipe run on every storey face of the party wall above the lower roof (rule 8, M7). This uses a typed kit table, Josh's `BLANK_RUN_MAX_M` = 2.1 (Q23) and PW1 to PW6 read on cells, and adds a point per piece to the picture. PW7 also applies: H2's checks and the column cap count H2's kinds only.

## Does the branch do it?
I reviewed c5b67f0 against e93632d. I ran the four new test files with `--maxWorkers=2`: 36 passed, 0 failed. The gate was already green, so I did not re-run the whole suite.

- **0. Nothing in `src/core/`.** Met. The diff has no core file.
- **1. The kit table.** Met. `partykit.ts` has the seven boards (4.193 x 2.028 x 0.118), `SM_Prop_Window_01` (1.303 x 2.313 x 0.370), and `Pipe_Present_01` and `_03` with the pre-check's bounds. `_02` is not in the table. It also has the copied `PARTY_BODY_M` and `PARTY_ROOF_H_M`, and `BLANK_RUN_MAX_M = 2.1` with a comment calling it Decided and quoting Josh's "Yes, 2.1m". `PARTY_WALL_KINDS` is exported. `src/render3d/partywallpin.test.ts` covers everything the criterion lists:
  - the boards equal `BILLBOARD_FACES` and the fixture's bounds;
  - the insets equal `BODY_M` and `KIT.body`;
  - the roof heights equal `KIT` (read by the test only);
  - 2.1 is pinned;
  - no kit key is in `DRESS_NUDGE_M`, `DRESS_FRONTS` or `BUILDING_FRONTS`;
  - inside a lazy `it.skipIf(!HAVE_GLB)`, the GLB bounds match within 0.005 m.
- **2. The faces.** Met. `scanParty` and `partyFaces` in `party.ts` skip open sides, put a blind column's own front into `u1` instead of the faces (U1), and give storeys N.storeys to C.storeys - 1. The lowest face's `lo_m` is the top of the lower roof. `party.test.ts` "the faces and the checks on the 20 named runs" checks, on every face of all 20 runs:
  - none is on an open side, and none is on a blind front;
  - the step is at most 2 storeys;
  - each face is listed once.

  The second test checks that every row joint steps, more than 100 joints a run, and that every step is a face or a U1 front.
- **3. The kit placed.** Met. `buildParty` picks with `rand("party", ...)` among the options that fit (`fitsRoom`) and are not the previous face's key, and fails with a `CityStageError` that names the face when nothing is left. `mergeWalls` appends each building's party pieces after its H2 pieces. The hand-worked tests in `party.test.ts` are on a synthetic pair:
  - a board at four turns (pivot 0.059 m off the cell edge);
  - two windows at plus and minus 1.25 m (0.185 m off);
  - over `Roof_02` (5 over 3 storeys): the board centred in 2.256 m, windows only on the upper face, and `Pipe_03` spanning both faces centred in 5.256 m.
- **4. The checks.** Met. `partycheck.ts` checks:
  - M7, with faces taken from `mass` and `buildings` through `scanParty` and not from the layer, and the widest bare stretch against 2.1;
  - PW2 attachment within 1e-6 m, plus yaw and scale;
  - PW3 room and the 5 m across;
  - PW5 running;
  - PW6 pipe allowance;
  - 16.11 (an escape on a party face or on any side that is not open).

  `partyfixtures.test.ts` has every fixture the criterion lists: all kit removed (M7 on every face), one face's piece removed (M7 on that face only), a board 0.1 m off the wall (PW2, both directions), windows pushed to one end (M7 at 2.39 m and nothing else), raised past the roof and sunk into the lower roof (PW3), the same board key on two faces running (PW5), a pipe on the street front (PW6), an escape on a party face and on a closed side (16.11), and the U1 positive. A sanity test checks that the unchanged layer passes. The stage runs `partyFailures` itself, so all 20 named runs pass through the stage.
- **4b. PW7.** Met. `wallcheck.ts` changes only the import and the `walls` filter on `PARTY_WALL_KINDS`. The "which H2 does not place" failure still fires for an unknown kind (the "mystery" kind in the PW7 fixture). `stage.ts` runs `wallFailures` on the whole layer, then `partyFailures`. In `escape.test.ts` only the `perCell` line changed. `escapefixtures.test.ts` and `escapereport.test.ts` are untouched. The PW7 test checks that `wallReport` of the whole layer `toEqual`s `wallReport` without the party pieces, failures and metrics both.
- **5. The picture.** Met. The new legend entry is "party-wall kit" at index 15, and `wallLegendOf` maps the three kinds to it. `stage.test.ts` checks the legend length and names, that there is one point per piece in walls order, and that there are more than 500 party points.
- **6. R-1 to R-7.** Met. The facades pins are replaced, and the comment names H2's old pins. `ground` and `dressing` digests are pinned to H2's on the four pin cities. The earlier stages' pins are unchanged. The default city (6 x 6 seed 1) is ok in the report.
- **7. The numbers.** Met. `partyreport.test.ts` prints, for each of the 20 runs:
  - faces by step and by where;
  - the U1 fronts;
  - pieces by kind and by key;
  - running-rule removals;
  - the widest bare stretch (1.197 m);
  - the `_01` count (0) and faces where nothing fits (0);
  - the fullest column with all three sets counted (9, reported only);
  - the totals against `DRESS_MAX`.

  The outside cities are reported without assertions. Per Josh, I did not look into the 3x3 failures.
- **8.** This is for the main session (a phone-sized screenshot).
- **9.** This is the builder's run. The gate is green.

On rule 8 as the ticket reads it: the windows are correctly kept off a one-storey step over a style 2 or 3 roof. `_01` stays in the table and is ruled out only by PW3, with no special case. The pipe goes only on two-storey steps.

## Rule conflicts and risks
- None found. Every file in the diff is on the ticket's list. There is no core change, no new dependency, and no locked puzzle. `src/grid/` and `src/night/` are not touched. The `src/render3d/` test imports `src/city/buildings/kit.ts`, which the ticket allows.
- One risk: "by where" reports `L leg 0` on all 20 runs. `where` is "leg" only when the two columns are in different rows and neither is blind, and an L's two legs may share one `rowId`, so an L-leg step may be counted as "row". This is a reported number only; no check reads it.

## Must fix
none

## Could improve
1. `partycheck.ts` keeps its own `KIT_KINDS` set, and `stage.ts` (`wallLegendOf`), `stage.test.ts` and `partyfixtures.test.ts` (`isParty`) spell out the three kinds by hand. Reading `PARTY_WALL_KINDS` everywhere would keep one list.
2. Explain or fix the zero `L leg` count in criterion 7's "by where" (see Risks). Either classify an L's own leg joint (for example through `bend`) or say in the report that legs fall under "row".
3. The named-runs test's `party.length >= faces.length * 0.7` is a loose bound. It is harmless, because M7 already checks every face, but it could be dropped or tied to `boards + 2 * windowPairs + pipes`.
