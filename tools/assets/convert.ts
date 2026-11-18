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
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AssetColourway, AssetPack, AssetWarning } from "../../src/core";
import { BLENDER_MISSING_TEXT, BlenderPathError, MIN_BLENDER, findBlender, formatVersion, parseBlenderVersion, versionAtLeast } from "./blender";
import { COLOURWAY_SOURCES, colourwayEntry, planColourways, pngSize } from "./colourways";
import type { ColourwayPlans } from "./colourways";
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
  /** A file's bytes (a colourway PNG); throws when it can't be read. */
  readBytes: (path: string) => Uint8Array;
  /** Copy a file verbatim, replacing the target; the target's folder exists. */
  copyFile: (from: string, to: string) => void;
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
       npm run assets:convert -- --colourways [pack...]
       npm run assets:selftest

--colourways copies a pack's colourway atlases (alternate colourings of its shared atlas; the file names are the table in
tools/assets/colourways.ts) to assets/private/out/<pack>/colourways/ and lists them in that pack's manifest entry. It runs
no Blender and rewrites no GLB. A full convert of a pack that has such a table runs the same step after its GLB.

Lay a pack out like this (nothing under assets/private/ is ever committed):
  assets/private/in/<pack>/**/*.fbx     the pack's FBX files
  assets/private/in/<pack>/Textures/..  its atlas image
  assets/private/in/<pack>/pack.json    optional (all keys optional):
      { "atlas": "Textures/Atlas.png",            one shared atlas for every model (atlas mode)
        "scale": 1,                                multiplied on import (use 100 or 0.01 for a unit slip)
        "textures": "Src/Textures",                folder searched for each model's image (default: the pack)
        "textureOverrides": { "town_hall_mesh": "Src/Textures/Town_Hall_b.png" },   pins a model's image
        "textureAliases": { "MasterTexture02.psd": "Src/Textures/Atlas.png",     a missing source file name (any extension, any case)
                            "material:Lambert1": "Src/Textures/Road.png" },      or a material name, mapped to an image
        "scaleOverrides": { "Building_PetrolStation": 0.01 } }   one model's factor, multiplied on the pack's "scale"
With no "atlas", each model's own image is found in the pack (per-model mode).
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
  /** Absolute folder searched for each model's image. */
  textures?: string;
  /** Pinned images, `stem` and an absolute image path. Passed in the order given (readPackSettings sorts them). */
  overrides?: readonly { stem: string; abs: string }[];
  /** Texture aliases, a normalised key (see normaliseAliasKey) and an absolute image path. Passed in the order given. */
  aliases?: readonly { key: string; abs: string }[];
  /** Per-model scale factors, a model stem and a factor above 0. Passed in the order given, after the aliases (readPackSettings sorts them). */
  scaleOverrides?: readonly { stem: string; factor: number }[];
  selftest?: boolean;
}

/** The exact argument array for one Blender run. Paths are single array items, so spaces need no quoting. */
export function buildBlenderArgs(a: BlenderArgsInput): string[] {
  const args = ["--background", "--factory-startup", "--python", a.script, "--"];
  if (a.selftest) args.push("--selftest");
  args.push("--in", a.packDir, "--out", a.outGlb, "--report", a.report);
  if (a.atlas !== undefined) args.push("--atlas", a.atlas);
  if (a.scale !== undefined) args.push("--scale", String(a.scale));
  if (a.textures !== undefined) args.push("--textures", a.textures);
  for (const o of a.overrides ?? []) args.push("--texture-override", `${o.stem}=${o.abs}`);
  for (const t of a.aliases ?? []) args.push("--texture-alias", `${t.key}=${t.abs}`);
  for (const o of a.scaleOverrides ?? []) args.push("--scale-override", `${o.stem}=${o.factor}`);
  return args;
}

/** The image extensions the script indexes (and a texture alias must point at). */
export const IMAGE_EXTENSIONS: readonly string[] = [".png", ".jpg", ".jpeg", ".tga", ".tif", ".tiff", ".bmp"];

const MATERIAL_KEY = "material:";

/**
 * The normalised form of a `textureAliases` key, which is also what is passed to the script.
 * A file key is reduced to its lowercased stem (everything before the last `.`, or the whole name when there is none),
 * so `MasterTexture02.psd`, `mastertexture02.PNG` and `MasterTexture02` are one key. A `material:<name>` key becomes
 * `material:<lowercased name>`. Returns null when the key is not usable (see the checks in readPackSettings).
 */
