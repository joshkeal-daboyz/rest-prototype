/**
 * Ticket 073 D1, on the 20 named runs (6 x 6 seeds 1 to 10, one-way off and on): the layer (criterion 1), the slots (3), the pavement's keeps and the clear walk (4), the shopfronts (1, 5 of the fixtures), T-1 and T-2 (6),
 * dark and textured (7), R-1 to R-7 and X-1 (9) with the four digest pins, and the numbers (10, reported). Each city is built once per test file (`testcities.ts`). The circuit is empty until K2 (stage 6), so no keep
 * against it is judged here: the fixtures prove each one (`fixtures.test.ts`).
 */
import { describe, expect, it } from "vitest";
import { CITY_GROUND_VARIANT, CITY_TECH_PIECE_KINDS, type CityEraPiece, type CityTechPieceKind } from "../../core";
import { digestOf } from "../pipeline/digest";
import { runEraStages } from "../pipeline/eras";
import { pictureProblems } from "../pipeline/picture";
import { stageRand } from "../pipeline/seeds";
import { BUILT_STAGES, ERA_STAGES, runCity } from "../stages";
import { CAMERAS, BOLT_ONS, KERB_LINE, SIGNS, SHOP_DOUBLE, SHOP_SINGLE, TALLS, TECH_KIT, WALL_LINE } from "./kit";
import { buildTech, techPicture, techStage } from "./stage";
import { CLEAR_WALK_M, CELL_M, FURN_CORNER_M, FURN_GAP_M, FURN_KEEP_M, FURN_MAX_H_M, FURN_PITCH_M, STOREY_M } from "./constants";
import { geoOf } from "./runs";
import { DRESS_BOUNDS } from "../facades/dresskit";
import { NOVELTY_BOUNDS } from "../facades/noveltykit";
import { ROOF_BOUNDS } from "../facades/roofkit";
import { CODE_ESCAPE, CODE_ESCAPE_KEY, WALL_BOUNDS } from "../facades/wallkit";
import { DEFAULT, NAMED, PINNED, cleanOf, historyPlanOf, label, techOf } from "./testcities";

const FORBIDDEN = /Sign_Billboard|Sign_Ad_|Sign_Neon|Pipes_01|Overhang|Soda|Doorway|Powerpoll|Streetlight/;

interface R {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}
const rectOf = (a: CityEraPiece): R => ({ x0: a.placement.x_m - a.size.x_m / 2, x1: a.placement.x_m + a.size.x_m / 2, z0: a.placement.z_m - a.size.z_m / 2, z1: a.placement.z_m + a.size.z_m / 2 });
const dist = (a: R, b: R): number => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.z0 - b.z1, b.z0 - a.z1));
const over = (a: R, b: R, m = 0): boolean => a.x0 < b.x1 + m - 1e-6 && b.x0 < a.x1 + m - 1e-6 && a.z0 < b.z1 + m - 1e-6 && b.z0 < a.z1 + m - 1e-6;
const SIDE_OF_YAW: Record<number, "+z" | "+x" | "-z" | "-x"> = { 0: "+z", 90: "+x", 180: "-z", 270: "-x" };

