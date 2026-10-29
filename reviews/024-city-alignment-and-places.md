ticket: 024-city-alignment-and-places
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
*This is the second pass. It adds Part A3 (commit 2df5dc0), which is reviewed in the A3 sections below. The text on parts 0, A1, A2 and B is from the first pass and still stands. The header now covers the whole branch.*

Inside each map's footprint the streets are the circuit: a lane under every line, a square at every node, buildings only in the gaps, feed lanes out to the shared grid, which carries on unchanged outside. Each lamp gets one place shaped by `placeKind(id)`, only its own place glows, targets get a quiet `placeName` label, and the "Priests want lit" list and the map's places highlight each other through `MapOverlay.highlight` and `placeAt`.

**A3:** a calm town. Streets are thin, faint lines with a ring road at the footprint, and blocks hold lots in four sizes. Lots and places are dropped within `WIRE_CLEAR_PX` / `nodeClearPx` px of the circuit, at the current scale. Places take lot slots, with one plan per kind. The glow is one round sprite. Labels are kept on screen, or hidden.

## Does the branch do it?
**Round 2 (commit d1c2a55).** The one round-1 must-fix is resolved, and nothing else changed.
- `git diff a8e7bca..d1c2a55` touches only two test files. `src/render/places.test.ts` gains one test (+30 lines). `src/render/streets.test.ts` only adds a 60 s timeout to "shared grid minus the footprint". No source file changed.
- The new test is "labels never cover a lamp's Lv caption or target star, at five scales". It runs at scales 15, 30, 45, 70 and 120, over every open map, for every label `targetLabels` shows.
  - Its caption box is centred at `y + cr + 13`, 7 px per glyph of `lampCaption(load)`, 14 px tall. Its star box is 16 × 16, centred at `y − cr − 17`. These match where `map-renderer.ts` draws them (`fillText` at `y + cr + 13` and `y − cr − 17`) and the A2 test's boxes. They are a little smaller than the obstacles `places.ts` uses (+4 px wide, 16 / 18 px tall), so the test checks what is drawn, not the code's own padding.
  - It asserts that more than 300 labels were checked. It passes, so that floor holds.
- **Mutation check:** I removed the caption and star obstacle `rects.push` lines from `places.ts`, and the new test failed ("01-first-light shrine label over star @15"). Then I restored the file. The test does catch an overlap.
- **Gate:** `npm run gate` (`tsc --noEmit` + vitest) is green: 761 tests in 40 files, up from 737 in 39 (the new test plus the A3 tests after the main merge). `places.test.ts` passes 9 tests.
- **Scope left over:** round 1 asked to cover every lamp's caption and star. The new test checks only the label's own lamp, which is exactly A2's criterion ("the lamp's … Lv caption box or the target star") and what the A2 test did. Under the round-2 rule I don't make the wider check a must-fix; it is Could improve 11.

*The round-1 text below still stands, except that Must fix 1 is now done.*

Gate on the branch: `npm run typecheck` is clean, and `npm test` passes 737 tests in 39 files. `src/grid/`, `src/night/`, `src/play/`, `src/audio/`, `puzzles/`, `index.html` and `package.json` are untouched.

**Part 0 (`src/core/words.ts`, `words.test.ts`)**
- Every base name in the table maps to its kind ("maps … to …" loop). A further test checks that the table holds exactly the listed names.
- `_N`/`_NN` stripping is tested (`home_2`, `lamp_07`, `street_3`). So is the unknown name → `"home"` case, including `toString`/`constructor` prototype keys.
- Every lamp in `puzzles/` and `puzzles/locked/` must have its own base in `PLACE_KINDS` ("no lamp id falls through").
- `placeName("home_1") === "home 1"` is tested.
- Met.

