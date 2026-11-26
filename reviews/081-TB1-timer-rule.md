ticket: 081-TB1-timer-rule
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
TB1: on `src/grid/`, a breaker with a `timer` is thrown only by the clock. The clock runs in real seconds through `advance` from the player's first move. Time is not undoable, flips at the same moment are one settle, and every existing rule (fuse, brownout, relay, spring, battery, Faults hide faults, the Relight) meets it as rules 1 to 8 of section TB say. TB2: the analyzer, the check and the section S raise give true answers on a timed map. Josh's answers (26 Nov 2026: "Real seconds (Recommended)", "Breaker, on/off (Recommended)", "Clock only (Recommended)") are the model built here.

## Does the branch do it?
Branch `ticket/081tb1-timer-rule`, one commit (79c90b6) on top of TB0's merge. I ran the three test files it touches (`src/grid/timer.test.ts`, `tools/analyze.test.ts`, `tools/fit.test.ts`, `--maxWorkers=2`): 41 passed. The new file runs in 87 ms, and neither new tools case is among the slow ones. There are 8 new cases against main (6 in TB1, 2 in TB2), within the ticket's 9 and the cap of 15.

**TB1**
1. **The schedule.** Met.
   - `grid.ts`: `timed`, `clock`, `timerAt` and `startClock`. `startClock` runs in `throwBreaker`, `throwSwitch`, `release` (a release only) and a successful `repairAt`, each after its refusal checks, so a refused click doesn't start the clock.
   - `throwBreaker` returns false on a breaker with `n.timer`.
   - `advance` steps to each timer's `next` and emits `breaker:thrown {timer:true}` then `grid:changed "time"`. It doesn't touch `actions`.
   - `reset` sets `clock = null`.
   - `GridState` gets `clock` and `timers` through `TimerState`.
   - Test: "the clock starts at the first move ...". It checks: `advance(5)` before any move leaves the clock null and emits nothing; the click is refused; the clock reads 0 after the first move; the exact event pair at the flip; `actions` stays 1; Reset returns the clock to null.
2. **Not undoable.** Met. Before restoring, `undo` copies each timed breaker's current position into the popped state. `clock` lives outside `Mutable`, so history never holds it. Test: "time is not undoable".
3. **One settle per moment.** Met. All flips at a moment are applied to `cur.breakers` first, and only then are the events emitted and one `settle` run, so `state()` never shows half a pair. Test: "flips at one moment are one settle" sees `false/true` then `true/false` and exactly 2 `grid:changed` for 2 moments.
4. **Meets the other rules.** Met, in 2 cases:
   - relay refused while shut, keeps its place, throwable again in the window;
   - spring falls back at the close;
   - battery charge goes 2 → 2 → 3, charging only in the window;
   - a brownout is entered by one flip (t = 1, both lamps on capacity 2) and cleared by the next (t = 2), and `grid:brownout` is `[true, false]`;
   - rated fuse 1 blown by the flip, culprit `big`, the largest lamp it newly fed (the existing `nameCulprit` against `prevUnder`).
5. **Faults hide faults, and the Relight.** Met.
   - `repairAt("l_dmg")` returns `unreadable` behind the open timer, and in the window the cable reads and mends.
   - After the win, `advance(10)` leaves the breaker where it is and emits nothing. `timersRun` requires `!finished`, and the early return covers a map with no battery.
   - Decided "Faults hide faults" holds: readability is still `derived.powered`, and an open timed breaker cuts as any open breaker does.
   - Decided "The Relight can't be interrupted" holds: `finishIfComplete` runs after every flip settle, and the clock stops at `finished`.
6. **The preview.** Met. `preview.ts` adds `timed: true` to a timed breaker's what-if and leaves the player breaker's entry as it was. No V2 or NC1 test was edited. It is tested inside criterion 5's case (`kind`, `timed`, `delta < 0`, and the player breaker's `timed` undefined).
7. **Purity and maps without a timer.** Met.
   - `grid.ts` imports only `../core` and `./types`. The test imports `../core` and `./index`. There is no DOM, no timer API and no `Date.now`, and the existing purity case passes.
   - On a map without a timer, `advance` behaves exactly as before. With `timed.length === 0`, `timersRun` is always false and the old `break` path is taken, and no existing grid test was edited.

