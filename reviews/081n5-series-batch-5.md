ticket: 081n5-series-batch-5
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Five new city puzzles, s21 to s25, end series v1. Each spans 3 or 4 blocks and has several layers of solving that cross the blocks. 21 is the battery twist, 22 moves the feeds' meeting, 23 puts two sisters under one mother, 24 has a cell hold a spring until a feed takes it, and 25 is the capstone. Each passes the city check and the analyzer's floors and has a full note. Rows 21 to 25 of `puzzles/series-v1.md` are rewritten to what was built, and nothing else is touched.

## Does the branch do it?
Against `origin/main` the designer's commits touch only `puzzles/city/s21-*` to `s25-*` (city file and note each) and rows 21 to 25 of `puzzles/series-v1.md`. The two `tickets/081-puzzles-on-the-city.md` commits are the architect's cut and the N5-Q1 record. Nothing in `src/`, `tools/`, `puzzles/SCHEMA.md` or `puzzles/locked/` changed. The branch adds and changes no tests (count 0, as the ticket says), so there was nothing of the branch's own to run. CI ran P1's sweep.

1. **On the city and checked.** I ran `npx tsx tools/check.ts` on each of the five, and all five print `PASS`. Every solution and every trap's expectation and recovery replays. The loads match the notes (21: 18 of 18; 22: West 11 of 18, East 19 of 23; 23: 22 of 23; 24: West 16 of 16; 25: West 19 of 19). Each file is 6 x 6 seed 1, one-way on, with no `from`. Districts have 4, 3, 4, 4 and 3 blocks. Each feed's pole is on a block outside the district (21 on `6:0`; 22 on `3:4` and `7:5`; 23 on `6:6`; 24 on `0:0` and `6:0`; 25 on `2:10` and `8:10`). The notes say the raise was run (the timed raise on 21). Met.
2. **Every block needed; layers cross.** Each note has a **Why each block** table and a **Layers** table with the read, the moves, where the layer begins and where it ends. The ticket defines a layer as having "its own move or moves" and says "a read with no move is a hidden fact, not a layer". Every note's layer 1 has no move: 21 "none yet", 22 "none: bring West", 23 "none yet", 24 "none: West cannot do this alone", 25 "none". Counted by that rule:
   - 21 has 4 layers, all crossing, every block on one.
   - 22 has 4, three crossing (2, 3, 4), every block on one.
   - 23 has 4, three crossing, every block on one.
   - 25 has 6, all crossing.

   All four meet the floor of 3 (25's of 6 and 5). **24 does not:** layers 2 to 5 are 4 layers against its floor of 5. Its layer 1 also begins and ends on `3:0`, so it does not cross either. See Must fix 1.
3. **Harder, not just bigger.** Depth of read climbs from 20's 8: 9, 9, 10, 11, 15. Each note names the earlier puzzles it builds on, by number, and says how they are turned against the player (for example 21: "19 is the tool, and its lesson is the trap"). Met.
4. **Solvable, within the band.**
   - Each note's numbers table gives the fewest clicks (6, 6, 7, 5, 8), the waits, the winning orders and configurations (1 each), the dead-end share, the blows on a shortest win, and the first wrong move with its recovery.
   - Runs over a minute have their times (21: 2 min 22 s; 25: 1 min 11 s). The clock and battery maps (21, 24, 25) have the `--click-seconds 3` run beside the default, in the same fewest clicks.
   - Floors are met: at least 5 clicks, at least 1 hidden fact, and "First moves that lead only to dead ends: none". No ceiling is passed (clicks at most 8, hidden facts at most 2).
   - I did not re-run the analyzer (21 takes over 2 minutes). The check replay above is the ticket's test for a win.
5. **One new concept.** Each note's "No win without ..." paragraph shows the concept is on every win. 21 fills on A and spends on B. 22 needs the meeting moved. 23 has `fb_e` and `fb_s` under `fb_m`. 24 is the hold. 25 puts 16, 17, 18, 19 and 24 on the win. The moves N4 handed on all appear:
   - the battery twist, in 21;
   - two things set in one window, in order (`r_a` then `r_n`), in 21;
   - relay order with a second relay, in 21;
   - a spring held by a battery, in 24 and 25;
   - the lantern, in 21, 24 (a spark spent on, one passed over) and 25.

   Met.
6. **A different place.** Neighbouring puzzles share no block: 21 against 20's `6:0`/`6:1`, then 21 to 22, 22 to 23, 23 to 24 and 24 to 25. No set repeats an earlier district (25's set is not 16's). Each puzzle has at least one block no series puzzle had used (21: `7:0`, `8:0`; 22: `5:4`; 23: `6:9`, `7:8`, `7:9`; 24: `5:0`, `5:1`, `3:2`; 25: `5:10`). Met.
7. **Series rules.** Kits differ on neighbours: (wire, bulb, 2 fuse), (wire, 2 bulb, fuse), (wire, 3 bulb, fuse), (wire, fuse), (2 wire, bulb, fuse). Heavy buildings differ: sawmill, ice house, cooperage, brickworks, smokehouse. 21 meets **For 21**. Each puzzle has at most 8 own buildings (23 is at 8) and at most 4 faults (22 and 23 are at 4). The shrine count closes at 3 of 5. Each designed re-blow is named in its note and warned before the fit. Met.
8. **No control on a branch pole.** Each note has the place table. I listed, from the city files, the spans that meet at each control's pole. Every breaker, fuse box and battery has exactly its in and out. Every switch has its in, one span out and one drop (22's `r_e` has its in and two span outs). That agrees with the tables. Scenery drops I took from the notes. Met.
9. **Reads from the default camera.** This needs a browser, which is the main session's job. Each note has **To check in the pane** and gives the district's size in metres. The HUD-only facts are listed: 22 has East's own load against its limit; 21, 23, 24 and 25 say none.
10. **The note.** Every section the criterion lists is in each note, including an empty **What it taught us**. 21, 24 and 25 (the clock and battery maps) have the **Windows** table. Met.
11. **The designer's report** and 12. **The sweep's time** are in the report, not the branch, so I can't tell. The notes themselves carry the limits passed (none), the HUD facts, the dropped moves (25: a timer in the capstone, a moved meeting, sisters) and the analyzer times.
13. Josh's play happens after the merge.

