ticket: 081-N1-series-batch1
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Section N1 asks for the first five series v1 puzzles (s01 to s05, rows 1 to 5 of `puzzles/series-v1.md`) as city files and notes in `puzzles/city/`. Each is on its own 1-block district, passes the city check and P1's sweep, has the analyzer's numbers inside the 1-to-5 band, and teaches its row's concept without using anything a later row introduces. N1 also asks for one `SCHEMA.md` line on series ids. It adds 0 tests.

## Does the branch do it?
The branch is one commit (fe679a6). It touches 11 files: the ten new `s01-...` to `s05-...` files in `puzzles/city/` and `puzzles/SCHEMA.md`. No pilot, no P0, nothing in `tools/` or `src/`. It adds no test cases.

1. **On the city and checked: met.** All five carry the ticket's ids and names (`"01 · First light"` and so on), the `city` block `6 x 6, seed 1, oneWay true`, and no `from`. Every lamp is a building with a `drop` on its last line. I ran `npm run check puzzles/city/` and all five PASS, every trap "expect held, recovery wins". I also ran `npx vitest run --maxWorkers=2 tools/fit.test.ts` (P1's sweep, unedited): 15 of 15 passed, "city sweep: 22 puzzles in 328 ms". Each note explains its capacity as its own load raised by `--raise` for the scenery its solution lights.
2. **Solvable per the analyzer: met.** I ran `npm run analyze` (N0) on each file. Every number matches its note:
   - s01: 1 click, 2 configurations, 0 dead ends.
   - s02: 2 clicks, 1 configuration, 0 dead ends.
   - s03: 1 click, 4 configurations, 0 of 16 dead ends, feed 9 of 9.
   - s04: 2 clicks, 1 configuration, 0 dead ends. Its only first move is `sw_1`.
   - s05: 2 clicks, **1 configuration**, 2 of 6 dead-end states. **One** first move, `repair:l_n`, leads only to dead ends, and the check block's `undo` recovers it.

   All five are within 1 to 3 clicks. No dead end in 1 to 4, and one in 5 that one Undo recovers, as the band says.
3. **One new concept, built on the ones before: met.** Each note names its concept, its reasoning move and what it builds on. I checked the JSON for elements a later row introduces:
   - s01 has breakers only.
   - s02 has switches only.
   - Capacity binds first in s03: the start is 12 of 9, while s01 can draw at most 3 of 3 and s02 at most 3 of 4.
   - s01 to s03 have `faults: []` and `startingParts: []`.
   - No file has a fuse box, relay, spring, battery or second feed.
4. **A different place: met.** The districts are `block:2:10`, `block:6:1`, `block:8:1`, `block:3:0` and `block:8:7`, all different. The feed and scenery blocks across the street are `5:10`, `6:0`, `8:5`, `5:0` and `8:8`, and none of these is a neighbour's district. Each note has its place table (node to pole or building, line to span chain with lengths).
5. **Series rules: met.** Every size matches its row (s01 0/0/2 br, s02 0/0/2 sw, s03 0/0/4 br, s04 1/wire/1 sw, s05 2/2 wire/1 br). The most own buildings on a map is 5 (s03), the most faults 2 (s05). There is no fuse box, so no blow. The kits are none, none, none, 1 wire, 2 wires, so no neighbours repeat. Only s03 has a heavy building (the kiln). The shrine count is kept at 1 of 5.
6. **The numbers are the lesson: met.** Every note has a section V paragraph. s03 says which numbers are red (`br_stall` −1 and `br_shed` −2) and why. s01, s02, s04 and s05 each say why none is red: s02's lesson is a +0, s04's is a +1 on the break, and in s05 the numbers point to the wrong fault on purpose.
7. **The note: met.** All five have the intended read from the default camera, with the target building's place. They have The trap in a line, a check block with the solution, the `priority` home and what the win costs it (s02 to s04 darken it, and they say so), and an empty **What it taught us**.
8. **SCHEMA.md: met.** One added bullet in the city section gives the `sNN-<slug>` id and name form, no `from`, and says only series puzzles are stages (NS).
9. **Sweep time: met by my own run, not by the branch.** No note and not the PR body gives the time on Josh's PC; the builder's reply may. I measured 328 ms for the 22-puzzle sweep and 4.4 s for the whole file (an existing W1 case is 812 ms of that).
10. **Josh plays: browser, not judged here.**

**The trap changes in s01 and s05 (the main session's question): within the ticket.** N section says: "A puzzle whose row cannot be laid as planned may change its trap's details, said in its note; it may not change its new concept or break a series rule."
- **s01** turns the row round. The plan has the nearest breaker as the wrong one. Here the wrong one, `br_side`, is 17 m off and the right one, `br_front`, is 4 m from the shrine. The note gives the reason: on one block both lines leave the corner pole by different streets, and a roof hop put every piece within 5 m in the fit's draft. The concept (the breaker) and the move (trace the wire back) are unchanged, and no series rule breaks. The note says itself that this is a weaker trap ("a player who clicks the nearest breaker wins without tracing") and lists it under To watch.
- **s05** moves the spark 28 m from the lift, onto the other street, and puts the dead junction 8 m from the lift. The row's part that teaches the concept still holds: mending the spark leaves "needs 2, have 1", and the analyzer finds 1 configuration and 1 dead-end first move. The lure is now loudness and the +1 number rather than nearness, and the note says so.

Both changes are explained in their notes, and both keep the concept and the rules.

## Rule conflicts and risks
- No hard rule broken. Nothing in `src/`, `tools/` or `puzzles/locked/`, no dependency, no Decided rule touched. `src/grid/` and `src/night/` are not changed. Only the ticket's listed files are touched.
- GDD rules as they play here: readable means current reaches it (s04's `repair:l_gran` is refused at the start, and the analyzer lists only `sw_1` as a first move). A brownout means nothing counts as lit (s03's start). A dead junction costs two parts (s05).
- **s04 and "nothing hidden at the start".** Criterion 2's band says every fact needed is on screen at the start. In s04 the break is unread until `sw_1` is thrown. The note says so and argues that this is the row's own concept ("faults are read by current") and that no decision rests on it: nothing can be spent before the break shows. I read that as within the band, because what is on screen (a plainly dark line) is the fact the move needs. Josh may read it otherwise when he plays.
- s01's weaker trap is a play risk for Josh, not a ticket breach (above).
- The ticket names the branch `ticket/081n1-series-batch-1`; this one is `ticket/081n1-series-batch1`. Cosmetic.

## Must fix
none

## Could improve
1. `puzzles/city/s02-this-way-or-that.md` and `s03-not-enough-for-all.md`: the capacity line's "its own 2" (s02) and "its own 4" (s03) mean the own load the win lights. The series-rules line, though, counts all the own buildings (3 and 5). One word ("its win's own 2") would stop a reader from taking these as a miscount.
2. Put criterion 9's sweep time in the PR body or one note, so the number is on record with the branch (my run: 328 ms for 22 puzzles).
3. s01: if Josh finds the trap too weak, the note's own To watch item (try the roof lay) is the place to start. No change before he plays.
