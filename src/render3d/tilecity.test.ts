/**
 * Ticket 055 A: the tile-street city, as pure data (`tilecity.ts`). No three, no WebGL, no assets: every number is computed from the city's own streets and bands
 * in the test, independently of the code that placed the cells. Cities are built once per (size, seed) and shared between the tests. A loop over cells records its
 * failures in a list and asserts the list once (a per-cell `expect` over a hundred cities is the slow part, not the city).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AVENUE_ONE_IN,
  BAYS_PER_PARKING_TILE,
  BAY_JUNCTION_CLEAR,
  BLOCK_TILES,
  CITY_BLOCKS_MAX,
  GRATE_ONE_IN,
  PATCH_ONE_IN,
  POLE_SLOT_END_CLEAR_M,
  POLE_SLOT_FROM_KERB_M,
  POLE_SLOT_PITCH_M,
  SIDEWALK_TOP_M,
  TILE_M,
  streetBandAt,
  tileCity,
  type TileBand,
  type TileCell,
  type TileCity,
  type TileRole,
  type TileStreet,
} from "./tilecity";
import { WORLD_PER_METRE } from "./town";

const U = WORLD_PER_METRE;
const SIZES: readonly [number, number][] = [
  [1, 1],
  [3, 3],
  [6, 4],
  [6, 6],
];
const SEEDS = Array.from({ length: 20 }, (_, k) => k + 1);

/** What the tests derive once per city, from the streets' bands alone. */
interface View {
  c: TileCity;
  W: number;
  H: number;
  byId: Map<string, TileStreet>;
  /** The "z" street through each column and the "x" street through each row, or null. */
  zAt: (TileStreet | null)[];
  xAt: (TileStreet | null)[];
  /** One role per unit cell (a two-cell piece fills both), null where there is none. */
  role: (TileRole | null)[];
}
const memo = new Map<string, View>();
const view = (bx: number, bz: number, seed: number): View => {
  const key = `${bx}x${bz}:${seed}`;
  let v = memo.get(key);
  if (!v) {
    const c = tileCity({ blocksX: bx, blocksZ: bz, seed });
    const W = Math.round(c.town.window.maxX / U / TILE_M);
    const H = Math.round(c.town.window.maxY / U / TILE_M);
    const byId = new Map(c.streets.map((s) => [s.id, s]));
    const zAt: (TileStreet | null)[] = [];
    const xAt: (TileStreet | null)[] = [];
    for (let i = 0; i < W; i++) zAt.push(c.streets.find((s) => s.axis === "z" && streetBandAt(s, i) !== null) ?? null);
    for (let j = 0; j < H; j++) xAt.push(c.streets.find((s) => s.axis === "x" && streetBandAt(s, j) !== null) ?? null);
    const role = new Array<TileRole | null>(W * H).fill(null);
    for (const cell of c.cells) {
      role[cell.j * W + cell.i] = cell.role;
      if (cell.cells === 2) role[(cell.j + (byId.get(cell.street!)!.axis === "x" ? 0 : 1)) * W + cell.i + (byId.get(cell.street!)!.axis === "x" ? 1 : 0)] = cell.role;
    }
    v = { c, W, H, byId, zAt, xAt, role };
    memo.set(key, v);
  }
  return v;
};
const forAll = (fn: (v: View, label: string, ok: (cond: boolean, msg: string) => void) => void): void => {
  const fails: string[] = [];
  for (const [bx, bz] of SIZES) {
    for (const seed of SEEDS) {
      const label = `${bx}x${bz} seed ${seed}`;
      fn(view(bx, bz, seed), label, (cond, msg) => {
        if (!cond && fails.length < 12) fails.push(`${label}: ${msg}`);
      });
    }
  }
  expect(fails).toEqual([]);
};

