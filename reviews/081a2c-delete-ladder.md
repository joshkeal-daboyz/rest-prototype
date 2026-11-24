ticket: 081a2c-delete-ladder
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Delete the ladder's 3D town: its files, the ladder-only functions in kept files, the renderer's ladder, `?gallery=`, `?fronts=1` and `cam=street` branches, and their tests. Carry out A2b's per-file sort of the mixed test files. Take "ladder" out of the asset gallery's uses. The pipeline city, the tile sheet, the asset gallery and the 2D game must work as before. Only `src/render3d/`, two `src/ui/` asset-gallery files and the city-style docs may change, and nothing in `src/city/`.

## Does the branch do it?
Reviewed `git diff origin/main...ticket/081a2c-delete-ladder` (builder commit 0d59c7e). I ran the 13 changed test files that are not heavy (ladderpath, placeholders, polygon, models, powerkit, colourway, lightrig, styleguide, stylepin, daytoggle, assetcatalogue, assetgallerylogic, `src/city/mass/lots.test.ts`): 305 passed in 8 s. I did not run `plan3d.test.ts` or `tilecity3d.test.ts`. Their changed cases are string checks on `renderer.ts`, and CI covered them.

1. **Deleted.** Met, with one file kept. `town`, `terrace`, `scene`, `layout`, `camera`, `captions`, `streetcam`, `gallery`, `stackgallery` and `debug3d` are gone. `renderer.ts` keeps only the plan, plan-view, assemble/tiles and tile-sheet routes, so `?gallery=`, `?fronts=1` and the ladder's `cam=street` go with it. `applyModels` is gone from `models3d.ts`, and `citymetrics.ts` keeps only its thresholds. **`text.ts` is kept, not deleted.** The tile sheet's labels (`tilecity3d.ts:28`) use `createCaptionSprite`, and the ticket says the tile sheet must work as before, so keeping it is right. The ladder-only bar sprite left it, and `CaptionTone` moved into it. `FOV_DEG`, `ELEVATION` and `scaleForPx` moved to `kitunits.ts` for the same reason.
2. **The grep.** Met: `src/render3d/ladderpath.test.ts` case 1. It reads real import and export lines under `src/` against the deleted list, and checks that `kitunits.ts` imports no three and touches no DOM. `text` is rightly absent from its list.
3. **The routes.** Met. `ladderpath.test.ts` case 2 checks that `createMapRenderer3d` with no route throws `NO_CITY_ROUTE` before any WebGL context is made. The `plan3d.test.ts` digest is unchanged, and its routing case was rewritten to the new order.
4. **Tests go with their code.** Met for the files listed under *Deleted files* and for the (c) rows. For the (b) rows, see the next section; the polygon question is there.
4b. **Placeholders re-point.** Met. `placeholders.test.ts` has 2 cases on a typed `LOTS` fixture (8 lots per type plus a terrace lot). One checks the footprint, storeys and cap; the other checks that neighbours within `NEIGHBOUR_GAP` never share a variant, with `pairs > 20`. The rest of the file's ladder cases are gone.
5. **"ladder" leaves `ASSET_GALLERY_USES`.** Met. The `add("ladder", ...)` lines are gone from `assetcatalogue.ts`, and so is the ladder walk in its test. The sample use became "holdout" in the `assetGalleryPage` fixture and in "combines the filters". The `ladder` row is gone from `USE_LABELS`. Three `assetgallerylogic.test.ts` cases had their sample use changed. "reads every field" (line 70) was not in the ticket's line list, but it fails without the change. That makes 4 sample-use rewrites, within "at most 4".
6. **Guide and grammar.** Met. The ladder files' rows are gone from `numbers.md`. Elsewhere, citations of the deleted files became plain text, with a history note at the top of `numbers.md`. `decisions.md` is not touched. The `styleguide.test.ts` drift checks of deleted rows (OCCLUDE_SLOPE, pole-wood contrast, chapter 16's street-camera URLs) went with those rows.
7. **rules-coverage.** This is the architect's edit, and it is not on the builder's branch. The Relight row names 081 E2, but it still describes "037 C (the 3D view draws the Relight...)", a view this branch deletes. See could-improve 3.

**Test count.** The added lines hold 10 `it(` lines. Counting by body, as cases added or with changed assertions: 2 new (ladderpath), 2 re-pointed (placeholders), 4 sample-use swaps, and up to 7 more that only lost their ladder lines (2 in polygon, 1 in models, 2 in styleguide, 1 each in plan3d and tilecity3d). That is at most 15, and test policy rule 6 counts shrinking as removal. Within the cap.

