# 031 · Choir splash sound and 432 Hz tuning

owner: sound
status: approved (Josh, in chat: "I understand, I approve"; hum and flicker move to the 432 grid, single swell)
branch: `ticket/031-choir-splash-sound`

## Josh's words
"the pop up window after completion should have a different sound, like angels singing"

"All sounds notes in the game should play 432hz to encourage 'healing or relaxing' sounds"

## Goal
Every pitched sound in the game is tuned to A4 = 432 Hz instead of 440. Notes are written as note names that are derived from one reference constant, not as hard-coded Hz. The win splash also gets a short synthesized angel choir in place of 025's knock and two-note figure: a soft, slow swell of an open A-major chord sung on "ahh" by a few slightly detuned voices, with a gentle vibrato and an airy shimmer on top, fading out over about 3–4 s. Everything else about the level-done cue stays as 025 built it: when it plays, the once-per-win gate, the `"level"` group, ringing out across Next, the call site in `main.ts`, and how mute, volume and unlock apply.

## Decided in this cut

### A · 432 Hz tuning (the whole audio folder)
- **One reference.** A new `src/audio/tuning.ts` holds `A4_HZ = 432` and the helpers (see Interfaces). Every pitched frequency in `src/audio/` is written as `noteHz("…")` or as a named constant built from it. No literal Hz is used for a pitch.
- **What counts as pitched.** These are pitched: every `osc` voice's `freq` and `freqTo`, the held battery whine and its run-out sag target, the `CHIME_HZ` row, and the shell's continuous oscillators (hum, flicker saw, charge-whine range).
- **What is unaffected.** Noise voices, filter cutoffs and their glides, formant centres, LFO, tremolo and vibrato rates, and the compressor are not pitches. They stay as they are.
- **Where each pitch moves.** Each pitch moves to the nearest 432-grid note to its old value, unless a line below says otherwise. Some examples: 110 → A2 108, 220 → A3 216, 330 → E4 323.63, 440 → A4 432, 1800 → A#6 1830.75, 900 → A#5 915.38.
- **Glides.** Both the start and the end of a glide are grid notes. The charge whine's `WHINE_LOW_HZ`/`WHINE_HIGH_HZ` endpoints are grid notes, and the whine sweeps continuously between them as before.
- **Hum and brownout.** The hum moves from 50 + 100 Hz to A1 54 + A2 108. The flicker saw stays in unison with the hum's upper oscillator, so it moves to A2 108. The sag and recovery glides are deliberately falling and rising, and they keep that shape with grid endpoints. If a detune is deliberate, it is written as `detuneCents` relative to a grid note, never as an off-grid `freq`.
- **Shell constants come out of the shell.** The hum, flicker and initial whine pitches are hard-coded in `shell.ts`. They become named constants in `recipes.ts` (e.g. `HUM_HZ`, `FLICKER_HZ`), so the grid test can see them. The shell imports them and builds the same nodes as before.
- **Opting out.** An `osc` voice may opt out only with `unpitched: true` and a one-line comment saying why (e.g. a 20 ms square used as a click). The report lists every such voice. Recommended: none.

### B · The choir (only `levelDoneSound()` changes)
- `levelDoneSound()` returns the choir, and the knock and the triangle figure are removed. `levelDoneCue()`, `LevelDoneGate`, `SoundEngine.levelDone()`, the mixer's `"level"` handling and `src/main.ts` stay unchanged. The cue keeps `ducks: true`.
- The builder sets the exact numbers within these limits. They go in `recipes.ts` as named `CHOIR_*` constants, in dBFS before the master.
  - **Chord:** an open A major at 432: A3 216, E4 323.63, A4 432, C#5 544.29 (root, fifth, octave, major third). It is in tune with the Relight's fading close, which is now 216 + 323.63.
  - **Voices:** each chord note is sung by 2–3 voices on the grid note, detuned by fixed `detuneCents` of ±3 to ±10. Use a sawtooth or square wave. No `Math.random`.
  - **"Ahh":** each sung voice goes through a parallel bandpass formant bank: F1 about 700–850 Hz, F2 about 1100–1250 Hz, and optionally F3 about 2600 Hz.
  - **Vibrato:** about 4.5–6 Hz and ±10–25 cents, with rates that differ slightly per voice. Tremolo (`lfo`) is not vibrato.
  - **Shimmer:** one or two quiet high grid notes (e.g. sines at E6 1294.54 and A6 1728 with a slow tremolo), and/or soft highpassed breath noise (≥ 4 kHz). They enter slightly after the chord.
  - **Envelope:** sung voices attack over 0.3–0.6 s and release over ≥ 1.5 s. The whole cue lasts 3.0–4.0 s.
  - **Volume:** about as present as 025's cue was, not louder.
