# City style: Sill table and lift

standard: yes
Scope: the measured table of door sills (`DOOR_SILLS`), and how a terrace block whose ground pieces have different sills is sunk, lifted piece by piece and, where the window rule needs it, held to one sill band.
Read by: facades
Depends on: `docs/city-style/numbers.md` (the constants), `docs/city-style/door-sills.md` (16.10, the sink and the steps), `docs/city-style/fire-escapes.md` (16.11, the escapes that stand still), `docs/city-style/evaluation.md` (what the lift did to the maps)

## Rules

#### From 16.10 Door sills (ticket 055 F)

`DOOR_SILLS` is in metres in the model's own frame; the door's centre is along the front, to the right as seen from outside. A window of `none` is in `NO_FRONT_WINDOW`.

| Key | Sill | Lowest window | Front step | Door's centre |
| --- | --- | --- | --- | --- |
| `city-pack:SM_Bld_Shop_01` | 0.106 | none | none | 0 |
| `city-pack:SM_Bld_Shop_02` | 0.071 | none | none | 0 |
| `city-pack:SM_Bld_Shop_03` | 0.043 | none | none | 0 |
| `city-pack:SM_Bld_Shop_04` | 0.077 | none | none | 0 |
| `city-pack:SM_Bld_Shop_05` | 0.361 | none | none | 0 |
| `city-pack:SM_Bld_Apartment_Door_01` | 0.029 | none | none | 0 |
| `city-pack:SM_Bld_Apartment_Door_02` | 0.206 | none | none | 0 |
| `city-pack:SM_Bld_Shop_Corner_01` | 0.159 | none | none | 0 |
| `city-pack:SM_Bld_Shop_Corner_02` | 0.376 | none | none | 0 |
| `city-pack:SM_Bld_OfficeOld_Small_Base_01` | 0.915 | none | none | 2.5 |
| `city-pack:SM_Bld_OfficeOld_Large_Base_01` | 0.915 | none | none | 0 |
| `city-pack:SM_Bld_OfficeOctagon_Base_01` | 0.085 | none | none | 0 |
| `town-pack:SM_Bld_House_Preset_01` | 1.151 | 1.851 | none | 0 |
| `town-pack:SM_Bld_House_Preset_02` | 1.052 | 1.752 | none | 1.271 |
| `town-pack:SM_Bld_House_Preset_03` | 1.151 | 1.851 | none | -2.479 |
| `town-pack:SM_Bld_House_Preset_04` (typed in) | 1.151 | 1.851 | none | -2.5 |
| `town-pack:SM_Bld_House_Preset_05` | 1.166 | 1.866 | none | -2.479 |
| `town-pack:SM_Bld_House_Preset_06` | 1.052 | 1.752 | none | 0 |
| `town-pack:SM_Bld_House_Preset_07` | 1.052 | 1.752 | none | 2.521 |
| `town-pack:SM_Bld_House_Preset_08` | 1.102 | 1.802 | none | -4.979 |
| `town-pack:SM_Bld_House_Preset_09` | 1.052 | 1.752 | none | -1.229 |
| `town-pack:SM_Bld_House_Preset_10` (3 m search) | 1.052 | 1.752 | none | -2.666 |
| `town-pack:SM_Bld_House_Preset_11` (3 m search) | 1.052 | 1.752 | none | 0 |
| `town-pack:SM_Bld_House_Preset_Garage_01` (typed in) | 1.052 | none | none | 0 |
| `simple-town:Building_Shop_01, _02` | 0.337 | 6.352 | none | 0 |
| `simple-town:Building_Shop_03, _04, _05` (2.4 m search) | 0.199 | 5.515 | none | 0 |
| `simple-town:Building_BaberShop` (1.4 m search) | 0.333 | 1.299 | none | 2.461 |
| `simple-town:Building_Gym` (2.5 m search) | 0.337 | 6.352 | none | 0 |
| `simple-town:store_small_mesh` (1.4 m search) | 0.212 | none | none | 0 |
| `simple-town:store_corner_mesh` (1.2 m search) | 0.212 | 4.295 | none | -3.799 |
| `simple-town:apartment_small_mesh, apartment_large_mesh` | 0.212 | 2.137 | none | 0 |
| `simple-town:Building_House_01 to _04` | 1.035 | 1.721 | 0.601 | 0 |
| `simple-town:Building_House_05 to _08` (2.5 m search) | 0.330 | 1.201 | none | 0 |
| `simple-town:Building_House_09, _010, _011` (1.3 m search) | 0.639 | 2.832 | 0.213 | 0 |
| `simple-town:Building_House_012 to _015` | 1.053 | 1.330 | 0.682 | 0 |
| `simple-town:office_small_mesh, office_medium_mesh, office_large_mesh` | 0.505 | 1.959 | 0.245 | -2.991 |
| `simple-town:Building_AutoRepair` | 0.138 | 1.182 | none | -5.965 |
| `simple-town:Building_StripClub` | 0.138 | 0.765 | none | 0 |
| `simple-town:Building_PoliceStation` | 0.402 | 0.529 | none | 0 |
| `simple-town:Building_CoffeeShop` (3.6 m search) | 0.333 | 5.954 | none | 0 |

