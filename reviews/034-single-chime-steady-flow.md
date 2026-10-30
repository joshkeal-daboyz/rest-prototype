ticket: 034-single-chime-steady-flow
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A: the win splash (`levelDoneSound`) becomes exactly one Relight chime main voice at `CHIME_HZ[LEVEL_CHIME_INDEX]` (default E5). The cue, gate, `"level"` group and ring-out stay as they were, and every other sound stays byte-identical. B: the chevrons stop surging on the beat and go back to steady `pulsePhase(t)` travel outward from the source. The beat helpers leave `src/render/`, and the beat sound stays.

Reviewed: `git diff 28fd697~1..HEAD` (27294a6 part A, 4f50509 part B), at HEAD 4f50509. `npm run typecheck` is clean. The full suite is 64 files and **1164 passed**. The audio and render tests also pass on a clean `git archive` export of 4f50509 (see the worktree note under risks).

## Does the branch do it?

**A · sound**
- **One note:** `recipes.ts` now has `LEVEL_CHIME_INDEX = CHIME_HZ.length - 1`, and `levelDoneSound()` returns `[relightChime(LEVEL_CHIME_INDEX)[0]]`. `levelDone.test.ts` checks this with "one note: exactly one voice, deep-equal…" and "a plain sine at 0…", which asserts no filter, formants, vibrato or detune, `at` 0, and an end by 0.7 s. "its pitch is CHIME_HZ[LEVEL_CHIME_INDEX]…" covers `onGrid`, the index default and `noteHz("E5")`. Met.
- **Same family:** "same family…for every index" compares wave, attack, release, duration and gain against `relightChime(i)[0]` for every i. The voice is built from `relightChime`, so it follows any change to the recipe. Met.
- **Under the ceiling:** "under the ceiling…" checks ≤ `dbToGain(-22)`, < `dbToGain(CUE_CEILING_DB)`, `CUE_CEILING_DB === -8` and `VOICE_BUDGET === 12`. Met.
- **Cue and gate as before:** the `levelDoneCue` describe block and everything below it in `levelDone.test.ts` are untouched. Neither `cues.ts` nor `main.ts` is in the diff. `levelDoneEngine.test.ts` is unchanged and passes (7 tests). Met.
- **Nothing else moved:** the only change in `recipes.ts` is the level-done block. `relightChime`, `relightBed`, `relightClose`, `beatThump` and `cues.ts` are byte-identical to the base. The `notSoftened.test.ts.snap` blob is `49ca402` at both the base and HEAD, so it is truly unchanged and not just re-saved with new line endings. The snapshot test passes without `-u` (18 tests) on a clean export, and no snapshot file was written. The pins are split across files:
  - The new "032 pins" test pins only part of the 032 output.
  - The unchanged `beat.test.ts` "Relight chimes are soft dyads" block pins `relightChime(i)[0]` as a literal for 12 indices, plus the fifth's structure, the `relightCues` chime timing, the notes and the close.
  - `beatThump` is pinned by bounds and the A1/A2 pitches, not by a literal deep-equal (see Could improve 1).

  `tuningScan.test.ts` now scans `CHIME_HZ[LEVEL_CHIME_INDEX]`. The "025 knock, figure and under-note constants are gone" test checks that there is no `LEVEL_(KNOCK|NOTE|UNDER)` export. Met.
- **Fence:** `fence.test.ts` passes. `package.json` is unchanged, and there are no assets. Met.

**B · renderer**
- **Steady:** `map-renderer.ts:1006` reads `const phase = pulsePhase(t);` again, and the import is restored. This is the exact inverse of 477f2ba (032 B). The `motion.ts` blob at HEAD is `7815a68`, the same as before 032. Compared with `9731884:src/render/motion.ts`, only line endings differ. In `flow.test.ts`, "first chevron sits at pulsePhase(t) from the source end" samples times that include `BEAT.at(0/1/7)` and mid-beat times. "advances by dt * PULSE_SPEED…no surge" checks the step between frames, including across a beat boundary. Both run with the source at either end. Met.
- **Outward:** I read the draw code. `sx,sy` is the end at `flowFrom` (`fromA = src === lineFromId[i]`), `u` points toward the far end, and each chevron's tip is at `c + 7u` with its notch at `c − u`. So chevrons point and travel away from the source, battery current included. The test "each tip is farther from the source than its base, and chevrons move away as t grows" covers this for both `flowFrom` values, and "the two sources flow in opposite screen directions" adds a check. Met.
- **No beat in render:** grepping the non-test files in `src/render/` finds no `BEAT`, `beatClock`, `beatPulsePhase`, `easeOutCubic` or `PULSE_BEAT`. `flow.test.ts` "no render source references…" scans every `.ts` file that is not a test. "motion.ts no longer exports the beat helpers" checks the exports. `render.test.ts` keeps its `pulsePhase` tests, and the render fence passes. Met. `flow.test.ts` imports `BEAT` itself, which the ticket requires because it samples `BEAT.at(i)`.

