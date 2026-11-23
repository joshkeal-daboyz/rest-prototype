ticket: 070d2-edge-kerb
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section D2 of ticket 070: stage 4 (edge) lays every street piece as a `CityGroundCell` (role, variant, yaw) and one kerb path per block side, from block corner to block corner. The far side of a T runs straight past and is dropped at its two crossings. A bare one-way street's kerb is straight. Rule 10's two additions and G4 are checked on the layer, the picture gains "dropped kerb" and "kerb return", and R-1 to R-7 hold on the 20 named runs. Everything is pure and stays in `src/city/edge/`.

## Does the branch do it?
Reviewed 26a6fe7 against ac27ce5. Files: `ground.ts`, `kerbline.ts`, `kerbcheck.ts` (new), and `band.ts`, `check.ts`, `stage.ts`, `constants.ts`, `index.ts` and their tests. I did not re-run the suite; the main session's gate on 26a6fe7 is green.

1. **Ground cells: met.** `layGround` (`ground.ts`) writes one record per cell. A bay tile is one 2-cell record on its first cell, centred on the shared edge. The yaws and variants are moved from `tilecity.ts`'s loop and keyed on `rand("patch"|"pave", i, j)`. A one-way lane never gets `laneRight`.
   - The constants are pinned against `tilecity.ts` in `constants.test.ts`: `GRATE_ONE_IN`, `PATCH_ONE_IN` and the six old bits, with `pavementDip` 16.
   - Named-run tests in `kerb.test.ts`:
     - "ground: every edge cell is in exactly one record..." covers the shape, the yaws, the per-role bits and "grate never with a kerb bit".
     - "...one in 12 / one in 6, from the stage's own rand" covers the rand keys.
     - "junction cells are the junctions' rectangles..." covers the junction rectangles.
     - "the named runs have all three sections" covers the 5, 4 and 3 cell sections.
   - Fixture: "the crossings are turned along their own carriageway street... (1 x 3)". It is the ticket's 3 x 1 case, oriented along z: 1 crossing cell across E, two columns of 3 across X, each yawed `yawToward(axis, 1)`.
   - Reading 3 of the pre-check (a dropped-kerb cell counts as a kerb bit, so it is never a grate) is implemented: in `layGround`, `bits !== 0` rules out the grate. `kerbFailures` enforces it, and the "D2 ground" failing fixture tests it. This is the right reading of "a grate never carries a kerb bit". It changes no rule.
2. **The kerb line: partly met.**
   - **Moved: met.** `kerbLine` is moved to `src/city/edge/kerbline.ts`. It reads `ground`, the streets and the cuts. `src/render3d/kerbline.ts` is untouched.
   - **Its own cells only: met.** `pav()` stays inside `s.span` and accepts only cells with `street === s.id`. Tested by the named-run test "a path walks only its street's own span" and by the fixture "a street that ends in a T... has no path cell beyond its span".
   - **One path per block side: met.** `kerbFailures` and the named-run test "each block side has exactly one path, from block corner to block corner..." check that each side has one path whose first and last points are on the span ends at the kerb coordinate, that each edge street's outer pavement has one path, and that the chain is unbroken.
   - **The 063 F cases: not fully met.** The builder replaced the old `kerbline.test.ts` cases with properties on the named runs. That is a fair way to type them in, since the old cases were themselves properties over `tileCity` cities. But only some of them came across:
     - Ported: the chain joins end to end and stays on the axes; every pavement and kerb-cut cell is on exactly one path (which gives one dip edge per cut cell); the near and far return counts per opening.
     - Not ported: Josh's drawn inlet shape, "goes round every inlet as Josh drew it". That case checks that each opening sits between a `return` before it and a `return` after it, that the dip's two ends are the two returns' `at`, and that `openings.length === dips.length`. Also not ported: the return length, 5 m or 10 m. On the named runs, only one hand-typed fixture checks the inlet shape (the bare one-way drive in criterion 4). The criterion says the dips, openings and returns still hold, so this part is unmet. See Must fix 1.
   - **The old failing fixtures: met.** "an inlet with one return removed", "a build-out stretch with its flank removed" and "a return that stops short... 0.1 m fails, 0.04 m passes" each fail by rule name.
3. **The far side of a T: met.**
   - `dropCells` (`ground.ts`) finds the two cells for every T from the junction's missing arm and the ending street's cross-section. `farSides` (`kerbcheck.ts`) finds them a second way: from the block sides' `junctions`, plus the edge-street case taken from the junction.
   - `kerbFailures` checks that each end cell has a crossing in front, that the cells between have a junction in front and are not dropped, that there is no return or corner inside the span, and that no other cell is dropped.
   - Named-run tests: "far side of a T" asserts dropped cells = 2 x Ts, the same set as `dropCells`, one `crossingDip` each, and the cells `bands.length - 1` apart. "a T's far side, on the named runs" asserts that an outer through street has no facing entry and an inner one has exactly one.
   - Reading 4 of the pre-check (on an edge street the far side is worked out from the junction) is implemented in both places, and they agree on all 20 runs through the set equality. Criterion 3's second bullet asks for exactly this. It is a derivation, not a new rule.
   - Fixtures: the 14-cell side gives dips 4 apart (two-way), 3 apart (one-way) and 2 apart (bare), with no return, opening or flank, and the path straight from corner to corner.
