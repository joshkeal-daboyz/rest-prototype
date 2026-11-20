# 070 · The city pipeline: the tile city built in stages, each stage a pure function with its own layer, owner and picture

owner: per section (planner, streetscape, buildings, facades, landscape, renderer; see Sections). Five of these agents do not exist yet (see Agents).
status: approved; section A1 merged 19 Nov 2026 (6eb4d26) (G1, Josh, 19 Nov 2026, in chat, relayed by the main session). Cut 19 Nov 2026 on Josh's request. The main session asked three questions; Josh answered each in one word:
1. "Do you approve ticket 070 and creating the five new agents (planner, streetscape, buildings, facades, landscape)?" Josh: "Yes".
2. "Do the sections merge into goal/city-style under your 19 Nov waiver once each is green? (the agents and the final switch still needing your word)" Josh: "Yes".
3. "Do you want the grey-box 3D view (section E) before real buildings?" Josh: "Yes".
- **The five agents may now be created** (planner, streetscape, buildings, facades, landscape; see Agents).
- **A1 waits for nothing.** 063 B is merged into `goal/city-style` (2edac93), and 069 is dropped (see What happens to the other tickets).
- **A2's purity test widened** (Josh, 19 Nov 2026, in chat: "Yes, widen it"): `tilecity.test.ts`'s allowed imports for `tilecity.ts` gain `../city/streets` and `../core` (A2 criterion 2).
- **A3 added** after A2 merged (a933e54): the puzzle HUD hides the plan picture's title and top-left corner on a phone. Asked "Should the HUD be hidden on ?city=plan as a small follow-up section?", Josh answered: "Yes, hide it" (19 Nov 2026, in chat).
- Questions: Q2 and Q3 answered; Q1 not yet asked for, L waits for his word; Q4, Q5 and Q6 open.
branch: one per section, `ticket/070<section>-<slug>` (named in each section), each cut from `goal/city-style`.

## Josh's words (19 Nov 2026, in chat)
> "I think that it might be best if we create a procedural city designer pipeline. [...] I think that currently the city designer is doing too much work and it's creating output that is illogical as a result. We need to break the city into smaller components and give different agents responsibility over each item."

His example order: streets, city biomes, boundaries between streets and biomes (curbs, grass on the sides of the roads), buildings, parks, building decor (ventilation etc.), plants.

On the design below:
> "I think the cities should be much larger in size eventually but I want to make sure a city plan on the scale that we have functions properly before we design anything large. Yes cut the ticket."

Three differences from his example order, which he has seen and accepted:
- Parks are split. Where a park is goes in Land, before buildings. What is in it goes in stage 8.
- Kerbs come after Mass, because the kerb turns in at every drive and lane mouth.
- The circuit has its own stage.

The spec is `docs/city-grammar.md` (rules 1 to 12, checks M1 to M9, Josh's rulings Q1 to Q7). No section edits it. Where it and this ticket disagree, the grammar wins and the architect re-cuts.

## Why
- One function, `tileCity` (`src/render3d/tilecity.ts`, lines 730 to 1975 of 2008), decides streets, block sizes, parking, alleys, parks and courts together. One `renderer` agent owns all of `src/render3d/` (about 48,000 lines).
- Later features patch earlier ones: gated passages, overshoots, the apron strip.
- No step decides the built mass (which cell is built and which is open) before buildings are placed. So blank walls and slivers are found afterwards, by checks.

## Goal
- The tile city is made by eight pure stages and one drawing stage, on the grammar's 5 m lattice.
- Each stage reads the layers before it and writes only its own.
- Each stage has its own owner, its own checks, its own digest, and a flat picture Josh can open on his phone (`?city=plan&stage=<name>`).
- It is proven at today's scale: the default 3 x 3 city and the 6 x 4 cities the checks already use.
- The ladder maps do not move.

## The stages

| # | Stage (`CityStage`) | Writes | Owner | Folder |
| --- | --- | --- | --- | --- |
| 1 | `streets` | the street network, the street cells' base roles, the block rectangles | planner | `src/city/streets/` |
| 2 | `land` | each block's biome (one: `"town"`) and treatment (court block, alley cut, whole park, half park); its parts (court or strip); lanes; park rectangles | planner | `src/city/land/` |
| 3 | `mass` | every block cell built or a named open use. Openings: lane, drive, frontage lot, plaza, park, walk-through. Interior: apron, stalls, aisle, green, path, park edge. Built cells carry open sides, column kind and back-to-back partner. Also courts with their stalls, and nominal units per block | planner | `src/city/mass/` |
| 4 | `edge` | the street cross-section dressed: kerb cuts at vehicle openings, the parking band (bays, build-outs, plain), build-out trees, pavement pieces and variants, the kerb line | streetscape | `src/city/edge/` |
| 5 | `buildings` | built cells grouped into buildings (2 to 4 columns); style, colourway, floors; back-to-back partners; each storey's kind (corner, mid, blind), yaw, piece and placement; roof pieces | buildings | `src/city/buildings/` |
| 6 | `circuit` | poles, wires, street lights, later the puzzle's nodes. Empty until ticket 059 is re-cut onto the pipeline | **left open** (Q4) | `src/city/circuit/` |
| 7 | `facades` | each ground storey's piece (shop, double shop, door, shop corner, residents' corner door); shopfront dressing; signs, awnings, ATMs; fire escapes; the party-wall kit; rooftop items and the roof exit | facades | `src/city/facades/` |
| 8 | `ground` | park and court furnishing, green trees and benches, alley bins, street furniture, planters, kerb bay meters | landscape | `src/city/ground/` |
| 9 | `assemble` | nothing. It draws the plan with Three.js and decides nothing | renderer | `src/render3d/plan3d.ts` |

- **Shared:** the plan type is in `src/core/cityplan.ts` (lead-architect; written with this ticket). The runner, sub-seeds, digests, picture helpers and the hash are in `src/city/pipeline/` (planner).
- **The flat picture viewer** is `src/render3d/planview.ts` (renderer).

## Rules every section holds (acceptance criteria of every section)
- **R-1. No stage edits an earlier layer.** The runner deep-freezes each layer when its stage returns.
  - A stage that writes into an earlier layer fails the run, with that stage named.
  - No stage folder imports another stage folder. Stages read earlier layers only through the `CityPlan` they are given.
- **R-2. Failing is the only way out.**
  - A stage that cannot do its job throws `CityStageError(reason, cells)` (`src/city/pipeline/`). The run returns `{ ok: false, failure }` with the stage, seed, blocksX, blocksZ, the reason (naming the rule or check) and the cells.
  - Nothing earlier is patched. No check is loosened. No city is pinned as a known exception.
  - On the named cities every stage returns `ok`. A section that cannot get there stops and reports, and the question goes to Josh through the main session.