export function normaliseAliasKey(key: string): string | null {
  if (key.toLowerCase().startsWith(MATERIAL_KEY)) {
    const name = key.slice(MATERIAL_KEY.length);
    return name === "" || name.includes("=") ? null : MATERIAL_KEY + name.toLowerCase();
  }
  if (key === "" || /[/\\=]/.test(key)) return null;
  const dot = key.lastIndexOf(".");
  const stem = dot < 0 ? key : key.slice(0, dot);
  return stem === "" ? null : stem.toLowerCase();
}

/** Does this path end in one of the indexed image extensions (case-insensitive)? */
export function hasImageExtension(path: string): boolean {
  const low = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((e) => low.endsWith(e));
}

interface PackSettings {
  /** Absolute atlas path, and the same relative to the pack folder with forward slashes. */
  atlas?: { abs: string; rel: string };
  scale?: number;
  /** Absolute folder searched for each model's image. */
  textures?: string;
  /** Sorted by model stem. */
  overrides: { stem: string; abs: string }[];
  /** Sorted by normalised key. */
  aliases: { key: string; abs: string }[];
  /** Sorted by model stem. */
  scaleOverrides: { stem: string; factor: number }[];
}

/** The stems of every .fbx in a folder tree (the way the script lists them: any depth, the extension in any case, the stem up to the last dot). */
function listFbxStems(deps: ConvertDeps, dir: string, into: Set<string> = new Set()): Set<string> {
  for (const name of deps.listDir(dir)) {
    const path = join(dir, name);
    if (deps.isDirectory(path)) listFbxStems(deps, path, into);
    else if (name.toLowerCase().endsWith(".fbx")) into.add(name.slice(0, name.lastIndexOf(".")));
  }
  return into;
}

