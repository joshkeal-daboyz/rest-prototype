ticket: 025-splash-sound
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
A short "level done" cue (soft noise knock, then triangle C#4 → A4 over an A2 sine) when the win splash appears. It plays once per win through a pure gate in `src/audio/` and is reached by one `audio.levelDone()` line in `main.ts`. It lives in its own never-dropped, ducking `"level"` mixer group, rings out across a detach, and follows unlock, mute and volume like every other cue.

## Does the branch do it?
- **0 (core):** `SoundEngine.levelDone(): void` was added to `src/core/audio.ts` with the documented contract. `src/core/audio.test.ts` checks the type with `expectTypeOf<SoundEngine["levelDone"]>().toEqualTypeOf<() => void>()`. Met.
- **Recipe (`recipes.ts` `levelDoneSound`, tests in `src/audio/levelDone.test.ts`):** All numbers are named constants. The knock is noise, LP 900 Hz, Q 0.7, 2 ms attack, 40 ms, -20 dB. The notes are triangle 277.18 Hz at 0.06 s and 440 Hz at 0.16 s, LP 1.5 kHz, 15 ms attack, 600 ms release, -20 dB. The undertone is sine 110 Hz at 0.16 s, 30 ms attack, 500 ms release, -26 dB. The tests cover:
  - (a) one noise voice at 0 and three tonal voices later;
  - (b) `at + duration <= 1.0` (the latest end is 0.16 + 0.75 = 0.91);
  - (c) each voice ≤ -14 dB and the linear sum is below `dbToGain(CUE_CEILING_DB)` (about 0.25 against 0.40);
  - (d) the A-major check folds by octave against A, C# and E within 1%;
  - (e) no sine at a `CHIME_HZ` pitch, `not.toEqual` every `relightChime(i)` and `relightClose()`, plus a triangle is present.
  
  No `Math.random`; a determinism test is included. Met.
- **Cue:** `levelDoneCue()` in `cues.ts` returns `{name:"level:done", at:0, group:"level", ducks:true}` with the recipe's voices. It is tested field by field. Met.
- **Mixer:** `mixer.ts` routes `group === "level"` into `protectedCues`, so it skips the budget and rate limit. The test fills `VOICE_BUDGET` with an ordinary cue, takes `level:done` plus an extra, and checks that every level voice plays and `"extra"` is dropped. A separate test checks `duck === DUCK_DB`. A third shows the Relight still plays beside it. Met.
- **Gate:** `LevelDoneGate` (`armed`/`used`) covers all six listed cases exactly: no see, `see(false)`, once across repeated `see(true)`, Replay then win, Reset before the splash, and `reset()`. The engine calls `gate.see(view.complete)` in `update`. It calls `gate.reset()` in `attach` and, via `silence()`, in `detach`. Met.
- **Engine on the fake context (`src/audio/levelDoneEngine.test.ts`):**
  - The cue starts 4 sources, with the earliest at `currentTime` and all within 0.2 s.
  - A second call, or a call after another complete frame, starts nothing.
  - With the last view not complete, nothing starts.
  - Before the gesture: the call uses up the gate and `run` drops the cue because `ready()` is false. After unlock, a repeat call starts nothing, and a fresh false→true win plays. So the cue is dropped, not queued. Met.
  - Muted: the master value stays 0 and no set/ramp raises it. Unmuting and calling again does not replay. The gate is used before `run` (the comment in `engine.ts` says so).
  - Detach: with a breaker cue and the level cue live, detach gives the 2 breaker sources a second (kill) stop. The 4 level sources keep only their scheduled stop, more than 0.08 s ahead.
  - Never throws: no context, a throwing factory and a rejecting resume are all covered.
  
  Met.
- **Detach still zeroes the hum (the behaviour note):** `Player.stopAll` (`shell.ts`) only skips `kill` for handles with `keep`. `keep` is set only for voices of a `"level"` cue. It still clears `held` and calls `setLayers` with every layer at 0, so the hum, flicker, whine, crackle and tick are silenced as before. The existing `engine.test.ts` "detach … stops that map's sounds and layers" test still passes and asserts that the hum gain ends at 0. Met.
- **Fence and dependencies:** the only change outside `src/audio/` and `src/core/` is in `src/main.ts`. `fence.test.ts` passes. `package.json` and the lockfile are unchanged.
- **`src/main.ts`:** the diff is exactly one added line, `audio.levelDone();`, right after `showWin(s, view.elapsed, state.actions);` inside the `if (!s.winShown && splashDue(...))` block. Met.
- **Gate (`npm run gate`):** `npm run typecheck` is clean. `npm test` passes: 42 files and 785 tests, including the two new test files and the core type test. The count grew.
- **Josh listens:** not judged here, by design.

## Rule conflicts and risks
- No hard-rule break found. `src/grid/` and `src/night/` are untouched, the folders match the ticket's list, there is no new dependency, and no GDD rule changed. The cue never ducks or stops Relight voices, because it is not in the Relight group and the Relight is protected separately.
- In `main.ts`, `audio.levelDone()` runs before that frame's `audio.update(state, dt)`, so the gate reads the previous frame's `complete`. The ticket defines it this way ("the last `update(view)`"), and `complete` stays true through the Relight and the 0.4 s splash delay, so in practice this is fine.
- After a detach, `mixer.reset()` clears the duck and budget state. On a quick Next, the new map's hum can therefore rise un-ducked under the level cue's last ~0.9 s tail. The level voices also aren't counted against the new map's budget. This is minor and doesn't contradict the ticket's wording.

## Must fix
none

## Could improve
1. In `src/audio/levelDoneEngine.test.ts`, the detach test could also assert that the hum layer gain ends at 0 while the level cue is still live. That would pin the behaviour note ("stopAll still zeroes the hum") for the `keep` path specifically. Today only the older `engine.test.ts` detach test covers it, and that test has no kept voice.
2. In the muted test (`levelDoneEngine.test.ts`), assert that the cue's sources did start (n === 4) while muted. That would make "plays into a zero master" explicit, rather than only "not raised, not replayed".
3. Optionally, keep the mixer's duck until the level cue ends across `reset()` (`mixer.ts`), so a quick Next doesn't bring the new map's hum up under the tail. Only do this if Josh hears it.
