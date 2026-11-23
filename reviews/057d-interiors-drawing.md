ticket: 057d-interiors-drawing
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section D draws everything 057 C and G put inside the blocks: apron, courts and drives, greens and paths with props, passage floors and gates, alleys and bins, park edges and alley courts. Each gets a pack key and a code fallback, under a draw-call cap, and appears once on the sheet. D also carries the explicit `"wall"` alignment, the Octagon pin and a `packTown` pin on the ladder. This is round 2. I checked round 1's single must-fix (court lots still dressed as frontage lots) in fix commit cf5d8fd.

## Does the branch do it?
I read cf5d8fd against 03fd43d and the whole branch against d14f640. The gate is green as reported: tsc clean, 2510 passed (3 more than round 1), 11 skipped. The fix touches only `src/render3d/tilecity3d.ts` and `src/render3d/tileintegrate.test.ts`.

**Round-1 must-fix 1 (court lots dressed as frontage lots): fixed.**
- `courtLotPieces` (tilecity3d.ts) drops every `kind === "parking"` piece whose `run` is the `run` of a court with a non-empty run. That covers lines tiles, barriers, meters and billboards. `cityApplyOptions` runs it before `bayMeters`. `bayMeters` only filters `kind "pavement"` meters, so the order does not matter.
- **Is the run matching right?** Yes, and it can't clash.
  - In `furniture.ts`, only the open-lot loop gives pieces `kind "parking"`. Each one carries `open.run`.
  - `openLotsOf` gives a run at most one parking lot: the one at its far end, when `endAbuts === "parking"`.
  - In `tileCity`, each such lot either becomes a court (`run: o.run`) or fails to fit and puts its block in `frontLots`.
  - So a court's run and a front-lot run are never the same run.
  - Alley courts are pushed with `run: ""`, and the filter removes `""` from the set, so they take nothing off.
- **Probe.** I ran a throwaway probe test on the branch, then deleted it; nothing was committed. It covered the default city and seeds 1 to 10:
  - No city keeps a parking piece on a court run.
  - Every pair of `run` ids in `city.courts` and furniture matches (no court run without a lot).
  - Non-parking furniture is identical with and without the new filter.
  - The default city and seed 2 have no `frontLots`. Seeds 5, 6 and 9 have one each (block:1:2, block:2:2, block:1:2). Their lot keeps all its pieces (7/7, 9/9, 7/7 before and after the filter).
- **Tests.**
  - tileintegrate "takes the open-lot dressing off the lots that became courts" checks the live `applyModels` on the default city and seed 2.
  - "keeps the dressing on a lot whose block kept its frontage lot" checks that, without the filter, court lots get more than 10 pieces including lines tiles. It then shows a run with no court keeps its pieces, and that alley courts with run "" remove nothing. It builds the front-lot case by editing a city, because the two cities it uses have no real front lot (Could improve 1).

**Your question 2, the two edited existing tests.** Both are legitimate updates, not loosenings.
- **Criterion 23 (`planOf`'s `expected`).** It now applies `courtLotPieces` to the reference layout, the same way production does.
  - This makes the "tile view stands what the filtered layout says" comparison match the new behaviour. It hides nothing, because the filter's correctness is tested separately (above, and by my probe).
  - Without this change, the comparison would assert the defect round 1 named.
- **Criterion 26 ("lot lines and panels are flat pieces").**
  - Seeds 1 and 2 no longer have any lot lines tile, because they have no front lot. So the `flat > 0` check could only pass on a city with a real front lot.
  - Widening to seeds 1 to 10 brings in seeds 5, 6 and 9, which have real front lots.
  - The per-piece rule (every lot or plaza piece at least 0.005 m above its surface) now covers more pieces, not fewer. The thresholds (`> 20`, `> 0`) are unchanged.
  - It is broader coverage, not a weaker assertion.

**Your question 3, the align-forwarding test.** It would fail if `applyModels` ignored `align`.
- It first shows that `packTown` with `"back"` and with `"wall"` give different packings.
- It then requires `applyModels(..., { ...cityApplyOptions(city), align: "back" }).packed` to equal the back packing and differ from the wall packing, and the `"wall"` call to equal the wall packing.
- If the option were dropped, both calls would give `packTown`'s default packing, so one of the two equalities would fail. This settles round-1 Could improve 3.

**Your question 4, did the fix break anything?** Round 1's findings still hold.
- Every credited floor is still drawn, and drive and near-stall cells are still drawn once: the fix does not touch `interiorItems`, `interiorGroup` or `passageFloors`, and tileinterior.test.ts passes unchanged.
- The fix removes the second lines tile on the near row, which was the duplicate-marking half of round-1 question 2.
- Criterion 10's drive now reads as a kerb cut and a lot surface, with no lot furniture on it.
- Criteria 11, 14 and 15 and the carried items are unchanged from round 1.

## Rule conflicts and risks
- No hard rule is broken. The whole branch touches only `src/render3d/`. There is no change to `src/grid/`, `src/night/` or `puzzles/`, no new dependency, and no GDD Decided rule touched.
- The new tests are CI-safe: typed-in cities, no file reads, no timers, no paths.
- `courtLotPieces` is keyed on runs, which is safe only while a run ends at most one parking lot (`openLotsOf`). If a later ticket lets a run hold two lots, the filter would strip a front lot that shares a run with a court. Its doc comment names the run rule but not this assumption (Could improve 2).

## Must fix
none

## Could improve
1. The "keeps the dressing on a lot whose block kept its frontage lot" test edits a city to fake a front lot. Seeds 5, 6 and 9 of the 3 x 3 city have real front lots, for example seed 5's block:1:2 on run z:1:-1:r3. Assert on one of them that the lot's parking pieces, lines tile included, survive `cityApplyOptions`. The same test name in the "default city and seed 2" test says it keeps the dressing on a front lot, but neither city has one; reword it or add seed 5.
2. In `courtLotPieces`' doc comment, state that it relies on a run ending at most one parking lot (`openLotsOf`). The run match is then safe by construction, and a future change knows to revisit it.
3. Round-1 Could improve items 1, 2, 4 and 5 still stand: the gate colourway, a measured interior draw-call count, the tall `pitchZ_m` note, and the bins' front.
4. A stray blank line was added between the `tilePassages` and `stubTextSurface` imports in tileintegrate.test.ts.
