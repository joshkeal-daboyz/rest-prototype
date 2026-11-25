ticket: 081-t1-title-backdrop
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section T1 asks for a renderer view, `createTitleView`, that draws behind the page's words either SK's turning night sky alone (the splash) or the moon over a 3 x 3 window of the stage 01 city, with stage 01's target building lit gold on the right of the screen (the title). It also asks for a `?title=` dev route that shows the view alone, and two tests: the poses and the window.

## Does the branch do it?
1. **The view.** Done. `createTitleView(canvas, view, opts)` is in `src/render3d/title3d.ts` and exported from `index.ts` with its types. It has `setMode`, `draw(t)`, `ready()`, `resize()` and `dispose()`. `ready()` is true once models load, or once the load fails and the grey boxes stand in. The types are in `src/render3d/titleview.ts`, types only, as `maprender.ts` is. The scene is lit through `applyLightMode(scene, gl, "night", owners)`, so the sky, moon and moonlight are SK's. `dispose()` calls `releaseSky`, frees the city, the lit glass, the glow cards and the lights, and frees the ground box.
2. **The splash.** Done. `draw` calls `setSkyTurn(scene, splashTurn(t))` with `splashTurn = NIGHT_SKY.drift_deg_s * t`. The city group is hidden outside title mode. The splash pitch is 30 degrees, and the vertical view is 40 degrees (half is 20), so the bottom edge of the screen looks 10 degrees above level and no ground shows. `gl.render` runs every frame whether or not the models have loaded, so the splash draws before any model is in. Tested by `skyOnly(poses.splash)` in the first case of `title3d.test.ts`, which also checks that the title pose is not sky-only.
3. **The title.** Done, with one reading noted below.
   - **The camera:** a pose in the street, 1.8 m high, looking north. The splash-to-title move eases the pitch over `TITLE_SETTLE_S = 1.5` (`settleBlend`, a smoothstep). The pose's numbers are in `TITLE_VIEW`.
   - **The lighting:** `standLight` lights the target and its lit set through `setBuildingGlow` with `target: true`, plus `litGlass`, `glowCards` and `streetLights`/`setStreetLights`. That is W2 and W3's path, street lights included.
   - **The test:** the first case runs on stage 01's city at two aspects (1287/1178 and 16/9). It checks the building's centre at half its roof height projects at x > 1/3, and the moon over a whole 40 s sway projects at 0 < y < 1. It also samples every drawn column's faces one point per metre and finds none in the left third with |y| > 0.6, which is the top and bottom fifths. Its `projectPoint` uses the same frame as the real camera (pitch about x, yaw 0 looking at -z, `FOV_DEG` vertical), and `moonAt` is SK's `moonDirection`, which `setSkyTurn` places the moon by. So the test measures what is drawn.
   - **The reading:** the criterion says "the sky turns slowly, as on the splash". The title sways 3 degrees either side of a moon 4 degrees east of north, once every 40 s (`titleTurn`), instead of turning for good. The comment on `TITLE_VIEW` gives the reason: a steady turn at 1.5 degrees a second would carry the moon out of the frame within half a minute, and the same criterion asks for the moon in the upper half. That is a fair way to meet both halves of the criterion, and Josh has seen the look ("Fine for now (Recommended)", ticket line 2427).
4. **Only the window is built.** Done.
   - **The code:** `titleWindow` takes the blocks within `window_blocks = 1` of the building's block (block indices `bi`/`bj`), plus a street's width of cells round them. `windowedPlan` filters every layer `plan3dGroups` draws (ground cells, arrows, kerb segments, buildout trees, mass cells, columns, facades, props, traffic) and drops the circuit layer.
   - **The test:** the second case checks:
     - every building draw is in a window block;
     - every dress, prop, traffic, tile-cell and interior item is inside the rectangle;
     - `circuit` is null;
     - fewer than a third of the city's columns and ground cells are drawn.

     This fails if a layer were left unfiltered. It runs on the stage 01 city the file already builds, not on the "small fixture plan" the criterion names (see Could improve 1).
