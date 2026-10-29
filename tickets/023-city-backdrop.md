# 023 · A top-down city under the map; lit lamps light their places

owner: renderer
status: done
branch: ticket/023-city-backdrop

## Josh's words
"I want to add the background of a city to the application. You should be lighting locations. For now lets do this top down."

(He gave these words as an addition to 022. They are cut as their own ticket, because they are a different feature. 022 stays centring and pan; see Order.)

## Goal
Behind every map's circuit there is a dim, top-down city: streets, blocks and building footprints as dark shapes. It is **one city**, laid out as a hub and spokes. Map 01 is the town square at the centre, and avenues run out from it to the other maps' districts. Each map is a window onto its own district. Map 07's streets continue into map 08's, the next district out along the same avenue. The city fills the window and moves and centres with the circuit, because it uses the same transform. Each lamp has a place beside it (a building footprint). When the lamp is lit, its place glows warm. When the lamp is dark, browned out or blown, the place stays dark. During the Relight, the places come on one by one as the cascade reaches their lamps. The circuit always reads first: the city is low-contrast and drawn under everything. Clicks, hover, rules, puzzles and sound are unchanged.

## Decided in this cut (with Josh's answers)
- **One shared city, with no schema change.** The city is a pure function of world position under one fixed seed, `CITY_SEED`. Space is cut into cells of `CITY_BLOCK = 2` map units, and each cell's buildings come from `hash(CITY_SEED, cellX, cellY)`.
  - So the city is the same everywhere, on every map and every load, and any visible area can be generated without a city-sized table. "Generated once and cached" falls out of this.
  - The renderer caches the cells it has generated in a `Map` keyed by cell, so panning back reuses them.
  - Streets run on the cell edges, `CITY_STREET = 0.35` units wide. Nodes sit about 3 units apart, as in `01-first-light`.