/** Read the optional pack.json. Throws an Error with a plain message when it is unusable. */
function readPackSettings(deps: ConvertDeps, packDir: string): PackSettings {
  const file = join(packDir, "pack.json");
  if (!deps.exists(file)) return { overrides: [], aliases: [], scaleOverrides: [] };
  let raw: unknown;
  try {
    raw = JSON.parse(deps.readText(file));
  } catch (e) {
    throw new Error(`pack.json is not valid JSON (${(e as Error).message})`);
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("pack.json must be a JSON object");
  const obj = raw as Record<string, unknown>;
  const settings: PackSettings = { overrides: [], aliases: [], scaleOverrides: [] };
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
  if (obj["textures"] !== undefined) {
    if (typeof obj["textures"] !== "string" || obj["textures"] === "") throw new Error('pack.json "textures" must be a folder path string');
    const abs = resolve(packDir, obj["textures"]);
    if (abs !== packDir && !isInside(packDir, abs)) throw new Error(`pack.json "textures" (${obj["textures"]}) points outside the pack folder`);
    if (!deps.isDirectory(abs)) throw new Error(`pack.json "textures" folder not found: ${abs}`);
    settings.textures = abs;
  }
  const overrides = obj["textureOverrides"];
  if (overrides !== undefined) {
    if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
      throw new Error('pack.json "textureOverrides" must be an object of { "<model stem>": "<image path>" }');
    }
    for (const stem of Object.keys(overrides).sort(compareNames)) {
      const value = (overrides as Record<string, unknown>)[stem];
      if (stem === "" || typeof value !== "string" || value === "") {
        throw new Error(`pack.json "textureOverrides" entry "${stem}" must map a model stem to an image path string`);
      }
      const abs = resolve(packDir, value);
      if (!isInside(packDir, abs)) throw new Error(`pack.json "textureOverrides" model "${stem}": ${value} points outside the pack folder`);
      if (!deps.exists(abs)) throw new Error(`pack.json "textureOverrides" model "${stem}": image not found: ${abs}`);
      settings.overrides.push({ stem, abs });
    }
  }
  const aliases = obj["textureAliases"];
  if (aliases !== undefined) {
    if (typeof aliases !== "object" || aliases === null || Array.isArray(aliases)) {
      throw new Error('pack.json "textureAliases" must be an object of { "<file name or material:name>": "<image path>" }');
    }
    const seen = new Map<string, string>(); // normalised key -> the key as written
    const entries: { key: string; abs: string }[] = [];
    for (const written of Object.keys(aliases)) {
      const value = (aliases as Record<string, unknown>)[written];
      const where = `pack.json "textureAliases" key "${written}"`;
      const key = normaliseAliasKey(written);
      if (key === null) {
        throw new Error(
          written.toLowerCase().startsWith(MATERIAL_KEY) && written.length > MATERIAL_KEY.length
            ? `${where}: a material name cannot contain "="`
            : written.toLowerCase().startsWith(MATERIAL_KEY)
              ? `${where}: a "material:" key needs a material name`
              : `${where}: a file-name key must be a name with no "/", "\\" or "=", not empty`,
        );
      }
      if (typeof value !== "string" || value === "") throw new Error(`${where} must map to an image path string`);
      const clash = seen.get(key);
      if (clash !== undefined) throw new Error(`pack.json "textureAliases" keys "${clash}" and "${written}" are the same key (${key})`);
      seen.set(key, written);
      const abs = resolve(packDir, value);
      if (!isInside(packDir, abs)) throw new Error(`${where}: ${value} points outside the pack folder`);
      if (!hasImageExtension(abs)) throw new Error(`${where}: ${value} is not an image (${IMAGE_EXTENSIONS.join(" ")})`);
      if (!deps.exists(abs)) throw new Error(`${where}: image not found: ${abs}`);
      entries.push({ key, abs });
    }
    settings.aliases = entries.sort((a, b) => compareNames(a.key, b.key));
  }
  const factors = obj["scaleOverrides"];
  if (factors !== undefined) {
    if (typeof factors !== "object" || factors === null || Array.isArray(factors)) {
      throw new Error('pack.json "scaleOverrides" must be an object of { "<model stem>": <factor above 0> }');
    }
    const stems = listFbxStems(deps, packDir);
    for (const stem of Object.keys(factors).sort(compareNames)) {
      const value = (factors as Record<string, unknown>)[stem];
      const where = `pack.json "scaleOverrides" key "${stem}"`;
      if (stem === "" || /[/\\=]/.test(stem)) throw new Error(`${where}: a model stem is not empty and has no "/", "\\" or "="`);
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`${where} must be a finite number above 0`);
      if (!stems.has(stem)) throw new Error(`${where}: there is no ${stem}.fbx in the pack`);
      settings.scaleOverrides.push({ stem, factor: value });
    }
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
    ...(settings.textures !== undefined ? { textures: settings.textures } : {}),
    overrides: settings.overrides,
    aliases: settings.aliases,
    scaleOverrides: settings.scaleOverrides,
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
  // The script says which texture aliases matched no material (a typo in pack.json); show those lines.
  for (const line of result.stdout.split(/\r?\n/)) {
    if (/^texture alias .+ matched no material$/.test(line)) deps.stdout(`  ${pack}: ${line}\n`);
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
  for (const a of warned) {
    const missing = a.missingTextures.length > 0 ? ` (looked for: ${a.missingTextures.join(", ")})` : "";
    lines.push(`    ${a.name}: ${a.warnings.join(", ")}${missing}`);
  }
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
    // A pack with a colourway table gets its colourway step after its GLB (a problem there is a warning, never a failed conversion).
    const withTable = inputs.map((i) => i.pack).filter((p) => planColourways(p, COLOURWAY_SOURCES) !== null);
    if (withTable.length > 0) applyColourways(deps, withTable, false);
  }
  return failed > 0 ? 1 : 0;
}

interface ColourwayResult {
  entries: AssetColourway[];
  warnings: string[];
  /** Set when nothing can be exported for the pack (its base atlas is unusable). */
  fatal?: string;
}

