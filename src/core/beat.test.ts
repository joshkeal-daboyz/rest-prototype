import { describe, expect, it } from "vitest";
import { BEAT, BEAT_BPM, beatClock } from "./beat";

describe("beatClock", () => {
  it("period is 60 / bpm; a bad bpm falls back to BEAT_BPM", () => {
    expect(beatClock(60).period).toBe(1);
    expect(beatClock(120).period).toBe(0.5);
    for (const bad of [0, -5, NaN, Infinity]) expect(beatClock(bad).bpm).toBe(BEAT_BPM);
    expect(BEAT.bpm).toBe(BEAT_BPM);
    expect(BEAT_BPM).toBeGreaterThanOrEqual(60);
    expect(BEAT_BPM).toBeLessThanOrEqual(72);
  });

  it("index and phase: 0 on each beat, rising through it, in [0, 1)", () => {
    const c = beatClock(60);
    expect(c.index(0)).toBe(0);
    expect(c.phase(0)).toBe(0);
    expect(c.index(2.25)).toBe(2);
    expect(c.phase(2.25)).toBeCloseTo(0.25, 9);
    expect(c.phase(3)).toBe(0);
    expect(c.index(-0.25)).toBe(-1);
    expect(c.phase(-0.25)).toBeCloseTo(0.75, 9);
    for (let t = -3; t < 10; t += 0.137) {
      const p = c.phase(t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
      expect(c.at(c.index(t)) + p * c.period).toBeCloseTo(t, 9);
    }
  });

  it("between lists each beat in [from, to) once, in order", () => {
    const c = beatClock(120);
    expect(c.between(0, 1)).toEqual([0, 0.5]);
    expect(c.between(0.1, 1.5)).toEqual([0.5, 1]);
    expect(c.between(1, 1)).toEqual([]);
    expect(c.between(2, 1)).toEqual([]);
    expect(c.between(NaN, 1)).toEqual([]);
    // Back-to-back windows never repeat or skip a beat.
    const s = 0.0167;
    const n = 600;
    const seen: number[] = [];
    for (let i = 0; i < n; i++) seen.push(...c.between(i * s, (i + 1) * s));
    expect(seen).toEqual(c.between(0, n * s));
    expect(seen.length).toBe(21);
  });

  it("the same t gives the same answer every time (one time source, no state)", () => {
    const a = beatClock();
    const b = beatClock();
    for (const t of [0, 0.3, 12.7, 1e5 + 0.4]) {
      expect(a.phase(t)).toBe(b.phase(t));
      expect(a.index(t)).toBe(b.index(t));
    }
  });
});
