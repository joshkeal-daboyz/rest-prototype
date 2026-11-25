ticket: 081-P0r-two-ways-round-raised
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
P0's city note (`puzzles/city/city-two-ways-round.md`) re-opened to say what S1's scenery changed: capacity 3 to 25 with Josh's card words, the 22 scenery buildings by where they hang and how many stand across a district street, and the start's and win's loads. The check block stays the schematic's, the analyzer's numbers are stated equal to the schematic's, and **What it taught us** is left alone. One file, no tests.

## Does the branch do it?
The branch's one commit (`ec567fa`) touches only `puzzles/city/city-two-ways-round.md`: 51 lines added, 5 changed. I re-derived every number with a throwaway tsx script outside the repo. It ran the same build as `convert.test.ts`: 6 x 6 seed 1, one-way on, stages streets to facades. It then called `convertCityPuzzle` on the committed `.city.json` (capacity 25), replayed the states on `src/grid/`, and ran `analyzePuzzle` on both the schematic and the conversion.

- **Criterion 1, What changed and why.**
  - The section is there, with one item: capacity 3 to 25. It quotes Josh's "Yes, they add load", "Raise (Recommended)", "Whole" and "Dark", plus "Drop on a live pole (Recommended)" and his chat line.
  - The hang table matches S1's conversion exactly. Re-derived:

    | Lamp | Buildings | District / across |
    | --- | --- | --- |
    | `l_n~h1~s` | 10 | 6 / 4 (`block:6:3/a` x 2, `block:5:4/built`, `block:7:5`) |
    | `l_feed~h2~s` | 1 | 1 / 0 |
    | `j_sh~s` | 1 | 0 / 1 (`block:7:7`) |
    | `l_e2~h2~s` | 5 | 3 / 2 (`block:7:7`, `block:6:8/b`) |
    | `j_inf~s` | 1 | 0 / 1 (`block:6:8/b`) |
    | `l_x~h1~s` | 4 | 2 / 2 (`block:5:7` x 2) |

    That is 22 in all: 19 on carriers, 3 on node poles, 12 in the district and 10 across a street. The feed's pole has exactly one drop, `block:5:4/built|outer|+x|48,47`, and it is not in `scenery`. There are no `j_h~s` or `l_s~h*~s` lamps, as the note says.
  - The loads on `src/grid/` match the note:
    - start: 2 (homes plus `l_feed~h2~s`), `x` readable;
    - `sw` thrown: 13 (shrine, `l_n` 10, `j_sh` 1, `sw`'s 1), `y` readable;
    - win: 24 (shrine, infirmary and all six hidden lamps);
    - trap (repair `l_x` first): 13 (homes and infirmary lit, `y` readable).

    The fifth state, trap then `sw`, is also 13. So the note's "none of the five states goes over 25" holds.
  - The "Lit when" column agrees with which hidden lamps are lit in each state.
- **Criterion 2, check block and analyzer.**
  - The check block is byte-for-byte the base's. The diff does not touch it, and it is the schematic's block.
  - The *Expected numbers* table matches the analyzer exactly on both puzzles: 5 states, exhaustive; solvable; min clicks 2 (`sw`, `repair:l_e2`); 1 winning order and 1 configuration; 1 wire; no fuses blow; dead-end states 2 of 5 (40.0%); dead first move `repair:l_x`. The feed at the win reads 2 of 3 on the schematic and 24 of 25 on the conversion.
  - The table is stated equal to the schematic's but for the load, which is what the criterion asks. S1's rewritten case in `src/city/circuit/convert.test.ts` ("plays the same, raised") holds it in the suite.
- **Criterion 3, What it taught us.** The heading is empty, as it was on the base. The designer added nothing.

The branch adds and changes no test files, so I had nothing to run. The test count is 0, as the ticket says.

## Rule conflicts and risks
- None found. Only the ticket's one file changes. `puzzles/locked/` is not touched, and no Decided rule or dependency is involved.
- The last line of the change says the HUD reads "using 24 of 25" and that the scenery windows stay dark until S4. That is consistent with S1's numbers and the HUD's "using X of Y" wording (`src/ui/frame.test.ts`). I did not check it in a browser.

## Must fix
none

## Could improve
1. *Expected numbers* says "Parts, salvage, trips and walking are the schematic note's." That is accurate, but those numbers were not re-run on the conversion. If anyone later compares the two notes line by line, a short "(not re-run)" would say so.
