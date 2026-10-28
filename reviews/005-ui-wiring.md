ticket: 005-ui-wiring
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 2; round 1 is in `005-ui-wiring.round1.md`.*

## What the ticket asked for, as I understood it
An HTML overlay in `src/ui/` over the map canvas. It shows the prompt near the pointer, the parts on hand, a load/capacity readout that turns red in brownout, the target list, Undo/Reset/Download log, a picker over every map file in `puzzles/` and `puzzles/locked/` (locked ones marked), and a win banner, all keyboard reachable with text on every control. `src/main.ts` loads and validates the puzzles, builds bus → grid → renderer → play → ui, runs the rAF loop, handles resize and supports `?puzzle=`. Neither contains game rules.

## Does the branch do it?
Round 2 checks the two round-1 must-fix items against `git diff f448f04..4038d12`. The criteria round 1 found met are unchanged.

- **Prompt near the pointer:** now met.
  - `src/ui/index.ts` listens for `pointermove` and `pointerleave` on `root.parentElement` (`#app`). Pointer events from the canvas bubble up to it.
  - It converts the pointer to overlay-local coordinates and places `.prompt` with `promptPosition` from `src/ui/logic.ts`: 16 px right and below the pointer, clamped 8 px inside the overlay. Three tests cover it in `logic.test.ts`: the offset, pull-back at the right/bottom edges, and the left/top margin.
  - `index.html` now positions `.prompt` absolutely. The prompt still inherits `pointer-events: none` from `#ui`, so it can't swallow clicks or fire a false `pointerleave`.
  - The prompt is hidden when the pointer leaves or when play has no prompt. `update()` unhides it before measuring, so `offsetWidth` is real.
  - Listeners from a previous mount are removed when the map is switched (module-level `removePointerListeners`).
- **Picker lists both copies after a lock:** now met.
  - `src/ui/maps.ts` gives each entry a `key`: the `id` for open files, `locked/<id>` for files under `locked/`. Only a repeated key is reported as a duplicate.
  - `src/main.ts` uses the key for the lookup, the picker values, the default map and `?puzzle=`.
  - The new test "lists a locked copy beside its original when both share an id" (`puzzles/x.json` plus `puzzles/locked/x.json`) expects two entries, `shrine-circuit` and `locked/shrine-circuit`, with no problems reported. The existing tests were updated to use the key.
  - The log filename replaces `/` with `-`, so a locked map downloads as `locked-<id>-log.json`.
- **Checks:** I ran them in a detached worktree at 4038d12 with `src/grid` checked out from `proto/shrine-circuit`.
  - `tsc --noEmit`: clean.
  - Vitest: 76/76 pass across 4 files.
  - `vite build`: succeeds.
  - The worktree has been removed.

## Rule conflicts and risks
- None new. Neither fix touches a file outside `src/ui/`, `src/main.ts` or `index.html`, and neither adds a dependency.
- Still standing from round 1 (could-improve only):
  - `targetRows` restates "brownout: nothing counts as lit".
  - The temporary `src/render/index.ts` and `src/play/index.ts` must be replaced by tickets 003/004 at merge, not merged over them.

## Must fix
none

## Could improve
1. `src/ui/logic.ts` `targetRows` (carried from round 1): show the grid's facts separately (lit / lit but browned out / dark), or ask in a ticket for a per-target "counts as lit" set from the grid, so the UI doesn't restate the Draft brownout rule.
2. `src/main.ts` `open()` (carried from round 1): look up the key before calling `detach()` on the old session.
3. `src/main.ts` `onPick` (carried from round 1): drop the `history.replaceState`, which repeats the one `open()` already makes.
4. `src/ui/index.ts`: `removePointerListeners` is module state, which assumes one overlay per page. That is true here. If it ever isn't, return a `destroy()` from `mountUI` instead.

## Main session's response
agree. Merged into `proto/shrine-circuit` with the real `src/render/` and `src/play/` kept over the stand-ins. Could-improve 1 is ticket 006 part C; 2–4 join the architect's next pass.
