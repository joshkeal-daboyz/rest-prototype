/**
 * The pure core of `npm run build:itch` (ticket 083 C): the game-pack check, the zip plan, itch.io's limits and the
 * outside-the-repo test. No file system, no process; `run.ts` supplies those.
 */

import { posix, win32 } from "node:path";
import { FX_MESHES, FX_TEXTURES, ITCH_LIMITS } from "../../src/core";
import type { AssetManifest, ItchFile, ItchProblem } from "../../src/core";

/** The game pack's place under the zip root and the repo. */
export const GAME_ZIP_DIR = "assets/private/out/game/";
/** The saved front calibration's place under the zip root and the repo. */
export const CALIBRATION_ZIP_PATH = "assets/private/calibration/fronts.json";

/**
 * Check the game pack against what the game loads. Returns every problem, not the first.
 * `exists` takes a path relative to the game pack folder (forward slashes).
 * `keys` is `gameModelKeys()`; the `FX_MESHES` keys are added here. `colourways` is `gameColourways()`.
 */
export function checkGamePack(
  game: AssetManifest | null,
  full: AssetManifest | null,
  keys: readonly string[],
  colourways: readonly string[],
  exists: (relPath: string) => boolean,
): ItchProblem[] {
  if (game === null) return [{ kind: "no-game-pack", detail: "assets/private/out/game/manifest.json is missing or unreadable" }];
  const problems: ItchProblem[] = [];
  const have = new Set<string>();
  const haveColourways = new Set<string>();
  const files = new Set<string>();
  for (const p of game.packs) {
    for (const a of p.assets) have.add(`${p.pack}:${a.name}`);
    files.add(p.glb);
    for (const c of p.colourways ?? []) {
      haveColourways.add(c.id);
      files.add(c.image);
    }
  }
  const wanted = [...new Set([...keys, ...Object.values(FX_MESHES)])].sort();
  for (const key of wanted) if (!have.has(key)) problems.push({ kind: "missing-key", detail: key });
  for (const id of colourways) if (!haveColourways.has(id)) problems.push({ kind: "missing-colourway", detail: id });
  const fxIds = new Set((game.fx ?? []).map((f) => f.id));
  for (const id of Object.keys(FX_TEXTURES)) if (!fxIds.has(id as keyof typeof FX_TEXTURES)) problems.push({ kind: "missing-fx", detail: id });
  for (const f of game.fx ?? []) files.add(f.image);
  for (const f of [...files].sort()) if (!exists(f)) problems.push({ kind: "missing-file", detail: f });
  if (full !== null && game.game?.from !== full.generatedAt) {
    problems.push({ kind: "stale", detail: `game pack cut from ${game.game?.from ?? "(unknown)"}, full manifest generated ${full.generatedAt}` });
  }
  return problems;
}

/** A zip path is safe: relative, forward slashes, no empty or `..` part. */
function safePath(p: string): boolean {
  if (p === "" || p.startsWith("/") || p.includes("\\") || /^[A-Za-z]:/.test(p)) return false;
  return p.split("/").every((part) => part !== "" && part !== "..");
}

export interface ZipPlan {
  files: ItchFile[];
  problems: ItchProblem[];
}

/**
 * The zip's contents: the build at the root, the game pack and the calibration under their repo-relative paths. Sorted by path.
 * Anything else (a full pack, the full manifest, an unsafe path, no top-level index.html) is an `outside-plan` problem and is left out.
 */
export function zipPlan(buildFiles: readonly ItchFile[], gameFiles: readonly ItchFile[], calibration: ItchFile | null): ZipPlan {
  const files: ItchFile[] = [];
  const problems: ItchProblem[] = [];
  const refuse = (detail: string): void => void problems.push({ kind: "outside-plan", detail });
  for (const f of buildFiles) {
    if (!safePath(f.path) || f.path.startsWith("assets/private/")) refuse(f.path);
    else files.push(f);
  }
  for (const f of gameFiles) {
    if (!safePath(f.path) || !f.path.startsWith(GAME_ZIP_DIR)) refuse(f.path);
    else files.push(f);
  }
  if (calibration !== null) {
    if (calibration.path !== CALIBRATION_ZIP_PATH) refuse(calibration.path);
    else files.push(calibration);
  }
  if (!files.some((f) => f.path === "index.html")) refuse("index.html is not at the top level of the build");
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { files, problems };
}

/** A `limit` problem for each itch.io bound the package passes. */
export function checkLimits(files: readonly ItchFile[]): ItchProblem[] {
  const problems: ItchProblem[] = [];
  if (files.length > ITCH_LIMITS.maxFiles) problems.push({ kind: "limit", detail: `${files.length} files, itch.io allows ${ITCH_LIMITS.maxFiles}` });
  const total = files.reduce((n, f) => n + f.bytes, 0);
  if (total > ITCH_LIMITS.maxTotalBytes) problems.push({ kind: "limit", detail: `${total} bytes in all, itch.io allows ${ITCH_LIMITS.maxTotalBytes}` });
  for (const f of files) {
    if (f.bytes > ITCH_LIMITS.maxFileBytes) problems.push({ kind: "limit", detail: `${f.path} is ${f.bytes} bytes, itch.io allows ${ITCH_LIMITS.maxFileBytes} for one file` });
  }
  return problems;
}

/**
 * True when `out` is a folder the zip may be written to: not the repo's top level and not under it. Paths are resolved here
 * (so `..` is followed, and case is ignored on win32); the caller resolves symbolic links and junctions first.
 */
export function outsideRepo(out: string, topLevel: string, platform: string): boolean {
  const p = platform === "win32" ? win32 : posix;
  let a = p.resolve(out);
  let b = p.resolve(topLevel);
  if (platform === "win32") {
    a = a.toLowerCase();
    b = b.toLowerCase();
  }
  const rel = p.relative(b, a);
  const inside = rel === "" || (!rel.startsWith("..") && !p.isAbsolute(rel));
  return !inside;
}
