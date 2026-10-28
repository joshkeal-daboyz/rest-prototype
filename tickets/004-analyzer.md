# 004 · Analyzer CLI

owner: grid-simulator
status: open
branch: ticket/004-analyzer
depends on: 002

## Goal
`npm run analyze puzzles/<file>` tells the puzzle-designer and Josh whether a panel is finishable and how much thinking it holds, before anyone plays it. It also runs over every puzzle in `npm test`.

## Acceptance criteria
- [ ] Prints, for a panel: finishable from `startingParts` (yes / no / only with fetch); faults readable at the start; for each hidden fault, which fault hides it; **fewest probes** that locate every readable fault (search over probe sets using the grid simulator; cap the search and say so if capped); parts needed by kind; any fusebox that would be overloaded once every fault is fixed. (test on `first-box.json`: 1 readable, 0 hidden, fewest probes 2, parts {wire: 1}, no overload)
- [ ] For a street: also parts available from salvage per night, minimum trips for the satchel, and shortest walking route length. (test on `lamp-row.grid.json`: 3 readable, 5 hidden, min trips 2)
- [ ] `tools/analyze.test.ts` runs the analyzer over every file in `puzzles/` and fails if any is unfinishable.
- [ ] Output is deterministic and also available as JSON (`--json`).
- [ ] Uses `src/grid/` for all power logic; no duplicate flow code.

## Files
`tools/`

## Interfaces
Imports `createGrid` from `src/grid/` and `loadPuzzle` from `src/core/`.

## Open questions
none
