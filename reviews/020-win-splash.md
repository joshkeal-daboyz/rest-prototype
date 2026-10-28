ticket: 020-win-splash
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A: a pure play-time clock (`MapPlayView.elapsed`) in `src/play/` that sums `tick` dt from map load (or Reset) until the job completes. B: once the Relight has run plus 0.4 s, a non-modal splash under the HUD shows the map name, `Lit in m:ss.s · N moves`, and Next level (same picker group) / Replay. It works from the keyboard and Esc closes it.

## Does the branch do it?
**A (`src/play/play.ts`, `src/play/elapsed.test.ts`)**
- `elapsed` is on `MapPlayView`, a closure variable returned by `view()`. Done.
- Fresh play is 0. Three `tick(0.5)` give 1.5. `tick(0)` and `tick(-3)` add nothing ("starts at 0 and sums ticks…"). Done.
- Clicks, a refused click and undo don't move it ("clicks, refused clicks and undo do not move it"). Done.
- A winning click stops it while `relightT` counts: 2.0 stays, `relightT` reaches 5 ("a winning click stops it…"). Done. It is implemented by the existing `!done()` guard in `tick`.
- A win during a tick keeps that tick's dt: `elapsed += dt` comes before `grid.advance(dt)`, and the test gets 1.75. The ticket asked for an existing battery fixture. The builder used a stub grid that emits `job:completed` inside `advance`, with a note that no real map completes on a tick alone. I checked `src/grid/battery.test.ts`, and none of its fixtures completes the job from `advance` alone (its completion test is completed by a breaker throw). The stub tests exactly the ordering the rule depends on, so I count the criterion as met. See Could improve 1.
- `reset()` zeroes it, and win → reset → tick 1 gives `elapsed` 1 and `relightT` null. Done.
- `undo()` leaves it alone. Covered by the click/undo test. Done.
- `gameTime` and the log are untouched, and no existing `src/play/` test was edited (the diff only adds `elapsed.test.ts`). Done.

**B (`src/ui/logic.ts`, `src/ui/index.ts`, `src/main.ts`, `src/ui/win.test.ts`)**
- `formatTime` rounds to tenths and then splits. All five listed values plus NaN, negative and Infinity are tested. Done.
- `nextMap` stays within the same group. middle→next, last open (locked maps follow)→null, locked→locked, last locked→null, unknown key and empty list→null are all tested. Done.
- `winLine` (plural, singular, and zero as plural) and `splashDue` (null, +0.39 false, +0.4 true, constant 0.4) are tested. Done.
- `UI` gains `showWin`/`hideWin` and `WinSplash` matches the Interfaces block. `div.splash` has `role="dialog"`, `aria-labelledby` pointing at the `h2`, no `aria-modal` and no focus trap. On the last map, `All levels done.` shows and Next is hidden. Done.
- Focus goes to Next, or to Replay when there is no Next. Done.
- The Esc listener is added on show (once), removed in `hideWin`, and removed at the top of `mountUI` through the module-level `removeSplashKey`, the same pattern as the pointer listeners. Done.
- Replay calls `deps.play.reset()` and then `hideWin()`. Next calls `win.onNext()`. Done.
- `update()` hides the splash when `state.complete` goes false. Done.
- Styles go in a `<style>` added once (`ensureSplashStyle`). `index.html` is untouched. Done.
- `main.ts`: `relightDuration` is taken from 019's `relightCues` on the Relight's first frame and is not recomputed. `splashDue` is checked after it is set. `winShown` gives one splash per win and is cleared when `relightT` goes null. `onNext` repeats the `onPick` path (`replaceState` + `open`). `puzzles` uses the picker key as `id`, so locked keys (`locked/<id>`) resolve correctly. No game rule is in main.ts. Done.
- Map switching: `open()` → `mountUI` clears the root and the Esc listener. Done.
- Gate: `npm run gate` is green on the branch. Tests went from 575 on main to 593 (+5 in A, +13 in B), and no existing test was edited.
- The browser checks are Josh's to run.

## Rule conflicts and risks
- None found. `src/grid/` and `src/night/` are not touched. All files are inside the ticket's folders (`src/play/`, `src/ui/`, `src/main.ts`). There is no new dependency and no puzzle, core, render or audio change.
- GDD: the win is still decided by `complete`. The splash waits for the Relight to end, and Replay/Next exist only after it, so "the Relight can't be interrupted" holds.
- Portability: the clock is a pure number in `src/play/`, with no DOM or timer, so it can move to the 3D game as is.

## Must fix
none

## Could improve
1. `src/play/elapsed.test.ts`, "a win during a tick": the stub grid tests the ordering but not a real map. If a fixture later exists where `advance` completes the job (for example, a charging battery filling up and ending a brownout), switch to it so the test also guards the grid side.
2. `src/ui/index.ts` `placeSplash`: the ticket asked for "below the HUD columns plus 8 px". The code also puts the splash below the win banner when it is visible. That is sensible, but it goes slightly beyond the ticket. Josh's no-overlap check at ~400 px will settle it.
3. Next's accessible name comes from two spans ("Next level" + the map name). An explicit `aria-label` such as `Next level: 02 · This way or that` would make sure screen readers put a space between them.
