ticket: 073f1-ruin-growth
verdict: pass
regressions: 0

## What the ticket meant to change
Add the `ruin` era's growth stage (stage 13: ground, walls, vines; roofs off behind `RUIN_ROOF_GROWTH`) as an `ERA_STAGES` entry, so the clean city and earlier eras stay unchanged.

## What I ran
`npm run playtest -- --maxWorkers=1` at 08b1355 (round 2): 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none (round 1 had none)

## Added to the harness
nothing

## Noticed
- The harness replays circuit maps only; it cannot see the city pipeline, so the F1 round-2 changes rest on the city folder's own pins.
- The branch-vs-main stat is huge because main lacks the goal branch's work; I could not isolate the round-2 diff from it.