5. **The cost** (browser). No perf=1 log is recorded on the branch, in the commit message or in the ticket. The `perf=1 (title)` log is in place: 300 title frames after `built`, with the program count against the first frame's. I can't judge the 16.7 ms bound from here; it is for the main session or Josh in the pane.
6. **The dev route** (browser). `titleRequested(search, dev)` goes ahead of every other route in `createMapRenderer3d`, and only in DEV. It returns a `MapRenderer3d` wrapper (`createTitleRenderer3d`), so `main.ts` runs it unchanged. `planHidesHud` returns true for `?title=splash|title` in dev, so the HUD is hidden.

**Test count:** 2 added, as the ticket allows. Both pass: `npx vitest run --maxWorkers=2 src/render3d/title3d.test.ts` reports 2 passed, tests 118 ms, file 6.2 s. Nearly all of that time is collecting the module-level stage 01 city build (collect 5.7 s, about the same over two runs).

## Rule conflicts and risks
- `src/grid/` and `src/night/` are untouched. There is no new dependency. No GDD Decided rule is near. Every source file is in `src/render3d/`, the renderer's folder.
- `src/render3d/planview.ts` (`planHidesHud`) is not on the ticket's file list. The change is two lines, in the owner's folder, and it is the means of criterion 6's "no ui". This is not a folder break.
- `renderer.ts` was to change for "the `title=` dev route only". The branch also moves the per-canvas `WebGLRenderer` cache (`glByCanvas`) out of `renderer.ts` into `title3d.ts` as `glForCanvas`, and the play and plan routes now take their renderer from there. Behaviour is the same: one renderer per canvas, shared. But the page's one GL cache now lives in the title file.
- The file runs 6.2 s, over the 2 s new-file budget. The ticket requires criterion 3's case "on stage 01's city" (one city, test policy rule 2), and that city build is the whole cost, so I take the ticket's own requirement as the reason. The policy wants that reason stated in the ticket, and it is not.
- `titlePoses` puts the camera on the far side of a building whose front is `+x`. Looking north, that building would stand on the left of the screen, not the right. Stage 01's building is placed right, as the test shows, so the ticket is met. A future change of stage 01 or of the plan could flip it, and the test would catch that.
- On splash to title, the sky eases from `splashTurn(lastT)`, which is never wrapped, to `titleTurn(t)`. A long splash (for instance a slow model load under T3's "whichever is later") would spin the sky through `1.5 * seconds` degrees in 1.5 s. This may occur, not checked.

## Must fix
none

## Could improve
1. `src/render3d/title3d.test.ts`: criterion 4 names "a small fixture plan", and the case uses the stage 01 city instead. It adds no time, because the city is already built for criterion 3's case, and it would fail on an unfiltered layer. So I don't count it as "a whole-city test where a fixture would do", whose concern is cost. If the architect wants the letter of the criterion, a hand-made fixture plan would satisfy it, but it would add code and no coverage.
2. `src/render3d/title3d.ts`, `setMode`: wrap `fromTurn` to the turn nearest `titleTurn`, i.e. `((fromTurn - target + 180) mod 360) - 180 + target`. Then a long splash eases at most half a turn into the title.
3. `src/render3d/title3d.ts`, `titlePoses`: for a `+x` front, either look from the other side or mirror the offset, so the building stays on the right whatever stage 01's building faces. Or document that the pose assumes a front that is not `+x`.
4. Record the criterion 5 perf=1 numbers (frame time, programs compiled after `ready()`) in the ticket or the PR before merge, so the 16.7 ms bound has evidence.
5. Leave the `glByCanvas` cache in `renderer.ts`, or put it in a small module of its own, rather than in `title3d.ts`. The play view's GL renderer would then not depend on the title file. And name `planview.ts` in the ticket's file list after the fact.
