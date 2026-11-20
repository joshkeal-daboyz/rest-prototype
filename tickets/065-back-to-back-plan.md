# 065 · Back to back, the plan: ring 2, openings, lane rows, the face rule, quiet rows and corner columns at openings (C1)

**Superseded by ticket 070** (`tickets/070-city-pipeline.md`) on Josh's approval of 070 (19 Nov 2026, in chat). Not to be built as written. Where its content went (070's "What happens to the other tickets"): 065 A's ring 2, lane rows, walk-throughs, M4b and M5 to 070 C1; drives through both rings, units, P2 and Q-065-1 to C2; the parts rule to B; the kerb at openings (criterion 10) to D2. 065 B's `openSides` and M3 to C1; corner and blind columns, M6 and R9 to F2; quiet ground rows and M8 to H1; R2 on quiet rows to F1.

owner: renderer (src/render3d/, docs/city-style-guide.md)
status: superseded by 070 (Josh's approval of 070, 19 Nov 2026). Was: open. Cut from 063 section C on 19 Nov 2026, re-cut on `docs/city-grammar.md` (rules 3 to 7 and 9). It is covered by Josh's goal waiver; the main session records the start.
branch: `ticket/065a-rings-openings`, `ticket/065b-faces-columns`
size: **bigger than one builder day.** Two sections, A then B, each about a day.

## Josh's words (19 Nov 2026, in chat)
> "Notice how the backs of buildings are also butted up against the backs of other buildings Also intentional. Without this you end up with featurless walls."

> "I also see a lot of this going on. There is white space behind the buildings. To form the backs of buildings you can re use the stacked build blocks of the same type."

> "This doesn't mean the buildings need to be the same height. They can have gaps but those caps must be intentional (alley ways... etc)"

> "If you're going to have an inlet to areas between buildings it needs to be paved"

> On the grammar's Q1, corner pieces wherever two open sides meet: "Yes, allow it (Recommended)". `docs/city-grammar.md` rule 7 also records his earlier wording, "Yes, any corner".

> On Q2 (backs are other buildings), Q4 (retire the gated passage) and Q5 (keep 0.15 stalls a home and every threshold; measure here) he gave no answer of his own. Each takes the grammar's recommendation under his goal waiver: "I don't want to constantly approve all of these improvments." Q2 also rests on his words "butted up against the backs of other buildings".

Law that holds:
- 19.4, Decided: "Grass and pavement should fill the blank areas."
- Chapter 7, Decided: "Corner buildings should only be placed on corners." This is widened by Q1 to any two adjacent open sides.
- 16.3, Decided: "the shop corners are intended to be base units for the larger structures."

## The rules this ticket lays (grammar)
- **Rule 3, the face rule.** A built cell has 0, 1 or 2 adjacent open sides. 0 is a blind column, 1 a mid column, 2 adjacent a corner column. Opposite open sides, or 3 or 4, are a layout error.
- **Rule 4, back to back.**
  - A court block's ring 2 is buildings of their own, facing in. They stand column for column behind ring 1, with the same floor count as the partner in front.
  - The four corners of ring 2 are blind, and take the style, colourway and floors of the ring-1 corner building they stand behind.
  - No part has a short side of 3 to 5 cells.
- **Rule 5, the interior.** It starts at ring 3, filled as 19.4 fills it. Every interior touches an opening.
- **Rule 6, openings.** A gap exists only as a recorded opening of whole cells: a lane, a court drive (2 cells, through both rings), a frontage lot, a plaza, a park, or a walk-through. A walk-through is 1 cell, through both rings, and only for an interior with no drive and no lane. A row stretch is never 1 cell.
- **Rule 7, corners.** Corner pieces stand wherever two open sides meet. The turn is forced, because the second windowed face is the piece's −x.
  - The ground piece is a shop corner where a street or park edge is one of the two open sides.
  - Otherwise it is the residents' corner door, `Apartment_Door_Corner_01` or `_02`.
- **Rule 9, frontage kinds.**
  - Street frontages (street, park edge, plaza) keep 16.5.
  - Quiet frontages (lane, drive, walk-through, court) get one residents' door per building and windowed floor pieces elsewhere, with no shop.
  - The alley side of a part is a quiet frontage with a row of its own.

## Checks this ticket builds (grammar)
- **Section A:** M4 (pairs: every ring-1 column backed, partner floor counts equal, no part 3 to 5 deep). The colourway clause of M4 is 066's, where colourways are assigned. Also M5 (openings), in full apart from the passage line, which 064 built.
- **Section B:** M3 (the face rule), M6 extended to every corner column (E1's criterion 25 on the whole city), and M8 (quiet rows) on the stack pieces. M8's dressing half is 066's.

## Section A. Rings, openings, lanes (pure; tilecity.ts and the packer's inputs)
1. [ ] **Ring 2 runs.** `tileCity` lays, for every court block part, ring-2 terrace runs facing the interior on the lattice of 064, as `TerraceRun`s in `town.terraces`. So `packTown`, `frontageMetrics` and `applyModels` see them as rows.
   - `TileCity.quietRuns` lists the runs on quiet frontages (ring 2, lane rows).
   - A ring-2 run stands column for column behind a ring-1 run, and breaks only at a recorded opening.
   - **Laying them.** Through `terraceBlockRows` with inward-facing sides, if its sides allow that. If they do not, an `inward` option is authorised in town.ts (default off, so `townpin.test.ts` holds), or `tilecity.ts` builds the runs itself. The builder says which.
2. [ ] **The four ring-2 corners** are blind cells. Each carries the ring-1 corner building's style, floor count and colourway key; 066 draws them.
3. [ ] **The drive runs through both rings.** A court's drive is 2 cells wide through rings 1 and 2, its stalls and aisle at rings 3 to 5, and `TileCourt` is updated.
   - G4 holds with its code unchanged.
   - Ring 2's `APRON_STRIP` retires, and G3 now credits rings 1 and 2 as buildings, with its numbers unchanged.
   - A court that no longer fits keeps 056's frontage lot, within `CITY_FRONT_LOT_BLOCKS_MAX`.
4. [ ] **Parts are 2, or 6 and more.** An alley cuts a block only where both parts have a short side of at least 6 cells. Strips (2 cells) are 067's. A half park leaves a built part of at least 6 cells, or the block takes no half park.
   - The builder reports alleys and parks before and after, on the default city and seeds 1 to 10.
   - If V3 or V4 cannot hold with these rules, the builder stops and reports. That points to 067's strips, never to a lower floor.
5. [ ] **Lane rows.** The side of a part beside an alley is a quiet row of its own, facing the lane: rule 9, which replaces 19.6's "rear".
6. [ ] **Walk-through.** An interior with no drive and no lane gets one 1-cell walk-through through both rings, by hash, paved in 066 (063 H's paving).
7. [ ] **M4** (new `pairs(city, packed)` in `src/render3d/backs.ts`, pure). On the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4:
   - every ring-1 column of a court block has a built cell behind it or a recorded opening;
   - each ring-2 building has its partner's floor count;
   - no part has a short side of 3 to 5 cells.
   - **Failing fixtures:** today's city, whose ring 2 is apron everywhere; and a 9-cell side cut by an alley into two parts of 4.
8. [ ] **M5** (new `openings(city, packed)` in `backs.ts`). On the same cities:
   - every cell of rings 1 and 2 is built or belongs to a recorded opening of rule 6's table;
   - every interior touches an opening;
   - no row stretch is 1 cell long.
   - **Failing fixture:** a city with one opening's record removed. It fails at that opening, because an opening has to be laid to count.
9. [ ] **Units and parking.** Units count every built column of a quiet or street row, on 5.0 m cells.
   - P1 to P6 hold with every threshold and `PARK_PER_HOME` 0.15 (Q5).
   - The builder reports homes, stalls wanted and stalls laid on the default city and seeds 1 to 5. The grammar's estimate was about 860 homes, about 129 stalls wanted, and 108 from two courts a block.
   - If P2 cannot hold, the builder stops and reports with the numbers. It goes to Josh (the grammar's fallback is `LOTS_PER_BLOCK_MAX` 3 on blocks of 10 cells or more each way, his word), never a wider band.
10. [ ] **The kerb at openings** (the grammar's two additions to 063 F; `kerbline.ts`). The line has no return at a plaza, park edge or walk-through. Each return ends within 0.05 m of the corner column's wall plane at the building line. F's own fixtures still fail as before.

## Section B. The face rule, quiet rows, corner columns (pure; stacks and packer)
11. [ ] **Open sides per cell.** New `openSides(city, packed)` (in `backs.ts`) gives each built cell its open sides from the cell occupancy: pavement, lane, drive, court, apron, green, plaza or park edge is open, and a built cell is not.
12. [ ] **Corner columns wherever two open sides meet.** The packer (terrace.ts) gives a run a corner column at either end where the end column has two adjacent open sides: a block corner, beside a drive, lane mouth, walk-through, frontage lot or plaza, or at a court's inner corner where one is open.
    - It uses the style's corner pieces from the ground to the roof, turned by E1's measured −x open side.
    - Its ground piece is a shop corner if a street or park edge is one of the two open sides, else `Apartment_Door_Corner_01` or `_02` (added to the apartment styles' `base.corner` choices for quiet corners only).
13. [ ] **Blind columns.** A cell with no open side takes floor pieces from the ground up (any style's mid floor) and a roof, with no door: the ring-2 corners and any other.
14. [ ] **Quiet ground rows.** `assembleStack(..., { ground: "quiet" })` (stacks.ts; the default is "street"). Each building has one residents' door (`DOORS`), and the other ground columns take the style's floor piece. There is no shop, double shop or shop corner, except as rule 7 allows.
15. [ ] **M3** (new `faceRule(city, packed)` in `backs.ts`). On the default city, seeds 1 to 10 and 6 x 4 seeds 1 to 3:
    - no cell has opposite open sides or more than two;
    - every column's kind (blind, mid, corner) and yaw match its open sides.
    - **Failing fixtures:** today's city, where every mid column is open to the street and to the ring-2 apron, and a row end at a passage is open on three sides.
16. [ ] **M6 on every corner column.** E1's criterion 25 runs over every corner column of the city, at block corners and openings and inside courts:
    - its two measured window faces lie on its two open sides;
    - no corner piece stands in a mid or blind column;
    - the roof corner turns with its column.
    - **Failing fixture:** a corner column turned by "+x".
17. [ ] **M8 on pieces.** No shop, shop glass, double shop or shop corner stands on a quiet frontage, except a corner whose other open side is a street, and every quiet building has exactly one door.
    - **Failing fixture:** a ring-2 building with a shop piece.
18. [ ] **R9 takes Josh's words** (`citymetrics.ts`, an authorised exception: R9's definition of a true corner only). A true corner is any column with two adjacent open sides. R9 still fails on a corner piece anywhere else, and its threshold is unchanged.
19. [ ] **R checks by frontage kind.**
    - The tile city's `evaluateCity` is given the street rows only, for R1 and R3 to R13, so no street bay counted today stops being counted.
    - A second call over the quiet rows reads R2, which holds.
    - R7 keeps its guaranteed share over the street-facing qualifying blocks.
    - R8 is reported over all buildings.
    - No threshold changes.
20. [ ] **Everything else holds.** G1 (now on lane and court faces too, its numbers unchanged), G2 to G4, V1 to V4, M1 (064), the sills, `escapeCheck` and E2's check. `townpin.test.ts` and `packpin.test.ts` pass untouched, because every new option defaults off.

**Both sections:**
21. [ ] **Guide.**
    - 19.4 (ring 2 is buildings, `APRON_STRIP` retires) and 19.6 (alley sides are quiet rows; a part's short side is 2 or 6 and more).
    - Chapter 7 and R9 take Josh's Q1 words.
    - 18.2 gets 5.0 m cells. A new 19.9 holds the face rule and frontage kinds.
    - Each line marks Decided-with-his-words or adopted-under-the-waiver. Numbers rows and drift checks are updated, and no existing check is edited.
22. [ ] (Builder) Runs only `npx vitest run --maxWorkers=2 src/render3d/` and one `npx tsc --noEmit`. (Main session) `npm run gate` green with more tests, `npm run playtest` with no change, the diff only in Files, and `git ls-files assets/private` empty. There is no drawing check here, because 066 draws.

## Files
- **A:**
  - `src/render3d/tilecity.ts`: ring-2 and lane runs, `quietRuns`, drives through both rings, alley and half-park splits, walk-throughs, units;
  - `src/render3d/kerbline.ts`: criterion 10 only;
  - `src/render3d/town.ts`: authorised exception, an `inward` facing option for `terraceBlockRows` only if criterion 1 needs it, default off;
  - new `src/render3d/backs.ts` and `backs.test.ts` (`pairs`, `openings`);
  - tests, re-measured numbers only: `tilecity.test.ts`, `tileinterior.test.ts`, `alleys.test.ts`, `parkmetrics.test.ts`, `frontage.test.ts`, `kerbline.test.ts`.
- **B:**
  - `src/render3d/stacks.ts`: the `ground` option and the quiet corner door choices;
  - `src/render3d/terrace.ts`: authorised exception, corner columns at either end of a run only;
  - `src/render3d/citymetrics.ts`: authorised exception, R9's true-corner definition only;
  - `src/render3d/models3d.ts`: passing the options, and the two `evaluateCity` calls if they are made there;
  - `backs.ts` (`openSides`, `faceRule`, M6 and M8 checks), `backs.test.ts`, `stacks.test.ts`, `terracepack.test.ts`, `citymetrics.test.ts`, `facade.test.ts`.
- **Both:** `docs/city-style-guide.md`.
- **Must not touch:**
  - `parkmetrics.ts`, `frontage.ts`, `dressing.ts`, `sills.ts`, `escapes.ts`, `tilecity3d.ts`, `tileslots.ts`;
  - `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`;
  - `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`, `docs/city-grammar.md`.

## Dependencies
- **Needs:** 064 merged (ring 2 is laid on its cells), 063 E1 and E2 merged, and 063 F merged (criterion 10 edits its file).
- **Before:** 066 (drawing), 067 (party walls and strips), 068 (roof exit). B needs A.
- **Shared files:** `tilecity.ts`, `stacks.ts`, `terrace.ts` and `models3d.ts` with 064 and 066. The main session merges one at a time.
- No `src/core/` change, no new dependency.

## Interfaces
All in `src/render3d/`; the builder may rename any of them.
- `tilecity.ts`: `TileCity.quietRuns: readonly string[]`; `TileCourt` with its drive two cells deep; an opening record `{ kind: "lane" | "drive" | "frontLot" | "plaza" | "park" | "walk"; block: string; cells: readonly { i: number; j: number }[] }[]` as `TileCity.openings`.
- `stacks.ts`: `AssembleOptions.ground?: "street" | "quiet"`.
- `backs.ts`:
  - `openSides(city, packed): ReadonlyMap<string, readonly ("+x" | "-x" | "+z" | "-z")[]>`;
  - `pairs`, `openings` and `faceRule`, each returning its failures (empty when the check holds).

## Open questions
- **Q-065-1 (only if P2 fails, criterion 9):** may `LOTS_PER_BLOCK_MAX` be 3 on blocks of at least 10 cells each way? This is the grammar's Q5 fallback. It needs Josh's word, not the waiver, because it changes a 056 rule he approved.
