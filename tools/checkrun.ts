/**
 * Replay a design note's check block on the real simulator (ticket 027 D1).
 * Pure (no file access): `tools/check.ts` reads the files; this takes a puzzle and a validated block.
 *
 * Time rules (puzzles/SCHEMA.md, "Design checks"): every click, repair or release is followed by
 * `clickSeconds` (default 1) of game time; `wait:N` advances N and nothing else; `undo` adds none.
 */

import { CHECK_CLICK_SECONDS, EventBus, parseCheckMove } from "../src/core";
import type { CheckExpect, CheckMove, Part, Puzzle, PuzzleCheck } from "../src/core";
import { createGrid } from "../src/grid";
import type { Grid, GridState } from "../src/grid";

export interface MoveFailure {
  /** Zero-based index into the move list that was running. */
  index: number;
  move: string;
  message: string;
}

export interface FeedLine { id: string; load: number; capacity: number | null }

export interface SolutionReport {
  complete: boolean;
  /** Moves played that were not `wait:` (clicks, repairs, releases, undos). */
  clicks: number;
  partsUsed: Part[];
  feeds: FeedLine[];
  /** Set when a move was refused or the job was not complete at the end. */
  failure?: string;
}

export interface TrapReport {
  name: string;
  expectHeld: boolean;
  /** One line per `expect` key that did not hold. */
  mismatches: string[];
  recovered: boolean;
  failure?: string;
}

export interface CheckReport {
  ok: boolean;
  solution: SolutionReport;
  traps: TrapReport[];
}

interface Run {
  grid: Grid;
  puzzle: Puzzle;
  clickSeconds: number;
  /** Fuseboxes that gained a blown fault since this was last cleared. */
  blown: Set<string>;
  clicks: number;
}

function newRun(puzzle: Puzzle, clickSeconds: number): Run {
  const bus = new EventBus();
  const blown = new Set<string>();
  bus.on("fuse:blown", (e) => blown.add(e.nodeId));
  return { grid: createGrid(puzzle, bus), puzzle, clickSeconds, blown, clicks: 0 };
}

/** Play moves in order. Stops at the first refused move and returns it. */
function play(run: Run, moves: readonly CheckMove[]): MoveFailure | null {
  const nodeType = new Map(run.puzzle.nodes.map((n) => [n.id, n.type]));
  for (const [index, move] of moves.entries()) {
    const fail = (message: string): MoveFailure => ({ index, move, message: `move ${index + 1} "${move}": ${message}` });
    const p = parseCheckMove(move);
    if (!p) return fail("not a move");
    if (p.kind === "wait") { run.grid.advance(p.seconds); continue; }
    if (p.kind === "undo") {
      if (!run.grid.undo()) return fail("nothing to undo (or the job is already complete)");
      run.clicks++;
      continue;
    }
    if (p.kind === "repair") {
      const r = run.grid.repairAt(p.id);
      if (!r.ok) {
        const why =
          r.reason === "no-fault" ? `no fault at ${p.id} now (already mended, or the job is complete)`
          : r.reason === "unreadable" ? `the fault at ${p.id} is not readable (no current reaches it)`
          : `needs ${r.needs?.count} ${r.needs?.part}, have ${r.needs?.have}`;
        return fail(why);
      }
    } else {
      const t = nodeType.get(p.id);
      const ok =
        p.kind === "release" || t === "battery" ? run.grid.release(p.id)
        : t === "breaker" ? run.grid.throwBreaker(p.id)
        : t === "switch" ? run.grid.throwSwitch(p.id)
        : false;
      if (!ok) return fail(`${p.id} (${t ?? "unknown"}) was refused (a held relay, a spring or battery that can not act now, or the job is already complete)`);
    }
    run.clicks++;
    run.grid.advance(run.clickSeconds);
  }
  return null;
}

