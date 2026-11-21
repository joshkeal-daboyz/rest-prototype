ticket: 070g2-plan3d-ground
verdict: pass
regressions: 0

## What the ticket meant to change
Plan-3D assemble draws the stage-7 ground pieces (shops, doors, corners) in each building's colourway; nothing else in play changes (criterion 6).

## What I ran
Playtest suite (tests/playtest/vitest.config.ts, --maxWorkers=2, tsc step skipped as the gate ran it) at a5d0730: 130 tests, 130 passed, 0 differed. Diff vs goal/city-style 455db33 touches only src/render3d/plan3d.ts and plan3d.test.ts, both in the ticket's Files.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
The harness does not reach the plan-3D renderer (it is a draw-only change with no replayable control). Ground-piece drawing, the exactly-once check and the draw-call report belong to plan3d.test.ts; criterion 7 is the main session's browser check.
