ticket: 081-V4-preview-wiring
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section V4 of `tickets/081-puzzles-on-the-city.md`: the page computes V2's `loadPreview` on each state change, using the faults read so far (Reset clears them, Undo keeps them), and hands it to the renderer's `setLoadPreview`. A `V` key named in the HUD hides and shows the numbers. They are on when a puzzle opens, and the fuse and feed labels stay. I reviewed V4's own commit (e944318) and left out the merges of main and the goal branch.

## Does the branch do it?
- **Criterion 1 (the read faults).** `src/ui/preview.ts` `previewFor` copies `known`, adds `state.readableFaults`, and returns a `null` preview while relighting or once `state.complete` is set. Otherwise it returns `loadPreview(puzzle, state, seen)`. It is pure and imports only `../core` and `../grid`. `src/ui/preview.test.ts` has one case that exercises the rule:
  - a damaged cable is read;
  - the breaker is thrown so current no longer reaches it, and it stays in `known`;
  - an empty `known` (Reset) forgets it;
  - relighting gives `null`.

  Undo keeping `known` is a wiring property, not a helper property: `src/main.ts` clears `known` only on `play:click` `reset`, and `play.ts` emits that from `reset()`, which the HUD's Reset button calls. Undo emits `undo`, which is ignored. The test passes (1 test, 12 ms).
- **Criterion 2 (each state change, not each frame).** `refreshPreview` runs from the frame loop, but it returns early unless the `GridState` object or the relighting flag has changed. `grid.state()` returns the same `derived` object until a mutation re-settles it (`src/grid/grid.ts` 471-633), so the preview is computed once per change. The Reset handler also sets `shownFor = null`, so the next frame recomputes with the emptied `known`.
- **Criterion 3 (the key).**
  - `isLoadKey` takes a plain `v` or `V` with no modifier, no repeat, and not typed into a select, input or textarea. It is the only `v` binding: pan uses the arrow keys and the day toggle uses L, on dev views only.
  - `numbersOn` starts true. It is per open and not saved.
  - Hidden, the renderer is sent `null`. In `overlay.ts`, `overlayLabels` drops only the preview labels for a `null` preview (`pushPreview` returns early). The fuse and feed "x of y" labels are built from `state` and stay.
  - The HUD line reads "V: load numbers", with "(off)" added when hidden, from `loadKeyText`. It is mounted in `hudLeft` in `src/ui/index.ts`. Check in the browser.
- **The optional setter can't be skipped silently.** `MapRenderer3d.setLoadPreview` is optional in `renderer.ts`. `main.ts` throws when `shown === "play"` and the renderer lacks the setter. `shown === "play"` is the only case that passes `city: view`, and `renderRoute` sends a given city view to `createCityPlayRenderer3d`, whose returned object has `setLoadPreview` (`cityview.ts` 1168). The debug routes call `setNumbers?.call(...)`, which does nothing, as intended, because they draw no puzzle.
- **Criterion 4.** Josh checks in the browser.
- **Count.** 1 test case added, as the ticket allows.

## Rule conflicts and risks
- None found. The files are `src/main.ts` and `src/ui/` only. It touches nothing in `src/grid/`, `src/render3d/` or `src/play/`, adds no dependency and changes no Decided rule. "Faults hide faults" is still enforced in V2's `loadPreview`, and `known` only grows from `readableFaults`, so nothing unread enters it.

## Must fix
none

## Could improve
1. The branch is `ticket/081v4-preview-wiring`, but the ticket names it `ticket/081v4-preview-wired`. This is cosmetic.
2. `src/main.ts`: on the win, `previewFor` returns `null` through `state.complete`, and the relight flag also clears the numbers. Both are fine. A one-line comment saying the win clears the numbers through `state.complete` would save the next reader a search.
