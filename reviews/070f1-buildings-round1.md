ticket: 070f1-buildings
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
Stage 5 (`src/city/buildings/`, pure). It groups every `mass.built` cell into buildings of 2 to 4 columns of one row, plus the 3-cell L at each tight corner (L1). It gives each building a style, colourway and storeys from the stage's `rand` through `colourwayStart`'s finaliser, works out lead and follow (N3, N4) and through or another by `BACK_SAME_SHARE` (Proposed, not pinned), and checks M4c, R2 and R13. It also adds a picture, a report, the R-1 to R-7 tests, a style-table pin in `src/render3d/stylepin.test.ts`, and the `BUILT_STAGES` line.

## Does the branch do it?
- **0 (architect).** The types in `src/core/cityplan.ts` are already on the base. The branch does not touch `src/core/`.
- **1 Rows and buildings.**
  - Rows: `rows.ts` `rowsOfPart` builds a court's outer and inner rows per side and a strip's two long rows, as the `cityplan.ts` comment says.
  - Grouping: `group.ts` `groupPart` lets a cell join only the rows whose front it shows (blind cells join any). Leading stretches are cut into 2 to 4 without leaving 1. Followers are cut where the partner changes. The L is built at each `tightCornersOf` corner. A part that never closes throws `rule 6: ...`.
  - The stage's own check is `check.ts` `buildingFailures`: one building per cell, sizes, consecutive cells, N1, a bend only at a tight corner, and every tight corner built as an L.
  - Named runs: `stage.test.ts` "every built cell is in exactly one building..." and "an L stands exactly at each tight corner...".
  - Fixtures: `fixtures.test.ts` covers the 1-cell stretch (rule 6, cell (4,0) named), the 5-cell, 1-cell, bent-elsewhere and cell-in-no-building layers, the typed-in tight corner closing as one L (cells `2,1 / 1,1 / 1,2`, `rowId` inner +z, `bend` inner +x), and the same corner split into two straight buildings failing L1 and rule 1. I ran this file: 12 passed. Met.
- **2 Style table.** `constants.ts` has the typed-in copies. `stylepin.test.ts` pins the bay styles (keys by role, `pitch_m`), `TERRACE_BAYS`, `CITY_STOREYS`, `COLOURWAY_POOL`, `CITY_CHECK.R2` and `.R13` to the old path, and checks that offices are not row styles. No GLB is read. Met.
- **3 Style, storeys, colourway (N5).** `assign.ts`:
  - Every draw is `rand(...)` through `finalise` (`hash.ts`).
  - Storeys use one value per M4c height class, with a backtracking search: never equal to a neighbour, and not two back where it can be avoided.
  - A leader's style differs from the one before it, and its colourway starts by hash and steps past the one before.
  - Through or another is decided by `rand("back", partner)` against `BACK_SAME_SHARE`.
  - The finaliser pin on 10 keys is in `stylepin.test.ts`. "Same layer twice, another seed another" is in both `stage.test.ts` and `fixtures.test.ts`. Met.
- **4 Lead and follow.** `leadRowIds` holds N4. `check.ts` holds N3, including unique partners (the L included) and the L following the holder of the ring-1 corner cell. The named-run tests are in the "lead and follow" describe. Met.
- **5 M4c, R2, R13.** In `check.ts`, cell by cell. The failing fixtures in `stage.test.ts` are taken from the default city's layer with one building changed, covering all seven cases. Met.
- **6 Numbers.** `report.test.ts` prints them and asserts only that the named runs are ok. Met, with a caveat under Could improve 1.
- **7 Picture.** The legend, swatches and dots are in `stage.ts`. Four picture tests cover the lattice size, `legendOf`, the shading order, and the dots at the middle cell (the corner for an L). Met.
- **8 R-1 to R-7.**
  - `stages.ts` gains its one line, and `run.test.ts` changes its one example line.
  - Freeze, the earlier-layer writer, the four pins, R-7 and the grep test are present. Streets are read only as `streets.w` and `streets.h` in `picture`.
  - Not met: the test-double criterion asks that "the streets, land, mass **and edge** digests" equal the standard run's. The test (`stage.test.ts`, "a test double for buildings ...") runs `stagesOf("on", double)`, which leaves edge out, and compares only streets, land and mass, against `cityOf(DEFAULT)`, which also has no edge. See Must fix 2.
