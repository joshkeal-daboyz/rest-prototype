ticket: 004-play-map
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
A pure-ish interaction layer in `src/play/` that turns pointer hover and clicks on the map into grid calls (throw breaker or switch, repair a readable fault), gives a prompt string for whatever is under the pointer, exposes undo and reset, freezes input and runs a `relightT` timer after `job:completed`, and logs every action with a monotonic step and wall-clock time, exportable as JSON. It does no drawing.

## Does the branch do it?
- **Prompt/hover (test):** `src/play/prompt.ts` has `intentFor` and `promptFor`, which return "Throw breaker", "Throw switch", "Repair (<part>)" or "Needs: <part> × <n>", and null otherwise. The fault branch only applies when `state.readableFaults.has(fault.id)`, so unreadable faults give no prompt. `view()` in `play.ts` returns `hover` and the prompt. Tests in "prompts": breaker/switch; `j_dead` → "Needs: wire × 2"; unreadable `l_b` → null, along with a lamp, a plain line and null; `l_b` → "Repair (wire)" once `sw_1` makes it readable. Met.
- **Clicks:** `click()` routes to `grid.throwBreaker`, `grid.throwSwitch` and `grid.repairAt`. On `needs-parts` it sets a flash for `NEEDS_FLASH_SECONDS = 1`, which `tick` counts down. Tests: "throws breakers and switches through the grid", "repairs a readable fault and consumes the part", "ignores an unreadable fault", "flashes the shortfall for a second". `attach` wires pointermove, pointerleave and click through `renderer.hitTest` using canvas-local coordinates, and the detach function removes all three listeners. A test with a fake canvas covers this. Met.
- **Undo/Reset as methods:** `undo()` and `reset()` are on `MapPlay`, with the test "undo reverts the last action; reset restores the start". Met.
- **Relight:** the `bus.on("job:completed")` handler sets `relightT = 0`. `click` and `undo` return early while `grid.state().complete`. `view().prompt` is null and `relightT` counts up in `tick`. The test "ignores clicks and counts relightT up from 0" checks that the action count and log length don't change and that relightT reaches 0.75 after two ticks. Met.
- **Session log (test):** `src/play/log.ts` assigns `step` by pre-increment and never resets it, and `time` comes from an injected `now`, defaulting to `Date.now`. Kinds cover throw-breaker, throw-switch, repair, repair-refused, undo and reset. `exportLog()` returns `{puzzle, entries}` as JSON. Tests check order, steps 1–6, strictly increasing times, refusal detail (`needs: {part, count, have}`), and that steps keep increasing across a reset. Met.
- **No drawing, no HUD text:** `play.ts` never calls `renderer.draw`. Its only DOM use is the listeners in `attach`, and the only text it produces is the prompt string. Met.
- `npm run typecheck` is clean. `npm test` passes 71/71 across 3 files, 14 of them in `src/play/play.test.ts`.

## Rule conflicts and risks
- `src/grid/` is byte-identical to `proto/shrine-circuit` (`git diff proto/shrine-circuit worktree-agent-a39336154f8284bb1 -- src/grid` is empty). I didn't review it further.
- `src/render/index.ts` contains only types, marked TEMPORARY, and its `MapRenderer` signature matches ticket 003's Interfaces exactly (`draw(state, overlay {hover?, relightT?}, timeSeconds)`, `hitTest(x, y)`, `resize()`). Strictly it is a file outside `src/play/`, but the ticket allowed it. The main session needs to replace it when 003 merges and must not merge it over the real renderer.
- No new dependencies. Imports from `src/play` go only to `../core`, `../grid` and `../render`, which is allowed because play is not a pure folder.
- **The Relight can't be interrupted:** `reset()` deliberately has no `done()` guard (the comment calls it "the only way back"), so pressing Reset mid-Relight ends it and clears `relightT`. The ticket only says *clicks* are ignored and reset is a UI button, so this doesn't break an acceptance criterion. It does sit against the GDD wording. A guard would need a Relight duration, which play doesn't know, so I'm putting it to Josh rather than calling it a blocker.
- `bus.on("job:completed")` is never unsubscribed. Creating a MapPlay per puzzle load on a shared bus would leak handlers, and a completion on another grid would set `relightT` on stale instances. `view()` only shows `relightT` when its own grid is complete, so the visible effect is nil today.

## Must fix
none

## Could improve
1. **Reset during the Relight** (`src/play/play.ts` `reset`): decide with Josh whether Reset should be ignored or disabled until the Relight finishes, for example by having the renderer or UI report when it has finished. Also add a test that states whichever rule is chosen. At present the test "reset clears it" approves an interruption.
2. **"Shortfall" wording** (`play.ts` flash, `prompt.ts` `needsText`): both the flash and the hover prompt show the *required* count (`r.needs.count`, e.g. "× 2" while holding 1), not the missing amount (`count - have`). The ticket's literal "Needs: wire × 2" fits the required count, so this is consistent, but the ticket also says "shortfall". Confirm which one Josh means. The test name "shows the shortfall…" also asserts the required count.
3. **Extra surface: `click(id)`, `hoverAt(id)`, `{ now }`.** These are reasonable rather than scope creep. `now` is the injection the log test needs to check monotonic time. `click` and `hoverAt` are what `attach`'s handlers call and let tests run without a DOM. Each is small and documented. One risk: the UI could call `click` directly and bypass `hitTest`. If the architect wants the ticket interface kept exact, move them to an internal or test-only export. Otherwise add them to the ticket's Interfaces so 005/UI knows they exist.
4. Return or store the `bus.on` unsubscribe and add a `dispose()`, or tie it to `attach`'s detach, so a MapPlay can be thrown away cleanly when the puzzle changes.
5. Clicks on non-actionable elements and on unreadable faults aren't logged. That matches the ticket ("every throw, repair, refused repair, undo and reset"), but a "click-ignored" entry would show whether Josh is clicking on faults he can't yet read, which is one of the things the prototype is meant to learn. This is optional and for Josh to decide.

## Main session's response
agree. Merged into `proto/shrine-circuit`, dropping the temporary `src/render/index.ts`. Could-improve 1 (Reset during the Relight) and 2 (required vs missing count) are questions for Josh after he plays. 4 (dispose) matters because `main.ts` rebuilds the stack on map change; it joins ticket 006. 5 (log ignored clicks) is a good idea for the playtest log; also ticket 006.
