ticket: 070d1b-edge-split
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Section D1b of ticket 070 asks for stage 4 (Edge) on the split plan. The bands come from `CityPlanBlock.sides`, one per (side, `across` entry). Outer sides are found from `CityPlanStreet.outer`. P3's cap counts over the whole block side. `check.ts` reads the side list and scans only each street's own span. P1's floor is 0.69 on the pipeline only. The first pass becomes a best fit over the city (M), and a whole park nothing across can serve takes one tile on its own kerb (PB). P1 to P6 must hold on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on), the pins are re-taken and the grid lookups are gone. Only `src/city/edge/` changes.

## Does the branch do it?
I ran `npx vitest run --maxWorkers=2 src/city/edge/stage.test.ts` on 60f6fc2: 219 passed. I did not run `report.test.ts` (100 runs) or the full suite; the main session's gate covered tsc and the city and plan-view folders.

1. **The bands from the sides: met.**
   - `band.ts` builds one `Band` per (block, side name, `across` entry) from `b.sides`. A side with an empty `across` gets one band over its `span`.
   - A band is laid only where `parkingRow` finds a parking band on the block's side of the street. `colsOf`, `rowsOf`, `blockIdAt` and `alongOf` are gone.
   - Test "the bands come from the block sides ... a T's far side has a gap" checks, on all 20 runs, that the cells facing each block are exactly its `across` spans. A later test asserts that block sides with two or more stretches exist (the log says 399).
   - That is a fixture on real cities rather than a typed one, which is acceptable.
2. **The outer side: met.** Outer cells are filled from `s.outer` into `bandOfCell` as "outer", with no band state. Test "the outer side of an edge street is found from `outer`" checks that each such cell is `parkingPlain` and that its street has `outer`.
3. **`sidesOfBlock`: met.** `stretchesOf` holds one `BSide` per (side, entry). `longestFirst` breaks ties by entry.
4. **P3's cap per block side: partly.**
   - The code is right. Each (block, side) has one `SideCap` object, shared by reference by every stretch on that side. `tryAdd` checks `st.side.count`. In `check.ts`, `sideShares` is keyed by street and block and divides by the side's span.
   - The test "P3's cap is the block side's" only asserts that the tiles on a side never exceed `floor(share x len / 2)`. That would also hold under per-stretch caps, because the floors of the parts sum to no more than the floor of the whole.
   - The ticket's fixture is missing: a stretch under 7 cells, whose own cap would be 0, taking a tile while the side's cap has room. Nothing pins Josh's "1. yes" against a revert. The log shows 19 sides with tiles on two stretches, but nothing asserts it. See Must fix 1.
5. **`check.ts`: met.**
   - `adjacent` reads `across` both ways, with a test.
   - The outer test reads `s.outer`.
   - The band scan runs over `s.span` and only over cells whose base cell is this street's band `k`. Test "the band scan runs only inside each street's own span" asserts `badBandCells` is 0 on all 20 runs and that streets ending short of the lattice exist.
6. **P1's floor 0.69: met.**
   - `constants.ts` sets `{ lo: 0.69, hi: 1.5 }`, with Josh's words in the comment.
   - `constants.test.ts` keeps `hi` equal to the old path's, and a test of its own pins the new value, with Josh's ruling in its name.
   - No file in `src/render3d/` and no doc is in the diff. `stage.test.ts` reads `PARK_SUPPLY_BAND.lo` by name.
7. **Kerb cuts on any street: met.** The cut test now also asserts that a bare one-way street has no parking, build-out or plain cell and no tile. A separate test asserts that one-way streets with cuts, and bare one-way streets, exist on the "on" runs.
8. **P1 to P6 on the 20 named runs: met** in `stage.test.ts`, which passes.
   - The thinnest run: 6 x 6 seed 8 one-way on has supply 0.718 (204/284), against a floor of 0.69. The pre-check said 0.729.
   - `report.test.ts` prints supply over demand per named run, and counts and lists the outside cities without asserting them.
   - Dropping the old-path column is consistent with the ticket's "Agree" paragraph: no test compares a pipeline city to a `city=tiles` city past stage 1. It also removes edge's test imports from `src/render3d/`.
   - The report's `NAMED` lists one-way "off" first, so the default (6 x 6 seed 1, on) is not its first entry. See Could improve.
