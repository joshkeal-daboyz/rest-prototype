/**
 * Ticket 073 section E2: the hold-out stage on fixtures. One real city (6 x 6 seed 1) is built once for this file; districts get hand-set `held` values, circuits get hand-placed poles, lights and lamp-post places
 * (stage 6 is empty until K2, so the named runs find no circuit and the keeps are proven here).
 * Criteria 1 to 5 and 9 of the ticket's E2 section; the named runs, the pins and the numbers are in `named.test.ts`.
 */
import { describe, expect, it } from "vitest";
import {
  CITY_HOLDOUT_PIECE_KINDS,
  CITY_HOLDOUT_STEP_OF,
  CITY_HOLDOUT_STEPS,
  type CityChange,
  type CityEraPlan,
  type CityEraPiece,
  type CityHoldoutLayer,
  type CityHoldoutPieceKind,
  type CalibrationKey,
  type CityPlan,
} from "../../core";
import { assertEraReadable, resolveBefore } from "../pipeline/eras";
import { CityStageError } from "../pipeline/error";
import { digestOf } from "../pipeline/digest";
import { pictureProblems } from "../pipeline/picture";
import { EMPTY_CIRCUIT, t1Failures, t2Failures, type CircuitPoints } from "../pipeline/readable";
import { stageRand } from "../pipeline/seeds";
import { mouthsOf, protectedMouths, wallLine } from "./barricade";
import { BAND_HIGH, BAND_MID, CELL_M } from "./constants";
import { cellKey, cellsOver, grow, inside, overlaps, rectAt, turned, type Rect } from "./geom";
import { circuitHit } from "./guard";
import { CLEAN_ROOF_BOUNDS, EXCLUDED_KEYS, KIT, KIT_KEYS, holdoutBounds } from "./kit";
import { holdoutPicture, buildHoldout, stepPart, stepParts } from "./stage";
import { settle } from "./settle";
import { PINNED, beforeHoldout, withHeld } from "./testcities";
import { buildWorld, meetsBuilding, type World } from "./world";

const CITY = PINNED[0]!;
const rand = stageRand("holdout", CITY.seed);
const BASE: CityEraPlan = beforeHoldout(CITY);
const history = BASE.layers.history!;
const FULL = withHeld(BASE, () => 1);
const BANDS_HELD = [0, 0.2, 0.5, 0.8] as const;
const BANDS = withHeld(BASE, (n) => BANDS_HELD[n % 4]!);

const worldOf = (plan: CityEraPlan, circuit: CircuitPoints = EMPTY_CIRCUIT): World => buildWorld(resolveBefore(plan, "holdout"), plan.plan, plan.layers.history!.districts, circuit);
const rectOfAdd = (a: CityEraPiece): Rect => rectAt(a.placement.x_m, a.placement.z_m, a.size.x_m, a.size.z_m);
const kindsOf = (layer: CityHoldoutLayer, district: string): Set<CityHoldoutPieceKind> => new Set(layer.adds.filter((a) => a.district === district).map((a) => a.kind));
const countOf = (layer: CityHoldoutLayer, district: string, kind?: CityHoldoutPieceKind): number => layer.adds.filter((a) => a.district === district && (kind === undefined || a.kind === kind)).length;

const full = buildHoldout(FULL, rand);
const bands = buildHoldout(BANDS, rand);
const fullWorld = worldOf(FULL);

