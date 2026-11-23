# 081 · Purge the old city; the 64 puzzles on the pipeline city, on its streets, picked models, and a 2D overlay to play them

owner: per section (renderer, puzzle-designer, pipeline-designer, lead-architect, grid-simulator, landscape, facades, ui; see Sections)
status: open. Cut 23 Nov 2026 on Josh's request (below). That is the request, not G1. No section starts before Josh approves it in chat.
branch: `ticket/081-puzzles-on-the-city` (this file and the `src/core/` types). One branch per pull request: `ticket/081<section>-<slug>`, from `main`.

## Josh's words (23 Nov 2026, in chat)
> "I would like to purge the old city and start working on the new on. I would like to add the old puzzles to the new city structure. I want to have all of the power lines and the puzzle pieces work within the street structure of the city. If there are power lines that are diagonal across streets, then they have to be attached to structures on top of buildings. I want to work through a process where I am selecting individual assets to represent puzzle components. And furthermore, I want to build a 2D overlay on top of the city to represent the puzzles themselves, because I think that the individual assets are going to be too small for the user to manipulate them easily."

## Goal
Josh opens `npm run dev`, picks one of the 64 ladder puzzles from the map picker in its city form, and plays it on the pipeline city: its feed, breakers, switches, fuse boxes, junctions, batteries and lamps stand on the poles, buildings and lamp posts of one district of a named city, its lines run along the streets on the poles' spans, and any line that crosses a street on a diagonal hangs from a structure on a building's roof. Each component is drawn with the model Josh picked for it, one component at a time, in his words. Over the 3D city a 2D overlay draws the puzzle at a size he can read and click; a click on the overlay throws, releases or repairs through the same `src/play/` calls as the 2D map. The old tile city is gone.

## What exists on main (read at 3823f0d, 23 Nov 2026)
**Ticket 070's stage 6 (K) and the old-path deletion (L2).**
| Piece | State on main |
| --- | --- |
| K1, the circuit's design (`docs/design/070-K1-circuit.md`, CK1 to CK16; worked map `puzzles/city-two-ways-round.*`) and K1a | **Merged** (c7a97ed). Every K1 question answered by Josh, 21 Nov 2026; the pre-check (`docs/design/070-K1-precheck.md`) held on 20 of 20 runs. |
| `CityCircuitLayer` typed | **Typed with this ticket** (`src/core/citycircuit.ts`, `cityplan.ts`), from CK15's sketch. Before this it was `{ stage }` only. |
| K2, stage 6 pure (`src/city/circuit/`) | **Not started.** The folder does not exist; `BUILT_STAGES` has no circuit stage; `circuitPoints` (`src/city/pipeline/readable.ts`) returns none. |
| I2 (stage 8 clears the poles) | Not started. |
| K3 (circuit drawn), K4 (played, overlay) | Not started. 071 B's `powerkit.ts` (poles, lines, `fitLine`, `placePole`) is merged; 071 C (ladder drawn with it), D (power GLBs) and E (the overlay on the ladder: `src/render/glyphs.ts`, `src/render3d/overlay.ts`) are **not built**. |
| K5 (puzzles on the city) | Not started. |
| L2a, L2b, L2c | **Merged** (e60d565 / 525342c, 954a035, cf254e7): `src/city/pipeline/oldpath.test.ts`, `src/city/edge/oldpath.test.ts` hold the greps. |
| L2d (delete the old city) | **Not done.** `tilecity.ts`, `tilecity3d.ts`, `frontage.ts`, `parkmetrics.ts`, the `city=tiles-old` route in `renderer.ts` and `oldTilesRequested` in `tileslots.ts` are all on main. |

**This ticket carries on 070's K2 to K5 and L2d.** 070's K outline and L2d stay as the record; their sections continue here (a pointer line is added to 070). Every CK rule and every Josh answer in `070-K1-circuit.md` holds unless a section below says it asks him.

**What "the old city" can mean** (question 1 asks which):
1. **The old tile city** (`?view=3d&city=tiles-old`; ticket 055): `tilecity.ts`, `tilecity3d.ts`, `kerbline.ts`'s old half, `tileslots.ts`'s `oldTilesRequested`, `frontage.ts`, `parkmetrics.ts`, their tests (`tilecity`, `tileintegrate`, `tileinterior`, `alleys`, `parkmetrics`, `frontage`, `kerbline`: about 250 cases), and the old-path text in `docs/city-style/` and `docs/city-grammar.md`. Feeds no puzzle. **Section A1 deletes it.**
2. **The ladder's 3D puzzle town** (`?puzzle=<id>&view=3d`, tickets 037 to 051): `town.ts`, `terrace.ts`, `layout.ts`, `scene.ts`, `stacks.ts`, `models3d.ts`, `dressing.ts`, `furniture.ts`, `escapes.ts`, `sills.ts`, `relight3d.ts`, `pick.ts`, `streetcam.ts`, the stack gallery (`stackgallery.ts`) and the building gallery (`?gallery=<pack>`, `gallery.ts`), with their pins (`townpin`, `packpin`, ...). **Every one of the 64 puzzles' 3D view runs on it today**, and the pipeline's `plan3d.ts` imports kit tables from several of these files. Deleting it before the puzzles play on the city (E2) leaves them with no 3D view. Recommended: **A2**, outlined below, cut only after E2 and P2 merge and on Josh's word.
3. **The 2D schematic view's background city** (`src/render/city.ts`, tickets 023 and 024): the town drawn under the 2D map. The 2D game is what plays today; nothing here deletes it unless Josh says so.
4. **Kept, by Josh's earlier word:** the tile sheet (`city=tiles&sheet=1`; 070 Q47, "Yes to all recommendations"), and the constants `plan3d.ts` and `terrace.ts` read from `tilecity.ts` (070 L2d criterion 2).

