# 081 · Purge the old city; the 64 puzzles on the pipeline city, on its streets, picked models, and a 2D overlay to play them

owner: per section (renderer, puzzle-designer, pipeline-designer, lead-architect, grid-simulator, landscape, facades, ui; see Sections)
status: approved (G1, Josh, 23 Nov 2026, in chat: "Approve 081"). **Section TB (the timed breaker) cut 26 Nov 2026; approved (G1) the same day, on a card: "Approve (Recommended)"** (open question 27, closed); **TB0 to TB6 and TB1b1 to TB1b3 merged** the same day (PRs #104 to #114). **Section N (series v1, 25 new puzzles) cut 25 Nov 2026; N0, N1 and NS approved (G1) the same day, on a card: "Approve (Recommended)"; all three merged 26 Nov 2026 (PRs #97, #99, #98) on Josh's word, and N2 re-cut to puzzles 6 to 10 and approved to build: "Merge and start the next 5"; N2 and NR merged (PRs #101, #103). **N3 (11 to 15) re-cut 26 Nov 2026 and approved to build, in chat: "Start it"** (asked "Shall I start N3 (puzzles 11 to 15)?"); **N3 merged 26 Nov 2026 (PR #119, ef60db7)**, on a card: "Merge now" (asked after CI passed and the review found 0 must-fix, before he had played 11 to 15). **N4 (16 to 20) re-cut in full 26 Nov 2026 and approved to build, on a card: "Start N4 (Recommended)"**; N5 (21 to 25) waits on his word. P2b to P2d dropped the same day (Josh: "I don't want to convert the existing puzzles."). T3b done (PR #96).** **Section W cut 25 Nov 2026 from Josh's play of P2a; approved (G1) the same day, on a card: "Approve W (Recommended)".** W0's note is in (`docs/design/081-W0-building-targets.md`, 82f8f37); Josh answered its two cards the same day: W-Q3 "Own block roofs (Recommended)"; ring lines read outward from where each line takes its power: "Yes (Recommended)". W1 and P2a2 re-cut to them. Cut 23 Nov 2026 on Josh's request (below); re-cut the same day on his answers to questions 1 to 10 (below). **K2 is done** (K2a, K2a2, K2b, K2c, K2d1, K2d2 all merged; K2d2 by PR #42, Josh, 24 Nov 2026, on a card: "Merge K2d2 (Recommended)"). **Next: the playable path** (Josh, 24 Nov 2026, on a card: "Playable path first (Recommended)"): P0, K3, U1, then E2, then U2, before H4, P1 and P2a. See *The playable path*.
branch: `ticket/081-puzzles-on-the-city` (this file and the `src/core/` types). One branch per pull request: `ticket/081<section>-<slug>`, from this branch until it is on `main`.

## Josh's words (23 Nov 2026, in chat)
> "I would like to purge the old city and start working on the new on. I would like to add the old puzzles to the new city structure. I want to have all of the power lines and the puzzle pieces work within the street structure of the city. If there are power lines that are diagonal across streets, then they have to be attached to structures on top of buildings. I want to work through a process where I am selecting individual assets to represent puzzle components. And furthermore, I want to build a 2D overlay on top of the city to represent the puzzles themselves, because I think that the individual assets are going to be too small for the user to manipulate them easily."

## Josh's answers (23 Nov 2026, on question cards, relayed by the main session; not G1)
Each is the question as asked and the option he picked, quoted.
1. **What "purge the old city" covers** (old tile city now; the ladder's 3D puzzle town later; keep the 2D map): **"Both now"**. The old tile city and the ladder town are both deleted now. He saw the warning that the 64 puzzles have no 3D view until the new city plays them. The 2D map and its background (`src/render/city.ts`) stay, because the 2D game must still play.
2. **All 64, or a pilot first?** **"Pilot 01-16 first (Recommended)"**.
3. **Which city?** **"6x6 seed 1 (Recommended)"**.
4. **A puzzle that does not fit** (bigger district, another district, a city variant, else schematic-only): **"Change the puzzle instead"**. The puzzle-designer reworks the puzzle so it fits, as a new file in `puzzles/city/`. There is no fallback to a bigger district, another district or a city variant. Each rework's note says what changed from the schematic and why.
5. **Poles between a line's ends** (a junction at every bend, or carriers only): Josh's framing: "lines cannot bend, they are runs that go from one structure to another". Card: **"Just carriers (Recommended)"**. Every span is straight between two structures. A puzzle line may run over several spans, and the poles between them, corner poles included, only carry the wire. They are not puzzle junctions, so a city puzzle keeps exactly its schematic's nodes. **This changes CK13** (it was Proposed, not a Decided rule).
6. **The diagonal rule.**
   - (a) A diagonal roof span over a street intersection: **"Yes, roofs may cross one"**. This lifts Q45 ("never over a junction") for roof spans only. Pole crossings stay mid-block and square (CK6).
   - (b) Roof structures and nodes: **"Roofs may hold nodes"**. A roof structure may hold a breaker, a switch or a fuse box. This lifts K1 Q9 ("on poles only") for roof structures.
   - (c) Where a diagonal ends: **"Roof or pole"**. A diagonal runs roof to roof, or roof to pole.
7. **The overlay's style:** **"Icons plus lines (Recommended)"**. **Reversed 24 Nov 2026** (Josh, in chat): "I don't think we need the "wire overlay, the 3d wires are apparent enough, however the icons are important." The overlay shows icons only; see section E4. The line and break bullets below stand as history: E4 drops the straight lines, and the break icon moves from the line's midpoint to the real cut ("At the real cut (Recommended)").
   - **How the overlay draws a line and a break** (Josh, 23 Nov 2026, in chat, asked what the overlay and the 3D break prop do with a damaged cable that current does not reach): "The 2D overlay should just draw a line from junction to junction with an icon indicating a break at the center of the cable."
   - Follow-up card, the line's path: **"Straight, piece to piece"**. One straight line between the two puzzle pieces a line connects, as on the 2D map. The line does not follow the carrier poles' spans. The break icon sits at that line's midpoint.
   - Follow-up card, whether the break icon is always shown: **"Only when readable"**. It appears only once current reaches the break, as on the 2D map (Josh, 27 Oct 2026: "Unreadable faults show nothing").
8. **The damaged line:** **"Yes, a picked prop"**. Josh picks a model for the break, placed at the cut span. The wire itself stays code-drawn (071).
9. **The picking process:** **"A card per component"**. The main session puts one question card per component, built from D1's shortlist with pictures, and records his pick in his words in `docs/design/081-component-picks.md`.
10. **`src/city/circuit/` for the grid-simulator:** **"Yes, add it"**. The main session edits `.claude/agents/grid-simulator.md`. No agent does.

## Josh's answers on B1 and its pre-check (23 Nov 2026, on question cards, relayed by the main session)
Asked from `docs/design/081-B1-roof-spans.md` section 9 (B1-Q1 to Q5) and `docs/design/081-B1-precheck.md` section 5 (B1p-A). Each is the question and the option he picked, quoted.
- **B1-Q1.** Besides breakers, switches and fuse boxes (6b), may a roof structure hold a junction, a battery, a lamp or the feed? **"Anything"**.
  - This covers junctions, batteries, lamps and the feed.
  - It **overrides, for roofs only,** the note's reason for keeping lamps off. That reason was that a roof lamp is a drop across the street in all but name, and K1 Q12 keeps drops on the pole side. Drops themselves stay on the pole side.
  - The feed may stand on a roof structure. B1b words where, keeping K1 Q10's "just outside the district" as the feed's side of its one entering span.
- **B1p-A.** Over an intersection, a roof wire may go only roof to roof, or also come down to a ground pole where that pole is a tall one? **"Tall poles too"**.
  - Roof to pole over a junction is allowed where the ground pole's model clears `ROOF_JUNCTION_FLOOR_M` 7.5 m.
  - Stage 6 must therefore know each pole's model. The pole choice and the poles' attachment heights move out of merged 071 B's `src/render3d/powerkit.ts` into `src/core/` (sections PK1 and PK2), before K2d.
- **B1-Q3.** Roof structures only where the live job uses them, or on every corner roof? **"On every corner roof"**. Roof structures stand on every street corner roof as scenery, used or not.
- **B1-Q4.** Corner roofs only, or mid-row too? **"Mid-row as well"**. Roof structures may also stand on mid-row roofs.
  - Read with Q3, this is ambiguous: are mid-row structures always there, or only where a puzzle uses one? Josh answered it: see the next bullet.
  - Mid-row places were unmeasured, so K2d and H4 waited for a fresh pre-check (B1q). It held; see B1q's answer below.
- **B1-Q2 (T-2).** For the street layer later, does a roof node count as reachable by a climb? **"On foot or by a climb (Recommended)"**.
  - 073's T-2 reads "on foot along pavement or road, or by a climb at its building" for roof nodes.
  - A street-scope line with a roof span is `overhead`.
  - Nothing in this prototype changes, because roof nodes are played through the overlay. A pointer line is added to 073's T-2.
- **B1-Q5.** May a job's lines use a roof structure on a block outside its district? **"Neighbouring blocks too"**. A job may use roof structures, as carriers or nodes, on the blocks one street beyond its district. This extends CK14's edge for roofs only. Pole lines and drops stay inside the district.

- **Mid-row, always or only when used** (ticket 081's open question 1 of the B1 re-cut): **"Only when used (Recommended)"**.
  - Corner roofs always carry a roof structure, as scenery.
  - A mid-row roof carries one only while a puzzle that uses it is played.
  - Roof spans are drawn only where a job uses them.

- **B1q's question, mid-row roofs and stage 7** (`docs/design/081-B1q-precheck.md`, section 4; asked 23 Nov 2026): **"Only where clear (Recommended)"**.
  - A mid-row roof structure stands only on a roof that stage 7 has left clear, and **nothing on a roof ever moves** for one.
  - On seed 1, 440 of 990 mid-row roofs are clear.
  - B1q's verdict on CK17 as B1b amended it: **holds** on the 20 named runs.

**From the pre-check (no question).**
- **Puzzle 15 fails CK14 however it is laid.** Each of its two feeds has 2 lines, and K1 Q10 gives a feed one entering span. It is a rework under answer 4.
- **With roof nodes, 15 of the 16 pilot puzzles fit** (B1p). After B1q, with any node on a roof, neighbouring-block roofs and clear mid-row places, **all 15 fit on 1 block**:
  - 01, 02, 05, 06, 08, 13 and 16 on poles;
  - the rest using roofs;
  - 04 and 12 using roofs on neighbouring blocks, and 12 also 7 clear mid-row places.
- **No pole on seed 1 has more than 3 spans** (finding 2). So the 4-wire and 5-wire junctions of 03, 04, 07, 11 and 12 need roof `down` spans to add ports.
- **Finding 3's corrections go into B1b:**
  - the keep square meets 26 small props on seed 1, not 14;
  - "street cells within one cell of the junction" is read as carriageway and crossing cells only;
  - the counts of `down` places.

## Goal
Josh opens `npm run dev`, picks one of the ladder puzzles in its city form from the map picker, and plays it on the pipeline city (6 x 6 seed 1). Its feed, breakers, switches, fuse boxes, junctions, batteries and lamps stand on the poles, roof structures, buildings and lamp posts of one district. Its lines run along the streets as chains of straight spans from structure to structure. Any line that crosses a street on a diagonal hangs from a structure on a building's roof. Each component is drawn with the model Josh picked for it, one card at a time. A 2D overlay over the 3D city draws the puzzle's icons and lines at a size he can read and click. A click on the overlay throws, releases or repairs through the same `src/play/` calls as the 2D map. The old tile city and the ladder's 3D town are gone. The 2D game plays as before.

## What exists on main (read at 3823f0d, 23 Nov 2026)
| Piece | State on main |
| --- | --- |
| K1, the circuit's design (`docs/design/070-K1-circuit.md`, CK1 to CK16; worked map `puzzles/city-two-ways-round.*`) and K1a | **Merged** (c7a97ed). Every K1 question answered; the pre-check held on 20 of 20 runs. |
| `CityCircuitLayer` | **Typed with this ticket** (`src/core/citycircuit.ts`, `cityplan.ts`) from CK15's sketch, with CK13 as question 5 changed it. It was `{ stage }` before. |
| K2 (`src/city/circuit/`), I2, K3, K4, K5 | **Not started.** `BUILT_STAGES` has no circuit stage; `circuitPoints` returns none. |
| 071 B `powerkit.ts` | Merged. 071 C (the ladder drawn with it) and 071 E's ladder wiring are **dropped** by answer 1; E's pure parts become E1 here. 071 D (power GLBs) is untouched. |
| L2a, L2b, L2c | **Merged** (525342c, 954a035, cf254e7). |
| L2d | **Not done**: `tilecity.ts`, `tilecity3d.ts`, `frontage.ts`, `parkmetrics.ts`, the `tiles-old` route and `oldTilesRequested` are on main. A1 here. |

This ticket carries on 070's K2 to K5 and L2d. Every CK rule and every Josh answer in `070-K1-circuit.md` holds except where answers 5 and 6 above change them.

### What the purge deletes, and what the pipeline city still needs (read at 3823f0d)
No file in `src/city/`, `src/core/`, `src/ui/`, `src/play/`, `src/render/`, `tools/` or `tests/playtest/` imports a ladder file. The tie is inside `src/render3d/`. Going by the imports, the pipeline city (`plan3d.ts`, `planview.ts`) and the asset gallery (`assetcatalogue.ts`, `assetviewer.ts`) reach every ladder file through `models3d.ts`, `dressing.ts`, `furniture.ts`, `stacks.ts`, `models.ts` and `streetcam.ts`. Those files hold the shared kit (stack assembly, painting, dressing and furniture pieces, model tables), and they read constants and types from the ladder's `town.ts`, `terrace.ts`, `scene.ts` and `layout.ts`. So the purge runs in four steps (A2a to A2d):
- **Moves first (A2a), unchanged in value, to a new `src/render3d/kitunits.ts`:**
  - from `town.ts`: `WORLD_PER_METRE`, `PAVE_W`, `SETBACK`, `KERB_H`, `ROAD_W`, `STOREY_M`, `LOT_TYPES`, `LOT_TYPE_NAMES`, `TERRACE_DEPTH_M`, `PARKING_D_M`, `PARKING_W_M`, `PLAZA_W_M`, `WIRE_CLEAR` and the types `Lot`, `LotSpec`, `LotType`, `Pt`, `OpenLot`, `TerraceRun`;
  - from `terrace.ts`: `ALLEY_MAX_M`, `ALLEY_MIN_M`, `alignOf`;
  - from `scene.ts`: `GROUND`, `PAVEMENT_Y`, `YARD`, `YARD_H` and the types `ModelSlots` and `SceneBundle` (if `models3d.ts`'s kept half still needs them);
  - from `layout.ts`: `POLE_HEIGHT` and the type `Vec3`;
  - from `streetcam.ts`: `STREET_CAM_BACK_M`, `STREET_CAM_EYE_M`, `STREET_CAM_FOV_DEG`, `STREET_CAM_LOOK_M`.

  This list is from the import lines. A2a's builder extends it with any name its typecheck asks for, and lists every name in its report.
- **Kept files** (the pipeline city, the asset gallery, and the pieces E1 and E2 reuse): `plan3d.ts`, `planview.ts`, `models3d.ts`, `models.ts`, `stacks.ts`, `dressing.ts`, `furniture.ts`, `escapes.ts`, `sills.ts`, `facade.ts`, `colourway.ts`, `calibration.ts` (the fronts reader `models3d.ts` uses), `citymetrics.ts`, `placeholders.ts`, `lighting.ts`, `lightrig.ts`, `daytoggle.ts`, `powerkit.ts`, `assetcatalogue.ts`, `assetviewer.ts`, `tileslots.ts` and A1's kept half of `tilecity.ts`, `tilecity3d.ts` and `kerbline.ts`. Also kept for E1 and E2: `look.ts` (state looks), `relight3d.ts` (Relight timing) and `pick.ts`. `renderer.ts` is kept as the router.
- **Ladder-only functions inside kept files** go in A2c: `dressTown` and the run-threading only it uses (`dressing.ts`), `furnitureLayout`, `alleyOf` and `openLotsOf` (`furniture.ts`), and `applyModels` with its ladder dressing and packing (`models3d.ts`). They go only if no kept path calls them at run time. A2a's report says, for each one, whether `plan3d.ts` reaches it. If one is reached, A2c keeps it and the report says why.
- **Deleted files (A2c):** `town.ts`, `terrace.ts`, `scene.ts`, `layout.ts`, `camera.ts`, `captions.ts`, `text.ts`, `streetcam.ts`, `gallery.ts` (the 043 building gallery, `?gallery=`), `stackgallery.ts` and `debug3d.ts` (`?fronts=1`, ladder only). Their tests go with them: `town`, `townpin`, `packpin`, `terrace`, `terracepack`, `terracetown`, `stacktown`, `scene`, `layout`, `captions`, `streetcam`, `gallery`, `stackgallery`, `debug3d`, `live`, `streets`, and any other file whose every case builds the ladder town. The mixed files are sorted under A2b (folded into A2c).
- **Kept outside `src/render3d/`:** the 2D map and its background town (`src/render/`, including `src/render/city.ts`, which `models3d.ts` and the kit read for `stableHash`), the tile sheet (070 Q47), the 074 asset gallery (`?assets=`), `tests/playtest/` (it replays the grid only), and the fronts save plugin (`tools/calibration/`). The plugin is still read through `calibration.ts`. Whether to delete it is a later ticket.
- **What `?view=3d` does after A2c:** on a schematic puzzle, the 2D map opens and the console says "3D view: this puzzle has no city form yet" (A2d, ui). `?view=3d&city=tiles` is the pipeline city, as now. A city puzzle opens in the city view from E2 and U1 on.

## Rules this ticket holds
- **The GDD's Decided rules (the brief's "Rules carried over") are law.** A city form is laid out differently and plays by the same rules on `src/grid/` unchanged.
  - **A city puzzle laid from a schematic unchanged** (its `from` set and no rework) keeps exactly the schematic's nodes, lines, faults, parts, loads, ratings, capacities and targets (answer 5). Its check block is the schematic's, copied, and gives the same outcomes.
  - **A reworked puzzle** (answer 4) is a new puzzle: its own check block, its own analyzer numbers, and a note that says what changed and why.
  - **Amended 24 Nov 2026 (section S; Josh, on cards: "Yes, they add load", "Raise (Recommended)", "Whole").** Every city puzzle's scenery buildings on its live poles draw on its feed, so "unchanged" now means: the schematic's nodes, lines, faults, parts, loads and targets, with **only** its feed capacities and fuse ratings raised by the scenery load its check block's solution lights (P1 writes them). Such a puzzle is **raised, not reworked** (the architect's reading): its check block is the schematic's, copied, and gives the same outcomes; its analyzer's fewest clicks, winning configs and dead first moves equal the schematic's; its note has one **What changed** line giving the old and new numbers. A puzzle that does not play the same when raised (09 and 12 at "Whole", per `docs/design/081-all-connected-powered.md`) is a rework.
- **`src/grid/` and `src/night/` are not touched.** `src/city/circuit/` is pure: no DOM, canvas or three, and it imports only `src/core/` and `src/city/`.
- **Josh's K1 answers hold except as changed on 23 Nov:**
  - CK5's corner spans are never over a carriageway.
  - CK6's pole crossings are square and between junctions, never over one (Q45). They stand 2.5 m past the corner cell, just beyond the crosswalk (K1 answer 3), not in the middle of the block. Roof spans are the one exception (6a).
  - CK7's 4.2 m floor holds for every span over a street, roof spans included.
  - ~~CK9's drops are on the pole side only (Q4, Q12).~~ **Changed 24 Nov 2026** (Josh, on cards: "Every building wired", "Yes, a fitting (Recommended)", and on the CK9 note's questions "Same height (Recommended)", "Leave (Recommended)", "Allow (Recommended)", "Shortlist (Recommended)"): every street-facing building takes a drop, by option C of `docs/design/081-CK9-every-building-wired.md`, with a wall fitting. 059's 5.5 m road clearance no longer binds drops; CK7's 4.2 m floor does. See K2e.
  - CK12: fuse boxes, breakers and switches stand on poles, **or on roof structures** (6b). **Any node may stand on a roof structure** (B1-Q1, "Anything"), lamps, batteries and the feed included. Otherwise the feed stands on a pole just outside the district (Q10).
  - CK13 is **changed by answer 5**.
  - CK14's district is 1 to 4 blocks (Q7). A job may also use roof structures on the blocks one street beyond it (B1-Q5, "Neighbouring blocks too"). Its pole lines and drops stay inside the district.
- **CK13 as changed (Josh, 23 Nov 2026).**
  - A puzzle line is a chain of one or more straight spans, each from one structure to the next, of any kind (along, corner, crossing, roof). It may end in a drop or a lamp post's lead.
  - The poles between are carriers: they hold no node of the job, and the job uses no other attachment there.
  - No two lines share a span.
  - A damaged cable is one span of its line.
  - The type is `CityLineRun` in `src/core/citycircuit.ts`.
- **`puzzles/locked/` is never edited** (it does not exist). The schematic puzzles `puzzles/01-...` to `64-...` are not edited. City puzzles are new files in `puzzles/city/`.
- **No agent picks a model.** Josh's picks are his words, recorded by the main session (D).
- **Tests** (`docs/test-policy.md`):
  - at most 15 test cases added or rewritten per pull request, aiming for 10;
  - each criterion marked **test**, **browser** or **no test**;
  - whole-city checks on **6 x 6 seed 1, one-way on**, through the folder's module cache;
  - no 20-city check and no printed numbers in `npm test`.
- **No new dependency** in any section.

## Sections, in order
"After X" means after X merges into `main`. One owner, one branch and one pull request per section.

| # | Section | Owner | After | Tests in its PR |
| --- | --- | --- | --- | --- |
| A1 | Delete the old tile city (070 L2d) | renderer | G1 | about 4 added; about 250 removed |
| A2a | Move the shared kit's constants out of the ladder files | renderer | A1 | 0 added; 5 rewritten (pins on where a name lives); import lines only in about 30 more |
| A2b | **Folded into A2c** (re-cut 23 Nov 2026): the sort is decided below, and the deletions ride with A2c | renderer | n/a | n/a |
| A2d | `?view=3d` on a schematic puzzle opens the 2D map | ui | A2a | 2 |
| A2c | Delete the ladder town, with A2b's sort | renderer | A2a, A2d | about 2 added, at most 4 rewritten; the ladder's tests removed |
| B1 | CK17, the street rule and roof structures, designed | puzzle-designer | G1 | **done** (on `ticket/081b1-roof-spans`) |
| B1p | "pre-check 081 B1" | pipeline-designer | B1 | **done** (same branch) |
| B1b | CK17 amended to Josh's B1 answers | puzzle-designer | now | 0 (a note) |
| PK1 | The ground poles' mix and heights in `src/core/` (re-cut of merged 071 B) | lead-architect | now | 0 (typed data) |
| PK2 | `powerkit.ts` reads the mix and heights from core | renderer | PK1 | 2 |
| B1q | "pre-check 081 B1b": mid-row roofs, the real pole pick, neighbouring blocks | pipeline-designer | B1b, PK1 | **done**: holds (`ticket/081b1-roof-spans`, 555cf0e) |
| C1 | The city puzzle validator | lead-architect | G1 | 6 |
| K2a | Stage 6: poles and spans (CK1 to CK6, CK8; CK7 moves to K2d), not yet in `BUILT_STAGES` | grid-simulator | now | 9 |
| K2a2 | Stage 6 switched on: `BUILT_STAGES`, the shared profiles, the tests that said circuit was not built (era passes included) | grid-simulator | K2a | at most 15 (about 12 rewritten) |
| K2b | Stage 6: drops, lights, lamp posts, node places (CK9 to CK12) | grid-simulator | K2a2 | 10 |
| K2c | The conversion (CK13 as changed, CK14, CK15) | grid-simulator | K2b, C1 | **done** (PR #38; Josh, 24 Nov 2026: "Merge K2c") |
| K2d1 | Stage 6: the pole pick, CK7, roof structures and roof span places (CK17a to d) | grid-simulator | K2c, PK1, PK2, B1q (all in) | **done** (PR #41) |
| K2d2 | Roof nodes, runs through roofs, CK14 for roofs, the conversion (CK17e to g) | grid-simulator | K2d1 | **done** (PR #42; Josh, 24 Nov 2026: "Merge K2d2 (Recommended)") |
| I2 | Stage 8 keeps clear of the circuit | landscape | K2b | **done** (PR #39; Josh, 24 Nov 2026: "Merge I2") |
| H4 | Stage 7's roof pieces keep clear of the corner roof structures | facades | K2d1 | 2 added, 4 rewritten |
| P1 | The fit tool and the city check (with the mid-row clearance check), and the raised numbers (criteria 10 and 11, section S) | grid-simulator | K2c, K2d2, **S1** | 12 |
| P2a | Puzzles 01 to 16 on the city (the pilot), raised; 09 and 12 hand-fixed (section S) | puzzle-designer | P1, K2d2 (9 of the 16 need roofs), S1 | 0 |
| P2b to P2d | ~~Puzzles 17 to 64, 16 a batch~~ **Dropped 25 Nov 2026** (Josh: "I don't want to convert the existing puzzles."); replaced by section N | puzzle-designer | n/a | n/a |
| D1 | The component shortlist | pipeline-designer | G1 | 0 (a note) |
| D2 | The gallery's component view | ui | D1 | 5 |
| D3 | The picks table | renderer | Josh's first picks | 2 |
| E1 | Glyphs out of the 2D renderer; the overlay's icons and lines, pure | renderer | G1 | 9 |
| P0 | `city-two-ways-round` as a city puzzle file in `puzzles/city/` | puzzle-designer | now (K2c is in) | 0 (1 path line) |
| K3 | The circuit drawn on the city | renderer | now (K2d1, K2d2, PK2, A2c, D3 are in) | 7 (6 added, 1 rewritten) |
| U1 | The picker lists only city puzzles (pure) | ui | now (C1 is in) | 3 |
| E2 | A city puzzle played on the city, through the overlay | renderer | K3 (shares `plan3d.ts`) | 10 |
| U2 | The page opens straight into the 3D city (`main.ts`) | ui | E2, U1 | 1 |
| E3 | The opening camera frames the district, not the city | renderer | now (U2 is in) | 2 |
| K2ep | "pre-check 081 K2e": option C as worded below, with drops added to CK17d | pipeline-designer | now | 0 (a note) |
| K2e | Stage 6: every street-facing building wired (CK9 as changed, CK7 on drops, CK17d keeps roof spans from drops), and the pins it moves | grid-simulator | K2ep "holds" (or Josh's answer) | at most 10 (3 added, 5 rewritten, at most 2 more under its stop rule) |
| D4 | The wall fitting shortlist, and the drop wire's gauge | pipeline-designer | now | 0 (a note) |
| K3b | The drops drawn attached: a real insulator, the City bracket, `POWER_LINE` kept | renderer | now (Josh's D4 picks are in; K2e not needed) | 3 (1 added, 2 rewritten); 4 if the R12 case must change |
| E4 | The overlay shows icons, not lines: the break icon at the real cut; clicks go icons, then 3D | renderer | E3 (shares `cityview.ts`) | 0 added, 4 rewritten, 1 removed |
| E5 | The camera stays on the puzzle: zoom-out and pan limits from the district, any window shape; `cam=free` (dev) lifts them | renderer | G1 in ("Approve, 1.5x (Recommended)"); after FX2 merges | 3 |
| L1 | The lit building's windows; the wall lamp goes | renderer | E4 | **done** (PR #55) |
| L2 | Real lights on the street, the cap raised to 32 under a measured stop rule (re-cut 24 Nov 2026) | renderer | L1 (in) | 2 |
| L3 | A few dim windows in the dead city (1 in 25, steady amber) | renderer | L1 (in) | 2 |
| S1 | Scenery buildings on the job's live poles in the conversion: hidden lamps and junctions, `scenery`, `hidden`, P0's raised capacity line | grid-simulator | now (core types are in) | at most 9 (5 added, 2 rewritten, at most 2 more under its stop rule) |
| P0r | P0's note re-opened with its raised numbers | puzzle-designer | S1 | 0 |
| S4 | Scenery drawn live: live drops glow and pulse, scenery windows through L1's path, their street lights | renderer | S1, L2 (shares `cityview.ts`) | 3 |
| U3 | Hidden lamps make no Relight sound | ui | S1 | 1 |
| FX1 | The particle pack converted; `npm run assets:game` adds its textures and its spark and shard meshes (FX-Q2 "Meshes too") | grid-simulator | now (G1: "Approve, FX2 first (Recommended)"); no other section | at most 4 (3 added, at most 1 rewritten) |
| FX2 | The particle pool, the textures, live-break sparks and repair flashes; the pack meshes when loaded, sprites otherwise | renderer | now, beside FX1; not after FX1, L3 or S4 (they rebase on it). Amended 24 Nov 2026 on its branch: extreme sparks, warm crackle arcs at the cut, a repaired cut stops at once | 7 (8 at most) |
| FX3 | Relight bursts and brownout arcing | renderer | FX2, and FX-Q3 and FX-Q4 answered | 2 |
| X1a | The city view's pieces move out of `src/render/` (interfaces to `src/render3d/maprender.ts`; `stableHash` from `src/city/`) (cut 25 Nov 2026; G1: "Approve X (Recommended)") | renderer | now | 1 added, at most 2 rewritten |
| X1b | `src/play/` imports the map's interfaces from `src/render3d/maprender.ts` | interaction | X1a | 0 |
| X2 | The 2D side of `src/ui/` and `main.ts` goes; the build loads only city puzzles | ui | X1a | 0 added, at most 2 rewritten, about 7 removed |
| R1 | The release harness replays the city puzzles through the conversion; old snapshots deleted; not run until a release | playtester | X1a | at most 8 rewritten |
| X1c | Delete `src/render/` | renderer | X1b, X2, R1 | 0 added, at most 2 rewritten, about 358 removed |
| V0 | "pre-check 081 V2": what the load numbers give away, pilot by pilot (cut 25 Nov 2026; G1: "Approve V (Recommended)") | pipeline-designer | now | 0 (a note) |
| V1 | Every puzzle wire highlighted, dead runs included | renderer | W4, V-Q1 | 1 |
| V2 | The load preview, pure (`loadPreview`): visible load, known faults counted, "+3" before any blow, red if over | grid-simulator | now (V0 and Josh's answers in) | 5 |
| V3 | The numbers by the icons: the preview by controls and breaks; every fuse and feed's load against its limit | renderer | V1 (the core type is in) | 2 |
| V4 | The page computes the preview with the read faults, and a key hides it | ui | V2, V3 | 1 |
| FX4 | The fuse blows: a bolt down its wires to the box, a burst twice a live break's; FX3 folded in (G1: "Approve FX4 (Recommended)"). **Held** for the bolt slowed to 1.5 s (`BLOW_TIMING`, then `src/audio/`, then the renderer, on its branch) | renderer (with lead-architect and sound on its branch) | W4 | 3 added, at most 3 rewritten |
| W0 | "pre-check 081 W1": building-only lamps, read-outward, feed clearance, crossings, the roof options, spread (cut 25 Nov 2026; G1: "Approve W (Recommended)") | pipeline-designer | G1 | 0 (a note) |
| W1 | The fit and the city check: lamps on buildings, routes that read outward (ring lines from where they take power), feed clearance 6 m, no crossings, own-block roofs, `--avoid` | grid-simulator | now (W0 and Josh's answers are in) | at most 9 (5 added, at most 4 rewritten) |
| W2 | A lit building reads as lit: every storey, glow cards, the light raised; no lamp post or disc | renderer | S4 (PR #70), W-Q1 | 3 |
| W3 | The target reads as the target (W-Q2); each icon on its piece | renderer | W2 (shares `windows.ts`, `cityview.ts`), W-Q2 | 2 |
| P2a2 | The 16 pilots re-laid on building targets, spread | puzzle-designer | W1; Josh plays after W2 and W3 | 0 |
| W4 | Pulses run outward from the feed (find the cause, fix, pin direction for P0 and the 16 pilots); live runs show through buildings, faded (cut 25 Nov 2026, **not approved**) | renderer | PR #74 (P2a2) | 2 (3 at most) |
| SK | The night sky and the moon: a sky drawn in code, stars, a moon disc north and low, the moonlight from it, a turn for the title; no look-up in play (cut 25 Nov 2026; **approved (G1) the same day**: "Approve") | renderer | G1 (in) | at most 7 (3 added, at most 4 rewritten) |
| T1 | The title backdrop: the splash's turning sky, the title's moon over the city and one lit building on the right (cut 25 Nov 2026; **approved (G1) the same day**: "Approve") | renderer | SK | 2 |
| T2 | Progress and the stage list, pure: best moves and time per stage in `localStorage`, completed stages plus the next | ui | G1 | at most 5 |
| T3 | The screens: the "Uronacid" splash, the title with start and exit, the stage select dropdown, the win recorded; dev routes skip them | ui | T1, T2 | at most 3 |
| T3b | The goodbye line moves left, on the title margin (Josh: "Move it left (Recommended)") | ui | T3 | **done** (PR #96; Josh: "Merge when green (Recommended)") |
| N0 | `npm run analyze` reads a city puzzle file, on its conversion (cut 25 Nov 2026; **approved (G1)**: "Approve (Recommended)") | grid-simulator | G1 | **done** (PR #97; Josh: "Merge, start 1-5 (Recommended)") |
| N1 | Series v1, batch 1: puzzles 1 to 5 on the city | puzzle-designer (Fable 5.2) | G1, N0 | **done** (PR #99; Josh: "Merge and start the next 5") |
| NS | The stage select lists only the series, in its order | ui | G1; merges after N1 | **done** (PR #98; Josh: "Merge and start the next 5") |
| N2 | Series v1, batch 2: puzzles 6 to 10 (re-cut 26 Nov 2026 to Josh's pace of five; **approved to build**: "Merge and start the next 5"; PR #101, review round 2: meets) | puzzle-designer (Fable 5.2) | N1, NS (in) | 0 |
| NR | Series 1 to 3 re-laid: each breaker and switch on a single run, not on a split (cut 26 Nov 2026 on Josh's play; **approved (G1)**: "Approve (Recommended)"; PR #103) | puzzle-designer (Fable 5.2) | G1; beside N2 | 0 |
| NC1 | The control cue's lines, pure: each breaker's and switch's preview entry names the lines its throw would make live or dead (**approved (G1)** 26 Nov 2026) | grid-simulator | G1 (the core field written first) | **done** (PR #100; Josh: "Merge, start NC2 (Recommended)") |
| NC2 | The control cue drawn: hovering (or tapping) a breaker or switch highlights exactly the wires it controls (**approved (G1)** 26 Nov 2026) | renderer | G1; merges after NC1 | **done** (PR #102; Josh: "Merge (Recommended)") |
| N3 | Series v1, batch 3: puzzles 11 to 15. **Done** (PR #119, ef60db7) | puzzle-designer (Fable 5.2) | N2, Josh's word | 0 |
| N4 | Series v1, batch 4: puzzles 16 to 20, the deliberate blow (NB1), relay, spring, battery, timed breaker (re-cut in full 26 Nov 2026; **approved to build**: "Start N4 (Recommended)") | puzzle-designer (Fable 5.2) | N3 (in), Josh's word | 0 |
| N5 | Series v1, batch 5: puzzles 21 to 25. **Waiting** on Josh's word | puzzle-designer (Fable 5.2) | N4, Josh's word | 0 |
| J | The opening camera fits the puzzle, not the district; the limits follow the puzzle (cut 26 Nov 2026; **approved (G1)**: "Approve; limits follow puzzle") | renderer | G1 | 3 added, 0 rewritten |

`src/play/` (interaction) has no section. E2 keeps the `MapRenderer3d` interface, so play and its `hitTest` calls do not change. If E2's builder finds that `src/play/` must change, it stops, and the architect re-cuts with an interaction section.

**Between A2c and E2 the 64 puzzles have no 3D view.** Josh accepted this with answer 1. The 2D game plays until U2 merges.

**Full 3D (Josh, 24 Nov 2026, on cards).** "I don't want 2D puzzles anymore. I want this game to be full 3D. The 2D puzzles were really just a prototype to see if the puzzles would be functional." On what happens to the 2D side: "Hide now, delete later (Recommended)". On the release harness: "Retarget later (Recommended)". So, from U2 on, the picker and the page show only city puzzles, on the 3D city, with E1's overlay of icons on top (its lines are dropped by E4; Josh, 24 Nov 2026: "I don't think we need the "wire overlay, the 3d wires are apparent enough, however the icons are important."). The schematic files in `puzzles/` stay, as the source P1 and P2a fit onto the city. The 2D map code is deleted by X1 and X2 once the 16 pilots are on the city. `tests/playtest/` is left alone until R1.

### The playable path (re-cut 24 Nov 2026, the lead-architect, on Josh's card "Playable path first (Recommended)")
Josh's aim: open `npm run dev`, pick `city-two-ways-round` in the picker, and play it on the 3D city (6 x 6 seed 1). K3, E2 and U1 as first cut do not get there alone. Three gaps, read at ede9e64:
- **No city puzzle file exists.** `puzzles/city/` does not exist. The one city form is K2c's test fixture, `src/city/circuit/fixtures/city-two-ways-round.city.json`. U1 was cut to wait for P2a's 16 pilot puzzles, which wait for P1. **P0** moves the fixture to `puzzles/city/`.
- **U1 as first cut also held the `main.ts` wiring,** which needs E2's renderer option. It is split: **U1** is the pure picker list (no dependency, built now), and **U2** is the `main.ts` wiring (after E2 and U1).
- ~~**A canvas keeps one kind of context**: U2 reloads the page at the right address.~~ Gone with full 3D (Josh, 24 Nov 2026: "I don't want 2D puzzles anymore. I want this game to be full 3D. The 2D puzzles were really just a prototype to see if the puzzles would be functional."): every puzzle on the page is a city puzzle on the 3D canvas, so there is no switch and no reload.

**Order and parallel work.**
| Wave | Sections | Shared files | Why this order |
| --- | --- | --- | --- |
| 1 (at once) | P0, K3, U1 | none: P0 has `puzzles/city/` and one path line in `src/city/circuit/convert.test.ts`; K3 has `src/render3d/`; U1 has `src/ui/maps.ts` only | No section reads another's output. |
| 2 | E2 | `plan3d.ts` with K3 | It draws K3's circuit live. |
| 3 | U2 | `src/main.ts`, `src/ui/view3d.ts` | It calls E2's `loadCityView` and `city` option, and lists U1's entries. |
| later | X1, X2 | `src/render/`; `src/ui/`, `main.ts` | After P2a's 16 pilots are on the city and Josh has said so. |

**No rule or number changes on this path, so no pipeline-designer pre-check.** Every rule is already Decided or answered: CK1 to CK17 as built; "Straight, piece to piece" and "Only when readable" (E1, K3); 059's street light model (Josh, 18 Nov 2026: "Approve 057, 058 and 059"); 071 Q11's pack wire piece ("Pack wire pieces (Recommended)"). Two things are **measured and reported, not tuned**: the feed pick's span heights (K3) and the damaged-line prop's low point (open question 2).

**After P0, K3, U1, E2 and U2,** Josh can open `npm run dev` and land on the 3D city, on "City · Two ways round" (the picker lists only city puzzles), and play it. H4, P1 and P2a come after.

---

### A1 · Delete the old tile city (renderer). Branch `ticket/081a1-delete-old-city`
**Goal.** As 070 L2d:
- `city=tiles-old` opens nothing special;
- `city=tiles` is unchanged;
- `city=tiles&sheet=1` still opens the tile sheet;
- the guide and grammar describe only the pipeline.

**Acceptance criteria.** 070 L2d's criteria 1 to 8 as written there, with these changes:
1. [ ] **The guide moved** (ticket 080). Criterion 6's edits land in `docs/city-style/` and `docs/city-grammar.md`, not in `docs/city-style-guide.md`, which is now a pointer:
   - `evaluation.md`: the old-path tables of 18.8 and 19.7;
   - the `city=tiles-old` pointers in `frontage-and-interiors.md`, `parking.md` and `evaluation.md`.

   **`decisions.md` keeps every entry**, because it is Josh's words. **no test**: the reviewer reads the diff, and 080's drift test runs on the files.
2. [ ] **The grep** (070 L2d criterion 3). **test**: 1 new case in `tileslots.test.ts`.
3. [ ] **The routes** (070 L2d criterion 4). **test**: at most 3 cases, rewritten from the existing `tiles-old` cases in `tileslots.test.ts`, `plan3d.test.ts` and `planview.test.ts`.
4. [ ] **Tests go with their code** (070 L2d criterion 5), each listed in the report. **no test**. **May remove:**
   - `tilecity.test.ts`, `tileintegrate.test.ts`, `tileinterior.test.ts`, `alleys.test.ts`, `parkmetrics.test.ts`, `frontage.test.ts` and `kerbline.test.ts`;
   - the old-city cases of `tilecity3d.test.ts` and `tileslots.test.ts`;
   - L2c's kind (b) cases.
5. [ ] **R-8 by the gate.** The playtester runs only on a release. `npm run gate` passes on the branch. `townpin.test.ts` and `packpin.test.ts` pass unedited, since A2c, not A1, deletes them. **test** (existing).
6. [ ] **The browser** (070 L2d criterion 8). **browser**.

**Files.** 070 L2d's Files, with `docs/city-style/*.md` (criterion 1's lines only) in place of `docs/city-style-guide.md`. **Must not:** 070 L2d's list, plus `docs/city-style/decisions.md`.
**Clash.** 080 B2 is open on `docs/city-style/`. Whichever of the two merges second rebases onto the other.

### A2a · Move the shared kit's constants out of the ladder files (renderer). Branch `ticket/081a2a-kit-units`
**Goal.** Nothing Josh can see changes. Every kept file (see *What the purge deletes*) reads the names it needs from `kitunits.ts`, or from another kept file, and imports nothing from `town.ts`, `terrace.ts`, `scene.ts`, `layout.ts` or `streetcam.ts`. The ladder files import those names from `kitunits.ts` too, until A2c deletes them.

**Re-cut 23 Nov 2026 (the lead-architect, on the builder's report at a8596fe).** The move broke two things the first cut said would not break. About 30 test files import a moved name, so their import lines must change to compile. Five cases pin where a name lives. **Re-exports are not the fix.** They would leave a name reachable in two places, which criterion 1 forbids, and A2c would delete them in the next PR anyway. So A2a edits those tests, as follows.

**How tests are counted here** (test policy rule 0, "adds or rewrites at most 15 test cases (`it(...)`)"):
- A change to a file's `import` lines only, with no `it(` or `describe(` body touched, is **not** a rewritten case.
- A case whose body or expected values change **is** one.
- The gate's count of `it(` / `test(` in the diff's added lines should then show only criterion 4's five. The builder lists both kinds in its report.

**Acceptance criteria.**
1. [ ] The names listed under *Moves first*, plus any the typecheck asked for (listed in the report), are in `src/render3d/kitunits.ts`, with values unchanged, and each importer reads them from there. No name is defined in two places, and nothing is re-exported from a ladder file. **no test**: the typecheck, and criterion 3.
2. [ ] **Import lines only** in the test files that import a moved name (about 30), with no case body changed. **no test**: the report lists the files.
3. [ ] Every other existing test passes with its cases unedited, digest pins included. **test** (existing).
4. [ ] **The five pins on where a name lives** follow the move. Each keeps its strength, so it still fails when a name moves without its pin:
   - `models.test.ts`: the import allow-list gains `./kitunits`;
   - `powerkit.test.ts`: its pinned import list reads `./kitunits` where it read `./layout` (the `Vec3` type);
   - `styleguide.test.ts`: its 3 cases key each moved constant to `kitunits.ts` instead of `town.ts`, `scene.ts` or `layout.ts`. `POLE_HEIGHT` is found again. The Numbers rows match. The constants count is back to 80 or more, at the count before the move, not lowered.

   **test**: 5 rewritten. The PR has 0 added and 5 rewritten.
5. [ ] **The guide's Numbers table** (`docs/city-style/numbers.md`) names `kitunits.ts` as the source file of each moved constant. Only that column, only for the moved rows. **no test**: criterion 4's `styleguide.test.ts` cases read it.
6. [ ] The report lists every name moved, and every ladder-only function in a kept file with whether `plan3d.ts`, `planview.ts`, `assetcatalogue.ts` or `assetviewer.ts` reaches it at run time. **no test**. *Done at a8596fe:* `dressTown`, `furnitureLayout`, `alleyOf`, `openLotsOf`, `dressSites`, `furnitureInput`, `packTown` and `applyModels` are unreached. `PackResult`, `PackedBlock` and `packTown` (`terrace.ts`) are imported by `citymetrics.ts` and `models3d.ts` only for those ladder functions, so A2c deletes them together with their importing code.
7. [ ] `kitunits.ts` imports no three and no DOM. **no test**: A2c's grep covers it.

**Files.** New `src/render3d/kitunits.ts`; import lines plus the moved definitions in the `src/render3d/` files named under *Moves first* and their importers; the import lines of `src/render3d/*.test.ts` (criterion 2); the five cases of criterion 4; `docs/city-style/numbers.md` (criterion 5's column only). **Must not:** behaviour, `src/city/`, `src/core/`, any other test case.
**Clash.** 080 B2 may also be editing `docs/city-style/`. Whichever of the two merges second rebases onto the other.

### A2b · Kept modules' tests stop building the ladder town: **folded into A2c** (re-cut 23 Nov 2026)
**Why.** The renderer's first step on `ticket/081a2b-kept-tests` (2190cc5) froze the ladder's 1,267 wire spans into a 70 KB fixture to keep two `powerkit.test.ts` cases. Once the ladder is gone, its spans no longer matter. Freezing them is the "low return, high effort" kind of test Josh named on 23 Nov 2026, and test policy rule 6 welcomes removing it. So 2190cc5 is **not merged**. The fixture is dropped, and the two cases are deleted with A2c. What is left of A2b is one small re-point (placeholders), so the sort is decided here and carried out in A2c's pull request. Deletions don't count against the cap.

**The sort, per file** (cases that build `townLayout`, `packTown`, `buildScene`, the ladder camera, `wireLayout` or read `puzzles/NN-*.json`; every other case in the file stays as it is):
| File | Kind | Why |
| --- | --- | --- |
| `powerkit.test.ts` (the 2 ladder-span cases) | (c) delete | The ladder's spans go with it. `fitLine` and `placePole` keep 071 B's fixture cases, and PK2's pin stays. |
| `lightrig.test.ts` (the `buildScene` registration and the 3-map night snapshot) | (c) delete | Ladder scene only. The rig's own cases, and `plan3d.test.ts`'s light-mode cases, stay. |
| `pick.test.ts` | (c) delete | Picks the ladder scene. `pick.ts` stays for E2, and E2's criterion 3 writes the city's `hitTest` cases. |
| `dressdraw.test.ts` | (c) delete | Draws `dressTown`'s output, and `dressTown` is deleted (A2a's report). |
| `furniture.test.ts` | (c) delete | `furnitureLayout`, `alleyOf` and `openLotsOf` are deleted. The furniture keys the pipeline reads are typed constants. |
| `citymetrics.test.ts` | (c) delete | Measures `packTown` and `dressSites` output, which is deleted. |
| `models.test.ts` (the ladder-lot cases) | (c) delete | `MODEL_TABLE`'s ladder lots. The manifest and `sizeOf` fixture cases stay. |
| `sills.test.ts` | (b) delete | The pipeline's ground storeys hold the sill rule (070 H1, 062's numbers, `src/city/facades/`). |
| `stacks.test.ts` | (b) delete | Stage 5's pieces, turns and placements (070 F2, `src/city/buildings/`). |
| `escapes.test.ts` | (b) delete | Stage 7's fire escapes and their guarantee (070 H2, `src/city/facades/`). |
| `facing.test.ts` | (b) delete | Stage 5's fronts and turns (070 F1 and F2, `src/city/buildings/`). |
| `colourway.test.ts` (the ladder cases) | (b) delete | Stage 5's colourway rule (070 F1, `src/city/buildings/`). |
| `polygon.test.ts` (the `townLayout` lot cases) | **(c) delete** (read again in A2c's review, `reviews/081a2c-delete-ladder.md`) | Its four cases test `pickBuildings`, which nothing calls once `applyModels` is gone, so they test deleted use, not a kept rule. The neighbour rule they touched is held by the pipeline's `src/city/buildings/stage.test.ts` row-neighbour case. |
| `placeholders.test.ts` | (a) re-point | `pickPlaceholders` is kept: `models3d.ts` uses it for the pipeline city. At most 2 cases are re-pointed to a small typed lots fixture, and the rest of its ladder cases are deleted. |
| `plan3d.test.ts`, `tilecity3d.test.ts` | stay | String checks only. |
| `styleguide`, `stylepin`, `dressing`, `lighting`, `facade`, `calibration`, `relight3d`, `kitpin`, `daytoggle` | stay | They build no ladder town. If a deletion breaks one of them, A2c's builder sorts that case by the same rule and lists it. |

**The rule for (b).** A (b) case goes only if a pipeline test holds the same rule. A2c's report names that test for each (b) file. If none holds it, the builder **stops and reports**, and the case becomes (a), counted in the cap. If the code a (c) case tests is still reached by the pipeline after all (A2a's reach report says otherwise), the builder stops and reports too.

### A2d · `?view=3d` on a schematic puzzle opens the 2D map (ui). Branch `ticket/081a2d-view3d-fallback`
**Goal.** Once the ladder town is gone, `?puzzle=<id>&view=3d` on a schematic puzzle still plays, on the 2D map, and says why in the console. A `city=` route still opens the 3D renderer.

**Acceptance criteria.**
1. [ ] `src/main.ts` asks for the 3D renderer only when the address carries a `city=` route (`tiles`, `plan`, with or without `sheet=1`) or, from U1 on, when a city puzzle is open. Otherwise it opens the 2D map and logs "3D view: this puzzle has no city form yet". **test**: 1 case (a pure helper, `wants3d(search, puzzleKind)`).
2. [ ] `?assets=` is unchanged. **test**: 1 case.

**Files.** `src/main.ts` (the view branch only), a new pure helper and its test in `src/ui/`. Merges before A2c.

### A2c · Delete the ladder town (renderer). Branch `ticket/081a2c-delete-ladder`
**Goal.** The ladder's 3D town is gone: the files and functions listed under *Deleted files* and *Ladder-only functions*, and their tests. The pipeline city, the tile sheet, the asset gallery and the 2D game work as before.

**Acceptance criteria.**
1. [ ] **Deleted.** The files under *Deleted files*, the ladder-only functions A2a's report found unreached, `renderer.ts`'s ladder branch, `?gallery=`, `?fronts=1`, and the `cam=street` branch that reads the ladder's `Town`. `plan3d.ts`'s own street camera stays. **no test**.
2. [ ] **The grep.** No file under `src/` imports a deleted file, and `kitunits.ts` imports no three and no DOM. **test**: 1 case in a new `src/render3d/ladderpath.test.ts`.
3. [ ] **The routes.**
   - `?view=3d&city=tiles` builds the pipeline city as before. **test** (existing `plan3d.test.ts` digest).
   - `createMapRenderer3d` with no `city=` route throws a named error that A2d's branch never reaches. **test**: 1 case.
4. [ ] **Tests go with their code**: the ladder's tests named under *Deleted files*, and A2b's (b) and (c) cases (the sort above, which also drops 2190cc5's fixture), each listed in the report. For each (b) file, the report names the pipeline test that holds its rule. The test count falls. **no test**.
4b. [ ] **A2b's one re-point:** at most 2 `placeholders.test.ts` cases on a typed lots fixture. **test**: at most 2 rewritten. With criteria 2, 3 and 5, the PR adds about 2 and rewrites at most 4.
5. [ ] **`ASSET_GALLERY_USES` loses "ladder".** The architect committed that `src/core/assetgallery.ts` line on this branch (acfdbb7) before the builder starts, and the typecheck is red until this criterion is done. The builder fixes, with no other change:
   - `assetcatalogue.ts`: its `add("ladder", ...)` lines (86 to 91) go;
   - `assetcatalogue.test.ts`: lines 154 to 159, 327 and 361. The ladder walk goes, and each case that used "ladder" as a sample use takes another use with the same shape, for example "tech";
   - `src/ui/assetgallerylogic.ts`: the `ladder` row of `USE_LABELS` only;
   - `src/ui/assetgallerylogic.test.ts`: lines 95 and 143, the sample use only ("ladder" becomes "tech" or another real use, with the same assertions).

   074's pinned rows change only in the use column. **test**: at most 4 rewritten (the assetcatalogue and assetgallerylogic cases whose sample use changes), counted with criterion 4b's 2. The PR stays at or under 15.
6. [ ] **The guide and grammar.** Lines that describe only the ladder's town are deleted or marked as history. `docs/city-style/decisions.md` keeps every entry, and drift checks of deleted lines go with them. **no test**: the reviewer reads the diff.
7. [ ] **`tickets/rules-coverage.md`:** the "037 C" entry on the Relight row points to E2. This is the architect's edit, committed with this section. **no test**.
8. [ ] **The browser** (the main session):
   - `?view=3d&city=tiles` at 6 x 6 seeds 1 and 3, with `cam=street` and `light=night`;
   - `city=tiles&sheet=1`;
   - `?assets=city-pack`;
   - `?puzzle=09-shrine-circuit` (2D) and `?puzzle=09-shrine-circuit&view=3d` (the 2D map, with the console line).

   **browser**.

**Files.** `src/render3d/` (deletions, `renderer.ts`, the kept files' ladder-only functions, the deleted files' tests); `src/ui/assetgallerylogic.ts` and `assetgallerylogic.test.ts` (criterion 5's "ladder" lines only: the ui's folder, named here so it is in scope); `docs/city-style/*.md` and `docs/city-grammar.md` (ladder-only lines). One `src/city/` line is in scope too: **`src/city/mass/lots.test.ts`, its `TERRACE_BAYS` import line only.** It now reads from `../buildings/constants`, because `town.ts`, where it lived, is deleted. The value is unchanged and no case changes. A2c's review found this needed and correct; L2a had already noted the test reads the ladder's `TERRACE_BAYS`. **Must not:** any other `src/city/` line, `src/render/`, `src/play/`, any other `src/ui/` line, `tests/playtest/`, `tools/`. If a deletion needs one of these, stop and report: that is a re-cut.

### B1 · CK17, the street rule and roof structures, designed (puzzle-designer; a note). **Done** on `ticket/081b1-roof-spans`
`docs/design/081-B1-roof-spans.md`, with Josh's answers at the top. Its questions 1 to 5 are answered (see "Josh's answers on B1 and its pre-check").

### B1p · "pre-check 081 B1" (pipeline-designer). **Done** on `ticket/081b1-roof-spans`
`docs/design/081-B1-precheck.md`. The verdict was "mostly holds", with three findings. Josh answered question A ("Tall poles too"). Findings 2 and 3 are taken into B1b; finding 1 into PK1, PK2 and K2d.

### B1b · CK17 amended to Josh's B1 answers (puzzle-designer; a note). Branch `ticket/081b1-roof-spans`
**Goal.** CK17 says what Josh answered, so that B1q can measure it and K2d can be cut from it.

**Acceptance criteria.** All **no test**.
1. [ ] **CK17a, where roof structures stand:**
   - on every street corner roof, as scenery, used or not (Q3);
   - on mid-row roofs as well (Q4), only while a puzzle that uses one is played ("Only when used (Recommended)"); roof spans only where a job uses them;
   - the keep square corrected to the pre-check's 26 props on seed 1.
2. [ ] **CK17d:**
   - over a junction, a roof span may go roof to roof, or roof to a pole whose **model** clears `ROOF_JUNCTION_FLOOR_M` 7.5 m at the junction's edge (B1p-A), read from the pick PK1 types;
   - the fail line is rewritten on that basis, since storey count was the pre-check's finding 1 and is not the test;
   - "street cells within one cell of the junction" is read as carriageway and crossing cells only (finding 3).
3. [ ] **CK17e, nodes on a roof:** any node type (Q1, "Anything"), each with its attachment count.
   - A roof lamp is lit through its roof span. It is not a drop, and Q12 still keeps drops on the pole side.
   - A roof feed stands outside the district at the far end of the one span that enters it (Q10's side kept).
4. [ ] **CK14 for roofs:** roofs on the blocks one street beyond the district may carry the job (Q5, "Neighbouring blocks too"). Say how far "one street beyond" reaches: the blocks across each district street, and the diagonal block across a junction. Say whether the feed's entering span may start from such a roof.
5. [ ] **T-2 (Q2):** for the street layer, the note words the roof clause: "on foot along pavement or road, or by a climb at its building". **Puzzle 15** is listed as a rework (CK14's feeds).
6. [ ] **Ids and fields** for the architect, updated: `CityRoofMast` (with a `row: "corner" | "mid"`), the roof span kind, `{ roof }` as a place, `roofKeep`, and the per-pole model field (PK1).

**Files.** `docs/design/081-B1-roof-spans.md`.

### PK1 · The ground poles' mix and heights in `src/core/` (lead-architect). Branch `ticket/081pk1-pole-table`
**Why.** Josh, B1p-A: "Tall poles too". Stage 6 may import only `src/core/` and `src/city/`, but the pole choice (`poleAt`) and the attachment heights live in merged 071 B's `src/render3d/powerkit.ts`. This is a small re-cut of 071 B. The values don't change, and 071 B's pins are kept.

**Goal.** `src/core/powerpoles.ts` holds, as typed data:
- `GROUND_POLE_MIX`: the three keys, in `POWER_MIX`'s order;
- `GROUND_POLE_ATTACH_UP_M`: each key's three attachment heights (`up`, m), copied from `POWER_POLES` at a2f819e with the source line.

`CityCircuitLayer` gains `poleModels: Readonly<Record<string, string>>` (pole id to key), which K2d writes. The choosing rule stays logic, and logic doesn't belong in core: K2d implements it in `src/city/circuit/` as `poleAt` does (`stableHash` from `src/city/pipeline`, which is the same FNV-1a as `src/render/city.ts`'s), so stage 6 and the renderer give each spot the same pole.

**Acceptance criteria.**
1. [ ] The table and the layer field are typed. **no test**: they name values, and PK2's pin holds them equal to `powerkit.ts`.

**Files.** New `src/core/powerpoles.ts`, `src/core/cityplan.ts` (`CityCircuitLayer`), `src/core/index.ts`.

### PK2 · `powerkit.ts` reads the mix and heights from core (renderer). Branch `ticket/081pk2-powerkit-core`
**Goal.** No change Josh can see.
- `POWER_MIX` is `GROUND_POLE_MIX`.
- `POWER_POLES`' `up` values equal `GROUND_POLE_ATTACH_UP_M`.
- K3 draws the model `layers.circuit.poleModels` names at each pole, rather than calling `poleAt` itself.

**Acceptance criteria.**
1. [ ] **The pin.** For each mix key, `POWER_POLES[key].attach_m[i].up` equals `GROUND_POLE_ATTACH_UP_M[key][i]`, and `POWER_MIX` equals `GROUND_POLE_MIX`. **test**: 1 case.
2. [ ] **The same pick.** On 20 fixture spot ids (including `<run>#<n>` forms), `poleAt(POWER_MIX, id)` equals `src/city/circuit/`'s pick. This case is added once K2d exists: PK2 adds it if K2d is in by then, and otherwise K2d's builder adds it in `src/city/circuit/`. **test**: 1 case.
3. [ ] Every existing `powerkit.test.ts` case passes unedited. **test** (existing).

**Files.** `src/render3d/powerkit.ts` (the two reads from core), `powerkit.test.ts`.

### B1q · "pre-check 081 B1b" (pipeline-designer). Branch `ticket/081b1-roof-spans`
**Why.** Mid-row roofs (Q4), the real pole pick (B1p-A), roof nodes of every kind (Q1) and neighbouring-block roofs (Q5) are all unmeasured.

**What it measures**, on the 20 named runs by a script run on demand (never in `npm test`), with mid-row structures only where a job uses one ("Only when used"):
- **Mid-row roof places:** how many there are, how many clash with stage 7's roof exit, water tower, billboard and roof props (H3, H3b), and H4's keep-square work on mid-row and corner roofs;
- **Finding 1's table on the real pick** (PK1's data, `poleAt`'s rule): roof-to-pole places over junctions that clear 7.5 m;
- **The pilot's fits** with any node on a roof and neighbouring-block roofs: whether 04, 11 and 12 come down to 1 block, and confirming 15 still fails CK14;
- **Roof spans:** whether roofs one street beyond the district let any roof span cross another job's district edge in a way CK14's checks must catch.

If it does not report "holds", its note goes to Josh before K2d and H4 are cut in full. **Files.** `docs/design/081-B1q-precheck.md`.

**Done (23 Nov 2026): holds.** Josh answered its question, "Only where clear (Recommended)". Its corrections are folded in:
- H4 covers corner roofs only;
- K2c's CK14 line gains the neighbouring-roof exception;
- the mid-row clearance check is P1's;
- the Apocalypse figure is "0 of 594", not "0 of 1,801". This ticket never quoted it, so the fix is B1b's CK17d line, the designer's.

### C1 · The city puzzle validator (lead-architect). Branch `ticket/081c1-city-puzzle-loader`
**Goal.** A city puzzle file (`puzzles/city/<id>.city.json`, type `CityPuzzle`) is checked for shape before any plan is built. The place checks against the city are K2c's.

**Acceptance criteria.**
1. [ ] `validateCityPuzzle(json)` (`src/core/load.ts`) returns every problem, one message each. It checks:
   - `city`'s four fields, and `district` as 1 to 4 distinct ids;
   - every node has a `place` of exactly one kind and no `pos`;
   - every line has a `run`: a `spans` list, at most one of `drop` and `lead`, and non-empty `spans` unless it has a drop or a lead;
   - a fault's `span` only on a `damaged-cable`, and in its line's `spans`;
   - `scope` is "map";
   - everything `validatePuzzle` checks that needs no `pos`.

   **test**: 4 cases (a good file, then one bad file per group).
2. [ ] `loadCityPuzzle(json)` throws with the messages, as `loadPuzzle` does. **test**: 1 case.
3. [ ] `loadPuzzle` still refuses the city shape. **test**: 1 case.
4. [ ] `puzzles/SCHEMA.md` gains "City puzzles (ticket 081)": the fields, the ids, CK13 as changed, the folder and the `.city.json` name. **no test**.

**Files.** `src/core/load.ts`, `load.test.ts`, `citycircuit.ts`, `puzzles/SCHEMA.md` (the new section only).

### K2a · Stage 6, poles and spans (grid-simulator, pure). Branch `ticket/081k2a-circuit-poles`
**Re-cut 23 Nov 2026.** The builder found that adding circuit to `BUILT_STAGES` breaks 13 tests outside `src/city/circuit/`. K2a's 9 cases plus those rewrites would come to 16, over the cap. So K2a lands without the `BUILT_STAGES` line, and K2a2 switches the stage on.

**Goal.** `src/city/circuit/` builds `CityCircuitLayer`'s poles, spans and `keep` as CK1 to CK6 and CK8 say: a stage definition the runner can take, but not yet in `BUILT_STAGES`. **CK7 (the 4.2 m floor) moves to K2d.** It needs each pole's model (PK1's data plus K2d's pick).

**Acceptance criteria.**
1. [ ] The stage is a pure function of the layers before it, with a digest and a flat picture. Its tests run it directly on stages 1 to 5 of 6 x 6 seed 1, one-way on, through the module cache. **test**: 1 digest pin.
2. [ ] CK1, CK2 and CK3. **test**: 3 fixture cases, on CK2's and CK3's "Fails" lines.
3. [ ] CK4, CK5 and CK6. **test**: 3 fixture cases.
4. [ ] (moved to K2d)
5. [ ] CK8: one connected network. **test**: 1 case on 6 x 6 seed 1, one-way on.
6. [ ] The builder prints seed 1's counts once, in its reply: 562 poles, 126 corner spans, 74 crossings and 49 nudged. **no test**.
7. [ ] `circuitPoints` (`src/city/pipeline/readable.ts`, its body only) reads the layer when it is there, and gives `EMPTY_CIRCUIT` when it is not. Until K2a2, every plan is one without it. **test**: 1 case.
8. [ ] **No test outside `src/city/circuit/` changes.** `src/city/stages.ts` is unchanged. **test** (existing; the gate).

**Files.** New `src/city/circuit/`; `src/city/pipeline/readable.ts` (`circuitPoints` only). The `BUILT_STAGES` line on `ticket/081k2a-circuit-poles` (e2f4d4d) comes out of this PR and goes to K2a2.

### K2a2 · Stage 6 switched on (grid-simulator). Branch `ticket/081k2a2-circuit-on`, from K2a's branch, opened as a PR after K2a merges
**Goal.** The runner builds stage 6 between buildings and facades on every plan, and every existing test knows it. Josh sees stage 6's picture at `?city=plan&stage=6`.

**Acceptance criteria.**
1. [ ] `BUILT_STAGES` (`src/city/stages.ts`) holds the circuit stage after buildings. **no test**: its one line; criterion 3's cases hold it.
2. [ ] `PROFILE_STAGES` (`src/city/testing/namedcities.ts`) adds "circuit" after "buildings" in the `facades`, `ground` and `clean` profiles. That restores the six shared-profile tests unedited: `namedcities.test` (the lists and `sharedEra`), `eraview.test`, and the tech, holdout and ruin `named.test`. **test** (existing, unedited).
3. [ ] **The tests that said circuit is not built** are rewritten to say it is. Each keeps its other assertions, and nothing else in them changes. **test**: at most 8 rewritten:
   - `src/city/facades/stage.test.ts`: 2 cases;
   - `src/city/ground/stage.test.ts`: 2 cases and its test-double stage list;
   - `src/city/traffic/stage.test.ts`: its stage list and its test-double stage list;
   - `src/city/pipeline/run.test.ts`: 1 case.
4. [ ] Any later stage's digest pin that moves because stage 6 now runs before it is re-taken once and listed. **test**: at most 2 rewritten.
5. [ ] **The era passes see the circuit** (re-cut 23 Nov 2026, after PR #30's CI). With stage 6 built, `circuitPoints` is no longer empty, so the hold-out and ruin passes keep clear of real poles. This is the change K2 was meant to bring (`stage.ts` in both passes: "empty until K2"). Five cases were written for "no circuit until K2":
   - **Digest pins re-taken**, once each, listed with the old and new values. **test**: 2 rewritten.
     - `src/city/holdout/named.test.ts`: the power-and-settle pin on the four pin cities;
     - `src/city/ruin/named.test.ts`: the growth pin, '578cd93e' to the new value.
   - **`src/city/ruin/named.test.ts`, "no circuit on the named runs until K2 ... the under-span set is empty".** This is a stale assumption. It is rewritten to state the real circuit on 6 x 6 seed 1: the under-span set is the one the run now finds (19, given as the expected value). T-1 and T-2 hold on the run, which the file already asserts. Nothing is loosened. **test**: 1 rewritten.
   - **`src/city/holdout/stage.test.ts`, the two T-2 fixture cases** ("a mouth whose wall would seal a pole in is skipped", and "two touching held districts keep both districts' poles joined"). They compare a run with fixture poles against a "free" run with no `circuit` option. Until K2 that free run had no poles; now it takes the real circuit, so it is no longer free: its barricade set is smaller (33) than the fixture run's (38). That is a stale baseline, not a fault. Each free run passes `{ circuit: EMPTY_CIRCUIT }` explicitly, so the case compares what it was written to compare. Every assertion keeps its value and strength. **test**: 2 rewritten.
   - **Not a rule clash, as far as CI shows.** No T-1 or T-2 assertion against the real poles failed. If the builder finds one that does (a real pole sealed in, or covered), it **stops and reports**. That would be a question for Josh about T-1 or T-2 against real poles, not a fix in this PR.
6. [ ] `?city=plan&stage=6` shows stage 6's picture. **browser**.

**The count.** Criterion 3 rewrites at most 8, criterion 4 at most 2, criterion 5 exactly 5, and none are added. That is at most 15, and about 12 as built: the branch at 3c50677 has 3 `it(` lines in its added diff, and the rest are list or assertion edits inside cases. **Import-line-only** edits do not count (A2a's rule). If the builder's total passes 15, criterion 5's two hold-out fixture cases move to a K2a3 PR in the same branch order, and the hold-out `stage.test.ts` stays red only on its branch, never on `main`.

**Files.**
- `src/city/stages.ts` (one entry) and `src/city/testing/namedcities.ts` (`PROFILE_STAGES` only).
- Test lines in four other owners' folders, listed here so they are in scope (test policy rule 6): `src/city/facades/stage.test.ts` (facades), `src/city/ground/stage.test.ts` (landscape), `src/city/traffic/stage.test.ts` (streetscape) and `src/city/pipeline/run.test.ts` (planner). Only the circuit-not-built lines change. Each folder's owner does not edit them in this PR, and the reviewer checks that nothing else moved.
- Any digest pin file of criterion 4.
- **Criterion 5's test lines** in two more owners' folders (test policy rule 6), only the cases named there: `src/city/holdout/named.test.ts` and `stage.test.ts` (holdout-pass), and `src/city/ruin/named.test.ts` (ruin-pass). The K2a2 builder re-takes the pins, because the stage switch moves them and they must be green in the same PR. The pass agents do not edit them here; the reviewer checks that nothing else moved.

**Must not:** any non-test file in those six folders. `src/city/holdout/stage.ts`, `ruin/stage.ts` and `ruin/walk.ts` are not edited: they already read `circuitPoints`.

### K2b · Stage 6, drops, lights, lamp posts and node places (grid-simulator, pure). Branch `ticket/081k2b-circuit-places`
**Acceptance criteria.**
1. [ ] CK9. **test**: 2 fixture cases.
2. [ ] CK10. **test**: 2 fixture cases.
3. [ ] CK11. **test**: 1 fixture case.
4. [ ] CK12's table as `nodePlaceProblems(layer, places)`: a switch on a 2-attachment pole fails, a breaker on a building fails, and two nodes on one place fail. Roof places join in K2d. **test**: 3 fixture cases.
5. [ ] **Digest pins re-taken**, once each, listed with old and new values. **test**: 4 rewritten.
   - stage 6's own pin;
   - three era-pass pins that move because drops and lights now reach the passes (as in K2a2's criterion 5): `src/city/holdout/named.test.ts` (the settle pin), `src/city/ruin/named.test.ts` (the growth pin), `src/city/tech/named.test.ts` (criterion 9's pin and its title).
6. [ ] `keep` holds every pole and light. **test**: 1 case.
7. [ ] Two CK9 and CK10 cases that duplicate others are deleted, and the report names each one and the case that covers it. Removing is welcome (rule 6), and deletions don't count. **no test**.

**Files.** `src/city/circuit/`. Also the **pin lines only** (the expected digest and, for tech, the case title) of `src/city/holdout/named.test.ts`, `src/city/ruin/named.test.ts` and `src/city/tech/named.test.ts` (the holdout, ruin and tech passes' folders, listed under test policy rule 6; added 23 Nov 2026 after K2b's review). No other line in those folders changes.

### K2c · The conversion (grid-simulator, pure). Branch `ticket/081k2c-circuit-convert`. **Done**
**Merged into `main`** (PR #38). Josh, 24 Nov 2026, on a card: **"Merge K2c"**. Review: `reviews/081-K2c-circuit-convert.md` (round 2: meets, must-fix 0). Criterion 2's neighbouring-roof case waits in K2d2, as written there. The review's round-2 note (two lines whose spans each end at one pole with a drop there are refused, "also carries") stands as built: it is CK13 as written. K2d2 says what it means for roofs.

**Re-opened by section S (24 Nov 2026).** S1 changes the conversion: criterion 3's "none added" flips (the file's ids stay; hidden ids are added and listed in `hidden`), and criterion 4's "plays the same" case moves with P0's raised capacity. Both cases are rewritten by S1, not here.

**Goal.** `convertCityPuzzle(cityPuzzle, plan): CityPuzzleConverted` turns a city puzzle into a plain `Puzzle` that `src/grid/` runs unchanged (CK15), with the places, runs and cut spans the 3D view needs. Carrier poles (answer 5) never become nodes.

**Acceptance criteria.**
1. [ ] **CK13 as changed** (`runProblems`):
   - each run's spans join end to end, from its `from` node's place to its `to` node's place, then to the drop or lead if it has one;
   - a carrier pole holds no node of the job;
   - no two lines share a span;
   - a fault's span is in its line's run.

   A run that goes along, round a corner on a carrier and on is **valid**. **test**: 3 fixture cases: a valid bent chain, a broken chain, a shared span.
2. [ ] CK14's district checks. **test**: 2 fixture cases.
   - The blocks touch.
   - Each line uses only the district's spans, its feed's one entering span, **or roof spans to and between roof structures on the blocks one street beyond the district** (Josh, B1-Q5: "Neighbouring blocks too"). The merged line read "only the district's spans or its feed's span", which would reject the 1-block fits of 04 and 12.
   - Each feed stands outside, joined by one entering span.
   - One of the two cases is a line on a neighbouring block's roof, which passes. Until K2d types roofs, that case waits in K2d, and K2c's second case is a pole line past the edge, which fails.
3. [ ] CK15's steps 1 to 6. The output passes `validatePuzzle` and has **the same node and line ids as the file**, none added. Each `pos` equals its place's metres over `CELL_M` within 1e-4. **test**: 2 cases.
4. [ ] **Plays the same.** `city-two-ways-round` is written as a `.city.json` test fixture from its note's place table, with its corner junctions turned into carriers where the note allows. It converts to a `Puzzle` whose check block replays as the schematic's does. **test**: 1 case on 6 x 6 seed 1, one-way on.
5. [ ] A problem names the node, line or fault and the CK rule. **test**: 1 case.
6. [ ] No import of `src/grid/` from `src/city/circuit/`, except in tests. **test**: 1 grep case.

**Files.** `src/city/circuit/`.

### K2d · Stage 6: the pole pick, CK7, roof structures and roof spans (grid-simulator, pure). Cut in full 24 Nov 2026, as two PRs: K2d1, then K2d2. **Done**
**Both merged into `main`:** K2d1 by PR #41 (review `reviews/081-K2d1-roof-places.md`, meets, must-fix 0) and K2d2 by PR #42 (Josh, 24 Nov 2026, on a card: **"Merge K2d2 (Recommended)"**; review `reviews/081-K2d2-roof-jobs.md`, meets, must-fix 0). With them, **K2 is done**. K2d1's review left one reading open, not a blocker: a mid-row place's two `pavement` poles are the two nearest, which may both fall on one side. It is P1's to see if a fit needs it.
**From.**
- CK17 as B1b amended it (`docs/design/081-B1-roof-spans.md`, with Josh's 8 roof answers at its top): its "K2 checks" 1 to 10 and its "Fails". Check 11 is P1's.
- B1q's verdict, "holds" (`docs/design/081-B1q-precheck.md`).
- CK7 (Josh, K1 card 7: "The walk's 4.2 m (Recommended)").
- PK1's `GROUND_POLE_MIX` and `GROUND_POLE_ATTACH_UP_M`, and `CityCircuitLayer.poleModels`.
- The `roofMast` pick, Frontier `SM_Prop_Power_Pole_03` (`docs/design/081-component-picks.md`).

**Why two PRs.** B1b's checks come to 14 cases, two days' work in one PR. K2d1 is the layer: what stage 6 writes and judges on its own. K2d2 is the puzzle side: what a job may do with roofs, and the conversion. H4 and K3 need only K2d1; P1 and P2a need K2d2.

**No rule or number changes here, so no pre-check.** Every rule is either CK17 as B1b words it (pre-checked by B1p and B1q: holds) or CK7 (Josh's; pre-checked in K1). Every constant is B1b's: `ROOF_MAST_INSET_M` 0.6, `ROOF_MAST_ATTACH_MIN_M` 2.0, `ROOF_MAST_KEEP_M` 1.2, `ROOF_SPAN_MAX_M` 40, `ROOF_JUNCTION_FLOOR_M` 7.5 and `ROOF_CLEAR_M` 1.0, all in `src/city/circuit/constants.ts`. This cut makes three readings, none of them a new number:
- **The roof end's height.** The pick has no cross-arm, so it has no measured attachment. Stage 6 judges every roof end at `deck_y_m` + `ROOF_MAST_ATTACH_MIN_M` 2.0 m, the floor B1p and B1q measured at. A higher end only raises the span, so every height check that passes at 2.0 m passes on any arm drawn at or above it. K3 draws its code arm there or higher.
- **The pole end's height.** It is the lowest of the pole's three attachments on its `poleModels` key (`GROUND_POLE_ATTACH_UP_M[key]`). B1q found that the choice of attachment changes nothing.
- **The sag.** Every span hangs at `SAG_RATIO` 0.04 of its length, roof spans included (059's figure, as CK7 uses). It follows the kit's parabola (`powerkit.ts`: `y = ya + (yb - ya)t - 4 * 0.04 * len * t(1 - t)`). `SAG_RATIO` is copied into `constants.ts` with its source line.

**The stop rule.** The builder stops and reports ("stop 081 K2d1", with the branch) if a CK7 or CK17 check fails on 6 x 6 seed 1 against stage 6's own layout, or if a rule can't be built as worded. It doesn't tune a number or drop a check to make seed 1 pass.

**Can a roof structure be the shared end of two lines? No word from Josh is needed.** The answer follows from CK13 as written and from CK17e, as K2c built them:
- **With a node on it, yes,** as at any node's place. Every line of that node ends there, each on its own roof span. CK17e's attachment counts apply, and no two lines share a span.
- **With no node on it, no.** It is a carrier, and a carrier carries one run. CK13 as changed says "the job uses no other attachment there", and K2c's "also carries" check applies to roof carriers as to poles (K2d2 criterion 2).
- **The pole case in K2c's review has no roof twin.** There, two lines run on spans to one pole and each drops off it, and the check refuses it. A drop never leaves a roof, and a roof lamp is lit by its span (CK17e). So no line can end at a roof that holds no node.
- If P1's fit finds a pilot puzzle that fits only with a roof carrying two runs, that goes to Josh then, as a question on CK13. It is not changed here.

#### K2d1 · The pole pick, CK7, roof structures and roof span places (grid-simulator, pure). Branch `ticket/081k2d1-roof-places`
**Goal.** Stage 6's layer names every pole's model and holds CK7 on the real models. It lists every roof structure place (`roofs`, corner and mid-row), every offered roof span place (`roofSpans`) and the corner places' keep squares (`roofKeep`), each judged by CK17a to d. At `?city=plan&stage=6`, Josh sees the corner roof structures marked on stage 6's picture.

**Acceptance criteria.**
1. [ ] **The pole pick.** `poleModels` names every pole with a `GROUND_POLE_MIX` key, picked by `poleAt`'s rule: `stableHash(id) % 3`, or its `<run>#<n>` stepping. `stableHash` comes from `src/city/pipeline`, and the pick is an exported function of `src/city/circuit/`. **test**: 1 case, PK2's criterion 2 ("the same pick"):
   - on 20 fixture spot ids, `<run>#<n>` forms included, `poleAt(POWER_MIX, id)` equals the circuit's pick;
   - the case is in `src/city/circuit/`, and only the test imports `src/render3d/powerkit.ts` (which imports no three and no DOM);
   - that every pole is named is asserted in criterion 10's rewritten case.
2. [ ] **CK7 on the real models.** Every along, corner and crossing span's lowest point is at least 4.2 m (`WALK_FLOOR_M`, `FURN_MAX_H_M` 3.2 m + 1 m). Each end is at its pole's model height, and the span sags at `SAG_RATIO`, as the readings above say. `circuitProblems` reports a failure as "CK7". **Fails:** a crossing whose low point is under 4.2 m. **test**: 1 fixture case.
3. [ ] **CK17a, corner places** (B1b K2 checks 1 and 2).
   - A `row: "corner"` `CityRoofMast` stands on every street corner roof: a `corner` column whose two open sides both face a street.
   - There is at most one per column, at the corner the two sides share, `ROOF_MAST_INSET_M` in from both street walls.
   - `deck_y_m` is the roof piece's base plus `ROOF_DECK_M` 0.5 m. The builder reads `ROOF_DECK_M` from `src/city/facades/roofkit.ts`, or copies it with its source line.
   - `keep_half_m` is `ROOF_MAST_KEEP_M`.
   - `roofKeep` holds exactly the corner places' squares.

   **Fails:** a street corner roof with no structure; a place on a corner column with a lane or park side; a place off its inset. **test**: 1 fixture case.
4. [ ] **CK17a, mid-row places** (B1b K2 check 1).
   - A `row: "mid"` place stands on every `mid` column whose open front faces a street: one per column, 0.6 m in from that wall, at the middle of the front.
   - Every such place is listed. Whether stage 7 left one clear is P1's to check (Josh, B1q: "Only where clear (Recommended)"), because stage 6 can't see stage 7.

   **Fails:** a mid place whose front is not on a street. **test**: 1 fixture case.
5. [ ] **CK17b, a roof span's ends and kind** (B1b K2 check 3).
   - At least one end is a roof structure. The other is a roof structure or a pole (6c).
   - The id is `span:<a>~<b>`, with the two ids sorted.
   - `over` is `pavement`, `street` or `junction`, with `street` or `junction` set to match.
   - A mid-row place has no `junction` span.
   - No roof span is in `spans`.

   **Fails:** a diagonal with two pole ends listed in `roofSpans`; a roof span listed in `spans`. **test**: 1 fixture case.
6. [ ] **CK17b, where a roof span passes** (B1b K2 check 4).
   - It is at most `ROOF_SPAN_MAX_M` long.
   - In plan it lies over street cells only (pavement, parking, lane, junction, crossing), apart from its own ends' cells.
   - It crosses at most one street or one junction, and never a block.
   - Pole spans never pass over a junction (Q45). K2a's CK6 case already holds this, so there is no new case for it.

   **Fails:** a 45 m span; a span over two streets; a span over a block. **test**: 1 fixture case.
7. [ ] **CK17c, which places are offered** (B1b K2 check 7).
   - **`pavement`** (B1b's `down`): exactly the two nearest poles of each own-block pole line on the place's street sides.
     - A corner place gets the end slot and the next pole along on each side: 4, 2 or 0.
     - A mid-row place gets the nearest pole either side along its one side: 2 or 0.
   - **`street` and `junction`**: to every roof place within 40 m on the facing block, or, for a corner place, on the diagonal block across the junction it faces. Also to that block's fixed poles (end slots, landings, crossing poles) within 40 m, on the pavement that faces this place. No mid-line slot is offered.
   - A place is offered only where criteria 6, 8 and 9 pass.

   **test**: 1 fixture case: one corner place's `pavement` set is exactly its 4, and a mid-row place has no `junction` place.
8. [ ] **CK17d, heights** (B1b K2 check 5).
   - Every roof span's lowest point is at least 4.2 m.
   - Over the junction zone it keeps `ROOF_JUNCTION_FLOOR_M` 7.5 m, with each pole end at its `poleModels` height (Josh, B1p-A: "Tall poles too"). The zone is the junction square plus the carriageway and crossing cells within `CELL_M` of it, never pavement cells (B1p finding 3).

   **Fails:** a roof-to-pole span over a junction ending on an Apocalypse pole (5.86 m). **Passes:** the same span on a Palm pole, where it clears; a `pavement` place over a pavement cell beside a junction, which is not judged against 7.5 m. **test**: 1 fixture case.
9. [ ] **CK17d, clearances in plan** (B1b K2 check 6).
   - Where a roof span passes over a pole span in plan, it is at least `ROOF_CLEAR_M` above it there.
   - In plan it passes no pole, street light or lamp-post place within 1.0 m, except at its own end.

   **test**: 1 fixture case.
10. [ ] **Seed 1, and the pin.** The R-1 to R-7 case of `circuit.test.ts` is rewritten so that:
    - stage 6's digest is re-taken once, from `a6b0af56` to the new value, and listed in the report;
    - `poleModels` names every pole;
    - nothing on 6 x 6 seed 1, one-way on, fails CK1 to CK8, CK7 or CK17a to d.

    **test**: 1 rewritten.
11. [ ] **Seed 1's counts**, printed once in the reply. Differences from the sketch numbers are reported, never tuned to. **no test**.
    - corner places (B1: 124, on 35 of 38 blocks) and mid-row places (B1q: 990);
    - roof span places by `over`;
    - roof-to-pole places offered over a junction (B1q: 56 of 82);
    - the lowest CK7 point (K1: 5.20 m, an Apocalypse crossing).
12. [ ] **What does not change.** `poles`, `spans`, `drops`, `lights`, `posts`, `keep` and `circuitPoints` stay as they are. A roof structure is not on the ground (B1b section 5), so stages 8 and 9 don't see it. Whether an era's T-1 covers the corner structures is a reading for 073 D2's owner (B1b section 6), not this section. **test** (existing): every digest pin other than stage 6's passes unedited.
13. [ ] **The picture.** Stage 6's picture and `CIRCUIT_LEGEND` mark the corner places. Mid-row places and roof spans stand only when used, so they are not drawn. **browser**: `?city=plan&stage=6`.

**Count.** 9 added and 1 rewritten, 10 in all. The cases go in `circuit.test.ts`, which already builds 6 x 6 seed 1 once, or in a new `src/city/circuit/roofs.test.ts` that runs under 2 s (the builder gives its time).

**Files.** `src/city/circuit/` only. `src/core/` is the architect's: the types under *Interfaces* were committed on the goal branch on 24 Nov 2026.
- **The digest pin it moves:** stage 6's own, in `src/city/circuit/circuit.test.ts` (`a6b0af56`).
- **The pins it should not move** (criterion 12). Each reads stage 6 only through `poles`, `spans`, `drops`, `lights`, `posts`, `keep` or `circuitPoints`, and K2d1 leaves all of those alone:
  - stage 8's pins in `src/city/ground/stage.test.ts`;
  - `GROUND_PINS` and the stage 9 `PINS` in `src/city/traffic/stage.test.ts`;
  - stage 7's pins in `src/city/facades/stage.test.ts` (stage 7 reads nothing of stage 6 until H4);
  - the era pins as I2 left them: tech "criterion 9" (`7c991996`), holdout "power and settle" (settle `aa731cfa`) and ruin "growth" (`080ddf44`).

  If one of these moves, K2d1 has changed something it must not. The builder **stops and reports**. That is a re-cut, not a re-take, and no line in those folders is in scope.

#### K2d2 · Roof nodes, runs through roofs, CK14 for roofs, the conversion (grid-simulator, pure). Branch `ticket/081k2d2-roof-jobs`, after K2d1 merges
**Goal.** A city puzzle may stand any node on a roof structure, run its lines through roof spans and roof carriers, and use roofs on the blocks one street beyond its district. It converts to a plain `Puzzle` that `src/grid/` runs unchanged.

**Before the builder starts (the architect, on this section's branch, not the goal branch).** The type change must land in the same PR as the code it reaches:
- `CityRoofPlace` (`{ roof }`) joins `CityNodePlace`;
- `validateCityPuzzle`'s place kinds (`src/core/load.ts`) take "roof", with its message.

Until criteria 1, 5 and 6 are done, the typecheck is red in `src/city/circuit/convert.ts`, `src/city/circuit/checkplaces.ts` and `src/render3d/overlay.ts` (`placePoint`).

**Acceptance criteria.**
1. [ ] **CK17e, `nodePlaceProblems` on a roof** (B1b K2 check 9; Josh, B1-Q1: "Anything"). Any node type may stand on a place in `roofs`, one node per roof. Each needs this many roof span places the job may use (criterion 3):
   - breaker, fuse box or battery: 2;
   - switch, relay or spring: 3;
   - junction: as many as its lines, at least 3;
   - lamp: 1, never a drop;
   - feed: 1, and only on a roof outside the district (a neighbouring block), with its one entering span.

   K2b's CK12 cases pass unedited. **Fails:** a switch on a roof with 2 usable places (3 passes); a lamp on a roof reached by a drop; a feed on a district roof. **test**: 1 fixture case.
2. [ ] **CK13 through roofs (`runProblems`).**
   - A run may start or end at a roof node, and a roof span joins the chain like any span.
   - A roof structure between two spans of a line is a carrier. It holds no node of the job and carries one run: K2c's "holds node" and "also carries" checks apply to it as to a pole (see *Can a roof structure be the shared end of two lines?*).
   - A run never ends on a drop or a lead at a roof.

   **test**: 1 case. A chain from a pole over a `pavement` span to a roof (a carrier), over a `junction` span to a roof, then over a `pavement` span to a pole, passes. A second line through the same roof carrier fails with "also carries".
3. [ ] **CK14 for roofs (`districtProblems`; B1b K2 check 10; Josh, B1-Q5: "Neighbouring blocks too").** This is the case K2c's criterion 2 left waiting.
   - A line may use roof spans whose roof ends are on the district or on a neighbouring block. A neighbouring block is one across one district street (`sides[*].across`), or diagonally across a junction at a district block's corner, and nothing further.
   - Every roof span a job uses has at least one end on a district block.
   - The job uses no pole, pole span or drop of a neighbouring block.
   - The feed's one entering span may start from a neighbouring roof.

   **test**: 1 case. A line to a neighbouring block's roof passes; a roof two streets away fails; a neighbouring block's pole fails.
4. [ ] **CK17d in one job** (B1b K2 check 10). No two roof spans a job uses cross in plan, and none passes within 1.0 m of a roof structure it does not end at. So a job uses at most one `junction` span over any one junction. **Fails:** two `junction` spans over one junction. **test**: 1 fixture case.
5. [ ] **CK15 for roofs (`convertCityPuzzle`).**
   - A roof node's `pos` is its structure's point over `CELL_M`, within 1e-4.
   - `places` keeps `{ roof }`.
   - A `damaged-cable` may name a roof span as its cut (CK17f).
   - `decor` adds nothing for roofs: no unused roof span and no structure (see open question 4).

   **test**: 1 case.
6. [ ] **The overlay's one line.** In `src/render3d/overlay.ts`, `placePoint` gains the `{ roof }` branch only: a roof node at its structure's `x_m`, `deck_y_m` and `z_m`. This keeps the typecheck green. **no test**: the typecheck covers it, and E2's overlay cases.
7. [ ] **No `src/grid/` import** from `src/city/circuit/` outside tests. **test** (existing: K2c's grep case).

**Count.** 5 added, none rewritten. Stage 6's layer does not change, so no pin moves. If one does, the builder stops and reports.

**Files.** `src/city/circuit/`. Also **`src/render3d/overlay.ts`, the roof branch of `placePoint` only**. That is the renderer's folder, named here so it is in scope, as A2c named the ui's lines. No other renderer line changes. `src/core/` is the architect's (above).

### I2 · Stage 8 keeps clear of the circuit (landscape, pure). Branch `ticket/081i2-ground-clears-circuit`. **Done**
**Merged into `main`** (PR #39). Josh, 24 Nov 2026, on a card: **"Merge I2"**. Review: `reviews/081-I2-ground-clears-circuit.md` (meets, must-fix 0). As built: 2 added, 7 rewritten.

**Owner stays `landscape`** (23 Nov 2026): `src/city/ground/` is its folder alone (`.claude/agents/landscape.md`), so no other agent takes it over. If this session cannot spawn the `landscape` type, the main session spawns a general agent whose prompt is `.claude/agents/landscape.md` in full, with its model (sonnet) and tools, as it already does for agents missing from the list. It stays in `src/city/ground/` and reports as landscape. If even that is not possible, the section waits, and the question of who owns stage 8 goes to Josh. It is not reassigned by the architect.
**Acceptance criteria.**
1. [ ] Stage 8 reads `layers.circuit.keep` into its keep-point list. **test**: 1 fixture case.
2. [ ] On seed 1, no stage 8 piece stands within `FURN_KEEP_M` of a pole or light. **test**: 1 case, 6 x 6 seed 1, one-way on.
3. [ ] **Digests re-taken once**, listed with old and new values. **test**: 4 or 5 rewritten in all:
   - stage 8's own pins (3, as built);
   - in `src/city/traffic/stage.test.ts`: the case at lines 77 to 80, which pins the same ground digests on seeds 1, 2, 3 and 8 that I2 moves, and the four stage 9 `PINS` (784fd70b, 79767c68, 4528000c, 0f11c5ab), which move with them because traffic places its pieces around ground props. That is 1 or 2 cases; the builder reports which.
   - the three era digest tripwire pins that stage 8's change reaches (added 24 Nov 2026 after CI on PR #39, as K2b was amended): `src/city/tech/named.test.ts` "criterion 9, the digest pin (R-4)" (1873844c), `src/city/holdout/named.test.ts` "pins, on the four pin cities ... power and settle parts" (seed 1 settle; power unchanged) and `src/city/ruin/named.test.ts` "pins ... growth part" (f75f2d1b). 3 cases.

   With criteria 1 and 2 (2 added), the PR has 2 added and 7 or 8 rewritten.

**Files.** `src/city/ground/`. Also the **digest values only (ground and stage 9 pins)** of `src/city/traffic/stage.test.ts`: lines 77 to 80, and its four stage 9 `PINS` (the streetscape's folder, under test policy rule 6; added 23 Nov 2026, as K2a2 and K2b did). No other line there changes. Also the **digest pin values only** in `src/city/tech/named.test.ts`, `src/city/holdout/named.test.ts` and `src/city/ruin/named.test.ts`, in the three cases named in criterion 3 (the tech, holdout and ruin passes' folders, under test policy rule 6; added 24 Nov 2026 after CI on PR #39, as K2b was). No other line or case in those files changes.

### H4 · Stage 7's roof pieces keep clear of roof structures (facades, pure). Branch `ticket/081h4-roof-keep`
Cut in full after K2d1 (it reads `roofKeep`, which K2d1 writes).
- **Expected:** stage 7's small roof props keep clear of every **corner** roof structure's keep square (`roofKeep`): 26 props on seed 1, 697 on the 20 runs (B1q). Big props never stand on corner columns (H3's RX).
- **Mid-row roofs are not cleared** (Josh, B1q: "Only where clear (Recommended)"). A mid-row structure stands only where stage 7 has left the roof clear, and nothing on a roof moves for one. P1 checks that.
- **Tests:** 1 fixture case for a corner roof; 1 fixture case showing a mid-row place is never cleared (its props stay); 1 digest re-take.
- **Downstream pin re-takes** (added 24 Nov 2026 after CI on draft PR #64, as K2b and I2 were amended). As built, the props move as expected (26 to 0 on seed 1, 697 to 0 on the 20 runs), and stage 7's own `PINS` in `src/city/facades/stage.test.ts` were re-taken: seed 1 e96db65b to c264e65d, seed 2 25f96f25 to b0402815, seed 3 68430a02 to 00744cfe, seed 8 53f33a18 to 5f077cb3. CI then failed only on three downstream pins that hold the old digests. They are intended, since the props moved, and the builder re-takes each once, listed with old and new values. **test**: 3 rewritten:
  - `src/city/ground/stage.test.ts`, "the digest pins (R-4)": the facades lines of its pins only;
  - `src/city/traffic/stage.test.ts`, "the digest pins (R-4)": the facades lines (`FACADES_PINS`) only;
  - `src/city/ruin/named.test.ts`, "pins, on the four pin cities, the digest of the layer's growth part": the ruin era's growth covers roofs, so it moves with the props.

  **Values only, from a run.** No logic, no other line and no other case in those files changes. Each new value is checked as coming from the moved props and no other change: the builder reports, for each re-taken pin, that with H4's keep squares left out (an empty keep list) the run gives back the old value. A pin that fails for any other reason is not re-taken; the builder stops and reports it.
- **Count.** 2 added (the two fixture cases) and 4 rewritten (stage 7's digest pins, and the three downstream pins).
- **Files** (expected): `src/city/facades/`. Also, as I2 did (test policy rule 6), the **digest pin values only** in the three cases named above: the facades lines of `src/city/ground/stage.test.ts` (the landscape's folder) and of `src/city/traffic/stage.test.ts` (the streetscape's folder), and the growth pin of `src/city/ruin/named.test.ts` (the ruin pass's folder). No other line in those folders changes.

### P1 · The fit tool and the city check (grid-simulator). Branch `ticket/081p1-fit-tool`
**Goal.** `npm run fit puzzles/<NN-slug>.json -- --city 6x6:1:oneway [--blocks <ids>]` searches 6 x 6 seed 1 for a district of 1 to 4 blocks and an embedding of the schematic puzzle:
- each node on a place its type may take (CK12, and roofs once K2d2 is in);
- each line on a chain of spans whose interior poles are carriers (CK13 as changed);
- the feed outside;
- no span shared.

It writes a draft `puzzles/city/<NN-slug>.city.json` with `from` set. When there is no fit, it reports why, so the designer knows what to rework (answer 4). `npm run check` replays a city puzzle's check block through the conversion. The tool proposes; the designer decides.

**Acceptance criteria.**
1. [ ] A 5-node chain fits on a fixture city. The draft validates and converts. **test**: 1 case.
2. [ ] A miss names the shortfall. For example, a schematic with more switches than the district has 3-attachment poles reports "no fit: switch, needs 4, district has 3", and nothing is written. **test**: 1 case.
3. [ ] A fitted draft converts to a `Puzzle` with the schematic's node, line and fault ids, types, loads, ratings, capacities, parts, targets and line endpoints. **test**: 2 cases. **Amended by section S:** the file's ids, types, loads, parts, targets and endpoints are the schematic's, plus S1's hidden ids (`converted.hidden`); its capacities and ratings are the raised ones of criterion 10. The fixture city's district may hold no scenery building, so one of the two cases keeps the schematic's numbers exactly.
4. [ ] The same inputs give the same draft. **test**: 1 case.
5. [ ] The search stops at `FIT_BUDGET` steps and reports "gave up". **test**: 1 case.
6. [ ] `npm run check puzzles/city/<id>.city.json`, and `npm run check` with no argument, check the city puzzles too. **test**: 2 cases in `tools/check.test.ts`.
7. [ ] **One sweep in the suite.** Every `puzzles/city/*.city.json` validates, converts on 6 x 6 seed 1 (built once through the module cache), and its note's check block replays. **test**: 1 case. It may pass 2 s once the puzzles are in. It is the one place city puzzles' play is held, and it replaces a test per puzzle. The builder gives its time.
8. [ ] The builder prints, once in its reply, which of 01 to 16 fit unchanged and what blocks each one that does not. **no test**.
9. [ ] **The mid-row clearance check** (B1b's K2 check 11; Josh, B1q: "Only where clear"). A city puzzle may use a mid-row roof structure only where stage 7 has left that roof clear by the keep square. It runs on the plan after stage 7, so it is P1's (the city check and the fit), not K2d's: stage 6 can't see stage 7. A fit offers only clear mid-row places. **test**: 1 fixture case, where a used mid-row place under a roof prop fails.

10. [ ] **The raised numbers (section S; Josh, 24 Nov 2026: "Raise (Recommended)", "Whole").** `raiseForScenery(cityPuzzle, plan, solution)` in `tools/fit.ts` converts the puzzle (S1), replays `solution` on `src/grid/` with every capacity and rating unlimited, once with the scenery lamps' load and once without, and returns the file with:
    - each feed's `capacity` (or the top-level `capacity`) raised by the extra load that feed carries at the end of the solution;
    - each rated fusebox's `rating` raised by the extra load through it at the end of the solution.

    The schematic's numbers are integers and `SCENERY_BUILDING_LOAD` is 1, so the raised numbers are integers (no rounding; the pre-check's 0.1 failures do not arise). `solution` is the schematic note's check block's. The fit writes the raised numbers into every draft; `npm run fit -- --raise puzzles/city/<id>.city.json` rewrites an existing city file's numbers in place (for P0 and hand reworks). **test**: 1 fixture case: a feed and a rated fusebox with scenery on a carrier past the fuse, raised by exactly that scenery.
11. [ ] **P0 agrees.** `raiseForScenery` on P0's file as S1 left it (`capacity` already raised) gives it back unchanged, from its note's solution. **test**: 1 case, on 6 x 6 seed 1 through the module cache; it may share criterion 7's plan.

**Stop rule (section S).** The builder stops and reports ("stop 081 P1", with the branch) if a pilot it fits does not play the same when raised (start, the check block, the analyzer's fewest clicks, winning configs and dead first moves) and is not 09 or 12, which the pre-check already found fail at "Whole". It lists each with what differs; P2a's designer reworks it under answer 4.

**Count.** 12 added: criteria 1 to 7 and 9 as first cut (10), and 10 and 11 (2). Criterion 3's amendment changes what its two cases assert, not how many.

**Files.** New `tools/fit.ts`, `tools/fitrun.ts`, `tools/fit.test.ts`; `tools/check.ts`, `checkrun.ts`, `check.test.ts`; `package.json` (the `fit` script only).

### P2a · Puzzles 01 to 16 on the city, the pilot (puzzle-designer). Branch `ticket/081p2a-city-puzzles-01-16`
**Built (PR #69, review: meets); Josh played it 25 Nov 2026: "Some need work". Superseded by section W's P2a2 (Josh, 25 Nov 2026, on a card, W-Q5: "Close, re-lay (Recommended)"); the main session closed PR #69 unmerged.**
### P2b to P2d · Puzzles 17 to 32, 33 to 48, 49 to 64. **Dropped 25 Nov 2026; replaced by section N**
**Josh, 25 Nov 2026, in chat:** "I don't want to convert the existing puzzles. Instead I want to use Fable 5.2 to analyze the existing puzzles and come up with a series of 25 puzzles that are progressively more difficult. The current puzzles are too repetitive." No P2b, P2c or P2d branch is cut. The schematic files 17 to 64 stay in `puzzles/` unedited, as the source the series draws ideas from (never a file to convert). The text below is kept as the record of how the pilot was laid; its rules for laying a puzzle (CK12, CK13 as changed, `pos` never authored, districts may overlap) still bind section N.

~~P2b to P2d start only after Josh has played the pilot and said so in chat (answer 2).~~

**The pilot, from B1p.**
- 01, 02, 05, 06, 08, 13 and 16 fit on poles, on 1 block.
- 03, 04, 07, 09, 10, 11, 12 and 14 fit on 1 block, using roof structures (B1q). 04 and 12 use roofs on neighbouring blocks (K2c's CK14 exception), and 12 also uses 7 clear mid-row places (P1's check).
- **15 is a rework** under answer 4: each of its feeds has 2 lines, and CK14 gives a feed one entering span.

P1's own fits (criterion 8) are the record. P2a waits for K2d, because 9 of its 16 need roofs.

**Raised, and 09 and 12 (section S; Josh, 24 Nov 2026: "Raise (Recommended)", "Whole").** P2a also waits for S1 and P1's criteria 10 and 11. Every pilot's draft comes from the fit with its capacities and ratings raised. A pilot that plays the same raised is **raised, not reworked** (see "Rules this ticket holds"): the schematic's check block copied, the analyzer's numbers equal, one **What changed** line with the old and new numbers. The pre-check (`docs/design/081-all-connected-powered.md`, section 2) found two that do not, at "Whole":
- **09 · `fb_A` blows at once.** Its start lights more scenery under `fb_A` (rating 3) than its win does, so raising by the win's scenery leaves the start over the rating. **The fix, in this order:** (a) a re-lay that keeps `fb_A`'s branch off poles with scenery drops (another district or route than the fit's first, through `--blocks` and the designer's own runs), so the start and the win carry the same scenery under it; then (b), only if no re-lay exists on 6 x 6 seed 1, `fb_A`'s rating raised to the larger of its start's and its win's load. (b) may lose the fuse's trap, so it is a rework: its own check block and analyzer numbers, and the note says plainly whether the fuse can still blow, and how.
- **12 · `fb_2` blows at the start** (at a half and at a whole bulb). The same two fixes, in the same order, for `fb_2`.

A fix that keeps the element under test is the designer's. One that loses it (no re-lay, and (b) takes the trap away) goes to Josh as a question before that pilot is shown to him, worded with what each choice costs. The other 14 are not held back for it.

**How a schematic puzzle goes onto the city (6 x 6 seed 1, one-way on; answer 3).**
- **Nodes onto places** (CK12): the feed on a pole just outside the district; breakers, fuse boxes and batteries on poles with 2 or more attachments, or breakers and fuse boxes on roof structures (6b); switches on poles with 3 or more, or on a roof structure; junctions on any pole; lamps on a building with a drop (a "home", "shrine" or "infirmary" read goes to a building that fits, where one does) or a lamp post. One node per place.
- **Lines onto chains of spans** (CK13 as changed). Lines run along the pole lines, round corners on carrier poles, square across streets between junctions (2.5 m past the corner), down a drop or a lead, or on a roof span where a line crosses a street on a diagonal (after K2d). The schematic's nodes stay exactly as they are: a corner never becomes a junction.
- **Faults** are copied. A `damaged-cable` names the span that is cut, chosen where the break reads from the default camera.
- **`pos` is never authored.**
- **Districts may overlap** between puzzles: only one job is live at a time, and the rest of the city is dead (CK8).

**When one does not fit (answer 4: "Change the puzzle instead").** The designer reworks the puzzle so that it fits, as a new file `puzzles/city/NN-slug.city.json` with `from` set. There is no larger-district, other-district or city-variant fallback beyond P1's own search of 1 to 4 blocks. A rework may change nodes, lines, faults, parts, loads, ratings, capacities or targets. It keeps the schematic's element under test (the brief's table, or the note's "What this map tests") where it can, and says plainly where it cannot. The schematic file is not edited.

**Acceptance criteria** (each batch):
1. [ ] Each of its 16 puzzles has a city file and a note in `puzzles/city/`. **no test**: P1's sweep holds every file.
2. [ ] Each note has:
   - `from`, the district, and the place table (node to place, line to its span chain);
   - the intended read from the default camera, an empty **What it taught us**, and the check block;
   - for an unchanged puzzle, the check block copied from the schematic;
   - for a rework, a **What changed from the schematic, and why** section, item by item, so Josh can judge it when he plays it, with its own check block.

   **no test**.
3. [ ] `npm run check puzzles/city/` passes. `npm run analyze` numbers are in each note: equal to the schematic's for an unchanged puzzle, and stated as new for a rework. **test** (P1's sweep).
4. [ ] **Josh plays** the pilot's puzzles on the 3D city, from U2 on (re-cut 24 Nov 2026: the 2D view no longer opens a city puzzle; Josh: "I don't want 2D puzzles anymore. I want this game to be full 3D. The 2D puzzles were really just a prototype to see if the puzzles would be functional."). If a batch is ready before U2 merges, its play waits for U2. His verdict goes under **What it taught us**. **browser**.

**Files.** `puzzles/city/` only.

### D1 · The component shortlist (pipeline-designer; a note, no code). Branch `ticket/081d1-component-shortlist`
**Goal.** For each component in `CIRCUIT_COMPONENTS`, up to six candidate pieces from the converted packs, measured against the place they stand, so the main session can put one card per component (answer 9). The components are the feed, breaker, switch, relay, spring, fuse box, junction, battery, building lamp, lamp post, the damaged line's prop at the cut (answer 8), and the roof structure. It recommends none.

**Acceptance criteria.** All **no test**.
1. [ ] `docs/design/081-D1-component-shortlist.md`. For each candidate:
   - its `pack:name`, size in metres, triangles and flags;
   - what `docs/design/073-pack-intended-use.md` says of it;
   - whether it fits its place (a pole's arm, a wall at 5.5 m, a roof, the cut span);
   - its gallery link (`/?assets=<pack>&piece=<name>`).

   Candidates are listed in manifest order, not ranked. The roof structure's rows note Josh's words that the Sci-Fi City poles "are intended to be atop buildings" (071) as his, not as a pick.
2. [ ] One line per component on the overlay icon that carries the reading (E1).
3. [ ] **Pictures for the cards.** Nothing from a pack is committed (Josh, 16 Nov 2026; 074's licence). The main session may render a picture sheet per component to `assets/private/` (git-ignored), as it did for 071 A's shortlist, and the card gives the path and the gallery link. The note names no image file under a committed path.

**Files.** `docs/design/081-D1-component-shortlist.md`.

**The picks (the main session, not an agent).** One question card per component, in `CIRCUIT_COMPONENTS` order. The options are D1's candidates, each with its picture path and gallery link. The answer goes in Josh's words into `docs/design/081-component-picks.md`, one row per component: component, `pack:name`, his words and the date. An unpicked component stays null and draws as a placeholder.

### D2 · The gallery's component view (ui). Branch `ticket/081d2-gallery-components`
**Goal.** At `/?assets=components&component=<id>`, Josh can look at one component's shortlist across packs, as 074's cards, while a card is open. At `/?assets=components`, every component is listed with its pick (from D3's table) or "unpicked". Dev only, as 074.

**Acceptance criteria.**
1. [ ] `assetGalleryRequested` reads `assets=components` and `component=<id>`; unknown ids fall back to the list. `assetGalleryUrl` round-trips both. **test**: 2 cases.
2. [ ] The shortlist is a typed table transcribed from D1's note and pinned against it. **test**: 1 case.
3. [ ] The list shows each pick or "unpicked" in words, never by colour alone. **test**: 2 cases.
4. [ ] Josh in the browser: the cards across packs, with one pack's GLB held at a time. **browser**.

**Files.** `src/ui/assetgallery.ts`, `assetgallerylogic.ts`, their tests, and a new `src/ui/componentshortlist.ts`.

### D3 · The picks table (renderer). Branch `ticket/081d3-component-picks`
**Goal.** `COMPONENT_MODELS: Record<CircuitComponent, CircuitComponentPick>` in `src/render3d/componentmodels.ts`, transcribed from `docs/design/081-component-picks.md`.
- Josh picked all twelve on cards on 23 Nov 2026. The file is on `ticket/081d1-component-shortlist` at 40ce6dc, and D3 branches after it merges.
- `spring` and `junction` share one model (`SM_Prop_WallAttach_Electronics_03`). The table keeps both rows; the overlay icon tells them apart.
- **Load:**
  - the three `sci-fi-frontier-pack` picks (battery, damagedLine, roofMast) need a subset GLB run (071 D's kind) before K3 can draw them;
  - the seven `sci-fi-city-pack` picks add a 35 MB pack the city does not load today;
  - the Palm picks join 071 D's Palm subset.

  D3's manifest case (criterion 2) skips a key whose pack is not converted, and names it.

**Acceptance criteria.**
1. [ ] The table equals the note row for row. **test**: 1 case.
2. [ ] Every non-null key is in the converted manifest. The manifest is read lazily and the case skips when it is absent. **test**: 1 case.

**Files.** New `src/render3d/componentmodels.ts` and its test.

### E1 · Glyphs out of the 2D renderer; the overlay's icons and lines, pure (renderer). Branch `ticket/081e1-overlay-pure`
**Done. Criterion 5 is superseded by E4** (Josh, 24 Nov 2026: "I don't think we need the "wire overlay, the 3d wires are apparent enough, however the icons are important."): `overlayLines` goes, and the break icon moves to the real cut.

**Goal.** 071 E's pure parts, for the city, with lines as well as icons (answer 7: "Icons plus lines"). The glyph drawing moves from `map-renderer.ts` to `src/render/glyphs.ts`, and the 2D view does not change. `src/render3d/overlay.ts` lays out each component's icon, and each puzzle line as one straight projected segment from piece to piece (Josh: "Straight, piece to piece"), live or dead, from a converted puzzle, its state and a projection passed in. It uses no three and no DOM.

**Acceptance criteria.**
1. [ ] 071 E criterion 1: the glyphs move, the existing `src/render/` tests pass unedited, and the call list is the same. **test**: 2 cases.
2. [ ] `overlayIcons(converted, state, project)`:
   - one icon per component, carrying the state `look.ts` gives;
   - icons behind the camera or off screen are omitted;
   - near pairs are nudged by `OVERLAY_NUDGE`.

   **test**: 3 cases.
3. [ ] State is shown by shape, not by colour alone (guide 12). **test**: 1 case.
4. [ ] An icon's hit circle is at least `OVERLAY_HIT_PX` (44 CSS px) across, at every zoom. **test**: 1 case.
5. [ ] `overlayLines(converted, state, project)`:
   - **one straight segment per puzzle line**, from its `from` node's projected place to its `to` node's. The carrier poles and the run's spans play no part in the overlay. Josh: "The 2D overlay should just draw a line from junction to junction ...", and on the card: "Straight, piece to piece";
   - live or dead, with the 2D map's pulse phase;
   - a damaged cable's **break icon at the segment's midpoint**, shown **only when the fault is readable** (current reaches it; "Only when readable"; 27 Oct 2026: "Unreadable faults show nothing"). It sparks only while live;
   - brownout flicker for every line.

   **test**: 2 cases. The existing case that pins a cut on every damaged cable is **rewritten** to a cut at the midpoint, present when readable and absent when not. That keeps the count at 2, and E1's PR total is unchanged.

   **Re-cut 23 Nov 2026 on Josh's words above**, after #29's first review (must-fix 1, fixed in b3ccf13). The first wording had the line follow its chain's span ends, carriers included, and a cut at the damaged span.

**Files.** New `src/render/glyphs.ts` and `glyphs.test.ts`; `src/render/map-renderer.ts` (the move only); new `src/render3d/overlay.ts` and `overlay.test.ts`. **Must not:** `src/core/`, `src/grid/`, `src/play/`, `src/ui/`, `src/city/`.

### P0 · `city-two-ways-round` as a city puzzle file (puzzle-designer). Branch `ticket/081p0-two-ways-round-city`
**Why** (the playable path). Josh wants to play `city-two-ways-round` on the 3D city. Its city form exists only as K2c's test fixture. U1 lists `puzzles/city/*.city.json`, and that folder does not exist.

**Goal.** `puzzles/city/city-two-ways-round.city.json` is the city form of K1's worked map, with a note. The picker can list it from U1 on.

**Acceptance criteria.**
1. [ ] **The move.** `git mv src/city/circuit/fixtures/city-two-ways-round.city.json puzzles/city/city-two-ways-round.city.json`, unchanged in content. `src/city/circuit/convert.test.ts` reads it from the new path: its one path line (line 24 at ede9e64, outside any `it(` body). The file now has one copy, and K2c's "plays the same" case holds it. **test** (existing, unedited cases). Empty `fixtures/` goes.
2. [ ] **The note**, `puzzles/city/city-two-ways-round.md`. It is short and points to `puzzles/city-two-ways-round.md` for the read and the trap. It holds:
   - `from`, the district (`block:6:6`), and the place table (node to place, line to its span chain), read from the file;
   - which schematic junctions became carriers (answer 5), as K2c's fixture did;
   - the intended read from the default camera;
   - the check block, copied from the schematic;
   - an empty **What it taught us**.

   **no test**: K2c's case replays the schematic's check block through the conversion.
3. [ ] The schematic `puzzles/city-two-ways-round.json` and its note are not edited. **no test**.

**Files.** `puzzles/city/` (new: the two files); the one path line of `src/city/circuit/convert.test.ts` (the grid-simulator's folder, named here under test policy rule 6); deleting `src/city/circuit/fixtures/`. **Must not:** any other line in `src/`.
**Tests.** 0 added, 0 rewritten (a path line is not a case, A2a's rule).
**Until U1 is in,** `main.ts`'s glob reads the new file and logs "[puzzles] skipped puzzles/city/..." once. This is harmless and expected.

### K3 · The circuit drawn on the city (renderer). Branch `ticket/081k3-circuit-drawn`
**Re-cut 24 Nov 2026** against what K2a to K2d2 and D3 built (read at ede9e64). It is built now, at the same time as P0 and U1.

**What it reads, as built.**
- `plan.layers.circuit` (`src/core/cityplan.ts`, `CityCircuitLayer`):
  - `poles`, `spans`, `drops`, `lights` and `posts`;
  - `poleModels`, pole id to a `GROUND_POLE_MIX` key;
  - `roofs` (`CityRoofMast`, with `row`, `x_m`, `deck_y_m`, `z_m`) and `roofSpans` (`CityRoofSpan`). Both are optional in the type and always written by stage 6 since K2d1.
- A job, optionally: `CityPuzzleConverted` (`places`, `runs`, `cuts`), from `convertCityPuzzle` (`src/city/circuit`, merged with K2c and K2d2).
- The kit: `placePole`, `fitLine`, `POWER_POLES`, `POWER_LINE` (`powerkit.ts`); `COMPONENT_MODELS` (`componentmodels.ts`, D3).
- The pack models: every pick is in the converted manifest (read 24 Nov 2026). Palm City (103 MB), Sci-Fi City (35 MB) and Sci-Fi Frontier (103 MB) are whole packs, because 071 D's subset GLBs were never built.

**Goal.** At `?view=3d&city=tiles`, stage 6 is drawn, dead:
- every pole, on its `poleModels` model;
- every span, with the 071 wire piece;
- the drops and the street lights;
- a roof structure on every corner roof.

A new pure-ish module, `circuitdraw.ts`, also takes an optional job. Given one, it stands:
- each node's picked model at its place;
- the mid-row roof structures and roof spans the job uses;
- the feed's pick in place of the feed's pole;
- the damaged-line prop at a cut while it is readable.

K3 draws nothing live. E2 does.

**Acceptance criteria.**
1. [ ] **Poles and spans.**
   - Every `poles` entry is drawn with `placePole` on the model `poleModels` names.
   - Every `spans` entry, and every drop, is drawn with `fitLine` and `POWER_LINE` (071 Q11: "Pack wire pieces (Recommended)"), at `SAG_RATIO`.
   - Each pole end is at the attachment `GROUND_POLE_ATTACH_UP_M` gives, as stage 6 judged it.

   **test**: 1 case, on a small typed layer fixture.
2. [ ] **Roof structures and roof spans** (Josh: corner roofs "On every corner roof"; mid-row "Only when used (Recommended)").
   - Every `row: "corner"` roof gets the `roofMast` pick (`sci-fi-frontier-pack:SM_Prop_Power_Pole_03`).
   - Its arm is code-drawn at `deck_y_m` + `ROOF_MAST_ATTACH_MIN_M` (2.0 m) or higher, never lower. The model has no cross-arm (071 A), and stage 6 judged roof spans at 2.0 m (K2d1).
   - A `row: "mid"` roof structure and a `roofSpans` entry are drawn **only** when the job given uses them: a roof place in `places`, or a span id in a `runs[*].spans`.
   - With no job, none is drawn.

   **test**: 1 case. No job: corner structures only, no mid or roof span. A job using one mid roof and one roof span: exactly those are added.
3. [ ] **Component models at their places,** unscaled (guide chapter 2, Decided), from `COMPONENT_MODELS`. A null key, or a model missing from the loaded set, draws a placeholder.
   - **On a pole:** the node's model on its pole, below the pole's lowest attachment, facing the pole's street.
   - **On a roof:** at the structure, below its arm.
   - **A building lamp** (`lampBuilding`): at its drop's wall point.
   - **A lamp post** (`lampPost`): at its `posts` place.
   - **The feed** (`palm-city-pack:SM_Prop_Powerpole_03`, 10.83 m) **replaces** the feed's pole model when the feed stands on a pole. `poleModels` is not changed (stage 6 owns it); the swap is drawn here. It gets its own `POWER_POLES` entry, measured from the model as 071 B measured the mix.
   - **A feed on a roof** stands as the roof structure only, and the builder reports it. `city-two-ways-round`'s feed is on a pole.

   **test**: 2 cases. (a) On the P0 file or K2c's fixture, converted on 6 x 6 seed 1 through the module cache: one model per node, of its component's key, and the feed's pole drawn as the feed pick. (b) A null key and a missing model each give a placeholder.
4. [ ] **The damaged-line prop, only when readable** (Josh, 24 Nov 2026, on a card: "Only when readable (Recommended)").
   - `circuitdraw` takes the set of readable cut fault ids.
   - `SM_Prop_Cable_09` stands at the midpoint of that fault's cut span (`cuts[faultId]`) only while its id is in the set.
   - An unreadable damaged span is drawn as an ordinary dead span.
   - E2 passes the set from `GridState`; K3 tests it on fixtures.

   **test**: 1 case: in the set, the prop; out of it, none and an ordinary span.
5. [ ] **Street lights** (CK10, scenery) use 059's approved default, Town Pack `SM_Prop_Streetlamp_01` (Josh, 18 Nov 2026: "Approve 057, 058 and 059"). It is never the puzzle's `lampPost` pick (CK11; 059: "Puzzle lamps and street lights never share a model"). **no test**: a typed constant, held by criterion 6's audit.
6. [ ] **R12 knows the circuit.**
   - `planAudit` also reads the circuit draw's keys.
   - `SM_Prop_Power_Cables_03` is allowed on circuit spans and drops only (071 Q11). Anywhere else it is still refused, as `CITY_NEVER_USED` says.
   - No other never-used key is allowed.

   **test**: 1 rewritten (the existing R12 allowance case in `plan3d.test.ts`), plus 1 added: the wire key on a non-circuit list is refused.
7. [ ] **Loads.**
   - `planKeys()` gains the circuit's keys: the ground mix, the feed pick, `POWER_LINE`, every non-null `COMPONENT_MODELS` key, and the street light.
   - A pack is loaded only when a key in it is asked for. Missing assets (CI, a fresh checkout) give placeholders, never a throw.
   - The builder gives the page's load time at `?view=3d&city=tiles` before and after, on Josh's PC, in its reply.
   - Subset GLBs (071 D's kind) are **not** in this section; see open question 5.

   **no test**: criterion 3(b) holds the missing-model path.
8. [ ] **Reported, not tuned** (the builder's reply; no rule changes here):
   - the feed pick's lowest attachment against the pole it replaces, and the feed span's low point. If that span drops under CK7's 4.2 m, the builder **stops and reports** ("stop 081 K3"). That is a question for Josh, not a fix;
   - the damaged-line prop's low point (3.85 m expected; open question 2);
   - the lamp post's overhang of the carriageway.

   **no test**.
9. [ ] Josh views 6 x 6 seed 1 at `?view=3d&city=tiles`, from the default camera and with `cam=street`, by day and by night. **browser**.

**Count.** 6 added, 1 rewritten: 7. The cases go in a new `src/render3d/circuitdraw.test.ts` (under 2 s, except case 3(a), which builds seed 1 once through the module cache; the builder gives its time) and `plan3d.test.ts`.

**Files.**
- new `src/render3d/circuitdraw.ts` and `circuitdraw.test.ts`;
- `src/render3d/plan3d.ts` (drawing the circuit, `planKeys`, `planAudit`) and `plan3d.test.ts`;
- `src/render3d/powerkit.ts`: the feed pick's `POWER_POLES` entry only. PK2's pin is over the mix keys and stays unedited;
- `src/render3d/models3d.ts`, the load list only, if `planKeys` alone does not reach it.

**Must not:** `src/city/`, `src/core/`, `src/ui/`, `src/main.ts`, `overlay.ts`, `renderer.ts` (E2's).

### U1 · The picker lists only city puzzles (ui, pure). Branch `ticket/081u1-picker-city`
**Re-cut 24 Nov 2026 (twice).** First, the `main.ts` wiring moved to U2 and U1 stopped waiting for P2a; P0's file is the first city puzzle. Then Josh, on cards: "I don't want 2D puzzles anymore. I want this game to be full 3D. The 2D puzzles were really just a prototype to see if the puzzles would be functional." On the 2D side: "Hide now, delete later (Recommended)". So the list holds city puzzles only, with no "· city" suffix, no `MapEntry` union and no dev flag.

**Goal.** A new pure `collectCityMaps(files)` in `src/ui/maps.ts` lists the city puzzles for the picker. `collectMaps` and its five cases are left exactly as they are (X2 deletes them). Nothing opens a city entry yet (U2).

**Acceptance criteria.**
1. [ ] **City files only.**
   - `collectCityMaps(files)` reads every `puzzles/city/**/*.city.json` with `validateCityPuzzle` (C1). Each is a `CityMapEntry`: `{ key, id, name, locked, path, city: CityPuzzle, from?: string }`.
   - Its key is its id, or `locked/<id>` under `puzzles/city/locked/`, as `collectMaps` keys locked copies.
   - Every other file (the schematics, street files) is left out silently, with no problem line. The schematics stay on disk as P1's and P2a's source.

   **test**: 1 case: a schematic and a city file sharing an id give one entry, keyed by the id, and no problem.
2. [ ] **A bad city file, or a repeated key,** is one `problems` line (C1's messages for a bad file), and the valid entries are kept. **test**: 1 case.
3. [ ] **Order and name.** Open entries before locked ones, each in path order (P2a's files are `NN-slug`, so they follow the schematics' order). The name is the file's `name`, unchanged: no "· city" suffix, since the picker lists nothing else. **test**: 1 case.

**Count.** 3 added, 0 rewritten.

**Files.** `src/ui/maps.ts` (adding `collectCityMaps` and `CityMapEntry`; `collectMaps` and `MapEntry` untouched), `src/ui/maps.test.ts` (new cases only). **Must not:** `src/main.ts` (U2), `src/render3d/`, `src/core/`.

### E2 · A city puzzle played on the city, through the overlay (renderer). Branch `ticket/081e2-city-play`, after K3 merges
**Done (PR #47). Criteria 4 and 5 are superseded by E4:** no overlay lines and no `overlayLineHit`; clicks go icons (components, then breaks), then the 3D pick.

**Re-cut 24 Nov 2026** against what E1, K2c to K2d2 and K3 build. The interface with the ui is fixed here, so U2 codes against it:
- `loadCityView(city: CityPuzzle): CityPuzzleView`, exported from `src/render3d/index.ts`;
- `MapRenderer3dOptions.city?: CityPuzzleView`, with `CityPuzzleView` in `src/core/citycircuit.ts`, committed with this re-cut.

**Goal.** `createMapRenderer3d(canvas, view.converted.puzzle, { insets, city: view })` draws the city on the view's plan, with K3's circuit and the job:
- the district's job is live: pulses, sparks, lit and dark lamps, brownout, and the Relight;
- the rest of the city is dead;
- E1's icons and lines are drawn over it on a 2D canvas.

A click on an icon or a line is that piece's `hitTest` answer, so `src/play/` plays it unchanged.

**Acceptance criteria.**
1. [ ] **`loadCityView`** runs the pipeline once per city (`blocksX`, `blocksZ`, `seed`, `oneWay`) per page and converts the puzzle with `convertCityPuzzle`. A `CityPuzzleError` is thrown on with its messages. Two puzzles on one city share one plan object. **test**: 1 case, on P0's file.
2. [ ] **The route.**
   - With `city` given, `createMapRenderer3d` needs no `city=` address. It draws `city.plan`, not a fresh one.
   - Without `city`, routes are as today, and `NO_CITY_ROUTE` still throws.
   - It is dev only, as the pipeline renderer is.
   - `MapRenderer3d` is unchanged.

   **test**: 1 case (the pure route choice).
3. [ ] **Live and dead, in 3D,** by run.
   - Every span of a live line's `runs` glows. A drop or lead glows with it.
   - A damaged span is cut, and sparks only while live.
   - K3's prop stands at the cut only while the fault is readable.
   - Lamps light from `look.ts`. Brownout flickers every job lamp.
   - Scenery (poles, spans and lights not in the job) never glows.

   **test**: 2 cases.
4. [ ] **The overlay** draws `overlayIcons` and `overlayLines` (E1, as built: `(converted, state, project, ctx)`). Each is one straight segment, piece to piece, with the break icon at its midpoint when readable. **test**: 1 case: the projection passed to E1 is the camera's, and a line's points equal its pieces' projected places.
5. [ ] **`hitTest`.**
   - The overlay comes first: an icon (E1's `overlayHit`), then a line, a new `overlayLineHit` within `OVERLAY_HIT_PX / 2` of its segment, giving the line id.
   - Then the 3D pick (`pick.ts`): the job's models give node ids and its spans give line ids.
   - Scenery gives null.
   - The panels' blockers apply to both.

   **test**: 2 cases.
6. [ ] **`overlay=0`** in the address hides the overlay, and the 3D pick still plays. **test**: 1 case.
7. [ ] **The Relight can't be interrupted** (brief, Decided). It runs from `relight3d.ts`'s clock on `converted.puzzle`. Input during it changes nothing, as `src/play/` already holds. **test**: 1 case (rules-coverage row "The Relight can't be interrupted").
8. [ ] **The overlay canvas** sits over the WebGL canvas, the same CSS size, at the device pixel ratio (capped at 2, as the WebGL one is). It resizes with it and is removed on `dispose`. **test**: 1 case.
9. [ ] **The camera.** `resetView` and `fitWhole` frame the district, its four streets and the feed. `centreOn(lampId)` centres on that lamp's place. `placeAt` returns the lamp under a building, or null. **browser**.
10. [ ] Josh plays `city-two-ways-round` (from U2 on, picked; before that, by the main session's dev hook if needed) on a desktop window and a phone-sized one. **browser**.

**Count.** 10 added. The cases go in `overlay.test.ts`, `pick`'s and `renderer`'s own new tests, or a new `src/render3d/cityplay.test.ts` (under 2 s, except criterion 1's, which builds seed 1 once; the builder gives its time).

**If `src/play/` must change,** the builder stops; the architect re-cuts with an interaction section.

**Files.**
- `src/render3d/renderer.ts`, `plan3d.ts`, `pick.ts`, `overlay.ts` (adding `overlayLineHit`; E1's functions keep their signatures) and `circuitdraw.ts` (K3's, the live looks only);
- `relight3d.ts`, only if it cannot be reused unchanged;
- `src/render3d/index.ts` (the `loadCityView` export);
- new `src/render3d/cityview.ts`;
- their tests.

**Must not:** `src/core/` (the architect's), `src/ui/`, `src/main.ts`, `src/play/`, `src/city/`.

### U2 · The page opens straight into the 3D city (ui). Branch `ticket/081u2-open-city`, after E2 and U1 merge
**Re-cut 24 Nov 2026** on Josh's cards: "I don't want 2D puzzles anymore. I want this game to be full 3D. The 2D puzzles were really just a prototype to see if the puzzles would be functional." and "Hide now, delete later (Recommended)". Every puzzle on the page is a city puzzle on one WebGL canvas, so there is no `?view=3d` to ask for, no switch to a schematic and no reload. The first cut's `addressFor` and its reload case are dropped.

**Goal.** `npm run dev` opens straight into the 3D city on the first city puzzle (or the `?puzzle=` one), with E1's overlay on top. The picker lists only city puzzles (U1), and picking one, or the win splash's Next, opens it in place.

**Acceptance criteria.**
1. [ ] **`main.ts` builds the city page.**
   - It calls `collectCityMaps(files)` (U1), not `collectMaps`. The picker, `?puzzle=` and Next address entries by U1's key.
   - Every open builds the 3D renderer (`src/render3d`, loaded lazily as today). Opening an entry calls `loadCityView(entry.city)` (E2), plays `view.converted.puzzle` on `createGrid` and `createMapPlay`, and passes `{ insets, city: view }` to the renderer. Two puzzles on one city share E2's one plan.
   - The 2D `createMapRenderer` is no longer called, and `wants3d` and `NO_CITY_FORM_NOTICE` are no longer used by `main.ts`. Their code and tests stay until X1 and X2.
   - The `city=tiles` and `city=plan` dev routes open as today (no `city` option, HUD hidden by `planHidesHud`), given the open entry's converted puzzle.

   **test**: 1 case, on a pure helper in `src/ui/view3d.ts` that takes the address and says what to build: a puzzle play with the `city` view, or a `city=` route without it.
2. [ ] **Never a blank page.** A `CityPuzzleError` shows its messages in the HUD's place and in the console. No city files shows one line naming `puzzles/city/`. In a production build, where the pipeline renderer is not built (E2: dev only; Synty licence, 16 Nov 2026), the page says the prototype plays in `npm run dev` (open question 8). **no test**: one-line branches in `main.ts`; criterion 4 sees the first.
3. [ ] **The HUD shows** on a city puzzle: parts, targets, the picker. **browser**.
4. [ ] Josh runs `npm run dev`, lands on the 3D city on `city-two-ways-round`, plays it to the Relight, and picks it again from the picker (in place, no reload). **browser**.

**Count.** 1 added.

**Files.** `src/main.ts` (the page and open branches), `src/ui/view3d.ts` and `view3d.test.ts` (the helper; `wants3d`'s two cases stay unedited). **Must not:** `src/render/`, `src/render3d/`, `src/play/`, `src/core/`, `tests/playtest/`.

### E3 · The opening camera frames the district, not the city (renderer). Branch `ticket/081e3-district-frame`
**Why.** Josh, 24 Nov 2026, on a card: **"Fix it (Recommended)"**. U2 opens the city and calls `resetView()`, but E2's frame (`src/render3d/cityview.ts`, the block after "The frame: the job's wires and pieces", about lines 524 to 537 at 5d8d6e7) grows over every entry of `draws.wires` and `draws.pieces`. `circuitDraws` holds every pole, span and drop in the city, so `resetView` and `fitWhole` both frame the whole 6 x 6 city. That fails E2's criterion 9.

**Goal.** Opening a city puzzle, `resetView` and `fitWhole` frame the district, its four streets and the feed, as E2's criterion 9 says.

**Acceptance criteria.**
1. [ ] **The frame is the job's.** A pure, exported `jobFrame(view, layer, streets)` in `cityview.ts` grows the frame over:
   - each node's place in `converted.places` (pole, roof, building's drop wall point, post);
   - both ends of every span in `converted.runs[*].spans` (pole spans and roof spans), and the run's drop or lead;
   - each district block's cells, out to the far side of the street on each of its four sides (`sides[*].street`);
   - `converted.origin_m`, as today, and `FRAME_MARGIN_M` round it all.

   Nothing else in `draws` counts: no scenery pole, span, drop or light. With no district and no place, it falls back to the whole city, as today. **test**: 1 case, on P0's `city-two-ways-round` converted on 6 x 6 seed 1 through the module cache: the frame holds every place and run end and the district's streets, and holds no pole more than one street past the district.
2. [ ] **`loadCityView` writes `district`** (`CityPuzzleView.district`, added to `src/core/citycircuit.ts` with this cut, optional), copied from the puzzle's `district`. **test**: folded into criterion 1's case (it builds the view with `loadCityView`).
3. [ ] **`resetView` and `fitWhole` use it.** **test**: 1 case, if the rig can be built without a canvas; otherwise **browser** and the builder says why.
4. [ ] Josh runs `npm run dev` and the city opens on the district, on a desktop window and a phone-sized one. **browser**.

**Count.** At most 2 added.

**Files.** `src/render3d/cityview.ts` (the frame and `loadCityView` only) and a new `src/render3d/cityframe.test.ts` (under 2 s apart from the one seed 1 build; the builder gives its time). **Must not:** `circuitdraw.ts`, `componentmodels.ts` (K3b's), `src/city/`, `src/core/`, `src/ui/`, `src/main.ts`.

**Shares no file with K2e, D4 or K3b,** so it is built now, beside them.

### E4 · The overlay shows icons, not lines (renderer). Branch `ticket/081e4-overlay-icons`, after E3 merges
**From.** Josh, 24 Nov 2026, in chat: "I don't think we need the "wire overlay, the 3d wires are apparent enough, however the icons are important." On cards: where the break icon goes, **"At the real cut (Recommended)"** (over the broken span in 3D, clicked to repair); clicks, **"Icons, then 3D (Recommended)"** (the overlay's line hits go). This reverses answer 7's "Icons plus lines (Recommended)" and E1 criterion 5's "Straight, piece to piece". "Only when readable" (Josh, 23 Nov 2026; 27 Oct 2026: "Unreadable faults show nothing") is unchanged.

**Goal.** Playing a city puzzle, the overlay draws each component's icon and, at a damaged cable whose fault is readable, a break icon over the cut span where it really is in 3D (where K3's prop hangs and E2's sparks fly). No straight lines are drawn. A click takes an icon (a component's, then a break's, which gives its line id, so the repair prompt opens as today), then the 3D pick (a job model gives a node id, a job span a line id).

**Acceptance criteria.**
1. [ ] **No lines.** `overlayLines`, `OverlayLine` and `overlayLineHit` are deleted from `overlay.ts`; `paintOverlay` draws no segment, pulse or flicker on the overlay. Live and dead stay shown in 3D (E2 criterion 3, unchanged). `overlayIcons`, `overlayHit`, `placePoint` and their signatures are unchanged. **test**: 1 removed, "one straight segment per line, from piece to piece, away from the feed while live" (`overlay.test.ts`). Its liveness is already held by E2's "a live line's spans glow in order" case.
2. [ ] **The break icon at the real cut.** A new pure `overlayBreaks(converted, state, cutAt, project, ctx)` in `overlay.ts`. `cutAt(spanId)` gives the cut span's world point in metres, or null. `cityview.ts` builds it from `jobWires`: the middle sample (`SAMPLES / 2`) of the span's `pts`, the point E2's sparks use. For each damaged-cable fault in `state.faults` whose id is in `state.readableFaults`, there is one `OverlayBreak { faultId, lineId, x, y, hit, sparking }` at the projection of `cutAt(converted.cuts[faultId])`:
   - none while the fault is unreadable, or once it is repaired;
   - omitted behind the camera or off screen, as icons are;
   - `sparking` only while the line is live and in `state.sparking`;
   - `hit` at least `OVERLAY_HIT_PX` across.

   `paintOverlay` draws each as today's red X with sparks. **test**: 1 rewritten. "a damaged cable's break icon sits at the midpoint, only when readable ..." becomes: absent before the switch; present after it, at the projection of the cut span's middle sample, sparking while live; absent once repaired.
3. [ ] **The camera's projection.** **test**: 1 rewritten. "projects with the camera's own projection: a line's points are its pieces' projected places" becomes: an icon's point is its piece's projected place, and a break's point is `cutAt`'s point projected, under the same `cameraProject`.
4. [ ] **Clicks: icons, then 3D.** `cityHit` is `overlayHit(icons)`, then a new `overlayBreakHit(breaks, x, y)` (within `hit / 2`, nearest first, giving the break's `lineId`), then `pick`. `HitInputs.lines` becomes `breaks`. A point on the old straight segment, away from every icon, goes to the 3D pick. **test**: 2 rewritten:
   - "a line is hit within half the hit size of its segment ..." becomes the break hit (within, nearest first, never off screen);
   - "hits the overlay first (an icon, then a line), then the 3D pick ..." becomes icon, then break, then pick, with panels and off-canvas points still null.

   The overlay=0 case's `lines: []` becomes `breaks: []` in its body; that is not a rewritten case.
5. [ ] **The 2D map is not touched.** `src/render/` (`glyphs.ts` included) and E1 criterion 1's cases pass unedited. **test** (existing).
6. [ ] Josh plays `city-two-ways-round` from `npm run dev`: icons only; the break icon over the cut span once the fault is readable; a click on it repairs; a click on a 3D span or model still plays. **browser**.

**Count.** 0 added, 4 rewritten, 1 removed, all in `overlay.test.ts`.

**Files.** `src/render3d/overlay.ts`; `src/render3d/cityview.ts` (`cityHit`, `HitInputs`, `paintOverlay` and the `cutAt` it passes; not `jobFrame` or `loadCityView`); `src/render3d/overlay.test.ts`. **Must not:** `circuitdraw.ts` and `componentmodels.ts` (K3b's), `src/render/`, `src/play/`, `src/core/`, `src/ui/`, `src/main.ts`. If `src/play/` must change for the break's click, the builder stops and the architect re-cuts.

**Order.** It shares `cityview.ts` with **E3** (open PR #51: `jobFrame` and `loadCityView`), so it branches from `main` after E3 merges. It shares **no file with K3b**: the break point comes from `jobWires` in `cityview.ts`, not from `circuitdraw.ts`, and K3b changes drops only, never a span's curve. So E4 and K3b may be built at once once E3 is in.

### E5 · The camera stays on the puzzle (renderer). Branch `ticket/081e5-camera-limits`. Cut 24 Nov 2026; approved (G1) the same day
**Josh's answers, 24 Nov 2026, on cards (relayed by the main session):**
- **G1 and E5-Q1:** **"Approve, 1.5x (Recommended)"**. `CITY_PLAY_ZOOM_OUT` is 1.5.
- **E5-Q2:** **"Yes, dev only (Recommended)"**. `cam=free` lifts the limits in a dev build only (criterion 4).
- **E5-Q3:** **"Hold at the limit (Recommended)"**. On a pane too small for the panels and the district, the opening is held at `Dmax` and the panels may cover the district's edge. No ui section is cut.
- **Order:** FX2 (PR #62) is merging, so E5's branch is cut from `main` after it merges. This replaces the "beside FX2" line under **Order** below.

**From.** Josh, 24 Nov 2026, in chat: "The end user shouldn't be zooming out this much. They won't be able to see anything at that height. We should restrict the end users visibility to the puzzle." On a card: **"Cut it (Recommended)"** for "zoom-out and pan limits around the puzzle's district, then G1 on a card".

**What the code does (read 24 Nov 2026 at `origin/main` e32bc63; the architect's reading).**
- The play view's camera is `createCityRig` (`src/render3d/tilecity3d.ts`), given E3's `jobFrame`. The page's wheel, pinch, keys and drag (`src/play/pan.ts`) all go through the view's `zoomStep`, `setPan`, `resetView` and `fitWhole`, so the rig is the one place a limit belongs. `src/play/` does not change.
- **There is already a zoom-out limit, but it is relative to the opening:** `zoomStep(-1)` stops at `CITY_ZOOM_OUT` (1.6) times `fitDist`, the distance at which the frame fits the *free area*, the canvas less the HUD and bottom-panel insets. The pan already holds the camera's target inside the frame (`clampT`).
- **So the limit grows with the panels.** The insets are pixels. On a small pane (800 x 570) they take a large share of the height, the free area shrinks, and the fit backs the camera far off to squeeze the district into it. If the panels leave no free area, the fit's search never succeeds and ends at its 3,000-unit ceiling. Then 1.6 times that is allowed on top. That is the high view of the whole 6 x 6 city (3,851 draw calls against about 1,774 at a larger pane). The builder confirms this reading by printing, once in its reply, the insets, the free area and `fitDist` at 800 x 570 on `main`.
- `cam=street` is read only by the plan route (`plan3d.ts`, dev, `planStreetPose`). The play view never reads `cam`.

**No Decided rule touches the camera.** The brief's "Rules carried over" are about flow, breakers, switches, parts, signatures, faults hiding faults and the Relight. The brief's question 4 ("a map the player can see whole") is held by criterion 2's floor: the limit never stops the player seeing the whole district. Nothing here changes a grammar rule or a city number, so there is no pipeline-designer pre-check.

**Goal.** Playing a city puzzle on any window, a phone-sized one included, the camera opens on the puzzle's district and can never zoom out past a height set by that district, or pan away from it. A dev switch lifts both limits for measuring.

**The limit, in the rig's terms.** All of these come from the frame the rig is given (in the play view, E3's `jobFrame`: the district, its four streets, the job's places and runs, the feed's origin, with `FRAME_MARGIN_M`), so they are not fixed numbers:
- **`D0`, the district's fill distance:** the rig's own fit (the frame's ground and roofline corners, `CITY_FIT_PAD`), in the **whole canvas**, with the insets ignored. It depends on the frame and the window's shape, never on the panels.
- **`Dmax`, the limit:** `CITY_PLAY_ZOOM_OUT` x `D0`. The factor is Josh's (E5-Q1; the recommended **1.5** is the architect's).
- **`Dfit`:** today's fit in the free area (with the insets). A free area of zero or less gives `Dfit` = infinity, not the 3,000 ceiling.
- **The opening:** `min(Dfit, Dmax)`. The zoom-in floor stays `CITY_ZOOM_IN` x the opening, as today.

**Acceptance criteria.**
1. [ ] **A limited rig, by option.** `createCityRig` takes a new option, `rigOpts.limit?: { zoomOut: number }`. Without it the rig is exactly today's, so the plan route (`plan3d.ts`) and the tile sheet do not change: the three existing "the city rig" cases in `tilecity3d.test.ts` pass **unedited**. With it, the rig keeps `D0`, `Dmax` and the opening as above, and works them out again on every `resize` (a new window size or new insets), then reframes, as today. **test** (existing, unedited).
2. [ ] **The zoom-out and pan limits.** With `limit`, from the opening, `zoomStep(-1)` never puts the camera further from its target than `Dmax`, and it stops there. `Dmax` is never under `D0`, so at the furthest zoom-out the whole frame fits the canvas. `setPan` and `centreOn` keep the target inside the frame at every distance, the furthest included (today's `clampT`). `resetView` (and `fitWhole`, which is it: the F key frames the district, not the city) returns to the opening. **test**: 1 case, on a fixture frame (two blocks' worth of rectangle, no city built): 40 steps out stop at `Dmax` (the scale is the no-inset opening's divided by `zoomOut`, within 1e-6); a pan of 1e6 px and a centre far outside both leave the target on the frame's edge at that distance; `resetView` restores the opening's scale and pan.
3. [ ] **The opening fits the district at any reasonable shape and never starts above the limit.** With `limit`, for 1280 x 720, 800 x 570, 600 x 900 and 390 x 844 (a phone):
   - with no insets, every corner of the frame, on the ground and at the roofline, projects inside the canvas, and the opening is `D0`;
   - with insets that leave 30 % of the height free, and with insets taller than the canvas, the opening is finite and no further than `Dmax`;
   - with insets that leave the district room (Josh's desktop window), the opening is `Dfit`: the district sits in the free area, clear of the panels, as E3 made it.

   **test**: 1 case, the same fixture frame, all four sizes in a loop.
4. [ ] **The play view uses it; the dev switch lifts it.** A pure, exported `playRigOptions(search, dev)` in `cityview.ts` gives `{ limit: { zoomOut: CITY_PLAY_ZOOM_OUT } }`, except that in a dev build `cam=free` in the address gives `{}`, today's unlimited rig, for measuring the wider views (section F's "1280 x 800, more of the city" row). In a production build `cam=free` is ignored. `cam=street` is ignored by the play view, as today: the street camera stays on the plan route, which this section does not touch. `createCityPlayRenderer3d` passes `playRigOptions(opts.search, import.meta.env.DEV)` to `createCityRig`; while `cam=free` is on, it says so in one console line. **test**: 1 case: the limit by default, with `cam=street`, and with `cam=free` in a build; `{}` with `cam=free` in dev. The call itself is checked in criterion 6.
5. [ ] **Frame time and draw calls, measured, not tuned.** The per-frame work is unchanged (a smaller view only draws less), so the expectation is no cost, and fewer draw calls on a small pane. In the browser pane on Josh's PC (not a headless browser), `?puzzle=city-two-ways-round&perf=1`, 6 x 6 seed 1, before power, on `main` and on the branch, the builder reports the draw calls, triangles and median frame:
   - at the opening, at 800 x 570 and at the desktop pane. Expected: at 800 x 570 the branch's draw calls are near the desktop pane's opening (about 1,774), not `main`'s 3,851;
   - at the furthest zoom-out, at both sizes. Expected: the branch's numbers are no higher than `main`'s at the same size.

   The builder says how it held the view for `perf=1`'s 300 frames (for example, zoomed out before the models finished loading). **Stop rule:** if at the desktop pane `Dfit` is over `Dmax` (the panels would cover the district's edge on a desktop window), or a branch number is higher than `main`'s at the same view, the builder stops and reports the rows ("stop 081 E5"). It does not move the factor or the panels to pass. **browser**.
6. [ ] Josh runs `npm run dev` on a desktop window and a phone-sized one: the city opens on the district; the wheel, pinch and `-` stop at a height where the job's pieces still read; a drag cannot take the district off screen; F comes back to the opening. With `cam=free` (dev) he can zoom out as before. **browser**.

**Count.** 3 added (criteria 2, 3 and 4), 0 rewritten, in a new `src/render3d/cityrig.test.ts`: fixture frames only, no city build, under 2 s (the builder gives its time). No test to remove.

**Files.** `src/render3d/tilecity3d.ts` (`createCityRig`, its options and its constants only); `src/render3d/cityview.ts` (`playRigOptions`, `CITY_PLAY_ZOOM_OUT` and the one `createCityRig` call with its console line; not `jobFrame`, `loadCityView`, the live layer, the FX calls or `perf=1`); new `src/render3d/cityrig.test.ts`. **Must not:** `plan3d.ts`, `tilecity3d.test.ts`, `src/play/` (`pan.ts` included), `src/ui/`, `src/main.ts`, `src/core/`. If the panels must change on small panes (E5-Q3's other option), that is a ui section, and the builder stops.

**Interfaces.** None in `src/core/`: `rigOpts.limit`, `playRigOptions` and `CITY_PLAY_ZOOM_OUT` are internal to `src/render3d/`. No event. No new dependency.

**Order.** It shares `cityview.ts` with **FX2** (open PR #62) and, later, FX3, L2, L3 and S4, but only at the one `createCityRig` call and one new function, away from the live layer and the build step. It may be built now, from `main`, beside FX2; whichever merges second merges `main` in. It shares `tilecity3d.ts` with **F2**, which is built only if F's measurements call for it; if F2 is open, E5 goes first.

**Questions for Josh (G1 card).**
- **E5-Q1, how far out the player may zoom**, as a multiple of `D0`, the distance at which the district with its four streets fills the whole window: **"1.5x (Recommended)"** (at the furthest, the district fills about two thirds of the window's width or height; criterion 5's stop rule catches it if a desktop opening needs more), "1.25x" (tighter; on a desktop window the panels may then cover the district's edge at the opening), or "2x" (looser). Today's limit is 1.6x the opening, which grows with the panels.
- **E5-Q2, a dev switch that lifts the limits:** **"Yes, `cam=free` in dev only (Recommended)"** (section F's wide-view measurements can be repeated), or "No switch".
- **E5-Q3, a pane too small for the panels and the district** (the 800 x 570 case): **"Hold the camera at the limit; the panels may cover the district's edge (Recommended)"**, or "Also fold the panels on small panes" (a separate ui section, cut after this one).

### K2ep · "pre-check 081 K2e" (pipeline-designer). Branch `ticket/081-puzzles-on-the-city` (a note)
The re-cut below is option C as section 3 of `docs/design/081-CK9-every-building-wired.md` sketched it, with one addition: **drops join CK17d's 1 m clearance** (see K2e criterion 4). The note's section 5 asks for a fresh pre-check in that case. The pipeline-designer measures, on the four pin cities (the rule depends on how cities vary):
- how many roof span places stage 6 stops offering, by `over`, and whether any of the pilot fits B1q found (03, 04, 07, 09, 10, 11, 12, 14) loses a span it needs;
- whether judging the drop's pole end on the pole's axis (stage 6's reading) and on the insulator K3b draws it to (criterion 1 there) ever give different answers at 1 m;
- that K2e's criteria 1 to 3 reproduce the note's numbers (176 to 199 new drops; 0 left over; lowest drop point 4.82 m).

It writes `docs/design/081-K2e-precheck.md`. If it does not report "holds", the main session takes its question to Josh before K2e's builder starts.

### K2e · Stage 6: every street-facing building wired (grid-simulator, pure). Branch `ticket/081k2e-every-building-wired`, after K2ep
**From.** Josh, 24 Nov 2026 (top of `docs/design/081-CK9-every-building-wired.md`): "The buildings are not attached to the Power lines"; on cards "Every building wired", "Yes, a fitting (Recommended)", "Same height (Recommended)", "Leave (Recommended)", "Allow (Recommended)". Option C is taken. CK9 is re-worded in `docs/design/070-K1-circuit.md` with this cut.

**Goal.** At `?city=plan&stage=6`, every building with a front column on a street has one drop: from its own pole line, or from a crossing pole on its own pavement, or across the street. The era passes keep clear of the new drops, and their pins are re-taken.

**Acceptance criteria.**
1. [ ] **CK9 as changed (`layDrops`).** For a building with a front column on a street:
   - **On the pole pavement:** as today (own line, never a crossing pole, `DROP_MAX_M` 7.5 m; pairing and ties unchanged).
   - **On the non-pole pavement, own pole first:** when a crossing pole on its own block side (`kind: "crossing"`, same `block` and `side` as the building's front) is within `DROP_MAX_M` of a front column's wall point, the drop runs from the closest such pair (ties as today).
   - **Otherwise, across the street:** from the closest pair of a front column and a pole on that street's pole pavement (any block, never a crossing pole), up to the new `DROP_CROSS_MAX_M` **23.5 m** in plan (the note's longest is 23.03 m). It sets `street` (`CityDrop.street`, added to `src/core/` with this cut). A drop over a junction's or a zebra crossing's cells is allowed (Josh: "Allow (Recommended)").
   - Every drop meets the wall at `DROP_WALL_Y_M` 5.5 m (Josh: "Same height (Recommended)").

   **test**: 1 fixture case: a far-side building within 7.5 m of its own crossing pole takes it, and one with none takes a drop across, with `street` set.
2. [ ] **CK9's check (`placeProblems`), flipped.** Fails: a building with a front column on a street and no drop (on either pavement); a far-side drop across the street when an own crossing pole was within reach; a drop longer than its reach (7.5 m own pavement, 23.5 m across); a drop to a building facing a park. The "never crosses a street" and "never a crossing pole" failures go. **test**: 1 rewritten, the existing "CK9: a drop from a pole across the street fails ..." case (`circuit.test.ts`), re-titled.
3. [ ] **CK7 binds drops; 059's 5.5 m does not** (Josh: "Same height (Recommended)", lifting 059's road clearance for drops, as card 5 did for crossings). Every drop's lowest point is at least `WALK_FLOOR_M` 4.2 m, with its pole end at the lowest attachment of its `poleModels` key, the wall end at 5.5 m and the sag at `SAG_RATIO` on its length, as K2d1 reads spans. `circuitProblems` reports a failure as "CK7". A drop at 4.8 m over a carriageway passes. **test**: 1 fixture case.
4. [ ] **CK17d keeps roof spans 1 m from drops (the architect's call, see the reading below).** `layRoofSpans` does not offer a roof span whose curve comes within `ROOF_CLEAR_M` 1.0 m of any drop's curve, **except a drop from one of the span's own end poles** (the two wires meet at that pole; `judgeSpan` already exempts its own poles' spans and marks), both hung as criterion 3 and K2d1 criterion 8 read them: the drop's pole end **on the pole's axis**, at its lowest attachment (see the reading below). CK17d's layer check says so too. **test**: 1 fixture case, which also holds the exemption (a drop from the span's own end pole does not refuse it).

   **Re-worded 24 Nov 2026 on K2ep** (`docs/design/081-K2e-precheck.md`, section 1): read literally, "any drop" refused 1,556 to 1,760 places a city (about 40%), because every roof span ending on a pole with a drop meets it there. With the exemption, 4 to 18 a city, all `street`, and no pilot fit loses a span it needs. The criterion 7 report should show about 6 on seed 1 (sketch figure, not tuned to).
5. [ ] **The pins it moves**, re-taken once each and listed with old and new values. **test**: at most 4 rewritten:
   - stage 6's own, `9ff1b134`, in the R-1 to R-7 case of `src/city/circuit/circuit.test.ts` (it also asserts nothing on seed 1 fails CK1 to CK17d);
   - `src/city/tech/named.test.ts`, "criterion 9, the digest pin (R-4)" (`7c991996`);
   - `src/city/holdout/named.test.ts`, "pins, on the four pin cities ... power and settle parts";
   - `src/city/ruin/named.test.ts`, "pins, on the four pin cities ... growth part".

   The eras read drops through `circuitPoints` (`tech/circuit.ts`, `holdout/guard.ts`, `ruin/grow.ts`, `ruin/guard.ts`), so these move. Their code is not edited.
6. [ ] **The pins it must not move.** Stages 7, 8 and 9 keep only poles and lights (`keep`), and H4 reads `roofKeep`, so these pass unedited: stage 7's in `src/city/facades/stage.test.ts`, stage 8's in `src/city/ground/stage.test.ts`, `GROUND_PINS` and the stage 9 `PINS` in `src/city/traffic/stage.test.ts`. K2c's "plays the same" case, K3's seed 1 case (`circuitdraw.test.ts`) and E2's seed 1 cases pass unedited. **test** (existing).
7. [ ] **Seed 1's counts, printed once in the reply, never tuned to:** drops by kind (own line, own crossing pole, across), buildings with a front column and no drop (0 expected), the longest across, the lowest drop point (4.82 m expected on the four), drops over junction cells, roof span places no longer offered, and stage 7 clashes (escapes, face signs; Josh: "Leave (Recommended)"). **no test**.

**The stop rule.** The builder stops and reports ("stop 081 K2e", with the branch) if:
- a pin in criterion 6 moves;
- a T-1 or T-2 assertion in an era's tests fails against the new drops (an era piece now covers or seals one). That is a question for Josh about T-1 or T-2, as K2a2 said, not a fix here;
- more than 2 further cases outside `src/city/circuit/` need rewriting. They are listed, and the architect re-cuts.

**Count.** 3 added, 5 rewritten (criteria 2 and 5), and at most 2 more under the stop rule: at most 10.

**Files.** `src/city/circuit/` (`places.ts`, `checkplaces.ts`, `roofplaces.ts`, `checkroofs.ts`, `constants.ts` for `DROP_CROSS_MAX_M`, `stage.ts` to hand drops to `layRoofSpans`, and their tests). Also, as I2 did (test policy rule 6), the **digest pin lines only** of the three era cases named in criterion 5: `src/city/tech/named.test.ts`, `src/city/holdout/named.test.ts`, `src/city/ruin/named.test.ts`. No other line in those folders changes. `src/core/` is the architect's (`CityDrop.street` is committed).

**Readings this cut makes (the architect's; none is a new number or a Decided rule):**
- **CK14, a drop that hangs from another block's pole.** A drop belongs to the block of its **pole** (`CityPole.block`; a crossing pole's is the block it stands beside), not of its building. That is the check as built (`districtProblems`: "hangs from a pole outside the district"), unchanged. So:
  - a job may light a building across a district street from a district pole, though the building's block is outside the district: the wire runs over a district street, which is inside the district "kerb to far pavement";
  - a district building fed across the street from a neighbouring block's pole is scenery to that job (it stays dark). It joins a job whose district holds the pole's block;
  - Josh's B1-Q5 ("Neighbouring blocks too") is for roof spans only and does not reach drops.

  **no test**: K2c's existing CK14 case holds the pole check, and no code changes. *(Proposed, as CK14's scenery clause is.)*
- **CK17d and drops: yes, kept 1 m, at the layer.** Drops are drawn on every plan, so a used roof span that touches one always shows. Refusing it where it is offered keeps P1, the fit and every job unaware of drops. The note measured 3 to 10 such near-touches a city. K2ep measures what that costs before the builder starts.
- **059's 5.5 m** no longer binds drops (Josh's words above). It still binds along and corner spans, which no rule lets over a carriageway.
- **The drop's pole end for CK17d: the axis, not K3b's insulator** (settled 24 Nov 2026 on K2ep section 2, the architect's reading; *Proposed*, not a Decided rule). Stage 6 judges a drop from the pole's axis at its lowest attachment, as it judges spans (K2d1). K3b draws it from the nearest `ownInsulator` attachment, up to 0.9 m off the axis, and K2ep found the two readings differ on 1 to 5 places a city (only the insulator refuses them). The axis is kept because:
  - the insulator offsets live in `powerkit.ts` (`src/render3d/`), and stage 6 may not import them. Judging on them means moving every model's attachment table into `src/core/` (a PK-sized section) for 1 to 5 places a city;
  - the feed's pole is swapped for the feed pick at draw time only (K3), so stage 6 cannot know that pole's insulators at all;
  - such a place shows only in a job that uses that roof span (roof spans are drawn only when used), and no pilot fit uses one.

  **The catch:** K3b's criterion 5 reports, by id, the roof span places on seed 1 whose curve comes within 1.0 m of a drop as K3b draws it (K2ep: 1 on seed 1). P2a's puzzle-designer lays round those ids, and its notes say if a pilot uses one. If a pilot ever needs one, the architect re-cuts this reading.

### D4 · The wall fitting shortlist, and the drop wire's gauge (pipeline-designer; a note, no code). Branch `ticket/081-puzzles-on-the-city` (a note)
**Goal.** As D1 did (`docs/design/081-D1-component-shortlist.md`), so the main session can put two cards to Josh (Josh: "Shortlist (Recommended)").

**Acceptance criteria.** All **no test**.
1. [ ] `docs/design/081-D4-wall-fitting-shortlist.md`. **The wall fitting:** up to six candidates from the converted packs (a wall insulator, bracket, service head or wall box), in manifest order, not ranked. For each: its `pack:name`; size in metres; triangles; what `docs/design/073-pack-intended-use.md` and the pack's store images say of it; **where a wire meets it** (height over its base, offset from its back), measured from the model; whether it reads at 5.5 m on a storey 1 facade from the default camera and from `cam=street`; its gallery link.
2. [ ] **The drop wire.** `POWER_LINE`'s drawn thickness today (about 6 cm), and every pack wire or cable piece `fitLine` could hang (a length along one axis, as 071 Q11's), with its thickness and gallery link. "Keep `POWER_LINE`" is listed first. A scaled-up wire is not listed: the kit draws pack pieces at true size. If Josh wants one anyway, that is his to say.
3. [ ] **Pictures for the cards** go to `assets/private/` (git-ignored), as D1's did. Nothing from a pack is committed.

**The picks (the main session, not an agent).** Two cards: `wallFitting` (D4's candidates) and `dropWire` ("Keep `POWER_LINE`" and D4's candidates). His words and the date go into a new **Scenery** table at the bottom of `docs/design/081-component-picks.md`, one row per piece of `CIRCUIT_SCENERY` (`src/core/citycircuit.ts`, committed with this cut).

**Files.** `docs/design/081-D4-wall-fitting-shortlist.md`.

### K3b · The drops drawn attached (renderer). Branch `ticket/081k3b-drops-attached`, after Josh's D4 picks
**Josh's D4 picks are in** (24 Nov 2026, on cards; recorded in the Scenery table of `docs/design/081-component-picks.md`):
- `wallFitting`: **"C: City bracket"**, `city-pack:SM_Prop_Sign_Attachment_02` (0.21 x 0.67 x 0.34 m, 44 triangles). D4's wire point: the upper arm's tip, **0.53 m over its base, 0.34 m out from its back**. City Pack is already loaded, and no `CITY_NEVER_USED` stem covers it.
- `dropWire`: **"Keep POWER_LINE"**. Drops hang with `POWER_LINE`, as spans do. `SCENERY_MODELS.dropWire` has `key: null` (null keeps `POWER_LINE`, as `CircuitSceneryPick` says) with Josh's words and the date. No new wire key enters `circuitKeyUses()`.

**Why.** The drop investigation (24 Nov 2026) found the drops look unattached at both ends: no fitting at the wall; a wire of about 6 cm; the pole end hanging between the outer insulators at `lowestAttach` (`circuitdraw.ts`), on no insulator. K2e fixes the fourth reason (one drop a building, none on the far side). K3b does not need K2e: it draws whatever drops the layer has.

**Goal.** At `?view=3d&city=tiles`, every drop leaves a real insulator on its pole and meets the City bracket (`SM_Prop_Sign_Attachment_02`) on the building at its upper arm's tip, hung with `POWER_LINE` (Josh: "Keep POWER_LINE").

**Acceptance criteria.**
1. [ ] **The pole end on a real insulator.** A drop's pole end is the attachment of its pole's drawn model (the ground mix, or the feed pick) with `ownInsulator: true` that is nearest the drop's wall point in plan, at that attachment's place on the placed pole (`poleAttachModel` and `poleToWorld`, `powerkit.ts`, read only). It is never lower than `lowestAttach`, so stage 6's heights hold. Spans and roof spans end as today. **test**: 1 rewritten, "draws every pole on its poleModels model and every span and drop as wire ..." (`circuitdraw.test.ts`): a drop ends on an insulator, spans as before.
2. [ ] **The wall fitting.** A new `SCENERY_MODELS: Record<CircuitSceneryPiece, CircuitSceneryPick>` in `componentmodels.ts`, transcribed from the picks note's Scenery table. At every drop's wall point, the `wallFitting` model (`city-pack:SM_Prop_Sign_Attachment_02`) stands unscaled (guide chapter 2), its back on the wall, facing out along the building's front side, its base 0.53 m under the drop's `y_m` (5.5 m), so the upper arm's tip, 0.34 m out from the wall, is at the drop's height. The drop's wall end is that tip. The builder reads both offsets from the model and reports them if either differs from D4's by more than 2 cm.
   - A null key draws nothing, and the drop ends at the wall point as today.
   - A picked model that did not load draws K3's placeholder, never a throw.
   - A building lamp (`lampBuilding`) stands under the fitting, `ON_POLE_GAP_M` below it, not inside it.
   - Drops hang with the `dropWire` key when it is set; spans keep `POWER_LINE`. Josh's pick leaves it null, so drops keep `POWER_LINE` too.

   **test**: 1 added.
3. [ ] **The tables equal the note.** D3's "the table equals the note row for row" case also covers the Scenery table. **test**: 1 rewritten.
4. [ ] **Keys.** `circuitKeyUses()` lists the bracket on a new `"fittings"` list. The drop wire's key goes on `"drops"` only when `dropWire` is set; with "Keep POWER_LINE" it is not, and `POWER_LINE` is there already. So `planKeys()` and 082 A's `gameModelKeys()` include the bracket with no other change, and R12 allows it only on `"fittings"`. **test**: 0 rewritten expected; the R12 case in `plan3d.test.ts` is rewritten only if the new list makes it fail. After merge, the game pack is stale until `npm run assets:game` is run again (082 B). 082 A never uses a stale pack in part, so the page falls back to the full packs.
5. [ ] **Reported, not tuned:**
   - how many fittings meet a stage 7 escape or face sign on seed 1, and the fitting's top against storey 2;
   - by id, the roof span places on seed 1 (`layer.roofSpans`, used or not) whose curve comes within `ROOF_CLEAR_M` 1.0 m of a drop drawn from its insulator (criterion 1) to the bracket's wire point (criterion 2), skipping drops from the span's own end poles. K2ep found 1 on seed 1 that stage 6's axis reading keeps offering (K2e, "The drop's pole end for CK17d"). The list goes to P2a.

   **no test**.
6. [ ] Josh views 6 x 6 seed 1 at `?view=3d&city=tiles`, from the default camera and `cam=street`. With K2e merged, the far-side buildings too. **browser**.

**Count.** 1 added, 2 rewritten: 3 (4 if criterion 4's R12 case must change).

**Files.** `src/render3d/circuitdraw.ts`, `circuitdraw.test.ts`, `componentmodels.ts` and its test; `plan3d.test.ts` (the R12 case only, if criterion 4 needs it). **Must not:** `cityview.ts` (E3's), `powerkit.ts` (read only), `src/city/`, `src/core/`, `src/ui/`.

### The CK9 path: order and parallel work (cut 24 Nov 2026)
| Now, at once | Then | Shared files |
| --- | --- | --- |
| E3 (build), K2ep (pre-check), D4 (note) | K2e after K2ep; K3b after Josh's D4 picks. K2e and K3b may run at once. | None. E3 has `cityview.ts`; K2e has `src/city/circuit/` and three era pin lines; K3b has `circuitdraw.ts` and `componentmodels.ts`. K2ep and D4 are notes. |
| (24 Nov 2026: K2ep holds; D4's picks are in) | K2e and K3b now, at once. E4 once E3 merges, beside them. | E4 and E3 share `cityview.ts` (E3 first). E4 shares no file with K3b or K2e. |

### L · Lit buildings: windows and light on the street (renderer). Cut 24 Nov 2026, in three PRs: L1, then L2 and L3
**Josh, 24 Nov 2026, in chat:** "I would like to update the lighting too. Rather than lighting a lamp. I would like the connected building's windows to light up and impact the lighting on the street." He showed the POLYGON City Pack store image (a rainy night street: warm lit windows, light spilling onto pavement and road). On cards:
- which buildings light: **"Puzzle buildings only (Recommended)"**: a puzzle lamp on a building (`{ building }` place) lights that building's windows while it is lit. **Overtaken 24 Nov 2026** by Josh's later words, in chat: "I would like all buildings to receive power if they are connected to the feed. I would also like the feed to show as being connected to each building", and on cards "Drop on a live pole (Recommended)" (`docs/design/081-all-connected-powered.md`). L1 was built and merged to the first answer and stands as built; scenery buildings on the job's live poles light their windows too, through L1's path, from section S (S1, S4);
- the wall lamp (`lampBuilding` pick): **"Remove it (Recommended)"**;
- the unpowered city: **"A few dim windows"** (scattered faint candle-light). This amends E2's "the rest of the city is dead" for windows only;
- the street: **"Yes, a light pool (Recommended)"** (warm light on the pavement and street in front).

**Josh's answers, 24 Nov 2026, on cards:** "Approve L1-L3 (Recommended)"; L-Q1 "Pack's night glow (Recommended)"; L-Q2 "Mast's building (Recommended)"; L-Q4 "Real lights" (not the painted decal; L2 is re-cut for it, below). L-Q3 is still to be asked, before L3; L-Q5 (added with the L2 re-cut) before L2.

**Josh's answers, 24 Nov 2026, on cards (later):**
- **L-Q3:** **"1 in 25, steady amber (Recommended)"**: `DIM_SHARE` 1/25 of window pieces, steady (no flicker), at `DIM_LEVEL` 0.15 of a lit window. L3 is built to it.
- **L-Q5:** **"Up to 10, no shadows (Recommended)"**: one light per lit building, no shadows. **Overtaken** by the next card.
- **L2's cap, given 26 lit buildings in P0's win** (asked with the all-connected pre-check, `docs/design/081-all-connected-powered.md`): **"Raise the cap"** (measured first). L2 is re-cut below: no shadows stands; the cap is 32, made at build at intensity 0, and ships only under a measured frame-time stop rule. With Josh's later "Dark" (the feed's own pole's building stays dark), P0's win lights 25 buildings by the pre-check's count (22 scenery and 3 lamp buildings), not 26, before any L1 lights as backed onto them.

K3b merged with its lamp-height must-fix open ("Merge as is (Recommended)"), because L1 removes the lamp. L1 closes that must-fix, and K3b criterion 2's lamp bullet ("A building lamp stands under the fitting") is superseded.

**How the windows are built (read 24 Nov 2026 from the converted City Pack GLB and its textures in `assets/private/`).**
- Every plan building is City Pack stack pieces cloned per building (`plan3d.ts` `buildingBoxes`: one `building:<id>` group each, in `PlanDraw.buildings.groups`), painted with a colourway atlas. Each piece is **one mesh with one material** (`MeshStandardMaterial`, base map only). No material in the pack carries emission.
- **The windows are a texture region, not meshes or material slots.** Window panes are faces UV-mapped onto three blue glass swatches at the atlas's bottom right: pixels about x 512 to 852 and y 910 to 1024 of 1024 (glTF v, top down), split at about x 626 and 739. Measured glass area per piece: `SM_Bld_Apartment_01` 2.79 m2 over the three swatches (0.92 / 0.93 / 0.94), `Apartment_Corner_01` 5.58, `Apartment_Stack_01` 8.38, `Apartment_Door_01` 1.80 (one swatch), roofs 0. The colourway atlases keep the layout.
- **Shopfronts are the exception.** `SM_Bld_Shop_*` hold no glass. Their glass is the separate `SM_Bld_Shop_*_Glass` keys, drawn by stage 7's dressing as one instanced dark glass material for the whole city (`models3d.ts` `dressGroup`, `GLASS_KEYS`).
- The pack's own night look is `Textures/Emissive_01.png` to `_05.png` (1024 x 1024, in the atlas's UV layout). Each is black except the same three swatches (in `_01`: warm amber, pale cream, near black) and some signs and signals. That is the lit window in the store image.

**The choice (the architect's): an emissive window mask made in code, swapped per building.**
- A window is dark, dim or lit through its piece's material. A lit or dim piece takes a clone of its material with `emissiveMap` set to **one shared window mask**: a `DataTexture` made in code from `WINDOW_UV` (the measured glass rectangle and its three panes), with each pane's colour from Josh's card L-Q1, `emissive` white and `emissiveIntensity` as its level. Dark pieces keep the shared material untouched.
- **Not the pack's Emissive PNG.** It also lights signs and signals, and loading it would need converter, manifest and game pack changes (`tools/assets/`, the grid-simulator's) for three rectangles of colour. The builder reads the pane colours once from `Emissive_01.png` and types them in as numbers, as D4 measured the bracket. Nothing from the pack is committed.
- **Not instanced attributes.** Buildings are clones, not instances, so a per-building material costs no draw call. The few lit buildings (a job's lamps) take their own clones, so each animates alone. Dim pieces share one clone per source material.
- **Not real lights for the windows.** The windows glow by emission only. The light on the street is real lights, in L2 (Josh, L-Q4: "Real lights").

**Readings (the architect's; none is a Decided rule):**
- **Lamp posts keep E2's glow and pool.** A post lamp has no building. Only `{ building }` lamps move onto windows.
- **A lamp on a roof structure** (`{ roof }`, allowed by B1-Q1 "Anything") lights the mast's building (`CityRoofMast.building`). Card L-Q2 asks Josh to confirm this. L1 builds the recommended option unless he picks the other. No pilot fit is known to put a lamp on a roof.
- **A building with two job lamps** takes the brighter of the two each frame.
- **A job lamp's building never takes dim windows,** lit or not. A dark lamp must read dark (brief, Decided: "Signatures: current reaches a dark lamp").
- **059's street lights are untouched.** On the city view they are scenery and stay dark (E2 criterion 3). The new pools are warm and lie only in front of lit job buildings. 059's cool street-light pools are not drawn on any city view, so the two never meet. No conflict found.

**Pipeline-designer pre-check: not needed.** No grammar rule, stage or city number changes: all of L is drawing in `src/render3d/`. The dim share and the colours are looks Josh picks on cards (below), not city rules.

**Cards for Josh (the main session asks them; recommended options first):**
- **L-Q1, before L1: the lit window's colour.**
  - "The pack's own night glow (Recommended)": as in the store image (Emissive_01), two of three panes warm amber and pale cream, the third near dark.
  - "Every pane lit": as in Emissive_03, the third pane a dimmer brown.
  - "One warm colour": every pane the same amber.
- **L-Q2, before L1: a lamp on a roof structure.** "Light the mast's building (Recommended)" or "A glow on the mast, as a lamp post".
- **L-Q3, before L3: how many dim windows, and how they burn.**
  - Share of window pieces (one storey, or a three-storey stack, of one column): "About 1 in 25 (Recommended)", "About 1 in 10" or "About 1 in 50".
  - Their light: "Steady, faint amber (Recommended)" (about 15 % of a lit window's level), or "A slow candle flicker".
- **L-Q4, before L2: how the pool is made.**
  - "A painted glow on the ground (Recommended)": one instanced decal, one draw call, which lights only the ground.
  - "Real lights": also lights walls, cars and props, but adds per-pixel cost on every lit material, and the shaders rebuild whenever the number of lights changes. If he picks it, the architect re-cuts L2 and its budget is measured again before Josh plays.
  - **Answered: "Real lights"** (Josh, 24 Nov 2026).
- **L-Q5, before L2: how many street lights, and shadows.**
  - "One per lamp building, up to 10, no shadows (Recommended)": every lit building lights its own street; a per-pixel cost on every lit material, held by L2 criterion 3's budget.
  - "Up to 4, given to the lit buildings nearest the camera": cheaper on a big job, but a far lit building's street stays dark, and a light can jump between buildings as the camera moves.
  - "One per lamp building, and the brightest casts shadows": walls and cars throw shadows on the street from one light; a shadowed point light draws the city six more times a frame, so the architect re-cuts L2's budget first.

**Order.** L1 shares `cityview.ts` with **E4** (open PR #53: `cityHit`, `HitInputs`, `paintOverlay`, `cutAt`), so it branches from `main` after E4 merges. It shares no file with **K2e** (`src/city/circuit/`). L2 and L3 branch after L1 merges (L2 after L-Q5, L3 after L-Q3), and may be built at once: L3's only `cityview.ts` change is one call in the build step.

#### L1 · The lit building's windows; the wall lamp goes (renderer). Branch `ticket/081l1-lit-windows`, after E4 merges and L-Q1 and L-Q2 are answered **Done** (PR #55; review round 2: meets)
**Goal.** Playing `city-two-ways-round`, each lamp's building is dark until current lights it. Then its windows (and its shopfront glass) glow warm. They ignite in the Relight's order with E2's flare, and flicker in a brownout. No wall lamp stands on the building.

**Before the build (the main session, not an agent):** record Josh's "Remove it (Recommended)" (24 Nov 2026) in `docs/design/081-component-picks.md`, in a new **Removed** list under the table. The `lampBuilding` row stays as the history of his first pick.

**Acceptance criteria.**
1. [ ] **The window mask.** A new `src/render3d/windows.ts` exports:
   - `WINDOW_UV`: the glass rectangle and its two pane splits. The builder measures them from the atlas to the pixel and reports them against this cut's figures;
   - the three pane colours: Josh's L-Q1 pick, read from the pack image once;
   - `windowMask()`: one shared `DataTexture` (at most 1024 x 1024, `flipY` false, as glTF's are), black outside the rectangle and each pane's colour inside it.

   **test**: 1 case: texels inside each pane are its colour, and texels just outside the rectangle are black.
2. [ ] **A building's window level.** A pure `buildingGlow(plan, state, lamps, relT, time, out)` in `windows.ts` takes the building's job lamps (`{ id, index }`) and gives `{ level, flare }`. It is built from E2's `lampState`, `lampFlicker` and `FLARE_SECONDS`:
   - the level is 0 while no lamp of the building is lit;
   - in the Relight it is 0 until its lamp's arrival, then lit, with E2's flare pop for `FLARE_SECONDS`;
   - in a brownout it dips as E2's lamps did;
   - with two lamps, the brighter one counts.

   **test**: 2 cases: (a) the Relight on P0's file, through `relightFrame`'s plan: each lamp building's level is 0 before its lamp's arrival and above 0 after it, in the order `relightFrame` lights the lamps; (b) a brownout dips a lit building below 1, and two lamps on one building give the brighter level.
3. [ ] **The swap.** `litBuilding(group)` gives the building's pieces clones of their materials with the mask. The clones are made **when the city builds** (level 0 until lit), so no shader compiles during play. Setting a level writes `emissiveIntensity` on that building's clones only. Every other building keeps the shared materials, untouched. **test**: 1 case, on a fixture of two buildings whose pieces share one material: the lit building's pieces carry the mask and its level, and the other building is unchanged.
4. [ ] **The shopfront glass.** A lit building's `SM_Bld_Shop_*_Glass` dressing (its `dressDraws` entries) glows at the building's level. It is one more instanced mesh, over the dark glass, for all the job's buildings; the dark glass instancer is not edited. **test**: folded into criterion 3's case if it can be built from a fixture; otherwise **browser**, and the builder says why.
5. [ ] **E2's glow and pool go for building lamps.** `cityview.ts`'s `LampGlow` sphere and circle stand only for `{ post }` lamps. **test**: 0 added. E2's cases pass; one is rewritten only if it asserts a building lamp's sphere, and the builder lists it.
6. [ ] **The wall lamp goes.**
   - `COMPONENT_MODELS.lampBuilding` gets `removed: { words: "Remove it (Recommended)", date: "2026-11-24" }` (`CircuitComponentPick.removed`, committed with this cut).
   - `circuitDraws` stands no model and no placeholder for a removed pick, and `circuitKeyUses()` no longer lists its key.
   - The lamp's place (the drop's wall point) still holds its pick proxy, `centreOn`, `placeAt` and its overlay icon, as E2 and E4 hold them.

   **test**: 2 rewritten:
   - K3b's "stands the City bracket at a drop's wall point ... the building lamp under it ..." (`circuitdraw.test.ts`) drops the lamp's height line, and asserts there is no lamp model and no wall lamp key;
   - D3's "equals docs/design/081-component-picks.md row for row" (`componentmodels.test.ts`) also reads the Removed list.
7. [ ] **The game pack.** `SM_Prop_Light_Wall_01` leaves `gameModelKeys()` (082 A). After merge the game pack is stale, and the page falls back to the full packs until the main session runs `npm run assets:game` again (082 B). The mask is made in code, so no texture or manifest changes. **no test**.
8. [ ] **The frame measure, dev only.** `perf=1` in the address logs once, after 300 frames: draw calls, triangles, `gl.info.programs.length` and the median frame time. The builder reports these numbers on 6 x 6 seed 1 with P0, both before any power and after the Relight. It must show **no new program** between the first frame after the models load and the end of the Relight (criterion 3), and at most 1 more draw call (criterion 4). **browser**.
9. [ ] Josh plays `city-two-ways-round` from `npm run dev`: the three lamp buildings start dark, light in the Relight's order and flicker in a brownout, and there is no wall lamp. **browser**.

**Count.** 4 added, 2 rewritten: 6 (5 if criterion 4 is browser).

**Files.**
- new `src/render3d/windows.ts` and `windows.test.ts`. Under 2 s, except criterion 2(a)'s P0 view through the module cache; the builder gives its time;
- `src/render3d/cityview.ts`: the lamp part of the live layer, the build step and the `perf=1` log; not `cityHit`, `jobFrame` or `loadCityView`;
- `src/render3d/circuitdraw.ts` and `circuitdraw.test.ts`: the removed pick only;
- `src/render3d/componentmodels.ts` and its test.

**Must not:** `overlay.ts`; `plan3d.ts` and `models3d.ts` (read only); `src/city/`, `src/core/`, `src/ui/`, `src/main.ts`, `src/play/`, `tools/`.

**On hold for section F (24 Nov 2026).** Josh was told the city is already below 60 fps before any street light (L2's branch, 6 x 6 seed 1, P0, `perf=1`: 20.90 ms before power, 25.40 ms after the Relight). He answered on a card: **"Speed up first"**. L2 (branch `ticket/081l2-street-lights`, pushed, no PR) waits until F1b merges. Then its criterion 3 is measured again, against F's closing numbers instead of L1's. L3 also waits for F1b, and its criterion 2 is re-cut to F1b's per-instance level (below). S4 waits for F1b too, because it feeds about 25 buildings into the windows path.

#### L2 · Real lights on the street (renderer). Branch `ticket/081l2-street-lights`, now (L1 is in; L-Q5 and the cap are answered). Re-cut 24 Nov 2026 for Josh's L-Q4 "Real lights", and again for "Raise the cap"
**Goal.** In front of a lit building, a real warm light falls on its pavement, the street, the walls either side and any car or prop in reach, rising and falling with its windows: dark until the Relight reaches its lamp, then up with the flare, flickering in a brownout.

**How (the architect's choice, under L-Q5's "no shadows" and Josh's "Raise the cap").**
- **Type.** One `PointLight` per lit-able building, **no shadows** (`castShadow` false; night keeps `shadows: false`, `lighting.ts`). A point light needs no target, and one shadowed point light renders the city six more times a frame. A spot light would cut a sharper cone than the store image shows.
- **Which buildings.** Every building in cityview's `lampsOf` (L1's `lampBuildings`: the job lamps' buildings and those L1 lights as backed onto them) that has a street face, never one per face or per window. Before S4 that is P0's 3 lamp buildings; S4 adds the scenery buildings to `lampsOf`, so they get their lights through this section with no L2 change. Order: the job lamps' buildings first, in lamp order, then the rest in `lampsOf`'s order.
- **How many: `STREET_LIGHTS_MAX` 32, under the stop rule (criterion 3).** P0's win lights 25 buildings by the pre-check's count (22 scenery and 3 lamp buildings, with "Dark"); the pre-check's fits 09 and 10 carry 19 and 20 scenery buildings beside 6 and 4 lamps; P2a's fits, laid for the camera, are expected nearer P0's count (the note's estimate). 32 holds those with room. A point light costs about 3 uniform vectors in the fragment shader, about 96 at 32, inside WebGL2's guaranteed 224. A job with more lit-able buildings than the cap lights the first 32 in the order above and logs one dev warning.
- **The pool, so no shader rebuilds in play.** Three compiles a material's program for the number of lights in the scene. So the lights are made **when the city builds**, one per lit-able building of the job (at most the cap), added to the scene at intensity 0, and never added, removed or hidden during play: dark is intensity 0, never `visible = false`. Their count is fixed from the first frame, so every program is compiled before play. The pool is the job's own count, not the cap: a job that can light 3 buildings makes 3 lights. The one exception is the dev day toggle: the rig hides night-only parts (`lightrig.ts`), so the first switch to day and back compiles once; that is dev only and accepted. A new job builds a new city, so its count is set again at load.
- **What they light.** Every lit (`MeshStandard`) material in reach: the ground, street and pavement surfaces, the building pieces' walls, the dressing's cars and props. `MeshBasic` parts (glows, overlay) are unchanged. The light stands 2 m out from the middle of the building's street face at 3 m up (the first floor's windows), or for a corner building over its corner pavement. Its reach (`distance`) is `STREET_LIGHT_REACH_M` (default 12 m, `decay` 2) and its colour the lit pane's amber from L1. Both are numbers Josh tunes by eye.
- **No painted pool.** The decal from the earlier cut is not drawn. E2's post-lamp pools are unchanged.
- **The hooks from L1.** Each frame a light's intensity is `STREET_LIGHT_INTENSITY x level`, with the flare pop, from its building's `buildingGlow` (L1 criterion 2). So the Relight's order and the brownout flicker come from L1 with no new timing.

**Acceptance criteria.**
1. [ ] **Which buildings, and where each light stands.** A pure `lightPlaces(plan, buildingIds, max)` in `windows.ts` gives one place per building with a street face, in the order given, at most `max`: in front of the middle of its street face (a column's `front` onto a street cell, never a yard or a park), or over the corner pavement for a corner building, at the height and offset above. A building with no street face gets none and does not count. **test**: 1 case on a fixture: a mid building's light stands in front of its street face, a corner building's over its corner, a backed-on building with no street face gets none, and 33 buildings with faces at `max` 32 give the first 32.
2. [ ] **The pool.** `streetLights(places)` makes the `PointLight`s once. `setStreetLights(lights, glows)` writes only intensities. **test**: 1 case: after setting one building lit and one dark, the scene holds the same number of lights, all visible, none casting a shadow; the dark one is at 0 and the lit one at `STREET_LIGHT_INTENSITY x` its level.
3. [ ] **The budget, and the stop rule for the cap.** `STREET_LIGHTS_MAX` is **10** in the code until this criterion's measures pass; only then is it set to 32. Measured with L1's `perf=1` on 6 x 6 seed 1 with P0, from the default camera in a desktop window on Josh's PC, against L1's numbers from the same view after the Relight. The dev switch `lights=N` fills the pool to N lights (the spares on the first building, at its level, so they cost as lit lights do):

   | Run | Median frame time, worse than L1's by at most |
   | --- | --- |
   | P0 as it is (3 lights) | 1.0 ms |
   | `lights=10` | 2.5 ms |
   | `lights=25` (P0's win with scenery) | 4.0 ms |
   | `lights=32` (the cap) | 5.0 ms, and the median itself at most 16.7 ms (60 fps) |

   Each run also shows no new draw call, and no new program between the first frame after the models load and the end of the Relight. The builder reports draw calls, programs, the median frame time and the fps for all four.
   - **All four within budget:** `STREET_LIGHTS_MAX` is set to 32.
   - **`lights=25` or `lights=32` over:** the builder stops and reports ("stop 081 L2", with the branch and the four rows). `STREET_LIGHTS_MAX` stays 10 and nothing above 10 ships. It does not pick a cap between, or tune the reach or the shader, to pass. The main session puts the numbers to Josh (for example: the largest cap that passed; up to 10, given to the lit buildings nearest the camera, L-Q5's second option; or a looser budget), and the architect re-cuts with his answer.
   - **P0 or `lights=10` over:** as the first cut said, the builder stops and reports.

   The budgets are the architect's, starting points for Josh, not GDD numbers. **browser**.
4. [ ] Josh plays `city-two-ways-round` from the default camera and `cam=street`: light falls on the pavement, street and walls in front of each lamp building as it lights in the Relight, and flickers in a brownout. **browser**.

**Count.** 2 added.

**Files.** `src/render3d/windows.ts` and `windows.test.ts`; `src/render3d/cityview.ts` (the lights in the build step and live layer, and the `lights=N` dev switch). **Must not:** as L1, and `lightrig.ts` and `lighting.ts` (read only).

**Interfaces.** No new dependency, no `src/core/` type: `PointLight` is Three's.

#### L3 · A few dim windows in the dead city (renderer). Branch `ticket/081l3-dim-windows`, now (L1 is in; L-Q3 answered: "1 in 25, steady amber (Recommended)"); after FX2, or merging `main` in once FX2 is in ("Approve, FX2 first (Recommended)")
**Goal.** Across the unpowered city, a scattering of window pieces glow faintly, like candle-light, never on a job lamp's building.

**Acceptance criteria.**
1. [ ] **Which pieces.** A pure `dimPieces(buildings, share, seed, exclude)` in `windows.ts`:
   - picks floor and `floor3` pieces, never the ground storey or a roof;
   - picks by a hash of the building id and piece index, so the pick is the same every load;
   - picks about `share` of them: `DIM_SHARE` is **1/25** (Josh, L-Q3: "1 in 25, steady amber (Recommended)");
   - picks no piece of a building in `exclude`: every building in cityview's `lampsOf` (the job lamps' buildings, those L1 lights as backed onto them, and from S4 the scenery buildings; see the reading above). **The architect's reading (Proposed):** a scenery building on a live pole that is dark (past a cut, or on the switch's other side) reads dark, as a job lamp does, so a faint window never makes it look half powered.

   **test**: 1 case on a fixture of about 200 pieces: the same pick twice, about `share` of them (within a tolerance the builder states), and none on an excluded building.
2. [ ] **Re-cut 24 Nov 2026 for section F; this replaces the wording that follows.** A dim piece's window level is F1b's per-instance level, set once at build to `DIM_LEVEL`. No material is cloned and no program is added. **test**: 1 case: the dim pieces' instances carry `DIM_LEVEL`, every other instance carries 0, and the building instancers' materials are unchanged. *The first cut's wording, kept as history:* **One material per source.** A dim piece takes a clone of its material with L1's mask at `DIM_LEVEL` 0.15 of lit, **steady** (Josh: "steady amber"): it never flickers, so nothing writes a dim clone during play.
   - Dim pieces share one clone per source material, made when the city builds.
   - No per-frame write: the level is set once at build.

   **test**: 1 case: two dim pieces on one material share one clone, and a piece that is not dim keeps the shared material.
3. [ ] **Budget.** With L1's `perf=1`, the dim windows add no draw call and no program. **browser**.
4. [ ] Josh views the city from the default camera and `cam=street` before any power: a few faint windows, none on the three lamp buildings. **browser**.

**Count.** 2 added.

**Files.** `src/render3d/windows.ts` and `windows.test.ts`; `src/render3d/cityview.ts` (one call in the build step). **Must not:** as L1.

**Rules coverage.** L1 adds the city view's windows to two rows of `tickets/rules-coverage.md`: "The Relight can't be interrupted" (the ignition order now shows on windows; E2's case still holds the rule) and "Capacity: over it, brownout" (a lit building flickers).

### S · Every building on a live pole is powered, and adds load. Cut 24 Nov 2026, in four PRs: S1, P0r, S4, U3 (and P1's criteria 10 and 11)
**Josh, 24 Nov 2026, in chat:** "I would like all buildings to receive power if they are connected to the feed. I would also like the feed to show as being connected to each building."

**On cards** (all recorded at the top of `docs/design/081-all-connected-powered.md`, with the pipeline-designer's measurements):
- which buildings: **"Drop on a live pole (Recommended)"**;
- do they draw on the feed: **"Yes, they add load"**;
- how to show it: **"Live drops glow (Recommended)"**;
- the puzzles' numbers: **"Raise (Recommended)"**: each puzzle's capacity and fuse ratings are raised by the scenery its intended win lights;
- what one building draws: **"Whole"** (1 lamp-load; `SCENERY_BUILDING_LOAD` in `src/core/citycircuit.ts`). The note measured 14 of 16 jobs playing the same at 1; 09 and 12 fail, and get the hand fixes in P2a;
- the building on the feed's own pole, outside the district: **"Dark"**.

**What it overtakes.**
- **CK14's dark-building line goes.** "A building the job does not name stays dark: it is not on the job" (Proposed) is struck in `docs/design/070-K1-circuit.md` with this cut, and CK14 says what lights instead. A building on a pole no job line uses still stays dark, so K2e's reading stands: a district building fed across the street from a neighbouring block's pole is dark to that job.
- **K2c's criterion 3** ("the same node and line ids as the file, none added") flips: the file's ids all stay, and the conversion adds hidden ones (S1).
- **L1's "Puzzle buildings only (Recommended)"** is overtaken by Josh's later words (recorded in section L). L1 stands as built and merged; S4 feeds the scenery buildings into its path.
- **L2's cap of 10** meets about 25 lit buildings in P0's win: Josh's "Raise the cap" (section L, L2 re-cut).
- **"Unchanged" city puzzles** are now **raised** ("Rules this ticket holds").

**No Decided GDD rule is touched.** Capacity and fuse rating are Draft ("New for the minigame (Draft, Josh's to tune)" in the brief; GDD 05, "Capacity and restraint"), and raising them is Josh's call. The Decided "Lamps are leaves" holds: a scenery load is a leaf and never blocks. The Decided signature "current up to a sparking break" holds: a building past a cut stays dark. **One Draft line differs:** the GDD's "Live cables don't glow" (08, "Cables in the dark") against Josh's "Live drops glow (Recommended)". His card stands for the prototype, since the line is Draft. The GDD's wording is a proposal in open question 10, not something this ticket changes.

**Pre-checks.** No fresh pre-check is needed before S1, S4, U3 or P1's criteria 10 and 11:
- S1's rule is the probe's, as section 3 of the note sketched it and section 6 built it (the line split, where each building hangs), at Josh's "Whole" (measured: 14 of 16) and "Dark". "Dark" only drops one building per job that is live whenever its feed is, a constant that "Raise" absorbs;
- P1's raise is the note's option B, as measured;
- S4, U3 and L2 are drawing and sound, not grammar rules.

A pipeline-designer call comes only from a stop: "stop 081 S1" (P0 does not play the same, or its count is not 22) or "stop 081 P1" (a pilot other than 09 and 12 fails raised). 09's and 12's fixes are P2a's designer's under answer 4, with the analyzer. If neither fix keeps the element under test, that goes to Josh (P2a).

**Order and parallel work.**
| Wave | Sections | Shared files | Why |
| --- | --- | --- | --- |
| Now, at once | S1, U3, L2, L3 | None between S1 (`src/city/circuit/`, P0's `capacity` line) and U3 (`src/main.ts`, `src/ui/logic.ts`). L2 and L3 share `cityview.ts` (L3 one call), as section L says. | The core types are in, so U3 codes against `hidden` before S1 writes it. |
| After S1 | P0r; P1 (criteria 10 and 11 need S1) | None | P0r writes P0's note; P1 is `tools/`. |
| After S1, L2 and L3 | S4 | `cityview.ts` | It feeds `scenery` into L1's and L2's paths. |
| After P1 | P2a (raised; 09 and 12 hand-fixed) | None | As before. |

#### S1 · Scenery buildings on the job's live poles, in the conversion (grid-simulator, pure). Branch `ticket/081s1-scenery-loads`, now
**Goal.** `convertCityPuzzle` hangs every scenery building whose drop is on one of the job's poles onto the job as hidden 1 lamp-load lamps. So `src/grid/` (unchanged) lights them while current reaches them and counts their load against the feed and its fuses. It returns `scenery` (building to hidden lamp) and `hidden` (every added id). P0's file takes its raised capacity.

**The rule (the pre-check probe's, worded for the build; Proposed where it says how):**
1. **Which buildings.** Each `layer.drops` entry whose `pole` is one of the job's poles: an interior (carrier) pole of a line's run, or a node's `{ pole }` place. **Not:** the feed's own pole (Josh: "Dark"); a building that is a `{ building }` lamp's place; a drop on any other pole. Roof structures carry no drops (CK17e). Each building counts once.
2. **The split.** Every line `L` of the file becomes three, scenery or not, so the grid's "nearer feeder" ties hold (the probe split every line; a partial split was not measured):
   - `L~a`, from `from` to the hidden junction `L~h1`;
   - `L`, from `L~h1` to `L~h2`. It keeps the id, so its faults, the check block's `repair:L` moves and `runs[L]` hold;
   - `L~b`, from `L~h2` to `to`.

   Each keeps the line's other fields. A switch's `outputs` and a battery's `input` name the segment next to the node (`L~a` where the node is `from`, `L~b` where it is `to`). `L~h1` and `L~h2` stand at 1/3 and 2/3 of the straight from `from`'s `pos` to `to`'s, so every path length the Relight's timing reads (`planRelight`) is unchanged.
3. **Where each building hangs.**
   - **On a carrier of `L`:** `L~h1`, or `L~h2` when the pole is past `L`'s cut span, counted from `from` along the run.
   - **On a node's pole:** on the node itself for a `junction` or a `fusebox` (so its load is under the fuse's rating). For a `switch`, on its input line (the one not in `outputs`) at the switch's end. For a `battery`, on its `input` line at its end. For a `breaker`, on the first line in the file's order that touches it, at the breaker's end. "At the node's end" is `L~h1` when the node is `from`, and `L~h2` when it is `to`. The feed's pole is skipped ("Dark").
   - A node of a type not listed here, on a pole with a scenery drop: stop (below).
4. **The lamps.** One hidden lamp for each attachment point, `<attach>~s` (for example `l_s~h1~s`, `j_h~s`), on a line `<attach>~s~l` from it. Its `load` is its buildings' count x `SCENERY_BUILDING_LOAD`. Its `pos` is its first building's drop wall point, over `CELL_M` as for a building lamp. `scenery` maps every building to its lamp.
5. **What stays the file's.** `target`: when the file has none, the output's `target` is the file's lamps, so a hidden lamp is never a target. `priority`, the parts, the faults and every file id are unchanged. `places` and `runs` hold no hidden id, so the overlay, the picks and the HUD never see one. A file id that contains `~` is a CK15 problem (it could collide with a hidden id). `decor` is unchanged.

**Acceptance criteria.**
1. [ ] **The split.** On a fixture job of a switch and two lines:
   - the output's lines and junctions are exactly as rule 2 says, and the switch's outputs name `~a` segments;
   - `L~h1` and `L~h2` are collinear, at 1/3 and 2/3;
   - `places` and `runs` are keyed by the file's ids only;
   - `hidden` lists exactly the added ids.

   **test**: 1 case.
2. [ ] **Carriers and the cut** (the Decided "current up to a sparking break"). On a fixture line with three carriers, each with a scenery drop, cut on its second span: the first carrier's building hangs on `~h1`, the later two on `~h2`. Run on `src/grid/` (allowed in tests): the first building's lamp is lit, and the two past the cut are dark. **test**: 1 case.
3. [ ] **Node poles.** On a fixture: a junction's building hangs on the junction; a switch's on its input line at its end; a fusebox's on the fusebox. On `src/grid/` the fusebox's counts toward the rating: one scenery building over the rating blows it on power (the Decided "Fuse rating: over it, blows on power"). **test**: 1 case.
4. [ ] **Who stays dark.** On a fixture, none of these is in `scenery`: the building on the feed's pole, a building that is a job lamp's place, and a building whose drop hangs from a pole no line uses. **test**: 1 case.
5. [ ] **Load, leaves and the win.** On a fixture with `capacity` equal to the file lamps' load and no `target`:
   - one live scenery building takes the feed over capacity, a brownout (the Decided "Capacity: over it, brownout");
   - `validatePuzzle` passes (hidden lamps are leaves);
   - the output's `target` is the file's lamps;
   - with the capacity raised by 1, the win completes with the scenery lit.

   **test**: 1 case.
6. [ ] **P0 plays the same, raised** (K2c's "plays the same" case, rewritten). `puzzles/city/city-two-ways-round.city.json` converts on 6 x 6 seed 1, one-way on, with 22 scenery buildings (the pre-check's 23, less the feed's pole's), and its note's check block replays as the schematic's does. **test**: 1 rewritten.
7. [ ] **K2c's "none added" case, rewritten.** Every node and line id of the file is in the output with its type, load, rating and capacity unchanged, and the ids that are not the file's are exactly `hidden`. **test**: 1 rewritten.
8. [ ] **P0's raised capacity.** The file's `capacity` line becomes 3 + the scenery load P0's check block's solution lights. The builder replays it once with the capacity unlimited: 3 + 22 = 25 if all 22 light, as the pre-check found. It reports the start's and the win's loads ("using X of 25"), and, once, outside the suite, the analyzer's fewest clicks, winning configs and dead first moves on the converted puzzle against the schematic's. **no test**: criterion 6 holds it, and P1's criterion 11 checks the number.
9. [ ] No import of `src/grid/` from `src/city/circuit/`, except in tests. **test** (K2c's existing case, unedited).

**The stop rule.** The builder stops and reports ("stop 081 S1", with the branch) if:
- P0 does not play the same raised: its start's lit file lamps, readable faults and blown fuses, its check block, or the analyzer's three numbers differ from the schematic's;
- P0's scenery count on seed 1 is not 22;
- a node type the rule does not list stands on a pole with a scenery drop in P0;
- more than 2 cases outside `src/city/circuit/` (E2's, E4's and L1's in `src/render3d/` that count P0's nodes or lines) need rewriting. They are listed, and the architect re-cuts.

It does not change the rule or a number to make P0 pass.

**Count.** 5 added, 2 rewritten, and at most 2 more under the stop rule: at most 9.

**Files.** `src/city/circuit/` (`convert.ts`, a new `scenery.ts`, `convert.test.ts`). Also, under test policy rule 6, as P0 did: the **`capacity` line only** of `puzzles/city/city-two-ways-round.city.json` (the puzzle-designer's; P0r writes the note), and at most 2 rewritten cases in `src/render3d/` under the stop rule, listed. `src/core/` is the architect's (`scenery`, `hidden` and `SCENERY_BUILDING_LOAD` are committed). **Must not:** `src/grid/`, or any other line of `puzzles/`.

#### P0r · P0's note re-opened with its raised numbers (puzzle-designer). Branch `ticket/081p0r-two-ways-round-raised`, after S1
**Goal.** `puzzles/city/city-two-ways-round.md` says what the scenery changed, so Josh knows why the HUD now reads "using 24 of 25" (S1's numbers) and not "using 2 of 3".

**Acceptance criteria.**
1. [ ] A **What changed from the schematic, and why** section, one item:
   - capacity 3 to S1's number, with Josh's words ("Yes, they add load", "Raise (Recommended)", "Whole", "Dark");
   - the 22 scenery buildings by where they hang (carriers, node poles), and how many stand on another block across a district street;
   - the start's and the win's loads.

   **no test**.
2. [ ] The check block stays the schematic's, copied (P0 is raised, not reworked). The analyzer's numbers are S1's report, stated equal to the schematic's. **no test**: S1's criterion 6 replays the block.
3. [ ] **What it taught us** keeps Josh's words so far; the designer adds none. **no test**.

**Files.** `puzzles/city/city-two-ways-round.md` only. **Count.** 0.

#### S4 · Scenery drawn live: the drops glow, the windows light (renderer). Branch `ticket/081s4-scenery-live`, after S1, L2 and L3 merge (and after FX2, or merging `main` in once FX2 is in: Josh, 24 Nov 2026, "Approve, FX2 first (Recommended)")
**Goal.** Playing `city-two-ways-round`, as the Relight's current reaches each scenery building on the job's poles, its drop glows and pulses like a job span, and its windows light through L1's path, with its street light from L2. Past a cut, or on the switch's other side, the drop and the building stay dark. They flicker in a brownout.

**Acceptance criteria.**
1. [ ] **The windows.** cityview's `lampsOf` gains every `converted.scenery` building with its hidden lamp (`{ id, index }` in `puzzle.nodes`), and the buildings backed onto it as L1 reads them. A pure `sceneryLamps(converted, buildings)` in `windows.ts` gives the entries. The scenery buildings then take, with no change to them: L1's clones at build; `buildingGlow`'s level, flare and flicker; the shop glass; L2's lights (after the job lamps' buildings, in L2's order); and L3's exclusion. **test**: 1 case on a fixture conversion: a scenery building maps to its hidden lamp, and `buildingGlow` gives 0 while that lamp is dark and above 0 when it is lit.
2. [ ] **The live drops** (Josh: "Live drops glow (Recommended)"). Each scenery building's drop (`drop:<building id>`, as K3b draws it, from its pole's insulator to the bracket) joins the live layer as a wire of its own, lit from its hidden lamp:
   - dark while the lamp is dark;
   - in the Relight, lit from the pole end at the lamp's arrival;
   - then E2's glow and pulses, pole to building, and E2's brownout wobble.

   It uses E2's instanced glow and pulse meshes, sized at build. No other scenery drop or span glows (CK14: the rest is dead). **test**: 1 case: the live layer's wires hold one per scenery drop, with its lamp, and none for a drop whose building is not in `scenery`.
3. [ ] **Hidden nodes stay hidden.** On P0's conversion with scenery, `overlayIcons` gives the icons of the file's nodes only, and no pick proxy stands for a hidden node. **test**: 1 case (in `overlay.test.ts` or `windows.test.ts`, the builder's choice; `overlay.ts` is not edited).
4. [ ] **The budget.** With L1's `perf=1` on 6 x 6 seed 1 with P0, after the Relight:
   - no new draw call against L2's P0 run;
   - no new program between the first frame after the models load and the end of the Relight;
   - a median frame time within L2's `lights=25` budget.

   Over it, the builder stops and reports. **browser**.
5. [ ] Josh plays `city-two-ways-round` from the default camera and `cam=street`: the scenery buildings round the ring light with their drops as the Relight passes, those past the spark stay dark until the repair, and the building on the feed's pole stays dark. **browser**.

**Count.** 3 added.

**Files.** `src/render3d/cityview.ts` (the live layer and `lampsOf`), `src/render3d/windows.ts` and `windows.test.ts`; `overlay.test.ts` (one case, if criterion 3 goes there). **Must not:** `overlay.ts`, `circuitdraw.ts` (read only), `plan3d.ts`, `models3d.ts`, `src/city/`, `src/core/`, `src/ui/`, `src/main.ts`, `src/play/`, `tools/`.

#### U3 · Hidden lamps make no Relight sound (ui). Branch `ticket/081u3-quiet-scenery`, now
**Goal.** The Relight still chimes once per lamp the puzzle names, not 22 more times for the scenery (the default; open question 11).

**Acceptance criteria.**
1. [ ] **The cues.** `relightCues` moves from `src/main.ts` to `src/ui/logic.ts` (or a new `src/ui/relightcues.ts`, if `logic.ts` should not import `src/render/`'s `planRelight`), unchanged but for a `hidden` argument (`converted.hidden ?? []`): a hidden lamp gets no ignition time, and the duration is unchanged. **test**: 1 case: on a fixture with one hidden lamp, `igniteAt` holds the file lamps' times only.
2. [ ] `main.ts`'s `lampIds` (the list-to-map highlight) leaves out hidden ids. **no test**: a hidden lamp has no place, so no hit can name it; this keeps the set honest.
3. [ ] Josh hears the Relight on `city-two-ways-round` after S1: three ignitions, as before. **browser**.

**Count.** 1 added.

**Files.** `src/main.ts`, `src/ui/logic.ts` and `logic.test.ts` (or the new `relightcues.ts` and its test). **Must not:** `src/render/`, `src/render3d/`, `src/play/`, `src/core/`.

### F · A faster city view (renderer). Cut 24 Nov 2026, in up to four PRs: F0, F1a, F1b, then F2 only if F0's numbers call for it
**Josh, 24 Nov 2026, on a card**, when told the city is already below 60 fps before any street light: **"Speed up first"**. L2 is on hold until F1b merges (section L).

**Measured by the main session** in the browser pane on Josh's PC: L2's branch, 6 x 6 seed 1, `?puzzle=city-two-ways-round&perf=1`, CPU time from the draw call to the end of the render, median over 300 frames.

| View | Draw calls | Triangles | Programs | Median |
| --- | --- | --- | --- | --- |
| District, before power | 216 | 3,805,028 | 12 | 20.90 ms |
| District, after the Relight | 906 | 4,361,444 | | 25.40 ms |
| 1280 x 800, more of the city, before power | 7,535 | 9,501,571 | | 48.10 ms |

**What the code does (read 24 Nov 2026 on this branch; the architect's reading):**
- **Building pieces are not instanced.** `plan3d.ts` `buildingBoxes` gives every piece its own `root.clone(true)` (`placedClone`). Each piece is one mesh per sub-mesh, so each is one draw call, culled one piece at a time. That is the 7,535 calls on the wide view. L1's per-building material clones (`windows.ts` `litBuilding`) add no calls of their own, because each piece was already its own call. **The jump from 216 to 906 calls after the Relight is not explained by the clones.** It needs F0's breakdown to say which family grew.
- **The instanced families are never culled.** Three's `InstancedMesh` culls on one bounding sphere around all its instances, and `tileGroupOf`, `dressGroup`, the furniture, the interior and `circuitGroup` each hold one instancer per key for the whole city. So the district view draws the whole 6 x 6 city's streets, dressing and props: that is about 3.8 M triangles at 216 calls. The view frames the district, but the instancers still draw everything.
- **Shadows:** off (`LIGHT_MODES.night.shadows` false). Nothing to cut.
- **Pixel ratio:** `min(devicePixelRatio, 2)` with `antialias: true` (`renderer.ts`). The cost depends on Josh's screen, so F0 measures it.
- **Per frame in `cityview.ts`:** `drawLive` (wire samples, pulses, sparks, the lit buildings' levels) and the overlay's Canvas 2D repaint. Both are small beside the render. `standCircuit` rebuilds only when a cut's readability changes. The overlay is outside the `perf=1` window, so F0 adds a whole-frame figure.
- **Lit windows by a per-instance attribute: yes, and it is needed.** Once building pieces are instanced, a material clone per lit building would split its pieces out of the instancers again. So the window level becomes one float per instance, an `InstancedBufferAttribute`. The colourway materials read it, together with L1's window mask, through one `onBeforeCompile` hook, compiled when the city builds. Setting a building's level writes only its instances' slots. L3's dim windows are the same attribute, set once. This adds no program and no draw call whatever the number of lit buildings, and S4's 25 lit buildings cost nothing extra.

**The architect's plan, the smallest that should reach the bar:** instance the building pieces in chunks (F1a), move the windows onto the instances (F1b), and chunk the other instancers (F2) only if F0 shows they carry the time. A draw-distance limit, fewer far props or a lower pixel ratio change how the city looks, so they are Josh's (cards F-Q1 and F-Q2). Nothing in F changes a grammar rule, a stage or a city number, so no pipeline-designer pre-check.

**The bar (the architect's starting point; Josh may move it).** Measured with `perf=1` on 6 x 6 seed 1, P0, the default camera, in the browser pane on Josh's PC, as above:
- the district view's median CPU frame is at most **16.7 ms**, both before power and after the Relight;
- F0's whole-frame (rAF) median is at most 16.7 ms on the same view;
- there is no new program between the first frame after the models load and the end of the Relight.

The 1280 x 800 view's numbers are reported, but they are not a pass bar. They go to Josh with F-Q1.

**Stop rule.** If the district view is still over 16.7 ms after F1b (and after F2, if F2 is built), the builder stops and reports ("stop 081 F", with the branch and the rows). It does not tune pieces, the camera, the reach or the shaders to pass. The main session takes the rows to Josh with F-Q1 and F-Q2.

**Order and measurements.**
| Step | Who | After | Shares |
| --- | --- | --- | --- |
| F0, the breakdown | renderer | now | `cityview.ts` (the `perf=1` log only) |
| Measure M1: district and 1280 x 800, before power and after the Relight, at the native pixel ratio and at `dpr=1` | main session | F0 merges | |
| F1a, building pieces instanced in chunks | renderer | F0 | `plan3d.ts`, `models3d.ts` |
| F1b, windows by instance | renderer | F1a | `windows.ts`, `cityview.ts` |
| Measure M2: as M1 | main session | F1b merges | |
| F2, other instancers chunked | renderer | M2, only if the district view is still over the bar and M1 showed the instanced families carry most triangles | `tilecity3d.ts`, `models3d.ts`, `circuitdraw.ts` |
| F-Q1 and F-Q2 to Josh | main session | M1 for F-Q2; M2 (or F2's measure) for F-Q1 | |

S1 and U3 (outside `src/render3d/`) go on unaffected. L2, L3 and S4 wait for F1b. F0 and F1a can be built at once only if F1a's builder leaves the `perf=1` log alone. One renderer builder at a time is simpler.

#### F0 · `perf=1` says where the frame goes (renderer). Branch `ticket/081f0-perf-breakdown`, now
**Goal.** The main session can read, from one `perf=1` log line, which family of pieces costs the draw calls and triangles in view, the whole frame's time, and the cost of the pixel ratio.

**Acceptance criteria.**
1. [ ] **Per family.** The `perf=1` log adds draw calls and triangles in view for each family:
   - the street tiles, the interior, the building pieces, the grey boxes, the dressing (stage 7), the furniture and traffic, and the circuit;
   - the live layer, and the lit shop glass.

   It counts as three culls: an object counts when its bounding sphere meets the camera frustum, an instancer counts all its instances, and a mesh counts its index (or position) count / 3. The sum is printed beside `gl.info.render`, so a gap shows. **browser**.
2. [ ] **The whole frame.** The log also gives the median interval between `draw` calls over the same 300 frames (it includes GPU waits and the overlay), the canvas's pixel size and the pixel ratio in use. **browser**.
3. [ ] **`dpr=N`** (dev only) sets the pixel ratio the view renders at, in place of `opts.dpr`. **browser**.
4. [ ] The builder reports both logs (before power, after the Relight) on the district view, in a desktop window. **browser**.

**Count.** 0 tests: a dev log.

**Files.** `src/render3d/cityview.ts` (the `perf=1` block and the `dpr` switch only). **Must not:** everything else in `src/`.

#### F1a · Building pieces instanced, in chunks (renderer). Branch `ticket/081f1a-instanced-buildings`, after F0 merges
**Goal.** The city's building pieces draw as one instanced mesh per (key, colourway, sub-mesh, chunk), not one clone per piece, so the wide view's thousands of calls drop to a few hundred and the pieces out of view are still culled.

**How (the architect's choice).** `buildingBoxes` keeps its order and its grey fallback. In place of `placedClone` it groups the pieces by key, colourway and chunk (`BUILDING_CHUNK_M`, a square on the ground, default 60 m, about one block with its streets). Each group is one `InstancedMesh` per sub-mesh, with its own bounding sphere. `BuildingsDraw` keeps, for each building, where its instances are (`instances: Map<buildingId, { mesh, index }[]>`), which replaces `groups`. **Buildings in `exclude`** (a new argument) are still drawn as clones in their `building:<id>` groups, as today. Until F1b, cityview passes `lampsOf`'s buildings there, so L1's windows keep working unchanged.

**Acceptance criteria.**
1. [ ] **One instancer per key, colourway and chunk.** **test**: 1 case, on a fixture of three buildings: two in one chunk share a key and a colourway, and one is in another chunk. The fixture draws one instancer per sub-mesh for the shared pair, holding both buildings' pieces at their placements' matrices, and a separate one for the far building. `instances` finds each building's pieces.
2. [ ] **Excluded buildings stay clones.** **test**: 1 case: an excluded building's pieces are wrappers in its `building:<id>` group, painted in its colourway, and appear in no instancer.
3. [ ] **The existing building tests read the instances.** **test**: rewritten, at most 6, and the builder lists them. Candidates in `plan3d.test.ts`: "draws one wrapper per piece ...", "paints a building in its loaded colourway ...", "with empty roots clones no piece ...", "draws every ground wrapper ...", "keeps the base atlas on every stage 7 and 8 piece ..." and "paints the stop sign's meshes on 01_A ...". A small test helper that lists a building's piece matrices from `instances` keeps each rewrite to a few lines.
4. [ ] **Measure.** On the district view and 1280 x 800, before power, the building pieces' calls (F0's family) and the median are reported. **browser**.

**Count.** 2 added, at most 6 rewritten: at most 8.

**Files.** `src/render3d/plan3d.ts` (`buildingBoxes`, `BuildingsDraw`, `plan3dGroups`'s `exclude` pass-through) and `plan3d.test.ts`; `src/render3d/models3d.ts` (`paintStack` only, if it needs a material-level form); `src/render3d/cityview.ts` (the one `exclude` argument in `build`). **Must not:** `windows.ts`, `tilecity3d.ts`, `circuitdraw.ts`, everything outside `src/render3d/`.

#### F1b · Lit windows by instance, not by clone (renderer). Branch `ticket/081f1b-instance-windows`, after F1a merges
**Goal.** A lit building's windows glow through its instances, so every building (all of S4's, too) stays in the shared instancers, and lighting more buildings adds no draw call and no program.

**Acceptance criteria.**
1. [ ] **The level attribute.** Every building instancer carries a `windowLevel` `InstancedBufferAttribute` (one float per instance, 0 at build). The colourway materials take L1's `windowMask()` as their emissive map, through one `onBeforeCompile` hook (emissive = mask x the instance's level x `WINDOW_LIT`), compiled when the city builds. `setBuildingGlow(draw, buildingId, glow)` writes only that building's slots, with `windowIntensity`'s flare, and marks the touched attributes for upload. **test**: 1 case, on F1a's fixture: lighting one building sets its slots to its level and leaves the other building's slots at 0, the material is the same object before and after, and no material was cloned.
2. [ ] **L1's clones go.** `litBuilding`, `LitBuilding` and F1a's `exclude` argument go. F1a's criterion 2 case is removed with it, and a removal is not counted. `drawLive` calls `setBuildingGlow` for each of `lampsOf`'s buildings. `litGlass` (the shop glass, already one mesh) is unchanged. **test**: 1 rewritten: `windows.test.ts`'s "the swap gives the lit building's pieces clones ..." becomes criterion 1's case, so the net change is 1.
3. [ ] **No program in play.** With `perf=1`, there is no new program between the first frame after the models load and the end of the Relight, and the after-the-Relight draw calls are no more than before power's + 1 (the lit glass). **browser**.
4. [ ] **The bar.** The builder reports M2's rows (district and 1280 x 800, before power and after the Relight). If the district view is over 16.7 ms, the stop rule applies. **browser**.
5. [ ] Josh plays `city-two-ways-round`: the three lamp buildings light in the Relight's order and flicker in a brownout, as after L1. **browser**.

**Count.** 1 rewritten (net; criterion 1's case is the rewrite): 1.

**Files.** `src/render3d/windows.ts` and `windows.test.ts`; `src/render3d/plan3d.ts` (the attribute on the building instancers and the material hook only); `src/render3d/cityview.ts` (the build step and `drawLive`'s lit-building loop). **Must not:** as F1a.

#### F2 · The other instancers culled in chunks (renderer). **Only if M2 calls for it**; branch `ticket/081f2-chunked-instancers`
**Goal.** The street tiles, dressing, furniture and circuit draw only the chunks in view, so the district view stops drawing the whole city's triangles.

**How.** `tileGroupOf`, `dressGroup` and `circuitGroup` take an optional `chunk_m`. When it is given, each key's instancer is split by the same square grid as F1a, each part with its own bounding sphere. The draw-call caps (`DRESS_DRAW_CALLS_MAX` and the rest) still count keys, not chunks, so no key drops out because of chunking. The tile sheet and `city=tiles` routes pass no `chunk_m` and are unchanged.

**Acceptance criteria.**
1. [ ] **Split, and the cap counts keys.** **test**: 1 case, on a fixture of one key placed in two chunks at a cap of 1: the result is two instancers with disjoint bounding spheres, holding all the instances between them, and the key is drawn.
2. [ ] **Unchanged without `chunk_m`.** **test**: 0 added. The existing `tilecity3d.test.ts` and dressing cases pass unchanged.
3. [ ] **The bar.** M3 as M2; the stop rule applies. **browser**.

**Count.** 1 added. The builder lists any existing case it rewrites, at most 4.

**Files.** `src/render3d/tilecity3d.ts`, `models3d.ts` (`dressGroup`), `circuitdraw.ts` (`circuitGroup`), `plan3d.ts` and `cityview.ts` (passing `chunk_m`), and their tests. **Must not:** everything outside `src/render3d/`.

**Cards for Josh (the main session asks them, with the measured rows; recommended options first):**
- **F-Q1, after M2 (or M3): the far city.** Asked only if the district view, or the 1280 x 800 view, is still slow.
  - "Keep the whole city drawn (Recommended while the district view is under the bar)".
  - "Stop drawing past N m from the camera": the camera's far plane, with a dark-blue fade so the edge does not show. It is cheaper on wide views, but the far blocks go dark.
  - "Drop small props past N m": benches, bins and signs. Buildings and streets stay.
- **F-Q2, after M1, only if `dpr=1` saves more than 2 ms: the pixel ratio.**
  - "Render at your screen's full sharpness (Recommended if the bar is met without it)".
  - "Render at 1x and let the browser scale it up": cheaper, but softer edges and text-like detail on a high-DPI screen.

**Rules coverage.** No rule changes: F is drawing only. No `tickets/rules-coverage.md` row moves.

**Interfaces.** None in `src/core/`: `BuildingsDraw.instances`, `setBuildingGlow` and `chunk_m` are internal to `src/render3d/`. No new dependency: `InstancedBufferAttribute` and `onBeforeCompile` are Three's.

### FX · Particle effects on the city (renderer; FX1 grid-simulator). Cut 24 Nov 2026, in three PRs: FX1 and FX2 (now, side by side), then FX3. Re-cut the same day on Josh's G1 and cards
**Josh, 24 Nov 2026, on a card:** "Particle FX cut". From earlier sessions (handoff 24 Nov 2026): he owns a particle pack, wants it rebuilt in Three.js (its effects are Unity prefabs), and wants it for **live-break sparks, the Relight, brownout arcing and repair flashes**, after the lighting.

**Josh's answers, 24 Nov 2026, on cards (relayed by the main session):**
- **G1:** **"Approve, FX2 first (Recommended)"**. FX2 no longer waits for L3 and S4; they merge `main` in and rebase on FX later. FX1 and FX2 may run now, side by side.
- **FX-Q1, the order:** **"Sparks first (Recommended)"**: FX2 (sparks and repair flashes), then FX3 (the Relight and arcing).
- **FX-Q2, the pack's meshes:** **"Meshes too"**. The pack's spark and shard meshes (`FX_MESHES`, `src/core/fx.ts`) are converted for the game pack, in **FX1** (folded in: the same owner, `tools/assets/`, and the same file, `game.ts`; its PR stays at 4 cases). FX2 does not wait for them: it draws sprites, and uses a mesh only when the loaded models hold it.
- **The budgets:** **"1.5 ms / 2.0 ms (Recommended)"**, as written in FX2 criterion 7 and FX3 criterion 4.
- **FX-Q3 and FX-Q4** stay open until before FX3.

**Josh, 24 Nov 2026, on cards, after playing FX2 (PR #62):** "even after fixing the wire, the sparks are still there. They should disappear after a wire is repaired. Also the sparks should be extreme." Then **"Merge FX1, fix FX2 (Recommended)"**, and for what "extreme" means he picked all four: **"More of them", "Bigger, brighter", "Fly further", "Crackle arcs"**. FX1 merged as #61. FX2 is amended below (criteria 3, 4, 4b, 4c, 6, 7, 8 and the count; re-cut 24 Nov 2026), on its built branch `ticket/081fx2-sparks`. The budget stays "1.5 ms / 2.0 ms (Recommended)".
- **Why the sparks stayed:** he played with `fx=all`, which by design sparks every cut whatever its state. Normal play already stops a repaired cut (`sparkingCuts` checks `state.faults`; criterion 4's test holds it). Criterion 4c makes it explicit and checks it in the pane, and criterion 8 is played with no `fx` switch.
- **`fx=all` (the architect's call, not a Decided rule):** it stays the worst-case measure and keeps sparking every cut, a repaired one too, because the heaviest frame is after the Relight with every lamp lit, and only `fx=all` puts sparks on it. It is never used for a play check, and while on it says so on screen and in one console line (criterion 6).

**What the pack holds (read 24 Nov 2026, `D:\rest-prototype-main\assets\private\in\particle-fx-pack\Source Files\`).** 58 FBX meshes (and the same as OBJ), 27 PNG textures and `MaterialList_PolygonParticleFX.txt`, which lists the Unity prefabs and their material slots. There are no prefab files: every prefab's slots say "Uses custom shader". The prefabs nearest Josh's four: `FX_Sparks_01` (round cut-out sparks and a glow), `FX_Electricity_01`/`_02`, `FX_LightningStrike_01`, `FX_GlowSpot_01` to `_03` and `FX_Sparkles_Small_01`. Their textures are the four this section takes (`FX_TEXTURES`, `src/core/fx.ts`): `Sparkle` (512 x 512, a four-point star), `Soft_Spot` (512 x 512, a soft round glow), `Lightning_02` (172 x 1024, a vertical bolt strip) and `Smoke_01` (200 x 200, a puff).

**How (the architect's choices; none is a Decided rule).**
- **Sprites first, meshes where loaded, and no prefab import.** Each effect is camera-facing sprites with one of the four textures, moved by a small CPU particle pool in `src/render3d/fx.ts`: spawn, velocity, gravity, drag, age and fade. This is what the Unity prefabs do with their particle systems. ~~The pack's FBX meshes would need the Blender converter and a manifest change for little gain, so they are not used.~~ **Changed by FX-Q2 ("Meshes too"):** the pool also drives two instanced meshes from the pack, a spark streak (`FX_Spark_01`, stretched along each spark's flight) and a small shard (`FX_Shard_Rock_Small_01`, hot chips thrown by a break burst and a repair). They are geometry only, under the renderer's own additive material, since the pack's materials are Unity custom shaders. FX1 converts them; when the loaded models lack one (no particle pack, CI), that particle is drawn as a sprite.
- **No new dependency.** A particle library (three.quarks, three-nebula) would be one, and is not taken. A pool of a few hundred sprites is small code.
- **Drawn from grid state and the Relight clock only.** The renderer stays bus-free (`MapRenderer.notify` is unchanged, and `src/main.ts` forwards nothing new):
  - live-break sparks from `state.sparking` and E2's live-cut rule (the cut span is still there and current reaches it, or the Relight's fraction is past it);
  - repair flashes from the change between the last frame's state and this one: a fault id that has left `state.faults` while `state.parts` got shorter. An undo or reset that removes a fault gives back parts, and a fuse that blows adds a fault, so neither flashes;
  - Relight bursts from the Relight clock's lamp arrivals (`relight3d.ts`, as L1's `buildingGlow` reads them);
  - brownout arcs from `state.brownout`, `state.feeds` (`over`) and `state.feedOf`.
- **The same sparks mean a break, and only a break** (the brief, Decided: "current up to a sparking break"; "faults hide faults"; "Damaged cables spark when live"). Break sparks are warm (white-hot to orange-red) and fly from the middle of the cut span only. The break's crackle arcs (FX2 criterion 4b, 24 Nov 2026) are warm too, white-hot to amber, and stand only across a live cut. Brownout arcs must not read as a break. They are cold blue-white bolts, at a pole's insulators (never mid-span, never at a cut), and come only while the section is browned out. A repair flash and a Relight burst last under 1 s and never repeat. No effect shows at an unreadable fault.
- **Job only.** Effects stand only on the job's own places: its cuts, its fault places, its lamps and its live poles. Hidden scenery lamps (S1) get no Relight burst, as U3 keeps them silent. The rest of the city is dead (CK14).
- **No shader compiles in play** (as L1 and L2). Every effect mesh (at most one per texture and one per pack mesh, so at most 6 draw calls for the section) is made when the city builds, at its full pool size, with additive blending and `depthWrite` off. It is compiled before the first frame of play, with `count` 0 or an invisible particle, never added or removed later.
- **The other fault signals are not in this section.** The schema's derived signals (a dead junction fizzes, a blown fuse buzzes, a dead lamp flickers red) have no 3D look yet. FX2's pool would carry them later as a small section of their own, if Josh asks.

**How the textures and meshes reach the game, under the licence (Josh, 16 Nov 2026: "as long as the assets aren't available to the end user and I place the site behind a password").**
- The pack stays in git-ignored `assets/private/in/particle-fx-pack/`. Nothing from it is committed, `import`ed into the bundle, or copied into `public/` or `dist/`. Its `pack.json` and its converted GLB live under `assets/private/` too.
- **FX1, the textures:** `npm run assets:game` (082 B, `tools/assets/game.ts`) also copies the four PNGs into `assets/private/out/game/fx/`, and lists them in the game manifest's `fx` (`AssetManifest.fx?`, `AssetFxTexture`, typed with this cut).
- **FX1, the meshes:** the pack is converted once like any other (`npm run assets:convert particle-fx-pack`, so the full manifest gains `particle-fx-pack`). `npm run assets:game` then cuts the `FX_MESHES` keys the full manifest holds into `out/game/particle-fx-pack.glb`, beside the models. A key the full manifest lacks is listed in one line and skipped, never a failed run, so a machine without the particle pack still gets its models.
- The main session re-runs both from `D:\rest-main-play` after FX1 merges, as after any model key change.
- **FX2:** the renderer fetches `${dir}game/manifest.json` and loads each listed texture by URL at run time, as `models3d.ts` loads GLBs. It loads the `FX_MESHES` keys in a `loadModels` call of their own, after the city's, so a game pack without them never sends the city's own models to the full packs.
- **No pack, no problem.** With no game pack, an older one without `fx`, or a failed image, each effect uses a texture drawn in code (a `DataTexture`, as L1's window mask is), with one console line. A missing mesh is drawn as a sprite. So Linux CI, which has no assets, and a fresh clone both run. No test reads a real PNG, GLB or the real manifest; tests use fake fetches and typed fixtures.

**The frame budget.** The bar is 16.7 ms (60 fps) on Josh's PC. The district view is about 8.5 ms CPU before power (L2's in-view rows, `docs/design/081-F-measurements.md`). Sessions on this PC differ by several ms (7.9 to 14.4 ms on the same view), so each section's budget is measured against an `fx=0` run **in the same session**, not against the note's number.

**Pipeline-designer pre-check: not needed.** No grammar rule, stage or city number changes. FX is drawing in `src/render3d/` and a copy step in `tools/`. The particle counts and colours are looks Josh judges by eye.

**Rules coverage.** FX2 criterion 4 adds a city-view case to the "Signatures" and "Faults hide faults" rows of `tickets/rules-coverage.md`: sparks only at a live cut, none at an unreadable one.

**Cards for Josh (recommended options first):**
- ~~**FX-Q1, the order.**~~ Answered: "Sparks first (Recommended)".
- ~~**FX-Q2, the pack's meshes.**~~ Answered: "Meshes too" (folded into FX1, above).
- **FX-Q5, not blocking: the shard.** After FX1's conversion, the main session shows Josh the pack's five shard meshes in the gallery (`FX_Shard_Rock_01` to `_04`, `FX_Shard_Rock_Small_01`) and `FX_CrystalShard_01`. "Keep `FX_Shard_Rock_Small_01` (Recommended)" or the one he picks; a swap is one line in `FX_MESHES` (the architect's), plus a re-run of `npm run assets:game`.
- **FX-Q3, before FX3: where brownout arcs show.** "A few at a time on the overloaded feed's live poles (Recommended)": at most 3 at once, cold blue-white, at insulators. Or "Only at the feed's own pole". Or "None: the flicker is enough", in which case FX3 is the Relight only.
- **FX-Q4, before FX3: the Relight.** "A sparkle burst at each puzzle lamp as it lights (Recommended)": the scenery buildings light with no burst. Or "At every building that lights, scenery too": about 25 bursts on P0, inside FX3's budget or not shipped. Or "One burst at the last target".

**Order (re-cut for "Approve, FX2 first (Recommended)").** FX1 and FX2 start now, from `main`, side by side (the two agents Josh allows at a time).
- FX1 is in `tools/assets/` only and shares no file with any open section.
- FX2 does not wait for FX1: its code-made textures and sprites stand in, and it codes against the `src/core/fx.ts` types committed with this cut. Josh sees the pack's own textures and meshes once FX1 has merged and the main session has run the conversion and `npm run assets:game`.
- FX2 shares `cityview.ts`'s live layer and build step with **S4** and L3's build step. FX2 goes first; L3 and S4 branch after it merges, or merge `main` in and resolve `cityview.ts` if already started. S4's criteria are unchanged by FX: it adds wires to the live layer, and FX2 only replaces the box sparks in it.
- FX3 branches after FX2 merges, once FX-Q3 and FX-Q4 are answered.

#### FX1 · The particle pack converted, and the game pack holds its textures and meshes (grid-simulator). Branch `ticket/081fx1-fx-textures`, now
**Goal.** Josh runs `npm run assets:game` and the game pack also holds the four particle textures and the two particle meshes the city view uses, listed in its manifest. On a machine without the particle pack, the command still cuts the models and says what is missing.

**Acceptance criteria.**
1. [ ] **The copy.** `runGame` copies each `FX_TEXTURES` file from `assets/private/in/${FX_SOURCE_PACK}/${FX_SOURCE_DIR}` to `out/game/${FX_GAME_DIR}`. It writes through the same temp-then-move step as the GLBs, so a failed run leaves the earlier game pack whole. The game manifest gains `fx`: one `AssetFxTexture` per copied file, in `FX_TEXTURES` order, `image` relative to the game manifest (`"fx/PolygonParticles_Sparkle.png"`). **test**: 1 case, with fake file-system deps: the four files are copied under `out/game/fx/`, and `fx` lists them in order.
2. [ ] **Missing textures do not stop the models.** If the pack folder or any file is missing, the run still writes the game pack: `fx` lists only the files found (absent if none), with one line naming the missing files and the folder looked in. Exit 0. **test**: 1 case: two of four files present give an `fx` of two and one line naming the other two.
3. [ ] **Nothing else changes.** The full manifest, the full GLBs and the model part of the game pack are as before. An existing `game.test.ts` case that compares the whole game manifest may be rewritten for `fx` (at most 1, named in the reply). **test**: 0 added.
4. [ ] **README.** `tools/blender/README.md`'s *Game pack* section gains one line: the `fx/` folder, where it is copied from, and the licence line (git-ignored, never committed or shipped). **no test**.
5. [ ] **The particle meshes in the game pack** (FX-Q2, "Meshes too"). `runGame` cuts the `FX_MESHES` keys with the models, through 082 B's include filter, so `particle-fx-pack.glb` holds only those two. They are optional, unlike the page's keys:
   - a key the full manifest holds joins the plan, and `game.keys`;
   - a key it lacks (the pack not converted, or a root name that differs) is left out, with one line naming it and saying to run `npm run assets:convert particle-fx-pack`;
   - exit 0, and the models are cut as before.

   `deps.keys()` (the page's keys, from `gameModelKeys()`) is not edited, so a missing FX mesh never fails the cut. **test**: 1 case, with a fixture manifest holding `spark` but not `shard`: the plan includes the spark's pack and entry, and one line names the shard.
6. [ ] **The pack's conversion** (the builder, on Josh's machine; nothing committed). Write `assets/private/in/particle-fx-pack/pack.json` (the scale and any `exclude` the meshes need; the OBJ folder is not FBX and is skipped anyway), and run `npm run assets:convert particle-fx-pack`. The reply gives the `pack.json` text, each `FX_MESHES` key's root name and metre bounds from the full manifest, and any `scale-suspect` flag or failure. A spark streak should be tens of centimetres, not metres. If a root name differs from `FX_MESHES`, the builder stops and reports, and the architect re-cuts the table; it does not edit `src/core/`. The pack's custom-shader materials may fail their texture search; that is reported, not fixed, since only the geometry is used. **no test**.
7. [ ] **The run** (the main session, after merge, from `D:\rest-main-play`, whose `assets/private/in` junction reaches the pack): the conversion of criterion 6 if `out/` there lacks the pack, then `npm run assets:game`. Afterwards `out/game/fx/` holds the four PNGs, `out/game/particle-fx-pack.glb` the two meshes, and the manifest lists both. **no test**.

**Count.** 3 added, at most 1 rewritten: at most 4.

**Files.** `tools/assets/game.ts` and `game.test.ts`, `tools/assets/fixtures/` (if a fixture is needed), `tools/blender/README.md` (criterion 4's line also names the particle pack's conversion). Not in git: `assets/private/in/particle-fx-pack/pack.json`, `assets/private/out/`. **Must not:** `src/` (it imports `src/core/fx.ts` and edits nothing), `tools/assets/convert.ts` and `convert_fbx.py` (the conversion runs as it is; if the pack will not convert without a code change, the builder stops and reports), `package.json`, `.gitignore` (`assets/private/` already covers all of it).

#### FX2 · The particle pool, live-break sparks and repair flashes (renderer). Branch `ticket/081fx2-sparks` (PR #62), now (G1: "Approve, FX2 first (Recommended)"; before L3 and S4). Amended 24 Nov 2026 after Josh played it ("the sparks should be extreme"; "They should disappear after a wire is repaired")
**Goal.** Playing `city-two-ways-round`, a live break is violent: a dense, steady spray of big white-hot sparks that fly metres out, fall, and bounce on the street, with a hard flash and a pop every second or so, and warm crackling arcs jumping across the cut. A break that current does not reach shows nothing. Repairing it stops the spray at once (the last sparks finish their fall) and gives a short bright flash at its place. The frame still holds 60 fps.

**Acceptance criteria.**
1. [ ] **The textures.** A new `src/render3d/fx.ts` exports `fxTextures(deps)`. It fetches `${dir}game/manifest.json` (dev only, as the models are) and loads each `FX_TEXTURES` id listed in its `fx` by URL (`${dir}game/<image>`). Any id not listed, or whose image fails to load, takes `fxFallback(id)`: a `DataTexture` drawn in code (a four-point star, a soft dot, a jagged vertical bolt, a soft blob). One line names the fallback ids ("3D effects: drawn textures for sparkle, smoke; run npm run assets:game."). It never throws, and textures are never `import`ed. **test**: 1 case, with a fake fetch and loader: a manifest listing two ids gives two URLs under `game/fx/` and two fallbacks with one line; no manifest gives four fallbacks.
2. [ ] **The pool (pure).** `createParticlePool(max)` holds position, velocity, age, life, size and colour in preallocated typed arrays. It has `spawn(...)`, and `step(dt, gravity, drag)`, which moves, ages and frees the dead. When full, `spawn` reuses the oldest particle. Neither allocates per call. **test**: 1 case: particles fall under gravity, die at their life, and a spawn on a full pool replaces the oldest.
3. [ ] **The draw meshes.** One sprite mesh per texture used (`Points` with a size attribute, or an instanced camera-facing quad: the builder's choice, said in the reply), and one `InstancedMesh` per pack mesh loaded (criterion 3b). Each is made at build at its full pool size, additive, `depthWrite` off, and compiled before the first frame of play. Per frame, only the pool's arrays, the instance matrices and `count` are written. At most 6 draw calls are added by FX2 (sparkle, soft spot, smoke, lightning, spark mesh, shard mesh; 4 with no pack meshes). The lightning layer (criterion 4b) takes a colour per instance, so FX3's brownout arcs draw in it too and add no call.
   - **Pool sizes (amended 24 Nov 2026).** Sized at build from the job's cut count `n` (`createFxLayer(emitters)`), no longer fixed: per cut, spark 512, sparkle 512 (the spark fallback and the pops), shard 128, soft spot 48, smoke 24, lightning 8; plus, once for the whole layer, sparkle 256 and shard 32 and soft spot 16 for repair flashes. On P0 (`n` = 2) that is 1,280 sparkle, 1,024 spark, 288 shard, 112 soft spot, 48 smoke and 16 lightning, against 384 / 256 / 96 / 64 / 48 / 0 before. A full pool reuses the oldest (criterion 2), so a pool too small thins the spray, never fails; the builder gives the peak alive count per layer under `fx=all` in the reply.
   **no test**: criterion 7 measures it.
3b. [ ] **The pack meshes, when loaded** (FX-Q2, "Meshes too"). `fxMeshes(deps)` in `fx.ts` loads the `FX_MESHES` keys in a `loadModels` call of their own (`models3d.ts`, used as it is), after the city's models. It gives each id's geometry, or null for an id the set lacks, with one line naming the missing ids. A spark with a loaded `spark` mesh is drawn as that streak, oriented and stretched along its velocity; otherwise as a sparkle sprite. A `shard` chip is drawn with the shard mesh, tumbling; otherwise as a small sprite. The meshes take the effect's own additive material, not the pack's. If the meshes cannot be loaded without editing `models3d.ts`, the builder stops and reports ("stop 081 FX2"); the architect re-cuts. **test**: 1 case, with a fake load giving `spark` but not `shard`: the spark's geometry is returned, the shard is null, and one line names it.
4. [ ] **Live-break sparks.** E2's box sparks (`sparkMesh`, `SPARKS_PER_CUT`) go. A pure `sparkingCuts(...)` in `fx.ts` gives the cut spans that spark this frame, by E2's rule moved out of the loop unchanged: the cut is still there, `state.sparking` has its line, and while the Relight runs, its line's fraction is past 0. Each sparking cut emits, from the middle sample of its cut span (where E4's break icon sits). **Amended 24 Nov 2026 for "extreme"** ("More of them", "Bigger, brighter", "Fly further"); the numbers are the architect's starting point, judged by Josh's eye in criterion 8, and all random draws are seeded:
   - **More of them.** A burst every 0.05 to 0.12 s (was 0.1 to 0.3 s) of 18 to 26 sparks (was 6 to 9), the spark mesh, else sparkle sprites (criterion 3b), with 4 to 6 shard chips (was 2 or 3). And a **pop** every 0.6 to 1.2 s: 50 to 70 sparks at once, half again as fast as a burst's, with a big flash (below). About 300 to 350 sparks a second per cut.
   - **Bigger, brighter.** Sparkle sprites 0.9 m across (was 0.5 m); a spark streak 0.15 m thick and stretched to 0.5 to 1.5 m along its flight by its speed (twice what it was). Colour by age: white-hot (1.0, 0.97, 0.85) for the first 30 % of life, then yellow-orange (1.0, 0.65, 0.2), then deep orange-red (0.9, 0.25, 0.05) as it fades; never blue (blue at most half the red, all life). Each burst has a soft-spot flash 2.5 m across over 0.12 s; each pop one 5 m across over 0.25 s, white to amber; and while the cut sparks, a steady soft-spot glow 1.5 m across sits on the cut, its brightness flickering between 0.6 and 1.0 each frame (seeded), so the break lights the street round it.
   - **Fly further.** Sparks leave at 3 to 8 m/s sideways (was 1.2 to 4.2) in every direction round the span and 2 to 7 m/s up (was 1.5 to 5), a fifth of them thrown down instead (0 to -3 m/s up); gravity 9.8 m/s², drag 0.6 (was 1.0); each lives 0.7 to 1.4 s (was 0.4 to 0.8). From a pole-top cut they reach 4 to 10 m out.
   - **Ground bounce.** A spark or chip that reaches the ground under the cut bounces once: its fall reversed at 0.35 of its speed, its sideways speed at 0.6, and one in three splits into two sparks half its size with the rest of its life. At its second touch it dies. The ground is one height per cut, passed with the cut's place: the street height at the cut span's poles' feet, as `cityview.ts` already knows them, or the city's ground plane if it does not. `step` gains that floor (an optional argument, so criterion 2's case stands).
   - **Smoke:** about two wisps a second (was one), 1.5 m across, rising 1 m/s.

   Brownout does not change them. **test**: 1 case on a fixture: a live cut sparks; an unreadable cut, and a cut whose fault is repaired, do not.
4b. [ ] **Crackle arcs at the cut** ("Crackle arcs", 24 Nov 2026). A new lightning layer draws the `lightning` texture (`Lightning_02`, or its drawn fallback, criterion 1) on camera-facing quads stretched between two ends. A pure `cutArcs(cut, time, out)` in `fx.ts` gives a sparking cut's arcs this frame from its cut span's two end points and the time alone (a hash of the cut and the time slot, as FX3's `arcSpots`, so it allocates nothing and repeats for the same inputs):
   - 1 or 2 at once, each flicking for 0.05 to 0.12 s, a new one every 0.08 to 0.25 s;
   - each between two points on the cut span within 1.5 m either side of its middle sample (never past the span's ends, never at a pole's insulator), its width 0.25 to 0.4 m, flipped or not at random;
   - tinted warm: a white-hot core (1.0, 0.95, 0.8) to amber (1.0, 0.7, 0.3), blue never above 0.8 of red, so it never reads as FX3's cold blue-white brownout arc (which stands only at insulators, never at a cut);
   - drawn only while the cut sparks (criterion 4's rule), with a soft-spot flash 1 m across at its middle on each new arc.

   **test**: 1 case on a fixture span: over 2 s of time slots, every arc's ends lie on the span within 1.5 m of the middle sample, there are never more than 2, and every arc's colour has blue at most 0.8 of red.
4c. [ ] **A repaired cut stops at once** (Josh: "They should disappear after a wire is repaired"). In normal play (no `fx` switch), on the frame a cut's fault leaves `state.faults`, its emitter stops: no burst, pop, smoke, glow or arc is spawned for it from that frame, its steady glow and arcs are gone that frame, and its timers are reset so a fault that comes back (an undo) starts fresh. Sparks already in flight finish their life (at most 1.4 s, with the bounce). The same holds when a cut stops being reached (a switch thrown back). **test**: 1 case on `createFxLayer` with one emitter and no WebGL: after 1 s of `breakAt` and `update`, the cut stops being fed; the next frame has no glow or arc instance, no layer's count rises after it, and after 1.5 s more every count is 0. **browser**, in the pane: repair `l_e2`'s cut in normal play, and within a frame its spray, glow and arcs stop, and in under 1.5 s nothing of it is left.
5. [ ] **Repair flashes.** A pure `repairedFaults(prev, now)` gives the fault ids that left `faults` while `parts` got shorter. Each flashes once at its place: a line fault at its cut span's middle sample, a node fault at its node's place (the pick place E2 centres on). The flash is a soft-spot bloom over about 0.4 s and a ring of sparkle sprites with a few shard chips, white to warm. **test**: 1 case: a repair gives its id; an undo that restores the fault and parts, a reset, and a fuse that blows (a new fault, parts unchanged) give none.
6. [ ] **Dev switches** (behind `import.meta.env.DEV`, read from the address in `cityview.ts`): `fx=0` draws no effect, and `fx=all` runs every FX2 effect at once, without stopping, at every cut and fault place of the job, whatever its state. This is for the measure only. **Amended 24 Nov 2026:** `fx=all` stays the worst case, so it still sparks a repaired cut (with the pops, glow and crackle arcs of criteria 4 and 4b), but it is never used to judge play: while it is on, the `perf=1` label and the canvas corner say "fx=all: every cut sparks whatever its state (measure only)", and one console line says so at load. Normal play is the address with no `fx`. **no test**.
7. [ ] **The budget.** With the browser pane in view on Josh's PC: 6 x 6 seed 1, `?puzzle=city-two-ways-round&perf=1`, the default camera, a fresh load per run, all in one session. Three runs: `fx=0`, as played (the Relight played: throw `sw`, repair `l_e2`), and `fx=all`. The builder reports draw calls, programs, the CPU median before power and after the Relight, and the whole frame, for each run.
   - **Pass:** against `fx=0`, `fx=all` adds at most 1.5 ms to the CPU median before power and after the Relight, and the median is at most 16.7 ms. The whole frame holds the 60 Hz vsync (about 16.7 ms). At most 6 more draw calls (4 with no pack meshes; was 5 and 3, before the lightning layer). No new program between the first frame after the models load and the end of the Relight. **Re-measured after the 24 Nov 2026 amendment**, with the pack's own textures and meshes (FX1 is in: the main session runs `npm run assets:game` in the builder's worktree first), as a new block in `docs/design/081-F-measurements.md` beside the first; the reply adds the peak alive count per layer under `fx=all`.
   - **Stop rule:** if any of these fails, the builder stops and reports ("stop 081 FX2", with the branch and the rows). It does not cut particle counts or tune the effect to pass. The main session puts the numbers to Josh, and the architect re-cuts with his answer.
   
   The budget is the architect's starting point, not a GDD number. **browser**.
8. [ ] Josh plays `city-two-ways-round` from `npm run dev`, **with no `fx` switch** (normal play), from the default camera and `cam=street`: the cut sparks once current reaches it, and not before, and reads as extreme (dense, big, bright, far-flying, bouncing, with warm crackle arcs); repairing it stops the spray at once and flashes; the effects read as sparks, arcs and a flash, not as squares. **browser**.

**Count.** 7 added, in new `src/render3d/fx.test.ts` (under 2 s: fixtures only, no city build): the 5 built, plus 4b's and 4c's (24 Nov 2026). None of the 5 is rewritten unless a changed number breaks one (criterion 2's pool case if `step`'s floor changes it; named in the reply). No existing case asserts E2's box sparks (`overlay.test.ts`'s `sparking` flag is the overlay's and stays); if one does, it is rewritten and named in the reply. At most 8 in the PR.

**Files.** New `src/render3d/fx.ts` and `fx.test.ts`; `src/render3d/cityview.ts`: the live layer's sparks, the build step (the effect meshes and the texture load), the frame loop's calls into `fx.ts`, `fx=` and its `perf=1` label, and (24 Nov 2026) each cut's ground height and span ends passed to the layer and `fx=all`'s notice; `docs/design/081-F-measurements.md` (criterion 7's block). **Must not:** `overlay.ts`, `circuitdraw.ts`, `windows.ts`, `plan3d.ts`, `models3d.ts`, `relight3d.ts` (read only); `src/render/`, `src/core/`, `src/city/`, `src/grid/`, `src/play/`, `src/ui/`, `src/main.ts`, `tools/`, `public/`, `vite.config.ts`.

#### FX3 · Relight bursts and brownout arcing (renderer). **Folded into FX4** (Josh, 25 Nov 2026: "Fold it in (Recommended)"; FX-Q3 "arcs show on overloaded lines", FX-Q4 "the Relight bursts at each lit target"). Built on FX4's branch, with bursts at target lamps only
**Goal.** In the Relight, each puzzle lamp throws a burst of sparkle and a soft flash as it lights, in the Relight's order. In a brownout, short cold blue-white arcs flick at the insulators of the overloaded feed's live poles, a few at a time, until the load is shed. Written to the recommended answers; the architect re-cuts if Josh picks others.

**Acceptance criteria.**
1. [ ] **Relight bursts.** A pure `relightBursts(plan, lamps, prevT, t)` in `fx.ts` gives the job lamps (never a `converted.hidden` lamp) whose arrival on the Relight clock falls in `(prevT, t]`, in ignition order. Each bursts once, for about `FLARE_SECONDS`, at the lamp's place: a building lamp in front of its street face (L2's `lightPlaces` point), ~~a post lamp at its glow~~ (struck 25 Nov 2026 by section W: no city lamp stands on a post). The burst is a soft-spot flash and a fountain of sparkle sprites in the lit pane's amber (L1). A click during the Relight changes nothing: the bursts come from the clock, as E2's case holds. **test**: 1 case, on P0's file through `relightFrame`'s plan (the module cache): every target lamp bursts exactly once, in the order `relightFrame` lights them, and no hidden lamp bursts.
2. [ ] **Brownout arcs.** A pure `arcSpots(state, poles, time, max)` in `fx.ts` gives at most `max` (`ARCS_AT_ONCE`, 3) arcs this frame:
   - only while `state.brownout`;
   - only on job poles whose line is powered and carried (`feedOf`) by a feed whose `feeds` entry is `over`;
   - each lasting 0.08 to 0.15 s, chosen by a hash of the pole and the time slot, so a frame's answer depends on its inputs alone.

   An arc is one lightning-textured quad, stretched between two of the pole's insulators, or from an insulator 0.6 m along its wire where the pole has one. It has a small soft-spot flash and is tinted cold blue-white (blue at least red; FX2's cut arcs are warm, blue at most 0.8 of red). It never stands at a cut or mid-span (see *The same sparks mean a break*). It draws in FX2's lightning layer (criterion 3, colour per instance), so no draw call is added (re-cut 24 Nov 2026; was at most 1). **test**: 1 case on a fixture: arcs only while browned out, never more than `max`, never on a dead pole or on a pole of a feed that is not over (two feeds, one over).
3. [ ] **`fx=all`** gains the bursts (one lamp every 0.5 s, round the job's lamps) and `max` arcs on every job pole. **no test**.
4. [ ] **The budget,** as FX2 criterion 7, for the whole section: against `fx=0` in the same session, `fx=all` adds at most 2.0 ms to the CPU median and stays at most 16.7 ms, the vsync holds, at most 6 draw calls more than `fx=0` (FX2's 6, the lightning layer among them; FX3 adds none), and no new program in play. It has the same stop rule ("stop 081 FX3"). **browser**.
5. [ ] Josh plays `city-two-ways-round`: overload it (P0's trap), and the arcs flick until he sheds load; then play to the Relight, and each lamp bursts as it lights. The arcs do not read as a broken cable: cold blue-white at the insulators, against a live cut's warm crackle across the span (FX2 criterion 4b). **browser**.

**Count.** 2 added, in `fx.test.ts`. Criterion 1's P0 case builds the city through the module cache; the builder gives its time.

**Files.** `src/render3d/fx.ts` and `fx.test.ts`; `src/render3d/cityview.ts`: the frame loop's calls and `fx=all`. `src/render3d/circuitdraw.ts` only to export the job poles' insulator points, if no export gives them yet (read it first; name the export in the reply). **Must not:** as FX2.

**Interfaces (the section).** Written into `src/core/` with this cut (typecheck passes): `src/core/fx.ts` (`FX_SOURCE_PACK`, `FX_SOURCE_DIR`, `FX_GAME_DIR`, `FX_TEXTURES`, `FxTextureId`, `FX_MESHES`, `FxMeshId`, `AssetFxTexture`), and `AssetManifest.fx?` in `src/core/assets.ts`. It is optional, so `ASSET_MANIFEST_VERSION` stays 1, and the full manifest and the gallery read as before. `fx.ts`'s exports in `src/render3d/` are internal. **Events:** none new; the renderer stays bus-free. **No new dependency.**

### W · The priests want buildings lit, not lamp posts; readability first. Cut 25 Nov 2026 for G1, in five PRs: W0 (a note), W1, W2, W3, P2a2. **Approved (G1) 25 Nov 2026**

**Josh's answers, 25 Nov 2026, on cards (relayed by the main session):**
- **G1:** "Approve W (Recommended)". The architect's readings below stand as written.
- **W-Q1, how a lit window glows:** "Glow cards (Recommended)". W2 criterion 3 is built as written (glow cards and the light raised to half the building's height); the bloom branch of it is dropped.
- **W-Q2, how the target reads among lit scenery:** "Gold windows + icon (Recommended)". W3 criterion 1 is built as written.
- **W-Q3, what a run may use** (asked with W0's numbers, `docs/design/081-W0-building-targets.md`): "Own block roofs (Recommended)": poles and drops, plus roof runs over the block they feed and at corners (W0's option C, as B1's answers already allow).
- **W0's second card, ring lines:** read outward from where each line takes its power, not from the feed: "Yes (Recommended)". W0 found the rule as first worded (from the feed) fails every ring, P0 included (by 61.6 m on `l_x`).
- **W-Q4, the camera:** "One fixed view (Recommended)". No rotation section is cut; routes must read from the one view, held by W1's rules.
- **W-Q5, PR #69:** "Close, re-lay (Recommended)". The main session closed PR #69 unmerged; P2a2 re-lays from `main` after W1.
- **The GDD wording:** "Reword it (Recommended)". The proposal is open question 20; nothing in `rest-gdd` is changed by this ticket.
**Josh, 25 Nov 2026, after playing the P2a pilots** (PR #69; recorded in full in `docs/design/081-P2a-josh-play.md`). On the cards: all four groups need work; hard to read, plays wrong, looks wrong, too samey; worst for reading: targets unclear, wires untraceable, framing; looks: wires bad, lights wrong, scenery clash; **fix first: hard to read**. In his words:
> Lv1: "It's not clear what needs to be done to win because the lamp is prior to the breaker in the line. The light on the lamp isn't 3D. Also, the light from the windows in the buildings needs to be ambient, and it's not on every level."
> Lv2: "Similar problem, it's not clear that the circuit reaches the lamp that needs lighting. Also the flow of electricity is moving away from the power source on one side."
> Lv3: "The pole Atop the corner building and the reversal over the power source is confusing in 3D, especially when you can't rotate your camera."
> Lv4: "Similar problems to 1&2, the lamp is confusing because it's not connected to the power source. It's just kind of in the middle of the street on the sidewalk without any wires attached."
> All levels: "Only the light coming from the doorways seems to glow into the street. I think that instead of lamps, the game should focus on lighting the buildings. It would be a lot less confusing, and the runs would just be around blocks and within blocks."

**What the architect found (read 25 Nov 2026 at `origin/main` 17df2e5, the P2a branch 1622579 and the S4 branch 3782d78).**
- **The lamp posts are the cause of 01, 02 and 04's "not wired".** A `{ post }` lamp is fed by its `lead`, which is underground and drawn by nothing, and the post stands at the **midpoint of a span the run's last pole ends** (`checkpuzzle.ts`: the run ends at either end of the post's span). In 01 the shrine's post stands on `j0`–`br_1`'s span, so on screen it is between the junction and the breaker, before the breaker. 14 of the 16 pilots have a post lamp, 9 of them a target (01, 02, 04, 05, 06, 08, 11, 14, 15). Only 12 and 16 have none.
- **A `{ building }` lamp is always visibly wired.** Its line ends on its drop, and the check already holds that the drop hangs from the pole the run ends at (`the run ends at X, but drop hangs from Y`). The drop is drawn (K3b), glows live (E2's job wires, the drop last) and is the building's own. So a building lamp is never before the node that feeds it, and never unwired.
- **02's backward flow is the circuit's route, not the renderer.** `l_well` runs from `sw_2` on the corner roof (25.6, 104.4) back out to `pole:x:2:lo:39.17`, then down the post's lead to the well at 33.33, back towards the feed's street, and `l_on` before it climbs from `sw_1` to the roof. The pulses truly follow current: `lineFlow` takes the direction from the grid's `flowFrom` on the converted line (`state.flowFrom.get(L) === L.to`), the same on `main` and on S4. **S4's fix (PR #70) is the Relight's pacing**, how much of a run is lit while the Relight runs over S1's `L~a`, `L`, `L~b`, and does not change which way pulses move. So 02 is fixed by the route (W1's read-outward rule and P2a2's re-lay), not by S4; W3 criterion 3 checks it by eye.
- **03's roof run over the feed** is allowed by today's fit: nothing stops a roof span passing over the feed or doubling back. W1 adds the rule.
- **The flat disc** is E2's post lamp glow (a sphere and a ground circle, `MeshBasic`), kept for `{ post }` lamps by L1. **The flat yellow windows** are L1's emission with no halo, and L2's one street light per building stands at 3 m (the first floor), which is why only the doorways seem to light the street. Why some storeys do not glow at all is not known from the code: `dimPieces` notes the ground storey is not in a building's instanced `pieces`, and a column counts only when all its pieces' models loaded; W2's builder finds it first.
- **With S4, every building on the job's live poles lights.** So once targets are buildings, a lit target is one lit building among many. That is a new reading problem; W3 marks the target (W-Q2).
- **Too samey:** 12 of the 16 pilots are on `block:0:0` (the P2a review's count).

**What lamp targets become (the architect's reading; Proposed, Josh's to overturn at G1).**
- **Every lamp of a city puzzle stands on a building, fed by its drop** (`{ building }`, `run.drop`). Not on a lamp post (`{ post }`, `run.lead`), not on a roof structure (`{ roof }`; L-Q2's "Mast's building" read stays in the code, unused), not on a pole. The grid's node type stays `lamp`: on the city, a "lamp" is a building's light. Targets are buildings.
- **The schema keeps `{ post }` and `lead` as types.** The conversion, CK11's post places, K2c's fixtures and E2 know them, and the street layer may want them later. No file in `puzzles/city/` may use them: W1's city check rejects them and the fit never offers them. `puzzles/SCHEMA.md` says so (P2a2). Deleting the types is a later cleanup, not cut.
- **Lamp posts as scenery: none stand.** A CK11 post is a place, not a model, and stands only when a puzzle puts a lamp there, so with no post lamps no lamp post stands, and E2's sphere and disc go (W2 criterion 4). 059's street lights stay dark scenery on the city view, as E2 criterion 3 has them.
- **Runs go round blocks and within them** (Josh's words). The architect reads "within" as down the drops into the block's buildings. Runs may also use roofs over their own block and at corners (Josh, W-Q3: "Own block roofs (Recommended)").

**No Decided GDD rule is touched** (checked 25 Nov 2026 against `rest-gdd` `docs/05-gameplay.md`). The brief's Decided rules hold on a building: lamps are leaves (a building lamp is a leaf); dead lamp → bulb; "current reaches a dark lamp" reads as a live drop into dark windows (W2 criterion 5). The brief's "Targets. `target` lists the lamps the priests want lit" is Draft; the GDD's endpoints already include "lamps, beacons, shrines, machinery" and "shrines, homes" (05, Draft), and its fault table's "Pulses reach the lamp post" sits in "Fault tracing (Draft)". A rewording for the GDD is open question 20, a proposal only.

**Pre-check.** W1 adds rules and numbers to how a city puzzle may be laid (lamps on buildings only, `READ_BACK_M`, `FEED_CLEAR_M`, no crossing spans, the roof answer), so **W0 is a pipeline-designer pre-check** before W1 is built. W2 and W3 are drawing (looks Josh picks on cards), so no pre-check. P2a2 is the designer's, under W1's check.

**Order and parallel work.**
| Wave | Sections | Shared files | Why |
| --- | --- | --- | --- |
| 1 | W0 ("pre-check 081 W1"); S4 (PR #70) finishes its own loop | none | W0 is a note. S4 is already built and touches `cityview.ts`, `windows.ts`. |
| 2 | W1 (after W0 "holds", or Josh's answer, and W-Q3); W2 (after S4 merges) | none between them: W1 is `tools/`, W2 `src/render3d/` | W1 needs W0's numbers; W2 rebases on S4's `lampsOf`. |
| 3 | P2a2 (after W1); W3 (after W2) | none | P2a2 needs the fit; W3 shares `windows.ts` and `cityview.ts` with W2. |
| 4 | Josh plays P2a2 | | After W2 and W3 merge, so he plays the pilots with the new look. |

#### W0 · "pre-check 081 W1" (pipeline-designer; a note). Branch `ticket/081-puzzles-on-the-city`. **Done** (82f8f37): as first worded, W1 did not hold (read-outward from the feed fails every ring, P0 included); re-cut on Josh's answers
**Goal.** Before W1 is built, measure W1's rules together on 6 x 6 seed 1, one-way on, over the 16 pilots' schematics, so Josh picks W-Q3 with numbers and W1's two distances are set.

**Acceptance criteria.**
1. [ ] For each of 01 to 16, whether the fit finds a lay with **every lamp on a building by its drop**, under each of W-Q3's three options (roofs only to cross a street on a diagonal; no roofs; roofs over the district's own block too), with B1's other answers as they stand. A miss says what is short (for example, "junction, needs 5 ports, district has 3 with drops"; drops count as attachments, CK12). **no test**.
2. [ ] **The read-outward rule** worded and measured: along each line's run, from the node current enters by in the check block's winning state, no structure is nearer the line's feed in plan than the farthest one before it by more than `READ_BACK_M`. Propose a value (the architect's start: 3 m) and say how many lays it loses; say how ring lines (current may enter at either end, 14 and 15) are read. **no test**.
3. [ ] **The feed's clearance and crossings**: no job roof span passes within `FEED_CLEAR_M` (plan) of the feed's pole or its entering span (the architect's start: 6 m, 03's case), and no two job spans cross in plan. How many lays each loses. **no test**.
4. [ ] **Spread**: for each option, how many distinct blocks the 16 fits can be spread over, with no block holding more than 3 pilots. **no test**.
5. [ ] A verdict: "holds" (every pilot but a known rework fits under the recommended option) or the note's question for Josh. **no test**.

**Files.** `docs/design/081-W0-building-targets.md` only. **Count.** 0.

#### W1 · The fit and the city check: lamps on buildings, routes that read outward (grid-simulator). Branch `ticket/081w1-building-targets`, now (W0 is in; re-cut 25 Nov 2026 to its numbers and Josh's answers: W-Q3 "Own block roofs (Recommended)", ring lines "Yes (Recommended)")
**Goal.** `npm run fit` lays every lamp on a building fed by its drop, never doubles a run back, never runs a roof span over the feed, and never crosses two job spans; `npm run check puzzles/city/` fails a file that does any of these and says which line or lamp and why.

**Acceptance criteria.**
1. [ ] **Lamps on buildings.** The city check fails a `puzzles/city/` file whose lamp stands on a `{ post }`, `{ roof }` or `{ pole }`, or whose line ends on a `lead`: "lamp <id>: a city lamp stands on a building, fed by its drop (Josh, 25 Nov 2026)". The fit offers only drop terminals (`b:`) to lamps. **test**: 1 case (a fixture file with a post lamp fails with that message; the same with the lamp on a building passes).
2. [ ] **Reads outward** (W0 section 0's wording; Josh, ring lines: "Yes (Recommended)"):
   - along each line's run, from the node current enters by in the winning state (the note's check block's solution), no structure (pole or roof) is nearer the reference point in plan than the farthest one before it by more than `READ_BACK_M` **3 m**;
   - the reference point is the line's feed, except on a **ring line**, which is measured from the line's own first structure (where it takes its power). A ring line is a line on a cycle of the puzzle's graph, all feeds counted as one node;
   - a line dead in the winning state passes if it reads outward from either end;
   - a drop's wall point is not a structure (counted, it fails P0's `l_inf` by 4.5 m).

   **test**: 2 cases: (a) a fixture like 02's `l_well` (out past the lamp, back to it) fails, naming the line, and its re-lay passes; (b) a ring fixture whose winning current goes the long way round passes, and the same run on a line not on a cycle fails.
3. [ ] **The feed's clearance and no crossings.** No job roof span comes within `FEED_CLEAR_M` **6 m** in plan of the feed's pole or its entering span; a roof span that shares a pole with the entering span is judged by its far end (W0's far-end reading). No two job spans cross in plan. **test**: 1 case: a roof span over the feed's entering span fails, one sharing its pole and ending 7 m off passes, and two crossing job spans fail.
4. [ ] **The roof answer** (W-Q3 "Own block roofs (Recommended)"): a run may use street poles, drops, and roof spans and roof nodes over the district's own blocks and at corners, as B1's answers allow. The check adds no roof filter beyond criteria 2 and 3, and the fit keeps offering roofs. **no test** (no new rule: today's grammar).
5. [ ] **The fit obeys them, inside the search.** The fit checks criteria 1 to 3 as it extends a lay (a run that already reads back, crosses a span or nears the feed is pruned), not on finished lays only, so `FIT_BUDGET` stays P1's 300,000. On a fixture city, a 5-node chain with two lamps fits with both lamps on buildings and passes criteria 1 to 3. **test**: 1 case (P1 criterion 1's case may be rewritten to it instead of added).
6. [ ] **`--avoid <blocks>`** on `npm run fit`: the search skips the named blocks, so P2a2 can spread districts (Josh: "too samey"). **test**: folded into criterion 5's case.
7. [ ] P1's sweep (criterion 7) runs W1's rules over every `puzzles/city/*.city.json`. P0 (`city-two-ways-round`, all building lamps, a ring) passes unchanged (W0: 0.16 m read back). The pilots are not on `main` (PR #69 closed), so nothing else in `puzzles/city/` changes. **test** (the existing sweep, unedited, or 1 rewritten if its message list must grow).
8. [ ] P1's cases that fit or check a post lamp are rewritten to building lamps; the builder lists each. At most 3. **test** (rewritten).
9. [ ] **The pilots' fits, printed once.** The builder runs the fit over 01 to 16's schematics (15 from P2a's rework) and prints, in its reply, which fit within `FIT_BUDGET` and on which blocks. W0 expects 14 of 16 with the rules in the search: 12 and 15 miss (reworks, P2a2), and 09 and 14 fit (W0 found them only at 1.5 M steps, with the rules checked after the search). **no test**.

**Stop rule.** The builder stops ("stop 081 W1", with the branch) if P0 fails a rule, if a rule needs a number other than W0's (3 m, 6 m) for P0 to pass, or if 09 or 14 do not fit within `FIT_BUDGET` with the rules in the search. It does not move a number or the budget to pass: raising `FIT_BUDGET` is a change to P1's number, for Josh.

**Count.** At most 9: 5 added (criterion 1: 1, criterion 2: 2, criterion 3: 1, criterion 5: 1), at most 1 rewritten (7), at most 3 rewritten (8).

**Files.** `tools/fit.ts`, `tools/fitrun.ts`, `tools/fit.test.ts`, `tools/check.ts`, `tools/checkrun.ts`, `tools/check.test.ts`. **Must not:** `src/city/circuit/` (the conversion's CK checks stay as they are: these are rules for authored puzzles, not grammar), `src/grid/`, `src/core/`, `puzzles/`.

**Interfaces.** None in `src/core/`: `READ_BACK_M` and `FEED_CLEAR_M` live in `tools/fit.ts`. No new dependency.

#### W2 · A lit building reads as lit: every storey, a glow that spills, light on the street (renderer). Branch `ticket/081w2-lit-buildings`, after S4 (PR #70) merges and W-Q1 is answered
**Goal.** When current lights a building, every storey's windows glow warm, the light haloes off the glass and falls onto the pavement, the road and the walls across from it, not only round the door. A dark building with a live drop reads as a dead lamp. No lamp post or flat disc stands anywhere.

**Acceptance criteria.**
1. [ ] **Why storeys stay dark, first.** Before any change, the builder reports, on `city-two-ways-round` and on one building of each kind in its district (mid, corner, shopfront), which pieces of a lit building do not glow and why (ground storey not in `pieces`, glass outside `WINDOW_UV`, a column whose models did not all load, or another cause). **no test** (in the reply).
2. [ ] **Every storey.** Every piece of a lit building that has glass, ground storey and shopfront included, takes the building's window level. **test**: 1 case on a fixture building of ground storey, two floors and a roof: every glass-bearing piece carries the level and the roof none.
3. [ ] **The glow that spills** (W-Q1; written to the recommended "Glow cards and a higher light"):
   - a soft additive glow card in front of each glass-bearing piece of a lit building, on its street faces only, one `InstancedMesh` for the job sized at build, its opacity from the building's level (so the Relight's order, the flare and the brownout flicker come from L1's `buildingGlow` with no new timing);
   - L2's light for the building stands at **half the building's height** (not 3 m) and its reach grows with the height, `STREET_LIGHT_REACH_M` x (1 + storeys / 4) (a starting point Josh tunes by eye), so the pool lies under every storey.

   If Josh picks "Bloom": Three's own `UnrealBloomPass` (in the `three` package, `three/examples/jsm`; **no new dependency**) on the play view only, and this criterion is re-cut by the architect with its budget. **test**: 1 case: `glowCards(...)` gives one card per glass-bearing street-face piece of the lit buildings, none on a yard face, and a light's height is half its building's.
4. [ ] **No lamp posts, no flat disc.** E2's `LampGlow` sphere and ground circle for `{ post }` lamps go from `cityview.ts`; a `{ post }` lamp (no city file has one after W1) draws its overlay icon only. FX3's "a post lamp at its glow" line is struck by this cut. **test**: 0 added; any E2 or L1 case that asserts a post glow is removed, and the builder lists it.
5. [ ] **The dead-lamp signature on a building** (the Decided "current reaches a dark lamp"). A building whose lamp has a `dead-lamp` fault, with its line powered, has its drop lit with pulses to the wall and its windows, glow cards and light at 0. **test**: 1 case on a fixture conversion (`lineFlow` gives 1 on the drop's line, `buildingGlow` and the glow cards 0).
6. [ ] **The budget.** `perf=1` on 6 x 6 seed 1 with P0 after the Relight, against S4's numbers: at most 1 more draw call, no new program between the first frame after the models load and the end of the Relight, median frame within 1.5 ms of S4's. Over it, the builder stops ("stop 081 W2") and does not shrink the cards or the reach to pass. **browser**.
7. [ ] Josh plays `city-two-ways-round` from the default camera and `cam=street`: every storey of each lit building glows, light falls on the street in front and across it, and no lamp post or disc stands. **browser**.

**Count.** 3 added (criteria 2, 3, 5), the removals in criterion 4 listed.

**Files.** `src/render3d/windows.ts` and `windows.test.ts`; `src/render3d/cityview.ts` (the build step, the live layer, the post glow's removal; not `cityHit`, `jobFrame`, `playRigOptions` or the FX calls). **Must not:** `overlay.ts`, `plan3d.ts`, `models3d.ts`, `lightrig.ts`, `lighting.ts` (read only), `src/city/`, `src/core/`, `src/ui/`, `src/main.ts`, `src/play/`, `tools/`. If criterion 1 finds the cause is in `plan3d.ts`'s instancing (a piece never instanced), the builder stops and the architect re-cuts.

**Interfaces.** None in `src/core/`. No new dependency (bloom, if picked, is in `three`).

#### W3 · The target reads as the target; each icon on its piece (renderer). Branch `ticket/081w3-target-reads`, after W2 merges and W-Q2 is answered
**Goal.** Among the lit scenery, the player can tell at a glance which building the priests want lit, dark or lit, and every breaker, switch and fuse box icon sits on the pole or roof it stands on.

**Acceptance criteria.**
1. [ ] **The target's mark** (W-Q2; written to the recommended "Gold windows and the icon"): a target building's windows, glow cards and light burn in `TARGET_PANE`, a pale gold (the priests' "robes in light and gold", GDD 08), not the scenery amber; while it is dark its overlay icon carries the target mark, as E4 draws it. **test**: 1 case: a target building's level writes the gold colour and a scenery building's the amber.
2. [ ] **Icons on their pieces.** The builder first reports, on P2a's 03 (branch `ticket/081p2a-pilots`, read only) and on P0, the screen distance at the default camera between each node's icon and its model's attachment point, and why it is large where it is (for example the fixed `OVERLAY_POLE_Y_M` against a pole model's real height, PK1). Then each icon's anchor is its model's attachment point. **test**: 1 case: a pole node's icon point is at its pole model's top attachment height from `src/core/powerpoles.ts`, and a roof node's at its mast's deck.
3. [ ] **Pulses run outward.** On P0 and on any W1-laid pilot, every live run's pulses move away from its feed, the drops included. **browser**.
4. [ ] Josh plays P0 and says whether the target reads among the lit scenery. **browser**.

**Count.** 2 added.

**Files.** `src/render3d/overlay.ts` and `overlay.test.ts` (the anchor only); `src/render3d/windows.ts` and `windows.test.ts`; `src/render3d/cityview.ts` (the target colour in the live layer). **Must not:** as W2.

**Interfaces.** None in `src/core/`; `TARGET_PANE` is internal. No new dependency.

#### P2a2 · The pilots re-laid on building targets (puzzle-designer). Branch `ticket/081p2a2-building-targets`, from `main` after W1 merges
**Goal.** Puzzles 01 to 16 on the city again, every lamp a building fed by its drop, routes that read outward from one fixed view, spread over the city, so Josh can play the pilot again.

**Acceptance criteria.**
1. [ ] Each of 01 to 16 has a city file and a note in `puzzles/city/`, laid with W1's fit and passing `npm run check puzzles/city/`. The P2a branch's files are a source the designer may copy from where they pass (16 has no post lamp), not a base: the branch starts from `main`. **test** (P1's sweep).
   - **12 is a rework** under answer 4 ("Change the puzzle instead"): W0 found it misses W1's rules under every roof answer (feed clearance and a crossing). Its note gets a **What changed from the schematic, and why** section, its own check block and analyzer numbers, and keeps "which fuse" as the element under test where it can.
   - **15 is re-reworked**: P2a's rework does not fit W1's rules either (W0). The new note keeps 15's element (the nearest feed carries it) and says what changed from P2a's rework as well as from the schematic.
   - 09 and 14 come from W1's fit (criterion 9). If W1's reply says either misses, it is a rework too, under answer 4, and its note says so.
2. [ ] Each note, as P2a's criterion 2, plus: which lamps moved from a post or roof to a building (a **What changed** line each; a move of place alone is "raised, not reworked" when the analyzer's numbers stay equal), and where the target building is in the intended read from the default camera. **no test**.
3. [ ] **Spread** (Josh: "too samey"): no block holds more than 3 of the 16, using `--avoid` (W1). A designer's aim measured by W0, not a city rule. **no test**.
4. [ ] `puzzles/SCHEMA.md`'s city section says a city lamp stands on a building by its drop, that `{ post }` and `lead` are not used in `puzzles/city/`, and (the P2a review's could-improve 2) that a city note whose schematic has no check block carries one that replays the same on both. **no test**.
5. [ ] P2a's review's could-improve 3 and 4 (15's trap name; the scratch-run clause) are carried into 15's new note. **no test**.
6. [ ] **Josh plays** the 16 after W2 and W3 merge. His verdict goes under **What it taught us**. **browser**.

**Files.** `puzzles/city/`, `puzzles/SCHEMA.md` (the city section). **Count.** 0.

**PR #69 (P2a).** Closed unmerged (Josh, W-Q5: "Close, re-lay (Recommended)"). Its branch stays until the cleanup step puts it to Josh.

#### W4 · Pulses run outward from the feed, and live runs show through buildings (renderer). Branch `ticket/081w4-pulse-direction`, from `main` after PR #74 (P2a2) merges. Cut 25 Nov 2026; **not approved** (for Josh's G1)
**Josh, 25 Nov 2026**, playing the re-laid pilot 01 (PR #74's branch: `main` with W2 and W3). In chat: "Issue with level 1 and the flow of electricity". On a card: "Pulses run backward". Told what the main session saw on 01, he said: "that's exactly what I meant". Then on 02: "Same thing with lv2", with a screenshot.

**Josh, 25 Nov 2026, on pilot 03:** "Lv3 looks good, but is it possible to make the animations visible through the buildings? Maybe faded?" His screenshot shows 03 after the win, from the default camera. The live runs pass behind and over buildings and vanish where a building hides them: a feed run ends at a roof edge, and a switch run is cut off by a building.

**The evidence.**
- **01, `l_br`** (`j0` to `br_1`, one span). After the win, the pulses move from the breaker down into the junction pole, against the current.
- **02, after the win.** The feed is at the right. The run goes left from the feed, through `sw_1` and `sw_2`, to the target building's drop at the left. Josh's arrows show the pulses moving right, towards the feed, along the whole run. They run backward on every span, multi-span lines included, not only on a one-span line.
- **The renderer's reading of 01 (code only, nothing run):** `jobWires` gives `flip` true, the grid gives `reversed` false, so `wireLit` gives `forward` false (`out.forward = w.flip === reversed`), and the frame loop should then draw the pulses outward (`pointOnWire(w, lit.forward ? d : w.len_m - d)`). The reading says right; the screen says wrong.
- **Suspects (the architect's, from reading `main`):**
  - (a) **One-span lines:** `jobWires` guesses a one-span run's start by which end is nearer `line.from`'s `placePoint`, while its multi-span path uses the shared pole.
  - (b) **A global inversion,** which 02 points to. The drawn wire's points (`w.pts`, from `circuitDraws`' `from` to `to`) may run in the opposite order to the span's `a` to `b`, against which `flip` is measured (`flip = e.a !== cur`). Either the span id's sorted order or the drawn wire's ends could differ from `a`/`b`. A sign error between `flip`, `forward` and `pointOnWire` would also do it.
  - The W3 criterion 3 browser check missed it, and no test pins pulse direction.

**Goal.** On every city puzzle, every live wire's pulses move away from the feed, on every span and drop, in play and in the Relight. Where a building hides a live run, the run still shows through it, faded, so it reads end to end from the fixed camera.

**Acceptance criteria.**
1. [ ] **The cause, first.** The builder finds the real cause before fixing it, by a pure probe or the dev server (the browser pane, not a headless browser). It reports, in its reply, which suspect it was, or what else it was, with the lines of code. **no test** (in the reply).
2. [ ] **The fix**, at the cause, in `src/render3d/`. **test**: criterion 3.
3. [ ] **Direction pinned, in one pure test.** For P0 and the 16 pilots (`puzzles/city/*.city.json`, converted on 6 x 6 seed 1 through the module cache), in each check block's winning state: for every powered wire of every file line, and for the drops, the point a pulse reaches is farther along the current than the point it started from. That is, a pulse moves from the end where current enters the wire, as the grid's `flowFrom` gives it, towards the other end, in world coordinates, using the same functions the frame loop calls (`jobWires`, `lineFlow`, `wireLit`, and the pulse position the loop computes, exported if it is inline today). **test**: 1 case (2 at most, if the Relight's pacing needs its own), and one city build. The builder gives its time.
4. [ ] **Which were affected.** The builder lists, in its reply, every pilot and line whose pulses ran backward on `main` before the fix: the test run against `main`'s code. **no test**.
5. [ ] **Live runs show through buildings, faded** (Josh: "Maybe faded?").
   - The live layer's glow and pulse instanced meshes are drawn a second time, at build. The second pass is two more `InstancedMesh`es that share the first pass's geometry and instance matrices, with `depthFunc` `GreaterDepth` (only where something is in front), `depthWrite` false and `XRAY_OPACITY` **0.25** (the architect's start; Josh tunes it by eye).
   - The second pass shows only what the first pass draws: the same dark wire, lit share, Relight pacing and brownout wobble, read from the same per-frame writes. No second set of per-frame writes. Dead wires and the dark circuit are not drawn through.
   - The overlay icons are unchanged.
   - The faded pass draws after the city's opaque pass and before the overlay.

   **test**: 1 case: the x-ray meshes share the live meshes' geometry and instance attributes (the same objects), and their materials have `GreaterDepth`, `depthWrite` false and `XRAY_OPACITY`.
6. [ ] **What it costs, measured.** Expected: 2 more draw calls (one per x-ray mesh). Each x-ray material's program is compiled at build, so no new program appears between the first frame after the models load and the end of the Relight. Frame time grows only by the pixels of the hidden runs. The builder runs `perf=1` on 6 x 6 seed 1 with P0 after the Relight, against `main`, and reports draw calls, programs and the median frame time.
   - Over 2 more draw calls, or any new program in play: the builder stops ("stop 081 W4").
   - Over 1.0 ms more on the median: the builder also stops. It does not lower the opacity or drop the pulses to pass.

   **browser**.
7. [ ] Josh plays 01 and 02: the pulses run from the feed outward on every span. He plays 03: the feed run and the switch runs read end to end, faded where buildings hide them. **browser**.

**Count.** 2 added (criterion 3, criterion 5); 3 at most, if the Relight's pacing needs its own direction case.

**Files.** `src/render3d/cityview.ts` (`jobWires`, `wireLit`, the pulse position in the frame loop, and the x-ray pass in the build step; the export only, if one is needed for a test); `src/render3d/circuitdraw.ts`, only if the cause is the drawn wire's end order; a new `src/render3d/pulsedir.test.ts`, or one case in an existing cityview test file. **Must not:** `src/city/`, `src/grid/`, `src/core/`, `puzzles/`, `tools/`, `overlay.ts`, `windows.ts`. If the cause is outside `src/render3d/` (for example the conversion's run order), the builder stops ("stop 081 W4") and the architect re-cuts.

**Order.** The test reads the 16 pilots, so the branch is cut from `main` after PR #74 merges. If Josh wants it before then, it branches from PR #74's branch and merges `main` in once #74 is in. No pipeline-designer pre-check: this is drawing, not a rule or a number.

**Interfaces.** None in `src/core/`. No new dependency.

### V · Every puzzle wire highlighted; the load a throw or a repair would bring, as a number. Cut 25 Nov 2026 for G1, in five PRs: V0 (a note), V1, V2, V3, V4. **Approved (G1) 25 Nov 2026**

**Josh's answers, 25 Nov 2026, on cards (relayed by the main session):**
- **G1:** "Approve V (Recommended)".
- **V-Q1, how a dead puzzle wire is highlighted:** "Ribbon tint (Recommended)". V1 is built as written; its criterion 3 (faded through buildings) is dropped.
- **V-Q2, what the number counts:** "Visible load (Recommended)", the option cut as "Drawn load": unreadable faults are treated as sound, so the Decided "Faults hide faults" holds. V2 criterion 3 is built as written.
- **V-Q3, which controls:** "Breakers and switches (Recommended)".
- **V-Q4 (the number's form) and V-Q5 (when it is shown)** were left open until V0's note (`docs/design/081-V0-load-preview.md`, Josh's answers at its top). **Answered after it, 25 Nov 2026, on cards:** V-Q5 "On, a key hides it (Recommended)"; V-Q4 "+3, load added (Recommended)"; V-Q6 "Keep counting it (Recommended)" (a fault the player has read stays in the numbers). He saw on the card that the numbers give away the trap on 10 of 17 pilots (V0 section 1: 04, 05, 07, 09 to 15; on 03 they do the sum). V2, V3 and V4 are re-cut to these answers and V0's readings R1 to R3.
- **Then, in chat, the same day:** "Fuses and power sources do not showcase their load. Fuses should burse with sparks when they blow, additionally the wires that they service no longer have an animation when they blow. I think we should add a bolt of electricity that flows through the wires followed by a big spark at the fuse." The first sentence is V3's criterion 4. The rest is section FX4.
**Josh, 25 Nov 2026, in chat:** "Another issue. I want all wires associated with the puzzle to be highlighted. The game is too confusing. Further more each breaker should showcase the load that would be applied as a number if flipped. Each broken wire should show the load that would be added if repaired."

**What the architect read (at `origin/main` e9f8502, with W4 building on `ticket/081w4-pulses-outward`).**
- **The job's wires today.** E2's live layer glows and pulses a job wire only while it is powered. W4 adds a faded see-through pass for live runs. A dead job span is drawn with the same dark wire as every scenery span, so a dead run cannot be told from the city's own wires. S4's scenery drops glow when live; the city's other spans and drops never glow.
- **The HUD's number** is per feed, "using X of Y" (`src/ui/`, from `GridState.feeds`). Fuse boxes carry `fuseLoad` against their `rating`.
- **The renderer does not run the grid.** It reads `GridState` (a type import) each frame. The page (`src/main.ts`, the ui's) holds the grid. So the what-if is computed in `src/grid/`, called by the page, and handed to the renderer to draw.

**1. "Highlighted" (the architect's reading; Proposed).** Every span and drop of every file line's run is drawn in the job's own colour, live or dead, so the puzzle's circuit stands apart from the city's wires at a glance.
- Scenery wires (the city's other spans, scenery drops that are dark) keep today's dark wire.
- A dead job wire gets a steady, dim **ribbon-colour tint** (V-Q1). It has no glow and no pulses, so it never reads as live: the Decided signatures need live and dead to differ.
- A live job wire keeps E2's glow and W4's outward pulses on top.
- A cut span is tinted like the rest of its line. The break prop and the break icon still show only when readable (Josh, 23 Nov 2026: "Only when readable"). So the highlight shows the route and nothing about faults.
- A live scenery drop (S4) keeps its glow, untinted.
- Whether the dead tint also shows faded through buildings, as W4 does for live runs, is V-Q1.

**2. The load preview (the architect's reading; Proposed; V-Q2 to V-Q4 are Josh's).**
- **For a breaker,** the number is the change in its feed's load if it were thrown now. **For a switch** (V-Q3), it is the same, for the switch thrown to its other line. **For a readable break** (its icon is shown), it is the change if it were repaired now, whether or not Enoch holds the wire.
- **The units are the HUD's:** lamp-loads, per feed. It is shown as a signed change by the icon, "+3" or "−2" (V-Q4).
- **Red when over:** if the throw or repair would take a feed over its capacity (a brownout) or a fuse over its rating (a blow), the number is red.
- **"Faults hide faults" (Decided)** binds what the number may count. A **true what-if** (run the grid with the throw, read the load) counts what lies past a break or an open breaker. A hidden dead lamp or blown fuse there makes the number smaller than the drawn loads, so it tells the player about a fault they cannot yet read. That **breaks the Decided rule** ("nothing past an unrepaired blocking fault can be read"). So the recommended number is the **drawn load**: the what-if run with every unreadable fault treated as repaired, counting only faults the player can already read. It may turn out higher than the real change once a hidden fault shows, as the drawing does. The true what-if is offered to Josh as a proposal to change the rule (V-Q2), never built without his word.
- **Does it remove the puzzle?** The numbers do the brief's capacity sum for the player. The brief's question 2 ("Does capacity produce a real choice") and the ladder's elements are Draft design, Josh's to trade.
  - **Capacity or fuse choice, answered by the numbers:** 03 (not enough for all), 04 (the tired feed), 07 (its second half), 09 (shrine circuit, the capacity half), 10 (the long way brings the mill), 11 (the small fuse: red shows the blow before it happens, so its trap of a fuse that costs a part is gone), 12 (which fuse), 13 (one box, three lamps), 14 (ring from the east, which end can carry it), 15 (meet in the middle: the per-feed number shows which feed carries a junction, the element under test).
  - **Untouched:** 01, 02, 06 and 08 (no capacity pressure), and 05 (separate pools; the number only states what the HUD already does).
  - **With the true what-if (V-Q2's second option), the hidden-fault pilots leak too:** 07 (the dead bulb behind the fuse) and 16 (the second fault behind the first), and any other pilot with a fault behind a fault.
  - V0 measures this, pilot by pilot.
- **No other Decided rule is touched.** The rules on parts, the Relight and flow are untouched, and the highlight shows nothing about faults (point 1). Without V-Q2's second option, "Faults hide faults" holds.

**Pre-check.** V adds a number the player is told, so **V0 is a pipeline-designer pre-check** ("pre-check 081 V2") before V2 is built. V1, V3 and V4 draw or wire it, so none.

**Order and parallel work.**
| Wave | Sections | Shared files | Why |
| --- | --- | --- | --- |
| Now | W4 (building) | `cityview.ts` | V1 and V3 wait for it. |
| 1, after G1 | V0 (a note); V2 after V0 holds (or Josh's answer) | none (`src/grid/`) | V2 shares no file with W4. |
| 2, after W4 merges | V1 (highlight) | `cityview.ts`, `circuitdraw.ts` (W4 may touch `circuitdraw.ts` if its cause is there) | Its live layer is W4's. |
| 3, after V1 and V2 | V3 (renderer: the numbers by the icons) | `overlay.ts` (W4 must not touch it), `cityview.ts` (`paintOverlay`), `renderer.ts` | Codes against the core type. |
| 4, after V2 and V3 | V4 (ui: the page computes the preview and hands it over) | `src/main.ts` | Calls both. |

#### V0 · "pre-check 081 V2" (pipeline-designer; a note). Branch `ticket/081-puzzles-on-the-city`
**Goal.** Before V2, say pilot by pilot what the numbers give away, under each V-Q2 option, so Josh answers V-Q2 and V-Q5 with the cost in front of him.

**Acceptance criteria.**
1. [ ] For P0 and the 16 pilots (P2a2's files), at the start and at each step of the check block's solution and each trap, the preview for every control and readable break under (a) the drawn load and (b) the true what-if. **no test** (a script run on demand, in `tools/` or the scratchpad, not `npm test`).
2. [ ] For each pilot, whether the numbers mark every trap's wrong move red before it is made (the trap given away), and, under (b), whether any number differs from (a) while a fault is hidden (a leak). It names each. **no test**.
3. [ ] A verdict: which pilots keep their element with the numbers on, and the question for Josh if the drawn load leaks anything (it should not). **no test**.

**Files.** `docs/design/081-V0-load-preview.md` only. **Count.** 0.

#### V1 · Every puzzle wire highlighted (renderer). Branch `ticket/081v1-job-wires`, after W4 merges and V-Q1
**Goal.** From the default camera, the player sees the whole puzzle circuit in its own colour, dead runs included, apart from the city's wires; live runs glow and pulse on top, as W4 left them.

**Acceptance criteria.**
1. [ ] **The tint.** Every wire of `jobWires` (every span and the drop of every file line's run) is drawn in `JOB_WIRE_TINT` at `JOB_WIRE_DIM` (the ribbon colour; Josh tunes by eye), as one more instanced layer made at build and never changed in play. No scenery span, no scenery drop and no hidden line is in it. **test**: 1 case on a fixture conversion: the tinted layer holds exactly the file lines' spans and drops, and none of the scenery's.
2. [ ] **Dead reads dead.** The tint has no pulses and no glow. A live wire's glow and pulses draw over it, unchanged. A cut span is tinted as its line, with no mark of the cut. **test**: folded into criterion 1's case (a cut span is in the layer, with the same tint as its neighbours).
3. [ ] **Through buildings** (only if V-Q1 is "Tint, and faded through buildings"): the tint layer takes W4's see-through pass, sharing its geometry. **browser**.
4. [ ] **The budget.** `perf=1` on 6 x 6 seed 1 with P0, against W4's numbers: at most 1 more draw call (2 with criterion 3), no new program in play, median within 0.5 ms. Over it, the builder stops ("stop 081 V1"). **browser**.
5. [ ] Josh plays 03 and 04: every run of the puzzle shows before power, apart from the city's wires. **browser**.

**Count.** 1 added.

**Files.** `src/render3d/cityview.ts` (the build step and the live layer), `src/render3d/circuitdraw.ts` (read only, unless the wires' geometry must be exported), and one cityview test file. **Must not:** `overlay.ts`, `windows.ts`, `src/city/`, `src/grid/`, `src/core/`, `src/ui/`, `src/main.ts`.

#### V2 · The load preview, pure (grid-simulator). Branch `ticket/081v2-load-preview`, now. Re-cut 25 Nov 2026 to V0's note and Josh's V-Q4 "+3, load added (Recommended)" and V-Q6 "Keep counting it (Recommended)"
**Goal.** A pure `loadPreview(puzzle, state, known)` in `src/grid/` gives, for every breaker and switch (V-Q3 "Breakers and switches (Recommended)") and every readable fault, the load the move would put on, "+3", and whether it would end with a feed over or a fuse blown. It counts only what the player can see or has seen.

**What it counts** (`src/core/preview.ts`, committed with this re-cut):
- **The visible load** (V-Q2 "Visible load (Recommended)"). The what-if runs on the grid's own rules. Every fault the player cannot read now and has never read is treated as sound, so the Decided "Faults hide faults" holds: V0 found 0 leaks in 117 states.
- **Known faults stay counted** (V-Q6 "Keep counting it (Recommended)"; V0 R3). A fault in `known` (the ids that have been in `readableFaults` at any state of this play; the page keeps them, V4), or readable now, counts as it is, even after current is routed away. Without this, V0 found 17 false numbers on 09, 10, 14 and P0.
- **`delta`** (V-Q4 "+3, load added (Recommended)"; V0 R2) is the load the move puts on, before any fuse blows: the visible load the move would newly light, less what it would darken, over every feed. So 11's `br_s` reads +2, not the −4 it would read after the blow.
- **`over`** (V0 R1): after the move and its blows, some feed ends over its capacity (even if it was over already), or a fuse blows. `blows` names the fuse boxes. Each feed is judged on its own (015 A).
- V0's one expected false red stands: 10's solution step `br_long` reads +5 red with known faults, because `l_long2`'s break is hidden. That is the drawn rule itself, and the note says so.

**Acceptance criteria.**
1. [ ] **Breakers and switches.** On a fixture of a feed, a breaker with two lamps past it, and a switch: the breaker's entry is +2 when open and −2 when closed, and the switch's is its other line's visible load less its present line's. The call changes no state (the grid's state before and after are equal). **test**: 1 case.
2. [ ] **A readable fault.** On a fixture, a damaged cable that current reaches has an entry for the load past it, whether or not the parts hold a wire. A fault that current does not reach has no entry ("Only when readable"). **test**: 1 case.
3. [ ] **Unread faults stay hidden** (the Decided "Faults hide faults"). On a fixture where a blown fuse hides a dead lamp, the fuse box's repair entry counts the dead lamp's load, and equals the entry on the same fixture with the lamp sound. **test**: 1 case.
4. [ ] **Known faults stay counted** (V-Q6). On a fixture like 10 (a switch to a line with a break the player has seen, current since routed away), the switch's entry with the break's id in `known` counts the break: +0 past it. Without the id, it counts the break as sound. **test**: 1 case.
5. [ ] **Before the blow, and red** (V0 R1, R2). On a two-feed fixture: a move that adds 2 past a fuse rated under it reads +2, `over` true, `blows` naming the fuse. A move that leaves an already-over feed over is `over`. A move on the other feed is judged on its own. **test**: 1 case.
6. [ ] **V0's figures, once.** The builder runs `loadPreview` over P0 and the 16 pilots' check blocks and prints, in its reply, the red-before-made count per pilot against V0's table (10 of 17), and any entry that differs from V0's "known" column. **no test**.
7. [ ] `src/grid/` stays pure (its existing purity case, unedited). **test** (existing).

**Count.** 5 added.

**Files.** `src/grid/` (a new `preview.ts` and `preview.test.ts`, and the export in `index.ts`). **Must not:** any other folder. `createGrid`'s behaviour does not change.

**Interfaces.** `LoadPreview`, `LoadPreviewEntry` (`{ kind, delta, over, blows }`) and `LoadPreviewKind` are in `src/core/preview.ts` (committed with this re-cut; typecheck passes). The function is `loadPreview(puzzle: Puzzle, state: GridState, known: ReadonlySet<string>): LoadPreview`. No event, no new dependency.

#### V3 · The numbers by the icons (renderer). Branch `ticket/081v3-preview-numbers`, after V1 merges (shares `cityview.ts`); it codes against the core type, so it need not wait for V2
**Goal.** By each breaker and switch icon and each readable break icon, the player reads the load the move would put on, "+3" or "−2", red if it would end with a feed over or a fuse blown. By each fuse box and each feed icon, the player reads its load now against its limit, "2 of 3".

**Acceptance criteria.**
1. [ ] **The preview's numbers.**
   - `MapRenderer3d.setLoadPreview(p: LoadPreview | null)` (`renderer.ts`) stores the page's preview.
   - The overlay draws each entry's `delta` signed ("+3", "−2"; V-Q4 "+3, load added (Recommended)") beside its icon (the break's at the real cut, as E4 places it), in the HUD's font, red when `over`. A zero is drawn only when `over` ("0" in red: 13's fuse, which would blow again); otherwise nothing.
   - `null` draws none.

   **test**: 1 case: `overlayLabels(icons, breaks, preview, state)` (pure, in `overlay.ts`) gives one label per entry whose icon is on screen, at the icon's side, red for `over`, none for a hidden break or a plain zero, and a red "0" for an `over` zero.
2. [ ] During the Relight no preview numbers are drawn (it can't be interrupted, and nothing is left to choose). **test**: folded into criterion 1's case.
3. [ ] **Fuses and feeds show their load** (Josh: "Fuses and power sources do not showcase their load"). By every fuse box icon with a `rating`, "<`fuseLoad`> of <rating>". By every feed icon with a `capacity`, "<its `feeds` load> of <capacity>", in the HUD's units, scenery included.
   - Both read the `GridState` the renderer already has: the load lit now, which is visible load, so nothing leaks (V0 section 1).
   - Red when the feed is over. A blown fuse box reads "0 of <rating>" beside its blown icon.
   - Drawn during the Relight too, and **not hidden by V4's key**: they state what is lit, not what a move would do (the architect's reading of V-Q5, which was asked about the preview).

   **test**: 1 case: `overlayLabels` gives "2 of 3" by a fuse box and "13 of 25" by a feed from a fixture state, red for an over feed, and none for an unrated fuse or an unlimited feed.
4. [ ] Josh plays 04, 06 and 11: each breaker and switch shows the load it would put on, the break shows its load once current reaches it, 11's breaker reads +2 in red before the fuse blows, and every fuse and feed shows "x of y". **browser**.

**Count.** 2 added.

**Files.** `src/render3d/overlay.ts` and `overlay.test.ts`; `src/render3d/cityview.ts` (`paintOverlay` only); `src/render3d/renderer.ts` (the one method). **Must not:** `src/grid/` (the renderer gets the preview from the page), `src/ui/`, `src/main.ts`, `windows.ts`, `fx.ts` (FX4's).

#### V4 · The page computes the preview; a key hides it (ui). Branch `ticket/081v4-preview-wired`, after V2 and V3 merge
**Goal.** After every throw, repair, undo or reset, the page asks the grid for the preview, with the faults read so far, and hands it to the renderer. The numbers are on when a puzzle opens, and a key the HUD names hides and shows them (V-Q5 "On, a key hides it (Recommended)").

**Acceptance criteria.**
1. [ ] **The read faults** (V-Q6). A pure helper in `src/ui/`, `previewFor(puzzle, state, known, relighting)`, adds `state.readableFaults` to `known` and returns the new `known` and the preview (`null` while relighting or after the win). `known` is kept for the play. Reset clears it. An undo keeps it: the player has seen what they have seen (the architect's reading). **test**: 1 case: a fault read at one state stays in `known` after current is routed away, reset clears it, and relighting gives `null`.
2. [ ] `src/main.ts` calls `previewFor` on each state change (not each frame) and `setLoadPreview` with the result. **no test** (criterion 1 holds the logic).
3. [ ] **The key** (V-Q5 "On, a key hides it (Recommended)"). `V` hides and shows the preview numbers. They are on when a puzzle opens. The HUD names the key in one short line ("V: load numbers"). The choice holds for the session and is not saved. The fuse and feed labels (V3 criterion 3) are not hidden. **browser**.
4. [ ] Josh plays 10: he throws `sw_1`, sees the break, throws back, and the number still counts the break. Then he hides the numbers with the key. **browser**.

**Count.** 1 added.

**Files.** `src/main.ts`; `src/ui/` (the helper, its test, and the HUD's key line). **Must not:** `src/grid/`, `src/render3d/`, `src/play/`. If the key must go through `src/play/`'s key handling, the builder stops ("stop 081 V4") and the architect re-cuts with an interaction section.

**Order (re-cut 25 Nov 2026).** V2 now (`src/grid/` only). V3 after V1 merges, beside V2 (it codes against `src/core/preview.ts`). V4 after both. FX4 shares `cityview.ts` with V1 and V3, in other parts.

### FX4 · The fuse blows: a bolt down its wires, a burst at the box (renderer). Branch `ticket/081fx4-fuse-blow`, after W4 merges. Cut 25 Nov 2026; **approved (G1) the same day, with FX3 folded in**

**Josh's answers, 25 Nov 2026, on cards (relayed by the main session):**
- **G1:** "Approve FX4 (Recommended)".
- **FX4-Q1:** "Towards the fuse (Recommended)". Criterion 1 is built as written.
- **FX4-Q2:** "Fold it in (Recommended)". FX3 rides in this PR. On the same card:
  - **FX-Q3** was stated as "arcs show on overloaded lines". That is FX3 criterion 2 as written: arcs on the live poles of a feed that is over.
  - **FX-Q4** was stated as "the Relight bursts at each lit target". So FX3 criterion 1 bursts at each **target** lamp as it lights, not at every job lamp (the architect's reading of the card's words). A non-target puzzle lamp lights with L1's flare only.
- **FX4-Q3:** "Twice a live break's (Recommended)". `BLOW_SPARKS` is twice FX2's cut burst (criterion 2).
**Josh, 25 Nov 2026, in chat:** "Fuses should burse with sparks when they blow, additionally the wires that they service no longer have an animation when they blow. I think we should add a bolt of electricity that flows through the wires followed by a big spark at the fuse."

**What happens today (read at `origin/main` e9f8502).**
- **The grid reports a blow** with `fuse:blown` (`src/core/events.ts`): `nodeId`, `faultId`, `load`, `rating`, `culprit`, `path` (the line ids from the fuse to the culprit) and `lamps` (every lamp whose load counted, each with its path).
- **The page** (`src/main.ts`) passes it to the renderer's `notify` and shows a notice.
- **The city renderer's `notify` is a no-op** (`cityview.ts`: `notify() {}`). So on the 3D city a blow shows nothing: the served wires just go dark at once, because the grid's state is already blown. That is "no longer have an animation".
- **The 2D map** (ticket 016) ran a shock along each path, timed by `BLOW_TIMING` (`src/core/timing.ts`: streaks run 0.4 s fuse to lamps, glow 0.3 s, lamp sparks at 0.5 s, the fuse pops at 0.7 s for 0.6 s).
- **The sound** (`src/audio/cues.ts` `blowCues`) already plays on `fuse:blown` to the same `BLOW_TIMING`. So the picture can join it with no sound section, as long as it keeps those times.
- **FX2** gives the particle pool, the lightning layer (colour per instance) and the soft-spot flash, under its budget: at most 1.5 ms CPU over `fx=0` and never over 16.7 ms.
- **FX3** (Relight bursts and brownout arcs) is cut, not built, and waits on FX-Q3 and FX-Q4. It uses the same pool and layer and shares `fx.ts` and the frame loop. So it can ride in this PR if Josh answers its two cards (FX4-Q2).

**No Decided rule is touched.** "Fuse rating: over it, blows on power" and the signature "current into a fuse box and none out" hold: the effect plays over the state the grid has already set, and the fuse box then reads blown, with current in and none out. The Relight is not involved, and input is not blocked during the effect.

**Goal.** When a fuse blows on the city, a bolt of electricity runs along every wire the fuse was serving, the drops to the lamps that counted included, and ends in a big spark burst at the fuse box, timed with the blow's sound. Then those wires are dark, and the box reads blown.

**Acceptance criteria.**
1. [ ] **The bolt.** `notify` keeps each `fuse:blown` with its start time.
   - A pure `blowBolts(blow, wiresOfLine, t)` in `fx.ts` gives, for each lamp path in `lamps` (`path` when `lamps` is absent), the bolt's head and tail along its wires at time `t` after the blow.
   - The bolt runs **towards the fuse** (FX4-Q1, written to the recommended answer), from the lamp's drop to the fuse box, over `BLOW_TIMING.run + glow`. It reaches the fuse at `popAt`, so it lands on the sound's pop.
   - With no path, there is no bolt, and the burst is at 0, as `BLOW_TIMING` says.
   - The bolt draws in FX2's lightning layer, bright cold white, so no draw call is added.

   **test**: 1 case on a fixture blow with two lamp paths: at 0 each bolt is at its lamp's end; at `popAt` both are at the fuse; after `popAt + pop` nothing is given.
2. [ ] **The burst at the fuse.** At `popAt`, once, at the fuse box's place: a spark burst of `BLOW_SPARKS` particles, at least twice FX2's cut burst and faster, and a soft-spot flash for `BLOW_TIMING.pop`. The burst comes from FX2's pool. **test**: folded into criterion 1's case (the burst is issued once, at the fuse's point, at `popAt`).
3. [ ] **The served wires go dead.** Under the bolt the served wires show no pulses. They are dark from the blow on, as the grid's state already has them, and the bolt is the only thing on them. After it, they stay dark until the fuse is repaired. **browser** (`lineFlow` is unchanged; its cases hold the state).
4. [ ] **Undo, reset and a new blow.** An undo or reset during the effect stops it at once, as FX2's repaired cut stops. Two blows in one action each play their own. **test**: folded into criterion 1's case (`blowBolts` gives nothing once the blow is cleared).
5. [ ] **`fx=all`** gains a blow on the job's first rated fuse box every 2 s. **no test**.
6. [ ] **The budget, as FX2's.** Against `fx=0` in the same session, `fx=all` adds at most 1.5 ms to the CPU median (2.0 ms with FX3 folded in) and stays at most 16.7 ms. No draw call is added beyond FX2's, and no new program appears in play. It has FX2's stop rule ("stop 081 FX4"), and the builder does not shrink the burst to pass. **browser**.
7. [ ] **The sound lines up.** On the city, the pop's sound lands with the burst and the bolt's crackle with the bolt. If they don't, and the picture keeps `BLOW_TIMING`, the builder reports it, and a sound section (`src/audio/`, the sound agent's) is cut. **browser**.
8. [ ] Josh plays 11 (the small fuse) and 13 (one box, three lamps) and springs each blow: a bolt runs down the wires to the box, the box bursts, and the wires stay dark. **browser**.

**FX3 folded in** (Josh: "Fold it in (Recommended)"). FX3's criteria 1 to 5 ride in this PR, with FX-Q4's targets-only reading in criterion 1 and the bursts' "a post lamp at its glow" struck (section W). That adds 2 cases. Criterion 6's budget is the whole section's: 2.0 ms.

**Count.** 3 added: 1 for FX4 (criteria 1, 2 and 4 in one case) and FX3's 2.

**Files.** `src/render3d/fx.ts` and `fx.test.ts`; `src/render3d/cityview.ts` (`notify` and the frame loop's FX calls only).
- **Order.** It shares `cityview.ts` with W4 (building), so it branches after W4 merges. V1 and V3 also touch `cityview.ts`, in other parts (the live layer and `paintOverlay`). FX4 may be built beside V1, and whichever merges second merges `main` in.
- **Must not:** `overlay.ts`, `windows.ts`, `src/grid/`, `src/core/` (`BLOW_TIMING` is read, not changed), `src/audio/`, `src/ui/`, `src/main.ts` (it already calls `notify`).

**Interfaces.** None new: `fuse:blown` and `BLOW_TIMING` exist. No new dependency. No pipeline-designer pre-check: this is drawing.

**Amended 25 Nov 2026: the bolt slowed to about 1.5 s (FX4 held).** Josh played FX4 (PR #81) and said: "Spark looks good. The electrical current back to the breaker isn't obvious enough." The renderer then made the bolt brighter and thicker, with a head and an 8 m trail seen through buildings. Its run still takes 0.7 s, because `BLOW_TIMING` ties it to the sound's pop. On cards: "Slow it down"; "Hold FX4" (FX4 merges only with the slower bolt); bolt time "About 1.5 s (Recommended)".
- **The clock (lead-architect, `src/core/timing.ts`).** `BLOW_TIMING` becomes `run` 1.1, `glow` 0.4, `popAt` 1.5 (still `run + glow`). `sparkAt` 0.5, `spark` 0.3 and `pop` 0.6 are unchanged.
  - The bolt's head reaches the fuse at `popAt`, and the burst and the sound's pop land there with it, because both already read `popAt`.
  - The doc comment records Josh's words. `src/core/audio.test.ts`'s "holds the 016 numbers" case is rewritten to the new values, and the `popAt === run + glow` case stands.
  - It is a number of the core contract (ticket 019) and Josh picked it on a card, so no pre-check is needed.
  - The retired 2D map's shock (`src/render/shock.ts`) reads the same clock and slows with it. That is accepted: X1 deletes it, and its timing case reads `BLOW_TIMING`, so it passes unedited.
  - The architect's edit was blocked on the FX4 worktree on 25 Nov 2026. The main session runs the lead-architect there first, or applies these exact values itself.
- **The sound (sound agent, `src/audio/`).** The cues already read `BLOW_TIMING`, so the run's crackle (`recipes.ts`, `glideTime` and `duration` = `run`), the glow and the pop's duck (`mixer.ts`) stretch on their own.
  - The sound agent listens: a 1.1 s crackle under the bolt, rising to the pop. It keeps restraint, and the 432 Hz rule holds for any pitched change.
  - It may retune the run recipe's gain or filter so 1.1 s doesn't drone.
  - It rewrites `src/audio/cues.test.ts`'s literal-clock case ("0, 0.4, 0.5, 0.7" becomes "0, 1.1, 0.5, 1.5", with durations 1.1 and 0.4).
  - **Files:** `src/audio/` only.
- **The picture (renderer, `fx.ts`, `cityview.ts`).** `blowBolts`, `blowBurstAt` and the flash already read `popAt` and `pop`.
  - The renderer checks that the head moves at a steady pace over the longer run, that the 8 m trail still reads, and that the served wires stay dark under it.
  - It changes `fx=all`'s blow cadence from every 2 s to every 3 s, because one blow now lasts 2.1 s.
  - It re-measures FX4 criterion 6's budget in `fx=all`: a longer bolt overlaps more with the rest.
  - `fx.test.ts`'s bolt case reads `BLOW_TIMING` and should pass unedited. If it pins a literal, it is rewritten.
- **One branch, in order:** `ticket/081fx4-fuse-blow` carries all three, one agent after the other: the lead-architect (`src/core/`), then the sound agent (`src/audio/`), then the renderer (`src/render3d/`). Each touches only its own folder.
- **Count.** FX4's 3 added, plus 2 rewritten (the core values case, the audio literal-clock case), and 1 more only if `fx.test.ts` pins a literal: at most 6 for PR #81.
- Josh plays 11 and 13 again: the bolt runs visibly down the wires to the fuse in about 1.5 s, and the burst and the pop land together (FX4 criteria 7 and 8). **browser**.

### X · The 2D map goes: X1a, X1b, X2, R1, X1c (cut 25 Nov 2026; **approved (G1) the same day**)

**Josh's answers, 25 Nov 2026, on cards (relayed by the main session):**
- **G1:** "Approve X (Recommended)". The architect's calls below stand.
- **X-Q1, what the harness replays:** "City puzzles only (Recommended)". R1 criterion 1 is built as written.
- **X-Q2, running the harness on R1's branch:** "Next release (Recommended)". R1 runs only the harness's typecheck; the first city snapshots are taken at the next release Josh calls.
- **X-Q3, the docs naming the 2D map:** "Main session (Recommended)". After X1c merges, the main session drafts the new wording for `CLAUDE.md` and the brief (and the four agent files), and Josh approves it on a card.
**Josh, 25 Nov 2026, in chat:** "Cut X1, X2, R1". Behind it: "I don't want 2D puzzles anymore. I want this game to be full 3D. The 2D puzzles were really just a prototype to see if the puzzles would be functional." (24 Nov 2026). On cards, the same day: "Hide now, delete later (Recommended)" and "Retarget later (Recommended)". The handoff (`docs/handoff-2026-11-24.md`): "Cut X1 and X2 (delete the 2D map and its UI) after P2a and Josh's word. Cut R1 (playtest harness on city puzzles) before the next release." P2a2's pilots, W1 to W4, V1 to V4 and FX4 are on `main` (465885d), so the condition is met.

**What still reaches `src/render/` (read at `origin/main` 465885d).** `src/render/` is 40 files, 357 test cases.
- **`src/render3d/` uses five of its modules:**
  - `glyphs.ts` (the overlay's icons: `drawNodeGlyph`, `drawX`, the colours, `GlyphSpec`);
  - `geometry.ts` (`Insets`, `Rect`, `ZOOM_STEP`);
  - `motion.ts` (`hash01`, `flicker`, `clamp01`);
  - `relight.ts` (`planRelight`, `RelightPlan`, `FLARE_SECONDS`);
  - `city.ts` (`stableHash` in 9 files, `easeGlow`, `glowTarget`, `CityRect`).
- **It also uses the map's interfaces** from `src/render/index.ts`: `MapRenderer`, `MapOverlay`, `MapPanView`, `MapPlaces`, `MapCentre` and `MapBlockers`. `src/render3d/renderer.ts` and `cityview.ts` use them, and so do:
  - `src/play/` (`play.ts`, `pan.ts` and 6 test files, type imports only);
  - `src/main.ts` (those types and `planRelight`);
  - `tests/playtest/` (`replay.ts` draws every frame with the 2D `createMapRenderer` on a fake canvas; `cues.ts` and `fakes.ts`).
- `tools/`, `src/grid/`, `src/night/`, `src/city/` (one comment aside) and `src/audio/` import nothing from it.
- **`src/ui/`'s 2D side:** `collectMaps`, `MapEntry` and `MapCollection` (`maps.ts`); `wants3d`, `NO_CITY_FORM_NOTICE` and `PuzzleKind` (`view3d.ts`). `main.ts` already plays only city puzzles on `createMapRenderer3d`, but its glob still loads every schematic (`../puzzles/**/*.json`, eager).
- **The harness** replays the 64 schematics against 64 snapshots in `tests/playtest/__snapshots__/`. `playtests/` holds past release reports.

**The architect's calls (Proposed; Josh may overturn them at G1).**
- **The map's interfaces move to `src/render3d/maprender.ts`, not to `src/core/`.** `MapRenderer.draw` takes `GridState`, which lives in `src/grid/`, and `src/core/` can't import `src/grid/` (`src/grid/` imports it). The file is types only, with no three, so `src/play/` can import it as it imports `src/render/` today.
- **`stableHash`** comes from `src/city/pipeline/hash.ts`, which is already a copy pinned equal to `src/render/city.ts`'s (`hash.test.ts`, and `escapes.test.ts` pins it too), so no hash changes and no digest moves. The other small pieces (`easeGlow`, `glowTarget`, `CityRect`, `motion.ts`'s three) move into `src/render3d/` unchanged.
- **The build loads only the city puzzles.** `main.ts`'s glob becomes `../puzzles/city/*.city.json`. The schematics stay on disk as the fit's source (`npm run fit`, `npm run analyze`) and are not edited.
- **The harness never draws.** The city view can't be drawn headless (Josh, 24 Nov 2026: no headless browsers), so R1 replays the grid and the play layer with the no-op renderer. That is what the snapshots record anyway.

**What must keep working, in every section:**
- every city puzzle plays on `npm run dev`;
- `npm run fit`, `check` and `analyze` run on the schematics and the city files;
- `src/grid/` and `src/night/` are untouched and pure;
- the schematic panels in `puzzles/` are not edited (P2b to P2d fit from them);
- `puzzles/locked/` is never touched;
- `npm run typecheck` passes at every step.

**No Decided rule is touched, and no rules-coverage row moves:** no row of `tickets/rules-coverage.md` points at a `src/render/` test (checked). No pipeline-designer pre-check: nothing here is a rule or a number.

**Order.** The renderer's two sections, X1a and X1c, both edit `src/render/`.
| Wave | Sections | Shared files | Why |
| --- | --- | --- | --- |
| 1 | X1a | `src/render/`, `src/render3d/` | It gives the other three somewhere to import from. `src/render/index.ts` re-exports the moved names, so nothing else breaks yet. |
| 2, at once | X1b, X2, R1 | none: `src/play/`; `src/ui/` and `src/main.ts`; `tests/playtest/` | Each re-points its own imports off `src/render/`. |
| 3 | X1c | `src/render/` | It deletes the folder once nothing imports it. |
| 4 | The docs, on Josh's word (X-Q3) | `CLAUDE.md`, `docs/prototype-brief.md`, `.claude/agents/` | Josh's and the main session's files, not an agent's. |

#### X1a · The city view's pieces move out of the 2D map (renderer). Branch `ticket/081x1a-move-kept`, after G1
**Goal.** Everything the city view and the play layer still use from `src/render/` lives in `src/render3d/`, unchanged in value, so `src/render/` can go.

**Acceptance criteria.**
1. [ ] **The moves.**
   - New `src/render3d/maprender.ts` holds the six map interfaces and `Insets`, `Pan`, `Rect` and `ZOOM_STEP`.
   - `glyphs.ts` moves to `src/render3d/glyphs.ts` with `glyphs.test.ts` (`git mv`; its 2 cases unedited, so they are moved, not added).
   - `planRelight`, `RelightPlan`, `FLARE_SECONDS`, `RELIGHT_TRAVEL_SECONDS`, `RELIGHT_LEAD_SECONDS`, `easeGlow`, `glowTarget` and `motion.ts`'s `hash01`, `flicker`, `clamp01` (and `pulsePhase` if needed) move to `src/render3d/relightplan.ts` and `src/render3d/motion.ts`.
   - `CityRect` moves to `tilecity3d.ts`.
   - The builder adds any other name its typecheck asks for, and lists every name in its reply.

   **no test** (moved code; the typecheck holds it).
2. [ ] **`src/render3d/` imports nothing from `src/render/`.** `stableHash` comes from `src/city/pipeline/hash.ts`. **test**: 1 case: no file in `src/render3d/` (tests included) has an import from `../render/` or `../render"`. The existing `stableHash` pins (`hash.test.ts`, `escapes.test.ts`, `stylepin.test.ts`) pass, at most 2 rewritten to import from `src/city/`.
3. [ ] **`src/render/` still builds** and re-exports the moved names from `src/render3d/` (`index.ts`), and its own modules import them from there. So `src/play/`, `main.ts` and the harness compile unchanged. **no test** (the typecheck).
4. [ ] No digest pin and no city test moves: the moves are values unchanged. CI's `test` check is the gate. **no test**.

**Count.** 1 added, at most 2 rewritten. Moved cases are not counted, since their bodies are unedited; the builder says so in the PR.

**Files.** `src/render3d/` (new `maprender.ts`, `relightplan.ts`, `motion.ts`, the moved `glyphs.ts` and its test, and import lines everywhere); `src/render/` (the moved files leave; `index.ts` and the 2D modules re-point their imports). **Must not:** `src/play/`, `src/ui/`, `src/main.ts`, `tests/playtest/`, `src/city/` (it is read only, for `stableHash`), `src/core/`, `src/grid/`.

#### X1b · The play layer imports the map's interfaces from the city view (interaction). Branch `ticket/081x1b-play-imports`, after X1a merges
**Goal.** `src/play/` no longer imports `src/render/`.

**Acceptance criteria.**
1. [ ] `play.ts`, `pan.ts` and the 6 test files (`battery`, `click-event`, `elapsed`, `lastentry`, `pan`, `play`) import their types from `../render3d/maprender`. These are import lines only, and no case is edited. `src/play/` imports no value from `src/render3d/` (types only, so it never loads three). **no test** (the typecheck; existing cases unedited).

**Count.** 0.

**Files.** `src/play/` (import lines only). **Must not:** any other folder.

#### X2 · The 2D side of the page goes (ui). Branch `ticket/081x2-ui-2d-out`, after X1a merges
**Goal.** `src/ui/` and `src/main.ts` hold nothing for the 2D map, import nothing from `src/render/`, and the build loads only the city puzzles.

**Acceptance criteria.**
1. [ ] **Removed:** `collectMaps`, `MapEntry`, `MapCollection` and their five cases (`maps.test.ts`); `wants3d`, `NO_CITY_FORM_NOTICE`, `PuzzleKind` and their two cases (`view3d.test.ts`); and any branch of `main.ts` that only a schematic puzzle reaches. `collectCityMaps`, `pageView` and the U1 picker stay. **test**: about 7 removed, 0 added.
2. [ ] **`main.ts`'s imports:** its types come from `./render3d/maprender` and `planRelight` from `./render3d/relightplan`. No file in `src/ui/` or `src/main.ts` imports `src/render/`. **no test** (X1c's case covers the whole of `src/`).
3. [ ] **The build's glob** is `../puzzles/city/*.city.json`. The picker lists the same city puzzles as before. **test**: U1's existing picker case passes, unedited, or 1 rewritten if it reads the glob's keys.
4. [ ] `assetgallery.test.ts`'s word list loses `createMapRenderer` if it asserts that name exists. **test**: at most 1 rewritten.
5. [ ] Josh opens `npm run dev`: the picker and every city puzzle play as before. **browser**.

**Count.** 0 added, at most 2 rewritten, about 7 removed.

**Files.** `src/ui/`, `src/main.ts`. **Must not:** `src/render/`, `src/render3d/`, `src/play/`, `puzzles/`.

#### R1 · The release playtest harness replays the city puzzles (playtester). Branch `ticket/081r1-harness-city`, after X1a merges
**Goal.** At the next release Josh calls, `npm run playtest` replays the city puzzles to the Relight, through the conversion, and compares each trace with its snapshot. It never imports `src/render/`.

**Acceptance criteria.**
1. [ ] **What it replays** (X-Q1; written to the recommended "City puzzles only"): every `puzzles/city/*.city.json` (P0 and the 16 pilots today, and P2b to P2d as they land).
   - Each goes through `loadCityPuzzle`, then `convertCityPuzzle` on its own city (6 x 6 seed 1, through the module cache), then `createGrid`, then `createMapPlay`, with the no-op renderer (its type from `src/render3d/maprender.ts`).
   - The script is the city note's check block: its solution, then each trap with its recovery. There is no second script file, so `solutions.ts` goes.
   - **test**: the harness's own cases, rewritten (at most 8); not in `npm test`.
2. [ ] **What a trace holds:** as today (each move, lit file lamps, readable faults, feeds' loads, blown fuses, the win), with hidden ids (S1) left out, so scenery does not churn the trace. **test**: in criterion 1's cases.
3. [ ] **No drawing.** `replay.ts` no longer calls `createMapRenderer`. The fake canvas goes. `cues.ts` takes `planRelight` from `src/render3d/relightplan.ts`. **no test**.
4. [ ] **The old snapshots.** The 64 schematic traces in `__snapshots__/` are deleted, and the README says so and why (Josh: "I don't want 2D puzzles anymore"). **No new snapshot is written on this branch.** The playtester takes them at the next release, under the release loop. `playtests/` is not edited: its reports are history. **no test**.
5. [ ] **Not run on this branch** (Josh, 23 Nov 2026: "Regression testing should only be performed on full releases"; X-Q2 is written to the recommended answer). The builder runs only `tsc --noEmit -p tests/playtest/tsconfig.json` and says so. If Josh answers X-Q2 "Run it once on R1", it runs `npm run playtest` once, reports, and writes the first city snapshots. **no test**.

**Count.** At most 8 rewritten, in `tests/playtest/`. It counts against R1's PR cap like any case.

**Files.** `tests/playtest/` only. **Must not:** `src/`, `puzzles/`, `tools/`, `playtests/`. The hook keeps the playtester off `src/`. If the harness needs an export `src/` lacks, the playtester stops and the architect cuts it to the owner.

#### X1c · Delete the 2D map (renderer). Branch `ticket/081x1c-delete-2d`, after X1b, X2 and R1 merge
**Goal.** `src/render/` is gone, with its 357 test cases.

**Acceptance criteria.**
1. [ ] **Deleted:** every file in `src/render/`. Also `relight3d.test.ts`'s case that reads `src/render/map-renderer.ts`'s source to check for drift (removed, as there is no second copy left), and `styleguide.test.ts`'s `../render/city` import (at most 1 case rewritten, or removed if it only compared the 2D town). The builder lists every removed file and case. **test**: about 358 removed.
2. [ ] **Nothing imports `src/render/`.** X1a's case is widened to every file under `src/` and `tests/playtest/`. **test**: 1 rewritten.
3. [ ] The 2D-only dev routes and switches in `src/render3d/renderer.ts` (`renderRoute`, if a branch of it only fed the 2D map) go, and the builder lists each. The city routes (`city=tiles`, `stage=`, the plan view, the tile sheet) stay. **no test** (existing route cases pass, or are removed with the branch they held, listed).
4. [ ] `npm run typecheck`, `npm run fit`, `check` and `analyze` run. Josh plays a city puzzle. **browser**.

**Count.** 0 added, at most 2 rewritten, about 358 removed.

**Files.** `src/render/` (deleted); `src/render3d/` (the drift case, the style guide import, the routes). **Must not:** any other folder. Comments elsewhere that name `src/render/` are listed in the reply for the docs step and their owners, and are not edited. These are `src/core/timing.ts`, `src/core/words.ts`, `src/city/pipeline/hash.ts`, `src/render3d/escapes.ts` (the renderer's own, so it may fix it) and `src/ui/relightcues.ts`.

#### The docs (the main session, on Josh's word; not an agent's)
`CLAUDE.md` (the stack line's "Canvas 2D", the hard rules naming folders), `docs/prototype-brief.md` (the folders table's `src/render/` row, "What the player sees"' first-prototype paragraph, the stack's "the old 2D map until ticket 081's X1 removes it") and `.claude/agents/renderer.md`, `interaction.md`, `grid-simulator.md` and `sound.md` still name `src/render/`. After X1c merges, the main session drafts the new wording and Josh approves it on a card (X-Q3: "Main session (Recommended)"). The architect fixes the `src/core/` comments at the same time.

### SK · The night sky and the moon (renderer). Branch `ticket/081sk-night-sky`. Cut 25 Nov 2026, one PR; re-cut the same day for the title screen (section T); **approved (G1) 25 Nov 2026**
**Josh, 25 Nov 2026, in chat:** "we need a sky box, it should just be a night sky, and put a moon in the sky as a light source". Then, in answer to the first SK cards: "After we create the sky box I want to create a title screen." (the whole message is under section T).

**Josh's answers, 25 Nov 2026, on a card (relayed by the main session):**
- **G1:** "Approve".
- **SK-Q1:** "Title screen (Recommended)". In play only the moonlight shows; the sky, the moon and the stars show on the Uronacid splash and the title screen (section T). The look-up at each puzzle's start, its files and its test are dropped.
- **SK-Q2:** "Ahead, low (Recommended)". The moon stands north, low over the city (`azimuth_deg` 0, `elevation_deg` 18 to start).
- **SK-Q3:** "No shadows (Recommended)". Shadows stay off.
- **SK-Q4** (the dev Day / Night key), asked with T-Q7 on one card; Josh answered in his own words: "day is not an option in the final game, day should only be used for development purposes." So the night sky shows only at night, and day stays the dev-only key it is (criterion 4, as built).

**What the scene has today (read at `main` bf6940d).**
- **The light rig** (`lightrig.ts`, ticket 060) is the one owner of the scene's background, fog, global lights and tone mapping. It reads `LIGHT_MODES` (`lighting.ts`, pure). The city view (`cityview.ts`) and the plan view (`plan3d.ts`) both ask it for a mode.
- **Night** (the game's only mode in a production build): a flat background `0x0b0f17`, no fog, an ambient light `0x4a5a7a` at 1.1, and **a moon light already**: one `DirectionalLight` tagged `moon`, `0x8fa6d0` at 0.7, from `[-6, 12, 4]` (high, from the west-south-west). There is no moon in the sky and no stars. No tone mapping; shadows off.
- **Day** (dev only, `light=day` or the "Day / Night" button and the L key, `daytoggle.ts`): a flat sky blue `0xa9c7e6`, a sun and a hemisphere light, ACES, and the night-only parts (lamp lights, glows, pools) hidden.
- **The lit buildings' glow** (L1, W2, W3) is emissive windows through the instance attribute (F1b), glow cards, and real street lights (cap 32, made at build). The gold target is the same path in gold. **FX4's** white point lights are made at build too. None of them is lit by the moon: emissive and point lights add on top of it. So what the moon can wash out is the **contrast**: the brighter the unlit walls and roofs, the less a lit building stands out.
- **The play camera never sees the sky.** It looks 45 degrees down (`ELEVATION`) with a 40 degree vertical view (`FOV_DEG`), so the top of the screen is 25 degrees below the horizon. It has no tilt or orbit (Josh, W-Q4: "One fixed view"). What shows past the city's edge, at the top of a zoomed-out view, is the flat background. **So in play the player sees the moonlight, not the sky.** Josh's title screen is where the sky is seen (section T): the splash and the title look up at it (SK-Q1, "Title screen (Recommended)"). The look-up at each puzzle's start, first cut here, is dropped.
- `LIGHT_MODES`' numbers are drift-checked: `styleguide.test.ts` wants a row in `docs/city-style/numbers.md` for every number `lighting.ts` exports, and pins the moon line by its source text. Every tuning round on the moon there would mean a doc row and two test pins.

**The architect's calls (approved with G1).**
- **A sky drawn in code, not a pack skybox.** Josh asked for "just a night sky". The packs hold no night sky: `sci-fi-city-pack`'s `SkyDome.fbx` comes with `SimpleSky.png`, a blue day gradient; `nature-pack`'s `MountainSkybox` is a ring of snowy mountains on a grey sky; `city-pack`'s `SM_Env_Skyline_*` are building silhouettes, not sky. Each would also need the pack-intended-use check (`docs/design/073-pack-intended-use.md`), a model key in `gamemodels.ts` and `npm run assets:game`, and, by the Synty licence decision (16 Nov 2026), could ship only in a password-gated build. A sky drawn in code is a gradient dome, generated star points and a moon disc, has no file and no new dependency, and every number Josh tunes is in one block.
- **The moon is the night's existing moon light, moved, not a light added.** The `moon` `DirectionalLight` stays the one directional light at night. It takes its direction from the moon disc and its colour and strength from the block. No light is added, so the lights' count (and every lit material's program) is unchanged.
- **The tunable numbers leave `LIGHT_MODES` for a new `NIGHT_SKY` block** (`src/render3d/nightsky.ts`, pure: no three, no DOM), outside the drift check, because Josh tunes them by playing (W2 took 6 rounds, FX4 9). `LIGHT_MODES.night` keeps its background, ambient, surfaces and switches. It holds no moon numbers; it says night has the sky and the moon (for example `sky: true`), and the rig reads the numbers from `NIGHT_SKY`. The ambient stays pinned where it is: it is not part of the sky, and the fill cap below reads it.
- **The sky is one reusable piece.** Section T's title view gets the same sky, moon, stars and moonlight from the same rig and the same block; it adds nothing of its own to the sky but a turn (criterion 5).
- **In play the sky stands still.** No moon path and no star twinkle by the clock: the brief's scope has "No night clock", and a moving moon would read as one. Only the splash and the title turn the sky (`drift`), and they are not play.

**`NIGHT_SKY`, the one block Josh tunes (starting values; the builder adjusts them round by round on his word, and each round is one edit to this block):**
| Part | Numbers (starting values) |
| --- | --- |
| `sky` | `zenith` `0x03050b`, `horizon` `0x101828`, `band_deg` 12 (the horizon's glow, in degrees above it), `below` `0x0b0f17` (today's background, under the horizon) |
| `stars` | `count` 1200, `seed` 1, `minElevation_deg` 8, `size_px` 1.5, `brightness` [0.35, 1], `colour` `0xdfe6ff` |
| `moon` | `azimuth_deg` 0 (north: ahead of the play camera, which looks to -z), `elevation_deg` 18, `disc_deg` 4, `disc` `0xe8ecf2`, `halo_deg` 14, `halo` 0.25, `light` `0x8fa6d0`, `intensity` 0.7 (today's colour and strength) |
| `drift_deg_s` | 1.5 (how fast the splash and the title turn the stars and the moon about the vertical; 0 in play) |

**No Decided rule is touched.** The sky and the moon are drawing: they read no grid state and change none. "Faults hide faults" holds: light reveals no fault, and the overlay is unchanged. "The Relight can't be interrupted" is not reached: nothing here acts in play. The brief's "No night clock" holds (in play the moon stands still). No `tickets/rules-coverage.md` row moves. No pipeline-designer pre-check: no grammar rule or city number changes.

**Goal.** At night the city sits under a dark sky with stars and a moon, and the moon is where the cool light on the roofs and walls comes from. The lit buildings and the gold target read at least as clearly as before. The sky is built so section T's splash and title can show it and turn it.

**Acceptance criteria.**
1. [ ] **The sky.** At night the rig adds one sky object, tagged `userData.lightRig = "sky"`, built from `NIGHT_SKY`:
   - a dome round the camera (drawn from inside, inside the far plane, following the camera's position each frame, for example through its own `onBeforeRender`), with a gradient from `horizon` to `zenith` above the horizon and `below` under it, so the play view past the city's edge looks as it does today;
   - `stars.count` stars in one points object, all above `minElevation_deg`, their places from `seed` (the same on every build);
   - the moon: a disc of `disc_deg` with a soft halo, centred on the moon's direction (`azimuth_deg`, `elevation_deg`);
   - no fog, no depth write, drawn behind everything.

   The scene's `background` stays night's colour (the dome covers it), so the existing background cases hold. **test**: 1 case, on a bare scene: the sky object is there once, with the star count, every star above the minimum, the same places on a second build, and the disc's centre on the moon's direction.
2. [ ] **The moonlight comes from the moon.** The rig's `moon` light takes `NIGHT_SKY.moon`'s `light` and `intensity`, and its position is the moon's direction times `SUN_DISTANCE`, so the light and the disc agree. No light is added: night's lights stay `["ambient", "moon"]`. Shadows stay off (SK-Q3, "No shadows (Recommended)"). **test**: folded into criterion 1's case (the light's direction equals the disc's).
3. [ ] **The moon can't wash out the glow (the fill cap).** A pure `nightFill(normal)` in `nightsky.ts` gives the light an unlit face gets at night: the ambient's colour luminance times its intensity, plus the moon's colour luminance times `intensity` times `max(0, normal · moon direction)`. For the camera-facing wall (+z) and the roof (+y), it is no more than today's (the ambient as pinned, and today's moon, `0x8fa6d0` at 0.7 from `[-6, 12, 4]`, typed into the test as the reference). A tuning round that would break it stops; the main session asks Josh on a card whether the cap moves. **test**: 1 case.
4. [ ] **Day and night** (SK-Q4, Josh: "day is not an option in the final game, day should only be used for development purposes."). Day removes the sky and the moon light, as it removes the moon today; night brings back one sky and one moon. Two calls with the same mode change nothing. The plan view (`city=tiles`) gets the sky at night through the same rig, with no change of its own. **test**: 1 case in `lightrig.test.ts`.
5. [ ] **The turn, for section T.** `setSkyTurn(scene, degrees)` (exported from `lightrig.ts` or the sky's module) turns the stars, the moon disc and the moon light together about the vertical, so the light still comes from the disc. The city view never calls it, so in play the turn is 0. **test**: folded into criterion 1's case (after a turn of 90 degrees, the disc and the light still agree, and the stars have turned with them).
6. [ ] **`cam=sky`** (dev only, the city view) poses the camera at the play camera's place, pitched up to show the sky and the moon, so Josh and the builder can tune the sky before section T exists. **no test** (a dev switch, as `cam=free`).
7. [ ] **The drift check lets go of the moon.** `docs/city-style/numbers.md` loses the five `LIGHT_MODES.night.moon` rows and the "moon light" source-text row. `light-and-accessibility.md` and `testing-daylight.md` say the sky and the moon are in `NIGHT_SKY` (`nightsky.ts`), tuned by eye (section SK), not pinned. **test**: rewritten, at most 4, each listed by the builder. Candidates: `lighting.test.ts`'s "night is today's ..." (the moon literals go; it checks night names the sky); `lightrig.test.ts`'s "night leaves exactly one ambient and one moon ..." (the moon's values read `NIGHT_SKY`); `styleguide.test.ts`'s "pins the scene's inline colours and light by their source text" (3 rows become 2); `daytoggle.test.ts` only if it reads the moon's numbers.
8. [ ] **The cost.** Measured with `perf=1` at the pane emulated to 1287 x 1178, `city-two-ways-round`, before power, `main` and the branch in the same session, two loads each, alternating (as L3's rows in `docs/design/081-F-measurements.md`):
   - at most 3 draw calls and 3 programs added, all at build, so no new program appears in play;
   - the branch's CPU median at most 1.0 ms over `main`'s (the run-to-run noise is about 1 to 2 ms, so the mean of the two loads is compared), and the whole frame still at most 16.7 ms.

   Over it, the builder stops ("stop 081 SK", with the branch and the rows); it does not thin the stars or shrink the dome to pass, because they are Josh's numbers. The rows go into `081-F-measurements.md`. **browser**.
9. [ ] **The contrast holds.** The main session takes two pane screenshots after the Relight of `city-two-ways-round`, default view, `main` and the branch. It reads the luminance at three spots: the gold target's lit windows, a lit scenery building's wall and an unlit building's camera-facing wall. On the branch, lit over unlit is at least `main`'s for both lit spots. If it is lower, that round's moon numbers go back. **browser**.
10. [ ] Josh plays `city-two-ways-round` and one pilot, and opens `cam=sky`: he sees the night sky and the moon, the moonlight reads as coming from the moon, and the lit buildings and the gold target read as clearly as before. Looks are tuned round by round in `NIGHT_SKY` until he says they are right. **browser**.

**Count.** 3 added (criteria 1, 2 and 5 in one; 3; 4) and at most 4 rewritten: at most 7.

**Files.** New `src/render3d/nightsky.ts` and `nightsky.test.ts`; the three side of the sky in `lightrig.ts` or a new `src/render3d/skydome.ts`; `lightrig.ts` and `lightrig.test.ts`; `lighting.ts` (night's moon numbers out, the sky flag in) and `lighting.test.ts`; `styleguide.test.ts` (the one source-text case); `docs/city-style/numbers.md`, `light-and-accessibility.md` and `testing-daylight.md` (the moon lines only); `cityview.ts` and `tilecity3d.ts` (`cam=sky` only). **Must not:** `windows.ts`, `fx.ts`, `circuitdraw.ts`, `plan3d.ts` (it already asks the rig), `daytoggle.ts`, `gamemodels.ts`, `src/core/`, `src/play/`, `src/ui/`, `tools/`, `assets/`.
- **Order.** First: section T's backdrop (T1) builds on it. It shares no file with an open section. P2b to P2d (puzzle files) and T2 run beside it.
- **Interfaces.** None in `src/core/`. No new dependency.

Nothing in SK is open.

### T · The splash, the title screen and the stage select (renderer, then ui). Cut 25 Nov 2026 for G1, in three PRs: T1 (renderer, after SK merges) and T2 (ui, pure, after G1) side by side; then T3 (ui); **approved (G1) 25 Nov 2026**
**Josh's answers, 25 Nov 2026, on cards (relayed by the main session):**
- **G1:** "Approve".
- **T-Q1:** "Rest: Circuits (Recommended)". The title reads "Rest: Circuits" (T3 criterion 2).
- **T-Q2:** "Goodbye line (Recommended)". Exit shows a goodbye line over the sky; any key or click goes back to the title (T3 criterion 3).
- **T-Q3:** "Best (Recommended)". The select shows the fewest moves and the fastest time, each its own best (T2 criterion 1).
- **T-Q4:** "Browser + Clear button (Recommended)". Progress is kept in this browser's `localStorage`, with a Clear progress button on the stage select (T2 criterion 2, T3 criterion 4).
- **T-Q5:** "Every load (Recommended)". The splash and the title play on every load; a key or click skips the splash; dev addresses skip both (T3 criteria 1 and 6).
- **T-Q6:** "Stage 01's, gold (Recommended)". The title's building is stage 01's target building, lit gold (T1 criterion 3).
- **T-Q7** (replaying a stage), asked first with SK-Q4 (he answered SK-Q4 only), then again on its own card: "Replay any (Recommended)". Any listed stage can be played again; only a better run changes its best (T3 criterion 4).
- **T1 is built** (PR #94, review pending). Josh, on a card, of the title's look: "Fine for now (Recommended)". The look (`TITLE_VIEW`, `NIGHT_SKY`) is tuned once T3 puts the words on.

**Josh, 25 Nov 2026, in chat** (in answer to the SK cards):
> "After we create the sky box I want to create a title screen.
>
> The game should load with "Uronacid" in white text across a scrolling night sky. It should. Fade out to the title screen
>
> The game title screen should say the title of the game, "Rest : Circuts" in large text in top left corner.
>
> "start" and "exit" in the bottom left corner. It should be selectable with arrow keys or a mouse. The text should be white against a night sky with the moon in the sky and a lit building from the game map on the right side of the screen.
>
> Clicking "start" should bring you to the stage select menu. For now it should be a simple dropdown box that displays all stages completed and the next stage to complete. It should display stage number, stage name, total moves and time to complete within the dropdown."

**What exists today (read at `main` bf6940d).**
- **The page** (`src/main.ts`, ui's) loads the city puzzles (`collectCityMaps`, `src/ui/maps.ts`), imports `src/render3d` once, then opens `?puzzle=<id>` or the first entry straight away. There is no screen before play. A production build shows one line ("This prototype plays in `npm run dev`"), so every screen here is dev-build only, as play is (open question 8).
- **The stages.** `puzzles/city/` holds the 16 pilots, `01-first-light` ("01 · First light") to `16-behind-the-first`, all on the 6 x 6 seed 1 city, and `city-two-ways-round` (P0, "City · Two ways round"), the test map. `collectCityMaps` lists them in path order, open before locked. The HUD's "Map" `<select>` (`src/ui/index.ts`) lists them all. P2b to P2d will add 17 to 64.
- **Moves and time already exist, and already reach the page at the win.** `GridState.actions` (`src/grid/`) counts accepted throws and repairs; an undo takes one back (it restores the state before) and a reset sets it to 0. `MapPlay.view().elapsed` (`src/play/`) is play time from the map's opening or last reset, stopped when the job completes. The win splash (ticket 020 B) already shows both: "Lit in 0:42.3 · 7 moves" (`winLine`, `src/ui/logic.ts`), after the Relight. So **no `src/play/` or `src/grid/` change is needed**, and interaction has no section.
- **"Completed"** is the job completing: every target lit with nothing browned out (`GridState.complete`, `job:completed`), which starts the Relight.
- **No saved progress.** The only `localStorage` use is the sound settings (`rest.audio`, through `src/ui/index.ts`'s guarded store and `logic.ts`'s parser, which reads junk as defaults). T2 follows that pattern under its own key.
- **The sky** comes from SK (approved): `NIGHT_SKY`, the rig's sky and moon (north, low: SK-Q2), and `setSkyTurn` for the scroll.

**The architect's calls (approved with G1).**
- **The screens are DOM over one 3D backdrop.** The words ("Uronacid", the title, "start", "exit", the dropdown) are DOM in `#ui`, ui's, white. The night sky, the moon and the lit building behind them are one renderer view, `createTitleView` (T1), on the same canvas the game uses, disposed when a puzzle opens.
- **The backdrop shows the game's own city, only round the building.** All the stages are on the 6 x 6 seed 1 city. The title view builds that city's plan (cached, as `loadCityView` does) but draws only the lit building's block and the blocks next to it (a 3 x 3 window of blocks), with no circuit, no overlay and no particles. Past them is the sky's `below`. That keeps the backdrop far cheaper than a low view across the whole city, which F measured at 48 ms before F1.
- **The splash covers the loading.** The splash needs only the sky (no models), so it shows at once while the city's models load. It fades to the title when its time is up and the backdrop's models are in, whichever is later.
- **The stages are the numbered city puzzles, in file order.** Stage number is the number the id starts with (01 to 16 now). `city-two-ways-round` has none, so it is not a stage: it stays in the HUD's Map menu (dev) and on `?puzzle=`.
- **Progress lives in the page, not the game.** A win is recorded in this browser's `localStorage` (T-Q4) when the job completes, so leaving during the Relight loses nothing. The record is by puzzle id. `src/grid/` and `src/night/` are untouched and stay pure; `src/play/` is untouched.
- **The dev routes go straight to play.** `?puzzle=<id>`, any `city=` route, `assets=`, and the HUD's Map menu skip the splash, the title and the select, as today. So tuning, `perf=1` measuring and the release harness (which drives the grid and play, not the page) are unaffected.

**No Decided rule is touched.** The screens come before play and after it; they read no grid state but the win's moves and time, which already exist. "The Relight can't be interrupted" holds: a win is recorded when the job completes, and nothing here acts during the Relight (the win splash and its Next are unchanged). The brief's Draft "No night clock" is a play rule; the splash's turning sky is not play. Nothing in the brief's rules covers progression, death or the night, so no rule is near. No `tickets/rules-coverage.md` row moves. No pipeline-designer pre-check.

**Order.**
| PR | Section | Owner | After | Shares | Tests |
| --- | --- | --- | --- | --- | --- |
| 1 | SK | renderer | G1 (in) | | at most 7 |
| 2 | T1, the backdrop | renderer | SK merges | `cityview.ts`, `lightrig.ts` (read) | 2 |
| 2, beside T1 | T2, progress and the stage list, pure | ui | G1 | none | at most 5 |
| 3 | T3, the screens | ui | T1 and T2 merge | `src/main.ts`, `src/ui/index.ts`, `index.html` | at most 3 |

#### T1 · The title backdrop: the night sky, the moon and one lit building (renderer). Branch `ticket/081t1-title-backdrop`, after SK merges
**Goal.** The page can show, behind its own words, a turning night sky alone (the splash) or the sky with the moon over the city and a lit building on the right of the screen (the title).

**Acceptance criteria.**
1. [ ] **The view.** `createTitleView(canvas, city, opts)` in `src/render3d/` (exported from `index.ts`), with `setMode("splash" | "title")`, `draw(timeSeconds)`, `ready()` (true once the backdrop's models are in), `resize()` and `dispose()`. Its types live in `src/render3d/titleview.ts`, types only, as `maprender.ts` does, so `src/ui/` and `main.ts` code against them. It uses the rig at night, so the sky, moon and moonlight are SK's.
2. [ ] **The splash.** The camera looks up at the sky alone: no ground, no building in view. `draw` turns the sky by `NIGHT_SKY.drift_deg_s` times the time (`setSkyTurn`), which is the scroll. It draws before any model is loaded.
3. [ ] **The title.** The camera stands low in the street, looking north at the moon above the skyline. The lit building (T-Q6, "Stage 01's, gold (Recommended)": stage 01's target building, lit gold) stands on the right of the screen: its centre in the right third, the moon in the upper half, and the left half kept clear for the words (the title top left, "start" and "exit" bottom left). The building lights through W2 and W3's path (`setBuildingGlow`, gold), its street lights included. Only its 3 x 3 window of blocks is drawn. The sky turns slowly, as on the splash. Splash to title eases the camera down over `TITLE_SETTLE_S` (1.5 s, in a `TITLE_VIEW` block with the pose's numbers, for Josh to tune).

   **test**: 1 case on the pose function, on stage 01's city: in the title pose the building's centre projects into the right third, the moon's direction into the upper half, and no part of the drawn blocks into the left third's top and bottom fifths; in the splash pose nothing below the horizon is in view.
4. [ ] **Only the window is built.** The title view's building and street groups hold only the 3 x 3 blocks round the building. **test**: 1 case on a small fixture plan: pieces outside the window are not in any group.
5. [ ] **The cost.** `perf=1` on the title (a log as the city view's, 300 frames after the backdrop is ready) at the pane emulated to 1287 x 1178: the whole frame at most 16.7 ms, no program compiled after `ready()`. Over it, the builder stops ("stop 081 T1"); the window may shrink to the building's own block only on Josh's word. **browser**.
6. [ ] A dev address, `?title=splash` or `?title=title`, shows the view alone (no ui), for tuning before T3. **browser**.

**Count.** 2 added.

**Files.** New `src/render3d/titleview.ts` (types), `src/render3d/title3d.ts` (the view) and `title3d.test.ts`; `src/render3d/index.ts` (the export); `src/render3d/plan3d.ts` (a block filter on `plan3dGroups`, if the builder needs one, with no change when it is not given); `src/render3d/renderer.ts` (the `title=` dev route only). **Must not:** `cityview.ts` (the play view is unchanged), `lightrig.ts` and `nightsky.ts` (read; a change to the sky is SK's), `src/ui/`, `src/main.ts`, `src/core/`.

#### T2 · Progress and the stage list, pure (ui). Branch `ticket/081t2-stage-progress`, after G1
**Goal.** The page can record a win, keep it in the browser, and say which stages the select lists and what each line reads.

**Acceptance criteria.**
1. [ ] **The record.** `recordWin(progress, id, moves, seconds)` in a new `src/ui/progress.ts` keeps, per puzzle id, the fewest moves and the shortest time, each its own best (T-Q3, "Best (Recommended)"), and the date of the first win. **test**: 1 case: a worse run keeps both bests; a run with fewer moves but a longer time updates only the moves.
2. [ ] **The store.** `loadProgress(storage)` and `saveProgress(storage, progress)` read and write one key, `rest-circuits.progress.v1`, through a `Storage`-shaped argument (the page passes `localStorage`; a test passes a map). Missing, unreadable or wrongly shaped data reads as no progress and is never thrown on. `clearProgress(storage)` empties it, for T3's Clear progress button (T-Q4, "Browser + Clear button (Recommended)"). **test**: 1 case: a round trip, and garbage reads as empty.
3. [ ] **The list.** `stageList(entries, progress)` gives the numbered city puzzles (the id's leading number), in number order: every completed one, then the first one not completed (the next), and no others. With none completed it is stage 01 alone; with all completed there is no next. A stage completed out of order (through `?puzzle=`) is listed, and the next is still the lowest not completed. **test**: 1 case, on a fixture of four entries and P0.
4. [ ] **The line.** Each entry reads `01 · First light · 7 moves · 0:42.3` (`winLine`'s clock form), and the next reads `02 · This way or that · not yet lit`. The number and name come from the puzzle's `name` ("01 · First light"), not written twice. **test**: folded into criterion 3's case.
5. [ ] **The menu keys.** `menuStep(index, count, key)` for the title's two items: up and down move and wrap, Enter chooses. **test**: 1 case.

**Count.** At most 5 (4 cases, 1 spare if a builder splits criterion 2).

**Files.** New `src/ui/progress.ts` and `progress.test.ts`; `src/ui/logic.ts` (`menuStep` and the line, if they sit better there). **Must not:** `src/main.ts`, `src/ui/index.ts` (T3's), and every other folder.

#### T3 · The screens: splash, title, stage select, exit (ui). Branch `ticket/081t3-title-screens`, after T1 and T2 merge
**Goal.** `npm run dev` opens on "Uronacid" over a turning night sky, fades to the title, and from "start" the player picks a stage from a dropdown of the stages lit so far and the next one, and plays it.

**Acceptance criteria.**
1. [ ] **The splash.** With no `puzzle=` or dev route, the page opens on "Uronacid" in white, centred, over T1's splash. After `SPLASH.hold_s` (2.5) and once `ready()`, the word and the sky fade out over `SPLASH.fade_s` (1.0) and the title fades in. This plays on every load (T-Q5, "Every load (Recommended)"). A key or a click skips to the title. **browser**.
2. [ ] **The title.** The game's title, "Rest: Circuits" (T-Q1, "Rest: Circuits (Recommended)"), large at the top left; "start" and "exit" at the bottom left; all white over T1's title view. The arrow keys move the choice and Enter takes it (T2's `menuStep`), the mouse hovers and clicks; the chosen item is marked. The HUD is hidden. **browser**.
3. [ ] **Exit** (T-Q2, "Goodbye line (Recommended)") shows "Rest: Circuits is closed. You can close this tab." over the sky; any key or click goes back to the title. The page does not call `window.close()`, which browsers refuse for a tab the player opened. **browser**.
4. [ ] **The stage select.** "start" shows one dropdown (a `<select>`, keyboard and mouse as the browser gives) with T2's `stageList` lines, the next stage chosen, and a "Play" button. Play (or Enter on the dropdown) disposes the title view and opens that stage as the Map menu does (`open(id)`), with the HUD back. Any listed stage, completed or next, can be played again (T-Q7, "Replay any (Recommended)"); a replay records through T2's `recordWin`, so only a better run changes a stage's best. A small "Clear progress" button, with the browser's confirm, empties it (T-Q4, "Browser + Clear button (Recommended)"). Escape goes back to the title. **browser**.
5. [ ] **The win is recorded** with `recordWin` and saved, on the frame the job completes (the Relight's first frame), with `state.actions` and `view.elapsed`, for numbered stages only. The win splash and its Next are unchanged. **test**: 1 case, if the builder pulls the "record on the first Relight frame" choice into a pure helper in `logic.ts`; otherwise **browser**.
6. [ ] **The dev routes skip it all.** `?puzzle=<id>`, `city=`, `assets=` and `title=` open as today, with no splash, title or select (T-Q5); the HUD's Map menu still switches puzzles in play. **test**: 1 case on a pure `startScreen(search, dev)` ("splash" or "play").
7. [ ] **Back from play** is not in this PR: a stage's win splash keeps its Next; reaching the select again is a reload. (A "Menu" button in the HUD is a later card if Josh wants it.) **no test**.
8. [ ] Josh opens `npm run dev`: the splash, the fade, the title, the keys and the mouse, the select, a stage played and then listed with its moves and time after a reload. **browser**.

**Count.** At most 3 (criteria 5 and 6, and 1 rewritten if `main.ts`'s first-map case reads the old start).

**Files.** `src/main.ts`; `src/ui/` (a new `screens.ts` for the splash, title, exit and select DOM, `index.ts` to hide and show the HUD, `logic.ts`); `index.html` (the screens' styles and the white text only). **Must not:** `src/render3d/`, `src/play/`, `src/grid/`, `src/core/`, `puzzles/`.

**Interfaces.** None in `src/core/`: `TitleView` is in `src/render3d/titleview.ts` (types only, the `maprender.ts` precedent), and the progress shape is the page's (`src/ui/progress.ts`). No event. No new dependency: the dropdown is the browser's `<select>`, the store is `localStorage`.

Nothing in T is open. T-Q7: "Replay any (Recommended)".

#### T3b · The goodbye line moves left (ui). Branch `ticket/081t3b-goodbye-left`. **Done** (PR #96)
**Josh, 25 Nov 2026, on a card:** "Move it left (Recommended)". The exit's goodbye line ("Rest: Circuits is closed. You can close this tab.", T3 criterion 3) moves from the centre to the title's left margin, wrapping within the left half of the screen, clear of the lit building on the right.
- **Built:** `index.html` only (the line's style; f0c41db). Review `reviews/081-t3b-goodbye-left.md`: meets, must-fix 0. Count: 0 tests.
- **Merged** into `main` by PR #96 (a9c20ce). Josh, 25 Nov 2026, on a card: "Merge when green (Recommended)".

### N · Series v1: 25 new puzzles on the city, progressively harder. Cut 25 Nov 2026 for G1, in five PRs: N0, N1 and NS, then N2, then N3. **N0, N1 and NS approved (G1) 25 Nov 2026**; N2 and N3 wait on Josh's play. **Re-cut 26 Nov 2026 to batches of five: N0, N1 and NS merged; N2 (6 to 10) approved to build; N3 (11 to 15), N4 (16 to 20) and N5 (21 to 25) wait on Josh's word.** **N2 and NR merged 26 Nov 2026 (PRs #101, #103); N3 re-cut in full the same day and approved to build: "Start it".** **Re-cut again 26 Nov 2026 on Josh's play of 1 to 5: NR (1 to 3 re-laid) and NC (the control cue: NC1, then NC2), approved (G1) the same day: "Approve (Recommended)".** **Re-cut again 26 Nov 2026 (section NB): fuses as a tool (the deliberate blow), and the fuse-blow cap dropped for "Reuse is free"; approved (G1) the same day, on cards: G1 "Approve NB (Recommended)"; NB-Q1 "At 16, first of N4 (Recommended)"; NB-Q2 "Allow it too"; NB-Q3 "Drop the 2-timer cap"; NB-Q4 "As today (Recommended)".** **N4 (16 to 20) re-cut in full 26 Nov 2026, with NB1 as its puzzle 16, and approved to build, on a card: "Start N4 (Recommended)".**

**Josh's words on the series' direction, 26 Nov 2026 (relayed by the main session):**
- "The puzzle architect does not have to have the same names for the puzzles as they did before. I'm using Fable because I want it to build better puzzles, more complex puzzles that challenge the user based upon what they know and what they've learned from prior puzzles."
- "I want puzzles 11 through 25 to span multiple districts with intent. Puzzles 21 through 25. Should not only span multiple districts but should also include multiple layers of puzzle solving that span multiple districts."
- "1 through 10 are literally just to teach you the basics"
- **Read:** written into the series rules below (**The series' direction**) and into N3, N4 and N5, each re-cut in full to it when it starts.

**Josh's words on N2, NR, NC1 and NC2, 26 Nov 2026 (relayed by the main session):**
- **NC1 merged** into `main` by PR #100, on a card: "Merge, start NC2 (Recommended)". **NC2 merged** by PR #102, on a card: "Merge (Recommended)".
- **N2** (PR #101), on the designer's stop for `s07` and `s09` at 2 clicks: "Add a breaker". On fuse boxes on split poles: "Same rule (Recommended)". The branch-pole rule below now covers fuse boxes and says what a branch pole is. Recorded in N2.
- **NR** (PR #103), on the designer's stop for `s02`: "Allow it (Recommended)". On `s05`'s breaker: "Leave it (Recommended)". Recorded in NR, and the switch's outs in the branch-pole rule below.

**Josh's play of 1 to 5, and G1 for NR, NC1 and NC2, 26 Nov 2026 (relayed by the main session):**
- "Puzzle 1 is confusing because the breaker box rests on a split. One wire is on and the other is off until you turn on the switch."
- "Puzzle 2 has the same problem. You don't know which lines are turning off or on."
- "Puzzle 3 has the same problem."
- "Puzzle 4 is good." "Puzzle 5 is good."
- His screenshots show a breaker or switch icon on a pole where the line branches, so the branch it controls cannot be told.
- Asked "How should I fix it?", on a card: "Both (Recommended)": "Re-lay 1-3 so each breaker/switch sits on a single run, AND add a cue in the game: hovering or throwing one highlights exactly the wires it controls. The cue also helps every later puzzle."
- **G1 for NR, NC1 and NC2**, on a card, 26 Nov 2026: "Approve (Recommended)". **The V key** (the architect's call in section NC), on the same card: "Hide it too (Recommended)": V hides the cue along with the load numbers.
- **Read:** NR re-lays 1 to 3; NC1 and NC2 are the cue; the series rules gain "no breaker or switch on a branch pole". N1's criterion 10 is met (he has played 1 to 5); his words go under the notes' **What it taught us** in NR.

**Josh's words, 26 Nov 2026 (relayed by the main session):**
- **N0 merged** into `main` by PR #97 (a9d8206), on a card: "Merge, start 1-5 (Recommended)".
- **N1 and NS merged** into `main` by PR #99 (b749571) and PR #98 (4ef965e), and **N2 started**, in chat, after seeing screenshots of series puzzles 1 to 5 (he has not played them): "Merge and start the next 5". **Read:** batches go at five puzzles each, so N2 is 6 to 10, approved to build with these words; the rest (11 to 25) is three later batches of five (N3, N4, N5), each waiting on Josh's word. N1's criterion 10 (Josh plays 1 to 5) stays open: his verdict goes under each note's **What it taught us** when he gives it, and it may re-cut a later batch.

**Josh's answers, 25 Nov 2026, on a card (relayed by the main session):**
- **G1 for N0, N1 and NS:** "Approve (Recommended)". The architect's calls below stand as written.
- **N-Q1, the HUD's Map menu:** "Keep all (Recommended)". The Map menu keeps listing every city puzzle, pilots and P0 included, as a dev aid; only the stage select shows the series.
- **N-Q2, what counts as a new concept:** "New move counts (Recommended)". A new reasoning move that combines earlier ideas is a new concept; puzzles 11, 13 and 14 stay as planned.

**Josh's words, 25 Nov 2026 (relayed by the main session):**
- **The request, in chat:** "I don't want to convert the existing puzzles. Instead I want to use Fable 5.2 to analyze the existing puzzles and come up with a series of 25 puzzles that are progressively more difficult. The current puzzles are too repetitive."
- **The plan** (`puzzles/series-v1.md`, written by the puzzle-designer on Fable 5.2), on a card: "Approve, batches (Recommended)". Build 1 to 5, Josh plays; then 6 to 15, he plays; then 16 to 25.
- **Batteries** (the plan's question 1): "The puzzles should have progressive levels of difficulty and introduce new concepts to the player with each puzzle, one building upon the next." **Read:** batteries stay, as one of the concepts (puzzles 19, 20, 21, 24 and 25 as planned). Every puzzle introduces something new and builds on the ones before it.
- **Targets** (the plan's question 2, other buildings than the shrine): "I don't care. Just make sure that different points on the map are used with each puzzle. You can even use the same nodes over again if it means increasing the complexity of the puzzle to spread across multiple districts." **Read:** what the priests ask for is the designer's choice (the plan's own cap of the shrine at most 5 times holds); each puzzle is laid on a different part of the city from the one before and after it; a place (a pole, a roof structure, a building) may be used again by a later puzzle, notably where a bigger puzzle spreads over several blocks.
- **The pilots** (the plan's question 3): "Replace (Recommended)". The stage select lists only the new series. The 17 city puzzles on `main` (the 16 pilots `01-first-light` to `16-behind-the-first`, and P0 `city-two-ways-round`) stay in `puzzles/city/`, unedited, but are not stages.

**What this replaces.** P2b to P2d (puzzles 17 to 64 converted) are dropped, by the request above. The pilots are not re-laid or edited again.

**What exists today (read 25 Nov 2026 at `main` a9c20ce).**
- **The stages** are T2's `stageList` (`src/ui/progress.ts`): every non-locked city puzzle whose **id** starts with a number (`stageNumber`), in number order, the completed ones then the next. `src/main.ts` also uses `stageNumber` to pick the title's building (stage 01's, T-Q6) and to decide which wins are recorded. So a series file with an id starting `01` would collide with the pilot `01-first-light`; the series needs its own id form (NS).
- **Next** on the win splash is `nextMap` (`src/ui/logic.ts`): the next entry of the picker's list, which is `collectCityMaps`' path order. The HUD's Map menu lists every city puzzle, in path order.
- **The tools.** `npm run fit` takes a schematic file (`puzzles/<id>.json`) and writes a city draft; `npm run fit -- --raise` raises a city file from its own numbers when it has a check block and no schematic; `npm run check puzzles/city/` and P1's sweep (`tools/fit.test.ts`, every `puzzles/city/*.city.json`, flat, not recursive) hold every city file to C1's validator, W1's rules and its note's check block. **`npm run analyze` reads schematic files only** (`validatePuzzle`): the pilots' notes got their analyzer numbers from scratch runs of `analyzePuzzle` on the conversion. A new series puzzle has no schematic, so N0 gives the analyzer the city file.
- **Never played on the city:** relay, spring and battery (the plan's section 2). Every element the series uses is in the schema and the simulator today; no rule or schema change.

**The architect's calls (Proposed; Josh's to overturn at G1).**
- **Ids and files.** Series puzzle *n* is `puzzles/city/sNN-<slug>.city.json` and `puzzles/city/sNN-<slug>.md` (flat in `puzzles/city/`, so P1's sweep and `npm run check puzzles/city/` hold it with no tool change), id `sNN-<slug>` (`s01-first-light`), name `"NN · <working name>"` (`"01 · First light"`, the plan's working name, which the designer may better). The `s` keeps the series' ids apart from the pilots' and orders them after the pilots and P0 in path order.
- **No `from`.** A series puzzle is a new puzzle (the plan: "never a file to convert"), so it carries no `from`. The fit's input schematic, if the designer uses the fit, is a scratch file outside the repo; no new file goes in `puzzles/` outside `puzzles/city/`. Its check block, its numbers and its analyzer numbers are its own.
- **"Kit"** in the plan's "no kit repeats on neighbouring puzzles" is the parts list with its counts. The empty kits of 1 to 3 are the plan's own (nothing to spend before 4), not a repeat.
- **"Buildings"** in the plan's "at most 8 buildings" counts the puzzle's own lamps, not section S's scenery buildings, as the plan's section 2 says.
- **The title's building** (T-Q6, "Stage 01's, gold (Recommended)") becomes series puzzle 01's target building, since stage 01 is now `s01-...`. It follows from NS with no renderer change.
- **The HUD's Map menu** (in play) keeps listing every city puzzle, pilots and P0 included, as the dev aid it is today. Only the stage select changes (Josh, N-Q1: "Keep all (Recommended)").

**No Decided rule is touched.** The series plays every rule of the brief's "Rules carried over" on `src/grid/` unchanged; the plan's section 2 lists no rule or schema change. No `tickets/rules-coverage.md` row moves (the rules are held where they are; the sweep replays every series check block). **No pipeline-designer pre-check:** N0 and NS add no rule or number of the city's grammar, and the series rules (blow cap, kit, sizes, spread) are the designer's aims for its own puzzles, checked by the reviewer against the notes, not rules the city enforces.

**Order.**
| PR | Section | Owner | After | Shares | Tests |
| --- | --- | --- | --- | --- | --- |
| 1 | N0, the analyzer on a city file | grid-simulator | G1 | `tools/` only | at most 2 |
| 2 | N1, batch 1 (puzzles 1 to 5) | puzzle-designer (Fable 5.2) | G1; its notes' numbers need N0 merged (the designer may lay the files meanwhile) | `puzzles/city/`, `puzzles/SCHEMA.md` | 0 |
| 2, beside N1 | NS, the stage select | ui | G1; **merges after N1** (until then there is no stage 01, and the page opens its first puzzle as T3 does without one) | `src/ui/progress.ts` | at most 2 |
| — | Josh plays 1 to 5 from the stage select | | N1 and NS merged | | |
| 3 | N2, batch 2 (6 to 10) | puzzle-designer (Fable 5.2) | Josh's word (given 26 Nov 2026: "Merge and start the next 5") | `puzzles/city/` | 0 |
| 3, beside N2 | NR, 1 to 3 re-laid on single runs | puzzle-designer (Fable 5.2) | G1 | `puzzles/city/s01-...` to `s03-...` (and the What it taught us of `s04`, `s05`) | 0 |
| 3, beside N2 | NC1, the cue's lines, pure | grid-simulator | G1; the core field written first | `src/grid/preview.ts` | 1 |
| 3, beside NC1 | NC2, the cue drawn | renderer | G1; **merges after NC1** (it codes against the core field; without NC1 every entry has no lines and nothing is cued) | `src/render3d/cityview.ts` | 2 |
| 4 | N3, batch 3 (11 to 15). **Done** (PR #119, ef60db7; Josh, 26 Nov 2026, on a card: "Merge now") | puzzle-designer (Fable 5.2) | N2 merged (PR #101); Josh's word (given 26 Nov 2026: "Start it"); re-cut first (done) | `puzzles/city/`, rows 11 to 15 of `puzzles/series-v1.md` | 0 |
| 5 | N4, batch 4 (16 to 20), with NB1 as 16. **Approved to build** (Josh, 26 Nov 2026, on a card: "Start N4 (Recommended)"); re-cut in full the same day | puzzle-designer (Fable 5.2) | N3 merged (PR #119); Josh's word (given); re-cut first (done) | `puzzles/city/`, rows 16 to 20 and NB1's bullet of `puzzles/series-v1.md` | 0 |
| 6 | N5, batch 5 (21 to 25) | puzzle-designer (Fable 5.2) | N4 merged; Josh's word; re-cut first | `puzzles/city/` | 0 |

PRs 1 and 2 (N0, N1, NS) are merged. Josh plays each batch when he chooses; the next batch starts only on his word in chat, and the architect re-cuts it first to what he says.

**The series rules each batch holds** (from `puzzles/series-v1.md`, section 3; the table there is the plan, row by row):
- **The series' direction** (Josh, 26 Nov 2026: "1 through 10 are literally just to teach you the basics"; "I'm using Fable because I want it to build better puzzles, more complex puzzles that challenge the user based upon what they know and what they've learned from prior puzzles."; "I want puzzles 11 through 25 to span multiple districts with intent. Puzzles 21 through 25. Should not only span multiple districts but should also include multiple layers of puzzle solving that span multiple districts."). **Read:** 1 to 10 teach the basics. From 11 on, each puzzle challenges the player with what the earlier puzzles taught, and is harder for it, not only bigger. Every puzzle 11 to 25 spans more than one district, and the spread is part of the puzzle: its note says why the solve needs each district (a reason the player must go there, not room for the lines). In 21 to 25 the puzzle has several layers of solving, and the layers themselves cross districts (a layer begun in one district is finished or undone in another); the note names each layer and the districts it crosses. **Names** ("The puzzle architect does not have to have the same names for the puzzles as they did before."): the plan's working names and slugs for 11 to 25 are not binding; the designer names each puzzle (id `sNN-<its slug>`, name `"NN · <its name>"`). How far the plan's rows 11 to 25 themselves may change is settled when each of N3 to N5 is re-cut (N3's, 26 Nov 2026: see N3, **How far the rows may change**). **Limits that block a better puzzle** (the main session's reading of Josh's words above, 26 Nov 2026): from 11 on, where a size cap, the band's click or hidden-fact ceiling, or a row's **Size** would block a better puzzle, the designer may go past it. It says so in the note, with what it passed and why, and names it in its report. That is not a stop: the main session takes it to Josh at **Show Josh**. A floor (the band's least clicks, hidden facts or layers) is never passed. Neither is a validator or tool limit (the loader's 1 to 4 blocks, `FIT_BUDGET`, W1's numbers): those come under the stop rule.
- **One new concept per puzzle** (Josh: "introduce new concepts to the player with each puzzle, one building upon the next"): its row's "New idea" and "reasoning move", which no earlier series puzzle has taught; and it uses no element a later row introduces. The note names its concept and the earlier concepts it builds on.
- ~~**The fuse-blow cap:** "the obvious breaker blows a fuse" opens at most two puzzles of the 25 (8 and 19); "fit it and it blows again" is the trap of none.~~ **Dropped 26 Nov 2026** (section NB, proposed for G1). Josh, in chat, relayed by the main session: "There really shouldn't be a limit to the number of puzzles that can leverage a mechanism per series. If the mechanics are to build on top of one another then fuses should be able to be leveraged in any puzzle. Any number of times for any reason after they've been introduced." It is replaced by **Reuse is free** below. N1 to N3 were built under the cap; they are not reworked for it.
- **Reuse is free** (Josh, above). Once a series puzzle has introduced a mechanic (a piece, a rule or a reasoning move), any later puzzle may use it, in any number of puzzles, any number of times on one map, and for any reason: as the trap, as the tool or as a layer. That includes blowing a fuse on purpose (section NB). No series rule counts how many puzzles use a mechanic. What stays: the **order** mechanics are introduced in (a puzzle uses nothing a later puzzle introduces), and **one new concept per puzzle** (below). "No move appears twice" in the plan means no puzzle's *new* move is one an earlier puzzle already taught; using an earlier move again is building on it, not a repeat. **"Fit it and it blows again" is allowed as a designed trap** (Josh, 26 Nov 2026, NB-Q2: "Allow it too"). This narrows his 28 Oct 2026 words on 12 ("it just blows every time you fix the fuse") to a re-blow that is not designed: a re-blow the note does not name as its trap, or one the player can't read before fitting (`wouldBlow`'s warning, a number that turns), is still off-track. **Any number of timed breakers on a map** (NB-Q3: "Drop the 2-timer cap"). **What stays:** the shrine at most 5 times in the 25, and no kit or heavy building repeated on neighbouring puzzles (NB-Q3 kept them; they vary the puzzles and do not count a mechanic's uses).
- **No repeats on neighbours:** no kit repeats on neighbouring puzzles; the heavy building is never the same two puzzles running; the target is the shrine at most 5 times in the 25 (each note keeps the running count).
- **Size caps:** at most 8 of the puzzle's own buildings and 4 faults on any map; each puzzle's faults, parts and controls as its row's **Size**.
- **A different place** (Josh: "different points on the map are used with each puzzle"): no puzzle's district shares a block with the puzzle before or after it, and no two series puzzles have the same district. Districts are 1 block for 1 to 10, 2 for 11 to 20, 3 or 4 for 21 to 25 (the plan); from N3 on, a puzzle in 11 to 20 may take 3 or 4 where its note shows the solve needs them, and every multi-block district's blocks touch across a street (CK14); from N2 on, a puzzle in 6 to 10 may take 2 blocks where its note shows two lines must end side by side at the target (N2's lesson from N1). Places may be used again by any later puzzle whose district differs (Josh: "You can even use the same nodes over again").
- **The difficulty band** (the plan's band table): fewest clicks, hidden facts, dead ends and layers within the row's band, read from the analyzer.
- **No breaker, switch or fuse box on a branch pole** (added 26 Nov 2026, from Josh's play of 1 to 5: "Puzzle 1 is confusing because the breaker box rests on a split. One wire is on and the other is off until you turn on the switch."; see NR. Fuse boxes added the same day, on N2's stop: "Same rule (Recommended)"). A **branch pole** is any pole where a third wire meets, scenery spans and drops included. A breaker's or fuse box's pole carries only its own lines: the one line in and the one line out; a switch's pole, the one line in and its two outs. No junction, feed, lamp's drop from another line, other control, other puzzle line, or section S scenery span or drop meets at that pole (read from the conversion: `converted.hidden` and the circuit layer say what hangs where). A switch's two outs leave its pole by different wires, and one of them may go straight into a building's own drop (Josh, 26 Nov 2026, on NR's stop for `s02`: "Allow it (Recommended)"); still no pole has three spans mid-block. **One standing exception:** `s05-not-that-one`'s breaker, on a pole with a crossing span no line owns, stays as laid (Josh, 26 Nov 2026: "Leave it (Recommended)"); it is not a precedent for a new puzzle. Every series puzzle holds the rule from N2 on (N2's designer was told while building), and 1 to 3 are re-laid to it (NR). The note's place table says, for each control and fuse box, what its pole carries.

A puzzle whose row cannot be laid as planned may change its trap's details, said in its note; it may not change its new concept or break a series rule. If it would, the designer stops (see N1's stop rule).

#### N0 · `npm run analyze` reads a city puzzle file (grid-simulator). Branch `ticket/081n0-analyze-city`, after G1. **Done** (PR #97, a9d8206; Josh, 26 Nov 2026, on a card: "Merge, start 1-5 (Recommended)")
**Goal.** The puzzle-designer (and the reviewer) can run `npm run analyze puzzles/city/<id>.city.json` and get the same report a schematic gets, for the puzzle as it plays on the city.

**Acceptance criteria.**
1. [ ] **A city file is analyzed on its conversion.** Given a `*.city.json`, `npm run analyze` validates it (C1), converts it on its own city (`city` block: 6 x 6 seed 1, one-way on, through the module cache `tools/fit.ts` and `tools/check.ts` already use), and runs `analyzePuzzle` on the converted `Puzzle`, with the same flags (`--cap`, `--click-seconds`, `--json`). A schematic file behaves exactly as today. **test**: 1 case, on P0 (`city-two-ways-round.city.json`): the report finds a win, and its fewest clicks equal the schematic's (`puzzles/city-two-ways-round.json`; P0 is raised, not reworked, so they must agree).
2. [ ] **Scenery is not reported as the puzzle's.** S1's hidden lamps and junctions (`converted.hidden`) are left out of the report's lists (lamps lit, controls, dead first moves) and counted only in the feeds' and fuses' loads, which is where they draw. **test**: folded into criterion 1's case (no hidden id appears in the report's lists), or 1 more case at most if a fixture is clearer.
3. [ ] `--sections` on a city file says "not for city files" and exits non-zero, rather than guessing. **no test**.
4. [ ] The builder gives the new case's time on Josh's PC (it builds one city through the cache; under 2 s, or the reason). **no test**.

**Count.** At most 2 added.

**Files.** `tools/analyze.ts`, `tools/analyzerun.ts` (only if the hidden filter belongs there), `tools/analyze.test.ts`. **Must not:** `src/`, `puzzles/`, `package.json` (the `analyze` script is unchanged).

**Interfaces.** None in `src/core/`. No new dependency.

#### N1 · Series v1, batch 1: puzzles 1 to 5 (puzzle-designer, Fable 5.2). Branch `ticket/081n1-series-batch-1`, after G1. **Done** (PR #99, b749571; Josh, 26 Nov 2026, in chat, after seeing screenshots of 1 to 5, not yet played: "Merge and start the next 5"). Criterion 10 stays open until he plays them
**Goal.** The first five puzzles of the series are on the city, each teaching one thing on its own part of the map, so Josh can play 1 to 5 from the stage select and say what they teach about reading on the city before 6 to 25 are built.

**The five** (the plan's rows; each name is a working name):
| # | Id | New concept | Builds on | Size (faults / parts / controls) |
| --- | --- | --- | --- | --- |
| 1 | `s01-first-light` | The breaker: trace the target's wire back to the feed | nothing | 0 / 0 / 2 br |
| 2 | `s02-this-way-or-that` | The switch: only a switch with current changes anything | 1 | 0 / 0 / 2 sw |
| 3 | `s03-not-enough-for-all` | Capacity and brownout: choose what goes dark | 1, 2 | 0 / 0 / 4 br |
| 4 | `s04-the-spark` | A damaged cable; faults are read by current | 1 to 3 | 1 / wire / 1 sw |
| 5 | `s05-not-that-one` | Scarce parts; a dead junction costs two wires | 1 to 4 | 2 / 2 wire / 1 br |

**Acceptance criteria** (each of the five):
1. [ ] **On the city and checked.** Its city file and note are in `puzzles/city/` under the id and name above (the architect's calls), on 6 x 6 seed 1, one-way on, with no `from`; every lamp a building fed by its drop. `npm run check puzzles/city/` passes it, W1's rules included (reads outward, `FEED_CLEAR_M`, no crossing spans, own-block roofs), and its capacities are raised for its scenery (`npm run fit -- --raise`, from its own numbers). **test** (P1's sweep, unedited).
2. [ ] **Solvable per the analyzer.** `npm run analyze puzzles/city/<id>.city.json` (N0) finds a win, and the note gives its numbers: fewest clicks, winning configurations, winning click orders, the share of dead-end states, and the obvious wrong first move with how it is read and recovered. Within the band for 1 to 5: 1 to 3 clicks; nothing hidden at the start (every fact needed is on screen); no dead end in 1 to 4; in 5, one, recovered by one Undo; 1 winning configuration in 5. **no test** (the sweep's check-block replay is the test that it wins).
3. [ ] **One new concept, built on the ones before** (Josh: "introduce new concepts to the player with each puzzle, one building upon the next"). The note names its concept and reasoning move (the table above) and what it builds on. It uses no element a later puzzle introduces: no switch in 1; no binding capacity in 1 and 2 (the feed has room for every lamp the win needs, with S's scenery); no fault or part in 1 to 3; no fuse box, relay, spring, battery or second feed anywhere in 1 to 5. **no test**.
4. [ ] **A different place from its neighbours** (Josh: "different points on the map are used with each puzzle"). Its district is 1 block; it shares no block with the puzzle before or after it; no two of the five are on the same block. The note names its block and the place table (node to place, line to its span chain). **no test**.
5. [ ] **The series rules** (above): its size as the table; at most 8 of its own buildings and 4 faults; no fuse blow at all in 1 to 5 (no fuse box), so the blow cap's two openers stay 8 and 19; no kit repeats on neighbours (4's one wire, 5's two); the heavy building is not the same two puzzles running; the note keeps the shrine count (at most 5 over the 25). **no test**.
6. [ ] **The numbers are the lesson, early.** From the plan: in 1 to 5 a red number is the lesson. The note says which move section V's load numbers mark red (or that none is, and why), from the default camera. **no test**.
7. [ ] **The note** has, besides the above: the intended read from the default camera, saying where the target building is; **The trap**, in a line, as the plan's row (or what changed in it and why); the check block with the solution; the tribe's `priority` homes named with what the win costs them; and an empty **What it taught us**. **no test**.
8. [ ] `puzzles/SCHEMA.md`'s city section says a series puzzle's id is `sNN-<slug>`, that it has no `from`, and that only series puzzles are stages (NS). **no test**.
9. [ ] The designer gives P1's sweep's time on Josh's PC with the five added (`npx vitest run --maxWorkers=2 tools/fit.test.ts`). P1 criterion 7 allows it past 2 s; at 25 more puzzles by N3 it is watched, not tuned here. **no test**.
10. [ ] **Josh plays** 1 to 5 from the stage select (after N1 and NS merge, `npm run dev`, "start"). His verdict, in his words, goes under each note's **What it taught us**, and N2 waits for it. **browser**.

**Stop rule.** The designer stops ("stop 081 N1", with the branch) if a puzzle cannot be laid on a 1-block district under W1's rules with the fit and the check as they are, needs a rule, schema or tool change, or can keep its row's concept only by breaking a series rule. It does not change W1's numbers, `FIT_BUDGET` or a tool to pass; it reports what is short, and the architect re-cuts.

**Count.** 0.

**Files.** `puzzles/city/` (new `s01-...` to `s05-...` files and notes only; the pilots and P0 are not edited), `puzzles/SCHEMA.md` (the city section). **Must not:** `puzzles/` outside `puzzles/city/` and `SCHEMA.md`, `tools/`, `src/`.

**Interfaces.** None. No new dependency.

#### NS · The stage select lists only the series, in its order (ui). Branch `ticket/081ns-series-stages`, after G1; merges after N1. **Done** (PR #98, 4ef965e, merged after N1; Josh, 26 Nov 2026, in chat: "Merge and start the next 5")
**Goal.** The player's stage select (and the title's building, and the wins it keeps) is the series: stage 01 is series puzzle 01, the completed series stages and the next one are listed in series order, and the pilots and P0 are not stages (Josh: "Replace (Recommended)").

**Acceptance criteria.**
1. [ ] **A stage is a series puzzle.** `stageNumber(id)` gives *n* for a series id `sNN-<slug>` and null for every other id (the pilots `01-...` to `16-...`, `city-two-ways-round`). So `stageList` lists only series puzzles, in number order: the completed ones, then the lowest not completed; a pilot with a recorded win is not listed. **test**: the existing `stageList` case rewritten to a fixture of three series entries, a pilot with a win and P0 (1 rewritten).
2. [ ] **What follows from it, unchanged code** (`src/main.ts`): the title's building is series 01's target (T-Q6, "Stage 01's, gold (Recommended)", read as the series' stage 01); a win is recorded for series stages only; with no series file on the page the title is skipped and the first puzzle opens, as T3 does today. The builder confirms each in its reply and changes `main.ts` only where one does not hold. **no test**.
3. [ ] **Next goes along the series.** A series stage's win splash offers the next series puzzle on the page by number, and none after the last one built. If `nextMap`'s path order already gives this (series files sort after the pilots and P0, and in number order), no change; otherwise `nextMap` takes the series order for a series stage. **test**: 1 case, only if `nextMap` changes; otherwise **no test**, and the builder says why it holds.
4. [ ] **Old progress is left alone.** Wins recorded under the pilots' ids stay in `rest-circuits.progress.v1`, unlisted; no migration, no key change. Clear progress clears them too. **no test**.
5. [ ] Josh opens `npm run dev` after N1 and NS merge: the title shows series 01's building, the select lists "01 · ..." alone, a win of it lists it with its moves and time and offers 02 next. **browser**.

**Count.** At most 2 (1 rewritten, at most 1 added).

**Files.** `src/ui/progress.ts`, `src/ui/progress.test.ts`; `src/ui/logic.ts` and its test (`nextMap`, only under criterion 3); `src/main.ts` (only under criterion 2). **Must not:** `src/render3d/`, `src/play/`, `src/grid/`, `src/core/`, `puzzles/`, `tools/`, `src/ui/maps.ts` (the picker's list is unchanged).

**Interfaces.** None in `src/core/`. No event. No new dependency.

#### N2 · Series v1, batch 2: puzzles 6 to 10 (puzzle-designer, Fable 5.2). Branch `ticket/081n2-series-batch-2`. **Done** (PR #101, c77066c; Josh, 26 Nov 2026, on a card: "Merge both (Recommended)"). Built on his word "Merge and start the next 5". Criterion 9 stays open until he plays 6 to 10
**Re-cut 26 Nov 2026** from the named stub (6 to 15, waiting on Josh's play of 1 to 5) to Josh's pace of five. He has seen screenshots of 1 to 5, not played them; N1's criterion 10 stays open, and if his verdict on 1 to 5 lands while N2 is building, the main session brings it to the architect before N2 merges.

**Josh's words while N2 built (PR #101), 26 Nov 2026 (relayed by the main session):**
- **The stop on `s07` and `s09`:** both came out at 2 clicks, under the band's 3. Josh: "Add a breaker". Each gains a breaker; at the main session's request `s07`'s added breaker was also given its own job, so it does not repeat `s09`'s. The table's controls for 7 and 9 read "1 sw, 1 br" for this.
- **Fuse boxes on split poles:** "Same rule (Recommended)". A fuse box is held to the branch-pole rule as breakers and switches are; a branch pole is any pole where a third wire meets, scenery spans and drops included (the series rules, above).
- **Review:** round 1 found 2 must-fix items, both on crossing spans, both fixed; round 2: meets, must-fix 0.

**Goal.** Puzzles 6 to 10 of the series are on the city, each adding one idea to the first five on its own part of the map (the second layer: a fault hiding a fault, the road round, the first fuse rating, the ring, the bulb as a load), so Josh can play 1 to 10 from the stage select.

**The five** (the plan's rows 6 to 10 in `puzzles/series-v1.md`; each name is a working name):
| # | Id | New concept | Builds on (the note may name more) | Size (faults / parts / controls) |
| --- | --- | --- | --- | --- |
| 6 | `s06-behind-the-fuse` | Faults hide faults: open the dark before spending a part that might be wanted behind it | 1 to 5 | 3 / fuse, bulb / 1 br |
| 7 | `s07-the-long-way` | Reroute instead of a repair you can't afford | 2, 4, 5 | 2 / wire / 1 sw, 1 br (Josh: "Add a breaker") |
| 8 | `s08-the-small-box` | Fuse rating: a local limit, and a blow costs a part | 3, 6 | 0 / fuse / 3 br, 1 fb |
| 9 | `s09-two-ways-round` | The ring: which side of each break each target is on; one mend joins both from one side | 2, 4, 7 | 2 / wire / 1 sw, 1 br (Josh: "Add a breaker") |
| 10 | `s10-count-the-dark` | A bulb is a load event: a dead building draws nothing until its bulb goes in | 3, 6, 8 | 2 / 2 fuse, bulb / 2 br, 1 fb |

**The lesson from N1** (`s01-first-light.md` and `s05-not-that-one.md`, "Changed from the plan's row"). On a 1-block district the feed's wire comes in at a corner pole and its lines leave along the block's two streets and do not come back together, and a roof hop lands among the target line's own poles (a roof structure stands within about 16 m of both poles it joins). So two lines cannot end side by side at the target on one block. A row whose trap needs that (likely 7, the switch's two roads; and 9 unless its ring goes round all four streets, as P0 `city-two-ways-round` does on `block:6:6`) does one of two things, said in its note with the reason: **(a)** it uses a **2-block district**, reusing places on a block an earlier puzzle used where that spreads it across districts (Josh, 25 Nov 2026: "You can even use the same nodes over again if it means increasing the complexity of the puzzle to spread across multiple districts"); or **(b)** it keeps 1 block and changes its trap's detail, as N1 did for 1 and 5. Neither may change its row's concept or break another series rule. **Architect's call** (Josh's to overturn): (a) departs from the plan's "1 block for 1 to 10" only for a puzzle whose note shows the side-by-side need; it is read as within Josh's words above.

**Acceptance criteria** (each of the five):
1. [ ] **On the city and checked.** As N1's criterion 1: its city file and note in `puzzles/city/` under the id above and the name `"NN · <working name>"`, on 6 x 6 seed 1, one-way on, no `from`; every lamp a building fed by its drop; `npm run check puzzles/city/` passes it, W1's rules included (reads outward, `FEED_CLEAR_M`, no crossing spans, own-block roofs); capacities and ratings raised for its scenery (`npm run fit -- --raise`). **test** (P1's sweep, unedited).
2. [ ] **Solvable per the analyzer, within the band for 6 to 15.** `npm run analyze puzzles/city/<id>.city.json` finds a win, and the note gives fewest clicks, winning configurations, winning click orders, the share of dead-end states, and the obvious wrong first move with how it is read and recovered. The band: 3 to 6 clicks; 1 or 2 hidden facts at the start (the note names each, and what makes it readable); dead ends readable, recovered by a part or one Undo; 2 layers (the note names both); 1 winning configuration (the plan's difficulty rule 3, from 5 on). **no test** (the sweep's check-block replay is the test that it wins).
3. [ ] **One new concept, built on the ones before** (Josh: "introduce new concepts to the player with each puzzle, one building upon the next"). The note names its concept and reasoning move (the table above) and what it builds on. It uses nothing a later puzzle introduces: no fuse rating that binds before 8 (6's and 7's boxes, if any, carry their whole load; 6's fuse is a start-blown fault, and fitting it blows nothing); no ring before 9 (7's second road is its switch's other line, not a loop back); in 6 to 9 no fitted bulb takes a feed or box over its limit (that is 10's idea); no reading a fault from behind as the move (13's); no second feed, nested fuse, relay, spring or battery anywhere in 6 to 10. **no test**.
4. [ ] **A different place from its neighbours** (Josh: "different points on the map are used with each puzzle"). Its district is 1 block, or 2 under the lesson above (a). It shares no block with the puzzle before or after it (6 none with 5's `block:8:7`); its district is not any earlier series puzzle's district; a 2-block district may take in one block an earlier, non-neighbouring puzzle used. The note names its block(s), the place table (node to place, line to its span chain), and the running list of districts used. **no test**.
5. [ ] **The series rules** (section N, above): its size as the table; at most 8 of its own buildings and 4 faults; **the only "obvious breaker blows a fuse" opener in 6 to 10 is 8**, and "fit it and it blows again" is no puzzle's trap; no kit repeats on neighbours (5's two wires, then fuse and bulb, wire, fuse, wire, two fuses and a bulb, as planned); the heavy building is not the same two puzzles running (5 had none); the note keeps the shrine count (1 of 5 after puzzle 5); **no breaker, switch or fuse box on a branch pole** (the series rule added 26 Nov 2026 from Josh's play of 1 to 5, fuse boxes on N2's stop: "Same rule (Recommended)"; the designer was told while building), with each control's and fuse box's pole and what it carries in the place table. **no test**.
6. [ ] **From 6 on, the wrong move is not one red number deep** (the plan's difficulty rule 2). The note says how its obvious wrong move reads from the default camera with section V's load numbers: either it is not red (a part spent in the wrong place), or everything is red and the puzzle is what to do first so the move turns white. **no test**.
7. [ ] **The note**, as N1's criterion 7: the intended read from the default camera, saying where the target building is; **The trap**, in a line, as the plan's row, or what changed in it and why (and, under the lesson above, which of (a) or (b) it took); the check block with the solution; the tribe's `priority` homes named with what the win costs them; and an empty **What it taught us**. **no test**.
8. [ ] The designer gives P1's sweep's time on Josh's PC with the ten series puzzles in (`npx vitest run --maxWorkers=2 tools/fit.test.ts`), beside N1's figure. Watched, not tuned here. **no test**.
9. [ ] **Josh plays** 6 to 10 from the stage select (after N2 merges, `npm run dev`, "start"). His verdict, in his words, goes under each note's **What it taught us**. N3 starts only on his word in chat. **browser**.

**Stop rule** (N1's, kept). The designer stops ("stop 081 N2", with the branch) if a puzzle cannot be laid on its district (1 block, or 2 under the lesson's (a)) under W1's rules with the fit and the check as they are, needs a rule, schema or tool change, or can keep its row's concept only by breaking a series rule. It does not change W1's numbers, `FIT_BUDGET`, a tool or `puzzles/series-v1.md` to pass; it reports what is short, and the architect re-cuts.

**Count.** 0.

**Files.** `puzzles/city/` (new `s06-...` to `s10-...` files and notes only). **Must not:** `s01-...` to `s05-...`, the pilots and P0 in `puzzles/city/`; `puzzles/` outside `puzzles/city/` (`series-v1.md` and `SCHEMA.md` included); `tools/`; `src/`.

**Interfaces.** None. No new dependency.

#### NR · Series 1 to 3 re-laid: each breaker and switch on a single run (puzzle-designer, Fable 5.2). Branch `ticket/081nr-series-relay`, after G1, beside N2. Cut 26 Nov 2026; **approved (G1) 26 Nov 2026**: "Approve (Recommended)". **Done** (PR #103, 60698ff; Josh, 26 Nov 2026, on a card: "Merge both (Recommended)")
**Josh, 26 Nov 2026**, his play of 1 to 5 and his card "Both (Recommended)", as recorded at the top of section N. The fault in 1 to 3: a breaker or switch icon sits on a pole where the line branches (in 1, `br_side`'s pole `pole:z:5:lo:494.50` also carries section S's scenery building across `z:5`, lit from the start while the breaker past it is open), so the player cannot tell which branch it controls.

**Josh's words while NR built (PR #103), 26 Nov 2026 (relayed by the main session):**
- **The stop on `s02`:** "Allow it (Recommended)". A switch may send one of its two outs straight into a building's own drop; no pole has three spans mid-block. Criterion 1 reads with this.
- **`s05`'s breaker**, on a pole with a crossing span no line owns: "Leave it (Recommended)". `s05`'s city file is not touched (criterion 5 and Files stand); the exception is named in the series rules.

**Goal.** Josh replays 1 to 3 from the stage select and, for every breaker and switch, can see the one wire it controls: each sits on a single run, and each puzzle still teaches what it taught.

**Acceptance criteria** (each of `s01-first-light`, `s02-this-way-or-that`, `s03-not-enough-for-all`):
1. [ ] **No breaker or switch on a branch pole** (the series rule above; a switch's out may go straight into a building's own drop: "Allow it (Recommended)"). Every breaker's and switch's pole carries only its own lines; the note's place table says, for each control, its pole and every wire that meets there (from the conversion, scenery included). **no test**.
2. [ ] **The concept kept.** Its row's new concept, reasoning move, size (1: 2 breakers; 2: 2 switches; 3: 4 breakers; no fault or part in any) and what it builds on are as N1 laid them. The trap may change its detail; the note says what changed and why. **no test**.
3. [ ] **Still checked and solvable.** N1's criteria 1, 2, 5 and 6 hold as written: `npm run check puzzles/city/` passes it (W1's rules included), capacities raised for its scenery (`npm run fit -- --raise`); `npm run analyze` finds a win inside the band for 1 to 5; its numbers, the check block, the red-number read and the shrine count are brought up to date in the note. **test** (P1's sweep, unedited).
4. [ ] **Same id, same place if it can.** The id, the name and the file names stay (progress is kept under the id). It keeps its district (1: `block:2:10`, 2: `block:6:1`, 3: `block:8:1`). If the single-run rule cannot be met there, it moves to a 1-block district no series puzzle 1 to 10 uses (N2's branch included, read when NR is built) that shares no block with its neighbours, and the note says why. **no test**.
5. [ ] **Josh's words recorded.** Under **What it taught us**: in `s01` to `s03`, his line on that puzzle (above) and his card's answer, then a line on what the re-lay changed; in `s04` and `s05`, "Puzzle 4 is good." / "Puzzle 5 is good." with the date. Nothing else in `s04` or `s05` changes. **no test**.
6. [ ] **Josh replays** 1 to 3 (`npm run dev`, "start"; NC2 need not be in): each control's wire reads on its own. **browser**.

**Stop rule** (N1's). The designer stops ("stop 081 NR", with the branch) if a puzzle cannot hold the single-run rule and its concept on a 1-block district under W1's rules with the fit and the check as they are. It does not change a tool, W1's numbers or `puzzles/series-v1.md` to pass.

**Count.** 0.

**Files.** `puzzles/city/s01-*`, `s02-*`, `s03-*` (city files and notes); the **What it taught us** sections of `puzzles/city/s04-the-spark.md` and `s05-not-that-one.md`. **Must not:** `s04`/`s05` city files or any other part of their notes; `s06-...` on (N2's); the pilots and P0; `puzzles/` outside `puzzles/city/`; `tools/`; `src/`.

**Interfaces.** None. No new dependency.

#### NC · The control cue: NC1, then NC2. Cut 26 Nov 2026; **approved (G1) 26 Nov 2026**: "Approve (Recommended)"
**Josh, 26 Nov 2026**, card "Both (Recommended)": "add a cue in the game: hovering or throwing one highlights exactly the wires it controls. The cue also helps every later puzzle."

**Why two owners.** "Exactly the wires it controls, from grid state, not guessed" is a what-if: the lines whose power the throw would change. The renderer has no grid run of its own, and the page already asks the grid one what-if per control on each state change: V2's `loadPreview`, run with every unread fault treated as sound, so the Decided "Faults hide faults" holds. NC1 has that same run name the lines it changes; NC2 draws them. No new what-if, no second set of rules, and a hidden break never shows in the cue, as it never shows in the number. **No `src/play/` or `src/ui/` change:** the hovered id already reaches the renderer each frame (`play.view().hover`, passed by `src/main.ts` as the frame's `overlay.hover`), and the preview already reaches it on each state change (`setLoadPreview`, V4).

**How it fits V2, V1 and W4.**
- **What it reads.** The entry under the hovered id in the preview the renderer holds (V3). The preview is `null` during the Relight, after the win, and while V4's `V` key hides the numbers, so the cue is off then too. **Josh, 26 Nov 2026, on a card: "Hide it too (Recommended)"**: the cue goes with the numbers under `V`.
- **How it looks.** The listed lines' wires (`jobWires`: spans and drops of file lines only, never scenery or hidden lines, as V1's tint) drawn over V1's tint in two colours: lines the throw would make live in `CUE_ON`, lines it would make dead in `CUE_OFF`. Steady, no pulses (W4's pulses mean current now; the cue is what would be). A line with a readable cut is cued up to the cut only, where `lineFlow` caps its live share. It takes W4's see-through pass (`xrayOf`), so a run behind a building still reads, faded.
- **Throwing, and touch.** After a throw the page hands the renderer the new state's preview and the hover stays on the control, so the cue now shows what throwing it back would change: for a breaker the same wires, `on` and `off` swapped; for a switch its two lines swapped. On touch there is no hover: `play.ts`'s click handler sets `hover` to the tapped id, so a tap throws the control and leaves its cue up until the next tap elsewhere (a tap on empty ground hits nothing and clears it). NC2's builder confirms that order in the browser pane with touch emulation; if a touch tap leaves `hover` null, it stops ("stop 081 NC2") and the architect cuts an interaction section in `src/play/` (owner: interaction).

#### NC1 · Each control's preview entry names the lines it changes (grid-simulator, pure). Branch `ticket/081nc1-cue-lines`, after G1 and the core field. **Done** (PR #100; Josh, 26 Nov 2026, on a card: "Merge, start NC2 (Recommended)")
**Goal.** For every breaker, switch and readable fault, `loadPreview` says which lines the move would make live and which dead, from the same visible what-if as its number.

**Acceptance criteria.**
1. [ ] **The lines.** Each entry's `lines.on` is the ids of `puzzle.lines` not in the base run's `powered` and in the after run's; `lines.off` the reverse. Both come from the run with rated fuses lifted (the one `delta` comes from: "the wires it controls", before any blow; a blow is the red number's to say), in `puzzle.lines` order. **test**: 1 case, on a fixture of a feed, an open breaker with a junction past it splitting to two lamps, and a switch on another line: the open breaker's `on` is exactly the three lines past it and `off` empty, and closed the reverse; the switch's `on` is its other out's run and `off` its present one's.
2. [ ] **Faults hide faults** (Decided). An unread break past the breaker leaves the lines beyond it in `on`, as if sound; with the break's id in `known`, its own line stays in `on` (current stops at the cut) and the lines beyond it do not. **test**: folded into criterion 1's case.
3. [ ] Repair entries carry `lines` too (not drawn yet). No number, `over` or `blows` changes: V2's cases pass unedited. **test** (existing).
4. [ ] `src/grid/` stays pure (its existing purity case). **test** (existing).

**Count.** 1 added.

**Files.** `src/grid/preview.ts`, `src/grid/preview.test.ts`. **Must not:** any other folder.

**Interfaces.** The field below in `src/core/preview.ts`. No event, no new dependency.

#### NC2 · Hovering a breaker or switch highlights the wires it controls (renderer). Branch `ticket/081nc2-cue-drawn`, after G1, beside NC1; merges after NC1. **Done** (PR #102; Josh, 26 Nov 2026, on a card: "Merge (Recommended)")
**Goal.** From the default camera, the player points at (or taps) a breaker or switch and sees exactly the wires it would light and the wires it would darken; pointing away clears it.

**Acceptance criteria.**
1. [ ] **The right wires.** A pure `cueWires(wiresOfLine, preview, hoverId)` in `src/render3d/` gives, for each job wire, none, on or off: the wires of the hovered entry's `lines.on` and `lines.off`, for a breaker or switch id only; none for a null hover, a hovered lamp, fuse box or break, a `null` preview, or an entry with no `lines`. Hidden and scenery lines are never cued. A line with a readable cut is cued up to the cut only. **test**: 1 case on a fixture conversion.
2. [ ] **The layer.** One instanced cue layer made at build, sharing the live layer's wire geometry, coloured by instance (`CUE_ON`, `CUE_OFF`: the architect's start is the live glow's warm colour at full and a cool white, both brighter than V1's `JOB_WIRE_DIM`; Josh tunes by eye), with W4's see-through pass (`xrayOf`). Its instance colours are written only when the hovered id or the preview object changes, not every frame. **test**: 1 case: the cue layer and its x-ray share geometry and instance colours, the x-ray material is `GreaterDepth`, `depthWrite` false, `XRAY_OPACITY`, and an unchanged hover and preview writes nothing (the colour attribute's `version` holds).
3. [ ] **Off when the numbers are off.** No cue during the Relight, after the win, or under `V` (the preview is `null`). **test**: folded into criterion 1's case (`null` preview).
4. [ ] **Touch.** In the browser pane with touch emulation, a tap on a breaker throws it and leaves its cue up; a tap on empty ground clears it. The builder reports the event order it saw. If the tap leaves no cue, it stops ("stop 081 NC2"; see section NC). **browser**.
5. [ ] **What it costs, measured** against `docs/design/081-F-measurements.md`: `perf=1` on 6 x 6 seed 1 with P0 (`?puzzle=city-two-ways-round&perf=1`), before power, with the pointer held on `sw`, against `main`, median over 300 frames, the pane in view. At most 2 more draw calls (the cue layer and its x-ray), no new program in play (the cue material compiled at build), median within 0.5 ms. Over any: the builder stops ("stop 081 NC2"); it does not drop the x-ray pass to pass. It reports draw calls, programs and the median; the main session adds the row to the measurements note. **browser**.
6. [ ] **Josh plays** 1 to 3 (re-laid, after NR merges) and 4: hovering each breaker and switch lights exactly its wires, live-to-be and dead-to-be apart; on 2, each switch shows its two lines. **browser**.

**Count.** 2 added (criteria 1 and 2). NC1 and NC2 together: 3.

**Files.** `src/render3d/cityview.ts` (the build step, the live layer, the cue write in the frame loop), a new `src/render3d/controlcue.ts` and `controlcue.test.ts` (or one case in an existing cityview test file). **Must not:** `src/grid/`, `src/core/`, `src/ui/`, `src/main.ts`, `src/play/`, `overlay.ts` (the icons and numbers are unchanged), `windows.ts`, `fx.ts`.

**Interfaces.** NC1's field. No event, no new dependency.

#### N3 · Series v1, batch 3: puzzles 11 to 15 (puzzle-designer, Fable 5.2). Branch `ticket/081n3-series-batch-3`, from `main` 24a9ccf. **Approved to build** (Josh, 26 Nov 2026, in chat, asked "Shall I start N3 (puzzles 11 to 15)?": "Start it"). **Done** (PR #119, ef60db7; Josh, 26 Nov 2026, on a card: "Merge now"; asked after CI passed and the review found 0 must-fix, before he had played 11 to 15). Two things stay open: criterion 9 (the opening frames, checked in the pane) and criterion 13 (Josh plays 11 to 15)
**Re-cut in full 26 Nov 2026** from the named stub, to Josh's words. They are recorded at the top of section N and in the series rules' **The series' direction** (relayed by the main session):
- "1 through 10 are literally just to teach you the basics"
- "I want puzzles 11 through 25 to span multiple districts with intent."
- "The puzzle architect does not have to have the same names for the puzzles as they did before. I'm using Fable because I want it to build better puzzles, more complex puzzles that challenge the user based upon what they know and what they've learned from prior puzzles."

Josh has not played 6 to 10 yet (N2's criterion 9 is open). If his verdict on them lands while N3 builds, the main session brings it to the architect before N3 merges, as it did for N2.

**Goal.** Puzzles 11 to 15 are on the city, and they are where the challenge starts. Each one spans two or more blocks, and the player has to go to each of them. Each one makes what 1 to 10 taught into a harder read, not just a bigger map. Josh can play 11 to 15 from the stage select and say whether the series has started to challenge him.

**What "district" means here** (Josh, 26 Nov 2026, on a card, N3-Q1: "A block (Recommended)"; open question 29, closed). In Josh's words a district is a part of the town the player can tell apart. On the puzzle city those parts are blocks. Stage 10's history districts (`CityDistrict`, 1 to 4 blocks) run only in the tech, hold-out and ruin eras (`CITY_ERA_LAST.clean` is `"traffic"`), so the player never sees them. So "spans multiple districts" is read as: the puzzle's `district` lists **2 to 4 blocks** (the loader's limit) that touch across a street (CK14, `districtProblems`), and the solve needs each one. 2 blocks is the plan's figure for 11 to 20. 3 or 4 are allowed where the note shows the solve needs them.

**The timed breaker stays out of 11 to 15, in N4** (the architect's call). The reasons:
- **Josh has already placed it.** On TB-Q4's card he was offered "First in 11 to 15" and chose "In 16-20 (Recommended)". Moving it would overturn his answer, and only he can do that.
- **His timer ruling is worded for N4.** "Fuse + battery twist (Recommended)" makes a rated fuse force the two windows and relaxes the fuse-blow cap for those puzzles. 11 to 15 has no room for a blow opener: the cap's two openers are 8 and 19.
- **He has not played the trial.** `tb-two-clocks` is unplayed (TB6's criterion 3 is open), and N4's re-cut takes his words on it.

No timed breaker in 11 to 15.

**How far the rows may change.** Rows 11 to 15 of `puzzles/series-v1.md` (leave it open, meet in the middle, look from behind, which fuse, the fuse above) are a starting point only.
- **Free.** The designer may change:
  - names and slugs (id `sNN-<slug>`, name `"NN · <name>"`);
  - each row's trap, size, kit, targets, heavy building and layout;
  - which earlier ideas a puzzle combines, and its reasoning move;
  - the order of the five.

  A planned row may be replaced, or merged with another.
- **Fixed.**
  1. **One new concept each.** Each puzzle's new concept is a reasoning move that no series puzzle before it taught (Josh, N-Q2: "New move counts (Recommended)"). It is built on 1 to 10, and on whichever of 11 to 14 come before it.
  2. **Two new pieces, both in.** Only two new pieces may enter in 11 to 15: the **second feed** and the **nested (mother) fuse**. Both must enter here, because later rows lean on them: 22 and 25 on two feeds, 23 on a main fuse over its children. Each first appears in a puzzle where it is the new thing.
  3. **Nothing from later.** No relay, spring, battery or timed breaker.
  4. **Dropped moves are named.** A planned move can be dropped (the ring with a rating, reading from behind, which fuse). The designer then names, in its report, the later row that leaned on it, for N4's and N5's re-cuts. Two do: row 17 ("Relay + which fuse") leans on 14, and row 20 ("Battery + faults hide faults") on 13's look. Dropping a move is not a stop.
  5. **The plan follows what was built.** The designer rewrites rows 11 to 15 of the plan's section 3 table to what it built (same columns, one row each). It changes nothing else in `puzzles/series-v1.md`.

**What 1 to 10 taught** (the moves to build on; each note's own wording governs):

| # | The move |
| --- | --- |
| 1 | Trace the target's wire back to the feed |
| 2 | Only a switch with current changes anything |
| 3 | Choose what goes dark |
| 4 | Faults are read by current |
| 5 | Spend scarce parts only on the target's road |
| 6 | Open the dark before spending |
| 7 | Reroute instead of a repair you can't afford |
| 8 | A red breaker means "not yet": shed what shares its box |
| 9 | Which side of each break each target is on |
| 10 | A dead building draws nothing until its bulb goes in |

**Acceptance criteria.** Each criterion applies to each of the five, unless it says "the batch".
1. [ ] **On the city and checked.**
   - It meets N2's criterion 1: its city file and note are in `puzzles/city/` under its own id and name, on 6 x 6 seed 1, one-way on, with no `from`.
   - Every lamp is a building fed by its drop.
   - Its `district` lists 2 to 4 blocks that touch across a street (CK14). Each feed stands outside the district with one entering span, as CK14 requires.
   - `npm run check puzzles/city/` passes it, W1's rules included (reads outward, `FEED_CLEAR_M`, no crossing spans, own-block roofs).
   - Its capacities and ratings are raised for its scenery (`npm run fit -- --raise`).

   **test** (P1's sweep, unedited).
2. [ ] **Every block is needed** (Josh: "with intent").
   - Each block of its district holds at least one of these:
     - a move from the check block's solution (a throw, a switch set, a repair or a part fitted);
     - a fact the solve needs that can only be read there (a fault that shows, a number that turns).

     A wire passing through, the feed on its own, or scenery does not count.
   - At least one move on one block changes what the player can do or read on another. The blocks are one puzzle, not two puzzles side by side.
   - The note has a **Why each block** table: the block, what the player does or learns there, and why it can't be done on another block.

   **no test**.
3. [ ] **Harder, not just bigger** (Josh: "challenge the user based upon what they know and what they've learned from prior puzzles").
   - **What it builds on.** The note names the moves from 1 to 10 it builds on (by number, from the table above), and how it uses them against the player. Either the move those puzzles trained is the trap here, or two of them must be held at once.
   - **Depth of the read.** This is the plan's difficulty rule 1: how many facts the player must hold before the first move that can't be taken back. The note gives it. It is at least 2, and at least that of the deepest puzzle it builds on (read from that puzzle's note).
   - **No padding.** A second block that only repeats the first block's move does not count toward criterion 2.
   - **The batch climbs.** Each of 12 to 15 reads at least as deep as the one before it. Where it doesn't, the note says what else makes it harder, in the plan's order: fewer winning click orders, then a larger share of dead-end states.

   **no test**.
4. [ ] **Solvable per the analyzer, at or above the band for 6 to 15.**
   - `npm run analyze puzzles/city/<id>.city.json` finds a win. On a bigger map the designer may raise `--cap`, and says so.
   - The note gives:
     - fewest clicks;
     - winning configurations;
     - winning click orders;
     - the share of dead-end states;
     - the obvious wrong first move, with how it is read and how it is recovered.
   - **Floors**, which are never passed:
     - at least 3 clicks;
     - at least 1 hidden fact at the start (the note names each one, and what makes it readable);
     - at least 2 layers (the note names them);
     - dead ends readable, and recovered by a part or one Undo;
     - 1 winning configuration.
   - **Ceilings.** 6 clicks and 2 hidden facts may be passed under **Limits that block a better puzzle** (the series rules). The note then says so, and N4's re-cut raises its band to stay above it.

   **no test** (the sweep's check-block replay is the test that it wins).
5. [ ] **One new concept, and nothing from later**, under **How far the rows may change**, points 1 to 3.
   - The note names its concept, its reasoning move, and the earlier concepts it builds on.
   - **The batch:** the second feed and the nested fuse each appear, each first where it is the new thing.

   **no test**.
6. [ ] **A different place** (Josh: "different points on the map are used with each puzzle").
   - Its district shares no block with the puzzle before or after it. 11 shares none with 10's `block:1:7`.
   - Its set of blocks is not any earlier series puzzle's district.
   - At least one of its blocks has not been used by any series puzzle.
   - It may take in blocks that an earlier, non-neighbouring puzzle used (Josh, 25 Nov 2026: "You can even use the same nodes over again if it means increasing the complexity of the puzzle to spread across multiple districts").
   - Districts used by 1 to 10 (`s10-count-the-dark.md`): `block:4:8` (puzzle 1, there since NR), `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`.
   - `tb-two-clocks` (`block:6:6`, `block:6:8`) is not a series puzzle. Its places are like any other places.
   - The note names its blocks, the place table (node to place, line to its span chain, the street crossings between blocks included) and the running list of districts.

   **no test**.
7. [ ] **The series rules** (section N).
   - At most 8 of its own buildings and 4 faults. These may be passed under **Limits that block a better puzzle**.
   - **No "obvious breaker blows a fuse" opener in 11 to 15.** The cap's two openers are 8 and 19. Josh's relaxation ("Fuse + battery twist (Recommended)") is for N4's timer puzzles only.
   - "Fit it and it blows again" is no puzzle's trap.
   - A blow later in the solve is allowed: a readable dead end that a part recovers, named in the note.
   - No kit repeats on neighbours (10's was two fuses and a bulb).
   - The heavy building is not the same two puzzles running. 10 had none besides its target, the archive.
   - The note keeps the shrine count: 2 of 5 after puzzle 10.

   **no test**.
8. [ ] **No breaker, switch or fuse box on a branch pole** (the series rule, from Josh's play of 1 to 5; fuse boxes: "Same rule (Recommended)").
   - A branch pole is any pole where a third wire meets, scenery spans and drops included.
   - A breaker's or fuse box's pole carries only its one line in and one line out. A switch's pole carries its one line in and its two outs.
   - On a multi-block map, a span across a street that lands on a control's pole counts only if it is that control's own in or out.
   - **The two exceptions Josh allowed:**
     - A switch's out may go straight into a building's own drop ("Allow it (Recommended)"). Still, no pole has three spans mid-block.
     - `s05-not-that-one`'s breaker stays as laid ("Leave it (Recommended)"). It is **not a precedent**: no N3 control relies on it.
   - The place table gives, for each control and fuse box, its pole and every wire that meets there, read from the conversion, scenery included.

   **no test**.
9. [ ] **It reads from the default camera.**
   - Section J fits the opening frame to the puzzle's pieces. Every block of the district and every control, fuse box and target icon is in that frame and can be read.
   - The wrong move is not one red number deep (N2's criterion 6). The note says how the obvious wrong move reads with section V's load numbers and the NC2 hover cue.
   - The designer opens no browser. The main session checks each opening frame in the pane (or sends Josh screenshots while he is remote), and a frame that doesn't fit goes back to the designer.

   **browser**.
10. [ ] **The note** (as N2's criterion 7) has:
    - the intended read from the default camera, saying where each target building is;
    - **The trap**, in a line;
    - **Why each block** (criterion 2);
    - what it builds on, and its depth of read (criterion 3);
    - **Changed from the plan's row**: what changed and why;
    - **Limits passed**: none, or which limit, by how much, and why;
    - the check block with the solution;
    - the tribe's `priority` homes, with what the win costs them;
    - an empty **What it taught us**.

    **no test**.
11. [ ] **The batch: the designer's report** gives:
    - the five as built (id, name, concept, blocks);
    - every row change;
    - every limit passed;
    - every dropped move, with the later row that leaned on it.

    The main session takes the limits passed to Josh at **Show Josh**. **no test**.
12. [ ] The designer gives the time of P1's sweep on Josh's PC with the fifteen series puzzles in (`npx vitest run --maxWorkers=2 tools/fit.test.ts`), beside N1's and N2's figures. It is watched, not tuned here. **no test**.
13. [ ] **Josh plays** 11 to 15 from the stage select, after N3 merges (`npm run dev`, "start"). His verdict, in his words, goes under each note's **What it taught us**. N4 starts only on his word in chat. **browser**.

**Stop rule** (N2's, widened). The designer stops ("stop 081 N3", with the branch) in any of these cases:
- a puzzle can't be laid on a district of 2 to 4 blocks with the fit and the check as they are: W1's rules (crossing spans, reads outward, own-block roofs, `FEED_CLEAR_M`), `FIT_BUDGET`, a street crossing between blocks that the fit cannot place, or the analyzer unable to finish at any `--cap` Josh's PC can run (2 vitest workers, 7 of 8 cores);
- the second feed or the nested fuse can't be laid on the city;
- a puzzle needs a rule, schema or tool change;
- a puzzle needs every block only by breaking a series rule.

To get past a stop, it does not change W1's numbers, `FIT_BUDGET`, a tool, or anything in `puzzles/series-v1.md` outside rows 11 to 15. It reports what is short, and the architect re-cuts.

**Not a stop:** passing a size, click or hidden-fact ceiling under **Limits that block a better puzzle**, or dropping a planned move (point 4).

**Count.** 0.

**Files.** `puzzles/city/`: new `s11-...` to `s15-...` city files and notes only. In `puzzles/series-v1.md`: rows 11 to 15 of section 3's table only. **Must not:**
- `s01-...` to `s10-...`, `tb-two-clocks`, the pilots and P0 in `puzzles/city/`;
- the rest of `puzzles/series-v1.md` (its **What it taught us** included);
- `puzzles/SCHEMA.md` and `puzzles/locked/`;
- `tools/` and `src/`.

**Interfaces.** None. The second feed and nested fuses are in the schema and the simulator today (the plan's section 2), so `src/core/` gets no change. No new dependency.

#### N4 · Series v1, batch 4: puzzles 16 to 20 (puzzle-designer, Fable 5.2). Branch `ticket/081n4-series-batch-4`, from `main` 17ee737. **Approved to build** (Josh, 26 Nov 2026, on a card: "Start N4 (Recommended)"; the card read: "N4, series puzzles 16 to 20. It opens with the deliberate fuse blow at 16, then the relay, spring, battery and timed breaker, with free reuse of anything already introduced."). NB1 is puzzle 16, in this PR
**Re-cut in full 26 Nov 2026** from the named stub, to Josh's words. They are recorded at the top of section N, in the series rules (**The series' direction**, **Reuse is free**), in NB and in TB (relayed by the main session):
- "I want puzzles 11 through 25 to span multiple districts with intent."
- "The puzzle architect does not have to have the same names for the puzzles as they did before. I'm using Fable because I want it to build better puzzles, more complex puzzles that challenge the user based upon what they know and what they've learned from prior puzzles."
- "There really shouldn't be a limit to the number of puzzles that can leverage a mechanism per series. ... Any number of times for any reason after they've been introduced." On NB's cards: "At 16, first of N4 (Recommended)"; "Allow it too"; "Drop the 2-timer cap"; "As today (Recommended)".
- The timer: TB-Q4 "In 16-20 (Recommended)"; how its two windows are forced: "Fuse + battery twist (Recommended)", with its count ("at most once or twice in the series") struck by **Reuse is free**.

**How the two windows are forced** (kept from the stub; Josh, 26 Nov 2026, on cards, relayed by the main session). Asked on a card about forcing a timer puzzle's two windows with a fuse, he answered "What about batteries?". The analysis showed that a battery alone cannot force both windows. He chose **"Fuse + battery twist (Recommended)"**:
- **A rated fuse forces the two windows.** ~~It is used at most once or twice in the series.~~ (Struck: **Reuse is free**.)
- **A battery is the twist on the second timer puzzle:** "charge in A's window, spend it in B's". Whether that falls in N4 or N5 was left to this re-cut: it falls in N5 (**The order**, below).
- ~~The fuse-blow cap is relaxed for these.~~ (Moot: the cap is gone, section NB.)

Josh has not played 6 to 15 or `tb-two-clocks` yet (N2's criterion 9, N3's criterion 13 and TB6's criterion 3 are open). If his verdict on any of them lands while N4 builds, the main session brings it to the architect before N4 merges. His play of `tb-two-clocks` bears most on puzzle 20 (below), which is built last for that reason.

**Goal.** Puzzles 16 to 20 are on the city. Each brings in one new thing, in this order: blowing a fuse on purpose, the relay, the spring switch, the battery and the timed breaker. Each one is built on what 1 to 15 taught, spans two or more blocks for a reason the solve needs, and is harder than the one before it. Josh can play 16 to 20 from the stage select and say whether each new piece reads on the city and adds a real decision.

**What the tools do today (read 26 Nov 2026 at `main` 17ee737).** No code is needed before N4. The relay, spring, battery and timed breaker are in the schema, the simulator, the validator, the city check, the conversion, `npm run analyze` and `npm run check`. The overlay has a glyph and the picks table has a model for each, and the prompt words each one. The architect confirmed this as follows:
- **Relay and timed breaker.** `tb-two-clocks` has both (two relays, two timers, a rated box). It passes `npm run check puzzles/city/` and P1's sweep on `main`. TB2 made the analyzer, the check and the raise handle a timer.
- **Spring.** A scratch copy of `tb-two-clocks` with `r_a` turned into a spring passes the validator, the city check (CK12 to CK14, CK17) and the conversion. `npm run analyze` explored it exhaustively (277 states) and `npm run check` replayed its block. It does not win, as expected: the spring falls back when A's window shuts.
- **Battery.** A scratch copy of `s14-split-the-dark` with `br_1` turned into a battery (`capacity` 8, `input` `l_a4`, on the same pole) passes the validator, the city check and the conversion. Its scenery hangs on the battery's input side (`src/city/circuit/scenery.ts`). `npm run analyze` explored it exhaustively (1116 states, `wait` offered), and the check replayed `wait`, a release and a throw. Released, it lit the kiln and a scenery building past it.
- Neither scratch file was committed, and both were deleted.
- **What a designer must know** (SCHEMA, "Battery, derived rules"). A battery's current counts toward no feed, and is free of fuse and brownout checks. A lamp lit only by a battery never completes the job. The feed's current never passes through a battery. So the raise (section S) needs no battery case: scenery past a battery adds no load.
- **One gap, not blocking (question N4-Q2).** `loadPreview` gives breakers, switches and readable faults a number and an NC cue. It gives a battery's release neither, so hovering a battery does not show which wires it would light. Puzzle 19's note must say how the battery's reach is read without a cue.
- **The stop rule still covers the risk** that a real puzzle hits something the probes did not, such as a battery on a branch pole, a relay's third wire, or the analyzer's state count on a battery-and-timer map. On a tool gap the designer stops, and the architect cuts a grid-simulator section. Nothing in N4 is changed to get round it.

**The order, and why** (the architect's call; Josh approves or changes it on card N4-Q1). Five new concepts, each introduced once, in its own puzzle:

| # | New concept | Why here |
| --- | --- | --- |
| 16 | **The deliberate blow** (NB1) | Fixed by NB-Q1: "At 16, first of N4 (Recommended)". It is made only of pieces 1 to 15 taught: a rated box, capacity, a second feed or a mother box. So it is a pure "challenge with what you know", and it gives each later piece a tool: a blow can cut a relay's power after it is set, drop a spring, or cut a timer's window. |
| 17 | **The relay** | It comes before the timer, because the timer needs it. `tb-two-clocks` found that with breakers, switches and faults alone, an alternating pair can always be finished in one window. Work in the other window is needed only when something must be set ahead, and a relay is the piece that holds a setting but can be moved only while live. Battery puzzles also set relays (plan rows 19 and 21). |
| 18 | **The spring switch** | It is the relay's opposite: a relay keeps its place without power, and a spring loses it. Played right after 17, the two read against each other. It also gives 20 a piece to lose when a window shuts (TB rule 5). |
| 19 | **The battery** | It runs on the same real-seconds clock as the timer, and Undo does not rewind it. So 19 teaches "time is not undoable" on a clock the player starts, before 20 brings one the player can't touch. It comes after the relay, because a battery's first job is to set what the feed can't reach safely (plan row 19). |
| 20 | **The timed breaker** | Last, for three reasons. Josh's ruling forces its two windows with a rated fuse, which 8 and 16 have taught by then. Josh's card listed it last. Building it last gives his play of `tb-two-clocks` the most room to land first. TB-Q4 asked for it "on a plain 2-block map", so its district is 2 blocks. **The battery twist ("charge in A's window, spend it in B's") is the second timer puzzle's, so it goes to N5** (TB-Q4: "then a layer in N5"). |

This is also the order Josh's start card listed. **Plan rows that give way.** Row 16 ("Only moves live") and row 17 ("The back door") merge into 17, the relay. Row 18 stays the spring and row 19 stays the battery. Row 20 ("By cell light", battery + faults hide faults, which leaned on 13's look) gives way to the timer. Its "the window is a lantern" move is offered to N5. It may also be a layer in 19, but never 19's new concept.

**How far the rows may change** (N3's, carried over). Rows 16 to 20 of `puzzles/series-v1.md` are a starting point only.
- **Free:**
  - names and slugs (id `sNN-<slug>`, name `"NN · <name>"`);
  - each puzzle's trap, size, kit, targets, heavy building and layout;
  - which earlier moves it combines (the table below gives each one's floor);
  - its reasoning move, within its new concept.
- **Fixed:**
  1. **The order of the five new concepts** above. If Josh picks another order on N4-Q1, the main session tells the designer, and the architect re-words this list. 16 and 17 are the same in every option on the card.
  2. **One new concept each, each in its own puzzle, and nothing from later.** 16 uses no relay, spring, battery or timer. 17 uses no spring, battery or timer. 18 uses no battery or timer. 19 uses no timer.
  3. **The battery twist is not in 20.** If 20 has a battery, the battery does not carry charge from one window into the other. That move is the second timer puzzle's new concept (Josh's ruling), and in 20 it would be a second new concept.
  4. **Dropped moves are named.** The designer names, in its report, any planned move it drops that a later row leaned on, for N5's re-cut. Row 20's lantern (above) is already named. Row 21 ("Far one first", battery + order) and row 24 ("Hold the spring", battery + spring) lean on 19 and 18.
  5. **The plan follows what was built.** The designer rewrites rows 16 to 20 of the plan's section 3 table to what it built (same columns, one row each). It also makes NB1's criterion 5 change to the rules bullet. Nothing else in `puzzles/series-v1.md` changes.

**The five** (the starting point; each "builds on" is a floor, and the note may name more):

| # | Id | New concept and reasoning move | Builds on, at least | Starting point (free) |
| --- | --- | --- | --- | --- |
| 16 | `s16-<slug>` | **The deliberate blow** (NB1's goal). The target needs room that no breaker can make: the heavy load hangs under a rated box with no breaker of its own. So the player throws, on purpose, the red breaker that overloads that box. The box blows, its whole branch goes dark, and the target lights. The move: "red, on purpose: what does the blow take with it, and can I afford it?" | 3, 8, and 12 or 15 | NB1's goal. The obvious wrong move is the old shed from 3 or 8 (NB1's criterion 4). A spare fuse may give a designed "fit it and it blows again" trap (NB-Q2: "Allow it too"). |
| 17 | `s17-<slug>` | **The relay.** It moves only while current reaches it, and it keeps its place when the power goes. So whatever is on its line when it wakes is carried. Find a side that can carry that load while it is set, wake it from there, throw it, then take the power back. | 14, 2, 11 | Rows 16 and 17 merged. **Row 17 re-thought against s14's ring** (N3's outcome): s14 built "which fuse" as two boxes on a ring, with breakers that say which box carries which stretch, not the three-switch form row 17 was written on. So the "back door" is the other box's side of the ring: wake the relay through the box with room, set it, then split the ring again. A blow (16) may be how the door is shut. |
| 18 | `s18-<slug>` | **The spring switch.** It falls back to its file position when no current reaches it. Make before break: a second road must hold the spring before the first lets go. | 3, 12, 17 | Row 18: the heavy building on the first road must go dark to fit the feed, and opening its breaker drops the spring. Two feeds (12) make a natural hand-over. A blow on the holding road (16) drops the spring too, as a trap or a tool. The relay beside it (17) shows the difference. |
| 19 | `s19-<slug>` | **The battery.** It charges only while the feed's current reaches its input, and once released it powers its far side for its charge. It lights for reading and for setting, never for the win, and Undo does not rewind its clock. The move: use the battery's window to set or read what the feed can't reach safely, then let the feed in last. | 17, 6, and 8 or 16 | Row 19 ("the breaker is red and stays red; the cell's wire into the dark side is why it is there"). The battery wakes a relay (17). Reading a hidden fault by battery light (6, 13) may be a layer. The charge is the window, and the capacity can be tight enough that the order of clicks inside it matters. |
| 20 | `s20-<slug>` | **The timed breaker.** A clock feeds sections in turn. A rated fuse forces work in both windows (Josh's ruling): arriving unprepared blows the box and cuts the window's current. The move: before a window opens, set what its current will meet, in the window that can reach it. | 17, 8 and 16, 19 | `tb-two-clocks`' idea is the start, not a copy: its district set is s11's and may not be used again. A spring that falls back when its window shuts (18) and a blow that cuts a window (16) are the natural layers. Any number of timers on the map (NB-Q3). |

**Acceptance criteria.** Each criterion applies to each of the five, unless it says "the batch". Puzzle 16 also meets NB1's criteria 1 to 6, which are part of this PR.
1. [ ] **On the city and checked** (N3's criterion 1).
   - Its city file and note are in `puzzles/city/` under its own id and name, on 6 x 6 seed 1, one-way on, with no `from`.
   - Every lamp is a building fed by its drop.
   - Its `district` lists 2 to 4 blocks that touch across a street (CK14). 20's lists exactly 2 (TB-Q4: "a plain 2-block map"). Each feed stands outside the district with one entering span.
   - `npm run check puzzles/city/` passes it, W1's rules included (reads outward, `FEED_CLEAR_M`, no crossing spans, own-block roofs).
   - Its capacities and ratings are raised for its scenery (`npm run fit -- --raise`). On 20 that is the timed raise (TB2: the peak over every settle, flips included).

   **test** (P1's sweep, unedited).
2. [ ] **Every block is needed** (N3's criterion 2, as written).
   - Each block holds a move from the solution, or a fact the solve needs that can only be read there.
   - At least one move on one block changes what can be done or read on another.
   - The note has a **Why each block** table.
   - On 20, each clock's section has work that can't be moved to the other window. The note's **Windows** table (criterion 10) shows it.

   **no test**.
3. [ ] **Harder, not just bigger** (N3's criterion 3).
   - The note names the moves from 1 to 15 it builds on, by number (the table above is the floor; the moves of 11 to 15 are in their notes and in rows 11 to 15 of the plan). It says how it uses them against the player: either an earlier move is the trap, or two must be held at once.
   - **Depth of read** (facts held before the first move that can't be taken back) is at least 3, and at least that of the deepest puzzle it builds on.
   - **The batch climbs from 15** (depth 6). Each puzzle reads at least as deep as the one before it, starting with 16 against s15. Where one doesn't, the note says what else makes it harder, in the plan's order: fewer winning click orders, then a larger share of dead-end states, then more layers.
   - A second block that only repeats the first block's move does not count.

   **no test**.
4. [ ] **Solvable per the analyzer, within the band for 16 to 25.**
   - `npm run analyze puzzles/city/<id>.city.json` finds a win. On a bigger map the designer may raise `--cap`, and on a clock map it may change `--wait`; it says so if it does.
   - The note gives: fewest clicks, waits on the shortest win (19, 20), winning configurations, winning click orders, the share of dead-end states, `blowOnShortestWin`, and the obvious wrong first move with how it is read and how it is recovered.
   - **Floors**, which are never passed:
     - at least 5 clicks;
     - at least 1 hidden fact at the start (the note names each one, and what makes it readable);
     - at least 3 layers (the note names them);
     - 1 winning configuration;
     - the first wrong click is always recoverable, by a part, a wait or one Undo. On 19 and 20 Undo does not rewind time, so the note says which recovers it.
   - **Ceilings:** 10 clicks and 3 hidden facts. They may be passed under **Limits that block a better puzzle**, said in the note.
   - **The band is not raised for N3** (the architect's call). N3 passed one ceiling: s13 has 3 hidden facts, past 6 to 15's 2. That sits inside this band, and no N3 puzzle passed 6 clicks. The climb from s15's depth (criterion 3) is what keeps N4 above N3.
   - **On 19 and 20:** it wins at `--click-seconds 3` in the same fewest clicks (TB6's series rule, which applies to every clock map here). The note gives both runs side by side, as `tb-two-clocks.md` does.

   **no test** (the sweep's check-block replay is the test that it wins).
5. [ ] **One new concept, and nothing from later** (**How far the rows may change**, points 1 to 3).
   - The note names its concept, its reasoning move and the earlier concepts it builds on.
   - **The batch:** the deliberate blow, the relay, the spring, the battery and the timed breaker each appear, each first in its own puzzle, in the order above.
   - On 16, `blowOnShortestWin` names exactly the intended box (NB1's criterion 1).
   - On 17 to 20, the new piece is on the shortest win: the relay or spring is thrown, the battery is released, the timer's flips are needed. The note shows that the puzzle has no win without it.

   **no test**.
6. [ ] **A different place** (N3's criterion 6).
   - Its district shares no block with the puzzle before or after it. **16 shares none with s15's `block:4:8` and `block:5:8`.**
   - Its set of blocks is not any earlier series puzzle's district.
   - At least one of its blocks has not been used by any series puzzle.
   - It may take in blocks that an earlier, non-neighbouring puzzle used.
   - **Districts used by 1 to 15** (from `s15-the-fuse-above.md`): `block:4:8`, `block:6:1`, `block:8:1`, `block:3:0`, `block:8:7`, `block:0:8`, `block:6:11`, `block:6:3`, `block:0:4`, `block:1:7`, `block:6:6` + `block:6:8`, `block:7:1` + `block:8:1`, `block:3:0` + `block:0:0`, `block:0:4` + `block:0:2`, `block:4:8` + `block:5:8`.
   - `tb-two-clocks` is not a series puzzle, so its places are like any others. Its district set is s11's, though, so 20 can't have that set.
   - The note names its blocks, the place table (with the street crossings between blocks) and the running list of districts.

   **no test**.
7. [ ] **The series rules** (section N; **Reuse is free**).
   - Any mechanic 1 to 15 introduced, and any of 16 to 19 once its puzzle is past, may be used as often as the puzzle wants, as the trap, the tool or a layer. That includes a blow, which is free from 16 on, and in 16 itself is the concept.
   - "Fit it and it blows again" may be a designed trap (NB-Q2: "Allow it too"). It must be named in the note, and readable before the fit (`wouldBlow`'s warning, a number that turns). An undesigned re-blow is still off-track.
   - At most 8 of its own buildings and 4 faults. These may be passed under **Limits that block a better puzzle**.
   - No kit repeats on neighbours (15's was a fuse and a wire). The heavy building is not the same two puzzles running (15's was the long house).
   - The note keeps the shrine count: 2 of 5 after 15.
   - Any number of timed breakers on 20 (NB-Q3: "Drop the 2-timer cap").

   **no test**.
8. [ ] **No breaker, switch, relay, spring, battery or fuse box on a branch pole** (the series rule; N3's criterion 8). A timed breaker counts as a breaker.
   - A relay and a spring are switches. Each one's pole carries its one line in and its two outs. One out may go straight into a building's own drop ("Allow it (Recommended)").
   - A battery's pole carries its input and its one far-side line, like a breaker's.
   - `s05`'s exception is not a precedent.
   - The place table gives, for each control and fuse box, its pole and every wire that meets there, read from the conversion, scenery included.

   **no test**.
9. [ ] **It reads from the default camera, on the city** (N3's criterion 9, and N3's outcome on 12 and 15).
   - Section J's opening frame holds every block, control, fuse box, battery, timer ring and target icon, and each can be read.
   - The wrong move is not one red number deep. The note says how the obvious wrong move reads with section V's numbers and the NC2 cue. On 16 that means the red "+N" and the box's "x of y" (NB1's criterion 2). On 20 it means the timer's ring and its next-flip number and cue.
   - **A fact the solve needs reads on the city, not only in the HUD.** s12 and s15 lean on things only the HUD shows: which feed carries a building, and a feed's total (s12's note). N4 does not build on that unread. If a solve needs a fact the HUD alone shows, the note says which fact and why nothing on the city gives it, and lists it under **To watch**. The main session takes it to Josh at **Show Josh**. It is not a stop.
   - **A battery has no number or cue** (question N4-Q2). 19's note says how the player reads what the battery will power: the dark job wires past it, the relay or fault it reaches, its charge glyph.
   - The designer opens no browser. The main session checks each opening frame in the pane (or sends Josh screenshots while he is remote). A frame that doesn't fit goes back to the designer.

   **browser**.
10. [ ] **The note** (N3's criterion 10) has:
    - the intended read from the default camera, saying where each target building is;
    - **The trap**, in a line;
    - **Why each block**;
    - what it builds on, and its depth of read;
    - **Changed from the plan's row**, saying which plan rows it merges or replaces;
    - **Limits passed**;
    - the check block with the solution;
    - the tribe's `priority` homes, with what the win costs them (on 16, what the blow takes dark: NB1's criterion 3);
    - **To watch when Josh plays it**;
    - an empty **What it taught us**.

    On 19 and 20 the note also has a **Windows** table, giving each window (the battery's charge, each clock's share) and what is done in it, as `tb-two-clocks.md` has. That is TB6's rule.

    **no test**.
11. [ ] **The batch: the designer's report** gives:
    - the five as built (id, name, concept, blocks);
    - every row change and merge;
    - every limit passed;
    - every fact only the HUD shows (criterion 9);
    - every dropped move, with the later row that leaned on it.

    The main session takes the limits passed and the HUD facts to Josh at **Show Josh**. **no test**.
12. [ ] The designer gives the time of P1's sweep on Josh's PC with the twenty series puzzles in (`npx vitest run --maxWorkers=2 tools/fit.test.ts`), beside N1's, N2's and N3's figures. It is watched, not tuned here. A clock map replays in real-time steps, so if 19 or 20 adds more than 2 s, the designer says so. **no test**.
13. [ ] **Josh plays** 16 to 20 from the stage select, after N4 merges (`npm run dev`, "start"). His verdict, in his words, goes under each note's **What it taught us**. NB1's criterion 6 is 16's. N5 starts only on his word in chat. **browser**.

**Stop rule** (N3's, widened). The designer stops ("stop 081 N4", with the branch) in any of these cases:
- a puzzle can't be laid on a district of 2 to 4 blocks (exactly 2 for 20) with the fit and the check as they are. That covers W1's rules, `FIT_BUDGET`, a street crossing the fit can't place, and the analyzer being unable to finish at any `--cap` Josh's PC can run (2 vitest workers, 7 of 8 cores);
- **a relay, spring, battery or timed breaker can't be placed, converted, analyzed or replayed on the city** as the probes above say it can;
- a puzzle needs a rule, schema or tool change. That includes a battery cue or a feed tint, if a puzzle can't be read without one;
- a puzzle can keep its concept only by breaking a series rule;
- 16 can make the blow the only win only by breaking one (NB1's stop).

To get past a stop, the designer does not change W1's numbers, `FIT_BUDGET`, a tool, or anything in `puzzles/series-v1.md` outside rows 16 to 20 and NB1's bullet. It reports what is short, and the architect re-cuts (on a tool gap, with a grid-simulator section first).

**Not a stop:** passing a size, click or hidden-fact ceiling under **Limits that block a better puzzle**, dropping a planned move (point 4), or a fact only the HUD shows (criterion 9).

**Count.** 0.

**Files.**
- `puzzles/city/`: new `s16-...` to `s20-...` city files and notes only.
- `puzzles/series-v1.md`: rows 16 to 20 of section 3's table, and the one rules bullet in NB1's criterion 5.

**Must not:**
- `s01-...` to `s15-...`, `tb-two-clocks`, the pilots and P0 in `puzzles/city/`;
- the rest of `puzzles/series-v1.md` (its **What it taught us** included);
- `puzzles/SCHEMA.md` and `puzzles/locked/`;
- `tools/` and `src/`.

**Interfaces.** None. Every piece is in the schema, the simulator and the tools today (above), so `src/core/` gets no change. No new dependency.

**Questions for Josh** (open question 31). N4 is approved to build. The designer can build 16 and 17 while these are open, since they are the same in every option; 18 to 20 wait on N4-Q1.
- **N4-Q1, the order of 17 to 20, and the rows that give way:**
  - "Relay, spring, battery, timer (Recommended)": as cut above, and the order your start card listed. Plan rows 16 and 17 merge into the relay. Row 20 ("By cell light") gives way to the timer. The battery twist is the second timer puzzle, at 21 in N5.
  - "Timer at 19, battery twist at 20": the battery's first puzzle is also the second timer puzzle. That keeps the twist inside N4, but the battery never gets a puzzle without a clock that it doesn't control.
  - "Timer at 18, after the relay": the spring moves to 19 and the battery to 20. The timer then can't lean on the spring.
- **N4-Q2, a cue for the battery** (not blocking): the hover cue and the load numbers cover breakers, switches and breaks, not a battery's release.
  - "Wait until you play 19 (Recommended)": 19's note says how its reach reads without a cue.
  - "Cut it now": a grid-simulator section (the release's lines in `loadPreview`), then a renderer one. 19 then waits for both.

#### N5 · Series v1, batch 5: puzzles 21 to 25 (puzzle-designer, Fable 5.2). Branch `ticket/081n5-series-batch-5`. **Waiting** on Josh's word
Named, not cut in full; it starts only on Josh's word in chat (after N4 merges), re-cut to what he says first.
- **Josh's direction, 26 Nov 2026** (the series rules' **The series' direction**): "Puzzles 21 through 25. Should not only span multiple districts but should also include multiple layers of puzzle solving that span multiple districts." and "The puzzle architect does not have to have the same names for the puzzles as they did before. I'm using Fable because I want it to build better puzzles, more complex puzzles that challenge the user based upon what they know and what they've learned from prior puzzles." Each of 21 to 25 spans several districts, and its layers of solving cross them (a layer begun in one district is finished or undone in another; the note names each layer and its districts); it challenges with what 1 to 20 taught; names and slugs are the designer's. The re-cut says how far the rows below may change.
- **As planned:** rows 21 to 25 (far one first, move the meeting, the priests' list, hold the spring, the whole chain), ids `s21-...` to `s25-...`. Batteries in 21, 24 and 25.
- **The rows are a starting point** (Josh, 26 Nov 2026, above), as in N4. The re-cut says how far rows 21 to 25 may change, and reads what N3 and N4 changed and dropped. Row 22 leans on two feeds, row 23 on a main fuse over its children, row 25 on both.
- **Harder, on what 1 to 20 taught** (N3's criteria 2 and 3 carry over, with the layers): every block of the district is needed, with a **Why each block** table; the note names each layer, the blocks it crosses, the earlier moves it builds on and its depth of read.
- **Limits that block a better puzzle** (the series rules) apply, as in N3 and N4.
- **The timed breaker is a layer here** (TB-Q4: "then a layer in N5"). If the second timer puzzle, the battery twist ("charge in A's window, spend it in B's"), falls in 21 to 25, Josh's ruling "Fuse + battery twist (Recommended)" applies to it as N4 words it (the relaxed blow cap is moot: the cap is gone, section NB).
- **Criteria as N4's** (the band for 16 to 25), with districts of 3 or 4 blocks. ~~No fuse-blow opener (19 was the last), except where Josh's timer ruling relaxes the cap.~~ (Dropped 26 Nov 2026: **Reuse is free**.) Every mechanic 1 to 20 introduced may be used, the deliberate blow (NB) included, as often as the puzzle wants. The shrine count closes at 5 or fewer.
- **What N4 hands on** (N4's re-cut, 26 Nov 2026; on N4-Q1's recommended answer). The second timer puzzle, with the battery twist ("charge in A's window, spend it in B's"; Josh's ruling "Fuse + battery twist (Recommended)"), is the first puzzle of N5, likely 21 (plan row 21, "Far one first", battery + order, is its natural home). Plan row 20's "the window is a lantern" move (battery + faults hide faults, on 13's look) was given way to the timer, and is offered here. Rows 21 and 24 lean on 19 (the battery) and 18 (the spring). The re-cut reads N4's report for every other dropped move and every fact only the HUD shows.
- **Josh plays** 21 to 25. Count 0. Files: `puzzles/city/` only.

#### NB · Fuses as a tool: the deliberate blow, and no cap on a mechanic once it is introduced. Cut 26 Nov 2026 on branch `ticket/081-fuse-shed`. **Approved (G1) 26 Nov 2026**: "Approve NB (Recommended)". No code; NB1 is puzzle 16, in N4 ("At 16, first of N4 (Recommended)")
**Josh's answers, 26 Nov 2026, on cards (relayed by the main session):** G1 "Approve NB (Recommended)"; NB-Q1 "At 16, first of N4 (Recommended)"; NB-Q2 "Allow it too"; NB-Q3 "Drop the 2-timer cap"; NB-Q4 "As today (Recommended)". Recorded where each applies: the series rules (**Reuse is free**), N4, TB6's rule list, NB1 and open question 30.

**Josh's words, 26 Nov 2026, in chat (relayed by the main session):**
- "I would like the game the game to include challenges where you intentionally blow fuses to resuce load on a branch to complete objectives as well." **Read** ("resuce" as "reduce"): puzzles where blowing a fuse on purpose is part of the solution. The blow cuts its box's whole branch off the feed, so the feed (or a box above it) can hold what the priests asked for.
- "There really shouldn't be a limit to the number of puzzles that can leverage a mechanism per series. If the mechanics are to build on top of one another then fuses should be able to be leveraged in any puzzle. Any number of times for any reason after they've been introduced." **Read:** written into the series rules as **Reuse is free**, and the fuse-blow cap is dropped (below).

**The rules already allow it (read at `ticket/081-fuse-shed`, from `cleanup/2026-11-26-b`, 9962740).** No grid, analyzer, check, validator or schema change is needed:
- **What a blow does to its branch** (`src/grid/grid.ts`, `settle`). When a settle finds a powered, unfaulted fuse box whose would-be-lit load passes its `rating`, it adds a `blown-fuse` fault at the box and settles again. Flow stops at a faulted node, so everything past the box goes dark and its load leaves the feed's sum and every box above it. The blow is checked before brownout (SCHEMA, "Fuse blow"), so one throw that would brown the feed out can instead blow a box under it and end with the feed in limits. `complete` asks only that every target is lit and no feed is over; a blown box elsewhere does not stop the win, and the win lands in the same settle.
- **What it costs.** A blow spends no part. The box's whole branch stays dark for the rest of the job, the tribe's homes on it included. Getting any of it back costs a fuse from the kit (`repair:<box>`, allowed on a rated box), and the fuse holds only if the load past the box now fits (else `wouldBlow` warns, and it blows again). Undo takes the blow back (the history clones the faults), so trying a blow is free; on a timer or battery map Undo does not rewind time. So the caller's "each blow uses a fuse and a part" is true only when the solution needs that branch back later.
- **The analyzer** (`tools/analyzerun.ts`) plans through a blow as through any move: the blown fault is part of the state key, a blown state is a dead end only if no win is reachable from it, and the report already lists `blowOnShortestWin` (the boxes that blow on some shortest win) beside `blowAnywhere`. A deliberate-blow puzzle reads as: its box is in `blowOnShortestWin`, and no other box is.
- **The check block** (SCHEMA, "Design checks"; `tools/checkrun.ts`). A solution may contain the throw that blows; it need only complete. The blow is pinned without a new field because the puzzle is built so that the solution's end state browns out (or leaves the target dark) without it, so a simulator change that stopped the blow fails the replay. A trap's `expect.blown` names the boxes that blew in its moves (the wrong box, say), and `recover` may start with `undo`.
- **The load numbers and the cue** (V2, NC1, `src/grid/preview.ts`). The breaker whose throw blows the box shows its `delta` before the blow (V-Q4, "+3, load added (Recommended)"), red because a box blows; the NC cue shows the lines that throw makes live, from the fuses-lifted run (NC1's criterion 1), not the branch the blow darkens. So on the deliberate move the player sees a red "+N" and must work out what the blow takes off: the box's "x of y" label says what hangs under it. After 8 taught "a red breaker means not yet", the new read is "red, on purpose: what does the blow take with it?" Josh kept that as the deduction (NB-Q4: "As today (Recommended)"): the numbers and the cue do not change.

**No Decided rule conflicts.** Read in `rest-gdd` (`docs/05-gameplay.md`, `docs/open-questions.md`) and the brief's "Rules carried over":
- Decided: "Breakers shut a section off, switches divert power, and fuse boxes take fuses." A deliberate blow uses the box as it is; it does not make the box a control.
- Decided (the brief): parts and their faults ("blown fuse → fuse"), the signature ("current into a fuse box and none out"), "Faults hide faults" (a deliberate blow hides what is past it, as any blow does), "The Relight can't be interrupted". All unchanged.
- The fuse rating and capacity are the brief's **Draft** minigame rules; nothing Decided says a blow is a failure, caps fuses, or makes a blow cost favor. The GDD's "Capacity and restraint" (Draft) frames shedding as restraint; a deliberate blow is a blunter shed whose cost is the whole branch and a fuse to get it back. Not a conflict; worth Josh's eye when he plays it.
- Out of this scope, for the walking game later: the Decided shock rule ("Death by shock (two shocks in a night, or one on a high-power line)") does not apply here (no shocks in the minigame); whether blowing a fuse by hand shocks Enoch is a question for the street layer, not this ticket.
- No `tickets/rules-coverage.md` row moves: no rule changes.

**What "Reuse is free" overturns** (each recorded where it stands, struck through, with these words):
1. The plan's series rule, approved with the plan on 25 Nov 2026 ("Approve, batches (Recommended)"): "'The obvious breaker blows a fuse' opens at most two puzzles (8 and 19)". Struck in the series rules above, and in N4 ("The only ... opener is 19") and N5 ("No fuse-blow opener (19 was the last)").
2. The count in the timer ruling, "Fuse + battery twist (Recommended)": "It is used at most once or twice in the series." The ruling's design stays: a rated fuse forces the two windows, and a battery is the twist on the second timer puzzle. Its "the fuse-blow cap is relaxed for these" is moot.
3. Done sections built under the cap (N1 criterion 5, N2 criterion 5, N3 criterion 7, "No opener in 11 to 15") are history: no puzzle in 1 to 15 is reworked for it.
4. On Josh's cards: the ban on "fit it and it blows again" as a trap (the plan's rule; NB-Q2: "Allow it too", now allowed as a designed trap) and TB6's "at most 2 timed breakers on a map" (NB-Q3: "Drop the 2-timer cap").

**Not overturned:** the order mechanics are introduced in ("nothing from later"); one new concept per puzzle; the band floors; the branch-pole rule; the shrine at most 5 times; no kit or heavy building repeated on neighbours (NB-Q3).

**Where it goes, and how the first one teaches** (NB-Q1: "At 16, first of N4 (Recommended)"). **Puzzle 16, the first of N4**, before the relay. It is a new reasoning move made only of what 1 to 15 taught (breakers, a rated box, capacity, two feeds or a nested box), so it is the "challenge with what you know" Josh asked of 11 on, and it gives the new pieces after it a tool to combine with: a blow to drop a spring back (18), to leave a relay dark where it stands (16, 17), or to force a timer's windows (TB). N4 already holds relay, spring, battery and the first timer in five slots, with one row giving way for the timer (TB-Q4); with NB1 the re-cut gives way or merges a second row (the designer proposes, Josh approves at N4's re-cut).

#### NB1 · The first deliberate blow (puzzle-designer, Fable 5.2). Puzzle 16, in N4's PR (NB-Q1: "At 16, first of N4 (Recommended)"); N4's re-cut carries these criteria (done 26 Nov 2026: N4's criteria apply to it beside these)
**Goal.** The player meets a feed (or a mother box) that cannot hold the target, a heavy branch that no breaker can shed, and a rated box over that branch; they throw the breaker that overloads the box on purpose, the box blows, the branch goes dark, and the target lights. After it, any puzzle may use a blow as a tool.

**Acceptance criteria** (beside N4's criteria for the puzzle's slot):
1. [ ] **The blow is the move.** The analyzer's `blowOnShortestWin` names exactly one box, the intended one, and every winning configuration has it blown. The note shows, by the analyzer or by a trap, that no win exists with that box unblown (no breaker, switch or repair sheds the branch instead). **no test** (P1's sweep replays the check block; the solution's end state browns out or leaves the target dark without the blow, as the note shows).
2. [ ] **It reads before it is made.** From the default camera, with V's numbers and the NC cue: the target's road and its red number, the box's "x of y" and what hangs under it, and the breaker whose throw blows it (red "+N") can all be read; the note says how the player gets from "red means not yet" (8) to "red, on purpose" here, and which fact tells them the blow is affordable. **no test** (the main session checks the frame in the pane, as N3's criterion 9).
3. [ ] **The cost is real.** The note names what the blow takes dark (the tribe's `priority` homes on the branch included) and whether the kit holds a spare fuse. If it does, fitting it back is a readable trap (`wouldBlow` warns, or it lights something that browns the feed), recovered by Undo; it may be a designed "fit it and it blows again" trap (NB-Q2: "Allow it too"), named in the note and readable before the fit. It is not the puzzle's new concept: that is the deliberate blow. **no test**.
4. [ ] **The obvious wrong move is the old move.** The obvious wrong first move is a shed the player learned in 3 or 8 (opening a breaker that darkens the target's own road, or the wrong box's branch); its trap in the check block holds and recovers. **no test**.
5. [ ] **The plan follows.** The designer rewrites, in `puzzles/series-v1.md` section 3, the bullet "'The obvious breaker blows a fuse' opens at most two puzzles (8 and 19). 'Fit it and it blows again' is the trap of none." to **Reuse is free** with Josh's words, its second sentence replaced by NB-Q2's ("Allow it too": allowed as a designed trap), and TB6's 2-timer cap noted as dropped (NB-Q3); and the row for this puzzle as built. Nothing else in the plan outside N4's rows. **no test**.
6. [ ] **Josh plays it.** His verdict, in his words, under **What it taught us**. **browser**.

**Count.** 0. **Files.** `puzzles/city/` (the new puzzle's file and note, in N4's PR); `puzzles/series-v1.md` (the one rules bullet and N4's rows). **Must not:** `src/`, `tools/`, `puzzles/SCHEMA.md`, `puzzles/locked/`, `s01` to `s15`.

**Interfaces.** None. No `src/core/` type, no event, no new dependency.

**Stop rule** (N3's). The designer stops ("stop 081 NB1") if the puzzle cannot make the blow the only win without a rule, schema or tool change, or without breaking a series rule.

**Questions for Josh (G1 card), answered 26 Nov 2026 on cards:** G1 "Approve NB (Recommended)"; NB-Q1 "At 16, first of N4 (Recommended)"; NB-Q2 "Allow it too"; NB-Q3 "Drop the 2-timer cap"; NB-Q4 "As today (Recommended)". Nothing in NB is open. *As asked:* G1 ("Approve NB (Recommended)" / "Approve the rules, hold the puzzle" / "Not now"); NB-Q1 where the first deliberate blow goes ("At 16, first of N4 (Recommended)" / "In N5 (21 to 25)" / "After 25, a new batch"); NB-Q2 "fit it and it blows again" as a trap ("Keep it out (Recommended)" / "Allow it too"); NB-Q3 the per-map and variety rules ("Keep them (Recommended)" / "Drop the 2-timer cap too" / "Drop them all"); NB-Q4 how the deliberate blow reads ("As today (Recommended)" / "The cue shows what the blow darkens").

### TB · The timed breaker: a clock feeds sections in turn. Cut 26 Nov 2026 for G1, in six PRs: TB0, then TB1 with TB2, then TB3, TB4 and TB5 side by side, then TB6. **Approved (G1) 26 Nov 2026**: "Approve (Recommended)"
**Merged 26 Nov 2026** (Josh's words from the merge commits): TB1b1 by PR #110 ("Merge, start TB1b2 (Recommended)"); TB1b2 by PR #112 and the cityframe timeout by PR #111 ("Merge both (Recommended)"; the timeout on its own card: "15 s timeout (Recommended)"); TB1b3 by PR #113 ("Merge (Recommended)"); TB6 by PR #114 ("Merge (Recommended)"). The cityframe timeout is not a section of this ticket. It gives E3's opening-frame case in `src/render3d/cityframe.test.ts` a 15 s timeout, after CI timed out at 5 s twice. It is recorded here because it merged alongside TB1b2.

**Josh's request, 26 Nov 2026, in chat:** "I want to add another puzzle piece. I want to add a timed breaker I think it would add an interesting twist to a puzzle if a timer powered different sections at different times and you had to work between them." (He corrected "10 interesting twist" the same day: "Add an interesting twist".)

**Josh's answers, 26 Nov 2026, on cards (relayed by the main session):**
- **TB-Q1, what drives its timer:** "Real seconds (Recommended)". Rule 3 stands: real seconds on the battery's clock, from the first move.
- **TB-Q2, its form:** "Breaker, on/off (Recommended)". A breaker only; no timed switch.
- **TB-Q3, can the player touch it:** "Clock only (Recommended)". Rule 1 stands: a click is refused.
- **TB-Q4, where it enters the series:** "In 16-20 (Recommended)". First in N4 (16 to 20) on a plain 2-block map, then a layer in N5. The series stays at 25, and one planned row gives way at N4's re-cut.
- **G1 for the whole section:** "Approve (Recommended)". The architect's calls (the schedule on screen, the clock starting at the first move, the breaker's model) stand as written.

The reasoning, the table of how it meets the existing pieces and a worked example are in `docs/design/081-TB-timed-breaker.md`. The rule below was written to the recommended answers, and Josh picked each of them, so it stands as cut.

**The rule** (approved with the section, 26 Nov 2026).
1. **What it is.** A timed breaker is a breaker (`BreakerNode`) with a `timer`. The clock throws it; the player never does. A click on it is refused, as a click on a dead relay is (`throwBreaker` returns false, and `src/play/` voices `play:click` `refused`). Breakers carry no faults, and neither does a timed breaker.
2. **Its cycle.** `timer: { closed, open, offset? }`, in whole seconds. It is closed for `closed` seconds, then open for `open` seconds, and repeats. `offset` is where in that cycle it stands when the clock starts (default 0, closed). Two timed breakers out of phase (closed 6, open 6, offsets 0 and 6) feed two sections in turn: "a timer powered different sections at different times".
3. **What drives it** (TB-Q1). Real seconds, on the battery's clock (`Grid.advance`). **The clock starts at the player's first move** (a throw, a repair or a battery release), so reading the map costs nothing. Undo and Reset are not moves. Before the first move every timed breaker holds its `offset` position. Reset returns the clock to "not started".
4. **Time is not undoable** (as the battery). Undo restores the other breakers, the switches, the faults and the parts. It leaves the clock and each timed breaker where they are, then settles.
5. **A flip is a settle, not an action.** It does not count toward `actions` and is not an undo step. It emits `breaker:thrown` with `timer: true`, then `grid:changed` with reason `"time"`. The settle runs as it does after a throw:
   - a fuse over its rating blows (`fuse:blown`'s culprit is the largest lamp the flip newly fed);
   - a brownout enters or clears;
   - a spring that no current reaches falls back;
   - a relay keeps its place;
   - a battery charges only while its input is live.
6. **Flips at the same moment are one settle.** Timed breakers that flip at the same instant flip together, then the grid settles once. So an alternating pair is never closed together or open together, even for a moment.
7. **Faults hide faults** (Decided, held). Nothing past an open timed breaker reads. A fault there is readable, and repairable, only while its window is open. Section V's `known` keeps a fault read in an earlier window counted in the numbers, as today.
8. **The Relight can't be interrupted** (Decided, held). The win is judged after every settle, flips included. Once the job is complete the clock stops: no flip and no event follow.
9. **The schedule is on screen** (the architect's call; Josh may overturn it). The icon shows the cycle, where the clock stands and the seconds to the next flip. Hovering shows what the next flip will change. In the last 3 s before a flip, that is shown without hovering, and its load number is red if the flip will brown out or blow a fuse.
10. **On the city it is a breaker.** It uses the same place rules (pole need 2, the branch-pole rule, W1's rules) and the breaker's picked model, with the overlay's ring telling it apart, as the overlay tells the spring and the junction apart (the architect's call; Josh may ask for a model card). The fit and the check place it with no change.

**No Decided rule changes.** Rules 7 and 8 hold "Faults hide faults" and "The Relight can't be interrupted" as worded. A closed timed breaker conducts and an open one cuts everything downstream, as "Breakers conduct unless faulted" and "A breaker cuts everything downstream" say. The GDD's breaker table is Draft and is not reworded (question 20). The night's 15 minutes (07, Decided) are the street layer's and are untouched. **No `pipeline-designer` pre-check:** no city grammar rule or number changes (rule 10). **No new dependency.**

**Order.**
| PR | Section | Owner | After | Tests |
| --- | --- | --- | --- | --- |
| 1 | TB0, the types, the validator and the schema. **Done** (#104) | lead-architect | G1 | at most 2 |
| 2 | TB1, the rule (pure), with TB2, the analyzer, the check and the raise. **Done** (#105) | grid-simulator | TB0 merged | at most 6 + 3 = 9 |
| 3 | TB3, the timer drawn. **Done** (#109) | renderer | TB1 merged | at most 3 |
| 4, beside 3 | TB4, the prompt and the log. **Done** (#108) | interaction | TB1 merged | at most 2 |
| 5, beside 3 | TB5, the sound. **Done** (#106) | sound | TB0 merged (it codes against the events and `SoundView`) | at most 2 |
| 6 | TB6, a trial puzzle for Josh. **Done** (#114) | puzzle-designer (Fable 5.2) | TB1 to TB4 merged (TB5 may follow) | 0 |
| — | Where it enters the series (TB-Q4: "In 16-20 (Recommended)"; N3 keeps it out) | lead-architect | Josh plays TB6 | at N4's re-cut |
| 7 | TB1b1, the joint-flip preview (follow-up; approved). **Done** (#110) | grid-simulator | TB1 merged (now) | at most 2 |
| 8, beside 7 | TB1b3, the preview once per change, not per frame (follow-up; approved). **Done** (#113) | ui | TB1 merged (now) | at most 1 |
| 9 | TB1b2, the next cue for every timer (follow-up; approved). **Done** (#112) | renderer | TB1b1 and TB3 (#109) merged | 0 added, 1 rewritten |

#### TB0 · The timed breaker's types, its validation and its schema entry (lead-architect). Branch `ticket/081tb0-timer-types`, after G1. **Done** (PR #104, 8ccb14d; Josh, 26 Nov 2026, on a card: "Merge, start TB1 (Recommended)"); built by the lead-architect, 2 cases added
**Goal.** The builders code against one contract: a puzzle file can carry a timed breaker, the loader rejects a bad schedule with a clear message, and `puzzles/SCHEMA.md` says what it does.

**Acceptance criteria.**
1. [ ] **The types** (as in Interfaces, below) are in `src/core/`: `BreakerTimer` and `BreakerNode.timer?`; `TimerReadout` and `TimerState` in `state.ts`; `breaker:thrown`'s `timer?: true`; `LoadPreviewEntry.timed?: true`; `SoundView.timers?`. Typecheck passes on `main` with no other change. **no test**.
2. [ ] **The validator.** `validatePuzzle` (and so `validateCityPuzzle`) accepts a timer only on a breaker; `closed` and `open` whole numbers from 2 to 30; `offset` a whole number from 0 to below `closed + open`. The node's `closed` must match where the timer stands at `offset`. **The map's cycle** (the least common multiple of every timer's `closed + open`) is at most 60 s. Each error names the node. **test**: 1 case, a fixture with a good timer and five bad ones (on a switch, a fraction, out of range, `closed` disagreeing, a cycle over 60).
3. [ ] **The check's moves.** `validateCheck` rejects a click on a timed breaker ("a timed breaker is thrown by its clock"). **test**: 1 case, or folded into criterion 2's.
4. [ ] **`puzzles/SCHEMA.md`** gains a "Timed breaker" row and derived rules (rules 1 to 8 above), in the manner of the battery's. **no test**.
5. [ ] **`tickets/rules-coverage.md`** adds TB1 to "Breaker cuts downstream", "Faults hide faults", "Fuse rating" and "The Relight can't be interrupted". **no test**.

**Count.** At most 2. **Files.** `src/core/schema.ts`, `state.ts`, `events.ts`, `preview.ts`, `audio.ts`, `load.ts`, `check.ts`, `load.test.ts`, `check.test.ts`; `puzzles/SCHEMA.md`; `tickets/rules-coverage.md`. **Interfaces.** Below. No new dependency.

#### TB1 · The timed breaker's rule (grid-simulator, pure). Branch `ticket/081tb1-timer-rule`, after TB0; one PR with TB2. **Done** (PR #105, 08d6765; Josh, 26 Nov 2026, on a card: "Merge, start TB3-5 (Recommended)")
**Goal.** On `src/grid/`, a timed breaker opens and closes on its schedule from the first move, and every existing rule meets it as rules 1 to 8 say, so a puzzle can be built on it and replayed.

**Acceptance criteria.**
1. [ ] **The schedule.** `advance` flips each timed breaker at its times, from the first move. Before the first move it does nothing to timers. `GridState.clock` is null until the first move, then counts seconds. `GridState.timers` gives each timed breaker's `closed` and `next` (seconds to its next flip). `throwBreaker` on one returns false. A flip emits `breaker:thrown` `{ timer: true }` and `grid:changed` `"time"`, and does not count toward `actions`. Reset returns the clock to null. **test**: 1 case.
2. [ ] **Not undoable.** Undo after a flip restores the last move's other state, but not the clock or the timed breaker. **test**: 1 case (or folded into criterion 1's).
3. [ ] **One settle per moment** (rule 6). An alternating pair flipping at the same instant never shows both closed or both open in any state the grid reports, and emits one `grid:changed`. **test**: 1 case.
4. [ ] **It meets the other rules** (rule 5). On one fixture:
   - a flip that powers too much load blows a rated fuse, with the culprit the flip fed;
   - a flip browns the feed out, and the next flip clears it;
   - a relay past the timer is refused while the window is shut and throwable inside it;
   - a spring past it falls back when the window closes;
   - a battery past it charges only during the window.

   **test**: at most 2 cases.
5. [ ] **Faults hide faults, and the Relight** (rules 7 and 8, Decided). A damaged cable past an open timer is not readable and `repairAt` returns `unreadable`. In the window it reads and mends. After `job:completed`, `advance` flips nothing and emits nothing. **test**: 1 case.
6. [ ] **The preview** (`loadPreview`). A timed breaker's entry is its next flip's what-if: `kind` `"breaker"`, `timed: true`, with `delta`, `over`, `blows` and `lines` as for a throw. A player breaker's entry is unchanged (V2's and NC1's cases pass unedited). **test**: folded into criterion 4's fixture, or 1 case at most within the count.
7. [ ] `src/grid/` stays pure (the existing purity case). A map without a timer plays exactly as before (the existing suites, unedited). **test** (existing).

**Count.** At most 6. **Files.** `src/grid/grid.ts`, `types.ts`, `preview.ts`, and a new `src/grid/timer.test.ts`. **Must not:** any other folder. **Interfaces.** TB0's. No new dependency.

#### TB2 · The analyzer, the check and the raise on a timed map (grid-simulator). Branch `ticket/081tb1-timer-rule` (one PR with TB1). **Done** (PR #105, with TB1)
**Goal.** `npm run analyze`, `npm run check` and `npm run fit -- --raise` give true answers on a map with a timed breaker, so the designer can build one and the reviewer can trust its numbers.

**Acceptance criteria.**
1. [ ] **The analyzer's state.**
   - The key adds whether the clock has started and its phase (elapsed seconds modulo the map's cycle, in half-seconds).
   - The `wait` move is offered on a map with a timer as well as one with a battery.
   - The report gives the shortest win's waits. On a fixture whose only win needs a wait for a window, it finds the win with that wait, and a map without a timer gives the same report as before.
   - `--click-seconds` works on a timed map. On a fixture whose window holds 2 clicks at 1 s each but not at 3 s each, the analyzer finds a win at 1 s, and at 3 s it finds none or one with more waits.

   **test**: at most 2 cases.
2. [ ] **The check replays it.** A check block's `wait:` and clicks replay on a timed map with no tool change. The builder confirms this on its fixture. If it does not hold, `tools/checkrun.ts` changes. **test**: folded into criterion 1, or **no test** if nothing changes.
3. [ ] **The raise** (section S). On a timed map, each feed's capacity and each rated fuse's rating is raised by the largest scenery load at any settle along the solution, flips included, not only the end. So scenery never browns out a window that the unraised puzzle did not. **test**: 1 case.
4. [ ] The builder gives each new file's time on Josh's PC, and the analyzer's state count on the fixture against the same map with no timer. **no test**.

**Count.** At most 3 (TB1 with TB2: 9). **Files.** `tools/analyzerun.ts`, `tools/analyze.ts`, `tools/checkrun.ts` (only under criterion 2), `tools/fit.ts` (the raise only), `tools/analyze.test.ts`, `tools/fit.test.ts` (one case added; the sweep unedited). **Must not:** `src/`, `puzzles/`.

#### TB3 · The timer drawn: its cycle, now and next (renderer). Branch `ticket/081tb3-timer-drawn`, after TB1. **Done** (PR #109, 8d621cb; Josh, 26 Nov 2026, on a card: "Merge (Recommended)")
**Goal.** From the default camera, the player sees each timed breaker's schedule: how long it stays as it is, which wires it feeds now, and which it will light or darken at its next flip.

**Acceptance criteria.**
1. [ ] **The ring.** A timed breaker's overlay icon is the breaker's, with a ring:
   - its closed share warm, its open share dark;
   - a hand at where the clock stands;
   - the whole seconds to the next flip, as a small number.

   Before the first move, the hand rests at `offset` and the number is not shown. A pure `timerRing(timer, readout)` gives the arcs, the hand's angle and the label. **test**: 1 case.
2. [ ] **Now and next.** "Now" is what V1 and W4 already show: the live tint and the pulses on the wires it feeds. "Next" is the timed entry's cue (NC2's `cueWires`, `CUE_ON` and `CUE_OFF`) and its load number, marked as the clock's (the architect's start: a small clock glyph beside the number, which Josh tunes by eye). It shows while the timer is hovered, and without hovering in the last 3 s before a flip. **test**: 1 case: the cue shows for a hovered timer, and for an unhovered one at 3 s or less, but not at more than 3 s.
3. [ ] **The flip reads.** At a flip, the icon pulses once. The wires it feeds change as any throw changes them. **browser**.
4. [ ] **Off when the numbers are off.** There is no next cue during the Relight, after the win or under `V`, as NC2 does it. The ring stays. **test**: folded into criterion 2's.
5. [ ] **The cost, measured** as NC2's criterion 5, on TB6's trial puzzle: at most 1 more draw call, and the median within 0.5 ms. **browser**.

**Count.** At most 3. **Files.** `src/render3d/overlay.ts`, `glyphs.ts`, `controlcue.ts`, `cityview.ts` (the next cue's write) and their tests, or a new `timerring.ts` with its test. **Must not:** `src/grid/`, `src/core/`, `src/play/`, `src/ui/`, `src/main.ts`.

#### TB4 · The timed breaker's prompt and its log lines (interaction). Branch `ticket/081tb4-timer-prompt`, after TB1, beside TB3. **Done** (PR #108, ae0dda3; Josh, 26 Nov 2026, on a card: "Merge (Recommended)")
**Goal.** Hovering a timed breaker says what it is and when it next changes. A cold playtest's session log says when each section came and went.

**Acceptance criteria.**
1. [ ] **The prompt.**
   - Hovering a timed breaker reads "Timed breaker: closes in 4 s" or "opens in 4 s", from `GridState.timers`.
   - Before the first move it reads "Timed breaker: starts on your first move".
   - A click on it gives the refused click and "Thrown by its clock" for the flash.

   **test**: 1 case.
2. [ ] **The log.** Each flip is a `timer-flip` entry with the node, `closed` and the game time, as `battery-flat` is. It is not an undoable step, and the export carries it. **test**: 1 case.

**Count.** At most 2. **Files.** `src/play/prompt.ts`, `log.ts`, `play.ts` (only to log the flip) and their tests. **Must not:** any other folder.

#### TB5 · The timed breaker's sound (sound). Branch `ticket/081tb5-timer-sound`, after TB0, beside TB3. **Done** (PR #106, 653fb0b; Josh, 26 Nov 2026, on a card: "Merge (Recommended)")
**Goal.** The player hears a section about to change and hears it change, without looking.

**Acceptance criteria.**
1. [ ] **The flip.** `breaker:thrown` with `timer: true` plays a heavier, mechanical clunk, set apart from the player's throw. The player's throw is unchanged. **test**: 1 case.
2. [ ] **The count-in.** A soft tick at each of the last 3 whole seconds before a flip, read from `SoundView.timers`. None before the first move or after the win. Pitched voices are on the 432 Hz grid (the existing scan). **test**: 1 case.
3. [ ] **Josh listens** on TB6's trial puzzle. **browser**.

**Count.** At most 2. **Files.** `src/audio/` only.

#### TB6 · A trial puzzle: two sections on two clocks (puzzle-designer, Fable 5.2). Branch `ticket/081tb6-timer-trial`, after TB1 to TB4. **Done** (PR #114; Josh, 26 Nov 2026, on a card: "Merge (Recommended)"). Criterion 3 stays open until he plays it (`tb-two-clocks.md`'s **What it taught us** is still empty)
**Goal.** Josh plays the timed breaker on the city before it enters the series, and says whether it is "an interesting twist".

**Acceptance criteria.**
1. [ ] **One trial puzzle**, `puzzles/city/tb-two-clocks.city.json` and its note, on 6 x 6 seed 1, one-way on. It has two timed breakers out of phase, each feeding its own block (2 blocks), and the target needs work in both windows (the note's worked example is a start, not binding). Its id is not `sNN`, so it is not a stage; it shows in the HUD's Map menu (N-Q1). `npm run check puzzles/city/` passes it, W1's rules and the branch-pole rule included. **test** (P1's sweep, unedited).
2. [ ] **The analyzer's numbers** in the note: fewest clicks, waits, winning configurations and orders, dead-end share, and the result at `--click-seconds 3` (it must still win in the same fewest clicks). **no test**.
3. [ ] **Josh plays it** (`npm run dev`, Map menu). His words go under **What it taught us**, and TB-Q4 is re-asked with them if he wants it changed. **browser**.

**Count.** 0. **Files.** `puzzles/city/tb-two-clocks.*` only.

**Where it enters the series** (TB-Q4; the recommendation). It enters in N4 (16 to 20), with the relay, spring and battery, the series' other "only while live" pieces. It comes first on a plain 2-block map, one clock per block, which is "span multiple districts with intent" by its nature. It then becomes a layer in N5 (21 to 25). The series stays at 25: at N4's re-cut the designer proposes which planned combination row gives way, and Josh approves. **Series rules it would add, at that re-cut:**
- ~~at most 2 timed breakers on a map;~~ (dropped 26 Nov 2026, NB-Q3: "Drop the 2-timer cap")
- every timed puzzle wins at `--click-seconds 3` in the same fewest clicks;
- the note names each window and what is done in it.

#### TB1b · Follow-up: the preview on a timed map, jointly and once per change. Cut 26 Nov 2026, three PRs (TB1b1, TB1b2, TB1b3). **Approved (G1) 26 Nov 2026**: "Approve (Recommended)". **Done**: all three merged (PRs #110, #112, #113)
**Where it comes from.** TB1's review (`reviews/081-TB1-timer-rule.md`, could-improve 1) and TB3's builder report (PR #109).
- `src/grid/preview.ts` previews each timed breaker's flip alone. Two timers that flip at the same moment (rule 6; the alternating pair, the likely shape of TB6) are shown as two separate what-ifs. On one limited feed, one entry can then read `over: true` for a flip that, taken jointly, browns nothing out.
- A later timer's entry also ignores an earlier timer that flips first.
- So TB3 withholds the next cue and number for every timer except the one that flips first and alone (`timerNextExact` in `src/render3d/timerring.ts`).
- Separately, while the clock runs, `GridState.state()` is a new object every `advance`. `refreshPreview` in `src/main.ts` keys on state identity, so `loadPreview` runs every frame. That is two grid settles per breaker, switch and readable fault, per frame, for numbers that change only when the circuit does.

**No rule changes.** Rule 9 ("its load number is red if the flip will brown out or blow a fuse") is met truly, not changed. No Decided rule is touched, no city grammar number changes (no `pipeline-designer` pre-check), and there is no new dependency or type. **One owner per PR**, so the renderer's one-line change is its own sub-section (TB1b2), not a rider on TB1b1.

##### TB1b1 · The joint-flip preview (grid-simulator, pure). Branch `ticket/081tb1b1-joint-preview`, from `main` now. **Done** (PR #110; Josh, 26 Nov 2026, on a card: "Merge, start TB1b2 (Recommended)")
**Goal.** A timed breaker's load number and cue tell the truth about the moment it flips, including every other timer that flips with it or before it, so an alternating pair never warns red for a brownout it doesn't cause.

**Acceptance criteria.**
1. [ ] **The entry is the grid at its moment.** For a timed breaker `T` whose `next` is `m`, its `loadPreview` entry is the circuit with every timed breaker at the position its clock gives it `m` seconds from now:
   - a timer whose `next` is more than `m` stays where it is;
   - a timer whose `next` is `m` (to within 1e-6 s, TB3's `SAME_MOMENT`), `T` included, has flipped. That is the joint flip of rule 6;
   - a timer whose `next` is less than `m` has flipped, and flips again at each of its own boundaries up to `m`. It is read from its `timer` in the puzzle and its readout, as `timerAt` reads it;
   - the player's breakers, the switches and the seen faults are the state's.

   `kind` `"breaker"`, `timed: true`. `delta`, `over`, `blows` and `lines` are measured against today's state, as for a throw. Before the first move the same rule holds on the frozen `next` values. **test**: 1 case: an alternating pair on one feed of capacity 1, flipping together. Each entry reads `delta` 0, `over` false and the same `lines`; flipped alone, the closing one would read `over` true. A third timer flipping earlier is counted in the later entries.
2. [ ] **The settles between are not run** (the architect's call, stated so the builder doesn't guess). The entry is the configuration at `T`'s moment, settled once from fresh grids as today. A fuse that an earlier flip blows on the way is that earlier timer's own entry's `blows`. After that flip the state changes, and the later entries are recomputed from it. **no test**.
3. [ ] **Unchanged elsewhere.** A player breaker's, a switch's and a repair's entries are as today. V2's and NC1's cases and TB1's timed-preview assertions pass unedited. A map without a timer gives the same preview (existing suites). `src/grid/` stays pure (the existing purity case). **test** (existing).
4. [ ] **Its cost.** At most one fresh grid pair (lit and real) per timed breaker, as today. No extra settle per intermediate moment. **test**: folded into criterion 1's (the entry count), or **no test** if the builder's diff plainly keeps one `entry` call per timer.

**Count.** At most 2 (aim 1). **Files.** `src/grid/preview.ts`; `src/grid/timer.test.ts` or `src/grid/preview.test.ts` (new cases only). **Must not:** any other folder, `src/core/` included (no new type: `LoadPreviewEntry` is unchanged). **Interfaces.** None new.

##### TB1b2 · The next cue for every timer (renderer). Branch `ticket/081tb1b2-cue-every-timer`, after TB1b1 and TB3 (#109) merged. **Done** (PR #112; Josh, 26 Nov 2026, on a card: "Merge both (Recommended)")
**Goal.** Every timed breaker shows its next cue and number, hovered or in its last 3 s, as TB3's criterion 2 meant, now that the preview is joint.

**Acceptance criteria.**
1. [ ] **`timerNextShows` drops `timerNextExact`.** The function, and `SAME_MOMENT` if nothing else uses it, are removed. `cueIds` is otherwise unchanged. **test**: TB3's case "the next cue shows for a hovered timer ... never for a timer another flip shares or precedes ..." is **rewritten** (1 case): both timers of a coincident pair show within 3 s and on hover. A timer that flips after another shows too. The "numbers off" clause stays.
2. [ ] **On TB6's trial puzzle** (or the TB1b1 fixture's pair placed on the city if TB6 is not yet built), both timers of the pair show the same joint numbers in their last 3 s, and neither is red unless the joint flip browns out. **browser**.

**Count.** 0 added, 1 rewritten. **Files.** `src/render3d/timerring.ts`, `src/render3d/timerring.test.ts`. **Must not:** `cityview.ts`, `controlcue.ts`, `overlay.ts`, any other folder.

##### TB1b3 · The preview once per change, not per frame (ui). Branch `ticket/081tb1b3-preview-key`, from `main` now, beside TB1b1. **Done** (PR #113; Josh, 26 Nov 2026, on a card: "Merge (Recommended)")
**The fix chosen** (the cheapest correct one, one owner). The page keys the refresh on what the preview reads, not on the state's identity. `loadPreview` reads the breakers, the switches, the faults, the readable faults and `known`, and after TB1b1 the timers' order of next flips. It does not read the clock's fraction, a battery's charge or the load. A grid-side "config version" on `GridState` was weighed and set aside. It would need `src/core/`, `src/grid/` and `src/main.ts` (three owners), and a version bumped on every settle would still tick each frame on a charging battery. The key below covers that case too.

**Goal.** On a timed (or battery) map with no move, the load numbers are computed once per flip, not once per frame, and stay the same numbers.

**Acceptance criteria.**
1. [ ] **`previewKey(state, relighting)`**, a pure function in `src/ui/preview.ts`. It returns a string built from:
   - `relighting` and `complete`;
   - each breaker's and switch's position;
   - the fault ids and the readable fault ids;
   - the timed breakers' ids in order of `next`, with ids within 1e-6 s of each other grouped as one moment.

   It does not read `clock`, `next`'s values, `batteries` or `load`. **test**: 1 case:
   - two states 0.3 s apart with no flip give the same key;
   - a flip, a player throw and a repair each change it;
   - a Reset whose breakers match the last state's, but whose timers' order differs, changes it.
2. [ ] **`refreshPreview` uses it.** In `src/main.ts`, the guard keeps its identity fast path, then compares `previewKey` with the last shown key. Reset still clears it, as `shownFor = null` does today, so `known` restarts. The V key, the Relight and the win behave as today (V4's cases unedited). **test** (existing).
3. [ ] **It runs once per change.** On a timed map in `npm run dev` (TB6's when built; otherwise a local, uncommitted copy of a city puzzle with one breaker given a timer), the builder counts `loadPreview` calls over 10 s with no move: 1 on open plus 1 per flip. **no test** (a temporary count in the builder's run, not committed; the figure goes in the report).

**Count.** At most 1. **Files.** `src/ui/preview.ts`, `src/ui/preview.test.ts` (one case added), `src/main.ts` (the `refreshPreview` guard only). **Must not:** `src/grid/`, `src/render3d/`, `src/core/`, `src/play/`. If the key needs a field `GridState` doesn't carry, the builder stops and the architect re-cuts.

### J · The opening camera fits the puzzle, not the district (renderer). Branch `ticket/081j-puzzle-fit`. Cut 26 Nov 2026, one PR. **Approved (G1) 26 Nov 2026**: "Approve; limits follow puzzle"
**Josh's request, 26 Nov 2026, in chat:** "Let's create another ticket to fix the camera. Currently it starts out way too zoomed out. It shouldn't zoom out on the district. It should just measure the width of the puzzle and height of the puzzle and fit it to the screen."

**Josh's answers, 26 Nov 2026, on cards (relayed by the main session):**
- **G1 and J-Q1:** **"Approve; limits follow puzzle"**. The zoom-out limit, the pan clamp and the zoom-in floor come from `puzzleFrame`, not `jobFrame` (re-cut below; the room floor `PUZZLE_ROOM_M` is the architect's, so a one-corner puzzle keeps some street in view).
- **J-Q2:** **"8% (Recommended)"**. `PUZZLE_FIT_PAD` is 8 % of the free area each side, at least 32 px.
- **J-Q3:** **"Fit again (Recommended)"**. A resize fits the puzzle again; `src/main.ts` does not change.

**What the main session saw.** Opening a series puzzle (`?puzzle=s01-first-light` and on), the camera frames much more of the city than the puzzle. For screenshots it had to right-drag and zoom about 3 wheel steps in on every puzzle. s07 and s09 span a whole block; s01 sits on one corner of its block.

**What the code does (read 26 Nov 2026 at `main` 8ccb14d; the architect's reading).**
- The play view gives `createCityRig` (`src/render3d/tilecity3d.ts`) one rectangle, E3's `jobFrame` (`cityview.ts`). That holds the job's places and runs, but also **each district block out to the far side of the street on its four sides**, with `FRAME_MARGIN_M` (16 m) round every point. So a puzzle on one corner of a block opens on the whole block and its four streets.
- The rig's fit then keeps the target at the rectangle's centre and backs off until the rectangle's corners, on the ground and at a fixed roofline (`CITY_FIT_TOP`), project inside the free area less `CITY_FIT_PAD` (4 %). With the camera's 45 degree pitch the near edge projects larger than the far one, so with the target held at the centre one side of the screen is left slack.
- The same rectangle sets E5's limits: `D0` and `Dmax` (1.5 x `D0`, Josh's), the pan clamp (`clampT`) and the zoom-in floor (`CITY_ZOOM_IN` x the opening).
- `resetView` is the fit, and every recentre goes through it: Home, F (`fitWhole`), double-right-click (`src/play/pan.ts`), the Reset button, and the window's `resize` (`src/main.ts` calls `setInsets`, `resize`, then `resetView`). The fit runs only on those, never per frame.

**The rule.** On open, the camera fits **the puzzle's own pieces** to the screen: the feed (its node's place), every control, fault and target, and every run's spans, drop and lead. Never the scenery, the district's blocks or its streets.
- **The points.** A new pure, exported `puzzleFrame(view, layer)` in `cityview.ts` gives world points, in world units:
  - each node's place (`placePoint`): at the ground and at its own height (pole top, roof deck, the drop's wall point, the post);
  - both ends of every span in `converted.runs[*].spans`, at the ground and at the pole's top or the roof's deck;
  - each run's drop (its pole and its wall point) and lead (its post).

  **Amended 26 Nov 2026 (J's review, must-fix 1; the builder's reading, commit 110004d):** `converted.origin_m` is **not** a point. It is the conversion's layout corner (the origin `pos` is measured from, CK15 step 2; `convert.ts` sets it to `x0, z0`), not the feed, so it is not a puzzle point. The feed is covered as a node place, above.

  Each point is grown by `PUZZLE_MARGIN_M` (3 m) on x and z, so a pole's crossarm or a drop's fitting is not cut at the edge. Nothing else counts. With no place, it gives none, and the rig falls back to today's frame.
- **The fit.** With the points, the opening is the nearest distance at which every point projects inside the **fit area**, with the target moved so the points' projected box is centred in the fit area. The **fit area** is the **free area** (the canvas less the HUD's top and the bottom panel's insets) less the screen margin `PUZZLE_FIT_PAD` (J-Q2: 8 % each side, at least 32 px), and less a **label strip** on its right, `puzzleLabelRoom(freeW)` = `min(PUZZLE_LABEL_PX (64 px), freeW / 6)` (amended 26 Nov 2026, J's review must-fix 1; commit e0d6ec9). Why: icon labels sit to the right of their icon (the main session saw the feed's load label clipped at the right edge on s07 and s08 at 390 x 844). The fit area's own width and height decide which way it is tight, so a tall phone fits by width and a wide window by height. The camera's pitch and perspective are in it because each point is projected at its own height; the recentring takes up the slack the pitch leaves.
- **The limits follow the puzzle (J-Q1).** E5's limits keep their form, but on the puzzle's points instead of `jobFrame`:
  - **`D0`** is the distance at which the points fill the **whole canvas** (insets ignored, `PUZZLE_FIT_PAD` kept), at the same centred target;
  - **the room floor:** `Droom` is the distance at which the points' x and z box, grown by **`PUZZLE_ROOM_M` = 20 m** on every side, fills the whole canvas. That is about one street with its pavements beyond the outermost piece, so on s01 (one corner of a block) the furthest view still shows the streets round that corner and the next kerbs;
  - **`Dmax`** = `max(CITY_PLAY_ZOOM_OUT x D0, Droom)` (1.5x, Josh's for E5), so a large puzzle like s07 keeps E5's 1.5x and a small one gets at least the room;
  - **the pan clamp** (`clampT`) holds the target inside the points' x and z box grown by `PUZZLE_ROOM_M`, so a drag can look across the street but never take the puzzle off screen;
  - **the zoom-in floor** is `CITY_ZOOM_IN` x the puzzle's opening.

  The opening is `min(that fit, Dmax)`, as E5 held it. `jobFrame` stays for `cam=free` and for a puzzle with no place (the fallback); its body and E3's case do not change. The builder prints once, in its reply, the street's width in metres on 6 x 6 seed 1 and the s01 and s07 `D0`, `Droom` and `Dmax`, so Josh can see which one sets the limit.
- **Resize.** A new window size or new insets re-fit to the puzzle at the new size, as today's `resize` re-fits to the district (J-Q3). On a phone turned on its side, the puzzle is fitted again.
- **Recentre.** Double-right-click, Home, F and the Reset button go to the same fit: they all call `resetView`. This replaces E5 criterion 2's "the F key frames the district, not the city" with "the puzzle". `src/play/` does not change.
- **`cam=free` (dev)** stays today's unlimited rig on `jobFrame`: the points are used only with `limit`.

**No Decided rule touches the camera** (as for E5), and no grammar rule or city number changes, so there is no pipeline-designer pre-check and no rules-coverage row.

**Goal.** Opening any series puzzle on a desktop window or a phone, the camera shows the puzzle's pieces filling the space between the HUD and the bottom panel, with a margin, without a pan or a zoom. Every recentre comes back to that view.

**Acceptance criteria.**
1. [ ] **The puzzle's points.** `puzzleFrame` as above. **test**: 1 case in `cityframe.test.ts`, on `s01-first-light` on 6 x 6 seed 1, one-way on (the shared city the file's E3 case already uses; no other build): every place (the feed's included), run end, drop and lead is within `PUZZLE_MARGIN_M` of a point; every point is inside `jobFrame`; and the points' x and z extents are each smaller than `jobFrame`'s (s01 sits on one corner of its block, so a frame that still held the district would fail).
2. [ ] **The fit.** `createCityRig` takes a new option, `rigOpts.open?: readonly { x: number; y: number; z: number }[]`, used only with `limit`. Without it the rig is exactly today's: the three cases in `cityrig.test.ts` and the three in `tilecity3d.test.ts` pass **unedited**. With it, at 1287 x 1178, 1280 x 720, 800 x 570 and 390 x 844, with no insets and with insets of 60 px top and 30 % of the height bottom:
   - every point projects inside the fit area: the free area less `PUZZLE_FIT_PAD` (8 %, at least 32 px) and less the label strip on the right (`puzzleLabelRoom`), since icon labels sit to the right of their icon;
   - the points' projected box is centred in the fit area within 2 % of its width and height;
   - on the tighter axis the box fills the fit area's width or height, less 2 %;
   - unless held at `Dmax`, the opening is nearer than the same rig's opening without `open` (fitted to the file's `FRAME`).

   **test**: 1 case in `cityrig.test.ts`, fixture points (a small cluster in one corner of the file's `FRAME`, at heights 0 and 2), all sizes and both insets in a loop.
3. [ ] **The limits follow the puzzle, and every recentre and resize goes to the fit.** With `open`, at 1280 x 720 and no insets, on two fixtures (the small corner cluster of criterion 2, where `Droom` sets the limit, and a cluster as wide as the file's `FRAME`, where 1.5x `D0` does): 40 steps out stop at `Dmax` = `max(1.5 x D0, Droom)` (the scale within 1e-6), and at that distance every point of the box grown by `PUZZLE_ROOM_M` projects inside the canvas; 40 steps in stop at `CITY_ZOOM_IN` x the opening; `setPan(1e6, 1e6)` and `centreOn` far outside hold the target on the edge of the points' box grown by `PUZZLE_ROOM_M`, never on `FRAME`'s; after a pan and zoom, `resetView` restores the opening's scale and pan; `resize` to a new size and new insets gives that size's fit (the scale and pan of a fresh rig built at that size). **test**: 1 case in `cityrig.test.ts`, the same fixture. Double-right-click, Home, F and Reset all call `resetView`, which this case holds; `pan.ts`'s own cases hold the calls, unedited. **test** (existing, unedited) for the calls.
4. [ ] **The play view uses it.** `createCityPlayRenderer3d` passes `open: puzzleFrame(view, layer)` with `playRigOptions`'s `limit`; `cam=free` in dev passes neither, as today. `playRigOptions` and its case are unedited. **no test** (one call; criterion 6 sees it).
5. [ ] **Frame time, measured, not tuned.** The fit runs on open, resize and recentre only, never per frame, so the expectation is no cost. In the browser pane on Josh's PC (not a headless browser), `&perf=1`, before power, at 1287 x 1178, on `main` and on the branch, for `s01-first-light` and `s07-the-long-way`, the builder reports draw calls, triangles and median frame at the opening. It also times one `resetView` on s07 once (a temporary line, not committed). Expected: the branch's median frame no more than 5 % over `main`'s, draw calls and triangles no higher (a nearer view draws as much or less), and the fit under 2 ms. **Stop rule:** if a branch row is over, the builder stops and reports the rows ("stop 081 J"); it does not tune the margin or the limits to pass. **browser**.
6. [ ] **The pane check, for Josh.** In the browser pane (not headless; `preserveDrawingBuffer` for the capture), `s01` to `s10` each opened fresh, the camera not touched, at **1287 x 1178** and at **390 x 844** (a phone): 20 screenshots, given to the main session to show Josh, not committed. With them, one line per puzzle: whether every piece is on screen and clear of the HUD and the panel, and which axis is tight. Then on s07 at 1287 x 1178: pan and zoom away, double-right-click, and one more screenshot that matches the opening's. Any piece cut off or under a panel is reported, not tuned away. **browser**.
7. [ ] Josh opens the series from `npm run dev` on a desktop window and a phone-sized one: each puzzle opens filling the screen with its pieces, with no pan or zoom needed; double-right-click and F come back to it; the wheel stops at a height where the puzzle and the streets round it still read (on s01, the corner's streets and the next kerbs); a drag cannot take the puzzle off screen. **browser**.

**Count.** 3 added (criteria 1, 2 and 3), **0 rewritten**, in the existing `cityframe.test.ts` and `cityrig.test.ts`; no new file; 3 of the cap of 15. Criterion 1 reuses the city the file already builds; criteria 2 and 3 are fixture-only, under 2 s (the builder gives both files' times). No test to remove.

**The existing rig tests that pin limits.** None pins a limit on `jobFrame`, so none is rewritten:
- `cityrig.test.ts`'s three E5 cases build the rig on a fixture `FRAME` **without `open`**. That rig is unchanged (it is still the `cam=free`-less, point-less path, and the fallback for a puzzle with no place), so they pass **unedited** and keep holding E5's form of the limits;
- `tilecity3d.test.ts`'s three "the city rig" cases have no `limit`: unedited;
- `cityframe.test.ts`'s E3 case tests `jobFrame` itself, which is kept: unedited;
- `playRigOptions`' case: unedited.

If the builder finds one of them must change, each rewritten case counts toward the cap, and it says which and why.

**Files.** `src/render3d/tilecity3d.ts` (`createCityRig` and its options only); `src/render3d/cityview.ts` (`puzzleFrame`, `PUZZLE_MARGIN_M`, `PUZZLE_FIT_PAD` if it lives here, and the one `createCityRig` call; not `jobFrame`, `loadCityView`, `playRigOptions`, the live layer, the FX or `perf=1`); `src/render3d/cityframe.test.ts`; `src/render3d/cityrig.test.ts`. **Must not:** `plan3d.ts`, `tilecity3d.test.ts`, `src/play/` (`pan.ts` included), `src/ui/`, `src/main.ts`, `src/core/`. If J-Q3's second answer is chosen, the resize change is `src/main.ts`'s, a ui section cut after this one, and this section does not touch it.

**Interfaces.** None in `src/core/`: `puzzleFrame`, `rigOpts.open`, `PUZZLE_MARGIN_M` and `PUZZLE_FIT_PAD` are internal to `src/render3d/`. No event. No new dependency.

**Order.** From `main` now. It shares `cityview.ts` with **TB3** (the next cue's write), away from the rig call; whichever merges second merges `main` in. It shares `tilecity3d.ts` with **F2**, built only if F's numbers call for it.

**Questions for Josh (G1 card), answered 26 Nov 2026 (above).**
- **J-Q1, G1, and what the zoom and pan limits are set by:** **"Approve; limits stay on the district (Recommended)"** (only the opening moves to the puzzle; the wheel still zooms out to E5's 1.5x of the district and a drag still reaches its streets, so the player can look round the puzzle), "Approve; the limits follow the puzzle too" (`Dmax` and the pan clamp from the puzzle's points: on s01 the player could zoom out only to 1.5x a corner of one block), or "Not yet".
- **J-Q2, the margin round the puzzle on screen:** **"8 % of the free area each side, at least 32 px (Recommended)"** (an icon is up to 40 px across, so an edge piece's icon stays whole), "4 %, today's pad" (tighter; an edge icon may touch the panel), or "12 %" (looser).
- **J-Q3, a resize:** **"Fit the puzzle again, as today (Recommended)"** (a new window size, a turned phone or a panel opening re-fits; any pan or zoom is lost), or "Keep the player's view once they have moved" (a ui section for `src/main.ts`, cut after this one).

### Y · Leftovers named in reviews: Y1 and Y2 (renderer, one PR), Y3 (playtester, its own PR). Cut 26 Nov 2026. **Approved (G1) 26 Nov 2026**: "Approve Y (Recommended)"
**Josh, 26 Nov 2026, in chat:** "Let's finish the leftovers from the handoff".

**Josh's answers, 26 Nov 2026, on cards (relayed by the main session):**
- **G1:** "Approve Y (Recommended)".
- **Y-Q1, the fuse label's red:** "Comment only (Recommended)". Y2 is cut to that answer: the guard stays, and the doc comment says why.
- **Y-Q2, who builds Y3:** "The playtester (Recommended)". It edits one case and runs only the typecheck. It replays nothing, so this is not a playtest. These are `docs/handoff-2026-11-25.md`, "What is open" item 5: three could-improve items from reviews, none of them must-fix. The architect checked each one on `main` at 5fba453, and all three are still there.

**No rule changes.** No Decided rule is touched and no city grammar number changes, so there is no `pipeline-designer` pre-check. There is no `src/core/` type, no event and no new dependency, and no `tickets/rules-coverage.md` row moves.

| PR | Sections | Owner | Cases | Order |
|---|---|---|---|---|
| 1 | Y1, Y2 | renderer | 1 added (Y1), 0 (Y2) | From `main` now |
| 2 | Y3 | playtester (Y-Q2: "The playtester (Recommended)") | 1 rewritten | From `main` now, beside PR 1 (no shared file) |

#### Y1 · The brownout arc flashes once per arc, not every frame (renderer). Branch `ticket/081y1-arc-flash-once`, from `main`
**Where it comes from.** FX4's review, `reviews/081-FX4-fuse-blow.md`, could-improve 5.
- On `main`, `drawFx` in `src/render3d/cityview.ts` calls `fx.arcFlashAt` beside each `fx.arcAt`. It does this in both arc loops, normal play and `fx=all`, on every frame that `arcSpots` returns the arc.
- `arcFlashAt` is a 0.05 s soft-spot flash. So at 60 fps each arc keeps about 3 flashes alive.
- Under `fx=all` (every port, every frame) this inflates the "soft spot" peak that `perf=1` prints.
- FX2 meant one flash on each new arc. The review suggests firing once per arc window.

**Goal.** Each brownout arc gives one soft flash as it strikes. The arcs look as they did, and `fx=all`'s peak counts measure what play would draw.

**Acceptance criteria.**
1. [ ] **`arcFlashes(spots, time, last, out)`**, pure, exported from `src/render3d/fx.ts` beside `arcSpots`.
   - It returns the entries of `spots` whose `last[i]` is not the current arc slot (`Math.floor(time / ARC_SLOT_S)`, the slot `arcSpots` uses), and it writes that slot into `last[i]`.
   - An arc's window lies inside one slot (`arcSpots`' start plus duration is under 0.2 s), so this gives one flash per window. A port that strikes again in a later slot flashes again.

   **test**: 1 case in `fx.test.ts`, on 3 ports:
   - the first call in a slot returns the spots;
   - a second call in the same slot returns none;
   - a port that is not in `spots` is not stamped;
   - the next slot returns the port again.
2. [ ] **`drawFx` flashes only `arcFlashes`' result**, in both loops. Each loop has its own `last`, an `Int32Array(arcPorts.length)` filled with -1 and made where `arcIdx` is made. `fx.arcAt` is unchanged, so an arc is still drawn on every frame of its window. **no test**: this is the wiring, and criterion 1 holds the rule.
3. [ ] **The look and the count.**
   - Josh runs `npm run dev`, opens `s03-not-enough-for-all` (its feed starts over, "9 of 6"): each arc still flashes as it strikes. **browser**.
   - With `perf=1&fx=all`, the builder gives the "soft spot" peak before and after, only while the pane is shown on Josh's PC. **no test**.

**Count.** 1 added, 0 rewritten. No test is removed, and `fx.test.ts`'s existing `arcFlashAt` assertion stays unedited. **Files.** `src/render3d/fx.ts` (`arcFlashes` only), `src/render3d/fx.test.ts` (one case), `src/render3d/cityview.ts` (`drawFx`'s two arc loops and their `last` arrays only). **Must not:** `arcSpots`' rule, `arcFlashAt`'s look, `overlay.ts` (Y2's), any other folder.

#### Y2 · The fuse label's red says what it is (renderer). Same PR as Y1
**Where it comes from.** V3's review, `reviews/081-V3-preview-numbers.md`, risk 1 and could-improve 3.
- On `main`, `overlayLabels` in `src/render3d/overlay.ts` draws a rated fuse box's "x of y" with `red: load > rating`.
- That can never fire in play. `src/grid/grid.ts`'s blow check faults any fuse whose load passes its rating in the same settle. `fuseLoad` then reads 0 for a faulted fuse, so the settled state never holds an unblown fuse over its rating.
- The feed's red (`f.over`) is real and stays as it is.

**Goal.** Whoever reads `overlayLabels` knows that a fuse label's red is a guard that never shows in play. Nothing changes on screen.

**Acceptance criteria** (Y-Q1, Josh: "Comment only (Recommended)").
1. [ ] **Comment only.** `red: load > rating` stays as a guard, and `overlayLabels`' doc comment says so:
   - in play, the grid blows such a fuse in the same settle;
   - a blown fuse reads "0 of y";
   - so the red shows only on a state the grid did not make.

   No code line changes and nothing changes on screen. **no test**.
2. [ ] **The feed label, the preview numbers and the Relight are as today.** V3's case in `overlay.test.ts` passes unedited. **test** (existing).

**Count.** 0 added, 0 rewritten. With Y1 the PR has 1 case. **Files.** `src/render3d/overlay.ts` (`overlayLabels`' doc comment only). **Must not:** `overlay.test.ts`, `src/grid/` (the blow rule is not changed), `fx.ts` or `cityview.ts` (Y1's), any other folder.

#### Y3 · The harness's id floor goes (playtester). Branch `ticket/081y3-harness-floor`, from `main`
**Where it comes from.** R1's review, `reviews/081-R1-city-harness.md`, could-improve 1. On `main`, the "scripts" case in `tests/playtest/playtest.test.ts` ends with `expect(IDS.length, "P0 and the 16 pilots").toBeGreaterThanOrEqual(17)`. It was right for R1, which had 17 ids. It is now wrong in a new way:
- `puzzles/city/` holds 28 ids: the 16 pilots, `city-two-ways-round`, `s01` to `s10` and `tb-two-clocks`.
- The floor would still pass if every series stage were deleted (28 - 11 = 17), and the series is what players play (NS lists only `sNN`).
- Its message names pilots that are no longer stages. If they were retired, the case would fail with a count, not a name, as R1's review said.

**Goal.** At a release, the harness fails by name when a series stage goes missing or is doubled. It needs no edit as N3 to N5 land, as a pilot is retired or as a trial puzzle is added.

**Acceptance criteria.**
1. [ ] **The floor is replaced** in the "scripts" case by two assertions:
   - `IDS` is not empty, with the message "no city puzzles under puzzles/city/". Without it, an empty glob would pass by running nothing.
   - The series ids (`/^s(\d\d)-/`) run from `s01` to the highest present, with no gap and no number used twice. The failure names the missing or doubled numbers.

   Ids not of the form `sNN-` are not counted: the pilots, `city-two-ways-round` and `tb-two-clocks`. **test**: the existing case, **rewritten** (1). Nothing else in the file changes.
2. [ ] **Not run on this branch** (Josh, 23 Nov 2026: "Regression testing should only be performed on full releases"). The playtest config is not collected by `npm test` or CI. The builder runs only `tsc --noEmit -p tests/playtest/tsconfig.json` and says so, as R1's criterion 5 did. The case first runs at the next release Josh calls (X-Q2, "Next release (Recommended)"). **no test**.

**Count.** 0 added, 1 rewritten. **Files.** `tests/playtest/playtest.test.ts` (the "scripts" case only). **Must not:** `ladder.ts`, `replay.ts`, `__snapshots__/`, `src/`, `puzzles/`, `tools/`, `playtests/`.

**Questions for Josh (G1 card), answered 26 Nov 2026 (above): "Approve Y (Recommended)", "Comment only (Recommended)", "The playtester (Recommended)".**
- **G1 for section Y:** "Approve Y (Recommended)"; "Approve Y1 and Y3 only"; "Not now".
- **Y-Q1, the fuse label's red:** "Comment only, keep it as a guard (Recommended)" (nothing changes on screen); "Drop the red" (the same on screen; the line reads plainer); "Full reads red" (new: a fuse at its rating reads red, as a warning that one more load blows it; it may help N4's rated fuse that forces the two windows, but it also hints at the blow before it happens on `s08-the-small-box`, the series' first fuse-blow opener).
- **Y-Q2, who builds Y3:** "The playtester, as for R1 (Recommended)" (the brief makes it `tests/playtest/`'s owner; it edits one case, runs only the typecheck and replays nothing, so this is not a playtest); "Leave it for the next release" (the release's playtester makes the edit as part of that release).

## Files
Per section, above. This branch (the cut): `tickets/081-puzzles-on-the-city.md`, `docs/design/070-K1-circuit.md` (CK9 as changed, 24 Nov 2026; CK14's dark-building line struck for section S, 24 Nov 2026), `tickets/070-city-pipeline.md` (pointer lines), `tickets/071-pack-power-lines.md` (a pointer line: C and E's ladder wiring are dropped), `tickets/rules-coverage.md`, `src/core/citycircuit.ts` (new; `CityPuzzleView` added 24 Nov 2026 for the playable path), `src/core/cityplan.ts` (`CityCircuitLayer`), `src/core/index.ts`. Section FX's cut (24 Nov 2026): new `src/core/fx.ts`, `src/core/assets.ts` (`AssetManifest.fx?`), `src/core/index.ts`, `tickets/rules-coverage.md`. Section W's cut (25 Nov 2026): this file and `tickets/rules-coverage.md` only; no `src/core/` change (W1's numbers live in `tools/`, and `{ post }` and `lead` stay typed). Sections SK and T (cut and re-cut 25 Nov 2026): this file only (with open question 20 closed); no `src/core/` change and no rules-coverage row. Section N (cut 25 Nov 2026), with T3b recorded and P2b to P2d dropped: this file only; no `src/core/` change and no rules-coverage row. Section N's NR and NC (cut 26 Nov 2026): this file, then on G1 `src/core/preview.ts` (NC's field, below) and a `tickets/rules-coverage.md` line adding NC1 to "Faults hide faults" (its case pins that the cue hides an unread break, as V2's does for the number). Section TB's cut (26 Nov 2026, approved the same day): this file and `docs/design/081-TB-timed-breaker.md` only; `src/core/`, `puzzles/SCHEMA.md` and `tickets/rules-coverage.md` change in TB0, after G1. Section Y's cut (26 Nov 2026), with N4's re-cut notes and the TB merges recorded: this file only. There is no `src/core/` change and no rules-coverage row. Section NB's cut (26 Nov 2026, approved the same day): this file only (the series rules, N4, N5 and NB); no `src/core/` change and no rules-coverage row. `puzzles/series-v1.md`'s rules bullet is the puzzle-designer's, in NB1. Section N4's re-cut (26 Nov 2026, on `ticket/081n4-series-batch-4`, approved to build: "Start N4 (Recommended)"): this file only (N4 in full, the N5 stub, open question 31); no `src/core/` change and no rules-coverage row. The architect probed a spring and a battery on the city with scratch files outside the repo, deleted after.

## Interfaces
Written into `src/core/` with this cut (typecheck passes):
- **`src/core/citycircuit.ts`:**
  - the layer's types (CK15's sketch): `CityPole`, `CityPoleKind`, `CityWireSpan`, `CityWireSpanKind`, `CityDrop`, `CityStreetLight`, `CityLampPostPlace`, `CityCircuitKeep`;
  - the city puzzle's types: `CityPuzzle`, `CityPuzzleCity`, `CityNodePlace`, `CityLineRun` (CK13 as changed by answer 5: `{ spans, drop?, lead? }`), `CityPuzzleNode`, `CityPuzzleLine`, `CityPuzzleFault`, `CityPuzzleConverted`;
  - D's types: `CIRCUIT_COMPONENTS`, `CircuitComponent`, `CircuitComponentPick`.
- **`src/core/cityplan.ts`:** `CityCircuitLayer` is `{ stage, poles, spans, drops, lights, posts, keep }`. No stage writes it yet.
- **Not typed yet:**
  - ~~the roof structure, the roof span, the roof place and `roofKeep`~~: typed 24 Nov 2026 for K2d:
    - in `citycircuit.ts`: `CityRoofMast`, `CityRoofSpanOver`, `CityRoofSpan`, `CityRoofKeep` and `CityRoofPlace`;
    - on `CityCircuitLayer`: `roofs?`, `roofSpans?` and `roofKeep?`. They are optional until K2d1 writes them, as `CityBuildingsLayer.columns` was.
    - Roof spans are their own type, not a `CityWireSpanKind`, because they are a separate list and never in `spans`.
    - `CityRoofPlace` joins `CityNodePlace` on K2d2's branch (see K2d2).
  - `src/core/powerpoles.ts` and `CityCircuitLayer.poleModels` (PK1).
  - `validateCityPuzzle` and `loadCityPuzzle` (C1);
  - "ladder" leaving `ASSET_GALLERY_USES` (on A2c's branch).
- **E1's overlay signatures, as built** (internal to `src/render3d/`, so no core change): `overlayIcons(converted, state, project, ctx)` and `overlayLines(converted, state, project, ctx)`.
  - `ctx` is `{ layer, width, height, time, pxPerMetre? }`.
  - `project` returns the screen point and a boolean for "behind the camera".
  - **This stands.** E1's criteria name the inputs, not their exact shape. E2 codes against the built shape, and the criteria are not edited.
- **The playable path's contract (24 Nov 2026, committed with this re-cut):** `CityPuzzleView` (`{ plan, converted }`) in `src/core/citycircuit.ts`. E2 adds `loadCityView(city): CityPuzzleView` (`src/render3d/index.ts`) and `MapRenderer3dOptions.city?: CityPuzzleView` (`renderer.ts`). U2 calls both. U1's `CityMapEntry` stays inside `src/ui/` (re-cut 24 Nov 2026: no `MapEntry` union, since the picker lists only city puzzles).
- **The CK9 path (24 Nov 2026, committed with this re-cut; typecheck passes):**
  - `CityDrop.street?` (K2e writes it for a drop across a street);
  - `CityPuzzleView.district?` (E3's `loadCityView` writes it);
  - `CIRCUIT_SCENERY` (`"wallFitting"`, `"dropWire"`), `CircuitSceneryPiece` and `CircuitSceneryPick`, for K3b's `SCENERY_MODELS`. They are kept apart from `CIRCUIT_COMPONENTS`, so the overlay, the gallery's component view and `COMPONENT_MODELS` do not change.
- **E5 (24 Nov 2026):** `createCityRig`'s `rigOpts.limit`, `playRigOptions` and `CITY_PLAY_ZOOM_OUT` are internal to `src/render3d/`, so no core change. No event, no new dependency.
- **E4 (24 Nov 2026):** `overlayBreaks`, `OverlayBreak` and `overlayBreakHit` are internal to `src/render3d/`, so no core change. `OverlayLine`, `overlayLines` and `overlayLineHit` go.
- **L, lit buildings (24 Nov 2026, committed with this cut; typecheck passes):** `CircuitComponentPick.removed?` (`{ words, date }`) in `src/core/citycircuit.ts`: nothing stands for a removed pick, its key is not loaded, and its place still counts. L1 sets it on `lampBuilding`. `windows.ts`'s exports (`WINDOW_UV`, `windowMask`, `buildingGlow`, `litBuilding`, `poolPlaces`, `dimPieces`) are internal to `src/render3d/`, so no other core change.
- **Events:** none new.
- **S, every building on a live pole (24 Nov 2026, committed with this cut; typecheck passes):** in `src/core/citycircuit.ts`, `CityPuzzleConverted.scenery?` (building id to hidden lamp id) and `CityPuzzleConverted.hidden?` (every id the conversion added), both optional until S1 writes them, and `SCENERY_BUILDING_LOAD` = 1 (Josh: "Whole"). `sceneryLamps` (S4) and `relightCues` (U3) are internal to their folders. No new dependency.
- **FX, particle effects (24 Nov 2026, committed with this cut; typecheck passes):** new `src/core/fx.ts` (`FX_SOURCE_PACK`, `FX_SOURCE_DIR`, `FX_GAME_DIR`, `FX_TEXTURES`, `FxTextureId`, `FX_MESHES`, `FxMeshId`, `AssetFxTexture`) and `AssetManifest.fx?` in `src/core/assets.ts`, shared by FX1 (`tools/assets/game.ts`) and FX2 (`src/render3d/fx.ts`). No event, no new dependency (no particle library).
- **V, the load preview (25 Nov 2026, committed with the V2 to V4 re-cut; typecheck passes):** new `src/core/preview.ts` (`LoadPreview`, `LoadPreviewEntry` `{ kind, delta, over, blows }`, `LoadPreviewKind`), exported from `src/core/index.ts`. V2 implements `loadPreview(puzzle, state, known)` in `src/grid/`; V3 adds `MapRenderer3d.setLoadPreview`; V4 keeps `known`. No event, no new dependency.
- **No new dependency.** The overlay is Canvas 2D.
- **SK, the night sky (25 Nov 2026):** none in `src/core/`. `NIGHT_SKY`, the sky object and `setSkyTurn` are internal to `src/render3d/`. No event, no new dependency (the sky is drawn in code with Three's own geometry and materials; no pack file, no texture loader).
- **T, the title screen (25 Nov 2026):** none in `src/core/`. `TitleView` is types only in `src/render3d/titleview.ts` (the `maprender.ts` precedent: `src/ui/` and `main.ts` import it as a type). The progress record is the page's, in `src/ui/progress.ts`. No event. No new dependency (the browser's `<select>` and `localStorage`).
- **N, series v1 (25 Nov 2026):** none in `src/core/`. The series id form (`sNN-<slug>`) is read by `stageNumber` in `src/ui/progress.ts` (NS); N0's city-file path is internal to `tools/`. No event. No new dependency.
- **NC, the control cue (26 Nov 2026; written into `src/core/preview.ts` on Josh's G1, "Approve (Recommended)", before NC1 and NC2 start; typecheck passes).** On `LoadPreviewEntry`, one optional field, so `main` typechecks the moment it lands and V3's existing fixtures in `src/render3d/overlay.test.ts` need no edit:
  ```ts
  /** The lines the move would make live (`on`) and dead (`off`), ids of `puzzle.lines` in its order, from the same visible what-if as `delta` (fuses lifted, unread faults as sound). May hold hidden (S1) line ids; the renderer draws file lines only. Set by `loadPreview` on every entry from NC1 on; absent reads as none. */
  readonly lines?: { readonly on: readonly string[]; readonly off: readonly string[] };
  ```
  `cueWires`, `CUE_ON` and `CUE_OFF` are internal to `src/render3d/`. No event, no new dependency.
- **TB, the timed breaker (26 Nov 2026; G1 "Approve (Recommended)"; written into `src/core/` by TB0, typecheck passes).** Every field is optional, so no `version` bump is needed (as the spring), and `main` typechecks the moment TB0 lands:
  ```ts
  // schema.ts
  /** A timed breaker (081 TB): its clock throws it, never the player. Closed `closed` s, then open `open` s, repeating; `offset` s into that cycle when the clock starts (default 0). Whole seconds. */
  export interface BreakerTimer { readonly closed: number; readonly open: number; readonly offset?: number }
  // on BreakerNode:
  timer?: BreakerTimer;
  // state.ts
  export interface TimerReadout { readonly closed: boolean; /** Seconds to its next flip (its full share while the clock has not started). */ readonly next: number }
  export interface TimerState { /** Seconds since the first move; null before it. */ readonly clock: number | null; /** Per timed breaker, in file order; empty on a map without one. */ readonly timers: ReadonlyMap<string, TimerReadout> }
  // GridState (src/grid/types.ts, TB1) extends TimerState.
  // events.ts, on "breaker:thrown":
  timer?: true; // the clock threw it (not a player action, not an undo step)
  // preview.ts, on LoadPreviewEntry:
  readonly timed?: true; // the entry is the timer's next flip, not a click
  // audio.ts, on SoundView:
  timers?: ReadonlyMap<string, TimerReadout>;
  ```
  `timerRing` is internal to `src/render3d/`, and the `timer-flip` log kind to `src/play/`. No new event name, no new `NodeType`, no new `CIRCUIT_COMPONENTS` entry (the breaker's model; rule 10), no new dependency.
- **Y, the review leftovers (26 Nov 2026):** none in `src/core/`. `arcFlashes` is internal to `src/render3d/`. No event and no new dependency.
- **NB, the deliberate blow (26 Nov 2026):** none. The grid, the analyzer, the check block and the validator already treat a blow as a move (section NB). No event and no new dependency.

## Open questions (for Josh)
**Josh, 24 Nov 2026, on cards (relayed by the main session):**
- On the picker defaults (reload on switch, the "· city" name): "I don't want 2D puzzles anymore. I want this game to be full 3D. The 2D puzzles were really just a prototype to see if the puzzles would be functional."
- What happens to the 2D side: "Hide now, delete later (Recommended)". The picker and page show only city puzzles on the 3D city, with E1's overlay on top; the schematic files stay as P2a's source; the 2D map code goes in X1 and X2 once the 16 pilots are on the city.
- The release playtest harness: "Retarget later (Recommended)". Left alone; R1 re-cuts it for city puzzles before the next release.

This re-cut U1 and U2 and added the X1, X2 and R1 stubs. Questions 1, 4, 6 and 7 below are settled or moot by it. Note for the main session: `CLAUDE.md` and `docs/prototype-brief.md` still describe a 2D puzzle prototype; they are Josh's to reword, not this ticket's.

All questions so far are answered (above), the mid-row one included ("Only when used (Recommended)"). Still open:
1. ~~**Default this cut takes:**~~ **Moot from U2 on** (Josh, 24 Nov 2026: "I want this game to be full 3D"): the page never opens a schematic. Until then: after A2c, `?view=3d` on a schematic puzzle opens the 2D map with a console note, until that puzzle has a city form.
2. **(K3 reports, then only if you want it changed)** the damaged-line prop hangs below the 4.2 m walk floor from the lowest crossing.
3. ~~**The 3D break prop and readability (K3).**~~ Answered 24 Nov 2026: "Only when readable (Recommended)" (see K3).
4. ~~**Default K2d2 takes:**~~ **Moot from U2 on**: the 2D map no longer shows city puzzles ("Hide now, delete later (Recommended)"). As built: the 2D map's scenery (`decor`) shows no roof structures.
   - B1b proposed showing the unused corner structures on and next to the district as scenery dots. `decor` holds paths only, so dots would need a new shape.
   - A roof line that the job uses is drawn as a line, like any other line.
5. **(K3 measures, then yours to decide) The pack loads.** 071 D's subset GLBs were never built, so the city view loads the whole Palm City (103 MB), Sci-Fi City (35 MB) and Sci-Fi Frontier (103 MB) packs for a handful of models. This happens in dev only. K3 reports the load time. If it is too slow, a small section runs 071 D's tool for the picks (`tools/assets/`, grid-simulator). It shares no file with this path and can run beside it. **Taken up by ticket 082** (24 Nov 2026, Josh in chat: "Because the model packs run so slowly, I think we should work on consolidated packs for the game."): K3 measured 6.0 to 7.5 s on swiftshader; 082 cuts a game pack of only the used models, and shares no file with E2.
6. ~~**Default U1 takes:** a city entry is named "... · city".~~ **Settled** (Josh, 24 Nov 2026: "I don't want 2D puzzles anymore."): the picker lists only city puzzles, under their own names. Whether a rework shows "(reworked)" waits for P2a's reworks to carry a flag in their files.
7. ~~**Default U2 takes:** picking reloads the page between the views.~~ **Settled** by the same answer: there is only the 3D view, so there is no switch and no reload.
8. **Default U2 takes (you may overturn it):** the prototype is played in `npm run dev` only. The city view is dev only (the pipeline renderer, and the pack GLBs a web build may not hold: Synty licence, 16 Nov 2026), so a production build shows one line saying so instead of a puzzle. A playable web build would be its own ticket.
9. ~~**Lit buildings (section L), four cards:** L-Q1 the lit window colour and L-Q2 a lamp on a roof structure (before L1); L-Q3 how many dim windows and how they burn (before L3); L-Q4 how the light pool is made (before L2). The options are worded in section L.~~ **All answered** (section L: L-Q1, L-Q2, L-Q3 "1 in 25, steady amber (Recommended)", L-Q4 "Real lights", L-Q5 "Up to 10, no shadows (Recommended)", then "Raise the cap").
10. **A proposal for the GDD, not for this ticket (section S).** The GDD's Draft line "Live cables don't glow" (08, "Cables in the dark") differs from your "Live drops glow (Recommended)", and from E2's glowing job spans before it. Your card stands for the prototype, since the line is Draft. Should the GDD's line be reworded for the minigame (for example, "In the circuits minigame, live job lines and the drops they feed glow; in the walking game, live cables don't"), or left as it is? Nothing in `rest-gdd` is changed by this ticket.
11. **Default U3 takes (you may overturn it):** the scenery buildings light silently in the Relight; only the puzzle's own lamps chime, as before. The other choice is a soft, shared chime as each run's buildings light.
12. **L2's frame budgets (yours to loosen or tighten):** at most 1.0 ms worse than L1's for P0's 3 lights, 2.5 ms at 10, 4.0 ms at 25 and 5.0 ms at 32 (and 60 fps at 32), on your PC from the default camera. They are the architect's starting points. Over 25 or 32, L2 ships at 10 and the numbers come to you.
13. **Section F's bar (yours to move):** the district view at 16.7 ms (60 fps) or under, before power and after the Relight, on your PC from the default camera. The wide 1280 x 800 view is reported, but it is not a pass bar.
14. **F-Q1, the far city** (after F's measurement, only if a view is still slow): keep the whole city drawn, stop drawing past a distance, or drop small props past a distance. Worded in section F.
15. **F-Q2, the pixel ratio** (after F0's measurement, only if rendering at 1x saves more than 2 ms): full sharpness, or 1x scaled up. Worded in section F.
16. **Section FX** (Josh, 24 Nov 2026, on cards): G1 "Approve, FX2 first (Recommended)"; FX-Q1 "Sparks first (Recommended)"; FX-Q2 "Meshes too" (folded into FX1). 24 Nov 2026, after playing FX2: "Merge FX1, fix FX2 (Recommended)", with "extreme" as "More of them", "Bigger, brighter", "Fly further", "Crackle arcs" (FX2 amended; no question left from it). **Answered 25 Nov 2026 on FX4's card:** FX-Q3 "arcs show on overloaded lines", FX-Q4 "the Relight bursts at each lit target" (FX3 folded into FX4). *As first asked:* FX-Q3 where brownout arcs show ("A few at a time on the overloaded feed's live poles (Recommended)"); FX-Q4 the Relight ("A sparkle burst at each puzzle lamp as it lights (Recommended)"). **Not blocking, after FX1's conversion:** FX-Q5 which shard mesh ("Keep `FX_Shard_Rock_Small_01` (Recommended)").
17. **FX's frame budgets:** answered, "1.5 ms / 2.0 ms (Recommended)" (Josh, 24 Nov 2026, on a card): with every effect running (`fx=all`), at most 1.5 ms CPU over `fx=0` for FX2 and 2.0 ms for the whole section, in the same session, and never over 16.7 ms. Over them, the builder stops and the numbers come to him.
18. **Section E5, the camera** (Josh, 24 Nov 2026, in chat: "We should restrict the end users visibility to the puzzle"; on a card: "Cut it (Recommended)"). **Answered** 24 Nov 2026, on cards: G1 and E5-Q1 "Approve, 1.5x (Recommended)"; E5-Q2 "Yes, dev only (Recommended)"; E5-Q3 "Hold at the limit (Recommended)". As asked on its G1 card: E5-Q1 how far out ("1.5x (Recommended)", "1.25x", "2x"), E5-Q2 the dev switch ("Yes, `cam=free` in dev only (Recommended)", "No switch"), E5-Q3 a pane too small for the panels and the district ("Hold the camera at the limit; the panels may cover the district's edge (Recommended)", "Also fold the panels on small panes"). Worded in section E5.
19. **Section W. Answered 25 Nov 2026, on cards** (see section W): G1 "Approve W (Recommended)"; W-Q1 "Glow cards (Recommended)"; W-Q2 "Gold windows + icon (Recommended)"; W-Q4 "One fixed view (Recommended)"; W-Q5 "Close, re-lay (Recommended)". **Then, on W0's cards: W-Q3 "Own block roofs (Recommended)"; ring lines from where each line takes its power: "Yes (Recommended)".** Nothing in section W is open. As asked (cut 25 Nov 2026 from Josh's play of P2a, `docs/design/081-P2a-josh-play.md`): approve W0, W1, W2, W3 and P2a2 as cut, with the architect's readings in section W (every city lamp a building by its drop; `{ post }` and `lead` kept as types but unused; no lamp post stands; "within blocks" read as the drops into the block's buildings).
    - **W-Q1, how a lit window glows** (before W2): "Glow cards and a higher light (Recommended)" (a soft halo in front of each lit window, and the street light raised to half the building's height); "Bloom" (Three's own post-processing glow on everything emissive; a frame cost, budget re-cut); "Both".
    - **W-Q2, how the target building reads among lit scenery** (before W3): "Gold windows and the icon (Recommended)"; "The icon only"; "Scenery stays dark" (S4's lit scenery dropped for the targets' sake, overturning "Drop on a live pole").
    - **W-Q3, what a run may use** (asked with W0's numbers): "Street poles and drops; roofs only to cross a street on a diagonal (Recommended)"; "Street poles and drops only, no roofs"; "Roofs over its own block too".
    - **W-Q4, the camera**: "One fixed view; routes must read from it (Recommended)" (W1's rules); "Four fixed turns, 90 degrees" (a renderer and an interaction section, cut later); "Free orbit" (the same, and E5's limits re-cut).
    - **W-Q5, PR #69**: "Close it, re-lay after W1 (Recommended)"; "Merge it now, re-lay later"; "Keep it open and amend it".
20. ~~**The GDD rewording (section W).**~~ **Closed 25 Nov 2026, no `rest-gdd` change.** Josh, in chat: "The gdd is for a much larger scoped game. This is just one small mini game in the grand scope of a larger series." The minigame's drift from the GDD's Draft lines stays in this prototype's own files; the GDD is not reworded for it. *As it stood before:* Josh, 25 Nov 2026, on a card: "Reword it (Recommended)". A proposal for `rest-gdd`, to be made there by whoever Josh gives it to; this ticket changes nothing in `rest-gdd`. Every line it touches is Draft; no Decided rule changes. Proposed wording, `docs/05-gameplay.md`:
    - "The power grid (Draft)", **Nodes**: add after the endpoints list: "In the circuits minigame, the endpoints the priests name are buildings: a building is lit when current reaches it down its drop, and its windows show it."
    - "Fault tracing (Draft)", the fault table's **Dead lamp** row: "Pulses reach the lamp post, but the lamp stays dark" becomes "Pulses reach the lamp post, or run down a building's drop, but the lamp or the building's windows stay dark". The part stays **Bulb**.
    - "Capacity and restraint", the endpoints bullet: unchanged (it already names shrines and homes).
    The brief's Draft line "Targets. `target` lists the lamps the priests want lit" would read "... the lamps, on the city the buildings, the priests want lit"; the brief is Josh's to reword, as noted under the Full 3D re-cut.
21. **Section V. Answered 25 Nov 2026, on cards:** G1 "Approve V (Recommended)"; V-Q1 "Ribbon tint (Recommended)"; V-Q2 "Visible load (Recommended)"; V-Q3 "Breakers and switches (Recommended)". **Then, after V0's note:** V-Q5 "On, a key hides it (Recommended)"; V-Q4 "+3, load added (Recommended)"; V-Q6 "Keep counting it (Recommended)". Nothing in section V is open. As first asked:
    - **V-Q1, how a dead puzzle wire is highlighted:** "Ribbon tint (Recommended)"; "Tint, and faded through buildings"; "Overlay lines back" (E4's lines, which you dropped on 24 Nov).
    - **V-Q2, what the number counts:** "Drawn load (Recommended)" (unreadable faults treated as sound, so 'Faults hide faults', Decided, holds); "True what-if" (a proposal to change that Decided rule: the number would reveal hidden faults on 07 and 16).
    - **V-Q3, which controls:** "Breakers and switches (Recommended)"; "Breakers only" (as you worded it).
    - **V-Q4, the number's form:** "The change, +3 (Recommended)"; "The feed after, 13 of 25"; "Both".
    - **V-Q5, the puzzle it removes** (03, 04, 07, 09 to 15 become a sum, by the architect's reading; V0 measures it): "Always on"; "On by default, a key hides it (Recommended)"; "Only while hovering an icon"; "Off on capacity pilots".
22. **Section FX4. Answered 25 Nov 2026, on cards:** G1 "Approve FX4 (Recommended)"; FX4-Q1 "Towards the fuse (Recommended)"; FX4-Q2 "Fold it in (Recommended)" (FX-Q3 "arcs show on overloaded lines", FX-Q4 "the Relight bursts at each lit target"); FX4-Q3 "Twice a live break's (Recommended)". As asked:
    - **FX4-Q1, which way the bolt runs:** "Towards the fuse (Recommended)" (as worded: the bolt runs through the wires, then the big spark at the fuse); "Out from the fuse" (as the 2D map's streaks ran).
    - **FX4-Q2, FX3 with it:** "Fold FX3 in (Recommended)", and answer FX-Q3 (brownout arcs: "A few at a time on the overloaded feed's live poles (Recommended)") and FX-Q4 (the Relight: "A sparkle burst at each puzzle lamp as it lights (Recommended)") on the same card; or "Fuse blow only, FX3 later".
    - **FX4-Q3, how big the burst is:** "Twice a live break's (Recommended)"; "A shower, four times"; "The same as a live break".
23. **Section X. Answered 25 Nov 2026, on cards:** G1 "Approve X (Recommended)"; X-Q1 "City puzzles only (Recommended)"; X-Q2 "Next release (Recommended)"; X-Q3 "Main session (Recommended)". As asked (Josh: "Cut X1, X2, R1"): approve X1a, X1b, X2, R1 and X1c as cut, with the architect's calls in section X (the interfaces to `src/render3d/`, `stableHash` from `src/city/`, the build loading only city puzzles, a harness that doesn't draw).
    - **X-Q1, what the harness replays:** "City puzzles only (Recommended)"; "City puzzles and the schematics 17 to 64, until they are on the city".
    - **X-Q2, running the harness on R1's branch:** "Wait for the next release (Recommended)" (your rule: playtests only on releases; the first city snapshots are taken then); "Run it once on R1" (this counts as your word for one run, not a release).
    - **X-Q3, the docs naming the 2D map** (`CLAUDE.md`, the brief, four agent files): "Main session rewords them after X1c (Recommended)"; "I'll reword them myself"; "Leave them for now".
24. **Section SK. Answered 25 Nov 2026, on a card:** G1 "Approve"; SK-Q1 "Title screen (Recommended)" (in play the moonlight only; the sky, moon and stars on the splash and the title; the look-up dropped); SK-Q2 "Ahead, low (Recommended)"; SK-Q3 "No shadows (Recommended)". Josh, in chat: "we need a sky box, it should just be a night sky, and put a moon in the sky as a light source". SK-Q4 (the dev Day / Night key), answered in his own words on the SK-Q4 and T-Q7 card: "day is not an option in the final game, day should only be used for development purposes." Nothing in SK is open.
25. **Section T. Answered 25 Nov 2026, on cards:** G1 "Approve"; T-Q1 "Rest: Circuits (Recommended)"; T-Q2 "Goodbye line (Recommended)"; T-Q3 "Best (Recommended)"; T-Q4 "Browser + Clear button (Recommended)"; T-Q5 "Every load (Recommended)"; T-Q6 "Stage 01's, gold (Recommended)". Josh, in chat: "After we create the sky box I want to create a title screen." (in full under section T). Then T-Q7, replaying a stage (asked first with SK-Q4, then on its own card): "Replay any (Recommended)". Nothing in section T is open. T3b: "Move it left (Recommended)", merged by PR #96 on "Merge when green (Recommended)".
26. **Section N, series v1 (cut 25 Nov 2026; for G1).** Your words on the plan are recorded in section N ("Approve, batches (Recommended)"; batteries: "The puzzles should have progressive levels of difficulty and introduce new concepts to the player with each puzzle, one building upon the next."; targets: "I don't care. Just make sure that different points on the map are used with each puzzle. You can even use the same nodes over again if it means increasing the complexity of the puzzle to spread across multiple districts."; pilots: "Replace (Recommended)"). For G1:
    **Answered 25 Nov 2026, on a card:** G1 for N0, N1 and NS "Approve (Recommended)"; N-Q1 "Keep all (Recommended)"; N-Q2 "New move counts (Recommended)" (11, 13 and 14 stay as planned). Nothing in section N is open; N2 and N3 wait on Josh's play of the batch before. As asked:
    - ~~**Approve N0, N1 and NS as cut.**~~ N2 and N3 are named and wait on your play of the batch before. N0 is the architect's addition: without it the analyzer reads only schematic files, and the series has none.
    - ~~**N-Q1, the HUD's Map menu in play**~~ (a default you may overturn): "Keep listing every city puzzle, as a dev aid (Recommended)"; "Series only, like the stage select".
    - ~~**N-Q2, before N2 (it does not block N1): what counts as a new concept.**~~ Puzzles 11, 13 and 14 add no new piece; each one's new thing is a move that combines two earlier ideas (the ring with the rating; the ring with faults hiding faults; the rating with the switch). The architect reads your "introduce new concepts to the player with each puzzle" as met by a new reasoning move. Options: "A new move counts (Recommended)"; "Each puzzle needs a new piece or rule" (the designer re-plans 11, 13 and 14 before N2).
    **26 Nov 2026:** N0 merged by PR #97 ("Merge, start 1-5 (Recommended)"); N1 and NS merged by PRs #99 and #98, and N2 started, after you saw screenshots of 1 to 5: "Merge and start the next 5". N2 is re-cut to 6 to 10; N3 (11 to 15), N4 (16 to 20) and N5 (21 to 25) wait on your word. Nothing is open. One architect's call you may overturn: a puzzle in 6 to 10 whose trap needs two lines ending side by side at the target may take a 2-block district (read as within "You can even use the same nodes over again..."), or keep 1 block and change its trap's detail, said in its note (N2's lesson from N1).
27. ~~**Section TB, the timed breaker (cut 26 Nov 2026; for G1, not approved).**~~ **Answered 26 Nov 2026, on cards:** G1 "Approve (Recommended)"; TB-Q1 "Real seconds (Recommended)"; TB-Q2 "Breaker, on/off (Recommended)"; TB-Q3 "Clock only (Recommended)"; TB-Q4 "In 16-20 (Recommended)". Nothing in section TB is open. *As asked:* Josh's request is recorded at the top of section TB. For G1: approve TB0 to TB6 as cut, with the rule and the architect's calls in section TB (the schedule on screen, the clock starting at the first move, the breaker's model). Four cards, the recommendation first:
    - **TB-Q1, what drives its timer:** "Real seconds, the battery's clock (Recommended)" (the tools already model it; guarded by the clock starting at the first move, the schedule on screen, and a slow-player check at 3 s a click); "One step per move" (turn-based; Undo rewinds it; needs a Wait control in `src/play/` and `src/ui/`; the battery stays on real seconds); "Real seconds, with a pause key" (an interaction and ui section added).
    - **TB-Q2, its form:** "A breaker, on and off (Recommended)" (two out of phase feed two sections in turn); "A timed switch too" (one piece that swaps its two lines on the clock; the same `timer` field on `SwitchNode`); "A timed switch instead".
    - **TB-Q3, can the player touch it:** "No, the clock alone (Recommended)"; "A click holds it" (it stops its clock where it stands until clicked again); "A click throws it" (and the clock carries on from there).
    - **TB-Q4, where it enters the series:** "First in 16 to 20, stays 25 (Recommended)" (a plain 2-block map, then a layer in 21 to 25; one planned row gives way at N4's re-cut); "First in 11 to 15" (N3 then waits for TB0 to TB4); "Add it, 26 puzzles"; "After the 25".
28. ~~**Section Y, the review leftovers (cut 26 Nov 2026; for G1, not approved).**~~ **Answered 26 Nov 2026, on cards:** G1 "Approve Y (Recommended)"; Y-Q1 "Comment only (Recommended)"; Y-Q2 "The playtester (Recommended)". Nothing in section Y is open. *As asked:* Your words: "Let's finish the leftovers from the handoff". These are Y1 (FX4's arc flash, once per arc), Y2 (V3's fuse red) and Y3 (R1's id floor), in two PRs. Three questions, the recommendation first; they are listed in section Y:
    - **G1:** "Approve Y (Recommended)"; "Approve Y1 and Y3 only"; "Not now".
    - **Y-Q1, the fuse label's red:** "Comment only, keep it as a guard (Recommended)"; "Drop the red"; "Full reads red".
    - **Y-Q2, who builds Y3:** "The playtester, as for R1 (Recommended)"; "Leave it for the next release".
29. ~~**Section N3, what a "district" is (cut 26 Nov 2026; it does not hold up the build).**~~ **Answered 26 Nov 2026, on a card:** N3-Q1 "A block (Recommended)". The architect's call stands, and nothing in N3 is open. *As asked:* N3 is approved to build ("Start it"), and it builds on the architect's call below unless you overturn it. One card, the recommendation first:
    - **N3-Q1, "span multiple districts":** "A district is a block (Recommended)". Each of 11 to 25 spans 2 to 4 blocks (the loader's limit), and the solve needs each one. On the puzzle city the blocks are the parts of town you can tell apart: the history districts only exist in the tech, hold-out and ruin eras. The other option (blocks that don't touch are not one: CK14 requires a district's blocks to touch across a street):
      - "A history district": each puzzle spans 2 or more of stage 10's districts (1 to 4 blocks each) on the clean city. They are not drawn on it, and two of them can come to more than the 4 blocks the loader allows, so this needs a validator and a fit change before N3 can build.
30. ~~**Section NB, fuses as a tool (cut 26 Nov 2026).**~~ **Answered 26 Nov 2026, on cards:** G1 "Approve NB (Recommended)"; NB-Q1 "At 16, first of N4 (Recommended)"; NB-Q2 "Allow it too"; NB-Q3 "Drop the 2-timer cap"; NB-Q4 "As today (Recommended)". Nothing in NB is open. Your words in chat: "I would like the game the game to include challenges where you intentionally blow fuses to resuce load on a branch to complete objectives as well." and "There really shouldn't be a limit to the number of puzzles that can leverage a mechanism per series. If the mechanics are to build on top of one another then fuses should be able to be leveraged in any puzzle. Any number of times for any reason after they've been introduced."
31. **Section N4, series 16 to 20 (re-cut 26 Nov 2026; approved to build: "Start N4 (Recommended)").** Two cards; neither stops the build, as worded in N4's **Questions for Josh**. The recommendation first:
    - **N4-Q1, the order of 17 to 20:** "Relay, spring, battery, timer (Recommended)" (as cut; plan rows 16 and 17 merge into the relay, row 20 gives way to the timer, and the battery twist is the second timer puzzle, in N5); "Timer at 19, battery twist at 20"; "Timer at 18, after the relay". 16 and 17 build meanwhile.
    - **N4-Q2, a hover cue for the battery:** "Wait until you play 19 (Recommended)"; "Cut it now" (a grid-simulator section, then a renderer one, before 19).
