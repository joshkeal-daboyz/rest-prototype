ticket: 057d-interiors-drawing
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section D draws everything 057 C and G laid inside the blocks: apron and strip, courts and drives, greens and paths with optional trees and benches, passage floors and gates (the small gate at alley mouths), alley lanes and bins, park edges, pad cells and alley courts. Each role gets a pack key and a code-drawn fallback, under a draw-call cap, and appears once on the sheet. D also carries three items from the 057 A review: the explicit `"wall"` alignment, the Octagon pin, and a committed `packTown` pin on the ladder.

## Does the branch do it?
Read at 03fd43d against d14f640. The gate was green as reported: 2507 passed, 11 skipped.

**Criterion 10, drawn.** Mostly met, with one live-view defect (Must fix 1).
- `interiorItems` (tileslots.ts) turns every `TileCity.interior` cell into one item:
  - strip, apron, path, parkEdge, green, and bare (court, drive and alley cells);
  - plus one `stalls` overlay per near and far row of every court.
  - It skips the court and drive cells that are already `lotSurface` cells of the street layer.
- `interiorGroup` (tilecity3d.ts) draws them:
  - one InstancedMesh per key and sub-mesh;
  - per-kind code fallbacks for pavement, grass, bare road, stall dividers and gates;
  - props from `propPlan`;
  - passage floors from `passageFloors`;
  - the keys with the fewest instances are dropped to stay under `INTERIOR_DRAW_CALLS_MAX`.
- Levels sit on the walk: `TILE_BASE_M` puts Panel_02 at -0.07 and Grass_01 at -0.11, both re-checked against the GLB inside a skipping `it`.
- Tests: `tileinterior.test.ts` covers every-cell-once, the kinds, stall rows, full pack, no pack and part pack, the cap, light-rig keys and the scene swap. `tileintegrate.test.ts` covers it on the packed city.

**Your question 1, every credited floor drawn.** Yes.
- G3 credits building footprints, `lotSurface` and `plaza` cells (the tile layer draws them), all `city.interior` cells, and `TilePassage.floor`.
- Every interior cell is drawn, including:
  - `apronPad` (emitted as apron or strip);
  - alley courts with `run` `''` (their cells are not `lotSurface`, so they are drawn as bare, with stall overlays);
  - `parkEdge`;
  - alley lanes;
  - bins from `alleyBins`.
- Passage floors are drawn as pavement quads from the same rectangle G3 reads.
- Small gates come from `gatePlan`'s mouth test. On the real packed cities it finds small gates greater than 0 and fewer than all gates (tileintegrate "finds the gated passages...").
- tileinterior "covers every interior cell..." and tileintegrate "draws every cell a block holds inside its outer ring" check this from the drawing's side.

**Your question 2, each drive and near-stall cell drawn once.** Yes for the surfaces: tileinterior "gives every interior cell one item, except a court's drive and near row" asserts no duplicates and no item on a `lotSurface` cell. No for the markings: see Must fix 1.

**Your question 3, `withPassages` and the alignment.** Yes.
- `createCityRenderer3d` calls `scene.useTiles(..., tilePassages(city, applied.packed))`. `applied.packed` is the new `AppliedModels.packed`, the very map `applyModels` packed with.
- `useTiles` builds the interiors from `withPassages(city, passages)`.
- `cityApplyOptions` passes `align: TILE_STACK_ALIGN`, and `applyModels` forwards it to `packTown`.
- It sits in tilecity3d.ts and models3d.ts rather than tilecity.ts. That is within D's files, and tilecity.ts is untouched.

**Your question 4, the Octagon and packpin pins.** Both are sound.
- `WALL_OCTAGON_BASE_M` is 0.174 and the fixture table uses the literal 0.174.
- The alignment test checks `base.z + base.d/2 - 0.174 ≈ 0` with a literal.
- The GLB test checks that both ground planes exist (0.174 and 0.595) and excludes only `WALL_PINNED` keys from the rule comparison.
- `packpin.test.ts` pins three literal SHA-256 digests and reads no wall table.
- I copied `packpin.test.ts` into a worktree of d14f640 and ran it: all 8 pass. The digests are the base's, so the ladder's `packTown` is unchanged. "Is a pin that can fail" shows the digest is sensitive.

**Criterion 11, sheet.** Met.
- Grass_01 and Panel_02 are new sheet pieces.
- Bare_01 and ParkingLines_01 labels name the interior roles.
- Labels are at most 26 characters and legend lines at most 41.
- The wide layout is now 5 columns at 14 m. The tall layout's `pitchZ_m` also went from 12 to 14, which the report does not mention (Could improve 4).

**Carried items.** All three are done, as above.

