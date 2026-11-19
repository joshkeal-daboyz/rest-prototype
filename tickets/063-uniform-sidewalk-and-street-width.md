# 063 · Tile city fixes from Josh's daylight look: one sidewalk colour, street width, plain interior paving, roofs and corners, kerbs, paved inlets (and the index of 064 to 068)

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: re-cut on 19 Nov 2026 on `docs/city-grammar.md`.
- **Built.** A, D and H are merged. E1 and E2 are built on `ticket/063e-corners-roofs`, in gate and review. F is in review.
- **B.** Built on `ticket/063b-street-width` (32c047e, 1d68216). P1 fails on cities outside criterion 7's list, so B2 (the bay allocator's re-cut, 19 Nov 2026) goes on the same branch before B merges.
- **Next.** B2. 063's sections C, G and I moved to tickets 064 to 068.
- **Decisions.** Josh's answers and the goal waiver are recorded below and in the grammar's status lines.

branch: `ticket/063a-pavement` (A, D, H, merged), `ticket/063e-corners-roofs` (E1, E2), `ticket/063f-kerbs` (F), `ticket/063b-street-width` (B, B2)

## Index: the build order (the grammar's order)
| Order | Ticket or section | What | Size | Status |
| --- | --- | --- | --- | --- |
| done | 063 A, D, H | one sidewalk piece; plain interior paving; paved inlets | | merged |
| in flight | 063 E1, E2 | corner open side measured; one footprint per column (and M2, M9's alignment) | | gate and review |
| in flight | 063 F | the kerb line, with returns at inlets | | review |
| 1 | **063 B** | street width: no avenues (grammar rule 10; Q7) | half a day | built; merges with B2 |
| 1a | **063 B2** | the bay allocator re-cut: a first tile for every block by matching, so P1 holds again | half a day | next, on B's branch |
| 2 | **064** | the lattice: 5.0 m bays on a 5.0 m band, columns on bodies, no passages (M1, M5's passage line) | 1 day | after B, E1, E2 |
| 3 | **065 A, then 065 B** | back to back, the plan: ring 2, openings, lane rows, M3, M4, M5, M6 extended, M8, R9 | 2 days (two builder rounds; C1 is bigger than one) | after 064 and F |
| 4 | **066** | back to back, drawn: quiet dressing, partner colourways, drives paved through ring 2 | 1 day | after 065 |
| 5 | **067 A and 067 B** | party walls dressed (M7, the pipe lift); strips | 1 day each | after 066 |
| 6 | **068** | the roof exit (M9's exit part) | half a day | after 066 |

Each ticket has its own Files list, criteria with failing fixtures, checks, Josh's words and dependencies.

## Josh's words (19 Nov 2026, in chat, looking at the tile city in daylight)
> "Make the side walk one uniform color. I also see alot of this. The streets do not need to be 4 tiles wide."

> "I also see a lot of this going on. There is white space behind the buildings. To form the backs of buildings you can re use the stacked build blocks of the same type."

> "Are these tiles supposed to represent plots where trees should be planted? It looks like the textures aren't being used properly"

> "I also see a lot of this going on. The building roof tiles aren't properly scaled and the corner peices aren't being used properly"

> "You can see the misalignment and scaling on this red building"

> "corner store is not angled on the corner"

> "It's ok to have curbs that stretch out like this in spots but the curb structures have to follow the crub."

> "Here is an example of how the curbs may flow in this case scenario" (a screenshot of an inlet between buildings, with two green lines: on each side of the opening, the street kerb turns in at a rounded corner and runs along that side of the opening to the building line)

> "roof top exists shouldn't open to the street. They should be on the roof."

> "If you're going to have an inlet to areas between buildings it needs to be paved"

> "the buildings are intended to be butted up against eachother. You can see this illustrated in the screenshot and you can compare to the gap in the screenshot I provided" (a reference image of a continuous terrace, wall to wall, and a street view of ours with a vertical sliver of ground showing between a red brick building and an olive one, from the pavement to the roof line)

> On the grammar's questions (`docs/city-grammar.md`, "Decide first"), 19 Nov 2026. Only Q1 and Q3 carry words of his own:
> - Q1, corner pieces wherever two open sides meet: "Yes, allow it (Recommended)" (the grammar's rule 7 records the earlier wording "Yes, any corner").
> - Q3, the wall above a lower neighbour's roof: "Dress it, lift the pipes (Recommended)".
> - Q2 (backs are other buildings), Q4 (retire the gated passage), Q5 (keep 0.15 stalls a home and every threshold; measure in 065), Q6 (strips, in 067) and Q7 (no avenues, this ticket's B1) each take the recommendation under his goal waiver: "I don't want to constantly approve all of these improvments."

Rulings already in the guide that every section keeps:
- 19.1, Decided (Josh, 18 Nov 2026): "It's okay if the buildings rest on top of the sidewalk and overlap a little bit. It is not okay if the buildings sit recessed from the sidewalk and leave a gap of nothing between them."
- 19.4, Decided (Josh, 18 Nov 2026): "Grass and pavement should fill the blank areas."
- Chapter 2, Decided (041, Josh, 17 Nov 2026): no building model is ever shrunk or grown to fit a lot. So nothing in this ticket scales a building piece. Scaling is not an option here; it would need Josh to change that rule.

No GDD Decided rule is touched. Nothing under `src/grid/`, `src/night/`, `src/core/` or `puzzles/` changes. The tile city (`city=tiles`) is a dev view with no circuit, so no gameplay changes.

## What the architect found (19 Nov 2026, `goal/city-style` at `5c4329c`, no browser)
Measured by reading the code, the converted manifest, and `city-pack.glb` (the converted City Pack, in `assets/private/out/`): its JSON chunk, and the embedded atlas PNGs decoded in a scratch script. No test reads assets.

### A. Why the sidewalk has two shades
- **Where the variants come from.** `tilecity.ts` gives each `pavement` cell variant `(hash >>> 8) & 1`, with a grate where `hash % GRATE_ONE_IN === 0`. Each `buildout` cell gets `(hash >>> 8) & 1`. `TILE_SLOTS.pavement` is `[Sidewalk_Straight_01, Sidewalk_Straight_02, Sidewalk_Grate_01]` and `TILE_SLOTS.buildout` is `[Straight_01, Straight_02]`, so about half the cells of each are `Straight_01`.
- **The colour is not the difference.** The two straights have the same mesh to within a few vertices and the same UVs. Their walking surface samples the same texel colour: `#8c8987` for the slabs and `#7b7b79` for the kerb lip and joints. The grate, `Dip_01`, `Dip_Corner_01` and `Panel_02`'s slab sample the same two colours.
- **The material is the difference.**
  - `Straight_01`'s material (`blinn268.002`) is the only `alphaMode: "BLEND"` material on any piece the tile view uses. Its image is the GLB's second copy of `PolygonCity_Texture_01_A`, whose alpha channel is mostly below 255: 1,021,173 of 1,048,576 pixels, alpha 102 and 44 of 255 at the slab's UVs.
  - So every `Straight_01` cell draws at about 17 to 40% opacity, and whatever lies under it shows through: the ground (day `0x7d8471`, a sage grey-green) or the road. Those are the "pale sage-green slabs", and the darker build-outs over the parking band.
  - `Straight_02` (`blinn283.125`) is opaque, on `PolygonCity_Texture`, whose alpha is 255 everywhere.
  - The only other BLEND piece in the pack is `Sidewalk_Merger_01`, which is not used.
  - The converter's handling of that atlas copy is a `tools/` matter, outside this ticket (Open item A1).
- **Colourways are not the cause.** `paintStack` clones only a stack group's materials. Tiles and interiors are never painted.

### B. How wide the streets are now
- **The cells.** `TILE_M` is 5 m, and the profiles are in `tilecity.ts`:
  - avenue `[pavement, parking, lane, lane, parking, pavement]`: 6 cells, 30 m. The carriageway is 4 cells, 20 m.
  - street `[pavement, parking, lane, lane, pavement]`, with the parking band on a hash side: 5 cells, 25 m. The carriageway is 3 cells, 15 m.
  - Each lane is one full 5 m cell (`Road_YellowLines_01`/`_02`, the pair making the centre line).
- **How many avenues.** `AVENUE_ONE_IN` is 3, and every axis gets at least one interior avenue. On the default 3 x 3 city that is about 105 m of street per axis (one avenue and three streets, 19.3).
- **What Josh saw.** Only an avenue has a 4-cell carriageway, so the "4 tiles wide" street in his screenshot is most likely an avenue (parking, two lanes, parking). On a street whose parking band is build-outs, the road shows only two cells.
- **What depends on street width.**
  - 056 parking (chapter 18): bays go in the parking band, avenue sides first, under `KERB_BAY_SHARE_MAX` `{ avenue: 0.4, street: 0.3 }`; build-outs and street trees fill the rest; checks P1 to P6.
  - 055 junction and crossing tiles: a junction is carriageway by carriageway (3x3, 3x4 or 4x4 cells); a crossing is as long as the carriageway.
  - 059's pole plan (approved, not built): poles on the side without the parking band, an avenue's side by hash, lights staggered on both sides of an avenue, a junction span of at most one carriageway plus 1.5 m.
  - 057's block sizes (`BLOCK_TILES`), G1 to G4 and V1 to V4 do not depend on street width: blocks are laid between the street lines. R1, R6 and R7 do not depend on it directly. 19.3's area share (streets about 65% of the city) does.

### C. The white space behind the buildings: moved to 065 to 067
- **What it was.** The white band was ring 2's apron strip, drawn in `PAVEMENT` (day `0xa7abb1`). The pale ground beside row ends was the passage floors.
- **What has been done.** 063 D paved both.
- **Where the backs went.** The backs are now covered by buildings standing back to back (grammar rule 4): tickets 065 (the plan), 066 (the drawing) and 067 (party walls and strips).

### D. The plates on the interior paving: an answer to Josh's question
- **What the plates are.** No, they are not tree plots. The aprons, interior paths and park edges are `SM_Env_Sidewalk_Panel_02` (390 triangles, 5 x 0.094 x 5 m). Modelled into it are two inset plates about 0.04 m below the slab, 3.8 m² in all, with small studs at their corners. They sample `#4a5d4e`, a dark green-grey, and `#5f686e`. They read as utility or service access covers. `Sidewalk_Panel_01` (the plaza piece) has the same pair.
- **The texture is used correctly.** The material is opaque, on the base `PolygonCity_Texture`, and no colourway reaches it. The plates are what the pack drew.
- **Where the trees come from.** Our trees are separate pieces (`greenProps`, `buildoutTrees`).
- **The plain piece.** The pack has a plain flat slab, `SM_Env_Sidewalk_01`: 5 x 0.034 x 5 m, 38 triangles, opaque, on `PolygonCity_Texture`, with only `#8c8987` slabs and `#7b7b79` joints, the very colours of `Straight_02`'s walk.

### E. Roofs, storeys and corners
- **Nothing is scaled.** Every stack piece is drawn at `WORLD_PER_METRE`. What Josh reads as "scaling" is pieces of different true sizes, each placed by its own bounds.
- **In x,** every piece of a column is centred on the column's axis. The column is as wide as its floor piece.
  - Mid column: `Apartment_01` is 5.000 m, `Roof_01` 5.310 m (0.155 m over each side), `Shop_04` 5.106 m.
  - Corner column: `Apartment_Corner_01` is 5.196 m, `Shop_Corner_01` 5.377 m (0.09 m over each side), `Roof_Corner_01` 5.904 m (0.35 m over each side).
  - So the trims and roofs overhang by different amounts on each side, and the corner flank steps in and out from storey to storey.
- **In z,** under "wall" alignment (`stacks.ts`, `zExtent`), each piece's wall plane goes on the wall line, but a roof has no measured wall, so its front bound goes on the line. Each back then lands at the piece's own depth.
  - The roof's back overhangs the top floor's back by up to (5.918 − 5.196) m plus the floor's wall offset, about 0.8 to 1.0 m.
  - The floor's sills stand in front of the roof's front.
  - The storeys' backs step by up to 0.7 m (shop 5.886 m against floor 5.196 m).
- **The corner pieces' open side is wrong.**
  - `BUILDING_FRONTS` gives every City Pack corner piece `open: "+x"`, a guess (chapter 7: "Guesses: no data says which end"), and `cand()` turns the piece by it.
  - Measured in the GLB, `Shop_Corner_01_Glass` and `_02_Glass` have their faces on +z and −x, `Shop_Corner_02` has its chamfer on the −x+z diagonal (2.6 m²), and the L-shaped corner awning `Shop_Cover_05` lies on +z and −x. So the shop corners' second street face is **−x**.
  - With "+x", a corner column at a row's +x end keeps the piece unturned, and its chamfer and glass point into the neighbouring column ("corner store is not angled on the corner"). At the −x end the piece turns −90°, and its shop window faces the block's interior.
  - The apartment corner floors are symmetric in face area. The roof corners' L-shaped trim (Josh: "along its front edge and left edge", that is +z and −x) matches the same −x open side. So "corner pieces not used properly" and "the red building" are one cause in two parts: the wrong open side, and no shared footprint.
  - `facade.ts`'s `WALL_SIDE_M` was measured on the +x face, and `wallOffset` applies it only when the open side is "+x".
- **What a model look would settle.** Which sides of each roof piece carry the parapet or cornice (an intended overhang); whether `Roof_0n` is meant for `Apartment_0n` (`Roof_02`, 5.252 x 5.488, fits `Apartment_03`, 5.281 x 5.497, best); the apartment corners' and roof corners' true open side; and the "triangular spike" (likely a mis-turned corner piece's quoin).

### F. Kerbs
- **Where the pack's kerb face stands.** In every pack sidewalk piece the kerb face is **0.63 to 0.68 m inside** the 5 m cell, not on its edge:
  - `Straight_02`: +z faces at 1.82 to 1.87 m from the centre;
  - `Dip_01`: 1.85 m;
  - `Dip_Corner_01`: +x at 1.83 m;
  - `Grate_01`: 1.81 to 1.88 m.
  - The lip top is 0.30 m and the walk 0.23 m. The 0.65 m beyond the face is gutter at road level.
- **Where the layout puts the kerb.** On the cell edge: `Town.kerbs`, `TileStreet.carriage`, and the code-drawn `kerbStrips`, which are drawn only when a key is missing.
- **Where it jogs.**
  1. A pavement cell in front of a build-out keeps its own kerb and gutter, so a 0.65 m trench at road level runs between the pavement and the build-out.
  2. A build-out is a `Straight` turned to the centre line, and the straight has **no faces on its ±x ends**. Each end of a build-out stretch is an open, unkerbed edge 0.23 to 0.30 m high.
  3. `Dip_Corner_01` against `Straight_02` differs by 0.02 m, which is fine.
  4. The pale, "translucent-looking" run in his screenshot is `Straight_01` (finding A).
- **What a model look would settle.** The dip corner's rounded or dipped side was measured only on the axis-aligned faces. Whether the Town Pack's `Sidewalk_Corner_03` to `_05` would make a bulb-out end is unknown.

### G. The roof exit: moved to 068

### H. The inlet Josh marked
- **What it is.** The opening, two cells (10 m) wide with a kerb-cut ramp, is a residents' court's **drive** (057 C, `DRIVE_CELLS` 2, ring 1). An alley mouth is one cell, so it is not that.
- **What is drawn there.** Its cells are 056's `lotSurface` cells, drawn as `SM_Env_Road_Bare_01`, which is asphalt, the street's colour. Behind it, the court (rings 2 to 4) is bare road with `ParkingLines_01` over each row of stalls.
- **What is around it.** The kerb cut is `Dip_01` on the pavement band. The pale ground at its far edge is ring 2's code-drawn strip or a passage floor (C, D).

### I. Why neighbouring buildings leave a sliver: moved to 064
- **The cause.** Every piece's wall body is 5.00 m, while the packer lays columns by bounds (5.0 to 5.28 m). So walls stand 0.09 to 0.28 m apart at every joint, and 50 of 52 rows end in a passage.
- **The cure.** The lattice (grammar rules 1 and 6), ticket 064.

## Goal
In the tile city in daylight:
- every pavement and build-out is one opaque sidewalk piece of one colour;
- block interiors, passage floors and the inlets between buildings are the same plain paving, with no inset plates and no white strip;
- each building's storeys, trims and roof share one footprint, and its corner pieces turn the corner (the corner store's angled face on the corner);
- the kerb runs as one unbroken line round every build-out and into every inlet;
- every street is 25 m with a 15 m carriageway (no avenues).

Wall-to-wall rows, back-to-back buildings, dressed party walls and roof exits are the goals of 064 to 068.

## Sections
| Section | What | Size | Needs |
| --- | --- | --- | --- |
| A | One sidewalk piece: `Straight_02` for every plain pavement and build-out cell | half a day | merged |
| B | Street width: no avenues (B1; Q7 adopted under the waiver) | half a day | built; P1 short outside criterion 7's list |
| B2 | Parking allocator re-cut so P1 holds again | half a day | next, on B's branch; B merges only with it |
| C | moved: 065, 066, 067 | | |
| D | Plain interior paving: `Sidewalk_01` for the apron, the strip, the paths, the park edge and the passage floors | half a day | merged |
| E1 | The corner pieces' open side, measured (the corner store, the roof-corner trim); grammar M6 | 1 day | built, in review |
| E2 | One footprint per column: storeys, trims and roof aligned on measured wall planes; grammar M2 and M9's alignment | 1 day | built, in review |
| F | The kerb line: one continuous kerb, build-outs and inlet returns | 1 day | in review |
| G | moved: 068 | | |
| H | Paved inlets: court drives and alley mouths, paved through the row | half a day | merged |
| I | moved: 064 | | |

## Acceptance criteria
**CI-safe throughout:**
- Typed-in fixtures only.
- Every measurement of the real GLB or manifest sits inside an `it.skipIf(!have)`, with the file read lazily inside the test, never at `describe` level.
- No Windows paths, no timer under 1 s.

**Ladder unchanged** unless a section says otherwise: `townpin.test.ts` and `packpin.test.ts` pass untouched, and `npm run playtest` has no snapshot change.

**No existing check is loosened:** G1 to G4, V1 to V4, P1 to P6, R1 to R13 and the tile floors, `escapeCheck`, the sill checks, and the draw-call caps keep their numbers. Each builder runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. The main session runs `npm run gate`, checks that the test count grew, runs `npm run playtest`, checks that the diff is inside Files, and checks that `git ls-files assets/private` is empty.

### A. One sidewalk colour (Vitest unless marked)
1. [ ] **Slots and variants.**
   - `TILE_SLOTS.pavement` is `[Sidewalk_Straight_02, Sidewalk_Grate_01]` and `TILE_SLOTS.buildout` is `[Sidewalk_Straight_02]`. `Straight_01` is in no role and not in `tileKeys()`.
   - `tilecity.ts` gives a plain pavement cell and a build-out variant 0, and a grate keeps its hash rule (`GRATE_ONE_IN`), now `PAVEMENT_GRATE` = 1. `PAVEMENT_STRAIGHT_2` is removed.
   - The grates stay, unless Josh objects (Q-A).
2. [ ] **One piece.** On the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4, every `pavement` cell that is not a grate and every `buildout` cell resolves (`tileKeyOf` with every key active) to `city-pack:SM_Env_Sidewalk_Straight_02`. A fixture of today's variant rule fails it.
3. [ ] **Opaque, guaranteed** (`it.skipIf`, GLB read in the test): every key in `tileKeys()` and `INTERIOR_KEYS` has only materials with `alphaMode` not "BLEND". Today's slots fail this on `Straight_01`.
   - `Straight_02`'s, `Grate_01`'s, `Dip_01`'s and `Dip_Corner_01`'s largest walking-level faces sample the same texel colour (the slab colour; today `#8c8987`), read from the embedded atlas at their UVs.
   - This is how one colour is guaranteed: one key, so one geometry and one opaque material, drawn as one InstancedMesh. Every plain cell is then the same texels under the same light.
4. [ ] **Nothing else moves.** The cities' cells deep-equal today's except `variant`. The layout, bays and interior are unchanged, and the tile draw calls do not grow: one key fewer.
5. [ ] (Main session, screenshot, `npm run dev`) `/?puzzle=01-first-light&view=3d&city=tiles&light=day`, overhead and `&cam=street`: no pale or translucent slab on any pavement or build-out.

### B. Street width: B1, no avenues (grammar rule 10; Q7 adopted under Josh's goal waiver, "I don't want to constantly approve all of these improvments.")
Built before 064, because it fixes the row lengths that the lattice cuts. Checks built here: the grammar's "street width" line (every carriageway 15 m, criterion 8).
6. [ ] **B1, no avenues.** Every street line is the 5-cell street profile, carriageway 3 cells (15 m). `AVENUE_ONE_IN` becomes an off switch (0 = none), and 056's avenue-first bay order and `KERB_BAY_SHARE_MAX.avenue` are left in place, unused.
7. [ ] P1 to P6 (`parkmetrics.test.ts`), G1 to G4, V1 to V4, R1 at `TILE_CITY_R1_MIN`, R6, R7 and the 057 C interior shares hold on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4, with no threshold changed. If P1's floor cannot hold, the builder stops and reports: it is a re-cut, not a looser band.
8. [ ] A test pins every street's carriageway at 15 m and the largest junction at 3 x 3 cells. Tests that asserted an avenue exists are changed to assert that none does, and are listed in the report.
9. [ ] The guide's 19.3 and chapter 18's measured lines are re-measured. The builder reports street metres per axis and the streets' share of city area, before and after.
10. [ ] (Main session, screenshot) the same URLs as criterion 5: no 4-cell carriageway.

### B2. Parking allocator re-cut so P1 holds again (Vitest unless marked)
**Why.** B is built (32c047e, 1d68216). Criterion 7 holds on its list, but P1 (every block has a tile of bays serving it) now fails on cities outside it:
- 3 x 3: seeds 12, 15, 17 (two blocks), 18, 19 (two blocks);
- 6 x 4: seeds 5, 7, 11, 12, 15, 16, 18 (two blocks).
- At e23a494, before B, it failed only on 6 x 4 seed 18.

**The cause.** With the avenues gone there is one parking band to a street, and `KERB_BAY_SHARE_MAX.street` (0.3) caps a side of up to 13 cells (65 m) at one tile. 056's allocator in `tilecity.ts` is greedy: blocks in order (fewest own parking sides first, ties by id), own sides first, then the band across the longest street. So a block can find every band round it already full, because a neighbour across the street took the only tile earlier in the order.

**Authority.** This restores an existing check without changing any rule Josh approved, so it is within his goal waiver (19 Nov 2026): "I don't want to constantly approve all of these improvments." `LOTS_PER_BLOCK_MAX`, `BAY_TILES_PER_BLOCK_MIN`, `KERB_BAY_SHARE_MAX`, `BAYS_PER_100M_MAX`, `BAY_RUN_TILES_MAX`, `KERB_GAP_MIN_M`, `PARK_SUPPLY_BAND`, every P, G, V and R threshold, the tile floors and every GDD rule stay as they are.

**Goal.** Every block of every tile city on 3 x 3 seeds 1 to 20, 6 x 4 seeds 1 to 20 and the default city has a whole tile of kerb bays serving it, on a band it faces or a band across one of its own streets. The rest of chapter 18 is unchanged: caps, runs, gaps, the supply band and the lots.

**The rule (Default; the architect's, adopted under the waiver).** The bays are laid in two phases. Both phases are deterministic and use no hash beyond the existing `bay` offset in `startsOf`.
1. **First tiles, by matching.**
   - **Blocks and slots.** Every block (whole-block parks included, since P1 counts them) needs `BAY_TILES_PER_BLOCK_MIN` (1) tile. The slots are the band tiles. A band of a non-park block offers `capacity(band)` slots: the largest k up to the side's cap for which `startsOf` places k tiles, packed into runs of at most `BAY_RUN_TILES_MAX` as `tryAdd` would pack them. Outer bands and park bands offer none, as today.
   - **Who may take a slot.** A block may take a slot on any band of its own sides, or on the band across any of its own streets whose block is its neighbour across that street (`sd.neigh`, so P1's `adjacent` holds). This is the "tile on another side of its streets" option. A shared tile is **not** an option, because P1 counts a whole tile's bays (`BAY_TILES_PER_BLOCK_MIN x BAYS_PER_PARKING_TILE`) for each block, and `parkmetrics.ts` is read, not edited.
   - **The matching.** It is a maximum bipartite matching by augmenting paths (Kuhn's algorithm), with blocks in 056's order (fewest own parking sides first, ties by id). Each block's options are tried in a fixed order: its own bands (longer first, ties by band key), then the bands across its streets (longest street first, ties by band key). A block therefore keeps an own-side tile unless the only way to serve another block is to move it, and then the move goes along an augmenting path, block by block, each to another band it may use.
   - **The city cap.** The matched tiles count against `bayCap` (`BAYS_PER_100M_MAX`) before anything else does.
2. **The rest of the demand, greedy as today.** Each block's remaining need (`max(BAY_TILES_PER_BLOCK_MIN, round(shops x PARK_PER_SHOP / BAYS_PER_PARKING_TILE))` less the first tile) is laid by 056's loop, in 056's order, on the capacity the matching left. Phase 2 never takes a matched tile.
- **Laying.** The tiles are laid on each band as today, by `startsOf` and its runs. A tile's `serves` is the block it was matched or added for.
- **When it cannot be done.** If the matching is not perfect on a city, the unmatched blocks stay in `shortTiles` as today. Criterion 10e then applies.
- **Not part of this rule.** No street's parking band changes side, and no band, cap or run limit changes. Those would be new rules, not a repair.

10a. [ ] **The matcher, pure.** New `matchFirstTiles` (Interfaces) is unit-tested on typed-in fixtures:
   - (i) **Greedy fails, matching succeeds.** Two blocks, A then B in the order, and two cap-1 bands: a on A's own side, b across one of A's streets. A may use a (own) or b (across). B has no band of its own with room and may use a only (across its street from A). Greedy gives A band a and B nothing. The matcher gives B band a and A band b. A larger case of the same kind (a chain of three blocks, where the augmenting path moves two tiles) is a second fixture.
   - (ii) A case with no perfect matching (Hall's condition fails: two blocks whose only option is one cap-1 band) leaves exactly one block short, the later in the order.
   - (iii) **Deterministic.** The same input twice gives the same assignment, and so does the same `capacity` built in a different insertion order. Only the order of `blocks` and of each block's `options` may change the result.
   - (iv) Every assignment uses only that block's own options, and no band gets more than its capacity.
10b. [ ] **P1 holds on forty-one cities** (`parkmetrics.test.ts`): P1 is 0 on the default city, 3 x 3 seeds 1 to 20 and 6 x 4 seeds 1 to 20.
   - **Failing fixture.** The cities above that fail at 1d68216 (3 x 3 seeds 12, 15, 17, 18, 19; 6 x 4 seeds 5, 7, 11, 12, 15, 16, 18) are named in the test, so it fails on B's allocator.
   - **Speed.** The test keeps a timeout of at least 120 s and builds each city once. No more workers: `--maxWorkers=2` as above.
10c. [ ] **The exception goes** (`alleys.test.ts`):
   - `P1_ONE_SHORT` and its exact-set check are removed. The parking loop of the "holds the checks on the packed cities" test fails on any failing check again, with no named exception.
   - **Failing fixture.** A typed-in fixture proves the old layout fails P1. It takes 6 x 4 seed 5 as B left it: the same city with its unserved block's only tile reassigned (`serves` set to the neighbour that took it), or with that block's tile removed. `evaluateParking` gives P1 = 1 on it. The fixture is built from the city's data in the test, not pinned by hash.
10d. [ ] **Nothing else gives** (no threshold changed):
   - P2 to P6, the bay-share caps (`KERB_BAY_SHARE_MAX`, P3), G1 to G4, V1 to V4, R1 at `TILE_CITY_R1_MIN`, R6, R7 and the 057 C interior shares hold on criterion 7's cities (the default, 3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3), as they did at 1d68216.
   - On 3 x 3 and 6 x 4 seeds 11 to 20, the builder reports any P2 to P6 failure before (1d68216) and after. B2 adds none.
   - **Before and after.** The builder reports the default city's numbers at 1d68216 and after B2: kerb bays (57 at 1d68216), court stalls (66), R6 (0.520) and R7 (0.509). It also reports, for each of the twelve named cities, which blocks moved tile and to which band. The court stalls must not change: lots are not this allocator.
10e. [ ] **Stop rule.** If P1 cannot be met on every seed 1 to 20 at both sizes without exceeding a cap (a side's `KERB_BAY_SHARE_MAX` share, `bayCap`, `BAY_RUN_TILES_MAX`, `KERB_GAP_MIN_M`, the supply band), the builder stops. It does not loosen anything. It reports each such city with its blocks, the bands each could use, their capacities and the Hall shortfall (the set of blocks with fewer usable slots than blocks). It is then a re-cut for the architect and Josh.
10f. [ ] **Digests re-taken on purpose** (`tilecity.test.ts`):
   - The city-data digests of 063 A, D, H and F (`AT_063B`: 3 x 3 seeds 1, 2, 3, 6 x 4 seed 1) are re-taken as `AT_063B2`. The current values are kept in the test as `PINS_BEFORE_063B2`, in the style of `PINS_BEFORE_063B` (kept for the record, with the reason in a comment). `PINS_BEFORE_063B` stays as it is.
   - A city's digest may stay the same, if the matcher left its bays as greedy laid them. So the "re-took on purpose" test asserts: the pins named in a typed-in `MOVED_BY_063B2` set differ from their `PINS_BEFORE_063B2`, and the rest equal theirs. The builder lists which moved and why.
   - The "bites" test keeps working against `AT_063B2`.
10g. [ ] **Guide, chapter 18.** It gets its own lines, per criterion 45: 18.3 and 18.6 state the two-phase rule (first tiles by matching, then the greedy rest), as **Default**. 18.8's measured lines are re-measured. No Decided line and no number in a Numbers row changes.

**Note, report only (no change).** The builder found R6 tight: 0.491 on 3 x 3 seed 9, below the ladder's 0.5. The tile city's floor is 0.45 (18.7), so it passes. B2 reports R6 on 3 x 3 seeds 1 to 10 before and after, and changes neither R6's floor nor the ladder's.

### C. Moved
Criteria 11 to 17a are replaced by tickets 065 (the plan: M3, M4, M5, M6, M8), 066 (the drawing) and 067 (M7 and strips). The C-rows recommendation stands, as the grammar's rule 4. `BACK_OVERSHOOT_MAX_M` and `BACK_COVER_MIN` are retired by the lattice.

### D. Plain interior paving (Vitest unless marked)
18. [ ] `INTERIOR_KEYS.apron`, `.path` and `.parkEdge` are `[SM_Env_Sidewalk_01]`. `INTERIOR_KEYS.strip` is `[SM_Env_Sidewalk_01]`: the ring-2 strip is a pack tile from now on, with the code quad as its fallback only. The passage floors are drawn from the same key (one instance per whole or part cell, laid on the floor's rectangle; a part cell keeps the code quad).
19. [ ] `TILE_BASE_M[Sidewalk_01]` is measured from the GLB (its largest up-facing level; today about 0.03 m), so its top is the walk's. The value is pinned as a fixture and re-measured within 0.01 m in an `it.skipIf`.
20. [ ] **No plates** (`it.skipIf`): every up-facing face of every interior paving key samples only the slab and joint colours of criterion 3, and nothing more than 0.02 m below its top covers over 0.1 m². `Panel_02` fails this.
21. [ ] **Nothing else moves.** `TileCity.interior` is unchanged (roles and variants as data), and so is G3. The interior draw calls stay at or under today's (one key replaces `Panel_02`, and the code pavement quad goes when the key loads). `INTERIOR_DRAW_CALLS_MAX` is unchanged.
22. [ ] (Main session, screenshots) the green paths and the aprons are plain paving of the street pavement's colour, and the strip behind the rows matches the apron.

### E1. The corner pieces' open side (Vitest unless marked)
23. [ ] **Measured open sides.** New `measureOpenSide(mesh)` (in `facade.ts`) finds a corner piece's second street face. It is the side among ±x that carries the glass or the window reveals (062 A's recessed-face method), or, for a roof corner, the parapet or cornice band. It runs in an `it.skipIf` on every corner piece of `STACK_STYLES`.
    - Each result is pinned as a typed-in table, `OPEN_SIDE_MEASURED`, with its reason.
    - Expected from the architect's look: `Shop_Corner_01` and `_02` are "−x". The apartment and roof corners the builder measures and reports. A key that cannot be read stays on its current value and is listed for Josh's stack-gallery check.
24. [ ] `BUILDING_FRONTS` (models.ts) takes the measured `open` for those keys. A value Josh saved in the gallery still wins.
    - `WALL_SIDE_M` is re-measured on the measured open face, pinned, and re-measured within 0.02 m.
    - `wallOffset` reads the open side, whichever it is, not only "+x".
25. [ ] **The angled face on the corner.** For every corner column on the default city, seeds 1 to 10 and the three protocol maps, the turned piece's measured open face lies on the cross street's side, its front on the row's street, and (for `Shop_Corner_02`) its chamfer normal points out of the block, toward the junction.
    - The corner glass (`Shop_Corner_*_Glass`) and the L awning (`Shop_Cover_05`) follow their host's yaw.
    - A fixture with "+x" fails this.
26. [ ] **Ladder.** This fixes the ladder's corner stacks too (Q-E). Only corner pieces' `yaw`, `x` and `z` and their dressing's change. `packpin.test.ts` is re-pinned in the same commit, and a test lists every changed field and checks it is one of those. `townpin.test.ts` is untouched. Playtest snapshots do not change (they are 2D).
27. [ ] (Main session, screenshots) a corner shop on the tile city and on `09-shrine-circuit`: the angled glass is on the corner, and the roof corner's trim runs along the two street faces.

### E2. One footprint per column (Vitest unless marked)
28. [ ] **Body planes.** New `BODY_M` (in `facade.ts`): for each stack key, how far inside its bounds its wall planes stand on each of front, back, −x and +x. A roof's are its parapet's outer faces. They are measured from the GLB (the largest vertical plane within `WALL_REACH_M` of each bound, 057 A's method), pinned as fixtures, and re-measured within 0.02 m in an `it.skipIf`.
29. [ ] **The rule** (`assembleStack(..., { footprint: "body" })`; the tile city passes it, and the default is off so the ladder is unchanged):
    - Every piece of a column puts its body box on the column's footprint, which is the column's floor piece's body.
    - In front, the wall line is unchanged (057 A).
    - At the sides, the planes are centred on the column, except in a corner column, where the outer flank plane is on the column's outer edge.
    - At the back, the plane is on the floor body's back. A base piece may stand deeper at the back, never shallower.
    - The roof's body is on the top floor's body. Its cornice overhangs by what the piece really carries.
30. [ ] **The check.** In every column of every stack on the default city, seeds 1 to 10 and 6 x 4 seeds 1 to 3:
    - the side planes of every storey and the roof agree within `STOREY_ALIGN_TOL_M` (0.03 m);
    - the floors' and the roof's back planes agree within the same tolerance;
    - a corner column's flank planes agree within it, so the corner lines up.
    - Today's placement fails this. The red building's case (a roof body more than 0.3 m wider than the floor) is a named fixture.
31. [ ] **Roof pairing.** If a style's roof body still differs from its floor body by more than 0.1 m on a side after criterion 29, the builder reports it. It does not re-pair roofs across styles: that is Q-E2.
32. [ ] G1 (street-level walls on the line), the sills (062) and the escapes (`escapeCheck`) still pass. `packpin.test.ts` is unchanged, because the option is off on the ladder.

### F. The kerb line (Vitest unless marked)
33. [ ] **The line, pure.** New `kerbLine(city)` (in `src/render3d/kerbline.ts`) returns one polyline per street side, in plan, at the cell edges.
    - It runs along the pavement band's carriageway edge and steps out round every stretch of build-outs: out along the first build-out's flank, along its outer edge, and back along the last flank.
    - It ends at crossings and junctions. It passes kerb cuts, marked as dips.
34. [ ] **Pieces on the line.**
    - `KERB_FACES_M` (`tileslots.ts`) pins, per sidewalk key, each kerb face's side, its inset from the cell edge (today about 0.65 m) and its lip top (0.30 m). The values are typed in and re-measured within 0.02 m in an `it.skipIf`.
    - The drawing plan (`tileKerbPlan(city, keys)`, pure) puts every drawn kerb face, a pack piece's turned by its cell's yaw or a code strip, on `kerbLine` offset by the inset, within `KERB_TOL_M` (0.03 m) in plan and 0.02 m in height.
    - No part of the line goes uncovered for more than 0.05 m, except at crossings and junctions.
35. [ ] **The two jogs fixed.**
    1. A `pavement` cell whose carriageway side is a build-out is drawn with no kerb and no gutter: `Sidewalk_01` lifted to the walk, falling back to a code box in the pavement colour. So the slab runs on, flush, to the build-out.
    2. Each flank of a build-out stretch gets a code-drawn kerb strip, the lip height and the kerb colour (`#7b7b79`), on the flank line from the pavement's kerb line to the build-out's outer kerb face. Alternatively it gets a pack corner piece, if the builder measures one that fits within `KERB_TOL_M`; the builder reports which.
    - Today's plan fails criterion 34 on both, as fixtures.
36. [ ] The code fallback's `kerbStrips` move to the same inset line, so fallback and pack agree. `Town.kerbs` and `TileStreet.carriage` (layout data) stay on the cell edge. `POLE_SLOT_FROM_KERB_M` is unchanged and is recorded as 0.10 m behind the pack's kerb face (059 reads it; Open item F1).
37. [ ] (Main session, screenshots, street camera) along a street with build-outs, the kerb is one line with no trench, no open tile end and no step.

#### F, worked example: the kerb at an inlet (Josh, 19 Nov 2026: "Here is an example of how the curbs may flow in this case scenario")
An inlet is any opening in a row that has a kerb cut: a court drive (2 cells), a frontage lot of `TileCity.frontLots` (2 cells), or an alley mouth (1 cell). A gated passage has no kerb cut and is not an inlet. At an inlet the kerb does not stop and jog. It turns in at a rounded corner on each side and runs along that side of the opening to the building line (the pavement's back edge). Between the two returns, the mouth on the street edge is the kerb-cut dip. Plan view, street at the bottom, a two-cell court drive:

```
   ring 1   ██ building ██|     inlet: paved (H)    |██ building ██
            ──────────────+ . . . building line . . +──────────────
                          ║                         ║
   pavement  Straight_02  ║ Dip_01      Dip_01      ║  Straight_02
   band      (return cell ╰╮ (mouth: dip)          ╭╯ return cell)
            ═══════════════╯ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╰═══════════════
   road      gutter / parking band / lanes
```
`═` is the street kerb, `╯` and `╰` are the rounded returns, `║` is the return kerb running up the opening's side to the building line, and `─ ─` is the dipped kerb of the mouth.

37a. [ ] **The path, pure.** `kerbLine(city)` gives each street side one continuous path from crossing to crossing. At every inlet the path goes along the street edge, round the near return (rounded), up the opening's near side to the building line, then (after the opening, marked `opening`) down the far side, round the far return and on along the street edge. The mouth's edge on the street, between the two returns, is a `dip` segment whose ends meet both returns.
37b. [ ] **The pieces.**
   - The two cells of the mouth are `Sidewalk_Dip_01` (`kerbCut`, as today).
   - The pavement cell on each side of the mouth is the return, `Sidewalk_Dip_Corner_01`, turned so its rounded kerb joins the street kerb to the kerb along the opening's side.
   - The builder measures the dip corner's rounded and dipped sides in an `it.skipIf` and pins them in `KERB_FACES_M`. If a turned `Dip_Corner_01` cannot put its kerb on both legs within `KERB_TOL_M`, the return is drawn as the measured straight plus a code-drawn return strip (lip height, `#7b7b79`, rounded by the piece's radius or squared), and the builder reports which.
   - This needs a new `TileRole` or variant for a return cell. `tilecity.ts` lays it, beside 055 B's kerb cut, and `TILE_SLOTS` stays exhaustive.
37c. [ ] **The test** (pure, on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4):
   - every inlet has a return on **both** sides;
   - the kerb faces of adjacent cells coincide, within `KERB_TOL_M` in plan and 0.02 m in lip height, along the street edge, round each return and along each side to the building line;
   - each return's kerb reaches the building line with no gap over 0.05 m;
   - the `dip` segment joins both returns.
   - A fixture of today's plan (a kerb cut with plain straights beside it, so no returns) fails this, and so does an inlet with one return removed.
37d. [ ] (Main session, screenshot) the inlet Josh marked, on the default city: the kerb turns into the opening on both sides as on his drawing.

### G. Moved
Criteria 38 to 41 are replaced by ticket 068.

### H. Paved inlets (Vitest unless marked)
42. [ ] **What is paved.** The drawing gives every court drive's cells (`TileCourt.drive`, ring 1) and every alley's ring-1 mouth cell `Sidewalk_01` at the walk, the plain paving of D, in place of `Road_Bare_01`. The paving stops where the opening meets the interior:
    - the court's first row of stalls (ring 2) keeps the bare road and `ParkingLines_01`;
    - the alley lane beyond ring 1 keeps the bare road.
    - The kerb cut (`Dip_01`) on the pavement band stays as it is, so the dropped kerb meets paving.
    - The paving starts at the building line, where F's return kerbs end (F's worked example). Paving and returns meet at the walk's level with no step. H can be built before F; until F merges the mouth keeps today's straights beside it.
42a. [ ] **What is not paved.** A frontage lot of a block in `TileCity.frontLots` (a real lot, not an inlet) keeps its asphalt and stall lines.
43. [ ] **The test, pure.**
    - Every drive cell and alley mouth cell resolves to the paving key.
    - Every court stall, aisle and lane cell beyond ring 1 resolves as today.
    - `TileCity` data is unchanged, and so are G4 and `courtLotPieces`: no lines and no barriers on the drive.
44. [ ] (Main session, screenshot) the inlet Josh marked (the default city overhead): paved between the two walls, from the kerb cut to the court.

### I. Moved
Criteria 46 to 52 are replaced by ticket 064, re-cut on the grammar.
- The passage count is 0.
- A leftover gap is a failed check, not something to close, so criterion 51 and Q-I2 go.
- The `wallJoints` check became M1, plus M5's passage line.

### Guide (each section, its own lines)
45. [ ] Each section adds its rule to the guide's chapter (A, D, F, H: 19.8 and 10; B: 3 and 18; E1: 7; E2: 16.3), with Josh's words as **Decided** and the rest as **Default**.
    - Numbers rows cover each new constant.
    - The existing drift checks cover them, and no existing check is edited.
    - A closes the "two plain straights" lines of 056 B. D replaces 19.8's "the ragged strip is always code-drawn".

## Files
- **All sections:** `docs/city-style-guide.md` (their own chapters, per criterion 45).
- **A:**
  - `src/render3d/tilecity.ts` (the pavement and build-out variants only);
  - `tileslots.ts` (`TILE_SLOTS.pavement`, `.buildout`);
  - `tilecity.test.ts`, `tilecity3d.test.ts`, `tileslots.test.ts`, `tileintegrate.test.ts` (only assertions naming `Straight_01` or `PAVEMENT_STRAIGHT_2`).
- **B:**
  - `tilecity.ts` (profiles, `AVENUE_ONE_IN`);
  - `tilecity.test.ts`, `parkmetrics.test.ts`, `frontage.test.ts`, `alleys.test.ts` (re-measured numbers only, never a threshold).
- **B2:**
  - `src/render3d/tilecity.ts`: the kerbside-bay allocator only (the "kerbside bays" block: `BandState`, `tryAdd`, the block order and loops, `shortTiles`), plus the new exported `matchFirstTiles`. No constant changes, and nothing outside that block, except that its export may sit beside it;
  - `tilecity.test.ts` (the matcher's fixtures, `AT_063B2`, `PINS_BEFORE_063B2`, `MOVED_BY_063B2`), `parkmetrics.test.ts` (P1 on forty-one cities), `alleys.test.ts` (removing `P1_ONE_SHORT`, the old-layout fixture);
  - `docs/city-style-guide.md`, chapter 18's lines only (18.3, 18.6, 18.8).
  - `parkmetrics.ts` stays read-only, as below.
- **D:**
  - `tileslots.ts` (`INTERIOR_KEYS`, `TILE_BASE_M`);
  - `tilecity3d.ts` (the strip and passage floors from the key);
  - `tileslots.test.ts`, `tileinterior.test.ts`, `tilecity3d.test.ts`.
- **E1:**
  - `facade.ts` (`measureOpenSide`, `WALL_SIDE_M`, `wallOffset`), `models.ts` (`BUILDING_FRONTS` open values only), `stacks.ts` (the recipe's `open` guesses only);
  - `facade.test.ts`, `stacks.test.ts`, `packpin.test.ts` (re-pin only);
  - `dressing.ts` only if the glass or awning does not follow its host's yaw (the builder says so first).
- **E2:**
  - `facade.ts` (`BODY_M`), `stacks.ts` (the `footprint` option), `models3d.ts` (passing it for the tile city);
  - `facade.test.ts`, `stacks.test.ts`, `tilecity.test.ts`.
- **F:**
  - new `src/render3d/kerbline.ts` and `kerbline.test.ts`;
  - `tileslots.ts` (`KERB_FACES_M`, the return cell's slot), `tilecity3d.ts` (the kerb plan, the lifted slab, the flank strips, the returns, `kerbStrips`);
  - `tilecity.ts` (the return cells beside each kerb cut only);
  - `tilecity3d.test.ts`, `tilecity.test.ts`, `tileslots.test.ts`.
- **H:** `tileslots.ts`, `tilecity3d.ts` (drive and mouth cells drawn as paving), `tileinterior.test.ts`, `tilecity3d.test.ts`.
- **Must not touch:**
  - `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`;
  - `town.ts`, `terrace.ts`, `citymetrics.ts`, `parkmetrics.ts`, `frontage.ts` (the checks are read, not edited);
  - `sills.ts`, `escapes.ts`.

## Dependencies
- **Shared files.** The main session merges one branch at a time:
  - `tileslots.ts` and `tilecity3d.ts`: A, D, F, H, and 059 A2;
  - `models3d.ts`: E2, 059 A2, and 064 to 066;
  - `stacks.ts`: E1, E2, 064 and 065;
  - `tilecity.ts`: B, B2, F, 064, 065 and 067. B2 goes on B's branch, and B merges only with it.
- **Order.** The index at the top. B goes before 064, because it fixes the row lengths. E1 and E2 also go before 064, which reads `BODY_M`.
- 059 (approved, not built) reads the street profiles (B) and the kerb (F). If B or F merges first, 059's builder takes the new profiles and Open item F1.
- No `src/core/` change, no schema or event change, no new dependency.

## Interfaces
All in `src/render3d/`; the builder may rename any of them.
- `tilecity.ts`: `PAVEMENT_GRATE = 1`, and `PAVEMENT_STRAIGHT_2` removed (A).
- `tilecity.ts` (B2): `matchFirstTiles(blocks: readonly { id: string; options: readonly string[] }[], capacity: ReadonlyMap<string, number>): Map<string, string | null>`. It is pure. `blocks` comes in allocation order and `options` in preference order. It returns each block's band key, or null when the block is unmatched. It is a maximum matching by augmenting paths, and the same input always gives the same output.
- `facade.ts`:
  - `measureOpenSide(mesh): "+x" | "-x" | null` and `OPEN_SIDE_MEASURED: Readonly<Partial<Record<CalibrationKey, { open: "+x" | "-x"; why: string }>>>` (E1);
  - `BODY_M: Readonly<Partial<Record<CalibrationKey, { front: number; back: number; nx: number; px: number }>>>` (E2).
- `stacks.ts`: `AssembleOptions.footprint?: "bounds" | "body"` (default "bounds") and `STOREY_ALIGN_TOL_M = 0.03` (E2).
- `kerbline.ts`: `kerbLine(city): readonly { street: string; side: 1 | -1; points: readonly Pt[]; dips: readonly [number, number][]; openings: readonly [number, number][]; returns: readonly { inlet: string; at: Pt; side: "near" | "far" }[] }[]`, and a return cell (a `TileRole` "kerbReturn" or a `pavement` variant, the builder's choice) and `KERB_TOL_M = 0.03` (F).
- `tileslots.ts`: `KERB_FACES_M: Readonly<Partial<Record<CalibrationKey, readonly { side: "+x" | "-x" | "+z" | "-z"; inset_m: number; top_m: number }[]>>>` (F).

## Questions: settled, and still open
- **Settled on 19 Nov 2026.**
  - **Q-B:** B1, no avenues. It is the grammar's Q7, adopted under the goal waiver.
  - **Q-C:** back to back, C-rows. It is the grammar's Q2, adopted under the waiver. Now 065 to 067.
  - **Q-C2:** settled two ways:
    - corner pieces at openings (grammar Q1). Josh: "Yes, allow it (Recommended)";
    - the party-wall kit on height steps (grammar Q3). Josh: "Dress it, lift the pipes (Recommended)".
  - **Q-I** is moot: the lattice is the tile city's, and the ladder keeps bounds (064).
  - **Q-I2** is gone: a leftover gap is a failed check (064).
- **Defaults still standing**, none of them blocking:
  - **Q-A:** keep the grates.
  - **Q-E:** fix the ladder too, for E1 and 068.
  - **Q-E2:** no roof borrowing (grammar rule 11).
  - **Q-F:** the returns stop at the building line.
  - **Q-H:** pave only the inlet. 066 extends this through ring 2.

## Open items (not blocking)
- **A1.** The converter put `Straight_01` and `Merger_01` on an `01_A` atlas copy with an alpha channel and set BLEND. A `tools/` ticket could re-convert them opaque. Until then A does not use `Straight_01`.
- **F1.** `POLE_SLOT_FROM_KERB_M` (0.75 m) is measured from the cell edge, so a pole stands 0.10 m behind the pack's kerb face, on the walk. 059's builder should know. No change here.
