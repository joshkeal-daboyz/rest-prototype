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
    expect(entries.map((m) => m.key)).toEqual(["shrine-circuit"]);
    expect(entries[0]?.locked).toBe(false);
  });

  it("lists a locked copy beside its original when both share an id", () => {
    const { entries, problems } = collectMaps({
      "../puzzles/x.json": shrine,
      "../puzzles/locked/x.json": shrine,
    });
    expect(problems).toEqual([]);
    expect(entries.map((m) => [m.key, m.id, m.locked])).toEqual([
      ["shrine-circuit", "shrine-circuit", false],
      ["locked/shrine-circuit", "shrine-circuit", true],
    ]);
  });

  it("marks files under locked/ as locked and lists open maps first", () => {
    const { entries } = collectMaps({
      "../puzzles/locked/shrine-circuit.json": { ...shrine, id: "locked-one", name: "Locked one" },
      "../puzzles/shrine-circuit.json": shrine,
    });
    expect(entries.map((m) => [m.key, m.locked])).toEqual([
      ["shrine-circuit", false],
      ["locked/locked-one", true],
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

  it("reports two open files with the same id and keeps the first", () => {
    const { entries, problems } = collectMaps({
      "../puzzles/a.json": shrine,
      "../puzzles/b.json": shrine,
    });
    expect(entries).toHaveLength(1);
    expect(problems).toEqual(["../puzzles/b.json: duplicate map key shrine-circuit"]);
  });
});
