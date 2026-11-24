/**
 * A city puzzle laid on the circuit (ticket 081 K2c): CK13 as Josh changed it (answer 5, "Just carriers"), CK14's district, and the places' CK12, judged on the plan's circuit layer. A line is a chain of straight spans from its
 * `from` node's place to its `to` node's place, then down a drop or a lead; the poles between are carriers and hold no node. K2d2: a node may stand on a roof structure, and a roof span joins a chain like any span; a roof between two spans is a carrier too.
 */

import type { CityCircuitLayer, CityPlan, CityPlanBlock, CityPole, CityPuzzle, CityPuzzleNode, CityWireSpan } from "../../core";
import type { CircuitProblem } from "./check";
import { nodePlaceProblems } from "./checkplaces";
import { dropId } from "./places";
import { jobRoofProblems, reachOf, roofSpanFault } from "./roofjobs";

type Layer = Pick<CityCircuitLayer, "poles" | "spans" | "drops" | "posts"> & Partial<Pick<CityCircuitLayer, "roofs" | "roofSpans">>;

/** What the checks read of a plan: its circuit layer and its blocks, or undefined when it has no circuit stage. */
export function circuitOf(plan: CityPlan): { readonly layer: CityCircuitLayer; readonly blocks: readonly CityPlanBlock[] } | undefined {
  const layer = plan.layers.circuit;
  const streets = plan.layers.streets;
  return layer === undefined || streets === undefined ? undefined : { layer, blocks: streets.blocks };
}

/** The pole or roof structure a node stands on, where a run starts or ends. */
const nodeStruct = (n: CityPuzzleNode): string | undefined => ("pole" in n.place ? n.place.pole : "roof" in n.place ? n.place.roof : undefined);

