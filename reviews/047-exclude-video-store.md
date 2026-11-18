ticket: 047-exclude-video-store
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Put `simple-town:store_small_mesh` (the video rental store) in `BUILDING_EXCLUDE` on Josh's word, so no map places it. Update the tests that pinned the empty list and the small-row counts, keep every variety limit as it was, and record the ruling as Decided in chapter 5 of the style guide.

## Does the branch do it?
- **BUILDING_EXCLUDE pinned to the store.** `src/render3d/models.ts` now sets `["simple-town:store_small_mesh"]`, and its doc comment names the store and Josh's words. Nothing else in `models.ts` changed. `calibration.test.ts` ("excludes only the video rental store in BUILDING_EXCLUDE (ticket 047)") and `facing.test.ts` ("never places a name in the exclude list...") both pin that list. Met.
- **The small plan has nine names in six families, without the store.** The renamed `facing.test.ts` test "gives the small row's nine names (the video rental store excluded) six families..." asserts `not.toContain("store_small_mesh")`, 6 families and 9 names. `buildingPlan` drops the store through its default `exclude = BUILDING_EXCLUDE` argument (`models.ts:316-319`). Met.
- **No map places the store.** The exclude test now loops over every map and checks that `pickBuildings(town.lots, plan, traits)` never contains `store_small_mesh`. `plan` is the default `buildingPlan(set.building)`, so this checks the code's own list rather than a hand-passed one. Met.
- **The variety limits are unchanged.** In the `variety (every map)` block, the only changed line is `ordinary.length` going from 6 to 5. The thresholds are all untouched: three or more families per type, four or more in small/house/large, neighbours, `STREET_REPEAT_GAP`, the `FAMILY_SHARE_MAX` cap, max/min ≤ 1.5, the corner rules, and `Shop_03..05` against `Gym` within 0.66–1.5. Nothing was loosened. Met.
- **Shipped-table turn case (the builder's edit beyond the first pin list, recorded in the re-cut).** The change from 2 to 1 is correct. `BUILDING_FRONTS` sets every placed name to `-z` except the store (`+z`), and `memorial_mesh` is not a placed building. The fixture assertion `new Set(set.building.map(m => m.front)).size` stays at 2 because `fakeSet` still lists the store; only the placed clones lose `+z`. The scrambled-table line (4) is unchanged, so turning a `+z` front (and every other front) is still covered there. The added comment says why. Met.
- **The no-file test (the builder's other extra edit, recorded in the re-cut).** `loaded(null)` returns the loaded set, which leaves out `BUILDING_EXCLUDE`, while `fakeSet` lists every model. So filtering the expected side by `${m.pack}:${m.entry.name}` is the correct comparison and does not weaken the test. The `applyModels` equality over the 12 maps that follows is unchanged, and it still compares lot, model, x, z and yaw. Met.
- **models.test.ts manifest-sizes test.** It adds one `BUILDING_EXCLUDE` import and filters the expected unplaced names, as the re-cut allows. Nothing else in the file changed. Met. On CI it skips without the manifest; the builder reports 359 passing in `src/render3d/` on a machine that has the assets.
- **styleguide.test.ts passes unedited.** The file is untouched. The guide's Info line now names `` `simple-town:store_small_mesh` `` and no longer says the list is empty. The gate is green. Met.
- **The guide.** The Pending entry is now the Decided entry with Josh's exact words, and it says the store stays in `MODEL_TABLE` and in the gallery. The Default (042 Q3) line drops "It is empty today". The Info line names the key. Only chapter 5 changed. Met.
- **The builder's runs and Josh's optional check.** These are process steps I can't check from the diff; the builder's report covers them.

## Rule conflicts and risks
- None found. Every change is inside `src/render3d/` and `docs/`, the purity of `src/grid/` and `src/night/` is untouched, there is no new dependency, `MODEL_TABLE`, `BUILDING_FRONTS`, `gallery.ts` and `town.ts` are unchanged, and no GDD rule is touched.
- One small risk: the shipped-table case no longer places a `+z` model at all, so it now only checks the `-z` path. The scrambled case covers the rest, as the ticket says.

## Must fix
none

## Could improve
1. When ticket 048 brings in POLYGON buildings, or `memorial_mesh` is placed, the shipped-table `turned.size` of 1 will change again. That ticket should say so in advance, so a builder doesn't hit it by surprise.
