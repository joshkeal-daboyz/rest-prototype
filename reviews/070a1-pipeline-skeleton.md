ticket: 070a1-pipeline-skeleton
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A pure pipeline skeleton in `src/city/pipeline/` (runner, sub-seeds, hash, digest, picture helpers) and stage 1 (`streets`) in `src/city/streets/`, moved out of `tileCity`, plus a test showing the layer is exactly today's tile city on the named cities. It also needs stage 1's checks (street width, V1, V2), its picture, its R-4 digest pins and the R-7 6 x 6 run. Nothing outside `src/city/` changes.

## Does the branch do it?
Diff `2edac93..df53211`: 20 new files, all under `src/city/`. `src/core/`, `src/render3d/` and everything on the every-section must-not-touch list are unchanged. The gate on df53211 was reported green; I did not re-run it.

1. **Runner.** Met. `src/city/pipeline/run.ts` `runCity(options, until?, stages = BUILT_STAGES)`:
   - It sorts the stages by `CITY_STAGES` order and stops at `until`.
   - It deep-freezes each returned layer and records `digestOf(layer)`.
   - Each stage gets a frozen snapshot holding only the layers and digests so far.
   - A `CityStageError` becomes a failure with its own reason and cells. Any other throw becomes a failure whose reason is `"bug: <name>: <message>"`.
   - An `until` that is not built throws `CityRunError`.
   - `BUILT_STAGES` holds only `streets`.
   - Tests in `run.test.ts`: "hands each stage only the layers before it", "stops at `until`", the two catch cases with the full failure record, "is a typed error when `until` is a stage that is not built", and "takes stages in any order".
2. **Freeze (R-1).** Met. `deepFreeze` walks every own value. The test "R-1: a stage that assigns into plan.layers.streets fails the run, naming that stage":
   - sets `w = 999` on the frozen layer;
   - expects `failure.stage === "land"` and a `bug:` reason;
   - expects the layer to keep its `w`.

   A second test pushes into `cells` and the run fails. ES modules are strict, so the write throws a TypeError rather than failing silently.
3. **Sub-seeds (R-3).** Met. `seeds.ts`: `stageRand(stage, seed)(...key)` is `stableHash("<prefix>:<seed>:<key>")`, with the prefix `"tile"` for `streets` only. That is the exception R-3 itself makes.
   - `seeds.test.ts` checks that two stages differ, that the same stage, seed and key give the same value, and that the value is `stableHash` of the formula.
   - It checks 20 sampled keys against `stableHash("tile:<seed>:<key>")`. That is a re-typed copy of `hashOf`, because `tilecity.ts`'s `hashOf` is not exported. Criterion 6 then proves it end to end.
4. **Hash and digest (R-4).** Met.
   - `hash.ts` is the same function, line for line, as `stableHash` in `src/render/city.ts:148`. Ten typed-in pairs pin it. I checked `""` = 0x811c9dc5 and `"a"` = 0xe40c292c against FNV-1a by hand.
   - `digest.ts` sorts keys, drops `undefined`, rounds to 1e-6 and writes `-0` as `0`.
   - `digest.test.ts` covers key reordering, a change of 1e-7 (same), a change of 1e-3 (different) and one cell's role (different).
5. **Moved, not rewritten.** Met. I compared `src/city/streets/layout.ts` with `src/render3d/tilecity.ts` lines 501 to 822 at 2edac93.
   - `streetBandAt`, `layoutAxis`, `blockLens`, `cvOf`, `blockSizesWork`, `blockSizesVary`, `blockSizes`, `BLOCK_FALLBACK_*`, `blockType`, `clampBlocks`, the three band profiles and `mkStreet` have the same bodies. The only changes are `Tile*` types renamed to `City*` and `export` added.
   - The band-role loop (columns and rows to street and band, then the role rule) is copied statement for statement.
   - The output shape differs, as the ticket allows. Cells are written once each, row by row, with `street` and `band`. Blocks drop `alley`, `park` and the `TownBlock` world boxes.
   - `hashOf` is now `stageRand("streets", seed)`, which gives `stableHash("tile:<seed>:<key>")`, the same value.
   - `constants.ts` has the values of `tilecity.ts`'s. `KERB_BAY_SHARE_MAX` keeps only `street: 0.3`, as the ticket says. `CARRIAGE_M = 15` is new; the street-width check needs it.
   - `tilecity.ts` keeps its own copies.
6. **Equal to today.** Met, and the test is real. `equal.test.ts`:
   - runs 16 cities: 3 x 3 seeds 1 to 10 (seed 1 is the default) and 6 x 4 seeds 1 to 6, so the named cities plus 4 to 6. It asserts the count is 16.
   - It has one `it` per city, with a 120 s timeout, and requires `r.ok`.
   - `layer.streets` must deep-equal `old.streets`.
   - The blocks must deep-equal `old.blocks` projected to id, bi, bj, i0, i1, j0, j1 and type.
   - For roles, it maps every old cell through `BASE` (parking, buildout and parkingPlain to parkingPlain; kerbCut to pavement). It expands 2-cell pieces to their second cell and skips only `lotSurface` and `plaza`, which are block cells. The result, keyed by cell with role and street, must deep-equal the layer's map.
   - Map equality runs both ways, and `got.size === layer.cells.length` rules out duplicates. A street cell missing on either side, an extra cell, a wrong role or a wrong `street` would fail. It cannot pass vacuously.
   - The only import outside `src/core/` and `src/city/` is `tileCity` and `TileRole` from `../../render3d/tilecity`, in this test file.
