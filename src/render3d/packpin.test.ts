/**
 * Ticket 057 D (carried from the 057 A review): a committed pin of `packTown` on the three protocol maps, so the ladder's "unchanged" is checked on every run and not only at review. Each digest is the first 20 hex
 * digits of the SHA-256 of the packing's JSON (every run's every packed block, to the last piece: style, lot, stack, pieces and their places, numbers rounded to 1e-9) taken on `goal/city-style` at d14f640, the merge
 * of 057 G, with a ladder map's default options (back alignment, no far overlap). A ticket that moves the ladder's packing on purpose re-pins here and says so. The stacks are typed in from the converted City
 * Pack manifest (18 Nov 2026); nothing here reads assets/private/ and nothing needs a canvas.
 */

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Group } from "three";
import { ASSET_MANIFEST_VERSION, loadPuzzle, type AssetEntry, type AssetManifest } from "../core";
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
  "01-first-light": "1d0c5c1a8a8a04fe5e57",
  "09-shrine-circuit": "0f8f7e421211dfd60489",
  "64-the-whole-chain": "39f7f94b013199344f02",
};

const round = (_k: string, v: unknown): unknown => (typeof v === "number" ? Math.round(v * 1e9) / 1e9 : v);
const digest = (packed: ReadonlyMap<string, PackResult>): string => createHash("sha256").update(JSON.stringify([...packed].sort((a, b) => (a[0] < b[0] ? -1 : 1)), round)).digest("hex").slice(0, 20);
const mapOf = (file: string) => loadPuzzle(JSON.parse(readFileSync(join("puzzles", `${file}.json`), "utf8")));

function packOf(file: string, opts?: { align?: "back" | "wall" }): Map<string, PackResult> {
  const bundle = buildScene(mapOf(file), { text: stubTextSurface });
  const stacks = stackInput(SET)!;
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
