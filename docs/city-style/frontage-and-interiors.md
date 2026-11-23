# City style: Frontage and block interiors

standard: yes
Scope: how the tile city's buildings meet the pavement (the wall line), and how a row of them ends at a corner or a far end.
Read by: streetscape
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/corner-buildings.md` (chapter 7, the corner rule), `docs/city-style/block-interiors.md` (19.4), `docs/city-style/alleys-and-parks.md` (19.6), `docs/city-style/interior-drawing.md` (19.8), `docs/city-style/evaluation.md` (the checks of 19.7 and the readings)

## Rules

## 19. Frontage and block interiors

How the tile city's buildings meet the pavement, how a row of them ends, what fills the inside of every block, and how blocks differ from one another. The tile city (`city=tiles`) is made by the pipeline, stage by stage: `docs/city-grammar.md` and `tickets/070-city-pipeline.md` give the stages (stage 3's lots and mass in `src/city/mass/`, stage 4's band and bays in `src/city/edge/`, and so on), and `plan3d.ts` draws what they place. The files named in this chapter (`facade.ts`, `tilecity.ts`, `terrace.ts`, `tilecity3d.ts`, `tileslots.ts` and `models3d.ts`) are the old path's: the old tile city (its frontage checks and the generator in `tilecity.ts`) went in ticket 081 A1, and what stays of the others is the cell types, constants and tile drawing the pipeline's `plan3d.ts` reads. The layout and the checks (G1 to G4, V1 to V4) are pure data. Nothing on the ladder maps changes.

The ladder keeps chapter 4's rules: back-aligned stacks, and a far end that closes at a seam or at an alley of `ALLEY_MIN_M` to `ALLEY_MAX_M`. Every new option of this chapter defaults to today. The two defaults that are not zero (`alignOf` in `terrace.ts`: "wall"; `farOverlapOf`: `END_OVERLAP_MAX_M`) follow from a run having a pavement `frame`, which every tile-city run has and no ladder run has, so a ladder stack, run and town are as they were.

### 19.1 The wall line

- **Rule [D-057f]**: a building may rest on top of the sidewalk and overlap it a little. It does not sit recessed from the sidewalk and leave a gap of nothing between them.
- **Default (057) [D-057g]**: in the tile city a terrace stack is aligned on its **wall plane**, not on its back faces (`TILE_STACK_ALIGN`, "wall"; the ladder keeps "back").
  - Each column's ground and floor pieces put their measured wall plane (`WALL_FRONT_M`: how far behind the piece's front bound its wall stands, read from the GLB per key) on the lot's front line, which is the pavement's back edge.
  - A street-level wall may stand up to `OVERLAP_MAX_M` onto the pavement, and none stands behind the edge (`RECESS_MAX_M`, with `FRONTAGE_TOL_M` of tolerance).
  - Sills, frames, cornices and signs may stand further out than the wall, by up to `WALL_REACH_M` (the same number, because the reach is what sets the limit).
  - The backs of the stacks are then ragged: each piece's back stands where its own depth puts it. They face the inside of the block, and 19.4 fills it.
- **Default (057)**: the overlap limit is `OVERLAP_MAX_M`, 0.6 m.
- **Default (057)**: `SM_Bld_OfficeOctagon_Base_01` is pinned by hand to its 0.174 m face (`WALL_OCTAGON_BASE_M`, in `WALL_FRONT_M`), before any office style is aligned on its wall plane. `WALL_PINNED` lists the keys pinned this way, and `facade.test.ts` checks in the converted GLB that both planes are there and that the table holds the front one. No tile-city run uses an office style yet.
- **Default (057) [D-057h]**: the tile city passes "wall" to `packTown` explicitly (`TILE_STACK_ALIGN`, through the scene options of `models3d.ts`), so it does not lean on the default that `alignOf` reads from the runs' pavement frame. `packpin.test.ts` pins `packTown` on the three protocol maps by a digest, so the ladder's unchanged is checked on every run and not only at review.

`WALL_FRONT_M` holds each piece's measured wall plane (`measureWallPlane`, run on the converted `city-pack.glb`) and `WALL_SIDE_M` the same for a corner piece's open side, the measured one (`OPEN_SIDE_MEASURED`). A roof has no wall and no entry, and its pieces align on their front bound. A front that was recalibrated in the gallery makes a key's entry not apply (`wallOffset` gives 0), so that piece also aligns on its bound. `facade.test.ts` pins every value of both tables as a typed-in fixture and, where the converted GLB is on the machine, re-measures each key within 0.02 m. The tables hold a distance per piece, so the Numbers table pins their constants and not their entries.

### 19.2 Corners and far ends

- **Default (057) [D-057i]**: every row's first block stands **flush** with its corner: the inset is `TILE_ROW_INSET_M` (0), and the corner block's flank meets the cross street's pavement. Every first lot keeps its `cornerSides`, so the corner rule of chapter 7 holds.
- **Rule [D-057s]**: on the pipeline's city a row has no far-end order: its columns and openings are whole cells, so a row always closes (grammar rule 6). The old path's order (a seam of at most `TERRACE_SEAM_M`, an overshoot of at most `END_OVERLAP_MAX_M`, or a gated passage of `PASSAGE_W_M`) is the old tile city's, which went in ticket 081 A1.
- **Default (057) [D-057j]**: nothing else is allowed. Every metre of a block side's pavement back edge is one of a building wall, a corner flank, a seam, a gated passage (a seam and a gated passage are the old path's only: the plan has no passage type, and its rows always close), or a deliberate opening: a parking lot or a plaza, a court's drive (with its kerb cut where cars cross), or an alley's one-cell mouth (19.6). A side beside an alley is a quiet frontage with a row of its own (grammar rule 9), held to this as any other.
- **Default (057) [D-057k]**: for the tile city only, the far-gap share (seam or alley on at least the ladder's share) and the temporary far-gap floors do not apply. The run after a parking lot or a court drive closes like any other run.
- **Default (057)**: the gate. Each gated passage has a gate at its wall line, built in code from boxes: a post at each side (`GATE_POST_W_M` wide, `GATE_POST_EXTRA_H_M` taller than the gate) and a panel between them, `GATE_H_M` high and `GATE_THICK_M` thick, standing on the walk, in one fixed dark brown (`GATE_COLOUR`, not a lit surface, so it reads in both light modes). A passage too narrow for two posts is one panel. A passage that opens on an alley's mouth (within `GATE_ALLEY_REACH_M` of the lane) gets the small gate, `GATE_SMALL_H_M` high.
  - The gate is always code-drawn, so no Town Pack piece is placed (16.6), the run's colourway is not applied to it, and it is 2.2 m high, not one storey.
  - The passage's floor (`TilePassage.floor`) is drawn in code as apron pavement.

The passages are known only once the runs are packed, so `tileCity` returns none and `withPassages(city, tilePassages(city, packed))` is the city with them. Each is `{ x_m, z_m, w_m, yaw, run, floor }`. The `floor` is apron pavement, `PASSAGE_FLOOR_DEPTH_M` (one cell) deep from the back edge inward and the passage wide: nothing else in the city lays a surface on that ground, and G3 credits only what is recorded there.

## Open questions

None here.
