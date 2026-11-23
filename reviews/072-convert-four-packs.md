ticket: 072-convert-four-packs
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Give the converter a `pack.json` `"exclude"` (folders or single `.fbx` files, passed to the Blender script as `--exclude`), then use it to convert the four new Synty packs one at a time into `assets/private/out/`, leaving the four existing packs untouched, and report per pack.

Round 2. Round 1 had one must-fix: the conversions hadn't run. The code on the branch is unchanged (HEAD 45cf38b, the same single commit over 82ecb39), so the section A and E findings below are carried over from round 1. The new findings are for B and C, read from the outputs in `D:\rest-prototype-main\assets\private\out\` and the `pack.json` files under `assets/private/in/<pack>/`.

## Does the branch do it?
**A. The converter can skip folders and files.** Met (round 1, unchanged).
- `exclude` is passed sorted, after the scale overrides, and either slash is accepted. Test: "passes one --exclude per entry as an absolute path, sorted, after the scale overrides; either slash is accepted" (`tools/assets/convert.test.ts`, "Ticket 072" block).
- Each bad `exclude` gets a plain refusal before anything is spawned. Test: "refuses a bad exclude before spawning, in plain words".
- `listFbxStems` skips excluded paths, so a `scaleOverrides` key naming an excluded model fails with the existing error. Covered in the `scaleOverrides` test.
- `USAGE` documents `exclude`, and a test checks the text.
- Selftest: `convert_fbx.py` has `--exclude`, `is_excluded` and `find_fbx(indir, excludes)`. The fixture has `Fbx/Excluded/excluded_box.fbx`, and "checkSelftest fails when the excluded box reaches the report" covers the new check.
- Without `exclude`, the arguments are the same as before. One existing test expectation changed (the selftest now passes its excluded folder), which is right.

**B. Per-pack setup.** Met.
- The `in` junction is in the 072 worktree, where the runs happened, and it lists all nine packs. The ticket named a junction in `rest-prototype-goal`, but the worktree that actually ran needed it, and every existing pack's manifest entry survived the runs. That shows the `readPriorPacks` risk was covered.
- Each `pack.json` has the ticket's starting `textures` and `exclude` values. The excludes worked: the manifest entry counts match the ticket's model counts exactly (sci-fi-city 602, palm-city 1101, sci-fi-frontier 512, nature 202). No `*_Collision`, demo scene or `Source_Files/Characters/` model is in any report.
- Scale: no pack has a `"scale"` key, and every report says scale 1. Scale-suspect counts are 13/602, 4/1101, 4/512 and 2/202, far below the ticket's 10% trigger. Most suspects are skyboxes, cloud and fog rings, dunes, long cable runs and empty light-ray stubs, not 100x mistakes. The one real 100x outlier is Palm City's `SM_Veh_Juice_Cart_01` (143 x 187 x 242). It is a single model, so no rescale was due.
- Aliases: the ticket capped aliases at 20 models per pack. Josh lifted that cap in chat on 21 Nov 2026 ("Yes", to "Do you want me to add the aliases and re-run each pack once?"). That is his word, so the second run per pack is in order. Each alias points at an albedo atlas or image, never at `Normals/` or `Emissive/`. Sci-Fi City's targets agree with its `MaterialList_PolygonSciFiCity.txt`, where almost every line is `PolygonScifi_01_A`. Palm City's and Frontier's main atlases do live in `Textures/Alts/`, so those targets are the right files.
- The models still untextured are mostly emissive or overlay sources (`Signs_Emission.psd`, `Neon_Animation.psd`, `Building_Window_Emissive.psd`, `Concrete_Overlay.png`) and a few `lambert*` materials. Leaving those unaliased follows the ticket's "albedo images only" rule.
- Frontier's 49 `textureOverrides` (the hand-back said 47) pin ground and plant models to `Textures/Ground/*` and one `Plants/Clover`. The ticket's alias rule doesn't cover this key. It is an existing converter key, though, used for exactly this kind of model, so I count it as config inside the ticket's not-in-git files, not as a rule break.

