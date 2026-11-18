ticket: 052-city-dressing-c
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C: a pure `furniture.ts` that puts street furniture on the pavements in front of 051's terrace runs (two lines, pitch, corner and circuit keep-outs, wire clearance, per-run caps, deterministic) and dresses the parking lots and plazas (and here, the alleys). It is drawn through 052 B's instancer in `models3d.ts`. It must change no play, no pick target, nothing on a checkout without the City Pack, and it must use none of the pack's lamps, signals or power boxes.

## Does the branch do it?
The diff against `goal/city-style` touches only `src/render3d/furniture.ts`, `furniture.test.ts` and `models3d.ts`, all in C's file list. `git ls-files assets/private` is empty. I ran `furniture.test.ts` alone on one worker: 16 passed in 30 s. I did not re-run the full suite, as asked.

- **Criterion 9 (pavement rules, every map).** Met. The test "pavement furniture on every map" sweeps `ladder()`, and its geometry is its own, not furniture.ts's. It checks that every pavement piece sits on the wall line or the kerb line within 1e-6, that its centre is inside a pavement band of the run's own road, `FURN_CORNER_M` at both ends, `FURN_PITCH_M` per line, `TREE_PITCH_M` for trees, and `FURN_KEEP_M` from the footprint to every node (lamps included), every pole attach point, every drop line sampled 20 times, and every pad. It checks `WIRE_CLEAR` for anything over `FURN_MAX_H_M`, the per-run caps (hydrant, mailbox, newspaper, bollard, one bus stop and only on runs of 40 m or more), and determinism (it calls the layout a second time and compares deep-equal). Determinism is a function of the run id: every choice is `dressUnit(run.id, ...)`, and open lots use `kind:run`. The applyModels test repeats the keep-out check on the production input path (`furnitureInput` from the scene) on 01, 09 and 64. It also shows that no tall piece stands under an awning, sign or fire escape.
- **Criterion 10 (open lots).** Met. Every open lot on the ladder is dressed inside its rectangle. Exactly two parking tiles abut, start at the back edge and reach the front, and only the tiles are flat. When the billboard is placed, its top is at or under the run's lowest `hMax`. No two solid pieces overlap. `openLotsOf` is pinned against `town.openLots` on every map by position, size and yaw. I also checked with a scratch script that a parking lot's `run` matches `town.openLots` on every map, so the billboard's cap run is the right one in production.
- **Criterion 11 (nothing else changes).** Met. On 01, 09 and 64, the pick targets (kind, id, world matrix, in order), the places, the lots and the building dressing are equal with and without the furniture keys. The frozen town is shown unchanged.
- **Criterion 12 (screenshots).** This one belongs to the main session. It has looked at the plaza on 09. A parking lot and a plain pavement view are still to be seen before Josh is shown.
- **Criterion 13 / 14 / 15.** The diff is inside the allowed files. No kept test is edited. The furniture is never emissive (tested per material), never raycasts (tested with a ray into the group), and has no pick kind.
- **No City Pack / CI.** With `NO_MODELS`, a Town-Pack-only set, or a set with no furniture keys, there are no pieces, no calls and no group (tested). A missing key or GLB node drops only its own pieces (tested). The fixtures are typed in. The only file reads are `puzzles/*.json` and `furniture.ts`'s own source, and those are inside `it` (the module-level `await setOf` uses a fake manifest and a fake GLB). No Windows paths.

On the builder's flags:
1. **Typed `FurnitureInput` instead of `(town, layoutParts, entries)`.** Acceptable. The ticket says the builder may rename local interfaces. `openLotsOf` is proven against the town on every map, and I confirmed the parking-lot run ids match. A plaza's run id differs, but that only changes its hash seed. Exposing `town` on the bundle is a later re-cut, not a blocker.
2. **Wall line from the pavement edge.** This is the right reading. "Out from the fronts" would put items on the setback strip, off the pavement.
3. **Bins only in alleys.** Fine.
4. **Bus stop without its glass.** Fine; one key fewer to load. Josh should see it.
5. **9.4 cm slabs, flat tiles 1 cm up.** Fine.
6. **Billboard lift 4.55 m.** The numbers are consistent (4.55 + 2.345 = 6.895, against a 6.897 m pole). It is unseen; it needs a screenshot.
7. **"+z" fronts.** The same provisional guess as 050 and 052 A. It stays a Josh check (goal notes item 1).
8. **Own cap of 80 draw calls.** Within the ticket's spirit ("a few dozen" from the dressing). The ticket names no furniture cap, so the total ceiling is now 120 + 80. See could-improve 3.
9. **About 25 s ladder sweep with a 240 s timeout.** This does not break the CI rule. The rule bans timers under 1 s and wall-clock waits, and a generous ceiling is neither. The cost is mostly building and packing each ladder map once, which is cached. It is acceptable for a test that proves a rule on every map. See could-improve 4.
10. **Terrace pavements only; no lamps, signals or power boxes; nothing emissive or raycast; no cars.** Confirmed. The `NEVER` regex test proves none of those names appears anywhere in `furniture.ts`. The circuit-streets test confirms no terrace run fronts a line or feed road.

## Rule conflicts and risks
- No GDD Decided rule is touched; this is visual only. No `src/grid/` or `src/night/` change, no new dependency, no file outside the list.
- **Occlusion.** The 25-degree rule is met by construction: everything is under `POLE_HEIGHT` (8.9 m), so in town.ts's own formula, `need = (h - p.y) * OCCLUDE_SLOPE`, the needed distance is 0. The billboard is also under its run's cap. But the test's own occlusion assertion (`p.h * W <= OCCLUDE_SLOPE * nearest`) is not town.ts's formula; it divides where the rule multiplies. It passes, but it does not test the rule it names (could-improve 2).
- The keep-outs are coded and tested only for pavement pieces. Open-lot and alley pieces never call `clearOfBuildings`. I measured with a scratch script on every map: open-lot solids are at least 20.7 m from any node, pole, drop or pad, and every tall open-lot piece (trees, hot-dog stand, billboard) is at least 5.9 world units from a wire span (`WIRE_CLEAR` = 0.25). So there is no breach today, but nothing guards it (could-improve 1).
- `furnitureInput` takes the node keep points as "every top-level scene `Group` not marked `sharedModel`". Any other top-level group that scene.ts adds (at the origin, say) becomes a spurious keep point. This is harmless, since it can only remove furniture, but it is fragile.

## Must fix
none

## Could improve
1. `furniture.ts`: run open-lot and alley pieces through the same `clearOfBuildings` keep-out and wire check. `furniture.test.ts`: extend the criterion 9 keep-out loop to every piece, not only `kind === "pavement"`, so a future map that puts a parking lot by a pole fails a test instead of standing a 6.9 m billboard under a wire.
2. `furniture.test.ts`, line 637: replace the occlusion assertion with town.ts's rule (`dist >= max(0, h*W - p.y) * OCCLUDE_SLOPE` against node tops at `NODE_TOP_Y` and lamp heads at `LAMP_HEAD_Y`), or rename it to say what it does test.
3. Record the furniture's own 80-call cap, or a combined dressing-plus-furniture ceiling, as a line in the ticket or in 053's Numbers table. As it stands, the per-ticket ceiling is only in code.
4. The ladder sweep could share one `townLayout` and `packTown` pass per map across the four ladder tests (`worldOf` already caches; the `openLotsOf` test rebuilds the town). Only worth it if CI time matters.
5. `models3d.ts` `furnitureInput`: take node positions from the puzzle's nodes, or from a named node group, rather than from "unshared top-level Groups".
