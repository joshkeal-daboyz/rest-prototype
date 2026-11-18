/**
 * The front calibration file (ticket 045): which way each building model's door faces, as Josh chose it by
 * clicking in the 3D gallery, and which buildings he excluded. Types, constants, the validator and two pure
 * helpers (apply a patch, an empty file). Pure TypeScript: no DOM, no Node, no imports from other folders.
 *
 * The file lives at CALIBRATION_FILE, under the gitignored `assets/private/`, on Josh's PC only. It is
 * written by the dev server alone (CALIBRATION_ENDPOINT, a Vite plugin that exists only under `npm run dev`)
 * and read by the 3D view only in a dev build. It never reaches `dist/`. Model names are not licensed
 * content (city style guide, chapter 14), but the file stays private with the packs it describes.
 *
 * Marks (amendments at approval, 17 Nov 2026): a door side (`front`), `exclude`, and clear (the entry is
 * deleted). There is no "not a building" mark; a `notBuilding` field is an unknown field and is refused.
 */

/** Bumped when the file's shape changes; readers refuse other versions. */
export const CALIBRATION_VERSION = 1 as const;

/** Where the dev server keeps the file, relative to the repo root, forward slashes. */
export const CALIBRATION_FILE = "assets/private/calibration/fronts.json";

/** The dev server's endpoint: GET returns the file (or an empty one), POST applies one CalibrationPatch. */
export const CALIBRATION_ENDPOINT = "/__calibration/fronts";

/** The axis, in a GLB's own frame, that a model's door faces. The same four values as render3d's ModelFront. */
export type CalibrationFront = "+z" | "-z" | "+x" | "-x";

/** The four fronts, in the gallery's copy order. */
export const CALIBRATION_FRONTS: readonly CalibrationFront[] = ["+z", "+x", "-z", "-x"];

/**
 * A model's key: its pack id, a colon, its root node name in that pack's GLB, e.g. "city-pack:SM_Bld_Shop_01".
 * Names repeat across packs (SM_Bld_Shop_01..03, SM_Bld_Apartment_01, SM_Bld_Church_01), so a bare name is never a key.
 * The pack id is the manifest's `pack` (lower case, digits, hyphens); the name is the manifest entry's `name`.
 */
export type CalibrationKey = `${string}:${string}`;

/**
 * What Josh said about one model. At least one of `front` or `exclude` is set; an entry with neither is not
 * written (clearing a model removes its entry, so the code's table applies again).
 * - `front`: the side of the model he clicked as its door.
 * - `exclude`: a building he never wants placed (a BUILDING_EXCLUDE entry). May have `front`.
 */
