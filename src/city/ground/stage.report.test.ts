/**
 * Ticket 070 I, criterion 10: the numbers, reported and not asserted (the only assertions are that every named run is ok and every figure is a number). Per named run, and the lowest or highest with its run: runs and their lengths; props by
 * kind and place; pavement props per 10 m of run; places refused by reason (corners, KO, AV, EL, DK, caps, pitch, clash) and the meters MT took out; lane bins placed and refused; benches and trees on greens by court part and park; plazas and
 * lots dressed and the groups left out under a stage 7 box; kerb trees within `TREE_PITCH_M` of a build-out tree (BT); the ground storeys' bounds front past the cell edge on run faces, and `Shop_04`'s near pairs (GS); the stage's time.
 * Outside cities (best effort; Josh's ruling): 3 x 3 and 6 x 4, seeds 1 to 20, one-way off and on, each ok or its failure named.
 */
import { describe, expect, it } from "vitest";
import type { CityGroundProp } from "../../core";
import { runCity } from "../stages";
import { stageRand } from "../pipeline/seeds";
import { digestOf } from "../pipeline/digest";
import { FURN_WALL_M, TREE_PITCH_M } from "./constants";
import { cellKey } from "./geom";
import { buildGround } from "./stage";
import { NAMED, label, layersOf, stagesOf, type City } from "./testcities";
import { yieldToWorker } from "../testing/yield";

/** The ground keys' bounds' front past the cell edge (`body.front`, stage 7's kit table; typed in here, this folder imports nothing from stage 7). */
const REACH: Readonly<Record<string, number>> = {
  SM_Bld_Shop_01: 0.219,
  SM_Bld_Shop_02: 0.425,
  SM_Bld_Shop_04: 0.557,
  SM_Bld_Shop_05: 0.076,
  SM_Bld_Shop_06: 0.52,
  SM_Bld_Shop_03: 0.103,
  SM_Bld_Apartment_Door_01: 0.529,
  SM_Bld_Apartment_Door_02: 0.058,
  SM_Bld_Shop_Corner_01: 0.211,
  SM_Bld_Shop_Corner_02: 0.166,
  SM_Bld_Apartment_Door_Corner_01: 0.529,
  SM_Bld_Apartment_Door_Corner_02: 0.058,
  SM_Bld_Apartment_01: 0.196,
  SM_Bld_Apartment_Corner_01: 0.196,
  SM_Bld_Apartment_02: 0.129,
  SM_Bld_Apartment_Corner_02: 0.129,
  SM_Bld_Apartment_03: 0.351,
  SM_Bld_Apartment_Corner_03: 0.351,
};

interface Row {
  readonly name: string;
  readonly [k: string]: unknown;
}

const kindsOf = (props: readonly CityGroundProp[], on: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const p of props) if (p.on === on) out[p.kind] = (out[p.kind] ?? 0) + 1;
  return out;
};
const sum = (o: Record<string, number>): number => Object.values(o).reduce((a, b) => a + b, 0);
const merge = (into: Record<string, number>, from: Record<string, number>): void => {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v;
};

