/**
 * Ticket 081 K3: the circuit drawn on the city (stage 6, dead). `circuitDraws` is pure: the layer (and, optionally, a job) in, the list of what stands where out (poles, the feed's pick, roof structures and
 * their code arms, component models, street lights, the damaged-line prop, and every wire as fitted pieces). `circuitGroup` turns that list into instanced meshes from the loaded roots, with a placeholder
 * wherever a key is null or its model did not load. Nothing here is live: pulses, glow and the Relight are E2's.
 *
 * Reads, never decides: `poleModels` (stage 6's pick), `COMPONENT_MODELS` (D3), the power kit (`placePole`, `fitLine`, `POWER_LINES`), stage 6's own heights (`GROUND_POLE_ATTACH_UP_M`, `ROOF_MAST_ATTACH_MIN_M`,
 * `SAG_RATIO`). Metres in the types that name a place in the plan, world units (`WORLD_PER_METRE` per metre) in what is drawn.
 */

import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, MeshStandardMaterial, Quaternion, Vector3, type Material, type Object3D } from "three";
import { GROUND_POLE_MIX, type CircuitComponent, type CityCircuitLayer, type CityNodePlace, type CityPlanStreet, type CityPuzzleConverted, type CityRoofMast, type CityStreetsLayer, type GridNode } from "../core";
import { ROOF_MAST_ATTACH_MIN_M, SAG_RATIO } from "../city/circuit/constants";
import { COMPONENT_MODELS } from "./componentmodels";
import type { Vec3 } from "./kitunits";
import { WORLD_PER_METRE } from "./models";
import { meshParts } from "./models3d";
import { FEED_POLES, FEED_POLE_KEY, POWER_LINE, POWER_LINES, POWER_POLES, placePole, fitLine, type LinePlacement, type PowerPole } from "./powerkit";

const S = WORLD_PER_METRE;

/** CK10 (059's approved default, Josh, 18 Nov 2026: "Approve 057, 058 and 059"): the Town Pack's street lamp. Never the puzzle's `lampPost` pick (CK11; 059: "Puzzle lamps and street lights never share a model"). */
export const STREET_LIGHT_KEY = "town-pack:SM_Prop_Streetlamp_01";

/** The roof structure's cross-arm is code-drawn: its underside is at the deck plus `ROOF_MAST_ATTACH_MIN_M`, so a wire on it is never lower than stage 6 judged. Metres. */
export const ROOF_ARM = { w_m: 1.6, h_m: 0.1, d_m: 0.1 } as const;
/** A component on a pole stands this far out from the post's axis, toward the street, and its top this far under the pole's lowest attachment (metres). */
export const ON_POLE_OFFSET_M = 0.35;
export const ON_POLE_GAP_M = 0.6;
/** A component on a roof structure stands this far along the structure's street side, with its base this far above the deck (metres). */
export const ON_ROOF_OFFSET_M = 0.45;
export const ON_ROOF_BASE_M = 0.3;
/** A damaged-line prop hangs from the wire's low point: its height (SM_Prop_Cable_09, 1.352 m) is below it. */
export const CUT_PROP_H_M = 1.352;

/** Each component model's height (m), from the converted manifest (23 Nov 2026), so a pole-mounted one can stand below the pole's lowest attachment. */
export const COMPONENT_H_M: Readonly<Record<CircuitComponent, number>> = {
  feed: 10.833,
  breaker: 1.879,
  switch: 2.752,
  relay: 0.921,
  spring: 0.703,
  fusebox: 0.739,
  junction: 0.703,
  battery: 1.103,
  lampBuilding: 0.72,
  lampPost: 5.4,
  damagedLine: CUT_PROP_H_M,
  roofMast: 7.86,
};

/** A job the circuit may be drawn for: the conversion, and the cut faults whose break is readable now (E2 passes the set from `GridState`). */
export interface CircuitJob {
  readonly converted: Pick<CityPuzzleConverted, "puzzle" | "places" | "runs" | "cuts">;
  readonly readable?: ReadonlySet<string>;
}

export type CircuitRole = "pole" | "feed" | "roofMast" | "component" | "light" | "cutProp";

