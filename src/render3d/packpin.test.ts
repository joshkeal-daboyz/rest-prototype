/**
 * Ticket 057 D (carried from the 057 A review): a committed pin of `packTown` on the three protocol maps, so the ladder's "unchanged" is checked on every run and not only at review. Each digest is the first 20 hex
 * digits of the SHA-256 of the packing's JSON (every run's every packed block, to the last piece: style, lot, stack, pieces and their places, numbers rounded to 1e-9) taken on `goal/city-style` at d14f640, the merge
 * of 057 G, with a ladder map's default options (back alignment, no far overlap). A ticket that moves the ladder's packing on purpose re-pins here and says so. The stacks are typed in from the converted City
 * Pack manifest (18 Nov 2026); nothing here reads assets/private/ and nothing needs a canvas.
 *
 * Re-pinned by ticket 063 E1 (Josh, 19 Nov 2026: "corner store is not angled on the corner"; the ticket's Q-E, fix the ladder's corner stacks too): the eight corner pieces' open side is the measured "-x", not the
 * "+x" guess, so the corner pieces of every corner block turn the other way at each end of a row. `PINS_BEFORE_063E` are the digests taken at f4a728f; the test below packs again with the old open side and finds them,
 * and lists every field the measured side moved. `townpin.test.ts` is not touched.
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Group } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest } from "../core";
import { OPEN_SIDE_MEASURED } from "./facade";
import { NO_MODELS, allStackKeys, loadModels, stackInput, type ModelSet } from "./models3d";
import { buildScene } from "./scene";
import { STACK_STYLES } from "./stacks";
import { packTown, type PackResult } from "./terrace";
import { stubTextSurface } from "./text";

/** [name, width, height, depth] in metres, centred bounds, copied from the converted City Pack manifest. */
const SIZES: [string, number, number, number][] = [
  ["SM_Bld_Apartment_01", 5.0, 3.0, 5.196],
  ["SM_Bld_Apartment_02", 5.17, 3.0, 5.214],
  ["SM_Bld_Apartment_03", 5.281, 3.0, 5.497],
  ["SM_Bld_Apartment_Corner_01", 5.196, 3.0, 5.196],
  ["SM_Bld_Apartment_Corner_02", 5.214, 3.0, 5.214],
  ["SM_Bld_Apartment_Corner_03", 5.491, 3.0, 5.497],
  ["SM_Bld_Apartment_Door_01", 5.096, 3.0, 5.577],
  ["SM_Bld_Apartment_Door_02", 5.114, 3.0, 5.115],
  ["SM_Bld_Apartment_Roof_01", 5.31, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_02", 5.252, 0.744, 5.488],
  ["SM_Bld_Apartment_Roof_03", 5.31, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_01", 5.904, 0.5, 5.918],
  ["SM_Bld_Apartment_Roof_Corner_02", 5.611, 0.744, 5.624],
  ["SM_Bld_Apartment_Roof_Corner_03", 5.462, 0.744, 5.488],
  ["SM_Bld_Apartment_Stack_01", 5.0, 9.0, 5.196],
  ["SM_Bld_Apartment_Stack_02", 5.17, 9.0, 5.214],
  ["SM_Bld_Apartment_Stack_03", 5.281, 9.0, 5.497],
  ["SM_Bld_Shop_01", 5.0, 3.054, 5.536],
  ["SM_Bld_Shop_02", 5.0, 3.3, 5.425],
  ["SM_Bld_Shop_03", 10.087, 3.084, 5.493],
  ["SM_Bld_Shop_04", 5.106, 3.17, 5.886],
  ["SM_Bld_Shop_05", 5.108, 3.0, 5.224],
  ["SM_Bld_Shop_06", 5.175, 3.0, 5.877],
  ["SM_Bld_Shop_Corner_01", 5.377, 3.0, 5.471],
  ["SM_Bld_Shop_Corner_02", 5.332, 3.0, 5.332],
  ["SM_Bld_OfficeOld_Small_Base_01", 10.936, 6.0, 10.936],
  ["SM_Bld_OfficeOld_Small_Floor_01", 10.0, 3.193, 10.0],
  ["SM_Bld_OfficeOld_Small_Roof_01", 11.12, 4.215, 11.2],
  ["SM_Bld_OfficeOld_Large_Base_01", 15.936, 6.0, 15.936],
  ["SM_Bld_OfficeOld_Large_Floor_01", 15.0, 3.193, 15.0],
  ["SM_Bld_OfficeOld_Large_Roof_01", 16.087, 4.227, 16.123],
  ["SM_Bld_OfficeOctagon_Base_01", 20.781, 3.896, 20.781],
  ["SM_Bld_OfficeOctagon_Floor_01", 20.465, 3.0, 20.465],
  ["SM_Bld_OfficeOctagon_Roof_01", 20.465, 5.382, 20.465],
];
const entryOf = ([name, w, h, d]: [string, number, number, number], i: number): AssetEntry => ({
  name,
  source: `${name}.fbx`,
  bounds: { min: [-w / 2, 0, -d / 2], max: [w / 2, h, d / 2] },
  triangles: 100 + i,
  textures: [],
  missingTextures: [],
  warnings: [],
});
const ALL = SIZES.map(entryOf);
const MANIFEST: AssetManifest = { version: ASSET_MANIFEST_VERSION, generatedAt: "2026-01-01T00:00:00Z", blenderVersion: "5.0.0", packs: [{ pack: "city-pack", glb: "city-pack.glb", atlas: null, assets: ALL, failures: [] }] };
const SET: ModelSet = await loadModels({
  fetchJson: async (): Promise<unknown> => MANIFEST,
  loadGlb: async () => {
    const g = new Group();
    for (const e of ALL) {
      const n = new Group();
      n.name = e.name;
      g.add(n);
    }
    return g;
  },
  stackKeys: allStackKeys(),
  info: () => {},
});

/** The three protocol maps, and the digest of `packTown`'s result on each (see the header). */
const PINS: Readonly<Record<string, string>> = {
  "01-first-light": "d79f7a1ec0b87e4166b3",
  "09-shrine-circuit": "d7e40ab1771bf2c6f928",
  "64-the-whole-chain": "b6eeb7619d814b847081",
};
/** The digests before 063 E1 (f4a728f, open side "+x"). */
const PINS_BEFORE_063E: Readonly<Record<string, string>> = {
  "01-first-light": "1d0c5c1a8a8a04fe5e57",
  "09-shrine-circuit": "0f8f7e421211dfd60489",
  "64-the-whole-chain": "39f7f94b013199344f02",
};

const round = (_k: string, v: unknown): unknown => (typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v);
const digest = (packed: ReadonlyMap<string, PackResult>): string => createHash("sha256").update(JSON.stringify([...packed].sort((a, b) => (a[0] < b[0] ? -1 : 1)), round)).digest("hex").slice(0, 20);
const mapOf = (file: string) => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));

