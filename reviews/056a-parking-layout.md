ticket: 056a-parking-layout
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section A puts chapter 18's parking rules into `tilecity.ts`. Shops get short runs of kerbside bays, homes get one or two lots per block, the rest of the parking band becomes build-outs with trees, and the edge streets' yard side gets no bays. It adds a pure `parkmetrics.ts` with checks P1 to P6 that pass on the test cities and fail on 055's pairing. Nothing on the ladder may move, and the 055 criteria the ticket lists as unaffected must stay as they were, except where a "From 056" note in 055 now says otherwise (criterion 10: temporary far-gap floors of 0.75 on all runs and 0.70 on corner-ending runs, until 057).

## Does the branch do it?
Round 2. I reviewed `a9ad38f` (one commit on top of round 1's `66b40b6`) in the detached gate worktree. It touches `parkmetrics.test.ts`, `tilecity.test.ts`, `tilecity.ts` and `town.ts`, and all four are in A's files. I re-ran the two changed suites: 75 of 75 pass (parkmetrics 15, tilecity 60). The gate (tsc and the full suite, 2217 tests) was green in the builder's worktree. My round 1 findings on criteria 1 to 8 still stand, and the fix commit changes no layout code, only comments and one space.

**Round 1 must-fix 1 (the far-gap test could not see lots): closed by option (a).**
- 055 criterion 10 now carries a "From 056" note (lines 121 to 131). It records the 0.80 and 0.735 measurements and the cause (the run after a 10 m lot gets no inset), keeps the 0.85 test with its lot exclusion, sets floors of 0.75 and 0.70, and makes them temporary until 057 B. 057 criterion 5 explicitly retires them.
- `tilecity.test.ts` adds "closes the far gap ... on at least 75% of ALL runs and 70% of ALL runs that end at a corner (the runs after a parking lot included)". It calls `tiersOf()` without the exclusion, so the runs after a lot count again. It checks the corner share over every corner-ending run, with a count guard of more than 250. The floors are the note's numbers.
- Headroom is 0.05 overall and about 0.035 at corners. That is enough to pass, and tight enough that a lot rule which widens more gaps would fail. The comment names 057 as the replacement.

**Round 1 could-improves:**
1. `LOT_RUN_SALT`: done. The value is still 46. The comment now says the value is tuned among about 250 salts and that most other salts fail. It says R6 sits at its floor because of the dressing's sign chance, not because of parking, that seeds 11 to 20 pass untuned, and it asks for Josh to be consulted about a tile-city R6 floor. It says 0.49 to 0.55 where my probe saw 0.488 to 0.494 on the failing salts. The two figures don't conflict.
2. P5 crossing-tree case: done. It finds a build-out cell next to a `crossing`, adds a tree on it, and expects P5 to fail with a value of 1.
3. P2 lot-less fixture: done. On 6 x 4 seed 1 (24 blocks, so 3 are allowed), it strips the lot stalls of 0, 1, 3 and 4 blocks. `blocksWithoutLot` equals n, P2 passes at 1 and 3 and fails at 4, and `shortBlocks` is 4. It also checks that the stalls left still sit at 0.75 or more of demand or above, so the failure comes from the count and not from the supply band. This pins the reading I accepted in round 1.
4. `TileBlock.units` comment: done. It now says the units are counted after the parking lots take frontage, nominal and not packed.
5. `town.ts` spacing: done. It is one character and changes no behaviour.
6. Criterion 5's wording: done in the ticket (056 line 165, "Wording fixed 18 Nov 2026"). Kerb cuts and corners carry no kerb.
- The "unset `parkByHash`" test name now says unset behaves exactly as `true`. Its body is unchanged from round 1, where it already compared the default with `true`.

## Rule conflicts and risks
- **Ticket text lags the note.** 056's "055 criteria that 056 changes" (lines 253 to 263) still lists 10 among the unaffected, and 055's status line 6 does not name 10 either. The note on 055 criterion 10 is the operative text. This is the architect's to tidy and does not block the branch.
- Purity, files and dependencies: no change from round 1. `parkmetrics.ts` imports only `./tilecity` and `./town`. No `src/grid/` or `src/night/` change. No new dependency. Nothing on the ladder moves, since `parkByHash` defaults to `true`.
- The `LOT_RUN_SALT` risk stays as round 1 described it, but it is now stated honestly in the code.

## Must fix
none

## Could improve
1. The architect should add 10 to 056's list of changed 055 criteria (and drop it from "unaffected"), and add it to 055's status line 6, so the three texts agree.
2. Put the tile-city R6 floor question to Josh, as the `LOT_RUN_SALT` comment asks. If he gives it a floor, the tuned salt can go.
