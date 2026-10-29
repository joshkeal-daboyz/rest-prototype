# 026 · Buildings beside their own lamps, smaller lamps, street lights linked to the list

owner: renderer (A), ui (B)
status: done
branch: one per part: `ticket/026-buildings-focus-a`, `ticket/026-buildings-focus-b`

## Josh's words
On the merged city (ticket 024), answering the review's optional items:
- "Place the buildings nearer their own lamps. - I think the laps should be smaller and the buildings should be more prominent. They are the focus."
- "Highlight a street-light's list entry when you hover it on the map. - yes"
- He declined the third item (more labels at narrow widths). It is out of scope.

## Where it is today (read from `main` at 6f30570)
- **Places sit far from their lamps.** A3 puts each place in the nearest free **lot slot** (`slotCandidates` in `src/render/city.ts`), ranked by centre distance. The slots sit on the fixed block lattice. A lamp keeps `nodeClearPx = clusterRadius + 10` px (24 or 32 px) clear, and every wire keeps 10 px clear, so the nearest free slot is often a block away.
  - Over all 64 open maps (probe on a scratch copy), the gap from a place's nearest edge to its lamp's centre was: median 39 / 65 / 49 px, max 151 / 222 / 344 px, at 30 / 50 / 80 px per unit.
  - At those scales, 28 / 23 / 14 placed buildings sit nearer another lamp than their own. Examples: `21-make-room` market, `32-main-fuse` shrine, `17-why-it-blew` market.
  - Ranking by edge distance, or only shrinking the lamp, barely helps (median unchanged). The lot lattice is the limit.
- **Lamps dominate the picture** (`drawLamp` in `src/render/map-renderer.ts`, `src/render/load.ts`):
  - Bulb radius 14 px (one bulb) or 11 px (cluster), so `clusterRadius` is 14 or 22.
  - The light pool is three discs of 50 / 36 / 25 px × `poolRadiusScale` (up to 2.2), so up to 110 px across a load-3 lamp. Its alpha is capped at 0.55.
  - The dark footprint disc is `cr + 10`, the target ring is dashed at `cr + 8` (2 px), and the highlight ring is at `cr + 11`.
  - The Lv caption is 12 px at `y + cr + 13`. The star is bold 13 px at `y − cr − 17`.