function packOf(file: string, opts?: { align?: "back" | "wall" }, oldOpen = false): Map<string, PackResult> {
  const bundle = buildScene(mapOf(file), { text: stubTextSurface });
  const input = stackInput(SET)!;
  // The old guess: every corner piece's open side "+x" in the fronts table (which wins over the recipe's).
  const stacks = oldOpen ? { ...input, fronts: { ...input.fronts, ...Object.fromEntries(Object.keys(OPEN_SIDE_MEASURED).map((key) => [key, { ...input.fronts[key as keyof typeof input.fronts]!, open: "+x" as const }])) } } : input;
  const runs = bundle.slots.blocks.terraces ?? [];
  const out = packTown({ terraces: runs, lots: bundle.slots.blocks.list }, STACK_STYLES, stacks.entries, stacks.fronts, ...(opts ? [opts] : []));
  bundle.dispose();
  return out;
}

describe("packTown on the three protocol maps does not move (057 D, from the 057 A review)", () => {
  it("has a stack set to pack with, and the three maps pinned", () => {
    expect(stackInput(SET)).not.toBeNull();
    expect(stackInput(NO_MODELS)).toBeNull();
    expect(Object.keys(PINS)).toEqual(["01-first-light", "09-shrine-circuit", "64-the-whole-chain"]);
  });

  for (const file of Object.keys(PINS)) {
    it(`packs ${file} exactly as on the base commit: every run, block, stack and piece`, () => {
      const packed = packOf(file);
      expect(packed.size, file).toBeGreaterThan(10);
      expect([...packed.values()].reduce((n, r) => n + r.blocks.length, 0), file).toBeGreaterThan(40);
      expect(digest(packed), file).toBe(PINS[file]);
    });

    it(`gives ${file} the same packing when back alignment is asked for by name: a ladder run has no pavement frame, so the default is "back"`, () => {
      expect(digest(packOf(file, { align: "back" })), file).toBe(PINS[file]);
    });
  }

  it("is a pin that can fail: the same maps packed on their wall plane are not the same packing", () => {
    expect(digest(packOf("01-first-light", { align: "wall" }))).not.toBe(PINS["01-first-light"]);
  });
});

