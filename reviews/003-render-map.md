ticket: 003-render-map
assessment: partly
must-fix: 1

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 1.*

## What the ticket asked for, as I understood it
A Canvas 2D map renderer in `src/render/` (`createMapRenderer(canvas, puzzle)` → `draw / hitTest / resize`). It draws a map-scope puzzle from `Puzzle` + `GridState` only: pulses running away from the feed, sparks, readable-fault marks, element readouts, lamp glow, brownout flicker, target marks, hover, and a timed Relight. The geometry, hit-test and Relight ordering live in pure, tested modules, and the draw loop allocates nothing.

## Does the branch do it?
Typecheck is clean and `npm test` passes: 30 tests, 20 of them in `src/render/render.test.ts`.

- **Drawn from Puzzle + GridState only; imports limited (test).** Met. `map-renderer.ts`, `relight.ts` and `geometry.ts` import only `../core`, `type`-only `../grid`, and their own files. The test "render folder imports" checks every non-test `.ts` in the folder and requires `../grid` imports to be `import type`. Its regex only matches `... from "x"`, so a side-effect `import "x"` or a dynamic `import()` would get past it (could-improve 2).
- **Fit with padding; resize refits; hitTest, nodes win (test).** Met. `geometry.ts` has `computeFit`, `buildGeometry` and `hitTestGeometry`. The "map fit" tests check every node stays inside the padding at three aspect ratios, that a narrower canvas shrinks the scale, and that a 0×0 canvas doesn't break. The "hit testing" tests cover a node, a line midpoint, a node over the ends of three lines, and empty space. `resize()` rebuilds the geometry and the switch pointer directions. `hitTest` takes CSS pixels, and the device-pixel ratio is handled with `setTransform`.
- **Pulses from `flowFrom[line]`; dead lines flat; direction obvious.** Implemented (`drawLine`). Chevrons are placed from the end `flowFrom` names, and a dead line is only the base stroke `LINE_DEAD`. Direction is shown by shape, not colour. Josh must check it reads at a glance.
- **Sparks on `sparking`; readable faults marked; unreadable look healthy.** Implemented. Sparks and a gap mark sit at the mid-line break when `state.sparking` has the line, and the live run stops at 0.5 on a damaged cable. A readable dead lamp, blown fuse or dead junction gets the red ✕ (`drawX`, gated on `readableNode`); a blown fuse also has its bar dimmed and a pop burst when it blows mid-play. An unreadable faulted node falls back to `NODE_DEAD`, the same as a healthy unpowered node, so nothing leaks. Josh to check.
- **Breaker open/closed, switch pointer, fuse rating, lamp load, feed `load / capacity`.** Implemented. The breaker has a flat or raised bar plus ON/OFF text. The switch has a bold pointer to `outputs[sel]` and a stub to the other output. The fusebox shows `≤rating`, the lamp its load number inside, and the feed `load / cap` (∞ if null). Ribbons mark breakers and switches. Josh to check.
- **Lit glow + pool; brownout flicker on every lamp; feed in alarm colour; not colour-only.** Implemented. Lit lamps get a filled disc and three stacked pool discs. In brownout, lamps in `state.lit` flicker (`motion.flicker`), and the feed readout turns `ALARM`, gains `! … !` and shakes. Only lamps that would be lit flicker, not unpowered ones; given that `lit` stays populated in brownout, I read that as the intent. Josh to judge.
- **Targets ring + glyph; hover highlighted.** Implemented: a dashed ring plus ★ on target lamps, and a white ring on a hovered node (a thicker line plus a white overlay on a hovered line). Josh to check.
- **The Relight (pure, tested; flood before shrine; 2–4 s).** Met as far as code can show. `relight.ts::planRelight` relaxes path distance from the feed along powered lines in `flowFrom` direction, scales the farthest reachable node to 2.4 s after a 0.25 s lead, adds a 0.6 s flare, and orders the lit lamps. Tests: `lampOrder` is `["flood","shrine"]`, arrival times are monotone along the path, unpowered parts are never reached, line start/end match their end nodes, and the duration is in [2, 4] (≈3.25 s for the shrine circuit). The renderer caches the plan when `relightT` first appears and drops it when `relightT` is undefined. The test feeds a hand-built `wonState()` (`br_street` open, `sw_1`→`l_b`, `l_b` repaired), which is consistent with `puzzles/shrine-circuit.json` but is not the real simulator's output, because 002 isn't merged. Josh must check that the travel speed is visible and the flares read.
- **No allocations in the draw loop; geometry precomputed per puzzle.** Not fully met. Geometry, labels, switch directions and scratch typed arrays are precomputed, and the feed label is rebuilt only when load or capacity changes. But `map-renderer.ts:601` builds the alarm label (`"! " + feedLabel + " !"`) as a new string on every frame during brownout. `planRelight` also allocates once when the Relight starts; that is a once-per-completion cost, which I accept.

`src/grid/index.ts` (temporary): types only, with no runtime code. `GridState`, `Grid` and `RepairResult` match ticket 002's Interfaces field for field. `createGrid` is absent, which is correct for a types-only stand-in.

## Rule conflicts and risks
- `src/grid/index.ts` is outside the ticket's `src/render/` folder, but the ticket allowed it. It will conflict with 002's real `src/grid/index.ts` at merge; take 002's version. After that merge, rerun the tests so the renderer typechecks against the real `GridState`.
- No new dependencies, no edits to `puzzles/` or `src/core/`, and no Decided rule changed. The renderer reads readability, brownout and lit only from `GridState` and derives no rules of its own.
- `createMapRenderer` calls `resize()` once at construction. If the canvas isn't laid out yet, `clientWidth` is 0 and the geometry is built for a 1×1 canvas until the caller calls `resize()`. The app shell must call `resize()` after mount and on window resize.
- The Relight test checks ordering against a hand-written state, not `createGrid`. Once 002 lands, one test that drives the real simulator to the win and checks `flood` before `shrine` would close that gap.

## Must fix
1. `src/render/map-renderer.ts:601`: the brownout readout allocates a new string every frame (the `"! " + feedLabel + " !"` template), which breaks "No allocations in the draw loop". Build the alarm label alongside `feedLabel` when load or capacity changes (e.g. `feedAlarmLabel`) and draw that cached string. Effect: the draw loop allocates nothing in brownout either.

## Could improve
1. `src/render/relight.ts`: the comment "Only lit lamps set the pace" is wrong. `maxD` is taken over every reachable node, not just lit lamps. Fix the comment, or base the pace on the lit lamps if that was the intent.
2. `src/render/render.test.ts`: the import check's regex misses side-effect imports (`import "../x"`) and dynamic `import()`. Widen it so the static check covers every way of importing.
3. `src/render/map-renderer.ts:90–95`: when `puzzle.target` is missing or empty, every lamp is marked as a target. The schema doesn't say that. Mark none, or raise it in a ticket, rather than invent a rule.
4. After 002 merges, add a Relight test that reaches the win through `createGrid` + `repairAt`/`throwSwitch`/`throwBreaker` and then checks `planRelight`'s order.

## Main session's response
agree on the must-fix; sent to the renderer for a fix and a fresh review. Could-improve 3 is not a deviation: ticket 002 and the simulator treat an absent `target` as every lamp, so the renderer matches the grid; SCHEMA.md will say so. Could-improve 4 goes to the architect's next pass, after the merge.
