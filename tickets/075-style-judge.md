# 075 · A scored style judge and an unattended refine loop for the city's eras

owner: per section. **A**: the main session (it owns `.claude/`, `CLAUDE.md` and the loops). **B**: the run, driven by the main session; the judge is the new `style-judge` agent; the refiners are the existing pass agents (`ruin-pass`, `holdout-pass`, `tech-pass`), each in its own folder. A goes first; B starts when A is committed on the branch.
status: approved (G1). Josh, 22 Nov 2026, in chat: "Approve, defaults". Q1 to Q7 take their defaults.
status: done. Merged into main 23 Nov 2026 (effd7e3, PR 2) on Josh's word, in chat: "Merge it". Best round 1, 58/100 (from 39); review round 2 meets, must-fix 0; playtest regressions 0.
branch: ticket/075-style-judge (off `goal/city-transformations`)

Cut 22 Nov 2026 from Josh's card, in chat: "We have more work to do but we can still complete the assignment." Option chosen: **"Build a scored style judge (Recommended)"**: "Cut a small ticket: a style-judge agent scores each street screenshot 0 to 10 per GDD rule, with a reason, and the builder refines until every rule is at or above a bar, unattended. Then add a real run of it to the doc. You approve the ticket first."

## Goal

Josh can start one style run on a city era and walk away. A fixed set of street screenshots is captured; a fresh `style-judge` agent, which sees only the rubric and the pictures, scores each of ten rules drawn from the GDD from 0 to 10 with a reason and the place in the picture it saw it; every routed rule below the bar goes, with the judge's own words as must-fix items, to the pass agent the rubric names; the pass agent changes its own pass, the gate runs, the shots are re-captured and a new judge scores again. At most three rounds, nobody in between. Every round's pictures, scores and commits are kept, so the run is its own evidence. The first run is seed 1, the ruin era. Nothing merges without Josh's word.

## Why it is shaped this way (read against the code)

