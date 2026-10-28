ticket: 005-ui-wiring
assessment: partly
must-fix: 2

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 1.*

## What the ticket asked for, as I understood it
An HTML overlay in `src/ui/` over the map canvas: the prompt near the pointer, parts on hand, a load/capacity readout that turns red in brownout, the target list, Undo/Reset/Download log, a map picker that lists every `scope: "map"` file in `puzzles/` and `puzzles/locked/` (locked ones marked), and a win banner. It must be keyboard reachable with text on every control. It also asks for a `src/main.ts` that loads and validates the puzzles, builds bus → grid → renderer → play → ui, runs the rAF loop, handles resize and honours `?puzzle=<id>`. None of this may contain game rules.

## Does the branch do it?
- **Prompt near the pointer:** not met. `src/ui/index.ts` puts the prompt in a `.prompt` box fixed at the bottom centre (`index.html` CSS). The builder says this is because `MapPlay.view()` exposes no pointer position. That does not force it: the UI owns its own root and can listen to `pointermove` on `root.parentElement` (or `window`) and place the prompt from `clientX/clientY`. The fix stays inside `src/ui/` and needs nothing from play. `promptToShow` (hides the prompt while the Relight runs) is tested in `logic.test.ts`.
- **Parts as icons with text labels:** met. Each chip has a CSS icon plus the text "Bulb 2", and the group has an `aria-label` from `partsSummary` (tested).
- **`load / capacity`, red in brownout:** met. `capacityReadout` produces "Load 6 / 4 · Brownout", so the brownout is in words as well as colour, and the `.capacity.brownout` class makes it red. Tested.
- **Target list with lit/dark:** met. `targetRows` gives On/Off marks and text. See the rule note below.
- **Undo, Reset, Download log:** met. These are `<button type="button">` elements that call `play.undo/reset/exportLog`; the log downloads as a Blob named `<id>-log.json`.
- **Map picker over every map file in `puzzles/` and `puzzles/locked/`, marked:** partly met. `src/ui/maps.ts` validates with `validatePuzzle`, filters to `scope: "map"`, marks `locked/` paths, and appends "(locked)" to their names (tested). But `collectMaps` drops any file whose `id` repeats an earlier one. The lock workflow in CLAUDE.md is "copy the file to `puzzles/locked/` and commit both", so after a lock the open copy and the locked copy share an id and one of them disappears from the picker. Paths are sorted, so `locked/shrine-circuit.json` sorts before `shrine-circuit.json` and the editable copy is the one hidden. The test "marks files under locked/" avoids this by giving the locked copy a different id. No file in `puzzles/locked/` exists yet, so the bug will appear on the first lock.
- **Win banner when complete:** met. `bannerText` reads `state.complete` from the grid (tested).
- **Keyboard reachable, text on every control:** met for the overlay. It uses native `<button>` and `<select>` with a `<label>`, and a `:focus-visible` outline. The overlay is `pointer-events: none` apart from its controls, so the canvas still gets clicks.
- **Test for which prompt/banner to show:** present (`promptToShow`, `bannerText`).
- **`src/main.ts`:** met. It uses `import.meta.glob("../puzzles/**/*.json", { eager: true, import: "default" })`, validates through `collectMaps` (which uses `src/core`), and in `open()` builds `EventBus` → `createGrid` → `createMapRenderer` → `createMapPlay` → `play.attach` → `mountUI`. The rAF loop calls `play.tick(dt)` (dt capped at 0.1 s), `renderer.draw(grid.state(), {hover, relightT}, t)` and `ui.update()`. It calls `renderer.resize()` on window resize. `?puzzle=<id>` is read on load and written back with `replaceState`, and picking a map rebuilds the stack.
- **No game rules in `src/ui/` or `src/main.ts`:** almost met. `targetRows` computes `lit.has(id) && !brownout`. The grid's `GridState.lit` deliberately includes lamps that are lit during a brownout ("even in brownout; see `brownout`"), and the grid applies the "none count as lit" rule only inside `complete`. So the UI restates a Draft rule from the brief. The result is consistent with the grid and the restated rule is one line, so I list it as could-improve, not a blocker.
- **typecheck / test / build:** pass. I ran them in a detached worktree of f448f04 with `src/grid` checked out from `proto/shrine-circuit`: `tsc --noEmit` is clean, Vitest passes 72/72 (ui 15, core 10, grid 47), and `vite build` succeeds. On the branch alone, without `src/grid`, typecheck cannot pass. That is expected from how the branch was cut.
- **Stand-ins `src/render/index.ts` and `src/play/index.ts`:** acceptable. They contain interfaces only, and their factories throw "not merged yet". The signatures match the Interfaces sections of tickets 003 and 004 character for character. Both files are marked TEMPORARY, and they must be replaced, not merged, when 003 and 004 land.

## Rule conflicts and risks
- No changes to `src/grid/` or `src/night/`, no new dependency, no edits to `puzzles/locked/`, and no GDD rule changed.
- The stand-in files sit in folders that tickets 003 and 004 own (`src/render/`, `src/play/`). The ticket allowed this, but the merge order matters: if this branch merges after 003/004 with a careless conflict resolution, the stand-ins could overwrite the real implementations.
- `targetRows` restates "brownout: nothing counts as lit" (see above). If Josh tunes the Draft capacity rule in the grid, the UI could silently disagree.
- Map interactions (throwing breakers, repairs) are canvas-only and so not keyboard reachable. That belongs to ticket 004, not here.

## Must fix
1. `src/ui/index.ts`: place the prompt near the pointer. Track `pointermove` on the map container (`root.parentElement`) or `window`, and position `.prompt` at an offset from the pointer, kept inside the viewport. Only the CSS in `index.html` needs to change from fixed bottom-centre to absolute positioning set by the script. Effect: the acceptance criterion is met without changing `MapPlay`.
2. `src/ui/maps.ts` (and `src/main.ts` lookups): key entries by something that tells a locked copy from its open twin, for example `locked/<id>` for files under `locked/`, or the path. Then both copies appear in the picker, the locked one marked, and `?puzzle=` can address each. Add a test with the same puzzle at `puzzles/x.json` and `puzzles/locked/x.json` that expects two entries. Effect: the picker really lists every map file in both folders after the documented lock step.

## Could improve
1. `src/ui/logic.ts` `targetRows`: stop restating the brownout rule. Either show the grid's facts as they are (lit / lit but browned out / dark, using `state.lit` and `state.brownout` separately), or raise a ticket for the grid to expose a per-target "counts as lit" set.
2. `src/main.ts` `open()`: if the id is unknown, the old session has already been detached, and `session` then still points at it. Look the id up before calling `detach()`. It is unreachable from the picker today.
3. `src/main.ts` `onPick`: the `history.replaceState` there repeats the one `open()` already makes. Drop it.
4. `src/ui/logic.ts` `promptToShow`: hiding the prompt during the Relight is arguably play's job (play could return `prompt: null`). It is harmless, but it is a second place that knows the Relight can't be interrupted.

## Main session's response
agree on both must-fix items; sent to the ui builder. On 1: reading the pointer position to place a tooltip is presentation, not game input, so it is within the ui agent's rules; ticket 006 part A is withdrawn. Could-improve 1 stays as ticket 006 part B/C (grid exposes `countedLit`).
