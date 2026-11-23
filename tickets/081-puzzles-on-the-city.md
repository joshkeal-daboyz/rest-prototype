# 081 · Purge the old city; the 64 puzzles on the pipeline city, on its streets, picked models, and a 2D overlay to play them

owner: per section (renderer, puzzle-designer, pipeline-designer, lead-architect, grid-simulator, landscape, facades, ui; see Sections)
status: approved (G1, Josh, 23 Nov 2026, in chat: "Approve 081"). Cut 23 Nov 2026 on Josh's request (below); re-cut the same day on his answers to questions 1 to 10 (below).
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
8. **The damaged line:** **"Yes, a picked prop"**. Josh picks a model for the break, placed at the cut span. The wire itself stays code-drawn (071).
9. **The picking process:** **"A card per component"**. The main session puts one question card per component, built from D1's shortlist with pictures, and records his pick in his words in `docs/design/081-component-picks.md`.
10. **`src/city/circuit/` for the grid-simulator:** **"Yes, add it"**. The main session edits `.claude/agents/grid-simulator.md`. No agent does.

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
- **Deleted files (A2c):** `town.ts`, `terrace.ts`, `scene.ts`, `layout.ts`, `camera.ts`, `captions.ts`, `text.ts`, `streetcam.ts`, `gallery.ts` (the 043 building gallery, `?gallery=`), `stackgallery.ts` and `debug3d.ts` (`?fronts=1`, ladder only). Their tests go with them: `town`, `townpin`, `packpin`, `terrace`, `terracepack`, `terracetown`, `stacktown`, `scene`, `layout`, `captions`, `streetcam`, `gallery`, `stackgallery`, `debug3d`, `live`, `streets`, and any other file whose every case builds the ladder town. A2b sorts the mixed files first.
- **Kept outside `src/render3d/`:** the 2D map and its background town (`src/render/`, including `src/render/city.ts`, which `models3d.ts` and the kit read for `stableHash`), the tile sheet (070 Q47), the 074 asset gallery (`?assets=`), `tests/playtest/` (it replays the grid only), and the fronts save plugin (`tools/calibration/`). The plugin is still read through `calibration.ts`. Whether to delete it is a later ticket.
- **What `?view=3d` does after A2c:** on a schematic puzzle, the 2D map opens and the console says "3D view: this puzzle has no city form yet" (A2d, ui). `?view=3d&city=tiles` is the pipeline city, as now. A city puzzle opens in the city view from E2 and U1 on.

## Rules this ticket holds
- **The GDD's Decided rules (the brief's "Rules carried over") are law.** A city form is laid out differently and plays by the same rules on `src/grid/` unchanged.
  - **A city puzzle laid from a schematic unchanged** (its `from` set and no rework) keeps exactly the schematic's nodes, lines, faults, parts, loads, ratings, capacities and targets (answer 5). Its check block is the schematic's, copied, and gives the same outcomes.
  - **A reworked puzzle** (answer 4) is a new puzzle: its own check block, its own analyzer numbers, and a note that says what changed and why.