describe("criterion 1: the layer", { timeout: 300_000 }, () => {
  it("adds have ids `holdout:<kind>:<plan data>`, unique; each kind is from CityHoldoutPieceKind and in its step (CITY_HOLDOUT_STEP_OF)", () => {
    const layer = full.layer;
    expect(layer.stage).toBe("holdout");
    expect(layer.adds.length).toBeGreaterThan(500);
    const ids = layer.adds.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of layer.adds) {
      expect(a.id.startsWith(`holdout:${a.kind}:`), a.id).toBe(true);
      expect(CITY_HOLDOUT_PIECE_KINDS).toContain(a.kind);
    }
    for (const s of CITY_HOLDOUT_STEPS) for (const a of stepPart(layer, s).adds) expect(CITY_HOLDOUT_STEP_OF[a.kind], a.id).toBe(s);
  });

  it("each add's district is the district its cell is in; a piece on a street cell names a district of the plan", () => {
    const districtIds = new Set(history.districts.map((d) => d.id));
    for (const a of full.layer.adds) {
      expect(districtIds.has(a.district), a.id).toBe(true);
      const m = fullWorld.massAt.get(cellKey(a.cell.i, a.cell.j));
      if (m !== undefined) expect(fullWorld.districtOfBlock.get(m.block)!.id, a.id).toBe(a.district);
    }
  });

  it("changes are only removes, of a ground prop or a traffic piece, each piece once; no swap, no state", () => {
    const seen = new Set<string>();
    for (const c of full.layer.changes) {
      expect(c.op).toBe("remove");
      const r = c.ref as { list?: string; index?: number };
      expect(["ground.props", "traffic.pieces"]).toContain(r.list);
      const k = `${r.list}|${r.index}`;
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
    }
    expect(full.layer.changes.length).toBeGreaterThan(0);
  });

  it("steps list power (0, 0), settle and barricade in order, the counts summing to the layer's; the barricades come last", () => {
    const steps = full.layer.steps!;
    expect(steps.map((s) => s.step)).toEqual([...CITY_HOLDOUT_STEPS]);
    expect(steps[0]).toEqual({ step: "power", adds: 0, changes: 0 });
    expect(steps.reduce((n, s) => n + s.adds, 0)).toBe(full.layer.adds.length);
    expect(steps.reduce((n, s) => n + s.changes, 0)).toBe(full.layer.changes.length);
    const settleAdds = stepPart(full.layer, "settle").adds;
    const barricadeAdds = stepPart(full.layer, "barricade").adds;
    expect(settleAdds.every((a) => a.kind !== "barricade")).toBe(true);
    expect(barricadeAdds.length).toBeGreaterThan(0);
    expect(barricadeAdds.every((a) => a.kind === "barricade")).toBe(true);
    // the barricade part's changes are only stage 9 removes; the settle part's are only ground props
    expect(stepPart(full.layer, "barricade").changes.every((c) => (c.ref as { list: string }).list === "traffic.pieces")).toBe(true);
    expect(stepPart(full.layer, "settle").changes.every((c) => (c.ref as { list: string }).list === "ground.props")).toBe(true);
    expect(stepParts(full.layer).map((p) => digestOf(p))).toHaveLength(3);
  });
});

describe("criterion 2: the bands (a fixture with districts at held 0, 0.2, 0.5 and 0.8)", { timeout: 300_000 }, () => {
  const ids = history.districts.map((d, n) => ({ id: d.id, held: BANDS_HELD[n % 4]! }));
  const SMALL = new Set<CityHoldoutPieceKind>(["camp", "container", "clutter", "roof"]);

  it("nothing where held is 0; only clutter, containers, camps and roof items under a third; no farm under two thirds", () => {
    for (const d of ids) {
      const kinds = kindsOf(bands.layer, d.id);
      if (d.held === 0) expect(kinds.size, d.id).toBe(0);
      else if (d.held < BAND_MID) for (const k of kinds) expect(SMALL.has(k), `${d.id} ${k}`).toBe(true);
      else if (d.held < BAND_HIGH) expect(kinds.has("farm") || kinds.has("irrigator"), d.id).toBe(false);
    }
    const some = (held: number, pred: (k: CityHoldoutPieceKind) => boolean): boolean => ids.some((d) => d.held === held && [...kindsOf(bands.layer, d.id)].some(pred));
    expect(some(0.2, (k) => k === "clutter")).toBe(true);
    expect(some(0.2, (k) => k === "container")).toBe(true);
    expect(some(0.2, (k) => k === "roof")).toBe(true);
    expect(some(0.5, (k) => k === "stall" || k === "water-tower" || k === "barricade")).toBe(true);
    expect(some(0.5, (k) => k === "camp")).toBe(true);
  });

  it("every kind appears on a district at held 1, and the farms only from two thirds", () => {
    const kinds = new Set(full.layer.adds.map((a) => a.kind));
    for (const k of CITY_HOLDOUT_PIECE_KINDS) expect(kinds.has(k), k).toBe(true);
    const farmDistricts = new Set(bands.layer.adds.filter((a) => a.kind === "farm").map((a) => a.district));
    for (const d of ids) if (farmDistricts.has(d.id)) expect(d.held).toBeGreaterThanOrEqual(BAND_HIGH);
  });

  it("density reads held only (X-6): the same district with a higher held never gets fewer pieces, on a fixed hash", () => {
    const at = (h: number): CityHoldoutLayer => buildHoldout(withHeld(BASE, () => h), rand).layer;
    const lo = at(0.2);
    const mid = at(0.5);
    const hi = at(0.8);
    for (const d of history.districts) {
      for (const k of ["clutter", "container", "roof"] as const) {
        expect(countOf(mid, d.id, k), `${d.id} ${k} 0.5 vs 0.2`).toBeGreaterThanOrEqual(countOf(lo, d.id, k));
        expect(countOf(hi, d.id, k), `${d.id} ${k} 0.8 vs 0.5`).toBeGreaterThanOrEqual(countOf(mid, d.id, k));
      }
      expect(countOf(mid, d.id), `${d.id} all 0.5 vs 0.2`).toBeGreaterThanOrEqual(countOf(lo, d.id));
      expect(countOf(hi, d.id), `${d.id} all 0.8 vs 0.5`).toBeGreaterThanOrEqual(countOf(mid, d.id));
    }
  });
});