- **R-3. Sub-seeds.**
  - Each stage's randomness comes only from its own `rand(...key)`, which is `stableHash("<stage>:<seed>:<key>")`.
  - **Exception, for stage 1 only:** `streets` keeps today's `hashOf` keys (`"tile:<seed>:<key>"`), so the default city stays exactly as it is.
  - No stage keeps hidden state between calls. No stage uses `Math.random` or the clock.
- **R-4. Digests.** Each layer's digest is FNV-1a over its canonical JSON: keys sorted, numbers rounded to 1e-6. The plan keeps one digest per stage.
  - Each plan section pins its layer's digest on the default city, 3 x 3 seeds 2 and 3, and 6 x 4 seed 1.
  - Each plan section has a test: swapping in a test double for its stage leaves the digests of every earlier stage equal to the standard run's.
- **R-5. Pictures.** Each plan stage exports `picture(plan): CityPicture`.
  - It has one legend entry per lattice cell, plus points for things smaller than a cell.
  - A test checks that its size is the lattice's, that every index is in the legend, and that each cell's legend matches the layer.
- **R-6. Pure.** `src/city/**` imports only `src/core/` and `src/city/`.
  - No three, no DOM, no `src/render*/`, `src/grid/` or `src/night/`, no file or GLB reads.
  - Measured sizes (bodies, sills, kit pieces) are typed-in tables in the stage's folder. Each is pinned against the GLB by a test in `src/render3d/` inside `it.skipIf(!have)`, as `BODY_M` is today.
- **R-7. Scale (Josh: "make sure a city plan on the scale that we have functions properly before we design anything large").**
  - No stage hard-codes a block count, a block id, or a lattice size.
  - Per-block work reads only that block, its parts and the blocks across its streets, and whole-city passes are linear in cells. The reviewer checks this.
  - One test per plan section runs its stage on one 6 x 6 city (`CITY_BLOCKS_MAX`, seed 1). The run must end `ok` or with a `CityStageFailure`, never an uncaught error. Nothing is tuned for it.
