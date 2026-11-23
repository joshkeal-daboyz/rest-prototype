ticket: 073f1b2-ruin-growth-on
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Switch on the ruin's trees under spans and its roof growth, as Josh ruled. Ruin saplings and park trees are placed with their crowns through lines and over poles, lights, lamp-post places and drop ends. Only the trunk keeps 0.3 m off a pole, light or lamp-post place, and T-2 still judges it. Roof pieces, dead trees included, keep 0.3 m off a rooftop pole and never meet a rooftop line in plan. `PIN_GROWTH` is re-taken for the two rulings.

## Does the branch do it?
F1b2 is commit 75f4171, on `ticket/073f1b1-t1-ruin-trees` on top of F1b1, not on the ticket's `ticket/073f1b2-ruin-growth-on`. It touches only `src/city/ruin/`: `constants.ts`, `grow.ts`, `guard.ts`, and `grow.test.ts`, `stage.test.ts`, `named.test.ts`. At 75f4171, `npx vitest run --maxWorkers=1 src/city/pipeline/ src/city/ruin/ src/render3d/ruinpin.test.ts` gives 16 files and 224 tests, all passing, and `npx tsc --noEmit` is clean. Per the load note, I did not run the whole suite.

1. **The switches.** Met. `RUIN_TREES_UNDER_SPANS` and `RUIN_ROOF_GROWTH` are `true`, and `RUIN_ROOF_DEAD_TREES` and `RUIN_VINE_06` are unchanged. The test "the switches (criterion 7) ... are exported with the values the ticket says" asserts all four.

2. **Crowns over the circuit.** Met. The behaviour:
   - `grow.ts` `treeVerdict`: with `treesUnderSpans`, F1's crown verdict is only reported ("over-span" / "over-point"). The only refusal is a trunk under `TRUNK_CLEAR_M` (0.3 m) from a pole, light or lamp-post place.
   - With the switch off, F1's crown-clear rule stands, and the "off: ..." tests keep it as a test double.
   - Placed trees are counted as `crownOverSpan` and `crownOverPoint`, and the under-span set is still filled.

   The tests:
   - Span: "on (as built; F1b2): a sapling whose crown meets the span is placed ..." places the sapling. It runs `assertEraReadable` without a throw and checks that `t1RuinTreeCovers` returns `["canopyOverLine"]`.
   - Points: "on: a crown that covers a pole, a street light or a lamp-post place is placed ..." covers each of the three at three distances from the trunk: 1.1 m is placed, 0.2 m is refused, 0.4 m is placed.
   - Real city: `stage.test.ts` "some tree spots are under a span ... are placed now" shows every under-span spot placed with the switch on, and none placed with it off.
   - No throw on a point: the drop and point fixtures do not go through `assertEraReadable`, but F1b1's `eras.test.ts` case covers that for a ruin tree over a pole. See Could improve 1 for the drop end.