const YAWS = [0, 90, 180, 270];
const isCarriageBand = (b: TileBand | null): boolean => b === "lane" || b === "parking";
const CARRIAGE_ROLES: readonly (TileRole | null)[] = ["lane", "parking", "parkingPlain"];
const unitCells = (v: View, cell: TileCell): [number, number][] => {
  if (cell.cells === 1) return [[cell.i, cell.j]];
  return v.byId.get(cell.street!)!.axis === "x"
    ? [[cell.i, cell.j], [cell.i + 1, cell.j]]
    : [[cell.i, cell.j], [cell.i, cell.j + 1]];
};

describe("on the grid (criterion 1)", () => {
  it("puts every cell on the grid, every yaw on a right angle, every footprint at one or two cells", () => {
    forAll((v, _l, ok) => {
      for (const cell of v.c.cells) {
        ok(cell.cells === 1 || cell.cells === 2, "footprint");
        ok(YAWS.includes(cell.yaw), "yaw");
        if (cell.cells === 1) {
          ok(cell.x_m / TILE_M - 0.5 === cell.i && cell.z_m / TILE_M - 0.5 === cell.j, `centre of (${cell.i},${cell.j})`);
        } else {
          ok(cell.role === "parking", "only parking is two cells");
          const x = v.byId.get(cell.street!)!.axis === "x";
          ok(x ? cell.x_m / TILE_M === cell.i + 1 && cell.z_m / TILE_M - 0.5 === cell.j : cell.x_m / TILE_M - 0.5 === cell.i && cell.z_m / TILE_M === cell.j + 1, `pair at (${cell.i},${cell.j})`);
        }
      }
    });
  });

  it("turns a lane, parking and pavement front toward the right side of its street", () => {
    // yaw 0 points at +z, 90 at +x, 180 at -z, 270 at -x.
    const front = (yaw: number): { x: number; z: number } => ({ x: Math.round(Math.sin((yaw * Math.PI) / 180)), z: Math.round(Math.cos((yaw * Math.PI) / 180)) });
    forAll((v, _l, ok) => {
      for (const cell of v.c.cells) {
        if (!cell.street) continue;
        const s = v.byId.get(cell.street)!;
        const f = front(cell.yaw);
        const across = (s.axis === "x" ? f.z : f.x) + 0;
        const along = (s.axis === "x" ? f.x : f.z) + 0;
        const here = s.axis === "x" ? cell.z_m : cell.x_m;
        if (cell.role === "lane" || cell.role === "parking" || cell.role === "parkingPlain") {
          ok(along === 0 && across === Math.sign(s.centre_m - here), `${cell.role} (${cell.i},${cell.j}) yaw ${cell.yaw}`);
        } else if (cell.role === "pavement") {
          ok(along === 0 && across === (here < s.carriage.lo_m ? 1 : -1), `pavement (${cell.i},${cell.j}) yaw ${cell.yaw}`);
        }
      }
    });
  });

  it("points each corner at its junction", () => {
    // yaw 0: kerb edges on +x and +z; 90: +x and -z; 180: -x and -z; 270: -x and +z.
    const want: Record<number, [number, number]> = { 0: [1, 1], 90: [1, -1], 180: [-1, -1], 270: [-1, 1] };
    forAll((v, _l, ok) => {
      for (const cell of v.c.cells) {
        if (cell.role !== "pavementCorner") continue;
        const z = v.zAt[cell.i]!;
        const x = v.xAt[cell.j]!;
        const sx = z.carriage.lo_m > cell.x_m ? 1 : -1;
        const sz = x.carriage.lo_m > cell.z_m ? 1 : -1;
        ok(want[cell.yaw]![0] === sx && want[cell.yaw]![1] === sz, `corner (${cell.i},${cell.j}) yaw ${cell.yaw}`);
      }
    });
  });
});

