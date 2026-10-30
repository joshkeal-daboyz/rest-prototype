# 032 · The beat, richer chimes, the choir dropped

owner: sound (part A), renderer (part B)
status: done
branch: `ticket/032-calmer-sound`
depends on: 031 (built and reviewed on `try/all`, not yet on `main`). 032 branches from `main` after 031 merges, and uses 031's `src/audio/tuning.ts`.

## Josh's words (answers to the first draft's four questions)
1. "don't soften those"
2. "I like the drone, but maybe you could turn it into a beat and have the electricity pulse to the beat"
3. "the choir isn't good, I think that adding an additional pleasing tone to the relight chimes might be enough."
4. "I do like the chimes from the relight"

## What that means (decided in this cut)
1. **No softening.** The first draft's calm-palette pass is dropped: the waveforms, attack floors, brightness caps, −2 dB, pentatonic key, reverb bus and master low-pass. Every mechanical sound stays exactly as 031 left it.
2. **The drone becomes a beat.** A soft, steady thump on the 432 grid: a sine on A1 (54 Hz), plus a faint A2 (108 Hz) tick so it is heard on small speakers. It plays only while some feed is powered (the hum's rule: `humFraction(feeds) > 0`) and is silent when nothing is. It goes through the duck like the hum, so ducking, mute and volume apply the same way. **The current pulses drawn along live wires move in time with it.** There is one clock: `BEAT` in `src/core/beat.ts` (already written, see Interfaces). `main.ts` passes the frame's time to both `audio.update` and `renderer.draw`, and each reads the beat from `BEAT`, so the two can't drift. The clock is a pure function of time, so the pulses keep the beat when the sound is muted or audio is unavailable.
3. **The choir is dropped.** `levelDoneSound()` goes back to 025's cue (knock, C#4 then A4, A2 under; Josh called it "good enough for now"), with every pitch on the 432 grid: `noteHz("C#4")`, `noteHz("A4")` and `noteHz("A2")`. The knock's 900 Hz is a filter cutoff, so it stays. 031's `Voice` fields (`detuneCents`, `formants`, `vibrato`) and their shell support stay, tested and unused. The `CHOIR_*` constants and the choir tests go.
4. **Each Relight chime becomes a soft dyad.** `relightChime(i)` returns its current voice, unchanged, plus one added sine a perfect fifth above it (`CHIME_PARTNER_SEMITONES = 7`). The added sine has the same envelope and timing, at `CHIME_PARTNER_DB` (default −30, 8 dB under the chime). The chime notes, order, timing, bed and close don't change. Chimes stay in the protected `"relight"` group, so they are never dropped. If the fifth doesn't please, the fix is one number (12 makes it the octave).

## Part A · sound (`src/audio/`, plus one declared line in `src/main.ts`)
- `recipes.ts`:
  - `beatThump(): Voice[]`: a sine at `BEAT_HZ = noteHz("A1")`, short attack (≤ 0.02 s), release 0.2–0.35 s, at `BEAT_DB` (≤ −28). Plus a sine at `BEAT_TICK_HZ = noteHz("A2")` at `BEAT_TICK_DB` (≤ −40). Setting `BEAT_TICK_DB = -Infinity` removes the tick voice. Setting `BEAT_DB = -Infinity` silences the beat.
  - `CHIME_PARTNER_*`, the dyad, and the reverted `levelDoneSound()` with 025's `LEVEL_*` constants rebuilt from `noteHz`.
- `layers.ts`: `Layers` gains `beatOn` (true exactly when `hum > 0`). There is a pure `BeatScheduler.collect(clock, t, horizon, on)`. It returns the beat times in `[t, t + horizon)` that it has not yet returned, so overlapping frames never schedule a beat twice. A beat already in the past is skipped, never played late. When `on` is false it returns nothing and restarts. It has `reset()`.
- `engine.ts`: `update(view, dt, timeSeconds)`. When `timeSeconds` is given and the context is running, it schedules each collected beat at `ctx.currentTime + (beatT − timeSeconds)` through `player.beat(times)`. `silence()` resets the scheduler.
- `shell.ts`: `beat(times)` plays `beatThump()` voices into the **duck** (not straight to the master), like the crackle ticks. The thumps are layer voices outside the mixer, so they don't count against `VOICE_BUDGET`.
- **`src/main.ts`, one line:** `audio.update(state, dt);` becomes `audio.update(state, dt, now / 1000);`. That is the same `now / 1000` already passed to `s.renderer.draw`. Nothing else in `main.ts` changes. (025 set the precedent for the declared line. A second owner isn't worth it for one argument.)

## Part B · renderer (`src/render/`)
- **The one driven parameter:** the chevrons' travel offset, which `pulsePhase(t)` computes at `map-renderer.ts` line 874. It becomes `beatPulsePhase(t)`, a new pure helper in `motion.ts`:
  `beatPulsePhase(t) = (ease(BEAT.phase(t)) · PULSE_BEAT_STEPS · PULSE_SPACING) mod PULSE_SPACING`
  `ease` is an ease-out with `ease(0) = 0` and `ease(1) = 1`, monotonic. `PULSE_BEAT_STEPS` defaults to 1. On each beat, every chevron surges forward one spacing and settles, ready for the next beat. Because `ease(1) = 1`, the motion is seamless across beats.
- Everything else stays as it is: `pulseCount`, spacing, chevron shape, colours, the live-line glow, the battery shimmer, sparks, flicker, the Relight head and `draw`'s signature. `pulsePhase` stays exported, with its tests unchanged.
- The renderer imports `BEAT` from `../core`, never anything from `../audio`.

Parts A and B are independent and can be built in either order or in parallel, on separate branches `ticket/032a-beat-sound` and `ticket/032b-beat-pulses`.

## Acceptance criteria
All are Vitest unless marked Josh.

**Core (already written by lead-architect, `src/core/beat.test.ts`)**
- [x] `beatClock(bpm)`: `period = 60 / bpm`, and a bad bpm falls back to `BEAT_BPM` (60–72). `phase` is in [0, 1), 0 on every beat, and `at(index(t)) + phase(t)·period = t`. `between` lists each beat in [from, to) once. Back-to-back windows neither repeat nor skip a beat. It is stateless.

**A · sound**
- [ ] **Beat recipe:** `beatThump()` has a sine at `noteHz("A1")`, with gain ≤ `dbToGain(-28)` and attack ≤ 0.02. Its tick is a sine at `noteHz("A2")` at ≤ −40 dB, and it is absent when `BEAT_TICK_DB = -Infinity`. `BEAT_HZ` and `BEAT_TICK_HZ` are in the 031 named-pitch scan, and `beatThump` is in the grid scan's list (031's "nothing is missed" test fails otherwise).
- [ ] **Only when powered:** `layersFor` gives `beatOn` true exactly when `hum > 0`. It is false with no feeds, and false with feeds that carry no load.
- [ ] **Scheduler:** with a stub clock, `collect` across overlapping frames returns each beat once. It returns no beat before `t`. With `on` false it returns nothing, and after it turns back on it resumes from the next beat. `reset()` restarts it. It never reads a clock itself.
- [ ] **Engine (fake context):** `update(view, dt, t)` with a powered view schedules thump sources at `ctx.currentTime + (beatT − t)` (within 1 ms), each beat once over many frames. An unpowered view, a missing `timeSeconds`, or a locked context schedules none. Detach stops pending thumps and resets the scheduler. Mute ramps the master to 0, and the thump path runs through the duck to the master.
- [ ] **Budget and ceiling unchanged:** `VOICE_BUDGET === 12` and `CUE_CEILING_DB === -8`. Beat thumps never enter `Mixer.take`. With the budget full, a beat still sounds and no cue is dropped because of it.
- [ ] **Chimes:** for every `i`, `relightChime(i)[0]` deep-equals 031's chime voice: same freq (`CHIME_HZ[i]`), wave, envelope, gain and `at`. The test pins that voice. `relightChime(i)[1]` is a sine at `CHIME_HZ[i] · 2^(7/12)`, on the grid, with the same attack, release, duration and `at`, and with gain ≤ that of `[0]`. There are exactly 2 voices. Each chime cue's linear peak sum is below `dbToGain(CUE_CEILING_DB)`. `CHIME_HZ`, `relightBed`, `relightClose` and `relightCues` timing are unchanged. With the budget full, every chime plays both voices.
- [ ] **Level-done reverts:** 025's `levelDone.test.ts` cases are restored: a noise knock at 0, ≥ 2 tonal voices later, the end by 1.0 s, no voice above −14 dB, the sum under the ceiling, unlike the Relight, a triangle present, and deterministic. Two changes from 025: the A-major check uses `noteHz("A4")`, `noteHz("C#5")` and `noteHz("E5")` instead of 440-based Hz, and every osc passes `onGrid`. The 025 engine node counts come from `levelDoneSound()`. The gate, never-dropped, ring-out-on-detach, mute and unlock tests all pass. No `CHOIR_` export remains.
- [ ] **Not softened:** every recipe except `relightChime`, `levelDoneSound` and the new `beatThump` deep-equals its 031 output. Pin it as a snapshot taken from 031 before any edit.
- [ ] **Fence:** `src/audio/` imports only `src/core/`, never render. `package.json` is unchanged, and there are no asset files (`fence.test.ts`).

**B · renderer**
- [ ] **Pulses follow the clock:** `beatPulsePhase(t)` is 0 (mod spacing) at every `BEAT.at(i)`. It is in [0, `PULSE_SPACING`). It rises monotonically through each beat for `PULSE_BEAT_STEPS = 1`, and it is continuous across a beat boundary (the limit from below ≡ 0). It is the same for the same `t`, so it equals what the clock says at the time passed to `draw`.
- [ ] **Front-loaded:** the chevrons travel more than half a spacing in the first third of a beat (ease-out).
- [ ] **The draw uses it:** with a fake canvas, the chevron positions on a live line at `t` and at `t + BEAT.period` are identical. `pulsePhase`'s existing tests still pass.
- [ ] **Fence:** no file in `src/render/` imports `../audio`, as a new test like `src/audio/fence.test.ts`.

**Both**
- [ ] `npm run gate` is green on each branch, and the test count grows.
- [ ] **Josh listens and looks** (`npm run dev`, click once, `01-first-light` then `02`):
  - With nothing powered, there is no beat. Close the first breaker: a soft, low, steady thump starts (headphones help with the A1; the faint A2 tick carries it on laptop speakers). Open everything and it stops.
  - The chevrons on live wires surge forward on each thump and settle between. They stay in step after a minute of play, and after switching tabs and coming back.
  - Mute: the thumps stop, and the pulses keep the same rhythm. With audio unavailable or before the first click, the pulses still beat.
  - Every switch, breaker, fuse pop and battery sound is exactly as before.
  - The Relight chimes are the same figure, each now a soft two-note chime. The win splash plays 025's knock and two notes again.
  - If anything is off, the numbers change in `recipes.ts` (`BEAT_*`, `CHIME_PARTNER_*`) or `motion.ts` (`PULSE_BEAT_STEPS`, the ease) only. The tempo is `BEAT_BPM` in `src/core/beat.ts` (lead-architect).

## Files
- **A (sound):** `src/audio/`: `recipes.ts`, `layers.ts`, `engine.ts`, `shell.ts`, `fakeContext.ts` if needed, and the tests (`levelDone.test.ts`, `levelDoneEngine.test.ts`, `tuningScan.test.ts`, `cues.test.ts`, `layers.test.ts`, `engine.test.ts`, plus a new `beat.test.ts`). And the one line in `src/main.ts` described above.
- **B (renderer):** `src/render/motion.ts`, the one call in `map-renderer.ts`, a new `beatpulse.test.ts`, and a new `fence.test.ts`.
- Out of scope: `src/core/` (done), `src/grid/`, `src/night/`, `src/ui/`, `src/play/`, `puzzles/`.

## Interfaces (written into `src/core/` by lead-architect, uncommitted on `main`)
- New `src/core/beat.ts`, exported from `src/core/index.ts` and tested in `beat.test.ts`:
  ```ts
  export const BEAT_BPM = 66;
  export interface BeatClock { readonly bpm: number; readonly period: number;
    index(t: number): number; phase(t: number): number; at(i: number): number; between(from: number, to: number): number[]; }
  export function beatClock(bpm?: number): BeatClock;
  export const BEAT: BeatClock; // the shared clock at BEAT_BPM
  ```
- `SoundEngine.update(view, dtSeconds, timeSeconds?)`: the new optional third argument is the frame time that main.ts also passes to `renderer.draw`. It is optional, so today's engine still typechecks.
- There are no new dependencies, samples or assets.

## GDD check
This is presentation only. No rule, number, payload or puzzle changes. `BLOW_TIMING` is untouched, so "the Relight can't be interrupted" holds. No `rules-coverage.md` change.

## Questions for Josh (defaults apply if you just approve)
1. **Tempo?** **Default: 66 BPM**, a resting heartbeat. It is one number (`BEAT_BPM`) and can be anything from 60 to 72.
2. **Should the beat speed up as feeds near their limit?** **Default: no, a steady beat.** The hum's level and the fuse bar already show load, and a steady beat keeps the pulses calm and in step.
3. **Keep the level-done cue at all?** The richer chimes may be enough on their own. **Default: keep it, reverted to 025's cue on the 432 grid.**
