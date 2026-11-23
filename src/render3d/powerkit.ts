/**
 * Ticket 071 B: the power kit, pure. Which poles and which wire piece the packs give, how each stands, which stands at which spot, and how the
 * wire piece hangs between any two attachment points. The ladder (071 C) and the pipeline city (070 K3) both draw from these tables; each
 * view supplies only its scale, its spots and its spans. No three, no DOM; the only imports are the pure layout types and `stableHash`.
 *
 * Every number is typed in, in metres of the converted GLB (the model's own frame: y up, the origin at the foot), from 071 A's pre-check
 * (`docs/design/071-power-kit-precheck.md`, sections 2 and 3) and B's own re-measure from the GLBs (21 Nov 2026). Keys are `pack:name`.
 * Where B's measure differs from A's note, the table follows the GLB (see the comments on Palm `_02`).
 *
 * The frame of a pole: `armAxis` is the model axis the cross-arm runs along (z for Apocalypse, x for Palm). The other horizontal
 * model axis is the one the wires run along: the attachments sit `along_m` in front of the post on it (positive model direction).
 * `across` is measured on the arm axis from the post's axis (`foot_m`), `up` is the height of the wire's seat.
 */

import type { Vec3 } from "./layout";
import { stableHash } from "../render/city";

/** A named failure of the kit's own checks. */
export class PowerKitError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PowerKitError";
    this.code = code;
  }
}

/** One wire attachment of a pole. */
export interface PoleAttach {
  /** Along the arm from the post's axis (m). */
  across: number;
  /** Height of the wire's seat (m): the insulator's top, or the arm's top plus a code insulator where the model has none. */
  up: number;
  /** The model carries its own insulator here; otherwise the view draws a code one. */
  ownInsulator: boolean;
  /** The model's own highest point at this spot (m): equals `up` where the model has an insulator, the arm or bar top where it has none. */
  surface_m: number;
}

export interface PowerPole {
  key: string;
  /** Top of the model (m). */
  height_m: number;
  armAxis: "x" | "z";
  /** The post's axis at the base, in model x and z (m). */
  foot_m: { x: number; z: number };
  /** How far the attachments sit from the post's axis along the wires' direction (m, the mean of the outer pair). */
  along_m: number;
  /** Centre first, then the outer with the lower `across`, then the outer with the higher. The wires' line is the midpoint of the outer pair. */
  attach_m: readonly [PoleAttach, PoleAttach, PoleAttach];
}

export interface LineEnd {
  /** Along the piece (model z), up, and across (model x), in metres from the origin. */
  along: number;
  up: number;
  across: number;
}

/** A single-strand wire piece. It runs along model z, level, with a sag in the middle. */
export interface PowerLine {
  key: string;
  /** End to end along z (m). */
  length_m: number;
  conductors: number;
  ends_m: readonly [LineEnd, LineEnd];
  /** The centre line's mid-span drop below the ends, as a fraction of `length_m` (the view's `SAG_RATIO` is 0.04). */
  sag: number;
  /** Half the cross-section (m). */
  radius_m: number;
  /** The largest gap to a 4t(1-t) parabola after a vertical scale fit (m), A's note. */
  residual_m: number;
}

/** The three picked poles (Josh, 21 Nov 2026; the Sci-Fi City poles were ruled out of the ground mix the same day). */
export const POWER_POLES: Readonly<Record<string, PowerPole>> = {
  "apocalypse-power:SM_Prop_Powerpole_01": {
    key: "apocalypse-power:SM_Prop_Powerpole_01",
    height_m: 6.303,
    armAxis: "z",
    foot_m: { x: 0.163, z: 0.005 },
    along_m: 0.169,
    attach_m: [
      // The upper arm's centre has no insulator of its own: a code insulator goes here, at the outer pair's height.
      { across: -0.025, up: 5.862, ownInsulator: false, surface_m: 5.7 },
      { across: -0.882, up: 5.862, ownInsulator: true, surface_m: 5.862 },
      { across: 0.833, up: 5.862, ownInsulator: true, surface_m: 5.862 },
    ],
  },
  "palm-city-pack:SM_Prop_Powerpole_01": {
    key: "palm-city-pack:SM_Prop_Powerpole_01",
    height_m: 8.989,
    armAxis: "x",
    foot_m: { x: 0, z: -0.055 },
    along_m: 0.17,
    attach_m: [
      // The centre insulator is off the arm's middle (0.2 m): the wire's line is the outer pair's midpoint, and the centre insulator is that far off it.
      { across: 0.225, up: 8.53, ownInsulator: true, surface_m: 8.53 },
      { across: -0.833, up: 8.548, ownInsulator: true, surface_m: 8.548 },
      { across: 0.882, up: 8.548, ownInsulator: true, surface_m: 8.548 },
    ],
  },
  "palm-city-pack:SM_Prop_Powerpole_02": {
    key: "palm-city-pack:SM_Prop_Powerpole_02",
    height_m: 9.009,
    armAxis: "x",
    foot_m: { x: 0.056, z: 0.086 },
    // A's note says 0.05; against the foot's axis the three insulators' mean is 0.011 (the post leans).
    along_m: 0.011,
    attach_m: [
      // The makeshift pole: a crooked arm. The outer ends are 0.32 m apart in height, and the centre insulator is 0.4 m off the wires' line.
      { across: -0.454, up: 8.47, ownInsulator: true, surface_m: 8.47 },
      { across: -0.894, up: 8.407, ownInsulator: true, surface_m: 8.407 },
      { across: 0.79, up: 8.731, ownInsulator: true, surface_m: 8.731 },
    ],
  },
};

