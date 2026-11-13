/**
 * The asset manifest: what the FBX-to-GLB pipeline (ticket 038, tools/assets/)
 * writes next to the GLB files it makes, and what a later renderer ticket reads
 * to put converted models on the 3D map. Plain data, no logic.
 *
 * Coordinates are glTF's: metres, Y up. Every asset's pivot is its base centre,
 * so `bounds.min[1]` is 0 and the x/z centre of its bounds is 0 (within 1e-4).
 *
 * The manifest and the GLB files live in the gitignored `assets/private/`
 * folder and are never committed (the Synty licence forbids sharing source
 * files, and the repo is public).
 */

/** Bumped when the manifest's shape changes; readers refuse other versions. */
export const ASSET_MANIFEST_VERSION = 1 as const;

/** A 3-vector in glTF space (metres, Y up). */
export type Vec3 = readonly [number, number, number];

/** Axis-aligned bounds of an asset after the pivot fix. */
export interface AssetBounds {
  min: Vec3;
  max: Vec3;
}

/**
 * Something the converter noticed and could not fix by itself.
 * - `scale-suspect`: the asset's largest dimension is outside
 *   [ASSET_SANE_SIZE_MIN, ASSET_SANE_SIZE_MAX] metres (a 100x or 0.01x unit slip).
 * - `no-uv`: a mesh has no UV map, so the pack atlas can't map onto it.
 * - `no-atlas`: the pack has no atlas set, so the asset kept its imported materials.
 */
export type AssetWarning = "scale-suspect" | "no-uv" | "no-atlas";

/** Below or above these sizes (metres, largest dimension) an asset gets `scale-suspect`. */
export const ASSET_SANE_SIZE_MIN = 0.05;
export const ASSET_SANE_SIZE_MAX = 60;

/** One converted model: one FBX file in, one named root node in the pack's GLB out. */
export interface AssetEntry {
  /** The root node's name in the GLB; the FBX file's stem (e.g. "SM_Prop_Powerpole_01"). Unique in its pack. */
  name: string;
  /** The FBX file, relative to the pack's input folder, forward slashes. */
  source: string;
  bounds: AssetBounds;
  triangles: number;
  warnings: readonly AssetWarning[];
}

/** An FBX the converter could not import or export. It is left out of the GLB. */
export interface AssetFailure {
  source: string;
  error: string;
}

/** One pack: every converted asset in one GLB, sharing the pack's atlas material. */
export interface AssetPack {
  /** The pack's folder name under the input root (e.g. "polygon-town"). */
  pack: string;
  /** The GLB file, relative to the manifest, forward slashes. */
  glb: string;
  /** The atlas image used for the shared material, relative to the pack's input folder; null if none was set. */
  atlas: string | null;
  /** In the order the FBX files sort by path. */
  assets: readonly AssetEntry[];
  failures: readonly AssetFailure[];
}

export interface AssetManifest {
  version: typeof ASSET_MANIFEST_VERSION;
  /** ISO 8601, when the conversion ran. */
  generatedAt: string;
  /** `bpy.app.version_string` of the Blender that ran it. */
  blenderVersion: string;
  /** In pack name order. */
  packs: readonly AssetPack[];
}
