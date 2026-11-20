ticket: 070f1-buildings
verdict: pass
regressions: 0

## What the ticket meant to change
F1 adds the city buildings stage (src/city/buildings/); round 2 only applies the reviewer's fixes inside that folder.

## What I ran
Not run, per instruction. Since round 1 the diff touches only src/city/buildings (check, group, stage and two tests) plus the review file. The harness imports nothing from src/city or src/render3d.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
none
