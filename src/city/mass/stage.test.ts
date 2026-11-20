/**
 * Stage 3, mass (sections C1 and C2), on the named cities (default 3 x 3 seed 1, 3 x 3 seeds 1 to 10, 6 x 4 seeds 1 to 3): rings, strips, openings, drives, courts, units, open sides and partners, M3, M4b, M5 (strict:
 * no lane exemption), G2, G3, R1, P2, the picture, the digest pins, R-1 to R-7. HEAVY: each city is built once, through a module-level cache.
 *
 * C2 STOPPED ON ITS STOP RULE (ticket 070 C2 criterion 3, Q5): P2 cannot hold on the named cities, so the stage returns a failure there and "returns ok" is red by design. Every other test of a city runs only where the
 * stage returned ok (`it.skipIf`), so they are skipped now and become the acceptance tests the day P2 can hold. Nothing is loosened and no city is pinned (R-2). The digest pins cannot be re-taken until then.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CityLandLayer, CityMassLayer, CityPlan, CityStreetsLayer } from "../../core";
import { pictureProblems } from "../pipeline/picture";
import type { CityStageDef } from "../pipeline/types";
import { runCity } from "../stages";
import { landStage } from "../land/stage";
import { streetsStage } from "../streets/stage";
import { TILE_CITY_R1_MIN } from "./constants";
import { frontageShare, massFailures, p2Value, parkingNumbers } from "./check";
import { lotQuota, unitsOf } from "./lots";
import { LOTS_PER_BLOCK_MAX, LOT_STALLS } from "./constants";
import { DELTA, SIDES, columnOfSides, keyOf, ringOf } from "./geometry";
import { MASS_LEGEND, massStage } from "./stage";

interface City {
  readonly blocksX: number;
  readonly blocksZ: number;
  readonly seed: number;
}
const NAMED: City[] = [];
for (let seed = 1; seed <= 10; seed++) NAMED.push({ blocksX: 3, blocksZ: 3, seed });
for (let seed = 1; seed <= 3; seed++) NAMED.push({ blocksX: 6, blocksZ: 4, seed });

const cache = new Map<string, ReturnType<typeof runCity>>();
function cityOf(o: City): ReturnType<typeof runCity> {
  const k = `${o.blocksX}x${o.blocksZ}:${o.seed}`;
  if (!cache.has(k)) cache.set(k, runCity(o, "mass"));
  return cache.get(k)!;
}
const layersOf = (o: City): { streets: CityStreetsLayer; land: CityLandLayer; mass: CityMassLayer; plan: CityPlan } => {
  const r = cityOf(o);
  if (!r.ok) throw new Error(`${o.blocksX}x${o.blocksZ} seed ${o.seed} failed: ${r.failure.reason}`);
  return { streets: r.plan.layers.streets!, land: r.plan.layers.land!, mass: r.plan.layers.mass!, plan: r.plan };
};
const label = (o: City): string => `${o.blocksX} x ${o.blocksZ} seed ${o.seed}`;
/** Whether the stage returned ok on the city: C2's acceptance tests of a city run only then (see the header). */
const isOk = (o: City): boolean => cityOf(o).ok;

