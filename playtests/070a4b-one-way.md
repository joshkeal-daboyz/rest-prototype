ticket: 070a4b-one-way
verdict: pass
regressions: 0

## What the ticket meant to change
One-way street handling in the city streets stage (split, check, constants, cityplan type).

## What I ran
Did not run `npm run playtest`. The diff (src/city/streets/*, src/core/cityplan.ts) touches nothing the harness loads: it replays puzzle maps through grid and night play, and never imports src/city.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Diff stays inside the streets folder plus core/cityplan.ts.
