ticket: 070c2-mass-parking
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section C2 as re-cut on 19 Nov 2026 covers Stage 3: units, lots, yard courts, the P2 port at `PARK_PER_HOME` 0.075, a lane as one opening with two mouths, and a walk-through for every court part with no drive, with M5 strict. This is round 2. It judges only the round-2 diff `cdfb84f..6520b44` against round 1's must-fix and against Josh's ruling of 20 Nov 2026. He was asked "A frontage lot is parking, not a way in, so a court part whose only opening is a frontage lot still gets a walk-through. Agreed: yes or no?", and he answered "Yes, agreed".

## Does the branch do it?
The gate is green on 6520b44, as reported: tsc clean, 132 files, 3046 passed (3043 in round 1, so 3 new tests), 20 skipped. I did not re-run it. The diff touches five files, all in `src/city/mass/`. Round 1's verdicts on criteria 0 to 4 and 6 to 8 carry forward unchanged, because this diff does not touch the code they rest on.

- **Walk-through unless the part has a court or yard drive.** Met.
  - `plan.ts` now lays the walk-through when `court && !mine.some((s) => s.kind !== "frontLot")`. That condition is exactly "no court or yard court". The comment cites the ruling.
  - This matches the addendum's "Yes" path, criterion 5 and grammar line 161 ("no drive").
- **Frontage-lot cells count in the stretch check.** Met.
  - Before the walk-candidate loop, `plan.ts` marks every `frontLot` cell in `driveAt` as `taken` with the value `"lot"`.
  - `openingAt` therefore treats those cells as an opening when `stretchProblems` runs, so the walk cannot leave a row stub of under 2 cells next to the lot.
  - This agrees with `checkM5`'s own stretch check, which reads `m.opening ?? m.use`.
- **M5 does not count a frontage lot.** Met. In `check.ts`, the "interior touches an opening" test is now `u === "walk" || u === "drive"`, and the comment was rewritten to say why.
- **`hasLot` counts drives only.** Met. In `stage.test.ts`, the named-city walk test's `hasLot` is now `x.kind === "drive"`, still limited to cells in rings 1 and 2. The rule the test checks is now the ruling's rule, and the comment says so.
- **The two fixtures.** Met. `lots.test.ts` has a new describe block that names the ruling and quotes Josh's words.
  - **(a)** A 6 by 13 part where a frontage lot fits and a court does not gets exactly one walk-through, `block:0:0/walk`, and `massFailures` gives no M5 failure. That M5 check includes the stretch rule.
  - **(b)** The failing fixture: the same plan with the walk's cells walled to `built` and its opening dropped fails M5 with "interior of part block:0:0 touches no opening". This is the part that would have passed under the old rule.
  - **(c)** A 6 by 6 part with a frontage lot still throws the honest "no place for a walk-through" failure (Q7). This pins the risk the addendum named: a frontage lot must not turn Q7 into a pass.
- **The stretch-map fix in the walk-candidate loop.** Correct, and needed.
  - The old loop called `taken.set(..., "walk")` and then `taken.delete(...)` on every candidate cell. A candidate that overlapped a plaza cell would have erased that plaza cell from the stretch map for every later candidate. With lot cells now in `taken`, the same would happen to them.
  - The new `if (cells.some((c) => taken.has(cellKey(c)))) continue;` skips any candidate that overlaps a cell already taken. A walk can no longer be laid under a plaza or a lot (in the paint order, plaza drew over walk), and the map is never corrupted.
  - The skip only removes candidates that were never legal, so it cannot add a walk where one was refused before.
- **The `fixtures.test.ts` lane-block assertion.** The change is correct.
  - Part `a` (6 by 9) has only a frontage lot on its lane side. Under the ruling it must get a walk-through, so `["block:0:0/a/walk"]` is the right answer, and "no walk-through" was the old, wrong rule.
  - Part `b` still has its court drive and gets no walk, which the exact-list `toEqual` checks.
  - The test name was updated to say this and names Josh's date.
- **No digest pin or named-city number moved.** Confirmed.
  - The four "re-taken, MOVED BY C2" pins are in `stage.test.ts`. The round-2 diff to that file is only the `hasLot` line and its comment, so the pins are byte-identical to round 1's. They still pass, so the mass layer of every pinned city is unchanged.
  - The named-city walk test still expects 0 walks wherever a drive exists, and the per-city `massFailures(...) === []` test still passes. This agrees with the designer's probe: every frontage-lot part on the named cities also has a court drive, so round 1's premise for 3 x 3 seed 4 was wrong.

## Rule conflicts and risks
- None found in the round-2 diff. The rule is the one Josh ruled on, and it matches the ticket's criterion 5 and grammar line 161 as written, so no GDD Decided rule or grammar line changes.
- The files are inside `src/city/mass/`. There is no new dependency, and `src/grid/` and `src/night/` are untouched.
- The gate worktree is still dirty, as in round 1: a modified `src/audio/__snapshots__/notSoftened.test.ts.snap` and an untracked `gate-out.txt`. Neither is on the branch, and neither should be committed by accident.

## Must fix
none

## Could improve
1. **Pin the side of part `a`'s walk.** The lane-block fixture in `src/city/mass/fixtures.test.ts` could also check that part `a`'s new walk is on its lane side (`+x`), which ruling 4 prefers. At present it checks only the opening's id.
2. **Carried from round 1, not re-derived.**
   - Restore C1's not-vacuous check in `stage.test.ts`. Walks still cannot join it, since the named cities lay 0 walks.
   - Accept `apron` beyond ring 2 only on pads or yards.
   - `courtInside` in `sites.ts` should use `BUILT_RINGS`, not `DRIVE_CELLS`.
   - Fix the stale wording in the `lots.test.ts` header and in the constants test's name.

   Round 1's item 3, the unused `LOT_STALLS` import in `check.ts`, is done in this round.
