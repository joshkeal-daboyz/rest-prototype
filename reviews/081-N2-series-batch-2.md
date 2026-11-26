ticket: 081-N2-series-batch-2
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Series puzzles 6 to 10 (`s06` to `s10`) laid on 6 x 6 seed 1. Each one teaches one new idea on its own block, stays inside N2's band for 6 to 15 and keeps the series rules. Those rules include "no breaker or switch on a branch pole", which Josh extended to fuse boxes and to any third wire ("Same rule (Recommended)"). Josh also ruled "Add a breaker" for s07 and s09, and said "1 through 10 are literally just to teach you the basics".

## Does the branch do it?
This is round 2, on `ticket/081n2-series-batch-2` at 221ede8. The fix commit touches only s07, s08, s10 and s09's note. The whole branch still touches only the ten new `puzzles/city/s06-*` to `s10-*` files and adds no test (count 0, as the ticket says).

What I ran:
- `npm run check puzzles/city/`: all 27 city puzzles pass. Every check-block trap in s06 to s10 is held and recovered.
- `npm run analyze` on s06 to s10.
- Scratch scripts in the session scratchpad, not in the worktree:
  - every circuit-layer span and drop that meets each control's pole, with the line that owns it;
  - `loadPreview` replayed with `known` along each check block's solution and traps;
  - s07's `repair:j_dead` from the start.

**Round-1 must-fix 1 (s08 `fb`) is fixed.** `fb` is now on `pole:x:3:hi:324.17`. Only two spans meet that pole: `...315.83~...324.17` (`l_s`) and `...324.17~...337.50` (`l_fb`). There is no drop. The old corner pole is now a carrier on `l_fb`, before the box. The box still reads 2 of 6 at the start. All of the note's numbers replay: `br_t` +6 red with a blow, +4 red after `br_mill`, +4 white after `br_out`, and the blown fuse +8 red.

**Round-1 must-fix 2 (s10 `fb`, `br_t`) is fixed by re-laying the puzzle.** The feed now comes in from the west end. The controls are:
- `fb` on `pole:x:9:lo:112.50`
- `br_t` on `pole:x:9:lo:149.50`
- `br_w` on `pole:z:5:lo:302.50`

Each pole has two along-spans, both owned by the control's own lines, and no drop. The new table *What meets each control's pole* matches the circuit layer exactly. The crossing-span poles `x:9:lo:132.50` and `x:9:lo:162.50` are now carriers.

**s07 and s09 no longer ask the same move.**
- s07's breaker is now `br_l`, an open breaker on the long way, to be closed. The works is gone.
- s09 keeps the shedding breaker `br_k`, and its note now says it is the only one in 6 to 10.

**The pole rule, every control in all five puzzles, scenery spans and drops included:**

| Puzzle | Control | Pole | What meets it |
| --- | --- | --- | --- |
| s06 | `fb` | `z:0:hi:390.50` | `l_br`, `l_fb` |
| s06 | `br_bath` | `z:0:hi:354.50` | `l_br`, `l_bath` |
| s07 | `sw` | `z:7:lo:507.50` | `l_feed` (cross), `l_short` (corner), `l_long` (along) |
| s07 | `br_l` | `x:14:lo:285.83` | `l_far`, `l_last` |
| s08 | `br_out` | | `l_out`, `l_home` |
| s08 | `fb` | | `l_fb`, `l_s` |
| s08 | `br_t` | | `l_t`, `l_t2` |
| s08 | `br_mill` | | `l_m` (corner), `l_mill` |
| s09 | `sw` | `x:7:lo:27.50` | `l_feed` (cross), `l_s` (along), `l_n` (corner) |
| s09 | `br_k` | | `l_2`, `l_k` |
| s10 | `fb` | | `l_fb`, `l_row` |
| s10 | `br_t` | | `l_t`, `l_a` |
| s10 | `br_w` | | `l_tan`, `l_w` |

- No other node, span or drop meets any of these poles.
- Each switch's two outs leave by different spans.
- The rule holds everywhere.

