/**
 * Loader and validator for puzzle files (schema draft 5).
 * `validatePuzzle` never throws; it returns every problem it finds so the editor can show them.
 * `loadPuzzle` throws on the first invalid file, for code that wants a Puzzle or nothing.
 * `validateCityPuzzle` / `loadCityPuzzle` do the same for a city puzzle (`puzzles/city/<id>.city.json`, ticket 081 C1), for its shape only.
 * Whether its places, spans, drops and leads exist on the city, and whether its runs join up, is the conversion's (081 K2c, `src/city/circuit/`).
 */

import type { CityPuzzle } from "./citycircuit";
import { FAULT_RULES, type FaultKind, type GridNode, type NodeType, type Part, type Puzzle, type Vec2 } from "./schema";
import { powersourceName } from "./words";

export type ValidationResult = { ok: true; puzzle: Puzzle } | { ok: false; errors: readonly string[] };

const NODE_TYPES: readonly NodeType[] = ["feed", "breaker", "switch", "fusebox", "junction", "lamp", "battery"];
const FAULT_KINDS: readonly FaultKind[] = ["dead-lamp", "blown-fuse", "damaged-cable", "dead-junction"];
const PARTS: readonly Part[] = ["bulb", "fuse", "wire"];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isVec2 = (v: unknown): v is Vec2 => Array.isArray(v) && v.length === 2 && v.every(isNum);

export function validatePuzzle(json: unknown): ValidationResult {
  const errors = checkPuzzle(json, false);
  if (errors.length) return { ok: false, errors };
  return { ok: true, puzzle: json as Puzzle };
}

export function loadPuzzle(json: unknown): Puzzle {
  const r = validatePuzzle(json);
  if (!r.ok) throw new Error(`invalid puzzle:\n  ${r.errors.join("\n  ")}`);
  return r.puzzle;
}

export type CityValidationResult = { ok: true; puzzle: CityPuzzle } | { ok: false; errors: readonly string[] };

/**
 * A city puzzle's shape (081 C1): everything `validatePuzzle` checks that needs no `pos`, plus `city`, `district`, each node's `place`, each line's `run`
 * and each fault's `span`. Never throws; returns every problem, one message each.
 */
export function validateCityPuzzle(json: unknown): CityValidationResult {
  const errors = checkPuzzle(json, true);
  if (errors.length) return { ok: false, errors };
  return { ok: true, puzzle: json as CityPuzzle };
}

export function loadCityPuzzle(json: unknown): CityPuzzle {
  const r = validateCityPuzzle(json);
  if (!r.ok) throw new Error(`invalid city puzzle:\n  ${r.errors.join("\n  ")}`);
  return r.puzzle;
}

/** The fields a city puzzle leaves out (`CityPuzzle`): the street layer's, and `decor`, which is drawn by `pos`. */
const NOT_CITY = ["start", "night", "satchel", "favor", "lampReach", "salvage", "stores", "decor"] as const;
const PLACE_KINDS = ["pole", "building", "post"] as const;
const isInt = (v: unknown, min: number): v is number => isNum(v) && Number.isInteger(v) && v >= min;

