/**
 * `npm run fit puzzles/<NN-slug>.json -- --city 6x6:1:oneway [--blocks <ids>] [--avoid <ids>] [--max-blocks N] [--out <dir>] [--unraised]` (ticket 081 P1): search the city for a district of 1 to 4 blocks and an embedding of a schematic puzzle,
 * and write a draft `puzzles/city/<NN-slug>.city.json` (its `from` set, its capacities and ratings raised by the scenery its solution lights, section S). With no fit it says why and writes nothing.
 * `npm run fit -- --raise puzzles/city/<id>.city.json`: rewrite an existing city file's capacities and ratings in place, from its schematic's numbers.
 * `--unraised` fits without the solution: the schematic's own numbers, and any embedding the city check passes (the way to see whether a puzzle fits at all).
 * The tool proposes; the designer decides.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadCityPuzzle, parseCheckBlock, validateCheck, validatePuzzle } from "../src/core";
import type { CityPuzzle, CityPuzzleCity, Puzzle } from "../src/core";
import { analyzePuzzle } from "./analyzerun";
import { noteFor } from "./check";
import { cityPlanFor, convertedOf, fitPuzzle, numbersOf, playDifferences, playSummary, raiseForScenery } from "./fit";

/** `6x6:1:oneway` (or `twoway`) as a city. */
export function parseCity(text: string): CityPuzzleCity {
  const m = /^(\d+)x(\d+):(\d+):(oneway|twoway)$/.exec(text);
  if (m === null) throw new Error(`--city wants <blocksX>x<blocksZ>:<seed>:<oneway|twoway>, as 6x6:1:oneway; got "${text}"`);
  return { blocksX: Number(m[1]), blocksZ: Number(m[2]), seed: Number(m[3]), oneWay: m[4] === "oneway" };
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8")) as unknown;

function loadSchematic(path: string): Puzzle {
  const r = validatePuzzle(readJson(path));
  if (!r.ok) throw new Error(`${basename(path)} is not a valid puzzle:\n  ${r.errors.join("\n  ")}`);
  return r.puzzle;
}

/** The intended solution: the note's check block, else one shortest win from the analyzer. */
export function solutionOf(schematicPath: string, schematic: Puzzle): { moves: string[]; from: string } {
  const note = noteFor(schematicPath);
  if (existsSync(note)) {
    const parsed = parseCheckBlock(readFileSync(note, "utf8"));
    if (parsed !== null && parsed.ok) {
      const v = validateCheck(parsed.json, schematic);
      if (v.ok) return { moves: [...v.check.solution], from: "the note's check block" };
    }
  }
  const a = analyzePuzzle(schematic);
  if (a.win === null) throw new Error(`${schematic.id} has no check block and the analyzer found no win`);
  return { moves: a.win.moves, from: "the analyzer's one shortest win" };
}

const json = (p: unknown): string => JSON.stringify(p, null, 2) + "\n";

function flag(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/** The stop rule's measure: the raised draft against its schematic. True when they play the same. */
function report(lines: string[], schematic: Puzzle, draft: CityPuzzle, plan: ReturnType<typeof cityPlanFor>, moves: readonly string[]): boolean {
  const conv = convertedOf(draft, plan);
  const diff = playDifferences(playSummary(schematic), playSummary(conv.puzzle, conv.hidden));
  lines.push(`  scenery buildings on its poles: ${conv.scenery}; solution ${moves.join(", ")}`);
  lines.push(diff.length === 0 ? "  plays the same raised: yes (start, fewest clicks, winning configs, dead first moves, fuses on the shortest win)" : "  PLAYS DIFFERENTLY raised:");
  for (const d of diff) lines.push(`    ${d}`);
  return diff.length === 0;
}

function raiseFile(path: string): number {
  const city = loadCityPuzzle(readJson(path));
  const plan = cityPlanFor(city.city);
  const schematicPath = join(dirname(path), "..", `${city.from ?? ""}.json`);
  const schematic = city.from !== undefined && existsSync(schematicPath) ? loadSchematic(schematicPath) : undefined;
  const note = path.replace(/\.city\.json$|\.json$/, ".md");
  const parsed = existsSync(note) ? parseCheckBlock(readFileSync(note, "utf8")) : null;
  const noteMoves = parsed !== null && parsed.ok ? ((parsed.json as { solution?: string[] } | null)?.solution ?? null) : null;
  const moves = noteMoves ?? (schematic !== undefined ? solutionOf(schematicPath, schematic).moves : null);
  if (moves === null) {
    console.log(`${basename(path)}: no check block beside it and no schematic named by "from"; there is no solution to raise by`);
    return 1;
  }
  // The schematic's numbers are the base only when the file is the schematic raised, not reworked: it has the same numbered nodes (the feeds and rated fuse boxes), and their numbers are either the
  // schematic's own (an unraised draft) or exactly what raising from the schematic gives (already raised). Any other numbers are a hand rework's, and are raised from the file's own.
  const key = (x: Parameters<typeof numbersOf>[0]): string => numbersOf(x).join(",");
  const fromSchematic = schematic !== undefined && (key(city) === key(schematic) || key(raiseForScenery(city, plan, moves, schematic)) === key(city));
  const base = fromSchematic ? schematic : city;
  const raised = raiseForScenery(city, plan, moves, base);
  writeFileSync(path, json(raised));
  console.log([
    `${basename(path)}: raised from ${fromSchematic ? `${schematic!.id}'s numbers (the file is the schematic raised, so running this again changes nothing)` : "its own numbers (a rework: its numbered nodes or numbers differ from the schematic's; running this again raises them again)"}`,
    `  before: ${numbersOf(city).join(", ")}`,
    `  after:  ${numbersOf(raised).join(", ")}`,
  ].join("\n"));
  return 0;
}

function main(argv: readonly string[]): number {
  const raise = flag(argv, "--raise");
  if (raise !== undefined) return raiseFile(resolve(raise));

  const file = argv.find((a, i) => !a.startsWith("-") && !(i > 0 && argv[i - 1]!.startsWith("--")));
  const cityText = flag(argv, "--city");
  if (file === undefined || cityText === undefined) {
    console.log("usage: npm run fit puzzles/<NN-slug>.json -- --city 6x6:1:oneway [--blocks <ids>] [--avoid <ids>] [--max-blocks N] [--out <dir>]\n       npm run fit -- --raise puzzles/city/<id>.city.json");
    return 2;
  }
  const schematicPath = resolve(file);
  const schematic = loadSchematic(schematicPath);
  const city = parseCity(cityText);
  const plan = cityPlanFor(city);
  const unraised = argv.includes("--unraised");
  const sol = solutionOf(schematicPath, schematic);
  const blocks = flag(argv, "--blocks")?.split(",").map((b) => b.trim()).filter((b) => b !== "");
  const maxBlocks = flag(argv, "--max-blocks");
  const avoid = flag(argv, "--avoid")?.split(",").map((b) => b.trim()).filter((b) => b !== "");
  const r = fitPuzzle(schematic, plan, city, { ...(blocks !== undefined ? { blocks } : {}), ...(maxBlocks !== undefined ? { maxBlocks: Number(maxBlocks) } : {}), ...(avoid !== undefined ? { avoid } : {}), ...(unraised ? {} : { solution: sol.moves }) });
  if (!r.ok) {
    console.log(`${schematic.id}: ${r.message}`);
    return 1;
  }
  const dir = resolve(flag(argv, "--out") ?? join(dirname(schematicPath), "city"));
  mkdirSync(dir, { recursive: true });
  const target = join(dir, `${basename(schematicPath).replace(/\.json$/, "")}.city.json`);
  writeFileSync(target, json(r.draft));
  const out: string[] = [];
  out.push(`${schematic.id}: fits on ${r.district.join(", ")} (${r.district.length} block${r.district.length === 1 ? "" : "s"}), ${r.steps} steps, ${r.districtsTried} districts tried; wrote ${target}`);
  out.push(`  numbers before: ${numbersOf(schematic).join(", ")}`);
  out.push(`  numbers after:  ${numbersOf(r.draft).join(", ")}   (raised by ${sol.from}'s solution)`);
  const same = unraised || report(out, schematic, r.draft, plan, sol.moves);
  console.log(out.join("\n"));
  return same ? 0 : 3;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}
