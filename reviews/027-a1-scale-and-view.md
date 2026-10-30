ticket: 027-a1-scale-and-view
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Part A1 of 027, in `src/render/` only. Maps never open below `MIN_SCALE = 36` px per unit. A map that doesn't fit then overflows, and on an overflowing axis the pan stops at the map's edge, `PADDING` px inside the free area. A large map opens on its first feed, and `resetView` returns to that opening view. The renderer gains `centreOn`. Picking under the HUD or the parts panel returns null. Labels whose place is off the free area are hidden, and off-screen lines and nodes are culled. The ticket says all of this leaves every current map unchanged at 1920 × 1080.

Reviewed: `git diff e5cc289..72f037f` only. In a detached copy of 72f037f, `npm run typecheck` is clean and `npx vitest run` passes 49 files and 937 tests.

## Does the branch do it?
- **Scale clamp.** `geometry.ts` splits `fitScale` (no floor, capped at `MAX_SCALE`) from `computeFit`. `computeFit` clamps to [MIN_SCALE, MAX_SCALE] and takes an optional explicit `scale` for A4.
  - `view.test.ts` "never leaves [MIN_SCALE, MAX_SCALE]" covers the range.
  - "gives a 64 x 40 map exactly MIN_SCALE" covers the synthetic map.
  - **"Every file in `puzzles/` at 1920 × 1080 with insets {220, 140} keeps today's scale": not met.** 13 files fit below 36 today and now open at 36 and overflow:
    - 35-cell-light 33.8
    - 40-the-priests-list 32.0
    - 43-parent-fuse 31.2
    - 45-live-relays 35.9
    - 47-open-point 35.9
    - 48-the-old-arrangement 32.9
    - 49-two-cells 32.9
    - 50-the-whole-quarter 35.9
    - 52-wire-short 34.8
    - 55-leave-it-blown 31.2
    - 56-whole-ward 31.2
    - 63-keep-the-wire 28.2
    - 64-the-whole-chain 26.9
  - The builder changed the test to accept these maps and only requires `below.length < FILES.length / 4`. It logs the list. That is open about the problem, but it is not the criterion. See Must fix 1.
- **Overflow and the edge-stop clamp.** `overflows()` and the `edgePad` branch in `clampAxis` follow the ticket's formula. Covered by:
  - "stops the box edge exactly PADDING inside, on each of the four sides";
  - "a fitting axis keeps the 022 rule even with edgePad given";
  - "uses each rule on its own axis".
  - `pan.test.ts` (022) is unchanged and passes.
- **Initial view and Home.** `initialPan` returns {0,0} for a map that fits. For an overflowing map it centres the first feed, clamped. `resetView` and construction both use it.
  - Tests: "opens the large map with its first feed at the free area's centre", "a feed in the corner … opens on the clamp's edge", "a map that fits gets {0, 0}", "resetView returns to the opening view from anywhere".
  - On an axis that fits, it keeps pan 0 rather than moving toward the feed ("only an overflowing axis is moved"). That is a sensible reading of "clamped" and is tested.
- **`centreOn`.** Implemented and tested for a middle node (±0.5), a corner node (clamped exactly to PADDING) and an unknown id (pan unchanged).
  - It is on a new `MapCentre` interface, not on `MapPanView` as the Interfaces section says. The returned renderer type includes it, so C's `renderer.centreOn` in main.ts will compile. This is a deviation from the interface, not a blocker (Could improve 1).
- **Hit-testing.** `hitTest` and `placeAt` check `inArea(freeArea…)` first, and `hitTestGeometry` is unchanged.
  - 20 sampled nodes after a pan are hit.
  - Nodes drawn under the top and bottom insets return null for both `hitTest` and `placeAt`, and the test asserts it found nodes in both bands.
  - The no-inset case is live everywhere.
- **Spacing.** Real test with a rule in its name: 0 offending pairs and 0 exempt pairs today. It also asserts `2 × NODE_HIT_RADIUS === MIN_SCALE`.
- **Labels.** `places.ts` `targetLabels` returns null for a place outside the free area.
  - The test sweeps six pans, including ±1e9. It checks that a place off the free area gets no label, and that every shown label is inside the free area and within one lot of its place. It asserts at least one label shown and one hidden.
- **Culling.**
  - `visibleLines` and `visibleNodes` (plus allocation-free `…Into` variants) are pure.
  - They are tested against the 32 px rule at three pans, against "fewer than all at the large map's initial view", and against "a map that fits is drawn whole".
  - The draw loop culls whole lines (32 px) and nodes (96 px, for glow and captions), not just pulses and sparks. That is invisible off-screen. The only state written inside `drawNode` is the battery label cache, which is recomputed when the node is drawn again, so skipping it is safe.
