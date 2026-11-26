ticket: 081n4-series-batch-4
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Series puzzles 16 to 20 on the 6 x 6 seed-1 city. Each one brings in one new piece, in a fixed order: the deliberate blow (NB1), the relay, the spring, the battery, the timed breaker. Each must climb in depth from s15, span 2 to 4 blocks for a reason the solve needs, and keep the series rules. The plan's rows 16 to 20 and the "Reuse is free" bullet are rewritten. No code, no tests (count 0).

## Does the branch do it?
I diffed against `origin/main`. The branch touches only the five `puzzles/city/s16..s20` city files and notes, plus `puzzles/series-v1.md` (the one rules bullet and rows 16 to 20). No `src/`, `tools/`, `SCHEMA.md`, `locked/` or s01 to s15 file changes. It adds no test cases. I ran `npm run check puzzles/city/` and all five PASS, every trap "expect held, recovery wins". I also ran `npm run analyze` on each, and on 19 and 20 again at `--click-seconds 3`. Every figure in the notes matches my runs.

1. **On the city and checked.**
   - The districts are: s16 `6:11`+`7:11`+`8:10`; s17 `0:4`+`3:4`; s18 `7:5`+`7:7`; s19 `0:10`+`2:10`; s20 `6:0`+`6:1`, which is exactly 2 blocks, as TB-Q4 asks.
   - None of the five has a `from`.
   - Each feed's pole stands on a block outside its district, with one entering span.
   - The check passes, W1's rules included.
   - The raise itself is P1's sweep, which CI ran.
2. **Every block is needed.** Each note has a **Why each block** table, with a cross-block effect: in s16 the red on `8:10` is caused on `6:11` and cured on `7:11`; in s19 the release on `0:10` makes the relay on `2:10` throwable. s20's **Windows** table shows work tied to each clock: A gets the spring and `r_1`, B gets the cistern's bulb and `r_b`.
3. **Harder.** Depths are 7, 8, 8, 8, 8 against s15's 6, so the batch never drops. Each note names the moves it builds on, at or above the floor in the table. s18 is equal in depth to s17 but easier by the analyzer (108 orders against 16). The note says so plainly. The criterion is met on depth.
4. **Solvable, within the band.**
   - Fewest clicks are 6, 6, 6, 5, 5.
   - There is 1 winning configuration on each.
   - Hidden facts are 1, 1, 1, 1, 2, and layers are 4 on each, all named.
   - No first move leads only to dead ends, except s17's `repair:l_gran`, which one Undo recovers. That is within the floor.
   - 19 and 20 win at `--click-seconds 3` in the same 5 clicks, and both runs are shown side by side.
   - No limits are passed.
5. **One new concept.**
   - On s16, `blowOnShortestWin` is `fb_c` only (NB1 criterion 1). The scratch run with `fb_c` at rating 999 is reported as unsolvable.
   - On 17 to 20 the new piece is on the shortest win: `r_1`, `sp`, `cell`, and the flips (`sp_a`, `r_1` before the turn, `r_b` after it).
   - No later piece appears early: s16 has breakers and fuse boxes only; s17 has a relay and no second feed; s18 has a spring and a relay, no battery or timer; s19 has a battery and a relay, no timer; s20 has no battery, so fixed point 3 holds.
6. **A different place.** Neighbouring districts are disjoint, s16 and s15 included. No set repeats an earlier district, and each has at least one block no series puzzle has used. s20's set is not s11's. Each note has its place table, its street crossings and the running list.
7. **Series rules.**
   - Kits never repeat on neighbours: s15 fuse+wire, then bulb+fuse, 2 wire+fuse, 2 bulb+wire+fuse, fuse+wire, 2 bulb+fuse.
   - Heavy buildings never repeat on neighbours: the long house, then the foundry, mill, tannery, brewery, smelter.
   - The shrine count stays 2 of 5.
   - Each puzzle has 3 to 5 lamps and at most 3 faults.
   - Every "fit it and it blows again" trap is named in its note, readable through `wouldBlow`'s warning, and replayed in the check block.
8. **No control on a branch pole.** Each note has a control-and-pole table read from the conversion. Relays and springs carry only their own three wires, one out into a drop, as allowed. The battery carries its input and one far-side line. I did not re-derive the poles myself; the city check passing is the tool evidence.
9. **Reads from the camera.** This is a browser criterion, for the main session. s19's note gives BC's cue (`l_far`, `l_x`, `l_r`, `l_brew`) and its "4 s" number, and says how they lead to the move.
10. **The note.** All five have every section the criterion lists, plus **Windows** tables on 19 and 20, and an empty **What it taught us**.
11. and 12. These are the designer's report and the sweep's time. Neither is in the branch's files, so I can't tell. They are for the main session.
13. Josh plays them: his to do.

**NB1 on s16:**
- Criterion 1 is met, as above.
- Criterion 2 (reads before it is made): the red +5 on `br_t` names the mother, the red +2 on `br_s` names the child, and both bars are given. The main session checks this in the pane.
- Criterion 3: the blow costs the foundry and the priority homes, named. The spare-fuse re-blow is a designed trap.
- Criterion 4: the old shed (`br_o`, then lighting the infirmary) blows the mother. The trap holds and recovers.
- Criterion 5: the bullet is rewritten with Josh's words, NB-Q2 and NB-Q3, and row 16 matches what was built.

## Rule conflicts and risks
- No code changes, so the purity of `src/grid/` and `src/night/` and the 3D carry-over are untouched. No dependency. No Decided rule touched.
- Three targets stand on blocks outside their district, with their drops hung from district poles: s16's bath house on `block:7:9`, s17's chapel on `block:1:7`, s18's bell tower on `block:8:5`. The check accepts this. The pane check under criterion 9 should confirm each one is inside the opening frame. The notes say where they stand.
- s16's "obvious wrong first move" (`br_o`) is also the answer's first click. It is wrong only if the player stops there and lights the infirmary. That fits NB1 criterion 4's wording, and the note is open about it, but Josh may not read it as a wrong move at all.
- s18 is softer than s17 by the analyzer at equal depth. The note leaves it to Josh.

## Must fix
none

## Could improve
1. `puzzles/city/s20-turn-and-turn-about.md`: the note describes the trap "the flip that blows a fuse, with no click to blame", but the check block doesn't replay it. It is an off-road trap, so this is optional. Adding it would pin the timer-driven blow against a simulator change.
2. `puzzles/city/s16-let-it-blow.md`: the check block's trap names could make plain that the first trap's `br_o` is the correct first click continued wrongly, to keep the playtester from reading it as a contradiction later.