**C. The runs.** Met.
- `manifest.json.bak-072` exists, written at 18:47, before the first new GLB.
- Each new pack has `out/<pack>.glb` and `out/reports/<pack>.json`, all with 0 failures.
- The manifest lists all eight packs. I compared the four old entries with the backup. `apocalypse-power`, `simple-town` and `town-pack` are byte-identical once serialised. `city-pack` is identical once keys are sorted, and only its key order differs (could improve 2).
- The existing GLBs and reports are untouched: apocalypse-power, simple-town, city-pack and town-pack all still carry their 17 Nov times. So are `out/city-pack/colourways/` (18 Nov) and `assets/private/calibration/` (17 Nov).
- I couldn't check from files whether the runs went one at a time. The GLB times (19:51, 19:55, 19:56, 19:57) step in the ticket's order, which fits.

**D. The report.** Can't tell from the branch; it lives in the builder's hand-back. The reports hold everything it needs (counts, warnings, bounds). Bounds for 071 look plausible in metres: Palm City power boxes are 0.3 to 1.3 m, and Frontier's `SM_Prop_Cable_*` pieces are 1 to 4 m. Not a branch blocker.

**E. Nothing else moves.** Met. The diff touches only `tools/assets/convert.ts`, `tools/assets/convert.test.ts`, `tools/blender/convert_fbx.py` and `tools/blender/README.md`. No `src/` file changes and no dependency is added. The gate is green at 4198.

## Rule conflicts and risks
- No hard-rule conflicts. The work stays in `tools/` and gitignored assets, with no `src/grid/` or `src/night/` change and no GDD rule involved.
- Palm City's 7 aliases all point at `Alts/PolygonPalmCity_01_A.png`, so about 30 models with their own materials get the main atlas. This covers ramps, flags, bunting, shade sails, light strings, the police station and character-camera sources. Their UVs are laid out for other images, so they may show wrong colours. Josh's optional gallery check (`gallery=palm-city-pack`) is where this shows. Nothing in game code reads these packs yet.
- Sci-Fi City aliases `PolygonCity_Texture_01_A.png` to its own Sci-Fi atlas. Pieces carried over from POLYGON City may look off-palette for the same reason.
- Three character FBX are inside the model folders and were converted: Sci-Fi City `Characters`, Palm City `PalmCityCharacters` and `PalmCityBRCharacters`, and Frontier `*_Characters`, `*_BRCharacters` and `*_MiniCharacters`. The ticket's exclude values didn't list them, and its model counts include them. That is per the ticket, but it goes against the spirit of Q2 ("skip characters").
- The TS/Python case mismatch from round 1 still stands (TS compares exact strings, Python uses normcase). The real `pack.json` files use the on-disk case, so nothing hits it.

## Must fix
none

## Could improve
1. Make the TS side match the Python on Windows case: compare normcased paths in `listFbxStems` and in the duplicate check in `readPackSettings` (`tools/assets/convert.ts`). Carried over from round 1.
2. The manifest merge re-serialised `city-pack` with a different key order. The ticket's after-run check says "identical", and a strict string compare would have flagged it and stopped the runs. If the converter wrote prior entries through unchanged (or always sorted keys), the check could be a plain string compare. That would be a `tools/assets/convert.ts` change for a later ticket.
3. The packs' in-folder character FBX (listed under risks) could go into each pack's `exclude` on a later reconvert, if Josh confirms Q2 covers them too.
4. `checkSelftest` could also confirm `excluded_box` is absent from the GLB's node names, to match the ticket's "the GLB or the report" wording literally. Carried over from round 1.
5. The Vitest test that asserts source strings in `convert_fbx.py` (`def is_excluded(...)`, `find_fbx(indir, excludes)`) guards against renames, not behaviour. Carried over from round 1.
