ticket: 045-click-to-calibrate-fronts
verdict: pass
regressions: 0

## What the ticket meant to change
Section 0 only: add the calibration file's validator and helpers (`calibrationKey`, `parseCalibrationKey`, `validateCalibration`, `applyCalibrationPatch`, `emptyCalibration`) to `src/core/calibration.ts`, with tests. The ticket says play is unchanged.

## What I ran
No replay, by design. `git diff --stat main...ticket/045-click-to-calibrate-fronts-0` (637f5e0) shows two files: `src/core/calibration.ts` and `src/core/calibration.test.ts`, both inside the ticket's Section 0 Files. `npm run playtest` was not run: nothing a map replay exercises can have moved.

Reasoning:
- `grep` over `src/`, `tools/`, `tests/` and `vite.config.ts` for the file's exports (`CalibrationKey`, `CALIBRATION_*`, `CalibrationEntry`, `notBuilding`) finds only the file and its test. Nothing in `grid`, `play`, `render`, `render3d`, `ui`, `night` or `main.ts` imports it.
- `src/core/index.ts` already re-exported the module on `main`. The diff doesn't touch it.
- The diff only adds pure functions and constants, plus one removed optional field (`notBuilding`) that nothing reads.
- No `puzzles/`, no control, fault or cue was added, so no script or map needs adding.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The ticket's Section 0 criteria don't list `validateCalibrationPatch` and the exported `CALIBRATION_FRONTS`, which the diff adds. This is for the reviewer, not play.
