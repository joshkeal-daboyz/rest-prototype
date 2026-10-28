/**
 * Collects the playable maps from the puzzle files. Pure: the caller passes the glob result.
 * Only `scope: "map"` files are listed; files under a `locked/` folder are marked locked.
 *
 * A locked copy usually keeps its original's `id`, so each entry has a `key` that is unique
 * across the folder: the id for open files, `locked/<id>` for locked ones. The picker and the
 * `?puzzle=` parameter address maps by key.
 */

import { validatePuzzle, type Puzzle } from "../core";

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
