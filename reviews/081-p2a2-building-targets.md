ticket: 081-p2a2-building-targets
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Puzzles 01 to 16 re-laid on `puzzles/city/` from `main` with every lamp a building fed by its drop, passing W1's city check (read outward, feed clearance, no crossings), spread over the city with `--avoid`, with 12 and 15 reworked and their notes saying what changed. `puzzles/SCHEMA.md`'s city section says lamps stand on buildings, `post` and `lead` are not used, and a city note carries its own check block when its schematic has none.

## Does the branch do it?
This is round 2. Round 1 (on f022999) found criteria 1 to 5 met except 15's element, and had one must-fix: in 15, `jB` was 4 hops from both feeds, so the trap held only on the feed-order tie-break. The fix is 6570c8a, which touches only `puzzles/city/15-meet-in-the-middle.city.json` and `.md`.

- **Must-fix 1 (round 1): done, option (a).** 15 is re-laid on `block:5:10` and `block:6:11`, and a plain junction `jE` takes `sw_e`'s place (`l_e` `j_e` → `jE`, `l_e2` `jE` → `jD`). I traced the hops to `jB` from the file's lines:
  - with `sw_w` short, West is 4 (`west`, `j_w`, `sw_w`, `jA`, `jB`) and East is 5 (`east`, `j_e`, `jE`, `jD`, `jC`, `jB`);
  - with `sw_w` long, West is 6 (via `d1`, `d2`, `jA`) and East is 5.

  No tie is left at `jB`. In the winning state `jA` is 5 from West and 6 from East, so round 1's 5 to 5 tie on the forge is gone too.
- **The swap, verified.** I made a scratch copy outside the repo with `west` and `east` swapped in `nodes` and nothing else changed (`east,west,inn,...`).
  - `npx tsx tools/check.ts` on the copy: PASS. Solution complete, West 6 of 7, East 7 of 7, and both traps held with recovery winning.
  - I replayed all 8 settings of `br_g`, `sw_w` and `br_sh` through the conversion on `src/grid/`, on the branch file and on the swapped copy. The lit set, each feed's load and the brownout flag are identical in all 8. The brownouts are West 8 for `br_sh` and for `br_g`+`br_sh`, and East 8 for `sw_w`+`br_sh`.

  The designer's claim holds.
- **The note matches the file.** The read, the trap, the loads and the analyzer row give the same numbers as the replay. The read: start 6/6 of 7, `br_g` makes East 5, the win is West 6 and East 7. The traps: "the shrine on West" is West 8 of 7, and "the shrine before making room" is West 8 then East 8. Item 2 of *What changed* now gives the hop counts and the reason for `jE`.
- **Criterion 1, still met.** `npm run check puzzles/city/` (via `npx tsx tools/check.ts puzzles/city/`): 17 of 17 PASS, exit 0.
- **Criterion 3, still met.** 15's new blocks hold no other pilot. Still no district block holds more than 2 pilots (`block:8:1`: 04, 07).
- **Criteria 2, 4 and 5:** unchanged since round 1, and met. 15's trap name is now "the shrine on West", in both the note and its check block.
- **Criterion 6 (Josh plays):** open. It is a browser criterion.

There are no tests on the branch (count 0, as the ticket says). Nothing in `src/grid/`, `src/night/` or `puzzles/locked/` is touched.

## Rule conflicts and risks
- None found. Item 4 of 15's note still flags it as the pilot on which to judge whether 15 keeps its place. Its lost trap ("throw the switch on the side with room") is stated plainly.

## Must fix
none

## Could improve
1. **Stale names in 15's note.** Item 2's heading still says "South's long way is gone". With the feeds named West and East again, it should say "East's long way". Item 4 says "P2a's lay had renamed them North and South", but round 1's file named them North and East. Worth checking which is meant.
2. Round 1's could-improve items still stand, and are unchanged:
   - 04 and 07 share three target buildings near `block:8:0`/`block:8:1`;
   - the "Equal, but for the feeds' loads" line in 01's notes;
   - the sentence in 12's note about the analyzer.
