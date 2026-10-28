ticket: 003-render-map
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 2; round 1 is in `003-render-map.round1.md`.*

## What the ticket asked for, as I understood it
A Canvas 2D map renderer in `src/render/` (`createMapRenderer(canvas, puzzle)` → `draw / hitTest / resize`). It draws a map-scope puzzle from `Puzzle` + `GridState` only: pulses running away from the feed, sparks, readable-fault marks, element readouts, lamp glow, brownout flicker, target marks, hover, and a timed Relight. The geometry, hit-test and Relight ordering live in pure, tested modules, and the draw loop allocates nothing.

## Does the branch do it?
Round 2. `git diff 22e30b4..e01db7a` is one commit touching only `src/render/map-renderer.ts` (+3/−1):
- a new `feedAlarmLabel`
- built in the same block that rebuilds `feedLabel`, which runs only when load or capacity changes
- drawn in the brownout branch in place of the per-frame template literal

Round 1's only must-fix is applied as asked, and nothing else changed. Typecheck is clean and `npm test` passes 30/30 at e01db7a.

How each criterion stands (unchanged from round 1 except the last):
- **Drawn from Puzzle + GridState only; imports limited (test).** Met. The "render folder imports" test checks every source file in `src/render/`, and `../grid` imports must be `import type`.
- **Fit with padding; resize refits; hitTest, nodes win (test).** Met. `geometry.ts` holds the logic, and the "map fit" and "hit testing" tests cover it.
- **Pulses from `flowFrom`; dead lines flat; direction obvious.** Implemented in `drawLine` as chevrons. Josh to check.
- **Sparks; readable faults marked; unreadable look healthy.** Implemented: sparks plus a gap mark on `sparking` lines, and a ✕ gated on `readableFaults`. An unreadable fault falls back to the healthy dark outline. Josh to check.
- **Breaker / switch / fusebox rating / lamp load / feed `load / capacity`.** Implemented. Josh to check.
- **Lit glow + pool; brownout flicker; feed in alarm colour; not colour-only.** Implemented: the alarm readout adds `! … !` and a shake. Josh to check.
- **Target ring + glyph; hover.** Implemented: a dashed ring plus ★, and a white hover ring. Josh to check.
- **The Relight.** Met as far as code can show. `planRelight` orders the lamps by path distance from the feed, and the tests check `flood` before `shrine` and a duration in [2, 4] s (about 3.25 s). Josh must check the travel speed and the flares.
- **No allocations in the draw loop; geometry precomputed per puzzle.** Now met. Every string the draw loop uses is cached. `planRelight` allocates once when the Relight starts, not per frame.

`src/grid/index.ts` (temporary) is types-only and matches ticket 002's Interfaces.

## Rule conflicts and risks
- `src/grid/index.ts` will conflict with 002's real file at merge. Keep 002's version, then rerun typecheck and tests so the renderer is checked against the real `GridState`.
- The Relight test uses a hand-built won state, not `createGrid`.
- The app shell must call `resize()` after the canvas is laid out; at construction it may be 1×1.
- No new dependencies, no hard-rule breaks, no Decided rule changed.

## Must fix
none

## Could improve
1. `src/render/relight.ts`: the comment "Only lit lamps set the pace" is wrong. `maxD` covers every reachable node.
2. `src/render/render.test.ts`: the import-check regex misses side-effect `import "x"` and dynamic `import()`.
3. `src/render/map-renderer.ts:90–95`: when `target` is missing or empty, every lamp is marked as a target. The schema doesn't say that, so don't invent it.
4. After 002 merges, add a Relight test that reaches the win through the real `createGrid` and then checks the ignition order.

## Main session's response
agree. Merged into `proto/shrine-circuit` with 002's `src/grid/index.ts` kept. Could-improve 3: the simulator treats an absent `target` as every lamp (ticket 002), so the renderer is consistent; SCHEMA.md gets the sentence. Could-improve 1, 2 and 4 are follow-up items for the architect's next pass.