## Rules this ticket holds
- **The GDD's Decided rules (the brief's "Rules carried over") are law.** The city form of a puzzle is laid out differently; it plays the same. Every converted puzzle runs on `src/grid/` unchanged, and its check block (`puzzles/SCHEMA.md`, Design checks) gives the same outcomes as the schematic puzzle's: the same solution wins, every trap's `expect` holds, every recovery wins. Conversion never adds, removes or reorders a node, line or fault that `src/grid/` sees, except where question 5's answer allows a junction at a bend, and then the check block must still pass as written.
- **`src/grid/` and `src/night/` are not touched.** `src/city/circuit/` is pure (no DOM, canvas, three; imports only `src/core/` and `src/city/`), as every stage folder is.
- **Josh's K1 answers hold** (`070-K1-circuit.md`, the table at its top). In particular: CK5's corner spans never over a carriageway; CK6's crossings square across a street, between junctions, never over one (Q45); CK7's 4.2 m crossing floor; CK9's drops on the pole side only (Q4, Q12); CK12's fuse boxes, breakers and switches on poles only (Q9) and the feed on a pole just outside the district (Q10); CK14's district of 1 to 4 blocks (Q7). Section B1's new rule is checked against each; a clash is a question for Josh, never a change.
- **`puzzles/locked/` is never edited** (it does not exist today). A city puzzle is a new file; the schematic puzzles `puzzles/01-...` to `64-...` are not edited.
- **No agent picks a model.** Josh's picks are his words, recorded by the main session (D).
- **Tests** (`docs/test-policy.md`): at most 15 test cases added or rewritten per pull request, aiming for 10; each criterion is marked **test**, **browser** or **no test**; whole-city checks on **6 x 6 seed 1, one-way on** through the folder's module cache; no 20-city check and no printed numbers in `npm test`; numbers come from a `tools/` script run on demand.
- **No new dependency** in any section.

## Sections, in order
Each section is one owner, one branch, one pull request, unless it says it shares one. "After X" means after X merges into `main`.

| # | Section | Owner | After | Tests in its PR |
| --- | --- | --- | --- | --- |
| A1 | Delete the old tile city (070 L2d) | renderer | now | about 4 added; about 250 removed |
| B1 | The street rule and roof spans, designed | puzzle-designer | now | 0 (a note) |
| B1p | Pre-check "pre-check 081 B1" | pipeline-designer | B1 | 0 (a note) |
| C1 | The city puzzle validator | lead-architect | G1 | 6 |
| K2a | Stage 6: poles and spans (CK1 to CK8) | grid-simulator | C1 | 12 |
| K2b | Stage 6: drops, lights, lamp posts, node places (CK9 to CK12) | grid-simulator | K2a | 10 |
| K2c | The conversion (CK13 to CK15) | grid-simulator | K2b | 10 |
| K2d | Stage 6: roof structures and diagonal spans (B1's rule) | grid-simulator | K2c, B1p holds, Josh's answer | 8 |
| I2 | Stage 8 keeps clear of the circuit | landscape | K2b | 3 |
| H4 | Stage 7's roof pieces keep clear of the roof structures | facades | K2d | 3 |
| P1 | The fit tool and the city check | grid-simulator | K2c | 9 |
| P2a to P2d | The 64 puzzles on the city, 16 a batch | puzzle-designer | P1 (and K2d for any puzzle that needs a diagonal) | 0 each |
| D1 | The component shortlist | pipeline-designer | now | 0 (a note) |
| D2 | The gallery's pick mode | ui | D1 | 6 |
| D3 | The picks table | renderer | Josh's picks | 2 |
| E1 | Glyphs out of the 2D renderer; the overlay, pure (071 E criteria 1 to 3) | renderer | now | 8 |
| K3 | The circuit drawn on the city | renderer | K2b | 6 |
| E2 | A city puzzle played on the city, through the overlay | renderer | E1, K3, K2c | 9 |
| U1 | The picker opens city puzzles | ui | E2, P2a | 4 |
| A2 | Delete the ladder's town (outline only) | renderer | E2, P2d, Josh's answer to question 1 | not cut |

`src/play/` (interaction) has no section: E2 keeps the `MapRenderer3d` interface, so play and its `hitTest` calls do not change. If E2's builder finds `src/play/` must change, it stops and the section is re-cut with an interaction section.

---

### A1 · Delete the old tile city (renderer). Branch `ticket/081a1-delete-old-city`
**Goal.** As 070 L2d: `city=tiles-old` opens nothing special (it falls through to the ladder's view, as any unknown `city` does), `city=tiles` is unchanged, `city=tiles&sheet=1` still opens the tile sheet, and the guide and grammar describe only the pipeline.

**Acceptance criteria.** 070 L2d's criteria 1 to 8, as written there (deleted, kept in place, the grep, the routes, tests go with their code, the guide, R-8, the browser), with these changes since it was cut:
1. [ ] **The guide moved** (ticket 080). Criterion 6's edits land in `docs/city-style/` (`evaluation.md` for 18.8 and 19.7's old-path tables, and each `city=tiles-old` pointer in `frontage-and-interiors.md`, `parking.md`, `evaluation.md`) and `docs/city-grammar.md`, not in `docs/city-style-guide.md` (now a pointer). **`decisions.md` keeps every entry**: it is Josh's words, and a decision about the old city stays as history. **no test** (the reviewer reads the diff; 080's drift test runs on the files).
2. [ ] **The grep** (070 L2d criterion 3). **test**: one new case in `tileslots.test.ts`.
3. [ ] **The routes** (070 L2d criterion 4): `city=tiles` as at L1; `city=tiles-old` null from every city parser; `city=tiles&sheet=1` the sheet's request. **test**: at most 3 cases, rewritten from the existing `tiles-old` cases in `tileslots.test.ts`, `plan3d.test.ts` and `planview.test.ts`.
4. [ ] **Tests go with their code** (070 L2d criterion 5), each listed in the report. **May remove:** `tilecity.test.ts`, `tileintegrate.test.ts`, `tileinterior.test.ts`, `alleys.test.ts`, `parkmetrics.test.ts`, `frontage.test.ts`, `kerbline.test.ts`, the old-city cases of `tilecity3d.test.ts` and `tileslots.test.ts`, and L2c's kind (b) cases. **no test**.
5. [ ] **R-8 by the gate, not the playtester.** The playtester runs only on a release (CLAUDE.md, 23 Nov 2026). L2d's criterion 7 becomes: `npm run gate` on the branch passes `townpin.test.ts` and `packpin.test.ts` unedited. **test** (existing).
6. [ ] **The browser** (070 L2d criterion 8). **browser**.

