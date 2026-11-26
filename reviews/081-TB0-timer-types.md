ticket: 081-TB0-timer-types
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
TB0 sets the contract for the timed breaker before any builder starts. It adds the types in `src/core/`, a validator that rejects a bad schedule and names the node, a check-block rule that refuses a click on a timed breaker, a "Timed breaker" entry in `puzzles/SCHEMA.md` covering rules 1 to 8, and TB1 pointers in `tickets/rules-coverage.md`. It may add at most 2 test cases.

## Does the branch do it?
- **Criterion 1, the types.** All of them are in:
  - `src/core/schema.ts`: `BreakerTimer` and `BreakerNode.timer?`.
  - `src/core/state.ts`: `TimerReadout` and `TimerState`, marked as a stub that TB1's `GridState` extends.
  - `src/core/events.ts`: `breaker:thrown` gains `timer?: true`.
  - `src/core/preview.ts`: `LoadPreviewEntry.timed?: true`.
  - `src/core/audio.ts`: `SoundView.timers?`.

  Every field is optional, so no version bump is needed. CI's typecheck passed. Met.
- **Criterion 2, the validator.** `checkTimer` in `src/core/load.ts` does each check:
  - `closed` and `open` must be whole numbers from 2 to 30 (from `TIMER_LIMITS`).
  - `offset` must be a whole number from 0 to below `closed + open`.
  - The node's `closed` must equal `offset < closed`.
  - An unknown timer key is an error.

  `checkPuzzle` also refuses a timer on any node other than a breaker. It takes the LCM of every timer's cycle and rejects anything over 60 s. Every message names the node, except the map-wide cycle error, which is not about one node. `validateCityPuzzle` calls the same `checkPuzzle`, so city files get these checks too. The test is `load.test.ts`, "a timed breaker's schedule (081 TB0)". It passes one good alternating pair (6/6, offsets 0 and 6, `br_main.closed` false). It then checks the five bad cases the ticket names, each matched to its own message: on a switch, a fraction, out of range, `closed` disagreeing at offset 7, and a cycle of 143 s. It also checks an offset of 12, which equals the cycle. Every assertion is tied to a rule. Met.
- **Criterion 3, the check's moves.** `validateCheck` in `src/core/check.ts` rejects a click on a breaker with a `timer`, naming the node and pointing to `wait:`. The test is `check.test.ts`, "a click on a timed breaker (081 TB0)". It uses `rejectsOnce`, so it asserts exactly one message. It also asserts that a solution with `wait:6` and no click on the timed breaker is accepted. Met.
- **Criterion 4, SCHEMA.** The breaker row now describes the timer: the shape, the 2 to 30 share, the offset, the `closed` agreement, breaker-only, the 60 s map cycle, and that a click is refused. That covers rules 1 and 2. The new bullet list "Timed breakers, derived rules" covers the rest:
  - rule 3: the clock starts at the first move; Undo and Reset are not moves; Reset stops it;
  - rule 5: a flip is a settle, with the `timer: true` event, reason `"time"`, the fuse culprit, and the spring, relay and battery effects;
  - rule 6: flips at the same instant are one settle;
  - rule 4: time is not undoable;
  - rule 7: faults hide faults;
  - rule 8: the clock stops at the win;
  - plus the check block's `wait:`.

  It follows the battery's layout. Met.
- **Criterion 5, rules-coverage.** TB1 is added to "Breaker cuts downstream", "Faults hide faults", "Fuse rating" and "The Relight can't be interrupted", each pointing to a TB1 criterion. Met.
- **Count.** 2 new `it(` against main, both rewrites of nothing. That is within TB0's "at most 2" and the cap of 15. Both files pass locally (`npx vitest run --maxWorkers=2 src/core/load.test.ts src/core/check.test.ts`: 128 passed, 2.3 s for both files, most of it in `load.test.ts`'s existing cases).

## Rule conflicts and risks
- No change under `src/grid/`, `src/night/`, `src/render3d/`, `src/play/` or `tools/`. Purity holds, and the 3D game can take `src/grid/` as it stands.
- No GDD Decided rule is changed. A closed timed breaker conducts and an open one cuts everything downstream, which agrees with "Breakers conduct unless faulted" and "A breaker cuts everything downstream". "Faults hide faults" and "The Relight can't be interrupted" are written as held, not reworded. No new dependency.
- Until TB1 lands, `src/grid/` ignores `timer`. A file that carried one would play as an ordinary breaker the player can click. This is expected for a types-only PR, and no puzzle on this branch uses a timer.
- The touched files are the ones TB0 lists. The branch also carries the section cut: the ticket and `docs/design/081-TB-timed-breaker.md`, which the section's file list allows.

## Must fix
none

## Could improve
1. `src/core/audio.ts` adds `SoundView.clock?: number | null`, and `src/core/schema.ts` exports `TIMER_LIMITS`. Neither is in the ticket's Interfaces block for TB, which lists only `timers?` on `SoundView`. Both are small and harmless, but the Interfaces block should list them so TB1 and TB5 code against one written contract.
2. TB0's heading in the ticket still says "Built ... in the main checkout, uncommitted, for the main session to branch", and its five criteria are unticked. That wording should be updated to say the work is now on the branch.
3. The map-cycle error has no node to name. It could list the timed breakers whose cycles it combined, such as "br_street 13 s, br_main 11 s", so a designer can see which one to change.
