# City style: Corner buildings

standard: yes
Scope: where corner buildings and corner columns stand, and which side of a corner model is open.
Read by: buildings
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/fronts.md` (fronts), `docs/city-style/block-stacks.md` (16.3, the corner column's pieces), `docs/city-style/frontage-and-interiors.md` (19.1, the wall line), `docs/city-style/evaluation.md` (the readings)

## Rules

## 7. Corner buildings

- **Rule [D-042e]**: corner buildings are placed only on corners, and each has two sides facing the street. Only corner buildings have this restriction; other buildings may stand on corners as usual.
- **Rule [D-042f]**: a lot is a corner lot if a side edge of it lies within CORNER_GAP of another road's pavement (not its own road's), and that road's centreline lies toward that side, within CORNER_ANGLE_MAX degrees of the side's outward axis (a road behind the lot is not a cross street). `Lot.cornerSides` lists each such side ("+x" or "-x" in the lot's own frame) with the cross road's id; `Lot.corner` is true when it is not empty. A row end that meets no other road is not a corner, and a service strip is not a road.
- **Rule [D-042g]**: a corner model (`corner: true` in `BUILDING_FRONTS`) goes only on a lot whose `cornerSides` has the side of its `open` frontage. It faces its own road, with its second frontage toward the cross street. A yaw cannot mirror, so a model only goes where its open side is a lot side that meets a cross street. Every other model is unrestricted on corners.

The only whole corner model is `store_corner_mesh`, in the table below. It is rarely placed, because few lots qualify. Its `open` side was flipped when the fronts were turned, and it is still an uncalibrated guess: it is not checked that its second face lands on the cross street [D-042m]. The City Pack's eight corner pieces are in the same table; their `open` side is measured from the GLB (`OPEN_SIDE_MEASURED`), not guessed.

| Name | Front | Open |
| --- | --- | --- |
| `simple-town:store_corner_mesh` | -z | -x |
| `city-pack:SM_Bld_Shop_Corner_01` | +z | -x |
| `city-pack:SM_Bld_Shop_Corner_02` | +z | -x |
| `city-pack:SM_Bld_Apartment_Corner_01` | +z | -x |
| `city-pack:SM_Bld_Apartment_Corner_02` | +z | -x |
| `city-pack:SM_Bld_Apartment_Corner_03` | +z | -x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_01` | +z | -x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_02` | +z | -x |
| `city-pack:SM_Bld_Apartment_Roof_Corner_03` | +z | -x |

- **Default [D-048m]**: no POLYGON model is a corner model. A gallery click sets only a door, and `open` lives in code, so a Town Pack house gets `corner: true` and `open` only if Josh names one with two street faces and says which side. Until then a Town Pack house goes on any lot, corner or not, as an ordinary model.
- **Rule [D-063a]**: a corner piece's second street face stands on the cross street, and its angled face (a shop corner's chamfer and glass) is on the corner, toward the junction. The roof corner's trim runs along its two street faces and turns the corner with them.
- **Default [D-063c]**: the corner pieces' turn applies to the ladder maps' corner stacks too: only a corner piece's turn, x and z (and what is dressed on them) move. packpin.test.ts pins it and lists every field that moved.
- **Default (063)**: `BUILDING_FRONTS`, the recipes' `open` and `OPEN_SIDE_MEASURED` agree (a test holds them to it). At the row's -x end a corner column keeps its piece unturned (its open side is the lot's -x side, on the cross street); at the +x end it turns a quarter, so its open side is on the row's street and its front on the cross street. `WALL_SIDE_M`, the wall of the open face, is measured on -x (19.1); `wallOffset` reads the open side whichever it is, and gives 0 for a side other than the measured one, as a recalibrated front does.
- **Default [D-050d]**: a stack has a corner column (shop corner base, corner floors, corner roof, never a `_Stack_` piece) on each side in its lot's `cornerSides` and on no other. It is built for its lot, so it stands only where that side meets a cross street and never mid-row, and its second street face is on the cross street. A stack with no corner column, and any style with no corner pieces (the offices), is an ordinary building and may stand on a corner lot as any model may. A corner piece's `open` side is read in the lot frame after its front is turned: at the other end of the row the corner column turns a quarter, so one piece serves both ends. A corner stack that cannot be assembled on its lot (it does not fit with the corner columns in) falls back to the same style mid-row. `open` comes from `BUILDING_FRONTS` first, then the recipe's (`OPEN_SIDE_MEASURED`), then "+x"; a value saved in the gallery still wins over both.

The corner column's pieces are in 16.3. `measureOpenSide` (`facade.ts`) measures each corner piece's open side from the GLB, and `facade.test.ts` re-measures it when the GLB is on the machine. Corner blocks on a terrace, and the check that they stand only on true corners (R9), are in chapter 16 (16.3 and 16.8).

## Open questions

None here.
