ticket: 081-t2-stage-progress
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section T2 of ticket 081: a pure `src/ui/progress.ts` that records a win per puzzle id (best moves and best time each on its own, plus the date of the first win), keeps it under one `localStorage` key through a `Storage`-shaped argument and never throws on bad data, lists the stages for the select (the completed ones in number order, then the lowest one not completed), words each line, and adds `menuStep` for the title's two items. At most 5 test cases.

## Does the branch do it?
1. **The record.** Met. `recordWin` in `src/ui/progress.ts` takes `Math.min` of moves and of seconds separately, keeps `prev.first`, and returns a new map. The signature has a fifth argument, `on` (the date), which the ticket's signature leaves out. That keeps the module free of a clock, so I count it as meeting the criterion. Test: `progress.test.ts`, "keeps each best on its own and the first win's date". It covers the worse run (both bests kept) and the fewer-moves, longer-time run (only moves change), so it would fail if either best were coupled to the other.
2. **The store.** Met. `PROGRESS_KEY = "rest-circuits.progress.v1"`. `loadProgress` and `saveProgress` use the existing `StorageLike`. `getItem`, `JSON.parse` and `setItem` are each guarded. A wrong version, an array, null and a bad entry all read as empty, and a bad entry is dropped on its own. `clearProgress` writes an empty record. Test: "round-trips, reads garbage as empty, and clears". It covers five kinds of junk plus null storage, so it is a real test and not one that only echoes the code's output.
3. **The list.** Met. `stageList` keeps only ids with a leading number (`stageNumber`), so P0 `city-two-ways-round` is excluded. It sorts by number, emits the completed stages, then only the first pending one, marked `next`. Test: the `stageList` case uses four numbered entries plus P0. It covers 03 completed before 02 (the next is still 02), none completed (01 alone) and all completed (no next).
4. **The line.** Met. Completed lines are `${entry.name} · N moves · formatTime(...)`. That is `winLine`'s clock form and singular "move", with the number and name taken from `name` and not written twice. The next stage reads `· not yet lit`. The same case asserts the exact strings, including the "1 move" singular.
5. **The menu keys.** Met. `menuStep` is in `src/ui/logic.ts`, as the ticket allowed. ArrowUp and ArrowDown wrap, Enter chooses, other keys do nothing, and count 0 is safe. Test: `logic.test.ts`, "moves up and down with wrap, and Enter chooses the index".

**Count.** 4 new `it(` cases against main (3 in `progress.test.ts`, 1 in `logic.test.ts`), within the "at most 5" and the cap of 15. I ran both files with `--maxWorkers=2`: 46 passed. `progress.test.ts` took 49 ms.

**Files.** The source changes are only `src/ui/progress.ts`, `progress.test.ts`, `logic.ts` and `logic.test.ts`, all on the ticket's list. `src/main.ts` and `src/ui/index.ts` are untouched. The ticket file changes on the branch are the architect's cut and G1 answers, not the builder's.

## Rule conflicts and risks
- None found. `src/grid/`, `src/night/` and `src/play/` are untouched. No Decided rule is involved, and the ticket says why. There is no new dependency. `progress.ts` uses no DOM, timer or clock, and imports only from `./logic`.
- A small risk for T3: `stageList` skips `locked` entries. Today that is right, because a locked puzzle keeps its open copy in `puzzles/city/` and `collectCityMaps` gives the copies different keys but the same id. A stage that existed only as a locked copy would drop out of the select. This may occur, not checked; no such file exists in `puzzles/city/` today as far as the entries go.

## Must fix
none

## Could improve
1. `src/ui/progress.ts` `stageList`: the `locked` skip goes slightly past the ticket and has no test. Either add a one-line note in the ticket for T3, or leave it out and let T3 pass only the open entries. Optional.
2. `src/ui/progress.ts` `recordWin`: the extra `on` argument is fine, but the ticket's criterion 1 signature should be brought in line when the architect next touches section T, so T3 calls it as built.