/** Copy one pack's colourway PNGs under out/<pack>/colourways/ and return the manifest entries for the ones that passed. */
function exportColourways(deps: ConvertDeps, pack: string, plans: ColourwayPlans): ColourwayResult {
  const L = layout(deps.root);
  const packDir = join(L.inRoot, pack);
  const at = (rel: string) => join(packDir, ...rel.split("/"));
  const result: ColourwayResult = { entries: [], warnings: [] };

  const baseAbs = at(plans.baseFile);
  let baseSize: { width: number; height: number } | null = null;
  if (deps.exists(baseAbs)) {
    try {
      baseSize = pngSize(deps.readBytes(baseAbs));
    } catch {
      baseSize = null;
    }
  }
  if (baseSize === null) {
    result.fatal = `${pack}: the base atlas ${plans.baseFile} is missing or not a PNG, so no colourway can be checked against it (looked in ${baseAbs})`;
    return result;
  }

  for (const plan of plans.entries) {
    const src = at(plan.file);
    if (!deps.exists(src)) {
      result.warnings.push(`${pack}: colourway ${plan.file} not found, left out`);
      continue;
    }
    let size: { width: number; height: number } | null;
    try {
      size = pngSize(deps.readBytes(src));
    } catch (e) {
      result.warnings.push(`${pack}: colourway ${plan.file} could not be read (${(e as Error).message}), left out`);
      continue;
    }
    if (size === null) {
      result.warnings.push(`${pack}: colourway ${plan.file} is not a PNG, left out`);
      continue;
    }
    if (size.width !== baseSize.width || size.height !== baseSize.height) {
      result.warnings.push(
        `${pack}: colourway ${plan.file} is ${size.width} x ${size.height} but the base atlas is ${baseSize.width} x ${baseSize.height}, left out`,
      );
      continue;
    }
    const dest = join(L.out, ...plan.out.split("/"));
    if (!isInside(L.privateRoot, dest)) {
      result.warnings.push(`${pack}: refusing to write outside assets/private/: ${dest}`);
      continue;
    }
    deps.mkdirp(dirname(dest));
    deps.copyFile(src, dest);
    result.entries.push(colourwayEntry(plan, plans.base, size));
  }
  return result;
}

/**
 * The colourway step for these packs (each has a table entry): copy the files, then rewrite only each pack's `colourways`
 * field in manifest.json (the file is read as JSON and written back whole, so every other field is as it was).
 * Returns the exit code: 1 for a missing or unreadable manifest, a pack not in it, or (when `strict`) an unusable base atlas.
 * A missing file, a non-PNG or a size mismatch is one warning line and that file is left out.
 */
function applyColourways(deps: ConvertDeps, packs: readonly string[], strict: boolean): number {
  const L = layout(deps.root);
  if (!deps.exists(L.manifest)) {
    deps.stderr(`No manifest at ${L.manifest}. Convert a pack first (npm run assets:convert), then export its colourways.\n`);
    return 1;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(deps.readText(L.manifest));
  } catch (e) {
    deps.stderr(`${L.manifest} is not valid JSON (${(e as Error).message}); nothing written.\n`);
    return 1;
  }
  const list = typeof raw === "object" && raw !== null ? (raw as { packs?: unknown }).packs : undefined;
  if (!Array.isArray(list)) {
    deps.stderr(`${L.manifest} has no "packs" list; nothing written.\n`);
    return 1;
  }
  let failed = 0;
  let changed = false;
  for (const pack of packs) {
    const plans = planColourways(pack, COLOURWAY_SOURCES);
    if (plans === null) continue;
    const entry = (list as unknown[]).find((p) => typeof p === "object" && p !== null && (p as { pack?: unknown }).pack === pack) as Record<string, unknown> | undefined;
    if (entry === undefined) {
      deps.stderr(`Pack "${pack}" is not in the manifest; convert it first. Its colourways were not exported.\n`);
      failed = 1;
      continue;
    }
    const result = exportColourways(deps, pack, plans);
    for (const w of result.warnings) deps.stderr(`warning: ${w}\n`);
    if (result.fatal !== undefined) {
      deps.stderr(`${strict ? "error" : "warning"}: ${result.fatal}\n`);
      if (strict) failed = 1;
      continue;
    }
    if (result.entries.length === 0) {
      deps.stdout(`  ${pack}: no colourway could be exported; its manifest entry is unchanged\n`);
      continue;
    }
    entry["colourways"] = result.entries;
    changed = true;
    deps.stdout(`  ${pack}: ${result.entries.length} of ${plans.entries.length} colourway(s) exported to ${join(L.out, pack, "colourways")}\n`);
  }
  if (changed) {
    deps.writeText(L.manifest, JSON.stringify(raw, null, 2) + "\n");
    deps.stdout(`Wrote ${L.manifest}\n`);
  }
  return failed;
}

/** `--colourways [pack...]`: only the colourway step. No Blender, no GLB. */
function runColourways(deps: ConvertDeps, names: readonly string[]): number {
  const L = layout(deps.root);
  for (const n of names) {
    if (!packNameIsSafe(L.inRoot, n)) {
      deps.stderr(`Refusing pack name "${n}": a pack is a single folder name inside assets/private/in/.\n`);
      return 1;
    }
    if (planColourways(n, COLOURWAY_SOURCES) === null) {
      deps.stderr(`No colourway table for pack "${n}". Packs with one: ${Object.keys(COLOURWAY_SOURCES).join(", ")}\n`);
      return 1;
    }
  }
  const selected = names.length > 0 ? [...new Set(names)].sort(compareNames) : Object.keys(COLOURWAY_SOURCES).filter((p) => deps.isDirectory(join(L.inRoot, p))).sort(compareNames);
  if (selected.length === 0) {
    deps.stdout(`No pack with a colourway table found in ${L.inRoot}\n`);
    return 0;
  }
  return applyColourways(deps, selected, true);
}