- **Buildings recede by design.** 024 A3 capped every city colour at contrast 1.6 against `CITY_BG`:
  - `CITY_PLACE_FILL #27344c` is 1.54.
  - `CITY_PLACE_EDGE #2a3650` is nearly the same as the fill (the review's could-improve 10).
  - The lit place glow is `GLOW_MAX = 0.3`, and the lit tint is `LIT_FILL_ALPHA = 0.22`.
- **Hit areas:** `hitR = max(NODE_HIT_RADIUS 18, clusterRadius + 4)`, so 18 px for one bulb and 26 px for a cluster.
- **Street lights never link to the list.** A street light's place is a pool whose `placeAt` box is the lamp's own 0.7 square. `placeHighlight(overCircuit, placeLamp)` in `src/ui/logic.ts` returns null whenever `hitTest` finds a circuit element. The lamp's hit disc covers that square, so hovering a lantern or `lamp_NN` target never highlights its list entry.

## Goal
On every map, each lamp's building sits right beside its lamp, nearer to it than to any other lamp. The buildings are the brightest things in the town and the focus of the picture: a lit place glows warmly, a dark one still reads as a building. The lamps are small markers on the circuit, still easy to hover and click, with captions that stay readable. Wires, switches and fuses stay clear and readable. Hovering any lamp on the map, a street light included, highlights its entry in "Priests want lit".

## Decided in this cut
### A (renderer): places beside their own lamp
- **Free front slot.** For the `whole`, `quarter` and `row3` slot kinds, a place's candidates are first its kind's box at every offset on a **0.1 map-unit grid relative to its lamp**, within ±3 units. A `row3` box is three quarter lots in a row or a column, with `LOT_GAP` between them.
  - Candidates are ranked by **edge distance** (`pointBoxDistance` from the lamp centre to the nearest part). Ties are broken by a fixed order (dy, then dx), so the result is deterministic.
  - The lot slots of 024 A3 come after them, as the fallback. Then comes the pool, as today.
- **Own lamp first.** In a first pass, a candidate is skipped if any **other** lamp's centre is nearer to it (edge distance) than its own lamp's. A second pass, without that rule, runs only if the first finds nothing.
- **Places are no longer on the lot lattice.** Background lots that a place overlaps, within `RING_GAP`, are dropped, as now. Background **buildings** keep every A3 rule: four sizes, edges on setback and gap lines.
- **Clear of the circuit, the same as now:** `WIRE_CLEAR_PX = 10` from every wire, decor path and feed lane, and `nodeClearPx` from every node centre. **New:** a place is also kept clear, by `LABEL_GAP_PX = 4`, of every lamp's Lv caption box and target star box (the boxes `targetLabels` already uses, at the new sizes below). So a building next to its lamp never sits under a caption or star.
- **Gates** keep their posts-beside-the-wire rule.
- **Probe result** (scratch copy of `city.ts`, all 64 open maps, with a lamp clearance of 20 / 22 px; the 7 px bulb gives 20 / 20, so it can only get closer and caption/star clearance): every place nearer its own lamp than any other; median gap 22–23 px; p90 ≤ 34 px; max 45 / 65 / 104 px at 30 / 50 / 80. Only the `homes`/`houses` rows and gates went above 45 px, and the probe had no free slot for `row3`, which this cut adds. Non-streetlight pools: at most 2.

### A (renderer): smaller lamps
Every px value is CSS px, at any scale (the lamp is not scaled with the map, as today).

| what | today | 026 |
|---|---|---|
| bulb radius (`bulbRadius`), one bulb / cluster | 14 / 11 | **7 / 6** (Josh: "7 is fine") |
| `clusterRadius` (cr), load 1 / 2–3 | 14 / 22 | **7 / 12** |
| bulb outline, normal / hovered | 2.5 / 4 | **2 / 3** |
| `drawLamp` local `br` | hard-coded `nb === 1 ? 14 : 11` | **`bulbRadius(load)`** (one source) |
| light pool discs (× `poolRadiusScale`) | 50 / 36 / 25 | **24 / 18 / 12** |
| `poolAlpha` cap | 0.55 | **0.4** |
| dark footprint disc | cr + 10 | **cr + 6** |
| flare ring | cr + 4 + f·40·ps | **cr + 3 + f·24·ps** |
| hover ring | cr + 5 | **cr + 3** |
| target ring (dashed) | cr + 8, 2 px, [4,4] | **cr + 5, 1.5 px, [3,3]** |
| highlight ring (`hiNode`) | cr + 11 | **cr + 8** |
| Lv caption | 12 px at y + cr + 13 | **10 px at y + cr + 10**, with a 3 px `CITY_BG` outline (`strokeText` before `fillText`) so it reads over the town |
| target star | bold 13 px at y − cr − 17 | **bold 11 px at y − cr − 13**, the same outline |
| dead-lamp X / red flicker | 8 / 9 + 3·fl | **5 / 5 + 2·fl** |
| lamp hit radius `hitR` | max(18, cr + 4): 18 / 26 | **max(`NODE_HIT_RADIUS` 18, cr + 6): 18 / 18** |
| `nodeClearPx(lamp)` | cr + 10: 24 / 32 | **max(cr + 8, `NODE_HIT_RADIUS` + 2): 20 / 20** |

- **The minimum hit radius is 18 px** (`NODE_HIT_RADIUS`, unchanged) for every lamp. A lamp is never harder to hit than a junction.
- `nodeClearPx(lamp)` stays above the hit radius, the target ring and the highlight ring. So a place never sits inside the lamp's hit disc, and hovering a building never hits the lamp.
- **Every other node is unchanged:** feed, breaker, switch, junction, fusebox and battery icons, their captions, `nodeClearPx`, wire widths and colours, and `WIRE_CLEAR_PX`.
- **Lv caption and star** keep their words (`lampCaption`), colours (`TEXT_DIM` dark, `WARM_HOT` lit; `TARGET`) and alignment. The caption obstacle box in `targetLabels` and in the new place clearance uses the new font: 6 px per glyph + 4, 14 px tall, centred at y + cr + 10. The star box is 14 × 14, centred at y − cr − 13.

### A (renderer): buildings are the focus
- **Place colours** (`src/render/city.ts`). These replace A3's 1.6 cap **for places only**:
  - `CITY_PLACE_FILL`: contrast **2.0–2.4** against `CITY_BG`, **≥ 1.9** against `CITY_BUILDING`, and below `NODE_DEAD #4a586f`'s contrast (2.66), so a dead node's outline still reads above any building. A good start is `#3a4a68` (2.15).
  - `CITY_PLACE_EDGE`: **lighter** than the fill, contrast **≥ 1.5** against it and **≤ 3.8** against `CITY_BG`, so the 1 px edge finally shows. A good start is `#5a6d90` (1.71 against `#3a4a68`).
  - `CITY_BUILDING`, `CITY_STREET_LINE` and `CITY_AVENUE_COLOUR` are **unchanged**, still ≤ 1.6. The town stays quiet, and the places stand out of it.
- **Plans fill their box:**
  - sacred: the cross arm goes from 0.72 to **0.9** of the box (bell and tower stay at 0.9).
  - water: the ring goes from 0.5 to **0.6** units (the full quarter lot), with a **3 px** stroke.
  - mill: the disc goes from 0.5 to **0.6** units.
  - Other kinds are unchanged. **No place gets bigger than its lot size** (whole 1.4, quarter 0.6, row of three quarters); see Open question 2.
- **Lit places glow more:**
  - `GLOW_MAX` goes from 0.3 to **0.5**.
  - `LIT_FILL_ALPHA` goes from 0.22 to **0.5**.
  - `glowRadiusPx` goes from max(1.8·h, 28) to **max(2.2·h, 32)**.
  - The street-light pool `POOL_PX` goes from 36 to **28** (it matches the smaller lamp).
- **Glow timing unchanged:** lit means in `state.lit`, a brownout means dark, the Relight lights each place at its lamp's `nodeArrive`, the ease takes 0.25 s, and only a lamp's own place glows.
- **Dark places stay visible** at the new fill (see Open question 3). Dark street lights still draw nothing.
- **Per frame unchanged:** one layer `drawImage`, one sprite per lit place, the labels. Places stay in the cached layer.

### B (ui): hovering a lamp highlights its list entry
- **The rule:** if the pointer is over a **lamp**, the highlight is that lamp. If it is over any **other** circuit element (wire, switch, breaker, fusebox, junction, feed, battery), there is no highlight. Over neither, it is the place under the pointer (`placeAt`), as today.
- This covers street lights, whose place is a pool under the lamp, and every other lamp. A non-target lamp has no list entry, so only its place and lamp ring show, as for its place today.
- **Clicks are unchanged:** `hitTest` and every throw and repair are untouched. The highlight only reads which element is under the pointer.
- In `src/ui/logic.ts`, `placeHighlight` changes to:
  ```ts
  export function placeHighlight(hit: string | null, lampIds: ReadonlySet<string>, placeLamp: string | null): string | null;
  ```
  - `hit` is `renderer.hitTest(x, y)`.
  - `lampIds` is the open puzzle's lamp node ids. `main.ts` builds it once per map load.

## Acceptance criteria
- [ ] **A (renderer), Vitest in `src/render/` (pure; no canvas):**
  - **Near its own lamp.** For every open map, at 30, 50 and 80 px per unit, measure every non-pool place's edge distance to its lamp's centre:
    - no place is nearer (edge distance) to another lamp's centre than to its own;
    - the median gap is ≤ 30 px;
    - the 90th percentile is ≤ 40 px;
    - every non-gate place is ≤ 60 px;
    - non-streetlight pools are ≤ 1 % of non-streetlight lamps at each scale.
  - **The free slot.** A constructed test: a lone `shrine` lamp with one wire. At 50 px per unit, its place's nearest edge is within 36 px of the lamp centre, and it clears the wire, the caption and the star. A second constructed test: two lamps 3 units apart. Each place is nearer its own lamp.
  - **Clear of the circuit (024 A3's core test still holds).** At 30, 50 and 80 px per unit, sampling every line, decor path and feed lane every 2 px, and building the wires from `puzzle.lines` / `puzzle.decor` / `feedLanes` directly (not from `layout.streets`; the review's could-improve 7):
    - no building, place or label box comes within `WIRE_CLEAR_PX` of a wire;
    - none comes within `nodeClearPx` of a node centre.
  - **Clear of captions and stars:** no place overlaps any lamp's Lv caption box or star box (the new sizes above), at 15, 30, 45, 70 and 120 px per unit, over every open map.
  - **Labels:** 024's label tests still pass at the new caption and star sizes, at 1920 × 1080 and 400 × 700, with insets and pans. Every shown label is inside the free area and clear of every lamp's caption and star (all lamps, not only its own: the review's could-improve 11). At most 1 hidden label per map at 1920 × 1080.
  - **Smaller lamps:**
    - `bulbRadius(1) === 7`, `bulbRadius(2) === 6`; `clusterRadius(1) === 7`, `clusterRadius(3) === 12`.
    - The load still shows: a load-3 cluster's total bulb area is greater than load 1's, and `clusterRadius(3) > clusterRadius(1)`.
    - Every lamp's `hitR` is ≥ `NODE_HIT_RADIUS` (18). (A load-3 lamp's is now exactly 18, so the old `readable-failures.test.ts` "> 18" check is a replaced test: it becomes ≥ 18.)
    - `nodeClearPx(lamp) ≥ hitR + 2` and ≥ cr + 8 for loads 1–5.
    - A point at cr + 1 px from a load-3 lamp hit-tests to that lamp.
  - **Colours:** the contrast bands above, as tests:
    - `CITY_PLACE_FILL` is 2.0–2.4 against `CITY_BG`, ≥ 1.9 against `CITY_BUILDING`, and < the contrast of `#4a586f` against `CITY_BG`.
    - `CITY_PLACE_EDGE` is lighter than the fill, ≥ 1.5 against it, and ≤ 3.8 against `CITY_BG`.
    - `CITY_BUILDING`, `CITY_STREET_LINE` and `CITY_AVENUE_COLOUR` stay ≤ 1.6 against `CITY_BG`.
    - `GLOW_MAX` is ≤ 0.5, `LIT_FILL_ALPHA` ≤ 0.5, `POOL_PX === 28`, and `glowRadiusPx(h) === max(2.2·h, 32)`.
  - **Unchanged:**
    - `placeShapes` still gives ten distinct signatures;
    - `glowTarget` / `easeGlow` keep their tests;
    - the hub-and-spoke and calm-block tests pass (background buildings only);
    - `placeAtPoint` returns the lamp for a point inside its place, and `null` just outside it (restored, could-improve 8);
    - determinism: the same map and scale give equal output.
  - Every existing `src/render/` test passes, except those whose rules this ticket replaces: places in lot slots, the A3 contrast cap for places, `GLOW_MAX ≤ 0.3`, `LIT_FILL_ALPHA ≤ 0.3/0.35`, and any test that hard-codes the old caption, star, bulb or ring sizes. The builder lists each changed test; the review checks the list.
  - `npm run gate` is green, and the test count grows.
- [ ] **B (ui), Vitest in `src/ui/logic.test.ts` (pure):**
  - `placeHighlight("lantern", lamps, null)` is `"lantern"` when `lantern` is a lamp, so a street light highlights itself.
  - A hit on a target lamp gives that lamp, even when `placeLamp` names another.
  - A hit on a switch, breaker, junction, feed, fusebox, battery or line id gives `null`.
  - No hit gives `placeLamp`, including `null`.
  - `main.ts` builds `lampIds` from the open puzzle's lamp nodes on each map load, and passes `renderer.hitTest(x, y)` and `renderer.placeAt(x, y)` to `placeHighlight`. The reviewer reads this; there is no jsdom (see 024's review). No game rule goes in `main.ts`.
  - `npm run gate` is green, and the test count grows.
