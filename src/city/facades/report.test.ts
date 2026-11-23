/**
 * Stage 7, section H1, criterion 7's report (HEAVY: its own file, a 120 s timeout). For each of the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) it prints: ground pieces by kind and by key; buildings, street and quiet;
 * doors per building; street buildings with no door; quiet buildings whose door is a corner and whose is mid; floor corners; columns the stall rule kept a door off; quiet buildings with no door place, by row; per key its S1
 * level, door and top; the keys never placed; deep pieces by key and the largest back overrun (D5); the spread of fascia tops along each building (S2); and the ground pieces in all (G2's draw-call estimate).
 * For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) it prints whether stage 7 is ok, and its failure if not: reported, never asserted.
 *
 * The named runs must be ok (R-2).
 */
import { describe, expect, it } from "vitest";
import type { CityGroundPiece, CityPlanRun } from "../../core";
import { runCity } from "../stages";
import { groundReport } from "./check";
import { factsOf, facesStalls, makeCtx } from "./facts";
import { DEEP_KEYS, GROUND_KIT, GROUND_STYLES } from "./kit";
import { levelOf } from "./place";
import { type City, cityOf, label, NAMED, stagesOf } from "./testcities";

const mm = (n: number): string => n.toFixed(4);
const short = (k: string): string => k.slice("city-pack:SM_Bld_".length);

interface Tally {
  kinds: Record<string, number>;
  keys: Record<string, number>;
  street: number;
  quiet: number;
  doorHist: Record<string, number>;
  streetNoDoor: number;
  quietDoorCorner: number;
  quietDoorMid: number;
  floorCorners: number;
  stallMids: number;
  stallCorners: number;
  noDoorPlace: Record<string, number>;
  deep: Record<string, number>;
  backOver: number;
  spread: number;
  pieces: number;
  worstM1: number;
}
const blank = (): Tally => ({ kinds: {}, keys: {}, street: 0, quiet: 0, doorHist: {}, streetNoDoor: 0, quietDoorCorner: 0, quietDoorMid: 0, floorCorners: 0, stallMids: 0, stallCorners: 0, noDoorPlace: {}, deep: {}, backOver: 0, spread: 0, pieces: 0, worstM1: 0 });
const bump = (o: Record<string, number>, k: string, n = 1): void => {
  o[k] = (o[k] ?? 0) + n;
};

function measure(o: City): { text: string; ok: boolean; tally: Tally } {
  const r = cityOf(o);
  const t = blank();
  if (!r.ok) return { text: `${label(o)}: FAILED ${r.failure.stage}: ${r.failure.reason}`, ok: false, tally: t };
  const { mass, buildings, facades } = r.plan.layers;
  const ctx = makeCtx(mass!, buildings!);
  const rep = groundReport(facades!, { mass: mass!, buildings: buildings! });
  t.pieces = facades!.ground.length;
  t.backOver = rep.worst.backOver;
  t.worstM1 = rep.worst.m1;
  const byBuilding = new Map<string, CityGroundPiece[]>();
  for (const p of facades!.ground) {
    bump(t.kinds, p.kind);
    bump(t.keys, short(p.placement.key));
    if (DEEP_KEYS.includes(p.placement.key)) bump(t.deep, short(p.placement.key));
    (byBuilding.get(p.building) ?? byBuilding.set(p.building, []).get(p.building)!).push(p);
  }
  for (const b of buildings!.buildings) {
    const f = factsOf(ctx, b);
    const ps = byBuilding.get(b.id) ?? [];
    const doors = ps.filter((p) => p.kind === "door" || p.kind === "doorCorner");
    bump(t.doorHist, String(doors.length));
    if (f.frontage === "street") {
      t.street++;
      if (doors.length === 0) t.streetNoDoor++;
    } else {
      t.quiet++;
      if (doors[0]?.kind === "doorCorner") t.quietDoorCorner++;
      if (doors[0]?.kind === "door") t.quietDoorMid++;
      t.stallMids += f.mids.filter((n) => facesStalls(ctx, f.cols[n]!)).length;
      t.stallCorners += f.quietCorners.filter((n) => facesStalls(ctx, f.cols[n]!)).length;
      if (doors.length === 0) bump(t.noDoorPlace, f.ring2 ? "inner (ring 2)" : "outer");
    }
    t.floorCorners += ps.filter((p) => p.kind === "floorCorner").length;
    const tops = ps.map((p) => p.placement.y_m + (GROUND_KIT.find((e) => e.key === p.placement.key)?.h ?? 0));
    if (tops.length > 0) t.spread = Math.max(t.spread, Math.max(...tops) - Math.min(...tops));
  }
  const text = `${label(o)}: pieces ${t.pieces} ${JSON.stringify(t.kinds)} | buildings street ${t.street} quiet ${t.quiet} | doors/building ${JSON.stringify(t.doorHist)} street without door ${t.streetNoDoor} | quiet door corner ${t.quietDoorCorner} mid ${t.quietDoorMid} floorCorner ${t.floorCorners} | stall kept off: mids ${t.stallMids} corners ${t.stallCorners} | no door place ${JSON.stringify(t.noDoorPlace)} | deep ${JSON.stringify(t.deep)} back overrun ${mm(t.backOver)} | fascia spread ${mm(t.spread)} | checks ${rep.failures.length} failing, M1 ${mm(t.worstM1)}`;
  return { text, ok: rep.failures.length === 0, tally: t };
}

