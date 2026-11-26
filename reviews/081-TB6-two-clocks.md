ticket: 081-TB6-two-clocks
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
One trial city puzzle, `puzzles/city/tb-two-clocks.city.json` and its note, on 6 x 6 seed 1 with one-way streets. It has two timed breakers out of phase, each feeding its own block, and a target that needs work in both windows ("a timer powered different sections at different times and you had to work between them"). It must pass `npm run check puzzles/city/` (W1 and the branch-pole rule included), the note must carry the analyzer's numbers at 1 s and 3 s a click, and the branch adds no tests.

## Does the branch do it?
The diff against `main` is two files, `puzzles/city/tb-two-clocks.city.json` and `puzzles/city/tb-two-clocks.md`. It adds 0 test cases, which matches the ticket's count of 0. Josh's play (criterion 3) is still to come.

**Criterion 1, the puzzle.**
- The city is 6 x 6, seed 1, one-way on. The district is `block:6:6` and `block:6:8`.
- `tb_a` runs 8/8 from offset 0, closed. `tb_b` runs 8/8 from offset 8, open. So they are out of phase and exactly one is closed at any time.
- The id is not `sNN`. `src/main.ts:37` globs `puzzles/city/**/*.city.json`, so the puzzle shows in the Map menu.
- `npm run check puzzles/city/` (I ran it) gives `PASS tb-two-clocks`: 3 clicks, feed 17 of 18, and all three traps "expect held, recovery wins". No puzzle in the folder fails. The city check (W1 included) runs before the replay in `tools/check.ts`, so it passed too.
- **The branch-pole rule, counting any third wire.** I converted the puzzle on the real plan and listed every circuit-layer span and drop that meets each control's pole:
  - `tb_a` at `pole:x:9:lo:283.33` has `l_fa` and `l_a`, nothing else.
  - `tb_b` at `pole:x:9:hi:272.50` has `l_fb` and `l_b`, nothing else.
  - `fb` at `pole:x:10:lo:299.50` has `l_b` and `l_m`, nothing else.
  - `r_a` at `pole:z:7:lo:289.17` has `l_ra`, `l_kiln` (a span) and `l_store` (the store's own drop).
  - `r_b` at `pole:z:7:lo:355.00` has `l_rb`, `l_tie` (a span) and `l_yard` (the yard's own drop).

  No control's pole has an unowned span, a scenery drop or another line. Each relay's two outputs leave by different wires, one of them into a building's own drop, as Josh allowed ("Allow it (Recommended)"). Unowned scenery wires meet only at the junction `j_0` (a drop) and the feed (a span and a drop), and the rule does not cover those. The note's place table agrees with this.
- **Each clock feeds its own block.** This is met for the puzzle's own wiring. The note says, under *To watch*, that two of `block:6:8`'s north-facing scenery houses hang from A's poles on `l_a`, so they light with A's clock. That is a fair thing to flag for Josh, and it is not a breach.

**Does it really need both windows?** Yes. I checked it on the simulator:
- The analyzer finds exactly 1 winning configuration: `r_a` at the store, `r_b` at the tie, the bulb in and the fuse whole.
- `r_b` can be thrown only while current reaches it (`src/grid/grid.ts:542-543`). Current reaches it only through `l_rb` from behind `fb`, because a switch cannot be entered through an output (`grid.ts:203`). So `r_b` needs B's window, and so does the win, since the mill is B's.
- `r_a` needs current too. In B's window that current can come only over the tie, after `r_b` is thrown. With `r_a` at the kiln, that throw carries 13 on `fb`'s rating of 10, and the fuse blows in the same settle. That cuts B's current before `r_a` can be reached. My preview probe confirmed it: `r_b` in B's window reads `+9 RED blows fb`.
- So `r_a` can only be set in A's window, and the win only happens in B's. The trap's recovery and the analyzer's dead-end share (128 states, every one with a blown box and no fuse in hand) say the same.

**The designer's claim** is that with breakers, switches, relays and faults alone, an alternating pair can always be finished in one window. I think it holds on this simulator:
- The win is judged at one moment, and only one clock is closed then.
- Everything on the winning road is upstream-reachable by that clock's current, working outward. Faults read where current reaches them, and relays are live where it reaches them.
- A relay off the road does not change the road. Player breakers and plain switches need no current at all.
- A brownout does not cut that reach. `powered` is computed apart from `brownout` (`grid.ts:445-465`), and a relay is gated only on `powered`.
- A spring falls back only at the window's close, after the win, so it does not change the picture either.
- What does cut the reach is a blown fuse (`grid.ts:191`). So a rated fuse box, plus a relay that must be set before the hand-over, is a sound minimal way to force two windows.
- One caveat, which the note rightly does not lean on: a short window can force two windows by speed alone. With 8 s windows, that does not happen here.

**Criterion 2, the analyzer's numbers.** I ran both speeds. Every figure in the note's table matches:

| | Default (1 s a click) | `--click-seconds 3` |
| --- | --- | --- |
| States (exhaustive) | 689 | 657 |
| Fewest clicks | 3 | 3 |
| Waits on the shortest win | 12 | 4 |
| Winning orders | 26 | 10 |
| Winning configurations | 1 | 1 |
| Dead-end states | 128 (18.6%) | 128 (19.5%) |
| First moves to dead ends only | none | none |

Both speeds also agree on these:
- feed 17 of 18 at the win;
- no fuse blows on a shortest win, and `fb` blows on some move;
- the first moves are `r_a` and `repair:shrine`.

It still wins at 3 s a click in the same 3 clicks, as the criterion asks. The section V numbers in the note also match what I measured: start 10, bulb 11, `r_a` 8, `r_a` reading -3, and `r_b` reading +9 red or +6 white.

**Criterion 3:** browser, for Josh. Not judged here.

## Rule conflicts and risks
- No hard rule is broken. Only `puzzles/city/` is touched, nothing in `puzzles/locked/` is edited, and there is no source, test or dependency change. No GDD Decided rule changes. "Faults hide faults" holds: the shrine's dead lamp is past `tb_a` and readable at the start because A's window is open. "The Relight can't be interrupted" is the grid's job and is untouched.
- **The note is stale on the next-flip cue** (as the caller suspected). TB1b1 (#110) and TB1b2 (#112) are merged, and this branch already includes them (merge 6092d5c). I probed `loadPreview` on the converted puzzle:
  - At the start, `tb_a` and `tb_b` read +1 white, not the "+10 red" the note describes.
  - Just before the turn on the intended road (bulb in, `r_a` thrown), both read +3 white.
  - Just before the flip that blows the fuse (trap 3's moves, with `wait:5` in place of the last `wait:7`), both read **+9 red, blows `fb`**.

  So the check the note asks for ("When the fix lands, check that `tb_b`'s number is red before that flip and white before every other") holds on every road I probed. Three passages are now false: the bullet "The alternating pair's next-flip cue and number are hidden until the joint-flip preview fix lands", the line "**Today nothing warns of it**" under *The trap*, and the "+10 red at the start" reasoning. Josh reads this note before he plays. It is not a criterion, a rule or a test, so it is listed under Could improve, not Must fix, but it should be fixed before he plays.
- Two things for N4's re-cut, not breaches here, because TB6 is a trial outside the series. The series rule "fit it and it blows again is no puzzle's trap" is broken by trap 2, which fits the spare at once. And the relay is used before the series has taught it. The note names the second. Its "series caps" line points at the fuse-blow opener cap, not this one.
- Branch name: the ticket names `ticket/081tb6-timer-trial`, but the branch is `ticket/081tb6-two-clocks`. This is cosmetic.

## Must fix
none

## Could improve
1. `puzzles/city/tb-two-clocks.md`: bring the cue text up to date with TB1b1 and TB1b2 before Josh plays.
   - Replace the "hidden until the joint-flip preview fix lands" bullet with what the cue now shows: +1 white at the start, +3 white before the turn on the intended road, and +9 red with `fb` named before the flip that blows.
   - Drop "Today nothing warns of it" under *The trap*. The flip that blows now has a red warning in the last 3 s.
   - Optionally add a *To watch* line: does the red clock number before that flip send him to `r_a`?
2. `puzzles/city/tb-two-clocks.md`, *Series rules it would carry*: name the "fit it and it blows again" cap that trap 2 meets, beside the fuse-blow opener cap. Then the architect weighs both at N4's re-cut.
