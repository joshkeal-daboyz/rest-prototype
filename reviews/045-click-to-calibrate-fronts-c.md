ticket: 045-click-to-calibrate-fronts-c
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C makes the dev gallery take clicks. A click on a copy makes that side the model's front, Shift+click toggles exclude, and Delete clears the last-clicked model. Each choice is posted in order through the section B endpoint, with "saved" or "not saved: <reason>" feedback. The scene stays unraycastable, and the gallery is switched on only when `import.meta.env.DEV` is true, so it can drop out of production. These are the marks as amended at approval: no "not a building" mark, no reordering, no section D.

## Does the branch do it?
Diff against `main` (a8293a6): `src/render3d/gallery.ts`, `gallery.test.ts`, `renderer.ts` (one line) and `docs/city-style-guide.md` (one paragraph in chapter 6). These are all files C may touch. `src/grid/`, `src/night/`, `src/core/`, `tools/`, `vite.config.ts`, `calibration.ts`, `models.ts`, `models3d.ts`, `town.ts`, `pick.ts`, `scene.ts`, `layout.ts` and `camera.ts` are unchanged. No dependency added.

- **Hit test: met.**
  - `galleryHitAt(layout, origin, dir)` is pure maths over the layout. `galleryRayAt` builds the ray with three's `unproject`, with no scene raycast.
  - Tests ("a ray through the middle of each copy's model hits that copy, on the first screen and at the line's end") use `createGalleryRig` at 800 x 450 on the fixture manifest, before and after `jumpToEnd`.
  - Gaps within a group and between groups hit nothing, tested at three heights and depths.
  - Sky, a backwards ray and a zero ray miss.
  - A real `Raycaster` against the built scene still finds nothing. `hitTest: () => null` is still in the source.
  - The plane test matches C1. The caption plane and the lot floor are added hit regions (see builder decision 2 below).
- **Click vs drag: met in the pure part.** `isGalleryClick` is tested at 0 and 5 px on each axis, on the diagonal, and beyond. In `onUp`, a release past `CLICK_SLOP_PX` returns before `editor.click`, so a pan sends no patch. That branch is checked by reading the code, not by a test (builder decision 4).
- **Actions: met.** `it.each` over none / front / front+exclude covers click, Shift+click and Delete against the design's table. Every patch made passes `applyCalibrationPatch` and then `validateCalibration`. A copy of another model gives null.
- **Saving: met.**
  - `createCalibrationSaver` is tested with a fake `postJson` that counts requests in flight.
  - Three quick clicks are posted in order with `maxInFlight` 1. The reply replaces the state. The current copy moves and its caption reads `current, saved`.
  - A rejecting `postJson` shows `not saved: HTTP 500` on that group and in the title, keeps the mark, and throws nothing. The next enqueue retries the failed patch first.
  - A reply that is not a calibration file, and a `postJson` that throws at once, are both failures.
  - `updateView` keeps the pan and zoom (tested), so a click rebuilds the line in place.
- **Isolation: met.**
  - The saver, `CALIBRATION_ENDPOINT` and `defaultPostJson` appear only in `gallery.ts`.
  - The seven town and play files don't import `./gallery`.
  - `models3d.ts` imports `loadSavedCalibration` and nothing from the saver.
  - The 043 B tests, `pick.test.ts` and the scene tests are not edited: the test diff only adds imports and a new `describe`.
- **Not in production: can't confirm from source, and the main session is checking `dist/`.**
  - Gating is correct: `import.meta.env.DEV && typeof location !== "undefined" ? galleryRequested(...) : null` parses as `(DEV && ...) ? ... : null`, so the value is `null`, not `false`, in a build.
  - The saver is also created only when `dev` is true.
  - Whether Rollup drops `gallery.ts` depends on its module-level side effects. Before this branch there was a `new Set` and `Math` calls; now there are also two `new Vector3()` (lines 801-802). Rollup usually treats both as pure, but only the `dist/` check ("four sides each", `__calibration`) settles it.
- **Help line: met.** `GALLERY_HELP` is in the title and pinned by a test.
- **CI-safe: yes.** The new tests read only `src/render3d/*.ts` inside `it` bodies, never `assets/private/`. They use fake clocks and fake servers, with no timers.

Builder's flagged decisions:
1. **Clicking the `current` copy.** Doing nothing only when it is already `current, saved`, and otherwise saving the front as it stands, fits the Goal better than the literal text. Josh can then settle a `current ?` or code-table front by clicking the copy whose door faces him, without first clicking a wrong side. "Clicking the `current` copy again" most naturally means after it was clicked (that is, saved), so this reading isn't a breach. It is documented in `galleryAction` and in chapter 6. Mention it to Josh.
2. **Lot floor as a hit region.** A harmless extension inside the cell's x range. The gap tests still pass, so gaps still miss.
3. **Shift+click toggles only the file's own exclude.** Correct while `BUILDING_EXCLUDE` is empty, and documented.
4. **Pointer handler untested.** Acceptable. Every decision it makes calls tested pure functions. See could-improve 2.
5. **Whole line rebuilt per click.** Correct: clones share geometry and `dispose` frees only owned materials and caption textures, so the pack's model root survives the rebuild. It costs a few hundred caption textures per click on Josh's PC. See could-improve 3.
6. **Not in production.** Left to the main session's `dist/` check, as the ticket says.

## Rule conflicts and risks
- No hard-rule break. `src/grid/` and `src/night/` are untouched, no dependency was added, and no Decided rule is touched.
- Risk: the production drop of `gallery.ts` is not proved by any test (only the source-text test on `renderer.ts`). The `dist/` check is the proof.
- Risk: `galleryHitAt` returns the first slot in line order that matches any region, not the nearest hit along the ray. With the camera facing the line this works in the tests. A ray far off the centre of the screen could, in principle, hit a neighbour's floor before the model it passes through.
- The "saved" caption shows as soon as a patch is queued, before the server replies. On failure it is followed by `not saved`. This is consistent with C4 ("the mark is shown"), but `saved` is momentarily optimistic.

## Must fix
none

## Could improve
1. `src/render3d/gallery.ts` `galleryHitAt`: return the hit with the smallest ray parameter `t` across all slots and regions, rather than the first slot in order, so an off-centre click can't pick a neighbour's floor.
2. Pull the `onUp` decision (click or pan, undo the pan, NDC from the client rect) into a small pure function and test it. That would cover "a pan of more than 5 px sends no patch" end to end without a canvas.
3. If a click feels slow on the 49-model City Pack, rebuild only the clicked group's captions and outlines instead of the whole scene.
4. Tell Josh about builder decision 1 (clicking an unsaved `current` copy saves it). It is a small, sensible departure from the literal wording.
