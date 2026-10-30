# 034 · A silent win splash; steady current flow

owner: sound (part A), renderer (part B)
status: approved (G1, Josh, in chat 29 Oct 2026: 'Remove the splash chime. The light chimes are enough.'; supersedes the 034 'one light chime' goal and the A4 tweak)
branch: `ticket/034-single-chime-steady-flow` (A and B built here; first cut as `ticket/034a-single-chime` and `ticket/034b-steady-flow`)
depends on: 032 (built on `try/all`, not yet on `main`). Both parts branch from `try/all`, or from `main` once 032 merges.

Earlier approval, superseded for part A: (G1, Josh, in chat: "approve"; defaults: keep the quiet fifth on the Relight chimes, win note E5). Part B stands under it, already built and reviewed.

## Josh's words (after playing `try/all`, tickets 029–033 stacked)
> "3. I don't like the win chime, it should just follow the same sounds that the light chimes follow. It doesn't need multiple notes. The pulsing arrows are disorienting. Instead just create a 432 hz beat and have the currents flow steadily out of the powersource."

Then, listening to the one-chime splash on the integration branch:
> "the last note does not feel like it belongs after the lamp lights, it feels off"

(the main session moved the note E5 → A4), and then, 29 Oct 2026:
> "Remove the splash chime. The light chimes are enough."

His item 5 ("I think the slowness occurs when I'm testing the software while the agents are working") is the machine being busy with agents' test runs. Nothing is cut for it.

## What that means
- **A · "Remove the splash chime. The light chimes are enough."** (Supersedes "it should just follow the same sounds that the light chimes follow" and the A4 tweak.) The win splash makes **no sound of its own**. The level-done cue goes entirely: `levelDoneSound`, `LEVEL_CHIME_INDEX`, `levelDoneCue`, `LevelDoneGate`, the `"level"` cue group and its special-casing in the mixer and the player (nothing else uses it), the player's `keep` flag (only the level cue set it), `SoundEngine.levelDone()` in `src/core/audio.ts` and its implementation in the engine, and the `audio.levelDone()` call in `src/main.ts` after `showWin(...)`. The 025 `LEVEL_*` constants are already gone. Winning a map now sounds exactly the Relight: its chimes (each with the quiet fifth, 032), its close and its bed, under the beat. Those, and every other sound, are unchanged. Mute, volume, unlock and the gesture rule are unchanged. The ring-out-across-Next requirement for the cue, and its tests, go with the cue. The Relight's behaviour across Next is unchanged: it was never in the `"level"` group or kept across a detach, so it does exactly what it did before this ticket.
- **B · "The pulsing arrows are disorienting. Instead just create a 432 hz beat and have the currents flow steadily out of the powersource."** The 432-grid beat *sound* already exists (032: an A1 thump plus a faint A2 tick at 66 BPM, only while a feed is powered). It stays exactly as built. The chevrons stop surging on the beat. `map-renderer.ts` goes back to `pulsePhase(t)`: steady travel at `PULSE_SPEED`. Direction is already outward. Each live line is drawn from `sx,sy`, the end at `state.flowFrom` (the node the current comes from), and the chevrons point and travel along `+u` toward the far end. So they flow out of every power source along live wires, battery current included. `beatPulsePhase`, `easeOutCubic` and `PULSE_BEAT_STEPS` are removed from `motion.ts`, and `beatpulse.test.ts` goes. The render fence test stays. `BEAT` in `src/core/beat.ts` stays, because audio uses it.

