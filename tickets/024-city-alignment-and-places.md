# 024 · Streets under the wires; places that look like what is lit

owner: lead-architect (0), renderer (A1, A2), ui (B)
status: approved (G1, Josh, 29 Oct 2026: "yes merge and approve")
branch: one per part: `ticket/024-city-alignment-and-places-a1`, `-a2`, `-b` (part 0 is committed with the ticket on G1)

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

## Files
- **0 (lead-architect):** `src/core/words.ts` and `src/core/words.test.ts`, written at G1 before A2 and B start.
- **A1, A2 (renderer):** `src/render/` only (`city.ts`, `map-renderer.ts`, `index.ts`, tests).
- **B (ui):** `src/ui/` and **`src/main.ts`** (the overlay and `placeAt` wiring; a declared cross-folder edit).

Out of scope for every part: `src/grid/`, `src/play/`, `src/audio/`, `puzzles/`, `index.html`, `package.json`.

## Order
0. **022 and 023 merge first** (they are on the preview branch now). 024 replaces parts of 023, so it starts from `main` with 023 in.
1. **Part 0** (lead-architect), at G1.
2. **A1** (alignment), about a day.
3. **A2** (places, labels, highlight drawing, `placeAt`), about a day. It may start in parallel with A1 on its own branch, but it merges after A1, because both edit `city.ts` and placement must clear A1's lanes.
4. **B** after A2 merges.

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

## GDD check
Presentation only. Win, capacity and brownout are only read, through `state.lit`. The Relight timing is unchanged. `hitTest`, and so every throw and repair, is unchanged. No rules-coverage change.

## Open questions
1. **Avenues and the circuit (carried from 023):** cut so the avenue **stops at the map's edge** and meets the feed's lane, so no avenue runs under the wiring and the power visibly arrives from the avenue. The alternatives are to keep it running under the circuit (as in the preview) or to offset each map half a district beside its avenue.
2. **Labels:** you said "no labels" for 023, and this feedback asks for places that match what's lit. Cut with small, dim labels on **targets only**, the same words as the list. Labels on every lamp? Or no labels at all, relying on the shapes plus the hover link?
3. **Shapes by kind:** are the ten kinds and their footprints right (sacred, water, mill, gate, work, market, hall, homes, home, street light)? Should anything else be told apart, e.g. chapel vs shrine, bakery vs forge?
4. **Non-target lamps:** cut so they show their own kind's footprint (a `mill` that isn't a target still looks like a mill), with no label. Or should non-targets all be plain homes or streetlights, so only targets stand out?
5. **Neighbouring maps' lanes:** when you pan into the next district, it shows the plain city grid, not that map's own wiring lanes. Showing them needs main.ts to hand the renderer the neighbours' puzzles, a small follow-up ticket. Wanted?