3. **Roof growth.** Met. The real-city test "as built (RUIN_ROOF_GROWTH true) the layer has roof adds; with it off ... none, and every other add is the same" covers on, off, and the rest of the layer being equal.
   - In `tryRoof` (`grow.ts`), a roof piece is refused if `circuitHit` with `ROOF_POLE_CLEAR_M` (0.3 m, wider than F1's 0.2 m `CIRCUIT_MARGIN_M`) hits a point, or if any line meets its footprint (`segmentMeetsRect`, a Liang-Barsky clip in `guard.ts`).
   - The new test "roof pieces, a Tree_Dead_* included, never sit within 0.3 m of a rooftop pole or have a footprint that meets a rooftop line in plan" checks, over 8 seeds on two decks, the rect-to-point distance and the line crossing. Its control shows the same decks do take pieces when there is no circuit.
   - "Unscaled, up to 2 per column, 0.1 m off H3" is F1's code, unchanged.

4. **T-2 still holds.** Met. Placed trees still go through `treeAt`, which goes through `add(p, false)` (option G). F1's T-2 fixtures in `grow.test.ts` are not in the diff and pass. On the hand-placed real city, "the independent checks ... find nothing" now passes `era: "ruin"` and finds no T-1 or T-2 failure.

5. **The pins.** Met. `PIN_GROWTH` is re-taken for all four pin cities, and the comment names both rulings and the K2/F2g flag. "The clean digests of the four pin cities are the same with and without the pass" passes, as does "every clean digest, and the history, tech and hold-out layers' digests, are as their stages wrote them (X-1)". Naming the moved snapshots is the playtester's job.

6. **The numbers.** Mostly met, as reported output:
   - Roof pieces a city: 447 to 934, by key. The pre-check sketched 484 to 1,008. Of these, `Tree_Dead_01` is 16 to 46 and `Tree_Dead_02` is 33 to 74.
   - The under-span row on the named runs reads 0 and says why (no circuit until K2).
   - The hand-placed real-city run: 31 poles, 5 spans, 3 crowns placed over a span, 0 over a point, 1,143 roof pieces, and `t1RuinTreeCovers` 3, all `canopyOverLine`.
   - Missing: the named-run numbers have no "trees placed with a crown over a point, per run" row. It would read 0 for the same reason. Could improve 2.

## Rule conflicts and risks
- No hard rule broken. Only `src/city/ruin/` is touched, the code is pure, there is no new dependency, and nothing is in `src/core/`, `src/city/pipeline/` or `src/render3d/`. The rules it relaxes (B8 for ruin trees, B10 for the ruin's roofs) are the ones Josh ruled on and the ticket's table lists.
- **"Poles too" barely shows outside fixtures.** On the hand-placed real city, 0 crowns are placed over a point. A tree's footprint is its crown's bounds, and `free(rect, 0, kit.h, CLEAR_M)` keeps that whole footprint 0.3 m off every standing piece. So wherever a pole, light or lamp post is itself a standing piece (stage 6's or a ground prop), the crown still cannot cover it. This is what the ticket's trunk paragraph says ("keeps F1's 0.3 m clearance from every standing piece"), so it is not a defect. But Josh may expect to see crowns over lights in the ruin, and he won't until the trunk is modelled apart from the crown. Worth a line when this is shown to him.
- The trunk is read as the tree's centre point: the 0.3 m is measured from `(x, z)`, with no trunk radius. The ticket's "0.3 m clear of its point" allows that reading, but a real trunk is wider than a point.
- The roof line rule refuses a roof piece that meets **any** line in plan, not only rooftop lines. That is stricter than the ruling and is safe. Today it can only bite when a street span's plan crosses a roof deck.
- Branch and order: F1b2 sits on the F1b1 branch, not on `ticket/073f1b2-ruin-growth-on` after F1b1 merged. That is the main session's call. It also means the two must merge together, because F1b1's 34ab95f alone leaves three F1 tests red that this commit replaces (noted in F1b1's review).
- The ticket's own "raised, not settled" item stands: a tree may now stand through a job's line or over a job's pole. The `PIN_GROWTH` comment carries the flag for K2 and F2g.

## Must fix
none

## Could improve
1. `grow.test.ts`, the drop-end case in "on: a crown that covers a pole ...". The sapling is `Tree_Birch_01`, which is 4.547 m tall, under `DROP_HIGH_M` (5.5 m). Its crown is never over a drop by T-1's reading, so that assertion would pass with the switch off as well. Use a park tree (`LARGE_KEY` or `GIANT_KEY`), or a sapling key over 5.5 m, and assert `crownOverPoint` is 1, so the drop end is really exercised.
2. `named.test.ts`, the numbers block: add a "trees placed with a crown over a pole, light, lamp-post place or drop end, per run" row (`crownOverPoint`), and a "trees placed through a line" row (`crownOverSpan`). Each should say "(no circuit until K2: so none)", as criterion 6 lists them.
3. `grow.ts` `trySapling`: an over-span spot is pushed to `underSpanSpots` before `treeAt`, so a spot that option G then refuses is still listed. That makes the hand-placed log's "under-span spots placed" label wrong whenever T-2 refuses one. Push it only when `treeAt` returns `"placed"` (as on), or rename the label.
