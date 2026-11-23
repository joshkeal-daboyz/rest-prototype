ticket: 070c3-mass-split
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C3 of ticket 070: Mass on the split plan. No drive or frontage-lot mouth on a street lies in a junction-facing stretch widened by `BAY_JUNCTION_CLEAR`. M5 gains that clause. The neighbour a block asks for a lot, and P2's adjacency, are both read from `sides[*].across` rather than from `bi`/`bj`. Mass reads no rank and no street line, and the pins are re-taken as moved by C3. The only files allowed are in `src/city/mass/`.

## Does the branch do it?
- **1, S6 for drives and frontage lots.** `reach.ts` adds `facesJunction`/`mouthFacesJunction`, which read only `sides[s].junctions`, widened 1 each side. `lots.ts` `pick` filters each street offset whose mouth cells (t, t+1 at depth 0) face a junction. Lane-side sites (the first loop in `planLots`) are not filtered, as the criterion says. `constants.ts` has `BAY_JUNCTION_CLEAR = 1`, pinned to `tilecity.ts` in `lots.test.ts` ("the constants moved..."). Fixture: "when the only street sites a part has face a junction none is offered..." shows no drive or frontLot is laid, one walk-through is, and there are no courts. A second test shows mouths stay off a partial span.
- **2, M5 clause.** `check.ts` `checkM5` checks each mouth cell on a block edge against `mouthFacesJunction` and reports "faces a junction" with the opening id and the cell. The failing fixture moves a drive's `-z` mouth (i 8, 9) under span 7..9 and asserts 2 faults matching `block:0:0/drive/0 (drive) faces a junction`. Because 9 is caught only through the widening, the clear is exercised. On the named cities it holds both ways in the stage.test.ts "C3: one-way on/off" tests, which also re-check mouths with their own arithmetic.
- **3, neighbour across.** `NEIGH`/`blockAt` are gone. `acrossOrder` sorts each side's `across` by span length descending, ties by id, and the loop otherwise keeps `LOTS_PER_BLOCK_MAX`, `pick` and the guard. Test "criterion 3: ... read from `across`" shows a lot is hosted across when listed and not when the list is empty.
- **4, P2 adjacency.** `parkingNumbers` builds the `across` sets, and either block listing the other counts. The thresholds are untouched. Test "C3 criterion 4" covers near, diagonal (far), and the one-sided list.
- **5, grep test.** stage.test.ts "C3 criteria 3 and 5" strips comments and rejects `.bi`, `.bj`, `.line`, `bi:`/`bi =` and bracket access in non-test mass files.
- **6, checks and report.** The on/off tests assert `massFailures` is empty and R1 is at least the floor on every named city. The report test logs P2 stalls, wanted, R1, vehicle mouths and the number S6 moved, one-way on and off. The S6-off rerun uses the same `stageRand("mass", seed)` the pipeline uses.
- **7, pins.** The four mass pins are re-taken. The test name and comment say "MOVED BY C3: the split plan, B3's Land, S6" and keep C2's old values on record.
- **8.** The main session's gate: tsc clean, 507 passed on streets, land, mass, pipeline and planview. I re-ran `src/city/mass/lots.test.ts`: 37 passed.

## Rule conflicts and risks
- The diff touches only `src/city/mass/`. There is no new dependency, and no `src/grid/` or `src/night/` change. Test files import `../streets/stage`, `../pipeline/seeds` and `../../render3d/tilecity`, as the existing mass tests already do (read only).
- `mouthFaces` in `lots.ts` assumes a 2-cell mouth (`[0, 1]`). That equals `COURT_CELLS.w` today but is not tied to it.

## Must fix
none

## Could improve
1. `lots.ts` `buildMass(..., s6 = true)`: a switch in production code that exists only for the report test. Counting would-be-moved mouths in the test some other way, or accepting the flag openly, would keep the stage free of a test-only path.
2. `lots.ts` `mouthFaces`: derive the mouth offsets from `COURT_CELLS.w` (or `siteCells(...).drive` at depth 0) instead of the literal `[0, 1]`.
3. Criterion 3's ordering (longest shared span first, ties by id) has no test with two `across` entries on one side. Only listed versus not listed is covered.
4. M5's S6 clause reports one failure per mouth cell (2 for one drive). One per opening would read more cleanly.
