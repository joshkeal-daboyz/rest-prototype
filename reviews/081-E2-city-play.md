ticket: 081-E2-city-play
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
E2 plays a city puzzle on the 3D city through the existing `MapRenderer3d`. `loadCityView` builds one plan per city and converts the puzzle on it. `createMapRenderer3d(..., { city })` draws that plan with K3's circuit and the job live: glow and pulses along the runs, a cut that sparks, lamps, brownout and the Relight. E1's icons and lines go on a 2D canvas over it, and `hitTest` asks the overlay first, then the 3D pick, so `src/play/` stays unchanged.

## Does the branch do it?
I reviewed the builder's commit 6908917 (`cityview.ts` is new; `index.ts`, `overlay.ts`, `renderer.ts` and `overlay.test.ts` change). The other 8 files in `git diff origin/main...HEAD` come from the goal branch's merge 3452599, not from the builder; see the risks below.

1. **loadCityView.** Met. `cityview.ts:61` keeps a per-page `plans` map keyed on `blocksX x blocksZ : seed : oneWay`. It throws `Error(planFailureText)` when the pipeline fails and lets `convertCityPuzzle`'s `CityPuzzleError` through. The test "loadCityView runs one pipeline per city..." uses P0's file: one build for two puzzles, the same plan object, and a throw on a bad district. It took 2.2 s, which the ticket allows for this case.
2. **The route.** Met. `renderRoute` (pure) puts "play" ahead of every address route, in dev only. `renderer.ts` takes the play route before the plan, sheet and `NO_CITY_ROUTE` paths, which it leaves alone. `MapRenderer3d` is unchanged and `MapRenderer3dOptions.city` is added. Tested by "a city view given is the play route...".
3. **Live and dead, in 3D.** Partly met. Glow and pulses run per wire from `jobWires` and `wireLit`. Drops are in the run. Lamps light from `state.lit`, or from `lampIgnition` during a Relight, and dip by `look.ts`'s `lampFlicker`. That covers every lamp piece K3 stands, and I checked on P0 that the piece ids are the node ids. Sparks show only while `state.sparking` holds the line. K3's prop stands only while the fault is readable: `readableNow`, then `standCircuit` with `readable`. Scenery never glows, because only the job's runs get glow instances. **But the spans past an unrepaired cut glow** (must-fix 1). I ran `jobWires`, `lineFlow` and `wireLit` on `city-two-ways-round` with the real seed-1 plan:
   - **At the start** (`sw` on `l_s`), `l_x` is powered and reversed (current enters from `j_h`). Its cut span `span:pole:z:6:hi:264.33~pole:z:6:hi:274.50` is lit to 0.5. The other six spans, from the cut back to `j_inf`, are all lit at 1 with pulses, although `j_inf` is dark.
   - **After `throwSwitch("sw")`**, the same happens on `l_e2`. Its cut span `span:pole:z:7:lo:277.50~...289.17` is lit to 0.5 and the seven spans beyond it to `j_inf` are lit at 1.

   The grid makes a damaged line `powered` while current "runs up to a damaged cable and stops there" (`grid.ts:198`), and `lineFlow` turns `powered` into fraction 1 for the whole line. `wireLit` caps only the cut wire itself. The criterion says "a damaged span is cut", and readable means current reaches it. Here the picture shows current crossing the break, on the puzzle's opening state. The test "a cut span lights only up to its break..." checks the cut wire alone, on a one-span fixture line, so it can't catch this.
