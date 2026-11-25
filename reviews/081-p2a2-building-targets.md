ticket: 081-p2a2-building-targets
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
Puzzles 01 to 16 re-laid on `puzzles/city/` from `main` with every lamp a building fed by its drop, passing W1's city check (read outward, feed clearance, no crossings), spread over the city with `--avoid`, with 12 and 15 reworked and their notes saying what changed. `puzzles/SCHEMA.md`'s city section says lamps stand on buildings, `post` and `lead` are not used, and a city note carries its own check block when its schematic has none.

## Does the branch do it?
I reviewed P2a2's own commit, f022999 (33 files: `puzzles/city/` and `puzzles/SCHEMA.md`). The merges of main and the goal branch bring nothing else of P2a2's.

- **Criterion 1 (files, fit, check): met.** All 16 city files and notes are there. I ran `npm run check puzzles/city/`: 17 of 17 PASS (the 16 plus `city-two-ways-round`), exit 0. W1's rules are in `tools/fit.ts` (`READ_BACK_M` 3, `FEED_CLEAR_M` 6, crossings, lamp reason) and the check applies them. No city file has a `post` or `lead`, and every lamp's place is `{ building }` (I scripted a check of all 16).
  - 12 is a rework. It adds junction `j1` and sets `fb_3` to 4 by hand. Its note has *What changed from the schematic, and why*, its own check block (two traps) and the analyzer table, and it keeps "which fuse".
  - 15 is re-reworked: South's long way is removed, and the note says what changed from the schematic and from P2a's rework. But the element it says it keeps does not hold as the note states; see Must fix 1.
  - 09 and 14 are "raised, not reworked", which matches W1's fit.
- **Criterion 2 (notes): met, except 15's read.** Every note has `from`, the district, the place and line tables, a **What changed** section with one line per lamp ("moved from a lamp post / roof structure to a building" or "stays a building"), the intended read naming where the target building is, the check block, analyzer numbers and an empty **What it taught us**.
- **Criterion 3 (spread): met as W0 measured it.** W0 counted district blocks, so I did too. The 16 districts use 19 blocks, and none holds more than 2 (`block:8:1`: 04 and 07). Counted by the blocks the lamp buildings stand on, `block:8:0` holds targets from 4 pilots (01, 04, 05, 07). See Could improve 1.
- **Criterion 4 (SCHEMA.md): met.** The city section now says:
  - a city lamp stands on a building by its drop;
  - `{ post }` and `lead` are not used in `puzzles/city/`;
  - W1's layout rules apply;
  - a note whose schematic has no check block carries one that replays the same on both.
- **Criterion 5 (15's trap name, scratch run): met.** The traps are named "the shrine on North" and "the shrine before making room". The Loads and Expected numbers sections both say "a scratch run".
- **Criterion 6 (Josh plays): open.** It is a browser criterion.

There are no tests in this commit (count 0, as the ticket says). Every file touched is inside the ticket's list.

## Rule conflicts and risks
- **15 rests on the tie rule, not "nearest".** Ticket 015 rule 2 settles a tie by the feed listed first in `nodes`. In this re-rework, with `sw_w` on the short way, `jB` is **4 hops from both feeds**:
  - North: `west`, `j_w`, `sw_w`, `jA`, `jB`.
  - East: `east`, `j_e`, `jD`, `jC`, `jB`. Removing `sw_e` took one hop off East's side.

  So "the shrine on North" browns North out only because `west` is listed first. The note says "North reaches it in 4, East in 5" and "`jB` is now 6 from North against 5 from East". East is 4 in both. I checked this. A scratch copy of `15-meet-in-the-middle.city.json` with `west` and `east` swapped in `nodes` (nothing else changed) fails the check: the trap "the shrine on North" completes the job instead of browning out, and the solution ends East 11 of 8. In the winning state `jA` is also a 5 to 5 tie (forge).
- No hard-rule conflicts. No change to `src/`, no dependency, nothing in `puzzles/locked/`.

## Must fix
1. **`puzzles/city/15-meet-in-the-middle.city.json` and `.md`: make the trap rest on "nearest", or say it rests on the tie.** The ticket says 15 keeps its element, "the nearest feed carries it". Today the trap "the shrine on North" holds only through the feed-order tie-break, and the note's hop counts (East 5) are wrong. There are two ways to fix it, and the designer chooses:
   - (a) Re-lay or rework so that, with `sw_w` short, North is strictly nearer `jB` than East. Then the check passes with the feeds in either order (the swap test above is a quick way to prove it).
   - (b) Keep the lay, correct the hop counts in "Where the element cannot be kept" and in read steps 3 and 4, and say plainly that North carries the shrine on a tie (feed listed first), which the player cannot see, so Josh can judge it.

   Expected effect: Josh is not told the lesson is "nearest" when what decides it is file order.

## Could improve
1. **Same buildings across pilots.** 04 and 07 light three of the same buildings (`block:8:0/b|outer|+z|89,12`, `block:8:1/a|outer|-z|85,18`, `block:8:1/a|outer|-x|85,19`), and 01, 04, 05 and 07 all put targets on `block:8:0`. `--avoid` skips district blocks, but drops still reach across the street to an avoided block. If Josh's "too samey" means what he sees, re-lay 07 (or 04) away from the `x:1` / `z:8` corner.
2. **Wrong line in 01.** `01-first-light.md` "Expected numbers" says "Equal, but for the feeds' loads", but its feed loads are also equal (capacity unchanged). Probably the same line is copied into other unraised notes.
3. **Note 12's claim "on the reworked schematic the analyzer gives the schematic's numbers exactly"** sits beside its own statement that closing `br_3` alone differs. The numbers are equal but one state's outcome is not. Worth one clause saying the analyzer's totals hide it.
