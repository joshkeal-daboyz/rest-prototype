/**
 * CK15: a city puzzle laid on the circuit becomes a plain `Puzzle` that `src/grid/` runs unchanged (ticket 081 K2c). Pure, and it never imports `src/grid/`. The file's node, line and fault ids all stay, and 081 S1 adds hidden ones (the line split and the scenery lamps, `scenery.ts`); each `pos` is its
 * place's metres less the district's least corner, over `CELL_M`; the runs, places and cut spans go back beside the puzzle for the 3D view. A roof node's place is its structure's point; a roof span may be a fault's cut; the scenery adds nothing for roofs (K2d2).
 */

import { validatePuzzle, type CityNodePlace, type CityPlan, type CityPuzzle, type CityPuzzleConverted, type Decor, type GridNode, type Puzzle, type Vec2 } from "../../core";
import type { CircuitProblem } from "./check";
import { circuitOf, cityPuzzleProblems } from "./checkpuzzle";
import { CELL_M } from "./constants";
import { spanM, streetsById } from "./geometry";
import { dropId } from "./places";
import { splitAndHang } from "./scenery";

/** Thrown when a city puzzle does not hold on its city: every problem, each naming its node, line or fault and its CK rule. */
export class CityPuzzleError extends Error {
  readonly problems: readonly CircuitProblem[];
  constructor(problems: readonly CircuitProblem[]) {
    super(`${problems.length} problems: ${problems.map((p) => `${p.rule} ${p.id}: ${p.reason}`).join("; ")}`);
    this.name = "CityPuzzleError";
    this.problems = problems;
  }
}

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export function convertCityPuzzle(puzzle: CityPuzzle, plan: CityPlan): CityPuzzleConverted {
  const problems = cityPuzzleProblems(puzzle, plan);
  if (problems.length > 0) throw new CityPuzzleError(problems);
  const { layer, blocks } = circuitOf(plan)!;
  const streets = streetsById(plan.layers.streets!);
  const blockById = new Map(blocks.map((b) => [b.id, b] as const));

  // Step 2: the district's least corner, over the cells of its streets along its blocks.
  let x0 = Infinity;
  let z0 = Infinity;
  for (const id of puzzle.district) {
    for (const info of Object.values(blockById.get(id)!.sides)) {
      const st = streets.get(info.street)!;
      const m = spanM(info);
      const across = st.across0 * CELL_M;
      x0 = Math.min(x0, st.axis === "x" ? m.lo : across);
      z0 = Math.min(z0, st.axis === "x" ? across : m.lo);
    }
  }

  const poles = new Map(layer.poles.map((p) => [p.id, p] as const));
  const drops = new Map(layer.drops.map((d) => [d.id, d] as const));
  const posts = new Map(layer.posts.map((q) => [q.span, q] as const));
  const roofs = new Map((layer.roofs ?? []).map((r) => [r.id, r] as const));
  const metres = (place: CityNodePlace): { readonly x_m: number; readonly z_m: number } =>
    "pole" in place ? poles.get(place.pole)! : "building" in place ? drops.get(dropId(place.building))! : "roof" in place ? roofs.get(place.roof)! : posts.get(place.post)!;
  const toPos = (m: { readonly x_m: number; readonly z_m: number }): Vec2 => [round4((m.x_m - x0) / CELL_M), round4((m.z_m - z0) / CELL_M)];

  // Steps 3 to 5: positions, lines and faults, ids unchanged.
  const places: Record<string, CityNodePlace> = {};
  const nodes = puzzle.nodes.map((n): GridNode => {
    places[n.id] = n.place;
    const { place: _place, ...rest } = n;
    return { ...rest, pos: toPos(metres(n.place)) } as GridNode;
  });
  const runs: Record<string, CityPuzzle["lines"][number]["run"]> = {};
  const lines = puzzle.lines.map((l) => {
    runs[l.id] = l.run;
    const { run: _run, ...rest } = l;
    return rest;
  });
  const lineById = new Map(puzzle.lines.map((l) => [l.id, l] as const));
  const cuts: Record<string, string> = {};
  const faults = puzzle.faults.map((f) => {
    const { span: _span, ...rest } = f;
    if (f.kind === "damaged-cable") {
      const run = lineById.get(f.at)!.run;
      cuts[f.id] = f.span ?? run.spans[0] ?? (run.drop !== undefined ? dropId(run.drop) : run.lead!);
    }
    return rest;
  });

  // Step 6: the district's scenery, one path per span and drop the job does not use that touches the district's poles.
  const inside = new Set(puzzle.district);
  const usedSpans = new Set(puzzle.lines.flatMap((l) => l.run.spans));
  const usedDrops = new Set(puzzle.lines.flatMap((l) => (l.run.drop === undefined ? [] : [dropId(l.run.drop)])));
  const decor: Decor[] = [];
  for (const s of layer.spans) {
    if (usedSpans.has(s.id) || !(inside.has(poles.get(s.a)!.block) || inside.has(poles.get(s.b)!.block))) continue;
    decor.push({ path: [toPos(poles.get(s.a)!), toPos(poles.get(s.b)!)] });
  }
  for (const d of layer.drops) {
    if (usedDrops.has(d.id) || !inside.has(poles.get(d.pole)!.block)) continue;
    decor.push({ path: [toPos(poles.get(d.pole)!), toPos(d)] });
  }

  const { city: _city, district: _district, from: _from, nodes: _n, lines: _l, faults: _f, ...rest } = puzzle;
  const tilde = [...puzzle.nodes.map((n) => n.id), ...puzzle.lines.map((l) => l.id)].filter((id) => id.includes("~"));
  if (tilde.length > 0) throw new CityPuzzleError(tilde.map((id) => ({ rule: "CK15", id, reason: "an id with ~ could collide with an id the conversion adds" })));
  const hung = splitAndHang(puzzle, layer, nodes, lines, cuts, toPos);
  const target = puzzle.target ?? nodes.filter((n) => n.type === "lamp").map((n) => n.id);
  const out: Puzzle = { ...rest, target, nodes: hung.nodes, lines: hung.lines, faults, decor };
  const valid = validatePuzzle(out);
  if (!valid.ok) throw new CityPuzzleError(valid.errors.map((reason) => ({ rule: "CK15", id: puzzle.id, reason })));
  return { puzzle: out, places, runs, cuts, origin_m: { x_m: x0, z_m: z0 }, scenery: hung.scenery, hidden: hung.hidden };
}