## Part A · sound (`src/audio/`, plus one line in `src/main.ts`)
The `src/core/` half is done by the architect: `levelDone(): void` is removed from `SoundEngine`, and `src/core/audio.test.ts` now asserts it is absent. Until part A lands, `tsc` fails in `src/audio/engine.ts` (the `SoundEngine`-typed object literal has an unknown `levelDone` key) and at `src/main.ts:264`. Part A removes exactly:
- `src/main.ts`: line 264, `audio.levelDone();` (inside `if (!s.winShown && splashDue(...))`, right after `showWin(s, view.elapsed, state.actions);`). Nothing else in `main.ts`.
- `src/audio/recipes.ts`: the "level-done cue (ticket 034)" section: its comment, `LEVEL_CHIME_INDEX` and `levelDoneSound()`.
- `src/audio/cues.ts`: `levelDoneCue()` and the `LevelDoneGate` class (with their doc comments).
- `src/audio/engine.ts`: `LevelDoneGate` and `levelDoneCue` from the `./cues` import; `const gate = new LevelDoneGate();`; `gate.reset();` in `silence()` and in `attach()`; `gate.see(view.complete);` in `update()`; the whole `levelDone() { ... }` method.
- `src/audio/mixer.ts`: the `if (c.group === "level") { protectedCues.push(c); continue; }` branch in `take()`.
- `src/audio/types.ts`: `"level"` from `Cue.group` (leaving `"blow" | "relight"`).
- `src/audio/shell.ts`: the `keep?: boolean` field and its comment on the voice handle; the `if (!h.keep)` guard in `stopAll()` (every active voice is killed); the `keep` parameter of `private voice(...)` and `if (keep) h.keep = true;`; in `play()` the third argument `cue.group === "level"`; in `beat()` the `false` argument (it becomes `this.voice(v, t, this.duck)`). If the builder finds another user of `keep`, it stays and the builder says so.
- Tests: delete `levelDone.test.ts` and `levelDoneEngine.test.ts`, after moving the "032 pins" test (quiet fifth, close, bed, beat) into the pin test below. In `tuningScan.test.ts`, drop the `levelDoneSound` entry from `RECIPES` and `R.CHIME_HZ[R.LEVEL_CHIME_INDEX] ?? 0` from the named pitches. Fix the stale comment in `notSoftened.test.ts` (it names `levelDoneSound`); its snapshot file is not touched.
- Add `noLevelCue.test.ts` with the tests below.

## Part B · renderer (`src/render/`)
- `map-renderer.ts`: change the one call from `beatPulsePhase(t)` to `pulsePhase(t)`, and fix the import. `motion.ts`: delete the beat helpers and the `BEAT` import. Delete `beatpulse.test.ts`. Add the steady-flow tests below to a new `flow.test.ts`.

## Acceptance criteria
All are Vitest unless marked Josh.

**A · sound**
- [ ] **No level-done cue (exports + source scan):** `recipes.ts` exports no `levelDoneSound`, no `LEVEL_CHIME_INDEX` and no key starting `LEVEL_`; `cues.ts` exports no `levelDoneCue` or `LevelDoneGate`; no non-test file under `src/audio/`, and not `src/main.ts`, contains `levelDone`, `LevelDoneGate`, `level:done` or `"level"`. Vitest.
- [ ] **No engine method:** the object `createAudio(...)` returns has no `levelDone` key (runtime), and `SoundEngine` has no `levelDone` (the `src/core/audio.test.ts` type test, already written). Vitest.
- [ ] **A win schedules only the Relight:** on the fake context, unlocked and attached, two identical runs that differ only in the view's `complete` (false vs true, same feeds, so the beat and layers match) plus `relight([0.3, 0.9], 1.5)` start the same sources; the complete run's extra sources are exactly those of `relightCues([0.3, 0.9], 1.5)` (bed + chimes + close, counted from the recipes) and nothing else. Further `complete: true` frames and a detach start nothing new. Vitest.
- [ ] **Relight and beat unchanged, pinned:** `relightChime(i)` for i in 0..11, `relightClose()`, `relightBed(0.5, 1)`, `relightBed(3, 3.5)`, `relightCues([0.3, 0.9], 1.5)` and `beatThump()` deep-equal their output on this branch before the part A edit (an inline literal, or a new snapshot written before the edit and never regenerated). The moved "032 pins" test (each chime keeps its quiet fifth at −30 dB; close A3 + E4 at −28 dB; bed A1 + A2; `BEAT_HZ` A1; `BEAT_DB` −28) passes. Vitest.
- [ ] **Nothing else moved:** `notSoftened.test.ts` passes against its existing snapshot **without `-u`** (the reviewer checks `src/audio/__snapshots__/notSoftened.test.ts.snap` is not in the diff). `CUE_CEILING_DB === -8`, `VOICE_BUDGET === 12`. The existing mixer, cues, engine, beat, mute/volume/unlock and gesture tests pass unchanged, including the Relight's existing detach behaviour (`mixer.test.ts` "reset (detach) forgets a running Relight" and the engine detach tests). Vitest.
- [ ] **Grid scan:** `tuningScan.test.ts` passes with `levelDoneSound` and `LEVEL_CHIME_INDEX` removed from its lists. Vitest.
- [ ] **Fence:** `fence.test.ts` passes. `package.json` is unchanged, and there are no assets. Vitest.