- **R-7 linearity (reviewer to check).** Not met. See Must fix 1.
- **Builder's notes, judged.**
  - The named loop runs stages 1 to 3 and 5 without edge. That is acceptable for criteria 1, 4 and 5: the grep test proves stage 5 reads no edge, the standard-run test shows the full run gives the same digest on the default city, and edge's own named-run tests hold it `ok`.
  - The `line` to `along` rename of the stage's own `RowDef` field is fine. The grep test's intent is a street's `line`, and the stage reads none.
  - `BACK_SAME_SHARE` 0.5 is commented PROPOSED with the grammar's words, and no test pins it. Met.
- **9.** For the main session. **10.** The gate is green per the main session (3678 passed).

## Rule conflicts and risks
- Purity holds. The imports are only `../../core`, `../pipeline/*` and the folder's own files, enforced by a test. There is no clock or `Math.random`. The only out-of-folder edits are the two lines the ticket allows and `stylepin.test.ts`. No dependency was added.
- R-7: per-part work scans the whole city's built cells (Must fix 1).
- A wrong through or another draw is not redrawn. If two adjacent through followers back onto leaders that are not row neighbours (across an opening in ring 1, or round a corner), they would share a style or colourway, and the stage fails R2 or R13 instead of choosing again. This is honest under R-2 and does not happen on the 20 named runs. Outside cities may hit it (may occur, not checked).

## Must fix
1. **R-7: per-part work reads the whole city.** In `src/city/buildings/group.ts`, `groupPart` computes `partCells = [...built.values()].filter(b => b.part === part.id)`, and `tightCornersOf` loops over `built.values()` for every part. Both are called once per part, from `stage.ts` (`buildBuildings`) and from `check.ts` (`buildingFailures`), so the stage is O(parts x built cells). R-7 says "Per-block work reads only that block ... and whole-city passes are linear in cells". The fix: pass each part's own cells, from the `byPart` map that `stage.ts` already builds and the same kind of map in `check.ts`. The O(1) keyed lookups into `built` can stay. Then grouping, tight-corner detection and the check read only the part, and the whole pass is linear.
2. **Criterion 8, R-4's test double has to include edge.** In `src/city/buildings/stage.test.ts`, "a test double for buildings ...": run `BUILT_STAGES` with buildings swapped for the double (for example `runCity(optionsOf(DEFAULT), "buildings", BUILT_STAGES.map(s => s.name === "buildings" ? double : s))`). Compare its streets, land, mass **and edge** digests with the standard run `runCity(optionsOf(DEFAULT), "buildings")`. The test then checks what the criterion names.

## Could improve
1. `report.test.ts` skips edge, so an outside city that fails at edge is counted as reaching and passing stage 5. Criterion 6 asks about cities "that reach stage 5". Running the outside list through `BUILT_STAGES` (or reporting the edge failure too) would make the numbers honest. It is reported only, so this does not block.
2. `stage.test.ts`, "through and another both occur", fails if Josh later sets `BACK_SAME_SHARE` to 0 or 1. Consider skipping it at those values, so that no value of the constant is implicitly pinned.
3. `assign.ts`: a following "another" building's style falls back to `STYLE_IDS` when every style is taken. With 3 styles and at most 2 neighbours this cannot happen. It could throw instead, so the fallback never silently hides a broken table.
4. `check.ts` does not check that a row's `buildings` are listed in order along it. The named-run test does, but only on the default city.
