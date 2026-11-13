/**
 * `npm run assets:convert [pack...]` and `npm run assets:selftest` (ticket 038).
 *
 * Turns purchased FBX packs in assets/private/in/<pack>/ into one GLB per pack in assets/private/out/,
 * plus out/manifest.json, by running tools/blender/convert_fbx.py in headless Blender.
 *
 * Exit codes: 0 every pack converted; 1 a pack failed (or bad arguments); 2 Blender missing or too old.
 *
 * Everything outside the logic (file system, process spawning, the clock, the output streams) is injected
 * through ConvertDeps, so the tests never launch a process. `realDeps()` wires the real ones.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AssetPack } from "../../src/core";
import { BLENDER_MISSING_TEXT, BlenderPathError, MIN_BLENDER, findBlender, formatVersion, parseBlenderVersion, versionAtLeast } from "./blender";
import { buildManifest, compareNames, parsePackReport, readPriorPacks } from "./manifest";
import type { PackInput, PackReport } from "./manifest";

export interface RunResult {
  /** The exit code; null when the process was killed by a signal. */
  code: number | null;
  stdout: string;
  stderr: string;
}

export interface ConvertDeps {
  env: Readonly<Record<string, string | undefined>>;
  platform: string;
  /** Absolute repository root. */
  root: string;
  exists: (path: string) => boolean;
  /** Names (not paths) inside a folder; empty when it doesn't exist. */
  listDir: (path: string) => readonly string[];
  isDirectory: (path: string) => boolean;
  readText: (path: string) => string;
  writeText: (path: string, text: string) => void;
  /** Create a folder and its parents. */
  mkdirp: (path: string) => void;
  /** Remove a file or folder tree; no error when it's already gone. */
  remove: (path: string) => void;
  /** Run a program with an argument array (no shell). Rejects when it can't be started. */
  run: (command: string, args: readonly string[]) => Promise<RunResult>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  now: () => Date;
}

export const USAGE = `Usage: npm run assets:convert [pack...]
       npm run assets:selftest

Lay a pack out like this (nothing under assets/private/ is ever committed):
  assets/private/in/<pack>/**/*.fbx     the pack's FBX files
  assets/private/in/<pack>/Textures/..  its atlas image
  assets/private/in/<pack>/pack.json    optional: { "atlas": "Textures/Atlas.png", "scale": 1 }
With no pack names, every folder in assets/private/in/ is converted.
`;

