# Ticket 070 C2: why parking cannot hold, and what to do (options note, 19 Nov 2026)

Not committed. Written by the pipeline designer session for Josh and the Opus orchestrator. Nothing here is decided until Josh says so in chat.

All numbers are measured, on a scratch copy of the stopped C2 code (`560193a`) with each lever as a switch, over the 13 named cities (3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3). The probe is a sketch, not the build: the builder's own numbers may differ by a lot or two.

## Ruled (Josh, 19 Nov 2026, in chat)

Asked "Do you approve all four rulings as recommended ("Yes, all four"), or do you want to keep 0.15 instead?", with the four rulings as worded under "The rulings Josh must give" below, Josh answered: **"Yes, all four"**.

So: the lot ratio is 0.075 stalls a home; a part 6 cells deep may park in its own paved yard; Land places a lane only where every court part it leaves is at least 8 cells long; a court part with no drive gets a walk-through even with a lane beside it. `LOTS_PER_BLOCK_MAX` stays 2 (ticket Q5 is not needed). The orchestrator's next steps are at the end of this note.

## What is actually wrong (three causes, not one)

1. **Demand grew 2.6 times and the ratio did not move.** The 0.15 stalls a home was approved when the default city had 379 homes (57 stalls wanted, about 10 lots). Ring 2 and the lane rows make it about 970 homes, so 145 stalls wanted and a floor of 109. Two 6-stall lots a block is a ceiling of 108.
2. **Half the parts cannot hold a lot at all.** A part 6 cells deep has a yard 2 cells deep, and a court needs 3. These parts are not rare: they come from 6-wide blocks (streets), from half parks (11 wide leaves 6) and from lane cuts (9 leaves 2 and 6). On the default city 5 of 9 blocks have no place for a court, so they are "short" whatever the ratio is.
3. **Land cuts parts nothing can open.** A lane can leave a 6 by 6 or 6 by 7 part. No drive fits (a side needs 8), and a 6 by 6 cannot even take a walk-through. C1 passed only because lane parts were exempt from "every interior touches an opening". The default city has one.

