ticket: 073e2-holdout-camps
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 12, `holdout`, for the hold-out era. Each held district gets camps, stores, clutter and roof items, then stalls, water towers and barricades from `held` 1/3, then farms from 2/3. Density reads `held` only. The only changes are `remove`s. The layer is split into the steps power (empty), settle and barricade. Barricades are placed under option C. T-1 and T-2 end the stage. The kit is typed and pinned. The power and settle digests are pinned, and the barricade digest is only reported until E1 merges.

## Does the branch do it?
I ran `npx vitest run --maxWorkers=1 src/city/holdout/ src/render3d/holdoutpin.test.ts`: 4 files, 56 tests, all pass. `npx tsc --noEmit` is clean. I did not run the whole suite (load note).

1. **The layer.** Met. `stage.ts` `buildHoldout`/`layerOf` write `{stage, adds, changes, steps}` with power (0, 0), then settle, then barricade. Ids are `holdout:<kind>:<cell, place id or mouth key>`, built from plan data and not from list position (`settle.ts` `make`, `barricade.ts` walls). Changes are only `remove`s: park props for farms and square props for stalls (`settle.ts` `removeProp`), traffic pieces for barricades. `stage.test.ts` "criterion 1" checks unique ids, each kind in its step, each district equal to its cell's district, removes only with each piece once, and the step counts summing. `named.test.ts` repeats this on all 20 runs.
2. **The bands.** Met. `BAND_MID`, `BAND_HIGH` and the `P_*` chances are in `constants.ts`, and every chance is `P x held`. "criterion 2" uses the 0/0.2/0.5/0.8 fixture: nothing at 0, only the small kinds at 0.2, no farm below 2/3, and farms only at 2/3 or above. The monotone test (0.2 <= 0.5 <= 0.8 per district on a fixed hash) covers X-6. Two "too" clauses are weakly asserted (could-improve 2).
3. **The places.** Met. Each kind has its own test in "criterion 3":
   - Camps: inside their place's cells, 1 m off buildings, 1.5 m apart, 0.3 m clear of clean pieces, never scaled. The only prop removes in the layer belong to farm parks or stall squares.
   - Water towers: at most one per court, `y = 0`, never over a built cell.
   - Farms: inside the park's interior rectangle (no `parkEdge` cell), never scaled, each with its irrigator, the park's props removed. The tiny-park fixture is left a park.
   - Stalls: one `Bld_Market_Stall_02` per square, only the props it overlaps removed, no container on a square.
   - Containers: one per bay, centred inside it.
   - Clutter: one per pavement cell at most, its middle kept open.
   - Roof items: the three keys only, at most 2 per column, on the deck and 0.1 m clear of H3's pieces.
   - No excluded key.
4. **Barricades (option C).** Met. `barricade.ts` `placeBarricades` handles the candidates in hashed order. It skips the protected first mouths, builds a variant plan with the walls standing and the traffic pieces under them gone, and keeps a candidate only if `t1Failures` and `t2Failures` are both empty. The fixtures in "criterion 4":
   - A lamp-post place on a wall is skipped for T-1, and every other mouth is unchanged.
   - A corridor plan with two poles is skipped for T-2, and the same mouth is placed without the poles.
   - Poles at every junction across two or more held districts: T-1 and T-2 stay empty and some mouths are skipped for T-2.
   - The hashed-first mouth is always open.
   - Each traffic piece under a wall is removed exactly once.
   - Barricades come last.
