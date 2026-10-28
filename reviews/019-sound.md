ticket: 019-sound
assessment: partly
must-fix: 1

## What the ticket asked for, as I understood it
The prototype gets synthesised Web Audio sound (no files, no dependency). It is driven only by `src/core` events, a per-frame `SoundView` and the Relight times from `main.ts`. The blow timing is shared through `BLOW_TIMING`, there is a new `play:click` for refused, undo and reset, and the HUD gets a mute button and a volume slider that remember their setting. It is built in five parts: 0 core, A audio, C render, D play, B ui/main.

## Does the branch do it?
`npm run gate` passes on the branch: typecheck clean, 31 files, 573 tests. Nothing in `src/grid/`, `src/night/`, `puzzles/` or `package.json` changes. No existing test file is modified; every test file in the diff is new.

I can't hear anything. Everything below is judged from code and tests. The list of what only Josh's ears can settle is at the end.

**Part 0 (core).** `src/core/timing.ts` has the 016 numbers `as const`. `src/core/audio.ts` has the interfaces as the ticket gives them. `PlayEvents` is additive in `events.ts`, and both files are exported from `index.ts`. `src/core/audio.test.ts` covers every point: the literal values, `popAt === run + glow`, a GridState-shaped inline value assignable to `SoundView` with no grid import, `play:click` typed and going through the bus with no `target` key on undo, and the defaults and key. The new core files are pure: types and constants only. Met.

**Part A (audio).**
- Event → cue, one test per table row: `cues.test.ts` "sound per event class". Breaker open and closed differ (110 vs 90 Hz thump). Spring and player switch differ, and the spring is 6 dB quieter. The three repair parts give three different sounds. `battery:flat` stopped and ran-out differ. `play:click` is one cue (`playClick`, a dry high-passed noise tick at -24 dB) for all three kinds, quieter than the switch and with no tonal blip. Met.
- Blow sequence: `blowCues` reads `BLOW_TIMING`, and the test checks both the constants and the literal 0/0.4/0.5/0.7. No path gives one pop at 0. An old payload without `lamps` uses `[{culprit, path}]`. Met.
- One burst, a bit louder: `sparkBoostDb` is `min(6, n-1)`, and "1, 4, 7 and 32 lamps" checks base, +3, +6 and +6. Met.
- Merging over 0.7 s: `Mixer.blowStep`. Tests: a second blow at 0.3 s gives no run or glow and adds lamps before the burst starts, but not after; the cap holds when blows merge; a blow at 0.8 s starts a new sequence; two blows in one instant give one pop, in one `take` or two; pops 40 ms apart are one pop, 41 ms apart are two. Met.
- Brownout: `CueTracker` plays the sag once on true→true with a new `over`, and the recovery once. The flicker is > 0 exactly while browned out (`layers.test.ts`). Met.
- Continuous layers: hum, whine, full tick (one frame only, and none for a battery already full on the first frame), and crackle at the same level for 1 or 5 lines. All tested in `layers.test.ts`. Met.
- Relight: there are chime merge tests at 60 and 61 ms, rising pitch, "no bus event cancels it", and "only reset (detach) stops it". Met.
- Restraint: 12 voices, with the quietest non-blow voice dropped first (`mixer.test.ts` "over 12 voices…"). The same cue name within 30 ms plays once, including a burst of `play:click`. Ducking is tested as numbers. One note: the duck covers the pop (0.7 s onward) and the whole Relight, not the run and glow. That follows `sound.md` ("a cue with `ducks: true`"), but the ticket says "while a blow sequence plays". See Could improve 1.
- Gesture-only start: `createAudio` injects the factory and the target, and `document` is the default target. There is no context until `pointerdown`/`keydown`, then one context, resumed. Events before that are dropped, not queued, because the tracker still updates so the brownout state stays right. A suspended context or a rejected resume re-arms the listeners. All tested in `engine.test.ts`. Met.
- Never throws: tested with no global, a factory that throws, `resume` rejecting, and the graph failing to build. Every public method is wrapped in `guard`. Met.
- Mute and volume: the master ramps to 0 within 20 ms, `setVolume` clamps and ignores NaN, and the default is 0.5. A fence test checks that no `localStorage` appears in the audio sources, and an engine test checks it is never touched. Met.
- `detach`: a later emit is silent, voices and layers stop, and a re-attach starts the brownout state fresh. Tested. Met.
- No files and no dependencies: `fence.test.ts` greps every `.ts` in `src/audio/`, tests included. It allows only `../core`, `./`, `node:` and `vitest`, and no audio extensions. I confirmed the import lines by hand. Met.

**Part C (render).** `shock.ts` takes the five constants from `BLOW_TIMING` under the same exported names, so the values are unchanged. `shock-timing.test.ts` checks `popStart(true) === BLOW_TIMING.popAt`. Nothing else in `src/render/` changed. Met.

**Part D (play).**
- `play.ts` emits `refused` after a false `throwBreaker`, `throwSwitch` or `release`, and after a repair that isn't ok. `undo` is emitted on every `undo()` that isn't blocked by `done()`, and `reset` always. Log entries are unchanged in content and order.
- Tests in `click-event.test.ts`: a refused repair (`j_dead`); nothing for accepted actions, a lamp or `null`; undo with and without history, plus reset, with no `target` key; nothing during the Relight except reset.
- **Missing:** the ticket names "Tested: a relay with no power; a repair without its part". Only the repair case is tested. No test drives a refused `throwSwitch`, `throwBreaker` or `release`. The code for those three branches is visibly the same three lines as the tested repair branch, so I expect it works. But the criterion names this test explicitly, and it is the one path Josh's first listening step ("click `rl` before it has power") depends on. Must fix 1.