Every extra drive also costs 2 cells of street frontage, and R1 (floor 0.88, Josh's number) is already near its floor. So "more lots" runs into R1 before it fixes P2.

## The options, measured

"Fixes" below means the two small repairs every option needs (rulings 3 and 4 at the end). Without them 10 of 13 cities stop on M5 before P2 is even counted.

| Option | Cities passing all mass checks | Default city: stalls laid / floor | Lowest R1 | What stops it |
| --- | --- | --- | --- | --- |
| C2 as stopped | 0 of 13 | 54 / 110 | n/a | M5 on 10, P2 on 3 |
| Fixes only, ratio 0.15 | 0 | 54 / 109 | 0.872 | P2 everywhere |
| Lever 2: 3 lots on big blocks | 0 | n/a | 0.854 | P2 on 9, R1 on 6 |
| Lever 3: frontage lots uncapped | 0 | n/a | 0.855 | R1 on 6, P2 on 6 |
| Levers 2 + 3 together | 0 | n/a | 0.847 | P2 mostly holds, R1 fails on all 10 that ran |
| Lever 5 alone: ratio 0.075 + fixes | 12 | 48 / 55 | 0.891 | the default city: 3 blocks short |
| Lever 5 alone: ratio 0.10 + fixes | 6 | 54 / 73 | 0.872 | short blocks |
| **Yard courts + fixes, ratio 0.075** | **13** | **66 / 54** | **0.899** | nothing |
| Yard courts + fixes, ratio 0.09 | 13 | 72 / 65 | 0.890 | nothing (R1 is thin) |
| Yard courts + fixes, ratio 0.10 | 10 | 90 / 71 | 0.879 | R1 on 2, one city short |
| Yard courts + fixes, ratio 0.15 | 0 | 96 / 105 | 0.875 | P2 on 11 |
| Keep 0.15: yard courts + courts that grow to 12 stalls + 3 lots on big blocks | 12 | 144 / 104 | 0.882 | 3 x 3 seed 5: 2 blocks short |
| Keep 0.15: yard courts + courts that grow to 18 stalls | 11 | 138 / 105 | 0.888 | short blocks on 2 |

- M5 holds on all 13 in every row that has the fixes.
- Lever 1 as the builder wrote it (Land avoids every 6-wide part) cannot work: on the default city 4 of the 6 narrow parts come from the streets, not from Land, and stage 1 is pinned to the old city.
- A **yard court** is the new piece: a part whose yard is 2 cells deep takes a 2-cell drive through both rings and six stalls along the far side of its paved yard (two stall tiles, one each side of the drive's line), with the near side as the aisle. It is a court behind a drive, not a frontage lot, so no cap changes. On a lane part the drive opens on the lane and costs no street frontage.

### The recommended row, city by city (yard courts + fixes, ratio 0.075)

| City | Homes | Wanted | Floor | Laid | R1 | Drives (on a street) |
| --- | --- | --- | --- | --- | --- | --- |
| 3 x 3 s1 (default) | 966 | 72.5 | 54.3 | 66 | 0.927 | 11 (7) |
| s2 | 888 | 66.6 | 49.9 | 72 | 0.914 | 12 (5) |
| s3 | 885 | 66.4 | 49.8 | 66 | 0.904 | 11 (7) |
| s4 | 957 | 71.8 | 53.8 | 78 | 0.899 | 12 (6) |
| s5 | 969 | 72.7 | 54.5 | 66 | 0.927 | 11 (4) |
| s6 | 1278 | 95.8 | 71.9 | 90 | 0.937 | 15 (5) |
| s7 | 843 | 63.2 | 47.4 | 60 | 0.908 | 10 (7) |
| s8 | 822 | 61.6 | 46.2 | 66 | 0.909 | 11 (8) |
| s9 | 924 | 69.3 | 52.0 | 66 | 0.916 | 11 (7) |
| s10 | 876 | 65.7 | 49.3 | 66 | 0.919 | 11 (7) |
| 6 x 4 s1 | 2640 | 198.0 | 148.5 | 186 | 0.924 | 31 (17) |
| 6 x 4 s2 | 2517 | 188.8 | 141.6 | 192 | 0.905 | 32 (20) |
| 6 x 4 s3 | 2829 | 212.2 | 159.1 | 216 | 0.914 | 36 (16) |

No block is short, no frontage lot is used, and no city needs a walk-through. Outside the named list (3 x 3 seeds 11 to 20, 6 x 4 seeds 4 to 8, for information only, nothing tuned) 15 of 15 also pass. The 6 x 6 seed 1 city ends ok.

## Recommendation

**Halve the ratio to 0.075, add the yard court, and make the two small repairs.** `LOTS_PER_BLOCK_MAX` stays 2 (ticket Q5: not needed), the frontage-lot cap stays, the supply band stays, R1's floor stays.

Why halve rather than build 2.5 times the parking:
- The city then draws about the parking Josh already looked at and approved (66 stalls on the default city; the old city wanted 57). At 0.15 it would be about 140.
- His own words on parking were "parking spaces are overwhelming. Too many parking spaces."
- Keeping 0.15 needs three new things at once (growing courts, 3 lots a block, yard courts), still fails one city in the probe, and sits 0.002 above the R1 floor.

What it costs, said plainly:
- It is a change to a number Josh approved (18.1, a Default he accepted in ticket 056). Only his word changes it. The guide said the drawn stalls were about half a real core's; they become about a quarter.
- Yard-court stalls stand in front of the ground floor of the row across the yard. Stage 7 must never put a door behind a stall. That is one new criterion for H1.
- The Land rule moves lanes on 9 of the 13 named cities (alley and park counts unchanged, V3 and V4 hold). The land picture Josh saw after B changes a little, and B's digest pins are re-taken.
- The old `city=tiles` path keeps 0.15 until section L, so P2 is the one check where the old and new paths no longer agree. The ticket's "the two must agree" line needs that exception written in.

## The rulings Josh must give (one word each)

1. **The ratio.** Ring 2 doubled the homes. May the lot ratio go from 0.15 to 0.075 stalls a home, so the city draws about the parking you already approved?
2. **Yard courts.** May a part that is only 6 cells deep park in its own paved yard: a drive in, six stalls along the far side?
3. **Land.** May Land place a lane only where every court part it leaves is at least 8 cells long, so a drive always fits? (A block with no such place takes no alley.)
4. **Walk-through.** A court part that ends up with no drive gets a walk-through even if it has a lane beside it. Your words were "only where an interior has no other way in", and a lane beside the rings is not a way in. Agreed?

If the answer to 1 is no, the fallback is the "keep 0.15" row: rulings 2 to 4, plus courts that grow with demand (12 stalls behind one drive) and Q5 (3 lots on blocks of at least 10 cells each way). It needs more builder work and one city still has to be solved.

Not asked now: a whole block that streets makes 6 by 6 and Land leaves alone still fails M5 (no legal walk-through). It never occurs on the named cities. It stays an honest failure until larger cities are looked at.

## What the orchestrator does once he rules (recommended path)

1. **Architect re-cut of ticket 070** (one pass), with Josh's words:
   - **New section B2** (planner, `src/city/land/` only): `lanePositions` takes the side across the cut and drops a place that leaves a court part with a long side under 8; `planBlocks` never chooses a block with no place for an alley; M4a gains that clause with a failing fixture (a 6 by 13 block cut 6, lane, 6); V3 and V4 hold; land's four digest pins are re-taken and named as moved by B2.
   - **C2 re-cut** (planner, `src/city/mass/`): `PARK_PER_HOME` 0.075 with the ruling quoted; the yard court as a second court shape in `sites.ts` (yard exactly 2 deep, stalls on the far side, aisle on the near side, needs a side of 8); a lane part opens its court on the lane where one fits and otherwise is planned like any other part (no throw); a court part with no drive gets the walk-through, on its lane side where it can; P2's terms and every other threshold unchanged; the "constants equal the old tile city's" test excepts `PARK_PER_HOME`; the stop rule stays.
   - **Checks table:** note that P2's ratio differs from the old path until L.
   - **H1:** add "no door on a column whose open side is a stall cell".
   - **Grammar and guide text** (rule 4's table, rule 6's walk-through line, 18.1's ratio) change in L as the ticket already says; the re-cut lists the lines.
   - **Two small items:** `src/city/streets/stage.test.ts`'s "6 x 6 (R-7)" test calls `runCity` with no `until`, so it breaks whenever a later stage fails on 6 x 6; it should stop at `"streets"` (goes in B2's or C2's Files). And retype `CityOpening.mouth` as a list before D2, so a lane is one opening with two mouths (the C1 reviewer's suggestion).
2. **B2 first** (small): worktree, planner on Sonnet, gate, review and playtest, merge.
3. **C2 resumes from `560193a`**, rebased onto the goal head after B2. Kept as they are: `unitsOf`, the quota rounds and the dearer-layout rule, the P2 port, the drive and court laying in `plan.ts`. Changed: the three things in the C2 re-cut above. C1 does not re-open as a section: its walk-through code changes inside C2, and its digest pins were always going to be re-taken there.
4. Screenshot of `?view=3d&city=plan&stage=mass` for Josh after C2 merges, with the stalls, wanted and floor numbers for the default city.

The probe (throwaway): `C:\Users\Josh\AppData\Local\Temp\claude\3682bd600b44598b\7e6c1d18-8b21-40c5-800e-40e14f1a654a\scratchpad\probe` (`src/probe.test.ts`, switches in `src/city/mass/knobs.ts`, raw output in `out.txt`, `out2.txt`, `out3.txt`, a picture of the default city in `default-mass-recommended.png`).

## Addendum, 19 Nov 2026 late: the round-1 must-fix (a frontage lot and the walk-through)

Measured on a scratch copy of `cdfb84f` (`scratchpad\probe2`, throwaway), 13 named cities plus 15 others.

- **The review's premise does not hold on 3 x 3 seed 4.** The part with the frontage lot (`block:1:0/b`, 9 by 8) already has a court behind a drive on its lane side. The frontage lot is its second lot and serves the block across the street (`block:2:0`). So that part has a drive and needs no walk-through under either reading.
- In all 28 cities, 8 parts hold a frontage lot and every one also has a court drive. No part has a frontage lot as its only lot.
- With the strict rule switched on ("a walk-through unless the part has a drive"), nothing moves: 0 walk-throughs laid, every number and R1 identical (seed 4 stays 0.8988), all 28 pass.
- The code's rule (`mine.length === 0`) is still wrong for a case that can occur on other cities: a part where no court or yard court fits but a 2 by 2 frontage lot does (a 6 by 6 or 6 by 7 part). There the frontage lot would stand in for the walk-through, and would turn the 6 by 6 block's honest M5 failure (Q7) into a pass.

Recommendation: a frontage lot is parking, not a way in. It is four cells of stalls with cars on them, and counting it would make more parking the cheap way to pass M5. The ticket's criterion 5 and grammar line 161 already say "no drive", so this is the ticket as written, not a new rule.

Question for Josh: "A frontage lot is parking, not a way in: a court part whose only opening is a frontage lot still gets a walk-through. Agreed?"

**Ruled (Josh, 20 Nov 2026, in chat):** asked "A frontage lot is parking, not a way in, so a court part whose only opening is a frontage lot still gets a walk-through. Agreed: yes or no?", he answered: **"Yes, agreed"**. The "Yes" path below applies.

- **Yes:** planner only. `plan.ts` lays the walk-through unless the part has a court or yard-court drive, with the frontage lot's cells counted in the stretch check; M5's "interior touches an opening" does not count a frontage lot; the stage test's `hasLot` counts only drives; one fixture (a part whose only lot is a frontage lot gets a walk-through, and fails M5 without one) and one for 6 by 6 (still the honest M5 failure). No named city's digest should move; if one does, stop.
- **No:** architect adds one line to C2 criterion 5 and to L's grammar line ("no drive and no frontage lot"), with his words; planner adds a fixture pinning it. Cost: a 6 by 6 block can then pass M5 on a frontage lot alone.
