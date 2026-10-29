# 022 · Map centred in the free area; right-drag to pan

owner: renderer (A), interaction (B)
status: done
branch: one per part: `ticket/022-center-and-pan-a`, `ticket/022-center-and-pan-b`

## Josh's words
"maps should be centered in the UI, you should also be able to right click and drag to move grab and move the map."

## Where it is today
- **The fit** is `computeFit()` in `src/render/geometry.ts`. It scales the map's bounds (`puzzleBounds`: every node and decor point) uniformly into the canvas, minus `PADDING = 64` on each side and minus `insets`, and centres it in what is left. `buildGeometry()` bakes that fit into screen-space arrays (`nx`, `ny`, `ax`…, `decor`). The renderer draws from those arrays, and `hitTestGeometry()` tests against the same arrays. So drawing and hit-testing already share one transform. `createMapRenderer` rebuilds the geometry in `resize()`, and `setInsets()` calls `resize()`.
- **The insets** come from `src/main.ts`. `hudTopInset()` is the lower edge of the tallest `.hud` column plus 8 px. `inventoryBottomInset()` (ticket 021) is the `.inventory` panel's top edge plus 8 px. They are measured in three places: when the renderer is created (before `mountUI`, so 0), once right after `mountUI`, and on `window` `resize`.
- **Why the map looks off-centre (likely):** right after `mountUI` the HUD is still empty. The capacity readout and the targets list are filled by `ui.update()` on the first frame (`src/ui/index.ts` `update()`, the `capacityKey` / targets blocks). So the top inset is measured too short. The map is fitted too high, partly under the HUD, and stays there until the window is resized. The HUD can also change height later (battery rows, capacity rows), and nothing re-measures it.
- **Screen to map:** `src/play/play.ts` `attach(canvas)` turns `clientX/Y` into canvas-local CSS px (`getBoundingClientRect`) and asks `renderer.hitTest(x, y)` for hover and left-click. No other code maps screen to map. The ui's hover prompt is placed from the pointer, not from map coordinates.
- There is no right-button handling, no `contextmenu` handler and no cursor styling anywhere.

## Who owns what, and why two parts
- **Renderer (`src/render/`)** owns the transform: the fit, the pan offset, the clamp, drawing and `hitTest`. If the pan is folded into the fit, one geometry serves both drawing and hit-testing, so they cannot drift apart.
- **Interaction (`src/play/`)** owns pointer input on the canvas: the right-drag, the context menu, the cursor, and the reset-view gestures.
- **`src/main.ts` wiring** (re-measuring the insets, re-centring on load, Reset and resize, attaching the pan input) goes to **B**, as a declared cross-folder edit. It is a few lines, and it needs B's `attachPan`. (Precedent: 015 D, 019 B, 020 B, 021 put main.ts wiring with the part that needed it.)

This is two owners, so it is **two parts, as 020 was.** It is not one owner's ticket. A goes first, and B codes against A's `MapPanView`.

## Goal
Every map opens centred in the space the HUD leaves free: below the top HUD columns, above the bottom-left parts panel, and centred left to right. It is re-centred when another map is picked, after Reset, and when the window is resized. Holding the right mouse button on the map and dragging moves the map with the pointer. The cursor shows "grabbing" while the map is held, and no browser context menu appears, whether the right-click drags or not. The map can't be dragged out of sight: at least 96 px of it always stays in the free area. Pressing **Home**, or double-right-clicking the map, puts it back in the centre. Left-click throws and repairs, and the hover text, land on the element under the pointer wherever the map has been moved. Nothing else changes.

## Decided in this cut
- **The pan is folded into the fit.** `computeFit` and `buildGeometry` take an optional `pan: { x, y }` (CSS px) that is added to `offsetX` / `offsetY`. Drawing and `hitTest` read the same geometry, so they move together. There is no separate canvas `translate`, and `play.ts`'s screen-to-canvas conversion is unchanged. A pan rebuilds the geometry, the switch directions and any active blow-slot paths: the same work `resize()` does, but without resizing the canvas. Maps are small, so this is cheap at pointer-move rate.
- **Centred means centred on the map's bounds** (`puzzleBounds`, nodes and decor), within the free area, as `computeFit` does now. Captions drawn below lamps and feeds sit inside `PADDING`. There is no change to `PADDING` or to the scale. Panning never changes the scale.
- **The free area** is the canvas minus the insets: `left = insets.left`, `top = insets.top`, `right = width - insets.right`, `bottom = height - insets.bottom` (missing insets are 0, and the area is never negative in size).
- **The clamp:** `PAN_KEEP = 96` px.
  - `box` is the map's screen box at pan 0: its bounds times the scale plus the offsets, without padding.
  - On each axis, the panned box must overlap the free area by at least `k = min(PAN_KEEP, box size on that axis, area size on that axis)`.
  - So for x: `area.left + k - box.right <= pan.x <= area.right - k - box.left`, and the same for y. A pan outside that range is clamped to the nearest edge of it.
  - Pan `{0, 0}` (centred) is always inside the range.