export interface CalibrationEntry {
  front?: CalibrationFront;
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

/** `validateCalibrationPatch`'s result (section B's POST body check). */
export type CalibrationPatchResult = { ok: true; patch: CalibrationPatch } | { ok: false; errors: readonly string[] };

const PACK_RE = /^[a-z0-9-]+$/;
const BAD_NAME_RE = /[/\\\u0000-\u001f\u007f]/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;
const FILE_FIELDS = new Set(["version", "savedAt", "entries"]);
const ENTRY_FIELDS = new Set(["front", "exclude", "at"]);
const PATCH_FIELDS = new Set(["key", "entry"]);

/** The key for a model of a pack. Does not check its parts; `parseCalibrationKey` does. */
export function calibrationKey(pack: string, name: string): CalibrationKey {
  return `${pack}:${name}`;
}

/**
 * Splits a key at its first colon. The pack is `[a-z0-9-]+`; the name is the rest: non-empty, with no `/`,
 * `\` or control characters. Anything else (including a non-string) is null.
 */
export function parseCalibrationKey(key: unknown): { pack: string; name: string } | null {
  if (typeof key !== "string") return null;
  const colon = key.indexOf(":");
  if (colon < 0) return null;
  const pack = key.slice(0, colon);
  const name = key.slice(colon + 1);
  if (!PACK_RE.test(pack) || name.length === 0 || BAD_NAME_RE.test(name)) return null;
  return { pack, name };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isIsoTime(v: unknown): v is string {
  return typeof v === "string" && ISO_RE.test(v) && Number.isFinite(Date.parse(v));
}

/** Checks an entry's marks (`front`, `exclude`) and unknown fields; `withAt` also requires a valid `at`. */
function entryErrors(where: string, entry: unknown, withAt: boolean): string[] {
  if (!isPlainObject(entry)) return [`${where}: the entry must be an object`];
  const errors: string[] = [];
  for (const field of Object.keys(entry)) {
    if (!ENTRY_FIELDS.has(field) || (!withAt && field === "at")) errors.push(`${where}: unknown field "${field}"`);
  }
  if (entry.front !== undefined && !CALIBRATION_FRONTS.includes(entry.front as CalibrationFront)) {
    errors.push(`${where}: front ${JSON.stringify(entry.front)} is not one of ${CALIBRATION_FRONTS.join(", ")}`);
  }
  if (entry.exclude !== undefined && entry.exclude !== true) {
    errors.push(`${where}: exclude must be true or absent`);
  }
  if (entry.front === undefined && entry.exclude === undefined) {
    errors.push(`${where}: the entry has neither front nor exclude (clear it instead)`);
  }
  if (withAt && !isIsoTime(entry.at)) errors.push(`${where}: at is missing or not an ISO 8601 time`);
  return errors;
}

/** Validates a parsed calibration file. Every error names the key or the field it is about. */
export function validateCalibration(json: unknown): CalibrationResult {
  if (!isPlainObject(json)) return { ok: false, errors: ["calibration: the file must be a JSON object"] };
  const errors: string[] = [];
  for (const field of Object.keys(json)) {
    if (!FILE_FIELDS.has(field)) errors.push(`calibration: unknown field "${field}"`);
  }
  if (json.version !== CALIBRATION_VERSION) {
    errors.push(`calibration: version ${JSON.stringify(json.version)} is not ${CALIBRATION_VERSION}`);
  }
  if (!isIsoTime(json.savedAt)) errors.push("calibration: savedAt is missing or not an ISO 8601 time");
  if (!isPlainObject(json.entries)) {
    errors.push("calibration: entries must be an object");
  } else {
    for (const [key, entry] of Object.entries(json.entries)) {
      if (!parseCalibrationKey(key)) {
        errors.push(`${JSON.stringify(key)}: not a pack:name key`);
        continue;
      }
      errors.push(...entryErrors(key, entry, true));
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, file: json as unknown as CalibrationFile };
}

/** Validates one patch (a POST body, parsed). `entry` is null (clear) or an entry without `at`. */
export function validateCalibrationPatch(json: unknown): CalibrationPatchResult {
  if (!isPlainObject(json)) return { ok: false, errors: ["patch: the body must be a JSON object"] };
  const errors: string[] = [];
  for (const field of Object.keys(json)) {
    if (!PATCH_FIELDS.has(field)) errors.push(`patch: unknown field "${field}"`);
  }
  const keyOk = parseCalibrationKey(json.key) !== null;
  if (!keyOk) errors.push(`patch: key ${JSON.stringify(json.key)} is not a pack:name key`);
  const where = keyOk ? (json.key as string) : "patch";
  if (!("entry" in json)) errors.push(`${where}: entry is missing (null clears the key)`);
  else if (json.entry !== null) errors.push(...entryErrors(where, json.entry, false));
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, patch: json as unknown as CalibrationPatch };
}

/** An empty file, saved at `now`. */
export function emptyCalibration(now: Date): CalibrationFile {
  return { version: CALIBRATION_VERSION, savedAt: now.toISOString(), entries: {} };
}

/**
 * Applies one patch to a file (or to an empty one when `file` is null) and returns a new file: the key's entry
 * is set or replaced (stamped `at` = now) or, on a null entry, deleted; `savedAt` = now; keys sorted. Never
 * mutates its inputs. Throws on an invalid patch or an invalid `now`, so it never returns a file that
 * `validateCalibration` refuses (section B validates the request with `validateCalibrationPatch` first).
 */
export function applyCalibrationPatch(file: CalibrationFile | null, patch: CalibrationPatch, now: Date): CalibrationFile {
  const checked = validateCalibrationPatch(patch);
  if (!checked.ok) throw new Error(`applyCalibrationPatch: ${checked.errors.join("; ")}`);
  const stamp = now.toISOString();
  const merged: Record<string, CalibrationEntry> = {};
  for (const [key, entry] of Object.entries(file?.entries ?? {})) merged[key] = { ...entry };
  if (patch.entry === null) {
    delete merged[patch.key];
  } else {
    // Field order as in the ticket's example: front, exclude, at.
    merged[patch.key] = {
      ...(patch.entry.front !== undefined ? { front: patch.entry.front } : {}),
      ...(patch.entry.exclude ? { exclude: true as const } : {}),
      at: stamp,
    };
  }
  const entries: Record<CalibrationKey, CalibrationEntry> = {};
  const sorted = Object.entries(merged).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [key, entry] of sorted) entries[key as CalibrationKey] = entry;
  return { version: CALIBRATION_VERSION, savedAt: stamp, entries };
}
