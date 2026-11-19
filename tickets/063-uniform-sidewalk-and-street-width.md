# 063 · Tile city fixes from Josh's daylight look: one sidewalk colour, street width, building backs, plain interior paving, roofs and corners, kerbs, roof exits, paved inlets

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: open (waiting for G1). Eight sections, each its own branch, each buildable alone except where Dependencies says. Sections B and C wait for Josh's answers (Open questions).
branch: one per section: `ticket/063a-one-sidewalk`, `ticket/063b-street-width`, `ticket/063c-building-backs`, `ticket/063d-plain-interior-paving`, `ticket/063e1-corner-open-side`, `ticket/063e2-one-footprint`, `ticket/063f-kerb-line`, `ticket/063g-roof-access`, `ticket/063h-paved-inlets`, `ticket/063i-walls-touch`
- Section I was added on 19 Nov 2026, after A, D and H merged (`f4a728f`). It is buildable after E1 and E2.

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

### C. The white space behind the buildings
- **Ring 1 and the stacks.** Each block's ring 1 (5 m) is the terraces' band. The stacks are wall-aligned (057 A): the wall plane is on the pavement's back edge.
- **How deep the stacks are.** A stack piece is 5.2 to 5.9 m deep (`Apartment_01` 5.196, `_03` 5.497, `Shop_04` 5.886, `Roof_01` 5.918). So its back stands 0.2 to 0.9 m into ring 2.
- **What ring 2 is.** Ring 2 is the apron strip (`InteriorCell.variant === APRON_STRIP`). `tileslots.ts` always draws it in code (`INTERIOR_KEYS.strip` is empty), and `tilecity3d.ts` draws it as one flat quad per whole 5 m cell in `PAVEMENT`. In day mode that is `surfaces.pavement` `0xa7abb1`, which reads near-white in the sun.
- **What is left showing.** A band 4.1 to 4.8 m deep shows behind every row. It is paler than ring 3's `Sidewalk_Panel_02` apron beyond it.
- **The passage floors.** The pale ground "beside the front row's ends" is the gated passages' floors (`TilePassage.floor`, 5 m deep). They are code-drawn in the same `PAVEMENT` colour.
- **The backs themselves.** The stacks' backs are the pieces' blank rear faces, with no windows, and they are ragged (each piece's own depth). That is the red building's blank back wall.

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

### G. The roof exit
- **The piece.** `SM_Bld_Roof_Access_01` (2.76 x 2.74 x 2.85 m), `ROOF_ACCESS` in `dressing.ts`, one of the "big roof props" (tower, access, billboard, novelty; at most one per block, `P_ROOF_LARGE`).
- **Why it opens to the street.** `onRoof(ROOF_ACCESS, …, "front", …)` puts its front edge on the roof cell's front (`ROOF_EDGE_M`, 0.3 m in from the roof's front bound), with `yaw = yawOf(key)`, so its door side ("+z", the default) faces the street. The door opens over the façade with no deck in front.
- **What a model look would settle.** Which face is the door: the face areas (−z 5.9 m², +z 7.0 m²) do not settle it. Josh's screenshot shows the door facing the street, which fits "+z".

### H. The inlet Josh marked
- **What it is.** The opening, two cells (10 m) wide with a kerb-cut ramp, is a residents' court's **drive** (057 C, `DRIVE_CELLS` 2, ring 1). An alley mouth is one cell, so it is not that.
- **What is drawn there.** Its cells are 056's `lotSurface` cells, drawn as `SM_Env_Road_Bare_01`, which is asphalt, the street's colour. Behind it, the court (rings 2 to 4) is bare road with `ParkingLines_01` over each row of stalls.
- **What is around it.** The kerb cut is `Dip_01` on the pavement band. The pale ground at its far edge is ring 2's code-drawn strip or a passage floor (C, D).

### I. Why neighbouring buildings leave a sliver (measured 19 Nov 2026 at `f4a728f`, from `city-pack.glb`, no browser)
- **The walls stand on a 5.0 m body.** Every apartment and shop piece's side wall plane is at **±2.50 m**, a 5.0 m body:
  - `Apartment_01`, `_02` and `_03`;
  - `Shop_01` and `_04`;
  - `Apartment_Door_01`.
