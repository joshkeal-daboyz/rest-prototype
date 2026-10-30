/**
 * `npm run check [puzzles/<id>.json ...]` (ticket 027 D1): replay the check block in each puzzle's design note
 * on the real simulator. With no arguments it checks every puzzle in puzzles/ whose note has a block.
 * Exits non-zero if any block is invalid or fails. A note with no block is skipped (and said so only when named).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseCheckBlock, validateCheck, validatePuzzle } from "../src/core";
import type { Puzzle } from "../src/core";
import { formatReport, runCheck } from "./checkrun";
import type { CheckReport } from "./checkrun";

export const PUZZLES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "puzzles");

export type FileResult =
  | { status: "no-note" | "no-block"; id: string }
  | { status: "invalid"; id: string; errors: readonly string[] }
  | { status: "checked"; id: string; report: CheckReport; lines: string[] };

/** The design note for a map file: `x.json` and `x.grid.json` both have `x.md` beside them. */
export function noteFor(jsonPath: string): string {
  return jsonPath.replace(/\.grid\.json$/, ".md").replace(/\.json$/, ".md");
}

/** Check one map file by its note. */
export function checkFile(jsonPath: string): FileResult {
  const id = basename(jsonPath).replace(/\.grid\.json$|\.json$/, "");
  const notePath = noteFor(jsonPath);
  if (!existsSync(notePath)) return { status: "no-note", id };
  const parsed = parseCheckBlock(readFileSync(notePath, "utf8"));
  if (parsed === null) return { status: "no-block", id };
  if (!parsed.ok) return { status: "invalid", id, errors: [parsed.error] };
  const pv = validatePuzzle(JSON.parse(readFileSync(jsonPath, "utf8")) as unknown);
  if (!pv.ok) return { status: "invalid", id, errors: pv.errors.map((e) => `puzzle: ${e}`) };
  const puzzle: Puzzle = pv.puzzle;
  const cv = validateCheck(parsed.json, puzzle);
  if (!cv.ok) return { status: "invalid", id, errors: cv.errors };
  const report = runCheck(puzzle, cv.check);
  return { status: "checked", id, report, lines: formatReport(id, report, puzzle.startingParts) };
}

/** Every map file under puzzles/ (and puzzles/locked/) whose note carries a check block. */
export function puzzlesWithBlocks(dir: string = PUZZLES_DIR): string[] {
  const out: string[] = [];
  for (const d of [dir, join(dir, "locked")]) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d).filter((x) => x.endsWith(".json")).sort()) {
      const p = join(d, f);
      const note = noteFor(p);
      if (existsSync(note) && parseCheckBlock(readFileSync(note, "utf8")) !== null) out.push(p);
    }
  }
  return out;
}

function main(argv: readonly string[]): number {
  const named = argv.filter((a) => !a.startsWith("-"));
  const files = named.length ? named.map((a) => resolve(a)) : puzzlesWithBlocks();
  if (files.length === 0) { console.log("no design note has a check block yet"); return 0; }
  let bad = 0;
  for (const f of files) {
    const r = checkFile(f);
    if (r.status === "checked") { for (const l of r.lines) console.log(l); if (!r.report.ok) bad++; }
    else if (r.status === "invalid") { console.log(`INVALID ${r.id}`); for (const e of r.errors) console.log(`  ${e}`); bad++; }
    else if (r.status === "no-note") { console.log(`FAIL ${r.id}: no design note ${noteFor(f)}`); bad++; }
    else { console.log(`FAIL ${r.id}: its note has no check block`); if (named.length) bad++; }
  }
  return bad ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}
