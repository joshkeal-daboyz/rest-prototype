ticket: 055b-tile-lots
assessment: partly
must-fix: 2

## What the ticket asked for, as I understood it
Section B (design items 8 and 9, criteria 9 to 12) has four parts:
- Pull the ladder's outer-block terrace fill out of `build` into an exported pure `terraceBlockRows`, without moving any ladder town. The towns are pinned before the edit.
- Use that function to fill every tile-city block with terraces on the pavement's back edge (setback 0: "no strip between pavement and shopfront").
- Add grid-snapped plazas, and parking lots with kerb cuts.
- Add `TerraceRun.frame`, so furniture and dressing stand on a 5 m pavement while the ladder stays byte-identical.

## Does the branch do it?
**Round 2.** Judged on `7e291ff`, the builder's answer to round 1's must-fix 1, plus the branch as a whole. The main session's gate on `7e291ff` is green: tsc clean, 2077 tests. I did not re-run the suite. I measured the new corner geometry with a scratch `tsx` script over `tileCity` (3 x 3, seeds 1 to 10).

- **9, nothing moves on the ladder: met** (as in round 1).
  - `7e291ff` adds an optional `startInset_m` to `TerraceRowOpts` in `town.ts`. It defaults to 0.
  - `townpin.test.ts` is unchanged and still passes, so the ladder digests hold.
- **10, terraces on tile streets: partly met.**
  - *Far gap: the number is now met, but the gap has moved to the corner rather than been closed.*
    - `tileRowInset_m` (`tilecity.ts`) moves each row's start in from its first corner. The row's columns then end on an alley at the far end.
    - The plain test "closes the far gap to a seam or an alley on at least the ladder's 85% of runs" now passes. It also checks 85% of the runs that end at a corner, over at least 250 runs. The share is about 91%, against 14% before.
    - The metric is not gamed: the far gap really is a seam or an alley now. But the dead-band remainder is still there; it now sits at the other end of the row (see Must fix 2).
  - *R6: met.* It is out of the exclusion list in "passes R1 to R6 and R8 to R13".
  - *R7: not met.* It is still an `it.fails`: 0.43 to 0.50 per seed, pooled about 0.45, against 0.5. A floor of more than 0.4 is in the plain test (see the R7 question below).
  - Front lines on the pavement's back edge, `packTown` packing every run, and no slit: still met.
- **11, parking: met** (unchanged since round 1).
- **12, the frame: met.**
  - The `dressStack` frame test now loops over the three protocol `MAPS` (round 1, could improve 2).
  - The furniture half is as in round 1.
- **21, 22:** `7e291ff` touches only `tilecity.ts`, `tilecity.test.ts` and `town.ts`. No forbidden folder is touched and no dependency is added.

**Round 1's could-improve items:**
- 1 is superseded: the far-gap test is now a plain test.
- 2 is done.
- 3 is now covered by the ticket's section E (criteria 23 and 24).
- 4 is done: the comment now says 5k - 6.

**The R7 question: is the remaining `it.fails` honest, and can section E fix it?**
- *It is honest as a record.*
  - It states the strict check, with the measured numbers in its comment.
  - A plain-test floor (R7 more than 0.4 on every seed) keeps it from sliding.
  - It will turn red if the miss ever closes.
  - The builder says that swapping the lot keys for unrelated strings gives 0.56. I did not reproduce this. It is also confounded: the keys drive the packer's style choice (apartment or not, floor counts) as well as `dressUnit(lot.key, "escape")`. So the swap shows "the hash pattern, not the block outline", but not "the dressing's chance alone".
- *It is not correctly scoped as something "section E may fix".*
  - The only levers are `P_ESCAPE` or the escape rule in `dressing.ts`, the lot-key scheme in `town.ts`/`terrace.ts`, or R7's floor in `citymetrics.ts`.
  - E's Files allow none of these. They say: "Not `town.ts`, `furniture.ts`, `dressing.ts`"; `citymetrics.ts` is "R10's two frame reads only".
  - Renaming the tile streets' ids in `tilecity.ts` until the hash lands above 0.5 would be fishing for a seed, and would change A's street ids.
  - So under the ticket as cut, E inherits this `it.fails` unchanged. Criterion 25 re-runs B's R-checks, and they will still show R7 failing.
  - It needs Josh under Risk 4: either re-cut R7's floor for the tile city in criterion 10, or open a follow-up ticket that may touch `dressing.ts` or the key scheme.

