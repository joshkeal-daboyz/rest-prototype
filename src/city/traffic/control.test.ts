/**
 * Ticket 070 TR1, criterion 2: the control of every junction on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on), derived here independently of `control.ts`, and three hand-worked fixtures.
 * HEAVY: each city is built once (stages 1 to 9), through a module-level cache.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { CityJunction, CityPlanStreet } from "../../core";
import { buildControl } from "./control";
import { NAMED, label, layersOf, warm } from "./testcities";

const SIDES = { "-x": "x", "+x": "x", "-z": "z", "+z": "z" } as const;

describe("the control of every junction on the named runs (criterion 2)", { timeout: 120_000 }, () => {
  beforeAll(() => warm(NAMED), 120_000);
  it("every junction appears once, in order, with its approaches in arms order; inbound follows IN", () => {
    const bad: string[] = [];
    for (const o of NAMED) {
      const { streets, traffic } = layersOf(o);
      const byId = new Map<string, CityPlanStreet>(streets.streets.map((s) => [s.id, s]));
      if (traffic.junctions.map((t) => t.junction).join() !== streets.junctions.map((j) => j.id).join()) bad.push(`${label(o)}: junction list`);
      streets.junctions.forEach((j, k) => {
        const t = traffic.junctions[k]!;
        if (t.approaches.map((a) => a.arm).join() !== j.arms.join()) bad.push(`${label(o)}: ${j.id} arms`);
        for (const a of t.approaches) {
          const meets = j.streets.map((q) => byId.get(q.street)!).find((s) => s.axis === SIDES[a.arm])!;
          // a two-way arm is inbound; a one-way arm is inbound when the flow points toward the junction: "+" runs toward higher i or j, so from an arm at the low side
          const inbound = meets.section === "twoWay" || (meets.flow === "+" ? a.arm === "-x" || a.arm === "-z" : a.arm === "+x" || a.arm === "+z");
          if (a.id !== `${j.id}|${a.arm}` || a.junction !== j.id || a.street !== meets.id) bad.push(`${label(o)}: ${a.id} identity`);
          if (a.inbound !== inbound) bad.push(`${label(o)}: ${a.id} inbound ${a.inbound}, expected ${inbound}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });

  it("the control follows SJ, AS, T and C: signals, all-way stops, Ts' ending arms, no control at a corner", () => {
    const bad: string[] = [];
    for (const o of NAMED) {
      const { streets, traffic } = layersOf(o);
      const byId = new Map<string, CityPlanStreet>(streets.streets.map((s) => [s.id, s]));
      streets.junctions.forEach((j, k) => {
        const t = traffic.junctions[k]!;
        const sections = j.streets.map((q) => byId.get(q.street)!.section);
        const signals = j.kind === "crossroads" && j.inner && sections.every((s) => s === "twoWay");
        const allStop = j.kind === "crossroads" && j.inner && !signals;
        const ending = j.streets.find((q) => !q.passes);
        for (const a of t.approaches) {
          let want = "none";
          if (a.inbound && signals) want = "signal";
          else if (a.inbound && allStop) want = "stop";
          else if (a.inbound && j.kind === "T" && ending !== undefined && a.street === ending.street) want = "stop";
          if (a.control !== want) bad.push(`${label(o)}: ${a.id} is "${a.control}", expected "${want}"`);
        }
        const stops = t.approaches.filter((a) => a.control === "stop").length;
        const wantJ = signals ? "signals" : allStop ? "allStop" : stops > 0 ? "stop" : "none";
        if (t.control !== wantJ) bad.push(`${label(o)}: ${j.id} is ${t.control}, expected ${wantJ}`);
        if (j.kind === "corner" && (t.control !== "none" || t.approaches.some((a) => a.control !== "none"))) bad.push(`${label(o)}: corner ${j.id} has a control`);
      });
    }
    expect(bad).toEqual([]);
  });

  it("the named runs have every control kind, and a one-way arm with no inbound traffic", () => {
    const junctionKinds = new Set<string>();
    const approachKinds = new Set<string>();
    let outbound = 0;
    let signalJunctions = 0;
    for (const o of NAMED) {
      const { traffic } = layersOf(o);
      for (const t of traffic.junctions) {
        junctionKinds.add(t.control);
        if (t.control === "signals") signalJunctions++;
        for (const a of t.approaches) {
          approachKinds.add(a.control);
          if (!a.inbound) outbound++;
        }
      }
    }
    expect([...junctionKinds].sort()).toEqual(["allStop", "none", "signals", "stop"]);
    expect([...approachKinds].sort()).toEqual(["none", "signal", "stop"]);
    expect(outbound).toBeGreaterThan(0);
    expect(signalJunctions).toBe(221);
  });
});

// ---- hand-worked fixtures: a street layer with only what `buildControl` reads ----

const street = (id: string, axis: "x" | "z", section: "twoWay" | "oneWay", flow: "both" | "+" | "-"): CityPlanStreet => ({ id, axis, section, flow }) as unknown as CityPlanStreet;
const junction = (id: string, kind: "T" | "crossroads", inner: boolean, streets: readonly [string, boolean][], arms: CityJunction["arms"]): CityJunction =>
  ({ id, kind, inner, streets: streets.map(([s, passes]) => ({ street: s, passes })), arms, cells: [] }) as unknown as CityJunction;

describe("hand-worked controls", () => {
  it("a T whose ending street is two-way: the ending arm stops, both through arms do not", () => {
    // x:1 runs along x and ends at z:1, which runs through; the ending street's arm leaves by "-x" (it lies at lower x), the through street's by "-z" and "+z"
    const t = buildControl({ streets: [street("x:1", "x", "twoWay", "both"), street("z:1", "z", "twoWay", "both")], junctions: [junction("j", "T", true, [["x:1", false], ["z:1", true]], ["-x", "-z", "+z"])] })[0]!;
    expect(t.control).toBe("stop");
    expect(t.approaches.map((a) => [a.arm, a.inbound, a.control])).toEqual([
      ["-x", true, "stop"],
      ["-z", true, "none"],
      ["+z", true, "none"],
    ]);
  });

  it("a T whose ending street leaves one-way: no stop, the junction has no control", () => {
    // flow "-" runs toward lower x: from the arm at "-x" traffic leaves the junction
    const t = buildControl({ streets: [street("x:1", "x", "oneWay", "-"), street("z:1", "z", "twoWay", "both")], junctions: [junction("j", "T", false, [["x:1", false], ["z:1", true]], ["-x", "-z", "+z"])] })[0]!;
    expect(t.control).toBe("none");
    expect(t.approaches.map((a) => [a.arm, a.inbound, a.control])).toEqual([
      ["-x", false, "none"],
      ["-z", true, "none"],
      ["+z", true, "none"],
    ]);
    // the same street flowing "+" is inbound at its ending arm and stops
    const u = buildControl({ streets: [street("x:1", "x", "oneWay", "+"), street("z:1", "z", "twoWay", "both")], junctions: [junction("j", "T", false, [["x:1", false], ["z:1", true]], ["-x", "-z", "+z"])] })[0]!;
    expect(u.control).toBe("stop");
    expect(u.approaches[0]).toMatchObject({ arm: "-x", inbound: true, control: "stop" });
  });

  it("an inner crossroads of a one-way and a two-way street: an all-way stop, only the inbound arms stop", () => {
    const t = buildControl({ streets: [street("x:1", "x", "oneWay", "+"), street("z:1", "z", "twoWay", "both")], junctions: [junction("j", "crossroads", true, [["x:1", true], ["z:1", true]], ["-x", "+x", "-z", "+z"])] })[0]!;
    expect(t.control).toBe("allStop");
    expect(t.approaches.map((a) => [a.arm, a.inbound, a.control])).toEqual([
      ["-x", true, "stop"],
      ["+x", false, "none"],
      ["-z", true, "stop"],
      ["+z", true, "stop"],
    ]);
    // two two-way streets: signals on every arm
    const s = buildControl({ streets: [street("x:1", "x", "twoWay", "both"), street("z:1", "z", "twoWay", "both")], junctions: [junction("j", "crossroads", true, [["x:1", true], ["z:1", true]], ["-x", "+x", "-z", "+z"])] })[0]!;
    expect(s.control).toBe("signals");
    expect(s.approaches.every((a) => a.control === "signal")).toBe(true);
  });
});
