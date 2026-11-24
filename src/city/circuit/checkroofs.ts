/**
 * Stage 6's checks for the pole pick, CK7 and the roof places (ticket 081 K2d1): CK7 on the real models, CK17a to CK17d of `docs/design/081-B1-roof-spans.md`. Judged on a layer by the layers before it,
 * so a fixture can tamper with a layer and see the rule fail (R-2).
 */

import type { CityCircuitLayer, CityRoofMast } from "../../core";
import type { CircuitInput, CircuitProblem } from "./check";
import { WALK_FLOOR_M } from "./constants";
import { poleModelFor } from "./polemodel";
import { judgeSpan, len3, lowestOver, roofContext, type End } from "./roofgeom";
import { candidatesOf, layRoofs, roofEnd, roofSpanId } from "./roofplaces";
import { oppositeSide } from "./geometry";

type Judged = Pick<CityCircuitLayer, "poles" | "spans" | "lights" | "posts" | "poleModels"> & Partial<Pick<CityCircuitLayer, "drops" | "roofs" | "roofSpans" | "roofKeep">>;

const same = (a: number, b: number): boolean => Math.abs(a - b) < 1e-3;

/** CK7 on every pole span and the pole pick; CK17a to CK17d on the roof places, roof span places and keep squares when the layer has them. */
export function roofProblems(layer: Judged, input: CircuitInput): CircuitProblem[] {
  const out: CircuitProblem[] = [];
  const add = (rule: string, id: string, reason: string): number => out.push({ rule, id, reason });
  const ctx = roofContext(layer, input);
  const cands = new Map<string, ReturnType<typeof candidatesOf>>();
  const candOf = (r: CityRoofMast): ReturnType<typeof candidatesOf> => {
    let c = cands.get(r.id);
    if (c === undefined) cands.set(r.id, (c = candidatesOf(input, layer.poles, r)));
    return c;
  };

  // PK1 and CK7: every pole has its pick's model, and every pole span's lowest point is at least the walk's 4.2 m.
  for (const p of layer.poles) {
    const key = layer.poleModels[p.id];
    if (key === undefined) add("CK7", p.id, "a pole with no model in poleModels");
    else if (key !== poleModelFor(p.id)) add("CK7", p.id, `its model ${key} is not the pick ${poleModelFor(p.id)}`);
  }
  for (const s of layer.spans) {
    const e = ctx.spanEnds.get(s.id);
    if (e === undefined) continue;
    const low = lowestOver(e[0].y, e[1].y, len3(e[0], e[1]), 0, 1);
    if (low < WALK_FLOOR_M - 1e-9) add("CK7", s.id, `its lowest point is ${Math.round(low * 1000) / 1000} m, under ${WALK_FLOOR_M} m`);
  }
  // CK7 on drops (081 K2e): from the pole's axis at its lowest attachment to the wall at its height, sagging by `SAG_RATIO`. 059's 5.5 m does not bind a drop.
  for (const d of layer.drops ?? []) {
    const a = ctx.poleEnd.get(d.pole);
    if (a === undefined) continue;
    const b: End = { id: d.id, x: d.x_m, z: d.z_m, y: d.y_m };
    const low = lowestOver(a.y, b.y, len3(a, b), 0, 1);
    if (low < WALK_FLOOR_M - 1e-9) add("CK7", d.id, `its lowest point is ${Math.round(low * 1000) / 1000} m, under ${WALK_FLOOR_M} m`);
  }
  if (layer.roofs === undefined || layer.roofSpans === undefined || layer.roofKeep === undefined) return out;

  // CK17a: the places and the keep squares are exactly those the columns give.
  const want = layRoofs(input);
  const have = new Map(layer.roofs.map((r) => [r.id, r] as const));
  for (const w of want.roofs) {
    const r = have.get(w.id);
    if (r === undefined) add("CK17a", w.id, w.row === "corner" ? "a street corner roof with no structure" : "a mid column on a street with no place");
    else if (r.row !== w.row || r.block !== w.block || r.building !== w.building || r.sides.join() !== w.sides.join() || !same(r.x_m, w.x_m) || !same(r.z_m, w.z_m) || !same(r.deck_y_m, w.deck_y_m) || r.keep_half_m !== w.keep_half_m) {
      add("CK17a", w.id, `off its place: at (${r.x_m}, ${r.z_m}) on a deck at ${r.deck_y_m} m, not (${w.x_m}, ${w.z_m}) at ${w.deck_y_m} m`);
    }
  }
  const wanted = new Set(want.roofs.map((w) => w.id));
  for (const r of layer.roofs) if (!wanted.has(r.id)) add("CK17a", r.id, "a place on a column that is no street corner roof and no mid-row roof on a street");
  const keepWant = new Map(want.roofKeep.map((k) => [k.roof, k] as const));
  const keepHave = new Set(layer.roofKeep.map((k) => k.roof));
  for (const k of layer.roofKeep) {
    const w = keepWant.get(k.roof);
    if (w === undefined || !same(k.x_m, w.x_m) || !same(k.z_m, w.z_m) || k.half_m !== w.half_m) add("CK17a", k.roof, "a keep square that is not a corner place's");
  }
  for (const k of want.roofKeep) if (!keepHave.has(k.roof)) add("CK17a", k.roof, "a corner place with no keep square");

  // CK17b: no roof span is built scenery.
  for (const s of layer.spans) if (s.id.includes("roof:") || (s as { readonly kind: string }).kind === "roof") add("CK17b", s.id, "a roof span listed in spans, which holds only the poles' spans");

  // CK17b to d: each offered roof span place.
  const roofs = new Map(layer.roofs.map((r) => [r.id, r] as const));
  const poles = new Map(layer.poles.map((p) => [p.id, p] as const));
  const endOf = (id: string): End | undefined => {
    const r = roofs.get(id);
    return r !== undefined ? roofEnd(r) : ctx.poleEnd.get(id);
  };
  const offered = new Set<string>();
  for (const s of layer.roofSpans) {
    offered.add(s.id);
    const ea = endOf(s.a);
    const eb = endOf(s.b);
    const ra = roofs.get(s.a);
    const rb = roofs.get(s.b);
    if (ea === undefined || eb === undefined || s.id !== roofSpanId(s.a, s.b) || s.a >= s.b) {
      add("CK17b", s.id, "a roof span whose ends are not two sorted ids of roof structures or poles");
      continue;
    }
    if (ra === undefined && rb === undefined) {
      add("CK17b", s.id, "a diagonal with two pole ends");
      continue;
    }
    const j = judgeSpan(ctx, ea, eb);
    for (const p of j.problems) add(p.rule, s.id, p.reason);
    if (j.over !== s.over || j.street !== s.street || j.junction !== s.junction || !same(j.len_m, s.len_m)) add("CK17b", s.id, `declared over ${s.over} (${s.street ?? s.junction ?? "-"}, ${s.len_m} m); it passes over ${j.over} (${j.street ?? j.junction ?? "-"}, ${j.len_m} m)`);
    if (s.over === "junction" && (ra?.row === "mid" || rb?.row === "mid")) add("CK17b", s.id, "a mid-row place has no junction span");
    if (!offeredTo(candOf, [ra, rb], poles.get(ra === undefined ? s.a : s.b), s.over)) add("CK17c", s.id, `not a ${s.over} place the CK17c offers`);
  }
  // CK17c: every nearest pole that passes is offered.
  for (const r of layer.roofs) {
    for (const p of candOf(r).pavement) {
      const e = ctx.poleEnd.get(p.id);
      if (e === undefined || offered.has(roofSpanId(r.id, p.id))) continue;
      const j = judgeSpan(ctx, roofEnd(r), e);
      if (j.problems.length === 0 && j.over === "pavement") add("CK17c", roofSpanId(r.id, p.id), `one of ${r.id}'s two nearest poles that passes, and it is not offered`);
    }
  }
  return out;
}

/** CK17c: whether a roof span place of this kind is one a roof end is offered. */
function offeredTo(candOf: (r: CityRoofMast) => ReturnType<typeof candidatesOf>, ends: readonly [CityRoofMast | undefined, CityRoofMast | undefined], pole: { readonly id: string; readonly block: string; readonly side: string; readonly kind: string } | undefined, over: string): boolean {
  const roofs = ends.filter((r): r is CityRoofMast => r !== undefined);
  for (const r of roofs) {
    const c = candOf(r);
    if (over === "pavement") {
      if (pole !== undefined && c.pavement.some((p) => p.id === pole.id)) return true;
      continue;
    }
    const blocks = over === "street" ? c.facing : c.diagonal === null ? [] : [c.diagonal];
    if (pole !== undefined) {
      if (pole.kind !== "slot" && blocks.includes(pole.block) && r.sides.some((s) => oppositeSide(s) === pole.side)) return true;
    } else {
      const o = roofs.find((x) => x !== r);
      if (o !== undefined && blocks.includes(o.block)) return true;
    }
  }
  return false;
}
