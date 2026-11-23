import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Matrix4, type InstancedMesh } from "three";
import { loadPuzzle, type Puzzle } from "../core";
import { NEIGHBOUR_GAP, WORLD_PER_METRE, atFront, lotGap } from "./models";
import { FOOTPRINT_FACTORS, STOREYS, TINTS, pickPlaceholders, placeholderBuilding, variantCount } from "./placeholders";
import { buildScene } from "./scene";
import { LOT_TYPE_NAMES, STOREY_M, townLayout, type Lot, type LotType } from "./town";
import { stubTextSurface } from "./text";

const files = [...readdirSync("puzzles").filter((f) => f.endsWith(".json")), "lamp-row.grid.json"].map((f) => join("puzzles", f)).filter((f, i, all) => existsSync(f) && all.indexOf(f) === i);
const maps: { name: string; puzzle: Puzzle }[] = files.map((f) => ({ name: f, puzzle: loadPuzzle(JSON.parse(readFileSync(f, "utf8"))) }));

const lot = (type: LotType, key = "k"): Lot => ({ x: 0, z: 0, w: 2, d: 2.5, yaw: 0, type, hMax: 2.5, key, street: "r", side: 1 } as unknown as Lot);

describe("placeholderBuilding", () => {
  it("is a pure function of the lot and the variant", () => {
    for (const t of LOT_TYPE_NAMES) {
      expect(placeholderBuilding(lot(t, "a"))).toEqual(placeholderBuilding(lot(t, "a")));
      expect(placeholderBuilding(lot(t, "a"), 7)).toEqual(placeholderBuilding(lot(t, "a"), 7));
    }
  });

  it("has storeys by type: small 1 to 3, house 2 to 4, large 1 to 2, tall 5 to 8", () => {
    expect(STOREYS).toEqual({ small: [1, 3], house: [2, 4], large: [1, 2], tall: [5, 8] });
    for (const t of LOT_TYPE_NAMES) {
      const seen = new Set<number>();
      for (let v = 0; v < variantCount(t); v++) seen.add(placeholderBuilding(lot(t), v).storeys);
      expect([...seen].sort((a, b) => a - b), t).toEqual(Array.from({ length: STOREYS[t][1] - STOREYS[t][0] + 1 }, (_, i) => STOREYS[t][0] + i));
    }
  });

  it("gives a house a pitched roof and every other type a flat one", () => {
    for (const t of LOT_TYPE_NAMES) expect(placeholderBuilding(lot(t)).roof).toBe(t === "house" ? "pitched" : "flat");
  });

  it("uses one of four tints, and 4 x storeys variants per type, wrapping any variant number", () => {
    for (const t of LOT_TYPE_NAMES) {
      expect(variantCount(t)).toBe(4 * (STOREYS[t][1] - STOREYS[t][0] + 1));
      const tints = new Set<number>();
      for (let v = 0; v < variantCount(t); v++) tints.add(placeholderBuilding(lot(t), v).tint);
      expect(tints.size).toBe(4);
      expect(placeholderBuilding(lot(t), variantCount(t) + 2)).toEqual(placeholderBuilding(lot(t), 2));
      expect(placeholderBuilding(lot(t), -1).variant).toBe(variantCount(t) - 1);
    }
    expect(TINTS).toHaveLength(4);
  });

  it("makes the footprint the lot times 0.8 or 0.9 in each direction", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const l = lot("small", `k${i}`);
      const s = placeholderBuilding(l);
      expect(FOOTPRINT_FACTORS as readonly number[]).toContain(s.w / l.w);
      expect(FOOTPRINT_FACTORS as readonly number[]).toContain(s.d / l.d);
      seen.add(`${s.w / l.w},${s.d / l.d}`);
    }
    expect(seen.size).toBe(4);
  });

  it("keeps the roof under the lot's cap: a tall tower's top is at its cap at most", () => {
    const l: Lot = { ...lot("tall"), hMax: 28 * WORLD_PER_METRE };
    for (let v = 0; v < variantCount("tall"); v++) {
      const s = placeholderBuilding(l, v);
      expect(s.bodyH + s.roofH).toBeLessThanOrEqual(l.hMax + 1e-12);
    }
    // A cap that the body already reaches leaves no roof rise.
    const squat: Lot = { ...lot("house"), hMax: 4 * STOREY_M * WORLD_PER_METRE };
    expect(placeholderBuilding(squat, 8).roofH).toBe(0);
  });
});

