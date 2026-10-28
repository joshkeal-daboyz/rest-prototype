import type { SoundEngine } from "../core";
import { createEngine } from "./engine";
import type { AudioContextLike } from "./types";

export type { SoundEngine, AudioControl, SoundView } from "../core";
export type { AudioContextLike, Cue, Voice } from "./types";

/**
 * One engine per session. Nothing is created until the first pointerdown or keydown; with no Web Audio
 * (or a factory that throws) every method still runs and does nothing.
 */
export function createAudio(opts: { createContext?: () => AudioContext; gestureTarget?: EventTarget } = {}): SoundEngine {
  let createContext = opts.createContext as (() => AudioContextLike) | undefined;
  if (!createContext && typeof window !== "undefined") {
    const w = window as unknown as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (Ctor) createContext = () => new Ctor() as unknown as AudioContextLike;
  }
  const gestureTarget = opts.gestureTarget ?? (typeof document !== "undefined" ? document : undefined);
  return createEngine({ createContext, gestureTarget });
}
