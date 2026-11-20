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
- **C2 stopped on its stop rule; B2 added and C2 re-cut** (19 Nov 2026). Asked "Do you approve all four rulings as recommended ("Yes, all four"), or do you want to keep 0.15 instead?", with the four rulings of `docs/070-c2-options.md`, Josh answered: "Yes, all four". So `PARK_PER_HOME` is 0.075 on the pipeline, yard courts are allowed, Land lanes leave court parts at least 8 long (B2), and a driveless court part gets a walk-through beside a lane (C2).
- **D1 re-cut on the pre-check** (20 Nov 2026). Asked "Shall I go with the design agent's recommendation (Yes), or send it back to look for more margin first?", Josh answered: "yes". So D1 gives every block its first kerb tile before the greedy pass (option B of `docs/design/070-D1-precheck.md`), and Q6 is answered "fix, in D1". `CityEdgeLayer` is typed.
- **Stage 1 re-cut as the split plan; A4 added** (20 Nov 2026), from `docs/design/070-streets-t-junctions.md`. Asked "Which street plan do you want for stage 1?", Josh answered: "C, split plan". Asked "Do you approve 2 to 5 as recommended ("Yes, all four"), or do you want to take them one at a time?", he answered: "Yes, all four". So the pipeline's cities may stop matching `city=tiles`; `blocks=3x3` is the city's size, not a block count; nothing a car enters faces a T (S6); and the streets go first: A4, then a pre-check of Land, Mass and Edge on the new plans, then their re-cut, then D2 and E. The rules this changes are marked "(20 Nov 2026)" where they stand.
- **A4b added: one-way streets** (20 Nov 2026), from `docs/design/070-streets-one-way.md`. After seeing A4's pictures Josh said: "I think it looks great. Create an opus session to add 1 way streets." His answers to the note are quoted in section A4b. A4b runs after A4's review and before the A4 pre-check, on its own branch cut from A4's (Josh's Q4: "do what you recommend"), and joins A4's held merge.
- **The A4 pre-check did not hold; Land, Mass and Edge re-cut on Josh's four answers; A4c added** (20 Nov 2026), from `docs/design/070-A4-precheck.md`. Asked its four questions word for word, Josh answered: "1. yes, 2. yes, 3. yes, 4. Lower P1's floor. Is P1's floor the parking ratio?" Told that P1's floor is the kerb-parking ratio only (kerb bays laid over shops x `PARK_PER_SHOP`, at least 0.75 city-wide, plus a tile for every block), not the lot ratio `PARK_PER_HOME` (P2), that 0.69 is just enough for 3 x 3 seed 2 with one-way off, and that with one-way on three cities still fail for other reasons, and asked "Do you still want P1's floor lowered from 0.75 to 0.69, knowing it's kerb parking only (yes), or would you rather have the street cuts redesigned instead?", he answered: "yes lower it". So: P3's cap counts over the whole block side (D1b); Land makes a whole park only of a served block (B3); stage 1 redraws a split that leaves Land too few park places (new section A4c); and P1's floor is 0.69 on the pipeline (D1b; `city=tiles` keeps 0.75 until L). Q14 records it. The order is now A4c, then the pre-check re-run, then B3, C3, D1b.
- **A4c stopped on its criterion 4; S5's T floor decided at 0.30** (20 Nov 2026), from `docs/design/070-A4c-stop.md`. Told that S5 (the provisional `T_SHARE_MIN` 0.5) rejects 53 of 65 draws on 3 x 3 seed 10 with one-way on, Josh answered: "have the junctions do not need to be Ts. It should be the T's should have a floor of 0.30%". Asked whether that means 30%, he confirmed: "Yes 30%". So `T_SHARE_MIN` is 0.30, Decided (A4, A4c criterion 8); the note's question 1 (129 draws) and question 2 are withdrawn, not needed. Q15 records it; Q16 (3 x 3 seed 12, one-way off) is open.
- **The named cities move to 6 x 6; A4d and A2b added; D1b gains M and PB** (20 Nov 2026), from `docs/design/070-A4-precheck-2.md` and `docs/design/070-6x6-precheck.md`. To the re-run's question 1 (lever K), Josh answered: "No, we need to stop basing these tests on a 3x3. Start basing them on 6x6 or greater." To question 2 (lever M): "yes". To 3 x 3 seed 12 (Q16): "3x3 seeds are too small. They're going to result in regular failures because they cannot accommodate for all of changes I suggested. Yes". Asked which cities the named list should be: "6x6"; whether the default city should become 6 x 6 seed 1: "yes". To the 6 x 6 pre-check's two questions (PB, and a split limit of 128): "yes, yes". So: the named cities are 6 x 6 seeds 1 to 10, one-way off and on (the orchestrator's reading of "6x6", recorded as such); 3 x 3 and 6 x 4 are outside cities, reported, never required or pinned; the pipeline's default city is 6 x 6 seed 1; stage 1's split has its own limit, `SPLIT_DRAWS_MAX` 128 (the outline's `BLOCK_DRAWS_MAX` stays 64). Section A4d (planner) re-takes stages 1 to 3 on the new list, A2b (renderer) moves the plan view's default, and D1b gains lever M and PB. Q17 and Q18 record it.
- Questions: Q2, Q3, Q5, Q6, Q8 to Q18 answered; Q7 settled by the rulings; Q1 not yet asked for, L waits for his word; Q4 open.
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

