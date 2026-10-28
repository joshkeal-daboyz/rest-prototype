# 019 · Sound

owner: lead-architect (0), sound (A), renderer (C), interaction (D), ui (B)
status: done
branch: one per part: `ticket/019-sound` (part 0), `ticket/019-sound-a`, `ticket/019-sound-c`, `ticket/019-sound-d`, `ticket/019-sound-b`

## Josh's words
"do we have an agent to manage sounds" → "yes tell it to run on fable"

G1: "approved". Answers to the open questions:
1. Keep the low mains hum: "Yes"
2. Refused actions, undo and reset: "They should make a click sound"
3. Default volume and mute: "add a mute button with volume slider to the gui"
4. Spark loudness grows a little with the lamp count, capped: "yes"

## Goal
The prototype makes sound. Throwing a breaker or switch clicks, a repair sounds like its part going in, a blown fuse crackles along the lines, sparks and pops in step with what the map shows, a brownout sags and flickers, a battery hums as it charges and thumps when released, the Relight rises lamp by lamp, and a refused action, an undo or a reset gives a quiet click. Sounds are short, quiet and never stack into noise. Everything is synthesised with Web Audio: no audio files, no new dependency. Sound starts at the player's first click, never throws when audio isn't available, and the player can mute it or set the volume from the HUD.