- **Voice budget:** at most `VOICE_BUDGET` (12) voices. The formant bank and the vibrato oscillator are per-voice nodes, not extra voices.
- **Superseded tests:** 025's tests that pin the old sound are replaced by this ticket's tests. Those are: the noise knock at 0, tones later, the end by 1.0 s, a triangle present, and the engine test's node counts `6`/`4`.
- **Tests that hard-code old pitches change too:** `cues.test.ts` (110, 1200, 900, 1800, `[100, 200]`, the chime row), `engine.test.ts` (1800, 900, the chimes), `layers.test.ts` (600, 1400) and `levelDone.test.ts` (`A_MAJOR`). They now refer to the named constants or `noteHz`. What they assert does not change otherwise.

## Acceptance criteria
All are Vitest in `src/audio/` unless marked Josh.

**Tuning**
- [ ] `A4_HZ === 432`. `noteHz("A4") === 432`, `noteHz("A3") === 216`, `noteHz("A1") === 54`, and `noteHz("C#5")` is within 0.01 of 544.29. `semitonesHz(0) === 432` and `semitonesHz(-12) === 216`.
- [ ] `onGrid(hz, tolCents = 1)` is true for 216, 323.63 and 1830.75, and false for 440, 220 and 50.
- [ ] **Grid scan:** for every voice returned by every exported recipe (called with its full range of arguments: both booleans, all three parts, every `relightChime` index, `sparkBurst(1..10)`, and so on), every `osc` voice's `freq`, and its `freqTo` if set, passes `onGrid` unless the voice has `unpitched: true`. `kind: "noise"` voices are skipped.
- [ ] **Named pitches scan:** `HUM_HZ`, `FLICKER_HZ`, `WHINE_LOW_HZ`, `WHINE_HIGH_HZ`, `BATTERY_WHINE_HZ`, `BATTERY_RUNOUT_HZ`, every `CHIME_HZ` entry and every `CHOIR_*` pitch all pass `onGrid`.
- [ ] **Nothing is missed:** every function exported from `recipes.ts` is either in the grid scan's list or in an explicit exemption list (`envelope`, `dbToGain`, `sparkBoostDb`). A new recipe that isn't added to the scan fails the test.
- [ ] **Shell uses the constants:** with a fake context, the hum oscillators start at `HUM_HZ` values, the flicker saw at `FLICKER_HZ`, and the whine at `WHINE_LOW_HZ`. A voice with `detuneCents` sets the source's `detune`, or else multiplies its frequency by 2^(c/1200). Voices without it build exactly the nodes they did before.

**Choir**
- [ ] **Recipe shape:** `levelDoneSound()` returns 4–12 voices. Every chord note (`noteHz` A3, E4, A4, C#5) is covered by ≥ 2 `osc` voices, and those voices' `detuneCents` are not all equal and lie within ±3 to ±10. There is no noise voice at `at: 0`.
- [ ] **Key:** every `osc` voice's `freq` is an A-major pitch class (A, C#, E) on the 432 grid.
- [ ] **Formants:** every sung voice has a bandpass in 600–900 Hz and one in 1000–1300 Hz. The bank's summed linear gains are ≤ 1.
- [ ] **Vibrato:** every sung voice has a vibrato of 4–7 Hz and 5–30 cents, and at least two distinct rates are used.
- [ ] **Shimmer:** at least one `osc` voice is ≥ 1200 Hz, or there is a noise voice highpassed at ≥ 3000 Hz. It is quieter than the loudest sung voice, and its `at` is > 0.
- [ ] **Envelope and length:** every sung voice has 0.3 ≤ `attack` ≤ 0.6 and `release` ≥ 1.5. Every voice has `at + duration ≤ 4.0`, and the last one ends at ≥ 3.0.
- [ ] **No clipping:** no voice is above -20 dB, and the linear sum of peak gains is below `dbToGain(CUE_CEILING_DB)`.
- [ ] **Unlike the Relight:** no `sine` voice is at a `CHIME_HZ` pitch, and the list differs from every `relightChime(i)` and from `relightClose()`. Two calls return deep-equal lists.
- [ ] **Shell builds it (fake context):** a voice with `formants` gets one bandpass per formant, with the given freq and Q, summed into its gain. A voice with `vibrato` gets an oscillator whose depth gain drives the source's `frequency` (cents converted at the voice's pitch) or its `detune`. That oscillator starts and stops with the voice.
- [ ] **Still never dropped:** with the budget full, `level:done` plays all its voices and an ordinary cue is dropped.
- [ ] **Still rings out on detach:** none of the cue's sources stop early, vibrato and tremolo oscillators included. Other cues are still stopped. Counts come from `levelDoneSound()`.
- [ ] **Gate, mute, unlock and no-throw:** all of 025's `levelDoneEngine.test.ts` cases pass, with only the node counts updated.

