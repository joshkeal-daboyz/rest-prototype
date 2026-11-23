# 070 H2 and H2b pre-check: fire escapes, wall props and party walls on the pipeline's cells

**Josh's answer (21 Nov 2026, in chat).** Asked the seven questions as recommended (1: an escape bay keeps its glass but loses its awning and signs (EP); 2: extra escapes on quiet sides, not counted in R7 (EX); 3: no escape whose ladder comes down among parked cars (ET); 4: quiet escapes may face each other across a lane, 0.78 m apart (RQ, no pair-drop rule); 5: door corners get no canopy (WP3); 6: a one-storey party wall over style 2 and 3 roofs takes only the painted board, and `Pipe_Present_01` is never used (PW3); 7: `BLANK_RUN_MAX_M` 2.1), he answered: "Yes, 2.1m". The escape share stays at 0.4.

21 Nov 2026, pipeline-designer, on `goal/city-style` at 9d173c5.

This is a sketch. A throwaway probe outside the repo imports the merged stages 1 to 7 read-only and runs them on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on).
- It lays H2's escapes, canopies and wall props, and H2b's party-wall faces and picks, by the re-cut's readings.
- For EP it uses a copy of H1b's `buildDressing` with one change: escape bays are plain. With no escapes, the copy gives the merged dressing piece for piece on all 20 runs.
- Escape sizes come from `dressing.test.ts`' fixture, the escape tables from `escapes.ts`, and the party kit's sizes from the converted GLB.

The escape salts are the ones the ticket names (`rand("escape", "col" | "rank", building id)`), so the escape choice may match the build. Wall-prop and party-pick salts are my own. Three more salts show how far the shares move. The builder's numbers are the record.

## 0. Two premises the measurements change

- **"Watch 6 x 6 seed 3 one-way off" is out of date.** That came from H1b's probe hash. On the merged dressing, that run's R6 is 0.578 before escapes and 0.497 after them at 0.4. **The lowest run is 6 x 6 seed 3 one-way on:** 0.548 before escapes, 0.474 at 0.4 and 0.455 at 0.5.
- **"A one-storey step may fit nothing" (PW3) does not happen.** The painted board (2.028 m) fits on every face, including the tightest one (2.256 m above the style 2 and 3 roofs). There are 0 faces where nothing fits. What a tight face loses is the windows, not every option.

## 1. What holds, and what needs Josh

**Everything holds on 20 of 20 runs at the 0.4 share.** R4, R5, R6, the ATM share, R7, `escapeShort`, `escapeCheck`, the neighbour rule, the caps and the reach all pass. Seven readings add or change a rule, so they still need Josh's word: EP, EX, ET, RQ, WP3, PW3 and PW4 (PW4 needs a number).

| Check (floor) | H1b, no escapes | Escapes at 0.4 (ES) | Escapes at 0.5 (not used) |
| --- | --- | --- | --- |
| R4 (1) | 1.000 | 1.000 | 1.000 |
| R5 (0.55) | 0.689 to 0.737 | 0.596 to 0.639 | 0.570 to 0.624 |
| R6 (0.45) | 0.548 to 0.603 | **0.474** to 0.532 | **0.455** to 0.516 |
| R6, lowest over 4 hashes | | 0.469 to 0.478 | **0.450** to 0.461 |
| ATM (0.15) | 0.249 to 0.307 | unchanged | unchanged |
| R7 (0.4 at ES) | | 0.400 to 0.403 | 0.500 to 0.502 |
| `escapeShort` | | 0 on every run | 0 on every run |
| Runs passing | 20 | 20 | 20 (one hash sits exactly on 0.450) |

**At 0.4, R6 has 0.019 to 0.028 to spare.** At 0.5 one hash lands exactly on 0.450, so the ladder's share would be a coin toss. R6's floor is not touched in any option here.

## 2. The questions, measured

**Q1. EP, R5 to R7.** Per run at 0.4:
- **Street buildings:** 231 to 279 qualify; 220 to 268 can host; the target is 93 to 112, and all of it is placed.
- **R5 and R6:** each falls about 0.09 and 0.075 from H1b. The lowest R6 is 0.474 (6 x 6 seed 3 on); seed 3 off is 0.497.
- **The dressing changes only on escape buildings.** Everywhere else it equals H1b's piece for piece, on all 20 runs.
- **The ATM share does not move,** since an ATM stands beside a door, never on an escape column.

