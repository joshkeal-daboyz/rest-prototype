ticket: 057g-alleys-parks
verdict: pass
regressions: 0

## What the ticket meant to change
Section G adds alleys and whole- and half-block parks to the pure tile-city layout (new roles `alley` and `parkEdge`, checks V3 and V4), in `src/render3d/` only.

## What I ran
`npm run playtest` at 64455d4: 130 tests (every ladder map's replay and its snapshot), 130 passed, 0 differed.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing (G adds no control, fault or cue a replay can reach, and no puzzle changed)

## Noticed
- Against main the branch touches no `puzzles/`, `src/grid/`, `src/night/`, `src/game/` or `tests/playtest/`. The only non-render3d, non-tools source change is `src/core/assets.ts` (+21 lines), which comes from earlier 05x tickets on the goal branch, not from G. G's own commit touches only `tilecity.ts` and tests, none of which the headless replay reaches.
- The diff from main is the whole goal/city-style branch, not just G, so this playtest cannot separate G from the earlier sections. It shows that the whole branch leaves ladder play unchanged.
- The layout rules (alleys, parks, G1 to G4, V3 and V4) are folder unit-test territory (`alleys.test.ts`, `tilecity.test.ts`). The harness has nothing to add.
