ticket: 056c-parking-guide
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C of 056: add chapter 18 "Parking" to `docs/city-style-guide.md` covering 18.1 to 18.6. Josh's words go in as the Decided lines, every number as a Default with its constant's name, and the baseline and arithmetic as Info re-measured on the merged A. Add a Numbers row for every criterion-1 constant and every `parkmetrics.ts` export, plus a drift check in `styleguide.test.ts`. The only allowed edit to an existing check is extending the chapter list to 18.

## Does the branch do it?
Branch `ticket/056c-parking-guide` at `fbb4459`, judged against its parent `8724149` on `goal/city-style`. It touches `docs/city-style-guide.md` and `src/render3d/styleguide.test.ts` and nothing else. `styleguide.test.ts` plus `parkmetrics.test.ts` give 63 passed, 1 skipped. `tsc --noEmit` is clean.

- **Criterion 12, the guide.**
  - Chapter 18 has parts 18.1 to 18.6 as drafted, plus two more. 18.7 holds the R6 floor, which is Josh's answer to open item 7. 18.8 holds P1 to P6 and the Info tables. Both are content the ticket asked for, so this is not extra scope.
  - Every rule carries its constant's name in backticks, with the ticket's formulas word for word in 18.3 and 18.4. The values themselves are in the drift-checked Numbers rows.
  - **Decided lines.** Both are checked against the ticket text, not invented:
    - The parking complaint ("Roads look good, parking spaces are overwhelming. ... business style units.") matches the ticket's "Josh's words" block exactly.
    - "Lower it to 0.45 (Recommended)" matches the answer to open item 7.
  - **Open questions.** "I approve one through three" is recorded as an Info line, listing the six defaults it settles.
  - **Chapter 17.** It does not exist (the chapter list is 1 to 16, then 18). The Info line says that 055 D's chapter 17 defers to chapter 18 and that T6 is met by P1 and P2.
  - **Info numbers re-measured.** I ran my own `tileCity()` plus `parkingMetrics()` spot check on the default city. Every figure matches the guide:
    - 54 kerb bays, 54 lot stalls, 9 lots, 108 spaces;
    - 3.0 bays per 100 m over 1,800 m of block kerb;
    - 160 shops, 379 homes, 255 columns, with 15 to 21 shops and 34 to 49 homes per block;
    - 18 runs, each 1 tile;
    - side shares 0.17 to 0.25 on 18 sides;
    - 226 build-outs, 82 trees, 68 `parkingPlain` cells;
    - 0 outer bays, and all six checks pass.

    These are the merged layout's numbers, not the ticket's draft ones (166/405), as the criterion requires.
- **Criterion 13, Numbers and drift.**
  - **Rows.** There are 17 `tilecity.ts` rows: all 13 criterion-1 constants, plus `BAYS_PER_PARKING_TILE`, `BAY_JUNCTION_CLEAR`, `TILE_PARK_MIN_RUN_M` and `TILE_CITY_R6_MIN`, which chapter 18 names. There is one `PARK_CHECK` row (`0 x 0 x 0 x 0 x 0 x 6`), the only non-function export of `parkmetrics.ts`.
  - **Values match the code.** I checked each against `tilecity.ts` lines 56 to 122 and `parkmetrics.ts` line 33.
    - `PARK_PER_SHOP` is written as 0.333333333333. That is within the 1e-9 tolerance of `1 / 3`.
    - `KERB_BAY_SHARE_MAX` and `PARK_SUPPLY_BAND` follow field order (avenue x street, lo x hi).
  - **The drift check is real.**
    - Adding `tilecity.ts` and `parkmetrics.ts` to `MODULES` means the existing "matches every named export" test now compares each new row's value with the code, so a changed constant or a changed row fails.
    - The new describe fails on a missing row or a dropped export for each of the 17 names. It fails on any chapter-18 constant without a row, and on any new `parkmetrics.ts` constant without a row.
    - It also tests itself: an injected `NEW_TUNING` must come back as uncovered, and an empty row list must report `PARK_CHECK`. So the check is not vacuous.
  - **Existing checks.** The only edit to one is the chapter-list test: its array gains 18 and its title changes to match. The `MODULES` addition widens the existing "names only constants that exist" check. The criterion requires this ("every constant the new text names must be exported by a module the test reads"), and no check body changed.
- **The old "Decided, not yet built" parking entry.** The `### Parking (ticket 056; chapter 18)` block is removed. A new test checks that it stays removed (no `### Parking (ticket 056` heading, and no "1 bay per 3 shops").
- **Nothing claims an unbuilt thing as built.** The 057 interior courts are a `Pending (waits for ticket 057 C)` bullet, and 057 is approved but not built. Every Default is 056's and is built on the merged A and B. The retired names `CITY_BAYS_PER_BLOCK_MIN`, `CITY_LOTS_PER_BLOCKS` and `LOT_RUN_SALT` are tested to be gone from both the guide and `tilecity.ts`.
- **Criterion 14 (builder runs) and the Every-section rules.** No `src/grid/`, `src/night/`, `src/core/` or `puzzles/` file is touched, no dependency is added, and no Decided GDD rule is touched.

## Rule conflicts and risks
- None found against the hard rules. The branch changes docs and a test only.
- The Info figures (54, 108, 3.0, 226/82, and the "Today" column of 366/122/20.3) are recorded but not pinned by any test. The line says "the test, not this line, is the record", but no test asserts them. A later layout change will leave these Info lines stale without failing anything. That is acceptable for Info lines, but worth knowing when 057 changes the lots.
- 18.1 says (Info) that the default is "no rear courts, so lots stay on the frontage". The very next bullet is a 057 Pending that replaces this. That is correct today, but 057 E must remove the Info clause when it lands, or the two lines will disagree.

## Must fix
none

## Could improve
1. `docs/city-style-guide.md` 18.3: the ticket's draft gave the values inline, for example `BAY_RUN_TILES_MAX` (2), `KERB_GAP_MIN_M` (10 m), `BAYS_PER_100M_MAX` (6) and avenue 0.4 / street 0.3. The chapter mostly drops them, leaving the reader to look in the Numbers table. Putting them back in brackets would make 18.3 readable on its own. The drift test would not cover the inline copies, so this is a trade-off, not a defect.
2. `docs/city-style-guide.md` 18.5 says one tree "along a stretch", where the ticket and criterion 5 say "along each side". If the code counts per side, use the ticket's word, so the guide and P5 describe the same unit.
3. `src/render3d/styleguide.test.ts`: the new test "keeps Josh's words as the Decided lines" also asserts the text contains "I approve one through three", which sits on an Info line, not a Decided one. The title would be more accurate as "...and records his approval of the defaults".
