# 024 · Streets under the wires; places that look like what is lit

owner: lead-architect (0), renderer (A1, A2, A3), ui (B)
status: done
branch: one per part: `ticket/024-city-alignment-and-places-a1`, `-a2`, `-b`, `-a3` (part 0 is committed with the ticket on G1)

## Josh's words
"I have looked at MANY maps, I think it's cool, but the powerlines need to align with the streets. Furthermore, the locations listed feel arbitrary. They don't match what's being lit."

(Feedback on the combined preview of 022 B + 023, branch `preview/022-023` at `D:\rp-prev`.)

## Where it is today (read from `D:\rp-prev`)
**Why the wires don't follow the streets.** It is not a bug in the offset. With a regular grid, the two cannot line up.
- **The street grid:** 023's streets run on the city cell edges, at every multiple of `CITY_BLOCK = 2` city units (`cellBuildings` in `src/render/city.ts`). `mapOrigin` snaps each map to whole cells, so a map point is on a street centreline only when its coordinate is even.
- **Node positions:** across every file in `puzzles/`, **709 of 1102 nodes** have an odd or fractional coordinate. In `01-first-light`, for example, the nodes sit at x = 3 and 10 and y = −2 and 1.5. Those nodes land mid-block.
- **Diagonal lines:** **419 of 1127 lines are diagonal** (both x and y differ), for example `01`'s `j(3,0) → lamp(6,−2)`. No orthogonal grid can carry them.
- **Why no tuning fixes it:** shifting the grid's phase, or snapping the origin by half a cell, can fix at most one parity per map. The node spacing (1.5, 3, 4, …) is not a multiple of the block.
- **Avenues:** 023 also centres each district on its avenue, so a 1.2-unit avenue cuts through every spoke map's wiring at an angle unrelated to it.

**Why the places feel arbitrary:**
- **One look for every lamp:** every lamp, target or not, gets the same plain `PLACE_W × PLACE_H` (1.1 × 0.9) rect, pushed to the side with the fewest lines (`cityPlaces`). A shrine and a lantern look identical.
- **Random buildings glow:** `linkBuildings` makes **any** random city building within `CITY_LINK_R = 1.6` of a lamp glow at half strength. When a lamp lights, unrelated buildings come on with it.
- **The list and the city aren't connected:** the "Priests want lit" list (`targetRows` in `src/ui/logic.ts`) shows each target lamp's **id**, with `_` turned into spaces (`shrine`, `well`, `home 1`). Nothing on the map says which building is the shrine, and nothing links the list to the place.

**What the names already give us (no schema change needed).** Lamp ids are already the place names. Across all puzzles they are:
- **sacred:** shrine 59, chapel 9, bell 8, tower 3
- **water:** well 39
- **mill:** mill 39
- **gate:** gate 28
- **work:** forge 20, kiln 14, ovens 7, bakery 8, tannery 4, smithy 4
- **market:** market 13, stall 2, yard 7
- **hall:** inn 5, hall 4, infirmary 1, lamphouse 1
- **homes:** home 10, homes 6, home_1 / home_2 5 each, cottage 4, houses 3, house 1
- **street lights:** lantern 12, lane 11, flood 2, porch 2, lift 2, steps 1, stair 1, street_1..3, lamp_01..12

The only `name` field in the schema is the feeds' (`North`, `South`, …). So the place kind can come from the lamp id, with no puzzle edits.

## Goal
Each map's wires run along streets. Every line of the circuit lies on a lane, every node sits where lanes meet or end, and the buildings fill the blocks between the wiring. Beyond the map's edge the shared hub-and-spoke city carries on as before. Each lamp lights a place that looks like what it is named: the shrine is a shrine-shaped footprint, the well a small round one, the mill a mill, homes small houses, and lanterns a pool of light on the lane rather than a building. Each target the priests want lit has a small, quiet name beside its place, the same words as in the "Priests want lit" list. Hovering a list entry picks out its place on the map, and hovering a place picks out its list entry. Only the lit lamp's own place glows: no random neighbours.

