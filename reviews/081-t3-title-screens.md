ticket: 081-t3-title-screens
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Ticket 081 section T3: a plain `npm run dev` address opens on "Uronacid" over T1's turning sky, fades to a "Rest: Circuits" title with start and exit (keys and mouse). Start opens a `<select>` of T2's `stageList` with Play, Clear progress and Escape back. Exit shows the goodbye line until any key or click. A numbered stage's win is recorded on the Relight's first frame. Every dev route (`puzzle=`, `city=`, `assets=`, `title=`) skips all of it.

## Does the branch do it?
1. **The splash.** Met in code (browser criterion). `mountScreens` (`src/ui/screens.ts`) starts on `screen = "splash"` with `SPLASH_WORD` centred (`.screen-word`, white). `frame()` moves to `"fade"` only when `nowMs - startedAt >= SPLASH.hold_s * 1000 && backdrop.ready()`. It fades the word and the canvas over `SPLASH.fade_s`, then `goTitle(true)` fades the title and canvas in. `SPLASH = { hold_s: 2.5, fade_s: 1.0 }` is in `logic.ts`. A key (`onKey`) or a click (`onClick`) during splash or fade calls `skip()`. It plays on every load, because nothing stores that it was seen.
2. **The title.** Met in code. `TITLE_NAME` "Rest: Circuits" is top left (`.title-name`). The start and exit buttons are bottom left (`.title-menu`). ArrowUp, ArrowDown and Enter go through T2's `menuStep`. `pointerenter` sets the choice and click chooses. The chosen item gets a "›" mark and `is-chosen` (bold, underlined), so the mark is not colour alone. The HUD is hidden by `uiRoot.hidden = true` in `startScreens` (`src/main.ts`).
3. **Exit.** Met in code. `EXIT_LINE` matches the ticket's wording exactly. There is no `window.close()`. **The pane observation (Escape not returning) does not reproduce in the code:**
   - The last branch of `onKey`, `if (screen === "exit" && live())`, takes any key, Escape included, back to the title.
   - The only other capture listener is the HUD's `onEscape` (`src/ui/index.ts:369`). It stops propagation only when a sound popover is open (`escapeTarget(open, …) === "popover"`), and none can be open on the title.
   - No other document or window keydown listener (`pan.ts`, `daytoggle.ts`, `onLoadKey`, `onSplashKey`) is attached before play, or none acts on Escape.

   The one way a key is dropped is the 300 ms `SETTLE_MS` guard after each screen change, and that applies to every key alike. So the likely causes are an Escape pressed within 0.3 s of reaching the exit screen, or the pane's key injection not delivering Escape to the page. I did not run a browser. Josh's play-through will settle it.
4. **The stage select.** Met in code.
   - `fill()` lists `deps.stages()`, which is `stageList(puzzles, progress)`, and chooses the `next` row (or the last row when all are done).
   - Play, or Enter on the `<select>`, calls `onPlay`. `playStage` then calls `screens.close()` (which runs `backdrop.dispose()`), unhides `#ui` and calls `open(id)`.
   - Any listed row can be played. The recording is criterion 5's, which goes through `recordWin`.
   - Clear progress runs only after `window.confirm`, then calls `clearProgress(storage)`, resets `progress` and refills the list.
   - Escape on the select returns to the title.
5. **The win is recorded.** Met in code (browser, since the builder did not pull a helper into `logic.ts`, which the ticket allows). In `frame()` (`src/main.ts`), the `!s.relightStarted` branch runs on the first frame `relightT` is non-null. For `stageNumber(s.key) !== null` it calls `recordWin(progress, s.key, state.actions, view.elapsed, todayIso())` and `saveProgress`. The win splash and its Next are unchanged.
6. **Dev routes skip it.** Met. `startScreen(search, dev)` is a pure function in `logic.ts` keyed on `puzzle`, `city`, `title` and `assets`. The new test `startScreen (ticket 081 T3)` in `src/ui/logic.test.ts` checks a plain address and `?perf=1`, which go to the splash (so T1's `perf=1` on the title still works), and all four dev routes, which go to play. If stage 01 is missing or fails to load, `startScreens` returns false and the page opens its first puzzle as before. The HUD's Map menu still calls `replaceState` and `open`.
7. **No back from play.** Met: the HUD gains nothing.
8. **Josh's play-through.** Browser, his to do. A reload after a win shows the row with moves and time, because `playStage` leaves the URL plain and `loadProgress` reads at load.

Tests: 1 case added (limit 3). The branch's test file passes (44 cases, 1.3 s). The new case would fail if a dev route opened the splash or a plain address played straight away.

## Rule conflicts and risks
- No change to `src/grid/` or `src/night/`, no new dependency, no Decided rule touched. "The Relight can't be interrupted" holds: the record is written on the Relight's first frame, and nothing on the screens acts during play.
- Files are within the ticket's list. `src/ui/screens.ts` imports only the `TitleView` type from `src/render3d/titleview.ts`, which is the types-only precedent the ticket names. `index.html` gains a `#screens` div as well as styles. The ticket says "the screens' styles and the white text only", but the screens need somewhere to mount, so I read the div as within intent.
- `history.replaceState` moved out of `open()` into the initial-load path. The Map menu's `onPick` and the win's Next already called it themselves, so their URLs still update. Only the select's Play now leaves the URL plain, which is what criterion 8's reload needs.

## Must fix
none

## Could improve
1. `src/ui/screens.ts`, `onKey`/`onClick`: keys and clicks inside the 300 ms `SETTLE_MS` window are dropped silently. If Josh also finds the exit screen "doesn't answer", a shorter guard on the exit screen would help, or a guard that drops only the event that caused the screen change. If it doesn't happen in his play, leave it.
2. `src/ui/screens.ts`: the select's "Back" button was not asked for. It is harmless and gives mouse players a way back, so it is fine to keep. It is noted only as scope.
