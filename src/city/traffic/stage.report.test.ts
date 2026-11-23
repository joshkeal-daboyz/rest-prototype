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
import { ARM, CORNER_WALK_M, MAST, PUSH_BUTTON_KEY, boundsOf } from "./kit";
import { cornerOf, rectOf } from "./control";
import { NAMED, label, layersOf, stagesOf, warm } from "./testcities";
import { runCity } from "../stages";

const add = (into: Record<string, number>, k: string, n = 1): void => {
  into[k] = (into[k] ?? 0) + n;
};

describe("the traffic numbers (criterion 8; reported, not asserted)", { timeout: 600_000 }, () => {
  beforeAll(() => warm(NAMED), 120_000);
  it("the 20 named runs", () => {
    const rows: unknown[] = [];
    const totals = { mastsOff: 0, boxesOff: 0, buttonsOff: 0, buttonsPer: {} as Record<string, number>, margin: { min: Infinity, max: -Infinity }, pressMin: Infinity };
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
      // TR1d: the masts, buttons and boxes against the corner's walk square (the part at least CORNER_WALK_M in from both kerb edges), and each mast's margin to the walk's edge
      const byJunction = new Map(streets.junctions.map((j) => [j.id, j] as const));
      const inFrame = (host: string, cell: { i: number; j: number }, x: number, z: number): { a: number; b: number } => {
        const r = rectOf(byJunction.get(host)!);
        const c = cornerOf(r, cell.i > r.i1 ? 1 : -1, cell.j > r.j1 ? 1 : -1);
        return { a: (x - c.kx) * c.sx, b: (z - c.kz) * c.sz };
      };
      let mastsOff = 0;
      let boxesOff = 0;
      let buttonsOff = 0;
      const buttonsPer: Record<string, number> = {};
      let margin = { min: Infinity, max: -Infinity };
      let pressMin = Infinity;
      const btnD = boundsOf(PUSH_BUTTON_KEY).d;
      for (const p of traffic.pieces) {
        if (p.kind === "signalMast") {
          const pole = poleOf(p);
          const f = inFrame(p.host, p.cell, pole.x, pole.z);
          const m = Math.min(f.a, f.b) - MAST.foot.w / 2 - CORNER_WALK_M;
          margin = { min: Math.min(margin.min, m), max: Math.max(margin.max, m) };
          if (m < -1e-6 || Math.max(f.a, f.b) + MAST.foot.w / 2 > 5 + 1e-6) mastsOff++;
          const n = traffic.pieces.filter((q) => q.kind === "pushButton" && q.group === p.group && q.host === p.host).length;
          add(buttonsPer, String(n));
        } else if (p.kind === "signalBox") {
          const lo = inFrame(p.host, p.cell, p.placement.x_m - p.size.x_m / 2, p.placement.z_m - p.size.z_m / 2);
          const hi = inFrame(p.host, p.cell, p.placement.x_m + p.size.x_m / 2, p.placement.z_m + p.size.z_m / 2);
          if (Math.min(lo.a, hi.a, lo.b, hi.b) < CORNER_WALK_M - 1e-6) boxesOff++;
        } else if (p.kind === "pushButton") {
          const mast = traffic.pieces.find((q) => q.kind === "signalMast" && q.group === p.group && q.host === p.host)!;
          const f = inFrame(p.host, mast.cell, p.placement.x_m, p.placement.z_m);
          // the press point is 0.3 m in front of the button's face: on the face's own side, toward its crossing
          const dir = [Math.round(Math.sin((p.placement.yaw_deg * Math.PI) / 180)), Math.round(Math.cos((p.placement.yaw_deg * Math.PI) / 180))];
          const r = rectOf(byJunction.get(p.host)!);
          const c = cornerOf(r, mast.cell.i > r.i1 ? 1 : -1, mast.cell.j > r.j1 ? 1 : -1);
          const pa = f.a + dir[0]! * c.sx * (btnD / 2 + 0.3);
          const pb = f.b + dir[1]! * c.sz * (btnD / 2 + 0.3);
          // the button's centre must be over the walk square; its press point (0.3 m in front of the face) lies on the pack's walk, nearer the kerb than the square (reported as the smallest a or b of a press point)
          if (Math.min(f.a, f.b) < CORNER_WALK_M - 1e-6) buttonsOff++;
          pressMin = Math.min(pressMin, pa, pb);
        }
      }
      totals.mastsOff += mastsOff;
      totals.boxesOff += boxesOff;
      totals.buttonsOff += buttonsOff;
      for (const [k, v] of Object.entries(buttonsPer)) add(totals.buttonsPer, k, v);
      totals.pressMin = Math.min(totals.pressMin, pressMin);
      totals.margin = { min: Math.min(totals.margin.min, margin.min), max: Math.max(totals.margin.max, margin.max) };
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
      rows.push({ run: label(o), control, pieces, parking: { stretches: pk.stretches, signs: pk.pieces.length, skipped: pk.skipped.length, reasons }, headsOverOwnLane: over, headsNotOver: notOver, mastsOffWalk: mastsOff, boxesOffWalk: boxesOff, buttonsOffWalk: buttonsOff, buttonsPerMast: buttonsPer, closestStage8Prop_m: Number(dProp.toFixed(2)), closestStage7Box_m: Number(dBox.toFixed(2)), placeMs: ms });
      expect(Number.isFinite(over + notOver)).toBe(true);
    }
    // eslint-disable-next-line no-console
    console.log(`TRAFFIC REPORT ${JSON.stringify({ rows, total, mastWalk: totals, nearestProp, nearestBox, slowest, parkTotal, parkRange: park })}`);
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