/** One model standing somewhere: `key` null draws a placeholder. `position` is the model's origin in world units, `yaw` its turn about y, `scale` units per metre. */
export interface CircuitPiece {
  readonly id: string;
  readonly role: CircuitRole;
  readonly key: string | null;
  readonly component?: CircuitComponent;
  readonly position: Vec3;
  readonly yaw: number;
  readonly scale: number;
}

/** A roof structure's code arm: a box `w_m` along its local x, centred at `position` (world units), turned `yaw`. */
export interface CircuitArm {
  readonly id: string;
  readonly position: Vec3;
  readonly yaw: number;
}

export type CircuitWireKind = "span" | "roofSpan" | "drop";

/** One wire: the two attachment points (world units) and the pieces `fitLine` hung between them. */
export interface CircuitWire {
  readonly id: string;
  readonly kind: CircuitWireKind;
  readonly from: Vec3;
  readonly to: Vec3;
  readonly pieces: readonly LinePlacement[];
}

export interface CircuitDraws {
  readonly pieces: readonly CircuitPiece[];
  readonly arms: readonly CircuitArm[];
  readonly wires: readonly CircuitWire[];
}

const poleOfKey = (key: string): PowerPole | undefined => FEED_POLES[key] ?? POWER_POLES[key];
/** Stage 6's reading of a pole's end: the lowest of its three attachments (`poleEndHeight`), metres. */
export const lowestAttach = (pole: PowerPole): number => Math.min(...pole.attach_m.map((a) => a.up));

/** The unit vector from a pavement toward its carriageway (the pole stands `POLE_FROM_KERB_M` in from the kerb): `lo` is on the low side of the street's across axis, `hi` on the high side. */
export function toCarriageway(street: Pick<CityPlanStreet, "axis"> | undefined, pavement: "lo" | "hi"): { x: number; z: number } {
  const sign = pavement === "lo" ? 1 : -1;
  return street?.axis === "z" ? { x: sign, z: 0 } : { x: 0, z: sign };
}

const yawToward = (d: { x: number; z: number }): number => Math.atan2(d.x, d.z);

/** The component a node stands as: a switch is a spring or a relay where it says so. */
export function componentOf(node: GridNode, place: CityNodePlace): CircuitComponent {
  switch (node.type) {
    case "feed":
      return "feed";
    case "breaker":
      return "breaker";
    case "switch":
      return node.spring === true ? "spring" : node.relay === true ? "relay" : "switch";
    case "fusebox":
      return "fusebox";
    case "junction":
      return "junction";
    case "battery":
      return "battery";
    case "lamp":
      return "post" in place ? "lampPost" : "lampBuilding";
  }
}

/** The roof ids a job stands: the places on a roof, and the roof ends of the roof spans its runs use. */
function usedRoofSpans(layer: CityCircuitLayer, job: CircuitJob | undefined): ReadonlySet<string> {
  const used = new Set<string>();
  if (!job) return used;
  const offered = new Set((layer.roofSpans ?? []).map((s) => s.id));
  for (const run of Object.values(job.converted.runs)) for (const id of run.spans) if (offered.has(id)) used.add(id);
  return used;
}

/**
 * Everything the circuit draws, pure. With no job: every pole on its `poleModels` model, every span and drop as wire pieces, every street light, every corner roof's structure and arm. With a job: also each node's
 * model at its place (the feed's pick replacing its pole), the mid-row roof structures and roof spans the job uses, and the damaged-line prop at each cut in `readable`.
 */