**A1 (`city.ts`, `streets.test.ts`)**
- *One lane per line, exactly on its segment, plus a square per node and a decor lane per decor segment:* "is one lane per line exactly on its segment…", checked over all maps, locked ones included.
- *Ends, midpoint and quarter points lie in a lane, with no building on them:* "leave every line's ends, midpoint and quarter points on open lane".
- *No building on a lane, node square or place:* "clear every lane, node square and place". It samples independently of `laneBoxDistance` and also uses it, so the check does not only repeat the code's own geometry.
- *Each feed's lane reaches the footprint edge and stops at the first shared street:* "run from every feed through the footprint edge…".
- *The footprint is inside the district:* "grows the bounds by FOOTPRINT_MARGIN, clipped to the map's district".
- *No shared street band inside the footprint, full coverage outside:* tested on `gridStreetRects`. The avenue cut is tested on `avenuePieces` (map 02).
- *Determinism and city-coordinate keying:* the shifted-circuit test is a real test of the keying.
- **Deviation, footprint clipped to the district:** the ticket says the footprint "always fits" because "the largest map is 24 × 11". That is wrong. `54-whole-ward` has bounds of 29 × 19, so its footprint grown by 2 is 33 wide, more than the 32-unit district. On 31, 53 and 59 the snapped origin pushes the grown footprint over a district edge. Clipping is the only way to meet the criterion "the footprint is inside the map's district". I checked that every node and line of every open map stays inside its clipped footprint, so only the margin narrows, on one side. This is acceptable. The wrong premise belongs to the ticket, not the builder.
- Met.

**A2 (`city.ts`, `places.ts`, `map-renderer.ts`, `places.test.ts`)**
- *One place per lamp of `placeKind`, at the kind's size, at 70 %, or as a pool:* tested over all open maps. Street lights are always pools. The fallback rate is under 3 %, and the "boxed in" case is a hand-built test.
- *Places clear lanes and node squares, never overlap, and front their lamp:* "clears every lane and node square, never overlaps, and fronts its lamp".
- *`placeAt` after a pan, and `null` on a lane or empty ground:* tested on `placeAtPoint` with `computeFit` and a pan, plus a pan-shift test on 08's shrine. `createMapRenderer` wires `placeAt` to the same `geo.fit` that drawing uses.
- *Labels on targets only, with the list's words:* tested.
- *A label's box never overlaps the lamp ring, the Lv caption or the star:* tested at five scales across every map. The test's caption box (y = cr+13, 7 px per glyph, 12 px font) and star position (y = −cr−17) match `map-renderer.ts` lines 1033 and 1045.
- *Glow:* `linkBuildings` and `CITY_LINK_R` are gone, and a test asserts it. The renderer now glows only `glowStart[i]..glowStart[i+1]` pieces of place i, using the unchanged `cityGlow` easing.
- *`glowTarget`/`easeGlow`:* their 023 tests are unedited and pass.
- *`hitTestGeometry`:* the source is unchanged, and so are its tests (`pan.test.ts` and the others).
- *Draw order:* labels are drawn in the city pass, before the circuit, as decided.
- *Highlight:* a 1.5 px `#8fd3ff` (`--focus`) outline goes round the place, or a circle for a pool, and a ring at cr+11 goes on the lamp.
- Met.

**B (`src/ui/`, `src/main.ts`)**
- The criterion asked for jsdom tests "as `win.test.ts` does". `win.test.ts` uses no jsdom and jsdom is not installed. Adding it would be a new dependency, which the ticket forbids. So the DOM half of B is type-checked only. I read it instead:
  - entries get `tabIndex = 0` and `data-lamp = row.id`;
  - `pointerenter`/`focus` → `onHighlight(id)`, and `pointerleave`/`blur` → `onHighlight(null)`;
  - `ui.highlight` toggles class `highlight` through `isHighlighted`;
  - a rebuild re-applies the highlight and restores focus.
  
  All of this is correct as written.
- The pure parts are tested in `logic.test.ts`: `targetRows` reads `placeName` with the text unchanged, plus `isHighlighted` and `placeHighlight`.
- `main.ts`:
  - `pointermove` on the canvas → `placeHighlight(hitTest !== null, placeAt)` → `setHighlight` → `ui.highlight`, and the next frame's overlay carries `highlight: s.highlight()`;
  - `pointerleave` clears the highlight;
  - list hover goes through the same `setHighlight`;
  - the listeners are removed on teardown;
  - there are no game rules in it.
