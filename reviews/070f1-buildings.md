ticket: 070f1-buildings
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 5 (`src/city/buildings/`, pure). It groups every `mass.built` cell into buildings of 2 to 4 columns of one row, with the 3-cell L at each tight corner (L1). It gives each building a style, colourway and storeys from the stage's `rand`, works out lead and follow (N3, N4) and through or another by `BACK_SAME_SHARE`, and checks M4c, R2 and R13. It also adds a picture, a report, the R-1 to R-7 tests, a style-table pin and the `BUILT_STAGES` line. Round 2 checks the two round-1 must-fix items (archived in `reviews/070f1-buildings-round1.md`), applied in c2cc5ca.

## Does the branch do it?
- **Round-1 must-fix 1 (R-7 linearity): fixed.**
  - `group.ts`: `groupPart` now takes `partCells`, and `tightCornersOf` takes `cells`. The whole-city `[...built.values()].filter(...)` and the `for (const b of built.values())` loop are gone. No `built.values()` scan is left in the folder's non-test code.
  - `stage.ts` passes `cells` from its existing `byPart` map. `check.ts` builds its own `byPart` once, in one pass over `mass.built`, and passes each part's list.
  - The `built` map is still used, but only for O(1) keyed lookups (`builtIn`, `leadRowIds`, `arms`), which round 1 allowed.
  - Per-part work now reads only the part, and the whole pass is linear in cells.
  - The behaviour is unchanged: the same cells are visited in the same order, because `byPart` is filled in `mass.built` order, the order the old filter used.
- **Round-1 must-fix 2 (criterion 8, R-4 double with edge): fixed.**
  - `stage.test.ts`, "a test double for buildings leaves the digests of streets, land, mass and edge equal to the standard run's (R-4)", now compares the standard run `runCity(optionsOf(DEFAULT), "buildings")` with `[...BUILT_STAGES.slice(0, -1), double]`. The standard run's default stage list is `BUILT_STAGES` (`stages.ts`).
  - `BUILT_STAGES` ends with `buildingsStage` (`stages.ts` line 17), so the slice swaps exactly the buildings stage.
  - It asserts all four upstream digests equal, edge included, and the buildings digest different. That is what the criterion names.
- **Round-1 could-improve 1 was taken:** `report.test.ts` now runs edge before buildings, so an outside city that fails at edge no longer counts as reaching stage 5.
- **The rest of the criteria (0 to 7, 9, 10)** stand as judged in round 1, and c2cc5ca touches nothing else. The main session's gate on c2cc5ca is green: tsc is clean, and 3678 tests passed with 21 skipped.

## Rule conflicts and risks
- Purity is unchanged. `report.test.ts` gains an import of `../edge/stage`. That is a test file inside `src/city/`, where the sibling stage tests already import other stages, so it is not a cross-folder break.
- Still open from round 1, not blocking: a wrong through or another draw is not redrawn, so an outside city could fail R2 or R13 instead of choosing again (may occur, not checked).

## Must fix
none

## Could improve
1. `stage.test.ts`, "through and another both occur", would fail if `BACK_SAME_SHARE` were set to 0 or 1. Skip it at those values (carried from round 1).
2. `assign.ts`: the fallback to `STYLE_IDS` when every style is taken could throw instead (carried from round 1).
3. `check.ts` could check that a row's buildings are listed in order along it on every city, not only the default (carried from round 1).