- [ ] **Josh in the browser, at full size** (`npm run dev`, after A and B). Look at `02`, `08-shrine-circuit`, `17-why-it-blew`, `21-make-room`, `32-main-fuse`, `56-meet-in-the-middle` and any three more. The builders could not see a screen, so these are judged by eye only:
  - **Beside its lamp:** every building sits right next to its own lamp. On `21` the market, on `32` the shrine and on `17` the market each belong plainly to their own lamp, not a neighbour.
  - **Buildings are the focus:** the eye goes to the places first. A lit place is a warm building, and a dark one is a clear shape. The background town is still quiet.
  - **Lamps are small** but still read as lamps. One, two or three bulbs still show the load. The target's dashed ring and star are still visible.
  - **Captions read:** `Lv1 Lamp` … and the star are legible at full size and at about 400 px wide, including where they sit over a building or street.
  - **Hovering and clicking:** each lamp is easy to hover and click (the hover ring shows), and a building next to a lamp never steals the click.
  - **Circuit still readable:** dead wires, live wires, switches, breakers and fuses are as clear as before, and no building touches a wire or node.
  - **List link:** on a map with a lantern or `lamp_NN` target, hover the lamp: its list entry is outlined. Hover a switch or a wire: no entry is outlined. Hover a shrine's building: its entry is outlined.
  - **Unchanged:** the Relight lights places one by one, a brownout is dark, pan, Home, win splash, sound, and smooth panning on `56`.

