import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPuzzle, validatePuzzle } from "./load";

const PUZZLES = join(__dirname, "..", "..", "puzzles");
const files = readdirSync(PUZZLES).filter((f) => f.endsWith(".json"));
const read = (f: string) => JSON.parse(readFileSync(join(PUZZLES, f), "utf8")) as unknown;

describe("every puzzle file in puzzles/ validates", () => {
  for (const f of files) {
    it(f, () => {
      const r = validatePuzzle(read(f));
      expect(r.ok, r.ok ? "" : r.errors.join("\n")).toBe(true);
    });
  }
});

describe("the validator catches broken puzzles", () => {
  const base = () => structuredClone(read("shrine-circuit.json")) as Record<string, unknown>;

  it("a lamp with two lines is not a leaf", () => {
    const p = base();
    (p["lines"] as unknown[]).push({ id: "bad", from: "shrine", to: "flood" });
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/lamp shrine must be a leaf/);
  });

  it("a blown fuse must sit on a fusebox", () => {
    const p = base();
    (p["faults"] as unknown[]).push({ id: "f9", at: "j1", kind: "blown-fuse" });
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/blown-fuse must sit on a fusebox/);
  });

  it("a damaged cable must sit on a line", () => {
    const p = base();
    (p["faults"] as unknown[]).push({ id: "f9", at: "j1", kind: "damaged-cable" });
    expect(validatePuzzle(p).ok).toBe(false);
  });

  it("targets must be lamps", () => {
    const p = base();
    p["target"] = ["j1"];
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/target: j1 is a junction/);
  });

  it("exactly one feed", () => {
    const p = base();
    (p["nodes"] as { type: string }[]).find((n) => n.type === "feed")!.type = "junction";
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/exactly one feed/);
  });

  it("line endpoints must be nodes", () => {
    const p = base();
    (p["lines"] as unknown[]).push({ id: "bad", from: "nowhere", to: "t1" });
    expect(validatePuzzle(p).ok).toBe(false);
  });

  it("a battery needs a capacity, an input line that touches it, and a far side", () => {
    const p = base();
    p["version"] = 4;
    (p["nodes"] as unknown[]).push({ id: "bat", type: "battery", pos: [3, 3], capacity: 8, input: "l_bat_in" });
    (p["lines"] as unknown[]).push({ id: "l_bat_in", from: "j1", to: "bat" });
    let r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/needs its input line and at least one far-side line/);
    (p["lines"] as unknown[]).push({ id: "l_bat_out", from: "bat", to: "j4" });
    expect(validatePuzzle(p).ok).toBe(true);
    (p["nodes"] as { id: string; input?: string }[]).find((n) => n.id === "bat")!.input = "l_main";
    r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/doesn't touch the battery/);
  });

  it("a relay flag must be boolean", () => {
    const p = base();
    (p["nodes"] as { id: string; relay?: unknown }[]).find((n) => n.id === "sw_1")!.relay = "yes";
    expect(validatePuzzle(p).ok).toBe(false);
  });

  it("a street needs its start, night, satchel and favor", () => {
    const p = base();
    p["scope"] = "street";
    const r = validatePuzzle(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/street: start/);
  });

  it("loadPuzzle throws with every error listed", () => {
    expect(() => loadPuzzle({})).toThrow(/invalid puzzle/);
  });
});