## Decided in this cut
### Alignment (A1): the streets come from the circuit inside the map; the shared city stays outside
- **Footprint:** a map's footprint is its bounds grown by `FOOTPRINT_MARGIN = 2` units, in map units. It always fits inside the map's 32-unit district: the largest map is 24 × 11, giving at most 28 × 15.
- **Inside the footprint, the streets are the circuit:**
  - Every line becomes a **lane** `LANE_W = 0.5` units wide along its exact segment, diagonals included. Old towns have diagonal lanes.
  - Every node gets a small square (`0.7` units) where its lanes meet.
  - Decor paths become narrower lanes (`0.3`).
  - The shared grid's streets and avenues are **not drawn** inside the footprint.
- **Buildings inside the footprint** come from the same seeded hash, on a finer grid (`0.5`-unit cells, still keyed on **city** coordinates, so they are stable). They are kept only where they clear every lane, node square and place by `0.1`. So the wiring always runs along open street, never through a building.
- **Joining up with the city:**
  - Each **feed** gets a lane from the feed, straight out to the footprint edge, in the direction away from the map's centre.
  - That lane is then extended to the nearest shared-grid street or avenue line, so power visibly comes in from the city.
  - The avenue stops at the footprint edge and meets the feed's lane (see Open question 1).
- **Outside the footprint, nothing changes from 023:** the same fixed seed, the same hub and spokes, map 01 on the town square, the same districts and origins.
  - **Cost:** the city now depends on which map is open, but only inside that map's own footprint.
  - **Neighbouring maps:** a neighbouring map's district, seen by panning, shows the generic grid, not that map's lanes, because the renderer only has the open puzzle. Showing the neighbours' lanes would need main.ts to hand the renderer the neighbours' puzzles: a small later ticket (Open question 5).
  - 023's "07/08 share streets" test becomes "outside both footprints, the strip is identical".
- **No schema, puzzle or `src/core/` change** for alignment.

### Places (0, A2, B): look and name from the lamp id
- **Part 0 (lead-architect, `src/core/words.ts`, on G1, before A2 and B start).** It adds `PlaceKind`, `placeKind(lampId)` and `placeName(lampId)`.
  - The renderer (the city) and the ui (the list) both read lamp names, so the mapping lives in one place. This is the same reason 017 put the Lv words in `core/words.ts`.
  - `placeName` is today's list text: `_` becomes a space (`home 1`). The list's words don't change.
  - `placeKind` strips a trailing `_N` or `_NN` and looks the base name up in the table above, case-insensitive. An unknown name falls back to `"home"`.
- **Footprints by kind (A2).** These are top-down shapes in the same dark palette. All are drawn as rects, circles and lines; no assets.
  - **sacred:** a 1.4-unit square with a smaller inner square (a court). Bell and tower: a small square with a dot.
  - **water:** a 0.6-unit circle with a darker centre.
  - **mill:** a 1.0-unit square with a thin cross of sails over it.
  - **gate:** two 0.3-unit posts either side of the lamp's lane.
  - **work:** a long rect (1.6 × 0.8) with a small square chimney at one end.
  - **market:** a 1.6-unit open square with three or four stall dots.
  - **hall:** a large rect (1.8 × 1.1).
  - **homes:** one small house (0.8 × 0.7); plurals (`homes`, `houses`) are a row of three.
  - **street light:** no building. The glow is a pool of light on the lamp's own lane.
- **Placement (A2):** the place sits beside its lamp and **fronts its lane**: one edge `0.1` units from the lamp's square, on the side with the fewest lanes. It must clear every lane and node square. If no side fits, the place shrinks to 70 %, then falls back to the street-light pool. Places never overlap each other.
- **Glow (A2):** only the lamp's own place glows. `linkBuildings` and the half-strength glow are **removed**. The rest is unchanged from 023: lit means in `state.lit`, a brownout means dark, the Relight lights each place at its lamp's `nodeArrive`, the easing takes 0.25 s, and the contrast budget holds.
- **Labels (A2).** These supersede Josh's earlier "no labels", given his feedback; see Open question 2.
  - **Target** lamps only get a label: `placeName`, 11 px, `ink-dim` at 70 % alpha.
  - It sits on the place's far side from the lamp, so it never covers the lamp, its Lv caption or the target star.
  - It brightens to `ink` while its lamp is lit.
  - Labels are drawn after the city and before the circuit, so a wire always draws over a label.
  - Non-target lamps get their kind's footprint and no label.
