import { describe, expect, it } from "vitest";
import {
  CULPRIT_FLARE_SECONDS,
  LAMP_SPARK_AT,
  LAMP_SPARK_SECONDS,
  LINE_GLOW_SECONDS,
  MAX_GLOW_LINES,
  PHASE_GLOW,
  PHASE_POP,
  PHASE_SHOCK,
  SPARK_RAYS,
  collectGlowLines,
  fuseIntact,
  lampSpark,
  lineGlow,
  popStart,
  sequencePhase,
  sparkRay,
  streakFade,
  LAMP_DROPPED,
  LAMP_FLARE_ONLY,
  LAMP_STREAK_AND_FLARE,
  lampTreatment,
  MAX_BLOW_LAMPS,
  MAX_FLARE_LAMPS,
  POP_SECONDS,
  SHOCK_SECONDS,
  arrivalTime,
  blowTargets,
  headDistance,
  lampFlare,
  popFraction,
  sequenceTotal,
  streakLength,
} from "./shock";

describe("arrivalTime", () => {
  it("the longest path arrives at SHOCK_SECONDS, shorter ones proportionally earlier", () => {
    expect(arrivalTime(200, 200)).toBeCloseTo(SHOCK_SECONDS);
    expect(arrivalTime(100, 200)).toBeCloseTo(SHOCK_SECONDS / 2);
    expect(arrivalTime(50, 200)).toBeLessThan(arrivalTime(100, 200));
  });
  it("a zero-length path arrives at 0, even with no longest path", () => {
    expect(arrivalTime(0, 200)).toBe(0);
    expect(arrivalTime(0, 0)).toBe(0);
  });
});

describe("shared streak speed", () => {
  it("head reaches the longest path exactly at SHOCK_SECONDS and each path at its arrival time", () => {
    expect(headDistance(0, 300)).toBe(0);
    expect(headDistance(SHOCK_SECONDS, 300)).toBeCloseTo(300);
    expect(headDistance(SHOCK_SECONDS * 5, 300)).toBeCloseTo(300);
    const short = 120;
    expect(headDistance(arrivalTime(short, 300), 300)).toBeCloseTo(short);
  });
  it("streak length scales with the longest path", () => {
    expect(streakLength(100)).toBeGreaterThan(0);
    expect(streakLength(200)).toBeCloseTo(streakLength(100) * 2);
  });
});

describe("lampFlare", () => {
  it("is 0 before it starts, 1 at the start, fades to 0 over CULPRIT_FLARE_SECONDS", () => {
    expect(lampFlare(0.1, 0.2)).toBe(0);
    expect(lampFlare(0.2, 0.2)).toBe(1);
    expect(lampFlare(0.2 + CULPRIT_FLARE_SECONDS / 2, 0.2)).toBeCloseTo(0.5);
    expect(lampFlare(0.2 + CULPRIT_FLARE_SECONDS + 0.01, 0.2)).toBe(0);
  });
  it("a flare started at LAMP_SPARK_AT is over before the sequence ends", () => {
    expect(LAMP_SPARK_AT + CULPRIT_FLARE_SECONDS).toBeLessThanOrEqual(sequenceTotal(true));
  });
});

describe("B amendment sequence: run, glow, spark, pop", () => {
  it("lineGlow boundaries", () => {
    expect(lineGlow(0)).toBe(0);
    expect(lineGlow(0.4)).toBe(0);
    expect(lineGlow(0.43)).toBeCloseTo(0.5);
    expect(lineGlow(0.46)).toBeCloseTo(1);
    expect(lineGlow(0.5)).toBe(1);
    expect(lineGlow(0.6)).toBeCloseTo(1);
    expect(lineGlow(0.65)).toBeCloseTo(0.5);
    expect(lineGlow(0.7)).toBe(0);
    expect(lineGlow(1.3)).toBe(0);
  });
  it("streaks fade out as the glow rises", () => {
    expect(streakFade(0.39)).toBe(1);
    expect(streakFade(0.4)).toBe(1);
    expect(streakFade(0.43)).toBeCloseTo(0.5);
    expect(streakFade(0.46)).toBe(0);
    expect(streakFade(0.6)).toBe(0);
  });
  it("lampSpark boundaries", () => {
    expect(lampSpark(0)).toBe(0);
    expect(lampSpark(0.46)).toBe(0);
    expect(lampSpark(0.5)).toBe(1);
    expect(lampSpark(0.65)).toBeCloseTo(0.5);
    expect(lampSpark(0.8)).toBe(0);
    expect(lampSpark(1.3)).toBe(0);
  });
  it("order: glow starts, then spark, then pop", () => {
    expect(LINE_GLOW_SECONDS).toBeCloseTo(0.3);
    expect(LAMP_SPARK_AT).toBeGreaterThan(SHOCK_SECONDS);
    expect(LAMP_SPARK_AT).toBeLessThan(popStart(true));
    expect(popStart(true)).toBeCloseTo(0.7);
    expect(popStart(false)).toBe(0);
    expect(LAMP_SPARK_AT + LAMP_SPARK_SECONDS).toBeCloseTo(0.8);
  });
  it("the pop starts at 0.7 s and the total is 1.3 s with a path", () => {
    expect(popFraction(0.69, true)).toBe(-1);
    expect(popFraction(0.7, true)).toBe(0);
    expect(sequenceTotal(true)).toBeCloseTo(1.3);
    expect(sequenceTotal(false)).toBeCloseTo(POP_SECONDS);
    expect(sequencePhase(0.39, true)).toBe(PHASE_SHOCK);
    expect(sequencePhase(0.4, true)).toBe(PHASE_GLOW);
    expect(sequencePhase(0.7, true)).toBe(PHASE_POP);
    expect(sequencePhase(0.5, false)).toBe(PHASE_POP);
    expect(fuseIntact(0.69, true)).toBe(true);
    expect(fuseIntact(0.7, true)).toBe(false);
  });
});

