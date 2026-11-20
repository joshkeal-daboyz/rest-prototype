import { describe, expect, it } from "vitest";
import type { CityBlock, CityStreet } from "../../core";
import type { CityStageDef } from "../pipeline/types";
import { runCity } from "../stages";
import { streetsStageWith } from "./stage";
import { evaluateStreets, evaluateStreetsVariety, streetWidthFailures, streetsVariety } from "./check";

const NAMED: { blocksX: number; blocksZ: number; seed: number }[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 6, blocksZ: 6, seed });

describe("street width and V1, V2 on the layer", () => {
  it("hold on the named cities, one-way on and off (A4d: the 20 named runs)", () => {
    for (const o of NAMED) {
      for (const stages of [undefined, [streetsStageWith(0) as CityStageDef]] as const) {
        const r = runCity(o, "streets", stages);
        const tag = `${JSON.stringify(o)} one-way ${stages ? "off" : "on"}`;
        expect(r.ok, tag).toBe(true);
        const layer = r.plan.layers.streets!;
        expect(streetWidthFailures(layer), tag).toEqual([]);
        for (const v of evaluateStreets(layer)) expect(v.pass, `${v.id} ${tag}`).toBe(true);
      }
    }
  });

  const uniformBlocks = (): CityBlock[] => {
    const out: CityBlock[] = [];
    for (let bj = 0; bj < 3; bj++) {
      for (let bi = 0; bi < 3; bi++) out.push({ id: `block:${bi}:${bj}`, bi, bj, i0: bi * 15, i1: bi * 15 + 10, j0: bj * 15, j1: bj * 15 + 10, type: "medium" });
    }
    return out;
  };

  it("a uniform 10 x 10 grid fails V1 and V2", () => {
    const verdicts = evaluateStreetsVariety(streetsVariety({ blocks: uniformBlocks() }));
    expect(verdicts.find((v) => v.id === "V1")!.pass).toBe(false);
    expect(verdicts.find((v) => v.id === "V2")!.pass).toBe(false);
  });

  it("no blocks fails V1 and V2", () => {
    const verdicts = evaluateStreetsVariety(streetsVariety({ blocks: [] }));
    expect(verdicts.map((v) => v.pass)).toEqual([false, false]);
  });

  const street = (profile: "street" | "avenue", lo_m: number, hi_m: number): CityStreet => ({
    id: "x:1",
    axis: "x",
    line: 1,
    profile,
    bands: profile === "avenue" ? ["pavement", "parking", "lane", "lane", "parking", "pavement"] : ["pavement", "parking", "lane", "lane", "pavement"],
    across0: 0,
    carriage: { lo_m, hi_m },
    centre_m: (lo_m + hi_m) / 2,
  });

  it("a street with an avenue profile fails street width", () => {
    const layer: { streets: CityStreet[] } = { streets: [street("avenue", 5, 25)] };
    const failures = streetWidthFailures(layer);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.join(" ")).toContain("x:1");
    expect(evaluateStreets({ ...layer, blocks: [] }).find((v) => v.id === "width")!.pass).toBe(false);
  });

  it("a 15 m street passes street width, and a 20 m carriageway on a street profile fails it", () => {
    expect(streetWidthFailures({ streets: [street("street", 5, 20)] })).toEqual([]);
    expect(streetWidthFailures({ streets: [street("street", 5, 25)] })).toHaveLength(1);
  });
});
