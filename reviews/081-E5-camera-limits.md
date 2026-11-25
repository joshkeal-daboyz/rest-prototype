ticket: 081-E5-camera-limits
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
In the city play view, the camera opens on the puzzle's district and can't zoom out past `CITY_PLAY_ZOOM_OUT` (1.5) times `D0`, the distance at which the district fills the whole canvas with the panels ignored. It can't pan off the district either, at any window shape. `cam=free` lifts the limit in a dev build only. The rig is unchanged without the new option, and criterion 5 measures draw calls and frame time against `main`.

## Does the branch do it?
Diff read against `origin/main` (ca712dc): `src/render3d/tilecity3d.ts`, `src/render3d/cityview.ts`, new `src/render3d/cityrig.test.ts`, `docs/design/081-F-measurements.md`, plus the ticket text. All of them are on the ticket's file list. `npx vitest run --maxWorkers=2 src/render3d/cityrig.test.ts`: 3 passed, 48 ms of tests.

1. **A limited rig, by option: met.** `createCityRig` takes `rigOpts.limit?: { zoomOut }`. Without it, `fit()` sets `viewInsets = insets` and runs the same binary search as before (now `search()`), and `zoomStep` keeps `fitDist * CITY_ZOOM_OUT`. So the unlimited rig behaves as today. `tilecity3d.test.ts` and `plan3d.ts` are not in the diff. `resize` still calls `fit()`, which works `D0`, `Dmax` and the opening out again for the new size and insets.
2. **Zoom-out and pan limits: met.** `maxDist = max(d0, d0 * zoomOut)`, so `Dmax` is never under `D0`, and `zoomStep(-1)` clamps at `maxDist`. `clampT` is unchanged and holds the target inside the frame. `resetView` is `fit`. Test 1 in `cityrig.test.ts` takes 40 steps out and checks the scale equals the opening's divided by 1.5 (within 1e-6). It then checks that pans of plus and minus 1e6 px and centres at plus and minus 1e5 land on the frame's x edges, and that `resetView` restores the opening's scale and a zero pan. It checks x only, not z, but `clampT` treats the two axes alike.
3. **The opening at any shape: code met, test partly.** `fit()` gives the opening `min(Dfit, Dmax)`, with `Dfit = Infinity` when there is no free area, as the ticket specifies. Test 2 loops over the four sizes:
   - With no insets, every ground and roofline corner projects inside the canvas.
   - With 30 % of the height free, and with insets taller than the canvas, the opening is finite and no further than `Dmax`.
   - The third bullet ("the opening is `Dfit`: the district sits in the free area, clear of the panels") is not pinned. The `roomy` case only checks `D0 <= opening <= Dmax`. A rig that ignored the insets and always opened at `D0` would pass it, and so would the 30 % case, with the district under the panels. That is the one behaviour E3 made and this section must keep. See must-fix 1.
4. **The play view uses it; `cam=free` lifts it: met.** `playRigOptions(search, dev)` is pure and exported. `createCityPlayRenderer3d` passes `playRigOptions(opts.search ?? "", import.meta.env.DEV)` and prints one `console.info` line while `cam=free` is on. Test 3 covers the default, `cam=street`, `cam=free` in a build and `cam=free` in dev, as the criterion lists.
5. **Frame time and draw calls, measured: partly.** The block "E5, criterion 5" in `docs/design/081-F-measurements.md` was taken in the pane on Josh's PC, with main and the branch side by side.
   - **800 x 570, opening:** main 3,465 draw calls, 11.07 M triangles, 14.0 ms. Branch 2,530, 9.08 M, 11.3 to 13.2 ms. Lower, as expected. It is still above the desktop's 1,779; the block puts that down to the wider aspect. The ticket's "near 1,774" was an expectation, not the stop rule, so this is not a failure.
   - **Desktop 1287 x 1178, opening:** branch 1,779. This implies `Dfit <= Dmax` there, so the first stop rule (panels covering the district at the desktop opening) is not tripped. The main row is borrowed from the FX2 table (1,774 with effects off), not taken in the same run.
   - **Furthest zoom-out:** the criterion asks for this row at both sizes on both builds. There are no numbers on either build at either size. At 800 x 570 there is no number for main's furthest view, only for the branch, whose opening is its furthest. At the desktop pane there is only "looks the same by eye", because `perf=1` logs only the first 300 frames after load. The ticket expected that problem and named a way round it ("zoomed out before the models finished loading"). So the second stop rule ("a branch number higher than main's at the same view") is checked only at the opening.
   - By geometry the furthest rows should hold. `Dfit >= D0` always, so main's furthest, 1.6 x `Dfit`, is beyond the branch's 1.5 x `D0` at every size. But that is inferred, not measured, and the criterion is a measurement. See must-fix 2.
6. **Josh plays it.** Not mine to judge.

The count is 3 new cases, 0 rewritten. The new file has no city build and its tests take 48 ms, so it is within the test policy.

## Rule conflicts and risks
- No hard-rule break: no `src/grid/` or `src/night/` change, no file outside the ticket's list, no new dependency, no Decided rule touched.
- Brief question 4 ("a map the player can see whole") still holds. At `Dmax` the whole frame fits the canvas, because `Dmax >= D0`.
- On a small pane the opening is held at `Dmax` and the panels may cover the district's edge. This is E5-Q3 as Josh answered it ("Hold at the limit"), not a defect.
- When the free area is positive but too small to fit the district, `search()` hits its 3,000-unit ceiling and the `min` with `Dmax` takes over. That is correct, but it costs one wasted 32-step search on every resize.

## Must fix
1. In `src/render3d/cityrig.test.ts`, test 2 (the `roomy` case, and the 30 % case where it opens below `Dmax`) needs to check that the district sits in the free area. Project the frame's ground and roofline corners and assert each lands inside the area the insets leave free: for `{ bottom: h * 0.1 }`, screen y at most `0.9 h`, i.e. NDC y at least `-0.8`. Effect: a rig that opens at `D0` and ignores the panels fails, which today it would not. Criterion 3's third bullet is then covered. No new case is needed.
2. In `docs/design/081-F-measurements.md`, criterion 5 needs the furthest-zoom rows: draw calls, triangles and median frame, at 800 x 570 and at the desktop pane, on main and on the branch. Hold the view by zooming out before the models finish loading, as the ticket suggests, or by any other way the block states. Ideally retake main's desktop opening in the same session instead of borrowing FX2's effects-off row. Effect: the second stop rule is checked at the furthest view, as the criterion requires, rather than by eye.

## Could improve
1. `fit()` could skip the second `search()` when the free area is smaller than the district can ever fit (or cap `hi` at `maxDist`), saving a wasted search on each resize on small panes.
2. Test 1 could also check z on one pan, so that both of `clampT`'s axes are covered at `Dmax`.
