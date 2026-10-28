# 020 · Win splash: your time, and on to the next level

owner: interaction (A), ui (B)
status: approved (G1, Josh, 28 Oct 2026)
branch: one per part: `ticket/020-win-splash-a`, `ticket/020-win-splash-b`

## Josh's words
"When you win, it should display a splash screen with how long it took you to win the level and the option to move to the next level."

## Goal
When the player lights every target and the Relight has run its course, a small splash appears over the map: the map's name, how long the win took (`m:ss.s`), and how many moves it took. **Next level** opens the next map in the picker's order; **Replay** starts the same map again with the clock at zero. On the last map there is no Next button, just "All levels done." The splash never covers the HUD, the picker or the sound control, and it can be driven from the keyboard alone: the primary button has focus, Enter takes it, Esc closes the splash and leaves the lit map on screen.

## Decided in this cut
- **What "how long" means: play time from map load to the job completing.** The clock starts at 0 when the map opens (`createMapPlay`). It counts the frame ticks' `dt`, so it is the time the map was on screen and running. Reading the map is part of the puzzle, so that time counts (starting at the first action would reward sitting and thinking first; see Open question 1). It stops **on the tick or action that completes the job**, before the Relight's first frame. The Relight and anything after it are not counted.
  - It is the sum of `tick(dt)` while the job is not complete, so a hidden tab (no animation frames) does not count, and main.ts's existing 0.1 s per-frame cap applies. There is no pause screen today; if one is added later, it should stop calling `tick`, and then the clock pauses with it.
  - **Reset** (and so **Replay**) sets the clock back to 0, and it runs again. **Undo** leaves the clock alone: time spent undoing counts. Refused clicks change nothing. **Switching maps** builds a new play, so the clock starts again at 0.
  - A win from a tick (a charging battery lighting the last target) counts that tick's `dt`, then the clock stops.
