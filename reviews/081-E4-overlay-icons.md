ticket: 081-E4-overlay-icons
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section E4 of ticket 081: remove the overlay's straight lines (Josh, 24 Nov 2026: "the 3d wires are apparent enough, however the icons are important"). Keep the component icons, and draw the break icon at the real cut: the projected middle sample of the cut span from `jobWires`, shown only while the fault is readable. Clicks go to an icon, then a break (which gives its line id), then the 3D pick.

## Does the branch do it?
Reviewed `git diff origin/main...ticket/081e4-overlay-icons` (3 files: `src/render3d/overlay.ts`, `src/render3d/cityview.ts`, `src/render3d/overlay.test.ts`). `npx vitest run --maxWorkers=2 src/render3d/overlay.test.ts`: 16 passed, 5.6 s. The slow case is the existing, untouched `loadCityView` case (2.4 s).

1. **No lines: met.** `OverlayLine`, `overlayLines` and `overlayLineHit` are deleted from `overlay.ts`, and a grep of `src`, `tools` and `tests` finds no reference left. `strokeLine` and the line loop are gone from `paintOverlay` in `cityview.ts`, so the overlay draws no segment, pulse or flicker. The 3D glow and pulses are untouched. `overlayIcons`, `overlayHit` and `placePoint` keep their signatures. The case "one straight segment per line ..." is removed, as asked.
2. **Break icon at the real cut: met.** `overlayBreaks(converted, state, cutAt, project, ctx)` in `overlay.ts` loops over `state.faults`. It keeps only damaged cables that are in `state.readableFaults`, looks up `converted.cuts[f.id]` and projects `cutAt(span)`. It skips a point behind the camera or off screen, uses `hit = max(iconSize, OVERLAY_HIT_PX)`, and sets `sparking = powered && sparking` for the line. `cityview.ts` builds `cutAt` from `wires` (`jobWires`) at `pts[(SAMPLES/2)*3..]`, divided by `S` (the pts are in world units, so this gives metres, which is what `cameraProject` takes). The rewritten case "a damaged cable's break icon sits at the cut span's middle sample ..." checks: none before `sw_1` is thrown; one after, at the projected point (330, 320), sparking, with `hit >= OVERLAY_HIT_PX`; none behind the camera (`projector(40)`); none after `repairAt("l_b")`. A repaired fault does not linger, because the function reads `state.faults` itself.
3. **The camera's projection: met.** The rewritten case uses a real `PerspectiveCamera` with `cameraProject`. It checks that `sw_1`'s icon sits at its place's projection, and that a break sits at `cutAt`'s point projected.
4. **Clicks: icons, then 3D: met.** `cityHit` is now `overlayHit ?? overlayBreakHit ?? pick`, and `HitInputs.lines` is now `breaks`. `overlayBreakHit` hits within `hit / 2`, nearest first, and returns `lineId`. Two cases are rewritten. The break-hit case checks within, nearest first and a miss; its off-screen leg runs through `overlayBreaks` (x = 5000 is dropped). The `cityHit` case checks icon, then break at (115, 0), then pick at (85, 0), which was a point on the old segment, with panels and off-canvas points still null. In the overlay=0 case, `lines: []` became `breaks: []` in the body only.
5. **The 2D map is not touched: met.** The branch changes nothing in `src/render/`. Only the imports of `LINE_LIVE`, `NODE_DEAD` and `PULSE_SPACING` were dropped from `cityview.ts`, and the E1 icon cases are unedited.
6. **Browser.** This is for Josh to play. The main session reports icons only, a break X on the cut span, and the hover text "Damaged cable — Repair (wire)".

Test count against main: 0 added, 4 rewritten, 1 removed, all in `overlay.test.ts`. That matches the ticket's count and is within the cap of 15. Each rewritten case names its rule and would fail if that rule broke.

Files: all three are on the ticket's list. `jobFrame` and `loadCityView` are untouched. The branch does not touch `circuitdraw.ts`, `componentmodels.ts`, `src/render/`, `src/play/`, `src/core/` or `src/ui/`.

## Rule conflicts and risks
- None found. The branch touches nothing in `src/grid/` or `src/night/`, adds no dependency and changes no GDD rule. "Only when readable" holds, and so does "letting go keeps the part" (no change to the repair flow).
- The builder reported a flaky timeout in the untouched `loadCityView` case on a cold run. It passed here at 2.4 s. That is machine load, not a finding.

## Must fix
none

## Could improve
1. `cityview.ts`, the `cutPoint` map. The break icon sits on sample point `pts[SAMPLES/2]`. E2's sparks use `segMid[wi*SAMPLES + SAMPLES/2]`, which is the middle of the segment *after* that sample, about 1/16 of the span further along. The ticket asked for both at once ("the middle sample ... the point E2's sparks use"), and the builder followed the literal `pts` sample. The gap is a few pixels, but reading the spark point from the same `segMid` entry would make them coincide exactly.
2. `cityview.ts`, `paintOverlay`. The old line had a hover ring, and the break X now has none, although `overlay.hover` can hold its line id. A ring around a hovered break would match the icons. The ticket did not ask for this.
3. `overlay.test.ts`, the break-hit case. Its last line builds `fixture()` twice in one long expression. Splitting it into a local would make it easier to read.
