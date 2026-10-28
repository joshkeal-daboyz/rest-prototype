/** Pure: which sound for which event. No clock, no nodes. */
import { BLOW_TIMING } from "../core";
import type { BlownLamp, EventName, Events } from "../core";
import * as R from "./recipes";
import type { Cue } from "./types";

export function sparkCue(lamps: number): Cue {
  return { name: "blow:spark", at: BLOW_TIMING.sparkAt, voices: R.sparkBurst(lamps), group: "blow", part: "spark", lamps };
}

/** The renderer's rule: some target in `lamps` (or `[{ culprit, path }]` for an old payload) has a non-empty path. */
export function blowCues(p: Events["fuse:blown"]): Cue[] {
  const targets: readonly { path: readonly string[] }[] =
    p.lamps ?? [{ id: p.culprit, path: p.path } as unknown as BlownLamp];
  const hasPath = targets.some((t) => t.path.length > 0);
  if (!hasPath) {
    return [{ name: "blow:pop", at: 0, voices: R.popSound(), ducks: true, group: "blow", part: "pop" }];
  }
  return [
    { name: "blow:run", at: 0, voices: R.runSound(), group: "blow", part: "run" },
    { name: "blow:glow", at: BLOW_TIMING.run, voices: R.glowSound(), group: "blow", part: "glow" },
    sparkCue(Math.max(1, targets.length)),
    { name: "blow:pop", at: BLOW_TIMING.popAt, voices: R.popSound(), ducks: true, group: "blow", part: "pop" },
  ];
}

/** Chimes: ignitions within CHIME_MERGE of a chime's first ignition share it. Sorted ascending. */
export function chimeTimes(igniteAt: readonly number[]): number[] {
  const sorted = igniteAt.filter((t) => Number.isFinite(t) && t >= 0).sort((a, b) => a - b);
  const out: number[] = [];
  for (const t of sorted) {
    const last = out[out.length - 1];
    if (last === undefined || t - last > R.CHIME_MERGE + 1e-9) out.push(t);
  }
  return out;
}

export function relightCues(igniteAt: readonly number[], durationSeconds: number): Cue[] {
  const chimes = chimeTimes(igniteAt);
  const dur = Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0;
  const last = chimes[chimes.length - 1] ?? dur;
  const cues: Cue[] = [{ name: "relight:bed", at: 0, voices: R.relightBed(last, dur), ducks: true, group: "relight" }];
  chimes.forEach((t, i) =>
    cues.push({ name: `relight:chime:${i}`, at: t, voices: R.relightChime(i), ducks: true, group: "relight" }),
  );
  if (chimes.length > 0) cues.push({ name: "relight:close", at: last, voices: R.relightClose(), ducks: true, group: "relight" });
  return cues;
}

export function batteryWhineKey(nodeId: string): string {
  return `battery:${nodeId}`;
}

/** Events whose sound needs no memory. Brownout needs the previous state: use CueTracker. */
export function cuesFor<K extends EventName>(name: K, payload: Events[K], _now = 0): Cue[] {
  void _now;
  switch (name) {
    case "breaker:thrown": {
      const p = payload as Events["breaker:thrown"];
      return [{ name: "breaker:thrown", at: 0, voices: R.breakerThrow(p.closed) }];
    }
    case "switch:thrown": {
      const p = payload as Events["switch:thrown"];
      const spring = p.spring === true;
      return [{ name: spring ? "switch:spring" : "switch:thrown", at: 0, voices: R.switchThrow(spring) }];
    }
    case "repair:completed": {
      const p = payload as Events["repair:completed"];
      const part = p.part;
      if (part !== "bulb" && part !== "fuse" && part !== "wire") return [];
      return [{ name: `repair:${part}`, at: 0, voices: R.repairSound(part) }];
    }
    case "battery:released": {
      const p = payload as Events["battery:released"];
      return [
        { name: "battery:released", at: 0, voices: R.batteryRelease() },
        { name: `battery:whine:${p.nodeId}`, at: 0.25, voices: [], hold: { key: batteryWhineKey(p.nodeId), voice: R.batteryWhine() } },
      ];
    }
    case "battery:flat": {
      const p = payload as Events["battery:flat"];
      const key = batteryWhineKey(p.nodeId);
      if (p.stopped) {
        return [{ name: "battery:flat:stopped", at: 0, voices: R.batteryCutOff(), stop: { key, fade: R.BATTERY_STOP_FADE } }];
      }
      return [
        { name: "battery:flat:ranout", at: 0, voices: [], stop: { key, fade: R.BATTERY_RUNOUT_FADE, freqTo: R.BATTERY_RUNOUT_HZ } },
      ];
    }
    case "play:click":
      return [{ name: "play:click", at: 0, voices: R.playClick() }];
    case "fuse:blown":
      return blowCues(payload as Events["fuse:blown"]);
    default:
      return [];
  }
}

export function sagCue(): Cue {
  return { name: "grid:sag", at: 0, voices: R.brownoutSag() };
}
export function recoveryCue(): Cue {
  return { name: "grid:recover", at: 0, voices: R.brownoutRecovery() };
}
export function fullTickCue(): Cue {
  return { name: "battery:full", at: 0, voices: R.fullTick() };
}
export function crackleCue(): Cue {
  return { name: "crackle", at: 0, voices: R.crackleTick() };
}

/** cuesFor plus the one event that needs memory: the sag and recovery play only when `brownout` changes. */
export class CueTracker {
  private brownout = false;

  cues<K extends EventName>(name: K, payload: Events[K], now = 0): Cue[] {
    if (name === "grid:brownout") {
      const next = (payload as Events["grid:brownout"]).brownout;
      const was = this.brownout;
      this.brownout = next;
      if (next === was) return [];
      return [next ? sagCue() : recoveryCue()];
    }
    return cuesFor(name, payload, now);
  }

  reset(): void {
    this.brownout = false;
  }
}
