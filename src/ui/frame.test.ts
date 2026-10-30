import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { capacityRowsKey, fieldKey, setAttr, setClass, setProp, setText, targetRowsKey } from "./frame";
import { capacityRows, inventoryRows, partsSummary, targetRows, type CapacityRow, type TargetRow } from "./logic";

afterEach(() => {
  vi.restoreAllMocks();
});

/** An attribute node that counts its writes. */
function stubAttrNode(): { node: { getAttribute(n: string): string | null; setAttribute(n: string, v: string): void }; writes: () => number } {
  const attrs = new Map<string, string>();
  let writes = 0;
  return {
    node: {
      getAttribute: (n) => attrs.get(n) ?? null,
      setAttribute: (n, v) => {
        writes++;
        attrs.set(n, v);
      },
    },
    writes: () => writes,
  };
}

/** A class node that counts its toggles. */
function stubClassNode(initial: string[] = []): { node: { classList: { contains(n: string): boolean; toggle(n: string, force?: boolean): boolean } }; writes: () => number } {
  const classes = new Set(initial);
  let writes = 0;
  return {
    node: {
      classList: {
        contains: (n) => classes.has(n),
        toggle: (n, force) => {
          writes++;
          const on = force ?? !classes.has(n);
          if (on) classes.add(n);
          else classes.delete(n);
          return on;
        },
      },
    },
    writes: () => writes,
  };
}

/** A property stub (`hidden`, `value`, `left`) whose setter counts its writes. */
function stubProp<K extends string, V>(key: K, initial: V): { node: Record<K, V>; writes: () => number } {
  let value = initial;
  let writes = 0;
  const node = {} as Record<K, V>;
  Object.defineProperty(node, key, {
    get: () => value,
    set: (v: V) => {
      writes++;
      value = v;
    },
    enumerable: true,
  });
  return { node, writes: () => writes };
}

describe("setAttr", () => {
  it("writes once for 1,000 calls with the same value, and once more for a changed value", () => {
    const stub = stubAttrNode();
    for (let i = 0; i < 1000; i++) setAttr(stub.node, "aria-label", "On hand: 1 bulb");
    expect(stub.writes()).toBe(1);
    expect(stub.node.getAttribute("aria-label")).toBe("On hand: 1 bulb");
    setAttr(stub.node, "aria-label", "On hand: 2 bulbs");
    expect(stub.writes()).toBe(2);
    expect(stub.node.getAttribute("aria-label")).toBe("On hand: 2 bulbs");
  });

  it("writes an attribute that is missing", () => {
    const stub = stubAttrNode();
    setAttr(stub.node, "aria-pressed", "false");
    expect(stub.writes()).toBe(1);
  });
});

describe("setClass", () => {
  it("toggles once for 1,000 calls with the same state, and once more for a changed state", () => {
    const stub = stubClassNode();
    for (let i = 0; i < 1000; i++) setClass(stub.node, "muted", true);
    expect(stub.writes()).toBe(1);
    expect(stub.node.classList.contains("muted")).toBe(true);
    setClass(stub.node, "muted", false);
    expect(stub.writes()).toBe(2);
    expect(stub.node.classList.contains("muted")).toBe(false);
  });

  it("makes no toggle when the class is already off and asked to be off", () => {
    const stub = stubClassNode();
    for (let i = 0; i < 1000; i++) setClass(stub.node, "empty", false);
    expect(stub.writes()).toBe(0);
  });
});

describe("setProp", () => {
  it("assigns once for 1,000 calls with the same value, and once more for a changed value", () => {
    const stub = stubProp("hidden", false);
    for (let i = 0; i < 1000; i++) setProp(stub.node, "hidden", true);
    expect(stub.writes()).toBe(1);
    expect(stub.node.hidden).toBe(true);
    setProp(stub.node, "hidden", false);
    expect(stub.writes()).toBe(2);
  });

  it("guards a style longhand the same way", () => {
    const stub = stubProp("left", "");
    for (let i = 0; i < 1000; i++) setProp(stub.node, "left", "16px");
    expect(stub.writes()).toBe(1);
  });
});

describe("setText", () => {
  it("writes once for 1,000 calls with the same text, and once more for changed text", () => {
    const stub = stubProp("textContent", "" as string | null);
    for (let i = 0; i < 1000; i++) setText(stub.node, "Repair");
    expect(stub.writes()).toBe(1);
    setText(stub.node, "Throw breaker");
    expect(stub.writes()).toBe(2);
  });
});