## Decided in this cut
- **Events in, state in, sound out.** `src/audio/` reads only `src/core/`: the bus events, a per-frame `SoundView` (which `GridState` satisfies structurally, so `main.ts` passes `grid.state()`), and the Relight's lamp times, handed over by `main.ts`. Things with no event (a battery filling, live sparking cables, the brownout flicker going on) come from `SoundView`; no grid change.
- **One clock for the blow.** The blown-fuse timing lives in `src/core/timing.ts` (`BLOW_TIMING`, part 0, written). The renderer's `shock.ts` takes its constants from there (part C, values unchanged) and the audio schedules from the same object (part A). No copied constants and no test in `src/audio/` that imports `src/render/`. (Main session's decision, over `.claude/agents/sound.md`'s copy-and-compare.)
- **The Relight's sound comes from `main.ts`, not from the bus.** The audio ignores `job:completed` on the bus; `main.ts`, when the Relight starts, computes `planRelight(puzzle, grid.state())` (already exported from `src/render`) and calls `audio.relight(igniteAt, duration)`. This keeps the audio free of render imports and its lamps in step with the drawn ones.
- **One audio for the whole session.** `createAudio()` runs once at startup; each map `open()` calls `attach(bus)`, and the session's `detach` calls what it returns. Switching maps silences the old map's sounds.
- **Mute and volume persist** across reloads in `localStorage` (key `AUDIO_PREFS_KEY` = `rest.audio`), read and written by the ui part, not the audio. Default `DEFAULT_AUDIO_PREFS`: not muted, volume 0.5 (Josh, Q3).
- **Refused actions, undo and reset click** (Josh, Q2). They get one new event, `play:click` `{ kind: "refused" | "undo" | "reset"; target? }`, emitted by `src/play` (part D) and played by the audio as **one quiet click, the same for all three kinds**. Why a new event: a refused throw or repair emits nothing today; the grid emits `grid:changed` with `reason: "reset"` for **both** undo and reset (the `"undo"` reason in the type is never sent) and nothing at all for an undo with no history; and `grid:changed` also fires on every action and every battery tick, so it can't be the trigger. `src/play` already knows each case (`log.add` with `repair-refused`, `ok: false`, `undo`, `reset`), so it emits next to the log. Additive: no existing payload changes.
- **The spark burst grows a little with the lamps** (Josh, Q4): **+1 dB per lamp after the first, capped at +6 dB** (1 lamp = the base level, 4 lamps = +3 dB, 7 or more = +6 dB). Still one burst; it may also get denser. The base level is the builder's within `.claude/agents/sound.md`'s ceiling (no cue above -8 dBFS before the master).
- **Blows merge over 0.7 s** (`BLOW_TIMING.popAt`; main session's decision: the longer window, so a cascade from one bad throw is one event to the ear). A second `fuse:blown` within 0.7 s of the first joins its sequence: no second run or glow; its lamps add to the one spark burst's count (gain rule above, cap unchanged) if the burst hasn't started; its own pop plays at its own pop time (its arrival + `popAt`, or + 0 with no path), and pops landing within 40 ms of each other are one pop.

## Sound per event class
Part A's pure table. Pitches and envelopes are the builder's call within these rules and `.claude/agents/sound.md`.

| Source | Sound | Notes |
| --- | --- | --- |
| `breaker:thrown` | heavy clack | `closed: true` and `false` differ (e.g. a lower clack for opening) |
| `switch:thrown` (player) | lighter click | `selected` 0/1 may differ slightly |
| `switch:thrown` with `spring: true` | spring snap-back | distinct from a player throw (sound.md: higher-to-lower blip, 6 dB quieter) |
| `repair:completed` | part fitted | one sound per `part`: bulb (glassy tick), fuse (snap-in), wire (twist/scrape) |
| `play:click` (any `kind`) | quiet click | **one** sound for `refused`, `undo` and `reset`; quieter than a player switch throw and distinct from it (e.g. a dry tick, no tonal blip) |
| `fuse:blown` | the blow sequence | see the next table |
| `grid:brownout` `brownout: true` | sag | a falling, dimming tone; only on a change from not browned out |
| `grid:brownout` `brownout: false` | recovery | a short rise; only on a change from browned out |
| `SoundView.brownout` | flicker | a quiet stuttering buzz for as long as it is true |
| `SoundView.feeds` | mains hum | a very low bed (Josh, Q1: keep it); level follows the highest feed's `load / capacity` (feeds with `capacity: null` count as 0.5); silent when nothing is powered |
| `SoundView.batteries` `charging` | charge whine | one quiet rising tone while any battery charges; pitch follows charge / capacity; one soft tick when a battery reaches full |
| `battery:released` | release thump | a thump plus a short discharge swell |
| `battery:flat` `stopped: false` | wind-down | a falling tone, the battery running out |
| `battery:flat` `stopped: true` | cut-off | a short click-off, unlike the wind-down |
| `SoundView.sparking` non-empty | live spark crackle | one quiet intermittent crackle layer however many cables spark |
| the Relight (`audio.relight`) | rising cascade | a low swell from the start, one soft chime per lamp at its ignition time, rising in pitch through the order |

## The blow sequence (must match `src/render/shock.ts`, ticket 016)
Times in seconds from the `fuse:blown` event, all from `BLOW_TIMING`:

| Phase | Render | Sound |
| --- | --- | --- |
| run | 0 → 0.4: streaks run fuse → lamps | a rising crackle/buzz over 0 → 0.4 |
| glow | 0.4 → 0.7: every path line glows | an electric swell over 0.4 → 0.7 |
| spark | from 0.5, 0.3 s: every lamp sparks | **one** spark burst at 0.5, however many lamps; +1 dB per lamp after the first, capped at +6 dB |
| pop | from 0.7, 0.6 s: the fuse pops | the pop at 0.7 |

"Has a path" is the renderer's rule: some target in `lamps` (or, when `lamps` is absent, `[{ culprit, path }]`) has a non-empty `path`. With no path, the pop plays at 0 and nothing else (as the render does).

## Acceptance criteria
- [x] **0 (lead-architect), Vitest in `src/core/`:** the Interfaces below written into `src/core/` and exported from `src/core/index.ts`. `src/core/audio.test.ts`: `BLOW_TIMING` holds run 0.4, glow 0.3, sparkAt 0.5, spark 0.3, popAt 0.7, pop 0.6, and `popAt === run + glow`; a type-level test that a value shaped like `GridState` (built inline, no import from `src/grid/`) is assignable to `SoundView`; `play:click` is an `EventName` with `kind` `"refused" | "undo" | "reset"` and goes through the bus; `DEFAULT_AUDIO_PREFS` is `{ muted: false, volume: 0.5 }` under `rest.audio`. `npm run gate` green.
- [ ] **A (sound), Vitest in `src/audio/`:** pure core and thin shell.
  - Pure sound selection: a function from each event payload to a cue (a named sound with its start offset, envelope and pitch numbers). One test per row of the "Sound per event class" table: each event class gives its own sound; a spring `switch:thrown` differs from a player one; the three repair parts give three different sounds; `battery:flat` stopped vs ran out differ; `breaker:thrown` closed vs open differ; `play:click` with `refused`, `undo` and `reset` gives the **same** cue for all three, different from a player `switch:thrown` and quieter than it.
  - Blow sequence: for a `fuse:blown` with a path, the cues start at 0 (run), 0.4 (glow), 0.5 (spark), 0.7 (pop), read from `BLOW_TIMING` imported from `src/core` (the test also compares them to the literal numbers). With no path (`culprit: null`, `path: []`, `lamps: []`): one pop cue at 0, nothing else. An old payload without `lamps` uses `[{ culprit, path }]`.
  - **Many lamps, one burst, a little louder:** a blow with 1, 4, 7 and 32 lamps each schedules exactly one spark cue; its gain is the base at 1 lamp, base + 3 dB at 4, base + 6 dB at 7 and at 32 (never above + 6 dB).
  - **Blows merge over 0.7 s:** a second `fuse:blown` 0.3 s after the first gives no second run or glow and one spark burst in all; its lamps add to the burst's count when it arrives before the burst starts; it adds its own pop at its own pop time. A second blow 0.8 s after the first starts a new sequence. Two blows in the same instant (one action blowing two fuses) give one sequence with one pop.
  - Brownout: `grid:brownout` true then true again with a different `over` (multi-feed, North clears as South goes over) plays the sag once; true → false plays the recovery once. The flicker level is > 0 exactly while `SoundView.brownout` is true.
  - Continuous layers from `SoundView` (pure, per frame): hum level from `feeds` (0 when every feed's load is 0; rises with the highest load fraction; a `capacity: null` feed handled); charge whine on while any battery has `charging: true`, its pitch rising with charge/capacity; one "full" tick on the frame a battery's charge reaches capacity, not every frame after; spark crackle on while `sparking` is non-empty, the same level for 1 or 5 sparking lines.
  - Relight: `relight([0.25, 0.25, 0.9, 2.65], 3.25)` gives a swell plus one chime per distinct ignition time; ignitions closer than a merge window (≤ 60 ms) share one chime; chime pitch rises through the order; nothing on the bus cancels the cascade (the Relight can't be interrupted); only `detach`/map change stops it.
  - Restraint: a polyphony limit (12 voices, per `sound.md`); the quietest voice that isn't part of a blow or the Relight is dropped first, tested. The same cue name within 30 ms plays once (a spring cascade in one settle, a burst of `play:click`). While a blow sequence plays, the hum and whine duck (lower gain), tested as numbers.
  - **Starts only after a user gesture:** the shell takes an injectable `AudioContext` factory and event target. No context is created until the first `pointerdown` or `keydown`; then it is created once and `resume()`d. Events before that are dropped, not queued (no burst of stale sounds on the first click). Tested with a fake context.
  - **Never throws without audio:** with no `AudioContext` on the global (Vitest's node environment), with a factory that throws, and with `resume()` rejecting, `createAudio()`, `attach`, every event, `update`, `relight`, `setMuted`, `setVolume` and the detach all run without throwing. Tested.
  - Mute and volume: `setMuted(true)` takes the master gain to 0 within 30 ms and `muted` reads true; `setVolume(v)` clamps to 0..1 (NaN → unchanged); default volume 0.5; tested on the fake context's master gain. The audio does not touch `localStorage` (the ui part does).
  - `detach()` unsubscribes from that bus (a later emit makes no cue) and stops that map's sounds and continuous layers. Tested.
  - **No files, no new deps:** nothing under `src/audio/` imports an audio file or anything outside `src/core/` (and the platform's Web Audio types); `package.json` unchanged. Checked by the reviewer and by a test that greps `src/audio/*.ts` (non-test **and** test) imports.
  - `npm run gate` green; the test count grows.
- [ ] **C (renderer), Vitest in `src/render/`:** `src/render/shock.ts` takes `SHOCK_SECONDS`, `LINE_GLOW_SECONDS`, `LAMP_SPARK_AT`, `LAMP_SPARK_SECONDS` and `POP_SECONDS` from `BLOW_TIMING` (same names still exported, same values). The existing `src/render/` tests pass without edits; one new test that `popStart(true) === BLOW_TIMING.popAt`. Nothing else in `src/render/` changes. `npm run gate` green.
- [ ] **D (interaction), Vitest in `src/play/`:** `src/play/play.ts` emits `play:click` on the map's bus:
  - `{ kind: "refused", target }` once when a click has an intent and the grid turns it down: a relay or spring switch with no power (`throwSwitch` false), a breaker refused (`throwBreaker` false), a battery that won't release (`release` false), a repair not ok (needs parts; unreadable). Tested: a relay with no power; a repair without its part; each emits exactly one `play:click` with that `target`.
  - nothing for a click with no intent (empty map, a lamp), nothing for an accepted action, nothing while the job is complete (the Relight can't be interrupted). Tested.
  - `{ kind: "undo" }` (no `target` key) on every `undo()` while the job is not complete, whether or not there was a step to undo; none during the Relight. `{ kind: "reset" }` on every `reset()`. Tested.
  - The session log is unchanged (same entries as before). Existing `src/play/` tests pass without edits; `npm run gate` green; the test count grows.
- [ ] **B (ui), Vitest in `src/ui/` plus Josh in the browser:**
  - `src/main.ts`: `createAudio()` once at startup; `attach(bus)` in `open()`, its return called from the session's `detach`; `audio.update(grid.state(), dt)` in the frame loop; on `job:completed` (or the first frame `play.view().relightT` is not null) `planRelight(entry.puzzle, grid.state())` → `audio.relight(igniteAt, duration)`, where `igniteAt` is each `lampOrder` lamp's `nodeArrive` time. No game rule in `main.ts`.
  - `src/ui/index.ts`: a sound control in the top-right `controls` row: a mute toggle button (`Sound on` / `Sound off`, `aria-pressed`) and a volume slider (`input type="range"`, 0–100), driving the `AudioControl` passed in `UIDeps` (optional field: without it, no control is drawn, so existing `src/ui/` tests pass unedited).
  - Pure helpers in `src/ui/logic.ts`, tested: the button label from `muted`; reading the saved prefs from `localStorage`'s raw string under `AUDIO_PREFS_KEY` (missing, junk JSON, out-of-range volume → `DEFAULT_AUDIO_PREFS`, never throws); writing them back.
  - Mute applies at once and is kept after a reload and after switching maps.
  - Existing `src/ui/` tests pass without edits; `npm run gate` green; the test count grows.
  - **Josh listens** (`npm run dev`, click once anywhere first, since sound starts on the first click):
    - **Breaker, switches, relay, battery:** `19-wake-the-relay`. Click `rl` before it has power (the quiet refused click), click `sw_p` (switch click), wait for the battery to fill (charge whine, then the full tick), release `bat` (thump), throw `rl` (click), close `br_E` (breaker clack), then the win (Relight cascade). Also: release and click `bat` again early (cut-off); let a battery run out on `18-battery-run` (wind-down).
    - **Undo and reset:** on any map, press Undo and Reset: the same quiet click as a refused action.
    - **The blow:** `17-why-it-blew`, repair `fb_1` at the start. One crackle runs out, the lines swell, **one** spark burst for all four lamps at the moment they spark (a little louder than a one-lamp blow), then the pop as the fuse pops. Also on `19-wake-the-relay`: close `br_E` first (a one-lamp blow).
    - **Brownout:** `55-two-feeds`, close `br_n` (sag, then the flicker while North is over), open it again (recovery). Then throw `sw_s` for the win and the Relight.
    - **Spring switches:** `11-which-fuse` (the snap-back when a spring switch loses power).
    - **Repairs and sparking:** `05-the-spark` (a live damaged cable crackles; the wire repair), `08-shrine-circuit` (bulb, fuse and wire as available; a repair without the part gives the refused click).
    - **Mute:** the button silences everything at once; reload: still muted; the slider changes the level.

## Files
- 0 (lead-architect): `src/core/timing.ts`, `src/core/audio.ts` (new), `src/core/events.ts` (the `play:click` event), `src/core/index.ts`, `src/core/audio.test.ts`.
- A (sound): `src/audio/` only (new folder: e.g. `cues.ts` pure, `mixer.ts` pure, `shell.ts` the Web Audio shell, `index.ts`, tests).
- C (renderer): `src/render/shock.ts` and one test file in `src/render/`.
- D (interaction): `src/play/play.ts` and one new test file in `src/play/` (e.g. `src/play/click.test.ts`).
- B (ui): `src/ui/` and **`src/main.ts`** (the wiring is a cross-folder need; the ui agent did the same for 015 D). Nothing in `src/audio/`.

Out of scope for every part: `src/grid/`, `puzzles/`, `package.json`, audio files of any kind. `src/play/` is out of scope for every part but D.

## Order
1. **0** first (done on `ticket/019-sound`, merges at Josh's word).
2. **A**, **C** and **D** in parallel after 0 (disjoint folders). C and D are a few lines each; A is the day's work.
3. **B** after A merges (it wires the real `createAudio` and needs its export). B may build its control against `AudioControl` alone while A is in flight, but its branch starts from `main` after A.

## Interfaces
Written by the lead-architect into `src/core/` (part 0, done).

`src/core/timing.ts`: `BLOW_TIMING` (`run` 0.4, `glow` 0.3, `sparkAt` 0.5, `spark` 0.3, `popAt` 0.7, `pop` 0.6; `as const`) and `type BlowTiming`.

`src/core/audio.ts`:
```ts
export interface BatteryReadout { charge: number; capacity: number; released: boolean; charging: boolean }
export interface SoundView {
  brownout: boolean;
  complete: boolean;
  feeds: ReadonlyMap<string, FeedReadout>;
  batteries: ReadonlyMap<string, BatteryReadout>;
  sparking: ReadonlySet<string>;
}
export interface AudioControl {
  readonly muted: boolean;
  readonly volume: number;          // 0..1
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;  // clamped 0..1, NaN -> unchanged
}
export interface SoundEngine extends AudioControl {
  attach(bus: EventBus): () => void;
  update(view: SoundView, dtSeconds: number): void;
  relight(igniteAt: readonly number[], durationSeconds: number): void;
}
export interface AudioPrefs { muted: boolean; volume: number }
export const AUDIO_PREFS_KEY = "rest.audio";
export const DEFAULT_AUDIO_PREFS: Readonly<AudioPrefs> = { muted: false, volume: 0.5 };
```
`src/audio/index.ts` (part A) exports `createAudio(opts?: { createContext?: () => AudioContext; gestureTarget?: EventTarget }): SoundEngine`.

`src/core/events.ts` (additive, new `PlayEvents` in `Events`):
```ts
export type PlayClickKind = "refused" | "undo" | "reset";
export interface PlayEvents { "play:click": { kind: PlayClickKind; target?: string } }
```
`target` only for `refused`; with `exactOptionalPropertyTypes` the key is omitted otherwise, never `undefined`.

No other payload changes: `fuse:blown` already carries `lamps` and their paths (016), `grid:brownout` carries `over` (015), `repair:completed` carries `part`, `switch:thrown` carries `spring`. **No new dependencies**: Web Audio is a browser API; Vitest runs the shell against a fake context.

## GDD check
Presentation only. No rule, number, payload meaning or puzzle file changes; `play:click` is a new event, no existing one changes. The Decided rule "The Relight can't be interrupted" gets two more tests (part A: no bus event cancels the cascade; part D: no refused or undo click during it); `tickets/rules-coverage.md` can add "019 A (sound), 019 D (interaction)" to that row when this merges.

## Open questions
None left: Josh answered all four at G1 (above).

Noticed, not in scope: `src/grid/grid.ts` `undo()` emits `grid:changed` with `reason: "reset"`, so the `"undo"` reason in the type is never sent. Harmless today (listeners re-read the state); a one-line grid ticket if anyone ever needs to tell them apart.