- **R-8. The ladder holds.** `packpin.test.ts` and `townpin.test.ts` pass untouched. `town.ts`, `terrace.ts` and the protocol maps are not edited. `npm run playtest` shows no ladder change.
- **R-9. The old tile city keeps serving `city=tiles`** until section L. Only A2 and L edit `tilecity.ts`, and only as they say. No new feature goes on the old path.
- **R-10. Test load (Josh's PC).** The builder runs only its folder's tests (`npx vitest run --maxWorkers=2 src/city/<folder>/`, plus the named render3d tests for renderer sections) and one `npx tsc --noEmit`.
  - Each city is built once per test file, through a module-level cache.
  - Heavy files are marked in their section and get a timeout of at least 120 s.
  - CI-safe: typed-in fixtures; GLB reads only inside `it.skipIf`, lazily; no Windows paths; no timer under 1 s.
- **R-11. The main session's gate**, as for every ticket: `npm run gate` green with more tests; the playtest; the diff only in the section's Files; `git ls-files assets/private` empty.

**The named cities** are the default (3 x 3, seed 1), 3 x 3 seeds 1 to 10, and 6 x 4 seeds 1 to 3, as the guide's checks use today.

## Every check has one stage
A check runs in the stage whose layer it judges. It may read earlier layers. Three grammar checks span stages, so they are split into clauses: M4 into a/b/c, M9 into a/b, and G4 runs where its last input is.

| Check | What it holds | Stage | Section |
| --- | --- | --- | --- |
| street width (grammar 10) | every carriageway 15 m, no avenue | 1 streets | A1 |
| V1, V2 | block sizes vary; not square | 1 streets | A1 |
| V3, V4 | alleys and parks at their rates | 2 land | B |
| M4a | no part has a short side of 3 to 5 cells | 2 land | B |
| M3 face rule | 0, 1 or 2 adjacent open sides; the column kind matches | 3 mass | C1 |
| M4b | every outer column of a court part, and every strip column, has a partner or a recorded opening behind it | 3 mass | C1 |
| M5 openings | whole cells, recorded, from rule 6's table; no row stretch of 1 cell; every interior touches an opening; no passage exists (the plan has no passage type) | 3 mass | C1 |
| G2 | every block side's back edge is built or a recorded opening | 3 mass | C1 |
| G3 | no void: every block cell has a use | 3 mass | C1 |
| R1 | continuous frontage share (`TILE_CITY_R1_MIN`), from cells | 3 mass | C1 |
| P2 | lot stalls within the band of homes; lots per block | 3 mass | C2 |
| P1, P3, P4, P5, P6 | kerb bays: serving, share, runs, band and tree pitch, density | 4 edge | D1 |
| kerb line (grammar 10, 063 F's criteria 33 to 37c and the two additions) | one unbroken line a side; returns at vehicle openings ending on the corner column's wall plane; straight past plaza, park edge, walk-through | 4 edge | D2 |
| G4 | every court touches its opening; every vehicle opening has its kerb cut; every lane end has its cut | 4 edge | D2 |
| R2 | 3 to 5 storeys; row neighbours differ in style and floors (street, inner and lane rows) | 5 buildings | F1 |
| R13 | row neighbours differ in colourway | 5 buildings | F1 |
| M4c | partner floor counts equal; partner is "through" (same style and colourway) or "another" (different colourway), by `BACK_SAME_SHARE` | 5 buildings | F1 |
| M1 lattice fit | every column's four body planes on its cell's edges within `WALL_JOINT_TOL_M` | 5 buildings | F2 |
| M2 the kit holds | every piece used has a 5.00 m body (10.00 m for `Shop_03`); `it.skipIf` GLB pin in render3d | 5 buildings | F2 |
| M6 corner turn | window faces on the two open sides, every storey; no corner piece off a corner column | 5 buildings | F2 |
| R9 | a true corner is any column with two adjacent open sides (Josh: "Yes, any corner") | 5 buildings | F2 |
| M9a | one roof piece per built cell, kind and turn matching; storeys and roof aligned within `STOREY_ALIGN_TOL_M` (063 E2's check) | 5 buildings | F2 |
| G1 | every wall plane within `OVERLAP_MAX_M` of its open side's edge; no recess | 5 buildings | F2 |
| M8 | no shop piece or shop dressing on a quiet frontage (a corner whose other side is street excepted); one door per quiet building | 7 facades | H1 |
| R3, R4, R5, R6 | ground bays, glass, awnings, signs and ATMs on street frontages | 7 facades | H1 |
| door sills (062) | the sill checks | 7 facades | H1 |
| R7, `escapeCheck` | fire escapes on street faces of qualifying blocks; they connect | 7 facades | H2 |
| M7 | no bare party wall above a lower roof; the pipe runs only on party walls (Josh: "Yes, dress it") | 7 facades | H2 |
| R8 | roofs dressed; big roof props | 7 facades | H3 |
| M9b (063 G criterion 40) | the roof exit stands on its roof, its door away from every open side, with clear deck | 7 facades | H3 |
| R10 | street furniture pitch, corners, keep-outs | 8 ground | I |
| R12 | no never-used key anywhere in the plan; no emissive dressing | 9 assemble (whole-plan audit) | J |
| draw-call caps | tile, dressing and furniture caps unchanged | 9 assemble | G, J |
| R11 | a lot and a plaza on `64-the-whole-chain` | ladder only, not run by the pipeline | none |

No threshold in this table changes. A ported check keeps its numbers. Its old copy in `src/render3d/` stays for the old path until L, and the two must agree on the named cities while both exist.

## Sections
Each is one builder session at most. They run in this order:
- A1 → A2 → A3
- B → C1 → C2 → D1 → D2 → E
- F1 → F2 → G
- H1 → H2 → H3
- I → J → L

H and I can run alongside each other once F2 has merged. Stage 6 (K) is not cut here.

**Every section's must-not-touch** (in addition to its own list):
- `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`;
- `src/render3d/town.ts`, `terrace.ts`, `packpin.test.ts`, `townpin.test.ts`;
- `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`;
- `docs/city-grammar.md`, `docs/city-style-guide.md` (changed once, in L).

### A1 · The skeleton, and stage 1 on it (planner, pure). Branch `ticket/070a1-pipeline-skeleton`
**Goal.** The pipeline runs stage 1 (`streets`) and gives a layer, a digest and a picture that match today's tile city exactly. Nothing on screen changes.

1. [ ] **Runner** (`src/city/pipeline/run.ts`): `runCity(options, until?: CityPlanStage, stages?)` returns a `CityPlanRun` (Vitest).
   - It runs the stages in `CITY_STAGES` order up to `until`.
   - It freezes each layer and records its digest.
   - It hands each stage only the layers before it.
   - It catches a `CityStageError` as a failure, and any other throw as a failure whose reason begins "bug:".
   - Stages not yet built are absent. `until` beyond the last built stage is a typed error.
2. [ ] **Freeze** (R-1). A test stage that assigns into `plan.layers.streets` fails the run with `failure.stage` set to its own name.
3. [ ] **Sub-seeds** (R-3, `seeds.ts`). `rand` for two stages with the same key differs. The same stage, seed and key always give the same value. `streets`' `rand` equals today's `hashOf` on 20 sampled keys.
4. [ ] **Hash and digest** (R-4, `hash.ts`, `digest.ts`).
   - `stableHash` is a copy of `src/render/city.ts`'s, pinned by 10 typed-in input and output pairs.
   - `digestOf` is the same under key reordering and a change of 1e-7, and different for a change of 1e-3 or one cell's role.
5. [ ] **Stage 1, moved, not rewritten** (`src/city/streets/`).
   - These are moved from `tilecity.ts` with their bodies unchanged, apart from imports and the output shape: `hashOf`, `layoutAxis`, `blockLens`, `cvOf`, `blockSizesWork`, `blockSizesVary`, `blockSizes`, `BLOCK_FALLBACK_WIDTHS`, `BLOCK_FALLBACK_DEPTHS`, `blockType`, `clampBlocks`, the band profiles, `streetBandAt`, `mkStreet` and the band-role loop (`tileCity`'s street and block part, today about lines 736 to 823).
   - So are the constants they use (`TILE_M`, `BLOCK_TILES`, `BLOCK_STEP_MIN_CELLS`, `BLOCK_CV_MIN`, `BLOCK_NONSQUARE_MIN`, `BLOCK_DRAWS_MAX`, `BLOCK_MEAN_MIN_CELLS`, the block-type bounds, `CITY_BLOCKS_MAX`, `CITY_BLOCKS_DEFAULT`, `AVENUE_ONE_IN` and the `KERB_BAY_SHARE_MAX.street` value `blockSizesWork` reads).
   - `tilecity.ts` keeps its own copies until A2.
6. [ ] **Equal to today.** On the named cities plus 6 x 4 seeds 4 to 6, each of these deep-equals `tileCity(opts)`'s (Vitest):
   - the layer's `streets`;
   - its blocks (id, bi, bj, bounds, type);
   - every street cell's base role, where today's `parking`, `buildout` and `parkingPlain` read as `parkingPlain`, and `kerbCut` reads as `pavement`.

   The test imports `tileCity` from `src/render3d/` (a test-only import, the one allowed). This is the proof that the move changed nothing.
7. [ ] **Street width and V1, V2** run on the layer (Vitest). They are ported from `frontage.ts`'s `blockVariety` and `evaluateVariety`, with V1 and V2 only and their thresholds unchanged. They hold on the named cities. Failing fixtures: a uniform 10 x 10 grid fails V1 and V2, and a hand-made street with an avenue profile fails street width.
8. [ ] **Picture.** `streets`' legend is lane, parking band, junction, crossing, pavement, pavement corner and block. R-5 holds.
9. [ ] **R-4 pins** for stage 1. R-7's 6 x 6 run.

- **Files:** new `src/city/pipeline/` (run, seeds, hash, digest, picture helpers, tests); new `src/city/streets/` (stage, tests).
- **Must not:** `src/render3d/` (read only).
- **Heavy:** criterion 6 builds `tileCity` 16 times. One file, a 120 s timeout.

### A2 · The old city reads stage 1; the flat picture on screen (renderer). Branch `ticket/070a2-plan-view`
**Goal.** Josh opens `?view=3d&city=plan&stage=streets` (also `&blocks=6x4&seed=3`) on his phone and sees the street layer as coloured cells with a legend. `city=tiles` draws exactly as before, but its streets now come from stage 1.

**Note (added with A3).** `view=3d` is required: `main.ts` takes the 3D path only from `view=3d`, and the plan view is routed inside it. Every `?city=plan` address in this ticket means `?view=3d&city=plan`.

1. [ ] **`tilecity.ts` uses stage 1.** It imports the A1 functions and constants and deletes its own copies.
   - It re-exports every name tests or other modules import today (`blockSizes`, `blockType`, `BLOCK_FALLBACK_*`, `TILE_M`, the constants), so no other file changes.
   - `TileStreet` becomes an alias of `CityStreet`.
2. [ ] **Nothing moved.** `tilecity.test.ts`, `tilecity3d.test.ts`, `kerbline.test.ts`, `parkmetrics.test.ts`, `alleys.test.ts`, `styleguide.test.ts` and the city-data digest pins pass without being edited, and R-8 holds.
   - **One exception:** `tilecity.test.ts`'s "pure (criterion 8)" test's allowed-import list for `tilecity.ts` gains `"../city/streets"` and `"../core"`. Every other ban in that test, and every other line of the file, is unchanged. Asked "May the tilecity purity test's import list gain ../city/streets and ../core?", Josh answered: "Yes, widen it" (19 Nov 2026, in chat).
3. [ ] **The viewer** (`src/render3d/planview.ts`, dev builds only, like the gallery).
   - `planViewRequested(search)` parses `city=plan`, `stage` (a name, or 1 to 8), `blocks` and `seed` as `cityTilesRequested` does.
   - It runs `runCity(opts, stage)` and draws the stage's picture on a 2D canvas, fitted to the window, with the legend under it.
   - On a failure it draws the last good layer and a banner naming the stage, the seed and the reason.
   - An unknown stage lists the built ones.
   - Tests: the parser on typed-in strings, and a pure `pictureToRgba(picture, scale)` on a fixture.
4. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=streets` and `&blocks=6x4&seed=3`: streets, junctions and blocks read at a glance. `?view=3d&city=tiles` looks as on `goal/city-style`.

- **Files:** `src/render3d/tilecity.ts` (stage 1's imports and deletions only); `src/render3d/tilecity.test.ts` (the purity test's allowed-import list only, criterion 2); new `src/render3d/planview.ts` and `planview.test.ts`; `src/render3d/renderer.ts` (routing `city=plan` only).
- **Must not:** `src/city/` (read only), and every other render3d file.

### A3 · The plan view without the puzzle HUD (renderer). Branch `ticket/070a3-plan-hud`
**Goal.** On `?view=3d&city=plan` Josh sees only the plan picture: no map picker, power-source box, "Priests want lit", parts tray or sound button over it, so its title and top-left corner show on his phone. Every other address keeps its HUD exactly as on `goal/city-style`, `city=tiles` included. Josh, 19 Nov 2026, in chat: "Yes, hide it".

1. [ ] **One rule, beside the viewer's** (`src/render3d/planview.ts`). A pure `planHidesHud(search: string, dev: boolean): boolean` is true exactly when `dev`, `view=3d` and `planViewRequested(search) !== null`, which is when `renderer.ts` draws the plan view. It is exported from `src/render3d/index.ts`. Tests (Vitest, `planview.test.ts`), on typed-in strings:
   - true: `?view=3d&city=plan&stage=streets`, `?view=3d&city=plan&stage=1&blocks=6x4&seed=3`, `?view=3d&city=plan` (no stage), `?view=3d&city=plan&stage=nope` (the viewer's unknown-stage list);
   - false: the first of those with `dev` false; `?city=plan&stage=streets` (no `view=3d`); `?view=3d&city=tiles`; `?view=3d`; `?view=3d&gallery=city`; `""`.
2. [ ] **The wiring** (`src/main.ts`). In the `view3d` branch, once the render3d module has loaded and before `open(first)`, if `m.planHidesHud(location.search, import.meta.env.DEV)` the `#ui` root is set `hidden`. Nothing else in `main.ts` changes: `mountUI`, the insets and the frame loop run as before (a hidden HUD measures 0, so the insets are 0). No test: it is two lines of DOM, checked by criterion 3.
3. [ ] (Main session, phone-sized screenshots) `?view=3d&city=plan&stage=streets` and `?view=3d&city=plan&stage=streets&blocks=6x4&seed=3`: no HUD element shows, and the picture's title and top-left corner are in view. `?view=3d&city=tiles`, `?view=3d` (the first ladder map) and `/` (2D) show the HUD as on `goal/city-style`.
4. [ ] R-8 and R-11 hold. Tests run: `npx vitest run --maxWorkers=2 src/render3d/planview.test.ts` and one `npx tsc --noEmit`.

- **Files (an explicit exception to "Every section's must-not-touch" for `src/main.ts`, this section only):** `src/render3d/planview.ts` (the new `planHidesHud` only); `src/render3d/planview.test.ts` (its tests only); `src/render3d/index.ts` (the one export line); `src/main.ts` (the `hidden` call in the `view3d` branch only).
- **Must not:** `src/ui/` (the HUD itself is not changed; it is only not shown), `index.html`, `src/render3d/renderer.ts`, `tilecity.ts`, `src/city/`, every other render3d file, and every other line of `src/main.ts`.

### B · Stage 2, Land (planner, pure). Branch `ticket/070b-land`
**Goal.** Each block has a biome (`"town"`), a treatment and its parts, by grammar rules 4 and 12 and style guide 19.6. Josh sees it at `?city=plan&stage=land`.

1. [ ] **Moved.** `planBlocks` (its park and alley quotas, `PARK_*`, `ALLEY_*`) and `tileCity`'s parts loop (about lines 825 to 868), re-keyed on `rand` (R-3).
2. [ ] **Parts are 2, or 6 and more (M4a; from 065 criterion 4 and 067 criterion 6).**
   - A lane cuts a block only where each part it leaves has a short side of exactly 2 (a strip; Josh: "Yes, allow strips") or of 6 or more.
   - Among the positions that do, the lane's place is by hash.
   - A half park leaves a built part of 6 cells or more, or the block takes no half park.
   - Failing fixture: a 9-cell side cut into two parts of 4.
3. [ ] **Edges.** Each part's four `edges` (street, lane, park) are right. A strip has one street edge and one lane edge on its long sides.
4. [ ] **V3, V4** hold on the named cities, ported from `evaluateVariety` with their thresholds. The builder reports alleys, strips and parks per city before (the old `planBlocks`) and after.
   - If V3 or V4 cannot hold under criterion 2, the builder stops and reports (R-2). No rate falls.
5. [ ] **Biome.** Every block's biome is `"town"`. No stage reads the field yet; a test says so by grep over `src/city/`.
6. [ ] R-1 to R-7 for `land`. Legend: court part, strip part, lane, whole park, half park.

- **Files:** new `src/city/land/`.

### C1 · Stage 3, Mass: rings, openings, the face rule (planner, pure). Branch `ticket/070c1-mass`
**Goal.** Every cell of every block is built or a named open use before any building exists. Josh sees it at `?city=plan&stage=mass`: built cells by column kind, and openings by kind.

1. [ ] **Court parts** (grammar rule 4).
   - Ring 1 (outer) and ring 2 (inner) are built.
   - The interior starts at ring 3: the apron (`APRON_CELLS`), then green with paths. Courts are C2's.
   - The four ring-2 corner cells are blind.
2. [ ] **Strips.** Both rows are built and outer, and each faces its own edge.
3. [ ] **Openings** (rule 6, recorded as `CityOpening`):
   - lanes, with their two mouth cells;
   - plazas, 2 x 2 at a block corner, by today's plaza rule;
   - whole and half parks, with their park edges;
   - walk-throughs: 1 cell through both rings, only for an interior with no lane (C2 removes those where a drive lands).

   A row stretch between openings, or between an opening and a corner, is at least 2 cells.
4. [ ] **Open sides** (from 065 criterion 11). Each built cell's `open` lists each side whose neighbour is not built, with what it faces and its frontage (rule 9). Its `column` follows from them, and its `partner` is the built cell behind it.
5. [ ] **M3, M4b, M5, G2, G3, R1** (the table) hold on the named cities.
   - Failing fixtures: a cell with opposite open sides; a part 3 deep; an opening's record removed (it fails at that opening); a block cell left with no use.
   - G3 and R1 are ported from `frontage.ts` (`interiorMetrics`, and the R1 share in `citymetrics.ts`) onto cells, with their thresholds.
6. [ ] R-1 to R-7 for `mass`, without courts. The digest pin is re-taken in C2, on purpose, and named there.

- **Files:** new `src/city/mass/`.

### C2 · Stage 3, Mass: units, lots and courts (planner, pure). Branch `ticket/070c2-mass-parking`
**Goal.** Parking demand is fixed from the mass, and residents' courts and frontage lots are laid as openings, so P2 holds before any kerb is drawn.

1. [ ] **Nominal units** (18.2, on 5 m cells). These are the parking demand of record (`CityBlockUnits`), and no later stage changes them:
   - columns: every built cell of the block;
   - shops: street-frontage outer ground columns, less one door column per street run of up to `TERRACE_BAYS.max` columns, rounded up;
   - homes: `floor(columns x UNIT_FLOORS_NOMINAL / HOME_COLUMN_FLOORS)`.
2. [ ] **Lots.** `unitsOf`, `lotQuota` and `planLots` (their quota rounds and the dearer-layout rule) are moved and run on cells.
   - Each lot is a court behind a 2-cell drive through both rings, with stalls and aisle from ring 3 (from 065 criterion 3). Where that does not fit, it is a 2 x 2 frontage lot, within `CITY_FRONT_LOT_BLOCKS_MAX`.
   - An alley block's court opens on its lane, as 057 G's does.
   - A drive replaces that interior's walk-through.
   - C1's checks still hold.
3. [ ] **P2** holds on the named cities with `PARK_PER_HOME` 0.15 and every threshold. It is ported from `parkmetrics.ts` onto the layer.
   - The builder reports homes, stalls wanted and stalls laid on the default city and seeds 1 to 5. The grammar estimated about 860 homes, 129 stalls wanted and 108 from two courts a block.
   - **Stop rule:** if P2 cannot hold, the builder stops and reports with the numbers (R-2, Q5).
4. [ ] R-1 to R-7 for `mass`. C1's pin is re-taken here, and the test names it as moved by C2.

- **Files:** `src/city/mass/`.
- **Heavy:** the named-city loop with the quota rounds. Its own file, a 120 s timeout.

### D1 · Stage 4, the parking band (streetscape, pure). Branch `ticket/070d1-edge-band`
**Goal.** Every parking-band cell is a bay, a build-out or plain, as 18.5 says, laid against the mass's openings. Josh sees it at `?city=plan&stage=edge`.

1. [ ] **Kerb cuts.** Every vehicle opening's mouth (`CityOpening.mouth`) cuts the pavement in front of it. The parking cell in front of a cut is plain.
2. [ ] **Moved.** 056's greedy allocator as it is in `tilecity.ts` on 2edac93 (the 063 B merge): `BandState`, `startsOf`, `tryAdd`, `ownStates`, the block order (fewest own parking sides first, ties by id), own sides first and then the band across the longest street, and `shortTiles`. Nothing is added to it: no matching (069, which would have added one, was dropped and never built).
   - The allocator reads demand from `mass.units` (shops x `PARK_PER_SHOP`), never from buildings or facades.
   - Every block left short keeps its `shortTiles` count in the layer, so P1 reads it from the layer.
3. [ ] **Build-outs and their trees** (`BUILDOUT_TREE_EVERY`, never next to a crossing). The outer side of an edge street stays plain.
4. [ ] **P1, P3, P4, P5, P6**, ported from `parkmetrics.ts` with every threshold, hold on the named cities (the default, 3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3), with no named exception. They hold there on the old path at 2edac93 (`parkmetrics.test.ts`, "passes every check on the default city, seeds 1 to 10 at 3 x 3 and seeds 1 to 3 at 6 x 4").
   - **Known shortfall outside the named cities, reported, not pinned, not required.** On the old path at 2edac93, P1 fails on 3 x 3 seeds 12, 15, 17, 18, 19 and 6 x 4 seeds 5, 7, 11, 12, 15, 16, 18 (Josh accepted this with the 063 B merge; the cause is in ticket 063 section B2: one parking band to a street capped at one tile, whole-block parks with no band of their own, and the greedy order letting a neighbour take the only tile). The builder reports P1 to P6 on 3 x 3 and 6 x 4 seeds 11 to 20 and 6 x 4 seeds 4 to 10, old path beside pipeline. No test names these cities, expects them to fail, or skips them. `alleys.test.ts`'s `P1_ONE_SHORT` pin (6 x 4 seeds 5 and 7) belongs to the old path and is not copied into `src/city/`.
   - Whether the pipeline should go on to fix that cause is Q6; D1 does not decide it.
   - Failing fixture: the default city's edge layer, typed in from the run in the test (not pinned by hash), with one block's only serving tile removed, gives P1 = 1.
5. [ ] R-1 to R-7 for `edge`, in part (the kerb line is D2's). Legend: bay, build-out, plain, kerb cut, pavement, crossing, junction, lane.

- **Files:** new `src/city/edge/`.
- **Heavy:** criterion 4's report runs 41 cities. Its own file, a 120 s timeout.

### D2 · Stage 4, the kerb line and the ground pieces (streetscape, pure). Branch `ticket/070d2-edge-kerb`
**Goal.** The edge layer carries one unbroken kerb line a side and every street cell's piece, variant and yaw, so the assembler only draws it.

1. [ ] **Ground cells.** Every street cell has its `TileCell`-shaped record (`role`, `variant`, `x_m`, `z_m`, `yaw`, `street`): lane patches, grates and the returns' variants, by `rand`.
   - The architect writes `CityGroundCell` into `CityEdgeLayer` before D1 starts, the same shape as `TileCell`, so `tilecity3d.ts` can draw it unchanged.
2. [ ] **The kerb line.** `kerbLine` (`kerbline.ts`) is moved, plus the grammar's two additions (from 065 criterion 10):
   - no return at a plaza, park edge or walk-through;
   - each return ends within 0.05 m of the corner column's wall plane on the building line (the cell edge, with `BODY_M` read from F2's table once it exists, else the cell edge).

   063 F's fixtures still fail as they do.
3. [ ] **G4** on the layer.
4. [ ] R-1 to R-7 for `edge`, completed. The pin is re-taken.

- **Files:** `src/city/edge/`.

### E · Assemble, first cut: the ground and the massing in 3D (renderer). Branch `ticket/070e-plan3d-massing`
**Goal.** At `?city=plan` (3D) Josh walks the pipeline's city: the street edge drawn with today's tile pieces, the interiors paved and green, and every built cell a plain grey box three storeys high. He judges the mass in 3D before a single building is chosen (Q2).

1. [ ] **Plan to scene** (`src/render3d/plan3d.ts`). It draws `edge`'s ground cells and `mass`'s interior uses through `tilecity3d.ts`'s existing tile drawing and `tileslots.ts`'s keys. Built cells are one `InstancedMesh` of boxes.
   - It reads the plan and decides nothing: a test diffs the plan's digests before and after drawing.
2. [ ] **Draw calls.** At most `TILE_DRAW_CALLS_MAX` plus 1. Day and night as `city=tiles`.
3. [ ] **Paving through both rings.** Drive, walk-through and lane-mouth cells take 063 H's paving (from 066 criterion 4).
4. [ ] (Main session, screenshots: overhead and street camera, day, default city and 6 x 4 seed 3) no ground shows between built cells; rings stand back to back; drives and walk-throughs are paved; kerbs return at drives and lane mouths.

- **Files:** new `plan3d.ts` and `plan3d.test.ts`; `renderer.ts` (routing); `tilecity3d.ts` and `tileslots.ts` (an entry that takes ground cells and interior uses not from a `TileCity`, without changing the `TileCity` path).

### F1 · Stage 5, Buildings: grouping, style, colour, floors (buildings, pure). Branch `ticket/070f1-buildings`
**Goal.** Built cells become buildings, and every row reads varied. Josh sees it at `?city=plan&stage=buildings`: each building a colour, with its floors written on it.

1. [ ] **Grouping.** Each run of built cells along an open side becomes buildings of `TERRACE_BAYS` columns (2 to 4; `Shop_03` takes two cells). Corner and blind cells join the building beside them, as grammar rule 4 says for ring-2 corners.
   - A run that cannot be cut into whole buildings fails (R-2, grammar rule 6: "A row always closes").
2. [ ] **Style, colourway, floors.** `STACK_STYLES` (the style table as data) and `assignColourways` and `colourwayStart` (colourway.ts) are moved. The style table is a typed-in copy pinned to stacks.ts's by a render3d test while both exist.
3. [ ] **Partners** (grammar rule 4, Josh: "They can be either."). An inner building is "through" (its partner's style and colourway) or "another" (its own style, a different colourway), by `BACK_SAME_SHARE` 0.5 on the partner's key. Either way its floor count is its partner's.
4. [ ] **R2, R13, M4c** hold on the named cities, R2 on outer, inner and lane rows alike. Failing fixtures: an inner building given its partner's floors plus one; an "another" building given its partner's colourway.

- **Files:** new `src/city/buildings/`. A render3d pin test for the style table (`src/render3d/stylepin.test.ts`, the one render3d file this section may add).

### F2 · Stage 5, Buildings: pieces, turns, roofs, placements (buildings, pure). Branch `ticket/070f2-building-pieces`
**Goal.** Every storey of every column has its piece, its turn and its exact placement on its cell, so the assembler only puts it there.

1. [ ] **The kit table** (R-6): `BODY_M` (facade.ts, 063 E2) and the corner pieces' measured −x second face (063 E1), as typed-in data. A render3d `it.skipIf` test pins it to the GLB (M2).
2. [ ] **Kinds and turns.** Mid, corner and blind run from the ground to the roof. A corner's turn is forced (rule 7). The ground storey's slot carries its kind and yaw; its key is stage 7's.
3. [ ] **Roofs.** One roof piece of the building's own style per cell, corner or mid by the column, turned with it (rule 11).
4. [ ] **Placements.** Each piece's `CityPlacement` puts its body on its cell (rule 1), so trim alone overhangs. Nothing is scaled.
5. [ ] **M1, M6, R9, M9a, G1** hold on the named cities. Failing fixtures: bounds placement (a three-column `Apartment_02` 15.51 m wide), a corner turned "+x", and a roof one cell off.

- **Files:** `src/city/buildings/`; the render3d `it.skipIf` pin test (`src/render3d/kitpin.test.ts`).

### G · Assemble: buildings drawn (renderer). Branch `ticket/070g-plan3d-buildings`
**Goal.** At `?city=plan` the grey boxes become City Pack buildings, piece by piece at the plan's placements. Ground storeys use a placeholder floor piece until H1.

1. [ ] **Drawn from placements only.** One clone per placement, as stacks are today, with no choice made in render3d. Colourway materials by the plan's colourway id. The digest-diff test as in E.
2. [ ] **Draw calls.** The builder reports building calls before and after on the default city (the grammar expects about twice `city=tiles`). No cap is raised: if the frame rate cannot hold it goes to Josh, and the remedy is instancing (a later ticket).
3. [ ] (Main session, screenshots) back-to-back rows, corners turned to their two open sides, roofs on their cells, no gap between walls.

- **Files:** `plan3d.ts`, `plan3d.test.ts`, `models3d.ts` (loading for the plan path only; the ladder and `city=tiles` paths unchanged).

### H1 · Stage 7, Facades: ground storeys and shopfronts (facades, pure). Branch `ticket/070h1-facades-ground`
**Goal.** Street fronts carry shops, doors, glass, awnings and signs; quiet fronts carry one residents' door per building and windows; no shop faces a court.

1. [ ] **Ground keys.** For each ground slot (F2) a key of its kind:
   - on a street frontage: a shop, a double shop, a door, or a shop corner (R3);
   - on a quiet one: a residents' door (one per building), the style's floor piece, or `Apartment_Door_Corner_01` or `_02` at a quiet corner (rule 7).
2. [ ] **Moved.** `dressBlock`'s shopfront rules (glass, awnings, fascia and blade signs, ATMs; `P_*`, `ATM_PER_RUN`), and the sill tables (062) as typed-in data.
3. [ ] **M8, R3, R4, R5, R6, sills** hold on the named cities. Failing fixture: an inner building with a shop piece.

- **Files:** new `src/city/facades/`. The render3d pin test of the sill table.

### H2 · Stage 7, Facades: fire escapes, party walls, wall props (facades, pure). Branch `ticket/070h2-facades-walls`
1. [ ] **Fire escapes.** `planEscape`, `storeysOfColumn`, `sillOf` and 058 and 061's ranking, moved. Escapes on quiet faces are extra and do not count toward R7.
2. [ ] **Party walls** (rule 8, Josh: "Yes, dress it"). Every party-wall storey face above a lower roof carries a board, pipe run or window, by hash, with no key twice running. `SM_Prop_Pipe_Present_*` is allowed only there. No fire escape stands on a party wall.
3. [ ] **Wall props** (air-conditioners, planters, canopies; 066 criterion 3's quiet list).
4. [ ] **R7, `escapeCheck`, M7** hold. Failing fixture: a height step with no kit piece.

- **Files:** `src/city/facades/`.

### H3 · Stage 7, Facades: roofs and the roof exit (facades, pure). Branch `ticket/070h3-facades-roofs`
1. [ ] **Roof props** (`P_ROOF_SMALL`, `P_ROOF_LARGE`, `ROOF_EDGE_M` inside the body), moved.
2. [ ] **The roof exit** (068, Josh: "roof top exists shouldn't open to the street. They should be on the roof.").
   - Wholly on its roof, its door away from every open side, with `ROOF_ACCESS_CLEAR_M` (1.2 m) of clear deck.
   - The column is a blind one, else inner, else mid.
3. [ ] **R8, M9b** hold. Failing fixture: today's placement, with the door toward the street.

- **Files:** `src/city/facades/`.

### I · Stage 8, Ground dressing (landscape, pure). Branch `ticket/070i-ground`
**Goal.** Parks, courts, greens, lanes and pavements are furnished, clear of doors, stalls, poles (stage 6, empty until 059) and each other.

1. [ ] **Moved.** `fillGreen`'s trees, benches and paths (19.4), park furnishing, alley bins (`ALLEY_BIN_*`), `furnitureLayout`'s pavement rules (`FURN_*`, bus stops, hydrants and the rest), and `bayMeters`.
   - Bins stand against the wall, clear of doors (stage 7's door placements).
2. [ ] **R10** holds on the named cities. Failing fixture: a bench in a court's aisle.

- **Files:** new `src/city/ground/`.

### J · Assemble: facades and ground drawn; the whole-plan audit (renderer). Branch `ticket/070j-plan3d-dressing`
1. [ ] Stage 7 and 8 placements are drawn as instanced meshes per key, as `dressdraw` and the furniture do today, under `DRESS_DRAW_CALLS_MAX` and `FURN_DRAW_CALLS_MAX`.
2. [ ] **R12.** No never-used key in any layer (`isNeverUsed`, with the party-wall pipe allowance). No emissive dressing.
3. [ ] (Main session, screenshots: street camera, day and night) the pipeline's city beside `city=tiles` at the same seed.

- **Files:** `plan3d.ts`, `plan3d.test.ts`, `models3d.ts` (the plan path only).

### K · Stage 6, the circuit (not cut here)
- Ticket 059 is re-cut onto the pipeline later. Its A1 (`tileLines`) becomes the `circuit` stage, and its pole slots move there from `tilecity.ts`.
- Its owner is left open (Q4).
- Until then the runner has a `circuit` stage that returns an empty layer, so stages 7 and 8 already read it. That stub is A1's, a few lines.

### L · The switch (renderer, only on Josh's word: Q1). Branch `ticket/070l-switch`
**Goal.** `city=tiles` is the pipeline's city.
1. [ ] **The switch.** `city=tiles` routes to `plan3d.ts`.
   - The old path's tile-only code in `tilecity.ts` (everything after stage 1 that only the tile city uses) and its tile-only tests are deleted.
   - Every check now runs only in its stage (the table).
2. [ ] **The guide.** Chapter 19 says the tile city is made by the pipeline, and points to the grammar and this ticket for the stages. The retired lines go (19.2's far-end order, 19.4's ring-2 strip, 19.6's alley rear, 18.2's 5.2 m bays), as the grammar's "Guide text that goes" lists. Drift checks follow the constants to their new modules.
3. [ ] R-8. The playtest shows no ladder change.

- **Files:** `tilecity.ts` and its tests, `renderer.ts`, `docs/city-style-guide.md`, `styleguide.test.ts`.

## What happens to the other tickets
- **063 B (street width)** is merged into `goal/city-style` (2edac93). A1 starts from that head and copies `layoutAxis` after B's change. With the merge Josh accepted P1 failing on cities outside 063 criterion 7's list, and the old path's `P1_ONE_SHORT` pin in `alleys.test.ts` (merge message of 2edac93). D1 moves the allocator as it is there.
- **069 (the parking allocator re-cut, `matchFirstTiles`) is dropped, on Josh's word, and was never built.** Josh, 19 Nov 2026, in chat to the main session: "69 is dropped. I'm waiting on 63b to merge"; and, to the session merging 063 B (recorded in 2edac93's message): "Merge 063 B and 069", then "Then don't bother with 069". 063 section B2, which 069 would have built, is likewise not built. Nothing in this ticket depends on it.
- **063 E1 and E2** are merged (15af0a2). `BODY_M`, the −x corner face and `storeyAlignment`'s check become F2's kit table and M1, M6 and M9a.
- **064 (lattice): superseded, not re-homed.**
  - The pipeline never packs by widths. Columns are cells, so the lattice holds by construction.
  - M1 survives as F2's check on placements. Passages cannot exist (the plan has no passage type), so G2 and M5 in C1 cover "passage count 0".
  - The `bay_m` and `depth_m` options in `town.ts`, `columns: "body"` in `stacks.ts` and the body packer in `terrace.ts` are not built.
- **065 A:** ring 2, lanes rows, walk-throughs, M4b and M5 → C1; drives through both rings, units, P2 and Q-065-1 → C2; the parts rule → B; the kerb at openings (criterion 10) → D2.
- **065 B:** `openSides` and M3 → C1; corner and blind columns, M6 and R9 → F2; quiet ground rows and M8 → H1; R2 on quiet rows → F1.
- **066:** the drawing → E and G; partner colourways (M4c) → F1; quiet dressing → H1 and H2; inlets paved → E; draw calls → G and J.
- **067 A** (party walls, the pipe lift) → H2. **067 B** (strips) → B and C1.
- **068** (roof exit) → H3.
- **059** → K (stage 6). Its A2 drawing becomes a renderer section of the re-cut.
- **064 to 068's files** are marked superseded by 070 when Josh approves this ticket. The architect does that on the main session's word, in a separate pass; they are not edited here. (Done 19 Nov 2026, after Josh's approval.)

## Agents
These five do not exist. The main session writes each `.claude/agents/<name>.md` on Josh's approval, modelled on `renderer.md`. Each file needs:

| Agent | Folder it owns | Reads before work | Never touches |
| --- | --- | --- | --- |
| planner | `src/city/pipeline/`, `streets/`, `land/`, `mass/` | grammar rules 3 to 6, 10 and 12, M3 to M5; guide 18.2, 18.4, 18.6, 19.3 to 19.6 | other stage folders, `src/render3d/`, `src/core/` |
| streetscape | `src/city/edge/` | grammar rule 10; guide chapter 18 (P1 and P3 to P6), 19.1, 063 F's kerb rules; ticket 056, and 063 section B2 for the cause of P1's known shortfall | the same, plus `mass/`'s code (it reads the layer, never the code) |
| buildings | `src/city/buildings/` (plus the named render3d pin tests) | grammar rules 1 to 4, 7, 11 and 12, M1, M2, M4, M6, M9; guide chapters 2 and 7, 16.2 to 16.4, 16.9 | ground keys (stage 7's), the dressing |
| facades | `src/city/facades/` (plus the sill pin test) | grammar rules 8, 9 and 11, M7 to M9; guide 16.5, 16.6, 16.11; tickets 058, 061, 062 and 068 | piece kinds, yaws and placements (stage 5's) |
| landscape | `src/city/ground/` | grammar rule 5; guide 19.4, 19.6 and the furniture chapter (R10) | every other layer's content |

**Every new agent's file says:**
- The CLAUDE.md hard rules.
- R-1 to R-11 above.
- "fail, never patch": `CityStageError`. No check loosened, no city pinned.
- Its stage reads earlier layers through `CityPlan` only.
- A type it needs in `src/core/cityplan.ts` is a re-cut by the architect, never its own edit.
- Its test command, `npx vitest run --maxWorkers=2 src/city/<folder>/`, and one `npx tsc --noEmit`.
- It reports in its final message: the tests added, the numbers asked for, and anything it stopped on.

**The renderer** keeps `src/render3d/`. Its `.md` gains one line: it draws the plan and decides nothing about it (`plan3d.ts`, `planview.ts`).

**The hook.** `.claude/hooks/pipeline_guard.py` has no folder map today. It guards reviews, playtests, tickets, `puzzles/locked/` and the playtester's writes, and the playtester's `src/` rule already covers `src/city/`. So the new agents work without a hook change. Per-agent folder enforcement would be a new rule; I do not recommend it now. The reviewer's "diff only in Files" check does that job.

## Interfaces
- **Written with this ticket** (`src/core/cityplan.ts`, exported from `src/core/index.ts`):
  - `CITY_STAGES`, `CityStage`, `CityPlanStage`, `CityPlanOptions`;
  - `CityCell`, `CitySide`, `CityPlacement`;
  - the `streets`, `land` and `mass` layer types in full;
  - stubs for `edge`, `buildings`, `circuit`, `facades` and `ground`;
  - `CityLayers`, `CityPlan`, `CityDigest`, `CityStageFailure`, `CityPlanRun`, `CityPicture`.
- **Typed by the architect before their sections start:** `CityEdgeLayer` (before D1: `CityGroundCell`, the same shape as `TileCell`, plus bays, build-out trees, kerb paths), `CityBuildingsLayer` (before F1), `CityFacadesLayer` (before H1), `CityGroundLayer` (before I), and `CityCircuitLayer` (at 059's re-cut).
- **In `src/city/pipeline/`** (planner, A1):
  - `runCity`;
  - `CityStageError`;
  - `CityStageDef<S> { name: S; run(plan: CityPlan, rand: (...key: readonly (string | number)[]) => number): CityLayers[S]; picture(plan: CityPlan): CityPicture }`;
  - `stableHash`, `digestOf`, `stageRand`.
- **No new dependency.**

## Non-goals
- **Larger cities.** Josh: "I think the cities should be much larger in size eventually but I want to make sure a city plan on the scale that we have functions properly before we design anything large."
  - No larger city is designed, built or tuned here. `CITY_BLOCKS_MAX` stays 6, and the fallback size lists stay six long.
  - R-7 only keeps the contracts from assuming a small city.
- **More biomes.** One, `"town"`. The field is there and nothing reads it.
- **Office towers** (the grammar's "Not in this grammar yet").
- **Instancing the stack pieces**, unless G's draw calls say so to Josh.
- **Changing any check's threshold, any Decided rule, or the ladder.**
- **The circuit and the rebuilt puzzles** (K and after).

## Questions for Josh (most important first)
1. **When does the pipeline replace the old tile city at `city=tiles`?**
   - Recommendation: only on his word, after he has played `?city=plan` through section J (section L).
   - Until then both exist, and the old path gets no new features.
   - **Not yet asked for; L waits for his word.** (19 Nov 2026: he was told the recommendation and did not object, but did not answer it in words.)
2. **Should the pipeline's 3D view show the mass as plain grey boxes before buildings exist (section E)?** It lets him judge the built and open cells in 3D, not only in the flat picture.
   - Recommendation: yes. It is half a day, and it catches a wrong mass before three more stages are built on it.
   - **Answered, Josh, 19 Nov 2026, in chat.** Asked "Do you want the grey-box 3D view (section E) before real buildings?", he said: "Yes".
3. **Do the five new agents, and this ticket's sections merging into `goal/city-style`, fall under his 19 Nov waiver** ("I don't want to constantly approve all of these improvments")?
   - Recommendation: the sections A1 to J merge under the waiver once each is green.
   - Creating the agents and the switch (L) need his word.
   - **Answered, Josh, 19 Nov 2026, in chat.** Asked "Do you approve ticket 070 and creating the five new agents (planner, streetscape, buildings, facades, landscape)?", he said: "Yes". Asked "Do the sections merge into goal/city-style under your 19 Nov waiver once each is green? (the agents and the final switch still needing your word)", he said: "Yes". So the agents may be created, and A1 to J merge into `goal/city-style` once each is green; L still needs his word, and `main` still does.
4. **Who owns stage 6, the circuit?**
   - Recommendation: decide it when 059 is re-cut. The default is streetscape for the layout (poles stand on its pavement) and the renderer for the drawing.
5. **Carried from 065, only if C2's stop rule fires:** may `LOTS_PER_BLOCK_MAX` be 3 on blocks of at least 10 cells each way, if P2 cannot hold?
   - Recommendation: answer when C2 brings the numbers.
6. **Should the pipeline fix the cause of P1's known shortfall, or inherit it?** On the old path P1 fails on 3 x 3 seeds 12, 15, 17, 18, 19 and 6 x 4 seeds 5, 7, 11, 12, 15, 16, 18, which he accepted with the 063 B merge. D1 moves the greedy allocator unchanged, so the pipeline will most likely fail on the same cities. R-2 forbids pinning them, so D1 reports them and requires P1 only on the named cities.
   - Recommendation: inherit it in D1, so that D1 stays a move whose numbers can be checked against the old path. Then decide from D1's report. If he wants P1 on every seed, it is a follow-on section in Edge after D1 (a first tile for every block, the approach 063 B2 described). Edge is where the order fault is, and a fix in Land or Mass would change where parks go. Until he answers, a block left short is recorded in the edge layer and the stage does not throw, as on the old path.