**Both**
- [ ] **Fence:** `src/audio/` imports only `src/core/`. `package.json` is unchanged, and there are no asset files.
- [ ] `npm run gate` is green and the test count grows.
- [ ] **Josh listens** (`npm run dev`, click once to unlock):
  - Throw switches and breakers, blow a fuse, let a battery run out and play `01-first-light` to a win. Nothing sounds broken or out of place: the sounds are slightly lower but keep their character.
  - The splash arrives with a soft choir "ahh" that swells, holds and fades over 3–4 s, in tune with the Relight's close.
  - Press Enter at once: `02` opens and the choir fades out naturally.
  - Replay, Esc, Reset and mute behave as in 025.
  - If anything is off, the numbers change in `recipes.ts` only.

## Files
`src/audio/` only:
- new: `tuning.ts`, `tuning.test.ts`
- changed: `recipes.ts`, `types.ts` (new optional `Voice` fields), `shell.ts` (the constants in place of literals, building the new fields), `layers.ts` if needed for the whine constants
- tests: the existing tests named above

`cues.ts`, `engine.ts` and `mixer.ts` should not need changes. If they do, say why in the report.

Out of scope: `src/main.ts`, `src/core/`, `src/ui/`, and everything else.

## Interfaces
There is no `src/core/` change, and `SoundEngine.levelDone()` is unchanged. Everything is in `src/audio/`, which the sound agent owns, and every change is additive:
```ts
// src/audio/tuning.ts
/** The reference pitch for every note in the game (Josh: "432hz"). */
export const A4_HZ = 432;
/** 12-TET above/below A4 at A4_HZ: semitonesHz(0) = 432, semitonesHz(-12) = 216. */
export function semitonesHz(n: number): number;
/** Scientific pitch name, sharps only: "A4" → 432, "C#5" → 544.29, "A1" → 54. Throws on a bad name. */
export function noteHz(name: string): number;
/** True if hz is within tolCents of a 12-TET note at A4_HZ. */
export function onGrid(hz: number, tolCents?: number): boolean;

// src/audio/types.ts, added to Voice
  /** Fixed detune of the source, in cents, applied on top of an on-grid `freq`. */
  detuneCents?: number;
  /** Opt-out from the 432 grid check, for an osc used as a click. Needs a comment saying why. */
  unpitched?: true;
  /** Parallel bandpass bank (vowel formants), after `filter`; outputs summed. Gains are linear-summed ≤ 1. */
  formants?: ReadonlyArray<{ freq: number; q: number; gainDb: number }>;
  /** Pitch wobble: an LFO on frequency. Unlike `lfo`, which is amplitude tremolo. */
  vibrato?: { freq: number; cents: number };
```
No new dependencies, samples or asset files. It's pure Web Audio synthesis, as in 019 and 025.

## GDD check
This is presentation only. No rule, number, payload or puzzle changes. The cue still waits for the splash, which waits for the Relight to end, so "the Relight can't be interrupted" is untouched. No `rules-coverage.md` change.

## Questions for Josh
1. **One swell, or a second one on Next?** As cut there is one swell, and it rings out across Next. A second, higher "ahh" when the next map opens would need `main.ts` and a new engine method, so it would be a second ticket. **Recommended: one swell**, and decide after hearing it.
2. **The electrical hum too?** The 50 Hz hum reads as mains hum, not as a note. As cut it moves to A1 54 + A2 108, so the whole soundscape sits in A at 432, and the brownout flicker follows it with its falling/rising shape kept. The alternative is to leave the hum and flicker at 50/100 as "machine noise", outside the tuning. **Recommended: move them.**