describe("criterion 3: the places, one fixture a kind", { timeout: 300_000 }, () => {
  const adds = (kind: CityHoldoutPieceKind): CityEraPiece<CityHoldoutPieceKind>[] => full.layer.adds.filter((a) => a.kind === kind);
  const cellSet = (cells: readonly { i: number; j: number }[]): Set<number> => new Set(cells.map((c) => cellKey(c.i, c.j)));
  const placeOf = (a: CityEraPiece): { id: string; cells: Set<number> } | undefined =>
    [...fullWorld.courts, ...fullWorld.parks].map((p) => ({ id: p.id, cells: cellSet(p.cells) })).find((p) => p.cells.has(cellKey(a.cell.i, a.cell.j)));
  const propHosts = (): Map<number, string> => {
    const out = new Map<number, string>();
    for (const [host, list] of fullWorld.propsByHost) for (const e of list) out.set(e.index, host);
    return out;
  };

  it("camps stand inside their place's cells, 1 m off buildings, 1.5 m apart, 0.3 m clear of clean props, with no remove", () => {
    const camps = adds("camp");
    expect(camps.length).toBeGreaterThan(20);
    const byPlace = new Map<string, Rect[]>();
    for (const a of camps) {
      const place = placeOf(a);
      expect(place, a.id).toBeDefined();
      const r = rectOfAdd(a);
      expect(CITY_HOLDOUT_STEP_OF[a.kind]).toBe("settle");
      const cells = cellsOver(r).map((c) => cellKey(c.i, c.j));
      for (const c of cells) expect(place!.cells.has(c), a.id).toBe(true);
      expect(meetsBuilding(fullWorld, r, 1 - 1e-6), a.id).toBe(false);
      expect(fullWorld.obstacles.any(grow(r, 0.3 - 1e-6)), a.id).toBe(false);
      const list = byPlace.get(place!.id) ?? [];
      for (const o of list) expect(overlaps(grow(r, 1.5 - 1e-6), o), a.id).toBe(false);
      list.push(r);
      byPlace.set(place!.id, list);
      // never scaled: the footprint is the kit's, turned
      const k = KIT[a.placement.key]!;
      expect(a.size).toEqual({ x_m: turned(k.w, k.d, a.placement.yaw_deg).x, z_m: turned(k.w, k.d, a.placement.yaw_deg).z, h_m: k.h });
    }
    // no camp place's props are removed: only a farm park's and a stall's square's
    const hostOf = propHosts();
    const farmParks = new Set(adds("farm").map((a) => a.id.slice("holdout:farm:".length).replace(/:\d+$/, "")));
    const stallSquares = new Set(adds("stall").map((a) => a.id.slice("holdout:stall:".length)));
    for (const c of full.layer.changes) {
      const r = c.ref as { list: string; index: number };
      if (r.list !== "ground.props") continue;
      const host = hostOf.get(r.index)!;
      expect(farmParks.has(host) || stallSquares.has(host), host).toBe(true);
    }
  });

  it("one water tower a court at most, on the ground, inside the court", () => {
    const towers = adds("water-tower");
    expect(towers.length).toBeGreaterThan(3);
    const perCourt = new Map<string, number>();
    for (const t of towers) {
      expect(t.placement.y_m).toBe(0);
      const court = fullWorld.courts.find((c) => `holdout:water-tower:${c.id}` === t.id);
      expect(court, t.id).toBeDefined();
      perCourt.set(court!.id, (perCourt.get(court!.id) ?? 0) + 1);
      const r = rectOfAdd(t);
      const set = cellSet(court!.cells);
      for (let i = Math.floor(r.x0 / CELL_M); i <= Math.floor((r.x1 - 1e-6) / CELL_M); i++) for (let j = Math.floor(r.z0 / CELL_M); j <= Math.floor((r.z1 - 1e-6) / CELL_M); j++) expect(set.has(cellKey(i, j)), t.id).toBe(true);
      // never on a roof: no tower stands over a building cell
      expect(fullWorld.built.has(cellKey(t.cell.i, t.cell.j))).toBe(false);
    }
    expect(Math.max(...perCourt.values())).toBe(1);
  });

  it("a farm piece stands inside its park's interior (not across the pavement edge), never scaled; its irrigator inside it; the park's props are removed", () => {
    const farms = adds("farm");
    expect(farms.length).toBeGreaterThan(0);
    const edgeCells = new Set(fullWorld.massAt.keys());
    for (const f of farms) {
      const parkId = f.id.slice("holdout:farm:".length).replace(/:\d+$/, "");
      const park = fullWorld.parks.find((p) => p.id === parkId)!;
      expect(park.rect, parkId).not.toBeNull();
      const r = rectOfAdd(f);
      expect(inside(r, park.rect!), f.id).toBe(true);
      // the interior excludes the park's edge ring: no farm cell is a "parkEdge" cell
      for (let i = Math.floor(r.x0 / CELL_M); i <= Math.floor((r.x1 - 1e-6) / CELL_M); i++) for (let j = Math.floor(r.z0 / CELL_M); j <= Math.floor((r.z1 - 1e-6) / CELL_M); j++) {
        expect(edgeCells.has(cellKey(i, j))).toBe(true);
        expect(fullWorld.massAt.get(cellKey(i, j))!.use).not.toBe("parkEdge");
      }
      const k = KIT[f.placement.key]!;
      expect(f.size).toEqual({ x_m: turned(k.w, k.d, f.placement.yaw_deg).x, z_m: turned(k.w, k.d, f.placement.yaw_deg).z, h_m: k.h });
      const irrigator = full.layer.adds.find((a) => a.id === f.id.replace("holdout:farm:", "holdout:irrigator:"));
      expect(irrigator, f.id).toBeDefined();
      expect(inside(rectOfAdd(irrigator!), r), f.id).toBe(true);
    }
    expect(adds("irrigator").length).toBe(farms.length);
    const removed = new Set(full.layer.changes.filter((c) => (c.ref as { list: string }).list === "ground.props").map((c) => (c.ref as { index: number }).index));
    for (const parkId of new Set(farms.map((f) => f.id.slice("holdout:farm:".length).replace(/:\d+$/, "")))) for (const e of fullWorld.propsByHost.get(parkId) ?? []) expect(removed.has(e.index), parkId).toBe(true);
  });

  it("a park too small for any piece is left a park: no farm, no removed prop", () => {
    const park = fullWorld.parks[0]!;
    const tiny: World = { ...fullWorld, parks: [{ id: "park:tiny", block: park.block, cells: [], rect: { x0: 0, x1: 6, z0: 0, z1: 6 } }], courts: [], squares: [], bays: [], pavement: [], decks: [] };
    const r = settle(tiny, rand);
    expect(r.adds).toEqual([]);
    expect(r.changes).toEqual([]);
    expect(r.stats.farmParks).toBe(1);
    expect(r.stats.farmParksFilled).toBe(0);
  });

  it("one Bld_Market_Stall_02 per plaza or front lot, its props removed, and no container on a front lot that has one", () => {
    const stalls = adds("stall");
    expect(stalls.length).toBeLessThanOrEqual(fullWorld.squares.length);
    expect(stalls.length).toBeGreaterThanOrEqual(fullWorld.squares.length - 2);
    expect(new Set(stalls.map((s) => s.placement.key)).size).toBe(1);
    const hostOf = propHosts();
    for (const sq of fullWorld.squares) {
      const s = stalls.find((a) => a.id === `holdout:stall:${sq.id}`);
      if (s === undefined) continue; // a square whose every try met a stage 7 piece takes no stall
      const r = rectOfAdd(s!);
      expect(inside(r, sq.rect), sq.id).toBe(true);
      expect(adds("container").some((c) => overlaps(rectOfAdd(c), sq.rect)), `a container on ${sq.id}`).toBe(false);
      for (const e of fullWorld.propsByHost.get(sq.id) ?? []) {
        if (e.prop.flat) continue;
        const removed = full.layer.changes.some((c) => (c.ref as { index: number }).index === e.index && (c.ref as { list: string }).list === "ground.props");
        expect(removed, `${sq.id} prop ${e.index}`).toBe(overlaps(e.rect, r));
      }
    }
    void hostOf;
  });

  it("one container a stall or kerb bay at most, centred in it; one clutter piece a pavement cell at most, its middle kept open", () => {
    const bayAt = new Map<string, (typeof fullWorld.bays)[number]>(fullWorld.bays.map((b) => [`${b.x.toFixed(4)},${b.z.toFixed(4)}`, b] as const));
    const seen = new Set<string>();
    for (const c of adds("container")) {
      const key = `${c.placement.x_m.toFixed(4)},${c.placement.z_m.toFixed(4)}`;
      const bay = bayAt.get(key);
      expect(bay, c.id).toBeDefined();
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(inside(rectOfAdd(c), rectAt(bay!.x, bay!.z, bay!.alongX ? bay!.along : bay!.across, bay!.alongX ? bay!.across : bay!.along)), c.id).toBe(true);
    }
    expect(adds("container").length).toBeGreaterThan(20);
    const cells = new Set<number>();
    const pav = new Set(fullWorld.pavement.map((p) => cellKey(p.i, p.j)));
    for (const c of adds("clutter")) {
      const k = cellKey(c.cell.i, c.cell.j);
      expect(pav.has(k), c.id).toBe(true);
      expect(cells.has(k)).toBe(false);
      cells.add(k);
      const cx = (c.cell.i + 0.5) * CELL_M;
      const cz = (c.cell.j + 0.5) * CELL_M;
      expect(Math.abs(cx - c.placement.x_m) > c.size.x_m / 2 || Math.abs(cz - c.placement.z_m) > c.size.z_m / 2, c.id).toBe(true);
    }
    expect(cells.size).toBeGreaterThan(50);
  });

  it("roof items are Solar_Panel_02 and Fabric_01 or _02 only, at most 2 a column, on the deck, 0.1 m clear of H3's pieces", () => {
    const roofs = adds("roof");
    expect(roofs.length).toBeGreaterThan(100);
    const per = new Map<number, number>();
    for (const a of roofs) {
      expect(["sci-fi-frontier-pack:SM_Prop_Solar_Panel_02", "sci-fi-frontier-pack:SM_Prop_Fabric_01", "sci-fi-frontier-pack:SM_Prop_Fabric_02"]).toContain(a.placement.key);
      const k = cellKey(a.cell.i, a.cell.j);
      per.set(k, (per.get(k) ?? 0) + 1);
      const deck = fullWorld.decks.find((d) => d.i === a.cell.i && d.j === a.cell.j)!;
      expect(a.placement.y_m).toBeCloseTo(deck.y, 6);
      expect(inside(rectOfAdd(a), deck.rect)).toBe(true);
      for (const t of deck.taken) expect(overlaps(grow(rectOfAdd(a), 0.1 - 1e-6), t), a.id).toBe(false);
    }
    expect(Math.max(...per.values())).toBe(2);
    expect(Object.keys(CLEAN_ROOF_BOUNDS).length).toBeGreaterThan(20);
  });

  it("no excluded key anywhere in the layer: every key is in the kit table", () => {
    for (const a of full.layer.adds) {
      expect(KIT_KEYS.has(a.placement.key), a.placement.key).toBe(true);
      expect(EXCLUDED_KEYS).not.toContain(a.placement.key);
      expect(a.placement.key.startsWith("sci-fi-frontier-pack:")).toBe(true);
      expect(a.placement.key).not.toMatch(/Barricade|Road_Barrier|Alien|Sand|Cliff|Weapon|Character|Cantina|_Insert|Tree/);
    }
  });
});