**Files.** 070 L2d's Files, with `docs/city-style/*.md` (criterion 1's lines only) in place of `docs/city-style-guide.md`. **Must not:** 070 L2d's list, plus `docs/city-style/decisions.md`.
**Waits for** 080 B2 if it is still open on `docs/city-style/`: the later of the two rebases.

### B1 · The street rule and roof spans, designed (puzzle-designer; a note, no code). Branch `ticket/081b1-roof-spans`
**Goal.** Josh's rule written so a stage can follow it: "all of the power lines and the puzzle pieces work within the street structure of the city. If there are power lines that are diagonal across streets, then they have to be attached to structures on top of buildings." Josh reads one note and answers its questions on cards.

**Acceptance criteria.** All **no test** (a design note; the pre-check measures it).
1. [ ] **`docs/design/081-B1-roof-spans.md`** states the rule as **CK17** in K1's form (rule, where, numbers on seed 1, reads, status, K2 checks, fails):
   - **On the streets.** What CK1 to CK14 already give: every span today runs along a pavement (CK4), round a block corner over the walk (CK5) or square across a street between junctions (CK6), so no span crosses a street on a diagonal. Say whether anything on the city breaks "within the street structure" today, measured on seed 1.
   - **When a diagonal arises.** Which line on a city puzzle would need to cross a street other than square (for example a lamp on the far side of a street from the pole line, a run that would otherwise take two crossings and a corner, a crossing at a junction), and how often P1's fit would want one.
   - **The roof structure.** What it is (a mast or frame on a building's roof piece, stage 5's roof), which buildings may carry one (height, roof kind, not on stage 7's roof exit, water tower or roof props, H3/H3b), its attachment height against CK7's 4.2 m floor, and where its span ends: roof to roof, or roof to a pole. Its look is Josh's pick (D, component `roofMast`); 071's note that the Sci-Fi City poles "are intended to be atop buildings" is quoted as his words, not as a pick.
   - **Against each rule it touches**, one line each: CK5 (corner spans never over a carriageway), CK6 and Q45 (square across, between junctions, never over one), CK7 (the floor), CK9 and Q4/Q12 (no drop across a street), CK12 and Q9 (switches, breakers, fuse boxes on poles only: may a roof structure hold a node?), CK13 (what a run is), CK14 (the district), CK16 (what later stages leave free). Every clash with a Josh answer is a numbered question for him, with the recommended answer first. No GDD Decided rule is about where a line stands; the note says so, or names the one it finds.
2. [ ] **Ids and fields for the architect**: the roof structure's id and place, and the span kind, in CK15's style, so the architect can add them to `src/core/citycircuit.ts` before K2d.
3. [ ] **Pre-check** (B1p, the pipeline-designer, "pre-check 081 B1"): CK17 measured on the 20 named runs, by a script it runs on demand, never in `npm test`. If it does not report "holds", its note goes to Josh before K2d is cut. Josh's answers go at the top of both notes in his words; then the architect re-cuts K2d.

**Files.** `docs/design/081-B1-roof-spans.md`; a probe script under the puzzle-designer's scratch, not committed under `src/`.

### C1 · The city puzzle validator (lead-architect). Branch `ticket/081c1-city-puzzle-loader`
**Goal.** A city puzzle file (`puzzles/city/<id>.city.json`, type `CityPuzzle`) is read and checked for shape before the plan is ever built; the place checks against the city are K2c's.

**Acceptance criteria.**
1. [ ] `validateCityPuzzle(json)` in `src/core/load.ts` returns every problem, one message each: `city` four fields; `district` 1 to 4 distinct ids; every node a `place` of exactly one kind and no `pos`; every line a `run` of exactly one kind (a non-empty `spans` list, or `drop`, or `lead`); a fault's `span` only on a `damaged-cable`; `scope` "map"; and everything `validatePuzzle` checks that does not need a `pos`. **test**: 4 cases (a good file, then one bad file per group).
2. [ ] `loadCityPuzzle(json)` throws with the messages, as `loadPuzzle` does. **test**: 1 case.
3. [ ] `puzzles/SCHEMA.md` gains a "City puzzles (ticket 081)" section: the fields, the ids, the folder and the `.city.json` name. **no test**.
4. [ ] `loadPuzzle` still refuses a `.city.json` shape (it has no `pos`), so the ladder's loaders are unchanged. **test**: 1 case.

**Files.** `src/core/load.ts`, `load.test.ts`, `citycircuit.ts`, `puzzles/SCHEMA.md` (the new section only).

### K2a · Stage 6, poles and spans (grid-simulator, pure). Branch `ticket/081k2a-circuit-poles`
**Before it starts:** the main session adds `src/city/circuit/` to `.claude/agents/grid-simulator.md` on Josh's word (question 10).
**Goal.** `src/city/circuit/` builds `CityCircuitLayer`'s poles, spans and `keep` from stages 1 to 5, as CK1 to CK8 say, and joins `BUILT_STAGES` between buildings and facades. Josh sees nothing new (no stage draws it yet), except stage 6's flat picture at `?city=plan&stage=6`.

**Acceptance criteria.**
1. [ ] The stage: a pure function of the layers before it, frozen by the runner, with a digest and a flat picture (070's "Rules every section holds"). **test**: 1 digest pin on seed 1 (rule 4); **browser**: the picture.
2. [ ] CK1 (one pole pavement per street), CK2 (end slots 2.5 m, even pitch at most 12.5 m, the nudge), CK3 (never on a forbidden cell). **test**: one fixture case each, failing on CK2's and CK3's "Fails" lines (3).
3. [ ] CK4 (along spans, consecutive, at most `SPAN_ALONG_MAX_M`), CK5 (corner spans 9.55 m, end slot to end slot of one block), CK6 (one crossing per open end, square, outside every junction square). **test**: one fixture case each (3).
4. [ ] CK7 (every crossing's low point at least 4.2 m against 071's attachment table; along and corner spans the same walk floor). **test**: 1 fixture case.
5. [ ] CK8 (one connected network on seed 1). **test**: 1 case on 6 x 6 seed 1, one-way on (the whole-city check).
6. [ ] The pre-check's numbers on seed 1 (562 poles, 126 corner spans, 74 crossings) are printed once by the builder in its reply, not asserted in `npm test` beyond criterion 1's digest. **no test**.
7. [ ] `circuitPoints` (`src/city/pipeline/readable.ts`) reads the layer's poles and spans, so T1 and the ruin's trunk check see them. **test**: 1 case. *This is a planner file:* the builder may edit `readable.ts`'s `circuitPoints` body only (named here so it is in scope).
8. [ ] Every existing `src/city/` test passes; any digest pin of a later stage that moves because stage 6 now exists is re-taken once, and the report lists it. **test** (existing; re-takes count as rewritten, at most 2).

**Files.** New `src/city/circuit/` (stage, picture, checks, tests); `src/city/stages.ts` (one entry); `src/city/pipeline/readable.ts` (`circuitPoints` only).

### K2b · Stage 6, drops, lights, lamp posts and node places (grid-simulator, pure). Branch `ticket/081k2b-circuit-places`
**Acceptance criteria.**
1. [ ] CK9 (one drop per street-front building on the pole side, never across a street, at most `DROP_MAX_M`). **test**: 2 fixture cases (a good drop; a building on the non-pole pavement gets none).
2. [ ] CK10 (lights on the non-pole pavement, every second slot, end positions skipped, 3 m from any pole). **test**: 2 fixture cases.
3. [ ] CK11 (lamp-post places at along-span midpoints of 7.5 m or more, pole pavement). **test**: 1 fixture case.
4. [ ] CK12's place table as a pure check `nodePlaceProblems(layer, places)`: each node type against its row, one node per place. **test**: 3 fixture cases (a switch on a 2-attachment pole fails; a breaker on a building fails; two nodes on one pole fail).
5. [ ] The layer's digest pin on seed 1 re-taken (rule 4). **test**: 1 rewritten.
6. [ ] `keep` holds every pole and light. **test**: 1 case.

**Files.** `src/city/circuit/`.

### K2c · The conversion (grid-simulator, pure). Branch `ticket/081k2c-circuit-convert`
**Goal.** `convertCityPuzzle(cityPuzzle, plan): CityPuzzleConverted` turns a city puzzle into a plain `Puzzle` that `src/grid/` runs unchanged (CK15), with the places, runs and cut spans the 3D view needs.

**Acceptance criteria.**
1. [ ] CK13's run checks (one kind per run, or a bend without a junction if question 5 says so; interior poles hold no node; no shared span; a fault's span in its run). **test**: 3 fixture cases on the "Fails" lines.
2. [ ] CK14's district checks (blocks touch; lines only on the district's spans or a feed's span; each feed outside, one entering span). **test**: 2 fixture cases.
3. [ ] CK15's steps 1 to 6; the output passes `validatePuzzle`; every node's `pos` equals its place's metres over `CELL_M` within 1e-4. **test**: 2 cases.
4. [ ] **Plays the same.** `puzzles/city-two-ways-round` written as a `.city.json` from its note's place table (a test fixture, not a new puzzle) converts to a `Puzzle` whose check block replays as the schematic's does. **test**: 1 case on 6 x 6 seed 1, one-way on (the module cache's city).
5. [ ] A problem names the node, line or fault and the CK rule. **test**: 1 case.
6. [ ] No import of `src/grid/` from `src/city/circuit/` except in tests. **test**: 1 grep case.

**Files.** `src/city/circuit/`.

### K2d · Stage 6, roof structures and diagonal spans (grid-simulator, pure). Branch `ticket/081k2d-roof-spans`
**Cut in full after** B1's note, its pre-check and Josh's answers; the architect then adds the types B1 names to `src/core/citycircuit.ts` and writes the criteria from CK17's "K2 checks" and "Fails" lines, one fixture case each, at most 8 cases. **Files** (expected): `src/city/circuit/`.

### I2 · Stage 8 keeps clear of the circuit (landscape, pure). Branch `ticket/081i2-ground-clears-circuit`
**Goal.** As 070's outline: stage 8 keeps its furniture `FURN_KEEP_M` off stage 6's `keep` points, as `tileKeepouts` did on the old path (R10).
**Acceptance criteria.**
1. [ ] Stage 8 reads `layers.circuit.keep` into its keep-point list (I's NL). **test**: 1 fixture case (a bench placed on a pole's point moves or goes).
2. [ ] On seed 1 no stage 8 piece stands within `FURN_KEEP_M` of a pole or light. **test**: 1 case, 6 x 6 seed 1, one-way on.
3. [ ] Stage 8's digest pin re-taken once. **test**: 1 rewritten.
**Files.** `src/city/ground/`.

### H4 · Stage 7's roof pieces keep clear of the roof structures (facades, pure). Branch `ticket/081h4-roof-keep`
**Cut in full after K2d.** Expected: stage 7's roof exit, water tower and roof props (H3, H3b) keep clear of every roof structure K2d places; one fixture case, one seed-1 case, one digest re-take. **Files** (expected): `src/city/facades/`.

### P1 · The fit tool and the city check (grid-simulator). Branch `ticket/081p1-fit-tool`
**Goal.** `npm run fit puzzles/<NN-slug>.json -- --city 6x6:1:oneway [--blocks <ids>]` searches the city for a district (1 to 4 blocks) and an embedding of the schematic puzzle onto it: each node on a place its type may take (CK12), each line on a run (CK13, as question 5 is answered), the feed outside (CK14), nothing shared. It writes a draft `puzzles/city/<NN-slug>.city.json` with `from` set, or reports why it could not fit. `npm run check` replays a city puzzle's check block through the conversion. The puzzle-designer uses both; neither picks for the designer.

**Acceptance criteria.**
1. [ ] **Fits a small puzzle.** On a fixture city, a 5-node chain fits; the draft validates (`validateCityPuzzle`) and converts (K2c). **test**: 1 case.
2. [ ] **Reports a miss.** A schematic with more switches than the district has 3-attachment poles is reported as "no fit: switch" with the counts, and nothing is written. **test**: 1 case.
3. [ ] **Plays the same.** A fitted draft's converted `Puzzle` has the schematic's node, line and fault ids, types, loads, ratings, capacities, parts and targets, and the same line endpoints (or, under question 5's junction answer, the schematic's check block still passes). **test**: 2 cases.
4. [ ] **Search order is stable.** The same inputs give the same draft (sorted by place id; no `Math.random`). **test**: 1 case.
5. [ ] **Time cap.** The search stops at `FIT_BUDGET` steps and reports "gave up", never hangs. **test**: 1 case.
6. [ ] **`npm run check puzzles/city/<id>.city.json`** converts and replays the note's block beside it; `npm run check` with no argument also checks every city puzzle in `puzzles/city/`. **test**: 2 cases in `tools/check.test.ts` on a fixture.
7. [ ] **One sweep in the suite.** Every `puzzles/city/*.city.json` validates, converts on its named city and its note's check block replays. **test**: 1 case (one city built through the module cache, every file read). It may exceed 2 s once the 64 are in; the reason is that it is the one place a city puzzle's play is held, and it replaces a per-puzzle test. The builder gives its time.
8. [ ] The builder prints, once in its reply, how many of the 64 fit on seed 1 with one block, with up to four, and which do not. **no test**.

**Files.** New `tools/fit.ts`, `tools/fitrun.ts`, `tools/fit.test.ts`; `tools/check.ts`, `checkrun.ts`, `check.test.ts`; `package.json` (the `fit` script only; no dependency).

### P2a to P2d · The 64 puzzles on the city (puzzle-designer). Branches `ticket/081p2a-city-puzzles-01-16`, `...-17-32`, `...-33-48`, `...-49-64`
**Goal.** Each schematic puzzle `NN-slug` gets a city form `puzzles/city/NN-slug.city.json` and a note `puzzles/city/NN-slug.md`, on the named city and district question 3 settles. The schematic files are not edited.

**How a schematic puzzle maps onto the city** (the designer follows this; P1 does the search):
- **Nodes onto places** (CK12): the feed onto a pole just outside the district at the far end of an entering span; breakers, fuse boxes, batteries onto poles with 2 or more attachments; switches onto poles with 3 or more; junctions onto any pole; lamps onto a building with a drop (the read "a home", "the shrine", "the infirmary" goes to a building whose kind fits, where one does) or a lamp post. One node per place.
- **Lines onto runs** (CK13): along the pole line, round a block corner on a corner span, square across a street on a crossing, down a drop, or a lamp post's lead. Lines follow the streets; a line that would cross a street on a diagonal uses a roof structure (B1, K2d) or is not used.
- **Faults**: copied; a `damaged-cable` names the span that is cut, chosen where the spark reads from the default camera.
- **`pos` is never authored.** The conversion gives it.

**When one does not fit**, in this order: (1) a larger district, up to 4 blocks (Josh's CK14 limit); (2) another block or a different named city (question 3); (3) a **city variant**: the designer changes the layout, never the puzzle's ids, parts, loads, ratings, capacities or targets, so the schematic's check block still passes as written; the note says what moved and why, and Josh plays it before it counts; (4) else the puzzle stays schematic-only, listed in the batch's report with P1's reason. No puzzle is forced onto the city by bending a rule.

**Acceptance criteria** (each batch):
1. [ ] Each of its 16 puzzles has a city file and note, or a line in the batch report saying which of (3) or (4) it took and why. **no test** (P1's sweep holds every file that exists).
2. [ ] Each note: `from`, the city and district, a place table (node → place, line → run), the intended read on the city (what the player sees from the default camera), the schematic's check block copied unchanged, and an empty **What it taught us**. **no test**.
3. [ ] `npm run check puzzles/city/` passes on the batch, and the designer runs `npm run analyze` on each converted puzzle and puts its numbers in the note (they must equal the schematic's). **test** (P1's sweep; nothing new).
4. [ ] **Josh plays** at least the batch's first puzzle in the city view once E2 and U1 are merged (before that, in the 2D view, where the converted `pos` lays the puzzle out as the district). **browser**.

**Files.** `puzzles/city/` only.

### D1 · The component shortlist (pipeline-designer; a note, no code). Branch `ticket/081d1-component-shortlist`
**Goal.** For each component in `CIRCUIT_COMPONENTS` (`src/core/citycircuit.ts`: feed, breaker, switch, relay, spring, fuse box, junction, battery, building lamp, lamp post, damaged line, roof structure), up to six candidate pieces from the converted packs, measured against the place it stands (a pole's attachment, a wall at 5.5 m, a roof), so Josh can choose one at a time. It recommends none.
**Acceptance criteria.** All **no test**.
1. [ ] `docs/design/081-D1-component-shortlist.md`: per component, each candidate's `pack:name`, size in metres, triangles, flags, what the intended-use note (`docs/design/073-pack-intended-use.md`) says of it, and whether it fits its place (too big for a pole's arm, under the 4.2 m floor, and so on). Candidates are listed in manifest order, not ranked.
2. [ ] One line per component on what the overlay already shows (E1's icon), so Josh knows the model is set dressing and the icon is the reading (071; Josh, 21 Nov 2026: "the HUD will showcase the components as a 2D overlay").
3. [ ] The packs' licence holds: nothing from a pack is copied into the note but names and numbers (074's Licence and load).

**Files.** `docs/design/081-D1-component-shortlist.md`, and a script it runs on demand under `tools/` only if it says so in its reply.

**The pick itself (the main session, not an agent).** One component per question card, in `CIRCUIT_COMPONENTS` order: the shortlist's candidates as options, with the gallery link for each (D2). Josh's answer, in his words, goes into `docs/design/081-component-picks.md` (one row per component: component, `pack:name`, his words, the date). An unpicked component stays null and is drawn as a placeholder. No agent writes a pick.

### D2 · The gallery's pick mode (ui). Branch `ticket/081d2-gallery-pick-mode`
**Goal.** Josh opens `/?assets=components&component=breaker` and sees that component's shortlist across packs as 074's cards, each with a **Copy pick line** button that puts `breaker: <pack:name>` on the clipboard for him to paste into chat. `/?assets=components` lists every component with its current pick (from D3's table) or "unpicked". Dev only, as 074.
**Acceptance criteria.**
1. [ ] `assetGalleryRequested` reads `assets=components` and `component=<id>`; unknown ids fall back to the list. `assetGalleryUrl` round-trips them. **test**: 2 cases.
2. [ ] The shortlist is a typed table in `src/ui/` transcribed from D1's note, pinned against it (every `pack:name` in the note's table is in the typed table and no other). **test**: 1 case.
3. [ ] The pick line's text is `<component>: <pack:name>`. **test**: 1 case.
4. [ ] The list shows each component's pick or "unpicked", in words, never colour alone. **test**: 2 cases.
5. [ ] Josh in the browser: the cards across packs (one pack's GLB held at a time, 074's load rule), the Copy pick line button, the list. **browser**.
**Files.** `src/ui/assetgallery.ts`, `assetgallerylogic.ts`, their tests, a new `src/ui/componentshortlist.ts`.

### D3 · The picks table (renderer). Branch `ticket/081d3-component-picks`
**After** Josh's picks are recorded (any number; the rest stay null). **Goal.** `COMPONENT_MODELS: Record<CircuitComponent, CircuitComponentPick>` in `src/render3d/`, transcribed from `docs/design/081-component-picks.md`.
**Acceptance criteria.**
1. [ ] The table equals the note row for row (component, key, words, date). **test**: 1 case.
2. [ ] Every non-null key is in the converted manifest (read lazily, skipped when absent, CI-safe). **test**: 1 case.
**Files.** New `src/render3d/componentmodels.ts` and its test. Updated again each time Josh picks more.

### E1 · Glyphs out of the 2D renderer; the overlay, pure (renderer). Branch `ticket/081e1-overlay-pure`
**Goal.** 071 E's criteria 1 to 3, re-pointed from the ladder to the city: the glyph drawing moves out of `map-renderer.ts` into `src/render/glyphs.ts` (the 2D view unchanged), and `src/render3d/overlay.ts` lays out the overlay from a puzzle, its state and a projection passed in, with no three and no DOM. What it draws is question 7's answer: **icons** over each component, as Josh said on 21 Nov ("The 2D overlay will showcase the icons that represent each component type"), and, if he says so, **the lines too**, drawn along each run's projected spans with the 2D map's pulses, sparks and brownout flicker.
**Acceptance criteria.**
1. [ ] 071 E criterion 1 (the glyphs move; the existing `src/render/` tests pass unedited; the call list through `glyphs.ts` equals the one through `createMapRenderer`). **test**: 2 cases.
2. [ ] 071 E criterion 2 (`overlayIcons(puzzle, state, project)`: one icon per component, the state `look.ts` gives, behind-camera or off-screen omitted, `OVERLAY_NUDGE` for near pairs). **test**: 3 cases.
3. [ ] 071 E criterion 3 (state by shape, not colour alone; guide 12). **test**: 1 case.
4. [ ] **Size to click.** An icon's hit circle is at least `OVERLAY_HIT_PX` 44 CSS px across at every zoom the city camera allows, however small the component is on screen. **test**: 1 case.
5. [ ] If question 7 is answered "lines too": `overlayLines(converted, state, project)` gives each line's projected polyline from its run, live or dead, with a damaged span's cut point. **test**: 1 case. Otherwise this criterion is dropped.
**Files.** New `src/render/glyphs.ts`, `glyphs.test.ts`; `src/render/map-renderer.ts` (the move only); new `src/render3d/overlay.ts`, `overlay.test.ts`. **Must not:** `src/core/`, `src/grid/`, `src/play/`, `src/ui/`, `src/city/`. 071 E's ladder wiring (its criteria 4 to 7) is not built unless question 1 keeps the ladder.

### K3 · The circuit drawn on the city (renderer). Branch `ticket/081k3-circuit-drawn`
**Goal.** At `?view=3d&city=tiles`, every pole, span, drop and street light of stage 6 is drawn on the pipeline's city, dead, through 071 B's `powerkit.ts` (Josh, 21 Nov 2026: "I would like to replace all the power lines with the power lines from the city pack. Same with the power poles."), and each picked component model (D3) stands where a city puzzle puts that component; unpicked ones are a placeholder.
**Acceptance criteria.**
1. [ ] Every pole of the layer is one `placePole` from `POWER_MIX`; every span one `fitLine`; drops and lights as the kit gives. **test**: 2 cases on a fixture layer.
2. [ ] The wires are code-drawn with their Decided dead look (071's "the wires keep their Decided live, Relight and cut looks"). **test**: 1 case.
3. [ ] A component model from `COMPONENT_MODELS` stands at its place, unscaled (guide chapter 2, Decided), or a placeholder when null. **test**: 2 cases.
4. [ ] `plan3d.ts`'s audit (R12) counts the new pieces; any allowance it needs is named. **test**: 1 rewritten.
5. [ ] Josh, at 6 x 6 seed 1, `cam=street` and the default camera, day and night. **browser**.
**Files.** `src/render3d/plan3d.ts`, `plan3d.test.ts`, new `src/render3d/circuitdraw.ts` and its test.

### E2 · A city puzzle played on the city, through the overlay (renderer). Branch `ticket/081e2-city-play`
**Goal.** `?puzzle=<id>&view=3d` with a city puzzle draws its named city with K3's circuit, the district's job live (pulses, sparks, lit and dark lamps, brownout, the Relight from `relightT`), the rest of the city dead (CK14), and E1's overlay over it. A click on an icon is that component's `hitTest` answer, so `src/play/` throws, releases or repairs as on the 2D map.
**Acceptance criteria.**
1. [ ] The renderer takes a `CityPuzzleConverted`; the `MapRenderer3d` interface is unchanged. **test**: 1 case (a static read, as `streetcam.test.ts` does).
2. [ ] Live and dead by run: a live line's spans glow, a dead one's do not, a damaged span is cut and sparks only while live; scenery never glows. **test**: 3 cases on a fixture.
3. [ ] `hitTest` returns an icon's component id before any 3D object under it; off the icons it falls through to the 3D pick; a click on scenery returns null. **test**: 2 cases.
4. [ ] `overlay=0` hides the overlay and `hitTest` behaves as the 3D pick. **test**: 1 case.
5. [ ] The Relight cannot be interrupted (brief, Decided): input during it changes nothing, as on the 2D map. **test**: 1 case. (rules-coverage)
6. [ ] An overlay canvas over the WebGL canvas, drawn each frame, sized to the device pixel ratio. **test**: 1 case.
7. [ ] Josh plays `city-two-ways-round`'s city form and P2a's first puzzle, on a desktop and phone-sized window: icons readable, clicks act, the Relight runs. **browser**.
**Files.** `src/render3d/renderer.ts`, `plan3d.ts`, `pick.ts`, `overlay.ts`, their tests; `src/render3d/relight3d.ts` only if the city's Relight cannot reuse it unchanged (then the report says why).

### U1 · The picker opens city puzzles (ui). Branch `ticket/081u1-picker-city`
**Goal.** The map picker lists each city puzzle beside its schematic (`09 · Shrine circuit` and `09 · Shrine circuit · city`), and opening one converts it and opens the city view.
**Acceptance criteria.**
1. [ ] `collectMaps` reads `puzzles/city/*.city.json` with `validateCityPuzzle`, and a city file never appears as a `skipped` problem. **test**: 2 cases.
2. [ ] A city entry is listed after its `from` puzzle, named from it. **test**: 1 case.
3. [ ] Opening a city entry builds its named city once per session (the pipeline's cache) and passes the converted puzzle on. **test**: 1 case.
4. [ ] Josh opens three city puzzles in a row from the picker. **browser**.
**Files.** `src/ui/maps.ts`, `maps.test.ts`, `src/main.ts` (the city branch only).

### A2 · Delete the ladder's town (renderer; outline, not cut)
Only if Josh's answer to question 1 includes it, and after E2 and P2d. It would delete the ladder's 3D town and its galleries (list 2 above) and point `?puzzle=<id>&view=3d` at each puzzle's city form; `plan3d.ts`'s imports from those files move to the pipeline first. `tests/playtest/` (the playtester's) and the ladder snapshots are a release's business. Cut in full on his word.

## Files
Per section, above. This branch (the cut): `tickets/081-puzzles-on-the-city.md`, `tickets/070-city-pipeline.md` (a pointer line in K and L2d), `tickets/rules-coverage.md`, `src/core/citycircuit.ts` (new), `src/core/cityplan.ts` (`CityCircuitLayer`), `src/core/index.ts`.

## Interfaces
Written into `src/core/` with this cut (typecheck passes):
- `src/core/citycircuit.ts`: `CityPole`, `CityPoleKind`, `CityWireSpan`, `CityWireSpanKind`, `CityDrop`, `CityStreetLight`, `CityLampPostPlace`, `CityCircuitKeep` (the layer, CK15's sketch); `CityPuzzle`, `CityPuzzleCity`, `CityNodePlace`, `CityLineRun`, `CityPuzzleNode`, `CityPuzzleLine`, `CityPuzzleFault`, `CityPuzzleConverted` (the city puzzle and its conversion); `CIRCUIT_COMPONENTS`, `CircuitComponent`, `CircuitComponentPick` (D).
- `src/core/cityplan.ts`: `CityCircuitLayer` now `{ stage, poles, spans, drops, lights, posts, keep }`. No stage writes it yet, so nothing else changes.
- **Not yet typed:** the roof structure and the diagonal span (after B1 and Josh's answers, before K2d); `validateCityPuzzle` and `loadCityPuzzle` are C1's code.
- Events: none new. The city view emits nothing `src/play/` does not already handle.
- **No new dependency.** The overlay is Canvas 2D over the WebGL canvas.

## Open questions (for Josh; recommended answer first)
1. **What "purge the old city" covers.** (a) Delete the old tile city (`city=tiles-old`) now, section A1, keeping the tile sheet as you said for 070 Q47; (b) delete the ladder's 3D puzzle town (`?puzzle=<id>&view=3d` today, and the `?gallery=` building gallery) only after the puzzles play on the city (A2); (c) keep the 2D schematic map and its background town, since it is the game that plays today. Recommended: all three as written.
2. **All 64, or a pilot first?** Recommended: P2a (puzzles 01 to 16) first, and you play its first few on the city before P2b to P2d start. Or all 64 in four batches straight through.
3. **Which city.** Recommended: every puzzle on 6 x 6 seed 1, one-way on (the city the tests already use), each in its own district where it fits; districts may overlap, because only one job is live at a time and the rest of the city is dead (CK8, your answer to K1 question 10). Or spread them over seeds 1 to 10 so no two share a block.
4. **A puzzle that does not fit** (P2's order: bigger district up to 4 blocks, another district, a city variant you play before it counts, else schematic-only). Recommended: as written. Or: never a variant; a puzzle that does not fit stays schematic-only.
5. **Bends without junctions.** K1's CK13 (Proposed, the designer's) puts a junction wherever a line turns a corner. On a schematic puzzle that adds nodes, which changes how many hops a lamp is from each fuse and feed, and so which fuse carries it ("nearer feeder carries the lamp"). Recommended: a city line may turn corners on its poles with no junction, so it stays one line and every puzzle plays exactly as its schematic. Or: keep CK13 and add junctions, accepting that some puzzles change and need a variant.
6. **The diagonal rule** (B1 words it in full and its pre-check measures it; these are the parts only you can say). (a) Does "diagonal across streets" include a line over a junction, which your Q45 answer forbids today ("crosses a street only between junctions, never over a junction")? Recommended: no, Q45 stands; a diagonal crosses one street between junctions. (b) May a roof structure hold a puzzle node (a junction, a breaker), or only carry the span? Your K1 Q9 put breakers, switches and fuse boxes on poles only. Recommended: it carries spans only. (c) Roof to roof only, or roof to a pole as well? Recommended: B1 measures both and you choose on its numbers.
7. **The overlay's style.** Recommended: icons over each component (your words of 21 Nov 2026) **and** the lines drawn along the streets with the 2D map's pulses and sparks, since the 3D wires are as small as the pieces; one tap target at least 44 px. Or: icons only, as said on 21 Nov, with the 3D wires carrying the flow.
8. **The damaged line.** Your 071 words keep the wires code-drawn with their Decided cut look. Recommended: keep that, and let `damagedLine` be an optional prop at the cut (a hanging end, a spark box) you pick like the rest. Or: no model for it; the cut look and the overlay are enough.
9. **The picking process.** Recommended: D1's shortlist per component, then one question card per component with its candidates and a gallery link; your answer recorded in your words. Or: you browse `/?assets=` yourself and paste "breaker: pack:name" lines in chat whenever you like (D2's Copy pick line supports both).
10. **The grid-simulator's folder.** K2 and P1 need `src/city/circuit/` added to `.claude/agents/grid-simulator.md` (070's outline said the main session does this on your word). Approve?
