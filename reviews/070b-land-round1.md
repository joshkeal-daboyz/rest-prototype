ticket: 070b-land
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section B of ticket 070: stage 2, `land`, in `src/city/land/`. It moves `planBlocks` and the tile city's parts loop onto the stage's own `rand`, applies grammar rule 4 (a part's short side is 2, or 6 and more, so lanes and half parks only go where that holds), writes correct part edges, gives every block biome `"town"`, and ports V3/V4 with their thresholds plus M4a. It must also hold R-1 to R-7. I judged the diff against 412a199 (commit ccc5562).

## Does the branch do it?
- **1. Moved, re-keyed (R-3).** `planBlocks` in `src/city/land/plan.ts` follows the old `src/render3d/tilecity.ts` version line for line: the same quotas, ordering, `claimsAlley`, and alley top-up by length then id. It changes two things: `hashOf(seed, kind, id)` becomes `rand(kind, id)`, and there is the half-park guard from criterion 2. The parts loop is in `planLand`. All randomness is `rand("park", id)`, `rand("parkside", id)` and `rand("lane", id)`, and `stageRand("land", seed)` turns these into `"land:<seed>:<key>"`. There is no `Math.random`, no clock and no module state. `stableHash` returns `>>> 0`, so `% 2` and `% options.length` are never negative. Tests: R-3 in `stage.test.ts` (the same city gives the same digest, another seed gives another digest). Met.
- **2. Parts are 2, or 6 and more.** `partSideOk` and `lanePositions` enforce this. The lane's place is `options[rand("lane", id) % options.length]`. A half park is allowed only where `halfParkLeaves(short) >= 6`. Tests in `plan.test.ts`:
  - the `lanePositions` table and a sweep from 9 to 40;
  - "every place is reached by some value" (by hash);
  - the half-park fixture: 12x10 and 12x9 take no half park, 12x11 does;
  - the failing fixture the ticket asked for: a 9-cell side cut 4 / lane / 4, which `evaluateLand` fails as M4a naming both parts.
  
  `run` in `stage.ts` turns any M4a failure into a `CityStageError` naming the part. Met.
- **3. Edges.** `mkPart` sets edges to street by default, lane toward the lane and park toward a half park. Fixture tests cover:
  - a strip on either side of the lane;
  - a lane along x;
  - both half-park orientations;
  - a whole park and a plain block.
  
  On every named city, `stage.test.ts` checks two things. First, the cell beyond each side matches the edge, and every street edge lies on the block's boundary. Second, a strip's long sides are exactly `["lane", "street"]`. It also checks that every block cell has exactly one owner and that nothing lies outside a block. Met.
- **4. V3, V4.** `check.ts` counts alleys and parks as edge-connected components of the layer's own cells, not from the planner's sets. That is the same method `evaluateVariety` uses. The needed counts are `ceil(n / ALLEY_ONE_IN_BLOCKS)` and `ceil(n / PARK_ONE_IN_BLOCKS)`, and the constants keep the same values (4 and 6). `LAND_CHECK` is `{ V3: 0, V4: 0 }`, as `VARIETY_CHECK` is. No threshold moved. All 13 named cities pass V3, V4 and M4a at 0. The before/after report the ticket asked for is printed by the "criterion 4 report" test. I ran it:
  - old and new alley and park counts are equal on every named city;
  - the old mid-side cut broke rule 4 on seeds 4, 5, 7 and 9 and on 6x4 seed 3;
  - the new cut breaks it on none.
  
  Met.
- **5. Biome.** Every block is `"town"`, asserted per named city. The grep test over `src/city/` (non-test `.ts`) finds no reader of `.biome`. Met.
- **6. R-1 to R-7 for land.**
  - Legend: street, court part, strip part, lane, whole park, half park, as asked.
  - R-1: the frozen-layer test. Freezing is the runner's, from A1.
  - R-2: failures throw `CityStageError` with a reason starting "V3:", "V4:" or "M4a:".
  - R-4: digests are pinned on the four cities, and there is a test-double test.
  - R-5: the picture test checks the size, the legend, and every cell against the layer.
  - R-6: the import test (land imports only `./`, `../../core` and `../pipeline/`).
  - R-7: a 6x6 run, and a test that no source names a block count or size.
  
  Everything except one R-7 point is met; see Must fix.

**The carried A1 could-improve** (`src/city/stages.ts`):
- `pipeline/run.ts` now imports no stage. `stages.ts` is the only file that imports every stage. No stage folder imports `pipeline/index.ts` or `stages.ts` (I checked with grep). The index re-exports `BUILT_STAGES` and `runCity`, so `src/render3d/planview.ts` keeps working unchanged. There is no cycle.

**The `run.test.ts` edits** are honest, not a loosened check:
- A 1x1 city has one block, and needs ceil(1/4) = 1 alley and ceil(1/6) = 1 park. A block never has both, so with land built, a full default run of a 1x1 city must fail V3 or V4. That test checks that the runner records stage 1's digest and a frozen layer. Stopping at `"streets"` tests the same thing.
- The "not built" test needed a stage that is still unbuilt. `"land"` is now built, so `"mass"` is the right stand-in, and `"ground"` is still there too.

## Rule conflicts and risks
- **R-7, linear passes.** `laneCells` (`src/city/land/check.ts`) calls `blocks.find(...)` once per lane. It runs on every run (V3 through `landVariety`) and in `picture`, so its cost is lanes x blocks, which is quadratic in blocks rather than linear in cells. It is harmless at 3x3 to 6x6, but R-7 asks the reviewer to check exactly this. Everything else is linear or n log n in blocks: `planBlocks` sorts, `planLand` does constant work per block, `components` uses a set, and `picture` uses a map.
- **Files.** The ticket's Files for B lists only `src/city/land/`. The branch also adds `src/city/stages.ts`, edits `src/city/pipeline/{index,run,run.test}.ts`, and changes one import line in each of three `src/city/streets/*.test.ts` files. The brief asked for this (the carried A1 item), and every one of those folders belongs to the planner. None is on the must-not-touch list. I am noting it, not blocking on it. The merge note should say it was asked for.
- **Test-only import from `src/render3d/`.** `stage.test.ts` imports the old `planBlocks` from `../../render3d/tilecity` for the criterion 4 report. This file is a test, and the same pattern exists in `streets/equal.test.ts` from A1. `src/city/land/*.ts` source stays pure.
- **6x6.** The R-7 test passes whether the run ends `ok` or fails as V3, V4 or M4a. That is what the ticket asked for (nothing tuned). The test does not say which way the run ends.
- No rule on purity, dependencies or GDD Decided rules is broken. `src/grid/`, `src/night/` and `src/core/` are untouched.

## Must fix
1. `src/city/land/check.ts`, `laneCells`: look the block up in a `Map` built once from `blocks` (id to block), not with `blocks.find` per lane. That makes the V3 pass and the picture linear in cells, as R-7 asks. Digests and outputs stay the same.

## Could improve
1. `plan.ts` `shapeOf` labels any part with a short side of 2 or less as `"strip"`, so a 1-cell part would be called a strip. M4a and the stage test would still catch it. `=== STRIP_CELLS` would say what is meant.
2. `planLand`'s `plan.alleys.has(b.id) && options.length > 0` falls back to a plain court block without a word. `planBlocks` only picks blocks with a side of 9 or more, and those always have a lane position, so the branch is dead code. A `CityStageError` there would make the failure loud if that assumption ever changes (R-2: failing is the only way out).
3. The R-7 6x6 test could log whether the run ended ok or as a failure, so Josh sees which way the larger city goes.
4. `src/city/pipeline/error.ts`'s docstring still says `CityRunError` is thrown by `runCity`. It is now thrown by `runStages`, which `runCity` calls.
