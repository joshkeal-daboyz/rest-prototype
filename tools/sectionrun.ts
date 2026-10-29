/**
 * Sectioned analysis of a large map (ticket 027 D3). Pure (no file access): `tools/analyze.ts --sections` reads files.
 *
 * For each section of the note's check block it builds a sub-puzzle (the section's nodes, its inner lines, its
 * faults, its share of the parts), puts a stand-in where each link line leaves the section (as the designer declared
 * in `links`), and runs D2's `analyzePuzzle` on it unchanged. Then it checks that the sections compose:
 *   1. the full-map replay of the check block passes (D1);
 *   2. each section's share of the intended solution, played on its own sub-puzzle, wins it;
 *   3. the stubs agree with what the intended solution really sends across the links.
 *
 * Stand-ins. The link line is kept, with the far end replaced by a stub node of the same line id:
 *   - `{ feed: { capacity } }`: a feed with that capacity (power comes in here);
 *   - `{ lamp: { load, must } }`: a lamp with that load (power leaves here); a target when `must`;
 *   - `"cut"`: a dead-end junction (nothing flows; a switch output or battery input stays a valid line).
 * Stubs are appended after the section's real nodes, so on a tie the real feed carries.
 * A stub is always live and sits one hop past the link; it is a declared approximation, not the other section.
 */

import { CHECK_CLICK_SECONDS, parseCheckMove, puzzleFeeds, validatePuzzle } from "../src/core";
import type { CheckMove, CheckStub, GridNode, Line, Puzzle, PuzzleCheck } from "../src/core";
import { analyzePuzzle } from "./analyzerun";
import type { AnalysisResult, AnalyzeOptions } from "./analyzerun";
import { replayMoves, runCheck } from "./checkrun";
import type { CheckReport } from "./checkrun";

export interface SectionBuild {
  id: string;
  /** The sub-puzzle; null when it fails `validatePuzzle` (then `errors` says why). */
  puzzle: Puzzle | null;
  errors: string[];
  warnings: string[];
  /** The sub-puzzle's targets: the section's target lamps plus its `must` stub lamps. */
  targets: string[];
  /** Why there is nothing to search (no targets), else undefined. */
  skip?: string;
}

const stubId = (line: string): string => `__stub_${line}`;

/** Build one sub-puzzle per section. `check` must have passed `validateCheck` and carry `sections`. */
export function buildSectionPuzzles(puzzle: Puzzle, check: PuzzleCheck): SectionBuild[] {
  const sections = check.sections ?? [];
  const linkOf = new Map((check.links ?? []).map((l) => [l.line, l]));
  const feedCap = new Map(puzzleFeeds(puzzle).map((f) => [f.id, f.capacity]));
  const sectionOf = new Map<string, string>();
  for (const s of sections) for (const n of s.nodes) sectionOf.set(n, s.id);
  const wanted = puzzle.target && puzzle.target.length > 0 ? new Set(puzzle.target) : null; // null = every lamp
  const nodeById = new Map(puzzle.nodes.map((n) => [n.id, n]));

  return sections.map((s): SectionBuild => {
    const inSec = new Set(s.nodes);
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodes: GridNode[] = [];
    const stubNodes: GridNode[] = [];
    const lines: Line[] = [];
    const innerLines = new Set<string>();
    const linkLines = new Set<string>();
    const targets: string[] = [];

    for (const n of puzzle.nodes) {
      if (!inSec.has(n.id)) continue;
      nodes.push(n.type === "feed" ? { ...n, capacity: feedCap.get(n.id) ?? null } : n);
      if (n.type === "lamp" && (wanted === null || wanted.has(n.id))) targets.push(n.id);
    }

    for (const l of puzzle.lines) {
      const a = inSec.has(l.from);
      const b = inSec.has(l.to);
      if (a && b) { lines.push(l); innerLines.add(l.id); continue; }
      if (!a && !b) continue;
      linkLines.add(l.id);
      const link = linkOf.get(l.id);
      const stub: CheckStub | undefined = link?.sides[s.id];
      if (stub === undefined) { errors.push(`link ${l.id} has no stub for section ${s.id}`); continue; }
      const outer = a ? l.to : l.from;
      const pos = nodeById.get(outer)?.pos ?? ([0, 0] as const);
      const id = stubId(l.id);
      if (stub === "cut") stubNodes.push({ id, type: "junction", pos });
      else if ("feed" in stub) stubNodes.push({ id, type: "feed", pos, capacity: stub.feed.capacity, name: `link ${l.id}` });
      else {
        stubNodes.push({ id, type: "lamp", pos, load: stub.lamp.load });
        if (stub.lamp.must) targets.push(id);
      }
      lines.push(a ? { ...l, to: id } : { ...l, from: id });
    }

    const faults = [];
    for (const f of puzzle.faults) {
      if (inSec.has(f.at) || innerLines.has(f.at)) faults.push(f);
      else if (linkLines.has(f.at)) warnings.push(`fault ${f.id} sits on link ${f.at}, which belongs to no sub-puzzle (it is left out)`);
    }

    const sub: Puzzle = {
      id: `${puzzle.id}#${s.id}`,
      name: `${puzzle.name} (section ${s.id})`,
      version: 5,
      scope: "map",
      capacity: null,
      startingParts: s.parts ?? [],
      target: targets,
      nodes: [...nodes, ...stubNodes],
      lines,
      faults,
    };
    const v = validatePuzzle(sub);
    if (!v.ok) errors.push(...v.errors.map((e) => `sub-puzzle is invalid: ${e}`));
    const build: SectionBuild = { id: s.id, puzzle: v.ok && errors.length === 0 ? v.puzzle : null, errors, warnings, targets };
    if (targets.length === 0) build.skip = "no target lamps in this section (and no stub marked must), nothing to win";
    return build;
  });
}

