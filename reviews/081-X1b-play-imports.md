ticket: 081-X1b-play-imports
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section X1b of ticket 081: `src/play/` stops importing `src/render/` and takes the map's interfaces, as types only, from `src/render3d/maprender.ts`. Only import lines change, and no test case is added or edited.

## Does the branch do it?
Criterion 1: met. The branch adds one commit, 45f03ee, on top of the X1a merge (80ca9bc). It changes 8 files with 8 insertions and 8 deletions, and each change is a single import line:
- `src/play/play.ts` and `src/play/pan.ts` now import `MapRenderer` and `MapPanView` from `../render3d/maprender`.
- The six test files (`battery`, `click-event`, `elapsed`, `lastentry`, `pan`, `play`) change only their import line. No case body is touched.
- Every import from `render3d` in `src/play/` is `import type`, so `src/play/` loads no value from `src/render3d/` and never loads three. `maprender.ts` itself imports only types from `../core` and `../grid`.
- `grep` finds nothing in `src/play/` that still imports `../render`.
- The six files the branch touched pass on this branch: 70 cases in 3.2 s with 2 workers.

Count: 0 test cases added or rewritten. This matches the ticket.

## Rule conflicts and risks
none found. The diff stays inside `src/play/`. It adds no dependency and does not touch `src/grid/`, `src/night/`, puzzles or any GDD rule.

## Must fix
none

## Could improve
none
