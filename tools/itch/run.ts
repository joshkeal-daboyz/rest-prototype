/**
 * `npm run build:itch` (ticket 083 C): check the game pack, build for itch.io, zip.
 *
 *   npm run build:itch [-- --out <folder>] [-- --build-only]
 *
 * Writes `<out>/rest-circuits-<version>-<sha>.zip`, `<out>` being `--out` or ITCH_OUT_DIR beside the checkout. It refuses a folder inside
 * the checkout (Josh, 26 Nov 2026: "Outside the repo"), and fails before building, naming every problem, if the game pack is not ready.
 * `--build-only` stops after the build (`<out>/build/`), for browser checks. Exit codes: 0 done; 1 refused or failed.
 * Imported by nothing; the licence note is in src/core/itch.ts.
 */

import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, realpathSync, renameSync, statSync, writeSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ITCH_OUT_DIR } from "../../src/core";
import type { AssetManifest, ItchFile, ItchProblem } from "../../src/core";
import { CALIBRATION_ZIP_PATH, GAME_ZIP_DIR, checkGamePack, checkLimits, outsideRepo, zipPlan } from "./package";
import { writeZip } from "./zip";
import type { ZipSource } from "./zip";

export interface ItchDeps {
  /** `git rev-parse --show-toplevel`. */
  topLevel: string;
  platform: string;
  /** `package.json`'s version, and `git rev-parse --short HEAD`. */
  version: string;
  sha: string;
  /** The path with symbolic links and junctions resolved on the part that exists. */
  realpathExisting: (path: string) => string;
  exists: (path: string) => boolean;
  readText: (path: string) => string;
  /** Every file under a folder, relative to it, forward slashes, with sizes; empty when the folder is absent. */
  listFiles: (dir: string) => ItchFile[];
  readFile: (path: string) => Buffer;
  mkdirp: (path: string) => void;
  rename: (from: string, to: string) => void;
  /** Write a zip of these entries to `path`; returns its size in bytes. */
  writeZipFile: (path: string, entries: readonly ZipSource[]) => number;
  /** Run a node script (typecheck, vite); resolves with its exit code. */
  runNode: (args: string[], cwd: string) => Promise<number>;
  /** `gameModelKeys()` and `gameColourways()`, injected so this file does not load the renderer. */
  keys: () => string[];
  colourways: () => string[];
  stdout: (text: string) => void;
  stderr: (text: string) => void;
}

const MB = 1024 * 1024;

function readManifest(deps: ItchDeps, path: string): AssetManifest | null {
  if (!deps.exists(path)) return null;
  try {
    const m = JSON.parse(deps.readText(path)) as AssetManifest;
    return Array.isArray(m.packs) ? m : null;
  } catch {
    return null;
  }
}

function printProblems(deps: ItchDeps, head: string, problems: readonly ItchProblem[]): void {
  deps.stderr(`build:itch: ${head} (${problems.length} problem(s)):\n${problems.map((p) => `  - ${p.kind}: ${p.detail}`).join("\n")}\n`);
}

/** Run the build. Returns the exit code. */
export async function runItch(deps: ItchDeps, argv: readonly string[]): Promise<number> {
  const top = deps.topLevel;
  const outAt = argv.indexOf("--out");
  const outArg = outAt >= 0 ? argv[outAt + 1] : undefined;
  if (outAt >= 0 && (outArg === undefined || outArg.startsWith("--"))) {
    deps.stderr("build:itch: --out needs a folder.\n");
    return 1;
  }
  const buildOnly = argv.includes("--build-only");
  const out = resolve(top, outArg ?? ITCH_OUT_DIR);

  // 0. The output folder must be outside the repo.
  if (!outsideRepo(deps.realpathExisting(out), deps.realpathExisting(top), deps.platform)) {
    deps.stderr(`build:itch: ${out} is inside the repo (${top}); pass --out a folder outside it.\n`);
    return 1;
  }

  // 1. The game pack.
  const gameDir = join(top, ...GAME_ZIP_DIR.split("/").filter((x) => x !== ""));
  const game = readManifest(deps, join(gameDir, "manifest.json"));
  const full = readManifest(deps, join(gameDir, "..", "manifest.json"));
  const problems = checkGamePack(game, full, deps.keys(), deps.colourways(), (rel) => deps.exists(join(gameDir, ...rel.split("/"))));
  if (problems.length > 0) {
    printProblems(deps, "the game pack is not ready", problems);
    deps.stderr("Run npm run assets:game, then npm run build:itch again.\n");
    return 1;
  }

  // 2. Typecheck and build.
  const started = Date.now();
  const buildDir = join(out, "build");
  deps.mkdirp(out);
  deps.stdout("build:itch: typechecking ...\n");
  if ((await deps.runNode([join("node_modules", "typescript", "bin", "tsc"), "--noEmit"], top)) !== 0) {
    deps.stderr("build:itch: the typecheck failed; nothing zipped.\n");
    return 1;
  }
  deps.stdout("build:itch: building ...\n");
  const viteArgs = [join("node_modules", "vite", "bin", "vite.js"), "build", "--mode", "itch", "--base", "./", "--outDir", buildDir, "--emptyOutDir"];
  if ((await deps.runNode(viteArgs, top)) !== 0) {
    deps.stderr("build:itch: the build failed; nothing zipped.\n");
    return 1;
  }
  if (buildOnly) {
    deps.stdout(`build:itch: built to ${buildDir} (no zip, --build-only).\n`);
    return 0;
  }

  // 3. Plan the zip.
  const calPath = join(top, ...CALIBRATION_ZIP_PATH.split("/"));
  const calibration: ItchFile | null = deps.exists(calPath) ? { path: CALIBRATION_ZIP_PATH, bytes: deps.readFile(calPath).length } : null;
  const gameFiles = deps.listFiles(gameDir).map((f) => ({ path: GAME_ZIP_DIR + f.path, bytes: f.bytes }));
  const plan = zipPlan(deps.listFiles(buildDir), gameFiles, calibration);
  const planProblems = [...plan.problems, ...checkLimits(plan.files)];
  if (planProblems.length > 0) {
    printProblems(deps, "the package is refused", planProblems);
    return 1;
  }

  // 4. Write the zip, under a temp name first.
  const name = `rest-circuits-${deps.version}-${deps.sha}.zip`;
  const target = join(out, name);
  const temp = join(out, `.${name}.tmp`);
  const entries: ZipSource[] = plan.files.map((f) => ({
    path: f.path,
    read: () => deps.readFile(f.path.startsWith("assets/private/") ? join(top, ...f.path.split("/")) : join(buildDir, ...f.path.split("/"))),
  }));
  const zipBytes = deps.writeZipFile(temp, entries);
  deps.rename(temp, target);
  const total = plan.files.reduce((n, f) => n + f.bytes, 0);
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  deps.stdout(`build:itch: wrote ${target}\n  ${plan.files.length} file(s), zip ${(zipBytes / MB).toFixed(1)} MB, extracted ${(total / MB).toFixed(1)} MB, ${seconds} s\n`);
  return 0;
}