- **`src/grid/` and `src/night/` are not touched.** `src/city/circuit/` is pure: no DOM, canvas or three, and it imports only `src/core/` and `src/city/`.
- **Josh's K1 answers hold except as changed on 23 Nov:**
  - CK5's corner spans are never over a carriageway.
  - CK6's pole crossings are square, mid-block and never over a junction (Q45). Roof spans are the one exception (6a).
  - CK7's 4.2 m floor holds for every span over a street, roof spans included.
  - CK9's drops are on the pole side only (Q4, Q12).
  - CK12: fuse boxes, breakers and switches stand on poles, **or on roof structures** (6b), and the feed on a pole just outside the district (Q10).
  - CK13 is **changed by answer 5**.
  - CK14's district is 1 to 4 blocks (Q7).
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
| A2a | Move the shared kit's constants out of the ladder files | renderer | A1 | 0 added (typecheck; every kept test passes unedited) |
| A2b | Kept modules' tests stop building the ladder town (as L2c) | renderer | A2a | at most 15 rewritten; split A2b1, A2b2 if more |
| A2d | `?view=3d` on a schematic puzzle opens the 2D map | ui | A2a | 2 |
| A2c | Delete the ladder town | renderer | A2b, A2d | about 2 added; the ladder's tests removed |
| B1 | CK17, the street rule and roof structures, designed | puzzle-designer | G1 | 0 (a note) |
| B1p | "pre-check 081 B1" | pipeline-designer | B1 | 0 (a note) |
| C1 | The city puzzle validator | lead-architect | G1 | 6 |
| K2a | Stage 6: poles and spans (CK1 to CK8) | grid-simulator | C1 | 12 |
| K2b | Stage 6: drops, lights, lamp posts, node places (CK9 to CK12) | grid-simulator | K2a | 10 |
| K2c | The conversion (CK13 as changed, CK14, CK15) | grid-simulator | K2b | 10 |
| K2d | Stage 6: roof structures and roof spans (CK17) | grid-simulator | K2c, B1p, Josh's answers to it | at most 10 |
| I2 | Stage 8 keeps clear of the circuit | landscape | K2b | 3 |
| H4 | Stage 7's roof pieces keep clear of roof structures | facades | K2d | 3 |
| P1 | The fit tool and the city check | grid-simulator | K2c | 9 |
| P2a | Puzzles 01 to 16 on the city (the pilot) | puzzle-designer | P1 (K2d for any that needs a diagonal) | 0 |
| P2b to P2d | Puzzles 17 to 64, 16 a batch | puzzle-designer | P2a, and Josh's word after playing it | 0 each |
| D1 | The component shortlist | pipeline-designer | G1 | 0 (a note) |
| D2 | The gallery's component view | ui | D1 | 5 |
| D3 | The picks table | renderer | Josh's first picks | 2 |
| E1 | Glyphs out of the 2D renderer; the overlay's icons and lines, pure | renderer | G1 | 9 |
| K3 | The circuit drawn on the city | renderer | K2b, A2c | 6 |
| E2 | A city puzzle played on the city, through the overlay | renderer | E1, K3, K2c | 9 |
| U1 | The picker opens city puzzles | ui | E2, P2a | 4 |

`src/play/` (interaction) has no section. E2 keeps the `MapRenderer3d` interface, so play and its `hitTest` calls do not change. If E2's builder finds that `src/play/` must change, it stops, and the architect re-cuts with an interaction section.

**Between A2c and E2 the 64 puzzles have no 3D view.** Josh accepted this with answer 1. The 2D game plays throughout.

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

**Acceptance criteria.**
1. [ ] The names listed under *Moves first* are in `src/render3d/kitunits.ts`, with values unchanged, and each importer reads them from there. No name stays defined in two places, and nothing is re-exported from a ladder file. **no test**: typecheck, and every existing test passes unedited, digest pins included.
2. [ ] The report lists every name moved, and every ladder-only function in a kept file with whether `plan3d.ts`, `planview.ts`, `assetcatalogue.ts` or `assetviewer.ts` reaches it at run time. **no test**.
3. [ ] `kitunits.ts` imports no three and no DOM. **no test**: A2c's grep covers it.

**Files.** New `src/render3d/kitunits.ts`, and import lines plus the moved definitions in the `src/render3d/` files named under *Moves first* and their importers. **Must not:** behaviour, `src/city/`, `src/core/`, any test.

### A2b · Kept modules' tests stop building the ladder town (renderer). Branch `ticket/081a2b-kept-tests` (A2b2 if needed)
**Goal.** As 070 L2c, for the ladder. No test of a kept file builds `townLayout`, `packTown` or `buildScene`, or reads a ladder map's town, for a check on code that stays.

**Acceptance criteria.**
1. [ ] Each such case in a kept file's tests (`dressing`, `dressdraw`, `furniture`, `stacks`, `sills`, `escapes`, `models`, `placeholders`, `colourway`, `lightrig`, `lighting`, `facade`, `facing`, `polygon`, `calibration`, `citymetrics`, `powerkit`, `pick`, `relight3d`, `styleguide`, `stylepin`, `kitpin`, `plan3d`, `daytoggle` and the pin files that stay) is sorted into one of three kinds:
   - (a) **re-pointed** to a typed fixture or the pipeline city (6 x 6 seed 1, cached), with no assertion weakened;
   - (b) **deleted**, because the pipeline's own stage checks hold the same rule (named in the report);
   - (c) **left** for A2c, because it tests ladder-only code.

   **test**: kind (a) cases, at most 15 per PR. If more, the work splits into A2b1 and A2b2 by file, and the report says which PR holds which files.