**Criterion 1:** met for all five. The check passes with W1. s07's capacity is raised to 16 and s10's to 9, with the box rated 5; both are the fit's figures as the notes give them.

**Criterion 2:** every note's analyzer table matches the output:

| | Fewest clicks | Orders | Configs | Dead ends | Only-dead-end first moves | Win load |
| --- | --- | --- | --- | --- | --- | --- |
| s06 | 3 | 2 | 1 | 4/9 | `repair:home` | 7/8 |
| s07 | 3 | 2 | 1 | 0/5 | none | 15/16 |
| s08 | 3 | 3 | 1 | 8/28 | none | 9/9 |
| s09 | 3 | 3 | 1 | 4/12 | `repair:l_x` | 10/12 |
| s10 | 4 | 6 | 1 | 4/20 | none | 8/9, box 5/5 |

- All five are inside 3 to 6 clicks with 1 winning configuration and name 2 layers.
- s07's hidden fact is the spark behind `br_l`. It becomes readable only after `sw` and `br_l`, as the note says.
- s07's obvious wrong click is refused: `repair:j_dead` gives "needs 2 wire, have 1", and the wire stays in hand.

**Criterion 3:**
- No rating binds before 8.
- s07 has no box.
- No bulb in 6 to 9.
- None of the later pieces appear.
- s07's long way meets the straight road only through the dead junction, which the single wire can't mend. So no loop closes in play, which matches criterion 3's "not a loop back".

**Criterion 4:** the districts are unchanged and distinct. s10 is still on `block:1:7`, away from its neighbours.

**Criterion 5:**
- Sizes: s07 is now 2 faults / wire / 1 switch, 1 breaker.
- Own buildings at most 4, faults at most 3.
- The only blow opener is s08's `br_t`. s10's red `br_t` blows nothing: its trap's `blown: []` holds.
- No kit repeats on neighbours.
- Heavy building: none, mill, kiln, none.
- Shrine count 2 of 5.
- The pole rule holds, as shown above.

**Criterion 6:** every quoted preview number replays:
- s07: `sw` +12, `br_l` +0 then +2, spark +1. None is red, and the wrong click is refused.
- s10: `br_t` +3 red with a blow flagged, +2 white with `br_w` open; the bulb +2 white, or +2 red with the tannery on. Loads 3, 6, 7, 3, 8 of 9.

s10's note now tells Josh that the preview's blow on `br_t` does not come (round-1 could-improve 4).

**Criterion 7:** all five notes are present with an empty **What it taught us**. **Criterion 8:** 27 puzzles in 623 ms, in 221ede8's message. **Criterion 9:** Josh's play.

## Rule conflicts and risks
- None found against the hard rules: no `src/`, `tools/`, `puzzles/locked/` or `SCHEMA.md` change, and no dependency or test.
- Repetition risk, introduced by the s10 re-lay (it breaks no rule):
  - s10 is now s08's shape. It is one wire behind a box, with an open breaker before the target and a building past the target that must be shed by its own breaker first. Both solutions open with "shed past the target, then close the target's breaker".
  - s10's own note says so ("To watch").
  - They are not neighbours. Against "The current puzzles are too repetitive" it is worth Josh's eye.

## Must fix
none

## Could improve
1. **s08 and s10 share a move.** In both, you shed the building past the target with its breaker, then close the target's breaker. s10's new idea, the dead bulb, still leads to a different end, but its first two clicks repeat 8's. If Josh hears it as a repeat, s10's shed could come from somewhere other than past the target on the same wire. Put the question to him with his play.
2. **s07 and s09 are still both a corner switch with a wire round all four streets of one block.** Their breakers now do different jobs, and s07's notes say why one block was used. Josh may still read the two as one shape.
3. Carried over from round 1, for Josh's play and not to change now:
   - s06's late-found trap costs 3 Undos.
   - s08's only "hidden fact" is a wire on screen.
4. In s10's note, "the wire is 109 m" does not match the line table, which gives about 106 m from the feed to the archive and 126 m to the tannery. Only the wording is affected.