describe("H1 report, criterion 7 (reported, not asserted, except that the named runs are ok)", { timeout: 120_000 }, () => {
  it("prints the 20 named runs' numbers", () => {
    const lines: string[] = [];
    const total = blank();
    let allOk = true;
    const placed = new Set<string>();
    for (const o of NAMED) {
      const m = measure(o);
      lines.push(m.text);
      allOk &&= m.ok;
      for (const [k, v] of Object.entries(m.tally.kinds)) bump(total.kinds, k, v);
      for (const [k, v] of Object.entries(m.tally.keys)) {
        bump(total.keys, k, v);
        placed.add(k);
      }
      for (const [k, v] of Object.entries(m.tally.deep)) bump(total.deep, k, v);
      for (const [k, v] of Object.entries(m.tally.noDoorPlace)) bump(total.noDoorPlace, k, v);
      for (const [k, v] of Object.entries(m.tally.doorHist)) bump(total.doorHist, k, v);
      total.street += m.tally.street;
      total.quiet += m.tally.quiet;
      total.streetNoDoor += m.tally.streetNoDoor;
      total.quietDoorCorner += m.tally.quietDoorCorner;
      total.quietDoorMid += m.tally.quietDoorMid;
      total.floorCorners += m.tally.floorCorners;
      total.stallMids += m.tally.stallMids;
      total.stallCorners += m.tally.stallCorners;
      total.pieces += m.tally.pieces;
      total.backOver = Math.max(total.backOver, m.tally.backOver);
      total.spread = Math.max(total.spread, m.tally.spread);
      total.worstM1 = Math.max(total.worstM1, m.tally.worstM1);
    }
    const levels = GROUND_KIT.map((e) =>
      GROUND_STYLES.map((s) => {
        const y = levelOf(e, 3, e.windowSill ?? { "apartment-01": 0.756, "apartment-02": 0.417, "apartment-03": 0.517 }[s.id]!);
        return `${s.id.slice(-2)}: ${y === null ? "empty" : `y ${y.toFixed(3)} door ${e.sill === null ? "-" : (y + e.sill).toFixed(3)} top ${(y + e.h).toFixed(3)}`}`;
      }).join(" | "),
    ).map((row, n) => `${short(GROUND_KIT[n]!.key).padEnd(22)} ${row}`);
    const never = GROUND_KIT.filter((e) => !placed.has(short(e.key))).map((e) => short(e.key));
    console.log(
      `H1 REPORT, named\n${lines.join("\n")}\nTOTAL pieces ${total.pieces} kinds ${JSON.stringify(total.kinds)}\nKEYS ${JSON.stringify(total.keys)}\nbuildings street ${total.street} quiet ${total.quiet}; doors per building ${JSON.stringify(total.doorHist)}; street buildings with no door ${total.streetNoDoor}; quiet door corner ${total.quietDoorCorner} mid ${total.quietDoorMid}; floorCorners ${total.floorCorners}\nstall rule kept a door off: mids ${total.stallMids}, corners ${total.stallCorners}; quiet buildings with no door place ${JSON.stringify(total.noDoorPlace)}\ndeep pieces ${JSON.stringify(total.deep)}; LARGEST BACK OVERRUN ${mm(total.backOver)}; worst M1 ${mm(total.worstM1)}; largest fascia spread ${mm(total.spread)}\nS1 LEVELS (a style's first-floor window sill; a floor key's own)\n${levels.join("\n")}\nKEYS NEVER PLACED: ${never.join(", ")}`,
    );
    expect(allOk).toBe(true);
  });

  it("prints the outside cities, reported and not asserted", () => {
    const lines: string[] = [];
    const tally: Record<string, { ok: number; fail: number; before: number }> = {};
    const outside: City[] = [];
    for (const [blocksX, blocksZ] of [
      [3, 3],
      [6, 4],
    ] as const)
      for (const way of ["off", "on"] as const) for (let seed = 1; seed <= 20; seed++) outside.push({ blocksX, blocksZ, seed, way });
    for (const o of outside) {
      const key = `${o.blocksX}x${o.blocksZ} ${o.way}`;
      const t = (tally[key] ??= { ok: 0, fail: 0, before: 0 });
      const r: CityPlanRun = runCity({ blocksX: o.blocksX, blocksZ: o.blocksZ, seed: o.seed }, undefined, stagesOf(o.way));
      if (r.ok) t.ok++;
      else if (r.failure.stage === "facades") {
        t.fail++;
        lines.push(`${o.blocksX}x${o.blocksZ} s${o.seed} ${o.way}: facades failed: ${r.failure.reason.slice(0, 160)}`);
      } else t.before++;
    }
    console.log(`H1 REPORT, outside\n${Object.entries(tally).map(([k, v]) => `${k}: stage 7 ok ${v.ok}, failed ${v.fail}, never reached ${v.before}`).join("\n")}\n${lines.join("\n")}`);
  });
});
