# 048 · The town's houses and shops come from the POLYGON packs (first slice: whole buildings only)

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open. Waits for the precondition below, then G1.
branch: `ticket/048-polygon-buildings`

## Josh's words
> "SIMPLE town was a test, the city stuff is higher detail" (17 Nov 2026, 043 Q4)
> "what about the video rental store, ignore it... it's part of the small package. The polygon buildings are much higher quality" (18 Nov 2026)

## Precondition (Josh, before the build starts)
1. **Josh calibrates the Town Pack's doors in the gallery:** `npm run dev`, then `/?puzzle=09-shrine-circuit&view=3d&gallery=town-pack`. Click the door of each of `SM_Bld_House_Preset_01` to `_11` and `SM_Bld_House_Preset_Garage_01`. Shift+click any he never wants placed. Do the same for the City Pack candidates in the table below (`&gallery=city-pack`) that he considers whole buildings. Skip a candidate that is a piece of a tower, or Shift+click it.
2. Calibrate in the checkout the builder will read (default `D:\rest-prototype`). The dev server writes `assets/private/calibration/fronts.json` under the folder it serves from. On 17 Nov 2026 no checkout had this file yet.
3. Josh says in chat that the Town Pack (and which City Pack names) are done. This is the "a promotion ticket is cut only when you say a pack is done" condition from 045's approval (section D dropped).

## Findings (checked against `main` at `1155417` and the local manifest, 17 Nov 2026; no browser)

### 1. What the packs offer whole, and where each would stand
Sizes are width (x) x height x depth (z) in metres, from the manifest's bounds. Lot types are worked out at a "+z" or "-z" door. A quarter-turn door (`+x`/`-x`) swaps width and depth, so the real types follow Josh's calibration, and `lotTypeOf` computes them. Nothing is hand-set. Lots (`LOT_TYPES`): small 12 x 13 (12 m cap), house 16 x 19 (15), large 25 x 28 (16), tall 14 x 16 (28).

| Pack | Name | Size (m) | Lot at +z | Note |
| --- | --- | --- | --- | --- |
| town-pack | `SM_Bld_House_Preset_01` | 6.4 x 5.8 x 8.9 | small | |
| town-pack | `SM_Bld_House_Preset_02` | 5.7 x 4.1 x 5.7 | small | very small for a 12 x 13 lot |
| town-pack | `SM_Bld_House_Preset_03` | 13.9 x 6.5 x 13.9 | house | |
| town-pack | `SM_Bld_House_Preset_04` | 13.5 x 6.5 x 13.9 | house | |
| town-pack | `SM_Bld_House_Preset_05` | 8.9 x 6.5 x 13.9 | house | 13.9 deep is over small's 13 |
| town-pack | `SM_Bld_House_Preset_06` | 11.4 x 6.4 x 13.9 | house | |
| town-pack | `SM_Bld_House_Preset_07` | 13.2 x 7.7 x 13.9 | house | |
| town-pack | `SM_Bld_House_Preset_08` | 13.9 x 6.4 x 18.9 | house | |
| town-pack | `SM_Bld_House_Preset_09` | 8.9 x 8.7 x 11.4 | small | |
| town-pack | `SM_Bld_House_Preset_10` | 13.5 x 8.7 x 8.5 | house | house at a quarter turn too |
| town-pack | `SM_Bld_House_Preset_11` | 18.2 x 9.4 x 13.5 | large | house at a quarter turn |
| town-pack | `SM_Bld_House_Preset_Garage_01` | 6.4 x 5.7 x 8.9 | small | |
| town-pack | `SM_Bld_Church_01` | 10.4 x 16.5 x 14.4 | tall | 042 E's sacred-place landmark (Q3) |
| town-pack | `SM_Bld_GardenShed_01` | 2.3 x 2.8 x 2.5 | small | prop-sized; left out |
| city-pack | `SM_Bld_OfficeOld_Small_01`, `_02` | 11.1 x 25.2 x 11.2 | tall | two meshes (11 700 and 3 560 triangles) |
| city-pack | `SM_Bld_OfficeOctagon_01` | 20.5 x 15.0 x 20.5 | large | |
| city-pack | `SM_Bld_OfficeRound_02`, `_04` | 22.0 x 9.0 x 22.1 | large | may be the base of `_01`/`_03`; whole only if Josh says so |
| city-pack | `SM_Bld_OfficeSquare_02`, `_04` | 15.0 x 9.0 (7.5) x 15.0 | house | may be segments of `_01`/`_03`; whole only if Josh says so |
| city-pack | `SM_Bld_CityHall_01` | 20.1 x 8.7 x 17.6 | large | 042 E's hall landmark (Q3) |
| city-pack | `SM_Bld_OfficeSquare_01`, `_03` | 15 x 30 x 15 | none | over the tall cap |
| city-pack | `SM_Bld_OfficeRound_01`, `_03` | 22 x 38.4 x 22 | none | |
| city-pack | `SM_Bld_OfficeOld_Large_01`, `_02` | 16.1 x 25.3 x 16.1 | none | too wide for tall, too high for large |