## Files
- **A (renderer):** `src/render/` only. That is `city.ts`, `places.ts`, `load.ts`, `geometry.ts` (the `hitR` formula only; `hitTestGeometry` is unchanged), `map-renderer.ts`, and tests. `MapOverlay`, `MapPlaces`, `MapPanView` and `MapRenderer` are unchanged.
- **B (ui):** `src/ui/logic.ts`, `src/ui/logic.test.ts`, and **`src/main.ts`**. `main.ts` is a declared cross-folder edit, the same as 024 B: the `placeHighlight` call and `lampIds`.

Out of scope for both parts: `src/core/`, `src/grid/`, `src/night/`, `src/play/`, `src/audio/`, `puzzles/`, `index.html`, `package.json`, and labels at narrow widths (declined).

## Order
- **A and B can run in parallel.** They touch no common file. B uses only `hitTest` and `placeAt`, which A leaves as they are.
- Either part may merge first.
- Josh's browser check is on both together. The main session can make a `preview/026` branch merging both, as for 022 + 023.
- A is about a day. If the builder finds it bigger, split it at the seam: **A1** is the smaller lamps and building colours (the table and colours above). **A2** is the free front slot and caption clearance, which needs A1's `nodeClearPx`. Re-cut through the architect.

## Interfaces
Internal to `src/render/`. These are changed values and one new rule, not new exports:
```ts
// load.ts
bulbRadius(load): 7 | 6;                 // was 14 | 11
// geometry.ts, buildGeometry
hitR = type === "lamp" ? Math.max(NODE_HIT_RADIUS, clusterRadius(load) + 6) : NODE_HIT_RADIUS;
// city.ts
nodeClearPx(lamp) = Math.max(clusterRadius(load) + 8, NODE_HIT_RADIUS + 2);
GLOW_MAX = 0.5; LIT_FILL_ALPHA = 0.5; POOL_PX = 28;
glowRadiusPx(h) = Math.max(2.2 * h, 32);
```
- `places.ts` gains a helper for the caption and star boxes, `lampMarks(node, x, y): PxRect[]`, used by both `targetLabels` and place placement.
- `src/ui/logic.ts` (B): `placeHighlight(hit: string | null, lampIds: ReadonlySet<string>, placeLamp: string | null): string | null` replaces `placeHighlight(overCircuit, placeLamp)`.
- No schema, event, `src/core/` or puzzle change. **No new dependencies, no assets.**