export function circuitDraws(layer: CityCircuitLayer, streets: CityStreetsLayer | undefined, job?: CircuitJob): CircuitDraws {
  const pieces: CircuitPiece[] = [];
  const arms: CircuitArm[] = [];
  const wires: CircuitWire[] = [];
  const streetOf = new Map<string, CityPlanStreet>((streets?.streets ?? []).map((s) => [s.id, s] as const));
  const poleById = new Map(layer.poles.map((p) => [p.id, p] as const));
  const roofs = layer.roofs ?? [];
  const roofById = new Map<string, CityRoofMast>(roofs.map((r) => [r.id, r] as const));
  const places = job?.converted.places ?? {};
  const nodes = job?.converted.puzzle.nodes ?? [];

  // The feed stands on a pole: its pick replaces that pole's model. A feed on a roof stands as the roof structure alone.
  const feedPole = new Map<string, string>();
  for (const n of nodes) {
    const place = places[n.id];
    if (n.type === "feed" && place && "pole" in place) feedPole.set(place.pole, n.id);
  }

  const modelOf = (poleId: string): string => (feedPole.has(poleId) ? (COMPONENT_MODELS.feed.key ?? FEED_POLE_KEY) : layer.poleModels[poleId] ?? GROUND_POLE_MIX[0]);
  const poleFor = (poleId: string): PowerPole => poleOfKey(modelOf(poleId)) ?? POWER_POLES[GROUND_POLE_MIX[0]]!;

  // Poles.
  const endOf = new Map<string, Vec3>();
  for (const p of layer.poles) {
    const street = streetOf.get(p.street);
    const pole = poleFor(p.id);
    const run = street?.axis === "z" ? { x: 0, z: 1 } : { x: 1, z: 0 };
    const t = placePole(pole, { x: p.x_m * S, y: 0, z: p.z_m * S }, run, pole.attach_m[0].up * S, S);
    const isFeed = feedPole.has(p.id);
    pieces.push({ id: p.id, role: isFeed ? "feed" : "pole", key: modelOf(p.id), ...(isFeed ? { component: "feed" as const } : {}), position: t.position, yaw: t.yaw, scale: S });
    endOf.set(p.id, { x: p.x_m * S, y: lowestAttach(pole) * S, z: p.z_m * S });
  }

  // Roof structures: every corner place, and the mid-row places a job uses.
  const usedSpans = usedRoofSpans(layer, job);
  const midUsed = new Set<string>();
  for (const place of Object.values(places)) if ("roof" in place) midUsed.add(place.roof);
  for (const s of layer.roofSpans ?? []) {
    if (!usedSpans.has(s.id)) continue;
    midUsed.add(s.a);
    midUsed.add(s.b);
  }
  const roofKey = COMPONENT_MODELS.roofMast.key;
  const seatY_m = (r: CityRoofMast): number => r.deck_y_m + ROOF_MAST_ATTACH_MIN_M + ROOF_ARM.h_m;
  for (const r of roofs) {
    if (r.row === "mid" && !midUsed.has(r.id)) continue;
    pieces.push({ id: r.id, role: "roofMast", key: roofKey, component: "roofMast", position: { x: r.x_m * S, y: r.deck_y_m * S, z: r.z_m * S }, yaw: 0, scale: S });
    const along = r.sides[0] === "+x" || r.sides[0] === "-x" ? Math.PI / 2 : 0;
    arms.push({ id: r.id, position: { x: r.x_m * S, y: (r.deck_y_m + ROOF_MAST_ATTACH_MIN_M + ROOF_ARM.h_m / 2) * S, z: r.z_m * S }, yaw: along });
    endOf.set(r.id, { x: r.x_m * S, y: seatY_m(r) * S, z: r.z_m * S });
  }

  // Wires.
  const wire = POWER_LINES[POWER_LINE]!;
  const hang = (id: string, kind: CircuitWireKind, a: Vec3 | undefined, b: Vec3 | undefined): void => {
    if (!a || !b || Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) < 1e-9) return;
    wires.push({ id, kind, from: a, to: b, pieces: fitLine(wire, a, b, SAG_RATIO, S) });
  };
  for (const s of layer.spans) hang(s.id, "span", endOf.get(s.a), endOf.get(s.b));
  for (const s of layer.roofSpans ?? []) if (usedSpans.has(s.id)) hang(s.id, "roofSpan", endOf.get(s.a), endOf.get(s.b));
  for (const d of layer.drops) hang(d.id, "drop", endOf.get(d.pole), { x: d.x_m * S, y: d.y_m * S, z: d.z_m * S });

  // Street lights (CK10): scenery, on the pavement with no pole line.
  for (const l of layer.lights) {
    const n = toCarriageway(streetOf.get(l.street), l.pavement);
    pieces.push({ id: l.id, role: "light", key: STREET_LIGHT_KEY, position: { x: l.x_m * S, y: 0, z: l.z_m * S }, yaw: yawToward(n), scale: S });
  }

  if (job) {
    const dropOf = new Map(layer.drops.map((d) => [d.building, d] as const));
    const spanById = new Map(layer.spans.map((s) => [s.id, s] as const));
    const postById = new Map(layer.posts.map((p) => [p.span, p] as const));
    const onPlace = new Map<string, number>();
    for (const node of nodes) {
      const place = places[node.id];
      if (!place) continue;
      const component = componentOf(node, place);
      if (component === "feed" && "pole" in place) continue; // the feed's pole is its pick
      const key = COMPONENT_MODELS[component].key;
      const h = COMPONENT_H_M[component];
      const slot = (id: string): number => {
        const n = onPlace.get(id) ?? 0;
        onPlace.set(id, n + 1);
        return n;
      };
      if ("pole" in place) {
        const p = poleById.get(place.pole);
        if (!p) continue;
        const street = streetOf.get(p.street);
        const n = toCarriageway(street, p.pavement);
        const base = lowestAttach(poleFor(p.id)) - ON_POLE_GAP_M - h - slot(place.pole) * 1.0;
        pieces.push({ id: node.id, role: "component", key, component, position: { x: (p.x_m + n.x * ON_POLE_OFFSET_M) * S, y: Math.max(base, 0) * S, z: (p.z_m + n.z * ON_POLE_OFFSET_M) * S }, yaw: yawToward(n), scale: S });
      } else if ("roof" in place) {
        const r = roofById.get(place.roof);
        if (!r) continue;
        const side = r.sides[0] ?? "+z";
        const d = side === "+x" ? { x: 1, z: 0 } : side === "-x" ? { x: -1, z: 0 } : side === "+z" ? { x: 0, z: 1 } : { x: 0, z: -1 };
        pieces.push({ id: node.id, role: "component", key, component, position: { x: (r.x_m + d.x * ON_ROOF_OFFSET_M) * S, y: (r.deck_y_m + ON_ROOF_BASE_M + slot(place.roof) * 1.0) * S, z: (r.z_m + d.z * ON_ROOF_OFFSET_M) * S }, yaw: yawToward(d), scale: S });
      } else if ("building" in place) {
        const d = dropOf.get(place.building);
        if (!d) continue;
        const p = poleById.get(d.pole);
        const out = p ? { x: p.x_m - d.x_m, z: p.z_m - d.z_m } : { x: 0, z: 1 };
        const len = Math.hypot(out.x, out.z) || 1;
        const n = { x: out.x / len, z: out.z / len };
        pieces.push({ id: node.id, role: "component", key, component, position: { x: (d.x_m + n.x * 0.1) * S, y: d.y_m * S, z: (d.z_m + n.z * 0.1) * S }, yaw: yawToward(n), scale: S });
      } else {
        const post = postById.get(place.post);
        const span = spanById.get(place.post);
        const pole = span ? poleById.get(span.a) : undefined;
        if (!post) continue;
        const n = toCarriageway(pole ? streetOf.get(pole.street) : undefined, pole?.pavement ?? "lo");
        pieces.push({ id: node.id, role: "component", key, component, position: { x: post.x_m * S, y: component === "lampPost" ? 0 : 1.0 * S, z: post.z_m * S }, yaw: yawToward(n), scale: S });
      }
    }

    // The damaged-line prop: only while its break is readable, hung from the cut span's low point.
    const cutKey = COMPONENT_MODELS.damagedLine.key;
    const allSpans = new Map<string, { a: string; b: string }>([...layer.spans, ...(layer.roofSpans ?? [])].map((s) => [s.id, s] as const));
    for (const [faultId, spanId] of Object.entries(job.converted.cuts)) {
      if (!job.readable?.has(faultId)) continue;
      const s = allSpans.get(spanId);
      const a = s ? endOf.get(s.a) : undefined;
      const b = s ? endOf.get(s.b) : undefined;
      if (!a || !b) continue;
      const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      const low = (a.y + b.y) / 2 - SAG_RATIO * len;
      pieces.push({ id: faultId, role: "cutProp", key: cutKey, component: "damagedLine", position: { x: (a.x + b.x) / 2, y: low - CUT_PROP_H_M * S, z: (a.z + b.z) / 2 }, yaw: Math.atan2(b.x - a.x, b.z - a.z), scale: S });
    }
  }
  return { pieces, arms, wires };
}

