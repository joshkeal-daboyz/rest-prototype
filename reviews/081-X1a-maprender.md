ticket: 081-X1a-maprender
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Move everything the city view still takes from `src/render/` into `src/render3d/`, keeping every value the same: the six map interfaces plus `Insets`/`Pan`/`Rect`/`ZOOM_STEP` go to a types-only `maprender.ts`, along with glyphs, relight, glow and motion helpers, and `stableHash` from `src/city/pipeline/hash.ts`. Afterwards `src/render3d/` imports nothing from `src/render/`, and `src/render/` re-exports the moved names so `src/play/`, `main.ts` and the harness still compile unchanged.

## Does the branch do it?
I reviewed X1a's own commit, 5375a0f. The merges of main and the goal branch bring in no X1a code. The commit touches only `src/render/` and `src/render3d/`.

1. **The moves: met, with one justified exception.**
   - New `src/render3d/maprender.ts` holds `MapOverlay`, `MapRenderer`, `MapBlockers`, `MapPlaces`, `MapPanView`, `MapCentre`, `Pan`, `Rect`, `Insets` and `ZOOM_STEP`. The text is the same as before. The file imports only types from core and grid, and nothing from three.
   - `glyphs.ts` was moved with git mv, unchanged (0 lines differ).
   - `relight.ts` became `relightplan.ts` (81% similar). It also holds `glowTarget`, `easeGlow` and `GLOW_EASE_SECONDS`, which came over unchanged from `city.ts`.
   - `hash01`, `flicker` and `clamp01` are now in `src/render3d/motion.ts`, unchanged. `pulsePhase` stayed in `src/render/`, which the ticket allows ("if needed").
   - `CityRect` was already defined in `tilecity3d.ts:34`. `city.ts` now imports it as a type and re-exports it.
   - **The exception:** `glyphs.test.ts` stayed in `src/render/`, with only its import line changed. It was not moved. It imports `./geometry` and `./map-renderer` from the 2D map, so moving it into `src/render3d/` would break criterion 2. Leaving it in place is the right call. The cost is that X1c's deletion will take these 2 glyph cases with it (see Could improve 1).
2. **`src/render3d/` imports nothing from `src/render/`: met.**
   - `maprender.test.ts` has 1 case. It reads every `.ts` file in `src/render3d/` and fails on any `from`/`import` of `../render` or `../render/...`.
   - The regex leaves `../render3d` alone, so it does not catch the folder's own name.
   - `src/render3d/` has no subfolders, so a flat read covers all of it.
   - Grepping the folder finds `../render/` only in comments.
   - Every `stableHash` import is now from `../city/pipeline/hash` or `../city/pipeline`.
   - `stylepin.test.ts` changed its import line only, and its pins pass.
3. **`src/render/` still builds and re-exports the names: met.**
   - `index.ts` re-exports `planRelight`, `RELIGHT_TRAVEL_SECONDS`, `FLARE_SECONDS` and `RelightPlan` from `../render3d/relightplan`.
   - `map-renderer.ts` re-exports the six interfaces, so `index.ts`'s existing type line still resolves.
   - `geometry.ts` re-exports `Insets`, `Pan`, `Rect` and `ZOOM_STEP`.
   - `motion.ts` re-exports its three helpers, and `city.ts` re-exports the glow functions and `CityRect`.
   - CI's typecheck is green, and the commit touches nothing in `src/play/`, `main.ts` or `tests/playtest/`.
   - `render.test.ts`'s folder-imports check now allows `../render3d/`. That is needed and stated in a comment.
4. **No digest or city test changed: met.** Moved values are byte-identical. I ran the 10 test files the commit added or changed with 2 workers: 214 passed in 9.1 s. The new `maprender.test.ts` takes 13 ms.

**Test count.** Policy limit 15: 1 added and 4 rewritten, so 5 in all.
- **Added:** the 1 case in `maprender.test.ts`.
- **Rewritten (bodies or names changed):**
  - the purity case in `powerkit.test.ts`;
  - the import allow-list in `models.test.ts`;
  - the "render folder imports" check in `render.test.ts`;
  - the "names only constants that exist" check in `styleguide.test.ts`.
- **Import lines only, not counted as rewrites:** `glyphs.test.ts`, `city.test.ts`, `overlay.test.ts`, `relight3d.test.ts` and `stylepin.test.ts`.

The ticket's own estimate was "at most 2 rewritten". The two extra rewrites are import allow-lists that the move itself made stale, not new coverage. The total is far under the policy cap, so this is not a must-fix.

## Rule conflicts and risks
- `src/grid/` and `src/night/`: the X1a commit does not touch them (0 diff lines). The new `maprender.ts` imports only a type from grid, in the allowed direction.
- No file outside the ticket's listed folders changed. No new dependency. No Decided rule touched.
- `styleguide.test.ts` dropped `src/render/city` as a source of known constant names. It moved `LOT_GAP` and `SETBACK` onto the `PENDING` list, so the style guide's mentions of those two names are no longer checked against real code. That misuses "Pending", which is meant for approved but unbuilt work. The comment explains it (X1c deletes `src/render/city.ts`). It is a small weakening, not a broken rule.
- The 3D game can still take `src/grid/` and `src/night/` as they are.

## Must fix
none

## Could improve
1. When X1c deletes `src/render/`, `src/render/glyphs.test.ts` goes with it, and the glyphs in `src/render3d/glyphs.ts` lose their 2 cases. Note this in the ticket for X1c: either rewrite the 2 cases on a fake context in `src/render3d/`, or accept that `overlay.test.ts` covers them.
2. `styleguide.test.ts`: instead of parking `LOT_GAP` and `SETBACK` under `PENDING`, the style guide's wording should drop or rename them once X1c lands. Then they come off the list, so the list keeps meaning approved but unbuilt work.
3. `src/render3d/overlay.ts:2` still says the glyphs are `src/render/glyphs.ts`'s. Update that comment to `./glyphs.ts`.
4. `relight3d.ts` and `renderer.ts` now import from `./relightplan` and `./maprender` in two separate statements each. Merging each pair is cosmetic only.
