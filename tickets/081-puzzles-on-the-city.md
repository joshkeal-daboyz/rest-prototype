# 081 · Purge the old city; the 64 puzzles on the pipeline city, on its streets, picked models, and a 2D overlay to play them

owner: per section (renderer, puzzle-designer, pipeline-designer, lead-architect, grid-simulator, landscape, facades, ui; see Sections)
status: approved (G1, Josh, 23 Nov 2026, in chat: "Approve 081"). Cut 23 Nov 2026 on Josh's request (below); re-cut the same day on his answers to questions 1 to 10 (below). **K2 is done** (K2a, K2a2, K2b, K2c, K2d1, K2d2 all merged; K2d2 by PR #42, Josh, 24 Nov 2026, on a card: "Merge K2d2 (Recommended)"). **Next: the playable path** (Josh, 24 Nov 2026, on a card: "Playable path first (Recommended)"): P0, K3, U1, then E2, then U2, before H4, P1 and P2a. See *The playable path*.
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
7. **The overlay's style:** **"Icons plus lines (Recommended)"**.
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
- **`src/grid/` and `src/night/` are not touched.** `src/city/circuit/` is pure: no DOM, canvas or three, and it imports only `src/core/` and `src/city/`.
- **Josh's K1 answers hold except as changed on 23 Nov:**
  - CK5's corner spans are never over a carriageway.
  - CK6's pole crossings are square and between junctions, never over one (Q45). They stand 2.5 m past the corner cell, just beyond the crosswalk (K1 answer 3), not in the middle of the block. Roof spans are the one exception (6a).
  - CK7's 4.2 m floor holds for every span over a street, roof spans included.
  - CK9's drops are on the pole side only (Q4, Q12).
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
| H4 | Stage 7's roof pieces keep clear of the corner roof structures | facades | K2d1 | 3 |
| P1 | The fit tool and the city check (with the mid-row clearance check) | grid-simulator | K2c, K2d2 | 10 |
| P2a | Puzzles 01 to 16 on the city (the pilot) | puzzle-designer | P1, K2d2 (9 of the 16 need roofs) | 0 |
| P2b to P2d | Puzzles 17 to 64, 16 a batch | puzzle-designer | P2a, and Josh's word after playing it | 0 each |
| D1 | The component shortlist | pipeline-designer | G1 | 0 (a note) |
| D2 | The gallery's component view | ui | D1 | 5 |
| D3 | The picks table | renderer | Josh's first picks | 2 |
| E1 | Glyphs out of the 2D renderer; the overlay's icons and lines, pure | renderer | G1 | 9 |
| P0 | `city-two-ways-round` as a city puzzle file in `puzzles/city/` | puzzle-designer | now (K2c is in) | 0 (1 path line) |
| K3 | The circuit drawn on the city | renderer | now (K2d1, K2d2, PK2, A2c, D3 are in) | 7 (6 added, 1 rewritten) |
| U1 | The picker lists only city puzzles (pure) | ui | now (C1 is in) | 3 |
| E2 | A city puzzle played on the city, through the overlay | renderer | K3 (shares `plan3d.ts`) | 10 |
| U2 | The page opens straight into the 3D city (`main.ts`) | ui | E2, U1 | 1 |
| X1 | **Stub, not cut:** delete the 2D map view (`src/render/`) | renderer | P2a, and Josh's word | removals; about 2 added |
| X2 | **Stub, not cut:** delete the 2D side of `src/ui/` and `main.ts` | ui | X1 | removals; 0 added |
| R1 | **Stub, not cut:** retarget the release playtest harness to city puzzles | (at cut) | before the next release | at cut |

`src/play/` (interaction) has no section. E2 keeps the `MapRenderer3d` interface, so play and its `hitTest` calls do not change. If E2's builder finds that `src/play/` must change, it stops, and the architect re-cuts with an interaction section.

**Between A2c and E2 the 64 puzzles have no 3D view.** Josh accepted this with answer 1. The 2D game plays until U2 merges.

