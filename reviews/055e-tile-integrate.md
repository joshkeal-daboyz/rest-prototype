ticket: 055e-tile-integrate
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section E wires B's pure helpers into the drawn tile city: keep-outs and bay meters into `applyModels`, the run frame into `dressSites` and R10, lot and plaza cells drawn. It also puts the C builder's GLB facts into the code (3 bays per parking tile, a 0.23 m walk, a yellow centre line), makes the sheet a readable grid, and makes `light=day` work on every tile-view URL. None of this may change the ladder maps.

## Does the branch do it?
I reviewed `goal/city-style...1027153` (8 files, all in E's Files list; `renderer.ts`, `town.ts`, `furniture.ts`, `dressing.ts` and `streetcam.ts` are untouched). `tsc --noEmit` is clean. The six touched or related suites pass (191 tests), and the main session's gate is green.

- **23 Furniture on the drawn city.** Met. `applyModels` takes a new optional third argument, `ApplyOptions` (`keepPoints`, `keepRects`, `furnitureFilter`, `furnitureLevels`), in `models3d.ts`. `cityApplyOptions(city)` in `tilecity3d.ts` passes `tileKeepouts` and `bayMeters`. `tileintegrate.test.ts` "places exactly bayMeters(furnitureLayout with the tile keep-outs)…" checks deep equality on the default city and seeds 1 to 2. It also checks every pavement piece against the pavement cell, the frame lines, `FURN_KEEP_M` from slots, kerb cuts and corners, and meters beside a bay. The next test shows the options actually change the result. The puzzle path passes nothing. With `opts = {}`, `input` is `base`, there is no filter, and `furniturePlacement` falls back to `PAVEMENT_Y / WORLD_PER_METRE`, which is the same arithmetic as before. The test on 09, 64 and 01 checks that `applyModels` equals the pure layout of its own input.
- **24 Dressing reads the frame.** Met. `dressSites` gains a `frames` map and puts `frame` inside `run` (only when one exists, so ladder sites have no `frame` key at all). The top-level `frame` stays the stack placement frame. `applyModels` builds the map from `slots.blocks.terraces`, which `buildCityScene` fills (line 533). Tests check that `run.frame` equals `TerraceRun.frame`, that awnings reach past 3.03 m and stay within 5 m less `AWNING_KERB_M`, and that on the three protocol maps the sites and `dressTown` are deep-equal with and without the map.
- **25 R10 reads the frame.** Met. The `citymetrics.ts` diff is exactly the two `?? KERB_M` / `?? WALL_EDGE_M` reads, and `citymetrics.test.ts` is not edited. The R10 test runs all 11 cities (default plus seeds 1 to 10) with furniture: spacing and keep-out violations are 0, every other R check passes, and R7 is held to B's agreed `TILE_CITY_R7_MIN`. A second test shows the kerb line actually moves (a 3 m shift is fine with a frame and fails without one).
- **26 Lot and plaza cells drawn.** Met. Instance counts include lot cells under `Road_Bare_01` and plaza cells. With no pack, lot cells become road quads and plaza cells become pavement boxes. The no-coplanar test finds every parking or plaza piece at least 0.005 m above its surface (yard layer 2.2 cm, plus 1 cm for a flat piece).
- **27 Bays per parking tile.** Met. `BAYS_PER_PARKING_TILE = 3`. The test uses the divider fixture `[-5, -1.75, 1.6, 5]` and checks three bays per tile, each `2 x TILE_M / 3` wide and within 0.2 m of the divider midpoints, on more than 50 tiles. `CITY_BAYS_PER_BLOCK_MIN` stays 4, and `tilecity.test.ts` (criteria 5 and 11) passes unedited.
- **28 The walking level.** Met. `SIDEWALK_WALK_M = 0.23`, `SIDEWALK_TOP_M` stays 0.3, and `TILE_WALK_M` is empty with the measurements written in its comment. `tileLevelY_m` puts the carriageway at -0.23, sidewalk pieces at -0.23 (walk at 0, lip at 0.07), and the lot surface at 0. The code-drawn box runs from -0.23 to 0. The criterion-14 tests in `tilecity3d.test.ts` are updated to these numbers. The kerb-face position is recorded in the `TILE_FRONTS` comment: 0.67 m inside the cell edge. That is more than 0.1 m, so the builder's report must list it as a re-cut item (main session: check that it does). The real-GLB level check is inside an `it` and returns early when the GLB is absent.
- **29 The centre line.** Met. Lane keys are now `Road_YellowLines_01/02` with turns 270 and 90, and `Road_Lines_01/02` are in `TILE_SHEET_EXTRA`. The test checks `isNeverUsed` is false for both keys. A geometric test on three cities (more than 300 lane cells) puts each cell's yellow edge on its street's centre line, with both variants present on every street. The yellow-strip side check against the real GLB is in `tileslots.test.ts`, behind `existsSync`. Criterion 14's manifest check picks up the new keys through `TILE_SLOTS`.
- **30 Readable sheet and daylight.** Met. The sheet is now a grid (`sheetLayout`: 4 columns in a wide window, 3 numbered columns in a tall one), framed by `createCityRig`, with the rig's insets widened for the labels and legend.
  - The gap test checks at least `TILE_M` between every pair of footprints at four aspect ratios, and the frame is within 1.5 : 1.
  - The overlap test runs at 1280 x 720 and 390 x 844, with and without the pack. It projects each label and footprint and checks for label/label and label/footprint overlap and for anything outside the insets. Its text surface measures 0.6 em per character, which errs on the wide side.
  - Daylight: the renderer adds one `HemisphereLight` for `light=day` (`addDaylight`) and calls `createStreetView` with `day: false`, so the street view adds no second light. The sheet adds its own when `day` is set.
  - Tests run five URLs, with and without `light=day`, through the real `createCityRenderer3d`. The overhead view, `cam=street run=0`, `run=1&at=0`, `blocks=5x4&seed=2` and the sheet each have exactly one light at `STREET_CAM_DAY_INTENSITY` with the flag and none without it. The no-row fallback has one, and the log line is checked. Default night lighting is checked too.
- **31** is the main session's eye check, so I did not judge it.
- **32 Street camera on the tile city.** Met. `createStreetView` on `city.town` returns a view for run 0 and run 1 on all 11 cities, with no "no row" line. `streetcam.ts` is not in the diff.

Builder's claims:
- **Near-plane fix.** `createCityRig.apply()` sets `camera.near = max(0.1, dist * CITY_NEAR_FRACTION)` before `updateProjectionMatrix()`, and it runs on every zoom and pan. The test checks the near plane over six zoom steps on 1x1, 3x3 and 6x6 cities, and checks that the depth resolution is under a quarter of a 1 cm lift. The rig serves only the tile view, so the ladder is unaffected.
- **Single owned HemisphereLight.** Confirmed as described above. It is removed and disposed in the renderer's `dispose`, and the sheet's light is disposed in `sheet.dispose`.
- **Sheet overlap test.** Confirmed as described above. It is real projection geometry, not a check of the code's own output.

Ladder paths with no frame: `dressSites` (empty map), `furniturePlacement` (no levels), R10 (the `??` fallbacks) and `applyModels` (no opts) all reduce to the previous expressions. The eight criterion-9 suites are not in the diff.

CI safety: no asset reads at describe level. The top-level `await loadModels` uses an in-memory fake. The GLB reads are inside `it` behind `existsSync`. Paths use `join` with relative segments. The only timer is a `setTimeout(…, 0)` used to flush the load promise, with no assertion on time.

Criterion 18: `renderer.ts` is unchanged. The new code is in `tilecity3d.ts` and `tileslots.ts`, which only the DEV branch reaches. The `models3d.ts` additions are generic optional parameters, and no new `tile city:` or `city=tiles` string reaches the puzzle path. The main session's `npm run build` check still applies.

## Rule conflicts and risks
- None against the hard rules. `src/grid/` and `src/night/` are untouched, there is no new dependency, and every file is in E's list.
- On this gate machine the real-GLB checks return early (no `assets/private`). I could not confirm the yellow-strip side, the 0.23 m walk or the kerb-face figure against the geometry. They rest on the builder's run with the assets present.
- On `4d952c6` the overhead branch already added the same light at the same intensity when `cam=street` was absent. If the main session saw the overhead view dark on a URL without `cam=street`, this fix (same light, same intensity) may not change what it sees. The tests prove exactly one light, not a visibly lit view. Criterion 31's eye check should confirm "light=day visibly lights the overhead view", and the builder's report should state the cause as the ticket asks.
- The kerb face is 0.67 m inside the cell edge, and the tile's apron rises back to the walk level at the cell edge. That is a 0.23 m step down into the carriageway at the cell edge, past the visible kerb. Criterion 31's "the kerb lip reads as a kerb" should look at this. Per criterion 28 it is a re-cut item, not a fix in this section.

## Must fix
none

## Could improve
1. `tileintegrate.test.ts` "does not edit streetcam.ts" only matches a regex in `tilecity3d.ts`. It does not test what its name says. Rename it to describe what it checks (the tile view calls `createStreetView` with `day: false`), or drop it; the `git diff` check covers "not edited".
2. In the tile city, non-flat lot and plaza furniture stands at the ladder's yard level, 2.2 cm above a lot surface at 0 (`TILE_FURNITURE_LEVELS` sets only `pavement_m`). That is invisible at play distance, but `yard_m: 0` would seat non-flat pieces exactly. Flat pieces keep their 1 cm `GROUND_LIFT_M` either way, so they still clear the 0.005 m rule.
3. `buildSheetScene` builds its daylight inline instead of with `addDaylight`. That is two places to keep in step for colour and intensity.
4. `vi.spyOn(console, "info")` in the daylight `describe` is never restored. It is harmless in an isolated file, but `afterAll(() => info.mockRestore())` is tidier.
5. The criterion 23 deep-equality test covers 3 of the 11 cities. The R10 test covers all 11, so coverage is adequate, but the full equality check is cheap to extend if the 120 s budget allows.