**B · renderer**
- [ ] **Steady:** with a fake canvas, the first chevron on a live line at time `t` sits at `pulsePhase(t)` from the source end, for a spread of `t` that includes `BEAT.at(i)` and mid-beat times. Between two frames `dt` apart (with `dt·PULSE_SPEED < PULSE_SPACING`), it advances by `dt·PULSE_SPEED` (mod spacing). There is no surge.
- [ ] **Outward:** on a live line, with the source at either end (`flowFrom` = the line's `from`, then its `to`), each chevron's tip lies farther from the source end than its base. As `t` grows, the chevrons move away from the source.
- [ ] **No beat in render:** no file in `src/render/` references `BEAT`, `beatClock` or `beatPulsePhase` (a source scan), and `motion.ts` no longer exports `beatPulsePhase`, `easeOutCubic` or `PULSE_BEAT_STEPS`. `pulsePhase`'s existing tests and the render fence test still pass.

**Both**
- [ ] `npm run gate` is green on each branch. The test count will drop by the deleted beat-pulse tests and the deleted `levelDone.test.ts` / `levelDoneEngine.test.ts`, so the reviewer checks that each removed test is one this ticket retires (the level-done cue, its gate, its ring-out across Next, the beat pulse) and that each new criterion has a test.
- [ ] **Josh listens and looks** (`npm run dev`, click once, `01-first-light` then `02`):
  - Finish a level: the Relight chimes, close and bed play as before, each chime with its soft fifth. The win splash then appears in silence, with no note of its own. Pressing Next does to the Relight's tail what it did before.
  - The chevrons on live wires flow steadily out of each power source, with no surge, at the same speed as before 032.
  - The beat still thumps softly while a feed is powered and stops when nothing is. It no longer moves the arrows.
  - Every switch, breaker, fuse, battery and beat sound is as before.

## Files
- **A (sound):** `src/audio/` (`recipes.ts`, `cues.ts`, `engine.ts`, `mixer.ts`, `shell.ts`, `types.ts`; delete `levelDone.test.ts` and `levelDoneEngine.test.ts`; edit `tuningScan.test.ts` and the comment in `notSoftened.test.ts`; new `noLevelCue.test.ts` and the Relight/beat pin test), and **only line 264 of `src/main.ts`** (`audio.levelDone();`), the one cross-folder line, because removing the engine method breaks that call.
- **Architect (done):** `src/core/audio.ts` (`levelDone` removed from `SoundEngine`), `src/core/audio.test.ts` (asserts it is absent).
- **B (renderer):** `src/render/motion.ts`, the one call and import in `map-renderer.ts`, delete `beatpulse.test.ts`, new `flow.test.ts`.
- Out of scope: `src/core/` (beyond the architect's change above), the rest of `src/main.ts`, `src/grid/`, `src/night/`, `src/ui/`, `src/play/`, `puzzles/`.

## Interfaces
One removal, no additions: `SoundEngine.levelDone(): void` is gone from `src/core/audio.ts` (done before part A starts). No dependencies, no assets.

## GDD check
This is presentation only. No rule, number, payload or puzzle changes. `rules-coverage.md` doesn't change.

## Open questions for Josh
None open. Settled: the quiet fifth on each Relight chime stays. The win-pitch question is moot: there is no win chime.

Note: "the Relight rings out across Next as before" means unchanged behaviour. Before and after this ticket, pressing Next detaches the map, which stops every map voice, including any Relight tail still sounding (only the removed level cue survived a detach). If Josh wants the Relight's tail to carry into the next map, that is a new request.