describe("stage 3, mass, on the named cities", { timeout: 120_000 }, () => {
  it("the default city is the 3 x 3 seed 1 city, and the named cities are 13", () => {
    expect(NAMED).toHaveLength(13);
    const first = runCity({}, "mass");
    expect(first.ok).toBe(cityOf({ blocksX: 3, blocksZ: 3, seed: 1 }).ok);
    expect(first.plan.digests.mass).toBe(cityOf({ blocksX: 3, blocksZ: 3, seed: 1 }).plan.digests.mass);
  });

  for (const o of NAMED) {
    describe(label(o), () => {
      // RED BY DESIGN while C2 is stopped (see the header): the failure names the check and its numbers
      it("returns ok, and M3, M4b, M5 (strict), G2, G3, R1 and P2 all hold (criteria 2, 3 and C1's 5)", () => {
        const r = cityOf(o);
        if (!r.ok) throw new Error(`stage ${r.failure.stage}: ${r.failure.reason}`);
        const { streets, land, mass } = layersOf(o);
        expect(massFailures(mass, streets.blocks, land)).toEqual([]);
        expect(frontageShare(mass).share).toBeGreaterThanOrEqual(TILE_CITY_R1_MIN);
      });

      it.skipIf(!isOk(o))("every block cell has exactly one use, and every cell is in a block (G3, from the street layer's blocks)", () => {
        const { streets, mass } = layersOf(o);
        const want = new Set<string>();
        for (const b of streets.blocks) for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) want.add(keyOf(i, j));
        expect(mass.cells).toHaveLength(want.size);
        expect(new Set(mass.cells.map((c) => keyOf(c.i, c.j)))).toEqual(want);
      });

      it.skipIf(!isOk(o))("court parts: rings 1 and 2 are built (but for plaza, walk-through, drive and frontage-lot cells), then the apron, then green, with the courts' stalls and aisles in the interior; the four ring-2 corners are blind unless a plaza took one (C1 criterion 1)", () => {
        const { land, mass } = layersOf(o);
        const cell = new Map(mass.cells.map((c) => [keyOf(c.i, c.j), c] as const));
        const builtAt = new Map(mass.built.map((b) => [keyOf(b.i, b.j), b] as const));
        let courts = 0;
        for (const p of land.parts.filter((x) => x.shape === "court")) {
          courts++;
          for (let j = p.j0; j < p.j1; j++) {
            for (let i = p.i0; i < p.i1; i++) {
              const c = cell.get(keyOf(i, j))!;
              const ring = ringOf(p, i, j);
              expect(c.part).toBe(p.id);
              if (ring < 2) expect(["built", "plaza", "walk", "drive", "frontLot"], `${p.id} (${i}, ${j}) ring ${ring}`).toContain(c.use);
              else if (ring === 2) expect(["apron", "stalls", "aisle"], `${p.id} (${i}, ${j})`).toContain(c.use);
              else expect(["green", "greenPath", "apron", "stalls", "aisle"], `${p.id} (${i}, ${j})`).toContain(c.use);
            }
          }
          for (const [i, j] of [[p.i0 + 1, p.j0 + 1], [p.i1 - 2, p.j0 + 1], [p.i0 + 1, p.j1 - 2], [p.i1 - 2, p.j1 - 2]] as const) {
            const c = cell.get(keyOf(i, j))!;
            if (c.use === "plaza") continue;
            expect(builtAt.get(keyOf(i, j))?.column, `${p.id} ring-2 corner (${i}, ${j})`).toBe("blind");
          }
        }
        expect(courts).toBeGreaterThan(0);
      });

      it.skipIf(!isOk(o))("strips: both rows are built and outer, and each faces its own edge (criterion 2)", () => {
        const { land, streets, mass } = layersOf(o);
        const builtAt = new Map(mass.built.map((b) => [keyOf(b.i, b.j), b] as const));
        const blockOf = new Map(streets.blocks.map((b) => [b.id, b] as const));
        for (const p of land.parts.filter((x) => x.shape === "strip")) {
          const longAxisX = p.i1 - p.i0 > 2;
          const rowSides: [import("../../core").CitySide, import("../../core").CitySide] = longAxisX ? ["-z", "+z"] : ["-x", "+x"];
          for (let j = p.j0; j < p.j1; j++) {
            for (let i = p.i0; i < p.i1; i++) {
              const b = builtAt.get(keyOf(i, j));
              expect(b, `${p.id} (${i}, ${j}) is built`).toBeDefined();
              expect(b!.row).toBe("outer");
              const own = longAxisX ? (j === p.j0 ? rowSides[0] : rowSides[1]) : i === p.i0 ? rowSides[0] : rowSides[1];
              const faced = b!.open.find((s) => s.side === own);
              expect(faced, `${p.id} (${i}, ${j}) faces ${own}`).toBeDefined();
              expect(faced!.faces).toBe(p.edges[own] === "lane" ? "lane" : p.edges[own] === "park" ? "parkEdge" : "street");
            }
          }
          expect(blockOf.has(p.block)).toBe(true);
        }
      });

      it.skipIf(!isOk(o))("openings: lanes with their two mouths, plazas 2 x 2 at a block corner, one walk-through per interior with no lane and no drive, parks with their edges (C1 criterion 3, C2 criterion 2)", () => {
        const { land, streets, mass } = layersOf(o);
        const blockOf = new Map(streets.blocks.map((b) => [b.id, b] as const));
        const streetCell = new Map(streets.cells.map((c) => [keyOf(c.i, c.j), c] as const));
        const ofKind = (k: string) => mass.openings.filter((x) => x.kind === k);
        // lanes
        expect(ofKind("lane")).toHaveLength(land.lanes.length * 2);
        for (const l of land.lanes) {
          const mine = ofKind("lane").filter((x) => x.block === l.block);
          expect(mine).toHaveLength(2);
          const b = blockOf.get(l.block)!;
          const length = l.axis === "z" ? b.j1 - b.j0 : b.i1 - b.i0;
          expect(mine.reduce((n, x) => n + x.cells.length, 0)).toBe(length);
          for (const x of mine) {
            expect(x.mouth, x.id).not.toBeNull();
            const m = x.mouth!.cells[0]!;
            const onLine = l.axis === "z" ? m.j === b.j0 || m.j === b.j1 - 1 : m.i === b.i0 || m.i === b.i1 - 1;
            expect(onLine, `${x.id} mouth on the building line`).toBe(true);
            const out = l.axis === "z" ? { i: m.i, j: m.j === b.j0 ? m.j - 1 : m.j + 1 } : { i: m.i === b.i0 ? m.i - 1 : m.i + 1, j: m.j };
            expect(streetCell.get(keyOf(out.i, out.j))?.street, x.id).toBe(x.mouth!.street);
          }
        }
        // plazas
        for (const x of ofKind("plaza")) {
          expect(x.cells).toHaveLength(4);
          expect(x.mouth).toBeNull();
          const b = blockOf.get(x.block)!;
          const at = (i: number, j: number): boolean => x.cells.some((c) => c.i === i && c.j === j);
          const corner = [[b.i0, b.j0], [b.i1 - 2, b.j0], [b.i0, b.j1 - 2], [b.i1 - 2, b.j1 - 2]].some(([i, j]) => at(i!, j!) && at(i! + 1, j!) && at(i!, j! + 1) && at(i! + 1, j! + 1));
          expect(corner, `${x.id} is 2 x 2 at a block corner`).toBe(true);
        }
        // walk-throughs: one per court part with an interior and no lane edge and no drive or frontage lot (a drive replaces it), none elsewhere
        for (const p of land.parts) {
          const walks = ofKind("walk").filter((x) => x.id === `${p.id}/walk`);
          const hasLot = mass.openings.some((x) => (x.kind === "drive" || x.kind === "frontLot") && x.id.startsWith(`${p.id}/`) && x.cells.every((c) => ringOf(p, c.i, c.j) < 2));
          const wants = p.shape === "court" && !Object.values(p.edges).includes("lane") && !hasLot;
          expect(walks, p.id).toHaveLength(wants ? 1 : 0);
          for (const w of walks) {
            expect(w.cells).toHaveLength(2);
            for (const c of w.cells) expect(ringOf(p, c.i, c.j)).toBeLessThan(2);
          }
        }
        // parks
        expect(ofKind("park")).toHaveLength(land.parks.length);
        const cell = new Map(mass.cells.map((c) => [keyOf(c.i, c.j), c] as const));
        for (const p of land.parks) {
          const x = ofKind("park").find((q) => q.block === p.block)!;
          expect(x.cells).toHaveLength((p.i1 - p.i0) * (p.j1 - p.j0));
          for (let j = p.j0; j < p.j1; j++) {
            for (let i = p.i0; i < p.i1; i++) {
              const edge = Math.min(i - p.i0, p.i1 - 1 - i, j - p.j0, p.j1 - 1 - j) < 1;
              expect(edge ? ["parkEdge"] : ["green", "greenPath"]).toContain(cell.get(keyOf(i, j))!.use);
            }
          }
        }
      });

      it.skipIf(!isOk(o))("drives and frontage lots: 2 cells wide through both rings, a mouth on a street (none on a lane), a court behind each drive; every lane part's interior is reached (C2 criterion 2, M5 strict)", () => {
        const { land, mass, streets } = layersOf(o);
        const cell = new Map(mass.cells.map((c) => [keyOf(c.i, c.j), c] as const));
        const streetCell = new Map(streets.cells.map((c) => [keyOf(c.i, c.j), c] as const));
        const lotsOf = mass.openings.filter((x) => x.kind === "drive" || x.kind === "frontLot");
        expect(lotsOf.length).toBeGreaterThan(0);
        expect(mass.courts).toHaveLength(lotsOf.length);
        for (const x of lotsOf) {
          expect(x.cells, x.id).toHaveLength(4);
          const p = land.parts.find((q) => x.id.startsWith(`${q.id}/`) && q.block === x.block)!;
          for (const c of x.cells) expect(ringOf(p, c.i, c.j), `${x.id} through both rings`).toBeLessThan(2);
          const onLane = x.cells.some((c) => SIDES.some((side) => ["lane", "laneMouth"].includes(cell.get(keyOf(c.i + DELTA[side][0], c.j + DELTA[side][1]))?.use ?? "")));
          if (onLane) expect(x.mouth, x.id).toBeNull();
          else {
            expect(x.mouth, x.id).not.toBeNull();
            for (const c of x.mouth!.cells) {
              expect(ringOf(p, c.i, c.j), `${x.id} mouth on the building line`).toBe(0);
              const out = SIDES.map((side) => streetCell.get(keyOf(c.i + DELTA[side][0], c.j + DELTA[side][1]))).find((q) => q !== undefined);
              expect(out?.street, x.id).toBe(x.mouth!.street);
            }
          }
        }
        for (const c of mass.courts) {
          const o2 = mass.openings.find((x) => x.id === c.opening)!;
          expect(["drive", "frontLot"]).toContain(o2.kind);
          expect(c.block).toBe(o2.block);
          expect(c.stalls).toBe(LOT_STALLS);
          for (const q of c.stallCells) expect(cell.get(keyOf(q.i, q.j))!.use).toBe(o2.kind === "drive" ? "stalls" : "frontLot");
          for (const q of c.aisleCells) expect(cell.get(keyOf(q.i, q.j))!.use).toBe("aisle");
        }
      });

      it.skipIf(!isOk(o))("units: each block's columns, shops and homes are counted again from its built cells (criterion 1), and its lots serve it as recorded", () => {
        const { streets, mass } = layersOf(o);
        const again = unitsOf(mass, streets.blocks);
        expect(mass.units.map((u) => u.block)).toEqual(streets.blocks.map((b) => b.id));
        for (const u of mass.units) {
          const a = again.get(u.block)!;
          expect([u.columns, u.shops, u.homes]).toEqual([a.columns, a.shops, a.homes]);
          expect(u.lotsWanted).toBe(lotQuota(u.homes));
          expect(u.lots).toBe(mass.courts.filter((c) => c.serves === u.block).length);
          expect(u.stallsShort).toBe(Math.max(0, u.lotsWanted - u.lots) * LOT_STALLS);
          expect(mass.courts.filter((c) => c.block === u.block).length).toBeLessThanOrEqual(LOTS_PER_BLOCK_MAX);
        }
      });

      it.skipIf(!isOk(o))("P2: the lot stalls lie in the band of the homes' demand at PARK_PER_HOME 0.15, no block over its lots, none served far, few short, few frontage lots (criterion 3)", () => {
        const { streets, mass } = layersOf(o);
        expect(p2Value(parkingNumbers(mass, streets.blocks))).toBe(0);
      });

      it.skipIf(!isOk(o))("open sides, column kind and partner of every built cell follow from its neighbours (criterion 4)", () => {
        const { mass } = layersOf(o);
        const useAt = new Map(mass.cells.map((c) => [keyOf(c.i, c.j), c.use] as const));
        const builtAt = new Map(mass.built.map((b) => [keyOf(b.i, b.j), b] as const));
        expect(mass.built).toHaveLength(mass.cells.filter((c) => c.use === "built").length);
        const kinds = { blind: 0, mid: 0, corner: 0 };
        for (const b of mass.built) {
          const open = SIDES.filter((s) => useAt.get(keyOf(b.i + DELTA[s][0], b.j + DELTA[s][1])) !== "built");
          expect(b.open.map((x) => x.side)).toEqual(open);
          expect(b.column).toBe(columnOfSides(open));
          kinds[b.column]++;
          for (const x of b.open) {
            const beyond = useAt.get(keyOf(b.i + DELTA[x.side][0], b.j + DELTA[x.side][1]));
            expect(x.frontage).toBe(x.faces === "street" || x.faces === "parkEdge" || x.faces === "plaza" ? "street" : "quiet");
            if (beyond === undefined) expect(x.faces).toBe("street");
            if (beyond === "walk") expect(x.faces).toBe("walk");
            if (beyond === "apron") expect(x.faces).toBe("court");
            if (beyond === "laneMouth" || beyond === "lane") expect(x.faces).toBe("lane");
          }
          if (b.partner) {
            const q = builtAt.get(keyOf(b.partner.i, b.partner.j));
            expect(q, `partner of (${b.i}, ${b.j}) is built`).toBeDefined();
            expect(q!.part).toBe(b.part);
          }
        }
        expect(kinds.corner).toBeGreaterThan(0);
        expect(kinds.mid).toBeGreaterThan(0);
        expect(kinds.blind).toBeGreaterThan(0);
      });

      it.skipIf(!isOk(o))("the picture holds R-5: the lattice's size, every index in the legend, and each cell's legend matches the layer", () => {
        const { streets, mass, plan } = layersOf(o);
        const pic = massStage.picture(plan);
        expect(pictureProblems(pic, streets.w, streets.h)).toEqual([]);
        expect(pic.legend).toBe(MASS_LEGEND);
        const cell = new Map(mass.cells.map((c) => [keyOf(c.i, c.j), c] as const));
        const builtAt = new Map(mass.built.map((b) => [keyOf(b.i, b.j), b] as const));
        const NAME: Record<string, string> = { lane: "lane", laneMouth: "lane mouth", plaza: "plaza", walk: "walk-through", drive: "drive", frontLot: "frontage lot", apron: "apron", stalls: "stalls", aisle: "aisle", green: "green", greenPath: "path", parkEdge: "park edge" };
        for (let j = 0; j < streets.h; j++) {
          for (let i = 0; i < streets.w; i++) {
            const c = cell.get(keyOf(i, j));
            const want = !c ? "street" : c.use === "built" ? `built: ${builtAt.get(keyOf(i, j))!.column}` : NAME[c.use]!;
            expect(pic.legend[pic.cells[j * streets.w + i]!]!.name).toBe(want);
          }
        }
      });
    });
  }

  // The mass digest pins as B2 left them (3 x 3 seed 1 "b04dea0a", seed 2 "254afa4f", seed 3 "8f2ab5c9", 6 x 4 seed 1 "4be24138") are MOVED BY C2 on purpose: courts, units and lots join the layer, and the walk-throughs a drive
  // replaces go. They cannot be re-taken while the stage fails on these cities (no layer, no digest), so the test waits for the day P2 can hold.
  it.todo("R-4: the layer's digest is pinned on the default city, 3 x 3 seeds 2 and 3, and 6 x 4 seed 1, re-taken in C2 and named there as moved by C2");

  it("R-4: a test double for the mass stage leaves the streets and land digests equal to the standard run's", () => {
    const o = { blocksX: 3, blocksZ: 3, seed: 2 };
    const double: CityStageDef = { name: "mass", run: () => ({ stage: "mass", cells: [], built: [], openings: [], courts: [], units: [] }), picture: massStage.picture } as unknown as CityStageDef;
    const doubled = runCity(o, "mass", [streetsStage as unknown as CityStageDef, landStage as unknown as CityStageDef, double]);
    expect(doubled.ok).toBe(true);
    expect(doubled.plan.digests.streets).toBe(cityOf(o).plan.digests.streets);
    expect(doubled.plan.digests.land).toBe(cityOf(o).plan.digests.land);
    expect(doubled.plan.digests.mass).not.toBe(cityOf(o).plan.digests.mass);
  });

  it("R-3: the stage's randomness is its own: the same city twice is the same layer, and another seed is another layer", () => {
    // the fingerprint is the digest where the stage returned ok, and its failure reason where it did not (C2 is stopped: see the header)
    const finger = (r: ReturnType<typeof runCity>): string | undefined => (r.ok ? r.plan.digests.mass : r.failure.reason);
    expect(finger(runCity({ blocksX: 3, blocksZ: 3, seed: 2 }, "mass"))).toBe(finger(cityOf({ blocksX: 3, blocksZ: 3, seed: 2 })));
    expect(finger(cityOf({ blocksX: 3, blocksZ: 3, seed: 2 }))).not.toBe(finger(cityOf({ blocksX: 3, blocksZ: 3, seed: 3 })));
  });

  it.skipIf(!NAMED.some(isOk))("R-1: the layer is frozen when the stage returns", () => {
    const { mass } = layersOf(NAMED.find(isOk)!);
    expect(Object.isFrozen(mass)).toBe(true);
    expect(Object.isFrozen(mass.cells[0])).toBe(true);
    expect(() => {
      (mass.built as unknown as unknown[]).push(1);
    }).toThrow();
  });

  it("R-7: a 6 x 6 city (seed 1) ends ok or with a failure naming a check, never an uncaught error", () => {
    const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "mass");
    if (!r.ok) {
      expect(["land", "mass"]).toContain(r.failure.stage);
      expect(r.failure.reason).not.toMatch(/^bug:/);
      expect(r.failure.reason).toMatch(/^(V3|V4|M3|M4a|M4b|M5|G2|G3|R1|P2)/);
    } else expect(r.plan.layers.mass!.cells.length).toBeGreaterThan(0);
  });

  it("R-7: no block count, block id or lattice size is written into the stage's code", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"))) {
      const text = readFileSync(dir + f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(text, f).not.toMatch(/block:\d|blocksX|blocksZ|CITY_BLOCKS/);
    }
  });

  it("R-6: the stage imports only src/core/ and src/city/, and no other stage's folder", () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".ts") && !n.endsWith(".test.ts"))) {
      for (const m of readFileSync(dir + f, "utf8").matchAll(/from "([^"]+)"/g)) {
        const spec = m[1]!;
        expect(spec.startsWith("./") || spec.startsWith("../../core") || spec.startsWith("../pipeline/"), `${f} imports ${spec}`).toBe(true);
      }
    }
  });

  it("report: what each named city did (the failure where the stage stopped), and where it returned ok its R1, openings, homes, stalls wanted and stalls laid", () => {
    const rows: string[] = ["city | result | R1 (built / frontage cells) | lanes | plazas | walks | parks | drives | frontage lots | homes | stalls wanted | stalls laid"];
    for (const o of NAMED) {
      const r = cityOf(o);
      if (!r.ok) {
        rows.push(`${label(o)} | stopped: ${r.failure.reason}`);
        continue;
      }
      const { mass, streets } = layersOf(o);
      const f = frontageShare(mass);
      const n = parkingNumbers(mass, streets.blocks);
      const kind = (k: string): number => mass.openings.filter((x) => x.kind === k).length;
      rows.push([label(o), "ok", `${f.share.toFixed(3)} (${f.built}/${f.total})`, kind("lane") / 2, kind("plaza"), kind("walk"), kind("park"), kind("drive"), kind("frontLot"), n.homes, n.stallDemand.toFixed(1), n.lotStalls].join(" | "));
    }
    console.log(rows.join("\n"));
    expect(rows).toHaveLength(NAMED.length + 1);
  });
});

