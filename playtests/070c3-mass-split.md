ticket: 070c3-mass-split
verdict: pass
regressions: 0

## What the ticket meant to change
Section C3: the mass stage's lot splitting and checks (src/city/mass/ only).

## What I ran
Did not run `npm run playtest`: the diff from 070a4-split-plan touches only src/city/mass/ (7 files); nothing imports it from the map play path (grep: no importers outside the folder, none in tests/playtest). Zero maps could differ.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Mass-stage behaviour belongs to its own unit tests in src/city/mass/.