describe("pickPlaceholders on every map", () => {
  it("has maps", () => {
    expect(maps.length).toBeGreaterThan(60);
  });

  it("gives every lot a placeholder inside its lot, of storeys x STOREY_M x WORLD_PER_METRE, never over the cap", () => {
    let n = 0;
    for (const { name, puzzle } of maps) {
      const lots = townLayout(puzzle).lots;
      const specs = pickPlaceholders(lots);
      expect(specs, name).toHaveLength(lots.length);
      lots.forEach((l, i) => {
        const s = specs[i]!;
        if (l.terrace) {
          // 051 B: a terrace lot's body fills its whole lot, so the boxes of a run abut (factor 1, not 0.8 to 0.9).
          expect(s.w, `${name} ${l.key}`).toBeCloseTo(l.w, 12);
          expect(s.d, `${name} ${l.key}`).toBeCloseTo(l.d, 12);
        } else {
          expect(s.w, `${name} ${l.key}`).toBeLessThanOrEqual(l.w * 0.9 + 1e-12);
          expect(s.d).toBeLessThanOrEqual(l.d * 0.9 + 1e-12);
          expect(s.w).toBeGreaterThanOrEqual(l.w * 0.8 - 1e-12);
        }
        expect(s.bodyH).toBeCloseTo(s.storeys * STOREY_M * WORLD_PER_METRE, 12);
        expect(s.storeys).toBeGreaterThanOrEqual(STOREYS[l.type][0]);
        expect(s.storeys).toBeLessThanOrEqual(STOREYS[l.type][1]);
        expect(s.bodyH + s.roofH, `${name} ${l.key} cap`).toBeLessThanOrEqual(l.hMax + 1e-12);
        n++;
      });
    }
    expect(n).toBeGreaterThan(5000);
  });

  it("is deterministic", () => {
    for (const { puzzle } of maps.slice(0, 5)) expect(pickPlaceholders(townLayout(puzzle).lots)).toEqual(pickPlaceholders(townLayout(puzzle).lots));
  });

  it("gives no two lots within NEIGHBOUR_GAP the same variant when their type has three or more, on every map", () => {
    let pairs = 0;
    for (const { name, puzzle } of maps) {
      const lots = townLayout(puzzle).lots;
      const specs = pickPlaceholders(lots);
      for (let i = 0; i < lots.length; i++) {
        for (let j = i + 1; j < lots.length; j++) {
          const a = lots[i]!;
          const b = lots[j]!;
          if (a.type !== b.type || Math.hypot(a.x - b.x, a.z - b.z) > 9 || lotGap(a, b) > NEIGHBOUR_GAP) continue;
          pairs++;
          expect(specs[i]!.variant, `${name} ${a.key} beside ${b.key}`).not.toBe(specs[j]!.variant);
        }
      }
    }
    expect(pairs).toBeGreaterThan(1000);
  });
});

describe("the scene with no models", () => {
  const puzzle = maps.find((m) => m.name.includes("09-shrine-circuit"))!.puzzle;
  const b = buildScene(puzzle, { text: stubTextSurface });
  const lots = townLayout(puzzle).lots;
  /** A lot type's own placeholders (a terrace lot has the group of its own, `placeholders:terrace`). */
  const groupOf = (t: (typeof LOT_TYPE_NAMES)[number] | "terrace") => (t === "terrace" ? b.slots.blocks.placeholder.getObjectByName("placeholders:terrace")! : b.slots.blocks.byType[t]);
  const inGroup = (l: (typeof lots)[number], t: (typeof LOT_TYPE_NAMES)[number] | "terrace"): boolean => (t === "terrace" ? l.terrace !== undefined : l.type === t && l.terrace === undefined);

  it("draws one placeholder body per lot, in the group of its lot type, and shows every group", () => {
    expect(b.slots.blocks.placeholder.visible).toBe(true);
    for (const t of [...LOT_TYPE_NAMES, "terrace"] as const) {
      const group = groupOf(t);
      expect(group.visible, t).toBe(true);
      const bodies = group.children[0] as InstancedMesh;
      expect(bodies.count, t).toBe(lots.filter((l) => inGroup(l, t)).length);
    }
    expect(lots.length).toBeGreaterThan(50);
  });

  it("puts each body inside its lot: matrices carry the lot's yaw and the spec's footprint and height", () => {
    const specs = pickPlaceholders(lots);
    for (const t of [...LOT_TYPE_NAMES, "terrace"] as const) {
      const bodies = groupOf(t).children[0] as InstancedMesh;
      const mine = lots.map((l, i) => [l, specs[i]!] as const).filter(([l]) => inGroup(l, t));
      const probe = new Matrix4();
      for (let k = 0; k < Math.min(mine.length, 25); k++) {
        bodies.getMatrixAt(k, probe);
        const [l, s] = mine[k]!;
        const e = probe.elements;
        // Setback (041 C): the body's front face is against its lot's front edge, not centred on the lot.
        const at = atFront(l, s.d);
        expect(e[12], t).toBeCloseTo(at.x, 4);
        expect(e[14]).toBeCloseTo(at.z, 4);
        const along = (e[12]! - l.x) * Math.sin(l.yaw) + (e[14]! - l.z) * Math.cos(l.yaw);
        expect(along + s.d / 2, `${t} ${l.key} front face`).toBeCloseTo(l.d / 2, 4);
        // The matrix carries the lot's yaw (the body's local +z, its front, points at the road).
        expect(Math.atan2(e[8]!, e[10]!), `${t} ${l.key} yaw`).toBeCloseTo(Math.atan2(Math.sin(l.yaw), Math.cos(l.yaw)), 4);
        expect(Math.hypot(e[0]!, e[1]!, e[2]!)).toBeCloseTo(s.w, 4);
        expect(Math.hypot(e[4]!, e[5]!, e[6]!)).toBeCloseTo(s.bodyH, 4);
        expect(Math.hypot(e[8]!, e[9]!, e[10]!)).toBeCloseTo(s.d, 4);
      }
    }
  });

  it("keeps every lamp's place as its own mesh that warms: one material per lamp, a box in the scene for each part", () => {
    const places = townLayout(puzzle).places;
    expect(b.places.size).toBe(places.length);
    for (const p of places) {
      const mat = b.places.get(p.lamp)!;
      expect(mat, p.lamp).toBeDefined();
      let boxes = 0;
      b.scene.traverse((o) => {
        if ((o as { material?: unknown }).material === mat) boxes++;
      });
      expect(boxes, p.lamp).toBe(p.boxes.length);
    }
  });
});