// ---- ticket 063 E1: what the measured open side moved ----

/** The paths (array indices turned into []) at which two JSON trees differ, each with how many leaves differ there. */
function changedPaths(a: unknown, b: unknown, path = "", out = new Map<string, { n: number; max: number }>()): Map<string, { n: number; max: number }> {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) a.forEach((v, i) => changedPaths(v, b[i], `${path}[]`, out));
  else if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) changedPaths((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, out);
  } else if (JSON.stringify(a, round) !== JSON.stringify(b, round)) {
    const e = out.get(path) ?? { n: 0, max: 0 };
    e.n++;
    // A number's change in metres (a yaw's in radians); anything else (a name, a flag) counts as a change of 1.
    e.max = Math.max(e.max, typeof a === "number" && typeof b === "number" ? Math.abs(a - b) : 1);
    out.set(path, e);
  }
  return out;
}
const asTree = (packed: ReadonlyMap<string, PackResult>): unknown => JSON.parse(JSON.stringify([...packed].sort((p, q) => (p[0] < q[0] ? -1 : 1)), round));

/** A turned corner piece's width and depth differ a little (Apartment_Corner_03: 5.491 and 5.497), so the corner column, its block and the blocks laid flush from it move by millimetres. Measured 19 Nov 2026: a neighbouring piece at most 0.003 m along the row and 0.013 m in z (a back-aligned stack lines every back on its deepest piece), a block's width, offset, far gap and depth at most 0.013 m. */
const NEIGHBOUR_MOVE_MAX_M = 0.02;
const BLOCK_MOVE_MAX_M = 0.02;

describe("the measured open side moves only corner pieces on the ladder (063 E1, Q-E)", () => {
  for (const file of Object.keys(PINS)) {
    it(`${file}: packed with the old "+x" it is exactly the base commit's packing, and the measured side changes it`, () => {
      expect(digest(packOf(file, undefined, true)), file).toBe(PINS_BEFORE_063E[file]);
      expect(PINS[file]).not.toBe(PINS_BEFORE_063E[file]);
    });

    it(`${file}: only corner pieces' yaw, x, z, street, w and d moved, and the blocks round them by at most ${BLOCK_MOVE_MAX_M} m`, () => {
      const before = packOf(file, undefined, true);
      const after = packOf(file);
      // The same runs, blocks, stacks and pieces, in the same order: the packing's shape is unchanged.
      const flat = (packed: ReadonlyMap<string, PackResult>): { key: string; p: Record<string, unknown> }[] =>
        [...packed].sort((p, q) => (p[0] < q[0] ? -1 : 1)).flatMap(([, r]) => r.blocks.flatMap((b) => b.stack.pieces.map((p) => ({ key: p.key as string, p: JSON.parse(JSON.stringify(p, round)) as Record<string, unknown> }))));
      const a = flat(before);
      const b = flat(after);
      expect(b.map((x) => x.key), file).toEqual(a.map((x) => x.key));
      const corners = new Set<string>(Object.keys(OPEN_SIDE_MEASURED));
      let turned = 0;
      a.forEach((x, i) => {
        const y = b[i]!;
        if (corners.has(x.key)) {
          // A corner piece turns the other way at its end: its yaw differs, and so do its size after the turn, its street face and where it stands.
          expect(Math.abs((x.p["yaw"] as number) - (y.p["yaw"] as number)), x.key).toBeGreaterThan(1);
          turned++;
        } else {
          // Any other piece keeps its key, role, height, turn, size and street face; only its place along the row may move by what its corner neighbour's width did.
          for (const f of ["role", "y", "yaw", "w", "h", "d", "street", "column"]) expect(y.p[f], `${x.key} ${f}`).toEqual(x.p[f]);
          expect(Math.abs((x.p["x"] as number) - (y.p["x"] as number)), `${x.key} x`).toBeLessThanOrEqual(NEIGHBOUR_MOVE_MAX_M);
          expect(Math.abs((x.p["z"] as number) - (y.p["z"] as number)), `${x.key} z`).toBeLessThanOrEqual(NEIGHBOUR_MOVE_MAX_M);
        }
      });
      expect(turned, file).toBeGreaterThan(20);
      // Everything outside the pieces that changed is one of these, and by no more than the width of a turned corner piece differs from its depth.
      const allowed = ["lot.x", "lot.w", "lot.z", "stack.width_m", "stack.columns[].x", "stack.columns[].w", "stack.depth_m", "farGap_m"];
      for (const [path, e] of changedPaths(asTree(before), asTree(after))) {
        if (/\.stack\.pieces\[\]\.(x|z|yaw|street|w|d)$/.test(path)) continue;
        const rest = path.replace(/^\[\]\[\]\.blocks\[\]\./, "").replace(/^\[\]\[\]\./, "");
        expect(allowed, `${file}: ${path} changed`).toContain(rest);
        expect(e.max, `${file}: ${path}`).toBeLessThanOrEqual(BLOCK_MOVE_MAX_M);
      }
    });
  }
});

