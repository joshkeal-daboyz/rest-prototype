ticket: 081a2d-view3d-fallback
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section A2d: with the ladder town about to go (A2c), `?view=3d` on a schematic puzzle should open the 2D map and log "3D view: this puzzle has no city form yet". A `city=` route (`tiles`, `plan`, with or without `sheet=1`), or a city puzzle from U1 on, still asks for the 3D renderer. The decision sits in a pure helper `wants3d(search, puzzleKind)` in `src/ui/`, and `?assets=` stays as it was. Two test cases.

## Does the branch do it?
I reviewed against the merge base with origin/main (fe4e178). The builder's commit is c078e7a, which touches `src/main.ts`, new `src/ui/view3d.ts` and new `src/ui/view3d.test.ts`. The diff also shows changes to `.claude/launch.json` and `tickets/081-puzzles-on-the-city.md`. Those come from the goal branch (c1142c6 and the 787e0a8 merge), not from the builder.

1. **Criterion 1, met.**
   - `src/ui/view3d.ts` defines `wants3d(search, puzzleKind)`. It returns false without `view=3d`, true for a `"city"` puzzle, and otherwise true only when `city=` is `tiles` or `plan`. Any other value, such as `tiles-old`, gives false. `sheet=1` and `stage=` are not read, so they make no difference. The helper is pure: the address comes in as a string, and it reads no `location`.
   - `src/main.ts:95-96` sets `view3d = wants3d(location.search, "schematic")`. It logs `NO_CITY_FORM_NOTICE` with the exact wording when `view=3d` is present but refused. Only the view branch changed.
   - I checked that the routes still reach the renderer. `renderer.ts` routes `city=plan` (planview), `city=tiles` (plan3d) and `city=tiles&sheet=1` (tileslots), and all three are inside the accepted set.
   - Test: `view3d.test.ts` case 1 covers each of these against the rule. It checks the schematic puzzle with no route (2D), tiles, tiles with sheet, plan with stage (3D), `tiles-old`, a route without `view=3d`, and a city puzzle.
2. **Criterion 2, met.**
   - The `?assets=` page is decided at `main.ts:312`, before `startPuzzle()`, and the branch does not touch that code.
   - Test: `view3d.test.ts` case 2 checks two things. `assetGalleryRequested` reads the same address whether or not `view=3d` and `city=` are present. `wants3d` never asks for 3D on `?assets=` alone.

Test count: 2 added, none rewritten, within the cap. I ran `npx vitest run --maxWorkers=2 src/ui/view3d.test.ts` and both cases passed in 24 ms.

## Rule conflicts and risks
- The branch does not touch `src/grid/` or `src/night/`, adds no dependency and changes no GDD rule.
- All files are inside the ticket's list (`src/main.ts`, `src/ui/`).
- Risk, which the ticket intends: from this merge until A2c, `?view=3d&gallery=<pack>` (043) and the `cam=street` ladder views on a schematic puzzle no longer reach the 3D renderer, because neither carries a `city=` route. A2c deletes both, so this only matters if Josh opens one of them in that window.

## Must fix
none

## Could improve
1. `src/main.ts:96` parses the address a second time to decide whether to log. A small `view3dRefused(search, kind)`, or having `wants3d` return the reason, would keep the rule in one place. This is optional.
2. `view3d.test.ts` case 2 checks `assetGalleryRequested`'s whole return object with `toEqual`. That ties this test to the gallery's option fields (074's). Checking only `.pack`, as the second line of the case already does, would test the same rule.