describe("no gaps, no overlaps (criterion 2)", () => {
  it("partitions the union of the streets' rights of way exactly", () => {
    forAll((v, _l, ok) => {
      const { W, H } = v;
      const count = new Uint8Array(W * H);
      let area = 0;
      for (const cell of v.c.cells) {
        area += cell.cells * TILE_M * TILE_M;
        for (const [i, j] of unitCells(v, cell)) count[j * W + i] = (count[j * W + i] ?? 0) + 1;
      }
      let unionCells = 0;
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const inside = v.zAt[i] !== null || v.xAt[j] !== null;
          if (inside) unionCells++;
          ok(count[j * W + i] === (inside ? 1 : 0), `(${i},${j}) covered ${count[j * W + i]}`);
        }
      }
      ok(Math.abs(area - unionCells * TILE_M * TILE_M) < 1e-6, "summed area");
    });
  });

  it("covers a 1 x 1 city's blocks with no cell", () => {
    const v = view(1, 1, 1);
    const b = v.c.blocks[0]!;
    for (let j = b.j0; j < b.j1; j++) for (let i = b.i0; i < b.i1; i++) expect(v.role[j * v.W + i]).toBeNull();
  });
});

describe("junctions (criterion 3)", () => {
  it("gives every cell the role its bands say", () => {
    forAll((v, _l, ok) => {
      for (const cell of v.c.cells) {
        const z = v.zAt[cell.i]!;
        const x = v.xAt[cell.j]!;
        const vb = z ? streetBandAt(z, cell.i) : null;
        const hb = x ? streetBandAt(x, cell.j) : null;
        let want: TileRole[];
        if (vb && hb) want = isCarriageBand(vb) && isCarriageBand(hb) ? ["junction"] : isCarriageBand(vb) || isCarriageBand(hb) ? ["crossing"] : ["pavementCorner"];
        else {
          const b = (vb ?? hb)!;
          want = b === "parking" ? ["parking", "parkingPlain"] : [b];
        }
        ok(want.includes(cell.role), `(${cell.i},${cell.j}) is ${cell.role}, bands say ${want.join("/")}`);
        // A crossing belongs to the street whose carriageway it lies in.
        if (cell.role === "crossing") ok(cell.street === (isCarriageBand(vb) ? z!.id : x!.id), `crossing street at (${cell.i},${cell.j})`);
        if (cell.role === "junction" || cell.role === "pavementCorner") ok(cell.street === null, "two streets, no owner");
      }
    });
  });

  it("fills every junction box with junction cells and every approach with a full crossing row", () => {
    forAll((v, _l, ok) => {
      const { W } = v;
      const at = (i: number, j: number): TileRole | null => v.role[j * W + i] ?? null;
      const zs = v.c.streets.filter((s) => s.axis === "z");
      const xs = v.c.streets.filter((s) => s.axis === "x");
      for (const z of zs) {
        for (const x of xs) {
          const i0 = z.carriage.lo_m / TILE_M;
          const i1 = z.carriage.hi_m / TILE_M;
          const j0 = x.carriage.lo_m / TILE_M;
          const j1 = x.carriage.hi_m / TILE_M;
          for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) ok(at(i, j) === "junction", `box ${z.id} ${x.id}`);
          const lastCol = z.across0 + z.bands.length - 1;
          const lastRow = x.across0 + x.bands.length - 1;
          for (let j = j0; j < j1; j++) ok(at(z.across0, j) === "crossing" && at(lastCol, j) === "crossing", `crossing column of ${z.id} at ${x.id}`);
          for (let i = i0; i < i1; i++) ok(at(i, x.across0) === "crossing" && at(i, lastRow) === "crossing", `crossing row of ${x.id} at ${z.id}`);
          for (const i of [z.across0, lastCol]) for (const j of [x.across0, lastRow]) ok(at(i, j) === "pavementCorner", `corner of ${z.id} ${x.id}`);
        }
      }
    });
  });

  it("makes each block corner a pavementCorner and keeps every lane out of a second street's band", () => {
    forAll((v, _l, ok) => {
      const { W } = v;
      for (const b of v.c.blocks) {
        for (const [i, j] of [
          [b.i0 - 1, b.j0 - 1],
          [b.i1, b.j0 - 1],
          [b.i0 - 1, b.j1],
          [b.i1, b.j1],
        ] as const) {
          ok(v.role[j * W + i] === "pavementCorner", `${b.id} corner (${i},${j})`);
        }
      }
      for (const cell of v.c.cells) if (cell.role === "lane") ok(!(v.zAt[cell.i] && v.xAt[cell.j]), `lane (${cell.i},${cell.j}) in two bands`);
    });
  });
});

