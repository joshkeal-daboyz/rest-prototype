/** The ladder on disk (puzzles/NN-*.json) and the README's Min clicks column, read at run time. */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPuzzle } from "../../src/core";
import type { Puzzle } from "../../src/core";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PUZZLES = join(ROOT, "puzzles");

/** Every ladder map id, in order. `lamp-row.grid.json` is a street, not a map, and is skipped by name (it has no NN- prefix). */
export function ladderIds(): string[] {
  return readdirSync(PUZZLES)
    .filter((f) => /^\d\d-.*\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

export function loadMap(id: string): Puzzle {
  return loadPuzzle(JSON.parse(readFileSync(join(PUZZLES, `${id}.json`), "utf8")) as unknown);
}

export interface ReadmeMin {
  /** Map number ("09") -> the Min clicks column. */
  min: Map<string, number>;
  /** Map numbers whose min the README takes from their notes, not from the search. */
  fromNote: Set<string>;
}

/** Read the table in puzzles/README.md and the sentence naming the maps whose min comes from their notes. */
export function readmeMins(): ReadmeMin {
  const text = readFileSync(join(PUZZLES, "README.md"), "utf8");
  const min = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split("|").map((c) => c.trim());
    // "| 09 | The shrine circuit | what it teaches | 3 |" splits to ["", "09", name, teaches, "3", ""]
    if (cells.length < 6) continue;
    const num = cells[1] ?? "";
    const last = cells[cells.length - 2] ?? "";
    if (/^\d\d$/.test(num) && /^\d+$/.test(last)) min.set(num, Number(last));
  }
  const fromNote = new Set<string>();
  const m = /Min clicks for ([\d, and]+?) are from their notes/.exec(text);
  for (const n of m?.[1]?.match(/\d+/g) ?? []) fromNote.add(n.padStart(2, "0"));
  return { min, fromNote };
}
