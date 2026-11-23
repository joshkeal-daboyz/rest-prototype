/**
 * Stage 7, section H2b, criterion 7's report (HEAVY: its own file, a 120 s timeout). For each of the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on) it prints: the party-wall faces by step (one or two storeys) and by where
 * (a row joint, an L's leg, a blind cell's side); the U1 fronts left undressed; the pieces by kind and by key; the faces where "no key twice running" took a fitting key away; the widest bare stretch; and the party-wall pieces in
 * all, with the walls and H1b's dressing against `DRESS_MAX` (C1, for J's draw calls). It says `SM_Prop_Pipe_Present_01` never fits (its count is 0). For the outside cities (3 x 3 and 6 x 4, seeds 1 to 20, off and on) it prints
 * whether stage 7 is ok, and its failure if not: reported, never asserted.
 *
 * The named runs must be ok (R-2); the numbers are reported, the few the ticket pins (no `_01`, no face where nothing fits, the stretch under `BLANK_RUN_MAX_M`) are asserted.
 */
import { describe, expect, it } from "vitest";
import type { CityPlanRun, CityWallPiece } from "../../core";
import { stageRand } from "../pipeline/seeds";
import { runCity } from "../stages";
import { DRESS_MAX } from "./dresskit";
import { buildParty } from "./party";
import { escapeWeight } from "./escape";
import { keyOf } from "./place";
import { partyReport } from "./partycheck";
import { BLANK_RUN_MAX_M } from "./partykit";
import { type City, cityOf, label, NAMED, stagesOf } from "./testcities";
import { yieldToWorker } from "../testing/yield";

const f3 = (n: number): string => n.toFixed(3);

describe("H2b report, criterion 7 (reported, not asserted, except as the ticket pins)", { timeout: 120_000 }, () => {
  it("prints the 20 named runs' numbers", async () => {
    const lines: string[] = [];
    const keys: Record<string, number> = {};
    const kinds: Record<string, number> = {};
    const sum = { faces: 0, one: 0, two: 0, row: 0, leg: 0, blind: 0, u1: 0, pieces: 0, removed: 0, keyRemoved: 0, walls: 0, pipe01: 0, nothing: 0 };
    let widest = 0;
    let maxParty = 0;
    let maxTotal = 0;
    let minFaces = Infinity;
    let fullest = { n: 0, run: "" };
    for (const o of NAMED) {
      await yieldToWorker();
      const r = cityOf(o);
      expect(r.ok, label(o)).toBe(true);
      if (!r.ok) continue;
      const { mass, buildings, facades } = r.plan.layers;
      const rep = partyReport(facades!, { mass: mass!, buildings: buildings! });
      expect(rep.failures.slice(0, 3), label(o)).toEqual([]);
      const m = rep.metrics;
      const stats = buildParty(mass!, buildings!, stageRand("facades", o.seed)).stats;
      // the fullest column counting H2's pieces, H1b's dressing and the party pieces together (reported only; PW7)
      const perCol = new Map<string, number>();
      const add = (k: string, n: number): void => void perCol.set(k, (perCol.get(k) ?? 0) + n);
      for (const p of facades!.dressing!) add(keyOf(p.cell), 1);
      for (const p of facades!.walls!) if (p.kind !== "escape") add(keyOf(p.cell), 1);
      const colAt = new Map(buildings!.columns!.map((c) => [keyOf(c), c] as const));
      const escapes = new Map<string, CityWallPiece[]>();
      for (const p of facades!.walls!) if (p.kind === "escape") (escapes.get(keyOf(p.cell)) ?? escapes.set(keyOf(p.cell), []).get(keyOf(p.cell))!).push(p);
      for (const [cell, ps] of escapes) add(cell, escapeWeight(colAt.get(cell)!, ps));
      const top = Math.max(...perCol.values());
      if (top > fullest.n) fullest = { n: top, run: label(o) };
      const total = facades!.dressing!.length + facades!.walls!.length;
      lines.push(
        `${label(o)}: faces ${m.faces} on ${m.walls} walls (one-storey step ${m.byStep["1"]}, two-storey ${m.byStep["2"]}) | by where: row joint ${m.byWhere.row}, L leg ${m.byWhere.leg}, blind cell ${m.byWhere.blind} | U1 fronts left undressed ${m.u1Faces} | pieces ${m.pieces} ${JSON.stringify(m.byKind)} (boards ${stats.boards}, window pairs ${stats.windowPairs}, pipes ${stats.pipes}) | running rule took a kind away on ${stats.runningRemoved} faces (a key away on ${stats.keyRemoved}) | widest bare ${f3(m.widestBare)} of ${BLANK_RUN_MAX_M} | Pipe_Present_01 ${m.pipe01}, faces where nothing fits ${m.nothingFits} | fullest column ${top} | walls ${facades!.walls!.length} (party ${m.pieces}), with dressing ${total} of ${DRESS_MAX}`,
      );
      sum.faces += m.faces;
      sum.one += m.byStep["1"];
      sum.two += m.byStep["2"];
      sum.row += m.byWhere.row;
      sum.leg += m.byWhere.leg;
      sum.blind += m.byWhere.blind;
      sum.u1 += m.u1Faces;
      sum.pieces += m.pieces;
      sum.removed += stats.runningRemoved;
      sum.keyRemoved += stats.keyRemoved;
      sum.walls += m.walls;
      sum.pipe01 += m.pipe01;
      sum.nothing += m.nothingFits;
      widest = Math.max(widest, m.widestBare);
      maxParty = Math.max(maxParty, m.pieces);
      maxTotal = Math.max(maxTotal, total);
      minFaces = Math.min(minFaces, m.faces);
      for (const [k, v] of Object.entries(m.byKey)) keys[k] = (keys[k] ?? 0) + v;
      for (const [k, v] of Object.entries(m.byKind)) kinds[k] = (kinds[k] ?? 0) + v;
    }
    console.log(
      `H2b REPORT, named\n${lines.join("\n")}\nTOTAL faces ${sum.faces} on ${sum.walls} walls (one-storey ${sum.one}, two-storey ${sum.two}); by where: row joint ${sum.row}, L leg ${sum.leg}, blind cell ${sum.blind}; U1 fronts left undressed ${sum.u1}; fewest faces in a run ${minFaces}\nPIECES ${sum.pieces} (most in a run ${maxParty}; with walls and dressing most ${maxTotal} of ${DRESS_MAX}) ${JSON.stringify(kinds)}\nKEYS ${JSON.stringify(keys)}\nfullest column with all three counted ${fullest.n} on ${fullest.run}
running rule removed a kind on ${sum.removed} faces, a key on ${sum.keyRemoved}; widest bare stretch ${f3(widest)} (limit ${BLANK_RUN_MAX_M}); Pipe_Present_01 ${sum.pipe01}; faces where nothing fits ${sum.nothing}`,
    );
    expect(sum.pipe01).toBe(0);
    expect(sum.nothing).toBe(0);
    expect(widest).toBeLessThanOrEqual(BLANK_RUN_MAX_M);
    expect(maxTotal).toBeLessThanOrEqual(DRESS_MAX);
  });

  it("prints the outside cities, reported and not asserted", async () => {
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
      await yieldToWorker();
    }
    console.log(`H2b REPORT, outside\n${Object.entries(tally).map(([k, v]) => `${k}: stage 7 ok ${v.ok}, failed ${v.fail}, never reached ${v.before}`).join("\n")}\n${lines.join("\n")}`);
  });
});
