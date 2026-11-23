ticket: 070a2-plan-view
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
`tilecity.ts` gets its streets, base street roles and block rectangles from stage 1 (`src/city/streets/`), deletes its own copies and re-exports every moved name, so `city=tiles` draws exactly as before. There is also a dev-only flat viewer at `?city=plan&stage=...`, with tests for its parser and for a pure `pictureToRgba`.

## Does the branch do it?
I diffed against 7d49e76. There are three commits: d8e09d4 (the A1 review fix), 60b7986 (A2) and 5ffcbca (the purity-list widening plus the ticket note).

**1. `tilecity.ts` uses stage 1.** Met.
- It imports `layStreets`, `hashOf`, `clampBlocks`, `blockSizes`, `blockType`, `streetBandAt` and all the stage-1 constants from `../city/streets`. It imports the types from `../core`.
- It deletes `AVENUE_BANDS`/`STREET_BANDS_*`, `layoutAxis`, `blockLens`, `cvOf`, `blockSizesWork`, `blockSizesVary`, `blockSizes`, `BLOCK_FALLBACK_*`, `blockType`, `clampBlocks`, `hashOf`, `mkStreet`, the band-role loop and all the stage-1 constants.
- Every name it used to export is re-exported: the constants, `blockSizes`, `blockType`, `streetBandAt` and `BLOCK_FALLBACK_*`. The gate's clean tsc confirms no importer broke.
- `TileStreet = CityStreet`. `TileBand` and `BlockType` also became aliases of the core types. These are type aliases only, with the same members.
- The rewritten head of `tileCity` keeps today's semantics. I checked `src/city/streets/layout.ts`:
  - Blocks come out in the same bj-outer, bi-inner order.
  - Junction and corner cells have `street: null`, which matches the old `owner` null.
  - A crossing keeps `band: -1` and its carriageway street as owner.
  - `parking` reads as `parkingPlain`.
- `cols.blocks` and `rows.blocks` are rebuilt from the block rectangles, and only `.blocks` is read after that.

**2. Nothing moved.** Met.
- The named test files and the pins are not in the diff. The gate is green, with 2747 tests passing.
- `packpin.test.ts`, `townpin.test.ts`, `town.ts` and `terrace.ts` are not touched (R-8).
- The one edit to `tilecity.test.ts` is the allowed-import array in "pure (criterion 8)". It gains `"../city/streets"` and `"../core"`, and every other ban line is unchanged. That is exactly the exception the ticket records with Josh's words ("Yes, widen it").

**3. The viewer.** Met.
- `planViewRequested` in `src/render3d/planview.ts` matches `cityTilesRequested`'s `blocks` and `seed` parsing line for line. It takes `stage` by name (case-insensitive) or as 1 to 8 over `CITY_STAGES` minus `assemble`. A missing stage means the last built one.
- `planShown` runs `runCity(opts, stage)`.
- On a failure it shows `lastGoodPicture(run)` under a banner naming the stage, the seed, the size and the reason.
- An unknown stage, or one not built yet, gives a banner listing `BUILT_STAGES`.
- The canvas fits the picture to the window, with the legend under it in wrapped columns and text of at least 14 px.
- `renderer.ts` routes to it only under `import.meta.env.DEV`, before any WebGL context is made. That is 4 lines, routing only.
- Tests in `planview.test.ts`:
  - the parser on typed-in strings (defaults, name/number/case, out-of-range and non-plan stages, `blocks`/`seed` clamping, an unsafe-integer seed);
  - `pictureToRgba` on a 3 x 2 fixture (size, cell colours, magenta for an index outside the legend, the point dot, scale flooring);
  - `wrapLines`;
  - `planShown` for a good city, an unknown or unbuilt stage, and the 6 x 6 run.

**4. Screenshot.** This is the main session's job and is not judged here.

**d8e09d4 (carried A1 fix).** It drops the unused `"none"` legend entry and shifts the indices by one in `stage.ts` and its test. `pictureProblems` has no index-0 rule, and the layer digest does not include the legend, so no pins move.

## Rule conflicts and risks
- The diff goes outside A2's Files in two places:
  - d8e09d4 edits `src/city/streets/`, which A2 lists as read only. It is the A1 review's fix, carried here on purpose.
  - 5ffcbca edits `tickets/070-city-pipeline.md`, which is on every section's must-not list. That edit only records Josh's ruling and widens A2's Files line to match.
  - Neither changes behaviour beyond what was asked, but the main session should make sure the ticket edit has the lead-architect's authorship as the process expects.
- `planview.ts` uses `document` and `ImageData`. That is fine, because it is in `src/render3d/`. No `src/city/`, `src/grid/` or `src/night/` file is touched by A2 itself.
- `planview.ts` imports `MapRenderer3d` as a type from `./renderer`, and `renderer.ts` imports `planview`. The cycle is type-only, so it is harmless.

## Must fix
none

## Could improve
1. `planview.test.ts`: nothing tests the failure path with a layer to show (banner text plus last good picture). `lastGoodPicture` is tested only on an empty run. With only `streets` built, a failure has nothing before it. A test that builds a `CityPlanRun` with `ok: false`, a `streets` layer and a later failing stage would pin the banner wording and the fallback picture before stage B lands.
2. `planview.ts` `planShown`: `lastGoodPicture(run)` is computed twice in the failure branch (picture and title). Keep it in a local.
3. `planview.test.ts`, the 6 x 6 test: it passes whatever the outcome. That fits R-7's "never a throw". It could also assert `s.picture !== null || s.banner !== null`, so an empty result is caught.
