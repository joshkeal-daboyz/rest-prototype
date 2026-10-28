ticket: 009-battery-render-play-ui (part B)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
`play.tick(dt)` drives `grid.advance(dt)`. Clicking a battery calls `grid.release`. Batteries and stuck relays show the three prompt strings exactly as the ticket writes them. The session log records release, stop and flat with game time, and tests cover the prompts and the log.

## Does the branch do it?
- **tick → advance:** `src/play/play.ts` `tick()` adds dt to `gameTime` and calls `grid.advance(dt)` only when `dt > 0 && !done()`. So the grid stops advancing during the Relight (`done()` is `grid.state().complete`, and the Relight only runs while that is true). `relightT` still counts as before. The grid's own `release` also refuses once `finished`. Test: "tick calls grid.advance; …" in `src/play/battery.test.ts` (4 s of tick gives charge 4).
- **Battery click → release:** `prompt.ts` adds a `battery` intent. `click()` reads `released` before the call, calls `grid.release(id)` and logs `battery-release` or `battery-stop` with the grid's `ok`. Clicks during the Relight are already blocked by the `done()` guard.
- **Prompts:** the strings are exact, em dashes included: `Charge: ${floor(charge)} / ${capacity} — Release`, `Running: ${ceil(charge)} s left — Stop`, `No power — relay stuck`. The stuck prompt shows only for `relay: true` switches missing from `state.powered`. Because the grid's `powered` includes power from a released battery, a relay fed by a battery reads "Throw switch". The test covers this ("charge floors, running ceils, a stuck relay says so"). Flooring the stored charge and ceiling the countdown is a reasonable gap-fill: you never see "10 / 10" before it is full, and never "0 s left" while it still runs.
- **Log with game time:** `LogEntry` gains `gameTime?` and three kinds. Test "records release, stop and flat with game time and wall-clock time" checks the kinds in order and gameTimes `[3, 4, 6, 11]`.
- **No drawing or HUD text:** none added. The prompt is the existing `view().prompt` channel.
- **Diff scope:** 4 files, all in `src/play/` (`battery.test.ts`, `log.ts`, `play.ts`, `prompt.ts`). No new dependency, no grid or night change.
- **Tests:** `npm test` gives 141/141 passing, 3 of them new. `npm run typecheck` fails only in `src/render/render.test.ts(25,3)` (missing `batteries`). That is the known part-A issue and out of scope.

The builder's stated choices:
1. **A stop is logged once, as `battery-stop`.** This is a reasonable gap-fill. The grid emits `battery:flat {stopped:true}` on a click-stop, and the play listener skips it, so each player action gives one entry. It doesn't contradict the ticket: "stop" and "flat" are both recorded, as different kinds.
2. **A flat entry's game time is the end of the tick.** Reasonable gap-fill. `gameTime` is incremented before `advance`, and `advance` emits `battery:flat` partway through the step, so the logged time can be up to one tick (about 16 ms at 60 fps) late. The ticket doesn't ask for sub-tick precision.
3. **Game time keeps counting across Reset.** Reasonable gap-fill, and consistent with the log's existing rule that `step` never resets because a reset is itself an entry. The field's doc says "since the map opened", which matches.
4. **Releasing an empty battery is logged as `battery-release`, `ok: false`.** Matches the ticket and the existing pattern (refused breaker and switch throws are logged `ok: false`). It isn't tested (see Could improve).

## Rule conflicts and risks
- None found. `src/grid/` and `src/night/` are untouched. The SCHEMA rules hold: time is not undoable (play's `undo` doesn't touch batteries), and `release` stays off the undo history (that is the grid's job, unchanged here).

## Must fix
none

## Could improve
1. `src/play/log.ts`: the `stopped?` field is documented as "true if the player stopped it early", but it can never be true, because a stop is logged as `battery-stop`. Either drop the field or reword the doc so it doesn't describe a case that can't happen.
2. `src/play/battery.test.ts`: three behaviours have no test. (a) `tick` doesn't advance the grid after the job completes (the Relight). (b) Releasing an empty battery logs `battery-release` with `ok: false`. (c) Game time keeps counting across `reset`. Each is a one-line rule worth pinning.
3. Optional: log a flat at its exact time (`gameTime - dt + elapsed`). This would need `advance` to report when a battery went flat, so it isn't worth changing for a prototype.

## Main session's response
agree. Merged into `main`. Could-improve 1 and 2 join ticket 006's housekeeping list.
