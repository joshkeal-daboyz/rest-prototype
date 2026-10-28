ticket: 009-battery-render-play-ui (part C)
assessment: meets
must-fix: 0

*Written by the code-reviewer agent (run as a general-purpose subagent on Opus this session); saved verbatim by the main session.*

## What the ticket asked for, as I understood it
Part C (ui): while any battery is released, show a countdown of its seconds left beside the capacity readout, with a test for the text.

## Does the branch do it?
- **Countdown text:** `batteryCountdown` in `src/ui/logic.ts` returns `"Battery: N s"` for the lowest charge among released batteries, rounding up with `Math.ceil`. It returns `null` when no battery is released. Charge is in seconds of discharge and drains at 1/s (`src/core/schema.ts`), so charge is the same as seconds left. Showing the lowest of several released batteries is a sensible reading of "its seconds left".
- **Placement:** in `src/ui/index.ts`, `batteryEl` is placed right after `capacityEl` in the left HUD. It is hidden when the countdown is `null` and updated on each refresh from `deps.grid.state()`. `.readout` sets no `display` rule in `index.html`, so `hidden` really does hide it.
- **Tests:** `src/ui/logic.test.ts` covers three cases: nothing is released (including an empty map), rounding up (3.2 → "4 s"), and lowest-of-several with an unreleased battery ignored. These are real behaviour tests.
- **Test run:** `npm test` passes, 141/141 in 7 files. `npm run typecheck` fails only in `src/render/render.test.ts` (missing `batteries`), which is part A's known issue and out of scope. Nothing in `src/ui/` causes a type error.

## Rule conflicts and risks
- No game rule lives in `src/ui/`. The UI only reads `charge` and `released` from grid state, and drain and flat are left to the grid.
- The diff stays in `src/ui/` (3 files) and adds no dependency.
- No change to `src/grid/` or `src/night/`.
- **Keyboard/text:** no new interactive control. The readout is plain text in words, not colour alone.

## Must fix
none

## Could improve
1. **Match part B's prompt.** Part B's prompt is *Running: 4 s left*. The HUD says *Battery: 4 s* and rounds up. Check that part B also rounds up (ceil), or the prompt and HUD can disagree by 1 s. Saying "left" in both would also help.
2. **Edge case:** a released battery at exactly 0 charge would show "Battery: 0 s" for a frame before going flat. Harmless; it could be hidden at `<= 0` if it shows up in play.

## Main session's response
agree. Part B ceils as well, so the two agree. Merged into `main`.
