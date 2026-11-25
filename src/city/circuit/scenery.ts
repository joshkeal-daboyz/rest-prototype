/**
 * 081 S1 (Josh, 24 Nov 2026: "I would like all buildings to receive power if they are connected to the feed"; on cards "Drop on a live pole (Recommended)", "Yes, they add load", "Whole", "Dark"):
 * the conversion splits every line of the file into three and hangs each scenery building whose drop is on one of the job's poles onto the job as a hidden lamp of `SCENERY_BUILDING_LOAD` a building,
 * so `src/grid/` (unchanged) lights it while current reaches it and counts its load against the feed and its fuses. Pure; it never imports `src/grid/`.
 */

import { SCENERY_BUILDING_LOAD, type CityCircuitLayer, type CityPuzzle, type GridNode, type Line, type Vec2 } from "../../core";

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

export interface SceneryResult {
  readonly nodes: readonly GridNode[];
  readonly lines: readonly Line[];
  /** Building id to the hidden lamp that stands for it. */
  readonly scenery: Record<string, string>;
  /** Every node and line id added. */
  readonly hidden: readonly string[];
}

/** Where a job's structure hangs scenery: the id of the node it joins, always the file's or a hidden junction's. */
export function splitAndHang(
  puzzle: CityPuzzle,
  layer: Pick<CityCircuitLayer, "spans" | "drops"> & Partial<Pick<CityCircuitLayer, "roofSpans">>,
  nodes: readonly GridNode[],
  lines: readonly Line[],
  cuts: Readonly<Record<string, string>>,
  toPos: (m: { readonly x_m: number; readonly z_m: number }) => Vec2,
): SceneryResult {
  const hidden: string[] = [];
  const nodeById = new Map(nodes.map((n) => [n.id, n] as const));
  const spans = new Map([...layer.spans, ...(layer.roofSpans ?? [])].map((s) => [s.id, s] as const));
  const feedIds = new Set(nodes.filter((n) => n.type === "feed").map((n) => n.id));

  // Rule 2: every line becomes `L~a`, `L`, `L~b`, with `L~h1` and `L~h2` at 1/3 and 2/3.
  const hiddenNodes: GridNode[] = [];
  const keptLines: Line[] = [];
  const segLines: Line[] = [];
  const nearA = new Map<string, string>(); // `${line}|${node}` -> the segment next to that node
  for (const l of lines) {
    const a = nodeById.get(l.from)!.pos;
    const b = nodeById.get(l.to)!.pos;
    const h1 = `${l.id}~h1`;
    const h2 = `${l.id}~h2`;
    const at = (t: number): Vec2 => [round4(a[0] + (b[0] - a[0]) * t), round4(a[1] + (b[1] - a[1]) * t)];
    hiddenNodes.push({ id: h1, type: "junction", pos: at(1 / 3) }, { id: h2, type: "junction", pos: at(2 / 3) });
    keptLines.push({ ...l, from: h1, to: h2 });
    segLines.push({ ...l, id: `${l.id}~a`, from: l.from, to: h1 }, { ...l, id: `${l.id}~b`, from: h2, to: l.to });
    nearA.set(`${l.id}|${l.from}`, `${l.id}~a`);
    nearA.set(`${l.id}|${l.to}`, `${l.id}~b`);
    hidden.push(h1, h2, `${l.id}~a`, `${l.id}~b`);
  }
  const end = (lineId: string, nodeId: string): string => (lines.find((l) => l.id === lineId)!.from === nodeId ? `${lineId}~h1` : `${lineId}~h2`);
  const segment = (lineId: string, nodeId: string): string => nearA.get(`${lineId}|${nodeId}`)!;
  const outNodes = nodes.map((n): GridNode => {
    if (n.type === "switch") return { ...n, outputs: [segment(n.outputs[0], n.id), segment(n.outputs[1], n.id)] };
    if (n.type === "battery") return { ...n, input: segment(n.input, n.id) };
    return n;
  });

  // Rule 3: where each of the job's poles hangs its buildings.
  const hang = new Map<string, string>();
  for (const l of puzzle.lines) {
    const from = puzzle.nodes.find((n) => n.id === l.from)!;
    let cur = "pole" in from.place ? from.place.pole : "roof" in from.place ? from.place.roof : undefined;
    const cutAt = Math.min(
      Infinity,
      ...puzzle.faults.filter((f) => f.at === l.id && f.kind === "damaged-cable").map((f) => {
        const k = l.run.spans.indexOf(cuts[f.id] ?? "");
        return k < 0 ? l.run.spans.length : k;
      }),
    );
    l.run.spans.forEach((sid, k) => {
      const s = spans.get(sid)!;
      cur = cur === s.a ? s.b : s.a;
      if (k < l.run.spans.length - 1 || l.run.drop !== undefined || l.run.lead !== undefined) hang.set(cur, k >= cutAt ? `${l.id}~h2` : `${l.id}~h1`);
    });
  }
  for (const n of puzzle.nodes) {
    if (!("pole" in n.place) || n.type === "feed") continue;
    const touching = puzzle.lines.filter((l) => l.from === n.id || l.to === n.id);
    let line: string | undefined;
    if (n.type === "junction" || n.type === "fusebox") {
      hang.set(n.place.pole, n.id);
      continue;
    }
    if (n.type === "switch") line = touching.find((l) => !n.outputs.includes(l.id))?.id;
    else if (n.type === "battery") line = n.input;
    else if (n.type === "breaker") line = touching[0]?.id;
    else throw new Error(`081 S1: a ${n.type} node (${n.id}) stands on a pole, and the scenery rule does not say where its buildings hang`);
    if (line !== undefined) hang.set(n.place.pole, end(line, n.id));
  }
  for (const id of feedIds) {
    const f = puzzle.nodes.find((n) => n.id === id)!;
    if ("pole" in f.place) hang.delete(f.place.pole);
  }

  // Rules 1 and 4: each other building on a hung pole, grouped by attachment point.
  const lampBuildings = new Set(puzzle.nodes.flatMap((n) => ("building" in n.place ? [n.place.building] : [])));
  const groups = new Map<string, typeof layer.drops[number][]>();
  for (const d of layer.drops) {
    const at = hang.get(d.pole);
    if (at === undefined || lampBuildings.has(d.building)) continue;
    groups.set(at, [...(groups.get(at) ?? []), d]);
  }
  const lamps: GridNode[] = [];
  const lampLines: Line[] = [];
  const scenery: Record<string, string> = {};
  for (const [at, ds] of groups) {
    const lamp = `${at}~s`;
    lamps.push({ id: lamp, type: "lamp", pos: toPos(ds[0]!), load: ds.length * SCENERY_BUILDING_LOAD });
    lampLines.push({ id: `${lamp}~l`, from: at, to: lamp });
    hidden.push(lamp, `${lamp}~l`);
    for (const d of ds) scenery[d.building] = lamp;
  }
  return { nodes: [...outNodes, ...hiddenNodes, ...lamps], lines: [...keptLines, ...segLines, ...lampLines], scenery, hidden };
}
