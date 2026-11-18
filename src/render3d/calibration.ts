/**
 * The saved front calibration, as the 3D view reads it (ticket 045 A, dev only). The file is written by the dev server on Josh's PC
 * (CALIBRATION_FILE, under the gitignored assets/private/) and never reaches a production build or CI, so every reader treats it as
 * optional: no file, an unreadable file or a production build all mean "the code's tables, exactly". Pure: no three, no DOM.
 * This file only reads; the gallery's saver (section C) lives in gallery.ts alone.
 */

import { CALIBRATION_FILE, parseCalibrationKey, validateCalibration, type CalibrationFile, type CalibrationKey } from "../core";
import type { BuildingFront, FrontTable } from "./models";

export interface LoadSavedDeps {
  /** True only in a dev build (`import.meta.env.DEV`). With false nothing is fetched. */
  dev: boolean;
  /** Resolves to the parsed JSON, and rejects on a network error, a non-OK status or a body that is not JSON. */
  fetchJson(url: string, init?: { cache: "no-store" }): Promise<unknown>;
  /** Where the one line naming why the file was refused goes. Default: console.info. */
  info?: (message: string) => void;
  /** The site's base, ending in "/". Default: `import.meta.env.BASE_URL`. */
  base?: string;
}

/**
 * The saved calibration file, or null. With `dev` false it returns null and fetches nothing. In dev it fetches the file with `cache: "no-store"`
 * and validates it. A missing file (a 404, a network error, a dev server's HTML fallback) is the normal case on a fresh checkout and is null
 * with no message. An invalid file is null with one info line naming its first error. It never rejects.
 */
export async function loadSavedCalibration(deps: LoadSavedDeps): Promise<CalibrationFile | null> {
  if (!deps.dev) return null;
  const info = deps.info ?? ((m: string) => console.info(m));
  const base = deps.base ?? import.meta.env.BASE_URL;
  let json: unknown;
  try {
    json = await deps.fetchJson(`${base}${CALIBRATION_FILE}`, { cache: "no-store" });
  } catch {
    return null;
  }
  const result = validateCalibration(json);
  if (!result.ok) {
    info(`3D calibration: ${CALIBRATION_FILE} is not used (${result.errors[0] ?? "invalid"}).`);
    return null;
  }
  return result.file;
}

/** The two tables the town and the gallery read. */
export interface FrontTables {
  fronts: FrontTable;
  exclude: readonly CalibrationKey[];
}

/**
 * The code's tables with the saved file laid over them (pure; neither input is changed):
 * - a saved `front` replaces the code's `front` and keeps the code's `corner` and `open` (one info line when that moves a corner model's door,
 *   because its `open` side is not recalibrated);
 * - a saved key the code lacks is added;
 * - a saved `exclude: true` adds the key to `exclude`;
 * - a code key with no saved entry is unchanged. With `saved` null the result equals the code's tables.
 */
export function effectiveFronts(code: FrontTables, saved: CalibrationFile | null, info: (message: string) => void = (m) => console.info(m)): FrontTables {
  const fronts: Record<CalibrationKey, BuildingFront> = {};
  for (const [key, bf] of Object.entries(code.fronts)) fronts[key as CalibrationKey] = { ...bf };
  const exclude: CalibrationKey[] = [...code.exclude];
  if (!saved) return { fronts, exclude };
  for (const [key, entry] of Object.entries(saved.entries) as [CalibrationKey, CalibrationFile["entries"][CalibrationKey]][]) {
    if (!parseCalibrationKey(key)) continue;
    if (entry.front !== undefined) {
      const was = Object.prototype.hasOwnProperty.call(fronts, key) ? fronts[key] : undefined;
      if (was) {
        if (was.corner && was.front !== entry.front) {
          info(`3D calibration: ${key} is a corner model; its front is now ${entry.front} but its open side (${was.open ?? "+x"}) is not recalibrated.`);
        }
        fronts[key] = { ...was, front: entry.front };
      } else {
        fronts[key] = { front: entry.front };
      }
    }
    if (entry.exclude === true && !exclude.includes(key)) exclude.push(key);
  }
  return { fronts, exclude };
}