**Part B (ui + main).**
- `main.ts`:
  - `createAudio()` runs once at module level and `restoreAudio(audio)` runs once.
  - `audio.attach(bus)` is in `open()`. The session's `detach` calls `detachAudio()`, and `open()` calls `session?.detach()` first, so a map switch silences the old map before the new one attaches.
  - `audio.update(state, dt)` runs every frame. `dt` is in seconds (`(now-last)/1000`, capped at 0.1). The engine ignores `dt` and uses `ctx.currentTime`, which the interface allows.
  - The Relight fires once, on the first frame `relightT !== null`, and re-arms when it goes back to null (a reset). `relightCues` maps `plan.lampOrder` through `plan.nodeArrive[index in puzzle.nodes]`, which is how `relight.ts` indexes `nodeArrive`.
  - I found no game rule in `main.ts`.
- Mute across map switches: the engine holds `muted`/`volume` for the session, `restoreAudio` is not called per map, and each `mountUI` renders from `audio.muted`. Met.
- `src/ui/index.ts`: the button reads `Sound on`/`Sound off` with `aria-pressed`. The slider is `input type="range"` 0–100 with an aria-label. Both are drawn only when `deps.audio` is present, and each change saves through `writeAudioPrefs`. Met.
- `src/ui/logic.ts`: there are pure helpers for parsing, reading, writing (never throwing), the label and the slider mapping. All tested in `src/ui/audio.test.ts` (18 tests), and `logic.test.ts` is unedited. Met.
- Josh's listening pass is still to come.

## Rule conflicts and risks
- No hard-rule break found. `src/grid/` and `src/night/` are untouched, `src/core/` stays pure, no folder outside the ticket's list is touched, and there is no new dependency and no audio file.
- GDD rule "The Relight can't be interrupted": `play:click` respects it (no refused or undo click while complete), and the audio's cascade can't be cancelled by the bus. One edge: `Mixer.relightUntil` drops a second `relight()` while the first cascade's tail is still sounding, about 3 to 6 s. A reset during the Relight followed by a fast re-win would get a silent second Relight. This is rare and only cosmetic.
- The controls row (the ui agent's flagged risk): it now holds Undo, Reset, Download log, Sound on/off, and Volume plus an 84 px slider. That is wider than `.hud`'s `max-width: min(360px, …)`. `.controls` has `flex-wrap: wrap` and the picker is its own element in the column, so the row wraps to a second line rather than pushing into the picker. `hudTopInset()` measures the column's lower edge after `mountUI`, so the map fits below it. The cost is a taller right column and a slightly smaller map. Under 600 px the media query already stretches both HUD columns full width, as it did before. Between about 600 and 760 px the two 360 px columns may meet in the middle, but that was true before this ticket. I see no crowding the picker can't survive; Josh's eye should confirm.
- `.claude/agents/sound.md` has `model: sonnet`, but Josh's recorded words are "yes tell it to run on fable". The main session's commit on `main` already says "still runs on sonnet", so this is not the branch's doing. Josh should know his instruction wasn't applied literally.
- The live crackle (`Player.crackle`) schedules voices directly, outside `Mixer`'s 12-voice budget. Its rate is 4 to 9 ticks a second at 6 ms each, so it can't stack, but strictly it bypasses the limit.
- The spark burst is released by the next `update()` within 20 ms of its due time. At a frame rate below 50 fps it can start up to one frame late. It is also handed out only if `update` keeps being called, which `main.ts` does.
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
1. `src/play/click-event.test.ts`: add the test the ticket names, "a relay with no power … emits exactly one `play:click` with that `target`". Load a map with a relay (e.g. `puzzles/19-wake-the-relay.json`) and click the relay (`rl`) before it has power. Expect `got` to equal `[{ kind: "refused", target: "rl" }]` and the throw to be refused, so the switch is unchanged. This covers the refused `throwSwitch` path. Ideally also add one refused `throwBreaker` or `release` (a battery with no charge), so all three non-repair refusal branches have a test. Only the relay test is required. Effect: Part D's acceptance criterion is fully met. No production code change expected.

## Could improve
1. `src/audio/mixer.ts` / `recipes.ts`: the ticket says the hum and whine duck "while a blow sequence plays". Today only the pop (0.7 s onward) ducks, as `sound.md` specifies. Marking the run cue `ducks: true` too, or ducking from the sequence start, would match the ticket's wording. Leave it if Josh's ears say the run and swell already cut through the hum.
2. `src/audio/mixer.ts`: clear `relightUntil` when a new `relight()` arrives after the old cascade's chimes have passed. Or have `main.ts` detach and re-attach on reset. Either way a re-won Relight after a reset isn't silent.
3. `src/audio/shell.ts` `crackle()`: count crackle ticks against the voice budget, as the ticket's restraint rule says.
4. `src/ui/logic.ts` `clampVolume(NaN)` returns the default (0.5), while the engine's `setVolume(NaN)` leaves the volume unchanged. `sliderToVolume` already returns `null` for NaN, so nothing is wrong today. Aligning the two would avoid a surprise later.
5. In the ticket's B section, the "first frame `relightT` is not null" trigger has no test. It is wiring in `main.ts`, so it is acceptable untested, but Josh's Relight listening step is its only check.