- **Linking the list and the map (A2 draws it, B drives it):**
  - `MapOverlay` gains `highlight?: string | null` (a lamp id). The renderer then draws a 1.5 px `--focus`-coloured outline round that lamp's place, and a ring on the lamp.
  - The renderer also exposes `placeAt(x, y)`: the lamp id whose place is under a canvas point, through the same fit and pan as drawing. It is a separate `MapPlaces` interface, as 022's `MapPanView` was, so `MapRenderer` and the play fakes are unchanged. `hitTest` is **not** changed: clicks still land only on circuit elements.
  - **B (ui):** hovering or focusing a "Priests want lit" entry sets the highlight to that target, and leaving clears it. The entries become focusable (`tabindex="0"`). Hovering a place on the map highlights its list entry (same `--focus` outline) and its place.
  - main.ts passes the ui's current highlight into `draw`'s overlay.
  - Hovering a non-target lamp's place highlights the place only.

### Look (A3): a calm town the wires run through. Added after Josh played the build, not yet approved
Josh's words, on the built 0+A1+A2+B (`ticket/024-city-alignment`, `D:\rp-024`), with a full-size screenshot of map 02: "This looks so goofy." Then: "The wires should only run along streets or between buildings."

**What the build does, and why it reads badly (from the code at `D:\rp-024`):**
- **Static instead of a town.** Inside the footprint, `footprintBuildings` drops a building into 62 % of all 0.5-unit fine cells. Each gets a random size of 0.30–0.42 units and a random offset of up to ±40 % of the free space in its cell. There are no blocks and no visible street grid, so at map 02's scale (about 60–80 px per unit) it is dozens of 20–30 px squares at random.
- **Smears under the wires.** Lanes are `LANE_W = 0.5` **map units** wide, filled with `CITY_STREET_COLOUR #07090e`, which is darker than the background. At 60–80 px per unit that is a 30–40 px black band. Nothing joins the bands to the grid streets, because the grid's streets are cut out of the footprint.
- **Blocky glow.** `glowRect` stacks three grown **squares** (`HALO_LAYERS`) round each lit place, next to the round lamp pools.
- **Clipped label.** `placeLabelBox` puts a target's label on the far side of its place without looking at the canvas edge, so on 02 `shrine` runs off the right edge (`sh`).
- **Shapes that don't read.** The shrine is a dark square inside a square. The street light is a dark disc with a dot. Both use `CITY_PLACE #151c28` on `#0b0f17`, which is about 1.1:1, so the silhouettes vanish.
- **Clearance in the wrong units.** All clearances are in map units (`NODE_SQUARE 0.7`, `BUILDING_GAP 0.1`), but the circuit's icons are drawn in px (feed 30 px, battery 40 × 50 px, the lamp's cluster plus its ring). When the scale changes, buildings can creep under drawn nodes.

