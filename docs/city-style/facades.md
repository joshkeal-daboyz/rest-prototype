# City style: Facades

standard: yes
Scope: what is dressed on a block's faces and roof (glass, awnings, signs, canopies, wall props, roof props), how it attaches, and how it is drawn.
Read by: facades
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/furniture.md` (street furniture, open lots and alleys: the rest of 16.5), `docs/city-style/fire-escapes.md` (16.11, which blocks get an escape), `docs/city-style/door-sills.md` (16.10, the sink the dressing follows), `docs/city-style/colourways.md` (16.9, why dressing keeps the base atlas), `docs/city-style/exclusions.md` (16.6), `docs/city-style/evaluation.md` (the readings)

## Rules

### 16.5 Dressing and furniture

- **Default (052)**: dressing is a pure function of the block's stack, its lot key, its run and the manifest entries (`dressBlock`). A key missing from the entries drops only its own placements. When a column is full (`DRESS_PER_BAY_MAX`), the pieces left are dropped in this order: glass, awnings, the big roof prop, the fire escape, signs, the door canopy, small roof props, the ATM, wall props. The whole town stops at `DRESS_MAX` pieces.
- **Default (052)**: attachment is a rule, not data, because the converter centres every pivot. A front-face prop's back face lies on the front face of the piece that stands behind it at its base height, plus a per-key `DRESS_NUDGE_M`, and no prop reaches past `KERB_FROM_FRONT_M`. A roof prop's base lies on the roof's top, inset `ROOF_EDGE_M` from every roof edge and inside its column. A prop's own door side is "+z" unless `DRESS_FRONTS` or the fronts table says otherwise.
- **Default (052)**: glass. Every shop with a `_Glass` key in `SHOP_GLASS` has it, sunk `GLASS_INSET_M` into the shop's face with its base at `GLASS_SILL_M` (a corner shop's glass wraps the corner). The one shop without glass takes none (R4).
- **Default (052)**: awnings. Each shop bay takes one with probability `P_AWNING`, all of one key within a block, only if the awning stops `AWNING_KERB_M` short of the kerb; a corner bay takes the L-shaped one. The base is `AWNING_BASE_M` or the glass's top (R5). The door bay takes a canopy with probability `P_CANOPY` at `DOOR_CANOPY_Y_M`.
- **Default (052)**: signs and the ATM. A shop bay takes a fascia sign with probability `P_SIGN`, over the awning or the glass, at `SIGN_BASE_M` at the lowest. One block in `P_BLADE` hangs a blade sign over a bay with no awning, `BLADE_INSET_M` in from its edge. An ATM goes beside a residents' door with probability `P_ATM` per block, `ATM_PIER_M` in from the door bay's edge and at `ATM_Y_M` high (R6). A shop's glass leaves no pier for it.
- **Default (052)**: fire escapes. An apartment block of at least `ESCAPE_MIN_BAYS` columns and two floors takes one when its block is among the map's chosen escape blocks (16.11: by hash rank, so the share is guaranteed and not chance), on a mid column that is not a door column, from the first floor to the roof: one platform on every storey, level with its windows, joined by flights, with a drop ladder that reaches the walk (16.11). That column's ground row stays plain. No two neighbouring blocks of a run both have one, which caps the share of qualifying blocks below most of them (R7; 16.9).
- **Default (052)**: wall props. From floor `WALL_MIN_LEVEL` up, each column and floor takes a wall AC unit with probability `P_WALL_AC` or a window planter with `P_PLANTER`, at most `WALL_PROPS_PER_BLOCK` in a block, never on the escape column; the AC stands `WALL_AC_LIFT_M` up and `WALL_AC_OFFSET_M` off the column's axis, the planter `PLANTER_LIFT_M` up.
- **Default (052) [D-052a]**: roofs. Each roof column takes one small prop (an AC unit, a satellite dish, a vent) with probability `P_ROOF_SMALL`, and a second with probability `P_ROOF_SECOND`, never more than `ROOF_SMALL_PER_BAY`, at a hashed place inside the inset; the dish keeps facing the street and the rest may turn a half-turn. A block takes one big prop with probability `P_ROOF_LARGE`: a water tower, the roof stair hut, a billboard (a structure and a face, counted as one), or a novelty sign (one per run, on its lowest block), and only where the roof's top plus its height stays under the lot's cap. A column with the big prop gets no small ones (R8). On the pipeline's city, grammar rule 11 places the roof items (H3, H3b, H1c).
- **Default (052)**: drawing. Each key is one `InstancedMesh` per sub-mesh (at most `DRESS_DRAW_CALLS_MAX` draw calls for the dressing and `FURN_DRAW_CALLS_MAX` for the furniture on the largest map). No dressing or furniture object raycasts (it is never picked), and none is lit: a material that carries emission is swapped for a dark clone, and all shop glass shares one dark, see-through material.

Dressing and furniture keep the base atlas whatever colourway their block is drawn in; 16.9 says why. Street furniture and the dressing of open lots and alleys are in `docs/city-style/furniture.md`.

## Open questions

None here.
