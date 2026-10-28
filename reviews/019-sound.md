ticket: 019-sound
assessment: meets
must-fix: 0

## What the ticket asked for, as I understood it
The prototype gets synthesised Web Audio sound (no files, no dependency). It is driven only by `src/core` events, a per-frame `SoundView` and the Relight times from `main.ts`. The blow timing is shared through `BLOW_TIMING`, there is a new `play:click` for refused, undo and reset, and the HUD gets a mute button and a volume slider that remember their setting. It is built in five parts: 0 core, A audio, C render, D play, B ui/main.

## Does the branch do it?
This is round 2. Since round 1 (`f4866f5`) the only change is `8c6ff9e`, which touches only `src/play/click-event.test.ts` (+14/-2). No production code changed, so the round-1 findings on parts 0, A, B and C still hold as written and I don't repeat them here. In short: all met, tested in `src/core/audio.test.ts`, `src/audio/*.test.ts`, `src/render/shock-timing.test.ts` and `src/ui/audio.test.ts`.

`npm run gate` passes on the branch: typecheck clean, 31 files, 575 tests (573 at round 1). Nothing in `src/grid/`, `src/night/`, `puzzles/` or `package.json` changes.

**Part D (play): the round-1 must-fix holds.**
- `setup()` now takes a puzzle file (default `08-shrine-circuit.json`, so the existing tests are unchanged).
- New test "emits refused for the unpowered relay switch (puzzle 19)". It loads `puzzles/19-wake-the-relay.json`, where `rl` is a `switch` with `relay: true`, clicks `rl` before it has power, and expects exactly `[{ kind: "refused", target: "rl" }]`. That is the `throwSwitch` → false branch in `play.ts`.
- New test "emits refused for releasing the empty battery (puzzle 19)". `bat` starts at charge 0, and the test expects exactly `[{ kind: "refused", target: "bat" }]`. That is the `release` → false branch. This was optional and is a welcome addition.
- **The tests are load-bearing.** I removed the `if (!ok) refused();` lines from the switch and battery branches of `src/play/play.ts` and ran the file. Both new tests failed and the other four passed. Then I restored the file, and the worktree is clean. So the tests do drive the refusal through the production code path, not just the event's shape.
- The refused `throwBreaker` branch is still covered only by reading the code (it is the same line as the other two). The ticket requires only the relay and the repair, so this is not a blocker.

Part D's criteria are now fully met: a relay with no power and a repair without its part each emit exactly one `play:click` with their `target`. Nothing is emitted for no intent, accepted actions, or anything during the Relight except reset. Undo and reset carry no `target` key. The log is unchanged.

## Rule conflicts and risks
- No hard-rule break found. `src/grid/` and `src/night/` are untouched, `src/core/` stays pure, no folder outside the ticket's list is touched, and there is no new dependency and no audio file.
- The round-1 risks still stand, unchanged and all non-blocking:
  - A second `relight()` is dropped while the first cascade's tail sounds, so a reset followed by a fast re-win gives a silent Relight.
  - The controls row now wraps to a second line in the right column.
  - The live crackle bypasses the 12-voice budget, though it can't stack.
  - The spark burst can start up to one frame late below 50 fps.
  - `.claude/agents/sound.md` says `model: sonnet`, while Josh's words were "yes tell it to run on fable". This was done on `main`, not by this branch, but Josh should know.
- The new test leaves one thing unchecked: it doesn't assert that `rl`'s selection is unchanged after the refused throw. That's the grid's job and is tested there, so it's fine.
- I cannot hear the result. Only Josh's ears can judge these:
  - whether the clicks read as breaker, switch, relay and refused, and whether the refused/undo/reset tick is audible at all at -24 dB
  - whether the hum at -30 dB is a pleasant bed or a drone
  - whether the blow's run, swell, burst and pop land on the picture, and whether the 4-lamp burst is noticeably but only slightly louder
  - whether the merged cascade reads as one event
  - whether the brownout flicker is tolerable for as long as it lasts
  - the charge whine's pitch range (600 to 1400 Hz) and the release whine at 1.8 kHz
  - whether the Relight chimes sit in step with the lamps
  - whether mute is instant and volume 0.5 is a sensible default
  - whether anything clips through the compressor

## Must fix
none

## Could improve
1. `src/audio/mixer.ts` / `recipes.ts`: the ticket says the hum and whine duck "while a blow sequence plays". Today only the pop (0.7 s onward) ducks, as `sound.md` specifies. Marking the run cue `ducks: true` too, or ducking from the sequence start, would match the ticket's wording. Leave it if Josh's ears say the run and swell already cut through the hum.
2. `src/audio/mixer.ts`: clear `relightUntil` when a new `relight()` arrives after the old cascade's chimes have passed. Or have `main.ts` detach and re-attach on reset. Either way a re-won Relight after a reset isn't silent.
3. `src/audio/shell.ts` `crackle()`: count crackle ticks against the voice budget, as the ticket's restraint rule says.
4. `src/ui/logic.ts` `clampVolume(NaN)` returns the default (0.5), while the engine's `setVolume(NaN)` leaves the volume unchanged. Nothing is wrong today, since `sliderToVolume` already returns `null` for NaN, but aligning the two would avoid a surprise later.
5. In the ticket's B section, the "first frame `relightT` is not null" trigger in `main.ts` has no test. Josh's Relight listening step is its only check.
6. `src/play/click-event.test.ts`: a refused `throwBreaker` case would complete coverage of the four refusal branches.
