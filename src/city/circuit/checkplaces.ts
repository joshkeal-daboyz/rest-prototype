/**
 * Stage 6's checks for drops, street lights, lamp-post places and node places (ticket 081 K2b): CK9 to CK12 of `docs/design/070-K1-circuit.md`, judged on a layer by the layers before it, so a fixture can tamper with a
 * layer and see the rule fail (R-2). Roof places join in K2d.
 */

import type { CityCircuitLayer, CityNodePlace, CityPlanBlock, GridNode } from "../../core";
import type { CircuitInput, CircuitProblem } from "./check";
import { DROP_MAX_M, DROP_WALL_Y_M, LIGHT_POLE_MIN_M, POST_MIN_SPAN_M, TOL } from "./constants";
import { allowedCell, cellAt, indexCells, polePavement, sidePavement, streetsById } from "./geometry";
import { dropId, frontColumns, edgeCentre } from "./places";
import { reachOf, roofSpanFault } from "./roofjobs";

type Placed = Pick<CityCircuitLayer, "poles" | "spans" | "drops" | "lights" | "posts">;

/** CK9 to CK11 on a layer. */
export function placeProblems(layer: Placed, input: CircuitInput): CircuitProblem[] {
  const out: CircuitProblem[] = [];
  const add = (rule: string, id: string, reason: string): number => out.push({ rule, id, reason });
  const ix = indexCells(input.edge);
  const byStreet = streetsById(input.streets);
  const poles = new Map(layer.poles.map((p) => [p.id, p] as const));
  const spans = new Map(layer.spans.map((s) => [s.id, s] as const));
  const buildings = new Map(input.buildings.buildings.map((b) => [b.id, b] as const));
  const blocks = new Map(input.streets.blocks.map((b) => [b.id, b] as const));

  // CK9: each drop is from a pole of the line on its building's own side, short, and meets the wall at a front column's centre; every building on a pole line has one.
  const dropped = new Set<string>();
  for (const d of layer.drops) {
    dropped.add(d.building);
    const b = buildings.get(d.building);
    const p = poles.get(d.pole);
    if (b === undefined || p === undefined || d.id !== dropId(d.building)) {
      add("CK9", d.id, "a drop to a building or from a pole that does not exist");
      continue;
    }
    if (p.kind === "crossing" || p.block !== b.block || p.side !== b.front) add("CK9", d.id, `a drop from ${p.id}, which is not a pole of the line on ${b.id}'s own side (a drop never crosses a street)`);
    if (Math.hypot(p.x_m - d.x_m, p.z_m - d.z_m) > DROP_MAX_M + TOL) add("CK9", d.id, `longer than ${DROP_MAX_M} m`);
    if (Math.abs(d.y_m - DROP_WALL_Y_M) > TOL) add("CK9", d.id, `meets the wall at ${d.y_m} m, not ${DROP_WALL_Y_M} m`);
    const col = frontColumns(input, b).find((c) => c.i === d.cell.i && c.j === d.cell.j);
    const at = col === undefined ? undefined : edgeCentre(col.i, col.j, b.front);
    if (at === undefined || Math.abs(at.x_m - d.x_m) > TOL || Math.abs(at.z_m - d.z_m) > TOL) add("CK9", d.id, "does not meet the wall at the centre of a front column that faces a street");
  }
  for (const b of input.buildings.buildings) {
    const st = byStreet.get(blocks.get(b.block)?.sides[b.front].street ?? "");
    if (st === undefined || polePavement(st, ix) !== sidePavement(b.front) || frontColumns(input, b).length === 0) continue;
    if (!dropped.has(b.id)) add("CK9", b.id, "a building on a pole line, facing a street, with no drop");
  }

  // CK10: a light is on the non-pole pavement, on an allowed cell, and 3 m or more from every pole.
  for (const l of layer.lights) {
    const st = byStreet.get(l.street);
    if (st === undefined) {
      add("CK10", l.id, `street ${l.street} does not exist`);
      continue;
    }
    if (polePavement(st, ix) === l.pavement) add("CK10", l.id, "stands on the pole pavement");
    if (!allowedCell(ix, cellAt(st, l.pavement, l.along_m))) add("CK10", l.id, "stands on a cell no pole may stand on");
    const near = layer.poles.find((p) => Math.hypot(p.x_m - l.x_m, p.z_m - l.z_m) < LIGHT_POLE_MIN_M - TOL);
    if (near !== undefined) add("CK10", l.id, `${near.id} is within ${LIGHT_POLE_MIN_M} m`);
  }

  // CK11: a post is the midpoint of an along span of 7.5 m or more, and every such span has one; no post is at a street light.
  const posted = new Set<string>();
  for (const q of layer.posts) {
    posted.add(q.span);
    const s = spans.get(q.span);
    const a = s === undefined ? undefined : poles.get(s.a);
    const b = s === undefined ? undefined : poles.get(s.b);
    if (s === undefined || a === undefined || b === undefined || s.kind !== "along" || s.len_m < POST_MIN_SPAN_M) {
      add("CK11", q.span, `a lamp post on a span that is not an along span of ${POST_MIN_SPAN_M} m or more`);
      continue;
    }
    if (Math.abs(q.x_m - (a.x_m + b.x_m) / 2) > TOL || Math.abs(q.z_m - (a.z_m + b.z_m) / 2) > TOL) add("CK11", q.span, "a lamp post that is not at its span's midpoint");
    if (layer.lights.some((l) => Math.hypot(l.x_m - q.x_m, l.z_m - q.z_m) < TOL)) add("CK11", q.span, "a lamp post at a street light's place");
  }
  for (const s of layer.spans) if (s.kind === "along" && s.len_m >= POST_MIN_SPAN_M && !posted.has(s.id)) add("CK11", s.id, "an along span of 7.5 m or more with no lamp-post place");
  return out;
}

