/**
 * Stage 7, section H3, criterion 8's report (HEAVY: its own file, a 120 s timeout). For each of the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) it prints: the buildings, those with a roof piece and R8's first share; the runs,
 * those with a big prop and R8's second share; the lowest of each and its run; the big props by kind and key, by column kind and by storeys (HC), and the tallest top; the exits by column kind and the buildings whose exit fell through
 * (RX's fallback); the billboards placed (BB), where the rotation fell through from them and the tries RB and RK turned away; the buildings on each run's lowest (the old novelty place) by the kind they took instead (NV); the small
 * props by key and by one or two a column; the pieces the cap turned away (RC), by kind; the deck edges RK inset, by kit piece, and the clashes the plain port would have made; the roof pieces in all and with H1b's dressing and
 * H2's and H2b's walls against `DRESS_MAX` (C1, for J's draw calls), which is reported as passed and not applied (Q24 answer 5). For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) it prints whether stage 7 is ok,
 * and its failure if not: reported, never asserted (Josh, 21 Nov 2026).
 *
 * The named runs must be ok (R-2); the numbers are reported, the few the ticket pins (R8's two, no novelty piece, a billboard on every run) are asserted.
 */
import { describe, expect, it } from "vitest";
import type { CityPlanRun } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { runCity } from "../stages";
import { DRESS_MAX } from "./dresskit";
import { PARTY_WALL_KINDS } from "./partykit";
import { ROOF_DRESSED_MIN, BIG_ROOF_RUNS_MIN, ROOF_EDGE_M, BILLBOARD_EDGE_M } from "./roofkit";
import { roofReport } from "./roofcheck";
import { buildRoofs, deckOf, footprintOf, lowestOfRuns, roofInsets, within, type RoofStats } from "./roofs";
import { keyOf } from "./place";
import { type City, cityOf, label, NAMED, stagesOf } from "./testcities";

const f3 = (n: number): string => n.toFixed(3);
const add = (into: Record<string, number>, from: Readonly<Record<string, number>>): void => {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v;
};

