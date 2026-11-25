import { describe, expect, it } from "vitest";
import { relightCues } from "./relightcues";

describe("relightCues", () => {
  it("gives ignition times to the file's lamps only, and keeps the plan's duration", () => {
    const plan = { lampOrder: ["lamp_a", "lamp_h", "lamp_b"], nodeArrive: [0, 1.5, 2.5, 4], duration: 6 };
    const nodes = ["feed", "lamp_a", "lamp_h", "lamp_b"];
    expect(relightCues(plan, nodes, ["lamp_h"])).toEqual({ igniteAt: [1.5, 4], duration: 6 });
  });
});