/** The lowest point of a wire between two attachment points, as `fitLine` hangs it (world units). */
export function wireLow(from: Vec3, to: Vec3): number {
  return (from.y + to.y) / 2 - SAG_RATIO * Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}

// ---- keys ----

/** One list of the circuit's keys, for R12 (`planAudit`) and for the loader. */
export interface CircuitKeyUse {
  readonly list: "poles" | "feed" | "spans" | "drops" | "roofs" | "components" | "lights";
  readonly key: string;
}

/** Every key the circuit can draw, by list: the ground mix, the feed pick, the wire piece on spans and drops, the roof structure, every non-null component pick, and the street light. */
export function circuitKeyUses(): CircuitKeyUse[] {
  const out: CircuitKeyUse[] = [];
  for (const key of GROUND_POLE_MIX) out.push({ list: "poles", key });
  out.push({ list: "feed", key: COMPONENT_MODELS.feed.key ?? FEED_POLE_KEY });
  out.push({ list: "spans", key: POWER_LINE }, { list: "drops", key: POWER_LINE });
  if (COMPONENT_MODELS.roofMast.key) out.push({ list: "roofs", key: COMPONENT_MODELS.roofMast.key });
  for (const [c, p] of Object.entries(COMPONENT_MODELS)) if (p.key && c !== "feed" && c !== "roofMast") out.push({ list: "components", key: p.key });
  out.push({ list: "lights", key: STREET_LIGHT_KEY });
  return out;
}

