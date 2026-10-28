ticket: 009-battery-render-play-ui (part A)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
Part A only. Draw the battery as a cell with a `charge / capacity` bar. While released, it needs its own look: the bar drains and the lines on its far side pulse from the battery. It pops when it goes flat. A relay switch gets a second tribe mark and is drawn dim/stuck while unpowered. The pure helpers need tests, and Josh judges the look.

## Does the branch do it?
Checked on 949c1dd in a detached scratchpad worktree, since removed. `npm run typecheck` is clean and `npm test` passes: 142/142 across 7 files, 24 of them in render.test.ts.
- **Typecheck fix:** `wonState()` in `src/render/render.test.ts` gains `batteries: new Map()` to match the new `GridState.batteries` field. It is minimal and correct.
- **Battery cell and charge bar:** the `case "battery"` in `src/render/map-renderer.ts` draws a terminal nub, a 28×38 body and a 30 px bar filling from the bottom at `chargeFraction(charge, cap)`. It also draws quarter ticks, so the level reads without colour, and a `whole/capacity` readout below. It reads from `state.batteries` and falls back to the puzzle node when there is no state. Covered by "charge fraction is charge / capacity, clamped" (handles 0, overfull, negative and zero capacity).
- **Released look:** the cell gets a pulsing amber halo and outline, an amber fill with a bright draining edge, and a ▼ glyph. Lines whose `flowFrom` is a battery node are drawn amber, wider, with a sine-pulsed glow and warm chevrons travelling away from the battery. That meets "far-side lines pulsing from the battery" for the lines that leave the battery itself (see could-improve 1). A charging battery shows ▲ via `bs.charging`.
- **Flat pop:** `wentFlat(prevReleased, released, charge)` is checked once per frame for each battery and stamps `flatStart`. `popProgress` then drives a 0.6 s expanding ring with 10 rays. Stopping early (charge left) and a rollback that restores charge do not pop, which is correct. Covered by "flat is released -> not released at charge 0 only" and "pop progress runs 0..1 then ends".
- **Relay:** `n.relay === true` draws a second ribbon at `x-14`. When there is no current (`!live`), the switch is drawn at 0.5 alpha with a dashed rim plus a diagonal bar, so "stuck" shows as a shape and not only as dimness. Alpha and dash are reset at the end of the case. There is no unit test, but the ticket leaves the look to Josh.
- **Pure module:** `src/render/battery.ts` has no imports, no canvas and no timers. The three tests are named after the rules they check.

## Rule conflicts and risks
- **Scope:** the diff stays inside `src/render/` (battery.ts, map-renderer.ts, render.test.ts).
- **Imports:** only the existing `../core` and type-only `../grid`, plus `./battery`. The existing "render folder imports" test scans the new file too.
- **Allocations in the draw loop: clean.** Per-node arrays (`isBattery`, `battLabelCharge`, `prevReleased`, `flatStart`, `battLabel`) are created once in `createMapRenderer`. The frame path uses `Map.get`, number maths, shared dash constants and string literals for the glyphs. No closures, arrays or objects are created per frame. The one allocation is the readout template string, rebuilt only when the whole-second charge changes: at most once per second per battery, never per frame. I accept that (could-improve 3).
- **No new dependencies.** No change to any rule from the GDD's Decided list.
- **▲/▼ glyph position: not a blocker.** It is centred at `(x+24, y)`, about x+20..x+28 and y±6, so a horizontal line leaving the battery to the right runs through it. Nodes draw after lines, so the glyph stays on top and readable, and the bar and its colour already say draining or charging. It is cosmetic and Josh will see it when he plays. See could-improve 2.

## Must fix
none

## Could improve
1. Only lines whose immediate `flowFrom` is the battery get the amber look. Lines past a downstream junction draw as ordinary feed current. A lamp lit only by the battery never wins, so the player might want to see the whole battery-fed section. That needs `GridState` to say which lines are battery-sourced (or the feed's own flow set), which is a `src/grid` change. If Josh wants it, it belongs in a ticket, not in this branch.
2. Move the ▲/▼ glyph off the line axis, for example inside the cell top beside the nub, or next to the readout at `y+32`. That avoids the right-hand collision.
3. To make the draw path allocation-free outright, build each battery's readout strings once at create time, one for each whole value 0..capacity.
4. The readout uses `n.capacity` while the bar uses `bs.capacity`. They should always agree, but using one source (`cap`) is tidier.

## Main session's response
agree. Merged into `main`. Could-improve 1 (show the whole battery-fed section as battery light) is a real design question for Josh after he plays the battery map; if he wants it, it becomes a grid ticket (`GridState.feedPowered` or a `source` map).