- **The clock lives in `src/play/`** (interaction, part A). It is a number on `MapPlayView`, it is pure, and it is tested with injected `tick` calls. It needs no DOM and no `performance.now()`.
- **Moves come from the grid, for free.** `grid.state().actions` already counts accepted throws, repairs and battery clicks. Undo rolls it back and Reset sets it to 0, and it is the same number `job:completed` carries. The splash shows it as given, with no new counting rule.
- **When the splash appears:** `WIN_SPLASH_DELAY = 0.4` seconds after the Relight ends, i.e. on the first frame where `relightT >= duration + 0.4`. `duration` is `planRelight(puzzle, state).duration`, which main.ts already computes when the Relight starts (019's `relightCues`). The splash never covers the Relight or cuts across its sound.
- **What it shows**, all text:
  - Heading: the map's `name` (e.g. `01 · First light`; names already carry their number).
  - `Lit in 0:42.3 · 7 moves` (`1 move` when there is one).
  - Buttons: **Next level** (primary, with the next map's name as a line under it or in its `aria-label`), **Replay**.
  - On the last map of its group, no Next button; the line `All levels done.` appears instead, and **Replay** is primary.
  - No best-time record (see Open question 3).
- **"Next level" follows the picker's order, which is the ladder.** That order is `collectMaps`' `entries`: open maps by path (`01-…` to `56-…`), then locked maps by path. Next goes to the following entry **in the same group**: open → open, locked → locked. From `56-meet-in-the-middle` (the last open map) there is no Next. It does not jump into the locked copies, which repeat maps already on the ladder. A locked map's Next is the next locked map. Next takes the same path as picking from the picker (`onPick`: URL `?puzzle=` updated, the session rebuilt), so the picker shows the new map.
- **Esc / close:** the splash hides, and the map stays won and lit with the win banner. Reset and the picker work as before. The splash does not come back until the next win. There is no Close button: Esc, Replay, Next and the picker cover it (see Open question 4).
- **Not modal.** `role="dialog"` with `aria-labelledby` on the heading, no `aria-modal`, no focus trap. The HUD (picker, Undo/Reset/Download log, the sound control) stays visible and clickable while the splash shows.
- **Placement:** centred horizontally. Its top is below the lower edge of the tallest HUD column plus 8 px, measured the way notices are (`noticesTick`). It is centred vertically in the space under that when there is room. Width is `min(360px, 100% - 32px)`. `pointer-events: auto` on the splash only (the `#ui` overlay stays click-through).

## Acceptance criteria
- [ ] **A (interaction), Vitest in `src/play/`:**
  - `MapPlayView` gains `elapsed: number`, the play-time clock in seconds.
  - A fresh play has `elapsed` 0. `tick(0.5)` three times gives 1.5. `tick(0)` and a negative `dt` add nothing.
  - Clicks do not move the clock. Only ticks do.
  - The job completing on a click stops it: tick 2.0, then the winning click, then tick 5 more seconds; `elapsed` stays 2.0 while `relightT` counts up.
  - A win during a tick (a battery charging the last target lit, using an existing battery test fixture) counts that tick's `dt`, then stops.
  - `reset()` sets `elapsed` to 0 and it counts again, including after a win (the Replay path): win, reset, tick 1, so `elapsed` is 1 and `relightT` is null.
  - `undo()` does not change `elapsed`.
  - `gameTime` and the log are unchanged: existing `src/play/` tests pass without edits.
  - `npm run gate` green, and the test count grows.
- [ ] **B (ui), Vitest in `src/ui/` plus Josh in the browser:**
  - Pure helpers in `src/ui/logic.ts`, tested:
    - `formatTime(seconds)`: rounds to tenths, then splits. `0` → `0:00.0`, `42.34` → `0:42.3`, `59.96` → `1:00.0`, `75.24` → `1:15.2`, `3725.4` → `62:05.4` (minutes are not capped). `NaN`, negative or `Infinity` → `0:00.0`.
    - `nextMap(list, currentKey)` over `{ id, name, locked }[]` in picker order. It returns the next entry in the same group (`locked` equal), or `null` at the end of that group, for an unknown key, or for an empty list. Tests: middle → next. Last open map with locked maps after it → `null`. Locked → next locked. Last locked → `null`.
    - `winLine(seconds, moves)`: `Lit in 0:42.3 · 7 moves` and `· 1 move`.
    - `splashDue(relightT, duration)` with `WIN_SPLASH_DELAY = 0.4`: false for `null`, false at `duration + 0.39`, true at `duration + 0.4`.
  - `src/ui/index.ts`: the `UI` interface gains `showWin(win: WinSplash): void` and `hideWin(): void` (see Interfaces).
    - The splash is a `div.splash` with `role="dialog"`, an `h2` heading it labels, the win line, the buttons and the `All levels done.` line on the last map.
    - On show, the primary button (Next, or Replay on the last map) gets focus.
    - While it shows, Esc (a `keydown` listener on `document`, added on show and removed on hide and on the next `mountUI`, like the pointer listeners) hides it.
    - Replay calls `deps.play.reset()` and hides the splash. Next calls `win.onNext()`.
    - `update()` hides the splash if `grid.state().complete` turns false (a Reset from the HUD).
    - Splash styles go in a `<style>` added once, as `NOTICE_CSS` is. `index.html` is untouched.
  - `src/main.ts`:
    - In the frame loop, once the Relight has started (019's `relightStarted` / `relightCues`), keep its `duration` on the session. On the first frame `splashDue(view.relightT, duration)` is true, call `ui.showWin({ name: entry.name, seconds: view.elapsed, moves: state.actions, next, onNext })` once per win, where `next = nextMap(puzzles, id)` and `onNext` is the existing pick path (`history.replaceState` + `open(next.id)`).
    - When `relightT` goes back to null (Reset), clear the shown flag so a second win shows the splash again.
    - Switching maps drops the splash with the rest of the UI (mountUI clears the root).
    - No game rule in main.ts.
  - Existing `src/ui/` tests pass without edits. `npm run gate` green, and the test count grows.
  - **Josh plays** (`npm run dev`):
    - **`01-first-light`:** win it. The Relight runs to the end, and about half a second later the splash shows `01 · First light`, `Lit in m:ss.s · N moves`, with focus on **Next level**. Press Enter: `02 · This way or that` opens, the picker shows it, and the URL has `?puzzle=02-this-way-or-that`.
    - **Replay:** win `02`, click Replay. The map is fresh, and winning again shows a new time counted from the Replay, not from the first load.
    - **Esc:** win any map and press Esc. The splash goes, the map stays lit, and the picker and Reset work. Reset, win again, and the splash returns.
    - **Undo doesn't reset the time:** on `03-not-enough-for-all`, take a few moves and undo one, wait ~10 s, then win. The time includes the wait.
    - **Last map:** `56-meet-in-the-middle`: win it. No Next button, `All levels done.`, focus on Replay.
    - **No overlap:** the splash sits under the HUD and covers no part of the picker, the targets list, the Undo/Reset/Download log buttons or the sound control, at full width and at ~400 px wide (devtools). The sound control still mutes while the splash shows. The Relight sound has finished before the splash appears.
    - **Keyboard only:** Tab moves between the splash buttons and the HUD, and Enter on Replay replays.

## Files
- A (interaction): `src/play/` only (`play.ts`, `index.ts` if an export changes, a new test file).
- B (ui): `src/ui/` and **`src/main.ts`** (the wiring is a cross-folder need; the ui agent did the same for 015 D and 019 B).

Out of scope for every part: `src/core/`, `src/grid/`, `src/render/`, `src/audio/`, `puzzles/`, `index.html`, `package.json`.

## Order
0. **After 019 merges.** 019 (sound, in review on `ticket/019-sound`) edits `src/main.ts`, `src/ui/index.ts`, `src/ui/logic.ts` and `src/play/play.ts` (the `play:click` events). Both 020 branches start from `main` after that merge, so neither has to rebase over the sound wiring. B reuses 019's `relightStarted` / `relightCues` in main.ts rather than computing `planRelight` a second time.
1. **A** first: a small change, a few hours at most.
2. **B** after A merges (it reads `view().elapsed`). B may write and test its pure helpers (`formatTime`, `nextMap`, `winLine`, `splashDue`) while A is in flight, but its branch starts from `main` after A.

## Interfaces
Nothing new in `src/core/`: the clock and the splash are play and ui concerns, and their types live in those folders. Each builder writes these into its own folder:

`src/play/play.ts` (A):
```ts
export interface MapPlayView {
  hover: string | null;
  prompt: string | null;
  relightT: number | null;
  /** Play time in seconds: ticks since the map opened or was last reset, stopped when the job completed. */
  elapsed: number;
}
```

`src/ui/index.ts` (B):
```ts
export interface WinSplash {
  /** The map's display name, e.g. "01 · First light". */
  name: string;
  /** view().elapsed at the win. */
  seconds: number;
  /** grid.state().actions at the win. */
  moves: number;
  /** The next map in picker order (same group), or null on the last one. */
  next: { id: string; name: string } | null;
  onNext(): void;
}

export interface UI {
  update(): void;
  notify(text: string): void;
  showWin(win: WinSplash): void;
  hideWin(): void;
}
```
`src/ui/logic.ts` (B) exports `WIN_SPLASH_DELAY`, `formatTime`, `nextMap`, `winLine`, `splashDue`.

No event payload changes. **No new dependencies.**

## GDD check
Presentation and a play-layer readout only. No rule, number, payload or puzzle file changes. "Win: every target lit, no brownout" still decides the win (the splash only reads `complete` / `relightT`). "The Relight can't be interrupted" is respected: the splash waits until the Relight ends, and Replay/Next exist only after it. No rules-coverage change.

## Josh's answers (G1 given: "approve 020")
1. Clock start: **map load**, as cut.
2. Moves on the splash: **yes**, keep.
3. Best time per map: **no for now.**
4. Close: **Esc is enough**, no Close button.
5. Next stops at map 56 with "All levels done.": **yes.**
6. Splash sound: **yes.** A short "level done" cue when the splash appears. Not part of A or B: a third piece for the `sound` agent (src/audio/), cut once B has landed so the splash has a hook to drive it.

## Open questions (answered above)
1. **Clock start:** from map load (as cut), or from the player's first action, so reading time before the first click is free? Map load is simpler and counts the reading, which is the puzzle. First action is a one-line change in A if Josh prefers it.
2. **Moves on the splash:** the grid's own count (undone moves don't count; refused clicks and undo/reset don't count). Keep it, or show time only as Josh asked?
3. **Best time per map:** not in this cut. It would be a small `localStorage` record (as 019 does for sound) plus a "best 0:38.1" line. Worth a follow-up ticket?
4. **Esc only, or a Close button too?** Cut with Esc only (Replay, Next and the picker cover the mouse cases). Easy to add.
5. **Next past the last open map:** cut to stop at `56` with "All levels done." rather than run on into the locked copies (there are none yet). OK?
6. A small "level done" sound when the splash appears? That would be a sound-agent follow-up after 019 merges, not in this ticket.
