ticket: 081-P2a-pilots
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
P2a puts schematic puzzles 01 to 16 onto 6 x 6 seed 1 (one-way on) as `puzzles/city/NN-slug.city.json`, each with a note. A pilot that plays the same with its capacities and ratings raised for scenery counts as "raised, not reworked": schematic ids, loads, parts and targets, its check block, equal analyzer numbers, and one What-changed line. 09 and 12 get fix (a), a re-lay, before fix (b). 15 is a rework under answer 4, and it keeps the element under test or says plainly where it cannot. Only `puzzles/city/` may change.

## Does the branch do it?
The diff against `origin/main` is 32 files, all new, all in `puzzles/city/`. It adds or rewrites no test cases (count 0).

- **Criterion 1 (16 files and notes).** Met. 01 to 16 each have a `.city.json` and a `.md`. All are on `{6, 6, seed 1, oneWay: true}`, none authors `pos`, and none has a field outside the city puzzle schema.
- **Criterion 2 (note contents).** Met in form. Every note has `from`, a District line, a Node/Type/Place table and a Line/From/Span-chain table. Each also has an intended read from the default camera, a What-changed section with old and new numbers, a check block, and an empty **What it taught us** as its last heading (checked in all 16). The note for 15, the rework, lists its changes item by item with the reason and cost of each. The check block is the departure; see below.
- **Criterion 3 (`npm run check puzzles/city/` passes; analyzer numbers in the notes).** Met. I ran `npm run check puzzles/city/` and got PASS on all 16 and P0, every trap's expect held, and every recovery won. I also ran my own script, outside the repo, over all 16. It converts each city file through `convertCityPuzzle` on `cityPlanFor`, then compares it with the schematic on four counts:
  - **Structure.** Node and line ids, types, loads, closed/selected/outputs, line endpoints, faults, parts and target are identical to the schematic for 01 to 14 and 16. The only differences are capacities and ratings, which match each note's What-changed line (for example 10 capacity 3 to 22; 12 capacity 4 to 14, `fb_1` 1 to 3, `fb_2` 2 to 10; 14 capacity 3 to 11, `fb_E` 3 to 10; 16 capacity 4 to 8, `fb_A` 3 to 5). In 15 the only additions are `j_w`, `j_e`, `l_w0` and `l_e0`, and only the endpoints of `l_inn`, `l_w`, `l_mill` and `l_e` change, as its note says.
  - **Start state.** The schematic and the conversion light the same file lamps, show the same readable faults, have the same brownout and the same blown fuses, in all 16.
  - **`analyzePuzzle` on both.** States, min clicks, winning orders, winning configs, dead states, dead first moves, blow-on-shortest-win and blow-anywhere are equal in all 16, all exhaustive. I checked the notes' tables for 03, 08, 10, 12, 14 and 16 against the output: 08 has 2 of 5 dead and `repair:l_porch`; 12 has 48 states, 8 dead and `fb_1` blowing anywhere; 14 has 24 states and blows `fb_W` / `fb_E`,`fb_W`; 16 has 4 of 9 dead and `repair:l_yard`.
  - **Each note's check block replayed on the schematic.** It passes for all 16.
- **09 and 12, fix (a).** Met. Both say plainly that a re-lay (09 on `block:3:0`, 12 on `block:6:11`) avoided the blow, and that (b) was not used. `fb_A` in 09 keeps rating 3, and `fb_2` in 12 opens at 2 of 10. Both play the same raised, so "raised, not reworked" is the right label.
- **15, the rework.** The element under test is "nearest feed carries it" on a ring between two feeds. It is kept: hop differences are unchanged (+1 on each side, odd end to end, so there are no ties). The analyzer numbers equal the schematic's, and all three wrong moves still brown out on the same feed. What is lost is the drawing's bait (the shrine drawn by the mill). The note says so plainly, gives wire lengths, and names the alternatives the designer tried, among them `block:7:5`, which keeps the bait but breaks step 1 of the read. That is exactly what answer 4 asks ("keeps ... where it can, and says plainly where it cannot"). The ticket's Josh-question rule covers a lost element under test in 09 and 12, not a lost bait in 15. So 15 is not blocked, but Josh should hear about it when he plays it (could-improve 1).
- **Criterion 4 (Josh plays).** Browser, Josh's job; not judged here.

**The check-block departure.** I confirmed that none of `puzzles/01-...md` to `16-...md` contains a ```` ```check ```` block, so "copied from the schematic" cannot be done literally. The designer wrote each block as the schematic note's read and traps made executable. I verified that each block replays with the same result on the schematic as on the city form. That gives the outcome the rule protects ("its check block is the schematic's ... and gives the same outcomes"), and it is what lets P1's sweep hold these files. Each note states the departure in its Check section. I judge it correct, not a must-fix. The ticket and `puzzles/SCHEMA.md` line 206 should be worded for it (could-improve 2).

## Rule conflicts and risks
- No hard rule is touched. Only `puzzles/city/` changes; `src/grid/`, `src/night/`, schematics, `puzzles/locked/` and dependencies are untouched; no tests are added.
- GDD Decided rules hold as played. The start, the traps and the analyzer equal the schematic's on `src/grid/` unchanged, and the scenery lamps are leaves (S1).
- **Hidden blow culprit (12, 14).** The grid's `fuse:blown` culprit is the largest newly fed lamp, and on these maps that can be a hidden scenery lamp. 14's note shows it for its trap (`l_r3~h2~s`, load 6, where the schematic's culprit is the mill). I did not check 12's culprit myself. Nothing draws the culprit in 3D today, so this does not affect play now. It belongs to the architect, before any culprit or shock path is drawn.
- **Cut lamp-post lead draws on the wrong wire.** This is a conversion/renderer matter (`converted.cuts` names the post's span). 16 avoids it by a re-lay (f2 now cuts the yard's drop), and 08's cut is a drop. No pilot here cuts a lead; it is a risk for P2b to P2d.
- **Shared district.** By my count 12 of the 16 are on `block:0:0` (01 to 08, 10, 11, 13, 16), not 11 as reported. It is allowed (CK8: one job live at a time), but Josh will see the same corner over and over.
- **Large raises.** 10 goes 3 to 22 and 12 goes 4 to 14, so the HUD reads "21 of 22" and "14 of 14". This is Josh's "Raise", and the arithmetic decides the same way, but until S4 lights scenery windows the bars include loads the player cannot see. 12's note says so.

## Must fix
none

## Could improve
1. When the main session shows Josh 15, it should name the lost bait. A card could offer "keep this lay" against "`block:7:5`, bait kept but step 1 of the read changes". The note already has the wording (`puzzles/city/15-meet-in-the-middle.md`, "Where the element cannot be kept as it was").
2. The architect should reword P2a criterion 2 ("the check block copied from the schematic") and `puzzles/SCHEMA.md` line 206 for the case where a schematic note has no block: the city note carries a new one that replays the same on the schematic and the city form. This is the architect's file, not this branch's.
3. In `puzzles/city/15-meet-in-the-middle.md`, the loads list calls the first trap "the shrine is drawn by the mill", but the check block calls it "the shrine on North". Use one name.
4. In 15's Expected numbers, "the reworked schematic, with `j_w` and `j_e`, gives the same numbers" refers to a file that is not on the branch. Say it was a scratch run, or drop the clause; the city-form column already shows the claim.
5. For P2b onward, spread districts off `block:0:0` where the fit allows (`--blocks`), so each pilot does not open on the same corner.
