ticket: 027g-grid-scale
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Part G of 027: tests, not features. A generated map of 4 feeds, 4 sections and about 400 nodes, with 24 fuseboxes and 6 batteries, that proves four things: random actions stay within the 5 ms budget, a long undo returns to the start, a 6-fuse cascade settles in order, and draft 5's multi-feed rules hold at 4 feeds. If the budget fails, the builder may optimise inside `src/grid/` as long as no rule and no `GridState` field changes.

## Does the branch do it?
I reviewed only commit d96d6ad (part G) on top of part 0 (f9c2ea7). It touches only `src/grid/grid.ts` and the new `src/grid/scale.test.ts`. `npm run typecheck` is clean. `npm test` passes: 44 files and 832 tests, up from 813 on f9c2ea7, so 19 are new. That run includes the schema check of every puzzle file.

- **Generated map.** `bigMap()` in `scale.test.ts` builds 409 nodes and 408 lines: 4 feeds, 24 fuseboxes, 6 batteries and 3 tie switches. It also has faults of every repairable kind and an unreachable target, so the grid never locks into the Relight. The test runs it through `validatePuzzle` and gets no errors, and it asserts every count. It is real.
- **Budget.** The median of 200 seeded random actions (throw, repair, undo) is asserted under 5 ms; the logged figure is 0.70 ms (max 15.7 ms, cold first calls). The bound is the ticket's own number, and the log reports the real figure as asked. createGrid/reset < 50 ms is extra but harmless.
- **Long undo.** It runs 500 actions without undo; more than 300 must take effect (`done > 300`), and the breakers must have moved. Then 500 undos, each counted against the actions done. The test ends with `expect(s).toEqual(initial)` on the **whole** `GridState`. That is stricter than the ticket's list, and it passes.
- **Cascade.** Closing `mb` blows the 6 fuses of section 3 in one action. The test checks the order of the 6 `fuse:blown` events against discovery order, and that there are 6 blown-fuse faults with `fuseLoad` 0. Over 60 fresh grids it measures 2.3 ms and asserts under 5 ms. One undo clears all 6. The 6 fuses sit side by side rather than nested, but the ticket asks only for 6 in one action, in order, and this meets it.
- **Four feeds.**
  - Separate pools: `fa` is over while three feeds have spare room, and the summary capacity of 17 does not save it.
  - Nearest by hops: covered.
  - Ties: the feed listed first in `nodes` wins two-way and four-way ties, and when two paths from the same feed tie, line order decides (the `paths("a"|"b")` test).
  - A switch that lengthens one arm moves the load to the other feed.
  - The meeting line: in a 4-feed ring every meeting line is powered and each feed carries exactly its own 2.
  - `over`: it lists exactly the feeds that are over, in file order (`fc, fa, fd, fb`), as each event fires. It shrinks as feeds clear, and the last event is `over: []`.
  - Loads in `feeds` add up to `load`: checked in the small maps and after every step of a 200-action random walk on the big map.
- **Existing tests and `GridState`.** Every existing `src/grid/` test passes. `types.ts` is untouched.

### Is the `flow` rewrite behaviour-preserving?
The rewrite is allowed by the ticket's "if the budget fails" clause. It is needed, too: I timed the old `grid.ts` (f9c2ea7) on the same cascade at a median of 4.3 to 4.9 ms, which is too close to the 5 ms bar. The new one takes 1.6 to 2.3 ms.

**Line by line.** Each check maps one-to-one onto the old id-keyed `conducts` and walk:
- battery-as-root exemption;
- lamp and battery stop;
- breaker `=== true`;
- fusebox and junction blocked by any fault at the node;
- switch selected output, with `m.switches` falling back to `selected`;
- a switch can't be entered through an output;
- a battery entered only by its input;
- a damaged cable stops the current.

The adjacency order is the same: lines in file order, from-end and to-end pushed per line. So the hop and tie rules are unchanged.