/** The folder layout, all under assets/private/. */
export function layout(root: string) {
  const privateRoot = resolve(root, "assets", "private");
  const out = join(privateRoot, "out");
  return {
    privateRoot,
    inRoot: join(privateRoot, "in"),
    out,
    reports: join(out, "reports"),
    manifest: join(out, "manifest.json"),
    selftest: join(privateRoot, "selftest"),
    script: resolve(root, "tools", "blender", "convert_fbx.py"),
  };
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

export interface BlenderArgsInput {
  script: string;
  packDir: string;
  outGlb: string;
  report: string;
  atlas?: string;
  scale?: number;
  selftest?: boolean;
}

/** The exact argument array for one Blender run. Paths are single array items, so spaces need no quoting. */
export function buildBlenderArgs(a: BlenderArgsInput): string[] {
  const args = ["--background", "--factory-startup", "--python", a.script, "--"];
  if (a.selftest) args.push("--selftest");
  args.push("--in", a.packDir, "--out", a.outGlb, "--report", a.report);
  if (a.atlas !== undefined) args.push("--atlas", a.atlas);
  if (a.scale !== undefined) args.push("--scale", String(a.scale));
  return args;
}

interface PackSettings {
  /** Absolute atlas path, and the same relative to the pack folder with forward slashes. */
  atlas?: { abs: string; rel: string };
  scale?: number;
}

/** Read the optional pack.json. Throws an Error with a plain message when it is unusable. */
function readPackSettings(deps: ConvertDeps, packDir: string): PackSettings {
  const file = join(packDir, "pack.json");
  if (!deps.exists(file)) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(deps.readText(file));
  } catch (e) {
    throw new Error(`pack.json is not valid JSON (${(e as Error).message})`);
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("pack.json must be a JSON object");
  const obj = raw as Record<string, unknown>;
  const settings: PackSettings = {};
  if (obj["atlas"] !== undefined) {
    if (typeof obj["atlas"] !== "string" || obj["atlas"] === "") throw new Error('pack.json "atlas" must be a path string');
    const abs = resolve(packDir, obj["atlas"]);
    if (!isInside(packDir, abs)) throw new Error(`pack.json "atlas" (${obj["atlas"]}) points outside the pack folder`);
    if (!deps.exists(abs)) throw new Error(`pack.json "atlas" file not found: ${abs}`);
    settings.atlas = { abs, rel: relative(packDir, abs).split("\\").join("/") };
  }
  if (obj["scale"] !== undefined) {
    const s = obj["scale"];
    if (typeof s !== "number" || !Number.isFinite(s) || s <= 0) throw new Error('pack.json "scale" must be a positive number');
    settings.scale = s;
  }
  return settings;
}

function tail(text: string, lines = 12): string {
  const all = text.trim().split(/\r?\n/);
  return all.slice(-lines).join("\n");
}

interface BlenderInfo {
  path: string;
  versionText: string;
}

/** Find Blender and check its version. Returns the exit code to stop with (2) or the Blender to use. */
async function resolveBlender(deps: ConvertDeps): Promise<BlenderInfo | 2> {
  let found: string | null;
  try {
    found = findBlender({ env: deps.env, platform: deps.platform, exists: deps.exists, listDir: deps.listDir });
  } catch (e) {
    if (e instanceof BlenderPathError) {
      deps.stderr(`${e.message}\n`);
      return 2;
    }
    throw e;
  }
  if (found === null) {
    deps.stderr(BLENDER_MISSING_TEXT);
    return 2;
  }
  let result: RunResult;
  try {
    result = await deps.run(found, ["--version"]);
  } catch (e) {
    deps.stderr(`Could not run Blender at ${found}: ${(e as Error).message}\n`);
    return 2;
  }
  const version = parseBlenderVersion(result.stdout);
  if (result.code !== 0 || version === null) {
    deps.stderr(`"${found} --version" did not give a Blender version. Is that file Blender?\n`);
    return 2;
  }
  if (!versionAtLeast(version)) {
    deps.stderr(`Blender ${formatVersion(version)} found at ${found}, but the asset pipeline needs ${formatVersion(MIN_BLENDER)} or newer.\n`);
    return 2;
  }
  return { path: found, versionText: formatVersion(version) };
}

/** Does this pack name stay inside assets/private/in/ as a single folder name? */
function packNameIsSafe(inRoot: string, name: string): boolean {
  if (name === "" || name === "." || name === ".." || /[\\/]/.test(name)) return false;
  const dir = resolve(inRoot, name);
  return isInside(inRoot, dir) && dirname(dir) === inRoot;
}

interface PackOutcome {
  input?: PackInput;
  error?: string;
}

async function convertPack(deps: ConvertDeps, blender: BlenderInfo, pack: string): Promise<PackOutcome> {
  const L = layout(deps.root);
  const packDir = join(L.inRoot, pack);
  const outGlb = join(L.out, `${pack}.glb`);
  const report = join(L.reports, `${pack}.json`);
  for (const p of [outGlb, report]) {
    if (!isInside(L.privateRoot, p)) return { error: `refusing to write outside assets/private/: ${p}` };
  }

  let settings: PackSettings;
  try {
    settings = readPackSettings(deps, packDir);
  } catch (e) {
    return { error: (e as Error).message };
  }

  deps.mkdirp(L.reports);
  deps.remove(report); // a stale report from an earlier run must never be mistaken for this one's
  const args = buildBlenderArgs({
    script: L.script,
    packDir,
    outGlb,
    report,
    ...(settings.atlas ? { atlas: settings.atlas.abs } : {}),
    ...(settings.scale !== undefined ? { scale: settings.scale } : {}),
  });
  deps.stdout(`Converting ${pack} ...\n`);
  let result: RunResult;
  try {
    result = await deps.run(blender.path, args);
  } catch (e) {
    return { error: `could not start Blender: ${(e as Error).message}` };
  }
  if (result.code !== 0) {
    return { error: `Blender exited with code ${result.code ?? "(killed)"}\n${tail(result.stderr || result.stdout)}` };
  }
  if (!deps.exists(report)) {
    return { error: `Blender finished but wrote no report; its output ended:\n${tail(result.stderr || result.stdout)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(deps.readText(report));
    parsePackReport(pack, parsed);
  } catch (e) {
    return { error: `bad report: ${(e as Error).message}` };
  }
  return { input: { pack, glbPath: outGlb, atlas: settings.atlas?.rel ?? null, report: parsed } };
}

function summary(pack: string, report: PackReport): string {
  const warned = report.assets.filter((a) => a.warnings.length > 0);
  let line = `  ${pack}: ${report.assets.length} model(s)`;
  if (report.failures.length > 0) line += `, ${report.failures.length} FBX file(s) failed`;
  if (warned.length > 0) line += `, ${warned.length} with warnings`;
  const lines = [line];
  for (const f of report.failures) lines.push(`    failed: ${f.source}: ${f.error}`);
  for (const a of warned) lines.push(`    ${a.name}: ${a.warnings.join(", ")}`);
  return lines.join("\n") + "\n";
}

async function runPacks(deps: ConvertDeps, blender: BlenderInfo, names: readonly string[]): Promise<number> {
  const L = layout(deps.root);
  const available = deps.listDir(L.inRoot).filter((n) => deps.isDirectory(join(L.inRoot, n))).sort(compareNames);

  if (available.length === 0 && names.length === 0) {
    deps.stdout(`No packs found in ${L.inRoot}\n\n${USAGE}`);
    return 0;
  }
  for (const n of names) {
    if (!packNameIsSafe(L.inRoot, n)) {
      deps.stderr(`Refusing pack name "${n}": a pack is a single folder name inside assets/private/in/.\n`);
      return 1;
    }
    if (!available.includes(n)) {
      deps.stderr(`Unknown pack "${n}". Packs in ${L.inRoot}: ${available.length > 0 ? available.join(", ") : "(none)"}\n`);
      return 1;
    }
  }
  const selected = names.length > 0 ? [...new Set(names)].sort(compareNames) : available;

  const inputs: PackInput[] = [];
  let failed = 0;
  for (const pack of selected) {
    const outcome = await convertPack(deps, blender, pack);
    if (outcome.input) inputs.push(outcome.input);
    else {
      failed++;
      deps.stderr(`Pack "${pack}" failed: ${outcome.error}\n`);
    }
  }

  if (inputs.length > 0) {
    // A run that names only some packs keeps the other packs' entries from the existing manifest.
    let keep: AssetPack[] = [];
    if (names.length > 0 && deps.exists(L.manifest)) {
      keep = readPriorPacks(deps.readText(L.manifest)).filter((p) => !selected.includes(p.pack) && available.includes(p.pack));
    }
    const manifest = buildManifest(inputs, {
      manifestDir: L.out,
      generatedAt: deps.now().toISOString(),
      blenderVersion: blender.versionText,
      keep,
    });
    deps.writeText(L.manifest, JSON.stringify(manifest, null, 2) + "\n");
    deps.stdout(`Wrote ${L.manifest}\n`);
    for (const input of inputs) deps.stdout(summary(input.pack, parsePackReport(input.pack, input.report)));
  }
  return failed > 0 ? 1 : 0;
}

/** Names the self-test's two boxes carry; convert_fbx.py --selftest builds them. */
export const SELFTEST_POLE = "SelfTest_Pole";
export const SELFTEST_NO_UV = "SelfTest_NoUV";

/** Check a self-test report; the list of what is wrong (empty means `selftest ok`). */
export function checkSelftest(report: PackReport): string[] {
  const problems: string[] = [];
  const near = (got: number, want: number, tol: number, what: string) => {
    if (Math.abs(got - want) > tol) problems.push(`${what} is ${got}, expected ${want} (within ${tol})`);
  };
  if (report.failures.length > 0) problems.push(`failures: ${report.failures.map((f) => `${f.source} (${f.error})`).join("; ")}`);
  const pole = report.assets.find((a) => a.name === SELFTEST_POLE);
  if (!pole) problems.push(`${SELFTEST_POLE} is missing from the report`);
  else {
    const { min, max } = pole.bounds;
    near(max[0] - min[0], 0.4, 0.001, "pole width (x)");
    near(max[1] - min[1], 3.0, 0.001, "pole height (y)");
    near(max[2] - min[2], 0.4, 0.001, "pole depth (z)");
    near(min[1], 0, 1e-4, "pole base (min y)");
    near((min[0] + max[0]) / 2, 0, 1e-4, "pole x centre");
    near((min[2] + max[2]) / 2, 0, 1e-4, "pole z centre");
    for (const w of pole.warnings) if (w !== "no-atlas") problems.push(`pole carries an unexpected warning: ${w}`);
  }
  const noUv = report.assets.find((a) => a.name === SELFTEST_NO_UV);
  if (!noUv) problems.push(`${SELFTEST_NO_UV} is missing from the report`);
  else if (!noUv.warnings.includes("no-uv")) problems.push(`${SELFTEST_NO_UV} should carry the no-uv warning`);
  return problems;
}

async function runSelftest(deps: ConvertDeps, blender: BlenderInfo): Promise<number> {
  const L = layout(deps.root);
  const outGlb = join(L.selftest, "selftest.glb");
  const report = join(L.selftest, "selftest.json");
  const packDir = join(L.selftest, "pack");
  for (const p of [L.selftest, outGlb, report, packDir]) {
    if (!isInside(L.privateRoot, p)) {
      deps.stderr(`refusing to write outside assets/private/: ${p}\n`);
      return 1;
    }
  }
  deps.remove(L.selftest);
  deps.mkdirp(L.selftest);
  deps.stdout("Running the self-test (two generated boxes through the normal conversion) ...\n");
  let result: RunResult;
  try {
    result = await deps.run(blender.path, buildBlenderArgs({ script: L.script, packDir, outGlb, report, selftest: true }));
  } catch (e) {
    deps.stderr(`selftest failed: could not start Blender: ${(e as Error).message}\n`);
    return 1;
  }
  if (result.code !== 0 || !deps.exists(report)) {
    deps.stderr(`selftest failed: Blender exited with code ${result.code ?? "(killed)"}${deps.exists(report) ? "" : " and wrote no report"}\n${tail(result.stderr || result.stdout)}\n`);
    return 1;
  }
  let parsed: PackReport;
  try {
    parsed = parsePackReport("selftest", JSON.parse(deps.readText(report)));
  } catch (e) {
    deps.stderr(`selftest failed: bad report: ${(e as Error).message}\n`);
    return 1;
  }
  const problems = checkSelftest(parsed);
  if (problems.length > 0) {
    deps.stderr(`selftest failed:\n${problems.map((p) => `  - ${p}`).join("\n")}\n`);
    return 1;
  }
  deps.stdout("selftest ok\n");
  return 0;
}

/** The CLI. `argv` is the arguments after the script name. Returns the exit code. */
export async function convert(argv: readonly string[], deps: ConvertDeps): Promise<number> {
  let selftest = false;
  const names: string[] = [];
  for (const arg of argv) {
    if (arg === "--selftest") selftest = true;
    else if (arg === "--help" || arg === "-h") {
      deps.stdout(USAGE);
      return 0;
    } else if (arg.startsWith("-")) {
      deps.stderr(`Unknown option ${arg}\n\n${USAGE}`);
      return 1;
    } else names.push(arg);
  }
  if (selftest && names.length > 0) {
    deps.stderr(`--selftest takes no pack names\n`);
    return 1;
  }

  const blender = await resolveBlender(deps);
  if (blender === 2) return 2;
  return selftest ? runSelftest(deps, blender) : runPacks(deps, blender, names);
}

/** The real file system, process spawner and clock. */
export function realDeps(root: string): ConvertDeps {
  return {
    env: process.env,
    platform: process.platform,
    root,
    exists: (p) => existsSync(p),
    listDir: (p) => {
      try {
        return readdirSync(p);
      } catch {
        return [];
      }
    },
    isDirectory: (p) => {
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    },
    readText: (p) => readFileSync(p, "utf8"),
    writeText: (p, text) => writeFileSync(p, text),
    mkdirp: (p) => void mkdirSync(p, { recursive: true }),
    remove: (p) => rmSync(p, { recursive: true, force: true }),
    run: (command, args) =>
      new Promise<RunResult>((resolveRun, reject) => {
        const child = spawn(command, [...args], { shell: false, windowsHide: true });
        let stdout = "";
        let stderr = "";
        const keep = (old: string, chunk: Buffer) => (old + chunk.toString("utf8")).slice(-16000);
        child.stdout.on("data", (c: Buffer) => (stdout = keep(stdout, c)));
        child.stderr.on("data", (c: Buffer) => (stderr = keep(stderr, c)));
        child.on("error", reject);
        child.on("close", (code) => resolveRun({ code, stdout, stderr }));
      }),
    stdout: (t) => void process.stdout.write(t),
    stderr: (t) => void process.stderr.write(t),
    now: () => new Date(),
  };
}

const here = fileURLToPath(import.meta.url);
const invoked = process.argv[1] !== undefined ? resolve(process.argv[1]) : "";
const same = process.platform === "win32" ? invoked.toLowerCase() === here.toLowerCase() : invoked === here;
if (same) {
  convert(process.argv.slice(2), realDeps(resolve(dirname(here), "..", ".."))).then(
    (code) => process.exit(code),
    (e: unknown) => {
      process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
      process.exit(1);
    },
  );
}
