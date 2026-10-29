ticket: 031-choir-splash-sound
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Retune every pitched sound in `src/audio/` to A4 = 432 Hz, with each pitch written as `noteHz(...)` or a named constant built from it, and checked by a grid scan that fails if a recipe is missed. Replace 025's knock and two-note figure in `levelDoneSound()` with a 3–4 s synthesized choir "ahh" on an open A major (detuned saws, formant bank, vibrato, high shimmer). Everything else about the level-done cue stays as 025 built it.

## Does the branch do it?
Checked on `ticket/031-choir-splash-sound` (one commit, bba0b8d). `npm test`: 45 files, 804 tests pass. `npm run typecheck`: clean.

**Tuning**
- *Reference and helpers.* `src/audio/tuning.ts` has `A4_HZ = 432`, `semitonesHz`, `noteHz` (sharps only, throws on a bad name) and `onGrid`. `tuning.test.ts` checks every value the criterion lists: A4/A3/A1, C#5 within 0.01, `semitonesHz(0/-12)`, and `onGrid` true for 216/323.63/1830.75 and false for 440/220/50. Met.
- *Grid scan.* `tuningScan.test.ts` `RECIPES` calls every recipe over its range: both booleans, all three parts, `sparkBurst(1..10)`, 12 chime indices, two bed shapes. It checks `freq` and `freqTo` of every non-noise, non-`unpitched` voice. I also went through each pitch in `recipes.ts` by hand, and each one is the nearest 432-grid note to its old value. Examples: 90→F#2, 50→G#1, 800→G#5, 1200→D#6, 2400→D#7, 70→C#2 (closer than D2), 1600→G#6, 40→E1, chimes→E4 G4 A4 C5 E5. Met.
- *Named pitches.* `HUM_HZ`, `FLICKER_HZ`, both whine endpoints, the battery whine and its run-out target, `CHIME_HZ`, `CHOIR_NOTES` and `CHOIR_SHIMMER_NOTES` are all scanned. A separate test pins the hum to `[54, 108]` and keeps the flicker in unison with the upper hum oscillator. The sag/recovery test keeps their falling/rising shapes. Met.
- *Nothing is missed.* The first test in `tuningScan.test.ts` lists every exported function of `recipes.ts` and requires each to be in `RECIPES` or in `EXEMPT` (`envelope`, `dbToGain`, `sparkBoostDb`), so a new recipe fails it. Met. No voice uses `unpitched`, and a test asserts that, as the ticket recommended.
- *Shell uses the constants.* `shell.ts` imports `HUM_HZ`, `FLICKER_HZ` and `WHINE_LOW_HZ`, including in the detach reset. No pitch literal is left in `shell.ts`; what remains is filter cutoffs (300, 1200) and an LFO rate (11), which the ticket exempts. `tuningShell.test.ts` checks the hum, flicker and whine start frequencies with a fake context. It also checks that a breaker voice has no detune calls and gains only its one lowpass ("builds exactly the nodes it did before"). `detuneCents` goes through `osc.detune.setValueAtTime`. Met.