describe("sparkRay", () => {
  const a = new Float64Array(4);
  const b = new Float64Array(4);
  it("is false outside the spark window", () => {
    expect(sparkRay(0, 0, 0.49, a)).toBe(false);
    expect(sparkRay(0, 0, 0.8, a)).toBe(false);
    expect(sparkRay(0, 0, 0.5, a)).toBe(true);
  });
  it("is deterministic and differs between rays and lamps", () => {
    sparkRay(2, 3, 0.6, a);
    sparkRay(2, 3, 0.6, b);
    expect(Array.from(a)).toEqual(Array.from(b));
    sparkRay(2, 4, 0.6, b);
    expect(Array.from(a)).not.toEqual(Array.from(b));
    sparkRay(3, 3, 0.6, b);
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
  it("rays move outward over time, head beyond tail", () => {
    for (let r = 0; r < SPARK_RAYS; r++) {
      sparkRay(1, r, 0.52, a);
      sparkRay(1, r, 0.75, b);
      expect(Math.hypot(b[2]!, b[3]!)).toBeGreaterThan(Math.hypot(a[2]!, a[3]!));
      expect(Math.hypot(b[2]!, b[3]!)).toBeGreaterThanOrEqual(Math.hypot(b[0]!, b[1]!));
    }
  });
  it("covers up to MAX_FLARE_LAMPS lamps without NaN", () => {
    for (let l = 0; l < MAX_FLARE_LAMPS; l++) {
      for (let r = 0; r < SPARK_RAYS; r++) {
        expect(sparkRay(l, r, 0.6, a)).toBe(true);
        expect(a.every((v) => Number.isFinite(v))).toBe(true);
      }
    }
  });
});

describe("collectGlowLines", () => {
  const stride = 4;
  // lamp 0: lines 5,6 ; lamp 1: 5,7 ; lamp 2: 5,6,8
  const lines = Int32Array.from([5, 6, 0, 0, 5, 7, 0, 0, 5, 6, 8, 0]);
  const ns = Int32Array.from([2, 2, 3]);
  it("lists each shared line once, in path order", () => {
    const out = new Int32Array(MAX_GLOW_LINES);
    const n = collectGlowLines(lines, ns, 0, 3, stride, out, MAX_GLOW_LINES);
    expect(Array.from(out.subarray(0, n))).toEqual([5, 6, 7, 8]);
  });
  it("includes lines of lamps past MAX_BLOW_LAMPS", () => {
    const count = MAX_BLOW_LAMPS + 2;
    const ls = new Int32Array(count * stride);
    const nn = new Int32Array(count).fill(1);
    for (let k = 0; k < count; k++) ls[k * stride] = 100 + k;
    const out = new Int32Array(MAX_GLOW_LINES);
    const n = collectGlowLines(ls, nn, 0, count, stride, out, MAX_GLOW_LINES);
    expect(n).toBe(count);
    expect(out[count - 1]).toBe(100 + count - 1);
  });
  it("caps at MAX_GLOW_LINES (64) and drops extras", () => {
    expect(MAX_GLOW_LINES).toBe(64);
    const count = 10;
    const st = 12;
    const ls = new Int32Array(count * st);
    const nn = new Int32Array(count).fill(st);
    for (let i = 0; i < count * st; i++) ls[i] = i;
    const out = new Int32Array(MAX_GLOW_LINES);
    const n = collectGlowLines(ls, nn, 0, count, st, out, MAX_GLOW_LINES);
    expect(n).toBe(64);
    expect(out[63]).toBe(63);
  });
});

describe("blowTargets", () => {
  it("uses lamps when the payload carries them", () => {
    const lamps = [
      { id: "a", path: ["l1"] },
      { id: "b", path: ["l1", "l2"] },
    ];
    expect(blowTargets({ culprit: "a", path: ["l1"], lamps })).toBe(lamps);
  });
  it("falls back to the single culprit for an old payload", () => {
    expect(blowTargets({ culprit: "a", path: ["l1", "l2"] })).toEqual([{ id: "a", path: ["l1", "l2"] }]);
    expect(blowTargets({ culprit: null, path: [] })).toEqual([{ id: null, path: [] }]);
  });
  it("an empty lamps list means no targets", () => {
    expect(blowTargets({ culprit: null, path: [], lamps: [] })).toEqual([]);
  });
});

describe("lampTreatment caps", () => {
  it("the first 8 lamps get a streak and a flare", () => {
    expect(MAX_BLOW_LAMPS).toBe(8);
    for (let i = 0; i < 8; i++) expect(lampTreatment(i)).toBe(LAMP_STREAK_AND_FLARE);
  });
  it("the 9th lamp onward flares without a streak", () => {
    expect(lampTreatment(8)).toBe(LAMP_FLARE_ONLY);
    expect(lampTreatment(20)).toBe(LAMP_FLARE_ONLY);
    expect(lampTreatment(MAX_FLARE_LAMPS - 1)).toBe(LAMP_FLARE_ONLY);
  });
  it("past the 32 cap lamps are dropped", () => {
    expect(MAX_FLARE_LAMPS).toBe(32);
    expect(lampTreatment(32)).toBe(LAMP_DROPPED);
    expect(lampTreatment(100)).toBe(LAMP_DROPPED);
  });
  it("12 lamps: 8 streak, 4 flare-only, none dropped", () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 12; i++) counts[lampTreatment(i)]!++;
    expect(counts).toEqual([8, 4, 0]);
  });
});