2. [ ] `powerkit.test.ts`'s ladder-span case (071 B2) becomes a fixture of the ladder spans it read, or goes as kind (b) if 071 B's fixture cases hold the same rule. **test**, counted in criterion 1.
3. [ ] The report lists every case and its kind. **no test**.

**Files.** The kept files' `*.test.ts` and any test-only fixture next to them. **Must not:** any non-test `.ts` file.

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
4. [ ] **Tests go with their code**: the ladder's tests named under *Deleted files*, and A2b's kind (c) cases, each listed in the report. The test count falls. **no test**.
5. [ ] **`ASSET_GALLERY_USES` loses "ladder".** The architect commits that `src/core/assetgallery.ts` line on this branch before the builder starts. `assetcatalogue.ts` stops computing that use, and 074's pinned rows change only in that column. **test**: existing (rewritten cases count).
6. [ ] **The guide and grammar.** Lines that describe only the ladder's town are deleted or marked as history. `docs/city-style/decisions.md` keeps every entry, and drift checks of deleted lines go with them. **no test**: the reviewer reads the diff.
7. [ ] **`tickets/rules-coverage.md`:** the "037 C" entry on the Relight row points to E2. This is the architect's edit, committed with this section. **no test**.
8. [ ] **The browser** (the main session):
   - `?view=3d&city=tiles` at 6 x 6 seeds 1 and 3, with `cam=street` and `light=night`;
   - `city=tiles&sheet=1`;
   - `?assets=city-pack`;
   - `?puzzle=09-shrine-circuit` (2D) and `?puzzle=09-shrine-circuit&view=3d` (the 2D map, with the console line).

   **browser**.

**Files.** `src/render3d/` (deletions, `renderer.ts`, the kept files' ladder-only functions, the deleted files' tests); `docs/city-style/*.md` and `docs/city-grammar.md` (ladder-only lines). **Must not:** `src/city/`, `src/render/`, `src/play/`, `src/ui/`, `tests/playtest/`, `tools/`. If a deletion needs one of these, stop and report: that is a re-cut.

### B1 · CK17, the street rule and roof structures, designed (puzzle-designer; a note, no code). Branch `ticket/081b1-roof-spans`
**Goal.** Josh's rule, with his 23 Nov answers, written so a stage can follow it. The note's questions are only those his answers leave open.

**Acceptance criteria.** All **no test**: this is a design note, and the pre-check measures it.
1. [ ] **`docs/design/081-B1-roof-spans.md` states CK17 in K1's form** (rule, where, numbers on seed 1, reads, status, K2 checks, fails). It covers:
   - **On the streets.** Every along, corner and crossing span already follows the streets (CK4 to CK6). Measured on seed 1: does anything break "within the street structure" today?
   - **When a diagonal is used.** Which lines on a city puzzle want a diagonal, for example a lamp or node across a street from the pole line, a route that would otherwise take two crossings and a corner, or a link over an intersection (6a). Also how often P1's fit wants one on the pilot (01 to 16).
   - **The roof structure.** Which buildings may carry one: height, roof kind, and keeping off stage 7's roof exit, water tower and roof props (H3, H3b). Its attachment height against CK7's 4.2 m floor over a street. Its id and place in CK15's style.
   - **Its spans:** roof to roof, or roof to pole (6c); the longest span; over an intersection only for roof spans (6a). How a roof span clears the corner spans, the masts of stage 9 and other roof spans in plan and height.
   - **Its nodes (6b).** Breakers, switches and fuse boxes may stand on a roof structure, and the note gives their attachment counts as CK12 does for poles. **Still open for Josh:** junctions, batteries, lamps and the feed (Q10 puts the feed on a pole outside the district) on a roof. The note asks, recommended answer first.
   - **Reach and reading.** In this prototype a roof node is played by its overlay icon (E1, E2), so no reach rule binds it. The note records what it means for the street layer later:
     - 073's **T-2** ("every node place stays reachable ... on foot along pavement or road"), which a roof node meets only by a building's roof exit (H3);
     - the schema's `overhead` ("needs a climb to repair", street scope);
     - the brief's "Later: the street" (the lamp's reach, the breaker walk).

     The note says whether T-2 needs a roof clause, and asks Josh if so. No GDD Decided rule covers where a node stands; the note says so, or names any rule it finds.
   - **Against each rule it touches**, one line each: CK5, CK6 and Q45 (lifted for roof spans only), CK7, CK9 and Q4/Q12 (still no drop across a street), CK12 and Q9 (lifted for roof structures only), CK13 as changed, CK14 (may a roof structure on a block next to the district carry the job?), CK16. Every clash with a Josh answer is a numbered question.