- The test count grew.
- Met, with the one caveat on pools below.

**Builder deviations: the changes to 023 tests in `city.test.ts`**
1. The `linkBuildings` test was removed: covered by the ticket (the rule is removed).
2. The 07/08 + 01/02 strip test now filters to "outside both footprints". It grows each footprint by one block so the feed lane and edge buildings are excluded. Covered by the ticket ("07/08 checked outside both footprints"). The extra block is a small widening, needed because feed lanes run up to one block past the edge.
3. The "places" test lost its `NODE_CLEAR` distance check. That check belonged to 023's placement rule, which A2 replaces, and the stronger lane/node-square clearance now lives in `places.test.ts`. The ticket does not name this one, but it is a rule the ticket replaces.
4. In the "fewest lines" test the lamp id changed from `lamp` to `home`. `lamp` is now a street light, which is a pool with no building, so the test needed a building kind. This follows directly from part 0's table.
5. The `filtering and linking` describe block was renamed to `filtering`. Cosmetic.

### Part A3 (commit 2df5dc0)
Gate on the branch at 2df5dc0: `npm run typecheck` is clean, and `npm test` passes **760 tests in 40 files**, up from 737. The A3 commit touches only `src/render/`: `city.ts`, `places.ts`, `map-renderer.ts`, three rewritten tests and the new `town.test.ts`. `city.ts` and `places.ts` stay pure: they import only from `../core`, a type from `../grid`, and render-local modules. `MapOverlay`, `MapPlaces`, `MapPanView` and `MapRenderer` are unchanged.

**No overlap with the circuit (the core test).** `town.test.ts` "keeps every building and place WIRE_CLEAR_PX from every wire sample…":
- It covers every open map: `OPEN` is all 64 `scope: "map"` files in `puzzles/`. `puzzles/locked/` does not exist on this branch.
- It runs at 30, 50 and 80 px per unit.
- It samples wires every 2 px (`n = ceil(len_px / 2)`). It checks every building from `cityForMap` (footprint plus 1 unit) and every part of every non-pool place, using its own `pointBoxDistance` against the sample points. It does not reuse the code's `laneBoxDistance` filter, so this is a real check, not the implementation repeating itself.
- The wires sampled are `layout.streets`: lines, decor segments and feed lanes. They are built straight from `puzzle.lines` node positions, so they are the drawn wires.
- Node clearance uses `nodeClearPx` from every node centre, lamps included.
- Decor has its own constructed test.
- Labels have their own test at the same three scales, against wire samples and node discs.
- I re-ran the same check at 20, 24, 30, 37, 44, 50, 64, 80, 97, 120 and 150 px per unit, with a 4-unit window so outside lots near a clipped footprint edge are included. It found 0 violations.
- **Met.**

**Streets connect.** "joins every circuit line, feed lane, the ring and the shared grid into one network" builds the graph the criterion names and checks connectivity with union-find. "meets at least one shared-grid street on each side of the ring" and "has every feed lane reach the ring…" pass. The drawing matches: the ring is drawn with `g.rect`, grid streets with `gridStreetLines(…, hole)`, and lanes and feed lanes as 3 px lines. Node squares are no longer drawn. **Met.**

**Calm blocks.**
- `blockLots` over 40 × 40 blocks: only the four sizes, every edge on a setback or gap line, at most 4 per block, no overlap.
- Yard share and mean are tested within the ticket's bands.
- Footprint buildings are lots of their own block.
- **Met.**

**Deterministic.**
- Equal output for the same map and scale (6 maps).
- Outside the footprint, the result equals `cityCells`, tested on 20 maps. The only allowed difference is lots within `WIRE_CLEAR_PX` of a feed lane. Lots crossing the ring are excluded by the test's ±0.1 filter. See deviation 2.
- The 023 hub-and-spoke tests in `city.test.ts` still pass with only the `scale` argument added.
- **Met.**

