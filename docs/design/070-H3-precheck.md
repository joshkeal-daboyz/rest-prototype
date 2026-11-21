# 070 H3 pre-check: roofs and the roof exit on the pipeline's cells

**Josh's answer (21 Nov 2026, in chat).** Asked the five questions as recommended, he answered: "Yes to all except novelty signs. They can be placed on the face of a build in addition to the roof. They represent the store in the storefront. A pizza should correspond with a pizza shop and a beer bottle, for example, should correspond with a liquor store or a corner store." So: Q1 yes (`ROOF_DECK_M` 0.5), Q2 yes (billboard edge 0.28 m), Q4 yes (HC, RC, RK, RW as written), Q5 yes (`DRESS_MAX` left off, J checks the frame rate). Q3 is neither yes nor no: a novelty sign stands for the shop under it (pizza over a pizza shop, a beer bottle over a liquor or corner store), and may go on the building's face as well as its roof.

21 Nov 2026, pipeline-designer, on `goal/city-style` at 55aba63.

This is a sketch. A throwaway probe outside the repo imports the merged stages 1 to 7 read-only and runs them on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on). No 3 x 3 or 6 x 4 city was run (Josh, 21 Nov 2026).
- It ports `dressBlock`'s big roof prop and small roof props onto each `CityBuilding`, with the re-cut's readings (RL, RE, RX, RD, RW, RC, RK, RB, RN, HC). Each lever is a switch.
- It counts each column's merged pieces for the cap: H1b's dressing, the escape's `escapeWeight`, H2's canopies and upper-wall props. Party-wall pieces are not counted.
- Sizes come from `dressing.test.ts`' fixture. RT and RD are measured from the converted GLB.
- The salts are the ticket's form, `rand("roof", <slot>, building id, ...)`, but my own. I ran three more salts. The builder's numbers are the record.

## 0. Premises the measurements change

- **RT: every roof's deck is at 0.500 m, styles 2 and 3 included.** The 0.744 m bounds top of `Roof_02`, `_03` and their corners is a rim outside the deck. So RT as written (base at the bounds top) would float 33,478 of 50,169 roof pieces (67 %) 0.244 m above the deck.
- **BB is right, and reading the billboard "from the roof's own body" does not rescue it.** The roof body is 5.022 to 5.024 m wide, so a body-based deck is 4.422 to 4.424 m. That is still under the billboard's 4.428 m.
- **BB costs R8 nothing.** R8's second number counts runs with any big prop. When the billboard does not fit, the rotation falls through to the water tower. Each run's R8 is identical, to the piece, with and without billboards.
- **HC is not optional.** Under the old height caps (16, 13 and 10 m) every big prop is refused: 9,562 of 9,562. Even the 0.562 m pizza sign on a 3-storey roof tops out at 10.062 m. R8's second number would be 0 on every run.

## 1. What holds, and what needs Josh

**R8, M9b, the deck, the roofs and the cap hold on 20 of 20 runs, at every lever setting.** The numbers needing Josh are RT's deck height (0.5, not 0.744), whether billboards ever appear (BB), and where novelty signs go (RN). HC, RC, RK and RW add rules but cost nothing measurable. The dressing budget `DRESS_MAX` is passed on every run (C1, for J).

