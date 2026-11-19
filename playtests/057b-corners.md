ticket: 057-frontage-and-block-interiors (section B, corners and far ends)
verdict: pass
regressions: 0

## What the ticket meant to change
B makes the tile city's corners flush and closes every run's far end (new `farOverlap_m` packer option, default 0), all in `src/render3d/`; no play behaviour.

## What I ran
`npm run playtest` at 1b9d3f9, round 2 (detached, D:\rest-prototype-gate): 64 maps, 64 passed, 0 differed (130 tests green).

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing. B adds no control, fault or cue a replay can reach, and touches no puzzle.

## Noticed
- B's own commit (a684c47) touches only `frontage.ts`, `terrace.ts`, `tilecity.ts` and two test files, all inside the ticket's B file list. All render3d, none reachable from `loadPuzzle -> createGrid -> createMapPlay`.
- `main...HEAD` is much larger (121 files, including `src/core/assets.ts`, `tools/`, other tickets) because this branch sits on the unmerged goal/city-style work. I did not judge those commits; B's range is clean.
- `terrace.ts`'s `farOverlap_m` default 0 is the "ladder unchanged" guarantee; that belongs in `terrace.test.ts` (the builder's), not the harness.
- Round 2: fix a684c47..1b9d3f9 touches only `frontage.ts` and `frontage.test.ts` (confirmed by `git diff --stat`); replay identical to round 1, no new differences.
