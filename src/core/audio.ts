/** The sound's contract (ticket 019). Types only: src/audio implements SoundEngine, src/ui drives AudioControl. */
import type { EventBus } from "./events";
import type { FeedReadout } from "./state";

/** One battery as the sound reads it. GridState.batteries values have this shape. */
export interface BatteryReadout {
  charge: number;
  capacity: number;
  released: boolean;
  charging: boolean;
}

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
  /** Clamped to 0..1; NaN leaves the volume unchanged. */
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

/** Saved sound preferences (localStorage key `rest.audio`). Defaults: not muted, volume 0.5. */
export interface AudioPrefs {
  muted: boolean;
  /** 0..1 */
  volume: number;
}

export const AUDIO_PREFS_KEY = "rest.audio";
export const DEFAULT_AUDIO_PREFS: Readonly<AudioPrefs> = { muted: false, volume: 0.5 };