- **The bounds are wider than the walls.** What goes past ±2.50 m is trim, which reaches beyond the wall:
  - `Apartment_02`: a band at y 2.54 to 3.0 m, out to ±2.585 (bounds 5.170 m);
  - `Apartment_03`: a plinth at y 0 to 0.14 m and a cornice at 2.86 to 3.0 m, out to ±2.64 (bounds 5.281 m);
  - `Shop_04`'s and `Door_01`'s top bands, out to ±2.55;
  - the roofs' parapets, out to ±2.57 to 2.65.
- **The packer lays columns by bounds.** `stacks.ts` (`build`: `w = floorMid.w`) makes each column as wide as its floor piece's **bounds**. `terrace.ts` lays blocks flush by `Stack.width_m` and measures the far gap from the pieces' bounds.
- **So the walls do not touch.** Between two columns, the walls stand apart by the two trims' overhangs:
  - 0.17 m between two `Apartment_02` columns, 0.28 m between two `_03` columns, 0.09 to 0.14 m where a `_02` or `_03` column meets an `_01` column;
  - at every column joint, inside a block and between blocks;
  - from the pavement to the roof, because the shop below is also a 5.0 m body centred in the wider column.
  - Only the trims bridge it, and only where both sides have one at the same height. That is the "sliver" and the "bands that do not meet" in Josh's screenshot.
- **The same cause makes the passages.** The 057 B finding that "N unscaled columns span only 5.0 N to about 5.28 N metres", and so "nearly every row's end is a gated passage", comes from bounds widths too. On the bodies every column is 5.0 m. A row runs between corner blocks on the 5 m grid, so it closes to a seam far more often.
- **Not the cause:**
  - the lots: the packer re-cuts them;
  - a deliberate passage: those are at row ends, 1.0 m or wider, with a gate;
  - 062's lift and `bandPacked`: they move only y and the ground row's choice, with the same columns.
  - A building is never scaled (041, Decided), so stretching is not an option.
- **What a model look would settle:**
  - whether two neighbouring trims, overlapping by 0.08 to 0.14 m where they are coplanar, z-fight visibly. They share one atlas swatch, so it may not show.
  - the corner pieces' bodies along the street. `Apartment_Corner_01` and `Shop_Corner_01` were not measured on their faces here; E2's `BODY_M` measures them.
  - whether Josh's screenshot shows a column joint (most likely, a sliver of about 0.1 to 0.3 m) or a 1 m passage (that would have a 2.2 m gate).

## Goal
In the tile city in daylight:
- every pavement and build-out is one opaque sidewalk piece of one colour;
- block interiors, passage floors and the inlets between buildings are the same plain paving, with no inset plates and no white strip;
- each building's storeys, trims and roof share one footprint, and its corner pieces turn the corner (the corner store's angled face on the corner);
- the kerb runs as one unbroken line round every build-out;
- roof exits open onto the roof;
- neighbouring buildings in a row stand wall to wall, and a row has a gap only where an opening is made on purpose (a drive, an alley mouth, or a passage the row cannot close);
- if Josh chooses: the backs of the buildings fill the lot's depth with their own stack pieces, and the streets are narrower.