`SM_Bld_Shop_*`, `SM_Bld_Apartment_*`, `_Stack_*`, `SM_Bld_Station_*` and the covers and fire escapes are modular pieces. They are out of this slice.

### 2. Family counts per lot type, Town Pack alone
small 4 (`01`, `02`, `09`, Garage), house 7, large 1 (`11`), tall 0 (the Church is held back). The variety tests require at least 3 families in every type, and 4 in small, house and large. So Town Pack alone can take small and house. Large needs the City Pack candidates (Octagon, Round_02/_04) to reach 4. Tall has at most the two OfficeOld_Small meshes, which is below 3.

### 3. The town must still work without the packs
CI and a fresh checkout have no `assets/private/`. Today a pack whose GLB is missing just drops its models. If the POLYGON rows simply replaced the SIMPLE Town rows, the town on CI would fall back to placeholder boxes. So the SIMPLE Town rows stay in `MODEL_TABLE` as the fallback, type by type (Interfaces).

### 4. Names are bare inside the plan
`BuildingPlan`, `traitsOf` and `models3d.ts`'s `byName` key buildings by bare `entry.name`. Across the manifest, the only cross-pack duplicates involve `apocalypse-power` (for example `SM_Bld_Church_01`, `SM_Bld_Apartment_01` and the road tiles), and that pack supplies no buildings. None of the town-pack, city-pack and simple-town building names above collide. A uniqueness test keeps it that way. Re-keying the plan by `pack:name` is out of this slice.

### 5. Load size
`town-pack.glb` is about 114 MB, because the converter has no include filter (guide chapter 15). The 3D view would fetch all of it to use 12 models. `city-pack.glb` is about 23 MB.

## Goal
On Josh's PC, the 3D town's small and house lots (and large and tall, where Q1 allows) show POLYGON Town Pack houses, and City Pack offices where he named them whole. Each stands at true scale and faces its road with the door he clicked. The family, neighbour, street-repeat, share-cap and corner rules hold as before. On CI and a fresh checkout, with no private assets, the town is exactly today's SIMPLE Town town.

## Acceptance criteria
All Vitest tests use fixture entries, with names and bounds typed in as numbers the way `facing.test.ts`'s `SIZES` does. No test reads `assets/private/` at module or `describe` level. Any manifest check stays inside an `it` and is skipped when the file is absent.

