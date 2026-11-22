# 073 · The city's transformations: technology, the hold-out, the ruin

owner: per section (lead-architect, planner, renderer, grid-simulator, pipeline-designer, and three new agents: tech-pass, holdout-pass, ruin-pass; see Agents)
status: open. Cut 21 Nov 2026 from `docs/design/073-transformations.md` and Josh's answers on its eight cards and its questions 6 and 9. Updated the same day with his answers to this ticket's Q10 to Q15 and the feed-place card.
- **Cut in full:** A (types, no circuit; **merged** into `goal/city-transformations` at 4a5077f), A2 (the circuit references, waiting for K's type), A3 (the passes' kinds and the hold-out's steps), the B pre-check (done), B, C1, C2, F0 (**done**), the D1 pre-check (done), D1, D1g, the E2 pre-check (done), E2, the F1 pre-check (done), A4, F1.
- **Outlined:** D2, D3, J2 (instancing), E1, E1g, E3, F2, F2g, F3. Each is cut in full when what it waits for has merged.
- Questions: Q1 to Q9 of the note answered. Q10 to Q15 and the feed-place card answered (21 Nov 2026, below). The B and D1 pre-checks' questions were answered overnight, on Josh's delegation or under the goal; none is Josh's ruling and he may reverse any. **Two of them Josh should look at: B-Q3 and F1-Q1** (see "Questions for Josh").
- **Re-cut 22 Nov 2026 night, second time, under the goal:** F1 cut in full against its pre-check's answers (`docs/design/073-F1-precheck.md`), with A4 before it (the ruin's growth kinds and steps; A3's `cell` comment reworded). F1-Q6's broken road written into F2's and F3's outlines. D1's build report recorded in D1's section. The X-11 departures taken so far listed in `docs/design/073-pack-intended-use.md`. The answers are logged under "Questions for Josh", each in its group; **F1-Q1 is flagged for Josh beside B-Q3.**
- **Re-cut 22 Nov 2026 night, under the goal:** A3 cut and typed (D1's `CityTechPieceKind`, E2's `CityHoldoutPieceKind`, the hold-out's steps); E2 cut in full against its pre-check's answers; D1 told which of C1's helpers it calls. The answers are logged under "Questions for Josh", each in its group.
- **Re-cut 21 Nov 2026 night, second time, under the goal:** B and C1 cut in full against the pre-check answers; D1 cut in full; D2 and F1 take the intended-use note's plan-level readings; F0's result recorded.
- **Re-cut 21 Nov 2026 night, under the goal** (the orchestrator's instruction; Josh approved the goal, "Can we turn this into a goal and let this run over night?", and the ticket, "Approved"). Each item below is **taken under the goal (21 Nov 2026 night); Josh may reverse**. None is Josh's ruling.
  - **A split into A (now) and A2 (after K).** A types everything that needs no circuit, in a new file `src/core/cityera.ts`; A2 types the circuit references once K's `CityCircuitLayer` merges. B and C1 wait for A, not A2.
  - **The era stages and layers stay out of `CITY_STAGES` and `CityLayers`.** They are `CITY_ERA_STAGES` and `CityEraPlan`, in `cityera.ts`, so `cityplan.ts` is not edited and no clean type, digest or test moves (X-1, X-7).
  - **Sections are cut from `goal/city-transformations`**, not `goal/city-style`.
  - **D1g, a drawn section for D1 alone,** so Josh sees the tech pass's walls and pavement before D2 and D3 (which wait on K2). D3 then draws only what D1g did not.
  - **X-11, pieces used as the pack shows them.** Josh's words, relayed by the Fable planning session; the rule's wording is this re-cut's. D1 also waits for its pre-check's kit to be checked against `docs/design/073-pack-intended-use.md`.
branch: one per section, `ticket/073<section>-<slug>` (named in each), each cut from `goal/city-transformations` (taken under the goal, 21 Nov 2026 night; Josh may reverse).

## Josh's words

**What he asked for (21 Nov 2026, in chat).**
> "Eventually we are going to augment this city with technology from the sci-fi city pack. The city should showcase the integrated of technology followed by the desperate attempts to maintain power within districts (these changes will break rules). [...] transform this city into an apocalyptic ruin, littered with the remnants of a dying species."

> "The fable session will plan all of these transformations. Not just the apocalyptic one."

> "The scifi power poles are intended to be atop buildings and other objects they are not intended to come out of the ground"

> Sci-Fi City: "the iterative process on which humans build upon their city. So imagine the city as it exists today but augmented with the sci-fi city assets."

> Sci-Fi Frontier: "the ad hoc structures that the extinct human civilization would have applied to the existing city structures"; "the way that humans might live in a post-apocalyptic world for a short period of time with the technology that they had"

> Nature: "nature growing over the roads and growing over the buildings and the existing structures in many places"; "areas of the city where nature has just taken over to some degree"

> Palm City: "additional modern day assets that just didn't exist in the standard city pack"

> K1 card 5: "There are no cars anymore, if they are in use at a crossing its fine."

**His answers to the plan (21 Nov 2026, in chat, on question cards).** Quoted as he chose them. The cards' full text is the table at the top of the note.

| Card | Josh's answer | What it settles |
| --- | --- | --- |
| 1, districts | "Yes, districts (Recommended)" | `history` cuts the city into districts of 1 to 4 blocks, each with its own story |
| 2, the era switch | "Yes, eras on top (Recommended)" | the clean city stays as it is; three eras on top; a switch in the viewer |
| 3, rule breaks | all four chosen: "Wrecked vehicles", "Dark lamps and neon", "Makeshift power plants", "Makeshift lines anywhere" | B1, B2, B3, B4 to B6 |
| 4, the Apocalypse pack | "Yes, convert it (Recommended)" | F0 |
| 5, more breaks | all four chosen: "Clutter on pavements", "Trees under dead wires", "Growth on the road", "Crowded roofs" | B7 to B10, with T-1 and T-2 holding (the card's own words) |
| 6, buildings | "Yes, all stand (Recommended)" | B11 is not broken |
| 7, instancing | "Yes, lift it (Recommended)" ("Instancing becomes a section of this work, built after the technology pass is drawn and before the hold-out pass is.") | section J2, between D3 and E3 |
| 8, agents | "Yes, three agents (Recommended)" | tech-pass, holdout-pass, ruin-pass |

**Questions 6 and 9 (21 Nov 2026, in chat, his own words): "I like all of your suggestions, make them so".** He was answering a message that listed both as open, with these recommendations: "Whether a puzzle's district should be one of these history districts, with that district's makeshift plant as its feed. I recommend yes." and "Whether neon should glow on a relit circuit. I recommend a later ticket". So:
- **Q6:** a job's district is a history district by default, and its feed is that district's makeshift plant. What this changes in K1 is under "Q6 and K1" below.
- **Q9:** neon is dark in every era for now. Glowing on a relit circuit is a later ticket, not part of this one.

**His answers to this ticket's questions (21 Nov 2026, in chat, on question cards).** Each card quoted as he saw and chose it.

| Card | Asked | Josh's answer | Settles |
| --- | --- | --- | --- |
| feed place | "Your yes to 'a job's feed is its district's makeshift plant' overrides an earlier answer of yours on the circuit design: 'each job brings its own feed on a pole just outside its district'. For districts that have a plant, the feed would now sit inside the district. Is that what you want?" | **"Yes, plant inside (Recommended)"** (option: "Where a district has a plant, the plant is the feed. The circuit builder's 'feed stands outside' check skips those jobs.") | Q6 and K1, below |
| Q10 | "Which era of the city is a puzzle job played in?" | **"The ruin (Recommended)"** | a city job is played on the ruin era |
| Q12 | "The ruin pass cuts wires and topples poles as scenery. On the poles and wires a job actually uses, should that scenery damage show?" | **"No, puzzle faults only (Recommended)"** (option: "On a job's own parts only the puzzle's faults are drawn. A wire that looks cut but still carries power would mislead the player.") | F2, F2g, F3 |
| Q11, Q13, Q14, Q15 | "Four smaller questions in ticket 073, each with a recommendation: a district with no plant gets its feed on a pole just outside it; a thin wire may cross over a pole line (only solid pieces and tree canopies count as covering it); a rusted, frayed look for dead wires waits for the 2D overlay ticket; the tribe's own marks on the ruin are a later ticket. Take all four recommendations?" | **"Yes, all four (Recommended)"** | Q11: no plant, so the feed is on a pole just outside (K1's rule). Q13: a wire may cross a pole line (T-1). Q14: the dead-wire look waits for K4. Q15: the tribe's marks are a later ticket |

Nothing else in the note is a ruling. Every number, and every rule the note marks "in outline", is **Proposed** until its pre-check and Josh's answer.

## Why
- Josh wants the city to have a history: built, then augmented, then held out, then left.
- One pass per era keeps each small and owned, as 070 did for the clean city.
- Districts make the three passes agree with each other. A district that held out long is full of makeshift kit and only lightly overgrown. One left early is deep in growth.

## Goal
- Josh opens one city and steps it through four eras from one camera spot: `clean`, `tech`, `holdout`, `ruin`.
- `clean` is today's city, unchanged: same layers, checks, digests and pins.
- Each era adds pieces and changes earlier ones (remove, swap, state) through a list of changes. No earlier layer is edited.
- Each pass breaks only the rules Josh allowed for it. T-1 and T-2 hold in every era.
- A city job is played on the ruin era (Josh, Q10: "The ruin"). Its feed is its district's plant (Q6), or a pole just outside a district with no plant (Q11).
- On a job's own poles, wires and drops, only the puzzle's faults show (Josh, Q12).

## The stages

`streets, land, mass, edge, buildings, circuit, facades, ground, traffic,` **`history, tech, holdout, ruin,`** `assemble`

| # | Stage | Writes | Owner | Folder |
| --- | --- | --- | --- | --- |
| 10 | `history` | districts of 1 to 4 touching blocks; each one's `tech`, `held`, `wild` (0 to 1) | planner | `src/city/history/` |
| 11 | `tech` | adds: Sci-Fi City pieces on walls, pavements, roofs; the roof net. changes: shopfront swaps, roof props it builds over | tech-pass | `src/city/tech/` |
| 12 | `holdout` | adds: each held district's plant, makeshift lines, camps, farms, markets, stores, barricades, clutter. changes: park trees and benches removed, and what its pieces replace | holdout-pass | `src/city/holdout/` |
| 13 | `ruin` | adds: growth, remnants, wrecks. changes: the most: removed, broken, toppled, cut, boarded, dark | ruin-pass | `src/city/ruin/` |
| 14 | `assemble` | nothing; draws the plan at an era | renderer | `src/render3d/plan3d.ts` |

- The four new stages come after `traffic`. No clean stage reads them, so no clean digest moves (R-4).
- The resolver and the era runner are the planner's, in `src/city/pipeline/` (C1).
- The plan type is in `src/core/cityplan.ts` (lead-architect, section A).

## Rules every section holds

**070's R-1 to R-11 hold as written.** The named runs are 070's: 6 x 6 seeds 1 to 10, one-way off and on (20 runs). The pin cities are 070's: 6 x 6 seeds 1, 2, 3 and 8, one-way on. Outside cities (3 x 3, 6 x 4) are reported only (Josh, 21 Nov 2026: no energy on 3 x 3 failures).

On top of them:

- **X-1. The clean city is untouched.**
  - No clean layer, check, threshold, digest or pin moves.
  - No clean stage reads an era layer.
  - A pass is never judged by a clean check, and never counted in a clean budget (`DRESS_MAX`, the tower cap, P1, the kerb checks, R10's pitches).
- **X-2. Changes only through `changes`.** An era layer never edits an earlier layer (R-1). It lists typed changes by reference. One resolver applies them (C1). Nothing else does.
- **X-3. A break is scoped to its pass.** A pass may break only the rules below listed for it. Every other rule holds in it, as in the clean city.
- **X-4. T-1 and T-2 hold in every era** (below), on the resolved plan, on the 20 named runs. A pass whose era fails either throws `CityStageError` (R-2).
- **X-5. Dark, textured.** No piece is emissive or lit in any era (Q9, Josh). A pass picks only textured pieces until a texture ticket fixes the rest (108 Sci-Fi City and 188 Palm City models are untextured).
- **X-6. Density reads the story.** How much a pass puts in a district comes from that district's `tech`, `held` or `wild` only. Never from a block id, a lattice size or a hard-coded count (R-7).
- **X-7. The clean run costs what it costs today.** A run that asks for no era, or for `clean`, runs no new stage. Only an era run runs `history` and the passes up to its era (C1). So no existing test gets slower.
- **X-8. Kits are typed and pinned.** Each pass's piece sizes are typed tables in its folder, pinned against the GLB by a test in `src/render3d/` inside `it.skipIf(!have)` (R-6).
- **X-9. Never-used keys.** A key on the guide's never-used list is used only under one of Josh's breaks, for its pass, on its own piece kind. The drawn section adds that allowance to the R12 audit as one typed table, era-scoped, as TR2 did.
- **X-10. Shown, never explained.** The GDD's "What the player knows" is Decided: "The world is shown, never explained." No piece carries readable text that says what happened to the city or its people.
- **X-11. Pieces used as the pack shows them** (re-cut under the goal, 21 Nov 2026 night; Josh may reverse the wording). Josh, 21 Nov 2026, in chat to the Fable planning session (relayed by it): "Sometimes the assets are treated poorly by the city building agents. You should check some of the images on the asset pack page to ensure that the agents are using the assets properly. If they're in disagreement on how an asset should be used. A good example of this is the science fiction power pole. It's intended to be used on an existing structure and not out of the ground."
  - Every pre-check and every pass builder reads `docs/design/073-pack-intended-use.md` and uses a piece as the store images show it.
  - A use the images do not show, or contradict, is listed in the pre-check as a departure, with its reason.
  - A departure the plan needs is a question for the Fable session (answered on Josh's delegation), never a builder's decision.

**T-1 and T-2 (every era; Josh's, card 5, in the card's words).**
- **T-1, the circuit stays readable.** No piece of any pass covers a stage 6 pole, node place or street light from above, and no canopy closes over a pole line. A tree may grow beside a line, not over it.
  - **What covers** (Josh, Q13, "Yes, all four"): only solid pieces and tree canopies. A thin wire (the roof net, a makeshift line) may cross over a pole line.
- **T-2, every node place stays reachable.** From any pole a job could use, there is a way on foot along pavement or road to every other pole of its district. Barricades and growth never seal a pole in.

**The breaks (Josh's, 21 Nov 2026, cards 3 and 5). Each for its pass only.**

| # | Rule today | The break | Pass, and no other |
| --- | --- | --- | --- |
| B1 | Vehicles are never used (guide 16.6) | wrecked and abandoned vehicles as remnants | ruin |
| B2 | Lamps and light posts never used as dressing (16.6) | dark Sci-Fi lamps, neon and holograms as scenery | tech |
| B3 | Power boxes never used (16.6) | generators, solar panels, batteries as each held district's plant | holdout |
| B4 | Lines hang from power poles only (071 Q12) | makeshift lines off light posts, traffic masts and walls | holdout |
| B5 | A line crosses a street only between junctions (Q45, CK6) | makeshift lines the shortest way, over junctions too | holdout |
| B6 | Drops stay on the pole's side (CK9) | makeshift drops across a street | holdout |
| B7 | A pavement keeps its clear walk; furniture keeps `FURN_KEEP_M` from poles (rule 10) | growth, rubble and barricades on the walk and beside poles, under T-1 and T-2 | holdout, ruin |
| B8 | Nothing over 3.2 m under a wire span (`FURN_MAX_H_M`) | trees growing up through dead lines, under T-1 | ruin |
| B9 | Street trees only in build-outs; parks keep their kerb (stages 4, 8) | trees in the carriageway; parks past their kerbs | ruin |
| B10 | Roof items capped (towers 1 per 16 buildings; roof dressing counts) | many more roof items | tech, holdout; **ruin's roof growth (F1)** read as B10 by the Fable session on Josh's delegation (22 Nov 2026 night, F1-Q5; Josh may reverse) |
| B11 | Openings are the only gaps (rule 6); heights follow rule 8 | **not broken** (card 6: "Yes, all stand") | none |

So, plainly:
- The tech pass keeps rule 10, `FURN_KEEP_M` and `FURN_MAX_H_M` on the pavement. Its street tech stands where furniture may.
- Only the ruin may place vehicles. Only the hold-out may run lines off anything but a pole.
- **Not broken, on purpose** (the note): conductors stay code-drawn (042 Q9); pack cable pieces are ground clutter only; the ladder and the GDD's Decided rules are untouched.

## Q6 and K1

Josh's Q6: "I like all of your suggestions, make them so": a job's district is a history district by default, and its feed is that district's plant. Confirmed on the feed-place card, with the override of K1 question 10 put to him: **"Yes, plant inside (Recommended)"**.

**What it changes:**
- **CK14's edge.** K1 says "the edge is the designer's choice". Now the designer starts from a history district. A district of the designer's own (still 1 to 4 touching blocks) is the exception, and the note says why.
- **The feed's place.** K1 question 10 (Josh) put "each job's own feed on a pole just outside its district". For a job on a history district with a plant, the feed is the plant, inside the district. K2's check "each feed stands outside the district, joined by exactly one span that enters it" skips that job (the card's words: "The circuit builder's 'feed stands outside' check skips those jobs."). K2's cut must say so.
- **No plant** (Josh, Q11): a district with no plant keeps K1's rule, the feed on a pole just outside it, and K2's check applies as K1 wrote it.
- **CK15's places.** A node's `place` gains a plant place, `{ plant: <plant id> }`, read from the `holdout` layer. Typed by A2 (re-cut under the goal, 21 Nov 2026 night; Josh may reverse), before E1g.

**What it leaves alone:**
- CK14's extent (1 to 4 blocks, first jobs at one), the dead rest of the city, and that unnamed parts in the district are scenery.
- CK12's places for breakers, switches, fuse boxes, junctions and lamps.
- The puzzle-designer's remit: what the priests want lit, the trap, the place table, the numbers. The designer still writes every city puzzle; it now picks a history district by default.
- `puzzles/city-two-ways-round.json` (K1's worked map, block:6:6, feed outside). It stays as it is: it was laid before `history` existed.
- The ladder and `puzzles/locked/`.

**Also settled with it:** a job is played on the ruin era (Q10), and on its own parts only the puzzle's faults show (Q12).

## Sections

Order:
- A (merged) → B and C1 alongside → C2. A2 after K's `CityCircuitLayer` merges; E1, E1g and F2 wait for it.
- The B pre-check, the D1 pre-check and F0 are done.
- **A3 before D1 and E2:** the passes' kinds and the hold-out's steps (`ticket/073a3-pass-kinds`).
- **D1 and E2 after B, C1 and A3 merge.** Both are built now, their circuit keeps proven on fixtures; their digests re-pin when K2 lands (taken under the goal, 22 Nov 2026 night; Josh may reverse).
- B → D1 → D1g (after C2) → D2 (after K2) → D3 → J2 → E1 → E1g → E3 → F1, F2 → F2g → F3.
- **E2 is built beside D1, ahead of E1** (the Fable session, on Josh's delegation, 22 Nov 2026 night; Josh may reverse). Its barricades are pinned on the named runs only once E1 merges.
- **F1 is built ahead of its place in the chain** (taken under the goal, 22 Nov 2026 night; Josh may reverse): **A4 → F1, after E2 merges** (E2's barricades stand before the ruin's growth in the stage order, so option G judges growth against them). F1 does not wait for E1, E3, J2 or K2: its circuit keeps are proven on fixtures, and its pins are re-taken when an earlier pass or K2 lands, as D1's and E2's are. F1 is not drawn before J2 (F3 draws it).

Every section's must-not-touch is 070's list (`src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`, `town.ts`, `terrace.ts`, the two pin tests, `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`, the grammar and the guide), plus every clean stage folder (`src/city/streets/` to `src/city/traffic/`) unless the section names a line in it.

### A · Types without the circuit: eras, history, references, changes, era layers, the resolver's contract (lead-architect). Branch `ticket/073a-era-types`

**Re-cut under the goal** (21 Nov 2026 night; Josh may reverse). A no longer waits for K. It types everything that needs no circuit, in a new file, so nothing conflicts with K's typing in `cityplan.ts`. The circuit references are A2's.

**What A adds, in `src/core/cityera.ts`:**
- **Eras and stages.** `CITY_ERAS` (`clean`, `tech`, `holdout`, `ruin`), `CityEra`; `CITY_ERA_STAGES` (`history`, `tech`, `holdout`, `ruin`), `CityEraStage`, `CityPassStage`, `CityLayerStage`; `CITY_ERA_LAST` (clean `traffic`, each other era its own stage).
- **Stage 10.** `CityDistrict` (id `district:<its first block in streets.blocks order>`, 1 to 4 blocks, `tech`, `held`, `wild` in 0 to 1) and `CityHistoryLayer`.
- **References.** `CITY_PIECE_LISTS` and `CityPieceList` (`edge.ground`, `edge.buildoutTrees`, `buildings.pieces`, `facades.ground`, `.dressing`, `.walls`, `.roofs`, `.novelty`, `ground.props`, `traffic.pieces`); `CITY_KEYLESS_PIECE_LISTS` (the two edge lists); `CityPieceListItem` (each list's entry type); `CityPieceRef` (by id; by list, index and key guard; a column's piece by column, index and key).
- **States and changes.** `CityPieceState`, `CITY_PIECE_STATES`, `CityChange` (remove, swap, state).
- **Era layers.** `CityEraPiece<K>`, `CityEraLayer<S, P>`, `CityTechLayer`, `CityHoldoutLayer`, `CityRuinLayer` (each pass's kind is `string` until its own cut names the union), `CityEraLayers`, `CityEraPlan` (the clean plan untouched, plus the era layers and their digests), `CityEraStageFailure`, `CityEraRun`, `CityEraPicture`.
- **The resolver's contract.** `CityResolve` (`(plan: CityEraPlan, era: CityEra) => CityResolvedPlan`), `CityResolvedPlan`, `CityResolvedState`, `CityResolveFailure`, `CityResolveFailureKind`; the contract below, as the file's doc comments.

**Why not `CITY_STAGES` and `CityLayers`.** Adding the four stages to `CITY_STAGES` puts them in the clean runner's order (`runStages` sorts by it) and moves `planview.test.ts`' literals; adding the layers to `CityLayers` makes `CityStageDef`, `CityPlan.digests` and `CityPicture.stage` treat them as clean stages. Kept apart, a clean run cannot reach them (X-7) and `cityplan.ts` is untouched. C1's era runner reads `CITY_ERA_STAGES`; a failure or picture of an era stage uses `CityEraStageFailure` or `CityEraPicture`.

**The resolver's contract** (built in C1):
- `resolvePlan(plan, era)` is pure. It never mutates a layer. It returns the plan as it stands at that era: every layer up to the era, each era's adds, and every change applied in stage order, then list order.
- `clean` resolves to the clean plan itself (`CityResolvedPlan.plan` deep-equal to `CityEraPlan.plan`, same digests), with no history, adds or states.
- A removed piece is gone. A swapped piece keeps its placement with the new key. A stated piece is listed in `states`, by its place in the resolved lists; a later era's state replaces an earlier one's.
- References are read against the lists as their stages wrote them; a key guard is checked against the key as it stands when the change applies.
- No cascade: a change touches only the piece it names. (A2 adds the circuit's case.)
- It fails (a `CityResolveFailure` naming the stage and the change's index) when: a reference finds nothing (`missing`); a key guard does not match (`key`); one layer changes a piece twice (`twice`); a change targets a piece an earlier era removed (`removed`); a swap targets a keyless list's record (`keyless`).
- A later era may change an earlier era's adds, by id.

**Acceptance criteria:**
1. [x] (the architect) The types above in `src/core/cityera.ts`, exported from `src/core/index.ts`. `cityplan.ts` is not edited: `CITY_STAGES`, `CityLayers` and every clean layer's type are as they were.
2. [x] `npx tsc --noEmit` passes. `npx vitest run --maxWorkers=2 src/city/pipeline/ src/render3d/planview.test.ts` passes unchanged (no literal moves, since `CITY_STAGES` does not change).
3. [x] No circuit type is referenced. A2 is written into this ticket.

**Files:** new `src/core/cityera.ts`, `src/core/index.ts` (one line), this ticket. No new dependency.

**Done:** merged into `goal/city-transformations` at 4a5077f (under the goal). Review: meets, must-fix 0. Playtest: regressions 0.

### A2 · Types: the circuit references (lead-architect). Branch `ticket/073a2-circuit-refs`

**Waits for:** K's `CityCircuitLayer` merged (typed by another session in `src/core/cityplan.ts`) and brought into `goal/city-transformations`. **E1, E1g and F2 wait for A2.** B, C1, C2, D1, D1g and E2 do not.

**What A2 adds** (to `src/core/cityera.ts`; `cityplan.ts` only if K's layer lacks something the note for K's architect asked for):
- **Circuit references.** A `{ id }` reference may name a pole, span, drop or street light by K's id; the contract's `missing` covers them. Which states apply to which (a pole `toppled`, a span `cut`, a light `dark`).
- **No cascade on the circuit.** A pass that topples a pole lists the state of each span on it; C1's helper (or the planner's next section) fails a toppled pole with an uncut span.
- **Era-added circuit pieces.** The hold-out's plant, makeshift poles and spans, and the tech roof net, in K's shapes, ids prefixed by stage (`holdout:pole:…`, `tech:span:…`); a span's ends take any pole id.
- **The plant place** `{ plant: <plant id> }` in the city-puzzle `place` union (Q6), which E1g reads. (The Q6 section said E1g types it; under the goal it is A2's.)

**Acceptance criteria:**
1. [ ] (the architect) The types above, against K's layer as merged, exported from `src/core/index.ts`. No clean layer's type changes, except what K's own cut asks.
2. [ ] `npx tsc --noEmit` passes. `npx vitest run --maxWorkers=2 src/city/pipeline/ src/render3d/planview.test.ts` passes, or each failure is listed with the one-line change its owner makes for it.

**Files:** `src/core/cityera.ts`, `src/core/index.ts`, and `src/core/cityplan.ts` only as above. No new dependency.

### A3 · Types: the passes' kinds and the hold-out's steps (lead-architect). Branch `ticket/073a3-pass-kinds`

**Cut under the goal** (22 Nov 2026 night; Josh may reverse), from `goal/city-transformations` at 6ddffae, so D1 and E2 code against named kinds. **D1 and E2 wait for A3.**

**What A3 adds, in `src/core/cityera.ts` only** (`cityplan.ts` and `index.ts` untouched; `index.ts` already exports the file):
- **`CityTechPieceKind`** narrowed to D1's slots: `"bolt-on" | "camera" | "tall" | "overhang" | "sign" | "shopfront" | "pavement"`, and `CITY_TECH_PIECE_KINDS`. D2 widens it with its roof kinds.
- **`CityHoldoutPieceKind`** for E2: `"camp" | "water-tower" | "farm" | "irrigator" | "stall" | "container" | "clutter" | "roof" | "barricade"`, and `CITY_HOLDOUT_PIECE_KINDS`. "container" is the stores kind (the note's "Parking stalls: stores"); there is no other. E1's plant and makeshift poles, lines and drops are typed with A2, in K's shapes.
- **The hold-out's steps**, so E2's barricades have their own digest:
  - `CITY_HOLDOUT_STEPS` (`"power"`, `"settle"`, `"barricade"`, in run order) and `CityHoldoutStep`.
  - `CITY_HOLDOUT_STEP_OF`: each hold-out kind's step (every E2 kind "settle" except "barricade"; E1's join "power").
  - `CityHoldoutStepCount` (`step`, `adds`, `changes`).
  - `CityHoldoutLayer` becomes an interface: `CityEraLayer<"holdout", CityEraPiece<CityHoldoutPieceKind>>` plus `steps?`. Its adds and changes are listed step by step, and `steps` gives each step's counts. It is optional only so a layer with no steps (a test double, C1's fixtures) still type-checks; the pass always writes it.
  - `CityHoldoutStepPart` (`stage`, `step`, `adds`, `changes`): one step's slice. A step's digest is `digestOf` of its slice.
- `CityTechLayer` narrows through its kind. `CityRuinPieceKind` stays `string` (F1, F2).

**Acceptance criteria:**
1. [x] (the architect) The types above in `src/core/cityera.ts`. `cityplan.ts` is not edited.
2. [x] `npx tsc --noEmit` passes. `npx vitest run --maxWorkers=1 src/city/pipeline/` passes unchanged.
3. [ ] **When C1 merges beside A3** (the main session, in the merge): C1's `erafixtures.ts` `add()` returns `CityEraPiece` with `kind: "thing"`, a `string`. Under the narrowed kinds that no longer fits a tech or hold-out layer, so `npx tsc --noEmit` fails on C1's tests. The fix is one line in C1's fixture file, the planner's: `add()` returns `CityEraPiece<never>` with `kind: "thing" as never`. It goes in C1 before it merges, or as the planner's one-line follow-up. (See "Questions for Josh", A3's point.)

**Files:** `src/core/cityera.ts`, this ticket. No new dependency.

### A4 · Types: the ruin's growth kinds and steps (lead-architect). Branch `ticket/073a4-ruin-kinds`

**Cut under the goal** (22 Nov 2026 night; Josh may reverse), so F1 codes against named kinds, as D1 and E2 do. **F1 waits for A4.** To be typed from `goal/city-transformations` before F1 starts.

**What A4 adds, in `src/core/cityera.ts` only** (`cityplan.ts` and `index.ts` untouched):
- **`CityRuinPieceKind`** narrowed to F1's slots, and `CITY_RUIN_PIECE_KINDS`. F2 widens it with its remnants (wrecks, rubble, logs, fallen signs, barricades).
  - `"patch"`: ground cover on a grown carriageway, parking band, junction, crossing or open-ground cell.
  - `"clump"`: a fern, bush or overgrowth edge on a grown pavement cell's wall line.
  - `"sapling"`: a ruin tree (birch or round) in a grown cell.
  - `"park-tree"`: `Tree_Generic_Giant_01` or `Tree_Large_01` in a park.
  - `"roof"`: growth on a roof deck.
  - `"vine"`: an `Env_Vines_*` hung from a roof edge, an awning or canopy, or a post.
  - `"tree-vine"`: a `Tree_Vines_*` hung from a tree's branches.
- **The ruin's steps**, so F1's digest does not move when F2 lands (as E2's settle part does not move for its barricades):
  - `CITY_RUIN_STEPS` (`"growth"`, `"remnants"`, in run order) and `CityRuinStep`.
  - `CITY_RUIN_STEP_OF`: every F1 kind is `"growth"`. F2's kinds join `"remnants"`.
  - `CityRuinStepCount` (`step`, `adds`, `changes`).
  - `CityRuinLayer` becomes an interface: `CityEraLayer<"ruin", CityEraPiece<CityRuinPieceKind>>` plus `steps?`. Optional for the same reason as the hold-out's (test doubles, C1's fixtures); the pass always writes it.
  - `CityRuinStepPart` (`stage`, `step`, `adds`, `changes`): one step's slice, digested with `digestOf`.
  - Why growth first: F1 is built first, and F2 appends after it. F2's wrecks and rubble are then placed against the growth (option G, as F1's growth is placed against E2's barricades), and F1's pin does not move.
- **`CityEraPiece.cell` reworded (comment only, no type change).** A3's comment says "the cell its pivot stands in". D1 as built uses the host cell for wall pieces and shopfronts (D1's build report, below). The new comment: the cell the piece belongs to. For a piece on the ground or a roof, the cell its pivot stands in. For a piece on a wall (a bolt-on, a camera, a tall piece, an overhang, a sign, an added shopfront, a vine on a face or awning), its host: the built cell whose face it is on. F1's vines follow it.

**Acceptance criteria:**
1. [ ] (the architect) The types and the comment above in `src/core/cityera.ts`. `cityplan.ts` is not edited.
2. [ ] `npx tsc --noEmit` passes. `npx vitest run --maxWorkers=1 src/city/pipeline/` passes unchanged. C1's fixture `add()` already returns `CityEraPiece<never>` (A3 criterion 3), so the narrowed ruin kind breaks no fixture.

**Files:** `src/core/cityera.ts`, this ticket. No new dependency.

### The B pre-check · history, and T-1 and T-2 on the clean city (pipeline-designer). No branch: a note `docs/design/073-B-precheck.md` and a probe outside the repo

**May start now,** on `goal/city-style` as it stands. It uses the K1 pre-check's probe for poles, lights and node places until K2 exists.

**It measures, on the 20 named runs, and sets no threshold of its own:**
- **Districts** as the note proposes (1 to 4 touching blocks): how many per city; the sizes; every block in exactly one; how many single blocks are left that touch no free neighbour.
- **The stories:** the spread of `tech`, `held`, `wild`; how `tech` falls off from its centre (by street steps); how strongly `wild` follows `held`; how many districts have `held` near 0 (no plant, so the feed is a pole just outside: Q11, Josh).
- **Jobs (Q6):** for each district, the CK12 places it holds (poles with 2 and 3 or more attachments, buildings with drops, posts), so the designer knows which districts can hold a job.
- **The plant's ground:** each district's largest open place (court, park, lot, plaza) by cells. Districts with none.
- **T-1 on the clean city:** every clean piece that covers a pole, a node place or a street light from above (awnings, build-out trees, stage 7 boxes), with its run. If the clean city fails T-1, that goes to Josh before any pass, never tuned.
- **T-2 on the clean city:** whether every district's poles reach each other on foot along pavement and road. Its graph (which cells count as walkable) is the note's reading, written down for C1.
- The time per city for `history`.
- **It proposes:** the district rule, the story rule, the T-2 walk graph, and how T-1's "covers from above" is measured for solid pieces and canopies (wires never cover: Q13, Josh). Each comes with a recommended answer first, as a question for Josh.

**Done 21 Nov 2026:** `docs/design/073-B-precheck.md` (a sketch: stage 6 is not built, so its circuit is K1's words laid by a probe). Its five questions were answered on Josh's delegation (B-Q1 to B-Q5, under "Questions for Josh"). B and C1 below are cut against those answers.

### B · Stage 10, `history`: districts and their stories (planner, pure). Branch `ticket/073b-history`

**Waits for:** A (merged). The pre-check's answers are in (B-Q1, B-Q2: on Josh's delegation; Josh may reverse).

**Goal.** Every named city is cut into districts of 1 to 4 touching blocks. Each has a short story: `tech`, `held`, `wild`. `?city=plan&stage=history` shows them on Josh's phone.

**The district rule (rule A of the pre-check; B-Q1).**
- Take the blocks of `streets.blocks` in a hashed order (`history:<seed>:order:<block id>`).
- Each block not yet in a district starts one. Its size is hashed: 1 block 20%, 2 blocks 30%, 3 blocks 25%, 4 blocks 25%.
- It grows, one block at a time, onto the free neighbour across a street (`sides[*].across`) with the longest shared stretch of street with the district so far. On a tie, the least block id.
- It stops at its size, or when no neighbour is free. (A block whose size was 2 to 4 but whose neighbours are all taken stays a single: 1 to 5 a run in the pre-check.)
- Its id is A's: `district:<its first block in streets.blocks order>` (the type's doc comment, merged). The pre-check wrote "least block id"; the merged type governs.
- It reads only `streets.blocks` and the hash. Never `bi`, `bj` or a street's `line` (R-7).

**The story rule (the pre-check's section 3; B-Q2).**
- **`tech`.** The centre is the district holding the hashed-first inner block (an inner block has no side without a block across it). A district's step is the fewest streets crossed from the centre district's blocks to one of its own. `tech` = 1 − step / (the city's most steps + 1), ± 0.1 by hash. If a city has no inner block, the centre is the district of the hashed-first block (no named run has none).
- **`held`.** A hash u in 0 to 1. Where u < 0.25, `held` is 0: the district was left at once, gets no plant, and its feed is a pole just outside it (Q11, Josh). Otherwise `held` = (u − 0.25) / 0.75.
- **`wild`.** 1 − `held`, ± 0.15 by hash.
- Every value is rounded to 2 decimals and clamped to 0 to 1. Each hash is keyed `history:<seed>:<what>:<district or block id>`.

**Acceptance criteria** (Vitest unless said):
1. [ ] On the 20 named runs, every block is in exactly one district. Each has 1 to 4 blocks that touch across a street (`CityPlanBlock.sides[*].across`). Each district's id is its first block's, in `streets.blocks` order.
2. [ ] The districts follow the district rule above, and each story follows the story rule above (answered on Josh's delegation, B-Q1 and B-Q2). Each value is in 0 to 1, at 2 decimals. A hand-worked fixture city (at least 6 blocks, one inner) has its districts, steps and stories worked out by hand in the test, against a fixed hash.
3. [ ] The picture (R-5): one legend entry per district band, and the district's id per cell. The R-5 test as 070's.
4. [ ] R-1 to R-7: the layer is frozen; the digest is pinned on the four pin cities; a test double for `history` leaves every clean digest equal; the same city run twice gives the same layer; no file of the folder imports another stage folder or reads `bi`, `bj` or a street's `line`.
5. [ ] `src/city/stages.ts` gains `historyStage` (one line), behind C1's era runner so a clean run never runs it (X-7). If C1 is not merged yet, B adds it to a separate era list C1 reads.
6. [ ] The numbers (reported, not asserted), beside the pre-check's sketch: districts per run by size (sketch: 12 to 23 a run, 348 in all; sizes 1/2/3/4 at 117 / 111 / 65 / 55; singles with no free neighbour 1 to 5 a run), the stories' spread (sketch: `tech` median 0.61; `held` 0 on 1 to 10 districts a run; `wild` against `held` r = −0.97), the mean `tech` per step, the time per city (sketch: 0.2 to 0.8 ms).
7. [ ] (main session, phone screenshot) `?city=plan&stage=history` on 6 x 6 seed 1.

**Files:** new `src/city/history/`; `src/city/stages.ts` (one line). The builder runs `npx vitest run --maxWorkers=2 src/city/history/ src/city/pipeline/` and one `npx tsc --noEmit`.

### C1 · The resolver, the era runner, and T-1 and T-2 (planner, pure). Branch `ticket/073c1-resolver`

**Waits for:** A (merged). The T readings are answered (B-Q3, B-Q5: on Josh's delegation; Josh may reverse. **B-Q3 is the one Josh should look at**).

**The circuit it reads.** T-1 and T-2 read poles, street lights, lamp-post places and drops from the plan's stage 6 layer. Until K2 merges, that layer is empty on `goal/city-transformations` (`cityplan.ts`: "until then the layer is empty"). So on the named runs both checks find no point to judge until then; the fixtures carry their own hand-placed poles. The pre-check's numbers below are what the clean report should give once K2's circuit is in (a sketch, from K1's words laid by a probe).

**T-1's reading (B-Q3; Q13, Josh).**
- **Judged:** only what an era adds or swaps (its `adds`, and a swapped piece at its new key's bounds), against every pole, street light, lamp-post place and drop end. The clean city's own pieces are never failed (X-1: a pass is never judged by a clean check).
- **A solid piece covers** a pole, a street light or a lamp-post place when its plan footprint (its kit bounds at its placement, after its turn), widened by 0.15 m, contains the point. Its height does not matter.
- **A drop end** (a building's lamp place) is covered when a piece whose top is over 5.5 m stands over any point of the drop's first 2 m from the wall.
- **A canopy** is a disc of half the tree key's wider bound. It covers a point within its radius plus 0.15 m. It "closes over a pole line" when it meets an along, corner or crossing span in plan.
- **Wires never cover** (Q13, Josh: "Yes, all four"). A roof-net or makeshift span over a pole line is reported, never failed.
- **The clean clashes** (clean pieces over or on those points, by the same reading) are reported each run, never failed.

**T-2's walk graph (B-Q5).**
- **Walkable:** every stage 1 street cell (`streets.cells`: pavement, pavement corner, kerb cut, crossing, parking band, lane, junction), joined to its four neighbours.
- **Closed:** a cell where a piece standing on the ground (base under 2 m) covers the cell's centre, on the resolved plan, clean pieces included.
- **Never in the graph:** service lanes, walks, plazas, courts and parks.
- A pole's own cell is its start, closed or not.
- **Fails** when any pole of a district cannot reach every other pole of that district. This judges the whole resolved plan: the clean city passes it (pre-check: 0 districts fail on 20/20).

**Goal.** One pure helper turns a plan into the plan at an era. A run can ask for an era. T-1 and T-2 can be checked on any era.

**Acceptance criteria** (Vitest):
1. [ ] `resolvePlan(plan, era)` in `src/city/pipeline/` meets A's contract. Fixtures: each change kind on each `CityPieceList`; a change by id; every failure case in the contract, each failing with the stage named.
2. [ ] `clean` resolves to the plan itself on the 20 named runs, deep-equal.
3. [ ] **The era runner.** `runCity(options)` and `runCity(options, until)` for a clean stage run exactly what they run today (X-7). A new `runCityEra(options, era)` runs the clean stages, then `history` and the passes up to the era's last stage. A test shows a clean run calls no era stage.
4. [ ] `t1Failures(resolved)` and `t2Failures(resolved)` with the readings above (answered on Josh's delegation, B-Q3 and B-Q5), and `t1CleanClashes(resolved)`, the clean report. Each check has a failing fixture and a passing control: an era add on a pole, on a light, on a lamp-post place, over a drop end, and a canopy meeting a span (each fails); the same clean piece in the same spot (reported by `t1CleanClashes`, never a T-1 failure); a span over a pole line (never a failure, Q13); a ground piece that seals a pole in (T-2 fails) and one that leaves a way round (passes). On the clean city: `t1Failures` and `t2Failures` are empty on the 20 named runs; `t1CleanClashes` is reported per run in the hand-back, not asserted. Until K2 it is empty (no circuit). Once K2 is in, the pre-check's sketch says it should give, a run: poles 5 to 18 (street furniture on the spot; pavement-tree canopies 0 to 7), street lights 1 to 8, lamp-post places 5 to 16, drop ends 11 to 25 (escapes 7 to 19, face signs 3 to 8) plus window planters 20 to 39, canopies over a pole line 17 to 32, build-out trees and stage 9 pieces 0. After K's planned I2: poles 0, lights 0, lamp-post places 6 to 17, drop ends the same, canopies over a line 8 to 22.
5. [ ] A pass's stage calls the resolver for the era before its own, and the two checks on its own era before it returns. C1 gives the helper; each pass calls it.
6. [ ] No file of `src/city/pipeline/` imports a stage folder.

**Files:** `src/city/pipeline/` (new `resolve.ts`, `eras.ts`, `readable.ts` and their tests); `src/city/stages.ts` (the era list and `runCityEra`). The builder runs `npx vitest run --maxWorkers=2 src/city/pipeline/` and one `npx tsc --noEmit`.

### C2 · The era switch, drawn (renderer). Branch `ticket/073c2-era-switch`

**Waits for:** C1, and B (so `history` has a picture).

**Goal.** Josh opens `?view=3d&city=plan&stage=assemble&era=<era>` and steps the same city through its eras from one camera spot. Default `clean` (the note; until Josh says otherwise).

**Acceptance criteria:**
1. [ ] (Vitest) `planViewRequested` reads `era`; an unknown era falls back to `clean`. `clean` draws exactly what `goal/city-style` draws today (the existing plan3d tests and pins pass untouched).
2. [ ] (Vitest) the draw reads `resolvePlan(plan, era)`, never the raw layers, for an era above `clean`. With no pass built yet, every era draws the clean city.
3. [ ] (main session, phone screenshot) a switch on the page steps the four eras; the camera does not move.
4. [ ] No draw-call cap rises.

**Files:** `src/render3d/planview.ts`, `src/render3d/plan3d.ts` and their tests. No new rule, so no pre-check.

### D1 pre-check · the tech pass on walls and pavements (pipeline-designer). No branch: a note `docs/design/073-D1-precheck.md` and a probe outside the repo

**May start now.** It measures room, which needs no district values. It reads B's proposed districts from the B pre-check's probe when that exists.

**It measures, on the 20 named runs, and sets no threshold:**
- **Wall places** for bolt-ons above the ground storey (`Prop_WallAttach_*`, `Prop_Pipes_*`, `Prop_AirConditioningUnit_*`, `Prop_Overhang_*`): per open face and storey, those clear of stage 7's escapes, canopies, wall props, party-wall pieces and face novelty signs, and of K1's drop wall points at 5.5 m (from the K1 probe, labelled a sketch until K2).
- **Shopfront swaps** (`Bld_Advanced_01` 5.0 x 3.0 x 0.7, `_02` 10.0 x 3.0): which H1 ground pieces they fit, against the body and sill rules; and how many H1b dressing pieces would float if the shop were swapped (each would need a `remove`).
- **Signs** (`Sign_01..09`, `Sign_Billboard_Border_*`): which are textured; places on street faces clear of stage 7.
- **Pavement tech** (`Prop_VendingMachine_01`, `Prop_ChargingStation_01`, `Prop_Security_Camera_01/02`, `Prop_Advertisement_Pillar_01`, `Prop_Atm_01`): places that keep rule 10's clear walk, `FURN_KEEP_M` from every K1 pole and light, `FURN_MAX_H_M` under spans, and stage 8's and 9's pieces (B7 is not the tech pass's).
- **T-1 and T-2** on the city with these pieces at the most the room allows.
- **The textured list:** every Sci-Fi City key D1 could use, textured or not, from the converter's report.
- **The cost:** distinct keys and pieces per city at the most the room allows, as a draw-call estimate (instancing comes after D3, card 7).
- **It proposes:** how density follows `tech` (bands, shares), with a recommended answer first.

**Done 21 Nov 2026:** `docs/design/073-D1-precheck.md` (a sketch: the circuit is K1's words laid by a probe; one `tech` value for the whole city), with its last section, "Kit against the intended-use note" (X-11). Its six questions were answered on Josh's delegation (D1-Q1 to D1-Q6), and its kit verdict taken (the billboard frames dropped under the goal). D1 below is cut against them.

### D1 · `tech` walls, signs, shopfronts and pavement (tech-pass, pure). Branch `ticket/073d1-tech-walls`

**Waits for:** B, C1 and A3 merged into `goal/city-transformations`. The pre-check, its answers and its kit check against `docs/design/073-pack-intended-use.md` are done. The tech-pass agent file (the main session's).

**Built now, against fixtures for the circuit** (taken under the goal, 22 Nov 2026 night; Josh may reverse). D1 does not wait for K2. Its pole, light, lamp-post and drop keep-outs are proven on fixtures, and **its tech digests are re-pinned when K2 lands** (the tech-pass, in a one-line follow-up named in K2's merge). D1 is kept whole, not split (the same night, under the goal).

**C1's helpers, as C1 built them** (`src/city/pipeline/eras.ts`, `readable.ts`):
- `techStage` is a `CityEraStageDef<"tech">`. Its `run` reads the plan before it through `resolveBefore(plan, "tech")` (the clean plan).
- It ends with `assertEraReadable(plan, "tech", layer, options)`, which resolves the plan with its layer at `tech`, runs `t1Failures` and `t2Failures`, and throws `CityStageError` on either.
- It supplies `options.bounds`, a `BoundsOf` lookup read from its typed kit table (X-8), and `options.isTree`, false for every key of its kit (no Sci-Fi City key is a tree; C1's default reads a `Tree` word in the name).
- It adds `techStage` to `ERA_STAGES` in `src/city/stages.ts`: one line.

**Goal.** At the `tech` era, each district gets Sci-Fi City wall bolt-ons, cameras, signs, pavement tech and, in its most technical districts, new shopfronts, as much as its `tech` value says. The clean city is unchanged; the era's pieces are D1's `adds`, and the only changes are the `remove`s of the dressing a new shopfront covers.

**The kit** (the pre-check's section 1, less what the kit check dropped). Sizes w x h x d in metres; every piece's origin is at its base centre. Textured only (X-5).

| Slot | Pieces | Where |
| --- | --- | --- |
| Small bolt-on | `Prop_WallAttach_Electronics_02/03/04/06`, `Prop_AirConditioningUnit_01/02`, `Prop_Pipes_03` | a free third of a storey face above the ground storey |
| Camera | `Prop_Security_Camera_01/02` | on storey 1 walls only, never on the pavement (D1-Q5): one in four of storey 1's bolt-ons |
| Tall | `Prop_WallAttach_Electronics_01/05`, `Prop_WallAttach_Vent_01..04`, `Prop_Pipes_01` **vertical only** | free bare side walls above a lower neighbour only, never over windows (D1-Q3). `Prop_Pipes_01` stands with its 2.5 m running up the wall, as the images show; if no side-wall place holds it vertical, it leaves the kit (the builder reports which) |
| Overhang | `Prop_Overhang_01/02` | a whole free storey face, as a canopy (a departure: not shown in the images; below) |
| Sign | `Sign_01..09`, `Sign_011` | a free third of a storey 1 street face. **Not** `Sign_Billboard_Border_*` or `_Tall_*` (dropped: empty frames, and the pictures the images show are the untextured `Sign_Ad_*`) |
| Shopfront | `Bld_Advanced_01` (single shop), `_02` (double shop) | added in front of an eligible shop (below) |
| Pavement, wall line | `Prop_VendingMachine_01`, `Prop_Atm_01` | backs to the wall |
| Pavement, kerb line | `Prop_Advertisement_Pillar_01`, `Prop_ChargingStation_01` | the kerb line (the charger: a departure, not shown in the images; below) |

**The density rule (DT; D1-Q1).** For each district, by its `tech` value only (X-6):
- **Always:** each storey face with a free third takes a small bolt-on with chance 0.3 x `tech` (on storey 1, one in four is a camera); each free bare side wall takes a tall piece with chance 0.3 x `tech`.
- **From `tech` 1/3:** each storey 1 street face with a free third takes a sign with chance 0.3 x `tech` (tried before a bolt-on); each pavement place takes a piece with chance 0.5 x `tech`.
- **From `tech` 2/3:** each eligible shop takes a shopfront with chance 0.5 x `tech`.
- The four chances and the two band edges are named constants in one file of `src/city/tech/`.

**A free third** (the pre-check's section 2). A storey face (one open side of a column at one storey above the ground) is cut into thirds of 1.67 m. A third is free when nothing of stage 7 enters a box over it, 1.5 m out from the wall, over the whole storey: dressing (not glass), escapes and their ladder boxes, canopies, air-conditioners, planters, face novelty signs and roof pieces. On storey 1, the middle third over a drop's wall point (5.5 m) is never free.

**The shopfront (D1-Q2): an add plus removes, never a swap.**
- A's `swap` keeps the placement; a shop ground piece's pivot is 2.29 to 2.64 m behind its front wall, so a swapped `Bld_Advanced_*` would stand inside the building, and removing the shop instead leaves a hollow storey (rule 1's body; B11 is not broken, card 6). So the panel is an **add**, standing 0.71 m out from the old shop's front wall onto the pavement, its top at 3.0 m.
- **Eligible:** single and double shops only, **never corner shops**, with no escape ladder in front below 3 m and no stage 8 prop within 0.71 m of the front.
- **Removes:** that face's glass, awnings, fascia signs and blade signs below 3 m (about 2.1 a shop in the pre-check). Face novelty signs above 3 m stay.
- **Behind a constant.** The rule is behind one boolean constant (for example `TECH_SHOPFRONTS`, true). Set false, the top band adds no shopfront and lists no change: the band then adds nothing over the middle one. It exists so the shopfronts can be switched off if D1g's street-level picture shows the panel's partly faced end as a loose panel (D1g criterion 6).

**The pavement (D1-Q4, D1-Q6; X-3: the tech pass keeps rule 10).** A place is a footprint on stage 8's wall line or kerb line of a pavement run, facing the street. It keeps everything furniture keeps: the 4 m corner keep-out and the 7 m pitch on its line (against stage 8's props and the pass's own); KO, AV, EL and DK; 0.3 m from every stage 8 and 9 footprint; `FURN_KEEP_M` from every pole and street light, **and from every lamp-post place** (D1-Q6); `FURN_MAX_H_M` under a span. **And at least 2 m of clear walk** beside it (D1-Q4), counting stage 8's pieces, the pass's other pavement pieces and its shopfront panels.

**The circuit points.** Drop wall points, poles, lights, lamp-post places and spans are read from the stage 6 layer through `CityPlan`. Until K2 merges that layer is empty, so those keep-outs and the T-1 check find nothing on the named runs; a fixture with hand-placed poles, lights, a lamp-post place and a drop shows each one held. (See "Questions for Josh", the D1 timing point.)

**Departures from the store images (X-11)**, each with its reason, from the kit check:
- **Not shown in the images:** `Prop_Overhang_01/02` as canopies (its shape, 1.44 m deep and closed on all sides, reads as one; nothing contradicts it). `Prop_ChargingStation_01` at the kerb (a vehicle charger belongs by the road; the images do not tell it apart from the other terminals).
- **Departure:** the added shopfronts. The images show `Bld_Advanced_*` as a building's own ground storey; an added front is what Josh's "augmented" city needs (the Fable session, on Josh's delegation).
- `Prop_Pipes_01` vertical and `Prop_Security_Camera_*` on walls are as the images show: not departures.

**Acceptance criteria** (Vitest unless said):
1. [ ] **The layer.** `techStage` writes a `CityTechLayer`: its `adds` (ids `tech:<kind>:<plan data>`, never list order) and its `changes`, which are only `remove`s of a shopfront's face dressing. No `swap`, no `state`. Each add's `district` is the district its cell is in. A fixture shows a shopfront's add and its removes; another, a corner shop left alone.
2. [ ] **The bands.** A fixture city with three districts at `tech` 0.2, 0.5 and 0.8 gets bolt-ons only in the first; signs and pavement pieces too in the second; shopfronts too in the third. Density reads `tech` only (X-6): the same district with a higher `tech` never gets fewer pieces on a fixed hash.
3. [ ] **The slots.** Every add stands in its slot as the kit table says: bolt-ons in a free third above the ground storey; cameras on storey 1 walls only; tall pieces on free bare side walls only, `Prop_Pipes_01` vertical; signs on storey 1 street faces; no `Sign_Billboard_Border_*`, `_Tall_*`, `Sign_Ad_*` or `Sign_Neon_*` key anywhere in the layer. A fixture for each slot.
4. [ ] **The pavement.** On the 20 named runs every pavement add keeps every distance above, and the 2 m clear walk counting panels. A fixture for each keep (a pole, a light, a lamp-post place, a span, a corner, a stage 8 prop) and for two pieces across a pavement (the second refused).
5. [ ] **The switch.** With the shopfront constant false (a test that sets it through the pass's options or a test double, not by editing the file), the layer has no `shopfront` add and no change, and every other add is the same.
6. [ ] **T-1 and T-2.** The stage reads the plan at the era before its own (`clean`) through C1's `resolveBefore`, and before it returns calls C1's `assertEraReadable` with its kit's `bounds` and `isTree`, which runs `t1Failures` and `t2Failures` on its own era and throws `CityStageError` on a failure (X-4, R-2). A fixture where a forced add covers a pole fails.
7. [ ] **Dark and textured (X-5).** Every key in the kit table is on the converter's textured list; no kit key is emissive (a typed table, pinned below).
8. [ ] **The kit pin (X-8).** The kit table's sizes, and each key's front (read from the GLB's face directions, as the pre-check's kit probe did), are typed in `src/city/tech/` and pinned against `sci-fi-city-pack.glb` by one new test in `src/render3d/`, inside `it.skipIf(!have)` (R-6).
9. [ ] **R-1 to R-7, X-1.** The layer is frozen; its digest is pinned on the four pin cities; every clean digest is equal with and without the pass; the same city twice gives the same layer; no file of `src/city/tech/` imports another stage folder or reads `bi`, `bj` or a street's `line`. `runCity()` runs no tech code (X-7).
10. [ ] **The numbers** (reported, not asserted), beside the pre-check's sketch (section 3's rows at 0.2, 0.5 and 0.8): pieces a city by slot, shopfronts and their removes, distinct keys, pavement places used of those free, `Prop_Pipes_01`'s vertical places, the time per city.

**Files:** new `src/city/tech/`; one new kit pin test in `src/render3d/` (the tech-pass's, X-8); `src/city/stages.ts` (one line, `techStage` in `ERA_STAGES`). Nothing in `src/core/` (A3 typed the kind union), no clean stage folder. The builder runs `npx vitest run --maxWorkers=2 src/city/tech/` and its pin test, and one `npx tsc --noEmit`. No browser, no Blender.

**Interfaces.** Done by A3: `CityTechPieceKind` in `src/core/cityera.ts` is `"bolt-on" | "camera" | "tall" | "overhang" | "sign" | "shopfront" | "pavement"` (D2 widens it later). D1 codes against C1's `CityEraStageDef`, `resolveBefore`, `assertEraReadable`, `ReadableOptions` and `BoundsOf` as merged. No new dependency.

**From D1's build report** (22 Nov 2026 night; recorded, not a ruling; D1 is in review on its own branch):
- **Typed and pinned, never placed:** `Prop_Pipes_01` and `Prop_Overhang_01/02`. They are in the kit table and its pin, but no add uses them. `Prop_Pipes_01`: a placement cannot roll a piece upright, so it cannot stand with its 2.5 m up the wall (the kit table's "leaves the kit" case). `Prop_Overhang_01/02`: the density rule (DT) gives the overhang slot no chance, so it is never tried. Neither is a departure in the drawn city while unplaced; D1g has nothing of them to draw.
- **An add's `cell` is its host cell** for wall pieces and shopfronts (the built cell whose face it is on), not the cell its pivot stands in. That departs from A3's comment on `CityEraPiece.cell`. A4 rewords the comment to match; no type changes.

### D1g · `tech` walls and pavement drawn (renderer). Branch `ticket/073d1g-tech-walls-drawn`

**Cut under the goal** (21 Nov 2026 night; Josh may reverse), so Josh has the tech pass's walls and pavement to look at before D2 and D3, which wait on K2.

**Waits for:** D1 and C2.

**Goal.** At `?view=3d&city=plan&stage=assemble&era=tech` (and `holdout`, `ruin`), Josh sees D1's wall bolt-ons, cameras, signs, added shopfronts and pavement tech on the city, and the dressing D1 removed gone.

**Acceptance criteria:**
1. [ ] (Vitest) At `era=tech` and later, the draw places every D1 add once, at its placement (shopfront panels included), draws a swapped piece (any pass's) with its new key and each removed piece not at all, reading them only through `resolvePlan`. At `clean` the draw is exactly today's (the existing plan3d tests and pins pass untouched).
2. [ ] (Vitest) **Dark (X-5).** No material of a D1 piece is emissive or lit; a test walks the era's drawn meshes.
3. [ ] (Vitest) **R12 gains B2's allowance, era-scoped (X-9):** one typed table of the never-used keys D1 may use as dark signs and lamps, allowed only at `era=tech` and later and only on D1's own piece kinds. At `clean` the R12 audit is exactly today's.
4. [ ] (Vitest) **No draw-call cap rises.** Draw calls at each era are reported in the hand-back.
5. [ ] (main session, browser screenshot, full resolution) 6 x 6 seed 1 at `era=clean` and `era=tech` from one camera spot, on a street with wall bolt-ons and pavement tech.
6. [ ] (main session, browser screenshot, full resolution) **One street-level picture along a pavement past a new shopfront**, at `era=tech`, so the panel's end return (only partly faced in the GLB) is seen as a walker sees it. If the end reads as a loose panel, the top band's shopfronts stay out of the merge into `main`: the tech-pass sets D1's shopfront constant false (one line in `src/city/tech/`, its pins re-taken), and the picture goes to Josh. No filler piece is invented to hide it. (Taken on Josh's delegation, 21 Nov 2026 night; Josh may reverse.)

**Files:** `src/render3d/plan3d.ts` and its tests, and the R12 audit's test in `src/render3d/`. Nothing in `src/city/`. The builder runs `npx vitest run --maxWorkers=2` on its own test files and one `npx tsc --noEmit`; no browser.

### D2 · `tech` roofs: storeys, plant, holograms, the roof net (tech-pass, pure). Outline. Branch `ticket/073d2-tech-roofs`
- **Waits for:** K2's circuit layer, B, its own pre-check.
- **Its pre-check measures:** flat roof runs that fit `Building_Shack_*`, `Bld_Roof_Pagoda_02`, clear of stage 7's towers, exits, billboards and roof novelty; the roof items per building against B10; roof-to-roof span lengths across streets and lanes, and the `Prop_Powerpoll_01/02` attach height; whether one net per high-tech district connects; where `Prop_Bridge_01` spans as a street truss (below); how many roof-net spans cross a stage 6 pole line in plan (allowed: Q13, Josh; reported, not failed); T-1 and T-2.
- **Read from the intended-use note** (`docs/design/073-pack-intended-use.md`; answered on Josh's delegation, 21 Nov 2026 night; Josh may reverse):
  - **`Prop_Bridge_01` is a street truss, not a walkway.** The images show open lattice trusses spanning between facing façades about 6 to 10 m up, carrying cables and hung signs, with no deck, no railings, nobody on them. The roof walkway is dropped. D2 may use the truss as shown: between facing walls (it is 5.0 m long; a lane is 5 m wall to wall), with roof-net cables over it and signs under it.
  - **`Bld_Raised_01/02` is a street-level deck on pillars, not a roof storey.** It goes on no roof without Josh's word. D2's pre-check lists "roof storeys" as an open question for Josh, recommended answer first; until he answers, D2 places no `Bld_Raised_*` on a roof.
- **Josh's ruling holds:** Sci-Fi City poles stand on roofs and objects, never on the ground (Josh, 21 Nov 2026). Recorded under X-11: the store images show `Prop_Powerpoll_01/02` standing on the pavement at the kerb (Screenshot_11, 13), never on a roof. The rooftop use is Josh's own choice, not what the images show. It needs no departure question: his ruling stands.

### D3 · `tech` drawn (renderer). Outline. Branch `ticket/073d3-tech-drawn`
- **Waits for:** D1g, D2.
- Draws only what D1g did not: D2's roof adds and changes at `era=tech` and later. B2's era-scoped R12 table is D1g's; D3 adds D2's keys to it, if any. Dark (X-5).
- Reports draw calls and frame rate at each era, before J2.

### J2 · Instancing (renderer). Outline. Branch `ticket/073j2-instancing`
- **Josh's card 7:** "Instancing becomes a section of this work, built after the technology pass is drawn and before the hold-out pass is."
- **Waits for:** D3. **E3 waits for it.**
- Instances the stack pieces and the dressing (070 Q29's J2). Every clean picture and pin stays the same. Adds no rule, so no pre-check.

### E1 · `holdout` plants and makeshift lines (holdout-pass, pure). Outline. Branch `ticket/073e1-holdout-power`
- **Waits for:** D2, K2, A2, B, its pre-check.
- **Its pre-check measures:** in each held district, the largest open place and whether a plant (`Prop_Generator_01`, `Prop_Solar_Panel_02..04`, `Prop_Battery_03/04`, `Prop_Windmill_01`) fits there, reachable on foot (T-2); makeshift line routes from the plant to the district's street and roof poles: lengths, how many run over junctions (B5), off light posts, masts or walls (B4), drops across streets (B6); T-1; how many held districts get no plant (those keep K1's feed outside: Q11, Josh).
- Uses B3 to B6. Its plant, makeshift poles and spans carry ids in K's scheme, prefixed `holdout:` (A).
- The plant is the job's feed (Q6), so E1g follows.

### E1g · The conversion learns the plant (grid-simulator, pure). Outline. Branch `ticket/073e1g-plant-feed`
- **Waits for:** E1, K2, A2. (Q10 and Q11 are answered.)
- CK15's conversion accepts `{ plant: <id> }` as a feed's place and makeshift spans as runs, in `src/city/circuit/`, on the plan resolved at the ruin era (Q10, Josh: "The ruin"). The converted `Puzzle` still passes `validatePuzzle`, and `src/grid/` runs it unchanged.
- K2's feed-outside check skips a job whose feed is its district's plant (the feed-place card, Josh: "Yes, plant inside"). A district with no plant keeps K1's check (Q11, Josh).
- The plant place is typed by A2 first (re-cut under the goal, 21 Nov 2026 night; Josh may reverse). E1g waits for A2.

### E2 pre-check · the hold-out's camps, farms, markets, stores, barricades, clutter and roof items (pipeline-designer). No branch

**Done 22 Nov 2026:** `docs/design/073-E2-precheck.md` (a sketch: stage 6 is K1's words laid by a probe; D1, D2 and E1 not built). Its Q1 to Q5 were taken under the goal; its Q6 (the X-11 departures) and the order were answered by the Fable session on Josh's delegation. E2 below is cut against them.

### E2 · `holdout` camps, farms, markets, stores, clutter, roof items, barricades (holdout-pass, pure). Branch `ticket/073e2-holdout-camps`

**Waits for:** B and C1 merged into `goal/city-transformations`, and A3. It does not wait for E1, D1, D2, K2 or J2 (the Fable session, on Josh's delegation, 22 Nov 2026 night: "build E2 now"). The holdout-pass agent file (the main session's).

**Goal.** At the `holdout` era, each district that held out gets camps, stores, clutter and roof panels, and from a third market stalls, water towers and barricades, and from two thirds farms in its parks: as much as its `held` says. Nothing goes where a district was left at once. The clean city is unchanged. The era's pieces are E2's `adds`. Its only changes are `remove`s of the pieces its farms, markets and barricades stand on. A flat picture only: E2 is not drawn before J2 (E3 draws it).

**Not E2's:** each held district's plant, makeshift poles, lines and drops (E1, after A2). E2 writes its layer's "power" step empty (`adds: 0`, `changes: 0`); E1 fills it.

**The order (the steps, A3).**
- The layer lists its adds and changes by step: "power" (empty until E1), then "settle", then "barricade", with `steps` giving each step's counts.
- **Settle:** camps, water towers, farms and irrigators, stalls, containers, clutter, roof items, each with its removes.
- **Barricade:** last of all, in hashed order, each placed only if T-1 and T-2 still hold with everything before it (option C).

**The kit** (the pre-check's sections 2 and 5). Textured only, none emissive (X-5). Sizes from the Sci-Fi Frontier GLB, typed in `src/city/holdout/` (X-8).

| Kind | Pieces | Where |
| --- | --- | --- |
| `camp` | `Bld_Tent_01..03`, `Bld_Pod_01..04` | a court's lawn, apron and paths; a park that is not a farm. Inside the place's cells, 1 m off any building, 1.5 m apart, 0.3 m clear of the place's clean trees and benches. **No removes** for camps |
| `water-tower` | `Bld_WaterTower_01` | **on the ground in a court**, one per court at most, as the images show. Never on a roof |
| `farm`, `irrigator` | `Env_Farm_Circle_01..03`, `Env_Farm_Straight_01`, `Prop_Irrigator_01/02` (one per field) | a park's lawn. **Only a piece whose footprint, after its turn, fits inside the park's rectangle within its pavement edge. Never scaled. Never across a kerb.** The park's trees and benches (its `ground.props`) are removed |
| `stall` | `Bld_Market_Stall_02` only (`_01` and `_03` are 10.06 m, the plaza 10.00 m) | **one per plaza or front lot**, that place's props it stands on removed. A front lot with a stall takes no container |
| `container` | `Prop_Container_01..07` | one per court stall or kerb bay, centred (both: E2-Q4). The district's stores |
| `clutter` | `Prop_Crate_*`, `Prop_Fuel_Tank_*`, the 11 standing `Prop_Greeble_*` | one per pavement cell fronting a held block at most, on a hashed spot; 0.3 m clear of clean pieces and of every pole, light and lamp-post place (T-1). Beside a pole is allowed (B7) |
| `roof` | **`Prop_Solar_Panel_02` and `Prop_Fabric_01/02` only** | on a roof deck (the cell less 0.3 m, H3's RE), up to 2 per column, 0.1 m clear of H3's pieces (B10). `Solar_Panel_03/04` and `Fabric_03` fit no deck |
| `barricade` | `Bld_Wall_02`, 3 to 5 in a row | across a street mouth at its crossing line, pavement corner to pavement corner, through the cells' middles (below) |

**Excluded:** alien plants, sand, cliffs, weapons, character parts, the cantina interior; the `_Insert` pieces, the flat greebles, `Bld_Wall_Large_01`, `Bld_Wall_Tower_01` (not shown); `Bld_Market_Stall_01/03`, `Prop_Solar_Panel_03/04`, `Prop_Fabric_03` (do not fit); the plant pieces (E1's); the Apocalypse pack's `Prop_Barricade_*` and `Prop_Road_Barrier_*` (the ruin's kit). A test lists every key the layer uses against the kit table.

**The density (HD; E2-Q1).** For each district, by its `held` value only (X-6):
- **`held` 0:** nothing.
- **Always** (`held` above 0): clutter in each pavement cell, chance 0.3 x `held`; a container in each court stall and each kerb bay, chance 0.5 x `held`; each court, and each park that is not a farm, filled with camps to `held` x its room; each free roof spot, chance 0.3 x `held`.
- **From `held` 1/3:** the market stalls; the court water towers; a barricade on each street mouth but the district's hashed-first, chance `held`.
- **From `held` 2/3:** the parks become farms.
- The chances and the two band edges are named constants in one file of `src/city/holdout/`.

**Barricades (option C; E2-Q2, E2-Q3).**
- **A street mouth** of a held district is a junction arm such that the junction has an arm one of the district's blocks fronts, and this arm has none of the district's blocks on either side (the pre-check's ring reading).
- The district's hashed-first mouth is always open.
- A candidate is placed only if, with it standing (and the stage 9 pieces under it removed), `t1Failures` and `t2Failures` on the plan so far are still empty. Otherwise it is skipped. This is a placement rule, not a loosened check: `assertEraReadable` still runs on the whole layer at the end and throws (X-4).
- **A barricade removes the stage 9 piece under it** (a `traffic.pieces` entry whose footprint its wall line meets): one `remove` each, never two for one piece (A's "twice").
- **Until K2 lands** the circuit is empty, so every candidate passes T-1 and T-2 on the named runs. Option C's skips are proven on fixtures with hand-placed poles (below). **Until E1 merges** the barricades are placed without the plant and lines before them. So **the barricade step has its own digest and is not pinned on the named runs until E1 merges**; the rest of E2 is pinned now.

**Departures from the store images (X-11)** (the pre-check's section 5; E2-Q6, the Fable session on Josh's delegation):
- **Departure:** farms in city parks. Reason: a park is the city's open soil, which the images show farms on. Only pieces that fit the park, never scaled, never across a kerb.
- **Not shown in the images:** containers in court stalls and kerb bays (stall-sized boxes, the district's stores). `Prop_Fuel_Tank_*` as clutter.
- **Not shown in the images:** `Bld_Wall_02` across a street mouth. The images show Frontier walls enclosing a settlement; closing a street mouth is the same job. The Apocalypse barricades stay in the ruin's kit.
- **As shown:** tents and pods on open ground, the water tower on the ground, one market stall facing a square, clutter on the ground, `Prop_Solar_Panel_02` and `Prop_Fabric_01/02` on a building top.

**C1's helpers, as C1 built them** (`src/city/pipeline/eras.ts`, `readable.ts`):
- `holdoutStage` is a `CityEraStageDef<"holdout">`. Its `run` reads the plan before it through `resolveBefore(plan, "holdout")` (the `tech` era: D1's pieces once D1 merges).
- It ends with `assertEraReadable(plan, "holdout", layer, options)`.
- It supplies `options.bounds`, a `BoundsOf` lookup read from its typed kit table. Option C's per-candidate test calls `t1Failures` and `t2Failures` with the same options.
- It adds `holdoutStage` to `ERA_STAGES` in `src/city/stages.ts`: one line.

**Acceptance criteria** (Vitest unless said):
1. [ ] **The layer.** `holdoutStage` writes a `CityHoldoutLayer`: adds with ids `holdout:<kind>:<plan data>` (never list order), each add's `district` the district its cell is in, each kind from `CityHoldoutPieceKind` and in its step (`CITY_HOLDOUT_STEP_OF`). Its changes are only `remove`s: a farm's park props, a stall's place props, a barricade's stage 9 pieces. No `swap`, no `state`. `steps` lists "power" (0, 0), "settle" and "barricade", in order, its counts summing to the layer's.
2. [ ] **The bands.** A fixture city with four districts at `held` 0, 0.2, 0.5 and 0.8: nothing in the first; clutter, containers, camps and roof items only in the second; stalls, water towers and barricades too in the third; farms too in the fourth. Density reads `held` only (X-6): the same district with a higher `held` never gets fewer pieces on a fixed hash.
3. [ ] **The places.** A fixture for each kind of the kit table: camps inside their place, 1 m off buildings, 1.5 m apart, clear of clean trees and benches, with no remove; one water tower per court at most, on the ground, none on a roof; a farm piece inside its park's rectangle, never scaled, never across a kerb, and a park too small for any piece left a park; one `Bld_Market_Stall_02` per plaza or front lot and no container on that lot; one container per stall or bay; one clutter piece per pavement cell at most, clear of poles, lights and lamp-post places; roof items only `Prop_Solar_Panel_02`, `Prop_Fabric_01/02`, at most 2 per column. No excluded key anywhere in the layer.
4. [ ] **Barricades (option C).** Fixtures with hand-placed poles: a mouth whose wall would seal a pole in is skipped (T-2); a mouth whose wall would cover a lamp-post place is skipped (T-1); **two touching held districts keep both districts' poles joined**; the hashed-first mouth is always open; each stage 9 piece under a wall is removed once. The barricades come last in the layer, after every settle add and change.
5. [ ] **T-1 and T-2.** The stage reads `resolveBefore(plan, "holdout")` and ends with `assertEraReadable` with its kit's `bounds`. A fixture where a forced add covers a pole throws `CityStageError` (X-4, R-2).
6. [ ] **Dark and textured (X-5).** Every key in the kit table is on the converter's textured list for the Sci-Fi Frontier pack; none is emissive (a typed table, pinned below).
7. [ ] **The kit pin (X-8).** The kit's sizes are typed in `src/city/holdout/` and pinned against the Sci-Fi Frontier GLB by one new test in `src/render3d/`, inside `it.skipIf(!have)` (R-6). It reads its asset lazily (CI has none).
8. [ ] **R-1 to R-7, X-1, the pins.** The layer is frozen; the same city twice gives the same layer; every clean digest is equal with and without the pass; no file of `src/city/holdout/` imports another stage folder or reads `bi`, `bj` or a street's `line`; `runCity()` runs no hold-out code (X-7). **Its pin test pins, on the four pin cities, the digest of the layer's "power" and "settle" parts** (`CityHoldoutStepPart`, cut out by `steps`, through `digestOf`). The "barricade" part's digest is computed and reported, **not pinned until E1 merges**.
9. [ ] **The picture (R-5):** a flat `CityEraPicture` of stage "holdout", one legend entry per kind, the R-5 test as 070's. Nothing in `src/render3d/` draws it (E3, after J2).
10. [ ] **The numbers** (reported, not asserted), beside the pre-check's sketch (section 4, at the density): pieces a city by kind (sketch 444 to 1,131), distinct keys (43 to 46), camps (36 to 127), water towers (6 to 22), farms (0 to 5 parks) and their removes, stalls and their removes, containers (court 31 to 94, bays 33 to 64), clutter (85 to 281), roof items (163 to 418; per held building about 3.2), barricades (16 to 40) and the mouths option C skipped, stage 9 removes, T-2's closed cells, the time per city. Until K2 lands, the barricades and the circuit keeps find no circuit on the named runs: say so beside those rows.

**When others land** (taken under the goal, 22 Nov 2026 night; Josh may reverse):
- **E1:** the barricade step is re-placed after the plant and lines, and its digest is pinned on the four pin cities then (the holdout-pass, in E1's ticket).
- **K2:** clutter and barricades meet the real circuit. E2's pins are re-taken, as D1's are.
- **D1 and D2:** `resolveBefore` then holds their pieces, so E2's pavement and roof room shrink. Its pins are re-taken by the holdout-pass, named in that section's merge.

**Files:** new `src/city/holdout/` and its tests; one new kit pin test in `src/render3d/` (the holdout-pass's, X-8); `src/city/stages.ts` (one line, `holdoutStage` in `ERA_STAGES`). Nothing in `src/core/` (A3 typed the kinds and steps), `src/city/pipeline/`, `src/city/circuit/` or any clean stage folder. Test command `npx vitest run --maxWorkers=1 src/city/holdout/` and its pin test, and one `npx tsc --noEmit`. No browser, no Blender.

**Interfaces.** Done by A3: `CityHoldoutPieceKind`, `CITY_HOLDOUT_STEPS`, `CityHoldoutStep`, `CITY_HOLDOUT_STEP_OF`, `CityHoldoutStepCount`, `CityHoldoutLayer.steps`, `CityHoldoutStepPart`. E2 codes against C1's `CityEraStageDef`, `resolveBefore`, `assertEraReadable`, `t1Failures`, `t2Failures`, `ReadableOptions`, `BoundsOf` and `digestOf` as merged. No new dependency.

### E3 · `holdout` drawn (renderer). Outline. Branch `ticket/073e3-holdout-drawn`
- **Waits for:** E1, E2, J2. R12 gains B3's allowance, era-scoped.

### F0 · The Apocalypse ruin pieces converted (grid-simulator; config and one Blender run, no code). No branch: nothing in git changes

**Josh's card 4:** "Yes, convert it (Recommended)".

**Goal.** The ruin pieces of the POLYGON Apocalypse pack are a GLB of their own, `apocalypse-ruin`, listed in `manifest.json` beside the eight packs there, which do not change. The F1 and F2 pre-checks read their sizes from it. No game code reads it yet.

**How `apocalypse-power` was made** (read 21 Nov 2026): it is its own folder under `assets/private/in/`, holding 96 FBX copied from the pack and a copy of its `Textures/` (30 MB), with no `pack.json`. F0 does the same. Nothing in `in/apocalypse-pack/` is moved or changed.

**The starting list** (stems in `in/apocalypse-pack/FBX/`, top level only; counts read 21 Nov 2026):
- `SM_Env_RoadPiece_Damaged_*` (24: **wrong**, see the result below); `SM_Env_Overgrowth_*` (10) and `SM_Env_Overgrowth_Edge_*` (4); `SM_Env_Sidewalk_Overgrown_*` (3)
- `SM_Prop_Car_Wrecked_*` (cars, SUV, van, bus, stacks, wheels; about 27)
- `SM_Prop_Barricade_*` (13), `SM_Prop_Road_Barrier_*` (2), `SM_Bld_Door_Barricaded_*` (9)
- `SM_Prop_Rubble_Concrete_*` (6), `SM_Prop_Powerpole_Broken_*` (4), `SM_Prop_Wall_Wire_Damaged_*` (3)
- Not: `Characters/`, `Collision/`, `FX/`, `Rigged/`, weapons (`SM_Wep_*`), vehicle attachments (`SM_Veh_Attach_*`), anything already in `apocalypse-power`.

**Acceptance criteria** (the builder checks; Josh's PC freezes under load):
1. [x] **The junction first.** The worktree it runs from has `assets/private/in` resolving to `D:\rest-prototype-main\assets\private\in`, listing all nine pack folders. `D:\rest-prototype-goal\assets\private\` has only `calibration` and `out` today. Without `in`, do not convert: the manifest merge would drop every pack (072's warning).
2. [x] `in/apocalypse-ruin/FBX/` holds a copy of exactly the starting list, and `in/apocalypse-ruin/Textures/` a copy of the pack's `Textures/`. The builder lists each stem copied, with its count.
3. [x] Back up `out/manifest.json` to `out/manifest.json.bak-073f0`. Run `npm run assets:convert -- apocalypse-ruin` once, in the background, with nothing else heavy running. Never with no pack name.
4. [x] Every other pack's manifest entry equals its entry in the backup (a node one-liner). Their GLBs, `out/city-pack/colourways/` and `calibration/` keep their modified times. If any moved, restore the backup and stop.
5. [x] Scale as 072 B: start with none; one more run at 100 or 0.01 only if more than 10% are `scale-suspect` at about 100x or 0.01x. No third run.
6. [x] **The report** (in the hand-back; no file): models converted, failures with their first line, each warning's count, the scale and runs, the GLB size, the wall time, and each piece's bounds in metres, by group.
7. [x] No file in `src/`, `tools/` or anywhere in git changes. `git status` is clean.

**Files (not in git):** `assets/private/in/apocalypse-ruin/`, `assets/private/out/` (written by the converter only), the manifest backup.

**Done 21 Nov 2026 night.** 89 models converted, 0 failures, 0 warnings, scale 1, one run, a 7.4 MB GLB.
- **The starting list was wrong on one line** (recorded under the goal; Josh may reverse): the pack has 12 `SM_Env_RoadPiece_Damaged_*`, not 24, and all 12 are already in `apocalypse-power`. So `apocalypse-ruin` does not hold them, and **F1 and F2 read the damaged road pieces' sizes from `apocalypse-power`**.

### F1 pre-check · the ruin's growth (pipeline-designer). No branch

**Done 22 Nov 2026:** `docs/design/073-F1-precheck.md` (a sketch: stage 6 is K1's words laid by a probe; D1, E2 and F2 not built). Its Q2, Q3, Q4 and Q6 and its two corrections were taken under the goal; its Q1 (B8 against T-1) and Q5 (the X-11 departures) were answered by the Fable session on Josh's delegation. **F1-Q1 is provisional and flagged for Josh** (top of "Questions for Josh"). F1 below is cut against them.

### F1 · `ruin` growth: ground, walls, roofs (ruin-pass, pure). Branch `ticket/073f1-ruin-growth`

**Waits for:** E2 merged into `goal/city-transformations` (E2's barricades stand before the ruin's growth in the stage order, so option G judges growth against them), F0 (done), its pre-check (done), and **A4** (the ruin's kinds and steps). It does not wait for E1, E3, J2, F2 or K2 (taken under the goal, 22 Nov 2026 night; Josh may reverse). The ruin-pass agent file (the main session's).

**Built now, against fixtures for the circuit.** Until K2 merges, stage 6 is empty, so T-1, T-2, option G and the under-span set find nothing on the named runs. Each is proven on fixtures with hand-placed poles, lights, lamp-post places, drops and spans. **F1's growth digest is re-pinned when K2 lands, and when D1, D2, E1 or E2's barricade step changes what stands before it** (the ruin-pass, in a one-line follow-up named in that merge).

**Goal.** At the `ruin` era, growth spreads from each district's soil over its streets, pavements, open ground, walls and roofs, as far as its `wild` value says. Trees grow up through the city, beside its dead wires but never with a crown over one. The clean city and the earlier eras are unchanged: F1 writes only `adds`, no change. A flat picture only: the ruin is not drawn before J2 (F3 draws it).

**C1's helpers, as C1 built them** (`src/city/pipeline/eras.ts`, `readable.ts`):
- `ruinStage` is a `CityEraStageDef<"ruin">`. Its `run` reads the plan before it through `resolveBefore(plan, "ruin")` (the `holdout` era: E2's pieces, and D1's once D1 merges).
- It ends with `assertEraReadable(plan, "ruin", layer, options)`.
- It supplies `options.bounds` from its typed kit table, and **its own `options.isTree`**: true only for the tree keys F1 plants (`Tree_Birch_01..04`, `Tree_Round_01..05`, `Tree_Large_01`, `Tree_Generic_Giant_01`). C1's default (a `Tree` word in the key) would make `Tree_Vines_*`, `Tree_Log_*`, `Tree_Stump_*` and `Tree_Dead_*` canopies.
- Option G's per-candidate test calls `t2Failures` (and `t1Failures` where it checks T-1 the same way) with the same options.
- It adds `ruinStage` to `ERA_STAGES` in `src/city/stages.ts`: one line.

**T-1 and C1's code are not touched.** F1 places pieces only where T-1 already holds. No check is loosened, no clean stage or `src/city/pipeline/` file is edited (beyond the `ERA_STAGES` test line below).

**The kit** (the pre-check's sections 2 and 7). Textured only, none emissive (X-5). Never scaled. Sizes w x h x d in metres, typed in `src/city/ruin/` and pinned (X-8). Where an Apocalypse `Env_Overgrowth_*` piece fits a slot, it is used first (it is what the images show); the Nature pieces fill only what it does not.

| Kind | Pieces | Where |
| --- | --- | --- |
| `patch` | **first** `Env_Overgrowth_*` (`apocalypse-ruin`) that fits the cell unscaled; else `Terrain_Ground_Mound_Small_02` (5.09 x 0.42 x 4.98) | one per grown carriageway, parking-band, junction or open-ground cell. **On a crossing only flat ground cover:** an `Env_Overgrowth_*` piece under 0.15 m high by its bounds, never the mound |
| `clump` | **first** `Env_Overgrowth_Edge_*` where it fits; else `Plant_Fern_01/02`, `Plant_Bush_01/02` | a grown pavement cell, on its wall line, off the cell's middle |
| `sapling` | `Tree_Birch_01..04`, `Tree_Round_01..05` (3.6 to 5.4 m) | a hashed spot in a grown cell, never a junction or a crossing; crown clear (below) |
| `park-tree` | `Tree_Generic_Giant_01` (**12.6 x 11.19 x 13.12**, so its crown is 13.12 m across, radius 6.56 m), `Tree_Large_01` (9.3 x 8.83 x 5.42) | one of each per park in a district from `wild` 1/3, alone as the images show; crown clear |
| `roof` | **first** `Env_Overgrowth_*` that fits the deck; else `Plant_Bush_01`, `Tree_Dead_01/02` | a roof deck (the cell less 0.3 m, H3's RE), up to 2 per column, 0.1 m clear of H3's pieces |
| `vine` | Palm City `Env_Vines_01..08`, by depth (below) | roof edges, awnings and canopies, posts (below) |
| `tree-vine` | Nature `Tree_Vines_01..04` | from the branches of a standing tree only (a clean ground tree, a placed sapling or park tree). Never on a wall |

- **Left out:** `Plant_Bush_Leaves_03` (missing texture), `Plant_Grass_01` (zero bounds), `Plant_PalmBush_01` (the palm is on the never-used list); the damaged road pieces (F2's, F3's); logs, stumps, rubble and wrecks (F2's); `Env_Sidewalk_Overgrown_*` (not measured by the pre-check; a later cut). A key that is not on the converter's textured list leaves the kit, and the builder reports it; no substitute is invented. A test lists every key the layer uses against the kit table.
- **Every add's footprint** is 0.3 m clear of every standing piece before it (clean, tech, hold-out and its own), save a `patch`, which may lie up to a standing piece but never under one.

**Soil and the spread (GD; F1-Q3).**
- **Soil:** park and court lawns (`mass` cells `green`; farms are parks), build-out tree cells, and the pavement and plaza cells holding a tree, planter or pot plant. A soil cell takes nothing but its park trees and vines.
- **The spread.** From every soil cell, growth spreads cell by cell to its four neighbours, up to `round(wild x 3)` cells (half up), `wild` being the soil's district's. It crosses street cells (pavement, parking band, lane, junction, crossing) and open ground (aprons, stalls, drives, lanes, plazas, lots, park edges), never a building.
- A grown cell takes the district of the nearest soil that reaches it (a tie: the least district id). That is its add's `district`, and its `wild` sets the chances. A roof or wall piece takes its building's district.
- So a district that held to the end (`wild` under 1/6) grows nothing: the reach rounds to 0.

**The density (by `wild` only, X-6).** For each grown cell, roof and slot:
- a `patch` on each eligible grown cell (as the table);
- a `clump` on each grown pavement cell, chance 0.6 x `wild`;
- a `sapling` on each eligible grown cell, chance 0.3 x `wild`;
- a `roof` piece on each roof spot, chance 0.3 x `wild`;
- a `vine` on each free slot, chance 0.3 x `wild`, and a `tree-vine` on each standing tree, chance 0.3 x `wild` (**the architect's starting values**: the pre-check measured the slots, not a chance; reported, and Josh may change them);
- **from `wild` 1/3:** a park's `park-tree`s.
- The chances, the reach factor (3) and the band edge are named constants in one file of `src/city/ruin/`.

**Trees and T-1 (B8; F1-Q1, provisional, flagged for Josh).** Ruin trees are free of the 3.2 m cap (`FURN_MAX_H_M`), but stand **beside** a line, never with a crown over one. T-1 decides:
- A tree (`sapling`, `park-tree`) is placed only where its crown (C1's disc: half its key's wider bound) is clear, by T-1's reading, of every pole, street light, lamp-post place and drop end, and meets no span in plan.
- **The under-span set.** The spots whose crown meets a span and is otherwise clear are computed every run, as their own named set (for example `underSpanSpots`), and **not placed**. One exported constant gates them (for example `RUIN_TREES_UNDER_SPANS`, false). It exists so way-out (b) below, if Josh takes it, is that constant set true and a re-pin, after T-1's own change (C1's, for Josh). F1 does not change T-1.

**T-2 (option G; F1-Q2).** A piece that closes a street cell (C1's reading, B-Q5 unchanged: standing on the ground with its base under 2 m, covering the cell's centre) is placed only if `t2Failures` on the plan so far, with it standing, is still empty; otherwise it is left out and counted. The candidates go in one hashed order of their ids; a `tree-vine` is a candidate only once its tree stands. This is a placement rule, not a loosened check: `assertEraReadable` still runs on the whole layer at the end and throws (X-4). G's check is incremental (only the districts whose walk the candidate's cell can cut) and gives the same set as the brute-force check.

**Vines (F1-Q4; the intended-use note's reading).** Every vine hangs from something above it:
- **Roof edges.** On an open face (street or court) with no fire escape, no face novelty sign and no drop wall point in the vine's drop: a flat sheet (`_01/04/05`) or a drape (`_02/03/07/08`) chosen by depth, read from the GLB. A drape that stands out over a drop's first 2 m fails T-1 like a sheet.
- **Beside a drop:** `Env_Vines_08` (2.08 m) where it fits beside the drop's 2 m, and `_06` the same where it fits (the answer names both; `_06` under its constant below). Nothing else on a drop face.
- **Awnings and canopies** that carry no fascia or blade sign: a drape over the edge.
- **Posts:** `Env_Vines_06` (0.6 x 3.0 x 0.6) on traffic posts only (signal masts, stop and parking signs) clear of every circuit point. Never on a circuit pole, a street light or a lamp post (T-1).
- **Trees:** `Tree_Vines_*` from branches only.

**Departures from the store images (X-11; F1-Q5, the Fable session on Josh's delegation, 22 Nov 2026 night; Josh may reverse),** each with its limit. Listed in `docs/design/073-pack-intended-use.md`:
- **Grass mounds on hard ground** (`Terrain_Ground_Mound_Small_02`; not shown, taken as a departure): B9, ruin only; only where no `Env_Overgrowth_*` fits; never on a crossing; never scaled.
- **Saplings in the carriageway** (not shown, taken as a departure): B9, ruin only; never on a junction or crossing; never scaled.
- **Bushes and dead trees on roofs** (`Plant_Bush_01`, `Tree_Dead_01/02`; not shown, taken as a departure): B10, ruin only; only where the footprint fits the deck unscaled; never over or against a rooftop pole or line (0.3 m clear of a roof pole's footprint; no footprint meets a roof line in plan; nothing to judge until D2). **Behind one constant** (for example `RUIN_ROOF_DEAD_TREES`, true): if a roof dead tree reads silly in the street screenshot (F3), the main session's call from the picture is to set it false (dead trees out, bushes kept), the ruin-pass's one line and re-pin.
- **`Env_Vines_06` on street sign posts** (not shown, taken as a departure; inferred from the images' columns): only if its shape wraps or hangs on a post. Its bounds (0.6 x 3.0 x 0.6) say a strand, not a sheet; the builder checks them against the GLB. **Behind one constant** (for example `RUIN_VINE_06`, true): if F3's picture shows it as a flat sheet like `_01/04/05`, it is set false, the ruin-pass's one line and re-pin.
- **As shown:** `Env_Overgrowth_*` on pavements, kerbs, roads and flat roofs; `Tree_Generic_Giant_01` alone in a park; ferns and bushes at path edges; `Tree_Vines_*` from branches; `Env_Vines_*` over eaves, awnings and posts.

**Acceptance criteria** (Vitest unless said):
1. [ ] **The layer.** `ruinStage` writes a `CityRuinLayer`: adds with ids `ruin:<kind>:<plan data>` (never list order), each kind from A4's `CityRuinPieceKind`, each add's `district` as above and its `cell` as A4's comment says (a vine's host cell). **No changes.** `steps` lists `"growth"` and `"remnants"` (0, 0), its counts summing to the layer's.
2. [ ] **The spread.** A fixture city with districts at `wild` 0.1, 0.2, 0.5 and 0.9 grows 0, 1, 2 and 3 cells out from its soil (hand-worked in the test); growth never enters a building; a cell reached from two districts' soil takes the nearer's (a tie: the least id). Density reads `wild` only (X-6): the same district with a higher `wild` never gets fewer pieces on a fixed hash. Park trees only from `wild` 1/3.
3. [ ] **The slots.** A fixture for each kind of the kit table: a patch per eligible cell, an `Env_Overgrowth_*` where one fits and the mound only where none does; on a crossing only flat ground cover, and no sapling or clump on a junction or crossing; a clump on the wall line off the cell's middle; a sapling at its hashed spot; the giant and large tree in a park; roof pieces on the deck, at most 2 per column, 0.1 m clear of H3's pieces; a tree-vine only on a standing tree. No key outside the kit anywhere in the layer, and no piece scaled.
4. [ ] **Trees and T-1 (B8).** A fixture with a hand-placed span: a tall sapling beside the span is placed; one whose crown meets the span is not placed and is in the under-span set. With the under-span constant set true (through the stage's options or a test double, not by editing the file), the spot is tried and, against today's T-1, the stage throws `CityStageError`: T-1 is not loosened. A tree whose crown is over a pole, a light or a lamp-post place is neither placed nor in the set. `Tree_Generic_Giant_01`'s crown is a 6.56 m radius.
5. [ ] **T-2 (option G).** Fixtures with hand-placed poles: a patch that would seal a pole in is left out; one that leaves a way round is placed; two touching districts keep both districts' poles joined. G's incremental check gives the same placed set as calling `t2Failures` for every candidate, on a small fixture city.
6. [ ] **Vines.** Fixtures: no vine in a drop with a fire escape, a face novelty sign or a drop wall point, but `_08` beside a drop where it fits; a drape that stands out over a drop's first 2 m is not placed; a vine on an awning with no sign, none on an awning with a fascia or blade sign; `_06` on a traffic post, never on a circuit pole, light or lamp post; no `Tree_Vines_*` on a wall.
7. [ ] **The switches.** With `RUIN_ROOF_DEAD_TREES` false, the layer has no `Tree_Dead_*` and every other add is the same; with `RUIN_VINE_06` false, no `Env_Vines_06` and every other add the same (each through options or a test double).
8. [ ] **T-1 and T-2 on the era.** The stage reads `resolveBefore(plan, "ruin")` and ends with `assertEraReadable` with its kit's `bounds` and its own `isTree`. A fixture where a forced add covers a pole throws `CityStageError` (X-4, R-2). A fixture shows that `Tree_Vines_*` and `Tree_Dead_*` are not canopies under F1's `isTree`.
9. [ ] **Dark and textured (X-5).** Every key in the kit table is on the converter's textured list for its pack; none is emissive (a typed table, pinned below).
10. [ ] **The kit pin (X-8).** The kit's sizes are typed in `src/city/ruin/` and pinned against the `nature-pack`, `palm-city-pack` and `apocalypse-ruin` GLBs by one new test in `src/render3d/`, inside `it.skipIf(!have)` (R-6). It reads its assets lazily (CI has none). The giant tree is pinned at 12.6 x 11.19 x 13.12.
11. [ ] **R-1 to R-7, X-1, the pins.** The layer is frozen; the same city twice gives the same layer; every clean digest, and the tech and hold-out layers' digests, are equal with and without the pass; no file of `src/city/ruin/` imports another stage folder or reads `bi`, `bj` or a street's `line`; `runCity()` runs no ruin code (X-7). **Its pin test pins the digest of the layer's `"growth"` part** (`CityRuinStepPart`, through `digestOf`) on the four pin cities.
12. [ ] **The picture (R-5):** a flat `CityEraPicture` of stage `"ruin"`, one legend entry per kind, the R-5 test as 070's. Nothing in `src/render3d/` draws it (F3, after J2).
13. [ ] **The numbers** (reported, not asserted), beside the pre-check's sketch at reach x 3 (sections 3 to 6): cells grown by cell kind (sketch 1,445 to 3,503); pieces a city by kind (sketch: patches 1,042 to 2,595, clumps 192 to 517, saplings 290 to 713, park trees 2 to 8 of each, roofs 484 to 1,008); patches that are overgrowth and that are mounds; vines by slot; distinct keys; **the pieces option G left out, per run, by kind** (sketch: patches 18 to 133, saplings 9 to 56, clumps 3 to 27); **the under-span set's size per run** (sketch 109 to 283); the time per city. Until K2 lands, G, T-1 and the under-span set find no circuit on the named runs: say so beside those rows.

**Files:** new `src/city/ruin/` and its tests; one new kit pin test in `src/render3d/` (the ruin-pass's, X-8); `src/city/stages.ts` (one line, `ruinStage` in `ERA_STAGES`); and the line of any test that asserts the `ERA_STAGES` list (today `src/city/pipeline/eras.test.ts`, `expect(ERA_STAGES.map((s) => s.name)).toEqual([...])`). Nothing in `src/core/` (A4 types the kinds and steps), the rest of `src/city/pipeline/`, `src/city/circuit/`, `src/city/tech/`, `src/city/holdout/` or any clean stage folder. Test command `npx vitest run --maxWorkers=1 src/city/ruin/` and its pin test, and one `npx tsc --noEmit`. No browser, no Blender.

**Interfaces.** A4, typed before F1 starts: `CityRuinPieceKind` (`"patch" | "clump" | "sapling" | "park-tree" | "roof" | "vine" | "tree-vine"`), `CITY_RUIN_PIECE_KINDS`, `CITY_RUIN_STEPS`, `CityRuinStep`, `CITY_RUIN_STEP_OF`, `CityRuinStepCount`, `CityRuinLayer.steps`, `CityRuinStepPart`. F1 codes against C1's `CityEraStageDef`, `resolveBefore`, `assertEraReadable`, `t1Failures`, `t2Failures`, `ReadableOptions`, `BoundsOf` and `digestOf` as merged. No new dependency.

### F2 · `ruin` remnants and the broken grid (ruin-pass, pure). Outline. Branch `ticket/073f2-ruin-remnants`
- **Waits for:** E1, K2, A2, F0, its pre-check. (Q12 is answered.)
- Its states are scenery. They are never drawn on a job's own parts (Q12, Josh: "No, puzzle faults only"); F2g and F3 hold that.
- **Its pre-check measures:** wrecks on carriageway, bays and lots (B1); fallen signs, logs, rubble; the changes by kind and by layer; toppled poles and cut spans per district; T-1 and T-2.
- Every toppled pole lists its spans' states (A's no-cascade rule).
- **Broken road** (A's road-tile question, taken under the goal, 21 Nov 2026 night; Josh may reverse): the ruin marks an `edge.ground` tile with `state: "broken"`, and F3 draws a damaged road piece there (sizes from `apocalypse-power`, F0). No type is added and no clean digest moves. The F1 and F2 pre-checks confirm it.
  - **Which pieces** (F1-Q6, taken under the goal, 22 Nov 2026 night; Josh may reverse): only the damaged pieces that fit one 5 m tile. Of `apocalypse-power`'s 12, `_01` (7.38 x 6.63), `_03` (5.23 m long) and `_04` (3.39 x 9.22) do not; the other nine (2.0 to 3.95 m) do. **No heaved slab (`_08`, `_09`, `_12`, 1.1 to 1.2 m high) on a crossing:** a state is not a piece, so T-1 and T-2 never see it, and a slab there would stand in the walk unjudged. F2 marks no crossing tile whose drawn piece would be one.
- **F2's pieces append after F1's** in the ruin layer's `"remnants"` step (A4), placed against F1's growth by option G as F1's growth is against E2's barricades.

### F2g · Jobs on the broken grid (grid-simulator, pure). Outline. Branch `ticket/073f2g-ruin-jobs`
- **Waits for:** F2, E1g. (Q12 is answered.)
- In `src/city/circuit/`: a city puzzle on the ruin era fails to load if it names a piece the ruin removed.
- A ruin `state` (cut, toppled, broken) on a part the job names is dropped for that job. The puzzle's own faults are its only damage (Q12, Josh: "On a job's own parts only the puzzle's faults are drawn.").

### F3 · `ruin` drawn (renderer). Outline. Branch `ticket/073f3-ruin-drawn`
- **Waits for:** F1, F2. R12 gains B1's allowance, era-scoped. Draws `state`: toppled, cut, broken, boarded, dark. A `broken` `edge.ground` tile draws as a damaged road piece (F2's broken road): only the nine that fit one tile, never scaled or cropped, and never a heaved slab (`_08`, `_09`, `_12`) on a crossing (F1-Q6, under the goal; Josh may reverse).
- Draws F1's growth too. The main session's street-level screenshots then settle F1's two switches: roof dead trees (`RUIN_ROOF_DEAD_TREES`) and the post vine (`RUIN_VINE_06`); a "no" is the ruin-pass's one line and re-pin, not the renderer's.
- Never on a played job's own parts (Q12, Josh). Dead wires keep today's look; a rusted, frayed look waits for K4's overlay (Q14, Josh).

## Check (a): can a change reference today's pieces?

Read in `src/core/cityplan.ts` on 103ce43.

| Layer | List | Stable id today? | Cheapest reference |
| --- | --- | --- | --- |
| streets | `streets`, `blocks`, `junctions` | yes (`x:<line>`, `block:<bi>:<bj>`, `junction:<i>:<j>`) | the id |
| streets | `cells`, `arrows` | no; one per cell | the cell |
| land | `parts` | yes | the id |
| land | `lanes`, `parks` | no; unique by block and axis, or block | `<block>\|<axis>\|<at>` (ground already uses it), or the block |
| mass | `openings` | yes | the id |
| mass | `cells`, `built`, `courts` | no; one per cell, or per opening | the cell, or the opening |
| edge | `cells`, `ground`, `kerbCuts`, `buildoutTrees` | no; one per cell | the cell (a 2-cell tile: its first) |
| edge | `tiles`, `bays` | no | index, or a tile's first cell |
| edge | `kerb` | yes | the id |
| buildings | `rows`, `buildings` | yes | the id |
| buildings | `columns` | no; one per built cell | the cell |
| buildings | a column's `pieces` | no | the cell and the piece's index |
| circuit | poles, spans, drops, lights | not typed yet | K's ids (note below) |
| facades | `ground`, `shops` | no; unique by `cells[0]` | the first cell |
| facades | `dressing`, `walls`, `roofs`, `novelty` | no; a cell can hold several of one kind | index |
| ground | `runs` | yes | the id |
| ground | `props` | no | index |
| traffic | `junctions`, `approaches` | yes | the id |
| traffic | `pieces` | no; `group` plus kind repeats (two walk heads) | index |

**The cheapest reference** is the one in A's sketch: **by id where a piece has one, else by list and index, with the key as a guard.**
- Earlier layers are frozen and the same on every run of a seed (R-1, R-3, R-4), and changes are made in the same run. So an index is stable for as long as the change exists.
- The key guard catches a reference that has slid onto another piece.
- No clean type gains a field, so no clean digest moves (X-1).
- String ids are needed only where something outside the run names a piece: a puzzle file. That is the circuit and the hold-out's plant and lines, and K is typing those now.

## A note for K's architect (before `CityCircuitLayer` is typed)

Later layers will change poles, spans, drops and lights, and add their own. For that, K's ids must:
1. **Be unique across the whole plan, not only the circuit layer.** Later poles (tech roof net, hold-out makeshift) will be `tech:pole:…` and `holdout:pole:…`. So a span's `a` and `b` must take any pole id, not only a street pole's.
2. **Give street lights an id.** CK15 gives none. For example `light:<street id>:<lo|hi>:<along_m, 2 decimals>`, as poles have. Lamp posts are keyed by their span, which is fine.
3. **Come from plan data, never list order.** CK15's formats already do. Keep it so.
4. **Not assume one per building or per pole pair.** `drop:<building id>` and `span:<a>~<b>` are fine for the clean circuit, if later layers prefix their own (`holdout:drop:…`).

And: leave room in the city-puzzle `place` union for a plant place (Q6). E1g types it.

## Check (b): the framing against the GDD

Read from the local clone `C:\Users\Josh\Documents\Rest GDD` (at dfd45b2), 21 Nov 2026.
- **"Extinct humans" agrees with the setting.** Overview: "A ruined human city kept lit long after its people died". Lore Bible: "No humans remain, as far as the player can see"; "Humanity simply stopped being born." So "the remnants of a dying species" fits.
- **"What the player knows" is Decided:** "The world is shown, never explained." Also: "hold back humanity's fate". So no piece may say why people died (X-10). The hold-out shows people struggling, and the ruin shows that they left. Neither shows the cause.
- **The GDD's salvage text names "wrecked vans, and old electrical boxes"** as salvage spots. That fits B1 and B3.
- **"Kept lit" means the ruin is not wholly dark** in the game's present. Light's grid still runs where jobs relight it. That fits F2's broken grid being the puzzle's ground, and Q10.
- **Two Draft lines (not law) that touch this work:**
  - 05: "Every cable is a grid cable. [...] Decorative wires in the ruins look clearly different: thin, rusted, and ending in frayed stubs." The plan draws makeshift and roof-net spans like today's wires. That look waits for K4's overlay (Q14, Josh).
  - 08: "The tribe's craft over human ruin" (raccoon salvage, ribbons on every control). No pass places it; a later ticket (Q15, Josh).

## Agents

Josh's card 8: "Yes, three agents (Recommended)". The main session writes each `.claude/agents/<name>.md`, modelled on 070's five.

| Agent | Folder | Reads before work | Never touches |
| --- | --- | --- | --- |
| tech-pass | `src/city/tech/` (plus its pin test in `src/render3d/`) | this ticket; the note's sections 4, 7, 8; guide 16.6; grammar rules 8 to 11; 070 H1 to H3b; the Sci-Fi City report | clean stage folders, `src/core/`, `src/render3d/` beyond its pin test |
| holdout-pass | `src/city/holdout/` (same) | the note's sections 5, 7, 8; `docs/design/070-K1-circuit.md`; `docs/design/071-power-kit-precheck.md`; the Sci-Fi Frontier report | the same, and `src/city/circuit/` (the grid-simulator's) |
| ruin-pass | `src/city/ruin/` (same) | the note's sections 6, 7, 8; K1's CK13 to CK15; the Nature, Palm City and `apocalypse-ruin` reports | the same |

**Every new agent's file says:**
- The CLAUDE.md hard rules.
- 070's R-1 to R-11, and X-1 to X-10, T-1, T-2 above.
- The breaks it may use, scoped (B-table), quoting Josh. Every other rule holds in its pass.
- "Fail, never patch": `CityStageError`. No check loosened, no city pinned.
- It reads earlier layers only through `CityPlan` and `resolvePlan`. It changes them only through its `changes` list.
- A type it needs is a re-cut by the architect, never its own edit.
- It picks textured pieces only, and nothing lit.
- It never draws; the renderer does.
- Its test command, `npx vitest run --maxWorkers=2 src/city/<folder>/`, and one `npx tsc --noEmit`. No browser, no Blender, no dev server.
- It reports the tests added, the numbers asked for, and anything it stopped on.

**Others:** the planner gains `src/city/history/` (the main session adds it, quoting card 8 and card 1). The grid-simulator keeps F0, E1g and F2g in its own folders. The hook needs no change (070's reasoning).

## Interfaces
- Section A: `src/core/cityera.ts`, written on `ticket/073a-era-types` under the goal and merged (4a5077f); `cityplan.ts` is not edited. Section A2, after K's type merges: the circuit references and the plant place.
- Section A3 (`ticket/073a3-pass-kinds`, under the goal): `CityTechPieceKind` narrowed to D1's kinds; `CityHoldoutPieceKind` for E2; the hold-out's steps (`CITY_HOLDOUT_STEPS`, `CITY_HOLDOUT_STEP_OF`, `CityHoldoutStepCount`, `CityHoldoutLayer.steps`, `CityHoldoutStepPart`). One file, `cityera.ts`.
- Section A4 (`ticket/073a4-ruin-kinds`, under the goal; not typed yet, typed before F1 starts): `CityRuinPieceKind` narrowed to F1's kinds (F2 widens it); the ruin's steps (`CITY_RUIN_STEPS`, `CITY_RUIN_STEP_OF`, `CityRuinStepCount`, `CityRuinLayer.steps`, `CityRuinStepPart`); `CityEraPiece.cell`'s comment reworded to D1's host-cell reading. One file, `cityera.ts`.
- `rules-coverage.md` is unchanged: no brief rule is tested here.
- **No new dependency.**

## Non-goals
- Fallen buildings and Sci-Fi towers (B11, card 6).
- Neon or any piece glowing (Q9: a later ticket).
- Emissive textures through the converter.
- Texturing the 108 Sci-Fi City and 188 Palm City models (a later `tools/` ticket).
- Palm City in the clean city's tables (stages 7 to 9's owners).
- Larger cities.
- Cars or traffic.
- A rusted, frayed look for dead wires (Q14: waits for K4's 2D overlay).
- The tribe's own marks on the ruin: raccoon salvage, ribbons, shrines (Q15: a later ticket).

## Plan points this ticket corrects
- **"The plan always runs all stages"** (note, section 3) would make every existing `runCity()` run four more stages, and every clean test slower (`plan3d.test.ts` is 113 s today). X-7 and C1 criterion 3 run the new stages only for an era run.
- **"New owner, with the grid-simulator"** for E1 and F2 is two owners. Split into E1/E1g and F2/F2g, one owner each.
- **B7 scope.** The note's table lists B7 for hold-out and ruin. Its pavement tech is the tech pass's, so the tech pass keeps rule 10 (X-3).
- **Shopfront swaps** (D1's outline). A swap keeps the placement, which would put the panel inside the building. D1 adds the panel in front and removes that face's dressing (the D1 pre-check, section 0). A's `swap` stays for other passes.
- **Cameras on the pavement, the billboard frames, a horizontal `Prop_Pipes_01`, a roof walkway, `Bld_Raised_*` on roofs.** Each against the store images (X-11); see D1, D2.

## Questions for Josh

**Josh, please look at this one: B-Q3.** This ticket said that if the clean city fails T-1, "that goes to Josh before any pass, never tuned". The B pre-check found it does, on 20/20 runs (the fire escapes and face signs over drops he chose to leave on K1's card 1, street furniture on poles until K's I2, furniture on about 1 in 30 lamp-post places). It did **not** go to Josh. It was answered on his delegation instead: **T-1 judges only what a pass adds or swaps; the clean city's own clashes are reported each run, not failed.** C1 is cut on that answer. If Josh wants T-1 to judge the whole plan instead, no pass can pass it until H2 and H1c re-open (which he declined on card 1); C1's criterion 4 changes and D1 onwards wait.

**Josh, please look at this one too: F1-Q1, B8 against T-1** (provisional; answered by the Fable session on Josh's delegation, 22 Nov 2026 night; Josh may reverse). Two of Josh's own choices collide. Card 5 gave the ruin "Trees under dead wires" (B8), and the same card granted its breaks "with T-1 and T-2 holding". T-1 fails every crown that meets a pole line. The F1 pre-check found 109 to 283 sapling spots a run under spans, 3.6 to 5.4 m high: every one is over the 3.2 m cap and every one fails T-1, so B8 as worded grants nothing. **The answer taken:** ruin trees are free of the 3.2 m cap (`FURN_MAX_H_M`) but stand beside a line, never with a crown over one. T-1's check and C1's code are not touched; loosening T-1 stays held for Josh. **The two ways out:**
- **(a) As built:** beside only. The under-span spots are not placed.
- **(b)** T-1 judges only a job's live lines, and trees grow through scenery-only dead spans. This needs K2's split of job lines from scenery. F1 keeps the under-span spots as a computed, separately named set that is not placed (one constant or filter), so (b) is that switch and a re-pin, after T-1's own change.

**Open:**
- B-Q3 above, for Josh to confirm or reverse.
- F1-Q1 above, for Josh: (a) or (b).
- **A3's point** (for the main session; not a rule): A3's narrowed kinds make C1's fixture `add()` (kind `"thing"`, a `string`) fail `tsc` once both are on the goal branch. The planner's one-line fix in `src/city/pipeline/erafixtures.ts` (`add()` returns `CityEraPiece<never>`, `kind: "thing" as never`), before C1 merges or straight after (A3 criterion 3). The other way: A3 keeps the layers' kind `string` and only exports the unions, which loses the check that a pass writes only its own kinds.
- D2's pre-check will ask whether `Bld_Raised_*` may go on roofs as extra storeys (the images show it only at street level). Each later pre-check brings its own, recommended answer first.

**Answered by the Fable session on Josh's delegation (21 Nov 2026 night); Josh may reverse.** The delegation: Josh, 21 Nov 2026, in chat: "If the opus session has questions, it can hand off the questions to you, feel free to answer those questions on my behalf". None of these is Josh's ruling.

*The B pre-check* (`docs/design/073-B-precheck.md`):
- **B-Q1, the district rule:** rule A (hashed sizes 1/2/3/4 blocks at 20/30/25/25, grown onto the neighbour sharing the most street). Yes. (B.)
- **B-Q2, the story rule:** `tech` falls off by street steps from a hashed inner centre; `held` 0 for about a quarter of districts (no plant, so the feed is on a pole just outside); `wild` = 1 − `held` ± 0.15. Yes. (B.)
- **B-Q3, T-1 on the clean city: T-1 judges only what a pass adds or swaps; the clean city's own clashes are reported per run, not failed.** Reason given: Josh allowed those clean clashes himself ("Leave the clashes", K1 card 1), and no clean check is loosened. **This is the one Josh should look at** (above): the ticket had said it goes to him. (C1.)
- **B-Q4, covered lamp-post places:** the puzzle designer skips them; no furniture moves. Yes. (A line for K's architect and the designer, not this ticket.)
- **B-Q5, T-2's walk graph:** "reachable on foot" is through street cells only; a cell is blocked when a standing piece covers its middle. Yes. (C1.)
- For K's architect (not a question for Josh): 8 to 22 tree canopies a run stay over wires after I2 unless I2's span rule reads a tall item's bounds in plan.

*The D1 pre-check* (`docs/design/073-D1-precheck.md`):
- **D1-Q1, density:** three bands by `tech` (under 1/3 wall bolt-ons only; from 1/3 signs and pavement pieces too; from 2/3 new shopfronts too), about 2,000 pieces a city at the top. Yes.
- **D1-Q2, shopfronts:** added 0.7 m out in front of the old shop, the old face's dressing removed, never on corner shops. Yes. A departure under X-11 (the images show shopfronts as the building's own ground storey; reason: an added front is what Josh's "augmented" city needs). D1 is an add plus removes, never a swap.
- **D1-Q3, tall vents:** only on bare side walls, never over windows. Yes.
- **D1-Q4, the walk:** every pavement tech piece leaves at least 2 m of clear walk. Yes.
- **D1-Q5, cameras:** on walls at the first floor, not on the pavement. Yes (matches the images).
- **D1-Q6, lamp-post places:** pavement tech keeps 1.5 m from them too. Yes.
- **Kit against the intended-use note:** `Prop_Pipes_01` vertical only, as the images show (dropped if no vertical place holds); `Prop_Overhang_01/02` as canopies, allowed, listed "not shown in the images"; `Prop_ChargingStation_01` at the kerb, allowed, the same listing.
- **The shopfront panel's ends** (about 70% faced): keep. The main session takes a street-level picture along a pavement past a new front when drawn (D1g criterion 6); if the end reads as a loose panel, the top band's shopfronts stay out of the merge (the rule's constant set off) and the picture goes to Josh. No invented filler piece.
- **The Sci-Fi City power pole:** the images show it on the pavement at the kerb. Josh's ruling stands (roofs and objects, not the ground). Recorded only that the rooftop use is Josh's own choice, not what the images show (D2).
- **Plan-level readings** (folded into D2 and F1): `Prop_Bridge_01` is an open truss across a street carrying cables and signs, not a walkway (the roof walkway dropped; D2 may use it as shown); `Bld_Raised_*` is a raised deck on pillars at street level, not a roof storey (not on roofs without Josh; D2's pre-check lists roof storeys as an open question for him); Palm City `Env_Vines` only 01/04/05 are flat wall sheets, the rest drape over eaves, arches and columns; Nature `Tree_Vines` hang from branches only (F1).

*The E2 pre-check* (`docs/design/073-E2-precheck.md`), answered by the Fable session on Josh's delegation (22 Nov 2026 night); Josh may reverse:
- **E2-Q6a, farms in city parks:** allow, as a departure (a park is the city's open soil, which the images show farms on). Only farm pieces whose footprint fits inside the park rectangle; never scaled; never across a kerb in this pass.
- **E2-Q6b, containers in court stalls and kerb bays:** allow, listed "not shown in the images".
- **E2-Q6c, Frontier walls as barricades:** allow (the images show them enclosing a settlement; closing a street mouth is the same job). The Apocalypse barricades stay in the ruin's kit.
- **Q1 to Q5** (option C included): agreed.
- **The order:** build E2 now. Barricades are the pass's last step, their own sub-step with their own digest, **not pinned on the named runs until E1 merges**; the rest of E2 may be pinned now.
- **E2 merges as a pure stage with its flat picture only** (not drawn before J2). The plant's place and the makeshift lines stay with E1.

*The F1 pre-check* (`docs/design/073-F1-precheck.md`), answered by the Fable session on Josh's delegation (22 Nov 2026 night); Josh may reverse:
- **F1-Q1, B8 against T-1: provisional, flagged for Josh** (above, beside B-Q3). Ruin trees are free of the 3.2 m cap (`FURN_MAX_H_M`) but stand beside a line, never with a crown over one. Way-outs (a) and (b) as above; the builder keeps the under-span spots as a computed, separately named set that is not placed. T-1's check and C1's code are not touched. (F1.)
- **F1-Q5, the X-11 departures:** all four allowed, listed in `docs/design/073-pack-intended-use.md` as "not shown, taken as a departure"; Apocalypse `Env_Overgrowth_*` first wherever it fits. (F1.)
  - Grass mounds and saplings on the road: B9, ruin only; on a crossing only flat ground cover; never scaled.
  - Bushes and dead trees on roofs: B10, ruin only; only where the footprint fits the roof deck unscaled; never over or against a rooftop pole or line. If a roof dead tree reads silly in the street screenshot, drop dead trees, keep bushes (the main session's call from the picture).
  - `Env_Vines_06` on street sign posts: only if its shape wraps or hangs on a post (bounds and one screenshot); if it is a flat sheet like `_01/04/05`, drop it.
- **Q2, Q3, Q4, Q6:** agreed. Q2: report the left-out count per run, as E2 does for barricades. (F1.)
- **The ruin is not drawn before instancing (J2).** (F1, F3.)

**Taken under the goal (21 to 22 Nov 2026 night); Josh may reverse.** None of these is Josh's ruling.
- **E2-Q1, density bands by `held`:** nothing at 0; clutter, containers, camps and roof panels above 0; barricades, stalls and water towers from 1/3; parks become farms from 2/3. (E2.)
- **E2-Q2, barricades by option C:** placed only where T-1 and T-2 still hold, last in the pass, after E1's plant and lines (until E1 lands, against what exists; re-checked when E1 lands). (E2.)
- **E2-Q3:** a barricade removes the stage 9 piece it stands on. (E2.)
- **E2-Q4:** containers in court stalls and kerb bays, both. (E2.)
- **E2-Q5:** one `Bld_Market_Stall_02` per plaza or front lot (`_01` and `_03` are 10.06 m, too wide). (E2.)
- **E2's fit:** roof panels `Prop_Solar_Panel_02` and `Prop_Fabric_01/02` only; the water tower on the ground in courts, as the images show, never on roofs. (E2.)
- **C1 and D1 are built now against fixtures,** and D1's tech digests are re-pinned when K2 lands. E2 likewise. (The D1 timing point, formerly open.)
- **The merged district id stays:** `district:<its first block in streets.blocks order>`, A's type, where the B pre-check wrote "least block id". (B.)
- **D1 is kept whole,** not split into walls and pavement. (D1.)
- **A3:** the passes' kinds and the hold-out's steps typed in `cityera.ts` before D1 and E2; "container" is the hold-out's stores kind.
- **D1's kit:** `Sign_Billboard_Border_*` and `_Tall_*` dropped (empty frames; the picture pieces, `Sign_Ad_*`, are untextured). The Fable session agreed.
- **A's road-tile question:** the ruin marks an `edge.ground` tile `broken` and the renderer picks the damaged road piece (option a). No type added, no clean digest moved. The F1 and F2 pre-checks confirm it (F2, F3).
- **F0:** the ticket's 24 `SM_Env_RoadPiece_Damaged_*` was wrong: the pack has 12, all already in `apocalypse-power`. F1 and F2 read road sizes from there.
- **F1-Q2, T-2 by option G:** growth is placed only where T-2 still holds (as E2's barricades); about 1 in 20 left out. C1's walk rule (B-Q5) is unchanged. (F1.)
- **F1-Q3, growth density:** spreads from parks, lawns, street trees and planters up to `round(wild x 3)` cells; none where a district held to the end. (F1.)
- **F1-Q4, vine slots as measured:** roof edges, awnings, posts; never over a fire escape, a face sign or a drop (`Env_Vines_08` / `_06` beside a drop where it fits). (F1.)
- **F1-Q6, the broken road:** only damaged pieces that fit one 5 m tile; no heaved slab (`_08`, `_09`, `_12`) on a crossing. (F2, F3.)
- **The F1 pre-check's corrections:** `Tree_Generic_Giant_01` is 12.6 x 11.19 x 13.12 m; F1 passes its own `isTree` (C1's default counts `Tree_Vines`, `Tree_Log`, `Tree_Stump` and `Tree_Dead` as canopies). (F1.)
- **The architect's readings in the F1 cut:** A4 types the ruin's kinds and a `"growth"` / `"remnants"` step split, so F1's pin does not move when F2 lands; F1 waits for E2 merged but not for E1, J2 or K2 (its pins re-taken as earlier passes and K2 land); the vine and tree-vine chances (0.3 x `wild`) are starting values the pre-check did not measure; the ruin's roof growth is recorded as B10 for the ruin, as the Fable session's F1-Q5 answer reads it, though the break table listed B10 for tech and hold-out only. (A4, F1.)
- **The architect's readings in this re-cut:** a district's id is A's merged type's (its first block in `streets.blocks` order), where the B pre-check wrote "least block id"; until K2 merges, C1's and D1's circuit checks find no points on the named runs and are proven on fixtures (B, C1, D1).

**Answered by Josh himself** (21 Nov 2026, in chat; his words are in the tables under "Josh's words"):
- The note's 1 to 9: cards 1 to 8, and "I like all of your suggestions, make them so" for 6 and 9.
- **Feed place:** "Yes, plant inside (Recommended)". Where a district has a plant, it is the feed; K2's feed-outside check skips those jobs.
- **10. Which era is a city job played in?** "The ruin (Recommended)".
- **11. A district with no plant:** its feed is a pole just outside it, as K1 had it. ("Yes, all four (Recommended)".)
- **12. The ruin's broken grid on a job's own parts:** "No, puzzle faults only (Recommended)".
- **13. A wire over a pole line:** allowed. Only solid pieces and tree canopies count as covering. ("Yes, all four".)
- **14. Dead wires' look:** rusted and frayed waits for the 2D overlay ticket (K4). ("Yes, all four".)
- **15. The tribe's own marks:** a later ticket. ("Yes, all four".)

**Unblocked by these answers:**
- **E1g:** no longer waits on a question; it waits only for E1 and K2.
- **F2 and F2g:** no longer wait for Q12; they wait for their builds and pre-checks only.
- **F3:** knows what not to draw on a job's parts.
- **D2's and E1's pre-checks:** a roof-net or makeshift wire over a pole line is reported, not failed (Q13). E1's no-plant districts have a feed rule (Q11).
- **C1's T-1 reading:** "what covers" is settled (Q13). What T-1 judges, and T-2's walk graph, were answered on Josh's delegation (B-Q3, B-Q5).
- **K2's cut** (outside this ticket): its feed check must skip plant-fed jobs.
