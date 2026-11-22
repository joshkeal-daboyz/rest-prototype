# 073 · The city's transformations: technology, the hold-out, the ruin

owner: per section (lead-architect, planner, renderer, grid-simulator, pipeline-designer, and three new agents: tech-pass, holdout-pass, ruin-pass; see Agents)
status: open. Cut 21 Nov 2026 from `docs/design/073-transformations.md` and Josh's answers on its eight cards and its questions 6 and 9.
- **Cut in full:** A (types, waiting for K's type), the B pre-check, B, C1, C2, F0, the D1 pre-check.
- **Outlined:** D1, D2, D3, J2 (instancing), E1, E1g, E2, E3, F1, F2, F2g, F3. Each is cut in full when what it waits for has merged.
- Questions: Q1 to Q9 of the note answered (below). Q10 to Q15 are new and open.
branch: one per section, `ticket/073<section>-<slug>` (named in each), each cut from `goal/city-style`.

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
- The ruin era is the city a job is played on (Q10, recommended), and a job's feed is its district's plant (Q6).

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

**T-1 and T-2 (every era; Josh's, card 5, in the card's words).**
- **T-1, the circuit stays readable.** No piece of any pass covers a stage 6 pole, node place or street light from above, and no canopy closes over a pole line. A tree may grow beside a line, not over it. (Whether a thin wire crossing over a line counts is Q13.)
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
| B10 | Roof items capped (towers 1 per 16 buildings; roof dressing counts) | many more roof items | tech, holdout |
| B11 | Openings are the only gaps (rule 6); heights follow rule 8 | **not broken** (card 6: "Yes, all stand") | none |

So, plainly:
- The tech pass keeps rule 10, `FURN_KEEP_M` and `FURN_MAX_H_M` on the pavement. Its street tech stands where furniture may.
- Only the ruin may place vehicles. Only the hold-out may run lines off anything but a pole.
- **Not broken, on purpose** (the note): conductors stay code-drawn (042 Q9); pack cable pieces are ground clutter only; the ladder and the GDD's Decided rules are untouched.

## Q6 and K1

Josh's Q6: "a job's district is a history district by default, and its feed is that district's plant".

**What it changes:**
- **CK14's edge.** K1 says "the edge is the designer's choice". Now the designer starts from a history district. A district of the designer's own (still 1 to 4 touching blocks) is the exception, and the note says why.
- **The feed's place.** K1 question 10 (Josh) put "each job's own feed on a pole just outside its district". For a job on a history district with a plant, the feed is the plant, inside the district. K2's check "each feed stands outside the district, joined by exactly one span that enters it" does not apply to that job. Josh's later words win; this ticket records it so K2's cut can say so.
- **CK15's places.** A node's `place` gains a plant place, `{ plant: <plant id> }`, read from the `holdout` layer. Typed with E1g, not now.

**What it leaves alone:**
- CK14's extent (1 to 4 blocks, first jobs at one), the dead rest of the city, and that unnamed parts in the district are scenery.
- CK12's places for breakers, switches, fuse boxes, junctions and lamps.
- The puzzle-designer's remit: what the priests want lit, the trap, the place table, the numbers. The designer still writes every city puzzle; it now picks a history district by default.
- `puzzles/city-two-ways-round.json` (K1's worked map, block:6:6, feed outside). It stays as it is: it was laid before `history` existed.
- The ladder and `puzzles/locked/`.

**What it does not settle:** a district with no plant (Q11) and the era a job is played in (Q10).

## Sections

Order:
- A (after K's `CityCircuitLayer` merges) → B and C1 alongside → C2.
- The B pre-check and the D1 pre-check may start now. They are probes outside the repo.
- F0 may start now. It touches nothing in git.
- B → D1 → D2 (after K2) → D3 → J2 → E1, E2 → E1g → E3 → F1, F2 → F2g → F3.

Every section's must-not-touch is 070's list (`src/core/`, `src/grid/`, `src/night/`, `src/render/`, `src/play/`, `src/ui/`, `src/main.ts`, `town.ts`, `terrace.ts`, the two pin tests, `tests/`, `puzzles/`, `tools/`, `package.json`, `assets/`, `tickets/`, the grammar and the guide), plus every clean stage folder (`src/city/streets/` to `src/city/traffic/`) unless the section names a line in it.

### A · Types: the four layers, adds and changes, references, the era option, the resolver's contract (lead-architect). Branch `ticket/073a-era-types`

**Waits for:** K's `CityCircuitLayer` merged into `goal/city-style`. Another session's architect types it in `src/core/cityplan.ts` now. **A does not edit that file until then.** The shapes below are a sketch. A writes them after reading K's layer as merged.

**What A adds (sketch; names are free):**

```ts
// The eras. "clean" is the plan through "traffic".
export const CITY_ERAS = ["clean", "tech", "holdout", "ruin"] as const;
export type CityEra = (typeof CITY_ERAS)[number];
// The last stage each era runs: clean "traffic", tech "tech", holdout "holdout", ruin "ruin".
export const CITY_ERA_LAST: Readonly<Record<CityEra, CityPlanStage>>;

// Stage 10.
interface CityDistrict { id: string;            // "district:<least block id>"
  blocks: readonly string[];                    // 1 to 4, touching across a street (CK14)
  tech: number; held: number; wild: number; }   // 0 to 1
interface CityHistoryLayer { stage: "history"; districts: readonly CityDistrict[]; }

// A reference to a piece of an earlier layer (see "Check (a)" below).
type CityPieceRef =
  | { id: string }                                          // a piece with its own id
  | { list: CityPieceList; index: number; key: CalibrationKey | null };  // by place in a frozen list, with a guard
type CityPieceList = "facades.ground" | "facades.dressing" | "facades.walls" | "facades.roofs"
  | "facades.novelty" | "ground.props" | "edge.ground" | "edge.buildoutTrees"
  | "traffic.pieces" | "buildings.columns" | ...;          // A lists every list a pass may change

type CityPieceState = "dark" | "boarded" | "broken" | "toppled" | "cut";
type CityChange =
  | { ref: CityPieceRef; op: "remove" }
  | { ref: CityPieceRef; op: "swap"; key: CalibrationKey }   // same place, another key
  | { ref: CityPieceRef; op: "state"; state: CityPieceState };

// Stages 11 to 13: adds and changes. Each pass's piece kinds are its own.
interface CityEraLayer<S extends "tech" | "holdout" | "ruin", P> {
  stage: S; adds: readonly P[]; changes: readonly CityChange[]; }
interface CityEraPiece<K extends string> { id: string;    // "<stage>:<kind>:<...>", unique in the plan
  kind: K; district: string; cell: CityCell; placement: CityPlacement;
  size: { x_m: number; z_m: number; h_m: number }; }
// The hold-out's plant, makeshift poles and spans, and the tech roof net, carry ids
// in K's scheme, namespaced by stage (see the note for K's architect).
```

**The resolver's contract** (built in C1):
- `resolvePlan(plan, era)` is pure. It never mutates a layer. It returns the plan as it stands at that era: every layer up to the era, each era's adds, and every change applied in stage order, then list order.
- `clean` resolves to the plan itself, deep-equal, same digests.
- A removed piece is gone. A swapped piece keeps its placement with the new key. A stated piece carries `state`.
- No cascade. A pass that topples a pole also lists the state of each span on it. C1's check fails a toppled pole with an uncut span.
- It fails (a typed error naming the stage whose change it is) when: a reference finds nothing; a key guard does not match; one layer changes a piece twice; a change targets a piece an earlier era removed; a swap targets a piece with no key (a cell record without one).
- A later era may change an earlier era's adds (the ruin cuts a makeshift span).

**Acceptance criteria:**
1. [ ] (the architect) The types above, as merged against K's layer, in `src/core/cityplan.ts`, exported from `src/core/index.ts`. `CityLayers` gains `history`, `tech`, `holdout`, `ruin`. `CITY_STAGES` gains the four between `traffic` and `assemble`.
2. [ ] `npx tsc --noEmit` passes. `npx vitest run --maxWorkers=2 src/city/pipeline/ src/render3d/planview.test.ts` passes, or each failure is listed with the one-line change C1 or C2 makes for it (070 TR1 criterion 0's pattern; `planview.test.ts`' "not a plan stage" literal will move).
3. [ ] No clean layer's type changes, except what K's own cut asks.

**Files:** `src/core/cityplan.ts`, `src/core/index.ts`. No new dependency.

### The B pre-check · history, and T-1 and T-2 on the clean city (pipeline-designer). No branch: a note `docs/design/073-B-precheck.md` and a probe outside the repo

**May start now,** on `goal/city-style` as it stands. It uses the K1 pre-check's probe for poles, lights and node places until K2 exists.

**It measures, on the 20 named runs, and sets no threshold of its own:**
- **Districts** as the note proposes (1 to 4 touching blocks): how many per city; the sizes; every block in exactly one; how many single blocks are left that touch no free neighbour.
- **The stories:** the spread of `tech`, `held`, `wild`; how `tech` falls off from its centre (by street steps); how strongly `wild` follows `held`; how many districts have `held` near 0 (no plant, Q11).
- **Jobs (Q6):** for each district, the CK12 places it holds (poles with 2 and 3 or more attachments, buildings with drops, posts), so the designer knows which districts can hold a job.
- **The plant's ground:** each district's largest open place (court, park, lot, plaza) by cells. Districts with none.
- **T-1 on the clean city:** every clean piece that covers a pole, a node place or a street light from above (awnings, build-out trees, stage 7 boxes), with its run. If the clean city fails T-1, that goes to Josh before any pass, never tuned.
- **T-2 on the clean city:** whether every district's poles reach each other on foot along pavement and road. Its graph (which cells count as walkable) is the note's reading, written down for C1.
- The time per city for `history`.
- **It proposes:** the district rule, the story rule, and the T-1 and T-2 readings, each with a recommended answer first, as questions for Josh.

### B · Stage 10, `history`: districts and their stories (planner, pure). Branch `ticket/073b-history`

**Waits for:** A, and Josh's answers to the B pre-check.

**Goal.** Every named city is cut into districts of 1 to 4 touching blocks. Each has a short story: `tech`, `held`, `wild`. `?city=plan&stage=history` shows them on Josh's phone.

**Acceptance criteria** (Vitest unless said):
1. [ ] On the 20 named runs, every block is in exactly one district. Each has 1 to 4 blocks that touch across a street (`CityPlanBlock.sides[*].across`).
2. [ ] Each story follows the rule Josh answered in the pre-check. Each value is in 0 to 1. A hand-worked fixture city has its districts and stories worked out by hand.
3. [ ] The picture (R-5): one legend entry per district band, and the district's id per cell. The R-5 test as 070's.
4. [ ] R-1 to R-7: the layer is frozen; the digest is pinned on the four pin cities; a test double for `history` leaves every clean digest equal; the same city run twice gives the same layer; no file of the folder imports another stage folder or reads `bi`, `bj` or a street's `line`.
5. [ ] `src/city/stages.ts` gains `historyStage` (one line), behind C1's era runner so a clean run never runs it (X-7). If C1 is not merged yet, B adds it to a separate era list C1 reads.
6. [ ] The numbers (reported, not asserted): districts per run by size, the stories' spread, the time per city.
7. [ ] (main session, phone screenshot) `?city=plan&stage=history` on 6 x 6 seed 1.

**Files:** new `src/city/history/`; `src/city/stages.ts` (one line); `src/render3d/planview.test.ts` (one literal, if A's criterion 2 lists it). The builder runs `npx vitest run --maxWorkers=2 src/city/history/ src/city/pipeline/` and one `npx tsc --noEmit`.

### C1 · The resolver, the era runner, and T-1 and T-2 (planner, pure). Branch `ticket/073c1-resolver`

**Waits for:** A, and the B pre-check's answers (for the T readings).

**Goal.** One pure helper turns a plan into the plan at an era. A run can ask for an era. T-1 and T-2 can be checked on any era.

**Acceptance criteria** (Vitest):
1. [ ] `resolvePlan(plan, era)` in `src/city/pipeline/` meets A's contract. Fixtures: each change kind on each `CityPieceList`; a change by id; every failure case in the contract, each failing with the stage named.
2. [ ] `clean` resolves to the plan itself on the 20 named runs, deep-equal.
3. [ ] **The era runner.** `runCity(options)` and `runCity(options, until)` for a clean stage run exactly what they run today (X-7). A new `runCityEra(options, era)` runs the clean stages, then `history` and the passes up to the era's last stage. A test shows a clean run calls no era stage.
4. [ ] `t1Failures(resolved)` and `t2Failures(resolved)` with the readings Josh answered. Each has a failing fixture (a piece over a pole; a barricade that seals a pole in) and a passing control. On the clean city they give what the pre-check reported.
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

### D1 · `tech` walls and pavement (tech-pass, pure). Outline. Branch `ticket/073d1-tech-walls`
- **Waits for:** B, C1, the D1 pre-check and Josh's answers. The tech-pass agent file.
- Places D1's pieces by the answered rules; its changes are shopfront `swap`s and the `remove`s of the dressing they float.
- Uses B2 for dark signs. Keeps rule 10 on the pavement (X-3).

### D2 · `tech` roofs: storeys, plant, holograms, the roof net (tech-pass, pure). Outline. Branch `ticket/073d2-tech-roofs`
- **Waits for:** K2's circuit layer, B, its own pre-check.
- **Its pre-check measures:** flat roof runs that fit `Bld_Raised_01/02`, `Building_Shack_*`, `Bld_Roof_Pagoda_02`, clear of stage 7's towers, exits, billboards and roof novelty; the roof items per building against B10; roof-to-roof span lengths across streets and lanes, and the `Prop_Powerpoll_01/02` attach height; whether one net per high-tech district connects; walkway fits (`Prop_Bridge_01` is 5.0 m, a lane is 5 m wall to wall); how many roof-net spans cross a stage 6 pole line in plan (Q13); T-1 and T-2.
- Josh's ruling holds: Sci-Fi City poles stand on roofs and objects, never on the ground.

### D3 · `tech` drawn (renderer). Outline. Branch `ticket/073d3-tech-drawn`
- **Waits for:** D1, D2, C2.
- Draws `tech` adds and changes at `era=tech` and later. R12 gains B2's allowance, era-scoped (X-9). Dark (X-5).
- Reports draw calls and frame rate at each era, before J2.

### J2 · Instancing (renderer). Outline. Branch `ticket/073j2-instancing`
- **Josh's card 7:** "Instancing becomes a section of this work, built after the technology pass is drawn and before the hold-out pass is."
- **Waits for:** D3. **E3 waits for it.**
- Instances the stack pieces and the dressing (070 Q29's J2). Every clean picture and pin stays the same. Adds no rule, so no pre-check.

### E1 · `holdout` plants and makeshift lines (holdout-pass, pure). Outline. Branch `ticket/073e1-holdout-power`
- **Waits for:** D2, K2, B, its pre-check.
- **Its pre-check measures:** in each held district, the largest open place and whether a plant (`Prop_Generator_01`, `Prop_Solar_Panel_02..04`, `Prop_Battery_03/04`, `Prop_Windmill_01`) fits there, reachable on foot (T-2); makeshift line routes from the plant to the district's street and roof poles: lengths, how many run over junctions (B5), off light posts, masts or walls (B4), drops across streets (B6); T-1; how many held districts get no plant (Q11).
- Uses B3 to B6. Its plant, makeshift poles and spans carry ids in K's scheme, prefixed `holdout:` (A).
- The plant is the job's feed (Q6), so E1g follows.

### E1g · The conversion learns the plant (grid-simulator, pure). Outline. Branch `ticket/073e1g-plant-feed`
- **Waits for:** E1, K2, and Q10 and Q11.
- CK15's conversion accepts `{ plant: <id> }` as a feed's place and makeshift spans as runs, in `src/city/circuit/`. The converted `Puzzle` still passes `validatePuzzle`, and `src/grid/` runs it unchanged.
- K2's feed-outside check skips a job whose feed is its district's plant (Q6 and K1, above).
- The architect types the plant place in `src/core/` first.

### E2 · `holdout` camps, farms, markets, stores, barricades (holdout-pass, pure). Outline. Branch `ticket/073e2-holdout-camps`
- **Waits for:** B, C1, its pre-check. Needs nothing from the circuit but T-1 and T-2.
- **Its pre-check measures:** tents and pods in courts and parks; parks that become farms (the trees and benches removed); market stalls in front lots and plazas; containers in stalls, one each; barricades at a district's street mouths, with at least one way in kept; clutter on pavements (B7); roof items (B10); T-1 and T-2 on the resolved plan.
- Excluded pieces: alien plants, sand, cliffs, weapons, character parts, the cantina interior.

### E3 · `holdout` drawn (renderer). Outline. Branch `ticket/073e3-holdout-drawn`
- **Waits for:** E1, E2, J2. R12 gains B3's allowance, era-scoped.

### F0 · The Apocalypse ruin pieces converted (grid-simulator; config and one Blender run, no code). No branch: nothing in git changes

**Josh's card 4:** "Yes, convert it (Recommended)".

**Goal.** The ruin pieces of the POLYGON Apocalypse pack are a GLB of their own, `apocalypse-ruin`, listed in `manifest.json` beside the eight packs there, which do not change. The F1 and F2 pre-checks read their sizes from it. No game code reads it yet.

**How `apocalypse-power` was made** (read 21 Nov 2026): it is its own folder under `assets/private/in/`, holding 96 FBX copied from the pack and a copy of its `Textures/` (30 MB), with no `pack.json`. F0 does the same. Nothing in `in/apocalypse-pack/` is moved or changed.

**The starting list** (stems in `in/apocalypse-pack/FBX/`, top level only; counts read 21 Nov 2026):
- `SM_Env_RoadPiece_Damaged_*` (24); `SM_Env_Overgrowth_*` (10) and `SM_Env_Overgrowth_Edge_*` (4); `SM_Env_Sidewalk_Overgrown_*` (3)
- `SM_Prop_Car_Wrecked_*` (cars, SUV, van, bus, stacks, wheels; about 27)
- `SM_Prop_Barricade_*` (13), `SM_Prop_Road_Barrier_*` (2), `SM_Bld_Door_Barricaded_*` (9)
- `SM_Prop_Rubble_Concrete_*` (6), `SM_Prop_Powerpole_Broken_*` (4), `SM_Prop_Wall_Wire_Damaged_*` (3)
- Not: `Characters/`, `Collision/`, `FX/`, `Rigged/`, weapons (`SM_Wep_*`), vehicle attachments (`SM_Veh_Attach_*`), anything already in `apocalypse-power`.

**Acceptance criteria** (the builder checks; Josh's PC freezes under load):
1. [ ] **The junction first.** The worktree it runs from has `assets/private/in` resolving to `D:\rest-prototype-main\assets\private\in`, listing all nine pack folders. `D:\rest-prototype-goal\assets\private\` has only `calibration` and `out` today. Without `in`, do not convert: the manifest merge would drop every pack (072's warning).
2. [ ] `in/apocalypse-ruin/FBX/` holds a copy of exactly the starting list, and `in/apocalypse-ruin/Textures/` a copy of the pack's `Textures/`. The builder lists each stem copied, with its count.
3. [ ] Back up `out/manifest.json` to `out/manifest.json.bak-073f0`. Run `npm run assets:convert -- apocalypse-ruin` once, in the background, with nothing else heavy running. Never with no pack name.
4. [ ] Every other pack's manifest entry equals its entry in the backup (a node one-liner). Their GLBs, `out/city-pack/colourways/` and `calibration/` keep their modified times. If any moved, restore the backup and stop.
5. [ ] Scale as 072 B: start with none; one more run at 100 or 0.01 only if more than 10% are `scale-suspect` at about 100x or 0.01x. No third run.
6. [ ] **The report** (in the hand-back; no file): models converted, failures with their first line, each warning's count, the scale and runs, the GLB size, the wall time, and each piece's bounds in metres, by group.
7. [ ] No file in `src/`, `tools/` or anywhere in git changes. `git status` is clean.

**Files (not in git):** `assets/private/in/apocalypse-ruin/`, `assets/private/out/` (written by the converter only), the manifest backup.

### F1 · `ruin` growth: ground, walls, roofs (ruin-pass, pure). Outline. Branch `ticket/073f1-ruin-growth`
- **Waits for:** E2, F0, its pre-check.
- **Its pre-check measures:** growth spreading cell by cell from soil (parks, greens, build-out trees, planters, farms), against `wild`; carriageway cells grown (B9); trees under dead spans and their heights (B8); every canopy against T-1 (`Tree_Generic_Giant_01` is 12.6 x 11.2 m); vines (`Env_Vines_*`, `Tree_Vines_*`) against escapes and signs; roof growth; T-2.

### F2 · `ruin` remnants and the broken grid (ruin-pass, pure). Outline. Branch `ticket/073f2-ruin-remnants`
- **Waits for:** E1, K2, F0, its pre-check, and Q12.
- **Its pre-check measures:** wrecks on carriageway, bays and lots (B1); fallen signs, logs, rubble; the changes by kind and by layer; toppled poles and cut spans per district; T-1 and T-2.
- Every toppled pole lists its spans' states (A's no-cascade rule).

### F2g · Jobs on the broken grid (grid-simulator, pure). Outline. Branch `ticket/073f2g-ruin-jobs`
- **Waits for:** F2, E1g, Q12.
- In `src/city/circuit/`: a city puzzle laid on the ruin era fails to load if it names a removed or toppled piece. Q12's answer says what a job's own parts show.

### F3 · `ruin` drawn (renderer). Outline. Branch `ticket/073f3-ruin-drawn`
- **Waits for:** F1, F2. R12 gains B1's allowance, era-scoped. Draws `state`: toppled, cut, broken, boarded, dark.

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
  - 05: "Every cable is a grid cable. [...] Decorative wires in the ruins look clearly different: thin, rusted, and ending in frayed stubs." The plan draws makeshift and roof-net spans like today's wires. Q14.
  - 08: "The tribe's craft over human ruin" (raccoon salvage, ribbons on every control). No pass places it. Q15.

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
- Section A, after K's type merges. Nothing in `src/core/` changes before then.
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

## Plan points this ticket corrects
- **"The plan always runs all stages"** (note, section 3) would make every existing `runCity()` run four more stages, and every clean test slower (`plan3d.test.ts` is 113 s today). X-7 and C1 criterion 3 run the new stages only for an era run.
- **"New owner, with the grid-simulator"** for E1 and F2 is two owners. Split into E1/E1g and F2/F2g, one owner each.
- **B7 scope.** The note's table lists B7 for hold-out and ruin. Its pavement tech is the tech pass's, so the tech pass keeps rule 10 (X-3).

## Questions for Josh (recommended answer first)

Answered: the note's 1 to 9 (cards 1 to 8, and "I like all of your suggestions, make them so" for 6 and 9).

10. **Which era is a city job played in?** **The ruin.** It is the game's present: "a ruined human city kept lit long after its people died". The other eras are the history you can step through.
11. **A district with no plant** (it was left at once, so it never held out). **Its feed is a pole just outside it, as K1 had it.** So every district can still hold a job.
12. **Does the ruin's broken grid show on a job's own parts?** **No.** On the poles, wires and drops a job uses, only the puzzle's own faults show. Otherwise a cut wire that still carries power would mislead the player.
13. **Can a wire pass over a pole line?** (T-1 says nothing may cover a pole from above.) **Yes, a thin wire may cross over. Only solid pieces and tree canopies count as covering.** Roof-to-roof wires cross streets.
14. **Dead wires in the ruin.** The GDD (Draft) says decorative wires should look clearly different: thin, rusted, frayed. **Later, with the 2D overlay (K4), which already marks a job's parts.**
15. **The tribe's own marks** (raccoon salvage, ribbons, shrines on the ruin, from the GDD's art direction). **A later era or ticket, not this one.**
