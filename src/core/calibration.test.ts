import { describe, expect, it } from "vitest";
import {
  CALIBRATION_VERSION,
  applyCalibrationPatch,
  calibrationKey,
  emptyCalibration,
  parseCalibrationKey,
  validateCalibration,
  validateCalibrationPatch,
  type CalibrationFile,
  type CalibrationPatch,
} from "./calibration";

const T1 = "2026-11-18T10:01:40.000Z";
const T2 = "2026-11-18T10:02:11.000Z";

function validFile(): Record<string, unknown> {
  return {
    version: 1,
    savedAt: T2,
    entries: {
      "city-pack:SM_Bld_Shop_01": { front: "-x", at: T1 },
      "town-pack:SM_Bld_Shop_01": { front: "+z", exclude: true, at: T2 },
      "town-pack:SM_Bld_Church_01": { exclude: true, at: T2 },
    },
  };
}

function withEntry(key: string, entry: unknown): Record<string, unknown> {
  return { version: 1, savedAt: T2, entries: { [key]: entry } };
}

function errorsOf(json: unknown): readonly string[] {
  const r = validateCalibration(json);
  expect(r.ok).toBe(false);
  return r.ok ? [] : r.errors;
}

describe("calibrationKey and parseCalibrationKey", () => {
  it("builds pack:name and round-trips it", () => {
    const key = calibrationKey("city-pack", "SM_Bld_Shop_01");
    expect(key).toBe("city-pack:SM_Bld_Shop_01");
    expect(parseCalibrationKey(key)).toEqual({ pack: "city-pack", name: "SM_Bld_Shop_01" });
  });

  it("splits at the first colon only", () => {
    expect(parseCalibrationKey("simple-town:a:b")).toEqual({ pack: "simple-town", name: "a:b" });
  });

  it.each(["SM_Bld_Shop_01", ":x", "City:x", "a:", "a:b/c", "a:b\\c", "a:b\nc", "a:b\u0000", "a:b\u007f"])(
    "refuses %j",
    (key) => {
      expect(parseCalibrationKey(key)).toBeNull();
    },
  );

  it("refuses a non-string", () => {
    expect(parseCalibrationKey(42)).toBeNull();
    expect(parseCalibrationKey(null)).toBeNull();
  });
});