- **Where each map sits in the city:** `mapOrigin(id, bounds)`, a pure function in `src/render/city.ts`. It returns the offset that turns map units into city units (`city = pos + origin`). It reads the id only; no puzzle file is edited.
  - **Ladder number** `n`: the id's leading digits (`07-where-it-stops` → 7). A locked copy (`locked/07-…`, or an id inside `puzzles/locked/`) uses the same number, so it shows the same section. That is right, because it is the same map.
  - **Hub and spoke (Josh: "a central hub and spoke"):**
    - **The hub is the town square, and map 01 is on it** (Josh: "map 1 should be town square").
      - The hub is the area within `HUB_R = 40` units of the city's centre, `(0, 0)`.
      - Map 01's district is the 32-unit square centred on `(0, 0)`. Its corners are 22.6 units out, inside the hub.
      - The hub is built like the rest of the city: ordinary streets and buildings, filtered clear of map 01's nodes, with a place beside each of its lamps.
      - There are no avenue bands inside the hub. They start at its edge.
    - **Spokes:** `SPOKES = 8` radial avenues leave the hub every 45°. Spoke 0 runs east, and the rest follow anticlockwise: E, NE, N, NW, W, SW, S, SE. Each avenue is a band `CITY_AVENUE = 1.2` units wide, from the hub's edge outward, with no buildings on it. The ordinary street grid fills everything between the spokes.
    - **Districts:** each district is `DISTRICT = 32` units square, axis-aligned, and holds one map. The largest map today spans 24 × 11 units, so every map fits inside its district with at least 4 units to spare on each side.
    - **Maps 02 onward, in runs of 8 per spoke:** for `n >= 2`, let `k = n - 2`. Map `n` goes on spoke `s = floor(k / 8) % 8`, at slot `j = k % 8 + 8 * floor(k / 64)`. Slot 0 is next to the hub. So:
      - 02–09 run out along the east spoke, 10–17 along the north-east, 18–25 north, 26–33 north-west, 34–41 west, 42–49 south-west, 50–57 south, and 58–64 south-east.
      - That is 8 maps on each of the first seven spokes and 7 on the last. 63 maps don't divide by 8, and keeping every run in ladder order is worth the one short spoke.
      - On each spoke, the run's easiest map is by the hub and its hardest at the far end. Consecutive maps in a run are next to each other along their avenue.
      - Map 09 (end of spoke 0) and map 10 (hub end of spoke 1) are not neighbours. Each new run starts back at the hub.
      - The runs follow the ladder's numbering. They are not matched to design tiers, because the brief's puzzle table has no fixed 8-map tiers.
    - **District centre:** `dir(s) * (R0 + j * step(s))`.
      - `R0 = 64`.
      - `step = DISTRICT` (32) on the axis spokes (E, N, W, S), where consecutive districts share an edge.
      - `step = DISTRICT * √2` (≈ 45.25) on the diagonal spokes, where consecutive districts touch corner to corner.
      - With `R0 = 64`, no two districts overlap, on the same spoke or on neighbouring spokes: neighbouring spokes' squares clear each other once the radius passes 32√2 ≈ 45.3. Every spoke's first district is clear of map 01's square: on the axis spokes its inner edge is at 48 units, against map 01's edge at 16; on the diagonals its nearest corner is at (29.3, 29.3). It also sits just outside the hub radius, so the avenue reaches it.
    - **Capacity:** the hub plus 63 spoke slots hold maps 01–64. Map 65 fills the last slot on the south-east spoke, and from map 66 every spoke gets 8 more slots further out, so the city grows outward with no limit. The largest map (24 × 11) fits in its 32-unit district with at least 4 units to spare on each side, map 01 included.
  - **Inside its district,** the map's bounds are centred: `origin = districtCentre - boundsCentre`, rounded to whole cells. Rounding to whole cells means the streets line up the same way on every map; on diagonal spokes the map sits within a cell of the exact centre. The spoke's avenue runs through the district centre, so each spoke map's circuit sits over its stretch of the avenue (Open question 1). Map 01 has no avenue under it.
  - **An id with no leading number** (e.g. `lamp-row`) gets `n = 65 + (stableHash(id) % 64)`, which puts it on the outer ring.
  - **Locked copies** share their open map's number, and so its district. The locked 01 is on the town square too.
  - **Neighbouring maps show neighbouring streets:** panning along the avenue shows the start of the next or previous map's district. Panning toward the hub from the first map of a spoke (02, 10, 18, …) shows the edge of map 01's town square.
- **Places, per map:**
  - Each lamp gets one **place**: a building footprint next to it, offset to the side with the fewest of its lines. Its centre is at least 0.6 units from every node.
  - The shared city's own buildings are **filtered per map**. Any building with its centre within 0.6 units of the current map's nodes, or overlapping a place, is not drawn on this map. So the city never sits on the circuit's nodes, and a place never overlaps a city building.
  - City buildings whose centre is within `CITY_LINK_R = 1.6` units of a lamp link to the nearest lamp. On a tie, the earlier lamp in `nodes` wins. They glow at half strength.
  - Every other building is always dark.
- **Glow, from state the renderer already receives (no new grid data):**
  - A place's glow is 1 when its lamp is in `state.lit`. In a brownout nothing counts as lit, so a brownout leaves every place dark.
  - Otherwise the glow is 0. That covers dark, unpowered, faulted and blown-fuse lamps.
  - The glow eases toward its target over `0.25` s.
  - **During the Relight**, a place stays dark until `relightT >= plan.nodeArrive[lamp]`, then eases on.
  - Glow is drawn as a warm fill plus a soft halo: a few stacked translucent rects, with no gradient allocation per frame.
- **Style (Josh: dark shapes, footprints only):**
  - Flat dark rects for buildings, darker bands for streets, no texture and no outlines beyond 1 px.
  - **No names, kinds or labels** on places or buildings.
  - No image assets, no new dependency, Canvas 2D only.
- **Contrast budget, so the circuit always reads:**
  - Dark building fill and street colours are within a contrast ratio of 1.6 of `BG #0b0f17`.
  - Lit fill alpha is at most 0.35, and halo alpha at most 0.2.
  - The city is drawn first, after the background clear and before decor, lines, nodes and captions.
