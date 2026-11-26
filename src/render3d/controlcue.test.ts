import { BoxGeometry, GreaterDepth } from "three";
import { expect, it } from "vitest";
import type { LoadPreview, LoadPreviewEntry } from "../core/preview";
import { createCueLayer, cueWires } from "./controlcue";
import { XRAY_OPACITY, xrayOf, type JobWire } from "./cityview";

const wire = (id: string, line: string, a0: number, a1: number, cutFault: string | null = null): JobWire => ({ id, line, lineIndex: 0, flip: false, a0, a1, len_m: 5, pts: [], cum_m: [], cutFault });
const entry = (kind: LoadPreviewEntry["kind"], lines?: LoadPreviewEntry["lines"]): LoadPreviewEntry => ({ kind, delta: 0, over: false, blows: [], ...(lines ? { lines } : {}) });
const byLine = new Map<string, JobWire[]>([
  ["L1", [wire("L1a", "L1", 0, 0.5), wire("L1b", "L1", 0.5, 1)]],
  ["L2", [wire("L2a", "L2", 0, 0.4), wire("L2b", "L2", 0.4, 0.7, "f1"), wire("L2c", "L2", 0.7, 1)]],
]);
const preview: LoadPreview = new Map([
  ["sw", entry("switch", { on: ["L1", "L1~a"], off: ["L2", "scenery"] })],
  ["bare", entry("breaker")],
  ["bat", entry("battery", { on: ["L1"], off: [] })],
  ["f1", entry("repair", { on: ["L1"], off: [] })],
]);

it("cues the hovered control's on and off wires only, up to a readable cut, and nothing when the numbers are off (081 NC2)", () => {
  const cued = (hover: string | null, p: LoadPreview | null = preview, rev?: (l: string) => boolean) => Object.fromEntries(cueWires(byLine, p, hover, rev));
  expect(cued("sw")).toEqual({ L1a: "on", L1b: "on", L2a: "off", L2b: "off" });
  expect(cued("sw", preview, () => true)).toEqual({ L1a: "on", L1b: "on", L2b: "off", L2c: "off" });
  for (const none of [null, "lamp1", "f1", "bare"]) expect(cued(none)).toEqual({});
  expect(cued("sw", null)).toEqual({});
  expect(cued("bat")).toEqual({ L1a: "on", L1b: "on" });
  expect(cued("bat", null)).toEqual({});
});

it("the cue layer and its x-ray share geometry and colours, and an unchanged hover and preview writes nothing (081 NC2)", () => {
  const wires = [...byLine.values()].flat();
  const layer = createCueLayer(new BoxGeometry(1, 1, 1), wires, 2, byLine, () => false);
  const x = xrayOf(layer.mesh);
  expect([x.mesh.geometry, x.mesh.instanceColor]).toEqual([layer.mesh.geometry, layer.mesh.instanceColor]);
  expect(x.mesh.instanceColor).toBe(layer.mesh.instanceColor);
  expect([x.material.depthFunc, x.material.depthWrite, x.material.opacity]).toEqual([GreaterDepth, false, XRAY_OPACITY]);
  const v0 = layer.mesh.instanceColor!.version;
  expect(layer.update(["sw"], preview)).toBe(true);
  const v1 = layer.mesh.instanceColor!.version;
  expect(v1).toBeGreaterThan(v0);
  expect(layer.update(["sw"], preview)).toBe(false);
  expect(layer.mesh.instanceColor!.version).toBe(v1);
});