describe("validateCalibration", () => {
  it("accepts a valid file and an empty one", () => {
    const r = validateCalibration(validFile());
    expect(r.ok).toBe(true);
    expect(validateCalibration(emptyCalibration(new Date(T1))).ok).toBe(true);
  });

  it("accepts an ISO time with an offset", () => {
    expect(validateCalibration(withEntry("a:b", { front: "-z", at: "2026-11-18T10:01:40+01:00" })).ok).toBe(true);
  });

  it("refuses a non-object", () => {
    for (const bad of [null, 1, "x", [], undefined]) expect(errorsOf(bad).join()).toMatch(/JSON object/);
  });

  it("refuses another version", () => {
    expect(errorsOf({ ...validFile(), version: 2 }).join()).toMatch(/version 2/);
    expect(errorsOf({ ...validFile(), version: undefined }).join()).toMatch(/version/);
  });

  it("refuses a bad key, naming it", () => {
    expect(errorsOf(withEntry("SM_Bld_Shop_01", { front: "-z", at: T1 })).join()).toMatch(/"SM_Bld_Shop_01".*pack:name/);
    expect(errorsOf(withEntry("City:x", { front: "-z", at: T1 })).join()).toMatch(/"City:x"/);
  });

  it("refuses an empty entry, naming the key", () => {
    expect(errorsOf(withEntry("a:b", { at: T1 })).join()).toMatch(/a:b: .*neither front nor exclude/);
  });

  it("refuses notBuilding (no such mark), with or without front or exclude, naming the key", () => {
    expect(errorsOf(withEntry("a:b", { notBuilding: true, at: T1 })).join()).toMatch(/a:b: unknown field "notBuilding"/);
    expect(errorsOf(withEntry("a:b", { notBuilding: true, front: "-z", at: T1 })).join()).toMatch(
      /a:b: unknown field "notBuilding"/,
    );
    expect(errorsOf(withEntry("a:b", { notBuilding: true, exclude: true, at: T1 })).join()).toMatch(
      /a:b: unknown field "notBuilding"/,
    );
  });

  it("refuses a front outside the four, naming the key", () => {
    for (const front of ["z", "+y", "-Z", 1, null]) {
      expect(errorsOf(withEntry("a:b", { front, at: T1 })).join()).toMatch(/a:b: front/);
    }
  });

  it("refuses exclude other than true", () => {
    expect(errorsOf(withEntry("a:b", { front: "-z", exclude: false, at: T1 })).join()).toMatch(/a:b: exclude/);
  });

  it("refuses a missing or bad at, naming the key", () => {
    for (const at of [undefined, "", "yesterday", "2026-13-45T99:99:99Z", "2026-11-18", 1731924100000]) {
      expect(errorsOf(withEntry("a:b", { front: "-z", at })).join()).toMatch(/a:b: at/);
    }
  });

  it("refuses a missing or bad savedAt", () => {
    expect(errorsOf({ ...validFile(), savedAt: undefined }).join()).toMatch(/savedAt/);
    expect(errorsOf({ ...validFile(), savedAt: "not a time" }).join()).toMatch(/savedAt/);
  });

  it("refuses unknown fields on the file and on an entry", () => {
    expect(errorsOf({ ...validFile(), extra: 1 }).join()).toMatch(/unknown field "extra"/);
    expect(errorsOf(withEntry("a:b", { front: "-z", at: T1, open: "-x" })).join()).toMatch(/a:b: unknown field "open"/);
  });

  it("refuses entries that are not an object, or an entry that is not an object", () => {
    expect(errorsOf({ ...validFile(), entries: [] }).join()).toMatch(/entries/);
    expect(errorsOf(withEntry("a:b", "-z")).join()).toMatch(/a:b: the entry must be an object/);
  });
});

