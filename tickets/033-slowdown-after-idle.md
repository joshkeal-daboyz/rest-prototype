# 033 · No slowdown after the game sits idle

owner: sound (part A), ui (part B), interaction (part C)
status: done
branch: `ticket/033a-crackle-catchup`, `ticket/033b-ui-frame-writes`, `ticket/033c-click-log`
depends on: part A branches from `main` **after 031 and 032 merge** (032 is being built in `D:\rp-032` and touches `src/audio/` and one line of `src/main.ts`). Parts B and C branch from `main` after 030 merges (030 rewrote parts of `src/ui/index.ts`; the line numbers below are from `try/all`). The three parts are independent of each other.

## Josh's words
"I also think that if the game sits for a while it starts to get slow."

## What the audit found
An audit of `try/all` (20,000-frame headless soak: heap, canvas ops and audio nodes flat) found **no idle leak**. It found one confirmed spike and three suspected per-frame costs. Its scratch scripts (e.g. `gap.mts`) are in `C:\Users\Josh\AppData\Local\Temp\claude\D--rest-prototype\6dcb7042-b84d-47a7-8595-a4b209e55b74\scratchpad\soak\`.

1. **Confirmed (sound).** `Crackle.collect` (`src/audio/layers.ts` ~80–89, called from `applyLayers` in `engine.ts` ~152–157) keeps `this.next` and loops `while (this.next < now + horizon)`. After a time gap it generates every missed tick at once, all clamped to `now`. The gap can come from a backgrounded tab (rAF pauses, the audio clock runs), a long stall, or a suspended context (where `applyLayers` returns early). Sizes: 1 s gives 18 nodes, 60 s gives 1,143, and 600 s gives 11,031 (a 211 ms frame on the fake context). That is a CPU spike and an audio glitch on every map with a live sparking cable.
2. **Suspected (ui).** Some per-frame DOM writes have no last-value guard. Examples are `inventoryEl.setAttribute('aria-label', …)` (~784) and `sound.render()` writing `aria-pressed`, `aria-label` and `classList.toggle` (~375–380). These dirty style every frame, so the layout reads in `placeSplash` (every frame while the win splash is up, a likely idle state), `placePrompt` and `noticesTick` force a layout. Also, `JSON.stringify(capRows)` and `JSON.stringify(rows)` run every frame in `ui.update` (~704, ~734).
3. **Suspected (interaction).** `onPanelClick` in `src/main.ts` (~181) does `JSON.parse(play.exportLog())` on every canvas click. `exportLog` pretty-prints the whole session log, which keeps growing, so each click costs O(log length).
4. **Suspected (sound).** The 5 persistent oscillators (hum, whine, flicker, LFOs) and the compressor keep running while muted or at volume 0. That is a constant cost, not growth.

## Part A · sound (`src/audio/`)
- `Crackle.collect`: if `this.next < now`, restart from `now + this.gap()` and don't replay missed ticks. Cap the ticks returned per call (`CRACKLE_MAX_PER_COLLECT`, a few).
- Check every other scheduler and continuous layer in `src/audio/` for the same catch-up pattern, including 032's `BeatScheduler` (its rule is already "a past beat is skipped") and the mixer's timed state (`relightUntil`, ducks, `burst`). Fix any you find the same way, and list them in the report.
- Finding 4: when muted or at volume 0, stop or suspend the persistent layers **only if** unmute stays instant (the master ramps back with no audible start-up delay and no click). Otherwise leave it and say "not done, and why" in the report. Either way, mute/unmute behaviour must not change.

## Part B · ui (`src/ui/`)
- Guard every per-frame attribute, class and text write with a last-value check, like the existing `setText`. Add pure helpers (for example `setAttr(el, name, value, cache)` and `toggleClass(...)` over a small element interface) so they can be tested without a DOM.
- Replace the per-frame `JSON.stringify(capRows)` / `JSON.stringify(rows)` with a cheaper change key: a pure function of the rows, such as a joined string of the fields that are drawn.
- Nothing visible changes.

## Part C · interaction (`src/play/`, plus one declared line in `src/main.ts`)
- `Play` gains `lastEntry(): LogEntry | undefined` (O(1)). The log gets the same method.
- **`src/main.ts`, one line:** in `onPanelClick`, `const { entries } = JSON.parse(play.exportLog()) …; const last = entries[entries.length - 1];` becomes `const last = play.lastEntry();`. Nothing else in `main.ts` changes. (025 and 032 set the precedent for a declared line.)
- `exportLog()` output is unchanged.

## Acceptance criteria
All are Vitest unless marked Josh.

**A · sound**
- [ ] **No catch-up:** with the crackle on, `collect` at `now = 0`, then at `now = 600` (the same horizon), returns at most 2 ticks, all in `[600, 600 + horizon)`. The same holds after a 1 s and a 60 s gap.
- [ ] **Cap:** no single `collect` returns more than `CRACKLE_MAX_PER_COLLECT` ticks, whatever the horizon or gap.
- [ ] **Steady state unchanged:** across back-to-back 16 ms frames for 5 s, the ticks are the same as before (each tick returned once, none before `now`, none at or past `now + horizon`). The existing `layers.test.ts` crackle tests pass unchanged.
- [ ] **Engine (fake context):** with a sparking view, skip 600 s of `ctx.currentTime` between two `update` calls (also with the context suspended in between). The next frame creates at most a handful of nodes (≤ 2 × the cap's voices), not thousands.
- [ ] **Other schedulers:** each catch-up site found gets the same gap test (a past event is skipped, never piled up). If none is found, a test pins `BeatScheduler` across a 600 s gap: at most 1 beat, and none in the past.
- [ ] **Mute stays instant (only if finding 4 is done):** mute ramps the master to 0 as today, and unmute sounds the hum again within the existing ramp, with the layers' nodes restored. The existing mute/volume tests pass unchanged.
- [ ] **Fence:** `src/audio/` imports only `src/core/`. `package.json` is unchanged.

**B · ui**
- [ ] **Guards:** with a stub element that counts writes, calling the helper 1,000 times with the same value writes once. A changed value writes once more.
- [ ] **Change key:** the key is equal for equal rows and differs when any drawn field changes (each field tested). It does not call `JSON.stringify`, which a spy on `JSON.stringify` proves.
- [ ] **Per-frame:** `ui.update` makes no `JSON.stringify` calls, again proved with a spy. Test it through whatever pure seam exists. If `ui.update` can't run without a DOM, test the pure functions it calls and say so in the report. (No jsdom: it would be a new dependency, and Josh has not approved one.)

**C · interaction**
- [ ] **`lastEntry()`:** it is `undefined` on an empty log. After each logged action it deep-equals the last element of `JSON.parse(exportLog()).entries`, across throws, repairs, refusals, undo and battery entries.
- [ ] **Cost:** with a log of 10,000 entries, `lastEntry()` does not call `JSON.stringify` or `exportLog` (spy).
- [ ] **Unchanged:** `exportLog()` output is byte-identical to before (the existing tests pass). The relay-refused notice still appears once per refused click: the existing tests for it pass, or a new one does if none exists.

**All**
- [ ] `npm run gate` is green on each branch, and the test count grows.
- [ ] **Josh checks** (`npm run dev`, a map with a live sparking cable): play a little, switch to another tab for 5+ minutes, and come back. There is no stutter or burst of crackle, and the game feels as quick as at the start. Leave the win splash up for a few minutes: it stays smooth.
- [ ] **Josh, optional:** if it still feels slow after a while on a map with **no** sparking cable and no backgrounded tab, record a Chrome Performance profile (DevTools → Performance → record for 2–3 minutes while it sits) and bring it back. The audit could not run a real browser, so this is the next lead.

## Files
- **A (sound):** `src/audio/` (`layers.ts`, `engine.ts`, `shell.ts` if finding 4 is done, `mixer.ts` only if a catch-up site is found there, and the tests).
- **B (ui):** `src/ui/` only.
- **C (interaction):** `src/play/` (`log.ts`, `play.ts`, tests), and the one line in `src/main.ts` described above.
- Out of scope: `src/core/`, `src/grid/`, `src/night/`, `src/render/`, `puzzles/`, `package.json`.

## Interfaces
- `Play.lastEntry(): LogEntry | undefined`, and the same method on the session log (part C defines both in `src/play/`). There are no `src/core/` changes.
- There are no new dependencies.

## GDD check
This is performance only. No rule, number, payload, sound design or puzzle changes. No `rules-coverage.md` change.

## Open questions
1. **Finding 4 (muted layers):** default is to do it only if the builder can keep unmute instant, and otherwise report it as not done. Is a constant idle cost while muted worth any risk to the mute feel? Default: no.
