# 034 · The win splash as one light chime; steady current flow

owner: sound (part A), renderer (part B)
status: approved (G1, Josh, in chat: "approve"; defaults: keep the quiet fifth on the Relight chimes, win note E5)
branch: `ticket/034a-single-chime` (A), `ticket/034b-steady-flow` (B)
depends on: 032 (built on `try/all`, not yet on `main`). Both parts branch from `try/all`, or from `main` once 032 merges.

## Josh's words (after playing `try/all`, tickets 029–033 stacked)
> "3. I don't like the win chime, it should just follow the same sounds that the light chimes follow. It doesn't need multiple notes. The pulsing arrows are disorienting. Instead just create a 432 hz beat and have the currents flow steadily out of the powersource."

His item 5 ("I think the slowness occurs when I'm testing the software while the agents are working") is the machine being busy with agents' test runs. Nothing is cut for it.

## What that means
- **A · "it should just follow the same sounds that the light chimes follow. It doesn't need multiple notes."** `levelDoneSound()` becomes one chime: exactly the main voice of a Relight chime (`relightChime(i)[0]`: sine, attack 0.04, release 0.6, duration 0.7, −22 dB, `at` 0). There is no knock, no figure, no A2 under it, and no added fifth. Its pitch is `CHIME_HZ[LEVEL_CHIME_INDEX]`, default the last chime of the figure (`CHIME_HZ.length - 1`, E5 on the 432 grid), so the splash sounds like one more of the light chimes. Everything else about the cue stays as 025/032 built it: `levelDoneCue()` (`"level:done"`, ducks, group `"level"`, never dropped), `LevelDoneGate`, ring-out across Next, and the `main.ts` call site. The 025 `LEVEL_*` constants go. The Relight chimes keep their 032 form, including the quiet fifth (see question 1).
- **B · "The pulsing arrows are disorienting. Instead just create a 432 hz beat and have the currents flow steadily out of the powersource."** The 432-grid beat *sound* already exists (032: an A1 thump plus a faint A2 tick at 66 BPM, only while a feed is powered). It stays exactly as built. The chevrons stop surging on the beat. `map-renderer.ts` goes back to `pulsePhase(t)`: steady travel at `PULSE_SPEED`. Direction is already outward. Each live line is drawn from `sx,sy`, the end at `state.flowFrom` (the node the current comes from), and the chevrons point and travel along `+u` toward the far end. So they flow out of every power source along live wires, battery current included. `beatPulsePhase`, `easeOutCubic` and `PULSE_BEAT_STEPS` are removed from `motion.ts`, and `beatpulse.test.ts` goes. The render fence test stays. `BEAT` in `src/core/beat.ts` stays, because audio uses it.

## Part A · sound (`src/audio/`)
- `recipes.ts`: `LEVEL_CHIME_INDEX` (default `CHIME_HZ.length - 1`), and `levelDoneSound(): Voice[]` returns `[relightChime(LEVEL_CHIME_INDEX)[0]]`. Delete the `LEVEL_KNOCK_*`, `LEVEL_NOTE*` and `LEVEL_UNDER_*` constants.
- Tests: rewrite `levelDone.test.ts` for the new cue. Update the `LEVEL_*` list in `tuningScan.test.ts`. `levelDoneEngine.test.ts` already counts its nodes from `levelDoneSound()`, so it should pass unchanged. Nothing in `main.ts` changes.

## Part B · renderer (`src/render/`)
- `map-renderer.ts`: change the one call from `beatPulsePhase(t)` to `pulsePhase(t)`, and fix the import. `motion.ts`: delete the beat helpers and the `BEAT` import. Delete `beatpulse.test.ts`. Add the steady-flow tests below to a new `flow.test.ts`.

## Acceptance criteria
All are Vitest unless marked Josh.