7. **Street width, V1 and V2.** Met.
   - `check.ts` `streetsVariety` and `evaluateStreetsVariety` are `blockVariety` and `evaluateVariety` (`frontage.ts:676`, `:717`) reduced to V1 and V2. The thresholds are the same: `BLOCK_CV_MIN - 1e-9`, `ceil(n / 2)` footprints, the floor of `n * (1 - BLOCK_NONSQUARE_MIN)` square blocks allowed, and a limit of 0. The guarded `cvOf` is the same too.
   - `check.test.ts` checks that the named 13 cities pass, that a uniform 3 x 3 grid of 10 x 10 blocks fails V1 and V2, and that an avenue-profile street fails street width (plus a 20 m carriageway on a street profile).
8. **Picture.** Met in substance. `STREETS_LEGEND` is lane, parking band, junction, crossing, pavement, pavement corner and block, with an extra `"none"` at index 0 (see Could improve 1).
   - `stage.test.ts`, on the default city, 3 x 3 seeds 2 and 3, and 6 x 4 seed 1, checks the size against the lattice (`pictureProblems`).
   - It checks that every index is in the legend, that each street cell's index matches its role, and that each block cell is "block".
   - It checks that street cells plus block cells tile the whole lattice, and that all seven kinds appear.
9. **R-4 pins and R-7.** Met.
   - `stage.test.ts` pins the streets digest on the four cities R-4 names, and checks that the default `{}` is 3 x 3 seed 1.
   - The R-4 "test double" clause is in `run.test.ts`: a stand-in later stage leaves the streets digest equal to the standard run's.
   - The R-7 6 x 6 seed 1 run must end `ok` with 36 blocks, or with a `streets` failure that is not a `bug:`.

**The builder's two choices:**
- **Stage 1 throws `CityStageError` on street width, V1 or V2.** This is sound. The check table puts these checks in stage 1, and R-2 says a stage that cannot do its job throws. The old path never throws here; with the fallback lists the pipeline should not throw either, and on the named cities and 6 x 6 it returns `ok`. The thrown reasons name the check (`"street width (grammar 10): ..."`, `"V1: ..."`). The cells give only the first block's corner (see Could improve 4).
- **`streets` ignores the runner's `rand`.** This is sound for A1. Criterion 5 requires `blockLens` and `layoutAxis` to keep their bodies, and those bodies call `hashOf(seed, ...)`. `hashOf` is `stageRand("streets", seed)`, the same function the runner passes, on a seed already truncated the same way. The values are identical, and criterion 6 proves it. The `void rand` comment says so.

## Rule conflicts and risks
- **Purity (R-6):** no import outside `src/core/` and `src/city/`, except the one allowed test-only import. No `Math.random`, `Date`, DOM or three.
- **Scale (R-7):** no block count, block id or lattice size is hard-coded in non-test code. `CITY_BLOCKS_MAX` and the 6-long fallback lists are moved constants. Stage 1 is linear in lattice cells.
- **R-1 (stage folders):** `streets/` imports only `pipeline/` files and its own. `pipeline/run.ts` imports `streets/stage` and `streets/layout` for `BUILT_STAGES` and `clampBlocks`. That is the runner's registry, not stage-to-stage. But it does make `pipeline` and `streets` import each other (`streets/layout` imports `pipeline/seeds`). No cycle today, because `streets` imports single files and not `pipeline/index`. A later stage that imports `"../pipeline"` (the barrel) would close a cycle.
- **`deepFreeze`** skips an object that is already frozen and does not walk into it. A stage that shallow-freezes its own layer would leave its children writable. `Object.freeze` on a non-empty typed array throws, which would show as a `bug:` blamed on that stage. Neither touches stage 1, whose layer is plain objects and arrays.
- **Section K** says the empty `circuit` stub "is A1's, a few lines", but it is not among A1's numbered criteria and is not built. `BUILT_STAGES` has `streets` only.
- No new dependency, no GDD Decided rule touched, `src/grid/` and `src/night/` untouched.

## Must fix
none

## Could improve
1. `src/city/streets/stage.ts` `STREETS_LEGEND`: drop the unused `"none"` entry at index 0 (no streets cell ever takes it), so the legend is exactly criterion 8's seven names and A2's viewer does not list "none" under the picture. Alternatively, have the viewer omit unused entries.
2. Section K's empty `circuit` stub: the main session should decide whether it belongs to A1 now (a few lines in `src/city/circuit/` plus its entry in `BUILT_STAGES`) or to the first section that runs up to stage 7. Today it is in no section's numbered criteria.
3. `src/city/pipeline/run.ts`: move the stage registry (`BUILT_STAGES`) and options normalisation (`clampBlocks`) out of `pipeline/`, or comment that stages must import single `pipeline/*` files and never `pipeline/index`, so the `pipeline` to `streets` import pair never becomes a cycle as stages are added.
4. `src/city/streets/stage.ts`: a V1 or V2 failure records only the first block's corner. Recording every block's corner, or the blocks of the axis whose CV is low, would make the failure banner in A2 more useful.
5. `src/city/pipeline/run.ts` `deepFreeze`: walk into children even when the parent is already frozen (keep a visited set instead), so a shallow-frozen layer is still fully frozen. Skip `ArrayBuffer` views, or reject them with a clear reason.
