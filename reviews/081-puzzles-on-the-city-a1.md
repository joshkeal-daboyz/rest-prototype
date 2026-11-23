ticket: 081-puzzles-on-the-city-a1
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section A1 carries out 070 L2d. It deletes the old tile city (its generator, its scene, `frontage.ts`, `parkmetrics.ts`, the old kerb line, `oldTilesRequested` and the `tiles-old` route) along with their tests. It keeps `city=tiles` (the pipeline) and `city=tiles&sheet=1` (the sheet). It takes the old path out of the split guide and the grammar, and leaves `decisions.md` alone.

## Does the branch do it?
This is round 2. I reviewed against `origin/main` (3025b82); local `main` is behind it. The round-1 fixes are in 159a26e. I checked only those fixes and re-ran the gate. Criteria 1 to 5 stand as they did in round 1.

- **Round 1 must-fix 1 (criterion 6, the guide).** Mostly done.
  - **The two `tiles-old` pointers: done.**
    - `block-interiors.md:29` now says "the old tile city (deleted in ticket 081 A1)".
    - `interior-drawing.md:12` is rewritten in the same way. Its wording is a little run-on (see Could improve).
    - `grep tiles-old docs/city-style` now finds only `decisions.md`, which the ticket says to leave as it is.
  - **The two K1 pointers: done.**
    - The 063 F Info line (`evaluation.md:202`) now says "the rule's record is `docs/design/070-K1-circuit.md`".
    - The intro of the `numbers.md` table now names the note for `POLE_SLOT_FROM_KERB_M`.
  - **The old-city check lines.**
    - `parking.md:31` and `evaluation.md:152` are done. Both now say the comparison was on the old path's cities, deleted in 081 A1, and that the pipeline's checks run on 6 x 6 seeds 1 to 10. The second half is true: `src/city/*/stage.test.ts` and the other `src/city` stage tests run the 20 named runs.
    - `fire-escapes.md:28` is not done. It was rewritten to "run by `escapes.test.ts` on the pipeline's 6 x 6 seed 1 and the three maps of 16.8", but that is not what the test runs. `escapes.test.ts` builds no pipeline city. Since L2c its whole-town cases are "passes on eleven ladder maps' towns, …", over `LADDER_TOWNS`, and "passes on the three protocol maps" (about lines 732 and 746 of the file). Its line 702 comment says the same. The guide now names a check that does not exist (Must fix 1).
- **Round 1 must-fix 2 (one whole city in `tilecity3d.test.ts`): done.**
  - The build-out kerb-edge case now loops over `[city]` alone.
  - The 063 A sidewalk block also lost `fixtureOf(6, 2)`. That goes past what I asked, and it is welcome under the same rule.
  - The case's name still says "and on 6 x 6 seed 3" (Could improve).
- **Gate.** `npm run gate` with `--maxWorkers=2` is green: typecheck passed, then 177 files and 3516 tests passed in 345 s. The `stacks.test.ts` timeout from round 1 did not happen again.
- **Test count against `origin/main`.** 11 `it(` cases added or rewritten, within 15. The fix commit adds none.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. There is no new dependency and no GDD Decided rule is changed. `decisions.md` is untouched.
- The fix commit touches only `docs/city-style/` and `src/render3d/tilecity3d.test.ts`, both inside A1's lists.

## Must fix
1. **`docs/city-style/fire-escapes.md:28`: name the check that actually runs.** Replace "on the pipeline's 6 x 6 seed 1 and the three maps of 16.8" with what `escapes.test.ts` runs: "on eleven ladder maps' towns (`LADDER_TOWNS`) and the three protocol maps of 16.8 (`09-shrine-circuit`, `64-the-whole-chain`, `01-first-light`)". Alternatively, say that the old tile city's run went in 070 L2c / 081 A1 and name the ladder towns.

   Effect: the guide then describes the check as it is, which criterion 6 asks for.

## Could improve
1. In `src/render3d/tilecity3d.test.ts:542`, drop "and on 6 x 6 seed 3" from the case name. Since there is now only one city, the `for (const c of [city])` loop could also go.
2. `interior-drawing.md:12` now reads "(`tilecity3d.ts`, `tileslots.ts` and `kerbline.ts`, the old tile city's own drawing went in ticket 081 A1)". Something like "the old tile city's drawing in those files went in ticket 081 A1" would read more cleanly.
3. Carried from round 1: reword the `tileslots.ts` header and the `cityTilesRequested` doc comment, which still call `blocks` and `seed` "the tile city's". Also, the report should mention that `kerbline.ts` gained an import line even though its Files entry says deletions only.