**Q2. EQ and EH.**
- **Qualifying:** 5,161 street buildings (20 runs) by cells. The count by non-blind columns is the same, because no qualifying street building has a blind column.
- **No host:** 164 (2 to 18 a run), each because its only mid column is the door. None has no mid column at all.
- **`escapeShort`** is 0 on every run, at 0.4 and at 0.5, on all four hashes.

**Q3. The escapes as laid (EF, EW).**
- **Pack or code-drawn:** every escape is a pack escape (0 code-drawn).
- **F2's 3 m frame makes every scale exactly 1.000.** Deck, joint and ladder errors are 0.
- **Fit:** the span is 4.832 m against a column 5.000 to 5.281 m wide (at least 0.168 m to spare).
- **The drop ladder** runs from the walk up to the pack ladder's foot, at most 3.096 m.
- **Lowest first-piece base:** 2.658 m (style 2), 0.34 m under the first floor. No deck is out of `ESCAPE_DECK_TOL_M`.
- **A look for J, not a rule** (bounds only, the tile city's own placement rule): the first piece's bounds meet its column's shop ground piece's bounds on 1,568 pieces, by up to 0.43 m (`Shop_02`, `_04`, `_06` fascias). They meet the shop glass on 328 pieces, by up to 0.084 m. They meet a neighbour's awning on 24 pieces, by up to 0.068 m.

**Q4. The cap.** An escape weighs at most 3. With glass, canopies and wall props, the fullest column holds 6, exactly `DRESS_PER_BAY_MAX`. Nothing is turned away (0 on every run and hash).

**Q5. EX and ET.**
- **Quiet sites:** 168 to 245 a run; 165 to 232 can host; 68 to 98 quiet escapes placed (at 0.5: 84 to 123).
- **What a quiet escape faces:** a court's apron 1,235, a lane 485. None faces a drive, walk or green.
- **ET removes 453 host columns and 162 sites.** Without ET, 80 quiet escapes (about 4 a city) would face a stalls cell.
- **The two passes can never make neighbours.** No row mixes street and quiet buildings (0 of 9,657 row joints), and 0 neighbour pairs appear in any run or hash.

**Q6. RQ: reach past the front cell edge, against `CELL_M` 5.**

| Piece | Worst reach | Over |
| --- | --- | --- |
| Escape | 2.111 m | street, apron, lane |
| Door canopy (`Cover_01`) | 1.529 m | street, apron, lane |
| Air-conditioner | 1.002 m | every use, stalls included |
| Planter | 0.721 m | every use |

All are within 5 m. **Escapes facing each other across a lane: 24 pairs in 20 runs (0 to 3 a run).** Each stands 2.111 m into a 5 m lane, which leaves 0.78 m between the two decks.

**Q7. Wall props (WP1 to WP3), per run.**
- **Canopies:** 325 to 440, over 685 to 885 doors.
- **Door corners left bare (WP3):** 118 to 184 (3,023 in all).
- **Upper-wall props:** 541 to 710 air-conditioners and 362 to 487 planters. 28 to 55 buildings reach `WALL_PROPS_PER_BLOCK`.
- **Turned away by the caps:** 0. **Off their column's face:** 0.

**Q8. Party-wall faces (PW1).**
- **Per run:** 462 to 592 faces (10,324 in all): 306 to 417 one-storey steps and 131 to 202 two-storey steps.
- **Where:** row joints 9,657 (L legs included); a blind cell's side 667. Partners' backs: 0, so M4c holds.
- **Every row joint steps:** 9,657 of 9,657 neighbour pairs differ in storeys, so criterion 2's "each run has faces" holds.
- **U1 blind fronts left undressed:** 16 to 48 a run (684 in all).
- **No built cell across a side that is not open:** 0.

**Q9. Room (PW3).** Measured from the GLB: board 4.193 x 2.028 x 0.118; `Window_01` 1.303 x 2.313 x 0.370; `Pipe_Present_01` 4.459 x 7.046 x 0.498; `_03` 2.828 x 4.243 x 0.498; `_02` 4.074 x 6.911 x **3.171 deep** (confirmed, never used).

| Lower roof | Its height | Room, one-storey step | Room, two-storey step |
| --- | --- | --- | --- |
| `Roof_01` | 0.500 | 2.500: board, windows | 5.500: + `Pipe_03` |
| `Roof_02`, `_03` | 0.744 | 2.256: **board only** | 5.256: + `Pipe_03` |

- **Pipes:** `Pipe_03` fits only over a two-storey step. **`Pipe_01` (7.05 m) fits nowhere,** because a step is at most two storeys (R2).
- **Windows** fit on 5,504 storey faces and not on 6,786.
- **Nothing fits: 0 faces.**

**Q10. Wall plane (PW2).** Trim past the side planes, measured from the GLB:
- **Style 1:** no trim past its side planes.
- **Style 2:** 0.085 m, at the face ends and on a 0.1 m strip at mid-face (2.4 to 2.5 m along), in the top 0.46 m of each storey.
- **Style 3:** 0.14 m, only past the face's ends (outside its 5 m).
- **Every kit piece is deeper than 0.085 m** (board 0.118, window 0.370, pipe 0.498). So style 2's strip sits inside the piece's thickness and never shows in front of it. PW2 holds as written.

**Q11. Bare stretch (PW4).**

| Option on a 5 m face | Widest bare stretch |
| --- | --- |
| Board, centred | 0.40 m |
| Two windows at the quarter points | 1.20 m (between them) |
| Two windows at the apartment pitch | 1.03 m (at the ends) |
| `Pipe_03`, centred | 1.09 m |
| *A board at one end (the ticket's failing fixture)* | *0.81 m: can never fail above 0.81* |
| *Two windows pushed to one end* | *2.39 m* |
| *A pipe at one end* | *2.17 m* |

- **The apartment fronts' window pitch** (from the GLB): style 1 1.614 m, style 2 1.637 m, style 3 1.184 m. 067 A's rule (pitch plus 0.5) gives 2.11, 2.14 and 1.68 m.
- **3 m holds with 1.8 m to spare, but it barely tests anything.** Nothing misplaced fails it, and the ticket's board fixture cannot fail at any limit.
- **2.1 m passes every placement** (worst 1.20 m), and catches a pipe or a pair of windows pushed to one end.

**Q12. Running rule (PW5).** It removes an option on 56 to 93 faces a run (1,369 in all). It never leaves a face with none, since the board has seven keys. Picks in all: boards 8,772, window pairs 2,084, pipes 1,434. (I read rule 8's table as three options: board, windows, pipe. Seven board options instead would only give more boards.)

**Q13. Totals per run.**
- **H2's wall pieces:** 1,751 to 2,217, of which 470 to 619 are escape pieces.
- **Party-wall pieces:** 637 to 823.
- **With H1b's dressing:** 3,380 to 4,121, and 4,021 to 4,924 with the party walls too, against `DRESS_MAX` 6,000 (82 % at most). C1 does not apply the cap; this is for J's draw calls.

## 3. Recommendation and its cost

- **EP, EX, ET, RQ and WP3: yes, as written.** Everything holds at 0.4. EP is `dressBlock`'s own rule, and it moves R5 and R6 but no floor.
- **Keep ES at 0.4.** Never use the ladder's 0.5 for the pipeline: R6 then lands on its floor.
- **RQ's facing pairs:** allow them, and leave the 24 pairs (about 1 a city) to J's screenshots. If Josh says no, the quiet pass drops the worse-ranked escape of each pair. That costs about 1 quiet escape a city and moves no check (quiet escapes are not in R7).
- **PW3: yes.** It never fails. Two consequences go in the ticket's words: windows never stand on a one-storey step above a style 2 or 3 roof, and `Pipe_Present_01` is in the table but never fits (the report says so; J's R12 audit should expect it unused).
- **PW4: `BLANK_RUN_MAX_M` = 2.1 m** (067 A's pitch plus 0.5, rounded down). The architect should reword criterion 4's fixture: "two windows pushed to one end (2.39 m bare)" in place of "a board moved to one end", which cannot fail.
- **No approved number, merged section or digest pin moves** beyond what the ticket already expects (H1b's facades pins are replaced, as criterion 8 says). Changing ES to 0.5, or lowering R6, would be Josh's change, and I do not recommend either.

## 4. Questions for Josh

1. "Where a building gets a fire escape, the shop under it keeps its window but loses its awning and sign, as on the tile city. Signs drop from about 57 % of shops to about 50 % (the floor is 45 %). OK?" (yes / no; **recommended yes**)
2. "Add fire escapes on quiet sides too (lanes and courtyards), about 86 a city, not counted in the 40 %?" (yes / no; **recommended yes**)
3. "No fire escape where its ladder would come down among parked cars (about 4 a city otherwise)?" (yes / no; **recommended yes**)
4. "Escapes stand out up to 2.1 m over a 5 m lane or courtyard. About once a city, two face each other across a lane, 0.8 m apart. Allow that?" (yes / no; **recommended yes**; no drops one of each pair)
5. "Corner doors get no door canopy (about 150 a city stay bare)?" (yes / no; **recommended yes**)
6. "On a party wall one storey above a lower roof, two of the three roof styles leave room only for a painted board, not windows, and the tall pipe never fits anywhere. OK?" (yes / no; **recommended yes**)
7. "Widest bare stretch allowed on a dressed party wall, in metres?" (a number; **recommended 2.1**; the grammar's provisional 3 also holds but catches almost nothing)

## 5. What the orchestrator does for each answer

- **All yes, and 2.1.** The architect re-cuts H2 and H2b:
  - EP, EX, ET, RQ, WP3 and PW3 quote Josh.
  - ES stays at 0.4. The R6 note names 6 x 6 seed 3 one-way on (0.474), not seed 3 off.
  - H2b criterion 1 types `BLANK_RUN_MAX_M` 2.1, Decided, and takes the window's and pipes' bounds from section 2, Q9.
  - Criterion 4's stretch fixture becomes two windows pushed to one end.
  - Criterion 7's report says `Pipe_Present_01` never fits.

  Then H2's builder starts. H2b's starts after H2 merges.
- **1 no.** H2 cannot keep the tile city's look. The architect brings Josh a choice: escapes standing over awnings and signs (not measured here: a look J would have to judge), or a different host rule, which needs a new pre-check. No builder is spawned.
- **2 no.** The quiet pass is dropped: H2 has street escapes only, and rule 9's quiet-row "fire escapes" is left open. The builder starts.
- **3 no.** ET is dropped: about 4 escapes a city face parked cars. The builder starts.
- **4 no.** The architect adds to EX: after the quiet choice, of two escapes facing across one lane cell, the worse-ranked is removed, with a failing fixture. The builder starts.
- **5 no.** A door corner's canopy needs a position on the piece that no table has. The architect sends `Apartment_Door_Corner_01` and `_02` to the pipeline-designer to measure, before H2's builder starts.
- **6 no.** H2b's kit needs another piece, or a lower window. That is a kit question: the asset-scout or the GLB. H2 is not held up.
- **7, another number.** Any value of 1.2 m or more passes every placement. Below 1.2, two windows at the quarter points fail, and the windows would need closer spacing (the architect words it). H2b types Josh's number. H2 is not held up.

## 6. The probe

`C:\Users\Josh\AppData\Local\Temp\claude\3ca4b4f362dfc649\d782fc25-eedf-4134-b311-f9207d8cd04d\scratchpad\h2probe`:
- **`probe.ts`**, with switches `SHARE`, `QSHARE`, `EX`, `ET`, `EP`, `SALT` and `V`.
- **`dress2.ts`**: H1b's `buildDressing` copied, plus EP. It is made by `mkdress.cjs`.
- **`glb.ts`**: the GLB's bounds, side trim and window pitch.
- **`adj.ts`**: row joints, mixed frontage and equal storeys.
- **`rng.cjs`**: the per-run ranges.
- **The outputs:** `out-0.4.txt`, `out-0.5.txt`, `out-0.4-salt{a,b,c}.txt`, `out-0.5-salt{a,b,c}.txt`, `out-0.4-ET0.txt` and `out-glb.txt`.
- **Not run:** the outside cities.