Plan rows: the `series-v1.md` diff changes rows 21 to 25 only. Met.

## Rule conflicts and risks
- No hard-rule break. Nothing in `src/` is touched (so nothing affects `src/grid/` or `src/night/`), there is no new dependency, `puzzles/locked/` is untouched, and no Decided rule changed.
- 22 rests on "nearer is counted in wires between fittings, not metres". The note says the map is laid so the two agree, and lists it under To watch. If Josh's eye reads metres and the two ever disagree, the puzzle misleads. This is the engine's existing rule, not a new one.
- In 24 and 25, East is a feed rated 1 that only fills the cell ("East 0 of 1"). Both notes flag it as a fiction that may read as a fault.
- 24's `block:3:2` holds only the homes and nothing is clicked there. The fact it gives (the south spark leads away from the target) can be read from `3:0` by following the east wire instead. It meets the letter of criterion 2, thinly.

## Must fix
1. **`puzzles/city/s24-hold-the-spring.md`, its Layers table (criterion 2's floor for 24: at least 5 layers, at least 4 crossing).** Layer 1, "The door is red", has no move ("none: West cannot do this alone"), and it begins and ends on `3:0`. By the ticket's own definition ("a read with no move is a hidden fact, not a layer"), 24 has 4 layers, under its floor, and floors are never passed. Two ways to fix it:
   - Show a real fifth layer, with its own read and move, that crosses blocks on the solution as built. The table must still give at least 4 crossing layers with every block on one.
   - If no honest fifth layer exists in 24 as built, do not relabel. The designer reports a stop ("stop 081 N5") and the architect re-cuts.

   Expected effect: 24's note meets criterion 2's floor, or the shortfall goes to Josh as a stop rather than passing silently.

## Could improve
1. In 21, 22, 23 and 25, layer 1 is also a read with no move. Their floors hold without it, but calling it a "layer" overstates the count Josh will read (25's "seven layers" is six). Relabel those rows as the opening read, or merge each into the layer whose move it sets up.
2. `s24-hold-the-spring.md`, **Why each block** for `block:3:2`: say which fact can be read only there, or, if one is placed in 24's rebuild, give the block a move.
3. `s25-the-whole-chain.md` dropped a timed breaker from the capstone without trying the analyzer on it ("was not tried"). That is allowed under fixed point 5. The report should say plainly to Josh that the capstone has no timer, so his read of "the whole chain" is not a surprise.
