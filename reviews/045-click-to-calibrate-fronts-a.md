ticket: 045-click-to-calibrate-fronts-a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A: re-key `BUILDING_FRONTS` and `BUILDING_EXCLUDE` to `pack:name`, with every value unchanged. Add a dev-only, quiet loader for `assets/private/calibration/fronts.json` and a pure merge (`effectiveFronts`) that lays it over the code's tables for the town (`sharedModels`) and the gallery. The gallery shows, read-only, where each front came from, which models are excluded, and "N of M marked". The guide and its drift test move to the keyed form. Reviewed on commit 771edcb against its parent. Section 0 was already reviewed.

## Does the branch do it?
- **Re-key, nothing else: met.** In `src/render3d/models.ts`, every one of the 39 lines gets the `simple-town:` prefix and keeps its value, and `BUILDING_EXCLUDE` stays `[]`. `calibration.test.ts` "has exactly the old lines, each key prefixed simple-town:" pins this against the old literal, spelled out. Readers now look up `calibrationKey(pack, name)`: `planModels` (with an own-property check), `buildingPlan` and `galleryEntries`. I read each test diff:
  - `debug3d.test.ts`, `facing.test.ts` (the old cases), `styleguide.test.ts` and `models.test.ts` change key spelling and types only. `facing.test.ts`'s calibration test slices the prefix off and keeps the same assertions.
  - Builder flag (1): `models.test.ts` is not on A's file list, but its one change, `Q1` to `b:Q1`, is key spelling the re-key forces. It is acceptable.
  - Builder flag (2): in `gallery.test.ts`, the `?` moves from `door: +z ?` to the `current ?` line, which is the caption format the ticket's A5 asked for. `startsWith("current")` keeps the "exactly one copy current" meaning under the new caption lines. A new assertion pins the guessed copy's caption to `["door: +z", "current ?"]`. Neither change weakens a test.
- **Two packs, one name: met.** The `calibration.test.ts` "two packs, one name" block uses a fixture with `SM_Bld_Shop_01` in both `city-pack` and `town-pack`. `planModels` gives `+x` / `-z` and `galleryEntries` gives each pack its own front. Two more cases: a line for one pack doesn't turn or list the other pack's model, and exclusion goes by key.
- **The merge: met.** `effectiveFronts` in `src/render3d/calibration.ts`:
  - with `null`, it deep-equals the code's tables (both the fixture and the shipped tables);
  - a corner model keeps `corner` and `open`, with exactly one info line, and none when the saved front equals the code's;
  - a key the code lacks is added;
  - `exclude: true` lands in `exclude` once;
  - its inputs are deep-frozen in a test and come out unchanged.
- **The town follows the file: met.** In `facing.test.ts`, "the town follows the saved calibration file" runs the real `loadModels` with merged tables and fake GLB roots:
  - every `Building_Gym` clone on every map (09-shrine-circuit asserted non-empty) faces its road within 0.5 degrees by the marker test, with front `+x`;
  - no `house_mesh` is placed;
  - with no file, `[lot, name, x, z, yaw]` equals the code-only set.
  `loadModels` gains an `exclude` dep and filters the plan by key. `sharedModels` loads the file first with `dev: import.meta.env.DEV`. Builder flag (3) checks out: `renderer.ts` is untouched, and that is correct for A.
- **Dev only and quiet: met.** `loadSavedCalibration`:
  - with `dev: false`, it makes no fetch;
  - a 404, a network error or non-JSON gives null with no log;
  - an invalid file gives null and one info line naming `CALIBRATION_FILE`;
  - a synchronous throw from `fetchJson` gives null, not a rejection;
  - the URL is `${base}${CALIBRATION_FILE}` with `cache: "no-store"`.
- **Gallery reads it: met.** In `gallery.test.ts`, "the gallery reads the saved calibration file":
  - `current`, `current, saved` and `current ?` each appear by source;
  - a saved front on a name the code lacks is no longer a guess;
  - only the excluded group says `excluded`;
  - the group order is the same with and without the file;
  - the title says `N of M marked`, and other packs' entries don't count.
- **Guide and drift test: met.** Chapters 5, 6, 7 and 15 use `pack:name`. Chapter 6 says "one line per `pack:name`". Step 5 reads "click each door in the gallery (ticket 045)". `styleguide.test.ts` still compares the keyed tables with `BUILDING_FRONTS` line for line, so changing one key fails it. A new test requires every table name to parse as a key. I didn't see the builder's one-time failure message, but the comparison makes such a failure certain. Builder flag (4): the step 5 text describes a click that only arrives in C. The ticket asked for this wording in A, so it is not a defect. It is only true once C merges.
- **CI-safe: met.** No new test reads `assets/private/`. The loader is driven by a fake `fetchJson`, and the town test fakes the manifest and GLBs. The existing real-manifest blocks keep their `skipIf(!existsSync)`.

## Rule conflicts and risks
- `src/grid/`, `src/night/`, `src/core/`, `vite.config.ts`, `tests/`, `puzzles/` and `package.json` are untouched by 771edcb. `git ls-files assets/private` is empty. No dependency was added.
- `calibration.ts` imports only `../core` and a type from `./models`, with no three and no DOM. That fits its "pure" note and the C5 isolation plan: `models3d.ts` imports the loader, not a saver.
- One file outside A's list (`models.test.ts`), for key spelling only, as noted above.
- Exclusion now applies in two places: `loadModels` filters saved and code exclusions out of the plan, and `buildingPlan` still filters by `BUILDING_EXCLUDE` by default. The results agree, but a later change to one could miss the other.

## Must fix
none

## Could improve
1. `facing.test.ts`, "with no file, the clones are exactly the code's": it compares only `maps.slice(0, 12)`. The criterion says "exactly as on `main`". Running every map, or saying in the test name why 12, would close the gap for little cost.
2. `models3d.ts` `loadModels` and `models.ts` `buildingPlan` both apply exclusions. A one-line comment at the `loadModels` filter, saying it is where saved exclusions take effect, would stop a later edit from dropping one of them.
3. `galleryEntries` marks `saved` whenever the file has a front, even when it equals the code's front, so the caption reads `current, saved`. That is defensible ("by source"). Section C should keep it in mind when it decides what "clicking the current copy again does nothing" means for a code-only front.
