ticket: 073d1g-tech-walls-drawn
verdict: pass
regressions: 0

## What the ticket meant to change
At era tech and later the 3D plan view draws D1's wall bolt-ons, signs, shopfronts and pavement tech and drops removed pieces; at clean the draw is exactly today's.

## What I ran
`npm run playtest -- --maxWorkers=1` at d96304a (round 2): 130 tests, 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (the change is renderer-only, 3D plan view; no control, fault or cue a map replay reaches)

## Noticed
- Diff against goal/city-transformations also touches src/render3d/models3d.ts (6 lines), which the ticket's Files section does not list; the reviewer should confirm it is covered.
- Criteria 5 and 6 (screenshots) are the main session's, not the harness's.
