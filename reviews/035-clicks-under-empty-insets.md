ticket: 035-clicks-under-empty-insets
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
The ticket replaces 027's "free area only" click gate with "on the canvas and not under any overlay panel". The renderer (A) takes a list of blocker rects and checks clicks against it. The ui (B) measures the HUD columns, the inventory, the sound dock and the popover on every frame and passes their rects to the renderer from one line in `main.ts`. This makes nodes drawn in the empty middle of the top and bottom bands clickable without pressing F, and nothing under a panel can be picked.

Reviewed: `git diff 2b5b9c8..HEAD` (9e3de00, 101a3b5, edc43c4).

## Does the branch do it?

**A · renderer**
- **The report, as a test.** `src/render/blockers.test.ts` "the report: a node drawn in the empty bottom band is clickable". It uses 64-the-whole-chain at 1100×650 with insets {220, 140} and `zoomStep(1, 650, 275)` twice. It asserts `H-140 < y < H` for `sw_x` and that `hitTest` returns `"sw_x"`. Met.
- **Top band.** "a node drawn in the empty top band is clickable after a pan". It pans node 0 to y=100, then asserts that every node drawn at `0 < y < 220` on the canvas is hit, and that there is at least one. Met.
- **Blockers block.** "a blocker kills hitTest and placeAt inside it…" checks inside, the edge (inclusive), just outside, and `setBlockers([])` making the point live again. "placeAt is blocked inside a blocker and live outside it" covers `placeAt` on a real place. The test uses a rect around the node, not the ticket's literal `{0,500,200,650}`. The rule is the same. Met.
- **Copy and replace.** `setBlockers` maps the input to fresh objects, which copies the list and each rect, and assigns it whole. "keeps a copy" mutates both the array and the rect afterwards and still gets `null`. The replace is covered by the `setBlockers([])` revive. Met.
- **Off canvas is dead.** `live()` in `map-renderer.ts` rejects anything outside `0..width`/`0..height` (written as a negated conjunction, so NaN is dead too) and then any `inArea` blocker. "points off the canvas are dead" checks all four sides plus a corner, for both functions. Met.
- **Live everywhere else.** `hitTest` and `placeAt` now gate only on `live()`. The free area, insets, fit, pan clamp, labels and markers are untouched: the map-renderer diff covers only the interface, `setBlockers`/`live`, and the two gate lines. The 027 comment is replaced. Met.
- **No regression, and the changed tests.** Exactly two existing tests changed. Each now sets two blockers that cover the full top band `{0,0,W,220}` and the full bottom band `{0,H-140,W,H}`, which are exactly the old dead regions. Their assertions are unchanged: `null` for nodes and fixed points in the bands, with counts > 0 in view.test, at every zoom level in zoom.test. They still prove what they meant to: nothing under a panel is picked. Met.
- **The MapBlockers deviation.** `MapBlockers` is its own exported interface, following the existing `MapPlaces`/`MapPanView` pattern. Six `src/play` test files use `MapRenderer`, so adding the method there would have broken their fakes and pulled `src/play` into scope. `createMapRenderer` returns the intersection and `main.ts`'s `Session.renderer` adds `& MapBlockers`. Acceptable, and consistent with how 024 did it.

**B · ui**
- **Measuring.** `src/ui/blockers.ts` has `BLOCKER_SELECTORS` exactly as listed. `measureBlockers` reads the canvas rect once, offsets each matched rect by the canvas origin, clamps it to `0..width`/`0..height`, and drops it if the result is empty. That one check covers both 0×0 rects and rects wholly off the canvas. It looks at no styles, so the whole rect counts. It does not import from `src/render` (it uses a structural `Rect`). `src/ui/blockers.test.ts` uses stubs (no jsdom) with the canvas at (30, 40). It covers relative rects, clipping on all four edges, a 0×0 rect, all four off-canvas directions, two `.hud` columns giving two rects, the exact selector query order, and one read per element. Met.
- **Wiring.** `main.ts` adds the `measureBlockers` import, `MapBlockers` in the render import, `& MapBlockers` on `Session.renderer`, and `s.renderer.setBlockers(measureBlockers(uiRoot, canvas))` right after `s.ui.update()` in `frame`. The `setInsets` calls are unchanged and nothing else changed. The type and import are the minimum the call needs. Met.