- **Same transform, so it pans and centres with the map:**
  - A city point is drawn at `(cityX - origin.x) * fit.scale + fit.offsetX`. That is the map position, through the same `Fit`, which carries 022's pan.
  - The visible city rect is the canvas converted back to map units, plus `origin`, plus one cell.
- **Performance (Josh: 2 ms per frame is fine):**
  - The dark city is rendered once to an offscreen canvas. It is rebuilt only when the geometry is rebuilt (resize, insets, pan), then blitted each frame.
  - Only places and linked buildings are drawn per frame.
  - Budget: the city adds at most 2 ms per frame on `56-meet-in-the-middle` at 1920×1080.
  - If an offscreen canvas is unavailable, it draws directly.
- **Hit-testing is not touched.** The city is not in `Geometry`'s hit data, and `hitTestGeometry` is unchanged.

## Acceptance criteria
- [ ] **Vitest, a new pure module `src/render/city.ts` (no DOM, no canvas) and `src/render/city.test.ts`:**
  - **One city:** `cityCells(rect)` (city units) is deterministic. The same rect gives equal output on repeat calls. Two overlapping rects give identical buildings in the overlap.
  - **Ladder number:** `ladderNumber(id)` gives `7` for `07-where-it-stops` and for its locked key `locked/07-where-it-stops`, `56` for `56-meet-in-the-middle`, and `null` for `lamp-row`.
  - **District layout:** `districtOf(n)` returns `{ spoke, slot, centre }`, following the hub-and-spoke layout above. For map 01 it returns `{ spoke: null, slot: null, centre: { x: 0, y: 0 } }`.
    - **Map 01 on the hub:** `districtOf(1).centre` is `(0, 0)`, and its whole square is inside `HUB_R`.
    - **Distinct:** all districts for `n` in 1..128 are distinct, and no two of their 32-unit squares overlap (pairwise; touching edges or corners is allowed).
    - **Neighbours along a spoke are adjacent:** for every `n` in 2..127 where `n` and `n + 1` are on the same spoke, their squares touch. On the axis spokes they share an edge, and on the diagonals they share a corner. Their centres are exactly one `step` apart along the spoke's direction.
    - **Runs:**
      - `n` 2–9 are on spoke 0, slots 0–7, and `n` 10 is on spoke 1, slot 0.
      - `n` 58 is on spoke 7, slot 0, and `n` 64 on spoke 7, slot 6.
      - `n` 65 is on spoke 7, slot 7, and `n` 66 on spoke 0, slot 8.
    - **Hub reachable from every spoke:**
      - The centre of every spoke district (`n >= 2`) lies on its spoke's ray from `(0, 0)`, within 1e-9.
      - Each spoke's slot 0 square does not overlap map 01's square. Its nearest point to the hub lies between `HUB_R` and `R0`, so the avenue reaches it.
      - `onAvenue(x, y)` is true along each spoke's ray from `HUB_R` to the far end of slot 7.
      - So the avenue runs unbroken from the town square through every district on the spoke.
    - **Nothing built on the avenues:** `cityCells` over a stretch of each avenue returns no building whose centre is on it.
    - **The town square is built:** `cityCells` over the hub returns buildings.
    - **Map 01's buildings and places:** `cityForMap` for map 01 obeys the same node-clearance and place rules as every other map (covered by the every-open-map tests below).
  - **Map origins:** `mapOrigin(id, bounds)` puts the centre of every open map's bounds within half a cell of its district's centre, and its whole bounds inside the district. Test this over every file in `puzzles/` and `puzzles/locked/`.
    - Origins are whole multiples of `CITY_BLOCK`.
    - A locked copy gets the same origin as its open map.
    - An id with no number gets an `n` from 65 to 128, and the same one every time.
  - **Neighbouring maps share streets:** for maps 07 and 08 (adjacent on the east spoke), and for 01 and 02 (the town square and the first east district), `cityCells` over the strip where their districts meet, in city units, is the same strip whichever map is open. The city does not depend on the map.
  - **Places:** `cityPlaces(puzzle)` gives exactly one place per lamp. Each place's centre is at least 0.6 units from every node, and no two places overlap. Test this over every open map.
  - **Filtering:** `cityForMap(puzzle, origin, rect)` returns no building whose centre is within 0.6 units of a node, and none that overlaps a place. Test this over every open map.
  - **Linking:** `linkBuildings(buildings, puzzle)` links a building to the nearest lamp within `CITY_LINK_R` and breaks ties by `nodes` order. Feeds, breakers, switches, junctions, fuseboxes and batteries never link.
  - **Glow:** `glowTarget(lampId, state, relight)`:
    - It is 1 for a lamp in `state.lit`.
    - It is 0 when the lamp is not lit, including every lamp during a brownout (use a brownout fixture).
    - During a Relight it is 0 before the lamp's `nodeArrive` and 1 after, using `planRelight` on the `08-shrine-circuit` won state in `render.test.ts`.
  - **Easing:** `easeGlow(current, target, dt)` reaches the target in `0.25` s and never overshoots. `dt` of 0 changes nothing.
  - **Contrast:** an unlit building fill and the street colour each have a WCAG contrast ratio of 1.6 or less against `BG`. The lit fill alpha is 0.35 or less and the halo alpha 0.2 or less.
  - Every existing `src/render/` test passes without edits, including `hitTestGeometry`'s. `npm run gate` is green, and the test count grows.