describe("the circuit guard (T-1)", () => {
  const C = (over: Partial<CircuitPoints>): CircuitPoints => ({ ...EMPTY_CIRCUIT, ...over });
  const r = rectAt(10, 10, 2, 2);
  it("a pole, a street light or a lamp-post place inside the footprint, widened, is a hit; one beyond it is not", () => {
    expect(circuitHit(C({ poles: [{ id: "p", x_m: 11.1, z_m: 10 }] }), r, 1, 0.2)).toBe(true);
    expect(circuitHit(C({ lights: [{ id: "l", x_m: 10, z_m: 8.85 }] }), r, 1, 0.2)).toBe(true);
    expect(circuitHit(C({ lampPlaces: [{ id: "q", x_m: 9, z_m: 11.15 }] }), r, 1, 0.2)).toBe(true);
    expect(circuitHit(C({ poles: [{ id: "p", x_m: 11.5, z_m: 10 }] }), r, 1, 0.2)).toBe(false);
  });
  it("a drop's first stretch counts only for a piece whose top is over 5.5 m", () => {
    const drop = { id: "d", wall: { x_m: 11, z_m: 10 }, out: { x_m: 1, z_m: 0 } };
    expect(circuitHit(C({ drops: [drop] }), r, 6, 0.2)).toBe(true);
    expect(circuitHit(C({ drops: [drop] }), r, 5, 0.2)).toBe(false);
  });
  it("pieces beside a pole stay allowed (B7): the guard keeps 0.2 m, T-1 reads 0.15 m", () => {
    expect(circuitHit(C({ poles: [{ id: "p", x_m: 11.4, z_m: 10 }] }), r, 1, 0.2)).toBe(false);
  });

  it("with poles, lights and lamp-post places hand-placed on the pieces the pass would have made, none is covered and the stage still returns", () => {
    const pavementAdds = full.layer.adds.filter((a) => a.kind === "clutter" || (a.kind === "container" && !fullWorld.massAt.has(cellKey(a.cell.i, a.cell.j))));
    expect(pavementAdds.length).toBeGreaterThan(40);
    const pick = (mod: number): { id: string; x_m: number; z_m: number }[] =>
      pavementAdds.filter((_, n) => n % 3 === mod).slice(0, 30).map((a, n) => ({ id: `fx:${mod}:${n}`, x_m: a.placement.x_m, z_m: a.placement.z_m }));
    const circuit = C({ poles: pick(0).map((p) => ({ ...p, block: history.districts[0]!.blocks[0]! })), lights: pick(1), lampPlaces: pick(2) });
    const guarded = buildHoldout(FULL, rand, { circuit });
    const points = [...circuit.poles, ...circuit.lights, ...circuit.lampPlaces];
    for (const a of guarded.layer.adds) {
      if (a.kind === "barricade") continue;
      for (const p of points) expect(overlaps(grow(rectOfAdd(a), 0.15), rectAt(p.x_m, p.z_m, 0.001, 0.001)), `${a.id} covers ${p.id}`).toBe(false);
    }
    expect(guarded.layer.adds.length).toBeLessThanOrEqual(full.layer.adds.length);
    // the same on the whole resolved plan, by the real check
    const resolved = assertEraReadable(FULL, "holdout", guarded.layer, { bounds: holdoutBounds, circuit });
    expect(t1Failures(resolved, { bounds: holdoutBounds, circuit })).toEqual([]);
  });
});