4. **The overlay.** Met. `cameraProject` builds E1's `Project` from the camera's own matrices. The `draw` method passes it to `overlayIcons` and `overlayLines`, and `paintOverlay` strokes one segment per line, with the break X (and sparks) at E1's `cut` point. Tested by "projects with the camera's own projection...".
5. **hitTest.** Met. `cityHit` returns null off the canvas or under a blocker. Otherwise it tries `overlayHit`, then the new `overlayLineHit` (within `OVERLAY_HIT_PX / 2`, nearest first, both ends in front of the camera), then the picker. The picker holds only invisible proxies for the job's pieces (node ids) and the job's wires (line ids), so scenery gives null. Blockers go to both the hit and the picker. Tested by two cases: "a line is hit within half..." and "hits the overlay first...".
6. **overlay=0.** Met. `overlayRequested` turns the overlay off, and without it `icons` and `lines` stay empty, so `cityHit` falls through to the pick. Tested.
7. **The Relight can't be interrupted.** Met as the criterion words it: `relight3d.ts`'s clock runs unchanged on `converted.puzzle`, and input stays blocked in `src/play/`. The test names the rule, but see could-improve 2.
8. **The overlay canvas.** Met. `createOverlayLayer` places the canvas at the same CSS box, with the ratio clamped to 1..2 and `pointer-events:none`. `resize()` follows the source canvas, and `dispose` removes the canvas. Tested with a stub element.
9. **The camera.** To check in the browser after U2. `fitWhole` is the same as `resetView`. The frame is the job's wires and pieces plus 16 m, and `origin_m`.
10. **Josh plays it.** To check in the browser after U2.

**Tests.** 10 cases added, none rewritten, under the cap of 15. `npx vitest run --maxWorkers=2 src/render3d/overlay.test.ts`: 17 passed in 5.1 s, and only criterion 1's case is slow (2.2 s).

**The builder's open points:**
- **`placeAt`, nearest lamp within 48 px.** Fine for now, but it approximates the criterion's "the lamp under a building". It measures a radius round the lamp's proxy point, not the building's outline, so a big facade can miss and a neighbour can catch. Browser check after U2; could-improve 1.
- **Dead wires are K3's dark pieces with no extra overlay.** Agreed. The rest of the city is meant to be dead, and E1's dashed lines already mark the job's dead lines.
- **A repaired span beyond a cut follows `state.powered`.** After the repair this is right. While the cut stands it is not, because `powered` holds the whole damaged line. That is must-fix 1.
- **A feed on a roof gets no special draw.** Acceptable. The pick takes the roof's piece (`nodePiece.get(place.roof)`) and K3 draws the roof. Nothing in the criteria asks for more.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, and no new dependency. The builder's commit stays in the ticket's files list. Importing `src/city/` from `src/render3d/` is a read, as `plan3d.ts` already does.
- PR #47 against `main` also carries 8 files from the goal-branch merge 3452599: `src/core/assets.ts`, `tickets/082-game-packs.md`, `tickets/071`, `tickets/081`, three reviews and `.claude/launch.json`. `src/core/` is on E2's "must not" list. These came from the architect's ticket 082 cut, not from the builder, so they are not a finding against E2. The main session should know they land with this PR.
- A GDD rule is approximated: current is drawn past a damaged cable on P0's opening state. That is must-fix 1.
- In `drawLive`, the spark test `plan_ === null || flow.fraction > 0` reads `flow`, which is whichever wire the loop above handled last, not the cut's own line. It matters only during a Relight, while a cut is still standing.

## Must fix
1. **Current must stop at an unrepaired cut.** Files: `src/render3d/cityview.ts` (`wireLit`, or `lineFlow` and `drawLive`) and `src/render3d/overlay.test.ts`.
   - **The code.** While a line's cut fault is still in `state.faults`, cap the line's lit fraction at the cut's midpoint, measured in travel order: `(a0 + a1) / 2` of the cut wire, or `1 - (a0 + a1) / 2` when reversed. Every wire beyond the break then gets frac 0 and no pulses, and the cut wire lights from the entering end to its middle.
   - **Expected on P0.** At the start, `l_x`'s six spans from the cut to `j_inf` are dark. After the switch, `l_e2`'s seven spans beyond its cut are dark.
   - **The test.** Rewrite the existing case "a cut span lights only up to its break..." rather than adding one, so the count stays 10. Put the fixture's cut on a two-span line such as `l_feed`, and assert that the span past the break gets frac 0 with current from each end.

