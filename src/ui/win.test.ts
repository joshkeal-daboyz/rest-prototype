import { describe, expect, it } from "vitest";
import { formatTime, nextMap, splashDue, WIN_SPLASH_DELAY, winLine } from "./logic";

describe("formatTime", () => {
  it("rounds to tenths and splits into minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00.0");
    expect(formatTime(42.34)).toBe("0:42.3");
    expect(formatTime(59.96)).toBe("1:00.0");
    expect(formatTime(75.24)).toBe("1:15.2");
    expect(formatTime(3725.4)).toBe("62:05.4");
  });

  it("reads NaN, negative and infinite values as zero", () => {
    expect(formatTime(Number.NaN)).toBe("0:00.0");
    expect(formatTime(-3)).toBe("0:00.0");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00.0");
  });
});

describe("nextMap", () => {
  const list = [
    { id: "01-first-light", name: "01 · First light", locked: false },
    { id: "02-this-way", name: "02 · This way or that", locked: false },
    { id: "64-the-whole-chain", name: "64 · The whole chain", locked: false },
    { id: "locked/01-first-light", name: "01 · First light (locked)", locked: true },
    { id: "locked/02-this-way", name: "02 · This way or that (locked)", locked: true },
  ];

  it("returns the next entry in the same group", () => {
    expect(nextMap(list, "01-first-light")?.id).toBe("02-this-way");
  });

  it("returns null on the last open map when locked maps follow it", () => {
    expect(nextMap(list, "64-the-whole-chain")).toBeNull();
  });

  it("a locked map's next is the next locked map", () => {
    expect(nextMap(list, "locked/01-first-light")?.id).toBe("locked/02-this-way");
  });

  it("returns null on the last locked map", () => {
    expect(nextMap(list, "locked/02-this-way")).toBeNull();
  });

  it("returns null for an unknown key or an empty list", () => {
    expect(nextMap(list, "99-nope")).toBeNull();
    expect(nextMap([], "01-first-light")).toBeNull();
  });
});

describe("winLine", () => {
  it("states the time and the moves", () => {
    expect(winLine(42.34, 7)).toBe("Lit in 0:42.3 · 7 moves");
  });

  it("uses the singular for one move", () => {
    expect(winLine(42.34, 1)).toBe("Lit in 0:42.3 · 1 move");
  });

  it("uses the plural for zero moves", () => {
    expect(winLine(0, 0)).toBe("Lit in 0:00.0 · 0 moves");
  });
});

describe("splashDue", () => {
  it("is the delay constant the ticket names", () => {
    expect(WIN_SPLASH_DELAY).toBe(0.4);
  });

  it("is false before the Relight starts", () => {
    expect(splashDue(null, 2)).toBe(false);
  });

  it("is false just before the delay has passed, and true at it", () => {
    expect(splashDue(2 + 0.39, 2)).toBe(false);
    expect(splashDue(2 + WIN_SPLASH_DELAY, 2)).toBe(true);
    expect(splashDue(2 + 0.4, 2)).toBe(true);
  });
});
