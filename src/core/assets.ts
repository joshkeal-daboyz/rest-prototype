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
 * - `no-uv`: a mesh has no UV map but is meant to carry a texture (the pack
 *   atlas, or an image its own material uses), so the texture can't map onto it.
 * - `missing-texture`: one of the asset's materials references an image (or has
 *   none and no match was found for it) that the converter could not find in
 *   the pack; that material exports untextured. `AssetEntry.missingTextures`
 *   names what was looked for.
 * - `texture-guessed`: a material had no usable image reference and no
 *   matching name, so the converter picked the texture whose name starts with
 *   the model's own name (e.g. town_hall_mesh -> Town_Hall_a.png). Check it,
 *   or pin it with `pack.json` "textureOverrides".
 *
 * (Ticket 038 amendment: `no-atlas` was dropped. Per-model textures are the
 * default, so a pack without an atlas is normal, not a warning.)
 */
export type AssetWarning = "scale-suspect" | "no-uv" | "missing-texture" | "texture-guessed";

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
  /**
   * The import factor this asset was converted with: the pack's `pack.json` "scale" (default 1) times its
   * "scaleOverrides" entry, if any (ticket 040). `bounds` already include it. Absent in manifests written
   * before ticket 040; readers treat absent as unknown and rely on `bounds` alone.
   */
  scale?: number;
  triangles: number;
  /**
   * The image files embedded for this asset's materials, relative to the pack's
   * input folder, forward slashes, sorted, no duplicates. In atlas mode, just the
   * atlas. Empty if the asset is untextured.
   */
  textures: readonly string[];
  /**
   * What the converter looked for and could not find (the file name an FBX
   * material references, or `material:<name>` when it references none), sorted,
   * no duplicates. Non-empty exactly when `warnings` has `missing-texture`.
   */
  missingTextures: readonly string[];
  warnings: readonly AssetWarning[];
}

/** An FBX the converter could not import or export. It is left out of the GLB. */
export interface AssetFailure {
  source: string;
  error: string;
}

/**
 * One pack: every converted asset in one GLB. With an atlas set, every asset
 * shares the one atlas material; without one (the default), each asset keeps
 * its own materials, with their textures found in the pack and embedded.
 */
export interface AssetPack {
  /** The pack's folder name under the input root (e.g. "polygon-town"). */
  pack: string;
  /** The GLB file, relative to the manifest, forward slashes. */
  glb: string;
  /** The atlas image used for the shared material, relative to the pack's input folder; null in per-model texture mode (the default). */
  atlas: string | null;
  /** The pack's `pack.json` "scale" (default 1), before any per-model override (ticket 040). Absent in manifests written before ticket 040. */
  scale?: number;
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
