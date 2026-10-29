/**
 * `npm run analyze puzzles/<id>.json [--cap N] [--click-seconds S] [--json]` (ticket 027 D2).
 * A bounded breadth-first search over the real simulator: exhaustive up to the state cap (default 500 000), and past
 * it a proved lower bound ("no win in fewer than D clicks"). Deterministic: the same map always prints the same text.
 * `--sections` (D3) is reserved: it will build one sub-puzzle per section and call `analyzePuzzle` on each.
 */

import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validatePuzzle } from "../src/core";
import type { Puzzle } from "../src/core";
import { DEFAULT_CAP, analyzePuzzle } from "./analyzerun";
import type { AnalysisResult, AnalyzeOptions } from "./analyzerun";

export function loadPuzzle(path: string): Puzzle {
  const r = validatePuzzle(JSON.parse(readFileSync(path, "utf8")) as unknown);
  if (!r.ok) throw new Error(`${basename(path)} is not a valid puzzle:\n  ${r.errors.join("\n  ")}`);
  return r.puzzle;
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
const list = (xs: readonly string[]): string => (xs.length ? xs.join(", ") : "none");

/** The printable report: the lines the CLI shows. */
export function formatAnalysis(r: AnalysisResult): string[] {
  const out: string[] = [];
  out.push(`${r.puzzleId}: ${r.exhaustive ? "exhaustive" : "NOT exhaustive (state cap reached)"}, ${r.states}${r.exhaustive ? "" : "+"} states (cap ${r.cap})`);
  if (r.exhaustive) {
    out.push(`  solvable: ${r.solvable ? "yes" : "NO"}`);
    if (r.solvable) out.push(`  min clicks: ${r.minClicks}`);
  } else {
    out.push(`  solvable: ${r.solvable ? "a win was found" : "no win found yet"}`);
    if (r.minClicks !== null) out.push(`  min clicks: ${r.minClicks} (proved: every layer below was fully searched)`);
    else if (r.bestKnown !== null) out.push(`  shortest win found: ${r.bestKnown} clicks (not proved shortest)`);
    out.push(`  no win in fewer than ${r.noWinBelow} clicks`);
  }
  if (r.solvable) {
    out.push(`  winning orders (fewest clicks, then fewest waits)${r.exhaustive ? "" : " found so far"}: ${r.winningOrders}`);
    out.push(`  winning configurations (breakers, switches, repairs)${r.exhaustive ? "" : " found so far"}: ${r.winningConfigs}`);
    if (r.win) {
      out.push(`  one shortest win: ${r.win.moves.join(", ")}`);
      out.push(`    ${r.win.clicks} clicks${r.win.waits ? `, ${r.win.waits} waits` : ""}; parts used: ${list(r.win.partsUsed)}`);
      for (const f of r.win.feeds) out.push(`    ${f.id}: load ${f.load} of ${f.capacity ?? "no limit"}`);
    }
    out.push(`  fuses that blow on a shortest win: ${list(r.blowOnShortestWin)}`);
  }
  out.push(`  fuses that blow on some move: ${list(r.blowAnywhere)}`);
  out.push(`  first moves: ${list(r.firstMoves)}`);
  if (r.exhaustive) {
    out.push(`  dead-end states (cannot win without Undo): ${r.deadStates} of ${r.states} (${pct(r.deadShare!)})`);
    out.push(`  first moves that lead only to dead ends: ${list(r.deadFirstMoves!)}`);
  } else {
    out.push("  dead-end share, dead first moves: not computed (the search is not exhaustive)");
  }
  return out;
}

function option(argv: readonly string[], name: string): number | undefined {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = Number(argv[i + 1]);
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${name} needs a positive number`);
  return v;
}

function main(argv: readonly string[]): number {
  const valueFlags = new Set(["--cap", "--click-seconds"]);
  const files = argv.filter((a, i) => !a.startsWith("-") && !valueFlags.has(argv[i - 1] ?? ""));
  if (files.length === 0) { console.log("usage: npm run analyze puzzles/<id>.json [--cap N] [--click-seconds S] [--json]"); return 1; }
  if (argv.includes("--sections")) { console.log("--sections is not built yet (ticket 027 D3)"); return 1; }
  let opts: AnalyzeOptions;
  try {
    const clickSeconds = option(argv, "--click-seconds");
    opts = { cap: option(argv, "--cap") ?? DEFAULT_CAP, ...(clickSeconds !== undefined && { clickSeconds }) };
  } catch (e) { console.log((e as Error).message); return 1; }
  let bad = 0;
  for (const f of files) {
    const p = resolve(f);
    if (!existsSync(p)) { console.log(`no such file: ${f}`); bad++; continue; }
    try {
      const r = analyzePuzzle(loadPuzzle(p), opts);
      if (argv.includes("--json")) console.log(JSON.stringify(r));
      else for (const l of formatAnalysis(r)) console.log(l);
    } catch (e) { console.log((e as Error).message); bad++; }
  }
  return bad ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}