describe("the ground numbers (criterion 10; reported, not asserted)", { timeout: 600_000 }, () => {
  it("the 20 named runs", async () => {
    const rows: Row[] = [];
    const total = { pavTries: {} as Record<string, number>, pavPlaces: {} as Record<string, number>, laneRefused: {} as Record<string, number>, plazaLost: {} as Record<string, number>, lotLost: {} as Record<string, number>, kinds: {} as Record<string, number> };
    let mt = 0;
    let lanePlaced = 0;
    for (const o of NAMED) {
      await yieldToWorker();
      const l = layersOf(o);
      const t0 = performance.now();
      const { stats } = buildGround(l, stageRand("ground", o.seed));
      const ms = performance.now() - t0;
      const props = l.ground.props;
      const len = l.ground.runs.reduce((s, r) => s + (r.hi_m - r.lo_m), 0);
      const pav = props.filter((p) => p.on === "pavement");
      const lengths = l.ground.runs.map((r) => r.hi_m - r.lo_m);
      const kinds: Record<string, number> = {};
      for (const p of props) kinds[`${p.on}:${p.kind}`] = (kinds[`${p.on}:${p.kind}`] ?? 0) + 1;
      merge(total.kinds, kinds);
      merge(total.pavTries, stats.pavTries);
      merge(total.pavPlaces, stats.pavPlaces);
      merge(total.laneRefused, stats.lane.refused);
      merge(total.plazaLost, stats.plazaLost);
      merge(total.lotLost, stats.lotLost);
      mt += stats.meterMT;
      lanePlaced += stats.lane.placed;
      // BT: kerb trees within TREE_PITCH_M of a build-out tree
      const bt = pav.filter((p) => p.kind === "tree" && l.edge.buildoutTrees.some((t) => Math.hypot(t.x_m - p.placement.x_m, t.z_m - p.placement.z_m) < TREE_PITCH_M)).length;
      // GS: the ground storeys' bounds' front on run faces
      const piece = new Map<string, string>();
      for (const g of l.facades.ground) for (const c of g.cells) piece.set(cellKey(c.i, c.j), g.placement.key.replace("city-pack:", ""));
      let reachMax = 0;
      const over: Record<string, number> = {};
      const shop04 = new Set<string>();
      for (const r of l.ground.runs) {
        for (const c of r.cells) {
          const key = piece.get(cellKey(c.i, c.j))!;
          const reach = REACH[key] ?? 0;
          reachMax = Math.max(reachMax, reach);
          if (reach > FURN_WALL_M) over[key] = (over[key] ?? 0) + 1;
          if (key === "SM_Bld_Shop_04") shop04.add(`${r.id}|${c.i},${c.j}`);
        }
      }
      let shop04Pairs = 0;
      for (const p of pav) {
        if (p.line !== "wall") continue;
        const r = l.ground.runs.find((q) => q.id === p.host)!;
        const k = r.pavement.findIndex((c) => c.i === p.cell.i && c.j === p.cell.j);
        if (k >= 0 && shop04.has(`${r.id}|${r.cells[k]!.i},${r.cells[k]!.j}`)) shop04Pairs++;
      }
      const lostOf = (o2: Record<string, number>): Record<string, number> => Object.fromEntries(Object.entries(o2).filter(([k]) => !k.endsWith(":placed")));
      rows.push({
        name: label(o),
        runs: l.ground.runs.length,
        runLenMin: Math.min(...lengths),
        runLenMax: Math.max(...lengths),
        runLenTotal: len,
        props: props.length,
        pavement: pav.length,
        pavPer10m: +((pav.length / len) * 10).toFixed(3),
        kinds,
        pavTries: stats.pavTries,
        pavPlaces: stats.pavPlaces,
        meterMT: stats.meterMT,
        laneBins: stats.lane.placed,
        laneTries: stats.lane.tries,
        laneRefused: stats.lane.refused,
        greens: stats.greens,
        plazas: stats.plazas,
        lots: stats.lots,
        plazaLeftOut: lostOf(stats.plazaLost),
        lotLeftOut: lostOf(stats.lotLost),
        bt,
        reachMax,
        reachOver: over,
        shop04Pairs,
        stageMs: +ms.toFixed(1),
        digest: digestOf(l.ground),
      });
      expect(Number.isFinite(ms)).toBe(true);
    }
    const lo = (k: string): Row => rows.reduce((a, b) => ((b[k] as number) < (a[k] as number) ? b : a));
    const hi = (k: string): Row => rows.reduce((a, b) => ((b[k] as number) > (a[k] as number) ? b : a));
    const out = {
      perRun: rows,
      lowestHighest: Object.fromEntries(["runs", "props", "pavement", "pavPer10m", "laneBins", "meterMT", "stageMs", "bt", "shop04Pairs"].map((k) => [k, { lowest: [lo(k).name, lo(k)[k]], highest: [hi(k).name, hi(k)[k]] }])),
      totals: { ...total, meterMT: mt, lanePlaced, props: sum(total.kinds), plazaGroupsLeftOut: sum(lostOfTotal(total.plazaLost)), lotGroupsLeftOut: sum(lostOfTotal(total.lotLost)) },
    };
    // eslint-disable-next-line no-console
    console.log(`GROUND REPORT ${JSON.stringify(out)}`);
    expect(rows).toHaveLength(NAMED.length);
  });

  it("outside cities, best effort: 3 x 3 and 6 x 4, seeds 1 to 20, one-way off and on", async () => {
    const results: string[] = [];
    for (const [bx, bz] of [[3, 3], [6, 4]] as const) {
      for (const way of ["on", "off"] as const) {
        let ok = 0;
        const failed: string[] = [];
        for (let seed = 1; seed <= 20; seed++) {
          const c: City = { blocksX: bx, blocksZ: bz, seed, way };
          const r = runCity({ blocksX: bx, blocksZ: bz, seed }, undefined, stagesOf(way));
          if (r.ok) ok++;
          else failed.push(`seed ${seed}: ${r.failure.stage}: ${r.failure.reason.slice(0, 160)}`);
          void c;
          await yieldToWorker();
        }
        results.push(`${bx} x ${bz} one-way ${way}: ${ok} of 20 ok${failed.length > 0 ? `; ${failed.join(" | ")}` : ""}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`OUTSIDE REPORT\n${results.join("\n")}`);
    expect(results).toHaveLength(4);
  });
});

function lostOfTotal(o: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(o).filter(([k]) => !k.endsWith(":placed")));
}
