/**
 * Design checks (ticket 027 part 0). A design note (`puzzles/<id>.md`) may hold one fenced block tagged `check`
 * with JSON in it: the intended solution, every trap with its recovery, and optionally the sections and links of a
 * large map. `npm run check` (027 D1) replays it on the real simulator; `npm run analyze -- --sections` (027 D3)
 * builds one sub-puzzle per section from it. See puzzles/SCHEMA.md, "Design checks (ticket 027)".
 *
 * Types, the block parser and the validator only. Replaying is tools/ (D1), not here.
 */

import type { GridNode, Part, Puzzle } from "./schema";

/** "br_1" throws a breaker or switch (a battery id releases it); "repair:<node or line id>"; "release:<battery>"; "wait:<seconds>"; "undo". */
export type CheckMove = string;

/** What must hold after a trap's moves. At least one key. */
export interface CheckExpect {
  /** Fuseboxes that gained a blown fault during the trap's moves. */
  blown?: readonly string[];
  brownout?: boolean;
  /** Fault ids readable after the moves: a file fault id, or `blown-<fusebox>` for a fuse that blew in play. */
  readable?: readonly string[];
  /** Lamps lit after the moves. */
  lit?: readonly string[];
  /** The job is not complete after the moves. */
  complete?: false;
}

export interface CheckTrap {
  name: string;
  moves: readonly CheckMove[];
  expect: CheckExpect;
  /** Moves from the trap's end state that still win. Required (may be empty only if the trap state already wins, which a check run reports). */
  recover: readonly CheckMove[];
}

export interface CheckSection {
  id: string;
  nodes: readonly string[];
  /** This section's share of `startingParts`. Absent = none. All sections' parts add up to `startingParts` as multisets. */
  parts?: readonly Part[];
}

/** What a section sees in place of a link line, when it is analysed on its own (D3). */
export type CheckStub =
  | { feed: { capacity: number | null } }
  | { lamp: { load: number; must?: boolean } }
  | "cut";

/** A line joining two sections. `sides` maps each of the two section ids it joins to the stub seen from that section. */
export interface CheckLink {
  line: string;
  sides: Readonly<Record<string, CheckStub>>;
}

export interface PuzzleCheck {
  /** Seconds that pass after each click (not after `wait:`). Default `CHECK_CLICK_SECONDS`. */
  clickSeconds?: number;
  solution: readonly CheckMove[];
  traps?: readonly CheckTrap[];
  sections?: readonly CheckSection[];
  links?: readonly CheckLink[];
}

/** The default for `clickSeconds`: the convention every design note uses. */
export const CHECK_CLICK_SECONDS = 1;

/** A move, parsed. `click` on a breaker or switch throws it; on a battery it releases (or stops) it, as `release` does. */
export type ParsedCheckMove =
  | { kind: "click"; id: string }
  | { kind: "repair"; id: string }
  | { kind: "release"; id: string }
  | { kind: "wait"; seconds: number }
  | { kind: "undo" };

/**
 * Parse one move's syntax, without looking at the puzzle. Returns null for a move that isn't one of the five forms
 * (`wait:` must carry a positive finite number; ids must be non-empty).
 */
export function parseCheckMove(move: string): ParsedCheckMove | null {
  if (move === "undo") return { kind: "undo" };
  const colon = move.indexOf(":");
  if (colon < 0) return move.length > 0 && !/\s/.test(move) ? { kind: "click", id: move } : null;
  const verb = move.slice(0, colon);
  const arg = move.slice(colon + 1);
  if (verb === "wait") {
    const s = arg.trim() === "" ? NaN : Number(arg);
    return Number.isFinite(s) && s > 0 ? { kind: "wait", seconds: s } : null;
  }
  if (arg.length === 0 || /\s/.test(arg)) return null;
  if (verb === "repair") return { kind: "repair", id: arg };
  if (verb === "release") return { kind: "release", id: arg };
  return null;
}

