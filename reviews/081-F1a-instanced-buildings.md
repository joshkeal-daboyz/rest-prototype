ticket: 081-F1a-instanced-buildings
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Draw the city's building pieces as one `InstancedMesh` per (key, colourway, sub-mesh, 60 m chunk), each culled on its own bounding sphere, instead of one clone per piece. `BuildingsDraw.instances` says where each building's pieces are. Buildings named in a new `exclude` argument (cityview passes `lampsOf`'s buildings) stay as clones in `building:<id>` groups, so L1's lit windows keep working until F1b. The existing building tests are rewritten to read the instances, and the gain is measured in the pane.

## Does the branch do it?
I reviewed `git diff origin/main...HEAD` (394ae3d). The local `main` ref is stale, so I diffed against origin. The diff touches 3 files: `src/render3d/plan3d.ts`, `src/render3d/plan3d.test.ts` and `src/render3d/cityview.ts`. I ran `npx vitest run --maxWorkers=2 src/render3d/plan3d.test.ts` in the foreground: 81 passed in 81.5 s.

1. **One instancer per key, colourway and chunk: met.**
   - In `buildingBoxes` (`plan3d.ts`), each piece that is not excluded goes into a batch keyed `key|colourway|floor(x/60),floor(z/60)`.
   - Each batch gives one `InstancedMesh` per `meshParts` sub-mesh. The instance matrix is the placement's compose times the sub-mesh's local matrix. Each instancer calls `computeBoundingSphere()` on its own, and three 0.187 culls an `InstancedMesh` on that sphere.
   - `BUILDING_CHUNK_M = 60` is exported.
   - The test is "draws one instancer per key, colourway and chunk, holding exactly the pieces that share them". It checks that the instancer names equal the set of (key, colourway, chunk) ids, with no duplicates, so it would fail if pieces were split per building or if colourway or chunk were ignored. It checks each instancer's `count`, that every building's `instances` entry points at the instancer of its own id, and that at least one key and colourway is split across chunks.
   - The matrices at the placements are checked through `instances` by the rewritten `expectPlaced` helper (`getMatrixAt`, to 4 places, which suits Float32 storage).
   - It runs on 6 x 6 seed 1, not the three-building fixture the criterion names. See could-improve 1.
2. **Excluded buildings stay clones: met.** In `buildingBoxes`, a group is made only for an excluded id, and its pieces go through `placedClone` and `paintStack` as before. The test "keeps an excluded building as clones in its own group, painted in its colourway, and out of every instancer" checks four things: the one `building:<id>` group, its wrapper count, the `stub-<colourway>` map, and that the building is absent from `instances` and from the instancers' total count.
   - `cityview.ts` passes `new Set(lampsOf.keys())`. `lampsOf` is built at line 580, before `build`. `standWindows` still walks `buildings.groups`, which now holds exactly those buildings, so `litBuilding` gets the same groups it got before.
3. **The existing building tests read the instances: met, 6 rewritten.** The 6 are:
   - "draws one instance per piece ..." (renamed, body changed);
   - "paints a building in its loaded colourway ..." (body);
   - "draws every ground instance ..." (renamed, body);
   - "builds the full group with stub roots ... one instance per listed piece" (renamed; its body is the shared `expectPlaced` helper);
   - the J test at about line 1419 that counts painted maps (body);
   - "paints the stop sign's meshes on 01_A ..." (body: the building names now come from the instancers).

   Added 2 plus rewritten 6 is 8, within the ticket's 8 and the PR cap of 15. The new helpers `expectInstance` and `materialsOfBuilding` keep each rewrite short, as the ticket suggested.
4. **Measure: met (browser, by the main session).** `docs/design/081-F-measurements.md` (commit 5704755 on the 081 branch) gives the building-piece calls and the medians for both views, before power:
   - district: building pieces 1,539 calls, CPU median 10.50 ms;
   - 1280 x 800: 2,710 calls, 13.70 ms.

   Against M1, the district view's building-piece calls fall from 3,987 to 1,539.

## Rule conflicts and risks
- `src/grid/` and `src/night/` are not touched. There is no new dependency, no GDD rule change and no puzzle change. Every touched file is in the ticket's list, and `models3d.ts` is unchanged (`meshParts` was already exported).
- **cityview.ts has one line beyond the `exclude` argument.** The `perf=1` family map also counts `city.buildings.instancers` as "building pieces". Without it, the instancers would land in "other" and criterion 4 could not be read. The ticket's "leave the `perf=1` log alone" was about building F0 and F1a at once, and F0 has merged. I don't count it as scope creep.
- **The goal's "a few hundred" calls is not reached.** The district view still has 1,539 building-piece calls, because splitting by colourway, sub-mesh and chunk multiplies the instancer count. The CPU bar (16.7 ms) is already met before power. After the Relight is F1b's row, so this is for M2, not a blocker here.
- "draws every ground instance ..." took 23 to 27 s in my runs. Most of that is building the four pin cities the first time this file needs them. It is an existing case in an existing file, so the 2 s new-file budget does not apply.

## Must fix
none

## Could improve
1. Criterion 1 names "a fixture of three buildings". The test uses the cached 6 x 6 seed 1 plan instead, the one city the test policy allows. It costs about 0.7 s and would fail on each part of the rule, so I don't count it as a policy break. A real three-building fixture would need `buildingBoxes` exported or a hand-built six-layer plan. If the architect wants the fixture, that is the change in `plan3d.test.ts`.
2. In "with empty roots clones no piece ...", `e.buildings.groups.every((g) => g.children.length === 0)` is now always true, because no building is excluded and `groups` is empty. Adding `expect(e.buildings.instancers).toHaveLength(0)` would keep the "no piece drawn with empty roots" check real.
3. The `plan3d.ts` report line (about line 1561) still says "N building groups, N pieces cloned". Pieces are now instanced, so it could give the instancer count and say "pieces drawn".
4. The `BuildingsDraw.pieces` doc comment still says "`pieces` of them are cloned".
