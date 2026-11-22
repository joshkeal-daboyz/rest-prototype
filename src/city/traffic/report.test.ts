/**
 * Ticket 070 TR1, criterion 8: the numbers, reported and not asserted (the only assertions are that every named run is ok and every figure is a number). Per named run: junctions by control and kind, pieces by kind, the approaches whose heads hang over
 * their own inbound lane and those that do not, the closest clearance to stage 7 and to stage 8 (each with its run), and the stage's time. Outside cities (best effort; Josh's ruling): 3 x 3 and 6 x 4, seeds 1 to 20, one-way off and on, each ok or
 * its failure named. Read the `TRAFFIC REPORT` and `OUTSIDE REPORT` lines of the run's output.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { stageRand } from "../pipeline/seeds";
import { buildTraffic } from "./stage";
import { clearOf, closestBox, closestProp, poleOf } from "./clear";
import { parkingSigns } from "./signs";
import { edgeInfoOf } from "./control";
import { ARM } from "./kit";
import { NAMED, label, layersOf, stagesOf, warm } from "./testcities";
import { runCity } from "../stages";

const add = (into: Record<string, number>, k: string, n = 1): void => {
  into[k] = (into[k] ?? 0) + n;
};

describe("the traffic numbers (criterion 8; reported, not asserted)", { timeout: 600_000 }, () => {
  beforeAll(() => warm(NAMED), 120_000);
  it("the 20 named runs", () => {
    const rows: unknown[] = [];
    const total = { control: {} as Record<string, number>, kinds: {} as Record<string, number>, pieces: {} as Record<string, number>, over: 0, notOver: 0 };
    let nearestProp = { d: Infinity, run: "" };
    let nearestBox = { d: Infinity, run: "" };
    let slowest = { ms: 0, run: "" };
    const parkTotal = { stretches: 0, signs: 0, skipped: 0, reasons: {} as Record<string, number> };
    const park = { stretches: [Infinity, 0], signs: [Infinity, 0], skipped: [Infinity, 0] };
    for (const o of NAMED) {
      const l = layersOf(o);
      const { streets, edge, traffic } = l;
      const byJ = new Map(streets.junctions.map((j) => [j.id, j] as const));
      const control: Record<string, number> = {};
      const kinds: Record<string, number> = {};
      const pieces: Record<string, number> = {};
      for (const t of traffic.junctions) {
        const j = byJ.get(t.junction)!;
        add(control, `${t.control} ${j.kind}${j.inner ? "" : " edge"}`);
        add(total.control, `${t.control} ${j.kind}${j.inner ? "" : " edge"}`);
      }
      for (const p of traffic.pieces) {
        add(pieces, p.kind);
        add(total.pieces, p.kind);
      }
      void kinds;
      // heads over the inbound lane: each arm's two heads lie 4.318 and 6.009 m along the arm from its pole; the inbound lane is the lane cell on the driver's right of the street's centre line
      const lanes = new Map<string, { lo: number; hi: number; mid: number }[]>();
      for (const c of edge.cells) {
        if (c.role !== "lane" || c.street === null) continue;
        const st = streets.streets.find((s) => s.id === c.street)!;
        const x = st.axis === "x" ? c.j * 5 : c.i * 5;
        const list = lanes.get(c.street);
        if (list) list.push({ lo: x, hi: x + 5, mid: x + 2.5 });
        else lanes.set(c.street, [{ lo: x, hi: x + 5, mid: x + 2.5 }]);
      }
      let over = 0;
      let notOver = 0;
      for (const arm of traffic.pieces) {
        if (arm.kind !== "signalArm") continue;
        const a = traffic.junctions.flatMap((t) => t.approaches).find((q) => q.id === arm.approach)!;
        const st = streets.streets.find((s) => s.id === a.street)!;
        const mast = traffic.pieces.find((p) => p.kind === "signalMast" && p.group === arm.group)!;
        const pole = poleOf(mast);
        const y = arm.placement.yaw_deg;
        const run: [number, number] = y === 0 ? [0, 1] : y === 90 ? [1, 0] : y === 180 ? [0, -1] : [-1, 0];
        const alongX = run[0] !== 0;
        const across = alongX ? pole.x : pole.z;
        const dir = alongX ? run[0] : run[1];
        const inbound = (lanes.get(a.street) ?? []).filter((q) => (q.mid - st.centre_m) * dir > 0);
        const heads = ARM.headsAlong.map((d) => across + dir * d);
        const hit = heads.some((h) => inbound.some((q) => h >= q.lo && h < q.hi));
        if (hit) over++;
        else notOver++;
      }
      total.over += over;
      total.notOver += notOver;
      const ctx = clearOf({ mass: l.mass, edge: l.edge, facades: l.facades, ground: l.ground });
      // TR1b: the parking signs (stretches, signs placed, skips by reason)
      const pk = parkingSigns(l, ctx, edgeInfoOf(edge));
      const reasons: Record<string, number> = {};
      for (const k of pk.skipped) {
        add(reasons, k.reason);
        add(parkTotal.reasons, k.reason);
      }
      parkTotal.stretches += pk.stretches;
      parkTotal.signs += pk.pieces.length;
      parkTotal.skipped += pk.skipped.length;
      for (const [name, n] of [["stretches", pk.stretches], ["signs", pk.pieces.length], ["skipped", pk.skipped.length]] as const) {
        park[name][0] = Math.min(park[name][0]!, n);
        park[name][1] = Math.max(park[name][1]!, n);
      }
      expect(pk.pieces.length + pk.skipped.length).toBe(pk.stretches);
      let dProp = Infinity;
      let dBox = Infinity;
      for (const p of traffic.pieces) {
        if (p.grounded) dProp = Math.min(dProp, closestProp(ctx, p));
        dBox = Math.min(dBox, closestBox(ctx, p));
      }
      if (dProp < nearestProp.d) nearestProp = { d: dProp, run: label(o) };
      if (dBox < nearestBox.d) nearestBox = { d: dBox, run: label(o) };
      const t0 = Date.now();
      buildTraffic(l, stageRand("traffic", o.seed));
      const ms = Date.now() - t0;
      if (ms > slowest.ms) slowest = { ms, run: label(o) };
      rows.push({ run: label(o), control, pieces, parking: { stretches: pk.stretches, signs: pk.pieces.length, skipped: pk.skipped.length, reasons }, headsOverOwnLane: over, headsNotOver: notOver, closestStage8Prop_m: Number(dProp.toFixed(2)), closestStage7Box_m: Number(dBox.toFixed(2)), placeMs: ms });
      expect(Number.isFinite(over + notOver)).toBe(true);
    }
    // eslint-disable-next-line no-console
    console.log(`TRAFFIC REPORT ${JSON.stringify({ rows, total, nearestProp, nearestBox, slowest, parkTotal, parkRange: park })}`);
    expect(rows).toHaveLength(20);
  });

  const SIZES: readonly (readonly [number, number])[] = [
    [3, 3],
    [6, 4],
  ];
  for (const [bx, bz] of SIZES) {
    for (const way of ["off", "on"] as const) {
      it(`outside cities: ${bx} x ${bz}, seeds 1 to 20, one-way ${way} (best effort, report only)`, async () => {
        let ok = 0;
        const fails: string[] = [];
        for (let seed = 1; seed <= 20; seed++) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          const r = runCity({ blocksX: bx, blocksZ: bz, seed }, undefined, stagesOf(way));
          if (r.ok) ok++;
          else fails.push(`seed ${seed}: ${r.failure.stage}: ${r.failure.reason}`);
        }
        const line = `${bx} x ${bz} one-way ${way}: ${ok} of 20 ok${fails.map((f) => `
  ${f}`).join("")}`;
        // eslint-disable-next-line no-console
        console.log(`OUTSIDE REPORT ${line}`);
        expect(ok + fails.length).toBe(20);
      });
    }
  }
});