describe("the tech pass on the 20 named runs", { timeout: 600_000 }, () => {
  it("criterion 1, the layer: ids tech:<kind>:..., unique; only the kit's kinds; changes are only removes of shopfront dressing; each add's district holds its cell", () => {
    for (const c of NAMED) {
      const { build } = techOf(c);
      const plan = cleanOf(c);
      const hist = historyPlanOf(c).layers.history!;
      const ids = new Set<string>();
      const districtOfBlock = new Map(hist.districts.flatMap((d) => d.blocks.map((b) => [b, d.id] as const)));
      const blockAt = new Map(plan.layers.mass!.built.map((b) => [`${b.i},${b.j}`, b.block] as const));
      const runs = new Map(plan.layers.ground!.runs.map((r) => [r.id, r] as const));
      expect(build.layer.stage).toBe("tech");
      for (const a of build.layer.adds) {
        expect(a.id.startsWith(`tech:${a.kind}:`) || (a.kind === "pavement" && a.id.startsWith("tech:pavement:")), `${label(c)} ${a.id}`).toBe(true);
        expect(ids.has(a.id), `${label(c)} duplicate ${a.id}`).toBe(false);
        ids.add(a.id);
        expect(CITY_TECH_PIECE_KINDS).toContain(a.kind);
        expect(["overhang"]).not.toContain(a.kind);
        let block: string | undefined;
        if (a.kind === "pavement") {
          const parts = a.id.slice("tech:pavement:".length).split("|");
          parts.pop();
          parts.pop();
          block = runs.get(parts.join("|"))?.block;
        } else block = blockAt.get(`${a.cell.i},${a.cell.j}`);
        expect(block, `${label(c)} ${a.id} stands in no block`).toBeDefined();
        expect(districtOfBlock.get(block!), `${label(c)} ${a.id}`).toBe(a.district);
      }
      for (const ch of build.layer.changes) {
        expect(ch.op).toBe("remove");
        expect("list" in ch.ref && ch.ref.list === "facades.dressing").toBe(true);
      }
      expect(build.layer.adds.length).toBeGreaterThan(0);
    }
  });

  it("criterion 3, the slots: each add stands in its slot; no billboard frame, tall billboard, ad, neon, vertical pipe or overhang key anywhere", () => {
    for (const c of NAMED) {
      const plan = cleanOf(c);
      const { build } = techOf(c);
      const built = new Map(plan.layers.mass!.built.map((b) => [`${b.i},${b.j}`, b] as const));
      const column = new Map(plan.layers.buildings!.columns!.map((b) => [`${b.i},${b.j}`, b] as const));
      const building = new Map(plan.layers.buildings!.buildings.map((b) => [b.id, b] as const));
      for (const a of build.layer.adds) {
        const key = a.placement.key;
        expect(FORBIDDEN.test(key), `${label(c)} ${key}`).toBe(false);
        expect(TECH_KIT.some((e) => e.key === key && e.placed), `${label(c)} ${key} is not a placed kit key`).toBe(true);
        if (a.kind === "shopfront") {
          expect([SHOP_SINGLE, SHOP_DOUBLE]).toContain(key);
          expect(a.placement.y_m).toBe(0);
          continue;
        }
        if (a.kind === "pavement") {
          expect([...WALL_LINE, ...KERB_LINE]).toContain(key);
          expect(a.size.h_m).toBeLessThanOrEqual(FURN_MAX_H_M);
          expect(a.placement.y_m).toBe(0);
          continue;
        }
        // a wall piece: above the ground storey, its back on a wall of its host cell, its host cell's own side
        const cell = built.get(`${a.cell.i},${a.cell.j}`)!;
        const side = SIDE_OF_YAW[a.placement.yaw_deg]!;
        expect(side, `${label(c)} ${a.id} yaw`).toBeDefined();
        const r = rectOf(a);
        const wall = side === "+x" ? (a.cell.i + 1) * CELL_M : side === "-x" ? a.cell.i * CELL_M : side === "+z" ? (a.cell.j + 1) * CELL_M : a.cell.j * CELL_M;
        const back = side === "+x" ? r.x0 : side === "-x" ? r.x1 : side === "+z" ? r.z0 : r.z1;
        expect(Math.abs(back - wall), `${label(c)} ${a.id} back plane`).toBeLessThan(1e-6);
        expect(a.placement.y_m, `${label(c)} ${a.id} above the ground storey`).toBeGreaterThanOrEqual(STOREY_M);
        const storey = Math.floor(a.placement.y_m / STOREY_M + 1e-9);
        const storeys = building.get(column.get(`${a.cell.i},${a.cell.j}`)!.building)!.storeys;
        expect(storey).toBeLessThanOrEqual(storeys - 1);
        const open = cell.open.find((o) => o.side === side);
        if (a.kind === "bolt-on") {
          expect(open, `${label(c)} ${a.id}`).toBeDefined();
          expect(BOLT_ONS).toContain(key);
        } else if (a.kind === "camera") {
          expect(open).toBeDefined();
          expect(CAMERAS).toContain(key);
          expect(storey, "cameras are storey 1 only").toBe(1);
        } else if (a.kind === "sign") {
          expect(open?.faces, `${label(c)} ${a.id} a sign is on a street face`).toBe("street");
          expect(SIGNS).toContain(key);
          expect(storey, "signs are storey 1 only").toBe(1);
        } else {
          expect(a.kind).toBe("tall");
          expect(open, `${label(c)} ${a.id} a tall piece is on a side wall, never an open face`).toBeUndefined();
          expect(TALLS).toContain(key);
          const nCol = column.get(`${a.cell.i + (side === "+x" ? 1 : side === "-x" ? -1 : 0)},${a.cell.j + (side === "+z" ? 1 : side === "-z" ? -1 : 0)}`)!;
          expect(building.get(nCol.building)!.storeys, `${label(c)} ${a.id} over a lower neighbour`).toBeLessThan(storeys);
          expect(storey).toBeGreaterThanOrEqual(building.get(nCol.building)!.storeys);
        }
      }
    }
  });

  it("criterion 4, the pavement: every add keeps the corners, the 7 m pitch, KO, 0.3 m from stage 8 and 9 footprints, and 2 m of clear walk counting stage 8's pieces, its own and the shopfront panels", () => {
    for (const c of NAMED) {
      const plan = cleanOf(c);
      const { build } = techOf(c);
      const L = plan.layers;
      const runs = new Map(L.ground!.runs.map((r) => [r.id, geoOf(r)] as const));
      const runOfBuilding = new Map(L.ground!.runs.flatMap((r) => r.buildings.map((b) => [b, geoOf(r)] as const)));
      const feet: { r: R; flat: boolean; host: string | null; line: "wall" | "kerb" | null }[] = [];
      for (const p of L.ground!.props) {
        feet.push({ r: { x0: p.placement.x_m - p.size.x_m / 2, x1: p.placement.x_m + p.size.x_m / 2, z0: p.placement.z_m - p.size.z_m / 2, z1: p.placement.z_m + p.size.z_m / 2 }, flat: p.flat, host: p.on === "pavement" ? p.host : null, line: null });
      }
      for (const p of L.traffic!.pieces) feet.push({ r: { x0: p.placement.x_m - p.size.x_m / 2, x1: p.placement.x_m + p.size.x_m / 2, z0: p.placement.z_m - p.size.z_m / 2, z1: p.placement.z_m + p.size.z_m / 2 }, flat: false, host: null, line: null });
      const ko: R[] = [];
      const variant = new Map(L.edge!.ground!.filter((g) => g.cells === 1).map((g) => [`${g.i},${g.j}`, g.variant] as const));
      for (const e of L.edge!.cells) {
        const dip = e.role === "pavement" && ((variant.get(`${e.i},${e.j}`) ?? 0) & CITY_GROUND_VARIANT.pavementDip) !== 0;
        if (e.role === "kerbCut" || e.role === "pavementCorner" || dip) ko.push({ x0: e.i * 5, x1: e.i * 5 + 5, z0: e.j * 5, z1: e.j * 5 + 5 });
      }
      const pav = build.layer.adds.filter((a) => a.kind === "pavement");
      const panels = build.layer.adds.filter((a) => a.kind === "shopfront");
      const frame = (run: ReturnType<typeof geoOf>, r: R): { s0: number; s1: number; t0: number; t1: number } =>
        run.along === "x"
          ? { s0: r.x0 - run.lo_m, s1: r.x1 - run.lo_m, t0: run.sgn === 1 ? r.z0 - run.wall_m : run.wall_m - r.z1, t1: run.sgn === 1 ? r.z1 - run.wall_m : run.wall_m - r.z0 }
          : { s0: r.z0 - run.lo_m, s1: r.z1 - run.lo_m, t0: run.sgn === 1 ? r.x0 - run.wall_m : run.wall_m - r.x1, t1: run.sgn === 1 ? r.x1 - run.wall_m : run.wall_m - r.x0 };
      const lineOfT = (t0: number, t1: number): "wall" | "kerb" => ((t0 + t1) / 2 < CELL_M / 2 ? "wall" : "kerb");
      const nearOf = new Map<string, { feet: typeof feet; ko: R[]; props: NonNullable<typeof L.ground>["props"] }>();
      const near = (run: ReturnType<typeof geoOf>): { feet: typeof feet; ko: R[]; props: NonNullable<typeof L.ground>["props"] } => {
        let n = nearOf.get(run.id);
        if (!n) {
          const pad = 8;
          const strip: R = run.along === "x" ? { x0: run.lo_m - pad, x1: run.hi_m + pad, z0: Math.min(run.wall_m, run.kerb_m) - pad, z1: Math.max(run.wall_m, run.kerb_m) + pad } : { x0: Math.min(run.wall_m, run.kerb_m) - pad, x1: Math.max(run.wall_m, run.kerb_m) + pad, z0: run.lo_m - pad, z1: run.hi_m + pad };
          n = { feet: feet.filter((f) => over(f.r, strip)), ko: ko.filter((k) => over(k, strip)), props: L.ground!.props.filter((p) => p.on === "pavement" && p.host === run.id) };
          nearOf.set(run.id, n);
        }
        return n;
      };
      const panelsOf = new Map<string, typeof panels>();
      for (const p of panels) {
        const id = runOfBuilding.get(p.id.slice("tech:shopfront:".length, p.id.lastIndexOf("|")))!.id;
        const l = panelsOf.get(id);
        if (l) l.push(p);
        else panelsOf.set(id, [p]);
      }
      const pavOf = new Map<string, typeof pav>();
      for (const o of pav) {
        const po = o.id.slice("tech:pavement:".length).split("|");
        po.pop();
        po.pop();
        const k = po.join("|");
        const l = pavOf.get(k);
        if (l) l.push(o);
        else pavOf.set(k, [o]);
      }
      for (const a of pav) {
        const parts = a.id.slice("tech:pavement:".length).split("|");
        parts.pop();
        const line = parts.pop() as "wall" | "kerb";
        const run = runs.get(parts.join("|"))!;
        const nr = near(run);
        const mates = pavOf.get(run.id)!;
        const others = [...mates.filter((x) => x !== a), ...(panelsOf.get(run.id) ?? [])];
        expect(run, `${label(c)} ${a.id}`).toBeDefined();
        const me = rectOf(a);
        const f = frame(run, me);
        const mid = (f.s0 + f.s1) / 2;
        expect(lineOfT(f.t0, f.t1), `${label(c)} ${a.id} line`).toBe(line);
        expect(f.s0, `${label(c)} ${a.id} corner`).toBeGreaterThanOrEqual(FURN_CORNER_M - 1e-6);
        expect(f.s1, `${label(c)} ${a.id} corner`).toBeLessThanOrEqual(run.len - FURN_CORNER_M + 1e-6);
        for (const o of mates) {
          if (o === a) continue;
          const ol = o.id.slice(0, o.id.lastIndexOf("|")).split("|").pop();
          if (ol !== line) continue;
          const fo = frame(run, rectOf(o));
          expect(Math.abs((fo.s0 + fo.s1) / 2 - mid), `${label(c)} ${a.id} pitch against ${o.id}`).toBeGreaterThanOrEqual(FURN_PITCH_M - 1e-6);
        }
        for (const p of nr.props) {
          const fp = frame(run, { x0: p.placement.x_m - p.size.x_m / 2, x1: p.placement.x_m + p.size.x_m / 2, z0: p.placement.z_m - p.size.z_m / 2, z1: p.placement.z_m + p.size.z_m / 2 });
          if (lineOfT(fp.t0, fp.t1) === line) expect(Math.abs((fp.s0 + fp.s1) / 2 - mid), `${label(c)} ${a.id} pitch against stage 8's ${p.kind}`).toBeGreaterThanOrEqual(FURN_PITCH_M - 1e-6);
        }
        for (const k of nr.ko) expect(dist(me, k), `${label(c)} ${a.id} KO`).toBeGreaterThanOrEqual(FURN_KEEP_M - 1e-6);
        for (const o of nr.feet) if (!o.flat) expect(over(me, o.r, FURN_GAP_M), `${label(c)} ${a.id} gap`).toBe(false);
        for (const o of others) expect(over(me, rectOf(o), FURN_GAP_M), `${label(c)} ${a.id} gap against ${o.id}`).toBe(false);
        // the clear walk
        const spans: [number, number][] = [[Math.max(0, f.t0), Math.min(CELL_M, f.t1)]];
        const consider = (r: R): void => {
          const g = frame(run, r);
          if (g.s0 < f.s1 - 1e-9 && g.s1 > f.s0 + 1e-9 && g.t0 < CELL_M - 1e-9 && g.t1 > 1e-9) spans.push([Math.max(0, g.t0), Math.min(CELL_M, g.t1)]);
        };
        for (const o of nr.feet) if (!o.flat) consider(o.r);
        for (const o of others) consider(rectOf(o));
        spans.sort((p, q) => p[0] - q[0]);
        let widest = 0;
        let at = 0;
        for (const [lo, hi] of spans) {
          widest = Math.max(widest, lo - at);
          at = Math.max(at, hi);
        }
        widest = Math.max(widest, CELL_M - at);
        expect(widest, `${label(c)} ${a.id} clear walk`).toBeGreaterThanOrEqual(CLEAR_WALK_M - 1e-6);
      }
      // a panel stands on the wall edge in front of its shop, 0.709 m deep
      for (const a of panels) {
        const bparts = a.id.slice("tech:shopfront:".length).split("|");
        bparts.pop();
        const run = runOfBuilding.get(bparts.join("|"))!;
        expect(run, `${label(c)} ${a.id} stands in no pavement run`).toBeDefined();
        const f = frame(run, rectOf(a));
        expect(Math.abs(f.t0), `${label(c)} ${a.id} on the wall edge`).toBeLessThan(1e-6);
        expect(f.t1).toBeCloseTo(0.709, 6);
      }
    }
  });

  it("criterion 1 and 5 (the shops): every panel is on a single or double shop, never a corner shop; each remove is dressing of that shop's front face below 3 m; nothing is swapped", () => {
    for (const c of NAMED) {
      const plan = cleanOf(c);
      const { build } = techOf(c);
      const L = plan.layers;
      const shopAt = new Map<string, NonNullable<typeof L.facades>["ground"][number]>(L.facades!.ground.map((g) => [`${g.building}|${g.cells[0]!.i},${g.cells[0]!.j}`, g] as const));
      const removed = new Set<number>();
      const covered = new Set<string>();
      for (const a of build.layer.adds.filter((x) => x.kind === "shopfront")) {
        const g = shopAt.get(a.id.slice("tech:shopfront:".length))!;
        expect(g, `${label(c)} ${a.id}`).toBeDefined();
        expect(["shop", "shopDouble"], `${label(c)} ${a.id} is a ${g.kind}`).toContain(g.kind);
        expect(a.placement.key).toBe(g.kind === "shop" ? SHOP_SINGLE : SHOP_DOUBLE);
        covered.add(`${g.building}|${g.cells[0]!.i},${g.cells[0]!.j}`);
      }
      for (const ch of build.layer.changes) {
        expect(ch.op).toBe("remove");
        if (!("list" in ch.ref) || ch.ref.list !== "facades.dressing") throw new Error("a change that is not a dressing remove");
        const d = L.facades!.dressing![ch.ref.index]!;
        expect(d.placement.key).toBe(ch.ref.key);
        expect(removed.has(ch.ref.index), "removed twice").toBe(false);
        removed.add(ch.ref.index);
        expect(["glass", "awning", "fasciaSign", "bladeSign"]).toContain(d.kind);
        expect(d.wrap).toBe(false);
        expect(d.placement.y_m).toBeLessThan(3);
        expect(covered.has(`${d.building}|${d.cell.i},${d.cell.j}`), `${label(c)} a remove of dressing no panel covers`).toBe(true);
      }
    }
  });


  it("criterion 3, the free third: every bolt-on, camera and sign (and every tall piece over its whole face) is clear of stage 7's escapes, canopies, aircon, planters, dressing, novelty signs and roof pieces, read from the plan's own layers", () => {
    const OUT = 1.5;
    for (const c of NAMED) {
      const F = cleanOf(c).layers.facades!;
      interface B {
        r: R;
        y0: number;
        y1: number;
        what: string;
      }
      const boxes: B[] = [];
      const bnd = (key: string): { w: number; h: number; d: number } => {
        const e = (DRESS_BOUNDS as Record<string, { w: number; h: number; d: number }>)[key] ?? (WALL_BOUNDS as Record<string, { w: number; h: number; d: number }>)[key] ?? (NOVELTY_BOUNDS as Record<string, { w: number; h: number; d: number }>)[key] ?? (ROOF_BOUNDS as Record<string, { w: number; h: number; d: number }>)[key];
        if (!e) throw new Error(`no bounds for ${key}`);
        return e;
      };
      const foot = (x: number, z: number, w: number, d: number, yaw: number): R => (yaw % 180 === 0 ? { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 } : { x0: x - d / 2, x1: x + d / 2, z0: z - w / 2, z1: z + w / 2 });
      for (const p of F.dressing!) {
        if (p.kind === "glass") continue;
        const e = bnd(p.placement.key);
        boxes.push({ r: foot(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), y0: p.placement.y_m, y1: p.placement.y_m + e.h, what: p.kind });
      }
      for (const p of F.novelty!) {
        const e = bnd(p.placement.key);
        boxes.push({ r: foot(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), y0: p.placement.y_m, y1: p.placement.y_m + e.h, what: "novelty" });
      }
      for (const p of F.roofs!) {
        const e = bnd(p.placement.key);
        boxes.push({ r: foot(p.placement.x_m, p.placement.z_m, e.w, e.d, p.placement.yaw_deg), y0: p.placement.y_m, y1: p.placement.y_m + e.h, what: "roof" });
      }
      for (const p of F.walls!) {
        if (p.kind === "partyBoard" || p.kind === "partyPipe" || p.kind === "partyWindow") continue;
        const pl = p.placement;
        if (p.kind === "escape" && pl.key === CODE_ESCAPE_KEY) {
          boxes.push({ r: foot(pl.x_m, pl.z_m, CODE_ESCAPE.w, CODE_ESCAPE.d, pl.yaw_deg), y0: pl.y_m + Math.min(0, ...p.boxes.map((b) => b.y_m - b.h_m / 2)), y1: pl.y_m + Math.max(0, ...p.boxes.map((b) => b.y_m + b.h_m / 2)), what: "escape" });
          continue;
        }
        const e = bnd(pl.key);
        boxes.push({ r: foot(pl.x_m, pl.z_m, e.w, e.d, pl.yaw_deg), y0: pl.y_m, y1: pl.y_m + e.h * p.scaleY, what: p.kind });
        for (const b of p.boxes) {
          const q = pl.yaw_deg % 360;
          const cx = q === 0 ? b.x_m : q === 90 ? b.z_m : q === 180 ? -b.x_m : -b.z_m;
          const cz = q === 0 ? b.z_m : q === 90 ? -b.x_m : q === 180 ? -b.z_m : b.x_m;
          boxes.push({ r: foot(pl.x_m + cx, pl.z_m + cz, b.w_m, b.d_m, pl.yaw_deg), y0: pl.y_m + b.y_m - b.h_m / 2, y1: pl.y_m + b.y_m + b.h_m / 2, what: "ladder" });
        }
      }
      let checked = 0;
      for (const a of techOf(c).build.layer.adds) {
        if (!["bolt-on", "camera", "sign", "tall"].includes(a.kind)) continue;
        const side = SIDE_OF_YAW[a.placement.yaw_deg]!;
        const r = rectOf(a);
        // the zone: the piece's own span along the wall (a tall piece: the whole 5 m face), from the wall out OUT metres
        const cell = { x0: a.cell.i * CELL_M, x1: (a.cell.i + 1) * CELL_M, z0: a.cell.j * CELL_M, z1: (a.cell.j + 1) * CELL_M };
        const alongX = side === "+z" || side === "-z";
        const lo = a.kind === "tall" ? (alongX ? cell.x0 : cell.z0) : alongX ? r.x0 : r.z0;
        const hi = a.kind === "tall" ? (alongX ? cell.x1 : cell.z1) : alongX ? r.x1 : r.z1;
        const zone: R =
          side === "+x" ? { x0: cell.x1, x1: cell.x1 + OUT, z0: lo, z1: hi } : side === "-x" ? { x0: cell.x0 - OUT, x1: cell.x0, z0: lo, z1: hi } : side === "+z" ? { x0: lo, x1: hi, z0: cell.z1, z1: cell.z1 + OUT } : { x0: lo, x1: hi, z0: cell.z0 - OUT, z1: cell.z0 };
        const storey = Math.floor(a.placement.y_m / STOREY_M + 1e-9);
        const y0 = a.kind === "tall" ? a.placement.y_m : storey * STOREY_M;
        const y1 = a.kind === "tall" ? a.placement.y_m + a.size.h_m : (storey + 1) * STOREY_M;
        for (const b of boxes) {
          if (over(zone, b.r) && b.y0 < y1 - 1e-6 && b.y1 > y0 + 1e-6) throw new Error(`${label(c)} ${a.id} is not clear of stage 7's ${b.what}`);
        }
        checked++;
      }
      expect(checked, label(c)).toBeGreaterThan(500);
    }
  });

  it("criterion 6, T-1 and T-2: the stage's own layer is read by C1's assertEraReadable (a stage that fails either throws); the pass reads the plan through resolveBefore", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const src = readFileSync(fileURLToPath(new URL("./stage.ts", import.meta.url)), "utf8");
    expect(src).toMatch(/resolveBefore\(plan, "tech"\)/);
    expect(src).toMatch(/assertEraReadable\(plan, "tech", layer, \{ bounds: techBoundsOf, isTree: techIsTree/);
    // and it ran, without throwing, on every named run (techOf built each)
    for (const c of NAMED) expect(techOf(c).build.resolved.era).toBe("tech");
  });

  it("criterion 9, R-1 to R-7 and X-1: the registered stage's layer is frozen and equals the direct build; clean digests are the clean run's; the picture is sound; the same city twice gives the same layer; X-7", () => {
    const clean = cleanOf(DEFAULT);
    const r = runEraStages(clean, "tech", ERA_STAGES);
    if (!r.ok) throw new Error(`era run failed at ${r.failure.stage}: ${r.failure.reason}`);
    expect(Object.keys(r.plan.layers)).toEqual(["history", "tech"]);
    const layer = r.plan.layers.tech!;
    expect(Object.isFrozen(layer) && Object.isFrozen(layer.adds) && Object.isFrozen(layer.adds[0]!) && Object.isFrozen(layer.changes)).toBe(true);
    expect(r.plan.digests.tech).toBe(digestOf(techOf(DEFAULT).build.layer));
    expect(digestOf(buildTech(historyPlanOf(DEFAULT), stageRand("tech", 1)).layer)).toBe(r.plan.digests.tech);
    // X-1: no clean layer, digest or check moves
    expect(r.plan.plan).toBe(clean);
    for (const [stage, d] of Object.entries(clean.digests)) expect(digestOf(clean.layers[stage as keyof typeof clean.layers]), stage).toBe(d);
    const again = runCity({ blocksX: 6, blocksZ: 6, seed: 1 });
    if (!again.ok) throw new Error("clean run failed");
    expect(again.plan.digests).toEqual(clean.digests);
    // X-7: runCity runs no tech code
    expect(BUILT_STAGES.map((s) => s.name)).not.toContain("tech");
    expect(Object.keys(again.plan.layers)).not.toContain("tech");
    expect(ERA_STAGES.map((s) => s.name)).toContain("tech");
    // R-5: the picture
    const pic = techStage.picture(r.plan);
    expect(pic.stage).toBe("tech");
    expect(pictureProblems({ ...pic, stage: "streets" }, clean.layers.streets!.w, clean.layers.streets!.h)).toEqual([]);
    expect(techPicture(r.plan, layer).cells.some((v) => v === 3)).toBe(true);
    // the source: no file of this folder (tests and their support apart) imports another stage folder or reads bi, bj or a street's line
    // (the source scan is in fixtures.test.ts)
  });

  it("criterion 9, the digest pins (R-4): 6 x 6 seeds 1, 2, 3 and 8, one-way on. Stage 6 is empty: these are re-pinned when K2 lands", () => {
    const PINS: readonly (readonly [number, string])[] = [
      [1, "365c9ce6"],
      [2, "379e75ea"],
      [3, "754fbe58"],
      [8, "22aafb8b"],
    ];
    const got: [number, string][] = [];
    for (const c of PINNED) got.push([c.seed, digestOf(techOf(c).build.layer)]);
    expect(got).toEqual(PINS);
  });

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