// ---- ticket 063 E1, criterion 25 on the three protocol maps (review round 1) ----

describe("every corner column of the three protocol maps turns the corner (063 E1, criterion 25)", () => {
  const rot = (yaw: number, [x, z]: readonly [number, number]): [number, number] => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
  const near = (a: readonly [number, number], b: readonly [number, number]): boolean => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
  const CORNER_02 = "city-pack:SM_Bld_Shop_Corner_02";

  /**
   * Every piece of a corner column, as the lot frame sees it: one of its two street faces (its front, +z in its own frame, and its measured open face from `OPEN_SIDE_MEASURED`, not from the table the packing was
   * made with) must point at the road (+z) and the other at the cross street (toward the column's corner side). `chamferBad` are the Shop_Corner_02 pieces whose chamfer, on the -x+z diagonal of the model, does not
   * point out of the block toward the junction (the cross street's side and the road's).
   */
  function turns(packed: ReadonlyMap<string, PackResult>): { corners: number; bad: string[]; chamfers: number; chamferBad: string[] } {
    const out = { corners: 0, bad: [] as string[], chamfers: 0, chamferBad: [] as string[] };
    for (const [run, res] of packed) {
      for (const b of res.blocks) {
        for (const p of b.stack.pieces) {
          const side = b.stack.columns[p.column]!.corner;
          const open = OPEN_SIDE_MEASURED[p.key]?.open;
          if (side === null || open === undefined) continue;
          out.corners++;
          const front = rot(p.yaw, [0, 1]);
          const face = rot(p.yaw, [open === "-x" ? -1 : 1, 0]);
          const road: [number, number] = [0, 1];
          const cross: [number, number] = [side === "-x" ? -1 : 1, 0];
          if (!((near(front, road) && near(face, cross)) || (near(face, road) && near(front, cross)))) out.bad.push(`${run} ${b.lot.key} ${p.key} at ${side}`);
          if (p.key === CORNER_02) {
            out.chamfers++;
            const n = rot(p.yaw, [-Math.SQRT1_2, Math.SQRT1_2]);
            if (Math.sign(n[0]) !== (side === "-x" ? -1 : 1) || n[1] < 0.5) out.chamferBad.push(`${run} ${b.lot.key} at ${side}`);
          }
        }
      }
    }
    return out;
  }

  let chamfersSeen = 0;
  for (const file of Object.keys(PINS)) {
    it(`${file}: every corner column has its front on the road or the cross street and its measured open face on the other, and the chamfer points at the junction`, () => {
      const t = turns(packOf(file));
      expect(t.corners, `${file}: corner pieces were checked`).toBeGreaterThan(20);
      expect(t.bad, file).toEqual([]);
      expect(t.chamferBad, file).toEqual([]);
      chamfersSeen += t.chamfers;
    });

    it(`${file}: the old "+x" packing fails it, on every corner piece`, () => {
      const t = turns(packOf(file, undefined, true));
      expect(t.bad.length, file).toBe(t.corners);
      expect(t.chamferBad.length, file).toBe(t.chamfers);
    });
  }

  it("found Shop_Corner_02 on the maps, so the chamfer check was not vacuous, and the old packing turns every chamfer the wrong way", () => {
    expect(chamfersSeen).toBeGreaterThan(0);
    const old = Object.keys(PINS).reduce((n, f) => n + turns(packOf(f, undefined, true)).chamferBad.length, 0);
    expect(old).toBe(chamfersSeen);
  });
});
