/**
 * Stage 7, section H2, criterion 9's report (HEAVY: its own file, a 120 s timeout). For each of the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) it prints: the qualifying street buildings, the hostable ones, the
 * target, the escapes placed, `escapeShort` and R7's share; the quiet sites, the hostable ones, the quiet escapes placed and what ET took away; pack and code-drawn escapes, the scale range, the worst deck, joint and ladder
 * figures; R4, R5 and R6's shares and the ATM share after EP beside H1b's (with no escapes), and the lowest R6 and its run; canopies, door corners left bare (WP3), air-conditioners, planters and the pieces the caps turned
 * away; the furthest reach by key and by the use across (RQ); and the wall pieces in all, and with H1b's dressing against `DRESS_MAX` (C1). For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) it prints
 * whether stage 7 is ok, and its failure if not: reported, never asserted.
 *
 * The named runs must be ok (R-2); every number is reported, none asserted (the stage's own checks assert R4 to R7, EP, the caps and the reach on every run).
 */
import { describe, expect, it } from "vitest";
import type { CityPlanRun } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { runCity } from "../stages";
import { buildDressing, runsOf } from "./dress";
import { dressReport } from "./dresscheck";
import { DRESS_MAX } from "./dresskit";
import { decideEscapes } from "./escape";
import { type City, cityOf, label, NAMED, stagesOf } from "./testcities";
import { wallReport } from "./wallcheck";
import { TILE_CITY_R7_MIN } from "./wallkit";
import { buildWalls } from "./walls";

const f3 = (n: number): string => n.toFixed(3);

