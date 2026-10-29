ticket: 022-center-and-pan
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Fold a clamped pan into the renderer's fit (part A) so drawing and hit-testing move together, and add right-drag panning, context-menu suppression and Home / double-right-click re-centring on the canvas (part B). main.ts re-measures the insets and re-centres on the first filled-HUD frame, on Reset and on resize.

## Does the branch do it?
Gate on the branch: typecheck clean, 655 tests pass (main: 622, so +33). No existing test file is edited.

**A, tests (`src/render/pan.test.ts`)**
- No pan gives today's numbers: "no pan equals zero pan", and every existing render test passes unedited. Met.
- Centred in the free area: a 3 × 3 matrix (shrine, synthetic wide and tall bounds; top/bottom, plus left, plus right insets), and "matches the ticket numbers" checks centre (500, 450) within ±0.5. Met.
- `computeFit` with a pan keeps the scale and adds the pan to the offsets. Met.
- `buildGeometry` moves `nx/ny/ax/ay/bx/by` and every decor point by exactly the pan. Met.
- Hit-testing follows the pan, for a node and a line midpoint. The test asserts the old position is `not.toBe(id)` where the ticket says `null`. I probed it: on this map both old positions do return `null`, so the behaviour is right and only the assertion is weaker (could-improve 1).
- `freeArea`, including the zero-size case. Met.
- `clampPan`: {0,0} unchanged, the far right/left/up/down edges sit at `PAN_KEEP`, a small box stays wholly inside, a point box stays inside. Met.

**A, code (`geometry.ts`, `map-renderer.ts`)**
- `createMapRenderer` returns `MapRenderer & MapPanView`, and `MapRenderer` is unchanged, so the `play` fakes compile.
- `rebuildGeometry()` clamps against `mapBox` of the pan-0 fit and `freeArea`, then rebuilds the geometry, the switch directions and the active slot paths, without touching the canvas size. `setPan` returns the clamped pan. `getPan` returns a copy. `resetView` calls `setPan(0,0)`. `resize()` and `setInsets()` (through `resize`) re-clamp and keep the pan. Met.
- I checked the clamp maths: when the box is centred, `k ≤ (box + area)/2`, so {0,0} is always in range. With a zero-size area, `k = 0` and lo ≤ hi still holds.

**B, tests (`src/play/pan.test.ts`)**
- Detach empties both handler maps and restores the cursor. Met.
- The right-drag numbers (pan {10,20}, 100→130/80 gives `setPan(40, 0)`), the cursor during and after, `setPointerCapture` called, and no throw without it. Met.
- No hold means no pan, and `button: 0` starts no drag. Met.
- `pointercancel` and `lostpointercapture` each end the hold. Met.
- The context menu is prevented after a drag and after a still press. Met.
- Double right-click: still presses 300 ms apart reset once and the second press starts no drag. Presses 500 ms apart don't reset. A 10 px drag then a still press doesn't reset. There is also a test that a sub-slop wobble still counts as still. Met.
- Home: resets and prevents default. A `select` / `input` target, or Ctrl held, does neither. Met.
- No grid call, no log entry, no `play:click`. Met as written, but the test is close to vacuous (could-improve 2).

**B, main.ts**
- `attachPan(canvas, renderer)` is attached in `open()`, and `detachPan()` runs in the session `detach`.
- The per-session `centred` flag re-measures and calls `resetView()` once, after the first `ui.update()`. Nothing else refits mid-play, and there is no ResizeObserver.
- The Reset listener (`kind === "reset"`) is in `offs`, re-measures and resets the view. Undo emits a different kind, so it doesn't move the view.
- The resize handler adds `resetView()`.
- No game rule is added, and the splash, audio, notices and frame loop are otherwise unchanged. Met.

**Josh in the browser:** not judged here.

## Rule conflicts and risks
- No purity issue: `src/grid/` and `src/night/` are untouched. Files stay in `src/render/`, `src/play/` and the declared `src/main.ts`. No dependency, puzzle or core change.
- These browser behaviours are covered only by fakes. I read through each one:
  - **Pointer capture ordering.** In a real browser, `pointerup` comes first and implicit `lostpointercapture` follows. `onUp` runs `endHold(true)` and arms the double-click. `lostpointercapture` then hits `endHold(false)` with `hold === null` and returns early, so the arming survives. This is correct, but no test fires `pointerup` followed by `lostpointercapture`, which is the order a real browser always uses (could-improve 3).
  - **Chorded buttons.** If the left button is pressed during a right-drag, and the right button is released first, the browser sends a `pointermove` (not a `pointerup`), so `onUp` never sees `button === 2`. The final `pointerup` (button 0) is ignored, but the implicit capture release fires `lostpointercapture`, which ends the hold. Only a canvas without capture support would keep a stuck hold. This is low risk. `onMove` could also check `(e.buttons & 2) === 0` to end the hold (could-improve 4).
  - **Context menu timing.** Windows fires `contextmenu` on mouseup and macOS/Linux on mousedown. The listener always prevents it, so both are fine. Right presses fire `auxclick`, not `click`, so play's left-click path is safe.
  - **Hover during a drag.** Play's `pointermove` is registered before pan's, so on each move the hover hit-test runs against the geometry from before that move's `setPan`. The prompt lags one event behind while dragging, which is cosmetic.
  - **Centring on load.** The first frame draws with the pre-HUD insets, then re-centres after `ui.update()`. So for one frame (about 16 ms) the map sits in the old, too-high spot before it jumps. This could be a barely visible flash at load. It is cosmetic, but Josh may notice it (could-improve 5).
  - **Home with a focused button.** Home with a HUD button focused re-centres the map. The ticket only excludes select, input and textarea, so this is as specified.

## Must fix
none

## Could improve
1. `src/render/pan.test.ts`, "hit-testing follows the pan": assert `toBeNull()` for the old node position and the old line midpoint, as the ticket states. Both are `null` today, so the change only tightens the test.
2. `src/play/pan.test.ts`, the "no grid call" test: its `attachPan` uses a separate fake canvas that has no tie to `play`, so it can't fail. Attaching `play` and pan to the same fake canvas, or dropping the test in favour of the fact that `pan.ts` imports only a type from `../render`, would be more honest.
3. `src/play/pan.test.ts`: add the real-browser sequence of a still press, `pointerup`, then `lostpointercapture`, then a second press within 400 ms, and assert that it resets. This guards the early return in `endHold` that the double right-click depends on.
4. `src/play/pan.ts` `onMove`: end the hold when `e.buttons` no longer includes the right button (2). This covers chorded releases on canvases without pointer capture.
5. `src/main.ts`: do the first-frame measurement and `resetView()` before `renderer.draw` on the frame after `ui.update()` first runs, or run `ui.update()` once in `open()` before the first draw. This avoids the one-frame flash of the too-high fit.
