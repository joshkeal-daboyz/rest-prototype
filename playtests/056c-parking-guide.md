ticket: 056c-parking-guide
verdict: pass
regressions: 0

## What the ticket meant to change
Section C adds the parking guide text to the city style guide and its guard test; no play behaviour.

## What I ran
`npm run playtest` at fbb4459 (detached, D:\rest-prototype-gate): 130 tests, 130 passed, 0 differed. `git diff 8724149..fbb4459 --stat` shows only docs/city-style-guide.md and src/render3d/styleguide.test.ts, so nothing a replay reaches could have moved.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
Nothing.
