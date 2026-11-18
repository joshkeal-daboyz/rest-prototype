ticket: 056b-buildouts
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B draws the `buildout` cells as sidewalk-family tiles (from pack pieces, or code-drawn when the pieces are missing) and puts a hashed `SM_Env_Tree_01..03` instance on each of `city.buildoutTrees`, all within the tile draw-call cap. It shows the build-out on the tile sheet, and (criterion 16, Josh: "Lower it to 0.45 (Recommended)") adds `TILE_CITY_R6_MIN = 0.45` for the tile city only and removes the tuned `LOT_RUN_SALT` if every check still passes without it.

## Does the branch do it?
Reviewed commit ab10ba0 against its parent 6f609da (the `goal/city-style` merge of 056 A). It touches 7 files, all in `src/render3d/`. On the gate worktree, `tsc --noEmit` is clean, and I ran `vitest --maxWorkers=2` on tilecity, tilecity3d, tileslots, tileintegrate, parkmetrics and townpin: 190 tests in 6 files, all passing. The main session's full gate is green (2276 passed).

**Criterion 9, build-outs drawn: met.**
- *Slot.* `TILE_SLOTS.buildout` is the pavement's two plain straights (`tileslots.ts`). `variantIndex` picks between them by `variant & 1` (`tilecity3d.ts`). The test "draws a build-out from the two plain straights by its variant…" checks `tileKeyOf` against a rule written out separately in the test (`wantKey`).
- *Front.* No `TILE_FRONTS` entry is added. The builder argues that the straight's +z kerb edge, turned by the cell's yaw, already faces the lane. A real test supports this: "turns every build-out's kerb edge … toward a carriageway cell", on the fixture, the default city and a 5 x 4 city. It finds the neighbour cell from yaw plus `TILE_FRONTS` and requires lane, parking or parkingPlain. This is a valid way to meet "TILE_FRONTS turns it so its kerb edge faces the lane".
- *Level.* The same test checks that the walk is at 0, with the instance y at `-SIDEWALK_WALK_M`. `tileOriginY_m` is used unchanged because `TILE_LEVELS.buildout` is "pavement".
- *Fallback.* With the pieces absent, the build-out is drawn as the code pavement box. The test counts `tile:code-pavement` instances including build-outs. `kerbStrips` now includes build-outs, and the kerb-strip test was extended with an independent neighbour map that covers them. The per-role fallback loop already includes `buildout` in `ROLES`.
- *Trees.* `buildoutTreePlan` picks the key and a quarter turn by hash of seed and point. `tileGroup` gives one `InstancedMesh` per tree key (and per sub-mesh) at y 0 and `WORLD_PER_METRE`. The "stands each tree at its point on the walk…" test decomposes every matrix and checks x, z, y = 0, scale and yaw. It also checks that the counts per key equal the plan and that the total equals `buildoutTrees.length`.
- *Draw-call cap.* Tree instances enter `plan.counts`, so the existing drop loop covers them. With the fixture pack the default city takes 16 calls against `TILE_DRAW_CALLS_MAX` 40. The cap is unchanged. "keeps the whole tile draw within a tight cap with trees in it" runs caps of 6, 12 and 40.
- *Wiring.* `treeInput` reads the trees from the model set's `dress` list (the furniture set the page already loads). An end-to-end test drives `createCityRenderer3d` with a stub loader and counts the tree instances in the rendered scene.

