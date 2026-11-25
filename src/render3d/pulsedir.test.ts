/**
 * Ticket 081 W4: pulses run outward from the feed. On P0 and the pilots (6 x 6 seed 1), every file line's wires, read the way the frame loop reads them (`jobWires`, `wireLit`, then the point
 * `pointOnWire(w, forward ? d : len - d)`), carry a pulse from the end where the line's current enters towards the other end, for current entering at the line's from end and at its to end.
 */
import { readdirSync, readFileSync } from "node:fs";
import { BoxGeometry, GreaterDepth, InstancedMesh, MeshBasicMaterial } from "three";
import { expect, it } from "vitest";
import { loadCityPuzzle } from "../core";
import { convertCityPuzzle } from "../city/circuit";
import { runCity } from "../city/stages";
import { stagesOfProfile } from "../city/testing/namedcities";
import { circuitDraws } from "./circuitdraw";
import { XRAY_OPACITY, jobWires, pointOnWire, wireLit, xrayOf, type JobWire } from "./cityview";
import { WORLD_PER_METRE } from "./models";
import { placePoint } from "./overlay";

it("on P0 and every pilot, each wire's pulse moves from the end current enters to the other end (081 W4)", () => {
  const upto = stagesOfProfile("facades", "on");
  const r = runCity({ blocksX: 6, blocksZ: 6, seed: 1 }, "circuit", upto.slice(0, upto.findIndex((d) => d.name === "circuit") + 1));
  if (!r.ok) throw new Error(r.failure.reason);
  const layer = r.plan.layers.circuit!;
  const files = readdirSync("puzzles/city").filter((f) => f.endsWith(".city.json"));
  expect(files.length).toBeGreaterThan(16);
  const wrong: string[] = [];
  const S = WORLD_PER_METRE;
  const pt = (w: JobWire, s: number): { x: number; z: number } => pointOnWire(w, s, { x: 0, y: 0, z: 0, seg: 0 });
  for (const f of files) {
    const converted = convertCityPuzzle(loadCityPuzzle(JSON.parse(readFileSync(`puzzles/city/${f}`, "utf8"))), r.plan);
    const wires = jobWires(layer, circuitDraws(layer, undefined, { converted }), converted);
    const byLine = new Map<string, JobWire[]>();
    for (const w of wires) byLine.set(w.line, [...(byLine.get(w.line) ?? []), w]);
    const ends = new Map(converted.puzzle.lines.map((l) => [l.id, l] as const));
    for (const [id, run] of byLine) {
      const from = ends.get(`${id}~a`)?.from;
      const to = ends.get(`${id}~b`)?.to;
      for (const reversed of [false, true]) {
        const entry = converted.places[(reversed ? to : from) ?? ""];
        const at = { x: 0, y: 0, z: 0 };
        let ref: { x: number; z: number } | null = entry && placePoint(entry, layer, at) ? { x: at.x * S, z: at.z * S } : null;
        for (const w of reversed ? [...run].reverse() : run) {
          const lit = wireLit(w, reversed, 1, { forward: true, frac: 0 });
          // Where a pulse starts and where it ends: the loop's `pointOnWire(w, forward ? d : len - d)`, d near 0 and near len.
          const a = { ...pt(w, lit.forward ? 0 : w.len_m) };
          const b = { ...pt(w, lit.forward ? w.len_m : 0) };
          if (ref && Math.hypot(ref.x - a.x, ref.z - a.z) > Math.hypot(ref.x - b.x, ref.z - b.z)) wrong.push(`${f} ${id} ${w.id} reversed=${reversed}`);
          ref = b;
        }
      }
    }
  }
  expect(wrong).toEqual([]);
}, 120_000);

it("the faded pass shares the live mesh's geometry and instance attributes, and draws only where something is in front (081 W4)", () => {
  const base = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial(), 4);
  base.setColorAt(0, base.material.color);
  const { mesh, material } = xrayOf(base);
  expect(mesh.geometry).toBe(base.geometry);
  expect(mesh.instanceMatrix).toBe(base.instanceMatrix);
  expect(mesh.instanceColor).toBe(base.instanceColor);
  expect(mesh.count).toBe(4);
  expect([material.depthFunc, material.depthWrite, material.opacity, material.transparent]).toEqual([GreaterDepth, false, XRAY_OPACITY, true]);
});