describe("kerbs (criterion 4)", () => {
  /** The unit edges a kerb segment covers: "h:i:L" for an edge along x on grid line L, "v:L:j" for one along z. */
  const edgesOf = (k: { ax: number; az: number; bx: number; bz: number }): string[] => {
    const out: string[] = [];
    const g = (n: number): number => Math.round(n / (TILE_M * U));
    if (Math.abs(k.az - k.bz) < 1e-9) for (let i = g(k.ax); i < g(k.bx); i++) out.push(`h:${i}:${g(k.az)}`);
    else for (let j = g(k.az); j < g(k.bz); j++) out.push(`v:${g(k.ax)}:${j}`);
    return out;
  };

  it("lies on every pavement and carriageway cell edge and on no other", () => {
    forAll((v, _l, ok) => {
      const { W, H, role: r } = v;
      const want = new Set<string>();
      const edge = (a: TileRole | null, b: TileRole | null): boolean => (a === "pavement" && CARRIAGE_ROLES.includes(b)) || (b === "pavement" && CARRIAGE_ROLES.includes(a));
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const here = r[j * W + i] ?? null;
          if (i > 0 && edge(r[j * W + i - 1] ?? null, here)) want.add(`v:${i}:${j}`);
          if (j > 0 && edge(r[(j - 1) * W + i] ?? null, here)) want.add(`h:${i}:${j}`);
        }
      }
      const got: string[] = [];
      for (const k of v.c.town.kerbs) got.push(...edgesOf(k));
      const gotSet = new Set(got);
      ok(gotSet.size === got.length, "an edge twice");
      ok(gotSet.size === want.size && [...want].every((e) => gotSet.has(e)), `kerb edges ${gotSet.size} vs ${want.size}`);
      for (const key of got) {
        const [t, a, b] = key.split(":");
        const A = Number(a);
        const B = Number(b);
        const sides = t === "h" ? [r[(B - 1) * W + A], r[B * W + A]] : [r[B * W + A - 1], r[B * W + A]];
        for (const role of sides) ok(role !== "junction" && role !== "crossing", `kerb ${key} on ${role}`);
      }
    });
  });

  it("is one merged segment per block side, between its corners", () => {
    forAll((v, _l, ok) => {
      const kerbs = v.c.town.kerbs;
      const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
      for (const b of v.c.blocks) {
        const i0 = b.i0 * TILE_M * U;
        const i1 = b.i1 * TILE_M * U;
        const j0 = b.j0 * TILE_M * U;
        const j1 = b.j1 * TILE_M * U;
        const n = (road: string, side: number, f: (k: (typeof kerbs)[number]) => boolean): number => kerbs.filter((k) => k.road === road && k.side === side && f(k)).length;
        ok(n(`x:${b.bj}`, 1, (k) => near(k.ax, i0) && near(k.bx, i1)) === 1, `${b.id} top`);
        ok(n(`x:${b.bj + 1}`, -1, (k) => near(k.ax, i0) && near(k.bx, i1)) === 1, `${b.id} bottom`);
        ok(n(`z:${b.bi}`, -1, (k) => near(k.az, j0) && near(k.bz, j1)) === 1, `${b.id} left`);
        ok(n(`z:${b.bi + 1}`, 1, (k) => near(k.az, j0) && near(k.bz, j1)) === 1, `${b.id} right`);
      }
      const c = v.c;
      ok(kerbs.length === 2 * c.blocksX * (c.blocksZ + 1) + 2 * c.blocksZ * (c.blocksX + 1), `kerb count ${kerbs.length}`);
    });
  });
});