/** The distinct keys the loader asks for to draw the circuit. */
export function circuitKeys(): string[] {
  return [...new Set(circuitKeyUses().map((u) => u.key))];
}

// ---- three ----

export interface CircuitDrawn {
  readonly group: Group;
  /** InstancedMeshes and line sets in `group` (draw calls). */
  readonly calls: number;
  /** Pieces drawn as a placeholder box: a null key, or a model that did not load. */
  readonly placeholders: number;
  /** Instances per key (every drawn model, and the wire piece's pieces). */
  readonly perKey: ReadonlyMap<string, number>;
  dispose(): void;
}

const UP = new Vector3(0, 1, 0);
const ONE = new Vector3(1, 1, 1);
const PLACEHOLDER_M = 0.5;

function pieceMatrix(p: Pick<CircuitPiece, "position" | "yaw" | "scale">, out: Matrix4): Matrix4 {
  return out.compose(new Vector3(p.position.x, p.position.y, p.position.z), new Quaternion().setFromAxisAngle(UP, p.yaw), ONE.clone().setScalar(p.scale));
}

/** A circuit model is drawn dark: a material that carries emission is swapped for a clone with none (E2 lights things live). */
function darkOf(m: Material, owned: Material[], swapped: Map<Material, Material>): Material {
  const lit = m as Material & { emissive?: { getHex(): number }; emissiveMap?: unknown };
  if (!lit.emissive || (lit.emissive.getHex() === 0 && !lit.emissiveMap)) return m;
  let c = swapped.get(m);
  if (!c) {
    c = m.clone();
    const dark = c as typeof lit & { emissive: { setHex(n: number): void }; emissiveMap: unknown };
    dark.emissive.setHex(0);
    dark.emissiveMap = null;
    swapped.set(m, c);
    owned.push(c);
  }
  return c;
}

/**
 * Draw a list from the loaded roots: one InstancedMesh per sub-mesh per key, the wire pieces on the wire piece's own meshes (a thin dark line set when it did not load), the roof arms in one box instancer, and every piece
 * with no key or no loaded model as a placeholder box (one instancer). Nothing takes a ray. A key with no root, or no mesh in it, never throws.
 */