**Full 3D (Josh, 24 Nov 2026, on cards).** "I don't want 2D puzzles anymore. I want this game to be full 3D. The 2D puzzles were really just a prototype to see if the puzzles would be functional." On what happens to the 2D side: "Hide now, delete later (Recommended)". On the release harness: "Retarget later (Recommended)". So, from U2 on, the picker and the page show only city puzzles, on the 3D city, with E1's overlay of icons and lines on top. The schematic files in `puzzles/` stay, as the source P1 and P2a fit onto the city. The 2D map code is deleted by X1 and X2 once the 16 pilots are on the city. `tests/playtest/` is left alone until R1.

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
- **Files** (expected): `src/city/facades/`.

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
3. [ ] A fitted draft converts to a `Puzzle` with the schematic's node, line and fault ids, types, loads, ratings, capacities, parts, targets and line endpoints. **test**: 2 cases.
4. [ ] The same inputs give the same draft. **test**: 1 case.
5. [ ] The search stops at `FIT_BUDGET` steps and reports "gave up". **test**: 1 case.
6. [ ] `npm run check puzzles/city/<id>.city.json`, and `npm run check` with no argument, check the city puzzles too. **test**: 2 cases in `tools/check.test.ts`.
7. [ ] **One sweep in the suite.** Every `puzzles/city/*.city.json` validates, converts on 6 x 6 seed 1 (built once through the module cache), and its note's check block replays. **test**: 1 case. It may pass 2 s once the puzzles are in. It is the one place city puzzles' play is held, and it replaces a test per puzzle. The builder gives its time.
8. [ ] The builder prints, once in its reply, which of 01 to 16 fit unchanged and what blocks each one that does not. **no test**.
9. [ ] **The mid-row clearance check** (B1b's K2 check 11; Josh, B1q: "Only where clear"). A city puzzle may use a mid-row roof structure only where stage 7 has left that roof clear by the keep square. It runs on the plan after stage 7, so it is P1's (the city check and the fit), not K2d's: stage 6 can't see stage 7. A fit offers only clear mid-row places. **test**: 1 fixture case, where a used mid-row place under a roof prop fails.

**Files.** New `tools/fit.ts`, `tools/fitrun.ts`, `tools/fit.test.ts`; `tools/check.ts`, `checkrun.ts`, `check.test.ts`; `package.json` (the `fit` script only).

### P2a · Puzzles 01 to 16 on the city, the pilot (puzzle-designer). Branch `ticket/081p2a-city-puzzles-01-16`
### P2b to P2d · Puzzles 17 to 32, 33 to 48, 49 to 64. Branches `ticket/081p2b-...`, `p2c`, `p2d`
P2b to P2d start only after Josh has played the pilot and said so in chat (answer 2).

**The pilot, from B1p.**
- 01, 02, 05, 06, 08, 13 and 16 fit on poles, on 1 block.
- 03, 04, 07, 09, 10, 11, 12 and 14 fit on 1 block, using roof structures (B1q). 04 and 12 use roofs on neighbouring blocks (K2c's CK14 exception), and 12 also uses 7 clear mid-row places (P1's check).
- **15 is a rework** under answer 4: each of its feeds has 2 lines, and CK14 gives a feed one entering span.

P1's own fits (criterion 8) are the record. P2a waits for K2d, because 9 of its 16 need roofs.

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

### X1 · Delete the 2D map view (renderer). **Stub, not cut; not to be built yet**
Josh, 24 Nov 2026: "Hide now, delete later (Recommended)". Cut in full once P2a's 16 pilots are on the city and Josh has said so. Expected:
- **Goes:** `src/render/map-renderer.ts` and the 2D map's drawing modules and tests (most of `src/render/`).
- **Moves first, does not go:** what the city view still uses from `src/render/`: `glyphs.ts` (E1's overlay draws with it), the `MapRenderer`, `MapPanView`, `MapPlaces`, `MapCentre` and `MapBlockers` interfaces (`renderer.ts` imports them), and `planRelight` (`main.ts`'s Relight sound cues). They move to `src/render3d/` (or the interfaces to `src/core/`, the architect's call at cut).
- **To check at cut:** every `tickets/rules-coverage.md` row held only by a `src/render/` test gets a city-view test, or the row is re-pointed, before the test goes. That is where its "about 2 added" comes from.
- **Not in it:** the schematic puzzle files (P2b to P2d still fit from them), `tests/playtest/` (R1), the conversion's `pos` and `decor` in `src/city/circuit/` (grid-simulator's; a separate small section if they are then unused).

### X2 · Delete the 2D side of `src/ui/` and `main.ts` (ui). **Stub, not cut; after X1**
- **Goes:** `collectMaps` and `MapEntry` and their five cases, `wants3d`, `NO_CITY_FORM_NOTICE`, `PuzzleKind` and their two cases (A2d), and `main.ts`'s dead 2D branches.
- **To decide at cut:** whether the schematics' `puzzles/*.json` glob stays in the build at all.

### R1 · Retarget the release playtest harness (owner at cut). **Stub, not cut**
Josh, 24 Nov 2026: "Retarget later (Recommended)". `tests/playtest/` replays the schematics and is left alone until then. Re-cut it for city puzzles before the next release Josh calls; until then its snapshots may go stale, as the release loop allows.

## Files
Per section, above. This branch (the cut): `tickets/081-puzzles-on-the-city.md`, `tickets/070-city-pipeline.md` (pointer lines), `tickets/071-pack-power-lines.md` (a pointer line: C and E's ladder wiring are dropped), `tickets/rules-coverage.md`, `src/core/citycircuit.ts` (new; `CityPuzzleView` added 24 Nov 2026 for the playable path), `src/core/cityplan.ts` (`CityCircuitLayer`), `src/core/index.ts`.

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
- **Events:** none new.
- **No new dependency.** The overlay is Canvas 2D.

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
