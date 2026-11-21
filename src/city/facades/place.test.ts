/**
 * Stage 7, section H1, criterion 3 (no city needed): the placements and S1 levels, each hand-worked on paper from the kit table's numbers (bounds and insets), not by the code under test. Cell (3, 4) has its centre at
 * (17.5, 22.5); a front edge is 2.5 m from it; a body's front plane is the bounds' half depth less the front inset from the pivot, along the piece's own +z.
 */
import { describe, expect, it } from "vitest";
import type { CalibrationKey, CityYaw } from "../../core";
import { GROUND_GAP_MAX_M } from "./constants";
import { DEEP_KEYS, groundEntry } from "./kit";
import { bodyBoxOf, levelOf, ownBody, placeGround } from "./place";

const k = (n: string): CalibrationKey => `city-pack:SM_Bld_${n}`;
const C = { i: 3, j: 4 };
const near = (got: number, want: number): void => expect(got).toBeCloseTo(want, 6);

describe("the front-aligned placements, one hand-worked pivot per kind (criterion 3)", () => {
  it("a shop, Shop_02, front +z: its body front plane (2.2875 m from the pivot) on z 25, so the pivot is at z 22.7125", () => {
    // z1 = 5.425 / 2 - 0.425 = 2.2875; target z = 22.5 + 2.5 = 25; across: x0 = -2.5, x1 = 2.5, centre 0.
    const p = placeGround(k("Shop_02"), [C], "+z", 0, -0.071);
    near(p.x_m, 17.5);
    near(p.z_m, 22.7125);
    near(p.y_m, -0.071);
    expect(p.yaw_deg).toBe(0);
    expect(p.key).toBe(k("Shop_02"));
  });

  it("the same shop turned to front +x (yaw 90): the pivot is 2.2875 m back from the edge x 20, at x 17.7125", () => {
    const p = placeGround(k("Shop_02"), [C], "+x", 90, 0);
    near(p.x_m, 17.7125);
    near(p.z_m, 22.5);
  });

  it("a residents' door, Door_01, front -z (yaw 180): z1 = 5.577 / 2 - 0.529 = 2.2595, the pivot is at z 22.2595", () => {
    const p = placeGround(k("Apartment_Door_01"), [C], "-z", 180, -0.01);
    near(p.x_m, 17.5);
    near(p.z_m, 22.2595);
  });

  it("a shop corner, Shop_Corner_01, front +z: z1 = 5.471 / 2 - 0.211 = 2.5245, pivot z 22.4755; the body is 5.001 wide, centred", () => {
    const p = placeGround(k("Shop_Corner_01"), [C], "+z", 0, -0.01);
    near(p.x_m, 17.5);
    near(p.z_m, 22.4755);
  });

  it("a shopDouble, Shop_03, over cells (3, 4) and (4, 4), yaw 0: centred on x 20 (its body is 9.999 wide, centre 0), z1 = 5.493 / 2 - 0.103 = 2.6435, pivot z 22.3565", () => {
    const p = placeGround(k("Shop_03"), [C, { i: 4, j: 4 }], "+z", 0, -0.043);
    near(p.x_m, 20);
    near(p.z_m, 22.3565);
  });

  it("a shopDouble over cells (3, 4) and (3, 5), yaw 90 (front +x): centred on z 25, the pivot 2.6435 m back from x 20, at x 17.3565", () => {
    const p = placeGround(k("Shop_03"), [C, { i: 3, j: 5 }], "+x", 90, -0.043);
    near(p.x_m, 17.3565);
    near(p.z_m, 25);
  });

  it("a doorCorner, Door_Corner_01 (x0 = -2.2595, x1 = 2.7405, so its body centre is 0.2405 off the pivot; z1 = 2.2595), at each of the four turns", () => {
    // own anchor (0.2405, 2.2595); a turn by `yaw` is three.js's (x' = x cos + z sin, z' = -x sin + z cos).
    const at = (front: "+z" | "+x" | "-z" | "-x", yaw: CityYaw): { x: number; z: number } => {
      const p = placeGround(k("Apartment_Door_Corner_01"), [C], front, yaw, -0.01);
      return { x: p.x_m, z: p.z_m };
    };
    // yaw 0: target (17.5, 25), turned anchor (0.2405, 2.2595)
    let q = at("+z", 0);
    near(q.x, 17.2595);
    near(q.z, 22.7405);
    // yaw 90: target (20, 22.5), turned anchor (2.2595, -0.2405)
    q = at("+x", 90);
    near(q.x, 17.7405);
    near(q.z, 22.7405);
    // yaw 180: target (17.5, 20), turned anchor (-0.2405, -2.2595)
    q = at("-z", 180);
    near(q.x, 17.7405);
    near(q.z, 22.2595);
    // yaw 270: target (15, 22.5), turned anchor (-2.2595, 0.2405)
    q = at("-x", 270);
    near(q.x, 17.2595);
    near(q.z, 22.2595);
  });

  it("a deep Shop_01 (5.317 m deep, 0.317 m of it past the back edge), at yaw 0 and 90: its front plane on the front edge, its back plane 0.317 m past the back edge", () => {
    // z1 = 5.536 / 2 - 0.219 = 2.549; z0 = -2.768; body depth 5.317.
    const p0 = placeGround(k("Shop_01"), [C], "+z", 0, -0.064);
    near(p0.z_m, 22.451);
    const b0 = bodyBoxOf(p0);
    near(b0.z1, 25); // front edge
    near(b0.z0, 19.683); // the back edge is z 20: 0.317 past it
    near(b0.x0, 15);
    near(b0.x1, 20);
    const p90 = placeGround(k("Shop_01"), [C], "+x", 90, -0.064);
    near(p90.x_m, 17.451);
    near(p90.z_m, 22.5);
    const b90 = bodyBoxOf(p90);
    near(b90.x1, 20); // front edge
    near(b90.x0, 14.683); // the back edge is x 15: 0.317 past it
    near(b90.z0, 20);
    near(b90.z1, 25);
  });

  it("a floor, Apartment_01, front +z: z1 = 5.196 / 2 - 0.196 = 2.402, pivot z 22.598; a corner floor, Apartment_Corner_02 (x0 = -2.478, x1 = 2.522, z1 = 2.478): pivot (17.478, 22.522)", () => {
    const f = placeGround(k("Apartment_01"), [C], "+z", 0, 0);
    near(f.x_m, 17.5);
    near(f.z_m, 22.598);
    const c = placeGround(k("Apartment_Corner_02"), [C], "+z", 0, 0);
    near(c.x_m, 17.478);
    near(c.z_m, 22.522);
  });

  it("every placed body's front plane is on the front edge and a non-deep key's back plane is on the back edge within 0.02, at every turn", () => {
    for (const e of ["Shop_02", "Shop_06", "Apartment_Door_01", "Apartment_Door_02", "Shop_Corner_01", "Shop_Corner_02", "Apartment_01", "Apartment_Corner_03"]) {
      for (const [front, yaw] of [["+z", 0], ["+x", 90], ["-z", 180], ["-x", 270]] as const) {
        const b = bodyBoxOf(placeGround(k(e), [C], front, yaw, 0));
        const edge = { "+z": b.z1, "+x": b.x1, "-z": b.z0, "-x": b.x0 }[front];
        const want = { "+z": 25, "+x": 20, "-z": 20, "-x": 15 }[front];
        near(edge, want);
        const back = { "+z": b.z0, "+x": b.x0, "-z": b.z1, "-x": b.x1 }[front];
        const wantBack = { "+z": 20, "+x": 15, "-z": 25, "-x": 20 }[front];
        const isDeep = DEEP_KEYS.includes(k(e));
        if (!isDeep) expect(Math.abs(back - wantBack), `${e} ${front}`).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it("ownBody is the bounds less the insets: Shop_Corner_01 is 5.001 by 5.072", () => {
    const b = ownBody(groundEntry(k("Shop_Corner_01")));
    near(b.x1 - b.x0, 5.001);
    near(b.z1 - b.z0, 5.072);
  });
});

describe("the S1 level of each case, hand-worked (criterion 3)", () => {
  const level = (n: string, ws = 0.756): number | null => levelOf(groundEntry(k(n)), 3, ws);

  it("Shop_Corner_01 stands at -0.010: the nearest to -0.159 inside the window (top at least 2.99; door at most 0.15, i.e. y at most -0.009), its door 0.149", () => {
    near(level("Shop_Corner_01")!, -0.01);
    near(level("Shop_Corner_01")! + 0.159, 0.149);
    near(level("Shop_Corner_01")! + 3.0, 3 - GROUND_GAP_MAX_M);
  });

  it("Shop_02 stands at -0.071, its door at the walk (0.000): its top 3.229 is under 3 + 0.756 - 0.05", () => {
    near(level("Shop_02")!, -0.071);
    near(level("Shop_02")! + 0.071, 0);
    near(level("Shop_02")! + 3.3, 3.229);
  });

  it("Shop_06, which has no door, stands at 0", () => {
    expect(level("Shop_06")).toBe(0);
  });

  it("Shop_01 stands at -0.064 (held by the gap, not by its sill 0.106): door 0.042, top 2.990", () => {
    near(level("Shop_01")!, -0.064);
    near(level("Shop_01")! + 0.106, 0.042);
  });

  it("Shop_03 at -0.043 and Shop_04 at -0.077, each with its door at the walk", () => {
    near(level("Shop_03")!, -0.043);
    near(level("Shop_04")!, -0.077);
  });

  it("Door_01 and Door_Corner_01 stand at -0.010 (door 0.019)", () => {
    near(level("Apartment_Door_01")!, -0.01);
    near(level("Apartment_Door_Corner_01")!, -0.01);
  });

  it("the four keys with an empty window are never placed, on any style: Shop_05, Door_02, Door_Corner_02 and Shop_Corner_02", () => {
    for (const n of ["Shop_05", "Apartment_Door_02", "Apartment_Door_Corner_02", "Shop_Corner_02"]) for (const ws of [0.756, 0.417, 0.517]) expect(level(n, ws), `${n} ${ws}`).toBeNull();
  });

  it("a floor key stands at 0", () => {
    for (const n of ["Apartment_01", "Apartment_Corner_01", "Apartment_02", "Apartment_Corner_02", "Apartment_03", "Apartment_Corner_03"]) expect(level(n), n).toBe(0);
  });

  it("a key whose top would rise into the first floor's window sill has no level: the top rule binds when the sill is low", () => {
    // Shop_02 is 3.3 m tall: with a first-floor sill of 0.1 its top limit is 3.05, so y would be at most -0.25, and its door (y + 0.071) would be 0.179 under the walk, past -0.05: empty.
    expect(levelOf(groundEntry(k("Shop_02")), 3, 0.1)).toBeNull();
  });
});