/** CK13 as changed: each run's spans join end to end from its `from` place to its `to` place; a carrier holds no node; no two lines share a span; a fault's span is in its line's run. */
export function runProblems(puzzle: CityPuzzle, layer: Layer): CircuitProblem[] {
  const out: CircuitProblem[] = [];
  const add = (id: string, reason: string): number => out.push({ rule: "CK13", id, reason });
  const spans = new Map<string, { readonly a: string; readonly b: string }>([...layer.spans, ...(layer.roofSpans ?? [])].map((s) => [s.id, s] as const));
  const roofIds = new Set((layer.roofs ?? []).map((r) => r.id));
  const drops = new Map(layer.drops.map((d) => [d.id, d] as const));
  const posts = new Set(layer.posts.map((q) => q.span));
  const nodes = new Map(puzzle.nodes.map((n) => [n.id, n] as const));
  const nodePoles = new Map<string, string>();
  for (const n of puzzle.nodes) {
    const p = nodeStruct(n);
    if (p !== undefined) nodePoles.set(p, n.id);
  }
  const used = new Map<string, string>();
  const carried = new Map<string, string>();
  const claim = (key: string, what: string, line: string): void => {
    const first = used.get(key);
    if (first !== undefined) add(line, `shares ${what} with ${first} (no two lines share a span)`);
    else used.set(key, line);
  };

  for (const l of puzzle.lines) {
    const from = nodes.get(l.from);
    const to = nodes.get(l.to);
    if (from === undefined || to === undefined) {
      add(l.id, "a line between a node that does not exist");
      continue;
    }
    const run = l.run;
    if (run.drop !== undefined && run.lead !== undefined) add(l.id, "a run ends on a drop and a lead, never both");
    let cur = nodeStruct(from);
    if (cur === undefined) {
      add(l.id, `starts at ${from.id}, which does not stand on a pole or a roof`);
      continue;
    }
    if (run.spans.length === 0 && run.drop === undefined && run.lead === undefined) add(l.id, "an empty run: no span, drop or lead");
    let broken = false;
    run.spans.forEach((sid, k) => {
      if (broken) return;
      claim(sid, sid, l.id);
      const s = spans.get(sid);
      if (s === undefined) {
        add(l.id, `${sid} is not a span of the city`);
        broken = true;
        return;
      }
      if (cur !== s.a && cur !== s.b) {
        add(l.id, `${sid} does not join the run: it is at ${cur}, and the span joins ${s.a} to ${s.b}`);
        broken = true;
        return;
      }
      cur = cur === s.a ? s.b : s.a;
      if (k < run.spans.length - 1 || run.drop !== undefined || run.lead !== undefined) {
        const holder = nodePoles.get(cur);
        if (holder !== undefined) add(l.id, `carrier ${cur} holds node ${holder} (a carrier holds no node of the job)`);
        const other = carried.get(cur);
        if (other !== undefined && other !== l.id) add(l.id, `carrier ${cur} also carries ${other} (a carrier holds one run)`);
        else carried.set(cur, l.id);
      }
    });
    if (broken) continue;
    if (run.drop !== undefined) {
      const d = drops.get(dropId(run.drop));
      if (cur !== undefined && roofIds.has(cur)) add(l.id, `the run ends at the roof ${cur}, and a drop never leaves a roof`);
      else if (d === undefined) add(l.id, `${run.drop} has no drop`);
      else if (d.pole !== cur) add(l.id, `the run ends at ${cur}, but ${d.id} hangs from ${d.pole}`);
      if (!("building" in to.place) || to.place.building !== run.drop) add(l.id, `ends on the drop of ${run.drop}, but ${to.id} does not stand on that building`);
      claim(dropId(run.drop), dropId(run.drop), l.id);
    } else if (run.lead !== undefined) {
      const s = spans.get(run.lead);
      if (cur !== undefined && roofIds.has(cur)) add(l.id, `the run ends at the roof ${cur}, and a lead never leaves a roof`);
      else if (!posts.has(run.lead) || s === undefined) add(l.id, `${run.lead} is not a lamp-post place`);
      else if (cur !== s.a && cur !== s.b) add(l.id, `the run ends at ${cur}, which is not an end of the post's span ${run.lead}`);
      if (!("post" in to.place) || to.place.post !== run.lead) add(l.id, `ends on the lead to ${run.lead}, but ${to.id} does not stand on that post`);
      claim(`lead:${run.lead}`, `the lead to ${run.lead}`, l.id);
    } else if (nodeStruct(to) !== cur) add(l.id, `the run ends at ${cur}, not at ${to.id}'s pole or roof`);
  }

  const lines = new Map(puzzle.lines.map((l) => [l.id, l] as const));
  for (const f of puzzle.faults) {
    if (f.span === undefined) continue;
    const l = lines.get(f.at);
    if (f.kind !== "damaged-cable" || l === undefined) add(f.id, "names a span, but is not a damaged cable on a line");
    else if (!l.run.spans.includes(f.span)) add(f.id, `${f.span} is not in the run of ${l.id}`);
  }
  return out;
}

/** True when every listed block is reached from the first through the blocks across each street. */
function touching(ids: readonly string[], blocks: ReadonlyMap<string, CityPlanBlock>): boolean {
  const seen = new Set<string>([ids[0]!]);
  const queue = [ids[0]!];
  while (queue.length > 0) {
    const b = blocks.get(queue.pop()!);
    if (b === undefined) continue;
    for (const side of Object.values(b.sides)) {
      for (const a of side.across) {
        if (ids.includes(a.block) && !seen.has(a.block)) {
          seen.add(a.block);
          queue.push(a.block);
        }
      }
    }
  }
  return seen.size === ids.length;
}

/**
 * CK14: the district's blocks exist and touch; each line uses only the district's spans and drops (both poles on a district block), except its feed's one entering span; each feed stands outside, with one line and one
 * entering span. K2d2 (B1-Q5, "Neighbouring blocks too"): a roof span may reach a roof on a neighbouring block, and never a neighbouring pole; each has at least one end on the district (`roofjobs.ts`).
 */
