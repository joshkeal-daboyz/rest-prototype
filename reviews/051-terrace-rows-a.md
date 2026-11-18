ticket: 051-terrace-rows-a
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A only, design item 6: a dev-only street camera (`&cam=street[&run=N][&at=T][&light=day]`). It renders through its own PerspectiveCamera and looks obliquely along one row of lots from the road. While it is on, nothing can be picked and the play rig doesn't move. It logs one ready line, and it is read only behind `import.meta.env.DEV`. Nothing else in play changes.

## Does the branch do it?
The diff against `goal/city-style` touches three files: new `src/render3d/streetcam.ts`, new `streetcam.test.ts`, and `renderer.ts`. Those are exactly the files section A lists. I ran `streetcam.test.ts` alone: 26 passed. I did not re-run the full suite, as instructed.

- **Criterion 1 (`streetCamRequested`).** `streetcam.test.ts` "parses cam=street, run, at (clamped to 0..1) and light=day" checks clamping above 1 and below 0, a negative run, and defaults for unreadable values (`run=two`, `run=1.5`, `at=`, `light=night`, `cam=Street`). Met.
- **Criterion 2 (`streetPose` on 09 and 64).** Each part has its own test:
  - "stands the eye above ground, outside every lot and place, over a road or pavement" covers 12 rows x `at` in {0, 0.5, 1}. It uses its own ray-cast and box tests, not the module's `inside`, so the check is independent.
  - "looks at the row's front line" checks the look point against the row's front line.
  - "gives the same pose for the same inputs" covers determinism and run wrapping.
  - The "three lots framed" check reprojects through a real Three `PerspectiveCamera` (`framedBy`), not the module's own `framedLots`, so the framing is checked independently. It covers only rows of four or more lots with no cap above 16 m (`framable`). The builder flagged this.

  I accept the narrowing. Before 051 B, rows are lot chains, and a two-lot row can't contain three lots. The 28 m tower cap is outside the terrace caps that B will introduce. The test also asserts at least three such rows per map, so it can't pass on an empty list. Met, with the caveat under Could improve 1.
- **Criterion 3 (picks off, rig unchanged, default path).**
  - "picks nothing" covers `hitTest`. "leaves the play rig exactly where it is under draw, pan, zoom, fit and centring" compares `rig.camera.matrixWorld`, pan and scale before and after, and checks that every render call went to the street camera.
  - These tests drive `streetMode` over a fake base, not the real `createMapRenderer3d`. That needs WebGL, so this is reasonable.
  - The source test "renderer.ts reads the flag only in a dev build..." pins every street use in `renderer.ts` behind `import.meta.env.DEV`.
  - I read the diff. With `street` null, `resize` passes `FOV_DEG` as before, `markReady` is skipped, and `play` is returned as before. `townLayout(puzzle)` is called only when the flag is set. The default path is unchanged. Met.
- **Criterion 4 (built `dist/` has no `street camera:` string).** This is the main session's check. Every call into `streetcam.ts` sits in a `DEV && ...` branch that Vite folds to false. The only literal with the string is inside `createStreetView`, so it should be tree-shaken. I didn't build. Can't tell from here.
- **CI-safe rules.** No test reads `assets/private/`. The describe-level reads are `puzzles/*.json` and `src/render3d/renderer.ts` through cwd-relative POSIX paths, as other render3d tests do. There are no timers and no Windows paths. `git ls-files assets/private` is empty, and no pack file is in the diff.
- **Builder's adaptations.**
  - `STREET_CAM_BACK_M = 26` is kept as a maximum. The eye stops at the far edge of the first stretch of road or pavement, which is about 12 m out.
  - The 35-degree view is tried first. 45, 55 and 65 degrees are fallbacks, each costed against lens width. The lens opens from 50 up to 85 degrees.
  - The look point rises to 0.65 of the row's median cap when that is above 6 m.
  - Past the middle of the row (`at` over 0.5) the view is mirrored. A test covers this.

  None of this touches a Decided rule. All of it serves criterion 2, which can't hold with the eye 26 m back inside a lot. The ticket's design item 6 is a default, and the adaptations are documented in the module's doc comment. I'd still name them to Josh, since they differ from Open question 6's "26 m back".

## Rule conflicts and risks
- No file outside section A's list. Nothing in `src/grid/`, `src/night/` or `src/core/`. No new dependency (`HemisphereLight` and `PerspectiveCamera` are Three's, and Three is approved for `src/render3d/`).
- `streetcam.ts` takes `MapRenderer3d` from `./renderer` as a type-only import, so there is no runtime cycle.
- While the street camera is on, `bundle.setViewport` gets the street lens's fov. That rescales the caption and bar units for that lens. This is dev only and probably desirable.
- The `fronts` overlay set up in the models `.then` still passes `FOV_DEG`. That only matters with both `cam=street` and the fronts flag on (a dev-only combination).
- The fallback eye when nothing is standable (`0.15 + 0.45 + 0.55`) is a hard-coded guess at 041's road widths, not taken from the town. No test reaches it on the two maps.

## Must fix
none

## Could improve
1. `streetcam.test.ts` `framable`: once 051 B gives `town.terraces`, widen the framing test to every terrace run, or state the excluded rows explicitly. That keeps the exclusion of three-lot rows and 28 m towers from hiding a real framing miss later.
2. `renderer.ts`: in the models `.then`, pass the street lens's fov to `fronts.setViewport` when the street camera is on, so the fronts overlay matches the street view.
3. `streetcam.ts`: take the no-ground fallback distance from the town's road and pavement widths, or drop the fallback and return the best pose found. Either replaces the literal `0.15 + 0.45 + 0.55`.
