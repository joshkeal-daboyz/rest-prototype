ticket: 081-H4-roof-keep
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Stage 7's small roof props must keep clear of every corner roof structure's keep square (`roofKeep`, written by stage 6). Mid-row places are not cleared. There are two fixture cases and a re-take of stage 7's pins. The amendment (9f6d811) adds re-takes of three downstream pins, values only, each shown to come from the moved props: with an empty keep list, the run must give back the old value.

## Does the branch do it?
H4's own commits are b989998 (code and facades tests), 9f6d811 (ticket amendment) and ded0ee4 (downstream pins). The rest of `git diff main...HEAD` is the goal branch's and main's own history (PR #64's base is `main`).

- **Small props keep clear of corner keep squares.** `src/city/facades/roofs.ts` adds `meetsKeep`, which tests whether the footprint overlaps the square, using `roofBounds` and swapping width and depth on quarter turns. `buildRoofs` takes a new `keep` parameter that defaults to `[]`, so the layer is unchanged without it. Any small-prop try that meets its column's keep square is skipped and counted in `stats.keepTurned`. `src/city/facades/stage.ts` passes `plan.layers.circuit?.roofKeep ?? []`. Test: `rooffixtures.test.ts`, "H4, a corner roof". It checks one hand-made keep square from both sides (inside, and just outside by 0.01 m), then checks that no small prop on the default city meets any keep square. The test fails if the filter is removed.
- **Mid-row is never cleared.** `rooffixtures.test.ts`, "H4, a mid-row place is never cleared". It checks that no `roofKeep` entry names a mid-row roof, and that at least one mid-row structure still has small props within its reach. It fails if anyone starts clearing mid-row places.
- **Big props stay off corner columns (H3's RX).** This is unchanged, and the existing RX checks still pass.
- **Stage 7's pin re-take.** `src/city/facades/stage.test.ts` PINS goes from e96db65b, 25f96f25, 68430a02, 53f33a18 to c264e65d, b0402815, 00744cfe, 5f077cb3. The old values are kept in a comment. The purity case now allows exactly `layers.circuit?.roofKeep` and nothing else of the circuit layer, which is needed now that stage 7 reads it.
- **ded0ee4 is values only.** It changes exactly 9 lines, all of them string values. In `ground/stage.test.ts`, the 4 `FACADES_PINS` digests. In `traffic/stage.test.ts`, the 4 `FACADES_PINS` digests. In `ruin/named.test.ts`, `PIN_GROWTH[1]` goes from 9beb3f95 to c7302f73. No logic, other line or other case changes. The new facades values in ground and traffic match stage 7's own re-taken PINS, value for value.
- **The empty-keep check.** I re-ran it myself rather than take the report on trust. I made `stage.ts` pass `[]`, restored the three downstream files to their pre-ded0ee4 (old) pins, and ran them:
  - ground's "the digest pins (R-4)": passes with the old facades values;
  - traffic's "the digest pins (R-4)": passes with the old facades values;
  - ruin's growth pin: the full file passes, and prints `seed 1: growth 9beb3f95`, the old value.

  So all three new values come only from the keep squares. I then restored both files from HEAD (`git status` is clean). One note: running only the ruin pin case with `-t` gives `{}`, because `pinned` is filled by an earlier case. That is a quirk of the file, not of this branch.
- **Tests run.** The six files the branch touches (`facades/rooffixtures`, `facades/stage`, `facades/novelty`, `ground/stage`, `traffic/stage`, `ruin/named`): 87 passed, 2 workers.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, and no new dependency.
- Outside `src/city/facades/`, only the 9 pin values the amendment allows were touched (test policy rule 6).
- Test count against main: 2 added (the two H4 cases). 7 rewritten: stage 7's PINS, the purity case, two `novelty.test.ts` cases (H3b's no-plan pin now passes `withKeep=false`, and the replay passes `keepOf(o)` so it matches the stage), and the three downstream pins. That makes 9, well under 15. The ticket's count line says "4 rewritten", which leaves out the purity case and the two novelty cases. All three are needed to keep existing cases true to the new stage, not new coverage.
- `meetsKeep` handles only quarter-turn yaws. Small props use 0 or 180 today, so this is correct now. It would be wrong for an off-axis yaw if one is ever added.

## Must fix
none

## Could improve
1. `tickets/081-puzzles-on-the-city.md` (architect's file): the H4 count says "2 added, 4 rewritten". The branch actually rewrites 7, including the purity case and two `novelty.test.ts` cases. The count line could say so, for the record in the test-policy count.
2. `src/city/facades/rooffixtures.test.ts`: `cityOf` is imported from `./testcities` on its own line, next to the existing `./testcities` import. These could be one import.
