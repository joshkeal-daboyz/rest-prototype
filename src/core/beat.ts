// Pure: no DOM, no imports (ticket 032). The one beat the sound and the picture share.
// main.ts passes the same time (the frame's rAF seconds) to audio.update and renderer.draw;
// both read the beat from this clock, so the thump and the pulses cannot drift apart.

/** The game's beat, in beats per minute (ticket 032 default; Josh may change it). */
export const BEAT_BPM = 66;

export interface BeatClock {
  readonly bpm: number;
  /** Seconds per beat (60 / bpm). */
  readonly period: number;
  /** Which beat t falls in: floor(t / period). Beat 0 starts at t = 0. */
  index(t: number): number;
  /** Where t sits inside its beat, in [0, 1): 0 exactly on a beat. */
  phase(t: number): number;
  /** The time beat `i` falls on: i * period. */
  at(i: number): number;
  /** Times of the beats in [from, to), in order. Empty if to <= from or either is not finite. */
  between(from: number, to: number): number[];
}

/** A clock at `bpm`; a bpm that is not a finite number > 0 gives BEAT_BPM. */
export function beatClock(bpm: number = BEAT_BPM): BeatClock {
  const b = Number.isFinite(bpm) && bpm > 0 ? bpm : BEAT_BPM;
  const period = 60 / b;
  const index = (t: number): number => Math.floor(t / period);
  return {
    bpm: b,
    period,
    index,
    phase(t: number): number {
      const p = t / period - Math.floor(t / period);
      return p >= 1 || p < 0 ? 0 : p;
    },
    at(i: number): number {
      return i * period;
    },
    between(from: number, to: number): number[] {
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
      const out: number[] = [];
      for (let i = Math.ceil(from / period); i * period < to; i++) out.push(i * period);
      return out;
    },
  };
}

/** The shared clock at BEAT_BPM. */
export const BEAT = beatClock();