function partsUsed(puzzle: Puzzle, s: GridState): Part[] {
  const left = [...s.parts];
  const used: Part[] = [];
  for (const p of puzzle.startingParts ?? []) {
    const i = left.indexOf(p);
    if (i >= 0) left.splice(i, 1);
    else used.push(p);
  }
  return used;
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

function mismatches(run: Run, e: CheckExpect): string[] {
  const s = run.grid.state();
  const out: string[] = [];
  if (e.blown !== undefined) {
    const want = [...e.blown].sort();
    const got = [...run.blown].sort();
    if (!same(want, got)) out.push(`blown: expected [${want.join(", ")}], got [${got.join(", ")}]`);
  }
  if (e.brownout !== undefined && s.brownout !== e.brownout) out.push(`brownout: expected ${e.brownout}, got ${s.brownout}`);
  if (e.readable !== undefined) {
    const miss = e.readable.filter((id) => !s.readableFaults.has(id));
    if (miss.length) out.push(`readable: [${miss.join(", ")}] not readable (readable now: [${[...s.readableFaults].join(", ")}])`);
  }
  if (e.lit !== undefined) {
    const miss = e.lit.filter((id) => !s.lit.has(id));
    if (miss.length) out.push(`lit: [${miss.join(", ")}] not lit (lit now: [${[...s.lit].join(", ")}])`);
  }
  if (e.complete === false && s.complete) out.push("complete: expected the job not to be complete, but it is");
  return out;
}

function describe(s: GridState): string {
  const loads = [...s.feeds].map(([id, f]) => `${id} ${f.load}/${f.capacity ?? "-"}`).join(", ");
  return `lit [${[...s.lit].join(", ")}], ${loads}${s.brownout ? ", BROWNOUT" : ""}`;
}

/** Replay a validated check block. Never throws on a failing block; the report says what failed. */
export function runCheck(puzzle: Puzzle, check: PuzzleCheck): CheckReport {
  const clickSeconds = check.clickSeconds ?? CHECK_CLICK_SECONDS;

  const sRun = newRun(puzzle, clickSeconds);
  const sFail = play(sRun, check.solution);
  const ss = sRun.grid.state();
  const solution: SolutionReport = {
    complete: ss.complete,
    clicks: sRun.clicks,
    partsUsed: partsUsed(puzzle, ss),
    feeds: [...ss.feeds].map(([id, f]) => ({ id, load: f.load, capacity: f.capacity })),
  };
  if (sFail) solution.failure = sFail.message;
  else if (!ss.complete) {
    const last = check.solution[check.solution.length - 1];
    solution.failure = `the solution does not complete the job after ${check.solution.length} moves${last ? ` (last: "${last}")` : ""}; ${describe(ss)}`;
  }

  const traps: TrapReport[] = [];
  for (const t of check.traps ?? []) {
    const run = newRun(puzzle, clickSeconds);
    const r: TrapReport = { name: t.name, expectHeld: false, mismatches: [], recovered: false };
    const mf = play(run, t.moves);
    if (mf) { r.failure = `trap moves: ${mf.message}`; traps.push(r); continue; }
    r.mismatches = mismatches(run, t.expect);
    r.expectHeld = r.mismatches.length === 0;
    if (t.recover.length === 0 && run.grid.state().complete) r.recovered = true; // already wins; nothing to play
    else {
      const rf = play(run, t.recover);
      if (rf) r.failure = `recovery: ${rf.message}`;
      else if (!run.grid.state().complete)
        r.failure = `recovery does not complete the job after ${t.recover.length} moves; ${describe(run.grid.state())}`;
      else r.recovered = true;
    }
    traps.push(r);
  }

  const ok = solution.complete && !solution.failure && traps.every((t) => t.expectHeld && t.recovered && !t.failure);
  return { ok, solution, traps };
}

/** A comparable snapshot of a state, for finding where two move lists part. */
function signature(s: GridState): string {
  const m = (x: ReadonlyMap<string, unknown>) => [...x].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${String(v)}`).join(",");
  return [
    m(s.breakers), m(s.switches),
    s.faults.map((f) => f.id).sort().join(","),
    [...s.parts].sort().join(","),
    [...s.lit].sort().join(","),
    s.brownout, s.complete,
  ].join("|");
}

/**
 * Play two move lists from the start and name the first move (1-based) after which their states differ,
 * or null if they agree throughout (the shorter one is compared as far as it goes).
 */
export function firstDifference(puzzle: Puzzle, expected: readonly CheckMove[], actual: readonly CheckMove[], clickSeconds = CHECK_CLICK_SECONDS): { move: number; expected: string | undefined; actual: string | undefined } | null {
  const a = newRun(puzzle, clickSeconds);
  const b = newRun(puzzle, clickSeconds);
  for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
    if (i < expected.length) play(a, [expected[i]!]);
    if (i < actual.length) play(b, [actual[i]!]);
    if (signature(a.grid.state()) !== signature(b.grid.state()))
      return { move: i + 1, expected: expected[i], actual: actual[i] };
  }
  return null;
}

/** The printable report: the lines the CLI shows. */
export function formatReport(id: string, r: CheckReport, startingParts: readonly Part[] = []): string[] {
  const out: string[] = [`${r.ok ? "PASS" : "FAIL"} ${id}`];
  const s = r.solution;
  out.push(`  solution: ${s.complete ? "complete" : "NOT complete"}, ${s.clicks} clicks, parts used ${s.partsUsed.length ? s.partsUsed.join(", ") : "none"} of [${startingParts.join(", ")}]`);
  for (const f of s.feeds) out.push(`    ${f.id}: load ${f.load} of ${f.capacity ?? "no limit"}`);
  if (s.failure) out.push(`    ${s.failure}`);
  for (const t of r.traps) {
    out.push(`  trap "${t.name}": expect ${t.expectHeld ? "held" : "FAILED"}, recovery ${t.recovered ? "wins" : "FAILED"}`);
    for (const m of t.mismatches) out.push(`    ${m}`);
    if (t.failure) out.push(`    ${t.failure}`);
  }
  return out;
}