**Places.**
- One place per lamp, of its kind, at its slot size, or a pool. Non-streetlight pools are under 8 %. I measured 10, 5 and 0 of 343 at 30, 50 and 80.
- The constructed "within 2 blocks or pool" case passes.
- Gate posts sit on opposite sides of the lamp's own wire at `WIRE_CLEAR_PX` (up to 0.1·scale of slack).
- A street light is a pool with `placeShapes = []`.
- **Met.**

**Silhouettes.**
- Ten distinct signatures.
- `homes` is three `home` shapes.
- Well is a hollow ring, mill has four sails, shrine is a cross.
- **Met.**

**Contrast.** All four checks are in `town.test.ts` "contrast", and `GLOW_MAX ≤ 0.3`. **Met.**

**Glow is round.**
- `glowFalloff` is monotone and 0 at the edge.
- `glowSpriteData` is symmetric and monotone along a row.
- `glowRadiusPx` is `max(1.8·h, 28)`.
- `HALO_LAYERS`, `HALO_ALPHA` and `FINE_CELL` are asserted absent.
- In `map-renderer.ts`, the sprite is made once (`glowSpriteTried`). Each frame draws one `drawImage` per lit place at `gl * GLOW_MAX`, plus the ≤0.22 tint. No gradient is made per frame.
- `glowTarget`/`easeGlow` tests are unchanged.
- **Met.**

**Labels never clip.**
- Tested at 1920 × 1080 and 400 × 700, with insets and pans to the four clamp extremes. The test's `clampTo` mirrors `PAN_KEEP = 96`.
- The constructed hide/show case passes.
- At most 1 hidden label per map at 1920 × 1080. I measured 3 hidden of 159, on 3 maps.
- `placeLabels()` runs inside `rebuildCity()`, which `setPan` → `rebuildGeometry` calls, so labels are placed again on pan.
- **Met.**

**Existing tests, `hitTestGeometry` and `placeAt`.**
- `hitTestGeometry` is untouched.
- `placeAt` keeps its interface. `placeAtPoint` now also checks `parts` (gate, homes).
- The test count grew.
- The rewritten tests are listed below. One of them lost coverage that is still required (Must fix 1).

**The rewritten tests, each one, as the ticket asks:**
- **`streets.test.ts`**
  - "Lane points on open lane": a `WIRE_CLEAR_PX` check was added. Stronger.
  - "Clear every lane, node square and place": the 0.25-unit band check became `WIRE_CLEAR_PX` and `nodeClearPx` in px. Stronger, and the lane band width rule is replaced. The building-count floor fell from 50 to 20, which is fair at about 2 buildings per block against 8–10.
  - The `FINE_CELL` assertion was dropped. Replaced.
  - Feed lanes: "stops at the first street, on a grid line" became "ends on the ring", which A3's rule replaces ("every feed lane runs from its feed to the ring"). `l.w === LANE_W` was dropped (lane band width, replaced).
  - Shared grid: the band-coverage sample became a sample along each grid line. The floor fell from 100 to 5 points per map. The assertion per point is as strict, but the floor is now nearly meaningless (Could improve 9).
- **`city.test.ts`**
  - The "fewest lines" placement test was removed. The A3 lot-slot rule replaces it.
  - "Filtering" uses `nodeClearPx` at 50 px per unit instead of `NODE_CLEAR`. Replaced.
  - The `HALO_ALPHA` check was removed (square halos, replaced).
  - The rest only gain the `scale` argument.
