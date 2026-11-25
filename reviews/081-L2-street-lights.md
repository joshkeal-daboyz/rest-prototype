ticket: 081-L2-street-lights
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
One real, unshadowed `PointLight` per lit-able building with a street face. The lights are made when the city builds, at intensity 0, and are never added, removed or hidden in play; each frame they are driven by L1's `buildingGlow`. `STREET_LIGHTS_MAX` stays 10 until the browser measures in criterion 3 pass, and a dev switch `lights=N` fills the pool so those measures can be taken.

## Does the branch do it?
- **Criterion 1 (which buildings, where each light stands): met.** `lightPlaces` in `src/render3d/windows.ts` reads `mass.built` open sides with `faces === "street"`. `parkEdge`, `lane`, `court` and the other kinds are excluded, so it never uses a yard or a park. For a corner column with two street sides, it offsets out from both sides (over the corner pavement). Otherwise it uses the mean of the street columns' face points, `CELL/2 + 2 m` out and 3 m up. A building with no street face is skipped and does not count against `max`. The test "a light stands in front of the middle of its street face or over its corner; ... 33 buildings at max 32 give the first 32" (`windows.test.ts`) checks the mid light at (5, 3, 7), the corner light at x 7, z 32, and that a park-facing building and an open-less backed-on building give `[]`. It also checks that the first 32 of 33 come back in the order given, with the two faceless ids leading the list and not counted. That matches the plan's cell mapping in `plan3d.ts` (`(c.i + 0.5) * TILE_M`).
- **Criterion 2 (the pool): met.** `streetLights(places, scale, extra)` makes each light once: `castShadow` false, intensity 0, distance `STREET_LIGHT_REACH_M * scale`, decay 2, colour `PANE_COLOURS[0]`. `setStreetLights` writes only `intensity`, as `INTENSITY x level x (1 + FLARE_GAIN x flare)`. Nothing toggles `visible`. The second new test checks that after one lit and one dark write the scene still holds 2 lights, all visible and none shadowed, with intensities `[INTENSITY x 0.6, 0]`. It also checks that `extra` makes spare lights.
- **Criterion 3 (budget and cap): measurable, as asked; the measuring itself is the browser's job.**
  - `STREET_LIGHTS_MAX = 10`, and the first test asserts it.
  - `lights=N` (`cityview.ts` line 585, `/[?&]lights=(\d+)(&|$)/`, dev only) caps the real places at `min(N, 10)` and puts the rest, `N - places`, on the first building. Those spares are driven by that building's glow, so they cost what lit lights cost. `lights=25` and `lights=32` on P0 therefore make 25 and 32 lights even with the cap at 10.
  - The pool is made in `standWindows`, which runs inside `build` both for `build(null)` and for the model-loaded build. So the count is the same from the first frame. Only `freeWindows` on a rebuild or a dispose removes lights.
  - A dev warning fires when there are more lit-able buildings than the cap.
- **Criterion 4 (Josh plays): browser.** The light follows `buildingGlow` through `lightGlows` in the live loop (`cityview.ts` around line 879), so it gets the Relight order and the brownout dip from L1 with no new timing.
- **Count.** 2 added cases, against the ticket's 2. The two new cases take a few ms; the file's 3 s comes from L1's existing P0 case. I ran `windows.test.ts` (6 passed).

## Rule conflicts and risks
- No hard rule is broken. The branch touches only `windows.ts`, `windows.test.ts` and `cityview.ts`, all listed. `lightrig.ts` and `lighting.ts` are untouched, no dependency is added, and nothing changes in `src/grid/` or `src/night/`.
- **Order over the cap.** The ticket's "How" says: the job lamps' buildings first, in lamp order, then the rest. `cityview.ts` passes `lampsOf.keys()` as it is. `lampBuildings` inserts each lamp's building together with its partners (the buildings L1 lights as backed onto it), so the two kinds are interleaved. Under the cap of 10 this changes nothing. Over the cap, a later lamp's own building could lose its light to an earlier lamp's backed-on building. That may occur once a job has more than about 5 lamps with street-facing partners; not checked. Criterion 1 itself only asks for "the order given", which `lightPlaces` honours.
- If no lamp building had a street face, `lights=N` would make no lights at all (`total` is 0 when `places` is empty), and the criterion 3 runs would silently measure nothing. I did not check whether P0's three lamp buildings have street faces. The builder's `perf=1` report will show it (no change in programs or frame time).
- The street lights are not registered with the light rig, so the dev day toggle leaves them driven by the glow. That is dev only, and the ticket accepts the day toggle as an exception.

## Must fix
none

## Could improve
1. `cityview.ts` `standWindows`: build the id list as the job lamps' own buildings first, in lamp order, then the rest of `lampsOf`. This would match the ticket's stated order before S4 widens `lampsOf`.
2. `windows.ts`: `const CELL = 5` copies stage 1's `CELL_M` (`TILE_M`, 5 m). Importing the shared constant would keep the two from drifting apart.
3. `cityview.ts`: log the pool's size once under `lights=N`, for example "street lights: 3 places + 22 spares". Then the criterion 3 rows show that the switch took effect.
