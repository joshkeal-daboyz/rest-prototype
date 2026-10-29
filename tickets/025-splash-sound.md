# 025 · Splash sound: a "level done" cue when the win splash appears

owner: lead-architect (0), sound (A)
status: approved (G1, Josh, 29 Oct 2026: "I approve", with the cut defaults for its open questions)
branch: `ticket/025-splash-sound` (0 then A, on one branch)

## Josh's words
"Splash sound: yes" (answering ticket 020's question 6: a small "level done" cue when the win splash appears).

## Goal
When the win splash appears, the player hears one short, warm "level done" cue: a soft latch knock, then a warm two-note figure that resolves. It is clearly not the Relight's chimes, and it sits in tune with the Relight's closing fifth, which is still fading when the splash arrives. It plays once per win and only when the splash is actually shown. It does not play on Replay, Reset, Esc or switching maps. It respects mute, volume and the first-gesture unlock, and it never throws.

## Decided in this cut
- **A direct engine method, not a core event.** `SoundEngine` gains `levelDone(): void`, and `src/main.ts` calls it once, on the same line that shows the splash. This follows the `relight()` precedent from 019. Why not an event:
  1. The bus carries one map's grid and play events. The splash is a UI moment with no game meaning, and nothing else would listen to it.
  2. Something would have to emit it onto the map's bus. Pressing **Next** detaches that bus at once, which races the sound.
  3. A method keeps "the splash is shown" and "the cue plays" on one line in `main.ts`, so the cue can't play without the splash.
- **Once per win, checked twice.** The first check is in `main.ts`: the existing `s.winShown` guard (020 B) runs `showWin` once per win and clears when the Relight goes (Reset or Replay). The second check is a pure gate in `src/audio/` that `levelDone()` must pass:
  - it plays only if the last `update(view)` had `view.complete === true`;
  - it plays at most once until the engine sees `complete` go false and then true again;
  - `attach` and `detach` both disarm it.
  So a stray or repeated call, a call after a Reset, or a call before any won frame makes no sound. The second check is the testable one, because `main.ts` has no tests.
- **It rings out across Next.** The cue belongs to the session, not the map, and is under 1 s long. A `detach` (Next or the picker) does not cut it short. Everything else `detach` silences is unchanged. Without this, Enter on the focused **Next level** button would chop the cue off at once.
- **When it lands:** on the splash frame, `WIN_SPLASH_DELAY` (0.4 s) after the Relight's `duration` (last ignition + 0.6 s flare). The Relight's bed tail (last + 1.5 s) and the closing fifth (220 + 330 Hz, released over 2 s from the last chime) are still fading at that point. So the cue is written in A, consonant with that fifth, and it does not duck or cut the Relight's voices.
- **The cue.** The builder sets the exact numbers within these limits (all dBFS before the master, per `.claude/agents/sound.md`). Named constants go in `recipes.ts`.
  - **Knock** at 0: a soft latch settling, like a panel door shutting. White noise, lowpass ~900 Hz, Q ~0.7, attack 2 ms, about 40 ms long, about -20 dB.
  - **Warm figure:** triangle C#4 (277.2 Hz) at about 0.06 s, then triangle A4 (440 Hz) at about 0.16 s. Each goes through a lowpass ~1.5 kHz, with attack ~15 ms, release ~600 ms, about -20 dB.
  - **Undertone:** sine A2 (110 Hz) under the second note, attack ~30 ms, release ~500 ms, about -26 dB.
  - The whole cue ends within 1.0 s of its start.
  - Hard limits:
    - no voice above -14 dB, and the simultaneous voices sum below the -8 dB cue ceiling (`CUE_CEILING_DB`);
    - every tonal voice is a note of A major (A, C#, E, in any octave);
    - it is distinct from the Relight: it has a noise transient and triangle tones, and no voice is a sine at a `CHIME_HZ` pitch;
    - it is never `Math.random`.
- **Mixer:** the cue gets its own group `"level"`. Like `"blow"` and `"relight"`, it is never dropped by the voice budget. It is `ducks: true`, so the hum and whine dip under it. Nothing ducks it.
- **Unlock, mute, volume:** the same as every cue. Before the first gesture it is dropped, not queued. Muted, it plays into a zero master, and the gate is still used, so unmuting later does not replay it. Volume scales it through the master.

## Acceptance criteria
- [ ] **0 (lead-architect), Vitest in `src/core/`.** Add `levelDone(): void` to `SoundEngine` in `src/core/audio.ts` (see Interfaces). `src/core/audio.test.ts` gets a type-level test that `SoundEngine` has `levelDone: () => void`. This is the first commit on `ticket/025-splash-sound`. It does not land on `main` alone, because `createEngine` does not implement the method yet and typecheck would fail. A follows on the same branch.
- [ ] **A (sound), Vitest in `src/audio/`.**
  - **The recipe (pure):** `levelDoneSound()` in `recipes.ts` returns `Voice[]`. Tests:
    - (a) there is a noise voice starting at 0 and at least two tonal voices starting later;
    - (b) every voice ends by 1.0 s (`at + duration <= 1.0`);
    - (c) no voice is above -14 dB, and the linear sum of all voices' peak gains is below `dbToGain(CUE_CEILING_DB)`;
    - (d) every oscillator frequency is within 1% of an A-major note (A, C#, E × 2^k);
    - (e) no voice is a `sine` at a `CHIME_HZ` frequency, and the voice list differs from every `relightChime(i)` and from `relightClose()`.
  - **The cue (pure):** `levelDoneCue()` in `cues.ts` gives `{ name: "level:done", at: 0, group: "level", ducks: true }` with those voices. Tested.
  - **The mixer:** a `"level"` cue is never dropped when the 12-voice budget is full: fill the budget with ordinary cues, take a `level:done`, and an ordinary voice is dropped instead. It sets a duck. Tested as numbers.
  - **The once-per-win gate (pure)**, e.g. a `LevelDoneGate` class with `see(complete: boolean)` and `take(): boolean`. Tests:
    - no `see` yet → `take()` false;
    - `see(false)` → false;
    - `see(true)` → `take()` true, then false on a second call and on further `see(true)` frames;
    - `see(true)`, take, `see(false)`, `see(true)` → true again (the Replay-then-win path);
    - `see(true)`, `see(false)` (Reset before the splash), take → false;
    - `reset()` (called from `attach`/`detach`) → false until a fresh `see(true)`.
  - **Engine and shell, with the fake context:**
    - after the gesture and `update(view with complete: true)`, `levelDone()` starts the cue's oscillators and noise source at about `currentTime`;
    - a second `levelDone()` on the same win starts nothing;
    - `levelDone()` with the last view `complete: false` starts nothing;
    - before the first gesture it starts nothing, and after the gesture a fresh win plays (dropped, not queued);
    - muted, the master gain stays 0 and no params are raised past it;
    - `detach()` right after `levelDone()` does not stop the cue's nodes before their scheduled end, while it still stops other cues and layers as before;
    - with no `AudioContext`, a throwing factory, or a rejecting `resume()`, `levelDone()` does not throw.
  - **The import fence test still passes:** `src/audio/` imports only `src/core/`. No new dependency, and `package.json` is unchanged.
  - **`src/main.ts` (a declared one-line edit):** `audio.levelDone();` goes right after `showWin(s, view.elapsed, state.actions);` inside the existing `if (!s.winShown && splashDue(...))` block. Nothing else in `main.ts` changes. The reviewer checks this.
  - `npm run gate` is green, and the test count grows.
  - **Josh listens** (`npm run dev`; click the map once first, because sound starts on the first gesture):
    - **`01-first-light`:** win it. The Relight rises and its chimes play. About half a second after the last flare, the splash appears **with** one soft knock and a short warm two-note figure. It is pleasant, small and quiet, it sits in tune with the Relight's fading close, and it is not mistaken for another chime.
    - **Next straight away:** win `01` and press Enter as soon as the splash shows. `02` opens and the cue finishes rather than cutting off.
    - **Replay:** win `02` and click Replay. Replay makes the usual quiet reset click and **no** level-done cue. Win again: the cue plays once more.
    - **Esc / Reset:** win, press Esc. There is no second cue. Reset during a Relight: no splash and no cue.
    - **Mute and volume:** muted, the win is silent. At a low volume the cue is quieter in proportion. Unmuting after the splash does not replay it.
    - **Taste:** it reads as "done, well done", not a fanfare. If it is too loud, too long or too sweet, say so, and the numbers change in `recipes.ts` only.

## Files
- **0 (lead-architect):** `src/core/audio.ts`, `src/core/audio.test.ts`.
- **A (sound):**
  - `src/audio/` only: `recipes.ts`, `cues.ts`, `mixer.ts`, `types.ts` (the `"level"` group), `engine.ts`, `shell.ts` if `stopAll` needs to spare the cue, and tests.
  - **Plus the one declared line in `src/main.ts`** (above). This overrides `sound.md`'s "not `src/main.ts`" for this ticket only. It is a single call next to an existing one, so a second owner is not worth a part.

Out of scope: `src/ui/` (the splash is unchanged), `src/play/`, `src/grid/`, `src/render/`, `puzzles/`, `index.html`, `package.json`, audio files.

## Order
1. **0** first, on `ticket/025-splash-sound` (a few lines).
2. **A** on the same branch after 0.

## Interfaces
`src/core/audio.ts` (part 0). This is additive: one method on `SoundEngine`.
```ts
export interface SoundEngine extends AudioControl {
  attach(bus: EventBus): () => void;
  update(view: SoundView, dtSeconds: number): void;
  relight(igniteAt: readonly number[], durationSeconds: number): void;
  /**
   * The win splash has just appeared: play the short "level done" cue. main.ts calls it once per win, beside ui.showWin.
   * Plays only if the last update() saw complete: true, at most once per win (re-armed when complete goes false);
   * not cut by detach; respects unlock, mute and volume; never throws.
   */
  levelDone(): void;
}
```
`src/audio/types.ts` (A): `Cue.group` widens to `"blow" | "relight" | "level"`.

There are no event or payload changes and **no new dependencies**: the cue uses Web Audio synthesis, as 019 does.

## GDD check
Presentation only. No rule, number, payload or puzzle changes. "The Relight can't be interrupted" is untouched: the cue comes only with the splash, which waits `WIN_SPLASH_DELAY` past the Relight's end, and it neither ducks nor stops the Relight's voices. "Win: every target lit, no brownout" still decides the win; the gate only reads `SoundView.complete`. No `rules-coverage.md` change.

## Open questions
1. **Ring out across Next, or stop with the map?** As cut, the cue finishes even if Josh presses Next at once, because the cue is the session's and is under 1 s. The alternative is that it stops like every other map sound, which is simpler but chops it off on a quick Enter.
2. **Character:** as cut, a soft latch knock plus a warm two-note figure (C#4 → A4 over A2), in A to sit under the Relight's fading fifth. Would Josh rather have something more mechanical, with no tune at all (e.g. a heavy panel clunk and a settling hum), so the Relight stays the only musical moment?
3. **Last map:** on `56-meet-in-the-middle` ("All levels done.") the cue is the same. Should the last map get a slightly fuller version, e.g. a third note? Cut as the same, to keep this small.
