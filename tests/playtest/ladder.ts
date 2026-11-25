/** The city puzzles on disk (puzzles/city/*.city.json), each with the check block of its note (the script), read at run time. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCityPuzzle, parseCheckBlock, validateCheck } from "../../src/core";
import type { CityPuzzle, Puzzle, PuzzleCheck } from "../../src/core";
import { convertCityPuzzle } from "../../src/city/circuit/convert";
import { cityPlanFor } from "../../tools/fit";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CITY_DIR = join(ROOT, "puzzles", "city");

/** Every city puzzle id, in order. Locked copies (puzzles/city/locked/) are not read: they are the same files once Josh locks them. */
export function cityIds(): string[] {
  return readdirSync(CITY_DIR)
    .filter((f) => f.endsWith(".city.json"))
    .map((f) => f.replace(/\.city\.json$/, ""))
    .sort();
}

export interface CityMap {
  city: CityPuzzle;
  /** The plain map the grid plays, through the conversion on the puzzle's own city (6 x 6 seed 1 through the module cache). */
  puzzle: Puzzle;
  /** Ids the conversion added (scenery lamps, split junctions); the trace leaves them out. */
  hidden: ReadonlySet<string>;
  /** The note's check block, or null when the note has none or it does not parse. */
  check: PuzzleCheck | null;
  problem: string | null;
}

export function loadCityMap(id: string): CityMap {
  const city = loadCityPuzzle(JSON.parse(readFileSync(join(CITY_DIR, `${id}.city.json`), "utf8")) as unknown);
  const converted = convertCityPuzzle(city, cityPlanFor(city.city));
  const hidden = new Set(converted.hidden ?? []);
  const note = join(CITY_DIR, `${id}.md`);
  const base = { city, puzzle: converted.puzzle, hidden };
  if (!existsSync(note)) return { ...base, check: null, problem: `no note ${id}.md` };
  const parsed = parseCheckBlock(readFileSync(note, "utf8"));
  if (parsed === null) return { ...base, check: null, problem: "its note has no check block" };
  if (!parsed.ok) return { ...base, check: null, problem: parsed.error };
  const valid = validateCheck(parsed.json, converted.puzzle);
  return valid.ok ? { ...base, check: valid.check, problem: null } : { ...base, check: null, problem: valid.errors.join("; ") };
}