describe("criterion 4: barricades (option C)", { timeout: 300_000 }, () => {
  const key = (id: string): string => id.replace(/^holdout:barricade:/, "").replace(/:\d+$/, "");
  const barricadeKeys = (layer: CityHoldoutLayer): Set<string> => new Set(layer.adds.filter((a) => a.kind === "barricade").map((a) => key(a.id)));
  const base = barricadeKeys(full.layer);

  it("the barricades come last: every add and change of the step follows every settle add and change", () => {
    const steps = full.layer.steps!;
    const settleAdds = steps[1]!.adds;
    expect(full.layer.adds.slice(0, settleAdds).every((a) => a.kind !== "barricade")).toBe(true);
    expect(full.layer.adds.slice(settleAdds).every((a) => a.kind === "barricade")).toBe(true);
    expect(full.barricade.placed).toBe(base.size);
    expect(base.size).toBeGreaterThan(10);
  });

  it("a line runs across its arm through the cells' middles, 3 to 5 walls end to end", () => {
    for (const a of full.layer.adds.filter((x) => x.kind === "barricade")) {
      const wall = KIT[a.placement.key]!;
      expect(a.size.h_m).toBe(wall.h);
      expect([0, 90]).toContain(a.placement.yaw_deg);
    }
    for (const d of history.districts) {
      for (const m of mouthsOf(fullWorld, d)) {
        const line = wallLine(m.junction, m.arm);
        expect(line.centres.length).toBeGreaterThanOrEqual(3);
        expect(line.centres.length).toBeLessThanOrEqual(5);
        for (const [x, z] of line.centres) {
          // each centre sits on a cell edge along the line and on a cell middle across it
          const across = line.yaw === 90 ? x : z;
          const along = line.yaw === 90 ? z : x;
          expect(Math.abs(((across / CELL_M) % 1) - 0.5)).toBeLessThan(1e-9);
          expect(Math.abs((along / CELL_M) % 1)).toBeLessThan(1e-9);
        }
      }
    }
  });

  it("a district's hashed-first mouth is always open", () => {
    const open = protectedMouths(fullWorld, rand);
    expect(open.size).toBeGreaterThan(5);
    for (const k of open) expect(base.has(k), k).toBe(false);
    for (const d of history.districts) {
      const ms = mouthsOf(fullWorld, d);
      expect(ms.some((m) => !base.has(m.key)), d.id).toBe(true);
    }
  });

  it("each stage 9 piece under a wall is removed once, and no other piece stands under one", () => {
    const refs = full.layer.changes.filter((c): c is CityChange & { ref: { list: "traffic.pieces"; index: number } } => (c.ref as { list: string }).list === "traffic.pieces").map((c) => c.ref.index);
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs.length).toBeGreaterThan(0);
    const walls = full.layer.adds.filter((a) => a.kind === "barricade").map(rectOfAdd);
    const gone = new Set(refs);
    const traffic = fullWorld.traffic;
    for (const e of traffic) {
      const under = walls.some((w) => overlaps(e.rect, w));
      expect(gone.has(e.index), `traffic piece ${e.index}`).toBe(under);
    }
    expect(fullWorld.obstacles.query(walls[0]!).every((h) => h.tag.piece !== null)).toBe(true);
  });

  it("a mouth whose wall would cover a lamp-post place is skipped (T-1)", () => {
    const wall = full.layer.adds.find((a) => a.kind === "barricade")!;
    const target = key(wall.id);
    const circuit: CircuitPoints = { ...EMPTY_CIRCUIT, lampPlaces: [{ id: "fx:lamp", x_m: wall.placement.x_m, z_m: wall.placement.z_m }] };
    const r = buildHoldout(FULL, rand, { circuit });
    expect(barricadeKeys(r.layer).has(target)).toBe(false);
    expect(r.barricade.skippedT1).toBeGreaterThanOrEqual(1);
    // every other mouth is as it was
    for (const k of base) if (k !== target) expect(barricadeKeys(r.layer).has(k), k).toBe(true);
  });

  /** The plan with the street cells cut down to one junction's square and the first stretch of one arm beyond it, so the walk is a corridor the wall can seal. */
  function corridor(arm: string, junctionId: string): { plan: CityEraPlan; poles: CircuitPoints } {
    const j = fullWorld.junctions.find((x) => x.id === junctionId)!;
    const streets = FULL.plan.layers.streets!;
    const keep = new Set<number>();
    for (let q = j.j0 - 1; q <= j.j1; q++) for (let p = j.i0 - 1; p <= j.i1; p++) keep.add(cellKey(p, q));
    for (let n = 1; n <= 4; n++) {
      for (let r = 0; r <= j.j1 - j.j0 + 1; r++) {
        if (arm === "+x") keep.add(cellKey(j.i1 + n, j.j0 - 1 + r));
        if (arm === "-x") keep.add(cellKey(j.i0 - 1 - n, j.j0 - 1 + r));
      }
      for (let r = 0; r <= j.i1 - j.i0 + 1; r++) {
        if (arm === "+z") keep.add(cellKey(j.i0 - 1 + r, j.j1 + n));
        if (arm === "-z") keep.add(cellKey(j.i0 - 1 + r, j.j0 - 1 - n));
      }
    }
    const cells = streets.cells.filter((c) => keep.has(cellKey(c.i, c.j)));
    const cleanPlan: CityPlan = { ...FULL.plan, layers: { ...FULL.plan.layers, streets: { ...streets, cells } } };
    const plan: CityEraPlan = { plan: cleanPlan, layers: FULL.layers, digests: FULL.digests };
    const mid = (j.j0 + j.j1 - 1) / 2;
    const midI = (j.i0 + j.i1 - 1) / 2;
    const out = arm === "+x" ? [j.i1 + 2, mid] : arm === "-x" ? [j.i0 - 3, mid] : arm === "+z" ? [midI, j.j1 + 2] : [midI, j.j0 - 3];
    const district = history.districts.find((d) => d.id === full.layer.adds.find((a) => a.id.startsWith(`holdout:barricade:${junctionId}|${arm}:`))!.district)!;
    const block = district.blocks[0]!;
    const poles: CircuitPoints = {
      ...EMPTY_CIRCUIT,
      poles: [
        { id: "pole:a", x_m: (midI + 0.5) * CELL_M, z_m: (mid + 0.5) * CELL_M, block },
        { id: "pole:b", x_m: (Math.floor(out[0]!) + 0.5) * CELL_M, z_m: (Math.floor(out[1]!) + 0.5) * CELL_M, block },
      ],
    };
    return { plan, poles };
  }

  it("a mouth whose wall would seal a pole in is skipped (T-2); without the pole it is placed", () => {
    const wall = full.layer.adds.find((a) => a.kind === "barricade")!;
    const target = key(wall.id);
    const [junctionId, arm] = target.split("|") as [string, string];
    const { plan, poles } = corridor(arm, junctionId);
    const free = buildHoldout(plan, rand);
    expect(barricadeKeys(free.layer).has(target)).toBe(true);
    const sealed = buildHoldout(plan, rand, { circuit: poles });
    expect(barricadeKeys(sealed.layer).has(target)).toBe(false);
    expect(sealed.barricade.skippedT2).toBeGreaterThanOrEqual(1);
    const resolved = assertEraReadable(plan, "holdout", sealed.layer, { bounds: holdoutBounds, circuit: poles });
    expect(t2Failures(resolved, { bounds: holdoutBounds, circuit: poles })).toEqual([]);
  });

  it("two touching held districts keep both districts' poles joined, with a pole at every junction", () => {
    const poles: CircuitPoints = {
      ...EMPTY_CIRCUIT,
      poles: fullWorld.junctions.map((j) => {
        const around = [...(fullWorld.junctionBlocks.get(j.id) ?? [])].sort();
        return { id: `pole:${j.id}`, x_m: ((j.i0 + j.i1) / 2) * CELL_M, z_m: ((j.j0 + j.j1) / 2) * CELL_M, block: around[0]! };
      }),
    };
    const r = buildHoldout(FULL, rand, { circuit: poles });
    const districts = new Set(poles.poles.map((p) => fullWorld.districtOfBlock.get(p.block!)!.id));
    expect(districts.size).toBeGreaterThanOrEqual(2);
    const resolved = assertEraReadable(FULL, "holdout", r.layer, { bounds: holdoutBounds, circuit: poles });
    expect(t2Failures(resolved, { bounds: holdoutBounds, circuit: poles })).toEqual([]);
    expect(t1Failures(resolved, { bounds: holdoutBounds, circuit: poles })).toEqual([]);
    expect(r.barricade.placed).toBeGreaterThan(0);
    // a pole at every junction cannot all be sealed in: mouths the free run closes stay open here, skipped for T-2
    expect(r.barricade.skippedT2).toBeGreaterThan(0);
    const free = barricadeKeys(full.layer);
    const held = barricadeKeys(r.layer);
    expect(held.size).toBeLessThan(free.size);
    for (const k of held) expect(free.has(k), k).toBe(true);
  });
});