describe("validateCalibrationPatch", () => {
  it("accepts a set and a clear", () => {
    expect(validateCalibrationPatch({ key: "city-pack:SM_Bld_Shop_01", entry: { front: "-x" } }).ok).toBe(true);
    expect(validateCalibrationPatch({ key: "a:b", entry: { front: "+z", exclude: true } }).ok).toBe(true);
    expect(validateCalibrationPatch({ key: "a:b", entry: { exclude: true } }).ok).toBe(true);
    expect(validateCalibrationPatch({ key: "a:b", entry: null }).ok).toBe(true);
  });

  it.each([
    ["a non-object", "x", /JSON object/],
    ["a bad key", { key: "nokey", entry: null }, /key "nokey"/],
    ["a missing entry", { key: "a:b" }, /a:b: entry is missing/],
    ["an empty entry", { key: "a:b", entry: {} }, /a:b: .*neither/],
    ["notBuilding", { key: "a:b", entry: { notBuilding: true } }, /a:b: unknown field "notBuilding"/],
    ["an at (the server stamps it)", { key: "a:b", entry: { front: "-z", at: T1 } }, /a:b: unknown field "at"/],
    ["a bad front", { key: "a:b", entry: { front: "up" } }, /a:b: front/],
    ["an unknown field", { key: "a:b", entry: null, extra: 1 }, /unknown field "extra"/],
  ])("refuses %s", (_label, body, message) => {
    const r = validateCalibrationPatch(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(message);
  });
});

describe("applyCalibrationPatch", () => {
  const now1 = new Date(T1);
  const now2 = new Date(T2);

  it("sets a key on an empty start, stamping at and savedAt", () => {
    const f = applyCalibrationPatch(null, { key: "city-pack:SM_Bld_Shop_01", entry: { front: "-x" } }, now1);
    expect(f).toEqual({
      version: CALIBRATION_VERSION,
      savedAt: T1,
      entries: { "city-pack:SM_Bld_Shop_01": { front: "-x", at: T1 } },
    });
    expect(validateCalibration(f).ok).toBe(true);
  });

  it("replaces a key, keeps the others, and deletes on null", () => {
    let f = applyCalibrationPatch(null, { key: "a:one", entry: { front: "-x" } }, now1);
    f = applyCalibrationPatch(f, { key: "a:two", entry: { exclude: true } }, now1);
    f = applyCalibrationPatch(f, { key: "a:one", entry: { front: "+z", exclude: true } }, now2);
    expect(f.entries).toEqual({ "a:one": { front: "+z", exclude: true, at: T2 }, "a:two": { exclude: true, at: T1 } });
    expect(f.savedAt).toBe(T2);
    f = applyCalibrationPatch(f, { key: "a:two", entry: null }, now2);
    expect(f.entries).toEqual({ "a:one": { front: "+z", exclude: true, at: T2 } });
    expect(validateCalibration(f).ok).toBe(true);
  });

  it("deleting an absent key is a no-op apart from savedAt", () => {
    const f = applyCalibrationPatch(emptyCalibration(now1), { key: "a:b", entry: null }, now2);
    expect(f).toEqual(emptyCalibration(now2));
  });

  it("writes keys sorted, whatever the order they arrived in", () => {
    let f: CalibrationFile | null = null;
    for (const key of ["town-pack:Z", "city-pack:b", "city-pack:A", "apocalypse-power:x"] as const) {
      f = applyCalibrationPatch(f, { key, entry: { front: "-z" } }, now1);
    }
    expect(Object.keys(f!.entries)).toEqual(["apocalypse-power:x", "city-pack:A", "city-pack:b", "town-pack:Z"]);
    expect(JSON.stringify(Object.keys(JSON.parse(JSON.stringify(f)).entries))).toBe(
      JSON.stringify(["apocalypse-power:x", "city-pack:A", "city-pack:b", "town-pack:Z"]),
    );
  });

  it("never mutates its inputs", () => {
    const file = applyCalibrationPatch(null, { key: "a:b", entry: { front: "-x" } }, now1);
    const fileCopy = structuredClone(file);
    const patch: CalibrationPatch = { key: "a:b", entry: { front: "+x", exclude: true } };
    const patchCopy = structuredClone(patch);
    const out = applyCalibrationPatch(file, patch, now2);
    expect(file).toEqual(fileCopy);
    expect(patch).toEqual(patchCopy);
    expect(out.entries).not.toBe(file.entries);
    applyCalibrationPatch(file, { key: "a:b", entry: null }, now2);
    expect(file).toEqual(fileCopy);
  });

  it("always returns a file validateCalibration accepts, for every valid patch shape", () => {
    const entries = [{ front: "+z" }, { front: "-z" }, { front: "+x" }, { front: "-x" }, { exclude: true }, { front: "-x", exclude: true }, null] as const;
    let f: CalibrationFile | null = null;
    for (const entry of entries) {
      f = applyCalibrationPatch(f, { key: "p:n", entry } as CalibrationPatch, now1);
      expect(validateCalibration(f).ok).toBe(true);
    }
  });

  it("throws on an invalid patch or time instead of returning an invalid file", () => {
    expect(() => applyCalibrationPatch(null, { key: "bad" as never, entry: { front: "-z" } }, now1)).toThrow(/key/);
    expect(() => applyCalibrationPatch(null, { key: "a:b", entry: {} }, now1)).toThrow(/neither/);
    expect(() => applyCalibrationPatch(null, { key: "a:b", entry: { front: "-z" } }, new Date(NaN))).toThrow();
  });
});

describe("emptyCalibration", () => {
  it("is version 1 with no entries, saved at now", () => {
    expect(emptyCalibration(new Date(T1))).toEqual({ version: 1, savedAt: T1, entries: {} });
  });
});
