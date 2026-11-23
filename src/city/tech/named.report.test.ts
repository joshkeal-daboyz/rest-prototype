/**
 * Ticket 073 D1, criterion 10, the numbers (reported, not asserted), moved here by ticket 079. Run with `npm run report`, which sets REST_CITIES=all.
 */
import { describe, expect, it } from "vitest";
import type { CityTechPieceKind } from "../../core";
import { NAMED, historyPlanOf, techOf } from "./testcities";

describe("the tech pass numbers on the named runs", { timeout: 600_000 }, () => {
  it("criterion 10, the numbers (reported, not asserted)", () => {
    const rows: Record<string, number[]> = {};
    const push = (k: string, v: number): void => {
      (rows[k] ??= []).push(v);
    };
    for (const c of NAMED) {
      const { build, ms } = techOf(c);
      const kinds: Record<CityTechPieceKind, number> = { "bolt-on": 0, camera: 0, tall: 0, overhang: 0, sign: 0, shopfront: 0, pavement: 0 };
      for (const a of build.layer.adds) kinds[a.kind]++;
      for (const [k, v] of Object.entries(kinds)) push(k, v);
      push("pieces", build.layer.adds.length);
      push("removes", build.layer.changes.length);
      push("keys", new Set(build.layer.adds.map((a) => a.placement.key)).size);
      push("pavementFree", build.stats.pavement.free);
      push("pavementTaken", build.stats.pavement.taken);
      push("pavementSlots", build.stats.pavement.slots);
      push("eligibleShops", build.stats.shops.eligible);
      push("shops", build.stats.shops.shops);
      push("sideWalls", build.stats.walls.sideWalls);
      push("sideFree", build.stats.walls.sideFree);
      push("facesFree", build.stats.walls.facesFree);
      push("ms", ms);
      const tech = historyPlanOf(c).layers.history!.districts.map((d) => d.tech);
      push("techMin", Math.min(...tech));
      push("techMax", Math.max(...tech));
    }
    const out = Object.entries(rows).map(([k, v]) => `${k}: ${Math.min(...v)} to ${Math.max(...v)} (mean ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)})`);
    console.log(`D1 numbers over ${NAMED.length} runs\n${out.join("\n")}`);
    expect(rows["pieces"]!.every((n) => n > 0)).toBe(true);
  });
});
