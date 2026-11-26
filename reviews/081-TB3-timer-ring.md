ticket: 081-TB3-timer-ring
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
TB3 (tickets/081-puzzles-on-the-city.md, section TB) draws a timed breaker in the overlay. Its icon gets a ring with a warm closed share, a dark open share, a hand and the whole seconds to the next flip, from a pure `timerRing`. Its next flip's wire cue and load number, marked with a clock, show when it is hovered and, unhovered, in the last 3 s. The icon pulses once at a flip. There is no next cue under V, during the Relight or after the win. All of this stays in `src/render3d/`, with at most 3 tests. The main session's brief adds an interim that I judged for safety: the next cue shows only for the timer that flips first and alone.

## Does the branch do it?
Branch `ticket/081tb3-timer-ring`, one commit (a958608). It touches six files, all in `src/render3d/`: `timerring.ts` (new) with its test, `overlay.ts`, `controlcue.ts` with its test, and `cityview.ts`. I ran `npx vitest run --maxWorkers=2 src/render3d/timerring.test.ts src/render3d/controlcue.test.ts`. Both files passed, 4 cases.

1. **The ring: met.** `timerRing(timer, readout, clock)` in `src/render3d/timerring.ts` is pure: no three, no DOM.
   - It returns `closedEnd` (closed / cycle of a full turn), `hand` (how far into the cycle, worked out from `readout.closed` and `readout.next`), and `label` (the ceiling of `next`, at least 1, or null while `clock` is null).
   - `drawTimerRing` in `cityview.ts` draws the closed arc thick in WARM and the open arc thin in `#2a3345`, so it reads by shape as well as colour. It also draws the hand and the number.
   - Before the first move, TB1's readout gives "what is left of its present share from `offset`" (`src/core/state.ts`). So the hand rests at `offset`. The test's third assertion checks this: offset 6 of a 6+2 cycle puts the hand at 0.75 of a turn, with no label.
   - Test: `timerring.test.ts` case 1. It covers the closed arc, the hand in both shares, the whole-second rounding (0.4 s reads "1") and the null label.
2. **Now and next: met.** "Now" is unchanged: the timed breaker keeps its V1/W4 tint and pulses through `nodeLook`/`specOf`.
   - The cue goes through `cueIds` into `cueLayer.update`. `controlcue.ts` now takes a list of ids and merges their `cueWires`, with `on` winning over `off`. Its own no-rewrite check still holds, and the edited `controlcue.test.ts` case still checks it.
   - The number comes from the new `o.ring` branch in `overlayLabels`. That branch is taken before the plain breaker branch, so a timed entry never reaches `pushPreview` ungated. It is drawn with `clock: true` and red on `e.over`. `over` is brownout or a blow (`src/core/preview.ts`), which is rule 9's red.
   - `drawClockGlyph` puts the small clock before the number.
   - Test: `timerring.test.ts` case 2. Hovered at 8 s shows. Unhovered, 3 s shows and 3.1 s does not. Nothing shows before the first move. A hovered switch plus a timer at 2 s gives both. The label is "+3", red, with the clock.
3. **The flip reads: in code, browser pending.** `createFlipTracker` returns a pulse that falls from 1 to 0 over 0.6 s when a timer's `closed` changes while the clock runs. It never pulses on first sight or with the clock null, so Reset and the opening do not pulse. Undo leaves timers alone (TB1 rule 4), so it does not pulse either. The pulse scales the glyph by up to 18% and draws one expanding warm ring. `overlayIcons` runs every frame the overlay is painted, so a flip is seen on the frame it lands. The wires change through the existing live path. Case 1's last three assertions cover the pulse. The pane check is Josh's.
4. **Off when the numbers are off: met.** The cue layer and the label both take the same `preview` that NC2 uses. `main.ts`'s `drawNumbers` hands null under V, and the Relight gives no preview, as it does for NC2's hovered control. `overlayLabels` also checks `relighting`. The ring is drawn whatever the preview. Case 2 checks a null preview and `relighting = true` for the label, and the cue's null-preview path is NC2's, unchanged.
5. **The cost: pending** (perf=1 on TB6, browser). The ring is 2D canvas strokes on the overlay that is already drawn, and the cue reuses NC2's instanced mesh. I expect no new draw call, but I did not measure it.

**The interim (`timerNextExact`) is safe.**
- The timed entry is "this one breaker flipped on today's state" (`src/grid/preview.ts`, around line 53). `timerNextExact` lets it show only when no other timer's `next` is below this one's plus 1e-6, so a joint flip or an earlier flip hides it.
- Every `next` is worked out from the one shared `clock` by `timerAt` (`src/grid/grid.ts`, around line 75), which snaps to a boundary within 1e-9. Schedules are whole seconds (TB0's validator). So two timers that flip together differ by far less than 1e-6, and two that don't are at least 1 s apart. The gate cannot misfire either way.
- Hovering such a timer hides its number and cue (case 2: `ids("a", …a and b both at 2)` gives `[]`). The hover does not fall back to the raw entry.
- The one thing that can happen before the flip is a battery running flat or filling. That is a settle, and `refreshPreview` recomputes the entry on the new state. So the number always matches the state on screen, as a player breaker's does.

**Test count:** 2 new cases, plus 1 existing case edited for the new signature (two lines). That is within TB3's 3 and the cap of 15. Both new cases have the rule in their names and would fail on a broken criterion. Neither is report-only, uses a city or is slow (16 ms).

## Rule conflicts and risks
- No `src/grid/`, `src/night/`, `src/core/` or `src/play/` change, no new dependency, and no GDD rule touched. Every file is in TB3's list. `glyphs.ts` was not needed.
- "Faults hide faults": nothing changes. The cue and number come from `loadPreview`, which already holds the rule.
- The branch is named `ticket/081tb3-timer-ring`, not the ticket's `ticket/081tb3-timer-drawn`. This is bookkeeping only.
- Criteria 3 and 5 still need the pane and perf=1 on TB6, as the brief says.

## Must fix
none

## Could improve
1. `src/render3d/overlay.ts`, `overlayIcons`: a timed breaker with no `state.timers` entry falls back to a plain icon with no ring. Its label would then take the `pushPreview` path, which has no gate. TB1 gives every timed node a readout, so this cannot happen today. Checking `n.timer` rather than `o.ring` in `overlayLabels` would close it for good.
2. `timerring.test.ts` case 2 builds `state` with `as never`. It works, but if `overlayLabels` starts reading another `GridState` field, the case will fail with a type-free crash rather than a clear message. A small typed partial would read better.
3. When TB1b lands the joint preview, `timerNextExact` and its test lines ("only the ring shows") should go in the same PR, so the gate doesn't linger.