/** The picked wire piece: City Pack `SM_Prop_Power_Cables_03`, a single strand, level, one primitive of 56 triangles. */
export const POWER_LINES: Readonly<Record<string, PowerLine>> = {
  "city-pack:SM_Prop_Power_Cables_03": {
    key: "city-pack:SM_Prop_Power_Cables_03",
    length_m: 13.487,
    conductors: 1,
    ends_m: [
      { along: -6.7437, up: 0.5798, across: 0 },
      { along: 6.7437, up: 0.5798, across: 0 },
    ],
    sag: 0.0404,
    radius_m: 0.0318,
    residual_m: 0.019,
  },
};

/** The three picked poles, in the order Josh named them. */
export const POWER_MIX: readonly string[] = [
  "apocalypse-power:SM_Prop_Powerpole_01",
  "palm-city-pack:SM_Prop_Powerpole_01",
  "palm-city-pack:SM_Prop_Powerpole_02",
];
/** The one wire piece for every line (Josh, 21 Nov 2026). */
export const POWER_LINE = "city-pack:SM_Prop_Power_Cables_03";

/** A span's piece is stretched along its length from this to this multiple of its (scaled) length; longer spans chain pieces. The floor is not enforced: a shorter span is still one piece. */
export const LINE_STRETCH_MIN = 0.25;
export const LINE_STRETCH_MAX = 1.25;
/** Ladder units per metre of a pack piece's length: today's pole scale (1.6 / 6.303), one number for every line whatever poles it hangs from. */
export const LADDER_LINE_SCALE = 0.254;
/** Ladder strands' radius (units): just under the live overlay's (0.0336) minus 0.005 (Q18, Josh 21 Nov 2026). In the city, strands are true size. */
export const LADDER_STRAND_RADIUS = 0.0286;
/** The Palm poles are stretched this much across the arm on the ladder only, so the outer wires land on their insulators (Q17, Josh 21 Nov 2026). */
export const PALM_ACROSS_STRETCH = 1.37;

const EPS = 1e-9;

function need<T>(table: Readonly<Record<string, T>>, key: string, what: string): T {
  const v = table[key];
  if (!v) throw new PowerKitError("unknown-key", `no ${what} named ${key}`);
  return v;
}

/** The pole with this key; throws a PowerKitError if it is not in the table. */
export function poleOf(key: string): PowerPole {
  return need(POWER_POLES, key, "pole");
}
/** The wire piece with this key; throws a PowerKitError if it is not in the table. */
export function lineOfKey(key: string): PowerLine {
  return need(POWER_LINES, key, "wire piece");
}