describe("criterion 5: T-1 and T-2 end the stage (X-4)", { timeout: 300_000 }, () => {
  const pole: CircuitPoints = { ...EMPTY_CIRCUIT, poles: [{ id: "fx:pole", x_m: 12.5, z_m: 12.5 }] };
  const forced = (x: number, z: number): CityEraPiece<"bolt-on"> => ({ id: "tech:bolt-on:forced", kind: "bolt-on", district: history.districts[0]!.id, cell: { i: Math.floor(x / 5), j: Math.floor(z / 5) }, placement: { key: "sci-fi-city-pack:Forced", x_m: x, y_m: 0, z_m: z, yaw_deg: 0 }, size: { x_m: 1, z_m: 1, h_m: 1 } });

  it("a forced add covering a pole throws CityStageError naming T-1 (assertEraReadable with the kit's bounds)", () => {
    const layer: CityHoldoutLayer = { stage: "holdout", adds: [{ ...forced(12.5, 12.5), id: "holdout:camp:forced", kind: "camp", placement: { key: [...KIT_KEYS][0]!, x_m: 12.5, y_m: 0, z_m: 12.5, yaw_deg: 0 } }], changes: [] };
    expect(() => assertEraReadable(FULL, "holdout", layer, { bounds: holdoutBounds, circuit: pole })).toThrow(CityStageError);
    expect(() => assertEraReadable(FULL, "holdout", layer, { bounds: holdoutBounds, circuit: pole })).toThrow(/T-1/);
  });

  it("the stage ends with the check: an earlier era's add that covers a pole fails the hold-out stage with a CityStageError", () => {
    const withTech: CityEraPlan = { plan: FULL.plan, layers: { ...FULL.layers, tech: { stage: "tech", adds: [forced(12.5, 12.5)], changes: [] } }, digests: FULL.digests };
    expect(() => buildHoldout(withTech, rand, { circuit: pole })).toThrow(CityStageError);
    expect(() => buildHoldout(withTech, rand, { circuit: pole })).toThrow(/T-1/);
  });

  it("the stage reads the plan at the era before its own: a tech remove of a prop the hold-out would remove leaves no change on it, and the layer still resolves", () => {
    const victim = full.layer.changes.find((c) => (c.ref as { list: string }).list === "ground.props")!;
    const ref = victim.ref as { list: "ground.props"; index: number; key: CalibrationKey };
    const withTech: CityEraPlan = { plan: FULL.plan, layers: { ...FULL.layers, tech: { stage: "tech", adds: [], changes: [{ ref, op: "remove" }] } }, digests: FULL.digests };
    const r = buildHoldout(withTech, rand);
    expect(r.layer.changes.some((c) => (c.ref as { list: string; index: number }).list === "ground.props" && (c.ref as { index: number }).index === ref.index)).toBe(false);
    expect(() => assertEraReadable(withTech, "holdout", r.layer, { bounds: holdoutBounds })).not.toThrow();
  });

  it("a plan with no history layer fails the stage with a CityStageError", () => {
    expect(() => buildHoldout({ plan: BASE.plan, layers: {}, digests: {} }, rand)).toThrow(CityStageError);
  });
});

