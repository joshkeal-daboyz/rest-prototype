ticket: 063f-kerbs
verdict: pass
regressions: 0

## What the ticket meant to change
Section F: draw the 3D tile city's kerb as one line (no trench, no open build-out end, no step, rounded returns at inlets). The ladder is meant to stay unchanged ("`npm run playtest` has no snapshot change").

## What I ran
`npm run playtest` (tsc on the harness, then vitest with `--maxWorkers=2`) at ac985d2: 130 tests, 130 passed, 0 differed. The snapshots in `tests/playtest/` are identical to main's (no diff under `tests/` or `puzzles/`). Nothing could have changed for play: against `goal/city-style` the branch touches `src/render3d/` and `docs/city-style-guide.md` only, and the harness never loads `src/render3d/`. Against `main` the only non-render3d source difference is `src/core/assets.ts` (+21 lines), which arrived with the earlier goal/city-style merge, not with section F.

## Intended differences, snapshots updated
none

## Regressions
none

## Added to the harness
nothing

## Noticed
- The kerb plan, return cells and lifted slab are 3D-only; the headless replay cannot see them. Their checks (criteria 33 to 37c) belong in `kerbline.test.ts`, `tilecity.test.ts` and `tilecity3d.test.ts`, and criterion 37 is a main-session screenshot.
- `gate-out.txt` is an untracked file in D:\rest-prototype-gate, not mine; I left it alone.