/** The section that owns a move, or why none does. */
function ownerOf(puzzle: Puzzle, sectionOf: ReadonlyMap<string, string>, move: CheckMove): { section: string } | { all: true } | { skip: string } {
  const p = parseCheckMove(move);
  if (!p) return { skip: `"${move}" is not a move` };
  if (p.kind === "wait") return { all: true };
  if (p.kind === "undo") return { skip: "undo" };
  const node = sectionOf.get(p.id);
  if (node !== undefined) return { section: node };
  const line = puzzle.lines.find((l) => l.id === p.id);
  if (line) {
    const a = sectionOf.get(line.from);
    return a !== undefined && a === sectionOf.get(line.to) ? { section: a } : { skip: `"${move}" mends a link line, which no sub-puzzle holds` };
  }
  return { skip: `"${move}" names nothing in the map` };
}

export interface SectionRow {
  id: string;
  nodes: number;
  /** Set when there was nothing to search or the sub-puzzle could not be built. */
  skipped?: string;
  errors: string[];
  warnings: string[];
  analysis?: AnalysisResult;
  /** This section's share of the check block's solution, played on its sub-puzzle. */
  projection?: { moves: string[]; complete: boolean; clicks: number; failure?: string };
}

export interface SectionsReport {
  ok: boolean;
  /** Problems that are not about one section: the full-map replay, the stubs against the real flow. */
  problems: string[];
  /** Things worth knowing that do not fail the run. */
  notes: string[];
  full: CheckReport;
  sections: SectionRow[];
  /** Sum of the sections' proved minimum clicks, when every section has one. */
  sumMinClicks: number | null;
  /** Clicks in the check block's solution. */
  solutionClicks: number;
}

