ticket: 081-TB4-timer-prompt
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
When the player hovers a timed breaker, the prompt says what it is and how long until it next closes or opens (or that it starts on the first move). A click on it is refused and the flash says "Thrown by its clock". Each flip goes into the session log as a `timer-flip` entry with the node, `closed` and the game time. It is not an undo step, and the export carries it. At most 2 test cases, changing only `src/play/`.

## Does the branch do it?
- **Criterion 1, the prompt.** It is met.
  - `promptFor` in `src/play/prompt.ts` sends a breaker with `timer` to `timerPrompt`. That reads `GridState.timers` and `GridState.clock`. It gives `TEXT.timerWaiting` ("Timed breaker: starts on your first move") while `clock === null`, and otherwise "Timed breaker: opens/closes in N s", with `N = max(1, ceil(next))`.
  - A plain breaker still reads "Throw breaker".
  - On a refused throw, `src/play/play.ts` emits the using `play:click` `refused`, as before. For a timed breaker it also sets `flash` to `TEXT.timerRefused` ("Thrown by its clock") for `NEEDS_FLASH_SECONDS`. `view()` already puts the flash ahead of the hover prompt.
  - `src/play/timer.test.ts` checks all three wordings in turn: the waiting text before the first move; the refused event plus the flash; "opens in 1 s" at 0.5 s left; "closes in 2 s" at 1.5 s left after the flip.
- **Criterion 2, the log.** It is met.
  - `LogKind` gains `"timer-flip"` and `LogEntry` gains `closed?`.
  - `play.ts` listens for `breaker:thrown` with `timer: true` and logs `{ kind: "timer-flip", target, ok: true, closed, gameTime }`. This is the same pattern as the `battery-flat` listener just above it, which the ticket names as the model.
  - The player's own throws arrive through `click` and have no `timer` flag, so they are not logged twice.
  - Undo is owned by the grid, and the log is not an undo stack. The test shows the flip in `exportLog()`'s entries, then calls `undo()` and checks the timed breaker stays open.
- **Count.** 1 new case, under the limit of 2. Its name states the rule. It ran in 11 ms here and passed.
- **Files.** Only `src/play/prompt.ts`, `log.ts`, `play.ts` and a new `src/play/timer.test.ts`. The ticket's Files line says `play.ts` is "only to log the flip". The refused flash in `play.ts` is still needed by criterion 1, because the flash state lives there.

## Rule conflicts and risks
- No hard rule is broken. `src/grid/` and `src/night/` are untouched, and no dependency or Decided rule changes.
- "The Relight can't be interrupted" holds. After the win, `intentFor` returns null and `view()` returns a null prompt, so a timed breaker shows nothing. `click` returns early on `done()`.
- `gameTime` on a `timer-flip` is the game time at the end of the tick in which the flip happened, not the exact flip instant. The test logs 2.5 for a flip due at 2.0. `battery-flat` logs the same way, so this matches what the ticket asked for. Over a 60 fps tick the error is under 17 ms.

## Must fix
none

## Could improve
1. `src/play/play.ts`: `const done =(): boolean` lost its space ("`done = (): boolean`"). This is cosmetic.
2. `src/play/play.ts` and `prompt.ts`: the "is this a timed breaker" lookup (`puzzle.nodes.find(...)` then `n.type === "breaker" && n.timer`) is now written twice. A small `isTimed(puzzle, id)` helper in `prompt.ts` would keep them in step. This is optional.
