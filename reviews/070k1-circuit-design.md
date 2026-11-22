ticket: 070k1-circuit-design
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
K1 asks for a design note (`docs/design/070-K1-circuit.md`) with stage 6's circuit rules, each with an id, the layer fields it reads, its status, K2's check and a failing case, covering (a) to (i). It also asks for one off-ladder worked map on 6 x 6 seed 1, laid by those rules, with a place table. K1a lets the 3D town tests accept that map by adding exactly one pin and one named pool excess, and loosening nothing.

## Does the branch do it?
Reviewed the K1 work 54d4ddc..eb77c50 and the merge tip 5e061dc. The merge changes none of K1's files.

1. **It loads.** `npx vitest run --maxWorkers=2 src/core/load.test.ts src/core/check.test.ts`: 2 files, 120 tests passed. The map is a plain draft-5 `Puzzle` with no new field.
2. **Check block replays.** `npm run check puzzles/city-two-ways-round.json`: PASS. The solution is complete in 2 clicks. The trap "mend the spark you can see" (`repair:l_x`) holds its `expect` (readable `y`, lit homes and infirmary, not complete), and its recovery (`undo`, `sw`, `repair:l_e2`) wins. I traced it by hand too:
   - On sw south, mending `l_x` lights the infirmary and stops at `y`.
   - On sw north, mending `l_e2` lights the shrine and then the infirmary, and stops at `x`.
   - Load is 2 of 3 throughout.
3. **Solvable.** `npm run analyze` gives: solvable, min clicks 2, 1 winning order, 1 winning configuration, no fuse blows, 2 of 5 dead-end states, and `repair:l_x` is the only dead-end first move. The note's Expected numbers match all of this.
4. **Rules note complete.**
   - Sections (a) to (i) are all there as CK1 to CK16. Each rule has Reads, Status, "K2 checks" and "Fails".
   - Section 2 restates the old slot rule with its numbers: 12.5 / 0.75 / 2.5 m, `pavement` only, `FURN_KEEP_M` 1.5 m, and the tilecity.ts lines at b42b65f.
   - New fields are flagged "for the architect": CK15's `city`, `district`, `place`, `run` and `span`, and the sketched `CityCircuitLayer`. It notes that the name `CitySpan` is already taken.
   - Section (i) gives the questions with recommendations and the pre-check list.
5. **Map follows the rules.** I recomputed the place table from the stated origin (245, 210) m and `CELL_M` 5.
   - Every `pos` equals the metres in the table.
   - Plan geometry:
     - the crossing is 249.25 to 265.75 = 16.50 m;
     - the four corner spans are 6.75 x √2 = 9.55 m;
     - the drops are 4.25 (shrine), 4.57 (infirmary) and 4.63 (homes);
     - the run lengths add up: west side 70 m, north side 65 m, east side 75 m, south side 65 m.
   - Each drop's wall point is the centre of its column's front edge (CK9).
   - Every bend is a junction node and every drop branch is a junction (CK13). The switch is on a pole with 4 attachments (CK12, 3 or more). The landing on `z:7` that `l_e1` passes holds no node.
   - The pre-check (section 1) re-measured the places "within 0.003 m".
6. **No ruling moves.**
   - Josh's answers are quoted word for word in a card table at the top, and each rule's status names the card it rests on.
   - Q45, 071 Q12, 059 and the stage 9 rulings are quoted, not altered.
   - Section 9 lists the only ruling changes, and each comes with Josh's own words: card 5 lifts the 5.5 m road clearance for crossings, card 8 makes TR1c measure from the post, and the Sci-Fi City poles leave the ground mix.
   - The changes to the old slot rule (fixed last slot, even pitch, nudge instead of drop) are marked Proposed.
   - No pack key is chosen: the pole names appear only as 071's picks, and section 8 says so.
   - The brief's Decided rules are unchanged. `priority` is used as the schema's score-not-win field, and the win leaves the homes dark, which is allowed.
7. **R-8.** This one is the playtester's. The map has no `NN-` prefix, so it is off the ladder.
8. **Josh plays it.** Open by design: Josh is away from his PC. Noted here, not a must-fix.
9. **Gate green.** The main session ran it on 5e061dc: 4289 passed. The only `src/` changes are K1a's two test tables (eb77c50).

**K1a.**
- `townpin.test.ts`: one added line for `city-two-ways-round.json`, with both digests. Its comment names 56bdec6 and the map's commit 4c46da7, and says it is not on 2f7a0bf. The other entries are untouched.
- `town.test.ts`: `KNOWN_POOL_EXCESS` gains `"city-two-ways-round.json":2`. The comment names the two lamps (homes, shrine) and gives the cause as "no frontage slot in reach". The 18 existing entries are character-identical; only the closing brace moved to a new line.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, and no new dependency. Nothing is touched in `puzzles/locked/`, `SCHEMA.md`, `README.md`, the grammar or the style guide (checked with `git diff`).
- The `tickets/` edits on the branch are the lead-architect's commits recording Josh's answers. The designer's commit 73a7dbc touches only `docs/design/` and `puzzles/`.
- Risk for K2: CK14 says the district runs "kerb to far pavement", yet the feed must stand "outside the district". The worked map's feed is on `z:6`'s far pavement, at `pos` x 0.85, inside the origin box. Read through the sketched `CityPole.block`, where the feed's pole is on block:5:4, it is outside. Read by extent, it is inside. See Could improve 1.
- Two of the sketch's numbers disagree with the pre-check's record: 113 against 103 street lights, and an 18.50 m against 18.00 m longest along span. The pre-check names this, but the rules note does not.

## Must fix
none

## Could improve
1. `docs/design/070-K1-circuit.md` CK14 and CK12 (feed row): say what "outside the district" means in layer terms. I suggest a feed pole whose `block` is not one of the district's blocks, joined by exactly one span to a district block's pole. Without that, K2's check "each feed stands outside the district" contradicts the extent "kerb to far pavement", and the worked map's own feed is ambiguous.
   Also drop or explain "a pole on the far side of a corner span" in CK12. A corner span joins two sides of one block, so it never enters a district from outside. The section 6 row "end slots across a corner" has the same problem.
2. `docs/design/070-K1-circuit.md` CK10, CK4 and section 6: point to the pre-check's reading (CK10's "none stands" read as a skip, 103 lights on seed 1; longest along span 18.00 m on the pre-check's run). Then K2 is not handed two numbers for one rule.
3. `docs/design/070-K1-circuit.md` section 5, question 8: the original wording says "the palm and sci-fi poles (7.9 to 10.8 m) can" carry a crossing. The CK7 finding later in the note gives Sci-Fi City's attachment as 5.02 m. Add a one-line annotation saying the question text was superseded, as was done for question 4's reason.
4. Criterion 8 stays open until Josh plays the map. His verdict goes under **What it taught us** in `puzzles/city-two-ways-round.md`.