/** Run the sectioned analysis. `check` must have passed `validateCheck` and carry `sections`. */
export function analyzeSections(puzzle: Puzzle, check: PuzzleCheck, options: AnalyzeOptions = {}): SectionsReport {
  const clickSeconds = options.clickSeconds ?? check.clickSeconds ?? CHECK_CLICK_SECONDS;
  const problems: string[] = [];
  const notes: string[] = [];
  const sections = check.sections ?? [];
  const sectionOf = new Map<string, string>();
  for (const s of sections) for (const n of s.nodes) sectionOf.set(n, s.id);

  const full = runCheck(puzzle, { ...check, clickSeconds });
  if (!full.ok) problems.push("the full-map replay of the check block fails (npm run check shows where); the sections cannot be shown to compose");

  const builds = buildSectionPuzzles(puzzle, check);
  const rows: SectionRow[] = [];
  const hasUndo = check.solution.some((m) => parseCheckMove(m)?.kind === "undo");
  if (hasUndo) notes.push("the solution uses undo, so it is not split across sections (each section is only searched)");

  // Split the solution once.
  const share = new Map<string, string[]>(sections.map((s) => [s.id, []]));
  if (!hasUndo) {
    for (const m of check.solution) {
      const o = ownerOf(puzzle, sectionOf, m);
      if ("skip" in o) { notes.push(`left out of the sections: ${o.skip}`); continue; }
      if ("all" in o) { for (const list of share.values()) list.push(m); } else share.get(o.section)?.push(m);
    }
  }

  for (const b of builds) {
    const row: SectionRow = { id: b.id, nodes: sections.find((s) => s.id === b.id)?.nodes.length ?? 0, errors: [...b.errors], warnings: [...b.warnings] };
    rows.push(row);
    if (!b.puzzle) { row.skipped = "sub-puzzle could not be built"; continue; }
    if (b.skip) { row.skipped = b.skip; continue; }
    row.analysis = analyzePuzzle(b.puzzle, options);
    if (!hasUndo) {
      const moves = share.get(b.id) ?? [];
      const r = runCheck(b.puzzle, { clickSeconds, solution: moves });
      row.projection = { moves, complete: r.solution.complete && !r.solution.failure, clicks: r.solution.clicks };
      if (r.solution.failure) row.projection.failure = r.solution.failure;
    }
  }

  // The stubs against what the intended solution really sends across the links.
  if (full.ok) {
    const { state } = replayMoves(puzzle, check.solution, clickSeconds);
    const feedSection = new Map(puzzle.nodes.filter((n) => n.type === "feed").map((n) => [n.id, sectionOf.get(n.id)]));
    const imported = new Map<string, number>();
    const exported = new Map<string, number>();
    for (const n of puzzle.nodes) {
      if (n.type !== "lamp" || !state.lit.has(n.id)) continue;
      const carrier = state.feedOf.get(n.id);
      if (carrier === undefined) continue;
      const here = sectionOf.get(n.id)!;
      const from = feedSection.get(carrier);
      if (from === undefined || from === here) continue;
      const load = n.load ?? 1;
      imported.set(here, (imported.get(here) ?? 0) + load);
      exported.set(from, (exported.get(from) ?? 0) + load);
    }
    for (const s of sections) {
      let cap: number | null = 0; // null = no limit
      let declared = 0;
      let touches = false;
      for (const l of check.links ?? []) {
        const stub = l.sides[s.id];
        if (stub === undefined) continue;
        touches = true;
        if (typeof stub === "object" && "feed" in stub) cap = cap === null || stub.feed.capacity === null ? null : cap + stub.feed.capacity;
        else if (typeof stub === "object") declared += stub.lamp.load;
      }
      if (!touches) continue;
      const imp = imported.get(s.id) ?? 0;
      const exp = exported.get(s.id) ?? 0;
      if (cap !== null && imp > cap)
        problems.push(`section ${s.id}: the intended solution draws ${imp} load from other sections' feeds, but its feed stubs promise only ${cap}`);
      if (exp > declared)
        problems.push(`section ${s.id}: the intended solution sends ${exp} load to other sections, but its lamp stubs declare only ${declared}`);
      else if (exp < declared)
        notes.push(`section ${s.id}: its lamp stubs declare ${declared} load but the intended solution sends ${exp} (fine if the rest passes through to a third section)`);
    }
  }

  for (const r of rows) {
    if (r.errors.length) problems.push(...r.errors.map((e) => `section ${r.id}: ${e}`));
    if (r.analysis && r.analysis.exhaustive && !r.analysis.solvable) problems.push(`section ${r.id}: cannot be won on its own with its stubs (every state searched)`);
    if (r.analysis && !r.analysis.exhaustive) notes.push(`section ${r.id}: the search hit the state cap (${r.analysis.cap}); numbers are not exact`);
    if (r.projection && !r.projection.complete)
      problems.push(`section ${r.id}: its share of the intended solution [${r.projection.moves.join(", ")}] does not win it on its own${r.projection.failure ? `: ${r.projection.failure}` : ""}`);
  }

  const searched = rows.filter((r) => r.analysis);
  const sumMinClicks = searched.length > 0 && searched.every((r) => r.analysis!.minClicks !== null)
    ? searched.reduce((t, r) => t + r.analysis!.minClicks!, 0)
    : null;
  if (sumMinClicks !== null && full.solution.complete && full.solution.clicks < sumMinClicks)
    notes.push(`the solution takes ${full.solution.clicks} clicks, fewer than the sections' minimums add up to (${sumMinClicks}): a shortcut across sections, or a stub stricter than the real link`);

  return { ok: problems.length === 0, problems, notes, full, sections: rows, sumMinClicks, solutionClicks: full.solution.clicks };
}