- **What exists.** The builder → gate → code-reviewer + playtester → builder loop (CLAUDE.md, two rounds) judges code against acceptance criteria. Section 16.8 of the style guide judges the clean city against the reference with R1 to R13, mostly by tests, and its eye items are judged by the main session as pass or fail (053 Q3). Neither scores what an era looks like against the GDD. This ticket adds that, for the eras only; 16.8 is unchanged.
- **The rubric is the GDD's own words.** Section 8 of the GDD ("Art and Audio") is marked Draft; section 1's "What the player knows" is Decided. Scoring a screenshot against a Draft line decides nothing and changes no rule, so this is not a GDD change. Josh's rulings already in ticket 073 are quoted with their source.
- **X-11 is not in the rubric.** Judging "pieces used as the pack shows them" needs the store images (`docs/design/073-pack-intended-use.md`); the judge sees only the rubric and the shots, so it cannot judge it fairly. X-11 stays with the pre-checks and the pass agents.
- **The lit streetlight cannot be fixed by any pass tonight.** The plan city's stage 6 circuit layer is empty until K2 merges (`cityplan.ts`), and X-5 forbids a pass from lighting anything. So S10 is scored and reported but not routed and not held to the bar (Q2).
- **Shots.** The existing review shots (`D:\rest-prototype-073shots\review\`) were made in the Claude browser pane with the page's own canvas: `canvas.toDataURL('image/png')` inside a `requestAnimationFrame`, POSTed to a local PowerShell `HttpListener` on port 5300 that saves the body as a PNG (recipe: `docs/handoff-2026-11-21.md`, "Full-resolution screenshots"). That route gives the textured, full-resolution frame; the pane's own screenshot tool gives untextured grey boxes for WebGL and is never used. The plan view prints one console line beginning `plan 3d:` once the models have swapped in (`plan3d.ts`); a shot is taken only after it. No repo code is needed for capture: the recipe goes in the protocol file and the main session runs it. The plan view opens in day; `light=night` gives the game's night (`lighting.ts`, `lightModeFor("tiles", …)`).
- **PC load.** One heavy step at a time: no capture while a gate or a test run is going, refiners one after another, `--maxWorkers=2`, no builder browsers (only the main session's one pane).

## The rubric (A copies it verbatim into `docs/style-rubric.md`)

Ten rules, each scored 0 to 10, so the overall is out of 100. "Era piece" means a piece the tech, hold-out or ruin pass added; the clean city's own pieces are shown in the reference shots and are never scored down or routed (X-1). **Light** says which shots the rule is judged on. **Routes to** names the agent a low score goes to; when it lists more than one, the item goes to the agent whose pass placed the piece the evidence names.

**S1 · A lit ruin, reclaimed.** GDD §8 Visual direction: "A lit ruin. A human city reclaimed by plants, water, and time, with pools of warm light surviving in the dark." Light: day and night.
- 0: the street looks like the clean reference; no plant on road, pavement, wall or roof.
- 5: growth is there but reads as decoration set on a tidy city: evenly spaced, one size, roads and roofs clear.
- 10: plants over road edges, pavements, walls and roofs, uneven, thicker in some stretches than others, and the street still reads as a street. (Water is not in the kit; not scored.)
- Routes to: ruin-pass.

**S2 · Night first: the dark palette.** GDD §8: "Night first. Most of the game takes place at night. The palette is deep blues and greens in the dark, with warm amber, white, and gold where the power runs." Light: night.
- 0: era pieces are the brightest things in the dark frame, in colours outside the palette (lime greens, oranges, pale greys).
- 5: the frame is mostly deep blue and green, but a few era pieces read bright against it (for example sapling crowns in a light lime green).
- 10: the whole dark frame sits in deep blues and greens; no era piece is brighter or lighter than the walls around it.
- Routes to: ruin-pass, holdout-pass, tech-pass (by the piece).

**S3 · The one saturated colour.** GDD §8 Cables in the dark: prayer ribbon "is the one saturated color in a dark street, so marked faults and holy lines are visible from far away." Light: night and day.
- 0: large saturated era pieces (bright orange tarps over roofs, orange pods along the pavement) are the first thing the eye goes to.
- 5: some saturated era pieces, small or few, but they still compete for the eye.
- 10: no era piece carries a large saturated colour; the street keeps room for one saturated ribbon to stand out.
- Routes to: holdout-pass, ruin-pass, tech-pass (by the piece).

**S4 · Massive, square, indifferent.** GDD §8: "Human structures are massive, square, and indifferent." Light: day; night for the silhouette.
- 0: era pieces hide or break the building masses: roof pieces larger than a bay, soft blobs over the roofline, shacks that read as the buildings.
- 5: the masses read, but some roof additions read large against the roofline.
- 10: the buildings read as big square blocks; every era addition is small against them and leaves the roofline square.
- Routes to: holdout-pass (roof tarps, panels), tech-pass, ruin-pass (roof growth).

**S5 · Lamp Row: a commercial street.** GDD §4 Lamp Row: "a long commercial street of collapsed storefronts and streetlights." Light: day.
- 0: no shopfront reads; the frontage is hidden by era pieces.
- 5: shopfronts read along one side; the other is hidden by barricades, stalls or growth.
- 10: a long run of shopfronts on both sides reads at a glance, with the era's wear over them. ("Collapsed" waits for F2's wrecks and rubble, which wait for K2: say so in the reason; it does not lower the score.)
- Routes to: holdout-pass, ruin-pass, tech-pass (by the piece covering the frontage).

**S6 · The crack in the faith, left alone.** GDD §4 Lamp Row: "shop signs and advertisements of people using light for ordinary things. They are in the prototype, and nothing in the game remarks on them." Light: day.
- 0: no shop sign or advertisement can be seen.
- 5: signs and ads are there but mostly hidden by era pieces, or an era piece draws attention to them (frames, arrows, a text that comments).
- 10: shop signs and ads stay visible, ordinary, and uncommented.
- Routes to: the pass whose piece hides or comments on them.

**S7 · Shown, never explained.** GDD §1 What the player knows (Decided): "As far as the player can tell, Rest is a post-apocalyptic world and nothing more." "No story exposition. The world is shown, never explained." Ticket 073 X-10: "No piece carries readable text that says what happened to the city or its people." Light: day.
- 0: readable text or a set piece tells what happened (a quarantine notice, an evacuation sign, a slogan about the end).
- 5: the street reads post-apocalyptic, but one piece hints at a specific event.
- 10: the street reads as abandoned and post-apocalyptic, and nothing says why.
- Routes to: the pass whose piece carries it.

**S8 · Nothing glows; every cable is the grid's.** GDD §8 Cables in the dark: "Live cables don't glow." "Every cable is a grid cable. Decorative wires are thin, rusted, and end in frayed stubs, so they never read as part of the grid." Ticket 073 X-5 (Q9, Josh): "No piece is emissive or lit in any era." Light: night.
- 0: era pieces glow (screens, neon, lit windows), or a decorative wire reads as a live line.
- 5: one era piece reads as lit.
- 10: nothing glows in the dark frame, and no wire an era added reads as part of the grid. (The rusted, frayed look of dead wires waits for K4, Q14: not scored.)
- Routes to: tech-pass, holdout-pass, ruin-pass (by the piece).

**S9 · Grown and grounded.** Josh, 22 Nov 2026 (ticket 073, F1b3): "trees crowns can absolutely grow into buildings, but the trunks should not grow out of buildings"; "Yes trees don't care about structures outside of where they" / "Start their growth". Style guide 16.8 R8 (Default, 053): "nothing floats, nothing is inside a wall". Light: day.
- 0: trunks standing out of walls, shopfronts or awnings, or era pieces floating in the air or sunk into a wall.
- 5: one trunk or one piece in the wrong place.
- 10: every trunk starts on ground, pavement, road, park or roof surface; crowns grow freely into buildings, wires and poles; nothing floats.
- Routes to: ruin-pass (trees, growth), holdout-pass, tech-pass (by the piece).

**S10 · The image the game is built around.** GDD §8: "The image the game is built around: a single working streetlight in an overgrown street." Light: night.
- 0: no light source anywhere in the street.
- 5: a light is there but does not make a pool of warm light in the dark.
- 10: one working streetlight casts a pool of warm amber light over an overgrown street.
- Routes to: none until K2 (the circuit layer is empty; X-5). Scored and reported, never routed, not held to the bar (Q2).

## The shots

Seed 1, 6 x 6, one-way as the plan view defaults. Base: `/?view=3d&city=plan&stage=assemble&seed=1`. Four street spots, each with `&cam=street`:

| Id | Spot |
| --- | --- |
| a | `&at=8,23&dir=%2Bx` |
| b | `&at=35,24&dir=-z` |
| c | `&at=83,27&dir=-z` |
| d | `&at=24,3&dir=%2Bz` |

- **Judged, every round:** each spot at `&era=ruin&light=night` and `&era=ruin&light=day`: 8 shots, named `<spot>-ruin-<night|day>.png`.
- **Reference, captured once in round 0 and never re-captured:** each spot at `&era=clean&light=day`: 4 shots, named `<spot>-clean-day.png`. The judge is told these are the clean city, never scored (X-1); they let it say which pieces an era added.
- Saved outside the repo (Synty's licence; the repo is public): `D:\rest-prototype-073shots\075\r<N>\`. The judgement files name these paths.

## Section A · The judge, the rubric, the protocol (main session)

### Acceptance criteria
1. [ ] (Josh checks) `docs/style-rubric.md` holds S1 to S10 exactly as above: the quote and its source, the light, the 0, 5 and 10 anchors, and the routing. Its first lines give the bar (Q1) and say S10 is reported, not barred (Q2).
2. [ ] (Josh checks) `.claude/agents/style-judge.md`: `model: opus`, `tools: Read, Write` (no Bash, Grep or Glob). Its input is only the rubric path, the list of shot paths with each one's spot, era and light, and the era; it reads those files and nothing else (no code, no tickets, no earlier judgements, no design notes). It writes one file, `judgements/075-seed1-ruin-r<N>.md`, in exactly this form (the first four lines are read by the main session):
   ```
   judged: 075 seed 1 ruin, round <N>
   overall: <sum of S1 to S10>/100
   bar: <the bar>
   below-bar: <ids of S1 to S9 under the bar, or none>

   | Rule | Score | Reason | Evidence |
   ```
   One row per rule: the score (an integer 0 to 10), a reason of one to three sentences against the rule's anchors, and evidence naming the shot file and where in it (left pavement, top right roofline, ...), and whether the piece is in the clean reference. Then, for each rule below the bar, a "must-fix" line: what in the picture has to change, in the judge's words, without naming code. It never scores pass or fail; it never suggests a file.
3. [ ] (main session runs, output pasted in the hand-back) `.claude/hooks/pipeline_guard.py` gains `JUDGE = "style-judge"`: writing `judgements/*.md` is denied unless the agent is `style-judge`, and `style-judge` writing anywhere but `judgements/` is denied. Shown by piping four hook inputs to the script: judge → `judgements/x.md` allowed; judge → `src/x.ts` denied; `ruin-pass` → `judgements/x.md` denied; main session → `judgements/x.md` allowed (the main session never writes one, but the guard does not block it, as for reviews).
4. [ ] (Josh checks) `docs/style-loop.md`, the protocol (below, in full), and one line in CLAUDE.md under the loops pointing to it ("The loop for a style run").
5. [ ] `npm run gate` is green on the branch with A in it (A changes no code; the test count is unchanged).

### The protocol (`docs/style-loop.md`)
0. **Round 0, set-up.** Branch `ticket/075-style-judge` from `goal/city-transformations`, in a worktree. One launch entry on its own port for that worktree. Start the `HttpListener` on 5300. Capture the 4 reference shots and the 8 judged shots into `r0\` (wait for the `plan 3d:` line each time; one URL at a time). Record the rubric's and this ticket's git hashes in `judgements/075-run.md` (main session), so a later edit to either is visible.
1. **Judge.** Spawn a fresh `style-judge` with the rubric path, the 12 shot paths of the round and the era. Nothing else. It writes `judgements/075-seed1-ruin-r<N>.md`.
2. **Stop?** If `below-bar: none`, the run ends: success. If this was round 3, the run ends as it stands.
3. **Route.** For each rule below the bar, the main session sends the judge's must-fix line, the rule's id, score and reason, and the evidence's shot path to the agent the rubric names (by the piece, when several). Each agent gets its own items in one message, with this ticket's section B as its file list. The main session adds nothing of its own to the items.
4. **Refine.** One agent at a time. Each changes only its folder, runs its own tests with `npx vitest run --maxWorkers=2 <its folder and pin test>`, commits on the branch with the round and the rule ids in the message (`075 r<N> S3: ...`), and reports. An agent that finds the fix needs a folder it does not own, or a check loosened, says so and stops on that item; the item is recorded as "not fixable in the pass" and is not retried.
5. **Gate.** The main session runs `npx tsc --noEmit && npx vitest run --maxWorkers=2` on the branch. Red: the round's agent whose commit broke it gets one try to fix it; still red, its commits for that round are reverted (`git revert`) and the run continues with the rest. Never a skipped or loosened test.
6. **Re-capture and re-judge.** Capture the 8 judged shots into `r<N+1>\` (the reference is not re-taken), then step 1 with a **new** judge. If the new overall is lower than the round before, that round's refinement commits are reverted, the shots of the better round are kept as the current ones, and the next round routes the better round's below-bar list again.
7. **After the run.** The main session writes `judgements/075-run.md`'s table (one row per round: the ten scores, the overall, below-bar, the commits), then the normal pipeline step 3 once on the branch: the code-reviewer and the playtester, given only `075-style-judge` and the branch. Then Josh is shown the run. Nothing merges without his word.

No human between rounds: the main session follows the protocol, it does not judge or edit, and Josh is not asked anything until step 7.

## Section B · The first run: seed 1, the ruin era

The run follows the protocol. Its refiners touch only these files:

| Agent | May touch |
| --- | --- |
| ruin-pass | `src/city/ruin/`, `src/render3d/ruinpin.test.ts` |
| holdout-pass | `src/city/holdout/`, `src/render3d/holdoutpin.test.ts` |
| tech-pass | `src/city/tech/`, `src/render3d/techpin.test.ts` |
| style-judge | `judgements/075-seed1-ruin-r<N>.md` only |
| main session | `judgements/075-run.md`, the shots folder outside the repo, the revert commits |

**What a refiner may change:** which kit keys its pass picks, how many and where, by the district's story values (X-6), within the rules every 073 section holds. **What it may not:** scale a piece (no piece scaled to fit, as for buildings), tint or re-material a piece (Q3), read the camera, the URL or the shot spots, edit the rubric or the shot list, change any clean stage folder, `src/city/history/`, `src/core/`, `src/render3d/` beyond its pin test, a clean digest, a clean check's threshold, or T-1 and T-2. An era's own layer digest may be re-pinned when its pass's output changes (as F1b2 did), with the old and new values in the commit message. "Fail, never patch": a rule that cannot reach the bar inside these limits stays below it, and the run says so.

**Look first (Josh, flagged as worth checking; for the judge to find or not, never given to it):** ruin saplings that read bright lime green against the dark city; hold-out orange pods on pavements; roof tarps that read large.

### Acceptance criteria
1. [ ] (main session; file) Each round has its shots in `D:\rest-prototype-073shots\075\r<N>\` and its judgement in `judgements/075-seed1-ruin-r<N>.md` in the form of A2; every rule has a score 0 to 10, a reason and evidence naming a shot.
2. [ ] (main session; file) `judgements/075-run.md` has one row per round and the reason the run stopped (bar met, or round 3). The run ran without a question to Josh between rounds.
3. [ ] (Vitest, existing) After every round, `npx tsc --noEmit && npx vitest run --maxWorkers=2` is green on the branch: every clean digest, clean check, T-1 and T-2 test and every kit pin passes unchanged except an era layer digest re-pinned under the rule above.
4. [ ] (reviewer checks) `git diff --stat goal/city-transformations...ticket/075-style-judge` shows only section A's files, the table above, and `judgements/`. No test is skipped, deleted, or has a threshold loosened; no code reads `cam`, `at`, `dir` or `light`.
5. [ ] (reviewer checks) Every refinement commit names its round and rule ids, and each traces to a must-fix line in that round's judgement.
6. [ ] (Josh checks, `npm run dev` in the worktree) The four spots at `era=ruin`, night and day, on the branch, against the r0 shots.

## Files

- A: `docs/style-rubric.md`, `docs/style-loop.md`, `.claude/agents/style-judge.md`, `.claude/hooks/pipeline_guard.py` (the judge lines only), one line of `CLAUDE.md`, `tickets/usage.md` (rows).
- B: the table above.
- Nothing in `src/core/`: no type is needed (the judge and the protocol are files and agents, not code). No new dependency.

## Interfaces

None in `src/core/`. The judgement file's first four lines (A2) are the interface the main session reads; `judgements/075-run.md` is its summary.

## Open questions (each with the default taken if Josh says "defaults")

- **Q1. The bar.** Default: **7 of 10** on each of S1 to S9; the overall is reported, not barred.
- **Q2. S10, the lit streetlight.** Default: **scored and reported, never routed, not held to the bar** until K2 puts a circuit in the plan city (no pass may light anything, X-5). It stays in the /100, so the overall cannot pass about 90 tonight.
- **Q3. Tints.** Default: **no.** A refiner fixes colour by picking other keys, fewer pieces or other places, never by darkening or re-colouring a pack material. (The alternative: a renderer section that darkens era pieces' materials at night only, era-scoped, with a test that clean materials are untouched; that is a second owner and a larger ticket.)
- **Q4. The shot set.** Default: **4 spots x night and day at `era=ruin` = 8 judged shots, plus 4 clean day references taken once.** No overhead shot.
- **Q5. Rounds.** Default: **at most 3; a round that lowers the overall is reverted.** One judge per round (no averaging of two judges; a known limit is that a fresh judge's scores vary a point or so).
- **Q6. Where the run is written up.** Default: the main session writes the write-up from `judgements/075-run.md` and the round files into the document Josh names for the assignment; this ticket supplies the evidence only.
- **Q7. X-11 out of the rubric.** Default: **yes**, as above (the judge cannot see the store images).
