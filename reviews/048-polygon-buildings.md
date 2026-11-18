ticket: 048-polygon-buildings
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Put the POLYGON Town Pack's whole houses (and any City Pack names Josh confirmed whole) into `MODEL_TABLE` ahead of SIMPLE Town, with Josh's calibrated doors promoted into `BUILDING_FRONTS`. Each lot type switches to POLYGON only when it reaches `POLYGON_MIN_FAMILIES`, and otherwise keeps SIMPLE Town, never mixing the two. A checkout with no packs, or a failed POLYGON GLB, must give exactly today's town. The guide has to follow.

## Does the branch do it?
- **Table rows.** `models.ts` adds one `town-pack` row with `SM_Bld_House_Preset_01` to `_11` and `_Garage_01`, placed before the four SIMPLE Town rows, which are now `fallback: true`. There is no City Pack row, which is right: no City Pack door was calibrated and Josh named none whole (Q2 default). The Church, City Hall, GardenShed, Shop_01/02 and the modular patterns are kept out. Tests: `polygon.test.ts` "MODEL_TABLE building rows (048)", three `it`s. Met.
- **Fronts.** I compared the 14 `town-pack:` lines with `D:\rest-prototype-048\assets\private\calibration\fronts.json` (savedAt 2026-11-18T03:10:05.703Z). They match line for line: Church +z; Presets 01 -x, 02 -z, 03 -x, 04 -x, 05 -x, 06 +x, 07 -z, 08 -x, 09 -x, 10 -z, 11 -z; Garage_01 -z; Shop_01 +z. The file has no Shift+click exclusions, and `BUILDING_EXCLUDE` is still only `simple-town:store_small_mesh` (047 kept). `savedAt` appears in the code comment and in guide chapters 6 and 15. Tests: "the promoted fronts" (`JOSH_FRONTS` listed in the test, a front for every row name, exclude unchanged). Met.
  - Flag 2 (Church and Shop_01 fronts with no row): AC 2 says the town-pack lines equal the values promoted from the saved file, which has these two in it. Promoting them is correct. Leaving them out of rows follows Q3 and finding 1 (Shop_* is modular), and the comment says so.
- **Lot types.** "puts each new name in the lot type listed" checks `lotTypeOf` against `POLYGON_TYPES`, which was worked out from fixture bounds and Josh's fronts. 08 at -x is 18.9 m across, so over house's 16 m, so large. 11 is 18.2 m wide, so large. Met.
- **Per-type switch and no mixing.** `buildingPlan` counts `pack:family` per type after exclusion and compares the count with `POLYGON_MIN_FAMILIES`. Tests cover: small and house go Town Pack while large and tall stay SIMPLE; one style per type; threshold edges (excluding 01 drops small to SIMPLE; house holds at 4 families and drops at 3); and families counted rather than names. Met.
  - Flag 1, the extra rule (a type with no SIMPLE Town model loaded keeps its POLYGON ones however few). It departs from the Interfaces line "else the fallback names", but it only changes anything when the fallback set for a type is empty. That happens only when simple-town is missing or failed while town-pack loaded. There the old result would be placeholders, and it still never mixes styles. It is not a rule break and the guide documents it. I list it under Could improve so Josh sees it.
- **CI / failed-GLB equality.** "with no POLYGON pack the town is exactly today's SIMPLE Town town" rebuilds the old table (town-pack row removed, `fallback` stripped). It pins the plan's sizes as 9/16/9/3 and compares plan and picks on every map for (a) a SIMPLE-only manifest and (b) `loadModels` with `town-pack.glb` throwing 404. Met. `models3d.ts` needed no change.
- **Variety on the POLYGON fixture.** There is a separate describe, so the SIMPLE Town tests were not loosened. It checks families per type, neighbours (more than 1000 pairs), street repeat (more than 1000 checks), the share cap and determinism. Met, with one small gap: determinism and "no null" run on maps 09 and 56 only (Could improve 2).
- **Families never span packs.** Equal-bounds fixtures in packs `one` and `two` get different families, and in one pack they are one family. Met.
- **Corner rule.** No town-pack front has `corner`, and no planned Town Pack model is a corner model. A fixture with Preset_03 flagged `corner`, `open: -x` is placed at least once and only on lots whose `cornerSides` has -x. Met.
- **Unique names.** "has unique building names across packs". Met.
- **Style guide.** Chapter 5 has the Default and Info lines for the fallback and thresholds. Chapter 6 has the fronts table rows, with the -z defaults named in an Info line. Chapter 7 has the Q5 Default. Chapter 13 has town-pack "in use", city-pack still "converted, not used" (correct, nothing adopted) and the Open line narrowed. Chapter 15 step 5 describes the promotion. The Numbers table has four `POLYGON_MIN_FAMILIES.*` rows, and `styleguide.test.ts` REQUIRED now lists them. Met.
  - Flag 5: the new lines are tagged Default (048 Q1 to Q5), not Decided. That is correct: the ticket says defaults apply on approval, and Josh gave no words on Q1 to Q5.
- **Changed old tests.** `calibration.test.ts` and `facing.test.ts` now filter to `simple-town:` keys, so the 39 old lines stay pinned exactly.
  - Flag 3: the reworded manifest check in `models.test.ts` ("each planned model fits some type, no type mixes styles, each type has 3 or more") is honest, given 08 and 11 are deliberately unplaced.
  - Flag 4: the `_Preset_` ban is lifted only for `town-pack`. `polygon.test.ts` separately pins the town-pack names to `^SM_Bld_House_Preset_(\d\d|Garage_01)$`, and the apocalypse-power ban still holds. Both acceptable.
- **No private files.** `git ls-files assets/private` is empty, and `fronts.json` is ignored by `.gitignore:16`. I did not check `dist/` (the main session's check).
- **CI-safe.** `polygon.test.ts` reads nothing under `assets/`, only `puzzles/` (in repo) at module level, and has no Windows paths. The manifest read in `models.test.ts` stays inside an `it` with an `existsSync` skip. I ran `polygon.test.ts` alone: 24 passed.
- **Files.** Only the allowed files are touched (`models.ts`, four existing tests, the new `polygon.test.ts`, the guide). There is no `src/grid/` or `src/night/` change, no new dependency and no schema or event change.

## Rule conflicts and risks
- None against hard rules or Decided GDD rules.
- The extra empty-fallback rule (flag 1) is a small departure from the Interfaces wording. Its effect is limited to a broken or partial local asset set.
- The 114 MB `town-pack.glb` load stays Josh's check (Q6). Nothing in code mitigates it, and the ticket says none should.

## Must fix
none

## Could improve
1. `src/render3d/models.ts` `buildingPlan`: the "keep POLYGON when there is no fallback" clause goes beyond what the Interfaces section asked for. Either put it to Josh as a one-line question, or drop the `|| simple[t].length === 0` term so the code follows the ticket's wording. Dropping it changes nothing on CI or on Josh's PC with both packs.
2. `src/render3d/polygon.test.ts` "is deterministic and leaves no lot bare": it runs on maps 09 and 56 only, while the AC says every map. Removing the `/09-|56-/` filter would match the criterion. The neighbour and street tests already go through every map's picks.
3. `src/render3d/models.test.ts` line 110: the town-pack exemption could be narrowed to `SM_Bld_House_Preset_`, so a future baked-wire `_Preset_` name in the Town Pack would still be caught here as well as by `polygon.test.ts`.