- [ ] (Vitest) `MODEL_TABLE` has building rows for `town-pack` (`SM_Bld_House_Preset_01` to `_11` and `SM_Bld_House_Preset_Garage_01`) and for the `city-pack` names Josh confirmed whole. Each POLYGON row sits before the SIMPLE Town rows. `SM_Bld_Church_01`, `SM_Bld_CityHall_01`, `SM_Bld_GardenShed_01` and every modular piece are in no building row (Q3 default).
- [ ] (Vitest) Every `pack:name` in a building row has a `BUILDING_FRONTS` line. The town-pack and city-pack lines equal the values promoted from Josh's saved file, which the test lists. The models he Shift+clicked are in `BUILDING_EXCLUDE`. The code comment and the guide give the file's `savedAt`.
- [ ] (Vitest) `lotTypeOf` with the promoted fronts puts each new name in the type the test lists. The builder works that list out from the fixture bounds and Josh's fronts. A name that fits no type is not in the table.
- [ ] (Vitest) Per lot type: `buildingPlan` returns that type's POLYGON names when, after exclusions, they reach `POLYGON_MIN_FAMILIES` for the type. Otherwise it returns that type's SIMPLE Town names (the fallback rows). It never mixes the two within one type (Q1 default).
- [ ] (Vitest) With a manifest that has no `town-pack` or `city-pack` (the CI case), and with one whose POLYGON GLB fails to load, the plan and the picks on every map equal today's SIMPLE Town plan and picks exactly. The test pins this against the current fixture.
- [ ] (Vitest) On the POLYGON fixture plan, over every map, the existing variety tests pass: families per type, no two neighbours of one family, no family back within `STREET_REPEAT_GAP` on one road side, the `FAMILY_SHARE_MAX` cap, and determinism with no null pick where the type has models. They run as a second fixture, not by loosening the SIMPLE Town tests.
- [ ] (Vitest) Mesh families never span packs. Two fixture entries with equal bounds and triangles in different packs get different families.
- [ ] (Vitest) Corner rule: no POLYGON model is `corner: true` unless Josh named it one (Q5 default: none). A fixture POLYGON model flagged `corner` still lands only on a lot whose `cornerSides` has its `open` side, and never mid-row.
- [ ] (Vitest) Building-row names are unique across packs in `MODEL_TABLE` (finding 4).
- [ ] (Vitest) `styleguide.test.ts` is green with the guide updated:
  - chapter 5: the per-type fallback and `POLYGON_MIN_FAMILIES`;
  - chapter 6: the promoted fronts table rows;
  - chapter 7: no POLYGON corner model;
  - chapter 13: `town-pack`'s status becomes "in use" and `city-pack`'s becomes "in use (whole buildings only)" if any of its names are adopted; the 043 Q4 Open line is narrowed to what Q1 to Q4 leave open;
  - chapter 15: step 5 says how fronts were promoted;
  - a Numbers row for each `POLYGON_MIN_FAMILIES` value.