function listFilesReal(dir: string): ItchFile[] {
  const out: ItchFile[] = [];
  const walk = (rel: string): void => {
    const abs = rel === "" ? dir : join(dir, ...rel.split("/"));
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const r = rel === "" ? e.name : `${rel}/${e.name}`;
      if (e.isDirectory()) walk(r);
      else if (e.isFile() && !e.name.startsWith(".")) out.push({ path: r, bytes: statSync(join(abs, e.name)).size });
    }
  };
  if (existsSync(dir)) walk("");
  return out;
}

function realDeps(top: string, keys: () => string[], colourways: () => string[]): ItchDeps {
  const git = (...a: string[]): string => {
    const r = spawnSync("git", a, { cwd: top, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : "unknown";
  };
  return {
    topLevel: top,
    platform: process.platform,
    version: (JSON.parse(readFileSync(join(top, "package.json"), "utf8")) as { version: string }).version,
    sha: git("rev-parse", "--short", "HEAD"),
    realpathExisting: (p) => {
      let rest = "";
      let cur = resolve(p);
      for (;;) {
        try {
          return rest === "" ? realpathSync.native(cur) : join(realpathSync.native(cur), rest);
        } catch {
          const up = dirname(cur);
          if (up === cur) return resolve(p);
          rest = rest === "" ? basename(cur) : join(basename(cur), rest);
          cur = up;
        }
      }
    },
    exists: (p) => existsSync(p),
    readText: (p) => readFileSync(p, "utf8"),
    listFiles: listFilesReal,
    readFile: (p) => readFileSync(p),
    mkdirp: (p) => void mkdirSync(p, { recursive: true }),
    rename: (a, b) => renameSync(a, b),
    writeZipFile: (path, entries) => {
      const fd = openSync(path, "w");
      try {
        return writeZip(entries, (chunk) => void writeSync(fd, chunk));
      } finally {
        closeSync(fd);
      }
    },
    runNode: (args, cwd) =>
      new Promise((res) => {
        const child = spawn(process.execPath, args, { cwd, stdio: "inherit" });
        child.on("error", () => res(1));
        child.on("close", (code) => res(code ?? 1));
      }),
    keys,
    colourways,
    stdout: (t) => void process.stdout.write(t),
    stderr: (t) => void process.stderr.write(t),
  };
}

const here = fileURLToPath(import.meta.url);
const invoked = process.argv[1] !== undefined ? resolve(process.argv[1]) : "";
const same = process.platform === "win32" ? invoked.toLowerCase() === here.toLowerCase() : invoked === here;
if (same) {
  const top = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: dirname(here), encoding: "utf8" }).stdout.trim() || resolve(dirname(here), "..", "..");
  import("../../src/render3d/gamemodels")
    .then(({ gameModelKeys, gameColourways }) => runItch(realDeps(resolve(top), () => gameModelKeys(), () => gameColourways()), process.argv.slice(2)))
    .then(
      (code) => process.exit(code),
      (e: unknown) => {
        process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
        process.exit(1);
      },
    );
}