- **Default (062)**: a mixed-sill stack gets a per-piece lift. The block still sinks as one, by its largest ground sill (`stackSill`), so the floors and the roof line stay level along the terrace. Each ground piece with a measured sill is then lifted by (the block's sink less its own sill) (`stackLift`, pure, in `sills.ts`; the lift is keyed by column, and a two-bay shop is in both), so every door's sill meets the walk: a shop's, a corner's and the residents' door. A lifted piece's bottom stays at less its own sill, under the walk, so no gap opens under it; its top rises into the first floor's lower band by at most the lift. A piece with no measured sill (`Shop_06`) is not lifted. A block that does not sink lifts nothing.
- **Default (062)**: the window rule. A lifted piece's top (its height over the first floor's base plus the lift) stays `LIFT_CLEAR_M` under the first floor's measured window sill (`WINDOW_SILL_M`, by `sillOf`; the lowest over the columns a piece covers). Where the full lift would break that, the lift is held back to what the rule allows; the door then stands under the walk by what is left, which is accepted up to `SILL_UNDER_M` (a sunk threshold) and a problem beyond it. Every door ends within `SILL_MAX_M` over and `SILL_UNDER_M` under the walk, and `stackLift` lists the ones that do not.
- **Default (062)**: the sill band. When a stack's ground pieces would break the window rule, its ground row keeps to one sill band (`sillBands`, `SILL_BAND_M`): the low band holds the keys with a sill of at most `SILL_BAND_M` (`Shop_01` to `_04`, `Door_01` and `Corner_01`), the high band the rest (`Shop_05`, `Door_02` and `Corner_02`). `Shop_06` has no sill, no door and no glass, so it is in neither band: banding a block never trades its shops for blank fronts (a banded block has no more `Shop_06` than it had).
- **Default (062)**: how a band is applied. `assembleStack` takes a `sillBand` option (the keys the ground row may be picked from), default off, so a stack that has no problem is exactly what it was. `fitSillBand` tries the band the lot's hash picks first, then the other, and keeps the first with no problem. The terrace packer (`terrace.ts`) is not given the option, so `bandPacked` (`models3d.ts`, pure) runs on what `packTown` gave: a block with a problem is assembled again within a band (same lot, floors and columns), taken only where the columns, floors, width, reach past the columns and the x and y of every piece above the ground row are the same (`sameAboveGround`). `applyModels` draws these blocks, lays the furniture by them and hands them back as `applied.packed`, and the pure plan (the metrics, the frontage, the passage floors) is made from them, so what is checked is what is drawn. The lone stacks of the ladder maps do the same in `buildingPlacements`.
- **Default (062)**: the dressing follows. A lifted ground piece's glass, awning, sign, door canopy and the ATM beside a door rise with it (`liftDressing`: the slots `glass`, `awning`, `sign` and `wall`, by the piece's column). Nothing else moves: the floors' dressing, the roof props and the fire escapes (they stand on mid, non-door columns, and their joints and ladder foot still pass `escapeCheck`) are as they were.

## Open questions

None here.