/** One node a puzzle puts on a place, as CK12 reads it. `degree` is how many lines end at it (a roof junction needs a span for each). */
export interface PlacedNode {
  readonly id: string;
  readonly type: GridNode["type"];
  readonly place: CityNodePlace;
  readonly degree?: number;
}

/** The attachments each node type needs on its pole (CK12's table). */
const POLE_NEEDS: Readonly<Partial<Record<GridNode["type"], number>>> = { breaker: 2, battery: 2, fusebox: 2, switch: 3, junction: 0, feed: 0 };

/** CK17e: the roof span places each node type needs on its roof (Josh, B1-Q1: "Anything"). A junction needs as many as its lines, at least 3. */
const roofNeed = (type: GridNode["type"], degree: number): number => {
  switch (type) {
    case "breaker":
    case "battery":
    case "fusebox":
      return 2;
    case "switch":
      return 3;
    case "junction":
      return Math.max(3, degree);
    default:
      return 1;
  }
};

/**
 * CK12's table and CK17e: where each node type may stand, and one node per place. With `district` and `blocks`, a roof counts only the roof spans the job may use (CK14), and a feed on a roof stands outside the district.
 */
export function nodePlaceProblems(
  layer: Pick<CityCircuitLayer, "spans" | "poles" | "drops" | "posts"> & Partial<Pick<CityCircuitLayer, "roofs" | "roofSpans">>,
  places: readonly PlacedNode[],
  job?: { readonly district: readonly string[]; readonly blocks: readonly CityPlanBlock[] },
): CircuitProblem[] {
  const out: CircuitProblem[] = [];
  const add = (id: string, reason: string): number => out.push({ rule: "CK12", id, reason });
  const attach = new Map<string, number>();
  const bump = (id: string): void => void attach.set(id, (attach.get(id) ?? 0) + 1);
  for (const s of layer.spans) (bump(s.a), bump(s.b));
  for (const d of layer.drops) bump(d.pole);
  const poles = new Set(layer.poles.map((p) => p.id));
  const dropped = new Set(layer.drops.map((d) => d.building));
  const posts = new Set(layer.posts.map((q) => q.span));
  const roofs = new Map((layer.roofs ?? []).map((r) => [r.id, r] as const));
  const reach = job === undefined ? undefined : reachOf(job.district, job.blocks, layer);
  const usable = new Map<string, number>();
  for (const s of layer.roofSpans ?? []) {
    if (reach !== undefined && roofSpanFault(reach, s) !== null) continue;
    for (const e of [s.a, s.b]) if (roofs.has(e)) usable.set(e, (usable.get(e) ?? 0) + 1);
  }
  const seen = new Map<string, string>();
  for (const n of places) {
    const key = "pole" in n.place ? `pole ${n.place.pole}` : "building" in n.place ? `building ${n.place.building}` : "roof" in n.place ? `roof ${n.place.roof}` : `post ${n.place.post}`;
    const other = seen.get(key);
    if (other !== undefined) add(n.id, `shares ${key} with ${other} (one node per place)`);
    else seen.set(key, n.id);
    if ("pole" in n.place) {
      const need = POLE_NEEDS[n.type];
      if (n.type === "lamp" || need === undefined) add(n.id, `a ${n.type} cannot stand on a pole`);
      else if (!poles.has(n.place.pole)) add(n.id, `${n.place.pole} is not a pole`);
      else if ((attach.get(n.place.pole) ?? 0) < need) add(n.id, `a ${n.type} needs a pole with ${need} or more attachments; ${n.place.pole} has ${attach.get(n.place.pole) ?? 0}`);
    } else if ("building" in n.place) {
      if (n.type !== "lamp") add(n.id, `a ${n.type} cannot stand on a building`);
      else if (!dropped.has(n.place.building)) add(n.id, `${n.place.building} has no drop`);
    } else if ("roof" in n.place) {
      const r = roofs.get(n.place.roof);
      const need = roofNeed(n.type, n.degree ?? 0);
      if (r === undefined) add(n.id, `${n.place.roof} is not a roof structure place`);
      else {
        if ((usable.get(r.id) ?? 0) < need) add(n.id, `a ${n.type} on a roof needs ${need} or more roof span places the job may use; ${r.id} has ${usable.get(r.id) ?? 0}`);
        if (n.type === "feed" && reach !== undefined && reach.inside.has(r.block)) add(n.id, `a feed stands outside the district; ${r.id} is on ${r.block}`);
      }
    } else if (n.type !== "lamp") add(n.id, `a ${n.type} cannot stand on a lamp post`);
    else if (!posts.has(n.place.post)) add(n.id, `${n.place.post} is not a lamp-post place`);
  }
  return out;
}
