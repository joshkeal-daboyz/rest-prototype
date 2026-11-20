ticket: 070a4c-park-places
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 1 counts the park places a split leaves Land (small and served, or large) and redraws a split with fewer than `ceil(blocks / PARK_ONE_IN_BLOCKS)` (S11). After the stop, Josh's ruling moves S5's `T_SHARE_MIN` from a provisional 0.5 to a Decided 0.30, and the pins that moves are re-taken (criterion 8).

## Does the branch do it?
I did not re-run tests. The main session's gate on this section (tsc clean; streets, pipeline, planview: 193 passed) is the evidence I took.

1. **Park places.** `parkPlaces` and `farBand` are in `src/city/streets/check.ts`. `farBand` is exactly the mirror of `ownBand` (index 1 and n-2 swapped), which is how the ticket reads a parking band across the carriageway. A small block counts as a whole place when some side has a non-empty `across` and a far band. A large block counts as a half place. Medium and long blocks never count. All four of the ticket's fixtures are in `parkplaces.test.ts` "park places (criterion 1)": served small, all own-side, large 11x12, medium 10x12. Two more are there too: bare streets, and a far band facing out of the city. Met.
2. **S11.** `s11Failures` and `parksNeeded` are in check.ts, and `SplitFailure.rule` gains "S11". In `laySplit`, S11 is judged after S9 and after S10's redo loop, on `planBlocks` and the final directed streets. It is a miss inside the same `BLOCK_DRAWS_MAX` loop. `PARK_ONE_IN_BLOCKS` is a typed copy pinned equal to `tilecity.ts`'s by a test-only import, as the ticket allows. The 9-block fixture is there: one place fails and names "1 whole and 0 half ... 2 needed", two places pass. Met.
3. **One-way off and on.** `parkplaces.test.ts` "S11 on the named cities" covers all 13 named cities at share 0 and the default. A4b's criterion 3 test (`oneway.test.ts`) still runs. Met.
4. **Stop.** Commits aa2aa72 and 2013d85/c0c9042: the builder stopped, reported the misses by rule, and tuned nothing. Q15 answered it. Met.
5. **Pins.** The describe name in `stage.test.ts` names A4c (park places) and says none of the four pins moved for S11. The 6x6 run is unchanged and asserts no block count. Met.
6. **Report.** Section 0 of `docs/design/070-A4c-stop.md` tabulates the 26 named runs (draw, was, places/needed) and summarises the 54 outside runs. It names 3x3 s12 off as failing, and nothing pins it (Q16 is open). It gives places as a total, not split into whole and half, and it gives no S11 miss count before each draw. The builder's own report is not in the repo, so I can't check those two columns. Not a blocker.
7. **Gate.** As stated by the main session.
8. **T floor.**
   - `T_SHARE_MIN` is 0.3, and its comment says Decided with Josh's words and the date.
   - `split.test.ts` pins it ("T_SHARE_MIN is Josh's 0.30"), and the header no longer calls it provisional. The S5 lattice fixture is untouched, and the lattice still has 0 Ts.
   - The 3x3 s2 pin was re-taken. The test name says it was moved by the T floor, draw 12 to 11, which matches the note. The s1, s3 and 6x4 s1 pins keep their values.
   - `JUNCTION_GAP_MIN_CELLS` is still PROVISIONAL.
   - Met.

**The two extra changes the main session asked me to judge:**
- **`oneway.test.ts`, 3x3 s3 one-way-off hash re-taken.** A4b criterion 3 pins A4's own plan, and A4's plan is the share-0 draw. Changing the T floor moves that draw (13 to 4 in the stop-note table), so the pin has to move. Only that row changed, and the off draws of the other cities in the table are unchanged. The comment names the cause. This fits criterion 8's intent (a pin that moves because of the floor), but the file is not in criterion 8's literal list of pins. Acceptable.
- **The `stage.test.ts` picture test now asks for one-way lane cells (7) only when the plan has a one-way street.** Its new draw (11) for 3x3 s2 with one-way on has no one-way street, so the old assertion could not hold. The check stays exact per cell (7 wherever a one-way lane is), so nothing is hidden on a city that has one. `oneway.test.ts`'s S9 "not vacuous" test still shows that one-way streets exist on some named city. Acceptable.

## Rule conflicts and risks
- No purity issue: `check.ts` imports only `../../core` types and `./constants`. The only cross-folder import is the test-only `render3d/tilecity` one the ticket allows.
- Every changed file is in the ticket's Files list, apart from the stop note in `docs/design/`, which is criterion 4's output. `layout.ts` is untouched (R-9). No new dependency.
- The margin is thin, as the note says: 3x3 s10 with one-way on has 1 good draw of 65. Any later change to the draw can tip it into an R-2 failure.

## Must fix
none

## Could improve
1. In `parkplaces.test.ts`, the test "a draw that misses S11 is a miss and the next draw is tried; every draw missing throws naming the rule" checks only that `splitFailures` never returns S11, which is true by construction. Either rename it to say what it checks, or drop it. The named-city runs are the real coverage of the redraw.
2. If the builder's report does not already give them, add the whole/half split and the S11 misses before the draw to section 0 of the stop note (criterion 6 asks for both).
3. `split.ts` re-builds the street map inside `parkPlaces` on every draw. That is cheap at this scale and needs no change now.