- [ ] (Main session check) `git ls-files assets/private` is empty, and `npm run build`'s `dist/` has no `.glb`, `manifest.json` or `private` path (039's check).
- [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser. The builder reads `assets/private/calibration/fronts.json` and the manifest to promote values, and writes nothing under `assets/`.
- [ ] (Josh checks) `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d`. Then `/?puzzle=64-the-whole-chain&view=3d`, a large map near the end of the ladder.
  - Small and house lots show Town Pack houses, each facing its road. `&fronts=1` arrows point out of the doors.
  - No building overhangs its lot or a pavement.
  - Lot types that kept SIMPLE Town are as before.
  - Josh notes the time from page load to buildings shown (Q6).
- [ ] (Josh checks) The playtester's headless ladder replay shows no regression. The 3D view is not in the trace, so no snapshot should move.

## Files
- **Renderer, may touch:**
  - `src/render3d/models.ts`: `MODEL_TABLE`, `BUILDING_FRONTS`, `BUILDING_EXCLUDE`, `POLYGON_MIN_FAMILIES`, the fallback in `buildingPlan`, and comments;
  - `src/render3d/models3d.ts`: only if the fallback must see which packs actually loaded;
  - `src/render3d/facing.test.ts`, `models.test.ts`, `calibration.test.ts` and `styleguide.test.ts` (new tests and fixtures);
  - a new `src/render3d/polygon.test.ts`, if the builder prefers one fixture file for the POLYGON set;
  - `docs/city-style-guide.md` (chapters 5, 6, 7, 13 and 15, and Numbers).
- **Must not touch:**
  - `town.ts`: `LOT_TYPES` and the layout do not change in this slice (Q4);
  - `layout.ts`, `scene.ts`, `gallery.ts`, `calibration.ts`, `pick.ts` and `camera.ts`;
  - `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/` and `tools/`;
  - `vite.config.ts`, `package.json`, `puzzles/` and `tests/`;
  - everything under `assets/`, which is read only.

  A builder that needs any of them stops and asks for a re-cut.
- **Josh:** the precondition (calibration in the gallery) and any pack.json or reconversion work (Risks). No other agent has work in this ticket.

## Interfaces
- **No `src/core/` change.** `calibrationKey`, `CalibrationKey` and the manifest types already exist.
- **Local to `src/render3d/models.ts` (the builder may rename):**
  - `ModelChoice` gains `fallback?: true`, which marks the SIMPLE Town building rows.
  - `POLYGON_MIN_FAMILIES: Readonly<Record<LotType, number>>` = `{ small: 4, house: 4, large: 4, tall: 3 }`, the same thresholds as the variety tests.
  - `buildingPlan(models, exclude)` keeps its signature. Per type, it uses the non-fallback names if they reach the threshold after exclusion, else the fallback names.
- **No new dependency.** No puzzle schema change. No event change.

## Out of this slice
- Modular City Pack assembly (Base, Floor, Roof, Corner and Glass pieces), and so the City Pack's `_Corner_` handling.
- City Pack roads, pavements and kerbs (042 C).
- Landmarks for places (042 E): the Church and the City Hall.
- Any change to `LOT_TYPES`, the layout, lot sizes or `WORLD_PER_METRE`.
- Re-keying `BuildingPlan` by `pack:name`.

## Risks
- **Pack recreation changes keys.** If Josh rebuilds the Town Pack as a buildings-only pack to cut the 114 MB load (finding 5), and gives it a new pack id (for example `town-buildings`), every `town-pack:` key in his saved file and in the code stops matching. Keep the id `town-pack`, or do the rebuild before calibrating. A reconversion with a changed `pack.json` scale would also change sizes and so lot types. City Pack's `"scale": 100` must stay.
- **Load on Josh's PC.** Fetching a 114 MB GLB plus 23 MB may be slow or heavy on his PC, which froze on 17 Nov 2026. The builder does not run a browser. Josh measures it in his check (Q6).

## Open questions for Josh (defaults apply if you just approve)
1. **Which lot types go POLYGON, and does SIMPLE Town stay anywhere?** Default: each type switches to POLYGON only when POLYGON gives it at least the family count the variety rules need (4, or 3 for tall). A type that falls short keeps SIMPLE Town, and the two never mix within one type. Expected result: small and house go Town Pack, large goes POLYGON only if the City Pack's Octagon and Round_02/_04 are whole, and tall stays SIMPLE Town. SIMPLE Town also stays as the CI and fresh-checkout fallback. The alternatives:
   - mix styles within a type to reach the count;
   - drop SIMPLE Town everywhere and accept placeholders, or fewer families, where POLYGON is short.
2. **Which City Pack names are whole buildings?** Default: only the names you mark in the gallery as whole. `OfficeRound_02/_04` and `OfficeSquare_02/_04` may be tower segments. Anything not marked is left out.
3. **Church and City Hall.** Default: they are held for 042 E's landmark places (sacred, hall) and are never ordinary lots. The alternative is to let the Church stand on tall lots now.
4. **Size against lots.** The Town Pack houses are 4 to 9.4 m high and many are 6 to 9 m wide, so on 12 x 13 and 16 x 19 lots they sit in big yards. Default: no lot change in this slice. You judge it by eye, and a later ticket resizes lots ("lots are sized to buildings", 041 Decided). That later ticket would move the layout and the pool counts. `Preset_02` (5.7 m) is the smallest; Shift+click it in the gallery if it looks like a shed.
5. **Corner buildings.** Default: no Town or City Pack model is a corner model in this slice. A gallery click sets only the door, and `open` lives in code. If you see a preset with two street faces, name it and its second face, and the builder adds `corner: true, open: ...`.
6. **Load time.** Default: accept the full `town-pack.glb` for now and note the time in your check. If it is too slow, make a buildings-only Town Pack under the same id `town-pack` (Risks), or ask for a ticket to add an include filter to the converter (grid-simulator, `tools/`).
7. **How the fronts get from your saved file into code.** Default: the builder reads `assets/private/calibration/fronts.json` (read only) and copies the town-pack and city-pack entries into `BUILDING_FRONTS` and `BUILDING_EXCLUDE` by hand, listing each line in its report for you to check. Your saved file keeps overriding in dev, with identical values. The alternative is a promotion script (`tools/calibration/`, grid-simulator). That is a separate ticket, built first.

## Within approved scope?
Yes, given Josh's 043 Q4 answer and his 18 Nov 2026 words. No Decided GDD rule, dependency, schema or event is touched, and `rules-coverage.md` does not change. The licence ruling (16 Nov 2026) holds: names and sizes are not licensed content, and nothing from `assets/private/` is committed or bundled.
