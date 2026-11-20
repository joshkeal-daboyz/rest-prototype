ticket: 070a4b-one-way
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 1 of the split plan gets one-way streets. They are 4 cells wide (with parking) or 3 cells (bare), always with a pavement on each side. The edge ring stays two-way, every junction stays reachable, Josh's S9 and S10 rules hold, and stage 1 places the arrows. Junctions, S2, S3 and S6 now work for any street width. A share option of 0 gives A4's plan back. All of this lives in `src/city/streets/`, plus the architect's fold-in of the types in `src/core/cityplan.ts`.

## Does the branch do it?
- **0 (architect).** a331094 touches only `src/core/cityplan.ts`. `CityPlanStreet extends CityStreet, CityStreetTraffic`, `CityStreetsLayer` gains `arrows`, and the two `...A4b` types are gone. The builder's commit dd5c25b does not touch `src/core/`.
- **1 Sections.** `SECTION_BANDS`, `carriageOfSection` and `streetWidthFailures` are in `check.ts`. The check reads the carriageway from the section (`CARRIAGE_M`, or `ONE_WAY_CARRIAGE_M` 10/5), requires the bands to match the section cell for cell, and requires flow "both" exactly on two-way streets. An avenue still fails. Tests in `oneway.test.ts` "the sections": a named-city loop, plus fixtures for two lane cells, parking on both sides, and no pavement on one side. Each fixture failure names `x:7`. `profile` stays "street".
- **2 Choice.** In `cutOutline` a cut is a candidate when `!(before.edge && after.edge)`. It draws its own keys "oneway", "bare" and "oneway"/"park", so the "split" draws are not shifted. No test counts one-way or bare streets.
- **3 Off gives A4's plan.** `laySplit(..., oneWayShare)` and `streetsStageWith(0)` exist. The test compares the cells, blocks, junctions and outline of all 13 named cities to digests the builder says came from A4's head. I also checked the code: with share 0, `widthAt` is always 5 and `keepsS3` reduces to A4's condition (`e.hiAt === loAt` is the same as A4's `e.hi === lo + 3`). The draws are unchanged, so the equality is structural and not luck.
- **4 S7.** `s7Failures` is a forward search and a backward search over the junction graph. It also requires every junction to have an arm in and an arm out (criterion 9). There are fixtures for a corner with both streets pointing in and with both pointing out.
- **5 S8.** Edge streets are built as `twoWay` 5-cell streets, and `s8Failures` has a fixture.
- **6 S9.** `oneWayNeighbours` and `s9Failures` exist, and `assignFlows` two-colours each group of one-way streets that touch. The test is real: it walks every lattice row and column of the cells independently, gets the same neighbour pairs, and asserts that each pair runs opposite ways. It also asserts the case occurs (pairs > 0). One difference from the ticket's wording: a group that cannot be two-coloured makes the whole draw miss, rather than making one street two-way and redrawing. Both end in the next draw, which the ticket allows.
- **7 S10.** `ownBand` and `s10Violations` are in `check.ts`. When a block loses its last band of its own, `laySplit` keeps that cut's parking (the `keep` set) and redoes the cuts. A test cross-checks `ownBand` against the parking cells, and there is a fixture that names the block and the street.
- **8 Lattice.** `CUT_MIN_CELLS` is unchanged as the trigger. The cut range and `fine` take the cut's own width, and the only `STREET_CELLS` left in `split.ts` is the edge streets' bound (5, correct). A cut that lines up with an earlier one takes its section (`linedWith`). The S3 gap is measured between centre lines (`centre2`), with a fixture at 3 cells versus 5. Block sides are found by the pavement that touches the block (`first`/`last` index). `centre_m` is tested against the lane cells.
- **9 Junctions.** `findJunctions` indexes streets by carriageway start and builds the junction as a `zcw x xcw` rectangle. The width-aware S2 test is in `split.test.ts`. The S6 facing span is `e.bands.length`, and the test is updated. Junction sizes are tested between 1 and 3 each way.
- **10 Arrows.** `layArrows` puts an arrow on the first cell of each unbroken lane run in the direction of traffic, then one every `ONE_WAY_ARROW_EVERY` cells. It is tested from the cells: role lane, its own street, `toward` the flow, none on a two-way street.
- **11 Picture.** Nine legend entries; the one-way lane is index 7 and the arrow points are index 8. The main session's gate reports `planview.test.ts` as passing.
- **12 Pins.** The four pins are re-taken, and the describe block names A4b. The 6 x 6 test does not assert a count.
- **13 Report.** This is the builder's report to the main session and is not on the branch, so I can't check it.
- **14.** For the main session.
- **15.** Purity holds: there is no timer, `Math.random`, DOM or other folder in the `split.ts`/`check.ts` imports. `layout.ts`, `src/render3d/`, `src/city/stages.ts`, `src/city/pipeline/` and the docs are unchanged. I ran `oneway.test.ts` and all 46 tests passed.

## Rule conflicts and risks
- None found against the hard rules or the Decided rules (S9 and S10 as Josh worded them, the 2-tile maximum, the two-way ring).
- The S10 redo re-runs every cut of the draw with one more cut kept wide. A cut 1 cell wider shifts the pieces after it, so a redone draw can lay out differently from the first round. That is allowed, because the street keeps its parking. But after `S10_ROUNDS_MAX` rounds the draw is recorded as an "S10" miss, and the ticket says "nothing fails" under S10. I could not find any input that reaches that cap; I did not prove it can't be reached.
- S7's cost includes a sort per street in `junctionsAlong`, which is close to linear and fine at today's scale.

## Must fix
none

## Could improve
1. `oneway.test.ts`, S10: add a check that the case occurs, like S9's `pairs > 0`. At least one named city should have a `oneWayBare` street, so that the S10 cell cross-check is known to run on real data. Today it could pass with no bare streets at all.
2. `split.ts` `laySplit`: either drop the S10 miss after `S10_ROUNDS_MAX`, or say in a comment why it cannot happen. Then the code matches "where no candidate passes, the street keeps its parking; nothing fails".
3. `split.ts` `assignFlows`: the comment could say that a group which cannot be two-coloured makes the draw miss (ticket criterion 6 words this as "becomes two-way ... redrawn"). That tells the pre-check what an "S9" miss in `misses` means.
