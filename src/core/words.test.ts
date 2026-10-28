import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "./index";
import {
  NO_LIMIT,
  THING_NAMES,
  carryingText,
  fuseLabel,
  lampLabel,
  levelLabel,
  powersourceLabel,
  usingText,
} from "./words";

describe("levelLabel", () => {
  it("puts Lv and the level before each thing's name", () => {
    expect(levelLabel("lamp", 2)).toBe("Lv2 Lamp");
    expect(levelLabel("fuse", 3)).toBe("Lv3 Fuse");
    expect(levelLabel("powersource", 4)).toBe("Lv4 Powersource");
  });

  it("gives just the name when there is no level (null)", () => {
    expect(levelLabel("lamp", null)).toBe("Lamp");
    expect(levelLabel("fuse", null)).toBe("Fuse");
    expect(levelLabel("powersource", null)).toBe("Powersource");
  });

  it("gives just the name when there is no level (undefined)", () => {
    expect(levelLabel("lamp", undefined)).toBe("Lamp");
    expect(levelLabel("fuse", undefined)).toBe("Fuse");
    expect(levelLabel("powersource", undefined)).toBe("Powersource");
  });

  it("names the three things", () => {
    expect(THING_NAMES).toEqual({ lamp: "Lamp", fuse: "Fuse", powersource: "Powersource" });
  });
});

describe("the named labels", () => {
  it("lampLabel", () => {
    expect(lampLabel(2)).toBe("Lv2 Lamp");
  });

  it("fuseLabel", () => {
    expect(fuseLabel(3)).toBe("Lv3 Fuse");
    expect(fuseLabel(undefined)).toBe("Fuse");
  });

  it("powersourceLabel", () => {
    expect(powersourceLabel(4)).toBe("Lv4 Powersource");
    expect(powersourceLabel(null)).toBe("Powersource");
  });
});

describe("live totals", () => {
  it("usingText against a limit", () => {
    expect(usingText(3, 4)).toBe("using 3 of 4");
  });

  it("usingText with no limit says so (map and HUD alike, Josh 017)", () => {
    expect(usingText(3, null)).toBe("using 3 (no limit)");
  });

  it("carryingText", () => {
    expect(carryingText(2, 3)).toBe("carrying 2 of 3");
    expect(carryingText(2, undefined)).toBe("carrying 2");
    expect(carryingText(2, null)).toBe("carrying 2");
  });

  it("NO_LIMIT", () => {
    expect(NO_LIMIT).toBe("(no limit)");
  });
});

describe("numbers print as given", () => {
  it("non-integers", () => {
    expect(lampLabel(2.5)).toBe("Lv2.5 Lamp");
    expect(usingText(2.5, 4)).toBe("using 2.5 of 4");
  });
});

describe("words.ts is pure and extractable", () => {
  it("has no import line", () => {
    const source = readFileSync(join(__dirname, "words.ts"), "utf8");
    expect(source).not.toMatch(/^\s*import\b/m);
    expect(source).not.toMatch(/\brequire\(/);
  });

  it("is re-exported from src/core", () => {
    expect(core.lampLabel).toBe(lampLabel);
    expect(core.usingText).toBe(usingText);
    expect(core.NO_LIMIT).toBe(NO_LIMIT);
  });
});
