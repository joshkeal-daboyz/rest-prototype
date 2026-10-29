/** Pure: voice budget, rate limit, blow merging, ducking. Time is a number passed in; no clock is read. */
import { BLOW_TIMING } from "../core";
import { sparkCue } from "./cues";
import type { Cue, Voice } from "./types";

export const VOICE_BUDGET = 12;
export const RATE_LIMIT = 0.03;
export const POP_MERGE = 0.04;
export const DUCK_DB = -12;
export const DUCK_ATTACK = 0.02;
export const DUCK_RELEASE = 0.4;
/** A pending spark burst is handed out this long before it is due, so the next frame cannot be late. */
export const BURST_LOOKAHEAD = 0.02;
const BURST_STALE = 0.3;

export interface TakeResult {
  play: Cue[];
  /** Names of cues dropped (rate limit or budget). Merged blow cues are not listed. */
  dropped: string[];
  /** dB the hum and charge whine are ducked by at `now` (0 or DUCK_DB). */
  duck: number;
}

interface Slot {
  start: number;
  end: number;
}

const cueEnd = (c: Cue): number => c.voices.reduce((m, v) => Math.max(m, c.at + v.at + v.duration), c.at);

export class Mixer {
  private last = new Map<string, number>();
  private slots: Slot[] = [];
  private seq: { start: number; released: boolean } | null = null;
  private burst: { due: number; lamps: number } | null = null;
  private pops: number[] = [];
  private relightUntil = -Infinity;
  private ducks: Array<{ from: number; until: number }> = [];

  take(cues: readonly Cue[], now: number): TakeResult {
    this.prune(now);
    const dropped: string[] = [];
    const accepted: Cue[] = [];
    const protectedCues: Cue[] = [];
    const relightBlocked = this.relightUntil > now;
    let curNew = false;

    for (const c of cues) {
      if (c.group === "blow") {
        const keep = this.blowStep(c, now, curNew);
        curNew = keep.curNew;
        if (keep.play) protectedCues.push(c);
        continue;
      }
      if (c.group === "relight") {
        if (relightBlocked) continue;
        protectedCues.push(c);
        this.relightUntil = Math.max(this.relightUntil, now + cueEnd(c));
        continue;
      }
      if (c.group === "level") {
        protectedCues.push(c);
        continue;
      }
      const prev = this.last.get(c.name);
      if (prev !== undefined && now - prev < RATE_LIMIT) {
        dropped.push(c.name);
        continue;
      }
      this.last.set(c.name, now);
      accepted.push(c);
    }

    // Release a pending spark burst that is due.
    const b = this.burst;
    if (b && now >= b.due - BURST_LOOKAHEAD) {
      this.burst = null;
      if (this.seq) this.seq.released = true;
      if (now - b.due <= BURST_STALE) {
        const sc = sparkCue(b.lamps);
        sc.at = Math.max(0, b.due - now);
        protectedCues.push(sc);
      }
    }

    // Budget: protected voices always count; the others fill what is left, loudest first.
    for (const c of protectedCues) this.tally(c, now);
    const candidates: Array<{ v: Voice; c: Cue }> = [];
    for (const c of accepted) for (const v of c.voices) candidates.push({ v, c });
    candidates.sort((x, y) => y.v.gainDb - x.v.gainDb);
    const keep = new Set<Voice>();
    for (const { v, c } of candidates) {
      const start = now + c.at + v.at;
      if (this.concurrent(start) < VOICE_BUDGET) {
        keep.add(v);
        this.slots.push({ start, end: start + v.duration });
      }
    }
    const play: Cue[] = [];
    for (const c of cues) {
      if (protectedCues.includes(c)) play.push(c);
      else if (accepted.includes(c)) {
        const voices = c.voices.filter((v) => keep.has(v));
        if (voices.length === 0 && !c.hold && !c.stop) {
          dropped.push(c.name);
          continue;
        }
        play.push(voices.length === c.voices.length ? c : { ...c, voices });
      }
    }
    // The released burst is not in `cues`; append it in time order.
    for (const c of protectedCues) if (!cues.includes(c)) play.push(c);

    for (const c of play) {
      if (c.ducks) this.ducks.push({ from: now + c.at, until: now + cueEnd(c) });
    }
    return { play, dropped, duck: this.duckAt(now) };
  }

  /** dB of duck wanted at absolute time t (the shell ramps: 20 ms attack, 400 ms release). */
  duckAt(t: number): number {
    return this.ducks.some((d) => t >= d.from && t <= d.until) ? DUCK_DB : 0;
  }

  /** Forget everything (a map detached). */
  reset(): void {
    this.last.clear();
    this.slots = [];
    this.seq = null;
    this.burst = null;
    this.pops = [];
    this.relightUntil = -Infinity;
    this.ducks = [];
  }

  /** Decide a blow cue. Returns whether it plays, and whether this blow began a new sequence. */
  private blowStep(c: Cue, now: number, curNew: boolean): { play: boolean; curNew: boolean } {
    switch (c.part) {
      case "run": {
        if (this.seq && now < this.seq.start + BLOW_TIMING.popAt) return { play: false, curNew: false };
        this.seq = { start: now, released: false };
        return { play: true, curNew: true };
      }
      case "glow":
        return { play: curNew, curNew };
      case "spark": {
        if (curNew) {
          this.burst = { due: now + c.at, lamps: c.lamps ?? 1 };
        } else if (this.burst && this.seq && !this.seq.released) {
          this.burst.lamps += c.lamps ?? 1;
        }
        return { play: false, curNew };
      }
      case "pop": {
        const t = now + c.at;
        if (this.pops.some((p) => Math.abs(p - t) < POP_MERGE)) return { play: false, curNew };
        this.pops.push(t);
        return { play: true, curNew };
      }
      default:
        return { play: true, curNew };
    }
  }

  private tally(c: Cue, now: number): void {
    for (const v of c.voices) {
      const start = now + c.at + v.at;
      this.slots.push({ start, end: start + v.duration });
    }
  }

  private concurrent(t: number): number {
    let n = 0;
    for (const s of this.slots) if (s.start <= t && t < s.end) n++;
    return n;
  }

  private prune(now: number): void {
    this.slots = this.slots.filter((s) => s.end > now);
    this.pops = this.pops.filter((p) => p > now - 1);
    this.ducks = this.ducks.filter((d) => d.until > now - 1);
    if (this.seq && now >= this.seq.start + BLOW_TIMING.popAt && !this.burst) this.seq = null;
  }
}