## Rule conflicts and risks
- No hard-rule break. The change is in `src/render3d/` only, and no GDD Decided rule is changed in code.
- **The inset puts a strip of yard in front of every corner block's second shopfront.** Measured over 3 x 3, seeds 1 to 10:
  - All 340 runs that start at a corner now start 1.00 to 2.75 m in from the block corner. That is 1.0 to 1.8 m for a plain row and 1.95 to 2.75 m for a row that ends at a plaza.
  - So the corner block's cross-street face (its corner column: a shop corner base, glass that wraps the corner) now stands 1 to 2.75 m behind the cross street's pavement, with yard between.
  - From the row's own street, the far end now reads as an alley, then a notch about 7 m wide and 1 to 2.75 m deep in front of the next corner block's flank.
  - This works against design item 8's "setback 0 ... no strip between pavement and shopfront". It also works against chapter 4's Default that a row runs to the next row's corner block "with no gap on the street".
- **R9 passes only on a tolerance.** The corner block still counts as a corner (340 of 340 keep their `cornerSides`), because the largest inset, 2.75 m, is under `CORNER_GAP` (0.5 world units, 2.78 m). The margin is 3 cm. The new test "is under CORNER_GAP ..." pins that bound, but a later change to the plaza width, `TILE_ALLEY_M` or `TILE_COLUMN_M` could push a plaza-ending row's corner block off its corner. That would break Josh's Decided corner rule (17 Nov: "two sides facing the street") without any visible code change.
- `startInset_m` is a new option on `terraceBlockRows`. B's Files allow `town.ts` "only: extract ... with today's defaults, and `TerraceRun.frame?`". The default of 0 keeps the ladder pinned, and the Interfaces allow the builder latitude, so I do not count it as a break. Still, it goes past the extraction.
- `TILE_CORNER_DEPTH_M` (5.75) is a single number for corner-block back walls that the guide gives as 5.62 to 5.92 m. That is why the share is 91% and not higher. It is fine for the metric.
- New exports for D's Numbers rows and drift check: `TILE_CORNER_DEPTH_M`, `TILE_ALLEY_M`, `TILE_COLUMN_M`, `tileRowInset_m`, plus round 1's `TILE_PARK_MIN_RUN_M` and `terraceRunKey`.

## Must fix
1. **Criterion 10 is still unmet on R7** (pooled about 0.45 against 0.5; `it.fails` "passes R7 as well ..." in `src/render3d/tilecity.test.ts`).
   - B cannot close it inside its Files, and E's Files do not allow it either.
   - Under round 1's option (b), the main session takes it to Josh under Risk 4 with the numbers: the tile city 0.43 to 0.50, the ladder 0.53 to 0.58, and the builder's key-swap 0.56.
   - Josh then either re-cuts criterion 10's R7 floor for the tile city, or names a follow-up ticket.
   - Expected effect: criterion 10 is formally settled. The `it.fails` stays as the record until then.
2. **The far-gap fix moves the gap to the corner (`tileRowInset_m` in `src/render3d/tilecity.ts`, used through `startInset_m` in `town.ts`).** This is a design trade the ticket does not make: a wide far gap (1.6 to 3.8 m) with flush corners, against an alley plus corner blocks set back 1 to 2.75 m from the cross street. It should not merge silently. Do one of the following:
   - (a) Put the trade to Josh together with item 1. If he keeps the inset, record it as a design-item-8 deviation in the ticket, as was done for the city rig. Keep the "under CORNER_GAP" test, and give it a real margin, for example under `CORNER_GAP - 0.5 m`, so a plaza-ending corner block is not 3 cm from losing its corner. That margin may need the plaza case capped.
   - (b) If he prefers flush corners, remove the `startInset_m` argument in `tileCity` (the option on `terraceBlockRows` can stay, defaulting to 0) and restore the far-gap `it.fails` with its 14% note.
   - Expected effect: no corner shopfront stands behind a strip of yard unless Josh chose it.

## Could improve
1. If Josh keeps the inset, the main session's E eye check (criterion 31) should include a corner close-up (`&cam=street&run=0&at=0`). It shows whether the 1 to 2.75 m notch in front of the corner flank reads as a forecourt or as a hole.
2. A middle path for the builder, if Josh wants one: split the remainder, part at the far end (an alley) and part at the corner (only up to about 1 m). That needs Josh's word first, not a builder guess.
3. The ticket's criterion 10 status note ("about 14% ... R6/R7 are 0.42 to 0.52") is now stale. The main session should update it to "far gap 91% (via the corner inset), R6 met, R7 about 0.45".