## GDD check
Presentation and hover only:
- Lit, brownout and the Relight are only read: `state.lit`, `nodeArrive`.
- `hitTestGeometry` is unchanged, and so is every throw and repair. Only a lamp's hit radius for a cluster changes, from 26 to 18 px, and it is never below 18.

No rules-coverage change.

## Josh's answers (to the open questions below; the ticket is NOT yet approved for G1)
Josh's replies, in order: "7 is fine", "no", "visible", "leave it", "off the grid for now".
1. **Lamp size:** "7 is fine". A lone bulb has a 7 px radius and a cluster bulb 6 px, so `clusterRadius` is 7 / 12.
   - The halo discs are 24 / 18 / 12 × `poolRadiusScale`, about 53 px across at load 3.
   - The dead-lamp X is 5, and its flicker is 5 + 2·fl.
   - The caption stays at y + cr + 10 and the star at y − cr − 13.
   - The hit radius is max(18, cr + 6): 18 for every load, never below 18. `nodeClearPx(lamp)` is max(cr + 8, 20): 20 for every load.
   - Every 024 guarantee holds: wires and nodes stay clear, and labels stay clear of every caption and star.
2. **Places don't grow:** "no". Lot sizes stay; places are only fuller and brighter, as cut.
3. **Dark places:** "visible". Dark places stay clearly visible at the new fill and edge. Dark street lights keep drawing nothing, with no post mark.
4. **Dead wires:** "leave it". The dead-wire colour is unchanged, and no circuit colour ticket is needed.
5. **Off the grid:** "off the grid for now". Places use the free front slot, off the block grid. Background buildings keep the grid.