- **`places.test.ts`**
  - These were removed: kind/size/shrink/pool, fallback < 3 %, "fronts its lamp", "fewest lines", "boxed in", shapes, and "pool is a post". Their A3 counterparts are in `town.test.ts`.
  - "Fronts its lamp" is not in the ticket's list of replaced rules. In practice the decided A3 rule replaces it: the nearest free lot on a fixed lattice, cleared by `nodeClearPx`.
  - Fallback < 3 % became < 8 %, a loosening (Could improve 8).
  - `placeAtPoint`: the "just outside the place → not this lamp" assertion was dropped (Could improve 8).
  - **Labels: "never cover the lamp, its Lv caption or the target star, at any scale" became "never cover the lamp centre or any place".** The Lv caption and star checks are gone, and no other test covers them. A lamp's `nodeClearPx` is `cr + 10`, but the caption sits at `cr + 13 ± 8` and the star at `−cr − 17 ± 9`, both outside that disc. A3 does not replace this rule: it keeps the caption and star as label obstacles, and A2's criterion still requires it. The code does honour it: in my probe, 0 of 397 labels across 3 canvas sizes overlap any caption or star. Only the test was lost (Must fix 1).

**The builder's deviations from the ticket text.** I was not given the builder's list. These are the deviations I found in the code, each with a verdict:
1. **`placeLabel` signature.** It is `(place, lamp, area, obstacles, textW, textH, fit)`, not the ticket's `(place, area, obstacles, textW, textH, scale, fit)`. It is internal to `src/render/`. Acceptable.
2. **"Outside the footprint the buildings equal `cityCells`"** is not exactly true. Lots that cross the ring (±`RING_GAP`) are dropped, and so are lots within `WIRE_CLEAR_PX` of a feed lane's end. Both follow from the ring being a street and from the wire clearance. Acceptable, and the test bounds the exception.
3. **"Within 2 blocks"** is ±2 cells round the lamp's cell. A place's edge can be about 2.5 blocks away; the measured maximum is 2.15–2.5 blocks. Small. Acceptable.
4. **Gate posts** are offset `wc + post·√½` from the wire centreline. On a diagonal wire their edge distance is about `WIRE_CLEAR_PX`; on an axis-aligned wire it is up to about 1.8 px more. The posts slide along the wire until they clear the lamp. Acceptable.
5. **Shapes.** Bell and tower take a quarter lot, which the ticket doesn't size. The plain shrine also gets the centre disc that the ticket reserves for bell and tower. Hall gets an extra porch rect. Cosmetic, and there are still ten distinct signatures. Acceptable.
6. **Place edge colour.** `CITY_PLACE_EDGE #2a3650` is almost `CITY_PLACE_FILL #27344c`, so the "1 px edge" is in effect invisible. Cosmetic.
7. **Seeding with a scale-1 layout.** The renderer seeds `places` with `footprintLayout(…, 1)` only to size its arrays. At scale 1 every place is a pool. `rebuildCity` replaces the result before the first draw, and `labelText` doesn't depend on scale. Harmless, but a wasted layout (Could improve 10).
8. **`LABEL_WIRE_CLEAR_PX = 10`** duplicates `WIRE_CLEAR_PX` instead of importing it. Harmless.

**The 2 ms budget claim.**
- **On pan:** `rebuildCity()` runs on every pan, as in A1/A2. `footprintLayout` is a cache hit (keyed on puzzle, scale and origin). A pan costs `cityForMap` for the visible rect, `targetLabels`, and a layer repaint. I timed the pure part on 56 at 1920 × 1080 (scale ≈ 62) at **0.44 ms on average per pan**.
- **On a scale change** (resize or insets only, never per frame): a cold layout is 0.5 ms on 56, and **4.1 ms** on the worst map (03).
- **Per frame:** one layer `drawImage`, one sprite `drawImage` plus a few tint fills per lit place, and the labels. That is consistent with the budget.
- **Not timed:** the layer repaint during a drag needs a browser. It is the same order of work as A1/A2's, with fewer buildings and the stroked paths batched into one `stroke()`.
- **Verdict:** plausible. Josh's check on 56 (pan and Relight smooth) is the real test.

**Places that sit away from their lamp.** Measured from the place's nearest edge to the lamp centre, over all 64 maps:

| px per unit | median | p90 | max |
|---|---|---|---|
| 30 | 39 px | 70 px | 151 px |
| 50 | 65 px | 116 px | 222 px |
| 80 | 49 px | 107 px | 344 px |