/**
 * The first fenced code block whose info string's first word is `check` (``` or ~~~ fences, CommonMark-style:
 * the closing fence uses the same character, at least as long). Returns null when the note has none,
 * `{ ok: false }` when the block is unterminated or isn't valid JSON, else the parsed JSON (not yet validated).
 */
export function parseCheckBlock(md: string): { ok: true; json: unknown } | { ok: false; error: string } | null {
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const open = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)/.exec(lines[i]!);
    if (!open) continue;
    const fence = open[1]!;
    const tag = open[2]!;
    // Find this block's closing fence, whatever its tag, so a non-check block's body is never read as a fence.
    let close = -1;
    for (let j = i + 1; j < lines.length; j++) {
      const m = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(lines[j]!);
      if (m && m[1]![0] === fence[0] && m[1]!.length >= fence.length) { close = j; break; }
    }
    if (tag !== "check") {
      if (close < 0) return null; // an unterminated non-check block runs to the end: no check block after it
      i = close;
      continue;
    }
    if (close < 0) return { ok: false, error: `check block opened on line ${i + 1} is never closed` };
    const body = lines.slice(i + 1, close).join("\n");
    try {
      return { ok: true, json: JSON.parse(body) as unknown };
    } catch (e) {
      return { ok: false, error: `check block on line ${i + 1} is not valid JSON: ${(e as Error).message}` };
    }
  }
  return null;
}

