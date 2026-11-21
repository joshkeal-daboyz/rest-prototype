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
- **E re-cut against D2** (20 Nov 2026, against 2800ab3). Asked whether to start E, Josh said: "Start E". E now draws `edge.ground` and `edge.kerb` (the dropped kerbs, the crossing dips, the returns), the one-way sections and their arrows, and the 6 x 6 default, at `?view=3d&city=plan&stage=assemble`. It adds no rule, so it skips the pre-check.
- **F1 re-cut against 4b840ff** (20 Nov 2026). Josh said: "Start F1". F1 now reads C3's mass on the split plan, runs on the 20 named runs and the four pin cities, and defines a row and a building on cells; `CityBuildingsLayer` is typed. It adds five readings of rules (N1 to N5, listed in F1), so the `pipeline-designer`'s pre-check comes before the builder.
- **F2 re-cut against 768b657** (20 Nov 2026). Josh said: "Go ahead and start f2". F2 now pieces F1's buildings as merged: one column per built cell, its kind and forced turn, a ground slot for H1, its floors and roof placed by body on the cell, the L's bend column by column; `CityColumn` and its parts are typed. It adds five readings (P1 to P5, listed in F2), so the `pipeline-designer`'s pre-check comes before the builder. `BACK_SAME_SHARE` waits for G's screenshots (Josh: "Let me see the 3D buildings first").
- **G merged (8f091db); Josh's answers with G's screenshots** (20 Nov 2026, Q20). Shown G's 3D screenshots and asked (1) whether `BACK_SAME_SHARE` 0.5 becomes Decided, (2) whether a hidden back building taller than the one in front may show its windows above the lower roof (recommended yes), (3) whether style-1 roofs may overhang up to 0.79 m, past the 0.6 m trim limit (recommended yes), (4) whether the 8 to 11 cm corner roof-base step is judged by eye with no rule (recommended yes), and (5) whether to cut an instancing ticket for the ~7.7k building draw calls now or later, he answered: "Yes to all, instancing later". So `BACK_SAME_SHARE` 0.5 is Decided; the F2 pre-check's three readings (U1 to U3) stand; instancing is a later ticket, not cut now. Its comment in `src/city/buildings/constants.ts` (the buildings agent's) still says PROPOSED: section F3 (buildings, one comment) changes it.
- **H1 re-cut against 2d003a5; split into H1, H1b and G2** (20 Nov 2026, the lead-architect). H1 (facades) fills every ground slot with a keyed, placed piece; H1b (facades) moves the shopfront dressing; G2 (renderer) draws the ground pieces in 3D. `CityFacadesLayer`, `CityGroundPiece` and `CityGroundPieceKind` are typed. H1 adds readings (S1, D1 to D4, listed in H1), so the `pipeline-designer`'s pre-check comes before its builder.
- **H1 pre-check did not hold; Josh answered its three questions; H1 re-cut** (20 Nov 2026, Q21). The note (`docs/design/070-H1-precheck.md`) found no shop corner fits S1 at 0 gap, six shop keys deeper than 5.00 m, and 58 ring-2 buildings with no door place. Asked its three questions as recommended, Josh answered: "Yez, all three". So S1 allows a 0.01 m gap under the first floor, the six deep shop keys stand front-aligned with up to 0.6 m running back into the building behind, and a quiet building with no door place has no door. H1's S1, D1, D4, D5 and criteria 1 to 4 and 7 now say so. H1b and G2 do not change. H1's builder may start.
- **F3 gains criterion 4; H1 merges after F3** (20 Nov 2026, the lead-architect). H1's full gate at 5318f5c failed buildings' R-4 test double, which drops the last built stage (`BUILT_STAGES.slice(0, -1)`) and so drops facades, not buildings. F3 now makes that test replace buildings by name. F3 merges first and into H1's branch before H1's gate. No rule added.
- **H1b re-cut against 455db33** (21 Nov 2026, the lead-architect). Josh said: "Yes, start both" (G2 and H1b). H1b now moves `dressBlock`'s glass, awnings, signs and ATMs onto H1's merged ground pieces: a block is a building, a run a chain of row neighbours; R4 to R6 and M8's dressing half at the tile city's numbers. `CityDressingKind`, `CityDressingPiece` and `CityFacadesLayer.dressing` (optional, so G2 reads `ground` unchanged) are typed. It changes no number but adds readings (B1, B2, W1, X1, T1, L1, E1, C1, A1, listed in H1b), so the `pipeline-designer`'s pre-check comes before its builder. G2 starts as cut.
- **H1b pre-check: T1, X1 and W1 need Josh's word; he answered; H1b re-cut** (21 Nov 2026, Q22). The note (`docs/design/070-H1b-precheck.md`) found R4 to R6 pass on 20 of 20 runs with W1 and X1, but only with T1 (rule 2's 0.6 m literal fails every run), X1 putting glass and the L awning on a quiet face, and W1 overlapping two L awnings by up to 0.42 m. Asked its three questions as recommended, Josh answered: "Yes all three". So shop dressing may reach over the pavement as on the tile city (T1), mixed corners keep their wrap on the lane side (X1), and neighbouring awnings may overlap by about 10 cm, with no L awning beside an L awning (W1 with LG). H1b's T1, X1, W1 and criteria 2, 4 and 7 now say so; H2's cut gains the R6 note; L gains the grammar lines. H1b's builder may start.
- **H2 re-cut against b49a282; split into H2 and H2b** (21 Nov 2026, the lead-architect). Asked whether H2 starts next, Josh said: "Yes". H2 (facades) now ports the tile city's fire escapes (058's `planEscape`, `storeysOfColumn`, `sillOf`, `escapeCheck`; 061's `escapeBlocks` and its ranking), door canopies and wall props onto H1's and H1b's merged pieces, and keeps an escape's shop bay plain as `dressBlock` does, so H1b's dressing changes on escape buildings and R5 and R6 are measured again (the R6 note stands: the 0.45 floor is never lowered). H2b (facades, new) builds the party-wall kit and M7, which no path has built (067 A was superseded unbuilt). `CityWallPieceKind`, `CityWallBox`, `CityWallPiece` and `CityFacadesLayer.walls` (optional, so G2 reads `ground` unchanged) are typed. H2 adds rules for quiet faces (EX, ET, RQ) and H2b needs a number (`BLANK_RUN_MAX_M`), so one `pipeline-designer` pre-check for both comes before H2's builder. H1b's T1 reach fixture is reworded as built (0.6 m fails attachment, 1.2 m the reach).
- **H2 pre-check: seven readings need Josh's word; he answered; H2 and H2b re-cut** (21 Nov 2026, Q23). The note (`docs/design/070-H2-precheck.md`) found every check holding on 20 of 20 runs at the 0.4 escape share, but EP, EX, ET, RQ, WP3 and PW3 add or change a rule and PW4 needed a number. Asked its seven questions as recommended, Josh answered: "Yes, 2.1m". So EP, EX, ET, RQ (with no pair-drop rule), WP3 and PW3 stand as written and quote him; the escape share stays 0.4; the R6 watch run is 6 x 6 seed 3 one-way on (0.474), not seed 3 off; `BLANK_RUN_MAX_M` is 2.1 m, Decided; the window's and pipes' bounds come from the note; H2b's stretch fixture becomes two windows pushed to one end; `SM_Prop_Pipe_Present_01` is never used. L gains rule 8's lines. H2's builder may start; H2b's starts after H2 merges.
- **H2b stopped on its stop rule; H2's checks read H2's kinds; H2b re-cut** (21 Nov 2026, the lead-architect, against 150ab12 on `ticket/070h2b-facades-party-walls`). H2b's criterion 3 appends the party pieces to `facades.walls`, and H2's merged checks read the whole list: `wallcheck.ts` fails any kind H2 does not place, and `escape.test.ts`' per-column cap test counts every non-escape wall piece. The builder worked round it in `stage.ts` (H2's check on H2's pieces only) and stopped. Re-cut (PW7, criterion 4b): H2's check and report skip H2b's three kinds in one place (`wallcheck.ts`), `stage.ts` goes back to one `wallFailures` call on the whole layer, and the cap test counts H2's kinds only. `DRESS_PER_BAY_MAX` (6) does not count party-wall pieces: a counting scope the style guide and rule 8 settle (PW7), not a change to the number or to a rule, so not a question for Josh. `wallcheck.ts` and `escape.test.ts` leave H2b's must-not list for those lines only.
- **H3 pre-check: Josh answered; H3 re-cut; H1c first cut** (21 Nov 2026, Q24, the lead-architect, against f9c8ade). The note (`docs/design/070-H3-precheck.md`) found R8, M9b, the deck, the roofs and the cap holding on 20 of 20 runs, with RT, BB and RN needing Josh's word. Asked its five questions as recommended, Josh answered: "Yes to all except novelty signs. They can be placed on the face of a build in addition to the roof. They represent the store in the storefront. A pizza should correspond with a pizza shop and a beer bottle, for example, should correspond with a liquor store or a corner store." So `ROOF_DECK_M` is 0.5 on all six roof keys, typed and pinned to the GLB (RT); the billboard stands 0.28 m from the roof's edge (BB) and criterion 2 expects street billboards; HC, RC, RK and RW stand as written and quote him; `DRESS_MAX` is left off on the pipeline and J checks the frame rate. **H3 places no novelty sign** (NV): the rotation is water tower, exit and billboard on every building, and R8 holds without them (NV's reasoning on the note's numbers; criterion 8 confirms). Novelty signs, each standing for the shop under it, on the face or the roof, are the new section **H1c** (facades), first cut only. Josh added: "Perhaps novelty signs should be placed alongside the shop fronts instead of the decoration phase? I'm not sure which makes more sense." and "A novelty sign doesn't always have to be placed with a shop either. It's an added detail. That's fun. It should be placed per the discretion of the storefront agent." H1c is framed as shopfront work, recommended, not his ruling. H1c starts only after H3 merges and its own pre-check is answered. H3's builder may start.
- **H3 merged (194643e); H3b first cut: the water-tower cap** (21 Nov 2026, the lead-architect). On H3's 20 named runs there are 5,108 water towers (about 255 a city, 1 building in 4). Josh said: "Create a rule where there can only be so many water towers per city blocks", then: "Fine. You get one water tower per x amount of buildings. I don't want to see water towers across the entire city because they just fit". New section **H3b** (facades), first cut only: at most one tower per X buildings, with X Josh's and not set here; the recommended reading counts per street-bounded block (`CityBuilding.block`), floor(n / X). On H3's rotation a refused tower almost always becomes a roof exit, so R8 holds at any X. The pre-check measures that, the spread, and the plain-roof alternative. Order: H3b's pre-check, Josh's answers (Q25), its re-cut and its builder, all before H1c's pre-check. No `src/core/` type changes.
- **H3b pre-check: Josh answered; H3b re-cut** (21 Nov 2026, Q25, the lead-architect, against 4fe9697). The note (`docs/design/070-H3b-precheck.md`) found every check holding at X = 8 to 24 under the rotation and under option (c), with plain roofs breaking R8 at every X offered. Asked its three questions as recommended, Josh answered: "Yes to all". So water towers are counted per street block (TX (a)) with the hashed pick (TS); `WATER_TOWER_PER_BUILDINGS` is 16, Decided (about 44 towers a city instead of 255); and a freed roof takes a roof exit only where its run would otherwise have no big roof item, small props otherwise (TF). H3b's re-cut also corrects three premises of the first cut (163 exits a city today, not about 80; plain roofs cannot be built at any X offered; counting per run gives 0 towers) and drops RX's `roofcheck.ts` change (the case never occurs). H3b's builder may start; H1c's pre-check runs once H3b is merged.
- **H1c pre-check: Josh answered; H1c re-cut** (21 Nov 2026, Q26, the lead-architect, against 9895bc4). The note (`docs/design/070-H1c-precheck.md`) found R8, the towers, the face fits and the roof fits holding on 20 of 20 runs, with the framing, the key table, the kind source and the face rule needing Josh's word. Asked its four questions as recommended, Josh answered: "Yes, all four". So shop kinds and novelty signs are the shopfront work's, with the roof sign in H1c (no H1d); the key table is as proposed (`Bottle_01` the beer bottle, the bowling pair unused); a shop with an H1b trade sign takes that kind and others are hashed, H1b unchanged; face signs follow rule F. `CityShop`, `CityShopKind`, `CityNoveltySign` and `CityFacadesLayer.shops` and `.novelty` are typed (optional; nothing G2 reads changes). H1c's builder may start.
- **H1c criterion 3 amended; the builder's readings ruled** (21 Nov 2026, Q27, the lead-architect, against 322f205). The builder stopped on R8's first number moving by one building on 3 of 20 runs. Asked "Shall I accept this one-building change and let the builder finish the tests?", Josh answered: "Yes". So R8's second number stays identical run by run; the first stays at or above 0.9, its change reported. The attach plane is `bayFrame.floorFront`, T1 from the cell edge (FA); roofcheck takes a novelty piece at 0 or 90 (FR); a corner face sign needs `bay.frontStreet` and frontage "street" (FC); a blade sign is a clash target, not a base (FB). H1c's builder may finish.
- **I re-cut against 5b2998c; its pre-check first** (21 Nov 2026, the lead-architect). Stages 1 to 5 and 7 are merged (H1c, 0795283). Josh chose I next: "I think the ground dressing first". I (landscape) now ports the tile city's ground dressing onto the merged layers: `furnitureLayout`'s pavement lines on pavement runs (H1b's runs on street fronts), `bayMeters`, `fillGreen`'s trees and benches on stage 3's greens, the lane bins, and the plaza and frontage-lot dressing; clear of stage 4's kerb cuts, corners and dips and of stage 7's awnings, signs, ATMs, escapes and face signs. It places no lamp (the lamps, the game's and the street lights, are stage 6's). `CityGroundLayer`, `CityPavementRun`, `CityGroundProp`, `CityGroundPropKind` and `CityGroundPlace` are typed; no earlier layer's type changes. EL, DK and LB add or change a rule, so the `pipeline-designer`'s pre-check comes before the builder (Q28).
- **I pre-check: Josh answered; I re-cut** (21 Nov 2026, Q28, the lead-architect, against 1b7a0e5). The note (`docs/design/070-I-precheck.md`, pre-check c8cb583) found every check of I's list holding on 20 of 20 runs at its recommendation. The stage as cut failed all 20, on plaza and lot pieces (stage 7 and the R10 keep-outs). Asked its five questions as recommended, Josh answered: "Yes 5"; asked whether that meant all five or only question 5, he answered: "All 5". So EL and DK stand. LB's walk moves half a cell onto a building bay (criterion 4's hand-worked bin moves to 12.5 m). There is no extra keep-out in front of the ground storeys (GS). Plaza and lot groups under a stage 7 box are left out, and KO and the R10 keep-outs read pavement props and lane bins only (Q5). No type changes. I's builder may start.
- **J re-cut against cdb425e** (21 Nov 2026, the lead-architect). Josh said "Yes" to starting J. J now draws every stage 7 list (`dressing`, `walls` with the escapes' boxes and the party pieces, `roofs` with the roof novelty signs, `novelty`) and stage 8's `props` through the tile city's per-key instancer (`dressGroup`), from placements only and once each, with R12's whole-plan audit (its one allowance the party pipe `_03`). `planKeys()` gains `SM_Prop_Window_01` and `SM_Prop_Pipe_Present_03`, which load by name; `models3d.ts` leaves J's Files. Measured: about 10,300 draw calls before J and about 10,360 to 10,510 after; cloned, it would be about 18,300. J adds no rule or number, so no pre-check. Q29 (J2, instancing the stack pieces, only if the frame rate does not hold) and Q30 (the stage=ground legend overlap) are open.
- **L re-cut as L1 and L2; K outlined on Q4** (21 Nov 2026, the lead-architect, against 883cab7). Josh gave his word on L (Q1): "Yes, let's work on L. We need to integrate the new city design with the game itself." On the legend overlap (Q30): "Leave it" (for L). On who owns stage 6 (Q4): "I think that's stage 6 should be the collaborative work between the puzzle designer and the electrical grid agent". Read on 883cab7, `city=tiles` feeds the game nothing (a dev-only, puzzle-free view; no wires, poles, lamps or picking; nothing in `src/grid/`, `src/play/`, `src/ui/`, `src/render/` or `src/core/` reads it; its `poleSlots` are reserved points, only furniture keep-outs). The old path's code is still read by `plan3d.ts`, by the ladder's `terrace.ts` and by six stage-folder tests, so L splits: **L1** (renderer) switches `city=tiles` to the pipeline's 3D city, keeps the old one at `city=tiles-old` (Q31), fixes the legend and writes the guide and grammar lines; **L2** (outline) deletes the old path after K1. K is outlined as K1 (puzzle-designer: the circuit's design) → `CityCircuitLayer` typed → K2 (grid-simulator: `src/city/circuit/`) → I2 (landscape) → K3 and K4 (renderer: drawn, then played) → K5 (puzzle-designer: puzzles on the city). L1 adds no rule or number. L1's builder may start.
- Questions: Q1 to Q28 and Q30 answered (Q4 on 21 Nov 2026: K's owners); Q29 open; Q31 open (L1 builds its default); Q7 settled by the rulings.
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
| M1 lattice fit | every column's four body planes on its cell's edges within `WALL_JOINT_TOL_M` | 5 buildings (floors); 7 facades (the ground storey) | F2; H1 |
| M2 the kit holds | every piece used has a 5.00 m body (10.00 m for `Shop_03`); `it.skipIf` GLB pin in render3d. From F2's re-cut: the wall pieces; roofs are held by M9a (F2's P4) | 5 buildings; 7 facades (ground keys) | F2; H1 |
| M6 corner turn | window faces on the two open sides, every storey; no corner piece off a corner column | 5 buildings; 7 facades (the ground storey: shop corner, door corner, corner floor) | F2; H1 |
| R9 | a true corner is any column with two adjacent open sides (Josh: "Yes, any corner") | 5 buildings; 7 facades (ground keys) | F2; H1 |
| M9a | one roof piece per built cell, kind and turn matching; storeys and roof aligned within `STOREY_ALIGN_TOL_M` (063 E2's check) | 5 buildings | F2 |
| G1 | every wall plane within `OVERLAP_MAX_M` of its open side's edge; no recess | 5 buildings (floors); 7 facades (the ground storey) | F2; H1 |
| M8 | no shop piece or shop dressing on a quiet frontage (a corner whose other side is street excepted); one door per quiet building | 7 facades | H1 (pieces, doors); H1b (dressing) |
| R3 | street ground bays are a shop, a shop corner or the building's one door | 7 facades | H1 |
| R4, R5, R6 | glass, awnings, signs and ATMs on street frontages | 7 facades | H1b |
| door sills (062) | the sill checks. From H1's re-cut, on stage 5's fixed frame: each ground piece at its own level (H1's S1) | 7 facades | H1 |
| no door behind a stall (Josh's ruling 2, 19 Nov 2026) | no door or door corner on a column with an open side onto stalls | 7 facades | H1 |
| R7, `escapeCheck` | fire escapes on street faces of qualifying blocks; they connect | 7 facades | H2 |
| M7 | no bare party wall above a lower roof; the pipe runs only on party walls (Josh: "Yes, dress it") | 7 facades | H2b (21 Nov 2026, H2's split) |
| R8 | roofs dressed; big roof props | 7 facades | H3 |
| M9b (063 G criterion 40) | the roof exit stands on its roof, its door away from every open side, with clear deck | 7 facades | H3 |
| water-tower cap (Josh, 21 Nov 2026: "You get one water tower per x amount of buildings") | at most floor(n / 16) water towers on a street block of n buildings (`WATER_TOWER_PER_BUILDINGS` 16, Decided; Josh, Q25: "Yes to all"); a freed roof takes an exit only in a run with no other big roof item (TC, TF) | 7 facades | H3b |
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
  - **D2** (re-cut 20 Nov 2026 against de522a8, on Josh's "Start D2"; see D2) gains one clause: on the far side of a T the kerb line runs straight past and dips at the two crossings (`Sidewalk_Dip_01`); "from junction to junction" becomes "from block corner to block corner"; from A4b, a junction is carriageway by carriageway, not 3 by 3. **E** (re-cut 20 Nov 2026 against 2800ab3, on Josh's "Start E"; see E) draws `edge.ground`, `edge.kerb`, stage 1's `arrows` and the mass, through two entries split out of `tileGroup` and `interiorGroup`.
  - **Merging.** A4 changes stage 1 for every later stage, so Land's, Mass's and Edge's tests (their digest pins and their named-city checks) are expected to fail on A4's branch until their re-cut lands. A4 is therefore held on its branch, like D2 was. A4's own gate before its review is `npx tsc --noEmit` plus `npx vitest run --maxWorkers=2 src/city/streets/ src/city/pipeline/ src/render3d/planview.test.ts` (Josh's Q13, 20 Nov 2026: "yes").
    - **A4b and A4c are held under the same terms** (Q13's "yes"; for A4b also Josh's Q4 on the one-way note, "do what you recommend"; for A4c his answer 3 to the pre-check, "yes", Q14). Each one's own gate before its review is A4's small gate above. Once its review settles it is merged into `ticket/070a4-split-plan` (a merge between held branches; nothing reaches `goal/city-style`).
    - **B3, C3 and D1b** are branched from `ticket/070a4-split-plan` in turn, each after the one before is merged into it (B3 after the re-run; C3 after B3; D1b after C3, and from 20 Nov 2026 after A4d). Each one's own gate before its review is `npx tsc --noEmit` plus its own folder's tests and the folders before it (B3: `src/city/streets/ src/city/land/`; C3: those plus `src/city/mass/`; D1b: those plus `src/city/edge/`).
    - **A4d and A2b (20 Nov 2026)** are held under the same terms. A4d's own gate before its review is `npx tsc --noEmit` plus `npx vitest run --maxWorkers=2 src/city/streets/ src/city/pipeline/ src/city/land/ src/city/mass/` (Edge's tests are expected to fail until D1b). A2b's is `npx tsc --noEmit` plus `npx vitest run --maxWorkers=2 src/render3d/planview.test.ts`. Each is merged into `ticket/070a4-split-plan` once its review settles; D1b then branches after A4d (A2b may still be in flight).
    - **All eight merge together** into `goal/city-style`, in the order A4, A4b, A4c, B3, C3, A4d, A2b, D1b, once the full `npm run gate` is green on `ticket/070a4-split-plan` with all eight in (Q13: "yes"). None of them reaches `goal/city-style` on its own.
- F1 → F2 → G (all merged) → F3 (no shared file with H1, but **before H1 merges**: F3 is merged into H1's branch before H1's gate; F3 criterion 4)
- **the H1 pre-check → H1 → (H1b and G2 alongside) → H2 → H3** (20 Nov 2026, H1's re-cut). H1b and G2 each branch from `goal/city-style` once H1 is merged; they share no file. J draws H1b's dressing. **(21 Nov 2026, H1b's re-cut)** H1b's pre-check comes before its builder; G2 does not wait for it. **(21 Nov 2026, H2's re-cut)** H2 is split: the H2 pre-check (one for H2 and H2b) → H2 → H2b → H3. H2b branches once H2 is merged (they share `stage.ts`, `stage.test.ts` and the digest pins). **(21 Nov 2026, Q24)** H3 → the H1c pre-check → Josh's answers → H1c's re-cut → H1c. H1c branches once H3 is merged (they share `stage.ts`, `stage.test.ts`, the digest pins and `roofs`). **(21 Nov 2026, H3b's first cut)** H3 (merged, 194643e) → the H3b pre-check → Josh's answers (Q25) → H3b's re-cut → H3b → the H1c pre-check → and on as above. H3b branches from `goal/city-style`. H1c's pre-check runs once H3b is merged (they share `roofs.ts`, `roofcheck.ts`, the roof tests and the digest pins).
- I → J → L. **(21 Nov 2026, I's re-cut)** The I pre-check → Josh's answers (Q28) → I's re-cut on them → I → J → L. **(21 Nov 2026, Q28)** The pre-check, his answers and the re-cut are done; I's builder may start. I branches from `goal/city-style`; it shares no file with an open section.

H and I can run alongside each other once F2 has merged. Stage 6 (K) is outlined, not cut (Q4, 21 Nov 2026). **(21 Nov 2026, Q1)** L1 starts now; K1 → K2 → I2 → K3 → K4 → K5 follow, and L2 after K1. **Instancing the stack pieces** (G's ~7.7k building draw calls) is a later ticket, not cut here (Josh, 20 Nov 2026, Q20: "instancing later").

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
**Branch.** Cut from `goal/city-style` at 2800ab3 or later (D2 merged: `ground` and `kerb` written on every run).

**Goal.** At `?view=3d&city=plan&stage=assemble` Josh walks the pipeline's city in 3D: the street edge drawn with today's tile pieces from `edge.ground` and `edge.kerb` (one-way streets with their arrows, the dropped kerbs on the far side of each T, the returns at drives and lane mouths), the interiors paved and green from `mass.cells`, and every built cell a plain grey box three storeys high. He judges the mass in 3D before a single building is chosen (Q2).

**Josh's words (20 Nov 2026, in chat).** Asked whether to start E: "Start E". Q3 (19 Nov 2026): "Yes" to the grey-box view. A4b's Q5, on the arrows: "the kit has them, use them".

**Re-cut (20 Nov 2026, the lead-architect, against 2800ab3).** Brings E up to D2 (the kerb line, `crossingDip`, `pavementDip`, the returns), A4b (the three sections, junction rectangles 1 x 1 to 3 x 3, `arrows`) and Q17 (the 6 x 6 default). E only draws: it adds no rule, check or number, so it skips the pre-check (CLAUDE.md). It reads the plan through `runCity`'s `CityPlan` and never derives a layout choice the layers do not hold (stage 9: "It draws the plan with Three.js and decides nothing"). **Stop rule:** where a layer does not say what to draw (a cell with no use, a stall row E cannot pair, a key the layer needs that the pack lacks), the builder commits, stops and reports with the cells. The gap is a re-cut of that layer's section, never a choice made in `src/render3d/`.

**What the existing tile drawing can and cannot take** (read on 2800ab3):
- **Takes as it is.** `tileKeyOf`, `tileMatrix` and `tileGroup`'s per-key instancing work cell by cell from role, variant and yaw. They assume no street width and no junction size, so these draw unchanged: a 3-, 4- or 5-cell street; a 1 x 1 to 3 x 3 junction (`junction` cells, `Road_Bare_01`, yaw 0); a crossing of any width (`Road_Crossing_01` on its own yaw); `pavementCorner`, `kerbCut`, `buildout`, `parking` (the 2-cell `ParkingLines_01`) and `parkingPlain`. `CityGroundCell` has `TileCell`'s fields, and its roles are `TileRole`s. `kerbStrips` takes any `KerbPlan`, and `buildoutTreePlan` takes `edge.buildoutTrees`.
- **Cannot take, today:**
  1. `tileGroup` and `interiorGroup` take a `TileCity` (its `cells`, `courts`, `blocks`, `interior`, `seed`), and `tileGroup` recomputes the kerb from it (`tileKerbPlan` calls the old `kerbLine`).
  2. A `pavement` cell with `pavementDip` would draw as the straight (`variantIndex` reads only the grate bit).
  3. A one-way lane (`laneRight` 0) would draw as `Road_YellowLines_01`, with a yellow line on one edge.
  4. No arrow piece is keyed, turned or loaded, and no `crossingDip` segment becomes a face.
  5. `interiorItems` reads the old `InteriorCell` roles. Mass's uses (`laneMouth`, `walk`, `plaza`, `frontLot`, `stalls`, `aisle`) and its courts' stall cells have no path to an `InteriorItem`.
- **How E adds them, in its own files** (criteria 1 to 5). `kerbline.ts`, `tilecity.ts`, `tileslots.ts` and `planview.ts` are not edited (R-9).

1. [ ] **Two entries, with no change to the `TileCity` path** (`tilecity3d.ts`, Vitest).
   - `tileGroup`'s body becomes an exported `tileGroupOf(input, roots, entries, maxCalls)`. Its input is the cells, the build-out trees, the seed, the keys it may use, a `keyOf(cell, active)` and a `kerb(keyOf): KerbPlan`. `tileGroup(city, ...)` calls it with `city.cells`, `tileKeys()`, today's `tileKeyOf` with the inlet flag, and `tileKerbPlan(city, ...)`.
   - Likewise `interiorGroupOf(items, props, gates, floors, seed, ...)`, which `interiorGroup` calls with `interiorItems(city)` and the rest.
   - `tilecity3d.test.ts`, `tileintegrate.test.ts`, `tileinterior.test.ts`, `kerbline.test.ts` and `tileslots.test.ts` pass unedited. One new test checks that `tileGroup` and `interiorGroup` give the same `perKey`, `calls`, `fromPack` and instance matrices as before on the default `city=tiles` city (code-drawn, no GLB).
2. [ ] **Plan to scene** (`src/render3d/plan3d.ts`, Vitest). `plan3dGroups(plan, roots, entries)` draws four things.
   - **The street pieces:** every `edge.ground` record through `tileGroupOf`, with plan3d's own `keyOf`. It is `tileKeyOf` with three exceptions:
     - a `pavement` record with `CITY_GROUND_VARIANT.pavementDip` takes `Sidewalk_Dip_01` (`TILE_SLOTS.kerbCut`, on the pavement's yaw; its kerb is on +z like the straight's);
     - a `lane` record on a street whose `flow` is not "both" takes `Road_Lines_01` (it already has a `TILE_FRONTS` turn, 270), or `Road_Bare_01` when that is absent. It never takes a `YellowLines` piece;
     - a `lane` record in `streets.arrows` takes the arrow (criterion 5).

     The build-out trees are `edge.buildoutTrees`.
   - **The kerb:** plan3d's own `planKerbPlan(kerb, ground, keyOf)` turns `edge.kerb` into a `KerbPlan`, the way `tileKerbPlan` turns a path's segments, reading `KERB_FACES_M`, `KERB_INSET_M` and `KERB_LIP_TOP_M`:
     - an `edge` or `dip` seg's cell brings its piece's face (a flush cell has none; a build-out's `under` cell brings its own, one cell in);
     - a `crossingDip` seg brings its `Sidewalk_Dip_01` face;
     - each `flank` is a code strip;
     - each `return` is a code strip from the street kerb face to its building-line end (the seg's own end, which is the `CityKerbReturn.end`).

     It recomputes no line: every face comes from a seg of `edge.kerb`.
   - **The interiors:** every `mass.cells` cell that is not `built` becomes one `InteriorItem` through `interiorGroupOf`, by this table:

     | Mass use | Interior kind |
     | --- | --- |
     | `apron`, `plaza` | `apron` |
     | `green` | `green` |
     | `greenPath` | `path` |
     | `parkEdge` | `parkEdge` |
     | `drive`, `walk`, `laneMouth` | `inlet` (063 H's slab; criterion 4) |
     | `lane`, `stalls`, `aisle`, `frontLot` | `bare` |

     Each `mass.courts` entry's stall cells add `stalls` items (`ParkingLines_01`, two cells each, lifted `STALL_LINES_LIFT_M`). Each run of stall cells along a row is paired from its low end and yawed toward the row's aisle cells (`aisleCells`). A run of odd length, or a row with aisle cells on both sides or on neither, triggers the stop rule. There are no props, gates or passage floors (stages 7 and 8 have none yet).
   - **The mass:** every `mass.built` cell is one instance of a single `InstancedMesh` of unit boxes: the cell's 5 m square, `CITY_STOREYS.min` (3) x `STOREY_M` high, one grey material.
   - **Draws only.** A test runs it on the default city. It checks that each layer's digest is the same before and after, and that each of these is drawn exactly once (pack or code): every `ground` record, every kerb seg but `opening`, every non-built mass cell and every built cell.
3. [ ] **The kerb on the line, on the 20 named runs** (Vitest; 063 F's criteria 34, 35, 37b and 37c, which D2 left to E). Run with every piece code-drawn (no GLB) and with `KERB_FACES_M`'s insets:
   - every face of `planKerbPlan` lies on its seg within `KERB_TOL_M` in plan and `KERB_HEIGHT_TOL_M` in lip height;
   - no part of a chain seg (`edge`, `crossingDip`, `flank`, `return`) or of a `dip` is uncovered for more than `KERB_GAP_MAX_M`. This is the check `kerbline.test.ts` has for the old path, typed again in `plan3d.test.ts`;
   - every `pavementDip` record is drawn from `Sidewalk_Dip_01` when that key is active, and no `lane` record of a one-way street is drawn from a `YellowLines` piece.

   Failing fixtures: a plan with one return seg removed, and a plan with a `crossingDip` seg's face removed, each fail the check.
4. [ ] **Paving through both rings** (Vitest). Every `drive`, `walk` and `laneMouth` cell is drawn from the plain slab (`PASSAGE_FLOOR_KEYS`) when it is active, and as code pavement when it is not (from 066 criterion 4).
5. [ ] **One-way streets (A4b; Josh's Q5: "the kit has them, use them").** E draws them and decides nothing.
   - Each `streets.arrows` cell takes `SM_Env_Road_Arrow_01`, turned so it points `toward`. The builder measures two things from the converted GLB and reports both:
     - whether the piece is a whole 5 m road tile, which then replaces the lane piece on that cell, or a decal, which then stands `PATCH_LIFT_M` over the cell's `Road_Lines_01` as `TILE_PATCH` does;
     - which way it points. The turn is a typed-in `PLAN_FRONTS` line in `plan3d.ts`, pinned by a test inside `it.skipIf(!have)` (R-6).
   - `_02` and `SM_Prop_Sign_Arrow_01` are not drawn in E: a sign's place on the pavement is a placement no layer holds yet.
   - plan3d's renderer loads its own keys through `sharedTileModels`: `tileKeys()` plus `Road_Lines_01` and `Road_Arrow_01`. `city=tiles` loads what it loads today.
   - (Vitest) On the 20 named runs, every arrow cell has its arrow and every one-way lane cell its `Road_Lines_01` (code-drawn, so counted by key choice, not by GLB).
6. [ ] **Draw calls** (Vitest, code-drawn; the builder reports the pack numbers).
   - The street pieces stay within `TILE_DRAW_CALLS_MAX` (40). The arrows, `Road_Lines_01` and `Sidewalk_Dip_01` count inside it and are dropped fewest-first by `tileGroupOf`'s loop, as today.
   - The interiors stay within `INTERIOR_DRAW_CALLS_MAX` (24). The boxes add 1. No cap is raised.
   - The builder reports the calls and any dropped key on 6 x 6 seeds 1 and 3, with the pack.
7. [ ] **Routing** (Vitest).
   - `renderer.ts` routes `?view=3d&city=plan&stage=assemble` (and `stage=9`) to plan3d's renderer, ahead of the flat picture. Every other `city=plan` request draws the flat picture as today, and `planview.test.ts` passes unedited. The HUD stays hidden (`planHidesHud` already returns true for it).
   - `blocks` and `seed` are read as `planViewRequested` reads them: the default is 6 x 6 seed 1 (A2b), one-way on.
   - The renderer is built from `tilecity3d.ts`'s exported rig, street camera, light modes (`lightModeFor("tiles", ...)`: day unless `light=night`) and day toggle. `createCityRenderer3d` is not edited.
   - A run that ends `ok: false` draws nothing and shows the failure's stage and reason as text.
8. [ ] (Main session, screenshots: overhead and street camera in day, and one overhead at night; 6 x 6 seed 1 and 6 x 6 seed 3, one-way on.) The screenshots should show:
   - no ground between built cells, and the rings standing back to back;
   - drives, walk-throughs and lane mouths paved, and kerbs that return at drives and lane mouths;
   - the far side of a T running straight past, with its two dropped kerbs;
   - a bare one-way street's kerb running straight from corner to corner;
   - one-way streets narrower and without a yellow line, their arrows pointing with the traffic (street camera);
   - junctions from 1 x 1 to 3 x 3 with no gap or overlap against their crossings;
   - `?view=3d&city=tiles` looking as it does on `goal/city-style`.
9. [ ] R-8, R-10 and R-11. Tests run: `npx vitest run --maxWorkers=2 src/render3d/plan3d.test.ts src/render3d/tilecity3d.test.ts src/render3d/tileinterior.test.ts src/render3d/kerbline.test.ts src/render3d/planview.test.ts` and one `npx tsc --noEmit`.

- **Files:** new `src/render3d/plan3d.ts` and `plan3d.test.ts`; `renderer.ts` (the routing only); `tilecity3d.ts` (`tileGroupOf` and `interiorGroupOf` split out of `tileGroup` and `interiorGroup`, plus the export of any helper the renderer needs, with no change of behaviour).
- **Must not:** `src/city/**` and `src/core/` (read only); `tilecity.ts`, `kerbline.ts`, `tileslots.ts`, `planview.ts` and their tests; `town.ts` (`STOREY_M` is read only); every other render3d file.
- **Interfaces:** nothing new in `src/core/`. E reads `CityGroundCell`, `CITY_GROUND_VARIANT`, `CityKerbPath`, `CityStreetArrow`, `CityPlanStreet.flow`, `CityMassCell`, `CityCourt` and `CityBuiltCell` as D2, A4b and C2 left them. `tileGroupOf`, `interiorGroupOf`, `plan3dGroups`, `planKerbPlan` and `PLAN_FRONTS` belong to the renderer. No new dependency.
- **Heavy:** the named-run tests build the 10 named cities both ways once, through a module cache in `plan3d.test.ts`, with a 120 s timeout. No GLB is read outside `it.skipIf`.

### F1 · Stage 5, Buildings: grouping, style, colour, floors (buildings, pure). Branch `ticket/070f1-buildings`
**Branch.** Cut from `goal/city-style` at 4b840ff or later (A1 to E merged: the split plan, one-way streets, the 6 x 6 named cities, the grey-box view).

**Goal.** Every built cell of the mass is in a building of 2 to 4 columns with a style, a colourway and a storey count, and every row reads varied: ring 1, ring 2, strips and lane rows alike. Each ring-2 building stands column for column behind its ring-1 partner at the same height, either the same building through or another one. Josh sees it on his phone at `?view=3d&city=plan&stage=buildings`: each building's cells in its colourway, shaded by its storeys, with a dot on each ring-2 building saying through or another.

**Josh's words (20 Nov 2026, in chat).** "Start F1". Grammar rule 4 (19 Nov 2026): "They can be either."

**Re-cut (20 Nov 2026, the lead-architect, against 4b840ff).** F1 as first cut was written for the old lattice. It now reads C3's mass on the split plan (built cells along streets, lanes and courts; lanes, drives, walk-throughs, plazas, frontage lots and parks as openings), uses the 20 named runs and the four pin cities, and defines a row and a building on cells. One-way streets change nothing here: stage 5 reads no street. `CityBuildingsLayer` is typed (`src/core/cityplan.ts`, "stage 5"). Two things leave the first cut: `Shop_03`'s two cells (the ground piece is stage 7's, H1, and a building of 2 to 4 columns always has room for it), and "its floors written on it" (a `CityPicture` has no text; the storeys are the shade and the legend, criterion 7).

**Pre-check first** (CLAUDE.md: this section adds rules). Before the builder starts, the `pipeline-designer` ("pre-check 070 F1", on `goal/city-style`) measures on the 20 named runs, with a probe outside the repo: whether every row closes into buildings with criteria 1, 4 and 5 holding together (the corner chain included); R2, R13 and M4c at the thresholds here; the through share; the storey histogram. If it does not report "holds", its note goes to Josh before any builder is spawned.

**Pre-check done; L1 added (20 Nov 2026, the lead-architect, at f349f8f).** The note (`docs/design/070-F1-precheck.md`) found N1 to N5 hold on 15 of the 20 named runs; the other 5 fail rule 6 in 8 court parts, all at one kind of corner (the tight corner, below), and with lever L1 all 20 named runs and all 79 outside runs that reach mass close with every check at 0. Josh was asked its four questions, each with a recommendation, and answered: **"1-4 i approve your recommendations"** (Q19). So: (1) L1 is in F1 (N1, criteria 1, 4 and 5); (2) a blind ring-2 corner takes its floors from the street-corner building (M4c) and its style and colour from the building it is grouped with, as the ticket already checked (floors only); (3) `BACK_SAME_SHARE` stays Proposed until Josh has seen F1's screenshots (criterion 9), and no test pins its value; (4) no style or colour rule for the two buildings that meet at a street corner. `CityBuilding` gains `bend` (the L's second row; null on every straight building); it had no reader, so nothing else changes.

**Which criteria are moves and which are new** (for the pre-check):
- **Moves of existing rules, numbers unchanged:** `TERRACE_BAYS` 2 to 4 (grammar rule 1); "a row always closes" (rule 6); `CITY_STOREYS` 3 to 5 and R2 at `CITY_CHECK.R2` 1 (every neighbour pair); R13 at `CITY_CHECK.R13` 1; the apartment ("bay") styles of `STACK_STYLES` as the only row styles (terrace.ts); `COLOURWAY_POOL` and `assignColourways`' step-on rule; terrace.ts's storeys choice (not the one before, and not the one before that where it can); rule 4's through or another, and its ring-2 corners taking the ring-1 corner building's height; R2 and R13 on inner and lane rows (grammar, "Guide checks that change").
- **New or changed (the architect's readings, for the pre-check to measure and Josh to see):**
  - **N1. The row and the building on cells** (criterion 1; the comment above `CityBuildingRow`). A building is straight, in one row of one part, except the L at a tight corner (L1). A corner cell joins one of its two rows, except a tight corner, which joins both as the bend of the L. A strip's short end is not a row. New: the grammar says "a row" without defining it on cells.
  - **L1. The L at a tight corner** (criteria 1, 4 and 5; Josh, 20 Nov 2026: "1-4 i approve your recommendations"). A **tight corner** is a ring-2 blind corner where, in each of its two inner rows, the stretch that holds it (from the corner to the first opening or the row's end) is exactly 2 cells: the corner and one cell beside it. It happens where a drive and a frontage lot meet at one block corner, each starting 3 cells from it. Its building is the whole of both stretches: one L-shaped building of 3 cells (the cell beside the corner in the inner row fronting "-z" or "+z", the corner, the cell beside it in the inner row fronting "-x" or "+x"). Its `rowId` is the first of those rows, its `bend` the second, and both rows list it. It follows, and its `partner` is the building that holds the ring-1 corner cell; its two non-blind cells back onto the two leading buildings round the ring-1 corner, which N2 already ties to one height. A bent building anywhere else fails the stage, and so does a tight corner not built as an L. Stage 5 only: no merged section or pin moves.
  - **N2. M4c read cell by cell** (criterion 5). Every built cell with a mass partner has the storeys of its partner's building. It follows rule 4 ("the wall between the two never shows"). It also ties the two first buildings round each ring-1 corner to one height (**the corner chain**): both back onto the ring-2 blind corner, whose partner is the corner cell. They front different sides, so they are not row neighbours and R2 does not apply between them.
  - **N3. Column for column** (criterion 4). A following building's non-blind cells all back onto one leading building, and no two following buildings share one. New as a check; rule 4 says it in words.
  - **N4. Which strip row leads** (criterion 4). Grammar rule 4 names ring 1 and ring 2 only.
  - **N5. Sub-seeds for every choice** (criterion 3). The style, storeys, colourway start and through-or-another draws come from the stage's `rand` (R-3) through `colourwayStart`'s finaliser, not from `stableHash("colourway|<key>")` or the old run keys. The rule is moved; its source of randomness changes, as R-3 requires.
  - **Not decided:** `BACK_SAME_SHARE` 0.5 is the grammar's Proposed number ("one constant for Josh's eye"). It is typed in `src/city/buildings/constants.ts`, commented PROPOSED with the grammar's words. Tests read it by name and none pins its value. It stays Proposed until Josh has seen F1's screenshots (criterion 9; his answer 3, Q19); the pre-check measured 0.50 through.
  - **Rule 4's corner sentence, read as floors only** (his answer 2, Q19). A blind ring-2 corner (an L's included) takes its floor count from the ring-1 corner building (M4c, criterion 5) and its style and colourway from the building it is grouped with. No check asks it to share the corner building's style or colourway.
  - **No street-corner rule** (his answer 4, Q19). The two leading buildings that meet at a ring-1 corner stand at one height (N2); no check asks them to differ, or match, in style or colourway.

0. [ ] **First, by the lead-architect (done with this re-cut, on `goal/city-style`):** `CityBuildingsLayer`, `CityBuildingRow`, `CityBuilding` and `CityBuildingBack` in `src/core/cityplan.ts`. The stub had no reader, so nothing else changes. With L1 (at f349f8f or later): `CityBuilding.bend` and the L in the comment above `CityBuildingRow`.
1. [ ] **Rows and buildings** (grammar rules 1 and 6; N1; Vitest, on the 20 named runs).
   - Rows are as `cityplan.ts` defines them, from `land.parts` (each part's rectangle and shape) and `mass.built` (`part`, `row`, `open`, `column`). Every non-blind cell of a row has the row's `front` among its open sides. A cell where that fails is a mass the stage cannot serve, and the stage fails (R-2); it never patches.
   - Every `mass.built` cell is in exactly one building. Every building but an L is 2 to 4 consecutive cells (`TERRACE_BAYS`, a typed-in copy) of one row, listed in order along it, with `bend` null.
   - A ring-1 corner cell is in a building of one of its two outer rows, and a ring-2 blind corner that is not a tight corner in one of its two inner rows (rule 4: "Each takes the style, colourway and floor count of the ring-1 corner building it stands behind", read as floors only, which criterion 5 checks). Which of the two is the builder's choice, by the stage's `rand`, such that every row closes.
   - **The L (L1).** Every tight corner (as in L1 and `cityplan.ts`) is the bend of one L: 3 cells, listed as L1 says, `rowId` the inner row fronting "-z" or "+z", `bend` the one fronting "-x" or "+x", its id in both rows' `buildings`. No other building has a non-null `bend` or cells off one row.
   - **A row always closes** (rule 6). A row stretch (between openings, or between an opening and the row's end) that cannot be cut into buildings with criteria 4 and 5 holding fails the stage with `CityStageError("rule 6: ...", cells)` (R-2). **Stop rule:** with L1, all 20 named runs close and are `ok` (the pre-check: 20 of 20, every check 0; the 8 tight corners are on 6 x 6 seeds 3, 5, 8 and 10, pin cities 3 and 8 among them). If one is not, the builder stops and reports (R-2); it does not loosen a rule.
   - Failing fixtures (typed-in mass and land layers, not from the mass stage): a row stretch of 1 cell fails rule 6 with its cell named. A layer with a 5-cell building, a 1-cell building, a bent building away from a tight corner, or a cell in no building fails the stage's own check. A typed-in tight corner (a drive and a frontage lot each 3 cells from one part corner) closes with one L of 3 and passes; the same corner with its blind cell in one row only fails (rule 6, the 1-cell stretch named, or the stage's own check).
2. [ ] **The style table, moved** (R-6). Typed-in copies in the folder: `STACK_STYLES`' styles whose `depth` is "bay" (the three apartment styles: the id, the keys of `base`, `floor` and `roof` by role, and `pitch_m`); `TERRACE_BAYS`; `CITY_STOREYS`; `COLOURWAY_POOL`; the R2 and R13 thresholds (`CITY_CHECK`). `src/render3d/stylepin.test.ts` pins each equal to the old path's (`stacks.ts`, `town.ts`, `citymetrics.ts`, `colourway.ts`) while both exist. It reads no GLB, so it needs no `it.skipIf`. Offices are not row styles, as in terrace.ts.
3. [ ] **Style, storeys and colourway, on the stage's `rand`** (N5; Vitest).
   - **Leading buildings**, along each row in order: a style by hash among those that differ from the row neighbour before it; storeys by hash in 3 to 5, not the one before it, and not the one before that where it can (terrace.ts's rule, moved), with the corner chain's storeys fixed where it reaches; a colourway by `assignColourways`' rule (start by hash, and step on to the next, modulo, past the one before it).
   - **Following buildings:** through or another, by `BACK_SAME_SHARE` on the partner building's id. A through building takes its partner's style and colourway. Another takes a style by hash that differs from both row neighbours, and a colourway that starts by hash and steps on past its partner's and both row neighbours'. Either way its storeys are its partner's.
   - Every hash is the stage's `rand(...key)` through `colourwayStart`'s finaliser, moved as a function of a number. Test (in `stylepin.test.ts`, which may import both): on 10 typed-in keys, the finaliser of `stableHash("colourway|" + key)` modulo `n` equals the old `colourwayStart(key, n)`.
   - Tests: the same plan gives the same layer twice; another seed gives another layer.
4. [ ] **Lead and follow** (grammar rule 4; N3, N4; Vitest, on the 20 named runs).
   - In a court part every outer building leads and every inner building follows.
   - In a strip, the row whose front has street frontage (`CityOpenSide.frontage` "street": a street, park edge or plaza) leads. If both rows do, or neither, the row whose front is "-x" or "-z" leads (N4). The other row follows.
   - **Column for column** (N3): the mass partners of a following building's non-blind cells all lie in one leading building, which is its `partner`. No two following buildings have the same `partner`. A leading building may have no follower (where its back is a blind corner joined to the other row). **The L's exception (L1):** an L's two non-blind cells back onto the two leading buildings round the ring-1 corner; its `partner` is the one that holds the ring-1 corner cell, and the other is left with no follower.
   - `partner` and `back` are null exactly on leading buildings.
5. [ ] **M4c, R2 and R13** (grammar rules 4 and 12; the checks table; Vitest, on the 20 named runs). Each check is a function of the layer and the mass, run by the stage before it returns; a failure names the check and the buildings' cells.
   - **M4c** (N2): every built cell with a mass `partner` is in a building with the same storeys as the building its partner is in. A through building has its partner's style and colourway. An another building has a colourway that is not its partner's. For an L, the cell-by-cell storeys reach both leaders round the corner (tied by N2); style and colourway are read against its `partner` only. A blind ring-2 corner is checked for floors only (Q19, answer 2).
   - **R2:** every building has 3 to 5 storeys. Every pair of row neighbours (two buildings of one row whose end cells are side by side along it, no opening between) differs in style and in storeys. The share is `CITY_CHECK.R2` (1): every pair. Outer, inner, strip and lane rows alike.
   - **R13:** every pair of row neighbours differs in colourway (`CITY_CHECK.R13`, 1).
   - Failing fixtures (the default city's layer, typed in from the run in the test, not pinned by hash, with one building changed): a following building given its partner's storeys plus one fails M4c; an another building given its partner's colourway fails M4c; a through building given a different style fails M4c; two row neighbours given one style fail R2, one storey count R2, one colourway R13; a building of 6 storeys fails R2.
6. [ ] **The numbers** (reported, not asserted). For each of the 20 named runs: buildings (leading and following), rows, the through share, the storey histogram, the shortest and longest row stretch, and the number of Ls. For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) that reach stage 5: whether stage 5 is ok, and its failure if not. Nothing asserts them (R-2).
7. [ ] **Picture** (R-5; Vitest). Index 0 is "not built" (street and open cells). Then one entry for each colourway of the pool and storey count, named "<colourway>, <n> storeys". Its colour is the colourway's swatch, lighter at 3 storeys and darker at 5. The swatches are a typed-in table in the folder: red, orange-red, green, bright green, cream-tan, bright tan, teal, bright teal, as `COLOURWAY_POOL`'s comment names them. Each following building has one point, at its middle cell's centre (an L's: the corner), with legend "through" or "another". R-5's test holds: the size is the lattice's, every index is in the legend, and each built cell's entry is its building's colourway and storeys.
8. [ ] **R-1 to R-7 for `buildings`** (Vitest).
   - `src/city/stages.ts` adds the buildings stage to `BUILT_STAGES` (one line, as D1 did for edge). `src/city/pipeline/run.test.ts`'s "not built" example `"buildings"` becomes `"circuit"` (that line only).
   - R-4: the layer's digest is pinned on the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on). Swapping in a test double for buildings leaves the streets, land, mass and edge digests equal to the standard run's.
   - R-7: a 6 x 6 seed 1 run ends `ok` (the default named city; the builder may fold it into the named loop).
   - Stage 5 reads `plan.layers.land` and `plan.layers.mass`, and `plan.layers.streets` only for the lattice's `w` and `h` (the picture). A grep test (Vitest, as in B3, C3 and D1b) checks that no file of the folder reads `bi`, `bj`, a street's `line` or `layers.edge`; the reviewer checks the streets read.
9. [ ] (Main session, phone-sized screenshots) `?view=3d&city=plan&stage=buildings` on 6 x 6 seed 1 and 6 x 6 seed 3. They should show: neighbours along every row in different colours; ring 2 in ring 1's shade behind it, and the through ones in its colour too; strips and lane rows as varied as the street rows. `?view=3d&city=plan&stage=assemble` and `?view=3d&city=tiles` look as on `goal/city-style`. With the screenshots Josh is asked whether `BACK_SAME_SHARE` 0.5 becomes Decided (Q19, answer 3); until he says so it stays Proposed.
10. [ ] R-8 to R-11. Tests the builder runs: `npx vitest run --maxWorkers=2 src/city/buildings/ src/city/pipeline/run.test.ts src/render3d/stylepin.test.ts src/render3d/planview.test.ts`, and one `npx tsc --noEmit`. The main session's gate is the full `npm run gate`: F1 is not held.

- **Files:** new `src/city/buildings/`; new `src/render3d/stylepin.test.ts` (the one render3d file this section adds); `src/city/stages.ts` (the one line, criterion 8); `src/city/pipeline/run.test.ts` (the one example line, criterion 8).
- **Must not:** `src/core/` (criterion 0 is the architect's); every other `src/city/` folder; every other `src/render3d/` file (`planview.ts` draws the new stage unedited, and its tests read `BUILT_STAGES`).
- **Interfaces:** `CityBuildingsLayer`, `CityBuildingRow`, `CityBuilding` and `CityBuildingBack` (criterion 0). F2 extends `CityBuildingsLayer` with each storey's kind, turn, piece and placement, and the roof pieces; the architect types those before F2 starts. No new dependency.
- **Heavy:** the named-run tests build the 10 named cities both ways once, through a module cache, with a 120 s timeout. Criterion 6's report has its own file.

### F2 · Stage 5, Buildings: pieces, turns, roofs, placements (buildings, pure). Branch `ticket/070f2-building-pieces`
**Branch.** Cut from `goal/city-style` at 768b657 or later (A1 to F1 merged: the split plan, one-way streets, the 6 x 6 named cities, the grey-box view, F1's rows and buildings).

**Goal.** Every built cell is a column whose storeys, from the ground to the roof, have their kind and turn, and whose floors and roof have their piece and exact placement on the cell, so G only puts each piece where the plan says. The ground storey has a slot (kind and turn); its piece is stage 7's (H1). Nothing changes on screen until G draws it.

**Josh's words (20 Nov 2026, in chat).** "Go ahead and start f2". On `BACK_SAME_SHARE`: "Let me see the 3D buildings first", so it stays Proposed until G's screenshots (G criterion 3), and no test pins its value.

**Re-cut (20 Nov 2026, the lead-architect, against 768b657).** F2 as first cut had five lines. It now reads F1's layer as merged (rows; buildings with the tight-corner L's `bend`, style, colourway, storeys, partner and back) and the mass's built cells (open sides, column kind), runs on the 20 named runs and the four pin cities, and says how every kind of column is pieced, the L's included. One-way streets change nothing: stage 5 reads no street. `CityColumn`, `CityGroundSlot`, `CityPiece`, `CityPieceRole` and `CityBuildingsLayer.columns` are typed (`src/core/cityplan.ts`, "stage 5, F2"); `columns` is optional, as `CityEdgeLayer.ground` was before D2, so F1's code and fixtures still compile, and F2 always writes it. Two things leave the first cut: the ground storey's placement, M1 and G1 (its key is stage 7's, so its body is too: H1, see H1's note), and M2 read literally on roofs (P4 below).

**Pre-check first** (CLAUDE.md: this section adds rules). Before the builder starts, the `pipeline-designer` ("pre-check 070 F2", on `goal/city-style`) measures on the 20 named runs, with a probe outside the repo and the fixture bounds of `citymetrics.test.ts` with `BODY_M`: P1 to P5 below; M1, M6, M9a and G1 at the thresholds here; the roofs' overhangs (front, back and sides, per key); pieces per city by role. If it does not report "holds", its note goes to Josh before any builder is spawned.

**Which criteria are moves and which are new** (for the pre-check):
- **Moves of existing rules, numbers unchanged:** `BODY_M` (facade.ts, 063 E2), the corner pieces' measured -x second face (`OPEN_SIDE_MEASURED`, 063 E1) and the pieces' bounds as the manifest has them, as typed-in data; rule 7's forced turn (Decided; a piece cannot be mirrored) and "corner pieces from the ground to the roof"; R9's meaning (Josh, 19 Nov 2026: "Yes, any corner"); the storey pitches (base 3 m, floor 3 m, the roof on the last, `assembleStack`) and its three-storey piece (`Apartment_Stack_*`) for each run of three floors in a non-corner column; rule 11's roof of the building's own style, the corner roof on a corner column; 063 E2's roof seat (`seatOnBody`: the back plane on the back, a mid roof centred, a corner roof's outer flank on the flank) and `storeyAlignment`'s misfits at `STOREY_ALIGN_TOL_M` 0.03 (M9a); G1's numbers (`OVERLAP_MAX_M` 0.6, `RECESS_MAX_M` 0, `FRONTAGE_TOL_M` 0.01); M2's 0.02 m (grammar).
- **New or changed (the architect's readings, for the pre-check to measure and Josh to see):**
  - **P1. A floor's body is its cell** (criterion 4; grammar rule 1, M1). The old path laid columns side by side at their bounds' widths and seated pieces on the floor's wall line (`align: "wall"`, `footprint: "body"`); here every floor piece's four body planes go on the cell's four edges, so M1 holds by construction. `WALL_JOINT_TOL_M` 0.02 is the grammar's M1 number, new in code (ticket 064, which would have added it, was superseded).
  - **P2. Blind columns** (criteria 2 and 3). The old path had none (ring 2 was apron). A blind column takes mid floors (and `floor3` runs) and the mid roof, turned to its building's `front`; its ground slot is "blind". Its roof is seen; its walls are not.
  - **P3. The L's bend** (criteria 2 and 3; no old-path equivalent). Each of the L's three columns is pieced by its own open sides, not by its building's front: the `rowId` cell fronts the `rowId` row, the corner (blind) takes the building's `front` (the `rowId` row's), and the `bend` cell fronts the `bend` row (`CityColumn.rowId` names it). All three take the building's style, colourway and storeys, and one roof piece each. Nothing is bent: the L is three straight columns.
  - **P4. M2 on the wall pieces; roofs by M9a** (criteria 1 and 5). M2 holds every floor piece of the kit (mid, corner, three-storey) to a 5.00 by 5.00 m body within 0.02 m. The roofs' bodies (the cornice's lowest tier) come to 5.02 to 5.06 m across and 5.08 to 5.11 m deep from the fixture bounds and `BODY_M`, so the grammar's "every piece ... 5.00 by 5.00" cannot hold for them as written (and its remedy, dropping the piece, would leave no roof). They are seated by 063 E2's rule and held by M9a; their extra is reported (criterion 6), not a failure. Grammar rule 11 already reads a roof's base course as "5.02 m wide, on the 5.00 m body".
  - **P5. G1 on every storey above the ground, every open side** (criterion 5). The guide's G1 judges the street-level wall; the grammar runs it "on every open side of the built mass". F2 runs it on the floor pieces' open faces; the ground storey's G1 is H1's, with its key.
- **Not decided:** `BACK_SAME_SHARE` 0.5 (F1; Josh, 20 Nov 2026: "Let me see the 3D buildings first"). F2 does not read it.

0. [ ] **First, by the lead-architect (done with this re-cut, on `goal/city-style`):** `CityColumn`, `CityGroundSlot`, `CityPiece`, `CityPieceRole` and `CityBuildingsLayer.columns` (optional) in `src/core/cityplan.ts`, with the turn, piece and placement rules in the comment above them; `CityPlacement`'s pivot and turn convention written into its comment. No reader changes.
1. [ ] **The kit table** (R-6; P4). Typed-in data in the folder, for the 15 keys the stage places (each apartment style's mid floor, corner floor, three-storey piece, mid roof and corner roof): the bounds (w, h, d, metres, as the manifest has them), the body insets (`BODY_M`'s front, back, -x, +x), and for a corner key its second face, "-x" (`OPEN_SIDE_MEASURED`). The style table gains each style's three-storey key (`STACK_STYLES`' `floor.stack3`). `src/render3d/kitpin.test.ts`:
   - always (no GLB): every entry's insets equal `BODY_M[key]`; every corner key's face equals `OPEN_SIDE_MEASURED[key].open`; each style's three-storey key equals `STACK_STYLES`'; `STOREY_ALIGN_TOL_M`, `OVERLAP_MAX_M`, `RECESS_MAX_M` and `FRONTAGE_TOL_M` equal the old path's (`stacks.ts`, `frontage.ts`); every floor key's body (bounds less insets) is 5.00 by 5.00 m within 0.02 (M2);
   - `it.skipIf(!HAVE_GLB)`, read lazily as `facade.test.ts` does: every entry's bounds equal the converted GLB's within 0.005 m (M2's GLB half; `BODY_M` itself is already re-measured by `facade.test.ts`).
2. [ ] **Columns, kinds and turns** (rules 3 and 7; P2, P3; Vitest, on the 20 named runs).
   - `columns` has one column per `mass.built` cell, in that order, with its building's id and `kind` equal to the cell's `column`.
   - Every column's ground slot and every piece take the column's `yaw`. A mid column's `front` is its one open side. A corner column's `front` and `side` are forced as `cityplan.ts` says ({+z, -x} 0, {+x, +z} 90, {-z, +x} 180, {-x, -z} 270), and the two are exactly its two open sides. A blind column's `front` is its building's, and its `side` null.
   - `rowId`: the building's, except an L's `bend` cell (the `bend` row). Every non-blind column's `front` is its `rowId` row's `front`, or that and its `side` for a corner.
   - The ground slot: kind and yaw the column's, `y_m` 0, `top_m` the style's base pitch. It names no key.
3. [ ] **Pieces and roofs** (rules 1, 7 and 11; Vitest, on the 20 named runs).
   - Storeys 1 to `storeys - 1` are covered once each, bottom up. A corner column: one corner floor of its building's style per storey. A mid or blind column: from storey 1 up, a `floor3` (the style's three-storey key) for each whole run of three, then a mid floor per storey left (so 3 storeys: two floors; 4: one `floor3`; 5: one `floor3` and one floor), as `assembleStack` does.
   - Storey k's piece stands at `y_m` 3 k, and the roof at 3 x `storeys`.
   - Exactly one roof piece, last: the corner roof of the building's style on a corner column, its mid roof on a mid or blind one (rule 11: never another style's).
   - Every key is one of the kit table's, of the building's style.
4. [ ] **Placements** (rule 1; P1). From the kit table only:
   - A floor piece (`floor` or `floor3`): its body's centre on the cell's centre, so each body plane is on its cell edge.
   - A roof: its body's back plane on the cell's back edge (the side opposite `front`); across, a mid or blind roof's body centred on the cell, a corner roof's outer flank on the `side` edge.
   - `CityPlacement` has no scale and none is applied (chapter 2). A test checks one hand-worked placement per role, and a corner floor of `Apartment_Corner_03` at each of the four turns, its pivot computed by hand from its bounds and insets.
5. [ ] **The checks** (Vitest, on the 20 named runs; each a function of the layer and the mass, run by the stage before it returns; a failure names the check and the cells). **Stop rule:** if one fails on a named run the builder stops and reports (R-2); it does not loosen a rule.
   - **M1, lattice fit:** every floor piece's four body planes lie on its cell's edges within `WALL_JOINT_TOL_M` (0.02).
   - **M6, corner turn, and R9:** on every corner column, every piece and the ground slot's yaw put the pieces' own +z and -x faces on the column's two open sides, and the corner roof is turned with its column; no corner key stands on a mid or blind column.
   - **M9a, roofs:** one roof piece per built cell, its kind matching the column's, its yaw the column's; `storeyAlignment`'s rule on each column (every floor's back plane and sides, and the roof's back plane and reference plane, the centre of a mid or blind roof or the outer flank of a corner roof, within `STOREY_ALIGN_TOL_M` of the column's floor body), moved as a function of placements and the kit table.
   - **G1, no recess, no overreach (P5):** on every open side of every column, every floor piece's body plane stands no more than `RECESS_MAX_M` + `FRONTAGE_TOL_M` behind the cell edge and no more than `OVERLAP_MAX_M` + `FRONTAGE_TOL_M` past it.
   - Failing fixtures (the default city's layer, typed in from the run in the test, not pinned by hash, one thing changed): bounds placement (a three-column `Apartment_02` building laid at its bounds' 5.17 m pitch, 15.51 m wide) fails M1; a corner column turned on the old guess, "+x" (its yaw a quarter off the forced one), fails M6; a roof one cell off fails M9a; a floor body set 0.05 m back from its open edge fails G1; a corner floor on a mid column fails R9.
6. [ ] **The numbers** (reported, not asserted). For each of the 20 named runs: columns by kind, pieces by role, pieces in all (G's draw-call estimate), and the Ls' columns; per roof key, its body's overhang past the cell on each side (P4). For the outside cities that reach stage 5: whether stage 5 is ok, and its failure if not.
7. [ ] **R-1 to R-7 for `buildings`, again** (Vitest).
   - F1's rows and buildings do not change: on the four pin cities, the layer with `columns` removed has F1's digest (F1's four pins, kept as these). The buildings digest pins (R-4) are re-taken once, with `columns`. The streets, land, mass and edge digests are unchanged, and the test double still leaves them equal.
   - The picture is F1's, unchanged (R-5's test holds as it is); F2 adds no legend entry.
   - Stage 5 still reads only `land`, `mass` and the streets' `w` and `h`; F1's grep test holds.
   - R-7: 6 x 6 seed 1 ends `ok`.
8. [ ] (Main session) `?view=3d&city=plan&stage=buildings`, `stage=assemble` and `?view=3d&city=tiles` look as on `goal/city-style` (F2 draws nothing new; G does).
9. [ ] R-8 to R-11. Tests the builder runs: `npx vitest run --maxWorkers=2 src/city/buildings/ src/city/pipeline/run.test.ts src/render3d/kitpin.test.ts src/render3d/stylepin.test.ts src/render3d/planview.test.ts`, and one `npx tsc --noEmit`. The main session's gate is the full `npm run gate`: F2 is not held.

- **Files:** `src/city/buildings/`; new `src/render3d/kitpin.test.ts` (the one render3d file this section adds).
- **Must not:** `src/core/` (criterion 0 is the architect's); every other `src/city/` folder; every other `src/render3d/` file (`stylepin.test.ts` is run, not edited; `facade.ts`, `stacks.ts`, `frontage.ts` and their tests are the old path's).
- **Interfaces:** criterion 0. H1 reads `columns[].ground`, `kind`, `front`, `side` and `rowId`; G reads `columns[].pieces[].placement` and each building's colourway. No new dependency.
- **Heavy:** the named-run tests build the 10 named cities both ways once, through a module cache, with a 120 s timeout. Criterion 6's report has its own file.

### G · Assemble: buildings drawn (renderer). Branch `ticket/070g-plan3d-buildings`
**Branch.** Cut from `goal/city-style` at a2511a6 or later (F2 merged, fac37be: every built cell has a `CityColumn` with its pieces placed).

**Goal.** At `?view=3d&city=plan&stage=assemble` the grey boxes become City Pack buildings, piece by piece, each piece at the placement stage 5 wrote for it, in its building's colourway. Ground storeys stay a plain grey placeholder until H1 places their pieces. Josh walks the pipeline's city with real walls and roofs. With the screenshots he answers `BACK_SAME_SHARE` and the F2 pre-check's three questions.

**Josh's words.** On F1's pictures (20 Nov 2026, in chat): "Let me see the 3D buildings first" (`BACK_SAME_SHARE`, Q19 answer 3). Sections A1 to J merge into `goal/city-style` under his 19 Nov waiver once green (Q3: "Yes").

**Re-cut (20 Nov 2026, the lead-architect, against a2511a6).** G was first cut before F1 and F2 were re-cut and merged. It now reads the stage 5 layer as merged:
- `CityBuildingsLayer.buildings`: style, `colourway`, storeys, and the L's `bend`;
- `CityBuildingsLayer.columns`: one `CityColumn` per built cell, with `kind`, `front`, `side`, `yaw`, `ground` (a `CityGroundSlot`) and `pieces` (`CityPiece`: role `floor`, `floor3` or `roof`, with its `CityPlacement`).

It draws on E's assemble view (`plan3d.ts`). G only draws. It adds no rule, check or number, so it skips the pre-check (CLAUDE.md).

**No choices in render3d.** Every piece is drawn where its `CityPlacement` says: its key, its pivot (`x_m`, `y_m`, `z_m`, the converter's bounds-centre and base), and its turn (`yaw_deg`, three.js's convention). Nothing is scaled. G picks no key, no turn and no offset, and reads no kit table, style table or `BODY_M`. The L is three straight columns, each drawn from its own pieces (F2's P3), so G needs nothing for the bend.

**The ground storey.** Stage 5 gives each column a ground slot (kind, yaw, `y_m` 0, `top_m` 3) and no key; stage 7 (H1) picks the key. The first cut said "a placeholder floor piece". Drawing a pack piece there would mean render3d choosing its key, so the placeholder is E's plain grey box filling the slot instead: the cell's 5 m square from `ground.y_m` to `ground.top_m`. H1 replaces it with real pieces, and J draws them.

**Stop rule (as in E).** Where the layer does not say what to draw, the builder commits, stops and reports the cells (`PlanStopError`). Examples: no `columns`; a piece whose key is not a stack key the page loads; a column with no roof. The gap is a re-cut of F2, never a choice in `src/render3d/`. A piece whose key is a stack key but whose model did not load is not a gap: criterion 2's fallback covers it.

1. [ ] **The run goes to stage 5** (Vitest). `createPlanAssembleRenderer3d` runs `runCity(..., "buildings")` where it ran `"edge"`.
   - A run that fails at `buildings` draws nothing and shows that stage and its reason as text, as E does for every stage (`planFailureText`).
   - `?view=3d&city=plan&stage=buildings` (the flat picture) is still `planview.ts`'s, unedited. `planview.test.ts` passes unedited.
2. [ ] **Pieces from placements only** (`plan3d.ts`, Vitest). `plan3dGroups(plan, roots, entries, colourways?)` replaces E's grey mass with three things:
   - **The buildings.** One `Group` per building, named `building:<id>`. It holds one wrapper per piece of each of its columns, named `piece:<key>`. The wrapper's position is (`x_m`, `y_m`, `z_m`) x `WORLD_PER_METRE`, its `rotation.y` is `yaw_deg` in radians, and its scale is `WORLD_PER_METRE`. It holds one clone of the key's loaded root, the way `stackGroup` clones (shared geometry and materials, `raycast` off).
   - **The colourway.** Each building group is painted with `paintStack(group, building.colourway, { colourways }, cache)` (`models3d.ts`, read as it is). There is one `createColourwayCache` per draw, freed by `dispose`. "base", or an id whose atlas did not load, leaves the cached materials as they are (the layer's comment: "the plan never knows what loaded"). Nothing emissive is set.
   - **The grey boxes: one `InstancedMesh`, E's grey `MASS_GREY`, one draw call.** It has one instance per column:
     - the ground slot (the cell's 5 m square, `ground.y_m` to `ground.top_m`) when all of the column's pieces have a loaded root;
     - otherwise, the whole column as one grey box from 0 to its roof piece's `y_m`, with no piece of it cloned. This covers code-only, CI, before the models load, and a stack key that failed to load. It is E's box at the building's height, read from the plan.
   - **A pure list** the tests read without Three.js: `planPieceDraws(buildings): { building: string; column: CityCell; role: CityPieceRole; placement: CityPlacement; colourway: string }[]`. `plan3dGroups` draws exactly it.
   - Tests, with stub roots and no GLB: a small `Group` per kit key holding one `Mesh` whose material's `map` is named `PolygonCity_Texture`, and one stub colourway texture:
     - Every wrapper's world position, turn and scale equal its placement's. A corner column's four turns (0, 90, 180, 270) are among those checked.
     - One wrapper per piece, and one building group per building.
     - A building in a loaded colourway has its meshes' `map` swapped to that colourway's texture. A "base" building, and one whose id did not load, keep the source material.
     - With empty `roots`, no piece is cloned, and there is one grey instance per column at its full height.
     - With one key's root missing, only the columns that use that key fall back.
3. [ ] **Draws only; the digest-diff test, as in E** (Vitest, on the 20 named runs: 6 x 6 seeds 1 to 10, one-way off and on).
   - Every layer's digest (streets, land, mass, edge, buildings) is the same before and after `plan3dGroups`.
   - `planPieceDraws` lists every `CityPiece` of every column exactly once, with the colourway of the column's own building.
   - Every column has exactly one grey instance (ground slot or fallback).
   - E's counts hold unchanged: every `ground` record, every kerb seg but `opening`, and every non-built mass cell drawn once.
   - The Ls' columns (on 6 x 6 s8 off, and s3, s5, s8 and s10 on) are drawn from their own pieces, like any other column.
   - The full Three.js group (with stub roots) is built only on the default city and the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on). There, the wrapper count equals the `planPieceDraws` length, and the matrices equal the placements.
   - Failing fixtures, built from the default city's run in the test, not pinned by hash:
     - the exactly-once check fails when given the city's draw list with one piece dropped;
     - it also fails with one piece listed twice;
     - `plan3dGroups` throws `PlanStopError`, the cell named, on the buildings layer with one built cell's column removed from `columns`;
     - it also throws `PlanStopError` on a layer with no `columns`.
4. [ ] **Draw calls** (Vitest, code-drawn; the builder reports the pack's numbers). No cap is raised or added.
   - The street pieces stay within `TILE_DRAW_CALLS_MAX` (40), and the interiors within `INTERIOR_DRAW_CALLS_MAX` (24), as in E. The grey boxes are 1 call, as E's mass was.
   - The building clones have no cap (none exists, and G adds none: that would be a new number). Inside `it.skipIf(!HAVE_GLB)`, read lazily, the builder reports on the default city (6 x 6 seed 1): building calls before (E: 1) and after. "After" is the meshes the clones bring, counted per key from the converted GLB, times the key's pieces. It also gives the pieces by role, and the same for 6 x 6 seed 3.
     - The grammar expects about twice `city=tiles`. If the builder can count `city=tiles`' stack meshes on 6 x 6 seed 1 from exported functions without editing another file, it reports that too; otherwise it says so.
   - The renderer's console line, after the models swap in, gains the building groups, the pieces cloned, the columns that fell back, and `gl.info.render.calls` for the next frame drawn.
   - If the frame rate cannot hold (criterion 6), the main session takes it to Josh. The remedy is instancing the stack pieces, in a later ticket (Non-goals). It is never a cap, and never dropping pieces.
5. [ ] **Nothing else changes** (Vitest and R-8, R-9).
   - `?view=3d&city=tiles` draws as on `goal/city-style`. `tilecity3d.ts`, `models3d.ts`, `renderer.ts`, `planview.ts` and their tests are not edited, and `tilecity3d.test.ts` and `planview.test.ts` pass unedited.
   - The plan path loads what it loads today: `sharedTileModels(planKeys())` already brings `allStackKeys()` (every kit key: mid and corner floors, `Apartment_Stack_*`, mid and corner roofs) and the colourway atlases. G adds no load.
   - If a kit key turns out not to load on the plan path, the builder stops and reports it. That would be a re-cut to add `models3d.ts` (plan path only); G never adds it on its own.
   - The ladder is unchanged (`npm run playtest`).
6. [ ] (Main session, in the browser: the plan view checked by eye, since E's blank-sky bug got past every test.) Open `?view=3d&city=plan&stage=assemble` at a phone size and at a desktop size, overhead and street camera, day and `light=night`. Check that:
   - the city is in view (not blank sky);
   - no failure text shows;
   - the buildings swap in from grey once the models load;
   - the console line shows the counts of criterion 4 and a frame rate that holds while panning.

   Then check that `?view=3d&city=plan&stage=buildings` (the flat picture) and `?view=3d&city=tiles` look as on `goal/city-style`.
7. [ ] (Main session, screenshots, phone-sized and sent to Josh: overhead and street camera, day and one at night; 6 x 6 seed 1 and 6 x 6 seed 3, one-way on.) The screenshots should show:
   - back-to-back rows, ring 2 standing behind ring 1 column for column;
   - corners turned to their two open sides, with windows on both street faces;
   - roofs on their cells;
   - no gap between walls along a row or across the back;
   - the Ls on seed 3 reading as one building round the bend;
   - ground storeys as plain grey (the placeholder until H1).

   **Street-camera views that frame corners** (worked out from the plan on 6 x 6 seed 1, one-way on, at a2511a6; not yet seen in a browser, so the main session adjusts `at` if a view is blocked):
   - `?view=3d&city=plan&stage=assemble&cam=street&at=48,15&dir=+x`: along street x:1 into the crossroads at cells 50 to 52 / 14 to 16. Its style-01 corners stand at 48,12 (3 storeys), 54,12 (5) and 54,18 (4). This view is for questions 2 and 3 below.
   - `?view=3d&city=plan&stage=assemble&cam=street&at=19,35&dir=+x`: the crossroads at 21 to 23 / 34 to 36, with four corners in styles 02 and 03 (19,32; 25,32; 19,38; 25,38). This view is for question 3's 11 cm step.
   - A taller hidden back building over a lower roof (question 1): seed 1 has 32 such blind columns. For example, 55,11 (5 storeys) fronts 55,10 (3 storeys), and 66,11 (5) fronts 65,11 (3). They are seen from the overhead rig, panned there.

   **With the screenshots the main session asks Josh four questions, word for word, each with its recommendation.** It records his words under Questions for Josh (Q20). G does not change for any answer:
   1. Whether `BACK_SAME_SHARE` 0.5 becomes Decided (Q19, answer 3; "Let me see the 3D buildings first"). Until he says so it stays Proposed, and no test pins it.
   2. The three F2 pre-check questions (`docs/design/070-F2-precheck.md`, section 4), judged on these screenshots:
      - **U1:** may a hidden back building's windows show above a lower roof in front of it?
      - **U2:** may the style-01 roofs overhang by what the piece carries (up to 0.79 m at the front, 0.715 m on a corner's outer flank), past rule 2's 0.6 m trim?
      - **U3:** is the 8 to 11 cm step in the roof's base at a corner judged on the screenshots, with no rule now?

      The note's section 5 says what each answer leads to. A "No" leads to a re-cut of F2 or H2 and a pre-check, never to a change in G.

   **Answered, Josh, 20 Nov 2026, in chat (Q20).** Shown the screenshots and asked the four, with a fifth (cut an instancing ticket for the ~7.7k building draw calls now, or later), he answered: "Yes to all, instancing later". So: `BACK_SAME_SHARE` 0.5 is Decided (F3 changes its comment); U1, U2 and U3 are yes as recommended (U1 adds a line to H2 criterion 2; U2 reads rule 2's 0.6 m as not holding a roof's cornice, a grammar line L edits; U3 changes nothing); instancing is a later ticket. G does not change.
8. [ ] R-8, R-10 and R-11. Tests run: `npx vitest run --maxWorkers=2 src/render3d/plan3d.test.ts src/render3d/planview.test.ts src/render3d/tilecity3d.test.ts`, and one `npx tsc --noEmit`. The main session's gate is the full `npm run gate`.

- **Files:** `src/render3d/plan3d.ts`, `src/render3d/plan3d.test.ts`. E's mass tests in `plan3d.test.ts` (the `mass.count` and `MASS_HEIGHT_M` checks) become criterion 2's grey-box tests.
- **Must not:**
  - `src/city/**` and `src/core/` (read only);
  - `models3d.ts`, `tilecity3d.ts`, `renderer.ts`, `planview.ts`, `tilecity.ts`, `kerbline.ts`, `tileslots.ts`, `stacks.ts`, `colourway.ts`, `facade.ts` and their tests (read only);
  - every other render3d file;
  - `town.ts` (`STOREY_M` is read only).
- **Interfaces:** nothing new in `src/core/`. G reads `CityBuilding.colourway`, `CityColumn`, `CityGroundSlot`, `CityPiece`, `CityPieceRole` and `CityPlacement` as F1 and F2 left them. `planPieceDraws` and the new `PlanDraw` fields (the buildings and the grey boxes, replacing `mass`) belong to the renderer. No new dependency.
- **Adds no rule or number.** It draws the placements, colourways and ground slots stage 5 wrote. The grey placeholder and the fallback are drawing only, and no cap is added. So no pre-check.
- **Heavy:** the named-run tests build the 10 named cities both ways once, through a module cache in `plan3d.test.ts`, with a 120 s timeout. The Three.js groups are built on five cities only (criterion 3). No GLB is read outside `it.skipIf`. No browser for the builder (Josh's PC); the browser checks are the main session's.

### F3 · Stage 5: `BACK_SAME_SHARE` is Decided (buildings, pure). Branch `ticket/070f3-back-share-decided`
**Branch.** Cut from `goal/city-style` at 2d003a5 or later. It shares no file with H1, H1b or G2 and may run alongside any of them. **H1 merges only after F3** (20 Nov 2026, the lead-architect, F3's criterion 4): F3 is merged into `goal/city-style` first, then into H1's branch before H1's gate.

**Goal.** The constant's comment says what Josh decided, a test holds his number, and buildings' R-4 test double holds whatever stages follow buildings.

**Josh's words (20 Nov 2026, in chat; Q20).** Shown G's 3D screenshots and asked, first, "should BACK_SAME_SHARE 0.5 become Decided", with four more questions, he answered: "Yes to all, instancing later".

1. [ ] `BACK_SAME_SHARE`'s comment in `src/city/buildings/constants.ts` says Decided, with his words and the date, in place of PROPOSED and "No test pins its value", as A4c criterion 8 did for `T_SHARE_MIN` (Vitest: none; the reviewer reads it).
2. [ ] A test pins its value: `BACK_SAME_SHARE` equals 0.5 (Vitest).
3. [ ] Nothing else changes: the value is the same, so every digest pin holds unedited. R-8 to R-11. Tests: `npx vitest run --maxWorkers=2 src/city/buildings/`, and one `npx tsc --noEmit`.
4. [ ] **(Added 20 Nov 2026, the lead-architect, for H1's gate.)** The R-4 test in `src/city/buildings/stage.test.ts`, "a test double for buildings leaves the digests of streets, land, mass and edge equal to the standard run's (R-4)", builds its stage list by replacing the stage named `buildings` in `BUILT_STAGES` with the double (or by taking `BUILT_STAGES` up to and including `buildings` and swapping that one), never by `BUILT_STAGES.slice(0, -1)`, so it holds whatever stages follow buildings (H1 appends `facadesStage`). It still asserts the same five things: the run is ok; the streets, land, mass and edge digests equal the standard run's; the buildings digest differs. A second check in the same test shows it: the list built the same way from `[...BUILT_STAGES, stand-in]`, a stand-in stage appended after buildings, gives the same five results (Vitest).

- **Files:** `src/city/buildings/constants.ts` (that one comment); one test file in `src/city/buildings/` (the builder's choice, new or existing), for criterion 2; `src/city/buildings/stage.test.ts`, for criterion 4 (that one test; no other test in it changes).
- **Adds no rule or number** (it records a Decided one; criterion 4 changes how a test builds its list, not what it asserts). No pre-check.
- ~~If the main session would rather spare a gate round, F3 may instead be folded into the next buildings-owned section, as its first criterion.~~ Struck 20 Nov 2026 with criterion 4: H1's gate needs F3, so F3 runs now as its own section. Until it lands, Q20 here is the record, and the stale comment binds no one.

### H1 · Stage 7, Facades: ground storeys (facades, pure). Branch `ticket/070h1-facades-ground`
**Branch.** Cut from `goal/city-style` at 816bad2 or later (the pre-check and Josh's answer). The pre-check did not hold and Josh has answered it (Q21), so the builder may start. **H1 merges only after F3** (20 Nov 2026, the lead-architect): H1's full gate at 5318f5c failed buildings' R-4 test double (`src/city/buildings/stage.test.ts`: `BUILT_STAGES.slice(0, -1)` drops `facadesStage`, not buildings), a file outside H1's folder. F3's criterion 4 fixes it. F3 is merged into `goal/city-style`, then into H1's branch, before H1's gate is run again. H1's own files do not change for it.

**Josh's words (20 Nov 2026, in chat; Q21).** Asked the H1 pre-check's three questions (`docs/design/070-H1-precheck.md`, section 4), each with its recommendation (1: a ground piece may stop up to 1 cm short of the floor above; 2: the six deep shop pieces may run back up to 0.6 m into the always-built building behind, placed against the front edge; 3: the ring-2 buildings that face stalls on every column may have no door), he answered: "Yez, all three". The re-cut below (20 Nov 2026, the lead-architect, at 816bad2) writes in the note's section 5 for "all three yes":
- **Answer 1:** S1's gap tolerance is `GROUND_GAP_MAX_M` 0.01 (S1; criteria 1 and 4).
- **Answer 2:** reading D5, the deep ground pieces: front-aligned, back allowance `OVERLAP_MAX_M` (criteria 1, 3 and 4's M1).
- **Answer 3:** D1's no-door case (criteria 2 and 4's M8), with failing fixtures.
- **D4:** the corner-door numbers measured in the note are typed in (criterion 1).

**Goal.** Every ground slot that stage 5 left has its piece, keyed and placed on its cell:
- street fronts carry shops, double shops, shop corners, and one residents' door per building;
- quiet fronts carry one residents' door (or corner door) per building, and windowed floor pieces, never a shop; a ring-2 building whose every door place faces stalls has no door (Q21);
- no door opens onto stalls.

Nothing changes in 3D until G2 draws the pieces. The flat picture gains the `facades` stage.

**Re-cut (20 Nov 2026, the lead-architect, against 2d003a5).** H1 was first cut, four lines long, before F2 and G. It now reads what is merged:
- `buildings.columns` (F2): each column's `kind`, `front`, `side`, `yaw`, `rowId` and `ground` (a `CityGroundSlot`: kind, yaw, `y_m` 0, `top_m` 3), and its first piece above the ground (for the window sill over the ground piece, S1);
- `buildings.buildings` (F1): style, cells in row order, the L's `bend`;
- `mass.built` (C3): each column's open sides, with `faces` and `frontage`; and `mass.cells`, for the use of the cell across each open side (a `stalls` cell);
- G's assemble view (`plan3d.ts`), which draws each ground slot as a grey box. G2 replaces those boxes with H1's pieces.

It runs on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) and pins the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on).

`CityFacadesLayer.ground`, `CityGroundPiece` and `CityGroundPieceKind` are typed (`src/core/cityplan.ts`, "stage 7, H1"), with the kind, turn and placement rules in the comment above them.

Two things leave the first cut:
- **The shopfront dressing** (glass, awnings, fascia and blade signs, ATMs: `dressBlock`'s rules; R4 to R6; M8's dressing half) moves to **H1b**, which dresses H1's pieces.
- **The drawing** is **G2**'s, a renderer section, because a section has one owner.

**Pre-check first** (CLAUDE.md: this section adds readings and one rule). Before the builder starts, the `pipeline-designer` ("pre-check 070 H1", on `goal/city-style`) measures on the 20 named runs, with a probe outside the repo:
- the readings below;
- M1, M2, M6, G1 and the sill checks at the thresholds here;
- criterion 7's numbers;
- from the converted GLB, what no table has yet: `Apartment_Door_Corner_01` and `_02`'s body insets (`BODY_M`'s ground rule), their second window face (`OPEN_SIDE_MEASURED`'s method), their door sills (`measureDoor`), and every ground key's height (its bounds).

If it does not report "holds", its note goes to Josh before any builder is spawned.

**Pre-check done (20 Nov 2026, the pipeline-designer, at 9f711b6).** It did not hold, for three reasons: (A) S1 at 0 gap left no shop corner; (B) six ground keys are deeper than M2 allows; (C) 58 quiet buildings on ring 2 have no door place. Josh answered its three questions (Q21), and S1, D1, D4 and the new D5 below are written to his answers. D2, D3 and the walk at y 0 held as written.

**Which criteria are moves and which are new** (for the pre-check):
- **Moves of existing rules, numbers unchanged:**
  - The ground keys, as `STACK_STYLES` lists them: `SHOPS` (with `Shop_03` over two bays), `DOORS` and `SHOP_CORNERS`. They are picked by hash as `assembleStack` picks them: a shop per column; `Shop_03` over two free columns, else a single; one residents' door per building, by hash among its mid columns, never in a corner.
  - `BODY_M`'s ground insets and the manifest's bounds, as typed-in data.
  - Rule 1: the body on the cell.
  - Rule 7: the forced turn, and its ground piece (a shop corner where either open side is a street or park edge, else the residents' corner door).
  - Rule 9 and M8's piece half: no shop on a quiet frontage; one door per quiet building (with D1's no-door case, Q21 answer 3).
  - R3, as `citymetrics` counts it: every street ground bay is a shop, a shop corner or its building's one door, and a building has at most one door.
  - M1 at `WALL_JOINT_TOL_M` (0.02). M2 at 0.02 (10.00 m for `Shop_03`). Both with D5's back allowance for the six deep keys (Q21 answer 2). G1 at `OVERLAP_MAX_M` 0.6, `RECESS_MAX_M` 0 and `FRONTAGE_TOL_M` 0.01, on the ground pieces' open faces.
  - 062's door numbers: `DOOR_SILLS`, `SILL_MAX_M` 0.15, `SILL_UNDER_M` 0.05, `LIFT_CLEAR_M` 0.05, and 058's `WINDOW_SILL_M`.
  - No door behind a stall (Josh's ruling 2, 19 Nov 2026: "Yes, all four").
- **New or changed (the architect's readings, for the pre-check to measure and Josh to see):**
  - **S1. Each ground piece stands at its own level** (criterion 3; one new rule). The old path sank a whole stack by its ground row's deepest sill, floors and all, then lifted each ground piece back (062 B, `stackLift`). On the pipeline, stage 5's frame is fixed: the slot runs from 0 to `top_m` (3), the first floor stands at 3, and nothing is sunk. Stage 7 cannot move stage 5's pieces (R-1). So each ground piece's `y_m` is the value nearest `-sill` (its door at the walk, y 0) inside a window where:
    - its door is from `SILL_UNDER_M` below the walk to `SILL_MAX_M` above it (062's numbers);
    - its top (`y_m` plus its height) is at or above `top_m` less `GROUND_GAP_MAX_M`. **New: a ground piece may stop up to 0.01 m short of the first floor** (Josh, 20 Nov 2026, Q21 answer 1: "Yez, all three"; the same size as `FRONTAGE_TOL_M`). `GROUND_GAP_MAX_M` 0.01 is Decided: it is typed in the facades folder's constants, and a test may pin it;
    - its top is no higher than `top_m`, plus the first floor's lowest window sill (`WINDOW_SILL_M` of the column's first piece), less `LIFT_CLEAR_M` (062's top rule).

    A key with no door (`Shop_06`, a floor piece) stands at `y_m` 0. Where a key's window is empty on a column, it is not picked there: the next key of its kind by hash is tried. If no key of the kind is left, the stage fails, naming the kind and the cell.

    **As measured with the 0.01 gap** (the note's sections 1 and 2): `Shop_Corner_01` stands at y -0.010 (door 0.149, top 2.990). Four keys have an empty window everywhere and are never placed: `Shop_05` (sill 0.361), `Apartment_Door_02` and `Apartment_Door_Corner_02` (0.206), `Shop_Corner_02` (0.376). So every residents' door is `Door_01`, every corner door `Door_Corner_01`, every shop corner `Shop_Corner_01`. The window sills never bind. The fascia tops along a building spread by up to 0.239 m (S2). The four keys stay in the kit table (criterion 1); the stage skips them by their window, not by a list.
  - **S2. 062 B's sill band is not carried** (follows from S1). The band exists because the old stack sank as one. Here each piece has its own level, so a building's ground pieces are not held to one band. If Josh's eye wants an even fascia line, a band is a later reading.
  - **D1. A quiet building's one door** (criterion 2). Rule 7 as written gives every quiet corner a residents' corner door. On a building with two quiet corners that is two doors, against rule 9's one. D1 reads rule 9 as winning:
    - if the building has a quiet corner with no open side onto stalls, its door is a door corner, on the first such corner along the row;
    - its other quiet corners take the style's corner floor (`floorCorner`; corner pieces from the ground to the roof, rule 7, still holds);
    - otherwise its door is a residents' door, by hash among its mid columns with no open side onto stalls;
    - **otherwise it has no door** (Josh, 20 Nov 2026, Q21 answer 3: "Yez, all three"). A quiet building's **door places** are its quiet corners and its mid columns with no open side onto stalls; a building with none has no `door` or `doorCorner`, and M8's "exactly one door" reads "exactly one, or none when the building has no door place". Its mid columns take `floor` and its quiet corners `floorCorner`. The pre-check found 58 such buildings on the 20 named runs (0 to 6 a run; only seed 5, one-way off, has none), every one 2 or 3 columns on ring 2 (`row` "inner") facing a yard court, and Josh's answer was asked of those. So the case is held to ring 2: a doorless building on an `outer` row is a stage failure naming the building (the stop rule; it goes to Josh, never loosened).
  - **D2. Quiet mid ground and blind ground take the style's mid floor** (criterion 2). This is `Apartment_0n`, at `y_m` 0, with its body on the cell. Rule 9 says "windowed floor pieces in the other columns", and rule 3 gives a blind column "any floor pieces". The facades folder types these keys in itself: it cannot import the buildings folder (R-1), and the pin test ties them to `STACK_STYLES`.
  - **D3. A building's frontage is its row front's** (criterion 2). Every non-blind column of a building fronts one part side or the court, so its row front's frontage is the building's: street (street, park edge, plaza) or quiet (lane, drive, walk-through, court). A corner's ground piece still follows rule 7 by its own two open sides. So a quiet building may have a shop corner, at a strip's end, where its lane row meets a street; this is M8's exception "a corner whose other side is street". If a building's non-blind columns disagree on the row front's frontage, the stage fails, naming the building. The pre-check counts both cases.
  - **D4. The residents' corner doors, as measured** (criterion 1). `Apartment_Door_Corner_01` and `_02` are in no table yet (`STACK_STYLES`, `BODY_M`, `DOOR_SILLS`, `OPEN_SIDE_MEASURED`). The grammar's appendix gives their walls (5.00 by 5.00 m, windows on +z and -x). The pre-check measured them from `city-pack.glb` with the repo's `measureBodyPlane`, `measureOpenSide` and `measureDoor` (the note's section 1, D4); the builder types these numbers in, and the pin test re-measures them:

    | Key | Insets (front, back, -x, +x), m | Body, m | Second face | Sill, m | Height, m |
    | --- | --- | --- | --- | --- | --- |
    | `SM_Bld_Apartment_Door_Corner_01` | 0.529, 0.048, 0.529, 0.048 | 5.000 x 5.000 | -x | 0.029 | 3.000 |
    | `SM_Bld_Apartment_Door_Corner_02` | 0.058, 0.057, 0.058, 0.057 | 5.000 x 5.000 | -x | 0.206 | 3.000 |

    Both pass M2 and both have their second face on -x. `_02`'s sill puts it out of S1's window, so it is never placed (S1).
  - **D5. The deep ground pieces: front-aligned, the back may run into the building behind** (criteria 1, 3 and 4; Josh, 20 Nov 2026, Q21 answer 2: "Yez, all three"). Six ground keys are deeper than 5.00 m (body, bounds less `BODY_M`'s ground insets; the note's section 1, B):

    | Key | Body, w x d (m) | Extra depth (m) |
    | --- | --- | --- |
    | `Shop_01` | 5.000 x 5.317 | 0.317 |
    | `Shop_03` | 10.000 x 5.390 | 0.390 |
    | `Shop_04` | 5.000 x 5.270 | 0.270 |
    | `Shop_05` | 5.000 x 5.057 | 0.057 |
    | `Shop_06` | 5.000 x 5.269 | 0.269 |
    | `Shop_Corner_01` | 5.000 x 5.072 | 0.072 |

    Every other ground key and every floor key is 5.000 x 5.000. For these six only (the **deep keys**, typed as a list in the folder), M2 and M1 read:
    - **width** (across the row) within 0.02 of 5.00 (10.00 for `Shop_03`), as before;
    - **depth** from 5.00 - 0.02 to 5.00 + `OVERLAP_MAX_M` (0.6), so the extra runs no more than 0.6 m past the back edge;
    - **placement front-aligned**, not centred: the body's front plane on the column's front cell edge, centred across, so the front plane and every open side's plane lie on their cell edges within `WALL_JOINT_TOL_M`, and only the back plane stands past its edge;
    - **the cell behind is built**: the extra depth runs into the cell across the back edge (the column's `partner`), which must be a built cell. The pre-check found every one of the 26,376 street columns on the 20 named runs has a built partner (0 with an opening behind), so this is a check, not a branch: a deep key on a column whose back is an opening (`partner` null) is a stage failure, naming the cell (the stop rule).

    Any key not on the deep list is held to 5.00 by 5.00 within 0.02 as before. The deep pieces overlap the back building's ground piece inside the block, out of sight.
  - **The walk at y 0 on every open side** (S1's reference). This is tilecity3d's frame: a sidewalk's walk and a lot's surface stand at 0. The pre-check confirms that E draws the cell across every door's open side at 0 (pavement, apron, aisle, lane, drive). If one is not at 0, it reports which, before the builder starts.

0. [ ] **First, by the lead-architect (done with this re-cut, on `goal/city-style`):** `CityGroundPieceKind`, `CityGroundPiece` and `CityFacadesLayer.ground` in `src/core/cityplan.ts`, with the frontage, kind, turn and placement rules in the comment above them. No reader changes.
1. [ ] **The ground kit table** (R-6; D2, D4, D5; M2). Typed-in data in the folder, for every key the stage may place (the four that S1 never places included):
   - the keys: the six shops, the two residents' doors, the two shop corners, the two residents' corner doors, and each apartment style's mid floor and corner floor (as ground pieces);
   - for each key: its bounds (w, h, d, metres, as the manifest has them), its body insets (front, back, -x, +x), its second face for a corner key, its door sill (`DOOR_SILLS`' `sill_m`; the corner doors as D4's table), and for a floor key its lowest window sill (`WINDOW_SILL_M`, for S1's top rule);
   - the kind lists, in `STACK_STYLES`' order: each style's `base.mid`, `base.door` and `base.corner`, the two corner doors, and each style's `floor.mid` and `floor.corner`;
   - the deep keys (D5): `Shop_01`, `Shop_03`, `Shop_04`, `Shop_05`, `Shop_06`, `Shop_Corner_01`;
   - `GROUND_GAP_MAX_M` 0.01 (S1; Josh, Q21 answer 1).

   New `src/render3d/groundpin.test.ts`:
   - **Always (no GLB):**
     - every entry's insets equal `BODY_M[key]` where `BODY_M` has the key;
     - every sill equals `DOOR_SILLS[key].sill_m` where `DOOR_SILLS` has the key;
     - every corner face equals `OPEN_SIDE_MEASURED[key].open` where that table has the key;
     - every window sill equals `WINDOW_SILL_M`;
     - the kind lists equal `STACK_STYLES`';
     - `SILL_MAX_M`, `SILL_UNDER_M`, `LIFT_CLEAR_M`, `OVERLAP_MAX_M`, `RECESS_MAX_M` and `FRONTAGE_TOL_M` equal the old path's (`sills.ts`, `frontage.ts`); `GROUND_GAP_MAX_M` is 0.01 (Decided, pinned);
     - the corner doors' entries equal D4's table (insets, second face -x, sill, height);
     - **M2 with D5's allowance:** every key's body width (bounds less insets) is 5.00 m within 0.02 (10.00 for `Shop_03`); every key's body depth is at least 4.98 m; a key not on the deep list is at most 5.02 m deep; a deep key is at most 5.00 + `OVERLAP_MAX_M` (5.60 m) deep; and the keys deeper than 5.02 m are exactly the deep list (so a new deep key cannot slip in unnamed).
   - **Inside `it.skipIf(!HAVE_GLB)`**, read lazily as `facade.test.ts` does:
     - every entry's bounds equal the converted GLB's within 0.005 m;
     - the corner doors' insets (`measureBodyPlane`), second face and sill (`measureDoor`) re-measure to the table's values (D4) within 0.005 m.
2. [ ] **Frontage, kinds and keys** (rules 3, 7 and 9; D1 to D3; Vitest, on the 20 named runs).
   - Every column's slot is filled by exactly one piece. A `shopDouble` fills two consecutive mid columns of one building along its row, both on a street front, neither being the door.
   - Kind by column:
     - blind: `floor`;
     - a corner with a street or park-edge open side: `shopCorner`;
     - a quiet corner: `doorCorner` or `floorCorner` (D1);
     - a mid column of a street building: `shop`, `shopDouble` or `door`;
     - a mid column of a quiet building: `door` or `floor`.
   - Doors by building:
     - a street building has at most one door, and exactly one when it has a mid column;
     - a quiet building with a door place (D1) has exactly one `door` or `doorCorner` (M8), on the column D1 names;
     - a quiet building with no door place has none, and is on ring 2 (`row` "inner"; D1's no-door case, Q21 answer 3). The test finds at least one such building on the named runs (the pre-check found 58), so the case is exercised, not only allowed.
   - Keys:
     - each key is of its kind's list, picked by the stage's `rand` (R-3);
     - `floor` and `floorCorner` are of the building's own style;
     - `frontage` is the column's, as `cityplan.ts` defines it.
3. [ ] **Placements** (rule 1; S1; D5). From the kit table only, **front-aligned** (Josh, Q21 answer 2):
   - across the row: the body centred on the cell (a `shopDouble`'s on the midpoint of its two cells' shared edge), so both side planes lie on the cell edges;
   - front to back: the body's front plane on the column's front cell edge, so a deep key's extra depth runs back past the back edge into the partner cell (D5), and every other key's back plane lies on its back edge;
   - the turn: the column's `yaw`;
   - up: `y_m` by S1, and `door_m` = `y_m` + the key's sill (null for a key with no door). No scale.
   - A test checks one hand-worked placement per kind, a `shopDouble` at two turns, a `doorCorner` at each of the four turns, and a deep `Shop_01` at two turns (its back plane 0.317 m past the back edge, its front plane on the front edge), each pivot computed by hand from its bounds and insets.
   - A test checks one hand-worked `y_m` per S1 case: `Shop_Corner_01` at -0.010 (held by the gap, door 0.149), `Shop_02` at -0.071 (door 0.000), `Shop_06` at 0 (no door).
4. [ ] **The checks** (Vitest, on the 20 named runs). Each is a function of the layer, `buildings` and `mass`, run by the stage before it returns; a failure names the check and the cells. **Stop rule:** if one fails on a named run, the builder stops and reports (R-2). It does not loosen a rule.
   - **M1, the ground storey, front-aligned (D5):** every ground piece's front plane and two side planes lie on its cells' outer edges, within `WALL_JOINT_TOL_M`. Its back plane lies on the back edge within `WALL_JOINT_TOL_M`, except for a deep key, whose back plane stands from 0 to `OVERLAP_MAX_M` past the back edge, and only where every cell it covers has a built `partner` behind it.
   - **M6 and R9, the ground storey:** a corner kind stands only on a corner column, its measured +z and -x faces on the column's two open sides. No corner key stands on a mid or blind column.
   - **G1, the ground storey:** on every open side, the piece's body plane stands no more than `RECESS_MAX_M` + `FRONTAGE_TOL_M` behind the cell edge, and no more than `OVERLAP_MAX_M` + `FRONTAGE_TOL_M` past it.
   - **M8, the pieces:** no `shop`, `shopDouble` or `shopCorner` on a column whose open sides are all quiet. Every quiet building has exactly one door, or none when it has no door place (D1's no-door case; Q21 answer 3), and a doorless quiet building is on ring 2. The check reads the door places from `mass` (each column's open sides and the use of the cell across each), not from the layer.
   - **R3:** every ground piece on a street frontage is a `shop`, `shopDouble`, `shopCorner` or `door`. No building has more than one `door` or `doorCorner`.
   - **Sills (062, on S1):** every `door_m` is from -`SILL_UNDER_M` to +`SILL_MAX_M`; every piece's top is at or above `top_m` - `GROUND_GAP_MAX_M`; every top is at most `top_m` + the first floor's window sill - `LIFT_CLEAR_M`.
   - **No door behind a stall:** no `door` or `doorCorner` on a column with an open side onto a `stalls` cell.
   - **Failing fixtures.** Each is built from the default city's layer, typed in from the run in the test (not pinned by hash), with one thing changed:
     - a ring-2 building given a shop piece fails M8;
     - a quiet building given a second door fails M8;
     - a residents' door on a ring-2 column across from a yard court's stalls fails the stall check (on the default city's mass, with one cell across that column's open side set to `stalls` if no such column exists);
     - a ground piece set 0.05 m back from its open edge fails G1;
     - a shop corner turned a quarter off fails M6;
     - a `Shop_05` at `y_m` 0 (its door 0.361 m over the walk) fails the sill check;
     - a `Shop_Corner_01` at `y_m` -0.020 (its top 0.020 m short of the first floor, past `GROUND_GAP_MAX_M`; its door 0.139, inside the sill limits) fails the sill check on the gap alone;
     - a `Shop_03` placed by its bounds' centre fails M1;
     - a `Shop_01` placed with its body centred front to back (its front plane 0.159 m behind the front edge) fails M1;
     - a deep shop on a column whose `partner` is set to null (its back an opening) fails M1's back allowance;
     - **the no-door case, three fixtures** (Q21 answer 3):
       - a quiet building with a door place, its door replaced by `floor` (or `floorCorner`), fails M8;
       - a doorless ring-2 building, with the `stalls` cell across one of its mid columns' open side set to `aisle` (so that column is a door place), fails M8, the layer unchanged;
       - a doorless building moved to an `outer` row (its cells' `row` set to "outer" in the fixture's mass) fails M8's ring-2 hold.
5. [ ] **The picture** (R-5). One legend entry per ground kind (shop, double shop, shop corner, residents' door, corner door, floor, corner floor) on built cells, and 0 elsewhere; no points. The R-5 test, as F1's.
6. [ ] **R-1 to R-7 for `facades`** (Vitest).
   - The stage reads only `mass`, `buildings`, and the streets' `w` and `h` (for the picture). A grep test does what F1's does.
   - R-4: the facades digest is pinned on the four pin cities. The streets, land, mass, edge and buildings digests are unchanged, and the test double leaves them equal.
   - R-7: 6 x 6 seed 1 ends `ok`.
   - `src/city/stages.ts` adds the facades stage to `BUILT_STAGES` (one line, as F1 did for buildings). Stage 6 (`circuit`) is still not built: the runner runs the stages it is given in order and skips it. `run.test.ts`'s "not built" example, `"circuit"`, still holds and is not edited.
7. [ ] **The numbers** (reported, not asserted; its own report file). For each of the 20 named runs:
   - ground pieces by kind and by key;
   - buildings, street and quiet; doors per building; street buildings with no door; quiet buildings whose door is a corner and whose is mid; `floorCorner`s;
   - columns the stall rule kept a door off; quiet buildings with no door place (D1's no-door case), by row;
   - per key, its S1 level, `door_m` and top, and the columns where its window was empty; the keys never placed (expected: the four S1 names);
   - deep pieces by key, and the largest back overrun (D5; expected at most 0.390);
   - the spread of fascia tops along each building (S2);
   - ground pieces in all (G2's draw-call estimate).

   For the outside cities that reach stage 7: whether it is ok, and its failure if not.
8. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=facades` shows the picture: shops along the streets, doors and floors on the courts and lanes, corner doors at quiet corners. `?view=3d&city=plan&stage=assemble` and `?view=3d&city=tiles` look as on `goal/city-style`; the assemble view runs to `buildings` until G2.
9. [ ] R-8 to R-11. The builder runs these tests: `npx vitest run --maxWorkers=2 src/city/facades/ src/city/pipeline/run.test.ts src/render3d/groundpin.test.ts src/render3d/planview.test.ts`, and one `npx tsc --noEmit`. The main session's gate is the full `npm run gate`.

- **Files:** new `src/city/facades/`; `src/city/stages.ts` (the one line, criterion 6); new `src/render3d/groundpin.test.ts` (the one render3d file this section adds).
- **Must not:**
  - `src/core/` (criterion 0 is the architect's);
  - every other `src/city/` folder (`buildings/` is read through the layer, never imported);
  - `src/city/pipeline/` (`run.test.ts` is run, not edited);
  - every other `src/render3d/` file (`sills.ts`, `facade.ts`, `escapes.ts`, `stacks.ts`, `frontage.ts` and their tests are read only, and `plan3d.ts` is G2's).
- **Interfaces:** criterion 0. G2 reads `facades.ground` (each piece's `placement` and `building`); H1b reads each piece's `kind`, `frontage`, `cells` and `placement`. No new dependency.
- **Adds a rule and readings.** S1's gap rule (a ground piece's top at most `GROUND_GAP_MAX_M` 0.01 short of the first floor) is new, and S2 drops 062 B's band on the pipeline. D1 to D5 read the grammar where it is silent or in conflict; D1's no-door case and D5's back allowance change how M8 and M1/M2 are read on the ground storey. All three are Josh's (Q21: "Yez, all three"). No existing number changes (`SILL_MAX_M` stays 0.15). The pre-check is done; the builder starts on this text.
- **Heavy:** the named-run tests build the 10 named cities, both ways, once each, through a module cache, with a 120 s timeout. Criterion 7's report has its own file.

### H1b · Stage 7, Facades: shopfront dressing (facades, pure). Branch `ticket/070h1b-facades-shopfronts`
**Branch.** Cut from `goal/city-style` at the commit of this re-cut or later (H1 and F3 are merged). It runs alongside G2: G2 edits only `src/render3d/plan3d.ts` and `plan3d.test.ts`, and H1b edits neither. **The pre-check comes first** (below): no builder is spawned until it reports "holds", or Josh has answered its note. **Done:** it did not report "holds", Josh has answered its note (Q22), and this text is re-cut to his answer (21 Nov 2026, at 5d84083), so the builder may start on it.

**Josh's words (21 Nov 2026, in chat; Q22).** Asked the H1b pre-check's three questions (`docs/design/070-H1b-precheck.md`, section 4), each as recommended (1: shop dressing, awnings, signs and ATMs, may reach over the pavement as on the tile city, the grammar's 0.6 m trim limit kept for the buildings' own trim; 2: corner shops on a street and a lane keep their wrap-round glass and the L awning on the lane side too; 3: neighbouring awnings may overlap by up to about 10 cm so all five awning kinds stay, with no L awning beside an L awning), he answered: "Yes all three". The re-cut writes in the note's section 5 for "All three yes": T1 and X1 stand as written and quote him; W1 gains LG; W2 and X2 are not taken.

**Goal.** The pipeline's shops are dressed as `city=tiles`' are: glass in every shop that has a glass key, awnings, fascia and blade signs on the street fronts, and ATMs beside street doors; nothing on a quiet front. Nothing changes in 3D until J draws the dressing. The flat picture of the `facades` stage gains the dressing as points.

**First cut (20 Nov 2026, split out of H1).** Glass, awnings, fascia and blade signs and ATMs (`dressBlock`'s rules); R4 to R6; M8's dressing half. The re-cut below replaces it.

**Re-cut (21 Nov 2026, the lead-architect, against 455db33, on Josh's "Yes, start both").** It reads what is merged:
- `facades.ground` (H1): each ground piece's `kind`, `building`, `cells`, `frontage` and `placement` (its key, pivot, turn and level `y_m`);
- `buildings.columns` (F2): each column's `kind`, `front`, `side`, `yaw`, `rowId`, `ground.top_m`, its first piece above the ground (the host of a sign over an awning) and its roof piece (a sign's height cap);
- `buildings.rows` and `buildings.buildings` (F1): the rows, their buildings in order, and each building's cells;
- `mass.built` and `mass.cells` (C3): each column's open sides with their `frontage`, and the openings between buildings of a row;
- the tile city's dressing as `city=tiles` runs it today: `dressBlock` and `dressTown` in `src/render3d/dressing.ts` (the glass, awning, sign and ATM blocks only), R4 to R6 in `src/render3d/citymetrics.ts` (`cityMetrics`' per-block count and `evaluateCity`), and the tile city's floor `TILE_CITY_R6_MIN` (`src/render3d/tilecity.ts`).

The type is written: `CityDressingKind`, `CityDressingPiece` and `CityFacadesLayer.dressing` (`src/core/cityplan.ts`, "stage 7, H1b"), with the block, run, frame and face rules in the comment above them. `dressing` is optional, as `CityEdgeLayer.ground` was, so H1's fixtures and G2's type-check unchanged; from H1b the stage always writes it. `CityFacadesLayer.ground` and `CityGroundPiece` do not change, so G2 reads exactly what it read.

It runs on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on; `NAMED` in `src/city/facades/testcities.ts`) and pins the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on).

**What `dressBlock`'s words mean on cells.**
- **B1. A block is a building.** `dressBlock` dresses one stack on one lot: on `city=tiles` that is one packed terrace block, of one style. Its pipeline twin is one `CityBuilding` (2 to 4 columns, or the L). So "one awning key for the block" (and R5's "no mixed-awning building"), "at most one blade sign", "no fascia key twice" and "at most one ATM per block" are per building. The `lot.key` every `dressUnit` call is salted with becomes the building's id, through the stage's own `rand` (R-3; a unit float is `finalise(rand(...)) / 2^32`, a helper the builder adds to `hash.ts`).
- **A bay** is a street ground piece of the building, in row order: a `shop` or `shopDouble` (`dressBlock`'s "shop"; a `shopDouble` is one bay over two columns and counts against its first), a `shopCorner` ("corner"), and, for the ATM only, a `door` on a street frontage ("door"). A quiet building's pieces are not bays, except a `shopCorner` (D3's strip end), which is a corner bay under X1.
- **B2. A run is a chain of row neighbours.** On `city=tiles` a terrace run is one street side's row of blocks, and it ends at a plaza, a parking lot or the next corner (`TerraceRun.endAbuts`). Its pipeline twin is a maximal stretch of consecutive buildings of one `CityBuildingRow` with no opening between them (F1's "row neighbours"), taken in the row's `buildings` order. `ATM_PER_RUN` (2) is per run, threaded in that order as `dressTown` threads `RunUsed`. `RunUsed`'s billboard and novelty caps are H3's, not H1b's.
- **A column's width** (`StackColumn.w`, which bounds what fits in a bay): see W1.

**Which criteria are moves and which are new** (for the pre-check):
- **Moves, numbers unchanged:**
  - The keys: `SHOP_GLASS`, `AWNINGS`, `AWNING_CORNER`, `SIGNS_FASCIA`, `SIGNS_BLADE`, `ATMS`. A shop's glass key is its own key plus `_Glass`, where `SHOP_GLASS` has it (`Shop_06` has none).
  - The chances and caps: `P_AWNING` 0.75, `P_SIGN` 0.6, `P_BLADE` 0.25, `P_ATM` 0.3, `ATM_PER_RUN` 2, `DRESS_PER_BAY_MAX` 6.
  - The attachment numbers: `GLASS_INSET_M` 0.05, `GLASS_SILL_M` 0.3, `GLASS_WRAP_DEPTH_M` 1, `AWNING_BASE_M` 2.85, `SIGN_BASE_M` 2.85, `AWNING_KERB_M` 0.3, `ATM_Y_M` 0.6, `ATM_PIER_M` 0.35, `BLADE_INSET_M` 0.1.
  - `dressBlock`'s order and choices, block by block:
    - glass on every bay that has a glass key;
    - the block's one awning key: the key of `AWNINGS`, tried in its hashed rotation, that fits the most wanting bays (a bay wants one by `P_AWNING`);
    - the L awning on a wanting corner bay where it fits, else the block's key;
    - at most one blade sign, on an awning-less bay, by `P_BLADE`;
    - a fascia sign on each other bay by `P_SIGN`, no key twice in a block, standing on the awning's top (or the glass's, or `SIGN_BASE_M`);
    - an ATM beside one door by `P_ATM`, its side by hash, under `ATM_PER_RUN`.
  - `onFace`'s rule: a front-face piece's back lies on the front face (bounds) of the piece behind it at its base height (`hostAt`: the ground piece below `top_m`, the first floor piece from `top_m` up). It is centred on its bay and clamped inside it. A piece wider than its bay, or a sign whose top would pass its column's roof, is not placed. Glass: its back `GLASS_INSET_M` inside the shop's front face; a wrap pane (deeper than `GLASS_WRAP_DEPTH_M`) is centred on the corner shop's footprint.
  - R4 at `CITY_CHECK.R4` 1; R5 at `CITY_CHECK.R5` 0.55 with no mixed-awning building; R6 at `TILE_CITY_R6_MIN` 0.45 (Josh, 18 Nov 2026: "Lower it to 0.45 (Recommended)") and `CITY_ATM_BLOCKS_MIN` 0.15. Each is counted as `cityMetrics` counts it, over street frontages only, as the grammar's rule 9 says ("R3 to R6 keep their thresholds and count street frontages only").
  - M8's dressing half (grammar rule 9: "No shop, glass, awning, fascia sign or ATM stands on a quiet frontage").
- **New or changed (the architect's readings, for the pre-check to measure and Josh to see):**
  - **B1 and B2** above: the two words on cells.
  - **W1. A column's width is its first floor piece's bounds width**, as `assembleStack` lays its columns (`floorMid.w`, or the corner floor's on a corner), centred on its cell. A bay spans its columns so measured (a `shopDouble`: its first column's left to its second's right).
    - This ports what fits unchanged: `Shop_Cover_04` (5.104 m) fits a style 2 or 3 bay, and the L awning (5.394 m) only a style 3 corner (5.491 m), as on `city=tiles`.
    - But the pipeline's columns stand 5.00 m apart, not their bounds' width apart. So two neighbouring bays' spans overlap by half of each width's excess over 5.00 m (0.39 m between a style 3 corner and its mid neighbour), and two neighbouring pieces may too.
    - ~~The other reading, **W2**, spans each column on its cell's edges (5.00 m): no overlap, but `Shop_Cover_04` and the L awning never fit, and every corner shop takes a flat awning. The pre-check measures both.~~ Not taken (Josh, 21 Nov 2026, Q22 answer 3: "Yes all three").
    - **Neighbouring awnings may overlap by up to about 10 cm, so all five awning kinds stay** (Josh, 21 Nov 2026, Q22 answer 3: "Yes all three"). The pre-check measured the worst same-height overlap left after LG at 0.104 m (`Cover_04` beside `Cover_04`, about 4 a city). The overlap is reported (criterion 7), not checked. If the builder's largest same-height overlap after LG is over 0.11 m, that is past what Josh said yes to: the builder stops and reports it (R-2), and it goes to Josh.
    - **LG. No L awning beside an L awning** (Josh, Q22 answer 3, the guard asked with it). The pre-check found 126 pairs of `Shop_Cover_05` side by side along one street face, overlapping by up to 0.419 m at the same height. So: corner bays are dressed in B2's order (each row's buildings in order, each building's columns in order), and a wanting corner bay whose neighbouring column (in its own building, or the row neighbour's column it abuts) already carries an L awning does not take one. It takes the building's flat key instead where that fits, as `dressBlock` falls back when the L does not fit, else no awning. The pre-check measured LG at 1,409 of 1,534 L awnings kept, no L pair left, and R5 0.680 to 0.744.
  - **X1. Mixed corners** (M8's corner exception; Josh, 21 Nov 2026, Q22 answer 2: "Yes all three", to "corner shops on a street and a lane keep their wrap-round glass and the L awning on the lane side too"). So M8's corner exception covers the corner's own glass and its L awning, not only the shop piece. A shop corner may have one street and one quiet open side: a lane, drive or walk-through beside it, or, on a quiet building, D3's strip end. The ticket's M8 row excepts "a corner whose other side is street" for pieces and dressing; the first cut said "only on its street face". X1 reads it so:
    - a **wrap** (the corner's own glass, `Shop_Corner_0n_Glass`, and the L awning) stands on both faces, as the shop corner piece itself does under H1's M8 exception: it is one piece and cannot be split;
    - a **single-face piece** (a flat awning, a fascia or blade sign) stands only on its column's front (the piece's own +z, rule 7's forced turn), and only where that front is a street side. A corner whose front is quiet gets none: nothing is turned onto its other face. The bay still counts in R5 and R6.
    - ~~The other reading, **X2**, the first cut's, puts nothing on a quiet face: no glass and no L awning on a mixed corner, and R4 then counts those corners out. The pre-check counts the mixed corners, both ways.~~ Not taken (Q22 answer 2). R4 counts every mixed corner in, as written. The pre-check found 2,894 mixed corners on the 20 runs (118 to 174 a run), half with a quiet front.
  - **T1. Dressing is not trim** (Josh, 21 Nov 2026, Q22 answer 1: "Yes all three", to "shop dressing (awnings, signs, ATMs) may reach over the pavement as on the tile city; the grammar's 0.6 m trim limit stays for the buildings' own trim"). Rule 2's "awnings, signs" stop counting as trim for the 0.6 m limit; L edits rule 2's text. The pre-check found every piece within T1's limits (the furthest, `Shop_Cover_03`, 4.058 m, against 4.70 m). The grammar's rule 2 names awnings and signs as trim that "may reach up to `OVERLAP_MAX_M` (0.6 m)". Its rule 9 keeps "16.5 unchanged" on street fronts, where an awning reaches up to 3.5 m over the pavement and stops `AWNING_KERB_M` short of the kerb. The two disagree. T1 reads rule 2's trim as a piece's own model beyond its body (cornices, sills, the shops' fascias), and holds the dressing to 16.5's reach:
    - a front-face piece's outer face at most `CELL_M` (the 5 m pavement band; the tile city's run frame `{ wall_m: 0, kerb_m: 5 }`) past its column's front cell edge;
    - an awning's at most `CELL_M` - `AWNING_KERB_M`.
    - The stage reads no edge layer for it (H1's R-1 grep test stands), so the reach is the same on a street, a park edge and a plaza.
  - **L1. The dressing rides with its ground piece.** Every piece is worked out with the ground piece's base at 0 (`dressBlock`'s frame), then raised by the ground piece's `y_m` (S1: 0, or a few centimetres under it), as 062 B's `liftDressing` raised the dressing of a lifted ground piece. A sign over an awning is still hosted on the first floor piece, whose face does not move.
  - **E1. No fire escape yet.** `dressBlock` decides the escape first and keeps its column plain (no awning, no sign). Escapes are H2's, after H1b. So H1b dresses every bay as plain, and H2's re-cut says how its escape column and H1b's dressing meet (H2 runs in the same stage and may order the two; R5 and R6 are then measured again). The pre-check's estimate of that near miss is in H2's criterion 1 (21 Nov 2026).
  - **C1. `DRESS_MAX` is not applied.** `dressTown` stops dressing a town past 6,000 pieces. H1b places only ground dressing; the cap is a whole-town budget for H3 (roof props) and J to settle. The report gives each run's count beside it.
  - **A1. R6's ATM share is counted over street buildings** (a building whose frontage, D3, is street), the grammar's "count street frontages only". On `city=tiles` every block faced a road, so its count was all blocks. A quiet building has no street door and may carry no ATM (M8).

**Pre-check first** (CLAUDE.md: this section adds readings). Before the builder starts, the `pipeline-designer` ("pre-check 070 H1b", on `goal/city-style` at this commit) measures on the 20 named runs, with a probe outside the repo and the fixture bounds of `src/render3d/dressing.test.ts`:
- R4, R5 (with the mixed-awning count) and R6 (the signed share and the ATM share), with W1 and X1 as written, then with W2 and with X2 in turn;
- the overlaps W1 makes: pairs of dressing pieces of neighbouring columns whose plan boxes overlap, and by how much;
- the mixed corners (X1): how many, how many have a quiet front, and what X2 would take off R4;
- the furthest reach of any piece past its cell edge (T1), by key;
- pieces per run by kind and in all, against `DRESS_MAX` (C1);
- the ATM share over street buildings and over all buildings (A1), and the runs (B2) that reach `ATM_PER_RUN`.

If it does not report "holds", its note goes to Josh before any builder is spawned. The architect re-cuts on his answer.

**Pre-check done (21 Nov 2026, the pipeline-designer, at ae39d10).** It did not report "holds": the numbers pass on 20 of 20 runs with W1 and X1, but T1 and X1 change how grammar rules 2 and 9 read, and W1's overlaps are a look for Josh. He answered its three questions (Q22), and T1, X1, W1 (with LG) and criteria 2, 4 and 7 are written to his answers. B1, B2, L1, E1, C1 and A1 held as written.

0. [ ] **First, by the lead-architect (done with this re-cut, on `goal/city-style`):** `CityDressingKind`, `CityDressingPiece` and `CityFacadesLayer.dressing` in `src/core/cityplan.ts`. No reader changes.
1. [ ] **The dressing table** (R-6). Typed-in data in the folder (a new `dresskit.ts`):
   - the six key lists and every number listed under "Moves" above, as copies;
   - each dressing key's bounds (w, h, d, metres; the 22 keys of the six lists), as `src/render3d/dressing.test.ts`'s fixture has them;
   - for the hosts: each first floor key's bounds width (W1) and front inset (`BODY_M`'s `front`), for the nine keys of `FIRST_FLOOR_SILL_M`. The ground pieces' own come from H1's `GROUND_KIT`.

   New `src/render3d/shopfrontpin.test.ts`:
   - **Always (no GLB):**
     - each key list equals `dressing.ts`' list;
     - each number equals `dressing.ts`'; `CITY_CHECK.R4`, `CITY_CHECK.R5`, `CITY_ATM_BLOCKS_MIN` and `TILE_CITY_R6_MIN` equal the old path's;
     - each host width and front inset equals the floor piece's `BODY_M` entry and its bounds in the old path's tables;
     - `DRESS_NUDGE_M` and `DRESS_FRONTS` are empty and `BUILDING_FRONTS` names none of the 22 keys, so every key's own front is +z (the turn rule in `cityplan.ts`).
   - **Inside `it.skipIf(!HAVE_GLB)`**, read lazily as `groundpin.test.ts` does: every dressing key's bounds equal the converted GLB's within 0.005 m.
2. [ ] **The dressing** (B1, B2, W1, X1, T1, L1, E1, A1; Vitest, on the 20 named runs). The stage writes `facades.dressing`, in the order `cityplan.ts` gives, after `ground`:
   - every shop bay whose key has a glass key has exactly that glass, and no other piece has glass;
   - every building's flat awnings are of one key of `AWNINGS`; an L awning stands only on a corner bay;
   - no L awning stands on a column beside a column that carries one, in its own building or across a row neighbour (LG; Josh, Q22 answer 3); a corner bay LG turns away takes the building's flat key where it fits;
   - a building has at most one blade sign, never on a bay with an awning; no fascia key twice in a building; no bay has two signs;
   - an ATM stands only beside a `door` on a street frontage: one at most per building, `ATM_PER_RUN` at most per run (B2);
   - every choice is the stage's `rand` (R-3), salted with the building's id where `dressBlock` salts with `lot.key`; the same city twice gives the same layer;
   - `ground` is exactly H1's: on the four pin cities, `digestOf({ stage: "facades", ground })` equals H1's pinned facades digest.
3. [ ] **Placements** (`onFace`, the glass and the wraps, ported; W1, T1, L1). From the tables only:
   - in the host column's own frame, then turned by its `yaw` about the cell and raised by the ground piece's `y_m`; no scale;
   - a front-face piece's back plane on its host's bounds front within 1e-6 m (glass: `GLASS_INSET_M` inside it), centred on its bay across and clamped inside the bay's span (W1);
   - a wrap's pivot on its corner shop's pivot;
   - no piece's outer face more than `CELL_M` past the front cell edge, and no awning's more than `CELL_M` - `AWNING_KERB_M` (T1); no sign's top over its column's roof piece's `y_m`.
   - A test checks hand-worked placements, each pivot computed by hand from the bounds and insets:
     - a `Shop_01_Glass` and a `Shop_Cover_03` on a `Shop_01`, at two turns;
     - a fascia sign on an awning's top (hosted on the first floor);
     - a blade sign on an awning-less bay;
     - an ATM beside a `Door_01`, on each side;
     - a `Shop_Corner_01_Glass` wrap at each of the four turns;
     - one piece on a ground piece at `y_m` -0.071 (L1).
4. [ ] **The checks** (Vitest, on the 20 named runs). Each is a function of the layer, `buildings` and `mass`, run by the stage before it returns; a failure names the check and the cells. **Stop rule:** if one fails on a named run, the builder stops and reports (R-2). It does not loosen a rule.
   - **R4:** every shop bay whose key has a glass key carries it; the share is 1.
   - **R5:** the share of shop bays (`shop`, `shopDouble`, `shopCorner`, each once) with an awning of `AWNINGS` or `AWNING_CORNER` on its column is at least 0.55; no building has two keys of `AWNINGS`.
   - **R6:** the share of shop bays with a sign (fascia or blade) on its column is at least `TILE_CITY_R6_MIN` 0.45; the share of street buildings with an ATM is at least `CITY_ATM_BLOCKS_MIN` 0.15 (A1).
   - **M8, the dressing:** no piece on a column with no street open side; every single-face piece's `face` is its column's `front` and a street side; a wrap only on a `shopCorner` (X1).
   - **The caps:** at most `DRESS_PER_BAY_MAX` pieces a column; one ATM a building and `ATM_PER_RUN` a run; one blade sign a building.
   - **LG:** no two L awnings on neighbouring columns (Q22 answer 3).
   - **Attachment:** criterion 3's planes, reach and roof cap, as a check.
   - **Failing fixtures.** Each is built from the default city's layer (6 x 6 seed 1, one-way on), typed in from the run in the test (not pinned by hash), with one thing changed:
     - an awning on a ring-2 building's door fails M8 (the first cut's fixture);
     - a fascia sign on a quiet building's mid column fails M8;
     - an ATM beside a quiet building's door fails M8;
     - a flat awning on a mixed corner whose front is quiet fails M8 (X1; with one corner's open side set to `lane` in the fixture's mass if the default city has no such corner);
     - one shop's glass removed fails R4;
     - one building's second awning changed to another key of `AWNINGS` fails R5;
     - every awning removed fails R5's share; every sign removed fails R6's; every ATM removed fails R6's ATM share;
     - two L awnings side by side fail LG: an L awning added on the column beside one that carries one (on a style 3 corner pair if the default city has one beside another; else on a typed-in pair of neighbouring style 3 corners, as the X1 fixture types its lane);
     - a third ATM on a run that has two fails the run cap; a second ATM on one building fails the building cap;
     - an awning moved 0.6 m further out fails attachment (its back no longer on its host's face), and an awning moved 1.2 m further out fails the reach (T1) by name; a sign moved 0.1 m off its host's face fails attachment.
     - **Reworded (21 Nov 2026, the lead-architect; done, as built).** This line first read "an awning moved 0.6 m further out fails the reach (T1)". That fixture cannot fail the reach: the furthest awning reaches 4.058 m, and 4.058 + 0.6 = 4.658 m is still inside the awning limit `CELL_M` - `AWNING_KERB_M` (4.70 m). The builder used 0.6 m for attachment and 1.2 m for the reach (`dressfixtures.test.ts`, "an awning moved 0.6 m further out fails the attachment ..."), and the text above now says so. No code changes for it.
5. [ ] **The picture** (R-5). The facades picture's cells are H1's, unchanged. It gains points: one per awning, fascia sign, blade sign and ATM (legend entries "awning", "fascia sign", "blade sign", "ATM"), at the piece's `x_m`, `z_m`; glass has no point. The R-5 test, as H1's, also checks that every point's legend matches its piece.
6. [ ] **R-1 to R-7 for `facades`** (Vitest).
   - The stage still reads only `mass`, `buildings`, and the streets' `w` and `h`; H1's grep test stands unedited and covers the new files.
   - R-4: the facades digest is re-pinned on the four pin cities. It changes, because `dressing` is new; criterion 2 holds that `ground` did not. The streets, land, mass, edge and buildings digests are unchanged, and the test double still leaves them equal.
   - R-7: 6 x 6 seed 1 ends `ok`.
7. [ ] **The numbers** (reported, not asserted; a new `dressreport.test.ts`). For each of the 20 named runs:
   - shop bays; R4, R5 and R6's shares and the ATM share;
   - pieces by kind and by key; awning keys per building;
   - L awnings placed, corner bays that fell back to a flat key, and of those the ones LG turned away;
   - mixed corners, and those with a quiet front (X1);
   - overlapping neighbour pairs and the largest overlap (W1), by key pair, and how many of them overlap at the same height: kept for J's screenshots, and the 0.11 m stop in W1;
   - the furthest reach, by key (T1);
   - runs, and the runs at `ATM_PER_RUN` (B2);
   - dressing pieces in all, against `DRESS_MAX` (C1).

   For the outside cities that reach stage 7: whether it is ok, and its failure if not.
8. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=facades` shows the picture with the dressing points along the street fronts and none on courts or lanes. `?view=3d&city=tiles` looks as on `goal/city-style`.
9. [ ] R-8 to R-11. The builder runs these tests only: `npx vitest run --maxWorkers=2 src/city/facades/stage.test.ts src/city/facades/place.test.ts src/city/facades/fixtures.test.ts src/city/facades/report.test.ts src/city/facades/dress.test.ts src/city/facades/dressfixtures.test.ts src/city/facades/dressreport.test.ts src/city/pipeline/run.test.ts src/render3d/shopfrontpin.test.ts src/render3d/groundpin.test.ts src/render3d/planview.test.ts`, and one `npx tsc --noEmit`. Not `plan3d.test.ts` (G2's, in flight). The main session's gate is the full `npm run gate`.

- **Files:** `src/city/facades/`: new `dresskit.ts`, `dress.ts`, `dresscheck.ts`, `dress.test.ts`, `dressfixtures.test.ts`, `dressreport.test.ts`; edits to `stage.ts` (write `dressing`, run its checks, the picture's points), `stage.test.ts` (the re-pin, the picture), `hash.ts` (the unit float) and `index.ts`. New `src/render3d/shopfrontpin.test.ts` (the one render3d file it adds).
- **Must not:**
  - `src/core/` (criterion 0 is the architect's);
  - every other `src/city/` folder, and `src/city/stages.ts` (the facades stage is already in `BUILT_STAGES`);
  - `src/city/pipeline/` (`run.test.ts` is run, not edited);
  - `src/render3d/plan3d.ts` and `plan3d.test.ts` (G2's, in flight); `groundpin.test.ts` (H1's: run, not edited); every other `src/render3d/` file (`dressing.ts`, `citymetrics.ts`, `tilecity.ts`, `models3d.ts` and their tests are read only);
  - H1's ground pieces: H1b adds `dressing` and changes nothing in `ground` (criterion 2).
- **Interfaces:** criterion 0. J reads `facades.dressing` (each piece's `placement`); H2's re-cut reads it for E1. G2 reads nothing new. No new dependency.
- **Adds readings; changes no number.** Every key list, chance, cap and threshold is the tile city's, copied and pinned. B1, B2, W1, X1, T1, L1, E1, C1 and A1 are the architect's readings of where `dressBlock`'s words fall on cells. X1 reads M8's corner exception for dressing, T1 settles a disagreement between the grammar's rules 2 and 9, and A1 scopes R6's ATM count as rule 9 says. So the pre-check comes first. **Done (Q22):** T1, X1 and W1 with LG are Josh's ("Yes all three"); no approved number, merged section or digest pin moves.
- **Heavy:** the named-run tests build the 10 named cities, both ways, once each, through `testcities.ts`' module cache, with a 120 s timeout. Criterion 7's report has its own file.

### G2 · Assemble: ground storeys drawn (renderer). Branch `ticket/070g2-plan3d-ground`
**Branch.** Cut from `goal/city-style` once H1 is merged (every ground slot has a `CityGroundPiece`). It may run alongside H1b.

**Goal.** At `?view=3d&city=plan&stage=assemble`, the grey ground boxes become the shops, doors, corners and floor pieces that stage 7 placed, in each building's colourway. Josh walks streets with shopfronts and courts with doors.

**Why a section of its own (the architect's call, 20 Nov 2026).** The pieces need the renderer to show them. The change is plan3d-only and small, but H1 is the facades agent's and a section has one owner (Cutting rules). The renderer also has to load two keys that no stack style names, so this is its own section, after H1.

G2 only draws. It adds no rule, check or number, so it skips the pre-check (CLAUDE.md). The stop rule is G's: where the layer does not say what to draw, the builder commits, stops and reports the cells (`PlanStopError`). The gap is a re-cut of H1, never a choice made in `src/render3d/`.

1. [ ] **The run goes to stage 7** (Vitest). `createPlanAssembleRenderer3d` runs `runCity(..., "facades")` where it ran `"buildings"`. A run that fails at `facades` draws nothing and shows that stage and its reason (`planFailureText`), as E does.
2. [ ] **Ground pieces from placements only** (`plan3d.ts`, Vitest).
   - The draw list gains every `CityGroundPiece`, once each, with the colourway of its own building, whether in `planPieceDraws` or in a sibling list the builder names.
   - `plan3dGroups` adds one wrapper per ground piece, named `piece:<key>`, to its building's group. It is placed, turned, scaled, cloned and painted exactly as G's floor pieces are.
   - **The grey boxes** (still one `InstancedMesh`):
     - a column whose ground piece and above-ground pieces all have a loaded root has no grey box;
     - a column whose ground piece's root did not load has the ground-slot box (both columns of a `shopDouble`);
     - G's whole-column fallback is unchanged: when any of a column's pieces above the ground lacks a root, the column is one grey box and its ground piece is not cloned.
   - Tests, with stub roots and no GLB:
     - every ground wrapper's world position, turn and scale equal its placement's, at the four turns;
     - a `shopDouble` is one wrapper over two cells;
     - with one ground key's root missing, only the slots that use it are grey.
3. [ ] **The keys load.** `planKeys()` gains `city-pack:SM_Bld_Apartment_Door_Corner_01` and `_02`. No stack style names them, so `allStackKeys()` does not bring them. If `sharedTileModels` cannot load a key from its name alone, the builder stops and reports: a re-cut then adds `models3d.ts`, plan path only.
4. [ ] **Draws only** (Vitest, on the 20 named runs).
   - Every layer's digest (streets to facades) is the same before and after `plan3dGroups`.
   - Every `CityGroundPiece` is drawn exactly once. G's counts hold for everything else.
   - Failing fixtures, from the default city's run:
     - the exactly-once check fails with one ground piece dropped, and with one listed twice;
     - `plan3dGroups` throws `PlanStopError`, naming the cell, on a facades layer missing one column's ground piece.
5. [ ] **Draw calls** (reported, not capped). Inside `it.skipIf(!HAVE_GLB)`, on 6 x 6 seeds 1 and 3, the builder reports the building calls after G and after G2, and the ground pieces by kind. The renderer's console line gains the ground pieces. No cap is raised or added. The remedy for the frame rate is instancing, a later ticket (Josh, 20 Nov 2026, Q20: "instancing later").
6. [ ] **Nothing else changes.** `?view=3d&city=tiles` draws as on `goal/city-style`. `tilecity3d.ts`, `models3d.ts`, `renderer.ts`, `planview.ts` and their tests are not edited. `planview.test.ts` and `tilecity3d.test.ts` pass unedited. The ladder is unchanged.
7. [ ] (Main session, in the browser, then phone-sized screenshots sent to Josh: street camera, day and night, 6 x 6 seeds 1 and 3, one-way on; G's three street-camera views.) The screenshots should show:
   - shops along every street front;
   - one door per building;
   - the corner doors at quiet corners;
   - no shop on a court or lane;
   - the doors meeting the walk;
   - no grey box left once the models load.
8. [ ] R-8, R-10 and R-11. Tests: `npx vitest run --maxWorkers=2 src/render3d/plan3d.test.ts src/render3d/planview.test.ts src/render3d/tilecity3d.test.ts`, and one `npx tsc --noEmit`.

- **Files:** `src/render3d/plan3d.ts`, `src/render3d/plan3d.test.ts`.
- **Must not:** `src/city/**` and `src/core/` (read only); every other render3d file (as G's list).
- **Interfaces:** nothing new in `src/core/`. G2 reads `CityFacadesLayer.ground` as H1 leaves it. No new dependency.
- **Adds no rule or number.** No pre-check.
- **Heavy:** as G: the named runs are built once each through the module cache, and the Three.js groups are built on five cities only.

### H2 · Stage 7, Facades: fire escapes and wall props (facades, pure). Branch `ticket/070h2-facades-walls`
**Branch.** Cut from `goal/city-style` at the commit of this re-cut or later (H1, H1b and G2 are merged; b49a282). **The pre-check comes first** (below; one pre-check for H2 and H2b): no builder is spawned until it reports "holds", or Josh has answered its note and the architect has re-cut on his answer. **Done:** it did not report "holds", Josh has answered its note (Q23), and this text is re-cut to his answer (21 Nov 2026, on `goal/city-style` after 4d78c9d), so H2's builder may start on it. H2b's starts after H2 merges.

**Josh's words (21 Nov 2026, in chat).** Asked whether H2 starts next, Josh said: "Yes".

**Josh's words (21 Nov 2026, in chat; Q23).** Asked the H2 pre-check's seven questions (`docs/design/070-H2-precheck.md`, section 4), each as recommended (1: an escape bay keeps its glass but loses its awning and signs (EP); 2: extra escapes on quiet sides, not counted in R7 (EX); 3: no escape whose ladder comes down among parked cars (ET); 4: quiet escapes may face each other across a lane, 0.78 m apart (RQ, no pair-drop rule); 5: door corners get no canopy (WP3); 6: a one-storey party wall over style 2 and 3 roofs takes only the painted board, and `Pipe_Present_01` is never used (PW3); 7: `BLANK_RUN_MAX_M` 2.1), he answered: "Yes, 2.1m". The re-cut writes in the note's section 5 for "All yes, and 2.1": EP, EX, ET, RQ, WP3 and PW3 stand as written and quote him; ES stays at 0.4; the R6 note names 6 x 6 seed 3 one-way on; H2b types `BLANK_RUN_MAX_M` 2.1, Decided.

**Pre-check done (21 Nov 2026, the pipeline-designer, at 9d173c5).** It did not report "holds": every check (R4, R5, R6, the ATM share, R7, `escapeShort`, `escapeCheck`, the neighbour rule, the caps and the reach) passes on 20 of 20 runs at 0.4, but EP, EX, ET, RQ, WP3 and PW3 add or change a rule and PW4 needed a number. He answered its seven questions (Q23), and those readings, the R6 note and H2b's criteria 1, 4 and 7 are written to his answers. EQ, EH, ER, ES, EF, EW, WP1, WP2, PW1, PW2 and PW5 held as written. The note's numbers are a probe's; the builder's report is the record.

**Split (21 Nov 2026, the lead-architect, at this re-cut).** H2 as first cut held three jobs: fire escapes, party walls and wall props. Escapes are a port of 058 and 061 plus their meeting with H1b's dressing; party walls are new on every path (067 A was superseded before it was built: no `partyWalls`, `blankFaces` or kit placement exists in `src/render3d/`). Together they are more than a day (Cutting rules). So:
- **H2** (this section): fire escapes, door canopies, wall air-conditioners and window planters; R7, `escapeCheck`, and R5 and R6 measured again with the escapes in.
- **H2b** (below): the party-wall kit and M7.

Both are the facades agent's, in one folder. H2b branches from `goal/city-style` once H2 is merged (they share `stage.ts`, `stage.test.ts` and the digest pins). One pre-check measures both before H2's builder starts.

**Goal.** The pipeline's buildings carry the tile city's fire escapes (one platform a storey, each deck under its window, each flight meeting the deck above, the drop ladder at the walk) on the share of street buildings the tile city guarantees, plus extra ones on quiet faces; a door canopy over some doors; air-conditioners and window planters on the upper floors. An escape's column keeps its shop bay plain (no awning, no sign), as on `city=tiles`. Nothing changes in 3D until J draws them. The flat picture of the `facades` stage gains them as points.

**Re-cut (21 Nov 2026, the lead-architect, against b49a282).** It reads what is merged:
- `facades.ground` (H1): each ground piece's `kind` (a `door`'s column carries no escape and takes the canopy), `cells`, `frontage` and `placement` (its `y_m`, for the canopy, L1);
- `facades.dressing` as H1b's `buildDressing` makes it, called by the stage with the escape columns (EP below);
- `buildings.columns` (F2): each column's `kind`, `front`, `yaw`, `rowId`, `ground.top_m`, and its `pieces` (role, storey, span, key: the storeys and sills an escape is laid on, and the host of every piece above the ground);
- `buildings.rows` and `buildings.buildings` (F1): rows, buildings in row order, cells, `storeys`, and H1b's runs (B2, `runsOf`);
- `mass.built` and `mass.cells` (C3): open sides with their `frontage`, and the use of the cell across each (a `stalls` cell, ET);
- the tile city as `city=tiles` runs it today: `planEscape`, `storeysOfColumn`, `sillOf`, `codeEscape`, `ladderParts`, `escapeCheck`, `escapeRank` and `escapeBlocks` (`src/render3d/escapes.ts`; tickets 058 and 061); `dressBlock`'s escape block, its door canopy and its wall props, and `dressTown`'s choice (`src/render3d/dressing.ts`); R7 (`citymetrics.ts`) and its tile-city floor `TILE_CITY_R7_MIN` (`tilecity.ts`), which `tilecity3d.ts` passes as the escape share.

The type is written: `CityWallPieceKind`, `CityWallBox`, `CityWallPiece` and `CityFacadesLayer.walls` (`src/core/cityplan.ts`, "stage 7, H2 and H2b"), with the frame, face and escape rules in the comment above them. `walls` is optional, as `dressing` was, so H1's and H1b's fixtures and G2's type-check unchanged; from H2 the stage always writes it. H2b's kinds (`partyBoard`, `partyPipe`, `partyWindow`) are in the same union now, so H2b needs no type change. `ground`, `dressing`, `CityGroundPiece` and `CityDressingPiece` do not change, so G2 reads exactly what it read.

It runs on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on; `NAMED` in `src/city/facades/testcities.ts`) and pins the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on). The outside cities (3 x 3 and 6 x 4 seeds 1 to 20, off and on) are reported, never required or pinned.

**What the tile city's words mean on cells.**
- **A block is a building** (H1b's B1, unchanged). `ESCAPE_MIN_BAYS`, "at most one escape per block", `WALL_PROPS_PER_BLOCK` and every `lot.key` salt are per `CityBuilding`, salted with its id through the stage's `rand`. **A run** is H1b's B2: a chain of row neighbours, in row order.
- **EQ. A qualifying building** (R7's count; `citymetrics`: `bays >= ESCAPE_MIN_BAYS`, `floors >= 2`, an apartment style) is a building with at least `ESCAPE_MIN_BAYS` (3) cells and at least 3 storeys (the old `floors` is `storeys` less one; every pipeline style is an apartment style), whose frontage (H1's D3) is street. The grammar says R7 keeps "the same qualifying blocks (street-facing)". `stack.bays` counted every column, so a building's cells count, blind ones included.
- **EH. A host column** (`dressBlock`'s `eligible`: not a corner, not a door column, with a roof piece) is a `mid` column whose ground piece is not a `door`. A `shop` or `shopDouble` column may host; a blind column never does (it has no open side to step out onto). The column is picked by the stage's `rand("escape", "col", building id)` among the hosts in row order, as `pickOf(eligible, lot.key, "escapecol")`.
- **ER. The rank** (061's `escapeRank`, `stableHash(lot.key + "escape")`) becomes `finalise(rand("escape", "rank", building id))` (R-3: no stage hashes a key of its own). `escapeBlocks`' algorithm (rank order, no two neighbours of a run, the alternate re-lay, the trim) is moved unchanged and takes the rank as an input.
- **ES. The share is the tile city's**, `TILE_CITY_R7_MIN` 0.4 (Josh, 18 Nov 2026: "Just choose the recommended option for now"), as `tilecity3d.ts` passes it to `dressTown` today, and R7 is checked against 0.4. The ladder's `ESCAPE_SHARE_LADDER` (`CITY_CHECK.R7`, 0.5) is a puzzle map's and does not move. This is a move, no number changes; it is named because the R6 note below was measured at 0.5. **The share stays 0.4** (Q23): the pre-check found R6 with 0.019 to 0.028 to spare at 0.4, and exactly on its floor (0.450) on one hash at 0.5, so the pipeline never uses the ladder's 0.5.
- **EF. The storeys an escape is laid on** (`storeysOfColumn`) are F2's fixed frame: storey k (1 to `storeys` - 1) stands at y = 3 k, its sill `sillOf(key, j)` of the floor piece over it (`floor3`: j = 0, 1, 2 for its three storeys). The old path spaced a stack piece's storeys by its bounds' height over three; the pipeline's pitch is 3 m by F2, so the decks are worked out at 3 k. The walk is at y 0 (H1's S1 frame): the drop ladder runs to y 0 whatever the ground piece's `y_m`, and the escape is not raised by L1 (it hangs on the floors, which do not move).
- **EP. An escape's column keeps its bay plain** (`dressBlock`'s `plain(b)`; H1b's E1 said H2 would say how they meet). The stage decides the escapes first (they read only `mass`, `buildings` and `ground`), then calls H1b's `buildDressing` with the set of escape columns: a bay that spans an escape column (a `shopDouble` spanning it whole) takes no awning, no L awning, no fascia sign and no blade sign, and is not a "wanting" bay in the awning key's choice, exactly as `dressBlock`. Its glass stays (R4 unchanged). An ATM stands beside a door, which is never an escape column. With an empty set, `buildDressing` returns H1b's dressing exactly. R5 and R6 keep counting the escape bays in their denominator, as `cityMetrics` does. **Josh, 21 Nov 2026, Q23 answer 1: "Yes, 2.1m"**, to "where a building gets a fire escape, the shop under it keeps its window but loses its awning and sign, as on the tile city" (signs from about 57 % of shops to about 50 %; R6's floor 0.45).
- **EX. Escapes on quiet faces are extra** (grammar rule 9's quiet row: "fire escapes by 058's rules"; R7's line: "Escapes on court faces are extra and not counted"; **Josh, 21 Nov 2026, Q23 answer 2: "Yes, 2.1m"**, to "add fire escapes on quiet sides too (lanes and courtyards), about 86 a city, not counted in the 40 %"). The tile city had no quiet faces, so this was the architect's reading, now his: a building that would qualify by EQ but whose frontage is quiet is a quiet site, and `escapeBlocks` is run a second time over the quiet sites alone, at the same share, in the same B2 order. R7 counts street buildings only. A quiet escape stands on its column's front, which is a quiet open side.
- **ET. No escape over stalls** (the architect's reading, by analogy with Josh's ruling 2, 19 Nov 2026: no door behind a stall; **Josh, 21 Nov 2026, Q23 answer 3: "Yes, 2.1m"**, to "no fire escape where its ladder would come down among parked cars (about 4 a city otherwise)"). A host column with an open side onto a `stalls` cell is not a host: the drop ladder would come down among parked cars. Street columns never face stalls, so this touches quiet sites only. The pre-check counted what it takes away: 453 host columns and 162 sites over the 20 runs.
- **EW. The escape's room** is W1's: a column is as wide as its first floor piece's bounds (H1b's W1), and an escape whose span (`planEscape`'s `span_m`, or `CODE_ESCAPE.w`) is wider than its column is not placed, as on `city=tiles`. Its weight against `DRESS_PER_BAY_MAX` is `dressBlock`'s (the count by bounds under the roof), taken first.
- **RQ. Reach on a quiet face** (the architect's reading; **Josh, 21 Nov 2026, Q23 answer 4: "Yes, 2.1m"**, to "escapes stand out up to 2.1 m over a 5 m lane or courtyard; about once a city, two face each other across a lane, 0.8 m apart; allow that?"). H1b's T1 (Josh, Q22 answer 1) holds a front-face piece at most `CELL_M` past its column's front cell edge on a street, a park edge and a plaza. H2 holds every wall piece (escapes, canopies, wall props) to the same `CELL_M`, on street and quiet faces alike (a lane, drive, walk-through, apron or aisle is at least one cell wide). The pre-check reported each piece's reach by the use of the cell across (worst: escape 2.111 m, canopy 1.529 m, air-conditioner 1.002 m, planter 0.721 m). **No pair-drop rule:** two quiet escapes facing each other across one lane cell both stand (24 pairs on the 20 runs, 0.78 m between the decks); they are left to J's screenshots, and no check or fixture asks for one to be removed.
- **WP1. Wall props by storey.** `dressBlock`'s `level` 1 to `floors` is storey 1 to `storeys` - 1; `WALL_MIN_LEVEL` 2 is storey 2. A prop at storey k stands at 3 k + `WALL_AC_LIFT_M` (an air-conditioner, `WALL_AC_OFFSET_M` to the left or right of its column's centre by hash) or 3 k + `PLANTER_LIFT_M` (a planter, centred), its back on the host floor piece's bounds front (`onFace`, H1b). Up to `WALL_PROPS_PER_BLOCK` (4) a building, storey by storey and column by column, as `dressBlock` loops; none on the escape column.
- **WP2. Wall props and canopies stand on open fronts only.** A wall prop stands on a `mid` or `corner` column's front, never on a blind column (its front faces a built cell; F2's U1 shows it only above a lower roof). A corner's single-face rule is H1b's X1: on its front only. Street and quiet fronts alike (grammar rule 9: wall props are in both rows).
- **WP3. A door canopy** (`DOOR_CANOPIES`, `P_CANOPY`, `DOOR_CANOPY_Y_M` over the ground piece's base, raised by its `y_m`, L1) stands over a `door` piece, street or quiet. A `doorCorner` takes none: `dressBlock` never had one, and where its door stands on the piece is in no table. The pre-check counted 118 to 184 door corners a run left bare; **Josh, 21 Nov 2026, Q23 answer 5: "Yes, 2.1m"**, to "corner doors get no door canopy (about 150 a city stay bare)".

**Which criteria are moves and which are new** (for the pre-check):
- **Moves, numbers unchanged:**
  - The keys: `ESCAPES` (`ESCAPE_TOP`, `ESCAPE_MID`, `ESCAPE_FIRST`), `CODE_ESCAPE_KEY`, `DOOR_CANOPIES`, `WALL_ACS`, `WALL_PLANTERS`.
  - The escape tables and numbers: `ESCAPE_GEOMETRY`, `WINDOW_SILL_M` (the nine floor keys), `ESCAPE_DECK_BELOW_SILL_M` 0.15, `ESCAPE_DECK_TOL_M` 0.05, `ESCAPE_JOINT_TOL_M` 0.02, `ESCAPE_GROUND_TOL_M` 0.02, `ESCAPE_SCALE_Y` 0.8 to 1.2, `CODE_ESCAPE`, `LADDER_RUNG_PITCH_M`, `LADDER_RAIL_M`, `LADDER_RUNG_M`, `ESCAPE_MIN_BAYS` 3, `TILE_CITY_R7_MIN` 0.4.
  - The wall-prop numbers: `P_CANOPY` 0.5, `DOOR_CANOPY_Y_M` 2.3, `P_WALL_AC` 0.15, `P_PLANTER` 0.1, `WALL_PROPS_PER_BLOCK` 4, `WALL_MIN_LEVEL` 2, `WALL_AC_LIFT_M` 1, `PLANTER_LIFT_M` 0.9, `WALL_AC_OFFSET_M` 1.5; H1b's `DRESS_PER_BAY_MAX` 6.
  - `planEscape`, `storeysOfColumn` (EF's frame), `sillOf`, `codeEscape`, `ladderParts`, `escapeCheck` and `escapeBlocks` (058 and 061's ranking, ER's rank), as pure functions in the folder, ported line for line.
  - `dressBlock`'s order: the escape decided first and given its column's room first; then H1b's dressing with the escape bays plain (EP); then the canopy; then the wall props. (`dressBlock` also places roof props between them; those are H3's.)
  - R7 at `TILE_CITY_R7_MIN` over EQ's street buildings; `escapeCheck`'s pass rule; 061's neighbour rule ("no two consecutive blocks of a run both have one").
  - 16.11's Law: a fire escape needs a window to step out of, so none stands on a party wall (here: an escape's face is its column's front, an open side, never a blind column's).
- **New or changed (the architect's readings; measured by the pre-check; EP, EX, ET, RQ and WP3 answered yes by Josh, Q23):** EQ, EH, ER, EF and EW are words on cells; ES names the share; **EP changes H1b's merged dressing** on escape buildings (R5 and R6 move, their thresholds do not); **EX, ET and RQ add rules** for faces the tile city never had; **WP3 leaves door corners without a canopy**. WP1 and WP2 are words on cells.

**R6 sits near its floor once escapes take shop columns** (21 Nov 2026; first from the H1b pre-check's estimate, now measured by H2's, `docs/design/070-H2-precheck.md`, sections 0 and 1). **The run to watch is 6 x 6 seed 3 one-way on:** R6 0.548 before escapes, **0.474 at 0.4** (ES), 0.455 at 0.5; 0.469 to 0.478 over the note's four hashes at 0.4. (The H1b estimate's 6 x 6 seed 3 one-way off is 0.497 at 0.4 on the merged dressing; it is no longer the lowest.) Over the 20 runs at 0.4, R6 is 0.474 to 0.532 and R5 0.596 to 0.639. These are the probe's numbers on its hash, not the builder's; criterion 9 reports the builder's lowest R6 and its run. **R6's 0.45 floor is never lowered** (R-2). If R6 fails on a named run at the share the stage uses, the builder stops, and the choice goes to Josh through the main session.

**Pre-check first** (CLAUDE.md: this section adds rules and readings). Before the builder starts, the `pipeline-designer` ("pre-check 070 H2", on `goal/city-style` at this commit) measures H2's and H2b's questions on the 20 named runs, with a probe outside the repo and the fixture bounds of `src/render3d/dressing.test.ts` and `escapes.test.ts`. The questions are listed after H2b. If it does not report "holds" for both, its note goes to Josh before any builder is spawned; the architect re-cuts on his answer.

0. [ ] **First, by the lead-architect (done with this re-cut, on `goal/city-style`):** `CityWallPieceKind`, `CityWallBox`, `CityWallPiece` and `CityFacadesLayer.walls` in `src/core/cityplan.ts`. No reader changes.
1. [ ] **The wall table** (R-6). Typed-in data in the folder (a new `wallkit.ts`): every key list and number under "Moves" above, as copies; `ESCAPE_GEOMETRY` and `WINDOW_SILL_M` as copies; each key's bounds (w, h, d; the three escape pieces, the two canopies, the air-conditioner and the two planters), as `src/render3d/dressing.test.ts`' fixture has them.

   New `src/render3d/escapepin.test.ts`:
   - **Always (no GLB):**
     - each key list, each number and both tables equal `escapes.ts`' and `dressing.ts`'; `TILE_CITY_R7_MIN` equals `tilecity.ts`'; `ESCAPE_MIN_BAYS` equals `dressing.ts`';
     - the folder's `planEscape`, `codeEscape` and `ladderParts` give `escapes.ts`' results on three fixture columns (3, 4 and 5 storeys, each style), and its `escapeBlocks` gives `escapes.ts`' choice on fixture sites when both are given `escapeRank`'s ranks (058 and 061 moved unchanged);
     - `DRESS_NUDGE_M` and `DRESS_FRONTS` name none of these keys, so every key's own front is +z.
   - **Inside `it.skipIf(!HAVE_GLB)`**, read lazily as `shopfrontpin.test.ts` does: every key's bounds equal the converted GLB's within 0.005 m.
2. [ ] **The escapes** (EQ, EH, ER, ES, EF, EW, EX, ET; Vitest, on the 20 named runs). The stage writes `facades.walls`, in the order `cityplan.ts` gives:
   - every escape stands on a host column (EH, ET) of a building of at least 3 cells and 3 storeys; one escape at most per building;
   - every escape has one piece per storey over the ground (or one code-drawn piece), in `ESCAPES`' roles, its face its column's `front`;
   - the street escapes are exactly `escapeBlocks`' choice over EQ's street sites at `TILE_CITY_R7_MIN`, and the quiet ones its choice over EX's quiet sites; no two neighbours of a run both have one; the street target is met (`escapeShort` 0) on every named run;
   - every choice is the stage's `rand` (R-3), salted with the building's id; the same city twice gives the same layer.
3. [ ] **The meeting with H1b's dressing** (EP; Vitest, on the 20 named runs).
   - `ground` is exactly H1's (`dress.test.ts`' existing test stands).
   - On every building with no escape, `dressing` equals what `buildDressing` gives with no escape columns, piece for piece (so H1b's dressing is unchanged there).
   - On every escape building, no awning, L awning, fascia sign or blade sign stands on a bay that spans the escape column, and that bay's glass stands.
4. [ ] **Canopies and wall props** (WP1 to WP3; Vitest). Every canopy over a `door`, at `DOOR_CANOPY_Y_M` plus the door piece's `y_m`; every wall prop on a `mid` or `corner` column's front, at storey 2 or higher, never on the escape column; at most `WALL_PROPS_PER_BLOCK` a building; at most `DRESS_PER_BAY_MAX` pieces a column counting H1b's dressing and the escape's weight.
5. [ ] **Placements** (ported; Vitest). From the tables only: in the host column's frame, then turned by its `yaw`; an escape piece raised to its slot's `y` and scaled by its `scaleY` about its base, never scaled otherwise; every other piece's back on its host's bounds front within 1e-6 m (`onFace`); no piece's outer face more than `CELL_M` past its column's front cell edge (RQ). Hand-worked tests, each pivot computed by hand from the bounds and the geometry table:
   - a pack escape on a 4-storey style-2 column at two turns (decks, x shift, scales, the first piece's ladder boxes to y 0);
   - a code-drawn escape on a column too narrow for the pack's span;
   - a canopy over a `Door_01` at `y_m` 0 and one over a door at -0.071 (L1);
   - an air-conditioner on each side of its column, and a planter.
6. [ ] **The checks** (Vitest, on the 20 named runs). Each is a function of the layer, `buildings` and `mass`, run by the stage before it returns; a failure names the check and the cells. **Stop rule:** if one fails on a named run, the builder stops and reports (R-2). It does not loosen a rule.
   - **`escapeCheck`:** every escape has a platform on every storey over the ground, every deck within `ESCAPE_DECK_TOL_M` of its sill less `ESCAPE_DECK_BELOW_SILL_M`, every flight joint within `ESCAPE_JOINT_TOL_M`, the ladder's foot within `ESCAPE_GROUND_TOL_M` of the walk (y 0).
   - **R7:** the share of EQ's street buildings with an escape is at least `TILE_CITY_R7_MIN` 0.4; quiet escapes are not counted.
   - **The neighbour rule:** no two consecutive buildings of one run both have an escape (street and quiet passes alike).
   - **The hosts:** an escape only on a `mid` column whose ground piece is not a `door`, with no open side onto `stalls` (ET); its face its column's front, an open side (16.11: never a party wall).
   - **EP:** no awning, L awning or sign on a bay that spans an escape column.
   - **R4, R5, R6 and the rest of H1b's checks** run as they are, after EP (`dressFailures`, unedited in what it asserts).
   - **The wall props and canopies:** WP1 to WP3, the caps, attachment and the reach (RQ).
   - **Failing fixtures.** Each built from the default city's layer (6 x 6 seed 1, one-way on), typed in from the run in the test (not pinned by hash), with one thing changed:
     - an escape moved onto a building's `door` column fails the hosts; one moved onto a corner column fails the hosts;
     - one escape deck lowered 0.06 m fails `escapeCheck` on the deck; one flight's piece shifted 0.03 m in x fails it on the joint; the ladder's foot raised 0.03 m fails it on the ladder; the top storey's piece removed fails it on the missing storey;
     - an escape added on the row neighbour of an escape building in the same run fails the neighbour rule;
     - every street escape removed fails R7;
     - an awning put back on an escape bay fails EP;
     - a quiet escape moved onto a column facing `stalls` fails ET (with one cell across set to `stalls` in the fixture's mass if no such column exists);
     - an escape turned onto a side that is not open fails the hosts (16.11);
     - an air-conditioner on the escape column, one on storey 1, a fifth wall prop on one building, and one on a blind column each fail WP1 or WP2 by name;
     - a canopy on a `doorCorner` fails WP3; a canopy moved 0.1 m off its host's face fails attachment.
7. [ ] **The picture** (R-5). The facades picture's cells and H1b's points are unchanged. It gains points: one per escape (legend "fire escape", at its first piece's `x_m`, `z_m`), one per canopy ("door canopy") and one per wall prop ("wall prop"). The R-5 test, as H1b's, checks every point's legend against its piece.
8. [ ] **R-1 to R-7 for `facades`** (Vitest).
   - The stage still reads only `mass`, `buildings`, and the streets' `w` and `h`; H1's grep test stands unedited and covers the new files.
   - **R-4, the facades digest re-pin:** the facades digest is re-pinned on the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on). It changes, because `walls` is new and EP changes `dressing` on escape buildings; H1b's pins (`7a95c899`, `2281779d`, `f965837b`, `9a3c4f10` in `stage.test.ts`) are replaced, and the builder's report names the old and the new. Criterion 3 holds that `ground` did not change and that `dressing` changed only on escape buildings. The streets, land, mass, edge and buildings digests are unchanged, and the test double still leaves them equal.
   - R-7: 6 x 6 seed 1 ends `ok`.
9. [ ] **The numbers** (reported, not asserted; a new `escapereport.test.ts`). For each of the 20 named runs:
   - qualifying street buildings, hostable ones, the target, escapes placed, `escapeShort`, R7's share;
   - quiet sites, hostable ones, quiet escapes placed, and the hosts ET took away;
   - pack escapes and code-drawn ones, the scale range, the worst deck, joint and ladder figures;
   - R4, R5 and R6's shares and the ATM share, after EP, beside H1b's (with no escapes); the lowest R6 and its run;
   - canopies, door corners with none (WP3), air-conditioners, planters, and the columns the caps turned a piece away from;
   - the furthest reach by key and by the use across (RQ);
   - wall pieces in all, and with H1b's dressing against `DRESS_MAX` (C1).

   For the outside cities that reach stage 7: whether it is ok, and its failure if not.
10. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=facades` shows the picture with escape, canopy and wall-prop points on street and quiet fronts. `?view=3d&city=plan&stage=assemble` and `?view=3d&city=tiles` look as on `goal/city-style` (J draws the walls).
11. [ ] R-8 to R-11. The builder runs these tests only: `npx vitest run --maxWorkers=2 src/city/facades/stage.test.ts src/city/facades/place.test.ts src/city/facades/fixtures.test.ts src/city/facades/report.test.ts src/city/facades/dress.test.ts src/city/facades/dressfixtures.test.ts src/city/facades/dressreport.test.ts src/city/facades/escape.test.ts src/city/facades/escapefixtures.test.ts src/city/facades/escapereport.test.ts src/city/pipeline/run.test.ts src/render3d/escapepin.test.ts src/render3d/shopfrontpin.test.ts src/render3d/groundpin.test.ts src/render3d/planview.test.ts src/render3d/plan3d.test.ts`, and one `npx tsc --noEmit`. `plan3d.test.ts` is run, not edited: it runs stage 7 and must still pass. The main session's gate is the full `npm run gate`.

- **Files:** `src/city/facades/`: new `wallkit.ts`, `escape.ts` (the ported functions, the choice and the placement), `walls.ts` (canopies and wall props), `wallcheck.ts`, `escape.test.ts`, `escapefixtures.test.ts`, `escapereport.test.ts`; edits to `dress.ts` (the escape-column input of `buildDressing`, EP; nothing else), `stage.ts` (decide the escapes, pass them to the dressing, write `walls`, run the checks, the picture's points), `stage.test.ts` (the re-pin, the picture), `dress.test.ts` (only where an assertion relied on H1b's E1, every bay plain), `hash.ts` (if the rank needs a helper) and `index.ts`. New `src/render3d/escapepin.test.ts` (the one render3d file it adds).
- **Must not:**
  - `src/core/` (criterion 0 is the architect's);
  - every other `src/city/` folder, and `src/city/stages.ts`;
  - `src/city/pipeline/` (`run.test.ts` is run, not edited);
  - `dresscheck.ts`'s thresholds and what its checks assert (EP is H2's own check, in `wallcheck.ts`; if one of its assertions contradicts EP, the builder stops and reports, and the architect re-cuts); `dresskit.ts`; H1's files (`kit.ts`, `place.ts`, `check.ts`, `facts.ts`) except as read;
  - `src/render3d/` but the new pin test: `escapes.ts`, `dressing.ts`, `citymetrics.ts`, `tilecity.ts`, `plan3d.ts` and their tests are read only; `groundpin.test.ts`, `shopfrontpin.test.ts` and `plan3d.test.ts` are run, not edited.
- **Interfaces:** criterion 0. J reads `facades.walls` (each piece's `placement`, `scaleY` and `boxes`); H2b adds its kinds to the same list; G2 reads nothing new. No new dependency.
- **Adds rules and readings; changes no threshold.** Every key list, chance, cap and threshold is the tile city's, copied and pinned; R6's 0.45, R5's 0.55 and R7's 0.4 do not move. EP changes H1b's merged dressing on escape buildings (as `dressBlock` does). EX, ET and RQ add rules for quiet faces, and WP3 leaves door corners bare. So the pre-check came first; Josh has answered it (Q23).
- **Heavy:** the named-run tests build the 10 named cities, both ways, once each, through `testcities.ts`' module cache, with a 120 s timeout. Criterion 9's report has its own file.

### H2b · Stage 7, Facades: the party-wall kit (facades, pure). Branch `ticket/070h2b-facades-party-walls`
**Branch.** Cut from `goal/city-style` once H2 is merged. The pre-check is H2's (one for both); it is done and Josh has answered it (Q23: "Yes, 2.1m"), and PW3, PW4, PW5 and criteria 1, 4 and 7 are written to his answer. It adds no type: `CityWallPiece`'s kinds `partyBoard`, `partyPipe` and `partyWindow` are typed (criterion 0 of H2).

**Goal.** No bare wall shows above a lower roof. Where a building stands taller than the building beside or behind it, every storey face of its party wall above the lower roof carries a painted board, a pipe run or windows (grammar rule 8; Josh, 19 Nov 2026: "Yes, dress it"). Nothing changes in 3D until J draws them. The flat picture gains them as points.

**What it ports.** Nothing runs on `city=tiles`: 067 A (`partyWalls`, `blankFaces`, the kit in `dressing.ts`) was superseded by 070 before it was built. H2b builds rule 8 and M7 from the grammar's text, 067 A's criteria 1 to 4 (which name the kit and its fit) and F2's U1. It reads `buildings.columns` (each column's `kind`, `front`, `side`, its pieces' keys, its roof piece), `buildings.buildings` (`storeys`), `mass.built` (open sides), and H2's `walls` (no escape on a party wall).

**What rule 8's words mean on cells.**
- **PW1. A party-wall face.** For a built cell C and a side s of C that is not an open side (so the cell across, N, is built, by G3 and M3), and is not C's `front` where C is a blind column (Josh, 20 Nov 2026, Q20 U1: a blind column's windowed front above a lower roof counts as dressed, and is not a party wall): if N's building has fewer storeys than C's, C's side s shows above N's roof. Its exposed storey faces are storeys N.storeys to C.storeys - 1 of C (one or two: R2 holds storeys 3 to 5, and M4c ties partners' floors, so a step is between row neighbours, an L's legs, or a blind cell's neighbours). The same building on both sides, or N as tall or taller, is no face.
- **PW2. The wall plane** is C's body plane on side s: its cell edge (M1), where the floor pieces' blank side or back stands (`BODY_M`'s side or back inset in from the bounds). A kit piece's back lies on it, as `onFace` puts a piece's back on its host's face, with no nudge (`DRESS_NUDGE_M` is empty). The pre-check measures whether any floor key's trim past its side plane (its bounds less its body, 0.05 to 0.14 m by the grammar) stands where a kit piece would, along the face.
- **PW3. The room on a face.** A storey face of C runs from 3 k to 3 k + 3 and the cell's 5 m across. On the lowest exposed face, a kit piece's base stands at or above the top of N's roof piece (its base 3 N.storeys plus its bounds' height: 0.5 to 0.744 m by the buildings' kit), so it never sinks into the lower roof. Every piece's top stands at or under C's roof piece's base (3 C.storeys), so it never passes the cornice (067 A: "never past the roof's cornice"). Across, it stands inside the face's 5 m. **What fits** (the pre-check, `docs/design/070-H2-precheck.md`, section 2, Q9): over `Roof_01` (0.500 m) a one-storey step leaves 2.500 m (board, windows) and a two-storey step 5.500 m (and `Pipe_Present_03`); over `Roof_02` and `_03` (0.744 m) a one-storey step leaves 2.256 m, **board only**, and a two-storey step 5.256 m (and `_03`). So windows never stand on a one-storey step above a style 2 or 3 roof, and `SM_Prop_Pipe_Present_01` (7.046 m high) fits no face, since a step is at most two storeys (R2): **it is in the kit table but never used.** The board fits every face; the pre-check found 0 faces where nothing fits. **Josh, 21 Nov 2026, Q23 answer 6: "Yes, 2.1m"**, to "on a party wall one storey above a lower roof, two of the three roof styles leave room only for a painted board, not windows, and the tall pipe never fits anywhere" (`Pipe_Present_01` never used).
- **PW4. A bare stretch** (M7's "widest bare stretch") is measured along the face's width: the longest run of the face's 5 m that no kit piece on that face covers. It is at most `BLANK_RUN_MAX_M`. **`BLANK_RUN_MAX_M` is 2.1 m, Decided** (Josh, 21 Nov 2026, Q23 answer 7: "Yes, 2.1m"). The grammar called 3 m "section C's provisional number"; 067 A's rule (the apartment fronts' window pitch plus 0.5 m: 2.11, 2.14 and 1.68 m by style) rounded down gives 2.1. It is typed in `partykit.ts` (criterion 1) with a comment naming Josh's answer as Decided, and a test pins it. The pre-check's widest stretches: board centred 0.40 m, two windows at the quarter points 1.20 m, `Pipe_Present_03` centred 1.09 m, all under 2.1; two windows pushed to one end 2.39 m and a pipe at one end 2.17 m, both over it.
- **PW5. The kit and the pick** (rule 8's table; 067 A criterion 2). Per storey face, by `rand("party", ...)` among the options that fit it (PW3), one of: a painted board (`SM_Prop_Billboard_Sign_01` to `_07`, one to a face, centred, 0.4 m margins); two windows (`SM_Prop_Window_01`, two to a face); or a pipe run (`SM_Prop_Pipe_Present_01` or `_03`) over one face or the two faces of a two-storey step, where its height fits. `_02` stands 3.17 m off the wall and is not in the kit table. `_01` is in the table but never fits (PW3; Josh, Q23 answer 6), so in practice the pipe is `_03`, over a two-storey step only; the stage keeps `_01` as an option that PW3 rules out and does not special-case the key. **"No key twice running along a row":** the faces are taken in the cited order (C's row order, then side, then bottom up), and a key equal to the key on the face just before it in that order is not picked (the two windows of one face are one pick). If no option is left on a face, the stage fails, naming the face (R-2).
- **PW6. The pipe allowance** (grammar rule 8: `SM_Prop_Pipe_Present_*` leaves `CITY_NEVER_USED` for party walls only). In the plan a pipe key stands only as a `partyPipe` on a PW1 face. R12's never-used audit and its allowance are J's (the whole-plan audit); H2b checks its own half. J's audit should expect `SM_Prop_Pipe_Present_01` (and `_02`) unused on every city (Q23 answer 6); only `_03` is placed.

- **PW7. H2's checks and the column cap read H2's kinds only** (21 Nov 2026, H2b's stop; a counting scope, not a rule). The party pieces share `walls` with H2's, but each set has its own checks: H2's (`wallFailures`, `wallReport`) judge `escape`, `canopy`, `aircon` and `planter`; H2b's (`partyFailures`) judge `partyBoard`, `partyPipe` and `partyWindow`. So H2's check skips the party kinds (it still fails any kind that is neither H2's nor H2b's), and its metrics (`pieces`, `byKind`, `maxPerColumn`) stay H2's numbers. **`DRESS_PER_BAY_MAX` (6) counts no party-wall piece.** Where that is settled:
  - the cap is 052's, and the style guide defines what it governs by the list it drops from when a column is full: "glass, awnings, the big roof prop, the fire escape, signs, the door canopy, small roof props, the ATM, wall props" (`docs/city-style-guide.md`, 052 default). The party kit is not in it (067 A, which would have added it, was never built), and H2 counts the same list ("at most `DRESS_PER_BAY_MAX` pieces a column counting H1b's dressing and the escape's weight", H2 criterion 4);
  - rule 8 and M7 (Josh, 19 Nov 2026: "Yes, dress it") require at least one kit piece on every exposed storey face, and PW5 fails the stage rather than leave a face bare. A cap that counted party pieces could only drop them (breaking M7) or turn away H2's pieces (moving H2's merged walls, which criterion 6 says do not move), so the grammar already leaves them out of it;
  - the cap is a count of a set, not a bound on what a column draws: 058's default already draws 7 pieces on a four- or five-storey escape column against 6 (`docs/city-style-guide.md`, 058).

  Nothing approved reads differently: the number stays 6, and it governs the same pieces it governed in 052, H1b and H2. The pre-check's Q4 (the fullest column 6) also counted H2's kinds only. The builder reports the fullest column with the party pieces added (criterion 7), for J's draw calls only; no check reads it.

**Which criteria are moves and which are new** (for the pre-check):
- **Moves, numbers unchanged:** rule 8's kit and its fit (board 4.19 by 2.03 m, one to a face with 0.4 m margins; window 1.30 by 2.31 m, two to a face; pipes one or two storeys; `_02` unused); M7 as the grammar words it; 16.11's Law (no escape on a party wall); the pipe lift (Josh, 19 Nov 2026: "Yes, dress it"; 067: "Dress it, lift the pipes (Recommended)"); U1 (Josh, 20 Nov 2026, Q20: "Yes to all").
- **New or changed (answered by Josh, Q23):** PW1 to PW3 and PW5's order are words on cells; **PW3 leaves a one-storey step over a style 2 or 3 roof with the board only** (3 - 0.744 = 2.256 m, under the window's 2.313 m; the board's 2.028 m fits; the first cut's "may fit nothing" does not happen: 0 faces), and `Pipe_Present_01` is never used; **PW4's number is 2.1 m** (`BLANK_RUN_MAX_M`, Decided).

0. [ ] Nothing in `src/core/` (H2's criterion 0 typed the kinds).
1. [ ] **The kit table** (R-6). Typed-in data in the folder (a new `partykit.ts`): the board, pipe and window keys and their bounds (w by h by d). The board's are `dressing.test.ts`' fixture's (4.193 by 2.028 by 0.118). The window's and the pipes', which no fixture has, are the pre-check's, measured from the GLB (`docs/design/070-H2-precheck.md`, section 2, Q9): `SM_Prop_Window_01` 1.303 by 2.313 by 0.370; `SM_Prop_Pipe_Present_01` 4.459 by 7.046 by 0.498; `SM_Prop_Pipe_Present_03` 2.828 by 4.243 by 0.498 (`_02`, 4.074 by 6.911 by 3.171, is not in the table). Then the floor keys' side and back insets (`BODY_M`) and the roof keys' bounds heights, as copies (the folder cannot import `src/city/buildings/`, R-1); and `BLANK_RUN_MAX_M` = 2.1, commented Decided (Josh, 21 Nov 2026, Q23: "Yes, 2.1m"). New `src/render3d/partywallpin.test.ts`: always, the board keys equal `dressing.ts`' `BILLBOARD_FACES` and their bounds its fixture's, the insets equal `BODY_M`, the roof heights equal the buildings stage's kit (`src/city/buildings/kit.ts`, read by the test only), `BLANK_RUN_MAX_M` is pinned at 2.1, and no kit key is in `DRESS_NUDGE_M` or `DRESS_FRONTS`; inside `it.skipIf(!HAVE_GLB)`, every kit key's bounds equal the converted GLB's within 0.005 m.
2. [ ] **The faces** (PW1; Vitest, on the 20 named runs). A pure `partyFaces(mass, buildings)` lists every exposed storey face once. A test checks that no face is on an open side, none on a blind column's front, and that each run has faces (every joint between row neighbours steps, R2).
3. [ ] **The kit placed** (PW2, PW3, PW5; Vitest). The stage appends the party-wall pieces to `walls` (after H2's, in `cityplan.ts`' order). Hand-worked placements: a board on a one-storey step at two turns, two windows on a face, a pipe over a two-storey step, each pivot by hand from the bounds and the insets.
4. [ ] **The checks** (Vitest, on the 20 named runs; the stop rule as H2's).
   - **M7:** every face of `partyFaces` carries at least one kit piece lying on it (its back on the wall plane within 1e-6 m), within PW3's room, and its widest bare stretch (PW4) is at most `BLANK_RUN_MAX_M`. A party wall with an open cell beside it is M3's failure, not this check's. The check reads the faces from `mass` and `buildings`, not from the layer.
   - **No key twice running** (PW5).
   - **The pipe allowance** (PW6): every pipe key in `walls` is a `partyPipe` on a face of `partyFaces`.
   - **No fire escape on a party wall** (16.11): no `escape` piece on a side of `partyFaces`, or on any side that is not open.
   - **Failing fixtures,** from the default city's layer, one thing changed: every kit piece removed (every height step bare) fails M7, as H2's first cut asked ("a height step with no kit piece"); one face's piece removed fails M7 on that face; a board moved 0.1 m off the wall fails attachment; two windows pushed to one end of their face (2.39 m bare, over `BLANK_RUN_MAX_M` 2.1) fail M7's stretch (on a face where windows fit, PW3; if the default city's layer has no window pick, the fixture puts the pair on a face with room in place of its pick, then pushes them; a board at one end leaves 0.81 m and cannot fail, so it is not the fixture); a piece raised past C's roof base, and one lowered into N's roof, fail PW3; the same board key put on two faces running fails PW5; a pipe moved onto a street front fails PW6; an escape moved onto a party face fails 16.11. And one positive test: a blind column's front above a lower roof carries no kit piece and passes (U1).
4b. [ ] **H2's checks on the whole layer** (PW7; Vitest). `wallcheck.ts`'s `wallReport` (so `wallFailures` too) reads `layer.walls` less the three party kinds, taken from one exported `PARTY_WALL_KINDS` in `partykit.ts`; nothing else in `wallcheck.ts` changes, and its "which H2 does not place" failure stays for any other kind. `stage.ts` runs `wallFailures(layer, ...)` on the whole layer again (the H2-only workaround at 150ab12 goes), then `partyFailures(layer, ...)`. In `escape.test.ts`, the canopies and wall props test's `perCell` counts H2's kinds only (it skips `PARTY_WALL_KINDS` as it skips `escape`); its limit stays `DRESS_PER_BAY_MAX`. `escape.test.ts`' other tests, `escapefixtures.test.ts` and `escapereport.test.ts` pass unedited, and H2's report numbers on the 20 named runs are unchanged. One new test in `partyfixtures.test.ts`: on the default city, `wallReport` of the whole layer equals `wallReport` of the layer with the party pieces taken out (failures and metrics).
5. [ ] **The picture** (R-5): one point per party-wall piece (legend "party-wall kit"). The R-5 test as H2's.
6. [ ] **R-1 to R-7** as H2's criterion 8: the facades digest is re-pinned on the four pin cities (H2's pins replaced, both named in the report); `ground` and `dressing` are unchanged from H2's (`digestOf` of each equal to H2's run on the four pin cities); the earlier stages' digests unchanged; 6 x 6 seed 1 ends `ok`.
7. [ ] **The numbers** (reported; a new `partyreport.test.ts`): per named run, faces by step (one or two storeys) and by where (row joint, an L's leg, a blind cell's side); the U1 fronts left undressed; pieces by kind and key; the faces where PW5's running rule forced the pick; the widest bare stretch; party-wall pieces in all, and the fullest column counting H2's pieces, H1b's dressing and the party pieces together (for J's draw calls; PW7: no check reads it). It says `SM_Prop_Pipe_Present_01` never fits (its count is 0, as PW3 and Q23 expect; a non-zero count would be a PW3 failure, which the checks catch). The outside cities as H2's.
8. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=facades` shows party-wall points at height steps.
9. [ ] R-8 to R-11. The builder runs H2's list with `party.test.ts`, `partyfixtures.test.ts`, `partyreport.test.ts` and `src/render3d/partywallpin.test.ts` added, and one `npx tsc --noEmit`.

- **Files:** `src/city/facades/`: new `partykit.ts`, `party.ts`, `partycheck.ts`, `party.test.ts`, `partyfixtures.test.ts`, `partyreport.test.ts`; edits to `stage.ts` (append the kit, run its checks, the picture's points), `stage.test.ts` (the re-pin, the picture) and `index.ts`. New `src/render3d/partywallpin.test.ts`. **(21 Nov 2026, PW7)** `wallcheck.ts`: the party-kind filter of criterion 4b and its import, nothing else; `escape.test.ts`: the canopies and wall props test's `perCell` line, nothing else.
- **Must not:** as H2's, and H2's files except `stage.ts`, `stage.test.ts`, `index.ts` and the two edits above. `escapefixtures.test.ts` and `escapereport.test.ts` stay unedited.
- **Interfaces:** none new. J reads the party-wall pieces in `walls`, and R12's pipe allowance (J criterion 2) reads PW6's rule. No new dependency.
- **Adds a number and readings.** PW4's `BLANK_RUN_MAX_M` is Josh's: 2.1 m, Decided (Q23); PW1 to PW3 and PW5 read rule 8 on cells. The pre-check is H2's, answered.
- **Heavy:** as H2's.

**The H2 pre-check's questions** ("pre-check 070 H2", the `pipeline-designer`, on `goal/city-style` at this re-cut; the 20 named runs, one-way off and on; a probe outside the repo). **Done** (21 Nov 2026, `docs/design/070-H2-precheck.md`); answered by Josh (Q23). Kept as asked; where the findings differ from a question's premise (question 1's watch run, question 9's "nothing fits"), H2's R6 note and H2b's PW3 say what was found:
1. **R5, R6 and R7 with escapes on shop columns (EP), at 0.4 (ES) and at 0.5.** Per run: R7's qualifying street buildings, hostable ones, target, placed and `escapeShort`; R5's and R6's shares after EP beside H1b's; the lowest R6 and its run, 6 x 6 seed 3 one-way off named. Does R6 hold 0.45 on all 20 at 0.4? (The R6 note: at 0.5 the H1b estimate was 0.449 there.)
2. **EQ and EH.** How many street buildings qualify by cells (blind included) and how many by non-blind columns only; how many qualifying buildings have no host (every mid column a door), and whether `escapeShort` is ever above 0.
3. **The escapes as laid (EF, EW).** On every host: pack or code-drawn, `planEscape`'s scale range and span against W1's column width, and `escapeCheck`'s worst deck, joint and ladder figures on F2's 3 m frame. Any column where the 3 k frame puts a deck out of `ESCAPE_DECK_TOL_M`?
4. **The cap.** Columns where the escape's weight, glass, awning and sign would pass `DRESS_PER_BAY_MAX`, and what it turns away.
5. **EX and ET.** Quiet sites, hostable ones, quiet escapes placed at the same share; the use of the cell across each quiet escape (lane, drive, walk-through, apron, aisle, green); the hosts ET removes.
6. **RQ.** The furthest reach of every wall piece by key, on street faces and on quiet faces by the use across, against `CELL_M`.
7. **The wall props (WP1 to WP3).** Canopies, air-conditioners and planters per run; door corners left without a canopy (WP3); props the caps turned away.
8. **The party-wall faces (PW1).** Per run: exposed storey faces, by step (one or two storeys) and by where; blind fronts above a lower roof (U1, left undressed).
9. **The room (PW3).** For each lower roof key, its bounds' height; the room left on the lowest face (3 m less it) and on a two-storey step; which kit pieces fit each (board 2.03 m, window 2.31 m, each pipe's height and width, measured from the GLB with `_02`'s 3.17 m depth confirmed); faces where nothing fits, so M7 would fail.
10. **The wall plane (PW2).** Each floor key's trim past its side and back planes, and whether a board, window or pipe on the body plane meets it.
11. **The bare stretch (PW4).** The widest bare stretch each kit option leaves on a face; the apartment fronts' window pitch per style (067 A's rule: pitch plus 0.5 m); whether 3 m holds, and the value the note recommends for `BLANK_RUN_MAX_M`.
12. **The running rule (PW5).** Faces where "no key twice running" removes an option, and any face it leaves with none.
13. **The totals.** Wall pieces and party-wall pieces per run, and with H1b's dressing against `DRESS_MAX` (C1), for J.

### H3 · Stage 7, Facades: roofs and the roof exit (facades, pure). Branch `ticket/070h3-facades-roofs`
**Branch.** Cut from `goal/city-style` at the commit of this re-cut or later (H1, H1b, G2, H2 and H2b are merged; 4ddae06; the pre-check and Josh's answer are f9c8ade). ~~**The pre-check comes first** (below): H3 adds and changes rules, so no builder is spawned until the `pipeline-designer` reports "holds", or Josh has answered its note and the architect has re-cut on his answer.~~ **The pre-check is done and Josh has answered it (Q24); this is the re-cut on his answer, so the builder may start.**

**Josh's words (21 Nov 2026, in chat; Q24).** Asked the H3 pre-check's five questions (`docs/design/070-H3-precheck.md`, section 4), each as recommended, he answered: "Yes to all except novelty signs. They can be placed on the face of a build in addition to the roof. They represent the store in the storefront. A pizza should correspond with a pizza shop and a beer bottle, for example, should correspond with a liquor store or a corner store." So Q1 yes (RT: `ROOF_DECK_M` 0.5), Q2 yes (BB: a billboard edge of 0.28 m), Q4 yes (HC, RC, RK and RW as written), Q5 yes (`DRESS_MAX` left off on the pipeline; J checks the frame rate). Q3 is neither yes nor no: **H3 places no novelty sign** (NV below); novelty signs, on the roof and on a building's face, each standing for the shop under it, are section H1c's.

**Josh's words (21 Nov 2026, in chat, relayed by the main session).** Asked whether H3 starts, Josh said: "Yes, start H3". The same day he ruled that 3 x 3 cities are best effort: no criterion, probe or tuning for them; they are reported only (the main session's relay of his ruling). So in this section the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) are reported in criterion 8 and nowhere else, and the pre-check measures none of them.

**Goal.** Every pipeline roof carries the tile city's rooftop items: small roof props (air-conditioners, a dish, vents) on most roofs, and on about half the buildings one big prop (a water tower, a roof exit or a billboard; ~~or once a run a novelty sign~~: novelty signs are H1c's, Q24). Every roof exit stands wholly on its roof, its door facing away from every open side of its column, with clear deck in front of it, on a blind column where the building has one (068; Josh, 19 Nov 2026: "roof top exists shouldn't open to the street. They should be on the roof."). Nothing changes in 3D until J draws them. The flat picture of the `facades` stage gains them as points.

**Re-cut (21 Nov 2026, the lead-architect, against 4ddae06).** The first cut was three lines, written before F2 and H1. It now reads what is merged:
- `buildings.columns` (F2): each column's `kind`, `front`, `side`, `yaw`, `rowId`, and its last piece, the roof (`role` "roof", `storey` = the building's `storeys`, its `placement.key`: a mid roof on a mid or blind column, a corner roof on a corner one; seated by `seatOnBody`, its back plane on the cell's back edge);
- `buildings.buildings` and `buildings.rows` (F1): buildings in row order, `storeys`, `row`; and H1b's runs (B2, `runsOf` in `dress.ts`, read only);
- `mass.built` (C3): each column's open sides with their `frontage`;
- `facades.dressing` (H1b) and `facades.walls` (H2, H2b): only to count each column's pieces against `DRESS_PER_BAY_MAX` (RC) and to keep clear of the party-wall kit (RK). H3 reads them and changes neither;
- the tile city as `city=tiles` runs it today: `dressBlock`'s "big roof prop" and "small roof props" blocks, `roofCell`, `onRoof`, `RunUsed`'s `billboard` and `novelty`, `ROOF_TURNABLE`, and the key lists and numbers above them (`src/render3d/dressing.ts`); R8 (`citymetrics.ts`: `CITY_CHECK.R8` 0.9 and `CITY_BIG_ROOF_RUNS_MIN` 0.5, its `BIG_ROOF` pattern); and 068's text (never built; superseded by 070 into this section).

The type is written: `CityRoofPieceKind`, `CityRoofPiece` and `CityFacadesLayer.roofs` (`src/core/cityplan.ts`, "stage 7, H3"), with the frame, roof and exit rules in the comment above them. **`roofs` is a field of its own**, not more kinds in `walls`: H1b's `dressFailures`, H2's `wallFailures` and `wallReport`, and H2b's `partyFailures` keep reading exactly the lists they read, so H2b's stop (PW7, another section's checks reading a shared list) cannot happen here. `roofs` is optional, as `walls` was, so every earlier fixture and G2's type-check unchanged; from H3 the stage always writes it. `ground`, `dressing`, `walls` and every earlier type do not change, so G2 reads exactly what it read.

It runs on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on; `NAMED` in `src/city/facades/testcities.ts`) and pins the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on).

**What it ports** (`dressBlock`, moved line for line unless a reading below says otherwise):
- **The big roof prop:** at most one a building, by chance `P_ROOF_LARGE` (0.5); the kinds tried in a hashed rotation of water tower, roof exit and billboard, ~~with the novelty sign tried first on the run's lowest building while the run has none~~ (no novelty sign is tried: NV, Q24); the columns tried in a hashed rotation of the building's mid-roof columns (but the exit: RX); the first kind and column that fits is taken. The billboard is its structure plus one face (`BILLBOARD_FACES`, by hash), the structure stepped back by the face's depth, the face `BILLBOARD_SIGN_Y_M` (0.9) up the structure; at most one billboard a run (`RunUsed`'s `billboard`; its `novelty` count stays 0 in H3).
- **The small roof props:** on each roof column without the big prop, by chance `P_ROOF_SMALL` (0.7); one, or two (`ROOF_SMALL_PER_BAY` 2, by chance `P_ROOF_SECOND` 0.4) in the column's left and right halves; each key tried in a hashed rotation of `ROOF_SMALL`, at a hashed spot inside its cell (`fx`, `fz`); a turnable key (every one but the dish) half-turned by hash.
- **The roof exit:** 068's criterion 1 on cells (RX, RD, RW below), with its fallback: where no column can hold the housing and its deck, the building takes the next big kind, as when any prop does not fit.
- **The keys and numbers:** `ROOF_SMALL`, `ROOF_WATER_TOWER`, `ROOF_ACCESS`, `BILLBOARD_STRUCTURE`, `BILLBOARD_FACES`; `P_ROOF_SMALL`, `P_ROOF_LARGE`, `P_ROOF_SECOND`, `ROOF_SMALL_PER_BAY`, `ROOF_EDGE_M` 0.3, `BILLBOARD_SIGN_Y_M` 0.9; H1b's `DRESS_PER_BAY_MAX` 6; R8's 0.9 and 0.5. `ROOF_ACCESS_CLEAR_M` 1.2 is the grammar's (rule 11; 068's Interfaces) and exists in no code yet: it is typed in this folder and pinned at 1.2 by a test, naming rule 11. **`NOVELTY_SIGNS` is not ported** (NV; H1c copies it). **Two numbers are new, Josh's (Q24):** `ROOF_DECK_M` 0.5 (RT, answer 1) and `BILLBOARD_EDGE_M` 0.28 (BB, answer 2), typed in this folder.

**What the tile city's words mean on cells.**
- **A block is a building, a run is H1b's B2** (unchanged). `P_ROOF_LARGE`'s draw and every `lot.key` salt are per `CityBuilding`, through the stage's `rand("roof", <slot>, building id, ...)` and `unitOf` / `indexOf` (`hash.ts`, read only), as `dressUnit(lot.key, slot, col)` and `rotated` were. `RunUsed` is threaded along each run in `buildings.buildings` order, which is each run's own order (B2). The column index `i` is the building's column order along its row.
- ~~**RL. The run's lowest building** (`stack.height_m`, the novelty sign's place) is the run's building with the fewest `storeys`; on a tie, the first along the run (`dressSites`' strict "<").~~ Struck (Q24): it only placed the novelty sign, which H3 does not place (NV). H1c says where a novelty sign goes.
- **NV. No novelty sign in H3** (Josh, 21 Nov 2026, Q24: "Yes to all except novelty signs. They can be placed on the face of a build in addition to the roof. They represent the store in the storefront."). The kind rotation is water tower, roof exit and billboard in `dressBlock`'s hashed order on every building, the run's lowest included; the novelty sign is never tried first. This is the pre-check's "RN street-only" setting carried to every front: a building that would have taken a novelty sign takes the rotation's first kind that fits. `CityRoofPieceKind` keeps `"novelty"` for H1c; H3 writes none, and its roofs check fails one (criterion 5).
  - **R8 without them** (the architect's reading of the note's numbers; the builder's criterion 8 confirms it). R8's second number counts runs with any big prop, and a novelty sign was only tried inside the building's `P_ROOF_LARGE` draw (`dressBlock` line 552), so taking it out changes no building's draw. Where a novelty sign stood, the water tower fits too: it is 2.420 by 2.419 m, and the smallest deck is 4.40 by 3.902 m (RK insets one side, 0.498 at most); with HC there is no height cap, and the cap (RC) counts a tower as one piece, as it counted the sign. So every building with a big prop keeps one, and R8's first and second numbers are those of the note's table (lowest 0.965 and 0.652). The note measured this directly for 2,836 of the 4,662 signs (its RN street-only setting: R8 identical on all 20 runs); the other 1,826 (street fronts) fall through by the same rotation. **If R8 fails on a named run, the stop rule stands** (R-2): nothing is tuned.
- **R8's scope** (grammar: "R8 keeps its threshold over all buildings; the count grows with ring 2"). Its first number, the share of buildings with at least one roof piece, is over every `CityBuilding`; its second, the share of runs with a big prop (`BIG_ROOF`: water tower, roof exit, billboard, novelty sign), over every B2 run, street and quiet.
- **RE. The deck** (`roofCell`; grammar rule 11: "`ROOF_EDGE_M` inside the body's edge, not the cornice's"). The old path took the roof piece's bounds (its cornice) cut to the column, less `ROOF_EDGE_M`. On the pipeline the body is the cell (M1; the roof's base course is 5.02 m on the 5.00 m body), so a roof prop's footprint stands inside the cell less `ROOF_EDGE_M` on every side: a 4.40 by 4.40 m square in the column's own frame, from -2.2 to +2.2 in x and z. This is rule 11 as written; it is named because of BB.
- **BB. The billboard stands 0.28 m from the roof's edge** (Josh, 21 Nov 2026, Q24 answer 2: "Yes", to "The rooftop billboard is 3 cm too wide for the roof, so as written there are no billboards at all (water towers stand in). Let billboards stand 0.28 m from the roof edge instead of 0.3, giving about 40 street billboards a city?"). `SM_Prop_Billboard_Roof_01` is 4.428 m wide (`dressing.test.ts`' fixture), 0.028 m more than the 4.40 m deck that `ROOF_EDGE_M` 0.3 leaves. For the billboard's structure and face only, the deck's edge is `BILLBOARD_EDGE_M` 0.28 in from the cell's edge (a 4.44 m deck); every other key keeps `ROOF_EDGE_M` 0.3. RK's insets apply to the billboard as to every key (where RK's inset is deeper than 0.28 it wins), and RB still holds. The pre-check measured 791 billboards on the 20 runs (29 to 55 a run), all on street mid columns, the board 0.286 m inside the walls, 0 party-wall clashes, R8 unchanged. ~~The billboard fits no roof ... the rotation falls through to the next kind.~~ (the first cut's finding, confirmed by the pre-check and overruled by Josh's answer).
- **RB. A billboard only on a street front** (grammar rule 11's line, on faces the tile city never had). Every tile-city roof column fronted a street. On the pipeline a billboard may stand only on a mid column whose `front` is an open side with street frontage (street, park edge, plaza), never on a blind column or a quiet front. With BB's 0.28 m it is live: the pre-check found it keeps the billboard off 1,607 quiet-front tries and 219 blind-column tries.
- ~~**RN. A novelty sign on any run** (the tile city's rule, on faces it never had). The novelty sign goes on its run's lowest building, street or quiet, facing its column's front, as `dressBlock` places it. The pre-check counts the novelty signs on quiet fronts and on blind columns.~~ Struck (Q24): Josh did not take street-only (the note's Q3) and gave a new rule instead; H3 places no novelty sign (NV) and H1c places them.
- **RT. The deck height is `ROOF_DECK_M` 0.5 on all six roof keys** (Josh, 21 Nov 2026, Q24 answer 1: "Yes", to "Roof props stand on the flat roof at 0.5 m on every roof style (styles 2 and 3 have a 0.74 m rim round the edge; standing on the rim would leave two thirds of roof props floating)?"). A roof prop's base stands at the roof piece's base (3 x `storeys`) plus `ROOF_DECK_M` 0.5, measured from the GLB by the pre-check for `Roof_01`, `_02`, `_03`, `Roof_Corner_01`, `_02`, `_03` (styles 2 and 3's 0.744 m bounds top is a rim outside the deck). It is typed in `roofkit.ts` and pinned to the GLB in `roofpin.test.ts` (criterion 1). `PARTY_ROOF_H_M` (0.744) stays as it is for H2b's party-wall room, which is measured to the rim at the wall. ~~(the first cut: base at the roof key's bounds height, 0.500 or 0.744)~~
- **HC. No height cap** (`onRoof`'s `heightMax`, the lot's `hMax`). The old path's big prop had to stand under its lot's height cap (`TERRACE_CAPS_M` 16, 13 or 10 m on a terrace lot; town.ts's clearance), and small props had none (`Infinity`). The pipeline has no lots and no cap: R2's 3 to 5 storeys and F2's frame fix every roof. So a big prop is held only by its footprint (RE). This removes a limit, and the pre-check measures what it lets in: big props by storeys, and the tallest top. **Answered yes, as written (Josh, 21 Nov 2026, Q24 answer 4: "Yes", to "Four rules as written: no height limit on roof props (tallest top 21.9 m); roof props come last when a column is full (about 5 small props a city dropped); roof props keep clear of party-wall windows and pipes; the roof exit keeps 1.2 m of clear roof as wide as the hut in front of its door?").**
- **RC. Roof pieces are counted last against `DRESS_PER_BAY_MAX`** (052's cap: the style guide's list, "glass, awnings, the big roof prop, the fire escape, signs, the door canopy, small roof props, the ATM, wall props"). `dressBlock` gave the big roof prop its column before signs, the canopy and wall props, and small props before the ATM and wall props. On the pipeline H1b's and H2's pieces are merged and do not move (their digests are pinned, criterion 7), so H3 counts what is on each column already (H1b's dressing, the escape's weight as H2's `escapeWeight` gives it, H2's canopies and upper-wall props; no party-wall piece, PW7) and places a roof piece only where the column has room left. A billboard counts as two (structure and face), as `accept` counted the group. This is a change of priority order: the pre-check counts the roof pieces the cap turns away. **Answered yes, as written (Josh, 21 Nov 2026, Q24 answer 4: "Yes", to "Four rules as written: no height limit on roof props (tallest top 21.9 m); roof props come last when a column is full (about 5 small props a city dropped); roof props keep clear of party-wall windows and pipes; the roof exit keeps 1.2 m of clear roof as wide as the hut in front of its door?").**
- **RK. Clear of the party-wall kit** (new; the tile city had no party walls). H2b's kit pieces hang on a taller building's wall over the lower roof beside it, as deep as 0.118 m (board), 0.370 m (window) and 0.498 m (pipe): the window and the pipe reach past `ROOF_EDGE_M` onto the lower deck. So on a side of a roof cell where a party-wall piece stands over it, the deck's edge on that side is inset by the deepest such piece's depth where that is more than `ROOF_EDGE_M`. No new number. The pre-check counts the clashes the plain port would make and what RK takes away. **Answered yes, as written (Josh, 21 Nov 2026, Q24 answer 4: "Yes", to "Four rules as written: no height limit on roof props (tallest top 21.9 m); roof props come last when a column is full (about 5 small props a city dropped); roof props keep clear of party-wall windows and pipes; the roof exit keeps 1.2 m of clear roof as wide as the hut in front of its door?").**
- **RX. The exit's column** (068 criterion 1: "a blind column of the building, then a court-side (ring-2) column, then a mid column"). On cells a building is one row, so all its mid columns are court-side (a ring-2 building) or none are: the middle tier is either the whole of the last or empty. So the exit's columns are tried blind columns first, then mid columns, each tier in the hashed column rotation. A corner column carries a corner roof, which takes no big prop (`DRESS_SLOTS`' "roof.corner"), so it never holds an exit. The grammar's "Where its building has a blind or court-side column, it stands there" reads: where the building has a blind column that holds the housing and its deck, the exit is on one.
- **RD. The door side** (068 criterion 2: "It is `DRESS_FRONTS`'s for the key, '+z' today"). The housing's door is its own +z. It is placed with its back against the column's front edge of the deck (068: "With the housing at the cell's street side, that is a half-turn") and turned a half-turn from the column's yaw, so its door faces the column's back (`facing` is the side opposite `front`). On a mid column the one open side is the front, so the door faces away from it; a blind column has no open side. The pre-check confirms "+z" from the GLB (the recessed door face); if it is another face, the turn follows it and nothing else changes.
- **RW. The clear deck's width** (068: "at least `ROOF_ACCESS_CLEAR_M` (1.2 m) deep, and as wide as the door"). No table has the door's width. H3 holds the clear deck as wide as the housing's own bounds width (2.758 m), which covers its door whatever its width: a stricter reading that needs no new measured number. The deck is the rectangle in front of the door, from the housing's door face 1.2 m toward the back, inside the deck (RE, RK), with no other roof piece on it. As read, the housing (2.851 m deep) and its deck (1.2) take 4.051 m of the 4.40 m deck; with RK's deepest inset at the back (0.498) they take 4.051 of 4.202. **Answered yes, as written (Josh, 21 Nov 2026, Q24 answer 4: "Yes", to "Four rules as written: no height limit on roof props (tallest top 21.9 m); roof props come last when a column is full (about 5 small props a city dropped); roof props keep clear of party-wall windows and pipes; the roof exit keeps 1.2 m of clear roof as wide as the hut in front of its door?").**
- **The kerb** (`faceP.z + d / 2 <= kerb`, the billboard face's reach): moot on the pipeline, where every roof piece stands inside its cell (RE).

**Which readings are moves and which add or change a rule or a number** (as put to the pre-check; each now answered by Josh, Q24):
- **Moves, numbers unchanged:** every key list and number under "What it ports"; the block and the run (B1, B2); ~~RL~~ (struck, NV); R8's thresholds and its scope (the grammar's line); RE (rule 11 as written); RX (068's order on cells); `ROOF_ACCESS_CLEAR_M` 1.2 (rule 11's number, typed in for the first time).
- **Add or change a rule** (the architect's readings; for the pre-check to measure and Josh to see):
  - **HC removes the old path's height cap** on big props;
  - **RC changes `dressBlock`'s priority order**: roof pieces take what room H1b's and H2's merged pieces leave;
  - **RK adds a rule** (roof props clear of the party-wall kit);
  - **RB** says where a billboard goes on faces the tile city never had (quiet fronts, blind columns); ~~RN~~ struck: H3 places no novelty sign (NV, Q24);
  - **RW** reads the deck's width as the housing's, in place of an unmeasured door width.
- **Numbers added (Q24):** RT's `ROOF_DECK_M` 0.5 (answer 1) and BB's `BILLBOARD_EDGE_M` 0.28 (answer 2). RD is "+z", confirmed from the GLB: no number.
- **What is placed changes:** NV (no novelty sign; Q24). ~~BB (no billboard on any pipeline roof)~~: overruled by Q24 answer 2.
- **No threshold changes:** R8's 0.9 and 0.5, `DRESS_PER_BAY_MAX` 6, `ROOF_EDGE_M` 0.3 (every key but the billboard) and the chances stay. **`DRESS_MAX` is not applied on the pipeline** (Josh, Q24 answer 5: "Yes", to "With roofs, a city has about 6,300 to 7,700 dressing pieces, over the tile city's 6,000 budget. Leave the budget off and let J check the frame rate?"): criterion 8 reports it as passed, for J. **R8's numbers are never lowered** (R-2): if R8 fails on a named run, the builder stops, and the choice goes to Josh through the main session.

**Pre-check first: done** (21 Nov 2026, the `pipeline-designer`, at 55aba63; `docs/design/070-H3-precheck.md`). It did not report "holds": R8, M9b, the deck, the roofs and the cap held on 20 of 20 runs, but RT, BB and RN needed Josh's word. He answered (Q24) and this section is re-cut on his answer. The text as cut: Before the builder starts, the `pipeline-designer` ("pre-check 070 H3", on `goal/city-style` at this commit) measures the questions below on the 20 named runs, with a probe outside the repo, the fixture bounds of `src/render3d/dressing.test.ts` and `citymetrics.test.ts`, and the converted GLB where a question asks for it. No 3 x 3 or 6 x 4 city is measured (Josh's ruling of 21 Nov 2026). If it does not report "holds", its note (`docs/design/070-H3-precheck.md`) goes to Josh before any builder is spawned; the architect re-cuts on his answer.

0. [ ] **First, by the lead-architect (done with this re-cut, on `goal/city-style`):** `CityRoofPieceKind`, `CityRoofPiece` and `CityFacadesLayer.roofs` in `src/core/cityplan.ts`. No reader changes. **(21 Nov 2026, Q24 re-cut)** The comment above them now says H3 writes no `"novelty"` piece (NV) and that the kind is kept for H1c; no type changes.
1. [ ] **The roof kit table** (R-6). Typed-in data in the folder (a new `roofkit.ts`): every key list and number under "What it ports", as copies; `ROOF_ACCESS_CLEAR_M` 1.2 (rule 11); R8's two numbers (`ROOF_DRESSED_MIN` 0.9, `BIG_ROOF_RUNS_MIN` 0.5) and the `BIG_ROOF` kinds; each key's bounds (w, h, d), as `src/render3d/dressing.test.ts`' fixture has them (the water tower and the two vents as `citymetrics.test.ts`' fixture has them); the roof keys' bounds heights, as copies of the buildings kit's; **`ROOF_DECK_M` 0.5 for the six roof keys (RT, Q24 answer 1) and `BILLBOARD_EDGE_M` 0.28 (BB, Q24 answer 2)**. No novelty key (NV). ~~and, if the pre-check's answer makes them numbers, RT's deck heights and RD's door face~~ (RD is "+z": no number).

   New `src/render3d/roofpin.test.ts`:
   - **Always (no GLB):**
     - each key list and number equals `dressing.ts`'; R8's two numbers equal `citymetrics.ts`' `CITY_CHECK.R8` and `CITY_BIG_ROOF_RUNS_MIN`; the roof heights equal the buildings stage's kit (`src/city/buildings/kit.ts`, read by the test only, as `partywallpin.test.ts` reads it);
     - `ROOF_ACCESS_CLEAR_M` is 1.2 (rule 11; pinned, not compared: the old path never had it);
     - `ROOF_DECK_M` is 0.5 for each of `Roof_01`, `_02`, `_03`, `Roof_Corner_01`, `_02`, `_03`, and `BILLBOARD_EDGE_M` is 0.28 (each pinned, not compared, naming Josh's Q24 answers 1 and 2);
     - `DRESS_NUDGE_M` and `DRESS_FRONTS` name none of these keys, so every key's own front is +z (the exit's door: RD);
     - each key's bounds equal the fixtures'.
   - **Inside `it.skipIf(!HAVE_GLB)`**, read lazily as `escapepin.test.ts` does: every key's bounds equal the converted GLB's within 0.005 m; **and each of the six roof keys' deck, the top of the flat region inside its body (a grid of samples over the deck, as the pre-check took 46 x 46), is at `ROOF_DECK_M` within 0.005 m** (RT pinned to the GLB).
2. [ ] **The choice** (the port; R8's scope, BB, RB, NV, HC; Vitest, on the 20 named runs). The stage writes `facades.roofs` in the order `cityplan.ts` gives:
   - at most one big prop a building, only on a mid roof (a mid or blind column); a billboard is its structure and its face, on one column; at most one billboard a run; **no `novelty` piece anywhere (NV)**;
   - a billboard only on a mid column with a street front (RB), its structure and face inside the cell less `BILLBOARD_EDGE_M` (BB) and RK's insets; **every named run has at least one billboard** (the pre-check: 29 to 55 a run), so BB is exercised, not only allowed; no share is asserted;
   - small props only on columns without the big prop, at most `ROOF_SMALL_PER_BAY` a column, of `ROOF_SMALL`'s keys, the dish never half-turned;
   - every choice is the stage's `rand` (R-3), salted with the building's id; the same city twice gives the same layer.
3. [ ] **The roof exit** (M9b; RX, RD, RW; Vitest, on the 20 named runs). Every `exit` piece:
   - stands wholly on the deck (RE, with RK's insets): its footprint inside it;
   - its `facing` (its door) is the side opposite its column's `front`, and is not an open side of its column; the door's outward normal has a non-positive component along every open side's outward normal (068 criterion 3);
   - has its clear deck (RW: `ROOF_ACCESS_CLEAR_M` deep, the housing's width, in front of the door, inside the deck) with no other roof piece on it;
   - is on a blind column wherever its building has a blind column that holds it (RX); else on a mid column; never on a corner column.
   The test finds exits on blind and on mid columns on the named runs, so both tiers are exercised, not only allowed.
4. [ ] **Placements** (ported; RE, RT, RD; Vitest). From the tables only, in the column's own frame, then turned by its `yaw` (plus the half-turn: the exit always, a turnable small prop by hash); no scale. Each base at the roof's base (3 x `storeys`) plus `ROOF_DECK_M` 0.5 (RT), on every roof style; each footprint inside the deck (a billboard's inside its 0.28 m deck, BB). A big prop with its front edge on the deck's front edge, centred across (`onRoof`'s "front"); a small prop at its hashed spot (`fx`, `fz`) inside its cell or half-cell. Hand-worked tests, each pivot computed by hand from the bounds:
   - a water tower on a 4-storey style-1 mid column at two turns (base 12.500);
   - a roof exit on a blind column and on a mid column, each at two turns, with its `facing`, its footprint and its clear deck;
   - a water tower on a style-2 roof (base 3 x `storeys` + 0.5, not + 0.744: RT) ~~a novelty sign (`LargeSign_Pizza_01`) on a style-2 roof~~ (NV);
   - a billboard (structure and face) on a street mid column at two turns: the structure 0.28 m in from the cell's side edges within 0.02 (BB: 4.428 m in a 4.44 m deck), the face `BILLBOARD_SIGN_Y_M` up the structure and in front of it;
   - two small props in one column's halves, one half-turned, one a dish (not turned);
   - a column next to a taller building's party window (RK): its deck edge on that side 0.370 in, not 0.3.
5. [ ] **The checks** (Vitest, on the 20 named runs). Each is a function of the layer, `buildings` and `mass` (and, for RC and RK, the layer's `dressing` and `walls`, read only), in a new `roofcheck.ts`, run by the stage after H2b's checks and before it returns; a failure names the check and the cells. **Stop rule:** if one fails on a named run, the builder stops and reports (R-2). It does not loosen a rule or tune a chance.
   - **R8:** the share of buildings with at least one roof piece is at least 0.9; the share of B2 runs with a big prop is at least 0.5 (R8's scope).
   - **M9b, the roof exit:** criterion 3's four clauses.
   - **The deck** (RE, RT, RK, BB): every roof piece's footprint inside its column's deck (`ROOF_EDGE_M` in, `BILLBOARD_EDGE_M` for a billboard's two pieces, or RK's inset where deeper), its base on the deck within 1e-6 m; no two roof pieces' footprints overlap.
   - **The roofs** (criterion 2): the big prop on a mid roof only, one a building; the run's billboard cap; RB; no `novelty` piece (NV); small props off the big prop's column and at most `ROOF_SMALL_PER_BAY` a column; every key of its kind's list.
   - **The cap** (RC): on every column, H1b's dressing, the escape's weight, H2's canopies and upper-wall props and the roof pieces together are at most `DRESS_PER_BAY_MAX`; no party-wall piece counts (PW7).
   - **H1b's, H2's and H2b's checks** run as they are, on the whole layer (`dressFailures`, `wallFailures`, `partyFailures`, unedited); `roofs` is not in what they read.
   - **Failing fixtures** (a new `rooffixtures.test.ts`). Each built from the default city's layer (6 x 6 seed 1, one-way on), typed in from the run in the test (not pinned by hash), with one thing changed:
     - **today's placement** (068 criterion 3's fixture): one exit turned back to its column's yaw, its door toward the street (`facing` its column's `front`), fails M9b on the door;
     - an exit moved onto a mid column of a building that has a blind column (where the default city has one; else a fixture building's blind column is typed in) fails RX;
     - a small prop moved onto an exit's clear deck fails M9b on the deck;
     - an exit moved 0.2 m toward its column's front edge (past `ROOF_EDGE_M`) fails the deck;
     - a small prop raised 0.1 m off the deck fails the deck's base;
     - a small prop moved into the footprint of a party window or pipe over its roof fails RK (where the default city has none, a party window is typed in on a face over a roof with a prop);
     - a big prop moved onto a corner column fails the roofs; a second big prop on one building fails them; a second billboard in one run fails them; **a `novelty` piece (`LargeSign_Pizza_01`) put on a street mid column with room for it fails them (NV)** ~~a second novelty sign in one run, and one on a building that is not its run's lowest~~;
     - a billboard moved 0.03 m toward a side edge (past `BILLBOARD_EDGE_M`) fails the deck;
     - a billboard (structure and face) put on a quiet front fails RB;
     - a roof piece added to a column already at `DRESS_PER_BAY_MAX` fails the cap; and one positive test: a column whose only extra pieces are party-wall pieces passes the cap (PW7);
     - every roof piece removed fails R8's first number; every big prop removed fails its second.
6. [ ] **The picture** (R-5). The facades picture's cells and H1b's, H2's and H2b's points are unchanged. Three legend entries are appended (indices 16 to 18, after "party-wall kit"): "roof prop" (one point per small prop), "big roof prop" (one per water tower and billboard structure; a billboard's face has none; H1c adds the novelty sign's) and "roof exit". The R-5 test in `stage.test.ts`, as H2b's, checks every point's legend against its piece, after the walls' points.
7. [ ] **R-1 to R-7 for `facades`** (Vitest).
   - The stage still reads only `mass`, `buildings`, and the streets' `w` and `h`; H1's grep test stands unedited and covers the new files.
   - **R-4, the facades digest re-pin:** the facades digest is re-pinned on the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on). It changes, because `roofs` is new. H2b's pins (`40e4d207`, `06116698`, `60227c74`, `3610b49d` in `stage.test.ts`) are replaced, and the builder's report names the old and the new.
   - **The earlier fields do not move:** `ground` and `dressing` keep their pins in `stage.test.ts` (`H2_LAYERS`, unedited), and the test adds `walls`' digest on the four pin cities, taken from H2b's run at 4ddae06 before any H3 code (the builder's report names the four). The streets, land, mass, edge and buildings digests are unchanged, and the test double still leaves them equal.
   - R-7: 6 x 6 seed 1 ends `ok`.
8. [ ] **The numbers** (reported, not asserted; a new `roofreport.test.ts`). For each of the 20 named runs:
   - buildings, buildings with a roof piece, R8's first share; runs, runs with a big prop, R8's second share; the lowest of each and its run;
   - big props by kind and key, and by column kind (blind, mid); by storeys (HC); the tallest top;
   - exits on blind and on mid columns; buildings whose exit fell through to the next kind (RX's fallback);
   - billboards placed (BB; the pre-check: 29 to 55 a run) and where the rotation fell through from them, and the tries RB and RK turned away; the buildings on each run's lowest (the old novelty place) by the kind they took instead (NV);
   - small props by key, one or two a column;
   - roof pieces the cap turned away (RC), by kind; deck edges RK inset, and by which kit piece;
   - roof pieces in all, and with H1b's dressing and H2's and H2b's walls against `DRESS_MAX` (C1; for J's draw calls). **`DRESS_MAX` is reported as passed, not applied** (Q24 answer 5): the report names the runs over 6,000 and by how much, and J checks the frame rate.

   For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) that reach stage 7: whether it is ok, and its failure if not. Best effort, report only (Josh, 21 Nov 2026): no criterion, probe or tuning reads them.
9. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=facades` shows the picture with roof-prop, big-prop and roof-exit points. `?view=3d&city=plan&stage=assemble` and `?view=3d&city=tiles` look as on `goal/city-style` (J draws the roofs).
10. [ ] R-8 to R-11. The builder runs these tests only: `npx vitest run --maxWorkers=2 src/city/facades/stage.test.ts src/city/facades/roof.test.ts src/city/facades/rooffixtures.test.ts src/city/facades/roofreport.test.ts src/city/pipeline/run.test.ts src/render3d/roofpin.test.ts src/render3d/planview.test.ts src/render3d/plan3d.test.ts`, and one `npx tsc --noEmit`. `plan3d.test.ts` is run, not edited: it runs stage 7 and must still pass. The earlier facades test files are not run by the builder (`roofs` is a field they do not read; the main session's gate runs them). The main session's gate is the full `npm run gate`.

- **Files:** `src/city/facades/`: new `roofkit.ts`, `roofs.ts` (the choice and the placement), `roofcheck.ts`, `roof.test.ts`, `rooffixtures.test.ts`, `roofreport.test.ts`; edits to `stage.ts` (build the roofs after H2b's pieces, write `roofs`, run `roofFailures` after `partyFailures`, the three legend entries and the picture's points; nothing else), `stage.test.ts` (the re-pin, the `walls` digest pin, the picture test's legend list and points; nothing else) and `index.ts` (the new modules' exports). New `src/render3d/roofpin.test.ts` (the one render3d file it adds).
- **Must not:**
  - `src/core/` (criterion 0 is the architect's);
  - every other `src/city/` folder, and `src/city/stages.ts`;
  - `src/city/pipeline/` (`run.test.ts` is run, not edited);
  - **every other file of `src/city/facades/`**, by name: H1's `kit.ts`, `place.ts`, `check.ts`, `facts.ts`, `constants.ts`, `hash.ts`, `testcities.ts`; H1b's `dresskit.ts`, `dress.ts`, `dresscheck.ts`; H2's `wallkit.ts`, `escape.ts`, `walls.ts`, `wallcheck.ts`; H2b's `partykit.ts`, `party.ts`, `partycheck.ts`; and every existing test file but `stage.test.ts` (`fixtures.test.ts`, `place.test.ts`, `report.test.ts`, `dress.test.ts`, `dressfixtures.test.ts`, `dressreport.test.ts`, `escape.test.ts`, `escapefixtures.test.ts`, `escapereport.test.ts`, `party.test.ts`, `partyfixtures.test.ts`, `partyreport.test.ts`). H3 may import from any of them (`runsOf`, `escapeWeight`, `PARTY_WALL_KINDS`, `PARTY_BOUNDS`, `CELL_M`, `unitOf`, `indexOf`, `keyOf`) and edits none. **If one of their checks, metrics or tests reads `roofs`, or H3 needs a change in one of them, the builder stops and reports, and the architect re-cuts** (no H2b-style workaround in `stage.ts`);
  - `src/render3d/` but the new pin test: `dressing.ts`, `citymetrics.ts`, `plan3d.ts` and their tests are read only; `groundpin.test.ts`, `shopfrontpin.test.ts`, `escapepin.test.ts`, `partywallpin.test.ts` and `plan3d.test.ts` are run or left, not edited.
- **Interfaces:** criterion 0. J reads `facades.roofs` (each piece's `kind` and `placement`). G2 reads nothing new. No new dependency.
- **Adds and changes rules; changes no threshold** (all answered, Q24). HC, RC, RK, RB and RW add or change rules on the pipeline; NV takes the novelty sign out (H1c's); RT adds `ROOF_DECK_M` 0.5 and BB `BILLBOARD_EDGE_M` 0.28, Josh's numbers. Every other key list, chance, cap and threshold is the tile city's or the grammar's, copied and pinned; R8's 0.9 and 0.5 do not move.
- **Heavy:** the named-run tests build the 10 named cities, both ways, once each, through `testcities.ts`' module cache, with a 120 s timeout. Criterion 8's report has its own file.

**The H3 pre-check's questions** (done, 21 Nov 2026, `docs/design/070-H3-precheck.md`; answered by Josh, Q24; kept as they were asked) ("pre-check 070 H3", the `pipeline-designer`, on `goal/city-style` at this re-cut; the 20 named runs, one-way off and on; a probe outside the repo; no 3 x 3 or 6 x 4 city):
1. **R8 as ported, both numbers.** Per run: buildings, buildings with a roof piece, the first share; B2 runs (street and quiet), runs with a big prop, the second share; the lowest of each and its run. Does R8 hold 0.9 and 0.5 on all 20? Each with RC (roof pieces last) and, for comparison, with `dressBlock`'s order, and with and without BB's billboard.
2. **BB and RE.** Confirm the billboard structure (4.428 m) fits no 4.40 m deck at its street-facing turn. What fits the deck of each big and small key (width and depth against 4.40, a half-cell 2.20 wide for a second small prop). How often the kind rotation falls through from the billboard, and to what. If R8's second number fails because of BB, word the options for Josh (the billboard never placed; the deck measured from the roof's own body for the billboard only; another).
3. **RT, the deck height.** From the GLB, each roof key's deck height (the top of the flat region inside its body) against its bounds' height (0.500, 0.744). If a deck stands below its bounds' top, by how much; recommend the number per key.
4. **RD, the door face.** From the GLB, which face of `SM_Bld_Roof_Access_01` carries the door (the recessed face; 068 criterion 2: the face areas, -z 5.9 m², +z 7.0 m², do not settle it). Is it +z?
5. **HC.** Big props by building storeys (3, 4, 5) with no cap; each one's top; how many the old path's caps (`TERRACE_CAPS_M` 16, 13, 10, by which cap the tile city's lots of that height carry) would have refused; the tallest top over the city.
6. **RC.** Columns where the cap turns a roof piece away (big and small), by what fills them (escape weight, dressing, canopy, wall props); what R8 loses to it.
7. **RK.** Roof cells with a party-wall piece over them; clashes the plain port (inset 0.3) would make, by kit piece (board, window, pipe); what RK's inset takes away (props, exits that no longer fit).
8. **RX and RW.** Buildings with a blind column; exits by tier (blind, mid); exits whose housing and deck (2.851 + 1.2 m, 2.758 m wide) do not fit their column, and the fall-throughs; any exit whose door would face an open side.
9. **RB and RN.** Novelty signs per run by where (street front, quiet front, blind column); billboards that RB would keep off quiet fronts and blind columns if BB did not hold.
10. **The totals.** Roof pieces per run by kind, and with H1b's dressing and H2's and H2b's walls against `DRESS_MAX` (C1), for J.

### H3b · Stage 7, Facades: the water-tower cap (facades, pure). Branch `ticket/070h3b-facades-tower-cap`
**Branch.** Cut from `goal/city-style` at the commit of this re-cut or later. H3 is merged (194643e); the pre-check is fde73d7 and Josh's answer 4fe9697. ~~The pre-check comes first, then Josh's answers, then the architect's re-cut, then the builder.~~ **The pre-check is done and Josh has answered it (Q25). This is the re-cut on his answer, so the builder may start.** H3b goes before H1c's pre-check: H1c's roof sign takes the place of a building's big prop, so H1c measures on the capped roofs.

**Josh's words (21 Nov 2026, in chat).**
- The rule is his. He said "Create a rule where there can only be so many water towers per city blocks", then: "Fine. You get one water tower per x amount of buildings. I don't want to see water towers across the entire city because they just fit".
- **Q25.** He was asked the H3b pre-check's three questions (`docs/design/070-H3b-precheck.md`, section 4), each as recommended:
  1. count one water tower per X buildings on each street block, with the hashed pick;
  2. X = 16, about 44 towers a city;
  3. option (c): a roof that loses its tower gets a roof exit only where its row would otherwise have no big roof item, and small props otherwise.

  He answered: **"Yes to all"**. So TX is (a), TS stands as cut, X is 16 (Decided), and freed roofs follow TF below.

**Goal.** Water towers are a landmark, not a filler. Each street block has at most one water tower for every 16 of its buildings, about 44 a city instead of 255. Most blocks get one, a few get two, at most 3 on any block, and a block of fewer than 16 buildings gets none. A roof that loses its tower gets a roof exit only where its run would otherwise have no big roof item, so R8 does not move. Nothing changes in 3D until J draws the roofs. In the facades picture the "big roof prop" points thin out.

**The first cut's premises the pre-check corrected** (the note's section 0). Each is struck where it stood in the first cut; this list replaces them:
1. **Exits today: 163 a city, not about 80.** On H3's 20 named runs there are 3,254 exits (1 building in 6), not "about 1,600". The cut took that figure from the H3 note, which was written before NV. Since NV, the roofs that used to take a novelty sign take towers and exits. H3 also has 5,108 water towers (255 a city, 223 to 289) and 1,200 billboards (60 a city).
2. **Plain roofs (small props only) cannot be built at any X offered.** The cut expected a lowest X that keeps R8's 0.5. With plain roofs, more towers help R8, so the limit is a **highest** X, and it is **7**, below all four Xs offered:
   - 0.500 on seed 10 on at X = 7;
   - 0.489 at X = 8;
   - at X = 12 and up, 19 or 20 of the 20 runs fail.

   This is moot now: Josh chose (c), which keeps R8 as H3's at every X.
3. **Per run (TX (c)) gives 0 towers at every X, not "almost none".** No B2 run has 8 or more buildings.

**Dropped from the cut: RX's "holds it" change to `roofcheck.ts`.** The reviewer's latent mismatch (a mid-column exit on a building whose blind column fits it, where RC had turned the blind column away) is 0 on every run, option, X and counting. No `roofcheck.ts` change is made for RX, and no fixture is added for it.

**The rules (Q25).**
- **TX (a). Counted per street block** (Q25 answer 1).
  - A block's cap is floor(n / `WATER_TOWER_PER_BUILDINGS`).
  - n is the number of `CityBuilding`s whose `block` is that block's id: both rings, street and quiet fronts. A park block has none.
  - A block of fewer than 16 buildings has cap 0.
  - `block` is read as an opaque key, never parsed: no rank (`.bi`, `.bj`) is read, and roof.test.ts' grep test stands.
- **X. `WATER_TOWER_PER_BUILDINGS` = 16, Decided** (Q25 answer 2). It is typed in `roofkit.ts`, with a comment quoting Josh, and pinned by `roofpin.test.ts`.
- **TS. The hashed pick** (Q25 answer 1, as cut).
  - A building's **candidate tower** is the tower H3's merged kind loop places for it with no cap. That is the first kind and column that fits and has room, exactly as at 194643e.
  - Where a block has more candidates than its cap, it keeps the first cap of them, ranked by `unitOf(rand("roof", "tower", b.block, b.id))` ascending, ties by building id. Where it has no more than its cap, it keeps all of them.
  - The probe ranked by the raw hash, not `unitOf`. So its digests are not the expected values; the builder's numbers and digests are the record.
- **TF. The freed roof: option (c), the bare-run top-up** (Q25 answer 3). It is a new rule, Josh's.
  - A candidate that is not kept is a **freed roof**. It has no water tower.
  - A **bare run** is a B2 run (`runsOf`) that has no big roof item (water tower, exit, billboard) once the freed roofs' towers are taken away.
  - **The exit.** In each bare run that has a freed roof, one freed roof tries the roof exit:
    - it is the run's first freed roof, ranked by `unitOf(rand("roof", "exit", <run id>, b.id))` ascending, ties by building id;
    - it tries the exit as H3 does: RX's tiers (blind columns, then mid columns, each in the building's `largecol` rotation), with RE, RK, RW and RC as merged;
    - if no column holds the exit, it takes none. Only one roof is tried in each run.
  - **Every other freed roof takes no big prop.** A freed roof never takes a water tower or a billboard. On the 20 runs the probe found 0 freed roofs taking a billboard, so this is Josh's words as built, not a change from the measured numbers.
  - **Small props.** Every column of a freed roof that has no big prop takes small props by `P_ROOF_SMALL`, exactly as any column without one does. This includes the column the tower would have stood on.
- **The build order** (the note's section 3). `buildRoofs` runs in four passes:
  1. **Big props first**, for every building in `buildings.buildings` order: H3's kind loop as merged, with each tower held as a candidate;
  2. **The cap**: TS keeps each block's towers, and the freed roofs give their towers up, along with those columns' load;
  3. **The top-up** of the bare runs: TF's exits;
  4. **Small props**, for every building, as merged.

  A column's load is only its own building's, and the billboard's run cap is unaffected, because a candidate never placed a billboard. So the reorder changes no other choice.

  **`roofs`' output order is H3's:** in `buildings.buildings` order, each building's big prop first (a billboard's structure, then its face), then its small props by column along the row.
- **With X = 1 the cap holds every candidate** (floor(n / 1) = n), so `buildRoofs` gives H3's merged layer exactly. Criterion 2 pins this.
- **No threshold moves.** R8's 0.9 and 0.5, `DRESS_PER_BAY_MAX` 6, `ROOF_EDGE_M`, `BILLBOARD_EDGE_M` and every chance stay. No merged section re-opens, and `src/core/` does not change.

**What the pre-check expects** (X 16, per block, (c); a city average over the 20 runs; the builder's report is the record):
- **Towers:** 44 a city (36 to 52). Blocks with 0, 1, 2 and 3 or more towers: 0.5, 26.6, 7.5 and 0.8. Blocks under 16 buildings: 0.5 (0 to 2).
- **Freed roofs:** 212 a city. About 113 take an exit; the rest take small props only.
- **Exits:** 276 a city, against H3's 163.
- **R8's lowest:** 0.959 (seed 6 on) and 0.652 (seed 10 on). The second number is H3's, run by run.
- **Roof pieces:** about 2,569 a city, against H3's 2,570.
- **The facades digest moves on all four pin cities.** `ground`, `dressing` and `walls` do not.

**Acceptance criteria.**
0. [ ] **The architect's part:** no `src/core/` change. `CityBuilding.block` and `CityRoofPiece` carry all H3b needs.
1. [ ] **The number** (Vitest).
   - `roofkit.ts` gains `WATER_TOWER_PER_BUILDINGS` = 16, its comment quoting Q25.
   - `src/render3d/roofpin.test.ts` gains one test: it is 16, pinned and not compared (the old path has no cap). The test's name names Josh's Q25 answer 2, "Yes to all".
   - Nothing else in the pin test changes.
2. [ ] **H3 unchanged under no cap** (Vitest, `roof.test.ts`). `buildRoofs` takes an optional fifth argument, `towerPer` (default `WATER_TOWER_PER_BUILDINGS`); `stage.ts` calls it with four, unedited. With `towerPer` 1, on the four pin cities, the facades layer with these `roofs` in place of the stage's (its `ground`, `dressing` and `walls` as the stage wrote them) digests to H3's pins: `85f425f5`, `40ff1675`, `e1ee93b5` and `06de80d5` (seeds 1, 2, 3 and 8, one-way on). This shows the reorder changes nothing but the cap.
3. [ ] **TX and TS on the 20 named runs** (Vitest, `roof.test.ts`). Each run is compared with its own `towerPer` 1 layer, which gives the candidates (the buildings with a tower there):
   - every block holds at most floor(n / 16) water towers;
   - a block of fewer than 16 buildings holds none;
   - every block holds exactly min(cap, its candidates), so every tower the pick keeps is placed;
   - the kept towers are the block's first candidates by TS's ranking, on the same column and with the same placement as in the `towerPer` 1 layer;
   - the test finds, on the named runs, at least one block whose candidates exceed its cap. That is every block, by the note, so the pick is exercised and not only allowed.
4. [ ] **TF on the 20 named runs** (Vitest, `roof.test.ts`), against the same `towerPer` 1 layer:
   - every building that is not a freed roof has exactly the same roof pieces in both;
   - a freed roof has an exit or no big prop: never a water tower, never a billboard;
   - a freed roof with an exit is in a bare run. It is that run's first freed roof by TF's ranking, and it is the only freed roof in its run with an exit;
   - every run with a big prop in the `towerPer` 1 layer has one at 16, so R8's second number equals H3's run by run;
   - the test finds freed exits on blind and on mid columns, and freed roofs with no big prop.

   **Stop rule (R-2):** if the fourth clause fails on a named run (the ranked roof's exit fits no column), the builder stops and reports. It does not try a second roof, and it tunes nothing.
5. [ ] **The check: TC, the tower cap** (Vitest).
   - It goes in `roofcheck.ts`, in `roofReport`'s failures, so `roofFailures` and the stage (unedited) run it after H3's checks.
   - Every block's water towers are at most floor(n / 16), counted over the layer's `roofs` and `buildings.buildings`. A failure is named "TC" and lists the cells of the block's towers.
   - H3's other checks run as merged; RX is unchanged.
   - **Failing fixtures**, in `rooffixtures.test.ts`, each built from a named run's layer with one thing changed. The positive control (the default city passes every check) now covers TC.
     - **One over the cap.** On the default city, take a block holding its cap. Put a water tower on a mid column of another of its buildings that has no big prop, placed as H3's tower is (front edge on the deck's front, centred), with that column's small props removed. It fails TC, and only TC.
     - **A small block with a tower.** Take a block of fewer than 16 buildings: the default city's if it has one, else the first named run's that has one (the note: 0 to 2 a city). Put a water tower on one of its buildings in the same way. It fails TC, and only TC.
6. [ ] **R-4: the facades digest re-pin** (Vitest, `stage.test.ts`).
   - The four `PINS` are re-pinned on the four pin cities. The comment names H3's pins (`85f425f5`, `40ff1675`, `e1ee93b5`, `06de80d5`) as the ones replaced, and the builder's report names the old and the new.
   - `WALLS_PINS`, `H2_LAYERS` (`ground`, `dressing`) and the earlier stages' pins are unedited and still pass.
   - R-7: 6 x 6 seed 1 ends `ok`.
7. [ ] **The numbers** (reported, not asserted; `roofreport.test.ts`). For each of the 20 named runs:
   - buildings and blocks; each block's cap and towers;
   - blocks with 0, 1, 2, and 3 or more towers; blocks under 16 buildings;
   - towers a city, against the `towerPer` 1 count;
   - freed roofs; bare runs and bare runs topped up; freed roofs by what they took (exit on a blind column, exit on a mid column, none);
   - exits a city, and the share of buildings with an exit, against the `towerPer` 1 layer's;
   - the median nearest-tower distance in cells;
   - R8's two numbers, and the lowest of each with its run.

   H3's report lines stay. `RoofStats` gains the counts it needs. The outside cities' lines are unchanged: best effort, report only.
8. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=facades` on 6 x 6 seed 1 shows far fewer "big roof prop" points (the note: 48 towers against H3's 264, plus the billboards, which do not change) and more "roof exit" points (the note: 286 against 174). `?view=3d&city=plan&stage=assemble` looks as on `goal/city-style`.
9. [ ] R-8 to R-11. **The builder runs these tests only:** `npx vitest run --maxWorkers=2 src/city/facades/roof.test.ts src/city/facades/rooffixtures.test.ts src/city/facades/roofreport.test.ts src/city/facades/stage.test.ts src/render3d/roofpin.test.ts`, and one `npx tsc --noEmit`.
   - The other facades tests, `run.test.ts`, `planview.test.ts` and `plan3d.test.ts` read no `roofs` pin, so the builder does not run them.
   - The main session's gate is the full `npm run gate`, which runs them.

- **Files.** H3's own roof files, by the same owner:
  - `src/city/facades/roofkit.ts`: `WATER_TOWER_PER_BUILDINGS` only;
  - `src/city/facades/roofs.ts`: TS, TF, the four passes, the `towerPer` argument, and `RoofStats`' new counts;
  - `src/city/facades/roofcheck.ts`: TC only;
  - `src/city/facades/roof.test.ts` (criteria 2 to 4);
  - `src/city/facades/rooffixtures.test.ts` (criterion 5);
  - `src/city/facades/roofreport.test.ts` (criterion 7);
  - `src/city/facades/stage.test.ts`: the four `PINS` and their comment, nothing else;
  - `src/render3d/roofpin.test.ts`: the one test of criterion 1, nothing else.
- **Must not:**
  - `src/core/`;
  - every other `src/city/` folder, `src/city/stages.ts`, and `src/city/pipeline/`;
  - **every other file of `src/city/facades/`**, by name:
    - `stage.ts` and `index.ts` (`buildRoofs` keeps its four-argument call, and `export *` carries the new names);
    - H1's `kit.ts`, `place.ts`, `check.ts`, `facts.ts`, `constants.ts`, `hash.ts`, `testcities.ts`;
    - H1b's `dresskit.ts`, `dress.ts`, `dresscheck.ts`;
    - H2's `wallkit.ts`, `escape.ts`, `walls.ts`, `wallcheck.ts`;
    - H2b's `partykit.ts`, `party.ts`, `partycheck.ts`;
    - every other test file: `fixtures.test.ts`, `place.test.ts`, `report.test.ts`, `dress.test.ts`, `dressfixtures.test.ts`, `dressreport.test.ts`, `escape.test.ts`, `escapefixtures.test.ts`, `escapereport.test.ts`, `party.test.ts`, `partyfixtures.test.ts`, `partyreport.test.ts`;
  - `src/render3d/`, except the one test in `roofpin.test.ts`.

  **If H3b needs any of them** (a stat that only `stage.ts` could print, a check another section's code reads), the builder stops and reports, and the architect re-cuts.
- **Interfaces.** None new in `src/core/`. `buildRoofs`' optional `towerPer` is internal to the folder. J reads `facades.roofs` as typed. No new dependency.
- **Adds rules; changes no threshold** (Q25). TX (a), TS and TF are Josh's rules, and `WATER_TOWER_PER_BUILDINGS` 16 is his number, Decided.
- **Heavy.** The named-run tests build each named city once through `testcities.ts`' module cache, and `buildRoofs` twice on each, at 16 and at 1. They have a 120 s timeout, and the report has its own file.

**The first cut's text, kept as it was asked and struck where the pre-check or Q25 settled it** (21 Nov 2026, the lead-architect, on `goal/city-style` after 194643e):
- ~~**TX (b) per city** and **(c) per B2 run**~~: Josh chose (a). Under (c), floor(n / X) is 0 on every run at every X (premise 3).
- ~~"On H3's rotation nearly every refused tower becomes a roof exit ... At X = 16, for example, about 200 towers a city would become about 200 more exits, taking the city to several hundred exits"~~: that was the rotation, (i), which would give 374 exits a city (2 buildings in 5). Josh chose (c) instead: 276.
- ~~"If Josh wants the freed roofs plain ... There is then a lowest X that keeps 0.5"~~: wrong (premise 2). The limit is a highest X, 7, and Josh did not choose plain.
- ~~"It never happened on the 20 named runs with about 1,600 exits. With several thousand more exits it may"~~: there were 3,254 exits, not 1,600 (premise 1), and the case is 0 under every option (dropped above).
- ~~`stage.ts` needs no change, since the stats and the cap live in `roofs.ts`~~: kept, and now a must-not.
- **The pre-check's seven questions** (towers per city and per block; how they spread; what fills the freed roofs; R8 at each X; the limit X; RX and RC on the extra exits; what moves) are answered in `docs/design/070-H3b-precheck.md`, sections 1 and 2.

### H1c · Stage 7, Facades: shop kinds and novelty signs (facades, pure). Branch `ticket/070h1c-facades-novelty`
**Branch.** Cut from `goal/city-style` at the commit of this re-cut or later (H3 and H3b are merged, 01a77f3; the pre-check is fa561e9 and Josh's answer 9895bc4). **The pre-check is done and Josh has answered it (Q26). This is the re-cut on his answer, so the builder may start.** The roof sign stays in H1c (no H1d). The first cut's text is in this file at fa561e9; what it asked is answered in `docs/design/070-H1c-precheck.md`.

**Josh's words (21 Nov 2026, in chat).**
- To the H3 pre-check (Q24): "Yes to all except novelty signs. They can be placed on the face of a build in addition to the roof. They represent the store in the storefront. A pizza should correspond with a pizza shop and a beer bottle, for example, should correspond with a liquor store or a corner store."
- Then: "Perhaps novelty signs should be placed alongside the shop fronts instead of the decoration phase? I'm not sure which makes more sense." Then: "A novelty sign doesn't always have to be placed with a shop either. It's an added detail. That's fun. It should be placed per the discretion of the storefront agent."
- **Q26.** Asked the H1c pre-check's four questions (the note, section 4), each as recommended (1: shop kinds and novelty signs belong to the shopfront work, the roof sign reads the same kind; 2: the key-to-shop table as proposed, `Bottle_01` the beer bottle, the bowling ball and pin unused; 3: a shop with an H1b Bar, Pub, Cafe, Noodles or Pizza sign takes that kind, others at random, H1b unchanged; 4: face rule F, flat above the shop's awning or sign, centred, up to the roof line), he answered: **"Yes, all four"**.

**Goal.** Every shop knows what it sells, and about one run in nine carries a novelty sign (the pizza slice, the burger, the pint, the green beer bottle and their kin) flat on the wall over its shopfront or on its roof. Wherever one stands it shows that shop's trade, and it always agrees with the shop's H1b sign. A sign is an extra, not a share to meet. Nothing changes in 3D until J draws them; the facades picture gains them as points.

**The rules (Q26).**
- **SK. Shop kinds** (answers 1 and 3). The shopfront pass gives every shop ground piece (`shop`, `shopDouble`, `shopCorner`) one `CityShopKind`, once, as a `CityShop` in `facades.shops` (in `ground`'s order):
  - **read from H1b's sign** where H1b's `dressing` has a `fasciaSign` or `bladeSign` on the shop's first cell whose key names a trade (`SIGN_KIND`): Bar and Pub "bar", Cafe "cafe", Chinese_Noodles "noodles", Pizza and DeliPizza "pizza", Barber "barber", Hotel "hotel" (`source` "sign", `sign` the key);
  - **else by hash** (no sign, or `Entrance_01`): `indexOf(rand("shop", "kind", building id, i, j), n)` over the 16 kinds less those already given in its building (sign-read shops first, then the building's shops in row order); over all 16 where none is left (`source` "hash", `sign` null);
  - H1b's `dressing` is read, never changed. ~~Q3's other readings (H1b's signs follow a hashed kind; signs and kinds independent)~~: not chosen.
- **SN. The key table** (answer 2), typed in the kit: pizza `Pizza_01`; burger `Burger_01`; hot dog `Hotdog_01`; taco `Taco_01`; noodles `Noodles_01`; cafe `Coffee_01`; donut `Donut_01`; ice cream `Icecream_01`, `Milkshake_01`; diner `Milkshake_01`, `Soda_01`; sweets `Popcorn_01`, `Lollypop_01`; bar `Beer_01` (the pint); liquor store `Bottle_01` (the beer bottle); corner store `Bottle_01`, `Soda_01`; music shop `Guitar_01`; barber and hotel none. `BowlingBall_01` and `BowlingPin_01` are in the bounds table (all 17 pinned) and in no kind's list. A novelty sign's key is always one of its shop's kind's keys (NM).
- **F. The face rule** (answer 4). A face sign (`facades.novelty`, one `CityNoveltySign`) stands on its shop's column(s), in the host column's own frame:
  - **attach:** its back on storey 1's wall plane, ~~the column's front cell edge~~ the first-floor piece's bounds front (`bayFrame.floorFront`; FA, 21 Nov 2026), within 1e-6 m; no bracket (the three `Sign_Attachment` keys stay unused);
  - **centred** across on the shop (a `shopDouble` on the midpoint of its two cells; a `shopCorner` on its front face only), within 1e-6 m;
  - **broad side to the street:** turned the column's `yaw` where the key's w >= d, else `yaw` + 90 (one fixed quarter, typed in the kit), so its extent along the wall is the larger of w and d;
  - **base** on top of the shopfront's tallest piece on that face (the tops of the shop's glass, awning and fascia sign, each by its bounds and placement), and never under the ground slot's `top_m`; **top** at or under the roof piece's base (3 x `storeys`);
  - **width (W1):** its extent along the wall at most the shop's (5 m; 10 m for a `shopDouble`); **reach (T1):** its front at most `CELL_M` past the front cell edge;
  - **clear** of every placed piece on that face (H1b's dressing, H2's and H2b's walls), as boxes from each piece's kit bounds at its placement; touching within 1e-6 m is not a clash;
  - **street front only** (the shop's `frontage` "street", `face` the column's `front`), **never on an escape's column** (EP);
  - **cap placed last (RC):** placed after the roofs, only where its column (the shop's first cell, as H1b counts) still has room under `DRESS_PER_BAY_MAX` with H1b's dressing, the escape's weight, H2's canopies and upper-wall props and the roof pieces counted (no party-wall piece, PW7). A face sign never pushes a merged piece out.
- **RS. The roof sign** (answer 1; the note's roof rule). A roof novelty sign is a `CityRoofPiece` of kind `"novelty"`:
  - only on a building that drew H3's `P_ROOF_LARGE` (the same `rand("roof", "large", b.id)`), as that building's one big prop, **in place of H3's kind loop** in `buildRoofs`' pass 1; so H3b's tower cap, its pick and TF run on what is left (a building with a roof sign is no tower candidate, and its run is not bare);
  - on the shop's own column, a mid column (a `shopDouble`: its first, else its second; a `shopCorner`'s roof is a corner roof, so it takes face signs only);
  - placed as H3's tower is: front edge on the deck's front edge, centred across, base on the deck (RT), turned the column's `yaw` where it fits the deck, else `yaw` + 90; inside the deck (RE, RK) with room (RC), as every roof piece;
  - `facing` is the side its own +z faces after the turn.
- **NP. How often, and where** (the facades agent's, "per the discretion of the storefront agent"; **PROPOSED**, typed in the kit, no share asserted anywhere, not questions for Josh): `NOVELTY_CHANCE` 0.10 a shop, `NOVELTY_PER_RUN` 1 (at most one sign, face or roof, on a B2 run, `runsOf`), `NOVELTY_ROOF_SHARE` 0.30. The plan, made before the roofs:
  - each B2 run's shops are walked in `buildings.buildings` order, then row order; a shop whose kind has keys and whose `unitOf(rand("novelty", "chance", building id, i, j))` is under `NOVELTY_CHANCE` tries for a sign;
  - it tries the roof first where `unitOf(rand("novelty", "roof", ...))` is under `NOVELTY_ROOF_SHARE`, else the face first, and then the other; at each spot its kind's keys are tried in a hashed rotation (`rand("novelty", "key", ...)`) and the first that fits is taken;
  - the face's fit is F without the cap (everything F reads is placed before the roofs); the roof's fit is RS (the roof sign is its building's first roof piece, so its column's load is `columnLoads`' and its deck is `deckOf`'s);
  - the first shop that gets a spot ends its run's walk. **A planned face sign that the cap turns away after the roofs is not placed, and its run takes no other sign** (the architect's reading, for a simple order; the note: about 3 a city). It is counted in the report.
- **What each answer leaves unchanged:** H1's `ground`, H1b's `dressing`, H2's and H2b's `walls` and their digests; R6, R8's 0.9 and 0.5, `DRESS_PER_BAY_MAX` 6, the tower cap 16 and every approved number. `DRESS_MAX` stays reported, not applied (Q24 answer 5).

**What the pre-check expects** (the note's sections 2 and 3; a city average over the 20 runs; the builder's report is the record):
- **Shop bays** 851; kinds from a sign 359, from the hash 492; 0 trade-signed shops disagree; 765 shops can take a sign.
- **Signs at the proposal:** about 42 face and 10 roof a city; 53 runs of 469 with a sign. Face keys: pint 26%, pizza 17%, coffee 15%, noodles 12%.
- **Roof signs replace** an exit 92, a billboard 65, a water tower 9, nothing 39 (20 runs). Towers 878, unchanged. R8 identical run by run (lowest 0.959 and 0.652). **(Q27)** The builder found R8's first number moving by one building on 3 runs (TF on a roof sign's run), the second identical on all 20; criterion 3 is amended on Josh's "Yes".
- **Dressing plus walls plus face signs** at most 4,949 of 6,000.
- **The facades digest moves on the four pin cities;** `ground`, `dressing` and `walls` do not.

**Acceptance criteria.**
0. [ ] **The architect's part (done with this re-cut):** `CityShopKind`, `CityShop`, `CityNoveltySign` and the optional `CityFacadesLayer.shops` and `.novelty` in `src/core/cityplan.ts`, with the rules in the comment above them. No field G2 or any merged section reads changes; one `npx tsc --noEmit` passed after the change.
1. [ ] **The kit** (R-6; a new `noveltykit.ts`). The 17 `SM_Prop_LargeSign_*` keys (`NOVELTY_KEYS`) and their bounds; the kind table (SN) and `SHOP_KINDS` (16); `SIGN_KIND` (H1b's 9 sign keys to a kind, `Entrance_01` to none); the face turn's quarter (F); the three PROPOSED numbers (NP), each commented PROPOSED with Josh's "per the discretion of the storefront agent". New `src/render3d/noveltypin.test.ts`:
   - **Always (no GLB):** `NOVELTY_KEYS` equals `dressing.ts`' `NOVELTY_SIGNS`; each bound equals `dressing.test.ts`' fixture (typed into the test, as `roofpin.test.ts` does); every `CityShopKind` has an entry, barber and hotel empty; the keys used are 15, the bowling pair in none; `SIGN_KIND`'s keys are exactly `dresskit.ts`' `SIGNS_FASCIA` and `SIGNS_BLADE`; the test's name quotes Q26, "Yes, all four". The three NP numbers are not asserted (PROPOSED).
   - **Inside `it.skipIf(!HAVE_GLB)`**, read lazily as `roofpin.test.ts` does: every one of the 17 keys' bounds equals the converted GLB's within 0.005 m.
2. [ ] **SK on the 20 named runs** (Vitest, a new `novelty.test.ts`). `facades.shops` has exactly one entry per shop ground piece, in `ground`'s order, with its cells; every shop with a trade sign on its first cell has that sign's kind and `source` "sign"; every other has `source` "hash" and, where its building has fewer shops than 16 kinds, a kind no other shop of its building has unless every kind is taken; the test finds both sources on every run; `dressing` is unchanged (criterion 7's pins).
3. [ ] **NP, F and RS on the 20 named runs** (Vitest, `novelty.test.ts`):
   - at most one sign (face or roof) a B2 run; at most one a shop; every sign's key is of its shop's kind (NM); no barber or hotel shop has one;
   - every face sign holds F's every part, computed in the test by hand from the kit's bounds; every roof novelty piece holds RS (its building drew `P_ROOF_LARGE`, its shop's mid column, its building's only big prop);
   - **with no plan, `buildRoofs` is H3b's exactly:** `buildRoofs` takes an optional sixth argument, the roof signs (default none); with none, on the four pin cities, `digestOf({ stage, ground, dressing, walls, roofs })` is H3b's pins (`88cc62e0`, `d424e8df`, `ea9ad368`, `a6511846`);
   - **with the plan,** every building whose street block holds no roof sign has the same roof pieces as with no plan; TC holds; ~~R8's two numbers are at least the no-plan layer's, run by run;~~ **(21 Nov 2026, Q27 amendment)** R8's second number is identical to the no-plan layer's, run by run; R8's first number is at or above R8's 0.9 floor on every run, and its change from the no-plan layer, run by run, is reported (criterion 9), not asserted. Asked "Shall I accept this one-building change and let the builder finish the tests?", Josh answered **"Yes"** (21 Nov 2026, in chat; Q27: at 322f205 the first number moves by one building on 3 of 20 runs, 6 x 6 s2 and s8 off up, s9 off down from 0.97593 to 0.97473, a freed tower roof whose run is no longer bare because of the roof sign, so TF gives it no exit);
   - the test finds face signs and roof signs on the named runs, so both are exercised; no share is asserted;
   - the same city twice gives the same `shops`, `novelty` and `roofs` (R-3).
4. [ ] **Placements, hand-worked** (Vitest, `novelty.test.ts`), each pivot computed by hand from the bounds: a `Burger_01` face sign over a flat awning on a 3-storey `shop` at two turns (base the awning's top); a `Hotdog_01` face sign turned a quarter (its 3.93 m along the wall); a `Pizza_01` face sign centred over a `shopDouble`; a `Bottle_01` roof sign on a mid column (base 3 x `storeys` + 0.5, front edge on the deck's front edge).
5. [ ] **The checks** (Vitest). A new `noveltycheck.ts`, `noveltyFailures(layer, input)`, run by the stage after `roofFailures`; a failure names its check and the cells. **Stop rule (R-2):** if one fails on a named run, the builder stops and reports; nothing is loosened or tuned.
   - **SK:** one shop a shop ground piece; a trade-signed shop's kind is its sign's;
   - **NM, sign kind matches shop kind:** every face sign's and roof novelty piece's key is one of its shop's kind's keys, and its `kind` field is its shop's;
   - **F:** street front, not an escape's column, centred, broad side out, base and top, width (W1), clear;
   - **reach (T1)** and **attach**, each its own check name;
   - **cap placed last:** the face sign's column with every piece counted (roofs included) is at most `DRESS_PER_BAY_MAX`;
   - **NR:** at most `NOVELTY_PER_RUN` a B2 run, one a shop;
   - **`roofcheck.ts`, NV changed to accept H1c's signs:** a `"novelty"` roof piece passes "roofs" only where its key is in `NOVELTY_KEYS` and its column is a mid column of a shop in `layer.shops` (else it fails "roofs", NV); its deck, base, cap and one-big-prop checks are H3's, unchanged. `roofBounds` in `roofkit.ts` returns the novelty keys' bounds from `noveltykit.ts` (`ROOF_BOUNDS` itself is unchanged, so `roofpin.test.ts` stands).
   - **Failing fixtures** (a new `noveltyfixtures.test.ts`), each from the default city's layer (6 x 6 seed 1, one-way on) with one thing changed; each fails its check and only it, unless it says otherwise. Positive control: the default layer passes `noveltyFailures` and `roofFailures`.
     - a face sign's key swapped for a key of another kind (`Guitar_01` on a pizza shop) fails NM; a roof novelty piece's key swapped the same way fails NM;
     - a trade-signed shop's kind changed (a shop under H1b's `SM_Prop_Sign_Pizza_01` given "bar") fails SK;
     - a face sign moved 0.5 m along the wall fails F (centred); turned a quarter so its narrow side is out fails F (broad side); lowered 0.2 m into the awning fails F (base); a `Lollypop_01` on a 3-storey shop's face (top 3 + 6.36 > 9) fails F (top); moved onto an escape's column fails F (EP); put where it overlaps the bay's blade sign fails F (clear);
     - a face sign moved 0.1 m off the wall fails attach; moved out past `CELL_M` fails reach (and attach);
     - a face sign added on a column already at `DRESS_PER_BAY_MAX` with the roof pieces counted fails the cap;
     - a second face sign on another shop of a run that has one fails NR;
     - a `"novelty"` roof piece on a street mid column with room that is not a shop's (a door's or a floor's column) fails "roofs" (NV, `roofcheck.ts`); this replaces `rooffixtures.test.ts`' NV fixture.
6. [ ] **The picture** (R-5). One legend entry appended, index 19 "novelty sign", one point per face sign; a roof novelty piece is a "big roof prop" point (17), as H3 said. The R-5 test in `stage.test.ts` checks the new points' legend after the roofs'.
7. [ ] **R-4: the facades digest re-pin** (Vitest, `stage.test.ts`). The four `PINS` are re-pinned; the comment names H3b's (`88cc62e0`, `d424e8df`, `ea9ad368`, `a6511846`) as replaced, and the report names old and new. `WALLS_PINS`, `H2_LAYERS` (`ground`, `dressing`) and the earlier stages' pins are unedited and pass. R-7: 6 x 6 seed 1 ends `ok`. The stage still reads only `mass`, `buildings` and the streets' `w` and `h`; `stage.test.ts`' grep tests cover the new files unedited.
8. [ ] **H3's and H3b's tests read H3b's roofs.** In `roof.test.ts`, `viewOf`'s `layer` is the stage's with `roofs` from `buildRoofs` with no plan and without `shops` and `novelty` (H3b's layer exactly), and the H3b pin test digests that; no other line changes, and every H3 and H3b test passes as merged. In `roofreport.test.ts` the one stage-layer novelty-count assertion becomes a reported count; nothing else changes.
9. [ ] **The numbers** (reported, not asserted; a new `noveltyreport.test.ts`), per named run and the lowest or highest with its run: shops by kind and by source; buildings with two shops of one kind; signs face and roof, and runs with a sign; signs by key; what each roof sign replaced (the no-plan big prop on that building: tower, exit, billboard, none); towers and exits against the no-plan layer; R8's two numbers against it; tries turned away by fit (each F part; roof: no `P_ROOF_LARGE` draw, corner, deck, RK, RC) and planned face signs turned away by the cap after the roofs; dressing plus walls plus face signs against `DRESS_MAX` (reported as passed).
10. [ ] (Main session, phone-sized screenshot) `?view=3d&city=plan&stage=facades` on 6 x 6 seed 1 shows "novelty sign" points on a few shop fronts (the note: about 45 face, 7 roof). `?view=3d&city=plan&stage=assemble` looks as on `goal/city-style`.
11. [ ] R-8 to R-11. **The builder runs these tests only:** `npx vitest run --maxWorkers=2 src/city/facades/novelty.test.ts src/city/facades/noveltyfixtures.test.ts src/city/facades/noveltyreport.test.ts src/city/facades/roof.test.ts src/city/facades/rooffixtures.test.ts src/city/facades/roofreport.test.ts src/city/facades/stage.test.ts src/render3d/noveltypin.test.ts`, and one `npx tsc --noEmit`. The main session's gate is the full `npm run gate` (it runs `run.test.ts`, `planview.test.ts`, `plan3d.test.ts` and the other facades tests, which read no novelty field).

- **Files** (every file H1c may edit; one owner, facades):
  - new `src/city/facades/noveltykit.ts` (criterion 1);
  - new `src/city/facades/shops.ts` (SK: `buildShops`);
  - new `src/city/facades/novelty.ts` (NP's plan, F's fit and placement, the face signs after the roofs);
  - new `src/city/facades/noveltycheck.ts` (criterion 5);
  - new `src/city/facades/novelty.test.ts`, `noveltyfixtures.test.ts`, `noveltyreport.test.ts`;
  - `src/city/facades/roofs.ts`: the optional sixth argument and RS in pass 1, `RoofStats`' new counts, its header; nothing else;
  - `src/city/facades/roofkit.ts`: `roofBounds` reads `noveltykit.ts` for the 17 keys, and its header's NV line; nothing else;
  - `src/city/facades/roofcheck.ts`: the NV clause and the novelty key list; nothing else;
  - `src/city/facades/roof.test.ts` and `roofreport.test.ts`: criterion 8 only; `rooffixtures.test.ts`: the NV fixture replaced (criterion 5) only;
  - `src/city/facades/stage.ts`: shops after the dressing, the plan before the roofs, the plan into `buildRoofs`, the face signs after the roofs, write `shops` and `novelty`, `noveltyFailures` after `roofFailures`, the legend entry and points; nothing else;
  - `src/city/facades/stage.test.ts`: the four `PINS` and their comment, the picture test's legend and points; nothing else;
  - `src/city/facades/index.ts`: the new modules' exports;
  - new `src/render3d/noveltypin.test.ts`.
- **Must not:**
  - `src/core/` (criterion 0 is the architect's);
  - every other `src/city/` folder, `src/city/stages.ts`, `src/city/pipeline/`;
  - **H1b's `dress.ts` and `dresscheck.ts`** (H1b is unchanged, Q26 answer 3), and `dresskit.ts`;
  - every other file of `src/city/facades/` by name: `kit.ts`, `place.ts`, `check.ts`, `facts.ts`, `constants.ts`, `hash.ts`, `testcities.ts`, `wallkit.ts`, `escape.ts`, `walls.ts`, `wallcheck.ts`, `partykit.ts`, `party.ts`, `partycheck.ts`, and every test file not named in Files. H1c may import from any of them (`runsOf`, `escapeWeight`, `dressBounds`, `SIGNS_FASCIA`, `SIGNS_BLADE`, `DRESS_PER_BAY_MAX`, `unitOf`, `indexOf`, `keyOf`) and edits none;
  - `src/render3d/` but the new pin test (`dressing.ts`, `dressing.test.ts`, `roofpin.test.ts`, `plan3d.ts` and their tests are read or run, not edited).

  **If H1c needs any of them** (a check another section's code reads, a stat only a must-not file could give), the builder stops and reports, and the architect re-cuts.
- **Interfaces.** Criterion 0. `buildRoofs`' sixth argument and the plan's shape are internal to the folder. J reads `facades.novelty` (its `placement`) and the `"novelty"` pieces in `roofs`; G2 reads nothing new. No new dependency.
- **Adds rules; changes no threshold** (Q26). SK, SN and F are Josh's answers; RS is the note's roof rule under answer 1; NP's three numbers are the agent's, PROPOSED; the "not placed when the cap turns it away" order is the architect's reading. R8's 0.9 floor stands; Q27 drops only criterion 3's run-by-run no-drop on R8's first number.
- **The builder's readings, ruled by the architect** (21 Nov 2026, at 322f205; readings of F and RS, not rule changes):
  - **FA. The attach plane** is the first-floor piece's bounds front (`bayFrame.floorFront`, 0.129 to 0.351 m past the cell edge), the plane H1b's front pieces lie on: F's "storey 1's wall plane" is that face, and attach measures the sign's back against it within 1e-6 m. **T1's reach is still measured from the front cell edge** (the sign's front at most `CELL_M` past it). The fixtures stand: 0.1 m off the plane fails attach; out past `CELL_M` from the cell edge fails reach (and attach).
  - **FR. `roofcheck.ts` accepts a `"novelty"` roof piece turned 0 or 90 from its column's `yaw`** (RS's two turns), and no other; its deck, base, cap and one-big-prop checks are H3's.
  - **FC. A corner face sign** (a `shopCorner`'s front face) **needs both `bay.frontStreet` and the shop's `frontage` "street"**: F's street-front-only, read on the face the sign stands on.
  - **FB. A blade sign is a clash target, not a base.** F's base reads the shop's glass, awning and fascia sign only; a `bladeSign` is a placed piece the sign must be clear of (criterion 5's blade-sign fixture).
- **Heavy.** The named-run tests build each named city once through `testcities.ts`' module cache, and `buildRoofs` with and without the plan on each, with a 120 s timeout; the report has its own file.

### I · Stage 8, Ground dressing (landscape, pure). Branch `ticket/070i-ground`
**Branch.** Cut from `goal/city-style` at the commit of this re-cut or later (stages 1 to 5 and 7 merged; H1c's merge 0795283; the re-cut before the pre-check against 5b2998c; the pre-check c8cb583; Josh's answer 1b7a0e5). **The pre-check is done and Josh has answered it (Q28). This is the re-cut on his answers, so the builder may start.** It changes only the lines those answers touch: EL, DK and LB become his rulings, LB's walk moves half a cell, GS is added (no keep-out), PZ and FL gain AV, KO and the R10 keep-outs check read pavement props and lane bins only, and criteria 4, 6 and 10 follow. Files, must-not lists and test commands are as cut. The re-cut before the pre-check is in this file at 4f57528; the first cut's text is at 5b2998c.

**Josh's words (21 Nov 2026, in chat).**
- Choosing the next section, he said: "I think the ground dressing first".
- **Q28.** Asked the I pre-check's five questions (the note, section 4), each as recommended (1: EL, nothing under a fire escape; 2: DK, nothing in a 1.5 m strip in front of a residents' door, on the pavement or in a lane; 3: LB, lane bins against the wall in the lane every 10 m, alternating sides, centred on a building bay; 4: no extra keep-out for the ground floors' fronts; 5: plaza and lot pieces left out under a stage 7 box, the keep-outs reading pavement items and lane bins only), he answered: **"Yes 5"**. Asked whether that meant all five or only question 5, he answered: **"All 5"**.

**Goal.** The pipeline's city is furnished as the tile city is: trees and benches on every green (the courts' and the parks'), bins against the walls of the lanes, the tile city's street furniture on the pavements in front of its terrace runs (bins, planters, pot plants, benches, mailboxes, newspaper boxes on the wall line; parking meters beside kerb bays, trees, hydrants and bus stops on the kerb line; bollards at the corners), and the plazas and frontage lots dressed. Every prop stays clear of what stage 7 placed and of the other props; every pavement prop and lane bin also stays clear of stage 4's keep-outs (Q28, answer 5). Nothing changes in 3D until J draws them; the flat picture (`?city=plan&stage=ground`) shows them as points.

**What it ports** (the tile city's code; each number keeps its value and is pinned equal to the old path's while both exist, R-9):
- **The pavements:** `furnitureLayout`'s run loop (src/render3d/furniture.ts): its two lines, the groups and weights (`WALL_GROUPS`, `KERB_GROUPS`), the bollards, the per-run caps, the walk along a line (first place, fill chance, hashed gap, the weighted group order and key pick), and every keep-out it tests. Numbers: `FURN_KERB_M` 0.5, `FURN_WALL_M` 0.4, `FURN_PITCH_M` 7, `TREE_PITCH_M` 12, `BUS_STOP_MIN_RUN_M` 40, `FURN_KEEP_M` 1.5, `FURN_CORNER_M` 4, `FURN_MAX_H_M` 3.2, `P_FURN` 0.7, `FURN_GAP_SPAN_M` 6, `FURN_GAP_M` 0.3, `P_BOLLARD` 0.5, `BOLLARD_PER_RUN` 2, `HYDRANT_PER_RUN` 1, `MAILBOX_PER_RUN` 1, `NEWSPAPER_PER_RUN` 2, `BUS_STOP_PER_RUN` 1.
- **The meters:** `bayMeters` (tilecity.ts): a kerb-line meter stays only beside a kerb bay of its own block side.
- **The greens:** `fillGreen`'s trees and benches (tilecity.ts; 19.4): `GREEN_TREE_ONE_IN` 3, `BENCH_FROM_PATH_M` 1.0, a bench beside each path facing it, a tree at a cell's middle with a hashed quarter turn, and the keys `propPlan` gives them (`TILE_TREES`, `TILE_BENCH`; tileslots.ts). The paths are stage 3's (`pathCells`, C1) and are not re-laid. "Park furnishing" on the tile city is exactly this (a park is green with crossing paths, 19.6); there is no other park prop to port.
- **The lanes:** the alley bins (tilecity.ts; 19.6): `ALLEY_BIN_EVERY_M` 10 along the lane, alternating sides, never in an end cell, and `TILE_BINS`. `ALLEY_BIN_OFFSET_M` is not ported (LB).
- **The plazas and frontage lots:** `furnitureLayout`'s open-lot branch (its `accept` group rule, `SLAB_MAX_M` 0.2): a plaza's trees, picnic table and umbrella or hot-dog stand, benches, planter and pots; a parking lot's lines, barriers, meters and pole billboard (`P_PARKING_BILLBOARD` 0.6, `BILLBOARD_BOARD_LIFT_M` 4.55).
- **Not ported:** `P_ALLEY`, `P_ALLEY_SECOND` and `alleyOf` (the old town's 1.0 to 1.5 m alleys; the pipeline has no such gap, M5); the plaza's four `Sidewalk_Panel_02` panels (PZ); `FURN_DRAW_CALLS_MAX` (J's); `WIRE_CLEAR` and the wire, drop and pad keep-outs (stage 6's things; NL); `courtLotPieces` (on the pipeline a court's mouth is never laid as a lot, so there is nothing to take out); the build-out trees (stage 4 places them; E draws them).

**What each tile-city word means on the pipeline's cells** (the architect's readings; none changes a rule or a number):
- **RN. A terrace run** is a pavement run (`CityPavementRun`, typed): a chain of row neighbours (H1b's run: consecutive buildings of one `CityBuildingRow` with no opening between) on an outer row whose cells' `front` open side `faces` "street", with the pavement cell one cell out across `front` in front of each cell. Every such cell is an edge cell of role `pavement` (any variant); one that is not fails the stage (R-2) and the builder stops. Only these pavements carry pavement props, as 16.5 has it ("only on the pavements in front of terrace runs"): an edge street's outer side, and the pavement in front of a park edge, a plaza, a lane mouth, a drive or a frontage lot, carries none. A ring-1 corner cell is in the run of the row whose building holds it (F1); the cross row's run ends one cell short, as a tile-city run ends at the corner lot's wall. Stage 8 works the runs out itself from `buildings.rows`, `buildings.buildings` and `mass.built` (no stage folder imports another, R-1; H1b's `runsOf` is not imported).
- **PF. The run's frame** is the tile city's 5 m pavement frame, `{ wall_m: 0, kerb_m: CELL_M }`: `s` along the street from `lo_m`, `t` from the wall edge (the built cells' front cell edge) to the kerb edge (the pavement cell's carriageway edge). A wall-line prop's back is `FURN_WALL_M` from the wall edge, a kerb-line prop's front `FURN_KERB_M` from the kerb edge, and every prop faces the street (the row's `front`).
- **KO. Stage 4's keep-outs** are `tileKeepouts`' rectangles: every edge cell of role `kerbCut` or `pavementCorner`, and (new on the split plan, for the same reason: a crossing lands there) every pavement cell with `CITY_GROUND_VARIANT.pavementDip`. No pavement prop and no lane bin comes within `FURN_KEEP_M` of one. **(Q28, answer 5)** KO reads pavement props and lane bins only, as on the tile city: a plaza's or frontage lot's pieces are not tested against it (a plaza's front bench stands 1.25 m from the corner cell, a lot's lines tile and meter at its own kerb cut). Build-out cells, bay tiles, grates and kerb returns are not keep-outs, as on the tile city. **BT:** a build-out tree is stage 4's, and the kerb line does not space from it (as on the tile city; the report counts the near pairs).
- **AV. Stage 7's reach** is `furnitureInput`'s `avoid` list: every stage 7 piece on an open face is a box (its kit bounds at its placement, in plan, from the column's frame and `yaw`; an escape's `scaleY` and `boxes` applied) with a base; a prop taller than a box's base does not overlap the box. The pieces: H1b's `dressing` but glass (the awnings reach 4.06 m over the pavement at 2.85 m up; the fascia and blade signs; the ATMs, at 0.6 m), H2's `walls` of kinds "escape", "canopy", "aircon" and "planter" (the escapes reach 2.11 m), and H1c's `novelty` face signs. H2b's party-wall pieces and every roof piece stand above a roof and are not read. The ground storeys (`facades.ground`) are not boxes, as on the tile city; the pre-check measures their bounds' front past the cell edge against `FURN_WALL_M`. Stage 8 carries its own copy of those keys' bounds (`facadebounds.ts`, R-6), pinned equal to the facades kit's.
- **GB. A bench per path.** On the pipeline a path is a straight run of two or more `greenPath` cells along x or z (a cell where two cross is on both); stage 3's paths may be cut by a court's cells, and each piece is its own path. Its bench stands in the green cell beside its middle cell (`floor(n / 2)` from its low end), on the higher side first, then the lower, facing the path, `BENCH_FROM_PATH_M` from the path's edge, as `fillGreen`; a cell takes one bench at most. A tree stands on every `green` cell (a court part's or a park's) whose `rand("green", "tree", i, j) % GREEN_TREE_ONE_IN` is 0 and that holds no bench, at the cell's middle, with a hashed quarter turn and a hashed key of `TILE_TREES`.
- **PZ. A plaza** (a mass `plaza` opening, 2 by 2 cells, the tile city's 10 m plaza) gets `furnitureLayout`'s plaza pieces at lift 0, without its four `Sidewalk_Panel_02` panels: stage 3's plaza is paved as the apron (E draws it; grammar rule 10, one walk colour; 063 D replaced `Panel_02` with `Sidewalk_01`), and the grammar wins over 16.5's "four paving panels". Its frame's front is one of its two street sides, by `rand("plaza", "front", <opening id>) % 2` (on the tile city, the side past the end of the run that ends at it). **(Q28, answer 5) AV:** a plaza's pieces keep clear of stage 7 as pavement props do: a group (`furnitureLayout`'s `accept` unit) with a piece over which a stage 7 box's base is lower than the piece's top is left out, whole, and not moved. Most plazas lose a tree (the pre-check: 168 of 251 trees and 32 of 78 hot-dog stands left out on 20 runs); every plaza is still dressed.
- **FL. A frontage lot** (a mass `frontLot` opening, 2 by 2 cells) gets `furnitureLayout`'s parking-lot pieces: its two `ParkingLines_01` tiles (E draws a frontage lot bare, so these are its only lines), the barriers along its back edge, its meters and the pole billboard. Its front faces its mouth's street. "Under its run's lowest height cap" reads, on the pipeline, as the lowest eave (3 x `storeys`) of the buildings with a cell beside the lot: at least 9 m against the billboard's 6.9 m, so it always passes. A court's stalls, aisle, drive and apron get nothing (as on the tile city; E draws a court's lines). **(Q28, answer 5) AV:** as PZ, a lot group with a piece over which a stage 7 box's base is lower than the piece's top is left out (none is on the 20 named runs, per the pre-check).
- **MT. The meters.** After a run's layout, a kerb-line `meter` stays only where a `CityKerbBay` with the run's `street` and `block` is level with it along the street (`|along - bay| <= bay.w_m / 2`). Its place is not refilled, as `bayMeters` leaves it.
- **NL. No lamps: the lamps are the circuit's.** Stage 8 places **no** lamp, neither one of the game's lamps nor one as dressing. `SM_Prop_LightPole_*` is never used (16.6: "a lamp reads as a puzzle lamp"), and the tile city's furniture places no lamp, signal or cabinet. The street lights and the game's lamps, with their reach, are stage 6's (K, ticket 059: "Town Pack street lights distinct from puzzle lamps"). Stage 8 neither reserves nor tests lamp reach. It keeps `FURN_KEEP_M` from every pole, lamp post and node stage 6 places, which today is none: stage 6 is not built and `CityCircuitLayer` has no field. So the keep-out takes a list of points that the stage passes empty, and a fixture proves a point keeps a prop out. When K types the circuit layer, K's re-cut fills that list; stage 8's digest then moves, and stages 1 to 7 do not. The circuit's pole slots (`poleSlots`, tilecity.ts) are K's to move, not stage 8's.
- **QF. Quiet faces other than lanes.** Grammar rule 9 lists "bins against the wall clear of doors" for every quiet frontage (lanes, drives, walk-throughs, courts); the tile city put bins only by its lanes. I ports the tile city: bins by lanes only. Bins on court aprons are allowed by the grammar and are a later ticket, not I.

**Rules Josh decided** (Q28, 21 Nov 2026: "Yes 5", then "All 5"; each was a pre-check question and is written as he answered it):
- **EL. Nothing stands under a fire escape** (new; answer 1, yes). AV's base for an escape is its lowest box (the drop ladder's foot, about 0.1 m over the walk), not the first deck's base, so no pavement prop and no bin stands anywhere under an escape's footprint. On the tile city (`avoidBoxOf`, the piece's `y`) a bin or a bench may stand where the drop ladder lands. About 100 street escapes and 25 lane escapes a city (measured at 5b2998c).
- **DK. Clear of residents' doors** (new on pavements; answer 2, yes). No wall-line prop and no bin overlaps the strip in front of a `door` or `doorCorner` ground piece's column: that column's 5 m along each of its open sides, out `FURN_KEEP_M` from the wall. The grammar asks it of bins (rule 9: "bins against the wall clear of doors"); the tile city has no door keep-out on its pavements, so there it is a new rule. Shop doors are not covered (the tile city's shopfronts are open to furniture). About 420 street doors and 80 lane doors a city.
- **LB. Lane bins against the wall, in the lane** (changes 19.6's placement and drops a number on the pipeline; answer 3, yes, with the walk centred on a building bay). The tile city stood its bins on the apron beside a lane, `ALLEY_BIN_OFFSET_M` (3.3 m) from its centre line, and 19.6 says "never in the lane ... No furniture stands in the lane". On the pipeline the cells beside every lane cell are built or a drive, never apron (measured at 5b2998c, 20 of 20 runs), and grammar rule 9 makes the lane a quiet frontage whose bins stand "against the wall clear of doors". So a lane bin stands in the lane cell, its back `FURN_WALL_M` from the wall of the built cell beside it, facing into the lane, at `s = CELL_M + ALLEY_BIN_EVERY_M / 2 + CELL_M / 2 + n x ALLEY_BIN_EVERY_M` from the lane's low end (12.5, 22.5, 32.5 m ...) while `s <= length - CELL_M - 0.5`, on the + side for even n and the - side for odd. **(Q28, answer 3)** The tile city's walk (`CELL_M + ALLEY_BIN_EVERY_M / 2 + n x ALLEY_BIN_EVERY_M`) puts every bin on a cell edge, where it touches the door strips of two columns at once; the half cell (`CELL_M / 2`) centres it on a building bay. The pre-check: 539 lane bins on 20 runs (16 to 37 a city) against 166 on the cell-edge walk. `ALLEY_BIN_EVERY_M` keeps its value; the half cell is a new offset, not a ported number. It is skipped (not moved) where the cell beside is not built, where its pivot's cell is a `laneMouth`, or where DK, EL or AV refuse it. A bin takes about 1.1 m of the lane's 5 m; 3.9 m stay clear. The grammar decides it (it wins over the guide); Josh confirmed the visible change, and L edits 19.6's line.
- **GS. No extra keep-out in front of the ground storeys** (answer 4, yes). Four ground keys' bounds reach past `FURN_WALL_M` on run faces (up to 0.557 m, the pre-check), but below 2.5 m only `Apartment_Door_01`'s step (0.525 m, which DK already keeps clear) and a 1.1 cm ledge on `Shop_04` do. A wall-line prop's back stays `FURN_WALL_M` from the wall edge on every column; no rule reads the ground pieces' bounds. The report counts `Shop_04`'s near pairs (criterion 10).
- **Q5. Plazas and frontage lots under stage 7; the keep-outs' scope** (answer 5, yes). Josh was asked: "Plazas and parking lots are dressed as on the old city, except that a piece that would stand under an awning or fire escape is left out (most plazas lose a tree). The kerb-cut and corner keep-outs apply to pavement items only. Yes?" It is written into PZ and FL (AV) and KO, and the R10 keep-outs check below.

**Checks** (a new `groundcheck.ts`, `groundFailures(layer, input)`, run by the stage before it returns; a failure names its check and the cells. **Stop rule (R-2):** if one fails on a named run, the builder stops and reports; nothing is loosened or tuned):
- **R10 pitch:** props on one line of a run closer than `FURN_PITCH_M` centre to centre; trees of one run closer than `TREE_PITCH_M`; two footprints of one run closer than `FURN_GAP_M`.
- **R10 pavement:** a pavement prop's footprint outside its run's walk (`t` from 0 to `CELL_M` less `FURN_KERB_M`; `s` from `lo_m` to `hi_m`), or off its line.
- **R10 corners:** a pavement prop within `FURN_CORNER_M` of its run's ends.
- **R10 keep-outs:** a pavement prop or lane bin within `FURN_KEEP_M` of a KO cell or of a keep point (NL). Plaza, lot and green props are not read (Q28, answer 5).
- **R10 caps:** a run over a per-run cap; a bus stop on a run under `BUS_STOP_MIN_RUN_M`.
- **R10 place:** a prop off its place: a green prop on any cell but `green`; a lane bin outside a `lane` cell, in a `laneMouth`, or more than 1e-6 m off its wall line; a plaza or lot piece outside its opening's cells; a pavement prop whose cell is not one of its run's `pavement` cells. (A bench in a court's aisle fails here: the first cut's fixture.)
- **R10 clash:** two props that are not flat overlap (a plaza's or lot's pieces by `furnitureLayout`'s `accept` rule).
- **stage 7 (AV, EL):** a prop taller than a stage 7 box's base overlaps it (every prop, a plaza's and a lot's pieces included: PZ and FL leave such a group out).
- **doors (DK):** a wall-line prop or a bin in a door strip.
- **meters (MT):** a kerb-line meter level with no bay of its run's block side.
- **greens (GB):** a bench not facing a path cell or not `BENCH_FROM_PATH_M` from its edge; two benches in one cell; a tree off its cell's middle or on a bench cell.
- **keys:** a prop's key not in the kit's list for its kind (R12's never-used audit is J's).

**Acceptance criteria.**
0. [ ] **The architect's part (done with this re-cut):** `CityGroundPropKind`, `CityGroundPlace`, `CityPavementRun`, `CityGroundProp` and `CityGroundLayer`'s `runs` and `props` in `src/core/cityplan.ts`, with the rules in the comment above them. No earlier layer's type changes, so nothing G2 or stage 7 reads changes; one `npx tsc --noEmit` passed after the change.
1. [ ] **The kit** (R-6). A new `kit.ts`: the 24 furniture keys (`furnitureKeys()` less `Sidewalk_Panel_02`, PZ) with their bounds and kinds, every front +z, and the tree, bench and bin keys; a new `constants.ts` with every number in "What it ports", each with a one-line comment naming its tile-city source; a new `facadebounds.ts` with the bounds of every stage 7 key AV reads (H1b's 15 non-glass dressing keys, H2's 8 wall keys, H1c's 17 novelty keys). A new `src/render3d/furnpin.test.ts`:
   - **Always (no GLB):** the kit's keys equal `furnitureKeys()` less `PLAZA_PANEL`; each bound equals `furniture.test.ts`' fixture (typed into the test, as `roofpin.test.ts` does); the tree, bench and bin keys equal `TILE_TREES`, `TILE_BENCH` and `TILE_BINS`; every ported constant equals its `furniture.ts` or `tilecity.ts` original; `facadebounds.ts` equals `DRESS_BOUNDS`, `WALL_BOUNDS` and `NOVELTY_BOUNDS` key by key for its keys; no kit key matches `CITY_NEVER_USED`.
   - **Inside `it.skipIf(!HAVE_GLB)`**, read lazily as `roofpin.test.ts` does: every kit key's bounds equal the converted GLB's within 0.005 m.
2. [ ] **RN on the 20 named runs** (Vitest, a new `runs.test.ts`). Every run is a chain of row neighbours of one outer row whose fronts face "street"; every such street-front outer cell is in exactly one run; each `pavement` cell is the cell in front and an edge cell of role `pavement`; `lo_m`, `hi_m`, `wall_m` and `kerb_m` are the cells' edges; no run lies on an edge street's outer side. Hand-worked: a fixture row of three buildings broken by a drive gives two runs, their ends computed by hand.
3. [ ] **The pavements on the 20 named runs** (Vitest, a new `pavement.test.ts`). Every check passes; the test finds every wall and kerb group, bollards and at least one bus stop on the named runs; the caps hold per run; every meter is beside a bay of its block side, and some run's layout had meters MT took out (so MT is exercised). Hand-worked, each pivot by hand from the bounds: a wall-line bench (`t` = 0.4 + 0.624 / 2), a kerb-line hydrant (`t` = 5 - 0.5 - 0.54 / 2), a bollard `FURN_CORNER_M` + 0.4 from a run's end; a kerb-line tree refused under a fixture awning and a bench placed under it (AV's height rule).
4. [ ] **The lanes on the 20 named runs** (Vitest, a new `lanes.test.ts`). Every bin holds LB, DK, EL and AV; none is in a `laneMouth` or beside a drive; the test finds bins on every named run, and places refused for each reason (not built, door, escape). Hand-worked: a bin against a fixture lane's + side wall at `s` = 12.5 m (the walk's first place, centred on a building bay; Q28, answer 3), its pivot and yaw by hand.
5. [ ] **The greens on the 20 named runs** (Vitest, a new `greens.test.ts`). GB holds; every path of two or more cells with a free green cell beside its middle has its bench; the trees are exactly the hashed green cells less the bench cells; the test finds trees and benches in court parts and in parks. Hand-worked: a fixture 3 by 5 green with a long path gives its bench's pivot and yaw by hand.
6. [ ] **The plazas and frontage lots on the 20 named runs** (Vitest, a new `lots.test.ts`). Every plaza and every frontage lot on the named runs is dressed, every piece inside its opening and clear by `accept`'s rule; no `Sidewalk_Panel_02` anywhere; a billboard stands only under its lot's lowest eave. Fewer plaza trees than plazas is expected (Q28, answer 5: a group under a stage 7 box is left out; the pre-check left out 168 of 251 trees). Hand-worked: a fixture plaza's bench and tree pivots and a fixture lot's two lines tiles, by hand.
7. [ ] **The checks** (Vitest). `groundcheck.ts` as above. **Failing fixtures** (a new `fixtures.test.ts`), each from the default city's layer (6 x 6 seed 1, one-way on) with one thing changed; each fails its check and only it, unless it says otherwise. Positive control: the default layer passes.
   - a bench moved into a court's `aisle` cell fails R10 place (the first cut's fixture); a tree moved onto a `greenPath` cell fails R10 place (and greens);
   - a second prop on a wall line 3 m from another fails R10 pitch; a kerb tree 8 m from another fails R10 pitch (trees);
   - a pavement prop moved 1 m past its run's end fails R10 corners (and R10 pavement); one moved onto the kerb edge fails R10 pavement;
   - a pavement prop moved to 1 m from a `kerbCut` cell fails R10 keep-outs; a keep point added at a prop fails R10 keep-outs;
   - a second hydrant on a run fails R10 caps;
   - two benches on one spot fail R10 clash (and R10 pitch);
   - a kerb tree moved under an awning fails stage 7; a bin moved under an escape's drop ladder fails stage 7 (EL);
   - a bench moved in front of a residents' door fails doors; a lane bin moved in front of a lane door fails doors;
   - a meter moved to a stretch with no bay fails meters;
   - a bench turned away from its path fails greens;
   - a bin given a bench's key fails keys.
8. [ ] **The picture** (R-5). Legend: 0 "nothing", 1 "pavement run" (its pavement cells); points: 2 "tree", 3 "bench", 4 "bin", 5 "planter or pot plant", 6 "mailbox or newspaper box", 7 "meter", 8 "hydrant", 9 "bus stop", 10 "bollard", 11 "lot piece" (lines, barrier, lot meter, billboard), 12 "plaza piece" (picnic table, umbrella, hot-dog stand). The R-5 test in `stage.test.ts` checks the lattice size, the legend, each cell against `runs`, and one point per prop.
9. [ ] **R-1 to R-7 and the stage list** (Vitest, a new `stage.test.ts`).
   - `src/city/stages.ts` adds the ground stage to `BUILT_STAGES` (one line, as H1 did for facades). Stage 6 (`circuit`) is still not built; the runner skips it.
   - R-4: the ground digest pinned on the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on), the report naming each; a test double for ground leaves every earlier digest (streets to facades) equal to the standard run's, its list built by replacing the stage named `ground` (F3's rule), never by dropping the last.
   - R-1: the layer is frozen; a stage that writes into `facades` fails naming itself. R-3: the same city twice gives the same layer. R-7: 6 x 6 seed 1 ends `ok`; the stage reads only `streets`, `land`, `mass`, `edge`, `buildings` and `facades` (nothing of `circuit`); grep tests: no file of `src/city/ground/` imports another stage folder, `src/render*/`, three or the DOM, or reads `bi`, `bj` or a street's `line`.
   - **The other folders' tests that name the stage list** (the only lines outside the folder I edits): `src/city/facades/stage.test.ts`' `BUILT_STAGES` names assertion gains `"ground"`, that line only; `src/city/facades/testcities.ts`' `stagesOf` returns the built stages up to and including facades, that function only, so every facades test runs exactly the stages it ran at 5b2998c (its "run through stage 7" comment holds, and the digest-keys assertion beside the stage list stays as it is); `src/city/pipeline/run.test.ts`' "not built" line for `"ground"` is deleted (its `"circuit"` line stays). Every facades, buildings, edge and pipeline test passes as merged.
10. [ ] **The numbers** (reported, not asserted; a new `report.test.ts`), per named run and the lowest or highest with its run: runs and their lengths; props by kind and place; pavement props per 10 m of run (R10's eye number: on the tile city about one every 8 m, never more than one every 5; the pre-check measured 0.6 to 0.7 per 10 m, 0.64 to 0.74, about one every 15 m: reported, not a check, and nothing is tuned toward the tile city's number); places refused by each reason (corners, KO, AV, EL, DK, caps, pitch, clash) and meters MT took out; lane bins placed and refused by reason; benches and trees on greens, by court part and park; plazas and lots dressed, pieces refused (groups left out under a stage 7 box, by kind); kerb trees within `TREE_PITCH_M` of a build-out tree (BT); the ground storeys' bounds front past the cell edge on run faces (the most), against `FURN_WALL_M`, and `Shop_04`'s near pairs (a wall-line prop in front of a `Shop_04` column; GS); the stage's time per city. **Outside cities (best effort, report only; Josh's ruling):** 3 x 3 and 6 x 4 seeds 1 to 20, one-way off and on, each `ok` or its failure named; no test asserts them and nothing is tuned for them.
11. [ ] (Main session, phone-sized screenshot) `?city=plan&stage=ground` on 6 x 6 seed 1 shows the points along the pavements, in the lanes, on the greens and in the plazas. `?view=3d&city=plan&stage=assemble` looks as on `goal/city-style` (plan3d runs until facades; J draws stage 8).
12. [ ] R-8 to R-11. **The builder runs these tests only:** `npx vitest run --maxWorkers=2 src/city/ground/ src/city/facades/stage.test.ts src/city/pipeline/run.test.ts src/render3d/furnpin.test.ts`, and one `npx tsc --noEmit`. The main session's gate is the full `npm run gate`.

- **Files** (every file I may edit; one owner, landscape):
  - new `src/city/ground/`: `constants.ts`, `kit.ts`, `facadebounds.ts`, `hash.ts`, `runs.ts` (RN), `keepout.ts` (KO, AV, EL, DK and the keep points), `pavement.ts` (the run loop and MT), `lanes.ts` (LB), `greens.ts` (GB), `lots.ts` (PZ, FL), `groundcheck.ts`, `stage.ts` (the stage and its picture), `index.ts`, `testcities.ts` (test support, as facades' is), and the tests `runs.test.ts`, `pavement.test.ts`, `lanes.test.ts`, `greens.test.ts`, `lots.test.ts`, `fixtures.test.ts`, `report.test.ts`, `stage.test.ts`. The builder may split a module, inside the folder;
  - `src/city/stages.ts`: the one line (criterion 9);
  - `src/city/facades/stage.test.ts`: the stage-list assertion only; `src/city/facades/testcities.ts`: `stagesOf` only (criterion 9);
  - `src/city/pipeline/run.test.ts`: the `"ground"` "not built" line only (criterion 9);
  - new `src/render3d/furnpin.test.ts`.
- **Must not:**
  - `src/core/` (criterion 0 is the architect's);
  - every other `src/city/` folder (`streets/`, `land/`, `mass/`, `edge/`, `buildings/`, `pipeline/` but the one line), and every file of `src/city/facades/` but the two named above. I reads stage 7's layer, never its code, and imports nothing from `src/city/facades/` (its bounds are `facadebounds.ts`' copy);
  - `src/render3d/` but the new pin test: `furniture.ts`, `tilecity.ts`, `tilecity3d.ts`, `tileslots.ts`, `models3d.ts`, `citymetrics.ts`, `plan3d.ts`, `planview.ts` and their tests are read or run, never edited (R-9: the old path keeps its furniture until L);
  - no other section's check reads I's layer or lists; J is the first reader of `ground`.

  **If I needs any of them** (a field only stage 7 could give, a check another section's code reads, a change to `plan3d.ts`), the builder stops and reports, and the architect re-cuts.
- **Interfaces.** Criterion 0. The run walk's and the keep-outs' shapes are internal to the folder. J reads `ground.props` (`placement`, `on`, `flat`); nothing else reads the layer. No new dependency.
- **Adds rules; changes no threshold** (Q28, Josh: "Yes 5", "All 5"): EL and DK are new rules; LB moves the lane bins off the apron into the lane (grammar rule 9 over 19.6), centres the walk on a building bay (a new half-cell offset) and drops `ALLEY_BIN_OFFSET_M` on the pipeline; GS adds no keep-out; PZ and FL leave a group under a stage 7 box out, and KO reads pavement props and lane bins only (answer 5). Every ported number keeps its value. RN, PF, KO, AV, GB, PZ, FL, MT, NL and QF are otherwise the architect's readings of the tile city's words on the pipeline's cells. Nothing merged moves: no earlier layer, digest pin or approved number changes; stage 8's digest is new.
- **Heavy.** The named-run tests build each named city once through `testcities.ts`' module cache (through facades, then the ground stage), with a 120 s timeout; the report has its own file.

**The pre-check** (done, c8cb583; Josh answered it, Q28) (`pipeline-designer`, "pre-check 070 I", on `goal/city-style` at the re-cut before it or later, its probe outside the repo as its instructions say). On the 20 named runs, one-way off and on, with the stage as cut here run three ways (as cut; without EL; without DK), it measures: the runs (count, lengths; any run whose front cell is not a pavement cell, none expected, else a stop); props by kind and place, and pavement props per 10 m against the tile city's R10 eye number; what EL and DK each cost (places refused, on pavements and in lanes); the lane bins (places, refused by reason, the lane width left clear); benches and trees on greens against `fillGreen`'s rule; plazas and lots dressed; the ground storeys' bounds front past the cell edge on run faces (if any is more than `FURN_WALL_M` below `FURN_MAX_H_M`, that is a fourth question, a ground-storey keep-out); and every check of the list above on every run. It writes `docs/design/070-I-precheck.md` with its questions in section 4, each with a recommendation; Q28 records Josh's answers.

### J · Assemble: facades and ground drawn; the whole-plan audit (renderer). Branch `ticket/070j-plan3d-dressing`
**Branch.** Cut from `goal/city-style` at cdb425e or later (stages 1 to 5, 7 and 8 merged; I's merge 45ede81; G and G2 draw the buildings and ground pieces in `plan3d.ts`).

**Josh's words (21 Nov 2026, in chat).** Asked whether to start J, he said: "Yes". Earlier rulings J follows: Q20 (20 Nov 2026): "instancing later"; Q24 answer 5 (21 Nov 2026): "Yes", to leaving `DRESS_MAX` off on the pipeline and letting J check the frame rate; Q23 (21 Nov 2026): "Yes, 2.1m", with PW3 (only `SM_Prop_Pipe_Present_03` fits a party wall; `_01` never fits and is never used).

**Goal.** At `?view=3d&city=plan&stage=assemble` Josh walks the whole pipeline city. G and G2's buildings and shopfronts now carry their glass, awnings, signs and ATMs, fire escapes, door canopies, wall props, party-wall boards, windows and pipes, rooftop items (water towers, roof exits, billboards, novelty signs) and face novelty signs; the streets, greens, lanes, plazas and frontage lots carry their furniture. He checks the frame rate with everything on.

**Re-cut (21 Nov 2026, the lead-architect, against cdb425e).** The first cut (three lines) was written before H1b to H3b, H1c and I. J now reads stage 7 and stage 8 as merged. It only draws: every piece is drawn where its `CityPlacement` says, through the tile city's own instancer, and J picks no key, turn, offset or level that a layer or E's drawing does not hold. So J adds no rule, threshold or number, and skips the pre-check (CLAUDE.md; see "Adds no rule or number" below). **Stop rule (as in E, G and G2):** where a layer does not say what to draw, the builder commits, stops and reports the cells (`PlanStopError`). The gap is a re-cut of that layer's section (facades or landscape), never a choice in `src/render3d/`.

**What J draws, and from where** (read on cdb425e):

| List (`src/core/cityplan.ts`) | What it holds | Host column |
| --- | --- | --- |
| `facades.dressing` (H1b) | glass, awnings, fascia and blade signs, ATMs | `cell` (its ground piece's first cell) |
| `facades.walls` (H2, H2b) | escape pieces (with `scaleY`, and the first piece's drop-ladder `boxes`; a `code:escape` piece is all boxes), canopies, wall air-conditioners, window planters; party boards, pipes and windows | `cell` (a party piece: the taller column) |
| `facades.roofs` (H3, H3b, H1c) | small roof props, water towers, roof exits, billboard structures and faces, roof novelty signs | `cell` |
| `facades.novelty` (H1c) | face novelty signs (`facades.shops` has no placement and is not drawn; a sign's kind is facades' to check) | `cell` (its shop's first cell) |
| `ground.props` (I) | every stage 8 prop: pavement furniture, lane bins, the greens' trees and benches, plaza and frontage-lot pieces | none |

`ground.runs` has no placement and is not drawn. `facades.ground` stays G2's.

**Measured on cdb425e** (a probe outside the repo). Every stage 7 and 8 key has one glTF primitive in the converted City Pack: one draw call per key when instanced, one per piece when cloned.

| City | G2's calls (floors and roofs + ground pieces + 1 grey) | stage 7 pieces / keys | stage 8 props / keys | J cloned per piece | J instanced per key (criterion 2) |
| --- | --- | --- | --- | --- | --- |
| 6 x 6 seed 1, one-way on | 10,279 (7,668 + 2,610 + 1) | 7,387 / 59 | 615 / 22 | about 18,280 | about 10,361 (+59, +1 escape boxes, +22) |
| 6 x 6 seed 3, one-way on | 10,427 (7,810 + 2,616 + 1) | 7,475 / 59 | 683 / 24 | about 18,590 | about 10,511 (+59, +1, +24) |

Over the four runs measured (seeds 1 and 3, one-way off and on), stage 7 uses at most 60 keys (of `DRESS_DRAW_CALLS_MAX`'s 120) and stage 8 at most 24 (of `FURN_DRAW_CALLS_MAX`'s 80). Stage 7 has 7,116 to 7,505 pieces a city. That is over `DRESS_MAX` (6,000), which is not applied on the pipeline (Q24 answer 5). No stage 7 or 8 key has an emissive factor or map in the GLB.

**Performance, plainly.** Cloning J's pieces one wrapper each, as G and G2 clone the floors, would take the view from about 10,300 to about 18,300 draw calls. J does not do that. It draws stages 7 and 8 through the tile city's existing per-key instancer (`dressGroup`, `models3d.ts`, read as it is), as `city=tiles` draws its dressing and furniture today. That was the first cut's criterion 1, and it is not new instancing work. It keeps J's addition under 100 calls (about 10,360 and 10,510 in all). So **J does not have to instance anything new to be usable.**

The 10,300 calls that remain are G and G2's building clones, which Josh has had on screen since G2. Whether the whole view holds its frame rate on a phone is what the main session's browser check measures (criterion 8). If it does not hold, the remedy is to instance the stack pieces (Q20's "instancing later"). That belongs in its own section, **J2** (renderer, `plan3d.ts` only), which needs Josh's separate approval (Q29). It is not part of J. It would rewrite G's and G2's one-group-per-building, `piece:<key>` wrappers and per-building colourway painting into instancing per key and colourway, along with their tests, which is a day's work on its own. The remedy is never a cap, and never dropping pieces.

**The keys load.** `sharedTileModels` already loads `dressKeys()` and `furnitureKeys()` into `ModelSet.dress` for every tile page, and `planInput` already merges those roots (`propInput`). Of the 85 keys stages 7 and 8 place on the runs measured, two are in neither list:
- `SM_Prop_Window_01` (the party window);
- `SM_Prop_Pipe_Present_03` (the party pipe; H2b's kit).

Both are in the converted manifest with a non-zero width and height and no warning, and both are nodes of `city-pack.glb`. So `sharedTileModels` loads them by name through its tile list (`planDress`), as it loads G2's corner doors. `planKeys()` gains those two keys and nothing else, and J needs no change to `models3d.ts` (the first cut's third file is dropped). `SM_Prop_Pipe_Present_01` is listed in `PARTY_PIPES` but stage 7 never places it (H2b; Q23's PW3), so it is not added.

1. [ ] **The run goes to stage 8** (Vitest). `createPlanAssembleRenderer3d` runs `runCity(..., "ground")` where it ran `"facades"`. A run that fails at `ground` draws nothing and shows that stage and its reason (`planFailureText`), as E does. `?view=3d&city=plan&stage=ground` (the flat picture) is still `planview.ts`'s, unedited.
2. [ ] **Pieces from placements only, instanced per key** (`plan3d.ts`, Vitest).
   - **Two pure lists** the tests read without Three.js:
     - `planDressDraws(plan)`: every piece of `facades.dressing`, `facades.walls`, `facades.roofs` and `facades.novelty`, once each, in those lists' order. Each entry carries its list's name, its index in that list, its `building`, its host `cell` (the table above) and its `placement`; a wall piece also carries its `scaleY` and `boxes`.
     - `planPropDraws(plan)`: every `ground.props` entry, once each, in order, with its `on`, `flat` and `placement`.
   - **Stage 7** is one `dressGroup(placements, roots, DRESS_DRAW_CALLS_MAX)` call. Each listed piece becomes one `DressPlacement` with the identity frame (`{ x: 0, z: 0, yaw: 0 }`) and the piece at (`x_m`, `y_m`, `z_m`), with `yaw_deg` in radians, a wall piece's `scaleY`, and its `boxes` as `EscapePart`s (`x_m` to `x`, ..., `rz_rad` to `rz`). So, as on `city=tiles`:
     - an escape's flights are scaled;
     - its ladder, and a code-drawn escape (`code:escape`, `CODE_ESCAPE_KEY`), go into `dressGroup`'s one box call;
     - the shop glass is `dressGroup`'s see-through glass;
     - every emissive material is swapped for a plain one.
   - **Stage 8** is one `dressGroup(..., FURN_DRAW_CALLS_MAX)` call. Each prop goes through `furniturePlacement` (`models3d.ts`) with the levels `{ pavement_m: 0, yard_m: 0 }`:
     - every place a prop stands on (`on`) is drawn at 0 by E. The pavement is the walk (`TILE_LEVELS` "pavement"). A green, lane, plaza or frontage lot is interior "ground" (057 D: "flush with the pavement's walk (0)");
     - a prop's base is that level plus its `placement.y_m` (a pole billboard's board: `BILLBOARD_BOARD_LIFT_M`);
     - a flat piece (`lotLines`) is lifted by `furniturePlacement`'s own `GROUND_LIFT_M`. J types no level.
   - **Colourways: none apply.** Stage 7 and 8 pieces keep the base atlas, whatever colourway their building is drawn in (style guide 16.9, its Info (054) line: "dressing and furniture keep the base atlas whatever colourway their block is drawn in"). The party boards, pipes and windows are stage 7 dressing, so the same holds for them. G and G2's buildings stay painted as they are.
   - **The fallback** (drawing only, as G and G2's):
     - a stage 7 piece is drawn only when its key's root loaded (`code:escape` needs no root) and its host column is drawn from the pack, not one of G's whole-column grey fallbacks. A grey fallback box stands from 0 to the roof piece's base, so roof items on it would float;
     - a stage 8 prop is drawn when its key's root loaded;
     - a piece that is not drawn gets no grey box (the tile city's dressing has no code fallback). So with empty `roots` (code only, CI, before the models load) no stage 7 or 8 piece is drawn, and the view is G2's;
     - a stage 7 piece on a column whose ground slot alone is grey (its ground piece's root missing) is still drawn.
   - Tests, with stub roots (one mesh per key) and no GLB:
     - one piece of each list and each kind is checked: glass, awning, each sign, ATM, each wall kind, each roof kind, a face novelty sign, and each stage 8 kind. Its instance matrix equals `dressMatrix` of its placement: position, turn (at the four turns where the list has them) and `WORLD_PER_METRE` scale, an escape piece's `scaleY`, and one drop-ladder box's matrix;
     - a flat `lotLines` stands 0.01 m (`furniturePlacement`'s lift) over 0, and a `billboardBoard` at its `y_m`;
     - with one stage 7 key's root missing, only that key's pieces are not drawn. With one above-ground key missing, the stage 7 pieces on the columns that fall back are not drawn and those on other columns are;
     - a stub root whose material is emissive is drawn with emissive 0 and no emissive map;
     - on a building painted in a loaded colourway, no stage 7 or 8 material is a colourway clone (its `map` is the stub's base texture).
3. [ ] **Draws only, every piece once** (Vitest, on the 20 named runs: 6 x 6 seeds 1 to 10, one-way off and on).
   - Every layer's digest (streets, land, mass, edge, buildings, facades, ground) is the same before and after `plan3dGroups`.
   - `planDressDraws` lists every piece of the four stage 7 lists exactly once, and `planPropDraws` lists every `ground.props` entry exactly once.
   - With a full stub pack, every listed piece is drawn. For each key, its `dressGroup` instance count equals its listed count, and neither cap leaves a key out.
   - G and G2's counts hold unchanged: every column piece and ground piece once, and one grey instance or none per column, as G2 says. E's counts hold too: every `ground` record, every kerb seg but `opening`, every non-built mass cell.
   - The full Three.js group (stub roots) is built only on the default city and the four pin cities (6 x 6 seeds 1, 2, 3 and 8, one-way on).
   - **Failing fixtures**, built from the default city's run in the test, not pinned by hash:
     - the exactly-once check fails with one piece dropped from each of `dressing`, `walls`, `roofs`, `novelty` and `props` in turn, and with one of each listed twice;
     - the per-key drawn check fails, naming the key, on a stub pack where one key's root has more meshes than the cap leaves room for (so the key is left out);
     - `plan3dGroups` throws `PlanStopError`, naming the cell, on each of these plans:
       - a facades layer with a stage 7 piece whose key the page does not load (`dressKeys()`, `planKeys()` or `code:escape`);
       - a stage 7 piece whose `cell` is not a column of the buildings layer;
       - a stage 8 prop whose key the page does not load;
       - a plan with no `dressing`, `walls`, `roofs` or `novelty` list (optional in the type, but every merged stage 7 writes them), or no `ground` layer.
4. [ ] **R12, the whole-plan audit** (Vitest; the checklist's R12 is stage 9's, "Every check has one stage").
   - A pure `planAudit(plan)` lists every key of the plan that `isNeverUsed` (`citymetrics.ts`, read as it is) names, with its layer, list and cell. It reads every placement of `buildings.columns`, `facades.ground`, `dressing`, `walls`, `roofs` and `novelty`, and `ground.props`, and every key the street pieces and interiors are drawn from (the tile and interior groups' keys).
   - **The one allowance is the party-wall pipe:** `SM_Prop_Pipe_Present_03` on a `walls` piece of kind `partyPipe` (grammar rule 8's kit table; Josh, 19 Nov 2026: "Yes, dress it"; Q23 PW3). `SM_Prop_Pipe_Present_01` and `_02` are never allowed: the audit names them anywhere, on a `partyPipe` too. The allowance is one typed line in `plan3d.ts` (key and kind), not a change to `CITY_NEVER_USED` (L's guide line, below).
   - `planAudit` is empty on the 20 named runs, and no `SM_Prop_Pipe_Present_01` stands on any of them (H2b's PW3: it never fits).
   - **No emissive dressing:** with stub roots whose materials carry emission, no stage 7 or 8 mesh that `plan3dGroups` draws is emissive (criterion 2's `dressGroup` swap). Inside `it.skipIf(!HAVE_GLB)`, read lazily: no key the plan places on 6 x 6 seed 1 has an emissive factor or map in `city-pack.glb`.
   - `plan3dGroups` runs `planAudit` and throws `PlanStopError` (the cells named) when it is not empty. A never-used key is a gap in the layer that placed it, and is never filtered out in `src/render3d/`.
   - **Failing fixtures**, from the default city's run. Each makes `planAudit` name exactly that piece, and makes `plan3dGroups` throw:
     - a dressing piece re-keyed to `SM_Prop_LightPole_01`;
     - a `partyPipe` re-keyed to `SM_Prop_Pipe_Present_01`;
     - `SM_Prop_Pipe_Present_03` on a `canopy` piece;
     - a stage 8 prop re-keyed to `SM_Veh_Car_01`.
5. [ ] **The keys load** (Vitest).
   - `planKeys()` gains `city-pack:SM_Prop_Window_01` and `city-pack:SM_Prop_Pipe_Present_03`, and no other key.
   - A test checks that every key `planDressDraws` and `planPropDraws` list on the 20 named runs (but `code:escape`) is in `dressKeys()`, `furnitureKeys()` or `planKeys()`. It also checks that the two new keys are in none of `dressKeys()`, `furnitureKeys()` and `allStackKeys()`.
   - `tileGroupOf`'s `keys` stay what they were before J (the tile keys, the arrow, the corner doors and the trees), so E's street counts do not move.
   - If either key does not load from its name alone in the browser (the console's "N of M ground tile pieces loaded" line), the main session stops and reports. A re-cut then adds `models3d.ts`, plan path only. J never adds it on its own.
6. [ ] **Draw calls** (Vitest, code-drawn; the builder reports the pack's numbers). No cap is raised or added, and `DRESS_MAX` stays off (Q24 answer 5).
   - With a stub pack of one mesh per key, on the 20 named runs, stage 7's group stays within `DRESS_DRAW_CALLS_MAX` (120) and stage 8's within `FURN_DRAW_CALLS_MAX` (80), with no key left out. The street pieces stay within `TILE_DRAW_CALLS_MAX` (40) and the interiors within `INTERIOR_DRAW_CALLS_MAX` (24), as in E.
   - Inside `it.skipIf(!HAVE_GLB)`, read lazily, on 6 x 6 seeds 1 and 3 (one-way on), the builder reports:
     - the calls before J (G2's: floors and roofs, ground pieces, the grey call);
     - the calls after J: those plus stage 7's calls (counted per key from the GLB's primitives), the escape boxes' call, and stage 8's calls;
     - what cloning per piece would have cost;
     - stage 7's pieces by list and kind against `DRESS_MAX` (the runs over 6,000, and by how much), and stage 8's props by kind;
     - the triangles stages 7 and 8 add (each key's manifest `triangles` times its pieces).
   - If a real key has more primitives than the caps leave room for on either city, the builder stops and reports: the caps do not move without Josh.
   - After the models swap in, the renderer's console line gains: stage 7's pieces drawn out of those listed, and its calls; the same for stage 8; any key left out (none expected); and `gl.info.render.calls` for the next frame drawn, as G's line has.
7. [ ] **Nothing else changes** (Vitest and R-8, R-9). `?view=3d&city=tiles` draws as on `goal/city-style`. `tilecity3d.ts`, `models3d.ts`, `dressing.ts`, `furniture.ts`, `escapes.ts`, `citymetrics.ts`, `renderer.ts`, `planview.ts` and their tests are not edited. `planview.test.ts` and `tilecity3d.test.ts` pass unedited. The ladder is unchanged (`npm run playtest`).
8. [ ] (Main session, in the browser; the frame rate is J's to check, Q24 answer 5.) Open `?view=3d&city=plan&stage=assemble` on 6 x 6 seeds 1 and 3, at a phone size and at a desktop size, with the overhead and street cameras, in day and with `light=night`. Check that:
   - the city is in view, and no failure or stop text shows;
   - the dressing and furniture swap in with the buildings once the models load;
   - the console shows criterion 6's line, with no key left out and both new keys loaded;
   - the frame rate holds while panning, on the phone size and the desktop size.

   **The main session reports the frame rate to Josh plainly.** If it does not hold, it asks Q29 (J2). J does not change for the answer.
9. [ ] (Main session, screenshots sent to Josh.) Take two sets: phone-sized, and a higher-resolution set as Josh asked (desktop size, or a 2x device pixel ratio). Each has the street camera in day and at night and the overhead camera in day, on 6 x 6 seeds 1 and 3, one-way on, with G's three street-camera views, and `?view=3d&city=tiles` at seed 1 beside them. The screenshots should show:
   - shop glass, awnings and signs on the street fronts, an ATM here and there, and no shop dressing on a lane or court;
   - fire escapes on street faces with their ladders reaching the walk, and the quiet-side escapes over the lanes;
   - door canopies over residents' doors, and wall air-conditioners and window planters on the upper floors;
   - party walls above lower roofs dressed with boards, windows and pipes (in the base atlas on painted buildings, 16.9's rule);
   - on the roofs: water towers (about one per 16 buildings of a street block), roof exits, billboards and the odd novelty sign; and novelty signs on a few shop faces, matching their shops;
   - pavement furniture along the terrace runs: bins, planters, benches, mailboxes and newspaper boxes on the wall line; meters by kerb bays, hydrants, bus stops and trees on the kerb line; bollards at the corners;
   - bins in the lanes, trees and benches on the greens, and the plazas and frontage lots dressed;
   - nothing lit at night but the game's lighting (no emissive dressing), and nothing standing under an awning or a fire escape.
10. [ ] R-8, R-10 and R-11. Tests run: `npx vitest run --maxWorkers=2 src/render3d/plan3d.test.ts src/render3d/planview.test.ts src/render3d/tilecity3d.test.ts`, and one `npx tsc --noEmit`. The main session's gate is the full `npm run gate`.

- **Files:** `src/render3d/plan3d.ts`, `src/render3d/plan3d.test.ts`. The test's module cache builds the named runs through `"ground"` (its one-way-off stage list gains `groundStage`, read only).
- **Must not:**
  - `src/city/**` and `src/core/` (read only);
  - every other render3d file. These are read and imported only:
    - `models3d.ts` (`dressGroup`, `dressMatrix`, `furniturePlacement`, `planInput`'s inputs);
    - `dressing.ts` (`dressKeys`, `DRESS_DRAW_CALLS_MAX`);
    - `furniture.ts` (`furnitureKeys`, `FURN_DRAW_CALLS_MAX`);
    - `escapes.ts` (`CODE_ESCAPE_KEY`, `EscapePart`);
    - `citymetrics.ts` (`isNeverUsed`);
    - `tilecity3d.ts`, `tileslots.ts`, `renderer.ts`, `planview.ts`, `tilecity.ts`, `kerbline.ts`, `stacks.ts`, `colourway.ts` and their tests;
    - `town.ts` (`STOREY_M`).

  If J needs any of them changed, the builder stops and reports.
- **Interfaces:** nothing new in `src/core/`. J reads `CityFacadesLayer.dressing`, `walls`, `roofs` and `novelty`, `CityWallBox`, and `CityGroundLayer.props` as H1b to H1c and I left them. These belong to the renderer: `planDressDraws`, `planPropDraws`, `planAudit`, the allowance line, and the new `PlanDraw` fields (stage 7's and stage 8's `DressDraw`s and lists). No new dependency.
- **Adds no rule or number** (CLAUDE.md pre-check: none needed).
  - It draws the placements stages 7 and 8 wrote, with the tile city's instancer, its glass, its emissive swap and its flat lift.
  - The surface levels are E's drawn levels (0), read from `TILE_LEVELS`, not new numbers.
  - The caps are unchanged, and `DRESS_MAX` stays off (Josh, Q24).
  - The fallback (nothing drawn without a root or on a grey column, and no grey box for dressing) is drawing only, as G and G2's.
  - The R12 audit is the checklist's own check at its own stage. Its one allowance is Josh's rule 8 pipe (19 Nov 2026, "Yes, dress it"; Q23 PW3).
  - No threshold, Decided rule, digest pin or approved number moves.
- **Heavy:** the named-run tests build the 10 named cities both ways once, through the module cache, with a 120 s timeout. The Three.js groups are built on five cities only. No GLB is read outside `it.skipIf`. No browser for the builder (Josh's PC); the browser checks are the main session's.

**Not J's: the stage=ground legend overlap.** On `?city=plan&stage=ground` the flat picture's legend draws "mailbox or newspaper box" over the "meter" entry beside it. The legend's layout belongs to `planview.ts` (`createPlanRenderer3d`), whose columns are a fixed `Math.max(120, font x 9)` px wide and whose names are not measured. So the fix is the renderer's, in `planview.ts`:
- not the landscape agent's picture (its names are right);
- not J's (J must not edit `planview.ts`, whose test every plan section keeps unedited).

Recommended: a small renderer section after J (legend columns as wide as the longest name, or names wrapped, with a `planview.test.ts` case), on Josh's word (Q30). Otherwise L takes it.

### K · Stage 6, the circuit (first-cut outline only; not cut here)
**Josh's words (21 Nov 2026, in chat; Q4).** "I think that's stage 6 should be the collaborative work between the puzzle designer and the electrical grid agent".

**What the old tile city gives stage 6 today (read on 883cab7).** Nothing that plays. `tilecity.ts` reserves `poleSlots` (one every `Power_Cables_01` span, 12.45 m plus a pole, along each pavement, 0.09 m behind the kerb face, never on a corner, a crossing landing or a kerb cut; "reserved, nothing stands in them yet") and `tileKeepouts` keeps the furniture clear of them. No pole, wire, drop, pad, lamp, feed or puzzle node stands in the tile city, and `tilecity3d.ts`'s scene has empty wire, pole and hardware lists. Ticket 059 (poles, wires, street lights) was approved but never built. So K starts from 059's text and the old slot rule, not from working code.

**The split (one owner per section, honouring Q4).** Recommended order; each section is cut with its own Files when the one before it merges:
- **K1 · the circuit's design (puzzle-designer).** Where the circuit goes on the pipeline's cells, written as rules a stage can follow: pole slots (the old rule above, or Josh's change of it), spans and their longest run, service drops to which buildings, street lamps and their spacing, and the places a puzzle's feed, breakers, switches, fuse boxes, junctions and lamps may stand relative to stages 4 and 5 (kerb, buildings, lots). Plus one worked puzzle on a named city (6 x 6 seed 1) as a design note in `puzzles/`, saying what the priests want lit and the intended read. The `pipeline-designer`'s pre-check measures the rules on the 20 named runs before K2. Puzzle-designer first because the circuit's shape serves the puzzle (what must be lit, what the scarce parts are), and that is the designer's read; the simulator builds what the design says, as every other stage builds from the grammar.
- **(architect) `CityCircuitLayer` typed** from K1's rules, and the `Puzzle` fields a city puzzle needs (a puzzle that names its city, and nodes that name a circuit slot instead of a free `pos`), before K2.
- **K2 · stage 6, pure (grid-simulator).** `src/city/circuit/`: the stage function, its picture and its checks (every lamp and node on a slot K1 allows; every span within reach; the network connected from each feed), and the conversion of a city puzzle onto the circuit into a plain `Puzzle` that `src/grid/` runs unchanged. The grid-simulator's agent file gains the folder (the main session, on Josh's word; it owns `src/grid/` and `tools/` today).
- **I2 · ground clears the circuit (landscape).** Stage 8 keeps its furniture off K2's poles, as `tileKeepouts` did on the old path (R10).
- **K3 · the circuit drawn (renderer).** Poles, wires, drops and lamps from `CityCircuitLayer` in `plan3d.ts` (059's A2 drawing, re-cut).
- **K4 · play on the plan (renderer; core types by the architect first).** `?puzzle=<city puzzle>&view=3d&city=tiles` draws the game's state on the plan city: lit and dark lamps, live and dead lines, hover, picking (`hitTest`, today `null`), the Relight; the same `MapRenderer3d` interface, so `src/play/` and `src/ui/` do not change.
- **K5 · puzzles on the city (puzzle-designer).** New puzzle files on named cities; the ladder and `puzzles/locked/` are unchanged unless Josh says otherwise.
- **The street layer** (Enoch walking: the lamp's reach, salvage, the stall, the night clock in `src/night/`) is the brief's "Later: the street" and is not part of K.

### L1 · The switch: `city=tiles` shows the pipeline's city; the guide and grammar catch up (renderer). Branch `ticket/070l1-switch`
**Branch.** Cut from `goal/city-style` at the commit of this re-cut or later (883cab7: stages 1 to 5, 7, 8 and J merged).

**Josh's words (21 Nov 2026, in chat; Q1).** "Yes, let's work on L. We need to integrate the new city design with the game itself." On the stage=ground legend overlap (Q30): "Leave it", that is, leave it for L.

**Why L is split (the lead-architect, 21 Nov 2026, against 883cab7).** L as first cut switched the view and deleted the old path's tile-only code in one go. Read on 883cab7, the old path does no circuit or game work (see K above: `city=tiles` ignores the puzzle, the state, the hover and the Relight, `hitTest` is `null`, and nothing in `src/grid/`, `src/play/`, `src/ui/`, `src/render/` or `src/core/` imports it), so the switch removes nothing the game uses. But the deletion cannot be one renderer section:
- `plan3d.ts` draws through `tilecity3d.ts`'s instancer and rig (`tileGroupOf`, `interiorGroupOf`, `propInput`, `tileKeyOf`, `createCityRig`) and reads `tilecity.ts`'s `TILE_M`, `SIDEWALK_WALK_M` and `TileCell`;
- the ladder's 3D town reads `tilecity.ts` through `models3d.ts` → `terrace.ts` (`END_OVERLAP_MAX_M`, `PASSAGE_W_M`), and `frontage.ts` reads its types;
- the stage folders' own tests use the old path as their oracle: `src/city/streets/equal.test.ts` (`tileCity`), `land/stage.test.ts` (`planBlocks`), `land/reach.test.ts`, `mass/lots.test.ts`, `streets/parkplaces.test.ts`, `edge/constants.test.ts`. Those are the planner's and the streetscape's folders;
- K1 reads the old pole-slot rule.

So **L1** (this section) switches the view and brings the guide and grammar up to date, and deletes nothing. **L2** deletes the old path after K1 (see below).

**Goal.** Josh opens `/?puzzle=<any>&view=3d&city=tiles` and walks the pipeline's city, the same one `city=plan&stage=assemble` shows (default 6 x 6 seed 1; `blocks`, `seed`, `cam=street`, `at=i,j`, `dir` as there; day first, `light=night` and the L key as there). The old tile city is still there for comparison at `city=tiles-old` until L2 (Q31). The style guide and the grammar say the tile city is made by the pipeline, with every line Josh's rulings changed. The flat picture's legend no longer draws one name over another.

**Acceptance criteria.**
1. [ ] **The switch (Vitest, `plan3d.test.ts`; Josh in the browser).** A new pure `tilesPlanRequested(search): PlanAssembleRequest | null` in `plan3d.ts`: `city=tiles` without `sheet=1` gives exactly what `planAssembleRequested` gives for the same query with `city=plan&stage=assemble` (blocks default `PLAN_BLOCKS_DEFAULT` 6 x 6, clamped as there; seed; `cam=street`; `at`; `dir`); any other `city`, or `sheet=1`, gives null. Test cases: the bare `city=tiles`; `blocks=5x4&seed=2`; `cam=street&at=3,4&dir=+x`; an old-style `at=0` (null `at`, no throw); `sheet=1`; `city=plan`; `city=tiles-old`. `renderer.ts` routes a non-null result to `createPlanAssembleRenderer3d`, behind `import.meta.env.DEV`, before the old `city=tiles` branch. Josh checks in the browser: `?puzzle=01-first-light&view=3d&city=tiles` looks as `?…&city=plan&stage=assemble` does.
2. [ ] **The old view, kept until L2 (Vitest, `tileslots.test.ts`; Q31).** A new pure `oldTilesRequested(search): CityTilesRequest | null` in `tileslots.ts`: `city=tiles-old` parses as `cityTilesRequested` parses `city=tiles` today (default 3 x 3, `blocks`, `seed`, `sheet`); `city=tiles&sheet=1` keeps opening the tile sheet (a piece-orientation tool, not the old city); everything else null. `renderer.ts` routes it to `createCityRenderer3d` unchanged. `cityTilesRequested` and its tests are unchanged. If Josh answers Q31 "no", the `tiles-old` case is left out and only the sheet stays.
3. [ ] **The HUD (Vitest, `planview.test.ts`).** `planHidesHud` is also true for `view=3d&city=tiles` without `sheet=1`, in a dev build, as for `city=plan` (A3, Josh, 19 Nov 2026: "Yes, hide it"); false for `city=tiles-old`, the sheet, and a production build. The existing cases are unedited.
4. [ ] **The legend (Vitest, `planview.test.ts`; Q30).** The legend's column width comes from a new pure `legendColumnWidth(names, font, measure)` in `planview.ts`: the widest measured name plus the swatch and its gap, and never under today's `Math.max(120, font x 9)`; `measure` is passed in (the canvas's `measureText` in the page, a fake in the test). Test: with the stage=ground legend's names and a fake measure of 0.6 x font per character, no two names in a row overlap at 1000 px and at 390 px wide, and "mailbox or newspaper box" and "meter" do not overlap. Names are not wrapped or cut. The picture, its colours and its names are unchanged (the existing cases are unedited).
5. [ ] **The guide and the grammar (Vitest, `styleguide.test.ts`; the reviewer reads the diff).** Exactly these edits, and no other line changes meaning:
   - **Chapter 19's opening** says the tile city (`city=tiles`) is made by the pipeline, stage by stage, and points to `docs/city-grammar.md` and this ticket for the stages; chapter 18's opening sentence names the stages (stage 3's lots, stage 4's band and bays) where it names `tilecity.ts` and `tilecity3d.ts`. Every other sentence in chapters 18 and 19 that says `tilecity.ts` makes something the pipeline now makes points to the stage's module instead. The measured tables (18.8, 19.7) stay, headed as the old path's numbers (`city=tiles-old`, until L2).
   - **Retired lines go**, as the grammar's "Guide text that goes" lists: 19.2's far-end order, 19.4's ring-2 strip, 19.6's alley rear, 18.2's 5.2 m bays.
   - **Josh's four rulings of 19 Nov 2026 ("Yes, all four"; B2 and C2):** grammar rule 4's table: the 6-or-more row says a part whose interior is 2 cells deep parks in its own paved yard (a drive in, six stalls along the far side, the near side the aisle), and a lane leaves no court part with a long side under 8; grammar rule 6's walk-through row and its Decided paragraph: "only for an interior that has no drive and no lane" becomes "only for an interior that has no drive" (a lane beside the rings is not a way in); guide 18.1: `PARK_PER_HOME` 0.075, not 0.15, with Josh's ruling, and the same number where it is repeated (the guide's 057 Q3 default and its constants table row, and grammar rule 5's parking estimate).
   - **The A4 pre-check (20 Nov 2026, Q14):** guide chapter 18's P1 and its constants table row: the kerb supply floor `PARK_SUPPLY_BAND.lo` is 0.69, not 0.75 ("yes lower it"), for kerb bays only (P2's lot band stays 0.75 to 1.5); P3's cap counts over the whole block side ("1. yes").
   - **Q20, U2 ("Yes to all"):** grammar rule 2's check line: `OVERLAP_MAX_M` (0.6 m) holds wall trim, not a roof's cornice, which overhangs by what the piece carries (rule 11's words; style 01 up to 0.79 m).
   - **Q21 ("Yez, all three"):** grammar M1's and M2's check lines: on the ground storey the six deep shop keys stand front-aligned, width, front and open sides within 0.02, their back up to `OVERLAP_MAX_M` (0.6 m) into the built cell behind (H1 D5); M8's check line: exactly one door, or none on a ring-2 building with no door place (H1 D1).
   - **Q22 ("Yes all three"):** grammar rule 2's check line: awnings, signs and ATMs are shop dressing, not trim; they reach over the pavement as rule 9's 16.5 says (at most `CELL_M` past the front cell edge, an awning `CELL_M` - `AWNING_KERB_M`), and `OVERLAP_MAX_M` holds the buildings' own trim (H1b T1); M8's check line: a shop corner with one street and one quiet side keeps its wrap (its own glass and the L awning) on both faces, and its single-face pieces only on a street front (H1b X1).
   - **Q23 ("Yes, 2.1m"):** grammar rule 8's Rule line: `BLANK_RUN_MAX_M` is 2.1 m, Decided, not "3 m, section C's provisional number" (H2b PW4); rule 8's kit table, the pipe row: only `_03` fits (over a two-storey step), `_01` is never used and `_02` stands off the wall (H2b PW3, PW5).
   - **Q24 ("Yes to all except novelty signs ..."):** grammar rule 11's Rule list: a roof billboard stands `BILLBOARD_EDGE_M` (0.28 m) inside the body's edge, every other rooftop prop `ROOF_EDGE_M` (H3 BB); rule 11's "Not verified" line: the deck is at 0.50 m on all six roof keys, measured (`ROOF_DECK_M`; styles 2 and 3 have a 0.744 m rim outside it; H3 RT).
   - **Q26 ("Yes, all four"), the novelty sign's line, now written:** grammar rule 11's Rule list gains one line: "A novelty sign stands for the shop under it and always agrees with that shop's trade sign (H1c SK, SN). It stands flat on the wall over the shopfront, centred, above the awning or sign and under the roof line, on a street front only (H1c F), or on that shop's roof as the building's one big roof item (H1c RS). It is an extra, not a share to meet." Rule 9's shopfront row gains a pointer to that line, nothing more; and the guide's roofs default (052, "a novelty sign (one per run, on its lowest block)") gains one sentence: on the pipeline's city, grammar rule 11 places the roof items (H3, H3b, H1c).
   - **Q25 ("Yes to all"), the water-tower cap:** grammar rule 11's Rule list: at most one water tower per `WATER_TOWER_PER_BUILDINGS` (16) buildings of a street block, Decided (H3b; not in the grammar on 883cab7).
   - **J's R12 audit:** the guide's never-used table, its `SM_Prop_Pipe_Present_` row: `_03` stands on party walls (grammar rule 8), `_01` and `_02` never.
   - **Q17, Q18 ("yes, yes"; "yes"):** guide 19.6's whole-block park and its Info line: a whole park that nothing across a street can serve takes one tile of kerb bays on its own kerb (D1b criterion 13), and the first tiles are handed out as a best fit over the city (D1b criterion 12).
   - **Drift checks follow the constants.** Each `styleguide.test.ts` check whose guide line changes above reads the pipeline's constant from its stage module (`src/city/edge/`, `mass/`, `land/`, `facades/`; test imports only), not `tilecity.ts`; the old path's 0.15 and 0.75 lose their guide pins (the old code keeps its own tests until L2). No other check changes.
6. [ ] **R-8 (the playtester).** `npm run playtest` shows no ladder change.

**Files.**
- `src/render3d/renderer.ts`;
- `src/render3d/plan3d.ts` (only the new `tilesPlanRequested`) and `plan3d.test.ts` (new cases only);
- `src/render3d/planview.ts` (only `planHidesHud` and the legend's column width) and `planview.test.ts` (new cases only);
- `src/render3d/tileslots.ts` (only the new `oldTilesRequested`) and `tileslots.test.ts` (new cases only);
- `src/render3d/tilecity3d.ts` and `tileslots.ts`: the header comments that name the address, comment lines only;
- `docs/city-style-guide.md` (chapters 18 and 19, the constants table rows, the never-used row and the roofs default line named in criterion 5) and `src/render3d/styleguide.test.ts`;
- `docs/city-grammar.md` (only the lines criterion 5 names: rule 2's check line, rule 4's table, rule 5's parking estimate, rule 6's walk-through row and its Decided paragraph, rule 8's Rule line and its kit table's pipe row, rule 9's shopfront pointer, rule 11's Rule list and its "Not verified" line, M1's, M2's and M8's check lines).

**Must not.**
- Delete or change any code in `tilecity.ts`, `tilecity3d.ts`, `kerbline.ts`, `frontage.ts`, `terrace.ts` or `models3d.ts`, or any of their existing tests (that is L2).
- Touch `src/city/`, `src/core/`, `src/grid/`, `src/play/`, `src/ui/`, `src/render/`, `puzzles/`, `tests/playtest/` or `main.ts`.
- Change what `plan3d.ts` draws, any digest pin, any threshold, any Decided rule or any approved number. A guide or grammar line that does not match the code as merged is reported, not fixed in code.

**Tests the builder runs** (no browser; Josh's PC):
- `npx vitest run --maxWorkers=2 src/render3d/plan3d.test.ts src/render3d/planview.test.ts src/render3d/tileslots.test.ts src/render3d/styleguide.test.ts src/render3d/daytoggle.test.ts src/render3d/tilecity3d.test.ts`
- one `npx tsc --noEmit`.
- The main session runs `npm run gate` and the browser checks (`city=tiles` at 6 x 6 seed 1 and seed 3, `cam=street`, `light=night`, `city=tiles-old`, `city=tiles&sheet=1`, `city=plan&stage=ground`'s legend).

**Adds no rule or number** (so no pre-check). Every guide and grammar line in criterion 5 writes down a ruling Josh has already given (quoted with each); the switch, the alias and the legend change where things are shown, not what the city is. `tickets/rules-coverage.md` is unchanged: no brief rule moves.

### L2 · Delete the old tile path (outline; cut after K1 merges)
- **L2a (planner; streetscape; landscape, one section each where its folder has one):** each stage folder's tests stop importing `src/render3d/tilecity.ts`; an oracle comparison becomes a typed fixture of the values it compared (as `roofpin.test.ts` does), so no check loosens.
- **L2b (renderer):** the old path's tile-only code in `tilecity.ts`, `tilecity3d.ts`, `tileslots.ts` and `kerbline.ts`, and its tile-only tests, are deleted; what `plan3d.ts`, `terrace.ts`, `frontage.ts` and `models3d.ts` still read moves to a module they own or stays; `city=tiles-old` goes; every check runs only in its stage (the table); the guide's named cities for its checks become the pipeline's (6 x 6 seeds 1 to 10) and the old-path tables in 18.8 and 19.7 go. R-8 holds.
- **Why after K1:** the old pole-slot rule is K1's starting point, and K2 replaces `tileKeepouts`' pole keep-outs (I2). Deleting before K1 loses the only written version of it.

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
- **Typed by the architect before their sections start:** `CityEdgeLayer` (written 20 Nov 2026 with D1's re-cut: dressed cells, kerb cuts, tiles, bays, build-out trees, per-block shortfall, and `CityGroundCell`, the same shape as `TileCell`, for D2 to fill; the kerb line is typed before D2), `CityBuildingsLayer` (written 20 Nov 2026 with F1's re-cut: rows and buildings, with style, colourway, storeys, partner and back; F2's columns, ground slots, pieces and roofs written 20 Nov 2026 with F2's re-cut: `CityColumn`, `CityGroundSlot`, `CityPiece`, `CityPieceRole`, `CityBuildingsLayer.columns`), `CityFacadesLayer` (written 20 Nov 2026 with H1's re-cut: `ground`, `CityGroundPiece`, `CityGroundPieceKind`; H1b's `dressing`, `CityDressingPiece` and `CityDressingKind` written 21 Nov 2026 with H1b's re-cut; H2's `walls`, `CityWallPiece`, `CityWallPieceKind` and `CityWallBox` with H2's; H3's `roofs`, `CityRoofPiece` and `CityRoofPieceKind` written 21 Nov 2026 with H3's re-cut; H1c's `shops`, `novelty`, `CityShop`, `CityShopKind` and `CityNoveltySign` written 21 Nov 2026 with H1c's re-cut, Q26), `CityGroundLayer` (written 21 Nov 2026 with I's re-cut: `runs` and `props`, `CityPavementRun`, `CityGroundProp`, `CityGroundPropKind`, `CityGroundPlace`), and `CityCircuitLayer` (at 059's re-cut).
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
- **Instancing the stack pieces.** G's ~7.7k building draw calls were put to Josh with its screenshots; he answered "instancing later" (20 Nov 2026, Q20). It is a later ticket, not cut here.
- **Changing any check's threshold, any Decided rule, or the ladder.**
- **The circuit and the rebuilt puzzles** (K and after).

## Questions for Josh (most important first)
1. **When does the pipeline replace the old tile city at `city=tiles`?**
   - Recommendation: only on his word, after he has played `?city=plan` through section J (section L).
   - Until then both exist, and the old path gets no new features.
   - ~~Not yet asked for; L waits for his word.~~ **Answered, Josh, 21 Nov 2026, in chat:** "Yes, let's work on L. We need to integrate the new city design with the game itself." L is split into L1 (the switch, now) and L2 (the deletion, after K1); see L1 and L2.
2. **Should the pipeline's 3D view show the mass as plain grey boxes before buildings exist (section E)?** It lets him judge the built and open cells in 3D, not only in the flat picture.
   - Recommendation: yes. It is half a day, and it catches a wrong mass before three more stages are built on it.
   - **Answered, Josh, 19 Nov 2026, in chat.** Asked "Do you want the grey-box 3D view (section E) before real buildings?", he said: "Yes".
3. **Do the five new agents, and this ticket's sections merging into `goal/city-style`, fall under his 19 Nov waiver** ("I don't want to constantly approve all of these improvments")?
   - Recommendation: the sections A1 to J merge under the waiver once each is green.
   - Creating the agents and the switch (L) need his word.
   - **Answered, Josh, 19 Nov 2026, in chat.** Asked "Do you approve ticket 070 and creating the five new agents (planner, streetscape, buildings, facades, landscape)?", he said: "Yes". Asked "Do the sections merge into goal/city-style under your 19 Nov waiver once each is green? (the agents and the final switch still needing your word)", he said: "Yes". So the agents may be created, and A1 to J merge into `goal/city-style` once each is green; L still needs his word, and `main` still does.
4. **Who owns stage 6, the circuit?**
   - Recommendation: decide it when 059 is re-cut. The default is streetscape for the layout (poles stand on its pavement) and the renderer for the drawing.
   - **Answered, Josh, 21 Nov 2026, in chat:** "I think that's stage 6 should be the collaborative work between the puzzle designer and the electrical grid agent". One owner per section, so K splits: K1 the puzzle-designer's design of where the circuit and a puzzle's nodes go on the cells, K2 the grid-simulator's `src/city/circuit/` built from it (see K). The streetscape default is not taken; the renderer still draws (K3, K4).
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
19. **The F1 pre-check's four questions** (`docs/design/070-F1-precheck.md`, section 5). **Answered, Josh, 20 Nov 2026, in chat.** Asked the four, each with its recommendation (1 yes: where a drive and a frontage lot meet at one block corner, the hidden ring-2 corner cell joins both back rows as one L-shaped building of 3 cells; 2 yes: a hidden ring-2 corner takes its floors from the street-corner building and its style and colour from the building it is grouped with; 3 after: `BACK_SAME_SHARE` 0.5 is made Decided after he sees F1's screenshots; 4 no new rule now: the two buildings meeting at a street corner are not also made to differ in style and colour), he answered: "1-4 i approve your recommendations". So:
   - 1 (yes): lever L1, the L at a tight corner. F1's L1, criteria 1, 4 and 5; `CityBuilding.bend` in `cityplan.ts`. Stage 5 only; no merged section or pin moves.
   - 2 (yes): rule 4's corner sentence is read as floors only. No change to the checks; recorded in F1.
   - 3 (after): `BACK_SAME_SHARE` stays Proposed, and no test pins its value. He is asked again with F1's screenshots (criterion 9). **On F1's pictures (20 Nov 2026, in chat):** "Let me see the 3D buildings first". So it is asked with G's screenshots (G criterion 3).
   - 4 (no new rule now): no style or colour check between the two buildings that meet at a street corner; judged on the screenshots.
20. **Four questions asked with G's screenshots** (G criterion 7). **Answered, Josh, 20 Nov 2026, in chat.** Shown G's 3D screenshots and asked (1) "should BACK_SAME_SHARE 0.5 become Decided"; (2) "may a hidden back building taller than the one in front show its windows above the lower roof" (recommended yes); (3) "may style-1 roofs overhang up to 0.79 m, past the 0.6 m trim limit" (recommended yes); (4) "is the 8-11 cm corner roof-base step judged by eye, no rule" (recommended yes); (5) "cut an instancing ticket for the ~7.7k building draw calls now, or later", he answered: "Yes to all, instancing later". So:
   - 1: `BACK_SAME_SHARE` 0.5 is **Decided** (grammar rule 4's "one constant for Josh's eye"). Other sections may treat it as settled and a test may pin it. Its comment in `src/city/buildings/constants.ts` says PROPOSED; that file is the buildings agent's, so the one-comment change is section F3, not an architect's edit.
   - 2 (U1, yes): a hidden back building's windowed front may show above a lower roof in front of it. Per the F2 note's section 5, H2 criterion 2 gains the line: such a front counts as dressed (it is not a party wall), and M7 does not ask a kit piece of it.
   - 3 (U2, yes): roofs overhang by what the piece carries (style 01 up to 0.79 m at the front, 0.715 m on a corner's outer flank). Rule 2's 0.6 m (`OVERLAP_MAX_M`) is read as not holding a roof's cornice; rule 11 already says the cornice "overhangs by what the piece carries". L adds the reading to rule 2's check line (L criterion 2). No code changes: F2's G1 runs on floor pieces only (P5).
   - 4 (U3, yes): the 8 to 11 cm roof-base step at a corner is judged by eye; no rule, no check.
   - 5 (instancing later): no instancing ticket now. Non-goals keeps it; the remedy for the frame rate stays instancing, never a cap.
   - The questions as they were put, for the record:
   - `BACK_SAME_SHARE` 0.5 becomes Decided? (Q19, answer 3; on F1's pictures: "Let me see the 3D buildings first".) Until he says so it stays Proposed.
   - The F2 pre-check's three questions (`docs/design/070-F2-precheck.md`, section 4; each recommended yes):
     - U1: may a hidden back building's windows show above a lower roof?
     - U2: may roofs overhang by what the piece carries (style 01: up to 0.79 m)?
     - U3: is the 8 to 11 cm roof-base step at a corner judged on the screenshots, with no rule now?
   - What each answer leads to is in the note's section 5. A "No" re-cuts F2 or H2 after a pre-check; G does not change.
21. **The H1 pre-check's three questions** (`docs/design/070-H1-precheck.md`, section 4). **Answered, Josh, 20 Nov 2026, in chat.** Asked the three as recommended, word for word:
   1. "No shop corner fits a 3 m storey with its door at the walk. May a ground piece stop up to 1 cm short of the floor above?" (recommended yes; no means pick a larger gap or raise the sill limit)
   2. "Six shop pieces are 5.06 to 5.39 m deep. May their extra depth run back into the building behind them (always built), instead of dropping those six shops?" (recommended yes)
   3. "58 ring-2 buildings (about 3 a city) face parked cars on every column. May they have no door?" (recommended yes; no means a door behind the stalls)

   he answered: **"Yez, all three"**. So:
   - 1 (yes): S1's gap tolerance is `GROUND_GAP_MAX_M` 0.01, Decided. `Shop_Corner_01` becomes placeable; `Shop_05`, `Apartment_Door_02`, `Apartment_Door_Corner_02` and `Shop_Corner_02` are never placed (their sills are over `SILL_MAX_M` at that gap). `SILL_MAX_M` stays 0.15. H1's S1, criteria 1, 3 and 4.
   - 2 (yes): the six deep shop keys (`Shop_01`, `03`, `04`, `05`, `06`, `Shop_Corner_01`) stand front-aligned; width, front and open sides within 0.02; the back may run up to `OVERLAP_MAX_M` 0.6 m into the built partner behind. This changes how the grammar's M1 and M2 are read on the ground storey for those keys only. H1's D5, criteria 1, 3 and 4. Grammar text: L adds the reading to M1 and M2's check lines, as it does for Q20's U2.
   - 3 (yes): a quiet building with no door place has no door; M8 reads "exactly one, or none when the building has no door place", held to ring 2, where all 58 measured stand. H1's D1, criteria 2 and 4. Grammar text: L adds it to M8's check line.
   - H1b and G2 do not change. No merged section, digest pin or approved number moves.
22. **The H1b pre-check's three questions** (`docs/design/070-H1b-precheck.md`, section 4). **Answered, Josh, 21 Nov 2026, in chat.** Asked the three as recommended:
   1. "The tile city's awnings reach up to 4.1 m over the pavement, but the grammar's trim limit is 0.6 m. May shop dressing (awnings, signs, ATMs) reach over the pavement as on the tile city, with the 0.6 m kept for the buildings' own trim?" (recommended yes; no means no awnings or ATMs anywhere, and R5 and R6 fail)
   2. "About 145 corner shops a city stand on a street and a lane. May they keep their wrap-round glass, and the L awning, on the lane side too?" (recommended yes; no means those corners have bare shop windows)
   3. "Some neighbouring awnings overlap by up to 10 cm where the wide awning is used. Allow that, so all five awning kinds stay?" (recommended yes, with the guard LG: no L awning beside an L awning; no means only the three narrower flat awnings, and no L awning)

   he answered: **"Yes all three"**. So:
   - 1 (yes, T1): shop dressing (awnings, signs, ATMs) may reach over the pavement as on the tile city, within `CELL_M` of the front cell edge (an awning `CELL_M` - `AWNING_KERB_M`); the grammar's 0.6 m trim limit stays for the buildings' own trim. This changes how the grammar's rule 2 reads. H1b's T1 and criterion 3. Grammar text: L adds it to rule 2's check line.
   - 2 (yes, X1): a corner shop on a street and a lane (or a drive, court, walk or frontage lot) keeps its wrap-round glass and the L awning on the quiet side too; its flat awning and signs stand only on a street front. M8's corner exception covers the corner's own glass and L awning. R4 counts every mixed corner in. H1b's X1 and criterion 4. Grammar text: L adds it to M8's check line.
   - 3 (yes, W1 with LG): a column is as wide as its first floor piece, so neighbouring awnings may overlap by up to about 10 cm and all five awning kinds stay; no L awning stands beside an L awning (LG), with a failing fixture of two L awnings side by side. A same-height overlap over 0.11 m after LG stops the builder and goes to Josh. H1b's W1, criteria 2, 4 and 7. No grammar text.
   - H2's cut gains the note on R6: fire escapes on shop columns at the ladder's 0.5 share could take R6 below 0.45 on 6 x 6 seed 3 one-way off (the pre-check's estimate). G2 does not change. No merged section, digest pin or approved number moves. H1b's files, must-not list and test commands do not change.
23. **The H2 pre-check's seven questions** (`docs/design/070-H2-precheck.md`, section 4). **Answered, Josh, 21 Nov 2026, in chat.** Asked the seven as recommended:
   1. "Where a building gets a fire escape, the shop under it keeps its window but loses its awning and sign, as on the tile city. Signs drop from about 57 % of shops to about 50 % (the floor is 45 %). OK?" (recommended yes)
   2. "Add fire escapes on quiet sides too (lanes and courtyards), about 86 a city, not counted in the 40 %?" (recommended yes)
   3. "No fire escape where its ladder would come down among parked cars (about 4 a city otherwise)?" (recommended yes)
   4. "Escapes stand out up to 2.1 m over a 5 m lane or courtyard. About once a city, two face each other across a lane, 0.8 m apart. Allow that?" (recommended yes; no drops one of each pair)
   5. "Corner doors get no door canopy (about 150 a city stay bare)?" (recommended yes)
   6. "On a party wall one storey above a lower roof, two of the three roof styles leave room only for a painted board, not windows, and the tall pipe never fits anywhere. OK?" (recommended yes)
   7. "Widest bare stretch allowed on a dressed party wall, in metres?" (recommended 2.1; the grammar's provisional 3 also holds but catches almost nothing)

   he answered: **"Yes, 2.1m"**. So:
   - 1 (yes, EP): an escape's column keeps its shop bay's glass; that bay takes no awning, L awning or sign. H1b's dressing changes on escape buildings only; R5 and R6 move, their floors do not. H2's EP and criteria 3 and 6.
   - 2 (yes, EX): `escapeBlocks` runs a second time over the quiet sites at the same share; R7 counts street buildings only. H2's EX and criteria 2 and 6.
   - 3 (yes, ET): no host column with an open side onto `stalls`. H2's ET and criteria 2 and 6.
   - 4 (yes, RQ): every wall piece within `CELL_M` of its front cell edge, on street and quiet faces alike; **no pair-drop rule**, so two quiet escapes may face each other across one lane cell (about 1 a city), left to J's screenshots. H2's RQ and criteria 5 and 6.
   - 5 (yes, WP3): a `doorCorner` takes no canopy. H2's WP3 and criteria 4 and 6.
   - 6 (yes, PW3): a one-storey step over a style 2 or 3 roof takes only the painted board; `SM_Prop_Pipe_Present_01` is in the kit table but never fits and is never used (J's R12 audit expects it unused). H2b's PW3, PW5, PW6 and criteria 1 and 7.
   - 7 (2.1): `BLANK_RUN_MAX_M` is 2.1 m, **Decided** (067 A's window pitch plus 0.5, rounded down); a test pins it. H2b's PW4 and criteria 1 and 4; criterion 4's stretch fixture is two windows pushed to one end (2.39 m bare), since a board at one end (0.81 m) cannot fail.
   - The escape share stays `TILE_CITY_R7_MIN` 0.4 (H2's ES); the ladder's 0.5 is never used on the pipeline. The R6 run to watch is 6 x 6 seed 3 one-way on (0.474 at 0.4), not seed 3 off (H2's R6 note).
   - L gains rule 8's lines (L criterion 2). No merged section, digest pin or approved number moves beyond what H2's and H2b's criteria already expect. H2's and H2b's files, must-not lists and test commands do not change.
24. **The H3 pre-check's five questions** (`docs/design/070-H3-precheck.md`, section 4). **Answered, Josh, 21 Nov 2026, in chat.** Asked the five as recommended:
   1. "Roof props stand on the flat roof at 0.5 m on every roof style (styles 2 and 3 have a 0.74 m rim round the edge; standing on the rim would leave two thirds of roof props floating)?" (recommended yes)
   2. "The rooftop billboard is 3 cm too wide for the roof, so as written there are no billboards at all (water towers stand in). Let billboards stand 0.28 m from the roof edge instead of 0.3, giving about 40 street billboards a city?" (recommended yes)
   3. "Novelty signs (pizza, burger and so on) only on roofs over a street? As written about 230 a city, more than half over courtyards and blind roofs; street-only gives about 90." (recommended yes)
   4. "Four rules as written: no height limit on roof props (tallest top 21.9 m); roof props come last when a column is full (about 5 small props a city dropped); roof props keep clear of party-wall windows and pipes; the roof exit keeps 1.2 m of clear roof as wide as the hut in front of its door?" (recommended yes)
   5. "With roofs, a city has about 6,300 to 7,700 dressing pieces, over the tile city's 6,000 budget. Leave the budget off and let J check the frame rate?" (recommended yes)

   he answered: **"Yes to all except novelty signs. They can be placed on the face of a build in addition to the roof. They represent the store in the storefront. A pizza should correspond with a pizza shop and a beer bottle, for example, should correspond with a liquor store or a corner store."** So:
   - 1 (yes, RT): `ROOF_DECK_M` 0.5 on `Roof_01`, `_02`, `_03`, `Roof_Corner_01`, `_02`, `_03`, typed in `roofkit.ts` and pinned to the GLB in `roofpin.test.ts`; `PARTY_ROOF_H_M` 0.744 stays for H2b. H3's RT and criteria 1, 4 and 5.
   - 2 (yes, BB): `BILLBOARD_EDGE_M` 0.28 for the billboard's structure and face only; RK and RB still apply. Criterion 2 expects billboards on street mid columns on every named run. H3's BB and criteria 1, 2, 4, 5 and 8. Grammar text: L adds it to rule 11.
   - 3 (neither yes nor no): H3 places no novelty sign (NV; RL and RN struck); the rotation is water tower, exit and billboard on every building. A novelty sign stands for the shop under it and may go on the building's face as well as its roof: section H1c (facades), first cut. Josh added the same day: "Perhaps novelty signs should be placed alongside the shop fronts instead of the decoration phase? I'm not sure which makes more sense." and "A novelty sign doesn't always have to be placed with a shop either. It's an added detail. That's fun. It should be placed per the discretion of the storefront agent." So a sign is optional, with no share, and how often and face or roof is the facades agent's typed-in numbers; the framing (shopfronts, recommended, or decoration) is H1c's first pre-check question.
   - 4 (yes): HC, RC, RK and RW stand as written and quote him.
   - 5 (yes): `DRESS_MAX` is not applied on the pipeline; H3's criterion 8 reports it as passed, and J checks the frame rate.
   - No threshold moves: R8's 0.9 and 0.5, `DRESS_PER_BAY_MAX` 6 and the chances stay. No merged section re-opens. H3's files, must-not list and test commands do not change.
25. **The water-tower cap (H3b).** Josh asked for it (21 Nov 2026, in chat): "Create a rule where there can only be so many water towers per city blocks", then: "Fine. You get one water tower per x amount of buildings. I don't want to see water towers across the entire city because they just fit". So the rule itself is his. H3b's three questions (how X is counted, the number X, and what a roof that loses its tower gets) went to him with the H3b pre-check's note (`docs/design/070-H3b-precheck.md`, section 4). **Answered, Josh, 21 Nov 2026, in chat.** Asked the three as recommended:
   1. "Count one water tower per X buildings on each street block, so a block of fewer than X buildings gets none and towers stay spread (at 16, at most 3 on any block), rather than across the whole city (up to 8 on one block)?" (recommended yes)
   2. "X = 16? That gives about 44 water towers a city instead of 255; most blocks get one. (X 8 gives about 103, X 12 about 63, X 24 about 23, with a third of blocks getting none.)" (recommended 16)
   3. "A roof that loses its water tower gets a roof exit only where its row of buildings would otherwise have no big roof item, and otherwise just small roof props? That adds about 110 exits a city (163 to 276). Giving every such roof an exit adds about 210 (to 374, 2 buildings in 5). Small props only on every such roof is not possible: it breaks the 'half the rows have a big roof item' check at every X from 8 up." (recommended yes)

   he answered: **"Yes to all"**. So:
   - 1 (yes, TX (a) with TS): each street block holds at most floor(n / X) water towers, n its buildings; where it has more candidates, the towers kept are its buildings ranked first by `rand("roof", "tower", <block id>, building id)`. H3b's TX, TS and criterion 3.
   - 2 (16): `WATER_TOWER_PER_BUILDINGS` is 16, **Decided**, typed in `roofkit.ts` and pinned by `roofpin.test.ts`. H3b criterion 1.
   - 3 (yes, TF): a freed roof takes a roof exit only where its B2 run would otherwise have no big roof item (one roof a run, by hash), and small props otherwise; never a billboard or a tower. R8's second number stays H3's run by run. A new rule, Josh's. H3b's TF and criterion 4.
   - The pre-check's corrections to the first cut (163 exits a city today; plain roofs not buildable at any X offered; per run gives 0 towers) are in H3b. RX's `roofcheck.ts` change is dropped (0 cases). No threshold moves: R8's 0.9 and 0.5, `DRESS_PER_BAY_MAX` 6 and the chances stay. No merged section re-opens; `src/core/` does not change.
26. **The H1c pre-check's four questions** (`docs/design/070-H1c-precheck.md`, section 4). **Answered, Josh, 21 Nov 2026, in chat.** Asked the four as recommended:
   1. "Shop kinds and novelty signs belong to the shopfront work: each shop gets its kind where its shopfront is dressed, and its roof sign (if any) reads the same kind. Yes?" (recommended yes)
   2. "Is this the sign for each shop? Pizza slice: pizza. Burger: burger. Hot dog: hot dog. Taco: taco. Noodle box: noodles. Mug: cafe. Donut: donut. Ice cream and milkshake: ice cream. Milkshake and cola: diner. Lollipop and popcorn: sweets. Pint of beer: bar or pub. Green beer bottle: liquor store or corner store. Cola: corner store too. Guitar: music shop. The bowling ball and pin are never used." (recommended yes)
   3. "A shop that already has a Bar, Pub, Cafe, Noodles or Pizza sign takes that kind, so its novelty sign always matches its sign, and the signs placed today don't change. Other shops get a kind at random. Yes?" (recommended yes)
   4. "On the front of a building, a novelty sign sits flat against the wall just above the shop's awning or sign, centred over the shop, and may rise up to the roof line (tall ones cover a window or two above). Yes?" (recommended yes)

   he answered: **"Yes, all four"**. So:
   - 1 (yes): the kind is given once in the shopfront pass (`facades.shops`); the face sign is a shopfront piece (`facades.novelty`); the roof sign is a `"novelty"` roof piece in H3's pass 1, reading the same kind. All in H1c (facades); no H1d. H1c's SK and RS.
   - 2 (yes): the key table as asked, `Bottle_01` the beer bottle and `Beer_01` the pint; barber and hotel have no key; the bowling pair is unused. H1c's SN and criterion 1.
   - 3 (yes): a shop with an H1b trade sign takes its kind (Bar and Pub bar; Cafe; Chinese_Noodles noodles; Pizza and DeliPizza pizza; Barber; Hotel), others by hash; `dress.ts` and `dresscheck.ts` are untouched and `dressing`'s pins stand. H1c's SK and criteria 2 and 5.
   - 4 (yes, F): flat on storey 1's wall, centred over the shop, broad side out, base on the shopfront's tallest piece, top under the roof; street fronts only, never an escape's column, placed last under `DRESS_PER_BAY_MAX`; no bracket. H1c's F and criteria 3 to 5.
   - How often and where (0.10 a shop, one a run, the roof first for 0.30) are the facades agent's PROPOSED numbers (Josh: "per the discretion of the storefront agent"), not questions. No threshold moves: R6, R8's 0.9 and 0.5, `DRESS_PER_BAY_MAX` 6 and the tower cap 16 stay. `ground`, `dressing` and `walls` keep their pins; the facades digest re-pins.
27. **H1c's R8 run-by-run condition** (the facades builder stopped on criterion 3 at 322f205 on `ticket/070h1c-facades-novelty`). R8's second number is identical on all 20 runs; the first moves by one building on 3 (6 x 6 s2 up to 0.95932, s8 off up to 0.96985, s9 off down from 0.97593 to 0.97473: a freed tower roof whose run is no longer bare because of the roof sign, so TF gives it no exit). Asked "Shall I accept this one-building change and let the builder finish the tests?", recommended keeping the 0.9 floor and dropping only the run-by-run no-drop on the first number. **Answered, Josh, 21 Nov 2026, in chat: "Yes".** So criterion 3: the second number identical run by run; the first at or above 0.9, its run-by-run change reported, not asserted. The builder's four readings (H1c's FA, FR, FC, FB) are the architect's rulings on F and RS, not questions.
28. **I's pre-check questions** (`docs/design/070-I-precheck.md`, section 4). **Answered, Josh, 21 Nov 2026, in chat.** Asked the five as recommended (the note's section 4, word for word):
   1. "Nothing stands under a fire escape, because its ladder comes down to the pavement. It costs about 30 pavement items and 5 lane bins a city. Yes?" (recommended yes)
   2. "Nothing stands in front of a residents' front door, a strip 1.5 m out, on the pavement or in a lane. It halves what stands against the walls. Yes?" (recommended yes)
   3. "Lane bins stand in the lane against the wall (never on the pavement), one every 10 m, alternating sides, centred on a building bay so a door strip blocks fewer of them, leaving about 4 m of the 5 m lane clear. Yes?" (recommended yes)
   4. "No extra keep-out for the ground floors' fronts. Only a door step and a 1 cm ledge reach past where wall items stand, and the door rule already covers the step. Yes?" (recommended yes)
   5. "Plazas and parking lots are dressed as on the old city, except that a piece that would stand under an awning or fire escape is left out (most plazas lose a tree). The kerb-cut and corner keep-outs apply to pavement items only. Yes?" (recommended yes)

   he answered: **"Yes 5"**. Asked whether that meant all five or only question 5, he answered: **"All 5"**. So:
   - 1 (yes): EL stands as cut. I's EL.
   - 2 (yes): DK stands as cut, for every wall-line prop and every bin. I's DK.
   - 3 (yes): LB stands, its walk moved half a cell onto a building bay (`s = CELL_M + ALLEY_BIN_EVERY_M / 2 + CELL_M / 2 + n x ALLEY_BIN_EVERY_M`). I's LB and criterion 4 (the hand-worked bin at 12.5 m).
   - 4 (yes): no ground-storey keep-out; the report counts `Shop_04`'s near pairs. I's GS and criterion 10.
   - 5 (yes): a plaza or lot group under a stage 7 box is left out; KO and the R10 keep-outs read pavement props and lane bins only. I's PZ, FL, KO, the checks and criterion 6.
   - Pavement density at this is 0.6 to 0.7 per 10 m (0.64 to 0.74, about one every 15 m): reported, not a check (criterion 10). No threshold moves; every ported number keeps its value.

   The first-cut wording of these questions, as written before the pre-check:
   1. **EL.** "Nothing stands under a fire escape: no bench, bin or planter where its drop ladder comes down to the walk (the tile city allows it). Yes?" (recommended yes)
   2. **DK.** "No bench, bin, planter or other wall-side street furniture in front of a residents' front door, on the pavement or in a lane (the tile city keeps pavements clear of nothing but poles and corners). Yes?" (recommended yes)
   3. **LB.** "The lanes have buildings on both sides, so the tile city's spot for lane bins (on paving beside the lane) does not exist. Bins stand in the lane against a wall instead, every 10 m, alternating sides, clear of doors, about 1.1 m of the lane's 5 m. Yes?" (recommended yes; the grammar's rule 9 already says "bins against the wall clear of doors"; L edits 19.6's line)
   4. Only if the pre-check finds a ground storey reaching more than 0.4 m onto a pavement below 3.2 m: a keep-out in front of it.
   - Not questions (the architect's readings, I): RN, PF, KO, AV, GB, PZ, FL, MT, NL, QF. Stage 8 places no lamp: the game's lamps and the street lights are stage 6's (K). No threshold moves; every ported number keeps its value.
29. **J2: instance the stack pieces, if the frame rate does not hold** (J criterion 8). Open; asked only if the main session's browser check finds the frame rate does not hold with J's dressing on. J draws stages 7 and 8 per key (about 85 calls), so the view's calls are about 10,360 (6 x 6 seed 1) and 10,510 (seed 3), nearly all of them G and G2's building clones. Ask: "The 3D city runs at about N frames a second on a phone with everything drawn. Nearly all the cost is the buildings (about 10,300 draw calls). Shall I cut a section J2 to instance the building pieces now (a day's work, plan3d only, changes how G and G2 draw), or leave it for later as you said in Q20?" (recommended: cut J2 now if the phone stutters; otherwise later.) J does not change for either answer.
30. **The stage=ground legend overlap** (the flat picture, `?city=plan&stage=ground`: "mailbox or newspaper box" is drawn over "meter"). Open. The layout is `planview.ts`'s (renderer); J may not edit it. Ask: "The ground picture's legend has two labels drawn over each other. Fix it now as a small renderer section (the legend columns sized to the longest name), or leave it for the switch (L)?" (recommended: a small section now, since L waits for Q1.) **Answered, Josh, 21 Nov 2026, in chat: "Leave it"** (recorded in 9696f49's merge message). L1 criterion 4 fixes it.
31. **Keep the old tile city at `city=tiles-old` until L2?** (L1 criterion 2.) Open. Ask: "When `city=tiles` becomes the new city, shall the old one stay reachable at `city=tiles-old` so you can compare them, until it is deleted after the circuit's design (K1)?" Recommended: yes; it costs one small function and goes with L2. L1 builds it; on "no", the builder leaves the alias out and only `city=tiles&sheet=1` (the tile sheet) stays.
