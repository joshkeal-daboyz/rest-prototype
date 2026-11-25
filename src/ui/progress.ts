/**
 * Stage progress for the title and the stage select (ticket 081 T2, T-Q3 and T-Q4). Pure: no DOM, no clock. The
 * page passes the storage and the date in. A win is kept per puzzle id: the fewest moves and the shortest time,
 * each its own best, and the date of the first win.
 */

import { formatTime, type StorageLike } from "./logic";

/** The key the progress is stored under in this browser (T-Q4). */
export const PROGRESS_KEY = "rest-circuits.progress.v1";

/** One puzzle's best: the fewest moves, the shortest time (each its own best), and the date of the first win. */
export interface StageBest {
  moves: number;
  seconds: number;
  first: string;
}

/** Progress by puzzle id. Never mutated: `recordWin` returns a new map. */
export type Progress = ReadonlyMap<string, StageBest>;

/**
 * Records a win of `id` in `moves` and `seconds`, dated `on` (an ISO date, e.g. `2026-11-25`). A first win stores
 * all three. A later win keeps the first win's date and takes the lower of each best, so a worse run changes
 * nothing and a run with fewer moves but a longer time improves only the moves.
 */
export function recordWin(progress: Progress, id: string, moves: number, seconds: number, on: string): Progress {
  const next = new Map(progress);
  const prev = progress.get(id);
  if (!prev) {
    next.set(id, { moves, seconds, first: on });
  } else {
    next.set(id, {
      moves: Math.min(prev.moves, moves),
      seconds: Math.min(prev.seconds, seconds),
      first: prev.first,
    });
  }
  return next;
}

/** One entry's best, or null when the stored value is not a best. Each field is checked on its own. */
function parseBest(value: unknown): StageBest | null {
  if (typeof value !== "object" || value === null) return null;
  const { moves, seconds, first } = value as { moves?: unknown; seconds?: unknown; first?: unknown };
  if (typeof moves !== "number" || !Number.isInteger(moves) || moves < 0) return null;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return null;
  if (typeof first !== "string") return null;
  return { moves, seconds, first };
}

/** The string written under PROGRESS_KEY: a version and the bests by id. */
function serializeProgress(progress: Progress): string {
  const stages: Record<string, StageBest> = {};
  for (const [id, best] of progress) stages[id] = best;
  return JSON.stringify({ version: 1, stages });
}

/**
 * Reads the progress under PROGRESS_KEY. Missing, unreadable or wrongly shaped data gives no progress, and an
 * entry that is not a best is dropped while the rest are kept. Never throws.
 */
export function loadProgress(storage: StorageLike | null | undefined): Progress {
  const empty = new Map<string, StageBest>();
  if (!storage) return empty;
  let raw: string | null;
  try {
    raw = storage.getItem(PROGRESS_KEY);
  } catch {
    return empty;
  }
  if (typeof raw !== "string") return empty;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (typeof data !== "object" || data === null) return empty;
  const { version, stages } = data as { version?: unknown; stages?: unknown };
  if (version !== 1 || typeof stages !== "object" || stages === null || Array.isArray(stages)) return empty;
  const out = new Map<string, StageBest>();
  for (const [id, value] of Object.entries(stages)) {
    const best = parseBest(value);
    if (best) out.set(id, best);
  }
  return out;
}

/** Writes the progress. Returns false (and does not throw) when storage is missing or refuses the write. */
export function saveProgress(storage: StorageLike | null | undefined, progress: Progress): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROGRESS_KEY, serializeProgress(progress));
    return true;
  } catch {
    return false;
  }
}

/** Empties the progress (T-Q4's Clear progress). Returns false when storage refuses the write. */
export function clearProgress(storage: StorageLike | null | undefined): boolean {
  return saveProgress(storage, new Map());
}

/** The slice of a city puzzle the stage list reads. A CityMapEntry fits. */
export interface StageEntry {
  id: string;
  name: string;
  locked?: boolean;
}

/** One line of the stage select. `completed` and `next` are plain flags; the text is the dropdown line. */
export interface StageRow {
  id: string;
  number: number;
  text: string;
  completed: boolean;
  next: boolean;
}

/** The stage number a puzzle id starts with (`01-first-light` is 1), or null for an id with no leading number. */
export function stageNumber(id: string): number | null {
  const match = /^\d+/.exec(id);
  return match ? Number(match[0]) : null;
}

/**
 * The stage select's lines: every completed stage in number order, then the next stage (the lowest-numbered one
 * not completed), and no others. Only numbered puzzles are stages; locked copies are left out. A completed line
 * reads `01 · First light · 7 moves · 0:42.3`, the next reads `02 · This way or that · not yet lit`. The number
 * and name come from the puzzle's own name.
 */
export function stageList(entries: readonly StageEntry[], progress: Progress): StageRow[] {
  const stages: { entry: StageEntry; number: number }[] = [];
  for (const entry of entries) {
    if (entry.locked) continue;
    const number = stageNumber(entry.id);
    if (number !== null) stages.push({ entry, number });
  }
  stages.sort((a, b) => a.number - b.number);

  const rows: StageRow[] = [];
  const pending: StageRow[] = [];
  for (const { entry, number } of stages) {
    const best = progress.get(entry.id);
    if (best) {
      const moves = `${best.moves} ${best.moves === 1 ? "move" : "moves"}`;
      rows.push({ id: entry.id, number, text: `${entry.name} · ${moves} · ${formatTime(best.seconds)}`, completed: true, next: false });
    } else {
      pending.push({ id: entry.id, number, text: `${entry.name} · not yet lit`, completed: false, next: false });
    }
  }
  const next = pending[0];
  if (next) rows.push({ ...next, next: true });
  return rows;
}
