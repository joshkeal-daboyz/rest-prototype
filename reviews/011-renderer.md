ticket: 011-readable-failures (renderer: B, B1, B2, E)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session. Round 2; round 1 is in `011-renderer.round1.md`.*

## What the ticket asked for, as I understood it
This is round 2 and covers the same scope as round 1. Part B: a readable blown fuse looks snapped and scorched, with its `≤rating` in the alarm colour and a pop about twice as big. A lamp shows its load by bulb count, size and brightness (1×, 2×, 3×, capped). The feed, the fuse and the lamps all use the unit word `load`. Part B1: a dead junction shows one broken stub per part, and every readable fault gives off a signal. Part B2: the map fit leaves room for a top HUD inset. Part E: a fuse blow plays a shock, then the pop, then the broken look, using preallocated slots. Round 2 checks the one must-fix and two could-improves applied in `aab9a92..9a2414f`.

## Does the branch do it?
- **Round-1 must-fix 1 (unit word `load`): done.** In `src/render/map-renderer.ts`, `feedLabel` is now `load ${load} / ${cap}`. The alarm label is built from it, so it reads `! load 3 / 4 !`. `ratingLabel` is `load ≤${rating}`. Both strings are still built at setup, or only when the value changes, so nothing new is allocated per frame. With this, the feed, the fuse and the lamp captions all say `load`, which meets B.
- **Could-improve 1 (lamp hit radius): done.** In `src/render/geometry.ts`, `Geometry.hitR` holds a hit radius per node, computed once in `buildGeometry`. Lamps get `max(18, clusterRadius + 4)`, which is 26 for load 3. `hitTestGeometry` now picks the nearest node whose own radius contains the point, and other nodes keep 18. The new test, "hit radius of a load-3 lamp", checks that the outer bulb of battery-run's `mill` and its cluster edge both hit `mill`.
- **Could-improve 6 (export `Insets`): done.** `src/render/index.ts` now has `export type { Insets }`.
- Nothing from round 1 has been undone. B, B1, B2 and E are as I judged them in round 1: met inside `src/render/`.
- **Checks:** run in a detached scratchpad worktree at 9a2414f, since removed.
  - `npm test`: 165/165 pass.
  - `npm run typecheck`: only the two known cross-branch errors, in `src/grid/grid.ts:157` (the `fuse:blown` payload) and the fake renderer in `src/play/play.test.ts:24`. There are no errors in `src/render/`.

## Rule conflicts and risks
- No hard-rule breaks. Only `src/render/` is touched. The new import in `geometry.ts` is `./load`, inside the same folder.
- One risk carried from round 1: wiring in `main.ts` (calling `setInsets` and forwarding `fuse:blown` to `notify`) is outside this branch. Until it is wired, B2 and the shock sequence won't show in the game; only the pop runs.
- On the look: `load ≤1` drawn in `FONT_BIG` is wider than the 28 px fuse box. Josh should check that it doesn't crowd a neighbouring label at map scale.

## Must fix
none

## Could improve
1. In `geometry.ts`, the new `import { clusterRadius } from "./load";` sits above the file's header doc comment. Move it below the comment (cosmetic).
2. Round-1 could-improves 2–5 remain optional:
   - `br` in `drawLamp` duplicates `bulbRadius`.
   - Junction stubs point at fixed angles rather than along the connected lines.
   - `lineCap` and `lineJoin` are left set to round after use.
   - In the pop-spark loop, `e0` and `e1` could be hoisted out of the loop.

## Main session's response
agree. Merged into `main`; part F (the wiring) goes to the ui agent next. The junction-stub angle is for Josh's eye.
