/**
 * `npm run check [puzzles/<id>.json ...]` (ticket 027 D1): replay the check block in each puzzle's design note
 * on the real simulator. With no arguments it checks every puzzle in puzzles/ whose note has a block, and (ticket 081 P1) every city puzzle in puzzles/city/.
 * A `.city.json` file is checked on the city it names: the city check (CK12 to CK14, CK17, the mid-row clearance), then its note's block replayed through the conversion.
 * A directory argument stands for the city puzzles in it (`npm run check puzzles/city/`).
 * Exits non-zero if any block is invalid or fails. A note with no block is skipped (and said so only when named).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseCheckBlock, validateCheck, validateCityPuzzle, validatePuzzle } from "../src/core";
import type { CityPlan, CityPuzzle, CityPuzzleCity, Puzzle } from "../src/core";
import { convertCityPuzzle } from "../src/city/circuit/convert";
import { formatReport, replayMoves, runCheck } from "./checkrun";
import type { CheckReport } from "./checkrun";
import { cityCheckProblems, cityPlanFor } from "./fit";

export const PUZZLES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "puzzles");

export type FileResult =
  | { status: "no-note" | "no-block"; id: string }
  | { status: "invalid"; id: string; errors: readonly string[] }
  | { status: "checked"; id: string; report: CheckReport; lines: string[] };

/** The design note for a map file: `x.json`, `x.grid.json` and `x.city.json` all have `x.md` beside them. */
export function noteFor(jsonPath: string): string {
  return jsonPath.replace(/\.city\.json$/, ".md").replace(/\.grid\.json$/, ".md").replace(/\.json$/, ".md");
}

/** What checking a city puzzle needs beyond the file: the plan it is laid on. The default builds it (through stage 7, once per city); a test hands in a shared one. */
export interface CheckOptions {
  readonly planFor?: (city: CityPuzzleCity) => CityPlan;
}

/** Check one city puzzle file: its shape, the city check on the plan it names, then its note's check block replayed through the conversion on `src/grid/`, so the scenery's load counts as it does in play. */
function checkCityFile(jsonPath: string, options: CheckOptions): FileResult {
  const id = basename(jsonPath).replace(/\.city\.json$/, "");
  const notePath = noteFor(jsonPath);
  if (!existsSync(notePath)) return { status: "no-note", id };
  const parsed = parseCheckBlock(readFileSync(notePath, "utf8"));
  if (parsed === null) return { status: "no-block", id };
  if (!parsed.ok) return { status: "invalid", id, errors: [parsed.error] };
  const shape = validateCityPuzzle(JSON.parse(readFileSync(jsonPath, "utf8")) as unknown);
  if (!shape.ok) return { status: "invalid", id, errors: shape.errors.map((e) => `puzzle: ${e}`) };
  const city: CityPuzzle = shape.puzzle;
  const plan = (options.planFor ?? cityPlanFor)(city.city);
  const first = cityCheckProblems(city, plan);
  if (first.length > 0) return { status: "invalid", id, errors: first.map((p) => `${p.rule} ${p.id}: ${p.reason}`) };
  const converted = convertCityPuzzle(city, plan).puzzle;
  const cv = validateCheck(parsed.json, converted);
  if (!cv.ok) return { status: "invalid", id, errors: cv.errors };
  // W1: the read-outward rule reads the winning state of the note's solution (which end current enters each line by).
  const problems = cityCheckProblems(city, plan, replayMoves(converted, cv.check.solution).state);
  if (problems.length > 0) return { status: "invalid", id, errors: problems.map((p) => `${p.rule} ${p.id}: ${p.reason}`) };
  const report = runCheck(converted, cv.check);
  return { status: "checked", id, report, lines: formatReport(id, report, converted.startingParts) };
}

/** Check one map file by its note. */
export function checkFile(jsonPath: string, options: CheckOptions = {}): FileResult {
  if (jsonPath.endsWith(".city.json")) return checkCityFile(jsonPath, options);
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

/** Every city puzzle under puzzles/city/ whose note carries a check block (ticket 081 P1). */
export function cityPuzzlesWithBlocks(dir: string = join(PUZZLES_DIR, "city")): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".city.json"))
    .sort()
    .map((f) => join(dir, f))
    .filter((p) => existsSync(noteFor(p)) && parseCheckBlock(readFileSync(noteFor(p), "utf8")) !== null);
}

/** A named directory stands for the city puzzles in it: `npm run check puzzles/city/`. */
function expand(arg: string): string[] {
  const path = resolve(arg);
  return statSync(path, { throwIfNoEntry: false })?.isDirectory() ? cityPuzzlesWithBlocks(path) : [path];
}

function main(argv: readonly string[]): number {
  const named = argv.filter((a) => !a.startsWith("-"));
  const files = named.length ? named.flatMap(expand) : [...puzzlesWithBlocks(), ...cityPuzzlesWithBlocks()];
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