2. [ ] **Ids and fields for the architect**: the roof structure's pole kind, span kind and `CityNodePlace` form, so they can be added to `src/core/citycircuit.ts` before K2d.

**Files.** `docs/design/081-B1-roof-spans.md`, and a probe the designer runs on demand (not committed under `src/`).

### B1p · Pre-check "pre-check 081 B1" (pipeline-designer). Branch `ticket/081b1-roof-spans`
**Still needed after Josh's answers.** Answers 5 and 6a to 6c settle the rule's shape, but none of its numbers has been measured. Still unmeasured:
- how many roof structures the city can carry and where;
- their heights against the 4.2 m floor;
- roof span lengths, and their clearance from corner spans, masts and each other;
- clashes with stage 7's roof pieces;
- how many pilot puzzles need one;
- whether carrier-only lines (answer 5) still give every puzzle a fit on seed 1.

It measures CK17 on the 20 named runs, by a script run on demand and never in `npm test`. If it does not report "holds", its note goes to Josh before K2d is cut. His answers go at the top of both notes in his words, and then the architect cuts K2d in full. **Files.** `docs/design/081-B1-precheck.md`.

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
**Before it starts:** the main session adds `src/city/circuit/` to `.claude/agents/grid-simulator.md` (answer 10).
**Goal.** `src/city/circuit/` builds `CityCircuitLayer`'s poles, spans and `keep` as CK1 to CK8 say, and the circuit stage joins `BUILT_STAGES` between buildings and facades.

**Acceptance criteria.**
1. [ ] The stage is a pure function of the layers before it, frozen by the runner, with a digest and a flat picture. **test**: 1 digest pin on seed 1. **browser**: `?city=plan&stage=6`.
2. [ ] CK1, CK2 and CK3. **test**: 3 fixture cases, on CK2's and CK3's "Fails" lines.
3. [ ] CK4, CK5 and CK6. **test**: 3 fixture cases.
4. [ ] CK7 against 071's attachment table. **test**: 1 fixture case.
5. [ ] CK8: one connected network. **test**: 1 case on 6 x 6 seed 1, one-way on.
6. [ ] The builder prints seed 1's counts (562 poles, 126 corner spans, 74 crossings) once, in its reply. **no test**.
7. [ ] `circuitPoints` (`src/city/pipeline/readable.ts`, its body only) reads the layer. **test**: 1 case.
8. [ ] Later stages' digest pins that move are re-taken once and listed. **test**: at most 2 rewritten.

**Files.** New `src/city/circuit/`; `src/city/stages.ts` (one entry); `src/city/pipeline/readable.ts` (`circuitPoints` only).

### K2b · Stage 6, drops, lights, lamp posts and node places (grid-simulator, pure). Branch `ticket/081k2b-circuit-places`
**Acceptance criteria.**
1. [ ] CK9. **test**: 2 fixture cases.
2. [ ] CK10. **test**: 2 fixture cases.
3. [ ] CK11. **test**: 1 fixture case.
4. [ ] CK12's table as `nodePlaceProblems(layer, places)`: a switch on a 2-attachment pole fails, a breaker on a building fails, and two nodes on one place fail. Roof places join in K2d. **test**: 3 fixture cases.
5. [ ] The digest pin re-taken. **test**: 1 rewritten.
6. [ ] `keep` holds every pole and light. **test**: 1 case.

**Files.** `src/city/circuit/`.