9. **The grid lookups go: met.** The grep test strips comments, then forbids `.bi`, `.bj`, `.line` and the four helper names in `band.ts`, `check.ts`, `stage.ts` and `constants.ts`. `buildEdge` no longer reads `blocksX` or `blocksZ`.
10. **Pins: met.** Four pins on 6 x 6 seeds 1, 2, 3 and 8, one-way on. The test name lists everything D1b moved. No 3 x 3 or 6 x 4 pin is left.
11. **R-1 to R-7: met** as far as I ran them: frozen layers, earlier digests under a test double, determinism, the picture, and no throw on the 1 x 1 fixture.
    - `runCity({})` still defaulting to 3 x 3 is A4d's design. Its criterion 2 keeps `CITY_BLOCKS_DEFAULT` at 3 and says nothing in `src/city/` reads `PLAN_BLOCKS_DEFAULT`.
    - So the default-city test passing `PLAN_BLOCKS_DEFAULT` explicitly is the right reading and not D1b's to change. Reading a streets constant from an edge test is fine.
12. **M, the best fit: met.**
    - `bestFit` is an augmenting-path flow: block, then band state with capacity `min(roomTiles, side cap)`, then side with its cap, then the sink.
    - Blocks go in block order, and each first tries its first candidate with room directly. A block's net outflow stays at most 1, so the result is a matching.
    - Candidates come in the ticket's order: own bands (`ownSorted`), then across bands in `longestFirst` order, then, for a whole park only, its own bands.
    - Laying goes through `tryAdd`. A block whose `tryAdd` refuses gets `first` null.
    - The fixtures cover (a), (b) and (c), the shared side cap, and a brute-force maximality check on 300 random instances. That check is real coverage of "no assignment serves more blocks".
    - The builder's note that the block order counts distinct sides, not stretches, matches criterion 12's words, "fewest own parking sides first". Counting stretches would favour blocks on a T's far side for no stated reason.
13. **PB: met.**
    - A whole park's own bands go to `parkStates`. Only the first pass lists them, and only as the park's last candidates. `acrossState` and the greedy pass read only `states`, so no other block uses them and the park never takes a second tile.
    - The park's tile counts against its side's cap and the city's cap through `tryAdd`, and its `first` is `"own"`.
    - Tests:
      - Abstract fixtures in `bestFit`.
      - On all 20 runs: at most one tile on a park's own kerb; it serves the park; it is there exactly when `first === "own"`.
      - The pre-check's cases (seed 7 off 0:1, seed 3 on 4:2, seed 8 on 5:9 and 5:11) each take their own tile.
    - The 6-cell-side case is shown only abstractly, which is acceptable.
    - The builder's note that the greedy pass's "longer side" uses the whole side length is consistent with criterion 4, where L is the side's span. It also keeps D1's ordering, since in D1 a band was the whole side.

## Rule conflicts and risks
- No purity break. `band.ts` and `check.ts` import only from `src/core` and `src/city/`, with no DOM, timer or render3d import. Every edited file is in `src/city/edge/`, there is no new dependency, and no doc is edited.
- The P1 margin is thin: 6 x 6 seed 8 one-way on is at 0.718, 0.028 above the 0.69 floor. A later stage-1 to stage-3 change could tip it. Per the ticket's stop rule (R-2) that would go to Josh, not be tuned.
- `bestFit`'s capacities leave out the city-wide `BAYS_PER_100M_MAX`. The ticket accepts this: laying through `tryAdd` enforces it, and a refused block falls to `first` null.
- `bestFit`'s `dfs` is recursive. With at most about 36 blocks plus a few hundred states and sides on 6 x 6, the depth is small. Larger cities would want an iterative version.

## Must fix
1. **`src/city/edge/stage.test.ts`: add the criterion 4 fixture for the shared cap.**
   - Add a typed or constructed case where a block side faces a T. Its total cap must be room for at least one tile, and one stretch must be under 7 cells (its own cap would be 0). Assert that this stretch takes a tile.
   - Or, at minimum, assert on the named runs that some tile lies on a stretch whose per-stretch cap `floor(KERB_BAY_SHARE_MAX x stretchLen / 2)` is 0.
   - Expected effect: reverting to per-stretch caps, the option Josh declined with "1. yes", fails a test. Today it would not: the existing "never exceeds the side's cap" assertion also holds under per-stretch caps, and the "19 of them with tiles on two stretches" count is only logged.

## Could improve
1. `src/city/edge/report.test.ts`: build `NAMED` with "on" first, as `stage.test.ts` does, so the default city 6 x 6 seed 1 one-way on is first, as criterion 8 says.
2. `band.ts`: `ownSides` builds a `Set` of side names from `sidesOfBlock`, filtered by `states.has`. A one-line comment saying that it counts sides, not stretches, on purpose (criterion 12's wording) would stop the next reader from "fixing" it.
3. `band.ts`: `bestFit`'s doc comment could say it is a max-flow (block, state, side, sink), so the "augmenting chain" wording matches the code.
