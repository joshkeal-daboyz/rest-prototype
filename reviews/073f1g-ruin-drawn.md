ticket: 073f1g-ruin-drawn
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
At `era=ruin` only, draw every ruin add that `resolvePlan` returns once, dark, in its own `plan:ruin` group with its own draw-call cap. Saplings and park trees get a draw-only yaw of `stableHash(id) % 360`, and every tree's extent comes from `ruinCrownBounds`, never from `size`. R12 gets an era-scoped, empty `PLAN_AUDIT_RUIN_ALLOWED`. Clean, tech and holdout stay as they were after E2g.

## Does the branch do it?
The diff against `goal/city-transformations` touches only the three files the ticket lists: `src/render3d/plan3d.ts`, `src/render3d/models3d.ts` and a new `src/render3d/ruindraw.test.ts`. I ran `ruindraw.test.ts`, `holdoutdraw.test.ts` and `eraview.test.ts` at `--maxWorkers=1`: 42 passed, 16 of them in `ruindraw.test.ts`. I did not run `tsc` or the whole suite, per the load note. The main session's gate covered both.

1. **Drawn per key, through `resolvePlan`: met.** `planAtEra` now returns `ruinAdds` from `resolved.adds.ruin`. `plan3dGroups` draws them only when `PLAN_AUDIT_RUIN_ERAS` includes the era. `ruinStage` makes one `instancedOf("plan:ruin", …)`, which is one `dressGroup` call per key. `planRuinDraws` throws `PlanStopError` with the add's cell for a key outside `RUIN_KIT_KEYS`. Tests:
   - "the ruin adds are the resolver's own at ruin…" checks the adds equal `resolvePlan(...).adds.ruin` and that all six kinds are present.
   - "every add is drawn once, at its placement…" checks listed, placed and drawn counts, the count per key, and every instance position.
   - "an add whose key is not in F1's kit stops the draw…" checks the `PlanStopError` and its cell.

   The tech and hold-out groups are still added, unchanged.
2. **Crown, not size: met.** `ruinPlacementOf` places each piece at scale 1 (never `size`), turned by `d.yaw_deg`. Two tests cover it:
   - "a drawn sapling and park tree are at scale 1…" uses roots built from `ruinCrownBounds` and checks each instance's scale is exactly `WORLD_PER_METRE`. It checks the axis-aligned extent equals the crown turned by `drawnYawDeg`, and that the extent exceeds the trunk square.
   - "drawing does not change any placement…" deep-compares `layers.ruin` before and after the draw, and checks that tree yaws stay 0 in the plan.
3. **The drawn yaw: met.** `drawnYawDeg` returns `stableHash(id) % 360` for `sapling` and `park-tree` and the plan's yaw for everything else. `stableHash` returns `>>> 0`, so the yaw is never negative. Tests check it:
   - is the same on two draws;
   - is not one value for every tree on 6 x 6 seed 1;
   - for every other kind, tree-vines included, is the plan yaw, with the same placement object.

   The 0.45 check runs over every kit key with a tree kind, and its list of failing keys is empty.
4. **Clean, tech and holdout unchanged: met.**
   - At clean, `ruin` is null and the child names are the same as a draw with no options.
   - At tech and holdout, the child names match with and without `ruinAdds`, there is no `plan:ruin`, and the tech and hold-out call counts are the same.
   - At ruin, the tech, hold-out and ruin groups are all present.

   E2g's own `holdoutdraw.test.ts` and `eraview.test.ts` still pass.
5. **Dark: met, to the same standard as E2g's criterion 4.** The roots are lit and have emissive maps. The drawn ruin meshes have emissive black and no `emissiveMap`, and the loaded roots stay lit.
6. **R12, era-scoped: met.** `PLAN_AUDIT_RUIN_ALLOWED` is empty and `PLAN_AUDIT_RUIN_ERAS` is `["ruin"]`. `planAudit` gains a fifth parameter with a default, so existing callers are unchanged. Tests cover:
   - no kit key is `isNeverUsed`, and the table is empty;
   - the audit is empty at every era;
   - a never-used key is a finding unless the table allows it, and only for that kind and only at ruin.
7. **Own cap: met.** `RUIN_DRAW_CALLS_MAX = 200` is new. The test checks the ruin's calls stay under it, that the cap covers the kit's key count, and that tech (100) and hold-out (150) are unchanged. The page's report line adds "ruin: drawn of listed … calls (cap …)".
8. **Draw calls per era (hand-back): can't tell from the branch.** No test prints per-era calls with the ruin group. The only per-era print, in `holdoutdraw.test.ts`, still shows tiles, interior, dress, furniture, tech and holdout, with no ruin column. This is a hand-back item, so the builder's report should carry it. See Could improve 1.
9. **Screenshots: the main session's, not judged here.**
10. **Wrong-looking pieces listed (hand-back): nothing is hidden.** I found no nudge, hide or drop in the renderer. Every add whose root loaded is drawn, and an add whose root did not load shows in `leftOut`. Whether the list itself was handed back is the builder's report, which I did not read.

## Rule conflicts and risks
- No hard-rule break. `src/grid/` and `src/night/` are untouched, nothing in `src/city/` or `src/core/` changed, there is no new dependency and no GDD Decided rule moved.
- `models3d.ts` loads the ruin keys only on the plan view's `signColourways` path, the same as the tech and hold-out keys. Other views fetch nothing new.
- The yaw turns a tree about its root's origin. The tests assume, as the ticket does, that the GLB's pivot is the trunk and the crown is centred on it. A real crown that is off-centre on its pivot would overhang differently than the test's synthetic box. That belongs to the screenshots (criteria 9 and 10), not the code.
- The report line's "keys left out" now adds the ruin's `leftOut` but still not the tech's or the hold-out's. This is inconsistent, but harmless.

## Must fix
none

## Could improve
1. `src/render3d/ruindraw.test.ts`: add a per-era draw-call print with a ruin column, as `holdoutdraw.test.ts` prints one for E2g. Criterion 8 would then have a reproducible source instead of relying only on the hand-back.
2. `src/render3d/ruindraw.test.ts`, the criterion 2 test: `geo` and `seenByKey` are written but never read. Remove them.
3. `src/render3d/plan3d.ts`, the report line: either add the tech's and hold-out's `leftOut` to "keys left out", or leave the ruin's out, so the three era groups are treated the same.
