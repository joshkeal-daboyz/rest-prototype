ticket: 063b-street-width
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section B of ticket 063 (criteria 6 to 10): take the avenues out of the tile city so every street line is the 5-cell street profile (25 m, 15 m carriageway) and every junction is 3 x 3. `AVENUE_ONE_IN` becomes an off switch with 056's avenue code left in place, unused. The parking, frontage, interior and R checks must hold on criterion 7's cities with no threshold changed, the tests that assumed an avenue must be turned round, and the guide's 19.3 and chapter 18 must be re-measured. B2 (069) is not being built (Josh, 19 Nov 2026: "don't bother with 069", "Merge 063 B"), so I reviewed B only and ignored the B2 ticket text in 6a565fe.

## Does the branch do it?
Diff reviewed: `e23a494..6a565fe`. 6a565fe changes only the ticket file. All the code is in 32c047e, and 1d68216 is guide text.

- **Criterion 6 (B1, no avenues): met.**
  - In `src/render3d/tilecity.ts`, `AVENUE_ONE_IN = 0`.
  - `layoutAxis` guards both the hash pick and the "at least one avenue per axis" fallback with `AVENUE_ONE_IN > 0`, so there is no `% 0`.
  - `AVENUE_BANDS`, the avenue-first sort in the bay allocator and `KERB_BAY_SHARE_MAX.avenue` (0.4) are untouched.
  - The test "switches avenues off ... leaves 056's avenue share in place" pins both values.