**A · sound**
- [ ] **One note:** `levelDoneSound()` has exactly 1 voice, and it deep-equals `relightChime(LEVEL_CHIME_INDEX)[0]`. It is a sine with no filter, no noise and `at` 0, ending by 0.7 s. Its freq is `CHIME_HZ[LEVEL_CHIME_INDEX]` and passes `onGrid`. With the default index it is `noteHz("E5")`.
- [ ] **Same family:** the voice's wave, attack, release, duration and gain equal those of `relightChime(i)[0]` for every `i`. Change the chime recipe and the splash follows it.
- [ ] **Under the ceiling:** the cue's peak is ≤ `dbToGain(-22)` and below `dbToGain(CUE_CEILING_DB)`. `CUE_CEILING_DB === -8` and `VOICE_BUDGET === 12`, both unchanged.
- [ ] **Cue and gate as before:** `levelDoneCue()` is `"level:done"`, `ducks: true`, group `"level"`, and its voices equal `levelDoneSound()`. The 025/032 tests for the gate (once per win, re-armed only by complete going false then true), never-dropped with the budget full, ring-out across detach/Next, mute and unlock all pass. The engine node counts come from `levelDoneSound()`.
- [ ] **Nothing else moved:** `notSoftened.test.ts`'s snapshot passes unchanged. `relightChime`, `relightBed`, `relightClose`, `relightCues` timing and `beatThump` deep-equal their 032 output, pinned before the edit. The grid scan still covers `levelDoneSound`, and no `LEVEL_KNOCK`/`LEVEL_NOTE`/`LEVEL_UNDER` export remains.
- [ ] **Fence:** `fence.test.ts` passes. `package.json` is unchanged, and there are no assets.

**B · renderer**
- [ ] **Steady:** with a fake canvas, the first chevron on a live line at time `t` sits at `pulsePhase(t)` from the source end, for a spread of `t` that includes `BEAT.at(i)` and mid-beat times. Between two frames `dt` apart (with `dt·PULSE_SPEED < PULSE_SPACING`), it advances by `dt·PULSE_SPEED` (mod spacing). There is no surge.
- [ ] **Outward:** on a live line, with the source at either end (`flowFrom` = the line's `from`, then its `to`), each chevron's tip lies farther from the source end than its base. As `t` grows, the chevrons move away from the source.
- [ ] **No beat in render:** no file in `src/render/` references `BEAT`, `beatClock` or `beatPulsePhase` (a source scan), and `motion.ts` no longer exports `beatPulsePhase`, `easeOutCubic` or `PULSE_BEAT_STEPS`. `pulsePhase`'s existing tests and the render fence test still pass.

**Both**
- [ ] `npm run gate` is green on each branch. The test count may drop by the deleted beat-pulse and knock/figure tests, so the reviewer checks that each removed test is one this ticket retires and that each new criterion has a test.
- [ ] **Josh listens and looks** (`npm run dev`, click once, `01-first-light` then `02`):
  - Finish a level: the Relight chimes play as before, each with its soft fifth. Then the win splash is one more chime of the same kind, one note, with no knock and no two-note figure. It rings out when you press Next.
  - The chevrons on live wires flow steadily out of each power source, with no surge, at the same speed as before 032.
  - The beat still thumps softly while a feed is powered and stops when nothing is. It no longer moves the arrows.
  - Every switch, breaker, fuse, battery and beat sound is as before.

## Files
- **A (sound):** `src/audio/recipes.ts`, `levelDone.test.ts`, `levelDoneEngine.test.ts` (only if needed), `tuningScan.test.ts`, and a pin test for the 032 Relight/beat output.
- **B (renderer):** `src/render/motion.ts`, the one call and import in `map-renderer.ts`, delete `beatpulse.test.ts`, new `flow.test.ts`.
- Out of scope: `src/core/` (no change), `src/main.ts`, `src/grid/`, `src/night/`, `src/ui/`, `src/play/`, `puzzles/`.

## Interfaces
None new. No `src/core/` change, no dependencies, no assets.

## GDD check
This is presentation only. No rule, number, payload or puzzle changes. `rules-coverage.md` doesn't change.

## Open questions for Josh (defaults apply if you just approve)
1. **Keep the quiet fifth on each Relight chime (032)?** You didn't mention it. **Default: keep.** The splash uses only the chime's main note either way.
2. **Which pitch is the win chime?** **Default: E5, the top of the chime figure.** The alternative is A4, the home note, which sounds more "finished". It is one number, `LEVEL_CHIME_INDEX`.
