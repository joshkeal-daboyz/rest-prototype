import * as nodeFs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateCalibration } from "../../src/core";
import type { CalibrationPatch } from "../../src/core";
import { calibrationFilePath, CalibrationFileError, patchCalibration, readCalibration, RENAME_ATTEMPTS } from "./store";
import type { StoreFs } from "./store";

const NOW = new Date("2026-11-18T10:00:00.000Z");
const A: CalibrationPatch = { key: "city-pack:SM_Bld_Shop_01", entry: { front: "-x" } };
const B: CalibrationPatch = { key: "town-pack:SM_Bld_Shop_01", entry: { front: "+z", exclude: true } };
const noSleep = (): void => undefined;

let root: string;
let file: string;

beforeEach(() => {
  root = nodeFs.mkdtempSync(join(tmpdir(), "rest-cal-"));
  file = calibrationFilePath(root);
});
afterEach(() => {
  nodeFs.rmSync(root, { recursive: true, force: true });
});

function leftovers(): string[] {
  return nodeFs.readdirSync(join(file, "..")).filter((n) => n.endsWith(".tmp"));
}

function validOnDisk(): void {
  const result = validateCalibration(JSON.parse(nodeFs.readFileSync(file, "utf8")));
  expect(result.ok).toBe(true);
}

describe("calibration store: the file path", () => {
  it("is always CALIBRATION_FILE under the root and nothing from a request", () => {
    expect(calibrationFilePath(root)).toBe(join(root, "assets", "private", "calibration", "fronts.json"));
  });
});

describe("calibration store: patching", () => {
  it("the first patch creates the missing folder and the file, valid by validateCalibration", () => {
    expect(nodeFs.existsSync(join(file, ".."))).toBe(false);
    const written = patchCalibration(file, A, NOW);
    expect(nodeFs.existsSync(file)).toBe(true);
    validOnDisk();
    expect(written.entries["city-pack:SM_Bld_Shop_01"]).toEqual({ front: "-x", at: NOW.toISOString() });
    expect(leftovers()).toEqual([]);
  });

  it("a second patch keeps the first key", () => {
    patchCalibration(file, A, NOW);
    patchCalibration(file, B, NOW);
    validOnDisk();
    const saved = readCalibration(file);
    expect(Object.keys(saved?.entries ?? {})).toEqual(["city-pack:SM_Bld_Shop_01", "town-pack:SM_Bld_Shop_01"]);
    expect(saved?.entries["town-pack:SM_Bld_Shop_01"]).toMatchObject({ front: "+z", exclude: true });
    expect(leftovers()).toEqual([]);
  });

  it("a null patch deletes a key and leaves the others", () => {
    patchCalibration(file, A, NOW);
    patchCalibration(file, B, NOW);
    patchCalibration(file, { key: A.key, entry: null }, NOW);
    validOnDisk();
    expect(Object.keys(readCalibration(file)?.entries ?? {})).toEqual(["town-pack:SM_Bld_Shop_01"]);
    expect(leftovers()).toEqual([]);
  });

  it("readCalibration is null for an absent file", () => {
    expect(readCalibration(file)).toBeNull();
  });

  it("a file that is not a calibration file is refused and left alone, never overwritten", () => {
    nodeFs.mkdirSync(join(file, ".."), { recursive: true });
    nodeFs.writeFileSync(file, "{ not json", "utf8");
    expect(() => patchCalibration(file, A, NOW)).toThrow(CalibrationFileError);
    expect(nodeFs.readFileSync(file, "utf8")).toBe("{ not json");
    nodeFs.writeFileSync(file, JSON.stringify({ version: 2, savedAt: NOW.toISOString(), entries: {} }), "utf8");
    expect(() => readCalibration(file)).toThrow(CalibrationFileError);
  });
});

/** The real fs, with `renameSync` replaced. */
function fsWithRename(renameSync: StoreFs["renameSync"]): StoreFs {
  return {
    existsSync: nodeFs.existsSync,
    readFileSync: (p, enc) => nodeFs.readFileSync(p, enc),
    writeFileSync: (p, d, enc) => nodeFs.writeFileSync(p, d, enc),
    mkdirSync: (p, o) => nodeFs.mkdirSync(p, o),
    rmSync: (p, o) => nodeFs.rmSync(p, o),
    renameSync,
  };
}

describe("calibration store: atomic write", () => {
  it("a failing rename leaves the old file untouched and readable, removes the temp file, and throws the error", () => {
    patchCalibration(file, A, NOW);
    const before = nodeFs.readFileSync(file, "utf8");
    const failing = fsWithRename(() => {
      throw Object.assign(new Error("disk on fire"), { code: "EIO" });
    });
    expect(() => patchCalibration(file, B, NOW, { fs: failing, sleep: noSleep })).toThrow("disk on fire");
    expect(nodeFs.readFileSync(file, "utf8")).toBe(before);
    validOnDisk();
    expect(leftovers()).toEqual([]);
  });

  it("a rename that fails once with EPERM succeeds on the retry", () => {
    patchCalibration(file, A, NOW);
    let calls = 0;
    const flaky = fsWithRename((from, to) => {
      calls++;
      if (calls === 1) throw Object.assign(new Error("held by a scanner"), { code: "EPERM" });
      nodeFs.renameSync(from, to);
    });
    const written = patchCalibration(file, B, NOW, { fs: flaky, sleep: noSleep });
    expect(calls).toBe(2);
    expect(Object.keys(written.entries)).toHaveLength(2);
    validOnDisk();
    expect(leftovers()).toEqual([]);
  });

  it("a rename that stays busy gives up after the allowed attempts and keeps the old file", () => {
    patchCalibration(file, A, NOW);
    const before = nodeFs.readFileSync(file, "utf8");
    let calls = 0;
    const stuck = fsWithRename(() => {
      calls++;
      throw Object.assign(new Error("busy"), { code: "EBUSY" });
    });
    expect(() => patchCalibration(file, B, NOW, { fs: stuck, sleep: noSleep })).toThrow("busy");
    expect(calls).toBe(RENAME_ATTEMPTS);
    expect(nodeFs.readFileSync(file, "utf8")).toBe(before);
    expect(leftovers()).toEqual([]);
  });
});