| Run | Buildings | With a roof piece | R8 first (0.9) | Runs | With a big prop | R8 second (0.5) | Roof pieces | All dressing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 on | 982 | 963 | 0.981 | 488 | 334 | 0.684 | 2,691 | 7,324 |
| 2 on | 1,057 | 1,021 | 0.966 | 504 | 358 | 0.710 | 2,769 | **7,678** |
| 3 on | 991 | 967 | 0.976 | 533 | 349 | 0.655 | 2,610 | 7,357 |
| 4 on | 917 | 893 | 0.974 | 460 | 319 | 0.693 | 2,403 | 6,869 |
| 5 on | 915 | 888 | 0.970 | 425 | 320 | 0.753 | 2,384 | 6,775 |
| 6 on | 1,004 | 969 | **0.965** | 480 | 348 | 0.725 | 2,596 | 7,378 |
| 7 on | 1,013 | 981 | 0.968 | 472 | 324 | 0.686 | 2,628 | 7,432 |
| 8 on | 931 | 907 | 0.974 | 447 | 309 | 0.691 | 2,449 | 7,038 |
| 9 on | 920 | 899 | 0.977 | 450 | 306 | 0.680 | 2,429 | 6,810 |
| 10 on | 988 | 963 | 0.975 | 538 | 351 | **0.652** | 2,569 | 7,189 |
| 1 off | 951 | 927 | 0.975 | 474 | 322 | 0.679 | 2,434 | 7,028 |
| 2 off | 953 | 928 | 0.974 | 486 | 329 | 0.677 | 2,497 | 6,991 |
| 3 off | 986 | 967 | 0.981 | 480 | 329 | 0.685 | 2,703 | 7,423 |
| 4 off | 915 | 891 | 0.974 | 464 | 312 | 0.672 | 2,391 | 6,688 |
| 5 off | 838 | 821 | 0.980 | 400 | 297 | 0.743 | 2,226 | **6,256** |
| 6 off | 934 | 909 | 0.973 | 464 | 317 | 0.683 | 2,445 | 7,018 |
| 7 off | 996 | 967 | 0.971 | 476 | 334 | 0.702 | 2,646 | 7,277 |
| 8 off | 962 | 938 | 0.975 | 473 | 348 | 0.736 | 2,501 | 7,134 |
| 9 off | 831 | 816 | 0.982 | 398 | 290 | 0.729 | 2,237 | 6,316 |
| 10 off | 943 | 918 | 0.973 | 458 | 307 | 0.670 | 2,561 | 7,252 |

- **Lowest:** R8's first number is 0.965 (seed 6 on), 0.065 to spare. Its second is 0.652 (seed 10 on), 0.152 to spare.
- **Over four salts:** the first number is at least 0.960 and the second at least 0.652.
- **Runs** are B2 runs, street and quiet. 140 to 245 of a run's 398 to 538 are one building long.

## 2. The questions, measured