function pad(s: string, w: number): string { return s.length >= w ? s : s + " ".repeat(w - s.length); }

/** The printable report: the lines the CLI shows. Deterministic. */
export function formatSections(id: string, r: SectionsReport): string[] {
  const out: string[] = [`${r.ok ? "PASS" : "FAIL"} ${id}: ${r.sections.length} sections`];
  const head = ["section", "nodes", "search", "states", "solvable", "min clicks", "configs", "dead", "blows", "its share of the solution"];
  const rows: string[][] = [head];
  for (const s of r.sections) {
    const a = s.analysis;
    if (!a) { rows.push([s.id, String(s.nodes), "-", "-", "-", "-", "-", "-", "-", s.skipped ?? "-"]); continue; }
    rows.push([
      s.id,
      String(s.nodes),
      a.exhaustive ? "exhaustive" : `capped (no win < ${a.noWinBelow})`,
      String(a.states) + (a.exhaustive ? "" : "+"),
      a.solvable ? "yes" : "NO",
      a.minClicks !== null ? String(a.minClicks) : a.bestKnown !== null ? `<=${a.bestKnown}` : "-",
      String(a.winningConfigs),
      a.deadShare === null ? "-" : `${(a.deadShare * 100).toFixed(1)}%`,
      a.blowOnShortestWin.length ? a.blowOnShortestWin.join(",") : "none",
      s.projection ? (s.projection.complete ? `wins in ${s.projection.clicks} click${s.projection.clicks === 1 ? "" : "s"}` : "DOES NOT WIN") : "-",
    ]);
  }
  const widths = head.map((_, c) => Math.max(...rows.map((row) => row[c]!.length)));
  for (const row of rows) out.push("  " + row.map((cell, c) => pad(cell, widths[c]!)).join("  ").trimEnd());
  for (const s of r.sections) {
    const a = s.analysis;
    if (a?.win) {
      out.push(`  ${s.id}: one shortest win: ${a.win.moves.join(", ") || "(none needed)"}`);
      for (const f of a.win.feeds) out.push(`    ${f.id}: load ${f.load} of ${f.capacity ?? "no limit"}`);
    }
    if (a && a.deadFirstMoves && a.deadFirstMoves.length) out.push(`  ${s.id}: first moves that lead only to dead ends: ${a.deadFirstMoves.join(", ")}`);
    for (const w of s.warnings) out.push(`  ${s.id}: note: ${w}`);
    if (s.skipped) out.push(`  ${s.id}: skipped: ${s.skipped}`);
  }
  out.push(`  full-map replay of the check block: ${r.full.ok ? "passes" : "FAILS"} (${r.solutionClicks} clicks${r.sumMinClicks !== null ? `; the sections' minimums add up to ${r.sumMinClicks}` : ""})`);
  for (const n of r.notes) out.push(`  note: ${n}`);
  for (const p of r.problems) out.push(`  PROBLEM: ${p}`);
  out.push("  not proved: that there is no shortcut across sections (use the whole-map lower bound: npm run analyze puzzles/<id>.json)");
  return out;
}