**Both**
- **Gate.** `npm run gate` passed twice in D:\rp-035: 66 files and 1167 tests both times, ~43 s each. No flaky test in either run. The slow every-level tests (3–4 s) passed well inside their timeouts. The test count grew by 18 (6 render + 12 ui).
- **Together.** A and B are on one branch, so they merge as one unit. B's `main.ts` line needs A's `setBlockers` to typecheck, so B cannot land without A. If A landed alone, blockers would default to `[]` and clicks would pass through the HUD, but nothing on this branch allows that.
- **Josh checks.** Pending; see below.

## Rule conflicts and risks
- No `src/grid/`, `src/night/`, `src/core/`, `src/play/` or `puzzles/` change. No dependency added. The edge-star/marker code is not touched. Every file is in the ticket's list. `src/render/index.ts` also re-exports `Rect` and `MapBlockers`; that is a small, harmless addition.
- **Overlays not in the selector list.** I checked everything `mountUI` appends to `#ui`:
  - Covered: the map picker, the capacity readout, the battery panel and the priests' list sit inside `.hud-left`, and the controls inside `.hud-right`, so the `.hud` rects cover them. The popover is absolutely positioned outside the dock's box, so it needs its own selector, and it has one.
  - The win splash is safe without a blocker. It is `pointer-events: auto`, and every map pointer listener (play, pan, main's hover) is on the canvas element. A click or hover over the splash never reaches the canvas, and moving onto it fires `pointerleave` on the canvas, which clears hover.
  - The banner (top centre) is `pointer-events: none` and is not a blocker. It used to sit in the dead top band, so a node drawn under it can now be thrown through its text. The same goes for the notices and the prompt. This follows the approved default for the prompt and notices, and the ticket's own line for the banner. Josh should look at the banner case.
- **Per-frame cost.** Each frame does 4 `querySelectorAll` (static NodeLists), about 5 `getBoundingClientRect`, and a few small arrays (plus the renderer's copy). That is negligible next to the canvas draw.
- **Layout thrash.** This is not a real concern. The read comes after `ui.update()`'s writes, but `ui.update()` writes only on change (`setText`/`setProp` and key diffs). On a steady frame the layout is clean and the reads cost nothing. On a frame where something changed, the read forces the one layout the browser would have done before paint anyway. Nothing after it in `frame` writes to the DOM (`setInsets`/`resetView` touch renderer state only), so the layout is not invalidated and redone. Thrash needs read/write/read/write interleaving. `ui.update()` already does that internally (`placePrompt` and `noticesTick` read after earlier writes), and this line adds one read at the end of that sequence. If 033-style auditing ever wants it gone, the ui could keep the last measured rects and the renderer could compare before copying. That saves allocations, not layout.

## Must fix
none

## Could improve
1. `src/render/blockers.test.ts`, "points off the canvas are dead": the last assertion, `expect(r.hitTest(g.nx[0]!, g.ny[0]!)).not.toBeUndefined()`, can't fail, because `hitTest` returns a string or `null`. Assert `.toBe(g.nodeIds[0])` (after `fitWhole` the node is inside the canvas) so the "live at the canvas edge" claim is actually tested.
2. `src/ui/blockers.ts` runs `querySelectorAll` four times per frame on elements that only change on a map switch. It could take the elements once per session, though a static list would then miss nothing only if `mountUI` never rebuilds the panels mid-session. Optional, since the cost is small.
3. If Josh finds the banner case below annoying, adding `.banner` to `BLOCKER_SELECTORS` is a one-word follow-up ticket.

## What only Josh's eyes can judge
- On `64-the-whole-chain` at about 1100×650: zoom in and out, pan, and click breakers and switches drawn in the empty middle of the bottom band and the top band. Each should throw without pressing F.
- Clicking or hovering on the HUD columns (including the gaps between the readout and the list, which count as blocked), the priests' list, the inventory, the speaker and the open popover never throws or highlights a node under them.
- Whether it feels right that a node drawn under the brownout/win **banner**, a **notice** or the **repair prompt** can be clicked through their text (approved defaults; the banner is new since 027).
- At ≤600 px wide, `.hud-left` stretches nearly the full width. The top band becomes mostly blocked there, which is expected but worth a glance.
- The win splash blocks clicks over its own box, and the map stays usable around it.