### K2c · The conversion (grid-simulator, pure). Branch `ticket/081k2c-circuit-convert`
**Goal.** `convertCityPuzzle(cityPuzzle, plan): CityPuzzleConverted` turns a city puzzle into a plain `Puzzle` that `src/grid/` runs unchanged (CK15), with the places, runs and cut spans the 3D view needs. Carrier poles (answer 5) never become nodes.

**Acceptance criteria.**
1. [ ] **CK13 as changed** (`runProblems`):
   - each run's spans join end to end, from its `from` node's place to its `to` node's place, then to the drop or lead if it has one;
   - a carrier pole holds no node of the job;
   - no two lines share a span;
   - a fault's span is in its line's run.

   A run that goes along, round a corner on a carrier and on is **valid**. **test**: 3 fixture cases: a valid bent chain, a broken chain, a shared span.
2. [ ] CK14's district checks. **test**: 2 fixture cases.
3. [ ] CK15's steps 1 to 6. The output passes `validatePuzzle` and has **the same node and line ids as the file**, none added. Each `pos` equals its place's metres over `CELL_M` within 1e-4. **test**: 2 cases.
4. [ ] **Plays the same.** `city-two-ways-round` is written as a `.city.json` test fixture from its note's place table, with its corner junctions turned into carriers where the note allows. It converts to a `Puzzle` whose check block replays as the schematic's does. **test**: 1 case on 6 x 6 seed 1, one-way on.
5. [ ] A problem names the node, line or fault and the CK rule. **test**: 1 case.
6. [ ] No import of `src/grid/` from `src/city/circuit/`, except in tests. **test**: 1 grep case.

**Files.** `src/city/circuit/`.

### K2d · Stage 6, roof structures and roof spans (grid-simulator, pure). Branch `ticket/081k2d-roof-spans`
Cut in full after B1, B1p and Josh's answers to them. The architect first adds B1's types to `src/core/citycircuit.ts`, then writes one criterion per line of CK17's "K2 checks" and "Fails", at most 10 cases. Known already:
- roof structures and roof spans in the layer;
- roof to roof and roof to pole (6c);
- over an intersection for roof spans only (6a);
- breakers, switches and fuse boxes allowed on a roof structure (6b) in `nodePlaceProblems`;
- the 4.2 m floor over a street.

**Files** (expected): `src/city/circuit/`.

### I2 · Stage 8 keeps clear of the circuit (landscape, pure). Branch `ticket/081i2-ground-clears-circuit`
**Acceptance criteria.**
1. [ ] Stage 8 reads `layers.circuit.keep` into its keep-point list. **test**: 1 fixture case.
2. [ ] On seed 1, no stage 8 piece stands within `FURN_KEEP_M` of a pole or light. **test**: 1 case, 6 x 6 seed 1, one-way on.
3. [ ] The digest re-taken once. **test**: 1 rewritten.

**Files.** `src/city/ground/`.

### H4 · Stage 7's roof pieces keep clear of roof structures (facades, pure). Branch `ticket/081h4-roof-keep`
Cut in full after K2d. Expected: the roof exit, the water tower and roof props (H3, H3b) keep clear of every roof structure; 1 fixture case, 1 seed-1 case and 1 digest re-take. **Files** (expected): `src/city/facades/`.

### P1 · The fit tool and the city check (grid-simulator). Branch `ticket/081p1-fit-tool`
**Goal.** `npm run fit puzzles/<NN-slug>.json -- --city 6x6:1:oneway [--blocks <ids>]` searches 6 x 6 seed 1 for a district of 1 to 4 blocks and an embedding of the schematic puzzle:
- each node on a place its type may take (CK12, and roofs once K2d is in);
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

**Files.** New `tools/fit.ts`, `tools/fitrun.ts`, `tools/fit.test.ts`; `tools/check.ts`, `checkrun.ts`, `check.test.ts`; `package.json` (the `fit` script only).

### P2a · Puzzles 01 to 16 on the city, the pilot (puzzle-designer). Branch `ticket/081p2a-city-puzzles-01-16`
### P2b to P2d · Puzzles 17 to 32, 33 to 48, 49 to 64. Branches `ticket/081p2b-...`, `p2c`, `p2d`
P2b to P2d start only after Josh has played the pilot and said so in chat (answer 2).

