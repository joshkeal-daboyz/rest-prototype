import { describe, expect, it } from "vitest";
import { CITY_STAGES } from "../../core";
import { stableHash } from "./hash";
import { stageRand } from "./seeds";

describe("stageRand (R-3)", () => {
  const keys: (string | number)[][] = [["a"], ["x", 3], ["park", 2], ["width", 1, 0], [7]];
  it("differs between two stages for the same key", () => {
    for (const k of keys) expect(stageRand("land", 5)(...k)).not.toBe(stageRand("mass", 5)(...k));
  });
  it("gives the same value for the same stage, seed and key", () => {
    for (const k of keys) expect(stageRand("land", 5)(...k)).toBe(stageRand("land", 5)(...k));
  });
  it("is stableHash of <stage>:<seed>:<key>", () => {
    expect(stageRand("land", 5)("x", 3)).toBe(stableHash("land:5:x:3"));
    expect(stageRand("mass", 9)("b")).toBe(stableHash("mass:9:b"));
  });
  it("differs by seed", () => {
    expect(stageRand("land", 5)("a")).not.toBe(stageRand("land", 6)("a"));
  });
  it("streets' rand equals today's hashOf (tile:<seed>:<key>) on 20 sampled keys", () => {
    const today = (seed: number, ...key: (string | number)[]): number => stableHash(`tile:${seed}:${key.join(":")}`);
    const sampled: [number, (string | number)[]][] = [];
    for (let n = 0; n < 5; n++) {
      sampled.push([n + 1, ["x", "avenue", n]]);
      sampled.push([n + 1, ["z", "park", n]]);
      sampled.push([n + 1, ["z", "width", n, n * 3]]);
      sampled.push([n + 1, ["x", "width", n, 64 - n]]);
    }
    expect(sampled).toHaveLength(20);
    for (const [seed, key] of sampled) expect(stageRand("streets", seed)(...key), `${seed} ${key.join(":")}`).toBe(today(seed, ...key));
  });
  it("gives every stage a distinct sub-seed", () => {
    const vals = CITY_STAGES.filter((s) => s !== "assemble").map((s) => stageRand(s, 1)("k"));
    expect(new Set(vals).size).toBe(vals.length);
  });
});
