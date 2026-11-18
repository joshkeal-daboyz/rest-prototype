/**
 * The front calibration file (ticket 045): which way each building model's door faces, as Josh chose it by
 * clicking in the 3D gallery. Plain data, no logic; the validator (`validateCalibration`) is added beside
 * these types at the start of ticket 045, before its sections build.
 *
 * The file lives at CALIBRATION_FILE, under the gitignored `assets/private/`, on Josh's PC only. It is
 * written by the dev server alone (CALIBRATION_ENDPOINT, a Vite plugin that exists only under `npm run dev`)
 * and read by the 3D view only in a dev build. It never reaches `dist/`. Model names are not licensed
 * content (city style guide, chapter 14), but the file stays private with the packs it describes.
 */

/** Bumped when the file's shape changes; readers refuse other versions. */
export const CALIBRATION_VERSION = 1 as const;

/** Where the dev server keeps the file, relative to the repo root, forward slashes. */
export const CALIBRATION_FILE = "assets/private/calibration/fronts.json";

/** The dev server's endpoint: GET returns the file (or an empty one), POST applies one CalibrationPatch. */
export const CALIBRATION_ENDPOINT = "/__calibration/fronts";

/** The axis, in a GLB's own frame, that a model's door faces. The same four values as render3d's ModelFront. */
export type CalibrationFront = "+z" | "-z" | "+x" | "-x";

/**
 * A model's key: its pack id, a colon, its root node name in that pack's GLB, e.g. "city-pack:SM_Bld_Shop_01".
 * Names repeat across packs (SM_Bld_Shop_01..03, SM_Bld_Apartment_01, SM_Bld_Church_01), so a bare name is never a key.
 * The pack id is the manifest's `pack` (lower case, digits, hyphens); the name is the manifest entry's `name`.
 */
export type CalibrationKey = `${string}:${string}`;

/**
 * What Josh said about one model. At least one of `front`, `notBuilding` or `exclude` is set; an entry with
 * none is not written (clearing a model removes its entry, so the code's table applies again).
 * - `front`: the side of the model he clicked as its door.
 * - `notBuilding`: a part, prop or scenery piece the gallery's size rule let in. Never has `front` or `exclude`.
 *   It is never placed in the town and the gallery puts it at the end of the line.
 * - `exclude`: a building he never wants placed (a BUILDING_EXCLUDE entry). May have `front`.
 */
export interface CalibrationEntry {
  front?: CalibrationFront;
  notBuilding?: true;
  exclude?: true;
  /** ISO 8601, when this entry last changed. */
  at: string;
}

export interface CalibrationFile {
  version: typeof CALIBRATION_VERSION;
  /** ISO 8601, when the file was last written. */
  savedAt: string;
  /** Keyed by CalibrationKey. Written with keys in sorted order, so a diff of two saves reads well. */
  entries: Readonly<Record<CalibrationKey, CalibrationEntry>>;
}

/** One change, as the gallery POSTs it: the new entry for `key`, or null to clear it. The server stamps `at`. */
export interface CalibrationPatch {
  key: CalibrationKey;
  entry: Omit<CalibrationEntry, "at"> | null;
}

/** The validator's result, in the shape of `validatePuzzle`'s. */
export type CalibrationResult = { ok: true; file: CalibrationFile } | { ok: false; errors: readonly string[] };
