ticket: 057g-alleys-parks
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section G (19.6, criteria 18 to 21) asks for four things, all pure. Service alleys that split blocks into parts laid as blocks of their own. Whole-block and half-block parks with a pavement edge. Checks V3 and V4 in `frontage.ts`, which must fail on the uniform grid. A tile-city R1 floor of 0.88 (Josh, 19 Nov 2026). It also carries F's three could-improves on `blockLens`.

## Does the branch do it?
I reviewed head 64455d4 against `goal/city-style`. Seven files changed, all in G's Files or the two test files the main session authorised. On the gate worktree, `tsc --noEmit` is clean, and `alleys.test.ts`, `frontage.test.ts` and `townpin.test.ts` pass (62 tests). The gate reported 2418 passed.

**Criterion 18, alleys: met.**
- **Placement.** `planBlocks` in `tilecity.ts` picks the blocks. The split goes in `tileCity`'s parts loop: the lane runs along the axis of the short side, at `floor((long-1)/2)` of the long side, `ALLEY_CELLS` = 1 wide, edge to edge.
- **Mouths.** Each end gets a `kerbCut` on the pavement cell, and the parking cell in front of it is put in `blocked`, so it stays plain.
- **Parts.** `TilePart` and `TileCity.parts` carry the two parts. `layoutRows` lays each part as its own block:
  - `clears` refuses any box facing the alley;
  - the row before the alley side is lengthened by the band width, so it ends flush on the lane;
  - the row after it starts at the lane with no `startCorner`.
- **G2.** `edgeCoverage` skips the rear side (`rear: alleySide`).
- **Aprons and bins.** The aprons beside the lane come from `alleyApron`. Bins sit every `ALLEY_BIN_EVERY_M` on alternate sides, at `ALLEY_BIN_OFFSET_M`, which is 0.3 m clear of the lane. They are never in an end cell and never on a court.
- **Role.** `alley` is in `InteriorRole`. The ticket's Interfaces say `TileRole`, but C already put the interior roles in `InteriorRole` with a recorded reason, and the brief asks for it there.
- **Tests** (`alleys.test.ts`, "alleys (criterion 18)"):
  - geometry, one cell wide, middle of the long side, two parts tiling the block less the lane;
  - a kerb cut at each end with no bay, build-out or pavement in front of it, a mouth one cell wide, and no row on an alley side;
  - flush row ends;
  - apron (or court or drive) beside the lane;
  - bin spacing, offset, yaw and cells;
  - G1 to G4 and P1 to P6 on the packed cities.
- **Quotas.** The criterion's "each [part] with its 056 quotas" became "quotas stay per street block". That change is recorded in the ticket's "G as built" note. I accept the reason: `parkmetrics.ts` reads `TileCity.blocks` and is outside G's Files.

**Criterion 19, parks: met.**
- **Whole-block.** A whole park has no part, so it gets no row, lot, unit or court. It is skipped in the bay states (`parkBlocks`). Its interior is `parkEdge` (the outer ring) plus green and crossing paths (`fillGreen(..., crossing: true)`).
- **Whole-block test** (`alleys.test.ts`, "lays a whole-block park..."). It checks:
  - no part, row, unit, court, stall, bay or open lot;
  - only green, path and edge roles, covering every cell;
  - the edge is exactly the outer ring;
  - the paths cross and end on the edge or a path;
  - the kerbside band has no `parking`, `parkingPlain` or `kerbCut`.
- **Half-block.** The park takes `floor(short/2)` along a long side. The built part has `parkSide` set, and its row there has road `park:<block>` and faces the park's `parkEdge` cells. The half-block test checks that the two tile the block, the park's long side and depth, the front line on the boundary, and an edge cell in front of every cell of the run.
- **G1 to G4.** These hold on the packed cities with a park edge counted as a side (the "holds the checks... parks and all" test).
- **Role.** `parkEdge` is in `InteriorRole`.

**Criterion 20, V3 and V4: met, and the tests are real.**
- **Counting.** `blockVariety` counts edge-connected sets of `alley` and `parkEdge` interior cells, never `TileBlock.alley` or `.park`.
- **On the cities.** The checks pass on the default city and seeds 1 to 10 at 3 x 3 and 6 x 4. The test also checks that the interior count equals the plan's count, so it is not vacuous.
- **Failing fixtures.** The uniform 3 x 3 grid of 10 x 10 blocks fails all four checks, with V3 short by 3 and V4 short by 2. The real default city fails V3 with its alley cells removed and V4 with its park edges removed, and each time the other check still passes. A synthetic case with two alleys or one park fails, and a lane cut in two counts as two alleys.
- **G4.** It now also checks the alley ends' kerb cuts. A removed cut fails G4, and so does a removed lane under an alley court's drive.

**Criterion 21, `TILE_CITY_R1_MIN`: met.**
- `TILE_CITY_R1_MIN = 0.88` sits in `tilecity.ts` beside R6 and R7. `CITY_CHECK.R1` stays 0.9 (asserted in `tilecity.test.ts`), and `citymetrics.ts` is not in the diff.
- Only the two tile-city R1 tests (`tilecity.test.ts`, `tileintegrate.test.ts`) use the floor. Both drop R1 from the `evaluateCity` filter and then assert all four of R1's conditions by hand, matching `citymetrics.ts:487`: frontage covered at least the floor, a largest neighbour gap of at most 1e-6, and at most one parking lot and one plaza per run.
- The R6 and R7 tests are unchanged. The builder reports minimums of R1 0.8968, R6 0.4611 and R7 0.4259. I did not re-measure them; the floors are asserted and pass.
- I found no new tuning constant and no seed-specific branch. The new hash kinds are only "park" and "parkside", used in the obvious way.