- [ ] **Renderer code:** `map-renderer.ts` draws the city as the first layer, through the same `Fit` (with 022's pan) as the circuit, using the offscreen cache above. `createMapRenderer` already has the puzzle, so it computes `mapOrigin(puzzle.id, puzzleBounds(puzzle))` once. The `MapRenderer` and `MapPanView` interfaces are unchanged, and `main.ts` is not touched.
- [ ] **Josh in the browser** (`npm run dev`):
  - **Looks:** on `01-first-light`, `18-battery-run` and `56-meet-in-the-middle`, a dim street grid with dark building footprints fills the window behind the circuit, with no labels. Every line, lamp, caption and fuse bar reads as clearly as before.
  - **One city:** different maps show different parts of the city. Reopening a map shows the same part. On `07`, drag the map left to look east, out along its avenue: the streets there are the ones you see when you open `08` and drag right. On `01`, the town square, there is no avenue band under the map. Drag in any direction, and the avenues start beyond its district's edge. On `02`, drag right to look west, back toward map 01's town square. A wider band with no buildings (the avenue) runs through every map's district except 01's. (Streets only: map 08's lamps and places belong to 08.)
  - **Moves with the map:** right-drag (022) and the city moves exactly with the circuit, with no edge showing. Home re-centres both.
  - **Lighting places:** on `01`, light the lamp. Its place, and the nearby buildings, warm up. Throw the breaker off and they go dark. Cause a brownout on `03-not-enough-for-all`: every place goes dark while it lasts.
  - **Relight:** win `08-shrine-circuit`. The places come on one by one as the cascade reaches each lamp.
  - **Unchanged:** hover text, throws and repairs land as before. Sound, notices and the win splash are unchanged.
  - **Performance:** on `56` in a large window, panning and the Relight stay smooth.

## Files
`src/render/` only: a new `city.ts`, `city.test.ts`, `map-renderer.ts`, and `index.ts` if anything is exported. Out of scope: `src/core/`, `src/grid/`, `src/play/`, `src/ui/`, `src/audio/`, `src/main.ts`, `puzzles/`, `index.html`, `package.json`.

## Order
After **022 A** merges, so the city is built on the pan-aware `Fit`, and after 022 B, so Josh can check that it moves with the map. The renderer agent can write `city.ts` and its tests in parallel with 022 B, because they share no files.

## Interfaces
**No schema or `src/core/` change.** A map's place in the city comes from its id, not from a field. `Puzzle` already carries `id`, `nodes` and `decor`, which is all this needs. In `src/render/city.ts`:
```ts
export const CITY_SEED = 0x5e57;    // the one city; changing it changes every map's backdrop
export const CITY_BLOCK = 2;        // map units per cell
export const CITY_STREET = 0.35;    // street width, map units
export const DISTRICT = 32;         // map units per district side (one map each)
export const HUB_R = 40;            // the hub at (0, 0): map 01's town square; avenues start here
export const SPOKES = 8;            // avenues every 45°, spoke 0 east, anticlockwise
export const SLOTS_PER_SPOKE = 8;   // maps 02.. in runs of 8 per spoke (k = n - 2); beyond 65 adds slots outward
export const R0 = 64;               // radius of each spoke's first district centre
export const CITY_AVENUE = 1.2;     // avenue width, map units
export const CITY_LINK_R = 1.6;
export const GLOW_EASE_SECONDS = 0.25;
export interface Building { x: number; y: number; w: number; h: number } // city units, axis-aligned
export interface Place extends Building { lamp: string }                 // map units
export interface Linked extends Building { lamp: string; strength: 0.5 }
export function ladderNumber(id: string): number | null;
export function districtOf(n: number): { spoke: number | null; slot: number | null; centre: { x: number; y: number } }; // n = 1: the hub
export function inHub(x: number, y: number): boolean;     // city units
export function onAvenue(x: number, y: number): boolean;  // city units
export function mapOrigin(id: string, bounds: Bounds): { x: number; y: number };   // city = map + origin
export function cityCells(rect: { minX: number; minY: number; maxX: number; maxY: number }): Building[];
export function cityPlaces(puzzle: Puzzle): Place[];
export function cityForMap(puzzle: Puzzle, origin: { x: number; y: number }, rect: { minX: number; minY: number; maxX: number; maxY: number }): Building[]; // map units, filtered
export function linkBuildings(buildings: readonly Building[], puzzle: Puzzle): Linked[];
export function glowTarget(lampId: string, state: GridState, relight: { t: number; arriveAt: number } | null): 0 | 1;
export function easeGlow(current: number, target: number, dt: number): number;
```
**No new dependencies, no image assets.**

**What a schema field would cost, if wanted later:** an optional `city: { spoke?: number, slot?: number } (or `hub: true`)` in `puzzles/SCHEMA.md` and `src/core/schema.ts`, plus a validator rule. That is one lead-architect ticket, then a renderer change to prefer it over the id. Every unlocked map file would need editing to use it, and locked maps would need Josh to replace them. This cut avoids all of that, because ladder order already gives each map a stable, neighbouring place.

## GDD check
Presentation only. "Win: every target lit, no brownout" and "Capacity: over it, brownout; nothing counts as lit" are only read, through `state.lit`. "The Relight can't be interrupted" holds: the city follows the cascade's own timing. No rules-coverage change.

## Josh's answers (relayed by the main session; not G1 approval)
1. Lamps to places: **one generic procedural placement per map** (a place beside each lamp), with no per-puzzle layout field.
2. Names: **footprints only**, no names or labels.
3. Art style: **dark shapes for now.**
4. **One shared city**, not a new town per map: a single city layout, and each map is a window onto one section of it.
5. Performance: **the 2 ms per frame budget is fine.**
6. Geography: "I think that the map should be a central hub and spoke." Cut as a central hub with 8 avenues, maps in ladder runs along them, easiest by the hub.
7. Hub: "map 1 should be town square". Map 01 sits on the hub. 02–64 run out along the 8 spokes, 8 per spoke and 7 on the last, easiest nearest the hub.

## Open questions
1. **The avenue runs under each spoke map's circuit** (not map 01's), because each district is centred on its spoke. It is low-contrast. If it competes with the wiring, the map can be offset half a district to one side of its avenue, which is a one-line change. Default as cut: centred on the avenue. Still unanswered.