const PARTS: readonly Part[] = ["bulb", "fuse", "wire"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Check a parsed check block against its puzzle (which must already be valid). Never throws; returns every problem.
 * Rules (see puzzles/SCHEMA.md): a click names a breaker, switch or battery; `release:` names a battery; `repair:`
 * names the `at` of a file fault or a fusebox with a rating (a fuse that can blow in play); `wait:` is positive.
 * Sections, if given, partition the nodes; every line between two sections is a link; each link declares a stub
 * for exactly the two sections it joins; the sections' parts add up to `startingParts`.
 */
export function validateCheck(json: unknown, puzzle: Puzzle): { ok: true; check: PuzzleCheck } | { ok: false; errors: readonly string[] } {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  if (!isObj(json)) return { ok: false, errors: ["check block must be a JSON object"] };
  const c = json;

  const nodeById = new Map<string, GridNode>(puzzle.nodes.map((n) => [n.id, n]));
  const lineById = new Map(puzzle.lines.map((l) => [l.id, l]));
  const faultAt = new Set(puzzle.faults.map((f) => f.at));
  const faultIds = new Set(puzzle.faults.map((f) => f.id));
  const canBlow = (id: string) => {
    const n = nodeById.get(id);
    return n?.type === "fusebox" && n.rating !== undefined;
  };

  for (const k of Object.keys(c))
    if (!["clickSeconds", "solution", "traps", "sections", "links"].includes(k)) err(`unknown key "${k}"`);
  if (c["clickSeconds"] !== undefined && !(isNum(c["clickSeconds"]) && c["clickSeconds"] >= 0))
    err("clickSeconds must be a number ≥ 0");

  const checkMoves = (where: string, raw: unknown): void => {
    if (!Array.isArray(raw)) { err(`${where} must be a list of moves`); return; }
    for (const [i, m] of raw.entries()) {
      const at = `${where}[${i}]`;
      if (typeof m !== "string") { err(`${at}: a move must be a string`); continue; }
      const p = parseCheckMove(m);
      if (!p) {
        if (m.startsWith("wait:")) err(`${at}: "${m}": wait needs a positive number of seconds`);
        else err(`${at}: "${m}" is not a move (an id, repair:<id>, release:<battery>, wait:<seconds> or undo)`);
        continue;
      }
      if (p.kind === "click") {
        const n = nodeById.get(p.id);
        if (!n) err(`${at}: "${p.id}" is not a node`);
        else if (n.type !== "breaker" && n.type !== "switch" && n.type !== "battery")
          err(`${at}: ${p.id} is a ${n.type}; a move clicks a breaker, switch or battery`);
      } else if (p.kind === "release") {
        const n = nodeById.get(p.id);
        if (n?.type !== "battery") err(`${at}: release:${p.id}: ${p.id} is not a battery`);
      } else if (p.kind === "repair") {
        if (!faultAt.has(p.id) && !canBlow(p.id))
          err(`${at}: repair:${p.id}: ${p.id} has no fault (and is not a fusebox that can blow)`);
      }
    }
  };

  checkMoves("solution", c["solution"]);

  // ---- traps ----
  if (c["traps"] !== undefined) {
    if (!Array.isArray(c["traps"])) err("traps must be a list");
    else {
      const names = new Set<string>();
      for (const [i, t] of c["traps"].entries()) {
        if (!isObj(t)) { err(`traps[${i}] must be an object`); continue; }
        const label = isStr(t["name"]) ? `trap "${t["name"]}"` : `traps[${i}]`;
        if (!isStr(t["name"])) err(`traps[${i}]: name must be a non-empty string`);
        else if (names.has(t["name"])) err(`${label}: duplicate trap name`);
        else names.add(t["name"]);
        checkMoves(`${label} moves`, t["moves"]);
        if (t["recover"] === undefined) err(`${label}: recover is required (the moves that still win from the trap)`);
        else checkMoves(`${label} recover`, t["recover"]);
        const e = t["expect"];
        if (!isObj(e)) { err(`${label}: expect must be an object`); continue; }
        const keys = Object.keys(e);
        if (keys.length === 0) err(`${label}: expect must name at least one of blown, brownout, readable, lit, complete`);
        for (const k of keys)
          if (!["blown", "brownout", "readable", "lit", "complete"].includes(k)) err(`${label}: expect has unknown key "${k}"`);
        if (e["brownout"] !== undefined && typeof e["brownout"] !== "boolean") err(`${label}: expect.brownout must be true or false`);
        if (e["complete"] !== undefined && e["complete"] !== false) err(`${label}: expect.complete can only be false`);
        const ids = (k: string, ok: (id: string) => boolean, what: string) => {
          const v = e[k];
          if (v === undefined) return;
          if (!Array.isArray(v) || !v.every(isStr)) { err(`${label}: expect.${k} must be a list of ids`); return; }
          for (const id of v) if (!ok(id)) err(`${label}: expect.${k}: ${id} is not ${what}`);
        };
        ids("blown", canBlow, "a fusebox with a rating");
        ids("lit", (id) => nodeById.get(id)?.type === "lamp", "a lamp");
        ids("readable", (id) => faultIds.has(id) || (id.startsWith("blown-") && canBlow(id.slice(6))),
          "a fault id (a file fault, or blown-<fusebox> for a fuse that can blow)");
      }
    }
  }

  // ---- sections ----
  const sectionOf = new Map<string, string>();
  const sectionIds = new Set<string>();
  const hasSections = c["sections"] !== undefined;
  if (hasSections) {
    if (!Array.isArray(c["sections"]) || c["sections"].length === 0) err("sections must be a non-empty list");
    else {
      const shares: string[] = [];
      for (const [i, s] of c["sections"].entries()) {
        if (!isObj(s) || !isStr(s["id"])) { err(`sections[${i}] needs an id`); continue; }
        const sid = s["id"];
        if (sectionIds.has(sid)) err(`duplicate section id ${sid}`);
        sectionIds.add(sid);
        if (!Array.isArray(s["nodes"]) || !s["nodes"].every(isStr)) { err(`section ${sid}: nodes must be a list of node ids`); continue; }
        const seen = new Set<string>();
        for (const id of s["nodes"]) {
          if (!nodeById.has(id)) { err(`section ${sid}: "${id}" is not a node`); continue; }
          if (seen.has(id)) { err(`section ${sid}: lists ${id} twice`); continue; }
          seen.add(id);
          const other = sectionOf.get(id);
          if (other !== undefined) err(`node ${id} is in two sections: ${other} and ${sid}`);
          else sectionOf.set(id, sid);
        }
        if (s["parts"] !== undefined) {
          if (!Array.isArray(s["parts"]) || !s["parts"].every((x) => PARTS.includes(x as Part)))
            err(`section ${sid}: parts must be a list of bulb | fuse | wire`);
          else shares.push(...(s["parts"] as string[]));
        }
      }
      const missing = puzzle.nodes.filter((n) => !sectionOf.has(n.id)).map((n) => n.id);
      if (missing.length) err(`sections don't cover every node; missing: ${missing.join(", ")}`);
      const want = [...(puzzle.startingParts ?? [])].sort().join(",");
      const got = shares.sort().join(",");
      if (want !== got)
        err(`the sections' parts [${got.replace(/,/g, ", ")}] don't add up to startingParts [${want.replace(/,/g, ", ")}]`);
    }
  }

  // ---- links ----
  const linked = new Set<string>();
  if (c["links"] !== undefined) {
    if (!hasSections) err("links need sections");
    if (!Array.isArray(c["links"])) err("links must be a list");
    else for (const [i, k] of c["links"].entries()) {
      if (!isObj(k) || !isStr(k["line"])) { err(`links[${i}] needs a line`); continue; }
      const lid = k["line"];
      const line = lineById.get(lid);
      if (!line) { err(`link ${lid}: not a line`); continue; }
      if (linked.has(lid)) err(`link ${lid}: listed twice`);
      linked.add(lid);
      const a = sectionOf.get(line.from);
      const b = sectionOf.get(line.to);
      if (hasSections && (a === undefined || b === undefined || a === b)) {
        err(`link ${lid}: doesn't join two different sections (${line.from} in ${a ?? "none"}, ${line.to} in ${b ?? "none"})`);
        continue;
      }
      const sides = k["sides"];
      if (!isObj(sides)) { err(`link ${lid}: sides must map each of its two sections to a stub`); continue; }
      for (const [sid, stub] of Object.entries(sides)) {
        if (sid !== a && sid !== b) { err(`link ${lid}: has a stub for section ${sid}, a side it doesn't touch (it joins ${a} and ${b})`); continue; }
        const bad = stubError(stub);
        if (bad) err(`link ${lid}, side ${sid}: ${bad}`);
      }
      for (const sid of [a, b]) if (sid !== undefined && !(sid in sides)) err(`link ${lid}: no stub for section ${sid}`);
    }
  }
  if (hasSections && sectionOf.size > 0) {
    for (const l of puzzle.lines) {
      const a = sectionOf.get(l.from);
      const b = sectionOf.get(l.to);
      if (a !== undefined && b !== undefined && a !== b && !linked.has(l.id))
        err(`line ${l.id} joins sections ${a} and ${b} but is not a link`);
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, check: c as unknown as PuzzleCheck };
}

function stubError(stub: unknown): string | null {
  if (stub === "cut") return null;
  if (!isObj(stub) || Object.keys(stub).length !== 1) return 'a stub is "cut", { "feed": { "capacity" } } or { "lamp": { "load" } }';
  if (isObj(stub["feed"])) {
    const cap = stub["feed"]["capacity"];
    return cap === null || (isNum(cap) && cap > 0) ? null : "feed stub capacity must be null or a positive number";
  }
  if (isObj(stub["lamp"])) {
    const { load, must } = stub["lamp"];
    if (!(isNum(load) && load > 0)) return "lamp stub load must be a positive number";
    if (must !== undefined && typeof must !== "boolean") return "lamp stub must must be true or false";
    return null;
  }
  return 'a stub is "cut", { "feed": { "capacity" } } or { "lamp": { "load" } }';
}
