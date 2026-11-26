ticket: 081-N0-analyze-city
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
`npm run analyze` takes a `*.city.json`, validates it (C1), converts it on its own city through the fit's plan cache, and runs `analyzePuzzle` on the result with the usual flags. Scenery's hidden ids stay out of the report's lists, `--sections` refuses city files, and schematic files behave as before. At most 2 test cases.

## Does the branch do it?
- **Criterion 1, a city file analyzed on its conversion: met.** `loadCityPuzzle` in `tools/analyze.ts` runs `validateCityPuzzle`, then `convertCityPuzzle(shape.puzzle, cityPlanFor(shape.puzzle.city))`. `cityPlanFor` is `tools/fit.ts`'s memoised plan (`planMemo`, keyed by blocks, seed and one-way), which is the cache the ticket names. `main` sends `.city.json` paths there and passes the same `opts` (`--cap`, `--click-seconds`), and `--json` prints the filtered result. A schematic file still goes through `loadPuzzle` and `analyzePuzzle` unchanged. The test is the new case in `tools/analyze.test.ts` ("P0 on the city: a win with the schematic's fewest clicks..."). It asserts `solvable` and checks `minClicks` against the analyzer run on `puzzles/city-two-ways-round.json`. That is the ticket's own rule (P0 is raised, so the two must agree), not the code's own output played back.
- **Criterion 2, scenery not reported as the puzzle's: met.** `withoutHidden` filters `firstMoves`, `deadFirstMoves`, `blowOnShortestWin`, `blowAnywhere` and `win.moves`. It leaves `win.feeds` (the loads) alone, so scenery still counts where it draws. It strips the `repair:` / `wait:` prefix before checking, and a bare click id has no colon, so the whole id is checked. The criterion's test is folded into the same case, as the ticket allows.
- **Criterion 3, `--sections` on a city file: met.** The check comes before the file is opened. It prints `<file>: --sections is not for city files` and counts the file as bad, so `main` returns 1. No test, as the ticket says.
- **Criterion 4, the new case's time: not shown in the commit.** The builder commit (cea5477) gives no time, and its reply is not mine to read. My foreground run (`npx vitest run --maxWorkers=2 tools/analyze.test.ts`, 18 passed) timed the new case at **2922 ms**. That is over the ticket's 2 s, and the cost is the cold city build through `cityPlanFor`. Test policy rule 5's 2 s limit is for a new *file*, and this is one case added to an existing file. The ticket asks for "under 2 s, or the reason", and the reason is the one the ticket gives itself: it builds one city. Under Could improve, not Must fix.
- **Count:** 1 test case added (one `it(`), against at most 2. No case rewritten.
- **Files:** the builder commit touches only `tools/analyze.ts` and `tools/analyze.test.ts`. No `src/`, `puzzles/` or `package.json` change from the builder, and no new dependency.

## Rule conflicts and risks
- No `src/grid/` or `src/night/` change. `tools/` importing `src/city/circuit/convert` and `tools/fit` is allowed for a tool and matches what `tools/check.ts` and `tools/fit.ts` already do.
- No GDD rule is changed. The analyzer runs the converted `Puzzle` on `src/grid/` as it is.
- The branch also carries 525c601 (Josh's ticket commit: `tickets/081-puzzles-on-the-city.md`, `puzzles/series-v1.md`, `cleanups/2026-11-25.md`). That is the main session's cut of section N, not the builder's scope. It touches `puzzles/`, but only a plan document, not a puzzle file. Those same three files are also uncommitted in the main checkout, so the merge should not leave two versions of them.
- The hidden-id half of the test passes vacuously today. The conversion keeps every fault id on the file's own line (`scenery.ts` and `convert.ts`, "ids unchanged"), and hidden nodes are junctions and lamps that no click reaches. So the unfiltered lists cannot hold a hidden id yet, and the assertion would still pass with `withoutHidden` removed. It guards a future case, and it is not evidence the filter works.

## Must fix
none

## Could improve
1. `tools/analyze.test.ts`: to make criterion 2's half of the case able to fail, assert `withoutHidden` on a small hand-made `AnalysisResult` that holds a hidden id (for example `firstMoves: ["L~a", "b1"]`, `win.moves: ["repair:L~a"]`). That would be the ticket's allowed second case. Or leave a one-line comment saying the current conversion never puts hidden ids there.
2. `tools/analyze.ts`: the line `const pct =(x: number)` lost its space before `(`. This is cosmetic.
3. Criterion 4: put the measured time (about 2.9 s here, cold city build) and its reason in the PR or the ticket, so the next sweep-time watcher has the figure.
