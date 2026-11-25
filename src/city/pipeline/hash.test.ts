import { describe, expect, it } from "vitest";
import { stableHash } from "./hash";

describe("stableHash (R-4: a copy of src/render/city.ts's FNV-1a)", () => {
  const PAIRS: readonly (readonly [string, number])[] = [
    ["", 2166136261],
    ["a", 3826002220],
    ["tile:1:x:0", 1975320768],
    ["block:0:0", 1620864274],
    ["streets", 2919613751],
    ["abc", 440920331],
    ["tile:2:z:park:3", 3113988586],
    ["The quick brown fox", 2924308450],
    ["0123456789", 4185952242],
    ["land:3:7", 2560937876],
  ];
  it("gives the pinned value for each of 10 typed-in inputs", () => {
    expect(PAIRS).toHaveLength(10);
    for (const [s, h] of PAIRS) expect(stableHash(s), s).toBe(h);
  });
});
