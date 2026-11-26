ticket: 081-J-puzzle-fit
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
On opening a city puzzle, the limited camera fits the puzzle's own pieces into the fit area and centres them there. The fit area is the free area between the HUD and the bottom panel, less an 8 % margin (at least 32 px) and less a label strip on the right (`puzzleLabelRoom`). The zoom-out limit, the pan clamp and the zoom-in floor follow those points, every recentre and resize returns to that fit, and `cam=free` and a puzzle with no place keep `jobFrame`. This is round 2. Round 1's single must-fix was that the label strip did not match criterion 2. The architect has since amended the rule, criterion 2 and the `origin_m` reading (commit 1953af0, ticket only).

## Does the branch do it?
Round 1's must-fix 1 is settled by its first route, the ticket amendment:
- J's rule now defines the **fit area** as the free area less `PUZZLE_FIT_PAD` and less the right-hand strip `min(PUZZLE_LABEL_PX, freeW / 6)`, and gives the reason (labels clipped on s07 and s08 at 390 x 844).
- Criterion 2 now measures containment, centring and fill against that fit area.
- The `origin_m` drop is recorded as "the layout corner, not the feed; the feed is its node's place". Criterion 1's wording now reads "every place (the feed's included)", so round 1's could-improve 3 is covered too.

No code changed since round 1. The commit after e0d6ec9 is the merge of `origin/main` plus the ticket and review edit.

1. **The puzzle's points**: met, as in round 1. `puzzleFrame` in `src/render3d/cityview.ts` is now consistent with the amended text on `origin_m`. The criterion is held by the `cityframe.test.ts` case "the puzzle's points hold its pieces and sit inside the district's frame, smaller than it (081 J)".
2. **The fit**: met as amended.
   - `padded()` in `src/render3d/tilecity3d.ts` gives `right = l + freeW - px - puzzleLabelRoom(freeW)`, which is the fit area the ticket defines.
   - The `cityrig.test.ts` case "with the puzzle's points it fits them in the free area, centred ... (081 J)" checks containment against the pad and the strip.
   - It checks centring against `free.l + (free.w - label) / 2`, which is the fit area's centre.
   - It checks fill against `free.w - 2 * padX - label`, which is the fit area's width.
   - It does this over the four sizes and both inset sets.
   - The tolerance is 2 % of the free width, not of the fit area's width. That is a hair looser than the wording; see Could improve 2.
   - The E5 cases are still unedited, and `tilecity3d.test.ts` is untouched.
3. **Limits, pan clamp, recentre, resize**: met, as in round 1. The second `cityrig.test.ts` case holds them.
4. **The play view uses it**: met, as in round 1.
5. **Frame time**: pending, not failed. The main session reports `perf=1` is not yet measured because the pane is hidden while Josh is remote. The fit runs only in `fit()` (open, resize, recentre), never per frame.
6. **Pane check**: the main session reports s01 to s10 open fitted at 1287 x 1178 and 390 x 844, and that the s07 recentre returns to the opening. I did not run a browser.
7. **Josh's play**: his to do.

Tests: `npx vitest run --maxWorkers=2 src/render3d/cityframe.test.ts src/render3d/cityrig.test.ts` gave 7 passed, 2 files. `cityrig` took 92 ms. `cityframe` took 3.06 s, and 3.04 s of that is the existing E3 case's shared city build, not the new case. The pull request adds 3 cases and rewrites none, inside the cap.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change, no new dependency, and no GDD Decided rule touches the camera.
- The files touched are all on J's list. Nothing from its "must not" list is touched.
- The label strip and the `origin_m` reading are now part of the ticket rather than unrecorded changes.
- `PUZZLE_LABEL_PX` (64) encodes an assumption about the overlay's label layout. If that layout changes, the number goes stale without a test noticing (carried from round 1).

## Must fix
none

## Could improve
1. **Criterion 3 wording on D0.** `D0` and `Droom` are worked out on `padded({})`, which also subtracts the label strip. The criterion 3 test's slack check subtracts it too. Criterion 3 says only "the whole canvas (insets ignored, `PUZZLE_FIT_PAD` kept)". The code is the sensible reading, but one clause in the ticket ("and the label strip") would make the two match.
2. **Centring tolerance.** In criterion 2's case, the tolerance could be 2 % of the fit area's width and height, which is what the amended criterion says, rather than 2 % of the free area's. The difference is small.
3. **Round 1's could-improve 1 still stands.** In criterion 3's case, check the pan clamp on z as well as x. For CORNER, check the 40-steps-out scale against the Droom distance, not only the screen slack within 8 px.
4. **J-Q1's options list.** The list under "Questions for Josh" still bolds "limits stay on the district (Recommended)", while his recorded answer is "Approve; limits follow puzzle". The answer above the list is correct. Un-bolding the option, or marking it as not chosen, would stop a later reader misreading it.
