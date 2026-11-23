ticket: 073e2g-holdout-drawn
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section E2g of ticket 073: draw E2's hold-out adds in 3D at `era=holdout` and `era=ruin`, in their own dark `plan:holdout` group with their own cap and an era-scoped R12 table, with E2's removes applied and clean and tech unchanged. Also add flat pictures at `stage=tech|holdout|ruin`, built the way `stage=history` is. Renderer only (`src/render3d/`).

## Does the branch do it?
- **1, flat pictures.** `planview.ts` adds `PassPictureStage`. `planViewRequested` lowercases the stage, so any case works, and `passShown` runs `runCityEra` on `ERA_STAGES`, filtered by `CITY_ERA_STAGES` index up to and including the asked pass. It returns that stage's own `picture` with the title `<stage> - <where>`. A failed run gives the banner and no picture, as `historyShown` does. In `eraview.test.ts`, the "E2g criterion 1" block checks three casings, `planHidesHud`, the title `tech|holdout|ruin - 6x6 seed 1`, the picture size and `pictureProblems` returning `[]` for each of the three. It also checks that history and the clean stages are unchanged. The "nothing after it" part is done in code (the filter), but the test does not really check it (could improve 1).
- **2, drawn per key through `resolvePlan`, removes applied.** `planAtEra` now carries `holdoutAdds` from `resolved.adds.holdout`. `plan3dGroups` draws them only at `PLAN_AUDIT_HOLDOUT_ERAS` (holdout, ruin), through `planHoldoutDraws`, then `holdoutStage`, then `instancedOf("plan:holdout", ...)`, which is the D1g `dressGroup` path. `holdoutPlacementOf` uses x/y/z in metres and `yaw_deg * RAD`. In `holdoutdraw.test.ts`:
  - the adds equal the resolver's own, and none come at clean or tech;
  - every add is listed, placed and drawn once, `perKey` matches, and every instance's position (y included) matches an add of its key;
  - the prop and traffic draws equal the resolved plan's lists and are shorter than the clean ones, so the removes are applied;
  - a key outside `KIT_KEYS` throws `PlanStopError` with the add's cell.

  The turn is implemented but no test checks it (could improve 2).
- **3, clean and tech unchanged.** The new group is added only when hold-out draws exist at holdout or ruin. Tests: at clean there is no hold-out group and the children are the same as with no argument; at tech the children are the same with and without `holdoutAdds`, and the tech calls are equal. The existing `techdraw.test.ts` passes untouched (11 tests).
- **4, dark.** `roots()` gives every kit key a material with an emissive map, a white emissive colour and an intensity of 2. The test walks the `plan:holdout` meshes and finds emissive black and no map, and the source roots are left alone. This matches D1g's own dark test.
- **5, R12 era-scoped.** `PLAN_AUDIT_HOLDOUT_ALLOWED` is an empty typed table (key and kind), scoped to `PLAN_AUDIT_HOLDOUT_ERAS`. `planAudit` reads `tech.holdoutAdds` as layer `holdout`. Tests:
  - every `KIT` key fails `isNeverUsed`, so the table is empty;
  - the audit is empty at clean and at each era;
  - a never-used key is a finding, the table clears it at holdout and ruin but not for another kind or at clean.

  `plan3dGroups` passes `tech`, holdout adds included, to `planAudit`, so the live draw is audited too.
- **6, own cap.** `HOLDOUT_DRAW_CALLS_MAX = 150` (the kit has 44 keys, and some have several sub-meshes). The report line adds the hold-out's drawn, listed, calls and cap. The test checks calls ≤ cap, cap ≥ kit size and `TECH_DRAW_CALLS_MAX === 100`. The other four caps are not changed in the diff, but no test pins them (could improve 3).
- **7, draw calls per era.** This is a hand-back item. The test prints synthetic one-mesh numbers for tech, holdout and ruin (tech 28, holdout 42) and says they are synthetic. That is the criterion's fallback. There is no `it.skipIf(!have)` count with real GLBs, and no clean row (could improve 4).
- **8, screenshots.** The main session takes these. Not judged here.
- **9, wrong-looking pieces listed.** A hand-back item. The renderer nudges, hides and drops nothing: `holdoutStage` filters only on a missing root, which `leftOut` reports.
- **Files.** The diff touches `plan3d.ts`, `planview.ts`, `models3d.ts` (`HOLDOUT_KEYS` loaded beside `TECH_KEYS`, behind the same plan-view-only condition; the loader pins are not touched), the new `holdoutdraw.test.ts`, `eraview.test.ts`, and the ticket (the architect's re-cut commit). Nothing in `src/city/`, `src/core/`, `src/grid/` or `src/night/`.
- **Runs.** `holdoutdraw.test.ts`, `eraview.test.ts` and `techdraw.test.ts` at `--maxWorkers=1`: 37 passed. `npx tsc --noEmit`: clean.

## Rule conflicts and risks
- None found. `src/grid/` and `src/night/` are not touched, there is no new dependency, and no GDD Decided rule is touched. Reading `KIT_KEYS` from `src/city/holdout/kit` is the same renderer-to-city import that D1g makes for `TECH_BOUNDS`.
- Risk: `HOLDOUT_DRAW_CALLS_MAX = 150` was not derived from the real GLBs' sub-mesh counts. If the real Sci-Fi Frontier pieces need more, the cap will show it on the page's report line, not in CI.

## Must fix
none

## Could improve
1. `src/render3d/eraview.test.ts`: the `ERA_STAGES.filter(...)` length assertion only counts the list and says nothing about what ran. To test "nothing after it", check that the `stage=tech` run's plan has no hold-out layer or adds, for example through the run's plan, or with a spy on the later stages.
2. `src/render3d/holdoutdraw.test.ts`, "every add is drawn once": the comment says "the turn is the add's", but only the position is checked. Comparing each instance's rotation with `yaw_deg` would cover the criterion's "its turn".
3. Same file, criterion 6: also pin `TILE_`, `INTERIOR_`, `DRESS_` and `FURN_DRAW_CALLS_MAX` at their current values, as `TECH_` is pinned, so "no existing cap rises" is actually tested.
4. Criterion 7: add the `it.skipIf(!have)` count with real GLBs, reading assets lazily, and a `clean` row to the per-era table, so the hand-back can set the numbers beside D1g's.