## Could improve
1. `placeAt` could test the point against the lamp building's footprint in the plan, projected or raycast, instead of 48 px round its drop point. That would match "the lamp under a building" and the 2D map's place shapes.
2. The Relight case runs on `relightFrame`, a test-only copy of `drawLive`'s lamp logic, so the renderer's own path is not what it exercises.
   - The states it passes are all `won`, so no state actually changes mid-way.
   - `clock.update(fresh, 1.5)` and `clock.update(won, 1.6)` could both be `null` if the fresh plan's duration is under 1.5 s, and the identity check would pass on nothing.
   - Assert the plan is non-null, pass a different state in a later frame, and have `drawLive` and `relightFrame` share one lamp function, or drop `relightFrame`.
3. Use the cut line's own flow for the spark test in `drawLive`, not the shared `flow` scratch left by the wire loop.
4. The cut case's second half (`g.state().sparking`) tests the grid, not the view. Once must-fix 1 is in, it could be dropped from that case.
5. Criterion 3's "a lead glows with it" has nothing to glow, because K3 draws no lead geometry and `jobWires` skips `run.lead`. Say so in the ticket, or let a lead's lamp-post piece take the glow, when a puzzle first uses one.

## Round 2
must-fix: 0

I reviewed commit a028f38 on `ticket/081e2-city-play`. The later merge ce1ba27 brings in only `.claude/launch.json` (one stray entry removed) and two review files, with no code. `npx vitest run --maxWorkers=2 src/render3d/overlay.test.ts`: 17 passed in 5.6 s. The slow case is still criterion 1's, at 2.4 s. Against `origin/main` the pull request still adds 10 cases. The cut case was rewritten in place, as asked.

**Must-fix 1 (current must stop at an unrepaired cut): fixed.**
- **The code.** `lineFlow` (`cityview.ts:257`) now takes the line's wires. For each wire whose `cutFault` is still in `state.faults`, it caps the line's fraction at `(a0 + a1) / 2`, or at `1 - (a0 + a1) / 2` when reversed. `wireLit` lost its own `cut` cap. `a0` and `a1` are cumulative shares from the line's start node (`cityview.ts:194`), so the cap behaves as follows:
  - Every span past the break in travel order has `t0` above the cap, so it gets frac 0 and no pulses.
  - The cut span gets exactly 0.5 from its entering end.
  - Spans before the cut stay at 1.
  - With a Relight plan, the fraction is `min(lineFraction, cap)`.
- **Expected on P0.** By that reasoning, the six spans of `l_x` and the seven of `l_e2` named in round 1 now go dark. I did not re-run the P0 script this round; it follows from the code.
- **The renderer.** `drawLive` passes `wiresOfLine.get(w.line)` (`cityview.ts:786`).
- **The test.** "current stops at a cut that is still there..." puts the cut on each of `l_feed`'s two spans in turn, with current from each end. It asserts that the span before the break is 1, the cut is 0.5 and the span past it is 0, and that a repaired line goes back to 1. It would fail on the round-1 code, where `lineFlow` gave 1 and the span past the break lit fully.

**Could-improve from round 1:**
- **2: partly taken.** The renderer and `relightFrame` now share `lampState` and `lineFlow`. The test asserts that the clock's plan is non-null before the identity check. `relightFrame` is still a separate loop, and it passes `[]` as the line's wires, so it skips the cut cap. That is harmless: a Relight runs on a won state, which has no standing faults.
- **3: taken.** The spark test calls `lineFlow` for the cut's own line (`cityview.ts:818`).
- **4: taken.** The grid-only `sparking` assertions are gone.

**Nothing new broken.**
- `src/grid/`, `src/night/` and `src/core/` are not touched by a028f38.
- There is no new dependency, and nothing outside `src/render3d/`.

**Could improve (round 2):**
1. The `wireLit` doc comment reads "...at its to end, Writes into `out`". A full stop is missing.
2. `relightFrame` could pass each line's wires, as `drawLive` does. The two would then agree even if a Relight ever ran with a fault standing.