**TB2**
1. **The analyzer's state.** Met.
   - `keyOf` adds `clock:-` or the phase in half-seconds modulo `timerCycle` (the least common multiple of the timers' cycles), and only when `cycle > 0`, so a map without a timer gets the same key and report.
   - `wait` is offered when `hasBattery || hasTimer`.
   - A timed breaker is left out of `staticMoves`, and `stepBack` is off on a timed map, because Undo does not restore the clock.
   - Test `WINDOWED`: at 1 s per click the win is `br` plus 6 waits plus 2 repairs, which is the arithmetic of a window opening at t = 4 (checked by hand). At 3 s per click it still wins, with more waits (2 + 6 = 8 by hand).
2. **The check replays it.** Met with no tool change. The same case runs `replayMoves` on the found win and gets `complete: true`. `checkrun.ts` is untouched.
3. **The raise.** Met.
   - On a timed map, `fit.ts` replays both versions (with and without scenery) and records the state after every `grid:changed`, which includes each flip moment. The feed and fuse extra is the largest difference across those states, not only the end state's.
   - The test makes P0's `j_inf` timed so that the solution ends with the infirmary dark. It asserts that the raise equals the untimed end-state raise; an end-only raise would come out lower. So the test fails on the broken rule.
   - A map without a timer keeps the old end-state path, and the sweep is unedited.
4. **Times and state counts.** The commit message doesn't carry them. This is the builder's report to the main session and has no test, so I can't confirm it from the branch. See could-improve 3.

**Scope.** Every file is in the listed set: `src/grid/grid.ts`, `types.ts`, `preview.ts`, `timer.test.ts`; `tools/analyzerun.ts`, `fit.ts` (the raise and its helper only), `analyze.test.ts`, `fit.test.ts`. No new dependency. No change to `src/core/` or `puzzles/`.

**3D game.** `src/grid/` remains self-contained. The clock is driven only by `advance(dt)`, which the 3D game already calls each frame.

## Rule conflicts and risks
- **The preview of one breaker in an alternating pair** (rule 9, for TB3). `loadPreview` flips only that breaker. A pair that flips at the same moment (rule 6) is shown as two separate what-ifs, and neither includes its partner's flip. On one capacity-limited feed, `a`'s entry could then read `over: true` (red) for a moment that is not actually over, because `b` opens at the same instant. I didn't build this case. It follows from `preview.ts` line 55 flipping a single id. The criterion's wording ("its next flip's what-if ... as for a throw") is met, so this is not a must-fix. It matters for TB3's "red if the flip will brown out" and for TB6's two-clock puzzle.
- **The analyzer's phase key rounds to half-seconds.** That is exact for the default clicks (1 s) and waits (0.5 s). A `--click-seconds` that isn't a multiple of 0.5 (for example 0.3) would merge states that differ in phase. This may occur, not checked. The ticket specifies half-seconds, so it is as cut.
- **`settlesOf` in `fit.ts` pairs the states of the two replays by index.** That is sound while both replays emit the same `grid:changed` sequence. They should, because both run with unlimited capacities and ratings, so scenery can't change a blow or a flip. A battery's mid-step fill is not a separate state, so its load change inside a step is not sampled. This may occur, not checked.

## Must fix
none

## Could improve
1. `src/grid/preview.ts`: before TB3 draws the red warning, make a timed breaker's entry the what-if of every timer that flips at its next moment, not only itself. Otherwise an alternating pair on one limited feed may show a false brownout. This may need a ticket note, since criterion 6 as written is met.
2. `tools/analyze.test.ts`: the final `toEqual(fast)` re-run is a determinism check on the tool's own output with no rule behind it. Dropping it would cost nothing.
3. The builder's per-file times and the analyzer's state count on `WINDOWED` against its untimed twin (TB2 criterion 4) should be in the hand-off to Josh. The branch doesn't record them.
