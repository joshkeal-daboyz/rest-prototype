ticket: 030-controls-layout
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Move the mute toggle and the volume slider into a popover behind a bottom-right speaker button, styled like the inventory panel. The speaker's icon shows the sound state. Undo, Reset and Download log become three separate icon-and-label buttons, top right, with Log set apart and icon-only at 600 px or less. Nothing may collide with the inventory, splash, prompt or map. All of it is presentation: pure helpers tested in `src/ui/`, DOM wiring read by the reviewer.

## Does the branch do it?
`npm run typecheck` is clean. `npm test`: 44 files, 834 tests, all passing. The only test file added is `src/ui/controls.test.ts`, and no existing test file changed.

- **Icons**: met. `src/ui/controls.ts` defines `SPEAKER_ICON_SVG` (muted/silent/low/high), `ACTION_ICON_SVG` (undo/reset/log) and `CONTROL_ICON_VIEWBOX`. Tests in `controls.test.ts` › "control icons":
  - exact key sets;
  - every fill and stroke paint is `currentColor`, `none` or `#f2b84b`;
  - amber appears only in low and high;
  - no `<script`, `on…=`, `href` or `url(`;
  - the viewBox.

  The paths match the ticket's drafts verbatim.
- **speakerIcon**: met. Tests cover muted at any volume, 0 → silent, 0.01 and 0.5 → low, 0.51 and 1 → high, and NaN, 2 and −1 read through `clampVolume`.
- **speakerLabel**: met. The three strings are tested, plus rounding (0.456 → 46%) through `volumeToSlider`.
- **soundPopover**: met. All eight cases are tested one by one, with the exact `{open, focus}` results.
- **escapeTarget**: met. All four combinations are tested.
- **promptPosition with an array**: met. There is a 20 px grid sweep on 400 × 700 with the inventory and dock, which never overlaps either, plus a bounds test and a forced-fallback "wall" test. The single-`Rect` path in `logic.ts` is kept as its own branch, identical to before, and `logic.test.ts` is untouched and green.
- **splashCeiling**: met. Wide, narrow (= `min(inv.top, dock.top) − 8` = 558) and empty cases are tested. One weak spot: see Could improve 2.
- **CONTROL_ACTIONS**: met. Order and labels are tested, and `index.ts` builds the buttons by looping over it.
- **Existing tests unchanged, gate green, count grew**: met.
- **Reviewer reads index.ts / index.html / main.ts**: met.
  - **`.controls`** now holds only the three action buttons. The dock is appended to `#ui` after the inventory (in fact last, after the splash, so the popover draws on top, as the ticket intends), and the popover comes after the speaker inside the dock.
  - **ARIA**: the speaker has `aria-controls="sound-popover"`, `aria-expanded` (updated in `dispatch`), and `aria-label` and `title` from `speakerLabel`. It gets class `muted` while muted, and the icon swaps to the cross. The popover has `role="group"`, `aria-label="Sound"` and `hidden` when closed. The CSS rule `#ui .sound-popover[hidden]{display:none}` beats `display:flex`, so `hidden` really hides it. The toggle keeps `aria-pressed` and `soundToggleLabel`. The slider keeps `aria-label="Volume"`. SVGs are `aria-hidden` and `focusable="false"`. At ≤600 px the label span is clipped visually but stays in the DOM, so the accessible name is unchanged.
  - **Focus**: `dispatch` applies the reducer's result and moves focus *before* hiding, so Esc and second-click do not drop focus to `<body>`. Re-entrant focusout events during `dispatch` are traced and are harmless: they report `inside` and the early-return no-ops them.
    - The `pressInside` flag correctly handles browsers where clicking a button doesn't focus it (Safari/Firefox on macOS), and clicks on the non-focusable label area.
    - Enter and Space on the speaker arrive as `click`, so keyboard open works.
    - The splash's `nextButton.focus()` fires focusout with `relatedTarget = Next`, which is outside the dock, so the popover closes, as cut.
  - **Esc order**: the popover's handler is a document **capture** listener. It acts only when `escapeTarget(open, splashOpen()) === "popover"`, and then calls `stopPropagation()`. The splash's handler is a document **bubble** listener. Per the DOM dispatch algorithm, stopping propagation in the document's capture phase also skips the document's bubble-phase listeners, so the splash survives the first Esc. The splash handler *also* asks `escapeTarget(sound?.isOpen() ?? false, true)`, as the ticket requires; on its own that check would not be enough, because by bubble time the popover is already closed. So the stopPropagation is necessary, not gratuitous. With no audio engine, `sound` is null and the splash's Esc behaves as in 020. The second Esc reaches the splash, as cut.
  - **Listeners removed on remount**: `removeSoundListeners` removes the document `pointerdown`, `pointerup` and `pointercancel` listeners, and the capture `keydown` (removed with the matching `true`). `mountUI` calls it next to `removePointerListeners` and `removeSplashKey`, and it runs even when the new mount has no audio. The element-level listeners die with `root.textContent = ""`.
  - **`bottomInset()`**: it measures `.inventory` and `.sound-dock` and takes the larger reserve. It replaces every call site of `inventoryBottomInset()`. There are five, not four: initial renderer, post-mount, Reset, resize, first frame. The ticket's "setup, resize and first frame" plus "everywhere it was" asks for all of them, so five is correct.
  - **Splash and prompt**: `placeSplash` uses `splashCeiling` with the inventory and dock. `placePrompt` passes the inventory, the dock, and the popover while it is open.
  - **`main.ts`**: no game rule was added, and no grid or play call changed. The only change is the rename and the two-panel measure.
