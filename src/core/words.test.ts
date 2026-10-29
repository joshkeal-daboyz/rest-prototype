import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as core from "./index";
import {
  DEFAULT_PLACE_KIND,
  NAME_SEP,
  NO_LIMIT,
  PLACE_KINDS,
  THING_NAMES,
  carryingText,
  fuseLabel,
  lampLabel,
  lampOnLabel,
  levelLabel,
  namedPowersourceLabel,
  onPowersourceText,
  placeBase,
  placeKind,
  placeName,
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

describe("placeKind (ticket 024)", () => {
  const TABLE: Record<string, string[]> = {
    sacred: ["shrine", "chapel", "bell", "tower"],
    water: ["well"],
    mill: ["mill"],
    gate: ["gate"],
    work: ["forge", "kiln", "ovens", "bakery", "tannery", "smithy"],
    market: ["market", "stall", "yard"],
    hall: ["inn", "hall", "infirmary", "lamphouse"],
    home: ["home", "cottage", "house"],
    homes: ["homes", "houses"],
    streetlight: ["lantern", "lane", "flood", "porch", "lift", "steps", "stair", "street", "lamp"],
  };

  for (const [kind, names] of Object.entries(TABLE)) {
    it(`maps ${names.join(", ")} to ${kind}`, () => {
      for (const n of names) expect(placeKind(n), n).toBe(kind);
    });
  }

  it("the table has exactly the listed names", () => {
    expect(Object.keys(PLACE_KINDS).sort()).toEqual(Object.values(TABLE).flat().sort());
  });

  it("strips a trailing _N or _NN", () => {
    expect(placeKind("home_2")).toBe("home");
    expect(placeKind("home_1")).toBe("home");
    expect(placeKind("lamp_07")).toBe("streetlight");
    expect(placeKind("lamp_12")).toBe("streetlight");
    expect(placeKind("street_3")).toBe("streetlight");
    expect(placeBase("lamp_07")).toBe("lamp");
  });

  it("strips only one trailing number of one or two digits", () => {
    expect(placeBase("mill_123")).toBe("mill_123");
    expect(placeBase("mill_2_3")).toBe("mill_2");
  });

  it("is case-insensitive", () => {
    expect(placeKind("Shrine")).toBe("sacred");
    expect(placeKind("MILL_2")).toBe("mill");
  });

  it("gives home for an unknown name", () => {
    expect(DEFAULT_PLACE_KIND).toBe("home");
    expect(placeKind("cathedral")).toBe("home");
    expect(placeKind("")).toBe("home");
    expect(placeKind("toString")).toBe("home");
    expect(placeKind("constructor_2")).toBe("home");
  });
});

describe("every lamp id in puzzles/ has a place kind of its own (ticket 024)", () => {
  const root = join(__dirname, "..", "..", "puzzles");
  const dirs = [root, join(root, "locked")].filter((d) => existsSync(d));
  const lamps: { file: string; id: string }[] = [];
  for (const d of dirs) {
    for (const f of readdirSync(d).filter((x) => x.endsWith(".json"))) {
      const p = JSON.parse(readFileSync(join(d, f), "utf8")) as { nodes?: { id: string; type: string }[] };
      for (const n of p.nodes ?? []) if (n.type === "lamp") lamps.push({ file: f, id: n.id });
    }
  }

  it("finds lamps to check", () => {
    expect(lamps.length).toBeGreaterThan(0);
  });

  it("no lamp id falls through to the default kind (add a new name to PLACE_KINDS)", () => {
    const missing = lamps.filter((l) => !Object.prototype.hasOwnProperty.call(PLACE_KINDS, placeBase(l.id)));
    expect(missing.map((l) => `${l.file}: ${l.id}`)).toEqual([]);
  });
});

describe("placeName (ticket 024)", () => {
  it("is the list's current text: underscores as spaces", () => {
    expect(placeName("home_1")).toBe("home 1");
    expect(placeName("shrine")).toBe("shrine");
    expect(placeName("lamp_07")).toBe("lamp 07");
  });

  it("place words are re-exported from src/core", () => {
    expect(core.placeKind).toBe(placeKind);
    expect(core.placeName).toBe(placeName);
  });
});
