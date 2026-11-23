/**
 * Stage 7, section H1b, criterion 7's report (HEAVY: its own file, a 120 s timeout). For each of the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) it prints: the shop bays; R4, R5 and R6's shares and the ATM
 * share; pieces by kind and by key; awning keys per building; L awnings placed, the corner bays that fell back to a flat key and the ones LG turned away; the mixed corners and those with a quiet front (X1); the
 * overlapping neighbour pairs and the largest overlap, by key pair, and how many overlap at the same height (W1; the 0.11 m stop line); the furthest reach by key (T1); the runs and those at `ATM_PER_RUN` (B2); and
 * the dressing pieces in all against `DRESS_MAX` (C1). For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) it prints whether stage 7 is ok, and its failure if not: reported, never asserted.
 *
 * The named runs must be ok (R-2); every number is reported, none asserted (the stage's own checks assert R4 to R6, LG and the caps on every run).
 */
import { describe, expect, it } from "vitest";
import type { CityPlanRun } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { runCity } from "../stages";
import { buildDressing } from "./dress";
import { dressReport, type DressMetrics, type OverlapTally } from "./dresscheck";
import { DRESS_MAX } from "./dresskit";
import { type City, cityOf, label, NAMED, stagesOf } from "./testcities";

const f3 = (n: number): string => n.toFixed(3);

describe("H1b report, criterion 7 (reported, not asserted, except that the named runs are ok)", { timeout: 120_000 }, () => {
  it("prints the 20 named runs' numbers", () => {
    const lines: string[] = [];
    const reach: Record<string, number> = {};
    const overlaps: Record<string, OverlapTally> = {};
    const kinds: Record<string, number> = {};
    const keys: Record<string, number> = {};
    const flat: Record<string, number> = {};
    const sum = { bays: 0, pieces: 0, lPlaced: 0, cornerFlat: 0, lg: 0, mixed: 0, mixedQuiet: 0, pairs: 0, pairsHeight: 0, runs: 0, atCap: 0, runsAtm: 0 };
    let maxOverlap = 0;
    let maxOverlapHeight = 0;
    let maxPieces = 0;
    for (const o of NAMED) {
      const r = cityOf(o);
      expect(r.ok, label(o)).toBe(true);
      if (!r.ok) continue;
      const { mass, buildings, facades } = r.plan.layers;
      const rep = dressReport(facades!, { mass: mass!, buildings: buildings! });
      expect(rep.failures.slice(0, 3), label(o)).toEqual([]);
      const m: DressMetrics = rep.metrics;
      const stats = buildDressing(mass!, buildings!, facades!.ground, stageRand("facades", o.seed)).stats;
      expect(stats.lPlaced, label(o)).toBe(m.lAwnings);
      lines.push(
        `${label(o)}: bays ${m.shopBays} | R4 ${f3(m.glassed / m.glassKeyBays)} R5 ${f3(m.awned / m.shopBays)} R6 ${f3(m.signed / m.shopBays)} ATM ${f3(m.atmBuildings / m.streetBuildings)} (${m.atmBuildings} of ${m.streetBuildings} street buildings) | pieces ${m.pieces} ${JSON.stringify(m.byKind)} of ${DRESS_MAX} | flat keys per building ${JSON.stringify(m.flatKeysPerBuilding)} | L ${stats.lPlaced}, corner bays on a flat key ${stats.cornerFlat}, L turned away by LG ${stats.lgTurnedAway} | mixed corners ${m.mixedCorners}, quiet front ${m.mixedQuietFront} | overlapping pairs ${m.overlapPairs}, at the same height ${m.overlapPairsHeight}, largest ${f3(m.maxOverlap)}, largest at the same height ${f3(m.maxOverlapHeight)} | runs ${m.runs}, with an ATM ${m.runsWithAtm}, at ATM_PER_RUN ${m.runsAtCap} | most pieces on a column ${m.maxPerColumn}`,
      );
      sum.bays += m.shopBays;
      sum.pieces += m.pieces;
      sum.lPlaced += stats.lPlaced;
      sum.cornerFlat += stats.cornerFlat;
      sum.lg += stats.lgTurnedAway;
      sum.mixed += m.mixedCorners;
      sum.mixedQuiet += m.mixedQuietFront;
      sum.pairs += m.overlapPairs;
      sum.pairsHeight += m.overlapPairsHeight;
      sum.runs += m.runs;
      sum.atCap += m.runsAtCap;
      sum.runsAtm += m.runsWithAtm;
      maxOverlap = Math.max(maxOverlap, m.maxOverlap);
      maxOverlapHeight = Math.max(maxOverlapHeight, m.maxOverlapHeight);
      maxPieces = Math.max(maxPieces, m.pieces);
      for (const [k, v] of Object.entries(m.reachByKey)) reach[k] = Math.max(reach[k] ?? -Infinity, v);
      for (const [k, v] of Object.entries(m.overlaps)) {
        const t = overlaps[k] ?? (overlaps[k] = { n: 0, nHeight: 0, max: 0, maxHeight: 0 });
        t.n += v.n;
        t.nHeight += v.nHeight;
        t.max = Math.max(t.max, v.max);
        t.maxHeight = Math.max(t.maxHeight, v.maxHeight);
      }
      for (const [k, v] of Object.entries(m.byKind)) kinds[k] = (kinds[k] ?? 0) + v;
      for (const [k, v] of Object.entries(m.byKey)) keys[k] = (keys[k] ?? 0) + v;
      for (const [k, v] of Object.entries(m.flatKeysPerBuilding)) flat[k] = (flat[k] ?? 0) + v;
    }
    const reachRows = Object.entries(reach).sort().map(([k, v]) => `  ${k.padEnd(30)} ${f3(v)}`);
    const overlapRows = Object.entries(overlaps)
      .sort((a, b) => b[1].n - a[1].n)
      .map(([k, v]) => `  ${k.padEnd(48)} pairs ${String(v.n).padStart(5)} largest ${f3(v.max)} | at the same height ${String(v.nHeight).padStart(5)} largest ${f3(v.maxHeight)}`);
    console.log(
      `H1b REPORT, named\n${lines.join("\n")}\nTOTAL shop bays ${sum.bays}, pieces ${sum.pieces} (most in a run ${maxPieces} of ${DRESS_MAX}) ${JSON.stringify(kinds)}\nKEYS ${JSON.stringify(keys)}\nflat awning keys per building ${JSON.stringify(flat)}\nL awnings ${sum.lPlaced}; corner bays on a flat key ${sum.cornerFlat}; L turned away by LG ${sum.lg}\nmixed corners ${sum.mixed}, quiet front ${sum.mixedQuiet}\nOVERLAPS: pairs ${sum.pairs}, at the same height ${sum.pairsHeight}, largest ${f3(maxOverlap)}, LARGEST AT THE SAME HEIGHT ${f3(maxOverlapHeight)} (W1's stop line is 0.11)\n${overlapRows.join("\n")}\nREACH past the front cell edge, by key (T1: 5.000; an awning 4.700)\n${reachRows.join("\n")}\nruns ${sum.runs}, with an ATM ${sum.runsAtm}, at ATM_PER_RUN ${sum.atCap}`,
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
    console.log(`H1b REPORT, outside\n${Object.entries(tally).map(([k, v]) => `${k}: stage 7 ok ${v.ok}, failed ${v.fail}, never reached ${v.before}`).join("\n")}\n${lines.join("\n")}`);
  });
});