- **Josh, browser (full size and ~400 px)**: can't be checked here; these are for Josh. Nothing in the code works against them. The slider's arrow keys are safe: `src/play/pan.ts`'s only key (Home) already skips `input` targets. The icon follows the volume while dragging, because `sound.render()` runs on every `update()`.

**The builder's departures:**
- **152 px instead of 148**: the ticket's own formula, 3 × 40 + 2 × 6 + 12 + 8, adds up to 152, not 148. At 148 the picker would sit 4 px under the Undo button. 152 is the correct reading of the criterion "picker and readouts never sit under the buttons".
- **Five call sites**: correct, as above.
- **`title` at every width**: a harmless superset of "at ≤ 600 px each button gets title". The accessible name is unchanged.
- **Capture Esc handler with stopPropagation**: required for the cut Esc order, and it only stops Esc while the popover is open. Accepted.

## Rule conflicts and risks
- Files touched: `src/ui/*`, the `index.html` 600 px media query (plus a comment above it), and `src/main.ts` (only the `bottomInset` rename and its call sites). All are within the ticket's declared files. No `src/grid/`, `src/night/`, `src/core/`, `src/audio/` or `package.json` change, and no new dependency.
- No GDD Decided rule touched. Undo, Reset and Log keep their handlers.
- Icons are fixed constants set via `innerHTML`, never built from data.
- Risk, low: while the popover is open, the capture `stopPropagation` hides Esc from any other document or target listener. Today nothing else uses Esc, and 027 says Esc is not one of its keys. A future Esc user must go through `escapeTarget`.
- Risk, low: Alt-Tab or a window blur fires focusout with `relatedTarget = null` and `pressInside = false`, so the popover closes when the window loses focus. That is consistent with "closes when focus leaves it", but Josh may notice it.

## Must fix
none

## Could improve
1. `index.html`: at 152 px the picker column ends exactly at the Undo button's left edge, with no gap. Consider `right: 160px`, or a small `gap` on the controls, so the picker never visually touches the buttons. This depends on how it looks to Josh.
2. `src/ui/controls.test.ts` › splashCeiling "wide root": the dock is placed at `left: 346` on a 1920-wide root, which is not its corner. Put it at about `left: 1866` (1920 − 14 − 40) so the test checks the case the criterion describes.
3. `src/ui/logic.ts` `promptPosition`: the last-resort grid scan (4 px steps over the whole root) can be about 130k positions per pointermove on a 1920 × 1080 screen. It is rarely reached, but a coarser step (8–12 px), or scanning only near the pointer, would bound the cost.
4. `src/ui/index.ts` speaker: `title` duplicates `aria-label`. That is fine, but if Josh finds the hover tooltip noisy on the speaker, it can go.