- **Criterion 7 (checks hold on the named cities, no threshold changed): met.**
  - The only change outside the tests is `AVENUE_ONE_IN` and comments. No check constant moved: `PARK_CHECK`, `PARK_SUPPLY_BAND`, `TILE_CITY_R1_MIN`/`R6_MIN`/`R7_MIN`, G and V. `parkmetrics.ts`, `frontage.ts` and `citymetrics.ts` are not in the diff.
  - P1 to P6 on the default city, 3 x 3 seeds 1 to 10 and 6 x 4 seeds 1 to 3: `parkmetrics.test.ts`, "passes every check on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4". Its loop is unchanged. I ran it: 16/16 pass.
  - G and V, and P on the wider LAYOUTS set: `alleys.test.ts` criterion 18. I ran it: 17/17 pass. Its new `P1_ONE_SHORT` exception covers only 6 x 4 seeds 5 and 7, pinned at value 1, and asserts that neither is in `PACKED` (criterion 7's set). So no named city is excused.
  - R1, R6 and R7 on the tile floors: `tilecity.test.ts` (around lines 1343 to 1389) and `tileintegrate.test.ts` "R10 reads the frame". These cover the default city and 3 x 3 seeds 1 to 10, unchanged.
  - The 057 C interior shares: the block-interiors suite in `tilecity.test.ts` (the `cities` list near line 2376 includes 6 x 4 seeds 1 to 3).
  - The gate is green on this commit (2628 passed).
- **Criterion 8 (tests pin 15 m and 3 x 3; the avenue tests are inverted): met.**
  - New describe "street width: no avenues (063 B ...)" in `tilecity.test.ts`:
    - every street is 25 m, has a 3-cell, 15 m carriageway (from `bands` and from `carriage`), and has the band counts 2 lane, 1 parking, 2 pavement;
    - every junction box is 9 cells, 3 x 3, and the box count equals the street count on each axis multiplied together;
    - both are checked over every size and 20 seeds via `forAll`, with non-vacuity floors (more than 500 streets, more than 500 boxes).
  - Tests that asserted an avenue now assert none:
    - "profiles and bays (criterion 5)" (avenue on every axis, now none);
    - "block sizes" (avenue ratio, now `avenues === 0`);
    - "block variety" (6 or 5 bands, now 5 and street);
    - "the layout (056 criterion 4)" (most bays on avenue sides, now every bay on a street).
  - Whether the builder's report lists these is for the main session to check. The test names say "063 B: it asserted ...", which traces them.
- **Criterion 9 (guide re-measured): met.**
  - `docs/city-style-guide.md` adds a Decided line with Josh's words and a Default line in chapter 3.
  - Chapter 18 gets edited bay-order and cap lines plus 18.8's measured Info lines.
  - 19.3 gets the street metres per axis (100/100, was 105/110) and the area share (60.5%, was 62.7%) before and after.
  - The `AVENUE_ONE_IN` Numbers row is 0, which the drift test reads.
  - The default-city figures are backed by the test "lays the default city 51 x 57 cells ... 100 m of street on each axis and 60.5%".
- **Criterion 10:** a main-session screenshot. Not mine to judge.
- **Digests: re-taken deliberately, as required.**
  - `AT_AB9D01F` is replaced by `AT_063B`. The old four are kept as `PINS_BEFORE_063B`, and a new test asserts each new pin differs from the one it replaced.
  - The "bites" test now compares against `AT_063B[0]`.
  - The doc comment explains why every coordinate moved, and records a scratch before/after run: block sizes the same, shop counts shifting through a cell-coordinate hash.
  - The "lays each street line 5 cells and one block after the one before it" test backs the claim that no block's size moved.
- **No avenue still assumed.** In `src/render3d/` the only remaining `avenue` references are:
  - the unused profile and sort in `tilecity.ts`;
  - `parkmetrics.ts` indexing `KERB_BAY_SHARE_MAX[s.profile]`, which is still correct for "street".
  
  The `src/render/` avenue code is the ladder's 2D radial city, a different thing, and is untouched. The guide's remaining avenue lines are all marked "before 063 B" or "unused".

## Rule conflicts and risks
- `src/grid/`, `src/night/`, `src/core/`, `tests/`, `puzzles/`, `tools/`, `package.json` and `assets/` are untouched. There is no new dependency, and no GDD Decided rule changed. Q7 is recorded as adopted under Josh's goal waiver, which is the ticket's own framing.
- Files: every code and doc change is inside B's list (`tilecity.ts` profiles and `AVENUE_ONE_IN`; `tilecity.test.ts`, `parkmetrics.test.ts`, `alleys.test.ts`; the guide's chapters 3, 18 and 19.3). The ticket file is under "must not touch", but its edit (6a565fe, B2 text) is architect or main-session work, not the builder's.
- CI-safe: the new tests are pure layout data. They read no files, use no Windows paths and set no timers.
- The test count grew: 7 new `it`s in `tilecity.test.ts` and none removed.
- `parkmetrics.test.ts` lowers two bounds in the "today's pairing" failing fixture: `kerbBays > 300` to `> 250`, and `bays100m > 15` to `> 12`. These are the old-rule fixture's own sanity numbers, not a check threshold (`PARK_CHECK` is pinned separately and unchanged), so I accept them. The Files line says "re-measured numbers only, never a threshold", and this sits at the edge of that.
- Known and accepted by Josh: P1 now fails on cities outside criterion 7's list (3 x 3 seeds 12, 15, 17, 18, 19; 6 x 4 seeds 5, 7, 11, 12, 15, 16, 18). 6 x 4 seeds 5 and 7 are pinned in `alleys.test.ts` as an exact one-block-short exception. Without B2 this is a standing weakness of the layout, which the guide records honestly (18.8, "P1 is less robust without avenues").

## Must fix
none

## Could improve
1. P1 fails on twelve cities outside criterion 7's list, and `alleys.test.ts` carries `P1_ONE_SHORT` for 6 x 4 seeds 5 and 7. B2 (first tiles by matching) is not being built. If that changes later, that is where `P1_ONE_SHORT` goes. Until then the guide's 18.8 Info line and the exception's comment should say "accepted by Josh, 19 Nov 2026" rather than "reported as a re-cut", so a later reader does not think a fix is pending.
2. The "fails on the avenue's profile" test does arithmetic on a typed-in band list (`6 * 5 = 30`, `4 * 4 = 16`). It never runs the 15 m or 3 x 3 checks against a city that has an avenue. A fixture that feeds a hand-built street with `AVENUE_BANDS` through the same carriageway and box assertions would make the failing case real.
3. R1, R6 and R7 on 6 x 4 seeds 1 to 3 rest on the builder's scratch measurement, recorded in the guide. The standing R tests cover only the default city and 3 x 3 seeds 1 to 10. Adding 6 x 4 seeds 1 to 3 to those loops would make criterion 7's R part a test, not a note. Watch the runtime on Josh's machine.
4. The comment on `KERB_BAY_SHARE_MAX` and on the avenue-first sort in `tilecity.ts` could say "unused while `AVENUE_ONE_IN` is 0", as the `AVENUE_ONE_IN` doc does, so the dead path is visible where it lives.
