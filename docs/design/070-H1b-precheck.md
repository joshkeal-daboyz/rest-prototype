# 070 H1b pre-check: shopfront dressing on the pipeline's cells

21 Nov 2026, pipeline-designer, on `goal/city-style` at ae39d10.

This is a sketch. A throwaway probe outside the repo imports the merged stages 1 to 7 read-only and runs them on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on). It then lays `dressBlock`'s glass, awning, sign and ATM rules over H1's ground pieces, using the re-cut's readings. Key sizes come from `dressing.test.ts`' fixture, and the hosts from H1's `GROUND_KIT` and the floor bounds.

My hash is not the builder's (the stage's `rand`), so every share below moves a little in the build. A second salt shows how much: R5 0.677 to 0.725, R6 0.537 to 0.606, ATM share 0.257 to 0.323. The builder's numbers are the record.

## 1. What holds, and what needs Josh

**The numbers hold, with W1 and X1 as written.** R4, R5, R6 and the ATM share pass on 20 of 20 runs. So do they with W2, and with X2 when R4 counts the mixed corners out.

**Two readings change how a grammar rule reads, so they need Josh's word:**
- **T1** sets rule 2 aside for dressing. Without T1, R5 and the ATM share fail on every run.
- **X1** puts glass and the L awning on a quiet face, which M8 forbids except at a corner.

**One reading gives a look Josh should rule on: W1.** Neighbouring awnings overlap, up to 0.42 m at the same height.

| Check (floor) | W1, X1 (as written) | W2, X1 | W1, X2 (R4 counts mixed corners out) | Rule 2 literal (0.6 m reach) |
| --- | --- | --- | --- | --- |
| R4 (1) | 1.000 | 1.000 | 1.000 (0.777 to 0.830 if counted in) | 1.000 |
| R5 (0.55), mixed-awning buildings | 0.685 to 0.746, 0 | 0.659 to 0.723, 0 | 0.659 to 0.723, 0 | **0.059 to 0.105** |
| R6 signed (0.45) | 0.533 to 0.604 | same | same | **0.440 to 0.496** (3 fail) |
| ATM over street buildings (0.15) | 0.272 to 0.322 | same | same | **0** (no ATM fits) |
| Runs passing | 20 | 20 | 20 | 0 |

Shop bays per run: 760 to 926 (17,023 in all).

## 2. The readings, measured

**Q1. R4, R5 and R6:** see the table. W2 costs R5 about 0.025, because no awning is wider than 5.00 m. X2 takes 2,894 glass panes off, 145 a city. If R4 counted those corners in, it would fail on 20 of 20 runs (0.777 to 0.830).

**Q2. W1's overlaps.** These are pieces of neighbouring columns whose plan boxes overlap: 45 to 81 pairs a run, and 21 to 43 of those also overlap in height.

| Pair | Pairs (20 runs) | Largest | Same height |
| --- | --- | --- | --- |
| `Cover_05` + `Cover_05` (two L awnings side by side along one street face) | 126 | **0.419** | all 126 |
| `Cover_04` + `Cover_04` (one building) | 320 | 0.104 | 64 |
| `Cover_03` + `Cover_04` (two buildings) | 85 | 0.052 | 18 |
| a blade sign under the neighbour's awning (the blade's 0.1 m inset starts past the cell edge) | 42 | 0.093 | |
| corner glass or `Shop_01_Glass` beside an L awning (plan only, different heights) | 667 | 0.126 | 0 |

W2 has none. Where a building's ground pieces sit at different S1 levels, its awnings step by up to 0.077 m (L1).

Lever **LG**: W1, but no L awning on a column beside one that already has one; that corner takes the building's flat key instead. LG removes all 126 L pairs and keeps 1,409 of the 1,534 L awnings. R5 is then 0.680 to 0.744. That leaves 82 same-height overlaps of `Cover_04` (at most 0.104 m), about 4 a city.

**Q3. Mixed corners.** There are 2,894 (118 to 174 a run), and 1,340 of them are the strip ends of quiet buildings.
- **The quiet side is:** a lane 1,568, a drive 936, a court (with a plaza on the street side) 336, a frontage lot 46, a walk 8.
- **Exactly half (1,447; 59 to 87 a run) have a quiet front.** Each opening is flanked by two mirror-image corners, and the forced turn puts one of them front-on to it. Under X1 these keep their glass (and an L awning on style 3), with no flat awning and no sign.
- **X2's cost** is 2,894 glass panes and 752 L awnings. It leaves every mixed `Shop_Corner_01` as a shop piece without its glass.

**Q4. Reach past the front cell edge (T1),** worst host, in metres:

| Key | Reach | Key | Reach |
| --- | --- | --- | --- |
| Shop_Cover_03 | **4.058** | ATM | 1.048 |
| Shop_Cover_02 | 3.792 | Sign_Barber (blade) | 1.031 |
| Shop_Cover_01 | 3.372 | Sign_Hotel (blade) | 0.857 |
| Shop_Cover_04 | 1.289 | fascia signs | 0.620 to 0.736 |
| Shop_04_Glass | 1.212 | other flat glass | 0.346 to 0.492 |
| Shop_Cover_05 (L) | 0.173 (side 0.197) | corner glass | inside the bounds |