/** Every problem with a schematic puzzle (`city` false) or a city puzzle (`city` true). */
function checkPuzzle(json: unknown, city: boolean): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);

  if (!isObj(json)) return ["puzzle must be an object"];
  const p = json;

  // ---- top level ----
  if (!isStr(p["id"])) err("id must be a non-empty string");
  if (!isStr(p["name"])) err("name must be a non-empty string");
  if (p["version"] !== 3 && p["version"] !== 4 && p["version"] !== 5) err("version must be 3, 4 or 5");
  const v5 = p["version"] === 5;
  const street = !city && p["scope"] === "street";
  if (city) {
    if (p["scope"] !== "map") err('scope must be "map" (a city puzzle is map scope only)');
    for (const k of NOT_CITY) if (p[k] !== undefined) err(`${k} is not part of a city puzzle`);
  } else if (p["scope"] !== "map" && !street) err('scope must be "map" or "street"');
  if (!(p["capacity"] === null || (isNum(p["capacity"]) && p["capacity"] > 0))) err("capacity must be null or a positive number");
  if (p["startingParts"] !== undefined) {
    if (!Array.isArray(p["startingParts"]) || !p["startingParts"].every((x) => PARTS.includes(x as Part)))
      err("startingParts must be a list of bulb | fuse | wire");
    else if (isNum(p["satchel"]) && p["startingParts"].length > p["satchel"]) err("startingParts exceed the satchel");
  }
  for (const k of ["target", "priority"]) {
    if (p[k] !== undefined && (!Array.isArray(p[k]) || !(p[k] as unknown[]).every(isStr))) err(`${k} must be a list of lamp ids`);
  }
  if (street) {
    if (!isVec2(p["start"])) err("street: start must be [x, y]");
    if (!isObj(p["night"]) || !isNum(p["night"]["minutes"]) || p["night"]["minutes"] <= 0) err("street: night.minutes must be > 0");
    if (!isNum(p["satchel"]) || p["satchel"] < 1 || !Number.isInteger(p["satchel"])) err("street: satchel must be a positive integer");
    const favor = p["favor"];
    if (!isObj(favor) || !["start", "draw", "offer", "reward"].every((k) => isNum(favor[k]) && (favor[k] as number) >= 0))
      err("street: favor needs numeric start, draw, offer, reward");
  }
  if (city) {
    const c = p["city"];
    if (!isObj(c)) err("city must be { blocksX, blocksZ, seed, oneWay }");
    else {
      for (const k of ["blocksX", "blocksZ"]) if (!isInt(c[k], 1)) err(`city.${k} must be a positive integer`);
      if (!isInt(c["seed"], 0)) err("city.seed must be a non-negative integer");
      if (typeof c["oneWay"] !== "boolean") err("city.oneWay must be true or false");
    }
    const d = p["district"];
    if (!Array.isArray(d) || d.length < 1 || d.length > 4 || !d.every(isStr)) err("district must be 1 to 4 block ids");
    else if (new Set(d).size !== d.length) err("district: a block id is listed twice");
    if (p["from"] !== undefined && !isStr(p["from"])) err("from must be a schematic puzzle id");
  }
  if (p["lampReach"] !== undefined && (!isNum(p["lampReach"]) || p["lampReach"] < 0)) err("lampReach must be a non-negative number");

  // ---- nodes ----
  const nodes = Array.isArray(p["nodes"]) ? p["nodes"] : (err("nodes must be a list"), []);
  const nodeById = new Map<string, GridNode>();
  const feedNodes: Record<string, unknown>[] = [];
  for (const [i, raw] of nodes.entries()) {
    if (!isObj(raw) || !isStr(raw["id"])) { err(`nodes[${i}] needs an id`); continue; }
    const id = raw["id"];
    if (nodeById.has(id)) err(`duplicate node id ${id}`);
    if (!NODE_TYPES.includes(raw["type"] as NodeType)) err(`node ${id}: unknown type ${String(raw["type"])}`);
    if (!city) {
      if (!isVec2(raw["pos"])) err(`node ${id}: pos must be [x, y]`);
    } else {
      if (raw["pos"] !== undefined) err(`node ${id}: a city node has a place, not a pos`);
      const place = raw["place"];
      const kind = isObj(place) && Object.keys(place).length === 1 ? PLACE_KINDS.find((k) => k in place) : undefined;
      if (!isObj(place) || kind === undefined || !isStr(place[kind]))
        err(`node ${id}: place must be exactly one of { pole }, { building }, { post }, naming an id`);
    }
    switch (raw["type"]) {
      case "feed":
        feedNodes.push(raw);
        if (raw["capacity"] !== undefined) {
          if (!v5) err(`feed ${id}: a feed's own capacity needs version 5`);
          if (!(raw["capacity"] === null || (isNum(raw["capacity"]) && raw["capacity"] > 0))) err(`feed ${id}: capacity must be null or a positive number`);
        }
        if (raw["name"] !== undefined) {
          if (!v5) err(`feed ${id}: a feed name needs version 5`);
          if (!isStr(raw["name"])) err(`feed ${id}: name must be a non-empty string`);
        }
        break;
      case "breaker": if (typeof raw["closed"] !== "boolean") err(`breaker ${id}: closed must be true or false`); break;
      case "switch":
        if (!Array.isArray(raw["outputs"]) || raw["outputs"].length !== 2 || !raw["outputs"].every(isStr)) err(`switch ${id}: outputs must be two line ids`);
        if (raw["selected"] !== 0 && raw["selected"] !== 1) err(`switch ${id}: selected must be 0 or 1`);
        if (raw["relay"] !== undefined && typeof raw["relay"] !== "boolean") err(`switch ${id}: relay must be true or false`);
        if (raw["spring"] !== undefined && typeof raw["spring"] !== "boolean") err(`switch ${id}: spring must be true or false`);
        break;
      case "battery":
        if (!isNum(raw["capacity"]) || raw["capacity"] <= 0) err(`battery ${id}: capacity must be > 0 (seconds of discharge)`);
        if (raw["charge"] !== undefined && (!isNum(raw["charge"]) || raw["charge"] < 0 || (isNum(raw["capacity"]) && raw["charge"] > raw["capacity"])))
          err(`battery ${id}: charge must be between 0 and capacity`);
        if (!isStr(raw["input"])) err(`battery ${id}: input must be the line id on the feed side`);
        break;
      case "fusebox": if (raw["rating"] !== undefined && (!isNum(raw["rating"]) || raw["rating"] <= 0)) err(`fusebox ${id}: rating must be > 0`); break;
      case "lamp": if (raw["load"] !== undefined && (!isNum(raw["load"]) || raw["load"] <= 0)) err(`lamp ${id}: load must be > 0`); break;
    }
    nodeById.set(id, raw as unknown as GridNode);
  }
  if (feedNodes.length === 0) err("at least one feed node is required (found 0)");
  if (feedNodes.length > 1) {
    if (!v5) err(`${feedNodes.length} feeds need version 5 (up to version 4, exactly one feed)`);
    for (const f of feedNodes)
      if (f["capacity"] === undefined) err(`feed ${String(f["id"])}: capacity is required when a map has two or more feeds (null = no limit)`);
    if (p["capacity"] !== null) err("capacity (top level) must be null when a map has two or more feeds; each feed has its own");
    const names = new Map<string, string>();
    for (const f of feedNodes) {
      if (!isStr(f["id"]) || (f["name"] !== undefined && !isStr(f["name"]))) continue;
      const shown = powersourceName(f["id"], f["name"] as string | undefined);
      const other = names.get(shown);
      if (other !== undefined) err(`feeds ${other} and ${f["id"]} would both be shown as "${shown}"; give them different names`);
      else names.set(shown, f["id"]);
    }
  }

  // ---- lines ----
  const lines = Array.isArray(p["lines"]) ? p["lines"] : (err("lines must be a list"), []);
  const lineIds = new Set<string>();
  const degree = new Map<string, number>();
  const linesFrom = new Map<string, Set<string>>();
  const runSpans = new Map<string, readonly unknown[]>();
  for (const [i, raw] of lines.entries()) {
    if (!isObj(raw) || !isStr(raw["id"])) { err(`lines[${i}] needs an id`); continue; }
    const id = raw["id"];
    if (lineIds.has(id) || nodeById.has(id)) err(`duplicate id ${id} (line ids must be unique and not clash with node ids)`);
    lineIds.add(id);
    for (const end of ["from", "to"] as const) {
      const n = raw[end];
      if (!isStr(n) || !nodeById.has(n)) err(`line ${id}: ${end} "${String(n)}" is not a node`);
      else degree.set(n, (degree.get(n) ?? 0) + 1);
    }
    if (isStr(raw["from"]) && raw["from"] === raw["to"]) err(`line ${id}: from and to are the same node`);
    if (isStr(raw["from"])) {
      let s = linesFrom.get(raw["from"]);
      if (!s) linesFrom.set(raw["from"], (s = new Set()));
      s.add(id);
    }
    if (raw["overhead"] !== undefined && typeof raw["overhead"] !== "boolean") err(`line ${id}: overhead must be true or false`);
    if (city) {
      const run = raw["run"];
      if (!isObj(run)) { err(`line ${id}: run must be { spans, drop?, lead? }`); continue; }
      const spans = run["spans"];
      if (!Array.isArray(spans) || !spans.every(isStr)) err(`line ${id}: run.spans must be a list of span ids`);
      else runSpans.set(id, spans);
      for (const k of ["drop", "lead"]) if (run[k] !== undefined && !isStr(run[k])) err(`line ${id}: run.${k} must be an id`);
      const ends = (run["drop"] !== undefined ? 1 : 0) + (run["lead"] !== undefined ? 1 : 0);
      if (ends > 1) err(`line ${id}: run has both a drop and a lead; it may have at most one`);
      if (Array.isArray(spans) && spans.length === 0 && ends === 0) err(`line ${id}: run.spans is empty, so it needs a drop or a lead`);
    }
  }
  for (const [id, n] of nodeById) {
    const d = degree.get(id) ?? 0;
    if (d === 0) err(`node ${id} is not connected to any line`);
    if (n.type === "lamp" && d !== 1) err(`lamp ${id} must be a leaf (exactly one line; has ${d})`);
    if (n.type === "switch") {
      for (const out of n.outputs) {
        if (!lineIds.has(out)) err(`switch ${id}: output ${out} is not a line`);
        else if (!linesFrom.get(id)?.has(out)) err(`switch ${id}: output line ${out} must start at the switch (from: ${id})`);
      }
    }
    if (n.type === "battery") {
      const input = lines.find((l) => isObj(l) && l["id"] === n.input) as Record<string, unknown> | undefined;
      if (!input) err(`battery ${id}: input ${n.input} is not a line`);
      else if (input["from"] !== id && input["to"] !== id) err(`battery ${id}: input line ${n.input} doesn't touch the battery`);
      if (d < 2) err(`battery ${id} needs its input line and at least one far-side line`);
    }
  }

  // ---- faults ----
  const faults = Array.isArray(p["faults"]) ? p["faults"] : (err("faults must be a list"), []);
  const faultIds = new Set<string>();
  const faultAt = new Set<string>();
  for (const [i, raw] of faults.entries()) {
    if (!isObj(raw) || !isStr(raw["id"])) { err(`faults[${i}] needs an id`); continue; }
    const id = raw["id"];
    if (faultIds.has(id)) err(`duplicate fault id ${id}`);
    faultIds.add(id);
    const kind = raw["kind"];
    if (!FAULT_KINDS.includes(kind as FaultKind)) { err(`fault ${id}: unknown kind ${String(kind)}`); continue; }
    const rule = FAULT_RULES[kind as FaultKind];
    const at = raw["at"];
    if (!isStr(at)) { err(`fault ${id}: at must be a node or line id`); continue; }
    if (faultAt.has(at)) err(`fault ${id}: ${at} already has a fault`);
    if (city && raw["span"] !== undefined) {
      if (kind !== "damaged-cable") err(`fault ${id}: span is only for a damaged-cable`);
      else if (!isStr(raw["span"]) || !(runSpans.get(at) ?? []).includes(raw["span"])) err(`fault ${id}: span "${String(raw["span"])}" is not in line ${at}'s run`);
    }
    faultAt.add(at);
    if (rule.at === "line") {
      if (!lineIds.has(at)) err(`fault ${id}: ${kind} must sit on a line, not "${at}"`);
    } else {
      const n = nodeById.get(at);
      if (!n) err(`fault ${id}: "${at}" is not a node`);
      else if (n.type !== rule.at) err(`fault ${id}: ${kind} must sit on a ${rule.at}, but ${at} is a ${n.type}`);
    }
  }

  // ---- targets ----
  for (const k of ["target", "priority"]) {
    if (!Array.isArray(p[k])) continue;
    for (const id of p[k] as unknown[]) {
      const n = isStr(id) ? nodeById.get(id) : undefined;
      if (!n) err(`${k}: "${String(id)}" is not a node`);
      else if (n.type !== "lamp") err(`${k}: ${String(id)} is a ${n.type}, not a lamp`);
    }
  }

  // ---- salvage, stores, decor ----
  const salvage = Array.isArray(p["salvage"]) ? p["salvage"] : p["salvage"] === undefined ? [] : (err("salvage must be a list"), []);
  const salvageIds = new Set<string>();
  for (const [i, raw] of salvage.entries()) {
    if (!isObj(raw) || !isStr(raw["id"])) { err(`salvage[${i}] needs an id`); continue; }
    if (salvageIds.has(raw["id"])) err(`duplicate salvage id ${raw["id"]}`);
    salvageIds.add(raw["id"]);
    if (!isVec2(raw["pos"])) err(`salvage ${raw["id"]}: pos must be [x, y]`);
    if (raw["part"] !== "random" && !PARTS.includes(raw["part"] as Part)) err(`salvage ${raw["id"]}: part must be bulb | fuse | wire | random`);
  }
  if (p["stores"] !== undefined && (!isObj(p["stores"]) || !isVec2(p["stores"]["pos"]))) err("stores.pos must be [x, y]");
  if (p["decor"] !== undefined) {
    if (!Array.isArray(p["decor"])) err("decor must be a list");
    else for (const [i, d] of p["decor"].entries()) {
      if (!isObj(d) || !Array.isArray(d["path"]) || d["path"].length < 2 || !d["path"].every(isVec2)) err(`decor[${i}].path must be 2+ points`);
    }
  }

  return errors;
}

/** A feed as every part reads it: its id, its display name, and the limit it is judged against (ticket 015). */
export interface FeedInfo {
  id: string;
  /** The feed's `name`, else its id with underscores as spaces (`powersourceName`). */
  name: string;
  /** The feed's own `capacity` if it has the key (null included), else the puzzle's top-level `capacity`. */
  capacity: number | null;
}

/**
 * Every feed of a valid puzzle, in the order they appear in `nodes`. The one place the capacity rule lives:
 * a one-feed map with no feed `capacity` gives `[{ id, name, capacity: puzzle.capacity }]`, exactly as before.
 */
export function puzzleFeeds(puzzle: Puzzle): readonly FeedInfo[] {
  const out: FeedInfo[] = [];
  for (const n of puzzle.nodes) {
    if (n.type !== "feed") continue;
    out.push({ id: n.id, name: powersourceName(n.id, n.name), capacity: n.capacity !== undefined ? n.capacity : puzzle.capacity });
  }
  return out;
}
