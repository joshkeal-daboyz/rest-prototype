/**
 * Collects the playable maps from the puzzle files. Pure: the caller passes the glob result.
 * Only `scope: "map"` files are listed; files under a `locked/` folder are marked locked.
 */

import { validatePuzzle, type Puzzle } from "../core";

export interface MapEntry {
  id: string;
  name: string;
  locked: boolean;
  path: string;
  puzzle: Puzzle;
}

export interface MapCollection {
  entries: MapEntry[];
  /** One line per file that failed validation or repeated an id. */
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
    if (found.some((m) => m.id === puzzle.id)) {
      problems.push(`${path}: duplicate map id ${puzzle.id}`);
      continue;
    }
    found.push({ id: puzzle.id, name: puzzle.name, locked: LOCKED_PATH.test(path), path, puzzle });
  }

  // Open maps first, then locked ones; each group keeps path order.
  const entries = [...found.filter((m) => !m.locked), ...found.filter((m) => m.locked)];
  return { entries, problems };
}