The spec is `docs/city-grammar.md` (rules 1 to 12, checks M1 to M9, Josh's rulings Q1 to Q7). No section edits it, except L for the lines it lists. Where it and this ticket disagree, the grammar wins and the architect re-cuts.

**Exception:** Josh's 19 Nov 2026 rulings recorded in this ticket (the four C2 rulings, "Yes, all four": B2 and C2) take precedence over the grammar text they change, until L rewrites that text.

## Why
- One function, `tileCity` (`src/render3d/tilecity.ts`, lines 730 to 1975 of 2008), decides streets, block sizes, parking, alleys, parks and courts together. One `renderer` agent owns all of `src/render3d/` (about 48,000 lines).
- Later features patch earlier ones: gated passages, overshoots, the apron strip.
- No step decides the built mass (which cell is built and which is open) before buildings are placed. So blank walls and slivers are found afterwards, by checks.

## Goal
- The tile city is made by eight pure stages and one drawing stage, on the grammar's 5 m lattice.
- Each stage reads the layers before it and writes only its own.
- Each stage has its own owner, its own checks, its own digest, and a flat picture Josh can open on his phone (`?city=plan&stage=<name>`).
- It is proven at today's scale: the default 3 x 3 city and the 6 x 4 cities the checks already use. **(20 Nov 2026, Q17)** From A4d, at 6 x 6 (`CITY_BLOCKS_MAX`), the named cities below (Josh: "Start basing them on 6x6 or greater").
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
  - **(20 Nov 2026, Q17)** "The named cities" means every named run: each named city with one-way off (`oneWayShare` 0) and on (the default), 20 runs. An outside city (3 x 3, 6 x 4) that fails is reported as an honest failure; no test asserts it either way, and nothing is tuned for it.
- **R-3. Sub-seeds.**
  - Each stage's randomness comes only from its own `rand(...key)`, which is `stableHash("<stage>:<seed>:<key>")`.
  - **Exception, for stage 1 only:** `streets` keeps today's `hashOf` keys (`"tile:<seed>:<key>"`), so the default city stays exactly as it is.
  - **(20 Nov 2026, A4)** The exception's second half ends for the pipeline's layout: the split plan is a new city. It still holds for the old lattice functions `city=tiles` uses (R-9). Stage 1's `rand` is still `"tile:<seed>:<key>"`, and the outline still comes from today's `blockSizes` keys.
  - No stage keeps hidden state between calls. No stage uses `Math.random` or the clock.
- **R-4. Digests.** Each layer's digest is FNV-1a over its canonical JSON: keys sorted, numbers rounded to 1e-6. The plan keeps one digest per stage.
  - Each plan section pins its layer's digest on the default city, 3 x 3 seeds 2 and 3, and 6 x 4 seed 1.
  - **(20 Nov 2026, Q17, Q18)** From A4d (stages 1 to 3) and D1b (stage 4) on, the four pin cities are **6 x 6 seed 1 (the default), 6 x 6 seeds 2, 3 and 8**, each with one-way on (the default). Seed 2 is the one that needs `SPLIT_DRAWS_MAX` (draw 82); seeds 3 and 8 are PB's cases with one-way on, and 8 has the thinnest P1 margin (0.729 in the pre-check). No 3 x 3 or 6 x 4 city is pinned.
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
  - **(20 Nov 2026, Q17)** 6 x 6 seed 1 is now the default named city, so from A4d it must end `ok` (R-2); the R-7 test may stay as it is or be folded into the named loop, the builder's choice.
  - **(20 Nov 2026, A4)** On the split plan "3 x 3", "6 x 4" and "6 x 6" are city sizes (the ground of that many of today's blocks), not block counts (Josh, Q10). No test asserts a block count from them.
- **R-8. The ladder holds.** `packpin.test.ts` and `townpin.test.ts` pass untouched. `town.ts`, `terrace.ts` and the protocol maps are not edited. `npm run playtest` shows no ladder change.
- **R-9. The old tile city keeps serving `city=tiles`** until section L. Only A2 and L edit `tilecity.ts`, and only as they say. No new feature goes on the old path.
- **R-10. Test load (Josh's PC).** The builder runs only its folder's tests (`npx vitest run --maxWorkers=2 src/city/<folder>/`, plus the named render3d tests for renderer sections) and one `npx tsc --noEmit`.
  - Each city is built once per test file, through a module-level cache.
  - Heavy files are marked in their section and get a timeout of at least 120 s.
  - CI-safe: typed-in fixtures; GLB reads only inside `it.skipIf`, lazily; no Windows paths; no timer under 1 s.
- **R-11. The main session's gate**, as for every ticket: `npm run gate` green with more tests; the playtest; the diff only in the section's Files; `git ls-files assets/private` empty.

**The named cities** are the default (3 x 3, seed 1), 3 x 3 seeds 1 to 10, and 6 x 4 seeds 1 to 3, as the guide's checks use today.

**The named cities, from 20 Nov 2026 (Q17; replaces the list above for every section from A4d on).**
- **Named:** 6 x 6 seeds 1 to 10, each run with one-way off (`oneWayShare` 0) and on (the default): 20 named runs. The default city is 6 x 6 seed 1. Josh: "6x6" (the orchestrator's reading of the seed range, 1 to 10, recorded as such) and, to the default, "yes".
- **Outside:** 3 x 3 seeds 1 to 20 and 6 x 4 seeds 1 to 20, off and on. Reported, not required, never pinned (Josh: "3x3 seeds are too small. They're going to result in regular failures because they cannot accommodate for all of changes I suggested. Yes").
- **The pin cities** (R-4): 6 x 6 seeds 1, 2, 3 and 8, one-way on.
- **Where the default lives in code.** The pipeline's default city is `planViewRequested`'s (`src/render3d/planview.ts`), the only reader of a default for `city=plan`; it reads `CITY_BLOCKS_DEFAULT` (3) today, which `city=tiles` (`tileslots.ts`, `clampBlocks`, `tilecity.ts`) shares. So A4d (planner) adds a new `PLAN_BLOCKS_DEFAULT` (6) in `src/city/streets/constants.ts`, and A2b (renderer) makes `planview.ts` read it. `CITY_BLOCKS_DEFAULT` stays 3, so `city=tiles` keeps its 3 x 3 default (R-9). The default seed stays 1.
- **Sections merged before this** (A1 to C3) were judged on the old list; their text is left as history. A4d re-takes stages 1 to 3 on the new list; D1b, D2, E and later sections use the new list wherever they say "the named cities".
- **The old path's lists stay.** `src/city/streets/equal.test.ts` (A1 criterion 6, kept by A4 criterion 1) compares the old lattice functions to `tileCity` on the old 16 cities, for `city=tiles`; it is not a named-city test of the pipeline and does not move. The guide's own named list (`styleguide.test.ts`, the render3d checks) belongs to `city=tiles` until L.

## Every check has one stage
A check runs in the stage whose layer it judges. It may read earlier layers. Three grammar checks span stages, so they are split into clauses: M4 into a/b/c, M9 into a/b, and G4 runs where its last input is.

| Check | What it holds | Stage | Section |
| --- | --- | --- | --- |
| street width (grammar 10) | every carriageway 15 m, no avenue. From A4b, per section: 15 m two-way; 10 m or 5 m one-way (Josh, 20 Nov 2026: "a maximum of 2 tiles wide"); no other shape | 1 streets | A1, A4b |
| V1, V2 | block sizes vary; not square. V1 reworded (20 Nov 2026): over all blocks, the variation of their widths, and of their depths | 1 streets | A1, A4 |
| S1 to S5 (20 Nov 2026, Proposed; S3's gap provisional; S5's share 0.30, Decided, Josh, 20 Nov 2026: Q15) | every street ends on a street; a T is a crossroads with one arm missing; junction spacing; every block a 6-to-16 rectangle with four street sides; Ts are common | 1 streets | A4 |
| S7, S8 (Proposed); S9, S10 (Josh, 20 Nov 2026) | every junction reaches every other; the four edge streets two-way; between two one-way streets that run the same way a two-way street or one the other way; a bare one-way street leaves every block along it a parking band of its own | 1 streets | A4b |
| S6 (Josh, 20 Nov 2026: "Yes, all four") | nothing a car enters faces a junction: no lane mouth, court drive or frontage lot on a junction-facing stretch | 2 land (lanes), 3 mass (drives, frontage lots; M5) | B3, C3 |
| S11 (Josh, 20 Nov 2026, the A4 pre-check's Q3: "yes") | the split leaves Land its park places: at least `ceil(blocks / PARK_ONE_IN_BLOCKS)` of them | 1 streets | A4c |
| served park (Josh, 20 Nov 2026, the A4 pre-check's Q2: "yes") | a whole park only on a block with a parking band across one of its streets | 2 land | B3 |
| V3, V4 | alleys and parks at their rates | 2 land | B |
| M4a | no part has a short side of 3 to 5 cells; no lane leaves a court part with a long side under 8 | 2 land | B, B2 |
| M3 face rule | 0, 1 or 2 adjacent open sides; the column kind matches | 3 mass | C1 |
| M4b | every outer column of a court part, and every strip column, has a partner or a recorded opening behind it | 3 mass | C1 |
| M5 openings | whole cells, recorded, from rule 6's table; no row stretch of 1 cell; every interior touches an opening; no passage exists (the plan has no passage type) | 3 mass | C1, made strict in C2 (no lane exemption) |
| G2 | every block side's back edge is built or a recorded opening | 3 mass | C1 |
| G3 | no void: every block cell has a use | 3 mass | C1 |
| R1 | continuous frontage share (`TILE_CITY_R1_MIN`), from cells | 3 mass | C1 |
| P2 | lot stalls within the band of homes; lots per block | 3 mass | C2 |
| P1, P3, P4, P5, P6 | kerb bays: serving, share, runs, band and tree pitch, density. From D1b, on the pipeline only: P1's supply floor `PARK_SUPPLY_BAND.lo` is 0.69 (Josh, 20 Nov 2026: "yes lower it"), and P3's cap is the block side's, shared by its stretches; the first pass is a best fit over the city (M), and a whole park nothing across can serve takes one tile on its own kerb (PB; Josh, 20 Nov 2026: "yes", "yes, yes") | 4 edge | D1, D1b |
| kerb line (grammar 10, 063 F's criteria 33 and 37a and the two additions; from D2's re-cut, 20 Nov 2026, S2's far side and the one-way sections) | one unbroken line a block side, from block corner to block corner; returns at vehicle openings ending on the corner column's wall plane; straight past plaza, park edge, walk-through; straight past the far side of a T, dropped at its two crossings; straight on a bare one-way street, with no build-out | 4 edge | D2 |
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

No threshold in this table changes, apart from P1's floor on the pipeline (Josh's ruling; the second exception below). A ported check keeps its numbers. Its old copy in `src/render3d/` stays for the old path until L, and the two must agree on the named cities while both exist. **(20 Nov 2026, A4)** Once A4 is in, "agree" means the same thresholds and constants on both paths: the cities themselves differ until L (Josh, Q9), and no test compares a pipeline city to a `city=tiles` city past stage 1's old functions. **One exception, P2 only:** the pipeline's `PARK_PER_HOME` is 0.075 and the old path keeps 0.15 until L (Josh's ruling 1, 19 Nov 2026: "Yes, all four"), so P2's wanted and floor differ between the two paths and are not compared. P2's band, its lots-per-block cap and its short-block count are the same on both. **A second exception, P1's floor only (20 Nov 2026):** the pipeline's edge `PARK_SUPPLY_BAND.lo` is 0.69 and the old path keeps 0.75 until L (Josh, on the A4 pre-check's Q4: "Lower P1's floor", then "yes lower it"; Q14). It follows C2's precedent: changed on the pipeline only (D1b, in `src/city/edge/constants.ts`); `tilecity.ts`, `parkmetrics.ts` and their tests are not edited. `PARK_SUPPLY_BAND.hi` (1.5) is unchanged, and mass's own `PARK_SUPPLY_BAND` (P2's lot band, 0.75 to 1.5) is unchanged: Josh's ruling is the kerb ratio only. No other threshold in the table moves. **Not a threshold (20 Nov 2026, Q18):** stage 1's split tries up to `SPLIT_DRAWS_MAX` (128) draws (A4d); the outline's `BLOCK_DRAWS_MAX` (64), `blockSizes` and `tilecity.ts` keep 64.

## Sections
Each is one builder session at most. They run in this order:
- A1 → A2 → A3
- B → B2 → C1 → C2 → D1 (all merged) → **A4 → A4b → the A4 pre-check → A4c → the pre-check re-run → B3 → C3 → the 6 x 6 pre-check → A4d → D1b (A2b alongside) → D2 → E** (20 Nov 2026, Josh's Q12: "Yes, all four"; A4c and the re-run from his answers to the pre-check, Q14; A4d, A2b and D1b's M and PB from Q17 and Q18). B2 was added after C1 merged and ran before C2 resumed; C1 did not re-open.
  - **A4d** (planner, new, Q17 and Q18) re-takes stages 1 to 3 on the 6 x 6 named cities: their named-city tests and digest pins, stage 1's split limit 128, and the plan's default size as a constant. It runs before D1b, on its own branch cut from `ticket/070a4-split-plan`, and is merged back before D1b branches. One planner section covers streets, land and mass: the planner owns all three folders (Agents), so "each agent stays in its folder" holds, as B2 did when it re-took mass's pins. Land's and mass's code do not change in it, only their tests.
  - **A2b** (renderer, new, Q17) makes the plan view's default city 6 x 6 seed 1. It needs A4d's constant, so it branches from `ticket/070a4-split-plan` after A4d is merged, and may run alongside D1b (no shared file).
  - **A4** rebuilds stage 1 as the split plan, and Josh judges it on the flat picture.
  - **A4b** adds one-way streets to stage 1 (Josh, 20 Nov 2026: "Create an opus session to add 1 way streets"), on its own branch cut from A4's, and is merged back into A4's branch before the pre-check.
  - **The A4 pre-check** (`pipeline-designer`, "pre-check 070 A4", on A4's branch once A4b is merged into it) runs Land, Mass and Edge as merged on A4b's plans and reports before any of them is re-cut. Its probe stands in side-list lookups for the grid lookups below (outside the repo, as its instructions say). It measures V3, V4, M4a, C1's and C2's checks, P2, and P1 to P6, on the 13 named cities, with S6 off and on; and S3's gap and S5's share as A4b laid them.
    - **One-way off and on** (`docs/design/070-streets-one-way.md`, section 5). Every measure is taken twice: one-way streets off (`ONE_WAY_SHARE` 0, through A4b's `oneWayShare` option, criterion 3; the plans are then A4's) and on (A4b's default). For P1 it reports, per named city and both ways, the kerb supply and demand, and the cities and blocks P1 fails on. It lists the one-way streets with their sections and directions, and S10's refusals. `ONE_WAY_SHARE` and `ONE_WAY_BARE_SHARE` are reported as A4b laid them, PROVISIONAL, for Josh's eye.
    - **Result (20 Nov 2026, `docs/design/070-A4-precheck.md`): does not hold.** Mass holds with side-list lookups; Land fails V4 on 3 named cities (one-way on); Edge fails P1 on 6 of 13 (off) and 7 of 13 (on) with D1b as first cut. Josh's four answers (Q14): P3's cap per block side, the served park, a stage 1 redraw for park places, and P1's floor 0.69. They land in A4c, B3, C3 and D1b below.
  - **A4c** (new, Q14's answer 3) makes stage 1 redraw a split that leaves Land too few park places. It runs first, on its own branch cut from A4's, and is merged back into A4's branch before the re-run.
  - **The pre-check re-run** (`pipeline-designer`, "re-run pre-check 070 A4", on `ticket/070a4-split-plan` once A4c is merged into it) measures once more, as the first run did and with the same probe, with all four answers in: P3's cap per block side, the served park, A4c's S11 (as built), and P1's floor at 0.69. One-way off and on. **It decides whether one-way stays on as built** (the note's section 6, Q4 B): if a named city still fails with one-way on and not with it off, the question whether one-way stays on, as built or otherwise, goes to Josh through the main session before B3 starts. If every named city holds both ways, B3, C3 and D1b start as cut. If a named city fails both ways, the re-run reports it, and the main session takes it to Josh (R-2); nothing is tuned.
  - **The re-cut** comes after the re-run, one section per owner, each in its own folder, in the order B3, C3, D1b, each branched from `ticket/070a4-split-plan` once the one before is merged into it. Each is a section below (B3, C3, D1b), written from the pre-check's section 4 and Josh's answers; the re-run may add to them, not take from them.
    - Each of the three ends with a test that no file of its folder reads `bi`, `bj` or a street's `line` (grep, Vitest).
  - **D2** (re-cut 20 Nov 2026 against de522a8, on Josh's "Start D2"; see D2) gains one clause: on the far side of a T the kerb line runs straight past and dips at the two crossings (`Sidewalk_Dip_01`); "from junction to junction" becomes "from block corner to block corner"; from A4b, a junction is carriageway by carriageway, not 3 by 3. **E** reads cells, and from A4b also stage 1's `arrows` (E's criterion 5). Both wait for the re-cut.
  - **Merging.** A4 changes stage 1 for every later stage, so Land's, Mass's and Edge's tests (their digest pins and their named-city checks) are expected to fail on A4's branch until their re-cut lands. A4 is therefore held on its branch, like D2 was. A4's own gate before its review is `npx tsc --noEmit` plus `npx vitest run --maxWorkers=2 src/city/streets/ src/city/pipeline/ src/render3d/planview.test.ts` (Josh's Q13, 20 Nov 2026: "yes").
    - **A4b and A4c are held under the same terms** (Q13's "yes"; for A4b also Josh's Q4 on the one-way note, "do what you recommend"; for A4c his answer 3 to the pre-check, "yes", Q14). Each one's own gate before its review is A4's small gate above. Once its review settles it is merged into `ticket/070a4-split-plan` (a merge between held branches; nothing reaches `goal/city-style`).
    - **B3, C3 and D1b** are branched from `ticket/070a4-split-plan` in turn, each after the one before is merged into it (B3 after the re-run; C3 after B3; D1b after C3, and from 20 Nov 2026 after A4d). Each one's own gate before its review is `npx tsc --noEmit` plus its own folder's tests and the folders before it (B3: `src/city/streets/ src/city/land/`; C3: those plus `src/city/mass/`; D1b: those plus `src/city/edge/`).
    - **A4d and A2b (20 Nov 2026)** are held under the same terms. A4d's own gate before its review is `npx tsc --noEmit` plus `npx vitest run --maxWorkers=2 src/city/streets/ src/city/pipeline/ src/city/land/ src/city/mass/` (Edge's tests are expected to fail until D1b). A2b's is `npx tsc --noEmit` plus `npx vitest run --maxWorkers=2 src/render3d/planview.test.ts`. Each is merged into `ticket/070a4-split-plan` once its review settles; D1b then branches after A4d (A2b may still be in flight).
    - **All eight merge together** into `goal/city-style`, in the order A4, A4b, A4c, B3, C3, A4d, A2b, D1b, once the full `npm run gate` is green on `ticket/070a4-split-plan` with all eight in (Q13: "yes"). None of them reaches `goal/city-style` on its own.
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

### A4 · Stage 1, the split plan: Ts, streets with ends, blocks that differ side by side (planner, pure). Branch `ticket/070a4-split-plan`
**Goal.** Josh opens `?view=3d&city=plan&stage=streets` (also `&blocks=6x4&seed=3`) on his phone and sees a city whose streets end in Ts and whose blocks differ in width and depth side by side, on the same ground as today's city of that size. `city=tiles` is exactly as before. Josh's words (20 Nov 2026, in chat): "Right now the whole design is at the mercy of the first rectangle"; asked which plan, "C, split plan"; asked about questions 2 to 5, "Yes, all four". The design is `docs/design/070-streets-t-junctions.md` (option C, sections 2, 3 and 5).

**Provisional numbers.** S3's `JUNCTION_GAP_MIN_CELLS` (7 cells, 35 m) is not decided: it waits for the pre-check and Josh's eye on the picture. It is a typed-in constant in `src/city/streets/constants.ts`, commented PROVISIONAL with the note's name. Every test reads it by name. The only test that uses its value as a number is the builder's own fixture (criterion 6). No test pins it, and no other section may treat it as settled.

**Decided number (20 Nov 2026).** S5's `T_SHARE_MIN` is **0.30**, Josh's ruling, no longer provisional (it was half, as cut). Told that S5 rejected 53 of 65 draws on 3 x 3 seed 10 with one-way on, he answered: "have the junctions do not need to be Ts. It should be the T's should have a floor of 0.30%", and asked whether that is 30%, "Yes 30%" (Q15; `docs/design/070-A4c-stop.md`, section 0). Its comment in `constants.ts` says Decided with his words. Tests still read it by name, and a test may now pin its value (`T_SHARE_MIN` equals 0.30). Other sections may treat it as settled. A4c criterion 8 makes the change.

0. [ ] **First, on this branch, by the lead-architect (before the builder starts):** `CityStreetsLayerA4` in `src/core/cityplan.ts` becomes `CityStreetsLayer` (the old one is deleted): `streets` are `CityPlanStreet`, `blocks` are `CityPlanBlock`, `junctions` is added, and `sizes` becomes `outline` (`CityOutline`). `CityStreet` and `CityBlock` keep their fields, so `tilecity.ts`, `land/`, `edge/` and mass's own code still type-check; only `src/city/streets/` (`stage.ts`, `stage.test.ts`, `check.test.ts`) and two mass test fixtures (`src/city/mass/fixtures.test.ts` and `lots.test.ts`, whose `streetsOf` helper builds blocks from `CityBlock[]`) stop type-checking until the builder adapts them. The mass fix is type-only: `streetsOf` compiles against the new `CityStreetsLayer`, with no behaviour or assertion change (C3 still owns mass's re-cut). It is written on the branch, not on `goal/city-style` before, for that reason (as C2's criterion 0 was).
1. [ ] **The old lattice is kept, unchanged (R-9).** `layoutAxis`, `blockLens`, `cvOf`, `blockSizesWork`, `blockSizesVary`, `blockSizes`, `BLOCK_FALLBACK_*`, `blockType`, `clampBlocks`, `streetBandAt`, `mkStreet`, `hashOf`, `layStreets` and `StreetsLayout` stay exported from `src/city/streets/` with their bodies and types unchanged (the reviewer reads `layout.ts`'s diff: no line of them changes). `tilecity.ts` is not edited. A1's criterion 6 keeps running on them: `equal.test.ts` compares `layStreets(seed, blocksX, blocksZ)` (not `runCity`) to `tileCity(opts)` on the same 16 cities with the same three deep-equals (Vitest, heavy, 120 s).
2. [ ] **The outline** (Vitest). The new layout (`split.ts`, the stage's own file) starts from `blockSizes(seed, blocksX, blocksZ)` and `layoutAxis` for its four edge streets: on the named cities its `w`, `h` and its four edge streets' `across0`, `bands` and `profile` equal `layStreets`'s outer lines, and `outline` is the land inside them, with `outline.draw` the draw `blockSizes` returned. So a `3x3` city covers today's ground (Josh, Q10).
3. [ ] **The split** (Vitest). The outline is cut in two by a street, by `rand` (the stage's own; keys of its own beginning `"split"`, plus a draw number), and each piece again, across or along, until every piece is a block.
   - A cut is a street of rule 10's section: profile "street", 5 cells, its parking side by `rand`. It ends on the two streets that bound its piece.
   - A piece is cut where a side is 17 cells or more (6, street, and at least 6). A piece with both sides 6 to 16 is a block. It always finishes.
   - Collinear cuts that meet across a street at a crossroads are one street (so a crossroads has two passing streets, as today).
   - A draw that misses S3, S4, S5, V1 or V2 is repeated with the next, up to `BLOCK_DRAWS_MAX` draws after it. If every draw misses, the stage throws `CityStageError` naming the rule (R-2). There is no fallback list. On the named cities every run is `ok`; if one is not, the builder stops and reports (R-2).
4. [ ] **S1. Every street ends on a street** (Vitest, on the named cities). Each `CityPlanStreet.ends` names two junctions that exist and list that street with `passes` false; each junction's `streets` and `arms` agree with its `kind` (corner 2 ending; T 1 passing, 1 ending, 3 arms; crossroads 2 passing, 4 arms). Failing fixture: a street whose end touches no street fails S1 with the street named.
5. [ ] **S2. A T is a crossroads with one arm missing** (Vitest, on the named cities). At every T: the junction is 3 by 3 cells of role `junction`; 9 `crossing` cells, 3 across the ending street and 3 across the through street on each side of it; 2 `pavementCorner` cells, on the ending street's side; and on the far side the through street's pavement is 5 `pavement` cells opposite the ending street. No `parkingPlain` cell is in a junction or a crossing. Street cells keep today's roles and fields (`CityStreetCell` is unchanged).
6. [ ] **S3. Junction spacing** (Vitest). Two streets that end on the same street from opposite sides either line up (one crossroads) or have centre lines at least `JUNCTION_GAP_MIN_CELLS` apart. Holds on the named cities. The builder's fixture: two such ends `JUNCTION_GAP_MIN_CELLS - 1` apart fail S3 with both streets named, and `JUNCTION_GAP_MIN_CELLS` apart pass.
7. [ ] **S4. Blocks** (Vitest, on the named cities). Every block is a rectangle with a street on all four sides, each side 6 to 16 cells (`BLOCK_TILES`, unchanged). `blockSizesWork`'s two tests hold counted over blocks: every block's longer side is at least its `longEnough` (7 cells), and the mean block width and the mean block depth are each at least `BLOCK_MEAN_MIN_CELLS`. Every lattice cell is a street cell or in exactly one block. `bi`, `bj` and ids are as `cityplan.ts` says (ranks of `i0` and `j0`; "block:<bi>:<bj>", unique).
8. [ ] **S5. Ts are common** (Vitest). Of the junctions with `inner` true (none of its streets an edge street: the architect's reading of the note's "inside the city"), at least `T_SHARE_MIN` are Ts. Holds on the named cities. The builder's fixture: today's lattice (`layStreets` on the default city, its junctions listed) fails S5.
9. [ ] **What later stages read** (Vitest, on the named cities).
   - Every block has its four `sides`, each naming the street along it.
   - On every side not facing out of the city, its `across` spans and its `junctions` spans are disjoint and together cover the side's `span` exactly. A side on an edge street that faces out has both empty.
   - `across` is symmetric: when A lists B across its side with span s, B lists A across its opposite side with the same s.
   - A side's `junctions` entry names a T whose ending street is opposite it, and its span is that street's 5 cells.
   - Each street's `span` runs from its low end's junction square to its high end's; `outer` is set on exactly the four edge streets.
10. [ ] **V1 reworded, V2 unchanged** (Vitest). V1's variation is over all blocks: the variation of their widths, and of their depths (no longer one per column and row), threshold unchanged. On a lattice the two readings give the same number: a test checks this on `layStreets`'s default city. The uniform 10 x 10 fixture still fails V1 and V2. Street width holds on every street.
11. [ ] **Picture** (R-5). The legend is unchanged (lane, parking band, junction, crossing, pavement, pavement corner, block). The picture test no longer assumes a block count.
12. [ ] **R-4, R-7.** Stage 1's four digest pins are re-taken once, and the test names them as moved by A4 (the split plan). The 6 x 6 run ends `ok` or with a stage failure, with no block count asserted.
13. [ ] **The report.** For each of the 13 named cities the builder reports: the draw used, blocks, junctions by kind (corner, T, crossroads; inner and edge), the inner T share, the smallest gap between two opposite ends that do not line up, and the shortest and longest block side.
14. [ ] (Main session, phone-sized screenshots) `?view=3d&city=plan&stage=streets` and `&blocks=6x4&seed=3`: streets end in Ts, blocks beside each other differ, nothing near-misses. Josh judges S3's gap and S5's share by eye (S5's share since decided at 0.30: Q15). `?view=3d&city=tiles` looks as on `goal/city-style`.
15. [ ] R-1 to R-7 for `streets`. Tests run: `npx vitest run --maxWorkers=2 src/city/streets/ src/city/pipeline/` and one `npx tsc --noEmit`. Land's, Mass's and Edge's tests are not run and are expected to fail on this branch (see Merging, above).

- **Files:** `src/city/streets/` (new `split.ts` and its tests; `stage.ts`, `check.ts`, `constants.ts` and their tests; `layout.ts` only to add nothing or re-export, its old functions untouched). `src/core/cityplan.ts` (criterion 0 only, by the lead-architect, not the builder). `src/city/mass/fixtures.test.ts` and `src/city/mass/lots.test.ts`, for a type-only fix of their `streetsOf` helper (criterion 0); no other line of mass changes.
- **Must not:** `src/city/land/`, the rest of `src/city/mass/`, `src/city/edge/` (they are measured, then re-cut: S6 is theirs, not A4's), `src/city/stages.ts`, `src/city/pipeline/`, `src/render3d/` (read only; the viewer draws the new picture unchanged).
- **Interfaces:** `CitySpan`, `CityJunctionKind`, `CityStreetEnd`, `CityPlanStreet`, `CityJunction`, `CityBlockAcross`, `CityJunctionFacing`, `CityBlockSide`, `CityPlanBlock`, `CityOutline` and `CityStreetsLayerA4` are in `src/core/cityplan.ts` (written 20 Nov 2026, before A4; wired by criterion 0). No new dependency.
- **Heavy:** `equal.test.ts` as before (16 `tileCity` builds, 120 s). The named-city loop of criteria 4 to 9 in one file, one city build each through a module cache.

### A4b · Stage 1, one-way streets on the split plan (planner, pure). Branch `ticket/070a4b-one-way`
**Branch.** Cut from `ticket/070a4-split-plan` at the commit that adds this section, not built on A4's branch directly. That way the review reads A4b's diff on its own, and A4's reviewed head stays as it is. Once A4b's review settles, the main session merges it into `ticket/070a4-split-plan` (see Merging). The design note's section 5 asks for "A4b, on A4's branch, after A4's review settles and before the A4 pre-check"; this is how that is done.

**Goal.** Josh opens `?view=3d&city=plan&stage=streets` (also `&blocks=6x4&seed=3`) on his phone and sees some inner streets narrower and one-way, with their direction marked, on the same split plan as A4. Every junction can still be reached from every other. The design is `docs/design/070-streets-one-way.md`.

**Josh's words (20 Nov 2026, in chat).**
- After A4's pictures: "I think it looks great. Create an opus session to add 1 way streets."
- To the note's five questions: "1 - a single lane, parking on 1 side maximum - sometimes none. this isn't a hard rule. It's half the width of a normal road / 2 - it is the street designers discretion / 3 - there should always be a two way or one way street in the opposite direction between two one ways that share the same direction / 4 - do what you recommend / 5 - the kit has them, use them."
- On the width: "I'm sorry, it should be a maximum of 2 tiles wide. 1 for parking (discretionary), 1 for the road."
- Asked whether the 2 tiles are the road only, with the pavement still on each side (4 tiles with parking, 3 without): "correct".
- Asked whether a one-way street may drop its parking only where every block along it keeps another parking side (the guard, recommended): "yes, the recommended".

**Decided by those words:** the two one-way sections (criterion 1), which streets are one-way being the stage's choice (criterion 2), S9 (criterion 6), S10 (criterion 7), this section's place in the order (Q4) and the kit's arrows (criterion 10). **Proposed, not covered by his words:** S7, S8 and the lattice working (criteria 4, 5, 8, 9). The reviewer may question those; nobody may question the Decided ones. **This changes his ruling of 19 Nov 2026 ("Yes, no avenues": every carriageway 15 m) for one-way streets only.** A two-way street stays exactly as grammar rule 10 has it.

**Provisional numbers.** `ONE_WAY_SHARE` (0.4 of the candidates), `ONE_WAY_BARE_SHARE` (1 in 3 of the one-way streets) and `ONE_WAY_ARROW_EVERY` (6 cells, 30 m) are typed-in constants in `src/city/streets/constants.ts`, each commented PROVISIONAL with the note's name, as A4's S3 gap is (S5's share was, until Josh decided it at 0.30: Q15). Every test reads them by name; no test pins their values; no other section treats them as settled. Josh judges them on the flat picture.

0. [ ] **First, on this branch, by the lead-architect (before the builder starts):** the standalone A4b types in `src/core/cityplan.ts` are folded in. `CityPlanStreet` gains `CityStreetTraffic` (`section`, `flow`); `CityStreetsLayer` gains `arrows: CityStreetArrow[]`; `CityPlanStreetA4b` and `CityStreetsLayerA4b` are deleted. Tried on A4's head: only `src/city/streets/split.ts` (this section's own file) stops type-checking until the builder fills the fields. No other consumer builds a street or the layer, so no other folder changes.
1. [ ] **The sections** (Vitest, on the named cities). Every street's `section` is one of the three in `CityStreetSection`, and its `bands` match it cell for cell:
   - two-way: pavement, parking, lane, lane, pavement, in either order (5 cells);
   - one-way: pavement, parking, lane, pavement, with the parking on either side (4 cells);
   - bare one-way: pavement, lane, pavement (3 cells).

   `flow` is "both" exactly on two-way streets. `profile` stays "street" on every street, so every profile-keyed constant is unchanged. The street-width check reads the carriageway from the section: 15 m (`CARRIAGE_M`, unchanged), or 10 m and 5 m (new `ONE_WAY_CARRIAGE_M = { parking: 10, bare: 5 }`). It still fails an avenue and any other shape. Fixtures: a one-way street with two lane cells fails; one with parking on both sides fails; a street with no pavement on one side fails; each names the street.
2. [ ] **Which streets are one-way: the stage's choice (Josh: "it is the street designers discretion").** The starting choice, which the builder may change and must report:
   - a candidate is a cut that is inner and does not run edge to edge, known when the cut is made (its width depends on the choice);
   - a candidate is one-way when `rand("oneway", ...)` falls under `ONE_WAY_SHARE`; a one-way street goes bare when `rand("bare", ...)` falls under `ONE_WAY_BARE_SHARE` and S10 allows it; the parking side by `rand`. Keys of their own, so A4's `"split"` draws are not shifted.
   - Whatever it chooses, criteria 1, 4 to 9, S1 to S5, V1, V2 and every block rule hold on the named cities. No check requires a one-way street to have parking, or to have none, or counts how many go bare.
3. [ ] **One-way off gives A4's plan** (Vitest). The stage takes an option `oneWayShare` (default `ONE_WAY_SHARE`), for the pre-check. With 0, on the named cities, the layer equals A4's (the same cells, blocks and junctions) except that every street has `section` "twoWay" and `flow` "both", and `arrows` is empty.
4. [ ] **S7. Every junction reaches every other** (Vitest, on the named cities; proposed). The junction graph, with each street stretch between two junctions in a row an edge (one way or both), is strongly connected: one search forwards, one backwards, linear in junctions. Fixture: a corner whose two edge streets both point into it fails S7, with the junction named.
5. [ ] **S8. The four edge streets are two-way** (Vitest, on the named cities; proposed). They stay 5 cells, so the outline (A4 criterion 2) does not move. Fixture: a one-way edge street fails S8.
6. [ ] **S9 (Josh's Q3: "there should always be a two way or one way street in the opposite direction between two one ways that share the same direction")** (Vitest, on the named cities). On every lattice line straight across one axis's streets, in the order the line crosses them, no two one-way streets with the same `flow` are next to each other without a two-way street, or a one-way street the other way, between them. Linear in cells. The directions are a pass after the cuts (direction changes no cell): one-way streets in `across0` order per axis, each taking the direction S9 allows against its one-way neighbours so far. If neither does, it becomes two-way, and a narrow cut is redrawn with the next draw (a two-way street needs 5 cells; the draw limit and `CityStageError` of A4 criterion 3 apply). Fixture: two parallel one-way streets with the same flow and no street between them fail S9, both named.
7. [ ] **S10 (Josh: "yes, the recommended")** (Vitest, on the named cities). A bare one-way street leaves every block along it a parking band of its own on another side (a side whose street's parking band is on that block's side). Where no candidate passes, the street keeps its parking; nothing fails. Fixture: a block whose only own band is on a bare one-way street fails S10, the block and street named.
8. [ ] **The lattice, for any section** (Vitest, on the named cities). The trigger stays `CUT_MIN_CELLS` (17); once a piece is cut the cut's section is drawn and the cut needs 12 plus its width; A4's piece rule (`fine`) uses the cut's own width; a piece of 15 or 16 cells is not cut (no new kind of block split). Every use of `STREET_CELLS` in `split.ts` takes the street's own width. Two cuts that line up (same centre line, same section) are one street, with one section and one direction; a later cut lining up with an earlier one across a street takes the earlier one's section. S3's gap stays between centre lines. A block's side street is the one whose pavement touches the block edge. `centre_m` on a one-way street is the middle of its lane cell (`cityplan.ts`). Block sizes, V1, V2 and `BLOCK_MEAN_MIN_CELLS` unchanged.
9. [ ] **Junctions, S2 and S6 for any width** (Vitest, on the named cities). A junction is the two carriageways' widths: 3 x 3, 3 x 2, 3 x 1, 2 x 2, 2 x 1 or 1 x 1 cells of role `junction`. `findJunctions` finds the crossing street by its carriageway, not by `across0 = c0 - 1`. A4's S2 test becomes width-aware: at a T, one row of `crossing` cells across the ending street (its carriageway width) and one across the through street on each side of it (the through street's width); two `pavementCorner` cells on the ending side; on the far side the through street's pavement is the ending street's full width (3, 4 or 5 cells) of `pavement`. No `parkingPlain` cell in a junction or a crossing. A4 criterion 9's facing span (S6) is the ending street's full width, 3 to 5 cells. Every junction has at least one arm in and one arm out.
10. [ ] **The arrows, for E (Josh's Q5: "the kit has them, use them")** (Vitest, on the named cities). `arrows` lists, for every one-way street, a lane cell of its own on the first lane cell after each junction exit, then one every `ONE_WAY_ARROW_EVERY` cells, each `toward` the street's flow; none in a junction or a crossing; none on a two-way street. Stage 1 places them so E only draws them (E's criterion 5).
11. [ ] **Picture** (R-5). A one-way lane cell keeps its role (`lane`). The legend gains "one-way lane" (cells) and "one-way arrow" (points, one per `arrows` entry), so the direction shows on a phone; otherwise unchanged. This changes A4 criterion 11 ("the legend is unchanged") by those two entries. `src/render3d/planview.test.ts` passes unchanged.
12. [ ] **R-4, R-7.** Stage 1's four digest pins are re-taken once, and the test names them as moved by A4b (one-way streets). The 6 x 6 run ends `ok` or with a stage failure, with no block or street count asserted.
13. [ ] **The report.** For each of the 13 named cities: the one-way streets with their sections, lengths and directions; the share of candidates made one-way; the share bare; S10's refusals; the junctions by size; the draw used (and any redraws from criterion 6). Plus what the builder chose under criterion 2, if it changed the starting choice.
14. [ ] (Main session, phone-sized screenshots) `?view=3d&city=plan&stage=streets` and `&blocks=6x4&seed=3`: narrower one-way streets with arrows, the edge ring two-way, nothing near-misses. Josh judges `ONE_WAY_SHARE`, `ONE_WAY_BARE_SHARE` and the arrow spacing by eye. `?view=3d&city=tiles` looks as on `goal/city-style`.
15. [ ] R-1 to R-7 for `streets`. Tests run: `npx vitest run --maxWorkers=2 src/city/streets/ src/city/pipeline/ src/render3d/planview.test.ts` and one `npx tsc --noEmit` (A4's small gate). Land's, Mass's and Edge's tests are not run and are expected to fail on this branch (see Merging).

- **Files:** `src/city/streets/` (`split.ts`, `check.ts`, `constants.ts`, `stage.ts` and their tests). `layout.ts` only to re-export: its old functions stay untouched (R-9, A4 criterion 1). `src/core/cityplan.ts` (criterion 0 only, by the lead-architect, not the builder).
- **Must not:** `src/city/land/`, `src/city/mass/`, `src/city/edge/`, `src/city/stages.ts`, `src/city/pipeline/`, `src/render3d/` (read only: the viewer draws the new legend unchanged), the docs (grammar rule 10's two one-way rows wait for L).
- **Interfaces:** `CityStreetSection`, `CityStreetFlow`, `CityStreetTraffic`, `CityStreetArrow`, `CityPlanStreetA4b` and `CityStreetsLayerA4b` are in `src/core/cityplan.ts` (written 20 Nov 2026, before A4b; folded in by criterion 0). The comments of `centre_m`, `CityJunction` and `CityJunctionFacing.span` now say what they mean on one-way streets. No new dependency.
- **Heavy:** the named-city loop of criteria 1 and 4 to 10 in one file, one city build each through a module cache.

### A4c · Stage 1: a split that leaves Land its park places (planner, pure). Branch `ticket/070a4c-park-places`
**Branch.** Cut from `ticket/070a4-split-plan` at the commit that adds this section, as A4b was. Once its review settles, the main session merges it into `ticket/070a4-split-plan` (see Merging), and the pre-check is re-run there.

**Goal.** Every split plan stage 1 returns leaves Land enough blocks it can make a park of, so V4 can hold on every city. Josh sees no new kind of thing at `?view=3d&city=plan&stage=streets`: on some cities the split is a different draw.

**Josh's words (20 Nov 2026, in chat; Q14).** Asked the A4 pre-check's question 3 word for word, "Some split plans leave Land no place for its second park (V4 fails on 3 x 3 seeds 4, 8 and 10 with one-way streets on). Should stage 1 redraw a split that leaves too few park places (Yes / No)?", he answered: "3. yes".

**Josh's words on the stop (20 Nov 2026, in chat; Q15).** A4c stopped on criterion 4: 3 x 3 seed 10 with one-way on found no draw (S5 53 misses of 65, V1 38, S4 17). Asked about the blocker, he answered: "have the junctions do not need to be Ts. It should be the T's should have a floor of 0.30%". Asked whether that is 30%, he confirmed: "Yes 30%". So S5's `T_SHARE_MIN` is 0.30, Decided (criterion 8). `docs/design/070-A4c-stop.md` section 0 measured it: all 13 named cities ok, one-way off and on, within 65 draws.

1. [ ] **Park places** (Vitest, `parkPlaces` in `src/city/streets/check.ts`). A block of the layer is a park place when it is one of:
   - **a whole-park place:** `type` "small" (`blockType`: its longer side at most `BLOCK_SMALL_MAX_M`, 40 m, so both sides 6 to 8 cells), **and served**: at least one of its four sides has a non-empty `across`, and that side's street has a `parking` band on the other side of the carriageway from the block (the row next to the across block's pavement). This is B3's served-park rule (Q14's answer 2), read from stage 1's own layer. A small block whose every street parks on its own side, has no parking band (a bare one-way street) or faces out of the city is not a place.
   - **a half-park place:** `type` "large" (its shorter side at least `BLOCK_LARGE_MIN_M`, 55 m, so 11 cells or more). Land's two half-park conditions (short side at least `PARK_HALF_SIDE_MIN_CELLS`, 9; the built part it leaves, `short - floor(short / 2)`, at least 6) hold on every large block, so they add nothing here.
   - Medium and long blocks are not places.

   Fixtures: a small block with one street parking across from it is a place; the same block with all four streets parking on its own side is not; a large 11 x 12 block is; a medium 10 x 12 block is not.
2. [ ] **S11. Too few park places is a miss** (Vitest). A draw "leaves Land too few park places" when `parkPlaces` counts fewer than `ceil(blocks / PARK_ONE_IN_BLOCKS)`, the number of parks V4 needs (`PARK_ONE_IN_BLOCKS` 6: two on a 3 x 3 city of 7 to 12 blocks, four or five on 6 x 4). `PARK_ONE_IN_BLOCKS` is a typed-in copy in `src/city/streets/constants.ts`, pinned equal to `tilecity.ts`'s by a test (a test-only import, as `equal.test.ts` has).
   - S11 is judged on the draw's final layer, after S9's directions and S10's redo (it reads the bands those leave).
   - A draw that misses S11 is a miss like S3 or S5: `SplitFailure.rule` gains "S11", and the next draw is tried, within the same `BLOCK_DRAWS_MAX` (64, unchanged). If every draw misses, the stage throws `CityStageError` naming the rule with the most misses (R-2), as today. No fallback, no count lowered.
   - Fixture: a typed-in layer of 9 blocks with one park place fails S11 with the count named; with two it passes.
3. [ ] **One-way off and on** (Vitest, on the named cities). S11 holds on every named city with `oneWayShare` 0 and with the default. A4b's criterion 3 still holds: with 0, the layer is the one A4 (with S11) would draw.
4. [ ] **If a named city finds no draw.** The pre-check's sketch of this rule found none in 65 draws on 3 x 3 seed 10 with one-way on. The builder does not tune anything: no draw limit, share or count changed, no city skipped or pinned. It commits its work on the branch, and stops and reports with the misses by rule (R-2). The main session then runs the pre-check re-run on this branch anyway, because that failure is the question the re-run puts to Josh (whether one-way stays on as built). A4c is finished after his answer.
   - **It fired (20 Nov 2026) and is answered by Q15:** criterion 8. The stop note's question 1 (129 split draws, a `SPLIT_DRAWS_MAX` of 128) and question 2 are withdrawn, not needed: with the T floor at 0.30 every named city finds a draw within `BLOCK_DRAWS_MAX`. No draw limit changes.
   - **Superseded for the split's limit (20 Nov 2026, Q18):** on the 6 x 6 named cities, seed 2 with one-way on finds no split in 65 draws (it finds one at draw 82), and Josh answered "yes" to a limit of 128. A4d adds `SPLIT_DRAWS_MAX` (128) for the split; criteria 2 and 8's "within `BLOCK_DRAWS_MAX` (64, unchanged)" read "within `SPLIT_DRAWS_MAX`" from A4d on. `BLOCK_DRAWS_MAX` (the outline's, `blockSizes`') stays 64.
5. [ ] **R-4, R-7.** Stage 1's four digest pins (`src/city/streets/stage.test.ts`, "stage 1 digest pins (R-4)") are re-taken once more, and the test's name names them as moved by A4c (park places). A pinned city whose draw does not move keeps its value, and the builder says which. The 6 x 6 run ends `ok` or with a stage failure, with no block count asserted.
6. [ ] **The report.** For each of the 13 named cities, one-way off and on: the draw used, S11's misses before it, and park places (whole, half) against parks needed. Plus the 27 cities outside the named list (3 x 3 seeds 11 to 20, 6 x 4 seeds 4 to 20), reported, not pinned, not required. With criterion 8, the stop note expects one of them to fail: 3 x 3 seed 12 with one-way off (its square ground always cuts into a plain grid with 0 Ts). Whether it is left as an honest failure, reported and not pinned, is Q16, open; until Josh answers, the builder reports it and pins nothing for it, and no test asserts it either way. **Answered (20 Nov 2026, Q16): yes**, an honest failure outside the named cities, reported and never pinned.
7. [ ] R-1 to R-7 for `streets`. Tests run: A4's small gate (`npx vitest run --maxWorkers=2 src/city/streets/ src/city/pipeline/ src/render3d/planview.test.ts` and one `npx tsc --noEmit`). Land's, Mass's and Edge's tests are not run.
8. [ ] **Josh's T floor (Q15: "Yes 30%")** (Vitest).
   - `T_SHARE_MIN` is 0.30 in `src/city/streets/constants.ts`, its comment Decided with Josh's words and the date (not PROVISIONAL). A test pins the value (equals 0.30). `split.test.ts`'s header no longer calls it provisional. S5's fixture (A4 criterion 8: today's lattice fails S5) still fails, since today's grid has 0 inner Ts.
   - Stage 1's digest pin for 3 x 3 seed 2 (one-way on) is re-taken, and the test's name names it as moved by Josh's T floor (stop note: draw 12 to 11). The pins for 3 x 3 seeds 1 and 3 and 6 x 4 seed 1 keep their values (their draws do not move); if any of them does move, the builder stops and reports.
   - On all 13 named cities, with `oneWayShare` 0 and with the default, the run is `ok` within `BLOCK_DRAWS_MAX` (64, unchanged). No other constant, draw limit or count changes. The draws reported under criterion 6 are expected to match the stop note's section 0 table; a difference is reported.
   - S3's `JUNCTION_GAP_MIN_CELLS` stays PROVISIONAL (A4).

- **Files:** `src/city/streets/` (`check.ts`, `split.ts`, `constants.ts` and their tests, including `split.test.ts`'s header for criterion 8; `stage.test.ts`'s pins). `layout.ts` untouched (R-9).
- **Must not:** `src/city/land/`, `mass/`, `edge/`, `stages.ts`, `pipeline/`, `src/render3d/`.
- **Interfaces:** none new; `SplitFailure` is stage 1's own type. No new dependency.

### B3 · Stage 2, Land on the split plan: S6 for lanes, the served park (planner, pure). Branch `ticket/070b3-land-split`
**Branch.** Cut from `ticket/070a4-split-plan` after A4c is merged into it and the pre-check re-run has reported (and Josh has answered it, if it asked him).

**Goal.** Land's lanes never open onto a junction, and every whole park has a kerb band across one of its streets to serve it. Josh sees it at `?view=3d&city=plan&stage=land`.

**Josh's words (20 Nov 2026, in chat).** S6: "Yes, all four" (Q11). The served park: asked the A4 pre-check's question 2, "Some whole-block parks get no kerb parking, because every street round them has its parking on the park's side. Should Land only make a whole park of a block that has a parking band across one of its streets (Yes / No)?", he answered: "2. yes" (Q14).

1. [ ] **S6 for lanes** (Vitest). A lane's place keeps both its mouths off every `CityBlockSide.junctions` span of the two sides it opens on, widened by `BAY_JUNCTION_CLEAR` (1) cell either side. From A4b the facing span is the ending street's full width, 3 to 5 cells. `BAY_JUNCTION_CLEAR` is a typed-in copy in `src/city/land/constants.ts`, pinned equal to `tilecity.ts`'s by a test. B2's "no place, no alley" counts S6 too: a block whose only places face a junction takes no alley. Fixture: a block whose one lane place opens onto a junction-facing span has no place. On the named cities no lane mouth lies in a widened junction-facing span.
2. [ ] **The served park** (Vitest). Land makes a whole park only of a small block that is served: at least one of its sides has a non-empty `across`, and that side's street has a `parking` band on the other side of the carriageway from the block (the same reading as A4c's criterion 1, written in Land's own folder). A small block that is not served is passed over for a whole park, and the quota goes on down `planBlocks`' list (the next small block by hash, then the large blocks). Failing fixture: a small block whose four streets all park on its side takes no whole park.
3. [ ] **The grid lookups go.** Land reads no block's `bi`, `bj` or a street's `line`; every neighbour is read from `CityPlanBlock.sides`. The grep test (Vitest), as the Sections paragraph says.
4. [ ] **V3, V4 and M4a** hold on the named cities, one-way on (and off, through `oneWayShare` 0), thresholds unchanged. The builder reports alleys, strips and parks per city (have / need) both ways, beside the re-run's numbers. **Stop rule:** if V3 or V4 cannot hold on a named city, the builder stops and reports (R-2). No rate falls.
5. [ ] **R-4, R-7.** Land's four digest pins are re-taken, and the test names them as moved by B3 (the split plan, S6, the served park). Mass's and Edge's pins move too; they are C3's and D1b's, and their tests are not run here.
6. [ ] R-1 to R-7 for `land`. Tests run: `npx vitest run --maxWorkers=2 src/city/streets/ src/city/land/` and one `npx tsc --noEmit`.

- **Files:** `src/city/land/`.
- **Must not:** every other folder. Mass's and Edge's tests are expected to fail on this branch until C3 and D1b (see Merging).
- **Interfaces:** none new; stage 1's `CityPlanBlock.sides`, `CityPlanStreet.bands` and `across0` are read. No new dependency.

### C3 · Stage 3, Mass on the split plan: S6 for drives and frontage lots (planner, pure). Branch `ticket/070c3-mass-split`
**Branch.** Cut from `ticket/070a4-split-plan` after B3 is merged into it.

**Goal.** No drive or frontage lot opens onto a junction, and every neighbour Mass reads is a block across a street side. Josh sees it at `?view=3d&city=plan&stage=mass`.

**Josh's words.** S6: "Yes, all four" (20 Nov 2026, Q11).

1. [ ] **S6 for drives and frontage lots** (Vitest). A drive or frontage-lot site on a street side keeps every mouth cell off that side's `junctions` spans, widened by `BAY_JUNCTION_CLEAR` (1) either side (a typed-in copy in `src/city/mass/constants.ts`, pinned equal to `tilecity.ts`'s in `lots.test.ts`). A lane-side drive (entered from a lane) is not judged. Fixture: when the only street site a part has faces a junction it is not offered, and the part goes on as C2 says (another site, a yard court, a frontage lot, or a walk-through).
2. [ ] **M5 gains a clause** (Vitest): no vehicle mouth on a street (a lane's, a drive's or a frontage lot's) lies in a widened junction-facing span. Failing fixture: a drive moved onto a junction-facing span fails M5, with "faces a junction" and the opening named. Holds on the named cities.
3. [ ] **`lots.ts` line 180** (the neighbour across the longest street). `blockAt.get(bi + NEIGH[side][0], bj + NEIGH[side][1])` goes. For the block's sides, longest first as now, the neighbours are each `across` block of that side, longest shared span first (ties by id). The rest of the loop (`LOTS_PER_BLOCK_MAX`, `pick`, the guard) is unchanged.
4. [ ] **P2's `adjacent`** (`check.ts`, line 249): two blocks are adjacent when one lists the other in one of its sides' `across`. Every P2 threshold is unchanged (`PARK_PER_HOME` 0.075, mass's `PARK_SUPPLY_BAND` 0.75 to 1.5, the lots-per-block cap, the short-block count, the frontage-lot cap).
5. [ ] **The grid lookups go.** Mass reads no block's `bi`, `bj` or a street's `line`. The grep test (Vitest).
6. [ ] **C1's and C2's checks** (M3, M4b, M5, G2, G3, R1, P2) hold on the named cities, one-way on (and off). The builder reports, per city both ways, P2's stalls over wanted, R1, and how many vehicle mouths S6 moved. **Stop rule** (R-2), as C2's.
7. [ ] **R-4, R-7.** Mass's four digest pins are re-taken, and the test names them as moved by C3 (the split plan, B3's Land, S6).
8. [ ] R-1 to R-7 for `mass`. Tests run: `npx vitest run --maxWorkers=2 src/city/streets/ src/city/land/ src/city/mass/` and one `npx tsc --noEmit`.

- **Files:** `src/city/mass/`.
- **Must not:** every other folder.
- **Interfaces:** none new. No new dependency.

### A4d · Stages 1 to 3 on the 6 x 6 named cities; the split's own limit, 128 (planner, pure). Branch `ticket/070a4d-six-by-six`
**Branch.** Cut from `ticket/070a4-split-plan` at the commit that adds this section (head after C3 and the 6 x 6 pre-check). Once its review settles, the main session merges it into `ticket/070a4-split-plan`, and D1b branches from there.

**Goal.** Stages 1 to 3 are tested and pinned on the new named cities (6 x 6 seeds 1 to 10, one-way off and on), and stage 1 finds a split on every one of them, 6 x 6 seed 2 with one-way on included. Josh sees no new kind of thing at `?view=3d&city=plan&stage=mass&blocks=6x6&seed=2`; that city now draws instead of showing a stage 1 failure.

**Josh's words (20 Nov 2026, in chat; Q17, Q18).** "No, we need to stop basing these tests on a 3x3. Start basing them on 6x6 or greater." The named cities: "6x6"; the default 6 x 6 seed 1: "yes". "3x3 seeds are too small. They're going to result in regular failures because they cannot accommodate for all of changes I suggested. Yes". Asked "With one-way streets on, 6 x 6 seed 2 finds no street split in 64 tries; it finds one at try 82. Should stage 1 try up to 128 splits (Yes / No)?" (with the PB question): "yes, yes".

**A re-take, not a re-cut.** No rule, check or threshold changes in it, and no line of `src/city/land/` or `src/city/mass/` code changes: only their tests' city lists, pins and reports. If a check needs a code change to hold on a named run, the builder stops and reports (R-2).

1. [ ] **The split's own limit** (Vitest). A new `SPLIT_DRAWS_MAX = 128` in `src/city/streets/constants.ts`, its comment Decided with Josh's words ("yes, yes") and the date. `split.ts`'s draw loop and its `CityStageError` message read it in place of `BLOCK_DRAWS_MAX` (so a city with no split names `SPLIT_DRAWS_MAX + 1` draws), and S11's misses count within it. `BLOCK_DRAWS_MAX` stays 64: `layout.ts` (`blockSizes`, the outline's draw), `tilecity.ts` and their tests are not edited (R-9). A test pins `SPLIT_DRAWS_MAX` to 128 and `BLOCK_DRAWS_MAX` to 64, naming Josh's ruling. `split.test.ts`'s "draw at most" check reads `SPLIT_DRAWS_MAX`. With it, 6 x 6 seed 2 with one-way on is `ok` (the pre-check found draw 82; the builder reports its own).
2. [ ] **The plan's default size** (Vitest). A new `PLAN_BLOCKS_DEFAULT = 6` in `src/city/streets/constants.ts`, exported from `src/city/streets/index.ts`, its comment naming Josh's "yes" to the default 6 x 6 seed 1. A test pins it to 6 and to at most `CITY_BLOCKS_MAX`. `CITY_BLOCKS_DEFAULT` stays 3 (`clampBlocks`, `city=tiles`). Nothing in `src/city/` reads `PLAN_BLOCKS_DEFAULT`; A2b's `planview.ts` does.
3. [ ] **The named lists move** (Vitest). In every pipeline test file of `src/city/streets/`, `src/city/land/` and `src/city/mass/` that builds the named cities (today: `streets/check.test.ts`, `oneway.test.ts`, `parkplaces.test.ts`, `split.test.ts`, `stage.test.ts`; `land/stage.test.ts`; `mass/stage.test.ts`), `NAMED` is 6 x 6 seeds 1 to 10, the default (seed 1) first. Each "the named cities are 13" test reads "are 10, the default 6 x 6 seed 1 first". A named loop that ran both ways (A4b criterion 3, A4c criterion 3, B3 criterion 4, C3 criterion 6) still does; in each folder at least one test runs all 20 named runs. A4 criterion 2's outline check runs on the new list. `equal.test.ts` is not edited (the old path's 16 cities, R-9).
   - A test that builds one 3 x 3 or 6 x 4 city as a fixture of its own (e.g. `oneway.test.ts`'s 3 x 3 seed 6) moves to a named city or a typed-in fixture where its assertion is about that city's result; the builder lists each one. `src/city/pipeline/run.test.ts`'s test-double check on 3 x 3 seed 2 compares two runs of one city, not its result, and may stay.
4. [ ] **Every stage 1 to 3 check holds on the 20 named runs** (Vitest): stage 1's S1 to S11, V1, V2 and street width; Land's V3, V4, M4a, S6 for lanes and the served park; Mass's M3, M4b, M5 (with S6), G2, G3, R1 and P2. Thresholds unchanged. The pre-check measured all of them passing with the 128 limit. **Stop rule** (R-2): if one fails on a named run, the builder commits its work, stops and reports with the numbers; nothing is tuned.
5. [ ] **R-4.** Stage 1's, Land's and Mass's four digest pins are re-taken on 6 x 6 seeds 1, 2, 3 and 8, one-way on, and each test's name names them as moved by A4d (the 6 x 6 named cities; the split limit 128). No 3 x 3 or 6 x 4 pin is kept. Edge's pins are D1b's; Edge's tests are not run here and are expected to fail on this branch.
6. [ ] **The report.** For each of the 20 named runs: the split draw used and S11's misses before it, the inner T share, park places (whole, half) against need, V3 and V4 have / need, P2 stalls over wanted, R1, and the vehicle mouths S6 moved. The same for the outside cities (3 x 3 and 6 x 4 seeds 1 to 20, off and on): reported, not asserted, not pinned (3 x 3 seed 12 off is expected to fail stage 1, Q16).
7. [ ] R-1 to R-7 for `streets`, `land` and `mass`. Tests run: `npx vitest run --maxWorkers=2 src/city/streets/ src/city/pipeline/ src/city/land/ src/city/mass/` and one `npx tsc --noEmit`.

- **Files:** `src/city/streets/` (`constants.ts`, `split.ts`, `index.ts` for the one export, and the tests named in criterion 3 and their pins; `layout.ts` and `equal.test.ts` untouched); `src/city/land/` (tests only); `src/city/mass/` (tests only); `src/city/pipeline/` (tests only, if criterion 3 needs it).
- **Must not:** `src/city/land/` and `src/city/mass/` code, `src/city/edge/`, `src/city/stages.ts`, `src/render3d/`, `src/core/`.
- **Interfaces:** none new; two constants in stage 1's own folder. No new dependency.
- **Heavy:** each named-city file builds 10 cities both ways once, through its module cache, and the outside report (80 runs) is its own file; each has a 120 s timeout. The pre-check timed all 20 named runs through every stage at 3.3 s on this PC.

### A2b · The plan view's default city is 6 x 6 seed 1 (renderer). Branch `ticket/070a2b-plan-default`
**Branch.** Cut from `ticket/070a4-split-plan` after A4d is merged into it (it reads A4d's `PLAN_BLOCKS_DEFAULT`). It may run alongside D1b.

**Goal.** Josh opens `?view=3d&city=plan` (with no `blocks` or `seed`) on his phone and sees the 6 x 6 seed 1 city. `?view=3d&city=tiles` still opens the 3 x 3 city. Josh, 20 Nov 2026, in chat, asked whether the default city should become 6 x 6 seed 1: "yes".

1. [ ] **The default** (Vitest, `planview.test.ts`). `planViewRequested` starts `blocksX` and `blocksZ` at `PLAN_BLOCKS_DEFAULT` (from `../city/streets`), not `CITY_BLOCKS_DEFAULT`; the seed default stays 1, and the clamping and parsing are unchanged. Its doc comment says "the default 6 x 6". The two tests that expect the default (`"?city=plan"` and `"?city=plan&blocks=big&seed=abc"`) expect 6 x 6 seed 1; every other assertion in the file is unchanged.
2. [ ] **`city=tiles` keeps 3 x 3.** `tileslots.ts` (`cityTilesRequested`), `tilecity.ts` and their tests are not edited and pass (R-9).
3. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=streets` shows the 6 x 6 seed 1 city and its legend; `?view=3d&city=tiles` looks as on `goal/city-style`.
4. [ ] R-8 and R-11 hold. Tests run: `npx vitest run --maxWorkers=2 src/render3d/planview.test.ts` and one `npx tsc --noEmit`.

- **Files:** `src/render3d/planview.ts` (the two default lines and the doc comment only); `src/render3d/planview.test.ts` (the default assertions only).
- **Must not:** `src/city/` (read only), `tileslots.ts`, `tilecity.ts`, `renderer.ts`, `src/main.ts`, every other render3d file.
- **Interfaces:** none new (`PLAN_BLOCKS_DEFAULT` is A4d's). No new dependency.

### D1b · Stage 4, Edge on the split plan: bands from the sides, the cap per block side, P1's floor 0.69, the first pass as a best fit, a park's own tile (streetscape, pure). Branch `ticket/070d1b-edge-split`
**Branch.** Cut from `ticket/070a4-split-plan` after C3 is merged into it, and from 20 Nov 2026 (Q17) after A4d is merged into it.

**Goal.** The parking band is laid along the split plan's block sides, a T's far side keeps room for bays, every block (whole parks included) gets its first kerb tile, and P1 to P6 hold on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on). Josh sees it at `?view=3d&city=plan&stage=edge`.

**Josh's words (20 Nov 2026, in chat; Q14).** To the A4 pre-check's question 1, "On a block side that faces a T, the kerb is in two stretches. Should the 30% cap on kerb bays count over the whole block side, as today (Yes), or over each stretch on its own, as the re-cut says (No)?": "1. yes". To question 4: "4. Lower P1's floor. Is P1's floor the parking ratio?"; told it is the kerb-parking ratio only, and asked "Do you still want P1's floor lowered from 0.75 to 0.69, knowing it's kerb parking only (yes), or would you rather have the street cuts redesigned instead?": "yes lower it".

**Josh's words (20 Nov 2026, in chat; Q17, Q18).** To the re-run's question 2, "With one-way streets on, 6 x 4 seed 2 has one block left with no kerb bay, because its neighbours take its only two first. Should the first pass hand out every block's first bay as a best fit over the whole city (own street first), instead of one block at a time (Yes / No)?": "yes" (lever M). To the 6 x 6 pre-check's question 1, "On the 6 x 6 cities, three whole-block parks get no kerb parking: the streets around them park on the far side, but only along sides too short for a bay, or in front of another park. Should such a park take one bay on its own kerb, only when nothing across the street can give it one (Yes / No)?", with question 2 (the split limit): "yes, yes" (PB). Lever K (a stage 1 redraw for a block with no kerb place) is **not** adopted: "No, we need to stop basing these tests on a 3x3. Start basing them on 6x6 or greater."

1. [ ] **The band table from the sides** (`band.ts`, Vitest). `colsOf`, `rowsOf`, `blockIdAt` and `alongOf` (lines 110 to 162) no longer read `bi`, `bj` or `line`. The bands are built from `CityPlanBlock.sides`: one band per (block side, `across` entry), spanning that entry's span, on the parking row next to the block's pavement, and only where `ownBand` holds (the street's parking band is on the block's side). A side with an empty `across` (on an edge street) is one band over the side's `span`. So a side facing a T has two bands (stretches), and the junction-facing span between them has none. A street's parking band is found from its `bands` (a 4-cell one-way street has one; a 3-cell bare one none). Fixture: a block side facing a T gives two bands whose spans are its two `across` spans.
2. [ ] **The outer side of an edge street** is found from `CityPlanStreet.outer`: its parking cells, in runs, stay plain and face "outer" (`CityEdgeCell.block`); no band state, as D1.
3. [ ] **`sidesOfBlock`** lists one entry per (side, across entry). The first pass, the greedy pass, the block order and `longestFirst` read it unchanged. (The first pass's choice of tile is criterion 12's; its candidates come from this list.)
4. [ ] **P3's cap counts over the whole block side** (Josh: "1. yes"). Each stretch is its own band; the cap is the block side's: `floor(KERB_BAY_SHARE_MAX[profile] x L / 2)`, L the block side's band length as D1 measures it today (the side's span), one cap shared by all the stretches on that side. `tryAdd` checks the side's total. P3's share in `check.ts` counts per block side, in the same unit. Fixture: a 14-cell side facing a T has one cap, `floor(KERB_BAY_SHARE_MAX.street x 14 / 2)`, shared by its two stretches; the tiles on both together never exceed it, and a stretch under 7 cells with room for a tile takes one while the side's cap has room (a cap of its own would be 0).
5. [ ] **`check.ts`** (Vitest).
   - `adjacent` (line 55) reads the side list: two blocks are adjacent when one lists the other in a side's `across`.
   - The outer test (lines 125 to 130) reads `CityPlanStreet.outer`, not `line`.
   - **The band scan (lines 118 to 150) runs only over the street's own `span` and its own cells** (the pre-check's addition). Today it walks the whole lattice line, which on the split plan runs into other streets' pavements and lanes and counts them as bad band cells (P5). Fixture: a street that ends in a T, whose lattice line runs on past the junction, counts no bad band cell beyond its span.
6. [ ] **P1's floor is 0.69 on the pipeline** (Josh: "yes lower it").
   - `PARK_SUPPLY_BAND` in `src/city/edge/constants.ts` becomes `{ lo: 0.69, hi: 1.5 }`, with Josh's words in its comment.
   - **Its pin moves:** `src/city/edge/constants.test.ts`'s "every one equals tilecity.ts's" no longer compares `PARK_SUPPLY_BAND` with the old path's. A test of its own pins it to `{ lo: 0.69, hi: 1.5 }` and names Josh's ruling in its name, as `lots.test.ts` does for `PARK_PER_HOME`. Every other edge constant still equals `tilecity.ts`'s. `src/city/edge/stage.test.ts` reads the floor by name and is unchanged there.
   - **`city=tiles` keeps 0.75 until L** (C2's precedent): `tilecity.ts`, `parkmetrics.ts`, `tilecity.test.ts`'s pin (line 1669) and every other render3d file are not edited. Mass's own `PARK_SUPPLY_BAND` (P2's lot band) stays 0.75.
7. [ ] **Kerb cuts on any street** (Vitest, on the named cities): every mouth cell of every vehicle opening has its cut, one-way streets included; a bare one-way street has no band.
8. [ ] **P1, P3, P4, P5, P6** hold on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on; R-2), every threshold unchanged but P1's floor (criterion 6). `edge/stage.test.ts`'s and `report.test.ts`'s `NAMED` lists are 6 x 6 seeds 1 to 10, the default first. The builder reports supply over demand per named run, and P1 to P6 on the outside cities (3 x 3 and 6 x 4 seeds 1 to 20, off and on: reported, not pinned, not required, not asserted). The 6 x 6 pre-check measured 20 / 20 with M and PB, lowest supply 0.782 off and 0.729 on (6 x 6 seed 8); outside 39 / 40 off and 38 / 40 on. **Stop rule** (R-2), as D1's: nothing is tuned.
9. [ ] **The grid lookups go.** Edge reads no block's `bi`, `bj` or a street's `line`. The grep test (Vitest).
10. [ ] **R-4, R-7.** Edge's four digest pins are re-taken on 6 x 6 seeds 1 (the default), 2, 3 and 8, one-way on, and the test names them as moved by D1b (the split plan, the side-list bands, the cap per side, P1's floor, M, PB, the 6 x 6 named cities). No 3 x 3 or 6 x 4 pin is kept.
11. [ ] R-1 to R-7 for `edge`. Tests run: `npx vitest run --maxWorkers=2 src/city/streets/ src/city/land/ src/city/mass/ src/city/edge/` and one `npx tsc --noEmit`; then the main session's full `npm run gate` before the eight merge (see Merging).
12. [ ] **M. The first pass as a best fit over the city** (Josh: "yes"; Vitest). D1's rule stays: every block takes one tile before any takes a second (D1 criterion 2, option B). What changes is how each block's first tile is chosen: one matching over all blocks, not block by block.
    - **Candidates.** Each block lists, in this order: its own band states, in the greedy pass's own-side order; then the bands across its streets, in `longestFirst` order and under the greedy pass's condition (the band exists and faces that neighbour); then, for a whole park only, its own bands (criterion 13). So own bands come before across.
    - **Capacities.** A band state holds as many first tiles as it has room for (`startsOf`'s room, less cut-blocked and `BAY_JUNCTION_CLEAR` cells, as D1 measures it). The band states of one block side together hold at most that side's cap (criterion 4).
    - **The matching.** Blocks are taken in the block order (fewest own parking sides first, ties by id). A block takes its first candidate with room. If none has room, it may move a block already matched to another of that block's candidates, and so on along a chain (an augmenting search), so the number of blocks matched never falls. It is a maximum matching under these capacities: the fixtures check that no assignment serves more blocks. A block no chain can serve is unmatched.
    - **Laying.** The matched tiles are then laid with `tryAdd`, in block order, so the city's `BAYS_PER_100M_MAX` cap and the room hold as for any tile. A block unmatched, or whose `tryAdd` refuses, gets `first` null, nothing throws, and it enters the greedy pass with its whole quota. The greedy pass, its loops and `shortTiles` are unchanged.
    - **Cost (R-7).** At most blocks times band states, since each block has a bounded number of sides. The reviewer accepts this as the one whole-city pass that is not linear in cells: Josh's ruling asks for a fit over the whole city.
    - **Fixtures.** (a) Block A (candidates: bands Y, then Z) comes before block B (candidate: Y only), each band with room for one tile: block by block, A takes Y and B gets none; with M, A takes Z and B takes Y. (b) A typed-in layer where every block's own band has room: each block's first tile is on its own band (own before across). (c) A block with no candidate gets `first` null and the run is `ok`.
    - The pre-check measured: without M, 6 x 6 seed 9 with one-way off fails P1 (block 5:0 loses its only tile to a neighbour); with M it passes, and M moves no other named run.
13. [ ] **PB. A whole park nothing across can serve takes one tile on its own kerb** (Josh: "yes, yes"; Vitest).
    - A whole-block park (`land.parks`, kind `"whole"`) still has no band state for the greedy pass, and no other block may use its band (D1 criterion 2, unchanged there). For the first pass only, each of its own bands (where `ownBand` holds) is a band state with its side's cap, listed as that park's last candidates (criterion 12), after every band across.
    - So it takes a tile on its own kerb only when the matching cannot give it one across. The greedy pass never adds to a park's own band. The tile counts against that side's cap, the city's cap and the room like any other, and the park's `first` is `"own"`.
    - **Fixtures.** A whole park whose only server is a 6-cell side across (cap `floor(0.3 x 6 / 2)` = 0) takes exactly one tile on its own band. The same park with a band across that has room takes its tile there and none on its own. A park's own band never holds a second tile.
    - The pre-check's cases: 6 x 6 seed 7 off (block 0:1), seed 3 on (4:2), seed 8 on (5:9, 5:11, served only by other whole parks).
    - **It changes guide 19.6** ("Whole-block park: ... It has no rows, so no units", and its Info line: a whole park "asks its neighbours across a street for a tile of kerb bays"), for that one tile. That is Josh's ruling, and the guide's text is edited only in L (renderer; see L criterion 2); D1b does not edit any doc.

- **Files:** `src/city/edge/`.
- **Must not:** every other folder; `src/render3d/` (the old path keeps 0.75); the docs (19.6's text waits for L).
- **Interfaces:** none new. `CityEdgeBlock.first`'s comment says `"own"` also covers PB's tile on a whole park's own kerb (a comment, written with this re-cut). No new dependency.
- **Heavy:** `stage.test.ts` builds the 10 named cities both ways once through its module cache; `report.test.ts` runs the 20 named and 80 outside runs, its own file, a 120 s timeout.

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

### B2 · Stage 2, Land: a lane leaves room for a drive (planner, pure). Branch `ticket/070b2-land-lanes`
**Goal.** Land cuts no court part that nothing can open: a lane goes only where every court part it leaves is long enough for a drive, and a block with no such place takes no alley. Josh sees it at `?view=3d&city=plan&stage=land`: on some cities a lane moves, and the alley and park counts stay.

Josh's ruling 3 (19 Nov 2026, in chat; asked "Do you approve all four rulings as recommended ("Yes, all four"), or do you want to keep 0.15 instead?", he answered: "Yes, all four"): Land places a lane only where every court part it leaves is at least 8 cells long, so a drive always fits; a block with no such place takes no alley. The measurements are in `docs/070-c2-options.md`.

1. [ ] **Lane places** (`lanePositions`, Vitest). It also takes the block's side across the cut. A place is dropped when a court part it leaves (short side 6 or more) has a long side under 8 cells. A part's two sides are its depth from the cut and the block's side across the cut. Strips (short side 2) are judged as in B. Among the places left, the lane's place is by hash, as in B.
2. [ ] **No alley without a place** (`planBlocks`, Vitest). It never chooses an alley block that has no place under criterion 1; such a block takes no alley. The alley quota and `ALLEY_*` are unchanged.
3. [ ] **M4a gains the clause** (Vitest): no lane leaves a court part with a long side under 8. Failing fixture: a 6 by 13 block cut 6, lane, 6 (two 6 by 6 parts) fails M4a with this clause named. A whole block from the streets that no lane cuts is not judged by this clause (see Q7).
4. [ ] **V3, V4** hold on the named cities with their thresholds (Vitest). The builder reports, per named city, alleys, strips and parks before (B as merged) and after, and which cities' lanes moved. The options note measured lanes moving on 9 of the 13, with alley and park counts unchanged.
   - If V3 or V4 cannot hold, the builder stops and reports (R-2). No rate falls.
5. [ ] **R-4.** Land's four digest pins are re-taken, and the test names them as moved by B2. Mass reads land, so mass's four pins move too: B2 re-takes their values in `src/city/mass/stage.test.ts` and names them as moved by B2 (C2 re-takes them again). C1's mass checks still hold on the named cities; if one does not, the builder stops and reports.
6. [ ] **The 6 x 6 streets test stops at its own stage.** `src/city/streets/stage.test.ts`'s "6 x 6 (R-7)" test calls `runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "streets")` (its `until` set to `"streets"`), so a later stage failing on 6 x 6 no longer breaks stage 1's test. Its assertion is otherwise unchanged.
7. [ ] R-1 to R-7 for `land` still hold. Tests run: `npx vitest run --maxWorkers=2 src/city/land/ src/city/mass/ src/city/streets/` and one `npx tsc --noEmit`.

- **Files:** `src/city/land/`; `src/city/streets/stage.test.ts` (the 6 x 6 test's `until` only); `src/city/mass/stage.test.ts` (the four digest pin values and their test's name only).
- **Must not:** `src/city/mass/`'s code, every other file in `src/city/streets/`.

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

- **Files:** new `src/city/mass/`; `src/render3d/planview.test.ts` (the unbuilt-stage example only, by the renderer; the planner never edits render3d).

### C2 · Stage 3, Mass: units, lots and courts (planner, pure). Branch `ticket/070c2-mass-parking`
**Goal.** Parking demand is fixed from the mass, and residents' courts (a court behind a drive, or a yard court in a 6-deep part) and frontage lots are laid as openings, so P2 holds before any kerb is drawn. Every court part has a drive or a walk-through. Josh sees it at `?view=3d&city=plan&stage=mass`.

**Re-cut, 19 Nov 2026.** The first build stopped on its stop rule (WIP commit `560193a`: P2 could not hold, and M5 failed on 10 of 13 named cities). The causes and the measured options are in `docs/070-c2-options.md`. Asked "Do you approve all four rulings as recommended ("Yes, all four"), or do you want to keep 0.15 instead?", Josh answered: "Yes, all four". Rulings 1, 2 and 4 land here; ruling 3 is B2's.

**Where it starts.** After B2 merges, the branch's WIP commit `560193a` is rebased onto the `goal/city-style` head. Kept as they are: `unitsOf`, the quota rounds and the dearer-layout rule, the P2 port, and the drive and court laying in `plan.ts`. C1 does not re-open as a section: its walk-through code changes here, and its digest pins were always re-taken here.

0. [ ] **First, on this branch, by the lead-architect (before the builder resumes):** `CityOpening.mouth` in `src/core/cityplan.ts` becomes a list, so a lane is one opening with two mouths (rule 6; the C1 reviewer's suggestion). `mouth: readonly { street: string; cells: readonly CityCell[] }[]`, empty for a plaza, park or walk-through (it was `null`). The builder then adapts `src/city/mass/` to it: a lane is one `CityOpening` with its two mouths, where C1 recorded `/lane/a` and `/lane/b`. No other folder reads `CityOpening.mouth` today.
1. [ ] **Nominal units** (18.2, on 5 m cells). These are the parking demand of record (`CityBlockUnits`), and no later stage changes them:
   - columns: every built cell of the block;
   - shops: street-frontage outer ground columns, less one door column per street run of up to `TERRACE_BAYS.max` columns, rounded up;
   - homes: `floor(columns x UNIT_FLOORS_NOMINAL / HOME_COLUMN_FLOORS)`.
2. [ ] **Lots.** `unitsOf`, `lotQuota` and `planLots` (their quota rounds and the dearer-layout rule) are moved and run on cells.
   - A lot is a court behind a 2-cell drive through both rings, with stalls and aisle from ring 3 (from 065 criterion 3), or a yard court (criterion 3). Where neither fits, it is a 2 x 2 frontage lot, within `CITY_FRONT_LOT_BLOCKS_MAX`.
   - A drive replaces that interior's walk-through.
   - `LOTS_PER_BLOCK_MAX` stays 2, and the frontage-lot cap stays.
3. [ ] **The yard court** (Josh's ruling 2: a part 6 cells deep may park in its own paved yard, a drive in, six stalls along the far side; "Yes, all four"). A second court shape in `sites.ts`, for a court part whose yard (inside ring 2) is exactly 2 cells deep:
   - a 2-cell drive through both rings, on a side of at least 8 cells;
   - six stalls along the yard's far side (two stall tiles, one each side of the drive's line), and the near side as the aisle;
   - it is a court behind a drive, not a frontage lot, so it does not count toward `CITY_FRONT_LOT_BLOCKS_MAX`.
   - Tests (Vitest): it fits a 6 by 8 part and not a 6 by 7 one; its stall cells are on the far side and its aisle on the near side; a part whose yard is 3 or more deep takes the ordinary court, as before.
4. [ ] **Lane parts.** A court part with a lane edge opens its court on the lane where one fits (as 057 G's alley court does; the drive costs no street frontage). Where none fits on the lane, it is planned like any other part. It never throws for want of a lane court.
5. [ ] **Walk-throughs** (Josh's ruling 4: a court part with no drive gets a walk-through even with a lane beside it; "Yes, all four"). Every court part that ends with no drive gets a walk-through, on its lane side where one fits, else as in C1. The C1-era lane exemption in M5 is removed: M5 is strict, and every interior touches an opening.
   - Failing fixture: a lane part with its drive and walk-through removed fails M5.
   - A whole 6 x 6 block from the streets that Land leaves alone cannot take a legal walk-through. It stays an honest M5 failure (R-2), and never occurs on the named cities (Q7).
6. [ ] **P2** holds on the named cities with `PARK_PER_HOME` 0.075 (Josh's ruling 1: "the lot ratio may go from 0.15 to 0.075 stalls a home"; "Yes, all four") and every other threshold unchanged: `PARK_SUPPLY_BAND`, `LOTS_PER_BLOCK_MAX` 2, the short-block count, the frontage-lot cap, R1's floor. It is ported from `parkmetrics.ts` onto the layer.
   - 0.075 is the pipeline's value only. `tilecity.ts` keeps 0.15 for `city=tiles` until L, so P2 is the one check the two paths do not share (see the checks table).
   - The test pinning the mass constants to `tilecity.ts`'s (`lots.test.ts`) excepts `PARK_PER_HOME`, which it pins to 0.075 and names Josh's ruling. Every other constant there still equals the old path's.
   - The builder reports, for all 13 named cities, the columns of the note's recommended row: homes, stalls wanted, floor, stalls laid, R1, drives (and how many on a street). The note's probe measured 66 laid against a floor of 54.3 on the default city, R1 0.927; the builder's numbers may differ by a lot or two.
   - **Stop rule:** if P2, M5 or R1 cannot hold on a named city, the builder stops and reports with the numbers (R-2). Nothing is tuned to pass.
7. [ ] **C1's checks** (M3, M4b, M5, G2, G3, R1) still hold on the named cities.
8. [ ] R-1 to R-7 for `mass`. The four mass digest pins (last re-taken by B2) are re-taken here, and the test names them as moved by C2.

- **Files:** `src/city/mass/`. `src/core/cityplan.ts` (`CityOpening.mouth` only, criterion 0, by the lead-architect, not the builder).
- **Interfaces:** `CityOpening.mouth` becomes `readonly { street: string; cells: readonly CityCell[] }[]` (criterion 0). It is written at the start of the re-cut on this branch, not on `goal/city-style` before: the merged C1 code reads `mouth` as one record or `null` and would stop typechecking. No new dependency.
- **Heavy:** the named-city loop with the quota rounds. Its own file, a 120 s timeout.

### D1 · Stage 4, the parking band (streetscape, pure). Branch `ticket/070d1-edge-band`
**Goal.** Every parking-band cell is a bay, a build-out or plain, as 18.5 says, laid against the mass's openings, and every block has its first kerb tile before the rest are shared out. Josh sees it at `?view=3d&city=plan&stage=edge`.

**Re-cut, 20 Nov 2026, on Josh's ruling.** The pre-check (`docs/design/070-D1-precheck.md`) measured D1 as first written failing P1 on two named cities (6 x 4 seeds 1 and 2: a block with no kerb tile), because C2's shop count runs about 25% above the old path's. Asked "On the pipeline, two named 6x4 cities (seeds 1 and 2) leave a block with no kerb parking, because the new shop count is about 25% higher. Should D1 give every block its first kerb tile before the rest are shared out (Yes), or stop as written (No)?", Josh said "you should ask the design agent"; told the note already recommends Yes (option B) but the decision is his, and asked "Shall I go with the design agent's recommendation (Yes), or send it back to look for more margin first?", he answered: "yes" (20 Nov 2026, in chat). So D1 adds one first pass (option B) and nothing else; Q6 is answered "fix, in D1".

1. [ ] **Kerb cuts.** Every vehicle opening's mouth (`CityOpening.mouth`) cuts the pavement in front of it: for each mouth cell, the street cell next to it across the building line becomes `kerbCut` and is recorded as a `CityKerbCut`. The parking-band cell in front of a cut stays `parkingPlain` (`CityKerbCut.plain`); a cut with a traffic lane behind it has `plain` null. Tests (Vitest): every mouth cell of every opening on the named cities has its cut; a plaza, park or walk-through (empty `mouth`) has none.
2. [ ] **Moved, plus one first pass.** 056's greedy allocator as it is in `tilecity.ts` on 2edac93 (the 063 B merge), unchanged: `BandState` (the free stretch, less the cut-blocked cells and the `BAY_JUNCTION_CLEAR` cells; the cap `floor(KERB_BAY_SHARE_MAX[profile] x band length / 2)`), `startsOf`, `tryAdd` (the side's cap, the city's `BAYS_PER_100M_MAX` cap, the room), `ownStates`, no band state for an edge street's outer side or for a whole-block park's band (`land.parks`, kind `"whole"`), the block order (fewest own parking sides first, ties by id), own sides first (avenue, then longer, then key; round-robin) and then the band across the longest street (`longestFirst`, only a band that faces that neighbour), and `shortTiles`. The parking constants it reads (`PARK_PER_SHOP`, `BAYS_PER_PARKING_TILE`, `BAY_TILES_PER_BLOCK_MIN`, `BAY_RUN_TILES_MAX`, `KERB_GAP_MIN_M`, `KERB_BAY_SHARE_MAX`, `BAYS_PER_100M_MAX`, `BAY_JUNCTION_CLEAR`, `BUILDOUT_TREE_EVERY`, `PARK_SUPPLY_BAND`) are typed-in copies in `src/city/edge/`, each pinned equal to `tilecity.ts`'s by a test, as `lots.test.ts` does for mass.
   - **The first pass (Josh, 20 Nov 2026: "yes"; option B of the pre-check), and nothing else is added.** Before the greedy pass, over the same block order, each block takes one tile:
     - it calls `tryAdd` on its own band states, in the greedy pass's own-side order, and stops at the first that returns true;
     - if none does, it calls `tryAdd` once on each band across its streets, in `longestFirst` order and under the greedy pass's condition (the band exists and faces that neighbour), and stops at the first that returns true;
     - if none does, the block gets no tile in this pass (`CityEdgeBlock.first` null), nothing throws, and it goes on to the greedy pass with its whole quota.
   - The first pass uses `tryAdd` as it is, so its tile counts against the side's cap, the city's cap and the room exactly like any other tile, and lies in `runs` like any other (`startsOf` places every run once both passes are done, as now). A block whose first tile was laid enters the greedy pass with its quota less one. The quota is still `max(BAY_TILES_PER_BLOCK_MIN, round(shops x PARK_PER_SHOP / BAYS_PER_PARKING_TILE))`; the greedy pass's loops are not changed.
   - Demand is read from `mass.units` (`shops`), never from buildings or facades.
   - Every block's `wanted`, `first` and `shortTiles` are in the layer (`CityEdgeLayer.blocks`), so P1 reads the shortfall from the layer.
   - Tests (Vitest): on a typed-in fixture where the greedy order alone leaves a four-sided block with no tile (the pre-check's block:4:1 case: its neighbours take each band's one tile first), the first pass gives it one; a block whose own bands and across bands are all full gets `first` null and the run is `ok`.
3. [ ] **Build-outs and their trees** (`BUILDOUT_TREE_EVERY`, never next to a crossing), as 18.5 and the old path's loop. The outer side of an edge street stays plain.
4. [ ] **P1, P3, P4, P5, P6**, ported from `parkmetrics.ts` onto the layer with every threshold unchanged, hold on all 13 named cities (the default, 3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3), with no named exception. The pre-check's probe measured option B passing all five on all 13 (P3 to P5 0 violations, P6 at most 3.46 bays per 100 m against 6).
   - **The supply margin is thin.** The probe's lowest supply/demand on the named cities is 0.757, on 3 x 3 seed 5, against `PARK_SUPPLY_BAND.lo` 0.75. The builder reports supply/demand for every named city. If its figure on any named city falls below the floor (or any of P1, P3 to P6 fails there), the builder stops on the stop rule (R-2) and reports with the numbers; the rule goes back to Josh through the main session. Nothing is tuned: no threshold, no constant, no order.
   - **Shortfall outside the named cities, reported, not pinned, not required.** The builder reports P1 to P6 on 3 x 3 seeds 11 to 20 and 6 x 4 seeds 4 to 20, old path beside pipeline. The expected (not required) pipeline P1 failures are the pre-check's option-B row: 3 x 3 seeds 12, 15, 17, 18, 19 and 6 x 4 seeds 5, 12, 15, 18 (the old path's are 3 x 3 seeds 12, 15, 17, 18, 19 and 6 x 4 seeds 5, 7, 11, 12, 15, 16, 18). No test names these cities, expects them to fail, or skips them. `alleys.test.ts`'s `P1_ONE_SHORT` pin (6 x 4 seeds 5 and 7) belongs to the old path and is not copied into `src/city/`.
   - Failing fixture: the default city's edge layer, typed in from the run in the test (not pinned by hash), with one block's only serving tile removed, gives P1 = 1.
5. [ ] R-1 to R-7 for `edge`, in part (the kerb line is D2's). Legend: bay, build-out, plain, kerb cut, pavement, crossing, junction, lane.

- **Files:** new `src/city/edge/`; `src/city/stages.ts` (the one line adding the edge stage to `BUILT_STAGES`); `src/city/pipeline/run.test.ts` (its "not built" example `"edge"` becomes `"buildings"`, that line only).
- **Interfaces:** `CityEdgeLayer` and its parts (`CityEdgeRole`, `CityEdgeCell`, `CityKerbCut`, `CityBayTile`, `CityKerbBay`, `CityBuildoutTree`, `CityEdgeBlock`, `CityGroundCell`, `CityYaw`) are in `src/core/cityplan.ts`, written by the lead-architect with this re-cut. D1 writes every field but `ground`, which stays absent until D2. D2 fills `ground` and adds the kerb line (typed by the architect before D2 starts).
- **Heavy:** criterion 4's report runs 40 cities (13 named and 27 others) on both paths. Its own file, a 120 s timeout.

### D2 · Stage 4, the kerb line and the ground pieces (streetscape, pure). Branch `ticket/070d2-edge-kerb`
**Branch.** Cut from `goal/city-style` at de522a8 or later (A4 to D1b merged: the split plan, one-way streets, the 6 x 6 named cities).

**Goal.** The edge layer carries every street piece (role, variant, yaw) and one kerb line along each block side, from block corner to block corner, so the assembler (E) only draws it. Josh sees the dropped kerbs and the returns at `?view=3d&city=plan&stage=edge`.

**Josh's words (20 Nov 2026, in chat).** Asked whether to start D2: "Start D2". The clauses below come from Q12 ("Yes, all four": the streets first, then D2 re-cut), `docs/design/070-streets-t-junctions.md` (S2, the kerb line's re-wording) and `docs/design/070-streets-one-way.md` (section 2's junction rectangles, section 4's kerb line).

**Re-cut (20 Nov 2026, the lead-architect, against de522a8).** Replaces the text cut before A4. What is a rule and what is a move, for the `pipeline-designer`'s pre-check (CLAUDE.md: a section that adds or changes a rule):
- **Changed or new rules (pre-check them):** criterion 3's far side of a T (S2's far-side clause: straight past, dropped at the two crossings; Proposed in the T note); criterion 2's "from block corner to block corner" (rule 10 re-worded; Proposed in the T note, section 5); criterion 4's bare one-way kerb (one-way note, section 4); the junction as a rectangle, carriageway by carriageway, as the kerb line and the ground read it (the one-way note's lattice working, Proposed; stage 1 already lays it, A4b). No number changes. The one new datum is `CITY_GROUND_VARIANT.pavementDip` (a variant bit, not a rule).
- **Moves (no pre-check):** criterion 1's ground cells (`tilecity.ts`'s "emit the cells" loop), criterion 2's `kerbLine` (`kerbline.ts`), criterion 5's two additions (already in grammar rule 10's check, made tests here), criterion 6's G4 (the grammar's check, on the layer).

1. [ ] **Ground cells** (`ground`, Vitest). Every cell of `CityEdgeLayer.cells` is in `ground` exactly once (a `ParkingLines_01` tile is one record with `cells` 2, on the tile's first cell), with the edge cell's `role` and `street`, on every street of every section: two-way (5 cells), one-way with parking (4) and bare one-way (3).
   - **Moved:** the yaws (`yawOfBand`, `yawToward`, `cornerYaw`) and variants of `tilecity.ts`'s "emit the cells" loop (lines 1557 to 1606), re-keyed on `rand` (R-3): lane patches (`rand("patch", i, j)`, one in `PATCH_ONE_IN`), grates (`rand("pave", i, j)`, one in `GRATE_ONE_IN`), `pavementReturnNear` / `pavementReturnFar` beside a kerb cut, `pavementFlush` in front of a build-out. A one-way street's one lane is `laneRight` 0. `PATCH_ONE_IN` and `GRATE_ONE_IN` are typed-in copies in `src/city/edge/constants.ts`, and they and `CITY_GROUND_VARIANT`'s six old bits are pinned equal to `tilecity.ts`'s (`LANE_RIGHT` and the rest) in `constants.test.ts`, as D1's constants are.
   - **Junction rectangles** (A4b): a `junction` cell is any cell of a `CityJunction.cells`, 1 x 1 to 3 x 3, with yaw 0 and variant 0; a `crossing` is turned along its own carriageway street, whatever that street's width. Fixture: a T where a bare one-way street (3 cells) ends on a two-way street gives a 3 x 1 junction, one crossing row of 1 cell across the ending street and two of 3 cells across the through street, each crossing yawed as `yawToward(its street's axis, 1)`.
   - A test checks the shape on the 20 named runs: every record's centre is its cell's centre (or the shared edge for a 2-cell tile), every yaw is in `CityYaw`, every variant uses only its role's bits, a grate never carries a kerb bit.
2. [ ] **The kerb line, moved, block corner to block corner** (`kerb`, Vitest). `kerbLine` (`src/render3d/kerbline.ts`, 063 F) is moved into `src/city/edge/`, reading `ground` and stage 1's streets; `kerbline.ts` stays for `city=tiles` (R-9) and is not edited.
   - **Its own cells only** (as D1b criterion 5 for the band scan): a street's path walks only the street's own `span` and the pavement and kerb-cut cells whose `street` is its own. Fixture: a street that ends in a T, its lattice line running on past the junction into another street's pavement, has no path cell beyond its span.
   - **One path per block side** (rule 10 re-worded: "from block corner to block corner"). Each `CityBlockSide` of every block has exactly one path with that `faces` and `blockSide`, whose first and last points are on the side's two corners (its `span`'s ends, on the kerb line), however many blocks are across (`across`) and however many junctions face it. The outer pavement of an edge street has one path per stretch between pavement corners, `faces` "outer". The chain is unbroken: consecutive segments join end to end (an `opening` is on it).
   - **The 063 F cases still hold** (criteria 33 and 37a): `kerbline.test.ts`'s `kerbLine` fixtures are typed into `src/city/edge/` and give the same segments, points, dips, openings and returns (the old fields; the new ones as criteria 3 to 5 say). Its kerb-face cases (criteria 34, 35, 37b, 37c: `tileKerbPlan`, the pack's insets) are drawing, stay in `src/render3d/` and are E's. Its failing fixtures for the line: an inlet with one return removed, a build-out stretch with its flank removed, a return that stops short of the building line each fail the edge check, naming the rule.
3. [ ] **The far side of a T: straight past, dropped at the two crossings** (S2; Vitest). On a block side's `junctions` entry (the far side of a T, `CityJunctionFacing`), the path runs straight along the kerb, with no return and no corner, past the whole facing `span`.
   - The two pavement cells at the span's ends (`span.lo` and `span.hi - 1`, where the crossings across the through street land; the ending street 5, 4 or 3 cells wide) carry `pavementDip` in `ground` and a `crossingDip` segment on the chain. The cells between them are plain `edge` (a junction is in front of them, never a build-out). No other cell carries `pavementDip`.
   - The same holds on the outer pavement of an edge street where an inner street ends on it.
   - Fixtures: a 14-cell block side facing a two-way T has one path, exactly two `crossingDip` segments 4 cells apart along it, and no return between them; the same side facing a bare one-way T has them 2 cells apart. On the 20 named runs, the number of `pavementDip` cells is exactly twice the number of T junctions (one far side per T).
4. [ ] **A bare one-way street's kerb** (one-way note, section 4; Vitest). On a `oneWayBare` street (no parking band, S10), each path is straight from block corner to block corner: every `edge` and `crossingDip` at the pavement's carriageway edge, no `flank`, no build-out. A vehicle opening's mouth on it still turns in with its two returns (rule 10; its kerb cut has `plain` null, D1). On a `oneWay` street the side without the parking band has no build-out either. Fixture: a block side on a bare one-way street with one court drive gives `edge`, `return`, `opening`, `return`, `edge` and no `flank`.
5. [ ] **The grammar's two additions** (rule 10's check, 065 criterion 10; Vitest on the 20 named runs, and failing fixtures).
   - **No return at a plaza, park edge or walk-through.** Every return's `opening` is a `CityKerbCut.opening` whose kind is `lane`, `drive` or `frontLot`, and each such mouth has exactly two returns, `near` and `far`. A plaza, park or walk-through (empty `mouth`) has none: the path runs straight past. Failing fixture: a plaza typed in with a kerb cut in front fails, naming the addition.
   - **Each return ends on the corner column's wall plane.** Each return's `end` lies on the building line, within 0.05 m of the wall plane of the built cell beside the opening on that side (`mass.built`): the cell edge, until F2's `BODY_M` table exists (F2 then re-reads it; D2 does not wait for it). Failing fixture: a return 0.1 m short fails.
6. [ ] **G4 on the layer** (`check.ts`, Vitest). Every court touches its opening (`CityCourt.opening`'s cells share an edge with the court's stall or aisle cells, or are them); every mouth cell of every vehicle opening has its kerb cut (D1b criterion 7, kept); each of a lane's two ends has its cut. It holds on the 20 named runs; failing fixtures: a lane with one end's cut removed, a court whose opening is moved off it.
7. [ ] **The picture** (R-5). The legend gains one entry, "dropped kerb" (a `pavementDip` cell), and the points gain one per return's `end` ("kerb return"). The R-5 test covers both; the plan view needs no change.
8. [ ] **R-1 to R-7 for `edge`, completed.**
   - R-2: the kerb line, the two additions and G4 hold on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on). Outside cities (3 x 3 and 6 x 4 seeds 1 to 20, off and on) are reported, not asserted. **Stop rule:** a named run that fails stops the builder, who reports with the cells; nothing is tuned.
   - R-4: edge's four digest pins are re-taken on 6 x 6 seeds 1 (the default), 2, 3 and 8, one-way on, and the test names them as moved by D2 (`ground` and `kerb` added). Streets', land's and mass's pins do not move. A test says the stage always writes `ground` and `kerb`.
   - R-6: the moved code imports only `src/core/` and `src/city/`; the grep test that no edge file reads `bi`, `bj` or a street's `line` still passes.
   - R-7: the kerb walk and the ground loop are linear in street cells (each street walks its own span); the reviewer checks this.
   - Tests run: `npx vitest run --maxWorkers=2 src/city/streets/ src/city/land/ src/city/mass/ src/city/edge/` and one `npx tsc --noEmit`.

- **Files:** `src/city/edge/`.
- **Must not:** every other folder; `src/render3d/kerbline.ts`, `tilecity.ts` and their tests (the old path, R-9); the docs (rule 10's text is re-worded only in L).
- **Interfaces** (written by the lead-architect with this re-cut, in `src/core/cityplan.ts`): `CITY_GROUND_VARIANT` (the variant bits; `pavementDip` 16 is new); `CityGroundCell`'s comments (one record per cell, a bay tile as one); the kerb line: `CityKerbPoint`, `CityKerbSegKind` (the old kinds plus `crossingDip`), `CityKerbSeg`, `CityKerbReturn` (plus `opening` and `end`), `CityKerbPath` (plus `faces`, `blockSide`); `CityEdgeLayer.kerb`. `ground` and `kerb` stay optional in the type so D1's fixtures compile; from D2 the stage always writes both. No new dependency.
- **For E (not D2's work):** E draws a `pavementDip` cell as `Sidewalk_Dip_01` (the pavement's yaw; the piece's kerb is on +z like the straight's) and reads `kerb` for the kerb faces instead of recomputing them. E's own re-cut says so.
- **Heavy:** the named-run tests build the 10 named cities both ways once through `stage.test.ts`'s module cache; the outside report stays in `report.test.ts` (120 s).

### E · Assemble, first cut: the ground and the massing in 3D (renderer). Branch `ticket/070e-plan3d-massing`
**Goal.** At `?city=plan` (3D) Josh walks the pipeline's city: the street edge drawn with today's tile pieces, the interiors paved and green, and every built cell a plain grey box three storeys high. He judges the mass in 3D before a single building is chosen (Q2).

1. [ ] **Plan to scene** (`src/render3d/plan3d.ts`). It draws `edge`'s ground cells and `mass`'s interior uses through `tilecity3d.ts`'s existing tile drawing and `tileslots.ts`'s keys. Built cells are one `InstancedMesh` of boxes.
   - It reads the plan and decides nothing: a test diffs the plan's digests before and after drawing.
2. [ ] **Draw calls.** At most `TILE_DRAW_CALLS_MAX` plus 1. Day and night as `city=tiles`.
3. [ ] **Paving through both rings.** Drive, walk-through and lane-mouth cells take 063 H's paving (from 066 criterion 4).
4. [ ] (Main session, screenshots: overhead and street camera, day, default city and 6 x 4 seed 3; from 20 Nov 2026, Q17, the default is 6 x 6 seed 1 and the second city 6 x 6 seed 3) no ground shows between built cells; rings stand back to back; drives and walk-throughs are paved; kerbs return at drives and lane mouths.
5. [ ] **One-way streets (from A4b; Josh's Q5 on the one-way note: "the kit has them, use them").** E draws, and decides nothing:
   - each cell in stage 1's `arrows` takes the City Pack's `SM_Env_Road_Arrow_01` (or `_02`, once the renderer has measured what `_02` shows), turned to point `toward`. The renderer measures each arrow piece's own pointing direction as `tileslots.ts` does the other road pieces' turns, and a test pins it inside `it.skipIf(!have)` (R-6);
   - the other lane cells of a one-way street take `Road_Lines_01` or `Road_Bare_01`, never the two-way's yellow centre-line pieces;
   - each new key is one instanced mesh, and the renderer reports whether criterion 2's cap still holds;
   - `SM_Prop_Sign_Arrow_01` on the pavement at a one-way entry is optional, not required (not yet seen rendered).
   - (Main session, screenshot) a one-way street in the street camera, its arrows pointing with the traffic.

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
4. [ ] **No door behind a stall** (from the yard court, Josh's ruling 2, 19 Nov 2026: "Yes, all four"). No door on a column whose open side is a stall cell. Holds on the named cities (Vitest). Failing fixture: a residents' door on a ring-2 column facing a yard court's stalls.

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
   - **Lines that change with Josh's four rulings of 19 Nov 2026 ("Yes, all four"; B2 and C2):**
     - grammar rule 4's table: the 6-or-more row says a part whose interior is 2 cells deep parks in its own paved yard (a drive in, six stalls along the far side, the near side the aisle), and a lane leaves no court part with a long side under 8;
     - grammar rule 6's walk-through row and its Decided paragraph: "only for an interior that has no drive and no lane" becomes "only for an interior that has no drive" (a lane beside the rings is not a way in);
     - guide 18.1: `PARK_PER_HOME` 0.075, not 0.15, with Josh's ruling; and the same number where it is repeated (the guide's 057 Q3 default and its constants table row, and grammar rule 5's parking estimate).
   - **Lines that change with Josh's answers to the A4 pre-check (20 Nov 2026, Q14):** guide chapter 18's P1 and its constants table row: the kerb supply floor `PARK_SUPPLY_BAND.lo` is 0.69, not 0.75 ("yes lower it"), for kerb bays only (P2's lot band stays 0.75 to 1.5); and P3's cap counts over the whole block side ("1. yes"). The old path's 0.75 and its pin go with the old path.
   - **Lines that change with Josh's answers of 20 Nov 2026 (Q17, Q18):** guide 19.6's whole-block park and its Info line: a whole park that nothing across a street can serve takes one tile of kerb bays on its own kerb ("yes, yes"; D1b criterion 13), and the first tiles are handed out as a best fit over the city ("yes"; D1b criterion 12). L (renderer) makes this edit; no earlier section touches the guide. The guide's named cities for its checks become the pipeline's (6 x 6 seeds 1 to 10) when the old path goes.
3. [ ] R-8. The playtest shows no ladder change.

- **Files:** `tilecity.ts` and its tests, `renderer.ts`, `docs/city-style-guide.md`, `styleguide.test.ts`; `docs/city-grammar.md` (only the lines listed under criterion 2: rule 4's table, rule 6's walk-through row and its Decided paragraph, rule 5's parking estimate).

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
- **Typed by the architect before their sections start:** `CityEdgeLayer` (written 20 Nov 2026 with D1's re-cut: dressed cells, kerb cuts, tiles, bays, build-out trees, per-block shortfall, and `CityGroundCell`, the same shape as `TileCell`, for D2 to fill; the kerb line is typed before D2), `CityBuildingsLayer` (before F1), `CityFacadesLayer` (before H1), `CityGroundLayer` (before I), and `CityCircuitLayer` (at 059's re-cut).
- **Typed 20 Nov 2026 for A4** (standalone until A4's criterion 0 wires them into `CityStreetsLayer`): `CitySpan`, `CityJunctionKind`, `CityStreetEnd`, `CityPlanStreet`, `CityJunction`, `CityBlockAcross`, `CityJunctionFacing`, `CityBlockSide`, `CityPlanBlock`, `CityOutline`, `CityStreetsLayerA4`. On the split plan `bi`, `bj` are ranks and a street's `line` an ordinal, never grid coordinates; B3, C3 and D1b replace every read of them.
- **Typed 20 Nov 2026 for A4b** (standalone until A4b's criterion 0 folds them into `CityPlanStreet` and `CityStreetsLayer`): `CityStreetSection`, `CityStreetFlow`, `CityStreetTraffic`, `CityStreetArrow`, `CityPlanStreetA4b`, `CityStreetsLayerA4b`. E reads `arrows`; K (cars, later) reads `flow`.
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
   - **Closed, not needed (19 Nov 2026).** C2's stop rule fired, and the options note (`docs/070-c2-options.md`) found P2 holds on all 13 named cities with two lots a block once the ratio is 0.075 and yard courts exist. Asked "Do you approve all four rulings as recommended ("Yes, all four"), or do you want to keep 0.15 instead?", Josh answered: "Yes, all four". So `LOTS_PER_BLOCK_MAX` stays 2.
6. **Should the pipeline fix the cause of P1's known shortfall, or inherit it?** On the old path P1 fails on 3 x 3 seeds 12, 15, 17, 18, 19 and 6 x 4 seeds 5, 7, 11, 12, 15, 16, 18, which he accepted with the 063 B merge.
   - **Answered: fix, in D1 (Josh, 20 Nov 2026, in chat).** The D1 pre-check found the pipeline failing P1 on two named cities too (6 x 4 seeds 1 and 2). Asked "On the pipeline, two named 6x4 cities (seeds 1 and 2) leave a block with no kerb parking, because the new shop count is about 25% higher. Should D1 give every block its first kerb tile before the rest are shared out (Yes), or stop as written (No)?", he said "you should ask the design agent"; told the note already recommends Yes (option B) but the decision is his, and asked "Shall I go with the design agent's recommendation (Yes), or send it back to look for more margin first?", he answered: "yes". So D1 adds the first-tile pass (criterion 2). The cities still short outside the named list are reported, not pinned (criterion 4). A block left short is recorded in the edge layer and the stage does not throw.
7. **The lane-less 6 x 6 court part (from the C1 review): settled by rulings 3 and 4.** C1's reviewer found that such a part cannot take a walk-through without un-blinding a ring-2 corner (rule 4) or leaving a 1-cell stretch (rule 6). Josh's rulings 3 and 4 ("Yes, all four", 19 Nov 2026) settle it: Land no longer cuts a lane that leaves a short court part (B2), and a driveless court part beside a lane gets a walk-through (C2). One case is left: a whole 6 x 6 block from the streets that Land leaves alone. It stays an honest M5 failure (R-2), never patched or pinned, and never occurs on the named cities. Not asked now; it returns when larger cities are looked at.
8. **Which street plan for stage 1?** (`docs/design/070-streets-t-junctions.md`, question 1.) **Answered, Josh, 20 Nov 2026, in chat.** Asked "Which street plan do you want for stage 1?", he answered: "C, split plan". So A4.
9. **May the pipeline's cities stop matching `city=tiles`?** (Note question 2.) **Answered** with 10 to 12: asked "Do you approve 2 to 5 as recommended ("Yes, all four"), or do you want to take them one at a time?", Josh answered: "Yes, all four" (20 Nov 2026, in chat). `city=tiles` keeps today's grid until L; every pin of stages 1 to 4 is re-taken once.
10. **May `blocks=3x3` mean the size of the city, not an exact count?** (Note question 3.) **Answered: yes** ("Yes, all four"). R-7 and A4 criterion 2.
11. **May nothing a car enters face a T?** (Note question 4, rule S6.) **Answered: yes** ("Yes, all four"). S6 is Josh's ruling. It lands in B3 (lanes) and C3 (drives, frontage lots, M5), cut after the pre-check; A4 only publishes the junction-facing stretches.
12. **Do the streets go first?** (Note question 5.) **Answered: yes** ("Yes, all four"). The order is in Sections: A4, its pre-check, the re-cut of Land, Mass and Edge, then D2 and E.
13. **May A4 be reviewed on its own folders' gate, and merge only with B3, C3 and D1b?** (New, 20 Nov 2026, from cutting A4; a process question about CLAUDE.md's loop, not a rule.) CLAUDE.md's loop runs the full `npm run gate` before a review. On A4's branch Land's, Mass's and Edge's tests must fail (their pins and checks run on new cities), and the pre-check, not A4, is what measures them. **Answered, Josh, 20 Nov 2026, in chat.** Asked "May A4 be reviewed on the smaller gate (typecheck plus the streets, pipeline and plan-view tests), and merge only together with B3, C3 and D1b once the full gate is green?", he answered: "yes". So A4's Merging paragraph stands.
   - Recommendation (as cut): yes. A4's gate is `tsc` plus `src/city/streets/`, `src/city/pipeline/` and `planview.test.ts`; the full gate runs before the four merge together into `goal/city-style`. The other way, A4 would have to re-take Land's, Mass's and Edge's pins before anyone has measured them, which is the order Josh's answer to question 12 rules out.
   - **A4b, the same terms (20 Nov 2026).** A4b changes stage 1 again, before the pre-check, by Josh's answer to the one-way note's question 4 ("do what you recommend": A4b on A4's branch, after A4's review, before the pre-check). So A4b is reviewed on the same small gate and held with A4; the set merges in the order A4, A4b, B3, C3, D1b once D1b's full gate is green (Merging). No new question: this applies his "yes" here and his Q4 answer there.
   - **A4c, the same terms (20 Nov 2026).** A4c changes stage 1 again, by his answer 3 to the A4 pre-check ("3. yes", Q14). It is reviewed on A4's small gate and held with A4; the set is now A4, A4b, A4c, B3, C3, D1b, merging together in that order once D1b's full gate is green (Merging). No new question.
14. **The A4 pre-check's four questions** (`docs/design/070-A4-precheck.md`, section 5). **Answered, Josh, 20 Nov 2026, in chat.** Asked the four word for word, he answered: "1. yes, 2. yes, 3. yes, 4. Lower P1's floor. Is P1's floor the parking ratio?" Told that P1's floor is the kerb-parking ratio only (kerb bays laid over shops x `PARK_PER_SHOP`, at least 0.75 city-wide, plus a tile for every block), not the lot ratio `PARK_PER_HOME` (P2), that 0.69 is just enough for 3 x 3 seed 2 with one-way off, and that with one-way on three cities still fail for other reasons, and asked "Do you still want P1's floor lowered from 0.75 to 0.69, knowing it's kerb parking only (yes), or would you rather have the street cuts redesigned instead?", he answered: "yes lower it". So:
   - 1 (yes): P3's 30% cap counts over the whole block side, not per stretch. D1b criterion 4.
   - 2 (yes): Land makes a whole park only of a block with a parking band across one of its streets (the served park). B3 criterion 2; A4c counts it.
   - 3 (yes): stage 1 redraws a split that leaves Land too few park places (S11). A4c.
   - 4 (option B, "yes lower it"): P1's supply floor `PARK_SUPPLY_BAND.lo` is 0.69 on the pipeline; `city=tiles` keeps 0.75 until L. D1b criterion 6; the checks table's second exception.
   - Then the pre-check is re-run once with all four, one-way off and on; it decides whether one-way stays on as built (Sections).
15. **What to do when 3 x 3 seed 10 with one-way on finds no split** (`docs/design/070-A4c-stop.md`, A4c criterion 4). **Answered, Josh, 20 Nov 2026, in chat.** Told that S5 (the provisional `T_SHARE_MIN` 0.5) rejects 53 of 65 draws there, then V1 38 and S4 17, he answered: "have the junctions do not need to be Ts. It should be the T's should have a floor of 0.30%". Read back as 30%, he confirmed: "Yes 30%". So:
   - S5's `T_SHARE_MIN` is 0.30, Decided, no longer provisional; a test may pin it (A4's Decided number; A4c criterion 8). S3's 7-cell gap stays provisional.
   - The literal 0.003 is not the ruling. The stop note measured it: the same draws on the named cities, but outside them it lets plans of 16% Ts (84% crossroads) through.
   - Stage 1's pin for 3 x 3 seed 2 (one-way on) moves, draw 12 to 11; the other three pins stand. All 13 named cities are ok, one-way off and on, within `BLOCK_DRAWS_MAX` 64, unchanged.
   - The stop note's questions 1 (129 split draws) and 2 (retry, one-way off, or leave seed 10 failing) are withdrawn: not needed. The margin is thin (3 x 3 seed 10 on has 1 good draw of 65, 6 x 4 seed 3 on has 2); reported, not asked.
16. **3 x 3 seed 12 with one-way off** (stop note question 3, outside the named list). **Answered, Josh, 20 Nov 2026, in chat** (put to him again as the re-run's question 3 on 3 x 3 s12 as an honest failure): "3x3 seeds are too small. They're going to result in regular failures because they cannot accommodate for all of changes I suggested. Yes". So it is an honest stage 1 failure outside the named cities, reported, never pinned, and no test asserts it either way. The text below is as it was asked. Its square ground (40 x 40 cells) always cuts into a plain grid of crossroads, 0 Ts in 1024 draws, so no T floor above 0 passes it; with one-way on it is ok. The question, word for word: "3 x 3 seed 12 with one-way streets off never finds a plan with enough T-junctions: its square ground always cuts into a plain grid of crossroads (0 of 1024 tries). It is not a named city. Leave it as an honest failure, reported and not pinned? (Yes / No)"
   - Recommendation (the note's): yes. It is an honest R-2 failure outside the named cities.
   - If Yes: A4c's report criterion names it as a known stage 1 failure outside the named cities. If No: a design note on how stage 1 cuts a square outline (with its own pre-check), before B3.
   - Until he answers, A4c criterion 6 reports it and nothing pins it.
17. **The pre-check re-run's questions, and the named cities** (`docs/design/070-A4-precheck-2.md`, its top). **Answered, Josh, 20 Nov 2026, in chat.**
   - Q1 (lever K: "Should stage 1 redraw a split that leaves a block no place for a kerb bay ... (Yes / No)?"), after a worked example (3 x 3 seed 9's corner block): "No, we need to stop basing these tests on a 3x3. Start basing them on 6x6 or greater." So **lever K is not adopted**.
   - Q2 (lever M: "Should the first pass hand out every block's first bay as a best fit over the whole city (own street first), instead of one block at a time (Yes / No)?"): "yes". D1b criterion 12.
   - Q3 (3 x 3 seed 12 an honest failure, reported, not pinned): "3x3 seeds are too small. They're going to result in regular failures because they cannot accommodate for all of changes I suggested. Yes". Q16.
   - Asked which cities the new named list should be (6 x 6 seeds 1 to 10 plus 8 x 8 seeds 1 to 3 suggested): "6x6". Asked whether the default city should become 6 x 6 seed 1: "yes".
   - So: the named cities are 6 x 6 seeds 1 to 10, one-way off and on (the orchestrator's reading of "6x6", recorded as such; no 8 x 8, which `CITY_BLOCKS_MAX` 6 would not allow); the default is 6 x 6 seed 1; 3 x 3 and 6 x 4 are outside cities, reported, never required or pinned. The pin cities are 6 x 6 seeds 1, 2, 3 and 8, one-way on (the architect's choice, R-4). A4d re-takes stages 1 to 3; A2b moves the plan view's default; D1b works on the new list.
18. **The 6 x 6 pre-check's questions** (`docs/design/070-6x6-precheck.md`, its top). **Answered, Josh, 20 Nov 2026, in chat.** Asked (1) "On the 6 x 6 cities, three whole-block parks get no kerb parking: the streets around them park on the far side, but only along sides too short for a bay, or in front of another park. Should such a park take one bay on its own kerb, only when nothing across the street can give it one (Yes / No)?" and (2) "With one-way streets on, 6 x 6 seed 2 finds no street split in 64 tries; it finds one at try 82. Should stage 1 try up to 128 splits (Yes / No)?", he answered: "yes, yes". So:
   - **PB yes:** D1b criterion 13. It changes guide 19.6 for that one tile; L edits the text.
   - **128 yes:** `SPLIT_DRAWS_MAX` 128 for stage 1's split (A4d criterion 1); the outline's `BLOCK_DRAWS_MAX` stays 64, and `tilecity.ts` is untouched.
   - The note's section 6 question 2 (PT + S11T) was asked only for a No to 1, so it is not needed; A4c and B3 do not re-open.
   - The margins the note asks to watch, reported, not asked: P1 supply 0.729 on 6 x 6 s8 on (0.039 over 0.69); T share 0.333 on s4 on (0.033 over 0.30); park places exactly equal to need on five cities.
