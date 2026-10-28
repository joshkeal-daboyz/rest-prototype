# 019 · Sound

owner: lead-architect (0), sound (A), renderer (C), ui (B)
status: open
branch: one per part: `ticket/019-sound-0`, `ticket/019-sound-a`, `ticket/019-sound-c`, `ticket/019-sound-b`

## Josh's words
"do we have an agent to manage sounds" → "yes tell it to run on fable"

## Goal
The prototype makes sound. Throwing a breaker or switch clicks, a repair sounds like its part going in, a blown fuse crackles along the lines, sparks and pops in step with what the map shows, a brownout sags and flickers, a battery hums as it charges and thumps when released, and the Relight rises lamp by lamp. Sounds are short, quiet and never stack into noise. Everything is synthesised with Web Audio: no audio files, no new dependency. Sound starts at the player's first click, never throws when audio isn't available, and the player can mute it or set the volume from the HUD.

## Decided in this cut
- **Events in, state in, sound out.** `src/audio/` reads only `src/core/`: the bus events, a per-frame `SoundView` (which `GridState` satisfies structurally, so `main.ts` passes `grid.state()`), and the Relight's lamp times, handed over by `main.ts`. Things with no event (a battery filling, live sparking cables, the brownout flicker going on) come from `SoundView`; no grid change.
- **One clock for the blow.** The blown-fuse timing moves into `src/core/timing.ts` (`BLOW_TIMING`, part 0). The renderer's `shock.ts` takes its constants from there (part C, values unchanged) and the audio schedules from the same numbers (part A), so the two can't drift.
- **The Relight's sound comes from `main.ts`, not from the bus.** The audio ignores `job:completed` on the bus; `main.ts`, when the Relight starts, computes `planRelight(puzzle, grid.state())` (already exported from `src/render`) and calls `audio.relight(igniteAt, duration)`. This keeps the audio free of render imports and its lamps in step with the drawn ones.
- **One audio for the whole session.** `createAudio()` runs once at startup; each map `open()` calls `attach(bus)`, and the session's `detach` calls what it returns. Switching maps silences the old map's sounds.
- **Mute and volume persist** across reloads in `localStorage` (key `rest.audio`), read and written by the ui part. Default: not muted, volume 0.5.
- **What gets no sound in this ticket:** refused actions (a refused repair, a relay that won't move in the dark) and undo/reset. They have no event; see Open questions.

## Sound per event class
Part A's pure table. Pitches and envelopes are the builder's call within these rules.

| Source | Sound | Notes |
| --- | --- | --- |
| `breaker:thrown` | heavy clack | `closed: true` and `false` differ (e.g. a lower clack for opening) |
| `switch:thrown` (player) | lighter click | `selected` 0/1 may differ slightly |
| `switch:thrown` with `spring: true` | spring snap-back | distinct from a player throw: no hand, a twang/snap |
| `repair:completed` | part fitted | one sound per `part`: bulb (glassy tick), fuse (snap-in), wire (twist/scrape) |
| `fuse:blown` | the blow sequence | see the next table |
| `grid:brownout` `brownout: true` | sag | a falling, dimming tone; only on a change from not browned out |
| `grid:brownout` `brownout: false` | recovery | a short rise; only on a change from browned out |
| `SoundView.brownout` | flicker | a quiet stuttering buzz for as long as it is true |
| `SoundView.feeds` | mains hum | a very low bed; level follows the highest feed's `load / capacity` (feeds with `capacity: null` count as 0.5); silent when nothing is powered |
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
| spark | from 0.5, 0.3 s: every lamp sparks | **one** spark burst at 0.5, however many lamps; its loudness may grow with the lamp count but is capped (e.g. 1 lamp = 0.7, 4+ lamps = 1.0) |
| pop | from 0.7, 0.6 s: the fuse pops | the pop at 0.7 |

"Has a path" is the renderer's rule: some target in `lamps` (or, when `lamps` is absent, `[{ culprit, path }]`) has a non-empty `path`. With no path, the pop plays at 0 and nothing else (as the render does).

## Acceptance criteria
- [ ] **0 (lead-architect), Vitest in `src/core/`:** the Interfaces below written into `src/core/` and exported from `src/core/index.ts`. A test in `src/core/` that `BLOW_TIMING` holds run 0.4, glow 0.3, sparkAt 0.5, spark 0.3, popAt 0.7, pop 0.6, and `popAt === run + glow`. A type-level test that a value shaped like `GridState` (built inline, no import from `src/grid/`) is assignable to `SoundView`. `npm run gate` green.
- [ ] **A (sound), Vitest in `src/audio/`:** pure core and thin shell.
  - Pure sound selection: a function from each event payload to a cue (a named sound with its start offset, envelope and pitch numbers). One test per row of the "Sound per event class" table: each event class gives its own sound; a spring `switch:thrown` differs from a player one; the three repair parts give three different sounds; `battery:flat` stopped vs ran out differ; `breaker:thrown` closed vs open differ.
  - Blow sequence: for a `fuse:blown` with a path, the cues start at 0 (run), 0.4 (glow), 0.5 (spark), 0.7 (pop), read from `BLOW_TIMING` (the test also compares them to the literal numbers). With no path (`culprit: null`, `path: []`, `lamps: []`): one pop cue at 0, nothing else. An old payload without `lamps` uses `[{ culprit, path }]`.
  - **Many lamps, one burst:** a blow with 1, 4 and 32 lamps each schedules exactly one spark cue; its gain rises with the count and never exceeds the cap.
  - Brownout: `grid:brownout` true then true again with a different `over` (multi-feed, North clears as South goes over) plays the sag once; true → false plays the recovery once. The flicker level is > 0 exactly while `SoundView.brownout` is true.
  - Continuous layers from `SoundView` (pure, per frame): hum level from `feeds` (0 when every feed's load is 0; rises with the highest load fraction; a `capacity: null` feed handled); charge whine on while any battery has `charging: true`, its pitch rising with charge/capacity; one "full" tick on the frame a battery's charge reaches capacity, not every frame after; spark crackle on while `sparking` is non-empty, the same level for 1 or 5 sparking lines.
  - Relight: `relight([0.25, 0.25, 0.9, 2.65], 3.25)` gives a swell plus one chime per distinct ignition time; ignitions closer than a merge window (≤ 60 ms) share one chime; chime pitch rises through the order; nothing on the bus cancels the cascade (the Relight can't be interrupted); only `detach`/map change stops it.
  - Restraint: a polyphony limit (e.g. at most 6 voices); the oldest or quietest is dropped first, tested. Two `fuse:blown` within 50 ms (one action blowing two fuses) give one sequence, not two. A burst of `switch:thrown` (a spring cascade in one settle) gives at most one click per 40 ms. While a blow sequence plays, the hum and whine duck (lower gain), tested as numbers.
  - **Starts only after a user gesture:** the shell takes an injectable `AudioContext` factory and event target. No context is created until the first `pointerdown` or `keydown`; then it is created once and `resume()`d. Events before that are dropped, not queued (no burst of stale sounds on the first click). Tested with a fake context.
  - **Never throws without audio:** with no `AudioContext` on the global (Vitest's node environment), with a factory that throws, and with `resume()` rejecting, `createAudio()`, `attach`, every event, `update`, `relight`, `setMuted`, `setVolume` and the detach all run without throwing. Tested.
  - Mute and volume: `setMuted(true)` takes the master gain to 0 within 30 ms and `muted` reads true; `setVolume(v)` clamps to 0..1 (NaN → unchanged); tested on the fake context's master gain.
  - `detach()` unsubscribes from that bus (a later emit makes no cue) and stops that map's sounds and continuous layers. Tested.
  - **No files, no new deps:** nothing under `src/audio/` imports an audio file or anything outside `src/core/` (and the platform's Web Audio types); `package.json` unchanged. Checked by the reviewer and by a test that greps `src/audio/*.ts` (non-test) imports.
  - `npm run gate` green; the test count grows.
- [ ] **C (renderer), Vitest in `src/render/`:** `src/render/shock.ts` takes `SHOCK_SECONDS`, `LINE_GLOW_SECONDS`, `LAMP_SPARK_AT`, `LAMP_SPARK_SECONDS` and `POP_SECONDS` from `BLOW_TIMING` (same names still exported, same values). The existing `src/render/` tests pass without edits; one new test that `popStart(true) === BLOW_TIMING.popAt`. Nothing else in `src/render/` changes. `npm run gate` green.
- [ ] **B (ui), Vitest in `src/ui/` plus Josh in the browser:**
  - `src/main.ts`: `createAudio()` once at startup; `attach(bus)` in `open()`, its return called from the session's `detach`; `audio.update(grid.state(), dt)` in the frame loop; on `job:completed` (or the first frame `play.view().relightT` is not null) `planRelight(entry.puzzle, grid.state())` → `audio.relight(igniteAt, duration)`, where `igniteAt` is each `lampOrder` lamp's `nodeArrive` time. No game rule in `main.ts`.
  - `src/ui/index.ts`: a sound control in the top-right `controls` row: a mute toggle button (`Sound on` / `Sound off`, `aria-pressed`) and a volume slider (`input type="range"`, 0–100), driving the `AudioControl` passed in `UIDeps` (optional field: without it, no control is drawn, so existing `src/ui/` tests pass unedited).
  - Pure helpers in `src/ui/logic.ts`, tested: the button label from `muted`; reading the saved prefs from `localStorage`'s raw string (missing, junk JSON, out-of-range volume → the defaults, never throws); writing them back.
  - Mute applies at once and is kept after a reload and after switching maps.
  - Existing `src/ui/` tests pass without edits; `npm run gate` green; the test count grows.
  - **Josh listens** (`npm run dev`, click once anywhere first, since sound starts on the first click):
    - **Breaker, switches, relay, battery:** `19-wake-the-relay`. Click `sw_p` (switch click), wait for the battery to fill (charge whine, then the full tick), release `bat` (thump), throw `rl` (click), close `br_E` (breaker clack), then the win (Relight cascade). Also: release and click `bat` again early (cut-off); let a battery run out on `18-battery-run` (wind-down).
    - **The blow:** `17-why-it-blew`, repair `fb_1` at the start. One crackle runs out, the lines swell, **one** spark burst for all four lamps at the moment they spark, then the pop as the fuse pops. Also on `19-wake-the-relay`: close `br_E` first (a one-lamp blow).
    - **Brownout:** `55-two-feeds`, close `br_n` (sag, then the flicker while North is over), open it again (recovery). Then throw `sw_s` for the win and the Relight.
    - **Spring switches:** `11-which-fuse` (the snap-back when a spring switch loses power).
    - **Repairs and sparking:** `05-the-spark` (a live damaged cable crackles; the wire repair), `08-shrine-circuit` (bulb, fuse and wire as available).
    - **Mute:** the button silences everything at once; reload: still muted; the slider changes the level.

## Files
- 0 (lead-architect): `src/core/timing.ts`, `src/core/audio.ts` (new), `src/core/index.ts`, a test in `src/core/`.
- A (sound): `src/audio/` only (new folder: e.g. `cues.ts` pure, `voices.ts` pure, `engine.ts` the Web Audio shell, `index.ts`, tests).
- C (renderer): `src/render/shock.ts` and one test file in `src/render/`.
- B (ui): `src/ui/` and **`src/main.ts`** (the wiring is a cross-folder need; the ui agent did the same for 015 D). Nothing in `src/audio/`.

Out of scope for every part: `src/grid/`, `src/play/`, `puzzles/`, `package.json`, audio files of any kind.

## Order
1. **0** first, on `main` at G1.
2. **A** and **C** in parallel after 0 (disjoint folders). C is a few lines; A is the day's work.
3. **B** after A merges (it wires the real `createAudio` and needs its export). B may build its control against `AudioControl` alone while A is in flight, but its branch starts from `main` after A.

## Interfaces
Written by the lead-architect into `src/core/` at G1 (part 0), before A, B or C starts.

`src/core/timing.ts`:
```ts
/** The blown-fuse sequence, seconds from the blow (ticket 016). Shared by src/render/shock.ts and src/audio. */
export const BLOW_TIMING = {
  run: 0.4,     // streaks run fuse -> lamps
  glow: 0.3,    // every path line glows, from `run`
  sparkAt: 0.5, // every lamp sparks
  spark: 0.3,
  popAt: 0.7,   // the fuse pops (= run + glow)
  pop: 0.6,
} as const;
```

`src/core/audio.ts`:
```ts
import type { EventBus } from "./events";
import type { FeedReadout } from "./state";

/** One battery as the sound reads it. GridState.batteries values have this shape. */
export interface BatteryReadout { charge: number; capacity: number; released: boolean; charging: boolean }

/** What the audio reads each frame. src/grid's GridState satisfies it structurally: main.ts passes grid.state(). */
export interface SoundView {
  brownout: boolean;
  complete: boolean;
  feeds: ReadonlyMap<string, FeedReadout>;
  batteries: ReadonlyMap<string, BatteryReadout>;
  /** Line ids with a readable damaged cable (live sparking). */
  sparking: ReadonlySet<string>;
}

/** The hook the UI drives. */
export interface AudioControl {
  readonly muted: boolean;
  /** 0..1 */
  readonly volume: number;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
}

/** The audio module's surface (src/audio's createAudio() returns one). Every method is safe without audio. */
export interface SoundEngine extends AudioControl {
  /** Listen to one map's bus. Returns detach: unsubscribes and silences that map's sounds. */
  attach(bus: EventBus): () => void;
  /** Each frame: the state behind the continuous sounds (hum, flicker, charge whine, spark crackle). */
  update(view: SoundView, dtSeconds: number): void;
  /** The Relight: seconds from its start at which each lamp ignites (in order), and its total length. */
  relight(igniteAt: readonly number[], durationSeconds: number): void;
}
```
`src/audio/index.ts` (part A) exports `createAudio(opts?: { createContext?: () => AudioContext; gestureTarget?: EventTarget }): SoundEngine`.

No event payload changes: `fuse:blown` already carries `lamps` and their paths (016), `grid:brownout` carries `over` (015), `repair:completed` carries `part`, `switch:thrown` carries `spring`. **No new dependencies**: Web Audio is a browser API; Vitest runs the shell against a fake context.

## GDD check
Presentation only. No rule, number, payload meaning or puzzle file changes. The Decided rule "The Relight can't be interrupted" gets one more test (part A: no bus event cancels the cascade); `tickets/rules-coverage.md` can add "019 A (sound)" to that row when this merges.

## Open questions
1. **A continuous mains hum** under everything: in, as a very low bed. Josh to say if he'd rather have silence between actions (then the hum row is dropped; the brownout flicker and charge whine stay).
2. **Refused actions** (a repair without the part, a relay that won't move in the dark) and **undo/reset** get no sound here: they have no bus event, and adding one is a grid or play change. Worth a follow-up ticket if Josh wants a "no" thud?
3. **Default volume** 0.5 and **mute remembered** across reloads: OK?
4. The blow's spark loudness grows a little with the lamp count (capped), so four lamps sound a bit bigger than one while staying one burst. Or exactly the same for any count?
