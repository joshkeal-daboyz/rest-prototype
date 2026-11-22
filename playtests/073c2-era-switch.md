ticket: 073c2-era-switch
verdict: pass
regressions: 0

## What the ticket meant to change
The 3D plan view reads `era` (unknown falls back to `clean`), draws via `resolvePlan(plan, era)` above `clean`, and gains an era switch that leaves the camera alone; `clean` draws as before.

## What I ran
`npm run playtest` (--maxWorkers=1) at 60e2370: 130 tests, 130 passed, 0 differed. Diff against `goal/city-transformations` is the ticket's files only (`src/render3d/planview.ts`, `plan3d.ts` and their tests, plus new `eraview.test.ts`).

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (render3d is not reachable by the map replay)

## Noticed
- Criterion 3 (switch steps four eras, camera fixed) and the draw-call cap are for the main session's phone screenshot; the headless harness cannot see them.