export function districtProblems(puzzle: CityPuzzle, layer: Layer, blocks: readonly CityPlanBlock[]): CircuitProblem[] {
  const out: CircuitProblem[] = [];
  const add = (id: string, reason: string): number => out.push({ rule: "CK14", id, reason });
  const byId = new Map(blocks.map((b) => [b.id, b] as const));
  const missing = puzzle.district.filter((b) => !byId.has(b));
  for (const b of missing) add(b, "a district block that is not on the city");
  if (missing.length === 0 && !touching(puzzle.district, byId)) add("district", "the district's blocks do not touch across a street");
  const inside = new Set(puzzle.district);
  const poles = new Map<string, CityPole>(layer.poles.map((p) => [p.id, p] as const));
  const spans = new Map<string, CityWireSpan>(layer.spans.map((s) => [s.id, s] as const));
  const reach = reachOf(puzzle.district, blocks, layer);
  const ends = (s: { readonly a: string; readonly b: string }): number => [s.a, s.b].filter((p) => inside.has(reach.blockOf.get(p) ?? "")).length;
  const spanOf = (sid: string): { readonly a: string; readonly b: string } | undefined => spans.get(sid) ?? reach.roofSpans.get(sid);
  const nodes = new Map(puzzle.nodes.map((n) => [n.id, n] as const));
  const feeds = new Set(puzzle.nodes.filter((n) => n.type === "feed").map((n) => n.id));

  for (const f of feeds) {
    const pole = nodeStruct(nodes.get(f)!);
    if (pole !== undefined && inside.has(reach.blockOf.get(pole) ?? "")) add(f, "a feed stands inside the district; it stands outside, one span from the edge");
    const mine = puzzle.lines.filter((l) => l.from === f || l.to === f);
    if (mine.length !== 1) add(f, `a feed has ${mine.length} lines; it has one, over one entering span`);
    else {
      const enters = mine[0]!.run.spans.filter((sid) => spanOf(sid) !== undefined && ends(spanOf(sid)!) === 1);
      if (enters.length !== 1) add(f, `its line ${mine[0]!.id} has ${enters.length} spans entering the district; a feed has exactly one`);
    }
  }
  for (const l of puzzle.lines) {
    const feedLine = feeds.has(l.from) || feeds.has(l.to);
    for (const sid of l.run.spans) {
      const rs = reach.roofSpans.get(sid);
      if (rs !== undefined) {
        const why = roofSpanFault(reach, rs);
        if (why !== null) add(l.id, `${sid} ${why}`);
        continue;
      }
      const s = spans.get(sid);
      if (s === undefined) continue;
      const n = ends(s);
      if (n === 2 || (feedLine && n === 1)) continue;
      add(l.id, `${sid} ${n === 1 ? "leaves the district" : "is wholly past it"}; a line uses only the district's spans and its feed's one entering span`);
    }
    const d = l.run.drop === undefined ? undefined : layer.drops.find((x) => x.id === dropId(l.run.drop!));
    if (d !== undefined && !inside.has(poles.get(d.pole)?.block ?? "")) add(l.id, `${d.id} hangs from a pole outside the district`);
    const q = l.run.lead === undefined ? undefined : spans.get(l.run.lead);
    if (q !== undefined && ends(q) !== 2) add(l.id, `the lamp post under ${q.id} is outside the district`);
  }
  return out;
}

/** Every problem with a city puzzle on a plan: CK12's places, CK13's runs, CK14's district. Empty when it converts. */
export function cityPuzzleProblems(puzzle: CityPuzzle, plan: CityPlan): CircuitProblem[] {
  const c = circuitOf(plan);
  if (c === undefined) return [{ rule: "CK15", id: puzzle.id, reason: "the plan has no circuit layer" }];
  return [
    ...nodePlaceProblems(c.layer, puzzle.nodes.map((n) => ({ id: n.id, type: n.type, place: n.place, degree: puzzle.lines.filter((l) => l.from === n.id || l.to === n.id).length })), { district: puzzle.district, blocks: c.blocks }),
    ...runProblems(puzzle, c.layer),
    ...districtProblems(puzzle, c.layer, c.blocks),
    ...jobRoofProblems(puzzle, c.layer),
  ];
}
