# 055 · A tile-street city: City Pack road tiles on a 90 degree street grid, with parking, judged without any puzzle

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: approved (G1, Josh, 18 Nov 2026: "I approve", after seeing the ticket and its open-question defaults; every default applies). Sections in order A, then B and C (may run in parallel), then E (integration, added 18 Nov 2026 after A, B and C were built), then D.
- **Section E approved** (G1, Josh, 18 Nov 2026, in chat, relayed by the main session: "I approve one through three"). Item 2 of that approval is section E, with Q8 and Q9 at their defaults. Items 1 and 3 are the merge of A, B and C into `goal/city-style`, and ticket 056.
- **Ticket 056** (parking rules, approved in the same words) changes criteria 4, 11, 23, 26, 27, 28, 31 and D's T6 once 056 A merges. Each change is marked "From 056" where it applies.
- **Section F** (door sills, added 18 Nov 2026 on Josh's direction: "That's going to have to be a variable that we measure for each individual building") is **approved** (G1, Josh, 18 Nov 2026, in chat, relayed by the main session: "Approved and confirmed"), with Q10 to Q13 at their defaults. It builds after E.

Built on `goal/city-style`, which Josh has not merged to main yet.
branch: one per section: `ticket/055a-tile-grid`, `ticket/055b-tile-lots`, `ticket/055c-tile-draw`, `ticket/055e-tile-integrate`, `ticket/055d-tile-checks`, `ticket/055f-door-sills`

## Josh's words (18 Nov 2026, in chat)
> 1. "In order for those tiles to work we are going to have to fix the power lines. Currently, the powerline puzzles define the map structure and distort the style of the city in such a way that the city pack doesnt allow. Maybe in the future, we could fix the city to accommodate for all roads that aren't 90*, but for now the map packs don't support that."
> 2. "Build out the use of the road tiles first. If you don't have that built out without the power lines in place, you won't be able to test and verify that things look right when they are placed on the map. You're going to have to figure out a way to integrate things like parking lots into the map as well or else it will feel. A city with no place to park is strange."
> 3. "The puzzles are going to have to be rebuilt in order to conform to the new style. These puzzles were built to demonstrate a skill. They aren't the final puzzles anyway. We can start with 10 puzzles and move from there."
> 4. "There are also models inside the city pack to showcase power lines."

**This ticket is item 2 only**: a city of City Pack road tiles on a 90 degree grid, with parking, built and judged with no puzzle in it. Not in this ticket (each a later ticket): moving the circuit onto an orthogonal grid and stringing power lines along the tile streets (items 1 and 4); the ten new puzzles (item 3, a puzzle-designer job).

## Findings (checked 18 Nov 2026 against `goal/city-style` at `570d408` and the converted manifest `D:\rest-prototype-main\assets\private\out\manifest.json`; no browser)
1. **Today's streets follow the wires.** `town.ts` lays a road beside every line of at least `STREET_MIN_LEN`, plus the ring and the block grid (041). The main session counted 419 of 1127 lines diagonal on the 65 ladder maps and 52 maps with fractional node positions; no map is fully axis-aligned. Chapter 10's Default (042 Q7) lays straight tiles at any angle and code-draws odd-angled pads; 042 C was never built.
2. **The City Pack's ground kit is all 5 m squares** (`city-pack`, `scale: 100`; size x by y by z, metres, every pivot centred, min y 0):
   - roads, 0 thick: `SM_Env_Road_01/02/03`, `_Bare_01`, `_Lines_01/02`, `_YellowLines_01/02`, `_Crossing_01`, `_Arrow_01/02`, `_Median_01/02` (5 x 5); `_ParkingLines_01` (**10 x 5**, already used by 052 C); `_Patch_01` (1.8 x 1.8 decal).
   - pavements: `SM_Env_Sidewalk_Straight_01/02`, `_Corner_01/02`, `_Dip_01`, `_Dip_Corner_01`, `_Grate_01`, `_Panel_01` (5 x **0.30** x 5); `_Grate_02` (0.11 high), `_Panel_02` (0.09, 052 C's plaza panel), `_01` (0.03), `_Gutter_01` (1.20), `_Merger_01` (10 x 0.30 x 5), `_Construction_01` (10 x 1.17 x 5).
   - paths: `SM_Env_Path_*` (2.5 to 5 m), `SM_Env_GrassPath_*` and `SM_Env_Grass_01` (5 x 5); `SM_Env_Street_Divider_01/02` (1.3 x 5, 1.2 x 2.8).
   - **No corner, T or cross road piece and no separate kerb.** A junction is composed of square tiles; the kerb is part of the 0.30 m sidewalk tile.
   - Which edge of a sidewalk tile carries the kerb, which way a lane tile's lines run, and whether `_Dip_*` is a kerb ramp cannot be read from bounds. They are confirmed by eye (section C's tile sheet).
3. **Parking pieces.** City Pack: `SM_Env_Road_ParkingLines_01` (10 x 5), `SM_Prop_ParkingMeter_01/02`, `SM_Prop_Sign_Parking_01`, `SM_Prop_Barrier_01`, `SM_Prop_Cone_01/02`. **No garage or parking structure** in the City Pack. SIMPLE Town has `Building_Garage_01..03` (12.4 x 11.6 x 14.7 m, the old style, chapter 13); Town Pack has house garage parts only. Town Pack also has `SM_Env_Sidewalk_Driveway_01` and `_Driveway_Wide_01` (5 x 0.30 x 5), true kerb cuts, but in another pack's atlas.
4. **Vehicles.** City Pack `SM_Veh_Car_*` read 206 to 247 x 149 to 258 x 408 to 564 in the manifest: about **100 times too big** (the pack's `scale: 100` applied to models already in metres). Parked cars from this pack need a per-model scale fix (ticket 040's mechanism) before anything else. They are in `CITY_NEVER_USED` today (16.6).
5. **Power-line models in the City Pack** (Josh's item 4; checked by the architect, city-pack entries only):

   | Model | Size, m (x, y, z) | Whole or modular |
   | --- | --- | --- |
   | `SM_Prop_Power_Cables_01` | 12.45 x 0.74 x 1.49 | whole: one fixed span, its conductors spread 1.49 m across, 0.74 m of sag |
   | `SM_Prop_Power_Cables_02` | 6.36 x 0.40 x 1.49 | whole: a half span |
   | `SM_Prop_Power_Cables_03` | 0.06 x 0.61 x 13.49 | whole: one strand, 13.49 m along z |
   | `SM_Prop_LightPole_Base_01` | 0.35 x 6.48 x 2.48 | modular: a 6.5 m pole (with a stub along z) |
   | `SM_Prop_LightPole_Base_02` | 1.10 x 4.95 x 0.41 | modular: a shorter base |
   | `SM_Prop_LightPole_Arm_01` | 0.40 x 0.92 x 6.28 | modular: a 6.3 m mast arm |
   | `SM_Prop_LightPole_Box_01`, `_Lights_01/02`, `_CrossLights_01`, `_CrossButton_01` | 0.2 to 0.5 m, 0.3 to 0.9 m high | modular: control box, signal heads, pedestrian signal, push button |
   | `SM_Prop_PowerBox_01` | 1.97 x 1.90 x 0.83 | whole: a ground cabinet |
   | `SM_Prop_SidewalkPoles_01/02` | 3.21 x 1.12 x 0.21; 0.21 x 1.12 x 0.21 | whole: bollards (052 already uses `_02`), **not** power poles |

   - The City Pack has **no utility pole, cross-arm, insulator or transformer**. The light-pole set is a traffic-signal and street-light kit. The wooden pole and transformers in use (`SM_Prop_Powerpole_*`, `SM_Prop_Transformer_*`) are `apocalypse-power`.
   - The pivots are centred and the converter grounds min y at 0, so a cable's attachment height has to be measured against its pole, not read from the manifest.
   - `SM_Prop_LightPole_*`, `SM_Prop_PowerBox_*`, `SM_Prop_Power_Cables_*` and `SM_Prop_TrafficLight_*` are all in `CITY_NEVER_USED` (16.6), for reasons Josh has not ruled on ("a lamp reads as a puzzle lamp", "reads as a puzzle part", "conductors stay code-generated (042 Q9)").
6. **What already exists and can be reused** (`goal/city-style`): `townLayout`'s terrace runs and open lots (051 B; the outer-block fill is a closure, `fillTerraceBlock`, inside `build`, `town.ts` around line 1446), `packTown` (051 C), `dressTown` (052 A), `furnitureLayout` (052 C; it takes the pavement geometry from module constants `WALL_EDGE_M = SETBACK / SC` and `KERB_M = KERB_FROM_FRONT_M`, both from `PAVE_W`, so it assumes today's 2.5 m pavement), colourways (054), the street camera (051 A; it takes a `Town`), `citymetrics.ts` (053), the gallery's rig `createGalleryRig`. `applyModels` already accepts a bundle with no terraces; it needs a puzzle-free bundle for the tile city (section C).
7. **Scale.** Today's `ROAD_W` is 1.1 map units (6.1 m) and `PAVE_W` 0.45 (2.5 m). City Pack tiles give a 10 m two-lane carriageway and 5 m pavements, so a tile street is about twice as wide as today's. Not a problem for this ticket (no circuit), but the later circuit ticket inherits it (see "For the later tickets").

## Goal
In a dev build, Josh (or the main session) opens `/?puzzle=<any>&view=3d&city=tiles` and sees a city laid on a 90 degree street grid of City Pack road tiles: two-lane streets with lane lines, square junctions with zebra crossings and dropped kerbs, continuous pavements with kerbs, kerbside parking bays marked with the pack's parking lines, and off-street parking lots behind kerb cuts. The blocks between the streets are walled by today's terraces (packed stacks, dressing, furniture, colourways), now facing real tile streets. There is no puzzle, node, wire or pole in it. `&blocks=WxD&seed=N` changes the city; `&cam=street` and `&light=day` work on it as on the ladder maps; `&sheet=1` shows each tile role once, labelled, so its orientation can be confirmed. With no City Pack (CI, a fresh checkout) every tile is code-drawn in today's street colours and every test passes. Nothing in the game changes: the 3D view of every puzzle map is exactly as today.

## The design (defaults; see Open questions)
1. **Units and grid.** The tile city is laid out in metres on a grid of `TILE_M` (5) and handed on as a normal `Town` in map units (times `WORLD_PER_METRE`), so everything after `townLayout` in the pipeline (16) runs on it unchanged. Every road, pavement, junction, parking lane, kerb cut, parking lot and plaza tile is a whole cell or, for `ParkingLines_01`, two cells along the street; every yaw is a multiple of 90 degrees.
2. **Size and seed** (pure, `tilecity.ts`). `tileCity({ blocksX, blocksZ, seed })`, each 1 to `CITY_BLOCKS_MAX` (6), default 3 x 3, seed 1. Streets run on every grid line, including all four edges. Each block's side is `BLOCK_TILES` (8 to 12 cells, 40 to 60 m) by `stableHash(seed, axis, index)`. Outside the edge streets' outer pavements is yard ground.
3. **Street profiles** (a cross-section, kerb to kerb, in cells, listed from the street's left looking along +x or +z):
   - `avenue`: pavement, parking, lane, lane, parking, pavement (30 m);
   - `street`: pavement, parking, lane, lane, pavement (25 m), the parking side by hash.
   - A grid line is an avenue where `stableHash(seed, line) % AVENUE_ONE_IN === 0`, and at least one interior line per axis is an avenue when an axis has three or more lines; edge streets are `street`.
4. **Cell roles, by band intersection** (the whole junction rule):
   - inside one street only: its band's role (`lane`, `parking`, `pavement`);
   - carriageway (lane or parking) of one street over the carriageway of the other: `junction` (`Road_Bare_01`);
   - carriageway of one street over the pavement band of the other: `crossing` (`Road_Crossing_01`, the zebra on the pedestrians' line);
   - pavement over pavement: `pavementCorner`, `Sidewalk_Dip_Corner_01` (a dropped corner where the crossings land; `Sidewalk_Corner_01` if the sheet shows the Dip is not a ramp).
   - Lane cells take `Road_Lines_01` or `_02` (which one carries the centre line, and on which edge, is set in `TILE_FRONTS` after the sheet; *from E, Q8 default: `Road_YellowLines_01/02`, as the white pieces have no centre mark*); pavement cells take `Sidewalk_Straight_01/02`, one in `GRATE_ONE_IN` `Sidewalk_Grate_01`, by hash; a `_Patch_01` decal on one lane cell in `PATCH_ONE_IN`.
5. **Kerbside parking.** A run of parking cells between two junction boxes becomes `ParkingLines_01` pairs, except the `BAY_JUNCTION_CLEAR` (1) cell next to each junction and the cells in front of a kerb cut, which are plain `Road_01` (no parking); an odd leftover cell is plain too. Each `ParkingLines_01` holds `BAYS_PER_PARKING_TILE` (2, eye-confirmed; **3 from E**: the GLB has 3 bays of about 3.3 m) bays. Every bay is a record (`ParkingBay`: centre, yaw, size, street, block side), so a later ticket can stand cars in them; this ticket draws none.
6. **Kerbs.** A kerb segment lies on every edge between a pavement cell and a carriageway cell, merged along a side, and nowhere else. With the pack, the kerb is the sidewalk tile's own edge; with no pack it is today's code-drawn kerb strip.
7. **Levels.** The carriageway surface is at `-SIDEWALK_TOP_M` (0.30 m, the sidewalk tile's height) and the pavement top at 0, so the pavement meets the shopfronts, the yards and the parking lots at ground level and no door is sunk into a slab. Lots, stacks, dressing and furniture keep y = 0. *(From E: the sidewalk tile's walking surface is 0.23 m, not 0.30 m, so the carriageway sits at `-SIDEWALK_WALK_M` (-0.23 m) and the walk stays at 0; criterion 28.)*
8. **Blocks and lots** (section B). Each block is a `TownBlock` whose four sides face tile streets. Its rows are filled by **the same terrace fill** the ladder maps use, extracted from `build` into an exported pure function (`terraceBlockRows`) with today's behaviour as its defaults, and called by the tile city with:
   - `setback: 0` (terrace fronts on the pavement's back edge: no strip between pavement and shopfront);
     - **Deviation, recorded 18 Nov 2026** (Josh, in chat: "Keep the inset"): each row's first lot stands back from its corner. On `7e291ff` the inset is 1 to 2.75 m. It comes from `startInset_m` on `terraceBlockRows` (default 0, so the ladder is unchanged), and `tileRowInset_m` in `tilecity.ts` sets it so that the packer's columns end on a seam or an alley at the row's far end.
     - The yard strip is therefore at the corner, in front of the corner block's flank, and not between the pavement and the shopfronts along the row.
     - The first lot stays a corner lot, with a real margin. As built in `876593d`, every inset is at most `TILE_INSET_MAX_M` (2.5 m). That is 0.28 m under `CORNER_GAP` (0.5 world units, 2.78 m), where `7e291ff` had 3 cm.
       - Where 5.2 m columns would leave more, the row is fitted to the widest apartment column (5.281 m) instead.
       - The test requires every inset to be at least 0.25 m under `CORNER_GAP`.
     - E's eye check (criterion 31) includes the corner close-up `&cam=street&run=0&at=0`.
   - no circuit, so the occlusion and wire rules pass and every lot takes the top cap;
   - `snap_m: TILE_M` for open lots: a parking lot is `PARKING_W_M` x `PARKING_D_M` (10 x 10, 2 x 2 cells) on the tile grid, a plaza `TILE_PLAZA_W_M` (10, 2 x 2 cells) instead of 10.4;
   - at least one parking lot per `CITY_LOTS_PER_BLOCKS` (4) blocks, and at least one in the city: where the hash rule gives too few, the longest qualifying runs take one, in id order.
   - Every parking lot gets **a kerb cut**: the pavement cells across its street edge are `kerbCut` (`Sidewalk_Dip_01`), and the parking cells in front of it carry no bays. Its surface is `Road_Bare_01` cells under 052 C's lot dressing (lines, barriers, meter, billboard), unchanged.
   - The block's inside stays yard, as today.
9. **The pavement frame.** `TerraceRun` gains an optional `frame?: { wall_m: number; kerb_m: number }` (wall-line and kerb distances from the run's front line, metres). `furnitureLayout` and `dressStack`'s `kerbM` read it, defaulting to today's `WALL_EDGE_M` and `KERB_M`, so the ladder towns are unchanged and the tile city's furniture stands on its 5 m pavements. Parking meters on the kerb line stand beside kerbside bays; no furniture stands in a kerb cut, a crossing's landing, or on a pole slot.
10. **Room for power lines, reserved, not built.** The tile city records `PoleSlot`s: on every pavement, `POLE_SLOT_FROM_KERB_M` (0.75) in from the kerb face, every `POLE_SLOT_PITCH_M` (12.5, one `Power_Cables_01` span of 12.45 m plus a pole) from each side's first corner keep-out, never on a corner, crossing landing or kerb cut cell. Furniture keeps `FURN_KEEP_M` off each slot. Nothing stands in them in this ticket.
11. **Drawing** (section C, `tilecity3d.ts`). One `InstancedMesh` per tile key (and per sub-mesh) at its cell, yaw from `TILE_FRONTS`, never scaled (every piece is exactly `TILE_M`, or 2 x `TILE_M`). `TILE_SLOTS` maps each role to its keys; **a role whose keys are missing or failed falls back, per role, to a code-drawn quad** in today's `STREET`, `PAVEMENT` and `KERB` colours at the same cell and level (the pavement fallback a box from `-SIDEWALK_TOP_M` to 0 with today's kerb strip). No tile raycasts. A puzzle-free `SceneBundle` (no wires, places, poles, captions) carries the town's lots and terraces into `applyModels` unchanged, so stacks, dressing, furniture and colourways appear as they do on the ladder maps.
12. **The dev switch** (section C, `renderer.ts`, behind `import.meta.env.DEV`, like the gallery and the street camera). `city=tiles` takes the gallery's place in `createMapRenderer3d`: the puzzle passed in is ignored, the view is a puzzle-free tile city on its own rig (`createCityRig` in `tilecity3d.ts`: the play camera's elevation and FOV, pan and zoom, framing the whole city at start; **deviation, recorded 18 Nov 2026**: the design named the gallery's `createGalleryRig`, which looks from 15 degrees and pans along x only, so it cannot show a street grid from above; C uses it for the sheet only, and E moves the sheet to the city rig too), `&cam=street[&run=N][&at=T][&light=day]` uses 051 A's street view on the tile city's `Town`, `&sheet=1` lays every role's tile once in a labelled row with an arrow along its `TILE_FRONTS` direction. One `console.info("tile city: WxD blocks, seed N, C cells, K from the pack, F code-drawn")` line once models are applied. `hitTest` returns null. Absent `city=`, the code path is today's exactly.

## Sections (each at most a day)
- **A. The tile grid, pure** (about 1 day). Design items 1 to 7 and 10: `tilecity.ts`, no three, no assets. Needs nothing.
- **B. Lots on tile streets** (about 1 day). Design items 8 and 9: the extraction from `town.ts`, terraces and open lots on the tile city, the pavement frame. Needs A.
- **C. Drawing and the dev view** (about 1 day). Design items 11 and 12. Needs A; may build in parallel with B (it draws whatever the tile city's `Town` holds; terraces appear once B merges).
- **E. Integration** (about 1 day; added 18 Nov 2026). B's helpers wired into the drawn city (keep-outs, bay meters, the dressing's frame), a frame-aware R10, the street camera on the tile city, the tile facts the C builder read from the GLBs (bays per parking tile, the walking level, the centre line), a readable sheet, and `light=day` on the tile view. Needs B and C merged into `goal/city-style`.
- **D. Checks and the guide** (about ½ day). `tilemetrics.ts`, chapter 17, chapter 10's update, the Numbers rows and drift test, all on the integrated city. Needs E.
- **F. Door sills** (about 1 day; added 18 Nov 2026 on Josh's direction; **approved, G1, Josh 18 Nov 2026: "Approved and confirmed"**). F covers every building on the tile city and on the ladder maps.
  - Each building's door-sill height is measured from its GLB into a table keyed by model.
  - The draw step sinks the building so the sill meets the walk, or, for a house that cannot sink that far, stands steps at its door.
  - F needs E merged, because both edit `models3d.ts`. It may run beside D and 056, which touch other files.

## Acceptance criteria
**CI-safe rules (every section).** Tests use typed-in fixture entries (names and bounds as numbers: the 5 x 0 x 5, 10 x 0 x 5 and 5 x 0.30 x 5 tiles of finding 2), never `assets/private/` at module or `describe` level; a check on the real manifest stays inside an `it` and skips when the file is absent. No Windows paths (`path.join`, forward-slash literals, `new URL(..., import.meta.url)`), no timer under 1 s, no wall-clock wait. Nothing from `assets/private/` is committed or bundled. The largest city a test builds is 6 x 6 blocks; the suite stays fast.

### A (Vitest, new `tilecity.test.ts`)
1. [ ] **On the grid.** For seeds 1 to 20 and sizes 1 x 1, 3 x 3, 6 x 4 and 6 x 6: every cell's centre is at (k + 0.5) x `TILE_M` on both axes (a 2-cell `ParkingLines_01` at a cell edge along its street), every yaw is a multiple of 90 degrees, every piece's footprint is exactly 1 or 2 cells.
2. [ ] **No gaps, no overlaps.** The cells partition the union of the streets' rights of way exactly: every grid square inside it is covered once, none outside it is covered, and the summed cell area equals the union's area within 1e-6.
3. [ ] **Junctions.** Every cell's role equals design item 4's band rule; every junction box is `junction` cells only; every approach has a full `crossing` row across its carriageway; each block corner is a `pavementCorner`; no `lane` cell lies inside another street's band.
4. [ ] **Kerbs.** A kerb segment lies on every pavement/carriageway cell edge and on no other edge; the kerbs of one block side are one merged segment between its corners; no kerb crosses a junction or crossing cell.
   - *From 056 (once 056 A merges):* `buildout` cells count as pavement here. Kerbs then also run along the build-outs' edges.
5. [ ] **Profiles and bays.** Every street's cross-section is its profile; with three or more lines on an axis at least one interior line is an avenue; no bay lies in a cell next to a junction box; every `ParkingLines_01` is two parking cells of one street; `bays` is `BAYS_PER_PARKING_TILE` per such tile.
6. [ ] **Pole slots.** On every pavement side, slots are `POLE_SLOT_PITCH_M` apart, `POLE_SLOT_FROM_KERB_M` from the kerb face, and none is on a corner, crossing landing or kerb-cut cell.
7. [ ] **The `Town`.** `tileCity(...).town` has `roads`, `kerbs`, `pavements`, `pads` (the junction boxes) and `blocks` in map units, each block's edge on its pavements' back edges within 1e-6, no lot, no place, empty `terraces` and `openLots` (B fills them); `ring` and `window` are the city's bounds; deterministic per (size, seed); frozen like `townLayout`'s.
8. [ ] **Pure.** `tilecity.ts` imports nothing from three, the DOM, `src/grid/` or `src/night/` (a source test).

### B (Vitest)
9. [ ] **Nothing moves on the ladder.** Before any edit, the builder pins a digest of `townLayout(p)` and `townLayout(p, { terraces: false })` for every `puzzles/*.json` on the section's base commit (named in the report) in a new `townpin.test.ts`; after the extraction every digest matches. The pool-count test, `pick.test.ts`, `live.test.ts`, `relight3d.test.ts`, `terracepack.test.ts`, `furniture.test.ts`, `citymetrics.test.ts` and `stacktown.test.ts` pass unedited.
10. [ ] **Terraces on tile streets.** On the default city and seeds 1 to 10 at 3 x 3: every block side carries terrace runs whose front line lies on its pavement's back edge within 1e-6 (no slit); `packTown` on fixture stack widths packs every run; the far-gap rule of 16.2 holds (no slit) on at least the ladder's share; R1 to R13 (`evaluateCity`) pass with the fixture plan.
    - *Status note (18 Nov 2026, after B's round 2 review on `7e291ff`):* the far-gap seam-or-alley share is about 91%, reached through the corner inset of design item 8. R6 is met. R7 is about 0.45 (0.43 to 0.50 per seed).
    - *Re-cut (Josh, 18 Nov 2026, in chat):* on the inset, "Keep the inset" (design item 8's deviation). On R7, "Just choose the recommended option for now".
      - On the tile city, R7's floor is 0.4: a plain test of R7 above 0.4 on every seed replaces the `it.fails`.
      - The ladder's R7 floor of 0.5 in `CITY_CHECK` is unchanged.
      - No change is made to `dressing.ts`, `P_ESCAPE` or the lot keys.
    - R10 here is the furniture check. It becomes frame-aware in E (criterion 25), so B is judged on R10 without tile furniture.
    - *From 056 (056 A review, 18 Nov 2026; temporary until 057):* with 056's demand-placed lots (9 on the default city), the far-gap share falls below the 0.85 floor. Measured by the original definition:
      - 396 of 495 runs close to a seam or alley (0.80);
      - 275 of 374 corner-ending runs do (0.735).

      The cause: the run after a 10 m parking lot is 5j − 6 m long and gets no inset, unlike a run after a plaza.

      056 A therefore:
      - keeps the 0.85 test, excluding the first run after a lot;
      - adds floors of 0.75 over all runs and 0.70 over corner-ending runs.

      These floors are temporary. Ticket 057 (approved) replaces the tile city's far-gap handling with flush corners and seam, overlap or gated-passage ends (its 19.2 and G2), and 057 B restates the far-gap rule and retires these floors.
11. [ ] **Parking.** Every open lot is on the tile grid (corners on cell edges); every block has at least `CITY_BAYS_PER_BLOCK_MIN` (4) kerbside bays on its sides or an open parking lot; the city has at least ceil(blocks / `CITY_LOTS_PER_BLOCKS`) parking lots; every parking lot's street edge is `kerbCut` cells across its whole width and the parking cells in front of it hold no bay; no bay overlaps a kerb cut, a crossing or a junction.
    - *From 056 (once 056 A merges):* two clauses are replaced by 056's criteria 4 and 6, checks P1 and P2:
      - "at least `CITY_BAYS_PER_BLOCK_MIN` (4) kerbside bays or an open parking lot";
      - "at least ceil(blocks / `CITY_LOTS_PER_BLOCKS`) parking lots".

      Both constants are removed. The grid, kerb-cut and bay-clearance clauses stay.
12. [ ] **The frame.** With `frame` absent, `furnitureLayout` and `dressStack` give exactly today's output on the three protocol maps (deep-equal). On the tile city every furniture piece stands on a pavement cell, between its run's wall and kerb lines, and at least `FURN_KEEP_M` from every pole slot, kerb cut and crossing landing; meters stand only beside kerbside bays or in lots.

### C (Vitest unless marked)
13. [ ] **Per-role fallback.** With fixture entries for every role, every cell is drawn from the pack (instance count per key equals its cells); with each role's keys absent in turn, exactly that role's cells are code-drawn and the rest are pack; with no entries at all (CI), every cell is code-drawn, and the scene's tile meshes are at most `TILE_DRAW_CALLS_MAX` draw calls.
14. [ ] **Levels and seams.** Every drawn tile's matrix puts it at its cell centre with no scale (|scale| 1 within 1e-9, times `WORLD_PER_METRE`); carriageway tiles at `-SIDEWALK_TOP_M`, pavement tiles with their top at 0; a real-manifest check (skipped when absent) finds every key in `TILE_SLOTS` in the city-pack entry with its footprint `TILE_M` or 2 x `TILE_M` within 0.01 m and the sidewalk keys `SIDEWALK_TOP_M` high within 0.01 m.
15. [ ] **The switch.** `cityTilesRequested(search)` parses `city=tiles`, `blocks=WxD` (clamped 1 to 6), `seed` (integer, default 1) and `sheet=1`; anything else is null. A source test shows the branch sits behind `import.meta.env.DEV` in `renderer.ts` and that, with no `city=`, `createMapRenderer3d` takes today's path. No tile mesh and no city object raycasts; `hitTest` returns null in the tile view.
16. [ ] **Puzzle-free bundle.** `buildCityScene(city)` has no wires, places, poles or captions; `applyModels` on it with the stack fixture plan swaps terrace placeholders for packed stacks as on a ladder map, and with no city-pack leaves the placeholders.
17. [ ] (Main session, screenshots, `npm run dev`) `/?puzzle=01-first-light&view=3d&city=tiles&sheet=1`: each role's tile reads as its role and its arrow; the main session records any wrong yaw as one `TILE_FRONTS` line in the review (a must-fix for the builder). Then `&city=tiles` and `&city=tiles&blocks=5x4&seed=2`: no tile gap, slit or overlap, kerbs continuous, zebras at every junction. Then `/?puzzle=09-shrine-circuit&view=3d`: reads exactly as on `goal/city-style`. Screenshots sent to Josh.
    - *Amended 18 Nov 2026:* the checks that need B's terraces or E's fixes (the `cam=street` URLs, `light=day`, bays and lot kerb cuts, shopfronts on the pavement, no sunk doors, a readable sheet, the crossing and Dip-corner orientation) move to E's criterion 31. On C alone, `cam=street` logs "no row of buildings to look along yet" and stays overhead, as expected.
18. [ ] (Main session) `npm run build`: `dist/` contains no `tile city:` string and no `city=tiles` handling.

### E. Integration (added 18 Nov 2026; approved by Josh the same day, "I approve one through three", with Q8 and Q9 at their defaults; Vitest unless marked)
Starts on `goal/city-style` once B and C are merged into it. Its findings were checked against `ticket/055b-tile-lots` at `8c1a206` and `ticket/055c-tile-draw` at `4d952c6`. Every ladder-map guarantee of criteria 9, 12 and 22 still holds after E: the puzzle path of `applyModels`, `dressSites` and `evaluateCity` gives deep-equal output on the three protocol maps, and the eight suites named in criterion 9 pass unedited.

23. [ ] **Furniture on the drawn city.** `applyModels` on the tile city's bundle (stack and furniture fixture plan) places exactly `bayMeters(city, furnitureLayout({ ...input, keepPoints, keepRects }))`, with the keep-outs from `tileKeepouts(city)`. Each piece passes criterion 12's tile checks: on a pavement cell, between its run's frame lines, `FURN_KEEP_M` from pole slots, kerb cuts and crossing landings, and meters only beside bays or in lots. `applyModels` gains an optional third argument for the keep-outs and the filter (or the builder's equivalent). The puzzle path passes nothing, and its furniture is deep-equal to today's on the three protocol maps.
    - *From 056:* the wording is unchanged. With 056's fewer bays, fewer meters pass `bayMeters`, and that is expected.
24. [ ] **The dressing reads the frame.** `dressSites` puts the run's `frame`, looked up by run id from the town's `terraces`, inside each site's `run`, where `dressBlock` reads it. It does not put it at the top level, which is where `4d952c6` has it. On the tile city every site's `run.frame` equals its `TerraceRun.frame`, and a kerb-side piece stands within the 5 m pavement, not 3.33 m from the front. On the three protocol maps `dressSites` and the dressing placements are deep-equal to today's.
25. [ ] **R10 reads the frame.** In `citymetrics.ts`, R10's pavement band and wall line read `run.frame?.kerb_m` / `run.frame?.wall_m`, defaulting to today's `KERB_M` / `WALL_EDGE_M`, and nothing else in the file changes. `citymetrics.test.ts` passes unedited. On the integrated tile city (default and seeds 1 to 10 at 3 x 3, fixture plan with furniture), R10 is 0 and B's criterion 10 R-checks are re-run with furniture included.
26. [ ] **Lot and plaza cells drawn.** Every `lotSurface` and `plaza` cell B adds (2 x 2 per open lot; a plaza cell's `street` is null) is drawn by `tilecity3d.ts`, from the pack or code-drawn per role, as criterion 13 says. Where a lot surface, the yard ground and 052 C's lot pieces (lines, panel) overlap, no two of them are coplanar: a test finds each lot piece's base at least 0.005 m above the lot surface's top. The criterion 13 instance counts include these cells.
    - *From 056:* blocks take 1 or 2 lots each, so there are more lot cells, and the instance counts follow.
27. [ ] **Bays per parking tile.** `BAYS_PER_PARKING_TILE` becomes 3: the C builder found dividers at x of about -5, -1.75, +1.6 and +5, so `Road_ParkingLines_01` has 3 bays of about 3.3 m. Bay records are `2 x TILE_M / 3` wide, and each bay's centre lies within 0.2 m of the middle between two neighbouring measured dividers (the divider positions are a test fixture). `CITY_BAYS_PER_BLOCK_MIN` stays 4. Criteria 5 and 11 hold with the new number.
    - *From 056 (once 056 A merges):* 3 bays per tile stays, and 056's `LOT_STALLS` is 2 x 3 = 6.
      - `CITY_BAYS_PER_BLOCK_MIN` and `CITY_LOTS_PER_BLOCKS` are removed. 056's 18.3 and 18.4 replace them.
      - Criterion 5 holds.
      - Criterion 11's parking-count clauses are replaced by 056's criteria 4 and 6.
28. [ ] **The walking level.** The C builder found that the sidewalk tile's walking surface is 0.23 m high, with a 0.30 m lip on its kerb edge and a 0.6 m raised apron past the kerb. Design item 7's intent is kept (Josh's Q5: the pavement is flush with shopfronts, yards and lots), and only the numbers change. A new `SIDEWALK_WALK_M` (0.23, measured) in `tilecity.ts` sets the levels:
    - the carriageway is at `-SIDEWALK_WALK_M`;
    - every sidewalk-family tile stands on the carriageway, so its walking surface is at 0 and its lip 0.07 m above;
    - the code-drawn pavement box runs from `-SIDEWALK_WALK_M` to 0.

    `SIDEWALK_TOP_M` stays 0.30 as the tile's bounding height, which criterion 14's manifest check still reads. The builder measures the walking height of each sidewalk key it uses: Straight, Grate, Dip, Dip_Corner, Corner, Panel. A key more than 0.02 m off gets its own entry in a `TILE_WALK_M` table. The builder also records, in the `TILE_FRONTS` comment, where the kerb face sits relative to the cell edge. Pole slots and `frame.kerb_m` do not move in this ticket. If the kerb face is more than 0.1 m inside the cell edge, the builder says so in its report as a re-cut item. Criterion 14's level tests are updated to these numbers.
    - *From 056:* a `buildout` cell is a sidewalk-family tile, so the same levels apply to it: it stands on the carriageway, with its walk at 0.
29. [ ] **The centre line** (Q8 default). The lane role's keys become `SM_Env_Road_YellowLines_01/02`. They are not in `CITY_NEVER_USED`. The builder reads which edge carries the yellow line from the converted geometry, as `4d952c6` did for the other road pieces, and sets `TILE_FRONTS` so the yellow edge of every lane cell lies on its street's centre line. Two lanes then show one yellow pair at the centre, with no white double line. `Road_Lines_01/02` move to `TILE_SHEET_EXTRA`. If the geometry shows the YellowLines pieces carry no single-edge yellow line, the builder keeps `Road_Lines_01/02`, reports it, and the main session takes it to Josh. Criterion 14's manifest check covers the new keys.
30. [ ] **A readable sheet and daylight.**
    - *The sheet:* a grid, not a row (about square, at least one cell of gap between pieces). It is shown on the city rig, from above, framing every piece at start inside the insets. The label rectangles do not overlap at 1280 x 720 or 390 x 844, and none overlaps a piece's projected footprint. A test checks both sizes.
    - *Daylight:* `light=day` adds the daylight on every tile-view URL: overhead, `cam=street`, the `cam=street` fallback when no row exists, and the sheet. On `4d952c6` the overhead branch sits in an `else if` after the street camera, and the main session saw the overhead view stay dark with `light=day`. The builder finds the cause and states it in its report.
    - *Default lighting* (Q9 default): with no `light=`, the tile city and street views use today's night lights, as the ladder maps do, and the sheet is always lit.
    - *Tests:* the scene has exactly one `HemisphereLight` at `STREET_CAM_DAY_INTENSITY` for each `light=day` URL, and none without it.
31. [ ] (Main session, screenshots, `npm run dev`; replaces the moved half of criterion 17) Checks on the integrated branch:
    - `&city=tiles&sheet=1`: every label is readable and no piece is hidden by the HUD. The crossing (`Road_Crossing_01`, turn 0) has its bars across the carriageway and the walkers' arrow along the crossing. The Dip corner's dropped edges face the crossings. The lane pieces' yellow edge is on the arrow side. A wrong one becomes one `TILE_FRONTS` line as a must-fix.
    - `&city=tiles`, `&city=tiles&cam=street&run=0`, `&run=1`, `&run=0&at=0` and `&city=tiles&blocks=5x4&seed=2`, each with and without `&light=day`:
      - the street camera stands in a tile street, looking along a terrace;
      - `light=day` visibly lights the overhead view;
      - a single yellow centre line, three bays per parking tile, and lot kerb cuts are visible;
      - shopfronts stand on the pavement, with no sunk or floating doors (the 0.23 m walk), and the kerb lip reads as a kerb;
      - furniture stays out of kerb cuts and crossings;
      - lot lines do not flicker.
    - `/?puzzle=09-shrine-circuit&view=3d` and `&cam=street&run=0` read exactly as on `goal/city-style`.
    - Screenshots are sent to Josh.
    - *From 056:* "three bays per parking tile" still holds, on fewer tiles. 056's criterion 11 adds the parking eye checks: short runs, build-outs and trees, no yard-side bays, 1 or 2 lots per block.
32. [ ] **The street camera on the tile city.** On the default city and seeds 1 to 10 at 3 x 3, `createStreetView` on `city.town` with `run` 0 and with `run` 1 returns a view. The tile view never logs "no row of buildings to look along yet" when the town has terraces. `streetcam.ts` is not edited.

### D (Vitest)
19. [ ] **Tile checks.** New `tilemetrics.ts`: `tileMetrics(city, packed, furniture)` and `TILE_CHECK` for T1 to T9: T1 on the grid, T2 no gaps or overlaps, T3 junction pieces right, T4 kerbs continuous between corners and kerb cuts (a cut breaks the kerb, design item 6) and pavements meet lot fronts with no slit, T5 frontage on every block side (covered share at least `CITY_RUN_FRONTAGE`'s ladder value), T6 parking on every block, T7 every lot has its kerb cut, T8 bays clear of junctions, cuts and crossings, T9 pole slots clear of furniture. Each passes on the default city and seeds 1 to 10, and each is shown to fail on a city made to break it (one fixture per item). `tileMetrics` takes the **integrated** plan: the furniture as E places it (keep-outs and `bayMeters` applied), the bays at E's 3 per tile. Furniture on the frame is R10's job (frame-aware since criterion 25); T-checks do not repeat it.
    - *From 056 (approved 18 Nov 2026):* T6 defers to 056's P1 and P2. If 056 A has merged, T6 passes when `evaluateParking` passes P1 and P2, and it adds no parking count of its own. If it has not, T6 is as written above, and 056 re-points it when it lands. `tilemetrics.ts` does not repeat P1 to P6.
20. [ ] **Guide.** `docs/city-style-guide.md` gains chapter 17 "Tile city" (the grid, profiles, the band rule, levels, parking, the reserved pole slots, the fallback, the protocol: the URLs of criterion 17 and T1 to T9 with their eye halves) with Josh's words above as its **Decided** line; chapter 10 records that the tile city lays roads on a 90 degree grid only (Josh, item 1) and that the diagonal-straight Default (042 Q7) stays for the ladder maps until the circuit ticket; 16.6 gains no exclusion and lifts none. Chapter 17 also records:
    - parking: chapter 17 points to 056's chapter 18 "Parking" and restates none of its numbers;
    - the deviations: the corner inset (design item 8, Josh: "Keep the inset"; overridden by 057), and the tile-city R7 floor of 0.4 (criterion 10, Josh: "Just choose the recommended option for now"); the city rig in place of the gallery rig (design item 12); `plaza` is `Sidewalk_Panel_01` (the 0.30 m slab, level with the other sidewalk tiles) and not 052 C's `_Panel_02`;
    - E's tile facts: 3 bays per parking tile, the 0.23 m walking level and the 0.07 m lip, the yellow centre line (or Josh's other answer to Q8), the kerb broken at kerb cuts, the default night lighting with `light=day`.

    Numbers rows for every exported constant of `tilecity.ts`, `tileslots.ts` and `tilemetrics.ts`, including B's `TILE_PARK_MIN_RUN_M` and E's `SIDEWALK_WALK_M` (and `TILE_WALK_M` if made); `styleguide.test.ts`'s drift check reads those files (a new check; existing checks unedited).
    - *Guide test (added 18 Nov 2026):* `styleguide.test.ts`'s "has the sixteen chapters" check lists the chapter numbers, so it must be extended to include chapter 17. That one edit to an existing check is allowed. Every constant the new text names must be exported by a module the test reads.

### F. Door sills (added 18 Nov 2026; Vitest unless marked)
**Why.** Josh, 18 Nov 2026, in chat: house foundations stand higher than the street, so no one could walk in. Then, on how to fix it: "That's going to have to be a variable that we measure for each individual building."

Pack facts, from the manifest (the main session, 18 Nov 2026):
- The City Pack's only steps are `SM_Bld_Apartment_Stairs_*`: outdoor staircases 2.4 to 4 m high and 5 to 10 m deep, far too big for a door, and kept out by 16.6.
- The Town Pack has `SM_Bld_House_Concrete_Steps_01` (1.2 x 0.5 x 0.9 m), the right size for a house door.
- The Town Pack's `SM_Bld_House_DeckSteps_01` converts to 0 x 0 x 0, so it is broken and not used.

**The rule.**
- The sill is the height of the floor the door opens onto, above the model's base (the converter grounds min y at 0).
- A building whose sill is at most `SILL_MAX_M` (0.15) is not changed.
- Any other building is **sunk** by its sill, so the sill meets the walk in front of it: y 0 on the tile city's pavement (E's walk level), and the lot ground on the ladder.
- A **house** (a whole model) whose sinking would leave its lowest ground-floor window less than `SILL_WINDOW_CLEAR_M` (0.3) above the walk sinks only that far. `SM_Bld_House_Concrete_Steps_01` then stands at its door, outside the front face, scaled in y alone to the rise that is left.
- A **stack** (City Pack terrace or tall-lot stack) always sinks, never takes steps, and sinks as one by the largest sill of its ground pieces. A terrace's front is the pavement, and steps there would stand in the walkers' way.

33. [ ] **The measured table.** New `src/render3d/sills.ts`, pure, exports `DOOR_SILLS: Readonly<Partial<Record<CalibrationKey, { sill_m: number; window_m: number | null; door_x_m: number }>>>`.
    - **Keys:** one entry for every ground-floor model the town can place:
      - the base, door, corner and shop pieces of every `STACK_STYLES` style;
      - the twelve Town Pack whole houses of 048, and its garage;
      - every SIMPLE Town building in `MODEL_TABLE`.
    - **How each value is read:** from the converted GLB's geometry, not guessed, as `4d952c6` read `TILE_FRONTS`.
      - The front face is the one `BUILDING_FRONTS` names.
      - `sill_m` is the highest upward-facing surface (normal y above 0.9) under the door opening, within 1 m behind the front face and under 1.5 m.
      - `door_x_m` is the door's centre along the front, in the model's frame: the door mesh or material if one is named so, else the front's centre.
      - `window_m` is the lowest point of the front face's glass or window triangles, or null.
    - **A key the geometry cannot settle** gets no entry. It is drawn unchanged and listed in the builder's report with the reason.
    - **Tests:**
      - a CI-safe test pins every entry's three values as a typed-in fixture, so changing a value fails it;
      - a real-geometry test inside an `it`, skipped when `assets/private/out/` is absent, re-measures each key and matches the table within 0.02 m.

      Neither test reads a pack file at module or `describe` level.
34. [ ] **The plan.** `sills.ts` exports `SILL_MAX_M = 0.15`, `SILL_WINDOW_CLEAR_M = 0.3`, `STEPS_KEY = "town-pack:SM_Bld_House_Concrete_Steps_01"`, `STEPS_RISE_M = 0.5` (its measured height), and `STEPS_SCALE_Y = { min: 0.5, max: 1.5 }`.
    - **Functions:** `stackSill(stack, table)` and `houseSill(key, table)` each return `{ sink_m: number; steps: { x_m: number; z_m: number; scaleY: number } | null; leftOver_m: number }`, in the building's own frame. They are pure and follow the rule above.
    - **Fixture cases:**
      - a sill of 0.1: no change;
      - a sill of 0.6 with no window: sink 0.6;
      - a sill of 0.6 with a window at 0.6: sink 0.3 and steps scaled 0.3 / 0.5 = 0.6;
      - a sill of 0.6 with a window at 0.35: sink 0.05 and a left-over rise of 0.55, which is within the steps' scale range;
      - a stack with ground sills 0.2 and 0.45: the stack sinks 0.45;
      - a key with no entry: no change.
    - **After the rule:** on fixture tables, every door with an entry is at most `SILL_MAX_M` above the walk, or has steps whose scaled top is within 0.05 m of its sill. A house whose rise left over is outside the steps' scale range is reported in `leftOver_m`. The test lists every such key from the real table (skipped without it), and the main session takes that list to Josh.
35. [ ] **Drawn.** `applyModels` (in `models3d.ts`):
    - lowers each whole-model group and each stack group by its `sink_m`;
    - lowers that block's dressing placements (glass, awnings, signs, fire escapes, roof props) by the same amount;
    - stands the steps as one `InstancedMesh`, or as a code-drawn box of the same size and the lot colour when the Town Pack key is absent (CI).

    Furniture, open lots, tiles and lot placeholders do not move. With an empty `DOOR_SILLS`, the scene equals E's exactly (deep-equal on the three protocol maps and the default tile city).
36. [ ] **The ladder towns change only here.** On the ladder maps, F changes building and stack heights, the dressing heights of the blocks that sink, and the added steps; nothing else. Everything else stays deep-equal on the three protocol maps:
    - `townLayout`, `packTown`, `dressSites`/`dressTown` and `furnitureLayout` outputs (E's criteria 23 and 24 hold on these pure outputs, and F's sink is applied when drawing);
    - `evaluateCity`;
    - pick and Relight.

    `npm run playtest` has no snapshot change. Lifting `STEPS_KEY`'s model into use is recorded in 16.6 and the pack table (Town Pack: "a church, a shed and props are not placed" gains "except the house concrete steps").
37. [ ] **Guide.** `docs/city-style-guide.md` gains 16.10 "Door sills":
    - the rule, with Josh's words above as its **Decided** line;
    - the table's method;
    - the left-over list as **Open**.

    Numbers rows cover every `sills.ts` constant. `styleguide.test.ts` gains a drift check for `sills.ts` only (a new check; existing checks unedited). 16.6 records the steps key in use and `DeckSteps_01` as broken.
38. [ ] (Main session, screenshots, `npm run dev`, each with `&light=day`) Check these URLs:
    - `/?puzzle=01-first-light&view=3d&city=tiles&cam=street&run=0&at=0`, `&run=1` and `&run=3`: shop and residents' doors meet the pavement, with no plinth to climb and no door sunk into the slab;
    - `/?puzzle=09-shrine-circuit&view=3d&cam=street&run=0`, and one ladder map with Town Pack houses (the builder names it in its report) at `&cam=street`: house doors meet their path or have steps that read as steps, and no ground-floor window is buried;
    - `/?puzzle=09-shrine-circuit&view=3d` overhead: reads as on `goal/city-style` but for building heights.

    Screenshots go to Josh.

### Every section
21. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. No dev server, no browser. Writes nothing under `assets/`.
22. [ ] (Main session) `npm run gate` green and the test count grew; `npm run playtest` green with **no snapshot change**; `git diff` of the section touches only its Files; `git diff -- src/core/ src/render/ src/grid/ src/night/ src/play/ src/ui/ src/main.ts tests/ puzzles/ tools/ package.json public/ index.html vite.config.ts` empty; `git ls-files assets/private` empty; `dist/` has no `.glb`, `manifest.json` or `private` path.

## Files
- **A, may touch:** new `src/render3d/tilecity.ts`, `tilecity.test.ts`.
- **B, may touch:** `town.ts` (only: extract the outer-block terrace fill into exported `terraceBlockRows` with today's defaults, and `TerraceRun.frame?`), `tilecity.ts`, `furniture.ts` and `dressing.ts` (the `frame` read only, defaulting to today's constants), new `townpin.test.ts`, new tests and new cases in `tilecity.test.ts`.
- **C, may touch:** new `src/render3d/tileslots.ts` (pure: `TILE_SLOTS`, `TILE_FRONTS`, `cityTilesRequested`), new `tilecity3d.ts` (three: drawing, `buildCityScene`, the sheet) and their tests; `models3d.ts` (load the tile keys only when the tile view asks, and accept a puzzle-free bundle; the puzzle path unchanged); `renderer.ts` (the dev-only branch only).
- **E, may touch (owner renderer):**
  - `src/render3d/tilecity.ts`: `BAYS_PER_PARKING_TILE` and the bay records; `SIDEWALK_WALK_M` (and `TILE_WALK_M` if needed). No change to the grid, roles, lots or pole slots.
  - `tileslots.ts`: lane keys, `TILE_FRONTS`, `TILE_SHEET_EXTRA`, `TILE_LEVELS` and level helpers.
  - `tilecity3d.ts`: drawing levels, lot and plaza cells, the sheet grid and labels, the sheet on the city rig, daylight.
  - `models3d.ts`: `dressSites`' frame; `applyModels`' optional keep-outs and filter. The puzzle path is unchanged.
  - `citymetrics.ts`: R10's two frame reads only.
  - Their tests: `tilecity.test.ts`, `tileslots.test.ts`, `tilecity3d.test.ts`, and new cases in a new `tileintegrate.test.ts`. Existing ladder suites stay unedited.
  - Not `renderer.ts` (the daylight and sheet live in `tilecity3d.ts`; if the builder finds `renderer.ts` must change, it stops and asks for a re-cut). Not `town.ts`, `furniture.ts`, `dressing.ts` or `streetcam.ts`. Not the guide (D writes it).
- **D, may touch:** new `src/render3d/tilemetrics.ts`, `tilemetrics.test.ts`; `docs/city-style-guide.md` (chapters 10 and 17, Numbers); `styleguide.test.ts` (the new drift check only).
- **F, may touch (owner renderer):**
  - new `src/render3d/sills.ts` and `sills.test.ts`;
  - `models3d.ts`: the sink, the dressing offset, the steps, and loading `STEPS_KEY`;
  - `docs/city-style-guide.md`: 16.6, 16.10, the pack table row for the Town Pack, and Numbers;
  - `styleguide.test.ts`: the new drift check only.

  Not `stacks.ts`, `dressing.ts`, `town.ts`, `furniture.ts`, `tilecity.ts`, `tilecity3d.ts` or `models.ts`: the sink is applied when drawing, not in the plans. Measuring may read `assets/private/out/` locally, and nothing under `assets/` is written or committed.
- **Must not touch (every section):** `layout.ts`, `relight3d.ts`, `pick.ts`, `camera.ts`, `scene.ts`, `streetcam.ts`, `terrace.ts`, `stacks.ts`, `colourway.ts`, `gallery.ts` (import `createGalleryRig`, do not edit), `calibration.ts`; `src/core/`, `src/render/`, `src/grid/`, `src/night/`, `src/play/`, `src/ui/`, `src/main.ts`; `tests/`, `puzzles/` (and never `puzzles/locked/`), `tools/`, `package.json`, `vite.config.ts`, `index.html`, `public/`; anything under `assets/` (read only). A builder who needs one stops and asks for a re-cut.

## Interfaces
- **No `src/core/` change, no schema change, no event change, no new dependency.** Three is approved (037); `InstancedMesh` is Three's. Everything below is local to `src/render3d/` (the builder may rename).
- `tilecity.ts` (A): `TILE_M = 5`, `SIDEWALK_TOP_M = 0.3`, `CITY_BLOCKS_MAX = 6`, `BLOCK_TILES = { min: 8, max: 12 }`, `AVENUE_ONE_IN = 3`, `BAY_JUNCTION_CLEAR = 1`, `BAYS_PER_PARKING_TILE = 2` (3 from E), `GRATE_ONE_IN = 6`, `PATCH_ONE_IN = 12`, `POLE_SLOT_FROM_KERB_M = 0.75`, `POLE_SLOT_PITCH_M = 12.5`;
  `type TileRole = "lane" | "parking" | "parkingPlain" | "junction" | "crossing" | "pavement" | "pavementCorner" | "kerbCut" | "lotSurface" | "plaza"`;
  `interface TileCell { i: number; j: number; cells: 1 | 2; role: TileRole; variant: number; x_m: number; z_m: number; yaw: 0 | 90 | 180 | 270; street: string | null }`;
  `interface TileStreet { id: string; axis: "x" | "z"; line: number; profile: "avenue" | "street"; bands: readonly ("pavement" | "parking" | "lane")[] }`;
  `interface ParkingBay { x_m: number; z_m: number; yaw: number; w_m: number; d_m: number; street: string; block: string }`;
  `interface PoleSlot { x_m: number; z_m: number; street: string; side: 1 | -1 }`;
  `interface TileCity { blocksX: number; blocksZ: number; seed: number; cells: readonly TileCell[]; streets: readonly TileStreet[]; bays: readonly ParkingBay[]; poleSlots: readonly PoleSlot[]; town: Town }`;
  `tileCity(opts: { blocksX?: number; blocksZ?: number; seed?: number }): TileCity`.
- `town.ts` (B): `terraceBlockRows(block, sides, opts: { setback?: number; clears?: ClearsFn; snap_m?: number; plazaW_m?: number; forceParking?: boolean }): { lots: Lot[]; runs: TerraceRun[]; openLots: OpenLot[] }` (defaults are today's); `TerraceRun.frame?: { wall_m: number; kerb_m: number }`; `TILE_PLAZA_W_M = 10` and `CITY_LOTS_PER_BLOCKS = 4` and `CITY_BAYS_PER_BLOCK_MIN = 4` live in `tilecity.ts`, not `town.ts`.
- `tileslots.ts` (C): `TILE_SLOTS: Readonly<Record<TileRole, readonly CalibrationKey[]>>` (City Pack keys of finding 2), `TILE_FRONTS: Readonly<Partial<Record<CalibrationKey, 0 | 90 | 180 | 270>>>` (empty until the sheet check), `TILE_DRAW_CALLS_MAX = 40`, `cityTilesRequested(search): { blocksX: number; blocksZ: number; seed: number; sheet: boolean } | null`.
- `tilecity3d.ts` (C): `buildCityScene(city: TileCity, opts?): SceneBundle`, `tileGroup(city, roots, entries): { group: Group; fromPack: number; codeDrawn: number }`, `tileSheet(roots, entries): Group`.
- E (added 18 Nov 2026):
  - `tilecity.ts`: `BAYS_PER_PARKING_TILE = 3`, `SIDEWALK_WALK_M = 0.23`, and optionally `TILE_WALK_M: Partial<Record<CalibrationKey, number>>`.
  - `models3d.ts`: `applyModels(bundle, set, opts?: { keepPoints?; keepRects?; furnitureFilter?: (pieces: readonly FurniturePiece[]) => FurniturePiece[] })`, and `dressSites(..., frames?: ReadonlyMap<string, TerraceRun["frame"]>)`, putting the frame into `DressSite.run.frame`.
  - The builder may rename any of these. No new dependency.
- `tilemetrics.ts` (D): `type TileCheckId = "T1" | ... | "T9"`, `TILE_CHECK`, `tileMetrics(...)`, `evaluateTiles(...)`.
- `sills.ts` (F):
  - `DOOR_SILLS`, `SILL_MAX_M`, `SILL_WINDOW_CLEAR_M`, `STEPS_KEY`, `STEPS_RISE_M`, `STEPS_SCALE_Y`;
  - `stackSill(stack, table)` and `houseSill(key, table)`, each returning `{ sink_m; steps; leftOver_m }`.

  No new dependency. The builder may rename any of these.

## For the later tickets (not built here; recorded so they start from it)
- **The circuit on the grid** (Josh's item 1): nodes on tile-grid points, wires as 90 degree runs along tile streets, `townLayout(puzzle)` replaced by the tile city fitted to the circuit's bounds. It inherits finding 7 (tile streets are about twice as wide as today's; the camera and `OCCLUDE_SLOPE` rules need re-checking) and must keep the Decided cut and Relight looks (chapter 9).
- **Power lines on the tile streets** (Josh's item 4): poles stand in this ticket's `PoleSlot`s. The City Pack's cable models (finding 5) are fixed spans: `Power_Cables_01` fits the 12.5 m slot pitch unscaled. The pack has no pole, arm, insulator or transformer, so those stay `apocalypse-power`'s or code-drawn, and 041's Decided rule ("wooden poles of one style on the pavement, each carrying three conductors on a cross-arm") holds. Using pack cables for puzzle wires would change the conductors the Decided cut and Relight looks are drawn on (042 Q9); the ticket can offer them for scenery spans and must put any wider use to Josh. Lifting `SM_Prop_Power_Cables_*`, `SM_Prop_LightPole_*` or `SM_Prop_PowerBox_*` from `CITY_NEVER_USED` is a question for Josh in that ticket.
- **Ten new puzzles** (Josh's item 3): a puzzle-designer ticket after the circuit ticket; new files in `puzzles/`, nothing in `puzzles/locked/` edited.

## Risks
1. **Tile orientation is unknown until seen** (finding 2). The sheet (criterion 17) exists for it; a wrong yaw is a one-line `TILE_FRONTS` fix.
2. **The sidewalk tile may not be a solid 0.30 m slab** (a thin slab with a raised lip would leave a step at the shopfront). Seen on the sheet; if so, `SIDEWALK_TOP_M` and design item 7 are re-cut. *Confirmed 18 Nov 2026 (C builder, from the GLB): the walking surface is 0.23 m with a 0.30 m kerb lip. Fixed in E, criterion 28 (the walk at 0, the road at -0.23 m), with an eye check in criterion 31.*
3. **`Sidewalk_Dip_01` may not read as a kerb cut.** Fallback: Town Pack's `Sidewalk_Driveway_01` (another atlas; Josh decides, Q6).
4. **The tile city's runs are longer and straighter than the ladder's** (40 to 60 m sides); the packer's far-gap shares may move. Criterion 10 holds it to the ladder's share; a miss is reported, not loosened.

## Open questions for Josh (recommended defaults apply if he approves as is)
1. **Parked cars?** Default: **no cars**. Your overnight goal left vehicles out, and the City Pack's cars convert about 100 times too big (finding 4), so they need a scale fix first. The bays are drawn with lines and recorded, so cars can be added by a later ticket in one step.
2. **Street widths.** Default: two-lane streets with parking on one side (25 m), avenues with parking on both (30 m), one grid line in three an avenue. Alternative: all 20 m two-lane streets, parking in lots only.
3. **A parking garage?** Default: none. The City Pack has no garage; SIMPLE Town's garages are the old style. Off-street parking is the surface lots behind kerb cuts.
4. **Block size.** Default: 40 to 60 m sides (8 to 12 tiles), inside left as dark yard. Alternative: smaller blocks (30 to 40 m) for a denser grid, or rear parking courts inside the blocks.
5. **Levels.** Default: the road sits 0.30 m below the pavement, so the pavement is flush with the shopfronts and lots. Alternative: raise every lot 0.30 m instead (moves every building, stack and prop).
6. **Kerb cuts.** Default: the City Pack's `Sidewalk_Dip_01`. If it does not read as a driveway, the Town Pack's `Sidewalk_Driveway_01` (a second texture atlas on the street).
7. **Pole room.** Default: reserve pole slots on the pavement every 12.5 m, 0.75 m from the kerb, and keep furniture off them; nothing is drawn there until the power-line ticket.

### Added 18 Nov 2026 with section E (answered 18 Nov 2026: Josh approved E with both defaults, "I approve one through three")
8. **The centre line.** The lane tiles `Road_Lines_01/02` have a white edge line on both sides and no centre mark, so two lanes side by side read as a white double line down the middle. The pack's `Road_YellowLines_01/02` carry a yellow line, and they are not on the never-used list. Default: **use the YellowLines pieces for every lane cell**, yellow edge on the centre line. Alternative: keep the white pieces.
9. **The tile view's default lighting.** Default: **night, as the game and every ladder map**, with `&light=day` for judging the tiles (fixed in E so it works overhead); the sheet is always lit. Alternative: the dev-only tile view opens in daylight.

### Added 18 Nov 2026 with section F (answered 18 Nov 2026: every default applies, "Approved and confirmed")
10. **Where the sill rule applies.** Default: **everywhere**, on the tile city and the ladder maps. These are the same buildings, and a door nobody can reach is wrong on both. Only building and dressing heights and the steps change on the ladder (criterion 36). Alternative: the tile city only, for now.
11. **The threshold.** Default: a sill up to **0.15 m** is left as a door step. Alternative: 0.05 m (every visible plinth sinks).
12. **Steps or sink.** Default: **sink first**. Steps only for a house whose sinking would bury its ground-floor windows, and never on a terrace. Alternative: steps at every house door, and sinking only for stacks.
13. **The steps model.** Default: the Town Pack's `SM_Bld_House_Concrete_Steps_01` (a second atlas, beside the houses that already use it), code-drawn when absent. Alternative: code-drawn steps everywhere.

Decided rules: none is touched (rendering only, no puzzle); `rules-coverage.md` does not change.
