# City style: Streets and blocks

standard: yes
Scope: where roads, kerbs and pavements go (beside the circuit's wires on the ladder maps, the tile city's one street profile) and how the road pack draws them.
Read by: planner
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/block-grammar.md` (the blocks between the streets), `docs/city-style/interior-drawing.md` (19.8, what the drawing does), `docs/city-style/evaluation.md` (the pavement and kerb readings)

## Rules

## 3. Streets and blocks

- **Default (041)**: a road runs beside a wire, on the camera side (the side of the line's normal that points toward +z; a line parallel to z puts its road on +x). If that road would cover another node's square it takes the other side; if both sides are blocked the line has no road. The road's near kerb is `KERB_OFFSET` from the line, so the wire, its poles and its nodes stand on the pavement.
- **Default (041)**: a road is `ROAD_W` wide, with a kerb of height `KERB_H` along both edges and a pavement band `PAVE_W` wide outside each kerb. Kerbs and pavements are clipped where another road or a pad lies over them. Where roads end at one node, or meet the ring or the grid, a junction pad covers their ends (the convex hull of the end edges).
- **Default (041)**: a line shorter than `STREET_MIN_LEN` is a service run: pavement only, no road. Decor segments and feed lanes become streets by the same rules.
- **Default (041)**: a ring road runs at `RING_MARGIN` outside the circuit's bounds. One ring of city blocks (`OUTER_RINGS`) surrounds it, on a grid of streets at about `BLOCK_PITCH` (each block side between 11 and 15, nearest `BLOCK_PITCH`; `gridCount`). The town's window is the ring plus that one ring of blocks.
- **Rule [D-041d]**: outer blocks are filled pinwheel-fashion. Each side's row starts at its own corner, clockwise, and stops `LOT_GAP` short of the next side's band. Each side reserves its band first, sized to the deepest lot type allowed there. A side takes `large` lots only where a row beside its band still holds `ROW_MIN_SMALLS` small lots.
- **Default (041)**: the 3D town builds its own streets and lots. It does not follow the 2D backdrop, so places may sit a little apart from where 2D draws them.
- **Default (041)**: a dashed centre line is drawn on ring and grid roads only (roads wider than 1). Yards (what frontage fill cannot use) are dark ground.
- **Default (042)**: odd-angled junction pads stay code-drawn, even when roads come from a pack (the Open question below, chapter 10).
- **Default (041)**: no street furniture (trees, bins, hydrants, traffic lights, parked cars) yet. A later ticket may add it.
- Terrace pavements carry street furniture, and the outer blocks are terraces: the whole procedural city, from lot to prop, is chapter 16.
- **Rule [D-063e]**: the tile city (`city=tiles`) has no avenues. Every street line is the 5-cell street profile (pavement, parking band, two lanes, pavement: 25 m across, a 3-cell carriageway of 15 m), and a junction is 3 x 3 cells.
- **Default [D-063f]**: `AVENUE_ONE_IN` is 0, an off switch (0 is none). The avenue profile, the avenue-first bay order and `KERB_BAY_SHARE_MAX.avenue` stay in `tilecity.ts`, unused. `tilecity.test.ts` (`street width: no avenues`) pins every carriageway at 15 m and the largest junction at 3 x 3. The ladder's maps and `town.ts` are not touched.


## 10. Roads from packs

- **Rule [D-042j]**: roads, kerbs and pavements come from a road pack, not code-drawn. This replaces the earlier rule that roads are code-drawn everywhere, for the road work of 042 C.
- **Rule [D-042k]**: the POLYGON City Pack (`city-pack`, converted at scale 100) is the first-choice road pack. SIMPLE Town's kit is the fallback.
- **Default (042)**: straight tiles run along every road at its own angle, repeated at true length times `WORLD_PER_METRE` and scaled across to `ROAD_W`. Pack junction pieces stand only where the ring and grid cross at right angles. The circuit's odd-angled pads stay code-drawn, with the pack's road material. `Town`'s geometry is unchanged.
- **Rule [D-063g]**: every plain pavement and build-out cell of the tile city is the same piece. `TILE_SLOTS` gives the pavement `SM_Env_Sidewalk_Straight_02` and the grate `SM_Env_Sidewalk_Grate_01` (one cell in `GRATE_ONE_IN`, variant `PAVEMENT_GRATE`), and the build-out `Straight_02` alone: one key, one geometry, one opaque material and one InstancedMesh, so every plain cell is the same texels under the same light.
  - `SM_Env_Sidewalk_Straight_01` is in no role and is not loaded: it is the one piece among those the tile view used whose material is BLEND.
  - A test reads the GLB and fails on any piece the tiles or the interiors load whose material is BLEND.
  - The converter's handling of that atlas copy is a `tools/` matter (ticket 063's open item A1).
- **Rule [D-063h]**: the interior paving is the plain slab `SM_Env_Sidewalk_01`, not `SM_Env_Sidewalk_Panel_02`. Where it is drawn is in 19.8.
- **Rule [D-063i]**: a court's drive and an alley's mouth are paved with that slab, from the kerb cut to where the opening meets the interior (19.8).
- **Default [D-063j]**: the 1-in-6 grates stay (`GRATE_ONE_IN`: the same colour, opaque, on the same atlas), and only the inlet through the row is paved, not the whole court. The court's stalls, aisle and the alley lane beyond ring 1 keep the bare road.
- **Rule [D-063k]**: the tile city's kerb runs as one line (`kerbline.ts`).
  - It runs along each street side's pavement band, and out round every stretch of build-outs: along the first build-out's flank, its outer edge and back along the last flank.
  - At every inlet it turns in at a return on each side and runs along that side of the opening to the building line, with the dropped kerb of the mouth between the two returns.
  - It stops at a corner or a crossing.
  - Kerb structures follow the kerb, and the kerb may stretch out in spots. What is drawn on the line is in 19.8.
- The pack's kerb face stands inside the cell's edge (`KERB_FACES_M`), and a straight has no face on its two ends: the open, unkerbed edge of every build-out stretch. The layout's kerbs (`Town.kerbs`, `TileStreet.carriage`) stay on the cell edge, and a pole slot (`POLE_SLOT_FROM_KERB_M`) stands a little behind the pack's face. `Sidewalk_Dip_Corner_01` is a pedestrian ramp, not a kerb return, so it cannot carry the kerb round an inlet. A test reads the GLB and re-measures every face within 0.02 m.
- **Default (063)**: the pack's kerb is not changed and nothing is scaled. A pavement cell with a build-out in front of it (`PAVEMENT_FLUSH`) is drawn as the plain slab `SM_Env_Sidewalk_01` at the walk (or a code box in the pavement colour), with no kerb and no gutter, so the pavement runs on, level, to the build-out. The flank of each build-out stretch and the side of each opening are code-drawn kerb strips (`KERB_LIP_W_M` wide, `KERB_LIP_TOP_M` above the road, colour `KERB_STRIP_COLOUR`, the pack's own lip and joints) on the line.
- **Default [D-063l]**: the return stops at the building line (the pavement's back edge). It does not go on along the building walls through ring 1 to the interior: that is a kerb against a wall. The returns are squared, not rounded (19.8).

## Open questions

- **Open**: the road, junction, kerb and pavement slots in `MODEL_TABLE`, each falling back, per slot, to the code-drawn part (042 C). Waits for: Josh's converted road pack.