There is one way the semantics could have diverged. The old code keyed everything by string in one `Set`, and its `faultAt` Map kept the last fault per `at`. The new code uses separate node and line arrays. These differ only if a node and a line share an id, or if two faults share an `at`. `validatePuzzle` rejects both (`load.ts` lines 118 and 165), so the two versions behave the same.

`sub` is summed in the same order with the same doubles. The loop that blows a fuse, `nameCulprit`, `blownLamps` and `loadAt` all read `faultNode` as it was at flow time. That matches the old code, which built `faulted` before the new fault was pushed. Everything after the blow loop still runs on the id-keyed `Flow` (from `toFlow`): batteries, springs, `under`, `wouldBlow`, readable and sparking faults.

**Differential test** (a throwaway in my scratchpad; nothing in the repo was edited):
- **Setup.** It loads the old `grid.ts` from f9c2ea7 and the new one side by side. Each runs the same puzzle under the same seeded random actions: throwBreaker, throwSwitch (springs and relays included), release, advance (0.25 to 3.3 s), repairAt (on fault sites and on every fusebox), undo and reset. After every step it compares the return value, the full ordered event log (every payload, including culprit, path, lamps, load, rating and `over`), and the whole serialised `GridState`.
- **Inputs:**
  - all 65 puzzle files, 30 sequences of 150 steps each;
  - 2,246 valid randomly generated puzzles, 3 sequences each. They have 1 to 4 feeds, rings, nested fuses, spring and relay switches, batteries with partial charge, all four fault kinds and shuffled line order.
  - the 027 G big map, 5 sequences of 300 steps.
- **Result:** 8,693 runs and 1,111,253 states compared, with **0 differences**. The runs covered fuse blows with culprits, multi-feed `over` lists, spring returns, battery release and flat, and job completion.
- **Sanity check.** I fed the harness three mutants of the new file: reversed feed seeding, a battery-entry change, and a culprit tie flipped from `<=` to `<`. It caught each one, the last on `12-one-box-three-lamps` with a different culprit.

The only observable difference is the **iteration order** of `GridState.flowFrom`. It used to follow discovery order and now follows the file's line order (`toFlow`, the `for (let l = 0; l < nL; l++)` loop). The entries are identical. Its only consumers (`render/map-renderer.ts:830` and `render/relight.ts:55`) use `.get`, and the old in-repo tests pass. See Could improve 1.

## Rule conflicts and risks
- **Purity holds.** `grid.ts` imports only `../core` and `./types`; there is no DOM, timer or `performance` in it. `performance.now()` appears only in the test. Typed arrays and `Map` carry straight into the 3D game.
- **No Decided rule changed.** The differential above shows the same behaviour on every puzzle and on random maps. No `GridState` field was added or changed.
- **No files outside `src/grid/` and no new dependency.**
- **Small risk:** `flowFrom`'s iteration order changed (see above). Nothing in the repo depends on it, but the 3D game might one day iterate it.
- **Small risk:** the 5 ms medians are timing tests, so a very slow CI machine could make them flaky. The measured headroom is large (0.7 ms against 5 ms, and 2.3 ms against 5 ms).

## Must fix
none

## Could improve
1. In `src/grid/grid.ts` `toFlow`, build `flowFrom` while walking `fi.log` (on the line entries) instead of the `0..nL` loop. Its Map order then stays the old discovery order, and `GridState` is identical even for a consumer that iterates it.
2. In `src/grid/grid.ts`, delete the `adjacency` and `lines` maps (lines 49 to 57). Since the rewrite, nothing reads them.
3. In `src/grid/scale.test.ts`, the test named "a meeting line stays live and loadless when a neighbour is shut" asserts only that `meet_a` is powered, that `dj` is readable, and that the feed loads add up. Its comment says `a2` is "reached from fa", which a dead junction is not. Rename it to what it checks, or assert `feedOf`/`feeds` for the lamps beside the fault.
4. The cascade's 6 fuses are siblings, so each blow restarts the settle but none is nested under another. A variant with one fuse upstream of others would also pin down the outermost-first rule at size. That rule is already covered by `culprit.test.ts` and `blownlamps.test.ts` on small maps.