describe("profiles and bays (criterion 5)", () => {
  it("gives every street its profile's cross-section, and an avenue on every axis with three lines", () => {
    const left = ["pavement", "parking", "lane", "lane", "pavement"];
    const right = ["pavement", "lane", "lane", "parking", "pavement"];
    const avenue = ["pavement", "parking", "lane", "lane", "parking", "pavement"];
    forAll((v, _l, ok) => {
      const c = v.c;
      for (const s of c.streets) {
        const b = [...s.bands];
        ok(s.profile === "avenue" ? JSON.stringify(b) === JSON.stringify(avenue) : JSON.stringify(b) === JSON.stringify(left) || JSON.stringify(b) === JSON.stringify(right), `${s.id} bands`);
        const lines = (s.axis === "x" ? c.blocksZ : c.blocksX) + 1;
        if (s.line === 0 || s.line === lines - 1) ok(s.profile === "street", `${s.id} edge street`);
      }
      for (const axis of ["x", "z"] as const) {
        const own = c.streets.filter((s) => s.axis === axis);
        ok(own.every((s, k) => s.line === k), "lines in order");
        if (own.length >= 3) ok(own.some((s) => s.profile === "avenue"), `avenue on axis ${axis}`);
      }
    });
  });

  it("keeps bays out of the cells next to a junction box and counts them per tile", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      const tiles = v.c.cells.filter((cell) => cell.cells === 2);
      ok(v.c.bays.length === tiles.length * BAYS_PER_PARKING_TILE, "bays per tile");
      for (const t of tiles) {
        const s = v.byId.get(t.street!)!;
        const x = s.axis === "x";
        for (const [i, j] of unitCells(v, t)) {
          ok((x ? v.xAt[j] : v.zAt[i])?.id === s.id && streetBandAt(s, x ? j : i) === "parking", `tile (${t.i},${t.j}) is two parking cells of ${s.id}`);
          ok(!(x ? v.zAt[i] : v.xAt[j]), `tile (${t.i},${t.j}) is in one street only`);
        }
        // The BAY_JUNCTION_CLEAR cells before and after the tile along the street are not part of a junction box (crossing, junction or corner).
        for (let d = 1; d <= BAY_JUNCTION_CLEAR; d++) {
          for (const [i, j] of x ? ([[t.i - d, t.j], [t.i + 1 + d, t.j]] as const) : ([[t.i, t.j - d], [t.i, t.j + 1 + d]] as const)) {
            const q = r[j * W + i];
            ok(q !== "crossing" && q !== "junction" && q !== "pavementCorner", `tile (${t.i},${t.j}) near a box at (${i},${j})`);
          }
        }
      }
      for (const b of v.c.bays) {
        ok(r[Math.floor(b.z_m / TILE_M) * W + Math.floor(b.x_m / TILE_M)] === "parking", `bay at (${b.x_m},${b.z_m})`);
        ok(b.w_m * BAYS_PER_PARKING_TILE === 2 * TILE_M && /^(outer|block:\d+:\d+)$/.test(b.block), "bay size and block");
      }
    });
  });

  it("leaves BAY_JUNCTION_CLEAR plain cells at both ends of every parking run and at most one odd cell", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      for (const s of v.c.streets) {
        const n = s.bands.length;
        const intervals = v.c.blocks.filter((b) => (s.axis === "x" ? b.bj === 0 : b.bi === 0));
        for (let k = 0; k < n; k++) {
          if (s.bands[k] !== "parking") continue;
          const across = s.axis === "x" ? s.across0 + k : s.across0 + n - 1 - k;
          for (const b of intervals) {
            const [a0, a1] = s.axis === "x" ? [b.i0, b.i1] : [b.j0, b.j1];
            const roleAt = (a: number): TileRole | null => (s.axis === "x" ? r[across * W + a] : r[a * W + across]) ?? null;
            for (let d = 0; d < BAY_JUNCTION_CLEAR; d++) ok(roleAt(a0 + d) === "parkingPlain" && roleAt(a1 - 1 - d) === "parkingPlain", `${s.id} run ends`);
            let plain = 0;
            for (let a = a0 + BAY_JUNCTION_CLEAR; a < a1 - BAY_JUNCTION_CLEAR; a++) if (roleAt(a) === "parkingPlain") plain++;
            ok(plain <= 1, `${s.id} left ${plain} plain cells in a run`);
          }
        }
      }
    });
  });
});

