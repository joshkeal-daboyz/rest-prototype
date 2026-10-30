ticket: 034-single-chime-steady-flow (amendment: the win splash is silent)
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
Josh: "Remove the splash chime. The light chimes are enough." The level-done cue goes entirely (recipe, cue, gate, the `"level"` group, the player's `keep` flag, `SoundEngine.levelDone`, the one `main.ts` call). A win then sounds only the Relight, and every other sound stays byte-identical. Scope of this review: `git diff 4f50509..HEAD` (634d346, 7b7ffb1, fedcaf5). Part B was covered by the earlier review.

## Does the branch do it?
- **No level-done cue (exports + source scan).** `recipes.ts` loses `LEVEL_CHIME_INDEX` and `levelDoneSound`. `cues.ts` loses `levelDoneCue` and `LevelDoneGate`. `noLevelCue.test.ts` checks that no `recipes`/`cues` export matches `/level/i`, and scans every `.ts` in `src/audio/` plus `src/main.ts` for `levelDone`, `LevelDone`, `level:done`, `LEVEL_CHIME` and the `"level"` group. I grepped `src/` for `levelDone|LevelDone|level:done|"level"|keep` myself. The only hits are the core type test, the comment in `core/audio.ts`, and unrelated `keep` locals in the mixer/geometry/tests. Met.
- **No engine method.** `engine.ts` loses the method, the gate and its three `reset/see` calls. The runtime check is in `noLevelCue.test.ts` ("the engine has no level-done method at runtime"). The type check is in `src/core/audio.test.ts` (`"levelDone" extends keyof SoundEngine` is `false`). `core/audio.ts` only drops the member and adds a comment. Met.
- **A win schedules only the Relight.** `noLevelCue.test.ts` "a win starts exactly the Relight's sources and nothing more": complete frames alone start 0 sources, `relight(...)` starts exactly the count derived from `relightCues(...)`, and a further won frame adds nothing. It is shaped differently from the ticket's two-run comparison and doesn't exercise detach, but it shows the same thing (see Could improve). Met.
- **Relight and beat unchanged, pinned.** `relightPins.test.ts` deep-equals inline literals for chimes 0/2/5, close, two beds, a 4-lamp `relightCues` and `beatThump`. I checked these independently. In a temporary worktree at 4f50509 I ran the OLD `recipes.ts`/`cues.ts` and the NEW ones side by side and dumped `relightChime(0..11)`, `relightClose()`, `relightBed(0.5,1)`, `(3,3.5)`, `(1,1)`, `(2.5,3)`, `relightCues([0.3,0.9],1.5)`, `relightCues([0.25,0.25,0.9,2.65],3)`, `beatThump()`, `BEAT_HZ`, `BEAT_DB`, `BEAT_TICK_HZ` and `CHIME_HZ`. The two JSON dumps are byte-identical (13784 bytes each). The pin test passes, so its literals equal the old output too. The 032 values (fifth at −30 dB, close 216/323.6 Hz at −28, bed 54/108 Hz, thump 54 Hz at −28) are all inside those literals. The old "032 pins" test was not moved as such, though (see Could improve). Met in substance.
- **Nothing else moved.** `src/audio/__snapshots__/` is not in the diff (`git diff --stat 4f50509..HEAD -- src/audio/__snapshots__` is empty), and `notSoftened.test.ts` passes without `-u`. Only a comment changed there. The mixer, engine, beat and detach tests (`mixer.test.ts` "reset (detach) forgets a running Relight", the engine attach/detach tests) are untouched and pass. Met.
- **Grid scan.** `tuningScan.test.ts` drops the two entries and passes. Met.
- **Fence / deps.** `package.json` and the lock file are unchanged, there are no assets, and `fence.test.ts` passes. Met.
- **Retired tests.** Every test in the deleted `levelDone.test.ts` and `levelDoneEngine.test.ts` is about the level cue, its gate, its mixer protection or its ring-out across a detach. The one exception is "032 pins", whose values are now covered by `relightPins.test.ts`. Each new criterion has a test.
- **Gate.** I ran `npm run gate` twice in D:\rp-034: both green, 64 files and 1148 tests each time. No flaky test seen. The only noise is Vitest's "object as third argument is deprecated" warning, which predates this change.

**stopAll / shell / mixer.** Before this change, `keep` was set only when `cue.group === "level"` (`play()`); `crackle()` and `beat()` passed nothing or `false`. So for every surviving cue the old `if (!h.keep)` was always true, and `stopAll()` behaved exactly as it does now. The `voice()` signature change is mechanical: `beat` still routes to `this.duck`, and crackle still defaults to `master`. The removed mixer branch only matched `"level"` cues. `stopAll()` is reached only from `silence()`, which is called only from `detach`. The Relight was never `keep`, so it was already cut by Next, and nothing relies on a voice surviving a detach. The beat/duck path is unchanged.

**main.ts.** Exactly one line removed (`audio.levelDone();`). No other file outside `src/audio/` and `src/core/audio*` changed in this range, apart from the ticket and the earlier review.

## Rule conflicts and risks
- None found. Presentation only, with no GDD rule, puzzle, `src/grid/` or `src/night/` change and no new dependency.
- Only ears can judge these (Josh, `npm run dev`, click once, `01-first-light` then `02`):
  1. The win splash appearing in silence right after the Relight's close feels finished rather than empty. The Relight's close/bed tail is the last sound.
  2. The Relight chimes, their soft fifth, the close and the bed sound as before. Their numbers are identical, so any difference would come from the browser, not the code.
  3. Pressing Next during the Relight tail cuts it, as before. That is not new, but with no splash note it may now be more noticeable.
  4. The beat, switch, breaker, fuse and battery sounds are unchanged (numbers pinned/snapshotted).

## Must fix
none

## Could improve
1. `src/audio/relightPins.test.ts`: the ticket named the pin set as `relightChime(i)` for i in 0..11, `relightBed(0.5,1)`, `relightBed(3,3.5)` and `relightCues([0.3,0.9],1.5)`. The test pins chimes 0/2/5 (plus 1 through the cue list) and different bed/cue arguments, so chime indices 3 and 4 have no literal pin. My dump shows all of them identical to 4f50509 today. Adding them would hold that going forward.
2. The ticket asked for the old "032 pins" test (quiet fifth −30 dB, close A3+E4 −28 dB, bed A1+A2, `BEAT_HZ` A1, `BEAT_DB` −28) to be moved, not dropped. Its values are covered by the literals. A short named test using `noteHz(...)` would still keep the rule readable and assert the `BEAT_HZ`/`BEAT_DB` exports directly.
3. `noLevelCue.test.ts` "a win starts exactly the Relight's sources": the ticket's form (two runs that differ only in `complete`, with a powered feed so the beat/layers are in play, then a detach that starts nothing) would also show that `complete` has no audible side effect while the beat is running.
