import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "./index";
import {
  NAME_SEP,
  NO_LIMIT,
  THING_NAMES,
  carryingText,
  fuseLabel,
  lampLabel,
  lampOnLabel,
  levelLabel,
  namedPowersourceLabel,
  onPowersourceText,
  powersourceLabel,
  powersourceName,
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

describe("which powersource (ticket 015)", () => {
  it("NAME_SEP is the dot separator", () => {
    expect(NAME_SEP).toBe(" · ");
  });

  it("powersourceName uses the name, else the id with underscores as spaces", () => {
    expect(powersourceName("north", "North")).toBe("North");
    expect(powersourceName("north_feed")).toBe("north feed");
    expect(powersourceName("north_feed", undefined)).toBe("north feed");
    expect(powersourceName("feed")).toBe("feed");
  });

  it("namedPowersourceLabel", () => {
    expect(namedPowersourceLabel("North", 4)).toBe("North · Lv4 Powersource");
    expect(namedPowersourceLabel("North", null)).toBe("North · Powersource");
  });

  it("onPowersourceText and lampOnLabel", () => {
    expect(onPowersourceText("North")).toBe("on North");
    expect(lampOnLabel(2, "North")).toBe("Lv2 Lamp · on North");
  });

  it("composes into the HUD row and the brownout notice the ticket names", () => {
    expect(`${namedPowersourceLabel("North", 4)} — ${usingText(3, 4)}`).toBe("North · Lv4 Powersource — using 3 of 4");
    expect(`Brownout: ${namedPowersourceLabel("North", 4)} ${usingText(5, 4)}`).toBe("Brownout: North · Lv4 Powersource using 5 of 4");
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
