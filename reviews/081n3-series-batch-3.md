ticket: 081n3-series-batch-3
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Series v1 puzzles 11 to 15 on the 6 x 6 seed-1 city. Each takes 2 to 4 touching blocks and needs every one of them. Each is a harder read built on what 1 to 10 taught. The second feed and the nested fuse each come in where they are the new idea. No relay, spring, battery or timer. Every series rule holds, the branch-pole rule included. The only files are new `s11` to `s15` city files and notes, plus rows 11 to 15 of `puzzles/series-v1.md`. No tests.

## Does the branch do it?
The build commit ab0bf5a touches only the ten new `puzzles/city/s11-...` to `s15-...` files and five rows of `puzzles/series-v1.md`. The `tickets/081-...` changes in the diff come from the two cut commits before it (ab7d7f3, 52d4696), not from the builder. No test was added or changed (count 0, as the ticket says), so I ran no vitest. Instead I ran `npm run check puzzles/city/` and `npm run analyze` on each of the five, and a scratch script over the conversion's circuit layer for criterion 8.

1. **On the city and checked: met.** `npm run check puzzles/city/` prints PASS for s11 to s15 and every other city file. Each solution is complete and each trap is held and recovered. All five are on `{6, 6, seed 1, oneWay true}` with no `from`. s12 and s15 have two feeds and are `version` 5. Each district is 2 blocks: s11 6:6+6:8, s12 7:1+8:1, s13 3:0+0:0, s14 0:4+0:2, s15 4:8+5:8. The check's CK14 passes, which covers blocks touching and one entering span per feed. Whether the capacities came from `fit --raise` I did not re-run, because it writes the file; each note says it was raised once.
2. **Every block is needed: met.** Each note has a **Why each block** table, and every block holds a solution move:
   - s11: `br_f` on 6:8's crossing pole.
   - s12: the tie's cut on 8:1.
   - s13: `br_l` on 3:0, `sw_p` and both mends on 0:0.
   - s14: `br_h` on 0:2.
   - s15: `br_k`/`br_n` on 4:8, the child and `br_g` on 5:8.

   Each note also says how a move on one block changes the other.
3. **Harder, not bigger: met.** Each note names the moves it builds on by number and which of them is the trap. Depth of read climbs 3, 4, 4, 5, 6. s13 equals s12 and says what else makes it harder: 1 winning order against 15, and 57.1% dead ends against 40.0%. That is the ticket's order.
4. **Analyzer, floors and ceilings: met.** My analyzer runs match each note's table: states, winning orders 3/15/1/40/36, 1 winning configuration each, and dead-end shares of 60.0/40.0/57.1/48.3/25.8%. Fewest clicks are 3 to 5, and there are at least 2 layers each. s13 has 3 hidden facts, past the ceiling of 2, and its note says so under **Limits passed** with the reason. The ticket allows that; it is not a stop.
5. **One new concept, nothing from later: met.** s12 is the first second feed and s15 the first nested fuse (`fb_1` sits under `fb_m` on `l_c0`), and each is the new idea of its puzzle. The node types across the five are feed, junction, lamp, breaker, switch and fusebox only.
6. **A different place: met.**
   - Neighbours share no block.
   - No block set repeats an earlier district.
   - Each puzzle has a block no series puzzle has used: 6:6/6:8, 7:1, 0:0, 0:2 and 5:8.
   - Reused blocks: 8:1 (s03), 3:0 (s04), 0:4 (s09) and 4:8 (s01). None of them is a neighbour's.
   - s01 really is on `block:4:8` now (I read the file). The ticket's list still says `block:2:10`, and the notes correct it.
7. **Series rules: met.**
   - No breaker blows a fuse as the opener. s14's two red breakers blow nothing when thrown, and every blow the five have comes later in the solve and is named in the note.
   - Kits differ from neighbour to neighbour: 2 fuses + bulb (s10), then fuse+wire, 2 wire+bulb, 2 wire, bulb+fuse, fuse+wire.
   - The heavy buildings are forge, pump house, none, cannery, long house. No building is heavy twice running.
   - The shrine count stays 2 of 5. s15's shrine is lit but not a target.
   - Each puzzle has at most 8 own buildings and 4 faults.
8. **No control on a branch pole: met.** I checked this on the circuit layer itself, not only the notes' tables. For every breaker, switch and fuse box in the five I listed every layer span and drop at its pole:
   - every breaker and fuse box pole has exactly 2 spans, both its own lines, and no drop;
   - s13's `sw_p` has 3 spans (`l_l2` in, `l_n0` and `l_e` out) and no drop.
9. **Reads from the default camera: can't tell, by design.** That is a browser check for the main session. Each note gives the intended read, the section V numbers and the hover cue, and has a "To check in the pane" list.
10. **The note: met.** All five have every section the ticket lists, and each **What it taught us** is empty.
11. and 12. **The designer's report and the sweep time: can't tell from the branch.** They belong in the designer's report, not in a file. Dropped or weakened moves are named in the notes: s14 names row 17's lean on the three-switch "which fuse", and s15 says what row 23 can and can't lean on.
13. **Josh plays: open,** as expected.

The plan's rows 11 to 15 are rewritten to what was built, in the same columns. Nothing else in `puzzles/series-v1.md` changed.

## Rule conflicts and risks
- No `src/`, `tools/`, `SCHEMA.md` or `puzzles/locked/` change. No new dependency. No Decided rule is touched: the puzzles use the simulator's rules as they stand (nearest feed carries, a fault is readable only when current reaches it).
- **s12's carrier is set by line count, not metres.** The note says West's road is split into five lines and East's into four so that East is the nearer feed, even though the two roads are about the same length (121 m against 118 m). Which feed takes the smokehouse on the join is not drawn on the wire. The note flags this for Josh's play.
- **s14 and s13 lean on preview numbers that count unread faults as sound.** In s14 a red breaker blows nothing. This is consistent with "readable means current reaches it", but a player may read it as the game being wrong. Both notes flag it for Josh's play.
- **s15's red has to name the mother.** Whether the fuse label (Y2) makes that readable is a renderer question, and the note says so.

## Must fix
none

## Could improve
1. `puzzles/city/s11-leave-it-open.md`, depth of read: "Puzzles 9 and 10 ... ask for 2 (... from their notes)". The notes of 9 and 10 give no depth figure. Say it is the designer's own reading of them.
2. The ticket's criterion 6 district list still names `block:2:10` for puzzle 1. The architect could change it to `block:4:8` (s01 since NR) at N4's re-cut, so the running list in the ticket matches the notes.
3. Before **Show Josh**, the main session should confirm criteria 11 and 12 (the report's row changes, limits passed, dropped moves, and the sweep time beside N1's and N2's) from the designer's report. Nothing on the branch shows them.
