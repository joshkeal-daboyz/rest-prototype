/**
 * Collects the playable maps from the puzzle files. Pure: the caller passes the glob result.
 * Only `scope: "map"` files are listed; files under a `locked/` folder are marked locked.
 *
 * A locked copy usually keeps its original's `id`, so each entry has a `key` that is unique
 * across the folder: the id for open files, `locked/<id>` for locked ones. The picker and the
 * `?puzzle=` parameter address maps by key.
 */

import { validateCityPuzzle, validatePuzzle, type CityPuzzle, type Puzzle } from "../core";

export interface MapEntry {
  /** Unique address of this map: its id, or `locked/<id>` for a locked copy. */
  key: string;
  id: string;
  name: string;
  locked: boolean;
  path: string;
  puzzle: Puzzle;
}

export interface MapCollection {
  entries: MapEntry[];
  /** One line per file that failed validation or repeated a key. */
  problems: string[];
}

const LOCKED_PATH = /(^|\/)locked\//;

export function collectMaps(files: Record<string, unknown>): MapCollection {
  const found: MapEntry[] = [];
  const problems: string[] = [];

  for (const path of Object.keys(files).sort()) {
    const result = validatePuzzle(files[path]);
    if (!result.ok) {
      problems.push(`${path}: ${result.errors.join("; ")}`);
      continue;
    }
    const puzzle = result.puzzle;
    if (puzzle.scope !== "map") continue;
    const locked = LOCKED_PATH.test(path);
    const key = locked ? `locked/${puzzle.id}` : puzzle.id;
    if (found.some((m) => m.key === key)) {
      problems.push(`${path}: duplicate map key ${key}`);
      continue;
    }
    found.push({ key, id: puzzle.id, name: puzzle.name, locked, path, puzzle });
  }

  // Open maps first, then locked ones; each group keeps path order.
  const entries = [...found.filter((m) => !m.locked), ...found.filter((m) => m.locked)];
  return { entries, problems };
}

/**
 * A city puzzle in the picker (081 U1): its `puzzles/city/` file, checked by `validateCityPuzzle` (C1). The picker lists city puzzles only, so it has no
 * `puzzle` (schematic) field; the city form is what U2 plays.
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
 * street files beside them are left out silently. `collectMaps` is unchanged and still lists the schematics.
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
