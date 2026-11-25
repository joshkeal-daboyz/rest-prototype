ticket: 081-U2-open-city
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
`main.ts` opens straight into the 3D city. It lists only city puzzles (U1's `collectCityMaps`), opens each through E2's `loadCityView`, and plays `view.converted.puzzle` with `{ insets, city: view }` on the renderer. The 2D renderer is no longer called, the `city=` dev routes still work, the page is never blank, and one pure helper in `view3d.ts` with one test case.

## Does the branch do it?
I reviewed commit 6713951 against its parent b40c130 (`src/main.ts`, `src/ui/view3d.ts`, `src/ui/view3d.test.ts`). I ran `npx vitest run --maxWorkers=2 src/ui/view3d.test.ts`: 3 passed, 724 ms.

1. **main.ts builds the city page.** Met.
   - `collectCityMaps(files)` replaces `collectMaps`. `byKey`, the picker's `puzzles`, `?puzzle=` and `first` all use U1's `key`.
   - `open()` calls `r3d.loadCityView(entry.city)`. `createGrid`, `createMapPlay`, `puzzleFeeds`, the lamp ids, the relays and the session all take `view.converted.puzzle`. The renderer gets `{ ...rendererOpts, city: view }` when `pageView` says `play`.
   - Plan sharing is left to E2's `loadCityView` cache, which is correct, since U2 builds no plan itself.
   - `createMapRenderer`, `wants3d` and `NO_CITY_FORM_NOTICE` are no longer imported by `main.ts`. Their code and the `wants3d` test are untouched.
   - The routes get the converted puzzle with no `city` option, and `planHidesHud` still runs before the first open.
   - Test: `pageView (ticket 081 U2)` in `view3d.test.ts`. It is one case, and its name states the rule (play, except on a `city=tiles`/`city=plan` route). It would fail if the route list or the default broke.
2. **Never a blank page.** Met as worded.
   - A thrown `loadCityView` (a `CityPuzzleError` or any other error) goes through `showProblem`, which writes `console.error` and puts the message in `#ui`.
   - No city files shows "No city puzzles found in puzzles/city/."
   - A production build returns early with the `npm run dev` line, before `createAudio` or the `render3d` import.
3. **The HUD shows** (browser). The main session reports the HUD and overlay on open. `mountUI` is unchanged and gets the converted puzzle.
4. **Josh plays** (browser). This is for Josh. The main session's run reached the win line.

Count: 1 case added, against the ticket's 1. Files: only the three the ticket lists.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change, no new dependency, no GDD rule touched.
- The diff against `origin/main` also carries `docs/design/081-CK9-every-building-wired.md` and `reviews/081-E2-city-play.md`. They come from the goal-branch base (ecc6eab, f936c38), not from U2's commit. They are pipeline files, not code, but the main session should know PR #50 brings them to `main`.

**The opening camera (the main session's finding).** U2 already calls the district camera on open. `main.ts`'s frame loop calls `renderer.resetView()` once on the first frame (`if (!s.centred)`), and again on resize and Reset. The camera frames the whole city because of E2's frame, not U2's wiring:
- In `src/render3d/cityview.ts` around lines 524-537, the comment says "the job's wires and pieces", but the code grows the frame over every entry of `draws.wires` and `draws.pieces`.
- `circuitDraws` (`circuitdraw.ts` line 163 on) pushes a piece for every pole in the city's circuit layer, scenery included.
- So the frame is the whole city's circuit, which is about the whole 6x6 city. `fitWhole` is `rig.resetView()` too, so the two are the same frame.

This is E2's criterion 9 ("`resetView` and `fitWhole` frame the district, its four streets and the feed"), a browser criterion E2's review could not see. U2 may not touch `src/render3d/`. It is not a U2 must-fix. It belongs to E2 as a small renderer fix section: grow the frame over the job's pieces and runs only (the nodes in `converted.places` and the spans in `converted.runs`), plus the district's four streets. U2 needs no change for it.

## Must fix
none

## Could improve
1. **After a city puzzle fails to open, the picker is not mounted** (builder's open point 1). `showProblem` replaces `#ui`'s content, so the player cannot pick another puzzle without editing the address. With one city puzzle today this costs nothing, and the ticket asks for the message "in the HUD's place", so the branch does what was asked. Once P2a adds puzzles, a failed puzzle would be a dead end. A small later change could keep the picker and show the message beside it, or list only the puzzles that convert. I would not hold U2 for it.
2. **`city=tiles&sheet=1` still runs `loadCityView` first** (builder's open point 2). Criterion 1 asks for the routes to get "the open entry's converted puzzle", and only `loadCityView` produces one, so this follows the ticket. It has two costs:
   - the city pipeline runs once before a debug route that may not need it;
   - a `CityPuzzleError` on the first puzzle stops a `city=tiles`/`city=plan` route from opening.

   Both are dev-only. If the route ever has to open without a good puzzle, that is a ticket change, not a U2 fix.
3. If the dynamic `import("./render3d")` rejects (a module error in dev), nothing catches it and the page stays blank. A `.catch(showProblem)` would hold criterion 2 there too.
