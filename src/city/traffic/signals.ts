/**
 * Stage 9: the traffic signals of a signal junction (ticket 070 TR1; MA; Josh, 21 Nov 2026, Q33, Q34, Q37, Q43). Drawn dark: scenery, never powered, lit or picked.
 * - **The mast** (`signalMast`, grounded) stands on each `pavementCorner` cell of the junction, one for each inbound approach, on that approach's **far-left corner**. Its pole's axis is `MAST_INSET_M` (2.6 m, TR1d, Q50: on the corner's walk behind the ramps) in from each of the cell's two kerb edges
 *   (the cell's kerb corner is the corner point nearest the junction's carriageway). Its yaw is the one that puts the upper collar's clamp face (the side without the lamp) toward the arm, so the lamp hook leans away over the walk.
 * - **The arm** (`signalArm`) is fixed by its clamp to the mast's upper collar (the kit's fix point). It runs from the mast to the driver's right across the approach's own carriageway at the junction's far side, square to the traffic, its heads'
 *   lenses toward the approaching traffic. The pack piece is never mirrored.
 * - **Walk heads** (`walkHead`), one for each crossing that lands at the mast's corner, on the lower collar (the second 0.5 m above the first), facing along the crossing toward the far landing. A **push button** (`pushButton`) for each crossing, on the mast's face toward it and facing it (TR1d; TR1 had one a mast). **One box** (`signalBox`) a junction, standing on the walk beside the mast of the corner `rand("traffic", "box", <junction id>) % 4` picks (corners in approach order), its back to the mast.
 * Every group is "<junction>|<n>": the assemblies in approach order, then the box.
 */

import type { CityCell, CityJunction, CityJunctionTraffic, CityTrafficPiece } from "../../core";
import type { StageRand } from "../pipeline/seeds";
import { SIDE_YAW, makePiece, rotate, sideOf } from "./clear";
import { MAST_INSET_M } from "./constants";
import { HEADING, farLeftOf, rectOf, rightOf, type EdgeInfo } from "./control";
import { ARM, ARM_BASE_Y, MAST, PUSH_BUTTON_KEY, SIGNAL_BOX_KEY, WALK_HEAD_KEY, boundsOf } from "./kit";
import { indexOf } from "./hash";

/** The crossings that land at a corner cell: the neighbours toward the junction that are `crossing` cells, as the unit vector from the corner along each, x first. */
export function crossingsAt(corner: { readonly cell: CityCell; readonly sx: 1 | -1; readonly sz: 1 | -1 }, info: EdgeInfo): (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [];
  for (const d of [[-corner.sx, 0], [0, -corner.sz]] as const) {
    if (info.roleAt({ i: corner.cell.i + d[0], j: corner.cell.j + d[1] }) === "crossing") out.push(d);
  }
  return out;
}

/** The pieces of one signal junction, in order: each assembly (its mast, arm, walk heads and button), then the box. */
export function signalPieces(j: CityJunction, t: CityJunctionTraffic, info: EdgeInfo, rand: StageRand): CityTrafficPiece[] {
  const r = rectOf(j);
  const mine = t.approaches.filter((a) => a.control === "signal");
  const corners = mine.map((a) => ({ a, c: farLeftOf(r, a.arm) }));
  const boxAt = corners.length === 0 ? -1 : indexOf(rand("traffic", "box", j.id), 4) % corners.length;
  const out: CityTrafficPiece[] = [];
  let boxPiece: CityTrafficPiece | null = null;
  const walk = boundsOf(WALK_HEAD_KEY);
  const button = boundsOf(PUSH_BUTTON_KEY);
  const box = boundsOf(SIGNAL_BOX_KEY);
  for (const [n, { a, c }] of corners.entries()) {
    const group = `${j.id}|${n}`;
    const pole = { x: c.kx + c.sx * MAST_INSET_M, z: c.kz + c.sz * MAST_INSET_M };
    const rt = rightOf(HEADING[a.arm]);
    const armYaw = SIDE_YAW[sideOf(rt[0], rt[1])];
    const mastYaw = (armYaw + 180) % 360;
    const m = rotate(mastYaw, MAST.axis.x, MAST.axis.z);
    out.push(makePiece({ kind: "signalMast", host: j.id, approach: a.id, group, grounded: true, street: null, x: pole.x - m.x, y: 0, z: pole.z - m.z, yaw: mastYaw, cell: c.cell }));
    const q = rotate(armYaw, ARM.axis.x, ARM.axis.z);
    out.push(makePiece({ kind: "signalArm", host: j.id, approach: a.id, group, grounded: false, street: null, x: pole.x - q.x, y: ARM_BASE_Y, z: pole.z - q.z, yaw: armYaw }));
    const crossings = crossingsAt(c, info);
    crossings.forEach((d, k) => {
      const off = MAST.radius + walk.d / 2;
      out.push(makePiece({ kind: "walkHead", host: j.id, approach: null, group, grounded: false, street: null, x: pole.x + d[0] * off, y: MAST.walkHeadY[k]!, z: pole.z + d[1] * off, yaw: SIDE_YAW[sideOf(d[0], d[1])] }));
    });
    // one push button for each crossing at the corner, on the mast's face toward it, facing it (a walker reaches it from the walk between the mast and that crossing's ramp)
    const off = MAST.radius + button.d / 2;
    for (const face of crossings) out.push(makePiece({ kind: "pushButton", host: j.id, approach: null, group, grounded: false, street: null, x: pole.x + face[0] * off, y: MAST.buttonY, z: pole.z + face[1] * off, yaw: SIDE_YAW[sideOf(face[0], face[1])] }));
    if (n === boxAt) {
      const e = [c.sx, 0] as const;
      const bo = MAST.radius + box.d / 2;
      boxPiece = makePiece({ kind: "signalBox", host: j.id, approach: null, group: `${j.id}|${corners.length}`, grounded: true, street: null, x: pole.x + e[0] * bo, y: 0, z: pole.z + e[1] * bo, yaw: SIDE_YAW[sideOf(e[0], e[1])], cell: c.cell });
    }
  }
  // the box's group is its own and comes last, behind the assemblies
  if (boxPiece) out.push(boxPiece);
  return out;
}