/** Names the self-test's boxes carry; convert_fbx.py --selftest builds them. */
export const SELFTEST_POLE = "SelfTest_Pole";
export const SELFTEST_NO_UV = "SelfTest_NoUV";
export const SELFTEST_REF_CASE = "ref_case";
export const SELFTEST_MAT_NAME = "mat_name";
export const SELFTEST_GUESS = "guess_mesh";
export const SELFTEST_LOST_REF = "lost_ref";
export const SELFTEST_ALIAS_REF = "alias_ref";
export const SELFTEST_ALIAS_MAT = "alias_mat";
export const SELFTEST_ALIAS_ORDER = "alias_order";
/** The pole under an empty with a 30 degree rotation and a 0.01 scale (ticket 040); it must still come out 0.4 x 3.0 x 0.4 m. */
export const SELFTEST_PARENTED = "SelfTest_ParentedPole";
/** A 1 m box converted with `--scale-override scaled_box=10`: it must come out 10 m, with scale 10 in the report. */
export const SELFTEST_SCALED = "scaled_box";
/** The factor the self-test passes for SELFTEST_SCALED, as the wrapper would for a pack.json with "scaleOverrides": { "scaled_box": 10 }. */
export const SELFTEST_SCALE_OVERRIDES: readonly { stem: string; factor: number }[] = [{ stem: SELFTEST_SCALED, factor: 10 }];

/**
 * The aliases the self-test passes, as the wrapper would for a pack.json with
 * "textureAliases": { "Master_Src.PNG": "Textures/alias_atlas.png", "material:Painted_Metal": "Textures/metal_sheet.png",
 * "tex_crate.psd": "Textures/alias_atlas.png" }. Paths are relative to the self-test pack folder.
 */
export const SELFTEST_ALIASES: Readonly<Record<string, string>> = {
  "Master_Src.PNG": "Textures/alias_atlas.png",
  "material:Painted_Metal": "Textures/metal_sheet.png",
  "tex_crate.psd": "Textures/alias_atlas.png",
};

/** The self-test's aliases as spawn arguments for a pack folder: normalised key, absolute image, sorted by key. */
export function selftestAliases(packDir: string): { key: string; abs: string }[] {
  const out: { key: string; abs: string }[] = [];
  for (const [written, rel] of Object.entries(SELFTEST_ALIASES)) {
    const key = normaliseAliasKey(written);
    if (key !== null) out.push({ key, abs: resolve(packDir, rel) });
  }
  return out.sort((a, b) => compareNames(a.key, b.key));
}

/** What each textured self-test box must report (image paths relative to the pack, and the texture warnings). */
const SELFTEST_TEXTURES: ReadonlyArray<{ name: string; textures: readonly string[] | "some"; missingTextures: readonly string[]; warnings: readonly AssetWarning[] }> = [
  { name: SELFTEST_NO_UV, textures: "some", missingTextures: [], warnings: ["no-uv"] },
  { name: SELFTEST_REF_CASE, textures: ["Textures/tex_crate.png"], missingTextures: [], warnings: [] },
  { name: SELFTEST_MAT_NAME, textures: ["Textures/Sign_Board.png"], missingTextures: [], warnings: [] },
  { name: SELFTEST_GUESS, textures: ["Textures/Guess_a.png"], missingTextures: [], warnings: ["texture-guessed"] },
  { name: SELFTEST_LOST_REF, textures: [], missingTextures: ["nowhere.png"], warnings: ["missing-texture"] },
  // Amendment B: a file-name alias (case and extension ignored), a material alias (suffix dropped), and rule 3 beating an alias.
  { name: SELFTEST_ALIAS_REF, textures: ["Textures/alias_atlas.png"], missingTextures: [], warnings: [] },
  { name: SELFTEST_ALIAS_MAT, textures: ["Textures/metal_sheet.png"], missingTextures: [], warnings: [] },
  { name: SELFTEST_ALIAS_ORDER, textures: ["Textures/tex_crate.png"], missingTextures: [], warnings: [] },
];

