ticket: 081n5-series-batch-5
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Five new city puzzles, s21 to s25, end series v1. Each spans 3 or 4 blocks and has several layers of solving that cross the blocks. 21 is the battery twist, 22 moves the feeds' meeting, 23 puts two sisters under one mother, 24 has a cell hold a spring until a feed takes it, and 25 is the capstone. Each passes the city check and the analyzer's floors and has a full note. Rows 21 to 25 of `puzzles/series-v1.md` are rewritten to what was built, and nothing else is touched.

## Does the branch do it?
This is round 2. Round 1 had one must-fix: puzzle 24 had 4 layers with a move, under its floor of 5. Commit `8458910` answers it. The other criteria were met in round 1, and the commit changes nothing they rest on, so this round checks the fix and what it moved.

**Must-fix 1 (criterion 2, puzzle 24): met.** `s24-hold-the-spring.city.json` changes in these ways:
- The homes' wire `l_south` is now split at a new breaker `br_h`, closed at the start, on `pole:x:2:hi:162.50` (block `3:2`). The new line `l_south2` runs on to `homes`.
- Its break `f_south` is gone.
- West is 16 to 18, `fb` 15 to 17, the cell 14 to 16 s, and the brickworks 12 to 14.

The note's Layers table now puts the opening read ("the door is red") above the table, and does not count it. It lists five layers, each with its own read and move:
1. release and throw the spring, from `5:0` to `3:0`;
2. the mend, from `3:0` to `5:1`;
3. `r_2`, from `5:1` to `3:0`;
4. open `br_h`, from `3:2` to `3:0`;
5. close `br_f` against the cell's clock, from `5:0` to `3:0`.

All five cross blocks, and every block is on at least one. Layer 4 is a real layer, not a relabel:
- The analyzer's one winning configuration has `br_h` open.
- The check block's trap "the relay set, the door closed, and the homes still on the wire" blows `fb` (20 on 17), and its recovery opens `br_h`.

`block:3:2` now has a click and a fact that is read only there, which also answers round 1's could-improve 2.

**I re-ran 24.**
- `npx tsx tools/check.ts puzzles/city/s24-hold-the-spring.city.json` prints **PASS**. The solution is 6 clicks with West at 18 of 18, and all five traps hold their expectation and their recovery wins.
- `npm run analyze` on the same file explored 3,584 states exhaustively. It reports fewest clicks 6, 5 winning orders, 1 winning configuration, dead-end states 1,092 (30.5%), and "first moves that lead only to dead ends: none".
- Both runs match the note's numbers table.
- The band's floors hold: 6 clicks (at least 5), 2 hidden facts (at least 1), no dead first move.

**What the fix moved, checked against the other criteria:**
- **Criterion 3, harder.** Depth of read is still climbing: 23 is 10, 24 is 12 (it was 11), 25 is 15. 25's note is updated to compare against 24's new numbers.
- **Criterion 7, series rules.**
  - 24's kit is still wire and fuse, which differs from 23's (wire, 3 bulb, fuse) and 25's (2 wire, bulb, fuse).
  - 24 has 4 own buildings and 1 fault, under the caps of 8 and 4.
  - Its row's **Size** in `series-v1.md` is rewritten to "1 / wire, fuse / ... 2 br ...", as built. The ticket asks rows 21 to 25 to follow what was built.
- **Criterion 8, no control on a branch pole.** In the city file, `br_h`'s pole has `l_south`'s last span in and `l_south2`'s first span out, and nothing else. The note's place table says the same. The "1 past it" scenery is downstream on `l_south2`'s span chain, not on the pole's own drop, per the note.
- **Plan rows.** The commit touches rows 24 and 25 of `series-v1.md` only.

Round 1's could-improve 1 is also taken up. Notes 21, 22, 23 and 25 no longer count the first read as a layer, so 25 now says six layers with a move. Each still meets its floor: 21 has 4 crossing, 22 and 23 have 3 crossing, and 25 has 6.

The branch adds and changes no tests (0, as the ticket says), so there was no test file of its own to run. No file outside `puzzles/city/s21-*` to `s25-*`, `puzzles/series-v1.md` and the ticket changed against `origin/main`.

## Rule conflicts and risks
- No hard-rule break. Nothing in `src/` is touched (so nothing affects `src/grid/` or `src/night/`), there is no new dependency, `puzzles/locked/` is untouched, and no Decided rule changed.
- 24 now has 5 winning click orders (was 1), because `br_h` can be opened at any point before the door, including in the dark. The other five clicks keep one order. The order is less strict, but the read is deeper, and the note says so.
- The 16 s cell at a click every 3 s leaves 1 s on the road as discovered (the note's own sum: the door at 15 s of 16). That is tight, and the note names it under To watch ("if he is rushed, 18").
- Round 1's risks stand unchanged: 22's nearness is counted in wires, and East in 24 and 25 is a feed that only fills the cell.

## Must fix
none

## Could improve
1. `s24-hold-the-spring.md` says it dropped the lantern's "passed over" half (two sparks, one wire). The spark that was there was `f_south`. This is not a criterion, but the report to Josh should say it, since N4's hand-on list framed 24 as the lantern spent on and passed over.
2. Round 1's could-improve 3 still applies to the report, not the branch: tell Josh plainly that the capstone (25) has no timer.
