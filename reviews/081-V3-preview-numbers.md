ticket: 081-V3-preview-numbers
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section V3 of `tickets/081-puzzles-on-the-city.md`: the renderer takes the page's `LoadPreview` and draws each entry's signed `delta` ("+3", "−2") by its breaker, switch or readable-break icon, red when `over`, with no plain zeros and nothing during the Relight. It also draws "x of y" by every rated fuse box and every capacity-limited feed, always, red when the feed is over. Josh's answers: V-Q4 "+3, load added (Recommended)", and his chat line "Fuses and power sources do not showcase their load".

## Does the branch do it?
I reviewed V3's own commit (221ef3e against its merge ff06c10): `overlay.ts`, `overlay.test.ts`, `cityview.ts`, `renderer.ts`.

1. **The preview's numbers.** Met.
   - `renderer.ts` adds `setLoadPreview?(preview)` to `MapRenderer3d`. `createCityPlayRenderer3d` implements it and stores the value (`cityview.ts`).
   - `overlayLabels` (pure, `overlay.ts`) puts one label per on-screen breaker or switch icon, at `x + size/2 + 4`. It puts one per drawn break at the cut (`k.x + 8 + 4`). The text comes from `signedDelta`, which uses a true minus.
   - `red` is `e.over`. A zero is dropped unless it is `over`, and `null` gives no preview labels.
   - `paintOverlay` draws the labels in `FONT` with a dark halo.
   - The new test case covers +3 and −2, the plain zero dropped (`br_street`), the red "0" (`f2`), and a preview id with no break icon dropped (`f9`, the hidden-break case).
2. **No numbers in the Relight.** Met. `cityview.ts` passes `overlay.relightT !== undefined`, and `main.ts:310` sets `relightT` only while relighting. The test's second assertion checks that only the fuse and feed labels remain.
3. **Fuses and feeds.**
   - The fuse box reads "<fuseLoad> of <rating>" from a `ratings` map built from `puzzle.nodes`. A fuse box with no rating gets no label (third assertion, empty `ratings`).
   - The feed reads "<load> of <capacity>" from `state.feeds`, red on `f.over` ("5 of 4" red). An unlimited feed (`capacity: null`) gets none (fourth assertion).
   - The fuse and feed labels are drawn during the Relight too, and nothing in V3 can hide them.
   - A blown fuse reads "0 of <rating>": `grid.ts:401` sets `fuseLoad` to 0 for a faulted fuse, and its icon is still type `fusebox`.
   - Both read only the current `GridState`, so nothing leaks.
4. **Josh plays 04, 06 and 11.** This is a browser check, and it waits on V4 to wire the page. Nothing calls `setLoadPreview` yet, so on this branch only the fuse and feed labels can show.

**Count.** 1 case added (the ticket allowed 2, and criterion 3's case is folded into criterion 1's). I ran `src/render3d/overlay.test.ts` with 2 workers: 18 passed, 3.2 s. The slow case is the existing `loadCityView` case, which has a 15 s timeout from PR #78. The new case is fast.

**Files.** Only the four the ticket lists. `cityview.ts` changes in `paintOverlay` and the play renderer's setter and draw call only. No `src/grid/`, `src/night/`, `src/ui/`, `main.ts`, `windows.ts` or `fx.ts` change, and there is no new dependency.

## Rule conflicts and risks
- None found against the hard rules or the Decided rules. The labels show only `LoadPreview` and the current `GridState`. "Faults hide faults" is V2's to keep, and V2 has merged.
- A fuse label turns red when `load > rating`, but the grid blows a fuse before that can stay drawn. So in practice a fuse label never reads red, which matches the ticket ("Red when the feed is over").
- Labels are not shifted away from neighbouring icons. Where two icons sit close (E1's nudge), a number may overlap the next icon. I did not check this in a browser.

## Must fix
none

## Could improve
1. `overlay.test.ts`: the case checks texts and red only. Asserting one label's `x` and `y` would pin "at the icon's side" (criterion 1). As written, a label drawn on top of its icon would still pass.
2. `renderer.ts`: `setLoadPreview` is optional, so V4 will call `setLoadPreview?.()`. That is fine for the non-play renderers. A one-line note in V4's prompt would make sure a missing setter is not silently skipped on the play view.
3. `overlay.ts`: the fuse label's `red: load > rating` can never fire (see risks). Either drop it or keep it as a guard, but say which in the doc comment.