- **When the view re-centres (pan back to 0):** on map load (each new renderer starts at 0), on picking another map (the same path), on **Reset** (the `play:click` event with `kind: "reset"`, which 019 added), on window `resize`, on **Home**, and on a **double right-click**.
  - **Undo does not move the view.**
  - **The map does not refit when the HUD or the inventory changes height mid-play** (Josh's answer 2). It only re-measures and re-centres at the moments listed above.
- **Insets are measured once the HUD is filled.** Re-centring means `setInsets({ top: hudTopInset(), bottom: inventoryBottomInset() })`, then `resetView()`. main.ts does this:
  - **at load:** once per opened map, on the first frame after `ui.update()` has run, so the HUD is filled. This fixes the off-centre fit at load. The existing measurement right after `mountUI` can stay or go.
  - **on Reset:** on `play:click` with `kind: "reset"`.
  - **on `window` `resize`:** the existing listener also calls `resetView()`.
  - **Home and double right-click** call `resetView()` only, without re-measuring.
  - There is no `ResizeObserver`.
- **Right-drag:**
  - A `pointerdown` with `button === 2` on the canvas starts a hold. It records the pointer and `getPan()`, calls `canvas.setPointerCapture(pointerId)` when available, and sets `canvas.style.cursor = "grabbing"`.
  - Each `pointermove` while held calls `setPan(startPan.x + dx, startPan.y + dy)`. The renderer clamps.
  - `pointerup` (button 2), `pointercancel` or `lostpointercapture` ends the hold, and the cursor goes back to `""`.
  - Hover keeps updating during a drag (play's own `pointermove`), so the prompt follows whatever is under the pointer.
  - Josh asked for a grab state "while dragging". The canvas shows no "grab" hand at rest, because the map's normal cursor stays the default arrow (see Open question 4).
- **Context menu:** a `contextmenu` listener on the canvas always calls `preventDefault()`, for a plain right-click and after a drag alike. The HUD's own controls are not on the canvas, so they keep the browser's menu.
- **Reset view:**
  - **Home** key: a `keydown` listener on the canvas's `ownerDocument`. It is ignored when the target is a `select`, `input` or `textarea` (the picker uses Home), and when Ctrl, Alt or Meta is held. Otherwise it calls `preventDefault()` and `resetView()`.
  - **Double right-click:** two right-button presses within `RIGHT_DOUBLE_MS = 400` ms, where the first press moved less than `DRAG_SLOP = 4` px before its release. The second press calls `resetView()` and does not start a drag. A real drag (moved 4 px or more) never counts as the first click of a double.
- **Panning is view-only.** It never calls the grid, never logs, and emits nothing on the bus. It works during the Relight: watching the cascade is not an input to it. Left-click is not changed: `button 0` still goes through play's `click` handler, and right presses never fire `click`.

## Acceptance criteria
- [ ] **A (renderer), Vitest in `src/render/` (pure, in a new `src/render/pan.test.ts` or alongside the existing geometry tests):**
  - `computeFit` with no `pan` gives exactly today's numbers. Every existing `src/render/` test passes without edits.
  - **Centred in the free area:** for a 1000 × 800 canvas with insets `{ top: 200, bottom: 100 }`, the map box from `mapBox(bounds, fit)` has its centre at x = 500 and y = (200 + 700) / 2 = 450 (±0.5). The same holds with a `left` or `right` inset (horizontal centre between them). Use `08-shrine-circuit` bounds and a synthetic wide and a synthetic tall bounds.
  - `computeFit(..., pan)` keeps `scale`, and adds `pan.x` / `pan.y` to `offsetX` / `offsetY`.
  - `buildGeometry(..., pan)` moves every `nx`, `ny`, `ax`, `ay`, `bx`, `by` and decor point by exactly the pan.
  - **Hit-testing follows the pan:** after a pan of `{ x: 150, y: -90 }`, `hitTestGeometry` at a node's new screen position returns that node, and at its old position (now farther than the hit radius from anything) it returns `null`. The same holds for a line midpoint.
  - `freeArea(width, height, insets)` gives the rectangle above, and a zero-size area (not negative) when the insets exceed the canvas.
  - `clampPan`:
    - `{0, 0}` comes back unchanged for every case tested.
    - A pan far to the right (`x: 10_000`) is clamped so the box's left edge sits at `area.right - PAN_KEEP`. The same check runs to the left, up and down.
    - A box smaller than `PAN_KEEP` on an axis is clamped so the whole box stays inside the area on that axis.
    - A degenerate box (a one-node map: zero width) keeps its point inside the area.
  - `npm run gate` green, and the test count grows.
- [ ] **A (renderer), code:**
  - `createMapRenderer` returns `MapRenderer & MapPanView` (see Interfaces).
    - `setPan` clamps with `clampPan` against the current free area, and rebuilds the geometry (not the canvas size). It returns the clamped pan.
    - `getPan` returns the current pan.
    - `resetView` sets the pan to `{0, 0}`.
    - `resize()` and `setInsets()` keep the pan, re-clamped to the new area.
  - `MapRenderer` itself is unchanged, so the fakes in `src/play/` tests still compile.
- [ ] **B (interaction), Vitest in `src/play/` (fake canvas, fake document and fake `MapPanView`, as `play.test.ts` fakes the canvas):**
  - `attachPan(canvas, view, doc)` adds its listeners. Its detach removes every one of them (a handler map ends empty) and restores the cursor.
  - **Right-drag:** pointerdown `{ button: 2, clientX: 100, clientY: 100 }` with the view at pan `{10, 20}`, then pointermove to `(130, 80)`, calls `setPan(40, 0)`. The cursor is `"grabbing"` during the hold and `""` after pointerup. `setPointerCapture` is called when present, and a canvas without it does not throw.
  - Pointermove with no right button held calls nothing. A left-button pointerdown (`button: 0`) starts no drag.
  - `pointercancel` and `lostpointercapture` both end the hold, and a later pointermove pans nothing.
  - **Context menu:** a `contextmenu` event gets `preventDefault()` after a drag, and after a plain press-and-release with no movement.
  - **Double right-click:** two still right presses 300 ms apart call `resetView()` once (inject the clock, as `MapPlayOptions.now` does), and the second press starts no drag. Presses 500 ms apart do not reset. A drag of 10 px followed by a still press within 400 ms does not reset.
  - **Home:** a `keydown` `{ key: "Home" }` on the document calls `resetView()` and `preventDefault()`. A `keydown` from a `select` target, or with `ctrlKey` held, does not.
  - Panning makes no grid call and adds no log entry: `exportLog()` and `grid.state().actions` are unchanged after a drag, and no `play:click` is emitted.
  - Every existing `src/play/` test passes without edits. `npm run gate` green, and the test count grows.
- [ ] **B (interaction), `src/main.ts` wiring:**
  - `attachPan(canvas, renderer)` is attached in `open()`, and its detach is called in the session's `detach`.
  - **At load:** a per-session flag makes the first frame after `ui.update()` re-measure the insets (`setInsets({ top: hudTopInset(), bottom: inventoryBottomInset() })`) and call `resetView()`, once per opened map. Later HUD height changes do not refit.
  - **On Reset:** `bus.on("play:click")` with `kind === "reset"` re-measures the insets and calls `renderer.resetView()`. The `off` goes in the existing `offs`.
  - **On resize:** the `window` `resize` handler also calls `resetView()`.
  - No game rule in main.ts. The win splash, sound, notices and frame loop are otherwise untouched.
- [ ] **Josh in the browser** (`npm run dev`), after B:
  - **Centred on load:** open `01-first-light`, then a big map (`56-meet-in-the-middle`), then one with a battery (`18-battery-run`). Each map's middle sits halfway between the bottom of the tallest HUD column and the top of the parts panel, and halfway across the window. No lamp, line or caption is under the HUD or the parts panel.
  - **Picking another map** from the picker, and **Next level** on the win splash, open the new map centred, with no pan carried over.
  - **Right-drag:** hold the right button on the map and drag. The map follows the pointer, and the cursor is the closed "grabbing" hand. Release: the arrow returns. No context menu appears, and none appears on a plain right-click on the map either. A right-click on the picker or the buttons is not affected.
  - **Clicks land after a pan:** drag the map well off-centre, then hover a lamp (the `Lv…` prompt names it), throw a breaker, flip a switch and repair a fault with a left-click. Each one hits the element under the pointer.
  - **Can't lose it:** drag hard toward each edge and corner. A strip of the map always stays in view, and it never disappears under the HUD or the parts panel.
  - **Back to centre:** press Home, and the map re-centres. Drag it off again and double-right-click the map: it re-centres. Drag it off and press **Reset**: the map re-centres and the puzzle resets. Drag it off and press **Undo**: the map stays where it is.
  - **Resize:** drag the map off, then resize the window (and try ~400 px wide in devtools). The map re-centres in the new free area.
  - **Unaffected:** win a map. The Relight plays, sound plays, and the splash appears as before. You can pan while the Relight plays without it stopping. The splash's Next, Replay and Esc work. Notices still appear. The Home key while the picker has focus moves the picker, not the map.

## Files
- **A (renderer):** `src/render/` only (`geometry.ts`, `map-renderer.ts`, `index.ts` for exports, new test file).
- **B (interaction):** `src/play/` (new `pan.ts`, `index.ts` export, new test file) and **`src/main.ts`** (the wiring above; a declared cross-folder edit).

Out of scope for every part: `src/core/`, `src/grid/`, `src/ui/`, `src/audio/`, `puzzles/`, `index.html`, `package.json`.

## Order
1. **A** first, about half a day. It is pure geometry plus three renderer methods.
2. **B** after A merges. Its branch starts from `main` with A in, because it imports `MapPanView` and calls `resetView`. B may write `pan.ts` and its tests against the interface below while A is in review.

## Interfaces
Nothing new in `src/core/`: the pan is a render/play contract, like 020's types. Each builder writes these into its own folder.

`src/render/geometry.ts` (A):
```ts
export interface Pan { x: number; y: number }
export interface Rect { left: number; top: number; right: number; bottom: number }
/** Pixels of the map's box that must stay inside the free area on each axis. */
export const PAN_KEEP = 96;
/** The canvas minus the insets, never negative in size. */
export function freeArea(width: number, height: number, insets?: Insets): Rect;
/** Screen box of `bounds` under `fit` (no padding). */
export function mapBox(bounds: Bounds, fit: Fit): Rect;
/** Clamp `pan` so the panned `box` overlaps `area` by min(keep, box size, area size) on each axis. {0,0} is always allowed when `box` is centred in `area`. */
export function clampPan(pan: Pan, box: Rect, area: Rect, keep?: number): Pan;
// Existing, gaining an optional last parameter (callers unchanged):
export function computeFit(bounds: Bounds, width: number, height: number, padding: number, insets?: Insets, pan?: Pan): Fit;
export function buildGeometry(puzzle: Puzzle, width: number, height: number, padding: number, insets?: Insets, pan?: Pan): Geometry;
```

`src/render/map-renderer.ts` (A), exported from `src/render/index.ts` with `Pan`:
```ts
export interface MapPanView {
  /** Current pan in CSS px, added to the centred fit. {0,0} = centred in the free area. */
  getPan(): Pan;
  /** Pan to (x, y), clamped (clampPan); rebuilds geometry so drawing and hitTest move together. Returns the clamped pan. */
  setPan(x: number, y: number): Pan;
  /** Back to {0,0}. */
  resetView(): void;
}
export function createMapRenderer(canvas: HTMLCanvasElement, puzzle: Puzzle, opts?: MapRendererOptions): MapRenderer & MapPanView;
```
`MapRenderer` is unchanged.

`src/play/pan.ts` (B), exported from `src/play/index.ts`:
```ts
export const RIGHT_DOUBLE_MS = 400;
export const DRAG_SLOP = 4;
export interface PanInputOptions {
  /** Clock in ms for the double right-click; tests inject one. Default performance.now. */
  now?: () => number;
}
/** Right-drag pans, contextmenu suppressed, Home / double right-click reset the view. Returns detach. */
export function attachPan(
  canvas: HTMLCanvasElement,
  view: MapPanView,
  doc?: Pick<Document, "addEventListener" | "removeEventListener">,
  options?: PanInputOptions,
): () => void;
```

No event or payload changes. **No new dependencies.** Pointer capture is a browser built-in.

## GDD check
This is view and input only. No rule, number, payload or puzzle file changes. "The Relight can't be interrupted" holds: panning is not an input to the grid or to play, and the cascade runs on regardless. No rules-coverage change.

## Josh's answers (relayed by the main session; not G1 approval)
1. Reset-view key: **Home plus double right-click.** Yes.
2. Re-centre **at load, on picking another map, on Reset and on window resize**. Not on every HUD height change mid-play. (The first-frame HUD measurement at load still applies, so the initial centring is correct.) Folded into "Decided in this cut" and B's main.ts criteria: no `ResizeObserver`.
3. **Reset re-centres the view.** Yes.
4. Cursor: **arrow at rest, grabbing while the right button is held.** Yes.
5. Wheel zoom: **not in this ticket, maybe in the future.** Not cut.

## Open questions
None open. See Josh's answers above. The city backdrop Josh asked for alongside this ticket is ticket 023.