**Criterion 16, tile-city R6 floor: met.**
- `TILE_CITY_R6_MIN = 0.45` sits beside `TILE_CITY_R7_MIN` in `tilecity.ts`, with Josh's words in its comment. `CITY_CHECK.R6` is still 0.5 in `citymetrics.ts`, which is untouched, and the new test pins both values.
- The floor is used only in `tilecity.test.ts` (the new "meets the tile city's R6 floor…" over the default city and seeds 1 to 10) and in `tileintegrate.test.ts`. Both are tile-city tests, and nothing on the ladder reads it.
- `evaluateCity`'s R6 combines the sign share with the ATM floor (`citymetrics.ts:502`). Excluding R6 from the generic check would have dropped the ATM half. The builder re-asserts `CITY_ATM_BLOCKS_MIN` in both places, so nothing is lost.
- `LOT_RUN_SALT` and `runHash` are removed. The sort is now parked, then length bucket, then id (`tilecity.ts` ~line 633). No other tuned number is in `tilecity.ts`; a grep for "tuned" or "salt" finds only the new comment saying there is none.
- With the plain tie-break, everything passes unedited apart from the R6 lines: P1 to P6 (`parkmetrics.test.ts`), 055's checks in `tilecity.test.ts` (including A's far-gap floors), and R1 to R5, R8 to R13, plus R7 at 0.4. So the removal is real and needs no tuned value.

**Criterion 10, the sheet: met in code. The overlap part is the main session's eye check (criterion 11).**
- The build-out shares its two straights with the pavement, so the sheet shows each piece once, with "+ build-out" on its second label line. In the numbered (tall) legend it is added to that piece's line. A new `SHEET_LEGEND` line, "build-out: pavement piece, kerb at arrow", is 40 characters, within `SHEET_LEGEND_CHARS` 41.
- Tests in `tileslots.test.ts` and `tilecity3d.test.ts` cover: exactly two labels carrying the note, the legend lines within the character cap, and a missing piece saying only "NOT IN PACK" (so a label is never "NOT IN PACK + build-out").
- I read "shows `buildout` once" as "no piece is duplicated for the role", which this does.

**Criterion 7 carried (ladder unchanged): holds.** `townpin.test.ts` is unedited and passes. `town.ts`, `citymetrics.ts` and every file on the must-not-touch list are unchanged.

**CI safety: holds.**
- The new tests build typed-in fixtures (the tree size `[2, 4.2, 2.5]` is in `sizeOfKey`). Nothing reads `assets/private/` at module or describe level, and there are no Windows paths. The largest city built is 5 x 4.
- One new `setTimeout(done, 0)` flushes the stubbed loader's promise. It is a macrotask flush, not a timing assertion, and `daytoggle.test.ts` and `tileintegrate.test.ts` use the same pattern.
- No pack file or `assets/` path is in the commit, and `git ls-files assets/private` is empty.

## Rule conflicts and risks
- **One file outside B's Files list:** `tileintegrate.test.ts` (2 import lines, plus the R10 case's `evaluateCity` filter now excluding R6 and asserting `TILE_CITY_R6_MIN` and the ATM floor). B's list allows `tilecity.test.ts` only for the R6 test. The edit is a direct consequence of criterion 16: that case asserted R6 at the ladder's 0.5 on the tile city, and criterion 16 says the tile city's R6 is checked at 0.45 without the salt. It is in the owner's folder, it is the minimal change, and it keeps the ATM half. I judge it justified. The main session should record it as a Files widening, as it did for A. The commit message does not mention it.
- The commit's import of `stableHash` from `../render/city` is a render3d to render import, which already exists in this file (`CityRect`). `src/grid/` and `src/night/` are untouched, so there is no purity issue.
- No label-width test: "turn 0 + build-out" (18 characters) is now the widest per-piece label in the wide sheet, wider than any short name. No test compares label pixel width to the 16 m column pitch at 1280 x 720, so criterion 10's "no overlap" rests on the main session's screenshot under criterion 11.
- The build-out trees join the furniture's pavement trees. Nothing checks spacing between the two sets, so a build-out tree may stand close to a furniture tree on the pavement behind it. This is not a B criterion; it is for the eye check.

## Must fix
none

## Could improve
1. Record the `tileintegrate.test.ts` edit as a widening of B's Files list in the ticket (main session or architect), so the criterion 15 diff check has a written reason.
2. Add a check that every wide-sheet label line is at most a stated character count that fits the 16 m pitch at 1280 x 720, so the longer "+ build-out" line is held by a test and not only by eye.
3. The `buildoutTreePlan` fallback (a tree whose own piece is missing takes another of the three) and the quarter-turn yaw are small extras beyond the criterion. They are harmless and tested; keep them unless Josh finds the turned trees odd.