**Decided for A3.** Only `src/render/` changes. The hub-and-spoke shared city stays exactly as laid out (districts, origins, avenues, map 01 on the hub). Only how it looks and how the footprint is filled change.
- **Streets are thin, faint, connected lines, everywhere.**
  - Every street (the shared grid's cell edges outside the footprint, the avenues, every circuit lane, every feed lane) is drawn as a line `STREET_PX = 3` CSS px wide. The avenues are `AVENUE_PX = 6` px.
  - The colour is `CITY_STREET_LINE`, **lighter** than the background, with contrast against `CITY_BG` between 1.15 and 1.35. Streets read as faint lanes, not dark bands. No street is filled as a map-unit band any more, so `LANE_W` is no longer used for drawing.
  - **The footprint edge is a street** (a ring road). Every shared-grid street that reaches the footprint stops on the ring, and every feed lane runs from its feed to the ring. So every circuit lane joins the ring through the circuit's own lines, and the ring joins the city grid.
  - Node squares are not drawn. Lanes meet at the node, under its icon.
- **Buildings sit in blocks, from a small set of lots, everywhere.** This applies inside the footprint and in the shared city alike, so the two match at the ring.
  - **Blocks:** a block is a `CITY_BLOCK = 2`-unit cell. Its buildable area is inset `SETBACK = 0.3` units from each street edge, leaving a 1.4 × 1.4 lot area.
  - **Patterns:** each block takes one pattern from `hash(CITY_SEED, cellX, cellY)`, in city units:
    - **whole**: one 1.4 × 1.4 building, 25 %
    - **halves**: two 1.4 × 0.6 or 0.6 × 1.4, with a 0.2 gap, 30 %
    - **quarters**: four 0.6 × 0.6, with 0.2 gaps, 25 %
    - **yard**: empty, 20 %
  - **No other sizes, no random offsets.** Every building's edges sit on the block's setback lines or on the gaps between lots.
  - **Fewer:** at most 4 buildings per block, about 2 on average, against the build's 8–10 fine cells per block.
- **Wires run between buildings.** Inside the footprint, a lot is **dropped** (not shrunk or moved) if any part of it comes within:
  - `WIRE_CLEAR_PX = 10` px of any line's centreline, or of any decor path;
  - `nodeClearPx(node)` of any node's centre:
    - lamp: `clusterRadius(load) + 10`
    - feed: 25
    - breaker: 22
    - switch: 22
    - junction: 20
    - fusebox: 24
    - battery: 36
  - These are measured in CSS px at the current scale. The layout is cached per scale, and is recomputed with the cached layer whenever the scale changes (resize, insets), not on pan.
  - So a wire's path shows as a run of missing lots along a street-lane line: it runs between buildings and along its own street.
- **Places use the same lot system.**
  - A lamp's place takes the free lot slot (whole, half or quarter size, as its kind needs) nearest the lamp that clears every wire and node by the same px rules. It never overlaps another place.
  - If no slot within 2 blocks fits, the lamp uses the street-light pool.
  - **Every place clears every wire, node and lamp by `WIRE_CLEAR_PX` / `nodeClearPx`.** That is the same rule as buildings, so no place ever covers a wire.
- **Silhouettes that read.** Each kind is one simple top-down plan, filled `CITY_PLACE_FILL` with a 1 px `CITY_PLACE_EDGE`, and drawn **in the cached layer**:
  - **sacred:** a cross plan (two overlapping bars, 1.0 × 0.4 and 0.4 × 1.0, in a 1.4 lot). Bell and tower are the cross with a small centre disc.
  - **water:** a ring: a circle 0.5 units across, 2 px stroke, hollow.
  - **mill:** a 0.5 disc with four sail lines (an X) to the lot corners.
  - **gate:** two 0.25 squares on either side of the lamp's wire, at `WIRE_CLEAR_PX` from it, joined by nothing. Gate is the one kind allowed to sit beside the wire rather than in a lot.
  - **work:** an L plan (a 1.4 × 0.6 bar plus a 0.6 × 0.6 wing), with a 0.15 chimney square.
  - **market:** a dashed 1.4 square outline with four 0.25 stall squares inside.
  - **hall:** a 1.4 × 1.0 rect with a ridge line along its long axis.
  - **home:** a 0.6 × 0.6 rect with a ridge line. **homes:** three of them, in a row of quarter lots.
  - **street light:** **no shape at all.** It is only a soft round pool on the lamp's street when lit, and nothing when dark.
  - **Contrast:** `CITY_PLACE_FILL` has contrast at least 1.25 against `CITY_STREET_LINE` and against `CITY_BUILDING`, and at most 1.6 against `CITY_BG`. A place stands out from the town around it, and the circuit still dominates.
- **Soft, round glow.**
  - One warm radial-falloff sprite is pre-rendered once per renderer to an offscreen canvas: 128 px across, alpha `(1 - r)^2`, colour `CITY_WARM`.
  - It is drawn each frame with `drawImage` at each lit place's centre, radius `max(placeHalfDiagonalPx * 1.8, 28)`, `globalAlpha = glow * GLOW_MAX`, with `GLOW_MAX = 0.3`.
  - The lit silhouette also gets a warm tint, fill alpha at most 0.3.
  - Street-light pools use the same sprite at `POOL_PX = 36` px radius.
  - `HALO_LAYERS`, `glowRect` and the stacked discs are **removed**. No gradient object is made per frame.
  - Glow timing is unchanged from A2: `state.lit`, dark in a brownout, the Relight's `nodeArrive`, a 0.25 s ease.
- **Labels never clip.** `placeLabel(place, candidates, area, obstacles)` tries the four sides of the place in order: far side from the lamp, then the two sides across, then the near side.
  - It takes the first box that is fully inside the **free area** (the canvas minus 022's insets, minus 4 px) and clear of every obstacle: wires (`WIRE_CLEAR_PX`), nodes (`nodeClearPx`), Lv captions, the target star, and other labels.
  - If none fits, the far-side box is **shifted** inside the free area (clamped), and then re-checked. If it still overlaps an obstacle, the label is hidden; the list and the hover link still name it.
  - Labels are placed again whenever the geometry is rebuilt (resize, insets, pan), so panning never pushes one off-screen.
- **Low contrast and per-frame cost unchanged.**
  - Every city colour is within contrast 1.6 of `CITY_BG`. The circuit's colours are untouched.
  - The streets, buildings and unlit silhouettes are one cached layer, rebuilt on geometry rebuild, as A1/A2 already do.
  - Per frame: one `drawImage` for the layer, one sprite `drawImage` per lit place, and the labels.
  - Within the 2 ms per frame budget on `56-meet-in-the-middle` at 1920 × 1080.

## Acceptance criteria
- [ ] **0 (lead-architect), Vitest in `src/core/words.test.ts`:**
  - `placeKind` maps every base name listed above to its kind, and strips `_N` / `_NN` (`home_2` → `home`, `lamp_07` → `streetlight`, `street_3` → `streetlight`).
  - An unknown name gives `"home"`.
  - Every lamp id in every file in `puzzles/` and `puzzles/locked/` maps to a kind other than through the fallback. A new name added to a puzzle fails this test until it is added to the table.
  - `placeName("home_1")` is `"home 1"`, the list's current text.
  - `npm run gate` is green.
- [ ] **A1 (renderer), Vitest in `src/render/`:**
  - `circuitStreets(puzzle)` returns one lane per line, exactly on its segment, plus a node square per node and a decor lane per decor path.
  - For every open map:
    - For every line, its two ends, its midpoint and its quarter points lie inside a lane.
    - No building from `cityForMap` overlaps any lane, node square or place.
    - Every feed has a lane reaching the footprint edge.
    - The footprint is inside the map's district.
  - Inside the footprint, no shared-grid street or avenue band is returned. Outside it, `cityCells` output is identical to 023's: the hub-and-spoke tests pass, with 07/08 checked outside both footprints.
  - Footprint buildings are deterministic and keyed on city coordinates: the same map gives equal output on repeat calls.
  - Every existing `src/render/` test passes, except 023 tests whose rules this ticket replaces (`linkBuildings`, the 07/08 strip). Those are updated, and the review lists each one.
  - `npm run gate` is green, and the test count does not fall.
- [ ] **A2 (renderer), Vitest in `src/render/`:**
  - `cityPlaces` gives each lamp exactly one place of `placeKind(lamp.id)`, at that kind's size, or the shrunk size or street-light pool when it doesn't fit.
  - For every open map: places clear every lane and node square, never overlap, and each fronts its lamp (an edge within 0.1 + `LANE_W` of the lamp's square).
  - `placeAt` returns the lamp for a point inside its place, after a 022 pan too, and `null` on a lane or empty ground.
  - Only a target lamp's place has a label. Its box does not overlap the lamp's square, its Lv caption box or the target star.
  - `glowTarget` and `easeGlow` keep their 023 behaviour. No building other than a lamp's own place has a glow.
  - `hitTestGeometry` is unchanged, and its tests pass without edits.
- [ ] **B (ui), Vitest in `src/ui/` (jsdom, as `win.test.ts` does):**
  - Each target entry has `tabindex="0"` and `data-lamp` set to the lamp id.
  - `pointerenter` or `focus` on an entry calls `deps.onHighlight(id)`, and `pointerleave` or `blur` calls it with `null`.
  - `ui.highlight(id)` marks the matching entry with class `highlight`, and `null` clears it.
  - The list text is unchanged, and it reads `placeName`.
  - In `src/main.ts`:
    - A pointer move over the canvas, with `renderer.placeAt` returning a lamp, calls `ui.highlight(id)`, and the next frame's overlay carries `highlight: id`.
    - Leaving the place clears it.
    - Hovering a list entry sets `highlight` in the overlay.
    - No game rule in main.ts.
  - `npm run gate` is green, and the test count grows.
- [ ] **Josh in the browser** (`npm run dev`, after B), on `01`, `08-shrine-circuit`, `18-battery-run`, `56-meet-in-the-middle` and any five more:
  - **Wires on streets:** every wire, diagonals included, runs along an open lane. Every switch, junction, breaker and fusebox sits where lanes meet, and no building sits under any wire. Beyond the map's edge the city grid carries on, and each feed's lane runs out to meet it.
  - **Places match:**
    - On `08` the shrine is the court-shaped building beside the shrine lamp, labelled `shrine`.
    - A well is a small circle, a mill has sails, and homes are small houses.
    - Lanterns, lanes and street lamps light a pool on the street, not a building.
  - **Only what's lit glows:** light one target. Its place, and nothing else, warms up. In a brownout everything is dark. The Relight lights places one by one.
  - **List ↔ map:**
    - Hover `shrine` in "Priests want lit": its place and lamp are outlined.
    - Hover the shrine's place on the map: the list entry is outlined.
    - Tab to a list entry: the same highlight appears.
    - Clicks still throw and repair only circuit elements.
  - **Labels** are quiet and never cover a lamp, its caption, the star or a wire. Non-target lamps have no label.
  - **Unchanged:** pan, Home, centring (022), win splash, sound, and the 2 ms per frame budget on `56`.

- [ ] **A3 (renderer), Vitest in `src/render/` (pure; no canvas). Not approved yet:**
  - **No overlap with the circuit (the core test).** For every open map, at scales 30, 50 and 80 px per unit:
    - Sample every line every 2 px along its length. No building, place or label box comes within `WIRE_CLEAR_PX` of any sample.
    - No building, place or label box comes within `nodeClearPx(node)` of any node's centre (lamps included).
    - Decor paths are sampled the same way.
  - **Streets connect:** for every open map, the street graph is connected. Its nodes are the circuit lanes' ends, the feed lanes, the ring's corners and the grid streets meeting the ring; its edges are the lanes. Every circuit line lies on a street, and the ring meets at least one shared-grid street on each side.
  - **Calm blocks:**
    - Every building, inside and outside the footprint, has a size in `{1.4×1.4, 1.4×0.6, 0.6×1.4, 0.6×0.6}` (±1e-9).
    - Every building edge lies on its block's setback line or on a lot gap line.
    - No block holds more than 4 buildings.
    - Over a 40 × 40-block city sample, the share of yards is between 15 % and 25 %, and the mean is 1.8 to 2.4 buildings per block.
  - **Deterministic:** the same map and scale give equal output, and outside the footprint the buildings equal `cityCells` for the same rect. The hub-and-spoke tests from 023 still pass.
  - **Places:**
    - Each lamp has one place of its kind in a lot slot of that kind's size, or a pool if none fits within 2 blocks.
    - Gate posts sit `WIRE_CLEAR_PX` either side of the lamp's own wire.
    - A street light has no silhouette primitives, only a pool.
  - **Silhouettes:** `placeShapes` returns a different primitive signature (kinds and counts of rect, disc, ring and line) for each of the ten kinds. homes is three home shapes.
  - **Contrast:**
    - `CITY_STREET_LINE` has contrast 1.15–1.35 against `CITY_BG` and is lighter than it.
    - `CITY_PLACE_FILL` has contrast at least 1.25 against `CITY_STREET_LINE` and against `CITY_BUILDING`.
    - Every city colour is at most 1.6 against `CITY_BG`. `GLOW_MAX` is at most 0.3.
  - **Glow is round:**
    - `glowSprite` parameters give a radial alpha that falls monotonically from centre to edge, and is 0 at the edge.
    - `HALO_LAYERS` and `glowRect` no longer exist, so the test imports fail if they come back.
    - `glowTarget` and `easeGlow` behave as in 023/A2.
  - **Labels never clip:**
    - For every open map's target labels, at a 1920 × 1080 and a 400 × 700 canvas, with 022's insets and pans to each clamp extreme, every shown label box is fully inside the free area.
    - A hidden label occurs only when no candidate fits. That is tested with a constructed case and counted over every open map: at most 1 hidden label per map at 1920 × 1080.
  - Every existing `src/render/` test passes, except A1/A2 tests whose rules A3 replaces (lane band width, fine-cell buildings, square halos). The review lists each one. `hitTestGeometry` and `placeAt` are unchanged. `npm run gate` is green, and the test count does not fall.
- [ ] **A3, Josh in the browser** (`npm run dev`): `02` (the screenshot map), `01`, `08-shrine-circuit`, `18-battery-run`, `56-meet-in-the-middle`, and any five more:
  - **It reads as a town:** calm rows of blocks with faint thin streets, with no random speckle and no black bands. The streets inside the map join the city's streets at the map's edge.
  - **Wires run along streets or between buildings:** every wire, switch, junction, breaker, fusebox, battery and lamp has open ground round it. No building or place touches one, at full size and at ~400 px wide.
  - **Places read at a glance:** the shrine is a cross plan, the well a ring, the mill has sails, homes are small houses, and a street lamp is just a pool of light on the street.
  - **Glow is soft and round,** like the lamp's own glow, with no square halos.
  - **Labels:** on `02`, `shrine` is fully on screen. Pan and resize: no label is ever cut off at an edge, or hidden under the HUD or the parts panel.
  - **Still dominant:** the circuit is the brightest, clearest thing on screen. Panning and the Relight on `56` stay smooth.

## Files
- **0 (lead-architect):** `src/core/words.ts` and `src/core/words.test.ts`, written at G1 before A2 and B start.
- **A1, A2 (renderer):** `src/render/` only (`city.ts`, `map-renderer.ts`, `index.ts`, tests).
- **B (ui):** `src/ui/` and **`src/main.ts`** (the overlay and `placeAt` wiring; a declared cross-folder edit).
- **A3 (renderer):** `src/render/` only (`city.ts`, `places.ts`, `map-renderer.ts`, tests). No interface outside `src/render/` changes: `MapOverlay`, `MapPlaces`, `MapPanView` and `MapRenderer` stay as they are.

Out of scope for every part: `src/grid/`, `src/play/`, `src/audio/`, `puzzles/`, `index.html`, `package.json`.

## Order
0. **022 and 023 merge first** (they are on the preview branch now). 024 replaces parts of 023, so it starts from `main` with 023 in.
1. **Part 0** (lead-architect), at G1.
2. **A1** (alignment), about a day.
3. **A2** (places, labels, highlight drawing, `placeAt`), about a day. It may start in parallel with A1 on its own branch, but it merges after A1, because both edit `city.ts` and placement must clear A1's lanes.
4. **B** after A2 merges.
5. **A3** after 0, A1, A2 and B are settled (in review now on `ticket/024-city-alignment`). It starts from that branch, or from `main` once it merges, and only on Josh's G1 for A3. It is about a day. If 0–B is merged before A3, A3 lands as its own merge. If Josh would rather not merge the goofy look at all, 0–B and A3 can merge together after A3 (Open question 7).

## Interfaces
`src/core/words.ts` (part 0):
```ts
export type PlaceKind = "sacred" | "water" | "mill" | "gate" | "work" | "market" | "hall" | "homes" | "home" | "streetlight";
/** The lamp id's base (trailing _N / _NN stripped) looked up in the place table; unknown → "home". */
export function placeKind(lampId: string): PlaceKind;
/** The words for a lamp's place: the id with "_" as spaces, as the targets list shows today. */
export function placeName(lampId: string): string;
```
`src/render/` (A1, A2):
```ts
export const FOOTPRINT_MARGIN = 2;
export const LANE_W = 0.5;
export interface Lane { ax: number; ay: number; bx: number; by: number; w: number } // map units
export function circuitStreets(puzzle: Puzzle): { lanes: Lane[]; squares: Building[]; footprint: CityRect };
export interface Place extends Building { lamp: string; kind: PlaceKind; label: string | null; pool: boolean }
export interface MapOverlay { hover?: string | null; relightT?: number; highlight?: string | null }
export interface MapPlaces {
  /** Lamp id whose place is under the canvas point (CSS px), via the same fit and pan as drawing; null otherwise. */
  placeAt(x: number, y: number): string | null;
}
export function createMapRenderer(...): MapRenderer & MapPanView & MapPlaces;
```
Removed: `linkBuildings`, `Linked` and `CITY_LINK_R` (the half-strength glow).

`src/ui/index.ts` (B): `UIDeps` gains `onHighlight?(lampId: string | null): void`, and `UI` gains `highlight(lampId: string | null): void`.

No event or payload changes. **No schema change, no puzzle edits, no new dependencies, no assets.**

A3 interfaces (internal to `src/render/`):
```ts
export const STREET_PX = 3;
export const AVENUE_PX = 6;
export const SETBACK = 0.3;          // map units, block edge to lot
export const WIRE_CLEAR_PX = 10;
export const GLOW_MAX = 0.3;
export const POOL_PX = 36;
export function nodeClearPx(node: Node): number;
export function blockLots(cellX: number, cellY: number): Building[];      // city units, the pattern's lots
export function footprintLayout(puzzle: Puzzle, origin: Vec, scale: number): { buildings: Building[]; places: Place[]; streets: Lane[] }; // map units, px clearances at `scale`
export function placeLabel(place: Place, area: Rect, obstacles: readonly Rect[], textW: number, textH: number, scale: number, fit: Fit): Rect | null;
```
Removed by A3: `HALO_LAYERS`, `HALO_ALPHA`, `glowRect`, `FINE_CELL`, and drawing with `LANE_W`. No new dependencies, no assets.

## GDD check
Presentation only. Win, capacity and brownout are only read, through `state.lit`. The Relight timing is unchanged. `hitTest`, and so every throw and repair, is unchanged. No rules-coverage change.

## Open questions
1. **Avenues and the circuit (carried from 023):** cut so the avenue **stops at the map's edge** and meets the feed's lane, so no avenue runs under the wiring and the power visibly arrives from the avenue. The alternatives are to keep it running under the circuit (as in the preview) or to offset each map half a district beside its avenue.
2. **Labels:** you said "no labels" for 023, and this feedback asks for places that match what's lit. Cut with small, dim labels on **targets only**, the same words as the list. Labels on every lamp? Or no labels at all, relying on the shapes plus the hover link?
3. **Shapes by kind:** are the ten kinds and their footprints right (sacred, water, mill, gate, work, market, hall, homes, home, street light)? Should anything else be told apart, e.g. chapel vs shrine, bakery vs forge?
4. **Non-target lamps:** cut so they show their own kind's footprint (a `mill` that isn't a target still looks like a mill), with no label. Or should non-targets all be plain homes or streetlights, so only targets stand out?
5. **Neighbouring maps' lanes:** when you pan into the next district, it shows the plain city grid, not that map's own wiring lanes. Showing them needs main.ts to hand the renderer the neighbours' puzzles, a small follow-up ticket. Wanted?
6. **A3: how dense should the town be?** Cut at about 2 buildings per block, with 20 % empty yards. Would you like it sparser (more yards, a quieter backdrop) or denser?
7. **A3: merge 0–B first, or wait?** The current build (0, A1, A2, B) is in review. Merge it as it stands and land A3 on top, or hold the merge so you never see the goofy look on `main`?
8. **A3: labels that can't fit.** When a target's label can't fit anywhere on screen without covering the circuit, it is cut to hide (the list and the hover link still name it). Or would you rather it overlap a building, but never the circuit?
9. **A3: street light shape.** Cut as a pool of light only, with nothing drawn when it is dark. Or do you want a small post mark so dark street lights are visible too?