/** Check a self-test report; the list of what is wrong, each naming the box and the field (empty means `selftest ok`). */
export function checkSelftest(report: PackReport): string[] {
  const problems: string[] = [];
  const near = (got: number, want: number, tol: number, what: string) => {
    if (Math.abs(got - want) > tol) problems.push(`${what} is ${got}, expected ${want} (within ${tol})`);
  };
  if (report.failures.length > 0) problems.push(`failures: ${report.failures.map((f) => `${f.source} (${f.error})`).join("; ")}`);
  if (report.scale !== 1) problems.push(`pack scale is ${report.scale}, expected 1`);
  // The scale each box was converted with: 1 (the self-test pack has no scale), except the box with an override.
  for (const a of report.assets) {
    const want = a.name === SELFTEST_SCALED ? 10 : 1;
    if (a.scale !== want) problems.push(`${a.name} scale is ${a.scale}, expected ${want}`);
  }
  // A box with a known size, on its base and centred (what, in the messages, names the measure).
  const checkSize = (name: string, what: string, size: readonly [number, number, number], tol: number) => {
    const box = report.assets.find((a) => a.name === name);
    if (!box) {
      problems.push(`${name} is missing from the report`);
      return undefined;
    }
    const { min, max } = box.bounds;
    near(max[0] - min[0], size[0], tol, `${what} width (x)`);
    near(max[1] - min[1], size[1], tol, `${what} height (y)`);
    near(max[2] - min[2], size[2], tol, `${what} depth (z)`);
    near(min[1], 0, 1e-4, `${what} base (min y)`);
    near((min[0] + max[0]) / 2, 0, 1e-4, `${what} x centre`);
    near((min[2] + max[2]) / 2, 0, 1e-4, `${what} z centre`);
    return box;
  };
  // The rotated, 0.01-scaled parent: the bake must keep the whole hierarchy's transform.
  checkSize(SELFTEST_PARENTED, "parented pole", [0.4, 3.0, 0.4], 0.001);
  checkSize(SELFTEST_SCALED, "scaled box", [10, 10, 10], 0.001);
  const pole = checkSize(SELFTEST_POLE, "pole", [0.4, 3.0, 0.4], 0.001);
  if (pole) {
    if (pole.warnings.length > 0) problems.push(`${SELFTEST_POLE} warnings: expected none, got ${pole.warnings.join(", ")}`);
    if (pole.textures.length > 0) problems.push(`${SELFTEST_POLE} textures: expected none, got ${pole.textures.join(", ")}`);
    if (pole.missingTextures.length > 0) problems.push(`${SELFTEST_POLE} missingTextures: expected none, got ${pole.missingTextures.join(", ")}`);
  }
  for (const want of SELFTEST_TEXTURES) {
    const box = report.assets.find((a) => a.name === want.name);
    if (!box) {
      problems.push(`${want.name} is missing from the report`);
      continue;
    }
    const same = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
    if (want.textures === "some") {
      if (box.textures.length === 0) problems.push(`${want.name} textures: expected an image, got none`);
    } else if (!same(box.textures, want.textures)) {
      problems.push(`${want.name} textures: expected [${want.textures.join(", ")}], got [${box.textures.join(", ")}]`);
    }
    if (!same(box.missingTextures, want.missingTextures)) {
      problems.push(`${want.name} missingTextures: expected [${want.missingTextures.join(", ")}], got [${box.missingTextures.join(", ")}]`);
    }
    if (!same([...box.warnings].sort(), [...want.warnings].sort())) {
      problems.push(`${want.name} warnings: expected [${want.warnings.join(", ")}], got [${box.warnings.join(", ")}]`);
    }
  }
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
  deps.stdout("Running the self-test (generated boxes through the normal conversion) ...\n");
  let result: RunResult;
  try {
    result = await deps.run(
      blender.path,
      buildBlenderArgs({ script: L.script, packDir, outGlb, report, selftest: true, aliases: selftestAliases(packDir), scaleOverrides: SELFTEST_SCALE_OVERRIDES }),
    );
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
  let colourways = false;
  const names: string[] = [];
  for (const arg of argv) {
    if (arg === "--selftest") selftest = true;
    else if (arg === "--colourways") colourways = true;
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
  if (colourways && selftest) {
    deps.stderr(`--colourways and --selftest cannot be combined\n`);
    return 1;
  }
  if (colourways) return runColourways(deps, names); // no Blender is looked for

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
    readBytes: (p) => new Uint8Array(readFileSync(p)),
    copyFile: (from, to) => copyFileSync(from, to),
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