- **Existing tests.** One edit, in `render.test.ts` "keeps every node inside the canvas with padding": it now skips window sizes where the scale hits `MIN_SCALE`. That follows from the new rule. Everything else passes unedited, and the test count grew.

## Rule conflicts and risks
- **Folders:** only `src/render/` is touched. `src/grid/` and `src/night/` are untouched, there is no new dependency, and no puzzle file changed.
- **No GDD Decided rule is touched.** Relight is unchanged.
- **The ticket's premise is wrong, and Josh's browser check will fail.** The ticket says "At 1920 × 1080 every current map already fits at 36 or more, so nothing changes there". Its Josh-in-the-browser list ends with "At full size, every map opens exactly as before". Both are false at these insets.
  - The ticket's own figure ("`56` already fits at about 37 px per unit") does not hold with a 220 px top inset. 56 is 19 units tall: (1080 − 220 − 140 − 2 × 64) / 19 = 31.2.
- **Are 220 / 140 realistic? Yes, if anything kind.**
  - **Bottom:** `inventoryBottomInset()` is the panel's height + 14 + 8. Ticket 021 put that at about 140 px.
  - **Top:** `hudTopInset()` is the lower edge of the taller `.hud` column + 8. The left column is `top: 16px`, then the picker, a 10 px gap, the capacity readout, a 10 px gap, and the targets panel (label plus about 22 px per target). On a 3–5 target map that comes to roughly 200–280 px. 027 itself notes the HUD grows with more targets and feeds.
  - **Viewport:** a maximised browser on a 1920 × 1080 screen gives a canvas nearer 1920 × 950. So in practice more than these 13 maps overflow, and by more.
- **So, is it a real regression?** Yes. About a fifth of the ladder (35–64) will open slightly larger than today and need a pan to see whole, on Josh's normal screen.
  - The code implements the Decided rule faithfully. The fault is the ticket's arithmetic, which assumed no conflict.
  - **What the ticket intended:** `MIN_SCALE` should change nothing for today's maps at full size and only act on small windows and 028's large maps.
  - **What it wrote:** a hard floor of 36. The two can't both hold.
- **Risk for A4:** `centreOn` and `rebuildGeometry` call `computeFit` with no explicit scale. When A4 adds a zoomed scale, both must pass it, or the pan clamp will be computed at the wrong scale. This is expected in A4's scope; noted so it isn't missed.

## Must fix
1. **The criterion "every file in `puzzles/` keeps today's scale at 1920 × 1080 with insets {220, 140}" is unmet, and the branch can't meet it under the Decided `MIN_SCALE = 36`.** This needs a decision before A1 merges: the lead-architect re-cuts the line and Josh gives his word. Options, each with its effect:
   - (a) **Accept the overflow.** Amend the criterion and the "nothing changes at 1080p" and "every map opens exactly as before" lines. The builder replaces `below.length < FILES.length / 4` in `src/render/view.test.ts` with the exact expected list, so it can't silently grow.
     - Effect: 35–64 open at 36 and pan by about 50–200 px.
     - Once A4 lands, `F` shows them whole.
   - (b) **Lower the floor** to below today's smallest fit (about 26). This keeps every current map unchanged, but it gives up the "two nodes 1 unit apart never share a hit circle" rationale. The spacing test would need to be rerun at the new value.
   - (c) **Floor only for maps that really need it.** For example, apply `MIN_SCALE` only when `fitScale` falls below a lower threshold such as 24, and open at the plain fit above that. Today's maps stay unchanged and 64 × 40 maps still get a readable floor. The builder adds the rule to `computeFit` and a test.

   Whichever is chosen, `src/render/view.test.ts` must assert the chosen rule exactly.

## Could improve
1. Put `centreOn` on `MapPanView` as the Interfaces section specifies, and drop `MapCentre`, when B adds the stub to its play fakes. A4 widens `MapPanView` anyway. Until then the export differs from the ticket's interface.
2. Say in the ticket that the opening view centres the feed only on overflowing axes, so A3 and A4 build on the same reading.
3. The `render.test.ts` "keeps every node inside" case now skips two of its three window sizes for most maps. Adding a 1920 × 1080 size would keep its coverage.
4. `hitTest` and `placeAt` rebuild `freeArea` on every call. Caching it in `rebuildGeometry` next to `canvasRect` would be tidier. The cost is trivial.