describe("pole slots (criterion 6)", () => {
  it("stands slots POLE_SLOT_PITCH_M apart and POLE_SLOT_FROM_KERB_M from the kerb face, never on a corner, a crossing or a kerb cut", () => {
    forAll((v, _l, ok) => {
      const { W, role: r } = v;
      ok(v.c.poleSlots.length > 0, "some slots");
      const groups = new Map<string, number[]>();
      for (const p of v.c.poleSlots) {
        const s = v.byId.get(p.street)!;
        const across = s.axis === "x" ? p.z_m : p.x_m;
        const along = s.axis === "x" ? p.x_m : p.z_m;
        const dLo = s.carriage.lo_m - across;
        const dHi = across - s.carriage.hi_m;
        ok(Math.abs(Math.abs(dLo > 0 ? dLo : dHi) - POLE_SLOT_FROM_KERB_M) < 1e-9 && (dLo > 0 || dHi > 0), "kerb distance");
        const coordSign = dHi > 0 ? 1 : -1;
        ok(p.side === (s.axis === "x" ? coordSign : -coordSign), "side");
        const role = s.axis === "x" ? r[Math.floor(across / TILE_M) * W + Math.floor(along / TILE_M)] : r[Math.floor(along / TILE_M) * W + Math.floor(across / TILE_M)];
        ok(role === "pavement", `slot at (${p.x_m},${p.z_m}) on ${role}`);
        const key = `${p.street}|${p.side}`;
        groups.set(key, [...(groups.get(key) ?? []), along]);
      }
      for (const [key, list] of groups) {
        const s = v.byId.get(key.split("|")[0]!)!;
        const ivs = v.c.blocks.filter((b) => (s.axis === "x" ? b.bj === 0 : b.bi === 0)).map((b) => (s.axis === "x" ? [b.i0 * TILE_M, b.i1 * TILE_M] : [b.j0 * TILE_M, b.j1 * TILE_M]));
        for (const [a0, a1] of ivs as [number, number][]) {
          const inside = list.filter((q) => q > a0 && q < a1).sort((p, q) => p - q);
          ok(inside.length > 0 && Math.abs(inside[0]! - a0 - POLE_SLOT_END_CLEAR_M) < 1e-9, `${key} first slot`);
          for (let k = 1; k < inside.length; k++) ok(Math.abs(inside[k]! - inside[k - 1]! - POLE_SLOT_PITCH_M) < 1e-9, `${key} pitch`);
          ok(a1 - inside[inside.length - 1]! >= POLE_SLOT_END_CLEAR_M - 1e-9, `${key} last slot`);
        }
      }
    });
  });

  it("gives every pavement side of every block at least one slot", () => {
    forAll((v, _l, ok) => {
      const p = v.c.poleSlots;
      for (const b of v.c.blocks) {
        const inX = (x: number): boolean => x > b.i0 * TILE_M && x < b.i1 * TILE_M;
        const inZ = (z: number): boolean => z > b.j0 * TILE_M && z < b.j1 * TILE_M;
        ok(p.some((q) => q.street === `x:${b.bj}` && q.side === 1 && inX(q.x_m)), `${b.id} top`);
        ok(p.some((q) => q.street === `x:${b.bj + 1}` && q.side === -1 && inX(q.x_m)), `${b.id} bottom`);
        ok(p.some((q) => q.street === `z:${b.bi}` && q.side === -1 && inZ(q.z_m)), `${b.id} left`);
        ok(p.some((q) => q.street === `z:${b.bi + 1}` && q.side === 1 && inZ(q.z_m)), `${b.id} right`);
      }
    });
  });
});