**F's carried could-improves: all three done.**
- **The `blockLens` comment** names the key "width", says it was chosen among keys tried because of R7 (seed 3 at 0.373), and points to the follow-up. Ticket 061 has not landed, so the "R7 no longer depends on the key" line correctly does not exist yet.
- **The fallback.** `blockSizes` with `BLOCK_FALLBACK_WIDTHS` and `_DEPTHS` replaces the inline loop. A test forces the miss with `() => false` and also shows that the last draw is still a draw. It then checks every prefix pair up to `CITY_BLOCKS_MAX` against V1/V2, the mean, the step, no repeats, the range and the 7-cell long side.
- **Both ends of the range.** A test shows sizes within 1 cell of both ends over seeds 1 to 20 at 6 x 4 and 3 x 3, and every size from 6 to 16 at 6 x 4.

**The builder's decisions beyond the ticket.** All four are recorded in the ticket's "G as built" note or D's additions.
- **Alley courts.** Justified. The rows of an alley block's parts are shorter than `TILE_PARK_MIN_RUN_M`, so 056's planner could not host the block's lot. Without this, every alley block would be short a lot.
  - It is bounded by `ALLEY_COURT_PART_MIN_CELLS` and `ALLEY_COURT_LANE_MIN_CELLS` (6), and answers exactly one lot (`relief`).
  - G4 accepts its drive only where it is beside a lane cell, and a test removes the lane to show that.
  - `parkmetrics.test.ts` and `tilecity.test.ts` count it in the lot and stall totals.
- **Quotas per street block.** Justified (see criterion 18).
- **Whole-block parks still asking neighbours.** This contradicts 19.6's draft line "takes no 056 kerb-bay or lot quota". It is forced by `parkmetrics.ts`, which is outside Files, and is recorded. Acceptable for a prototype, but it is the one decision Josh may want to hear about (could-improve 1).
- **Gated passages at alley mouths.** These are the existing B mechanism closing the far gap of a flush-ended row. They are recorded, and the gate drawing is added to D.

**The authorised test patches.** `parkmetrics.test.ts` changes 6 lines and `tileintegrate.test.ts` 13. Each carries a 057 G comment and covers only the invariants listed: alley courts, run block to part, park edge as pavement. The R1 floor in `tileintegrate.test.ts` falls under criterion 21 ("the tile-city R1 tests use it").

**The ladder is unchanged.** `town.ts`, `terrace.ts`, `models3d.ts`, `dressing.ts` and `citymetrics.ts` are not in the diff, and `townpin.test.ts` passes. Every new path in `tileCity` runs only inside `tileCity`.

**CI safety.** `alleys.test.ts` uses typed-in manifest fixtures and no filesystem reads. It has no Windows paths and no timers (only `timeout` options). `packTown` runs only on the default city, 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 3. The largest city it builds is 6 x 4, and the 6 x 6 cases are size lists only.

## Rule conflicts and risks
- No hard-rule break.
  - `src/grid/`, `src/night/` and `src/core/` are untouched.
  - There is no new dependency, and every file is inside the section's Files or the authorised patches.
  - No GDD Decided rule is involved (rendering only).
- **Thin margins.** R7 is at 0.4259 against 0.4 and R6 at 0.4611 against 0.45. Any later change to block sizes or the plan can tip a seed. This is already known (ticket 061 makes R7 a guarantee).
- **No ground on alley and park cells yet.** Alley lanes, park edges and `alleyBins` exist only as data, and `tilecity3d.ts` draws no interior role until section D. If D slipped, a 3D build of this branch would show bare ground there. That is expected under the ticket's section order.
- **19.6's mix table is not followed literally.** Whole-block parks are not capped at 1 in 3 small blocks: the plan fills the park quota from small blocks first, by hash. Criterion 19 does not state the 1-in-3 rate, and the "Default rate" line is met.

## Must fix
none

## Could improve
1. Josh should hear one point when this is shown: a whole-block park still asks a neighbour for one lot and a tile of bays (`tilecity.ts` lot planner and `wanted`), because `parkmetrics.ts` expects them of every block. This goes against 19.6's "takes no 056 kerb-bay or lot quota". A follow-up that lets `parkmetrics.ts` skip blocks with zero units would remove the extra lot.
2. `frontage.test.ts`, "measures a corner block's flank...": `expect(ends.length).toBeGreaterThan(30)` replaced a pinned 34. Pin it to 35, the count the comment gives, so a change in parts or corners is seen.
3. `alleys.test.ts`, the fallback test: its last loop only checks the list lengths. A `tileCity` built on the fallback (a test-only seam, or a check that `blockSizesWork` accepts every prefix pair) would show that the fallback can actually be laid, not only that it passes V1 and V2.
4. `tileintegrate.test.ts` near line 302: the `beside` expression is broken across a line at odd indentation. Formatting only.
5. The `TILE_CITY_R1_MIN` doc comment says R1 sits at "0.897 to 0.916", while criterion 21 says 0.897 to 0.903 on 3 x 3. Both may be true for different city sets. Name the set in the comment so E's Numbers table quotes the right range.