describe("criterion 9: the picture (R-5)", { timeout: 300_000 }, () => {
  it("is a flat CityEraPicture of stage holdout: one legend entry per kind, a sound shape, every piece's cell marked", () => {
    const pic = holdoutPicture(FULL, full.layer);
    const streets = FULL.plan.layers.streets!;
    expect(pic.stage).toBe("holdout");
    expect(pictureProblems(pic as never, streets.w, streets.h)).toEqual([]);
    expect(pic.legend.map((l) => l.name)).toEqual(["nothing", ...CITY_HOLDOUT_PIECE_KINDS]);
    expect(new Set(pic.legend.map((l) => l.rgb)).size).toBe(pic.legend.length);
    for (const k of CITY_HOLDOUT_PIECE_KINDS) expect(pic.cells.includes(CITY_HOLDOUT_PIECE_KINDS.indexOf(k) + 1), k).toBe(true);
    expect(pic.points).toHaveLength(full.layer.adds.length);
    for (const a of full.layer.adds.slice(0, 200)) expect(pic.cells[a.cell.j * streets.w + a.cell.i]).toBeGreaterThan(0);
  });
});

describe("R-3: the same city twice gives the same layer", { timeout: 300_000 }, () => {
  it("is deterministic, and a held value of 0 everywhere gives an empty layer", () => {
    const again = buildHoldout(FULL, rand);
    expect(JSON.stringify(again.layer)).toBe(JSON.stringify(full.layer));
    const none = buildHoldout(withHeld(BASE, () => 0), rand).layer;
    expect(none.adds).toEqual([]);
    expect(none.changes).toEqual([]);
    expect(none.steps!.every((s) => s.adds === 0 && s.changes === 0)).toBe(true);
  });
});
