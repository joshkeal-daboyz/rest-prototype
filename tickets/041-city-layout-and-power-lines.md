# 041 · The 3D view gets a real town: streets with kerbs, buildings in rows at one scale, and power lines that read as power lines

owner: renderer
status: approved (G1, Josh, 17 Nov 2026: "Approve A, B, C"; every open-question default applies). Sections build in order A, B, C, each its own branch, review and playtest. Section A: building.
branch: `ticket/041-city-layout-and-power-lines` (one branch per section: `-a`, `-b`, `-c`)

## Josh's words (17 Nov 2026, after playing the 3D view on `main`)
> "I would like to adjust how the powerlines are layed out. Currently they are just lines and they don't look like "power lines". The city is a collection of buildings and they don't look like persist within a proper city layout. The buildings are also scaled variably. I can see the same building copied and pasted multiple times and scaled at different sized. We need to have city buildings, streets... etc."

## What the code on `main` does today (findings, checked against `a565439`)
- **Wires.** `wireLayout` (`src/render3d/layout.ts`) strings one `TubeGeometry` per line (radius `WIRE_RADIUS` 0.05) from node `pos` to node `pos` at `POLE_HEIGHT` 1.6, with poles spaced evenly at most `POLE_SPACING` 2 apart and a sag of `SAG_RATIO` 0.12 of each span (Josh approved 12% in 037 C-Q2). Each intermediate pole is a cylinder with one cross-arm. When models load, `applyModels` picks **either** `SM_Prop_Powerpole_01` or `SM_Prop_Powerpole_Single_01` per pole by hash, so two pole styles are mixed. There's one conductor, no insulators, no transformer, and no drop to any building.
- **Streets.** `scene.ts` draws `circuitStreets(puzzle).lanes` and `feedLanes` (2D's lanes, 0.5 wide) as flat dark strips. There's no ring road, no kerb, no pavement, no junction and no street beyond the circuit.
- **Buildings.** `blockLayout` takes `footprintLayout`'s lots and `cityForMap`'s lots. These are 2D backdrop lots on a 2-unit `CITY_BLOCK` grid, split by hash into wholes, halves and quarters with no relation to any street. `fitBuilding` / `modelScale` (039) then **shrink each model to its lot** (aspect kept, a quarter turn allowed), and `stableHash` picks the model. That's exactly what Josh saw: the same nine SIMPLE Town models at many sizes, turned at random, with no street frontage. Inside the footprint, `FOOTPRINT_MAX_H` 1.4 keeps boxes below the wires.
- **Scale.** `WORLD_PER_METRE` = 0.18, so 1 map unit is about 5.6 m. Nodes are 1 to 2 units apart (lamps fanned 1 unit apart, every map has diagonal lines, the shortest line on the ladder is 1.0). At true scale, a 10 m shop is 1.8 units and a 6 m road is 1.1. So **not every circuit line can be a full street**: parallel lamp spurs 1 unit apart can't each carry a road.
- **Camera.** It looks from the south at `ELEVATION` 45° with `FOV_DEG` 40. So the top-of-screen rays drop at about 25°, and a building south of a wire hides the wire when it is taller than the wire by more than about 0.47 × its distance.
- **What exists in the local manifest** (`assets/private/out/manifest.json`, 17 Nov 2026; sizes in metres, w × h × d):
  - *SIMPLE Town buildings:* `Building_Shop_01..05`, `Building_BaberShop`, `Building_Gym`, `Building_CoffeeShop` (about 10.5 × 11 × 10 to 13), `store_small_mesh` and `store_corner_mesh` (about 11 × 6.7 × 8 to 11), `apartment_small_mesh` and `apartment_large_mesh` (11.6 × 12 / 16.7 × 11.8), `house_mesh` (11.8 × 8.5 × 13.4), `Building_House_01..04` (10.6 × 14.5 × 18.5), `_09..011` (14.2 × 10.1 × 16.1), `_012..015` (15.9 × 10.9 × 14.8), `_05..08` (19.6 × 16 × 25.7), `Building_Garage_01..03` (12.4 × 11.6 × 14.7), `office_small/medium/large_mesh` (13.6 × 12.8 / 20 / 27.2 × 15.2), `office_stepped_mesh`, `Building_AutoRepair`, `Building_StripClub`, `Building_PoliceStation` and `Building_PetrolStation` (21 to 24 wide, 8 to 11 high), `town_hall_mesh` (`texture-guessed`), `Building_Cinema` (31 × 27), and `Building_Mall_A/B` (46 × 43).
  - *POLYGON Apocalypse buildings* (`SM_Bld_Apartment_01`, `_Cafe_01`, `_Church_01`, `_Commercial_Large_01`): a different, ruined art style.
  - *Roads:* SIMPLE Town `road_straight_mesh`, `road_t_mesh`, `road_corner_mesh`, `road_crossing_center_mesh` and `path_*`; Apocalypse `SM_Env_Road_*` 5 × 5 m tiles. All of them are axis-aligned grid tiles.
  - *Props:* trees, bins, hydrants, dumpsters, hedges, fences, traffic lights, benches, parked cars and vans.
  - *Power:* `SM_Prop_Powerpole_01` (6.3 m, cross-arm 2.6 m), `SM_Prop_Powerpole_Single_01`, `SM_Prop_Transformer_01/02` (2 to 3 m **ground** boxes), `SM_Prop_PowerBoxes_01/02` (wall boxes).
  - **Not in the manifest:** a pole-mounted transformer can, separate insulators, and diagonal or arbitrary-angle road pieces.

## Goal
Josh opens `npm run dev` with `?puzzle=09-shrine-circuit&view=3d` and sees a town. The circuit's streets are asphalt roads with kerbs and pavements that meet at junctions. A ring road and a grid of city blocks surround the circuit. Buildings stand in rows along every street at one consistent scale, set back the same distance, each facing its road, and no model sits next to a copy of itself. The power lines are wooden poles of one style on the pavement, each carrying three conductors on insulators on a cross-arm. The conductors sag gently, transformer cans hang on some poles, and drop wires run into the houses beside them. The shrine and the other places still warm when lit and keep their captions. Everything plays exactly as before. With no `assets/private/`, the same town is built from placeholder buildings that look like buildings.

## The design (defaults; the real choices are the open questions)

### Section A: the town layout, pure (`src/render3d/town.ts`, new)
`townLayout(puzzle): Town` is pure and deterministic, with no three and no DOM. World units equal map units, and `WORLD_PER_METRE` stays 0.18. It **replaces `footprintLayout` and `cityForMap` in 3D only**: 2D is untouched. From `src/render/city.ts` it imports only `stableHash`, `slotKind` and `GATE_POST`, by file, and `placeKind`/`placeName` from `src/core`.

1. **Streets follow the circuit.**
   - Every line at least `STREET_MIN_LEN` (2.5) long is a street. Its road (`ROAD_W` 1.1, about 6 m) runs **beside** the wire, not under it. The road's near kerb is `KERB_OFFSET` 0.4 from the line, so the wire, its poles and its node objects stand on the pavement, as real distribution lines do.
   - **Side rule:** the road goes on the side of the line's normal that points toward +z (toward the camera). A line parallel to z puts its road on +x. If that road would cover any node's `NODE_SQUARE` other than its own two end nodes, it takes the other side. If both sides are blocked, the line gets no road.
   - Shorter lines (lamp spurs, short links) are **service runs**: pavement only, with no road.
   - Decor segments and `feedLanes` become streets by the same rules.
2. **Junctions.** Where two or more roads end at the same node, or where a road meets the ring road or the grid, a junction pad covers their ends: the convex hull of the end edges. Kerbs (`KERB_H` 0.03, pale) run along both edges of every road and are clipped wherever they fall inside another road or a pad. A pavement band (`PAVE_W` 0.45) runs outside each kerb.
3. **Ring road and city blocks.**
   - A ring road runs at `RING_MARGIN` 4 outside `puzzleBounds`. This is 3D only: 2D's `FOOTPRINT_MARGIN` 2 and the camera's framing are unchanged.
   - Outside the ring, an orthogonal grid of streets at `BLOCK_PITCH` 9 (about 50 m) forms one ring of rectangular city blocks, `OUTER_RINGS` = 1. The grid lines are spaced evenly between the ring's corners, so each block side is between 7 and 11.
   - The town's window is the ring plus that one ring of blocks.
4. **Lots are sized to buildings, not the reverse.**
   - A small table `LOT_TYPES` gives sizes in metres: frontage × depth, and a height cap.
     - `small`: 12 × 13, at most 12 high;
     - `house`: 16 × 19, at most 15;
     - `large`: 25 × 28, at most 16;
     - `tall`: 14 × 16, at most 28 (outside the ring only).
   - A lot is exactly its type's size × `WORLD_PER_METRE`, nothing else.
   - **Frontage fill.** Lots are filled along every road side in a fixed order: ring road, then grid, then circuit streets in file order, then decor. Each lot's front edge lies on the pavement's outer edge plus `SETBACK` 0.15, and its yaw makes its front face the road.
   - At each step, the lot type is chosen by `stableHash` of the road side and slot index, from the types allowed there. A lot is kept only if it clears all of these:
     - every road, pad and pavement;
     - every other lot, by `LOT_GAP` 0.1;
     - every node's `NODE_SQUARE` and every place;
     - every wire span, by `WIRE_CLEAR` 0.25 horizontally;
     - the **occlusion rule:** for every wire point, node top and lamp head north of the lot, the distance must be at least (lot height cap − point height) × `OCCLUDE_SLOPE`. `OCCLUDE_SLOPE` is 1 / tan(`ELEVATION` − `FOV_DEG`/2), about 2.14. It's held in `town.ts` with a drift test against `camera.ts`.
   - If no type fits, the cursor moves on by `FILL_STEP` 0.25.
   - Corners: a lot that clears one road may not stick into another.
   - What frontage fill can't use (deep block interiors, odd scraps by the circuit) is yard ground.
   - Result: the outer blocks are built up in rows, and inside the ring buildings line the streets but stay low or set back near wires. This replaces `FOOTPRINT_MAX_H`.
5. **Places.**
   - Each lamp still has one place, in `nodes` order, with today's `slotKind` and label (`placeName` for a target lamp, null otherwise).
   - Places are placed **before** ordinary lots, at fixed scale:
     - `whole`: 10 × 10 m;
     - `quarter`: 6 × 6 m;
     - `row3`: three 6 × 8 m homes side by side along the frontage;
     - `gate`: two `GATE_POST` posts beside the wire, as in 2D;
     - each 2 storeys high.
   - Each place takes the nearest frontage slot to its lamp, within `PLACE_REACH` 2.5, that clears the rules above and lies nearer its own lamp than any other lamp. Otherwise it becomes a pool (as 2D).
   - A place may sit a little apart from where 2D draws it; it keeps its look: a box that warms when lit, plus its caption.

### Section B: the scene draws the town, at one scale (`scene.ts`, `models.ts`, `models3d.ts`, new `placeholders.ts`)
1. **Ground and streets.** The scene draws:
   - roads, kerbs, pavements and pads from `Town`, in code: dark asphalt, pale kerb lips and a mid-grey pavement, plus a dashed centre line on roads wider than 1, ring and grid only;
   - yards as dark ground.
   These replace the 2D lanes in 3D.
2. **One scale.**
   - `modelScale(entry, "building")` is `WORLD_PER_METRE`, always. `fitBuilding`, `buildingYaw` and the `lot` parameter go.
   - Each building row in `MODEL_TABLE` gains `front` (yaw that turns the model's front to local +z; default 0, Josh can edit).
   - `lotTypeOf(entry, front)` gives the smallest `LOT_TYPES` entry that holds the model's front-facing footprint and height, or null (not used).
   - A clone's yaw is `lot.yaw + front`.
3. **Which models.** The building rows are SIMPLE Town only, for one art style:
   - `small`: `Building_Shop_01..05`, `Building_BaberShop`, `Building_Gym`, `Building_CoffeeShop`, `store_small_mesh`, `store_corner_mesh`, `apartment_small_mesh`, `house_mesh`;
   - `house`: `Building_House_01..04`, `_09..015`, `Building_Garage_01..03`, `office_small_mesh`;
   - `large`: `Building_House_05..08`, `Building_AutoRepair`, `Building_StripClub`, `Building_PoliceStation`, `Building_PetrolStation`, `office_stepped_mesh`;
   - `tall`: `apartment_large_mesh`, `office_medium_mesh`, `office_large_mesh`.
   - Not used: `Building_Cinema` and `Building_Mall_A/B` (too big for a 50 m block), `town_hall_mesh` (`texture-guessed`), and every Apocalypse building.
   - The builder confirms each type assignment from the manifest's bounds (the table above is computed, not hand-set) and names any model that lands in a different type.
4. **No copy beside itself.** `pickBuildings(lots, plan)` (pure, `models.ts`) gives each lot a model of its type by `stableHash(lot.key)`. If a neighbour already placed within `NEIGHBOUR_GAP` 0.5 has the same model, it takes the next model in the list. With three or more models of a type, no two neighbours match.
5. **Placeholders that look like buildings** (no GLB, or a type with no usable model). `placeholderBuilding(lot)` gives:
   - a body whose footprint is the lot × {0.8, 0.9} (by hash) in each direction;
   - storeys by type at `STOREY_M` 3.2: small 1 to 3, house 2 to 4 with a pitched roof, large 1 to 2 flat, tall 5 to 8 flat, never over the cap;
   - a darker roof cap or parapet;
   - one of four dark tints.
   It's instanced per variant. Neighbours follow the same rule as models. Nothing is lit (only places warm).
6. **Places** keep today's material, warm emissive, captions and the glow easing. Only their boxes come from `Town`.

### Section C: power lines that read as power lines (`layout.ts`, `scene.ts`, `models.ts`, `models3d.ts`)
1. **Spacing and sag.** `POLE_SPACING` goes from 2 to 3 (about 17 m), with poles still even along each run. `SAG_RATIO` goes from 0.12 to 0.04, see Q5.
2. **Three conductors per run.**
   - `WireRun.conductors: Vec3[][]` holds three polylines. At each intermediate pole they sit at −`PHASE_OFFSET`, 0 and +`PHASE_OFFSET` (0.22) along the cross-arm, which runs across the run, at `POLE_HEIGHT`.
   - All three start and end at the run's own node attachment points, which are unchanged. They fan out over the first span and back in over the last, as at a dead-end.
   - A run with no intermediate pole draws one conductor.
   - The centre conductor is today's `spans`, so `mid`, the bead, the Relight's front and the pick line are the same geometry as the run.
   - Conductor radius `WIRE_RADIUS` goes from 0.05 to 0.03. All three take the line's look (live, dead, faulted, repaired, hover and the Relight) from the same material.
3. **The break.** A damaged cable cuts **all three** conductors in the same span (`brk` per conductor, same `span`). Their ends hang as in 037 C2, and there's one spark at the gap. The shadows become one strip per conductor; a broken run shows its halves' strips.
4. **Pole hardware.**
   - The pole model is one style only: `MODEL_TABLE` pole = `["SM_Prop_Powerpole_01"]`; `_Single_01` goes.
   - The placeholder pole gets a cross-arm at least 2 × `PHASE_OFFSET` + 0.1 long.
   - An insulator (code-drawn, instanced, pale glazed grey-green) sits under each conductor's attachment on every intermediate pole: three per pole.
   - Junction, breaker, fuse box and switch objects keep their own code-drawn posts, as 039's open question 3 decided.
5. **Transformer cans and drops.**
   - `dropLayout(town, runs)` (pure, `layout.ts`) gives one **service drop** to each building (not a place) whose front lies within `DROP_REACH` 2 of an intermediate pole on a run beside its street. The drop runs from that pole at `POLE_HEIGHT` − 0.2 to the middle of the building's front at 0.5 high, or ⅔ of the building's height if that is lower. A drop whose ground line crosses another lot is skipped.
   - A pole with at least one drop carries a code-drawn transformer can: a grey cylinder 0.12 across, under the arm.
   - Drops are thin (0.012), always dull, never pick targets, and have no state look. They are scenery.
6. **Picking.** `WIRE_PICK_RADIUS` is at least `PHASE_OFFSET` + `WIRE_RADIUS` + 0.03, so clicking any of the three conductors picks the line. Node priority is unchanged.

**Wires stay decorative.** No length, height, pole or drop reaches `src/grid/`, `src/play/` or the HUD. Every gameplay number and every playtest snapshot is unchanged.

## Order and size
**A, then B, then C.** Each is a separate build, review and playtest, like 037's sections.
- **A** (about 1 day) is the core: the street and lot algorithm and its tests. Josh can't see it on its own.
- **B** (about 1 day) is the visible half of the bigger win: streets, blocks and one scale. Josh's first browser check is here.
- **C** (about ¾ day) is independent of B except for the drops, which need A's lots.

A plus B is the bigger win: they answer two of Josh's three complaints, the city layout and the scaling. If Josh wants the quickest visible change, C1 to C4 (spacing, sag, conductors, hardware) can go before A and B, with drops (C5) held until A lands.

## Acceptance criteria

### Section A (Vitest, `src/render3d/town.test.ts`, no WebGL, no DOM)
- [ ] **Pure.** `town.ts` imports only from `src/core`, `../render/city` (by file) and `./layout`. A test reads its import lines and finds nothing from `three`, `src/grid`, `src/play`, `src/ui` or `../render/index`.
- [ ] **Deterministic.** `townLayout` on a freshly loaded copy of the same puzzle gives deep-equal output.
- [ ] **Every map.** For every `puzzles/*.json` and `puzzles/lamp-row.grid.json` (loaded with `loadPuzzle`), `townLayout` returns without throwing, and all of them together take under 3 s. Every criterion below is checked on every map.
- [ ] **Streets beside the wires.**
  - Each line of length ≥ `STREET_MIN_LEN` has exactly one road, or none when both sides are blocked; the test lists those lines per map.
  - Each road is parallel to its line, and its near edge is `KERB_OFFSET` from the line on the side the rule gives (within 1e-6).
  - No road, pad or kerb covers any node's `NODE_SQUARE`, apart from a pavement under its own nodes.
  - Shorter lines have no road.
  - The ring road and the grid streets exist, and every feed's lane reaches the ring.
- [ ] **Junctions and kerbs.** Every node where two or more roads end has a pad that contains each of those roads' end edges. No kerb segment lies inside another road or a pad.
- [ ] **Lots.**
  - Every lot's frontage × depth is exactly one `LOT_TYPES` size × `WORLD_PER_METRE`.
  - Its front edge is parallel to a road side and at that side's pavement edge plus `SETBACK` (within 1e-6), and its yaw faces that road.
  - It overlaps no road, pad, pavement, node square, place or other lot (`LOT_GAP` kept).
  - It is at least `WIRE_CLEAR` from every wire span point and meets the occlusion rule against every wire point, node top and lamp head.
  - `tall` lots lie outside the ring.
- [ ] **Built up.** In every outer block, lots cover at least 60% of the block's frontage length.
- [ ] **Places.**
  - There is one place per lamp, in `nodes` order, with its lamp id, `slotKind` and today's label.
  - Every non-pool part is within `PLACE_REACH` of its lamp and nearer it than any other lamp, and clears the lot rules.
  - No map has more pool places than 2D's `footprintLayout(...).places` has (the test computes both).
  - On `09-shrine-circuit`, the shrine and the flood are not pools.
  - If a map fails this, the builder reports it and asks for a re-cut instead of loosening the criterion.
- [ ] **Drift guard.** `OCCLUDE_SLOPE` equals 1 / tan(`ELEVATION` − `FOV_DEG`/2) read from `camera.ts`.
- [ ] **Old tests.** `layout.test.ts`'s `blockLayout` and footprint-height tests are replaced by these. The builder names each removed test in the report.

### Section B (Vitest without WebGL, except the two marked "Josh checks")
- [ ] **One scale.** `modelScale(entry, "building")` is `WORLD_PER_METRE` for every fixture. `lotTypeOf` puts a 10 × 11 × 10 m fixture in `small`, an 11.6 × 16.7 × 11.8 m one in `tall`, and a 46 × 10 × 43 m one in null.
- [ ] **Every building fits its lot at that scale.** With a fake model set covering every type, `applyModels` on every map gives each building clone scale `WORLD_PER_METRE` on all axes and yaw `lot.yaw + front`. Its scaled, rotated bounds lie inside its lot.
- [ ] **No copy beside itself.** On every map, no two lots within `NEIGHBOUR_GAP` share a model when their type has three or more. The same holds for placeholder variants. `pickBuildings` is deterministic.
- [ ] **Placeholders.** With no models, every lot has a placeholder whose footprint lies inside the lot and whose height is storeys × `STOREY_M` × `WORLD_PER_METRE`, never over the cap. Every place is its own warm-able mesh, as now.
- [ ] **Streets drawn.** The scene has one mesh, or one instance, per road, pad and kerb segment in `Town`. The 2D lanes are no longer drawn in 3D.
- [ ] **Nothing hides the circuit.** At the opening camera pose (1280 × 720, the main session's insets), a ray to every node's pick point and to every wire's `mid` meets no building or place mesh before its target. The 037 picker tests pass unchanged.
- [ ] **Josh checks:** `npm run dev`, `/?puzzle=09-shrine-circuit&view=3d`, with the packs converted.
  - Roads with kerbs and pavements follow the circuit and meet at junctions, inside a ring road and a grid of blocks.
  - Buildings stand in rows facing the streets, all at one scale, with no model next to a copy of itself.
  - The shrine is recognisable and warms when lit.
  - The three-move solve, captions, brownout and Relight work as before.
  - Then the same on `/?puzzle=56-whole-ward&view=3d`, the largest map.
- [ ] **Josh checks:** rename `assets/private/out` and reload. The same town shows in placeholder buildings that read as buildings (storeys and roofs, not stretched boxes), with one console info line and no error.

### Section C (Vitest, `layout.test.ts`, `scene.test.ts`, `pick.test.ts`, no WebGL)
- [ ] **Conductors.**
  - A run with an intermediate pole has three conductors, and they start and end at its node attachment points, which are unchanged from `main`.
  - At each intermediate pole the conductors are at −`PHASE_OFFSET`, 0 and +`PHASE_OFFSET` across the run, at `POLE_HEIGHT`.
  - The centre conductor equals `spans` joined.
  - A run with no intermediate pole has one conductor.
  - No point is below ground.
- [ ] **Spacing and sag.** No two poles on a run are more than `POLE_SPACING` apart. Each span sags `SAG_RATIO` × its length at mid-span (within 1e-6).
- [ ] **The break.** On `l_b`, every conductor is cut in the same span, with ends drooping `HANG_DROP` and the gap `BREAK_GAP`. There's one spark, and each half's shadows show only while it sparks.
- [ ] **Old tests.** The 037 C break tests are updated to the new spacing and sag; the builder names each changed expectation.
- [ ] **Hardware.** There are three insulators per intermediate pole, at the conductors' attachment points. With a fake model set, every intermediate pole is the one pole model.
- [ ] **Drops.**
  - `dropLayout` is deterministic.
  - Every drop starts at an intermediate pole carrying a can, ends on its building's front face, is no longer than `DROP_REACH` across the ground, and crosses no other lot.
  - No drop goes to a place.
  - Drops and cans are not pick targets (`raycast` off).
- [ ] **One look per line.** In the shrine circuit's start state, after `sw_1`, after `repair:l_b` and after `br_street`, all three conductors of each line show the same look as the line. Live still differs from dead by more than colour (the GDD's accessibility rule, as 037 tested it).
- [ ] **Picking.** `WIRE_PICK_RADIUS` ≥ `PHASE_OFFSET` + `WIRE_RADIUS` + 0.03. At the projected middle of each outer conductor of `l_b`, `hitTest` returns `"l_b"`. Node picks still win over wires.
- [ ] **Josh checks:** `/?puzzle=09-shrine-circuit&view=3d`.
  - The lines read as power lines: one pole style, three conductors on insulators, gentle sag, cans and drops into the houses.
  - The cut on `l_b` is visible, and clicking any conductor repairs it.
  - The Relight runs along all three conductors.
  - Then the same on `56-whole-ward`.

### Nothing else moves (the main session checks, every section)
- [ ] `npm run gate` is green and the test count grew. `npm run playtest` is green with no snapshot change.
- [ ] `git diff main -- src/render/ src/core/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts tests/ puzzles/ tools/ package.json public/ index.html` is empty, and `git ls-files assets/private` is empty.
- [ ] With the packs present, `npm run build` puts no `.glb`, no `manifest.json` and no path containing `private` in `dist/` (039's check, rerun).

## Files
- **May touch (`src/render3d/` only):**
  - A: new `town.ts` and `town.test.ts`; `layout.ts` (remove `blockLayout`, `Block`/`PlaceBlock` if `Town` replaces them, `CITY_WINDOW`, `FOOTPRINT_MAX_H`, the `BLOCK_*`/`PLACE_*` heights) and `layout.test.ts`.
  - B: `scene.ts`, `models.ts`, `models3d.ts`, new `placeholders.ts`, their tests, and `live.test.ts` where it counts blocks.
  - C: `layout.ts`, `scene.ts`, `models.ts`, `models3d.ts`, `pick.ts` only if the radius needs more than the constant, and their tests.
- **Must not touch:** `src/render/` (import by file only: `stableHash`, `slotKind`, `GATE_POST`, and what 037 already imports), `src/core/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`, `camera.ts` (read only, for the drift test), `tests/`, `puzzles/`, `tools/`, `assets/`, `package.json`, `vite.config.ts`, `index.html` and `public/`. If the builder needs any of them, it stops and asks for a re-cut.
- **Docs that conflict:**
  - 039's open question 1 ("shrunk to their lot") is superseded by Josh's words above.
  - 037 C-Q2 (sag 12%, wire radius 0.05, `FOOTPRINT_MAX_H` 1.4) is changed only if Josh agrees in Q5 and Q6.
  - The brief's `src/render3d/` row ("streets, blocks, poles and wires") still holds.

## Interfaces
- **No `src/core/` change and no schema change.** The circuit's geometry still comes from `nodes[].pos` and `lines`; locked puzzles are untouched.
- **No new dependency.** Three is approved (037), and convex hulls and box overlap tests are written by hand in `town.ts`.
- **Local to `src/render3d/`** (the builder writes them):
  - `town.ts`: `Town { roads, kerbs, pavements, pads, blocks, lots, places, window }`, `Road`, `Pad`, `LotType`, `LOT_TYPES`, `Lot { x, z, w, d, yaw, type, hMax, key, street }`, `PlaceLot`, and the constants named above.
  - `layout.ts`: `WireRun.conductors` and the per-conductor `brk`, `Drop`, `dropLayout`, `PHASE_OFFSET`, `DROP_REACH`.
  - `models.ts`: `ModelChoice.front?`, `lotTypeOf`, `pickBuildings`.
  - `placeholders.ts`: `placeholderBuilding`.
  - `SceneBundle.slots.blocks` becomes the lot list.

## Open questions for Josh (defaults apply if you just approve)
1. **Road beside the wire, or under it.** Default: beside, so poles and node objects stand on the pavement and the road is on the camera side. The alternative, a road centred on the line, joins more cleanly at junctions but puts poles in the middle of the road.
2. **The 3D town no longer matches the 2D backdrop.** Default: yes, 3D builds its own streets and lots, so the 2D view is untouched, and places may sit a little apart from where 2D draws them. The alternative is to keep 2D's lots and only fix scale; that can't give street rows.
3. **Scale.** Default: `WORLD_PER_METRE` stays 0.18, and poles and lamp posts stay fitted to `POLE_HEIGHT` 1.6 (about 9 m at building scale). The cost: inside the ring the circuit is dense, so buildings there are sparse and low, and most of the city is in the blocks round it.
4. **Which buildings.** Default: SIMPLE Town only, one toy-like style. Cinema, the malls, the town hall and all Apocalypse buildings are left out. The alternative is to mix in Apocalypse's ruined `SM_Bld_*` for a dying-town feel.
5. **Sag and wire weight.** Default: sag 4% and conductors 0.03 thick. This reverses your 037 C-Q2 12% sag, because heavy sag on short spans is part of why the wires read as "lines". The alternative: keep 12% and 0.05.
6. **Conductors and spacing.** Default: three conductors and poles at most 3 apart. The alternatives: one conductor plus a dull neutral below it, or keep spacing 2.
7. **Roads in code or from GLB tiles.** Default: code-drawn everywhere, because the circuit's streets run at any angle and the packs' road tiles are 5 m grid pieces. Later, the axis-aligned ring and grid roads could use `road_straight_mesh` / `road_t_mesh`.
8. **Street furniture.** Default: out of this ticket. A follow-up could add trees, bins, hydrants, traffic lights at grid junctions and parked cars, all of which are already in the manifest.
9. **Missing assets.** There is no pole-mounted transformer can or separate insulator in either pack, so both are code-drawn. If you want models, commission the `asset-scout` agent for a pole-top transformer and insulator set.
10. **Places' look.** Default: unchanged, a warm box plus its caption, at fixed scale. Per-kind shapes (a spire for the shrine, a bell tower) would be a small later section.
11. **Order.** Default: A, B, C. Say if you'd rather have C1 to C4 first, for the quickest visible change.
12. **Decided rules.** None touched; this is visual only. There's no `rules-coverage.md` change, and the accessibility rule (live differs by more than colour) is re-checked in C.

## Within approved scope?
**Yes.**
- The work is all in `src/render3d/`: no dependency, no schema, no `src/core/` type, and no edit to `src/render/`, `main.ts`, `tests/` or `puzzles/`.
- It reverses two looks you approved before: 039's shrink-to-lot, which your words above ask to undo, and 037 C-Q2's sag and heights, which change only on your word in Q5.
- Each section starts only on your G1.
