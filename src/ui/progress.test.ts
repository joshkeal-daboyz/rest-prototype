import { describe, expect, it } from "vitest";
import { clearProgress, loadProgress, PROGRESS_KEY, recordWin, saveProgress, stageList, stageNumber, type Progress, type StageEntry } from "./progress";
import type { StorageLike } from "./logic";

function memoryStorage(): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

describe("recordWin", () => {
  it("keeps each best on its own and the first win's date", () => {
    const first = recordWin(new Map(), "01-first-light", 7, 42.3, "2026-11-25");
    const worse = recordWin(first, "01-first-light", 9, 50, "2026-11-26");
    expect(worse.get("01-first-light")).toEqual({ moves: 7, seconds: 42.3, first: "2026-11-25" });
    // Fewer moves, longer time: only the moves improve.
    const fewer = recordWin(worse, "01-first-light", 5, 60, "2026-11-27");
    expect(fewer.get("01-first-light")).toEqual({ moves: 5, seconds: 42.3, first: "2026-11-25" });
    // The record is a new map; the earlier one is untouched.
    expect(first.get("01-first-light")?.moves).toBe(7);
  });
});

describe("progress store", () => {
  it("round-trips, reads garbage as empty, and clears", () => {
    const storage = memoryStorage();
    const progress = recordWin(new Map(), "03-not-enough-for-all", 12, 90.5, "2026-11-25");
    expect(saveProgress(storage, progress)).toBe(true);
    expect(storage.map.has(PROGRESS_KEY)).toBe(true);
    expect([...loadProgress(storage)]).toEqual([...progress]);

    for (const junk of ["not json", "[]", "null", JSON.stringify({ version: 2, stages: {} }), JSON.stringify({ version: 1, stages: { a: { moves: -1, seconds: 1, first: "x" } } })]) {
      const bad = memoryStorage();
      bad.map.set(PROGRESS_KEY, junk);
      expect(loadProgress(bad).size).toBe(0);
    }
    expect(loadProgress(null).size).toBe(0);

    expect(clearProgress(storage)).toBe(true);
    expect(loadProgress(storage).size).toBe(0);
  });
});

describe("stageList", () => {
  // The pilots (01 to 04) and P0 are not stages (ticket 081 NS); only the series is.
  const entries: StageEntry[] = [
    { id: "01-first-light", name: "01 · First light" },
    { id: "s01-first-light", name: "01 · First light" },
    { id: "s02-this-way", name: "02 · This way" },
    { id: "s03-not-enough", name: "03 · Not enough" },
    { id: "city-two-ways-round", name: "City · Two ways round" },
  ];
  const series = entries.slice(1, 4);

  it("lists only the series stages: completed ones in number order, then the next, with a pilot or P0 win left out", () => {
    // s03 is completed before s01 (through ?puzzle=); the pilot and P0 have wins that are not stages.
    let progress = recordWin(new Map(), "s03-not-enough", 7, 42.3, "2026-11-25");
    progress = recordWin(progress, "s01-first-light", 1, 60, "2026-11-25");
    progress = recordWin(progress, "01-first-light", 9, 70, "2026-11-25");
    progress = recordWin(progress, "city-two-ways-round", 4, 30, "2026-11-25");
    const rows = stageList(entries, progress);
    expect(rows.map((r) => r.id)).toEqual(["s01-first-light", "s03-not-enough", "s02-this-way"]);
    expect(rows.map((r) => r.text)).toEqual([
      "01 · First light · 1 move · 1:00.0",
      "03 · Not enough · 7 moves · 0:42.3",
      "02 · This way · not yet lit",
    ]);
    expect(rows.map((r) => [r.completed, r.next])).toEqual([
      [true, false],
      [true, false],
      [false, true],
    ]);
    // Nothing completed: series 01 alone, as the next. Everything completed: no next. No series files: no lines.
    expect(stageList(entries, new Map()).map((r) => r.id)).toEqual(["s01-first-light"]);
    let all: Progress = new Map();
    for (const e of series) all = recordWin(all, e.id, 3, 30, "2026-11-25");
    expect(stageList(entries, all).some((r) => r.next)).toBe(false);
    expect(stageList(entries.filter((e) => stageNumber(e.id) === null), new Map())).toEqual([]);
  });
});