**Q1. R8 in each order and with or without billboards.** Every run's buildings with a roof piece, and runs with a big prop, are the same in all five settings:
- RC (roof pieces last);
- `dressBlock`'s order (roof pieces never turned away);
- BB as read (no billboard);
- billboards allowed (Q2's option B);
- RN street-only.

The cap only ever turns away a roof piece on a building that keeps another one.

**Q2. BB and RE: what fits the 4.40 m deck** (a 2.20 m half for a second small prop).

| Key | Width x depth | Fits |
| --- | --- | --- |
| Water tower | 2.420 x 2.419 | yes |
| Roof exit + clear deck | 2.758 x (2.851 + 1.2 = 4.051) | yes; 4.051 of 4.202 with RK's deepest back inset |
| **Billboard + face** | **4.428** x (1.611 + 0.118) | **no, 0.028 m too wide** |
| Novelty signs (17) | widest 3.818 x 3.818 (Donut) | all |
| Small props (6) | widest 1.586 (Aircon_02), deepest 2.727 (Vents_Exhaust) | all, in a half too, and with RK's side inset (2.002) |

- **As read:** the rotation reaches the billboard 1,701 times. It falls through to the water tower 1,677 times; the other 24 are buildings with no mid roof at all, so nothing is placed on them.
- **From the GLB:** the billboard's legs are only 3.176 m wide at the deck. The 4.428 m board starts about 0.3 m up.
- **Option B (billboard edge 0.28 m, not 0.3, billboard only; RK's insets still apply):**
  - 791 billboards are placed (29 to 55 a run), all on street mid columns;
  - the board stands 0.286 m inside the walls;
  - 27 tries are blocked by RK and 17 by the cap;
  - 0 party-wall clashes, and R8 is unchanged.
- **Without RK,** billboards at legs width would hit party windows 19 times and pipes 8 times. That is why option B keeps RK.

**Q3. RT, measured from the GLB on a 46 x 46 grid over each deck.**

| Roof key | Bounds h | Deck height | Rim at 0.744 |
| --- | --- | --- | --- |
| `Roof_01`, `Roof_Corner_01` | 0.500 | 0.500 everywhere | none |
| `Roof_02`, `Roof_03` | 0.744 | 0.500 everywhere | 1.64 m², outside the deck |
| `Roof_Corner_02`, `Roof_Corner_03` | 0.744 | 0.500 everywhere | 3.31 m², outside the deck |

- **Recommended number:** `ROOF_DECK_M` 0.5 for all six keys.
- `PARTY_ROOF_H_M` (0.744) stays as it is for the party-wall room, which is measured to the rim at the wall.

**Q4. RD: the door is on +z. Confirmed.**
- **+z:** a recess 0.09 to 0.17 m deep behind the main wall plane (planes at z 1.180 to 1.254 against the wall at 1.346). It spans x -0.11 to 0.93 m (1.05 m wide, 0.41 m off centre) and is 1.94 to 2.03 m high.
- **-z:** flat, with no recess. It is the low side of the housing (1.79 m; the hut's roof slopes back).
- **±x:** flat.
- So the half-turn stands, and RW's 2.758 m width covers the 1.05 m door.

**Q5. HC.**
- **Big props by storeys:**
  - 3 storeys: 3,156, of which novelty 2,927, tower 141, exit 88;
  - 4 storeys: 3,252;
  - 5 storeys: 3,154.
- **Tallest top by storeys:** 15.878, 18.878 and 21.878 m. The tallest is the Guitar sign (6.378 m) on a 5-storey roof.
- **The old caps** (a 3-storey lot carries 10 m, 4-storey 13 m, 5-storey 16 m) would refuse all 9,562.

**Q6. RC.**
- **Turned away by the cap:** 96 small props and 2 big props in 20 runs. The big ones are 1 exit and 1 tower, each of which fell to another column.
- **What fills those columns:** shop dressing and upper-wall props. No escape column is involved.
- **What R8 loses:** nothing (Q1).
- **In `dressBlock`'s order instead,** the roof pieces would push 102 of H1b's and H2's pinned pieces over the cap (up to 8 on a column). That would move pinned digests.

**Q7. RK.**
- **Roof cells with a party-wall piece over them:** 10,324 (14,429 pieces), always on one side of the cell.
- **Sides inset:** 2,111 by a window (0.370) and 1,406 by a pipe (0.498). Boards (0.118) never inset.
- **Clashes the plain port makes (0.3 everywhere):** 178 in 20 runs.

| Piece | With a pipe | With a window |
| --- | --- | --- |
| Small prop | 93 | 23 |
| Novelty sign | 23 | 31 |
| Exit | 1 | 5 |
| Water tower | 0 | 2 |

- **RK removes all 178 and costs nothing:** no prop or exit stops fitting, and nothing falls through.

**Q8. RX and RW.**
- **Buildings with a blind column:** 3,260 (163 a run).
- **Exits:** 1,591. Of these, 173 are on blind columns and 1,418 on mid columns.
- **RX's tier order holds:** no exit stands on a mid column of a building that has a blind column. Both tiers are exercised on the named runs.
- **Exits whose housing and deck do not fit:** 0, with RK too. So there are 0 fall-throughs from the exit.
- **Doors facing an open side:** 0.

**Q9. RB and RN.**
- **Novelty signs:** 4,662 in 20 runs (204 to 265 a run, about 1 building in 4 and 49 % of all big props). Of these:
  - 1,826 are on street fronts;
  - **2,123 on quiet fronts;**
  - **713 on blind columns.**
- **Option RN street-only** (a mid column with a street front, like RB):
  - 1,826 novelty signs (about 91 a city);
  - the rest go to towers and exits (towers 5,191, exits 2,545);
  - R8 is unchanged.
- **RB:** with BB as read it is moot. With option B it keeps the billboard off 1,607 quiet-front tries and 219 blind-column tries.

**Q10. The totals.**
- **Roof pieces a run:** 2,226 to 2,769.
  - Small props: about 2,000 a run (1,799 to 2,242).
  - Water towers: 140 to 200. Exits: 53 to 93. Novelty signs: 204 to 265. Billboards: 0.
- **Small props by key:** spread evenly, 6,637 to 6,876 each. Columns with one small prop: 17,507; with two: 11,598.
- **Before H3,** H1b + H2 + H2b come to 4,030 to 4,909 a run.
- **With roofs: 6,256 to 7,678, over `DRESS_MAX` 6,000 on 20 of 20 runs** (up to 28 % over). Option B adds about 80 more pieces a run.
- C1 does not apply the cap. The tile city's `dressTown` would leave later buildings bare past 6,000. This is J's draw-call question.

## 3. Recommendation and its cost

- **RT: `ROOF_DECK_M` 0.5 on all six roof keys** (a new measured number). Otherwise two thirds of roof props float. Cost: criterion 4's style-2 sign test reads base 3 x storeys + 0.5, not + 0.744.
- **BB: option B, a billboard edge of 0.28 m** (billboard only; RK and RB still apply). This changes rule 11's 0.3 for one key, so only Josh's words can make it. It brings back about 40 street billboards a city and moves no check. If Josh says no, BB stands as read: billboards stay in the table, none is placed, and the test says so.
- **RN: novelty signs on street fronts only.** As ported, about 140 a city sit over courts and blind roofs, where nobody walks by to read an advert. This moves no check.
- **HC, RC, RK and RW as written.** Each holds and costs nothing measurable. HC is needed: without it R8's second number is 0. RC is needed so H1b's and H2's pins do not move.
- **`DRESS_MAX`: leave it unapplied on the pipeline (C1),** and let J measure the frame cost of about 7,700 pieces. Applying it would leave the last buildings of every city bare and make R8 depend on build order.
- **No threshold moves.** R8's 0.9 and 0.5, `DRESS_PER_BAY_MAX` 6 and the chances stay. No merged section re-opens. The facades digest re-pin is already expected (criterion 7).

## 4. Questions for Josh

1. "Roof props stand on the flat roof at 0.5 m on every roof style (styles 2 and 3 have a 0.74 m rim round the edge; standing on the rim would leave two thirds of roof props floating)?" (yes / no; **recommended yes**)
2. "The rooftop billboard is 3 cm too wide for the roof, so as written there are no billboards at all (water towers stand in). Let billboards stand 0.28 m from the roof edge instead of 0.3, giving about 40 street billboards a city?" (yes / no; **recommended yes**)
3. "Novelty signs (pizza, burger and so on) only on roofs over a street? As written about 230 a city, more than half over courtyards and blind roofs; street-only gives about 90." (yes / no; **recommended yes**)
4. "Four rules as written: no height limit on roof props (tallest top 21.9 m); roof props come last when a column is full (about 5 small props a city dropped); roof props keep clear of party-wall windows and pipes; the roof exit keeps 1.2 m of clear roof as wide as the hut in front of its door?" (yes / no; **recommended yes**)
5. "With roofs, a city has about 6,300 to 7,700 dressing pieces, over the tile city's 6,000 budget. Leave the budget off and let J check the frame rate?" (yes / no; **recommended yes**)

## 5. What the orchestrator does for each answer

- **All yes.** The architect re-cuts H3 before the builder:
  - RT becomes `ROOF_DECK_M` 0.5 for the six keys: typed in `roofkit.ts`, pinned to the GLB in `roofpin.test.ts`, and used in criteria 4 and 5.
  - BB is replaced by a billboard edge of 0.28 m. Criterion 2 then expects billboards on street mid columns, and criterion 5's RB fixture stands.
  - RN becomes street-only: criteria 2 and 5 gain a fixture with a novelty sign on a quiet front.
  - HC, RC, RK and RW stay as written, quoting Josh's words.
  - Criterion 8 reports `DRESS_MAX` as passed, for J.
  - The builder then starts from the re-cut. No merged section re-opens.
- **Q1 no.** Props stand on the bounds top: 0.744 on styles 2 and 3, floating 0.244 m. The architect writes that as Josh's choice, and J's screenshots should show it.
- **Q2 no.** BB stands as read. Criterion 2 asserts 0 billboards and names BB.
- **Q3 no.** RN stands as written: novelty signs on any run's lowest building. The report counts quiet and blind ones.
- **Q4 no (any of the four).** Ask Josh which. Without HC, R8 fails (second number 0): H3 cannot pass, and the builder stops on R8 at once. Without RC, H1b's and H2's pins move (102 pieces). Without RK, there are 178 clashes. Without RW, the door's width needs a measured number (1.05 m from the GLB).
- **Q5 no.** Josh names the budget's rule, and the architect cuts it as its own section before J. H3 is unchanged.

Probe: `C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\h3probe` (`probe.ts` with switches CAP, BB, RK, DECK, RN, SALT; `glb.ts` and `bb.ts` for the GLB; `out-*.txt`).
