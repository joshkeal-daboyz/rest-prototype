ticket: 024-city-alignment-and-places
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Inside each map's footprint the streets are the circuit: a lane under every line, a square at every node, buildings only in the gaps, feed lanes out to the shared grid, which carries on unchanged outside. Each lamp gets one place shaped by `placeKind(id)`, only its own place glows, targets get a quiet `placeName` label, and the "Priests want lit" list and the map's places highlight each other through `MapOverlay.highlight` and `placeAt`.

## Does the branch do it?
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

## Must fix
none

## Could improve
1. `src/render/places.ts` / `src/ui/logic.ts`: give pool places a hover area of their own, e.g. a ring out to `POOL_RADIUS` beyond the lamp's hit radius. Or let `placeHighlight` accept a lamp hit when that lamp is a target. Either way, hovering a street-light target on the map would highlight its list entry.
2. `src/render/places.test.ts`: in the "fronts its lamp" test, also require the place to overlap the lamp's square along the street, i.e. a lateral offset ≤ (place extent + `NODE_SQUARE`)/2. Or bound `PLACE_SLIDES` so the place can't end up diagonal.
3. `src/render/city.ts` `feedLanes`: when the first grid line falls exactly on the footprint edge, run on to the next one (or extend to the avenue when one crosses the district). Then add a test that every feed lane ends on a drawn band from `gridStreetRects` or `avenuePieces`.
4. `src/render/places.ts` gate shape: straddle the lamp's incoming lane (one post each side), as the ticket describes, or fix the comment.
5. `src/ui/index.ts`: if the targets list rebuilds under a hovering pointer, re-emit `onHighlight` from the entry still under the pointer, or clear it on `pointerleave` of the whole `ul`, so the highlight can't stick.
