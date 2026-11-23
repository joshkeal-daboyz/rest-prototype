# City style: Fronts

standard: yes
Scope: which side of each building model is its door: the fronts that are not the default, and how a front is calibrated.
Read by: buildings
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/buildings.md` (choosing a building), `docs/city-style/corner-buildings.md` (the corner models), `docs/city-style/packs.md` (the gallery, chapter 15), `docs/city-style/evaluation.md` (the readings)

## Rules

## 6. Facing

A model's door side is the axis, in the GLB's own frame, that its door faces (`ModelFront`: "+z", "-z", "+x", "-x"). `BUILDING_FRONTS` holds it, one line per `pack:name` (names repeat across packs: `SM_Bld_Shop_01` is in more than one). `frontYaw` gives the turn (0, pi, -pi/2, pi/2), so a clone's yaw is `lot.yaw + frontYaw(front)`. A quarter-turn front swaps the model's width and depth in `lotTypeOf`.

Nothing in a converted pack records a door side, because the converter centres every pivot. A new pack's door sides are therefore settled by eye. A model listed nowhere in `BUILDING_FRONTS` is drawn at the "+z" guess. In a dev build a saved calibration file (`assets/private/calibration/fronts.json`, never committed) is laid over the table: its front replaces the code's, and a key the code lacks is added (ticket 045).

- **Rule [D-042c]**: every SIMPLE Town building is "-z" except `store_small_mesh`, which is "+z". The exceptions are the table below. `memorial_mesh` (not placed yet) is still the "+z" guess.

Any `pack:name` whose front is not "-z", and every corner model, is listed in this chapter or in `docs/city-style/corner-buildings.md` (chapter 7). The drift test compares these two tables with `BUILDING_FRONTS`.

| Name | Front | Note |
| --- | --- | --- |
| `simple-town:store_small_mesh` | +z | calibrated [D-042d] |
| `simple-town:memorial_mesh` | +z | the starting guess, not yet seen (042 B) |
| `town-pack:SM_Bld_Church_01` | +z | calibrated [D-048c]; in no building row (held for 042 E) |
| `town-pack:SM_Bld_House_Preset_01` | -x | calibrated [D-048d] |
| `town-pack:SM_Bld_House_Preset_03` | -x | calibrated [D-048e] |
| `town-pack:SM_Bld_House_Preset_04` | -x | calibrated [D-048f] |
| `town-pack:SM_Bld_House_Preset_05` | -x | calibrated [D-048g] |
| `town-pack:SM_Bld_House_Preset_06` | +x | calibrated [D-048h] |
| `town-pack:SM_Bld_House_Preset_08` | -x | calibrated [D-048i] |
| `town-pack:SM_Bld_House_Preset_09` | -x | calibrated [D-048j] |
| `town-pack:SM_Bld_Shop_01` | +z | calibrated [D-048k]; in no building row |
| `city-pack:SM_Bld_Shop_01` | +z | provisional |
| `city-pack:SM_Bld_Shop_02` | +z | provisional |
| `city-pack:SM_Bld_Shop_03` | +z | provisional |
| `city-pack:SM_Bld_Shop_04` | +z | provisional |
| `city-pack:SM_Bld_Shop_05` | +z | provisional |
| `city-pack:SM_Bld_Shop_06` | +z | provisional |
| `city-pack:SM_Bld_Apartment_Door_01` | +z | provisional |
| `city-pack:SM_Bld_Apartment_Door_02` | +z | provisional |
| `city-pack:SM_Bld_Apartment_01` | +z | provisional |
| `city-pack:SM_Bld_Apartment_Stack_01` | +z | provisional |
| `city-pack:SM_Bld_Apartment_Roof_01` | +z | provisional |
| `city-pack:SM_Bld_Apartment_02` | +z | provisional |
| `city-pack:SM_Bld_Apartment_Stack_02` | +z | provisional |
| `city-pack:SM_Bld_Apartment_Roof_02` | +z | provisional |
| `city-pack:SM_Bld_Apartment_03` | +z | provisional |
| `city-pack:SM_Bld_Apartment_Stack_03` | +z | provisional |
| `city-pack:SM_Bld_Apartment_Roof_03` | +z | provisional |
| `city-pack:SM_Bld_OfficeOld_Small_Base_01` | +z | provisional |
| `city-pack:SM_Bld_OfficeOld_Small_Floor_01` | +z | provisional |
| `city-pack:SM_Bld_OfficeOld_Small_Roof_01` | +z | provisional |
| `city-pack:SM_Bld_OfficeOld_Large_Base_01` | +z | provisional |
| `city-pack:SM_Bld_OfficeOld_Large_Floor_01` | +z | provisional |
| `city-pack:SM_Bld_OfficeOld_Large_Roof_01` | +z | provisional |
| `city-pack:SM_Bld_OfficeOctagon_Base_01` | +z | provisional |
| `city-pack:SM_Bld_OfficeOctagon_Floor_01` | +z | provisional |
| `city-pack:SM_Bld_OfficeOctagon_Roof_01` | +z | provisional |

The Town Pack's other five lines are "-z", the default, so they are not in the table: `SM_Bld_House_Preset_02`, `_07`, `_10`, `_11` and `SM_Bld_House_Preset_Garage_01`.

The 34 City Pack stack pieces in `STACK_STYLES` have a `BUILDING_FRONTS` line each: 26 here and the 8 corner pieces in chapter 7. All 34 are provisional "+z" guesses until confirmed in the stack gallery (chapter 15); a fix is one line in `BUILDING_FRONTS`, and a saved front still overrides it in a dev build.

- **Default (042)**: the way to calibrate a model is the `fronts=1` overlay (`/?puzzle=09-shrine-circuit&view=3d&fronts=1`). It draws a red arrow along each building's declared front and a caption with its name, family and corner sides. Each correction is a one-line edit to `BUILDING_FRONTS`, keyed `pack:name`.

The gallery (`/?puzzle=09-shrine-circuit&view=3d&gallery=<pack-id>`) shows every building-sized entry of a pack, declared front and all, so a pack's door sides are one look (chapter 15). In a dev build it takes clicks that set a model's front or exclude it; none of that is in `npm run build`.

## Open questions

None here. The unconfirmed fronts are marked provisional in the table above.