## Open questions
1. **How much smaller?** This cut takes a lone bulb from 14 to 9 px radius, and a load-3 cluster from 22 to 14 px. The halo goes from up to 110 px to about 66 px across. Smaller still (e.g. 7 / 6 px), or about right? The hit area stays at least 18 px whatever you choose. *(Answered: 7 / 6 px, applied in the table above.)*
2. **Should places also grow?** This cut keeps each place at its lot size (a shrine 1.4 units, a home 0.6) and makes it brighter and fuller inside that size. The alternative is to scale every place up about 1.3× (a shrine 1.8 units), now that it no longer has to fit a lot. That makes them bigger focal points, at the cost of more crowding on dense maps (`54`, `56`).
3. **Dark places:** cut so a dark place stays clearly visible: the brighter fill (contrast about 2.15 against the ground) and a visible edge. Should dark places instead stay faint (near the old 1.5), so only lit ones stand out? Street lights still show nothing when dark. Want a small post mark for them?
4. **Buildings vs dead wires:** at about 2.15 against the ground, a dark building is brighter than a dead wire (1.53). The wires never touch a building (10 px gap), so the circuit should still read. If dead wires get lost, should the dead-wire colour be raised a little instead? That would be a circuit colour change, so a separate ticket.
5. **Places off the block grid:** to sit beside its lamp, a place now leaves the tidy lot grid (the background buildings keep it). OK, or should places snap to a half-lot grid (a little further away, a little tidier)?