5. **T-1 and T-2.** Met. `buildHoldout` reads `resolveBefore(plan, "holdout")` and runs `assertEraReadable` with `holdoutBounds`, after settle and again on the whole layer. "criterion 5" has a forced camp on a pole, which throws `CityStageError` /T-1/. It also has an earlier tech add over a pole, which makes the stage throw.
6. **Dark and textured.** Met as the ticket words it. `KitEntry.emissive` is typed `false`. `holdoutpin.test.ts` checks, under `skipIf(!HAVE_REPORT)`, that every key has textures and none are missing. See the risk on emissive maps below.
7. **The kit pin.** Met. `src/render3d/holdoutpin.test.ts` is one new file. It checks every key's w/h/d against the GLB within 0.005 m inside `it.skipIf(!HAVE_GLB)`, and reads the GLB lazily inside the test. It also checks the copied City Pack roof bounds against `roofkit.ts` and `noveltykit.ts`, and the excluded pieces against their places. The paths are relative `join`s.
8. **R-1 to R-7, X-1, the pins.** Met. `named.test.ts` covers frozen layers, the runner's digest, determinism, and clean digests equal with and without the pass on the four pin cities. The R-6/R-7 import scan allows only `./`, `../../core` and `../pipeline/`, and finds no `bi`, `bj` or `.line`. The `runCity()` spy shows no hold-out call. `PIN_PARTS` pins power and settle only, and the barricade digest is printed "(not pinned)". `testcities.ts` imports `../stages` and `../streets/stage`, but it is test support, is excluded from the scan, and the stage never imports it.
9. **The picture.** Met. `holdoutPicture` gives a legend of `nothing` plus one entry per kind and passes `pictureProblems`. Nothing in `src/render3d/` imports the holdout folder except the pin test.
10. **The numbers.** Reported (`named.test.ts` "criterion 10"). Against the sketch:

    | Measure | Branch | Sketch |
    | --- | --- | --- |
    | Pieces a city | 474 to 1369 | 444 to 1131 |
    | Distinct keys | 37 to 43 | 43 to 46 |
    | Camps | 63 to 169 | 36 to 127 |
    | Water towers | 6 to 32 | 6 to 22 |
    | Farm parks | 0 to 5 | 0 to 5 |
    | Clutter | 104 to 294 | 85 to 281 |
    | Roof items | 175 to 528 | 163 to 418 |
    | Roof items per held building | 0.27 to 0.69 | about 3.2 |
    | Barricade lines | 10 to 58 (40 to 225 walls) | 16 to 40 |

    Option C skipped no mouth on the named runs, as expected with no circuit; the output says so. The stage takes 73 to 156 ms a city.

`src/city/stages.ts` gets the one line asked for.

## Rule conflicts and risks
- **A file outside the list.** `src/city/pipeline/eras.test.ts` is C1's file, and the ticket says "nothing in `src/city/pipeline/`". Registering `holdout` makes the old `["history", "tech"]` assertion false, so some change is forced. B and D1 changed the same line, and B's review accepted it. This branch did not just extend the list. It replaced it with an assertion that only checks order (see could-improve 1).
- **Barricades are well above Josh's "about 30 a city".** That figure is from the pre-check's question 2, and the sketch has 16 to 40. The branch places 10 to 58 lines a city, 40 to 225 walls, closing 49 to 266 street cells. Each is placed at chance `held`, as the ticket's density says, so it is not a rule break. It is the number most likely to surprise Josh when E3 draws it.
- **Some lines are 2 walls, not 3 to 5.** The kit table says `Bld_Wall_02` "3 to 5 in a row". The named runs report "walls a line: 2 to 4": `wallLine` gives 2 walls across a 1-cell junction square and never 5. `stage.test.ts` asserts 3 to 5 only on seed 1's mouths. This is not in the acceptance criteria. Each line still spans ring-cell middle to ring-cell middle, which is what the placement rule asks.
- **Roof items per held building are 0.27 to 0.69, against the sketch's about 3.2.** The total is still in the sketch's range because more buildings count as held. This is reported, not asserted.
- **X-5 rests on the renderer.** The pin test's header says the pack's own materials carry an emissive map, and the draw swaps it for a dark one (`models3d.ts`). The table's `emissive: false` is typed, not read from the asset. Criterion 6 is met as worded, but "none is emissive" holds only because of the renderer's swap.
- **Purity.** `src/grid/`, `src/night/`, `src/core/` and every clean stage folder are untouched. There is no new dependency, and I found no GDD Decided rule changed.

## Must fix
none

## Could improve
1. In `src/city/pipeline/eras.test.ts`, assert the registered list exactly: `["history", "tech", "holdout"]`. That keeps what the line pinned, as B and D1 did. The current filter expression only checks order, so dropping a registered stage would go unnoticed.
2. In `stage.test.ts` "criterion 2", assert the bands fully. A 0.2 district should get camps. The 0.5 band should get each of stall, water tower and barricade, not any one of them. A 0.8 district in the `BANDS` fixture should get a farm. Today farms are only shown on the held-1 `FULL` city.
3. Either make `wallLine` give 3 to 5 walls (for example by extending one cell past the ring on 1-cell junctions), or ask the architect to reword the kit table to "2 to 4". Then assert the range on the named runs, not only on seed 1.
4. Add one assertion that no barricade wall overlaps a settle add. Today it holds only because clutter keeps out of the junction ring and kerb bays happen to lie outside it. `placeBarricades` checks only `world.obstacles`, which are the clean and tech pieces.
5. `BarricadeStats.wallsMin` and `wallsMax` are updated before the overlap and T checks, so they count skipped candidates. Update them after a line is placed so the reported range is the placed walls.
6. Drop the unused `hostOf` and `void hostOf` in the stall test in `stage.test.ts`.
