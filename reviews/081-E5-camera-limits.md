ticket: 081-E5-camera-limits
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
In the city play view, the camera opens on the puzzle's district and can't zoom out past `CITY_PLAY_ZOOM_OUT` (1.5) times `D0`, the distance at which the district fills the whole canvas with the panels ignored. It can't pan off the district either, at any window shape. `cam=free` lifts the limit in a dev build only. The rig is unchanged without the new option, and criterion 5 measures draw calls and frame time against `main`.

## Does the branch do it?
This is round 2. Since round 1 (3463255) only two files have changed: `src/render3d/cityrig.test.ts` (0e5cf4d) and `docs/design/081-F-measurements.md` (e7c8788). `tilecity3d.ts` and `cityview.ts` are as I reviewed them in round 1, so criteria 1, 2 and 4 stand as met there. `npx vitest run --maxWorkers=2 src/render3d/cityrig.test.ts`: 3 passed, 28 ms of tests.

1. **A limited rig, by option: met** (unchanged since round 1). Without `limit`, `fit()` and `zoomStep` behave as before.
2. **Zoom-out and pan limits: met** (unchanged). Test 1 covers the `Dmax` clamp, the pan and centre clamps on x, and `resetView`.
3. **The opening at any shape: met now.** Round 1's must-fix 1 is done. The `roomy` case in test 2 now uses insets on all four sides: 5 % top, 10 % bottom, 5 % left and right. For each of the four window sizes it checks two things:
   - The opening is strictly further than `D0` and no further than `Dmax`.
   - All eight frame corners (ground and roofline) project inside the free area, in pixels.

   A rig that ignored the insets would open at `D0`, where the district fills the canvas in its tighter axis. Its corners would then fall in the inset bands, so it fails both checks. The third bullet ("the district sits in the free area, clear of the panels") is now pinned. The fix rewrote assertions inside an existing case and added no new case.
4. **The play view uses it; `cam=free` lifts it: met** (unchanged). Test 3 covers it.
5. **Frame time and draw calls, measured: met as waived.** The opening rows stand as in round 1. Round 1's must-fix 2 asked for the furthest zoom-out rows. Josh waived it on a card ("Waive it (Recommended)"), and `docs/design/081-F-measurements.md` records that under the criterion 5 block. I treat it as closed. The geometric argument from round 1 still says the branch's furthest view is no further than main's at any size: `1.5 x D0 <= 1.6 x Dfit`, because `Dfit >= D0`.
6. **Josh plays it.** Not mine to judge.

Count against `main`: 3 new test cases, 0 rewritten. No city build, 28 ms. That is within the test policy.

## Rule conflicts and risks
- No hard-rule break. No `src/grid/` or `src/night/` change, no file outside the ticket's list, no new dependency, no Decided rule touched.
- On a small pane the opening is held at `Dmax`, and the panels may cover the district's edge. This is E5-Q3 as Josh answered it ("Hold at the limit"), not a defect.
- The waiver line is dated 25 Nov 2026. The commit that records it is dated 24 Nov 2026, 20:34 at -0500. This is probably a time-zone difference. The main session may want to check the date against Josh's card before the merge commit quotes it.

## Must fix
none

## Could improve
1. `fit()` could skip the second `search()` when the free area is too small for the district ever to fit, or cap `hi` at `maxDist`. That would save a wasted 32-step search on each resize on small panes. Carried over from round 1.
2. Test 1 could also check z on one pan, so that both of `clampT`'s axes are covered at `Dmax`. Carried over from round 1.
