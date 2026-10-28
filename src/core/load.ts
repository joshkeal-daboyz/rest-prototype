/**
 * Loader and validator for puzzle files (schema draft 2).
 * `validatePuzzle` never throws; it returns every problem it finds so the editor can show them.
 * `loadPuzzle` throws on the first invalid file, for code that wants a Puzzle or nothing.
 */

import { FAULT_RULES, type FaultKind, type GridNode, type NodeType, type Part, type Puzzle, type Vec2 } from "./schema";

export type ValidationResult = { ok: true; puzzle: Puzzle } | { ok: false; errors: readonly string[] };

const NODE_TYPES: readonly NodeType[] = ["feed", "breaker", "switch", "fusebox", "junction", "lamp"];
const FAULT_KINDS: readonly FaultKind[] = ["dead-lamp", "blown-fuse", "damaged-cable", "dead-junction"];
const PARTS: readonly Part[] = ["bulb", "fuse", "wire"];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isVec2 = (v: unknown): v is Vec2 => Array.isArray(v) && v.length === 2 && v.every(isNum);

export function validatePuzzle(json: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);

  if (!isObj(json)) return { ok: false, errors: ["puzzle must be an object"] };
  const p = json;

  // ---- top level ----
  if (!isStr(p["id"])) err("id must be a non-empty string");
  if (!isStr(p["name"])) err("name must be a non-empty string");
  if (p["version"] !== 3) err("version must be 3");
  const street = p["scope"] === "street";
  if (p["scope"] !== "map" && !street) err('scope must be "map" or "street"');
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
  if (p["lampReach"] !== undefined && (!isNum(p["lampReach"]) || p["lampReach"] < 0)) err("lampReach must be a non-negative number");

  // ---- nodes ----
  const nodes = Array.isArray(p["nodes"]) ? p["nodes"] : (err("nodes must be a list"), []);
  const nodeById = new Map<string, GridNode>();
  let feeds = 0;
  for (const [i, raw] of nodes.entries()) {
    if (!isObj(raw) || !isStr(raw["id"])) { err(`nodes[${i}] needs an id`); continue; }
    const id = raw["id"];
    if (nodeById.has(id)) err(`duplicate node id ${id}`);
    if (!NODE_TYPES.includes(raw["type"] as NodeType)) err(`node ${id}: unknown type ${String(raw["type"])}`);
    if (!isVec2(raw["pos"])) err(`node ${id}: pos must be [x, y]`);
    switch (raw["type"]) {
      case "feed": feeds++; break;
      case "breaker": if (typeof raw["closed"] !== "boolean") err(`breaker ${id}: closed must be true or false`); break;
      case "switch":
        if (!Array.isArray(raw["outputs"]) || raw["outputs"].length !== 2 || !raw["outputs"].every(isStr)) err(`switch ${id}: outputs must be two line ids`);
        if (raw["selected"] !== 0 && raw["selected"] !== 1) err(`switch ${id}: selected must be 0 or 1`);
        break;
      case "fusebox": if (raw["rating"] !== undefined && (!isNum(raw["rating"]) || raw["rating"] <= 0)) err(`fusebox ${id}: rating must be > 0`); break;
      case "lamp": if (raw["load"] !== undefined && (!isNum(raw["load"]) || raw["load"] <= 0)) err(`lamp ${id}: load must be > 0`); break;
    }
    nodeById.set(id, raw as unknown as GridNode);
  }
  if (feeds !== 1) err(`exactly one feed node is required (found ${feeds})`);

  // ---- lines ----
  const lines = Array.isArray(p["lines"]) ? p["lines"] : (err("lines must be a list"), []);
  const lineIds = new Set<string>();
  const degree = new Map<string, number>();
  const linesFrom = new Map<string, Set<string>>();
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

  if (errors.length) return { ok: false, errors };
  return { ok: true, puzzle: p as unknown as Puzzle };
}

export function loadPuzzle(json: unknown): Puzzle {
  const r = validatePuzzle(json);
  if (!r.ok) throw new Error(`invalid puzzle:\n  ${r.errors.join("\n  ")}`);
  return r.puzzle;
}
