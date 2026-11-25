ticket: 081-S1-scenery-loads
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
`convertCityPuzzle` splits every file line into `L~a`, `L` and `L~b`. Every scenery building whose drop is on one of the job's poles (not the feed's pole, not a job lamp's building) hangs on the job as a hidden lamp of `SCENERY_BUILDING_LOAD` (1). The unchanged grid then lights it where current reaches it and counts its load against the feed and the fuses. The conversion returns `scenery` and `hidden`, and P0's capacity goes from 3 to 3 + 22 = 25 (ticket 081, section S1).

## Does the branch do it?
I reviewed `git diff origin/main...ticket/081s1-scenery-loads`. The builder's own commit is 4127b3e; the ticket, design-note and review files in the diff come from the base branch. I ran `convert.test.ts`, `circuitdraw.test.ts` and `overlay.test.ts` with 2 workers: 37 passed. I also ran a throwaway probe (deleted afterwards; the worktree is clean) on 6 x 6 seed 1 to get the numbers below.

1. **The split: met.** The test "081 S1 rule 2" in `src/city/circuit/convert.test.ts` checks:
   - `l_s~a`, `l_s` and `l_s~b` run from and to the right ends;
   - `sw.outputs` is `["l_s~a", "l_n~a"]`;
   - `l_s~h1` and `l_s~h2` are collinear at 1/3 and 2/3;
   - `places` and `runs` are keyed by file ids only.

   It runs on P0, not a two-line fixture. P0 is this file's existing fixture and holds the same shape, so it's fine. Exact equality of `hidden` is held by criterion 7's case. In `scenery.ts`, `keptLines` and `outNodes` come first, so the file's line and node indices are unchanged. The renderer's `lineFraction`, `lampFlicker` and `lampBuildings` read those indices.
2. **Carriers and the cut: met.** The test "rule 3 and the Decided 'current up to a sparking break'" cuts `l_n` at its second carrier that has a building:
   - the first building maps to `l_n~h1~s`, the next two to `l_n~h2~s`;
   - on `createGrid`, `~h1~s` is lit and `~h2~s` is dark.

   In code, `hang.set(cur, k >= cutAt ? ~h2 : ~h1)` puts the pole at the end of the cut span past the break, which is what rule 3 says.
3. **Node poles: met.** The case maps `j_inf`'s building to `j_inf~s`, `sw`'s to `l_feed~h2~s` (its input line, at its end), and turns `j_sh` into a fusebox of rating 1. The case alone doesn't show the fuse blows because of the scenery, so I checked with the probe: with the `~s` lamps removed, the same puzzle blows nothing (only `shrine` lit); with them, `blown-j_sh`. The case does fail on the rule.
4. **Who stays dark: met.**
   - The feed's pole really has a drop (`block:5:4/built|outer|+x|48,47`, probe), and it is not in `scenery`. The test adds a second, synthetic drop there and checks that one too.
   - The shrine's building has its drop on `j_sh`'s job pole (`pole:z:7:lo:277.50`, probe), so excluding it is a real check.
   - The case also checks a drop on a pole no line uses.
5. **Load, leaves and the win: met.** The fixture is cut down to feed, `sw` as a junction, `j_h` and `homes`, capacity 1, with no `target`:
   - one scenery building on `sw~s` gives a brownout;
   - `target` is `["homes"]`;
   - `validatePuzzle` passes, because the conversion throws otherwise;
   - at capacity 2 there is no brownout, the puzzle is complete, and `sw~s` is lit.
6. **P0 plays the same, raised: met.** The rewritten case checks 22 scenery buildings. It then checks that the check block's reports are equal once `solution.feeds` is set aside, and that the win's feed is `{ load: 24, capacity: 25 }`.
7. **"None added", rewritten: met.** Every file node keeps its type, load, rating and capacity; every file line id is present; the ids that are not the file's are exactly `hidden`.
8. **P0's raised capacity: met.**
   - The file's only change is `"capacity": 25`.
   - **The start's load, which the builder did not measure, is 2 of 25:** `homes` (1) plus the one building on `sw`'s pole (`l_feed~h2~s`), no brownout, faults `x` and `y` readable. It stays 2 at t+2 and t+10 (probe).
   - With the switch thrown and nothing repaired it is 13 of 25; the win is 24 of 25.
   - The hidden lamps and their loads are `l_n~h1~s` 10, `l_x~h1~s` 4, `l_e2~h2~s` 5, `l_feed~h2~s` 1, `j_sh~s` 1 and `j_inf~s` 1, which sum to 22.
   - I did not re-run the analyzer. Its three numbers rest on the builder's report, which the ticket allows ("once, outside the suite").
9. **No grid import: met.** `scenery.ts` imports only `src/core`, `convert.ts` gained only `./scenery`, and the existing purity case is unedited.

**Count:** 5 cases added and 2 rewritten in `convert.test.ts`, plus 2 rewritten in `src/render3d/`. That is 9, within the ticket's 9 and the 15 cap.

**The two render3d edits:**
- `circuitdraw.test.ts` and `overlay.test.ts` each gain one filter, so that they compare against the file's nodes and leave out `hidden`. That is the right fix, not a weakened assertion.
- That is 2 cases outside `src/city/circuit/`, within the stop rule's limit.

## Rule conflicts and risks
- **Purity, folders, the Decided rules and dependencies:** none broken.
  - `src/grid/` is untouched.
  - The puzzle edit is the `capacity` line only.
  - Lamps stay leaves: each hidden lamp hangs on its own `~s~l` line.
  - A building past a cut stays dark.
  - A fuse's rating counts the scenery under it.
- **The Relight's wire glow will likely pace differently on this branch: read from the code, not seen in a browser.**
  - `cityview.ts` draws each job wire from the kept line `L`: `lineOf`, `lineFlow`, then `lineFraction(plan, index)`.
  - After the split, `L` is only the middle third of the path. So each drawn run should stay dark for the first third of the line's time, sweep across the whole run during the middle third, then hold through the last third.
  - The lamps' ignition times are unchanged, because the total path is unchanged.
  - The ticket only promised the path lengths, so S1's criteria are met, and S1 may not edit `src/render3d/`. The fix belongs in the renderer: S4, or a line in its cut.
  - Josh should know before he plays this branch.
- **Extra Relight chimes until U3 merges.** `main.ts`'s `relightCues` reads `planRelight(...).lampOrder`, which now includes the hidden lamps lit at the win: 6 more ignitions on P0. U3 is already cut for this.
- **The Relight's duration may grow, and with it the win splash's delay.** This happens if a hidden lamp arrives after the last file lamp. It may occur, not checked.
- **Two edge cases in `splitAndHang`, not met in P0:**
  - If a line's `from` node is placed on a building, `cur` starts `undefined` and the carrier walk can go the wrong way.
  - A pole that is a carrier on two lines keeps the last line's attachment.

## Must fix
none

## Could improve
1. Add a line to S4's cut (the architect's call), so that a drawn wire's fraction for `L` spans `L~a` + `L` + `L~b`, not `L` alone. S1 cannot touch `src/render3d/`.
2. In `src/city/circuit/scenery.ts`, start the carrier walk from the `from` node's pole or the run's first span end, not `undefined`, when `from` has a building place. Or throw a CK15 problem, as is done for an id containing `~`. It is harmless today, because lamps are leaves and P0 has no such line.
3. P0r's note can quote the start as "using 2 of 25" (measured here), the win as "using 24 of 25", and the switch thrown before any repair as 13 of 25.
