/** Typed-in fixtures for the era tests (ticket 073 C1). Imported by tests only. */
import type { CalibrationKey, CityEraLayers, CityEraPiece, CityEraPlan, CityHistoryLayer, CityPlan } from "../../core";
import { deepFreeze } from "./run";

export const k = (name: string): CalibrationKey => `pack:${name}`;
const pl = (key: CalibrationKey, x: number, z: number, y = 0, yaw = 0) => ({ key, x_m: x, y_m: y, z_m: z, yaw_deg: yaw });
const sz = { x_m: 1, z_m: 1, h_m: 1 };

/** Three pieces in every flat list, two columns of two pieces, a streets layer of one corridor. Keys are "pack:<list>_<n>". */
export function fixturePlan(): CityPlan {
  const three = <T>(make: (n: number) => T): T[] => [0, 1, 2].map(make);
  const cell = (n: number) => ({ i: n, j: 0 });
  const plan = {
    options: { blocksX: 1, blocksZ: 1, seed: 1 },
    layers: {
      streets: { stage: "streets", w: 8, h: 5, streets: [], cells: [], blocks: [], junctions: [], outline: {}, arrows: [] },
      edge: {
        stage: "edge",
        cells: [],
        ground: three((n) => ({ ...cell(n), cells: 1, role: "pavement", variant: 0, x_m: n, z_m: 0, yaw: 0, street: "x:0" })),
        buildoutTrees: three((n) => ({ cell: cell(n), x_m: n, z_m: 0, street: "x:0" })),
      },
      buildings: {
        stage: "buildings",
        rows: [],
        buildings: [],
        columns: [0, 1].map((c) => ({ ...cell(c), pieces: [0, 1].map((n) => ({ role: "floor", storey: n + 1, span: 1, placement: pl(k(`bp_${c}_${n}`), c, n) })) })),
      },
      facades: {
        stage: "facades",
        ground: three((n) => ({ kind: "shop", placement: pl(k(`fg_${n}`), n, 0) })),
        dressing: three((n) => ({ kind: "glass", placement: pl(k(`fd_${n}`), n, 0) })),
        walls: three((n) => ({ kind: "aircon", placement: pl(k(`fw_${n}`), n, 0) })),
        roofs: three((n) => ({ kind: "small", placement: pl(k(`fr_${n}`), n, 0) })),
        novelty: three((n) => ({ kind: "pizza", placement: pl(k(`fn_${n}`), n, 0) })),
      },
      ground: { stage: "ground", runs: [], props: three((n) => ({ kind: "bin", placement: pl(k(`gp_${n}`), n, 0), size: sz })) },
      traffic: { stage: "traffic", junctions: [], inner: true, pieces: three((n) => ({ kind: "stopSign", placement: pl(k(`tp_${n}`), n, 0), size: sz })) },
    },
    digests: {},
  };
  return deepFreeze(plan as unknown as CityPlan);
}

export const eraPlan = (plan: CityPlan, layers: Partial<CityEraLayers> = {}): CityEraPlan => deepFreeze({ plan, layers, digests: {} });

export function add(id: string, key: CalibrationKey, x: number, z: number, size = { x_m: 1, z_m: 1, h_m: 1 }, y = 0, district = "district:a", yaw = 0): CityEraPiece {
  return { id, kind: "thing", district, cell: { i: Math.floor(x / 5), j: Math.floor(z / 5) }, placement: pl(key, x, z, y, yaw), size };
}

export const history = (districts: { id: string; blocks: string[] }[]): CityHistoryLayer => ({
  stage: "history",
  districts: districts.map((d) => ({ ...d, tech: 0.5, held: 0.5, wild: 0.5 })),
});