/** A capacity row for the key tests. */
function cap(text: string, alarm: boolean): CapacityRow {
  return { text, alarm };
}

/** A target row for the key tests. */
function tgt(id: string, lit: boolean, text: string): TargetRow {
  return { id, lit, text };
}

describe("fieldKey", () => {
  it("does not let two different field lists share a key", () => {
    expect(fieldKey(["ab", "c"])).not.toBe(fieldKey(["a", "bc"]));
    expect(fieldKey(["1:a"])).not.toBe(fieldKey(["a"]));
    expect(fieldKey(["x|y"])).not.toBe(fieldKey(["x", "y"]));
  });
});

describe("capacityRowsKey", () => {
  it("is equal for equal rows, in new arrays", () => {
    expect(capacityRowsKey([cap("Lv4 Powersource — using 3 of 4", false)])).toBe(
      capacityRowsKey([cap("Lv4 Powersource — using 3 of 4", false)]),
    );
  });

  it("differs when the text of a row changes", () => {
    expect(capacityRowsKey([cap("using 3 of 4", false)])).not.toBe(capacityRowsKey([cap("using 4 of 4", false)]));
  });

  it("differs when the alarm of a row changes (the brownout class)", () => {
    expect(capacityRowsKey([cap("using 3 of 4", false)])).not.toBe(capacityRowsKey([cap("using 3 of 4", true)]));
  });

  it("differs when a row is added or removed", () => {
    const one = [cap("North", false)];
    const two = [cap("North", false), cap("South", false)];
    expect(capacityRowsKey(one)).not.toBe(capacityRowsKey(two));
    expect(capacityRowsKey(two)).not.toBe(capacityRowsKey(one));
    expect(capacityRowsKey(one)).not.toBe(capacityRowsKey([]));
  });

  it("differs for the same texts split differently across rows", () => {
    expect(capacityRowsKey([cap("a", false), cap("b", false)])).not.toBe(capacityRowsKey([cap("ab", false)]));
  });
});

describe("targetRowsKey", () => {
  it("is equal for equal rows, in new arrays", () => {
    expect(targetRowsKey([tgt("lamp-1", true, "Lamp 1: lit")])).toBe(targetRowsKey([tgt("lamp-1", true, "Lamp 1: lit")]));
  });

  it("differs when the lamp id changes", () => {
    expect(targetRowsKey([tgt("lamp-1", true, "t")])).not.toBe(targetRowsKey([tgt("lamp-2", true, "t")]));
  });

  it("differs when lit changes", () => {
    expect(targetRowsKey([tgt("lamp-1", true, "t")])).not.toBe(targetRowsKey([tgt("lamp-1", false, "t")]));
  });

  it("differs when the text changes", () => {
    expect(targetRowsKey([tgt("lamp-1", true, "Lamp 1: lit")])).not.toBe(targetRowsKey([tgt("lamp-1", true, "Lamp 1: dark")]));
  });

  it("differs when the list grows or shrinks", () => {
    const one = [tgt("lamp-1", true, "a")];
    const two = [tgt("lamp-1", true, "a"), tgt("lamp-2", false, "b")];
    expect(targetRowsKey(one)).not.toBe(targetRowsKey(two));
    expect(targetRowsKey([])).not.toBe(targetRowsKey(one));
  });
});

describe("per-frame path", () => {
  it("makes no JSON.stringify call while building the rows and keys update() uses", () => {
    const spy = vi.spyOn(JSON, "stringify");
    const state = { load: 3, capacity: 4, brownout: false, feeds: new Map() };
    const capRows = capacityRows(state, []);
    const rows = targetRows(["lamp-1", "lamp-2"], new Set(["lamp-1"]), false);
    capacityRowsKey(capRows);
    targetRowsKey(rows);
    inventoryRows(["wire", "fuse"]);
    partsSummary(["wire", "fuse"]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps JSON.stringify out of the overlay source (a tripwire for the per-frame path)", () => {
    for (const file of ["./index.ts", "./frame.ts"]) {
      expect(readFileSync(new URL(file, import.meta.url), "utf8"), file).not.toMatch(/JSON\.stringify/);
    }
  });
});