4. **A bare one-way street's kerb: met.**
   - Named-run test: no flank on a bare street, the edges on one line, a far return for every near return, the cuts with `plain` null. Every build-out sits on a `parking` band and on no bare street, which also covers "a oneWay street's side without the band has no build-out". `kerbFailures` adds a "bare one-way" check.
   - Fixture: edge, return, opening, return, edge, with no flank, and the returns ending at z 15.
5. **The two additions: met.** `kerbFailures`:
   - "no return at a plaza, park edge or walk-through": a cut or a return whose opening is not a lane, drive or frontLot with a mouth fails.
   - "return ends on the wall plane": the cell beside the opening, just inside the building line, must be in `mass.built`, and the return's `end` must be within `RETURN_WALL_TOL_M` (0.05 m) of that cell's edge.
   - Both have failing fixtures: a plaza with a cut, and a return 0.1 m short. The named-run test re-derives the wall plane independently.
6. **G4: met.** `g4Failures` (`check.ts`) checks that each court touches its opening, that each mouth cell has a cut, and that each lane opening has two mouths (plus a land-to-mass lane count). It is run in `stage.ts` and holds on the named runs. Failing fixtures: a lane end with its cut removed, and a court pointed at another block's drive.
7. **The picture: met.** `EDGE_LEGEND` gains "dropped kerb" (11) and "kerb return" (12), and `picture()` marks dropped cells and adds one point per `returns[].end`. The R-5 test in `stage.test.ts` is updated to match, and `kerb.test.ts` counts both.
8. **R-1 to R-7: met.**
   - R-2: the named runs all return `ok`, and `stage.ts` throws on any kerb or G4 failure, naming the rule.
   - R-4: edge's four pins are re-taken and named as moved by D2. The streets', land's and mass's pins are untouched, since their test files are not in the diff. "the stage always writes `ground` and `kerb`" is a test.
   - R-6: a new import and purity grep over the edge files, and the `bi`/`bj`/`line` grep widened to the new files.
   - R-7: I checked it. `kerbLine` walks each street's span once per pavement band. `layGround` is one pass over the cells plus one pass per street over its own cells. `dropCells` and `farSides` are per junction. The far-side check scans one path's segments per far side, which is bounded by the junctions on a side. None of it is quadratic in the city.

**The changed D1b test** (`stage.test.ts`, "a block whose own bands and across bands are all full gets no first tile"). The typed-in mass has drives along every building-line cell of all four sides and `built: []`. Under D2 criterion 5 a return must end on the wall plane of the built cell beside the opening. Here there is none, so failing is the rule's own verdict. R-2 forbids loosening the check for a fixture. The property D1b tested still holds and is still asserted:
- `edgeFailures(..., true)` runs before the D2 checks in `stage.ts`, so a failure reason that starts with "return ends on the wall plane" shows the stage did not throw on P1.
- The P1 assertions on `e` are unchanged.

I accept the change. The stale comment above it is Could improve 1.

## Rule conflicts and risks
- No purity break. The new files import only `../../core`, `../pipeline/` and `./`. No DOM, timer or `Math.random`.
- No file outside `src/city/edge/`. `src/render3d/kerbline.ts`, `tilecity.ts` and the docs are untouched. No new dependency. No GDD Decided rule or threshold changed.
- The return check reads only `returns[].end`, not the `return` segment's own `b`. A layer whose segment stopped short while its record did not would pass the wall-plane rule. It would be caught only if the chain broke, which it would not if the `opening` moved with it. The walker sets both from the same value, so the risk is low.
- The stage error for G4 reads "G4: G4: ...", because `stage.ts` prefixes the id and `g4Failures`' reasons already start with "G4:". Cosmetic.

## Must fix
1. `src/city/edge/kerb.test.ts`: in the named-run loop, add the 063 F inlet properties the port dropped. The old "goes round every inlet as Josh drew it" checks: for every path, each `openings` entry has a `return` immediately before and after it on the chain; each inlet has one near and one far return and one dip whose `a` and `b` equal the near and far returns' `at`; and `openings.length === dips.length`. Also add the old return-length property: each `return` segment is 5 m or 10 m long. With these, criterion 2's third bullet ("give the same segments, points, dips, openings and returns") is asserted on all 20 runs, not only by the one bare-street fixture.

## Could improve
1. `src/city/edge/stage.test.ts`, the D1b fixture: the comment "the stage itself runs ok on it (D1 criterion 2)" now contradicts the assertion under it. Either reword it, or leave the corner cells of each side out of the drives and mark them built, so the run ends `ok` again and keeps D1b's original assertion.
2. `src/city/edge/kerbcheck.ts`: check that each return segment's far end, `b` for near and `a` for far, equals its `returns[].end`, so the wall-plane rule judges the line that is drawn, not only the record.
3. `src/city/edge/stage.ts`: do not prefix the id when the reason already carries it (G4), so the message does not read "G4: G4:".
4. `g4Failures`' extra land-to-mass lane count goes slightly past criterion 6. It is harmless and could stay.
