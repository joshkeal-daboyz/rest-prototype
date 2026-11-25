/**
 * Lists the city puzzles for the picker (ticket 081 U1, X2). Pure: the caller passes the glob result.
 * The schematic picker (`collectMaps`) went with the 2D map (ticket 081 X2).
 */

import { validateCityPuzzle, type CityPuzzle } from "../core";

/**
 * A city puzzle in the picker (081 U1): its `puzzles/city/` file, checked by `validateCityPuzzle` (C1). The picker lists city puzzles only, the city form is what the page plays.
 */
export interface CityMapEntry {
  /** Unique address of this map: its id, or `locked/<id>` for a locked copy under `puzzles/city/locked/`. */
  key: string;
  id: string;
  name: string;
  locked: boolean;
  path: string;
  city: CityPuzzle;
  /** The schematic this city puzzle was laid from, if any (P2a's pilots carry it). */
  from?: string;
}

export interface CityMapCollection {
  entries: CityMapEntry[];
  /** One line per city file that failed validation or repeated a key. */
  problems: string[];
}

const CITY_PATH = /(^|\/)puzzles\/city\/(?:.+\/)?[^/]+\.city\.json$/;
const CITY_LOCKED_PATH = /(^|\/)puzzles\/city\/locked\//;

/**
 * Collects the city puzzles for the picker. Pure: the caller passes the glob result. Only `puzzles/city/**\/*.city.json` files are read; the schematics and
 * street files beside them are left out silently.
 */
export function collectCityMaps(files: Record<string, unknown>): CityMapCollection {
  const found: CityMapEntry[] = [];
  const problems: string[] = [];

  for (const path of Object.keys(files).sort()) {
    if (!CITY_PATH.test(path)) continue;
    const result = validateCityPuzzle(files[path]);
    if (!result.ok) {
      problems.push(`${path}: ${result.errors.join("; ")}`);
      continue;
    }
    const city = result.puzzle;
    const locked = CITY_LOCKED_PATH.test(path);
    const key = locked ? `locked/${city.id}` : city.id;
    if (found.some((m) => m.key === key)) {
      problems.push(`${path}: duplicate map key ${key}`);
      continue;
    }
    found.push({
      key,
      id: city.id,
      name: city.name,
      locked,
      path,
      city,
      ...(city.from !== undefined ? { from: city.from } : {}),
    });
  }

  // Open maps first, then locked ones; each group keeps path order.
  const entries = [...found.filter((m) => !m.locked), ...found.filter((m) => m.locked)];
  return { entries, problems };
}