## Sections
| Section | What | Size | Needs |
| --- | --- | --- | --- |
| A | One sidewalk piece: `Straight_02` for every plain pavement and build-out cell | half a day | nothing |
| B | Street width, once Josh picks an option (B1 is specified below) | half a day for B1; 1 to 2 days for B2 or B3 | Josh's answer to Q-B |
| C | Building backs from the same stack pieces | about 1.5 days | Josh's answer to Q-C; D; E2 |
| D | Plain interior paving: `Sidewalk_01` for the apron, the strip, the paths, the park edge and the passage floors | half a day | nothing (shares `tileslots.ts` with A) |
| E1 | The corner pieces' open side, measured (the corner store, the roof-corner trim) | 1 day | nothing |
| E2 | One footprint per column: storeys, trims and roof aligned on measured wall planes | 1 day | E1 |
| F | The kerb line: one continuous kerb, build-outs included | 1 day | A |
| G | The roof exit opens onto the roof | half a day | 061 merged (it owns `dressing.ts` now) |
| H | Paved inlets: court drives and alley mouths, paved through the row | half a day | D |
| I | Walls touch: columns laid on their wall bodies, not their bounds | 1 day | E1 and E2 merged (it reads E2's `BODY_M`); before C |

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

### B. Street width (after Josh answers Q-B; written for the recommended B1)
6. [ ] **B1, no avenues.** Every street line is the 5-cell street profile, carriageway 3 cells (15 m). `AVENUE_ONE_IN` becomes an off switch (0 = none), and 056's avenue-first bay order and `KERB_BAY_SHARE_MAX.avenue` are left in place, unused.
7. [ ] P1 to P6 (`parkmetrics.test.ts`), G1 to G4, V1 to V4, R1 at `TILE_CITY_R1_MIN`, R6, R7 and the 057 C interior shares hold on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4, with no threshold changed. If P1's floor cannot hold, the builder stops and reports: it is a re-cut, not a looser band.
8. [ ] A test pins every street's carriageway at 15 m and the largest junction at 3 x 3 cells. Tests that asserted an avenue exists are changed to assert that none does, and are listed in the report.
9. [ ] The guide's 19.3 and chapter 18's measured lines are re-measured. The builder reports street metres per axis and the streets' share of city area, before and after.
10. [ ] (Main session, screenshot) the same URLs as criterion 5: no 4-cell carriageway.

### C. Building backs (after Josh answers Q-C; written for the recommended C-stack)
11. [ ] **Pure plan.** `backFill(stack, part, city)` (new `src/render3d/backs.ts`) returns, for each column that qualifies, the column's own pieces repeated behind it: the same style, floor count and roof, turned 180°, with its back body plane on the front copy's back body plane (E2's footprint). Nothing is scaled. It is returned beside `Stack.pieces`, not in it, so dressing, sills, escapes and every R check read the front as today.
12. [ ] **Ground row of the back copy.** The style's floor piece at ground level, plus the residents' door piece (`DOORS`) on one column per stack by hash. There are no shops, glass, awnings, signs, ATMs, door steps or fire escapes (19.6: rear escapes are not drawn). Its colourway is the front copy's (the same stack group, so `paintStack` paints both).
13. [ ] **Where a back copy may stand.** Its footprint may cover ring 2 and run into ring 3 by at most `BACK_OVERSHOOT_MAX_M` (2 m), on `apron` cells only. It never overlaps a court, drive, alley, green, path or park-edge cell, a passage floor, another building, or another back copy.
    - A column within one cell of a block corner, where the perpendicular row's back copies would meet, gets none.
    - Neither does a column that cannot meet the rules above. Its share of ring 2 stays paved (D).
14. [ ] **Coverage.** On the default city and seeds 1 to 10 at 3 x 3, at least `BACK_COVER_MIN` (0.8) of ring-2 strip area behind the rows is under a building. The builder reports the measured share.
15. [ ] **The checks still hold.** G1 (the front walls are unchanged), G2, G3, G4, R1 to R13 and the tile floors hold unchanged. A fixture with a back copy over a court cell fails criterion 13.
16. [ ] **Draw calls.** The builder reports the stack piece count before and after on the default city. The main session reports `renderer.info.render.calls` before and after, from the dev view's log line. Stacks are per-piece clones, not instanced, so expect up to about twice the building draws. If the frame is visibly slower on Josh's PC, that goes to Josh before merge.
17. [ ] (Main session, screenshots) overhead and street views of the default city: no white band behind the rows, and the backs show windows and doors.

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

### G. The roof exit (Vitest unless marked)
38. [ ] **The rule** (`dressing.ts`):
    - `SM_Bld_Roof_Access_01` stands wholly inside its roof cell (the `ROOF_EDGE_M` insets).
    - Its door faces away from every roof edge that faces a street or an alley, toward the roof's rear or its middle. With the housing at the cell's front, that is a half-turn.
    - A clear deck at least `ROOF_ACCESS_CLEAR_M` (1.2 m) deep and the door's width lies in front of the door, inside the roof cell, with no other roof prop on it.
    - If the cell cannot hold both, the block takes another big prop, as today when a prop does not fit.
39. [ ] **The door side.** It is `DRESS_FRONTS`'s for the key, "+z" today; the builder confirms it from the GLB in an `it.skipIf` (the recessed door face) or lists it for Josh's gallery check.
40. [ ] **The test, pure.** For every `ROOF_ACCESS` placement on the default city, seeds 1 to 10 and the three protocol maps: the footprint is inside the cell, the door's outward normal has a negative component along the street normal (and along each alley normal), and the deck is clear. A fixture of today's placement fails it.
41. [ ] **Ladder.** This fixes the ladder maps' roof exits too (Q-G). Only `ROOF_ACCESS` placements change: a test diffs every dressing placement of the three protocol maps against `5c4329c`'s and finds only those.

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

### I. Walls touch (Vitest unless marked)
Josh's clarification (19 Nov 2026, in chat): "This doesn't mean the buildings need to be the same height. They can have gaps but those caps must be intentional (alley ways... etc)".
- Heights stay free: neighbours may differ in floors and roof line, and nothing here checks heights.
- Gaps are allowed only where they are intentional, never as a sliver left by lot widths, rounding or piece widths.

46. [ ] **Columns on their bodies.** With the tile city's option (`assembleStack(..., { columns: "body" })`, which the tile city passes; the default "bounds" keeps the ladder), a column is as wide as its floor piece's **body** between its side wall planes (E2's `BODY_M`, `nx` and `px`), and `Stack.width_m` is the bodies' total.
    - Every piece of the column is centred on the body; a corner column's piece sits on its outer flank (E2).
    - Trims, cornices and parapets reach past the body into the neighbour's by what they really carry.
    - Nothing is scaled.
47. [ ] **The packer reads bodies.** `terrace.ts` lays blocks flush by the body widths. It measures the far gap from the last block's outermost **wall** plane (not its trim), and the overhang it allows for (`ov`) is the trim's reach.
    - The far end keeps 057 B's order: seam, overshoot, then passage.
    - `bandPacked` (062 B) passes the same `columns` option to its re-assembly, so a banded block keeps its columns. A test checks this on a banded fixture.
48. [ ] **The check, pure.** New `wallJoints(city, packed)` (in `src/render3d/walljoints.ts`) runs over every row of the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4.
    - **Intentional openings.** They are listed from the layout data, never from the gap's own size:
      - the court drives (`TileCity.courts`);
      - the frontage lots (`frontLots`) and 056's lot openings;
      - the alley mouths (`TileBlock.alley`);
      - the plazas;
      - the gated passages (`TileCity.passages`, from `withPassages`);
      - a seam at a row's far end within `TERRACE_SEAM_M`.
      - Each is an interval along its block side.
    - **Joints.** Every other joint between neighbouring buildings or columns in a row is a joint. At each joint the side wall planes coincide within `WALL_JOINT_TOL_M` (0.02 m), over the height both buildings share, from the ground to the lower roof.
    - **Heights are free.** Neighbours may differ in floors and roof line, and the taller one's flank above the lower roof is not checked. Trim bands are checked only where both neighbours have one at the same height, and then they meet or overlap.
    - **Accidental gaps.** Any stretch of a block side's back edge more than 0.02 m wide that is neither wall nor inside an intentional opening is an accidental gap, and the check fails on it. It reports each one with its run, position and width.
    - **Fixtures.**
      - Today's bounds-width packing fails, because an `Apartment_02` block's joints are 0.17 m apart.
      - A city with one passage's record removed fails at that passage: an opening has to be laid to count, not just wide.
      - Two neighbours of different heights with touching walls pass.
49. [ ] **Fewer passages.** The builder reports runs closed by seam, overshoot and passage, before and after, on the default city and seeds 1 to 5. The passage count is expected to drop sharply, and the report says by how much.
    - G2 (no gap in the frontage) holds unchanged.
    - Every passage left still meets `PASSAGE_W_M`, and its floor and gate follow it, because passages are found from the packed runs.
50. [ ] **Nothing else loosens.** G1 to G4, R1 at `TILE_CITY_R1_MIN`, R7, the sills (062), `escapeCheck` and E2's `STOREY_ALIGN_TOL_M` check hold, and the R1 to R13 numbers are re-measured and reported.
    - On the ladder, `packpin.test.ts` is unchanged, because the default is "bounds" (Q-I).
51. [ ] **A leftover gap** that the row still cannot close (Q-I2) is closed, in this order:
    1. a seam (≤ `TERRACE_SEAM_M`);
    2. an overshoot of one more of the last block's own columns, up to `END_OVERLAP_MAX_M` inside the next corner block (057 B);
    3. a choice of styles and column counts that fits;
    4. only then 057 B's gated passage.
    - A run's start is never shifted off its corner, which stays flush (057 B).
52. [ ] (Main session, screenshots, street camera, `&light=day`) along a row of mixed styles and heights, no ground shows between buildings except at an alley, passage, drive or inlet. Where two neighbours share a height, their trim bands run on. Compare with Josh's reference.

### Guide (each section, its own lines)
45. [ ] Each section adds its rule to the guide's chapter (A, D, F, H: 19.8 and 10; B: 3 and 18; C: 19.4; E1: 7; E2: 16.3; G: 16.5; I: 16.2, 16.3 and 19.2), with Josh's words as **Decided** and the rest as **Default**.
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
- **C:**
  - new `src/render3d/backs.ts` and `backs.test.ts`;
  - `models3d.ts` (drawing the back pieces in the stack's group);
  - `tilecity3d.ts` (passing the city to it).
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
- **G:** `dressing.ts` (the access placement only), `dressing.test.ts`, `dressdraw.test.ts`.
- **H:** `tileslots.ts`, `tilecity3d.ts` (drive and mouth cells drawn as paving), `tileinterior.test.ts`, `tilecity3d.test.ts`.
- **I:**
  - `stacks.ts` (the `columns` option);
  - `terrace.ts`, named here as an exception to the must-not-touch list below, for the block widths and the far-gap and overhang measure only;
  - `models3d.ts` (passing the option, including in `bandPacked`);
  - new `src/render3d/walljoints.ts` and `walljoints.test.ts`;
  - `stacks.test.ts`, `terrace.test.ts`, `terracepack.test.ts`, `frontage.test.ts`, `alleys.test.ts`, `sills.test.ts` (re-measured numbers only, never a threshold).
- **Must not touch:**
  - `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`;
  - `town.ts`, `terrace.ts`, `citymetrics.ts`, `parkmetrics.ts`, `frontage.ts` (the checks are read, not edited);
  - `sills.ts`, `escapes.ts`.

## Dependencies
- **Shared files.** The main session merges one branch at a time:
  - `tileslots.ts` and `tilecity3d.ts`: A, D, F, H, and 059 A2;
  - `models3d.ts`: C, E2, and 059 A2 and 062 B;
  - `stacks.ts`: E1, E2, and 062 B;
  - `dressing.ts`: G, after 061 merges.
- **Order.** E1 before E2, and E2 before C, which needs the common back plane. D before H, and A before F (F's pieces are A's).
- **Section I.**
  - It waits for E1 and E2. It reads E2's `BODY_M`, and its column rule is E2's footprint applied across the row; E1's corner turn decides a corner column's body along the street.
  - It goes before C, whose back copies repeat the final columns.
  - It is independent of F, G and B, though B moves the rows' lengths and so the passage counts. 062 is merged: I passes its option through `bandPacked` (criterion 47).
  - It shares `stacks.ts` and `models3d.ts` with E2 and C, so the main session merges one at a time.
- 059 (approved, not built) reads the street profiles (B) and the kerb (F). If B or F merges first, 059's builder takes the new profiles and Open item F1.
- No `src/core/` change, no schema or event change, no new dependency.

## Interfaces
All in `src/render3d/`; the builder may rename any of them.
- `tilecity.ts`: `PAVEMENT_GRATE = 1`, and `PAVEMENT_STRAIGHT_2` removed (A).
- `backs.ts`: `backFill(stack, part, city): readonly StackPiece[]`, `BACK_OVERSHOOT_MAX_M = 2`, `BACK_COVER_MIN = 0.8` (C).
- `facade.ts`:
  - `measureOpenSide(mesh): "+x" | "-x" | null` and `OPEN_SIDE_MEASURED: Readonly<Partial<Record<CalibrationKey, { open: "+x" | "-x"; why: string }>>>` (E1);
  - `BODY_M: Readonly<Partial<Record<CalibrationKey, { front: number; back: number; nx: number; px: number }>>>` (E2).
- `stacks.ts`: `AssembleOptions.footprint?: "bounds" | "body"` (default "bounds") and `STOREY_ALIGN_TOL_M = 0.03` (E2).
- `kerbline.ts`: `kerbLine(city): readonly { street: string; side: 1 | -1; points: readonly Pt[]; dips: readonly [number, number][]; openings: readonly [number, number][]; returns: readonly { inlet: string; at: Pt; side: "near" | "far" }[] }[]`, and a return cell (a `TileRole` "kerbReturn" or a `pavement` variant, the builder's choice) and `KERB_TOL_M = 0.03` (F).
- `tileslots.ts`: `KERB_FACES_M: Readonly<Partial<Record<CalibrationKey, readonly { side: "+x" | "-x" | "+z" | "-z"; inset_m: number; top_m: number }[]>>>` (F).
- `dressing.ts`: `ROOF_ACCESS_CLEAR_M = 1.2` (G).

## Open questions (for Josh)
- **Q-B: how wide should the streets be?**
  - **B1 (recommended): drop the avenues.** Every street is 5 cells (25 m), with a carriageway of 3 cells (15 m): one parking band and two lanes. Only avenues are 4 cells wide today.
    - Cost: half a day.
    - All of 056's parking rules stand. The city is about 5 m narrower per avenue.
    - 059's staggered avenue lights go unused.
  - **B2: two lanes, no parking band.** 4 cells (20 m), with a carriageway of 2 cells (10 m).
    - The kerbside bays, build-outs and street trees go, so 056's "shoppers park at the kerb" and P1 and P3 to P6 must be re-cut: a decision for Josh, and a ticket of its own.
    - 059's pole-side rule changes. Junctions become 2 x 2 and crossings 2 cells.
    - Cost: about 2 days.
  - **B3: one-way streets.** One lane and one parking band: 4 cells (20 m), with a carriageway of 2 cells (10 m).
    - 056's parking stays as it is on today's streets.
    - It needs a single-lane piece (`Road_Lines_01`, or `Road_01` with `Road_Arrow_01/02`) in place of the yellow pair. Junctions become 2 x 2.
    - Cost: 1 to 1.5 days.
  - **B0:** keep today's widths.
- **Q-C: the backs of the buildings.**
  - **C-stack (recommended, Josh's own idea):** each column's pieces are repeated, back to back, toward the interior, so the backs show windows and doors.
    - Cost: about 1.5 days, after D and E2.
    - Up to about twice the building draw calls. Stacks are cloned, not instanced, so check the frame on Josh's PC.
  - **C-pave:** D alone. The strip becomes the same plain paving as the rest of the apron: no white, no extra draws, but blank, ragged backs.
  - D is built either way, so C-pave costs nothing more.
- **Q-A: the grates.** Keep the 1-in-6 `Sidewalk_Grate_01` cells? They are the same colour, opaque and on the same atlas. Default: keep.
- **Q-E: fix the ladder too?** E1's corner fix and G's roof-exit fix change the ladder maps' corner shops and roof exits, as they should (the same bug). Default: yes, with `packpin` re-pinned and the change named. The alternative is the tile city only.
- **Q-E2: roof pairing.** If a style's own roof still overhangs its floor after E2, may a style take another style's roof of a better fit (for example `Roof_02` on `Apartment_03`)? It changes that style's roof look. Default: no; report only.
- **Q-F: how far the return kerbs run.** On Josh's example they run to the building line (the default). Should they go on along the building walls through ring 1 to the interior? That is a kerb against a wall, so it is not recommended.
- **Q-H: how much of an inlet is paved.** Pave only the inlet through the row (recommended), or the whole court drive and aisle as well? The court then reads as a paved yard with painted stalls.

- **Q-I: the ladder too?** The same slivers are on the ladder maps' terraces. Default: tile city only (`columns: "body"`), so the ladder's pins hold. The alternative is to make it the default everywhere, with `packpin` re-pinned and the change named.
- **Q-I2: a gap the row still cannot close.**
  - **Recommended:** criterion 51's order: seam, then an overshoot of one more of the building's own columns hidden in the corner block, then a better-fitting choice, then a gated passage as the last resort.
  - **Alternatives:**
    - extend the last building by repeating its own columns, as in C's idea, but along the row: the same as an overshoot where a corner block is there, and not possible against a drive or lot;
    - shift the whole row, which breaks 057 B's flush corner;
    - no passage at all, leaving the gap open, which breaks 19.2's no-gap rule;
    - stretch a piece, which needs Josh to change 041's Decided no-scaling rule.

## Open items (not blocking)
- **A1.** The converter put `Straight_01` and `Merger_01` on an `01_A` atlas copy with an alpha channel and set BLEND. A `tools/` ticket could re-convert them opaque. Until then A does not use `Straight_01`.
- **F1.** `POLE_SLOT_FROM_KERB_M` (0.75 m) is measured from the cell edge, so a pole stands 0.10 m behind the pack's kerb face, on the walk. 059's builder should know. No change here.
- **Size.** This ticket now holds nine branches. C and E (E1 and E2) are each over a day and would sit better as tickets of their own, and B is its own ticket once Josh picks an option. A, D and H together are about a day and a half of one builder's time.