**The polygon question (the caller asked me to judge it).** The four deleted `polygon.test.ts` cases were neighbour family, street repeat within `STREET_REPEAT_GAP`, `FAMILY_SHARE_MAX` and corner-only placement. All four test `pickBuildings` (`models.ts:651`) on `townLayout`'s lots. I followed the call chain on this branch:
- `pickBuildings` is called only from `buildingPlacements` (`models3d.ts:866`).
- `grep -rn buildingPlacements src` finds only its definition (`models3d.ts:855`). Its only caller was `applyModels`, which this branch deletes.
- `plan3d.ts`, `tilecity3d.ts` and `assetviewer.ts` import neither function.

So after this branch, no kept path calls the code those cases test. In substance they are (c) cases, not (b), even though the architect's table filed them as (b).

The neighbour rule as the game now draws it does have a pipeline test. `src/city/buildings/stage.test.ts` (around lines 207 to 221) checks that touching row neighbours never share a style, storey count or colourway, with more than 100 pairs. The failing-fixture case (lines 240 to 246) shows that one shared style fails R2. A pipeline style is the stack family that `stackStyleOf` maps a pick to, so this case holds "no neighbour with the same building family" for the pipeline's buildings. Street repeat and the share cap have no pipeline counterpart, but they were rules of the ladder's picker only. Corner-only placement has the pipeline's L1 and tight-corner checks in `src/city/buildings/check.ts`.

Making these cases (a) would put cap-counted tests on a function nothing calls, which test policy rule 1 counts against worth. I judge the deletion correct. The builder should still have stopped and reported, as the ticket's (b) rule says. The fix belongs in the report, not the code: name `stage.test.ts`'s row-neighbour case for the neighbour rule, and list the other three as (c) because `buildingPlacements` lost its only caller. Not a must-fix.

## Rule conflicts and risks
- **Out of scope: `src/city/mass/lots.test.ts`.** One import line changed (`TERRACE_BAYS` from `../../render3d/town` to `../buildings/constants`, the same `{min: 2, max: 4}`). A2c's Files says "Must not: `src/city/` ... If a deletion needs one of these, stop and report: that is a re-cut." The deletion does need this line, since the file would not compile otherwise, and the new import is the pipeline's own constant. But the builder made the change instead of stopping. See must-fix 1.
- `src/grid/`, `src/night/`, `puzzles/` and the GDD rules are not touched. No new dependency.
- Dead code is left in kept files: `buildingPlacements`, `pickBuildings`, `NEIGHBOUR_GAP`/`STREET_REPEAT_GAP`/`FAMILY_SHARE_MAX` (still used by `placeholders.ts`), `bandedStack`, `stepsPlacement`/`stepsGroup`, and `lotGap`'s remaining test. A2a's reach list did not name them, so criterion 1 did not require them gone. With their tests deleted, they are now untested code that nothing calls.
- The `stylepin.test.ts` change hard-codes `TERRACE_BAYS = { min: 2, max: 4 }` locally. That case pins the pipeline's table against the old path's, so it now compares against a literal, a weaker pin. `src/city/buildings/constants.ts` already holds the same typed-in copy.
- `powerkit.test.ts` now keeps `PHASE_OFFSET`, `SAG_RATIO` and a `sagSpan` copy locally to pin the kit "against the ladder's wire constants". It is a near-copy of deleted code, but small.

## Must fix
1. **`src/city/mass/lots.test.ts` is outside the ticket's Files ("Must not: `src/city/`").** The one-line import change is needed and correct, so the code stays as it is. The ticket's stop rule calls for a re-cut, so before merge the lead-architect adds that file's import line to A2c's Files, with a reason in one sentence. Effect: the branch's files match its ticket. No change to the code.

## Could improve
1. The builder's report should say what happened to the four (b) cases in `polygon.test.ts`: the neighbour-family rule is held by `src/city/buildings/stage.test.ts`'s row-neighbour case and its R2 failing fixture. The street-repeat, share-cap and corner cases are effectively (c), because `buildingPlacements` (`models3d.ts:855`), the only caller of `pickBuildings`, now has no caller.
2. Delete `buildingPlacements`, `pickBuildings`, `bandedStack`, `stepsPlacement` and `stepsGroup` and their constants, or have the ticket name which of them E1 and E2 reuse. They are unreached and now untested. This goes in a follow-up section, not this PR.
3. Architect: the rules-coverage Relight row still names "037 C (the 3D view draws the Relight from `relightT` only...)". That view is gone after this branch. Mark it as history or drop it, leaving 081 E2 as the 3D holder.
4. Record in the ticket that `text.ts` is kept because the tile sheet's labels use `createCaptionSprite`, and that `FOV_DEG`, `ELEVATION` and `scaleForPx` moved to `kitunits.ts`. Those names then have no Numbers row (`styleguide.test.ts` checks only the `TERRACE_`/`PARKING_`/`PLAZA_`/`ALLEY_`/`STREET_CAM_` names of `kitunits.ts`). Consider pinning them there.
5. `stylepin.test.ts`: import `TERRACE_BAYS` from `../city/buildings/constants` instead of a local literal. Then the pin compares two real tables, not a table and a comment.
