# 035 · Clicks work on nodes drawn in the empty part of the HUD bands

owner: renderer (part A), ui (part B, with declared lines in `src/main.ts`)
status: done
branch: `ticket/035a-hit-blockers` (A), `ticket/035b-measure-blockers` (B, branched from A)
depends on: the edge-star fix on the 027 branch, which edits `map-renderer.ts` near the marker call. Both parts branch from `try/all` after that fix merges. Do not touch the star or marker code here.

## Josh's words
> "I'm unable to click on controls if I zoom in and out. I need to hit 'F' to fix it. I believe the hitboxes are misaligned."

(His screenshot: `64-the-whole-chain`, zoomed, with nodes drawn near the bottom of the screen.)

## What is wrong
The hitboxes are aligned. Since 027, `hitTest` and `placeAt` return `null` for any point outside the free area, which is the canvas minus the top inset (about 220 px, the HUD columns) and the bottom inset (about 140 px, the inventory and the sound dock). 027 did this so a click on the HUD never picks a node under it. But the insets are full-width bands, and the panels only fill the corners. The middle of each band is empty canvas. Zoom and the pan clamp let nodes be drawn there, and those nodes can't be clicked. Map 64 overflows the free area at every zoom, and at 1100×650 the free area is only 290 px tall. **F** (`fitWhole`) pulls every node back into the free area, which is why it seems to fix it.

## The fix
The gate becomes **"inside the canvas and not inside any blocker rect"**. Blockers are the real rects of the overlay panels, measured by `main.ts`. 027's intent holds: nothing under a panel can be picked. A blocker is the element's whole rect, whether or not it captures the pointer, so HUD text with `pointer-events: none` still blocks.

Rejected options:
- Dropping the gate: clicks would pass through HUD text.
- Clamping zoom and pan so nodes never enter the bands: a large change to how the map moves.

## Part A · renderer (`src/render/`)
- `MapRenderer` gets `setBlockers(rects: readonly Rect[]): void`. It uses `Rect` from `geometry.ts` (`left, top, right, bottom`, canvas CSS px). It keeps a copy and replaces the whole list on each call. The default is `[]`.
- `hitTest(x, y)` and `placeAt(x, y)` return `null` when the point is off the canvas (`0..width`, `0..height`) or inside any blocker (`inArea`, edges inclusive). Otherwise they behave as now. The free area, insets, fit, pan clamp, labels and markers are unchanged.
- Delete the 027 comment at the gate and write a new one.

## Part B · ui (`src/ui/`, plus declared lines in `src/main.ts`)
- New `src/ui/blockers.ts` (pure, no DOM types needed):
  - `BLOCKER_SELECTORS = [".hud", ".inventory", ".sound-dock", ".sound-popover"]`.
  - `measureBlockers(root, canvas): Rect[]`. `root` is anything with `querySelectorAll(sel)` that returns items with `getBoundingClientRect()`. `canvas` is anything with `getBoundingClientRect()`. It returns every matched element's rect, made relative to the canvas and clipped to it. It drops zero-area rects (a closed popover is `display: none` and measures 0×0) and rects wholly off the canvas.
  - It returns the renderer's `{left, top, right, bottom}` shape, not `src/ui/logic.ts`'s `Rect`.
- Banner, prompt, notices and splash are not blockers. The splash takes the pointer itself. The others are transient text, and blocking them could hide the node the prompt is about.
- **`src/main.ts`, declared lines.** The ui agent owns these, as in 030.
  - Call `s.renderer.setBlockers(measureBlockers(uiRoot, canvas))` once per frame, right after `s.ui.update()`.
  - Every frame, because the HUD's height, the targets list and the popover all change without an event that `main.ts` sees. That covers resize, map load, Reset, list changes and the popover opening or closing. It costs one layout read of at most 5 rects.
  - The `setInsets` calls stay as they are. Nothing else in `main.ts` changes.
- **Merge A and B together.** On its own, A lets clicks through the HUD until B passes the blockers.

## Acceptance criteria
All are Vitest unless marked Josh.

**A · renderer**
- [ ] **The report, as a test:** `64-the-whole-chain` at 1100×650 with insets `{top: 220, bottom: 140}`, after `zoomStep(1, 650, 275)` twice. `sw_x` is drawn with `H - 140 < y < H` (in the bottom band, on the canvas), and `hitTest` at its screen point returns `"sw_x"`. This is the scratch `fail.test.ts`, made permanent.
- [ ] **Top band too:** on the same map and zoom, after a pan that puts a node at `0 < y < 220`, that node is hit.
- [ ] **Blockers block:** with `setBlockers([{left: 0, top: 500, right: 200, bottom: 650}])`, a node drawn inside that rect gives `null` from `hitTest`, and a place inside it gives `null` from `placeAt`. Just outside the rect, both hit as before. A later `setBlockers([])` makes the point live again.
- [ ] **Off canvas is dead:** points at `x < 0`, `x > width`, `y < 0` and `y > height` return `null` from both.
- [ ] **No regression:** with no blockers set, every existing `hitTest`/`placeAt` test passes. Tests that asserted `null` in an empty band are rewritten to set a blocker there; the reviewer checks each one.

**B · ui**
- [ ] **Measuring:** `measureBlockers` with stub elements (no jsdom), with the canvas at client `(30, 40)`, returns canvas-relative rects. It clips a panel that overhangs the canvas edge, and drops a 0×0 rect and one wholly off the canvas. It queries exactly `BLOCKER_SELECTORS`, and two `.hud` columns give two rects.
- [ ] **Wiring (reviewer reads `main.ts`):** one `setBlockers(measureBlockers(...))` call per frame after `ui.update()`. No other `main.ts` change.

**Both**
- [ ] `npm run gate` is green on each branch, and the test count grows.
- [ ] **Josh checks** (`npm run dev`, `64-the-whole-chain`, window about 1100×650):
  - Zoom in and out, pan, and click every breaker and switch. Include ones drawn in the middle of the bottom band and the top band. Each one throws without pressing F.
  - Clicking on the HUD columns, the priests' list, the inventory, the speaker and the open sound popover never throws a node under them. Hover over them highlights nothing on the map.

## Files
- **A:** `src/render/map-renderer.ts` (the interface, `setBlockers`, the two gate lines), plus tests in `src/render/` (a new `blockers.test.ts`, and edits to existing hit tests only as described above).
- **B:** new `src/ui/blockers.ts` and `src/ui/blockers.test.ts`, plus the declared lines in `src/main.ts`.
- Out of scope: `src/core/`, `src/grid/`, `src/night/`, `src/play/`, `puzzles/`, the edge-star/marker code, and `geometry.ts`'s free area.

## Interfaces
- `MapRenderer.setBlockers(rects: readonly Rect[]): void` (render's `Rect`). A builds it and B calls it.
- `measureBlockers(root, canvas): Rect[]` and `BLOCKER_SELECTORS` in `src/ui/blockers.ts`.
- No `src/core/` change. No dependencies and no assets.

## GDD check
This is input plumbing only. No rule, number or puzzle changes, and `rules-coverage.md` doesn't change.

## Open questions for Josh (defaults apply if you just approve)
1. **Measure every frame, or only on events?** **Default: every frame.** It is simple, and it can't miss a list or popover change. The alternative is to measure at the `setInsets` sites plus popover toggles. That is fewer layout reads, but one could be missed.
2. **Should the repair prompt and the notices block clicks?** **Default: no.** They are transient, and the prompt sits next to the node it is about.
