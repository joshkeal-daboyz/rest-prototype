ticket: 055a-tile-grid
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A of ticket 055: a pure `src/render3d/tilecity.ts` that lays a city of 5 m tiles on a 90 degree street grid (design items 1 to 7 and 10). That means streets on every grid line with avenue/street profiles, cell roles by the band rule, kerbside parking pairs and bay records, merged kerbs and reserved pole slots, all handed on as a frozen `Town` in map units with no lots, terraces or places. It is checked by a new `tilecity.test.ts` against criteria 1 to 8, plus the "Every section" rules.

## Does the branch do it?
The diff against `goal/city-style` touches only `src/render3d/tilecity.ts` and `src/render3d/tilecity.test.ts`, which are the section's Files. I ran `npx vitest run --maxWorkers=2 src/render3d/tilecity.test.ts` (22 passed, 1.25 s) and `npx tsc --noEmit` (clean). For the full suite I relied on the main session's gate (green, 2053 passed) rather than running it again, because of the PC load limit.

1. **On the grid.** Cells are emitted at `(i + 0.5) * TILE_M`, with a two-cell piece shifted `TILE_M / 2` along its street (`tilecity.ts` emit loop). Yaws come only from `yawToward`/`cornerYaw`, so they are always 0/90/180/270. "on the grid (criterion 1)" checks centres, yaws, footprints and "only parking is two cells" for seeds 1 to 20 at 1x1, 3x3, 6x4 and 6x6. Two further tests check lane/parking/pavement fronts and corner yaws against the conventions in the file header. Met.
2. **No gaps, no overlaps.** "partitions the union of the streets' rights of way exactly" builds its own coverage count per unit cell. The union comes from each column's and row's street membership. The test checks once inside, zero outside and the summed area within 1e-6. Met.
3. **Junctions.** "gives every cell the role its bands say" recomputes the band rule per cell, including the crossing's owner street and null for junction and corner. "fills every junction box ..." checks every box is all `junction`, both crossing rows and columns are full, and all four corners are `pavementCorner`. A third test checks each block corner and that no lane is in two bands. Met.
4. **Kerbs.** One kerb is written per street side per block interval, on the carriageway edge (`roads, pads, kerbs` loop). "lies on every pavement and carriageway cell edge and on no other" derives the expected edge set from the cell roles. It also checks that no edge appears twice and that no kerb touches a junction or crossing cell. "is one merged segment per block side" checks the four sides of each block and the total count. Met.
5. **Profiles and bays.** The profile test compares bands to literal arrays, edge lines are `street`, and an avenue is forced on any axis with three or more lines (`layoutAxis`). The bay tests check:
   - each `ParkingLines_01` is two parking cells of one street, outside any other street;
   - the `BAY_JUNCTION_CLEAR` cell next to each box is plain, with at most one odd plain cell per run;
   - `bays.length === tiles * BAYS_PER_PARKING_TILE`.

   Met.
6. **Pole slots.** Slots sit 0.75 m off the kerb face, start `POLE_SLOT_END_CLEAR_M` into each block interval and step 12.5 m. The test checks the kerb distance, the side sign, that each slot is on a `pavement` cell (so never a corner, crossing or cut), the first-slot offset and the pitch, and that every block side has at least one slot. Kerb cuts do not exist until B. The `role === "pavement"` guard in the code will exclude them once B adds them. Met.
7. **The `Town`.** "has roads, kerbs, pavements, pads and blocks ..." checks counts, empty lots/places/terraces/openLots, ring and window equal to the bounds, road widths, and pad areas against junction cells. "puts each block's edge on its pavements' back edges" checks all four sides within 1e-6 and that the pavement area equals the pavement and corner cells. The determinism, frozen, defaults and clamp tests cover the rest. `deepFreeze` matches `townLayout`'s. Met.
8. **Pure.** The source test allows only `./town` and `../render/city` as specifiers. It rejects three, grid, night, DOM globals and dynamic `import()`. I checked the transitive graph by hand (`town.ts` -> `layout.ts`, `../core`, `../render/city`; `render/city` imports grid only as `import type`): no three or DOM reaches this module. Met.

Every section (21, 22): the builder's part is consistent with the report (no assets touched, nothing outside Files). The main session's gate is green. Criterion 22's playtest and diff checks belong to the main session.

## Rule conflicts and risks
- No hard-rule conflict found: `src/grid/` and `src/night/` are untouched, there is no new dependency and no file outside the section's Files. No GDD Decided rule is involved (rendering only, no puzzle).
- The 3D game's take of `src/grid/`/`src/night/` is unaffected.
- Risk, for the later power-line ticket rather than this one: slots stop 2.5 m short of each block end. The gap from the last slot of one block to the first of the next is about 12.5 m plus the cross street's 25 to 30 m plus 2.5 m, roughly 40 to 45 m. A single 12.45 m `Power_Cables_01` span cannot cross a junction. That ticket will need a corner or junction pole rule.

## Must fix
none

## Could improve
1. `tilecity.ts` exports more than the ticket's Interfaces list:
   - constants `CITY_BLOCKS_DEFAULT`, `POLE_SLOT_END_CLEAR_M`, `LANE_RIGHT`, `LANE_PATCH`, `PAVEMENT_STRAIGHT_2`, `PAVEMENT_GRATE`;
   - the type `TileBlock`, `TileCity.blocks`, the extra `TileStreet` fields (`across0`, `carriage`, `centre_m`) and `streetBandAt`.

   All are reasonable and the ticket allows renames. But section D must add a Numbers row for every exported constant, so each one added here is work for D. `LANE_RIGHT` is exported but not used: the lane variant is computed as `bandIdx - firstLane`. Either use the constant there or drop the export.
2. Some tests reuse the implementation's own derivations rather than an independent rule:
   - the corner-yaw test repeats the expression `carriage.lo_m > x ? 1 : -1` from `cornerYaw`'s call;
   - the role, junction and bay tests read `streetBandAt`, `carriage` and `across0` from the module.

   The profile test pins the bands to literals, so the risk is small. Even so, a test that rebuilds the column/row-to-band mapping from the literal profiles and the block widths would catch a shared "z street reversed" mistake that the current tests would pass.
3. Edge streets' outer sides carry parking bays (`block: "outer"`) and pole slots that face the yard. The design allows it ("on every pavement"), but B's per-block bay count and D's T6 should not count "outer" bays towards a block. It is worth one line in B's report.