The builder's "60–320 px" is centre to centre, and agrees.
- **It matches the letter of A3.** A3 decides on the nearest free lot within 2 blocks, with every place clearing the lamp by `nodeClearPx` and every wire by 10 px. With fixed lots, a gap of one lamp-clearance plus a street is unavoidable.
- **The tail conflicts with the intent behind Josh's words** ("they don't match what's being lit"). About 4–5 % of placed buildings are clearly nearer another lamp than their own: 17/299 at 30, 16/304 at 50, 11/309 at 80. Several are the target that matters most:
  - `21-make-room`: the market is 305 px from its lamp and 68 px from the shrine lamp.
  - `32-main-fuse`: the shrine is 184–222 px away, with `hall`/`lane` 24–43 px away.
  - `17-why-it-blew`: the market is 222 px from its lamp, against 115 px from the shrine.
  - The shrine on `14`, `15` and `19`.
- **What softens it:** the hover link and the label tie a place to its lamp, and no criterion bounds the distance or requires "nearer its own lamp".
- **Verdict:** a design risk for Josh to see on `21`, `32` and `17`, not a must-fix. See Could improve 6.

**A3 verdict:** every A3 criterion is met in code, and tested. One regression is untested: the Lv caption and star label check was dropped from `places.test.ts`.

## Rule conflicts and risks
- No hard-rule break was found. `src/grid/` and `src/night/` are untouched. `places.ts` and the new `city.ts` code are pure: no DOM, and only `../core`, `../grid` types and render-local imports. `main.ts` is the declared cross-folder edit. No dependency or schema change, and no GDD rule touched: lit is read only from `state.lit`, and the brownout and Relight timing are unchanged.
- **Street-light targets can't be picked out from the map.** A pool's `placeAt` box is the lamp's own 0.7 square. `placeHighlight` gives circuit elements precedence, and the lamp's hit area covers that square, so hovering a lantern, lane or `lamp_NN` target never highlights its list entry. The list → map direction works. The ticket's main.ts criterion reads "with `placeAt` returning a lamp, calls `ui.highlight(id)`". I read the circuit-first precedence as a fair reading of "clicks still land only on circuit elements", so I did not make it a must-fix. Josh will notice it on any map whose targets are lanterns.
- **Browser-only risks the tests can't catch:**
  - Label widths are estimated at 6.2 px per glyph, not measured. This only affects horizontal centring of N/S labels, not their clearance from the lamp.
  - Labels are only checked against their own lamp. A label can sit under another lamp's caption or a neighbouring place, since the circuit draws over it. That is legal, but text over text may read badly on dense maps (56, 54).
  - `.target { pointer-events: auto }` makes the list entries swallow canvas clicks and right-drag pans that start over them.
  - If the targets list rebuilds while the pointer rests on an entry (a lamp lights), the old `li` is gone without a `pointerleave`. The highlight is kept and re-applied, which is correct. But if the pointer then leaves the list onto other HUD rather than the canvas, the highlight can stick until the next canvas move.
- **The gate shape is approximated.** The ticket says "two posts either side of the lamp's lane". The code places a 1.2 × 0.3 bar beside the lamp like any other place, so both posts sit on one side, and the comment "the lamp's lane runs between them" is not true in general.
- **"Fronts its lamp" is only checked along the facing axis.** The sideways slide of up to ±0.9 isn't bounded against the lamp's square. In my probe, 1 of 309 placed buildings sits entirely to one side of the lamp, diagonal to it rather than facing it.
- **One feed lane meets no street.** In my probe, 1 of 69 feed lanes (`63-keep-the-wire`) ends where `gridStreetRects` draws no band, so it dead-ends at the footprint edge. The others meet a drawn street. The ticket also says the avenue "meets the feed's lane". The code cuts the avenue at the footprint but sends the feed lane to the nearest grid line, which need not be the avenue. Josh should look at a spoke map.