describe("the Town (criterion 7)", () => {
  const deepFrozen = (o: unknown): boolean => {
    if (typeof o !== "object" || o === null) return true;
    return Object.isFrozen(o) && Object.values(o).every(deepFrozen);
  };

  it("has roads, kerbs, pavements, pads and blocks in map units and no lot, place or terrace", () => {
    forAll((v, _l, ok) => {
      const { c, W, H } = v;
      const t = c.town;
      ok(t.roads.length === c.blocksX + 1 + c.blocksZ + 1, "roads");
      ok(t.pads.length === (c.blocksX + 1) * (c.blocksZ + 1), "pads");
      ok(t.blocks.length === c.blocksX * c.blocksZ, "blocks");
      ok(t.pavements.length > 0 && t.lots.length === 0 && t.places.length === 0 && t.terraces.length === 0 && t.openLots.length === 0, "empty parts");
      for (const w of [t.ring, t.window]) ok(w.minX === 0 && w.minY === 0 && Math.abs(w.maxX - W * TILE_M * U) < 1e-9 && Math.abs(w.maxY - H * TILE_M * U) < 1e-9, "bounds");
      for (const road of t.roads) {
        const s = v.byId.get(road.id)!;
        ok(Math.abs(road.w - (s.carriage.hi_m - s.carriage.lo_m) * U) < 1e-9 && road.side === 0 && road.line === null, `road ${road.id}`);
      }
      // Pads are the junction boxes: each as big as its junction cells.
      for (const pad of t.pads) {
        const xs = pad.pts.map((p) => p.x);
        const zs = pad.pts.map((p) => p.z);
        const cells = v.c.cells.filter((cell) => cell.role === "junction" && pad.id === `pad:${v.xAt[cell.j]!.id}:${v.zAt[cell.i]!.id}`).length;
        ok(Math.abs((Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs)) - cells * (TILE_M * U) ** 2) < 1e-6, `${pad.id} area`);
      }
    });
  });

  it("puts each block's edge on its pavements' back edges", () => {
    forAll((v, _l, ok) => {
      const bbox = (pts: readonly { x: number; z: number }[]): { x0: number; x1: number; z0: number; z1: number } => ({
        x0: Math.min(...pts.map((p) => p.x)),
        x1: Math.max(...pts.map((p) => p.x)),
        z0: Math.min(...pts.map((p) => p.z)),
        z1: Math.max(...pts.map((p) => p.z)),
      });
      const boxes = v.c.town.pavements.map((p) => bbox(p.pts));
      const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
      for (const b of v.c.town.blocks) {
        ok(boxes.some((p) => near(p.z1, b.minZ) && p.x0 <= b.minX + 1e-6 && p.x1 >= b.maxX - 1e-6), `${b.id} top`);
        ok(boxes.some((p) => near(p.z0, b.maxZ) && p.x0 <= b.minX + 1e-6 && p.x1 >= b.maxX - 1e-6), `${b.id} bottom`);
        ok(boxes.some((p) => near(p.x1, b.minX) && p.z0 <= b.minZ + 1e-6 && p.z1 >= b.maxZ - 1e-6), `${b.id} left`);
        ok(boxes.some((p) => near(p.x0, b.maxX) && p.z0 <= b.minZ + 1e-6 && p.z1 >= b.maxZ - 1e-6), `${b.id} right`);
      }
      // The pavements cover every pavement and corner cell once.
      const area = boxes.reduce((s, q) => s + (q.x1 - q.x0) * (q.z1 - q.z0), 0);
      const cellsArea = v.c.cells.filter((cell) => cell.role === "pavement" || cell.role === "pavementCorner").length * (TILE_M * U) ** 2;
      ok(Math.abs(area - cellsArea) < 1e-6, "pavement area");
    });
  });

  it("is deterministic per size and seed, differs between seeds, and is frozen", () => {
    const a = tileCity({ blocksX: 4, blocksZ: 3, seed: 7 });
    const b = tileCity({ blocksX: 4, blocksZ: 3, seed: 7 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(tileCity({ blocksX: 4, blocksZ: 3, seed: 8 }))).not.toBe(JSON.stringify(a));
    expect(deepFrozen(a.town)).toBe(true);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.cells)).toBe(true);
    expect(() => {
      (a.town.roads as unknown as { id: string }[])[0]!.id = "x";
    }).toThrow();
  });

  it("defaults to 3 x 3 blocks and seed 1, clamps the size and truncates the seed", () => {
    expect(JSON.stringify(tileCity())).toBe(JSON.stringify(tileCity({ blocksX: 3, blocksZ: 3, seed: 1 })));
    const big = tileCity({ blocksX: 99, blocksZ: 0 });
    expect([big.blocksX, big.blocksZ]).toEqual([CITY_BLOCKS_MAX, 1]);
    expect(tileCity({ blocksX: 2.9, blocksZ: Number.NaN, seed: 4.7 })).toMatchObject({ blocksX: 2, blocksZ: 3, seed: 4 });
  });
});