export function circuitGroup(draws: CircuitDraws, roots: ReadonlyMap<string, Object3D>): CircuitDrawn {
  const group = new Group();
  group.name = "plan:circuit";
  group.userData["sharedModel"] = true;
  group.raycast = () => {};
  const owned: Material[] = [];
  const geoms: BufferGeometry[] = [];
  const meshes: Array<InstancedMesh | LineSegments> = [];
  const swapped = new Map<Material, Material>();
  const perKey = new Map<string, number>();
  const m = new Matrix4();
  const world = new Matrix4();
  let calls = 0;
  const add = (o: InstancedMesh | LineSegments): void => {
    o.raycast = () => {};
    group.add(o);
    meshes.push(o);
    calls++;
  };

  const byKey = new Map<string, CircuitPiece[]>();
  const holders: CircuitPiece[] = [];
  for (const p of draws.pieces) {
    const parts = p.key !== null && roots.has(p.key) ? meshParts(roots.get(p.key)!) : [];
    if (p.key === null || parts.length === 0) {
      holders.push(p);
      continue;
    }
    const list = byKey.get(p.key);
    if (list) list.push(p);
    else byKey.set(p.key, [p]);
  }
  for (const [key, list] of byKey) {
    perKey.set(key, list.length);
    for (const part of meshParts(roots.get(key)!)) {
      const src = part.mesh.material as Material | Material[];
      const material = Array.isArray(src) ? src.map((s) => darkOf(s, owned, swapped)) : darkOf(src, owned, swapped);
      const im = new InstancedMesh(part.mesh.geometry, material, list.length);
      im.name = `circuit:${key.slice(key.indexOf(":") + 1)}`;
      list.forEach((p, i) => im.setMatrixAt(i, world.multiplyMatrices(pieceMatrix(p, m), part.local)));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      add(im);
    }
  }

  // The wires.
  const wirePieces = draws.wires.flatMap((w) => w.pieces);
  const wireRoot = roots.get(POWER_LINE);
  const wireParts = wireRoot ? meshParts(wireRoot) : [];
  if (wirePieces.length > 0 && wireParts.length > 0) {
    perKey.set(POWER_LINE, wirePieces.length);
    for (const part of wireParts) {
      const src = part.mesh.material as Material | Material[];
      const material = Array.isArray(src) ? src.map((s) => darkOf(s, owned, swapped)) : darkOf(src, owned, swapped);
      const im = new InstancedMesh(part.mesh.geometry, material, wirePieces.length);
      im.name = "circuit:wire";
      wirePieces.forEach((w, i) => im.setMatrixAt(i, world.multiplyMatrices(m.fromArray(w.matrix as number[]), part.local)));
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      add(im);
    }
  } else if (draws.wires.length > 0) {
    // No wire model: each wire is a sagged polyline of eight segments.
    const SEG = 8;
    const pos: number[] = [];
    for (const w of draws.wires) {
      const len = Math.hypot(w.to.x - w.from.x, w.to.y - w.from.y, w.to.z - w.from.z);
      let prev = w.from;
      for (let j = 1; j <= SEG; j++) {
        const t = j / SEG;
        const next = { x: w.from.x + (w.to.x - w.from.x) * t, y: w.from.y + (w.to.y - w.from.y) * t - SAG_RATIO * len * 4 * t * (1 - t), z: w.from.z + (w.to.z - w.from.z) * t };
        pos.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
        prev = next;
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geoms.push(g);
    const mat = new LineBasicMaterial({ color: 0x1b1c1e });
    owned.push(mat);
    const ls = new LineSegments(g, mat);
    ls.name = "circuit:wire-code";
    add(ls);
  }

  // The roof arms.
  if (draws.arms.length > 0) {
    const g = new BoxGeometry(ROOF_ARM.w_m * S, ROOF_ARM.h_m * S, ROOF_ARM.d_m * S);
    const mat = new MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.8, metalness: 0.3 });
    geoms.push(g);
    owned.push(mat);
    const im = new InstancedMesh(g, mat, draws.arms.length);
    im.name = "circuit:roof-arm";
    draws.arms.forEach((a, i) => im.setMatrixAt(i, pieceMatrix({ position: a.position, yaw: a.yaw, scale: 1 }, m)));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    add(im);
  }

  // Placeholders.
  if (holders.length > 0) {
    const g = new BoxGeometry(PLACEHOLDER_M * S, PLACEHOLDER_M * S, PLACEHOLDER_M * S);
    const mat = new MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.9 });
    geoms.push(g);
    owned.push(mat);
    const im = new InstancedMesh(g, mat, holders.length);
    im.name = "circuit:placeholder";
    holders.forEach((p, i) => im.setMatrixAt(i, pieceMatrix({ position: { x: p.position.x, y: p.position.y + (PLACEHOLDER_M / 2) * S, z: p.position.z }, yaw: p.yaw, scale: 1 }, m)));
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    add(im);
  }
  return {
    group,
    calls,
    placeholders: holders.length,
    perKey,
    dispose() {
      for (const o of meshes) if ((o as InstancedMesh).isInstancedMesh) (o as InstancedMesh).dispose();
      for (const g of geoms) g.dispose();
      for (const o of owned) o.dispose();
      owned.length = 0;
      geoms.length = 0;
      meshes.length = 0;
    },
  };
}
