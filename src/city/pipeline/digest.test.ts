import { describe, expect, it } from "vitest";
import { canonicalJson, digestOf } from "./digest";

const layer = (x: number, role = "lane") => ({ stage: "streets", w: 10, cells: [{ i: 1, j: 2, role, v: x }], sizes: { widths: [6, 9], draw: null } });

describe("digestOf (R-4)", () => {
  it("is 8 hex digits", () => {
    expect(digestOf(layer(1))).toMatch(/^[0-9a-f]{8}$/);
  });
  it("is the same under key reordering", () => {
    const a = { a: 1, b: { c: [1, 2], d: "x" } };
    const b = { b: { d: "x", c: [1, 2] }, a: 1 };
    expect(digestOf(a)).toBe(digestOf(b));
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });
  it("is the same under a change of 1e-7", () => {
    expect(digestOf(layer(1.5))).toBe(digestOf(layer(1.5 + 1e-7)));
  });
  it("differs for a change of 1e-3", () => {
    expect(digestOf(layer(1.5))).not.toBe(digestOf(layer(1.5 + 1e-3)));
  });
  it("differs for one cell's role", () => {
    expect(digestOf(layer(1, "lane"))).not.toBe(digestOf(layer(1, "junction")));
  });
  it("writes the canonical form: sorted keys, rounded numbers, no negative zero", () => {
    expect(canonicalJson({ b: 0.1 + 0.2, a: [null, true, "s"], z: -0 })).toBe('{"a":[null,true,"s"],"b":0.3,"z":0}');
  });
});