/** The ladder's across factor for a pole: PALM_ACROSS_STRETCH for the Palm poles, 1 for the rest. The city passes 1 for all. */
export function ladderAcross(key: string): number {
  return key.startsWith("palm-city-pack:") ? PALM_ACROSS_STRETCH : 1;
}
/** The scale (units per metre) that puts a pole's centre attachment at `attachY` (041 Q3: poles are the scale exception). */
export function poleScaleFor(pole: PowerPole, attachY: number): number {
  return attachY / pole.attach_m[0].up;
}
/** The arm-axis position of the wires' line: the midpoint of the outer pair. */
export function anchorAcross(pole: PowerPole): number {
  return (pole.attach_m[1].across + pole.attach_m[2].across) / 2;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Which pole stands at a spot: a pure function of the list and the id, through `stableHash`. A spot id of the form `<run>#<index>` starts from the
 * run's hash and steps through the list by a step coprime with its length, so neighbouring spots on a run never share a pole when the list has two
 * or more. Any other id is `stableHash(id)` modulo the list.
 */
export function poleAt(list: readonly string[], spotId: string): string {
  if (list.length === 0) throw new PowerKitError("empty-list", "the pole list is empty");
  const n = list.length;
  if (n === 1) return list[0]!;
  const m = /^(.*)#(\d+)$/.exec(spotId);
  if (!m) return list[stableHash(spotId) % n]!;
  const h = stableHash(m[1]!);
  const steps: number[] = [];
  for (let s = 1; s < n; s++) if (gcd(n, s) === 1) steps.push(s);
  const step = steps[(h >>> 8) % steps.length]!;
  return list[(h + Number(m[2]) * step) % n]!;
}

/** One wire piece for a whole line, by `stableHash` of the line's id. */
export function lineOf(list: readonly string[], lineId: string): string {
  if (list.length === 0) throw new PowerKitError("empty-list", "the wire piece list is empty");
  return list[stableHash(lineId) % list.length]!;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Poles

export interface PoleTransform {
  /** Where the model's origin goes. */
  position: Vec3;
  /** Turn about y (three's rotation.y), applied after the scale. */
  yaw: number;
  /** Scale on the model's own axes: the arm axis carries the across factor. */
  scale: Vec3;
}

/** A model-frame point of a pole (x, y, z in the GLB) to the world. */
export function poleToWorld(t: PoleTransform, m: Vec3): Vec3 {
  const sx = m.x * t.scale.x;
  const sz = m.z * t.scale.z;
  const c = Math.cos(t.yaw);
  const s = Math.sin(t.yaw);
  return { x: t.position.x + sx * c + sz * s, y: t.position.y + m.y * t.scale.y, z: t.position.z - sx * s + sz * c };
}

/** The model-frame point of a pole's attachment (0 centre, 1 the lower outer, 2 the higher outer), or of its anchor (the wires' line) at the centre's height when `i` is -1. */
export function poleAttachModel(pole: PowerPole, i: number): Vec3 {
  const across = i < 0 ? anchorAcross(pole) : pole.attach_m[i]!.across;
  const up = i < 0 ? pole.attach_m[0].up : pole.attach_m[i]!.up;
  return pole.armAxis === "x"
    ? { x: pole.foot_m.x + across, y: up, z: pole.foot_m.z + pole.along_m }
    : { x: pole.foot_m.x + pole.along_m, y: up, z: pole.foot_m.z + across };
}

/**
 * Stand a pole so the wires' line (the outer pair's midpoint, at the centre attachment's height) is at `spot`'s x and z and at `attachY`, with the arm
 * across `runDir` (the run's direction on the ground, any length). `scale` is units per metre; `across` (default 1) stretches the arm axis only.
 * The model's along axis turns to point along the run, so the post stands behind its attachments.
 */
export function placePole(pole: PowerPole, spot: Vec3, runDir: { x: number; z: number }, attachY: number, scale: number, across = 1): PoleTransform {
  if (pole.armAxis !== "x" && pole.armAxis !== "z") throw new PowerKitError("no-yaw", `pole ${pole.key} has no arm axis, so no yaw`);
  const len = Math.hypot(runDir.x, runDir.z);
  if (len < EPS) throw new PowerKitError("zero-run", "the run has no direction");
  if (!(scale > 0) || !(across > 0)) throw new PowerKitError("bad-scale", "scale and across must be positive");
  const dx = runDir.x / len;
  const dz = runDir.z / len;
  // Model +x (arm z) or +z (arm x) is the along axis; turn it onto +runDir.
  const yaw = pole.armAxis === "z" ? Math.atan2(-dz, dx) : Math.atan2(dx, dz);
  const sc: Vec3 = pole.armAxis === "x" ? { x: scale * across, y: scale, z: scale } : { x: scale, y: scale, z: scale * across };
  const at: PoleTransform = { position: { x: 0, y: 0, z: 0 }, yaw, scale: sc };
  const w = poleToWorld(at, poleAttachModel(pole, -1));
  return { position: { x: spot.x - w.x, y: attachY - w.y, z: spot.z - w.z }, yaw, scale: sc };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// Wire pieces

export interface LinePlacement {
  /** Column-major 4 x 4, model to world: ready for an InstancedMesh. */
  matrix: readonly number[];
  /** The world points the piece's two ends land on. */
  from: Vec3;
  to: Vec3;
  /** Its chord over its scaled length. */
  stretch: number;
  /** The fitted cross-section radius across the span (units). */
  radius: number;
}

/** A model-frame point of a wire piece to the world. */
export function transformPoint(m: readonly number[], p: Vec3): Vec3 {
  return {
    x: m[0]! * p.x + m[4]! * p.y + m[8]! * p.z + m[12]!,
    y: m[1]! * p.x + m[5]! * p.y + m[9]! * p.z + m[13]!,
    z: m[2]! * p.x + m[6]! * p.y + m[10]! * p.z + m[14]!,
  };
}

function checkLine(piece: PowerLine): number {
  const span = piece.ends_m[1].along - piece.ends_m[0].along;
  if (span <= 0) throw new PowerKitError("backwards", `piece ${piece.key} is fitted backwards: its ends run against its axis`);
  if (Math.abs(span - piece.length_m) > 0.01) throw new PowerKitError("length", `piece ${piece.key}: ends span ${span} m, length_m says ${piece.length_m}`);
  if (!(piece.sag > 0) || !(piece.radius_m > 0)) throw new PowerKitError("bad-piece", `piece ${piece.key} has no sag or no radius`);
  return span;
}

function chain(piece: PowerLine, a: Vec3, b: Vec3, sagRatio: number, scale: number, n: number, len: number, sx: number): LinePlacement[] {
  const out: LinePlacement[] = [];
  const e0 = piece.ends_m[0];
  const e1 = piece.ends_m[1];
  const Lz = e1.along - e0.along;
  const sagPiece = piece.sag * Lz;
  const point = (t: number): Vec3 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t - sagRatio * len * 4 * t * (1 - t),
    z: a.z + (b.z - a.z) * t,
  });
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const P0 = i === 0 ? a : point(t0);
    const P1 = i === n - 1 ? b : point(t1);
    // The piece's mid drop below its own chord, on the whole parabola: ratio * len * (dt)^2 (n = 1: ratio * len).
    const drop = sagRatio * len * (t1 - t0) * (t1 - t0);
    const vs = drop / sagPiece;
    const cx = P1.x - P0.x;
    const cy = P1.y - P0.y;
    const cz = P1.z - P0.z;
    const h = Math.hypot(cx, cz);
    // Side: horizontal, square to the chord, turned so the three axes are right-handed.
    const sideX = h > EPS ? cz / h : 1;
    const sideZ = h > EPS ? -cx / h : 0;
    const dyE = e1.up - e0.up;
    const c0 = [sideX * sx, 0, sideZ * sx];
    const c1 = [0, vs, 0];
    const c2 = [cx / Lz, (cy - vs * dyE) / Lz, cz / Lz];
    const tr = [
      P0.x - e0.along * c2[0]! - e0.across * c0[0]!,
      P0.y - e0.along * c2[1]! - vs * e0.up,
      P0.z - e0.along * c2[2]! - e0.across * c0[2]!,
    ];
    const chord = Math.hypot(cx, cy, cz);
    out.push({
      matrix: [c0[0]!, c0[1]!, c0[2]!, 0, c1[0]!, c1[1]!, c1[2]!, 0, c2[0]!, c2[1]!, c2[2]!, 0, tr[0]!, tr[1]!, tr[2]!, 1],
      from: { ...P0 },
      to: { ...P1 },
      stretch: chord / (piece.length_m * scale),
      radius: piece.radius_m * sx,
    });
  }
  return out;
}