**How a schematic puzzle goes onto the city (6 x 6 seed 1, one-way on; answer 3).**
- **Nodes onto places** (CK12): the feed on a pole just outside the district; breakers, fuse boxes and batteries on poles with 2 or more attachments, or breakers and fuse boxes on roof structures (6b); switches on poles with 3 or more, or on a roof structure; junctions on any pole; lamps on a building with a drop (a "home", "shrine" or "infirmary" read goes to a building that fits, where one does) or a lamp post. One node per place.
- **Lines onto chains of spans** (CK13 as changed). Lines run along the pole lines, round corners on carrier poles, square across streets mid-block, down a drop or a lead, or on a roof span where a line crosses a street on a diagonal (after K2d). The schematic's nodes stay exactly as they are: a corner never becomes a junction.
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
4. [ ] **Josh plays** the pilot's puzzles (before E2 and U1, in the 2D view, where the converted `pos` lays out the district; after them, on the city). His verdict goes under **What it taught us**. **browser**.

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
**Goal.** `COMPONENT_MODELS: Record<CircuitComponent, CircuitComponentPick>` in `src/render3d/componentmodels.ts`, transcribed from `docs/design/081-component-picks.md`. It is re-run each time Josh picks more.

**Acceptance criteria.**
1. [ ] The table equals the note row for row. **test**: 1 case.
2. [ ] Every non-null key is in the converted manifest. The manifest is read lazily and the case skips when it is absent. **test**: 1 case.

**Files.** New `src/render3d/componentmodels.ts` and its test.

### E1 · Glyphs out of the 2D renderer; the overlay's icons and lines, pure (renderer). Branch `ticket/081e1-overlay-pure`
**Goal.** 071 E's pure parts, for the city, with lines as well as icons (answer 7: "Icons plus lines"). The glyph drawing moves from `map-renderer.ts` to `src/render/glyphs.ts`, and the 2D view does not change. `src/render3d/overlay.ts` lays out each component's icon and each line's projected chain, live or dead, from a converted puzzle, its state and a projection passed in. It uses no three and no DOM.

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
   - each line's polyline through its chain's projected span ends, carriers included;
   - live or dead, with the 2D map's pulse phase;
   - a damaged span's cut point, sparking only while live;
   - brownout flicker for every line.

   **test**: 2 cases.

**Files.** New `src/render/glyphs.ts` and `glyphs.test.ts`; `src/render/map-renderer.ts` (the move only); new `src/render3d/overlay.ts` and `overlay.test.ts`. **Must not:** `src/core/`, `src/grid/`, `src/play/`, `src/ui/`, `src/city/`.

### K3 · The circuit drawn on the city (renderer). Branch `ticket/081k3-circuit-drawn`
**Goal.** At `?view=3d&city=tiles`, stage 6's poles, spans, drops and street lights are drawn dead through `powerkit.ts`, with roof structures once K2d is in. Each picked component model (D3), and the damaged line's prop at its cut, stands where a city puzzle puts it. Unpicked components are placeholders.

**Acceptance criteria.**
1. [ ] Every pole is drawn with `placePole` from `POWER_MIX`, and every span with `fitLine`. **test**: 2 cases.
2. [ ] The wires are code-drawn with their Decided looks. **test**: 1 case.
3. [ ] Component models stand at their places, unscaled (guide chapter 2, Decided), or as a placeholder when null. **test**: 2 cases.
4. [ ] The R12 audit counts the new pieces. **test**: 1 rewritten.
5. [ ] Josh views 6 x 6 seed 1 from the default camera and with `cam=street`, by day and by night. **browser**.

**Files.** `src/render3d/plan3d.ts`, `plan3d.test.ts`, a new `src/render3d/circuitdraw.ts` and its test.

### E2 · A city puzzle played on the city, through the overlay (renderer). Branch `ticket/081e2-city-play`
**Goal.** A city puzzle at `view=3d` draws 6 x 6 seed 1 with K3's circuit. The district's job is live: pulses, sparks, lit and dark lamps, brownout, and the Relight from `relightT`. The rest of the city is dead. E1's icons and lines are drawn over it. A click on an icon is that component's `hitTest` answer, so `src/play/` plays it unchanged.