- **Against T1's limits:** everything is within 5.00 m, and every awning is within 4.70 m (0.64 m to spare). T1 never binds.
- **Against rule 2's 0.6 m:** every flat awning, every sign, the ATM and `Shop_04_Glass` fail. Only the L awning and the other glass pass, which is the last column of the table in section 1.
- **Same as the tile city:** the pack's kerb face stands 0.66 m inside the pavement cell. So `Cover_03` stops 0.28 m short of the visible kerb, against `AWNING_KERB_M`'s 0.3. The tile city's frame (`kerb_m` 5) gives the same result.

**Q5. ATM.** The share over street buildings is 0.272 to 0.322. Over all buildings it is 0.122 to 0.154, which is under 0.15 on 18 of 20 runs. So A1's scope is what lets R6 pass. It is the grammar's own words ("count street frontages only"), so A1 changes nothing.
- **The cap:** each city has 398 to 540 runs (B2). Of those, 80 to 119 carry an ATM and 23 to 36 reach `ATM_PER_RUN` (588 in all).
- **No quiet building gets an ATM.**

**Q6. Pieces per run:** 1,714 to 2,068, against `DRESS_MAX` 6,000 (29 to 34 %). The largest is 6 x 6 seed 3 on. A column carries at most 3 pieces, against `DRESS_PER_BAY_MAX` 6. C1 holds whichever way the cap is read.

**The other readings:**
- **B1** (a block is a building): holds. No building has two flat awning keys, a key twice or two blades.
- **B2** (a run is a chain of row neighbours): all 8 L buildings lie in two rows' runs. All 8 are quiet, so they carry no ATM and nothing changes. The ticket could still name the `rowId` row's run for an L.
- **The face reads differently from the tile city.** On 1,555 of the 2,996 two-street corners, the forced front is the side street. So the flat awning and sign face the cross street, where the tile city always dressed the block's own road face. Nothing fails; it is a look.
- **E1** (no fire escapes in H1b): holds, but it hides a near miss for H2. This is an estimate: one plain shop column per 3-plus-column street building, chosen by hash. At the ladder's 0.5 share, R6 drops to 0.449 to 0.518 and fails on one run (seed 3 off, 0.449). At the tile city's 0.4 it is 0.464 to 0.536 and holds.
- **L1:** holds (awning steps up to 0.077 m). **C1, A1:** hold.

## 3. Recommendation and its cost

- **T1: yes.** Without it, R5 and R6 cannot pass on any run, and rule 9 keeps them. Cost: rule 2's "awnings, signs" stop counting as trim for the 0.6 m limit. That is a grammar rule only Josh's word changes. L later rewrites rule 2's text.
- **X1: yes.** Glass belongs to the shop corner piece, which H1 already stands on mixed corners. X2 would leave 145 shop corners a city without their glass, and R4 would need a counted-out clause. Cost: M8's corner exception covers the corner's own glass and the L awning, not only the shop piece.
- **W1 with LG.** It keeps the tile city's four flat keys and the L awning. It removes the worst overlap (0.42 m, same height) and leaves about 4 seams of at most 0.10 m a city for J's screenshots to judge. If Josh wants no overlap at all, use **W2**: everything still holds, but `Shop_Cover_04` and the L awning are never placed. Cost: LG is a new line in criterion 2 (the architect's).
- No approved number, merged section or digest pin moves under any of these.

## 4. Questions for Josh

1. "The tile city's awnings reach up to 4.1 m over the pavement, but the grammar's trim limit is 0.6 m. May shop dressing (awnings, signs, ATMs) reach over the pavement as on the tile city, with the 0.6 m kept for the buildings' own trim?" (yes / no; no means no awnings or ATMs anywhere, and R5 and R6 fail)
2. "About 145 corner shops a city stand on a street and a lane. May they keep their wrap-round glass, and the L awning, on the lane side too?" (yes / no; no means those corners have bare shop windows)
3. "Some neighbouring awnings overlap by up to 10 cm where the wide awning is used. Allow that, so all five awning kinds stay?" (yes / no; no means only the three narrower flat awnings, and no L awning)

## 5. What the orchestrator does for each answer

- **All three yes.** The architect re-cuts H1b:
  - T1 and X1 quote Josh.
  - W1 gains LG (no L awning beside an L awning), with a failing fixture: two L awnings side by side.
  - Criterion 7's report keeps the overlap count, for J.
  - A line goes to H2's cut: R6 sits near its floor once escapes take shop columns.
  - Then the builder starts H1b. G2 is unchanged.
- **1 no.** H1b cannot meet R5 or R6. The architect brings Josh a choice between dropping R5 and R6 on the pipeline and changing rule 2. No builder is spawned.
- **2 no.** X2. Criterion 4's R4 counts mixed corners out, and M8's check forbids a wrap on a mixed corner. The builder starts.
- **3 no.** W2. The bay is the cell (5.00 m). `Shop_Cover_04` and `Shop_Cover_05` stay in the table but never fit, and the report says so. The builder starts.

## 6. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\h1bprobe`:
- `probe.ts`, with switches `W` (W1/W2), `X` (X1/X2), `REACH` (5 or 0.6), `LGUARD`, `ESC` (the H2 estimate), `SALT` and `V` (diagnostics). `ls.ts` counts the L buildings.
- The outputs: `out-W1-X1.txt`, `out-W2-X1.txt`, `out-W1-X2.txt`, `out-W2-X2.txt`, `out-REACH06.txt`, `out-W1-X1-LGUARD.txt`, `out-W1-X1-alt.txt`, `out-ESC0.4.txt`, `out-ESC0.5.txt`, `out-ESC1.txt` and the `-v` diagnostics.
- Not run: the outside cities.