**Choir**
- *Recipe shape.* There are 11 voices: 8 sung saws, 2 shimmer sines and 1 breath noise. Each of the four chord notes is sung by 2 saws with detunes from `CHOIR_DETUNE_CENTS` (±5 to ±9, unequal within each pair). The noise starts at 0.5 s. Covered by `levelDone.test.ts` "4 to 12 voices…" and "no noise voice at 0". Met.
- *Key.* Every osc voice is on the grid and in pitch class A, C# or E (`A_MAJOR_PCS`). This includes the shimmer at E6 and A6. Met.
- *Formants.* `CHOIR_FORMANTS` are 780 Hz (−7 dB), 1150 Hz (−10 dB) and 2600 Hz (−18 dB), linear sum ≈ 0.89. Tested. Met.
- *Vibrato.* 8 distinct rates from 4.8 to 5.9 Hz, ±16 cents. Tested. The shimmer's tremolo is a separate `lfo`. Met.
- *Shimmer.* The sines are at −36 dB, entering at 0.6 s and 0.9 s, and the breath is highpassed at 4.5 kHz, −38 dB, entering at 0.5 s. All are quieter than the sung −28 dB. Tested. Met.
- *Envelope and length.* Sung voices have attack 0.5 and release 1.6. Every voice ends exactly at `CHOIR_END` = 3.8 s. Tested. Met.
- *No clipping.* The loudest voice is −28 dB. The summed peaks are ≈ 0.36, under `dbToGain(-8)` ≈ 0.40. Tested. Met.
- *Unlike the Relight, and deterministic.* The test was kept, minus the triangle assertion the ticket superseded. No `Math.random` (the existing `fence.test.ts` covers that). Met.
- *Shell builds it.* `tuningShell.test.ts` covers this with a fake context. It checks one bandpass per formant per sung voice with the right freq and Q, each feeding a gain that feeds a summing gain. It checks that the vibrato oscillator's depth gain drives the source's `detune`, with the right rates and depths, and that each vibrato oscillator starts once and stops once. In `shell.ts` the vibrato oscillator is added to `h.sources`, so it stops at the voice's `stopAt`, or in `kill`. Met.
- *Still never dropped.* The `levelDone.test.ts` budget test now compares against `levelDoneSound().length`. Met.
- *Still rings out on detach.* `levelDoneEngine.test.ts` takes `CHOIR_SOURCES` from `levelDoneSound()`, counting each voice plus its vibrato and tremolo oscillators. It asserts that all of them stop once (ring out) and that the breaker's 2 sources are killed. Met.
- *Gate, mute, unlock and no-throw.* All of 025's cases are still there. Only the counts changed, plus the start window, which widened from 0.2 to 1 s because the chord and shimmer now enter later by design. Met.

**Both**
- *Fence.* The diff touches only `src/audio/`. Imports outside `src/audio` are only `../core`. `package.json` is unchanged and there are no assets. `cues.ts`, `engine.ts` and `mixer.ts` are untouched. `fakeContext.ts` gained a `detune` param, and `mixer.test.ts` changed a test-only 440 to 432. Both are test support inside `src/audio/`. Met.
- *Gate.* Green at 804 tests, and the count grew. Met.
- *Josh listens.* This can't be judged here.

## Rule conflicts and risks
- None against the hard rules. `src/grid/` and `src/night/` are untouched, there are no dependencies, no `src/core/` change and no GDD rule touched.
- The glow now clashes with the hum. The nearest-note rule moves the glow saws from 100/200 to G#2/G#3 (101.9/203.9), but the hum moved to A2 108. Before, the glow sat in unison with the 100 Hz hum; now it is a semitone below it. The builder followed the ticket's rule as written, but Josh may hear the blow's glow as sour against the hum.
- The choir may be quieter than 025's cue. It is 8 saws at −28 dB each through narrow bandpasses (Q 6–10). Only a small part of a saw's energy falls in those bands, so it may come out noticeably quieter than 025's −20 dB triangles. The ticket asked for "about as present, not louder". That is a numbers tweak in `recipes.ts` after Josh hears it.

## Must fix
none

## Could improve
1. `src/audio/recipes.ts` `glowSound()`: if Josh hears the glow rub against the hum, use `noteHz("A2")`/`noteHz("A3")` to restore the old unison. The ticket's nearest-note rule would need a one-line exception for this.
2. `src/audio/recipes.ts`: if the choir is too faint, raise `CHOIR_DB` (e.g. to −24) and keep the summed-peak test under the ceiling. At −24 the sum is about 0.85 of the ceiling's linear gain, so the test still passes. Wait for Josh's ear before changing it.
3. `src/audio/recipes.ts`: the shimmer's `attack: 0.8` and tremolo rates (`3.1 + i * 0.7`) are inline numbers. The ticket wants the choir's numbers as `CHOIR_*` constants; naming these would finish that.