**Acceptance criteria.**
1. [ ] The renderer takes a `CityPuzzleConverted`, and `MapRenderer3d` is unchanged. **test**: 1 case.
2. [ ] Live and dead by run, in 3D and on the overlay alike; a damaged span is cut and sparks only while live; scenery never glows. **test**: 3 cases.
3. [ ] `hitTest`: an icon's id comes before any 3D object, the 3D pick handles the rest, and scenery gives null. **test**: 2 cases.
4. [ ] `overlay=0` hides the overlay. **test**: 1 case.
5. [ ] The Relight can't be interrupted (brief, Decided). **test**: 1 case (rules-coverage).
6. [ ] The overlay canvas sits over the WebGL canvas at the device pixel ratio. **test**: 1 case.
7. [ ] Josh plays `city-two-ways-round`'s city form and pilot puzzles, on a desktop window and a phone-sized one. **browser**.

**Files.** `src/render3d/renderer.ts`, `plan3d.ts`, `pick.ts`, `overlay.ts`, `relight3d.ts` (only if it cannot be reused unchanged), and their tests.

### U1 · The picker opens city puzzles (ui). Branch `ticket/081u1-picker-city`
**Acceptance criteria.**
1. [ ] `collectMaps` reads `puzzles/city/*.city.json` with `validateCityPuzzle`, and never lists one as skipped. **test**: 2 cases.
2. [ ] A city entry is listed after its `from` puzzle, named "… · city", or "… · city (reworked)" for a rework. **test**: 1 case.
3. [ ] Opening one builds the city once per session, converts the puzzle and opens the city view (A2d's helper says 3D). **test**: 1 case.
4. [ ] Josh opens three in a row. **browser**.

**Files.** `src/ui/maps.ts`, `maps.test.ts`, `src/main.ts` (the city branch), and A2d's helper.

## Files
Per section, above. This branch (the cut): `tickets/081-puzzles-on-the-city.md`, `tickets/070-city-pipeline.md` (pointer lines), `tickets/071-pack-power-lines.md` (a pointer line: C and E's ladder wiring are dropped), `tickets/rules-coverage.md`, `src/core/citycircuit.ts` (new), `src/core/cityplan.ts` (`CityCircuitLayer`), `src/core/index.ts`.

## Interfaces
Written into `src/core/` with this cut (typecheck passes):
- **`src/core/citycircuit.ts`:**
  - the layer's types (CK15's sketch): `CityPole`, `CityPoleKind`, `CityWireSpan`, `CityWireSpanKind`, `CityDrop`, `CityStreetLight`, `CityLampPostPlace`, `CityCircuitKeep`;
  - the city puzzle's types: `CityPuzzle`, `CityPuzzleCity`, `CityNodePlace`, `CityLineRun` (CK13 as changed by answer 5: `{ spans, drop?, lead? }`), `CityPuzzleNode`, `CityPuzzleLine`, `CityPuzzleFault`, `CityPuzzleConverted`;
  - D's types: `CIRCUIT_COMPONENTS`, `CircuitComponent`, `CircuitComponentPick`.
- **`src/core/cityplan.ts`:** `CityCircuitLayer` is `{ stage, poles, spans, drops, lights, posts, keep }`. No stage writes it yet.
- **Not typed yet:**
  - the roof structure, the roof span and the roof place (after B1p, before K2d);
  - `validateCityPuzzle` and `loadCityPuzzle` (C1);
  - "ladder" leaving `ASSET_GALLERY_USES` (on A2c's branch).
- **Events:** none new.
- **No new dependency.** The overlay is Canvas 2D.

## Open questions (for Josh)
All ten of the first cut's questions are answered (above). What is still open:
1. **(in B1, asked there)** Besides breakers, switches and fuse boxes (6b), may a roof structure hold a junction, battery or lamp, or the feed (K1 Q10 puts the feed on a pole outside the district)?
2. **(in B1, asked there)** Does 073's T-2 ("every node place stays reachable ... on foot") need a roof clause for the street layer later, or does a roof node count as reachable by its building's roof exit?
3. **(B1p)** Anything the pre-check finds that does not hold.
4. **Default this cut takes (he may overturn it):** after A2c, `?view=3d` on a schematic puzzle opens the 2D map with a console note, until that puzzle has a city form.