describe("H2 report, criterion 9 (reported, not asserted, except that the named runs are ok)", { timeout: 120_000 }, () => {
  it("prints the 20 named runs' numbers", () => {
    const lines: string[] = [];
    const reach: Record<string, number> = {};
    const kinds: Record<string, number> = {};
    let lowest = { r6: Infinity, run: "" };
    let lowestR5 = { r5: Infinity, run: "" };
    let lowestR7 = { r7: Infinity, run: "" };
    const sum = { pack: 0, code: 0, canopies: 0, bare: 0, ac: 0, planters: 0, capAway: 0, noFit: 0, atProp: 0, escStreet: 0, escQuiet: 0, et: 0, etSites: 0, walls: 0 };
    let maxWalls = 0;
    let maxTotal = 0;
    let maxPerColumn = 0;
    let scaleMin = Infinity;
    let scaleMax = -Infinity;
    let worstDeck = 0;
    let worstJoint = 0;
    let worstLadder = 0;
    let longestDrop = 0;
    let facing = 0;
    const r4 = { lo: Infinity, hi: -Infinity };
    const r5 = { lo: Infinity, hi: -Infinity };
    const r6 = { lo: Infinity, hi: -Infinity };
    const r5Before = { lo: Infinity, hi: -Infinity };
    const r6Before = { lo: Infinity, hi: -Infinity };
    for (const o of NAMED) {
      const r = cityOf(o);
      expect(r.ok, label(o)).toBe(true);
      if (!r.ok) continue;
      const { mass, buildings, facades } = r.plan.layers;
      const input = { mass: mass!, buildings: buildings! };
      const rand = stageRand("facades", o.seed);
      const wr = wallReport(facades!, input);
      expect(wr.failures.slice(0, 3), label(o)).toEqual([]);
      const m = wr.metrics;
      const dec = decideEscapes(mass!, buildings!, facades!.ground, rand, TILE_CITY_R7_MIN, runsOf(buildings!));
      const s = dec.stats;
      const walls = buildWalls(mass!, buildings!, facades!.ground, facades!.dressing!, dec.escapes, rand).stats;
      const after = dressReport(facades!, input).metrics;
      const before = dressReport({ ...facades!, dressing: buildDressing(mass!, buildings!, facades!.ground, rand).dressing }, input).metrics;
      const R = (d: typeof after): [number, number, number, number] => [d.glassed / d.glassKeyBays, d.awned / d.shopBays, d.signed / d.shopBays, d.atmBuildings / d.streetBuildings];
      const [a4, a5, a6, aAtm] = R(after);
      const [, b5, b6, bAtm] = R(before);
      if (a6 < lowest.r6) lowest = { r6: a6, run: label(o) };
      if (a5 < lowestR5.r5) lowestR5 = { r5: a5, run: label(o) };
      if (m.r7 < lowestR7.r7) lowestR7 = { r7: m.r7, run: label(o) };
      for (const [x, v] of [[r4, a4], [r5, a5], [r6, a6], [r5Before, b5], [r6Before, b6]] as const) {
        x.lo = Math.min(x.lo, v);
        x.hi = Math.max(x.hi, v);
      }
      const total = (facades!.dressing ?? []).length + m.pieces;
      lines.push(
        `${label(o)}: street qualifying ${s.streetQualifying}, hostable ${s.streetHostable}, target ${s.target}, placed ${s.streetPlaced}, escapeShort ${m.escapeShort} (decision ${s.escapeShort}), R7 ${f3(m.r7)} | quiet sites ${s.quietSites}, hostable ${s.quietHostable}, placed ${s.quietPlaced}, ET took ${s.etColumns} host columns and ${s.etSites} sites | pack ${m.packEscapes}, code ${m.codeEscapes}, scale ${f3(m.scaleMin)} to ${f3(m.scaleMax)}, worst deck ${f3(m.worstDeck)}, joint ${f3(m.worstJoint)}, ladder foot ${f3(m.worstLadder)}, longest drop ${f3(m.longestDrop)} | R4 ${f3(a4)} R5 ${f3(a5)} (H1b ${f3(b5)}) R6 ${f3(a6)} (H1b ${f3(b6)}) ATM ${f3(aAtm)} (H1b ${f3(bAtm)}) | canopies ${m.canopies}, door corners bare ${walls.doorCornersBare}, air-conditioners ${m.aircons}, planters ${m.planters}, buildings at the prop cap ${walls.buildingsAtPropCap}, turned away by the cap ${walls.capTurnedAway}, by fit ${walls.noFit} | wall pieces ${m.pieces} (escape ${m.escapePieces}), with dressing ${total} of ${DRESS_MAX} | most pieces on a column ${m.maxPerColumn} | facing pairs ${m.facingPairs}`,
      );
      sum.pack += m.packEscapes;
      sum.code += m.codeEscapes;
      sum.canopies += m.canopies;
      sum.bare += walls.doorCornersBare;
      sum.ac += m.aircons;
      sum.planters += m.planters;
      sum.capAway += walls.capTurnedAway;
      sum.noFit += walls.noFit;
      sum.atProp += walls.buildingsAtPropCap;
      sum.escStreet += m.streetEscapes;
      sum.escQuiet += m.quietEscapes;
      sum.et += s.etColumns;
      sum.etSites += s.etSites;
      sum.walls += m.pieces;
      maxWalls = Math.max(maxWalls, m.pieces);
      maxTotal = Math.max(maxTotal, total);
      maxPerColumn = Math.max(maxPerColumn, m.maxPerColumn);
      scaleMin = Math.min(scaleMin, m.scaleMin);
      scaleMax = Math.max(scaleMax, m.scaleMax);
      worstDeck = Math.max(worstDeck, m.worstDeck);
      worstJoint = Math.max(worstJoint, m.worstJoint);
      worstLadder = Math.max(worstLadder, m.worstLadder);
      longestDrop = Math.max(longestDrop, m.longestDrop);
      facing += m.facingPairs;
      for (const [k, v] of Object.entries(m.reachByKeyUse)) reach[k] = Math.max(reach[k] ?? -Infinity, v);
      for (const [k, v] of Object.entries(m.byKind)) kinds[k] = (kinds[k] ?? 0) + v;
    }
    const reachRows = Object.entries(reach).sort().map(([k, v]) => `  ${k.padEnd(44)} ${f3(v)}`);
    console.log(
      `H2 REPORT, named\n${lines.join("\n")}\nTOTAL escapes street ${sum.escStreet}, quiet ${sum.escQuiet} (pack ${sum.pack}, code ${sum.code}); scale ${f3(scaleMin)} to ${f3(scaleMax)}; worst deck ${f3(worstDeck)}, joint ${f3(worstJoint)}, ladder foot ${f3(worstLadder)}; longest drop ${f3(longestDrop)}\nET took ${sum.et} host columns and ${sum.etSites} sites\nR4 ${f3(r4.lo)} to ${f3(r4.hi)}; R5 ${f3(r5.lo)} to ${f3(r5.hi)} (H1b ${f3(r5Before.lo)} to ${f3(r5Before.hi)}), lowest ${f3(lowestR5.r5)} on ${lowestR5.run}; R6 ${f3(r6.lo)} to ${f3(r6.hi)} (H1b ${f3(r6Before.lo)} to ${f3(r6Before.hi)}), LOWEST ${f3(lowest.r6)} ON ${lowest.run}; R7 lowest ${f3(lowestR7.r7)} on ${lowestR7.run}\ncanopies ${sum.canopies}; door corners bare ${sum.bare}; air-conditioners ${sum.ac}; planters ${sum.planters}; buildings at the prop cap ${sum.atProp}; turned away by the cap ${sum.capAway}, by fit ${sum.noFit}\nwall pieces ${sum.walls} (most in a run ${maxWalls}; with dressing most ${maxTotal} of ${DRESS_MAX}) ${JSON.stringify(kinds)}; most pieces on a column ${maxPerColumn}; facing pairs ${facing}\nREACH past the front cell edge, by key and use across (RQ: ${5})\n${reachRows.join("\n")}`,
    );
    expect(lowest.r6).toBeGreaterThanOrEqual(0.45);
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
    console.log(`H2 REPORT, outside\n${Object.entries(tally).map(([k, v]) => `${k}: stage 7 ok ${v.ok}, failed ${v.fail}, never reached ${v.before}`).join("\n")}\n${lines.join("\n")}`);
  });
});