describe("H3 report, criterion 8 (reported, not asserted, except as the ticket pins)", { timeout: 120_000 }, () => {
  it("prints the 20 named runs' numbers", () => {
    const lines: string[] = [];
    const kinds: Record<string, number> = {};
    const keys: Record<string, number> = {};
    const smallKeys: Record<string, number> = {};
    const byColumn: Record<string, number> = {};
    const byStoreys: Record<string, number> = {};
    const lowestTook: Record<string, number> = {};
    const insetKinds: Record<string, number> = {};
    const tot = { exitBlind: 0, exitMid: 0, exitFell: 0, billboards: 0, billFell: 0, billRunCap: 0, rbBlind: 0, rbMid: 0, rbCorner: 0, rkTurned: 0, capSmall: 0, capBig: 0, clashes: 0, rkFail: 0, one: 0, two: 0, pieces: 0, noBig: 0, drawn: 0, tallest: 0 };
    let minFirst = { v: Infinity, run: "" };
    let minSecond = { v: Infinity, run: "" };
    let maxAll = { v: 0, run: "" };
    let minAll = { v: Infinity, run: "" };
    let maxPieces = 0;
    let minPieces = Infinity;
    const over: string[] = [];
    let maxPerColumn = 0;
    for (const o of NAMED) {
      const r = cityOf(o);
      expect(r.ok, label(o)).toBe(true);
      if (!r.ok) continue;
      const { mass, buildings, facades } = r.plan.layers;
      const rep = roofReport(facades!, { mass: mass!, buildings: buildings! });
      expect(rep.failures.slice(0, 3), label(o)).toEqual([]);
      const m = rep.metrics;
      const first = m.dressed / m.buildings;
      const second = m.bigRuns / m.runs;
      expect(first, label(o)).toBeGreaterThanOrEqual(ROOF_DRESSED_MIN);
      expect(second, label(o)).toBeGreaterThanOrEqual(BIG_ROOF_RUNS_MIN);
      expect(m.byKind["novelty"] ?? 0, label(o)).toBe(0);
      expect(m.byKind["billboard"] ?? 0, label(o)).toBeGreaterThanOrEqual(1);
      if (first < minFirst.v) minFirst = { v: first, run: label(o) };
      if (second < minSecond.v) minSecond = { v: second, run: label(o) };
      const stats: RoofStats = buildRoofs(mass!, buildings!, facades!, stageRand("facades", o.seed)).stats;
      // the stage ran with its own seed; `stageRand` gives the same stream as the run's, so the stats are the run's (and the layer is the same)
      // the lowest building of each run, and the kind it took instead of the old novelty sign
      const roofs = facades!.roofs!;
      const bigOf = new Map(roofs.filter((p) => p.kind === "waterTower" || p.kind === "exit" || p.kind === "billboard").map((p) => [p.building, p.kind] as const));
      for (const b of lowestOfRuns(buildings!).values()) lowestTook[bigOf.get(b.id) ?? "none"] = (lowestTook[bigOf.get(b.id) ?? "none"] ?? 0) + 1;
      // RK: the insets by kit piece, and the clashes the plain port (no insets) would make against them
      const insets = roofInsets(facades!.walls!);
      const colAt = new Map(buildings!.columns!.map((c) => [keyOf(c), c] as const));
      let insetSides = 0;
      for (const sides of insets.values()) for (const i of sides.values()) {
        insetSides++;
        insetKinds[i.kind] = (insetKinds[i.kind] ?? 0) + 1;
      }
      const plain = buildRoofs(mass!, buildings!, { dressing: facades!.dressing!, walls: facades!.walls!.filter((p) => !PARTY_WALL_KINDS.includes(p.kind)) }, stageRand("facades", o.seed)).roofs;
      let clashes = 0;
      for (const p of plain) {
        const col = colAt.get(keyOf(p.cell))!;
        const billboard = p.kind === "billboard" || p.kind === "billboardFace";
        if (!within(footprintOf(col, p.placement), deckOf(col, insets, billboard ? BILLBOARD_EDGE_M : ROOF_EDGE_M))) clashes++;
      }
      const rkFail = rep.failures.filter((f) => f.check === "RK").length;
      // the totals against DRESS_MAX (C1)
      const all = facades!.dressing!.length + facades!.walls!.length + roofs.length;
      if (all > DRESS_MAX) over.push(`${label(o)} ${all} (+${all - DRESS_MAX})`);
      if (all > maxAll.v) maxAll = { v: all, run: label(o) };
      if (all < minAll.v) minAll = { v: all, run: label(o) };
      maxPieces = Math.max(maxPieces, roofs.length);
      minPieces = Math.min(minPieces, roofs.length);
      maxPerColumn = Math.max(maxPerColumn, m.maxPerColumn);
      add(kinds, m.byKind);
      add(keys, m.byKey);
      add(byColumn, m.bigByColumn);
      add(byStoreys, m.bigByStoreys);
      for (const p of roofs) if (p.kind === "small") smallKeys[p.placement.key.slice("city-pack:SM_Prop_".length)] = (smallKeys[p.placement.key.slice("city-pack:SM_Prop_".length)] ?? 0) + 1;
      tot.exitBlind += stats.exitOn.blind;
      tot.exitMid += stats.exitOn.mid;
      tot.exitFell += stats.fellThrough.exit;
      tot.billboards += stats.placed.billboard;
      tot.billFell += stats.fellThrough.billboard;
      tot.billRunCap += stats.billboardRunCap;
      tot.rbBlind += stats.rbTurned.blind;
      tot.rbMid += stats.rbTurned.mid;
      tot.rbCorner += stats.rbTurned.corner;
      tot.rkTurned += stats.rkTurned.small + stats.rkTurned.waterTower + stats.rkTurned.exit + stats.rkTurned.billboard;
      tot.capSmall += stats.capTurned.small;
      tot.capBig += stats.capTurned.waterTower + stats.capTurned.exit + stats.capTurned.billboard;
      tot.clashes += clashes;
      tot.rkFail += rkFail;
      tot.one += stats.smallColumns.one;
      tot.two += stats.smallColumns.two;
      tot.noBig += stats.noBig;
      tot.drawn += stats.drawn;
      tot.tallest = Math.max(tot.tallest, m.tallestTop);
      lines.push(
        `${label(o)}: buildings ${m.buildings}, with a roof piece ${m.dressed} (R8 first ${f3(first)} of ${ROOF_DRESSED_MIN}) | runs ${m.runs}, with a big prop ${m.bigRuns} (R8 second ${f3(second)} of ${BIG_ROOF_RUNS_MIN}) | big props ${JSON.stringify(Object.fromEntries(Object.entries(m.byKind).filter(([k]) => k !== "small" && k !== "billboardFace")))} by column ${JSON.stringify(m.bigByColumn)} by storeys ${JSON.stringify(m.bigByStoreys)}, tallest top ${f3(m.tallestTop)} | exits blind ${stats.exitOn.blind}, mid ${stats.exitOn.mid}, fell through ${stats.fellThrough.exit} | billboards ${stats.placed.billboard}, fell through ${stats.fellThrough.billboard}, run cap ${stats.billboardRunCap}, RB turned away (blind ${stats.rbTurned.blind}, mid ${stats.rbTurned.mid}, corner ${stats.rbTurned.corner}), RK turned away ${JSON.stringify(stats.rkTurned)} | small: one ${stats.smallColumns.one}, two ${stats.smallColumns.two} | cap turned away ${JSON.stringify(stats.capTurned)} | RK insets ${insetSides} sides, plain-port clashes ${clashes}, RK failures ${rkFail} | roof pieces ${roofs.length}; all dressing ${all} of ${DRESS_MAX}`,
      );
    }
    console.log(
      `H3 REPORT, named\n${lines.join("\n")}\nR8 lowest: first ${f3(minFirst.v)} on ${minFirst.run}; second ${f3(minSecond.v)} on ${minSecond.run}\nPIECES by kind ${JSON.stringify(kinds)}; roof pieces a run ${minPieces} to ${maxPieces}\nKEYS ${JSON.stringify(keys)}\nSMALL by key ${JSON.stringify(smallKeys)}; columns with one ${tot.one}, with two ${tot.two}\nBIG by column kind ${JSON.stringify(byColumn)}; by storeys ${JSON.stringify(byStoreys)}; tallest top ${f3(tot.tallest)}\nEXITS blind ${tot.exitBlind}, mid ${tot.exitMid}; fell through ${tot.exitFell}\nBILLBOARDS ${tot.billboards}; rotation fell through from them ${tot.billFell}; skipped by the run's cap ${tot.billRunCap}; RB turned away: blind ${tot.rbBlind}, mid ${tot.rbMid}, corner ${tot.rbCorner}; RK turned away (all kinds) ${tot.rkTurned}\nNV the run's lowest building took ${JSON.stringify(lowestTook)}\nCAP turned away: small ${tot.capSmall}, big ${tot.capBig}; fullest column ${maxPerColumn}\nRK insets by kit piece ${JSON.stringify(insetKinds)}; plain-port clashes ${tot.clashes}; RK failures in the layer ${tot.rkFail}\nDRESS_MAX ${DRESS_MAX}: all dressing from ${minAll.v} (${minAll.run}) to ${maxAll.v} (${maxAll.run}); runs over: ${over.length} of ${NAMED.length}${over.length > 0 ? `: ${over.join("; ")}` : ""} (reported as passed, not applied: Q24 answer 5)\nBig prop draws ${tot.drawn}, with no kind placed ${tot.noBig}`,
    );
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
    console.log(`H3 REPORT, outside\n${Object.entries(tally).map(([k, v]) => `${k}: stage 7 ok ${v.ok}, failed ${v.fail}, never reached ${v.before}`).join("\n")}\n${lines.join("\n")}`);
  });
});