/**
 * Hang a wire piece between `a` and `b` (world units), sagging `sagRatio` of the span's length as `sagSpan` does. The piece is stretched along its
 * length to the chord; its mid drop is scaled to the sag (a shear in height: the cross-section's height follows the sag, its width the radius).
 * A span longer than LINE_STRETCH_MAX times the piece's scaled length (`scale` is units per metre) is the fewest pieces end to end that each fit, their
 * joins on one `sagSpan` parabola. A span shorter than LINE_STRETCH_MIN times is still one piece, compressed. `radius` (units), when given, is the
 * fitted cross-section radius; without it the piece's true radius times `scale`.
 */
export function fitLine(piece: PowerLine, a: Vec3, b: Vec3, sagRatio: number, scale: number, radius?: number): LinePlacement[] {
  checkLine(piece);
  if (!(scale > 0)) throw new PowerKitError("bad-scale", "scale must be positive");
  if (!(sagRatio > 0)) throw new PowerKitError("bad-sag", "sagRatio must be positive");
  const len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  if (len < EPS) throw new PowerKitError("zero-span", "a span of length 0 has no wire");
  const sx = radius !== undefined ? radius / piece.radius_m : scale;
  if (!(sx > 0)) throw new PowerKitError("bad-radius", "the radius must be positive");
  let n = Math.max(1, Math.ceil(len / (LINE_STRETCH_MAX * piece.length_m * scale) - EPS));
  for (;;) {
    const out = chain(piece, a, b, sagRatio, scale, n, len, sx);
    if (out.every((p) => p.stretch <= LINE_STRETCH_MAX + EPS) || n > 10000) return out;
    n++;
  }
}