**Criteria 14 and 15.** Met.
- Only `src/render3d/` is touched, and `townpin.test.ts` is unchanged.
- No threshold is loosened: `TILE_DRAW_CALLS_MAX` stays 40, and the interiors get their own 24.
- The tests are CI-safe:
  - cities are typed in and at most 6 x 4;
  - geometry reads happen inside skipping `it`s;
  - paths use `join` with forward segments;
  - the only timer is the existing `setTimeout(done, 0)` flush pattern.

**Your question 6, the reported deviations.**
- **Panel_02 for Panel_01:** justified. Panel_01's +z kerb would drop 0.23 m every 5 m, and a test pins the choice. It is City Pack, so `CITY_NEVER_USED` is not affected. E should record it in 19.4.
- **Gates in code only:** allowed by 19.2 ("or a code-drawn wall and gate"). But 19.2 says "in the run's colourway", and the branch uses a fixed brown `GATE_COLOUR` (Could improve 1).
- **Sheet layout change:** fine; the existing sheet-grid tests still hold.

## Rule conflicts and risks
- None of the hard rules is broken: no change to `src/grid/`, `src/night/` or `puzzles/`, no new dependency, and no GDD Decided rule touched.
- The puzzle path through `applyModels` now passes `{}` instead of no options to `packTown`. tileintegrate shows `applyModels(map, SET).packed` deep-equals `packTown`'s default on 01 and 09, and packpin pins all three maps.
- Risk (Must fix 1): the court's 10 x 10 open lot is still dressed by `furnitureLayout`'s open-lot rules in the tile city. The unit tests cannot see this, because they look at `interiorGroup` alone.

## Must fix
1. **Court lots still get frontage-lot furniture, so drives are painted as stalls, near rows are lined twice, and barriers stand across the stalls' opening onto the aisle.**
   - **What is wrong.** Each street court is still a `town.openLots` parking lot covering the drive plus the near row. `furniture.ts`'s open-lot block lays two `ParkingLines_01` tiles over it (at q = ±2.5), barriers at q = -D + 0.5, meters and a pole billboard. The tile city's `furnitureFilter` (`bayMeters`) removes none of them.
   - **How I checked.** A throwaway probe on the branch, built on `tileintegrate`'s `planOf` and not committed, found:
     - on the default city, 12 lot `ParkingLines` pieces: 6 centred on court drive cells and 6 on near-row cells;
     - 16 barriers, 8 meters and 4 billboards on the same lots;
     - the same pattern on seed 2.
   - **Why it fails criterion 10:**
     - the drive should be "a kerb cut and lot surface", but it shows stall lines;
     - the near row gets a second `ParkingLines` tile (furniture at about 0.005 m, interior at 0.01 m, turned differently), which fights for the pixel;
     - the barrier row sits on the near row's aisle side, where the stalls open.
   - **Fix, within D's files.** In `cityApplyOptions` (tilecity3d.ts), compose the `furnitureFilter` so that open-lot pieces (`kind === "parking"`) are dropped on any lot that became a court. Courts are `city.courts` with a non-empty `run`; match on `p.run`. Keep them for the blocks in `city.frontLots`, which keep 056's frontage lot. Alternatively drop only the `ParkingLines`, barriers and billboard, and keep meters if wanted.
   - **Test.** Add one in tileintegrate: on the default city and a seed, no lot `ParkingLines` or barrier lies on a court's drive or near-row cells, and a front-lot block still gets its lot dressing.
   - **Effect.** Each court reads as drive, then stalls, aisle and stalls, with one set of markings.

## Could improve
1. Gates use a fixed `GATE_COLOUR`. 19.2 asks for a code-drawn gate "in the run's colourway". Either take the run's colourway (models3d already resolves it per run), or have E record the fixed brown as a deviation.
2. The ticket asks for `TILE_DRAW_CALLS_MAX` to be "raised by the builder with the count". The branch adds a separate `INTERIOR_DRAW_CALLS_MAX = 24`, which is in effect a frame budget of 64. Record the measured call count with the real pack (from the `interiorLine` console line) in its comment, so E's Numbers row has a real figure.
3. The explicit-alignment test (`explicit` equals `implicit`, and `applied.packed` equals `explicit`) would still pass if `applyModels` ignored `opts.align`. A one-line check that `applyModels(..., { ...cityApplyOptions(city), align: "back" })` packs differently would prove the option is forwarded.
4. `SHEET_SHAPES.tall.pitchZ_m` 12 to 14 is an unreported change. Mention it in the report or the comment beside the wide change.
5. `TILE_PROP_TURN` is empty. The bench's front is checked against the GLB, but the bins are not. Add the bins to the same skipping geometry test, or note that they are symmetric.
