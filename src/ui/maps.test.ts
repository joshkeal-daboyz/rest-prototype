import { describe, expect, it } from "vitest";
import shrine from "../../puzzles/shrine-circuit.json";
import lampRow from "../../puzzles/lamp-row.grid.json";
import { collectMaps } from "./maps";

describe("collectMaps", () => {
  it("lists map-scope files and skips street files", () => {
    const { entries, problems } = collectMaps({
      "../puzzles/shrine-circuit.json": shrine,
      "../puzzles/lamp-row.grid.json": lampRow,
    });
    expect(problems).toEqual([]);
    expect(entries.map((m) => m.id)).toEqual(["shrine-circuit"]);
    expect(entries[0]?.locked).toBe(false);
  });

  it("marks files under locked/ as locked and lists open maps first", () => {
    const { entries } = collectMaps({
      "../puzzles/locked/shrine-circuit.json": { ...shrine, id: "locked-one", name: "Locked one" },
      "../puzzles/shrine-circuit.json": shrine,
    });
    expect(entries.map((m) => [m.id, m.locked])).toEqual([
      ["shrine-circuit", false],
      ["locked-one", true],
    ]);
  });

  it("reports invalid files instead of throwing and keeps the valid ones", () => {
    const { entries, problems } = collectMaps({
      "../puzzles/broken.json": { id: "broken", version: 2 },
      "../puzzles/shrine-circuit.json": shrine,
    });
    expect(entries).toHaveLength(1);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^\.\.\/puzzles\/broken\.json: /);
  });

  it("reports a duplicate map id and keeps the first", () => {
    const { entries, problems } = collectMaps({
      "../puzzles/a.json": shrine,
      "../puzzles/b.json": shrine,
    });
    expect(entries).toHaveLength(1);
    expect(problems).toEqual(["../puzzles/b.json: duplicate map id shrine-circuit"]);
  });
});
