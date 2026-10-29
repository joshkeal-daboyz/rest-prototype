/** The SoundEngine: gesture unlock, event subscriptions, and the glue between the pure core and the Player. */
import { DEFAULT_AUDIO_PREFS } from "../core";
import type { EventBus, EventName, Events, SoundEngine, SoundView } from "../core";
import { CueTracker, fullTickCue, relightCues } from "./cues";
import { Crackle, initialLayerState, layersFor } from "./layers";
import type { LayerState } from "./layers";
import { Mixer } from "./mixer";
import { Player } from "./shell";
import type { AudioContextLike, Cue } from "./types";

export interface EngineOptions {
  /** Makes the AudioContext, once, at the first gesture. Absent: audio is unavailable and every method does nothing. */
  createContext?: (() => AudioContextLike) | undefined;
  /** Where the first pointerdown / keydown (and visibilitychange) are heard. */
  gestureTarget?: EventTarget | undefined;
}

const GESTURES = ["pointerdown", "keydown"] as const;
const CRACKLE_HORIZON = 0.1;

const SUBSCRIBED: readonly EventName[] = [
  "switch:thrown",
  "breaker:thrown",
  "fuse:blown",
  "repair:completed",
  "grid:brownout",
  "battery:released",
  "battery:flat",
  "play:click",
];

export function createEngine(opts: EngineOptions = {}): SoundEngine {
  const warned = new Set<string>();
  const warn = (what: string, e: unknown): void => {
    if (warned.has(what)) return;
    warned.add(what);
    try {
      console.warn(`[audio] ${what}:`, e);
    } catch {
      /* no console */
    }
  };
  const guard = (what: string, fn: () => void): void => {
    try {
      fn();
    } catch (e) {
      warn(what, e);
    }
  };

  let muted = DEFAULT_AUDIO_PREFS.muted;
  let volume = DEFAULT_AUDIO_PREFS.volume;
  let ctx: AudioContextLike | null = null;
  let player: Player | null = null;
  let disabled = !opts.createContext;
  const mixer = new Mixer();
  const tracker = new CueTracker();
  const crackle = new Crackle();
  let layerState: LayerState = initialLayerState();
  let lastView: SoundView | null = null;
  const detachers = new Set<() => void>();

  const ready = (): boolean => player !== null && ctx !== null && ctx.state === "running";

  const playAll = (cues: readonly Cue[], now: number): void => {
    if (!player) return;
    for (const c of cues) guard(c.name, () => player?.play(c, now));
  };

  const run = (cues: readonly Cue[]): void => {
    if (!ready() || !ctx) return;
    const now = ctx.currentTime;
    playAll(mixer.take(cues, now).play, now);
  };

  // ---- unlock ----
  const target = opts.gestureTarget;
  const onGesture = (): void => {
    disarm();
    guard("unlock", unlock);
  };
  const arm = (): void => {
    if (disabled || !target) return;
    for (const g of GESTURES) target.addEventListener(g, onGesture, { once: true, capture: true });
  };
  const disarm = (): void => {
    if (!target) return;
    for (const g of GESTURES) target.removeEventListener(g, onGesture, { capture: true });
  };
  const resume = (): void => {
    if (!ctx) return;
    const c = ctx;
    let p: Promise<void> | undefined;
    try {
      p = c.resume();
    } catch (e) {
      warn("resume", e);
      arm();
      return;
    }
    Promise.resolve(p).then(
      () => {
        if (c.state === "suspended") arm();
      },
      (e: unknown) => {
        warn("resume", e);
        arm();
      },
    );
  };
  const unlock = (): void => {
    if (disabled) return;
    if (ctx) {
      resume();
      return;
    }
    try {
      ctx = opts.createContext?.() ?? null;
    } catch (e) {
      warn("createContext", e);
      ctx = null;
    }
    if (!ctx) {
      disabled = true;
      return;
    }
    try {
      player = new Player(ctx, muted, volume);
    } catch (e) {
      warn("graph", e);
      disabled = true;
      player = null;
      return;
    }
    resume();
    if (lastView) applyLayers(lastView);
  };
  arm();
  if (target) {
    target.addEventListener("visibilitychange", () => {
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      if (!hidden && ctx && !disabled) guard("resume", resume);
    });
  }

  // ---- layers ----
  const applyLayers = (view: SoundView): void => {
    const l = layersFor(view, layerState);
    layerState = l.next;
    if (!ready() || !ctx || !player) return;
    const now = ctx.currentTime;
    player.setLayers(l, mixer.duckAt(now));
    if (l.fullTick) run([fullTickCue()]);
    else run([]); // lets a pending spark burst out
    const times = crackle.collect(now, CRACKLE_HORIZON, l.crackleOn);
    if (times.length) player.crackle(times);
  };

  const silence = (): void => {
    mixer.reset();
    tracker.reset();
    crackle.reset();
    layerState = initialLayerState();
    guard("silence", () => player?.stopAll());
  };

  const engine: SoundEngine = {
    get muted() {
      return muted;
    },
    get volume() {
      return volume;
    },
    setMuted(m: boolean) {
      muted = !!m;
      guard("setMuted", () => player?.setMaster(muted, volume));
    },
    setVolume(v: number) {
      if (typeof v !== "number" || Number.isNaN(v)) return;
      volume = Math.min(1, Math.max(0, v));
      guard("setVolume", () => player?.setMaster(muted, volume));
    },
    attach(bus: EventBus) {
      const offs: Array<() => void> = [];
      guard("attach", () => {
        for (const name of SUBSCRIBED) {
          offs.push(
            bus.on(name, ((payload: Events[EventName]) => {
              guard(name, () => {
                const cues = tracker.cues(name, payload as never, ctx?.currentTime ?? 0);
                run(cues);
              });
            }) as never),
          );
        }
      });
      let done = false;
      const detach = (): void => {
        if (done) return;
        done = true;
        detachers.delete(detach);
        for (const off of offs) guard("detach", off);
        silence();
      };
      detachers.add(detach);
      return detach;
    },
    update(view: SoundView) {
      guard("update", () => {
        lastView = view;
        applyLayers(view);
      });
    },
    relight(igniteAt: readonly number[], durationSeconds: number) {
      guard("relight", () => run(relightCues(igniteAt, durationSeconds)));
    },
    // STUB (ticket 025 part 0): a no-op so typecheck stays green after the core interface change.
    // Part A (sound agent) replaces this with the real cue, gate and ring-out-across-detach behaviour.
    levelDone() {},
  };
  return engine;
}