**Both: test count, stated honestly.** The count did not drop. It went from **1162 to 1164 (+2)**:
- `beatpulse.test.ts` was deleted, retiring 7 tests.
- `flow.test.ts` was added with 9 tests.
- `levelDone.test.ts` replaced 8 tests with 8 tests.

The retired tests:
- **6 of the 7 beat-pulse tests** were only about the surge: the ease shape, 0 on every beat, monotonic through each beat, front-loaded, equal to `easeOutCubic(BEAT.phase)`, and "the draw uses beatPulsePhase".
- **The 7th**, "pulsePhase keeps its old behaviour", was not about the surge. Its two assertions (`pulsePhase(0) === 0` and that it increases) are still covered in `render.test.ts:107-111`, and the new flow tests cover more.
- **Of the 8 old level-done tests, 7 were retired** because the ticket retires the knock and the figure: the noise knock plus tones, the end by 1.0 s, ≤ −14 dB, A-major pitches, the C#4/A4/A2 figure, "is unlike the Relight" (which the ticket now contradicts), and the choir check. The choir check's `CHOIR_` assertion lives on in the new constants test. "is deterministic" was kept.

Every new criterion has a test.

**Josh listens and looks.** Only ears and eyes can judge these. Josh can't test now, so they are open:
1. **The win splash:** it should sound like "one more light chime" and not like a stray note, and it should still be clearly heard after the Relight bed and close. It is a bare sine at −22 dB, and the Relight chimes have their quiet fifth. Whether E5 resolves or feels unfinished is Josh's call; the ticket's own alternative is A4.
2. **Ring-out across Next:** it only has to sound natural, since the logic is unchanged.
3. **The chevrons:** they should feel calm and flow out of each feed and battery, at the pre-032 speed.
4. **The beat:** it should still thump while a feed is powered and stop when nothing is. With the arrows no longer moving with it, Josh should check it isn't now disorienting the other way, or simply unnoticed.
5. **The other sounds:** switch, breaker, fuse and battery should sound as before. The tests already back this; a listen confirms it.

## Rule conflicts and risks
- No rule broken. `src/grid/`, `src/night/`, `src/core/`, `src/main.ts` and `puzzles/` are untouched. There is no new dependency, and no GDD rule is involved (presentation only).
- **Uncommitted edits in the worktree at review time.** `D:\rp-034` has uncommitted changes I did not make:
  - `recipes.ts` sets `LEVEL_CHIME_INDEX = 2` (A4), with a comment citing Josh.
  - `levelDone.test.ts` expects A4.
  - `notSoftened.test.ts.snap` differs from HEAD in line endings only.

  This review covers committed HEAD 4f50509, which is E5 as approved. If the A4 change is meant to land, the main session should make sure it comes from Josh's own words in chat and is committed by the builder. The function is index-driven and the "same family" test is generic, so the change itself is safe.
- Ownership crossed folders at the commit level. The deletion of `src/render/beatpulse.test.ts` sits in the part A (sound) commit 27294a6, not in the renderer commit. It did no harm, but the commit history is untidy.

## Must fix
none

## Could improve
1. `src/audio/levelDone.test.ts` "032 pins": add a literal deep-equal for `beatThump()` and for the full `relightChime(i)`, including voice [1]. Snapshotting them alongside the not-softened set would also work. The criterion asks for these to "deep-equal their 032 output". Today that rests on the byte-identical diff and the bound-style checks in `beat.test.ts`, not on a full pin.
2. In `levelDoneSound`, `main ? [main] : []` can't take the empty branch when `LEVEL_CHIME_INDEX` is in range. A test asserting `0 ≤ LEVEL_CHIME_INDEX < CHIME_HZ.length` would make that guarantee explicit.