describe("block sizes, variety and levels", () => {
  it("makes every block 8 to 12 cells a side, and avenues, patches and grates land near their ratios", () => {
    let avenues = 0;
    let streets = 0;
    let patches = 0;
    let lanes = 0;
    let grates = 0;
    let pave = 0;
    forAll((v, _l, ok) => {
      for (const b of v.c.blocks) {
        const w = b.i1 - b.i0;
        const d = b.j1 - b.j0;
        ok(w >= BLOCK_TILES.min && w <= BLOCK_TILES.max && d >= BLOCK_TILES.min && d <= BLOCK_TILES.max, `${b.id} is ${w} by ${d}`);
      }
      for (const s of v.c.streets) {
        streets++;
        if (s.profile === "avenue") avenues++;
      }
      let left = 0;
      let nLanes = 0;
      for (const cell of v.c.cells) {
        if (cell.role === "lane") {
          lanes++;
          nLanes++;
          if (cell.variant & 2) patches++;
          if ((cell.variant & 1) === 0) left++;
          ok(cell.variant >= 0 && cell.variant <= 3, "lane variant");
        }
        if (cell.role === "pavement") {
          pave++;
          if (cell.variant === 2) grates++;
          ok(cell.variant >= 0 && cell.variant <= 2, "pavement variant");
        }
      }
      ok(left * 2 === nLanes, "one lane of each side in every pair");
    });
    expect(avenues / streets).toBeGreaterThan(0.1);
    expect(avenues / streets).toBeLessThan(1 / AVENUE_ONE_IN + 0.25);
    expect(patches / lanes).toBeGreaterThan(0.5 / PATCH_ONE_IN);
    expect(patches / lanes).toBeLessThan(2 / PATCH_ONE_IN);
    expect(grates / pave).toBeGreaterThan(0.5 / GRATE_ONE_IN);
    expect(grates / pave).toBeLessThan(2 / GRATE_ONE_IN);
  });

  it("records the tile and sidewalk size the later sections rely on", () => {
    expect(SIDEWALK_TOP_M).toBeCloseTo(0.3, 9);
    expect(TILE_M).toBe(5);
  });
});

describe("pure (criterion 8)", () => {
  it("imports nothing from three, the DOM, src/grid or src/night", () => {
    const src = readFileSync(join("src", "render3d", "tilecity.ts"), "utf8");
    const specs = [...src.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/gms)].map((m) => m[1]!);
    expect(specs.length).toBeGreaterThan(0);
    for (const s of specs) {
      expect(s).not.toMatch(/three/);
      expect(s).not.toMatch(/(^|\/)grid(\/|$)/);
      expect(s).not.toMatch(/(^|\/)night(\/|$)/);
      expect(["./town", "../render/city"]).toContain(s);
    }
    expect(src).not.toMatch(/\b(document|HTMLElement|HTMLCanvasElement|navigator|requestAnimationFrame|localStorage)\b/);
    expect(src).not.toMatch(/\bimport\s*\(/);
  });
});