- **A3: a place can read as another lamp's.** About 4–5 % of placed buildings sit nearer a different lamp, often a shrine or market target, and some are up to about 300 px from their own. The ticket allows it, but it pulls against Josh's original complaint. He should look at `21-make-room`, `32-main-fuse` and `17-why-it-blew`.
- **A3: on narrow canvases, many labels hide.** At 400 × 700, 62 of 159 target labels are hidden, on 38 maps. That is within the criteria, which bound hiding only at 1920 × 1080, and the list and the hover link still name every target. But a narrow window loses a lot of labels.
- **A3: label widths in tests are estimated** at 6.2 px per glyph, while the renderer uses `measureText`. The browser can place a label differently from the tests, but both go through the same `placeLabel` checks, so the guarantees hold.
- **A3: per-pan cost.** The pure work is cheap, about 0.4 ms. The layer repaint on each pan event is untimed outside a browser.

## Must fix
none (round-1 item 1, the Lv caption and target star label test, was restored in d1c2a55 and verified by mutation)

## Could improve
1. `src/render/places.ts` / `src/ui/logic.ts`: give pool places a hover area of their own, e.g. a ring out to `POOL_RADIUS` beyond the lamp's hit radius. Or let `placeHighlight` accept a lamp hit when that lamp is a target. Either way, hovering a street-light target on the map would highlight its list entry.
2. `src/render/places.test.ts`: in the "fronts its lamp" test, also require the place to overlap the lamp's square along the street, i.e. a lateral offset ≤ (place extent + `NODE_SQUARE`)/2. Or bound `PLACE_SLIDES` so the place can't end up diagonal.
3. `src/render/city.ts` `feedLanes`: when the first grid line falls exactly on the footprint edge, run on to the next one (or extend to the avenue when one crosses the district). Then add a test that every feed lane ends on a drawn band from `gridStreetRects` or `avenuePieces`.
4. `src/render/places.ts` gate shape: straddle the lamp's incoming lane (one post each side), as the ticket describes, or fix the comment.
5. `src/ui/index.ts`: if the targets list rebuilds under a hovering pointer, re-emit `onHighlight` from the entry still under the pointer, or clear it on `pointerleave` of the whole `ul`, so the highlight can't stick.
6. **A3, `src/render/city.ts` `footprintLayout`: prefer a slot nearer the place's own lamp than any other.** Rank candidates by edge distance to the lamp, and skip a slot that is nearer another lamp unless nothing else fits. Then add a test that each non-pool place is no nearer another lamp than its own (or allow at most N exceptions per map). This answers the "doesn't match what's lit" risk above.
7. **A3, `src/render/town.test.ts`: build the clearance test's wires from the puzzle, and widen its window.**
   - Build the wires from `puzzle.lines`, `puzzle.decor` and the feed lanes directly, not from `layout.streets`. Then a change that drops a wire from `streets` would fail the test.
   - Widen the building window from 1 to 2 units, so that a battery near a clipped footprint edge is covered at 30 px per unit.
   - The code passes both today.
8. **A3, `town.test.ts` and `places.test.ts`:** tighten the non-streetlight pool share back towards A2's level, for example below 4 % at each scale (today it is 2.9 %, 1.5 % and 0 %). Restore the "just outside a place → not that lamp" assertion in the `placeAtPoint` test.
9. **A3, `src/render/streets.test.ts`, "shared grid minus the footprint":** raise the `covered` floor from 5 to a number that proves the sampling ran over many lines, such as > 100 as before.
10. **A3, `src/render/map-renderer.ts`:** size the per-place arrays from the lamp count, not from `footprintLayout(puzzle, cityOrigin, 1)`, to avoid a wasted layout. Separately, give `CITY_PLACE_EDGE` enough contrast against `CITY_PLACE_FILL` for the 1 px edge to show, or drop the edge.
11. **Round 2, `src/render/places.test.ts`:** extend the new caption and star test to every lamp's caption and star, not only the label's own lamp. `targetLabels` already treats all of them as obstacles, so this would also cover the text-over-text risk on dense maps.
