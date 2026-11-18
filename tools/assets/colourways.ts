/**
 * Colourway atlases (ticket 054 A): alternate colourings of a pack's shared atlas that the converter copies, with no Blender,
 * next to the GLB so a renderer can swap a material's base-colour map for one of them.
 *
 * Pure: no file access. This file holds only file names (nothing from any pack's content), so it is safe to commit.
 * Which files are colourways of which base is a table here, so nobody has to edit the gitignored input folder.
 */

import type { AssetColourway } from "../../src/core";

/** One pack's colourways: the base atlas and its alternates, paths relative to the pack's input folder (forward slashes). */
export interface ColourwaySource {
  /** The atlas the GLB embeds, e.g. "Textures/PolygonCity_Texture.png". Its pixel size is the one every colourway must match. */
  base: string;
  /** The alternates. Each file stem is the base's stem, an underscore and the colourway id. */
  files: readonly string[];
}

const CITY_TONES = ["A", "B", "C"] as const;
const CITY_SERIES = ["01", "02", "03", "04"] as const;

/** The City Pack: 4 hues (01 to 04) x 3 tones (A, B, C) = 12 recolours of `PolygonCity_Texture.png`. */
const CITY_PACK_FILES: readonly string[] = CITY_SERIES.flatMap((s) => CITY_TONES.map((t) => `Textures/PolygonCity_Texture_${s}_${t}.png`));

export const COLOURWAY_SOURCES: Readonly<Record<string, ColourwaySource>> = {
  "city-pack": { base: "Textures/PolygonCity_Texture.png", files: CITY_PACK_FILES },
};

/** One planned copy. */
export interface ColourwayPlan {
  /** Short id: the file stem after the base stem and an underscore ("02_A"). */
  id: string;
  /** The source, relative to the pack's input folder, forward slashes. */
  file: string;
  /** The copy, relative to the manifest folder, forward slashes ("city-pack/colourways/PolygonCity_Texture_02_A.png"). */
  out: string;
}

export interface ColourwayPlans {
  /** The base atlas's file stem, as the GLB names that image ("PolygonCity_Texture"). */
  base: string;
  /** The base atlas file, relative to the pack's input folder. */
  baseFile: string;
  /** In the order the table lists them. */
  entries: readonly ColourwayPlan[];
}

/** The last path segment of a forward-slash path. */
function fileName(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? path : path.slice(i + 1);
}

/** The file name without its extension (up to the last dot). */
function stem(path: string): string {
  const name = fileName(path);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? name : name.slice(0, dot);
}

/** The plan for a pack, or null when the table has no entry for it. Throws when a file name doesn't extend the base's stem or ids repeat (a mistake in the table). */
export function planColourways(pack: string, table: Readonly<Record<string, ColourwaySource>> = COLOURWAY_SOURCES): ColourwayPlans | null {
  const source = Object.hasOwn(table, pack) ? table[pack] : undefined;
  if (source === undefined) return null;
  const base = stem(source.base);
  const prefix = `${base}_`;
  const seen = new Set<string>();
  const entries = source.files.map((file): ColourwayPlan => {
    const s = stem(file);
    if (!s.startsWith(prefix) || s.length === prefix.length) throw new Error(`colourway table "${pack}": ${file} is not named ${prefix}<id>`);
    const id = s.slice(prefix.length);
    if (seen.has(id)) throw new Error(`colourway table "${pack}": id "${id}" appears twice`);
    seen.add(id);
    return { id, file, out: `${pack}/colourways/${fileName(file)}` };
  });
  return { base, baseFile: source.base, entries };
}

/** A PNG's pixel size, read from its signature and IHDR chunk; null when the bytes are not a PNG header. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (bytes[i] !== signature[i]) return null;
  const u32 = (at: number) => (((bytes[at] as number) << 24) | ((bytes[at + 1] as number) << 16) | ((bytes[at + 2] as number) << 8) | (bytes[at + 3] as number)) >>> 0;
  if (u32(8) !== 13 || u32(12) !== 0x49484452) return null; // IHDR, 13 bytes
  const width = u32(16);
  const height = u32(20);
  return width > 0 && height > 0 ? { width, height } : null;
}

/** The manifest entry for a copied file. */
export function colourwayEntry(plan: ColourwayPlan, base: string, size: { width: number; height: number }): AssetColourway {
  return { id: plan.id, image: plan.out, base, width: size.width, height: size.height };
}
