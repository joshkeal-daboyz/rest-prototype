ticket: 081-E3-district-frame
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section E3 of ticket 081: the opening camera (`resetView` and `fitWhole`) should frame the puzzle's district, its four streets, the job's places and wires and the feed, instead of every pole, span and drop in the 6 x 6 city. The frame comes from a pure, exported `jobFrame(view, layer, streets)` in `cityview.ts`, and `loadCityView` now also returns the puzzle's `district`.

## Does the branch do it?
I reviewed the builder's commit 527b195. The rest of `git diff origin/main...HEAD` (the ticket, reviews, the `src/core/citycircuit.ts` types, the 070-K1 note) comes from the architect's cut 92bbc83 on `ticket/081-puzzles-on-the-city`, which reaches this branch through the merge. The builder touched only `src/render3d/cityview.ts` and the new `src/render3d/cityframe.test.ts`, which are the files the ticket lists.

1. **The frame is the job's: met.** `jobFrame` in `cityview.ts` grows the frame over the following, all in metres, then scales to world units at the end:
   - every `converted.places` entry, through `placePoint` from `overlay.ts`, which returns metres;
   - both ends of every pole span and roof span in `converted.runs[*].spans`;
   - each run's drop (its pole and wall point) and lead post;
   - each district block out to the far side of each `sides[*].street`, using `across0` and `bands.length` on the cross axis;
   - `converted.origin_m`, with `FRAME_MARGIN_M` (16 m) round each point.

   Nothing from `draws` is read. If nothing grows the frame, it falls back to the whole city rectangle, as before. The test in `cityframe.test.ts` is one case on `city-two-ways-round` (6 x 6, seed 1, one-way). It asserts that:
   - every run's span ends and drop are inside the frame;
   - the district's street-to-street box is inside the frame;
   - no pole inside the frame lies more than 41 m (one street of 25 m plus the 16 m margin) past that box.

   The last assertion is the one that would fail on the old whole-city frame. The test is real.

   On "through the module cache", the builder's question: `sharedCity(DEFAULT, "clean")` is the per-worker module cache (`cached(...)` in `namedcities.ts`). `DEFAULT` is 6 x 6, seed 1, one-way on, which is the puzzle's `city` block, and the `clean` profile runs every built stage. `overlay.test.ts` already builds its view with the same `loadCityView(city, () => run)` pattern. So it matches the ticket's wording.
2. **`loadCityView` writes `district`: met.** It returns `district: city.district`. The test asserts `view.district` equals `city.district`, folded into criterion 1's case as the ticket allows.
3. **`resetView` and `fitWhole` use it: met by code; checked in the browser.** `createCityPlayRenderer3d` now calls `const frame = jobFrame(view, layer, streets)` and passes it to `createCityRig`. Both `resetView` and `fitWhole` call `rig.resetView()`, which is `fit()` over that frame. No test case was added. `createCityRig` can be built without a canvas, but the wiring sits inside the WebGL renderer, so a rig-only case would not test it. The criterion allows "browser" instead, and the main session checked at desktop size and in a tall narrow window. Whether the builder said why is in its report, which I did not see.
4. **The view opens on the district at desktop and phone size: Josh's to judge in the browser.** The question I was asked was whether the code accounts for a narrow portrait screen. It does:
   - `createCityRig`'s `fit()` binary-searches the camera distance until all eight corners of the frame (ground and the 6-unit roofline) project inside the free area on both axes.
   - That check uses the camera's real aspect (`size.width / size.height`) and the page's insets.
   - `resize()` and `setInsets()` both call `rig.resize(...)`, which runs the fit again.
   - The frame is a convex box and every corner is in front of the camera, so if the corners fit, the whole frame fits.

   A portrait screen only moves the camera further back. From the code, the 375 x 812 crop of the shrine and infirmary is more likely Josh's tap, which pans or zooms the view, than E3's frame. Other possible causes are tall phone insets that left a small free area, or a roof taller than the 33 m roofline. I did not check these. A fresh load at phone size, with no tap before the shot, would settle it.

Test time: 3.2 s. Nearly all of it is the one seed 1 city build, which the ticket exempts from its 2 s limit. The case count is 1 added, against "at most 2".

## Rule conflicts and risks
- None found. Nothing changes in `src/grid/` or `src/night/`, nothing outside the listed files, no new dependency, and no GDD Decided rule.
- One risk to note: `jobFrame` always includes the whole district out to its far streets. A puzzle whose district is many blocks will open zoomed out to match. That is what E2's criterion 9 asks for.

## Must fix
none

## Could improve
1. `src/render3d/cityframe.test.ts`: criterion 1's test text says "the frame holds every place". The case checks run ends, drops and the district box, but never loops over `converted.places` or checks `converted.origin_m`. One more loop with `placePoint` would cover the place half of the rule. It costs nothing and adds no case.
2. `src/render3d/cityframe.test.ts`: the test recomputes the district's street box with the same arithmetic as `jobFrame`, so a mistake in that arithmetic would appear in both. The pole-distance check is independent and carries the case, so this is minor.
3. For the phone check in criterion 4, ask Josh for a fresh load at phone size with no tap first, before treating the 375 x 812 crop as a fault.
