ticket: 081x2-drop-2d-ui
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section X2: remove the 2D map's leftovers from `src/ui/` and `src/main.ts` (`collectMaps`, `MapEntry`, `MapCollection`, `wants3d`, `NO_CITY_FORM_NOTICE`, `PuzzleKind` and their 7 cases), move `main.ts`'s imports to `src/render3d/maprender` and `relightplan`, and make the build load only city puzzles. Count: 0 added, at most 2 rewritten, about 7 removed.

## Does the branch do it?
I judged the diff against `origin/main` (80ca9bc, X1a merged), which is the single commit a9f01f3: 6 files, all in `src/ui/` and `src/main.ts`.

1. **Removed.** `src/ui/maps.ts` no longer has `collectMaps`, `MapEntry`, `MapCollection` or `LOCKED_PATH`, and `collectCityMaps` is unchanged. `src/ui/view3d.ts` no longer has `wants3d`, `NO_CITY_FORM_NOTICE` or `PuzzleKind`, and `pageView` stays. The tests lose the 5 `collectMaps` cases (`maps.test.ts`) and the 2 `wants3d` cases (`view3d.test.ts`), 7 in all. Nothing under `src/`, `tools/` or `tests/` still names a removed symbol (I grepped for it). `main.ts` has no schematic-only branch left: every path goes through `collectCityMaps`, `loadCityView` and `pageView`. Met.
2. **Imports.** `main.ts` imports its types from `./render3d/maprender` and `planRelight` from `./render3d/relightplan`. No file in `src/ui/` and nothing in `main.ts` imports `src/render/`. Both new modules import only types from `../core` and `../grid`, so moving the import does not load three.js early into the gallery's path. The gallery test's `"./render3d"` regex still holds. Met.
3. **The glob.** The ticket says `../puzzles/city/*.city.json`; the branch uses `../puzzles/city/**/*.city.json`. Today the two list exactly the same files: `puzzles/city/` has no `locked/` folder, only the 17 flat `*.city.json` files (P0 and the 16 pilots). The criterion's other half, "the picker lists the same city puzzles as before", is better kept by `**`. Before this branch the glob was `puzzles/**/*.json` and `collectCityMaps` read `puzzles/city/**`, locked copies included (U1's `CITY_LOCKED_PATH` and its "locked ones after" case). The flat glob would quietly drop a future `puzzles/city/locked/` copy and leave U1's locked handling dead. The rule that `puzzles/locked/` is never edited is not touched: listing a locked file is a read, and the glob does not reach the schematic `puzzles/locked/` at all. I take this as meeting the criterion's intent; the wording is noted below. The U1 picker cases pass unedited.
4. **The gallery word list.** `assetgallery.test.ts` asserts that `createMapRenderer` is *not* in the gallery branch, not that it exists, so the file needed no edit and has none. Met.
5. **Browser.** This is Josh's to check.

**Tests.** 0 added, 0 rewritten, 7 removed, inside the count. I ran `npx vitest run --maxWorkers=2 src/ui/maps.test.ts src/ui/view3d.test.ts` and all 4 remaining cases passed in 0.65 s. The `shrine` import in `maps.test.ts` is still used by the "lists only city files" case.

## Rule conflicts and risks
- No hard-rule break: `src/grid/`, `src/night/`, `src/render/`, `src/render3d/`, `src/play/` and `puzzles/` are untouched, and there is no new dependency.
- The branch name `ticket/081x2-drop-2d-ui` differs from the ticket's `ticket/081x2-ui-2d-out`. This is cosmetic.
- The glob differs from criterion 3's literal text (see above). It is harmless today, and it keeps U1's locked-city behaviour.

## Must fix
none

## Could improve
1. Ask the architect to change X2 criterion 3 (and R1 criterion 1, which uses the same `puzzles/city/*.city.json`) to `puzzles/city/**/*.city.json`. Otherwise the harness and the page could disagree once a city puzzle is locked under `puzzles/city/locked/`.
