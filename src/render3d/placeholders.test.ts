import { describe, expect, it } from "vitest";
import { NEIGHBOUR_GAP, WORLD_PER_METRE, lotGap } from "./models";
import { FOOTPRINT_FACTORS, STOREYS, TINTS, pickPlaceholders, placeholderBuilding, variantCount } from "./placeholders";
import { LOT_TYPE_NAMES, STOREY_M, type Lot, type LotType } from "./kitunits";

const lot = (type: LotType, key = "k"): Lot => ({ x: 0, z: 0, w: 2, d: 2.5, yaw: 0, type, hMax: 2.5, key, street: "r", side: 1 } as unknown as Lot);

/** A typed fixture (ticket 081 A2c, in place of the ladder maps): a row of eight lots of each type, side by side along x, 0.1 apart, plus one terrace lot. */
const LOTS: readonly Lot[] = [
  ...LOT_TYPE_NAMES.flatMap((t, ti) => Array.from({ length: 8 }, (_, k): Lot => ({ ...lot(t, `${t}:${k}`), x: k * 2.1, z: ti * 6, hMax: 6 }))),
  { ...lot("large", "terrace:0"), x: 0, z: 30, hMax: 6, terrace: { run: "r0", index: 0, bays: 2 } },
];

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

describe("pickPlaceholders on a typed lots fixture", () => {
  it("gives every lot a placeholder inside its lot, of storeys x STOREY_M x WORLD_PER_METRE, never over the cap", () => {
    const specs = pickPlaceholders(LOTS);
    expect(specs).toHaveLength(LOTS.length);
    LOTS.forEach((l, i) => {
      const s = specs[i]!;
      if (l.terrace) {
        // 051 B: a terrace lot's body fills its whole lot, so the boxes of a run abut (factor 1, not 0.8 to 0.9).
        expect(s.w, l.key).toBeCloseTo(l.w, 12);
        expect(s.d, l.key).toBeCloseTo(l.d, 12);
      } else {
        expect(s.w, l.key).toBeLessThanOrEqual(l.w * 0.9 + 1e-12);
        expect(s.d).toBeLessThanOrEqual(l.d * 0.9 + 1e-12);
        expect(s.w).toBeGreaterThanOrEqual(l.w * 0.8 - 1e-12);
      }
      expect(s.bodyH).toBeCloseTo(s.storeys * STOREY_M * WORLD_PER_METRE, 12);
      expect(s.storeys).toBeGreaterThanOrEqual(STOREYS[l.type][0]);
      expect(s.storeys).toBeLessThanOrEqual(STOREYS[l.type][1]);
      expect(s.bodyH + s.roofH, `${l.key} cap`).toBeLessThanOrEqual(l.hMax + 1e-12);
    });
  });

  it("gives no two lots within NEIGHBOUR_GAP the same variant when their type has three or more", () => {
    const specs = pickPlaceholders(LOTS);
    let pairs = 0;
    for (let i = 0; i < LOTS.length; i++) {
      for (let j = i + 1; j < LOTS.length; j++) {
        const a = LOTS[i]!;
        const b = LOTS[j]!;
        if (a.type !== b.type || Math.hypot(a.x - b.x, a.z - b.z) > 9 || lotGap(a, b) > NEIGHBOUR_GAP) continue;
        pairs++;
        expect(specs[i]!.variant, `${a.key} beside ${b.key}`).not.toBe(specs[j]!.variant);
      }
    }
    expect(pairs).toBeGreaterThan(20);
  });
});
