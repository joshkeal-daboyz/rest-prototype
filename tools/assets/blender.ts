/**
 * Finding Blender for the asset pipeline (ticket 038). Pure: the environment, the platform and the
 * file system come in as arguments, so tests never touch the machine they run on.
 */

import { posix, win32 } from "node:path";

/** The oldest Blender whose glTF exporter the pipeline relies on (4.2 LTS). */
export const MIN_BLENDER: readonly [number, number, number] = [4, 2, 0];

export type BlenderVersion = readonly [number, number, number];

export interface FindBlenderDeps {
  env: Readonly<Record<string, string | undefined>>;
  platform: string;
  exists: (path: string) => boolean;
  /** Names (not paths) inside a folder; an empty list when the folder doesn't exist. */
  listDir: (path: string) => readonly string[];
}

/** BLENDER_PATH is set but doesn't point at a file. Not a fall-through: the user asked for that path. */
export class BlenderPathError extends Error {
  constructor(readonly path: string) {
    super(`BLENDER_PATH is set to "${path}", but no file exists there. Fix it or unset it to search PATH.`);
    this.name = "BlenderPathError";
  }
}

/** The text printed (to stderr) when Blender can't be found. */
export const BLENDER_MISSING_TEXT = [
  "Blender not found. The asset pipeline needs Blender 4.2 or newer (free).",
  "Install it from https://www.blender.org/download/ (or: winget install BlenderFoundation.Blender),",
  "then either add its folder to PATH or set BLENDER_PATH to blender.exe, e.g.",
  '  setx BLENDER_PATH "C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe"',
  "",
].join("\n");

function envGet(env: FindBlenderDeps["env"], key: string): string | undefined {
  const direct = env[key];
  if (direct !== undefined) return direct;
  // Windows environment names are case-insensitive ("Path").
  const lower = key.toLowerCase();
  for (const k of Object.keys(env)) {
    if (k.toLowerCase() === lower) return env[k];
  }
  return undefined;
}

/** "Blender 4.10" -> [4, 10]; null when the folder isn't a Blender install folder name. */
function installFolderVersion(name: string): number[] | null {
  const m = /^Blender (\d+(?:\.\d+)*)$/.exec(name);
  if (!m || m[1] === undefined) return null;
  return m[1].split(".").map(Number);
}

/** Numeric, segment by segment, so 4.10 sorts above 4.9. */
function compareSegments(a: readonly number[], b: readonly number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Order: BLENDER_PATH (must exist, else BlenderPathError); the first `blender` / `blender.exe` on
 * PATH; on win32 only, the newest `Blender Foundation\Blender <ver>\blender.exe`. Null when none.
 */
export function findBlender(deps: FindBlenderDeps): string | null {
  const { env, platform, exists, listDir } = deps;
  const isWin = platform === "win32";
  const p = isWin ? win32 : posix;

  const explicit = envGet(env, "BLENDER_PATH");
  if (explicit !== undefined && explicit !== "") {
    if (!exists(explicit)) throw new BlenderPathError(explicit);
    return explicit;
  }

  const pathVar = envGet(env, "PATH");
  if (pathVar) {
    const names = isWin ? ["blender.exe", "blender"] : ["blender"];
    for (const raw of pathVar.split(p.delimiter)) {
      const dir = raw.trim().replace(/^"(.*)"$/, "$1");
      if (dir === "") continue;
      for (const name of names) {
        const candidate = p.join(dir, name);
        if (exists(candidate)) return candidate;
      }
    }
  }

  if (isWin) {
    const programFiles = envGet(env, "ProgramFiles") ?? "C:\\Program Files";
    const base = win32.join(programFiles, "Blender Foundation");
    const installs = listDir(base)
      .map((name) => ({ name, version: installFolderVersion(name) }))
      .filter((e): e is { name: string; version: number[] } => e.version !== null)
      .sort((a, b) => compareSegments(b.version, a.version));
    for (const inst of installs) {
      const exe = win32.join(base, inst.name, "blender.exe");
      if (exists(exe)) return exe;
    }
  }
  return null;
}

/** "Blender 4.2.3 LTS\n..." -> [4, 2, 3]. A missing patch number is 0. Null when it isn't Blender's banner. */
export function parseBlenderVersion(text: string): BlenderVersion | null {
  const m = /Blender\s+(\d+)\.(\d+)(?:\.(\d+))?/.exec(text);
  if (!m || m[1] === undefined || m[2] === undefined) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? "0")];
}

export function formatVersion(v: BlenderVersion): string {
  return v.join(".");
}

/** True when `v` is at least `min`. */
export function versionAtLeast(v: BlenderVersion, min: BlenderVersion = MIN_BLENDER): boolean {
  return compareSegments(v, min) >= 0;
}
