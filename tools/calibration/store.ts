/**
 * The calibration file's store (ticket 045 B). Node only, no Vite import. Reads and patches
 * `assets/private/calibration/fronts.json`, writing atomically: a temp file in the same folder, then a rename
 * over the real one, so a crash or a reader never sees half a file.
 *
 * Nothing from a request becomes a path: the file is always `CALIBRATION_FILE` under the root the plugin was
 * given, so `calibrationFilePath(root)` is the only way a path is made.
 */

import * as nodeFs from "node:fs";
import { dirname, join } from "node:path";
import { applyCalibrationPatch, CALIBRATION_FILE, validateCalibration } from "../../src/core";
import type { CalibrationFile, CalibrationPatch } from "../../src/core";

/** The slice of `node:fs` the store uses, so tests can make a rename fail. */
export interface StoreFs {
  existsSync(path: string): boolean;
  readFileSync(path: string, encoding: "utf8"): string;
  writeFileSync(path: string, data: string, encoding: "utf8"): void;
  mkdirSync(path: string, options: { recursive: true }): unknown;
  renameSync(from: string, to: string): void;
  rmSync(path: string, options: { force: true }): void;
}

export interface StoreDeps {
  fs?: StoreFs;
  /** Waits between rename retries. The default blocks for a few milliseconds; tests pass a no-op. */
  sleep?: (ms: number) => void;
}

/** How many times a rename that fails with EPERM or EBUSY (Windows: an editor or scanner holds the file) is tried. */
export const RENAME_ATTEMPTS = 5;
const RENAME_WAIT_MS = 25;

/** The file is there but isn't a calibration file (bad JSON, or refused by `validateCalibration`). It is left alone. */
export class CalibrationFileError extends Error {
  constructor(
    readonly file: string,
    readonly errors: readonly string[],
  ) {
    super(`${file}: ${errors.join("; ")}`);
    this.name = "CalibrationFileError";
  }
}

/** The one path the store ever touches: `CALIBRATION_FILE` under `root`. */
export function calibrationFilePath(root: string): string {
  return join(root, ...CALIBRATION_FILE.split("/"));
}

function defaultSleep(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * The file as saved, or null when it does not exist. A file that exists but is not valid throws
 * `CalibrationFileError` (it is never silently replaced: an overwrite would lose Josh's marks).
 */
export function readCalibration(file: string, deps: StoreDeps = {}): CalibrationFile | null {
  const fs = deps.fs ?? nodeFs;
  if (!fs.existsSync(file)) return null;
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new CalibrationFileError(file, [`not valid JSON (${(e as Error).message})`]);
  }
  const checked = validateCalibration(json);
  if (!checked.ok) throw new CalibrationFileError(file, checked.errors);
  return checked.file;
}

function isBusy(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  return code === "EPERM" || code === "EBUSY";
}

/**
 * Applies one patch to the file (starting empty when it is absent) and writes the result atomically. Returns the
 * file as written. Creates the folder if it is missing. On any failure the old file is untouched and the temp file
 * is removed; the error is thrown (the handler turns it into a 500).
 */
export function patchCalibration(file: string, patch: CalibrationPatch, now: Date, deps: StoreDeps = {}): CalibrationFile {
  const fs = deps.fs ?? nodeFs;
  const sleep = deps.sleep ?? defaultSleep;
  const next = applyCalibrationPatch(readCalibration(file, deps), patch, now);
  const checked = validateCalibration(next);
  if (!checked.ok) throw new Error(`patchCalibration: result refused: ${checked.errors.join("; ")}`);

  const tmp = `${file}.tmp`;
  fs.mkdirSync(dirname(file), { recursive: true });
  try {
    fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    for (let attempt = 1; ; attempt++) {
      try {
        fs.renameSync(tmp, file);
        break;
      } catch (e) {
        if (!isBusy(e) || attempt >= RENAME_ATTEMPTS) throw e;
        sleep(RENAME_WAIT_MS);
      }
    }
  } catch (e) {
    try {
      fs.rmSync(tmp, { force: true });
    } catch {
      // The write already failed; the temp file is only litter.
    }
    throw e;
  }
  return next;
}
